import React, { Component } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { I18nProvider } from "./i18n/index.js";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { initWebVitals } from "./utils/webVitals.js";
import "./styles.css";

import ko from './i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o, i) => o?.[i], ko) || k;
window.t = t;

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

/* Global error handlers — 최후의 블랙스크린 방지 */
window.addEventListener('error', (e) => {
  console.error('[GlobalErrorHandler]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledPromiseRejection]', e.reason);
});

/* Web Vitals 성능 모니터링 초기화 */
if (typeof window !== 'undefined') {
  initWebVitals();
}

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
