import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/index.js';
import * as pm from '../services/pmApi.js';

/**
 * PMRaid — RAID 등록부(Risk/Issue/Assumption/Dependency) (231차 PM 초엔터프라이즈).
 * 확률×영향=심각도, 상태 추적, 완화 계획. Backend: /api/v425/pm/raid
 */
const TYPES = ['risk', 'issue', 'assumption', 'dependency'];
const STATUSES = ['open', 'mitigating', 'closed', 'accepted'];
export default function PMRaid() {
  const t = useT();
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: 'risk', title: '', owner: '', probability: 3, impact: 3, mitigation: '' });

  const TYPE_LABEL = { risk: t('pmx.raid.risk', '리스크'), issue: t('pmx.raid.issue', '이슈'), assumption: t('pmx.raid.assumption', '가정'), dependency: t('pmx.raid.dependency', '의존성') };
  const STATUS_LABEL = { open: t('pmx.raid.stOpen', '열림'), mitigating: t('pmx.raid.stMitigating', '완화중'), closed: t('pmx.raid.stClosed', '종료'), accepted: t('pmx.raid.stAccepted', '수용') };

  const load = useCallback(async () => {
    if (!id) return; setLoading(true); setErr(null);
    try { const r = await pm.listRaid({ project_id: id }); setItems(r.items || []); } catch (e) { setErr(String(e.message || e)); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title.trim()) return;
    try { await pm.createRaid({ ...form, project_id: id }); setForm({ type: 'risk', title: '', owner: '', probability: 3, impact: 3, mitigation: '' }); load(); }
    catch (e) { setErr(String(e.message || e)); }
  };
  const setStatus = async (it, status) => { try { await pm.patchRaid(it.id, { status }); load(); } catch (e) { setErr(String(e.message || e)); } };
  const del = async (it) => { if (!window.confirm(t('pmx.raid.confirmDel', '삭제하시겠습니까?'))) return; try { await pm.deleteRaid(it.id); load(); } catch (e) { setErr(String(e.message || e)); } };
  const sevColor = (s) => s >= 15 ? '#ef4444' : s >= 8 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <Link to={`/pm/projects/${encodeURIComponent(id)}`} style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>← {t('pm.detail.back', '프로젝트')}</Link>
      <h2 style={{ marginTop: 8 }}>⚠️ {t('pmx.raid.title', 'RAID 등록부')}</h2>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>{t('pmx.raid.desc', '리스크·이슈·가정·의존성을 등록하고 확률×영향(심각도)과 완화 계획을 관리합니다.')}</div>
      {err && <div style={errBox}>{err}</div>}

      <div style={{ ...box, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, alignItems: 'end' }}>
        <Field label={t('pmx.raid.type', '유형')}><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp}>{TYPES.map(x => <option key={x} value={x}>{TYPE_LABEL[x]}</option>)}</select></Field>
        <Field label={t('pmx.raid.titleField', '제목')} grow><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} /></Field>
        <Field label={t('pmx.raid.owner', '담당')}><input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={inp} /></Field>
        <Field label={t('pmx.raid.probability', '확률(1-5)')}><input type="number" min={1} max={5} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: +e.target.value }))} style={inp} /></Field>
        <Field label={t('pmx.raid.impact', '영향(1-5)')}><input type="number" min={1} max={5} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: +e.target.value }))} style={inp} /></Field>
        <button onClick={create} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ {t('pmx.raid.add', '등록')}</button>
      </div>

      {loading && !items.length ? <div>{t('pm.common.loadingFull', '로딩 중…')}</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(it => (
            <div key={it.id} style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#4f8ef722', color: '#4f8ef7' }}>{TYPE_LABEL[it.type] || it.type}</span>
                <span style={{ width: 30, height: 24, lineHeight: '24px', textAlign: 'center', borderRadius: 6, fontWeight: 700, fontSize: 12, background: sevColor(it.severity) + '22', color: sevColor(it.severity) }} title={t('pmx.raid.severity', '심각도')}>{it.severity}</span>
                <b>{it.title}</b>
                {it.owner && <span style={{ fontSize: 11, color: '#94a3b8' }}>👤 {it.owner}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={it.status} onChange={e => setStatus(it, e.target.value)} style={{ ...inp, padding: '4px 8px', fontSize: 11.5 }}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
                <button onClick={() => del(it)} style={{ padding: '4px 9px', borderRadius: 7, border: '1px solid #7f1d1d', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>{t('pmx.raid.del', '삭제')}</button>
              </div>
            </div>
          ))}
          {!items.length && !loading && <div style={{ color: '#64748b', fontSize: 13 }}>{t('pmx.raid.empty', '등록된 RAID 항목이 없습니다.')}</div>}
        </div>
      )}
    </div>
  );
}
function Field({ label, children, grow }) { return <div style={{ gridColumn: grow ? 'span 2' : 'auto' }}><label style={{ fontSize: 10.5, color: '#94a3b8', display: 'block', marginBottom: 3 }}>{label}</label>{children}</div>; }
const box = { padding: 14, borderRadius: 10, background: 'var(--bg-2,#0f172a)', border: '1px solid #1e293b' };
const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb', fontSize: 12.5 };
const errBox = { padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 16 };
