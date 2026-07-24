#!/usr/bin/env node
/**
 * 즐겨찾기 회귀 셀프테스트 — [현 차수 신설]
 *
 * ★왜 만들었나: CWIS Part004-04 Task001 분석에서 **즐겨찾기가 도달 불가능한 기능**이었음이 드러났다.
 *   초기 커밋 이래 `toggleFav` 는 QuickAccessPanel 의 ✕(해제) 버튼에서만 호출됐다.
 *   추가할 방법이 없으니 `favs` 는 영원히 비었고, `hasFavs === false` 라 즐겨찾기 탭 자체가
 *   렌더되지 않았다 — 즉 해제 버튼조차 도달 불가. i18n `sidebar.addFav` 는 15개국 전부에
 *   준비돼 있었는데 **버튼만 없었다**.
 *
 *   컴포넌트가 "존재한다"는 사실만으로는 기능이 동작한다는 증거가 되지 못한다.
 *   이 테스트는 그 간극(fake-looks-real)을 구조적으로 막는다.
 *
 * 검사 항목:
 *   1. 즐겨찾기 **추가** 진입점 존재(해제 전용 회귀 차단) — 최우선 가드
 *   2. 토글 버튼의 aria-pressed(접근성 — ST03 실측 0건이었음)
 *   3. i18n 키 sidebar.addFav / sidebar.removeFav 가 15개국 전부에 존재
 *   4. 즐겨찾기 목록이 최신순 — slice(0,5) 로 잘리므로 삽입순이면 새로 추가한 항목이 안 보인다
 *   5. 저장 키 g_sidebar_favs 불변(기존 사용자 데이터 승계)
 *   6. NavLink 안에 button 을 중첩하지 않음(무효 HTML)
 *
 * 사용: node tools/favorites_selftest.mjs   (또는 npm run fav:test)
 * 종료코드: 0=통과, 1=실패. 운영 코드·DB·네트워크 접근 없음(정적 검사만).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = { red: '\x1b[31m', grn: '\x1b[32m', dim: '\x1b[2m', rst: '\x1b[0m' };
let FAIL = 0;
const ok = (m) => console.log(`${C.grn}✓${C.rst} ${m}`);
const bad = (m) => { FAIL++; console.log(`${C.red}✗ ${m}${C.rst}`); };
const check = (cond, msg, detail = '') => cond ? ok(msg) : bad(`${msg}${detail ? ` — ${detail}` : ''}`);

const SIDEBAR = path.join(ROOT, 'frontend/src/layout/Sidebar.jsx');
if (!fs.existsSync(SIDEBAR)) { bad(`Sidebar.jsx 없음: ${SIDEBAR}`); process.exit(1); }
const src = fs.readFileSync(SIDEBAR, 'utf8');

/* ── 1. 추가 진입점 (최우선 회귀 가드) ─────────────────────────────────── */
const toggleCalls = [...src.matchAll(/onToggle\(path\)|toggleFav\(([^)]*)\)/g)];
check(toggleCalls.length >= 2, '즐겨찾기 토글 호출부가 2곳 이상(추가+해제)',
  `현재 ${toggleCalls.length}곳 — 1곳이면 해제 전용이라 기능 도달 불가`);

const hasStarComponent = /function\s+FavStar\s*\(/.test(src);
check(hasStarComponent, '즐겨찾기 추가 버튼 컴포넌트(FavStar) 존재');

// FavStar 가 실제로 메뉴 항목 렌더에 배선됐는지 — 정의만 하고 안 쓰면 예전과 같은 상태다
const starUsages = (src.match(/<FavStar\b/g) || []).length;
check(starUsages >= 2, 'FavStar 가 메뉴 렌더에 실제 배선됨(단일항목+다항목 분기)',
  `사용처 ${starUsages}곳 — 정의만 하고 배선하지 않으면 버튼이 화면에 없다`);

check(/favs=\{favs\}/.test(src) && /toggleFav=\{toggleFav\}/.test(src),
  'NavSection 에 favs·toggleFav 가 전달됨');

/* ── 2. 접근성 ─────────────────────────────────────────────────────────── */
check(/aria-pressed=\{isFav\}/.test(src), '토글 버튼에 aria-pressed 상태 노출(스크린리더)');
check(/aria-label=\{label\}/.test(src), '토글 버튼에 aria-label 존재');
check(/aria-label=\{`\$\{t\('sidebar\.removeFav'/.test(src),
  '해제(✕) 버튼에 대상 이름을 포함한 aria-label 존재');

/* ── 3. i18n 15개국 ────────────────────────────────────────────────────── */
const LOCALES = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'hi', 'pt', 'ru'];
const missing = [];
for (const l of LOCALES) {
  const p = path.join(ROOT, 'frontend/src/i18n/locales', `${l}.js`);
  if (!fs.existsSync(p)) { missing.push(`${l}(파일없음)`); continue; }
  // ★로케일 파일은 ko.js 가 약 1MB 라 전체 파싱하지 않고 키 존재만 확인한다.
  const t = fs.readFileSync(p, 'utf8');
  // ★키 표기가 파일마다 다르다 — ko.js 는 "addFav": , en.js 는 addFav: (따옴표 없음).
  //   한쪽만 허용하면 12개국이 통째로 오탐으로 잡힌다. 단어경계로 addFavorite 와도 구분한다.
  const hasKey = (k) => new RegExp(`(?:["']${k}["']|\\b${k})\\s*:`).test(t);
  if (!hasKey('addFav')) missing.push(`${l}.addFav`);
  if (!hasKey('removeFav')) missing.push(`${l}.removeFav`);
}
check(missing.length === 0, `i18n sidebar.addFav/removeFav 15개국 전부 존재`, missing.join(', '));

/* ── 4. 전체 열람 가능성 (BACKLOG-1 해소 이후) ────────────────────────── */
// ★[ST07-06] reverse() 제거 — 사용자 지정 순서(reorder)와 짝. 대신 "추가는 맨 앞 prepend"로
//   최신 상단을 유지한다. reverse 부활 시 재정렬 결과가 뒤집혀 보이므로 회귀로 잡는다.
check(!/\[\.\.\.favs\]\.reverse\(\)/.test(src),
  '표시부에 .reverse() 없음 — 사용자 지정 순서를 그대로 표시(reorder와 정합)');
check(/\[path,\s*\.\.\.arr\]/.test(src),
  '즐겨찾기 추가는 맨 앞 prepend — 최신 항목이 상단에 보인다(무후퇴)');

// ★[현 차수] 판정 기준 반전 — 기존엔 `items.slice(0,5)` 존재를 요구했으나, 그 제한이 곧
//   BACKLOG-1(6개 이상 열람 경로 부재) 의 원인이었다. 이제는 **잘라내지 않는 것**이 정답이다.
//   자르기가 부활하면 6번째부터 다시 도달 불가가 되므로 그것을 회귀로 잡는다.
check(!/items\.slice\(0,\s*\d+\)/.test(src),
  '즐겨찾기 목록을 잘라내지 않는다(6개 이상도 열람 가능 — BACKLOG-1 회귀 차단)');
// 잘라내지 않는 대신 스크롤로 접근하므로, 스크롤 컨테이너가 실제로 존재해야 한다.
check(/overflowY:\s*'auto'/.test(src) && /maxHeight:\s*240/.test(src),
  '목록이 스크롤 컨테이너(maxHeight+overflowY:auto)로 감싸져 있다');

/* ── 5. 저장 키 불변 (기존 사용자 데이터 승계) ───────────────────────── */
check((src.match(/g_sidebar_favs/g) || []).length >= 2,
  '저장 키 g_sidebar_favs 유지(기존 사용자 즐겨찾기 승계 — 변경 시 전원 초기화)');
check(!/tSetJSON\(\s*['"]g_sidebar_favs/.test(src),
  'UI 프리퍼런스는 테넌트 스코프를 쓰지 않는다(tenantStorage.js:14 규정 준수)');

/* ── 6. 무효 HTML 방지 ─────────────────────────────────────────────────── */
// <NavLink ...> ... <button ... </NavLink> 형태(앵커 안 버튼)는 무효 HTML이며 클릭이 앵커에 먹힌다
const navlinkBlocks = [...src.matchAll(/<NavLink[\s\S]*?<\/NavLink>/g)].map(m => m[0]);
const nested = navlinkBlocks.filter(b => /<button/.test(b));
check(nested.length === 0, 'NavLink 내부에 button 중첩 없음(무효 HTML·클릭 가로채기 방지)',
  `${nested.length}건`);

// 별표 클릭이 링크 이동을 유발하지 않도록 preventDefault 존재
check(/e\.preventDefault\(\);\s*e\.stopPropagation\(\)/.test(src),
  '별표 클릭 시 preventDefault+stopPropagation(페이지 이동 방지)');

/* ── 7. 모바일 터치 타깃 (BACKLOG-2 해소) ─────────────────────────────── */
// WCAG 2.5.5 권장 44px. 이전 실측 약 23x17px.
check(/touch\s*=\s*false/.test(src) && /touch=\{isMobile\}/.test(src),
  'FavStar 가 모바일에서 touch 모드로 배선됨');
check((src.match(/minWidth:\s*44,\s*minHeight:\s*44/g) || []).length >= 2,
  '별표·해제 버튼 모바일 히트영역 44x44 (WCAG 2.5.5)');

/* ── 8. 패널 찌그러짐 방지 ────────────────────────────────────────────── */
// .sidebar 는 flex column 이고 패널은 overflow:hidden 이라 automatic minimum size 가 0 이 된다.
// flexShrink:0 이 없으면 사이드바 내용이 넘칠 때 패널이 테두리(2px)만 남고 사라진다(실측).
check(/flexShrink:\s*0,\s*margin:\s*'4px 8px 0'/.test(src),
  '즐겨찾기 패널에 flexShrink:0 (사이드바 넘침 시 패널 소멸 차단)');

/* ── 9. 순서 변경 device-local Reorder (ST07-06) ──────────────────────── */
// DnD 라이브러리 부재 → 키보드 접근 가능한 ▲▼ 버튼(§13·§14 대체 방식).
check(/const move = useCallback\(\(path, dir\)/.test(src),
  'useFavorites 가 move(path, dir) 재정렬 API 를 제공');
check(/\[arr\[i\],\s*arr\[j\]\]\s*=\s*\[arr\[j\],\s*arr\[i\]\]/.test(src),
  'move 는 인접 항목 위치 교환(스왑)으로 순서 변경');
check(/if \(j < 0 \|\| j >= arr\.length\) return prev/.test(src),
  'move 는 경계(첫/끝)에서 no-op — 배열 범위 이탈 방지');
check(/moveFav\s*&&\s*itemCount > 1/.test(src),
  '재정렬 버튼은 항목 2개 이상일 때만 노출');
check(/disabled=\{b\.dis\}/.test(src),
  '경계 항목의 ▲ 또는 ▼ 버튼은 disabled(첫 항목 위로·끝 항목 아래로 차단)');
// i18n — 15개국 moveFavUp/moveFavDown 존재(fallback 아닌 실 키)
{
  const mf = LOCALES.filter(l => {
    const p = path.join(ROOT, 'frontend/src/i18n/locales', `${l}.js`);
    const s = fs.readFileSync(p, 'utf8');
    return /["']?moveFavUp["']?\s*:/.test(s) && /["']?moveFavDown["']?\s*:/.test(s);
  });
  check(mf.length === LOCALES.length,
    'i18n sidebar.moveFavUp/moveFavDown 15개국 전부 존재',
    `${mf.length}/${LOCALES.length}`);
}

console.log(FAIL === 0
  ? `\n${C.grn}[favorites-selftest] 전 항목 통과${C.rst}`
  : `\n${C.red}[favorites-selftest] ${FAIL}건 실패${C.rst}`);
process.exit(FAIL === 0 ? 0 : 1);
