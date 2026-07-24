<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST02 — Backend Favorites Keyword Search.
 *
 * ST01 의 favorites-search-scope.json 을 입력으로 PHP 백엔드만 정적 검색한다.
 *
 * ★안전 계약(명세 §24·§65):
 *   - 대상 PHP 를 **실행하지 않는다**(include/eval/require 없음). token_get_all 정적 토큰화만 사용.
 *   - DB·Redis·Queue·네트워크 연결 없음. Application Boot 없음.
 *   - 출력은 tools/cwis/navigation/output/ 하위로 강제(경로 탈출 차단).
 *
 * ★교차검증 반영(명세 §7 vs 실측):
 *   app/ src/ modules/ packages/ plugins/ bootstrap/ routes/ 는 **전부 부재**.
 *   config/ 는 존재하나 PHP 파일 0개. 실제 백엔드 PHP 는 backend/src(140) + backend/bin(39) 뿐이다.
 *
 * ★노이즈 방지(명세 §15 "즐겨찾기 관련 결과 주변에서 확인"):
 *   tenant_id 는 backend/src 전역에 3,025회 출현한다. 전역 검색하면 결과가 무의미해지므로
 *   컨텍스트 키워드는 **즐겨찾기 히트 라인 ±PROXIMITY 범위에서만** 평가한다.
 *
 * 사용:
 *   php tools/cwis/navigation/scripts/search-favorites-backend.php [--dry-run]
 *       [--scope=...] [--output=...] [--inventory-output=...] [--symbols-output=...]
 *       [--max-file-size=5242880] [--fail-on-read-error-rate=0.2]
 *
 * 종료코드: 0=정상, 1=읽기 실패율 초과, 2=설정/입력 오류.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST02';
const PROXIMITY = 12;              // 컨텍스트 판정 반경(줄)
const MAX_MATCHED_TEXT = 300;      // 명세 §31
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

/* ── 인자 ──────────────────────────────────────────────────────────────── */
$argvv = $argv;
array_shift($argvv);
$opt = static function (string $name, ?string $def = null) use ($argvv): ?string {
    foreach ($argvv as $a) {
        if ($a === "--$name") return '1';
        if (str_starts_with($a, "--$name=")) return substr($a, strlen($name) + 3);
    }
    return $def;
};

$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . DIRECTORY_SEPARATOR . 'backend')) {
    fwrite(STDERR, "[ST02] 프로젝트 루트 탐지 실패\n");
    exit(2);
}
$rootReal = $ROOT;

$scopePath   = $opt('scope', 'tools/cwis/navigation/favorites-search-scope.json');
$outRaw      = $opt('output', 'tools/cwis/navigation/output/favorites-backend-raw-results.json');
$outFiles    = $opt('inventory-output', 'tools/cwis/navigation/output/favorites-backend-file-inventory.json');
$outSymbols  = $opt('symbols-output', 'tools/cwis/navigation/output/favorites-backend-symbol-inventory.json');
$maxFileSize = (int)($opt('max-file-size', (string)DEFAULT_MAX_FILE_SIZE));
$failRate    = (float)($opt('fail-on-read-error-rate', '0.2'));
$dryRun      = $opt('dry-run') === '1';

/** 출력 경로 화이트리스트 — output 디렉터리 밖 쓰기 차단. */
$safeOut = static function (string $rel) use ($rootReal): string {
    if ($rel === '' || $rel[0] === '/' || preg_match('#^[A-Za-z]:#', $rel) || str_contains($rel, '..')) {
        fwrite(STDERR, "[ST02] 허용되지 않는 출력 경로: $rel\n");
        exit(2);
    }
    if (!str_starts_with(str_replace('\\', '/', $rel), 'tools/cwis/navigation/output/')) {
        fwrite(STDERR, "[ST02] 출력은 tools/cwis/navigation/output/ 하위여야 한다: $rel\n");
        exit(2);
    }
    return $rootReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
};

/* ── Scope 로드 ────────────────────────────────────────────────────────── */
$scopeAbs = $rootReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $scopePath);
if (!is_file($scopeAbs)) {
    fwrite(STDERR, "[ST02] scope 파일 없음: $scopePath\n");
    exit(2);
}
try {
    $scope = json_decode((string)file_get_contents($scopeAbs), true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    fwrite(STDERR, "[ST02] scope JSON 파싱 실패: {$e->getMessage()}\n");
    exit(2);
}

/* ── 백엔드 검색 루트: scope include ∩ 실제 PHP 보유 경로 ──────────────── */
$backendCandidates = ['backend/src', 'backend/bin', 'app', 'src', 'modules', 'packages', 'plugins', 'config', 'routes'];
$searchRoots = [];
$skippedRoots = [];
foreach ($backendCandidates as $cand) {
    if (!in_array($cand, (array)($scope['include_directories'] ?? []), true)) {
        $skippedRoots[$cand] = 'scope include_directories 에 없음';
        continue;
    }
    $abs = $rootReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cand);
    if (!is_dir($abs)) { $skippedRoots[$cand] = '디렉터리 부재'; continue; }
    $searchRoots[] = $cand;
}

$excludeDirs = array_map(
    static fn(string $d): string => str_replace('\\', '/', $d),
    (array)($scope['exclude_directories'] ?? [])
);
$extensions = ['php', 'inc', 'module'];

/* ── 파일 수집 ─────────────────────────────────────────────────────────── */
$files = [];
$failures = [];
$largeFiles = [];
$symlinkSkipped = [];

$collect = static function (string $relRoot) use (
    $rootReal, $excludeDirs, $extensions, $maxFileSize,
    &$files, &$failures, &$largeFiles, &$symlinkSkipped
): void {
    $absRoot = $rootReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relRoot);
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($absRoot, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $info) {
        /** @var SplFileInfo $info */
        $abs = $info->getPathname();
        $rel = str_replace('\\', '/', substr($abs, strlen($rootReal) + 1));

        foreach ($excludeDirs as $ex) {
            if ($rel === $ex || str_starts_with($rel, $ex . '/')) continue 2;
        }
        if ($info->isLink()) {
            // ★프로젝트 외부를 가리키는 symlink 는 검색하지 않는다(명세 §32)
            $target = @realpath($abs);
            if ($target === false || !str_starts_with($target, $rootReal . DIRECTORY_SEPARATOR)) {
                $symlinkSkipped[] = $rel;
                continue;
            }
        }
        if (!$info->isFile()) continue;
        $ext = strtolower($info->getExtension());
        if (!in_array($ext, $extensions, true)) continue;

        $size = $info->getSize();
        if ($size !== false && $size > $maxFileSize) {
            $largeFiles[] = ['file_path' => $rel, 'size_bytes' => $size];
        }
        if (!$info->isReadable()) {
            $failures[] = ['file_path' => $rel, 'reason' => 'FILE_NOT_READABLE'];
            continue;
        }
        $files[$rel] = $size ?: 0;
    }
};

foreach ($searchRoots as $r) $collect($r);
ksort($files);

/* ── Dry Run ───────────────────────────────────────────────────────────── */
if ($dryRun) {
    echo "[ST02 --dry-run]\n";
    echo "  검색 루트   : " . (implode(', ', $searchRoots) ?: '(없음)') . "\n";
    echo "  제외된 후보 : " . json_encode($skippedRoots, JSON_UNESCAPED_UNICODE) . "\n";
    echo "  제외 디렉터리: " . count($excludeDirs) . "개\n";
    echo "  확장자      : " . implode(', ', $extensions) . "\n";
    echo "  예상 파일 수: " . count($files) . "\n";
    echo "  검색 엔진   : PHP native (preg + token_get_all)\n";
    echo "  출력        : $outRaw\n                $outFiles\n                $outSymbols\n";
    exit(0);
}

/* ── 검색 패턴 ─────────────────────────────────────────────────────────── */
/**
 * 짧고 모호한 어휘(pin/star/고정/핀)는 **단어 경계**를 강제해 오탐을 줄인다.
 * favorite/bookmark 계열은 부분 문자열 매칭으로도 안전하다.
 */
$patterns = [
    // [정규식, 대표 키워드, 그룹]
    ['/favou?rites?/i',                         'favorite',        'PRIMARY'],
    ['/bookmarks?/i',                           'bookmark',        'PRIMARY'],
    ['/\bstarred\b|\bunstar\b/i',               'starred',         'PRIMARY'],
    ['/\bpinned\b|\bunpin\b|\bpinItem\b/i',     'pinned',          'PRIMARY'],
    ['/saved_items?|savedItems?/i',             'saved_item',      'PRIMARY'],
    ['/user_favou?rites?|user_bookmarks?/i',    'user_favorite',   'PRIMARY'],
    ['/즐겨\s*찾기/u',                            '즐겨찾기',          'PRIMARY_KO'],
    ['/북마크/u',                                 '북마크',            'PRIMARY_KO'],
    ['/저장한 항목|저장된 항목/u',                    '저장한 항목',       'PRIMARY_KO'],
    // ★한글은 \b 가 없다. 앞에 한글이 붙으면 다른 낱말의 일부다(예: '월별표'=monthly table) → 선행 한글 배제.
    ['/(?<![가-힣])별표(?![가-힣])/u',              '별표',             'PRIMARY_KO'],
    ['/\b고정\b|고정한|고정된/u',                    '고정',             'PRIMARY_KO'],
    ['/favoritable|bookmarkable/i',             'favoritable',     'POLYMORPHIC'],
    ['/is_favou?rite|isFavou?rite/i',           'is_favorite',     'PROPERTY'],
    ['/is_pinned|isPinned|pinned_at|starred_at/i', 'is_pinned',    'PROPERTY'],
    ['/(add|remove|toggle|mark|unmark|is)(Favou?rite|Bookmark|Pinned)/i', 'method_pattern', 'METHOD'],
];

/** 히트 주변에서만 평가하는 컨텍스트 신호(전역 검색 금지 — §15). */
$contextSignals = [
    'tenant_aware'            => '/\btenant_id\b|TenantScope|CurrentTenant/i',
    'workspace_aware'         => '/\bworkspace_id\b|WorkspaceScope|WorkspaceContext/i',
    'project_aware'           => '/\bproject_id\b|ProjectContext/i',
    'user_scoped'             => '/\buser_id\b|\bprincipal_id\b|authedUser|currentUser/i',
    'authorization_detected'  => '/authorize|denyAccessUnlessGranted|Gate::|Voter|::gate\(|requirePlan|hasMenuAccess/i',
    'repository_detected'     => '/Repository|->prepare\(|->query\(/i',
    'polymorphic_detected'    => '/morphTo|morphMany|morphOne|resource_type|entity_type|subject_type/i',
    'domain_event_detected'   => '/dispatch\(|EventBus|Outbox|recordThat/i',
    'queue_detected'          => '/ShouldQueue|Queue::|dispatchAfterCommit|_cron/i',
    'cache_detected'          => '/Cache|Redis|remember\(|ETag|memo/i',
    'audit_detected'          => '/auditLog|AuditLog|SecurityAudit|activity_log/i',
    'navigation_integration_detected' => '/menu_key|NavigationItem|NavigationRegistry|SidebarDTO|sidebarManifest/i',
    'preference_integration_detected' => '/UserPreference|preference|user_setting|menu_visibility/i',
    'test_detected'           => '/selftest|assert|PHPUnit|Test\b/i',
];

/** 오탐 후보 규칙(명세 §33) — 삭제하지 않고 표시만 한다. */
$falsePositiveRules = [
    // ★bookmarklet = 온사이트 CRO 편집기를 주소창에서 실행하는 JS 스니펫. '북마크 기능'과 무관하다.
    ['/bookmarklet/i',                    'JS_BOOKMARKLET'],
    ['/rating|평점|별점|review/i',        'RATING_STAR'],
    ['/css|class=|style=|icon/i',        'CSS_OR_ICON'],
    // ★한국어 '고정' 은 본 저장소에서 대부분 "fixed(값·주기·단가)" 의미다 — 즐겨찾기 고정과 무관.
    ['/고정\s*(비|값|폭|길이|소수|환율|단가|주기|간격|배송비|수수료|헤더|IP)/u', 'KO_FIXED_VALUE'],
    ['/(로|으로|를|은|는|이|가)?\s*고정(\)|\.|,|·|$| )/u', 'KO_FIXED_VALUE'],
    ['/^\s*(\*|\/\/|#)/',                 'COMMENT_ONLY'],
];

/** 본 CWIS 작업 자체가 만든 코드(자기참조) — 기존 구현 근거가 아니다. */
$selfReferenceRe = '#^(backend/bin/navigation_|backend/src/Handlers/PM/(Navigation|NavigationContext|Collaboration)\.php|tools/cwis/)#';

$sensitivePatterns = (array)($scope['sensitive_patterns'] ?? []);

/** 민감값 마스킹 — 키는 남기고 값만 [REDACTED] (§31). */
$maskCount = 0;
$mask = static function (string $line) use ($sensitivePatterns, &$maskCount): string {
    $out = $line;
    foreach ($sensitivePatterns as $p) {
        $q = preg_quote($p, '/');
        $new = preg_replace(
            ['/(' . $q . '\s*[=:]\s*)([\'"])(?:(?!\2).){3,}\2/i', '/(' . $q . '\s*=>\s*)([\'"])(?:(?!\2).){3,}\2/i'],
            '$1$2[REDACTED]$2',
            $out
        );
        if ($new !== null && $new !== $out) { $maskCount++; $out = $new; }
    }
    // Bearer 토큰·PEM 등 값 자체
    $new = preg_replace('/(Bearer\s+)[A-Za-z0-9._\-]{16,}/i', '$1[REDACTED]', $out);
    if ($new !== null && $new !== $out) { $maskCount++; $out = $new; }
    if (preg_match('/BEGIN (RSA )?PRIVATE KEY/', $out)) { $maskCount++; $out = '[REDACTED PRIVATE KEY]'; }
    return $out;
};

/* ── Layer 추정(명세 §34 + 저장소 실제 구조) ───────────────────────────── */
$guessLayer = static function (string $rel): string {
    $r = strtolower($rel);
    return match (true) {
        str_contains($r, 'backend/bin/')                  => 'QUEUE',        // cron/CLI
        str_contains($r, '/handlers/pm/')                 => 'HTTP_API',
        str_contains($r, '/handlers/')                    => 'HTTP_API',
        str_contains($r, 'routes.php')                    => 'HTTP_API',
        str_contains($r, 'securityaudit') || str_contains($r, 'crypto') => 'SECURITY',
        str_contains($r, '/db.php') || str_contains($r, 'migrate')      => 'INFRASTRUCTURE',
        str_contains($r, '/utils/')                       => 'INFRASTRUCTURE',
        default                                           => 'UNKNOWN',
    };
};

/* ── PHP 토큰 기반 심볼 추출(패키지 설치 없음 — token_get_all 내장) ────── */
/**
 * @return array{namespace:?string, symbols:array<int,array{name:string,type:string,line:int,end:int}>}
 */
$extractSymbols = static function (string $code): array {
    $tokens = @token_get_all($code);
    if (!is_array($tokens)) return ['namespace' => null, 'symbols' => []];
    $ns = null;
    $symbols = [];
    $n = count($tokens);
    $depth = 0;
    $classStack = [];   // [name, braceDepth]
    for ($i = 0; $i < $n; $i++) {
        $t = $tokens[$i];
        if (is_string($t)) {
            if ($t === '{') $depth++;
            elseif ($t === '}') {
                $depth--;
                while ($classStack && end($classStack)[1] >= $depth) array_pop($classStack);
            }
            continue;
        }
        [$id, $text, $line] = [$t[0], $t[1], $t[2]];
        if ($id === T_NAMESPACE) {
            $buf = '';
            for ($j = $i + 1; $j < $n; $j++) {
                if (is_string($tokens[$j])) { if ($tokens[$j] === ';' || $tokens[$j] === '{') break; continue; }
                if (in_array($tokens[$j][0], [T_STRING, T_NS_SEPARATOR], true)
                    || (defined('T_NAME_QUALIFIED') && $tokens[$j][0] === T_NAME_QUALIFIED)) {
                    $buf .= $tokens[$j][1];
                }
            }
            $ns = $buf !== '' ? $buf : null;
            continue;
        }
        $typeMap = [T_CLASS => 'CLASS', T_INTERFACE => 'INTERFACE', T_TRAIT => 'TRAIT', T_FUNCTION => 'FUNCTION'];
        if (defined('T_ENUM')) $typeMap[T_ENUM] = 'ENUM';
        if (isset($typeMap[$id])) {
            // 익명 클래스/클로저 제외
            for ($j = $i + 1; $j < $n; $j++) {
                if (is_array($tokens[$j]) && in_array($tokens[$j][0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) continue;
                if (is_array($tokens[$j]) && $tokens[$j][0] === T_STRING) {
                    $name = $tokens[$j][1];
                    $type = $typeMap[$id];
                    if ($type === 'FUNCTION' && $classStack) $type = 'METHOD';
                    $symbols[] = ['name' => $name, 'type' => $type, 'line' => $line, 'end' => PHP_INT_MAX];
                    if (in_array($type, ['CLASS', 'INTERFACE', 'TRAIT', 'ENUM'], true)) {
                        $classStack[] = [$name, $depth];
                    }
                }
                break;
            }
            continue;
        }
        if ($id === T_CONST) {
            for ($j = $i + 1; $j < $n; $j++) {
                if (is_array($tokens[$j]) && $tokens[$j][0] === T_WHITESPACE) continue;
                if (is_array($tokens[$j]) && $tokens[$j][0] === T_STRING) {
                    $symbols[] = ['name' => $tokens[$j][1], 'type' => 'CONSTANT', 'line' => $line, 'end' => PHP_INT_MAX];
                }
                break;
            }
        }
    }
    return ['namespace' => $ns, 'symbols' => $symbols];
};

/** 특정 줄을 감싸는 가장 가까운 심볼(선언 줄 기준 최근접 상위). */
$enclosing = static function (array $symbols, int $line): array {
    $best = null;
    foreach ($symbols as $s) {
        if ($s['line'] <= $line && ($best === null || $s['line'] > $best['line'])) $best = $s;
    }
    return $best ?? ['name' => null, 'type' => 'UNKNOWN', 'line' => 0];
};

/* ── 검색 실행 ─────────────────────────────────────────────────────────── */
$results = [];
$fileAgg = [];
$symbolAgg = [];
$seen = [];
$rawMatchCount = 0;
$idSeq = 0;

foreach ($files as $rel => $size) {
    $abs = $rootReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $content = @file_get_contents($abs);
    if ($content === false) { $failures[] = ['file_path' => $rel, 'reason' => 'FILE_NOT_READABLE']; continue; }
    if ($content !== '' && !mb_check_encoding($content, 'UTF-8')) {
        $failures[] = ['file_path' => $rel, 'reason' => 'INVALID_ENCODING'];
        continue;
    }
    $lines = preg_split('/\R/u', $content);
    if ($lines === false) { $failures[] = ['file_path' => $rel, 'reason' => 'PARSER_FAILED']; continue; }

    // 1차 스캔: 이 파일에 즐겨찾기 후보가 있는가(없으면 토큰화 생략 — 성능)
    $lineHits = [];
    foreach ($lines as $idx => $lineText) {
        foreach ($patterns as [$re, $kw, $grp]) {
            if (@preg_match($re, $lineText, $m, PREG_OFFSET_CAPTURE) === 1) {
                $rawMatchCount++;
                $ln = $idx + 1;
                $col = isset($m[0][1]) ? (int)$m[0][1] + 1 : 1;
                if (!isset($lineHits[$ln])) {
                    $lineHits[$ln] = ['keywords' => [], 'groups' => [], 'column' => $col, 'text' => $lineText];
                }
                if (!in_array($kw, $lineHits[$ln]['keywords'], true)) $lineHits[$ln]['keywords'][] = $kw;
                if (!in_array($grp, $lineHits[$ln]['groups'], true)) $lineHits[$ln]['groups'][] = $grp;
            }
        }
    }
    if (!$lineHits) continue;

    // 심볼 추출(히트 있는 파일만)
    $sym = $extractSymbols($content);

    foreach ($lineHits as $ln => $hit) {
        $dedupKey = $rel . ':' . $ln . ':' . $hit['column'];
        if (isset($seen[$dedupKey])) continue;
        $seen[$dedupKey] = true;

        // 컨텍스트 신호는 ±PROXIMITY 범위에서만 평가
        $from = max(0, $ln - 1 - PROXIMITY);
        $to = min(count($lines) - 1, $ln - 1 + PROXIMITY);
        $window = implode("\n", array_slice($lines, $from, $to - $from + 1));
        $flags = [];
        foreach ($contextSignals as $flag => $re) {
            $flags[$flag] = preg_match($re, $window) === 1;
        }

        // 오탐 후보 판정
        $ignoreReason = null;
        foreach ($falsePositiveRules as [$re, $reason]) {
            if (preg_match($re, $hit['text']) === 1) { $ignoreReason = $reason; break; }
        }

        $enc = $enclosing($sym['symbols'], $ln);
        $matched = $mask(trim($hit['text']));
        if (mb_strlen($matched) > MAX_MATCHED_TEXT) $matched = mb_substr($matched, 0, MAX_MATCHED_TEXT) . '…';
        $matched = str_replace(["\r", "\n", "\t"], ['\\r', '\\n', '\\t'], $matched);

        $isSelfRef = preg_match($selfReferenceRe, $rel) === 1;
        if ($isSelfRef && $ignoreReason === null) $ignoreReason = 'CWIS_SELF_REFERENCE';

        $classification = $ignoreReason !== null
            ? 'OBVIOUS_FALSE_POSITIVE'
            : (in_array('POLYMORPHIC', $hit['groups'], true) || $flags['polymorphic_detected'] || $flags['preference_integration_detected']
                ? 'POTENTIAL_RELATED_INFRASTRUCTURE'
                : (array_intersect(['PRIMARY', 'METHOD', 'PROPERTY'], $hit['groups'])
                    ? 'POTENTIAL_BACKEND_IMPLEMENTATION'
                    : 'UNKNOWN'));

        $results[] = [
            'result_id' => sprintf('FAV-BE-%06d', ++$idSeq),
            'keyword' => $hit['keywords'][0],
            'matched_keywords' => $hit['keywords'],
            'matched_text' => $matched,
            'file_path' => $rel,
            'line_number' => $ln,
            'column_number' => $hit['column'],
            'language' => 'PHP',
            'layer' => $guessLayer($rel),
            'classification' => $classification,
            'symbol_name' => $enc['name'],
            'symbol_type' => $enc['type'],
            'namespace' => $sym['namespace'],
            'related_resource' => null,
            'tenant_aware' => $flags['tenant_aware'] ? 'YES' : 'UNKNOWN',
            'workspace_aware' => $flags['workspace_aware'] ? 'YES' : 'UNKNOWN',
            'project_aware' => $flags['project_aware'] ? 'YES' : 'UNKNOWN',
            'user_scoped' => $flags['user_scoped'] ? 'YES' : 'UNKNOWN',
            'authorization_detected' => $flags['authorization_detected'] ? 'YES' : 'UNKNOWN',
            'repository_detected' => $flags['repository_detected'],
            'polymorphic_detected' => $flags['polymorphic_detected'],
            'domain_event_detected' => $flags['domain_event_detected'],
            'queue_detected' => $flags['queue_detected'],
            'cache_detected' => $flags['cache_detected'],
            'audit_detected' => $flags['audit_detected'],
            'navigation_integration_detected' => $flags['navigation_integration_detected'],
            'preference_integration_detected' => $flags['preference_integration_detected'],
            'test_detected' => $flags['test_detected'],
            'possibly_generated' => str_contains(strtolower($rel), 'generated') || str_contains(strtolower($rel), '.min.'),
            'self_reference' => $isSelfRef,
            'duplicate_group' => null,
            'ignore_reason' => $ignoreReason,
            'notes' => [],
        ];

        // 파일 집계
        if (!isset($fileAgg[$rel])) {
            $fileAgg[$rel] = ['file_path' => $rel, 'match_count' => 0, 'keywords' => [], 'symbols' => [],
                              'probable_layer' => $guessLayer($rel), 'priority' => 'LOW', 'possibly_generated' => false];
        }
        $fileAgg[$rel]['match_count']++;
        foreach ($hit['keywords'] as $k) if (!in_array($k, $fileAgg[$rel]['keywords'], true)) $fileAgg[$rel]['keywords'][] = $k;
        if ($enc['name'] !== null && !in_array($enc['name'], $fileAgg[$rel]['symbols'], true)) {
            $fileAgg[$rel]['symbols'][] = $enc['name'];
        }

        // 심볼 집계 — 심볼 이름 자체가 즐겨찾기 용어를 포함할 때만 등재(§29 의도)
        if ($enc['name'] !== null && preg_match('/favou?rite|bookmark|pinned|saved_?item|star/i', (string)$enc['name'])) {
            $key = $rel . '#' . $enc['name'];
            if (!isset($symbolAgg[$key])) {
                $symbolAgg[$key] = [
                    'symbol_name' => $enc['name'], 'symbol_type' => $enc['type'],
                    'namespace' => $sym['namespace'], 'file_path' => $rel, 'line_number' => $enc['line'],
                    'matched_keywords' => [], 'probable_layer' => $guessLayer($rel),
                    'priority' => 'HIGH', 'confidence' => 'HIGH',
                ];
            }
            foreach ($hit['keywords'] as $k) {
                if (!in_array($k, $symbolAgg[$key]['matched_keywords'], true)) $symbolAgg[$key]['matched_keywords'][] = $k;
            }
        }
    }
}

/* ── 파일 Priority 판정(명세 §28) ──────────────────────────────────────── */
foreach ($fileAgg as $rel => &$f) {
    $rowsOfFile = array_filter($results, static fn(array $r): bool => $r['file_path'] === $rel);
    $allFalse = $rowsOfFile !== [] && !array_filter($rowsOfFile, static fn(array $r): bool => $r['classification'] !== 'OBVIOUS_FALSE_POSITIVE');
    $hasSymbolName = (bool)array_filter($rowsOfFile, static fn(array $r): bool =>
        $r['symbol_name'] !== null && preg_match('/favou?rite|bookmark|pinned|saved_?item/i', (string)$r['symbol_name']) === 1);
    $hasImpl = (bool)array_filter($rowsOfFile, static fn(array $r): bool => $r['classification'] === 'POTENTIAL_BACKEND_IMPLEMENTATION');
    $hasInfra = (bool)array_filter($rowsOfFile, static fn(array $r): bool => $r['classification'] === 'POTENTIAL_RELATED_INFRASTRUCTURE');

    $f['priority'] = match (true) {
        $allFalse                                   => 'IGNORE_CANDIDATE',
        $hasSymbolName                              => 'HIGH',
        $hasImpl && count($f['keywords']) > 1       => 'HIGH',
        $hasImpl || $hasInfra                       => 'MEDIUM',
        default                                     => 'LOW',
    };
}
unset($f);

/* ── 통계 ──────────────────────────────────────────────────────────────── */
$byLayer = [];
$byClassification = [];
$byPriority = ['HIGH' => 0, 'MEDIUM' => 0, 'LOW' => 0, 'IGNORE_CANDIDATE' => 0];
foreach ($results as $r) {
    $byLayer[$r['layer']] = ($byLayer[$r['layer']] ?? 0) + 1;
    $byClassification[$r['classification']] = ($byClassification[$r['classification']] ?? 0) + 1;
}
foreach ($fileAgg as $f) $byPriority[$f['priority']]++;

$signalCounts = [];
foreach (array_keys($contextSignals) as $flag) {
    $signalCounts[$flag] = count(array_filter($results, static function (array $r) use ($flag): bool {
        $v = $r[$flag] ?? false;
        return $v === true || $v === 'YES';
    }));
}

$totalTargets = count($files) + count($failures);
$readErrorRate = $totalTargets > 0 ? count($failures) / $totalTargets : 0.0;

$revision = null;
$headFile = $rootReal . '/.git/HEAD';
if (is_file($headFile)) {
    $head = trim((string)file_get_contents($headFile));
    if (str_starts_with($head, 'ref: ')) {
        $refFile = $rootReal . '/.git/' . substr($head, 5);
        if (is_file($refFile)) $revision = substr(trim((string)file_get_contents($refFile)), 0, 12);
    } else {
        $revision = substr($head, 0, 12);
    }
}

$meta = [
    'specification_id' => SPEC_ID,
    'source_revision' => $revision,
    'generated_at' => gmdate('c'),
    'search_scope_file' => $scopePath,
    'search_engine' => 'PHP native (preg + token_get_all)',
    'search_roots' => $searchRoots,
    'skipped_root_candidates' => $skippedRoots,
    'proximity_lines' => PROXIMITY,
    'files_scanned' => count($files),
    'files_failed' => count($failures),
    'read_error_rate' => round($readErrorRate, 4),
    'matches_raw' => $rawMatchCount,
    'matches_deduplicated' => count($results),
    'unique_files_with_matches' => count($fileAgg),
    'unique_symbols' => count($symbolAgg),
    'sensitive_values_masked' => $maskCount,
    'symlinks_skipped_outside_root' => $symlinkSkipped,
    'large_files' => $largeFiles,
    'failures' => $failures,
    'by_layer' => $byLayer,
    'by_classification' => $byClassification,
    'by_priority' => $byPriority,
    'context_signal_counts' => $signalCounts,
];

/* ── 출력 ──────────────────────────────────────────────────────────────── */
$writeJson = static function (string $rel, array $data) use ($safeOut): void {
    $abs = $safeOut($rel);
    $dir = dirname($abs);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    file_put_contents($abs, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST02] 생성: $rel\n";
};

$writeJson($outRaw, $meta + ['results' => array_values($results)]);
$writeJson($outFiles, [
    'specification_id' => SPEC_ID,
    'generated_at' => $meta['generated_at'],
    'file_count' => count($fileAgg),
    'files' => array_values($fileAgg),
]);
$writeJson($outSymbols, [
    'specification_id' => SPEC_ID,
    'generated_at' => $meta['generated_at'],
    'extraction_method' => 'PHP token_get_all (내장 — 신규 패키지 설치 없음)',
    'symbol_count' => count($symbolAgg),
    'symbols' => array_values($symbolAgg),
]);

printf(
    "[ST02] 파일 %d개 스캔 · raw %d → dedup %d · 히트파일 %d · 심볼 %d · 마스킹 %d · 실패 %d(%.1f%%)\n",
    $meta['files_scanned'], $rawMatchCount, count($results), count($fileAgg),
    count($symbolAgg), $maskCount, count($failures), $readErrorRate * 100
);

exit($readErrorRate > $failRate ? 1 : 0);
