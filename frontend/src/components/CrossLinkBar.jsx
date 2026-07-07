import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';

/*
 * CrossLinkBar — 관련 메뉴 교차링크 바(비파괴 통합 UX).
 *   같은 작업이 여러 화면에 분산돼 있을 때, 서로를 명확히 연결한다(페이지 제거 없음).
 *   현재 페이지는 비활성(현재 표시). 자기완결 컴포넌트 — 페이지는 import만 하면 됨.
 *   props: links = [{ to, icon, label, labelKey? }], note, noteKey?
 *   [270차] 현지화: labelKey/noteKey 주면 t()로 15국. 미주면 label/note 그대로(하위호환). '(현재)'도 현지어.
 */
export default function CrossLinkBar({ links = [], note = '관련 메뉴', noteKey }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  if (!Array.isArray(links) || links.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '8px 12px', marginBottom: 14, borderRadius: 10,
      background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3, #64748b)' }}>🔗 {noteKey ? t(noteKey, note) : note}</span>
      {links.map(l => {
        const active = location.pathname === l.to;
        return (
          <button
            key={l.to}
            type="button"
            onClick={() => { if (!active) navigate(l.to); }}
            disabled={active}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              cursor: active ? 'default' : 'pointer', whiteSpace: 'nowrap',
              border: active ? '1px solid #4f8ef7' : '1px solid rgba(99,140,255,0.22)',
              background: active ? 'rgba(79,142,247,0.14)' : 'rgba(255,255,255,0.65)',
              color: active ? '#4f8ef7' : 'var(--text-2, #475569)',
            }}
          >
            {l.icon} {l.labelKey ? t(l.labelKey, l.label) : l.label}{active ? ' (' + t('crossLink.current', '현재') + ')' : ''}
          </button>
        );
      })}
    </div>
  );
}
