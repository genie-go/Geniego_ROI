import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMSettings — project 메타 편집 + 아카이브.
 * Backend: GET/PATCH /v425/pm/projects/{id} (analyst+), DELETE = soft archive (admin).
 * n152f PM-Core 잔여 4 page 중 1 (178차).
 * U-177-A: 데모 모드 write disabled + banner.
 */

const _IS_DEMO_ENV = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.includes('roidemo') || host.includes('demo') ||
           (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
  } catch { return false; }
})();

const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];
const CURRENCIES = ['KRW', 'USD', 'JPY', 'EUR', 'CNY'];
const EDITABLE = ['name', 'description', 'status', 'start_date', 'target_date', 'owner_user_id', 'budget_amount', 'budget_currency'];

export default function PMSettings() {
  const t = useT();
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const show = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const fetchProject = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(projectId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) throw new Error(t('pmExt.settings.notFound', 'Project not found'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const picked = {};
      EDITABLE.forEach(k => { picked[k] = j[k] ?? ''; });
      setForm(picked);
      setOriginal(picked);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, projectId, base, t]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const dirty = form && original && EDITABLE.some(k => String(form[k] ?? '') !== String(original[k] ?? ''));
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (_IS_DEMO_ENV) { show(t('pmExt.settings.demoLocked', 'Demo mode — saving disabled')); return; }
    if (!form.name?.trim()) { show(t('pmExt.settings.nameRequired', 'Project name is required')); return; }
    setSaving(true);
    try {
      const body = {};
      EDITABLE.forEach(k => { if (String(form[k] ?? '') !== String(original[k] ?? '')) body[k] = form[k] === '' ? null : form[k]; });
      const res = await fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 403) throw new Error(t('pmExt.settings.forbidden', 'You do not have permission to edit this project'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOriginal(form);
      show(t('pmExt.settings.saved', 'Settings saved'));
    } catch (e) {
      show(`${t('pmExt.settings.error', 'Error')}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (_IS_DEMO_ENV) { show(t('pmExt.settings.demoLocked', 'Demo mode — archive disabled')); return; }
    if (typeof window !== 'undefined' && !window.confirm(t('pmExt.settings.confirmArchive', 'Archive this project? It will be hidden from active lists.'))) return;
    try {
      const res = await fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) throw new Error(t('pmExt.settings.archiveForbidden', 'Admin permission required to archive'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      show(t('pmExt.settings.archived', 'Project archived'));
      setTimeout(() => navigate('/pm'), 1200);
    } catch (e) {
      show(`${t('pmExt.settings.error', 'Error')}: ${e?.message || e}`);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3,#94a3b8)' }}>
      {t('pmExt.settings.loading', 'Loading…')}
    </div>;
  }

  if (error || !form) {
    return <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
        ⚠️ {t('pmExt.settings.error', 'Error')}: {error || t('pmExt.settings.notFound', 'Project not found')}
      </div>
      <button onClick={fetchProject} style={btnPrimary}>{t('pmExt.settings.retry', 'Retry')}</button>
    </div>;
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)', maxWidth: 760 }}>
      {_IS_DEMO_ENV && <DemoBanner t={t} />}
      {toast && <div role="status" style={toastBox}>{toast}</div>}

      <div style={{ marginBottom: 8 }}>
        <Link to={`/pm/projects/${encodeURIComponent(projectId)}`} style={crumb}>
          ← {t('pmExt.settings.backToProject', 'Project')}
        </Link>
      </div>
      <h2 style={{ margin: '0 0 20px' }}>⚙️ {t('pmExt.settings.title', 'Project settings')}</h2>

      <Section title={t('pmExt.settings.sectionGeneral', 'General')}>
        <Field label={t('pmExt.settings.name', 'Name')}>
          <input value={form.name} onChange={e => setField('name', e.target.value)} disabled={_IS_DEMO_ENV} style={input} />
        </Field>
        <Field label={t('pmExt.settings.description', 'Description')}>
          <textarea value={form.description} onChange={e => setField('description', e.target.value)} disabled={_IS_DEMO_ENV}
            style={{ ...input, minHeight: 70, resize: 'vertical' }} />
        </Field>
        <Field label={t('pmExt.settings.status', 'Status')}>
          <select value={form.status} onChange={e => setField('status', e.target.value)} disabled={_IS_DEMO_ENV} style={input}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </Section>

      <Section title={t('pmExt.settings.sectionSchedule', 'Schedule')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('pmExt.settings.startDate', 'Start date')}>
            <input type="date" value={form.start_date || ''} onChange={e => setField('start_date', e.target.value)} disabled={_IS_DEMO_ENV} style={input} />
          </Field>
          <Field label={t('pmExt.settings.targetDate', 'Target date')}>
            <input type="date" value={form.target_date || ''} onChange={e => setField('target_date', e.target.value)} disabled={_IS_DEMO_ENV} style={input} />
          </Field>
        </div>
      </Section>

      <Section title={t('pmExt.settings.sectionBudget', 'Budget & ownership')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('pmExt.settings.budgetAmount', 'Budget amount')}>
            <input type="number" value={form.budget_amount || ''} onChange={e => setField('budget_amount', e.target.value)} disabled={_IS_DEMO_ENV} style={input} />
          </Field>
          <Field label={t('pmExt.settings.budgetCurrency', 'Currency')}>
            <select value={form.budget_currency || 'KRW'} onChange={e => setField('budget_currency', e.target.value)} disabled={_IS_DEMO_ENV} style={input}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t('pmExt.settings.ownerUserId', 'Owner user ID')}>
          <input value={form.owner_user_id || ''} onChange={e => setField('owner_user_id', e.target.value)} disabled={_IS_DEMO_ENV} style={input} />
        </Field>
      </Section>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={save} disabled={_IS_DEMO_ENV || saving || !dirty}
          style={{ ...btnPrimary, opacity: (_IS_DEMO_ENV || !dirty) ? 0.5 : 1, cursor: (_IS_DEMO_ENV || !dirty) ? 'not-allowed' : 'pointer' }}>
          {saving ? t('pmExt.settings.saving', 'Saving…') : t('pmExt.settings.save', 'Save changes')}
        </button>
        {dirty && !_IS_DEMO_ENV && (
          <button onClick={() => setForm(original)} style={btnGhost}>{t('pmExt.settings.discard', 'Discard')}</button>
        )}
      </div>

      {/* Danger zone */}
      <div style={{ marginTop: 36, padding: 18, borderRadius: 14, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
        <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>{t('pmExt.settings.dangerZone', 'Danger zone')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)', marginBottom: 12 }}>
          {t('pmExt.settings.archiveDesc', 'Archiving hides the project from active lists. Data is preserved and can be restored by an administrator.')}
        </div>
        <button onClick={archive} disabled={_IS_DEMO_ENV}
          style={{ ...btnGhost, color: '#ef4444', borderColor: '#ef444455', opacity: _IS_DEMO_ENV ? 0.4 : 1 }}>
          {t('pmExt.settings.archive', 'Archive project')}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 18, padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13 }}>{title}</div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3,#94a3b8)', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

function DemoBanner({ t }) {
  return (
    <div role="status" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10,
      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
      ⚠️ {t('pmExt.demoBanner', 'Demo mode — data is read-only and not saved to production.')}
    </div>
  );
}

const crumb = { fontSize: 12, color: 'var(--text-3,#94a3b8)', textDecoration: 'none' };
const input = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: 13, boxSizing: 'border-box' };
const btnPrimary = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnGhost = { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 };
const toastBox = { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 10, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e7eb', fontSize: 13, zIndex: 1000 };
