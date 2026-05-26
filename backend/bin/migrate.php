#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Migration CLI runner (165차 spec v3 §13.5, 166차 --dry-run 보강).
 *
 * Usage:
 *   php backend/bin/migrate.php [both|production|demo|current] [--dry-run]
 *
 * Default mode: 'both' (운영 + 데모 동시 적용, U-165-C L2 동기화).
 * --dry-run: 적용 예정 migration 식별만, DB 변경 없음 (schema_migrations 테이블만 idempotent CREATE).
 * Exit codes: 0=성공, 1=실패, 2=잘못된 인자.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Migrate;

// 인자 파싱: mode 위치 인자 + --dry-run 옵션 (위치 무관)
$args     = array_slice($argv, 1);
$dryRun   = false;
$modeArgs = [];
foreach ($args as $a) {
    if ($a === '--dry-run') $dryRun = true;
    else                    $modeArgs[] = $a;
}
$mode = $modeArgs[0] ?? 'both';

/**
 * dry-run 결과 1환경 출력.
 * @param array{pending: string[], skipped: string[]} $r
 */
function printDryRun(string $label, array $r): void
{
    echo "=== DRY-RUN === $label ===\n";
    echo "Skipped: " . count($r['skipped']) . " (이미 schema_migrations 에 기록됨)\n";
    foreach ($r['skipped'] as $f) echo "  - $f\n";
    echo "Pending: " . count($r['pending']) . " (적용 예정)\n";
    foreach ($r['pending'] as $f) echo "  + $f\n";
    echo "\n";
}

/**
 * 실 적용 결과 1환경 출력.
 * @param array{applied: string[], skipped: string[]} $r
 */
function printApply(string $label, array $r): void
{
    echo "=== $label ===\n";
    echo "Applied: " . count($r['applied']) . "\n";
    foreach ($r['applied'] as $f) echo "  + $f\n";
    echo "Skipped: " . count($r['skipped']) . "\n";
}

try {
    if ($dryRun) {
        if ($mode === 'both') {
            $r = Migrate::dryRunBoth();
            printDryRun('Production', $r['production']);
            printDryRun('Demo',       $r['demo']);
        } elseif ($mode === 'production') {
            printDryRun('Production', Migrate::dryRun(Db::pdoFor(false)));
        } elseif ($mode === 'demo') {
            printDryRun('Demo', Migrate::dryRun(Db::pdoFor(true)));
        } elseif ($mode === 'current') {
            printDryRun('Env=' . Db::env(), Migrate::dryRun(Db::pdo()));
        } else {
            fwrite(STDERR, "Usage: migrate.php [both|production|demo|current] [--dry-run]\n");
            exit(2);
        }
        echo "[검토] SQL 사전 확인: cat backend/migrations/<filename>.sql\n";
        echo "[실 적용] --dry-run 옵션 제거 후 재실행\n";
    } else {
        if ($mode === 'both') {
            $result = Migrate::runBoth();
            printApply('Production', $result['production']);
            echo "\n";
            printApply('Demo', $result['demo']);
        } elseif ($mode === 'production') {
            printApply('Production', Migrate::run(Db::pdoFor(false)));
        } elseif ($mode === 'demo') {
            printApply('Demo', Migrate::run(Db::pdoFor(true)));
        } elseif ($mode === 'current') {
            $r = Migrate::run(Db::pdo());
            echo "Env: " . Db::env() . "\n";
            echo "Applied: " . count($r['applied']) . "\n";
            foreach ($r['applied'] as $f) echo "  + $f\n";
            echo "Skipped: " . count($r['skipped']) . "\n";
        } else {
            fwrite(STDERR, "Usage: migrate.php [both|production|demo|current] [--dry-run]\n");
            fwrite(STDERR, "  both       — 운영 + 데모 동시 적용 (기본)\n");
            fwrite(STDERR, "  production — 운영 DB 만\n");
            fwrite(STDERR, "  demo       — 데모 DB 만\n");
            fwrite(STDERR, "  current    — GENIE_ENV 가 가리키는 환경만\n");
            fwrite(STDERR, "  --dry-run  — 적용 예정 식별만, DB 변경 없음\n");
            exit(2);
        }
    }

    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[migrate] FAILED: " . $e->getMessage() . "\n");
    if ($e->getPrevious()) {
        fwrite(STDERR, "  caused by: " . $e->getPrevious()->getMessage() . "\n");
    }
    exit(1);
}
