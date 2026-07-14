/* [현 차수] 미저장 입력 보호 — "작성 중이던 자료가 자동 새로고침으로 사라지는" 문제의 단일 차단막.
 *
 * 배경(실제 사고): 앱에는 사용자가 요청하지 않은 자동 reload 경로가 다수 있었다.
 *   ① 배포감지 자동 새로고침(App.jsx VersionUpdateBanner) — 새 번들 감지 후 6초 뒤 무조건 reload,
 *      라우트 전환 시에는 가드조차 없이 즉시 reload.
 *   ② stale 청크 복구(main.jsx) / ErrorBoundary(App.jsx) — 런타임 에러에도 reload.
 * 이 경로들이 상품등록처럼 긴 폼을 채우는 중에 터지면 입력값이 통째로 소실됐다.
 *
 * 원칙: 앱이 스스로 일으키는 새로고침은 "미저장 변경이 없을 때"만 허용한다.
 *   미저장 변경이 있으면 reload 하지 않고 배너로 알린 뒤, 적용 시점을 사용자가 고른다.
 *   자동 reload 자체를 없애도 기능 후퇴가 없도록, 감지·안내는 그대로 유지한다.
 */

const dirtyKeys = new Set();
const listeners = new Set();

function notify() {
  listeners.forEach(fn => { try { fn(dirtyKeys.size > 0); } catch (e) { /* 리스너 오류가 가드를 죽이지 않게 */ } });
}

/** 편집 중(미저장) 상태 등록. key 는 폼 단위 식별자(예: 'priceopt:product-form'). */
export function markDirty(key) {
  if (!key || dirtyKeys.has(key)) return;
  dirtyKeys.add(key);
  notify();
}

/** 저장 완료·초기화 시 해제. */
export function clearDirty(key) {
  if (!key || !dirtyKeys.has(key)) return;
  dirtyKeys.delete(key);
  notify();
}

/** 앱 전체에 미저장 변경이 하나라도 있는가. */
export function isDirty() {
  return dirtyKeys.size > 0;
}

/** 디버깅/배너 문구용 — 현재 미저장 폼 목록. */
export function dirtyList() {
  return Array.from(dirtyKeys);
}

export function onDirtyChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 앱이 스스로 일으키는 모든 자동 새로고침의 단일 관문.
 * 미저장 변경이 있으면 새로고침하지 않고 false 를 돌려준다(호출측은 배너/안내로 대체).
 * 사용자가 직접 누른 "지금 적용" 같은 명시 액션은 forceReload() 를 쓴다.
 */
export function safeReload(reason) {
  if (dirtyKeys.size > 0) {
    console.warn('[unsavedGuard] 미저장 입력이 있어 자동 새로고침을 보류했습니다 —', reason, Array.from(dirtyKeys));
    return false;
  }
  try { window.location.reload(); } catch (e) { window.location.href = window.location.pathname; }
  return true;
}

/** 사용자가 명시적으로 새로고침을 선택한 경로(버튼 클릭 등). 미저장 상태를 해제하고 즉시 reload. */
export function forceReload() {
  dirtyKeys.clear();
  notify();
  try { window.location.reload(); } catch (e) { window.location.href = window.location.pathname; }
}

/**
 * [현 차수] 앱이 의도적으로 일으키는 이탈(자동 로그아웃·OAuth 이동·환경 전환·요금제 이동 등)에서 호출.
 * beforeunload 경고를 1회 통과시키고 dirty 를 해제해, 정상 흐름에 네이티브 확인창이 뜨지 않게 한다.
 * (미저장 경고는 "사용자가 모르게 잃는 것"을 막으려는 것이지, 사용자가 택한 이동을 막으려는 게 아니다.)
 */
export function allowNavigation() {
  dirtyKeys.clear();
  notify();
}

/* 탭 닫기·주소 이동 등 브라우저 레벨 이탈에도 확인 프롬프트를 띄운다(표준 동작).
 * 단 allowNavigation() 으로 명시 허용된 앱 내부 이탈은 제외. */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (dirtyKeys.size === 0) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
}
