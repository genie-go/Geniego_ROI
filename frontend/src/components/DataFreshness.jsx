/* [R-P1-2] 데이터 신선도 인디케이터 + on-demand 즉시 동기화.
 *   운영(실데이터) 전용 — 채널별 마지막 광고지표 동기화 경과(분)를 표면화하고,
 *   "지금 동기화" 로 POST /v423/connectors/sync 즉시 호출 → 최신 데이터 당겨오기.
 *   데모는 합성데이터라 미표시. 자격증명/동기화 이력 없으면 graceful 숨김. */
import { useEffect, useState, useCallback } from 'react';
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';
import { IS_DEMO } from '../utils/demoEnv.js';
import { useT } from '../i18n/index.js';

export default function DataFreshness() {
  const t = useT();
  const [fresh, setFresh] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getJsonAuth('/v423/connectors/freshness');
      if (d && Array.isArray(d.channels)) setFresh(d);
    } catch { /* graceful */ }
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    load();
    const iv = setInterval(load, 60000); // 1분마다 경과 갱신
    return () => clearInterval(iv);
  }, [load]);

  const syncNow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await postJsonAuth('/v423/connectors/sync', {}); // 기본 채널·7일
      await load();
      try { window.dispatchEvent(new Event('genie:data-refresh')); } catch { /* noop */ }
    } catch { /* graceful */ }
    setBusy(false);
  }, [busy, load]);

  // 데모 또는 동기화 이력 없음 → 미표시(노이즈 방지)
  if (IS_DEMO || !fresh || !Array.isArray(fresh.channels) || fresh.channels.length === 0) return null;

  const okChans = fresh.channels.filter(c => c.status === 'ok');
  const mins = fresh.last_sync_minutes_ago;
  const grade = mins == null ? 'unknown' : (mins <= 20 ? 'fresh' : (mins <= 90 ? 'recent' : 'stale'));
  const color = { fresh: '#22c55e', recent: '#d97706', stale: '#dc2626', unknown: '#94a3b8' }[grade];
  const dot = { fresh: '🟢', recent: '🟡', stale: '🔴', unknown: '⚪' }[grade];
  const agoLabel = mins == null ? t('freshness.never', '동기화 없음')
    : mins < 1 ? t('freshness.justNow', '방금')
    : mins < 60 ? `${mins}${t('freshness.minAgo', '분 전')}`
    : `${Math.floor(mins / 60)}${t('freshness.hrAgo', '시간 전')}`;

  return (
    <span
      title={`${t('freshness.title', '데이터 신선도')} — ${okChans.map(c => `${c.channel}: ${c.minutes_ago ?? '-'}m`).join(', ')}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9,
        background: color + '14', border: `1px solid ${color}40`, height: 28, whiteSpace: 'nowrap' }}
    >
      <span style={{ fontSize: 10 }}>{dot}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color }}>{agoLabel}</span>
      <button
        onClick={syncNow}
        disabled={busy}
        title={t('freshness.syncNow', '지금 동기화 (최신 광고지표 수집)')}
        style={{ marginLeft: 1, border: 'none', background: 'transparent', cursor: busy ? 'wait' : 'pointer',
          fontSize: 11, color, padding: 0, lineHeight: 1, transform: busy ? 'none' : 'none' }}
      >{busy ? '⏳' : '🔄'}</button>
    </span>
  );
}
