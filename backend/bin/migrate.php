#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Migration CLI runner (165차 spec v3 §13.5, 166차 --dry-run, 167차 --rollback 보강).
 *
 * Usage:
 *   php backend/bin/migrate.php [both|production|demo|current] [--dry-run]
 *   php backend/bin/migrate.php [both|production|demo|current] --rollback[=N] [--dry-run]
 *
 * Default mode: 'both' (운영 + 데모 동시 적용, U-165-C L2 동기화).
 * --dry-run    : 적용 예정 식별만, DB 변경 없음 (schema_migrations 만 idempotent CREATE).
 * --rollback   : 마지막 1개 migration rollback. `--rollback=N` 으로 N개 rollback.
 *                rollback 은 migration 파일의 `-- @rollback` 블록 SQL 을 적용 + schema_migrations record 제거.
 *                @rollback 마커 미존재 시 명확한 에러로 중단 (안전 디폴트).
 * Exit codes   : 0=성공, 1=실패, 2=잘못된 인자.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Migrate;

// 인자 파싱: mode 위치 인자 + --dry-run / --rollback[=N] 옵션 (위치 무관)
$args         = array_slice($argv, 1);
$dryRun       = false;
$rollback     = false;
$rollbackSteps = 1;
$modeArgs     = [];
foreach ($args as $a) {
    if ($a === '--dry-run') {
        $dryRun = true;
    } elseif ($a === '--rollback') {
        $rollback = true;
    } elseif (preg_match('/^--rollback=(\d+)$/', $a, $m)) {
        $rollback = true;
        $rollbackSteps = max(1, (int)$m[1]);
    } else {
        $modeArgs[] = $a;
    }
}
$mode = $modeArgs[0] ?? 'both';

function printDryRun(string $label, array $r): void
{
    echo "=== DRY-RUN === $label ===\n";
    echo "Skipped: " . count($r['skipped']) . " (이미 schema_migrations 에 기록됨)\n";
    foreach ($r['skipped'] as $f) echo "  - $f\n";
    echo "Pending: " . count($r['pending']) . " (적용 예정)\n";
    foreach ($r['pending'] as $f) echo "  + $f\n";
    echo "\n";
}

function printApply(string $label, array $r): void
{
    echo "=== $label ===\n";
    echo "Applied: " . count($r['applied']) . "\n";
    foreach ($r['applied'] as $f) echo "  + $f\n";
    echo "Skipped: " . count($r['skipped']) . "\n";
}

function printDryRunRollback(string $label, array $r): void
{
    echo "=== DRY-RUN ROLLBACK === $label ===\n";
    echo "Planned: " . count($r['planned']) . " (rollback 예정 — @rollback 블록 검증됨)\n";
    foreach ($r['planned'] as $f) echo "  - $f\n";
    if (!empty($r['missing_rollback'])) {
        echo "Missing rollback: " . count($r['missing_rollback']) . " (@rollback 블록 없음 → 실 rollback 시 에러)\n";
        foreach ($r['missing_rollback'] as $f) echo "  ! $f\n";
    }
    echo "\n";
}

function printRollback(string $label, array $r): void
{
    echo "=== ROLLBACK === $label ===\n";
    echo "Reverted: " . count($r['reverted']) . "\n";
    foreach ($r['reverted'] as $f) echo "  - $f\n";
}

function usage(): void
{
    fwrite(STDERR, "Usage: migrate.php [both|production|demo|current] [--dry-run] [--rollback[=N]]\n");
    fwrite(STDERR, "  both         — 운영 + 데모 동시 (기본)\n");
    fwrite(STDERR, "  production   — 운영 DB 만\n");
    fwrite(STDERR, "  demo         — 데모 DB 만\n");
    fwrite(STDERR, "  current      — GENIE_ENV 가 가리키는 환경만\n");
    fwrite(STDERR, "  --dry-run    — 적용/rollback 예정 식별만, DB 변경 없음\n");
    fwrite(STDERR, "  --rollback   — 마지막 1개 migration rollback (--rollback=N 으로 N개)\n");
    fwrite(STDERR, "                 migration 파일에 '-- @rollback' 블록 convention 필요\n");
}

try {
    if ($rollback) {
        // ── rollback 모드 ──
        if ($dryRun) {
            if ($mode === 'both') {
                $r = Migrate::dryRunRollbackBoth($rollbackSteps);
                printDryRunRollback('Production', $r['production']);
                printDryRunRollback('Demo',       $r['demo']);
            } elseif ($mode === 'production') {
                printDryRunRollback('Production', Migrate::dryRunRollback(Db::pdoFor(false), $rollbackSteps));
            } elseif ($mode === 'demo') {
                printDryRunRollback('Demo', Migrate::dryRunRollback(Db::pdoFor(true), $rollbackSteps));
            } elseif ($mode === 'current') {
                printDryRunRollback('Env=' . Db::env(), Migrate::dryRunRollback(Db::pdo(), $rollbackSteps));
            } else {
                usage();
                exit(2);
            }
            echo "[검토] @rollback 블록 SQL 사전 확인: cat backend/migrations/<filename>.sql\n";
            echo "[실 rollback] --dry-run 옵션 제거 후 재실행\n";
        } else {
            if ($mode === 'both') {
                $result = Migrate::rollbackBoth($rollbackSteps);
                printRollback('Production', $result['production']);
                echo "\n";
                printRollback('Demo', $result['demo']);
            } elseif ($mode === 'production') {
                printRollback('Production', Migrate::rollback(Db::pdoFor(false), $rollbackSteps));
            } elseif ($mode === 'demo') {
                printRollback('Demo', Migrate::rollback(Db::pdoFor(true), $rollbackSteps));
            } elseif ($mode === 'current') {
                $r = Migrate::rollback(Db::pdo(), $rollbackSteps);
                echo "Env: " . Db::env() . "\n";
                echo "Reverted: " . count($r['reverted']) . "\n";
                foreach ($r['reverted'] as $f) echo "  - $f\n";
            } else {
                usage();
                exit(2);
            }
        }
    } elseif ($dryRun) {
        // ── dry-run apply 모드 ──
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
            usage();
            exit(2);
        }
        echo "[검토] SQL 사전 확인: cat backend/migrations/<filename>.sql\n";
        echo "[실 적용] --dry-run 옵션 제거 후 재실행\n";
    } else {
        // ── 실 apply 모드 ──
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
            usage();
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
