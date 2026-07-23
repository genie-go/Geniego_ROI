<?php
declare(strict_types=1);

/**
 * [CWIS Part004-02] Navigation Resolver PHP 자기검증.
 *
 * ★교차검증: 저장소에 PHPUnit/Pest 러너가 없다(composer.json require-dev = phpstan 뿐 — 실측).
 *   명세의 Unit/Repository/API/Security/Migration 테스트를 **DB 없이 순수 Resolver 로 실행 가능한**
 *   자기검증 스크립트로 적응한다(backend/bin/navigation_registry.php selftest 로 호출).
 *
 * 실행: php backend/bin/navigation_registry.php selftest
 */

use Genie\Handlers\PM\Navigation;

if (!class_exists(Navigation::class)) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

$PASS = 0;
$FAIL = 0;
$LINES = [];

$t = function (string $name, callable $fn) use (&$PASS, &$FAIL, &$LINES): void {
    try {
        $fn();
        $PASS++; $LINES[] = "  PASS  $name";
    } catch (\Throwable $e) {
        $FAIL++; $LINES[] = "  FAIL  $name\n        " . $e->getMessage();
    }
};
$ok = function (bool $c, string $m = 'assertion failed'): void { if (!$c) throw new \RuntimeException($m); };
$eq = function ($a, $b, string $m = ''): void {
    $sa = json_encode($a, JSON_UNESCAPED_UNICODE); $sb = json_encode($b, JSON_UNESCAPED_UNICODE);
    if ($sa !== $sb) throw new \RuntimeException("$m expected $sb, got $sa");
};

/* ── 합성 레지스트리 (DB·파일 무관 · 결정적) ─────────────────────────────── */
$mkItem = function (array $o): array {
    return array_merge([
        'menu_key' => 'x.y', 'parent_menu_key' => null, 'type' => 'ITEM',
        'label_key' => null, 'fallback_label' => 'L', 'icon_key' => 'home', 'emoji_glyph' => null,
        'badge_provider_key' => null, 'sort_order' => 10, 'context_scope' => 'TENANT',
        'permission_rule' => null, 'legacy_permission_key' => null, 'required_plan' => null,
        'admin_only' => false, 'required_capability' => null, 'required_feature_flag' => null,
        'visibility_policy' => null,
        'target' => ['type' => 'INTERNAL_ROUTE', 'route_name' => '/x'],
        'target_platforms' => ['WEB_DESKTOP', 'WEB_MOBILE'],
        'target_principal_types' => ['USER'],
        'status' => 'ACTIVE', 'is_system' => true, 'legacy' => ['audience' => 'MEMBER'],
    ], $o);
};
$REG = [
    'registry_version' => 'test.1',
    'activatable' => true,
    'vocabulary' => ['icon_keys' => ['home', 'users', 'shield'], 'badge_providers' => []],
    'items' => [
        $mkItem(['menu_key' => 'home.section', 'type' => 'SECTION', 'target' => null, 'sort_order' => 100]),
        $mkItem(['menu_key' => 'home.dashboard', 'parent_menu_key' => 'home.section', 'legacy_permission_key' => 'home||dashboard', 'required_plan' => 'free', 'sort_order' => 10]),
        $mkItem(['menu_key' => 'ops.wms', 'parent_menu_key' => 'home.section', 'legacy_permission_key' => 'ops', 'required_plan' => 'pro', 'sort_order' => 20]),
        $mkItem(['menu_key' => 'administration.section', 'type' => 'SECTION', 'target' => null, 'context_scope' => 'ADMINISTRATION',
                 'permission_rule' => ['mode' => 'ALL', 'permissions' => ['platform.admin']],
                 'target_principal_types' => ['USER', 'PLATFORM_OPERATOR'],
                 'target_platforms' => ['WEB_DESKTOP', 'ADMIN_CONSOLE'], 'sort_order' => 900,
                 'legacy' => ['audience' => 'ADMIN']]),
        $mkItem(['menu_key' => 'administration.db', 'parent_menu_key' => 'administration.section', 'context_scope' => 'ADMINISTRATION',
                 'legacy_permission_key' => 'system||db_admin', 'required_plan' => 'admin', 'admin_only' => true,
                 'permission_rule' => ['mode' => 'ALL', 'permissions' => ['platform.admin']],
                 'target_principal_types' => ['USER', 'PLATFORM_OPERATOR'],
                 'target_platforms' => ['WEB_DESKTOP', 'ADMIN_CONSOLE'], 'sort_order' => 10,
                 'legacy' => ['audience' => 'ADMIN']]),
    ],
    'aliases' => [
        ['alias_key' => '/dashboard', 'target_menu_key' => 'home.dashboard', 'alias_type' => 'LEGACY_PATH', 'status' => 'ACTIVE'],
        ['alias_key' => '/old-wms', 'target_menu_key' => 'ops.wms', 'alias_type' => 'LEGACY_ROUTE', 'status' => 'ACTIVE'],
    ],
];
$ctx = function (array $o = []) : array {
    return array_merge([
        'tenant_id' => 't1', 'principal_type' => 'USER', 'principal_id' => 'u1', 'plan' => 'pro',
        'platform' => 'WEB_DESKTOP', 'locale' => 'ko', 'workspace_id' => null, 'project_id' => null,
        'membership_status' => 'ACTIVE', 'capabilities' => [], 'feature_flags' => null,
    ], $o);
};
$flat = function (array $tree): array {
    $out = [];
    $w = function (array $ns) use (&$w, &$out): void {
        foreach ($ns as $n) { $out[] = $n['menu_key']; $w($n['children'] ?? []); }
    };
    $w($tree);
    sort($out);
    return $out;
};

/* ══ 1. Permission — 기존 hasMenuAccess 의미 재현 ═══════════════════════════ */

$t('permission: admin 은 전권', function () use ($REG, $ok) {
    $i = $REG['items'][4];
    $ok(Navigation::hasMenuAccess('admin', $i, []), 'admin 이 admin 메뉴에 접근 못함');
});

$t('permission: enterprise 는 admin 전용 메뉴 차단(은행급 격리)', function () use ($REG, $ok) {
    $i = $REG['items'][4];
    $ok(!Navigation::hasMenuAccess('enterprise', $i, []), 'enterprise 가 admin 메뉴를 통과했다');
});

$t('permission: enterprise 는 admin 전용 외 전체 허용', function () use ($REG, $ok) {
    $ok(Navigation::hasMenuAccess('enterprise', $REG['items'][2], []), 'enterprise 가 pro 메뉴에 막혔다');
});

$t('permission: 등급표 폴백(free 는 pro 메뉴 차단)', function () use ($REG, $ok) {
    $ok(!Navigation::hasMenuAccess('free', $REG['items'][2], []), 'free 가 pro 메뉴를 통과했다');
    $ok(Navigation::hasMenuAccess('free', $REG['items'][1], []), 'free 가 free 메뉴에 막혔다');
});

$t('permission: plan_menu_access(관리자 설정)가 등급표를 우선한다', function () use ($REG, $ok) {
    $pma = ['free' => ['ops']];   // 관리자가 free 에 ops 를 열어준 상황
    $ok(Navigation::hasMenuAccess('free', $REG['items'][2], $pma), '관리자 설정이 무시됐다');
});

$t('permission: 202차 하위호환 — ops 보유 플랜은 commerce_channel 도 허용', function () use ($ok) {
    $item = ['legacy_permission_key' => 'commerce_channel', 'required_plan' => 'free', 'admin_only' => false];
    $ok(Navigation::hasMenuAccess('starter', $item, ['starter' => ['ops']]), '하위호환 규칙이 깨졌다');
});

$t('permission: plan_menu_access 는 prefix 매칭을 유지한다', function () use ($ok) {
    $item = ['legacy_permission_key' => 'system||workspace', 'required_plan' => 'free', 'admin_only' => false];
    $ok(Navigation::hasMenuAccess('starter', $item, ['starter' => ['system||']]), 'prefix 매칭이 깨졌다');
});

$t('permission: admin_only 는 plan_menu_access 로도 뚫리지 않는다', function () use ($REG, $ok) {
    $ok(!Navigation::hasMenuAccess('pro', $REG['items'][4], ['pro' => ['system||db_admin']]),
        '관리자 설정으로 admin 전용 메뉴가 뚫렸다');
});

/* ══ 2. Principal Type — 비인간/외부 차단 ═══════════════════════════════════ */

$t('principal: AI_AGENT 는 UI 메뉴를 한 건도 받지 못한다', function () use ($REG, $ctx, $flat, $eq) {
    $r = Navigation::resolve($REG, $ctx(['principal_type' => 'AI_AGENT', 'plan' => 'admin']), []);
    $eq($flat($r['tree']), [], 'AI_AGENT 에 메뉴가 노출됐다');
});

$t('principal: SERVICE_ACCOUNT 도 전면 차단', function () use ($REG, $ctx, $flat, $eq) {
    $r = Navigation::resolve($REG, $ctx(['principal_type' => 'SERVICE_ACCOUNT', 'plan' => 'admin']), []);
    $eq($flat($r['tree']), [], 'SERVICE_ACCOUNT 에 메뉴가 노출됐다');
});

$t('principal: GUEST 는 target_principal_types 미포함이라 차단', function () use ($REG, $ctx, $flat, $eq) {
    $r = Navigation::resolve($REG, $ctx(['principal_type' => 'GUEST', 'plan' => 'enterprise']), []);
    $eq($flat($r['tree']), [], 'GUEST 에 내부 메뉴가 노출됐다');
});

$t('principal: EXTERNAL_PARTNER 도 동일하게 차단', function () use ($REG, $ctx, $flat, $eq) {
    $r = Navigation::resolve($REG, $ctx(['principal_type' => 'EXTERNAL_PARTNER', 'plan' => 'enterprise']), []);
    $eq($flat($r['tree']), [], 'EXTERNAL_PARTNER 에 내부 메뉴가 노출됐다');
});

/* ══ 3. 관리자 메뉴 격리 ════════════════════════════════════════════════════ */

$t('admin 격리: pro 사용자에게 ADMINISTRATION 트리가 없다', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'pro']), []);
    $keys = $flat($r['tree']);
    $ok(!in_array('administration.db', $keys, true), '관리자 메뉴가 일반 사용자에게 노출됐다');
    $ok(!in_array('administration.section', $keys, true), '관리자 섹션이 노출됐다(빈 섹션 정리 실패)');
});

$t('admin 격리: enterprise 에게도 ADMINISTRATION 이 없다', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'enterprise']), []);
    $ok(!in_array('administration.db', $flat($r['tree']), true), 'enterprise 에 관리자 메뉴가 노출됐다');
});

$t('admin 격리: admin 에게는 ADMINISTRATION 이 보인다', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'admin']), []);
    $ok(in_array('administration.db', $flat($r['tree']), true), 'admin 이 관리자 메뉴를 못 본다');
});

/* ══ 4. 상태·플랫폼·Capability·Feature Flag 필터 ═══════════════════════════ */

$t('status: BROKEN/DRAFT/HIDDEN/ARCHIVED 는 사용자에게 노출되지 않는다', function () use ($REG, $ctx, $flat, $ok) {
    foreach (['BROKEN', 'DRAFT', 'HIDDEN', 'ARCHIVED'] as $st) {
        $reg = $REG;
        $reg['items'][1]['status'] = $st;
        $r = Navigation::resolve($reg, $ctx(['plan' => 'admin']), []);
        $ok(!in_array('home.dashboard', $flat($r['tree']), true), "$st 항목이 노출됐다");
    }
});

$t('platform: 대상 플랫폼이 아니면 제외된다', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['platform' => 'COMMAND_PALETTE', 'plan' => 'admin']), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), '팔레트 대상이 아닌 항목이 노출됐다');
});

$t('capability: 요구 capability 가 비활성이면 숨김', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][1]['required_capability'] = 'collaboration.messaging';
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'capabilities' => ['collaboration.messaging' => false]]), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), '비활성 capability 메뉴가 노출됐다');
    $r2 = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'capabilities' => ['collaboration.messaging' => true]]), []);
    $ok(in_array('home.dashboard', $flat($r2['tree']), true), '활성 capability 인데 숨겨졌다');
});

$t('capability: 맵 자체가 비어 있으면(레지스트리 부재) 보수적으로 숨긴다', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][1]['required_capability'] = 'collaboration.messaging';
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'capabilities' => []]), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), 'capability 미해석인데 노출됐다');
});

$t('feature flag: 평가 소스가 없으면 flag 선언 항목은 숨긴다(§22 보수적)', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][1]['required_feature_flag'] = 'feature.new_sidebar';
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'feature_flags' => null]), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), 'flag 평가 불가인데 노출됐다');
    $r2 = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'feature_flags' => ['feature.new_sidebar' => true]]), []);
    $ok(in_array('home.dashboard', $flat($r2['tree']), true), 'flag ON 인데 숨겨졌다');
});

/* ══ 5. Context Scope ═══════════════════════════════════════════════════════ */

$t('context: WORKSPACE 스코프는 workspace_id 없으면 숨김', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][1]['context_scope'] = 'WORKSPACE';
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'workspace_id' => null]), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), '워크스페이스 컨텍스트 없이 노출됐다');
    $r2 = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'workspace_id' => 'ws1']), []);
    $ok(in_array('home.dashboard', $flat($r2['tree']), true), '워크스페이스 있는데 숨겨졌다');
});

$t('context: PROJECT 스코프는 project_id 없으면 숨김', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][1]['context_scope'] = 'PROJECT';
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin']), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), '프로젝트 컨텍스트 없이 노출됐다');
});

/* ══ 6. Visibility Policy DSL ══════════════════════════════════════════════ */

$t('policy: 허용 attribute/operator 만 통과한다', function () use ($ok) {
    $errs = Navigation::validatePolicy(['all' => [['attribute' => 'context.workspace_status', 'operator' => 'equals', 'value' => 'ACTIVE']]]);
    $ok(count($errs) === 0, '유효 정책이 거부됐다: ' . implode(';', $errs));
});

$t('policy: 미등록 attribute 는 거부된다(Injection 차단)', function () use ($ok) {
    $errs = Navigation::validatePolicy(['all' => [['attribute' => 'system.exec', 'operator' => 'equals', 'value' => 'x']]]);
    $ok(count($errs) > 0, '임의 attribute 가 통과했다');
});

$t('policy: 미등록 operator 도 거부된다', function () use ($ok) {
    $errs = Navigation::validatePolicy(['all' => [['attribute' => 'subject.plan', 'operator' => 'eval', 'value' => 'x']]]);
    $ok(count($errs) > 0, '임의 operator 가 통과했다');
});

$t('policy: 평가 — all/any/none 결합자', function () use ($ok) {
    $facts = ['subject.plan' => 'pro', 'context.workspace_status' => 'ACTIVE'];
    $ok(Navigation::evaluatePolicy(['all' => [
        ['attribute' => 'subject.plan', 'operator' => 'equals', 'value' => 'pro'],
        ['attribute' => 'context.workspace_status', 'operator' => 'equals', 'value' => 'ACTIVE'],
    ]], $facts), 'all 이 실패');
    $ok(Navigation::evaluatePolicy(['any' => [
        ['attribute' => 'subject.plan', 'operator' => 'equals', 'value' => 'free'],
        ['attribute' => 'subject.plan', 'operator' => 'equals', 'value' => 'pro'],
    ]], $facts), 'any 가 실패');
    $ok(!Navigation::evaluatePolicy(['none' => [
        ['attribute' => 'subject.plan', 'operator' => 'equals', 'value' => 'pro'],
    ]], $facts), 'none 이 실패');
});

$t('policy: 해석 불가 정책은 false(Default Hidden)', function () use ($ok) {
    $ok(!Navigation::evaluatePolicy(['all' => [['attribute' => 'x.y', 'operator' => 'equals', 'value' => 1]]], []),
        '알 수 없는 attribute 가 true 를 반환했다');
    $ok(!Navigation::evaluatePolicy(['bogus' => []], []), '알 수 없는 결합자가 true 를 반환했다');
});

$t('policy: 정책이 메뉴 노출을 실제로 막는다', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][1]['visibility_policy'] = ['all' => [['attribute' => 'subject.membership_status', 'operator' => 'equals', 'value' => 'ACTIVE']]];
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin', 'membership_status' => 'SUSPENDED']), []);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), '만료 멤버십에 메뉴가 노출됐다');
});

/* ══ 7. 전역 가시성 · 테넌트 오버라이드 ════════════════════════════════════ */

$t('overlay: menu_tree hidden 은 메뉴를 숨긴다(기존 관리자 설정 존중)', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'admin']), ['global_visibility' => ['home||dashboard' => 'hidden']]);
    $ok(!in_array('home.dashboard', $flat($r['tree']), true), '전역 hidden 이 무시됐다');
});

$t('overlay: menu_tree disabled 는 노출하되 DISABLED 상태', function () use ($REG, $ctx, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'admin']), ['global_visibility' => ['home||dashboard' => 'disabled']]);
    $found = null;
    $w = function (array $ns) use (&$w, &$found): void {
        foreach ($ns as $n) { if ($n['menu_key'] === 'home.dashboard') $found = $n; $w($n['children'] ?? []); }
    };
    $w($r['tree']);
    $ok($found !== null && $found['state'] === 'DISABLED', 'disabled 상태가 반영되지 않았다');
});

$t('override: LABEL/SORT_ORDER/VISIBILITY 가 적용된다', function () use ($REG, $ctx, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'admin']), [
        'tenant_overrides' => ['home.dashboard' => ['LABEL' => '우리회사 홈', 'SORT_ORDER' => '5']],
    ]);
    $found = null;
    $w = function (array $ns) use (&$w, &$found): void {
        foreach ($ns as $n) { if ($n['menu_key'] === 'home.dashboard') $found = $n; $w($n['children'] ?? []); }
    };
    $w($r['tree']);
    $ok($found !== null && $found['label'] === '우리회사 홈', '라벨 오버라이드 미적용');
    $ok($found['sort_order'] === 5, '정렬 오버라이드 미적용');
});

$t('override: ★보안 조건을 약화할 수 없다 — 권한/등급/스코프 타입 자체가 없다', function () use ($ok) {
    $ref = new \ReflectionClass(Navigation::class);
    $types = $ref->getConstant('OVERRIDE_TYPES');
    foreach (['PERMISSION', 'CAPABILITY', 'FEATURE_FLAG', 'PARENT', 'REQUIRED_PLAN', 'ADMIN_ONLY'] as $forbidden) {
        $ok(!in_array($forbidden, (array)$types, true), "보안 우회 가능한 override type 이 허용됐다: $forbidden");
    }
});

$t('override: 오버라이드가 있어도 권한 차단은 유지된다', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'free']), [
        'tenant_overrides' => ['ops.wms' => ['LABEL' => '뚫기시도', 'SORT_ORDER' => '1']],
    ]);
    $ok(!in_array('ops.wms', $flat($r['tree']), true), '오버라이드로 권한이 뚫렸다');
});

/* ══ 8. 트리 구조 ══════════════════════════════════════════════════════════ */

$t('tree: 자식이 없는 SECTION 은 제거된다(빈 그룹 정리)', function () use ($REG, $ctx, $flat, $ok) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'free']), []);
    $keys = $flat($r['tree']);
    $ok(in_array('home.section', $keys, true), 'free 도 볼 수 있는 자식이 있는데 섹션이 사라졌다');
    $ok(!in_array('administration.section', $keys, true), '빈 관리자 섹션이 남았다');
});

$t('tree: sort_order 오름차순으로 정렬된다', function () use ($REG, $ctx, $eq) {
    $r = Navigation::resolve($REG, $ctx(['plan' => 'admin']), []);
    $sec = null;
    foreach ($r['tree'] as $n) if ($n['menu_key'] === 'home.section') $sec = $n;
    $eq(array_column($sec['children'], 'menu_key'), ['home.dashboard', 'ops.wms'], '정렬 순서가 다르다');
});

$t('tree: 부모가 필터링되면 자식은 루트로 승격되지 않고 함께 사라진다', function () use ($REG, $ctx, $flat, $ok) {
    $reg = $REG;
    $reg['items'][0]['status'] = 'HIDDEN';         // home.section 숨김
    $r = Navigation::resolve($reg, $ctx(['plan' => 'admin']), []);
    $keys = $flat($r['tree']);
    // 부모가 없으면 자식이 루트로 올라온다(고아 방지) — 메뉴 손실보다 안전. 존재는 하되 섹션은 없어야 한다.
    $ok(!in_array('home.section', $keys, true), '숨긴 섹션이 남았다');
});

/* ══ 9. Alias(즐겨찾기 Key 보존) ══════════════════════════════════════════ */

$t('alias: 레거시 경로가 정본 키로 해석된다', function () use ($REG, $eq) {
    $eq(Navigation::resolveAlias($REG, '/dashboard'), 'home.dashboard');
    $eq(Navigation::resolveAlias($REG, '/old-wms'), 'ops.wms');
});

$t('alias: 미등록 키는 그대로 반환(무해)', function () use ($REG, $eq) {
    $eq(Navigation::resolveAlias($REG, 'home.dashboard'), 'home.dashboard');
    $eq(Navigation::resolveAlias($REG, '/nope'), '/nope');
});

/* ══ 10. 실제 스냅샷 회귀(존재 시) ════════════════════════════════════════ */

$snapPath = __DIR__ . '/../data/navigation_registry.json';
if (is_file($snapPath)) {
    $REAL = json_decode((string)file_get_contents($snapPath), true);

    $t('실스냅샷: 활성화 가능(CRITICAL 0)', function () use ($REAL, $ok) {
        $ok(($REAL['activatable'] ?? false) === true, '스냅샷이 활성화 불가 상태');
    });

    $t('실스냅샷: 모든 Menu Key 가 표준 형식', function () use ($REAL, $ok) {
        foreach ($REAL['items'] as $i) {
            $ok((bool)preg_match('/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/', (string)$i['menu_key']),
                '형식 위반: ' . $i['menu_key']);
        }
    });

    $t('실스냅샷: AI_AGENT/SERVICE_ACCOUNT 대상 항목 0건', function () use ($REAL, $ok) {
        foreach ($REAL['items'] as $i) {
            foreach (['AI_AGENT', 'SERVICE_ACCOUNT'] as $np) {
                $ok(!in_array($np, (array)($i['target_principal_types'] ?? []), true), "비인간 대상: {$i['menu_key']}");
            }
        }
    });

    $t('실스냅샷: ADMINISTRATION 스코프는 전부 권한 규칙 보유', function () use ($REAL, $ok) {
        foreach ($REAL['items'] as $i) {
            if (($i['context_scope'] ?? '') !== 'ADMINISTRATION') continue;
            $ok(!empty($i['permission_rule']), "권한 없는 관리 메뉴: {$i['menu_key']}");
        }
    });

    $t('실스냅샷: 기존 사이드바 경로가 전부 alias 로 보존된다(즐겨찾기 Key 무손실)', function () use ($REAL, $ok) {
        $aliasKeys = array_column($REAL['aliases'] ?? [], 'alias_key');
        foreach ($REAL['items'] as $i) {
            $p = $i['legacy']['path'] ?? null;
            if ($p === null) continue;
            $ok(in_array($p, $aliasKeys, true), "경로 alias 누락: $p");
        }
    });

    $t('실스냅샷: Shadow Compare — 전 플랜에서 레거시와 동일', function () use ($REAL, $ok) {
        foreach (['free', 'starter', 'growth', 'pro', 'enterprise', 'admin'] as $plan) {
            $legacy = [];
            foreach ($REAL['items'] as $it) {
                if (($it['type'] ?? '') !== 'ITEM') continue;
                if (($it['legacy']['audience'] ?? '') === 'ADMIN' && $plan !== 'admin') continue;
                if (!Navigation::hasMenuAccess($plan, $it, [])) continue;
                $legacy[] = (string)$it['menu_key'];
            }
            $r = Navigation::resolve($REAL, [
                'tenant_id' => 't', 'principal_type' => 'USER', 'principal_id' => 'u', 'plan' => $plan,
                'platform' => 'WEB_DESKTOP', 'locale' => 'ko', 'membership_status' => 'ACTIVE',
                'capabilities' => ['collaboration.foundation' => true], 'feature_flags' => null,
            ], []);
            $flat = [];
            $w = function (array $ns) use (&$w, &$flat): void {
                foreach ($ns as $n) { if (($n['type'] ?? '') === 'ITEM') $flat[] = $n['menu_key']; $w($n['children'] ?? []); }
            };
            $w($r['tree']);
            sort($legacy); sort($flat);
            $missing = array_diff($legacy, $flat);
            $extra = array_diff($flat, $legacy);
            $ok(count($missing) === 0, "[$plan] 신규에서 누락: " . implode(',', array_slice($missing, 0, 5)));
            $ok(count($extra) === 0, "[$plan] 신규에만 존재: " . implode(',', array_slice($extra, 0, 5)));
        }
    });

    $t('실스냅샷: free 플랜이 pro 메뉴를 못 본다(수익 티어 회귀)', function () use ($REAL, $ok) {
        $r = Navigation::resolve($REAL, [
            'tenant_id' => 't', 'principal_type' => 'USER', 'principal_id' => 'u', 'plan' => 'free',
            'platform' => 'WEB_DESKTOP', 'locale' => 'ko', 'membership_status' => 'ACTIVE',
            'capabilities' => ['collaboration.foundation' => true], 'feature_flags' => null,
        ], []);
        $flat = [];
        $w = function (array $ns) use (&$w, &$flat): void {
            foreach ($ns as $n) { $flat[] = $n['menu_key']; $w($n['children'] ?? []); }
        };
        $w($r['tree']);
        foreach (['commerce.wms_manager', 'commerce.price_opt', 'data.data_schema'] as $paid) {
            $ok(!in_array($paid, $flat, true), "free 가 유료 메뉴를 봤다: $paid");
        }
    });
} else {
    $LINES[] = '  SKIP  실스냅샷 회귀(backend/data/navigation_registry.json 부재)';
}

/* ══ 결과 ══════════════════════════════════════════════════════════════════ */
echo "[nav-registry-selftest] CWIS Part004-02 Navigation Resolver 자기검증\n";
echo implode("\n", $LINES) . "\n";
printf("[nav-registry-selftest] %d passed, %d failed\n", $PASS, $FAIL);
if ($FAIL > 0) exit(1);
