<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST09 — Dependency & Reuse Mapping.
 *
 * ST08 분류(1,541건) + ST07 관계(1,728건)를 결합해
 *   ① 무엇을 사용하는지 / ② 누가 사용하는지 / ③ 어느 계층인지
 *   ④ 재사용 가능한지 / ⑤ 변경 영향도가 얼마나 되는지 를 산출한다.
 *
 * ★추측 금지 — 재사용 등급은 "그럴듯함"이 아니라 **실측 팬인(fan-in)과 모듈 분포**로 정한다.
 *   소비자가 0이면 GLOBAL 이라고 주장하지 않는다.
 *
 * ★Impact 는 명세가 준 고정 표를 따른다. 팬인은 근거로만 첨부하고 등급을 임의 승격하지 않는다.
 *
 * 안전: 입력 읽기 전용 · 운영 코드 변경 0 · DB/네트워크/Boot 0 · 결정적 출력.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST09';
const SCHEMA_VERSION = '1.0.0';

$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST09] 루트 탐지 실패\n"); exit(2); }
$IN = 'tools/cwis/navigation/output';

$load = static function (string $f) use ($ROOT, $IN) {
    $p = "$ROOT/$IN/$f";
    if (!is_file($p)) { fwrite(STDERR, "[ST09] 필수 입력 없음: $IN/$f\n"); exit(2); }
    return json_decode((string)file_get_contents($p), true, 512, JSON_THROW_ON_ERROR);
};
$clsDoc  = $load('favorites-classification.json');
$sumDoc  = $load('favorites-classification-summary.json');
$nrmDoc  = $load('favorites-normalized-records.json');
$relDoc  = $load('favorites-normalized-relationships.json');
$cflDoc  = $load('favorites-normalization-conflicts.json');
$statDoc = $load('favorites-normalization-statistics.json');

$C = $clsDoc['classifications'];
$N = [];
foreach ($nrmDoc['records'] as $r) $N[$r['normalized_id']] = $r;
$byId = [];
foreach ($C as $i => $x) $byId[$x['normalized_id']] = $i;

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Layer 판정
 * ══════════════════════════════════════════════════════════════════════════ */
$layerOf = static function (array $x, array $n): string {
    $et = $x['entity_type'];
    $f  = strtolower(($x['source_files'][0] ?? ''));
    $name = strtolower($x['canonical_name']);

    if (in_array($et, ['TEST_CASE', 'TEST_ASSET', 'CI_JOB'], true)) return 'Test';
    if (in_array($et, ['PACKAGE', 'DEPENDENCY_USAGE'], true))       return 'Package';
    if (in_array($et, ['DATABASE_TABLE','DATABASE_COLUMN','DATABASE_CONSTRAINT',
                       'DATABASE_INDEX','MIGRATION','ORM_MAPPING'], true)) return 'Database';
    if (in_array($et, ['COMPONENT', 'STATE_UNIT'], true))           return 'Frontend';
    if (in_array($et, ['API_ENDPOINT','API_CONTROLLER','API_REQUEST','API_RESPONSE','OPENAPI_OPERATION'], true)) return 'API';
    if ($et === 'MIDDLEWARE')                                       return 'Shared';
    if ($x['classification'] === 'SHARED_INFRASTRUCTURE')           return 'Shared';

    if ($f !== '') {
        if (str_starts_with($f, 'frontend/'))                       return 'Frontend';
        if (str_starts_with($f, 'tools/e2e/') || str_contains($f, 'selftest')) return 'Test';
        if (str_starts_with($f, '.github/'))                        return 'Test';
        if (str_starts_with($f, 'backend/migrations/') || str_starts_with($f, 'tools/migrations/')) return 'Database';
        if (str_starts_with($f, 'backend/public/'))                 return 'API';
        if (str_starts_with($f, 'backend/src/handlers/'))           return 'Application';
        if (str_starts_with($f, 'backend/src/'))                    return 'Domain';
        if (str_starts_with($f, 'backend/bin/'))                    return 'Infrastructure';
        if (str_starts_with($f, 'tools/'))                          return 'Infrastructure';
        if (str_starts_with($f, 'docs/') || str_ends_with($f, '.md')) return 'Unknown';
    }
    if ($et === 'SYMBOL') {
        if (str_contains($name, 'repository')) return 'Domain';
        if (str_contains($name, 'service'))    return 'Application';
        return 'Application';
    }
    return 'Unknown';
};

/* ══════════════════════════════════════════════════════════════════════════
 * 2. 관계 → Dependency Type / Level 매핑
 * ══════════════════════════════════════════════════════════════════════════ */
$EDGE_MAP = [
    // ST07 관계          => [dependency_type, dependency_level, 방향뒤집기]
    'DEFINED_IN'           => ['DEPENDS_ON',  'BUILDTIME_DEPENDENCY', false],
    'IMPORTS'              => ['IMPORTS',     'BUILDTIME_DEPENDENCY', false],
    'DECLARED_BY'          => ['DEPENDS_ON',  'BUILDTIME_DEPENDENCY', false],
    'HANDLES'              => ['ROUTES_TO',   'RUNTIME_DEPENDENCY',   false],
    'PROTECTED_BY'         => ['AUTHORIZES',  'RUNTIME_DEPENDENCY',   false],
    'CONTAINS'             => ['DEPENDS_ON',  'DIRECT_DEPENDENCY',    true],   // table→column ⇒ column이 table에 의존
    'CREATES'              => ['WRITES',      'BUILDTIME_DEPENDENCY', false],
    'ALTERS'               => ['WRITES',      'BUILDTIME_DEPENDENCY', false],
    'DROPS'                => ['WRITES',      'BUILDTIME_DEPENDENCY', false],
    'RENAMES'              => ['WRITES',      'BUILDTIME_DEPENDENCY', false],
    'REFERENCES'           => ['DEPENDS_ON',  'DIRECT_DEPENDENCY',    false],
    'MAPS_TO'              => ['IMPLEMENTS',  'DIRECT_DEPENDENCY',    false],
    'TESTS'                => ['USES',        'TEST_DEPENDENCY',      false],
    'MOCKS'                => ['USES',        'TEST_DEPENDENCY',      false],
    'VALIDATES_WITH'       => ['VALIDATES',   'RUNTIME_DEPENDENCY',   false],
    'RETURNS'              => ['RENDERS',     'RUNTIME_DEPENDENCY',   false],
    'CALLS'                => ['CALLS',       'RUNTIME_DEPENDENCY',   false],
    'USES'                 => ['USES',        'DIRECT_DEPENDENCY',    false],
    'SEMANTICALLY_RELATED' => ['UNKNOWN',     'OPTIONAL_DEPENDENCY',  false],
    'POTENTIAL_MATCH'      => ['UNKNOWN',     'OPTIONAL_DEPENDENCY',  false],
    'POTENTIAL_DUPLICATE'  => ['UNKNOWN',     'OPTIONAL_DEPENDENCY',  false],
    'ALIAS_CANDIDATE'      => ['UNKNOWN',     'OPTIONAL_DEPENDENCY',  false],
];

$edges = []; $targets = []; $sources = []; $consumers = []; $broken = [];
foreach ($relDoc['relationships'] as $rel) {
    $m = $EDGE_MAP[$rel['relationship_type']] ?? ['UNKNOWN', 'UNKNOWN', false];
    [$dtype, $dlevel, $flip] = $m;
    $from = $flip ? $rel['to_normalized_id'] : $rel['from_normalized_id'];
    $to   = $flip ? $rel['from_normalized_id'] : $rel['to_normalized_id'];

    // Broken: 존재하지 않는 레코드를 가리키는 의존성
    if (!isset($byId[$from]) || !isset($byId[$to])) {
        $broken[] = ['relationship_id' => $rel['relationship_id'], 'from' => $from, 'to' => $to,
            'reason' => 'MISSING_RECORD'];
        continue;
    }
    // 테스트 계층에서 나가는 의존은 TEST_DEPENDENCY 로 승격
    if (($C[$byId[$from]]['classification'] ?? '') === 'TEST_ONLY' && $dlevel !== 'OPTIONAL_DEPENDENCY') {
        $dlevel = 'TEST_DEPENDENCY';
    }
    $edges[] = ['dependency_id' => '', 'dependency_type' => $dtype, 'dependency_level' => $dlevel,
        'from_normalized_id' => $from, 'to_normalized_id' => $to,
        'origin_relationship' => $rel['relationship_type'],
        'origin_relationship_id' => $rel['relationship_id'],
        'confidence' => $rel['confidence']];
    $targets[$from][] = $to;
    $sources[$to][] = $from;
    // ★재사용 판정용 팬인은 **소비 엣지만** 센다.
    //   DEFINED_IN(파일이 자기 내용물을 담음)을 팬인으로 세면
    //   "파일이 자기 내용물에 의해 재사용된다"는 무의미한 결론이 나온다.
    if (in_array($dtype, ['IMPORTS','CALLS','USES','AUTHORIZES','ROUTES_TO','IMPLEMENTS',
                          'VALIDATES','RENDERS','QUERIES','READS','WRITES','INJECTS'], true)
        || ($dtype === 'DEPENDS_ON' && $rel['relationship_type'] === 'REFERENCES')) {
        $consumers[$to][] = $from;
    }
}
usort($edges, static fn($a, $b) => strcmp($a['from_normalized_id'], $b['from_normalized_id'])
    ?: strcmp($a['to_normalized_id'], $b['to_normalized_id'])
    ?: strcmp($a['dependency_type'], $b['dependency_type']));
$eseq = 0;
foreach ($edges as $i => $e) $edges[$i]['dependency_id'] = sprintf('FAV-DEP-%06d', ++$eseq);

/* ★의미적 Broken — 라우트가 실존하지 않는 컨트롤러 파일을 가리키는 경우 */
foreach ($C as $x) {
    $n = $N[$x['normalized_id']] ?? [];
    if (($n['attributes']['controller_file_exists'] ?? null) === false) {
        $broken[] = ['relationship_id' => null, 'from' => $x['normalized_id'],
            'to' => (string)($n['attributes']['controller'] ?? '?'),
            'reason' => 'CONTROLLER_FILE_NOT_FOUND'];
    }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. 순환 의존 탐지 (DFS)
 * ══════════════════════════════════════════════════════════════════════════ */
$adj = [];
foreach ($edges as $e) {
    if ($e['dependency_level'] === 'OPTIONAL_DEPENDENCY') continue;   // 약한 의미 관계는 순환에서 제외
    $adj[$e['from_normalized_id']][] = $e['to_normalized_id'];
}
$state = []; $cycles = []; $inCycle = [];
$dfs = static function (string $n, array $path) use (&$dfs, &$state, &$adj, &$cycles, &$inCycle): void {
    if (($state[$n] ?? 0) === 1) {
        $i = array_search($n, $path, true);
        if ($i !== false) {
            $c = array_slice($path, $i);
            $c[] = $n;
            $cycles[] = $c;
            foreach ($c as $m) $inCycle[$m] = true;
        }
        return;
    }
    if (($state[$n] ?? 0) === 2) return;
    $state[$n] = 1;
    $path[] = $n;
    foreach ($adj[$n] ?? [] as $m) $dfs($m, $path);
    $state[$n] = 2;
};
$nodes = array_keys($byId);
sort($nodes, SORT_STRING);
foreach ($nodes as $n) $dfs($n, []);

/* ══════════════════════════════════════════════════════════════════════════
 * 4. 모듈 판정 — 재사용 등급의 실측 근거
 * ══════════════════════════════════════════════════════════════════════════ */
$moduleOf = static function (array $x): string {
    $f = $x['source_files'][0] ?? '';
    if ($f === '') return 'unknown';
    $p = explode('/', $f);
    if (str_starts_with($f, 'frontend/src/')) return 'frontend/' . ($p[2] ?? 'src');
    if (str_starts_with($f, 'backend/src/'))  return 'backend/' . ($p[2] ?? 'src');
    if (str_starts_with($f, 'backend/'))      return 'backend/' . ($p[1] ?? '');
    if (str_starts_with($f, 'tools/'))        return 'tools/' . ($p[1] ?? '');
    return $p[0];
};

/* ══════════════════════════════════════════════════════════════════════════
 * 5. 레코드별 Layer / Reuse / Impact 산출
 * ══════════════════════════════════════════════════════════════════════════ */
$VERY_HIGH_AXES = ['CONTROLLER', 'SERVICE', 'REPOSITORY', 'ENTITY', 'MIGRATION'];
$HIGH_AXES      = ['POLICY', 'ROUTE'];
$MEDIUM_AXES    = ['COMPONENT', 'STORE', 'REQUEST', 'API'];

$depMap = []; $reuseMap = []; $impactMap = [];
$reuseCandidates = 0; $globalReuse = 0; $moduleReuse = 0; $review = 0;

foreach ($C as $x) {
    $id = $x['normalized_id'];
    $n  = $N[$id] ?? [];
    $a  = $n['attributes'] ?? [];
    $layer = $layerOf($x, $n);
    $mod = $moduleOf($x);
    $tg = array_values(array_unique($targets[$id] ?? []));
    $sr = array_values(array_unique($sources[$id] ?? []));
    sort($tg, SORT_STRING); sort($sr, SORT_STRING);

    // 소비자 모듈 분포 — 재사용 등급의 실측 근거(★소비 엣지만, 포함 관계 제외)
    $cs = array_values(array_unique($consumers[$id] ?? []));
    sort($cs, SORT_STRING);
    $consumerModules = [];
    foreach ($cs as $s) {
        $j = $byId[$s] ?? null;
        if ($j === null) continue;
        $cm = $moduleOf($C[$j]);
        if ($cm !== 'unknown' && $cm !== $mod) $consumerModules[$cm] = true;
    }
    $consumerModules = array_keys($consumerModules);
    sort($consumerModules, SORT_STRING);
    $fanIn = count($cs);                 // 재사용 판정용 = 실제 소비자 수
    $fanInAll = count($sr);              // 참조 전체(포함 관계 포함)
    $fanOut = count($tg);

    /* ── Reuse 판정 ────────────────────────────────────────────────────── */
    $rl = 'UNKNOWN'; $rr = '';
    if ($x['entity_type'] === 'FILE') {
        // ★파일은 재사용 단위가 아니다(재사용되는 것은 그 안의 심볼·컴포넌트다).
        //   패키지 규칙을 타면 "외부 패키지 사용처 0건" 같은 틀린 사유가 붙는다.
        $childCount = $fanInAll;
        $rl = 'NONE';
        $rr = "파일은 재사용 단위가 아니다 — 재사용 여부는 이 파일이 담은 {$childCount}개 레코드에서 개별 판정한다";
    } elseif (in_array($x['classification'], ['FALSE_POSITIVE', 'CONFLICTING'], true)) {
        $rl = 'NONE';
        $rr = '즐겨찾기와 무관하거나 근거가 상충 — 재사용 대상이 아니다';
    } elseif ($x['classification'] === 'PACKAGE_ONLY') {
        $rl = $fanIn >= 1 && count($consumerModules) >= 2 ? 'GLOBAL' : ($fanIn >= 1 ? 'MODULE' : 'NONE');
        $rr = $fanIn >= 1
            ? "외부 패키지 — 소비자 {$fanIn}건, 모듈 " . count($consumerModules) . '종(' . implode(',', array_slice($consumerModules, 0, 3)) . ')'
            : '외부 패키지이나 사용처 0건 — 재사용 근거 없음';
    } elseif ($x['classification'] === 'TEST_ONLY') {
        $rl = !empty($a['reusable_candidate']) ? 'MODULE' : 'LOCAL';
        $rr = !empty($a['reusable_candidate'])
            ? '테스트 자산이며 상류(ST06)가 재사용 가능 후보로 표시 — 신규 즐겨찾기 테스트에 전용 가능'
            : '테스트 전용이며 재사용 표시 없음';
    } elseif (($a['device_local_only'] ?? false) === true || ($a['storage_type'] ?? '') === 'localStorage') {
        $rl = 'USER';
        $rr = '사용자 개인 설정 저장소(' . (string)($a['storage_key'] ?? 'localStorage')
            . ', device_local_only=' . (($a['device_local_only'] ?? false) ? 'true' : 'false')
            . ') — 사용자 단위 재사용';
    } elseif (count($consumerModules) >= 2) {
        $rl = 'GLOBAL';
        $rr = "서로 다른 모듈 " . count($consumerModules) . '종이 소비(' . implode(', ', array_slice($consumerModules, 0, 4)) . ") — 전역 재사용 실측";
    } elseif (count($consumerModules) === 1 || ($fanIn >= 2 && $mod !== 'unknown')) {
        $rl = 'MODULE';
        $rr = "단일 모듈 범위에서 소비(팬인 {$fanIn}건, 모듈 " . ($consumerModules[0] ?? $mod) . ')';
    } elseif ($fanIn >= 1) {
        $rl = 'LOCAL';
        $rr = "소비자 {$fanIn}건뿐 — 단일 구현 범위";
    } else {
        $rl = 'LOCAL';
        $rr = '소비자 0건 — 다른 코드가 참조하지 않는 단일 구현. 팬인 실측 기반이며 "재사용 불가"를 뜻하지 않는다';
    }
    // ★WORKSPACE/PROJECT 는 저장소에 축 자체가 없다(ST07 NavigationContext::ABSENT_AXES).
    //   그러므로 이 두 등급은 0 이 정상이며, 억지로 배정하지 않는다.

    /* ── Impact 판정 — 명세 고정 표 ────────────────────────────────────── */
    $axis = $x['evidence_axis'];
    $il = 'UNKNOWN'; $ir = '';
    if ($layer === 'Unknown' && $x['classification'] === 'DOCUMENTATION_ONLY') {
        $il = 'NONE'; $ir = '문서 — 변경해도 런타임 영향 없음';
    } elseif ($x['entity_type'] === 'FILE') {
        // ★영향도는 "즐겨찾기를 바꿀 때 이 파일이 받는 영향"이다. 파일 자체의 중요도가 아니다.
        $inCluster = $x['feature_cluster'] !== null;
        $il = $inCluster ? 'MEDIUM' : 'LOW';
        $ir = $inCluster
            ? '즐겨찾기 구현 파일(' . $x['feature_cluster'] . ') — 기능 변경 시 직접 수정 대상'
            : '즐겨찾기 스코프에서 이 파일이 기여하는 것은 ' . $x['classification']
              . ' 레코드뿐 — 즐겨찾기 변경의 직접 영향권 밖(파일 자체의 중요도 평가가 아님)';
    } elseif ($axis !== null && in_array($axis, $VERY_HIGH_AXES, true)) {
        $il = 'VERY_HIGH';
        $ir = "핵심 계층 증거축({$axis}) — 명세 Impact 표 상 VERY_HIGH";
    } elseif ($axis !== null && in_array($axis, $HIGH_AXES, true)) {
        $il = 'HIGH';
        $ir = "공유 API·권한 증거축({$axis}) — 변경 시 다수 경로에 파급";
    } elseif ($x['classification'] === 'SHARED_INFRASTRUCTURE') {
        $il = 'HIGH';
        $ir = '즐겨찾기 전용이 아닌 공통 인프라 — 변경이 다른 도메인으로 전파';
    } elseif ($axis !== null && in_array($axis, $MEDIUM_AXES, true)) {
        $il = 'MEDIUM';
        $ir = "프런트엔드 계층 증거축({$axis})";
    } elseif ($x['classification'] === 'TEST_ONLY') {
        $il = 'LOW'; $ir = '테스트 — 운영 동작에 영향 없음';
    } elseif ($x['classification'] === 'PACKAGE_ONLY') {
        $il = $fanIn >= 20 ? 'HIGH' : ($fanIn >= 1 ? 'MEDIUM' : 'LOW');
        $ir = "외부 패키지 — 사용처 {$fanIn}건 실측";
    } elseif (in_array($x['classification'], ['FALSE_POSITIVE', 'CONFLICTING'], true)) {
        $il = 'NONE'; $ir = '즐겨찾기 구현이 아니므로 본 기능 변경 영향 없음';
    } elseif ($x['classification'] === 'PARTIAL_IMPLEMENTATION') {
        $il = 'MEDIUM';
        $ir = '즐겨찾기 부분구현 파일 내 근거 — 증거축은 아니나 수정 대상 파일';
    } else {
        $il = 'UNKNOWN';
        $ir = '영향도 판정 근거 부족 — 추측하지 않고 UNKNOWN 유지';
    }

    /* ── Dependency Level 요약 ─────────────────────────────────────────── */
    $lv = [];
    foreach ($edges as $e) { /* 인덱스 최적화는 아래 미리 계산으로 대체 */ }
    $dl = 'UNKNOWN';

    $mr = $x['manual_review'] || ($inCycle[$id] ?? false) || $il === 'VERY_HIGH';
    if ($mr) $review++;
    if ($rl === 'GLOBAL') $globalReuse++;
    if ($rl === 'MODULE') $moduleReuse++;

    $rec = [
        'normalized_id' => $id,
        'canonical_key' => $x['canonical_key'],
        'canonical_name' => $x['canonical_name'],
        'entity_type' => $x['entity_type'],
        'classification' => $x['classification'],
        'layer' => $layer,
        'module' => $mod,
        'evidence_axis' => $axis,
        'dependency_level' => $dl,                 // 아래 6단계에서 확정
        'dependency_targets' => $tg,
        'dependency_sources' => $sr,
        'fan_in' => $fanIn,                    // 실제 소비자 수(재사용 판정 근거)
        'fan_in_all_references' => $fanInAll,   // 포함 관계까지 합한 총 참조
        'fan_out' => $fanOut,
        'consumer_ids' => array_slice($cs, 0, 20),
        'consumer_modules' => $consumerModules,
        'reuse_level' => $rl,
        'reuse_reason' => $rr,
        'impact_level' => $il,
        'impact_reason' => $ir,
        'circular_dependency' => (bool)($inCycle[$id] ?? false),
        'broken_dependency' => false,              // 아래에서 표시
        'manual_review' => $mr,
    ];
    $depMap[$id] = $rec;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6. dependency_level 확정 + broken 표시 + REUSE_CANDIDATE 판정
 * ══════════════════════════════════════════════════════════════════════════ */
$LEVEL_RANK = ['RUNTIME_DEPENDENCY' => 6, 'DIRECT_DEPENDENCY' => 5, 'BUILDTIME_DEPENDENCY' => 4,
    'TEST_DEPENDENCY' => 3, 'SHARED_DEPENDENCY' => 2, 'OPTIONAL_DEPENDENCY' => 1, 'UNKNOWN' => 0];
foreach ($edges as $e) {
    $f = $e['from_normalized_id'];
    if (!isset($depMap[$f])) continue;
    $cur = $depMap[$f]['dependency_level'];
    if (($LEVEL_RANK[$e['dependency_level']] ?? 0) > ($LEVEL_RANK[$cur] ?? 0)) {
        $depMap[$f]['dependency_level'] = $e['dependency_level'];
    }
}
foreach ($depMap as $id => $r) {
    if ($r['dependency_level'] !== 'UNKNOWN') continue;
    // 나가는 의존이 없는 노드 — 공통 인프라라면 SHARED_DEPENDENCY 로 표시
    $depMap[$id]['dependency_level'] = $r['classification'] === 'SHARED_INFRASTRUCTURE'
        ? 'SHARED_DEPENDENCY' : ($r['fan_in'] > 0 ? 'DIRECT_DEPENDENCY' : 'UNKNOWN');
}
foreach ($broken as $b) {
    if (isset($depMap[$b['from']])) {
        $depMap[$b['from']]['broken_dependency'] = true;
        $depMap[$b['from']]['manual_review'] = true;
    }
}

/* REUSE_CANDIDATE / NO_REUSE — 신규 즐겨찾기가 실제로 재사용할 수 있는가 */
$reuseRecords = [];
foreach ($depMap as $id => $r) {
    $verdict = 'NO_REUSE'; $why = '';
    if (in_array($r['classification'], ['SHARED_INFRASTRUCTURE'], true)) {
        $verdict = 'REUSE_CANDIDATE';
        $why = '공통 인프라 — 신규 즐겨찾기 API 가 그대로 올라탈 수 있는 지반(인증·권한·미들웨어)';
    } elseif ($r['classification'] === 'TEST_ONLY' && $r['reuse_level'] === 'MODULE') {
        $verdict = 'REUSE_CANDIDATE';
        $why = '재사용 가능한 테스트 자산 — 신규 즐겨찾기 테스트에 전용 가능';
    } elseif ($r['classification'] === 'PARTIAL_IMPLEMENTATION' && $r['evidence_axis'] !== null) {
        $verdict = 'REUSE_CANDIDATE';
        $why = '기존 부분구현의 실제 증거축(' . $r['evidence_axis'] . ') — 확장 대상(Replace 아니라 Extend)';
    } elseif ($r['classification'] === 'REUSABLE_COMPONENT') {
        $verdict = 'REUSE_CANDIDATE';
        $why = '재사용 가능 UI·상태 요소 — 동일 패턴 적용 가능';
    } elseif ($r['classification'] === 'PACKAGE_ONLY' && $r['reuse_level'] === 'GLOBAL') {
        $verdict = 'REUSE_CANDIDATE';
        $why = '이미 전역에서 쓰이는 패키지 — 신규 의존성 추가 없이 활용 가능';
    } else {
        $why = match ($r['classification']) {
            'FALSE_POSITIVE' => '즐겨찾기와 무관',
            'CONFLICTING'    => '근거 상충 — 재사용 판단 불가',
            'UNKNOWN'        => '분류 미확정이라 재사용 판정 불가',
            default          => '재사용 근거를 확보하지 못함',
        };
    }
    if ($verdict === 'REUSE_CANDIDATE') $reuseCandidates++;
    $reuseRecords[] = ['normalized_id' => $id, 'canonical_key' => $r['canonical_key'],
        'canonical_name' => $r['canonical_name'], 'layer' => $r['layer'],
        'classification' => $r['classification'], 'reuse_level' => $r['reuse_level'],
        'reuse_relationship' => $verdict, 'reuse_reason' => $r['reuse_reason'],
        'reuse_verdict_reason' => $why, 'fan_in' => $r['fan_in'],
        'consumer_modules' => $r['consumer_modules'], 'manual_review' => $r['manual_review']];
}

/* ══════════════════════════════════════════════════════════════════════════
 * 7. 통계 · 출력
 * ══════════════════════════════════════════════════════════════════════════ */
$records = array_values($depMap);
usort($records, static fn($a, $b) => strcmp($a['normalized_id'], $b['normalized_id']));
usort($reuseRecords, static fn($a, $b) => strcmp($a['normalized_id'], $b['normalized_id']));

$cnt = static function (array $rows, string $k): array {
    $o = [];
    foreach ($rows as $r) $o[$r[$k]] = ($o[$r[$k]] ?? 0) + 1;
    ksort($o);
    return $o;
};
$depTypeStats = [];
foreach ($edges as $e) $depTypeStats[$e['dependency_type']] = ($depTypeStats[$e['dependency_type']] ?? 0) + 1;
$depLevelStats = [];
foreach ($edges as $e) $depLevelStats[$e['dependency_level']] = ($depLevelStats[$e['dependency_level']] ?? 0) + 1;
ksort($depTypeStats); ksort($depLevelStats);

$impactRecords = array_map(static fn($r) => [
    'normalized_id' => $r['normalized_id'], 'canonical_key' => $r['canonical_key'],
    'canonical_name' => $r['canonical_name'], 'layer' => $r['layer'],
    'evidence_axis' => $r['evidence_axis'], 'impact_level' => $r['impact_level'],
    'impact_reason' => $r['impact_reason'], 'fan_in' => $r['fan_in'], 'fan_out' => $r['fan_out'],
    'circular_dependency' => $r['circular_dependency'], 'broken_dependency' => $r['broken_dependency'],
    'manual_review' => $r['manual_review'],
], $records);

$stats = [
    'total_records' => count($records),
    'total_dependencies' => count($edges),
    'dependency_statistics' => ['by_type' => $depTypeStats, 'by_level' => $depLevelStats,
        'record_dependency_level' => $cnt($records, 'dependency_level')],
    'reuse_statistics' => ['by_level' => $cnt($records, 'reuse_level'),
        'by_relationship' => $cnt($reuseRecords, 'reuse_relationship')],
    'impact_statistics' => $cnt($records, 'impact_level'),
    'layer_statistics' => $cnt($records, 'layer'),
    'circular_dependency_count' => count($cycles),
    'broken_dependency_count' => count($broken),
    'reuse_candidate_count' => $reuseCandidates,
    'global_reuse_count' => $globalReuse,
    'module_reuse_count' => $moduleReuse,
    'manual_review_count' => $review,
    'absent_reuse_levels' => ['WORKSPACE', 'PROJECT'],
    'absent_reuse_levels_reason' =>
        'ST07 NavigationContext::ABSENT_AXES 가 확인한 대로 이 저장소에는 Workspace·Project 엔티티와 '
        . '멤버십 행이 존재하지 않는다. 두 등급이 0 인 것은 분석 누락이 아니라 축 자체의 부재다',
];

$now = gmdate('c');
$head = ['specification_id' => SPEC_ID, 'schema_version' => SCHEMA_VERSION,
    'source_revisions' => $nrmDoc['source_revisions'] ?? [], 'generated_at' => $now];

$w = static function (string $rel, array $d) use ($ROOT): void {
    $n = str_replace('\\', '/', $rel);
    if (str_contains($n, '..') || !str_starts_with($n, 'tools/cwis/navigation/output/')) {
        fwrite(STDERR, "[ST09] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    file_put_contents("$ROOT/$n", json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST09] 생성: $rel\n";
};

$w("$IN/favorites-dependency-map.json", $head + [
    'record_count' => count($records), 'dependency_count' => count($edges),
    'records' => $records, 'dependencies' => $edges,
    'circular_dependencies' => array_map(static fn($c) => ['path' => $c], $cycles),
    'broken_dependencies' => $broken]);
$w("$IN/favorites-reuse-map.json", $head + [
    'record_count' => count($reuseRecords), 'reuse' => $reuseRecords]);
$w("$IN/favorites-impact-map.json", $head + [
    'record_count' => count($impactRecords), 'impact' => $impactRecords]);
$w("$IN/favorites-dependency-summary.json", $head + $stats);

printf("[ST09] 레코드 %d · 의존 %d · 순환 %d · 끊김 %d · 재사용후보 %d(GLOBAL %d/MODULE %d) · 수동검토 %d\n",
    count($records), count($edges), count($cycles), count($broken),
    $reuseCandidates, $globalReuse, $moduleReuse, $review);
echo '       Layer: ' . json_encode($stats['layer_statistics'], JSON_UNESCAPED_UNICODE) . "\n";
echo '       Reuse: ' . json_encode($stats['reuse_statistics']['by_level'], JSON_UNESCAPED_UNICODE) . "\n";
echo '       Impact: ' . json_encode($stats['impact_statistics'], JSON_UNESCAPED_UNICODE) . "\n";
exit(0);
