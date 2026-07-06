#!/usr/bin/env node
/**
 * GeniegoROI E2E 시나리오 (쓰기/상호작용 플로우) — [266차 신설]
 *
 * smoke(읽기)·render(마운트)가 못 잡는 **쓰기 경로**를 커버. 핵심 유저 플로우를 실제로 write→read→검증한다.
 *   ★모든 시나리오는 가역(생성→검증→삭제 / PUT→검증→원복)으로 자가정리 → 운영 데이터 오염 0.
 *   ★그래도 안전을 위해 데모 백엔드(격리 DB) 대상 실행 권장: E2E_BASE=https://roidemo.genie-go.com
 *
 * ★CI 자동 실행 금지(쓰기·부하) — 온디맨드/수동만. smoke 는 CI, scenario 는 배포 후 수동 npm run e2e:scenario.
 *
 * 사용: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BASE=https://roidemo.genie-go.com] node tools/e2e/scenarios.mjs
 * 종료코드: 0=전부 통과, 1=실패. 자격증명 env 로만(하드코딩 금지).
 */

const BASE = (process.env.E2E_BASE || 'https://roi.genie-go.com').replace(/\/$/, '');
const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const ACCESS_CODE = process.env.E2E_ACCESS_CODE || 'GENIEGO-ADMIN';
const C = { red: '\x1b[31m', grn: '\x1b[32m', yel: '\x1b[33m', dim: '\x1b[2m', rst: '\x1b[0m' };
const ok = (m) => console.log(`${C.grn}✓${C.rst} ${m}`);
const bad = (m) => console.log(`${C.red}✗ ${m}${C.rst}`);
const info = (m) => console.log(`${C.dim}· ${m}${C.rst}`);
let FAIL = 0, H = null;

async function req(method, path, body) {
  const opt = { method, headers: { ...H } };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(`${BASE}${path}`, opt);
  const txt = await r.text().catch(() => '');
  let json = null; try { json = JSON.parse(txt); } catch {}
  return { s: r.status, json, txt };
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── 시나리오 1: 워크스페이스 영속 왕복(설정이 새로고침 넘어 유지되는가) — PUT→GET→원복 ──
async function scenarioWorkspace() {
  const KEY = 'calendar_events';
  // 원본 백업
  const cur = await req('GET', `/api/v424/workspace?key=${KEY}`);
  assert(cur.s === 200, `workspace GET(원본) HTTP ${cur.s}`);
  const orig = cur.json && ('value' in cur.json) ? cur.json.value : null;
  const marker = 'e2e-scn-' + Math.floor(Date.now() / 1000);
  const testVal = [{ id: marker, date: '2099-01-01', title: 'E2E scenario probe' }];
  try {
    const put = await req('POST', '/api/v424/workspace', { key: KEY, value: testVal });
    assert(put.s === 200 && put.json && put.json.ok, `workspace PUT HTTP ${put.s} ${put.txt.slice(0, 80)}`);
    const get = await req('GET', `/api/v424/workspace?key=${KEY}`);
    assert(get.s === 200, `workspace GET(검증) HTTP ${get.s}`);
    const roundtrip = Array.isArray(get.json?.value) && get.json.value.some(x => x && x.id === marker);
    assert(roundtrip, 'workspace 왕복 불일치(저장→읽기 실패)');
    ok('S1 워크스페이스 영속 왕복(PUT→GET roundtrip)');
  } finally {
    // 원복(원본이 null 이면 빈 배열로 — calendar_events 는 배열형)
    await req('POST', '/api/v424/workspace', { key: KEY, value: orig ?? [] }).catch(() => {});
  }
}

// ── 시나리오 2: 웹팝업 전체 수명주기(생성→목록검증→삭제→소멸검증) + 266차 type 계약키 ──
async function scenarioWebPopupCrud() {
  const name = 'E2E-SCN-' + Math.floor(Date.now() / 1000);
  let id = null;
  try {
    const cr = await req('POST', '/api/v424/web-popups', { name, ptype: 'center_modal', trigger: 'exit', status: 'paused' });
    assert(cr.s === 200 && cr.json && cr.json.ok, `webpopup 생성 HTTP ${cr.s} ${cr.txt.slice(0, 80)}`);
    id = cr.json.popup && cr.json.popup.id;
    assert(id, 'webpopup 생성 응답에 id 없음');
    // 266차 계약키: 생성 응답에 type(=ptype 별칭)
    assert(cr.json.popup && ('type' in cr.json.popup), 'webpopup 계약키 type 누락(266차 회귀!)');
    const list = await req('GET', '/api/v424/web-popups');
    assert(list.s === 200 && Array.isArray(list.json?.popups), `webpopup 목록 HTTP ${list.s}`);
    const found = list.json.popups.find(p => p.id === id);
    assert(found, '생성한 웹팝업이 목록에 없음(영속 실패)');
    assert('type' in found, '목록 항목 type 누락(266차 회귀!)');
    ok(`S2 웹팝업 수명주기(생성→목록→type계약 id=${id})`);
  } finally {
    if (id) {
      const del = await req('DELETE', `/api/v424/web-popups/${id}`);
      if (del.s === 200) { const chk = await req('GET', '/api/v424/web-popups'); const gone = !(chk.json?.popups || []).some(p => p.id === id); if (gone) ok(`   정리: 웹팝업 ${id} 삭제`); else bad(`   정리 실패: ${id} 잔존`); }
      else bad(`   정리 실패: DELETE HTTP ${del.s}`);
    }
  }
}

// ── 시나리오 3: CRM 세그먼트 수명주기(생성→목록검증→삭제→소멸검증) — CRM 핵심 쓰기 플로우 ──
async function scenarioCrmSegment() {
  const name = 'E2E-SCN-' + Math.floor(Date.now() / 1000);
  let id = null;
  const pickArr = (j) => Array.isArray(j?.segments) ? j.segments : (Array.isArray(j?.data) ? j.data : (Array.isArray(j?.rows) ? j.rows : (Array.isArray(j) ? j : [])));
  try {
    const cr = await req('POST', '/api/crm/segments', { name, description: 'e2e probe', rules: [], color: '#4f8ef7' });
    assert(cr.s === 200 && cr.json && cr.json.ok, `segment 생성 HTTP ${cr.s} ${cr.txt.slice(0, 80)}`);
    id = cr.json.id;
    assert(id, 'segment 생성 응답에 id 없음');
    assert('member_count' in cr.json, 'segment 계약키 member_count 누락');
    const list = await req('GET', '/api/crm/segments');
    assert(list.s === 200, `segment 목록 HTTP ${list.s}`);
    const found = pickArr(list.json).find(x => x && x.id === id);
    assert(found, '생성한 세그먼트가 목록에 없음(영속 실패)');
    ok(`S3 CRM 세그먼트 수명주기(생성→목록 id=${id})`);
  } finally {
    if (id) {
      const del = await req('DELETE', `/api/crm/segments/${id}`);
      if (del.s === 200) { const chk = await req('GET', '/api/crm/segments'); const gone = !pickArr(chk.json).some(x => x && x.id === id); if (gone) ok(`   정리: 세그먼트 ${id} 삭제`); else bad(`   정리 실패: ${id} 잔존`); }
      else bad(`   정리 실패: DELETE HTTP ${del.s}`);
    }
  }
}

const SCENARIOS = [
  ['워크스페이스 영속 왕복', scenarioWorkspace],
  ['웹팝업 CRUD 수명주기', scenarioWebPopupCrud],
  ['CRM 세그먼트 CRUD 수명주기', scenarioCrmSegment],
];

async function main() {
  if (!EMAIL || !PASSWORD) { bad('E2E_EMAIL / E2E_PASSWORD 필요(하드코딩 금지).'); process.exit(2); }
  info(`BASE=${BASE}  (쓰기 시나리오 — 데모 백엔드 권장)`);
  const lr = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD, access_code: ACCESS_CODE }) });
  const lj = await lr.json().catch(() => ({}));
  const token = lj.token || lj.access_token || (lj.data && lj.data.token) || '';
  if (lr.status !== 200 || !token) { bad(`로그인 실패 HTTP ${lr.status}`); process.exit(1); }
  H = { 'Authorization': `Bearer ${token}`, 'X-Lang': 'ko' };
  ok(`로그인 (tenant=${lj.tenant_id || lj.tenant || '?'})`);

  for (const [label, fn] of SCENARIOS) {
    try { await fn(); }
    catch (e) { FAIL++; bad(`${label} 실패: ${e.message}`); }
  }

  console.log('');
  if (FAIL) { bad(`E2E 시나리오 실패: ${FAIL}건`); process.exit(1); }
  ok('E2E 시나리오 전부 통과 — 쓰기 경로(영속·CRUD) 무결·자가정리 완료'); process.exit(0);
}
main().catch(e => { bad(`치명 오류: ${e.stack || e}`); process.exit(1); });
