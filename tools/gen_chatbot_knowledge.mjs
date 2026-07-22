#!/usr/bin/env node
/**
 * gen_chatbot_knowledge.mjs — 상담 챗봇(무엇이든 물어보세요) 지식 자동 생성기. [270차 신설 · 현 차수 v2]
 *
 * 목적: "기능이 추가되면 챗봇이 자동으로 그 기능을 **절차까지** 설명"하도록 정본에서 지식을 생성한다.
 *
 * ── v1(270차)의 한계와 근본 원인 ────────────────────────────────────────────
 *   v1 은 App.jsx **라우트만** 스캔했다. 그래서
 *     ① 페이지 **내부** 기능(예: WMS 안의 CCTV 실시간 조회 = components/CctvManager.jsx)은 아예 안 잡히고,
 *     ② 잡히더라도 `라벨(경로)` 한 줄뿐이라 "CCTV 설정 진행순서 알려줘" 같은 **절차 질문에 답할 재료가 없었다**.
 *
 * ── v2 의 착상 ────────────────────────────────────────────────────────────
 *   이 저장소는 모든 고객대면 문자열을 i18n 키로 강제한다(신규 키는 15개국 병합이 규칙).
 *   따라서 **i18n 네임스페이스가 곧 그 기능의 어휘**다:
 *       wms.cctv.title      → 기능명            wms.cctv.fHost     → 입력 필드
 *       wms.cctv.addBtn     → 사용자 행동(버튼)  wms.cctv.secNote   → 주의/보안 안내
 *       wms.cctv.testBtn    → 검증 단계          wms.cctv.statOk    → 상태값
 *   이 구조를 기계적으로 추출하면 **사람이 문서를 안 써도** 절차 안내가 가능한 지식이 나온다.
 *   → 신규 기능은 i18n 키만 추가하면(=이미 필수 규칙) 챗봇이 자동으로 상세 설명하게 된다.
 *
 * ── 산출물 2종 ────────────────────────────────────────────────────────────
 *   1) backend/data/chatbot_feature_map.md      — 컴팩트 인덱스(시스템프롬프트에 상시 주입)
 *        = 큐레이션 정본 + 라우트 자동감지 + **페이지 내부 기능 목록**(v2 신규)
 *   2) backend/data/chatbot_feature_details.json — 기능별 상세 인벤토리(질문 관련분만 런타임 주입)
 *        = 진입경로 · 행동(버튼) · 입력 필드 · 검증 · 안내/주의 · 상태값 · 다국어 별칭
 *      전량을 프롬프트에 넣으면 매 질문 토큰이 폭증하므로 ClaudeAI::assistant 가 질문과
 *      매칭되는 상위 기능만 골라 주입한다(결정적 소형 검색 — 모델 호출 없음).
 *
 * 실행: node tools/gen_chatbot_knowledge.mjs   (deploy.ps1 훅 + `npm run chatbot:kb`)
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

/* ══════════════════════════ 0. 로케일 로드 ══════════════════════════ */
const LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'hi', 'pt', 'ru'];
const locales = {};
for (const l of LANGS) {
  try {
    const mod = await import(url.pathToFileURL(p('frontend/src/i18n/locales', `${l}.js`)).href);
    locales[l] = mod.default || {};
  } catch { locales[l] = {}; }
}
const dig = (obj, dotted) => dotted.split('.').reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, obj);

/* ══════════════════════════ 1. 라우트 ↔ 컴포넌트 ══════════════════════════ */
const app = read(p('frontend/src/App.jsx'));
const lazyMap = {};   // 컴포넌트명 → 파일 basename
for (const m of app.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"][^'"]*\/([A-Za-z0-9_]+)\.jsx['"]\)\)/g)) lazyMap[m[1]] = m[2];
/* ★가드로 감싼 라우트(element={<AdminRouteGuard><Admin /></AdminRouteGuard>})는 첫 컴포넌트가 가드다.
 *   그대로 잡으면 /admin 계열 8개 라우트의 실제 페이지를 놓친다(v1의 잠재 결함).
 *   래퍼로 보이는 이름(Guard·Provider·Layout 접미, Require·Protected·With 접두)은 건너뛰고
 *   그 다음 컴포넌트를 실제 페이지로 본다. */
const isWrapper = c => /(Guard|Provider|Layout)$/.test(c) || /^(Require|Protected|With)/.test(c);
const routes = [];
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([^}]*)\}/g)) {
  const comps = [...m[2].matchAll(/<([A-Za-z0-9_]+)/g)].map(x => x[1]);
  const comp = comps.find(c => !isWrapper(c)) || comps[0];
  if (comp) routes.push({ path: m[1], comp });
}

const routeOfBasename = {};   // 파일 basename → 라우트 경로
for (const r of routes) {
  if (r.path.includes(':') || r.path === '*') continue;
  const base = lazyMap[r.comp] || r.comp;
  if (!routeOfBasename[base]) routeOfBasename[base] = r.path;
}

/* 메뉴 라벨 정본 — 기능명 폴백/다국어 별칭에 쓰므로 추출부보다 먼저 정의(TDZ 방지).
 *   ① sidebarManifest.js: 경로 → labelKey(gNav.*)   ② 로케일: labelKey → 15개국 메뉴명
 *   CommandPalette 는 영문 소수만 담고 있어 보조로만 쓴다. */
const manifest = read(p('frontend/src/layout/sidebarManifest.js'));
const labelKeyOfPath = {};
for (const m of manifest.matchAll(/to:\s*["']([^"']+)["'][^}]*?labelKey:\s*["']([^"']+)["']/g)) labelKeyOfPath[m[1]] = m[2];

const cp = read(p('frontend/src/components/CommandPalette.jsx'));
const cpLabel = {};
for (const m of cp.matchAll(/label:\s*'([^']+)'\s*,\s*path:\s*'([^']+)'/g)) cpLabel[m[2]] = m[1].replace(/^[^\p{L}\p{N}]+/u, '').trim();

/* 사이드바 메뉴명 15개국 정본. labelKey 는 "gNav.webPopupLabel" 형태지만 실제 사전은 접두 없는
 * leaf("webPopupLabel")로 키가 잡혀 있다(Sidebar.jsx:406 navT 가 이 사전을 본다). ko.js 의 gNav.* 가 아니다. */
const navDict = (await import(url.pathToFileURL(p('frontend/src/layout/sidebarI18n.js')).href)).default || {};

/** 경로 → 15개국 메뉴명 목록(존재하는 것만). */
const menuNamesOfPath = (pa) => {
  const key = labelKeyOfPath[pa];
  const leaf = key ? key.split('.').pop() : '';
  const out = [];
  if (leaf) for (const l of LANGS) { const v = navDict[l]?.[leaf]; if (typeof v === 'string' && v.trim()) out.push(v.trim()); }
  if (cpLabel[pa]) out.push(cpLabel[pa]);
  return [...new Set(out)];
};

/* ══════════════════════════ 2. 소스 스캔 ══════════════════════════ */
const walk = (dir, acc = []) => {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, acc);
    else if (/\.jsx?$/.test(e.name)) acc.push(fp);
  }
  return acc;
};
const srcFiles = [...walk(p('frontend/src/pages')), ...walk(p('frontend/src/components'))];

// 각 파일이 import 하는 로컬 컴포넌트 basename
const importsOf = {};
for (const f of srcFiles) {
  const txt = read(f);
  const set = new Set();
  for (const m of txt.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+['"][^'"]*\/([A-Za-z0-9_]+)(?:\.jsx?)?['"]/g)) set.add(m[2]);
  importsOf[path.basename(f, path.extname(f))] = set;
}

/** 컴포넌트 basename 이 도달 가능한 라우트들(자기 자신 또는 자신을 import 하는 페이지). */
const routesForBasename = (base) => {
  if (routeOfBasename[base]) return [routeOfBasename[base]];
  const out = new Set();
  for (const [importer, deps] of Object.entries(importsOf)) {
    if (deps.has(base) && routeOfBasename[importer]) out.add(routeOfBasename[importer]);
  }
  return [...out];
};

/* ══════════════════════════ 3. 네임스페이스 → 기능 추출 ══════════════════════════ */
// t('a.b.c', '한글폴백') / t("a.b.c") 모두 포착. 인라인 폴백은 ko.js 부재 시 대체값.
const T_CALL = /\bt\(\s*['"]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)['"]\s*(?:,\s*['"]([^'"]*)['"])?/g;

const nsData = {};   // ns → { keys: Map(leaf→ko), files:Set }
for (const f of srcFiles) {
  const base = path.basename(f, path.extname(f));
  const txt = read(f);
  for (const m of txt.matchAll(T_CALL)) {
    const full = m[1], inline = m[2];
    const seg = full.split('.');
    const ns = seg.length >= 3 ? `${seg[0]}.${seg[1]}` : seg[0];
    const leaf = seg.slice(ns.split('.').length).join('.');
    if (!leaf) continue;
    const ko = dig(locales.ko, full);
    const val = (typeof ko === 'string' && ko) ? ko : (inline || '');
    if (!val) continue;
    (nsData[ns] ||= { keys: new Map(), files: new Set() });
    nsData[ns].keys.set(leaf, val);
    nsData[ns].files.add(base);
  }
}

/* 분류 규칙 — 저장소 명명 규칙 실측 근거(Btn 193 · Label 283 · Hint 100 · f<대문자> 107).
 * ★값(한글)에 동사가 들어있다고 '행동'으로 보면 안 된다: "복사됨"(토스트)·"등록된 브리지가 없습니다."(빈 상태)가
 *   버튼으로 오분류된다. 분류는 **키 이름**만 근거로 한다(값은 라벨 텍스트로만 사용). */
const classify = (leaf) => {
  if (/^(title|pageTitle)$/.test(leaf)) return 'title';
  if (/^(subtitle|desc|description)$/.test(leaf)) return 'subtitle';
  if (/(Empty|Emptied)$/.test(leaf) || /^(empty)$/.test(leaf)) return 'state';
  if (/(Confirm)$/.test(leaf)) return 'confirm';
  if (/(Hint|Note|Intro|Desc|Guide)$/.test(leaf)) return 'note';
  if (/^(err|error)/i.test(leaf) || /(Fail|Invalid)$/.test(leaf)) return 'error';
  if (/^(stat|status)/i.test(leaf) || /^(online|offline|active|inactive|unpaired|connecting|testing|verified|copied)$/.test(leaf)) return 'state';
  if (/(Btn|Add|Save|Delete|Remove|Edit|Copy|Reissue|Close|Cancel|Submit|Send|Apply|Run|Create|Test|Upload|Download|Export|Import|Refresh|Sync)$/i.test(leaf)) return 'action';
  if (/^(save|cancel|close|add|edit|delete|test|reissue|confirm)$/i.test(leaf)) return 'action';
  if (/^f[A-Z]/.test(leaf) || /Label$/.test(leaf)) return 'field';
  if (/^ph[A-Z]/.test(leaf) || /Ph$/.test(leaf) || /Placeholder$/i.test(leaf)) return 'placeholder';
  return 'other';
};

const humanize = s => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ').trim();
const MIN_KEYS = 4;   // 잡음 제거: 키 4개 미만 네임스페이스는 '기능'으로 보지 않음

/* ★`{ns}.title` 이 기능명이 아니라 **입력 필드 라벨**인 경우가 많다(예: webPopup.title = "제목" = 팝업 제목 필드).
 *   이걸 기능명/별칭으로 쓰면 "제목"이 든 모든 질문에 오매칭된다. 일반 명사는 기능명 후보에서 배제하고
 *   CommandPalette 의 사람이 붙인 메뉴 라벨로 폴백한다. */
const GENERIC_TITLE = new Set([
  '제목', '이름', '설명', '상태', '유형', '종류', '내용', '값', '메모', '비고',
  'Title', 'Name', 'Description', 'Status', 'Type', 'Content', 'Value',
]);
const isGeneric = s => !s || GENERIC_TITLE.has(String(s).trim());

const raw = {};   // 1차 추출(문서빈도 계산 후 매칭 어휘 확정)
for (const [ns, d] of Object.entries(nsData)) {
  if (d.keys.size < MIN_KEYS) continue;
  const buckets = { title: [], subtitle: [], action: [], field: [], placeholder: [], note: [], confirm: [], error: [], state: [], other: [] };
  for (const [leaf, val] of d.keys) buckets[classify(leaf)].push(val);

  // 진입 경로: 이 네임스페이스를 쓰는 파일들이 도달 가능한 라우트
  const paths = [...new Set([...d.files].flatMap(routesForBasename))];
  if (!paths.length) continue;   // 라우트에 도달 불가 = 화면에 없음

  const nsTitle = buckets.title[0];
  const pageNames = paths.flatMap(menuNamesOfPath);          // 이 화면의 15개국 메뉴명
  const isPageLevel = isGeneric(nsTitle);                    // ns.title 이 필드 라벨 → 이 ns 는 페이지 본체
  const title = !isPageLevel ? nsTitle : (pageNames[0] || humanize(ns));

  // 다국어 기능명.
  //   · 서브기능(CCTV 등)  → 자기 ns.title 의 15개국 값
  //   · 페이지 본체        → 그 화면의 15개국 메뉴명(웹 팝업/Web Popup/ウェブポップアップ…)
  const titles = [];
  if (!isPageLevel) {
    for (const l of LANGS) { const v = dig(locales[l], `${ns}.title`); if (typeof v === 'string' && !isGeneric(v)) titles.push(v); }
  } else {
    titles.push(...pageNames);
  }

  // 라틴 대문자 토큰(CCTV·RTSP·HLS·DVR…) — 어떤 언어로 물어도 매칭되는 강한 단서
  const latin = new Set();
  for (const v of d.keys.values()) for (const m of String(v).matchAll(/\b([A-Z][A-Z0-9]{2,})\b/g)) latin.add(m[1]);

  raw[ns] = {
    ns, title, titles: [...new Set(titles)], latin: [...latin], paths,
    subtitle: buckets.subtitle[0] || '',
    actions: [...new Set(buckets.action)].slice(0, 18),
    fields: [...new Set(buckets.field)].slice(0, 24),
    notes: [...new Set([...buckets.note, ...buckets.confirm])].slice(0, 8),
    states: [...new Set(buckets.state)].slice(0, 10),
  };
}

/* ── 문서빈도(df)로 '흔한 어휘' 배제 ──
 *   "저장"(11개 기능)·"취소"(13)·"테스트"·"API" 처럼 여러 화면에 공통으로 나오는 라벨은 변별력이 0이라
 *   매칭 근거에서 뺀다. 안 그러면 "웹 팝업 A/B 테스트" 질문이 '테스트' 버튼을 가진 아무 기능에나 걸린다.
 *   (표시용 목록에는 그대로 남긴다 — 절차 안내에는 필요하다.) */
const DF_MAX = 3;
const df = {};
const bump = s => { s = String(s).trim(); if (s) df[s] = (df[s] || 0) + 1; };
for (const ft of Object.values(raw)) {
  for (const s of new Set([...ft.actions, ...ft.fields, ...ft.latin])) bump(s);
}

const features = {};
for (const [ns, ft] of Object.entries(raw)) {
  const distinctive = [
    ...ft.titles,
    ...ft.latin.filter(s => (df[s] || 0) <= DF_MAX && s.length >= 3),
    ...[...ft.actions, ...ft.fields].filter(s => (df[s] || 0) <= DF_MAX && s.length >= 4),
    ns.split('.').pop(),
  ];
  features[ns] = {
    ns,
    title: ft.title,
    subtitle: ft.subtitle,
    paths: ft.paths,
    actions: ft.actions,
    fields: ft.fields,
    notes: ft.notes,
    states: ft.states,
    // 기능명(강한 단서) / 변별력 있는 어휘(약한 단서) 분리 → PHP 가 가중치를 달리 준다.
    names: [...new Set([ft.title, ...ft.titles])].filter(s => !isGeneric(s)),
    match: [...new Set(distinctive)].filter(Boolean).slice(0, 40),
  };
}

/* ══ [289차 후속 / MEA 055] 커버리지 보강 — 메뉴 라벨만으로 최소 진입점 생성 ══
 * 이 생성기는 **로케일 네임스페이스**를 기준으로 기능을 추출한다. 그래서 화면이 실제로
 * 존재해도 **페이지 로컬 i18n 사전**(pages/*I18n.js)만 쓰고 로케일 ns 가 없는 페이지는
 * 코퍼스에서 통째로 빠졌다.
 *   ★실측 원인: 186차 dead/shadow ns purge 때 `returnsPortal` 등이 "로컬 사전 사용"을 이유로
 *     삭제됐고, 그 순간부터 챗봇이 그 화면을 **알 수 없게** 됐다(라우트 121개 중 42개 미커버).
 *   ★증상: "반품 포털 사용법"을 물으면 근거 0 → 약한 매칭으로 **엉뚱한 근거**가 딸려온다.
 *
 * 보강 원칙(과대 생성 금지):
 *   · 이미 ns 로 커버된 경로는 **건드리지 않는다**(기존 산출 무변경 = 무회귀)
 *   · 메뉴 라벨(15개국)이 있는 경로만 — 라벨조차 없으면 사용자가 부를 이름이 없으므로 생략
 *   · actions/fields/notes 는 **비운다**(없는 것을 지어내지 않는다). 이름·경로만 제공해
 *     "그 화면이 존재하고 어디로 가면 되는지"까지만 답하게 한다(정직 표기).
 */
{
  const coveredPaths = new Set(Object.values(features).flatMap(f => f.paths || []));
  let added = 0;
  for (const r of routes) {
    if (r.path.includes(':') || r.path === '*' || !r.path.startsWith('/')) continue;
    if (coveredPaths.has(r.path)) continue;
    const names = [...new Set(menuNamesOfPath(r.path))].filter(s => s && !isGeneric(s));
    const label = names[0] || cpLabel[r.path];
    if (!label) continue;                       // 부를 이름이 없으면 색인 대상 아님
    const key = `route${r.path.replace(/\//g, '.')}`;
    features[key] = {
      ns: key,
      title: label,
      subtitle: '',
      paths: [r.path],
      actions: [], fields: [], notes: [], states: [],
      names: [...new Set([label, ...names])],
      match: [],                                 // 어휘 없음 — 이름/경로로만 매칭
    };
    added++;
  }
  console.log(`[gen_chatbot_knowledge] coverage_fallback=${added} (메뉴 라벨 기반 최소 진입점)`);
}

/* ══════════════════════════ 4. 컴팩트 인덱스(md) ══════════════════════════ */
const curated = read(p('tools/chatbot_feature_curated.md')).trim();

const mentioned = new Set();
for (const m of curated.matchAll(/\(?(\/[a-z][a-z0-9/_:-]*)/g)) mentioned.add(m[1]);

const SKIP_COMP = new Set(['Navigate']);
const SKIP_PATH = new Set(['/', '/register', '/login', '*']);
const missing = [];
const seen = new Set();
for (const r of routes) {
  if (SKIP_COMP.has(r.comp) || SKIP_PATH.has(r.path)) continue;
  if (r.path.includes(':')) continue;
  if (seen.has(r.path)) continue; seen.add(r.path);
  if (mentioned.has(r.path)) continue;
  missing.push(`- ${cpLabel[r.path] || humanize(lazyMap[r.comp] || r.comp)}(${r.path})`);
}

// 페이지 내부 기능 목록 — 라우트로는 안 보이지만 실제 존재하는 기능(v2 핵심)
const byPath = {};
for (const f of Object.values(features)) for (const pa of f.paths) (byPath[pa] ||= []).push(f.title);
const inPageLines = Object.entries(byPath)
  .map(([pa, titles]) => `- ${pa} → ${[...new Set(titles)].slice(0, 12).join(' · ')}`)
  .sort();

let out = curated + '\n';
if (missing.length) {
  out += '\n**★ 자동 감지된 메뉴 (라우트에서 발견·큐레이션 상세 대기 — 실제로 존재하는 기능이니 경로로 안내하라)**\n';
  out += missing.join('\n') + '\n';
}
out += '\n**★ 페이지 내부 기능 인덱스 (i18n 정본에서 자동 추출 — 라우트에 없지만 화면 안에 실제로 존재한다. '
     + '사용자가 아래 기능을 물으면 "없다"고 하지 말고, 해당 경로로 들어가서 쓰는 기능이라고 안내하라. '
     + '절차를 물으면 시스템이 별도로 주입하는 RELEVANT FEATURE DETAILS 블록을 근거로 단계별로 설명하라.)**\n';
out += inPageLines.join('\n') + '\n';

const outMd = p('backend/data/chatbot_feature_map.md');
fs.mkdirSync(path.dirname(outMd), { recursive: true });
fs.writeFileSync(outMd, out, 'utf8');

/* ══════════════════════════ 5. 상세 인벤토리(json) ══════════════════════════ */
const outJson = p('backend/data/chatbot_feature_details.json');
fs.writeFileSync(outJson, JSON.stringify({ generated_from: 'i18n namespaces + App.jsx routes', features }, null, 1), 'utf8');

const cctv = features['wms.cctv'];
console.error(`[gen_chatbot_knowledge] routes=${routes.length} auto_appended=${missing.length} in_page_features=${Object.keys(features).length}`);
console.error(`[gen_chatbot_knowledge] wrote ${outMd} (${out.length} bytes)`);
console.error(`[gen_chatbot_knowledge] wrote ${outJson} (${fs.statSync(outJson).size} bytes)`);
if (cctv) console.error(`[gen_chatbot_knowledge] sanity wms.cctv: title="${cctv.title}" paths=${cctv.paths} actions=${cctv.actions.length} fields=${cctv.fields.length}`);
else console.error('[gen_chatbot_knowledge] WARN: wms.cctv 미추출 — 추출 규칙 점검 필요');
