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
  const [form, setForm] = useState({ name: '', goal: '', vA: '대조군(A)', wA: 50, vB: '변형(B)', wB: 50, device: 'all', visitor: 'all' });
  const [results, setResults] = useState({}); // {id: resultObj}
  const [msg, setMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [guideTouched, setGuideTouched] = useState(false);
  // 초심자 온보딩: 실험이 하나도 없으면 가이드 자동 펼침(사용자가 한 번 접으면 그 선택 존중).
  useEffect(() => { if (!guideTouched && !loading) setShowGuide(exps.length === 0); }, [loading, exps.length, guideTouched]);
  const toggleGuide = () => { setGuideTouched(true); setShowGuide(v => !v); };

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
        audience: (form.device !== 'all' || form.visitor !== 'all') ? { device: form.device, visitor: form.visitor } : null,
      });
      setForm({ name: '', goal: '', vA: '대조군(A)', wA: 50, vB: '변형(B)', wB: 50, device: 'all', visitor: 'all' });
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
        <button onClick={toggleGuide} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 9, border: '1px solid var(--border,#e2e8f0)', background: showGuide ? 'rgba(79,142,247,0.12)' : 'var(--surface,#fff)', color: showGuide ? '#4f6ef7' : 'var(--text-2)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
          {showGuide ? `▲ ${t('cro.guideHide', '이용 가이드 접기')}` : `📖 ${t('cro.guideShow', '처음이신가요? 이용 가이드 보기')}`}
        </button>
      </div>

      {showGuide && <CroGuide t={t} />}

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
          {/* [246차 P2] 세그먼트 타겟팅 */}
          <select value={form.device} onChange={e => setForm(f => ({ ...f, device: e.target.value }))} title={t('cro.deviceTarget', '기기 타겟')} style={{ ...inp, width: 110 }}>
            <option value="all">{t('cro.devAll', '전체 기기')}</option>
            <option value="mobile">{t('cro.devMobile', '모바일')}</option>
            <option value="desktop">{t('cro.devDesktop', '데스크톱')}</option>
          </select>
          <select value={form.visitor} onChange={e => setForm(f => ({ ...f, visitor: e.target.value }))} title={t('cro.visitorTarget', '방문자 타겟')} style={{ ...inp, width: 110 }}>
            <option value="all">{t('cro.visAll', '전체 방문자')}</option>
            <option value="new">{t('cro.visNew', '신규')}</option>
            <option value="returning">{t('cro.visReturning', '재방문')}</option>
          </select>
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
                  {e.audience && (e.audience.device !== 'all' || e.audience.visitor !== 'all') && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      🎯 {[e.audience.device !== 'all' ? (e.audience.device === 'mobile' ? t('cro.devMobile', '모바일') : t('cro.devDesktop', '데스크톱')) : null, e.audience.visitor !== 'all' ? (e.audience.visitor === 'new' ? t('cro.visNew', '신규') : t('cro.visReturning', '재방문')) : null].filter(Boolean).join(' · ')}
                    </span>
                  )}
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

/* [246차] 온사이트 CRO 초보자 단계별 이용가이드 — 실제 입력칸과 1:1 매칭, 따라만 하면 되는 안내.
   참고본: api_manuals/GeniegoROI_Onsite_CRO_User_Guide_KR.html. 화면 실제 동작 기준으로 재구성. */
function CroGuide({ t }) {
  const G = {
    wrap: { background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #c7d2fe', borderRadius: 16, padding: 22, display: 'grid', gap: 18 },
    sec: { background: 'var(--surface,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: '16px 18px' },
    h: { fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
    p: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, margin: 0 },
    box: { flex: 1, minWidth: 180, background: '#f8fafc', border: '1px solid var(--border,#e2e8f0)', borderRadius: 10, padding: '12px 14px' },
    boxT: { fontWeight: 800, fontSize: 13, color: 'var(--text-1)', marginBottom: 4 },
    boxP: { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 },
    code: { background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: 14, fontFamily: 'Consolas,monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowX: 'auto', marginTop: 8 },
    chip: { display: 'inline-block', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, padding: '1px 7px', fontWeight: 700, fontSize: 12 },
  };
  const Step = ({ n, title, children }) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 26px', width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  );
  return (
    <div style={G.wrap}>
      {/* 0. 이게 무슨 기능인가요 */}
      <div style={G.sec}>
        <div style={G.h}>💡 {t('croGuide.whatTitle', '이게 무슨 기능인가요?')}</div>
        <p style={G.p}>{t('croGuide.whatBody', '광고를 보고 들어온 방문자가 실제로 가입·문의·구매까지 이어지게 만들려면, 페이지의 버튼 문구·제목·팝업을 잘 다듬어야 합니다. 그런데 어떤 문구가 더 잘 먹힐지는 직접 해보기 전엔 모릅니다. 이 기능은 같은 자리에 ')}<b style={{ color: 'var(--text-1)' }}>{t('croGuide.whatBodyA', 'A(지금 버전)와 B(새 버전)를 방문자마다 반반씩 자동으로 보여주고')}</b>{t('croGuide.whatBody2', ', 어느 쪽이 더 많이 전환되는지 숫자로 비교해 ')}<b style={{ color: 'var(--text-1)' }}>{t('croGuide.whatBodyW', '통계적으로 이긴 버전(승자)')}</b>{t('croGuide.whatBody3', '을 알려줍니다. 흔히 ‘A/B 테스트’라고 부릅니다. 감이 아니라 데이터로 페이지를 개선하는 도구라고 생각하시면 됩니다.')}</p>
      </div>

      {/* 1. 무엇을 실험 */}
      <div style={G.sec}>
        <div style={G.h}>🔬 {t('croGuide.whatExpTitle', '무엇을 실험하나요?')}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={G.box}><div style={G.boxT}>{t('croGuide.exCtaT', 'CTA 버튼')}</div><p style={G.boxP}>{t('croGuide.exCtaP', '“무료 시작하기” vs “AI 진단 받기” 처럼 버튼 문구·색·위치를 비교')}</p></div>
          <div style={G.box}><div style={G.boxT}>{t('croGuide.exHeadT', '랜딩 제목')}</div><p style={G.boxP}>{t('croGuide.exHeadP', '페이지 맨 위 헤드라인 문구를 바꿔 체류·전환을 비교')}</p></div>
          <div style={G.box}><div style={G.boxT}>{t('croGuide.exPopT', '팝업')}</div><p style={G.boxP}>{t('croGuide.exPopP', '무료체험·쿠폰·데모 신청 팝업의 문구와 타이밍을 비교')}</p></div>
        </div>
      </div>

      {/* 2. 따라하기 */}
      <div style={G.sec}>
        <div style={G.h}>📝 {t('croGuide.stepsTitle', '이 화면에서 따라하기 (그대로 따라 하세요)')}</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Step n="1" title={t('croGuide.s1t', '아래 ‘➕ 새 실험’ 줄의 첫 칸 — 실험명 입력')}>{t('croGuide.s1b', '무엇을 시험하는지 알아볼 이름을 적습니다. 예: “메인 CTA 문구 테스트”.')}</Step>
          <Step n="2" title={t('croGuide.s2t', '두 번째 칸 — 전환 목표 입력')}>{t('croGuide.s2b', '성공으로 칠 행동 하나를 적습니다. 예: “데모 신청”, “가입 클릭”, “구매 완료”. (하나만 정하는 게 좋아요)')}</Step>
          <Step n="3" title={t('croGuide.s3t', 'A 칸 — 지금 쓰는 버전 + 옆 숫자칸 비율')}>{t('croGuide.s3b', 'A 칸에 현재 문구(대조군)를 적고, 옆 작은 숫자칸은 50 으로 둡니다. A는 “원래 버전”입니다.')}</Step>
          <Step n="4" title={t('croGuide.s4t', 'B 칸 — 새로 시험할 버전 + 옆 숫자칸 비율')}>{t('croGuide.s4b', 'B 칸에 새 문구(변형)를 적고, 옆 숫자칸도 50 으로 둡니다. ★A 비율 + B 비율 = 100 이 되어야 합니다.')}</Step>
          <Step n="5" title={t('croGuide.s5t', '(선택) 기기·방문자 타겟 좁히기')}>{t('croGuide.s5b', '“전체 기기/전체 방문자”가 기본입니다. 모바일 사용자만, 또는 신규 방문자만 실험하고 싶을 때만 드롭다운을 바꾸세요. 모르면 그대로 두면 됩니다.')}</Step>
          <Step n="6" title={t('croGuide.s6t', '‘+ 실험 생성’ 버튼 클릭')}>{t('croGuide.s6b', '버튼을 누르면 실험이 ‘실행 중’ 상태로 시작되고, 아래 목록에 카드로 나타납니다. 끝입니다!')}</Step>
        </div>
      </div>

      {/* 3. 입력 예시 (깔끔하게 1개) */}
      <div style={G.sec}>
        <div style={G.h}>✅ {t('croGuide.exTitle', '이대로 한번 입력해 보세요 (예시)')}</div>
        <div style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-2)' }}>
          <div><span style={G.chip}>{t('croGuide.exName', '실험명')}</span> {t('croGuide.exNameV', '메인 CTA 문구 테스트')}</div>
          <div><span style={G.chip}>{t('croGuide.exGoal', '전환 목표')}</span> {t('croGuide.exGoalV', '데모 신청')}</div>
          <div><span style={G.chip}>A</span> {t('croGuide.exAV', '무료 시작하기')} · 50</div>
          <div><span style={G.chip}>B</span> {t('croGuide.exBV', 'AI 순이익 진단 받기')} · 50</div>
          <div><span style={G.chip}>{t('croGuide.exTarget', '타겟')}</span> {t('croGuide.exTargetV', '전체 기기 · 전체 방문자 (그대로)')}</div>
        </div>
      </div>

      {/* 4. 사이트 적용(개발자 1줄) */}
      <div style={G.sec}>
        <div style={G.h}>🔌 {t('croGuide.codeTitle', '내 사이트에 실제로 적용하기 (개발자에게 전달)')}</div>
        <p style={G.p}>{t('croGuide.codeBody', '실험을 만든 뒤, 사이트 코드에 아래 2줄만 넣으면 자동으로 A/B가 분배되고 전환이 집계됩니다. 같은 방문자는 항상 같은 버전을 보게 됩니다(결정론 버킷팅).')}</p>
        <div style={G.code}>{`// 1) 변형 받아서 보여주기
const v = await assignVariant('실험키');
if (v?.variant === 'B') { /* 새 버전 렌더 */ } else { /* 기존 버전 */ }

// 2) 목표 행동(버튼 클릭·가입 완료 등)이 일어나면 호출
trackConversion('실험키');`}</div>
        <p style={{ ...G.p, marginTop: 8, color: 'var(--text-3)', fontSize: 12 }}>⚠ {t('croGuide.codeWarn', '‘실험키’는 실험마다 고유해야 합니다. 같은 키를 여러 실험에 쓰면 데이터가 섞입니다.')}</p>
      </div>

      {/* 5. 결과 보는 법 */}
      <div style={G.sec}>
        <div style={G.h}>📊 {t('croGuide.resTitle', '결과 보는 법')}</div>
        <p style={G.p}>{t('croGuide.resBody', '아래 실험 카드의 ‘결과’ 버튼을 누르면 A·B 각각의 노출 수·전환 수·전환율(CVR)이 표로 보입니다. 충분한 데이터가 쌓이면 더 나은 쪽에 🏆(승자) 표시와 함께 판정 문구가 나옵니다.')}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <div style={G.box}><div style={G.boxT}>{t('croGuide.resDataT', '“데이터 부족”')}</div><p style={G.boxP}>{t('croGuide.resDataP', '노출/전환이 아직 적습니다. 실험을 더 진행하세요.')}</p></div>
          <div style={G.box}><div style={G.boxT}>{t('croGuide.resWinT', '“통계적 승자” 🏆')}</div><p style={G.boxP}>{t('croGuide.resWinP', '신뢰도 95%로 우수 버전 확인. 그 버전을 적용하세요.')}</p></div>
        </div>
      </div>

      {/* 6. 꼭 지킬 것 */}
      <div style={{ ...G.sec, background: '#fff7ed', borderColor: '#fed7aa' }}>
        <div style={{ ...G.h, color: '#9a3412' }}>⚠ {t('croGuide.tipsTitle', '꼭 지킬 것 3가지')}</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: '#9a3412', lineHeight: 1.6 }}>{t('croGuide.tip1', 'A 비율 + B 비율 = 100 (예: 50/50 또는 80/20).')}</li>
          <li style={{ fontSize: 12.5, color: '#9a3412', lineHeight: 1.6 }}>{t('croGuide.tip2', '한 실험에서는 한 가지만 바꾸세요(문구만, 또는 색만). 여러 개를 동시에 바꾸면 무엇이 효과인지 알 수 없습니다.')}</li>
          <li style={{ fontSize: 12.5, color: '#9a3412', lineHeight: 1.6 }}>{t('croGuide.tip3', '노출이 충분히(보통 수백 건+) 쌓인 뒤 판단하세요. 너무 일찍 결론내면 우연일 수 있습니다.')}</li>
        </ul>
      </div>
    </div>
  );
}
