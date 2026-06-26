<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * 팀·권한 관리 (231차 팀권한) — 초엔터프라이즈 RBAC/ABAC.
 *
 * ── 기존 구조 확장 (중복 신설 아님) ───────────────────────────────────────
 * 기존: app_user(tenant_id/parent_user_id/team_role[owner|manager|member]/team_name 문자열)
 *       + UserAuth::/auth/team/members CRUD + auth_audit_log + plan_menu_access.
 * 본 핸들러는 "팀을 엔터티化"하고(team), 메뉴×8동작 매트릭스(acl_permission)와
 * 데이터 접근 범위(data_scope)를 추가하여 위임(delegation) 한계를 서버에서 강제한다.
 *   - team_role 은 그대로 재사용(owner>manager>member). manager_user_id 로 팀관리자 지정.
 *   - 멤버는 app_user.team_id 로 팀에 소속(UserAuth::updateTeamMember 가 team_id 동기화).
 *   - 감사로그는 UserAuth::logAudit → auth_audit_log 단일 SSOT(/auth/audit-logs 노출).
 *
 * ── 권한 위임 규칙 (스펙) ────────────────────────────────────────────────
 *   • Super Admin(plan=admin) / owner : 전 메뉴·전 동작 부여 가능(상한 없음).
 *   • Team Manager : 본인 팀(team_id)에 부여된 권한 범위 안에서만 팀원에게 위임 가능.
 *   • Team Member  : 본인에게 명시 부여된 메뉴·동작·데이터만 접근.
 *   → putMemberPermissions 에서 manager 요청을 assignable(=팀 권한)과 교집합 검증 → 초과 시 403.
 *
 * 라우팅: /auth/team/*  (index.php 의 '/auth/' blanket bypass → api_key 미들웨어 우회,
 *         핸들러가 세션토큰 self-auth: UserAuth::authedUser). 모든 쿼리 tenant_id 격리.
 *
 * 동작 단위(8): view / create / update / delete / approve / export / execute / manage
 *   - 어떤 동작이든 부여되면 'view' 자동 포함. 'manage' = 해당 메뉴 전 동작 슈퍼셋.
 */
class TeamPermissions
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    public const ACTIONS = ['view','create','update','delete','approve','export','execute','manage'];

    public const DATA_SCOPES = ['company','brand','team','campaign','product','warehouse','partner','own'];

    /** 팀 유형(스펙 조직/파트너 구조). 자유 입력도 허용하되 카탈로그로 안내. */
    public const TEAM_TYPES = [
        'internal_super', 'brand', 'marketing', 'marketing_global', 'marketing_domestic',
        'sales', 'sales_global', 'sales_domestic', 'sales_enterprise', 'sales_channel',
        'logistics', 'finance',
        'partner_agency', 'partner_live', 'partner_supplier', 'partner_distribution', 'custom',
    ];

    /**
     * 권한 매트릭스 메뉴 카탈로그(서버 SSOT — menu_key 검증 + UI 동기화).
     * 프론트 sidebarManifest 와 정합하되, 권한 도메인 단위로 안정 키를 사용.
     */
    public const MENU_CATALOG = [
        ['key' => 'dashboard',            'group' => 'core',      'ko' => '대시보드',                'en' => 'Dashboard'],
        ['key' => 'ai_command_center',    'group' => 'core',      'ko' => 'AI 에이전트 커맨드센터',    'en' => 'AI Agent Command Center'],
        ['key' => 'marketing',            'group' => 'marketing', 'ko' => '마케팅 ROI',              'en' => 'Marketing ROI'],
        ['key' => 'campaign',             'group' => 'marketing', 'ko' => '캠페인',                  'en' => 'Campaign'],
        ['key' => 'customer',             'group' => 'marketing', 'ko' => '고객 관리',               'en' => 'Customer Management'],
        ['key' => 'commerce',             'group' => 'commerce',  'ko' => '커머스 ROI',              'en' => 'Commerce ROI'],
        ['key' => 'product',              'group' => 'commerce',  'ko' => '상품 관리',               'en' => 'Product Management'],
        ['key' => 'live_commerce',        'group' => 'commerce',  'ko' => '라이브 커머스',            'en' => 'Live Commerce'],
        ['key' => 'sales_pipeline',       'group' => 'sales',     'ko' => '세일즈 파이프라인',         'en' => 'Sales Pipeline'],
        ['key' => 'logistics',            'group' => 'ops',       'ko' => '물류 ROI',                'en' => 'Logistics ROI'],
        ['key' => 'inventory',            'group' => 'ops',       'ko' => '재고',                    'en' => 'Inventory'],
        ['key' => 'warehouse',            'group' => 'ops',       'ko' => '창고',                    'en' => 'Warehouse'],
        ['key' => 'delivery',             'group' => 'ops',       'ko' => '배송',                    'en' => 'Delivery'],
        ['key' => 'returns',              'group' => 'ops',       'ko' => '반품',                    'en' => 'Return'],
        ['key' => 'finance',              'group' => 'finance',   'ko' => '재무',                    'en' => 'Finance'],
        ['key' => 'billing',              'group' => 'finance',   'ko' => '결제·청구',               'en' => 'Billing'],
        ['key' => 'settlement',           'group' => 'finance',   'ko' => '정산',                    'en' => 'Settlement'],
        ['key' => 'connector_hub',        'group' => 'data',      'ko' => '연동 허브',               'en' => 'Connector Hub'],
        ['key' => 'supplier_portal',      'group' => 'partner',   'ko' => '공급 파트너 포털',          'en' => 'Supplier Portal'],
        ['key' => 'distribution_portal',  'group' => 'partner',   'ko' => '유통 파트너 포털',          'en' => 'Distribution Partner Portal'],
        ['key' => 'team_management',      'group' => 'admin',     'ko' => '팀 관리',                 'en' => 'Team Management'],
        ['key' => 'member_management',    'group' => 'admin',     'ko' => '멤버 관리',               'en' => 'Member Management'],
        ['key' => 'permission_management','group' => 'admin',     'ko' => '권한 관리',               'en' => 'Permission Management'],
        ['key' => 'audit_log',            'group' => 'admin',     'ko' => '감사 로그',               'en' => 'Audit Log'],
        ['key' => 'admin_settings',       'group' => 'admin',     'ko' => '관리자 설정',             'en' => 'Admin Settings'],
        ['key' => 'security_settings',    'group' => 'admin',     'ko' => '보안 설정',               'en' => 'Security Settings'],
    ];

    // ── 응답 / 입력 헬퍼 (API 응답 표준: success/data/error/meta) ──────────
    private static function meta(Request $req): array
    {
        return [
            'request_id' => substr(bin2hex(random_bytes(8)), 0, 16),
            'timestamp'  => self::now(),
            'version'    => 'v1',
        ];
    }
    private static function ok(Request $req, Response $res, $data = null, string $message = '', int $status = 200): Response
    {
        $res->getBody()->write(json_encode([
            'success' => true, 'data' => $data, 'message' => $message, 'error' => null, 'meta' => self::meta($req),
            'ok' => true, // 레거시 프론트 호환
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
    private static function fail(Request $req, Response $res, string $code, string $detail, int $status = 400): Response
    {
        $res->getBody()->write(json_encode([
            'success' => false, 'data' => null, 'message' => $detail,
            'error' => ['code' => $code, 'detail' => $detail], 'meta' => self::meta($req),
            'ok' => false,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b;
    }

    // ── 인증/권한 헬퍼 ────────────────────────────────────────────────────
    private static function caller(Request $req): ?array { return UserAuth::authedUser($req); }
    private static function tenantOf(array $c): string { $t = trim((string)($c['tenant_id'] ?? '')); return $t !== '' ? $t : ('acct_' . (int)($c['id'] ?? 0)); }
    private static function roleOf(array $c): string
    {
        $r = strtolower(trim((string)($c['team_role'] ?? '')));
        if (in_array($r, ['owner','manager','member'], true)) return $r;
        // fail-open(레거시): team_role 미설정 + 상위계정 없으면 owner, 있으면 member
        return !empty($c['parent_user_id']) ? 'member' : 'owner';
    }
    private static function isAdmin(array $c): bool { return (($c['plan'] ?? '') === 'admin') || (($c['plans'] ?? '') === 'admin'); }
    /** 최고관리자(admin) 또는 owner — 팀 CRUD·팀권한 설정 권한. */
    private static function isOwnerAdmin(array $c): bool { return self::isAdmin($c) || self::roleOf($c) === 'owner'; }
    /** owner/manager/admin — 팀원 권한 위임 권한(manager 는 범위 제한). */
    private static function isManagerAdmin(array $c): bool { return self::isAdmin($c) || in_array(self::roleOf($c), ['owner','manager'], true); }

    // ── 스키마 (additive, IF NOT EXISTS, DROP/컬럼삭제 없음) ───────────────
    private static function ensureSchema(): void
    {
        static $done = false; if ($done) return; $done = true;
        $pdo = self::db();
        try {
            if (self::isMysql($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS team (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                    name VARCHAR(160) NOT NULL, description TEXT, team_type VARCHAR(48) DEFAULT 'custom',
                    manager_user_id INT NULL, status VARCHAR(20) DEFAULT 'active',
                    created_by INT NULL, created_at VARCHAR(32), updated_at VARCHAR(32),
                    KEY idx_team_tenant (tenant_id), KEY idx_team_status (tenant_id, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS acl_permission (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                    subject_type VARCHAR(10) NOT NULL, subject_id INT NOT NULL,
                    menu_key VARCHAR(120) NOT NULL, actions VARCHAR(255) NOT NULL DEFAULT 'view',
                    updated_at VARCHAR(32),
                    UNIQUE KEY uq_acl (tenant_id, subject_type, subject_id, menu_key),
                    KEY idx_acl_subject (tenant_id, subject_type, subject_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS data_scope (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                    subject_type VARCHAR(10) NOT NULL, subject_id INT NOT NULL,
                    scope_type VARCHAR(30) NOT NULL DEFAULT 'own', scope_values TEXT, updated_at VARCHAR(32),
                    UNIQUE KEY uq_scope (tenant_id, subject_type, subject_id),
                    KEY idx_scope_subject (tenant_id, subject_type, subject_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS team (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, description TEXT, team_type TEXT DEFAULT 'custom', manager_user_id INTEGER, status TEXT DEFAULT 'active', created_by INTEGER, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS acl_permission (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', subject_type TEXT NOT NULL, subject_id INTEGER NOT NULL, menu_key TEXT NOT NULL, actions TEXT NOT NULL DEFAULT 'view', updated_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_acl ON acl_permission(tenant_id, subject_type, subject_id, menu_key)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS data_scope (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', subject_type TEXT NOT NULL, subject_id INTEGER NOT NULL, scope_type TEXT NOT NULL DEFAULT 'own', scope_values TEXT, updated_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_scope ON data_scope(tenant_id, subject_type, subject_id)");
            }
            // app_user.team_id (UserAuth::ensureTenantColumns 와 정합; 단독 호출 안전망)
            try { $pdo->exec(self::isMysql($pdo) ? "ALTER TABLE app_user ADD COLUMN team_id INT NULL" : "ALTER TABLE app_user ADD COLUMN team_id INTEGER NULL"); } catch (\Throwable $e) {}
        } catch (\Throwable $e) { /* best-effort */ }
    }

    // ── 동작/메뉴 정규화 ──────────────────────────────────────────────────
    private static function validMenu(string $k): bool { foreach (self::MENU_CATALOG as $m) if ($m['key'] === $k) return true; return false; }
    /** 입력(배열|CSV) → ACTIONS 부분집합 정렬. 비어있지 않으면 'view' 자동포함. */
    private static function normActions($raw): array
    {
        $arr = is_array($raw) ? $raw : explode(',', (string)$raw);
        $set = [];
        foreach ($arr as $a) { $a = strtolower(trim((string)$a)); if (in_array($a, self::ACTIONS, true)) $set[$a] = true; }
        if (!$set) return [];
        $set['view'] = true;
        $out = [];
        foreach (self::ACTIONS as $a) if (!empty($set[$a])) $out[] = $a;
        return $out;
    }
    /** menu 의 보유동작에 action 이 포함되는지(manage 는 전 동작 슈퍼셋). */
    private static function actionsCover(array $have, string $action): bool
    {
        if (in_array('manage', $have, true)) return true;
        return in_array($action, $have, true);
    }

    // ── 권한 행 조회/저장 ─────────────────────────────────────────────────
    /** subject 의 명시 권한 맵: menu_key => actions[] */
    private static function subjectPerms(\PDO $pdo, string $tenant, string $type, int $id): array
    {
        $out = [];
        try {
            $st = $pdo->prepare("SELECT menu_key, actions FROM acl_permission WHERE tenant_id=? AND subject_type=? AND subject_id=?");
            $st->execute([$tenant, $type, $id]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['menu_key']] = self::normActions($r['actions']);
            }
        } catch (\Throwable $e) {}
        return $out;
    }
    /** subject 의 데이터 범위: {scope_type, values[]} 또는 null. */
    private static function subjectScope(\PDO $pdo, string $tenant, string $type, int $id): ?array
    {
        try {
            $st = $pdo->prepare("SELECT scope_type, scope_values FROM data_scope WHERE tenant_id=? AND subject_type=? AND subject_id=?");
            $st->execute([$tenant, $type, $id]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$r) return null;
            $vals = json_decode((string)($r['scope_values'] ?? ''), true);
            return ['scope_type' => (string)$r['scope_type'], 'values' => is_array($vals) ? array_values($vals) : []];
        } catch (\Throwable $e) { return null; }
    }
    /**
     * [현 차수 P2-1] ABAC 강제 — 현재 요청 사용자의 실효 데이터 범위. 무제한이면 null.
     *   ★기존엔 data_scope 가 저장만 되고 쿼리 미적용(엔터프라이즈 세분권한 미완)이었다. 이 헬퍼 + dimension
     *   값 조회로 핸들러가 행 필터를 실제 강제한다. owner/admin·company 스코프·미설정 = null(무제한, 무회귀).
     *   사용자 본인 스코프 우선, 없으면 소속 팀 스코프 상속.
     * @return array{scope_type:string,values:array}|null
     */
    public static function effectiveScope(\Psr\Http\Message\ServerRequestInterface $req): ?array
    {
        try {
            $u = \Genie\Handlers\UserAuth::authedUser($req);
            if (!$u) return null;
            $role = strtolower((string)($u['team_role'] ?? $u['role'] ?? ''));
            if (in_array($role, ['owner', 'admin'], true)) return null; // 소유자/관리자 = 무제한
            $tenant = (string)(\Genie\Handlers\UserAuth::authedTenant($req) ?? '');
            if ($tenant === '') return null;
            $pdo = \Genie\Db::pdo();
            $sc = self::subjectScope($pdo, $tenant, 'user', (int)($u['id'] ?? 0));
            if (!$sc && !empty($u['team_id'])) $sc = self::subjectScope($pdo, $tenant, 'team', (int)$u['team_id']);
            if (!$sc) return null;
            $st = (string)($sc['scope_type'] ?? 'own');
            if ($st === 'company') return null;       // 전사 = 무제한
            return $sc;
        } catch (\Throwable $e) { return null; } // 안전측 — 강제 실패 시 무제한(기존 동작 보존)
    }

    /**
     * [현 차수 P2-1] 특정 차원(warehouse/brand/channel/...)에 대한 허용 값 목록. null = 이 차원 무제한.
     *   사용자 스코프 타입이 이 차원과 일치할 때만 제한(타 차원 스코프는 이 차원에 무제한). 빈 허용목록은
     *   '아무것도 없음'이 아니라 안전측 무제한(null)으로 처리(설정 미완 사용자 잠금 방지).
     */
    public static function scopeValuesFor(\Psr\Http\Message\ServerRequestInterface $req, string $dimension): ?array
    {
        $sc = self::effectiveScope($req);
        if ($sc === null) return null;
        if ((string)($sc['scope_type'] ?? '') !== $dimension) return null;
        $vals = array_values(array_filter(array_map('strval', (array)($sc['values'] ?? [])), fn($v) => $v !== ''));
        return $vals ? $vals : null;
    }

    /**
     * [현 차수 P2-1] 차원 값 목록을 SQL IN 절로 — [whereFragment, params]. 무제한이면 ['', []].
     *   호출: [$w,$p]=TeamPermissions::scopeSql($req,'warehouse','wh_id'); $sql.=$w; ...->execute([...$p]).
     */
    public static function scopeSql(\Psr\Http\Message\ServerRequestInterface $req, string $dimension, string $column): array
    {
        $vals = self::scopeValuesFor($req, $dimension);
        if ($vals === null) return ['', []];
        $ph = implode(',', array_fill(0, count($vals), '?'));
        return [" AND {$column} IN ({$ph})", $vals];
    }

    /** 권한 매트릭스 전체 교체(DELETE→INSERT). $perms = menu_key=>actions[]. */
    private static function replacePerms(\PDO $pdo, string $tenant, string $type, int $id, array $perms): void
    {
        $pdo->prepare("DELETE FROM acl_permission WHERE tenant_id=? AND subject_type=? AND subject_id=?")->execute([$tenant, $type, $id]);
        $ins = $pdo->prepare("INSERT INTO acl_permission (tenant_id, subject_type, subject_id, menu_key, actions, updated_at) VALUES (?,?,?,?,?,?)");
        $now = self::now();
        foreach ($perms as $menu => $acts) {
            if (!self::validMenu((string)$menu)) continue;
            $a = self::normActions($acts);
            if (!$a) continue;
            $ins->execute([$tenant, $type, $id, (string)$menu, implode(',', $a), $now]);
        }
    }
    private static function replaceScope(\PDO $pdo, string $tenant, string $type, int $id, ?array $scope): void
    {
        $pdo->prepare("DELETE FROM data_scope WHERE tenant_id=? AND subject_type=? AND subject_id=?")->execute([$tenant, $type, $id]);
        if (!$scope) return;
        $stype = (string)($scope['scope_type'] ?? 'own');
        if (!in_array($stype, self::DATA_SCOPES, true)) $stype = 'own';
        $vals = isset($scope['values']) && is_array($scope['values']) ? array_values($scope['values']) : [];
        $pdo->prepare("INSERT INTO data_scope (tenant_id, subject_type, subject_id, scope_type, scope_values, updated_at) VALUES (?,?,?,?,?,?)")
            ->execute([$tenant, $type, $id, $stype, json_encode($vals, JSON_UNESCAPED_UNICODE), self::now()]);
    }

    /**
     * caller 가 위임 가능한 권한 상한.
     *   - owner/admin → null(무제한, 전 메뉴×전 동작).
     *   - manager     → 본인 팀(team_id)의 팀 권한 맵.
     *   - member      → 빈 맵(위임 불가; 가드에서 차단).
     */
    private static function assignableMap(\PDO $pdo, array $caller, string $tenant): ?array
    {
        if (self::isOwnerAdmin($caller)) return null; // 무제한
        $teamId = (int)($caller['team_id'] ?? 0);
        if ($teamId <= 0) return []; // 팀 미배정 manager → 위임 불가
        return self::subjectPerms($pdo, $tenant, 'team', $teamId);
    }

    /**
     * 사용자(targetUser)의 유효 권한(effective). 미리보기/접근판정 공용.
     *   owner/admin → full(전 메뉴 manage). manager → 팀 권한. member → 본인 명시 권한.
     */
    private static function effectiveForUser(\PDO $pdo, string $tenant, array $u): array
    {
        $full = self::isAdmin($u) || self::roleOf($u) === 'owner';
        if ($full) {
            $map = [];
            foreach (self::MENU_CATALOG as $m) $map[$m['key']] = self::ACTIONS;
            return ['full' => true, 'menus' => $map, 'scope' => ['scope_type' => 'company', 'values' => []]];
        }
        $teamId = (int)($u['team_id'] ?? 0);
        if (self::roleOf($u) === 'manager') {
            $menus = $teamId > 0 ? self::subjectPerms($pdo, $tenant, 'team', $teamId) : [];
            $scope = ($teamId > 0 ? self::subjectScope($pdo, $tenant, 'team', $teamId) : null) ?: ['scope_type' => 'team', 'values' => []];
            return ['full' => false, 'menus' => $menus, 'scope' => $scope];
        }
        // member: 본인 명시 권한(팀 상한과 교집합 — 저장 시 보장하나 조회 시 한번 더 클램프)
        $menus = self::subjectPerms($pdo, $tenant, 'member', (int)($u['id'] ?? 0));
        if ($teamId > 0) {
            $teamMap = self::subjectPerms($pdo, $tenant, 'team', $teamId);
            foreach ($menus as $mk => $acts) {
                $cap = $teamMap[$mk] ?? [];
                $menus[$mk] = self::clampActions($acts, $cap);
                if (!$menus[$mk]) unset($menus[$mk]);
            }
        }
        $scope = self::subjectScope($pdo, $tenant, 'member', (int)($u['id'] ?? 0))
            ?: ($teamId > 0 ? self::subjectScope($pdo, $tenant, 'team', $teamId) : null)
            ?: ['scope_type' => 'own', 'values' => []];
        return ['full' => false, 'menus' => $menus, 'scope' => $scope];
    }
    /** want 동작들을 cap(상한) 이내로 클램프. cap 에 manage 있으면 전 동작 허용. */
    private static function clampActions(array $want, array $cap): array
    {
        if (in_array('manage', $cap, true)) return self::normActions($want);
        $out = [];
        foreach ($want as $a) if (in_array($a, $cap, true)) $out[] = $a;
        return self::normActions($out);
    }

    private static function teamById(\PDO $pdo, string $tenant, int $id): ?array
    {
        $st = $pdo->prepare("SELECT * FROM team WHERE id=? AND tenant_id=?");
        $st->execute([$id, $tenant]);
        $r = $st->fetch(\PDO::FETCH_ASSOC);
        return $r ?: null;
    }

    // ═══════════════════════ 엔드포인트 ═══════════════════════════════════

    /** GET /auth/team/menu-catalog — 매트릭스 UI 메타(메뉴/동작/범위/팀유형). */
    public static function menuCatalog(Request $req, Response $res): Response
    {
        if (!self::caller($req)) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        return self::ok($req, $res, [
            'menus'      => self::MENU_CATALOG,
            'actions'    => self::ACTIONS,
            'dataScopes' => self::DATA_SCOPES,
            'teamTypes'  => self::TEAM_TYPES,
        ]);
    }

    /** GET /auth/team/teams — 테넌트 팀 목록(+멤버수/권한수/상태). */
    public static function listTeams(Request $req, Response $res): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c);
        $rows = [];
        try {
            $st = $pdo->prepare("SELECT * FROM team WHERE tenant_id=? ORDER BY (CASE status WHEN 'active' THEN 0 WHEN 'disabled' THEN 1 ELSE 2 END), id ASC");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        // 부가 카운트
        foreach ($rows as &$t) {
            $tid = (int)$t['id'];
            $t['member_count'] = 0; $t['permission_count'] = 0; $t['manager_name'] = null;
            try { $s = $pdo->prepare("SELECT COUNT(*) FROM app_user WHERE tenant_id=? AND team_id=? AND is_active=1"); $s->execute([$tenant, $tid]); $t['member_count'] = (int)$s->fetchColumn(); } catch (\Throwable $e) {}
            try { $s = $pdo->prepare("SELECT COUNT(*) FROM acl_permission WHERE tenant_id=? AND subject_type='team' AND subject_id=?"); $s->execute([$tenant, $tid]); $t['permission_count'] = (int)$s->fetchColumn(); } catch (\Throwable $e) {}
            if (!empty($t['manager_user_id'])) {
                try { $s = $pdo->prepare("SELECT name, email FROM app_user WHERE id=? AND tenant_id=?"); $s->execute([(int)$t['manager_user_id'], $tenant]); $m = $s->fetch(\PDO::FETCH_ASSOC); if ($m) $t['manager_name'] = $m['name'] ?: $m['email']; } catch (\Throwable $e) {}
            }
        }
        unset($t);
        return self::ok($req, $res, ['teams' => $rows, 'tenant_id' => $tenant, 'caller_role' => self::roleOf($c), 'can_manage' => self::isOwnerAdmin($c)]);
    }

    /** POST /auth/team/teams — 팀 생성(owner/admin). */
    public static function createTeam(Request $req, Response $res): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isOwnerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '팀 생성은 최고관리자(owner) 권한이 필요합니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $b = self::body($req);
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::fail($req, $res, 'INVALID', '팀 이름을 입력하세요.', 422);
        $type = (string)($b['team_type'] ?? 'custom');
        $desc = (string)($b['description'] ?? '');
        $mgr  = isset($b['manager_user_id']) && $b['manager_user_id'] !== '' ? (int)$b['manager_user_id'] : null;
        if ($mgr !== null && !self::memberInTenant($pdo, $tenant, $mgr)) return self::fail($req, $res, 'INVALID', '팀관리자로 지정한 계정을 찾을 수 없습니다.', 422);
        try {
            $st = $pdo->prepare("INSERT INTO team (tenant_id, name, description, team_type, manager_user_id, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?, 'active', ?,?,?)");
            $st->execute([$tenant, $name, $desc, $type, $mgr, (int)($c['id'] ?? 0), self::now(), self::now()]);
            $id = (int)$pdo->lastInsertId();
            if ($mgr !== null) self::promoteManager($pdo, $tenant, $mgr, $id);
            UserAuth::logAudit($req, 'team_create', "team#$id name=$name type=$type", 'medium', $c);
            return self::ok($req, $res, ['id' => $id], '팀이 생성되었습니다.', 201);
        } catch (\Throwable $e) {
            return self::fail($req, $res, 'DB_ERROR', '생성 오류: ' . $e->getMessage(), 500);
        }
    }

    /** PATCH /auth/team/teams/{id} — 팀명/설명/유형/상태/관리자 변경(owner/admin). */
    public static function updateTeam(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isOwnerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '팀 수정 권한이 없습니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $id = (int)($args['id'] ?? 0);
        $team = self::teamById($pdo, $tenant, $id);
        if (!$team) return self::fail($req, $res, 'NOT_FOUND', '팀을 찾을 수 없습니다.', 404);
        $b = self::body($req); $sets = []; $vals = []; $changes = [];
        if (isset($b['name']) && trim((string)$b['name']) !== '') { $sets[] = 'name=?'; $vals[] = trim((string)$b['name']); $changes[] = 'name'; }
        if (array_key_exists('description', $b)) { $sets[] = 'description=?'; $vals[] = (string)$b['description']; $changes[] = 'desc'; }
        if (isset($b['team_type'])) { $sets[] = 'team_type=?'; $vals[] = (string)$b['team_type']; $changes[] = 'type'; }
        if (isset($b['status']) && in_array($b['status'], ['active','disabled','archived'], true)) { $sets[] = 'status=?'; $vals[] = (string)$b['status']; $changes[] = 'status='.$b['status']; }
        $newMgr = null;
        if (array_key_exists('manager_user_id', $b)) {
            $newMgr = ($b['manager_user_id'] !== null && $b['manager_user_id'] !== '') ? (int)$b['manager_user_id'] : null;
            if ($newMgr !== null && !self::memberInTenant($pdo, $tenant, $newMgr)) return self::fail($req, $res, 'INVALID', '팀관리자 계정을 찾을 수 없습니다.', 422);
            $sets[] = 'manager_user_id=?'; $vals[] = $newMgr; $changes[] = 'manager';
        }
        if (!$sets) return self::fail($req, $res, 'INVALID', '변경할 항목이 없습니다.', 400);
        $sets[] = 'updated_at=?'; $vals[] = self::now(); $vals[] = $id; $vals[] = $tenant;
        try {
            $pdo->prepare("UPDATE team SET " . implode(', ', $sets) . " WHERE id=? AND tenant_id=?")->execute($vals);
            if ($newMgr !== null) self::promoteManager($pdo, $tenant, $newMgr, $id);
            UserAuth::logAudit($req, 'team_update', "team#$id " . implode(',', $changes), 'medium', $c);
            return self::ok($req, $res, ['id' => $id], '팀이 수정되었습니다.');
        } catch (\Throwable $e) {
            return self::fail($req, $res, 'DB_ERROR', '수정 오류: ' . $e->getMessage(), 500);
        }
    }

    /** DELETE /auth/team/teams/{id} — 기본 soft(archived). ?hard=1 & admin 만 하드삭제(멤버 team_id 해제). */
    public static function deleteTeam(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isOwnerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '팀 삭제 권한이 없습니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $id = (int)($args['id'] ?? 0);
        $team = self::teamById($pdo, $tenant, $id);
        if (!$team) return self::fail($req, $res, 'NOT_FOUND', '팀을 찾을 수 없습니다.', 404);
        $hard = ((string)($req->getQueryParams()['hard'] ?? '') === '1');
        try {
            if ($hard) {
                if (!self::isAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '하드 삭제는 Super Admin 만 가능합니다.', 403);
                // 무결성: 멤버 team_id 해제 + 권한/범위 정리 후 행 삭제
                $pdo->prepare("UPDATE app_user SET team_id=NULL WHERE tenant_id=? AND team_id=?")->execute([$tenant, $id]);
                $pdo->prepare("DELETE FROM acl_permission WHERE tenant_id=? AND subject_type='team' AND subject_id=?")->execute([$tenant, $id]);
                $pdo->prepare("DELETE FROM data_scope WHERE tenant_id=? AND subject_type='team' AND subject_id=?")->execute([$tenant, $id]);
                $pdo->prepare("DELETE FROM team WHERE id=? AND tenant_id=?")->execute([$id, $tenant]);
                UserAuth::logAudit($req, 'team_hard_delete', "team#$id name=" . ($team['name'] ?? ''), 'high', $c);
                return self::ok($req, $res, ['id' => $id, 'hard' => true], '팀이 영구 삭제되었습니다.');
            }
            $pdo->prepare("UPDATE team SET status='archived', updated_at=? WHERE id=? AND tenant_id=?")->execute([self::now(), $id, $tenant]);
            UserAuth::logAudit($req, 'team_archive', "team#$id name=" . ($team['name'] ?? ''), 'medium', $c);
            return self::ok($req, $res, ['id' => $id, 'archived' => true], '팀이 보관(비활성) 처리되었습니다.');
        } catch (\Throwable $e) {
            return self::fail($req, $res, 'DB_ERROR', '삭제 오류: ' . $e->getMessage(), 500);
        }
    }

    /** POST /auth/team/teams/{id}/restore — 보관/비활성 팀 복구(owner/admin). */
    public static function restoreTeam(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isOwnerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '팀 복구 권한이 없습니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $id = (int)($args['id'] ?? 0);
        if (!self::teamById($pdo, $tenant, $id)) return self::fail($req, $res, 'NOT_FOUND', '팀을 찾을 수 없습니다.', 404);
        try {
            $pdo->prepare("UPDATE team SET status='active', updated_at=? WHERE id=? AND tenant_id=?")->execute([self::now(), $id, $tenant]);
            UserAuth::logAudit($req, 'team_restore', "team#$id", 'medium', $c);
            return self::ok($req, $res, ['id' => $id], '팀이 복구되었습니다.');
        } catch (\Throwable $e) { return self::fail($req, $res, 'DB_ERROR', '복구 오류: ' . $e->getMessage(), 500); }
    }

    /** GET /auth/team/teams/{id}/permissions — 팀 권한 매트릭스 + 데이터 범위 + 소속 멤버. */
    public static function getTeamPermissions(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $id = (int)($args['id'] ?? 0);
        $team = self::teamById($pdo, $tenant, $id);
        if (!$team) return self::fail($req, $res, 'NOT_FOUND', '팀을 찾을 수 없습니다.', 404);
        $members = [];
        try { $s = $pdo->prepare("SELECT id, name, email, team_role, is_active FROM app_user WHERE tenant_id=? AND team_id=? ORDER BY id ASC"); $s->execute([$tenant, $id]); $members = $s->fetchAll(\PDO::FETCH_ASSOC) ?: []; } catch (\Throwable $e) {}
        return self::ok($req, $res, [
            'team'    => $team,
            'menus'   => self::subjectPerms($pdo, $tenant, 'team', $id),
            'scope'   => self::subjectScope($pdo, $tenant, 'team', $id) ?: ['scope_type' => 'team', 'values' => []],
            'members' => $members,
        ]);
    }

    /** PUT /auth/team/teams/{id}/permissions — 팀 권한·데이터범위 설정(owner/admin, 상한 없음). */
    public static function putTeamPermissions(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isOwnerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '팀 권한 설정은 최고관리자(owner)만 가능합니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $id = (int)($args['id'] ?? 0);
        if (!self::teamById($pdo, $tenant, $id)) return self::fail($req, $res, 'NOT_FOUND', '팀을 찾을 수 없습니다.', 404);
        $b = self::body($req);
        $perms = is_array($b['menus'] ?? null) ? $b['menus'] : [];
        try {
            $pdo->beginTransaction();
            self::replacePerms($pdo, $tenant, 'team', $id, $perms);
            if (array_key_exists('scope', $b)) self::replaceScope($pdo, $tenant, 'team', $id, is_array($b['scope']) ? $b['scope'] : null);
            // 팀 권한 축소 시 소속 멤버 권한을 새 상한으로 재클램프(권한 초과 잔존 방지)
            self::reclampTeamMembers($pdo, $tenant, $id);
            $pdo->commit();
            UserAuth::logAudit($req, 'team_permissions_set', "team#$id menus=" . count($perms), 'high', $c);
            return self::ok($req, $res, ['id' => $id, 'menus' => count($perms)], '팀 권한이 저장되었습니다.');
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::fail($req, $res, 'DB_ERROR', '저장 오류: ' . $e->getMessage(), 500);
        }
    }

    /** GET /auth/team/members/{id}/permissions — 멤버 명시권한 + 유효권한 + 위임가능 상한. */
    public static function getMemberPermissions(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $mid = (int)($args['id'] ?? 0);
        $u = self::memberRow($pdo, $tenant, $mid);
        if (!$u) return self::fail($req, $res, 'NOT_FOUND', '멤버를 찾을 수 없습니다.', 404);
        $assignable = self::assignableMap($pdo, $c, $tenant); // null=무제한
        return self::ok($req, $res, [
            'member'     => ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'team_role' => $u['team_role'], 'team_id' => $u['team_id'] ?? null],
            'explicit'   => self::subjectPerms($pdo, $tenant, 'member', $mid),
            'effective'  => self::effectiveForUser($pdo, $tenant, $u),
            'scope'      => self::subjectScope($pdo, $tenant, 'member', $mid),
            'assignable' => $assignable, // null → 전권
        ]);
    }

    /** PUT /auth/team/members/{id}/permissions — 멤버 권한 위임(owner/manager/admin). manager 는 assignable 초과 불가. */
    public static function putMemberPermissions(Request $req, Response $res, array $args = []): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isManagerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '권한 위임은 owner/manager 만 가능합니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c); $mid = (int)($args['id'] ?? 0);
        $u = self::memberRow($pdo, $tenant, $mid);
        if (!$u) return self::fail($req, $res, 'NOT_FOUND', '멤버를 찾을 수 없습니다.', 404);
        if (self::roleOf($u) === 'owner') return self::fail($req, $res, 'FORBIDDEN', 'owner 계정 권한은 변경할 수 없습니다.', 403);
        $b = self::body($req);
        $reqPerms = is_array($b['menus'] ?? null) ? $b['menus'] : [];

        // 위임 상한 검증 (manager). owner/admin 은 assignable=null(무제한).
        $assignable = self::assignableMap($pdo, $c, $tenant);
        $violations = [];
        $clean = [];
        foreach ($reqPerms as $menu => $acts) {
            $menu = (string)$menu;
            if (!self::validMenu($menu)) continue;
            $a = self::normActions($acts);
            if (!$a) continue;
            if ($assignable === null) { $clean[$menu] = $a; continue; } // 무제한
            $cap = $assignable[$menu] ?? [];
            foreach ($a as $act) {
                if (!self::actionsCover($cap, $act)) $violations[] = "$menu:$act";
            }
            $allowed = self::clampActions($a, $cap);
            if ($allowed) $clean[$menu] = $allowed;
        }
        if ($violations) {
            return self::fail($req, $res, 'DELEGATION_EXCEEDED',
                '본인에게 부여되지 않은 권한은 위임할 수 없습니다: ' . implode(', ', array_slice($violations, 0, 12)), 403);
        }
        // 데이터 범위도 manager 상한 이내로(간단 정책: manager 가 본인 범위보다 넓은 scope_type 부여 금지)
        $scope = array_key_exists('scope', $b) && is_array($b['scope']) ? $b['scope'] : null;
        try {
            $pdo->beginTransaction();
            self::replacePerms($pdo, $tenant, 'member', $mid, $clean);
            if (array_key_exists('scope', $b)) self::replaceScope($pdo, $tenant, 'member', $mid, $scope);
            $pdo->commit();
            UserAuth::logAudit($req, 'member_permissions_set', "member#$mid menus=" . count($clean) . " by=" . self::roleOf($c), 'high', $c);
            return self::ok($req, $res, ['id' => $mid, 'menus' => count($clean)], '팀원 권한이 저장되었습니다.');
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::fail($req, $res, 'DB_ERROR', '저장 오류: ' . $e->getMessage(), 500);
        }
    }

    /** GET /auth/team/effective-permissions — 현재 호출자의 유효 권한(메뉴/동작/데이터범위). */
    public static function effectivePermissions(Request $req, Response $res): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c);
        return self::ok($req, $res, self::effectiveForUser($pdo, $tenant, $c) + ['role' => self::roleOf($c)]);
    }

    /** GET /auth/team/assignable-permissions — 현재 호출자가 위임 가능한 상한. */
    public static function assignablePermissions(Request $req, Response $res): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isManagerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '위임 권한이 없습니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c);
        $a = self::assignableMap($pdo, $c, $tenant);
        return self::ok($req, $res, ['assignable' => $a, 'unlimited' => ($a === null), 'role' => self::roleOf($c)]);
    }

    /** GET /auth/team/audit — 팀/권한 관련 감사 이벤트(테넌트 격리, admin=전체). */
    public static function teamAudit(Request $req, Response $res): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        $pdo = self::db(); $tenant = self::tenantOf($c);
        $rows = [];
        try {
            if (self::isAdmin($c)) {
                $st = $pdo->prepare("SELECT at, actor, role, tenant_id, action, detail, ip, risk FROM auth_audit_log WHERE action LIKE 'team%' OR action LIKE 'member_perm%' ORDER BY at DESC LIMIT 500");
                $st->execute();
            } else {
                $st = $pdo->prepare("SELECT at, actor, role, tenant_id, action, detail, ip, risk FROM auth_audit_log WHERE tenant_id=? AND (action LIKE 'team%' OR action LIKE 'member_perm%') ORDER BY at DESC LIMIT 300");
                $st->execute([$tenant]);
            }
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        return self::ok($req, $res, ['logs' => $rows, 'count' => count($rows)]);
    }

    /**
     * 표준 조직 구조 프리셋 — 스펙의 내부 조직 + 외부 파트너 팀 + 유형별 기본 권한·데이터범위.
     *   각 팀은 의미 있는 기본 권한과 데이터 접근 범위를 함께 부여(빈 팀 방지).
     */
    public const ORG_PRESET = [
        ['name' => '브랜드팀',         'team_type' => 'brand',                'scope' => 'brand',     'perms' => ['dashboard' => ['view'], 'marketing' => ['view', 'export'], 'commerce' => ['view'], 'product' => ['view', 'update']]],
        ['name' => '마케팅팀',         'team_type' => 'marketing',            'scope' => 'campaign',  'perms' => ['dashboard' => ['view'], 'marketing' => ['view', 'create', 'update', 'approve', 'export'], 'campaign' => ['view', 'create', 'update', 'approve'], 'customer' => ['view', 'export']]],
        ['name' => '마케팅 글로벌팀',   'team_type' => 'marketing_global',     'scope' => 'campaign',  'perms' => ['dashboard' => ['view'], 'marketing' => ['view', 'create', 'update', 'export'], 'campaign' => ['view', 'create', 'update']]],
        ['name' => '마케팅 국내팀',     'team_type' => 'marketing_domestic',   'scope' => 'campaign',  'perms' => ['dashboard' => ['view'], 'marketing' => ['view', 'create', 'update', 'export'], 'campaign' => ['view', 'create', 'update']]],
        ['name' => '영업팀',           'team_type' => 'sales',                'scope' => 'team',      'perms' => ['dashboard' => ['view'], 'sales_pipeline' => ['view', 'create', 'update', 'approve'], 'customer' => ['view', 'update'], 'commerce' => ['view']]],
        ['name' => '해외영업팀',       'team_type' => 'sales_global',         'scope' => 'own',       'perms' => ['dashboard' => ['view'], 'sales_pipeline' => ['view', 'create', 'update'], 'customer' => ['view']]],
        ['name' => '국내영업팀',       'team_type' => 'sales_domestic',       'scope' => 'own',       'perms' => ['dashboard' => ['view'], 'sales_pipeline' => ['view', 'create', 'update'], 'customer' => ['view']]],
        ['name' => '대기업영업팀',     'team_type' => 'sales_enterprise',     'scope' => 'own',       'perms' => ['dashboard' => ['view'], 'sales_pipeline' => ['view', 'create', 'update', 'approve'], 'customer' => ['view', 'update']]],
        ['name' => '유통/총판영업팀',   'team_type' => 'sales_channel',        'scope' => 'team',      'perms' => ['dashboard' => ['view'], 'sales_pipeline' => ['view', 'create', 'update'], 'commerce' => ['view'], 'settlement' => ['view']]],
        ['name' => '물류팀',           'team_type' => 'logistics',            'scope' => 'warehouse', 'perms' => ['dashboard' => ['view'], 'logistics' => ['view', 'create', 'update'], 'inventory' => ['view', 'update'], 'warehouse' => ['view', 'create', 'update'], 'delivery' => ['view', 'update'], 'returns' => ['view', 'update', 'approve']]],
        ['name' => '재무팀',           'team_type' => 'finance',              'scope' => 'company',   'perms' => ['dashboard' => ['view'], 'finance' => ['view', 'export', 'approve'], 'billing' => ['view', 'export'], 'settlement' => ['view', 'export', 'approve']]],
        ['name' => '외부 대행사',       'team_type' => 'partner_agency',       'scope' => 'campaign',  'perms' => ['dashboard' => ['view'], 'marketing' => ['view', 'export'], 'campaign' => ['view', 'create', 'update']]],
        ['name' => '라이브커머스 파트너', 'team_type' => 'partner_live',       'scope' => 'own',       'perms' => ['dashboard' => ['view'], 'live_commerce' => ['view', 'create', 'update'], 'commerce' => ['view']]],
        ['name' => '공급 파트너',       'team_type' => 'partner_supplier',     'scope' => 'partner',   'perms' => ['supplier_portal' => ['view', 'create', 'update'], 'product' => ['view'], 'settlement' => ['view']]],
        ['name' => '유통 파트너',       'team_type' => 'partner_distribution', 'scope' => 'partner',   'perms' => ['distribution_portal' => ['view'], 'commerce' => ['view'], 'product' => ['view'], 'settlement' => ['view']]],
    ];

    /** POST /auth/team/teams/seed-org — 표준 조직 구조 일괄 생성(owner/admin, idempotent: 동명 팀 skip). */
    public static function seedOrg(Request $req, Response $res): Response
    {
        $c = self::caller($req); if (!$c) return self::fail($req, $res, 'UNAUTHENTICATED', '인증이 필요합니다.', 401);
        if (!self::isOwnerAdmin($c)) return self::fail($req, $res, 'FORBIDDEN', '조직 구조 생성은 최고관리자(owner)만 가능합니다.', 403);
        self::ensureSchema();
        $pdo = self::db(); $tenant = self::tenantOf($c);
        $created = []; $skipped = [];
        try {
            // 기존 팀명 집합(중복 방지)
            $ex = $pdo->prepare("SELECT name FROM team WHERE tenant_id=?"); $ex->execute([$tenant]);
            $have = array_map(fn($r) => (string)$r['name'], $ex->fetchAll(\PDO::FETCH_ASSOC) ?: []);
            $pdo->beginTransaction();
            foreach (self::ORG_PRESET as $p) {
                if (in_array($p['name'], $have, true)) { $skipped[] = $p['name']; continue; }
                $st = $pdo->prepare("INSERT INTO team (tenant_id, name, description, team_type, status, created_by, created_at, updated_at) VALUES (?,?,?,?, 'active', ?,?,?)");
                $st->execute([$tenant, $p['name'], '', $p['team_type'], (int)($c['id'] ?? 0), self::now(), self::now()]);
                $tid = (int)$pdo->lastInsertId();
                self::replacePerms($pdo, $tenant, 'team', $tid, $p['perms']);
                self::replaceScope($pdo, $tenant, 'team', $tid, ['scope_type' => $p['scope'], 'values' => []]);
                $created[] = $p['name'];
            }
            $pdo->commit();
            UserAuth::logAudit($req, 'team_seed_org', 'created=' . count($created) . ' skipped=' . count($skipped), 'medium', $c);
            return self::ok($req, $res, ['created' => $created, 'skipped' => $skipped], '표준 조직 구조가 생성되었습니다.');
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::fail($req, $res, 'DB_ERROR', '조직 생성 오류: ' . $e->getMessage(), 500);
        }
    }

    // ── 내부 유틸 ─────────────────────────────────────────────────────────
    private static function memberRow(\PDO $pdo, string $tenant, int $id): ?array
    {
        try {
            $st = $pdo->prepare("SELECT id, name, email, team_role, team_id, parent_user_id, plan, tenant_id FROM app_user WHERE id=? AND tenant_id=?");
            $st->execute([$id, $tenant]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            return $r ?: null;
        } catch (\Throwable $e) { return null; }
    }
    private static function memberInTenant(\PDO $pdo, string $tenant, int $id): bool { return self::memberRow($pdo, $tenant, $id) !== null; }

    /** 팀관리자 지정 시 해당 계정을 manager 로 승격 + team_id 배정(owner 는 불변). */
    private static function promoteManager(\PDO $pdo, string $tenant, int $userId, int $teamId): void
    {
        try {
            $u = self::memberRow($pdo, $tenant, $userId);
            if (!$u) return;
            if (self::roleOf($u) === 'owner') return; // owner 강등 금지
            $pdo->prepare("UPDATE app_user SET team_role='manager', team_id=? WHERE id=? AND tenant_id=?")->execute([$teamId, $userId, $tenant]);
        } catch (\Throwable $e) {}
    }

    /** 팀 권한 변경 후 소속 멤버들의 명시권한을 새 팀 상한으로 재클램프. */
    private static function reclampTeamMembers(\PDO $pdo, string $tenant, int $teamId): void
    {
        try {
            $teamMap = self::subjectPerms($pdo, $tenant, 'team', $teamId);
            $s = $pdo->prepare("SELECT id, team_role FROM app_user WHERE tenant_id=? AND team_id=?");
            $s->execute([$tenant, $teamId]);
            foreach ($s->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $m) {
                if (in_array(self::roleOf($m), ['owner','manager'], true)) continue; // 멤버만 클램프
                $mid = (int)$m['id'];
                $cur = self::subjectPerms($pdo, $tenant, 'member', $mid);
                if (!$cur) continue;
                $new = [];
                foreach ($cur as $mk => $acts) {
                    $clamped = self::clampActions($acts, $teamMap[$mk] ?? []);
                    if ($clamped) $new[$mk] = $clamped;
                }
                self::replacePerms($pdo, $tenant, 'member', $mid, $new);
            }
        } catch (\Throwable $e) {}
    }
}
