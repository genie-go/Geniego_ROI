import React, { useCallback, useEffect, useState } from 'react';
import BeginnerGuide from '../components/BeginnerGuide.jsx';
import { GUIDE } from '../lib/guideSpecs.js';
import { useT } from '../i18n/index.js';
import * as pm from '../services/pmApi.js';

/**
 * PMPortfolio — 포트폴리오/프로그램 관리 + 롤업 EVM 대시보드 (231차 PM 초엔터프라이즈).
 * 여러 프로젝트를 포트폴리오로 묶어 진척·예산·EVM(SPI/CPI)을 집계.
 * Backend: /api/v425/pm/portfolios, /portfolios/{id}/rollup, /portfolios/{id}/attach
 */
const cardBg = 'var(--bg-2,#0f172a)';
export default function PMPortfolio() {
  const t = useT();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sel, setSel] = useState(null);
  const [rollup, setRollup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [p, pr] = await Promise.all([pm.listPortfolios(), pm.listProjects().catch(() => ({ items: [] }))]);
      setItems(p.items || []); setProjects(pr.items || []);
    } catch (e) { setErr(String(e.message || e)); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openRollup = async (pf) => {
    setSel(pf); setRollup(null);
    try { setRollup(await pm.portfolioRollup(pf.id)); } catch (e) { setErr(String(e.message || e)); }
  };
  const create = async () => {
    const name = prompt(t('pmx.pf.newPrompt', '새 포트폴리오 이름?')); if (!name) return;
    try { await pm.createPortfolio({ name }); load(); } catch (e) { setErr(String(e.message || e)); }
  };
  const archive = async (pf) => { if (!window.confirm(t('pmx.pf.confirmDelete', "포트폴리오 '{{n}}'을(를) 보관하시겠습니까? 소속 프로젝트는 보존됩니다.", { n: pf.name }))) return; try { await pm.deletePortfolio(pf.id); if (sel?.id === pf.id) { setSel(null); setRollup(null); } load(); } catch (e) { setErr(String(e.message || e)); } };
  const attach = async (projectId, on) => { if (!sel) return; try { await pm.attachProject(sel.id, { project_id: projectId, attach: on }); openRollup(sel); load(); } catch (e) { setErr(String(e.message || e)); } };

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>🗂️ {t('pmx.pf.title', '포트폴리오 / 프로그램')}</h2>
        <button onClick={create} style={btn('#4f8ef7')}>+ {t('pmx.pf.add', '포트폴리오 추가')}</button>
      </div>
      <div style={{ marginBottom: 16 }}><BeginnerGuide spec={GUIDE.pmPortfolio} /></div>
      {err && <div style={errBox}>{err}</div>}
      {loading && !items.length && <div>{t('pm.common.loadingFull', '로딩 중…')}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12, marginBottom: 22 }}>
        {items.map(pf => (
          <div key={pf.id} onClick={() => openRollup(pf)} style={{ ...tile, cursor: 'pointer', borderColor: sel?.id === pf.id ? '#4f8ef7' : '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{pf.name}</b>
              <button onClick={(e) => { e.stopPropagation(); archive(pf); }} style={{ ...btnGhost, padding: '2px 8px', fontSize: 10 }}>{t('pmx.pf.archive', '보관')}</button>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{pf.description || '—'}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>📁 {t('pmx.pf.projects', '프로젝트')} {pf.project_count || 0}</div>
          </div>
        ))}
        {!items.length && !loading && <div style={{ color: '#64748b', fontSize: 13 }}>{t('pmx.pf.empty', '포트폴리오가 없습니다. 추가하여 프로젝트를 묶으세요.')}</div>}
      </div>

      {sel && rollup && (
        <div style={{ ...tile, borderColor: '#334155' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>📊 {sel.name} — {t('pmx.pf.rollup', '롤업 EVM')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 16 }}>
            <Metric label={t('pmx.pf.projects', '프로젝트')} v={rollup.summary.projects} c="#4f8ef7" />
            <Metric label={t('pmx.evm.completion', '완성도')} v={`${rollup.summary.completion_pct}%`} c="#06b6d4" />
            <Metric label="SPI" v={fmt(rollup.summary.spi)} c={spiColor(rollup.summary.spi)} />
            <Metric label="CPI" v={fmt(rollup.summary.cpi)} c={spiColor(rollup.summary.cpi)} />
            <Metric label={t('pmx.pf.atRisk', '위험')} v={rollup.summary.at_risk} c="#ef4444" />
            <Metric label={t('pmx.evm.bac', '예산(BAC)')} v={Math.round(rollup.summary.bac).toLocaleString()} c="#a855f7" />
          </div>
          <table style={tbl}>
            <thead><tr style={th}><td>{t('pmx.pf.project', '프로젝트')}</td><td>{t('pm.kpi.completionPct', '완성도')}</td><td>SPI</td><td>CPI</td><td>{t('pmx.evm.bac', 'BAC')}</td></tr></thead>
            <tbody>
              {rollup.projects.map(p => (
                <tr key={p.id} style={tr}><td>{p.name}</td><td>{p.completion_pct}%</td><td style={{ color: spiColor(p.spi) }}>{fmt(p.spi)}</td><td style={{ color: spiColor(p.cpi) }}>{fmt(p.cpi)}</td><td>{Math.round(p.bac || 0).toLocaleString()}</td></tr>
              ))}
              {!rollup.projects.length && <tr><td colSpan={5} style={{ padding: 14, color: '#64748b' }}>{t('pmx.pf.noProjects', '소속 프로젝트가 없습니다. 아래에서 추가하세요.')}</td></tr>}
            </tbody>
          </table>
          <div style={{ marginTop: 14, fontSize: 12, color: '#94a3b8' }}>{t('pmx.pf.assign', '프로젝트 소속 지정')}:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {projects.map(p => {
              const on = p.portfolio_id === sel.id;
              return <button key={p.id} onClick={() => attach(p.id, !on)} style={{ ...chip, background: on ? 'rgba(79,142,247,0.2)' : 'transparent', color: on ? '#4f8ef7' : '#94a3b8', borderColor: on ? '#4f8ef7' : '#334155' }}>{on ? '✓ ' : '+ '}{p.name}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({ label, v, c }) { return <div style={{ padding: 12, borderRadius: 10, background: cardBg, border: `1px solid ${c}33` }}><div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div></div>; }
const fmt = (x) => x === null || x === undefined ? '—' : Number(x).toFixed(2);
const spiColor = (x) => x === null || x === undefined ? '#94a3b8' : x >= 1 ? '#10b981' : x >= 0.9 ? '#f59e0b' : '#ef4444';
const tile = { padding: 16, borderRadius: 12, background: cardBg, border: '1px solid #1e293b' };
const btn = (c) => ({ padding: '8px 16px', borderRadius: 9, border: 'none', background: c, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
const btnGhost = { padding: '5px 11px', borderRadius: 7, border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' };
const chip = { padding: '5px 11px', borderRadius: 14, border: '1px solid #334155', fontSize: 11.5, cursor: 'pointer' };
const errBox = { padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 16 };
const tbl = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 };
const th = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #1e293b' };
const tr = { borderBottom: '1px solid #1e293b' };
