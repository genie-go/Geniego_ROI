<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST07 — Search Result Normalization.
 *
 * ST02~ST06 이 만든 31개 산출물을 하나의 공통 스키마로 변환·병합하고
 * 교차계층 관계·충돌·고아·제외를 기록한다.
 *
 * ★결정성(명세 §82): generated_at 을 제외한 출력은 동일 입력에 대해 항상 동일해야 한다.
 *   - 정렬 키 = (entity_type, canonical_key, source_domain, 첫 source_file, 첫 source_record_id)
 *   - 비교는 strcmp(바이너리) — 로케일 비의존
 *   - ID 는 정렬 **후** 부여
 *
 * ★손실 방지(명세 §71·§78): 모든 입력 레코드는 정규화·병합·제외 중 하나로 추적된다.
 *   오탐 후보는 제외하지 않고 FALSE_POSITIVE_CANDIDATE 로 유지한다.
 *
 * ★안전: 입력 파일 수정 0 · DB/네트워크/Boot 0 · 출력은 output|schema 하위 강제.
 *
 * 사용: php tools/cwis/navigation/scripts/normalize-favorites-search-results.php [--dry-run] [--strict]
 * 종료코드: 0=정상, 1=strict 위반, 2=입력/설정 오류.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST07';
const SCHEMA_VERSION = '1.0.0';

$argvv = $argv; array_shift($argvv);
$opt = static function (string $n, ?string $d = null) use ($argvv): ?string {
    foreach ($argvv as $a) {
        if ($a === "--$n") return '1';
        if (str_starts_with($a, "--$n=")) return substr($a, strlen($n) + 3);
    }
    return $d;
};
$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST07] 루트 탐지 실패\n"); exit(2); }

$IN  = rtrim((string)$opt('input-dir', 'tools/cwis/navigation/output'), '/');
$OUT = rtrim((string)$opt('output-dir', 'tools/cwis/navigation/output'), '/');
$SCH = rtrim((string)$opt('schema-dir', 'tools/cwis/navigation/schema'), '/');
$strict = $opt('strict') === '1';
$dryRun = $opt('dry-run') === '1';

$safeWrite = static function (string $rel) use ($ROOT): string {
    $n = str_replace('\\', '/', $rel);
    if (str_contains($n, '..') || $n[0] === '/' || preg_match('#^[A-Za-z]:#', $n)
        || !(str_starts_with($n, 'tools/cwis/navigation/output/') || str_starts_with($n, 'tools/cwis/navigation/schema/'))) {
        fwrite(STDERR, "[ST07] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    return $ROOT . '/' . $n;
};

/* ══════════════════════════════════════════════════════════════════════════
 * 1. 입력 정의 · 로드 · 상태 판정 (명세 §3·§4·§59)
 * ══════════════════════════════════════════════════════════════════════════ */
/** [파일명, 도메인, 필수여부, 레코드 배열 키…] */
$INPUT_DEFS = [
    ['favorites-backend-raw-results.json',            'BACKEND',  true,  ['results']],
    ['favorites-backend-file-inventory.json',         'BACKEND',  false, ['files']],
    ['favorites-backend-symbol-inventory.json',       'BACKEND',  false, ['symbols']],
    ['favorites-frontend-raw-results.json',           'FRONTEND', true,  ['results']],
    ['favorites-frontend-file-inventory.json',        'FRONTEND', false, ['files']],
    ['favorites-frontend-component-inventory.json',   'FRONTEND', false, ['components']],
    ['favorites-frontend-state-inventory.json',       'FRONTEND', false, ['state_units']],
    ['favorites-frontend-api-inventory.json',         'FRONTEND', false, ['api_calls']],
    ['favorites-database-raw-results.json',           'DATABASE', true,  ['results']],
    ['favorites-database-table-inventory.json',       'DATABASE', false, ['tables']],
    ['favorites-database-column-inventory.json',      'DATABASE', false, ['columns']],
    ['favorites-database-constraint-inventory.json',  'DATABASE', false, ['constraints', 'indexes']],
    ['favorites-database-orm-inventory.json',         'DATABASE', false, ['mappings']],
    ['favorites-database-migration-inventory.json',   'DATABASE', false, ['migrations']],
    ['favorites-database-risk-candidates.json',       'DATABASE', false, ['risks']],
    ['favorites-api-raw-results.json',                'API',      true,  ['results']],
    ['favorites-route-inventory.json',                'API',      false, ['routes']],
    ['favorites-api-route-inventory.json',            'API',      false, ['routes']],
    ['favorites-controller-inventory.json',           'API',      false, ['controllers']],
    ['favorites-request-inventory.json',              'API',      false, ['requests']],
    ['favorites-response-inventory.json',             'API',      false, ['responses']],
    ['favorites-middleware-inventory.json',           'API',      false, ['middleware', 'authorization']],
    ['favorites-openapi-inventory.json',              'API',      false, ['operations']],
    ['favorites-test-dependency-raw-results.json',    'TEST',     true,  ['results']],
    ['favorites-test-inventory.json',                 'TEST',     false, ['tests']],
    ['favorites-test-asset-inventory.json',           'TEST',     false, ['assets']],
    ['favorites-test-gap-candidates.json',            'TEST',     false, ['gaps']],
    ['favorites-package-inventory.json',              'PACKAGE',  false, ['packages']],
    ['favorites-package-test-inventory.json',         'PACKAGE',  false, ['packages', 'test_files']],
    ['favorites-dependency-usage-inventory.json',     'PACKAGE',  false, ['usages']],
    ['favorites-ci-test-inventory.json',              'CI',       false, ['jobs']],
];

$inputs = []; $data = []; $inpSeq = 0; $revisions = [];
foreach ($INPUT_DEFS as [$file, $domain, $required, $keys]) {
    $rel = $IN . '/' . $file;
    $abs = $ROOT . '/' . $rel;
    $entry = ['input_id' => sprintf('FAV-INP-%06d', ++$inpSeq), 'domain' => $domain,
        'file_path' => $rel, 'status' => 'MISSING_OPTIONAL', 'source_revision' => null,
        'record_count' => 0, 'schema_version' => null, 'errors' => [], 'warnings' => []];
    if (!is_file($abs)) {
        $entry['status'] = $required ? 'MISSING_REQUIRED' : 'MISSING_OPTIONAL';
        $inputs[] = $entry; continue;
    }
    try {
        $j = json_decode((string)file_get_contents($abs), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        $entry['status'] = 'INVALID_JSON'; $entry['errors'][] = $e->getMessage();
        $inputs[] = $entry; continue;
    }
    if (!is_array($j)) { $entry['status'] = 'SCHEMA_MISMATCH'; $inputs[] = $entry; continue; }
    $n = 0;
    foreach ($keys as $k) { if (isset($j[$k]) && is_array($j[$k])) $n += count($j[$k]); }
    $entry['record_count'] = $n;
    $entry['source_revision'] = $j['source_revision'] ?? null;
    $entry['schema_version'] = $j['schema_version'] ?? null;
    $entry['status'] = $n === 0 ? 'EMPTY_VALID' : 'AVAILABLE';
    if ($entry['source_revision'] !== null) $revisions[$entry['source_revision']] = true;
    $data[$file] = $j;
    $inputs[] = $entry;
}

$coreDomains = ['BACKEND', 'FRONTEND', 'DATABASE', 'API', 'TEST'];
$missingCore = [];
foreach ($INPUT_DEFS as [$file, $domain, $required]) {
    if (!$required) continue;
    foreach ($inputs as $i) {
        if ($i['file_path'] !== $IN . '/' . $file) continue;
        if (in_array($i['status'], ['MISSING_REQUIRED', 'INVALID_JSON', 'UNREADABLE'], true)) $missingCore[] = $domain;
    }
}
$revList = array_keys($revisions);
sort($revList);
$revisionStatus = count($revList) === 0 ? 'MISSING_REVISION' : (count($revList) === 1 ? 'ALL_MATCH' : 'PARTIAL_MATCH');

if (count($missingCore) >= 2) {
    $abs = $safeWrite($OUT . '/favorites-normalization-input-status.json');
    file_put_contents($abs, json_encode(['specification_id' => SPEC_ID, 'status' => 'BLOCKED',
        'reason' => 'CORE_RAW_RESULTS_MISSING', 'missing_core_domains' => $missingCore,
        'revision_status' => $revisionStatus, 'inputs' => $inputs], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    fwrite(STDERR, "[ST07] BLOCKED — 핵심 Raw Result " . count($missingCore) . "개 누락\n");
    exit(2);
}

if ($dryRun) {
    echo "[ST07 --dry-run]\n";
    $byStatus = [];
    foreach ($inputs as $i) $byStatus[$i['status']] = ($byStatus[$i['status']] ?? 0) + 1;
    echo "  입력 파일 : " . count($inputs) . " " . json_encode($byStatus, JSON_UNESCAPED_UNICODE) . "\n";
    echo "  레코드 합 : " . array_sum(array_column($inputs, 'record_count')) . "\n";
    echo "  Revision  : $revisionStatus " . json_encode($revList) . "\n";
    echo "  Strict    : " . ($strict ? 'ON' : 'OFF') . "\n";
    exit(0);
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2. 정규화 유틸
 * ══════════════════════════════════════════════════════════════════════════ */
$excl = []; $sensitiveHits = 0; $sqlKeywordFps = [];

/** 경로 정규화(§11) — 위반 시 null 반환(호출측이 제외 기록). */
$normPath = static function (?string $p): ?string {
    if ($p === null) return null;
    $s = str_replace('\\', '/', trim($p));
    $s = preg_replace('#/+#', '/', $s) ?? $s;
    $s = preg_replace('#^\./#', '', $s) ?? $s;
    if ($s === '' || str_contains($s, '..') || str_contains($s, "\0")) return null;
    if ($s[0] === '/' || preg_match('#^[A-Za-z]:#', $s)) return null;
    return $s;
};
$pathKey = static fn(string $p): string => strtolower($p);

/** 민감정보 재검증(§72). */
$SENSITIVE = [
    '/Bearer\s+[A-Za-z0-9._-]{8,}/i', '/Authorization\s*:\s*\S{8,}/i', '/Cookie\s*:\s*\S{8,}/i',
    '/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/', '/BEGIN (RSA )?PRIVATE KEY/',
    '/DB_PASSWORD\s*=\s*[^\s\[]/', '/DATABASE_URL\s*=\s*[^\s\[]/',
    '/CLIENT_SECRET\s*=\s*[A-Za-z0-9]{8,}/i', '/API_KEY\s*=\s*[A-Za-z0-9]{8,}/i',
    '/[A-Za-z0-9._%+-]+@(?!example\.)[A-Za-z0-9.-]+\.(com|net|org|kr)/',
    '#(/home/[a-z]|/Users/|[A-Za-z]:\\\\Users)#',
];
$scrub = static function ($v) use (&$scrub, $SENSITIVE, &$sensitiveHits) {
    if (is_array($v)) { foreach ($v as $k => $x) $v[$k] = $scrub($x); return $v; }
    if (!is_string($v)) return $v;
    foreach ($SENSITIVE as $re) {
        if (preg_match($re, $v)) { $sensitiveHits++; return '[REDACTED]'; }
    }
    return $v;
};

/** Symbol 이름 정규화(§13). */
$normSymbol = static function (?string $s): ?string {
    if ($s === null) return null;
    $t = trim($s);
    $t = ltrim($t, '\\');
    $t = str_replace('/', '\\', $t);
    $t = preg_replace('#\\\\+#', '\\', $t) ?? $t;
    $t = preg_replace('/\(\s*\)$/', '', $t) ?? $t;
    $t = ltrim($t, '$');
    return $t === '' ? null : $t;
};

/** Endpoint 정규화(§17·§18). */
$normEndpoint = static function (string $uri): array {
    $u = trim($uri);
    $u = preg_replace('#^https?://[^/]+#i', '', $u) ?? $u;
    $u = explode('#', explode('?', $u)[0])[0];
    $u = preg_replace('#/+#', '/', $u) ?? $u;
    if ($u === '' || $u[0] !== '/') $u = '/' . $u;
    if (strlen($u) > 1) $u = rtrim($u, '/');
    // 표시용은 파라미터 이름 보존, 비교용은 {} 로 축약
    $display = preg_replace('/:(\w+)/', '{$1}', $u) ?? $u;
    $compare = preg_replace('/\{[^}]*\}/', '{}', $display) ?? $display;
    return [$display, $compare];
};
$normMethod = static function (?string $m): string {
    $u = strtoupper(trim((string)$m));
    return in_array($u, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'], true) ? $u : 'UNKNOWN';
};

/** Scope 정규화(§37). */
$normScope = static function ($v): string {
    if ($v === true || $v === 1 || $v === '1') return 'YES';
    if ($v === false || $v === 0 || $v === '0') return 'NO';
    $s = strtoupper(trim((string)$v));
    return match ($s) {
        'YES', 'TRUE' => 'YES', 'NO', 'FALSE' => 'NO',
        'NOT_APPLICABLE', 'N/A' => 'NOT_APPLICABLE',
        'CONFLICTING' => 'CONFLICTING',
        default => 'UNKNOWN',
    };
};
/** Confidence 정규화(§38). */
$normConf = static function ($v): string {
    if (is_numeric($v)) { $f = (float)$v; return $f >= 0.8 ? 'HIGH' : ($f >= 0.5 ? 'MEDIUM' : ($f > 0 ? 'LOW' : 'UNKNOWN')); }
    $s = strtoupper(trim((string)$v));
    return in_array($s, ['HIGH', 'MEDIUM', 'LOW'], true) ? $s : 'UNKNOWN';
};
/** Priority 정규화(§39). */
$normPrio = static function ($v): string {
    $s = strtoupper(trim((string)$v));
    return in_array($s, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'IGNORE_CANDIDATE'], true) ? $s : 'UNKNOWN';
};
/** Classification 정규화(§40). */
$CLASS_MAP = [
    'POTENTIAL_BACKEND_IMPLEMENTATION' => 'DIRECT_IMPLEMENTATION_CANDIDATE',
    'POTENTIAL_FRONTEND_IMPLEMENTATION' => 'DIRECT_IMPLEMENTATION_CANDIDATE',
    'POTENTIAL_DATABASE_IMPLEMENTATION' => 'DIRECT_IMPLEMENTATION_CANDIDATE',
    'POTENTIAL_API_IMPLEMENTATION' => 'DIRECT_IMPLEMENTATION_CANDIDATE',
    'POTENTIAL_TEMPLATE_IMPLEMENTATION' => 'DIRECT_IMPLEMENTATION_CANDIDATE',
    'POTENTIAL_RELATED_INFRASTRUCTURE' => 'RELATED_INFRASTRUCTURE_CANDIDATE',
    'POTENTIAL_FRONTEND_INFRASTRUCTURE' => 'RELATED_INFRASTRUCTURE_CANDIDATE',
    'POTENTIAL_REUSABLE_TEST_INFRASTRUCTURE' => 'TEST_ONLY',
    'POTENTIAL_FAVORITES_TEST' => 'TEST_ONLY',
    'POTENTIAL_PACKAGE_DEPENDENCY' => 'PACKAGE_ONLY',
    'POTENTIAL_LEGACY_DATABASE' => 'LEGACY_CANDIDATE',
    'OBVIOUS_FALSE_POSITIVE' => 'FALSE_POSITIVE_CANDIDATE',
    'POTENTIAL_TEST_GAP' => 'GAP_CANDIDATE',
    'DOCUMENTATION_ONLY' => 'DOCUMENTATION_ONLY',
    'UNKNOWN' => 'UNKNOWN',
];
$normClass = static fn(?string $c): string => $CLASS_MAP[strtoupper(trim((string)$c))] ?? 'UNKNOWN';

/** SHA-256 Evidence Hash(§43). */
$evHash = static fn(string ...$parts): string => 'sha256:' . substr(hash('sha256', implode('|', $parts)), 0, 32);

/* ══════════════════════════════════════════════════════════════════════════
 * 3. 레코드 수집 — canonical_key 로 병합
 * ══════════════════════════════════════════════════════════════════════════ */
$recs = [];   // canonical_key => record
$rels = [];   // "type|from|to" => relationship
$conflicts = [];
$aliasHits = [];

$mergeEvents = 0;   // ★실측 병합 횟수(추정값 금지) — 이미 존재하는 canonical_key 에 재기여한 횟수
$put = static function (string $key, string $entityType, string $name, string $domain, array $ext) use (&$recs, &$conflicts, &$mergeEvents, $normScope, $normConf, $normPrio): void {
    if (isset($recs[$key])) $mergeEvents++;
    if (!isset($recs[$key])) {
        $recs[$key] = [
            'entity_type' => $entityType, 'canonical_key' => $key, 'canonical_name' => $name,
            'source_domain' => $domain, 'source_record_ids' => [], 'source_files' => [],
            'source_file_types' => [], 'source_domains' => [], 'source_revisions' => [],
            'classification' => 'UNKNOWN', 'classifications_seen' => [],
            'priority' => 'UNKNOWN', 'priority_sources' => [],
            'confidence' => 'UNKNOWN', 'confidence_sources' => [],
            'status' => 'ACTIVE_CANDIDATE',
            'tenant_scope' => 'UNKNOWN', 'workspace_scope' => 'UNKNOWN', 'project_scope' => 'UNKNOWN',
            'resource_types' => [], 'related_normalized_ids' => [],
            'evidence_refs' => [], 'attributes' => [], 'normalization_notes' => [],
        ];
    } else {
        $r =& $recs[$key];
        if ($r['entity_type'] !== $entityType) {
            $r['normalization_notes'][] = "entity_type 상이: {$r['entity_type']} vs {$entityType}";
        }
        if ($r['source_domain'] !== $domain) {
            $r['attributes']['original_source_domains'][] = $domain;
            $r['source_domain'] = 'CROSS_DOMAIN';
        }
        unset($r);
    }
    $r =& $recs[$key];
    foreach (['source_record_ids', 'source_files', 'source_domains', 'source_revisions', 'evidence_refs', 'resource_types'] as $f) {
        foreach ((array)($ext[$f] ?? []) as $v) {
            if ($v === null || $v === '') continue;
            if (is_array($v)) { $r[$f][] = $v; continue; }
            if (!in_array($v, $r[$f], true)) $r[$f][] = $v;
        }
    }
    if (!in_array($domain, $r['source_domains'], true)) $r['source_domains'][] = $domain;

    // Classification 병합 — 상충 보존
    if (isset($ext['classification'])) {
        $c = $ext['classification'];
        if (!in_array($c, $r['classifications_seen'], true)) $r['classifications_seen'][] = $c;
        $rank = ['DIRECT_IMPLEMENTATION_CANDIDATE' => 5, 'RELATED_INFRASTRUCTURE_CANDIDATE' => 4,
            'LEGACY_CANDIDATE' => 3, 'RISK_CANDIDATE' => 3, 'GAP_CANDIDATE' => 3,
            'TEST_ONLY' => 2, 'PACKAGE_ONLY' => 2, 'DOCUMENTATION_ONLY' => 1,
            'FALSE_POSITIVE_CANDIDATE' => 1, 'UNKNOWN' => 0];
        if (($rank[$c] ?? 0) > ($rank[$r['classification']] ?? 0)) $r['classification'] = $c;
        if (count($r['classifications_seen']) > 1
            && in_array('DIRECT_IMPLEMENTATION_CANDIDATE', $r['classifications_seen'], true)
            && in_array('FALSE_POSITIVE_CANDIDATE', $r['classifications_seen'], true)) {
            $r['status'] = 'CONFLICTING';
        }
    }
    // Priority
    if (isset($ext['priority'])) {
        $p = $normPrio($ext['priority']);
        if (!in_array($p, $r['priority_sources'], true)) $r['priority_sources'][] = $p;
        $pr = ['CRITICAL' => 5, 'HIGH' => 4, 'MEDIUM' => 3, 'LOW' => 2, 'IGNORE_CANDIDATE' => 1, 'UNKNOWN' => 0];
        if (($pr[$p] ?? 0) > ($pr[$r['priority']] ?? 0)) $r['priority'] = $p;
    }
    // Confidence
    if (isset($ext['confidence'])) {
        $c = $normConf($ext['confidence']);
        if (!in_array($c, $r['confidence_sources'], true)) $r['confidence_sources'][] = $c;
        $cr = ['HIGH' => 3, 'MEDIUM' => 2, 'LOW' => 1, 'UNKNOWN' => 0];
        if (($cr[$c] ?? 0) > ($cr[$r['confidence']] ?? 0)) $r['confidence'] = $c;
    }
    foreach (['tenant_scope', 'workspace_scope', 'project_scope'] as $s) {
        if (!isset($ext[$s])) continue;
        $v = $normScope($ext[$s]);
        if ($r[$s] === 'UNKNOWN') { $r[$s] = $v; }
        elseif ($v !== 'UNKNOWN' && $r[$s] !== $v) { $r[$s] = 'CONFLICTING'; }
    }
    if (isset($ext['status'])) $r['status'] = $ext['status'];
    foreach ((array)($ext['attributes'] ?? []) as $k => $v) {
        if (!array_key_exists($k, $r['attributes'])) $r['attributes'][$k] = $v;
    }
    foreach ((array)($ext['notes'] ?? []) as $n) if (!in_array($n, $r['normalization_notes'], true)) $r['normalization_notes'][] = $n;
    unset($r);
};

$addRel = static function (string $type, string $fromKey, string $toKey, string $conf, array $ev = [], array $attrs = [], array $notes = []) use (&$rels): void {
    if ($fromKey === $toKey) return;   // 자기 관계 금지(§76)
    $k = $type . '|' . $fromKey . '|' . $toKey;
    if (!isset($rels[$k])) {
        $rels[$k] = ['relationship_type' => $type, 'from_key' => $fromKey, 'to_key' => $toKey,
            'confidence' => $conf, 'evidence_refs' => [], 'attributes' => $attrs, 'notes' => $notes];
    }
    foreach ($ev as $e) $rels[$k]['evidence_refs'][] = $e;
    foreach ($notes as $n) if (!in_array($n, $rels[$k]['notes'], true)) $rels[$k]['notes'][] = $n;
};

$fileKey = static fn(string $p): string => 'file:' . strtolower($p);
$ensureFile = static function (string $p, string $domain, array $ext = []) use ($put, $fileKey): string {
    $k = $fileKey($p);
    $put($k, 'FILE', $p, $domain, array_merge(['source_files' => [$p]], $ext));
    return $k;
};

/* ── 3-1. Raw Match (5 도메인) ─────────────────────────────────────────── */
$RAW_DEFS = [
    ['favorites-backend-raw-results.json', 'BACKEND'],
    ['favorites-frontend-raw-results.json', 'FRONTEND'],
    ['favorites-database-raw-results.json', 'DATABASE'],
    ['favorites-api-raw-results.json', 'API'],
    ['favorites-test-dependency-raw-results.json', 'TEST'],
];
$rawTotal = 0;
foreach ($RAW_DEFS as [$file, $domain]) {
    if (!isset($data[$file])) continue;
    $rev = $data[$file]['source_revision'] ?? null;
    foreach ((array)($data[$file]['results'] ?? []) as $r) {
        $rawTotal++;
        $rid = (string)($r['result_id'] ?? '');
        $fp = $normPath($r['file_path'] ?? null);
        if ($fp === null) {
            $excl[] = ['source_file' => $IN . '/' . $file, 'source_record_id' => $rid,
                'exclusion_reason' => 'INVALID_PATH', 'details' => [(string)($r['file_path'] ?? '')],
                'manual_review_required' => true];
            continue;
        }
        $ln = (int)($r['line_number'] ?? 0);
        $key = 'raw:' . $domain . ':' . $pathKey($fp) . ':' . $ln . ':' . strtolower((string)($r['keyword'] ?? ''));
        $ev = ['source_file' => $IN . '/' . $file, 'source_record_id' => $rid, 'line_number' => $ln,
            'matched_text_hash' => $evHash($fp, (string)$ln, (string)($r['matched_text'] ?? '')),
            'evidence_type' => 'RAW_MATCH'];
        $put($key, 'RAW_MATCH', (string)($r['keyword'] ?? 'match'), $domain, [
            'source_record_ids' => [$rid], 'source_files' => [$fp], 'source_revisions' => [$rev],
            'evidence_refs' => [$ev],
            'classification' => $normClass($r['classification'] ?? null),
            'priority' => $r['priority'] ?? null, 'confidence' => $r['confidence'] ?? ($r['symbol_confidence'] ?? null),
            'tenant_scope' => $r['tenant_aware'] ?? null, 'workspace_scope' => $r['workspace_aware'] ?? null,
            'project_scope' => $r['project_aware'] ?? null,
            'attributes' => [
                'original_classification' => $r['classification'] ?? null,
                'matched_keywords' => $r['matched_keywords'] ?? [],
                'symbol_name' => $r['symbol_name'] ?? null, 'symbol_type' => $r['symbol_type'] ?? null,
                'ignore_reason' => $r['ignore_reason'] ?? null,
                'self_reference' => $r['self_reference'] ?? null,
                'line_number' => $ln, 'language' => $r['language'] ?? null,
                'source_type' => $r['source_type'] ?? null,
            ],
        ]);
        $fk = $ensureFile($fp, $domain, ['source_revisions' => [$rev]]);
        $addRel('DEFINED_IN', $key, $fk, 'HIGH', [$ev]);
    }
}

/* ── 3-2. File Inventory ───────────────────────────────────────────────── */
foreach ([['favorites-backend-file-inventory.json', 'BACKEND'], ['favorites-frontend-file-inventory.json', 'FRONTEND']] as [$file, $domain]) {
    foreach ((array)($data[$file]['files'] ?? []) as $f) {
        $fp = $normPath($f['file_path'] ?? null);
        if ($fp === null) continue;
        $ensureFile($fp, $domain, [
            'priority' => $f['priority'] ?? null,
            'attributes' => ['match_count' => $f['match_count'] ?? null, 'keywords' => $f['keywords'] ?? [],
                'symbols' => $f['symbols'] ?? [], 'probable_layer' => $f['probable_layer'] ?? ($f['probable_type'] ?? null),
                'framework' => $f['framework'] ?? null, 'possibly_generated' => $f['possibly_generated'] ?? null],
            'evidence_refs' => [['source_file' => $IN . '/' . $file, 'source_record_id' => 'file:' . $fp,
                'line_number' => 0, 'matched_text_hash' => $evHash($fp), 'evidence_type' => 'FILE_INVENTORY']],
        ]);
    }
}

/* ── 3-3. Symbol / Component / State ───────────────────────────────────── */
foreach ((array)($data['favorites-backend-symbol-inventory.json']['symbols'] ?? []) as $s) {
    $fp = $normPath($s['file_path'] ?? null); if ($fp === null) continue;
    $name = $normSymbol($s['symbol_name'] ?? null); if ($name === null) continue;
    $ns = $normSymbol($s['namespace'] ?? null);
    $key = 'symbol:' . strtolower(($ns ? $ns . '\\' : '') . $name);
    $put($key, 'SYMBOL', $name, 'BACKEND', ['source_files' => [$fp], 'priority' => $s['priority'] ?? null,
        'confidence' => $s['confidence'] ?? null,
        'attributes' => ['symbol_type' => $s['symbol_type'] ?? null, 'namespace' => $ns, 'line_number' => $s['line_number'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-backend-symbol-inventory.json',
            'source_record_id' => 'symbol:' . $name, 'line_number' => (int)($s['line_number'] ?? 0),
            'matched_text_hash' => $evHash($fp, $name), 'evidence_type' => 'SYMBOL_INVENTORY']]]);
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'BACKEND'), 'HIGH');
}
foreach ((array)($data['favorites-frontend-component-inventory.json']['components'] ?? []) as $c) {
    $fp = $normPath($c['file_path'] ?? null); if ($fp === null) continue;
    $name = $normSymbol($c['component_name'] ?? null); if ($name === null) continue;
    $fw = strtoupper((string)($c['framework'] ?? 'UNKNOWN'));
    $key = 'component:' . $fw . ':' . $pathKey($fp) . ':' . strtolower($name);
    $put($key, 'COMPONENT', $name, 'FRONTEND', ['source_files' => [$fp],
        'priority' => $c['priority'] ?? null, 'confidence' => $c['confidence'] ?? null,
        'attributes' => ['framework' => $fw, 'component_type' => $c['component_type'] ?? null,
            'props' => $c['props'] ?? [], 'events' => $c['events'] ?? [],
            'api_call_detected' => $c['api_call_detected'] ?? null, 'store_detected' => $c['store_detected'] ?? null,
            'accessibility_detected' => $c['accessibility_detected'] ?? null,
            'mobile_support_detected' => $c['mobile_support_detected'] ?? null,
            'match_count' => $c['match_count'] ?? null, 'line_number' => $c['line_number'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-frontend-component-inventory.json',
            'source_record_id' => 'component:' . $name, 'line_number' => (int)($c['line_number'] ?? 0),
            'matched_text_hash' => $evHash($fp, $name), 'evidence_type' => 'COMPONENT_INVENTORY']]]);
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'FRONTEND'), 'HIGH');
}
foreach ((array)($data['favorites-frontend-state-inventory.json']['state_units'] ?? []) as $s) {
    $fp = $normPath($s['file_path'] ?? null); if ($fp === null) continue;
    $name = $normSymbol($s['name'] ?? null); if ($name === null) continue;
    $type = strtoupper((string)($s['type'] ?? 'UNKNOWN'));
    $key = 'state:' . $type . ':' . $pathKey($fp) . ':' . strtolower($name);
    $put($key, 'STATE_UNIT', $name, 'FRONTEND', ['source_files' => [$fp],
        'priority' => $s['priority'] ?? null, 'confidence' => $s['confidence'] ?? null,
        'attributes' => ['state_type' => $type, 'query_library' => $s['query_library'] ?? null,
            'storage_type' => $s['storage_type'] ?? null, 'storage_key' => $s['storage_key'] ?? null,
            'device_local_only' => $s['device_local_only'] ?? null,
            'server_synced_detected' => $s['server_synced_detected'] ?? null,
            'optimistic_update_detected' => $s['optimistic_update_detected'] ?? null,
            'rollback_detected' => $s['rollback_detected'] ?? null,
            'endpoints' => $s['endpoints'] ?? [], 'line_number' => $s['line_number'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-frontend-state-inventory.json',
            'source_record_id' => 'state:' . $name, 'line_number' => (int)($s['line_number'] ?? 0),
            'matched_text_hash' => $evHash($fp, $name), 'evidence_type' => 'STATE_INVENTORY']]]);
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'FRONTEND'), 'HIGH');
}

/* ── 3-4. API: Endpoint / Controller / Middleware ──────────────────────── */
foreach ([['favorites-route-inventory.json', 'routes'], ['favorites-api-route-inventory.json', 'routes']] as [$file, $k]) {
    foreach ((array)($data[$file][$k] ?? []) as $r) {
        $m = $normMethod($r['http_method'] ?? ($r['method'] ?? null));
        $uriRaw = (string)($r['uri'] ?? ($r['path'] ?? ''));
        if ($uriRaw === '') continue;
        [$disp, $cmp] = $normEndpoint($uriRaw);
        $key = 'endpoint:' . $m . ':' . $cmp;
        $sf = $normPath($r['source_file'] ?? 'backend/src/routes.php');
        $put($key, 'API_ENDPOINT', $m . ' ' . $disp, 'API', [
            'source_record_ids' => [$r['route_id'] ?? null], 'source_files' => $sf ? [$sf] : [],
            'classification' => ($r['relation'] ?? '') === 'DIRECT_FAVORITES' ? 'DIRECT_IMPLEMENTATION_CANDIDATE' : 'RELATED_INFRASTRUCTURE_CANDIDATE',
            'confidence' => $r['confidence'] ?? null,
            'attributes' => ['http_method' => $m, 'display_uri' => $disp, 'comparison_uri' => $cmp,
                'original_uri' => $uriRaw, 'controller' => $r['controller'] ?? null, 'action' => $r['action'] ?? null,
                'prefix' => $r['prefix'] ?? null, 'api_version' => $r['api_version'] ?? null,
                'middleware' => $r['middleware'] ?? [], 'permission' => $r['permission'] ?? 'UNKNOWN',
                'relation' => $r['relation'] ?? null, 'line_number' => $r['line_number'] ?? null],
            'evidence_refs' => [['source_file' => $IN . '/' . $file, 'source_record_id' => (string)($r['route_id'] ?? ''),
                'line_number' => (int)($r['line_number'] ?? 0), 'matched_text_hash' => $evHash($m, $disp),
                'evidence_type' => 'ROUTE_INVENTORY']]]);
        if ($sf) $addRel('DEFINED_IN', $key, $ensureFile($sf, 'API'), 'HIGH');
        // Route HANDLES Controller Method (§52)
        $ctrl = $normSymbol($r['controller'] ?? null);
        $act = $normSymbol($r['action'] ?? null);
        if ($ctrl !== null && $act !== null) {
            $mk = 'method:' . strtolower($ctrl) . '::' . strtolower($act);
            $ctrlFile = 'backend/src/' . str_replace('\\', '/', preg_replace('/^Genie\\\\/', '', $ctrl) ?? $ctrl) . '.php';
            $exists = is_file($ROOT . '/' . $ctrlFile);
            $put($mk, 'SYMBOL', $ctrl . '::' . $act, 'API', [
                'source_files' => $exists ? [$ctrlFile] : [],
                'status' => $exists ? 'ACTIVE_CANDIDATE' : 'ORPHANED',
                'confidence' => $exists ? 'HIGH' : 'LOW',
                'attributes' => ['symbol_type' => 'METHOD', 'controller' => $ctrl, 'action' => $act,
                    'controller_file_exists' => $exists],
                'notes' => $exists ? [] : ['Route 가 가리키는 Controller 파일을 찾지 못함(ORPHANED)']]);
            $addRel('HANDLES', $key, $mk, $exists ? 'HIGH' : 'LOW');
            if ($exists) $addRel('DEFINED_IN', $mk, $ensureFile($ctrlFile, 'BACKEND'), 'HIGH');
        }
        // Route PROTECTED_BY Middleware
        foreach ((array)($r['middleware'] ?? []) as $mw) {
            $mwKey = 'middleware:' . strtolower(trim((string)$mw));
            $put($mwKey, 'MIDDLEWARE', (string)$mw, 'API', [
                'attributes' => ['declared_on_route' => true],
                'evidence_refs' => [['source_file' => $IN . '/' . $file,
                    'source_record_id' => (string)($r['route_id'] ?? ''), 'line_number' => (int)($r['line_number'] ?? 0),
                    'matched_text_hash' => $evHash((string)$mw, $disp), 'evidence_type' => 'ROUTE_MIDDLEWARE_DECLARATION']]]);
            $addRel('PROTECTED_BY', $key, $mwKey, 'MEDIUM', [], [], ['라우트 인벤토리 선언 기준']);
        }
    }
}
foreach ((array)($data['favorites-middleware-inventory.json']['middleware'] ?? []) as $mw) {
    $name = strtolower(trim((string)($mw['middleware_name'] ?? '')));
    if ($name === '') continue;
    $sf = $normPath($mw['source_file'] ?? null);
    $put('middleware:' . $name, 'MIDDLEWARE', (string)$mw['middleware_name'], 'API', [
        'source_files' => $sf ? [$sf] : [], 'confidence' => 'HIGH',
        'attributes' => ['order' => $mw['order'] ?? null, 'parameters' => $mw['parameters'] ?? [],
            'applies_to' => $mw['applies_to'] ?? null, 'implementation' => $mw['implementation'] ?? null,
            'detected' => $mw['detected'] ?? null, 'line_number' => $mw['line_number'] ?? null,
            'note' => $mw['note'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-middleware-inventory.json',
            'source_record_id' => 'middleware:' . $name, 'line_number' => (int)($mw['line_number'] ?? 0),
            'matched_text_hash' => $evHash($name), 'evidence_type' => 'MIDDLEWARE_INVENTORY']]]);
    if ($sf) $addRel('DEFINED_IN', 'middleware:' . $name, $ensureFile($sf, 'API'), 'HIGH');
}
/* Authorization Gate — ★ST08 판정에 가장 결정적인 레코드(즐겨찾기 API 가 놓일 실제 인증 게이트).
   MIDDLEWARE Entity 로 정규화하되 attributes.gate_type 으로 체인 미들웨어와 구분한다. */
foreach ((array)($data['favorites-middleware-inventory.json']['authorization'] ?? []) as $a) {
    $mech = (string)($a['mechanism'] ?? ''); if ($mech === '') continue;
    $sf = $normPath($a['source_file'] ?? null);
    $key = 'middleware:authz:' . strtolower(preg_replace('/\s+/', '', $mech) ?? $mech);
    $put($key, 'MIDDLEWARE', $mech, 'API', [
        'source_files' => $sf ? [$sf] : [], 'confidence' => 'HIGH', 'priority' => 'HIGH',
        'classification' => 'RELATED_INFRASTRUCTURE_CANDIDATE',
        'tenant_scope' => $a['tenant_isolation'] ?? null,
        'attributes' => ['gate_type' => $a['type'] ?? 'UNKNOWN', 'mechanism' => $mech,
            'roles' => $a['roles'] ?? [], 'tenant_isolation' => $a['tenant_isolation'] ?? null,
            'external_principal_deny' => $a['external_principal_deny'] ?? null, 'note' => $a['note'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-middleware-inventory.json',
            // ★접두사를 'authz_gate' 로 둔다. 'authorization:' 로 두면 실제 HTTP 헤더 탐지 패턴
            //   /Authorization\s*:\s*\S{8,}/i 에 자기 자신이 걸려 [REDACTED] 되는 자충수가 된다.
            'source_record_id' => 'authz_gate:' . $mech, 'line_number' => 0,
            'matched_text_hash' => $evHash($mech), 'evidence_type' => 'AUTHORIZATION_INVENTORY']]]);
    if ($sf) $addRel('DEFINED_IN', $key, $ensureFile($sf, 'API'), 'HIGH');
}
/* ST04 시점 테스트 파일 목록 — ST06 test-inventory 와 파일 단위로 병합된다. */
foreach ((array)($data['favorites-package-test-inventory.json']['test_files'] ?? []) as $t) {
    $fp = $normPath($t['file_path'] ?? null); if ($fp === null) continue;
    $ensureFile($fp, 'TEST', ['attributes' => ['test_framework_raw' => $t['framework'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-package-test-inventory.json',
            'source_record_id' => 'test_file:' . $fp, 'line_number' => 0,
            'matched_text_hash' => $evHash($fp), 'evidence_type' => 'TEST_FILE_INVENTORY']]]);
}

foreach ((array)($data['favorites-frontend-api-inventory.json']['api_calls'] ?? []) as $a) {
    $m = $normMethod($a['http_method'] ?? null);
    $ep = (string)($a['endpoint'] ?? '');
    if ($ep === '' || $ep === 'UNKNOWN') continue;
    [$disp, $cmp] = $ep === 'DYNAMIC' ? ['DYNAMIC', 'DYNAMIC'] : $normEndpoint($ep);
    $key = 'endpoint:' . $m . ':' . $cmp;
    $fp = $normPath($a['file_path'] ?? null);
    $put($key, 'API_ENDPOINT', $m . ' ' . $disp, 'FRONTEND', [
        'source_record_ids' => [$a['call_id'] ?? null], 'source_files' => $fp ? [$fp] : [],
        'confidence' => $a['confidence'] ?? null,
        'attributes' => ['frontend_call' => true, 'function_name' => $a['function_name'] ?? null]]);
    if ($fp && $m === 'UNKNOWN') {
        $addRel('POTENTIAL_MATCH', $key, $fileKey($fp), 'LOW', [], [], ['Method UNKNOWN — 이름 유추만으로 자동 병합 금지(§20)']);
    }
}

/* ── 3-5. Database ─────────────────────────────────────────────────────── */
$tableKeyOf = static fn(string $t): string => 'table:unknown:unknown:' . strtolower($t);
foreach ((array)($data['favorites-database-table-inventory.json']['tables'] ?? []) as $t) {
    $name = (string)($t['table_name'] ?? ''); if ($name === '') continue;
    $key = $tableKeyOf($name);
    $files = array_values(array_filter(array_map($normPath, (array)($t['source_files'] ?? []))));
    $put($key, 'DATABASE_TABLE', $name, 'DATABASE', ['source_files' => $files,
        'priority' => $t['priority'] ?? null, 'confidence' => $t['confidence'] ?? null,
        'classification' => ($t['favorites_direct'] ?? false) ? 'DIRECT_IMPLEMENTATION_CANDIDATE' : 'RELATED_INFRASTRUCTURE_CANDIDATE',
        'tenant_scope' => $t['tenant_aware'] ?? null, 'workspace_scope' => $t['workspace_aware'] ?? null,
        'project_scope' => $t['project_aware'] ?? null,
        'attributes' => ['columns' => $t['columns'] ?? [], 'primary_key' => $t['primary_key'] ?? [],
            'user_scoped' => $t['user_scoped'] ?? null, 'polymorphic_detected' => $t['polymorphic_detected'] ?? null,
            'soft_delete_detected' => $t['soft_delete_detected'] ?? null,
            'ordering_detected' => $t['ordering_detected'] ?? null,
            'json_metadata_detected' => $t['json_metadata_detected'] ?? null,
            'created_by_ensure_tables' => $t['created_by_ensure_tables'] ?? null,
            'created_by_migration' => $t['created_by_migration'] ?? null],
        'evidence_refs' => [['source_file' => $IN . '/favorites-database-table-inventory.json',
            'source_record_id' => 'table:' . $name, 'line_number' => 0,
            'matched_text_hash' => $evHash($name), 'evidence_type' => 'TABLE_INVENTORY']]]);
    foreach ($files as $f) $addRel('DEFINED_IN', $key, $ensureFile($f, 'DATABASE'), 'HIGH');
}
foreach ((array)($data['favorites-database-column-inventory.json']['columns'] ?? []) as $c) {
    $t = (string)($c['table_name'] ?? ''); $cn = (string)($c['column_name'] ?? '');
    if ($t === '' || $cn === '') continue;
    $tk = $tableKeyOf($t);
    $key = 'column:' . $tk . ':' . strtolower($cn);
    $TYPE_MAP = ['VARCHAR' => 'STRING', 'CHARACTER VARYING' => 'STRING', 'TEXT' => 'TEXT',
        'INT' => 'INTEGER', 'INTEGER' => 'INTEGER', 'BIGINT' => 'BIGINT', 'UUID' => 'UUID',
        'JSON' => 'JSON', 'JSONB' => 'JSONB', 'DATETIME' => 'TIMESTAMP', 'TIMESTAMP' => 'TIMESTAMP', 'DATE' => 'DATE'];
    $orig = (string)($c['data_type'] ?? '');
    $base = strtoupper(preg_replace('/\(.*$/', '', $orig) ?? $orig);
    $put($key, 'DATABASE_COLUMN', $cn, 'DATABASE', [
        'source_files' => array_values(array_filter([$normPath($c['source_file'] ?? null)])),
        'confidence' => $c['confidence'] ?? null,
        'attributes' => ['table_name' => $t, 'data_type' => $TYPE_MAP[$base] ?? 'UNKNOWN',
            'original_data_type' => $orig, 'nullable' => $c['nullable'] ?? null,
            'default' => $c['default'] ?? null, 'primary_key' => $c['primary_key'] ?? null,
            'foreign_key' => $c['foreign_key'] ?? null, 'indexed' => $c['indexed'] ?? null,
            'unique' => $c['unique'] ?? null, 'line_number' => $c['line_number'] ?? null]]);
    if (isset($recs[$tk])) $addRel('CONTAINS', $tk, $key, 'HIGH');
    else { $recs[$key]['status'] = 'ORPHANED'; $recs[$key]['normalization_notes'][] = "상위 테이블 미발견: $t"; }
}
foreach ((array)($data['favorites-database-constraint-inventory.json']['constraints'] ?? []) as $c) {
    $t = (string)($c['table_name'] ?? ''); if ($t === '') continue;
    $tk = $tableKeyOf($t);
    $cols = (array)($c['columns'] ?? []);
    $nm = (string)($c['constraint_name'] ?? '');
    $key = 'constraint:' . $tk . ':' . strtoupper((string)($c['constraint_type'] ?? 'UNKNOWN')) . ':'
         . ($nm !== '' ? strtolower($nm) : strtolower(implode(',', $cols)));
    $put($key, 'DATABASE_CONSTRAINT', $nm !== '' ? $nm : implode(',', $cols), 'DATABASE', [
        'source_records' => [], 'source_record_ids' => [$c['constraint_id'] ?? null],
        'source_files' => array_values(array_filter([$normPath($c['source_file'] ?? null)])),
        'confidence' => $c['confidence'] ?? null,
        'attributes' => ['table_name' => $t, 'constraint_type' => $c['constraint_type'] ?? 'UNKNOWN',
            'columns' => $cols, 'referenced_table' => $c['referenced_table'] ?? null,
            'delete_rule' => $c['delete_rule'] ?? null]]);
    if (isset($recs[$tk])) $addRel('CONTAINS', $tk, $key, 'HIGH');
    if (!empty($c['referenced_table'])) $addRel('REFERENCES', $key, $tableKeyOf((string)$c['referenced_table']), 'HIGH');
}
foreach ((array)($data['favorites-database-constraint-inventory.json']['indexes'] ?? []) as $i) {
    $t = (string)($i['table_name'] ?? ''); if ($t === '') continue;
    $tk = $tableKeyOf($t);
    $cols = (array)($i['columns'] ?? []);
    $key = 'index:' . $tk . ':' . (($i['unique'] ?? false) ? 'unique' : 'nonunique') . ':' . strtolower(implode(',', $cols));
    $put($key, 'DATABASE_INDEX', (string)($i['index_name'] ?? implode(',', $cols)), 'DATABASE', [
        'source_files' => array_values(array_filter([$normPath($i['source_file'] ?? null)])),
        'confidence' => $i['confidence'] ?? null,
        'attributes' => ['table_name' => $t, 'columns' => $cols, 'unique' => $i['unique'] ?? false,
            'index_type' => $i['index_type'] ?? null, 'index_name' => $i['index_name'] ?? null]]);
    if (isset($recs[$tk])) $addRel('CONTAINS', $tk, $key, 'HIGH');
}
foreach ((array)($data['favorites-database-migration-inventory.json']['migrations'] ?? []) as $m) {
    $fp = $normPath($m['file_path'] ?? null); if ($fp === null) continue;
    $key = 'migration:CUSTOM:' . strtolower((string)($m['migration_name'] ?? basename($fp)));
    $put($key, 'MIGRATION', (string)($m['migration_name'] ?? basename($fp)), 'DATABASE', [
        'source_record_ids' => [$m['migration_id'] ?? null], 'source_files' => [$fp],
        'priority' => $m['priority'] ?? null, 'confidence' => $m['confidence'] ?? null,
        'attributes' => ['migration_tool' => 'CUSTOM', 'original_tool' => $m['migration_tool'] ?? null,
            'operation_types' => $m['operation_types'] ?? [], 'affected_tables' => $m['affected_tables'] ?? [],
            'up_detected' => $m['up_detected'] ?? null, 'down_detected' => $m['down_detected'] ?? null,
            'version_or_timestamp' => $m['version_or_timestamp'] ?? null]]);
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'DATABASE'), 'HIGH');
    foreach ((array)($m['affected_tables'] ?? []) as $at) {
        $atk = $tableKeyOf((string)$at);
        $ops = (array)($m['operation_types'] ?? []);
        $type = in_array('CREATE_TABLE', $ops, true) ? 'CREATES' : (in_array('ALTER_TABLE', $ops, true) ? 'ALTERS' : (in_array('DROP_TABLE', $ops, true) ? 'DROPS' : 'REFERENCES'));
        // ★상류(ST04) 파서 결함 탐지: `CREATE/DROP ... IF NOT EXISTS` 의 SQL 키워드가
        //   테이블명으로 추출된 경우. ST02~ST06 산출물은 수정 금지(§119)이므로
        //   여기서 오탐으로 표시하고 충돌 레코드로 승격해 상류에 되돌린다.
        $isSqlKeyword = in_array(strtoupper((string)$at), ['IF', 'NOT', 'EXISTS', 'TABLE', 'INDEX'], true);
        if (!isset($recs[$atk])) {
            $put($atk, 'DATABASE_TABLE', (string)$at, 'DATABASE', [
                'status' => 'ORPHANED', 'confidence' => 'LOW',
                'classification' => $isSqlKeyword ? 'FALSE_POSITIVE_CANDIDATE' : 'UNKNOWN',
                'source_files' => [$fp],
                'attributes' => ['discovered_via' => 'migration_only', 'sql_keyword_false_positive' => $isSqlKeyword],
                'evidence_refs' => [['source_file' => $IN . '/favorites-database-migration-inventory.json',
                    'source_record_id' => (string)($m['migration_id'] ?? ''), 'line_number' => 0,
                    'matched_text_hash' => $evHash($fp, (string)$at), 'evidence_type' => 'MIGRATION_AFFECTED_TABLE']],
                'notes' => [$isSqlKeyword
                    ? "★상류 ST04 파서 결함: SQL 키워드 '{$at}' 가 테이블명으로 추출됨(IF NOT EXISTS 구문). 실재 테이블 아님"
                    : 'Migration 이 참조하지만 즐겨찾기 Table Inventory 후보가 아닌 무관 테이블']]);
        }
        if ($isSqlKeyword) {
            $sqlKeywordFps[] = ['table' => (string)$at, 'migration' => (string)($m['migration_id'] ?? ''),
                'file' => $fp, 'canonical_key' => $atk];
        }
        $addRel($type, $key, $atk, $isSqlKeyword ? 'LOW' : 'HIGH', [], [],
            $isSqlKeyword ? ['상류 파서 오탐 대상 — ST08 에서 제거 대상'] : []);
    }
}
foreach ((array)($data['favorites-database-orm-inventory.json']['mappings'] ?? []) as $o) {
    $key = 'orm:' . strtoupper((string)($o['orm'] ?? 'UNKNOWN')) . ':' . strtolower((string)($o['model_or_entity'] ?? ''));
    $put($key, 'ORM_MAPPING', (string)($o['model_or_entity'] ?? ''), 'DATABASE', [
        'source_record_ids' => [$o['mapping_id'] ?? null],
        'source_files' => array_values(array_filter([$normPath($o['file_path'] ?? null)])),
        'attributes' => $o]);
    if (!empty($o['table_name'])) $addRel('MAPS_TO', $key, $tableKeyOf((string)$o['table_name']), 'HIGH');
}
foreach ((array)($data['favorites-database-risk-candidates.json']['risks'] ?? []) as $r) {
    $key = 'risk:' . strtolower((string)($r['risk_type'] ?? '')) . ':' . strtolower((string)($r['table_name'] ?? ''));
    $put($key, 'RISK_CANDIDATE', (string)($r['risk_type'] ?? ''), 'DATABASE', [
        'source_record_ids' => [$r['risk_id'] ?? null],
        'source_files' => array_values(array_filter(array_map($normPath, (array)($r['source_files'] ?? [])))),
        'classification' => 'RISK_CANDIDATE',
        'attributes' => ['risk_type' => $r['risk_type'] ?? null, 'table_name' => $r['table_name'] ?? null,
            'evidence' => $r['evidence'] ?? [], 'severity_candidate' => $r['severity_candidate'] ?? 'UNKNOWN']]);
    if (!empty($r['table_name'])) $addRel('REFERENCES', $key, $tableKeyOf((string)$r['table_name']), 'HIGH');
}

/* ── 3-6. Test / Package / CI ──────────────────────────────────────────── */
foreach ((array)($data['favorites-test-inventory.json']['tests'] ?? []) as $t) {
    $fp = $normPath($t['file_path'] ?? null); if ($fp === null) continue;
    $name = (string)($t['test_name'] ?? '');
    $fw = strtoupper((string)($t['test_framework'] ?? 'CUSTOM'));
    $fwNorm = str_contains($fw, 'PHPUNIT') ? 'PHPUNIT' : (str_contains($fw, 'PEST') ? 'PEST' : 'CUSTOM');
    // ★§32 — 이름이 템플릿 리터럴/보간으로 동적 생성되면 line_number 로 판별한다.
    //   (tools/e2e/scenarios.mjs 처럼 같은 파일에서 같은 이름이 여러 줄에 생기면 병합돼 소실된다)
    $dynamic = $name === '' || preg_match('/\$\{|\%s|\{\{/', $name) === 1;
    $key = 'test:' . $fwNorm . ':' . $pathKey($fp) . ':'
         . ($dynamic ? 'dynamic:' . (string)($t['line_number'] ?? 0) : strtolower($name));
    $put($key, 'TEST_CASE', $name, 'TEST', [
        'source_record_ids' => [$t['test_id'] ?? null], 'source_files' => [$fp],
        'priority' => $t['priority'] ?? null, 'confidence' => $t['confidence'] ?? null,
        'classification' => 'TEST_ONLY',
        'tenant_scope' => ($t['tenant_test_detected'] ?? false) ? 'YES' : 'UNKNOWN',
        'attributes' => ['test_type' => $t['test_type'] ?? 'UNKNOWN', 'test_framework' => $fwNorm,
            'original_framework' => $t['test_framework'] ?? null, 'test_class' => $t['test_class'] ?? null,
            'favorites_related' => $t['favorites_related'] ?? false,
            'authorization_test_detected' => $t['authorization_test_detected'] ?? null,
            'accessibility_test_detected' => $t['accessibility_test_detected'] ?? null,
            'source_link_status' => $t['source_link_status'] ?? 'UNKNOWN_REFERENCE',
            'line_number' => $t['line_number'] ?? null]]);
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'TEST'), 'HIGH');
}
foreach ((array)($data['favorites-test-asset-inventory.json']['assets'] ?? []) as $a) {
    $fp = $normPath($a['file_path'] ?? null); if ($fp === null) continue;
    $key = 'test-asset:' . strtoupper((string)($a['asset_type'] ?? 'UNKNOWN')) . ':' . $pathKey($fp) . ':' . strtolower((string)($a['asset_name'] ?? ''));
    $put($key, 'TEST_ASSET', (string)($a['asset_name'] ?? ''), 'TEST', [
        'source_record_ids' => [$a['asset_id'] ?? null], 'source_files' => [$fp],
        'confidence' => $a['confidence'] ?? null, 'classification' => 'TEST_ONLY',
        'attributes' => ['asset_type' => $a['asset_type'] ?? null, 'target' => $a['target'] ?? null,
            'reusable_candidate' => $a['reusable_candidate'] ?? null,
            'sensitive_data_candidate' => $a['sensitive_data_candidate'] ?? null, 'note' => $a['note'] ?? null]]);
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'TEST'), 'HIGH');
}
foreach ((array)($data['favorites-test-gap-candidates.json']['gaps'] ?? []) as $g) {
    // ★판별자에 evidence 를 포함한다. gap_type+source_files 만 쓰면
    //   "미사용 Composer 의존성 4건"(전부 composer.json 출처)이 1건으로 병합돼 3건의 근거가 소실된다(§71).
    $key = 'gap:' . strtolower((string)($g['gap_type'] ?? '')) . ':'
         . substr(hash('sha256', implode(',', (array)($g['source_files'] ?? []))
             . '|' . implode(',', (array)($g['evidence'] ?? []))), 0, 12);
    $put($key, 'GAP_CANDIDATE', (string)($g['gap_type'] ?? ''), 'TEST', [
        'source_record_ids' => [$g['gap_id'] ?? null],
        'source_files' => array_values(array_filter(array_map($normPath, (array)($g['source_files'] ?? [])))),
        'classification' => 'GAP_CANDIDATE',
        'attributes' => ['gap_type' => $g['gap_type'] ?? null, 'evidence' => $g['evidence'] ?? [],
            'severity_candidate' => $g['severity_candidate'] ?? 'UNKNOWN',
            'test_files' => $g['test_files'] ?? []]]);
    foreach ((array)($g['source_files'] ?? []) as $sf) {
        $n = $normPath($sf); if ($n === null) continue;
        $addRel('REFERENCES', $key, $ensureFile($n, 'TEST'), 'HIGH');
    }
}
foreach ([['favorites-package-inventory.json', 'packages'], ['favorites-package-test-inventory.json', 'packages']] as [$file, $k]) {
    foreach ((array)($data[$file][$k] ?? []) as $p) {
        $eco = strtoupper((string)($p['ecosystem'] ?? 'UNKNOWN'));
        if (!in_array($eco, ['COMPOSER', 'NPM', 'INTERNAL'], true)) $eco = 'UNKNOWN';
        $name = (string)($p['package_name'] ?? ($p['name'] ?? '')); if ($name === '') continue;
        $key = strtolower($eco) . ':' . strtolower($name);
        $put($key, 'PACKAGE', $name, 'PACKAGE', [
            'source_record_ids' => [$p['package_id'] ?? null],
            'source_files' => array_values(array_filter(array_map($normPath, (array)($p['usage_files'] ?? [])))),
            'classification' => 'PACKAGE_ONLY',
            'status' => ($p['usage_status'] ?? '') === 'DECLARED_NOT_FOUND' ? 'ORPHANED' : 'ACTIVE_CANDIDATE',
            'notes' => ($p['usage_status'] ?? '') === 'DECLARED_NOT_FOUND'
                ? ["Manifest 에 선언되었으나 전 소스에서 사용처를 찾지 못함(ST06 실측). 제거 판단은 본 Step 범위 밖"] : [],
            'attributes' => ['ecosystem' => $eco, 'declared_version' => $p['declared_version'] ?? null,
                'resolved_versions' => array_values(array_filter([$p['resolved_version'] ?? null])),
                'dependency_type' => $p['dependency_type'] ?? null, 'usage_status' => $p['usage_status'] ?? null,
                'transitive_of' => $p['transitive_of'] ?? null, 'abandoned' => $p['abandoned'] ?? null,
                'manifest' => $p['manifest'] ?? null, 'relevance' => $p['relevance'] ?? []]]);
        $mf = $normPath($p['manifest'] ?? ($eco === 'COMPOSER' ? 'backend/composer.json' : null));
        if ($mf !== null && is_file($ROOT . '/' . $mf)) $addRel('DECLARED_BY', $key, $ensureFile($mf, 'PACKAGE'), 'HIGH');
    }
}
foreach ((array)($data['favorites-dependency-usage-inventory.json']['usages'] ?? []) as $u) {
    $fp = $normPath($u['file_path'] ?? null); if ($fp === null) continue;
    $name = (string)($u['package_name'] ?? ''); if ($name === '') continue;
    $eco = strtolower((string)($u['ecosystem'] ?? 'unknown'));
    $key = 'usage:' . $eco . ':' . strtolower($name) . ':' . $pathKey($fp);
    $put($key, 'DEPENDENCY_USAGE', $name . ' @ ' . basename($fp), 'PACKAGE', [
        'source_record_ids' => [$u['usage_id'] ?? null], 'source_files' => [$fp],
        'confidence' => $u['confidence'] ?? null, 'classification' => 'PACKAGE_ONLY',
        'attributes' => ['package_name' => $name, 'ecosystem' => strtoupper($eco),
            'imported_symbol' => $u['imported_symbol'] ?? null, 'usage_type' => $u['usage_type'] ?? null]]);
    // ★같은 파일에서 같은 패키지를 여러 번 쓰면 canonical_key 가 같아 병합된다(§44).
    //   개수가 조용히 사라지지 않도록 발생 횟수와 원본 심볼을 누적 보존한다(§71).
    $recs[$key]['attributes']['usage_occurrences'] = ($recs[$key]['attributes']['usage_occurrences'] ?? 0) + 1;
    $sym = (string)($u['imported_symbol'] ?? '');
    if ($sym !== '' && !in_array($sym, $recs[$key]['attributes']['imported_symbols'] ?? [], true)) {
        $recs[$key]['attributes']['imported_symbols'][] = $sym;
    }
    $pk = $eco . ':' . strtolower($name);
    if (isset($recs[$pk])) $addRel('IMPORTS', $key, $pk, 'HIGH');
    else { $recs[$key]['status'] = 'ORPHANED'; $recs[$key]['normalization_notes'][] = "Manifest 패키지 미발견: $name"; }
    $addRel('DEFINED_IN', $key, $ensureFile($fp, 'PACKAGE'), 'HIGH');
}
foreach ((array)($data['favorites-ci-test-inventory.json']['jobs'] ?? []) as $j) {
    $wf = $normPath($j['workflow_file'] ?? null); if ($wf === null) continue;
    $key = 'ci:' . strtolower((string)($j['provider'] ?? 'unknown')) . ':' . $pathKey($wf) . ':' . strtolower((string)($j['job_name'] ?? 'unknown'));
    $put($key, 'CI_JOB', (string)($j['job_name'] ?? 'UNKNOWN'), 'CI', [
        'source_record_ids' => [$j['ci_id'] ?? null], 'source_files' => [$wf],
        'attributes' => ['provider' => $j['provider'] ?? null, 'commands' => $j['commands'] ?? [],
            'coverage_detected' => $j['coverage_detected'] ?? null,
            'favorites_specific' => $j['favorites_specific'] ?? null]]);
    $addRel('DEFINED_IN', $key, $ensureFile($wf, 'CI'), 'HIGH');
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. Alias · 의미 유사 관계(§45·§46)
 * ══════════════════════════════════════════════════════════════════════════ */
$aliases = [
    ['alias' => 'favourite', 'canonical_candidate' => 'favorite', 'alias_type' => 'SPELLING_VARIANT', 'auto_replace' => true],
    ['alias' => 'favourites', 'canonical_candidate' => 'favorites', 'alias_type' => 'SPELLING_VARIANT', 'auto_replace' => true],
    ['alias' => 'bookmark', 'canonical_candidate' => 'favorite', 'alias_type' => 'SEMANTIC_NEIGHBOR', 'auto_replace' => false,
     'reason' => '북마크와 즐겨찾기는 본 저장소에서 서로 다른 구현이다(Sidebar 즐겨찾기 vs CaseStudy 북마크) — 자동 치환 금지'],
    ['alias' => 'saved item', 'canonical_candidate' => 'favorite', 'alias_type' => 'SEMANTIC_NEIGHBOR', 'auto_replace' => false,
     'reason' => 'saved_report 는 BI 리포트 정의 저장이라 즐겨찾기와 의미가 다르다'],
    ['alias' => 'pinned item', 'canonical_candidate' => 'favorite', 'alias_type' => 'SEMANTIC_NEIGHBOR', 'auto_replace' => false,
     'reason' => "한국어 '고정' 은 대부분 fixed 의미(ST02·ST03 오탐 61건)"],
];

/* 의미 유사 관계 — 이름 유사성만으로 병합하지 않고 관계만 생성 */
$favLike = [];
foreach ($recs as $k => $r) {
    if (preg_match('/favou?rite/i', $r['canonical_name'])) $favLike['favorite'][] = $k;
    elseif (preg_match('/bookmark/i', $r['canonical_name'])) $favLike['bookmark'][] = $k;
    elseif (preg_match('/saved[_ -]?(item|report)/i', $r['canonical_name'])) $favLike['saved'][] = $k;
}
foreach ([['favorite', 'bookmark'], ['favorite', 'saved']] as [$a, $b]) {
    foreach (($favLike[$a] ?? []) as $x) {
        foreach (($favLike[$b] ?? []) as $y) {
            if ($x === $y) continue;
            $addRel('SEMANTICALLY_RELATED', $x, $y, 'LOW', [], [],
                ['이름 유사성 기반 — 병합 금지(§45). 최종 판단은 ST08']);
        }
    }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. 결정적 정렬 → ID 부여 (§8·§9)
 * ══════════════════════════════════════════════════════════════════════════ */
$keys = array_keys($recs);
usort($keys, static function (string $a, string $b) use ($recs): int {
    $ra = $recs[$a]; $rb = $recs[$b];
    return strcmp($ra['entity_type'], $rb['entity_type'])
        ?: strcmp($ra['canonical_key'], $rb['canonical_key'])
        ?: strcmp($ra['source_domain'], $rb['source_domain'])
        ?: strcmp((string)($ra['source_files'][0] ?? ''), (string)($rb['source_files'][0] ?? ''))
        ?: strcmp((string)($ra['source_record_ids'][0] ?? ''), (string)($rb['source_record_ids'][0] ?? ''));
});
$idOf = []; $seq = 0; $records = [];
foreach ($keys as $k) {
    $id = sprintf('FAV-NRM-%06d', ++$seq);
    $idOf[$k] = $id;
    $r = $recs[$k];
    // 정렬 안정화(결정성) — 배열 필드 정렬
    foreach (['source_record_ids', 'source_files', 'source_domains', 'source_revisions',
              'classifications_seen', 'priority_sources', 'confidence_sources', 'resource_types'] as $f) {
        $r[$f] = array_values(array_unique(array_filter($r[$f], static fn($x) => $x !== null && $x !== '')));
        sort($r[$f], SORT_STRING);
    }
    $records[] = array_merge(['normalized_id' => $id], $r);
}
// 관계 ID — 결정적 정렬
$relKeys = array_keys($rels);
sort($relKeys, SORT_STRING);
$relationships = []; $relSeq = 0; $unresolvedRels = 0;
foreach ($relKeys as $rk) {
    $r = $rels[$rk];
    $from = $idOf[$r['from_key']] ?? null;
    $to = $idOf[$r['to_key']] ?? null;
    if ($from === null || $to === null) { $unresolvedRels++; continue; }
    $relationships[] = ['relationship_id' => sprintf('FAV-REL-%06d', ++$relSeq),
        'relationship_type' => $r['relationship_type'], 'from_normalized_id' => $from,
        'to_normalized_id' => $to, 'confidence' => $r['confidence'],
        'evidence_refs' => $r['evidence_refs'], 'attributes' => $r['attributes'],
        'notes' => $r['notes'] ?: ['정규화 파생 관계']];
}
// related_normalized_ids 채우기
$byId = [];
foreach ($records as $i => $r) $byId[$r['normalized_id']] = $i;
foreach ($relationships as $rel) {
    foreach ([[$rel['from_normalized_id'], $rel['to_normalized_id']], [$rel['to_normalized_id'], $rel['from_normalized_id']]] as [$a, $b]) {
        $i = $byId[$a] ?? null;
        if ($i !== null && !in_array($b, $records[$i]['related_normalized_ids'], true)) $records[$i]['related_normalized_ids'][] = $b;
    }
}
foreach ($records as $i => $r) { sort($records[$i]['related_normalized_ids'], SORT_STRING); }

/* ── 충돌 탐지(§55) ────────────────────────────────────────────────────── */
$cflSeq = 0;
foreach ($records as $r) {
    if ($r['status'] === 'CONFLICTING' || count($r['classifications_seen']) > 1) {
        if (!in_array('DIRECT_IMPLEMENTATION_CANDIDATE', $r['classifications_seen'], true)
            || !in_array('FALSE_POSITIVE_CANDIDATE', $r['classifications_seen'], true)) continue;
        $conflicts[] = ['conflict_id' => sprintf('FAV-CFL-%06d', ++$cflSeq),
            'conflict_type' => 'CLASSIFICATION_CONFLICT', 'canonical_key' => $r['canonical_key'],
            'normalized_ids' => [$r['normalized_id']], 'source_record_ids' => $r['source_record_ids'],
            'resolution_status' => 'DEFERRED_TO_CLASSIFICATION', 'severity_candidate' => 'UNKNOWN',
            'requires_manual_review' => true,
            'notes' => ['상충 분류: ' . implode(', ', $r['classifications_seen'])]];
    }
    foreach (['tenant_scope', 'workspace_scope', 'project_scope'] as $s) {
        if ($r[$s] !== 'CONFLICTING') continue;
        $conflicts[] = ['conflict_id' => sprintf('FAV-CFL-%06d', ++$cflSeq),
            'conflict_type' => 'SCOPE_CONFLICT', 'canonical_key' => $r['canonical_key'],
            'normalized_ids' => [$r['normalized_id']], 'source_record_ids' => $r['source_record_ids'],
            'resolution_status' => 'UNRESOLVED', 'severity_candidate' => 'UNKNOWN',
            'requires_manual_review' => true, 'notes' => ["$s 값이 근거 간 상충"]];
    }
    if ($r['entity_type'] === 'PACKAGE' && count((array)($r['attributes']['resolved_versions'] ?? [])) > 1) {
        $conflicts[] = ['conflict_id' => sprintf('FAV-CFL-%06d', ++$cflSeq),
            'conflict_type' => 'PACKAGE_VERSION_CONFLICT', 'canonical_key' => $r['canonical_key'],
            'normalized_ids' => [$r['normalized_id']], 'source_record_ids' => $r['source_record_ids'],
            'resolution_status' => 'UNRESOLVED', 'severity_candidate' => 'UNKNOWN',
            'requires_manual_review' => true, 'notes' => ['복수 Resolved Version']];
    }
}

// ★상류(ST04) 파서 결함을 충돌로 승격 — 산출물을 고치는 대신 되돌려 보고한다(§119 준수).
foreach ($sqlKeywordFps as $fp2) {
    $conflicts[] = ['conflict_id' => sprintf('FAV-CFL-%06d', ++$cflSeq),
        'conflict_type' => 'UPSTREAM_SQL_KEYWORD_AS_TABLE_NAME',
        'canonical_key' => $fp2['canonical_key'],
        'normalized_ids' => array_values(array_filter([$idOf[$fp2['canonical_key']] ?? null])),
        'source_record_ids' => [$fp2['migration']],
        'resolution_status' => 'UNRESOLVED', 'severity_candidate' => 'LOW',
        'requires_manual_review' => true,
        'notes' => ["ST04 migration 파서가 `IF NOT EXISTS` 의 SQL 키워드 '{$fp2['table']}' 를 "
            . "affected_table 로 추출했다(출처 {$fp2['file']}). 실재 테이블이 아니므로 ST08 분류에서 제거해야 한다. "
            . '본 Step 은 상류 산출물 수정이 금지(§119)라 충돌로만 기록한다.']];
}

/* ── 민감정보 재검증 후 스크럽 ─────────────────────────────────────────── */
$records = $scrub($records);
$relationships = $scrub($relationships);

/* ══════════════════════════════════════════════════════════════════════════
 * 6. 통계 · 출력
 * ══════════════════════════════════════════════════════════════════════════ */
$byType = []; $byDomain = []; $byClass = []; $byPrio = []; $byConf = []; $byStatus = [];
foreach ($records as $r) {
    $byType[$r['entity_type']] = ($byType[$r['entity_type']] ?? 0) + 1;
    $byDomain[$r['source_domain']] = ($byDomain[$r['source_domain']] ?? 0) + 1;
    $byClass[$r['classification']] = ($byClass[$r['classification']] ?? 0) + 1;
    $byPrio[$r['priority']] = ($byPrio[$r['priority']] ?? 0) + 1;
    $byConf[$r['confidence']] = ($byConf[$r['confidence']] ?? 0) + 1;
    $byStatus[$r['status']] = ($byStatus[$r['status']] ?? 0) + 1;
}
$byRelType = [];
foreach ($relationships as $x) $byRelType[$x['relationship_type']] = ($byRelType[$x['relationship_type']] ?? 0) + 1;
$byCflType = [];
foreach ($conflicts as $x) $byCflType[$x['conflict_type']] = ($byCflType[$x['conflict_type']] ?? 0) + 1;
ksort($byType); ksort($byDomain); ksort($byClass); ksort($byPrio); ksort($byConf); ksort($byStatus); ksort($byRelType); ksort($byCflType);

$inputRecordTotal = array_sum(array_column($inputs, 'record_count'));
// ★파생 레코드 = 입력 원본 ID 없이 정규화 과정에서 합성된 것(FILE·Controller Method·Migration 참조 테이블 등).
//   1533 > 1099 의 정체를 추정이 아니라 실측으로 분해한다.
$derived = 0;
foreach ($records as $r) if ($r['source_record_ids'] === []) $derived++;

$stats = [
    'input_files' => count($inputs),
    'inputs_available' => count(array_filter($inputs, static fn($i) => $i['status'] === 'AVAILABLE')),
    'inputs_empty_valid' => count(array_filter($inputs, static fn($i) => $i['status'] === 'EMPTY_VALID')),
    'inputs_missing' => count(array_filter($inputs, static fn($i) => str_starts_with($i['status'], 'MISSING'))),
    'inputs_invalid' => count(array_filter($inputs, static fn($i) => $i['status'] === 'INVALID_JSON')),
    'revision_status' => $revisionStatus, 'revisions' => $revList,
    'input_record_total' => $inputRecordTotal,
    'raw_match_records' => $rawTotal,
    'total_normalized_records' => count($records),
    'records_with_source_record_id' => count($records) - $derived,
    'derived_records' => $derived,
    'merge_events' => $mergeEvents,
    'total_relationships' => count($relationships),
    'unresolved_relationships_dropped' => $unresolvedRels,
    'total_conflicts' => count($conflicts),
    'total_exclusions' => count($excl),
    'total_aliases' => count($aliases),
    'auto_replace_aliases' => count(array_filter($aliases, static fn($a) => $a['auto_replace'])),
    'manual_review_aliases' => count(array_filter($aliases, static fn($a) => !$a['auto_replace'])),
    'sensitive_values_redacted' => $sensitiveHits,
    'orphan_records' => $byStatus['ORPHANED'] ?? 0,
    'by_entity_type' => $byType, 'by_source_domain' => $byDomain,
    'by_classification' => $byClass, 'by_priority' => $byPrio,
    'by_confidence' => $byConf, 'by_status' => $byStatus,
    'by_relationship_type' => $byRelType, 'by_conflict_type' => $byCflType,
];

$now = gmdate('c');
$w = static function (string $rel, array $d) use ($safeWrite): void {
    $abs = $safeWrite($rel);
    if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0775, true);
    file_put_contents($abs, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST07] 생성: $rel\n";
};
$head = ['specification_id' => SPEC_ID, 'schema_version' => SCHEMA_VERSION,
    'source_revisions' => $revList, 'generated_at' => $now];

$w($OUT . '/favorites-normalization-input-status.json', ['specification_id' => SPEC_ID,
    'revision_status' => $revisionStatus, 'revisions' => $revList,
    'revision_note' => 'ST02~ST06 은 순차 커밋이라 리비전이 다르다. 리비전 간 diff 가 tools/cwis·docs/cwis 로 한정됨을 확인해 PARTIAL_MATCH 로 진행(§58).',
    'inputs' => $inputs]);
$w($OUT . '/favorites-normalized-records.json', $head + ['statistics' => $stats, 'records' => $records]);
$w($OUT . '/favorites-normalized-relationships.json', $head + ['relationship_count' => count($relationships), 'relationships' => $relationships]);
$w($OUT . '/favorites-normalization-conflicts.json', $head + ['conflict_count' => count($conflicts), 'conflicts' => $conflicts]);
$w($OUT . '/favorites-normalization-aliases.json', $head + ['alias_count' => count($aliases), 'aliases' => $aliases]);
$w($OUT . '/favorites-normalization-statistics.json', $head + ['statistics' => $stats]);
$w($OUT . '/favorites-normalization-exclusions.json', $head + ['exclusion_count' => count($excl), 'exclusions' => $excl]);

/* ── Schema 3종 ────────────────────────────────────────────────────────── */
$idPat = static fn(string $p): array => ['type' => 'string', 'pattern' => $p];
$w($SCH . '/favorites-normalized-record.schema.json', [
    '$schema' => 'http://json-schema.org/draft-07/schema#',
    'title' => 'CWIS Favorites Normalized Record',
    'type' => 'object',
    'required' => ['normalized_id', 'entity_type', 'canonical_key', 'canonical_name', 'source_domain',
        'source_record_ids', 'source_files', 'classification', 'priority', 'confidence', 'status', 'attributes'],
    'properties' => [
        'normalized_id' => $idPat('^FAV-NRM-\\d{6}$'),
        'entity_type' => ['type' => 'string', 'enum' => ['FILE', 'SYMBOL', 'COMPONENT', 'STATE_UNIT', 'API_ENDPOINT',
            'API_CONTROLLER', 'API_REQUEST', 'API_RESPONSE', 'MIDDLEWARE', 'OPENAPI_OPERATION', 'DATABASE_TABLE',
            'DATABASE_COLUMN', 'DATABASE_CONSTRAINT', 'DATABASE_INDEX', 'ORM_MAPPING', 'MIGRATION', 'TEST_CASE',
            'TEST_ASSET', 'PACKAGE', 'DEPENDENCY_USAGE', 'CI_JOB', 'RISK_CANDIDATE', 'GAP_CANDIDATE', 'RAW_MATCH', 'UNKNOWN']],
        'canonical_key' => ['type' => 'string', 'minLength' => 1],
        'canonical_name' => ['type' => 'string'],
        'source_domain' => ['type' => 'string', 'enum' => ['BACKEND', 'FRONTEND', 'DATABASE', 'API', 'TEST', 'PACKAGE', 'CI', 'CROSS_DOMAIN', 'UNKNOWN']],
        'source_record_ids' => ['type' => 'array', 'items' => ['type' => 'string'], 'uniqueItems' => true],
        'source_files' => ['type' => 'array', 'items' => ['type' => 'string', 'pattern' => '^(?!/)(?![A-Za-z]:)(?!.*\\.\\.).*$'], 'uniqueItems' => true],
        'classification' => ['type' => 'string', 'enum' => ['UNKNOWN', 'DIRECT_IMPLEMENTATION_CANDIDATE',
            'RELATED_INFRASTRUCTURE_CANDIDATE', 'LEGACY_CANDIDATE', 'FALSE_POSITIVE_CANDIDATE', 'DOCUMENTATION_ONLY',
            'TEST_ONLY', 'PACKAGE_ONLY', 'RISK_CANDIDATE', 'GAP_CANDIDATE', 'CONFLICTING']],
        'priority' => ['type' => 'string', 'enum' => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'IGNORE_CANDIDATE', 'UNKNOWN']],
        'confidence' => ['type' => 'string', 'enum' => ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']],
        'status' => ['type' => 'string', 'enum' => ['ACTIVE_CANDIDATE', 'MERGED', 'CONFLICTING', 'ORPHANED',
            'INVALID_SOURCE', 'DEPRECATED_CANDIDATE', 'IGNORED_CANDIDATE', 'UNKNOWN']],
        'tenant_scope' => ['type' => 'string', 'enum' => ['YES', 'NO', 'UNKNOWN', 'CONFLICTING', 'NOT_APPLICABLE']],
        'workspace_scope' => ['type' => 'string', 'enum' => ['YES', 'NO', 'UNKNOWN', 'CONFLICTING', 'NOT_APPLICABLE']],
        'project_scope' => ['type' => 'string', 'enum' => ['YES', 'NO', 'UNKNOWN', 'CONFLICTING', 'NOT_APPLICABLE']],
        'attributes' => ['type' => 'object'],
    ],
]);
$w($SCH . '/favorites-normalized-relationship.schema.json', [
    '$schema' => 'http://json-schema.org/draft-07/schema#',
    'title' => 'CWIS Favorites Normalized Relationship', 'type' => 'object',
    'required' => ['relationship_id', 'relationship_type', 'from_normalized_id', 'to_normalized_id', 'confidence'],
    'properties' => [
        'relationship_id' => $idPat('^FAV-REL-\\d{6}$'),
        'relationship_type' => ['type' => 'string', 'enum' => ['DEFINED_IN', 'CONTAINS', 'CALLS', 'USES', 'DEPENDS_ON',
            'IMPLEMENTS', 'MAPS_TO', 'EXPOSES', 'HANDLES', 'VALIDATES_WITH', 'RETURNS', 'PROTECTED_BY', 'DOCUMENTS',
            'POTENTIAL_DOCUMENTS', 'TESTS', 'MOCKS', 'CREATES', 'ALTERS', 'DROPS', 'RENAMES', 'REFERENCES', 'SCOPED_BY',
            'CACHED_BY', 'PUBLISHES', 'LISTENS_TO', 'QUEUES', 'IMPORTS', 'DECLARED_BY', 'RESOLVED_BY',
            'SEMANTICALLY_RELATED', 'POTENTIAL_DUPLICATE', 'POTENTIAL_MATCH', 'POTENTIAL_REPLACEMENT', 'ALIAS_CANDIDATE', 'UNKNOWN']],
        'from_normalized_id' => $idPat('^FAV-NRM-\\d{6}$'),
        'to_normalized_id' => $idPat('^FAV-NRM-\\d{6}$'),
        'confidence' => ['type' => 'string', 'enum' => ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']],
    ],
]);
$w($SCH . '/favorites-normalization-conflict.schema.json', [
    '$schema' => 'http://json-schema.org/draft-07/schema#',
    'title' => 'CWIS Favorites Normalization Conflict', 'type' => 'object',
    'required' => ['conflict_id', 'conflict_type', 'canonical_key', 'normalized_ids', 'resolution_status'],
    'properties' => [
        'conflict_id' => $idPat('^FAV-CFL-\\d{6}$'),
        'conflict_type' => ['type' => 'string'],
        'canonical_key' => ['type' => 'string', 'minLength' => 1],
        'normalized_ids' => ['type' => 'array', 'minItems' => 1, 'items' => $idPat('^FAV-NRM-\\d{6}$')],
        'resolution_status' => ['type' => 'string', 'enum' => ['UNRESOLVED', 'AUTO_RESOLVED', 'NOT_A_CONFLICT', 'DEFERRED_TO_CLASSIFICATION']],
        'severity_candidate' => ['type' => 'string'],
        'requires_manual_review' => ['type' => 'boolean'],
    ],
]);

printf("[ST07] 입력 %d(레코드 %d) · 정규화 %d · 관계 %d · 충돌 %d · 제외 %d · 고아 %d · 마스킹 %d · Revision %s\n",
    count($inputs), $inputRecordTotal, count($records), count($relationships), count($conflicts),
    count($excl), $stats['orphan_records'], $sensitiveHits, $revisionStatus);

if ($strict) {
    $bad = [];
    if ($stats['inputs_invalid'] > 0) $bad[] = 'INVALID_JSON';
    if ($unresolvedRels > 0) $bad[] = 'UNRESOLVED_RELATION';
    if ($sensitiveHits > 0) $bad[] = 'SENSITIVE_DATA_DETECTED';
    if ($bad !== []) { fwrite(STDERR, '[ST07] strict 위반: ' . implode(', ', $bad) . "\n"); exit(1); }
}
exit(0);
