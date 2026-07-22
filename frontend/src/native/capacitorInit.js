/**
 * Capacitor 네이티브 셸 초기화 (Phase M1).
 *
 * 웹(브라우저)에서는 no-op(early return). 네이티브(iOS/Android)에서만 상태바·스플래시·
 * 하드웨어 백버튼·키보드를 네이티브 플러그인으로 제어한다. 모든 플러그인은 동적 import 라
 * 웹 번들에는 포함되지 않는다(@capacitor/core 만 정적, 경량 shim).
 *
 * main.jsx 에서 1회 호출. 단일 코드베이스 유지 — 동일 SPA 가 웹/앱 양쪽 구동.
 */
import { Capacitor } from '@capacitor/core';

export function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/**
 * ★네이티브 API base shim — 네이티브 웹뷰(https://localhost·capacitor://localhost)에서
 * 상대경로 fetch("/api/...", "/v423/...", "/auth/...") 는 백엔드가 없는 로컬 origin 으로 가
 * 전부 실패한다. 앱 부팅 시 fetch 를 1회 래핑해 API 경로에만 VITE_API_BASE(운영 절대 URL)를
 * 자동 접두한다. 58곳의 raw 상대 fetch 를 개별 수정하지 않고 단일 진입점에서 해결(향후 코드도 자동 적용).
 *  - 정적 자산(/logo, /manifest, /sw.js, /icon-* 등)은 매칭 제외 → 번들 로컬 서빙 유지.
 *  - 이미 절대 URL(https://, //)·base 적용된 호출은 정규식 미매칭 → 이중 접두 없음.
 *  - 웹 빌드는 base 가 빈 문자열 → 설치하지 않음(no-op, 회귀 0).
 */
function installFetchBase(base) {
  if (!base || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (window.__geniegoFetchBased) return; // 멱등
  const origFetch = window.fetch.bind(window);
  // API 라우트 접두만 대상(/api, /auth, /v{숫자}, /health[z]). 정적 자산은 제외.
  const API_RE = /^\/(api|auth|v\d|health|healthz)(\/|\?|$)/;
  window.fetch = function (input, init) {
    try {
      if (typeof input === 'string' && input.charCodeAt(0) === 47 /* '/' */ && API_RE.test(input)) {
        return origFetch(base + input, init);
      }
    } catch { /* 실패 무시(best-effort) */ }
    return origFetch(input, init);
  };
  window.__geniegoFetchBased = true;
}

export async function initNative() {
  if (!isNative()) return;
  const platform = Capacitor.getPlatform();

  // ★최우선: 네이티브 API base 보정(로그인 포함 전 페이지 네트워크 호출 정상화)
  try { installFetchBase(import.meta.env.VITE_API_BASE || ''); } catch { /* 실패 무시(best-effort) */ }

  // 네이티브 표식(safe-area·탭바 CSS 분기용)
  try {
    document.documentElement.classList.add('cap-native', 'cap-' + platform);
  } catch { /* 실패 무시(best-effort) */ }

  // 상태바
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') await StatusBar.setBackgroundColor({ color: '#070f1a' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch { /* 네이티브 플러그인 미탑재 환경 무시 */ }

  // 키보드(입력 시 레이아웃 리사이즈)
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    Keyboard.addListener('keyboardWillShow', () => document.documentElement.classList.add('cap-kb-open'));
    Keyboard.addListener('keyboardWillHide', () => document.documentElement.classList.remove('cap-kb-open'));
  } catch { /* 네이티브 플러그인 미탑재 환경 무시 */ }

  // 하드웨어 백버튼(안드로이드): 라우터 뒤로, 루트에서 종료
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      // 1순위: 모바일 사이드바 drawer 가 열려 있으면 닫기만(네비/종료 차단) — Sidebar 가 등록한 닫기 함수.
      if (typeof window.__geniegoCloseDrawer === 'function') {
        window.__geniegoCloseDrawer();
        return;
      }
      if (window.history.length > 1 && window.location.pathname !== '/dashboard' && window.location.pathname !== '/login') {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch { /* 네이티브 플러그인 미탑재 환경 무시 */ }

  // 웹앱 준비 완료 후 네이티브 스플래시 숨김(흰 화면 깜빡임 방지)
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const hide = () => SplashScreen.hide().catch(() => {});
    if (document.readyState === 'complete') setTimeout(hide, 400);
    else window.addEventListener('load', () => setTimeout(hide, 400), { once: true });
  } catch { /* 네이티브 플러그인 미탑재 환경 무시 */ }
}
