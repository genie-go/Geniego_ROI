<?php
declare(strict_types=1);

namespace Genie;

/**
 * 의존성 없는 최소 SMTP 클라이언트 (190차 Sprint4 — 이메일 발송 인프라).
 *
 * PHPMailer/Symfony Mailer 미설치 환경에서 fsockopen 기반으로 SMTP(AUTH LOGIN + STARTTLS/SSL)
 * 발송을 수행한다. 코드베이스의 "무외부의존" 관례(i18n 엔진 등)와 정합.
 *
 * 지원: ESMTP EHLO, STARTTLS(587/25), 암묵적 TLS(465 ssl://), AUTH LOGIN, HTML 본문, UTF-8 제목.
 * 미지원(현 범위 밖): AUTH PLAIN/CRAM-MD5, 첨부, 다중 수신자 배치(1회 1수신자 호출).
 */
final class SmtpClient
{
    /**
     * @param array $cfg host,port,user,pass,from,from_name,secure('tls'|'ssl'|'none'),timeout
     * @return array{ok:bool, code:int, detail:string, trace:array<string>}
     */
    public static function send(array $cfg, string $to, string $subject, string $html): array
    {
        $host    = (string)($cfg['host'] ?? '');
        $port    = (int)($cfg['port'] ?? 587);
        $user    = (string)($cfg['user'] ?? '');
        $pass    = (string)($cfg['pass'] ?? '');
        $from    = (string)($cfg['from'] ?? '');
        $fromNm  = (string)($cfg['from_name'] ?? 'Geniego-ROI');
        $secure  = (string)($cfg['secure'] ?? ($port === 465 ? 'ssl' : 'tls'));
        $timeout = (int)($cfg['timeout'] ?? 15);

        $trace = [];
        if ($host === '' || $from === '' || $to === '') {
            return ['ok' => false, 'code' => 0, 'detail' => 'host/from/to required', 'trace' => $trace];
        }

        $transport = ($secure === 'ssl') ? "ssl://{$host}" : $host;
        $ctx = stream_context_create(['ssl' => [
            'verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true,
        ]]);
        $errno = 0; $errstr = '';
        $fp = @stream_socket_client("{$transport}:{$port}", $errno, $errstr, $timeout,
            STREAM_CLIENT_CONNECT, $ctx);
        if (!$fp) {
            return ['ok' => false, 'code' => 0, 'detail' => "connect failed: {$errstr} ({$errno})", 'trace' => $trace];
        }
        stream_set_timeout($fp, $timeout);

        // ── 내부 헬퍼 ──
        $read = function () use ($fp, &$trace): array {
            $data = '';
            while (($line = fgets($fp, 515)) !== false) {
                $data .= $line;
                // 멀티라인 응답: 4번째 문자가 '-' 면 계속, ' ' 면 종료
                if (strlen($line) < 4 || $line[3] === ' ') break;
            }
            $code = (int)substr($data, 0, 3);
            $trace[] = '< ' . trim($data);
            return [$code, $data];
        };
        $write = function (string $cmd, bool $hideTrace = false) use ($fp, &$trace): void {
            fwrite($fp, $cmd . "\r\n");
            $trace[] = '> ' . ($hideTrace ? '***' : $cmd);
        };
        $fail = function (string $why) use ($fp, &$trace): array {
            @fclose($fp);
            return ['ok' => false, 'code' => 0, 'detail' => $why, 'trace' => $trace];
        };

        // ── 핸드셰이크 ──
        [$code] = $read();
        if ($code !== 220) return $fail("greeting code {$code}");

        $ehloHost = gethostname() ?: 'localhost';
        $write("EHLO {$ehloHost}");
        [$code, $ehloResp] = $read();
        if ($code !== 250) {
            // EHLO 실패 시 HELO 재시도
            $write("HELO {$ehloHost}");
            [$code] = $read();
            if ($code !== 250) return $fail("EHLO/HELO code {$code}");
            $ehloResp = '';
        }

        // STARTTLS (명시적 TLS, ssl:// 가 아닐 때 + 서버가 지원할 때)
        if ($secure === 'tls' && stripos($ehloResp, 'STARTTLS') !== false) {
            $write('STARTTLS');
            [$code] = $read();
            if ($code !== 220) return $fail("STARTTLS code {$code}");
            $ok = @stream_socket_enable_crypto($fp, true,
                STREAM_CRYPTO_METHOD_TLS_CLIENT
                | (defined('STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT : 0)
                | (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT : 0));
            if ($ok !== true) return $fail('TLS negotiation failed');
            // TLS 후 EHLO 재전송 (RFC 3207)
            $write("EHLO {$ehloHost}");
            [$code] = $read();
            if ($code !== 250) return $fail("post-TLS EHLO code {$code}");
        }

        // AUTH LOGIN (자격증명 있을 때만)
        if ($user !== '') {
            $write('AUTH LOGIN');
            [$code] = $read();
            if ($code !== 334) return $fail("AUTH LOGIN code {$code}");
            $write(base64_encode($user), true);
            [$code] = $read();
            if ($code !== 334) return $fail("AUTH user code {$code}");
            $write(base64_encode($pass), true);
            [$code] = $read();
            if ($code !== 235) return $fail("AUTH failed code {$code}");
        }

        // 봉투(envelope)
        $write("MAIL FROM:<{$from}>");
        [$code] = $read();
        if ($code !== 250) return $fail("MAIL FROM code {$code}");
        $write("RCPT TO:<{$to}>");
        [$code] = $read();
        if ($code !== 250 && $code !== 251) return $fail("RCPT TO code {$code}");

        // DATA
        $write('DATA');
        [$code] = $read();
        if ($code !== 354) return $fail("DATA code {$code}");

        $msg = self::buildMessage($from, $fromNm, $to, $subject, $html);
        fwrite($fp, $msg . "\r\n.\r\n");
        $trace[] = '> [message ' . strlen($msg) . ' bytes]';
        [$code, $resp] = $read();
        if ($code !== 250) return $fail("message rejected code {$code}: " . trim($resp));

        $write('QUIT');
        @fclose($fp);

        return ['ok' => true, 'code' => 250, 'detail' => 'delivered to SMTP', 'trace' => $trace];
    }

    /** RFC 5322 헤더 + HTML 본문 조립 (CRLF 정규화 + dot-stuffing). */
    private static function buildMessage(string $from, string $fromName, string $to, string $subject, string $html): string
    {
        $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encFromNm  = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $date = gmdate('D, d M Y H:i:s') . ' +0000';
        $msgId = bin2hex(random_bytes(12)) . '@' . (explode('@', $from)[1] ?? 'roi.genie-go.com');

        $headers = [
            "Date: {$date}",
            "From: {$encFromNm} <{$from}>",
            "To: <{$to}>",
            "Subject: {$encSubject}",
            "Message-ID: <{$msgId}>",
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];

        // 본문 CRLF 정규화 + dot-stuffing(줄 시작 '.' → '..')
        $body = preg_replace('/\r\n|\r|\n/', "\r\n", $html);
        $body = preg_replace('/^\./m', '..', $body);

        return implode("\r\n", $headers) . "\r\n\r\n" . $body;
    }
}
