<?php
/**
 * WebPush — 모바일/데스크톱 웹 푸시 알림(246차 P3, VAPID).
 *
 *  - push-only SW(push-sw.js, fetch핸들러 부재=화이트스크린 트랩 회피)와 짝.
 *  - VAPID 키(공개/개인 PEM)는 admin 설정(app_setting webpush_vapid_*) 또는 env — 미설정 시 전 동작 graceful(무영향).
 *  - 발송은 payload-less(VAPID JWT ES256 인증만) → RFC8291 aes128gcm 암호화 불요(복잡성/오류위험 회피).
 *    SW push 핸들러가 일반 알림 표기(제목/본문은 향후 암호화 페이로드 라운드에서 확장).
 *  - 전부 테넌트 격리(구독은 tenant_id 스코프). PII 미저장(endpoint=익명 푸시 채널).
 */
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class WebPush
{
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t === '') { $t = UserAuth::authedTenant($req) ?? ''; }
        return $t;
    }

    private static function ensure(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS push_subscription (
                id $AI, tenant_id VARCHAR(100), endpoint VARCHAR(500), p256dh VARCHAR(200), auth VARCHAR(100),
                ua VARCHAR(255), created_at VARCHAR(32)
            )");
            try { $pdo->exec("CREATE UNIQUE INDEX uq_push_ep ON push_subscription(endpoint)"); } catch (\Throwable $e) {}
        } catch (\Throwable $e) { /* graceful */ }
    }

    private static function setting(PDO $pdo, string $k): string
    {
        try { $st = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $st->execute([$k]); $v = $st->fetchColumn(); return $v !== false ? (string)$v : ''; }
        catch (\Throwable $e) { return ''; }
    }

    private static function vapidPublicKey(PDO $pdo): string { return (string)(getenv('VAPID_PUBLIC_KEY') ?: self::setting($pdo, 'webpush_vapid_public')); }
    private static function vapidPrivateKey(PDO $pdo): string { return (string)(getenv('VAPID_PRIVATE_KEY') ?: self::setting($pdo, 'webpush_vapid_private')); }
    private static function vapidSubject(PDO $pdo): string { $s = (string)(getenv('VAPID_SUBJECT') ?: self::setting($pdo, 'webpush_vapid_subject')); return $s !== '' ? $s : 'mailto:admin@genie-go.com'; }

    /** [공개] GET /v426/push/vapid-key — 구독용 VAPID 공개키(미설정 시 enabled=false). */
    public static function vapidKey(Request $req, Response $res): Response
    {
        try { $pdo = Db::pdo(); $pub = self::vapidPublicKey($pdo);
            return self::json($res, ['ok' => true, 'enabled' => $pub !== '', 'public_key' => $pub]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => true, 'enabled' => false, 'public_key' => '']); }
    }

    /** POST /v426/push/subscribe — 브라우저 PushSubscription 저장(테넌트). body: {endpoint, keys:{p256dh,auth}}. */
    public static function subscribe(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $endpoint = substr((string)($b['endpoint'] ?? ''), 0, 500);
        $keys = (array)($b['keys'] ?? []);
        $p256dh = substr((string)($keys['p256dh'] ?? ''), 0, 200);
        $auth = substr((string)($keys['auth'] ?? ''), 0, 100);
        if ($endpoint === '') return self::json($res, ['ok' => false, 'error' => 'endpoint 누락'], 422);
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $up = $pdo->prepare("UPDATE push_subscription SET tenant_id=?, p256dh=?, auth=?, ua=? WHERE endpoint=?");
            $up->execute([$t, $p256dh, $auth, substr((string)($req->getHeaderLine('User-Agent')), 0, 255), $endpoint]);
            if ($up->rowCount() === 0) {
                $pdo->prepare("INSERT INTO push_subscription(tenant_id,endpoint,p256dh,auth,ua,created_at) VALUES(?,?,?,?,?,?)")
                    ->execute([$t, $endpoint, $p256dh, $auth, substr((string)($req->getHeaderLine('User-Agent')), 0, 255), gmdate('c')]);
            }
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    /** POST /v426/push/unsubscribe — 구독 해지. body: {endpoint}. */
    public static function unsubscribe(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $endpoint = (string)($b['endpoint'] ?? '');
        try { $pdo = Db::pdo(); self::ensure($pdo);
            $pdo->prepare("DELETE FROM push_subscription WHERE endpoint=? AND tenant_id=?")->execute([$endpoint, $t]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false]); }
    }

    /** POST /v426/push/test — 본 테넌트 구독 전체에 테스트 푸시(VAPID JWT, payload-less). */
    public static function test(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req);
        $r = self::sendToTenant($t);
        return self::json($res, ['ok' => $r['ok'], 'sent' => $r['sent'], 'failed' => $r['failed'], 'note' => $r['note'] ?? null]);
    }

    /** [admin] POST /v426/push/vapid-config — VAPID 키 설정(public/private PEM/subject). */
    public static function saveVapidConfig(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requireAdmin($req, $res)) return $err;
        $b = (array)($req->getParsedBody() ?? []);
        try {
            $pdo = Db::pdo();
            foreach (['webpush_vapid_public' => 'public', 'webpush_vapid_private' => 'private', 'webpush_vapid_subject' => 'subject'] as $skey => $bk) {
                if (!array_key_exists($bk, $b)) continue;
                $v = (string)$b[$bk];
                $u = $pdo->prepare("UPDATE app_setting SET svalue=?, updated_at=? WHERE skey=?");
                $u->execute([$v, gmdate('c'), $skey]);
                if ($u->rowCount() === 0) $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?)")->execute([$skey, $v, gmdate('c')]);
            }
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => $e->getMessage()]); }
    }

    /**
     * 테넌트 구독 전체에 payload-less 푸시 발송(VAPID JWT ES256 인증). VAPID 미설정 시 graceful skip.
     * @return array{ok:bool, sent:int, failed:int, note?:string}
     */
    public static function sendToTenant(string $tenant): array
    {
        try {
            $pdo = Db::pdo(); self::ensure($pdo);
            $priv = self::vapidPrivateKey($pdo); $pub = self::vapidPublicKey($pdo);
            if ($priv === '' || $pub === '') return ['ok' => false, 'sent' => 0, 'failed' => 0, 'note' => 'VAPID 키 미설정 — admin 푸시 설정에서 키를 등록하세요.'];
            $sub = self::vapidSubject($pdo);
            $st = $pdo->prepare("SELECT id, endpoint FROM push_subscription WHERE tenant_id=?");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            if (!$rows) return ['ok' => true, 'sent' => 0, 'failed' => 0, 'note' => '구독자가 없습니다.'];
            $sent = 0; $failed = 0;
            foreach ($rows as $r) {
                $endpoint = (string)$r['endpoint'];
                $aud = self::originOf($endpoint);
                $jwt = self::vapidJwt($aud, $sub, $priv);
                if ($jwt === '') { $failed++; continue; }
                $ch = curl_init($endpoint);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => '',
                    CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_HTTPHEADER => ['TTL: 86400', 'Content-Length: 0', 'Authorization: vapid t=' . $jwt . ', k=' . $pub],
                ]);
                curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
                if ($code === 404 || $code === 410) { // 만료 구독 → 정리
                    try { $pdo->prepare("DELETE FROM push_subscription WHERE id=?")->execute([(int)$r['id']]); } catch (\Throwable $e) {}
                    $failed++;
                } elseif ($code >= 200 && $code < 300) { $sent++; } else { $failed++; }
            }
            return ['ok' => true, 'sent' => $sent, 'failed' => $failed];
        } catch (\Throwable $e) { return ['ok' => false, 'sent' => 0, 'failed' => 0, 'note' => $e->getMessage()]; }
    }

    private static function originOf(string $url): string
    {
        $p = parse_url($url);
        return ($p['scheme'] ?? 'https') . '://' . ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
    }

    private static function b64url(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }

    /** VAPID JWT(ES256). EC P-256 개인키 PEM 으로 서명, DER→raw(r||s 64B) 변환. */
    private static function vapidJwt(string $audience, string $subject, string $privatePem): string
    {
        try {
            $header = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
            $payload = self::b64url(json_encode(['aud' => $audience, 'exp' => time() + 12 * 3600, 'sub' => $subject]));
            $input = $header . '.' . $payload;
            $key = openssl_pkey_get_private($privatePem);
            if ($key === false) return '';
            $der = '';
            if (!openssl_sign($input, $der, $key, OPENSSL_ALGO_SHA256)) return '';
            $raw = self::derToRaw($der);
            if ($raw === '') return '';
            return $input . '.' . self::b64url($raw);
        } catch (\Throwable $e) { return ''; }
    }

    /** ECDSA DER(SEQUENCE{INTEGER r, INTEGER s}) → 64바이트 raw(r||s, 각 32B 좌측 0패딩). */
    private static function derToRaw(string $der): string
    {
        $o = 0; $len = strlen($der);
        if ($len < 8 || ord($der[$o++]) !== 0x30) return '';
        $seqLen = ord($der[$o++]);
        if ($seqLen & 0x80) { $n = $seqLen & 0x7f; $o += $n; } // long-form length (드묾) 건너뜀
        $readInt = function () use (&$o, $der, $len): string {
            if ($o >= $len || ord($der[$o++]) !== 0x02) return '';
            $l = ord($der[$o++]);
            $v = substr($der, $o, $l); $o += $l;
            $v = ltrim($v, "\x00");                       // 선행 0(부호) 제거
            return str_pad($v, 32, "\x00", STR_PAD_LEFT); // 32B 좌패딩
        };
        $r = $readInt(); $s = $readInt();
        if (strlen($r) !== 32 || strlen($s) !== 32) return '';
        return $r . $s;
    }
}
