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
import { safeReload } from "./services/unsavedGuard.js"; // [현 차수] 미저장 입력이 있으면 자동 새로고침 보류
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
    // ChunkLoadError → 자동 새로고침 (1회만). [현 차수] 미저장 입력이 있으면 보류하고 복구 UI 를 띄운다.
    const isChunkError = err?.name === 'ChunkLoadError' || String(err).includes('Failed to fetch dynamically imported module');
    if (isChunkError && !sessionStorage.getItem('root_chunk_reloaded')) {
      if (safeReload('RootErrorBoundary: chunk load failure')) {
        sessionStorage.setItem('root_chunk_reloaded', '1');
        return;
      }
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
 * unhandledrejection 으로 샘(ErrorBoundary 미도달) → 흰 화면·깨진 렌더.
 * 모든 경로에서 청크/모듈 로드 실패를 감지해 1회 자동 새로고침(no-cache index.html→최신 번들).
 *
 * [현 차수] ★자동 새로고침 오발 2건 수정 — "입력 중이던 자료가 사라진다" 의 직접 원인이었다.
 *   ① 판정 범위: STALE_RE 가 `is not defined` / `ReferenceError` / `Invalid hook call` 까지 잡아,
 *      청크와 무관한 일반 런타임 오류(서드파티 스크립트 포함) 하나만 나도 전체 페이지를 새로고침했다.
 *      → 진짜 청크/모듈 로드 실패 패턴만 남긴다(CHUNK_RE 와 동일 소스로 통일).
 *   ② 재발 가드: 로드 8초 뒤 플래그를 지워 "세션당 1회"가 무효(매번 리로드)였다. 반대로 아예 안 지우면
 *      탭 수명당 1회뿐이라 2차 배포 때 청크404를 복구 못 한다. → **60초 시간창**: 마지막 자동복구 후
 *      60초 이내 재발이면 무한루프로 보고 억제, 60초 지난 재발(새 배포)이면 1회 더 복구 허용.
 *   ③ 미저장 입력이 있으면 자동 새로고침을 보류한다(safeReload). */
const CHUNK_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|Unable to preload CSS/i;
const STALE_RE = CHUNK_RE;
const STALE_RELOAD_WINDOW_MS = 60000;
function recoverFromStaleChunk(msg) {
  if (!STALE_RE.test(String(msg || ''))) return false;
  try {
    const last = parseInt(sessionStorage.getItem('stale_chunk_reloaded') || '0', 10) || 0;
    if (last && (Date.now() - last) < STALE_RELOAD_WINDOW_MS) return false; // 60초 내 재발 = 무한루프 억제
  } catch (e) { /* sessionStorage 불가 시 아래 진행 */ }
  if (!safeReload('main: stale chunk load failure')) return false;  // 미저장 입력 있으면 보류(플래그도 남기지 않음)
  try { sessionStorage.setItem('stale_chunk_reloaded', String(Date.now())); } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
  return true;
}

// 196차: 거짓 "위협 감지" 경보 정리 — ①stale 번들 에러(청크/모듈/ReferenceError) ②DevTools 열림
//   모니터링(정상 디버깅을 위협으로 오인하던 알림). 실제 보안 이벤트는 보존.
const FALSE_ALERT_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|Unable to preload CSS|is not defined|ReferenceError|Minified React error #(?:300|310|321)|Invalid hook call|DevTools opened|monitoring active/i;
try {
  const a = JSON.parse(localStorage.getItem('g_sec_alerts') || '[]');
  if (Array.isArray(a) && a.length) {
    const cleaned = a.filter(x => !FALSE_ALERT_RE.test(String((x && x.message) || '')));
    if (cleaned.length !== a.length) localStorage.setItem('g_sec_alerts', JSON.stringify(cleaned));
  }
} catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }

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

/* [286차] ★고착된 platform_growth 컨텍스트 1회 자동 해제(배포 후 복구).
 * 종전 버그: Admin Growth Center 진입만으로 localStorage 'gg_act_as_tenant'='platform_growth' 가 자동 ON 되고
 * 영구 고착 → apiClient 가 전 API 에 X-Act-As-Tenant 헤더를 붙여 authedTenant 가 admin 계정 tenant 를
 * platform_growth(데이터 0)로 바꿔 **창고·CRM·카탈로그·주문 등 전 메뉴가 빈 화면**이었다(최고관리자가 하위관리자
 * 창고를 못 보던 진짜 원인). 자동 ON 은 제거됐지만 이미 고착된 브라우저는 남아 있으므로 버전드 1회 리셋으로 즉시 복구.
 * 이후 플랫폼 컨텍스트는 오직 명시적 토글로만 켜진다(재토글 1클릭). 리셋 키가 남아 재실행되지 않음. */
try {
  if (!localStorage.getItem('gg_actas_reset_v286')) {
    localStorage.removeItem('gg_act_as_tenant');
    localStorage.setItem('gg_actas_reset_v286', '1');
  }
} catch (e) { /* 프라이빗모드 안전 */ }

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
