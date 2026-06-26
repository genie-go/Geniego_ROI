/* [R-P3-8] 온사이트 CRO 실험 관리·결과.
 *   랜딩/팝업/CTA 변형 A/B를 정의하고, 방문자 결정론 버킷팅으로 노출/전환을 수집해 z검정 승자를 판정한다.
 *   클라이언트 연동: import { assignVariant, trackConversion } from '../lib/onsiteCro.js'. */
import React, { useState, useEffect, useCallback } from 'react';
import { getJsonAuth, postJsonAuth, requestJsonAuth } from '../services/apiClient.js';
import { useT } from '../i18n/index.js';

export default function OnsiteCro() {
  const t = useT();
  const [exps, setExps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', goal: '', vA: '대조군(A)', wA: 50, vB: '변형(B)', wB: 50 });
  const [results, setResults] = useState({}); // {id: resultObj}
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { const d = await getJsonAuth('/v424/cro/experiments'); setExps(Array.isArray(d.experiments) ? d.experiments : []); }
    catch { /* keep */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim()) { setMsg(t('cro.nameReq', '실험명을 입력하세요.')); return; }
    try {
      await postJsonAuth('/v424/cro/experiments', {
        name: form.name.trim(), goal: form.goal.trim(),
        variants: [
          { key: 'A', label: form.vA || 'A', weight: Number(form.wA) || 50 },
          { key: 'B', label: form.vB || 'B', weight: Number(form.wB) || 50 },
        ],
      });
      setForm({ name: '', goal: '', vA: '대조군(A)', wA: 50, vB: '변형(B)', wB: 50 });
      setMsg(t('cro.created', '실험이 생성되었습니다(실행 중).')); load();
    } catch { setMsg(t('cro.createFail', '생성 실패')); }
  };

  const loadResults = async (id) => {
    try { const d = await getJsonAuth(`/v424/cro/experiments/${id}/results`); if (d.ok) setResults(r => ({ ...r, [id]: d })); } catch { /* noop */ }
  };
  const setStatus = async (id, status) => { await requestJsonAuth(`/v424/cro/experiments/${id}`, 'PUT', { status }); load(); };
  const del = async (id) => { if (!window.confirm(t('cro.delConfirm', '이 실험을 삭제하시겠습니까?'))) return; await requestJsonAuth(`/v424/cro/experiments/${id}`, 'DELETE'); load(); };

  const card = { background: 'var(--surface,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 14, padding: 16 };
  const inp = { padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border,#e2e8f0)', fontSize: 13, background: 'var(--surface,#fff)', color: 'var(--text-1)' };

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(79,142,247,0.15))' }}>🧪</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#22c55e,#4f8ef7)' }}>{t('cro.title', '온사이트 CRO 실험')}</div>
            <div className="hero-desc">{t('cro.desc', '랜딩·팝업·CTA 변형을 A/B로 실험하고, 방문자 결정론 버킷팅으로 노출/전환을 수집해 통계적 승자를 판정합니다.')}</div>
          </div>
        </div>
      </div>

      {/* 생성 폼 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text-1)' }}>➕ {t('cro.newExp', '새 실험')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('cro.expName', '실험명(예: 메인 CTA 문구)')} style={{ ...inp, width: 200 }} />
          <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder={t('cro.goal', '전환 목표(예: 가입 클릭)')} style={{ ...inp, width: 180 }} />
          <input value={form.vA} onChange={e => setForm(f => ({ ...f, vA: e.target.value }))} placeholder="A" style={{ ...inp, width: 130 }} />
          <input type="number" value={form.wA} onChange={e => setForm(f => ({ ...f, wA: e.target.value }))} title={t('cro.weight', '트래픽 비중(%)')} style={{ ...inp, width: 70 }} />
          <input value={form.vB} onChange={e => setForm(f => ({ ...f, vB: e.target.value }))} placeholder="B" style={{ ...inp, width: 130 }} />
          <input type="number" value={form.wB} onChange={e => setForm(f => ({ ...f, wB: e.target.value }))} title={t('cro.weight', '트래픽 비중(%)')} style={{ ...inp, width: 70 }} />
          <button onClick={create} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff' }}>+ {t('cro.create', '실험 생성')}</button>
          {msg && <span style={{ fontSize: 11.5, color: '#0e7490', fontWeight: 700 }}>{msg}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
          💡 {t('cro.snippet', '연동: assignVariant(exp_key)로 변형을 받아 렌더하고, 전환 시 trackConversion(exp_key)를 호출하세요.')}
        </div>
      </div>

      {loading ? <div className="sub" style={{ padding: 16 }}>…</div> : exps.length === 0 ? (
        <div className="sub" style={{ padding: 16, fontSize: 12 }}>{t('cro.empty', '아직 실험이 없습니다. 위에서 첫 실험을 생성하세요.')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {exps.map(e => {
            const res = results[e.id];
            const stc = { running: '#22c55e', paused: '#d97706', concluded: '#64748b' }[e.status] || '#64748b';
            return (
              <div key={e.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>{e.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: stc, background: stc + '1a', padding: '2px 8px', borderRadius: 6 }}>{e.status}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'monospace' }}>{e.exp_key}</span>
                  {e.goal && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>🎯 {e.goal}</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => loadResults(e.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border,#e2e8f0)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)' }}>{t('cro.results', '결과')}</button>
                    {e.status === 'running'
                      ? <button onClick={() => setStatus(e.id, 'paused')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fef3c7', cursor: 'pointer', color: '#92400e' }}>{t('cro.pause', '일시정지')}</button>
                      : <button onClick={() => setStatus(e.id, 'running')} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#dcfce7', cursor: 'pointer', color: '#166534' }}>{t('cro.resume', '재개')}</button>}
                    <button onClick={() => del(e.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#991b1b' }}>{t('cro.delete', '삭제')}</button>
                  </div>
                </div>
                {res && (
                  <div style={{ marginTop: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: 11 }}>
                        <th style={{ textAlign: 'left', padding: '5px 8px' }}>{t('cro.variant', '변형')}</th>
                        <th style={{ padding: '5px 8px' }}>{t('cro.weight2', '비중')}</th>
                        <th style={{ padding: '5px 8px' }}>{t('cro.exposures', '노출')}</th>
                        <th style={{ padding: '5px 8px' }}>{t('cro.conversions', '전환')}</th>
                        <th style={{ padding: '5px 8px' }}>CVR</th>
                      </tr></thead>
                      <tbody>
                        {res.variants.map(v => (
                          <tr key={v.key} style={{ borderTop: '1px solid var(--border,#e2e8f0)', textAlign: 'right', background: res.winner === v.key ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
                            <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: 'var(--text-1)' }}>{v.label}{res.winner === v.key && ' 🏆'}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-3)' }}>{v.weight}%</td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-2)' }}>{v.exposures.toLocaleString()}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-2)' }}>{v.conversions.toLocaleString()}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 800, color: 'var(--text-1)' }}>{v.cvr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: 11.5, color: res.winner ? '#16a34a' : 'var(--text-3)', marginTop: 8, fontWeight: res.winner ? 700 : 400 }}>
                      {res.winner ? '🏆 ' : 'ℹ️ '}{res.verdict}
                      {res.lift && res.lift.lift_relative_pct != null && <span> · {t('cro.lift', '리프트')} {res.lift.lift_relative_pct > 0 ? '+' : ''}{res.lift.lift_relative_pct}% (p={res.lift.p_value})</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
