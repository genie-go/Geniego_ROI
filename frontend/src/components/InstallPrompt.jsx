/* [R-P2-3] PWA 설치 유도(A2HS).
 *   PWA(manifest·SW)는 이미 완비돼 설치 가능하나 설치를 유도하는 CTA 가 없어 "모바일 앱" 가치가 미실현.
 *   ★sw.js 는 의도적 unregister-only(170차 화이트스크린 트랩) — 본 컴포넌트는 SW 를 일절 건드리지 않음(캐싱 0).
 *   ★오프라인 표시는 기존 NetworkStatus 가 담당(중복 0) — 본 컴포넌트는 설치 CTA 만.
 *   - beforeinstallprompt 캡처 → 모바일에서 '앱 설치' 배너(이미 standalone/거부 시 숨김).
 *   - iOS Safari(beforeinstallprompt 미지원) → 수동 A2HS 안내. */
import { useEffect, useState, useCallback } from 'react';
import { useT } from '../i18n/index.js';

const DISMISS_KEY = 'genie_a2hs_dismissed_v1';

function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}
function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
}

export default function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState(null);  // beforeinstallprompt 이벤트
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // 이미 설치/실행 중 → 미표시
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* noop */ }
    if (dismissed) return;

    const onBip = (e) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBip);
    // iOS Safari: beforeinstallprompt 미발생 → 모바일이면 수동 안내(설치 가능 PWA)
    if (isIos() && isMobile()) { setIosHint(true); setShow(true); }
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try { deferred.prompt(); await deferred.userChoice; } catch { /* noop */ }
    setDeferred(null); setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
  }, [deferred]);

  const dismiss = useCallback(() => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
  }, []);

  // 오프라인 표시는 NetworkStatus 담당(중복 0). 본 컴포넌트는 설치 CTA 만.
  if (!(show && isMobile())) return null;

  return (
    <>
      {/* 설치 유도 배너 — fixed 하단(모바일), SW 미사용 */}
      {show && isMobile() && (
        <div style={{
          position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 99998,
          background: 'linear-gradient(135deg,#1e3a8a,#4f8ef7)', color: '#fff',
          borderRadius: 14, padding: '12px 14px', boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 26 }}>📲</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{t('pwa.installTitle', 'GenieROI 앱 설치')}</div>
            <div style={{ fontSize: 11, opacity: 0.92, lineHeight: 1.4, marginTop: 2 }}>
              {iosHint
                ? t('pwa.iosHint', '공유 → "홈 화면에 추가"로 앱처럼 설치하고 KPI·알림을 빠르게 확인하세요.')
                : t('pwa.installDesc', '홈 화면에 설치하고 KPI·알림을 이동 중에도 빠르게 확인하세요.')}
            </div>
          </div>
          {!iosHint && (
            <button onClick={install} style={{
              border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer',
              background: '#fff', color: '#1e3a8a', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
            }}>{t('pwa.install', '설치')}</button>
          )}
          <button onClick={dismiss} aria-label="close" style={{
            border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, padding: '0 2px', opacity: 0.85,
          }}>×</button>
        </div>
      )}
    </>
  );
}
