#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Migration CLI runner (165차 spec v3 §13.5).
 *
 * Usage:
 *   php backend/bin/migrate.php [both|production|demo|current]
 *
 * Default mode: 'both' (운영 + 데모 동시 적용, U-165-C L2 동기화).
 * Exit codes: 0=성공, 1=실패, 2=잘못된 인자.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Migrate;

$mode = $argv[1] ?? 'both';

try {
    if ($mode === 'both') {
        $result = Migrate::runBoth();

        echo "=== Production ===\n";
        echo "Applied: " . count($result['production']['applied']) . "\n";
        foreach ($result['production']['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($result['production']['skipped']) . "\n";

        echo "\n=== Demo ===\n";
        echo "Applied: " . count($result['demo']['applied']) . "\n";
        foreach ($result['demo']['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($result['demo']['skipped']) . "\n";

    } elseif ($mode === 'production') {
        $r = Migrate::run(Db::pdoFor(false));
        echo "=== Production ===\n";
        echo "Applied: " . count($r['applied']) . "\n";
        foreach ($r['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($r['skipped']) . "\n";

    } elseif ($mode === 'demo') {
        $r = Migrate::run(Db::pdoFor(true));
        echo "=== Demo ===\n";
        echo "Applied: " . count($r['applied']) . "\n";
        foreach ($r['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($r['skipped']) . "\n";

    } elseif ($mode === 'current') {
        $r = Migrate::run(Db::pdo());
        echo "Env: " . Db::env() . "\n";
        echo "Applied: " . count($r['applied']) . "\n";
        foreach ($r['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($r['skipped']) . "\n";

    } else {
        fwrite(STDERR, "Usage: migrate.php [both|production|demo|current]\n");
        fwrite(STDERR, "  both       — 운영 + 데모 동시 적용 (기본)\n");
        fwrite(STDERR, "  production — 운영 DB 만\n");
        fwrite(STDERR, "  demo       — 데모 DB 만\n");
        fwrite(STDERR, "  current    — GENIE_ENV 가 가리키는 환경만\n");
        exit(2);
    }

    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[migrate] FAILED: " . $e->getMessage() . "\n");
    if ($e->getPrevious()) {
        fwrite(STDERR, "  caused by: " . $e->getPrevious()->getMessage() . "\n");
    }
    exit(1);
}
