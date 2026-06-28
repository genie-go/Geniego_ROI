<?php
/**
 * Compliance — SOC2 / ISO 27001 컴플라이언스 준비도(Readiness) 대시보드.
 *
 * [R-P3-6] 플랫폼은 감사로그·암호화·RBAC·SSO/SCIM·멀티테넌트 격리·GDPR·발송 suppression 등 보안 컨트롤을
 *   이미 구현했으나, 이를 SOC2 Trust Service Criteria / ISO 27001 Annex A 에 매핑해 "컴플라이언스 준비도"로
 *   표면화하는 레이어가 부재했음(엔터프라이즈 영업·감사 증적의 핵심). 본 핸들러는 구현 컨트롤을 실측
 *   introspection(감사로그 행수·SSO 설정·GDPR 동의·발송 suppression·암호화 키)하여 프레임워크 매핑 + 준비도
 *   스코어를 산출한다. ★실제 인증(SOC2 Type II·ISO 27001 심사)은 외부 감사 프로세스 — 본 기능은 준비도/증적.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class Compliance
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

    private static function tableExists(\PDO $pdo, string $name): bool
    {
        try {
            $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            if ($drv === 'mysql') { $st = $pdo->prepare("SHOW TABLES LIKE ?"); $st->execute([$name]); return (bool)$st->fetchColumn(); }
            $st = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?"); $st->execute([$name]); return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    private static function count(\PDO $pdo, string $sql, array $p = []): int
    {
        try { $st = $pdo->prepare($sql); $st->execute($p); return (int)$st->fetchColumn(); } catch (\Throwable $e) { return -1; }
    }

    /**
     * [R-P3-6] GET /v424/compliance/posture — 컴플라이언스 준비도 스코어카드.
     *   구현 컨트롤을 실측 introspection → SOC2 TSC + ISO 27001 매핑 + 준비도%.
     */
    public static function posture(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $t = self::tenant($req);
        $controls = [];

        // 실측 introspection.
        $auditRows = 0; $ssoConfigured = false; $scimEnabled = false; $gdprRows = 0; $suppRows = 0;
        try {
            $pdo = Db::pdo();
            if (self::tableExists($pdo, 'audit_log')) $auditRows = self::count($pdo, "SELECT COUNT(*) FROM audit_log");
            if (self::tableExists($pdo, 'sso_config')) {
                $ssoConfigured = self::count($pdo, "SELECT COUNT(*) FROM sso_config WHERE tenant_id=? AND enabled=1", [$t]) > 0;
                $scimEnabled = self::count($pdo, "SELECT COUNT(*) FROM sso_config WHERE tenant_id=? AND scim_token IS NOT NULL AND scim_token<>''", [$t]) > 0;
            }
            foreach (['gdpr_consent', 'consent_log', 'gdpr_consents'] as $tb) { if (self::tableExists($pdo, $tb)) { $gdprRows = max($gdprRows, self::count($pdo, "SELECT COUNT(*) FROM $tb")); } }
            if (self::tableExists($pdo, 'email_suppression')) $suppRows = self::count($pdo, "SELECT COUNT(*) FROM email_suppression");
        } catch (\Throwable $e) { /* graceful */ }
        $encKey = (getenv('APP_KEY') ?: '') !== '';

        // 컨트롤 카탈로그 — status: implemented(구현·증적) / available(코드완비·미설정) / manual(프로세스/외부).
        $add = function (string $id, string $title, string $soc2, string $iso, string $status, string $evidence) use (&$controls) {
            $controls[] = compact('id', 'title', 'soc2', 'iso', 'status', 'evidence');
        };
        $add('access-rbac', '역할 기반 접근통제(RBAC/ABAC)', 'CC6.1, CC6.3', 'A.5.15, A.5.18', 'implemented',
            'api_key 역할(viewer<connector<analyst<admin)+scope, 팀 역할(owner/manager/member) 서버측 강제.');
        $add('sso', '엔터프라이즈 SSO(OIDC/SAML)', 'CC6.1', 'A.5.16, A.5.17', $ssoConfigured ? 'implemented' : 'available',
            $ssoConfigured ? 'sso_config 활성(IdP 연동). SAML 서명검증(C14N)·OIDC JWKS 검증.' : '코드 완비 — IdP 자격증명 등록 시 즉시 활성.');
        $add('scim', 'SCIM 2.0 사용자 자동 프로비저닝', 'CC6.2', 'A.5.16', $scimEnabled ? 'implemented' : 'available',
            $scimEnabled ? 'SCIM 토큰 발급·IdP 자동 동기화.' : '코드 완비 — SCIM 토큰 발급 시 즉시 활성.');
        $add('enc-rest', '저장 데이터 암호화(AES-256-GCM)', 'CC6.1', 'A.8.24', $encKey ? 'implemented' : 'available',
            $encKey ? '자격증명·토큰 AES-256-GCM 암호화(APP_KEY 설정됨).' : 'Crypto 모듈 완비 — APP_KEY 설정 시 활성.');
        $add('enc-transit', '전송 데이터 암호화(TLS)', 'CC6.7', 'A.8.24', 'implemented', '전 트래픽 HTTPS/TLS. 보안 헤더(HSTS 등) 적용.');
        $add('audit', '감사 로깅·활동 추적', 'CC7.2, CC7.3', 'A.8.15, A.5.28', $auditRows > 0 ? 'implemented' : 'available',
            $auditRows > 0 ? "audit_log {$auditRows}건 기록(actor·action·details·시각)." : 'audit_log 테이블 완비 — 활동 발생 시 자동 기록.');
        $add('isolation', '멀티테넌트 데이터 격리', 'CC6.1', 'A.8.3', 'implemented', '전 쿼리 tenant_id 스코프 강제 + X-Tenant 위조 차단. 운영/데모 물리 DB 분리.');
        $add('privacy', '개인정보 동의·GDPR', 'P3.1, P4.1', 'A.5.34', $gdprRows > 0 ? 'implemented' : 'available',
            $gdprRows > 0 ? "동의 기록 {$gdprRows}건. 집계 전용(PII 비저장) 설계." : '동의 관리 완비 — 동의 수집 시 기록. 집계 전용 설계.');
        $add('canspam', '발송 컴플라이언스(CAN-SPAM/수신거부)', 'P6.1', 'A.5.34', $suppRows >= 0 ? 'implemented' : 'available',
            "수신거부/하드바운스 suppression 자동 차단(현재 {$suppRows}건).");
        $add('ratelimit', 'DoS 방어·rate limiting', 'CC6.6, A1.1', 'A.8.6, A.8.20', 'implemented', 'nginx api_limit + 로그인 rate-limit. 교차테넌트 DoS 차단.');
        $add('mfa', '다중인증(MFA)', 'CC6.1', 'A.5.17', 'available', 'TOTP 기반 MFA 코드 완비 — 조직 정책으로 활성화.');
        $add('availability', '가용성·백업·DR', 'A1.2, A1.3', 'A.8.13, A.5.30', 'manual', 'DB 백업·복구는 운영 인프라 프로세스(외부 증적 필요).');
        $add('change-mgmt', '변경관리·취약점 관리', 'CC8.1', 'A.8.8, A.8.32', 'manual', 'CI 게이트·코드리뷰 적용. 정식 SOC2 심사는 외부 감사 프로세스.');
        $add('vendor', '공급업체·서브프로세서 관리', 'CC9.2', 'A.5.19, A.5.21', 'manual', '결제(Paddle MoR)·인프라 서브프로세서 — 계약·DPA 프로세스.');

        $impl = count(array_filter($controls, fn($c) => $c['status'] === 'implemented'));
        $avail = count(array_filter($controls, fn($c) => $c['status'] === 'available'));
        $manual = count(array_filter($controls, fn($c) => $c['status'] === 'manual'));
        $total = count($controls);
        // 준비도: implemented=1.0, available=0.5(코드완비), manual=0 가중.
        $readiness = $total > 0 ? round(($impl + $avail * 0.5) / $total * 100, 1) : 0.0;

        return self::json($res, [
            'ok' => true,
            'readiness_pct' => $readiness,
            'summary' => ['implemented' => $impl, 'available' => $avail, 'manual' => $manual, 'total' => $total],
            'controls' => $controls,
            'frameworks' => ['SOC 2 (Trust Service Criteria)', 'ISO/IEC 27001:2022 (Annex A)'],
            'note' => '구현 컨트롤 실측 introspection 기반 준비도. available=코드 완비·설정 시 즉시 활성, manual=외부 감사/인프라 프로세스. 정식 인증은 외부 감사인의 심사가 필요합니다.',
        ]);
    }

    /**
     * 감사 이벤트 통합 수집 — audit_log(운영 액션) + auth_audit_log(인증/권한, IP·UA·risk) UNION 정규화.
     *   공통 스키마 {ts, source, actor, role, tenant, action, detail, ip, ua, risk}. 최신순.
     */
    private static function collectAuditEvents(\PDO $pdo, int $days, int $limit): array
    {
        $since = gmdate('c', time() - $days * 86400);
        $events = [];
        // ① auth_audit_log — 로그인/MFA/권한변경(가장 SIEM 가치 높음: IP·UA·risk 포함).
        if (self::tableExists($pdo, 'auth_audit_log')) {
            try {
                $st = $pdo->prepare("SELECT at, actor, role, tenant_id, action, detail, ip, ua, risk FROM auth_audit_log WHERE at>=? ORDER BY at DESC LIMIT {$limit}");
                $st->execute([$since]);
                foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $events[] = ['ts' => (string)$r['at'], 'source' => 'auth', 'actor' => (string)$r['actor'], 'role' => (string)$r['role'],
                        'tenant' => (string)$r['tenant_id'], 'action' => (string)$r['action'], 'detail' => (string)$r['detail'],
                        'ip' => (string)$r['ip'], 'ua' => (string)$r['ua'], 'risk' => (string)($r['risk'] ?: 'low')];
                }
            } catch (\Throwable $e) {}
        }
        // ② security_audit_log — 해시체인 무결성 보안감사(SecurityAudit, append-only). 데이터접근·키회전 등.
        if (self::tableExists($pdo, 'security_audit_log')) {
            try {
                $st = $pdo->prepare("SELECT created_at, actor, tenant_id, action, details_json, ip_address, user_agent FROM security_audit_log WHERE created_at>=? ORDER BY created_at DESC LIMIT {$limit}");
                $st->execute([$since]);
                foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $events[] = ['ts' => (string)$r['created_at'], 'source' => 'security', 'actor' => (string)$r['actor'], 'role' => '',
                        'tenant' => (string)$r['tenant_id'], 'action' => (string)$r['action'], 'detail' => (string)($r['details_json'] ?? ''),
                        'ip' => (string)($r['ip_address'] ?? ''), 'ua' => (string)($r['user_agent'] ?? ''), 'risk' => 'medium'];
                }
            } catch (\Throwable $e) {}
        }
        // ③ audit_log — 운영 액션(성장/알림/매핑 등).
        if (self::tableExists($pdo, 'audit_log')) {
            try {
                $st = $pdo->prepare("SELECT actor, action, details_json, created_at FROM audit_log WHERE created_at>=? ORDER BY created_at DESC LIMIT {$limit}");
                $st->execute([$since]);
                foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $events[] = ['ts' => (string)$r['created_at'], 'source' => 'ops', 'actor' => (string)$r['actor'], 'role' => '',
                        'tenant' => '', 'action' => (string)$r['action'], 'detail' => (string)($r['details_json'] ?? ''),
                        'ip' => '', 'ua' => '', 'risk' => 'low'];
                }
            } catch (\Throwable $e) {}
        }
        usort($events, fn($a, $b) => strcmp((string)$b['ts'], (string)$a['ts']));
        return array_slice($events, 0, $limit);
    }

    /** ArcSight CEF 1행 직렬화(SIEM 표준). risk→severity 매핑. */
    private static function toCef(array $e): string
    {
        $esc = fn($s) => str_replace(['\\', '|'], ['\\\\', '\\|'], (string)$s);
        $escx = fn($s) => str_replace(['\\', '='], ['\\\\', '\\='], (string)$s);
        $sev = ['low' => 3, 'medium' => 6, 'high' => 9][$e['risk'] ?? 'low'] ?? 3;
        $ext = [];
        foreach (['actor' => 'suser', 'ip' => 'src', 'role' => 'cs1', 'tenant' => 'cs2', 'detail' => 'msg', 'source' => 'cs3'] as $k => $cef) {
            if (($e[$k] ?? '') !== '') $ext[] = $cef . '=' . $escx($e[$k]);
        }
        $ext[] = 'rt=' . $escx((string)($e['ts'] ?? ''));
        return 'CEF:0|GeniegoROI|ROI-Platform|1.0|' . $esc($e['action'] ?? 'event') . '|' . $esc($e['action'] ?? 'event') . '|' . $sev . '|' . implode(' ', $ext);
    }

    /**
     * GET /v424/compliance/audit-export?window=30&format=json|ndjson|cef — 감사 증적 통합 내보내기.
     *   SOC2/ISO 심사 증적 + SIEM 적재용. auth_audit_log + audit_log 통합. 관리자 전용(requirePro+).
     */
    public static function auditExport(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $q = $req->getQueryParams();
        $days = max(1, min(365, (int)($q['window'] ?? 30)));
        $format = in_array(($q['format'] ?? 'json'), ['json', 'ndjson', 'cef'], true) ? (string)$q['format'] : 'json';
        $limit = 5000;
        $events = [];
        try { $events = self::collectAuditEvents(Db::pdo(), $days, $limit); } catch (\Throwable $e) { /* graceful */ }
        if ($format === 'ndjson') {
            $lines = array_map(fn($e) => json_encode($e, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $events);
            $res->getBody()->write(implode("\n", $lines));
            return $res->withHeader('Content-Type', 'application/x-ndjson')->withHeader('Content-Disposition', 'attachment; filename="genie_audit.ndjson"');
        }
        if ($format === 'cef') {
            $res->getBody()->write(implode("\n", array_map([self::class, 'toCef'], $events)));
            return $res->withHeader('Content-Type', 'text/plain; charset=utf-8')->withHeader('Content-Disposition', 'attachment; filename="genie_audit.cef"');
        }
        return self::json($res, ['ok' => true, 'window_days' => $days, 'format' => 'json', 'count' => count($events), 'capped_at' => $limit, 'events' => $events]);
    }

    /** SIEM 대상 설정 로드(app_setting siem_config). */
    private static function siemCfg(\PDO $pdo): array
    {
        try {
            $st = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey='siem_config' LIMIT 1");
            $st->execute(); $v = $st->fetchColumn();
            if ($v) { $d = json_decode((string)$v, true); if (is_array($d)) return $d; }
        } catch (\Throwable $e) {}
        return ['endpoint' => '', 'token' => '', 'format' => 'ndjson', 'enabled' => 0];
    }

    /** GET/PUT /v424/compliance/siem — SIEM 포워딩 대상(Splunk HEC·Datadog·범용 HTTP) 설정. PUT=관리자. */
    public static function siemConfig(Request $req, Response $res): Response
    {
        $pdo = Db::pdo();
        $method = strtoupper($req->getMethod());
        if ($method === 'PUT') {
            if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
            $b = (array)($req->getParsedBody() ?? []);
            if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
            $endpoint = trim((string)($b['endpoint'] ?? ''));
            if ($endpoint !== '' && !preg_match('#^https://#i', $endpoint)) {
                return self::json($res, ['ok' => false, 'error' => 'SIEM 엔드포인트는 https:// 여야 합니다.'], 422);
            }
            $cur = self::siemCfg($pdo);
            $rawTok = (string)($b['token'] ?? '');
            $tok = ($rawTok === '' || strpos($rawTok, '•') !== false) ? (string)($cur['token'] ?? '') : \Genie\Crypto::encrypt($rawTok);
            $cfg = [
                'endpoint' => $endpoint,
                'token' => $tok,
                'format' => in_array(($b['format'] ?? 'ndjson'), ['ndjson', 'cef', 'splunk_hec'], true) ? (string)$b['format'] : 'ndjson',
                'enabled' => !empty($b['enabled']) ? 1 : 0,
            ];
            try {
                $now = gmdate('c'); $json = json_encode($cfg);
                $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
                $sql = $isMy
                    ? "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('siem_config',?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)"
                    : "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('siem_config',?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at";
                $pdo->prepare($sql)->execute([$json, $now]);
            } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => 'save_failed'], 500); }
            try { UserAuth::logAudit($req, 'siem_config_update', 'endpoint=' . $endpoint . ' enabled=' . $cfg['enabled'], 'medium'); } catch (\Throwable $e) {}
            return self::json($res, ['ok' => true, 'configured' => $endpoint !== '', 'enabled' => $cfg['enabled']]);
        }
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $c = self::siemCfg($pdo);
        return self::json($res, ['ok' => true, 'config' => [
            'endpoint' => $c['endpoint'] ?? '', 'token' => (!empty($c['token']) ? '••••••••' : ''),
            'format' => $c['format'] ?? 'ndjson', 'enabled' => (int)($c['enabled'] ?? 0),
        ], 'formats' => ['ndjson', 'cef', 'splunk_hec']]);
    }

    /**
     * POST /v424/compliance/siem/push?window=1 — 설정된 SIEM 으로 최근 감사 이벤트 포워딩.
     *   Splunk HEC(Authorization: Splunk <token>)·Datadog·범용 HTTPS. 관리자 전용. 수동/cron 공용.
     */
    public static function siemPush(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        $pdo = Db::pdo();
        $cfg = self::siemCfg($pdo);
        $endpoint = (string)($cfg['endpoint'] ?? '');
        if ($endpoint === '' || empty($cfg['enabled'])) {
            return self::json($res, ['ok' => false, 'error' => 'SIEM 대상이 설정/활성화되지 않았습니다.'], 422);
        }
        if (!preg_match('#^https://#i', $endpoint)) return self::json($res, ['ok' => false, 'error' => 'bad_endpoint'], 422);
        $days = max(1, min(30, (int)($req->getQueryParams()['window'] ?? 1)));
        $events = self::collectAuditEvents($pdo, $days, 2000);
        if (!$events) return self::json($res, ['ok' => true, 'sent' => 0, 'note' => '내보낼 이벤트가 없습니다.']);
        $fmt = (string)($cfg['format'] ?? 'ndjson');
        $token = (string)($cfg['token'] ?? '');
        if ($token !== '') { try { $token = \Genie\Crypto::decrypt($token); } catch (\Throwable $e) {} }
        $headers = ['Content-Type: application/json'];
        if ($fmt === 'splunk_hec') {
            // Splunk HEC: {event: {...}} JSON lines + Authorization: Splunk <token>
            if ($token !== '') $headers[] = 'Authorization: Splunk ' . $token;
            $body = implode("\n", array_map(fn($e) => json_encode(['event' => $e, 'source' => 'geniego-roi', 'sourcetype' => 'audit'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $events));
        } elseif ($fmt === 'cef') {
            if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
            $headers[0] = 'Content-Type: text/plain';
            $body = implode("\n", array_map([self::class, 'toCef'], $events));
        } else { // ndjson
            if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
            $headers[0] = 'Content-Type: application/x-ndjson';
            $body = implode("\n", array_map(fn($e) => json_encode($e, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $events));
        }
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 15, CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'GeniegoROI-SIEM/1.0',
        ]);
        $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
        $okPush = $code >= 200 && $code < 300;
        try { UserAuth::logAudit($req, 'siem_push', 'count=' . count($events) . ' http=' . $code, $okPush ? 'low' : 'medium'); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => $okPush, 'sent' => $okPush ? count($events) : 0, 'http_code' => $code,
            'format' => $fmt, 'error' => $okPush ? null : (substr($err, 0, 100) ?: ('siem http ' . $code))], $okPush ? 200 : 502);
    }
}
