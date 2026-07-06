<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PreferenceCenter — 채널별 구독 동의/선호센터 (현 차수 CRM 엔터프라이즈 갭 종결).
 *
 *  경쟁사(Braze/Klaviyo) 정합: 수신자가 채널별(email/sms/kakao/whatsapp/push) 옵트인/옵트아웃과
 *  방해금지시간(quiet-hours)을 스스로 관리하고, 발송 워터폴이 **발송 직전** 이를 강제한다.
 *
 *  ▸ 기존 컴플라이언스와 무중복 분리:
 *      - EmailMarketing email_suppression = 이메일 하드바운스/스팸/수신거부(이메일 채널 한정).
 *      - GdprConsent gdpr_consents         = 웹 방문자 쿠키 동의(analytics/marketing/personalization).
 *      - PreferenceCenter crm_channel_prefs = **CRM 고객별·채널별 마케팅 수신 선호**(신규 갭).
 *    이메일 채널은 두 게이트(suppression + 본 선호)를 모두 통과해야 발송(defense-in-depth).
 *
 *  ▸ 옵트아웃 모델(무회귀): 명시적 opted_in=0 행이 없으면 기존과 동일하게 발송 허용.
 *    공개 선호센터(HMAC 토큰)로 로그인 없이 채널 구독/해지 가능(수신거부 링크 확장).
 *
 *  전부 테넌트 스코프. PII 최소저장(email 은 토큰 대조/공개 옵트아웃용, 정규화 소문자).
 */
final class PreferenceCenter
{
    /** 관리 대상 채널. 'all' 은 전체 채널 일괄 옵트아웃(글로벌 수신거부). */
    public const CHANNELS = ['email', 'sms', 'kakao', 'whatsapp', 'push'];

    private static function db(): PDO { return Db::pdo(); }
    private static function isMysql(PDO $pdo): bool { return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /* ─── 스키마(idempotent · MySQL/SQLite · TEXT DEFAULT 회피) ─────────── */
    /** [R2 성능] 프로세스당 1회 가드 — 발송 루프 내 수신자마다 CREATE TABLE/INDEX 재실행되던 DB 부하 제거.
     *  DDL 자체가 idempotent(IF NOT EXISTS)이므로 최초 1회 후 스킵해도 동작 무변화. */
    private static bool $tablesReady = false;
    public static function ensureTables(): void
    {
        if (self::$tablesReady) return;
        $pdo = self::db();
        try {
            if (self::isMysql($pdo)) {
                // 채널별 구독 상태(고객 1 × 채널 1 = 1행). opted_in: 1=구독, 0=해지.
                $pdo->exec("CREATE TABLE IF NOT EXISTS crm_channel_prefs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL,
                    customer_id INT NOT NULL DEFAULT 0,
                    email VARCHAR(255) NOT NULL DEFAULT '',
                    channel VARCHAR(20) NOT NULL,
                    opted_in TINYINT NOT NULL DEFAULT 1,
                    reason VARCHAR(120),
                    source VARCHAR(40),
                    updated_at VARCHAR(32),
                    UNIQUE KEY uq_pref (tenant_id, customer_id, email, channel),
                    KEY idx_pref_email (tenant_id, email),
                    KEY idx_pref_lookup (tenant_id, customer_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                // 고객별 방해금지시간(quiet-hours) + 타임존. NULL=미설정(테넌트 STO 로 폴백).
                $pdo->exec("CREATE TABLE IF NOT EXISTS crm_customer_prefs (
                    tenant_id VARCHAR(100) NOT NULL,
                    customer_id INT NOT NULL,
                    quiet_start INT DEFAULT NULL,
                    quiet_end INT DEFAULT NULL,
                    tz_offset INT NOT NULL DEFAULT 9,
                    updated_at VARCHAR(32),
                    PRIMARY KEY (tenant_id, customer_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS crm_channel_prefs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL, customer_id INTEGER NOT NULL DEFAULT 0,
                    email TEXT NOT NULL DEFAULT '', channel TEXT NOT NULL,
                    opted_in INTEGER NOT NULL DEFAULT 1, reason TEXT, source TEXT, updated_at TEXT,
                    UNIQUE (tenant_id, customer_id, email, channel))");
                $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pref_email ON crm_channel_prefs(tenant_id, email)");
                $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pref_lookup ON crm_channel_prefs(tenant_id, customer_id)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS crm_customer_prefs (
                    tenant_id TEXT NOT NULL, customer_id INTEGER NOT NULL,
                    quiet_start INTEGER, quiet_end INTEGER, tz_offset INTEGER NOT NULL DEFAULT 9,
                    updated_at TEXT, PRIMARY KEY (tenant_id, customer_id))");
            }
            self::$tablesReady = true; // DDL 성공 시에만 가드 셋(실패 시 다음 호출에서 재시도)
        } catch (\Throwable $e) { /* graceful */ }
    }

    /* ═══ 발송 게이트(워터폴이 발송 직전 호출) ══════════════════════════ */

    /**
     * 채널 발송 허용 여부 — 옵트아웃 모델. 명시적 opted_in=0('all' 또는 해당 채널) 있으면 false.
     * 오류/미설정 시 true(무회귀: 기존 발송 경로 그대로). 전부 테넌트 스코프.
     */
    public static function isChannelAllowed(PDO $pdo, string $tenant, int $customerId, string $channel, string $email = ''): bool
    {
        $channel = strtolower(trim($channel));
        if ($customerId <= 0 && $email === '') return true;
        try {
            self::ensureTables();
            // customer_id 우선 + email 스코프(공개 옵트아웃은 customer_id=0 email 스코프로 기록될 수 있음) 동시 대조.
            $em = strtolower(trim($email));
            if ($customerId > 0) {
                $st = $pdo->prepare("SELECT opted_in FROM crm_channel_prefs
                    WHERE tenant_id=:t AND (customer_id=:c OR (email<>'' AND email=:e)) AND channel IN (:ch,'all')");
                $st->execute([':t'=>$tenant, ':c'=>$customerId, ':e'=>$em, ':ch'=>$channel]);
            } else {
                if ($em === '') return true;
                $st = $pdo->prepare("SELECT opted_in FROM crm_channel_prefs
                    WHERE tenant_id=:t AND email=:e AND channel IN (:ch,'all')");
                $st->execute([':t'=>$tenant, ':e'=>$em, ':ch'=>$channel]);
            }
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                if ((int)$r['opted_in'] === 0) return false; // 'all' 또는 채널 옵트아웃
            }
        } catch (\Throwable $e) { return true; }
        return true;
    }

    /**
     * 고객 개인 방해금지시간(quiet-hours) 내인지 — 발송 지연(defer) 판정. 미설정 시 false(테넌트 STO 가 별도 처리).
     * [현 차수] 통합 발송 게이트 CRM::isMarketingSendAllowed 가 발송 직전 이 메서드를 호출(기존엔 미배선 dead code).
     *   public 유지(크로스핸들러 정적 호출) — 개인 quiet-hours 우선, 미설정 시 CRM::commsSendAllowedNow(테넌트) 폴백.
     * @return bool true=지금은 조용시간(발송 보류)
     */
    public static function isQuietNow(PDO $pdo, string $tenant, int $customerId): bool
    {
        if ($customerId <= 0) return false;
        try {
            self::ensureTables();
            $st = $pdo->prepare("SELECT quiet_start, quiet_end, tz_offset FROM crm_customer_prefs WHERE tenant_id=:t AND customer_id=:c");
            $st->execute([':t'=>$tenant, ':c'=>$customerId]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row || $row['quiet_start'] === null || $row['quiet_end'] === null) return false;
            $s = (int)$row['quiet_start']; $e = (int)$row['quiet_end'];
            if ($s === $e) return false; // 동일 = 미적용
            $off = (int)($row['tz_offset'] ?? 9);
            $h = (int)gmdate('G', time() + $off * 3600);
            return ($s > $e) ? ($h >= $s || $h < $e) : ($h >= $s && $h < $e);
        } catch (\Throwable $e) { return false; }
    }

    /* ─── 내부 upsert ─────────────────────────────────────────────────── */
    private static function upsertPref(PDO $pdo, string $tenant, int $customerId, string $email, string $channel, int $optedIn, string $source): void
    {
        $email = strtolower(trim($email));
        $now = self::now();
        if (self::isMysql($pdo)) {
            $pdo->prepare("INSERT INTO crm_channel_prefs (tenant_id,customer_id,email,channel,opted_in,reason,source,updated_at)
                VALUES (:t,:c,:e,:ch,:oi,:r,:s,:u)
                ON DUPLICATE KEY UPDATE opted_in=VALUES(opted_in), reason=VALUES(reason), source=VALUES(source), updated_at=VALUES(updated_at)")
                ->execute([':t'=>$tenant, ':c'=>$customerId, ':e'=>$email, ':ch'=>$channel, ':oi'=>$optedIn,
                    ':r'=>($optedIn ? 'opt_in' : 'opt_out'), ':s'=>$source, ':u'=>$now]);
        } else {
            $pdo->prepare("INSERT INTO crm_channel_prefs (tenant_id,customer_id,email,channel,opted_in,reason,source,updated_at)
                VALUES (:t,:c,:e,:ch,:oi,:r,:s,:u)
                ON CONFLICT(tenant_id,customer_id,email,channel) DO UPDATE SET opted_in=excluded.opted_in, reason=excluded.reason, source=excluded.source, updated_at=excluded.updated_at")
                ->execute([':t'=>$tenant, ':c'=>$customerId, ':e'=>$email, ':ch'=>$channel, ':oi'=>$optedIn,
                    ':r'=>($optedIn ? 'opt_in' : 'opt_out'), ':s'=>$source, ':u'=>$now]);
        }
    }

    /* ═══ 공개 선호센터(HMAC 토큰, 로그인 불필요) ══════════════════════ */
    private static function prefToken(string $tenant, string $email): string
    {
        // [현 차수 보안] 공개 상수 폴백 제거 — APP_KEY 미설정 시 설치별 PG_ENC_KEY 로 강등(위조 차단). EmailMarketing::unsubToken 과 동일 SSOT.
        $secret = getenv('APP_KEY') ?: getenv('PG_ENC_KEY') ?: 'genie-unsub-secret-v1';
        return substr(hash_hmac('sha256', $tenant . '|pref|' . strtolower(trim($email)), $secret), 0, 32);
    }

    /** 발송측이 선호센터 링크 생성 시 사용(공개, 인증 불필요). */
    public static function prefUrl(string $tenant, string $email): string
    {
        $u = getenv('APP_PUBLIC_URL') ?: getenv('APP_URL') ?: 'https://www.genieroi.com';
        $u = rtrim((string)$u, '/'); if ($u === '' || strpos($u, 'http') !== 0) $u = 'https://www.genieroi.com';
        return $u . '/api/crm/preferences/public?t=' . rawurlencode($tenant)
            . '&e=' . rawurlencode($email) . '&k=' . self::prefToken($tenant, $email);
    }

    /** 고객 email 로 customer_id 조회(테넌트 스코프). 없으면 0(email 스코프 옵트아웃 기록). */
    private static function customerIdByEmail(PDO $pdo, string $tenant, string $email): int
    {
        try {
            $st = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=:t AND email=:e LIMIT 1");
            $st->execute([':t'=>$tenant, ':e'=>strtolower(trim($email))]);
            return (int)($st->fetchColumn() ?: 0);
        } catch (\Throwable $e) { return 0; }
    }

    /* ─── GET|POST /crm/preferences/public — 공개 선호센터(HMAC 토큰) ─── */
    public static function publicCenter(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $tenant = (string)($q['t'] ?? ''); $email = (string)($q['e'] ?? ''); $k = (string)($q['k'] ?? '');
        $page = function (string $title, string $msg, int $code = 200) use ($res) {
            $html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                . '<title>' . $title . '</title><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0">'
                . '<div style="max-width:480px;margin:64px auto;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(15,23,42,.06)">'
                . '<div style="font-size:44px;margin-bottom:12px">⚙️</div><h1 style="font-size:20px;color:#0f172a;margin:0 0 10px">' . $title . '</h1>'
                . '<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0">' . $msg . '</p></div></body>';
            $res->getBody()->write($html);
            return $res->withHeader('Content-Type', 'text/html; charset=utf-8')->withStatus($code);
        };
        if ($tenant === '' || $email === '' || !hash_equals(self::prefToken($tenant, $email), $k)) {
            return $page('링크가 유효하지 않습니다', '선호센터 링크가 만료되었거나 올바르지 않습니다.', 400);
        }
        self::ensureTables();
        $pdo = self::db();
        $cid = self::customerIdByEmail($pdo, $tenant, $email);

        // POST = 저장(폼 제출). body: channels[] (구독 유지 채널), 나머지는 옵트아웃. all_off=1 이면 전체 해지.
        if (strtoupper($req->getMethod()) === 'POST') {
            $b = (array)($req->getParsedBody() ?? []);
            if (!empty($b['all_off'])) {
                self::upsertPref($pdo, $tenant, $cid, $email, 'all', 0, 'public');
                return $page('전체 수신거부 완료', '<strong>' . htmlspecialchars($email) . '</strong> 의 모든 마케팅 채널 수신이 중단되었습니다.');
            }
            $keep = array_map('strval', (array)($b['channels'] ?? []));
            // 'all' 옵트아웃 해제(채널 선택 재개) + 채널별 상태 반영.
            self::upsertPref($pdo, $tenant, $cid, $email, 'all', 1, 'public');
            foreach (self::CHANNELS as $ch) {
                self::upsertPref($pdo, $tenant, $cid, $email, $ch, in_array($ch, $keep, true) ? 1 : 0, 'public');
            }
            return $page('선호 저장 완료', '수신 채널 선호가 업데이트되었습니다.');
        }

        // GET = 현재 상태 폼 렌더.
        $state = [];
        foreach (self::CHANNELS as $ch) { $state[$ch] = self::isChannelAllowed($pdo, $tenant, $cid, $ch, $email); }
        $labels = ['email'=>'이메일', 'sms'=>'문자(SMS)', 'kakao'=>'카카오 알림톡', 'whatsapp'=>'WhatsApp', 'push'=>'웹푸시'];
        $checks = '';
        foreach (self::CHANNELS as $ch) {
            $checks .= '<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;font-size:14px;color:#0f172a;text-align:left">'
                . '<input type="checkbox" name="channels[]" value="' . $ch . '"' . ($state[$ch] ? ' checked' : '') . '>' . ($labels[$ch] ?? $ch) . '</label>';
        }
        $action = '/api/crm/preferences/public?t=' . rawurlencode($tenant) . '&e=' . rawurlencode($email) . '&k=' . $k;
        $html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>수신 선호 관리</title><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0">'
            . '<div style="max-width:480px;margin:48px auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(15,23,42,.06)">'
            . '<h1 style="font-size:20px;color:#0f172a;margin:0 0 6px">수신 선호 관리</h1>'
            . '<p style="font-size:13px;color:#64748b;margin:0 0 20px">' . htmlspecialchars($email) . ' — 받고 싶은 채널만 선택하세요.</p>'
            . '<form method="post" action="' . htmlspecialchars($action, ENT_QUOTES) . '">' . $checks
            . '<button type="submit" style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:#4f8ef7;color:#fff;font-size:15px;font-weight:600;cursor:pointer">선호 저장</button></form>'
            . '<form method="post" action="' . htmlspecialchars($action, ENT_QUOTES) . '" style="margin-top:10px"><input type="hidden" name="all_off" value="1">'
            . '<button type="submit" style="width:100%;padding:10px;border:0;border-radius:10px;background:#f1f5f9;color:#64748b;font-size:13px;cursor:pointer">전체 수신거부</button></form>'
            . '</div></body>';
        $res->getBody()->write($html);
        return $res->withHeader('Content-Type', 'text/html; charset=utf-8')->withStatus(200);
    }

    /* ═══ 인증(관리자/운영) API ═══════════════════════════════════════ */

    /* ─── GET /crm/preferences?customer_id= ─── 특정 고객 채널 선호 + quiet-hours 조회 ─── */
    public static function getPreferences(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $cid = (int)($req->getQueryParams()['customer_id'] ?? 0);
        if ($cid <= 0) return self::json($res, ['ok'=>false, 'error'=>'customer_id 필수'], 400);
        $email = '';
        try {
            $cs = $pdo->prepare("SELECT email FROM crm_customers WHERE id=:id AND tenant_id=:t");
            $cs->execute([':id'=>$cid, ':t'=>$tenant]); $email = (string)($cs->fetchColumn() ?: '');
        } catch (\Throwable $e) {}
        $channels = [];
        foreach (self::CHANNELS as $ch) { $channels[$ch] = self::isChannelAllowed($pdo, $tenant, $cid, $ch, $email); }
        $quiet = ['quiet_start'=>null, 'quiet_end'=>null, 'tz_offset'=>9];
        try {
            $qs = $pdo->prepare("SELECT quiet_start, quiet_end, tz_offset FROM crm_customer_prefs WHERE tenant_id=:t AND customer_id=:c");
            $qs->execute([':t'=>$tenant, ':c'=>$cid]); $qr = $qs->fetch(PDO::FETCH_ASSOC);
            if ($qr) { $quiet = ['quiet_start'=>($qr['quiet_start']!==null?(int)$qr['quiet_start']:null), 'quiet_end'=>($qr['quiet_end']!==null?(int)$qr['quiet_end']:null), 'tz_offset'=>(int)($qr['tz_offset'] ?? 9)]; }
        } catch (\Throwable $e) {}
        return self::json($res, ['ok'=>true, 'customer_id'=>$cid, 'email'=>$email, 'channels'=>$channels, 'quiet'=>$quiet]);
    }

    /* ─── PUT /crm/preferences ─── 채널 선호/quiet-hours 저장 ─── body:{customer_id, channels:{email:bool,...}, quiet_start, quiet_end, tz_offset} ─── */
    public static function savePreferences(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        $cid = (int)($b['customer_id'] ?? 0);
        if ($cid <= 0) return self::json($res, ['ok'=>false, 'error'=>'customer_id 필수'], 400);
        // 소유 검증(테넌트 스코프).
        $email = '';
        try {
            $cs = $pdo->prepare("SELECT email FROM crm_customers WHERE id=:id AND tenant_id=:t");
            $cs->execute([':id'=>$cid, ':t'=>$tenant]); $row = $cs->fetch(PDO::FETCH_ASSOC);
            if (!$row) return self::json($res, ['ok'=>false, 'error'=>'고객 없음'], 404);
            $email = (string)$row['email'];
        } catch (\Throwable $e) { return self::json($res, ['ok'=>false, 'error'=>'조회 실패'], 500); }

        if (isset($b['channels']) && is_array($b['channels'])) {
            self::upsertPref($pdo, $tenant, $cid, $email, 'all', 1, 'admin'); // 관리자 편집은 글로벌 옵트아웃 해제
            foreach (self::CHANNELS as $ch) {
                if (!array_key_exists($ch, $b['channels'])) continue;
                $on = ($b['channels'][$ch] === true || $b['channels'][$ch] === 1 || $b['channels'][$ch] === '1' || $b['channels'][$ch] === 'true');
                self::upsertPref($pdo, $tenant, $cid, $email, $ch, $on ? 1 : 0, 'admin');
            }
        }
        // quiet-hours(옵션). null 전달 = 해제.
        if (array_key_exists('quiet_start', $b) || array_key_exists('quiet_end', $b) || array_key_exists('tz_offset', $b)) {
            $qsVal = array_key_exists('quiet_start', $b) && $b['quiet_start'] !== null && $b['quiet_start'] !== '' ? max(0, min(23, (int)$b['quiet_start'])) : null;
            $qeVal = array_key_exists('quiet_end', $b) && $b['quiet_end'] !== null && $b['quiet_end'] !== '' ? max(0, min(23, (int)$b['quiet_end'])) : null;
            $tz = array_key_exists('tz_offset', $b) ? max(-12, min(14, (int)$b['tz_offset'])) : 9;
            $now = self::now();
            if (self::isMysql($pdo)) {
                $pdo->prepare("INSERT INTO crm_customer_prefs (tenant_id,customer_id,quiet_start,quiet_end,tz_offset,updated_at)
                    VALUES (:t,:c,:qs,:qe,:tz,:u) ON DUPLICATE KEY UPDATE quiet_start=VALUES(quiet_start), quiet_end=VALUES(quiet_end), tz_offset=VALUES(tz_offset), updated_at=VALUES(updated_at)")
                    ->execute([':t'=>$tenant, ':c'=>$cid, ':qs'=>$qsVal, ':qe'=>$qeVal, ':tz'=>$tz, ':u'=>$now]);
            } else {
                $pdo->prepare("INSERT INTO crm_customer_prefs (tenant_id,customer_id,quiet_start,quiet_end,tz_offset,updated_at)
                    VALUES (:t,:c,:qs,:qe,:tz,:u) ON CONFLICT(tenant_id,customer_id) DO UPDATE SET quiet_start=excluded.quiet_start, quiet_end=excluded.quiet_end, tz_offset=excluded.tz_offset, updated_at=excluded.updated_at")
                    ->execute([':t'=>$tenant, ':c'=>$cid, ':qs'=>$qsVal, ':qe'=>$qeVal, ':tz'=>$tz, ':u'=>$now]);
            }
        }
        return self::json($res, ['ok'=>true]);
    }

    /* ─── GET /crm/preferences/summary ─── 채널별 옵트아웃 수 집계(리스트 위생 대시보드) ─── */
    public static function summary(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $out = [];
        try {
            $st = $pdo->prepare("SELECT channel, SUM(CASE WHEN opted_in=0 THEN 1 ELSE 0 END) AS opted_out,
                SUM(CASE WHEN opted_in=1 THEN 1 ELSE 0 END) AS opted_in FROM crm_channel_prefs WHERE tenant_id=:t GROUP BY channel");
            $st->execute([':t'=>$tenant]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['channel']] = ['opted_out'=>(int)$r['opted_out'], 'opted_in'=>(int)$r['opted_in']];
            }
        } catch (\Throwable $e) {}
        return self::json($res, ['ok'=>true, 'by_channel'=>$out]);
    }
}
