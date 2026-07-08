// [271차] 실시간 언어전환 레지스트리 — 새로고침 없이 module-level 현지화 데이터를 즉시 재치환.
//   t() 콘텐츠는 I18nProvider 재렌더로 반응형이지만, 컴포넌트 밖 module-level 상수(메뉴 라벨/서브탭·
//   연동허브 채널명·데모 템플릿 등)는 반응형이 아니다. 여기 등록하면 'genie-lang-change' 수신 시
//   ‘한글 원본 스냅샷 → 새 언어’ 로 in-place 재치환되고, useI18n 소비자의 재렌더 때 새 언어로 표시된다.
//
// [272차 P1 수정] 메모리 누수 근절:
//   기존 registerRelocalize 는 push 전용(해제 없음)이라, localizeDeep 을 런타임 API 응답(PlanPricing
//   plans/menus 등, fetch·재진입마다 신규 객체)에 걸면 애플라이어가 무한 누적되고 각자 딥 스냅샷(orig)으로
//   이미 언마운트된 객체까지 retain → 힙 단조증가 + 언어변경 O(누적) 폭증.
//   해결: 런타임 객체는 WeakRef 로 등록(registerWeak) → 대상이 GC 되면 다음 스윕에서 자동 제거.
//     · 모듈 상수(사이드바/채널/데모 상수)는 모듈이 영구 보유 → deref 항상 유효 → 계속 실시간 반영(의도대로).
//     · 런타임 객체는 React state 교체 시 자연 GC → 자동 프루닝(누수 0).
//   애플라이어 클로저가 대상(target)을 strong 캡처하지 않도록 deref 로만 접근한다(핵심).
import { detectLangSync } from './langSync.js';

let _lang = detectLangSync();
const _appliers = [];                 // 모듈 상수용(영구·소수) — 기존 호출부 호환
const _weakAppliers = [];             // { ref: WeakRef<obj>, orig, resolverFor(lang)->(ko)->str|null }
const _HAS_WEAKREF = typeof WeakRef !== 'undefined';

/** 재치환 함수 등록 — 등록 즉시 현재 언어로 1회 실행, 이후 언어변경마다 실행. (모듈 상수 전용) */
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

/** 죽은 WeakRef 엔트리 제거(대상이 GC됨). */
function _pruneWeak() {
  for (let i = _weakAppliers.length - 1; i >= 0; i--) {
    if (!_weakAppliers[i].ref.deref()) _weakAppliers.splice(i, 1);
  }
}

/**
 * 런타임 객체(신규 생성·교체 가능)를 언어변경에 반응하도록 등록.
 *  - target: in-place 로 재치환할 라이브 객체(React state 등). WeakRef 로만 보유(누수 방지).
 *  - orig  : 한글 원본 스냅샷(번역 소스).
 *  - resolverFor(lang) : 해당 언어의 (ko)->번역문자열|null 리졸버를 반환.
 * WeakRef 미지원(구형) 환경은 1회성 현지화만(실시간 미반영) — 누수 없이 안전 폴백.
 */
export function registerWeak(target, orig, resolverFor) {
  try { applyDeep(target, orig, resolverFor(_lang)); } catch (_) { /* noop */ } // 초기 1회
  if (!_HAS_WEAKREF || !target || typeof target !== 'object') return;
  // 누적 상한 스윕(언어 미변경 세션에서도 죽은 대상 방치 방지).
  if (_weakAppliers.length > 64) _pruneWeak();
  _weakAppliers.push({ ref: new WeakRef(target), orig, resolverFor });
}

if (typeof window !== 'undefined') {
  window.addEventListener('genie-lang-change', (e) => {
    const l = (e && e.detail && e.detail.lang) || detectLangSync();
    if (l === _lang) return;
    _lang = l;
    for (const fn of _appliers) { try { fn(_lang); } catch (_) { /* noop */ } }
    // 런타임 객체: 살아있는 것만 재치환하고 죽은 것은 제거.
    for (let i = _weakAppliers.length - 1; i >= 0; i--) {
      const w = _weakAppliers[i];
      const t = w.ref.deref();
      if (!t) { _weakAppliers.splice(i, 1); continue; }
      try { applyDeep(t, w.orig, w.resolverFor(_lang)); } catch (_) { /* noop */ }
    }
  });
}
