<?php
/**
 * [현 차수] 전 테넌트 공용 채널 카테고리 카탈로그 시딩 (운영자 전용 · 서버에서 실행).
 *
 * 배경: 11번가는 카테고리 목록 조회 API 를 제공하지 않는다(공식 개발가이드 확인 — 셀러 API 에 해당
 *   엔드포인트가 없고, API 서버는 IP 화이트리스트로 외부 호출도 막는다). 그렇다고 카테고리 코드를
 *   임의로 만들면 엉뚱한 카테고리로 상품이 등록된다 → 채널이 제공하는 공식 파일만 정본으로 적재한다.
 *   그 트리는 모든 판매자에게 동일하므로, 여기에 한 번 시딩하면 전 테넌트가 즉시 사용한다.
 *   (HTTP 임포트 경로는 테넌트 범위로만 쓰기 때문에, 공용 스코프를 채우는 길은 이 스크립트뿐이다.)
 *
 * 사용법:
 *   php backend/bin/seed_channel_categories.php <channel> <csv_path> [--replace]
 *
 * CSV 형식(헤더 필수, UTF-8):
 *   code,name,whole,leaf
 *   1001763,니트/스웨터,패션의류 > 여성의류 > 니트/스웨터,1
 *
 *   · whole 생략 시 name 을 그대로 쓴다.
 *   · leaf 생략 시 1(선택 가능)로 본다.
 *
 * 예:
 *   php backend/bin/seed_channel_categories.php 11st /root/11st_categories.csv --replace
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;

const SHARED_TENANT = '__shared__';

$argvv   = $_SERVER['argv'];
$channel = strtolower(trim((string)($argvv[1] ?? '')));
$csvPath = (string)($argvv[2] ?? '');
$replace = in_array('--replace', $argvv, true);

if ($channel === '' || $csvPath === '') {
    fwrite(STDERR, "usage: php seed_channel_categories.php <channel> <csv_path> [--replace]\n");
    exit(1);
}
if (!is_file($csvPath)) {
    fwrite(STDERR, "csv not found: {$csvPath}\n");
    exit(1);
}

$pdo    = Db::pdo();   // 실행된 배포(운영/데모)의 .env 를 따른다 — 각 docroot 에서 한 번씩 실행할 것.
$isMy   = strpos((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME), 'mysql') !== false;
$now    = gmdate('c');

// 테이블 보장 — Catalog::ensureTables() 와 동일 스키마(핸들러가 아직 한 번도 호출되지 않은 DB 대비).
if ($isMy) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS channel_category_catalog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
        channel VARCHAR(100) NOT NULL,
        code VARCHAR(190) NOT NULL,
        name VARCHAR(255),
        whole_name VARCHAR(500),
        is_leaf TINYINT(1) NOT NULL DEFAULT 0,
        synced_at VARCHAR(32),
        UNIQUE KEY uq_ccc (tenant_id, channel, code),
        KEY idx_ccc_leaf (tenant_id, channel, is_leaf)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} else {
    $pdo->exec("CREATE TABLE IF NOT EXISTS channel_category_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
        channel TEXT NOT NULL, code TEXT NOT NULL, name TEXT, whole_name TEXT,
        is_leaf INTEGER NOT NULL DEFAULT 0, synced_at TEXT,
        UNIQUE (tenant_id, channel, code)
    )");
}

$fh = fopen($csvPath, 'r');
if (!$fh) { fwrite(STDERR, "cannot open csv\n"); exit(1); }

// BOM 제거 후 헤더 파싱.
$header = fgetcsv($fh);
if (!$header) { fwrite(STDERR, "empty csv\n"); exit(1); }
$header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$header[0]);
$idx = [];
foreach ($header as $i => $h) { $idx[strtolower(trim((string)$h))] = $i; }
if (!isset($idx['code']) || !isset($idx['name'])) {
    fwrite(STDERR, "csv must have 'code' and 'name' columns (got: " . implode(',', $header) . ")\n");
    exit(1);
}

$sql = $isMy
    ? "INSERT INTO channel_category_catalog(tenant_id,channel,code,name,whole_name,is_leaf,synced_at) VALUES(?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name),whole_name=VALUES(whole_name),is_leaf=VALUES(is_leaf),synced_at=VALUES(synced_at)"
    : "INSERT INTO channel_category_catalog(tenant_id,channel,code,name,whole_name,is_leaf,synced_at) VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(tenant_id,channel,code) DO UPDATE SET name=excluded.name,whole_name=excluded.whole_name,is_leaf=excluded.is_leaf,synced_at=excluded.synced_at";

$pdo->beginTransaction();
try {
    if ($replace) {
        $pdo->prepare("DELETE FROM channel_category_catalog WHERE tenant_id=? AND channel=?")
            ->execute([SHARED_TENANT, $channel]);
    }
    $st = $pdo->prepare($sql);
    $n = 0; $skipped = 0;
    while (($row = fgetcsv($fh)) !== false) {
        $code  = trim((string)($row[$idx['code']] ?? ''));
        $name  = trim((string)($row[$idx['name']] ?? ''));
        $whole = isset($idx['whole']) ? trim((string)($row[$idx['whole']] ?? '')) : '';
        $leaf  = isset($idx['leaf'])  ? (int)!!trim((string)($row[$idx['leaf']] ?? '1')) : 1;
        if ($code === '' || $name === '') { $skipped++; continue; }
        if ($whole === '') $whole = $name;
        $st->execute([SHARED_TENANT, $channel, $code, mb_substr($name, 0, 255), mb_substr($whole, 0, 500), $leaf, $now]);
        $n++;
    }
    $pdo->commit();
    fclose($fh);
    echo "seeded channel={$channel} rows={$n} skipped={$skipped} scope=" . SHARED_TENANT . "\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    fclose($fh);
    fwrite(STDERR, "failed: " . $e->getMessage() . "\n");
    exit(1);
}
