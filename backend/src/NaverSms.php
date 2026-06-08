<?php
declare(strict_types=1);

namespace Genie;

/**
 * 네이버 클라우드 플랫폼 SENS SMS 발송 (203차).
 *
 * 무외부의존(curl + HMAC-SHA256 시그니처). 회원 비밀번호 찾기·MFA OTP 등 트랜잭션 SMS 전용.
 * 한글/장문은 자동으로 LMS, 단문 ASCII 는 SMS 로 발송.
 *
 * 자격증명(app_setting, Crypto 암호화):
 *   sms_provider=naver, sms_access_key, sms_secret_key(enc), sms_service_id, sms_from(발신번호)
 *
 * SENS 시그니처: base64( HMAC-SHA256( secretKey, "POST {uri}\n{timestamp}\n{accessKey}" ) )
 */
final class NaverSms
{
    private const BASE = 'https://sens.apigw.ntruss.com';

    /**
     * @param array $cfg access_key, secret_key, service_id, from
     * @return array{ok:bool, code:int, detail:string}
     */
    public static function send(array $cfg, string $to, string $content): array
    {
        $accessKey = trim((string)($cfg['access_key'] ?? ''));
        $secretKey = trim((string)($cfg['secret_key'] ?? ''));
        $serviceId = trim((string)($cfg['service_id'] ?? ''));
        $from      = preg_replace('/[^0-9]/', '', (string)($cfg['from'] ?? ''));
        $to        = preg_replace('/[^0-9]/', '', $to);
        $content   = trim($content);
        if ($accessKey === '' || $secretKey === '' || $serviceId === '' || $from === '' || $to === '' || $content === '') {
            return ['ok' => false, 'code' => 0, 'detail' => 'missing_config_or_params'];
        }
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'code' => 0, 'detail' => 'curl_unavailable'];
        }

        $uri       = '/sms/v2/services/' . rawurlencode($serviceId) . '/messages';
        $timestamp = (string)((int)round(microtime(true) * 1000));
        $sig       = self::signature('POST', $uri, $timestamp, $accessKey, $secretKey);

        // 한글 포함 또는 90바이트 초과 → LMS(장문). 그 외 SMS(단문).
        $isLong = (strlen($content) > 80) || (bool)preg_match('/[^\x00-\x7F]/', $content);
        $type   = $isLong ? 'LMS' : 'SMS';
        $body = [
            'type'        => $type,
            'contentType' => 'COMM',
            'countryCode' => '82',
            'from'        => $from,
            'content'     => $content,
            'messages'    => [['to' => $to]],
        ];
        if ($type === 'LMS') $body['subject'] = 'GeniegoROI';
        $payload = json_encode($body, JSON_UNESCAPED_UNICODE);

        $ch = curl_init(self::BASE . $uri);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json; charset=utf-8',
                'x-ncp-apigw-timestamp: ' . $timestamp,
                'x-ncp-iam-access-key: ' . $accessKey,
                'x-ncp-apigw-signature-v2: ' . $sig,
            ],
        ]);
        $resp     = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err      = curl_error($ch);
        curl_close($ch);

        if ($resp === false) {
            return ['ok' => false, 'code' => 0, 'detail' => 'curl_error: ' . $err];
        }
        $j          = json_decode((string)$resp, true);
        $statusCode = is_array($j) ? (string)($j['statusCode'] ?? '') : '';
        // SENS: HTTP 202 Accepted + statusCode "202" = 접수 성공.
        if ($httpCode === 202 || $statusCode === '202') {
            return ['ok' => true, 'code' => 202, 'detail' => 'accepted', 'type' => $type,
                    'request_id' => is_array($j) ? ($j['requestId'] ?? null) : null];
        }
        $msg = is_array($j) ? ((string)($j['errorMessage'] ?? $j['statusName'] ?? '')) : '';
        return ['ok' => false, 'code' => $httpCode, 'detail' => 'send_failed(' . $httpCode . '): ' . ($msg !== '' ? $msg : substr((string)$resp, 0, 180))];
    }

    private static function signature(string $method, string $uri, string $timestamp, string $accessKey, string $secretKey): string
    {
        $msg = $method . ' ' . $uri . "\n" . $timestamp . "\n" . $accessKey;
        return base64_encode(hash_hmac('sha256', $msg, $secretKey, true));
    }

    /**
     * 플랫폼 자격증명(app_setting) 으로 SMS 발송. 비번찾기·알림 등 공용.
     * @return array{ok:bool, ...}|array{ok:false, mode:'unconfigured'}
     */
    public static function sendPlatform(\PDO $pdo, string $to, string $content): array
    {
        $cfg = self::resolveConfig($pdo);
        if (($cfg['access_key'] ?? '') === '' || ($cfg['service_id'] ?? '') === '' || ($cfg['from'] ?? '') === '') {
            return ['ok' => false, 'mode' => 'unconfigured'];
        }
        return self::send($cfg, $to, $content);
    }

    /** app_setting sms_* 로드(secret 은 Crypto 복호화). env(GENIE_SMS_*) 폴백. */
    public static function resolveConfig(?\PDO $pdo): array
    {
        $cfg = ['access_key' => '', 'secret_key' => '', 'service_id' => '', 'from' => ''];
        if ($pdo instanceof \PDO) {
            try {
                $st = $pdo->query("SELECT skey, svalue FROM app_setting WHERE skey IN ('sms_access_key','sms_secret_key','sms_service_id','sms_from')");
                $rows = $st ? $st->fetchAll(\PDO::FETCH_KEY_PAIR) : [];
                if (!empty($rows['sms_access_key'])) $cfg['access_key'] = (string)$rows['sms_access_key'];
                if (!empty($rows['sms_secret_key'])) $cfg['secret_key'] = Crypto::decrypt((string)$rows['sms_secret_key']);
                if (!empty($rows['sms_service_id'])) $cfg['service_id'] = (string)$rows['sms_service_id'];
                if (!empty($rows['sms_from']))       $cfg['from']       = (string)$rows['sms_from'];
            } catch (\Throwable $e) { /* 테이블 부재 → env 폴백 */ }
        }
        $env = fn(string $k) => ($v = getenv($k)) !== false && $v !== '' ? $v : null;
        if ($cfg['access_key'] === '' && ($v = $env('GENIE_SMS_ACCESS_KEY'))) $cfg['access_key'] = $v;
        if ($cfg['secret_key'] === '' && ($v = $env('GENIE_SMS_SECRET_KEY'))) $cfg['secret_key'] = $v;
        if ($cfg['service_id'] === '' && ($v = $env('GENIE_SMS_SERVICE_ID'))) $cfg['service_id'] = $v;
        if ($cfg['from'] === ''       && ($v = $env('GENIE_SMS_FROM')))       $cfg['from']       = $v;
        return $cfg;
    }

    public static function isConfigured(?\PDO $pdo): bool
    {
        $c = self::resolveConfig($pdo);
        return $c['access_key'] !== '' && $c['secret_key'] !== '' && $c['service_id'] !== '' && $c['from'] !== '';
    }
}
