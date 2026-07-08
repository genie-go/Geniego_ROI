// [271차] 실시간 언어전환 레지스트리 — 새로고침 없이 module-level 현지화 데이터를 즉시 재치환.
//   t() 콘텐츠는 I18nProvider 재렌더로 반응형이지만, 컴포넌트 밖 module-level 상수(메뉴 라벨/서브탭·
//   연동허브 채널명·데모 템플릿 등)는 반응형이 아니다. 여기 등록하면 'genie-lang-change' 수신 시
//   ‘한글 원본 스냅샷 → 새 언어’ 로 in-place 재치환되고, useI18n 소비자의 재렌더 때 새 언어로 표시된다.
import { detectLangSync } from './langSync.js';

let _lang = detectLangSync();
const _appliers = [];

/** 재치환 함수 등록 — 등록 즉시 현재 언어로 1회 실행, 이후 언어변경마다 실행. */
export function registerRelocalize(fn) {
  _appliers.push(fn);
  try { fn(_lang); } catch (_) { /* noop */ }
}

export function currentLang() { return _lang; }

/** 얕/깊은 순수 데이터 스냅샷(한글 원본 보존용). */
export function snapshot(obj) {
  try { return JSON.parse(JSON.stringify(obj)); } catch (_) { return obj; }
}

/** orig(한글 스냅샷)을 순회하며 번역문자열을 live 에 기록. resolve(ko)->번역(없으면 falsy→한글 유지). */
export function applyDeep(live, orig, resolve) {
  if (Array.isArray(orig)) { for (let i = 0; i < orig.length; i++) live[i] = applyDeep(live[i], orig[i], resolve); return live; }
  if (orig && typeof orig === 'object') { for (const k in orig) live[k] = applyDeep(live[k], orig[k], resolve); return live; }
  if (typeof orig === 'string') { const t = resolve(orig); return (t && typeof t === 'string') ? t : orig; }
  return orig;
}

if (typeof window !== 'undefined') {
  window.addEventListener('genie-lang-change', (e) => {
    const l = (e && e.detail && e.detail.lang) || detectLangSync();
    if (l === _lang) return;
    _lang = l;
    for (const fn of _appliers) { try { fn(_lang); } catch (_) { /* noop */ } }
  });
}
