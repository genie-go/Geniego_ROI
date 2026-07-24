<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST10 — Final Gap Analysis & Implementation Roadmap.
 *
 * ST02~ST09 의 산출물만을 근거로 Gap 을 도출하고 로드맵을 만든다.
 *
 * ★근거 없는 Gap 생성 금지 — 모든 Gap 은 선행 Step 이 실제로 남긴 부재 증명을 인용한다.
 *   "있으면 좋을 것"을 Gap 으로 만들지 않는다.
 *
 * ★★가장 중요한 설계 판단 — "서버 지속화 부재"는 **무조건적 결함이 아니다**.
 *   frontend/src/utils/tenantStorage.js:14 가 "UI 프리퍼런스(theme/sidebar/lang/tour)는
 *   디바이스 단위라 스코프 불요"를 명문화하고 있다. 따라서 즐겨찾기를 UI 프리퍼런스로
 *   두는 한 현행 구현은 **규칙 준수**다. Gap 은 "즐겨찾기를 회원 데이터로 재정의할 때"만
 *   성립한다. 그래서 완성률을 **정의별로 두 개** 산출하고, 로드맵 선두에 결정 게이트를 둔다.
 *
 * 안전: 입력 읽기 전용 · 운영 코드 변경 0 · DB/네트워크/Boot 0 · 결정적 출력.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST10';
const SCHEMA_VERSION = '1.0.0';

$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST10] 루트 탐지 실패\n"); exit(2); }
$IN = 'tools/cwis/navigation/output';
$load = static function (string $f) use ($ROOT, $IN) {
    $p = "$ROOT/$IN/$f";
    if (!is_file($p)) { fwrite(STDERR, "[ST10] 필수 입력 없음: $IN/$f\n"); exit(2); }
    return json_decode((string)file_get_contents($p), true, 512, JSON_THROW_ON_ERROR);
};
$nrm  = $load('favorites-normalized-records.json');
$rel  = $load('favorites-normalized-relationships.json');
$cls  = $load('favorites-classification.json');
$clsS = $load('favorites-classification-summary.json');
$dep  = $load('favorites-dependency-map.json');
$reu  = $load('favorites-reuse-map.json');
$imp  = $load('favorites-impact-map.json');
$tgap = $load('favorites-test-gap-candidates.json');
$cfl  = $load('favorites-normalization-conflicts.json');
$stat = $load('favorites-normalization-statistics.json');
$pkg  = $load('favorites-package-inventory.json');

$C = $cls['classifications'];
$D = [];
foreach ($dep['records'] as $r) $D[$r['normalized_id']] = $r;
$U = [];
foreach ($reu['reuse'] as $r) $U[$r['normalized_id']] = $r;
$I = [];
foreach ($imp['impact'] as $r) $I[$r['normalized_id']] = $r;
$N = [];
foreach ($nrm['records'] as $r) $N[$r['normalized_id']] = $r;
$clusters = $clsS['feature_clusters'];

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Capability Checklist — 완성률의 분모를 명시적으로 고정한다
 *
 * ★"완성률 N%"를 감으로 쓰지 않는다. 어떤 능력이 필요한지 먼저 못박고,
 *   각 항목의 존재/부재를 선행 Step 의 증거로만 판정한다.
 *   scope=PREFERENCE  → 즐겨찾기를 'UI 프리퍼런스'로 볼 때 필요한 능력
 *   scope=MEMBER_DATA → 즐겨찾기를 '기기 간 동기화되는 회원 데이터'로 볼 때 추가로 필요한 능력
 * ══════════════════════════════════════════════════════════════════════════ */
$CAPS = [
    ['id' => 'CAP-01', 'name' => '즐겨찾기 토글 UI', 'scope' => 'PREFERENCE', 'category' => 'UI',
     'present' => true,  'evidence' => 'ST08 클러스터 sidebar-favorites 증거축 COMPONENT — FAV-NRM-000005 QuickAccessPanel'],
    ['id' => 'CAP-02', 'name' => '클라이언트 상태 관리', 'scope' => 'PREFERENCE', 'category' => 'FRONTEND',
     'present' => true,  'evidence' => 'ST08 증거축 STORE — FAV-NRM-001391 useFavorites'],
    ['id' => 'CAP-03', 'name' => '기기 로컬 영속', 'scope' => 'PREFERENCE', 'category' => 'FRONTEND',
     'present' => true,  'evidence' => "ST03 state_inventory storage_key='g_sidebar_favs', device_local_only=true"],
    ['id' => 'CAP-04', 'name' => '접근성(토글 상태 노출)', 'scope' => 'PREFERENCE', 'category' => 'UX',
     'present' => false, 'evidence' => 'ST03 실측 aria-pressed 0건 — 즐겨찾기 토글 버튼이 스크린리더에 상태를 알리지 않음'],
    ['id' => 'CAP-05', 'name' => '순서 지정(사용자 정렬)', 'scope' => 'PREFERENCE', 'category' => 'FRONTEND',
     'present' => false, 'evidence' => 'ST04 table_inventory ordering_detected 대상 테이블 자체가 없고, ST03 상태단위에 정렬 필드 없음'],
    ['id' => 'CAP-06', 'name' => '자동 테스트', 'scope' => 'PREFERENCE', 'category' => 'TEST',
     'present' => false, 'evidence' => 'ST06 테스트 143건 중 즐겨찾기 대상 1건이며 그마저 본 CWIS 작업이 만든 Alias 보존 검증'],
    ['id' => 'CAP-07', 'name' => '서버 지속화 테이블', 'scope' => 'MEMBER_DATA', 'category' => 'DATABASE',
     'present' => false, 'evidence' => 'ST04 전 321개 테이블 중 즐겨찾기 테이블 0건'],
    ['id' => 'CAP-08', 'name' => '스키마 생성 경로', 'scope' => 'MEMBER_DATA', 'category' => 'DATABASE',
     'present' => false, 'evidence' => 'ST04 migration_inventory 21건 중 즐겨찾기 관련 0건'],
    ['id' => 'CAP-09', 'name' => 'REST 엔드포인트', 'scope' => 'MEMBER_DATA', 'category' => 'API',
     'present' => false, 'evidence' => 'ST05 라우트 1,511개 중 즐겨찾기 직접 라우트 0건'],
    ['id' => 'CAP-10', 'name' => '서버 핸들러', 'scope' => 'MEMBER_DATA', 'category' => 'BACKEND',
     'present' => false, 'evidence' => 'ST08 클러스터 sidebar-favorites server_axes=[] (CONTROLLER/SERVICE/REPOSITORY 전무)'],
    ['id' => 'CAP-11', 'name' => '기기 간 동기화', 'scope' => 'MEMBER_DATA', 'category' => 'FRONTEND',
     'present' => false, 'evidence' => 'ST03 state_inventory server_synced_detected=false, ST09 서버 계층 실의존 0건'],
    ['id' => 'CAP-12', 'name' => '다형성 리소스 지원', 'scope' => 'MEMBER_DATA', 'category' => 'DATABASE',
     'present' => false, 'evidence' => 'ST04 polymorphic_detected 참인 테이블 0건 — 메뉴 경로 외 리소스를 즐겨찾기할 수단 없음'],
    ['id' => 'CAP-13', 'name' => '권한 게이트 적용', 'scope' => 'MEMBER_DATA', 'category' => 'AUTHORIZATION',
     'present' => false, 'evidence' => 'ST09 즐겨찾기 훅에서 AUTHORIZES 엣지 0건. 단 게이트 자체는 재사용 가능(REUSE_CANDIDATE 10건)'],
    ['id' => 'CAP-14', 'name' => '변경 감사 로그', 'scope' => 'MEMBER_DATA', 'category' => 'OBSERVABILITY',
     'present' => false, 'evidence' => 'ST09 즐겨찾기에서 menu_audit_log/pm_audit_log 로 향하는 실의존 0건. 테이블은 존재하므로 재사용 가능'],
    ['id' => 'CAP-15', 'name' => '테넌트 격리', 'scope' => 'MEMBER_DATA', 'category' => 'TENANT',
     'present' => false, 'evidence' => "ST08 실측 — 사이드바는 raw localStorage 사용(테넌트 네임스페이스 없음). "
        . '단 tenantStorage.js:14 가 UI 프리퍼런스는 스코프 불요로 규정하므로 현행은 규칙 준수이며, '
        . '회원 데이터로 재정의할 때만 결여가 된다'],
];

/* ★인프라 선행 종속 — 저장소에 없는 인프라를 즐겨찾기 Gap 으로 날조하지 않는다. */
$INFRA_ABSENT = [
    ['category' => 'CACHE', 'severity' => 'NONE',
     'finding' => 'Redis/Memcached 부재(backend/src 실측 predis·ext-redis 0건, Navigation.php:16 이 부재를 명시). '
        . '현행 캐시는 프로세스 메모+파일 스냅샷+ETag. **즐겨찾기 규모에서 분산 캐시는 불필요**하므로 Gap 이 아니다'],
    ['category' => 'QUEUE', 'severity' => 'NONE',
     'finding' => 'Queue/Outbox 인프라 부재(실측 Queue::·Bus:: 0건). 즐겨찾기 토글은 동기 처리로 충분하므로 Gap 이 아니다'],
    ['category' => 'SEARCH', 'severity' => 'NONE',
     'finding' => 'Elasticsearch/Meilisearch 부재(실측 0건). 즐겨찾기는 사용자당 수십 건 규모라 검색엔진이 불필요하다'],
    ['category' => 'EVENT', 'severity' => 'LOW',
     'finding' => '도메인 이벤트 버스 부재. 즐겨찾기 변경을 다른 도메인이 구독할 요구가 확인되지 않아 선행 요구 없음'],
    ['category' => 'WORKSPACE', 'severity' => 'UNKNOWN',
     'finding' => 'ST07 NavigationContext::ABSENT_AXES — Workspace·Project 엔티티와 멤버십 행 자체가 부재. '
        . '협업 범위 즐겨찾기를 원한다면 **엔티티 신설이 선행 조건**이며 본 Unit 범위를 넘는다'],
];

/* ══════════════════════════════════════════════════════════════════════════
 * 2. Gap Matrix 생성 — Capability 부재에서만 Gap 을 만든다
 * ══════════════════════════════════════════════════════════════════════════ */
$SEV = static function (array $c): string {
    // 심각도는 "회원 데이터로 재정의했을 때" 기준이며, 조건부임을 사유에 명시한다.
    return match ($c['id']) {
        'CAP-07', 'CAP-09', 'CAP-10' => 'CRITICAL',   // 서버 지속화의 최소 3종
        'CAP-08', 'CAP-11', 'CAP-13', 'CAP-15' => 'HIGH',
        'CAP-04', 'CAP-06', 'CAP-12', 'CAP-14' => 'MEDIUM',
        default => 'LOW',
    };
};
$PHASE = static fn(array $c): string => match ($c['category']) {
    'DATABASE'      => 'PHASE_2',
    'BACKEND'       => 'PHASE_2',
    'API'           => 'PHASE_4',
    'FRONTEND', 'UI', 'UX' => 'PHASE_3',
    'AUTHORIZATION', 'TENANT' => 'PHASE_5',
    'OBSERVABILITY' => 'PHASE_6',
    'TEST'          => 'PHASE_7',
    default         => 'PHASE_1',
};
$PRIO = static fn(string $sev): string => match ($sev) {
    'CRITICAL' => 'P0', 'HIGH' => 'P1', 'MEDIUM' => 'P2', default => 'P3',
};
$CPLX = static fn(array $c): string => match ($c['id']) {
    'CAP-07', 'CAP-10', 'CAP-12' => 'HIGH',
    'CAP-08', 'CAP-09', 'CAP-11', 'CAP-15' => 'MEDIUM',
    'CAP-04', 'CAP-05', 'CAP-13', 'CAP-14' => 'LOW',
    'CAP-06' => 'HIGH',   // 표준 러너 부재 → 러너 도입이 선행
    default => 'UNKNOWN',
};

$gaps = []; $gseq = 0;
foreach ($CAPS as $c) {
    if ($c['present']) continue;
    $sev = $SEV($c);
    $conditional = $c['scope'] === 'MEMBER_DATA';
    $gaps[] = [
        'gap_id' => sprintf('FAV-GAP-%03d', ++$gseq),
        'capability_id' => $c['id'], 'capability' => $c['name'],
        'gap_category' => $c['category'],
        'gap_severity' => $sev,
        'conditional' => $conditional,
        'condition' => $conditional
            ? "즐겨찾기를 '기기 간 동기화되는 회원 데이터'로 정의할 때만 결여다. "
              . "'UI 프리퍼런스'로 유지하면 tenantStorage.js:14 규정상 결여가 아니다"
            : '정의와 무관하게 결여',
        'implementation_decision' => 'IMPLEMENT_NEW',
        'roadmap_phase' => $PHASE($c),
        'priority' => $PRIO($sev),
        'estimated_complexity' => $CPLX($c),
        'estimated_impact' => in_array($sev, ['CRITICAL', 'HIGH'], true) ? 'HIGH' : 'MEDIUM',
        'risk_level' => $conditional ? 'MEDIUM' : 'LOW',
        'reason' => $c['name'] . ' 부재',
        'evidence' => [$c['evidence']],
        'manual_review' => $sev === 'CRITICAL' || $conditional,
    ];
}
foreach ($INFRA_ABSENT as $ia) {
    $gaps[] = [
        'gap_id' => sprintf('FAV-GAP-%03d', ++$gseq),
        'capability_id' => null, 'capability' => $ia['category'] . ' 인프라',
        'gap_category' => $ia['category'], 'gap_severity' => $ia['severity'],
        'conditional' => false,
        'condition' => '인프라 선행 종속 — 저장소에 해당 인프라가 존재하지 않는다',
        'implementation_decision' => $ia['severity'] === 'NONE' ? 'KEEP_AS_IS' : 'MANUAL_REVIEW',
        'roadmap_phase' => 'PHASE_1', 'priority' => $ia['severity'] === 'NONE' ? 'P3' : 'P2',
        'estimated_complexity' => 'UNKNOWN', 'estimated_impact' => 'LOW',
        'risk_level' => 'LOW',
        'reason' => $ia['finding'],
        'evidence' => [$ia['finding']],
        'manual_review' => $ia['severity'] !== 'NONE',
    ];
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. 완성률 — 정의별 2종 (감이 아니라 체크리스트 분모/분자)
 * ══════════════════════════════════════════════════════════════════════════ */
$prefCaps = array_values(array_filter($CAPS, static fn($c) => $c['scope'] === 'PREFERENCE'));
$prefDone = count(array_filter($prefCaps, static fn($c) => $c['present']));
$allDone  = count(array_filter($CAPS, static fn($c) => $c['present']));
$pctPref = (int)round($prefDone / max(1, count($prefCaps)) * 100);
$pctAll  = (int)round($allDone / max(1, count($CAPS)) * 100);

/* ══════════════════════════════════════════════════════════════════════════
 * 4. 레코드별 구현 결정
 * ══════════════════════════════════════════════════════════════════════════ */
$plan = []; $removal = []; $refactor = []; $debt = []; $risks = [];
$decCount = []; $phaseCount = []; $prioCount = [];

foreach ($C as $x) {
    $id = $x['normalized_id'];
    $d = $D[$id] ?? [];
    $u = $U[$id] ?? [];
    $i = $I[$id] ?? [];
    $n = $N[$id] ?? [];
    $a = $n['attributes'] ?? [];
    $ev = [];
    $dec = 'KEEP_AS_IS'; $cat = 'UNKNOWN'; $sev = 'NONE'; $phase = 'NOT_SCHEDULED';
    $prio = 'P3'; $why = ''; $risk = 'NONE'; $cplx = 'UNKNOWN'; $impact = $i['impact_level'] ?? 'UNKNOWN';
    $mr = false;

    $isReuse = ($u['reuse_relationship'] ?? '') === 'REUSE_CANDIDATE';

    if ($x['classification'] === 'PARTIAL_IMPLEMENTATION' && $x['evidence_axis'] !== null) {
        $dec = 'EXTEND'; $cat = $x['evidence_axis'] === 'STORE' ? 'FRONTEND' : 'UI';
        $sev = 'MEDIUM'; $phase = 'PHASE_3'; $prio = 'P1'; $cplx = 'MEDIUM'; $risk = 'MEDIUM'; $mr = true;
        $why = '기존 부분구현의 실제 증거축(' . $x['evidence_axis'] . ') — 헌법 Golden Rule 상 Replace 가 아니라 Extend 대상';
        $ev[] = 'ST08 클러스터 ' . $x['feature_cluster'] . ' 판정 PARTIAL_IMPLEMENTATION';
        $ev[] = 'ST09 reuse_level=' . ($d['reuse_level'] ?? '?') . ', impact=' . $impact;
    } elseif ($isReuse && $x['classification'] === 'SHARED_INFRASTRUCTURE') {
        $dec = 'REUSE'; $cat = 'AUTHORIZATION'; $sev = 'NONE'; $phase = 'PHASE_5'; $prio = 'P1';
        $cplx = 'LOW'; $risk = !empty($a['external_principal_deny']) ? 'HIGH' : 'LOW';
        $mr = !empty($a['external_principal_deny']);
        $why = '공통 인프라 재사용 — 신규 즐겨찾기 API 가 그대로 올라탄다'
            . (!empty($a['external_principal_deny'])
                ? '. ★단 guest/partner Default Deny 가 자동 적용되므로 외부 협업자 허용 의도 확인 필요' : '');
        $ev[] = 'ST09 REUSE_CANDIDATE / layer=Shared';
        $ev[] = 'ST08 ' . $x['classification_reason'];
    } elseif ($isReuse && $x['classification'] === 'PACKAGE_ONLY') {
        $dec = 'REUSE'; $cat = 'FRONTEND'; $sev = 'NONE'; $phase = 'PHASE_3'; $prio = 'P2';
        $cplx = 'LOW'; $risk = 'LOW';
        $why = '이미 전역에서 쓰이는 패키지 — 신규 의존성 추가 없이 활용 가능';
        $ev[] = 'ST09 reuse_level=GLOBAL, 소비 모듈 ' . count($d['consumer_modules'] ?? []) . '종, 팬인 ' . ($d['fan_in'] ?? 0);
    } elseif ($isReuse && $x['classification'] === 'TEST_ONLY') {
        $dec = 'REUSE'; $cat = 'TEST'; $sev = 'MEDIUM'; $phase = 'PHASE_7'; $prio = 'P2';
        $cplx = 'LOW'; $risk = 'LOW';
        $why = '재사용 가능한 테스트 자산 — 표준 러너 부재 환경에서 즐겨찾기 검증에 전용 가능';
        $ev[] = 'ST06 reusable_candidate=true';
        $ev[] = 'ST09 REUSE_CANDIDATE / layer=Test';
    } elseif ($isReuse) {
        $dec = 'REUSE'; $cat = 'UI'; $sev = 'NONE'; $phase = 'PHASE_3'; $prio = 'P2';
        $cplx = 'LOW'; $risk = 'LOW';
        $why = '재사용 가능 요소 — 동일 패턴 적용 가능';
        $ev[] = 'ST09 REUSE_CANDIDATE / reuse_level=' . ($d['reuse_level'] ?? '?');
    } elseif ($x['classification'] === 'PACKAGE_ONLY'
              && ($a['usage_status'] ?? '') === 'DECLARED_NOT_FOUND'
              && $x['entity_type'] === 'PACKAGE') {
        // ★유일하게 증거 있는 제거 후보 — ST06 이 전 소스 스캔으로 사용처 0 을 실증
        $dec = 'REMOVE'; $cat = 'BACKEND'; $sev = 'LOW'; $phase = 'PHASE_8'; $prio = 'P3';
        $cplx = 'LOW'; $risk = 'MEDIUM'; $mr = true;
        $why = 'Manifest 선언 대비 사용처 0건(ST06 전 소스 독립 스캔). '
             . '★단 즐겨찾기 범위 밖의 저장소 전역 사안이므로 별도 승인 후 처리';
        $ev[] = 'ST06 usage_status=DECLARED_NOT_FOUND, 탐지 네임스페이스 기준 import·use 0건';
        $ev[] = 'ST09 fan_in=' . ($d['fan_in'] ?? 0);
        $removal[] = ['normalized_id' => $id, 'name' => $x['canonical_name'],
            'declared_version' => $a['declared_version'] ?? null,
            'dependency_type' => $a['dependency_type'] ?? null,
            'legacy_evidence' => $ev, 'scope_note' => '즐겨찾기 범위 밖 — 저장소 전역 정리 항목',
            'manual_review' => true];
    } elseif ($x['classification'] === 'PARTIAL_IMPLEMENTATION') {
        // 클러스터 안에 있지만 증거축은 아닌 레코드(RAW_MATCH·FILE·GAP).
        // 구현 자체는 아니나 **확장 시 손대게 될 파일 내 위치**이므로 변경 표면으로 잡는다.
        $dec = 'EXTEND'; $cat = 'FRONTEND'; $sev = 'LOW'; $phase = 'PHASE_3'; $prio = 'P2';
        $cplx = 'LOW'; $risk = 'LOW';
        $why = '즐겨찾기 부분구현 클러스터(' . $x['feature_cluster'] . ') 내부 지점 — '
             . '독립 구현물은 아니지만 확장 시 수정 표면에 포함된다. 증거축이 아니므로 단독 구현 대상은 아니다';
        $ev[] = 'ST08 클러스터 ' . $x['feature_cluster'] . ' 소속(증거축 없음)';
        $ev[] = 'ST09 impact=' . $impact . ', layer=' . ($d['layer'] ?? '?');
    } elseif ($x['classification'] === 'CONFLICTING') {
        $dec = 'MANUAL_REVIEW'; $cat = 'UNKNOWN'; $sev = 'LOW'; $phase = 'PHASE_8'; $prio = 'P3';
        $cplx = 'LOW'; $risk = 'LOW'; $mr = true;
        $why = 'ST07 충돌 레코드 — 상류 산출물 정정이 선행되어야 판단 가능';
        $ev[] = 'ST07 ' . ($cfl['conflicts'][0]['conflict_id'] ?? 'FAV-CFL');
        $refactor[] = ['normalized_id' => $id, 'name' => $x['canonical_name'],
            'target' => 'tools/cwis/navigation/scripts/search-favorites-database.php',
            'reason' => '마이그레이션 파서가 `IF NOT EXISTS` 의 SQL 키워드를 테이블명으로 추출',
            'evidence' => $ev, 'priority' => 'P3', 'complexity' => 'LOW'];
    } else {
        $dec = 'KEEP_AS_IS'; $cat = match ($x['classification']) {
            'FALSE_POSITIVE' => 'UNKNOWN', 'TEST_ONLY' => 'TEST',
            'PACKAGE_ONLY' => 'BACKEND', default => 'UNKNOWN',
        };
        $sev = 'NONE'; $phase = 'NOT_SCHEDULED'; $prio = 'P3'; $cplx = 'LOW'; $risk = 'NONE';
        $why = match ($x['classification']) {
            'FALSE_POSITIVE' => '즐겨찾기와 무관 — 로드맵 대상 아님',
            'TEST_ONLY'      => '기존 테스트 자산 — 변경 요구 없음',
            'PACKAGE_ONLY'   => '외부 패키지 및 사용처 — 즐겨찾기 구현 대상 아님',
            'UNKNOWN'        => '분류 미확정 — 추가 근거 없이 로드맵에 올리지 않는다',
            default          => '변경 요구가 확인되지 않음',
        };
        $ev[] = 'ST08 ' . $x['classification'];
        if ($x['classification'] === 'UNKNOWN') { $mr = true; $dec = 'MANUAL_REVIEW'; }
    }

    $decCount[$dec] = ($decCount[$dec] ?? 0) + 1;
    $phaseCount[$phase] = ($phaseCount[$phase] ?? 0) + 1;
    $prioCount[$prio] = ($prioCount[$prio] ?? 0) + 1;

    $plan[] = [
        'normalized_id' => $id, 'canonical_key' => $x['canonical_key'],
        'canonical_name' => $x['canonical_name'], 'entity_type' => $x['entity_type'],
        'classification' => $x['classification'], 'layer' => $d['layer'] ?? 'Unknown',
        'currently_implemented' => in_array($x['classification'],
            ['PARTIAL_IMPLEMENTATION', 'SHARED_INFRASTRUCTURE', 'REUSABLE_COMPONENT'], true),
        'reusable' => $isReuse,
        'gap_present' => $sev !== 'NONE',
        'gap_category' => $cat, 'gap_severity' => $sev,
        'implementation_decision' => $dec, 'roadmap_phase' => $phase, 'priority' => $prio,
        'reason' => $why, 'evidence' => $ev,
        'risk_level' => $risk, 'estimated_complexity' => $cplx, 'estimated_impact' => $impact,
        'manual_review' => $mr,
    ];
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. 기술 부채 · 리스크
 * ══════════════════════════════════════════════════════════════════════════ */
$unusedPkgs = array_values(array_filter($pkg['packages'],
    static fn($p) => ($p['usage_status'] ?? '') === 'DECLARED_NOT_FOUND'));
$debt = [
    ['debt_id' => 'FAV-DEBT-001', 'title' => '즐겨찾기 테스트 커버리지 0',
     'category' => 'TEST', 'severity' => 'MEDIUM',
     'evidence' => ['ST06 테스트 143건 중 즐겨찾기 대상 1건이며 그마저 본 CWIS 작업의 Alias 보존 검증'],
     'remediation' => '재사용 가능한 인메모리 SQLite 픽스처 3종을 전용해 검증 추가', 'priority' => 'P2'],
    ['debt_id' => 'FAV-DEBT-002', 'title' => '표준 테스트 러너 부재',
     'category' => 'TEST', 'severity' => 'MEDIUM',
     'evidence' => ['ST06 PHPUnit/Pest/Vitest/Jest/Cypress/Playwright 설정 파일 0건, 테스트 자산은 자체 셀프테스트 6종뿐'],
     'remediation' => '러너 도입은 저장소 전역 결정 — 즐겨찾기 단독으로 판단하지 말 것', 'priority' => 'P2'],
    ['debt_id' => 'FAV-DEBT-003', 'title' => '미사용 Composer 프로덕션 의존성 ' . count($unusedPkgs) . '건',
     'category' => 'BACKEND', 'severity' => 'LOW',
     'evidence' => ['ST06 전 소스 독립 스캔 결과 사용처 0건: '
        . implode(', ', array_map(static fn($p) => $p['package_name'], $unusedPkgs))],
     'remediation' => '즐겨찾기 범위 밖 — 저장소 전역 정리 항목으로 별도 승인 필요', 'priority' => 'P3'],
    ['debt_id' => 'FAV-DEBT-004', 'title' => '스키마 생성 경로가 마이그레이션이 아니라 ensureTables',
     'category' => 'DATABASE', 'severity' => 'MEDIUM',
     'evidence' => ['ST04 실측 — 전 321개 테이블이 backend/src 의 ensureTables DDL 로 생성되며 '
        . 'backend/migrations 는 세션 172 에서 정지'],
     'remediation' => '★즐겨찾기 테이블을 새 마이그레이션 파일로 만들면 배포 경로에 실리지 않는다. '
        . '기존 ensureTables 패턴을 따라야 한다', 'priority' => 'P0'],
    ['debt_id' => 'FAV-DEBT-005', 'title' => '즐겨찾기 토글의 접근성 상태 미노출',
     'category' => 'UX', 'severity' => 'MEDIUM',
     'evidence' => ['ST03 실측 aria-pressed 0건'],
     'remediation' => '토글 버튼에 aria-pressed 부여', 'priority' => 'P2'],
    ['debt_id' => 'FAV-DEBT-006', 'title' => 'ST04 마이그레이션 파서 SQL 키워드 오탐',
     'category' => 'DOCUMENTATION', 'severity' => 'LOW',
     'evidence' => ['ST07 FAV-CFL-000001 — `IF NOT EXISTS` 의 IF 가 affected_table 로 추출'],
     'remediation' => 'search-favorites-database.php 파서 보정', 'priority' => 'P3'],
];

$veryHigh = array_values(array_filter($imp['impact'], static fn($r) => $r['impact_level'] === 'VERY_HIGH'));
$risks = [
    ['risk_id' => 'FAV-RISK-001', 'title' => '★즐겨찾기의 정의가 확정되지 않음',
     'risk_level' => 'VERY_HIGH', 'category' => 'FRONTEND',
     'description' => 'tenantStorage.js:14 가 UI 프리퍼런스(device-local)와 회원 데이터(tenant-scoped)를 가르는 규칙을 '
        . '이미 명문화했다. 즐겨찾기가 어느 쪽인지 정하지 않으면 이후 모든 설계 결정(테이블·API·동기화·격리)이 '
        . '근거 없이 진행된다. **이 결정 없이 PHASE_2 이후를 시작하면 안 된다**',
     'evidence' => ['frontend/src/utils/tenantStorage.js:14', 'ST08 저장 정책 분석'],
     'mitigation' => 'PHASE_1 의 단일 결정 게이트로 처리 — 사용자 승인 필요', 'manual_review' => true],
    ['risk_id' => 'FAV-RISK-002', 'title' => '외부 협업자 Default Deny 자동 적용',
     'risk_level' => 'HIGH', 'category' => 'AUTHORIZATION',
     'description' => 'PM\\Shared::gate 를 재사용하면 CWIS Part003 이 건 guest/partner Default Deny 가 '
        . '즐겨찾기에도 자동 적용된다. 외부 협업자에게 즐겨찾기를 허용할 의도라면 명시적 예외가 필요하다',
     'evidence' => ['ST05 middleware_inventory authorization[0] external_principal_deny=true', 'ST09 REUSE_CANDIDATE'],
     'mitigation' => 'PHASE_5 에서 의도 확인 후 결정', 'manual_review' => true],
    ['risk_id' => 'FAV-RISK-003', 'title' => '신규 테이블을 마이그레이션으로 만들면 배포되지 않음',
     'risk_level' => 'HIGH', 'category' => 'DATABASE',
     'description' => 'backend/migrations 는 세션 172 에서 정지했고 이후 모든 스키마는 ensureTables 자가치유로 적용된다. '
        . '관행을 모르고 마이그레이션 파일을 추가하면 운영에 반영되지 않는다',
     'evidence' => ['ST04 migration_inventory', 'FAV-DEBT-004'],
     'mitigation' => 'PHASE_2 착수 전 ensureTables 패턴 확인', 'manual_review' => true],
    ['risk_id' => 'FAV-RISK-004', 'title' => '변경 위험 지점 ' . count($veryHigh) . '건(VERY_HIGH 영향도)',
     'risk_level' => 'MEDIUM', 'category' => 'DATABASE',
     'description' => 'ST09 영향도 VERY_HIGH 레코드 — ENTITY·MIGRATION·CONTROLLER 축. '
        . '즐겨찾기 구현이 이 지점을 건드리면 다른 도메인으로 파급된다',
     'evidence' => ['ST09 impact-map VERY_HIGH ' . count($veryHigh) . '건'],
     'mitigation' => '신규 테이블·핸들러를 별도로 두고 기존 축을 수정하지 않는다', 'manual_review' => false],
    ['risk_id' => 'FAV-RISK-005', 'title' => '협업 범위 즐겨찾기는 선행 엔티티가 없음',
     'risk_level' => 'MEDIUM', 'category' => 'WORKSPACE',
     'description' => 'Workspace·Project 엔티티와 멤버십 행이 저장소에 존재하지 않는다. '
        . '팀 공유 즐겨찾기를 요구하면 엔티티 신설이 선행되며 본 Unit 범위를 넘는다',
     'evidence' => ['ST07 NavigationContext::ABSENT_AXES', 'ST09 reuse_level WORKSPACE/PROJECT 0건'],
     'mitigation' => '범위 밖임을 명시하고 별도 Unit 으로 분리', 'manual_review' => true],
];

/* ══════════════════════════════════════════════════════════════════════════
 * 6. 로드맵
 * ══════════════════════════════════════════════════════════════════════════ */
$gapsByPhase = [];
foreach ($gaps as $g) $gapsByPhase[$g['roadmap_phase']][] = $g['gap_id'];
$roadmap = [
    ['phase' => 'PHASE_1', 'title' => 'Critical Foundation — 정의 결정 게이트',
     'goal' => '★즐겨찾기가 "UI 프리퍼런스"인가 "기기 간 동기화되는 회원 데이터"인가를 확정한다. '
        . '이 결정이 PHASE_2~5 의 존재 여부 자체를 좌우한다',
     'blocking' => true, 'priority' => 'P0',
     'gaps' => $gapsByPhase['PHASE_1'] ?? [],
     'exit_criteria' => ['정의 확정(사용자 승인)', 'ensureTables 스키마 경로 확인(FAV-DEBT-004)',
        '외부 협업자 즐겨찾기 허용 여부 확정(FAV-RISK-002)'],
     'note' => '정의가 "UI 프리퍼런스"로 확정되면 PHASE_2·PHASE_4 는 **불필요**하며 '
        . 'PHASE_3·PHASE_7 만 남는다(완성률 50% → 100% 경로)'],
    ['phase' => 'PHASE_2', 'title' => 'Core Backend — 지속화',
     'goal' => '즐겨찾기 테이블·핸들러 구현(ensureTables 패턴 준수)',
     'blocking' => false, 'priority' => 'P0', 'conditional_on' => 'PHASE_1 정의 = MEMBER_DATA',
     'gaps' => $gapsByPhase['PHASE_2'] ?? [], 'exit_criteria' => ['테이블 생성', '핸들러 CRUD']],
    ['phase' => 'PHASE_3', 'title' => 'Frontend — 기존 구현 확장',
     'goal' => 'useFavorites·QuickAccessPanel 확장(Replace 금지, Extend)',
     'blocking' => false, 'priority' => 'P1', 'gaps' => $gapsByPhase['PHASE_3'] ?? [],
     'exit_criteria' => ['접근성 aria-pressed', '순서 지정', '기존 동작 무후퇴']],
    ['phase' => 'PHASE_4', 'title' => 'API — 엔드포인트',
     'goal' => 'REST 라우트 등록(/api 접두 필수)', 'blocking' => false, 'priority' => 'P0',
     'conditional_on' => 'PHASE_1 정의 = MEMBER_DATA', 'gaps' => $gapsByPhase['PHASE_4'] ?? [],
     'exit_criteria' => ['routes.php 등록', '실배선 확인']],
    ['phase' => 'PHASE_5', 'title' => 'Security — 권한·격리',
     'goal' => '기존 게이트 재사용(신규 구현 금지)', 'blocking' => false, 'priority' => 'P1',
     'gaps' => $gapsByPhase['PHASE_5'] ?? [],
     'exit_criteria' => ['PM\\Shared::gate 적용', '테넌트 격리 검증', '외부 협업자 정책 확정']],
    ['phase' => 'PHASE_6', 'title' => 'Optimization — 관측',
     'goal' => '감사 로그 연결(기존 menu_audit_log 재사용)', 'blocking' => false, 'priority' => 'P2',
     'gaps' => $gapsByPhase['PHASE_6'] ?? [], 'exit_criteria' => ['변경 감사 기록']],
    ['phase' => 'PHASE_7', 'title' => 'Testing',
     'goal' => '재사용 픽스처로 검증 추가', 'blocking' => false, 'priority' => 'P2',
     'gaps' => $gapsByPhase['PHASE_7'] ?? [], 'exit_criteria' => ['회귀 검증', 'E2E 시나리오']],
    ['phase' => 'PHASE_8', 'title' => 'Cleanup',
     'goal' => '상류 파서 오탐 정정 · 미사용 의존성(별도 승인)', 'blocking' => false, 'priority' => 'P3',
     'gaps' => $gapsByPhase['PHASE_8'] ?? [],
     'exit_criteria' => ['FAV-CFL-000001 해소', '제거 후보 승인 여부 결정']],
];

/* ══════════════════════════════════════════════════════════════════════════
 * 7. 통계 · 출력
 * ══════════════════════════════════════════════════════════════════════════ */
ksort($decCount); ksort($phaseCount); ksort($prioCount);
$gapSev = [];
foreach ($gaps as $g) $gapSev[$g['gap_severity']] = ($gapSev[$g['gap_severity']] ?? 0) + 1;
ksort($gapSev);
$total = count($plan);
$reuseN = count(array_filter($plan, static fn($p) => $p['implementation_decision'] === 'REUSE'));
$newN   = count($gaps) - count($INFRA_ABSENT);
$legacyN = count($removal);

$summary = [
    'overall_completion_percentage' => $pctAll,
    'completion_by_definition' => [
        'AS_UI_PREFERENCE' => ['percentage' => $pctPref, 'satisfied' => $prefDone, 'required' => count($prefCaps),
            'note' => 'tenantStorage.js:14 규정상 현행 device-local 저장이 규칙 준수인 경우'],
        'AS_MEMBER_DATA' => ['percentage' => $pctAll, 'satisfied' => $allDone, 'required' => count($CAPS),
            'note' => '기기 간 동기화되는 회원 데이터로 재정의하는 경우'],
    ],
    'reuse_percentage' => (int)round($reuseN / max(1, $total) * 100),
    'new_implementation_percentage' => (int)round($newN / max(1, count($CAPS)) * 100),
    'legacy_percentage' => (int)round($legacyN / max(1, $total) * 100),
    'technical_debt_count' => count($debt),
    'critical_gap_count' => $gapSev['CRITICAL'] ?? 0,
    'high_gap_count' => $gapSev['HIGH'] ?? 0,
    'reuse_candidate_count' => $reuseN,
    'refactoring_candidate_count' => count($refactor),
    'removal_candidate_count' => count($removal),
    'roadmap_phase_statistics' => $phaseCount,
    'priority_statistics' => $prioCount,
    'implementation_decision_statistics' => $decCount,
    'gap_severity_statistics' => $gapSev,
    'gap_count' => count($gaps),
    'risk_count' => count($risks),
    'capability_checklist' => $CAPS,
    'infrastructure_absent' => $INFRA_ABSENT,
    'roadmap_phase_note' => 'NOT_SCHEDULED = 로드맵 행동이 필요 없는 레코드. '
        . '1,400여 건의 무행동 레코드를 PHASE_8(Cleanup)에 몰아넣으면 정리 단계 규모가 거짓으로 부풀기 때문에 '
        . '명세 8단계와 별도로 도입한 명시값이다',
];

$now = gmdate('c');
$head = ['specification_id' => SPEC_ID, 'schema_version' => SCHEMA_VERSION,
    'source_revisions' => $nrm['source_revisions'] ?? [], 'generated_at' => $now];
$w = static function (string $rel, array $d) use ($ROOT): void {
    $n = str_replace('\\', '/', $rel);
    if (str_contains($n, '..') || !str_starts_with($n, 'tools/cwis/navigation/output/')) {
        fwrite(STDERR, "[ST10] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    file_put_contents("$ROOT/$n", json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST10] 생성: $rel\n";
};
$w("$IN/favorites-gap-analysis.json", $head + ['gap_count' => count($gaps),
    'capability_checklist' => $CAPS, 'infrastructure_absent' => $INFRA_ABSENT, 'gaps' => $gaps]);
$w("$IN/favorites-roadmap.json", $head + ['phase_count' => count($roadmap), 'roadmap' => $roadmap]);
$w("$IN/favorites-implementation-plan.json", $head + ['record_count' => $total, 'plan' => $plan]);
$w("$IN/favorites-risk-analysis.json", $head + ['risk_count' => count($risks), 'risks' => $risks]);
$w("$IN/favorites-technical-debt.json", $head + ['debt_count' => count($debt), 'technical_debt' => $debt]);
$w("$IN/favorites-refactoring-candidates.json", $head + ['count' => count($refactor), 'refactoring_candidates' => $refactor]);
$w("$IN/favorites-removal-candidates.json", $head + ['count' => count($removal), 'removal_candidates' => $removal]);
$w("$IN/favorites-final-summary.json", $head + $summary);

printf("[ST10] 레코드 %d · Gap %d(CRITICAL %d/HIGH %d) · 재사용 %d · 부채 %d · 리스크 %d · 리팩터 %d · 제거 %d\n",
    $total, count($gaps), $gapSev['CRITICAL'] ?? 0, $gapSev['HIGH'] ?? 0,
    $reuseN, count($debt), count($risks), count($refactor), count($removal));
printf("       완성률 — UI프리퍼런스 기준 %d%%(%d/%d) · 회원데이터 기준 %d%%(%d/%d)\n",
    $pctPref, $prefDone, count($prefCaps), $pctAll, $allDone, count($CAPS));
echo '       결정: ' . json_encode($decCount, JSON_UNESCAPED_UNICODE) . "\n";
echo '       Phase: ' . json_encode($phaseCount, JSON_UNESCAPED_UNICODE) . "\n";
exit(0);
