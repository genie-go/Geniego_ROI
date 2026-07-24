<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST08 — Existing Implementation Classification.
 *
 * ST07 정규화 레코드를 증거 기반으로 11종 Classification 중 정확히 하나로 분류한다.
 *
 * ★설계 원칙 — 추측 금지
 *   1. 증거 없는 DIRECT 는 만들지 않는다. DIRECT 는 명세 12종 증거축 중 **2종 이상**을 요구한다.
 *   2. `RAW_MATCH`(단순 키워드 히트)는 어떤 증거축도 아니다. ST07 이 붙인
 *      DIRECT_IMPLEMENTATION_CANDIDATE 22건은 **전부 RAW_MATCH** 였으므로 승계하지 않고 재판정한다.
 *   3. 증거는 개별 레코드가 아니라 **기능 클러스터** 단위로 모은다. 훅 하나·컴포넌트 하나가
 *      각각 고립돼 있으면 영원히 증거 1종이라 DIRECT 가 나올 수 없다.
 *   4. 판단 못 하면 UNKNOWN. 0 이나 그럴듯한 값으로 채우지 않는다.
 *
 * ★무결성: 입력 읽기 전용 · 운영 코드 변경 0 · DB/네트워크 0 · 결정적 출력.
 *
 * 사용: php tools/cwis/navigation/scripts/classify-favorites-implementations.php
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST08';
const SCHEMA_VERSION = '1.0.0';

$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST08] 루트 탐지 실패\n"); exit(2); }
$IN = 'tools/cwis/navigation/output';
$OUT = $IN;

$load = static function (string $f) use ($ROOT, $IN) {
    $p = "$ROOT/$IN/$f";
    if (!is_file($p)) { fwrite(STDERR, "[ST08] 필수 입력 없음: $IN/$f\n"); exit(2); }
    return json_decode((string)file_get_contents($p), true, 512, JSON_THROW_ON_ERROR);
};
$recDoc  = $load('favorites-normalized-records.json');
$relDoc  = $load('favorites-normalized-relationships.json');
$cflDoc  = $load('favorites-normalization-conflicts.json');
$statDoc = $load('favorites-normalization-statistics.json');
$aliDoc  = $load('favorites-normalization-aliases.json');
$excDoc  = $load('favorites-normalization-exclusions.json');

$records = $recDoc['records'];
$rels    = $relDoc['relationships'];
$byId    = [];
foreach ($records as $i => $r) $byId[$r['normalized_id']] = $i;

/* 관계 인덱스 — 클러스터 증거 수집과 참조 존재 판정에 쓴다. */
$relFrom = []; $relTo = [];
foreach ($rels as $x) {
    $relFrom[$x['from_normalized_id']][] = $x;
    $relTo[$x['to_normalized_id']][] = $x;
}
$conflictKeys = [];
foreach ($cflDoc['conflicts'] as $c) {
    foreach ((array)($c['normalized_ids'] ?? []) as $nid) $conflictKeys[$nid] = $c;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 1. 기능 클러스터 정의 — 증거는 클러스터 단위로 모은다
 *
 * ★클러스터 경계는 지어내지 않고 ST02~ST07 산출물이 실제로 지목한 파일로만 만든다.
 * ══════════════════════════════════════════════════════════════════════════ */
$CLUSTERS = [
    'sidebar-favorites' => [
        'label' => '사이드바 메뉴 즐겨찾기',
        'scope' => 'PRIMARY',          // 본 Unit 이 말하는 그 즐겨찾기
        'files' => ['frontend/src/layout/Sidebar.jsx', 'frontend/src/layout/sidebarMenuLabels.js'],
        'name_re' => '/favou?rite|즐겨찾기|quickaccess|g_sidebar_favs/i',
    ],
    'casestudy-bookmark' => [
        'label' => '성공사례 북마크',
        'scope' => 'SIBLING',          // 다른 리소스에 적용된 동일 UX 패턴
        'files' => ['frontend/src/pages/CaseStudy.jsx'],
        'name_re' => '/bookmark|북마크|case_bookmarks/i',
    ],
    'saved-report' => [
        'label' => '저장된 리포트(BI)',
        // ★즐겨찾기가 아니다. ST07 Alias 가 이미 auto_replace=false 로 판정했다 —
        //   "saved_report 는 BI 리포트 정의 저장이라 즐겨찾기와 의미가 다르다".
        //   구현 선례로서의 가치만 있으므로 UNRELATED_PRECEDENT 로 분리한다.
        'scope' => 'UNRELATED_PRECEDENT',
        'files' => ['backend/src/routes.php', 'backend/src/Handlers/Reports.php'],
        'name_re' => '#saved[_ ]?report|/reports/saved#i',
    ],
];

/* 파일→클러스터 역인덱스 */
$fileCluster = [];
foreach ($CLUSTERS as $cid => $c) foreach ($c['files'] as $f) $fileCluster[strtolower($f)] = $cid;

$clusterOf = static function (array $r) use ($fileCluster, $CLUSTERS): ?string {
    foreach ($r['source_files'] ?? [] as $f) {
        $cid = $fileCluster[strtolower($f)] ?? null;
        if ($cid === null) continue;
        // 같은 파일 안에 여러 기능이 있으므로 이름/키까지 일치해야 클러스터 소속으로 본다.
        $hay = $r['canonical_key'] . ' ' . $r['canonical_name'] . ' ' . json_encode($r['attributes'], JSON_UNESCAPED_UNICODE);
        if (preg_match($CLUSTERS[$cid]['name_re'], $hay) === 1) return $cid;
    }
    return null;
};

/* ══════════════════════════════════════════════════════════════════════════
 * 2. 증거축 추출 (명세 12종) — 레코드 하나가 어떤 축의 증거인지 판정
 * ══════════════════════════════════════════════════════════════════════════ */
$AXES = ['CONTROLLER','SERVICE','REPOSITORY','ENTITY','MIGRATION','ROUTE',
         'REQUEST','RESPONSE','POLICY','COMPONENT','STORE','API'];

$axisOf = static function (array $r): ?string {
    $a = $r['attributes'] ?? [];
    switch ($r['entity_type']) {
        case 'API_ENDPOINT':      return 'ROUTE';
        case 'API_CONTROLLER':    return 'CONTROLLER';
        case 'API_REQUEST':       return 'REQUEST';
        case 'API_RESPONSE':      return 'RESPONSE';
        case 'MIDDLEWARE':        return 'POLICY';
        case 'DATABASE_TABLE':    return 'ENTITY';
        case 'MIGRATION':         return 'MIGRATION';
        case 'COMPONENT':         return 'COMPONENT';
        case 'ORM_MAPPING':       return 'REPOSITORY';
        case 'STATE_UNIT':
            // Hook/Store/Slice = STORE 축. API Client 는 API 축.
            return ($a['state_type'] ?? '') === 'API_CLIENT' ? 'API' : 'STORE';
        case 'SYMBOL':
            $n = strtolower($r['canonical_name']);
            if (str_contains($n, 'repository')) return 'REPOSITORY';
            if (str_contains($n, 'service'))    return 'SERVICE';
            if (str_contains($n, 'policy'))     return 'POLICY';
            if (($a['symbol_type'] ?? '') === 'METHOD' || !empty($a['controller'])) return 'CONTROLLER';
            return null;
        default:
            return null;   // ★RAW_MATCH·FILE·PACKAGE·TEST 등은 증거축이 아니다
    }
};

/* 클러스터별 증거 집계 */
$clusterAxes = []; $clusterMembers = [];
foreach ($records as $r) {
    $cid = $clusterOf($r);
    if ($cid === null) continue;
    $clusterMembers[$cid][] = $r['normalized_id'];
    $ax = $axisOf($r);
    if ($ax !== null) $clusterAxes[$cid][$ax][] = $r['normalized_id'];
}

/* 클러스터 판정 — DIRECT vs PARTIAL */
$SERVER_AXES = ['ROUTE', 'CONTROLLER', 'MIGRATION', 'ENTITY', 'REPOSITORY', 'SERVICE'];
$clusterVerdict = [];
foreach ($CLUSTERS as $cid => $c) {
    $axes = array_keys($clusterAxes[$cid] ?? []);
    sort($axes);
    $server = array_values(array_intersect($axes, $SERVER_AXES));
    $client = array_values(array_diff($axes, $SERVER_AXES));
    // ★즐겨찾기와 무관한 선례 클러스터는 구현 완성도와 무관하게 오탐으로 분리한다(ST07 Alias 판정 승계).
    if (($c['scope'] ?? '') === 'UNRELATED_PRECEDENT') {
        $clusterVerdict[$cid] = ['verdict' => 'FALSE_POSITIVE', 'scope' => $c['scope'],
            'axes' => $axes, 'server_axes' => $server, 'client_axes' => $client,
            'reason' => '즐겨찾기 기능이 아니다 — ST07 Alias 가 auto_replace=false 로 판정한 별개 의미. '
                . '단 증거축 ' . count($axes) . '종(' . implode(',', $axes) . ')을 갖춘 '
                . '**사용자 저장 리소스의 최근접 구현 선례**이므로 ST09 재사용 매핑에서 참조 가치가 있다',
            'members' => count($clusterMembers[$cid] ?? []), 'evidence_ids' => $clusterAxes[$cid] ?? []];
        continue;
    }
    if (count($axes) >= 2 && $server !== [] && $client !== []) {
        $v = 'DIRECT_IMPLEMENTATION';
        $why = '증거축 ' . count($axes) . '종(' . implode(',', $axes) . ') — 서버·클라이언트 양측 존재';
    } elseif (count($axes) >= 1) {
        $v = 'PARTIAL_IMPLEMENTATION';
        $missing = $server === [] ? '서버 지속화 계층(Route/Controller/Migration/Table) 전무'
                                  : '클라이언트 계층(Component/Store) 전무';
        $why = '증거축 ' . count($axes) . '종(' . implode(',', $axes) . ') — ' . $missing;
    } else {
        $v = 'UNKNOWN';
        $why = '증거축 0종 — 판정 불가';
    }
    $clusterVerdict[$cid] = ['verdict' => $v, 'scope' => $c['scope'] ?? 'PRIMARY',
        'axes' => $axes, 'server_axes' => $server,
        'client_axes' => $client, 'reason' => $why,
        'members' => count($clusterMembers[$cid] ?? []),
        'evidence_ids' => $clusterAxes[$cid] ?? []];
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. 레코드 단위 분류
 * ══════════════════════════════════════════════════════════════════════════ */
$SHARED_INFRA_RE = '/audit|permission|cache|queue|event|notif|search|auth|rbac|gate|tenant|middleware|rate_?limit|cors/i';
$REUSABLE_RE     = '/hook|composable|trait|helper|factory|utility|util|interface|provider|context/i';
$DOC_RE          = '#(^|/)docs?/|\.md$|readme|openapi|swagger#i';

$out = []; $summary = []; $needReview = 0;

foreach ($records as $r) {
    $id   = $r['normalized_id'];
    $et   = $r['entity_type'];
    $a    = $r['attributes'] ?? [];
    $files = $r['source_files'] ?? [];
    $firstFile = $files[0] ?? '';
    $cid  = $clusterOf($r);
    $ev   = [];   // classification_evidence
    $cls = null; $reason = null; $conf = 'UNKNOWN'; $review = false;

    // 증거 수집(모든 분류가 최소 1개 이상 보유해야 한다)
    foreach (array_slice($r['source_record_ids'] ?? [], 0, 6) as $sid)
        $ev[] = ['type' => 'source_record_id', 'value' => $sid];
    foreach (array_slice($files, 0, 4) as $f)
        $ev[] = ['type' => 'reference', 'value' => $f];
    foreach (array_slice($relFrom[$id] ?? [], 0, 4) as $x)
        $ev[] = ['type' => 'relationship', 'value' => $x['relationship_type'] . ' → ' . $x['to_normalized_id']];
    // ★인바운드 관계도 증거다. 미들웨어처럼 "자신은 아무것도 가리키지 않지만
    //   여러 라우트가 자신을 PROTECTED_BY 로 가리키는" 레코드는 아웃바운드만 보면 증거 0이 된다.
    foreach (array_slice($relTo[$id] ?? [], 0, 4) as $x)
        $ev[] = ['type' => 'relationship', 'value' => $x['from_normalized_id'] . ' → ' . $x['relationship_type'] . ' (inbound)'];
    // ST07 이 남긴 원본 근거(파일·라인·해시)도 증거로 승계한다.
    foreach (array_slice($r['evidence_refs'] ?? [], 0, 3) as $e)
        $ev[] = ['type' => 'reference', 'value' => ($e['evidence_type'] ?? 'EVIDENCE') . ' @ ' . ($e['source_file'] ?? '?')
            . (($e['line_number'] ?? 0) > 0 ? ':' . $e['line_number'] : '')];
    if (!empty($a['controller'])) $ev[] = ['type' => 'controller', 'value' => $a['controller'] . '::' . ($a['action'] ?? '?')];
    if ($et === 'API_ENDPOINT')   $ev[] = ['type' => 'route', 'value' => $a['http_method'] . ' ' . ($a['display_uri'] ?? '')];
    if ($et === 'MIGRATION')      $ev[] = ['type' => 'migration', 'value' => $r['canonical_name']];
    if ($et === 'SYMBOL')         $ev[] = ['type' => 'symbol', 'value' => $r['canonical_name']];

    /* ── 우선순위 1: 충돌 ─────────────────────────────────────────────── */
    if (isset($conflictKeys[$id]) || $r['status'] === 'CONFLICTING'
        || in_array($r['tenant_scope'], ['CONFLICTING'], true)) {
        $c = $conflictKeys[$id] ?? null;
        $cls = 'CONFLICTING'; $conf = 'HIGH'; $review = true;
        $reason = $c ? "ST07 충돌 {$c['conflict_id']}({$c['conflict_type']}): " . implode(' ', $c['notes'] ?? [])
                     : '레코드 내 근거 상충(status/scope CONFLICTING)';
        if ($c) $ev[] = ['type' => 'reference', 'value' => $c['conflict_id']];
    }
    /* ── 우선순위 2: 명시적 오탐 ──────────────────────────────────────── */
    elseif ($r['classification'] === 'FALSE_POSITIVE_CANDIDATE' || !empty($a['ignore_reason'])
            || !empty($a['sql_keyword_false_positive']) || !empty($a['self_reference'])) {
        $cls = 'FALSE_POSITIVE'; $conf = 'HIGH';
        $reason = !empty($a['sql_keyword_false_positive'])
            ? "상류 파서가 SQL 키워드 '{$r['canonical_name']}' 를 테이블명으로 추출(실재하지 않음)"
            : (!empty($a['self_reference'])
                ? 'CWIS 자체 산출물에 대한 자기 참조'
                : ('상류 오탐 판정: ' . ((string)($a['ignore_reason'] ?? '즐겨찾기와 무관한 키워드 일치'))));
    }
    /* ── 우선순위 3: 패키지 ───────────────────────────────────────────── */
    elseif ($et === 'PACKAGE' || $et === 'DEPENDENCY_USAGE') {
        $cls = 'PACKAGE_ONLY'; $conf = 'HIGH';
        $reason = $et === 'PACKAGE'
            ? '외부 ' . ((string)($a['ecosystem'] ?? '')) . ' 패키지 선언(' . $r['canonical_name']
              . ', ' . ((string)($a['dependency_type'] ?? 'unknown')) . ') — 즐겨찾기 구현이 아니라 의존성'
            : '외부 패키지 ' . ((string)($a['package_name'] ?? '?')) . ' 의 사용처 — '
              . ($firstFile !== '' ? $firstFile : '파일 불명')
              . ' 에서 ' . ((int)($a['usage_occurrences'] ?? 1)) . '회 '
              . ((string)($a['usage_type'] ?? 'import')) . '. 즐겨찾기 구현 아님';
        if (($a['usage_status'] ?? '') === 'DECLARED_NOT_FOUND') {
            $reason .= ' — 선언되었으나 전 소스에서 사용처 0건';
            $review = true;
        }
    }
    /* ── 우선순위 4: 테스트 ───────────────────────────────────────────── */
    elseif (in_array($et, ['TEST_CASE', 'TEST_ASSET', 'CI_JOB'], true)) {
        $cls = 'TEST_ONLY'; $conf = 'HIGH';
        $reason = match ($et) {
            'TEST_CASE'  => '테스트 케이스(' . ((string)($a['test_framework'] ?? '')) . '/'
                            . ((string)($a['test_type'] ?? '')) . ') @ ' . ($firstFile !== '' ? $firstFile : '?')
                            . ' — 즐겨찾기 대상 ' . (!empty($a['favorites_related']) ? '있음' : '아님')
                            . ', 피검증 소스 연결 ' . ((string)($a['source_link_status'] ?? 'UNKNOWN_REFERENCE')),
            'TEST_ASSET' => '테스트 자산(' . ((string)($a['asset_type'] ?? '')) . ')'
                            . (!empty($a['reusable_candidate']) ? ' — 재사용 가능 후보' : ''),
            default      => 'CI 파이프라인 테스트 잡(' . ((string)($a['provider'] ?? 'UNKNOWN')) . ') — '
                            . ($firstFile !== '' ? $firstFile : '워크플로 파일 불명') . ', 실행 명령 '
                            . count((array)($a['commands'] ?? [])) . '건'
                            . (empty($a['favorites_specific']) ? '. 즐겨찾기 전용 잡 아님' : ''),
        };
    }
    /* ── 우선순위 5: 문서 ─────────────────────────────────────────────── */
    elseif ($firstFile !== '' && preg_match($DOC_RE, $firstFile) === 1) {
        $cls = 'DOCUMENTATION_ONLY'; $conf = 'HIGH';
        $reason = '문서·명세 파일(' . $firstFile . ')';
    }
    /* ── 우선순위 6: 기능 클러스터 소속 → 클러스터 판정 승계 ───────────── */
    elseif ($cid !== null) {
        $cv = $clusterVerdict[$cid];
        $ax = $axisOf($r);
        if ($ax !== null) {
            $cls = $cv['verdict']; $conf = 'HIGH';
            $reason = "[{$CLUSTERS[$cid]['label']}] {$ax} 증거. 클러스터 판정: {$cv['reason']}";
            $ev[] = ['type' => 'reference', 'value' => "cluster:$cid axes=" . implode(',', $cv['axes'])];
        } else {
            // 같은 클러스터의 RAW_MATCH·FILE — 구현 자체가 아니라 구현이 있는 위치의 근거
            $cls = $cv['verdict']; $conf = 'MEDIUM';
            $reason = "[{$CLUSTERS[$cid]['label']}] 구현 파일 내 근거(증거축 아님). 클러스터 판정: {$cv['reason']}";
            $ev[] = ['type' => 'reference', 'value' => "cluster:$cid"];
        }
        if ($cv['verdict'] === 'PARTIAL_IMPLEMENTATION') $review = true;
    }
    /* ── 우선순위 6-B: 분석 산출물(Gap/Risk) — 대응 분류 없음을 정직하게 명시 ─── */
    elseif (in_array($et, ['GAP_CANDIDATE', 'RISK_CANDIDATE'], true)) {
        $cls = 'UNKNOWN'; $conf = 'UNKNOWN'; $review = true;
        $reason = '분석 산출물(' . ((string)($a['gap_type'] ?? $a['risk_type'] ?? $et)) . ')이며 '
            . '명세 11종 분류 중 대응 항목이 없다 — 구현물이 아니므로 억지로 배정하지 않고 UNKNOWN 유지. '
            . 'ST10 Gap 분석의 직접 입력이다';
    }
    /* ── 우선순위 7: 공통 인프라 ──────────────────────────────────────── */
    //   ★키워드 정규식은 FILE 에 적용하지 않는다. FILE 은 경로 문자열이라
    //     `frontend/_audit.cjs`(일회성 스크립트)가 'audit' 로, 셀프테스트가 'context' 로
    //     오분류된다. FILE 은 3-B 자식 전파 또는 UNKNOWN 으로 처리한다.
    elseif ($et === 'MIDDLEWARE'
            || ($et === 'DATABASE_TABLE' && $r['status'] !== 'ORPHANED')
            || ($et !== 'FILE' && preg_match($SHARED_INFRA_RE, $r['canonical_name'] . ' ' . $r['canonical_key']) === 1)) {
        $cls = 'SHARED_INFRASTRUCTURE'; $conf = 'HIGH';
        $reason = $et === 'MIDDLEWARE'
            ? ('인증·권한 게이트(' . ((string)($a['gate_type'] ?? $a['implementation'] ?? 'MIDDLEWARE')) . ') — 즐겨찾기 전용이 아니라 전 API 공통')
            : '즐겨찾기 외 도메인과 공유하는 공통 기능';
        if (!empty($a['external_principal_deny'])) {
            $reason .= '. ★외부 협업자(guest/partner) Default Deny 적용 지점';
            $review = true;
        }
    }
    /* ── 우선순위 8: 재사용 가능 요소 ─────────────────────────────────── */
    elseif (in_array($et, ['COMPONENT', 'STATE_UNIT'], true)
            || (!in_array($et, ['FILE', 'RAW_MATCH'], true)
                && preg_match($REUSABLE_RE, $r['canonical_name']) === 1)) {
        $cls = 'REUSABLE_COMPONENT'; $conf = 'MEDIUM';
        $reason = '재사용 가능 UI·상태 요소(' . ((string)($a['state_type'] ?? $a['component_type'] ?? $et)) . ')';
    }
    /* ── 우선순위 9: 고아 레코드 ──────────────────────────────────────────
     * ★ORPHANED 를 곧바로 LEGACY 로 읽으면 안 된다. ST07 의 ORPHANED 는
     *   "즐겨찾기 인벤토리에서 상위 항목을 못 찾음"이라는 **검색 스코프의 산물**이지
     *   미사용 증거가 아니다. menu_tree·coupon_redemptions 는 현역 테이블이다.
     *   명세의 LEGACY 조건(Route 없음·Import 없음·Reference 없음)을 실제로
     *   입증할 수 있을 때만 LEGACY 를 준다.
     * ───────────────────────────────────────────────────────────────────── */
    elseif ($r['status'] === 'ORPHANED') {
        $inbound = count($relTo[$id] ?? []);
        if (($a['discovered_via'] ?? '') === 'migration_only') {
            // 마이그레이션이 참조할 뿐 즐겨찾기 인벤토리 대상이 아닌 테이블 = 스코프 밖
            $cls = 'FALSE_POSITIVE'; $conf = 'HIGH';
            $reason = '즐겨찾기 검색 스코프 밖의 테이블 — 마이그레이션이 참조해 딸려 들어왔을 뿐이다. '
                . 'ORPHANED 는 "즐겨찾기 테이블 인벤토리에 없음"이라는 뜻이지 미사용 증거가 아니며, '
                . '이 테이블의 실사용 여부는 본 Task 범위에서 조사하지 않았다';
        } elseif (($a['controller_file_exists'] ?? null) === false) {
            // 라우트가 존재하지 않는 컨트롤러 파일을 가리킴 = 실제 참조 단절 증거
            $cls = 'LEGACY_IMPLEMENTATION'; $conf = 'MEDIUM'; $review = true;
            $reason = '라우트가 가리키는 컨트롤러 파일이 저장소에 존재하지 않는다 — 참조 단절 실증';
        } else {
            $cls = 'UNKNOWN'; $conf = 'UNKNOWN'; $review = true;
            $reason = "고아 레코드(inbound 관계 {$inbound}건)이나 LEGACY 판정에 필요한 "
                . '미사용 증거(Route·Import·Reference 부재 또는 Deprecated 표시)를 확보하지 못했다 — '
                . '추측하지 않고 UNKNOWN 유지. ' . ((string)($r['normalization_notes'][0] ?? ''));
        }
    }
    /* ── 우선순위 10: 증거 부족 ───────────────────────────────────────── */
    else {
        $cls = 'UNKNOWN'; $conf = 'UNKNOWN';
        $reason = $et === 'RAW_MATCH'
            ? '단순 키워드 일치일 뿐 구현 증거축(Controller/Service/Repository/Entity/Migration/Route/Request/Response/Policy/Component/Store/API) 어디에도 해당하지 않음'
            : '분류를 확정할 증거 부족 — 추측하지 않고 UNKNOWN 유지';
    }

    // ★증거 없는 DIRECT 는 존재할 수 없다(검증 실패 조건). 방어적으로 강등한다.
    if ($cls === 'DIRECT_IMPLEMENTATION' && $ev === []) {
        $cls = 'UNKNOWN'; $conf = 'UNKNOWN'; $review = true;
        $reason = '증거가 비어 DIRECT 성립 불가 — UNKNOWN 강등';
    }

    if ($review) $needReview++;
    $summary[$cls] = ($summary[$cls] ?? 0) + 1;

    $out[] = [
        'normalized_id' => $id,
        'entity_type' => $et,
        'canonical_key' => $r['canonical_key'],
        'canonical_name' => $r['canonical_name'],
        'source_domain' => $r['source_domain'],
        'source_files' => $files,
        'feature_cluster' => $cid,
        'evidence_axis' => $axisOf($r),
        'classification' => $cls,
        'classification_reason' => $reason,
        'classification_evidence' => $ev,
        'confidence' => $conf,
        'manual_review' => $review,
        'upstream_classification' => $r['classification'],
    ];
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3-B. 2차 패스 — FILE 레코드를 자식 합의로 전파 분류
 *
 * ★추측이 아니다. FILE 은 그 자체로 증거축이 아니라 **다른 레코드의 컨테이너**다.
 *   컨테이너 안의 레코드가 전부 같은 판정이면 컨테이너도 그 판정이다.
 *   합의가 갈리면 UNKNOWN 을 유지한다(다수결로 밀어붙이지 않는다).
 * ══════════════════════════════════════════════════════════════════════════ */
$outById = [];
foreach ($out as $i => $o) $outById[$o['normalized_id']] = $i;

// FILE → 그 파일에 DEFINED_IN 으로 들어오는 자식들
$children = [];
foreach ($rels as $x) {
    if ($x['relationship_type'] !== 'DEFINED_IN') continue;
    $children[$x['to_normalized_id']][] = $x['from_normalized_id'];
}
/* 3-B-1. MIGRATION → 자신이 CREATES/ALTERS/DROPS 하는 테이블의 판정에서 파생.
   ★"마이그레이션이 즐겨찾기와 무관하다"를 감으로 정하지 않고, 그것이 만든 테이블이
     무엇으로 판정됐는지를 근거로 삼는다. */
$outByIdTmp = [];
foreach ($out as $i => $o) $outByIdTmp[$o['normalized_id']] = $i;
$migDerived = 0;
foreach ($out as $i => $o) {
    if ($o['entity_type'] !== 'MIGRATION' || $o['classification'] !== 'UNKNOWN') continue;
    $tables = [];
    foreach ($relFrom[$o['normalized_id']] ?? [] as $x) {
        if (!in_array($x['relationship_type'], ['CREATES', 'ALTERS', 'DROPS', 'RENAMES'], true)) continue;
        $j = $outByIdTmp[$x['to_normalized_id']] ?? null;
        if ($j !== null) $tables[$out[$j]['classification']][] = $out[$j]['canonical_name'];
    }
    if ($tables === []) continue;
    $verdict = count($tables) === 1 ? array_key_first($tables)
        : (isset($tables['SHARED_INFRASTRUCTURE']) ? 'SHARED_INFRASTRUCTURE' : null);
    if ($verdict === null
        || !in_array($verdict, ['SHARED_INFRASTRUCTURE', 'FALSE_POSITIVE', 'LEGACY_IMPLEMENTATION'], true)) continue;
    $names = array_slice(array_merge(...array_values($tables)), 0, 4);
    $summary[$o['classification']]--; $summary[$verdict] = ($summary[$verdict] ?? 0) + 1;
    $out[$i]['classification'] = $verdict;
    $out[$i]['confidence'] = 'MEDIUM';
    $out[$i]['classification_reason'] = '이 마이그레이션이 다루는 테이블(' . implode(', ', $names)
        . ')이 전부 ' . $verdict . ' 로 판정되어 마이그레이션도 동일 판정. 즐겨찾기 전용 스키마 아님';
    $out[$i]['classification_evidence'][] = ['type' => 'migration',
        'value' => 'affects ' . implode(',', $names) . ' → all ' . $verdict];
    $migDerived++;
}

$propagated = 0;
foreach ($out as $i => $o) {
    if ($o['entity_type'] !== 'FILE' || $o['classification'] !== 'UNKNOWN') continue;
    $kids = $children[$o['normalized_id']] ?? [];
    if ($kids === []) continue;
    $kidCls = [];
    foreach ($kids as $k) {
        $j = $outById[$k] ?? null;
        if ($j === null) continue;
        $kidCls[$out[$j]['classification']] = true;
    }
    unset($kidCls['UNKNOWN']);
    if (count($kidCls) !== 1) continue;      // 합의 없음 → UNKNOWN 유지
    $verdict = array_key_first($kidCls);
    // 컨테이너에 부여해도 의미가 유지되는 판정만 전파한다.
    if (!in_array($verdict, ['FALSE_POSITIVE', 'PACKAGE_ONLY', 'TEST_ONLY', 'DOCUMENTATION_ONLY'], true)) continue;
    $summary[$o['classification']]--; $summary[$verdict] = ($summary[$verdict] ?? 0) + 1;
    $out[$i]['classification'] = $verdict;
    $out[$i]['confidence'] = 'MEDIUM';
    $out[$i]['classification_reason'] = '컨테이너 파일 — 내부 레코드 ' . count($kids)
        . '건이 예외 없이 ' . $verdict . ' 로 판정되어 파일 전체를 동일 판정으로 전파(합의 불일치 시 UNKNOWN 유지 규칙)';
    $out[$i]['classification_evidence'][] = ['type' => 'relationship',
        'value' => 'CONTAINS ' . count($kids) . ' children, all ' . $verdict];
    $propagated++;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. 출력
 * ══════════════════════════════════════════════════════════════════════════ */
$ALL_CLASSES = ['DIRECT_IMPLEMENTATION','PARTIAL_IMPLEMENTATION','SHARED_INFRASTRUCTURE',
    'REUSABLE_COMPONENT','LEGACY_IMPLEMENTATION','TEST_ONLY','PACKAGE_ONLY',
    'DOCUMENTATION_ONLY','FALSE_POSITIVE','CONFLICTING','UNKNOWN'];
foreach ($ALL_CLASSES as $c) $summary[$c] = $summary[$c] ?? 0;
$ordered = [];
foreach ($ALL_CLASSES as $c) $ordered[$c] = $summary[$c];

$byConf = []; $byAxis = [];
foreach ($out as $o) {
    $byConf[$o['confidence']] = ($byConf[$o['confidence']] ?? 0) + 1;
    if ($o['evidence_axis']) $byAxis[$o['evidence_axis']] = ($byAxis[$o['evidence_axis']] ?? 0) + 1;
}
ksort($byConf); ksort($byAxis);

$now = gmdate('c');
$head = ['specification_id' => SPEC_ID, 'schema_version' => SCHEMA_VERSION,
    'source_revisions' => $recDoc['source_revisions'] ?? [], 'generated_at' => $now];

$w = static function (string $rel, array $d) use ($ROOT): void {
    $n = str_replace('\\', '/', $rel);
    if (str_contains($n, '..') || !str_starts_with($n, 'tools/cwis/navigation/output/')) {
        fwrite(STDERR, "[ST08] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    file_put_contents("$ROOT/$n", json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST08] 생성: $rel\n";
};

$w("$OUT/favorites-classification.json", $head + [
    'total_records' => count($out), 'classifications' => $out]);

$w("$OUT/favorites-classification-summary.json", $head + [
    'total_records' => count($out),
    'by_classification' => $ordered,
    'by_confidence' => $byConf,
    'by_evidence_axis' => $byAxis,
    'manual_review_required' => $needReview,
    'file_records_propagated' => $propagated,
    'migration_records_derived' => $migDerived,
    'feature_clusters' => $clusterVerdict,
    'inputs' => [
        'normalized_records' => count($records),
        'relationships' => count($rels),
        'conflicts' => count($cflDoc['conflicts']),
        'aliases' => count($aliDoc['aliases']),
        'exclusions' => count($excDoc['exclusions']),
    ],
    'upstream_direct_candidates_reclassified' => count(array_filter($out,
        static fn($o) => $o['upstream_classification'] === 'DIRECT_IMPLEMENTATION_CANDIDATE'
                      && $o['classification'] !== 'DIRECT_IMPLEMENTATION')),
]);

printf("[ST08] 레코드 %d · %s · 수동검토 %d\n", count($out),
    implode(' ', array_map(static fn($k, $v) => "$k=$v", array_keys($ordered), $ordered)), $needReview);
foreach ($clusterVerdict as $cid => $cv)
    printf("       [%s] %s — %s\n", $cid, $cv['verdict'], $cv['reason']);
exit(0);
