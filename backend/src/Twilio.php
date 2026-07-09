<?php
declare(strict_types=1);

namespace Genie;

/**
 * Twilio SMS 발송 (273차).
 *
 * 무외부의존(curl + Basic auth). 회원 로그인 2FA·비밀번호 찾기·본인인증 OTP 전용.
 * 국제 E.164(+국가번호) 자동 정규화. 트랜잭션 SMS.
 *
 * 자격증명(app_setting, Crypto 암호화):
 *   twilio_sid, twilio_token(enc), twilio_from(발신번호 E.164) 또는 twilio_msg_sid(Messaging Service SID)
 *
 * ※ Twilio Trial 계정은 (1)발신번호(또는 Messaging Service) 필요, (2)사전 verified 수신번호로만 발송 가능.
 *   실사용자 전체 대상 발송은 유료 전환 필요.
 */
final class Twilio
{
    private const BASE = 'https://api.twilio.com/2010-04-01';

    /** @param array $cfg sid, token, from, msg_sid */
    public static function send(array $cfg, string $to, string $content): array
    {
        $sid    = trim((string)($cfg['sid'] ?? ''));
        $token  = trim((string)($cfg['token'] ?? ''));
        $from   = trim((string)($cfg['from'] ?? ''));
        $msgSid = trim((string)($cfg['msg_sid'] ?? ''));
        $to     = self::e164($to);
        $content = trim($content);
        if ($sid === '' || $token === '' || ($from === '' && $msgSid === '') || $to === '' || $content === '') {
            return ['ok' => false, 'code' => 0, 'detail' => 'missing_config_or_params'];
        }
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'code' => 0, 'detail' => 'curl_unavailable'];
        }

        $uri = self::BASE . '/Accounts/' . rawurlencode($sid) . '/Messages.json';
        $fields = ['To' => $to, 'Body' => $content];
        if ($msgSid !== '') $fields['MessagingServiceSid'] = $msgSid;
        else                $fields['From'] = self::e164($from);

        $ch = curl_init($uri);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($fields),
            CURLOPT_USERPWD        => $sid . ':' . $token,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $resp     = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err      = curl_error($ch);
        curl_close($ch);

        if ($resp === false) {
            return ['ok' => false, 'code' => 0, 'detail' => 'curl_error: ' . $err];
        }
        $j = json_decode((string)$resp, true);
        // Twilio: 201 Created + sid = 접수 성공.
        if (($httpCode === 201 || $httpCode === 200) && is_array($j) && !empty($j['sid'])) {
            return ['ok' => true, 'code' => $httpCode, 'detail' => 'accepted', 'request_id' => $j['sid'], 'status' => $j['status'] ?? null];
        }
        $msg = is_array($j) ? ((string)($j['message'] ?? '') . (isset($j['code']) ? ' (code ' . $j['code'] . ')' : '')) : '';
        return ['ok' => false, 'code' => $httpCode, 'detail' => 'send_failed(' . $httpCode . '): ' . ($msg !== '' ? $msg : substr((string)$resp, 0, 180))];
    }

    /** 숫자→E.164(+국가번호). 이미 + 시작이면 유지. 국내형(0으로 시작·10~11자리)은 +82 로 변환. */
    public static function e164(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') return '';
        if ($raw[0] === '+') return '+' . preg_replace('/[^0-9]/', '', substr($raw, 1));
        $d = preg_replace('/[^0-9]/', '', $raw);
        if ($d === '') return '';
        // 국내(대한민국) 휴대폰 0으로 시작(01x…) → +82 + 선행0 제거.
        if ($d[0] === '0') return '+82' . ltrim($d, '0');
        // 이미 국가코드 포함(82…) 추정 시 그대로 +.
        return '+' . $d;
    }

    /**
     * 플랫폼 자격증명(app_setting)으로 SMS 발송. 2FA·비번찾기 공용.
     * @return array{ok:bool, ...}|array{ok:false, mode:'unconfigured'}
     */
    public static function sendPlatform(\PDO $pdo, string $to, string $content): array
    {
        $cfg = self::resolveConfig($pdo);
        if ($cfg['sid'] === '' || $cfg['token'] === '' || ($cfg['from'] === '' && $cfg['msg_sid'] === '')) {
            return ['ok' => false, 'mode' => 'unconfigured'];
        }
        return self::send($cfg, $to, $content);
    }

    /** app_setting twilio_* 로드(token 은 Crypto 복호화). env(GENIE_TWILIO_*) 폴백. */
    public static function resolveConfig(?\PDO $pdo): array
    {
        $cfg = ['sid' => '', 'token' => '', 'from' => '', 'msg_sid' => ''];
        if ($pdo instanceof \PDO) {
            try {
                $st = $pdo->query("SELECT skey, svalue FROM app_setting WHERE skey IN ('twilio_sid','twilio_token','twilio_from','twilio_msg_sid')");
                $rows = $st ? $st->fetchAll(\PDO::FETCH_KEY_PAIR) : [];
                if (!empty($rows['twilio_sid']))     $cfg['sid']     = (string)$rows['twilio_sid'];
                if (!empty($rows['twilio_token']))   $cfg['token']   = Crypto::decrypt((string)$rows['twilio_token']);
                if (!empty($rows['twilio_from']))    $cfg['from']    = (string)$rows['twilio_from'];
                if (!empty($rows['twilio_msg_sid'])) $cfg['msg_sid'] = (string)$rows['twilio_msg_sid'];
            } catch (\Throwable $e) { /* 테이블 부재 → env 폴백 */ }
        }
        $env = fn(string $k) => ($v = getenv($k)) !== false && $v !== '' ? $v : null;
        if ($cfg['sid'] === ''     && ($v = $env('GENIE_TWILIO_SID')))     $cfg['sid'] = $v;
        if ($cfg['token'] === ''   && ($v = $env('GENIE_TWILIO_TOKEN')))   $cfg['token'] = $v;
        if ($cfg['from'] === ''    && ($v = $env('GENIE_TWILIO_FROM')))    $cfg['from'] = $v;
        if ($cfg['msg_sid'] === '' && ($v = $env('GENIE_TWILIO_MSG_SID'))) $cfg['msg_sid'] = $v;
        return $cfg;
    }

    public static function isConfigured(?\PDO $pdo): bool
    {
        $c = self::resolveConfig($pdo);
        return $c['sid'] !== '' && $c['token'] !== '' && ($c['from'] !== '' || $c['msg_sid'] !== '');
    }
}
