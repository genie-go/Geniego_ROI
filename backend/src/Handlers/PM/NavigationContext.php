<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * CWIS Part004-03 — Collaboration Context Domain (Slim/PDO 적응 구현).
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ★교차검증(feedback_cross_verify_all_commands) — 명세 §7 Context 계층 vs 실측
 * ════════════════════════════════════════════════════════════════════════════
 * | 명세 축        | 실측 결과                                            | 처리                       |
 * | Tenant        | **실재** app_user.tenant_id (1 user = 1 tenant)       | 구현                       |
 * |               | + agency_client_link(대행사↔N 클라이언트 위임)         | **진짜 멀티테넌트 = 구현**  |
 * |               | + X-Act-As-Tenant: platform_growth (admin 전용 1값)   | 구현                       |
 * | Organization  | **부재** — 조직=tenant 매핑 확정(Part002 §1)           | NOT_APPLICABLE 정직 반환   |
 * | Workspace     | **부재** — WorkspaceState = tenant_kv(키-값), 엔티티/  | NOT_APPLICABLE 정직 반환   |
 * |               |   멤버십/행 자체가 없음 → "전환할 대상"이 존재하지 않음  |                            |
 * | Department    | **부재**(Part002 PLANNED — 제품범위)                   | NOT_APPLICABLE             |
 * | Team          | **부재** — app_user.team_name 문자열(1급 엔티티 아님)   | NOT_APPLICABLE             |
 * | Portfolio     | pm_portfolios(Enterprise) 실재하나 Context 축 아님      | 미구현(Part004-05 검토)     |
 * | Program       | **부재**                                             | NOT_APPLICABLE             |
 * | Project       | **실재** pm_projects(tenant_id·status·owner_user_id)  | **구현**                   |
 *
 * ★결론: 실제 Context 축은 **Tenant + Project** 두 개뿐이다. 존재하지 않는 축에 Switcher UI 를 만드는 것은
 *   "동작하는 척하는 빈 껍데기"이므로 만들지 않고, Provider 가 `available:false` + 부재 사유를 정직 반환한다.
 *   (Part002 가 department/squad/community 를 PLANNED 로 정직 보류한 것과 동일 원칙.)
 *
 * ★Feature Flag: 저장소에 Flag 서비스가 없다(실측 0건). Part004-02 보고서 §19 권장대로
 *   **기존 `tenant_collaboration_capabilities`(테넌트별 on/off + 감사 + 정직성 게이트)를 전환 스위치로 재사용**한다.
 *   신규 플래그 저장소를 만들지 않는다(중복 신설 금지).
 *
 * ★무후퇴: 레거시 사이드바/URL/Deep Link 를 전혀 변경하지 않는다. 본 핸들러는 신규 경로만 추가한다.
 *
 * Endpoints:
 *   GET  /v425/pm/context               => current      현재 Context
 *   GET  /v425/pm/context/options       => options      전환 가능 Context 목록
 *   POST /v425/pm/context/switch        => switchContext 원자적 전환(검증 후)
 *   POST /v425/pm/context/validate      => validateContext 딥링크 복구·진단
 *   GET  /v425/pm/sidebar               => sidebar      Registry Tree + Context + Active + Breadcrumb
 *   GET  /v425/pm/breadcrumb            => breadcrumb   리소스 기반 경로
 */
final class NavigationContext extends Shared
{
    private static array $ctxEnsured = [];

    /** 명세 §11 Status 어휘. */
    public const STATUS_VALID = 'VALID';
    public const STATUS_INVALID_TENANT = 'INVALID_TENANT';
    public const STATUS_INVALID_PROJECT = 'INVALID_PROJECT';
    public const STATUS_MEMBERSHIP_REQUIRED = 'MEMBERSHIP_REQUIRED';
    public const STATUS_PERMISSION_DENIED = 'PERMISSION_DENIED';
    public const STATUS_ARCHIVED = 'CONTEXT_ARCHIVED';
    public const STATUS_MISMATCH = 'CONTEXT_MISMATCH';
    public const STATUS_SELECTION_REQUIRED = 'CONTEXT_SELECTION_REQUIRED';

    /** 명세 §8.1 Source 어휘. */
    public const SOURCES = ['ROUTE', 'EXPLICIT_SWITCH', 'USER_DEFAULT', 'RECENT_CONTEXT', 'SESSION', 'SAFE_FALLBACK', 'ADMIN_PREVIEW'];

    /** 실제로 전환 가능한 Context 타입(실측 기반). */
    public const CONTEXT_TYPES = ['TENANT', 'PROJECT'];

    /**
     * 부재가 확정된 Context 축 — Provider 가 정직하게 사유를 반환한다.
     * ★0건이나 빈 배열로 '없음'인 척하지 않는다(0 은 "지금 없다"로, 부재는 "축 자체가 없다"로 다르게 읽혀야 한다).
     */
    public const ABSENT_AXES = [
        'ORGANIZATION' => '조직은 테넌트와 1:1 매핑된다(CWIS Part002 확정) — 별도 전환 축이 존재하지 않음',
        'WORKSPACE'    => 'WorkspaceState 는 tenant_kv 키-값 저장소이며 워크스페이스 엔티티·멤버십 행이 없음 — 전환 대상 부재',
        'DEPARTMENT'   => '부서 엔티티 부재(Part002 PLANNED — 제품범위 검토 후)',
        'TEAM'         => '팀은 app_user.team_name 문자열이며 1급 엔티티가 아님 — 전환 대상 부재',
        'PROGRAM'      => '프로그램 엔티티 부재',
    ];

    /* ══════════════════════════════════════════════════════════════════════
     * 1. 저장 구조 — 기본/최근 Context (명세 §44.1)
     * ══════════════════════════════════════════════════════════════════════ */

    private static function ensureContextTable(\PDO $pdo, bool $isDemo): void
    {
        $memo = $isDemo ? 'demo' : 'ops';
        if (isset(self::$ctxEnsured[$memo])) return;
        self::$ctxEnsured[$memo] = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_user_contexts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL, principal_type VARCHAR(24) NOT NULL DEFAULT 'USER',
                    principal_id VARCHAR(100) NOT NULL, context_type VARCHAR(24) NOT NULL,
                    project_id VARCHAR(64) NULL, act_as_tenant VARCHAR(100) NULL,
                    source VARCHAR(24) NOT NULL DEFAULT 'EXPLICIT_SWITCH',
                    version INT NOT NULL DEFAULT 1, is_default TINYINT(1) NOT NULL DEFAULT 0,
                    last_validated_at VARCHAR(32), last_accessed_at VARCHAR(32),
                    created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_cuc (principal_type, principal_id, context_type),
                    KEY idx_cuc_recent (principal_type, principal_id, last_accessed_at),
                    KEY idx_cuc_tenant (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS collaboration_user_contexts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
                    principal_type TEXT NOT NULL DEFAULT 'USER', principal_id TEXT NOT NULL,
                    context_type TEXT NOT NULL, project_id TEXT, act_as_tenant TEXT,
                    source TEXT NOT NULL DEFAULT 'EXPLICIT_SWITCH', version INTEGER NOT NULL DEFAULT 1,
                    is_default INTEGER NOT NULL DEFAULT 0, last_validated_at TEXT, last_accessed_at TEXT,
                    created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_cuc ON collaboration_user_contexts(principal_type, principal_id, context_type)");
            }
        } catch (\Throwable $e) { /* 존재 시 무영향 */ }
    }

    /** 저장된 Context(기본/최근). 없으면 null. */
    private static function storedContext(\PDO $pdo, string $principalType, string $principalId, string $type): ?array
    {
        try {
            $st = $pdo->prepare("SELECT * FROM collaboration_user_contexts
                                 WHERE principal_type=? AND principal_id=? AND context_type=? LIMIT 1");
            $st->execute([$principalType, $principalId, $type]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            return $r ?: null;
        } catch (\Throwable $e) { return null; }
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 2. Context Option Provider (명세 §16) — 실재하는 축만 구현
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * TENANT 옵션.
     *
     * ★실측: 일반 회원은 **소속 테넌트가 1개뿐**이라 전환 대상이 없다(app_user.tenant_id 단일).
     *   진짜 멀티테넌트는 ① 대행사(agency_client_link approved) ② admin 의 platform_growth act-as 두 가지뿐이다.
     *   따라서 "다중 소속 사용자에게만 노출"(명세 §28)이 자연히 성립한다.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function tenantOptions(\PDO $pdo, array $user, string $currentTenant): array
    {
        $opts = [];
        $selfTenant = (string)($user['tenant_id'] ?? $currentTenant);
        $opts[] = [
            'type' => 'TENANT', 'public_id' => $selfTenant,
            'name' => (string)($user['company'] ?? $user['name'] ?? $selfTenant),
            'status' => 'ACTIVE', 'selectable' => true, 'external' => false,
            'current' => $currentTenant === $selfTenant, 'badges' => [], 'metadata' => ['origin' => 'OWN'],
        ];

        // ① 대행사 위임 — 승인된 클라이언트 테넌트만(revoked/pending 제외 = 접근 불가 Context 미노출 §6)
        $agencyId = (int)($user['agency_id'] ?? 0);
        if ($agencyId > 0) {
            try {
                $st = $pdo->prepare("SELECT client_tenant_id, client_name, status FROM agency_client_link
                                     WHERE agency_id=? AND status='approved' AND revoked_at IS NULL ORDER BY client_name LIMIT 200");
                $st->execute([$agencyId]);
                foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                    $tid = (string)$r['client_tenant_id'];
                    if ($tid === $selfTenant) continue;
                    $opts[] = [
                        'type' => 'TENANT', 'public_id' => $tid,
                        'name' => (string)($r['client_name'] ?: $tid),
                        'status' => 'ACTIVE', 'selectable' => true, 'external' => true,
                        'current' => $currentTenant === $tid, 'badges' => ['AGENCY'],
                        'metadata' => ['origin' => 'AGENCY_DELEGATION'],
                    ];
                }
            } catch (\Throwable $e) { /* 테이블 부재 = 위임 없음 */ }
        }

        // ② 플랫폼 관리자 act-as — 오직 'platform_growth' 리터럴만(UserAuth::authedTenant 와 동일 규칙)
        $isAdmin = strtolower((string)($user['plan'] ?? '')) === 'admin' || strtolower((string)($user['plans'] ?? '')) === 'admin';
        if ($isAdmin) {
            $opts[] = [
                'type' => 'TENANT', 'public_id' => 'platform_growth', 'name' => '플랫폼 성장(자체 운영)',
                'status' => 'ACTIVE', 'selectable' => true, 'external' => false,
                'current' => $currentTenant === 'platform_growth', 'badges' => ['ADMIN'],
                'metadata' => ['origin' => 'PLATFORM_ACT_AS', 'header' => 'X-Act-As-Tenant'],
            ];
        }
        return $opts;
    }

    /**
     * PROJECT 옵션 — 현재 테넌트 범위 안에서만.
     * ★Archive/Completed 는 기본 목록에서 제외(명세 §27·§56) — `include_archived=1` 로만 조회.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function projectOptions(\PDO $pdo, string $tenant, array $q = []): array
    {
        $search = trim((string)($q['search'] ?? ''));
        $includeArchived = ($q['include_archived'] ?? '') === '1';
        $limit = max(1, min(100, (int)($q['per_page'] ?? 30)));
        $offset = max(0, ((int)($q['page'] ?? 1) - 1) * $limit);

        $where = ['tenant_id = ?'];
        $params = [$tenant];
        if (!$includeArchived) { $where[] = "status NOT IN ('archived','completed')"; }
        if ($search !== '') { $where[] = 'name LIKE ?'; $params[] = '%' . $search . '%'; }

        $rows = [];
        try {
            $sql = 'SELECT id, name, status, owner_user_id, updated_at FROM pm_projects WHERE '
                 . implode(' AND ', $where) . ' ORDER BY updated_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
            $st = $pdo->prepare($sql);
            $st->execute($params);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { /* 테이블 부재 = 빈 목록 */ }

        $out = [];
        foreach ($rows as $r) {
            $status = strtoupper((string)$r['status']);
            $out[] = [
                'type' => 'PROJECT', 'public_id' => (string)$r['id'], 'name' => (string)$r['name'],
                'status' => $status,
                // Archive/Suspended 는 자동 선택 대상이 아니다(§21·§27) — 표시하더라도 selectable=false
                'selectable' => !in_array($status, ['ARCHIVED'], true),
                'external' => false, 'current' => false, 'badges' => [],
                'metadata' => ['owner_user_id' => $r['owner_user_id'] ?? null, 'updated_at' => $r['updated_at'] ?? null],
            ];
        }
        return $out;
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 3. Context Validator (명세 §10·§11)
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * Context 후보를 검증한다. Boolean 이 아니라 사유·복구안을 함께 반환한다(§11).
     *
     * @param array $candidate ['tenant_id'=>?, 'project_id'=>?]
     * @return array{valid:bool,status:string,reason_code:string,context:?array,invalid_fields:array,recommended_fallbacks:array,requires_user_selection:bool,decision_id:string}
     */
    public static function validateCandidate(
        \PDO $pdo,
        array $user,
        string $sessionTenant,
        array $candidate,
        array $allowedTenants
    ): array {
        $decision = 'ctxdec_' . substr(sha1(json_encode([$candidate, $sessionTenant, microtime(true)]) ?: ''), 0, 16);
        $mk = static fn(bool $v, string $st, string $rc, ?array $ctx, array $inv = [], array $fb = [], bool $sel = false): array => [
            'valid' => $v, 'status' => $st, 'reason_code' => $rc, 'context' => $ctx,
            'invalid_fields' => $inv, 'recommended_fallbacks' => $fb, 'requires_user_selection' => $sel,
            'decision_id' => '',
        ];

        $tenant = trim((string)($candidate['tenant_id'] ?? ''));
        $project = trim((string)($candidate['project_id'] ?? ''));

        // ① Tenant 필수
        if ($tenant === '') {
            $r = $mk(false, self::STATUS_SELECTION_REQUIRED, 'CONTEXT_TENANT_REQUIRED', null, ['tenant_id'], [], true);
            $r['decision_id'] = $decision;
            return $r;
        }

        // ② ★Tenant Membership — 요청 값을 절대 신뢰하지 않는다(§6 Cross-Tenant 주입 차단).
        //    허용 목록은 서버가 계산한 것(자기 테넌트 + 승인된 대행사 위임 + admin act-as)뿐이다.
        if (!in_array($tenant, $allowedTenants, true)) {
            $r = $mk(false, self::STATUS_INVALID_TENANT, 'CONTEXT_ACCESS_DENIED', null, ['tenant_id'],
                // ★다른 Tenant 로 자동 전환하지 않는다(§9) — 자기 테넌트만 복구안으로 제시
                [['type' => 'TENANT', 'public_id' => $sessionTenant]], false);
            $r['decision_id'] = $decision;
            return $r;
        }

        // ③ Project — 지정된 경우에만 검증
        if ($project !== '') {
            $row = null;
            try {
                $st = $pdo->prepare('SELECT id, tenant_id, status, name FROM pm_projects WHERE id = ? LIMIT 1');
                $st->execute([$project]);
                $row = $st->fetch(\PDO::FETCH_ASSOC) ?: null;
            } catch (\Throwable $e) { $row = null; }

            if ($row === null) {
                // ★존재 여부를 과도하게 노출하지 않는다(§21·§48) — 타 테넌트 프로젝트도 동일하게 NOT_FOUND
                $r = $mk(false, self::STATUS_INVALID_PROJECT, 'CONTEXT_NOT_FOUND', null, ['project_id'],
                    [['type' => 'TENANT', 'public_id' => $tenant]], false);
                $r['decision_id'] = $decision;
                return $r;
            }
            // ④ 계층 정합성 — 프로젝트가 그 테넌트에 속하는가(§10)
            if ((string)$row['tenant_id'] !== $tenant) {
                $r = $mk(false, self::STATUS_MISMATCH, 'CONTEXT_HIERARCHY_MISMATCH', null, ['project_id', 'tenant_id'],
                    [['type' => 'TENANT', 'public_id' => $tenant]], false);
                $r['decision_id'] = $decision;
                return $r;
            }
            // ⑤ 리소스 상태 — Archive 는 활성 Context 로 자동 선택 금지(§6·§21)
            if (strtolower((string)$row['status']) === 'archived') {
                $r = $mk(false, self::STATUS_ARCHIVED, 'CONTEXT_ARCHIVED', null, ['project_id'],
                    [['type' => 'TENANT', 'public_id' => $tenant]], false);
                $r['decision_id'] = $decision;
                return $r;
            }
        }

        $ctx = [
            'tenant_id' => $tenant,
            'organization_id' => null,   // 조직=테넌트(부재 축)
            'workspace_id' => null,      // 워크스페이스 엔티티 부재
            'team_id' => null,           // 팀 엔티티 부재
            'project_id' => $project !== '' ? $project : null,
        ];
        $r = $mk(true, self::STATUS_VALID, 'OK', $ctx);
        $r['decision_id'] = $decision;
        return $r;
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 4. Context Resolver (명세 §9 우선순위)
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * 1 검증된 Route Context → 2 명시적 전환 → 3 사용자 기본 → 4 최근 → 5 세션 → 6 안전 폴백.
     *
     * @return array{context:array,source:string,version:int,validation:array,fallback_applied:bool}
     */
    public static function resolveContext(
        \PDO $pdo,
        array $user,
        string $sessionTenant,
        array $routeCandidate,
        array $allowedTenants,
        string $principalType,
        string $principalId
    ): array {
        $attempts = [];

        // ① Route Context — 최우선이되 반드시 검증을 통과해야 한다(§9)
        if (($routeCandidate['tenant_id'] ?? '') !== '' || ($routeCandidate['project_id'] ?? '') !== '') {
            $cand = [
                'tenant_id' => (string)($routeCandidate['tenant_id'] ?? $sessionTenant),
                'project_id' => (string)($routeCandidate['project_id'] ?? ''),
            ];
            $v = self::validateCandidate($pdo, $user, $sessionTenant, $cand, $allowedTenants);
            $attempts[] = ['source' => 'ROUTE', 'status' => $v['status']];
            if ($v['valid']) return ['context' => $v['context'], 'source' => 'ROUTE', 'version' => 0, 'validation' => $v, 'fallback_applied' => false, 'attempts' => $attempts];
        }

        // ③④ 사용자 기본/최근 저장 Context
        $stored = self::storedContext($pdo, $principalType, $principalId, 'PROJECT');
        if ($stored !== null) {
            $cand = ['tenant_id' => (string)($stored['tenant_id'] ?: $sessionTenant), 'project_id' => (string)($stored['project_id'] ?? '')];
            $v = self::validateCandidate($pdo, $user, $sessionTenant, $cand, $allowedTenants);
            $src = ((int)($stored['is_default'] ?? 0) === 1) ? 'USER_DEFAULT' : 'RECENT_CONTEXT';
            $attempts[] = ['source' => $src, 'status' => $v['status']];
            if ($v['valid']) return ['context' => $v['context'], 'source' => $src, 'version' => (int)($stored['version'] ?? 1), 'validation' => $v, 'fallback_applied' => false, 'attempts' => $attempts];
        }

        // ⑤ 세션 테넌트(프로젝트 없음)
        $v = self::validateCandidate($pdo, $user, $sessionTenant, ['tenant_id' => $sessionTenant], $allowedTenants);
        $attempts[] = ['source' => 'SESSION', 'status' => $v['status']];
        if ($v['valid']) {
            // 앞 단계에서 무효 Context 가 있었으면 폴백이 적용된 것이다(사용자에게 알린다 §21)
            $fallback = count($attempts) > 1;
            return ['context' => $v['context'], 'source' => $fallback ? 'SAFE_FALLBACK' : 'SESSION', 'version' => 0, 'validation' => $v, 'fallback_applied' => $fallback, 'attempts' => $attempts];
        }

        // ⑦ 선택 필요 — ★다른 테넌트로 임의 자동 전환하지 않는다
        return [
            'context' => ['tenant_id' => null, 'organization_id' => null, 'workspace_id' => null, 'team_id' => null, 'project_id' => null],
            'source' => 'SAFE_FALLBACK', 'version' => 0, 'validation' => $v, 'fallback_applied' => true, 'attempts' => $attempts,
        ];
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 5. 공통 헬퍼
     * ══════════════════════════════════════════════════════════════════════ */

    /** 현재 사용자가 접근 가능한 테넌트 화이트리스트(서버 계산 — 요청값 미신뢰). */
    private static function allowedTenants(\PDO $pdo, array $user, string $sessionTenant): array
    {
        $out = [];
        foreach (self::tenantOptions($pdo, $user, $sessionTenant) as $o) {
            if (!empty($o['selectable'])) $out[] = (string)$o['public_id'];
        }
        if (!in_array($sessionTenant, $out, true)) $out[] = $sessionTenant;
        return array_values(array_unique($out));
    }

    private static function principalOf(?array $user, string $tenant): array
    {
        $teamRole = strtolower(trim((string)($user['team_role'] ?? '')));
        $type = match ($teamRole) { 'guest' => 'GUEST', 'partner' => 'EXTERNAL_PARTNER', default => 'USER' };
        return [$type, (string)($user['id'] ?? $tenant)];
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 6. Endpoints
     * ══════════════════════════════════════════════════════════════════════ */

    /** GET /v425/pm/context — 현재 Context + 부재 축 정직 표기. */
    public static function current(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        self::ensureContextTable($g['pdo'], $g['isDemo']);

        $user = [];
        try { $user = (array)(\Genie\Handlers\UserAuth::authedUser($req) ?? []); } catch (\Throwable $e) { }
        [$ptype, $pid] = self::principalOf($user, $g['tenant']);
        $allowed = self::allowedTenants($g['pdo'], $user, $g['tenant']);

        $q = $req->getQueryParams();
        $route = ['tenant_id' => '', 'project_id' => (string)($q['project_id'] ?? '')];
        $res = self::resolveContext($g['pdo'], $user, $g['tenant'], $route, $allowed, $ptype, $pid);

        return self::json($resp, [
            'ok' => true,
            'context' => $res['context'],
            'source' => $res['source'],
            'context_version' => $res['version'],
            'fallback_applied' => $res['fallback_applied'],
            'validation' => ['status' => $res['validation']['status'], 'reason_code' => $res['validation']['reason_code']],
            'principal' => ['type' => $ptype],
            'switchable_types' => self::CONTEXT_TYPES,
            // ★부재 축을 빈 목록으로 감추지 않고 사유와 함께 노출한다(정직 미산출).
            'unavailable_axes' => self::ABSENT_AXES,
        ]);
    }

    /** GET /v425/pm/context/options — 전환 가능 Context. 접근 불가 항목은 애초에 포함되지 않는다. */
    public static function options(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $q = $req->getQueryParams();
        $type = strtoupper(trim((string)($q['type'] ?? 'TENANT')));

        $user = [];
        try { $user = (array)(\Genie\Handlers\UserAuth::authedUser($req) ?? []); } catch (\Throwable $e) { }
        [$ptype] = self::principalOf($user, $g['tenant']);

        // ★게스트/외부 파트너에게 전체 조직 구조를 노출하지 않는다(§6·§48).
        if (in_array($ptype, ['GUEST', 'EXTERNAL_PARTNER'], true)) {
            return self::json($resp, ['ok' => true, 'type' => $type, 'options' => [], 'count' => 0,
                'restricted' => true, 'reason' => 'external_principal_scope_limited'], 200);
        }

        if (isset(self::ABSENT_AXES[$type])) {
            // 존재하지 않는 축 — 빈 배열로 '지금 없음'인 척하지 않고 available=false + 사유
            return self::json($resp, ['ok' => true, 'type' => $type, 'available' => false,
                'reason' => 'axis_not_present', 'message' => self::ABSENT_AXES[$type], 'options' => [], 'count' => 0]);
        }
        if (!in_array($type, self::CONTEXT_TYPES, true)) {
            return self::json($resp, ['ok' => false, 'error' => 'unsupported_context_type', 'supported' => self::CONTEXT_TYPES], 422);
        }

        $options = $type === 'TENANT'
            ? self::tenantOptions($g['pdo'], $user, $g['tenant'])
            : self::projectOptions($g['pdo'], $g['tenant'], $q);

        return self::json($resp, ['ok' => true, 'available' => true, 'type' => $type,
            'options' => $options, 'count' => count($options), 'tenant' => $g['tenant']]);
    }

    /**
     * POST /v425/pm/context/switch — ★원자적 전환(§30).
     * 전체 계층을 먼저 검증하고, 실패 시 아무것도 저장하지 않으며 기존 Context 를 유지한다.
     */
    public static function switchContext(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        self::ensureContextTable($g['pdo'], $g['isDemo']);

        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }

        $user = [];
        try { $user = (array)(\Genie\Handlers\UserAuth::authedUser($req) ?? []); } catch (\Throwable $e) { }
        [$ptype, $pid] = self::principalOf($user, $g['tenant']);

        if (in_array($ptype, ['GUEST', 'EXTERNAL_PARTNER'], true)) {
            return self::json($resp, ['ok' => false, 'error' => 'CONTEXT_ACCESS_DENIED',
                'message' => '외부 협업자는 컨텍스트를 전환할 수 없습니다.'], 403);
        }

        $allowed = self::allowedTenants($g['pdo'], $user, $g['tenant']);
        $candidate = [
            'tenant_id' => (string)($b['tenant_id'] ?? $g['tenant']),
            'project_id' => (string)($b['project_id'] ?? ''),
        ];

        // ★전체 계층 선검증 — 부분 저장 없음
        $v = self::validateCandidate($g['pdo'], $user, $g['tenant'], $candidate, $allowed);
        if (!$v['valid']) {
            $http = match ($v['status']) {
                self::STATUS_INVALID_TENANT, self::STATUS_PERMISSION_DENIED => 403,
                self::STATUS_INVALID_PROJECT => 404,
                self::STATUS_MISMATCH, self::STATUS_ARCHIVED => 422,
                self::STATUS_SELECTION_REQUIRED => 422,
                default => 422,
            };
            // 고위험(교차 테넌트) 시도는 감사에 남긴다(§48)
            if ($v['status'] === self::STATUS_INVALID_TENANT) {
                try {
                    self::auditLog($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $pid,
                        'entity_type' => 'collaboration_context', 'entity_id' => 'cross_tenant_attempt',
                        'action' => 'context_switch_denied', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
                } catch (\Throwable $e) { }
            }
            return self::json($resp, [
                'ok' => false, 'error' => $v['reason_code'], 'status' => $v['status'],
                'invalid_fields' => $v['invalid_fields'], 'recommended_fallbacks' => $v['recommended_fallbacks'],
                'requires_user_selection' => $v['requires_user_selection'], 'decision_id' => $v['decision_id'],
                // 실패 시 기존 Context 유지를 명시한다(§30·§38)
                'context_unchanged' => true,
            ], $http);
        }

        // 낙관적 동시성 — expected_version 불일치 시 최신 반환(§19)
        $stored = self::storedContext($g['pdo'], $ptype, $pid, 'PROJECT');
        $currentVersion = (int)($stored['version'] ?? 0);
        $expected = array_key_exists('expected_version', $b) ? (int)$b['expected_version'] : null;
        if ($expected !== null && $currentVersion !== 0 && $expected !== $currentVersion) {
            return self::json($resp, [
                'ok' => false, 'error' => 'CONTEXT_VERSION_CONFLICT', 'status' => 'CONTEXT_VERSION_CONFLICT',
                'current_version' => $currentVersion,
                'current_context' => ['tenant_id' => $stored['tenant_id'] ?? null, 'project_id' => $stored['project_id'] ?? null],
                'context_unchanged' => true,
            ], 409);
        }

        $now = gmdate('c');
        $newVersion = $currentVersion + 1;
        $isMy = $g['pdo']->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO collaboration_user_contexts
               (tenant_id,principal_type,principal_id,context_type,project_id,source,version,is_default,last_validated_at,last_accessed_at,created_at,updated_at)
               VALUES (?,?,?,'PROJECT',?,'EXPLICIT_SWITCH',?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE tenant_id=VALUES(tenant_id), project_id=VALUES(project_id),
                 source=VALUES(source), version=VALUES(version), is_default=VALUES(is_default),
                 last_validated_at=VALUES(last_validated_at), last_accessed_at=VALUES(last_accessed_at), updated_at=VALUES(updated_at)"
            : "INSERT INTO collaboration_user_contexts
               (tenant_id,principal_type,principal_id,context_type,project_id,source,version,is_default,last_validated_at,last_accessed_at,created_at,updated_at)
               VALUES (?,?,?,'PROJECT',?,'EXPLICIT_SWITCH',?,?,?,?,?,?)
               ON CONFLICT(principal_type,principal_id,context_type) DO UPDATE SET
                 tenant_id=excluded.tenant_id, project_id=excluded.project_id, source=excluded.source,
                 version=excluded.version, is_default=excluded.is_default,
                 last_validated_at=excluded.last_validated_at, last_accessed_at=excluded.last_accessed_at, updated_at=excluded.updated_at";
        try {
            $g['pdo']->prepare($sql)->execute([
                $v['context']['tenant_id'], $ptype, $pid, $v['context']['project_id'],
                $newVersion, !empty($b['set_default']) ? 1 : (int)($stored['is_default'] ?? 0),
                $now, $now, $now, $now,
            ]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'CONTEXT_SWITCH_FAILED', 'context_unchanged' => true], 500);
        }

        // 테넌트가 바뀌는 전환은 고위험 — 감사 기록(§44.2 는 전용 테이블 대신 기존 pm_audit_log 재사용)
        if ($v['context']['tenant_id'] !== $g['tenant']) {
            try {
                self::auditLog($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => $pid,
                    'entity_type' => 'collaboration_context', 'entity_id' => (string)$v['context']['tenant_id'],
                    'action' => 'context_tenant_switched', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
            } catch (\Throwable $e) { }
        }

        return self::json($resp, [
            'ok' => true,
            'context' => $v['context'],
            'context_version' => $newVersion,
            'source' => 'EXPLICIT_SWITCH',
            // 프론트가 테넌트 종속 캐시를 비울 근거(§39)
            'cache_invalidation' => [
                'token' => substr(sha1((string)json_encode($v['context']) . $newVersion), 0, 16),
                'tenant_changed' => $v['context']['tenant_id'] !== $g['tenant'],
                'clear_scopes' => $v['context']['tenant_id'] !== $g['tenant']
                    ? ['workspace', 'project', 'task', 'notification', 'badge', 'permission', 'query']
                    : ['project', 'task'],
            ],
            'redirect_target' => $v['context']['project_id'] ? '/pm/projects/' . $v['context']['project_id'] : '/pm',
            'warnings' => $v['context']['tenant_id'] !== $g['tenant']
                ? ['테넌트가 전환되었습니다. 이전 테넌트의 데이터는 화면에서 제거됩니다.'] : [],
            'decision_id' => $v['decision_id'],
        ]);
    }

    /** POST /v425/pm/context/validate — 딥링크 복구·진단용. */
    public static function validateContext(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }

        $user = [];
        try { $user = (array)(\Genie\Handlers\UserAuth::authedUser($req) ?? []); } catch (\Throwable $e) { }
        $allowed = self::allowedTenants($g['pdo'], $user, $g['tenant']);
        $v = self::validateCandidate($g['pdo'], $user, $g['tenant'], [
            'tenant_id' => (string)($b['tenant_id'] ?? $g['tenant']),
            'project_id' => (string)($b['project_id'] ?? ''),
        ], $allowed);

        return self::json($resp, [
            'ok' => true, 'valid' => $v['valid'], 'status' => $v['status'], 'reason_code' => $v['reason_code'],
            'invalid_fields' => $v['invalid_fields'], 'recommended_fallbacks' => $v['recommended_fallbacks'],
            'requires_user_selection' => $v['requires_user_selection'], 'decision_id' => $v['decision_id'],
        ]);
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 7. Active Menu 판정 (명세 §24)
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * 현재 경로에 대한 활성 메뉴 키 + 조상 키.
     * ★단순 문자열 비교가 아니라 **Alias 해석 → 정확일치 → 최장 prefix(경계 '/') → 조상 체인** 순.
     *
     * @return array{active:?string,ancestors:array<int,string>,matched_by:string}
     */
    public static function resolveActiveMenu(array $registry, string $path): array
    {
        $items = $registry['items'] ?? [];
        $byKey = [];
        foreach ($items as $i) $byKey[(string)$i['menu_key']] = $i;

        // ① Alias(레거시 경로 포함) 해석
        $aliasTarget = Navigation::resolveAlias($registry, $path);
        if ($aliasTarget !== $path && isset($byKey[$aliasTarget])) {
            return ['active' => $aliasTarget, 'ancestors' => self::ancestorsOf($byKey, $aliasTarget), 'matched_by' => 'ALIAS'];
        }

        // ② route_name 정확 일치
        foreach ($items as $i) {
            if (($i['target']['route_name'] ?? null) === $path) {
                return ['active' => (string)$i['menu_key'], 'ancestors' => self::ancestorsOf($byKey, (string)$i['menu_key']), 'matched_by' => 'EXACT'];
            }
        }

        // ③ 최장 prefix(경계 '/' 보장 — '/pm' 이 '/pmx' 를 매칭하지 않는다)
        $best = null; $bestLen = -1;
        foreach ($items as $i) {
            $rn = (string)($i['target']['route_name'] ?? '');
            if ($rn === '' || $rn === '/') continue;
            if (str_starts_with($path, $rn . '/') && strlen($rn) > $bestLen) { $best = (string)$i['menu_key']; $bestLen = strlen($rn); }
        }
        if ($best !== null) {
            return ['active' => $best, 'ancestors' => self::ancestorsOf($byKey, $best), 'matched_by' => 'PREFIX'];
        }
        return ['active' => null, 'ancestors' => [], 'matched_by' => 'NONE'];
    }

    /** @param array<string,array<string,mixed>> $byKey @return array<int,string> */
    private static function ancestorsOf(array $byKey, string $key): array
    {
        $out = [];
        $cur = $byKey[$key]['parent_menu_key'] ?? null;
        $hops = 0;
        while ($cur !== null && $hops++ < 32) {
            $out[] = (string)$cur;
            $cur = $byKey[(string)$cur]['parent_menu_key'] ?? null;
        }
        return $out;
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 8. Breadcrumb Resolver (명세 §31·§32)
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * Registry(메뉴 계층) + Context + Resource(PM 프로젝트/태스크 실명)를 결합한다.
     *
     * ★안전: 리소스 이름은 DB 값이므로 **HTML 제어문자를 제거**해서 반환한다(§32 Escape).
     *   권한 없는 상위 리소스는 링크를 만들지 않는다. 다른 테넌트 링크는 생성하지 않는다.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function buildBreadcrumb(\PDO $pdo, array $registry, string $tenant, string $path): array
    {
        $safe = static fn(string $s): string => trim(preg_replace('/[\x00-\x1F<>]/u', '', $s) ?? '');
        $items = $registry['items'] ?? [];
        $byKey = [];
        foreach ($items as $i) $byKey[(string)$i['menu_key']] = $i;

        $crumbs = [];
        $active = self::resolveActiveMenu($registry, $path);

        // ① 메뉴 계층(조상 → 현재)
        if ($active['active'] !== null) {
            $chain = array_reverse($active['ancestors']);
            $chain[] = $active['active'];
            foreach ($chain as $k) {
                $it = $byKey[$k] ?? null;
                if ($it === null) continue;
                $isCurrent = ($k === $active['active']);
                $crumbs[] = [
                    'label' => $safe((string)($it['fallback_label'] ?? $k)),
                    'label_key' => $it['label_key'] ?? null,
                    'menu_key' => $k,
                    // SECTION 은 이동 대상이 없다 → 링크 생성 금지
                    'url' => ($it['type'] ?? '') === 'ITEM' ? ($it['target']['route_name'] ?? null) : null,
                    'current' => $isCurrent,
                    'clickable' => !$isCurrent && ($it['type'] ?? '') === 'ITEM',
                    'icon' => $it['icon_key'] ?? null,
                    'metadata' => ['source' => 'REGISTRY'],
                ];
            }
        }

        // ② 리소스 계층 — /pm/projects/{id}[/sub] · /pm/tasks/{id}
        if (preg_match('#^/pm/projects/([A-Za-z0-9_\-]{1,64})(?:/([a-z]+))?$#', $path, $m)) {
            $row = null;
            try {
                // ★테넌트 격리 — 반드시 tenant_id 조건. 타 테넌트 리소스는 조회 자체가 안 된다.
                $st = $pdo->prepare('SELECT id, name, status FROM pm_projects WHERE id=? AND tenant_id=? LIMIT 1');
                $st->execute([$m[1], $tenant]);
                $row = $st->fetch(\PDO::FETCH_ASSOC) ?: null;
            } catch (\Throwable $e) { $row = null; }
            if ($row !== null) {
                $crumbs[] = [
                    'label' => $safe((string)$row['name']), 'label_key' => null, 'menu_key' => null,
                    'url' => '/pm/projects/' . $m[1], 'current' => !isset($m[2]),
                    'clickable' => isset($m[2]), 'icon' => 'folder',
                    'metadata' => ['source' => 'RESOURCE', 'resource_type' => 'PROJECT', 'status' => strtoupper((string)$row['status'])],
                ];
                if (isset($m[2])) {
                    $subLabels = ['board' => '보드', 'gantt' => '간트', 'tasks' => '작업', 'milestones' => '마일스톤',
                                  'activity' => '활동', 'settings' => '설정', 'raid' => 'RAID', 'evm' => 'EVM'];
                    $crumbs[] = [
                        'label' => $subLabels[$m[2]] ?? $m[2], 'label_key' => null, 'menu_key' => null,
                        'url' => null, 'current' => true, 'clickable' => false, 'icon' => null,
                        'metadata' => ['source' => 'ROUTE'],
                    ];
                }
            }
            // ★리소스를 못 찾으면 크럼을 만들지 않는다 — 존재 여부를 링크로 노출하지 않는다(§48).
        }

        return $crumbs;
    }

    /** GET /v425/pm/breadcrumb?path=/pm/projects/xxx */
    public static function breadcrumb(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $reg = Navigation::registry();
        if ($reg === null) return self::json($resp, ['ok' => false, 'available' => false, 'reason' => 'registry_snapshot_unavailable'], 503);

        $path = (string)($req->getQueryParams()['path'] ?? '/');
        // 경로 형식 강제 — 임의 문자열/외부 URL 주입 차단(§48 Open Redirect)
        if ($path === '' || $path[0] !== '/' || str_contains($path, '//') || strlen($path) > 512) {
            return self::json($resp, ['ok' => false, 'error' => 'invalid_path'], 422);
        }
        return self::json($resp, [
            'ok' => true,
            'items' => self::buildBreadcrumb($g['pdo'], $reg, $g['tenant'], $path),
        ]);
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 9. Unified Sidebar API (명세 §26)
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * ★전환 스위치 = 기존 `tenant_collaboration_capabilities`(Part001) 재사용.
     *   신규 Feature Flag 저장소를 만들지 않는다(Part004-02 §19 권장 · 중복 신설 금지).
     */
    public static function sidebarEnabled(\PDO $pdo, string $tenant): bool
    {
        try {
            $st = $pdo->prepare("SELECT is_enabled FROM tenant_collaboration_capabilities
                                 WHERE tenant_id=? AND capability_key='collaboration.navigation.sidebar' LIMIT 1");
            $st->execute([$tenant]);
            $v = $st->fetchColumn();
            if ($v !== false && $v !== null) return (int)$v === 1;
        } catch (\Throwable $e) { /* 미설정 */ }
        return false;   // ★기본 OFF — 레거시 사이드바 유지(무후퇴)
    }

    /** GET /v425/pm/sidebar — Registry Tree + Context + Active Menu + Breadcrumb 를 한 응답으로. */
    public static function sidebar(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $reg = Navigation::registry();
        if ($reg === null) {
            return self::json($resp, ['ok' => false, 'available' => false,
                'reason' => 'registry_snapshot_unavailable',
                'fallback' => 'legacy_sidebar',
                'message' => '레지스트리 스냅샷이 없어 레거시 사이드바를 유지해야 합니다.'], 503);
        }
        self::ensureContextTable($g['pdo'], $g['isDemo']);

        $q = $req->getQueryParams();
        $platform = strtoupper((string)($q['platform'] ?? 'WEB_DESKTOP'));
        $path = (string)($q['path'] ?? '/dashboard');
        if ($path === '' || $path[0] !== '/' || strlen($path) > 512) $path = '/dashboard';

        $user = [];
        try { $user = (array)(\Genie\Handlers\UserAuth::authedUser($req) ?? []); } catch (\Throwable $e) { }
        [$ptype, $pid] = self::principalOf($user, $g['tenant']);
        $allowed = self::allowedTenants($g['pdo'], $user, $g['tenant']);
        $ctxRes = self::resolveContext($g['pdo'], $user, $g['tenant'], ['project_id' => (string)($q['project_id'] ?? '')], $allowed, $ptype, $pid);

        // Navigation Resolver 재사용 — 사이드바가 권한을 자체 재구성하지 않는다(§41)
        $navCtx = [
            'tenant_id' => $g['tenant'], 'principal_type' => $ptype, 'principal_id' => $pid,
            'plan' => strtolower((string)($user['plan'] ?? $user['plans'] ?? 'free')),
            'platform' => $platform, 'locale' => (string)($q['locale'] ?? 'ko'),
            'workspace_id' => null, 'project_id' => $ctxRes['context']['project_id'] ?? null,
            'membership_status' => 'ACTIVE', 'feature_flags' => null,
            'capabilities' => self::capabilities($g['pdo'], $g['tenant']),
        ];
        $tree = Navigation::resolve($reg, $navCtx, [
            'plan_menu_access' => self::planMenuAccessOf($g['pdo']),
            'global_visibility' => self::globalVisibilityOf($g['pdo']),
            'tenant_overrides' => [],
        ]);

        $active = self::resolveActiveMenu($reg, $path);
        $payload = [
            'ok' => true,
            'available' => true,
            'enabled' => self::sidebarEnabled($g['pdo'], $g['tenant']),   // ★기본 false = 레거시 유지
            'registry_version' => $reg['registry_version'] ?? null,
            'context_version' => $ctxRes['version'],
            'context' => $ctxRes['context'],
            'context_source' => $ctxRes['source'],
            'switchers' => [
                'tenant' => ['type' => 'TENANT', 'available' => true, 'multi' => count($allowed) > 1],
                'project' => ['type' => 'PROJECT', 'available' => true],
                'unavailable' => self::ABSENT_AXES,
            ],
            'sections' => $tree['tree'],
            'active_menu' => $active['active'],
            'active_ancestors' => $active['ancestors'],
            'active_matched_by' => $active['matched_by'],
            'breadcrumb' => self::buildBreadcrumb($g['pdo'], $reg, $g['tenant'], $path),
            'state' => ['default' => 'EXPANDED', 'supported' => ['EXPANDED', 'COLLAPSED', 'MINI', 'MOBILE_OVERLAY', 'HIDDEN']],
            'meta' => ['visible_count' => $tree['stats']['visible'], 'generated_at' => gmdate('c')],
        ];

        $etag = '"sb-' . substr(sha1((string)json_encode([$reg['registry_version'] ?? '', $payload['sections'], $active, $payload['context']])), 0, 16) . '"';
        if (trim($req->getHeaderLine('If-None-Match')) === $etag) {
            return $resp->withStatus(304)->withHeader('ETag', $etag)->withHeader('Cache-Control', 'private, max-age=0, must-revalidate');
        }
        return self::json($resp, $payload)
            ->withHeader('ETag', $etag)
            ->withHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    }

    /* ── Navigation.php 의 private 소스를 재사용하기 위한 얇은 래퍼 ─────────── */

    private static function capabilities(\PDO $pdo, string $tenant): array
    {
        $out = [];
        try {
            $st = $pdo->prepare("SELECT c.capability_key, c.status, t.is_enabled
                FROM collaboration_capabilities c
                LEFT JOIN tenant_collaboration_capabilities t
                  ON t.capability_key = c.capability_key AND t.tenant_id = ?");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['capability_key']] = $r['is_enabled'] !== null
                    ? ((int)$r['is_enabled'] === 1)
                    : in_array((string)$r['status'], ['ENABLED', 'PARTIAL'], true);
            }
        } catch (\Throwable $e) { }
        return $out;
    }

    private static function planMenuAccessOf(\PDO $pdo): array
    {
        $out = [];
        try {
            foreach ($pdo->query('SELECT plan_id, menu_key FROM plan_menu_access WHERE enabled = 1')->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['plan_id']][] = (string)$r['menu_key'];
            }
        } catch (\Throwable $e) { }
        return $out;
    }

    private static function globalVisibilityOf(\PDO $pdo): array
    {
        $out = [];
        try {
            foreach ($pdo->query('SELECT menu_key, visibility FROM menu_tree')->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $k = (string)($r['menu_key'] ?? '');
                if ($k !== '') $out[$k] = (string)($r['visibility'] ?? 'visible');
            }
        } catch (\Throwable $e) { }
        return $out;
    }
}
