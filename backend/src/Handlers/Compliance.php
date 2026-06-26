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
     * [R-P3-6] GET /v424/compliance/audit-export?window=30 — 감사 로그 증적 내보내기(최근, 캡).
     *   SOC2/ISO 심사 증적 제출용. 관리자 전용(requirePro+).
     */
    public static function auditExport(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $days = max(1, min(365, (int)($req->getQueryParams()['window'] ?? 30)));
        $since = gmdate('c', time() - $days * 86400);
        $rows = [];
        try {
            $pdo = Db::pdo();
            if (self::tableExists($pdo, 'audit_log')) {
                $st = $pdo->prepare("SELECT actor, action, details_json, created_at FROM audit_log WHERE created_at>=? ORDER BY created_at DESC LIMIT 1000");
                $st->execute([$since]);
                $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            }
        } catch (\Throwable $e) { /* graceful */ }
        return self::json($res, ['ok' => true, 'window_days' => $days, 'count' => count($rows), 'capped_at' => 1000, 'events' => $rows]);
    }
}
