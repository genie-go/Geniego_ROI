<?php
declare(strict_types=1);

namespace Genie;

/**
 * 의존성 없는 최소 SMTP 클라이언트 (190차 Sprint4 — 이메일 발송 인프라).
 *
 * PHPMailer/Symfony Mailer 미설치 환경에서 fsockopen 기반으로 SMTP 발송을 수행한다.
 * 코드베이스의 "무외부의존" 관례(i18n 엔진 등)와 정합.
 *
 * 지원: ESMTP EHLO, STARTTLS(587/25), 암묵적 TLS(465 ssl://), HTML 본문, UTF-8 제목.
 *   ▸ [현 차수] AUTH 협상 — 서버 EHLO 광고를 파싱해 CRAM-MD5 > PLAIN > LOGIN 우선순위로 선택
 *     (cfg.auth 로 강제 지정 가능). CRAM-MD5 는 비밀번호 평문 미전송(챌린지-응답 HMAC).
 *   ▸ [현 차수] 다중 수신자/연결 재사용 — sendBatch() 는 핸드셰이크+STARTTLS+AUTH 를 1회만 수행하고
 *     N개 메시지를 같은 연결로 순차 전송(RSET 로 봉투 초기화). 단일 message 에 다중 RCPT(브로드캐스트)도 지원.
 *   ▸ 보안: verify_peer=true, verify_peer_name=true 유지(STARTTLS 후 서버 인증서 검증).
 * 미지원(현 범위 밖): 첨부, DSN, 파이프라이닝.
 */
final class SmtpClient
{
    /**
     * 단일 수신자 발송(하위호환 시그니처 불변). 내부적으로 sendBatch 1건 위임.
     *
     * @param array $cfg host,port,user,pass,from,from_name,secure('tls'|'ssl'|'none'),timeout,auth('auto'|'login'|'plain'|'cram-md5')
     * @param string|array $to  단일 주소 또는 주소 배열(동일 본문 브로드캐스트)
     * @return array{ok:bool, code:int, detail:string, trace:array<string>}
     */
    public static function send(array $cfg, $to, string $subject, string $html, array $extraHeaders = []): array
    {
        $r = self::sendBatch($cfg, [
            ['to' => $to, 'subject' => $subject, 'html' => $html, 'headers' => $extraHeaders],
        ]);
        $first = $r['results'][0] ?? ['ok' => false, 'code' => 0, 'detail' => 'no result'];
        return [
            'ok'     => (bool)($first['ok'] ?? false),
            'code'   => (int)($first['code'] ?? 0),
            'detail' => (string)($first['detail'] ?? ''),
            'trace'  => $r['trace'] ?? [],
        ];
    }

    /**
     * 다중 메시지 발송 — 1개 연결(핸드셰이크+TLS+AUTH 1회)로 N개 메시지 순차 전송(연결 재사용).
     * 각 message: ['to'=>string|array, 'subject'=>string, 'html'=>string, 'headers'=>array].
     *
     * @return array{ok:bool, sent:int, failed:int, results:array<int,array>, trace:array<string>}
     */
    public static function sendBatch(array $cfg, array $messages): array
    {
        $host    = (string)($cfg['host'] ?? '');
        $port    = (int)($cfg['port'] ?? 587);
        $user    = (string)($cfg['user'] ?? '');
        $pass    = (string)($cfg['pass'] ?? '');
        $from    = (string)($cfg['from'] ?? '');
        $fromNm  = (string)($cfg['from_name'] ?? 'Geniego-ROI');
        $secure  = (string)($cfg['secure'] ?? ($port === 465 ? 'ssl' : 'tls'));
        $timeout = (int)($cfg['timeout'] ?? 15);
        $authPref = strtolower((string)($cfg['auth'] ?? 'auto'));

        $trace = [];
        if ($host === '' || $from === '') {
            return ['ok' => false, 'sent' => 0, 'failed' => count($messages),
                'results' => array_map(fn() => ['ok' => false, 'code' => 0, 'detail' => 'host/from required'], $messages),
                'trace' => $trace];
        }

        $transport = ($secure === 'ssl') ? "ssl://{$host}" : $host;
        $ctx = stream_context_create(['ssl' => [
            'verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true,
        ]]);
        $errno = 0; $errstr = '';
        $fp = @stream_socket_client("{$transport}:{$port}", $errno, $errstr, $timeout,
            STREAM_CLIENT_CONNECT, $ctx);
        if (!$fp) {
            return ['ok' => false, 'sent' => 0, 'failed' => count($messages),
                'results' => array_map(fn() => ['ok' => false, 'code' => 0, 'detail' => "connect failed: {$errstr} ({$errno})"], $messages),
                'trace' => $trace];
        }
        stream_set_timeout($fp, $timeout);

        $bail = function (string $why) use ($fp, &$trace, $messages): array {
            @fclose($fp);
            return ['ok' => false, 'sent' => 0, 'failed' => count($messages),
                'results' => array_map(fn() => ['ok' => false, 'code' => 0, 'detail' => $why], $messages),
                'trace' => $trace];
        };

        // ── 핸드셰이크 ──
        [$code] = self::readResp($fp, $trace);
        if ($code !== 220) return $bail("greeting code {$code}");

        $ehloHost = gethostname() ?: 'localhost';
        self::writeCmd($fp, "EHLO {$ehloHost}", $trace);
        [$code, $ehloResp] = self::readResp($fp, $trace);
        if ($code !== 250) {
            self::writeCmd($fp, "HELO {$ehloHost}", $trace);
            [$code] = self::readResp($fp, $trace);
            if ($code !== 250) return $bail("EHLO/HELO code {$code}");
            $ehloResp = '';
        }

        // ── STARTTLS(명시적 TLS + 서버 지원 시) ──
        if ($secure === 'tls' && stripos($ehloResp, 'STARTTLS') !== false) {
            self::writeCmd($fp, 'STARTTLS', $trace);
            [$code] = self::readResp($fp, $trace);
            if ($code !== 220) return $bail("STARTTLS code {$code}");
            $ok = @stream_socket_enable_crypto($fp, true,
                STREAM_CRYPTO_METHOD_TLS_CLIENT
                | (defined('STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT : 0)
                | (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT : 0));
            if ($ok !== true) return $bail('TLS negotiation failed');
            // TLS 후 EHLO 재전송(RFC 3207) — AUTH 광고는 TLS 이후 버전을 신뢰.
            self::writeCmd($fp, "EHLO {$ehloHost}", $trace);
            [$code, $ehloResp] = self::readResp($fp, $trace);
            if ($code !== 250) return $bail("post-TLS EHLO code {$code}");
        }

        // ── AUTH(자격증명 있을 때만) — 서버 광고 파싱 후 기전 선택 ──
        if ($user !== '') {
            $mech = self::pickAuthMechanism($ehloResp, $authPref);
            $authErr = self::authenticate($fp, $mech, $user, $pass, $trace);
            if ($authErr !== null) return $bail($authErr);
        }

        // ── 메시지 루프(연결 재사용) ──
        $results = []; $sent = 0; $failed = 0;
        foreach ($messages as $m) {
            $rcpts = self::normalizeRecipients($m['to'] ?? '');
            if (!$rcpts) { $results[] = ['ok' => false, 'code' => 0, 'detail' => 'no valid recipient']; $failed++; continue; }
            $r = self::deliverMessage($fp, $from, $fromNm, $rcpts,
                (string)($m['subject'] ?? ''), (string)($m['html'] ?? ''), (array)($m['headers'] ?? []), $trace);
            $results[] = $r;
            if ($r['ok']) { $sent++; } else { $failed++; }
            // 다음 메시지를 위해 봉투 초기화(RSET). 실패해도 계속(연결이 살아있으면).
            self::writeCmd($fp, 'RSET', $trace);
            [$rc] = self::readResp($fp, $trace);
            if ($rc !== 250) { break; } // 연결 이상 — 잔여 메시지는 미전송으로 남김
        }
        // 미처리(RSET 실패로 중단된) 잔여 메시지를 실패로 채움.
        while (count($results) < count($messages)) { $results[] = ['ok' => false, 'code' => 0, 'detail' => 'connection reset failed']; $failed++; }

        self::writeCmd($fp, 'QUIT', $trace);
        @fclose($fp);

        return ['ok' => $sent > 0, 'sent' => $sent, 'failed' => $failed, 'results' => $results, 'trace' => $trace];
    }

    /** 서버 EHLO 응답에서 지원 AUTH 기전을 파싱하고, 선호도(pref)에 따라 선택. CRAM-MD5 > PLAIN > LOGIN. */
    private static function pickAuthMechanism(string $ehloResp, string $pref): string
    {
        $up = strtoupper($ehloResp);
        $has = [
            'cram-md5' => (strpos($up, 'CRAM-MD5') !== false),
            'plain'    => (strpos($up, 'PLAIN') !== false),
            'login'    => (strpos($up, 'LOGIN') !== false),
        ];
        // 명시 지정(auto 제외) 이 서버에서 지원되면 그대로.
        if ($pref !== 'auto' && isset($has[$pref]) && $has[$pref]) return $pref;
        // 자동: 보안순 우선. 아무것도 광고 안 하면(구형 서버) LOGIN 기본.
        foreach (['cram-md5', 'plain', 'login'] as $m) { if ($has[$m]) return $m; }
        return 'login';
    }

    /** 선택된 기전으로 인증 수행. 성공=null, 실패=오류 문자열. */
    private static function authenticate($fp, string $mech, string $user, string $pass, array &$trace): ?string
    {
        if ($mech === 'cram-md5') {
            self::writeCmd($fp, 'AUTH CRAM-MD5', $trace);
            [$code, $resp] = self::readResp($fp, $trace);
            if ($code !== 334) return "AUTH CRAM-MD5 code {$code}";
            $challenge = base64_decode(trim(substr(trim($resp), 3)), true);
            if ($challenge === false) return 'CRAM-MD5 challenge decode failed';
            $digest = hash_hmac('md5', $challenge, $pass);            // RFC 2195: HMAC-MD5(challenge, pass)
            self::writeCmd($fp, base64_encode($user . ' ' . $digest), $trace, true);
            [$code] = self::readResp($fp, $trace);
            return $code === 235 ? null : "AUTH failed code {$code}";
        }
        if ($mech === 'plain') {
            // RFC 4616: base64( authzid \0 authcid \0 passwd ) — authzid 생략.
            self::writeCmd($fp, 'AUTH PLAIN', $trace);
            [$code] = self::readResp($fp, $trace);
            if ($code !== 334) return "AUTH PLAIN code {$code}";
            self::writeCmd($fp, base64_encode("\0" . $user . "\0" . $pass), $trace, true);
            [$code] = self::readResp($fp, $trace);
            return $code === 235 ? null : "AUTH failed code {$code}";
        }
        // AUTH LOGIN(기본·하위호환)
        self::writeCmd($fp, 'AUTH LOGIN', $trace);
        [$code] = self::readResp($fp, $trace);
        if ($code !== 334) return "AUTH LOGIN code {$code}";
        self::writeCmd($fp, base64_encode($user), $trace, true);
        [$code] = self::readResp($fp, $trace);
        if ($code !== 334) return "AUTH user code {$code}";
        self::writeCmd($fp, base64_encode($pass), $trace, true);
        [$code] = self::readResp($fp, $trace);
        return $code === 235 ? null : "AUTH failed code {$code}";
    }

    /** 단일 메시지 전송(MAIL FROM → RCPT(다중) → DATA). 봉투 실패는 결과로 반환(연결은 유지). */
    private static function deliverMessage($fp, string $from, string $fromNm, array $rcpts,
        string $subject, string $html, array $headers, array &$trace): array
    {
        self::writeCmd($fp, "MAIL FROM:<{$from}>", $trace);
        [$code] = self::readResp($fp, $trace);
        if ($code !== 250) return ['ok' => false, 'code' => $code, 'detail' => "MAIL FROM code {$code}"];

        $accepted = [];
        foreach ($rcpts as $to) {
            self::writeCmd($fp, "RCPT TO:<{$to}>", $trace);
            [$code] = self::readResp($fp, $trace);
            if ($code === 250 || $code === 251) $accepted[] = $to;
        }
        if (!$accepted) return ['ok' => false, 'code' => $code, 'detail' => 'all RCPT rejected'];

        self::writeCmd($fp, 'DATA', $trace);
        [$code] = self::readResp($fp, $trace);
        if ($code !== 354) return ['ok' => false, 'code' => $code, 'detail' => "DATA code {$code}"];

        $toHeader = (count($accepted) === 1) ? '<' . $accepted[0] . '>' : 'undisclosed-recipients:;';
        $msg = self::buildMessage($from, $fromNm, $toHeader, $subject, $html, $headers);
        fwrite($fp, $msg . "\r\n.\r\n");
        $trace[] = '> [message ' . strlen($msg) . ' bytes → ' . count($accepted) . ' rcpt]';
        [$code, $resp] = self::readResp($fp, $trace);
        if ($code !== 250) return ['ok' => false, 'code' => $code, 'detail' => "message rejected code {$code}: " . trim($resp)];
        return ['ok' => true, 'code' => 250, 'detail' => 'delivered to SMTP (' . count($accepted) . ' rcpt)'];
    }

    /** 수신자 정규화 — 문자열/배열 → 유효 이메일 배열(중복 제거·인젝션 방지). */
    private static function normalizeRecipients($to): array
    {
        $list = is_array($to) ? $to : [$to];
        $out = [];
        foreach ($list as $addr) {
            $addr = trim((string)$addr);
            if ($addr === '' || !filter_var($addr, FILTER_VALIDATE_EMAIL)) continue;
            if (strpbrk($addr, "\r\n") !== false) continue; // 헤더 인젝션 방지
            if (!in_array($addr, $out, true)) $out[] = $addr;
        }
        return $out;
    }

    /** SMTP 응답 1개(멀티라인 포함) 읽기. @return array{0:int,1:string} */
    private static function readResp($fp, array &$trace): array
    {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break; // '-' 계속, ' ' 종료
        }
        $code = (int)substr($data, 0, 3);
        $trace[] = '< ' . trim($data);
        return [$code, $data];
    }

    private static function writeCmd($fp, string $cmd, array &$trace, bool $hideTrace = false): void
    {
        fwrite($fp, $cmd . "\r\n");
        $trace[] = '> ' . ($hideTrace ? '***' : $cmd);
    }

    /** RFC 5322 헤더 + HTML 본문 조립 (CRLF 정규화 + dot-stuffing). */
    private static function buildMessage(string $from, string $fromName, string $toHeader, string $subject, string $html, array $extra = []): string
    {
        $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encFromNm  = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $date = gmdate('D, d M Y H:i:s') . ' +0000';
        $msgId = bin2hex(random_bytes(12)) . '@' . (explode('@', $from)[1] ?? 'roi.genie-go.com');

        $headers = [
            "Date: {$date}",
            "From: {$encFromNm} <{$from}>",
            "To: {$toHeader}",
            "Subject: {$encSubject}",
            "Message-ID: <{$msgId}>",
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        // 추가 헤더(List-Unsubscribe 등) — 헤더 인젝션 방지(CR/LF 제거), 표준 헤더 덮어쓰기 금지.
        $reserved = ['date','from','to','subject','message-id','mime-version','content-type','content-transfer-encoding'];
        foreach ($extra as $k => $v) {
            $k = trim(preg_replace('/[\r\n:]+/', '', (string)$k));
            $v = trim(preg_replace('/[\r\n]+/', ' ', (string)$v));
            if ($k === '' || $v === '' || in_array(strtolower($k), $reserved, true)) continue;
            $headers[] = "{$k}: {$v}";
        }

        // 본문 CRLF 정규화 + dot-stuffing(줄 시작 '.' → '..')
        $body = preg_replace('/\r\n|\r|\n/', "\r\n", $html);
        $body = preg_replace('/^\./m', '..', $body);

        return implode("\r\n", $headers) . "\r\n\r\n" . $body;
    }
}
