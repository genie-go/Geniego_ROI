<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Mailer;

/**
 * EmailMarketing — 이메일 캠페인 (190차 부활 + 멀티테넌트 격리 + MySQL/SQLite 이식 + Mailer 연동).
 *
 * 189차까지 runtime-dead(Db::get). 부활 4층(메모리 project_n190 §④ CRM 패턴 동일):
 *   ① Db::get→pdo ② 라우팅 /api/email→/email(basePath 정합) ③ 격리먼저(requirePro+세션tenant,
 *   email_* 4테이블 tenant_id, ★crm_* 참조도 테넌트 스코핑 — 무스코핑 시 전 테넌트 고객에게 발송=P0)
 *   ④ SQL 이식(SQLite datetime('now')→PHP 바인드). + sendCampaign 실발송을 Mailer(SMTP) 위임.
 * email_settings = 테넌트 캠페인 SMTP(플랫폼 트랜잭션 메일은 Mailer env). /api/email public bypass(세션 self-auth).
 */
class EmailMarketing
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function jsonRes(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_settings (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                provider VARCHAR(30) DEFAULT 'smtp', smtp_host VARCHAR(255), smtp_port INT DEFAULT 587,
                smtp_user VARCHAR(255), smtp_pass VARCHAR(255), from_email VARCHAR(255), from_name VARCHAR(255),
                aws_region VARCHAR(64), aws_key VARCHAR(255), aws_secret VARCHAR(255), updated_at VARCHAR(32),
                KEY idx_email_settings_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_templates (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, subject VARCHAR(500) NOT NULL, html_body MEDIUMTEXT NOT NULL,
                plain_body MEDIUMTEXT, variables TEXT, category VARCHAR(50) DEFAULT 'general',
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_email_tpl_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(255) NOT NULL, template_id INT, segment_id INT, status VARCHAR(30) DEFAULT 'draft',
                scheduled_at VARCHAR(32), sent_at VARCHAR(32), total_sent INT DEFAULT 0, opened INT DEFAULT 0,
                clicked INT DEFAULT 0, bounced INT DEFAULT 0, created_at VARCHAR(32), KEY idx_email_cmp_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_sends (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                campaign_id INT NOT NULL, customer_id INT, email VARCHAR(255) NOT NULL, status VARCHAR(30) DEFAULT 'pending',
                opened_at VARCHAR(32), clicked_at VARCHAR(32), bounce_reason TEXT, sent_at VARCHAR(32),
                KEY idx_email_sends_cmp (campaign_id), KEY idx_email_sends_tenant (tenant_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // [현 차수] Klaviyo급 딜리버러빌리티 — 수신거부/바운스 Suppression 리스트(컴플라이언스 필수).
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_suppression (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                email VARCHAR(255) NOT NULL, reason VARCHAR(32) DEFAULT 'unsubscribe', source VARCHAR(32) DEFAULT 'user',
                created_at VARCHAR(32), UNIQUE KEY uq_suppress (tenant_id, email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', provider TEXT DEFAULT 'smtp',
                smtp_host TEXT, smtp_port INTEGER DEFAULT 587, smtp_user TEXT, smtp_pass TEXT, from_email TEXT, from_name TEXT,
                aws_region TEXT, aws_key TEXT, aws_secret TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL,
                subject TEXT NOT NULL, html_body TEXT NOT NULL, plain_body TEXT, variables TEXT DEFAULT '[]',
                category TEXT DEFAULT 'general', created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL,
                template_id INTEGER, segment_id INTEGER, status TEXT DEFAULT 'draft', scheduled_at TEXT, sent_at TEXT,
                total_sent INTEGER DEFAULT 0, opened INTEGER DEFAULT 0, clicked INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0,
                created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_sends (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', campaign_id INTEGER NOT NULL,
                customer_id INTEGER, email TEXT NOT NULL, status TEXT DEFAULT 'pending', opened_at TEXT, clicked_at TEXT,
                bounce_reason TEXT, sent_at TEXT)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_email_sends_cmp ON email_sends(campaign_id)");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_email_settings_tenant ON email_settings(tenant_id)");
            // [현 차수] Suppression 리스트(SQLite).
            $pdo->exec("CREATE TABLE IF NOT EXISTS email_suppression (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', email TEXT NOT NULL,
                reason TEXT DEFAULT 'unsubscribe', source TEXT DEFAULT 'user', created_at TEXT)");
            $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_suppress ON email_suppression(tenant_id, email)");
        }
        foreach (['email_settings','email_templates','email_campaigns','email_sends'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
        // [현 차수] STO 비동기 발송 큐 — scheduled_at(예약)·attempts(재시도) 컬럼(멱등 ALTER).
        //   [현 차수 P2-2b] sto_hour(수신자별 최적 발송시각 KST)·variant(A/B 분기) 추가.
        foreach (['scheduled_at VARCHAR(32)', 'attempts INT DEFAULT 0', 'sto_hour INT DEFAULT NULL', 'variant VARCHAR(8) DEFAULT NULL'] as $col) {
            try { $pdo->exec("ALTER TABLE email_sends ADD COLUMN " . $col); } catch (\Throwable $e) {}
        }
        // [현 차수 P2-2b] A/B: 캠페인에 variant B 제목·A/B 플래그·승자(멱등 ALTER).
        foreach (['subject_b VARCHAR(255) DEFAULT NULL', 'ab_test INT DEFAULT 0', 'ab_winner VARCHAR(8) DEFAULT NULL'] as $col) {
            try { $pdo->exec("ALTER TABLE email_campaigns ADD COLUMN " . $col); } catch (\Throwable $e) {}
        }
    }

    /** [현 차수 P2-2b] 수신자별 최적 발송시각(STO) — 과거 오픈 시각(opened_at) KST 시간대 최빈값. 이력<2 면 null(STO 미적용). */
    private static function optimalHourFor(\PDO $pdo, string $tenant, string $email): ?int {
        try {
            $st = $pdo->prepare("SELECT opened_at FROM email_sends WHERE tenant_id=:t AND email=:e AND opened_at IS NOT NULL AND opened_at<>'' ORDER BY id DESC LIMIT 50");
            $st->execute([':t'=>$tenant, ':e'=>$email]);
            $hist = $st->fetchAll(\PDO::FETCH_COLUMN) ?: [];
            if (count($hist) < 2) return null;
            // [현 차수 초고도화 ⑥] STO 정밀화(Braze Intelligent Timing식) — 최근 오픈에 지수 감쇠 가중.
            //   최근 행동일수록 현재 선호시각을 더 반영. 반환은 여전히 시각(0~23)이라 큐 매칭 정합 불변(회귀0).
            $nowU = time();
            $buckets = [];
            foreach ($hist as $ts) {
                $u = strtotime((string)$ts); if ($u === false) continue;
                $h = (int)gmdate('G', $u + 9 * 3600); // KST = UTC+9
                $ageDays = max(0.0, ($nowU - $u) / 86400.0);
                $w = exp(-$ageDays / 30.0); // 30일 스케일 지수 감쇠(최근일수록 가중 ↑)
                $buckets[$h] = ($buckets[$h] ?? 0.0) + $w;
            }
            if (!$buckets) return null;
            arsort($buckets);
            return (int)array_key_first($buckets);
        } catch (\Throwable $e) { return null; }
    }

    /* ═══ [현 차수] Klaviyo급 딜리버러빌리티/컴플라이언스 — Suppression·Unsubscribe·개인화 ═══ */
    private static function appBaseUrl(): string {
        $u = getenv('APP_PUBLIC_URL') ?: getenv('APP_URL') ?: 'https://roi.genie-go.com';
        $u = rtrim((string)$u, '/');
        return ($u === '' || strpos($u, 'http') !== 0) ? 'https://roi.genie-go.com' : $u;
    }
    private static function unsubToken(string $tenant, string $email): string {
        $secret = getenv('APP_KEY') ?: 'genie-unsub-secret-v1';
        return substr(hash_hmac('sha256', $tenant . '|' . strtolower(trim($email)), $secret), 0, 32);
    }
    private static function unsubUrl(string $tenant, string $email): string {
        return self::appBaseUrl() . '/api/email/unsubscribe?t=' . rawurlencode($tenant)
            . '&e=' . rawurlencode($email) . '&k=' . self::unsubToken($tenant, $email);
    }
    /** 발송 전 수신거부 게이트 — 마케팅 발송 루프가 호출(컴플라이언스 필수). */
    public static function isSuppressed(\PDO $pdo, string $tenant, string $email): bool {
        try {
            $s = $pdo->prepare("SELECT 1 FROM email_suppression WHERE tenant_id=:t AND email=:e LIMIT 1");
            $s->execute([':t'=>$tenant, ':e'=>strtolower(trim($email))]);
            return (bool)$s->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }
    /** 멱등 suppression 적재(수신거부·하드바운스·스팸신고). */
    public static function suppress(\PDO $pdo, string $tenant, string $email, string $reason='unsubscribe', string $source='user'): void {
        try {
            $pdo->prepare("INSERT INTO email_suppression (tenant_id,email,reason,source,created_at) VALUES (:t,:e,:r,:s,:c)")
                ->execute([':t'=>$tenant, ':e'=>strtolower(trim($email)), ':r'=>$reason, ':s'=>$source, ':c'=>self::now()]);
        } catch (\Throwable $e) { /* unique 충돌 = 이미 등록됨 */ }
    }
    /** [254차 초고도화] 개인화 머지 — Liquid-라이트. {{var}} 머지변수 확장 + {% if %}/{% else %}/{% endif %} 조건블록
     *   + {{var | default:"폴백"}} 필터. 기존 {{name}}/{{first_name}}/{{email}} 하위호환(미사용 시 동작 동일=회귀0). */
    private static function renderTemplate(string $tpl, array $c, array $extra=[]): string {
        $name = trim((string)($c['name'] ?? ''));
        $vars = [
            'name' => $name, '이름' => $name,
            'first_name' => ($name !== '' ? explode(' ', $name)[0] : ''),
            'email' => (string)($c['email'] ?? ''), 'phone' => (string)($c['phone'] ?? ''),
            'grade' => (string)($c['grade'] ?? ''), 'company' => (string)($c['company'] ?? ''),
            'city' => (string)($c['city'] ?? ''), 'ltv' => isset($c['ltv']) ? (string)round((float)$c['ltv']) : '',
        ];
        foreach ($extra as $k=>$v) $vars[$k] = is_scalar($v) ? (string)$v : '';
        $out = $tpl;
        // 1) 조건 블록(단순 truthy·else 지원·일부 중첩 위해 반복).
        for ($i = 0; $i < 20; $i++) {
            $new = preg_replace_callback('/\{%\s*if\s+([a-zA-Z0-9_]+)\s*%\}(.*?)(?:\{%\s*else\s*%\}(.*?))?\{%\s*endif\s*%\}/su', function($m) use ($vars) {
                $t = isset($vars[$m[1]]) && trim($vars[$m[1]]) !== '' && $vars[$m[1]] !== '0';
                return $t ? $m[2] : ($m[3] ?? '');
            }, $out);
            if ($new === null || $new === $out) break; $out = $new;
        }
        // 2) |default 필터.
        $out = preg_replace_callback('/\{\{\s*([a-zA-Z0-9_가-힣]+)\s*\|\s*default:\s*"([^"]*)"\s*\}\}/u', function($m) use ($vars) {
            $v = $vars[$m[1]] ?? ''; return ($v !== '' ? $v : $m[2]);
        }, $out);
        // 3) 기본 토큰 치환 + 미정의 제거.
        $map = []; foreach ($vars as $k=>$v) $map['{{'.$k.'}}'] = $v;
        $out = strtr($out, $map);
        return preg_replace('/\{\{\s*[a-zA-Z0-9_가-힣]+\s*\}\}/u', '', $out);
    }
    private static function unsubFooter(string $url): string {
        return '<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;text-align:center;font-family:system-ui,sans-serif">'
            . '본 메일은 마케팅 정보 수신에 동의하신 분께 발송되었습니다.<br>'
            . '<a href="' . htmlspecialchars($url, ENT_QUOTES) . '" style="color:#64748b;text-decoration:underline">수신거부 / Unsubscribe</a></div>';
    }

    /* ─── GET|POST /email/unsubscribe — 공개(HMAC 토큰 검증). 수신거부 등록 후 HTML 응답. ─── */
    public static function unsubscribe(Request $req, Response $res): Response {
        $q = $req->getQueryParams();
        $tenant = (string)($q['t'] ?? ''); $email = (string)($q['e'] ?? ''); $k = (string)($q['k'] ?? '');
        $page = function(string $title, string $msg, int $code=200) use ($res) {
            $html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                . '<title>' . $title . '</title><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0">'
                . '<div style="max-width:480px;margin:64px auto;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(15,23,42,.06)">'
                . '<div style="font-size:44px;margin-bottom:12px">📭</div><h1 style="font-size:20px;color:#0f172a;margin:0 0 10px">' . $title . '</h1>'
                . '<p style="font-size:14px;color:#64748b;line-height:1.7;margin:0">' . $msg . '</p></div></body>';
            $res->getBody()->write($html);
            return $res->withHeader('Content-Type', 'text/html; charset=utf-8')->withStatus($code);
        };
        if ($tenant === '' || $email === '' || !hash_equals(self::unsubToken($tenant, $email), $k)) {
            return $page('링크가 유효하지 않습니다', '수신거부 링크가 만료되었거나 올바르지 않습니다.', 400);
        }
        self::ensureTables();
        self::suppress(self::db(), $tenant, $email, 'unsubscribe', 'user');
        return $page('수신거부 완료', '<strong>' . htmlspecialchars($email) . '</strong> 주소로의 마케팅 이메일 수신이 중단되었습니다.');
    }

    /* ─── Suppression 리스트 관리(인증) — 리스트 위생(Klaviyo Suppressions 정합) ─── */
    public static function listSuppression(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables(); $pdo = self::db(); $tenant = self::tenant($req);
        $rows = $pdo->prepare("SELECT email, reason, source, created_at FROM email_suppression WHERE tenant_id=:t ORDER BY created_at DESC LIMIT 2000");
        $rows->execute([':t'=>$tenant]);
        $list = $rows->fetchAll(\PDO::FETCH_ASSOC);
        $byReason = [];
        foreach ($list as $r) { $rk = (string)($r['reason'] ?? 'unsubscribe'); $byReason[$rk] = ($byReason[$rk] ?? 0) + 1; }
        return self::jsonRes($res, ['ok'=>true, 'suppression'=>$list, 'total'=>count($list), 'by_reason'=>$byReason]);
    }
    public static function addSuppression(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables(); $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []); if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $email = trim((string)($body['email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) return self::jsonRes($res, ['ok'=>false,'error'=>'유효한 이메일 주소가 필요합니다'], 422);
        self::suppress($pdo, $tenant, $email, (string)($body['reason'] ?? 'manual'), 'admin');
        return self::jsonRes($res, ['ok'=>true, 'email'=>strtolower($email)]);
    }
    public static function removeSuppression(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables(); $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []); if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $email = strtolower(trim((string)($body['email'] ?? ($req->getQueryParams()['email'] ?? '')))); // DELETE는 query 폴백
        if ($email === '') return self::jsonRes($res, ['ok'=>false,'error'=>'email 필요'], 422);
        $pdo->prepare("DELETE FROM email_suppression WHERE tenant_id=:t AND email=:e")->execute([':t'=>$tenant, ':e'=>$email]);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── POST /email/queue/process — STO 큐 워커(cron). 허용시각 테넌트의 queued 발송 실행(재렌더·재시도). ─── */
    public static function processQueue(Request $req, Response $res): Response {
        $q = $req->getQueryParams();
        $secret = getenv('APP_KEY') ?: '';
        $cronOk = ($secret !== '' && hash_equals(substr(hash_hmac('sha256', 'email-queue', $secret), 0, 32), (string)($q['cron_key'] ?? '')));
        if (!$cronOk) { if ($err = UserAuth::requirePro($req, $res)) return $err; }
        return self::jsonRes($res, array_merge(['ok'=>true], self::runQueue()));
    }

    /* ─── [현 차수 초고도화 ②-3] 이메일 워밍업 램프(발신 평판 보호) — opt-in(기본 OFF → runQueue 불변=회귀0) ─── */
    private static function ensureWarmupTable(\PDO $pdo): void {
        try {
            if (self::isMysql($pdo)) $pdo->exec("CREATE TABLE IF NOT EXISTS email_warmup (tenant_id VARCHAR(100) PRIMARY KEY, enabled TINYINT(1) DEFAULT 0, start_date VARCHAR(20), updated_at VARCHAR(32)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            else $pdo->exec("CREATE TABLE IF NOT EXISTS email_warmup (tenant_id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, start_date TEXT, updated_at TEXT)");
        } catch (\Throwable $e) {}
    }
    private static function warmupConfig(\PDO $pdo, string $tenant): array {
        self::ensureWarmupTable($pdo);
        try {
            $st = $pdo->prepare("SELECT enabled, start_date FROM email_warmup WHERE tenant_id=?");
            $st->execute([$tenant]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if ($r && (int)$r['enabled'] === 1 && !empty($r['start_date'])) return ['enabled' => true, 'start' => (string)$r['start_date']];
        } catch (\Throwable $e) {}
        return ['enabled' => false, 'start' => gmdate('Y-m-d')];
    }
    /** 표준 워밍업 일일 한도(발신 평판 보호). 14일 후 무제한(PHP_INT_MAX). */
    private static function warmupCap(int $dayIdx): int {
        static $sched = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000, 40000, 75000, 100000, 150000, 250000];
        if ($dayIdx < 0) $dayIdx = 0;
        return $dayIdx >= count($sched) ? PHP_INT_MAX : $sched[$dayIdx];
    }
    /** GET /email/warmup — 워밍업 설정 조회. */
    public static function warmupGet(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $cfg = self::warmupConfig(self::db(), self::tenant($req));
        return self::jsonRes($res, ['ok' => true, 'enabled' => $cfg['enabled'], 'start_date' => $cfg['start']]);
    }
    /** POST /email/warmup — 워밍업 opt-in 설정(enabled/start_date). 기본 OFF. */
    public static function warmupSave(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = self::db(); self::ensureWarmupTable($pdo);
        $t = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $enabled = !empty($b['enabled']) ? 1 : 0;
        $start = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($b['start_date'] ?? '')) ? (string)$b['start_date'] : gmdate('Y-m-d');
        $now = self::now();
        if (self::isMysql($pdo)) $pdo->prepare("INSERT INTO email_warmup(tenant_id,enabled,start_date,updated_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),start_date=VALUES(start_date),updated_at=VALUES(updated_at)")->execute([$t, $enabled, $start, $now]);
        else $pdo->prepare("INSERT INTO email_warmup(tenant_id,enabled,start_date,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET enabled=excluded.enabled,start_date=excluded.start_date,updated_at=excluded.updated_at")->execute([$t, $enabled, $start, $now]);
        return self::jsonRes($res, ['ok' => true, 'enabled' => (bool)$enabled, 'start_date' => $start]);
    }

    /** STO 큐 워커 본체 — HTTP/CLI(cron) 공용. 허용시각 테넌트의 queued 발송(재렌더·재시도). */
    public static function runQueue(?string $onlyTenant = null): array {
        self::ensureTables(); $pdo = self::db(); $now = self::now();
        if ($onlyTenant !== null && $onlyTenant !== '') { $tenants = [$onlyTenant]; }
        else { $tenants = $pdo->query("SELECT DISTINCT tenant_id FROM email_sends WHERE status='queued'")->fetchAll(\PDO::FETCH_COLUMN); }
        $sent = 0; $failed = 0; $deferredTenants = 0; $tplCache = [];
        foreach ($tenants as $tn) {
            $cfg = CRM::commsFreqConfig($pdo, (string)$tn);
            if (!CRM::commsSendAllowedNow($cfg)) { $deferredTenants++; continue; } // 아직 차단시간 → 다음 cron
            // [현 차수 초고도화 ②-3] 워밍업 램프(opt-in·기본 OFF=회귀0) — 발신 평판 보호 일일 한도.
            $warmupRemaining = PHP_INT_MAX;
            $wu = self::warmupConfig($pdo, (string)$tn);
            if ($wu['enabled']) {
                $dayIdx = (int)floor((time() - (strtotime($wu['start'] . ' 00:00:00') ?: time())) / 86400);
                $cap = self::warmupCap($dayIdx);
                if ($cap !== PHP_INT_MAX) {
                    $cst = $pdo->prepare("SELECT COUNT(*) FROM email_sends WHERE tenant_id=:t AND status='sent' AND sent_at LIKE :d");
                    $cst->execute([':t' => $tn, ':d' => gmdate('Y-m-d') . '%']);
                    $warmupRemaining = max(0, $cap - (int)$cst->fetchColumn());
                    if ($warmupRemaining <= 0) { $deferredTenants++; continue; } // 오늘 워밍업 한도 소진 → 잔여 큐 유지
                }
            }
            $rows = $pdo->prepare("SELECT * FROM email_sends WHERE tenant_id=:t AND status='queued' ORDER BY id LIMIT 1000");
            $rows->execute([':t'=>$tn]);
            $curHourKst = (int)gmdate('G', time() + 9 * 3600); // [현 차수 P2-2b] 수신자별 STO 시각 매칭(KST)
            $sentThisCycle = 0;
            foreach ($rows->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                if ($sentThisCycle >= $warmupRemaining) break; // [②-3] 워밍업 일일 한도 도달 → 잔여 큐 다음 cron/일
                $cid = (int)$row['campaign_id']; $email = (string)$row['email']; $uid = (int)$row['customer_id'];
                // [현 차수 P2-2b] 수신자별 STO — 개인 최적시각이 설정됐고 현재 KST 시각이 아니면 이 cron 사이클 보류(다음에 발송).
                if (isset($row['sto_hour']) && $row['sto_hour'] !== null && (int)$row['sto_hour'] !== $curHourKst) continue;
                if (self::isSuppressed($pdo, (string)$tn, $email)) { $pdo->prepare("UPDATE email_sends SET status='suppressed' WHERE id=:id")->execute([':id'=>$row['id']]); continue; }
                if (!isset($tplCache[$cid])) {
                    $cst = $pdo->prepare("SELECT c.name AS cname, c.subject_b, t.subject, t.html_body FROM email_campaigns c LEFT JOIN email_templates t ON t.id=c.template_id AND t.tenant_id=c.tenant_id WHERE c.id=:id AND c.tenant_id=:t");
                    $cst->execute([':id'=>$cid, ':t'=>$tn]);
                    $tplCache[$cid] = $cst->fetch(\PDO::FETCH_ASSOC) ?: ['cname'=>'', 'subject_b'=>null, 'subject'=>'(제목 없음)', 'html_body'=>''];
                }
                $tpl = $tplCache[$cid];
                $cust = ['email'=>$email, 'name'=>''];
                if ($uid > 0) { $cs = $pdo->prepare("SELECT name FROM crm_customers WHERE id=:id AND tenant_id=:t"); $cs->execute([':id'=>$uid, ':t'=>$tn]); $cust['name'] = (string)($cs->fetchColumn() ?: ''); }
                $unsubUrl = self::unsubUrl((string)$tn, $email);
                // [현 차수 P2-2b] A/B variant B 면 variant B 제목 사용.
                $subjTpl = (((string)($row['variant'] ?? '') === 'B') && trim((string)($tpl['subject_b'] ?? '')) !== '') ? (string)$tpl['subject_b'] : (string)($tpl['subject'] ?? '');
                $subject = self::renderTemplate($subjTpl, $cust);
                $body = self::renderTemplate((string)($tpl['html_body'] ?? ''), $cust, ['unsubscribe_url'=>$unsubUrl]) . self::unsubFooter($unsubUrl);
                $body = self::injectTracking($body, $cid, $uid); // [현 차수 P2-2b] 오픈/클릭 추적 주입
                $mr = Mailer::send($email, $subject, $body, ['pdo'=>$pdo, 'tenant'=>$tn, 'headers'=>['List-Unsubscribe'=>'<'.$unsubUrl.'>', 'List-Unsubscribe-Post'=>'List-Unsubscribe=One-Click']]);
                $st = (($mr['mode'] ?? '') === 'unconfigured') ? 'mock_sent' : (!empty($mr['ok']) ? 'sent' : 'failed');
                $att = (int)($row['attempts'] ?? 0) + 1;
                $finalSt = ($st === 'failed' && $att < 3) ? 'queued' : $st; // 실패 시 최대 3회 재시도
                $pdo->prepare("UPDATE email_sends SET status=:s, sent_at=:sa, attempts=:a WHERE id=:id")->execute([':s'=>$finalSt, ':sa'=>$now, ':a'=>$att, ':id'=>$row['id']]);
                if ($st === 'sent') {
                    $sent++;
                    $sentThisCycle++; // [②-3] 워밍업 한도 카운트(실발송만; mock_sent 제외)
                    try { Attribution::recordOwnedTouch($pdo, (string)$tn, 'email', $email, null, 'email:'.$cid, ['campaign'=>(string)($tpl['cname'] ?? '')]); } catch (\Throwable $e) {}
                    try { $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:uid,'email_sent','email',:data,:ca)")->execute([':t'=>$tn, ':uid'=>$uid, ':data'=>json_encode(['campaign_id'=>$cid]), ':ca'=>$now]); } catch (\Throwable $e) {}
                } elseif ($finalSt === 'failed') { $failed++; }
            }
        }
        return ['sent'=>$sent, 'failed'=>$failed, 'tenants_deferred'=>$deferredTenants];
    }

    /* ─── POST /email/bounce — ESP/MTA 바운스·스팸신고 피드백(APP_KEY HMAC 서명, fail-closed). 하드바운스/신고 자동 suppression. ─── */
    public static function bounceWebhook(Request $req, Response $res): Response {
        $raw = (string)$req->getBody();
        $sig = $req->getHeaderLine('X-Genie-Sign');
        $secret = getenv('APP_KEY') ?: '';
        if ($secret === '' || $sig === '' || !hash_equals(hash_hmac('sha256', $raw, $secret), $sig)) {
            return self::jsonRes($res, ['ok'=>false, 'error'=>'invalid signature'], 401);
        }
        $d = json_decode($raw, true);
        if (!is_array($d)) return self::jsonRes($res, ['ok'=>false, 'error'=>'bad payload'], 422);
        $events = (isset($d['events']) && is_array($d['events'])) ? $d['events'] : [$d];
        self::ensureTables(); $pdo = self::db();
        $suppressed = 0; $recorded = 0;
        foreach ($events as $ev) {
            if (!is_array($ev)) continue;
            $email = strtolower(trim((string)($ev['email'] ?? ''))); if ($email === '') continue;
            $tn = (string)($ev['tenant'] ?? ($d['tenant'] ?? '')); if ($tn === '') continue;
            $type = strtolower((string)($ev['type'] ?? 'hard'));
            $reason = substr((string)($ev['reason'] ?? $type), 0, 250);
            // 최근 발송 1건에 bounce_reason 기록(2단계 — MySQL/SQLite 공통).
            try {
                $idSt = $pdo->prepare("SELECT id FROM email_sends WHERE tenant_id=:t AND email=:e ORDER BY id DESC LIMIT 1");
                $idSt->execute([':t'=>$tn, ':e'=>$email]); $sid = $idSt->fetchColumn();
                if ($sid) { $pdo->prepare("UPDATE email_sends SET bounce_reason=:r, status='bounced' WHERE id=:id")->execute([':r'=>$reason, ':id'=>$sid]); $recorded++; }
            } catch (\Throwable $e) {}
            // 하드바운스/스팸신고/차단/수신거부 → 자동 영구 suppression.
            if (in_array($type, ['hard', 'complaint', 'spam', 'block', 'unsubscribe'], true)) {
                $sr = ($type === 'complaint' || $type === 'spam') ? 'complaint' : ($type === 'unsubscribe' ? 'unsubscribe' : 'bounce');
                self::suppress($pdo, $tn, $email, $sr, 'webhook'); $suppressed++;
            }
        }
        return self::jsonRes($res, ['ok'=>true, 'recorded'=>$recorded, 'suppressed'=>$suppressed]);
    }

    /* ─── 설정 GET/PUT ─────────────────────────────────────────────── */
    public static function getSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT * FROM email_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
        $st->execute([$tenant]);
        $row = $st->fetch(\PDO::FETCH_ASSOC);
        if ($row) { unset($row['smtp_pass'], $row['aws_secret']); }
        return self::jsonRes($res, ['ok'=>true,'settings'=>$row ?: null]);
    }

    public static function saveSettings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $exStmt = $pdo->prepare("SELECT id FROM email_settings WHERE tenant_id=? LIMIT 1");
        $exStmt->execute([$tenant]);
        $exists = $exStmt->fetch();
        $now = self::now();
        if ($exists) {
            // 191차: GET 가 smtp_pass/aws_secret 을 마스킹(미반환)하므로, 빈 값이면 기존 비밀값을 보존
            //   한다(미변경 저장 시 비밀번호 소실 방지). 비-빈 값일 때만 갱신.
            $setPass = (isset($b['smtp_pass']) && $b['smtp_pass'] !== '') ? ', smtp_pass=:pass' : '';
            $setSec  = (isset($b['aws_secret']) && $b['aws_secret'] !== '') ? ', aws_secret=:asec' : '';
            $params = [
                ':id'=>$exists['id'], ':t'=>$tenant, ':prov'=>$b['provider']??'smtp', ':host'=>$b['smtp_host']??'',
                ':port'=>(int)($b['smtp_port']??587), ':user'=>$b['smtp_user']??'',
                ':fe'=>$b['from_email']??'', ':fn'=>$b['from_name']??'',
                ':reg'=>$b['aws_region']??'', ':akey'=>$b['aws_key']??'', ':ua'=>$now,
            ];
            // 204차 P1: 테넌트 SMTP 비밀번호/AWS 시크릿 AES-256-GCM 암호화 저장(평문 갭 해소, Mailer 발송 시 복호화).
            if ($setPass !== '') $params[':pass'] = \Genie\Crypto::encrypt((string)$b['smtp_pass']);
            if ($setSec  !== '') $params[':asec'] = \Genie\Crypto::encrypt((string)$b['aws_secret']);
            $pdo->prepare("UPDATE email_settings SET provider=:prov, smtp_host=:host, smtp_port=:port,
                smtp_user=:user, from_email=:fe, from_name=:fn,
                aws_region=:reg, aws_key=:akey, updated_at=:ua{$setPass}{$setSec} WHERE id=:id AND tenant_id=:t
            ")->execute($params);
        } else {
            $pdo->prepare("INSERT INTO email_settings (tenant_id, provider, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name, aws_region, aws_key, aws_secret, updated_at)
                VALUES (:t, :prov, :host, :port, :user, :pass, :fe, :fn, :reg, :akey, :asec, :ua)
            ")->execute([
                ':t'=>$tenant, ':prov'=>$b['provider']??'smtp', ':host'=>$b['smtp_host']??'', ':port'=>(int)($b['smtp_port']??587),
                ':user'=>$b['smtp_user']??'', ':pass'=>\Genie\Crypto::encrypt((string)($b['smtp_pass']??'')), ':fe'=>$b['from_email']??'', ':fn'=>$b['from_name']??'',
                ':reg'=>$b['aws_region']??'', ':akey'=>$b['aws_key']??'', ':asec'=>\Genie\Crypto::encrypt((string)($b['aws_secret']??'')), ':ua'=>$now,
            ]);
        }
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── 템플릿 ───────────────────────────────────────────────────── */
    public static function listTemplates(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("SELECT id,name,subject,category,variables,created_at FROM email_templates WHERE tenant_id=? ORDER BY updated_at DESC");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['variables'] = json_decode($r['variables']??'[]', true); }
        return self::jsonRes($res, ['ok'=>true,'templates'=>$rows]);
    }

    public static function createTemplate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        if (empty($b['name']) || empty($b['subject']) || empty($b['html_body'])) {
            return self::jsonRes($res, ['ok'=>false,'error'=>'name, subject, html_body 필수'], 400);
        }
        $now = self::now();
        $pdo->prepare("INSERT INTO email_templates (tenant_id,name,subject,html_body,plain_body,variables,category,created_at,updated_at)
            VALUES (:t,:n,:s,:h,:p,:v,:c,:ca,:ua)")->execute([
            ':t'=>$tenant, ':n'=>$b['name'], ':s'=>$b['subject'], ':h'=>$b['html_body'],
            ':p'=>$b['plain_body']??'', ':v'=>json_encode($b['variables']??[]), ':c'=>$b['category']??'general', ':ca'=>$now, ':ua'=>$now,
        ]);
        return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    }

    public static function getTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $row = self::db()->prepare("SELECT * FROM email_templates WHERE id=:id AND tenant_id=:t");
        $row->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        $t = $row->fetch(\PDO::FETCH_ASSOC);
        if (!$t) return self::jsonRes($res, ['ok'=>false,'error'=>'없음'], 404);
        $t['variables'] = json_decode($t['variables']??'[]', true);
        return self::jsonRes($res, ['ok'=>true,'template'=>$t]);
    }

    public static function updateTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        $stmt = $pdo->prepare("UPDATE email_templates SET name=:n,subject=:s,html_body=:h,plain_body=:p,variables=:v,category=:c,updated_at=:ua WHERE id=:id AND tenant_id=:t");
        $stmt->execute([
            ':id'=>(int)$args['id'], ':t'=>$tenant, ':n'=>$b['name']??'', ':s'=>$b['subject']??'',
            ':h'=>$b['html_body']??'', ':p'=>$b['plain_body']??'', ':v'=>json_encode($b['variables']??[]), ':c'=>$b['category']??'general', ':ua'=>self::now(),
        ]);
        if ($stmt->rowCount() === 0) return self::jsonRes($res, ['ok'=>false,'error'=>'없음'], 404);
        return self::jsonRes($res, ['ok'=>true]);
    }

    public static function deleteTemplate(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        self::db()->prepare("DELETE FROM email_templates WHERE id=:id AND tenant_id=:t")->execute([':id'=>(int)$args['id'], ':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true]);
    }

    /* ─── 캠페인 ───────────────────────────────────────────────────── */
    public static function listCampaigns(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $st = self::db()->prepare("
            SELECT ec.*, et.name AS template_name, cs.name AS segment_name
            FROM email_campaigns ec
            LEFT JOIN email_templates et ON et.id=ec.template_id AND et.tenant_id=ec.tenant_id
            LEFT JOIN crm_segments cs ON cs.id=ec.segment_id AND cs.tenant_id=ec.tenant_id
            WHERE ec.tenant_id=:t ORDER BY ec.created_at DESC
        ");
        $st->execute([':t'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true,'campaigns'=>$st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function createCampaign(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)$req->getParsedBody();
        if (empty($b['name'])) return self::jsonRes($res, ['ok'=>false,'error'=>'name 필수'], 400);
        // [현 차수 P2-2b] A/B: subject_b(variant B 제목)·ab_test 플래그 수용. subject_b 있으면 자동 A/B 활성.
        $subjectB = trim((string)($b['subject_b'] ?? ''));
        $abTest = (!empty($b['ab_test']) || $subjectB !== '') ? 1 : 0;
        $pdo->prepare("INSERT INTO email_campaigns (tenant_id,name,template_id,segment_id,status,scheduled_at,subject_b,ab_test,created_at)
            VALUES (:t,:n,:tpl,:s,:st,:sc,:sb,:ab,:ca)")->execute([
            ':t'=>$tenant, ':n'=>$b['name'], ':tpl'=>(int)($b['template_id']??0),
            ':s'=>(int)($b['segment_id']??0), ':st'=>$b['status']??'draft', ':sc'=>$b['scheduled_at']??null,
            ':sb'=>($subjectB !== '' ? $subjectB : null), ':ab'=>$abTest, ':ca'=>self::now(),
        ]);
        return self::jsonRes($res, ['ok'=>true,'id'=>(int)$pdo->lastInsertId(),'ab_test'=>$abTest]);
    }

    /* ─── POST /email/campaigns/{id}/send ──────────────────────────── */
    public static function sendCampaign(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];

        $camp = $pdo->prepare("SELECT * FROM email_campaigns WHERE id=:id AND tenant_id=:t");
        $camp->execute([':id'=>$cid, ':t'=>$tenant]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);

        $template = null;
        if (!empty($campaign['template_id'])) {
            $tpl = $pdo->prepare("SELECT * FROM email_templates WHERE id=:id AND tenant_id=:t");
            $tpl->execute([':id'=>$campaign['template_id'], ':t'=>$tenant]);
            $template = $tpl->fetch(\PDO::FETCH_ASSOC);
        }

        // 대상 고객 (★테넌트 스코프 — crm_* 도 동일 테넌트만)
        $segId = (int)$campaign['segment_id'];
        // [현 차수 약점①] 발송 직전 동적 세그먼트 멤버 최신화(stale 방지). best-effort — 실패해도 발송 진행.
        if ($segId) { CRM::refreshSegmentForSend($pdo, $tenant, $segId); }
        if ($segId) {
            $cust = $pdo->prepare("SELECT c.id, c.email, c.name FROM crm_customers c
                JOIN crm_segment_members sm ON sm.customer_id=c.id AND sm.tenant_id=c.tenant_id
                WHERE sm.segment_id=:sid AND c.tenant_id=:t");
            $cust->execute([':sid'=>$segId, ':t'=>$tenant]);
        } else {
            $cust = $pdo->prepare("SELECT id, email, name FROM crm_customers WHERE tenant_id=:t");
            $cust->execute([':t'=>$tenant]);
        }
        $customerList = $cust->fetchAll(\PDO::FETCH_ASSOC);

        $sent = 0; $failed = 0; $mock = 0; $capped = 0; $suppressed = 0; $queued = 0;
        $now = self::now();
        // [240차 약점⑥] 빈도캡 — 과발송 차단(딜리버러빌리티 보호). 설정 1회 로드 후 고객별 평가.
        $freqCfg = CRM::commsFreqConfig($pdo, $tenant);
        // [현 차수] STO(발송시간 최적화) — 야간 등 차단 시간엔 즉시발송 대신 큐 적재(cron이 허용시각에 발송).
        $deferAll = !empty($freqCfg['sto']) && !CRM::commsSendAllowedNow($freqCfg);
        // [현 차수 P2-2b] A/B 테스트(제목 variant B) + 수신자별 STO(개인 최적 발송시각).
        $abTest = ((int)($campaign['ab_test'] ?? 0) === 1) && trim((string)($campaign['subject_b'] ?? '')) !== '';
        $subjectBTpl = (string)($campaign['subject_b'] ?? '');
        $stoOn = !empty($freqCfg['sto']);
        $curHourKst = (int)gmdate('G', time() + 9 * 3600);

        // ─── [255차 P1 규모/실시간] 대량 발송 비동기 배치화 ──────────────────────────────
        //   대량 오디언스는 동기 Mailer 루프(HTTP 타임아웃·확장불가)를 회피하고 email_sends 'queued' 로
        //   chunk 일괄 적재 후 즉시 반환한다. 기존 STO 큐 워커(runQueue / email_queue_cron)가 배치(LIMIT 1000)로
        //   드레인·실발송·재시도. 임계(EMAIL_ASYNC_THRESHOLD, 기본 200) 초과 또는 async=true 명시 시 활성.
        //   소량(임계 이하)은 기존 즉시 인라인 발송(저지연 UX) 유지. STO 차단시간이면 항상 큐(기존 deferAll).
        $bodyIn = (array)($req->getParsedBody() ?? []);
        $asyncThreshold = (int)(getenv('EMAIL_ASYNC_THRESHOLD') ?: 200);
        $asyncMode = !empty($bodyIn['async']) || count($customerList) > $asyncThreshold || $deferAll;
        if ($asyncMode) {
            $r = self::enqueueCampaignBatch($pdo, $tenant, $cid, $customerList, $freqCfg, $abTest, $stoOn, $deferAll, $curHourKst);
            $campStatus = ($r['queued'] > 0) ? 'scheduled' : 'sent';
            $pdo->prepare("UPDATE email_campaigns SET status=:st, sent_at=:sa, total_sent=:t WHERE id=:id AND tenant_id=:tn")
                ->execute([':st'=>$campStatus, ':sa'=>$now, ':t'=>count($customerList), ':id'=>$cid, ':tn'=>$tenant]);
            return self::jsonRes($res, array_merge(['ok'=>true, 'mode'=>'async', 'total'=>count($customerList), 'status'=>$campStatus], $r));
        }

        foreach ($customerList as $c) {
            // [현 차수] 컴플라이언스 게이트 — 수신거부/하드바운스 suppression 우선 차단(CAN-SPAM/GDPR 필수).
            if (self::isSuppressed($pdo, $tenant, (string)$c['email'])) { $suppressed++; continue; }
            if (CRM::isFrequencyCapped($pdo, $tenant, (int)$c['id'], $freqCfg['cap'], $freqCfg['window'])) { $capped++; continue; }
            // [현 차수 P2-2b] A/B variant 배정(uid 기준 결정론적 50/50). 추적 카운터로 추후 베이지안 승자판정.
            $variant = $abTest ? (((int)$c['id'] % 2 === 0) ? 'A' : 'B') : null;
            // [현 차수 P2-2b] 수신자별 STO — 과거 오픈 최빈 시각. 현재 KST 시각과 다르면 그 시각으로 defer(개인 최적발송).
            $stoHour = $stoOn ? self::optimalHourFor($pdo, $tenant, (string)$c['email']) : null;
            $deferThis = $deferAll || ($stoHour !== null && $stoHour !== $curHourKst);
            // [현 차수] STO 차단 시간/수신자 최적시각 → 큐 적재(status='queued'). cron이 허용/최적 시각에 실발송.
            if ($deferThis) {
                $pdo->prepare("INSERT INTO email_sends (tenant_id, campaign_id, customer_id, email, status, scheduled_at, sto_hour, variant) VALUES (:t,:cid,:uid,:email,'queued',:sa,:sh,:v)")
                    ->execute([':t'=>$tenant, ':cid'=>$cid, ':uid'=>$c['id'], ':email'=>$c['email'], ':sa'=>$now, ':sh'=>$stoHour, ':v'=>$variant]);
                $queued++; continue;
            }
            // [현 차수] 개인화 엔진 + 수신거부 풋터/헤더(원클릭 List-Unsubscribe — Gmail/Yahoo 대량발송 요건).
            $unsubUrl = self::unsubUrl($tenant, (string)$c['email']);
            $subjTpl = ($variant === 'B' && $subjectBTpl !== '') ? $subjectBTpl : (string)($template['subject'] ?? '');
            $subject = $template ? self::renderTemplate($subjTpl, $c) : '(제목 없음)';
            $body    = $template ? (self::renderTemplate((string)($template['html_body']??''), $c, ['unsubscribe_url'=>$unsubUrl]) . self::unsubFooter($unsubUrl)) : '';
            $body    = self::injectTracking($body, (int)$cid, (int)($c['id'] ?? 0)); // [현 차수 P2-2b] 오픈/클릭 추적 주입

            // 실발송 — 테넌트 email_settings SMTP(Mailer). 미설정 시 honest mock_sent.
            $mr = Mailer::send((string)$c['email'], $subject, $body, ['pdo'=>$pdo, 'tenant'=>$tenant,
                'headers'=>['List-Unsubscribe'=>'<'.$unsubUrl.'>', 'List-Unsubscribe-Post'=>'List-Unsubscribe=One-Click']]);
            if (($mr['mode']??'') === 'unconfigured') { $status='mock_sent'; $mock++; }
            elseif (!empty($mr['ok'])) { $status='sent'; $sent++; }
            else { $status='failed'; $failed++; }

            $pdo->prepare("INSERT INTO email_sends (tenant_id, campaign_id, customer_id, email, status, sent_at, variant) VALUES (:t,:cid,:uid,:email,:st,:sa,:v)")
                ->execute([':t'=>$tenant, ':cid'=>$cid, ':uid'=>$c['id'], ':email'=>$c['email'], ':st'=>$status, ':sa'=>$now, ':v'=>$variant]);
            // CRM 활동 기록 (테넌트 스코프)
            $pdo->prepare("INSERT INTO crm_activities (tenant_id, customer_id, type, channel, data, created_at) VALUES (:t,:uid,'email_sent','email',:data,:ca)")
                ->execute([':t'=>$tenant, ':uid'=>$c['id'], ':data'=>json_encode(['campaign_id'=>$cid,'campaign_name'=>$campaign['name'],'subject'=>$subject]), ':ca'=>$now]);
            // [240차 약점②] 오운드채널 어트리뷰션 — 실발송 이메일 터치 적재(주문 시 order_id 백필 → 캠페인 매출 멀티터치 귀속).
            if ($status === 'sent') { try { Attribution::recordOwnedTouch($pdo, $tenant, 'email', (string)$c['email'], null, 'email:'.$cid, ['campaign'=>(string)($campaign['name']??'')]); } catch (\Throwable $e) {} }
        }

        $total = count($customerList);
        // [현 차수] STO로 큐 적재된 경우 'scheduled', 그 외 'sent'.
        $campStatus = ($queued > 0 && $sent === 0 && $mock === 0) ? 'scheduled' : 'sent';
        $pdo->prepare("UPDATE email_campaigns SET status=:st, sent_at=:sa, total_sent=:t WHERE id=:id AND tenant_id=:tn")
            ->execute([':st'=>$campStatus, ':sa'=>$now, ':t'=>$total, ':id'=>$cid, ':tn'=>$tenant]);
        return self::jsonRes($res, ['ok'=>true,'total'=>$total,'sent'=>$sent,'mock_sent'=>$mock,'failed'=>$failed,'frequency_capped'=>$capped,'suppressed'=>$suppressed,'queued'=>$queued,'status'=>$campStatus]);
    }

    /**
     * [255차 P1 규모/실시간] 대량 발송 비동기 배치 적재 — email_sends 'queued' chunk INSERT.
     *   suppression/freq-cap 게이트를 per-row 쿼리(O(N)) 대신 사전 일괄조회(set/map, O(1) 쿼리)로 평가해
     *   대량(수만건)에서도 빠르게 큐잉(동기 SMTP 루프 회피). variant(A/B)·sto_hour(개인 최적시각) 부여.
     *   즉시발송 큐(sto_hour=NULL)는 runQueue 가 다음 cron 사이클에 배치 드레인. 전부 테넌트 스코프.
     *   @return array{queued:int,suppressed:int,frequency_capped:int}
     */
    private static function enqueueCampaignBatch(\PDO $pdo, string $tenant, int $cid, array $customerList,
        array $freqCfg, bool $abTest, bool $stoOn, bool $deferAll, int $curHourKst): array
    {
        $now = self::now();
        // 1) suppression 일괄(테넌트 전체 1쿼리) → 소문자 set.
        $supp = [];
        try {
            $ss = $pdo->prepare("SELECT email FROM email_suppression WHERE tenant_id=:t");
            $ss->execute([':t'=>$tenant]);
            foreach ($ss->fetchAll(\PDO::FETCH_COLUMN) as $e) { $supp[strtolower(trim((string)$e))] = true; }
        } catch (\Throwable $e) {}
        // 2) freq-cap 일괄(윈도 내 발송 누계 1쿼리) → customer_id 별 count map.
        $capMap = []; $cap = (int)($freqCfg['cap'] ?? 4); $win = (int)($freqCfg['window'] ?? 7);
        if ($cap > 0) {
            try {
                $cutoff = gmdate('Y-m-d H:i:s', time() - max(1, $win) * 86400);
                $cs = $pdo->prepare("SELECT customer_id, COUNT(*) AS cnt FROM crm_activities
                    WHERE tenant_id=:t AND type IN ('email_sent','kakao_sent','sms_sent','whatsapp_sent') AND created_at >= :c GROUP BY customer_id");
                $cs->execute([':t'=>$tenant, ':c'=>$cutoff]);
                foreach ($cs->fetchAll(\PDO::FETCH_ASSOC) as $r) { $capMap[(int)$r['customer_id']] = (int)$r['cnt']; }
            } catch (\Throwable $e) {}
        }
        $queued = 0; $suppressed = 0; $capped = 0;
        $rows = [];
        foreach ($customerList as $c) {
            $email = strtolower(trim((string)($c['email'] ?? '')));
            if ($email === '' || isset($supp[$email])) { $suppressed++; continue; }
            if ($cap > 0 && ($capMap[(int)$c['id']] ?? 0) >= $cap) { $capped++; continue; }
            $variant = $abTest ? (((int)$c['id'] % 2 === 0) ? 'A' : 'B') : null;
            // STO on: 개인 최적시각(과거 오픈 최빈). deferAll(차단시간)인데 STO off 면 sto_hour=NULL → 다음 사이클 즉시.
            $stoHour = $stoOn ? self::optimalHourFor($pdo, $tenant, (string)$c['email']) : null;
            $rows[] = [$tenant, $cid, (int)$c['id'], (string)$c['email'], $stoHour, $variant, $now];
            $queued++;
        }
        // 3) chunk multi-row INSERT(드라이버 placeholder 한계 회피 — 200행/쿼리, 7컬럼).
        foreach (array_chunk($rows, 200) as $chunk) {
            $flat = [];
            foreach ($chunk as $r) { array_push($flat, $r[0], $r[1], $r[2], $r[3], $r[4], $r[5], $r[6]); }
            try {
                $pdo->prepare("INSERT INTO email_sends (tenant_id, campaign_id, customer_id, email, sto_hour, variant, scheduled_at, status)
                    VALUES " . implode(',', array_map(fn($p)=>'(?,?,?,?,?,?,?,\'queued\')', $chunk)))->execute($flat);
            } catch (\Throwable $e) { /* chunk 실패는 다음 chunk 진행(부분 적재) */ }
        }
        return ['queued'=>$queued, 'suppressed'=>$suppressed, 'frequency_capped'=>$capped];
    }

    /**
     * [255차 옴니채널] per-recipient 이메일 발송 프리미티브(Omnichannel 워커 재사용).
     *   suppression 게이트 + 개인화 렌더 + List-Unsubscribe 헤더/풋터 + Mailer. 테넌트 SMTP 미설정 시
     *   Mailer 가 mock(graceful, 에러 없음) → register-then-execute. 발송 활동 기록은 호출측(워커)이 수행.
     * @return array{ok:bool,status:string} status: sent|mock_sent|failed|suppressed
     */
    public static function omniSend(\PDO $pdo, string $tenant, string $email, string $name, string $subjectTpl, string $htmlTpl): array
    {
        $email = trim($email);
        if ($email === '') return ['ok'=>false, 'status'=>'failed'];
        if (self::isSuppressed($pdo, $tenant, $email)) return ['ok'=>false, 'status'=>'suppressed'];
        $cust = ['email'=>$email, 'name'=>$name];
        $unsubUrl = self::unsubUrl($tenant, $email);
        $subject = self::renderTemplate($subjectTpl !== '' ? $subjectTpl : '(제목 없음)', $cust);
        $body    = self::renderTemplate($htmlTpl, $cust, ['unsubscribe_url'=>$unsubUrl]) . self::unsubFooter($unsubUrl);
        $mr = Mailer::send($email, $subject, $body, ['pdo'=>$pdo, 'tenant'=>$tenant,
            'headers'=>['List-Unsubscribe'=>'<'.$unsubUrl.'>', 'List-Unsubscribe-Post'=>'List-Unsubscribe=One-Click']]);
        if (($mr['mode'] ?? '') === 'unconfigured') return ['ok'=>true, 'status'=>'mock_sent'];
        return !empty($mr['ok']) ? ['ok'=>true, 'status'=>'sent'] : ['ok'=>false, 'status'=>'failed'];
    }

    /* ─── [현 차수 P2-2b] GET /email/campaigns/{id}/ab-result — A/B variant 오픈율 베이지안 자동승자 ─── */
    public static function abResult(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $cid = (int)$args['id'];
        $st = $pdo->prepare("SELECT variant, COUNT(*) AS sent,
            SUM(CASE WHEN opened_at IS NOT NULL AND opened_at<>'' THEN 1 ELSE 0 END) AS opened,
            SUM(CASE WHEN clicked_at IS NOT NULL AND clicked_at<>'' THEN 1 ELSE 0 END) AS clicked
            FROM email_sends WHERE tenant_id=:t AND campaign_id=:c AND variant IN ('A','B') GROUP BY variant");
        $st->execute([':t'=>$tenant, ':c'=>$cid]);
        $V = ['A'=>['sent'=>0,'opened'=>0,'clicked'=>0,'converted'=>0,'revenue'=>0.0], 'B'=>['sent'=>0,'opened'=>0,'clicked'=>0,'converted'=>0,'revenue'=>0.0]];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) { $v=(string)$r['variant']; if (isset($V[$v])) { $V[$v]['sent']=(int)$r['sent']; $V[$v]['opened']=(int)$r['opened']; $V[$v]['clicked']=(int)$r['clicked']; } }
        // [254차 초고도화] 전환/매출 기반 A/B — 수신자(email) → 주문(channel_orders.buyer_email) 발송 후 매칭(취소제외).
        try {
            $cs = $pdo->prepare("SELECT s.variant AS variant, COUNT(DISTINCT LOWER(s.email)) AS cnt, COALESCE(SUM(o.total_price),0) AS rev
                FROM email_sends s JOIN channel_orders o ON o.tenant_id=s.tenant_id AND LOWER(o.buyer_email)=LOWER(s.email)
                    AND (s.sent_at IS NULL OR o.ordered_at >= s.sent_at) AND COALESCE(o.event_type,'order') NOT IN ('cancel','return')
                WHERE s.tenant_id=:t AND s.campaign_id=:c AND s.variant IN ('A','B') AND s.email IS NOT NULL AND s.email<>'' GROUP BY s.variant");
            $cs->execute([':t'=>$tenant, ':c'=>$cid]);
            foreach ($cs->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) { $v=(string)$r['variant']; if (isset($V[$v])) { $V[$v]['converted']=min((int)$r['cnt'], $V[$v]['sent']); $V[$v]['revenue']=round((float)$r['rev'],2); } }
        } catch (\Throwable $e) {}
        // metric: open(기본·하위호환) | click | conversion. 승자판정 지표 선택.
        $metric = in_array(($req->getQueryParams()['metric'] ?? 'open'), ['open','click','conversion'], true) ? (string)($req->getQueryParams()['metric']) : 'open';
        $sk = $metric==='click' ? 'clicked' : ($metric==='conversion' ? 'converted' : 'opened');
        $orA = $V['A']['sent']>0 ? $V['A']['opened']/$V['A']['sent'] : 0.0;
        $orB = $V['B']['sent']>0 ? $V['B']['opened']/$V['B']['sent'] : 0.0;
        $probBbest = self::betaBestProb($V['B'][$sk], $V['B']['sent'], $V['A'][$sk], $V['A']['sent']);
        $winner = null;
        if ($V['A']['sent'] >= 50 && $V['B']['sent'] >= 50) { // 최소 표본 게이트
            if ($probBbest >= 0.95) $winner = 'B'; elseif ($probBbest <= 0.05) $winner = 'A';
        }
        if ($winner) { try { $pdo->prepare("UPDATE email_campaigns SET ab_winner=:w WHERE id=:c AND tenant_id=:t")->execute([':w'=>$winner, ':c'=>$cid, ':t'=>$tenant]); } catch (\Throwable $e) {} }
        $metricLabel = $metric==='click' ? '클릭률' : ($metric==='conversion' ? '전환율' : '오픈율');
        return self::jsonRes($res, ['ok'=>true, 'metric'=>$metric,
            'variants'=>['A'=>$V['A']+['open_rate'=>round($orA*100,2),'conv_rate'=>$V['A']['sent']>0?round($V['A']['converted']/$V['A']['sent']*100,2):0], 'B'=>$V['B']+['open_rate'=>round($orB*100,2),'conv_rate'=>$V['B']['sent']>0?round($V['B']['converted']/$V['B']['sent']*100,2):0]],
            'prob_b_best'=>round($probBbest*100,1), 'winner'=>$winner, 'confidence'=>round(max($probBbest,1-$probBbest)*100,1),
            'verdict'=>$winner ? "승자: variant {$winner} ({$metricLabel} 기준·95% 신뢰수준)" : "아직 유의한 승자 없음({$metricLabel}) — 표본/기간 확대 필요"]);
    }
    /** Beta(s+1,n-s+1) 사후 P(B>A) 정규근사 — 오픈율 A/B 승자 확률. */
    private static function betaBestProb(int $sB, int $nB, int $sA, int $nA): float {
        $mA=($sA+1)/($nA+2); $vA=$mA*(1-$mA)/($nA+3);
        $mB=($sB+1)/($nB+2); $vB=$mB*(1-$mB)/($nB+3);
        $sd=sqrt($vA+$vB); if ($sd<=0) return 0.5;
        return self::stdNormCdf(($mB-$mA)/$sd);
    }
    private static function stdNormCdf(float $x): float {
        $t=1/(1+0.2316419*abs($x)); $d=0.3989422804014327*exp(-$x*$x/2);
        $p=$d*$t*(0.319381530+$t*(-0.356563782+$t*(1.781477937+$t*(-1.821255978+$t*1.330274429))));
        return $x>0 ? 1-$p : $p;
    }

    /* ─── GET /email/campaigns/{id}/stats ──────────────────────────── */
    public static function campaignStats(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $cid = (int)$args['id'];
        $camp = $pdo->prepare("SELECT * FROM email_campaigns WHERE id=:id AND tenant_id=:t");
        $camp->execute([':id'=>$cid, ':t'=>$tenant]);
        $campaign = $camp->fetch(\PDO::FETCH_ASSOC);
        if (!$campaign) return self::jsonRes($res, ['ok'=>false,'error'=>'캠페인 없음'], 404);

        $sends = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM email_sends WHERE campaign_id=:cid AND tenant_id=:t GROUP BY status");
        $sends->execute([':cid'=>$cid, ':t'=>$tenant]);
        $byStatus = $sends->fetchAll(\PDO::FETCH_KEY_PAIR);

        $total = array_sum($byStatus);
        // [현 차수] M2: mock_sent(SMTP 미설정 시뮬레이션)를 실 발송(sent)에 합산하지 않고 분리 표기 — KPI 정직.
        $sent     = (int)($byStatus['sent']??0);
        $mockSent = (int)($byStatus['mock_sent']??0);
        $open  = (int)($campaign['opened']??0);
        $click = (int)($campaign['clicked']??0);

        return self::jsonRes($res, [
            'ok'=>true,'campaign'=>$campaign,
            'stats'=>['total'=>$total,'sent'=>$sent,'mock_sent'=>$mockSent,'failed'=>$byStatus['failed']??0,
                      'open_rate'=>$total>0?round($open/$total*100,2):0,
                      'click_rate'=>$total>0?round($click/$total*100,2):0],
            'by_status'=>$byStatus,
        ]);
    }

    /**
     * [R-P2-4] GET /email/deliverability — 테넌트 전체 딜리버러빌리티 건강도.
     *   캠페인별 통계(campaignStats)는 있으나 테넌트 전체 바운스율·컴플레인율·발신자 평판등급 집계가 부재했음.
     *   email_sends(status)·email_suppression(reason)·open/click 집계 + 업계 임계치 기반 평판등급(good/warning/at-risk)
     *   + 발신 도메인 SPF/DMARC DNS 실측. 전부 실DB 파생(날조 0). Klaviyo급 딜리버러빌리티 가시성.
     */
    public static function deliverabilityHealth(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $tenant = self::tenant($req);
        $days = max(1, min(365, (int)($req->getQueryParams()['window'] ?? 90)));
        return self::jsonRes($res, ['ok'=>true, 'window_days'=>$days] + self::computeDeliverability(self::db(), $tenant, $days));
    }

    /**
     * [차기 P2] 딜리버러빌리티 지표 계산 코어 — 엔드포인트 + 일별 스냅샷 cron 공용(중복 0).
     * @return array ['volume','rates','reputation','domain_auth','advice']
     */
    public static function computeDeliverability(\PDO $pdo, string $tenant, int $days): array
    {
        $since = gmdate('c', time() - $days * 86400);

        // 발송 상태 집계(window: sent_at). real_sent=sent(mock 제외 — 정직).
        $byStatus = [];
        try {
            $st = $pdo->prepare("SELECT status, COUNT(*) cnt FROM email_sends WHERE tenant_id=:t AND (sent_at IS NULL OR sent_at>=:s) GROUP BY status");
            $st->execute([':t'=>$tenant, ':s'=>$since]);
            $byStatus = $st->fetchAll(\PDO::FETCH_KEY_PAIR) ?: [];
        } catch (\Throwable $e) {}
        $sent     = (int)($byStatus['sent'] ?? 0);
        $bounced  = (int)($byStatus['bounced'] ?? 0);
        $failed   = (int)($byStatus['failed'] ?? 0);
        $mockSent = (int)($byStatus['mock_sent'] ?? 0);
        $accepted = $sent + $bounced; // MTA 수락 시도(실발송 모수)

        // open/click(실발송 기준).
        $opens = 0; $clicks = 0;
        try {
            $o = $pdo->prepare("SELECT COUNT(*) FROM email_sends WHERE tenant_id=:t AND opened_at IS NOT NULL AND (sent_at IS NULL OR sent_at>=:s)");
            $o->execute([':t'=>$tenant, ':s'=>$since]); $opens = (int)$o->fetchColumn();
            $c = $pdo->prepare("SELECT COUNT(*) FROM email_sends WHERE tenant_id=:t AND clicked_at IS NOT NULL AND (sent_at IS NULL OR sent_at>=:s)");
            $c->execute([':t'=>$tenant, ':s'=>$since]); $clicks = (int)$c->fetchColumn();
        } catch (\Throwable $e) {}

        // suppression(컴플레인/수신거부) 집계 — window: created_at.
        $supp = [];
        try {
            $s2 = $pdo->prepare("SELECT reason, COUNT(*) cnt FROM email_suppression WHERE tenant_id=:t AND (created_at IS NULL OR created_at>=:s) GROUP BY reason");
            $s2->execute([':t'=>$tenant, ':s'=>$since]);
            $supp = $s2->fetchAll(\PDO::FETCH_KEY_PAIR) ?: [];
        } catch (\Throwable $e) {}
        $complaints = (int)($supp['complaint'] ?? 0);
        $unsubs     = (int)($supp['unsubscribe'] ?? 0);

        $pct = fn($num, $den) => $den > 0 ? round($num / $den * 100, 3) : 0.0;
        $bounceRate    = $pct($bounced, $accepted);
        $complaintRate = $pct($complaints, max(1, $sent));
        $unsubRate     = $pct($unsubs, max(1, $sent));
        $deliveryRate  = $pct($sent, $accepted);
        $openRate      = $pct($opens, max(1, $sent));
        $clickRate     = $pct($clicks, max(1, $sent));

        // 업계 임계치 기반 평판등급(최악 컴포넌트). complaint: <0.1 good/<0.5 warn/else risk. bounce: <2 good/<5 warn/else risk.
        $gradeOf = function (float $v, float $good, float $warn): string { return $v < $good ? 'good' : ($v < $warn ? 'warning' : 'at-risk'); };
        $cg = $gradeOf($complaintRate, 0.1, 0.5);
        $bg = $gradeOf($bounceRate, 2.0, 5.0);
        $rank = ['good'=>0, 'warning'=>1, 'at-risk'=>2];
        $overall = $rank[$cg] >= $rank[$bg] ? $cg : $bg;
        // 평판 스코어(100 만점): 바운스/컴플레인 페널티.
        $repScore = (int)round(max(0, 100 - min(60, $bounceRate * 8) - min(40, $complaintRate * 80)));

        // 발신 도메인 인증(SPF/DMARC) DNS 실측 — from_email 도메인 기준.
        $domainAuth = ['domain'=>null, 'spf'=>null, 'dmarc'=>null];
        try {
            $fs = $pdo->prepare("SELECT from_email FROM email_settings WHERE tenant_id=:t ORDER BY id DESC LIMIT 1");
            $fs->execute([':t'=>$tenant]); $from = (string)$fs->fetchColumn();
            $dom = (strpos($from, '@') !== false) ? strtolower(trim(substr(strrchr($from, '@'), 1))) : '';
            if ($dom !== '' && preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/', $dom)) {
                $domainAuth['domain'] = $dom;
                if (function_exists('dns_get_record')) {
                    $txt = @dns_get_record($dom, DNS_TXT) ?: [];
                    $hasSpf = false; foreach ($txt as $r) { if (stripos((string)($r['txt'] ?? ''), 'v=spf1') !== false) { $hasSpf = true; break; } }
                    $dmarc = @dns_get_record('_dmarc.' . $dom, DNS_TXT) ?: [];
                    $hasDmarc = false; foreach ($dmarc as $r) { if (stripos((string)($r['txt'] ?? ''), 'v=DMARC1') !== false) { $hasDmarc = true; break; } }
                    $domainAuth['spf'] = $hasSpf; $domainAuth['dmarc'] = $hasDmarc;
                }
            }
        } catch (\Throwable $e) {}

        // 권고(최우선 1건).
        $advice = $overall === 'at-risk'
            ? ($bg === 'at-risk' ? '바운스율이 높습니다 — 리스트 위생(하드바운스 제거)·이중옵트인을 적용하세요.' : '스팸 신고율이 높습니다 — 발송 빈도·세그먼트 적합성을 점검하세요.')
            : ($overall === 'warning' ? '평판이 주의 구간입니다 — 비활성 수신자 제외·콘텐츠 품질을 개선하세요.'
            : ($domainAuth['domain'] && ($domainAuth['spf'] === false || $domainAuth['dmarc'] === false) ? 'SPF/DMARC DNS 레코드를 설정하면 도달률이 더 향상됩니다.' : '딜리버러빌리티 양호 — 현 발송 위생을 유지하세요.'));

        return [
            'volume'=>['accepted'=>$accepted, 'sent'=>$sent, 'bounced'=>$bounced, 'failed'=>$failed, 'mock_sent'=>$mockSent, 'complaints'=>$complaints, 'unsubscribes'=>$unsubs],
            'rates'=>['delivery_rate'=>$deliveryRate, 'bounce_rate'=>$bounceRate, 'complaint_rate'=>$complaintRate, 'unsubscribe_rate'=>$unsubRate, 'open_rate'=>$openRate, 'click_rate'=>$clickRate],
            'reputation'=>['grade'=>$overall, 'score'=>$repScore, 'bounce_grade'=>$bg, 'complaint_grade'=>$cg],
            'domain_auth'=>$domainAuth,
            'advice'=>$advice,
        ];
    }

    /** [차기 P2] 일별 평판 시계열 테이블(테넌트 격리·날짜 멱등). */
    private static function ensureReputationTable(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            $pdo->exec($isMy
                ? "CREATE TABLE IF NOT EXISTS email_reputation_daily (tenant_id VARCHAR(100) NOT NULL, date VARCHAR(10) NOT NULL, sent INT DEFAULT 0, bounced INT DEFAULT 0, complaints INT DEFAULT 0, unsubscribes INT DEFAULT 0, opens INT DEFAULT 0, clicks INT DEFAULT 0, bounce_rate DOUBLE DEFAULT 0, complaint_rate DOUBLE DEFAULT 0, open_rate DOUBLE DEFAULT 0, click_rate DOUBLE DEFAULT 0, rep_score INT DEFAULT 0, grade VARCHAR(12), PRIMARY KEY(tenant_id,date)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                : "CREATE TABLE IF NOT EXISTS email_reputation_daily (tenant_id TEXT NOT NULL, date TEXT NOT NULL, sent INTEGER DEFAULT 0, bounced INTEGER DEFAULT 0, complaints INTEGER DEFAULT 0, unsubscribes INTEGER DEFAULT 0, opens INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, bounce_rate REAL DEFAULT 0, complaint_rate REAL DEFAULT 0, open_rate REAL DEFAULT 0, click_rate REAL DEFAULT 0, rep_score INTEGER DEFAULT 0, grade TEXT, PRIMARY KEY(tenant_id,date))");
        } catch (\Throwable $e) { /* graceful */ }
    }

    /**
     * [차기 P2] 일별 평판 스냅샷(cron) — 7일 롤링 지표를 당일자로 email_reputation_daily 에 멱등 upsert.
     *   Google Postmaster 식 롤링 평판 추세. computeDeliverability 재사용(중복 0).
     */
    /** 딜리버러빌리티 등급 서열(악화 판정용). good < warning < at-risk. */
    public static function gradeRank(string $g): int
    {
        $g = strtolower(str_replace('_', '-', trim($g)));
        return ['good' => 0, 'warning' => 1, 'at-risk' => 2, 'atrisk' => 2][$g] ?? 0;
    }

    public static function snapshotReputation(string $t): array
    {
        self::ensureTables(); $pdo = self::db(); self::ensureReputationTable($pdo);
        $d = self::computeDeliverability($pdo, $t, 7); // 7일 롤링
        $v = $d['volume']; $r = $d['rates']; $rep = $d['reputation'];
        $date = gmdate('Y-m-d');
        // [P5 리텐션] 직전 스냅샷 등급(악화 경보 비교용) — 당일자 제외 최신 1건.
        $prevGrade = '';
        try { $pg = $pdo->prepare("SELECT grade FROM email_reputation_daily WHERE tenant_id=? AND date<? ORDER BY date DESC LIMIT 1"); $pg->execute([$t, $date]); $prevGrade = (string)($pg->fetchColumn() ?: ''); } catch (\Throwable $e) {}
        $cols = [$t, $date, (int)$v['sent'], (int)$v['bounced'], (int)$v['complaints'], (int)$v['unsubscribes'],
                 0, 0, (float)$r['bounce_rate'], (float)$r['complaint_rate'], (float)$r['open_rate'], (float)$r['click_rate'],
                 (int)$rep['score'], (string)$rep['grade']];
        // opens/clicks 카운트는 rate 로부터 역산 불필요 — sent×rate. 별도 저장 생략(rate 보존).
        try {
            $up = $pdo->prepare("UPDATE email_reputation_daily SET sent=?,bounced=?,complaints=?,unsubscribes=?,bounce_rate=?,complaint_rate=?,open_rate=?,click_rate=?,rep_score=?,grade=? WHERE tenant_id=? AND date=?");
            $up->execute([(int)$v['sent'],(int)$v['bounced'],(int)$v['complaints'],(int)$v['unsubscribes'],(float)$r['bounce_rate'],(float)$r['complaint_rate'],(float)$r['open_rate'],(float)$r['click_rate'],(int)$rep['score'],(string)$rep['grade'],$t,$date]);
            if ($up->rowCount() === 0) {
                $pdo->prepare("INSERT INTO email_reputation_daily(tenant_id,date,sent,bounced,complaints,unsubscribes,opens,clicks,bounce_rate,complaint_rate,open_rate,click_rate,rep_score,grade) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")->execute($cols);
            }
        } catch (\Throwable $e) { return ['ok'=>false, 'error'=>$e->getMessage()]; }
        // [P5 리텐션] 딜리버러빌리티 악화 경보 — 등급이 직전보다 나빠졌을 때 1회 알림(Alerting 재사용, 발송량 0이면 생략).
        //   스팸 방지: 매일 발송이 아니라 "등급 하락 전이" 시에만. 발송량(sent+bounced) 충분 시에만(저표본 노이즈 제거).
        $alerted = false;
        try {
            $curRank = self::gradeRank((string)$rep['grade']);
            $accepted = (int)$v['sent'] + (int)$v['bounced'];
            if ($prevGrade !== '' && $curRank > self::gradeRank($prevGrade) && $curRank >= 2 && $accepted >= 50) {
                \Genie\Handlers\Alerting::pushEvent($t, 'high', '이메일 딜리버러빌리티 경보',
                    "발신자 평판 등급이 '{$prevGrade}' → '{$rep['grade']}' 로 악화되었습니다. 리스트 위생·발송 빈도·콘텐츠를 점검하세요.",
                    [['label' => '평판점수', 'value' => (int)$rep['score']],
                     ['label' => '바운스율', 'value' => round((float)$r['bounce_rate'], 2) . '%'],
                     ['label' => '스팸신고율', 'value' => round((float)$r['complaint_rate'], 3) . '%']]);
                $alerted = true;
            }
        } catch (\Throwable $e) { /* 경보 실패는 스냅샷 성공에 무영향 */ }
        return ['ok'=>true, 'date'=>$date, 'rep_score'=>(int)$rep['score'], 'grade'=>(string)$rep['grade'],
                'prev_grade'=>$prevGrade, 'degraded_alert'=>$alerted];
    }

    /** [차기 P2] GET /email/deliverability/history?days=90 — 평판 시계열(EmailMarketing>Analytics 탭 차트). */
    public static function deliverabilityHistory(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables(); $pdo = self::db(); self::ensureReputationTable($pdo);
        $t = self::tenant($req);
        $days = max(7, min(365, (int)($req->getQueryParams()['days'] ?? 90)));
        $since = gmdate('Y-m-d', time() - $days * 86400);
        $rows = [];
        try {
            $st = $pdo->prepare("SELECT date,sent,bounced,complaints,unsubscribes,bounce_rate,complaint_rate,open_rate,click_rate,rep_score,grade FROM email_reputation_daily WHERE tenant_id=? AND date>=? ORDER BY date ASC");
            $st->execute([$t, $since]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        // 현재 스냅샷(오늘) 동반 — 아직 cron 이 안 돈 경우에도 최신 1점 보장.
        $cur = self::computeDeliverability($pdo, $t, 7);
        return self::jsonRes($res, [
            'ok'=>true, 'days'=>$days, 'series'=>$rows,
            'current'=>['rep_score'=>(int)$cur['reputation']['score'], 'grade'=>(string)$cur['reputation']['grade'],
                        'bounce_rate'=>(float)$cur['rates']['bounce_rate'], 'complaint_rate'=>(float)$cur['rates']['complaint_rate'],
                        'open_rate'=>(float)$cur['rates']['open_rate']],
            'note'=>count($rows)===0 ? '평판 시계열은 일별 스냅샷 cron 누적 후 표시됩니다(현재값은 7일 롤링).' : null,
        ]);
    }

    /** [차기 P2] 이메일 발송 이력 보유 테넌트(스냅샷 cron 팬아웃용). */
    public static function tenantsWithEmail(): array
    {
        try {
            $rs = self::db()->query("SELECT DISTINCT tenant_id FROM email_sends WHERE tenant_id IS NOT NULL AND tenant_id<>''");
            return array_values(array_filter(array_map('strval', $rs->fetchAll(\PDO::FETCH_COLUMN) ?: []), fn($t)=>$t!==''));
        } catch (\Throwable $e) { return []; }
    }

    /* ─── POST /email/track/open — 공개 비콘(세션 없음). campaign+customer 로 자연 스코프 ── */
    public static function trackOpen(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $cid = (int)($b['campaign_id']??0); $uid = (int)($b['customer_id']??0);
        // 204차 P2: 공개 비콘이라 campaign_id/customer_id 가 추측가능 → 과거엔 누구나 타 테넌트 열람수를
        //   부풀리고 반복 호출로 중복 카운트할 수 있었다. ① send 를 미오픈→오픈 전이할 때만 갱신(멱등),
        //   ② campaign 카운터는 그 send 의 tenant 로만 증가(교차테넌트 오염 차단). 유효 (campaign,customer)
        //   쌍이 실제 존재해야만 1회 반영된다.
        $upd = $pdo->prepare("UPDATE email_sends SET opened_at=:oa, status='opened'
            WHERE campaign_id=:cid AND customer_id=:uid AND (opened_at IS NULL OR status<>'opened')");
        $upd->execute([':oa'=>self::now(), ':cid'=>$cid, ':uid'=>$uid]);
        if ($upd->rowCount() > 0) {
            $pdo->prepare("UPDATE email_campaigns SET opened=opened+1
                WHERE id=:cid AND tenant_id=(SELECT tenant_id FROM email_sends WHERE campaign_id=:cid2 AND customer_id=:uid LIMIT 1)")
                ->execute([':cid'=>$cid, ':cid2'=>$cid, ':uid'=>$uid]);
        }
        $res->getBody()->write('{"ok":true}');
        return $res->withHeader('Content-Type','application/json');
    }

    /* ─── POST /email/track/click — 공개 비콘(세션 없음). 클릭=강한 engagement 신호 ──
     *   trackOpen 과 동일한 멱등/교차테넌트 차단 패턴(204차 P2). 추가로 [현 차수 약점③]:
     *   클릭은 가장 강한 오운드 engagement → 발송시점 크레딧만이던 어트리뷰션에 클릭 engagement 터치를
     *   강화 적재(send 의 email 해시 own:<hash> 로 기존 발송 터치와 정합). 주문 시 백필이 이 강화 터치도 귀속.
     *   click 은 open 보다 강하므로 status='clicked' 로 전이(opened 도 동반 set). */
    public static function trackClick(Request $req, Response $res): Response
    {
        self::ensureTables();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $cid = (int)($b['campaign_id']??0); $uid = (int)($b['customer_id']??0);
        // 멱등: 미클릭→클릭 전이할 때만 갱신(공개 비콘 반복 호출 중복 카운트 차단). opened_at 도 함께 보정.
        $now = self::now();
        $upd = $pdo->prepare("UPDATE email_sends SET clicked_at=:ca, opened_at=COALESCE(opened_at,:oa), status='clicked'
            WHERE campaign_id=:cid AND customer_id=:uid AND (clicked_at IS NULL OR status<>'clicked')");
        $upd->execute([':ca'=>$now, ':oa'=>$now, ':cid'=>$cid, ':uid'=>$uid]);
        if ($upd->rowCount() > 0) {
            // 캠페인 카운터는 해당 send 의 tenant 로만 증가(교차테넌트 오염 차단). open 미집계 시 동반 보정.
            $row = $pdo->prepare("SELECT tenant_id, email FROM email_sends WHERE campaign_id=:cid AND customer_id=:uid LIMIT 1");
            $row->execute([':cid'=>$cid, ':uid'=>$uid]);
            $send = $row->fetch(\PDO::FETCH_ASSOC);
            if ($send) {
                $tn = (string)$send['tenant_id'];
                $pdo->prepare("UPDATE email_campaigns SET clicked=clicked+1 WHERE id=:cid AND tenant_id=:t")
                    ->execute([':cid'=>$cid, ':t'=>$tn]);
                // [현 차수 약점③] 클릭 engagement 어트리뷰션 — 강화 오운드 터치 적재(발송 own:hash 와 정합).
                //   발송실패에 영향 없도록 예외 무해. 주문 ingest 시 backfillOwnedTouches 가 order_id 백필.
                try {
                    Attribution::recordOwnedTouch($pdo, $tn, 'email', (string)($send['email']??''), null, 'email:'.$cid,
                        ['campaign_id'=>$cid, 'engagement'=>'click', 'clicked'=>true]);
                } catch (\Throwable $e) {}
            }
        }
        $res->getBody()->write('{"ok":true}');
        return $res->withHeader('Content-Type','application/json');
    }

    /* ════════ [현 차수 P2-2b] 임베드 오픈/클릭 추적 — 발송 HTML 주입 + GET 비콘(픽셀·리다이렉트). ════════ */

    private static function publicBase(): string {
        $b = getenv('APP_PUBLIC_URL');
        if ($b) return rtrim($b, '/');
        return (Db::env() === 'demo') ? 'https://roidemo.genie-go.com' : 'https://roi.genie-go.com';
    }

    /** 발송 HTML 에 오픈 추적 픽셀 + 클릭 추적 링크리라이팅 주입(기존엔 미주입→추적 카운터 0이던 갭 해소).
     *   unsubscribe/이미 추적 링크는 제외. cid≤0 이면 미주입. */
    public static function injectTracking(string $html, int $cid, int $uid): string {
        if ($cid <= 0) return $html;
        $base = self::publicBase();
        $html = preg_replace_callback('/href=("|\')(https?:\/\/[^"\']+)\1/i', function ($m) use ($base, $cid, $uid) {
            $url = $m[2];
            if (strpos($url, '/email/track/') !== false || strpos($url, '/email/unsubscribe') !== false) return $m[0];
            return 'href=' . $m[1] . $base . '/api/email/track/click?c=' . $cid . '&u=' . $uid . '&url=' . rawurlencode($url) . $m[1];
        }, $html);
        $px = '<img src="' . $base . '/api/email/track/open.gif?c=' . $cid . '&u=' . $uid . '" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px" />';
        if (stripos($html, '</body>') !== false) return preg_replace('/<\/body>/i', $px . '</body>', $html, 1);
        return $html . $px;
    }

    /** GET /email/track/open.gif?c=&u= — 공개 픽셀 비콘(오픈 멱등 기록 + 1x1 gif). */
    public static function trackOpenPixel(Request $req, Response $res): Response {
        self::ensureTables(); $pdo = self::db(); $q = $req->getQueryParams();
        $cid = (int)($q['c'] ?? 0); $uid = (int)($q['u'] ?? 0);
        if ($cid > 0) {
            try {
                $upd = $pdo->prepare("UPDATE email_sends SET opened_at=:oa, status='opened' WHERE campaign_id=:cid AND customer_id=:uid AND (opened_at IS NULL OR status<>'opened')");
                $upd->execute([':oa'=>self::now(), ':cid'=>$cid, ':uid'=>$uid]);
                if ($upd->rowCount() > 0) {
                    $pdo->prepare("UPDATE email_campaigns SET opened=opened+1 WHERE id=:cid AND tenant_id=(SELECT tenant_id FROM email_sends WHERE campaign_id=:cid2 AND customer_id=:uid LIMIT 1)")->execute([':cid'=>$cid, ':cid2'=>$cid, ':uid'=>$uid]);
                }
            } catch (\Throwable $e) {}
        }
        $gif = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        $res->getBody()->write((string)$gif);
        return $res->withHeader('Content-Type','image/gif')->withHeader('Cache-Control','no-store, no-cache, must-revalidate, private')->withHeader('Pragma','no-cache');
    }

    /** GET /email/track/click?c=&u=&url= — 공개 클릭 비콘(클릭 멱등 기록 + 302 리다이렉트). */
    public static function trackClickRedirect(Request $req, Response $res): Response {
        self::ensureTables(); $pdo = self::db(); $q = $req->getQueryParams();
        $cid = (int)($q['c'] ?? 0); $uid = (int)($q['u'] ?? 0); $url = (string)($q['url'] ?? '');
        if ($cid > 0) {
            try {
                $now = self::now();
                $upd = $pdo->prepare("UPDATE email_sends SET clicked_at=:ca, opened_at=COALESCE(opened_at,:oa), status='clicked' WHERE campaign_id=:cid AND customer_id=:uid AND (clicked_at IS NULL OR status<>'clicked')");
                $upd->execute([':ca'=>$now, ':oa'=>$now, ':cid'=>$cid, ':uid'=>$uid]);
                if ($upd->rowCount() > 0) {
                    $row = $pdo->prepare("SELECT tenant_id, email FROM email_sends WHERE campaign_id=:cid AND customer_id=:uid LIMIT 1");
                    $row->execute([':cid'=>$cid, ':uid'=>$uid]); $send = $row->fetch(\PDO::FETCH_ASSOC);
                    if ($send) {
                        $tn = (string)$send['tenant_id'];
                        $pdo->prepare("UPDATE email_campaigns SET clicked=clicked+1 WHERE id=:cid AND tenant_id=:t")->execute([':cid'=>$cid, ':t'=>$tn]);
                        try { Attribution::recordOwnedTouch($pdo, $tn, 'email', (string)($send['email'] ?? ''), null, 'email:'.$cid, ['campaign_id'=>$cid, 'engagement'=>'click', 'clicked'=>true]); } catch (\Throwable $e) {}
                    }
                }
            } catch (\Throwable $e) {}
        }
        if ($url === '' || !preg_match('#^https?://#i', $url)) $url = self::publicBase();
        return $res->withHeader('Location', $url)->withStatus(302);
    }
}
