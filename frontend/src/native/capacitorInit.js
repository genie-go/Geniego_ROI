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

export async function initNative() {
  if (!isNative()) return;
  const platform = Capacitor.getPlatform();
  // 네이티브 표식(safe-area·탭바 CSS 분기용)
  try {
    document.documentElement.classList.add('cap-native', 'cap-' + platform);
  } catch {}

  // 상태바
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') await StatusBar.setBackgroundColor({ color: '#070f1a' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {}

  // 키보드(입력 시 레이아웃 리사이즈)
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    Keyboard.addListener('keyboardWillShow', () => document.documentElement.classList.add('cap-kb-open'));
    Keyboard.addListener('keyboardWillHide', () => document.documentElement.classList.remove('cap-kb-open'));
  } catch {}

  // 하드웨어 백버튼(안드로이드): 라우터 뒤로, 루트에서 종료
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if (window.history.length > 1 && window.location.pathname !== '/dashboard' && window.location.pathname !== '/login') {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {}

  // 웹앱 준비 완료 후 네이티브 스플래시 숨김(흰 화면 깜빡임 방지)
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const hide = () => SplashScreen.hide().catch(() => {});
    if (document.readyState === 'complete') setTimeout(hide, 400);
    else window.addEventListener('load', () => setTimeout(hide, 400), { once: true });
  } catch {}
}
