<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST04 (+ST05·ST06 통합) — 서버측 표면 정적 검색.
 *
 * ★압축 실행(사용자 승인): ST04(DB/Migration) · ST05(Route/API) · ST06(Test/Package) 를 1개 Step 으로 통합.
 *   근거 = ST02(백엔드 PHP 0건) + ST03(프런트 API 0건)이 서버측 부재를 양방향 확정했으므로 세 Step 이
 *   동일 결론을 세 번 재확인하는 구조였다. 산출물은 명세대로 전부 생성하고 검증도 각각 수행한다.
 *
 * ★안전 계약(명세 §33·§82~88):
 *   - Migration 을 **실행하지 않는다**(include/eval/require 0). DB·Redis·네트워크 접속 0. Application Boot 0.
 *   - 실제 데이터 Dump 미열람. INSERT/COPY 값 미저장(구조 키워드만).
 *   - 출력은 tools/cwis/navigation/output/ 하위로 강제.
 *
 * ★교차검증(명세 §7 vs 실측):
 *   database/migrations · database/schema · database/seeders · database/factories · migrations ·
 *   src/Entity · src/Domain · app/Models · tests/Fixtures · resources/schema = **전부 부재**.
 *   ORM 실사용 **0건**(`extends Model` 0 · `ORM\Entity` 0 · `use Illuminate` 0) → raw PDO 확정.
 *   ★스키마 정본은 `backend/migrations`(21개, 세션 172 동결)가 아니라
 *     **`backend/src/**` 의 ensureTables() DDL 499개(86 파일)** 다. 둘 다 검색해야 한다.
 *
 * ★ST02/ST03 교훈 승계:
 *   ① 한글 낱말 경계 (?<![가-힣])
 *   ② 짧은 영어 어휘는 \b 강제 — 'pin' 무경계 검색은 mapping·shipping 을 오탐한다(실측)
 *
 * 사용:
 *   php tools/cwis/navigation/scripts/search-favorites-database.php [--dry-run] [옵션…]
 * 종료코드: 0=정상, 1=읽기 실패율 초과, 2=설정/입력 오류.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST04';
const MAX_MATCHED_TEXT = 300;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

$argvv = $argv; array_shift($argvv);
$opt = static function (string $n, ?string $d = null) use ($argvv): ?string {
    foreach ($argvv as $a) {
        if ($a === "--$n") return '1';
        if (str_starts_with($a, "--$n=")) return substr($a, strlen($n) + 3);
    }
    return $d;
};

$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST04] 루트 탐지 실패\n"); exit(2); }

$O = 'tools/cwis/navigation/output/';
$paths = [
    'raw'        => $opt('raw-output', $O . 'favorites-database-raw-results.json'),
    'table'      => $opt('table-output', $O . 'favorites-database-table-inventory.json'),
    'column'     => $opt('column-output', $O . 'favorites-database-column-inventory.json'),
    'constraint' => $opt('constraint-output', $O . 'favorites-database-constraint-inventory.json'),
    'orm'        => $opt('orm-output', $O . 'favorites-database-orm-inventory.json'),
    'migration'  => $opt('migration-output', $O . 'favorites-database-migration-inventory.json'),
    'risk'       => $opt('risk-output', $O . 'favorites-database-risk-candidates.json'),
    // ST05·ST06 통합 산출물
    'route'      => $opt('route-output', $O . 'favorites-api-route-inventory.json'),
    'package'    => $opt('package-output', $O . 'favorites-package-test-inventory.json'),
];
$maxFileSize = (int)$opt('max-file-size', (string)DEFAULT_MAX_FILE_SIZE);
$dryRun = $opt('dry-run') === '1';

$safeOut = static function (string $rel) use ($ROOT): string {
    $n = str_replace('\\', '/', $rel);
    if (!str_starts_with($n, 'tools/cwis/navigation/output/') || str_contains($n, '..') || $n[0] === '/' || preg_match('#^[A-Za-z]:#', $n)) {
        fwrite(STDERR, "[ST04] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    return $ROOT . '/' . $n;
};

$scopePath = $opt('scope', 'tools/cwis/navigation/favorites-search-scope.json');
if (!is_file($ROOT . '/' . $scopePath)) { fwrite(STDERR, "[ST04] scope 없음\n"); exit(2); }
try { $scope = json_decode((string)file_get_contents($ROOT . '/' . $scopePath), true, 512, JSON_THROW_ON_ERROR); }
catch (JsonException $e) { fwrite(STDERR, "[ST04] scope JSON 오류\n"); exit(2); }

/* ── 플랫폼/도구 탐지(명세 §6) — .env 값은 읽지 않는다 ─────────────────── */
$composer = [];
if (is_file($ROOT . '/backend/composer.json')) {
    $composer = json_decode((string)file_get_contents($ROOT . '/backend/composer.json'), true) ?: [];
}
$req = array_merge($composer['require'] ?? [], $composer['require-dev'] ?? []);
$dbTech = [
    'platforms' => ['MySQL (주)', 'SQLite (폴백)'],
    'platform_evidence' => 'backend/src/Db.php — mysql / sqlite DSN 만 생성. 라이브 실측 driver=mysql',
    'postgresql' => 'docker-compose.yml 이 postgres:16 을 선언하나 초기커밋 스텁이며 실스택과 불일치(ST01 트랩 기록)',
    'orm' => [
        'doctrine' => isset($req['doctrine/orm']) ? $req['doctrine/orm'] : null,
        'eloquent_package' => $req['illuminate/database'] ?? null,
        'actual_usage' => 'NONE — extends Model 0건 · ORM\\Entity 0건 · use Illuminate 0건(실측). raw PDO 사용',
    ],
    'migration_tool' => [
        'laravel' => null, 'doctrine_migrations' => null, 'phinx' => null,
        'actual' => 'CUSTOM — backend/src/Migrate.php + 핸들러별 ensureTables() 자가치유(세션 172 이후 migrations 동결)',
    ],
    'redis' => null, 'elasticsearch' => null,
];

/* ── 검색 경로 ─────────────────────────────────────────────────────────── */
$dbRootCandidates = [
    'backend/migrations', 'backend/src', 'backend/bin', 'backend/data',
    'database/migrations', 'database/schema', 'database/seeders', 'database/factories',
    'migrations', 'src/Entity', 'src/Domain', 'app/Models', 'tests/Fixtures', 'resources/schema', 'config',
];
$searchRoots = []; $skippedRoots = [];
foreach ($dbRootCandidates as $c) {
    if (!in_array($c, (array)($scope['include_directories'] ?? []), true)) { $skippedRoots[$c] = 'scope 미등재'; continue; }
    if (!is_dir($ROOT . '/' . $c)) { $skippedRoots[$c] = '디렉터리 부재'; continue; }
    $searchRoots[] = $c;
}
foreach ($dbRootCandidates as $c) {
    if (isset($skippedRoots[$c])) continue;
    if (!in_array($c, $searchRoots, true)) $skippedRoots[$c] = '미채택';
}
$excludeDirs = array_map(static fn($d) => str_replace('\\', '/', $d), (array)($scope['exclude_directories'] ?? []));
$extensions = ['php', 'sql', 'xml', 'yaml', 'yml', 'json', 'neon'];

$files = []; $failures = []; $largeSkipped = []; $symlinkSkipped = [];
$collect = static function (string $relRoot) use ($ROOT, $excludeDirs, $extensions, $maxFileSize, &$files, &$failures, &$largeSkipped, &$symlinkSkipped): void {
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($ROOT . '/' . $relRoot, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $info) {
        $abs = $info->getPathname();
        $rel = str_replace('\\', '/', substr($abs, strlen($ROOT) + 1));
        foreach ($excludeDirs as $ex) { if ($rel === $ex || str_starts_with($rel, $ex . '/')) continue 2; }
        if ($info->isLink()) {
            $t = @realpath($abs);
            if ($t === false || !str_starts_with($t, $ROOT . DIRECTORY_SEPARATOR)) { $symlinkSkipped[] = $rel; continue; }
        }
        if (!$info->isFile()) continue;
        if (!in_array(strtolower($info->getExtension()), $extensions, true)) continue;
        // ★실제 데이터 Dump/Backup 은 열지 않는다(§9·§49)
        if (preg_match('#(^|/)(backups?|dumps?)/#i', $rel) || preg_match('#(backup|dump)\.sql$#i', $rel)) { continue; }
        $sz = $info->getSize() ?: 0;
        if ($sz > $maxFileSize) { $largeSkipped[] = ['file_path' => $rel, 'size_bytes' => $sz, 'reason' => 'FILE_TOO_LARGE']; continue; }
        $files[$rel] = $sz;
    }
};
foreach ($searchRoots as $r) $collect($r);
ksort($files);

if ($dryRun) {
    echo "[ST04 --dry-run]\n";
    echo "  검색 루트   : " . implode(', ', $searchRoots) . "\n";
    echo "  제외 후보   : " . json_encode($skippedRoots, JSON_UNESCAPED_UNICODE) . "\n";
    echo "  확장자      : " . implode(', ', $extensions) . "\n";
    echo "  예상 파일 수: " . count($files) . "\n";
    echo "  Migration   : " . $dbTech['migration_tool']['actual'] . "\n";
    echo "  ORM         : " . $dbTech['orm']['actual_usage'] . "\n";
    exit(0);
}

/* ══════════════════════════════════════════════════════════════════════════
 * 1. 전체 테이블 인벤토리 — 즐겨찾기 후보 판정의 분모
 * ══════════════════════════════════════════════════════════════════════════ */
$allTables = [];      // table => ['sources'=>[], 'ddl'=>first ddl snippet]
$migrations = [];
$rawResults = [];
$idSeq = 0; $cstSeq = 0; $ormSeq = 0; $migSeq = 0; $riskSeq = 0;
$maskCount = 0;

$sensitive = (array)($scope['sensitive_patterns'] ?? []);
$mask = static function (string $s) use ($sensitive, &$maskCount): string {
    $out = $s;
    foreach ($sensitive as $p) {
        $q = preg_quote($p, '/');
        $n = preg_replace("/($q\\s*[=:]\\s*)(['\"])(?:(?!\\2).){3,}\\2/i", '$1$2[REDACTED]$2', $out);
        if ($n !== null && $n !== $out) { $maskCount++; $out = $n; }
    }
    foreach ([
        '/(postgres(?:ql)?|mysql|mariadb):\/\/[^\s\'"]+/i',
        '/(DATABASE_URL\s*[=:]\s*)\S+/i',
        '/(DB_PASSWORD\s*=\s*)\S+/i',
        '/(Bearer\s+)[A-Za-z0-9._-]{16,}/i',
    ] as $re) {
        $n = preg_replace($re, '[REDACTED]', $out);
        if ($n !== null && $n !== $out) { $maskCount++; $out = $n; }
    }
    if (preg_match('/BEGIN (RSA )?PRIVATE KEY/', $out)) { $maskCount++; $out = '[REDACTED PRIVATE KEY]'; }
    return $out;
};
$clip = static function (string $s): string {
    $s = str_replace(["\r", "\n", "\t"], ['\\r', '\\n', '\\t'], trim($s));
    return mb_strlen($s) > MAX_MATCHED_TEXT ? mb_substr($s, 0, MAX_MATCHED_TEXT) . '…' : $s;
};

/**
 * ★즐겨찾기 관련성 판정 — 짧은 어휘는 반드시 단어 경계.
 * 'pin' 무경계 검색은 mapping·shipping 을 오탐한다(실측 확인).
 */
$FAV_TABLE_RE = '/(?:^|_)(favou?rites?|bookmarks?|pinned?_?items?|saved_?items?|starred)(?:$|_)/i';
$FAV_RELATED_RE = '/(?:^|_)(recent|quick_?link|shortcut|preference|user_?setting|personalization|saved_?report|resource_?reference|entity_?reference)/i';

$scanDdl = static function (string $rel, string $content) use (&$allTables, &$rawResults, &$idSeq, $clip, $mask, $FAV_TABLE_RE, $FAV_RELATED_RE): void {
    $lines = preg_split('/\R/u', $content) ?: [];
    foreach ($lines as $i => $line) {
        if (!preg_match('/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([A-Za-z0-9_]+)`?/i', $line, $m)) continue;
        $t = $m[1];
        if (!isset($allTables[$t])) $allTables[$t] = ['table_name' => $t, 'source_files' => [], 'first_line' => $i + 1];
        if (!in_array($rel, $allTables[$t]['source_files'], true)) $allTables[$t]['source_files'][] = $rel;

        $isFav = (bool)preg_match($FAV_TABLE_RE, $t);
        $isRel = (bool)preg_match($FAV_RELATED_RE, $t);
        if ($isFav || $isRel) {
            $rawResults[] = [
                'result_id' => sprintf('FAV-DB-%06d', ++$idSeq),
                'keyword' => $t,
                'matched_keywords' => [$t],
                'matched_text' => $clip($mask($line)),
                'file_path' => $rel,
                'line_number' => $i + 1,
                'column_number' => 1,
                'language' => str_ends_with($rel, '.sql') ? 'SQL' : 'PHP',
                'source_type' => str_ends_with($rel, '.sql') ? 'SQL_MIGRATION' : 'ENSURE_TABLES_DDL',
                'classification' => $isFav ? 'POTENTIAL_DATABASE_IMPLEMENTATION' : 'POTENTIAL_RELATED_INFRASTRUCTURE',
                'table_name' => $t, 'column_name' => null, 'constraint_name' => null, 'index_name' => null,
                'possibly_generated' => false, 'notes' => [],
            ];
        }
    }
};

/* ── 파일 스캔 ─────────────────────────────────────────────────────────── */
$migrationFiles = 0; $ormFiles = 0; $sqlFiles = 0;
foreach ($files as $rel => $sz) {
    $content = @file_get_contents($ROOT . '/' . $rel);
    if ($content === false) { $failures[] = ['file_path' => $rel, 'reason' => 'FILE_NOT_READABLE']; continue; }
    if ($content !== '' && !mb_check_encoding($content, 'UTF-8')) { $failures[] = ['file_path' => $rel, 'reason' => 'INVALID_ENCODING']; continue; }

    if (str_ends_with($rel, '.sql')) $sqlFiles++;
    if (str_starts_with($rel, 'backend/migrations/')) $migrationFiles++;
    if (preg_match('/extends\s+Model|ORM\\\\Entity|#\[ORM\\\\/', $content)) $ormFiles++;

    $scanDdl($rel, $content);

    /* Migration 인벤토리 — 저장소 실제 도구는 .sql 파일 + Migrate.php applyFiles */
    if (str_starts_with($rel, 'backend/migrations/') && str_ends_with($rel, '.sql')) {
        $ops = [];
        foreach ([
            'CREATE_TABLE' => '/CREATE\s+TABLE/i', 'ALTER_TABLE' => '/ALTER\s+TABLE/i',
            'DROP_TABLE' => '/DROP\s+TABLE/i', 'ADD_INDEX' => '/CREATE\s+(UNIQUE\s+)?INDEX|ADD\s+(UNIQUE\s+)?KEY/i',
            'ADD_CONSTRAINT' => '/ADD\s+CONSTRAINT|FOREIGN\s+KEY/i', 'DATA_MIGRATION' => '/INSERT\s+INTO|UPDATE\s+\w+\s+SET/i',
        ] as $op => $re) { if (preg_match($re, $content)) $ops[] = $op; }
        $tbl = [];
        foreach (['/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?(\w+)`?/i', '/ALTER\s+TABLE\s+`?(\w+)`?/i'] as $re) {
            if (preg_match_all($re, $content, $mm)) foreach ($mm[1] as $x) if (!in_array($x, $tbl, true)) $tbl[] = $x;
        }
        $migrations[] = [
            'migration_id' => sprintf('FAV-DB-MIG-%06d', ++$migSeq),
            'migration_name' => basename($rel, '.sql'),
            'file_path' => $rel,
            'migration_tool' => 'CUSTOM_SQL (backend/src/Migrate.php applyFiles)',
            'version_or_timestamp' => preg_match('/^(\d{8})_(\d+)/', basename($rel), $vm) ? $vm[1] . '_' . $vm[2] : null,
            'operation_types' => $ops ?: ['UNKNOWN'],
            'affected_tables' => $tbl,
            'up_detected' => true,
            'down_detected' => str_contains($content, '@rollback'),
            'rollback_complete_candidate' => str_contains($content, '@rollback') && str_contains($content, '@end-rollback'),
            'favorites_related' => (bool)array_filter($tbl, static fn($t) => (bool)preg_match($GLOBALS['__FAV_TABLE_RE'] ?? '/favou?rite/i', $t)),
            'priority' => 'LOW', 'confidence' => 'HIGH',
        ];
    }
}
$GLOBALS['__FAV_TABLE_RE'] = $FAV_TABLE_RE;

/* ══════════════════════════════════════════════════════════════════════════
 * 2. 후보 테이블 상세 파싱(컬럼/제약/인덱스)
 * ══════════════════════════════════════════════════════════════════════════ */
$tableInv = []; $columnInv = []; $constraintInv = []; $indexInv = []; $risks = [];

$candidateTables = array_values(array_filter(array_keys($allTables),
    static fn($t) => preg_match($FAV_TABLE_RE, $t) || preg_match($FAV_RELATED_RE, $t)));
sort($candidateTables);

foreach ($candidateTables as $t) {
    $src = $allTables[$t]['source_files'][0] ?? null;
    if ($src === null) continue;
    $content = (string)@file_get_contents($ROOT . '/' . $src);
    // CREATE TABLE 본문 추출(첫 등장)
    $body = '';
    if (preg_match('/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?' . preg_quote($t, '/') . '`?\s*\((.*?)\)\s*(?:ENGINE|;|"\))/is', $content, $bm)) {
        $body = $bm[1];
    }
    $cols = []; $pk = []; $fks = []; $uniques = []; $indexes = [];
    /**
     * ★괄호 깊이를 인식하는 콤마 분할.
     *   단순 `preg_split('/,\s*\n/')` 은 `name VARCHAR(255) NOT NULL, config TEXT, viz VARCHAR(20)` 처럼
     *   **한 줄에 여러 컬럼이 선언된 경우를 놓친다**(saved_report 에서 config·viz 누락 실측).
     *   또 `VARCHAR(20)` · `DECIMAL(14,2)` 내부 콤마로 잘리면 안 되므로 깊이를 센다.
     */
    $splitTopLevel = static function (string $s): array {
        $out = []; $buf = ''; $depth = 0; $len = strlen($s); $q = null;
        for ($i = 0; $i < $len; $i++) {
            $ch = $s[$i];
            if ($q !== null) { $buf .= $ch; if ($ch === $q && ($i === 0 || $s[$i - 1] !== '\\')) $q = null; continue; }
            if ($ch === "'" || $ch === '"' || $ch === '`') { $q = $ch; $buf .= $ch; continue; }
            if ($ch === '(') $depth++;
            elseif ($ch === ')') $depth--;
            if ($ch === ',' && $depth === 0) { $out[] = trim($buf); $buf = ''; continue; }
            $buf .= $ch;
        }
        if (trim($buf) !== '') $out[] = trim($buf);
        return $out;
    };
    foreach ($splitTopLevel($body) as $frag) {
        $frag = trim($frag);
        if ($frag === '') continue;
        if (preg_match('/^PRIMARY\s+KEY\s*\(([^)]+)\)/i', $frag, $m)) { $pk = array_map(static fn($x) => trim($x, " `\t"), explode(',', $m[1])); continue; }
        if (preg_match('/^(?:CONSTRAINT\s+`?(\w+)`?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(.*)$/i', $frag, $m)) {
            $fks[] = ['name' => $m[1] ?: null, 'columns' => array_map('trim', explode(',', $m[2])), 'ref_table' => $m[3],
                      'ref_columns' => array_map('trim', explode(',', $m[4])),
                      'delete_rule' => preg_match('/ON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i', $m[5], $d) ? strtoupper(preg_replace('/\s+/', '_', $d[1])) : 'UNKNOWN'];
            continue;
        }
        if (preg_match('/^UNIQUE\s+(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/i', $frag, $m)) {
            $uniques[] = ['name' => $m[1], 'columns' => array_map(static fn($x) => trim($x, " `\t"), explode(',', $m[2]))]; continue;
        }
        if (preg_match('/^KEY\s+`?(\w+)`?\s*\(([^)]+)\)/i', $frag, $m)) {
            $indexes[] = ['name' => $m[1], 'columns' => array_map(static fn($x) => trim($x, " `\t"), explode(',', $m[2])), 'unique' => false]; continue;
        }
        if (preg_match('/^`?(\w+)`?\s+([A-Za-z]+(?:\([^)]*\))?)(.*)$/', $frag, $m)) {
            $rest = $m[3];
            $cols[] = [
                'column_name' => $m[1], 'data_type' => strtoupper($m[2]),
                'nullable' => !preg_match('/NOT\s+NULL/i', $rest),
                'default' => preg_match("/DEFAULT\s+('[^']*'|\S+)/i", $rest, $dm) ? trim($dm[1], "'") : null,
                'primary_key' => (bool)preg_match('/PRIMARY\s+KEY/i', $rest),
                'auto_increment' => (bool)preg_match('/AUTO_INCREMENT|AUTOINCREMENT/i', $rest),
            ];
        }
    }
    // 별도 CREATE [UNIQUE] INDEX 문(SQLite 경로)
    if (preg_match_all('/CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s+ON\s+`?' . preg_quote($t, '/') . '`?\s*\(([^)]+)\)/i', $content, $im, PREG_SET_ORDER)) {
        foreach ($im as $m) {
            $entry = ['name' => $m[2], 'columns' => array_map(static fn($x) => trim($x, " `\t"), explode(',', $m[3])), 'unique' => trim($m[1]) !== ''];
            if ($entry['unique']) $uniques[] = ['name' => $entry['name'], 'columns' => $entry['columns']];
            else $indexes[] = $entry;
        }
    }

    $colNames = array_column($cols, 'column_name');
    $hasCol = static fn(string $c): bool => in_array($c, $colNames, true);
    $isFav = (bool)preg_match($FAV_TABLE_RE, $t);

    $tableInv[] = [
        'table_name' => $t,
        'source_files' => $allTables[$t]['source_files'],
        'created_by_migration' => (bool)array_filter($allTables[$t]['source_files'], static fn($f) => str_starts_with($f, 'backend/migrations/')),
        'created_by_ensure_tables' => (bool)array_filter($allTables[$t]['source_files'], static fn($f) => str_starts_with($f, 'backend/src/')),
        'altered_by_migrations' => [],
        'columns' => $colNames,
        'primary_key' => $pk ?: array_column(array_filter($cols, static fn($c) => $c['primary_key']), 'column_name'),
        'foreign_keys' => $fks,
        'indexes' => $indexes,
        'unique_constraints' => $uniques,
        'check_constraints' => [],
        'soft_delete_detected' => $hasCol('deleted_at'),
        'tenant_aware' => $hasCol('tenant_id') ? 'YES' : 'NO',
        'user_scoped' => ($hasCol('user_id') || $hasCol('principal_id')) ? 'YES' : 'NO',
        'workspace_aware' => $hasCol('workspace_id') ? 'YES' : 'NO',
        'project_aware' => $hasCol('project_id') ? 'YES' : 'NO',
        'polymorphic_detected' => ($hasCol('resource_type') && $hasCol('resource_id')) || ($hasCol('entity_type') && $hasCol('entity_id')) ? 'YES' : 'NO',
        'ordering_detected' => $hasCol('sort_order') || $hasCol('position') || $hasCol('display_order'),
        'json_metadata_detected' => (bool)array_filter($cols, static fn($c) => preg_match('/json|metadata|settings/i', $c['column_name']) || preg_match('/^JSON/i', $c['data_type'])),
        'favorites_direct' => $isFav,
        'priority' => $isFav ? 'HIGH' : 'MEDIUM',
        'confidence' => $body !== '' ? 'HIGH' : 'LOW',
    ];

    foreach ($cols as $c) {
        $columnInv[] = [
            'table_name' => $t, 'column_name' => $c['column_name'], 'data_type' => $c['data_type'],
            'nullable' => $c['nullable'], 'default' => $c['default'], 'primary_key' => $c['primary_key'],
            'foreign_key' => (bool)array_filter($fks, static fn($f) => in_array($c['column_name'], $f['columns'], true)),
            'indexed' => (bool)array_filter(array_merge($indexes, $uniques), static fn($i) => in_array($c['column_name'], $i['columns'], true)),
            'unique' => (bool)array_filter($uniques, static fn($u) => $u['columns'] === [$c['column_name']]),
            'source_file' => $src, 'line_number' => $allTables[$t]['first_line'],
            'confidence' => $body !== '' ? 'HIGH' : 'LOW',
        ];
    }
    foreach ($pk ? [['name' => null, 'columns' => $pk]] : [] as $p) {
        $constraintInv[] = ['constraint_id' => sprintf('FAV-DB-CST-%06d', ++$cstSeq), 'table_name' => $t,
            'constraint_type' => 'PRIMARY_KEY', 'constraint_name' => $p['name'], 'columns' => $p['columns'],
            'referenced_table' => null, 'referenced_columns' => [], 'delete_rule' => null,
            'partial' => false, 'where_clause' => null, 'source_file' => $src, 'line_number' => $allTables[$t]['first_line'], 'confidence' => 'HIGH'];
    }
    foreach ($uniques as $u) {
        $constraintInv[] = ['constraint_id' => sprintf('FAV-DB-CST-%06d', ++$cstSeq), 'table_name' => $t,
            'constraint_type' => 'UNIQUE', 'constraint_name' => $u['name'], 'columns' => $u['columns'],
            'referenced_table' => null, 'referenced_columns' => [], 'delete_rule' => null,
            'partial' => false, 'where_clause' => null, 'source_file' => $src, 'line_number' => $allTables[$t]['first_line'], 'confidence' => 'HIGH'];
    }
    foreach ($fks as $f) {
        $constraintInv[] = ['constraint_id' => sprintf('FAV-DB-CST-%06d', ++$cstSeq), 'table_name' => $t,
            'constraint_type' => 'FOREIGN_KEY', 'constraint_name' => $f['name'], 'columns' => $f['columns'],
            'referenced_table' => $f['ref_table'], 'referenced_columns' => $f['ref_columns'], 'delete_rule' => $f['delete_rule'],
            'partial' => false, 'where_clause' => null, 'source_file' => $src, 'line_number' => $allTables[$t]['first_line'], 'confidence' => 'HIGH'];
    }
    foreach ($indexes as $i) {
        $indexInv[] = ['index_name' => $i['name'], 'table_name' => $t, 'columns' => $i['columns'],
            'unique' => $i['unique'], 'partial' => false, 'index_type' => 'BTREE', 'source_file' => $src, 'confidence' => 'HIGH'];
    }

    /* ── Risk Candidate — 근거 있는 것만(§49) ────────────────────────────── */
    $addRisk = static function (string $type, string $ev) use (&$risks, &$riskSeq, $t, $src): void {
        $risks[] = ['risk_id' => sprintf('FAV-DB-RISK-%06d', ++$riskSeq), 'risk_type' => $type,
            'table_name' => $t, 'source_files' => [$src], 'evidence' => [$ev],
            'severity_candidate' => 'UNKNOWN', 'requires_manual_review' => true, 'notes' => []];
    };
    if (!$hasCol('tenant_id')) $addRisk('MISSING_TENANT_SCOPE', "tenant_id 컬럼 부재 — 컬럼: " . implode(',', $colNames));
    if (!$hasCol('user_id') && !$hasCol('principal_id')) $addRisk('MISSING_USER_SCOPE', 'user_id/principal_id 컬럼 부재 — 사용자별 저장 불가');
    if ($uniques === []) $addRisk('MISSING_UNIQUE_CONSTRAINT', '중복 방지 UNIQUE 제약 부재');
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. [ST05] Route / API 인벤토리
 * ══════════════════════════════════════════════════════════════════════════ */
$routeInv = ['specification_id' => 'CWIS-P004-U04-WS01-SP01-TK001-ST05(통합)', 'routes' => [], 'total_routes' => 0, 'favorites_routes' => 0];
$routesFile = 'backend/src/routes.php';
if (is_file($ROOT . '/' . $routesFile)) {
    $rc = (string)file_get_contents($ROOT . '/' . $routesFile);
    if (preg_match_all("/^\s*'(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\S+?)'\s*=>\s*'([^']+)'/m", $rc, $mm, PREG_SET_ORDER)) {
        $routeInv['total_routes'] = count($mm);
        foreach ($mm as $m) {
            if (!preg_match('#/(favou?rites?|bookmarks?|saved(-|_)?items?|pinned(-|_)?items?|pins?|star|unstar|unfavou?rite|unbookmark)\b#i', $m[2])) continue;
            $routeInv['routes'][] = ['http_method' => $m[1], 'path' => $m[2], 'handler' => $m[3],
                'source_file' => $routesFile, 'confidence' => 'HIGH'];
        }
    }
    $routeInv['favorites_routes'] = count($routeInv['routes']);
    $routeInv['note'] = '본 저장소 라우트 정본 = routes.php 의 \'METHOD /path\' => \'Class::method\' 문자열 맵. Laravel Route:: / Symfony Attribute 라우팅 부재.';
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. [ST06] Package / Test 인벤토리
 * ══════════════════════════════════════════════════════════════════════════ */
$pkgInv = ['specification_id' => 'CWIS-P004-U04-WS01-SP01-TK001-ST06(통합)', 'packages' => [], 'test_files' => [], 'test_runner' => null];
foreach (['backend/composer.json', 'frontend/package.json', 'package.json'] as $mf) {
    if (!is_file($ROOT . '/' . $mf)) continue;
    $j = json_decode((string)file_get_contents($ROOT . '/' . $mf), true) ?: [];
    foreach (array_merge($j['require'] ?? [], $j['require-dev'] ?? [], $j['dependencies'] ?? [], $j['devDependencies'] ?? []) as $name => $ver) {
        if (!preg_match('/favou?rite|bookmark|\bpin\b|starred|saved/i', (string)$name)) continue;
        $pkgInv['packages'][] = ['manifest' => $mf, 'name' => $name, 'version' => $ver,
            'direct_dependency' => true, 'purpose' => 'UNKNOWN', 'reuse_candidate' => 'UNKNOWN'];
    }
}
foreach (glob($ROOT . '/tools/*selftest*.mjs') ?: [] as $f) $pkgInv['test_files'][] = ['file_path' => 'tools/' . basename($f), 'framework' => 'custom selftest (mjs)'];
foreach (glob($ROOT . '/backend/bin/*selftest*.php') ?: [] as $f) $pkgInv['test_files'][] = ['file_path' => 'backend/bin/' . basename($f), 'framework' => 'custom selftest (php)'];
$pkgInv['test_runner'] = 'NONE — PHPUnit/Pest/Jest/Vitest 미설치. 자체 검증 스크립트만 존재';
$pkgInv['favorites_related_packages'] = count($pkgInv['packages']);

/* ══════════════════════════════════════════════════════════════════════════
 * 5. 출력
 * ══════════════════════════════════════════════════════════════════════════ */
$revision = null;
if (is_file($ROOT . '/.git/HEAD')) {
    $h = trim((string)file_get_contents($ROOT . '/.git/HEAD'));
    if (str_starts_with($h, 'ref: ') && is_file($ROOT . '/.git/' . substr($h, 5))) {
        $revision = substr(trim((string)file_get_contents($ROOT . '/.git/' . substr($h, 5))), 0, 12);
    }
}
$totalTargets = count($files) + count($failures);
$readErrorRate = $totalTargets > 0 ? count($failures) / $totalTargets : 0.0;

$meta = [
    'specification_id' => SPEC_ID,
    'merged_steps' => ['ST04 Database/Migration', 'ST05 Route/API', 'ST06 Test/Package'],
    'source_revision' => $revision,
    'generated_at' => gmdate('c'),
    'database_platforms' => $dbTech['platforms'],
    'database_technology' => $dbTech,
    'migration_tools' => [$dbTech['migration_tool']['actual']],
    'search_roots' => $searchRoots,
    'skipped_root_candidates' => $skippedRoots,
    'files_scanned' => count($files),
    'migration_files' => $migrationFiles,
    'sql_files' => $sqlFiles,
    'orm_files' => $ormFiles,
    'files_failed' => count($failures),
    'read_error_rate' => round($readErrorRate, 4),
    'total_tables_discovered' => count($allTables),
    'candidate_tables' => count($candidateTables),
    'matches_found' => count($rawResults),
    'sensitive_values_masked' => $maskCount,
    'large_files_skipped' => $largeSkipped,
    'symlinks_skipped_outside_root' => $symlinkSkipped,
    'failures' => $failures,
];

$write = static function (string $rel, array $data) use ($safeOut): void {
    $abs = $safeOut($rel);
    if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0775, true);
    file_put_contents($abs, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST04] 생성: $rel\n";
};
$write($paths['raw'], $meta + ['results' => $rawResults]);
$write($paths['table'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'total_tables_in_repository' => count($allTables), 'table_count' => count($tableInv), 'tables' => $tableInv]);
$write($paths['column'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'column_count' => count($columnInv), 'columns' => $columnInv]);
$write($paths['constraint'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'constraint_count' => count($constraintInv), 'index_count' => count($indexInv),
    'constraints' => $constraintInv, 'indexes' => $indexInv]);
$write($paths['orm'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'orm_detected' => $dbTech['orm']['actual_usage'], 'mapping_count' => 0, 'mappings' => [],
    'note' => 'Eloquent Model / Doctrine Entity 실사용 0건(실측). 데이터 접근은 backend/src/Db.php 의 raw PDO. ORM 매핑 인벤토리가 비어 있는 것 자체가 결론이다.']);
$write($paths['migration'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'migration_count' => count($migrations),
    'note' => '★backend/migrations 는 세션 172 에서 동결. 이후 스키마는 핸들러 ensureTables() DDL 이 정본이며 본 스캔에 포함됨.',
    'migrations' => $migrations]);
$write($paths['risk'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'risk_count' => count($risks), 'risks' => $risks]);
$write($paths['route'], $routeInv);
$write($paths['package'], $pkgInv);

printf("[ST04] 파일 %d 스캔 · 전체테이블 %d · 후보테이블 %d · 매치 %d · 제약 %d · 인덱스 %d · 마이그 %d · 위험 %d · 즐겨찾기라우트 %d · 관련패키지 %d · 실패 %d(%.1f%%)\n",
    count($files), count($allTables), count($candidateTables), count($rawResults), count($constraintInv), count($indexInv),
    count($migrations), count($risks), $routeInv['favorites_routes'], $pkgInv['favorites_related_packages'],
    count($failures), $readErrorRate * 100);

exit($readErrorRate > (float)$opt('fail-on-read-error-rate', '0.2') ? 1 : 0);
