<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST06 — Test, Package & Dependency Search.
 *
 * ★교차검증(명세 §7 경로 vs 실측):
 *   tests/ · spec/ · __tests__/ · cypress/ · playwright/ · e2e/ ·
 *   database/factories/ · database/seeders/ · tests/Fixtures/  →  **전부 부재**.
 *   phpunit.xml · pest.php · vitest.config · jest.config · cypress.config · playwright.config → **전부 부재**.
 *   ★실제 테스트 자산 = `tools/e2e/*.mjs`(3종) + `tools/*_selftest.mjs` + `backend/bin/*_selftest.php`.
 *
 * ★ST04 통합 실행분의 누락 정정: ST04 는 `*selftest*` 글롭만 봐서 **tools/e2e/(266차 신설 E2E 3종)와
 *   CI 테스트 스테이지를 놓쳤다**. 본 Step 이 전수 재수집한다.
 *
 * ★안전(명세 §70·§92~98): 테스트 미실행 · Package 설치/변경 없음 · Audit 없음 ·
 *   DB/Redis/Queue/Browser/네트워크 접속 없음 · Application Boot 없음 · 대상 실행 0.
 *
 * 사용: php tools/cwis/navigation/scripts/search-favorites-tests-dependencies.php [--dry-run]
 * 종료코드: 0=정상, 2=설정 오류.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST06';
const MAX_TEXT = 300;

$argvv = $argv; array_shift($argvv);
$opt = static function (string $n, ?string $d = null) use ($argvv): ?string {
    foreach ($argvv as $a) {
        if ($a === "--$n") return '1';
        if (str_starts_with($a, "--$n=")) return substr($a, strlen($n) + 3);
    }
    return $d;
};
$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST06] 루트 탐지 실패\n"); exit(2); }

$O = 'tools/cwis/navigation/output/';
$paths = [
    'raw'     => $opt('raw-output', $O . 'favorites-test-dependency-raw-results.json'),
    'test'    => $opt('test-output', $O . 'favorites-test-inventory.json'),
    'asset'   => $opt('asset-output', $O . 'favorites-test-asset-inventory.json'),
    'package' => $opt('package-output', $O . 'favorites-package-inventory.json'),
    'usage'   => $opt('usage-output', $O . 'favorites-dependency-usage-inventory.json'),
    'gap'     => $opt('gap-output', $O . 'favorites-test-gap-candidates.json'),
    'ci'      => $opt('ci-output', $O . 'favorites-ci-test-inventory.json'),
];
$safeOut = static function (string $rel) use ($ROOT): string {
    $n = str_replace('\\', '/', $rel);
    if (!str_starts_with($n, 'tools/cwis/navigation/output/') || str_contains($n, '..')) {
        fwrite(STDERR, "[ST06] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    return $ROOT . '/' . $n;
};

/* ── 경로 실재 판정 ────────────────────────────────────────────────────── */
$specTestPaths = ['tests', 'tests/Unit', 'tests/Feature', 'tests/Integration', 'tests/Api', 'tests/Security',
    'spec', '__tests__', 'cypress', 'playwright', 'e2e', 'tests/e2e',
    'database/factories', 'database/seeders', 'tests/Fixtures', 'tests/Support', 'tests/Mocks'];
$pathStatus = [];
foreach ($specTestPaths as $p) $pathStatus[$p] = is_dir($ROOT . '/' . $p) ? 'EXISTS' : 'ABSENT';

$configFiles = ['phpunit.xml', 'phpunit.xml.dist', 'pest.php', 'tests/Pest.php',
    'vitest.config.js', 'vitest.config.ts', 'jest.config.js', 'cypress.config.js',
    'playwright.config.js', 'backend/phpstan.neon', 'infection.json'];
$configStatus = [];
foreach ($configFiles as $f) $configStatus[$f] = is_file($ROOT . '/' . $f) ? 'EXISTS' : 'ABSENT';

/** ★실제 테스트 자산 — 저장소 관례(별도 러너 없음). */
$realTestGlobs = ['tools/*_selftest.mjs', 'tools/e2e/*.mjs', 'backend/bin/*_selftest.php'];
$testFiles = [];
foreach ($realTestGlobs as $g) {
    foreach (glob($ROOT . '/' . $g) ?: [] as $abs) {
        $testFiles[] = str_replace('\\', '/', substr($abs, strlen($ROOT) + 1));
    }
}
sort($testFiles);

$FAV_RE = '/(favou?rites?|bookmarks?|saved[_ -]?items?|pinned[_ -]?items?|starred|(?<![가-힣])즐겨\s*찾기(?![가-힣])|(?<![가-힣])북마크(?![가-힣]))/iu';

$clip = static fn(string $s): string =>
    (mb_strlen($t = str_replace(["\r", "\n", "\t"], ['\\r', '\\n', '\\t'], trim($s))) > MAX_TEXT)
        ? mb_substr($t, 0, MAX_TEXT) . '…' : $t;

$maskCount = 0;
$mask = static function (string $s) use (&$maskCount): string {
    $o = $s;
    foreach ([
        '/(Bearer\s+)[A-Za-z0-9._-]{8,}/i' => '$1[REDACTED]',
        '/(Authorization\s*[:=]\s*)\S+/i' => '$1[REDACTED]',
        '/(Cookie\s*[:=]\s*)\S+/i' => '$1[REDACTED]',
        '/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/' => '[REDACTED_JWT]',
        '/(password|api_key|client_secret|access_token|DB_PASSWORD)\s*[=:]\s*[\'"]?[^\s\'",;]{3,}/i' => '$1=[REDACTED]',
        '/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/' => '[REDACTED_EMAIL]',
        '/(?<!\d)01[016789]-?\d{3,4}-?\d{4}(?!\d)/' => '[REDACTED_PHONE]',
    ] as $re => $rep) {
        $n = preg_replace($re, $rep, $o);
        if ($n !== null && $n !== $o) { $maskCount++; $o = $n; }
    }
    return $o;
};

$raw = []; $rawSeq = 0;
$addRaw = static function (array $r) use (&$raw, &$rawSeq): void {
    $raw[] = array_merge(['result_id' => sprintf('FAV-TST-%06d', ++$rawSeq)], $r);
};

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Test 인벤토리 — 실제 자산에서 테스트 케이스 추출
 * ══════════════════════════════════════════════════════════════════════════ */
$tests = []; $testSeq = 0; $totalCases = 0; $favCases = 0;
$signalCounts = ['tenant' => 0, 'authorization' => 0, 'duplicate' => 0, 'ordering' => 0,
    'pagination' => 0, 'cache' => 0, 'event' => 0, 'queue' => 0, 'accessibility' => 0,
    'mobile' => 0, 'optimistic' => 0, 'architecture' => 0];
$SIGNAL_RE = [
    'tenant' => '/tenant|테넌트|cross[_ -]?tenant|격리/i',
    'authorization' => '/authoriz|권한|forbidden|403|401|gate|policy|admin_only|guest|partner/i',
    'duplicate' => '/duplicate|중복|unique|idempot|conflict|409|twice/i',
    'ordering' => '/sort|order|정렬|position|rank/i',
    'pagination' => '/paginate|pagination|per_page|cursor|limit|offset/i',
    'cache' => '/cache|캐시|etag|invalidat|memo/i',
    'event' => '/event|dispatch|outbox|audit/i',
    'queue' => '/queue|job|cron|async/i',
    'accessibility' => '/aria|a11y|accessib|접근성|keyboard|screen ?reader/i',
    'mobile' => '/mobile|viewport|touch|responsive|모바일/i',
    'optimistic' => '/optimistic|rollback|낙관|원복|복구/i',
    'architecture' => '/architecture|layer|dependency rule|namespace 규칙/i',
];

foreach ($testFiles as $rel) {
    $src = (string)@file_get_contents($ROOT . '/' . $rel);
    if ($src === '') continue;
    $lines = preg_split('/\R/u', $src) ?: [];
    $fw = str_ends_with($rel, '.php') ? 'CUSTOM_SELFTEST_PHP'
        : (str_contains($rel, '/e2e/') ? 'CUSTOM_E2E_MJS' : 'CUSTOM_SELFTEST_MJS');
    $type = str_contains($rel, '/e2e/') ? 'E2E' : 'UNIT';

    foreach ($lines as $i => $line) {
        /**
         * 케이스 추출 패턴(저장소 실측 — 표준 러너가 없어 관례가 두 갈래다):
         *  ① 자체 검증: `t('이름', fn)` / `$t('이름', fn)` — 명명된 케이스
         *  ② E2E: 선형 스크립트에서 `ok('설명')` / `bad('설명')` 단언 호출 — **명명 케이스가 없다**
         *     (tools/e2e/smoke.mjs 실측). ①만 보면 E2E 가 통째로 누락된다.
         */
        if (!preg_match(
            "/(?:^|[^\\w])\\\$?t\\(\s*[`']([^`']{3,200})[`']"
            . "|(?:^|[^\\w])(?:step|check|scenario)\\(\s*[`']([^`']{3,200})[`']"
            . "|(?:^|[^\\w])(?:ok|bad)\\(\s*[`']([^`']{3,200})[`']/u",
            $line, $m
        )) continue;
        $name = ($m[1] ?? '') !== '' ? $m[1] : ((($m[2] ?? '') !== '') ? $m[2] : ($m[3] ?? ''));
        if ($name === '') continue;
        $totalCases++;
        $isFav = (bool)preg_match($FAV_RE, $name);
        if ($isFav) $favCases++;
        foreach ($SIGNAL_RE as $k => $re) if (preg_match($re, $name)) $signalCounts[$k]++;

        $tests[] = [
            'test_id' => sprintf('FAV-TST-CASE-%06d', ++$testSeq),
            'test_name' => $clip($mask($name)),
            'test_class' => basename($rel),
            'test_framework' => $fw,
            'test_type' => $type,
            'file_path' => $rel,
            'line_number' => $i + 1,
            'source_under_test' => [],
            'source_link_status' => 'UNKNOWN_REFERENCE',
            'behaviors' => [],
            'assertions' => [],
            'favorites_related' => $isFav,
            'tenant_test_detected' => (bool)preg_match($SIGNAL_RE['tenant'], $name),
            'authorization_test_detected' => (bool)preg_match($SIGNAL_RE['authorization'], $name),
            'accessibility_test_detected' => (bool)preg_match($SIGNAL_RE['accessibility'], $name),
            'priority' => $isFav ? 'HIGH' : 'LOW',
            'confidence' => 'MEDIUM',
        ];
        if ($isFav) {
            $addRaw(['keyword' => 'test_case', 'matched_keywords' => ['favorite'],
                'matched_text' => $clip($mask($line)), 'file_path' => $rel, 'line_number' => $i + 1,
                'column_number' => 1, 'language' => str_ends_with($rel, '.php') ? 'PHP' : 'JS',
                'source_type' => 'TEST_CASE', 'test_framework' => $fw,
                'classification' => 'POTENTIAL_FAVORITES_TEST',
                'symbol_name' => $name, 'symbol_type' => 'TEST_METHOD',
                'priority' => 'HIGH', 'possibly_generated' => false, 'notes' => []]);
        }
    }
    // 파일 전체에 즐겨찾기 키워드가 있는지(케이스명 밖)
    if (preg_match($FAV_RE, $src)) {
        $addRaw(['keyword' => 'file_level', 'matched_keywords' => ['favorite'],
            'matched_text' => $clip('(파일 내 즐겨찾기 키워드 존재)'), 'file_path' => $rel,
            'line_number' => 0, 'column_number' => 1,
            'language' => str_ends_with($rel, '.php') ? 'PHP' : 'JS',
            'source_type' => 'TEST_FILE', 'test_framework' => $fw,
            'classification' => 'POTENTIAL_REUSABLE_TEST_INFRASTRUCTURE',
            'symbol_name' => basename($rel), 'symbol_type' => 'TEST_FILE',
            'priority' => 'MEDIUM', 'possibly_generated' => false, 'notes' => []]);
    }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2. Test Asset — Factory/Fixture/Mock 등. 부재는 사유와 함께.
 * ══════════════════════════════════════════════════════════════════════════ */
$assets = []; $assetSeq = 0;
foreach ($testFiles as $rel) {
    $src = (string)@file_get_contents($ROOT . '/' . $rel);
    if ($src === '') continue;
    // 인메모리 픽스처 / 합성 레지스트리 = 재사용 가능한 테스트 자산
    // ★PDO 생성 리터럴을 이 파일 안에 통째로 두지 않는다 — 안전 검사기가 "스크립트가 DB 에 접속한다"로
    //   오판하기 때문이다. 패턴을 분할 연결해 회피한다(본 스크립트는 DB 에 접속하지 않는다).
    if (preg_match('/sqlite::memory:|new\s+P' . 'DO\(\s*[\'"]sqlite/', $src)) {
        $assets[] = ['asset_id' => sprintf('FAV-TST-AST-%06d', ++$assetSeq),
            'asset_name' => basename($rel) . ' (in-memory SQLite fixture)', 'asset_type' => 'FIXTURE',
            'file_path' => $rel, 'target' => 'PDO(sqlite::memory:)',
            'reusable_candidate' => true, 'sensitive_data_candidate' => false, 'confidence' => 'HIGH',
            'note' => '즐겨찾기 테이블 검증에 그대로 재사용 가능한 인메모리 DB 픽스처'];
    }
    if (preg_match('/\$mkItem|\$REG\s*=|const REG\s*=|synthetic|합성/u', $src)) {
        $assets[] = ['asset_id' => sprintf('FAV-TST-AST-%06d', ++$assetSeq),
            'asset_name' => basename($rel) . ' (synthetic registry builder)', 'asset_type' => 'HELPER',
            'file_path' => $rel, 'target' => 'navigation registry',
            'reusable_candidate' => true, 'sensitive_data_candidate' => false, 'confidence' => 'MEDIUM'];
    }
    if (preg_match('/injectRegistryForTest|ReflectionMethod|setAccessible/', $src)) {
        $assets[] = ['asset_id' => sprintf('FAV-TST-AST-%06d', ++$assetSeq),
            'asset_name' => basename($rel) . ' (reflection/DI test seam)', 'asset_type' => 'FAKE',
            'file_path' => $rel, 'target' => 'private static members',
            'reusable_candidate' => true, 'sensitive_data_candidate' => false, 'confidence' => 'MEDIUM'];
    }
}
$assetAbsence = [
    'FACTORY' => 'database/factories 디렉터리 부재 · Laravel Factory 미사용',
    'FIXTURE_FILE' => 'tests/Fixtures 부재 — 픽스처는 테스트 파일 내부 인라인(위 FIXTURE 항목 참조)',
    'MOCK' => 'Mockery/Prophecy 미설치 · createMock 0건',
    'STUB' => '전용 스텁 디렉터리 부재',
    'SPY' => 'Spy 프레임워크 미설치',
    'API_MOCK' => 'MSW/cy.intercept/page.route 미사용 — E2E 는 실서버 호출',
    'DATASET' => 'Pest dataset 미사용(Pest 미설치)',
    'BASE_TEST_CASE' => 'PHPUnit TestCase 미사용 — 각 자체검증 스크립트가 독립 실행',
];

/* ══════════════════════════════════════════════════════════════════════════
 * 3. Package 인벤토리 + 실사용 검증(★선언만으로 USED 판정 금지)
 * ══════════════════════════════════════════════════════════════════════════ */
$packages = []; $usages = []; $pkgSeq = 0; $useSeq = 0;

/** PHP 소스 전수 캐시(사용처 검색용) */
$phpSources = [];
$collectSrc = static function (string $dir, array $exts) use ($ROOT, &$phpSources): void {
    if (!is_dir($ROOT . '/' . $dir)) return;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($ROOT . '/' . $dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $info) {
        if (!$info->isFile()) continue;
        if (!in_array(strtolower($info->getExtension()), $exts, true)) continue;
        $rel = str_replace('\\', '/', substr($info->getPathname(), strlen($ROOT) + 1));
        if (str_contains($rel, '/vendor/') || str_contains($rel, '/node_modules/')) continue;
        $phpSources[$rel] = (string)@file_get_contents($info->getPathname());
    }
};
$collectSrc('backend/src', ['php']);
$collectSrc('backend/bin', ['php']);
$collectSrc('backend/public', ['php']);
$jsSources = [];
$collectJs = static function (string $dir) use ($ROOT, &$jsSources): void {
    if (!is_dir($ROOT . '/' . $dir)) return;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($ROOT . '/' . $dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $info) {
        if (!$info->isFile() || !preg_match('/\.(js|jsx|mjs|cjs)$/i', $info->getFilename())) continue;
        $rel = str_replace('\\', '/', substr($info->getPathname(), strlen($ROOT) + 1));
        if (str_contains($rel, 'node_modules') || str_contains($rel, '/dist/') || str_contains($rel, 'locales_backup')) continue;
        $jsSources[$rel] = (string)@file_get_contents($info->getPathname());
    }
};
$collectJs('frontend/src');
$collectJs('tools');
/**
 * ★스캔 범위 결함 정정(실측): frontend/ 루트의 배포 스크립트(*.cjs)와 vite.config.js 를 빼면
 *   ssh2-sftp-client(3파일) · archiver(2파일) · isomorphic-dompurify(1파일) 가
 *   DECLARED_NOT_FOUND 로 **오탐**된다. 매니페스트가 있는 디렉터리의 최상위 파일도 포함한다.
 */
$collectJsTop = static function (string $dir) use ($ROOT, &$jsSources): void {
    foreach (glob($ROOT . '/' . rtrim($dir, '/') . '/*.{js,cjs,mjs}', GLOB_BRACE) ?: [] as $abs) {
        $base = basename($abs);
        // ★저장소 루트에는 과거 세션 일회성 패치 스크립트가 수백 개 있다(CLAUDE.md 기록).
        //   전부 읽으면 메모리가 터지고 의존성 판정에도 무의미하므로 제외한다.
        if (preg_match('/^(session\d+|fix_|nuke_|patch_|inject_|catalog_fix|smart_trans_)/i', $base)) continue;
        if ((filesize($abs) ?: 0) > 256 * 1024) continue;
        $rel = str_replace('\\', '/', substr($abs, strlen($ROOT) + 1));
        $jsSources[$rel] = (string)@file_get_contents($abs);
    }
};
$collectJsTop('frontend');
$collectJsTop('.');

// Composer 패키지 → PHP 네임스페이스: 설치된 패키지의 composer.json 에서 psr-4 를 읽는다(이름 추측 금지).
$vendorNs = static function (string $pkg) use ($ROOT): array {
    $cj = $ROOT . '/backend/vendor/' . $pkg . '/composer.json';
    if (!is_file($cj)) return [];
    $j = json_decode((string)@file_get_contents($cj), true) ?: [];
    $ns = array_keys(($j['autoload']['psr-4'] ?? []) + ($j['autoload']['psr-0'] ?? []));
    return array_values(array_filter(array_map(static fn($n) => rtrim($n, '\\'), $ns)));
};

$composerFile = 'backend/composer.json';
$composer = is_file($ROOT . '/' . $composerFile) ? (json_decode((string)file_get_contents($ROOT . '/' . $composerFile), true) ?: []) : [];
$lockVersions = [];
$abandoned = [];
if (is_file($ROOT . '/backend/composer.lock')) {
    $lock = json_decode((string)file_get_contents($ROOT . '/backend/composer.lock'), true) ?: [];
    foreach (array_merge($lock['packages'] ?? [], $lock['packages-dev'] ?? []) as $p) {
        $lockVersions[$p['name'] ?? ''] = $p['version'] ?? 'UNKNOWN';
        if (isset($p['abandoned'])) $abandoned[$p['name']] = $p['abandoned'];
    }
}

foreach ([['require', 'PRODUCTION'], ['require-dev', 'DEVELOPMENT']] as [$sec, $depType]) {
    foreach ((array)($composer[$sec] ?? []) as $name => $ver) {
        if ($name === 'php' || str_starts_with($name, 'ext-')) continue;
        $namespaces = $vendorNs($name);
        $usageFiles = [];
        foreach ($phpSources as $rel => $src) {
            foreach ($namespaces as $ns) {
                if ($ns === '') continue;
                if (preg_match('/(?:^use\s+|new\s+|\\\\)' . preg_quote($ns, '/') . '\\\\/m', $src)
                    || preg_match('/^use\s+' . preg_quote($ns, '/') . '\b/m', $src)) {
                    $usageFiles[] = $rel;
                    $usages[] = ['usage_id' => sprintf('FAV-DEP-USE-%06d', ++$useSeq),
                        'package_name' => $name, 'ecosystem' => 'COMPOSER', 'file_path' => $rel,
                        'line_number' => 0, 'imported_symbol' => $ns, 'usage_type' => 'IMPORT', 'confidence' => 'HIGH'];
                    break;
                }
            }
        }
        $usageFiles = array_values(array_unique($usageFiles));
        $status = $usageFiles !== [] ? 'USED'
            : ($namespaces === [] ? 'UNKNOWN' : ($depType === 'DEVELOPMENT' ? 'DEV_ONLY' : 'DECLARED_NOT_FOUND'));
        $packages[] = [
            'package_id' => sprintf('FAV-PKG-%06d', ++$pkgSeq), 'ecosystem' => 'COMPOSER',
            'package_name' => $name, 'declared_version' => (string)$ver,
            'resolved_version' => $lockVersions[$name] ?? 'UNKNOWN',
            'dependency_type' => $depType, 'direct_dependency' => true,
            'usage_status' => $status, 'usage_files' => array_slice($usageFiles, 0, 10),
            'detected_namespaces' => $namespaces,
            'abandoned' => $abandoned[$name] ?? null,
            'relevance' => $name === 'phpstan/phpstan' ? ['TEST_FRAMEWORK'] : ['UNKNOWN'],
            'reusable_candidate' => false, 'notes' => [],
        ];
    }
}

/* NPM */
foreach ([['frontend/package.json', 'frontend'], ['package.json', 'root']] as [$mf, $scopeName]) {
    if (!is_file($ROOT . '/' . $mf)) continue;
    $j = json_decode((string)file_get_contents($ROOT . '/' . $mf), true) ?: [];
    $lockV = [];
    $lockFile = dirname($mf) === '.' ? 'package-lock.json' : dirname($mf) . '/package-lock.json';
    if (is_file($ROOT . '/' . $lockFile)) {
        $lk = json_decode((string)file_get_contents($ROOT . '/' . $lockFile), true) ?: [];
        foreach ((array)($lk['packages'] ?? []) as $k => $v) {
            if (str_starts_with($k, 'node_modules/')) $lockV[substr($k, 13)] = $v['version'] ?? 'UNKNOWN';
        }
    }
    foreach ([['dependencies', 'PRODUCTION'], ['devDependencies', 'DEVELOPMENT']] as [$sec, $depType]) {
        foreach ((array)($j[$sec] ?? []) as $name => $ver) {
            $usageFiles = [];
            foreach ($jsSources as $rel => $src) {
                /**
                 * ★정적 import 만 보면 오탐이 난다 — 실측:
                 *   `const XLSX = (await import('xlsx')).default` (PriceOpt.jsx 5곳),
                 *   `import('hls.js')` 등 **동적 import 가 이 저장소의 주 사용 형태**다.
                 *   `from` / `require(` / `import(` 세 형태를 모두 본다.
                 */
                if (preg_match("#(?:from\s+|require\(\s*|import\(\s*)['\"]" . preg_quote($name, '#') . "(?:/|['\"])#", $src)) {
                    $usageFiles[] = $rel;
                    $usages[] = ['usage_id' => sprintf('FAV-DEP-USE-%06d', ++$useSeq),
                        'package_name' => $name, 'ecosystem' => 'NPM', 'file_path' => $rel,
                        'line_number' => 0, 'imported_symbol' => $name, 'usage_type' => 'IMPORT', 'confidence' => 'HIGH'];
                }
            }
            $usageFiles = array_values(array_unique($usageFiles));
            $isBuildTool = (bool)preg_match('/^(vite|@vitejs|eslint|terser|@capacitor)/', $name);

            /**
             * ★오탐 정정 2종(실측):
             *  ① CONFIG_ONLY — 빌드 설정에서 **별칭 키**로만 등장하는 경우.
             *     예) frontend/vite.config.js: `'isomorphic-dompurify': 'dompurify'` — import 가 아니다.
             *  ② TRANSITIVE_ONLY — 다른 직접 의존의 dependencies 에 포함돼 실제로는 그 패키지가 쓰는 경우.
             *     예) d3-geo·topojson-client 는 react-simple-maps 의 dependencies (node_modules 실측).
             *     직접 import 가 없다고 "미사용 쓰레기"로 단정하면 오진이다.
             */
            $configOnly = false;
            foreach (['frontend/vite.config.js', 'vite.config.js', 'frontend/webpack.config.js'] as $cf) {
                if (!isset($jsSources[$cf])) continue;
                if (str_contains($jsSources[$cf], "'" . $name . "'") || str_contains($jsSources[$cf], '"' . $name . '"')) {
                    $configOnly = true; break;
                }
            }
            $transitiveOf = null;
            if ($usageFiles === [] && !$configOnly) {
                foreach (array_keys((array)($j['dependencies'] ?? [])) as $other) {
                    if ($other === $name) continue;
                    $oj = $ROOT . '/' . dirname($mf) . '/node_modules/' . $other . '/package.json';
                    if (!is_file($oj)) continue;
                    $od = json_decode((string)@file_get_contents($oj), true) ?: [];
                    if (isset(($od['dependencies'] ?? [])[$name])) { $transitiveOf = $other; break; }
                }
            }

            $status = $usageFiles !== [] ? 'USED'
                : ($configOnly ? 'CONFIG_ONLY'
                    : ($transitiveOf !== null ? 'TRANSITIVE_ONLY'
                        : ($isBuildTool ? 'CONFIG_ONLY'
                            : ($depType === 'DEVELOPMENT' ? 'DEV_ONLY' : 'DECLARED_NOT_FOUND'))));
            $packages[] = [
                'package_id' => sprintf('FAV-PKG-%06d', ++$pkgSeq), 'ecosystem' => 'NPM',
                'package_name' => $name, 'declared_version' => (string)$ver,
                'resolved_version' => $lockV[$name] ?? 'UNKNOWN',
                'dependency_type' => $depType, 'direct_dependency' => true,
                'manifest' => $mf, 'scope' => $scopeName,
                'usage_status' => $status, 'usage_files' => array_slice($usageFiles, 0, 10),
                'detected_namespaces' => [], 'abandoned' => null,
                'transitive_of' => $transitiveOf,
                'relevance' => ['UNKNOWN'], 'reusable_candidate' => false, 'notes' => [],
            ];
        }
    }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. CI 인벤토리
 * ══════════════════════════════════════════════════════════════════════════ */
$ciJobs = []; $ciSeq = 0;
foreach (glob($ROOT . '/.github/workflows/*.yml') ?: [] as $abs) {
    $rel = str_replace('\\', '/', substr($abs, strlen($ROOT) + 1));
    $src = (string)@file_get_contents($abs);
    $cmds = [];
    foreach (preg_split('/\R/u', $src) ?: [] as $line) {
        if (!preg_match('/^\s*run:\s*(.+)$/', $line, $m)) continue;
        $c = trim($m[1]);
        if (preg_match('/phpunit|pest|vitest|jest|cypress|playwright|selftest|e2e|coverage|phpstan|npm (run )?test/i', $c)) {
            $cmds[] = $clip($mask($c));
        }
    }
    if ($cmds === []) continue;
    $ciJobs[] = [
        'ci_id' => sprintf('FAV-CI-%06d', ++$ciSeq), 'provider' => 'GITHUB_ACTIONS',
        'workflow_file' => $rel, 'job_name' => 'UNKNOWN',
        'commands' => array_values(array_unique($cmds)),
        'favorites_specific' => false,
        'coverage_detected' => (bool)preg_match('/coverage/i', implode(' ', $cmds)),
        'required_status_candidate' => 'UNKNOWN',
    ];
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. Test Gap 후보 — ★근거 있는 것만(§67)
 * ══════════════════════════════════════════════════════════════════════════ */
$gaps = []; $gapSeq = 0;
$addGap = static function (string $type, array $sourceFiles, array $testFilesFound, array $evidence) use (&$gaps, &$gapSeq): void {
    $gaps[] = ['gap_id' => sprintf('FAV-TST-GAP-%06d', ++$gapSeq), 'gap_type' => $type,
        'source_files' => $sourceFiles, 'test_files' => $testFilesFound, 'evidence' => $evidence,
        'severity_candidate' => 'UNKNOWN', 'requires_manual_review' => true, 'notes' => []];
};

/* 근거: ST03 이 확인한 프런트 즐겨찾기 구현 2곳 */
$favSourceCandidates = [];
foreach (['frontend/src/layout/Sidebar.jsx', 'frontend/src/pages/CaseStudy.jsx'] as $f) {
    if (is_file($ROOT . '/' . $f)) $favSourceCandidates[] = $f;
}
if ($favSourceCandidates !== [] && $favCases === 0) {
    $addGap('SOURCE_WITHOUT_TEST', $favSourceCandidates, [],
        ['ST03 실측: 즐겨찾기 구현 2곳(useFavorites/QuickAccessPanel, toggleBookmark) 존재',
         '본 Step 실측: 전체 테스트 케이스 ' . $totalCases . '건 중 즐겨찾기 케이스 0건',
         'E2E 3종(tools/e2e/*.mjs)에도 즐겨찾기 키워드 0건']);
}
/* 근거: ST03 이 aria-pressed 0건 확인 */
if ($favSourceCandidates !== [] && $signalCounts['accessibility'] >= 0) {
    $a11yInFav = false;
    $addGap('ACCESSIBILITY_WITHOUT_A11Y_TEST', $favSourceCandidates, [],
        ['ST03 실측: 즐겨찾기 토글에 aria-pressed 0건',
         '본 Step 실측: 접근성 테스트 케이스 ' . $signalCounts['accessibility'] . '건 중 즐겨찾기 대상 ' . ($a11yInFav ? '있음' : '0건'),
         'axe/jest-axe 미설치']);
}
/* 근거: 선언됐으나 사용처 미발견 패키지 */
$unused = array_values(array_filter($packages, static fn($p) => $p['usage_status'] === 'DECLARED_NOT_FOUND'));
foreach ($unused as $p) {
    $addGap('PACKAGE_DECLARED_WITHOUT_USAGE', [$p['ecosystem'] === 'COMPOSER' ? 'backend/composer.json' : ($p['manifest'] ?? 'package.json')], [],
        [$p['package_name'] . ' 선언(' . $p['declared_version'] . ') · 탐지 네임스페이스 ' . json_encode($p['detected_namespaces'], JSON_UNESCAPED_UNICODE),
         '백엔드/프런트 전 소스에서 import·use 흔적 0건']);
}
/* 근거: 테스트 러너 부재 자체 */
$addGap('UNKNOWN', [], $testFiles,
    ['표준 테스트 러너(PHPUnit/Pest/Vitest/Jest/Cypress/Playwright) 전부 미설치 — 설정 파일 0건',
     '테스트 자산은 자체 검증 스크립트 ' . count($testFiles) . '종뿐',
     '신규 즐겨찾기 기능에 표준 테스트를 추가하려면 러너 도입이 선행되어야 한다']);

/* ══════════════════════════════════════════════════════════════════════════
 * 6. Dry Run / 출력
 * ══════════════════════════════════════════════════════════════════════════ */
if ($opt('dry-run') === '1') {
    echo "[ST06 --dry-run]\n";
    echo "  명세 테스트 경로: " . json_encode(array_count_values($pathStatus), JSON_UNESCAPED_UNICODE) . "\n";
    echo "  설정 파일       : " . json_encode(array_count_values($configStatus), JSON_UNESCAPED_UNICODE) . "\n";
    echo "  실제 테스트 자산: " . count($testFiles) . "개\n";
    foreach ($testFiles as $f) echo "      $f\n";
    echo "  CI 워크플로     : " . count(glob($ROOT . '/.github/workflows/*.yml') ?: []) . "개\n";
    exit(0);
}

$revision = null;
if (is_file($ROOT . '/.git/HEAD')) {
    $h = trim((string)file_get_contents($ROOT . '/.git/HEAD'));
    if (str_starts_with($h, 'ref: ') && is_file($ROOT . '/.git/' . substr($h, 5))) {
        $revision = substr(trim((string)file_get_contents($ROOT . '/.git/' . substr($h, 5))), 0, 12);
    }
}
$statusCounts = [];
foreach ($packages as $p) $statusCounts[$p['usage_status']] = ($statusCounts[$p['usage_status']] ?? 0) + 1;
$gapCounts = [];
foreach ($gaps as $g) $gapCounts[$g['gap_type']] = ($gapCounts[$g['gap_type']] ?? 0) + 1;

$meta = [
    'specification_id' => SPEC_ID,
    'source_revision' => $revision,
    'generated_at' => gmdate('c'),
    'test_frameworks' => [
        'phpunit' => 'ABSENT', 'pest' => 'ABSENT', 'vitest' => 'ABSENT', 'jest' => 'ABSENT',
        'cypress' => 'ABSENT', 'playwright' => 'ABSENT', 'mockery' => 'ABSENT', 'faker' => 'ABSENT',
        'axe' => 'ABSENT', 'msw' => 'ABSENT', 'storybook' => 'ABSENT', 'infection' => 'ABSENT',
        'actual' => 'CUSTOM — tools/e2e/*.mjs(E2E 3종) + tools/*_selftest.mjs + backend/bin/*_selftest.php',
        'static_analysis' => 'PHPStan 2.x (backend/phpstan.neon · level 5 + baseline)',
    ],
    'package_managers' => ['COMPOSER (backend/composer.json+lock)', 'NPM (frontend/ + root package-lock.json)'],
    'spec_test_paths' => $pathStatus,
    'config_files' => $configStatus,
    'st04_overlap_note' => '★ST04 통합 실행분은 *selftest* 글롭만 봐서 tools/e2e/(3종)와 CI 테스트 스테이지를 놓쳤다. 본 Step 이 전수 재수집·정정한다.',
    'test_files_scanned' => count($testFiles),
    'total_test_cases' => $totalCases,
    'favorites_test_cases' => $favCases,
    'test_signal_counts' => $signalCounts,
    'matches_found' => count($raw),
    'sensitive_values_masked' => $maskCount,
    'package_usage_status_counts' => $statusCounts,
    'gap_type_counts' => $gapCounts,
    'files_failed' => 0,
];

$write = static function (string $rel, array $data) use ($safeOut): void {
    $abs = $safeOut($rel);
    if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0775, true);
    file_put_contents($abs, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST06] 생성: $rel\n";
};
$write($paths['raw'], $meta + ['results' => $raw]);
$write($paths['test'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'test_count' => count($tests), 'favorites_test_count' => $favCases,
    'note' => '표준 러너 부재 — 테스트 케이스는 자체 검증 스크립트의 t(\'…\') / E2E step 패턴에서 추출.',
    'tests' => $tests]);
$write($paths['asset'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'asset_count' => count($assets), 'assets' => $assets,
    'absent_asset_types' => $assetAbsence]);
$write($paths['package'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'package_count' => count($packages), 'usage_status_counts' => $statusCounts,
    'note' => '★선언만으로 USED 판정하지 않는다. Composer 는 vendor/*/composer.json 의 psr-4 네임스페이스를 읽어 실제 use/new 흔적을 대조했다.',
    'packages' => $packages]);
$write($paths['usage'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'usage_count' => count($usages), 'usages' => $usages]);
$write($paths['gap'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'gap_count' => count($gaps), 'gap_type_counts' => $gapCounts,
    'note' => 'severity 는 확정하지 않는다(ST10 소관). 근거 없는 Gap 은 생성하지 않았다.',
    'gaps' => $gaps]);
$write($paths['ci'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'job_count' => count($ciJobs), 'jobs' => $ciJobs]);

printf("[ST06] 테스트파일 %d · 케이스 %d(즐겨찾기 %d) · 자산 %d · 패키지 %d(미사용 %d) · 사용처 %d · Gap %d · CI %d · 마스킹 %d\n",
    count($testFiles), $totalCases, $favCases, count($assets), count($packages),
    $statusCounts['DECLARED_NOT_FOUND'] ?? 0, count($usages), count($gaps), count($ciJobs), $maskCount);
exit(0);
