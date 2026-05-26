#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * routes.php 정합성 점검 도구 (167차 도입).
 *
 * $custom 배열에 정의되었으나 $register 가 호출되지 않은 endpoint 를 검출.
 * 미매핑 endpoint 는 Slim 에 route 등록이 안 되어 운영에서 404 처리됨.
 *
 * Usage:
 *   php backend/bin/audit_routes.php
 *
 * Exit codes: 0 = 미매핑 0건, 1 = 미매핑 발견.
 *
 * 후속 작업: 미매핑 발견 시 routes.php 끝의 "167차 routes audit" 섹션에 $register 추가.
 */

$routesPath = __DIR__ . '/../src/routes.php';
$content = file_get_contents($routesPath);

// 1) $custom = [ ... ] 안의 'METHOD /path' => 'Handler' 추출
$customKeys = [];
if (preg_match('/\$custom\s*=\s*\[(.*?)\];/s', $content, $cm)) {
    if (preg_match_all("/'([A-Z]+\\s+\\/[^']+)'\\s*=>\\s*'([^']+)'/", $cm[1], $matches)) {
        foreach ($matches[1] as $i => $key) {
            $customKeys[$key] = $matches[2][$i];
        }
    }
}

// 2) $register('METHOD', '/path') 호출 추출
$registeredKeys = [];
if (preg_match_all("/\\\$register\\s*\\(\\s*'([A-Z]+)'\\s*,\\s*'(\\/[^']+)'/", $content, $rm)) {
    foreach ($rm[1] as $i => $method) {
        $registeredKeys[$method . ' ' . $rm[2][$i]] = true;
    }
}

echo "=== routes.php 정합성 점검 ===\n";
echo "Total \$custom keys:    " . count($customKeys) . "\n";
echo "Total \$register calls: " . count($registeredKeys) . "\n\n";

// 3) $custom에만 있고 $register 미호출 (운영 매핑 안 됨)
$customOnly = [];
foreach ($customKeys as $key => $handler) {
    if (!isset($registeredKeys[$key])) {
        $customOnly[$key] = $handler;
    }
}

// 4) $register만 있고 $custom 없는 (template fallback) — 정상
$registerOnlyCount = 0;
foreach ($registeredKeys as $key => $_) {
    if (!isset($customKeys[$key])) {
        $registerOnlyCount++;
    }
}

echo "[CRITICAL] \$custom 정의되었으나 \$register 미호출 (미매핑): " . count($customOnly) . "\n";
foreach ($customOnly as $key => $handler) {
    echo "  ! $key  → $handler\n";
}
echo "\n";

echo "[INFO] template fallback (\$register only, \$custom 미정의): " . $registerOnlyCount . " 건 — 정상\n";

exit(empty($customOnly) ? 0 : 1);
