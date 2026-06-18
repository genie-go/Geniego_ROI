import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useT } from '../i18n/index.js';
import * as pm from '../services/pmApi.js';

/**
 * PMEvm — 획득가치관리(EVM) 대시보드 + 베이스라인 (231차 PM 초엔터프라이즈).
 * PV/EV/AC/SV/CV/SPI/CPI/EAC/VAC + 베이스라인 스냅샷. Backend: /projects/{id}/evm, /baselines
 */
export default function PMEvm() {
  const t = useT();
  const { id } = useParams();
  const [evm, setEvm] = useState(null);
  const [cur, setCur] = useState('KRW');
  const [baselines, setBaselines] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return; setLoading(true); setErr(null);
    try {
      const [e, b] = await Promise.all([pm.projectEvm(id), pm.listBaselines(id).catch(() => ({ items: [] }))]);
      setEvm(e.evm); setCur(e.budget_currency || 'KRW'); setBaselines(b.items || []);
    } catch (e) { setErr(String(e.message || e)); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const snapshot = async () => {
    const name = prompt(t('pmx.evm.baselinePrompt', '베이스라인 이름?'), 'Baseline'); if (name === null) return;
    try { await pm.createBaseline(id, { name }); load(); } catch (e) { setErr(String(e.message || e)); }
  };

  const idxColor = (x) => x === null || x === undefined ? '#94a3b8' : x >= 1 ? '#10b981' : x >= 0.9 ? '#f59e0b' : '#ef4444';
  const money = (x) => x === null || x === undefined ? '—' : `${Math.round(x).toLocaleString()} ${cur}`;
  const fmt = (x) => x === null || x === undefined ? '—' : Number(x).toFixed(2);

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <Link to={`/pm/projects/${encodeURIComponent(id)}`} style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>← {t('pm.detail.back', '프로젝트')}</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>📈 {t('pmx.evm.title', '획득가치관리 (EVM)')}</h2>
        <button onClick={snapshot} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', fontSize: 12.5, cursor: 'pointer' }}>📸 {t('pmx.evm.snapshot', '베이스라인 저장')}</button>
      </div>
      {err && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, margin: '12px 0' }}>{err}</div>}
      {loading && !evm ? <div>{t('pm.common.loadingFull', '로딩 중…')}</div> : evm && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, margin: '16px 0' }}>
            <M label={t('pmx.evm.bac', '예산 (BAC)')} v={money(evm.bac)} c="#a855f7" />
            <M label={t('pmx.evm.pv', '계획가치 (PV)')} v={money(evm.pv)} c="#4f8ef7" />
            <M label={t('pmx.evm.ev', '획득가치 (EV)')} v={money(evm.ev)} c="#06b6d4" />
            <M label={t('pmx.evm.ac', '실제비용 (AC)')} v={money(evm.ac)} c="#f59e0b" />
            <M label={t('pmx.evm.completion', '완성도')} v={`${evm.ev_pct}%`} c="#10b981" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
            <M label="SV (EV-PV)" v={money(evm.sv)} c={evm.sv >= 0 ? '#10b981' : '#ef4444'} />
            <M label="CV (EV-AC)" v={money(evm.cv)} c={evm.cv >= 0 ? '#10b981' : '#ef4444'} />
            <M label={t('pmx.evm.spi', 'SPI (일정)')} v={fmt(evm.spi)} c={idxColor(evm.spi)} />
            <M label={t('pmx.evm.cpi', 'CPI (비용)')} v={fmt(evm.cpi)} c={idxColor(evm.cpi)} />
            <M label="EAC" v={money(evm.eac)} c="#94a3b8" />
            <M label="VAC" v={money(evm.vac)} c={evm.vac >= 0 ? '#10b981' : '#ef4444'} />
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 20 }}>
            {t('pmx.evm.note', '실투입 {{h}}시간 · 시간당 단가 {{r}}. CPI는 단가가 설정된 경우에만 의미가 있습니다(프로젝트 metadata.hourly_rate).', { h: evm.actual_hours, r: evm.hourly_rate || 0 })}
          </div>

          <h3 style={{ fontSize: 14 }}>📸 {t('pmx.evm.baselines', '베이스라인')}</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {baselines.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 8, background: 'var(--bg-2,#0f172a)', border: '1px solid #1e293b', fontSize: 12.5 }}>
                <b>{b.name}</b><span style={{ color: '#94a3b8' }}>BAC {Math.round(b.bac || 0).toLocaleString()} · {(b.created_at || '').slice(0, 10)}</span>
              </div>
            ))}
            {!baselines.length && <div style={{ color: '#64748b', fontSize: 12.5 }}>{t('pmx.evm.noBaseline', '저장된 베이스라인이 없습니다.')}</div>}
          </div>
        </>
      )}
    </div>
  );
}
function M({ label, v, c }) { return <div style={{ padding: 13, borderRadius: 10, background: 'var(--bg-2,#0f172a)', border: `1px solid ${c}33` }}><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div></div>; }
