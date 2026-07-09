#!/usr/bin/env node
/**
 * 재발 클래스 가드 — 헤더리스 `getJson` 을 세션 인증 엔드포인트에 사용하는 회귀 차단.
 *
 * 배경: apiClient.js 의 `getJson(path)` 은 fetch(url) 만 호출한다(Authorization·X-Tenant 미전송).
 *   반면 `getJsonAuth(path)` 은 defaultHeaders() 로 Bearer 토큰을 싣는다.
 *   index.php 의 public bypass 에 등록된 경로라도 핸들러가 self-auth(authedTenant → null 이면 401)
 *   하는 경우가 많아, 헤더리스 getJson 은 운영에서 401 fail-closed → 조용한 빈 화면이 된다.
 *
 * 이 결함은 237차(OmniChannel/KrChannel/AdminGrowthCenter)와 현 차수(DataAssets/DataTrustDashboard/
 *   AgencyAccess/RulesEditorV2)에 두 번 재발했다. 표면 패치 대신 클래스를 CI 가드로 제거한다.
 *
 * 규칙: frontend/src 의 어떤 파일도 apiClient 에서 `getJson` 을 별칭 없이 import 할 수 없다.
 *   인증이 필요하면 `getJsonAuth as getJson`(또는 getJsonAuth 직접)을 쓰고,
 *   진짜 공개 엔드포인트만 아래 ALLOWLIST 에 사유와 함께 등재한다.
 *
 * 사용: node tools/guard_headerless_getjson.mjs   (실패 시 exit 1)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'frontend', 'src');

/** 헤더 없이 호출해도 되는 진짜 공개 엔드포인트만 사용하는 파일. 추가 시 사유 필수. */
const ALLOWLIST = new Map([
  ['pages/Admin.jsx', 'GET /v424/health — 무인증 헬스체크'],
  ['pages/AuthPage.jsx', 'GET /api/auth/pricing/public-plans — 로그인 전 공개 요금제'],
]);

/** apiClient 에서 getJson 을 별칭 없이 들여오는 import 만 매치(`getJsonAuth as getJson` 은 미매치). */
const BAD_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*apiClient(?:\.js)?['"]/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(jsx?|tsx?)$/.test(name)) yield p;
  }
}

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(BAD_IMPORT)) {
    const named = m[1].split(',').map(s => s.trim()).filter(Boolean);
    // `getJsonAuth as getJson` 은 안전. 정확히 `getJson` 인 항목만 위반.
    if (!named.includes('getJson')) continue;
    if (ALLOWLIST.has(rel)) continue;
    // import 만 하고 호출하지 않는 죽은 import 는 위반 아님(런타임 무영향).
    if (!/(?<![A-Za-z0-9_])getJson\s*\(/.test(text)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    violations.push(`${rel}:${line}  헤더리스 getJson import — getJsonAuth 로 교체하거나 ALLOWLIST 에 사유 등재`);
  }
}

if (violations.length) {
  console.error('✖ 헤더리스 getJson 회귀 감지 (' + violations.length + '건)\n');
  for (const v of violations) console.error('  ' + v);
  console.error('\n인증 엔드포인트는 `import { getJsonAuth as getJson } from "../services/apiClient.js"` 를 사용하라.');
  process.exit(1);
}

console.log(`✓ 헤더리스 getJson 위반 0건 (허용 ${ALLOWLIST.size}건: ${[...ALLOWLIST.keys()].join(', ')})`);
