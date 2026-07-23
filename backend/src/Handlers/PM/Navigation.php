<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * CWIS Part004-02 — Unified Navigation Domain & Menu Registry (Slim/PDO 적응 구현).
 *
 * ★교차검증(feedback_cross_verify_all_commands) — 명세 전제 vs 실측:
 *   | 명세            | 실측                                                  | 처리 |
 *   | Laravel/artisan | 부재(artisan 파일 없음·bin/*.php 는 순수 cron)         | bin/navigation_registry.php CLI 로 적응 |
 *   | Feature Flag SVC| **0건**(grep feature_flag = 0)                        | 필드·평가경로만 구현, 소스 부재 시 보수적 hidden |
 *   | Redis Cache     | **부재**(predis/ext-redis 0건)                        | 파일 스냅샷 + 프로세스 메모 + ETag |
 *   | Queue/Outbox    | 부재(cron 스크립트만)                                  | 동기 처리 + 감사로그 |
 *   | Plugin System   | **부재**(plugin 0건)                                   | Source 어휘만 예약(등록자 없음 — 위장 금지) |
 *   | PostgreSQL      | MySQL + SQLite 폴백                                    | driver-aware DDL |
 *   | Enum/VO/DDD 4계층| Enum 0개(CCIS P005)                                   | const 배열 + static 클래스(저장소 관례) |
 *
 * ★정본(SSOT)은 **프론트 정적 소스**(sidebarManifest.js 등)다. Part004-01 이 이를 실측 확정했고,
 *   명세 §28 도 "코드 Registry 우선, Tenant Custom/Alias/Override 가 필요할 때만 DB" 를 허용한다.
 *   본 핸들러는 빌드타임 생성 스냅샷(`backend/data/navigation_registry.json`)을 읽어 **Resolve** 하며,
 *   레지스트리를 DB 로 이관해 정적 트리와 이원화하지 않는다(부팅 깜빡임·오프라인 붕괴 방지).
 *
 * ★비중복(헌법 Reuse→Extend):
 *   - 권한 = 기존 `plan_menu_access` + `planMenuPolicy` 등급표를 **그대로 승계**(신규 권한체계 신설 금지).
 *   - 전역 가시성 = 기존 `menu_tree`(AdminMenu.php) 오버레이 재사용(중복 테이블 신설 금지).
 *   - 인증/테넌트/역할/감사 = `PM\Shared` 승계(Part001~003 과 동일).
 *   - Capability = Part001 `PM\Collaboration` 레지스트리 재사용.
 *   신규 테이블은 **테넌트 스코프 오버라이드 1개뿐**(`navigation_overrides`) — menu_tree 는 플랫폼 전역이라
 *   테넌트별 재정의를 담을 수 없다(진짜 결여).
 *
 * ★무후퇴/점진 전환: 프론트 레거시 사이드바를 **바꾸지 않는다**. 본 Part 는 Registry·Resolver·API·Shadow
 *   Compare 까지만 제공하고, 실제 렌더 전환은 Part004-03 에서 Feature 스위치와 함께 수행한다.
 *
 * Endpoints (routes.php · /v425/pm/navigation/*):
 *   GET  /v425/pm/navigation                    => tree           (사용자 — 허용 메뉴만)
 *   GET  /v425/pm/navigation/items/{menuKey}    => item
 *   GET  /v425/pm/navigation/registry           => registry       (admin)
 *   POST /v425/pm/navigation/validate           => validate       (admin)
 *   POST /v425/pm/navigation/preview            => preview        (admin · 임퍼소네이트 없음)
 *   GET  /v425/pm/navigation/shadow-compare     => shadowCompare  (admin)
 *   GET  /v425/pm/navigation/overrides          => listOverrides  (admin)
 *   POST /v425/pm/navigation/overrides          => upsertOverride (admin)
 *   POST /v425/pm/navigation/overrides/{id}/remove => removeOverride (admin)
 */
final class Navigation extends Shared
{
    /** 레지스트리 스냅샷 경로(빌드타임 생성물 · 배포 동반). */
    private const REGISTRY_FILE = __DIR__ . '/../../../data/navigation_registry.json';

    /** 프로세스 메모(요청당 파일 재파싱 방지 — Redis 부재 환경의 1차 캐시). */
    private static ?array $registryMemo = null;
    private static array $overridesEnsured = [];

    /* ══════════════════════════════════════════════════════════════════════
     * 1. Registry Source — 스냅샷 로드
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * 활성 레지스트리 스냅샷. 부재/손상/미검증이면 null(정직 미산출 — 빈 트리를 '정상'인 척하지 않는다).
     *
     * 반환값은 빌드타임 생성 JSON 을 그대로 디코드한 것이다(registry_version·items·aliases·activatable·
     * vocabulary·validation·source_revision·generated_at …). 생성기 스키마가 확장될 수 있으므로
     * 고정 shape 로 좁히지 않는다 — 소비측은 항상 `?? 기본값` 으로 방어한다.
     *
     * @return array<string,mixed>|null
     */
    public static function registry(): ?array
    {
        if (self::$registryMemo !== null) return self::$registryMemo['ok'] ? self::$registryMemo['data'] : null;

        $real = realpath(self::REGISTRY_FILE);
        $baseDir = realpath(__DIR__ . '/../../../data');
        // 입력 경로 화이트리스트 — data 디렉터리 밖 파일은 절대 읽지 않는다(§48 경로 조작 차단).
        if ($real === false || $baseDir === false || strpos($real, $baseDir . DIRECTORY_SEPARATOR) !== 0) {
            self::$registryMemo = ['ok' => false, 'data' => null];
            return null;
        }
        $raw = @file_get_contents($real);
        $data = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
            self::$registryMemo = ['ok' => false, 'data' => null];
            return null;
        }
        // ★검증 실패 스냅샷은 활성화하지 않는다(§72·§73).
        if (($data['activatable'] ?? false) !== true) {
            self::$registryMemo = ['ok' => false, 'data' => null];
            return null;
        }
        self::$registryMemo = ['ok' => true, 'data' => $data];
        return $data;
    }

    /** 테스트/CLI 용 주입(운영 경로 미사용). */
    public static function injectRegistryForTest(?array $data): void
    {
        self::$registryMemo = $data === null ? null : ['ok' => true, 'data' => $data];
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 2. Tenant Override 테이블 (진짜 결여 — menu_tree 는 플랫폼 전역이라 담을 수 없다)
     * ══════════════════════════════════════════════════════════════════════ */

    private const OVERRIDE_TYPES = ['LABEL', 'SORT_ORDER', 'VISIBILITY', 'ICON', 'DISABLED'];

    private static function ensureOverrideTable(\PDO $pdo, bool $isDemo): void
    {
        $memo = $isDemo ? 'demo' : 'ops';
        if (isset(self::$overridesEnsured[$memo])) return;
        self::$overridesEnsured[$memo] = true;
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS navigation_overrides (
                    id INT AUTO_INCREMENT PRIMARY KEY, public_id VARCHAR(64),
                    tenant_id VARCHAR(100) NOT NULL, menu_key VARCHAR(160) NOT NULL,
                    override_type VARCHAR(24) NOT NULL, override_value TEXT,
                    status VARCHAR(20) DEFAULT 'ACTIVE', created_by VARCHAR(100),
                    created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_nav_ovr (tenant_id, menu_key, override_type),
                    KEY idx_nav_ovr_tenant (tenant_id, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS navigation_overrides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, public_id TEXT, tenant_id TEXT NOT NULL,
                    menu_key TEXT NOT NULL, override_type TEXT NOT NULL, override_value TEXT,
                    status TEXT DEFAULT 'ACTIVE', created_by TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_nav_ovr ON navigation_overrides(tenant_id, menu_key, override_type)");
            }
        } catch (\Throwable $e) { /* 존재 시 무영향 */ }
    }

    /** @return array<string,array<string,string>> menu_key → [override_type => value] */
    private static function tenantOverrides(\PDO $pdo, string $tenant): array
    {
        $out = [];
        try {
            $st = $pdo->prepare("SELECT menu_key, override_type, override_value FROM navigation_overrides WHERE tenant_id=? AND status='ACTIVE'");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['menu_key']][(string)$r['override_type']] = (string)($r['override_value'] ?? '');
            }
        } catch (\Throwable $e) { /* 테이블 부재 = 오버라이드 없음 */ }
        return $out;
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 3. 평가 소스 — 기존 인프라 재사용
     * ══════════════════════════════════════════════════════════════════════ */

    /**
     * plan_menu_access(관리자 설정) — plan_id → 허용 menu_key 목록.
     * ★프론트 AuthContext.hasMenuAccess 와 **동일 소스**. 없으면 빈 배열 → 등급표 폴백.
     */
    private static function planMenuAccess(\PDO $pdo): array
    {
        $out = [];
        try {
            foreach ($pdo->query('SELECT plan_id, menu_key FROM plan_menu_access WHERE enabled = 1')->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[(string)$r['plan_id']][] = (string)$r['menu_key'];
            }
        } catch (\Throwable $e) { /* 테이블 부재 = 관리자 미설정 */ }
        return $out;
    }

    /** menu_tree 전역 가시성 오버레이(AdminMenu.php 정본 재사용) — menu_key → visibility. */
    private static function globalVisibility(\PDO $pdo): array
    {
        $out = [];
        try {
            foreach ($pdo->query('SELECT menu_key, visibility FROM menu_tree')->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $k = (string)($r['menu_key'] ?? '');
                if ($k !== '') $out[$k] = (string)($r['visibility'] ?? 'visible');
            }
        } catch (\Throwable $e) { /* 테이블 부재 = 전부 visible */ }
        return $out;
    }

    /** 플랜 등급 랭크(프론트 planRank / PlanPolicy::RANK 정합). */
    private const PLAN_RANK = ['free' => 0, 'demo' => 0, 'starter' => 1, 'growth' => 2, 'pro' => 3, 'enterprise' => 4, 'admin' => 5];

    private static function rank(?string $plan): int
    {
        return self::PLAN_RANK[strtolower(trim((string)$plan))] ?? 0;
    }

    /**
     * ★프론트 `AuthContext.hasMenuAccess` 의 **정확한 재현**(서버측 심층방어).
     * 순서: admin 전권 → admin 전용 차단 → enterprise 전권 → plan_menu_access → 등급표 폴백.
     */
    public static function hasMenuAccess(string $userPlan, array $item, array $planMenuAccess): bool
    {
        $permKey = (string)($item['legacy_permission_key'] ?? '');
        if ($permKey === '') return true;                       // 비게이트 항목
        $plan = strtolower(trim($userPlan));
        if ($plan === 'admin') return true;
        if (!empty($item['admin_only'])) return false;          // 플랫폼 관리 메뉴 = admin 외 전원 차단
        if ($plan === 'enterprise') return true;

        $allowed = $planMenuAccess[$plan] ?? ($planMenuAccess['free'] ?? null);
        if (is_array($allowed) && count($allowed) > 0) {
            // 202차 하위호환 — ops 보유 플랜은 분리된 commerce_channel 도 허용(회귀 방지)
            if ($permKey === 'commerce_channel' && in_array('ops', $allowed, true)) return true;
            foreach ($allowed as $k) {
                if ($k === $permKey || str_starts_with($permKey, (string)$k)) return true;
            }
            return false;
        }
        // 관리자 미설정 → 정본 등급표 fail-secure
        $required = (string)($item['required_plan'] ?? 'pro');
        return self::rank($plan) >= self::rank($required);
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 4. Visibility Policy — 검증된 JSON DSL(임의 실행 코드 금지 · §23·§48)
     * ══════════════════════════════════════════════════════════════════════ */

    private const POLICY_ATTRS = [
        'context.tenant_id', 'context.workspace_id', 'context.project_id', 'context.workspace_status',
        'subject.membership_status', 'subject.principal_type', 'subject.plan', 'subject.platform', 'subject.locale',
    ];
    private const POLICY_OPS = ['equals', 'not_equals', 'in', 'not_in', 'exists', 'not_exists'];

    /** JSON DSL 구조 검증(등록 시점). 위반 = 거부. */
    public static function validatePolicy(?array $policy): array
    {
        if ($policy === null) return [];
        $errs = [];
        $walk = function (array $node, string $path) use (&$walk, &$errs): void {
            foreach ($node as $combinator => $conds) {
                if (!in_array($combinator, ['all', 'any', 'none'], true)) { $errs[] = "$path: 알 수 없는 결합자 '$combinator'"; continue; }
                if (!is_array($conds)) { $errs[] = "$path.$combinator: 배열이어야 한다"; continue; }
                foreach ($conds as $idx => $c) {
                    if (!is_array($c)) { $errs[] = "$path.$combinator[$idx]: 객체여야 한다"; continue; }
                    if (isset($c['all']) || isset($c['any']) || isset($c['none'])) { $walk($c, "$path.$combinator[$idx]"); continue; }
                    $a = (string)($c['attribute'] ?? '');
                    $o = (string)($c['operator'] ?? '');
                    if (!in_array($a, self::POLICY_ATTRS, true)) $errs[] = "$path.$combinator[$idx]: 허용되지 않은 attribute '$a'";
                    if (!in_array($o, self::POLICY_OPS, true)) $errs[] = "$path.$combinator[$idx]: 허용되지 않은 operator '$o'";
                    if (isset($c['value']) && !is_scalar($c['value']) && !is_array($c['value'])) $errs[] = "$path.$combinator[$idx]: value 는 스칼라/배열만";
                }
            }
        };
        $walk($policy, '$');
        return $errs;
    }

    /** 정책 평가 — 해석 불가/오류는 **false(숨김)** 로 보수 처리(§40 Default Hidden). */
    public static function evaluatePolicy(?array $policy, array $facts): bool
    {
        if ($policy === null) return true;
        $one = function (array $c) use ($facts): bool {
            $a = (string)($c['attribute'] ?? '');
            $o = (string)($c['operator'] ?? '');
            if (!in_array($a, self::POLICY_ATTRS, true) || !in_array($o, self::POLICY_OPS, true)) return false;
            $actual = $facts[$a] ?? null;
            $v = $c['value'] ?? null;
            return match ($o) {
                'equals' => $actual !== null && (string)$actual === (string)$v,
                'not_equals' => (string)$actual !== (string)$v,
                'in' => is_array($v) && in_array((string)$actual, array_map('strval', $v), true),
                'not_in' => is_array($v) && !in_array((string)$actual, array_map('strval', $v), true),
                'exists' => $actual !== null && $actual !== '',
                // 마지막 남은 허용 연산자는 not_exists 뿐이다(위 in_array 로 그 외는 이미 걸러졌다).
                default => $actual === null || $actual === '',
            };
        };
        $eval = function (array $node) use (&$eval, $one): bool {
            $result = true;
            foreach ($node as $comb => $conds) {
                if (!is_array($conds)) return false;
                $vals = [];
                foreach ($conds as $c) {
                    if (!is_array($c)) return false;
                    $vals[] = (isset($c['all']) || isset($c['any']) || isset($c['none'])) ? $eval($c) : $one($c);
                }
                $r = match ($comb) {
                    'all' => !in_array(false, $vals, true),
                    'any' => in_array(true, $vals, true),
                    'none' => !in_array(true, $vals, true),
                    default => false,
                };
                $result = $result && $r;
            }
            return $result;
        };
        try { return $eval($policy); } catch (\Throwable $e) { return false; }
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 5. NavigationResolver (명세 §32)
     * ══════════════════════════════════════════════════════════════════════ */

    /** 사용자 UI 메뉴 대상이 될 수 없는 Principal(§11). */
    private const NON_HUMAN_PRINCIPALS = ['AI_AGENT', 'SERVICE_ACCOUNT'];

    /**
     * Registry + Context → 허용 트리.
     *
     * @param array $ctx  [tenant_id, principal_type, principal_id, plan, platform, locale,
     *                     workspace_id, project_id, workspace_status, membership_status, capabilities, feature_flags]
     * @return array{tree:array,stats:array,denied:array}
     */
    public static function resolve(array $registry, array $ctx, array $sources = []): array
    {
        $items = $registry['items'] ?? [];
        $planMenuAccess = $sources['plan_menu_access'] ?? [];
        $globalVis = $sources['global_visibility'] ?? [];
        $overrides = $sources['tenant_overrides'] ?? [];
        $capabilities = $ctx['capabilities'] ?? [];        // capability_key => bool(enabled)
        $featureFlags = $ctx['feature_flags'] ?? null;     // null = 평가 소스 부재

        $principal = strtoupper((string)($ctx['principal_type'] ?? 'USER'));
        $platform = strtoupper((string)($ctx['platform'] ?? 'WEB_DESKTOP'));
        $plan = (string)($ctx['plan'] ?? 'free');

        $facts = [
            'context.tenant_id' => $ctx['tenant_id'] ?? null,
            'context.workspace_id' => $ctx['workspace_id'] ?? null,
            'context.project_id' => $ctx['project_id'] ?? null,
            'context.workspace_status' => $ctx['workspace_status'] ?? null,
            'subject.membership_status' => $ctx['membership_status'] ?? null,
            'subject.principal_type' => $principal,
            'subject.plan' => $plan,
            'subject.platform' => $platform,
            'subject.locale' => $ctx['locale'] ?? 'ko',
        ];

        $stats = ['total' => count($items), 'principal' => 0, 'platform' => 0, 'status' => 0,
                  'capability' => 0, 'feature_flag' => 0, 'permission' => 0, 'visibility' => 0,
                  'policy' => 0, 'context' => 0, 'pruned_empty' => 0, 'visible' => 0];
        $denied = [];
        $deny = function (string $key, string $reason) use (&$stats, &$denied) {
            $stats[$reason] = ($stats[$reason] ?? 0) + 1;
            $denied[] = ['menu_key' => $key, 'reason' => $reason];
        };

        $allowed = [];
        foreach ($items as $it) {
            $key = (string)$it['menu_key'];

            // ① Principal Type — 비인간 Principal 은 UI 메뉴 대상 아님(§11·최우선 차단)
            if (in_array($principal, self::NON_HUMAN_PRINCIPALS, true)) { $deny($key, 'principal'); continue; }
            if (!in_array($principal, (array)($it['target_principal_types'] ?? []), true)) { $deny($key, 'principal'); continue; }

            // ② Target Platform
            if (!in_array($platform, (array)($it['target_platforms'] ?? []), true)) { $deny($key, 'platform'); continue; }

            // ③ 상태 — BROKEN/ARCHIVED/DRAFT/HIDDEN 은 사용자 노출 금지(§12)
            $status = (string)($it['status'] ?? 'ACTIVE');
            if (in_array($status, ['BROKEN', 'ARCHIVED', 'DRAFT', 'HIDDEN'], true)) { $deny($key, 'status'); continue; }

            // ④ Capability — Part001 레지스트리 재사용. 미등록/비활성 = 숨김
            $capKey = $it['required_capability'] ?? null;
            if ($capKey !== null && ($capabilities[$capKey] ?? false) !== true) { $deny($key, 'capability'); continue; }

            // ⑤ Feature Flag — ★평가 소스 부재 시 보수적 차단(§22). 현재 선언 항목 0건이라 무영향.
            $flag = $it['required_feature_flag'] ?? null;
            if ($flag !== null) {
                if (!is_array($featureFlags) || ($featureFlags[$flag] ?? null) !== true) { $deny($key, 'feature_flag'); continue; }
            }

            // ⑥ Permission — 기존 plan_menu_access + 등급표 승계
            if (!self::hasMenuAccess($plan, $it, $planMenuAccess)) { $deny($key, 'permission'); continue; }

            // ⑦ Context Scope — 필요한 컨텍스트가 없으면 숨김
            $scope = (string)($it['context_scope'] ?? 'TENANT');
            if ($scope === 'WORKSPACE' && empty($ctx['workspace_id'])) { $deny($key, 'context'); continue; }
            if ($scope === 'PROJECT' && empty($ctx['project_id'])) { $deny($key, 'context'); continue; }
            if ($scope === 'ADMINISTRATION' && strtolower($plan) !== 'admin') { $deny($key, 'permission'); continue; }

            // ⑧ 전역 가시성 오버레이(menu_tree) — 기존 관리자 설정 존중
            $permKey = (string)($it['legacy_permission_key'] ?? '');
            $vis = $permKey !== '' ? ($globalVis[$permKey] ?? 'visible') : 'visible';
            if ($vis === 'hidden') { $deny($key, 'visibility'); continue; }

            // ⑨ Visibility Policy(JSON DSL)
            if (!self::evaluatePolicy($it['visibility_policy'] ?? null, $facts)) { $deny($key, 'policy'); continue; }

            // ⑩ Tenant Override 적용 — ★보안 조건은 절대 약화할 수 없다(§28·§33)
            $ov = $overrides[$key] ?? [];
            $node = [
                'menu_key' => $key,
                'type' => (string)($it['type'] ?? 'ITEM'),
                'label_key' => $it['label_key'] ?? null,
                'label' => $it['fallback_label'] ?? null,
                'icon' => $it['icon_key'] ?? null,
                'emoji' => $it['emoji_glyph'] ?? null,
                'sort_order' => (int)($it['sort_order'] ?? 0),
                'parent_menu_key' => $it['parent_menu_key'] ?? null,
                'target' => $it['target'] ?? null,
                'badge_provider_key' => $it['badge_provider_key'] ?? null,
                'context_scope' => $scope,
                'state' => $vis === 'disabled' || $status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
            ];
            if (isset($ov['LABEL']) && $ov['LABEL'] !== '') { $node['label'] = $ov['LABEL']; $node['label_key'] = null; }
            if (isset($ov['ICON']) && in_array($ov['ICON'], (array)($registry['vocabulary']['icon_keys'] ?? []), true)) $node['icon'] = $ov['ICON'];
            if (isset($ov['SORT_ORDER']) && is_numeric($ov['SORT_ORDER'])) $node['sort_order'] = (int)$ov['SORT_ORDER'];
            if (isset($ov['DISABLED']) && $ov['DISABLED'] === '1') $node['state'] = 'DISABLED';
            if (isset($ov['VISIBILITY']) && $ov['VISIBILITY'] === 'hidden') { $deny($key, 'visibility'); continue; }
            if ($status === 'DEPRECATED') $node['state'] = $node['state'] === 'DISABLED' ? 'DISABLED' : 'ENABLED';

            $allowed[$key] = $node;
        }

        // ⑪ 트리 구성 + 빈 섹션 정리(§41)
        $children = [];
        foreach ($allowed as $k => $n) {
            $p = $n['parent_menu_key'];
            if ($p !== null && isset($allowed[$p])) $children[$p][] = $k;
        }
        $roots = [];
        foreach ($allowed as $k => $n) {
            if ($n['parent_menu_key'] === null || !isset($allowed[$n['parent_menu_key']])) $roots[] = $k;
        }
        $build = function (string $k) use (&$build, $allowed, $children): array {
            $n = $allowed[$k];
            $kids = $children[$k] ?? [];
            usort($kids, fn($a, $b) => ($allowed[$a]['sort_order'] <=> $allowed[$b]['sort_order']) ?: strcmp($a, $b));
            $n['children'] = array_map($build, $kids);
            unset($n['parent_menu_key']);
            return $n;
        };
        usort($roots, fn($a, $b) => ($allowed[$a]['sort_order'] <=> $allowed[$b]['sort_order']) ?: strcmp($a, $b));
        $tree = [];
        foreach ($roots as $k) {
            $node = $build($k);
            // 컨테이너인데 자식이 하나도 없으면 제거(빈 그룹/섹션 정리)
            if (in_array($node['type'], ['SECTION', 'GROUP'], true) && count($node['children']) === 0) {
                $stats['pruned_empty']++;
                continue;
            }
            $tree[] = $node;
        }

        $count = function (array $nodes) use (&$count): int {
            $n = 0;
            foreach ($nodes as $x) { $n += 1 + $count($x['children'] ?? []); }
            return $n;
        };
        $stats['visible'] = $count($tree);
        return ['tree' => $tree, 'stats' => $stats, 'denied' => $denied];
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 6. Badge Provider (§19) — 실제 소스가 있는 것만 구현. 실패가 메뉴 조회를 죽이지 않는다.
     * ══════════════════════════════════════════════════════════════════════ */

    /** @return array{provider:string,count:int|null,available:bool,reason?:string} */
    public static function resolveBadge(\PDO $pdo, string $providerKey, string $tenant, string $userId): array
    {
        try {
            if ($providerKey === 'badge.unread_notifications') {
                $st = $pdo->prepare("SELECT COUNT(*) FROM user_notification WHERE tenant_id=? AND (is_read=0 OR is_read IS NULL)");
                $st->execute([$tenant]);
                return ['provider' => $providerKey, 'count' => (int)$st->fetchColumn(), 'available' => true];
            }
        } catch (\Throwable $e) {
            return ['provider' => $providerKey, 'count' => null, 'available' => false, 'reason' => 'source_unavailable'];
        }
        // ★미구현 Provider 는 0 을 반환하지 않는다(0 은 '읽을 것 없음'으로 오독된다).
        return ['provider' => $providerKey, 'count' => null, 'available' => false, 'reason' => 'provider_not_implemented'];
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 7. Context Factory — Request → NavigationContext(§33)
     * ══════════════════════════════════════════════════════════════════════ */

    /** Request 전체를 도메인에 넘기지 않는다 — 필요한 값만 추출한다. */
    private static function contextFrom(Request $req, array $g): array
    {
        $q = $req->getQueryParams();
        $user = null;
        try { $user = \Genie\Handlers\UserAuth::authedUser($req); } catch (\Throwable $e) { /* 세션 해석 실패 */ }

        $plan = strtolower(trim((string)($user['plan'] ?? $user['plans'] ?? 'free')));
        $teamRole = strtolower(trim((string)($user['team_role'] ?? '')));
        $principal = match ($teamRole) {
            'guest' => 'GUEST',
            'partner' => 'EXTERNAL_PARTNER',
            default => 'USER',
        };
        $platform = strtoupper(trim((string)($q['platform'] ?? 'WEB_DESKTOP')));
        if (!in_array($platform, ['WEB_DESKTOP', 'WEB_TABLET', 'WEB_MOBILE', 'PWA', 'COMMAND_PALETTE', 'ADMIN_CONSOLE', 'GLOBAL_SEARCH'], true)) {
            $platform = 'WEB_DESKTOP';
        }
        return [
            'tenant_id' => $g['tenant'],
            'principal_type' => $principal,
            'principal_id' => (string)($user['id'] ?? $g['tenant']),
            'plan' => $plan,
            // ★워크스페이스/프로젝트 컨텍스트는 **요청 파라미터를 그대로 신뢰하지 않는다**.
            //   현재 저장소에 워크스페이스 1급 엔티티가 없으므로(Part004-01 §5.3) null 로 두고,
            //   PROJECT 스코프 항목은 아직 레지스트리에 없다. Part004-03 에서 멤버십 검증과 함께 배선한다.
            'workspace_id' => null,
            'project_id' => null,
            'workspace_status' => null,
            'membership_status' => 'ACTIVE',
            'platform' => $platform,
            'locale' => (string)($q['locale'] ?? 'ko'),
        ];
    }

    /** Part001 Capability 레지스트리 재사용 — capability_key => enabled(bool). */
    private static function capabilityMap(\PDO $pdo, string $tenant, bool $isDemo): array
    {
        $out = [];
        try {
            $st = $pdo->prepare("SELECT c.capability_key, c.status, t.is_enabled
                FROM collaboration_capabilities c
                LEFT JOIN tenant_collaboration_capabilities t
                  ON t.capability_key = c.capability_key AND t.tenant_id = ?");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $key = (string)$r['capability_key'];
                $out[$key] = $r['is_enabled'] !== null
                    ? ((int)$r['is_enabled'] === 1)
                    : in_array((string)$r['status'], ['ENABLED', 'PARTIAL'], true);
            }
        } catch (\Throwable $e) { /* 레지스트리 부재 = 빈 맵 → capability 요구 항목은 숨김(보수적) */ }
        return $out;
    }

    /* ══════════════════════════════════════════════════════════════════════
     * 8. Endpoints
     * ══════════════════════════════════════════════════════════════════════ */

    private static function unavailable(Response $resp): Response
    {
        // ★정직 미산출 — 빈 트리를 '정상'으로 위장하지 않는다.
        return self::json($resp, [
            'ok' => false,
            'available' => false,
            'reason' => 'registry_snapshot_unavailable',
            'message' => '내비게이션 레지스트리 스냅샷이 없거나 검증을 통과하지 못했습니다.',
            'how_to_generate' => 'node tools/navigation_registry_build.mjs',
        ], 503);
    }

    /** GET /v425/pm/navigation — 현재 사용자에게 허용된 트리만 반환. */
    public static function tree(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);

        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        $ctx = self::contextFrom($req, $g);
        $ctx['capabilities'] = self::capabilityMap($g['pdo'], $g['tenant'], $g['isDemo']);
        $ctx['feature_flags'] = null;   // 평가 소스 부재(실측) — 선언 항목 0건이라 무영향

        $res = self::resolve($reg, $ctx, [
            'plan_menu_access' => self::planMenuAccess($g['pdo']),
            'global_visibility' => self::globalVisibility($g['pdo']),
            'tenant_overrides' => self::tenantOverrides($g['pdo'], $g['tenant']),
        ]);

        // Badge — include_badges=1 일 때만(기본 미계산). 실패해도 트리는 반환된다.
        $badges = [];
        if (($req->getQueryParams()['include_badges'] ?? '') === '1') {
            foreach (array_keys((array)($reg['vocabulary']['badge_providers'] ?? [])) as $pk) {
                $badges[$pk] = self::resolveBadge($g['pdo'], (string)$pk, $g['tenant'], (string)$ctx['principal_id']);
            }
        }

        $payload = [
            'ok' => true,
            'available' => true,
            'registry_version' => $reg['registry_version'] ?? null,
            'context' => [
                'tenant_id' => $ctx['tenant_id'], 'platform' => $ctx['platform'],
                'principal_type' => $ctx['principal_type'], 'locale' => $ctx['locale'],
            ],
            'items' => $res['tree'],
            'badges' => $badges,
            // ★일반 사용자 응답에는 거부 사유(권한 내부정보)를 넣지 않는다(§34·§48).
            'meta' => ['visible_count' => $res['stats']['visible'], 'generated_at' => gmdate('c')],
        ];

        $etag = '"nav-' . substr(sha1((string)json_encode([$reg['registry_version'] ?? '', $res['tree']])), 0, 16) . '"';
        if (trim($req->getHeaderLine('If-None-Match')) === $etag) {
            return $resp->withStatus(304)->withHeader('ETag', $etag)->withHeader('Cache-Control', 'private, max-age=0, must-revalidate');
        }
        return self::json($resp, $payload)
            ->withHeader('ETag', $etag)
            ->withHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    }

    /** GET /v425/pm/navigation/items/{menuKey} — 허용된 항목만. alias 도 해석한다. */
    public static function item(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);

        $key = (string)($args['menuKey'] ?? '');
        $resolved = self::resolveAlias($reg, $key);
        $ctx = self::contextFrom($req, $g);
        $ctx['capabilities'] = self::capabilityMap($g['pdo'], $g['tenant'], $g['isDemo']);
        $ctx['feature_flags'] = null;
        $res = self::resolve($reg, $ctx, [
            'plan_menu_access' => self::planMenuAccess($g['pdo']),
            'global_visibility' => self::globalVisibility($g['pdo']),
            'tenant_overrides' => self::tenantOverrides($g['pdo'], $g['tenant']),
        ]);
        $found = null;
        $walk = function (array $nodes) use (&$walk, $resolved, &$found): void {
            foreach ($nodes as $n) {
                if ($n['menu_key'] === $resolved) { $found = $n; return; }
                $walk($n['children'] ?? []);
                if ($found) return;
            }
        };
        $walk($res['tree']);
        if ($found === null) return self::json($resp, ['ok' => false, 'error' => 'not_found_or_not_allowed'], 404);
        return self::json($resp, ['ok' => true, 'item' => $found, 'resolved_from_alias' => $resolved !== $key ? $key : null]);
    }

    /** Alias 해석 — 체인 금지(1홉). */
    public static function resolveAlias(array $reg, string $key): string
    {
        foreach ((array)($reg['aliases'] ?? []) as $a) {
            if (($a['status'] ?? '') !== 'ACTIVE') continue;
            if ((string)($a['alias_key'] ?? '') === $key && !empty($a['target_menu_key'])) return (string)$a['target_menu_key'];
        }
        return $key;
    }

    /** GET /v425/pm/navigation/registry (admin) — 전체 레지스트리 + 검증 요약. */
    public static function registryView(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);
        return self::json($resp, [
            'ok' => true,
            'registry_version' => $reg['registry_version'] ?? null,
            'source_revision' => $reg['source_revision'] ?? null,
            'generated_at' => $reg['generated_at'] ?? null,
            'activatable' => $reg['activatable'] ?? false,
            'validation' => $reg['validation'] ?? null,
            'vocabulary' => $reg['vocabulary'] ?? null,
            'item_count' => count($reg['items'] ?? []),
            'alias_count' => count($reg['aliases'] ?? []),
            'items' => $reg['items'] ?? [],
            'aliases' => $reg['aliases'] ?? [],
        ]);
    }

    /** POST /v425/pm/navigation/validate (admin) — 활성 스냅샷 재검증(런타임 정합). */
    public static function validate(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);

        $issues = [];
        $byKey = [];
        foreach ($reg['items'] as $i) $byKey[(string)$i['menu_key']] = $i;
        foreach ($reg['items'] as $i) {
            $k = (string)$i['menu_key'];
            if (!preg_match('/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/', $k)) $issues[] = ['CRITICAL', 'INVALID_MENU_KEY', $k];
            if (!empty($i['parent_menu_key']) && !isset($byKey[$i['parent_menu_key']])) $issues[] = ['CRITICAL', 'ORPHAN_PARENT', $k];
            if (($i['context_scope'] ?? '') === 'ADMINISTRATION' && empty($i['permission_rule'])) $issues[] = ['CRITICAL', 'ADMIN_SCOPE_WITHOUT_PERMISSION', $k];
            foreach (self::NON_HUMAN_PRINCIPALS as $np) {
                if (in_array($np, (array)($i['target_principal_types'] ?? []), true)) $issues[] = ['CRITICAL', 'NON_HUMAN_UI_TARGET', $k];
            }
            if (($i['status'] ?? '') === 'BROKEN') $issues[] = ['ERROR', 'BROKEN_ITEM', $k];
            $pol = self::validatePolicy($i['visibility_policy'] ?? null);
            foreach ($pol as $e) $issues[] = ['CRITICAL', 'INVALID_VISIBILITY_POLICY', $k . ': ' . $e];
        }
        // Tenant Override 무결성(런타임 전용 검사 — 빌드 스냅샷에는 없다)
        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        foreach (self::tenantOverrides($g['pdo'], $g['tenant']) as $mk => $ovs) {
            if (!isset($byKey[$mk])) $issues[] = ['ERROR', 'OVERRIDE_TARGET_MISSING', $mk];
            foreach (array_keys($ovs) as $t) {
                if (!in_array($t, self::OVERRIDE_TYPES, true)) $issues[] = ['ERROR', 'INVALID_OVERRIDE_TYPE', "$mk:$t"];
            }
        }
        $critical = count(array_filter($issues, fn($x) => $x[0] === 'CRITICAL'));
        return self::json($resp, [
            'ok' => true,
            'registry_version' => $reg['registry_version'] ?? null,
            'build_validation' => $reg['validation']['counts'] ?? null,
            'runtime_issues' => array_map(fn($x) => ['severity' => $x[0], 'code' => $x[1], 'target' => $x[2]], $issues),
            'activatable' => $critical === 0,
        ]);
    }

    /**
     * POST /v425/pm/navigation/preview (admin) — 특정 프로필 기준 예상 메뉴.
     * ★실제 권한 변경/임퍼소네이트 없음(§54) — 계산만 하고 세션에 아무 영향 없다.
     * ★테넌트 격리: 자기 테넌트 컨텍스트로만 계산한다(다른 tenant_id 지정 불가).
     */
    public static function preview(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);

        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }

        $principal = strtoupper((string)($b['principal_type'] ?? 'USER'));
        if (!in_array($principal, ['USER', 'GUEST', 'EXTERNAL_PARTNER', 'VENDOR', 'CUSTOMER', 'AUDITOR', 'AI_AGENT', 'SERVICE_ACCOUNT', 'PLATFORM_OPERATOR'], true)) {
            return self::json($resp, ['ok' => false, 'error' => 'invalid_principal_type'], 422);
        }
        $plan = strtolower((string)($b['plan'] ?? 'free'));
        if (!isset(self::PLAN_RANK[$plan])) return self::json($resp, ['ok' => false, 'error' => 'invalid_plan'], 422);
        $platform = strtoupper((string)($b['platform'] ?? 'WEB_DESKTOP'));

        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        $ctx = [
            'tenant_id' => $g['tenant'],                 // ★요청 body 의 tenant_id 는 무시(Cross-Tenant 차단)
            'principal_type' => $principal, 'principal_id' => 'preview',
            'plan' => $plan, 'platform' => $platform, 'locale' => (string)($b['locale'] ?? 'ko'),
            'workspace_id' => null, 'project_id' => null, 'workspace_status' => null,
            'membership_status' => 'ACTIVE',
            'capabilities' => self::capabilityMap($g['pdo'], $g['tenant'], $g['isDemo']),
            'feature_flags' => null,
        ];
        $res = self::resolve($reg, $ctx, [
            'plan_menu_access' => self::planMenuAccess($g['pdo']),
            'global_visibility' => self::globalVisibility($g['pdo']),
            'tenant_overrides' => self::tenantOverrides($g['pdo'], $g['tenant']),
        ]);

        try {
            self::auditLog($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => (string)($g['user_id'] ?? $g['tenant']),
                'entity_type' => 'navigation_preview', 'entity_id' => "$principal/$plan/$platform",
                'action' => 'navigation_previewed', 'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        } catch (\Throwable $e) { /* 감사 실패가 미리보기를 막지 않는다 */ }

        // 관리자 Preview 에서만 숨김 근거를 노출한다(§34).
        return self::json($resp, [
            'ok' => true, 'registry_version' => $reg['registry_version'] ?? null,
            'profile' => ['principal_type' => $principal, 'plan' => $plan, 'platform' => $platform],
            'items' => $res['tree'], 'stats' => $res['stats'],
            'denied_sample' => array_slice($res['denied'], 0, 50),
        ]);
    }

    /**
     * GET /v425/pm/navigation/shadow-compare (admin · §42 Shadow Resolve).
     *
     * 레거시(프론트 사이드바가 계산하는 것)와 신규 Registry Resolver 결과를 **동시에 계산**해 차이를 보고한다.
     * 사용자에게는 여전히 레거시가 렌더되며, 본 엔드포인트는 전환 안전성을 측정만 한다.
     */
    public static function shadowCompare(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);

        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        $pma = self::planMenuAccess($g['pdo']);
        $gv = self::globalVisibility($g['pdo']);
        $ovr = self::tenantOverrides($g['pdo'], $g['tenant']);
        $caps = self::capabilityMap($g['pdo'], $g['tenant'], $g['isDemo']);

        $report = [];
        foreach (['free', 'starter', 'growth', 'pro', 'enterprise', 'admin'] as $plan) {
            // ── 레거시 계산: 프론트가 하는 것과 동일한 규칙을 레지스트리의 legacy_* 필드로 재현
            $legacy = [];
            foreach ($reg['items'] as $it) {
                if (($it['type'] ?? '') !== 'ITEM') continue;
                if (($it['legacy']['audience'] ?? '') === 'ADMIN' && $plan !== 'admin') continue;
                if (!self::hasMenuAccess($plan, $it, $pma)) continue;
                $legacy[] = (string)$it['menu_key'];
            }
            // ── 신규 Resolver 계산
            $res = self::resolve($reg, [
                'tenant_id' => $g['tenant'], 'principal_type' => 'USER', 'principal_id' => 'shadow',
                'plan' => $plan, 'platform' => 'WEB_DESKTOP', 'locale' => 'ko',
                'workspace_id' => null, 'project_id' => null, 'membership_status' => 'ACTIVE',
                'capabilities' => $caps, 'feature_flags' => null,
            ], ['plan_menu_access' => $pma, 'global_visibility' => $gv, 'tenant_overrides' => $ovr]);

            $flat = [];
            $walk = function (array $nodes) use (&$walk, &$flat): void {
                foreach ($nodes as $n) { if (($n['type'] ?? '') === 'ITEM') $flat[] = $n['menu_key']; $walk($n['children'] ?? []); }
            };
            $walk($res['tree']);

            sort($legacy); sort($flat);
            $missing = array_values(array_diff($legacy, $flat));   // 레거시엔 있는데 신규에 없다 = 메뉴 손실 위험
            $extra = array_values(array_diff($flat, $legacy));     // 신규에만 있다 = 과다 노출 위험
            $report[$plan] = [
                'legacy_count' => count($legacy), 'registry_count' => count($flat),
                'missing_in_registry' => $missing, 'extra_in_registry' => $extra,
                'identical' => count($missing) === 0 && count($extra) === 0,
            ];
        }

        $allIdentical = !in_array(false, array_column($report, 'identical'), true);
        return self::json($resp, [
            'ok' => true, 'registry_version' => $reg['registry_version'] ?? null,
            'all_identical' => $allIdentical,
            'note' => '레거시 사이드바는 그대로 렌더된다. 본 비교는 Part004-03 전환 안전성 측정 전용이다.',
            'by_plan' => $report,
        ]);
    }

    /* ── Tenant Override 관리(admin · 보안 조건 약화 불가) ────────────────── */

    /** GET /v425/pm/navigation/overrides (admin) */
    public static function listOverrides(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        $rows = [];
        try {
            $st = $g['pdo']->prepare("SELECT public_id, menu_key, override_type, override_value, status, created_by, created_at, updated_at
                                      FROM navigation_overrides WHERE tenant_id=? ORDER BY menu_key, override_type LIMIT 500");
            $st->execute([$g['tenant']]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { /* 부재 = 빈 목록 */ }
        return self::json($resp, ['ok' => true, 'tenant' => $g['tenant'], 'overrides' => $rows, 'count' => count($rows)]);
    }

    /** POST /v425/pm/navigation/overrides (admin) */
    public static function upsertOverride(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $reg = self::registry();
        if ($reg === null) return self::unavailable($resp);

        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $menuKey = trim((string)($b['menu_key'] ?? ''));
        $type = strtoupper(trim((string)($b['override_type'] ?? '')));
        $value = (string)($b['override_value'] ?? '');

        $item = null;
        foreach ($reg['items'] as $i) if ((string)$i['menu_key'] === $menuKey) { $item = $i; break; }
        if ($item === null) return self::json($resp, ['ok' => false, 'error' => 'unknown_menu_key'], 404);
        if (!in_array($type, self::OVERRIDE_TYPES, true)) return self::json($resp, ['ok' => false, 'error' => 'invalid_override_type', 'allowed' => self::OVERRIDE_TYPES], 422);

        // ★보안 경계(§28·§33) — 오버라이드로 권한/등급/스코프를 절대 약화할 수 없다.
        //   PERMISSION/CAPABILITY/FEATURE_FLAG/PARENT 는 애초에 OVERRIDE_TYPES 에 없다(구조적 차단).
        //   추가로 ADMINISTRATION 메뉴는 라벨/아이콘/순서조차 조작 불가(관리 메뉴 위장 방지).
        if (($item['context_scope'] ?? '') === 'ADMINISTRATION') {
            return self::json($resp, ['ok' => false, 'error' => 'administration_menu_not_overridable',
                'message' => '플랫폼 관리 메뉴는 테넌트 재정의 대상이 아닙니다.'], 403);
        }
        // 라벨 XSS 차단(§48)
        if ($type === 'LABEL') {
            if ($value === '' || mb_strlen($value) > 80) return self::json($resp, ['ok' => false, 'error' => 'invalid_label_length'], 422);
            if (preg_match('/[<>]|javascript:|data:/i', $value)) return self::json($resp, ['ok' => false, 'error' => 'unsafe_label'], 422);
        }
        if ($type === 'ICON' && !in_array($value, (array)($reg['vocabulary']['icon_keys'] ?? []), true)) {
            return self::json($resp, ['ok' => false, 'error' => 'icon_not_allowed'], 422);
        }
        if ($type === 'SORT_ORDER' && !preg_match('/^-?\d{1,6}$/', $value)) return self::json($resp, ['ok' => false, 'error' => 'invalid_sort_order'], 422);
        if ($type === 'VISIBILITY' && !in_array($value, ['visible', 'hidden'], true)) return self::json($resp, ['ok' => false, 'error' => 'invalid_visibility'], 422);
        if ($type === 'DISABLED' && !in_array($value, ['0', '1'], true)) return self::json($resp, ['ok' => false, 'error' => 'invalid_disabled'], 422);

        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        $now = gmdate('c');
        $pid = 'novr_' . substr(sha1($g['tenant'] . '|' . $menuKey . '|' . $type), 0, 16);
        $isMy = $g['pdo']->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO navigation_overrides (public_id,tenant_id,menu_key,override_type,override_value,status,created_by,created_at,updated_at)
               VALUES (?,?,?,?,?, 'ACTIVE', ?,?,?)
               ON DUPLICATE KEY UPDATE override_value=VALUES(override_value), status='ACTIVE', updated_at=VALUES(updated_at)"
            : "INSERT INTO navigation_overrides (public_id,tenant_id,menu_key,override_type,override_value,status,created_by,created_at,updated_at)
               VALUES (?,?,?,?,?, 'ACTIVE', ?,?,?)
               ON CONFLICT(tenant_id,menu_key,override_type) DO UPDATE SET override_value=excluded.override_value, status='ACTIVE', updated_at=excluded.updated_at";
        try {
            $g['pdo']->prepare($sql)->execute([$pid, $g['tenant'], $menuKey, $type, $value, (string)($g['user_id'] ?? ''), $now, $now]);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'override_write_failed'], 500);
        }
        try {
            self::auditLog($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => (string)($g['user_id'] ?? $g['tenant']),
                'entity_type' => 'navigation_override', 'entity_id' => $pid, 'action' => 'navigation_override_upserted',
                'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        } catch (\Throwable $e) { }
        return self::json($resp, ['ok' => true, 'public_id' => $pid, 'menu_key' => $menuKey, 'override_type' => $type]);
    }

    /** POST /v425/pm/navigation/overrides/{id}/remove (admin) */
    public static function removeOverride(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        self::ensureOverrideTable($g['pdo'], $g['isDemo']);
        $pid = (string)($args['id'] ?? '');
        try {
            // ★테넌트 격리 — 다른 테넌트의 오버라이드는 절대 지울 수 없다.
            $st = $g['pdo']->prepare("DELETE FROM navigation_overrides WHERE tenant_id=? AND public_id=?");
            $st->execute([$g['tenant'], $pid]);
            if ($st->rowCount() === 0) return self::json($resp, ['ok' => false, 'error' => 'not_found'], 404);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'override_delete_failed'], 500);
        }
        try {
            self::auditLog($g['pdo'], ['tenant_id' => $g['tenant'], 'actor_user_id' => (string)($g['user_id'] ?? $g['tenant']),
                'entity_type' => 'navigation_override', 'entity_id' => $pid, 'action' => 'navigation_override_removed',
                'ip' => self::clientIp($req), 'ua' => self::userAgent($req)]);
        } catch (\Throwable $e) { }
        return self::json($resp, ['ok' => true]);
    }
}
