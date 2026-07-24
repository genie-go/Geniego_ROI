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

/* ── 4. 최신순 정렬 (신규 추가 항목 가시성) ───────────────────────────── */
check(/\[\.\.\.favs\]\.reverse\(\)/.test(src),
  '즐겨찾기 목록이 최신순(reverse) — slice(0,5) 로 잘려도 방금 추가한 항목이 보인다');
const sliceMatch = src.match(/items\.slice\(0,\s*(\d+)\)/);
check(!!sliceMatch, '표시 개수 제한이 명시적', sliceMatch ? '' : 'slice 미발견');

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

console.log(FAIL === 0
  ? `\n${C.grn}[favorites-selftest] 전 항목 통과${C.rst}`
  : `\n${C.red}[favorites-selftest] ${FAIL}건 실패${C.rst}`);
process.exit(FAIL === 0 ? 0 : 1);
