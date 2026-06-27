/* [246차 P3] 웹 푸시 알림 opt-in 카드 — 기존 설정 페이지 편입(신규 메뉴 0).
 *   서버 VAPID 미설정/미지원 시 자동 숨김(graceful). push-only SW(화이트스크린 안전). */
import { useEffect, useState } from 'react';
import { useT } from '../i18n/index.js';
import { pushSupported, pushConfig, pushStatus, pushSubscribe, pushUnsubscribe } from '../lib/pushNotify.js';

export default function PushOptIn() {
  const t = useT();
  const [enabled, setEnabled] = useState(false);   // 서버 VAPID 활성
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      if (!pushSupported()) return;
      const cfg = await pushConfig();
      if (!on || !cfg.enabled) return;
      setEnabled(true);
      const s = await pushStatus();
      if (on) setSubscribed(!!s.subscribed);
    })();
    return () => { on = false; };
  }, []);

  if (!enabled) return null; // 서버 미설정/미지원 → 숨김

  const onToggle = async () => {
    setBusy(true); setMsg('');
    try {
      if (subscribed) { await pushUnsubscribe(); setSubscribed(false); setMsg(t('push.off', '알림이 해제되었습니다.')); }
      else { await pushSubscribe(); setSubscribed(true); setMsg(t('push.on', '알림이 켜졌습니다.')); }
    } catch (e) { setMsg('⚠ ' + String(e?.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ background: 'var(--surface,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 26 }}>🔔</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{t('push.title', '웹 푸시 알림')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.5 }}>
          {t('push.desc', '브라우저를 닫아도 중요한 KPI 경보·승인 요청·이상감지를 푸시로 받습니다.')}
        </div>
        {msg && <div style={{ fontSize: 11.5, color: msg.startsWith('⚠') ? '#dc2626' : '#16a34a', marginTop: 6, fontWeight: 700 }}>{msg}</div>}
      </div>
      <button onClick={onToggle} disabled={busy} style={{
        border: 'none', borderRadius: 9, padding: '9px 18px', cursor: busy ? 'default' : 'pointer', fontWeight: 800, fontSize: 13,
        background: subscribed ? 'rgba(239,68,68,0.12)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
        color: subscribed ? '#dc2626' : '#fff', whiteSpace: 'nowrap',
      }}>{busy ? '…' : subscribed ? t('push.disable', '알림 끄기') : t('push.enable', '🔔 알림 켜기')}</button>
    </div>
  );
}
