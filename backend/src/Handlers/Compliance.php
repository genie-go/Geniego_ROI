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
        $lang = \Genie\I18n::lang($req);
        $t = self::tenant($req);
        $controls = [];

        // 실측 introspection.
        $auditRows = 0; $ssoConfigured = false; $scimEnabled = false; $gdprRows = 0; $suppRows = 0;
        try {
            $pdo = Db::pdo();
            // [현 차수 감사] ★audit_log 는 tenant_id 컬럼이 없는 플랫폼 전역 관리자 감사 테이블 →
            //   전역 COUNT 를 임의 테넌트 posture 카드에 노출하면 타 테넌트 활동 건수가 새어나간다(257차가 형제
            //   gdpr/suppression 에 적용한 fail-closed 정책 누락분). 테넌트 자신의 감사 활동은 tenant_id 스코프
            //   된 security_audit_log 로 카운트한다(없으면 fail-closed=0). 형제 sso_config 스코프와 정합.
            if (self::tableExists($pdo, 'security_audit_log')) {
                try { $auditRows = self::count($pdo, "SELECT COUNT(*) FROM security_audit_log WHERE tenant_id=?", [$t]); } catch (\Throwable $e) { $auditRows = 0; }
            }
            if (self::tableExists($pdo, 'sso_config')) {
                $ssoConfigured = self::count($pdo, "SELECT COUNT(*) FROM sso_config WHERE tenant_id=? AND enabled=1", [$t]) > 0;
                $scimEnabled = self::count($pdo, "SELECT COUNT(*) FROM sso_config WHERE tenant_id=? AND scim_token IS NOT NULL AND scim_token<>''", [$t]) > 0;
            }
            // [현 차수 감사] ★테넌트 스코프 강제 — 기존엔 gdpr/suppression COUNT 가 WHERE tenant_id 누락으로
            //   플랫폼 전역 건수가 임의 테넌트 컴플라이언스 카드에 노출됐다(형제 sso_config 는 스코프됨). 테넌트별로
            //   집계하고, 레거시 무-tenant 컬럼 테이블은 예외 시 집계 제외(전역 노출 금지=fail-closed·개별 try 로 격리).
            foreach (['gdpr_consent', 'consent_log', 'gdpr_consents'] as $tb) {
                if (self::tableExists($pdo, $tb)) {
                    try { $gdprRows = max($gdprRows, self::count($pdo, "SELECT COUNT(*) FROM $tb WHERE tenant_id=?", [$t])); } catch (\Throwable $e) { /* tenant 컬럼 없는 레거시 → 제외 */ }
                }
            }
            if (self::tableExists($pdo, 'email_suppression')) {
                try { $suppRows = self::count($pdo, "SELECT COUNT(*) FROM email_suppression WHERE tenant_id=?", [$t]); } catch (\Throwable $e) { $suppRows = 0; }
            }
        } catch (\Throwable $e) { /* graceful */ }
        $encKey = (getenv('APP_KEY') ?: '') !== '';

        // 컨트롤 카탈로그 — status: implemented(구현·증적) / available(코드완비·미설정) / manual(프로세스/외부).
        $add = function (string $id, string $title, string $soc2, string $iso, string $status, string $evidence) use (&$controls) {
            $controls[] = compact('id', 'title', 'soc2', 'iso', 'status', 'evidence');
        };
        $add('access-rbac', \Genie\I18n::t('cmpl.ctrl.rbac.title', [], $lang), 'CC6.1, CC6.3', 'A.5.15, A.5.18', 'implemented',
            \Genie\I18n::t('cmpl.ctrl.rbac.evidence', [], $lang));
        $add('sso', \Genie\I18n::t('cmpl.ctrl.sso.title', [], $lang), 'CC6.1', 'A.5.16, A.5.17', $ssoConfigured ? 'implemented' : 'available',
            $ssoConfigured ? \Genie\I18n::t('cmpl.ctrl.sso.evidenceImplemented', [], $lang) : \Genie\I18n::t('cmpl.ctrl.sso.evidenceAvailable', [], $lang));
        $add('scim', \Genie\I18n::t('cmpl.ctrl.scim.title', [], $lang), 'CC6.2', 'A.5.16', $scimEnabled ? 'implemented' : 'available',
            $scimEnabled ? \Genie\I18n::t('cmpl.ctrl.scim.evidenceImplemented', [], $lang) : \Genie\I18n::t('cmpl.ctrl.scim.evidenceAvailable', [], $lang));
        $add('enc-rest', \Genie\I18n::t('cmpl.ctrl.encRest.title', [], $lang), 'CC6.1', 'A.8.24', $encKey ? 'implemented' : 'available',
            $encKey ? \Genie\I18n::t('cmpl.ctrl.encRest.evidenceImplemented', [], $lang) : \Genie\I18n::t('cmpl.ctrl.encRest.evidenceAvailable', [], $lang));
        $add('enc-transit', \Genie\I18n::t('cmpl.ctrl.encTransit.title', [], $lang), 'CC6.7', 'A.8.24', 'implemented', \Genie\I18n::t('cmpl.ctrl.encTransit.evidence', [], $lang));
        $add('audit', \Genie\I18n::t('cmpl.ctrl.audit.title', [], $lang), 'CC7.2, CC7.3', 'A.8.15, A.5.28', $auditRows > 0 ? 'implemented' : 'available',
            $auditRows > 0 ? \Genie\I18n::t('cmpl.ctrl.audit.evidenceImplemented', ['n' => $auditRows], $lang) : \Genie\I18n::t('cmpl.ctrl.audit.evidenceAvailable', [], $lang));
        $add('isolation', \Genie\I18n::t('cmpl.ctrl.isolation.title', [], $lang), 'CC6.1', 'A.8.3', 'implemented', \Genie\I18n::t('cmpl.ctrl.isolation.evidence', [], $lang));
        $add('privacy', \Genie\I18n::t('cmpl.ctrl.privacy.title', [], $lang), 'P3.1, P4.1', 'A.5.34', $gdprRows > 0 ? 'implemented' : 'available',
            $gdprRows > 0 ? \Genie\I18n::t('cmpl.ctrl.privacy.evidenceImplemented', ['n' => $gdprRows], $lang) : \Genie\I18n::t('cmpl.ctrl.privacy.evidenceAvailable', [], $lang));
        $add('canspam', \Genie\I18n::t('cmpl.ctrl.canspam.title', [], $lang), 'P6.1', 'A.5.34', $suppRows >= 0 ? 'implemented' : 'available',
            \Genie\I18n::t('cmpl.ctrl.canspam.evidence', ['n' => $suppRows], $lang));
        $add('ratelimit', \Genie\I18n::t('cmpl.ctrl.ratelimit.title', [], $lang), 'CC6.6, A1.1', 'A.8.6, A.8.20', 'implemented', \Genie\I18n::t('cmpl.ctrl.ratelimit.evidence', [], $lang));
        $add('mfa', \Genie\I18n::t('cmpl.ctrl.mfa.title', [], $lang), 'CC6.1', 'A.5.17', 'available', \Genie\I18n::t('cmpl.ctrl.mfa.evidence', [], $lang));
        $add('availability', \Genie\I18n::t('cmpl.ctrl.availability.title', [], $lang), 'A1.2, A1.3', 'A.8.13, A.5.30', 'manual', \Genie\I18n::t('cmpl.ctrl.availability.evidence', [], $lang));
        $add('change-mgmt', \Genie\I18n::t('cmpl.ctrl.changeMgmt.title', [], $lang), 'CC8.1', 'A.8.8, A.8.32', 'manual', \Genie\I18n::t('cmpl.ctrl.changeMgmt.evidence', [], $lang));
        $add('vendor', \Genie\I18n::t('cmpl.ctrl.vendor.title', [], $lang), 'CC9.2', 'A.5.19, A.5.21', 'manual', \Genie\I18n::t('cmpl.ctrl.vendor.evidence', [], $lang));

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
            'note' => \Genie\I18n::t('cmpl.posture.note', [], $lang),
        ]);
    }

    /**
     * 감사 이벤트 통합 수집 — audit_log(운영 액션) + auth_audit_log(인증/권한, IP·UA·risk) UNION 정규화.
     *   공통 스키마 {ts, source, actor, role, tenant, action, detail, ip, ua, risk}. 최신순.
     *
     * [283차] $tenant 스코프 옵션 추가.
     *   - $tenant=null → 종전과 완전히 동일한 **전역 수집**(최고관리자 경로·무회귀).
     *   - $tenant='...' → 해당 테넌트 이벤트만. enterprise 고객이 자기 감사증적을 내보낼 수 있게 하는 근거.
     *   ★fail-closed: audit_log 는 tenant_id 컬럼이 **없는** 플랫폼 전역 테이블이므로, 테넌트 스코프
     *     수집에서는 통째로 제외한다. 포함시키면 타 테넌트 운영액션이 그대로 새어나간다
     *     (posture() 가 :64-70 에서 같은 이유로 audit_log 를 배제한 것과 동일 정책).
     */
    private static function collectAuditEvents(\PDO $pdo, int $days, int $limit, ?string $tenant = null): array
    {
        $since = gmdate('c', time() - $days * 86400);
        $scoped = ($tenant !== null && $tenant !== '');
        $events = [];
        // ① auth_audit_log — 로그인/MFA/권한변경(가장 SIEM 가치 높음: IP·UA·risk 포함).
        if (self::tableExists($pdo, 'auth_audit_log')) {
            try {
                $sql = "SELECT at, actor, role, tenant_id, action, detail, ip, ua, risk FROM auth_audit_log WHERE at>=?"
                     . ($scoped ? " AND tenant_id=?" : "") . " ORDER BY at DESC LIMIT {$limit}";
                $st = $pdo->prepare($sql);
                $st->execute($scoped ? [$since, $tenant] : [$since]);
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
                $sql = "SELECT created_at, actor, tenant_id, action, details_json, ip_address, user_agent FROM security_audit_log WHERE created_at>=?"
                     . ($scoped ? " AND tenant_id=?" : "") . " ORDER BY created_at DESC LIMIT {$limit}";
                $st = $pdo->prepare($sql);
                $st->execute($scoped ? [$since, $tenant] : [$since]);
                foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                    $events[] = ['ts' => (string)$r['created_at'], 'source' => 'security', 'actor' => (string)$r['actor'], 'role' => '',
                        'tenant' => (string)$r['tenant_id'], 'action' => (string)$r['action'], 'detail' => (string)($r['details_json'] ?? ''),
                        'ip' => (string)($r['ip_address'] ?? ''), 'ua' => (string)($r['user_agent'] ?? ''), 'risk' => 'medium'];
                }
            } catch (\Throwable $e) {}
        }
        // ③ audit_log — 운영 액션(성장/알림/매핑 등). ★테넌트 스코프에서는 제외(위 fail-closed 주석).
        if (!$scoped && self::tableExists($pdo, 'audit_log')) {
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

    /**
     * [283차] 요청자의 감사 스코프 결정.
     *   admin(최고관리자) → null(=전역, 종전 동작). enterprise → 자기 tenant. 그 외 → false(권한없음).
     *   ★테넌트는 세션에서 서버 도출 — 쿼리/헤더로 지정 불가(교차 테넌트 열람 원천 차단).
     * @return string|null|false
     */
    private static function auditScope(Request $req)
    {
        $u = UserAuth::authedUser($req);
        if (!is_array($u)) return false;
        $plan = strtolower(trim((string)($u['plan'] ?? '')));
        if ($plan === 'admin') return null;                       // 전역
        if ($plan === 'enterprise') {
            $t = trim((string)($u['tenant_id'] ?? ''));
            return $t !== '' ? $t : false;                        // 자기 테넌트만
        }
        return false;                                            // pro 이하 = 감사 익스포트 불가
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

    /** [282차 R3] IBM QRadar LEEF 2.0 1행 직렬화 — 탭 구분 key=value(SIEM 표준). */
    private static function toLeef(array $e): string
    {
        $esc = fn($s) => str_replace(['\\', '|'], ['\\\\', '\\|'], (string)$s);
        $sev = ['low' => 3, 'medium' => 6, 'high' => 9][$e['risk'] ?? 'low'] ?? 3;
        $attrs = ['devTime=' . (string)($e['ts'] ?? ''), 'sev=' . $sev, 'cat=' . (string)($e['action'] ?? 'event')];
        foreach (['actor' => 'usrName', 'ip' => 'src', 'role' => 'role', 'tenant' => 'tenant', 'detail' => 'msg', 'source' => 'logSource'] as $k => $leef) {
            if (($e[$k] ?? '') !== '') $attrs[] = $leef . '=' . str_replace("\t", ' ', (string)$e[$k]);
        }
        // LEEF:2.0|Vendor|Product|Version|EventID|(tab)key=value...
        return 'LEEF:2.0|GeniegoROI|ROI-Platform|1.0|' . $esc($e['action'] ?? 'event') . "|\t" . implode("\t", $attrs);
    }

    /** [282차 R3] RFC 5424 Syslog 1행 직렬화 — SIEM/rsyslog 수집 표준. PRI=facility(local0=16)*8+severity. */
    private static function toSyslog(array $e): string
    {
        // risk→syslog severity(0=emerg..7=debug): high=3(err), medium=4(warning), low=6(info).
        $sev = ['low' => 6, 'medium' => 4, 'high' => 3][$e['risk'] ?? 'low'] ?? 6;
        $pri = 16 * 8 + $sev; // local0 facility
        $ts = (string)($e['ts'] ?? gmdate('c')); $tsr = @strtotime($ts); $iso = $tsr ? gmdate('Y-m-d\TH:i:s\Z', $tsr) : gmdate('c');
        $host = 'genieroi'; $app = 'audit';
        $clean = fn($s) => str_replace(["]", '"', "\\"], [')', "'", '/'], (string)$s);
        // STRUCTURED-DATA: 감사 컨텍스트.
        $sd = '[genie actor="' . $clean($e['actor'] ?? '') . '" tenant="' . $clean($e['tenant'] ?? '') . '" src="' . $clean($e['ip'] ?? '') . '" action="' . $clean($e['action'] ?? '') . '"]';
        $msg = $clean($e['detail'] ?? ($e['action'] ?? 'event'));
        return "<{$pri}>1 {$iso} {$host} {$app} - - {$sd} {$msg}";
    }

    /** 형식별 이벤트 배열 직렬화(공용 — auditExport + siemPush 재사용). */
    private static function serializeEvents(array $events, string $format): string
    {
        switch ($format) {
            case 'cef':    return implode("\n", array_map([self::class, 'toCef'], $events));
            case 'leef':   return implode("\n", array_map([self::class, 'toLeef'], $events));
            case 'syslog': return implode("\n", array_map([self::class, 'toSyslog'], $events));
            case 'ndjson':
            default:       return implode("\n", array_map(fn($e) => json_encode($e, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $events));
        }
    }

    /**
     * GET /v424/compliance/audit-export?window=30&format=json|ndjson|cef — 감사 증적 통합 내보내기.
     *   SOC2/ISO 심사 증적 + SIEM 적재용. auth_audit_log + audit_log 통합. 관리자 전용(requirePro+).
     */
    public static function auditExport(Request $req, Response $res): Response
    {
        // [현 차수 감사 GAP-1] 전 테넌트 감사로그 교차유출 차단.
        // [283차] admin=전역(종전 그대로) · enterprise=자기 테넌트만(신규). pro 이하는 403.
        //   종전엔 admin 전용이라 enterprise 고객이 **자기 감사증적조차 내보낼 수 없었다**(SOC2 심사 대응 불가).
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        $scope = self::auditScope($req);
        if ($scope === false) {
            return self::json($res, ['ok' => false, 'error' => '감사 증적 내보내기 권한이 없습니다.', 'code' => 'PLAN_REQUIRED'], 403);
        }
        $q = $req->getQueryParams();
        $days = max(1, min(365, (int)($q['window'] ?? 30)));
        // [282차 R3] LEEF(QRadar)·Syslog(RFC5424) 형식 추가.
        $format = in_array(($q['format'] ?? 'json'), ['json', 'ndjson', 'cef', 'leef', 'syslog'], true) ? (string)$q['format'] : 'json';
        $limit = 5000;
        $events = [];
        try { $events = self::collectAuditEvents(Db::pdo(), $days, $limit, $scope); } catch (\Throwable $e) { /* graceful */ }
        if ($format === 'ndjson') {
            $res->getBody()->write(self::serializeEvents($events, 'ndjson'));
            return $res->withHeader('Content-Type', 'application/x-ndjson')->withHeader('Content-Disposition', 'attachment; filename="genie_audit.ndjson"');
        }
        if (in_array($format, ['cef', 'leef', 'syslog'], true)) {
            $ext = ['cef' => 'cef', 'leef' => 'leef', 'syslog' => 'log'][$format];
            $res->getBody()->write(self::serializeEvents($events, $format));
            return $res->withHeader('Content-Type', 'text/plain; charset=utf-8')->withHeader('Content-Disposition', 'attachment; filename="genie_audit.' . $ext . '"');
        }
        return self::json($res, ['ok' => true, 'window_days' => $days, 'format' => 'json',
            'scope' => ($scope === null ? 'global' : 'tenant'), 'count' => count($events), 'capped_at' => $limit, 'events' => $events]);
    }

    /**
     * SIEM 대상 설정 로드.
     * [283차] $tenant 지정 시 **테넌트 설정(tenant_security_policy.siem_config) 우선**, 없으면 전역
     *   (app_setting siem_config)으로 폴백. $tenant=null 호출은 종전과 완전히 동일(무회귀).
     */
    private static function siemCfg(\PDO $pdo, ?string $tenant = null): array
    {
        if ($tenant !== null && $tenant !== '') {
            try {
                $tp = UserAuth::tenantPolicy($pdo, $tenant);
                $v = (string)($tp['siem_config'] ?? '');
                if ($v !== '') { $d = json_decode($v, true); if (is_array($d)) return $d; }
            } catch (\Throwable $e) {}
        }
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
            // [283차] enterprise 이상. admin=전역(종전) · enterprise=자기 테넌트 SIEM(신규).
            //   종전엔 admin 전용 단일 전역설정이라 **고객이 자기 SIEM 으로 스트리밍할 수 없었다**.
            if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
            $scope = self::auditScope($req);
            if ($scope === false) return self::json($res, ['ok' => false, 'error' => 'forbidden'], 403);
            $b = (array)($req->getParsedBody() ?? []);
            if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
            $endpoint = trim((string)($b['endpoint'] ?? ''));
            if ($endpoint !== '' && !preg_match('#^https://#i', $endpoint)) {
                return self::json($res, ['ok' => false, 'error' => 'SIEM 엔드포인트는 https:// 여야 합니다.'], 422);
            }
            // [280차 P2] SSRF 차단 — 사설/예약 IP·메타데이터 IP 로의 엔드포인트 저장 거부(형제 핸들러 정합).
            if ($endpoint !== '' && !self::isSafeSiemUrl($endpoint)) {
                return self::json($res, ['ok' => false, 'error' => 'SIEM 엔드포인트가 허용되지 않는 주소(사설/내부/메타데이터 IP)입니다.'], 422);
            }
            // [283차] 마스킹 토큰('••••') 보존은 **저장할 스코프와 같은 설정**에서 읽어야 한다.
            //   전역 설정을 읽어 테넌트에 쓰면 남의 토큰이 테넌트 설정으로 복제된다.
            $cur = self::siemCfg($pdo, $scope);
            $rawTok = (string)($b['token'] ?? '');
            $tok = ($rawTok === '' || strpos($rawTok, '•') !== false) ? (string)($cur['token'] ?? '') : \Genie\Crypto::encrypt($rawTok);
            $cfg = [
                'endpoint' => $endpoint,
                'token' => $tok,
                'format' => in_array(($b['format'] ?? 'ndjson'), ['ndjson', 'cef', 'leef', 'syslog', 'splunk_hec'], true) ? (string)$b['format'] : 'ndjson',
                'enabled' => !empty($b['enabled']) ? 1 : 0,
                // [254차 초고도화] 실시간 포워딩 opt-in(기본 off=배치만·회귀0) + 최소 심각도.
                // [282차 R3] 종전엔 프론트 PUT 이 realtime 을 안 보내 매 저장이 realtime=0 으로 리셋됐다(실시간 포워딩
                //   정상 사용 경로로 켤 수 없었음). 바디에 realtime 키가 없으면 기존값을 보존한다(token '••••' 보존과 동일).
                'realtime' => array_key_exists('realtime', $b) ? (!empty($b['realtime']) ? 1 : 0) : (int)($cur['realtime'] ?? 0),
                'realtime_min_severity' => in_array(($b['realtime_min_severity'] ?? ($cur['realtime_min_severity'] ?? 'high')), ['medium', 'high'], true) ? (string)($b['realtime_min_severity'] ?? ($cur['realtime_min_severity'] ?? 'high')) : 'high',
            ];
            $json = json_encode($cfg);
            if ($scope === null) {
                // 전역(최고관리자) — 기존 코드 경로 그대로.
                try {
                    $now = gmdate('c');
                    $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
                    $sql = $isMy
                        ? "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('siem_config',?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)"
                        : "INSERT INTO app_setting(skey,svalue,updated_at) VALUES('siem_config',?,?) ON CONFLICT(skey) DO UPDATE SET svalue=excluded.svalue,updated_at=excluded.updated_at";
                    $pdo->prepare($sql)->execute([$json, $now]);
                } catch (\Throwable $e) { return self::json($res, ['ok' => false, 'error' => 'save_failed'], 500); }
            } else {
                // 테넌트 스코프(enterprise 고객) — sso_config 와 동일한 테넌트 격리 저장소.
                if (!UserAuth::setTenantPolicy($pdo, (string)$scope, 'siem_config', $json)) {
                    return self::json($res, ['ok' => false, 'error' => 'save_failed'], 500);
                }
            }
            try { UserAuth::logAudit($req, 'siem_config_update', 'scope=' . ($scope === null ? 'global' : 'tenant') . ' endpoint=' . $endpoint . ' enabled=' . $cfg['enabled'], 'medium'); } catch (\Throwable $e) {}
            return self::json($res, ['ok' => true, 'scope' => ($scope === null ? 'global' : 'tenant'), 'configured' => $endpoint !== '', 'enabled' => $cfg['enabled']]);
        }
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        // [283차] 조회도 스코프 반영 — enterprise 는 자기 테넌트 설정을(없으면 전역 폴백), admin 은 전역을 본다.
        //   auditScope()가 false(pro 이하)면 전역 조회(종전 동작 유지 — GET 은 원래 requirePro 였다).
        $gScope = self::auditScope($req);
        $c = self::siemCfg($pdo, ($gScope === false || $gScope === null) ? null : (string)$gScope);
        return self::json($res, ['ok' => true, 'scope' => (is_string($gScope) && $gScope !== '') ? 'tenant' : 'global',
            'can_edit' => ($gScope !== false), 'config' => [
            'endpoint' => $c['endpoint'] ?? '', 'token' => (!empty($c['token']) ? '••••••••' : ''),
            'format' => $c['format'] ?? 'ndjson', 'enabled' => (int)($c['enabled'] ?? 0),
            // [282차 R3] 실시간 포워딩 상태 노출 — UI 가 표시/보존할 수 있도록(종전 미노출로 항상 0 취급됐음).
            'realtime' => (int)($c['realtime'] ?? 0), 'realtime_min_severity' => $c['realtime_min_severity'] ?? 'high',
        ], 'formats' => ['ndjson', 'cef', 'leef', 'syslog', 'splunk_hec']]);
    }

    /**
     * POST /v424/compliance/siem/push?window=1 — 설정된 SIEM 으로 최근 감사 이벤트 포워딩.
     *   Splunk HEC(Authorization: Splunk <token>)·Datadog·범용 HTTPS. 관리자 전용. 수동/cron 공용.
     */
    /**
     * [254차 초고도화] 실시간 SIEM 단건 포워딩 — 보안이벤트 발생 즉시 push(비차단·best-effort).
     *   ★opt-in: siem_config.realtime=1 일 때만 동작(기본 off=배치만, 회귀0). 고심각도(min_severity, 기본 high)만
     *   전송해 볼륨 제한. logAudit 훅이 high 이벤트에서만 호출(저/중 severity는 DB read조차 없음).
     */
    /** [280차 P2] SSRF 가드 — 형제 핸들러(DataExport/Alerting/OpenPlatform)와 동형. SIEM 엔드포인트가
     *  사설/예약 IP·클라우드 메타데이터(169.254.169.254)로 향하는 것을 차단. siem_config 는 전역이라 전 테넌트
     *  high 보안이벤트가 유출될 수 있어(설정은 admin 등급 액터) TOCTOU 대비 전달 시점에도 재검사한다. */
    private static function isSafeSiemUrl(string $url): bool
    {
        $p = parse_url($url);
        if (!$p || (($p['scheme'] ?? '') !== 'https')) return false;
        $host = strtolower((string)($p['host'] ?? ''));
        if ($host === '' || in_array($host, ['localhost', 'metadata.google.internal'], true)) return false;
        if (substr($host, -6) === '.local' || substr($host, -9) === '.internal') return false;
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) $ips = [$host];
        else {
            $recs = @dns_get_record($host, DNS_A | DNS_AAAA);
            if (is_array($recs)) foreach ($recs as $r) { if (!empty($r['ip'])) $ips[] = $r['ip']; if (!empty($r['ipv6'])) $ips[] = $r['ipv6']; }
            if (!$ips) { $h = @gethostbyname($host); if ($h && $h !== $host) $ips[] = $h; }
        }
        if (!$ips) return false;
        foreach ($ips as $ip) { if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false; }
        return true;
    }

    public static function forwardEvent(array $event): void
    {
        try {
            $rank = ['low' => 1, 'medium' => 2, 'high' => 3];
            $sev = (string)($event['risk'] ?? $event['severity'] ?? 'low');
            // [283차] 이벤트에 테넌트가 실려 있으면 **그 테넌트의 SIEM 설정**으로 포워딩한다(없으면 전역 폴백).
            //   → enterprise 고객이 자기 보안이벤트를 자기 SIEM 으로 실시간 수신할 수 있게 되는 지점.
            //   테넌트 미상 이벤트는 종전대로 전역 설정을 따른다(무회귀).
            $evTenant = trim((string)($event['tenant'] ?? ''));
            $cfg = self::siemCfg(Db::pdo(), $evTenant !== '' ? $evTenant : null);
            if (empty($cfg['enabled']) || empty($cfg['realtime']) || empty($cfg['endpoint'])) return;
            $minSev = (string)($cfg['realtime_min_severity'] ?? 'high');
            if (($rank[$sev] ?? 1) < ($rank[$minSev] ?? 3)) return;
            $endpoint = (string)$cfg['endpoint'];
            if (!preg_match('#^https://#i', $endpoint) || !self::isSafeSiemUrl($endpoint)) return;   // [280차 P2] 전달시점 SSRF 재검사(TOCTOU)
            $fmt = (string)($cfg['format'] ?? 'ndjson');
            $token = (string)($cfg['token'] ?? '');
            if ($token !== '') { try { $token = \Genie\Crypto::decrypt($token); } catch (\Throwable $e) {} }
            $e = ['action' => (string)($event['action'] ?? 'event'), 'actor' => (string)($event['actor'] ?? ''),
                'ip' => (string)($event['ip'] ?? ''), 'role' => (string)($event['role'] ?? ''),
                'tenant' => (string)($event['tenant'] ?? ''), 'detail' => (string)($event['detail'] ?? ''),
                'risk' => $sev, 'source' => 'realtime', 'ts' => gmdate('c')];
            $headers = ['Content-Type: application/json'];
            if ($fmt === 'splunk_hec') { if ($token !== '') $headers[] = 'Authorization: Splunk ' . $token; $body = json_encode(['event' => $e, 'source' => 'geniego-roi', 'sourcetype' => 'audit'], JSON_UNESCAPED_UNICODE); }
            elseif (in_array($fmt, ['cef', 'leef', 'syslog'], true)) { if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token; $headers[0] = 'Content-Type: text/plain'; $body = self::serializeEvents([$e], $fmt); }
            else { if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token; $headers[0] = 'Content-Type: application/x-ndjson'; $body = json_encode($e, JSON_UNESCAPED_UNICODE); }
            $ch = curl_init($endpoint);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 4, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'GeniegoROI-SIEM-RT/1.0']);
            curl_exec($ch); curl_close($ch);
        } catch (\Throwable $e) { /* 비차단 */ }
    }

    public static function siemPush(Request $req, Response $res): Response
    {
        // [283차] admin=전역 설정·전역 이벤트(종전) · enterprise=자기 SIEM·자기 테넌트 이벤트(신규).
        if ($err = UserAuth::requirePlan($req, $res, 'enterprise')) return $err;
        $scope = self::auditScope($req);
        if ($scope === false) return self::json($res, ['ok' => false, 'error' => 'forbidden'], 403);
        $pdo = Db::pdo();
        $cfg = self::siemCfg($pdo, $scope);
        $endpoint = (string)($cfg['endpoint'] ?? '');
        if ($endpoint === '' || empty($cfg['enabled'])) {
            return self::json($res, ['ok' => false, 'error' => 'SIEM 대상이 설정/활성화되지 않았습니다.'], 422);
        }
        if (!preg_match('#^https://#i', $endpoint) || !self::isSafeSiemUrl($endpoint)) return self::json($res, ['ok' => false, 'error' => 'bad_endpoint'], 422);   // [280차 P2] SSRF
        $days = max(1, min(30, (int)($req->getQueryParams()['window'] ?? 1)));
        // ★테넌트 스코프 푸시는 자기 테넌트 이벤트만 전송한다(타 테넌트 감사로그가 고객 SIEM 으로 흘러가면 유출).
        $events = self::collectAuditEvents($pdo, $days, 2000, $scope);
        if (!$events) return self::json($res, ['ok' => true, 'sent' => 0, 'note' => '내보낼 이벤트가 없습니다.']);
        $fmt = (string)($cfg['format'] ?? 'ndjson');
        $token = (string)($cfg['token'] ?? '');
        if ($token !== '') { try { $token = \Genie\Crypto::decrypt($token); } catch (\Throwable $e) {} }
        $headers = ['Content-Type: application/json'];
        if ($fmt === 'splunk_hec') {
            // Splunk HEC: {event: {...}} JSON lines + Authorization: Splunk <token>
            if ($token !== '') $headers[] = 'Authorization: Splunk ' . $token;
            $body = implode("\n", array_map(fn($e) => json_encode(['event' => $e, 'source' => 'geniego-roi', 'sourcetype' => 'audit'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $events));
        } elseif (in_array($fmt, ['cef', 'leef', 'syslog'], true)) { // [282차 R3] CEF/LEEF/Syslog 공용 직렬화
            if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
            $headers[0] = 'Content-Type: text/plain';
            $body = self::serializeEvents($events, $fmt);
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
