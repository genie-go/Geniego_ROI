// authGate.js — [현 차수 P3] 세션 검증 게이트(모듈 레벨 공유)
//
// 목적: AuthProvider 트리 "밖"에 있는 프로바이더(예: NotificationProvider 는 main.jsx 에서
//   App(=AuthProvider) 을 감싸므로 useAuth 를 쓸 수 없다)도 "서버가 세션을 확인했는지"를
//   알 수 있도록, React 컨텍스트가 아닌 모듈 싱글턴으로 공유한다.
//
// 정책: 유일 writer 는 AuthContext 다(setSessionReadyGate). 인증이 필요한 자동 fetch 는
//   isSessionReady()===true 일 때만 발사해야 한다 — 만료/stale 토큰이 로그인 화면에서
//   인증 API 를 난사(401 폭풍)하는 것을 차단한다. ★로그아웃 정책과는 무관(데이터 fetch 게이트일 뿐).
//
// 재로드 시 모듈이 새로 로드되므로 _ready 는 false 로 시작한다(AuthContext 가 /auth/me 확인 후 true 로 올림).

let _ready = false;
const _listeners = new Set();

export function setSessionReadyGate(v) {
  const b = !!v;
  if (b === _ready) return;
  _ready = b;
  _listeners.forEach((fn) => { try { fn(b); } catch { /* listener 오류 무시(격리) */ } });
}

export function isSessionReady() { return _ready; }

/** 게이트 변경 구독 — 반환된 함수 호출로 해제. */
export function onSessionReadyChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
