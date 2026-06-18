import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../i18n/index.js';
import * as pm from '../services/pmApi.js';

/**
 * PMResources — 리소스 가용량/워크로드 (231차 PM 초엔터프라이즈).
 * 담당자별 진행 중 태스크 수·추정시간·지연·실투입 + 주 40h 기준 부하율.
 * Backend: GET /api/v425/pm/resources
 */
export default function PMResources() {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [cap, setCap] = useState(40);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { const r = await pm.resourceCapacity(); setRows(r.resources || []); setCap(r.capacity_week_hours || 40); }
    catch (e) { setErr(String(e.message || e)); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadColor = (pct) => pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <h2 style={{ marginTop: 0 }}>👥 {t('pmx.res.title', '리소스 가용량 / 워크로드')}</h2>
      <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 16 }}>{t('pmx.res.desc', '담당자별 진행 중 작업·추정 시간·지연·실투입 시간을 집계합니다. 부하율은 주 {{h}}시간 기준입니다.', { h: cap })}</div>
      {err && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 16 }}>{err}</div>}
      {loading && !rows.length ? <div>{t('pm.common.loadingFull', '로딩 중…')}</div> : (
        <div style={{ borderRadius: 12, background: 'var(--bg-2,#0f172a)', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
              <th style={cell}>{t('pmx.res.member', '담당자')}</th>
              <th style={cell}>{t('pmx.res.openTasks', '진행 작업')}</th>
              <th style={cell}>{t('pmx.res.estHours', '추정 시간')}</th>
              <th style={cell}>{t('pmx.res.overdue', '지연')}</th>
              <th style={cell}>{t('pmx.res.logged', '실투입')}</th>
              <th style={cell}>{t('pmx.res.load', '부하율')}</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={cell}>{r.user_id || '—'}</td>
                  <td style={cell}>{r.open_tasks}</td>
                  <td style={cell}>{r.est_hours}h</td>
                  <td style={{ ...cell, color: r.overdue > 0 ? '#ef4444' : '#64748b' }}>{r.overdue}</td>
                  <td style={cell}>{r.logged_hours}h</td>
                  <td style={cell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 90, height: 7, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, r.load_pct)}%`, height: '100%', background: loadColor(r.load_pct) }} />
                      </div>
                      <span style={{ fontSize: 11, color: loadColor(r.load_pct), fontWeight: 700 }}>{r.load_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} style={{ ...cell, color: '#64748b', textAlign: 'center', padding: 20 }}>{t('pmx.res.empty', '진행 중인 작업에 배정된 담당자가 없습니다.')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const cell = { padding: '9px 12px' };
