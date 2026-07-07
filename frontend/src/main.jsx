import "./impersonationShim.js"; // 회원세션(관리자 대행 열람) 탭 격리 — 반드시 최상단(다른 모듈이 localStorage 읽기 전)
import "./xlangFetch.js"; // [270차] 전역 fetch 에 X-Lang 자동 주입 — 백엔드 i18n 현지어화(raw fetch 포함). 최상단.
import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { I18nProvider } from "./i18n/index.js";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { initWebVitals } from "./utils/webVitals.js";
import { initNative } from "./native/capacitorInit.js";
import "./styles.css";
import "./native/native.css";



/* ═══════════════════════════════════════════════════════════
   🛡️ Root-Level Error Boundary
   Provider 초기화 에러(i18n, theme, auth 등)를 잡아서
   블랙스크린 대신 복구 UI를 표시합니다.
 ═══════════════════════════════════════════════════════════ */
class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(err, info) {
    console.error('[RootErrorBoundary] Critical crash:', err, info);
    // ChunkLoadError → 자동 새로고침 (1회만)
    const isChunkError = err?.name === 'ChunkLoadError' || String(err).includes('Failed to fetch dynamically imported module');
    if (isChunkError && !sessionStorage.getItem('root_chunk_reloaded')) {
      sessionStorage.setItem('root_chunk_reloaded', '1');
      window.location.reload();
      return;
    }
    sessionStorage.removeItem('root_chunk_reloaded');
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', gap: 20, padding: 32,
          background: 'linear-gradient(145deg, #070f1a 0%, var(--surface) 100%)',
          color: 'var(--text-1)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f87171', margin: 0 }}>Application Error</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { sessionStorage.clear(); window.location.href = '/login'; }}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}
            >Go to Login</button>
            <button
              onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
              style={{
                padding: '10px 24px', borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)',
                color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}
            >Reset & Reload</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>
            Geniego-ROI v423 · If this persists, clear browser cache (Ctrl+Shift+Del)
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* 196차 — 배포 중 stale 청크(삭제된 lazy 모듈) 로드 실패 자동복구.
 * SPA 세션 중 새 배포가 나오면 옛 번들이 사라진 청크를 import 시도 → 실패가 error/
 * unhandledrejection 으로 샘(ErrorBoundary 미도달) → 흰 화면·깨진 렌더·"t is not defined".
 * 모든 경로에서 청크/모듈 로드 실패를 감지해 1회 자동 새로고침(no-cache index.html→최신 번들). */
const CHUNK_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|Unable to preload CSS/i;
// stale 번들 불일치는 2차로 미니파이 변수 미스매치(ReferenceError "x is not defined")로도 샌다.
// → 이런 증상도 1회 자동복구·거짓경보 정리 대상에 포함(현재 빌드는 clean 검증됨).
const STALE_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|Unable to preload CSS|is not defined|ReferenceError|Minified React error #(?:300|310|321)|Invalid hook call/i;
function recoverFromStaleChunk(msg) {
  if (!STALE_RE.test(String(msg || ''))) return false;
  if (sessionStorage.getItem('stale_chunk_reloaded')) return false; // 무한루프 방지(1회)
  sessionStorage.setItem('stale_chunk_reloaded', '1');
  try { window.location.reload(); } catch (e) { window.location.href = window.location.href; }
  return true;
}
// 정상 부팅이 일정 시간 유지되면 플래그 해제(다음 배포 때 다시 1회 복구 가능)
window.addEventListener('load', () => { setTimeout(() => { try { sessionStorage.removeItem('stale_chunk_reloaded'); } catch (e) {} }, 8000); });

// 196차: 거짓 "위협 감지" 경보 정리 — ①stale 번들 에러(청크/모듈/ReferenceError) ②DevTools 열림
//   모니터링(정상 디버깅을 위협으로 오인하던 알림). 실제 보안 이벤트는 보존.
const FALSE_ALERT_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|Unable to preload CSS|is not defined|ReferenceError|Minified React error #(?:300|310|321)|Invalid hook call|DevTools opened|monitoring active/i;
try {
  const a = JSON.parse(localStorage.getItem('g_sec_alerts') || '[]');
  if (Array.isArray(a) && a.length) {
    const cleaned = a.filter(x => !FALSE_ALERT_RE.test(String((x && x.message) || '')));
    if (cleaned.length !== a.length) localStorage.setItem('g_sec_alerts', JSON.stringify(cleaned));
  }
} catch (e) {}

/* Global error handlers — 최후의 블랙스크린 방지 */
window.addEventListener('error', (e) => {
  const msg = e?.error?.message || e?.message || '';
  if (recoverFromStaleChunk(msg)) return;
  console.error('[GlobalErrorHandler]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || e?.reason || '';
  if (recoverFromStaleChunk(msg)) return;
  console.error('[UnhandledPromiseRejection]', e.reason);
});

/* Web Vitals 성능 모니터링 초기화 */
if (typeof window !== 'undefined') {
  initWebVitals();
}

/* Capacitor 네이티브 셸 초기화 (웹에서는 no-op) — Phase M1 */
try { initNative(); } catch (e) { /* 웹/구버전 안전 */ }

/* [현 차수] 접속 시 무조건 Arctic White 모드 — 데모/운영 구독 모두 매 접속(페이지 로드)마다 Arctic White 로
 * 강제 초기화한다. 두 테마 경로(ThemeContext=localStorage 'geniego_theme' 읽음, Topbar=data-theme 읽음)가
 * 모두 이 값을 읽도록 렌더 직전에 설정. 세션 내에서 사용자가 테마를 바꾸면 그 전환은 허용되며(자유 선택),
 * 다음 접속 시 다시 Arctic White 로 시작한다(저장된 선호는 세션 간 비유지 = 요구사항). */
try {
  localStorage.setItem('geniego_theme', 'arctic_white');
  document.documentElement.setAttribute('data-theme', 'arctic_white');
} catch (e) { /* SSR/프라이빗모드 안전 */ }

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <ThemeProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </ThemeProvider>
        </I18nProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>
);
