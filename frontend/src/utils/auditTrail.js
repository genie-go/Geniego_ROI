import { IS_DEMO } from './demoEnv';
/**
 * Enterprise Audit Trail Logger
 * ================================
 * 모든 사용자 행위를 기록하여 감사 추적 지원
 * - 페이지 이동, 버튼 클릭, 데이터 변경
 * - localStorage 기반 (최근 500건)
 * - 관리자 대시보드에서 조회 가능
 */

const MAX_ENTRIES = 500;
const STORAGE_KEY = 'g_audit_trail';

const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

export function auditLog(action, detail = {}) {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    entries.unshift({
      id: `AUD-${Date.now().toString(36)}`,
      action,
      detail: typeof detail === 'string' ? { message: detail } : detail,
      path: window.location.pathname,
      env: _isDemo ? 'demo' : 'production',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.slice(0, 80),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
}

export function getAuditTrail(limit = 50) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').slice(0, limit);
  } catch {
    return [];
  }
}

export function clearAuditTrail() {
  localStorage.removeItem(STORAGE_KEY);
}

// Auto-track navigation
let _lastPath = '';
export function trackNavigation() {
  if (typeof window === 'undefined') return;
  const check = () => {
    if (window.location.pathname !== _lastPath) {
      _lastPath = window.location.pathname;
      auditLog('navigate', { to: _lastPath });
    }
  };
  setInterval(check, 500);
}

// Auto-track clicks on buttons
export function trackClicks() {
  if (typeof window === 'undefined') return;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) {
      const text = btn.textContent?.trim().slice(0, 50) || '';
      const id = btn.id || '';
      if (text || id) {
        auditLog('click', { element: 'button', text, id });
      }
    }
  }, { passive: true });
}

// Initialize all tracking
export function initAuditTrail() {
  trackNavigation();
  trackClicks();
  auditLog('session_start', { url: window.location.href });
}

export default { auditLog, getAuditTrail, clearAuditTrail, initAuditTrail };
