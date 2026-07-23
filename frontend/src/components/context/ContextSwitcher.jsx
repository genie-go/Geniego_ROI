/**
 * [CWIS Part004-03] Context Switcher — Tenant / Project.
 *
 * ★교차검증 반영: 실재하는 전환 축은 **TENANT · PROJECT 뿐**이다.
 *   Organization/Workspace/Team/Department/Program 은 엔티티 자체가 없어(서버가 `unavailable_axes` 로
 *   사유를 함께 내려준다) **빈 전환기를 만들지 않는다** — 동작하는 척하는 UI 를 만들지 않기 위함.
 *
 * ★보안: 목록은 서버가 계산한 것만 표시한다(접근 불가 Context 는 애초에 응답에 없다).
 *   전환은 서버 검증 성공 후에만 반영하고, 실패 시 기존 선택을 원복한다(낙관적 갱신 금지).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/index.js';
import { useCollaborationContext } from '../../context/CollaborationContextProvider.jsx';

function Dropdown({ label, current, options, loading, onSelect, onClose, emptyText, t }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const selectable = options.filter(o => o.selectable !== false);

  useEffect(() => {
    ref.current?.querySelector('input,button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, selectable.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Home') { e.preventDefault(); setIdx(0); }
      if (e.key === 'End') { e.preventDefault(); setIdx(Math.max(0, selectable.length - 1)); }
      if (e.key === 'Enter' && selectable[idx]) { e.preventDefault(); onSelect(selectable[idx]); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onSelect, selectable, idx]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
        background: 'var(--surface-2, #fff)', borderRadius: 10, maxHeight: 300, overflowY: 'auto',
        boxShadow: '0 12px 32px rgba(0,0,0,0.22)', border: '1px solid var(--border, rgba(148,163,184,0.25))',
      }}
    >
      {loading && <div style={{ padding: 10, fontSize: 12, color: '#64748b' }}>{t('nav.loading', '불러오는 중…')}</div>}
      {!loading && options.length === 0 && (
        <div style={{ padding: 10, fontSize: 12, color: '#64748b' }}>{emptyText}</div>
      )}
      {!loading && options.map((o) => {
        const i = selectable.indexOf(o);
        const disabled = o.selectable === false;
        return (
          <button
            key={`${o.type}:${o.public_id}`}
            type="button"
            role="option"
            aria-selected={o.public_id === current}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            onMouseEnter={() => i >= 0 && setIdx(i)}
            onClick={() => !disabled && onSelect(o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 40,
              padding: '8px 12px', border: 'none', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
              background: i >= 0 && i === idx ? 'rgba(79,142,247,0.10)' : 'transparent',
              opacity: disabled ? 0.5 : 1, fontSize: 12,
            }}
          >
            {/* 현재 선택은 색상 외 기호로도 표시 */}
            <span aria-hidden="true" style={{ width: 12 }}>{o.public_id === current ? '✓' : ''}</span>
            <span className="truncate">{o.name}</span>
            {o.external && <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', color: '#b45309' }}>{t('nav.external', '외부')}</span>}
            {(o.badges || []).map(b => (
              <span key={b} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>{b}</span>
            ))}
            {disabled && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{o.status}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SwitcherButton({ type, title, currentLabel, emptyText }) {
  const t = useT();
  const navigate = useNavigate();
  const { context, fetchOptions, switchContext, switching } = useCollaborationContext();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const current = type === 'TENANT' ? context?.tenant_id : context?.project_id;

  const openList = useCallback(async () => {
    setOpen(true); setLoading(true); setMsg(null);
    const j = await fetchOptions(type);
    setLoading(false);
    if (j?.available === false) { setOptions([]); setMsg(j.message || null); return; }
    setOptions(Array.isArray(j?.options) ? j.options : []);
  }, [fetchOptions, type]);

  const onSelect = useCallback(async (opt) => {
    setOpen(false);
    const payload = type === 'TENANT' ? { tenantId: opt.public_id } : { tenantId: context?.tenant_id, projectId: opt.public_id };
    const r = await switchContext(payload);
    if (!r.ok) {
      // ★실패 시 기존 Context 유지 — 사유를 사용자 언어로 안내한다(내부 정책 상세 미노출)
      const reason = {
        CONTEXT_ACCESS_DENIED: t('nav.ctxDenied', '접근 권한이 없습니다.'),
        CONTEXT_NOT_FOUND: t('nav.ctxNotFound', '대상을 찾을 수 없습니다.'),
        CONTEXT_ARCHIVED: t('nav.ctxArchived', '보관된 항목은 선택할 수 없습니다.'),
        CONTEXT_HIERARCHY_MISMATCH: t('nav.ctxMismatch', '현재 조직에 속하지 않은 항목입니다.'),
        CONTEXT_VERSION_CONFLICT: t('nav.ctxConflict', '다른 탭에서 컨텍스트가 변경되었습니다. 새로고침 후 다시 시도하세요.'),
      }[r.error] || t('nav.ctxFailed', '전환하지 못했습니다.');
      setMsg(reason);
      return;
    }
    if (r.redirect_target) navigate(r.redirect_target);
  }, [switchContext, type, context, navigate, t]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={switching}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', minHeight: 40,
          padding: '8px 10px', borderRadius: 8, cursor: switching ? 'wait' : 'pointer',
          border: '1px solid var(--border, rgba(148,163,184,0.25))', background: 'transparent',
          fontSize: 11, textAlign: 'left', color: 'inherit',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-4,#94a3b8)', flexShrink: 0 }}>{title}</span>
        <span className="truncate" style={{ fontWeight: 700 }}>{currentLabel || t('nav.none', '선택 없음')}</span>
        <span aria-hidden="true" style={{ marginLeft: 'auto', opacity: 0.6 }}>▾</span>
      </button>
      {msg && <div role="status" style={{ fontSize: 10, color: '#b45309', padding: '4px 6px' }}>{msg}</div>}
      {open && (
        <Dropdown
          label={title} current={current} options={options} loading={loading}
          onSelect={onSelect} onClose={() => setOpen(false)} emptyText={emptyText} t={t}
        />
      )}
    </div>
  );
}

export default function ContextSwitcher() {
  const t = useT();
  const { context, switchers } = useCollaborationContext();
  if (!context) return null;

  // 테넌트 전환기는 **실제로 2개 이상 접근 가능한 경우에만** 노출(명세 §28)
  const showTenant = switchers?.tenant?.multi === true;

  return (
    <div style={{ display: 'grid', gap: 6, padding: '4px 2px 10px' }}>
      {showTenant && (
        <SwitcherButton
          type="TENANT"
          title={t('nav.tenant', '조직')}
          currentLabel={context.tenant_id}
          emptyText={t('nav.noTenant', '전환 가능한 조직이 없습니다')}
        />
      )}
      <SwitcherButton
        type="PROJECT"
        title={t('nav.project', '프로젝트')}
        currentLabel={context.project_id}
        emptyText={t('nav.noProject', '진행 중인 프로젝트가 없습니다')}
      />
    </div>
  );
}
