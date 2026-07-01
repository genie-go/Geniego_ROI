/*
 * 회원세션(관리자 대행 열람) — 탭 단위 세션 격리 shim
 * ────────────────────────────────────────────────────────────
 * 관리자 페이지(/user-management)의 "회원세션" 버튼을 누르면, 새 창이
 *   /dashboard#imp=<token>|<userB64>|<tenant>
 * 형태의 해시로 열린다. 이 shim은 App 트리보다 먼저(main.jsx 최상단 import) 실행되어야 한다.
 *
 * 문제: 같은 origin의 localStorage 는 모든 탭이 공유하므로, 대행 세션 토큰을 그대로
 *       localStorage 에 쓰면 "관리자 본인 세션"을 덮어써 관리자가 로그아웃/회원으로 전환된다.
 * 해결: "대행 탭에서만" 인증/테넌트 관련 localStorage 키의 읽기·쓰기를 sessionStorage(탭 전용)로
 *       투명하게 우회한다. AuthContext·apiClient·40여 개 소비 파일이 모두 localStorage.getItem(...)
 *       을 쓰므로, window.localStorage 자체를 Proxy 로 감싸면 소비 코드 변경 0으로 격리가 완성된다.
 *
 * 관리자 본인 탭·일반 사용자 탭은 이 shim 이 비활성(no-op)이라 회귀 0.
 */
(function installImpersonationIsolation() {
  if (typeof window === 'undefined') return;

  var IS_DEMO = false;
  try { IS_DEMO = import.meta.env && import.meta.env.VITE_DEMO_MODE === 'true'; } catch (e) {}
  var PREFIX = IS_DEMO ? 'demo_genie_' : 'genie_';
  var IMP_ACTIVE = PREFIX + 'imp_active';

  // 1) 최초 부팅: URL 해시(#imp=...)로 전달된 대행 세션을 sessionStorage 에 주입.
  try {
    var hash = window.location.hash || '';
    var m = hash.match(/(?:^|[#&])imp=([^&]+)/);
    if (m) {
      try {
        var decoded = decodeURIComponent(m[1]);
        var parts = decoded.split('|');
        var tok = parts[0] || '';
        var userJson = '';
        if (parts[1]) {
          try { userJson = decodeURIComponent(escape(atob(parts[1]))); } catch (e) { userJson = ''; }
        }
        var tenant = parts[2] || '';
        if (tok) {
          sessionStorage.setItem(IMP_ACTIVE, '1');
          sessionStorage.setItem(PREFIX + 'token', tok);
          if (userJson) sessionStorage.setItem(PREFIX + 'user', userJson);
          if (tenant) sessionStorage.setItem('tenantId', tenant);
          sessionStorage.setItem(PREFIX + 'sess_active', '1'); // AuthContext 세션 복원 센티넬
        }
      } catch (e) {}
      // 주소창에서 토큰 해시 즉시 제거(노출/재부팅 방지)
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    }
  } catch (e) {}

  // 대행 탭이 아니면 아무 것도 하지 않는다.
  try { if (sessionStorage.getItem(IMP_ACTIVE) !== '1') return; } catch (e) { return; }

  // 2) 격리 대상 키 — 인증/세션/테넌트 관련만. 테마·i18n·기타 UI 설정은 공유 유지.
  var ISOLATED = {};
  [
    PREFIX + 'token', PREFIX + 'user', PREFIX + 'remember',
    PREFIX + 'sess_active', PREFIX + 'has_real_keys', PREFIX + 'auto_logout_min',
    'tenantId', 'accessToken', 'genie_auth_token', IMP_ACTIVE,
  ].forEach(function (k) { ISOLATED[k] = true; });

  var ls;
  try { ls = window.localStorage; } catch (e) { return; }

  function shimGet(k) { return ISOLATED[k] ? sessionStorage.getItem(k) : ls.getItem(k); }
  function shimSet(k, v) { return ISOLATED[k] ? sessionStorage.setItem(k, v) : ls.setItem(k, v); }
  function shimRemove(k) { return ISOLATED[k] ? sessionStorage.removeItem(k) : ls.removeItem(k); }

  // 우선책: window.localStorage 를 Proxy 로 교체(모든 소비 코드에 투명 적용).
  try {
    var proxy = new Proxy(ls, {
      get: function (target, prop) {
        if (prop === 'getItem') return shimGet;
        if (prop === 'setItem') return shimSet;
        if (prop === 'removeItem') return shimRemove;
        var val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      },
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return proxy; } });
    return;
  } catch (e) { /* 폴백으로 진행 */ }

  // 폴백: 인스턴스 메서드 직접 교체(일부 브라우저에서 window.localStorage 재정의 불가 시).
  try {
    ls.getItem = shimGet;
    ls.setItem = shimSet;
    ls.removeItem = shimRemove;
  } catch (e) {}
})();
