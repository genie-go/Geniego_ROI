import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/index.js';
import { requestJsonAuth } from '../services/apiClient.js';

/*
 * AgentModeCard (231차 OS#4) — AI Agent 권한모드 거버넌스.
 *  recommend(추천만) | approval(승인필수·기본) | auto(자동실행)
 *  소유자/최고관리자만 변경. 민감 실행(실 광고비)은 기본 approval. auto 는 명시 경고 후 선택.
 *  서버: PATCH /auth/profile { agent_mode } (owner/admin 게이트·감사 로그). AdAdapters.agentAutoAllowed 가 소비.
 */
const MODES = [
  { id: 'recommend', icon: '💡', ko: '추천만 (Recommend)', desc: 'AI가 분석·추천만 하고 실행은 하지 않습니다.', col: '#64748b' },
  { id: 'approval', icon: '✋', ko: '승인 필수 (Approval)', desc: 'AI 제안을 사람이 승인해야 실행됩니다. (권장 기본값)', col: '#4f8ef7' },
  { id: 'auto', icon: '⚡', ko: '자동 실행 (Auto)', desc: '정책 범위 내에서 승인 없이 자동 실행합니다. 실 광고비가 집행될 수 있습니다.', col: '#ef4444' },
];

export default function AgentModeCard() {
  const { agentMode, user, isAdmin, adminLevel } = useAuth();
  const { t } = useI18n();
  const ownerLike = (user?.team_role === 'owner') || (isAdmin && adminLevel !== 'sub');
  const [mode, setMode] = useState(agentMode || 'approval');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const change = async (id) => {
    if (!ownerLike || busy || id === mode) return;
    if (id === 'auto' && !window.confirm(t('agentMode.confirmAuto', '자동 실행 모드는 승인 없이 실 광고비를 집행할 수 있습니다. 계속하시겠습니까?'))) return;
    setBusy(true); setMsg('');
    try {
      const d = await requestJsonAuth('/auth/profile', 'PATCH', { agent_mode: id });
      if (d?.ok) { setMode(id); setMsg(t('agentMode.saved', '✅ 권한모드가 변경되었습니다(다음 로그인 시 전체 반영).')); }
      else setMsg('⚠ ' + (d?.error || 'failed'));
    } catch (e) { setMsg('⚠ ' + String(e?.message || e)); }
    setBusy(false);
    setTimeout(() => setMsg(''), 3500);
  };

  return (
    <div style={{ border: '1px solid rgba(99,140,255,0.18)', borderRadius: 12, padding: '12px 14px', background: 'rgba(99,140,255,0.04)', margin: '0 0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 13 }}>🤖 {t('agentMode.title', 'AI Agent 권한모드')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3,#94a3b8)' }}>{t('agentMode.sub', '자율 실행 수준을 제어합니다 (감지→추천→승인→실행 폐쇄 루프)')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        {MODES.map(m => {
          const on = mode === m.id;
          return (
            <button key={m.id} onClick={() => change(m.id)} disabled={!ownerLike || busy}
              title={!ownerLike ? t('agentMode.ownerOnly', '소유자/최고관리자만 변경 가능') : m.desc}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: ownerLike ? 'pointer' : 'default',
                border: `2px solid ${on ? m.col : 'var(--border,#e2e8f0)'}`, background: on ? m.col + '14' : 'var(--card,#fff)',
                opacity: ownerLike ? 1 : 0.75,
              }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: on ? m.col : 'var(--text-1)' }}>{m.icon} {t('agentMode.mode_' + m.id, m.ko)} {on && '●'}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3,#94a3b8)', marginTop: 3, lineHeight: 1.4 }}>{t('agentMode.desc_' + m.id, m.desc)}</div>
            </button>
          );
        })}
      </div>
      {!ownerLike && <div style={{ fontSize: 10.5, color: 'var(--text-3,#94a3b8)', marginTop: 6 }}>🔒 {t('agentMode.ownerOnly', '소유자/최고관리자만 변경할 수 있습니다.')}</div>}
      {msg && <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 6 }}>{msg}</div>}
    </div>
  );
}
