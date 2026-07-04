#!/usr/bin/env node
/**
 * [265차] 라우트 등록 정합 CI 가드 — routes.php 의 $custom(정의) ↔ $register(등록) 2단계 불일치 검출.
 *
 * 재발 방지 대상(265차 실측 트랩): $custom 맵에 라우트를 추가하고 $register 호출을 누락하면
 *   FastRoute 에 등록되지 않아 런타임 "Not found"(404) 무음 실패. php -l 로는 검출 불가.
 *
 * 검사:
 *  - RULE-1(치명): $custom 의 비-/api 라우트(plain path)인데 $register 호출이 없음 → 정의됐으나 도달불가.
 *    (/api/ 변형은 basePath('/api') strip 으로 plain 라우트의 $register 가 커버 → 자체 $register 불요=정상)
 *  - RULE-2(정보): $register 호출인데 $custom 키 부재 → 템플릿/미구현 폴백 라우트($templateHandler/$notImpl). 정상(비-실패).
 *
 * 사용: node tools/check_routes_registered.mjs [routes.php경로]  · exit 1 = RULE-1 위반 존재.
 * 화이트리스트: 의도적 미등록 plain 라우트는 ROUTE_GUARD_ALLOW(아래)에 'METHOD /path' 추가.
 */
import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'backend/src/routes.php';
let src;
try { src = readFileSync(path, 'utf8'); } catch (e) { console.error(`[check-routes] 파일 없음: ${path}`); process.exit(2); }

// 의도적으로 $register 하지 않는 plain $custom 라우트(있다면 여기 등록·근거 주석)
const ALLOW = new Set([
  // 예: 'GET /v382/products',  // 템플릿 백킹(핸들러 없음·$register 없이 유지)
]);

const METHODS = 'GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD';

// $custom 키: 라인 시작(들여쓰기)에서 'METHOD /path' => 형태
const custom = new Set();
const customRe = new RegExp(`^\\s*'(${METHODS})\\s+(\\S+?)'\\s*=>`, 'gm');
for (let m; (m = customRe.exec(src)); ) custom.add(`${m[1]} ${m[2]}`);

// $register('METHOD', '/path')  또는  $register('METHOD', $pfx . '/path')  (변수접두 결합 대응)
// 문자열 리터럴 경로 세그먼트를 캡처($pfx='' | '/api' 루프로 등록하는 admin/growth 등 커버).
const registered = new Set();
const regRe = new RegExp(`\\$register\\(\\s*['"](${METHODS})['"]\\s*,\\s*(?:\\$\\w+\\s*\\.\\s*)?['"]([^'"]+)['"]`, 'g');
for (let m; (m = regRe.exec(src)); ) {
  const method = m[1]; let p = m[2];
  registered.add(`${method} ${p}`);
  // $pfx 접두 결합 등록은 plain + '/api'+path 양쪽을 커버 → /api 변형도 등록으로 간주
  if (!p.startsWith('/api/')) registered.add(`${method} /api${p}`);
}

const violations = [];   // RULE-1
const templateOnly = []; // RULE-2

for (const key of custom) {
  const [, p] = key.split(/\s+/).length === 2 ? [null, key.split(' ')[1]] : [null, ''];
  const routePath = key.substring(key.indexOf(' ') + 1);
  if (routePath.startsWith('/api/')) continue;          // basePath strip 커버
  if (ALLOW.has(key)) continue;
  if (!registered.has(key)) violations.push(key);
}
for (const key of registered) {
  const routePath = key.substring(key.indexOf(' ') + 1);
  if (routePath.startsWith('/api/')) continue;
  if (!custom.has(key)) templateOnly.push(key);
}

console.log(`[check-routes] $custom(plain+api)=${custom.size} · $register=${registered.size}`);
if (templateOnly.length) console.log(`[check-routes] RULE-2(정보·정상) $register-only(템플릿/미구현 폴백) ${templateOnly.length}건`);

if (violations.length) {
  console.error(`\n[check-routes] ❌ RULE-1 위반 ${violations.length}건 — $custom 정의됐으나 $register 누락(런타임 Not found):`);
  for (const v of violations.sort()) console.error(`  - ${v}`);
  console.error(`\n→ backend/src/routes.php 의 $register 블록에 위 라우트를 추가하거나, 의도적 미등록이면 tools/check_routes_registered.mjs 의 ALLOW 에 근거와 함께 등록하십시오.`);
  process.exit(1);
}
console.log('[check-routes] ✅ OK — 모든 plain $custom 라우트가 $register 됨(도달가능).');
