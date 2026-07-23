<?php
declare(strict_types=1);

/**
 * [CWIS Part004-03] Collaboration Context / Sidebar / Breadcrumb 자기검증.
 *
 * ★교차검증: PHPUnit/Pest 러너 부재(실측) → 의존성 0 자기검증으로 적응.
 * ★DB 는 **SQLite 인메모리**로 실제 생성해 검증한다(테넌트 격리·계층 정합·Archive 차단은
 *   순수 함수만으로는 증명되지 않으므로 실제 쿼리 경로를 태운다).
 *
 * 실행: php backend/bin/navigation_context_selftest.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\PM\NavigationContext;

$PASS = 0; $FAIL = 0; $LINES = [];
$t = function (string $name, callable $fn) use (&$PASS, &$FAIL, &$LINES): void {
    try { $fn(); $PASS++; $LINES[] = "  PASS  $name"; }
    catch (\Throwable $e) { $FAIL++; $LINES[] = "  FAIL  $name\n        " . $e->getMessage(); }
};
$ok = function (bool $c, string $m = 'assertion failed'): void { if (!$c) throw new \RuntimeException($m); };
$eq = function ($a, $b, string $m = ''): void {
    $sa = json_encode($a, JSON_UNESCAPED_UNICODE); $sb = json_encode($b, JSON_UNESCAPED_UNICODE);
    if ($sa !== $sb) throw new \RuntimeException("$m expected $sb, got $sa");
};

/* ── SQLite 인메모리 픽스처 ────────────────────────────────────────────────── */
if (!extension_loaded('pdo_sqlite')) {
    echo "[nav-context-selftest] SKIP — pdo_sqlite 미탑재(로컬 PHP). 검증 불가 상태를 정직 보고합니다.\n";
    exit(0);
}
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("CREATE TABLE pm_projects (id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, status TEXT,
            owner_user_id TEXT, updated_at TEXT)");
$pdo->exec("CREATE TABLE agency_client_link (id INTEGER PRIMARY KEY AUTOINCREMENT, agency_id INTEGER,
            client_tenant_id TEXT, client_name TEXT, status TEXT, revoked_at TEXT)");
$ins = $pdo->prepare("INSERT INTO pm_projects VALUES (?,?,?,?,?,?)");
$ins->execute(['p_a1', 't_alpha', '알파 프로젝트', 'active', 'u1', '2026-07-01']);
$ins->execute(['p_a2', 't_alpha', '보관된 프로젝트', 'archived', 'u1', '2026-06-01']);
$ins->execute(['p_a3', 't_alpha', '완료 프로젝트', 'completed', 'u1', '2026-05-01']);
$ins->execute(['p_b1', 't_beta', '베타 비밀 프로젝트', 'active', 'u9', '2026-07-02']);
$pdo->prepare("INSERT INTO agency_client_link (agency_id,client_tenant_id,client_name,status,revoked_at) VALUES (?,?,?,?,?)")
    ->execute([7, 't_client', '클라이언트사', 'approved', null]);
$pdo->prepare("INSERT INTO agency_client_link (agency_id,client_tenant_id,client_name,status,revoked_at) VALUES (?,?,?,?,?)")
    ->execute([7, 't_revoked', '해지된 클라이언트', 'approved', '2026-07-01']);
$pdo->prepare("INSERT INTO agency_client_link (agency_id,client_tenant_id,client_name,status,revoked_at) VALUES (?,?,?,?,?)")
    ->execute([7, 't_pending', '대기 클라이언트', 'pending', null]);

$userAlpha  = ['id' => 'u1', 'tenant_id' => 't_alpha', 'plan' => 'pro', 'company' => '알파회사'];
$userAgency = ['id' => 'u7', 'tenant_id' => 't_agency', 'plan' => 'pro', 'agency_id' => 7];
$userAdmin  = ['id' => 'u0', 'tenant_id' => 't_admin', 'plan' => 'admin'];
$allowedOf = function (array $user, string $session) use ($pdo): array {
    $out = [];
    foreach (NavigationContext::tenantOptions($pdo, $user, $session) as $o) if (!empty($o['selectable'])) $out[] = $o['public_id'];
    if (!in_array($session, $out, true)) $out[] = $session;
    return array_values(array_unique($out));
};

/* ══ 1. Tenant Option Provider — 실재하는 멀티테넌트만 ═════════════════════ */

$t('tenant: 일반 회원은 자기 테넌트 1개뿐(전환 대상 없음)', function () use ($pdo, $userAlpha, $eq) {
    $o = NavigationContext::tenantOptions($pdo, $userAlpha, 't_alpha');
    $eq(array_column($o, 'public_id'), ['t_alpha'], '일반 회원에게 다른 테넌트가 노출됐다');
});

$t('tenant: 대행사는 승인된 클라이언트만 노출(revoked/pending 제외)', function () use ($pdo, $userAgency, $eq) {
    $o = NavigationContext::tenantOptions($pdo, $userAgency, 't_agency');
    $ids = array_column($o, 'public_id');
    sort($ids);
    $eq($ids, ['t_agency', 't_client'], 'revoked/pending 클라이언트가 노출됐다');
});

$t('tenant: admin 만 platform_growth act-as 를 갖는다', function () use ($pdo, $userAdmin, $userAlpha, $ok) {
    $adminIds = array_column(NavigationContext::tenantOptions($pdo, $userAdmin, 't_admin'), 'public_id');
    $ok(in_array('platform_growth', $adminIds, true), 'admin 에 act-as 가 없다');
    $userIds = array_column(NavigationContext::tenantOptions($pdo, $userAlpha, 't_alpha'), 'public_id');
    $ok(!in_array('platform_growth', $userIds, true), '일반 회원에게 act-as 가 노출됐다');
});

/* ══ 2. Project Option Provider ════════════════════════════════════════════ */

$t('project: 테넌트 격리 — 다른 테넌트 프로젝트가 보이지 않는다', function () use ($pdo, $ok) {
    $o = NavigationContext::projectOptions($pdo, 't_alpha');
    foreach ($o as $x) $ok($x['public_id'] !== 'p_b1', '타 테넌트 프로젝트가 노출됐다');
});

$t('project: archived/completed 는 기본 목록에서 제외', function () use ($pdo, $eq) {
    $ids = array_column(NavigationContext::projectOptions($pdo, 't_alpha'), 'public_id');
    $eq($ids, ['p_a1'], 'archive/완료 프로젝트가 기본 목록에 포함됐다');
});

$t('project: include_archived=1 이면 포함하되 archived 는 selectable=false', function () use ($pdo, $ok) {
    $o = NavigationContext::projectOptions($pdo, 't_alpha', ['include_archived' => '1']);
    $ids = array_column($o, 'public_id');
    $ok(in_array('p_a2', $ids, true), 'include_archived 인데 보관 프로젝트가 없다');
    foreach ($o as $x) if ($x['public_id'] === 'p_a2') $ok($x['selectable'] === false, 'archived 가 선택 가능하다');
});

$t('project: 검색 필터', function () use ($pdo, $eq) {
    $ids = array_column(NavigationContext::projectOptions($pdo, 't_alpha', ['search' => '알파']), 'public_id');
    $eq($ids, ['p_a1']);
});

/* ══ 3. Context Validation — 보안 핵심 ═════════════════════════════════════ */

$t('validate: 정상 Context 통과', function () use ($pdo, $userAlpha, $allowedOf, $ok, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_alpha', 'project_id' => 'p_a1'], $allowedOf($userAlpha, 't_alpha'));
    $ok($v['valid'], '정상 Context 가 거부됐다: ' . $v['reason_code']);
    $eq($v['context']['project_id'], 'p_a1');
});

$t('validate: ★Cross-Tenant 주입 차단 — 허용목록 밖 테넌트', function () use ($pdo, $userAlpha, $allowedOf, $ok, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_beta'], $allowedOf($userAlpha, 't_alpha'));
    $ok(!$v['valid'], '다른 테넌트가 통과했다');
    $eq($v['status'], NavigationContext::STATUS_INVALID_TENANT);
});

$t('validate: ★계층 불일치 — 다른 테넌트 프로젝트를 내 테넌트에 주입', function () use ($pdo, $userAlpha, $allowedOf, $ok, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_alpha', 'project_id' => 'p_b1'], $allowedOf($userAlpha, 't_alpha'));
    $ok(!$v['valid'], '타 테넌트 프로젝트가 통과했다');
    $eq($v['status'], NavigationContext::STATUS_MISMATCH);
});

$t('validate: 존재하지 않는 프로젝트 = NOT_FOUND(존재 여부 비노출)', function () use ($pdo, $userAlpha, $allowedOf, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_alpha', 'project_id' => 'nope'], $allowedOf($userAlpha, 't_alpha'));
    $eq($v['status'], NavigationContext::STATUS_INVALID_PROJECT);
    $eq($v['reason_code'], 'CONTEXT_NOT_FOUND');
});

$t('validate: Archive 프로젝트는 활성 Context 로 선택 불가', function () use ($pdo, $userAlpha, $allowedOf, $ok, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_alpha', 'project_id' => 'p_a2'], $allowedOf($userAlpha, 't_alpha'));
    $ok(!$v['valid'], 'archived 프로젝트가 통과했다');
    $eq($v['status'], NavigationContext::STATUS_ARCHIVED);
});

$t('validate: 실패 시 복구안이 다른 테넌트를 제안하지 않는다', function () use ($pdo, $userAlpha, $allowedOf, $ok) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_beta'], $allowedOf($userAlpha, 't_alpha'));
    foreach ($v['recommended_fallbacks'] as $f) {
        $ok(($f['public_id'] ?? '') !== 't_beta', '접근 불가 테넌트를 복구안으로 제시했다');
    }
});

$t('validate: 대행사는 승인된 클라이언트 테넌트로 전환 가능', function () use ($pdo, $userAgency, $allowedOf, $ok) {
    $v = NavigationContext::validateCandidate($pdo, $userAgency, 't_agency',
        ['tenant_id' => 't_client'], $allowedOf($userAgency, 't_agency'));
    $ok($v['valid'], '승인된 위임 테넌트가 거부됐다');
});

$t('validate: ★해지된 위임 테넌트는 차단', function () use ($pdo, $userAgency, $allowedOf, $ok, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAgency, 't_agency',
        ['tenant_id' => 't_revoked'], $allowedOf($userAgency, 't_agency'));
    $ok(!$v['valid'], '해지된 위임으로 전환됐다');
    $eq($v['status'], NavigationContext::STATUS_INVALID_TENANT);
});

$t('validate: tenant 누락 = 사용자 선택 필요', function () use ($pdo, $userAlpha, $allowedOf, $ok, $eq) {
    $v = NavigationContext::validateCandidate($pdo, $userAlpha, 't_alpha', ['tenant_id' => ''], $allowedOf($userAlpha, 't_alpha'));
    $eq($v['status'], NavigationContext::STATUS_SELECTION_REQUIRED);
    $ok($v['requires_user_selection'], 'requires_user_selection 이 false');
});

/* ══ 4. Context Resolver 우선순위 · Safe Fallback ═════════════════════════ */

$t('resolve: Route Context 가 최우선(검증 통과 시)', function () use ($pdo, $userAlpha, $allowedOf, $eq) {
    $r = NavigationContext::resolveContext($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_alpha', 'project_id' => 'p_a1'], $allowedOf($userAlpha, 't_alpha'), 'USER', 'u1');
    $eq($r['source'], 'ROUTE');
    $eq($r['context']['project_id'], 'p_a1');
});

$t('resolve: ★검증 실패한 Route 는 채택되지 않고 안전 폴백', function () use ($pdo, $userAlpha, $allowedOf, $eq, $ok) {
    $r = NavigationContext::resolveContext($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_alpha', 'project_id' => 'p_b1'], $allowedOf($userAlpha, 't_alpha'), 'USER', 'u1');
    $ok($r['source'] !== 'ROUTE', '무효 Route Context 가 채택됐다');
    $eq($r['fallback_applied'], true);
    $eq($r['context']['tenant_id'], 't_alpha');
    $eq($r['context']['project_id'], null, '무효 프로젝트가 컨텍스트에 남았다');
});

$t('resolve: ★폴백이 다른 테넌트로 자동 전환하지 않는다', function () use ($pdo, $userAlpha, $allowedOf, $ok) {
    $r = NavigationContext::resolveContext($pdo, $userAlpha, 't_alpha',
        ['tenant_id' => 't_beta'], $allowedOf($userAlpha, 't_alpha'), 'USER', 'u1');
    $ok(($r['context']['tenant_id'] ?? null) !== 't_beta', '접근 불가 테넌트로 폴백했다');
});

$t('resolve: Route 없으면 세션 테넌트', function () use ($pdo, $userAlpha, $allowedOf, $eq) {
    $r = NavigationContext::resolveContext($pdo, $userAlpha, 't_alpha', [], $allowedOf($userAlpha, 't_alpha'), 'USER', 'u1');
    $eq($r['context']['tenant_id'], 't_alpha');
    $eq($r['context']['project_id'], null);
});

/* ══ 5. 부재 축 정직 표기 ══════════════════════════════════════════════════ */

$t('부재 축: WORKSPACE/ORGANIZATION/TEAM 이 사유와 함께 선언되어 있다', function () use ($ok) {
    // ★리플렉션으로 런타임 조회 — 상수를 지우거나 사유를 비우면 실제로 실패해야 하는 회귀 가드다.
    $ref = new \ReflectionClass(NavigationContext::class);
    $axes = (array)$ref->getConstant('ABSENT_AXES');
    foreach (['ORGANIZATION', 'WORKSPACE', 'TEAM', 'DEPARTMENT', 'PROGRAM'] as $a) {
        $ok(array_key_exists($a, $axes), "부재 축 미선언: $a");
        $ok(is_string($axes[$a] ?? null) && strlen((string)($axes[$a] ?? '')) > 10, "부재 사유가 비어 있다: $a");
    }
});

$t('부재 축: 전환 가능 타입은 실재하는 TENANT/PROJECT 뿐', function () use ($eq) {
    $ref = new \ReflectionClass(NavigationContext::class);
    $eq(array_values((array)$ref->getConstant('CONTEXT_TYPES')), ['TENANT', 'PROJECT']);
});

/* ══ 6. Active Menu 판정 ═══════════════════════════════════════════════════ */

$REG = [
    'registry_version' => 'test.1',
    'items' => [
        ['menu_key' => 'pm.section', 'parent_menu_key' => null, 'type' => 'SECTION', 'fallback_label' => '프로젝트 관리', 'icon_key' => 'folder', 'target' => null],
        ['menu_key' => 'pm.overview', 'parent_menu_key' => 'pm.section', 'type' => 'ITEM', 'fallback_label' => 'PM 개요', 'icon_key' => 'folder', 'target' => ['type' => 'INTERNAL_ROUTE', 'route_name' => '/pm']],
        ['menu_key' => 'pm.collaboration', 'parent_menu_key' => 'pm.section', 'type' => 'ITEM', 'fallback_label' => '협업', 'icon_key' => 'users', 'target' => ['type' => 'INTERNAL_ROUTE', 'route_name' => '/pm/collaboration']],
        ['menu_key' => 'home.section', 'parent_menu_key' => null, 'type' => 'SECTION', 'fallback_label' => '홈', 'icon_key' => 'home', 'target' => null],
        ['menu_key' => 'home.dashboard', 'parent_menu_key' => 'home.section', 'type' => 'ITEM', 'fallback_label' => '대시보드', 'icon_key' => 'home', 'target' => ['type' => 'INTERNAL_ROUTE', 'route_name' => '/dashboard']],
    ],
    'aliases' => [['alias_key' => '/connectors', 'target_menu_key' => 'home.dashboard', 'alias_type' => 'LEGACY_ROUTE', 'status' => 'ACTIVE']],
];

$t('active: 정확 일치', function () use ($REG, $eq) {
    $a = NavigationContext::resolveActiveMenu($REG, '/dashboard');
    $eq($a['active'], 'home.dashboard');
    $eq($a['matched_by'], 'EXACT');
    $eq($a['ancestors'], ['home.section']);
});

$t('active: ★중첩 라우트에서 부모 메뉴가 활성 조상으로 잡힌다', function () use ($REG, $eq) {
    $a = NavigationContext::resolveActiveMenu($REG, '/pm/projects/p_a1/board');
    $eq($a['active'], 'pm.overview', '중첩 경로가 /pm 메뉴로 귀속되지 않았다');
    $eq($a['matched_by'], 'PREFIX');
    $eq($a['ancestors'], ['pm.section']);
});

$t('active: ★경계 검사 — /pm 이 /pmx 를 매칭하지 않는다', function () use ($REG, $eq) {
    $a = NavigationContext::resolveActiveMenu($REG, '/pmx');
    $eq($a['active'], null);
});

$t('active: 레거시 Alias 경로도 정본 메뉴로 활성화', function () use ($REG, $eq) {
    $a = NavigationContext::resolveActiveMenu($REG, '/connectors');
    $eq($a['active'], 'home.dashboard');
    $eq($a['matched_by'], 'ALIAS');
});

$t('active: 더 긴 prefix 가 이긴다', function () use ($REG, $eq) {
    $a = NavigationContext::resolveActiveMenu($REG, '/pm/collaboration/x');
    $eq($a['active'], 'pm.collaboration');
});

/* ══ 7. Breadcrumb ════════════════════════════════════════════════════════ */

$t('breadcrumb: 메뉴 계층(조상 → 현재)이 순서대로 만들어진다', function () use ($pdo, $REG, $eq) {
    $b = NavigationContext::buildBreadcrumb($pdo, $REG, 't_alpha', '/dashboard');
    $eq(array_column($b, 'menu_key'), ['home.section', 'home.dashboard']);
    $eq($b[1]['current'], true);
});

$t('breadcrumb: SECTION 은 링크를 만들지 않는다', function () use ($pdo, $REG, $eq) {
    $b = NavigationContext::buildBreadcrumb($pdo, $REG, 't_alpha', '/dashboard');
    $eq($b[0]['url'], null);
    $eq($b[0]['clickable'], false);
});

$t('breadcrumb: 프로젝트 실명이 리소스 크럼으로 붙는다', function () use ($pdo, $REG, $ok, $eq) {
    $b = NavigationContext::buildBreadcrumb($pdo, $REG, 't_alpha', '/pm/projects/p_a1');
    $labels = array_column($b, 'label');
    $ok(in_array('알파 프로젝트', $labels, true), '프로젝트 이름 크럼이 없다: ' . json_encode($labels, JSON_UNESCAPED_UNICODE));
    $eq($b[count($b) - 1]['current'], true);
});

$t('breadcrumb: 하위 탭까지 표현', function () use ($pdo, $REG, $ok) {
    $b = NavigationContext::buildBreadcrumb($pdo, $REG, 't_alpha', '/pm/projects/p_a1/board');
    $labels = array_column($b, 'label');
    $ok(in_array('보드', $labels, true), '하위 탭 크럼이 없다');
});

$t('breadcrumb: ★타 테넌트 프로젝트는 크럼을 만들지 않는다(존재 비노출)', function () use ($pdo, $REG, $ok) {
    $b = NavigationContext::buildBreadcrumb($pdo, $REG, 't_alpha', '/pm/projects/p_b1');
    foreach ($b as $c) $ok(($c['metadata']['resource_type'] ?? '') !== 'PROJECT', '타 테넌트 리소스 크럼이 생성됐다');
});

$t('breadcrumb: ★리소스 이름의 HTML 제어문자가 제거된다(XSS)', function () use ($pdo, $REG, $ok) {
    $pdo->prepare("INSERT INTO pm_projects VALUES (?,?,?,?,?,?)")
        ->execute(['p_xss', 't_alpha', '<img src=x onerror=alert(1)>위험', 'active', 'u1', '2026-07-03']);
    $b = NavigationContext::buildBreadcrumb($pdo, $REG, 't_alpha', '/pm/projects/p_xss');
    foreach ($b as $c) {
        $ok(!str_contains((string)$c['label'], '<'), 'HTML 태그가 라벨에 남았다: ' . $c['label']);
        $ok(!str_contains((string)$c['label'], '>'), 'HTML 태그가 라벨에 남았다: ' . $c['label']);
    }
});

/* ══ 8. 전환 스위치(무후퇴) ═══════════════════════════════════════════════ */

$t('스위치: 기본값 OFF — 레거시 사이드바 유지', function () use ($ok) {
    $p = new PDO('sqlite::memory:');
    $p->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // 테이블 자체가 없는 신규 환경 = 미설정 → 반드시 false
    $ok(NavigationContext::sidebarEnabled($p, 't_x') === false, '기본값이 OFF 가 아니다(무후퇴 위반)');
});

$t('스위치: capability 토글로만 켜진다(신규 플래그 저장소 신설 없음)', function () use ($ok) {
    $p = new PDO('sqlite::memory:');
    $p->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $p->exec("CREATE TABLE tenant_collaboration_capabilities (tenant_id TEXT, capability_key TEXT, is_enabled INTEGER)");
    $ok(NavigationContext::sidebarEnabled($p, 't_x') === false, '미등록인데 ON 이다');
    $p->prepare("INSERT INTO tenant_collaboration_capabilities VALUES (?,?,?)")
      ->execute(['t_x', 'collaboration.navigation.sidebar', 1]);
    $ok(NavigationContext::sidebarEnabled($p, 't_x') === true, 'capability 토글이 반영되지 않았다');
    $p->exec("UPDATE tenant_collaboration_capabilities SET is_enabled=0");
    $ok(NavigationContext::sidebarEnabled($p, 't_x') === false, '즉시 롤백(OFF)이 동작하지 않는다');
});

/* ── 결과 ─────────────────────────────────────────────────────────────────── */
echo "[nav-context-selftest] CWIS Part004-03 Context / Sidebar / Breadcrumb 자기검증\n";
echo implode("\n", $LINES) . "\n";
printf("[nav-context-selftest] %d passed, %d failed\n", $PASS, $FAIL);
if ($FAIL > 0) exit(1);
