import React, { useState, useEffect, useCallback } from "react";
import BeginnerGuide from "../components/BeginnerGuide.jsx";
import { GUIDE } from "../lib/guideSpecs.js";
import { useI18n } from '../i18n';
import { getJsonAuth, postJsonAuth, requestJsonAuth } from '../services/apiClient';

/* [현 차수] AIRuleEngine 실배선 — 데모 스텁 → 백엔드 룰엔진(/v424/rules) 실연동.
   범용 IF-THEN 자동화: 실데이터 조건(채널 ROAS/지출/전환·재고) 평가 → 실 액션(알림/웹훅/채널정지/발주).
   운영/데모 동일하게 백엔드 영속(테넌트 격리). 거짓 트리거 0(데이터 없으면 평가 보류). */
export default function AIRuleEngine() {
  const { t } = useI18n();
  const tr = (k, fb) => t('aiRuleEngine.' + k, fb);
  const [activeTab, setActiveTab] = useState(0);
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ metrics: [], ops: [], actions: [] });
  const [kpi, setKpi] = useState({ active_rules: 0, triggered_today: 0, success_rate: null });
  const [form, setForm] = useState({ name: '', metric: 'channel_roas', op: 'lt', threshold: '', target: '', action: 'alert' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // [현 차수] 세밀 데이파팅(요일×시간) + per-user 크로스채널 빈도캡 서피싱 (백엔드 /v424/rules/dayparts·frequency 실연동)
  const emptyGrid = () => Array.from({ length: 7 }, () => Array(24).fill(false));
  const [dayparts, setDayparts] = useState([]);
  const [freqWins, setFreqWins] = useState([]);
  const [dpForm, setDpForm] = useState({ id: 0, name: '', channel: '', tz: 'Asia/Seoul', grid: emptyGrid() });
  const [freqForm, setFreqForm] = useState({ id: 0, name: '', channel: '', daily_cap: '', weekly_cap: '' });

  const load = useCallback(async () => {
    try {
      const r = await getJsonAuth('/v424/rules');
      setRules(r?.rules || []);
      if (r?.kpi) { setKpi(r.kpi); setMeta({ metrics: r.kpi.metrics || [], ops: r.kpi.ops || [], actions: r.kpi.actions || [] }); }
    } catch { setRules([]); }
    try { const l = await getJsonAuth('/v424/rules/logs'); setLogs(l?.logs || []); } catch { setLogs([]); }
    try { const d = await getJsonAuth('/v424/rules/dayparts'); setDayparts(d?.schedules || []); } catch { setDayparts([]); }
    try { const f = await getJsonAuth('/v424/rules/frequency'); setFreqWins(f?.windows || []); } catch { setFreqWins([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { setMsg(tr('errName', '규칙 이름을 입력하세요.')); return; }
    setBusy(true); setMsg('');
    try {
      await postJsonAuth('/v424/rules', { ...form, threshold: Number(form.threshold) || 0 });
      setForm({ name: '', metric: 'channel_roas', op: 'lt', threshold: '', target: '', action: 'alert' });
      setMsg(tr('saved', '✅ 규칙이 저장되었습니다.')); setActiveTab(0); await load();
    } catch (e) { setMsg(String(e?.message || e)); } finally { setBusy(false); }
  };
  const toggle = async (id) => { try { await postJsonAuth(`/v424/rules/${id}/toggle`, {}); await load(); } catch (e) { alert(String(e?.message || e)); } };
  const del = async (id) => { if (!window.confirm(tr('delConfirm', '이 규칙을 삭제하시겠습니까?'))) return; try { await requestJsonAuth(`/v424/rules/${id}`, 'DELETE'); await load(); } catch (e) { alert(String(e?.message || e)); } };
  const runNow = async () => { setBusy(true); try { const r = await postJsonAuth('/v424/rules/run', {}); setMsg(tr('ranNow', '평가 완료') + ` — ${tr('evaluated', '평가')} ${r?.evaluated ?? 0} · ${tr('triggered', '트리거')} ${r?.triggered ?? 0}`); await load(); } catch (e) { setMsg(String(e?.message || e)); } finally { setBusy(false); } };

  // ── 데이파팅(요일×시간) ───────────────────────────────────────────────
  const dowLabels = [tr('dowSun', '일'), tr('dowMon', '월'), tr('dowTue', '화'), tr('dowWed', '수'), tr('dowThu', '목'), tr('dowFri', '금'), tr('dowSat', '토')];
  const gridToDowHours = (grid) => {
    const out = {};
    grid.forEach((hours, d) => { const on = hours.map((v, h) => (v ? h : -1)).filter(h => h >= 0); if (on.length) out[String(d)] = on; });
    return out;
  };
  const dowHoursToGrid = (dh) => {
    const g = emptyGrid();
    if (dh && typeof dh === 'object') Object.entries(dh).forEach(([d, hours]) => { const di = Number(d); if (di >= 0 && di <= 6 && Array.isArray(hours)) hours.forEach(h => { if (h >= 0 && h <= 23) g[di][h] = true; }); });
    return g;
  };
  const toggleCell = (d, h) => setDpForm(f => { const g = f.grid.map(r => r.slice()); g[d][h] = !g[d][h]; return { ...f, grid: g }; });
  const toggleDay = (d) => setDpForm(f => { const g = f.grid.map(r => r.slice()); const allOn = g[d].every(Boolean); g[d] = g[d].map(() => !allOn); return { ...f, grid: g }; });
  const applyPreset = (kind) => setDpForm(f => {
    const g = emptyGrid();
    if (kind === 'business') { for (let d = 1; d <= 5; d++) for (let h = 9; h <= 18; h++) g[d][h] = true; }
    else if (kind === 'all') { for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) g[d][h] = true; }
    return { ...f, grid: g };
  });
  const dpReset = () => setDpForm({ id: 0, name: '', channel: '', tz: 'Asia/Seoul', grid: emptyGrid() });
  const dpEdit = (s) => setDpForm({ id: s.id, name: s.name || '', channel: s.channel || '', tz: s.tz || 'Asia/Seoul', grid: dowHoursToGrid(s.dow_hours) });
  const dpSave = async () => {
    if (!dpForm.name.trim()) { setMsg(tr('errName', '규칙 이름을 입력하세요.')); return; }
    const dow_hours = gridToDowHours(dpForm.grid);
    if (Object.keys(dow_hours).length === 0) { setMsg(tr('dpErrEmpty', '허용 시간대를 하나 이상 선택하세요.')); return; }
    setBusy(true); setMsg('');
    try {
      const body = { name: dpForm.name.trim(), channel: dpForm.channel.trim(), tz: dpForm.tz.trim() || 'Asia/Seoul', dow_hours, enabled: 1 };
      if (dpForm.id > 0) await requestJsonAuth(`/v424/rules/dayparts/${dpForm.id}`, 'PUT', body);
      else await postJsonAuth('/v424/rules/dayparts', body);
      setMsg(tr('dpSaved', '✅ 데이파팅 스케줄이 저장되었습니다.')); dpReset(); await load();
    } catch (e) { setMsg(String(e?.message || e)); } finally { setBusy(false); }
  };
  const dpDelete = async (id) => { if (!window.confirm(tr('dpDelConfirm', '이 스케줄을 삭제하시겠습니까?'))) return; try { await requestJsonAuth(`/v424/rules/dayparts/${id}`, 'DELETE'); if (dpForm.id === id) dpReset(); await load(); } catch (e) { alert(String(e?.message || e)); } };
  const dpRun = async () => { setBusy(true); try { const r = await postJsonAuth('/v424/rules/dayparts/run', {}); setMsg(tr('dpRan', '데이파팅 적용 완료') + (r?.paused != null ? ` — ${tr('dpPaused', '정지')} ${r.paused} · ${tr('dpResumed', '재개')} ${r?.resumed ?? 0}` : '')); await load(); } catch (e) { setMsg(String(e?.message || e)); } finally { setBusy(false); } };
  const dpSummary = (dh) => { if (!dh || typeof dh !== 'object') return '—'; const days = Object.keys(dh).length; const hours = Object.values(dh).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0); return `${days}${tr('dpDays', '일')} · ${hours}${tr('dpHours', '시간')}`; };

  // ── per-user 크로스채널 빈도캡 ────────────────────────────────────────
  const freqReset = () => setFreqForm({ id: 0, name: '', channel: '', daily_cap: '', weekly_cap: '' });
  const freqEdit = (w) => setFreqForm({ id: w.id, name: w.name || '', channel: w.channel || '', daily_cap: w.daily_cap || '', weekly_cap: w.weekly_cap || '' });
  const freqSave = async () => {
    if (!freqForm.name.trim()) { setMsg(tr('errName', '규칙 이름을 입력하세요.')); return; }
    const daily = Number(freqForm.daily_cap) || 0, weekly = Number(freqForm.weekly_cap) || 0;
    if (daily <= 0 && weekly <= 0) { setMsg(tr('freqErrCap', '일 또는 주 캡을 1 이상 입력하세요.')); return; }
    setBusy(true); setMsg('');
    try {
      const body = { name: freqForm.name.trim(), channel: freqForm.channel.trim(), daily_cap: daily, weekly_cap: weekly, enabled: 1 };
      if (freqForm.id > 0) await requestJsonAuth(`/v424/rules/frequency/${freqForm.id}`, 'PUT', body);
      else await postJsonAuth('/v424/rules/frequency', body);
      setMsg(tr('freqSaved', '✅ 빈도 캡이 저장되었습니다.')); freqReset(); await load();
    } catch (e) { setMsg(String(e?.message || e)); } finally { setBusy(false); }
  };
  const freqDelete = async (id) => { if (!window.confirm(tr('freqDelConfirm', '이 빈도 캡을 삭제하시겠습니까?'))) return; try { await requestJsonAuth(`/v424/rules/frequency/${id}`, 'DELETE'); if (freqForm.id === id) freqReset(); await load(); } catch (e) { alert(String(e?.message || e)); } };

  const mLabel = (m) => tr('metric_' + m, ({ channel_roas: '채널 ROAS', channel_spend: '채널 지출', channel_conversions: '채널 전환', sku_stock: 'SKU 재고', low_stock_count: '저재고 SKU 수' })[m] || m);
  const aLabel = (a) => tr('action_' + a, ({ alert: '알림', webhook: '웹훅 발송', pause_channel: '채널 정지', reorder: '발주 신호' })[a] || a);
  const oLabel = (o) => ({ lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=' })[o] || o;

  const kpis = [
    { emoji: '📏', label: tr('kpiActiveRules', '활성 규칙'), val: kpi.active_rules ?? 0 },
    { emoji: '⚡', label: tr('kpiTriggeredToday', '오늘 트리거'), val: kpi.triggered_today ?? 0 },
    { emoji: '✅', label: tr('kpiSuccessRate', '성공률'), val: kpi.success_rate != null ? kpi.success_rate + '%' : '—' },
    { emoji: '🔄', label: tr('kpiTotalRules', '전체 규칙'), val: rules.length },
  ];
  const TABS = [tr('tabRules', '📋 규칙'), tr('tabCreate', '➕ 규칙 생성'), tr('tabExecLog', '📜 실행 로그'), tr('tabDayparts', '⏰ 데이파팅'), tr('tabFrequency', '🔁 빈도 캡')];
  const chLabel = (c) => (c && String(c).trim()) ? c : tr('crossChannel', '전 채널');
  const CARD = { borderRadius: 16, padding: '24px 28px', minHeight: 320, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e5e7eb)' };
  const TH = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3, #64748b)', padding: '10px 12px', borderBottom: '1px solid var(--border, #e5e7eb)', whiteSpace: 'nowrap' };
  const TD = { fontSize: 13, color: 'var(--text-1, #0f172a)', padding: '12px', borderBottom: '1px solid var(--border, #eef1f5)' };
  const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', background: 'var(--surface,#fff)', color: 'var(--text-1,#0f172a)', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const empty = (m, hint) => (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3, #64748b)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🗂️</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2, #475569)' }}>{m}</div>
      {hint && <div style={{ fontSize: 12, marginTop: 6 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #0f172a)" }}>
      <div style={{ borderRadius: 18, padding: "13px 28px", marginBottom: 14, background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(79,142,247,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 32 }}>🧠</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{tr('pageTitle', '🧠 AI 자동화 규칙 엔진')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>{tr('pageSub', '실데이터 조건 평가 → 자동 실행(알림·웹훅·채널정지·발주) · 테넌트 격리')}</div>
          </div>
          <button onClick={runNow} disabled={busy} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'var(--surface,#fff)', color: 'var(--text-1,#0f172a)' }}>⚡ {tr('runNow', '지금 평가')}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "14px 20px", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e5e7eb)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26 }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}><BeginnerGuide spec={GUIDE.aiRuleEngine} /></div>

      <div className="page-subtabs" style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "var(--surface-2, #f1f5f9)", border: "1px solid var(--border, #e5e7eb)", flexWrap: 'wrap' }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '1 1 120px', padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-2, #475569)" }}>{tab}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 13, color: 'var(--text-1,#0f172a)' }}>{msg}</div>}

      <div style={CARD}>
        {/* Tab 0: 규칙 목록 */}
        {activeTab === 0 && (
          rules.length === 0 ? empty(tr('noRules', '생성된 규칙이 없습니다.'), tr('createHint', "'규칙 생성' 탭에서 첫 자동화 규칙을 만드세요.")) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>{tr('ruleName', '규칙 이름')}</th><th style={TH}>{tr('trigger', '트리거')}</th>
                  <th style={TH}>{tr('action', '행동')}</th><th style={TH}>{tr('triggerCount', '트리거 횟수')}</th><th style={TH}>{tr('status', '상태')}</th><th style={TH}></th>
                </tr></thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td style={{ ...TD, fontWeight: 700 }}>{r.name}</td>
                      <td style={TD}><span style={{ fontFamily: 'monospace' }}>{mLabel(r.metric)} {oLabel(r.op)} {r.threshold}{r.target ? ` · ${r.target}` : ''}</span></td>
                      <td style={TD}>{aLabel(r.action)}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>{r.trigger_count || 0}</td>
                      <td style={TD}><button onClick={() => toggle(r.id)} style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, border: 'none', background: r.enabled ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.12)', color: r.enabled ? '#16a34a' : '#64748b' }}>{r.enabled ? tr('active', '활성') : tr('inactive', '비활성')}</button></td>
                      <td style={TD}><button onClick={() => del(r.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 14, color: '#ef4444' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tab 1: 규칙 생성 */}
        {activeTab === 1 && (
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2,#475569)', marginBottom: 18, lineHeight: 1.6 }}>{tr('createDesc', '조건(메트릭·연산자·임계값)과 행동을 정의하면 백엔드가 실데이터로 자동 평가·실행합니다.')}</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('ruleName', '규칙 이름')}</label>
              <input value={form.name} placeholder={tr('ruleNamePh', '예: 저ROAS 채널 알림')} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('metric', '메트릭')}</label>
                <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))} style={inp}>
                  {(meta.metrics.length ? meta.metrics : ['channel_roas', 'channel_spend', 'channel_conversions', 'sku_stock', 'low_stock_count']).map(m => <option key={m} value={m}>{mLabel(m)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('operator', '연산자')}</label>
                <select value={form.op} onChange={e => setForm(f => ({ ...f, op: e.target.value }))} style={inp}>
                  {(meta.ops.length ? meta.ops : ['lt', 'lte', 'gt', 'gte', 'eq']).map(o => <option key={o} value={o}>{oLabel(o)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('threshold', '임계값')}</label>
                <input type="number" value={form.threshold} placeholder="1.5" onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('target', '대상(채널/SKU)')}</label>
                <input value={form.target} placeholder={tr('targetPh', '예: meta, 또는 SKU')} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('action', '행동')}</label>
                <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} style={inp}>
                  {(meta.actions.length ? meta.actions : ['alert', 'webhook', 'pause_channel', 'reorder']).map(a => <option key={a} value={a}>{aLabel(a)}</option>)}
                </select>
              </div>
            </div>
            <button onClick={save} disabled={busy} style={{ marginTop: 8, padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : tr('save', '저장')}</button>
          </div>
        )}

        {/* Tab 2: 실행 로그 */}
        {activeTab === 2 && (
          logs.length === 0 ? empty(tr('noLogs', '실행 로그가 없습니다.'), tr('logsHint', '규칙이 트리거되면 실행 내역이 여기에 기록됩니다.')) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>{tr('execTime', '실행 시각')}</th><th style={TH}>{tr('ruleName', '규칙 이름')}</th><th style={TH}>{tr('observed', '관측값')}</th><th style={TH}>{tr('result', '결과')}</th><th style={TH}>{tr('detail', '상세')}</th>
                </tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td style={{ ...TD, fontFamily: 'monospace', whiteSpace: 'nowrap', fontSize: 11 }}>{(l.created_at || '').replace('T', ' ').slice(0, 16)}</td>
                      <td style={{ ...TD, fontWeight: 700 }}>{l.rule_name}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>{l.observed}</td>
                      <td style={TD}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: l.result === 'ok' ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.12)', color: l.result === 'ok' ? '#16a34a' : '#b45309' }}>{l.result}</span></td>
                      <td style={{ ...TD, fontSize: 11, color: 'var(--text-3,#64748b)' }}>{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {/* Tab 3: 데이파팅 스케줄 */}
        {activeTab === 3 && (
          <div style={{ display: 'grid', gap: 22 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2,#475569)', lineHeight: 1.6 }}>{tr('dpDesc', '요일 × 시간 단위로 광고/메시지 노출 허용 시간대를 정의합니다. 허용 시간대 밖에서는 해당 채널이 자동 정지되고, 시간대 안으로 들어오면 재개됩니다.')}</div>

            {/* 스케줄 목록 */}
            {dayparts.length === 0 ? empty(tr('dpNone', '등록된 데이파팅 스케줄이 없습니다.'), tr('dpNoneHint', '아래에서 첫 스케줄을 만드세요.')) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={TH}>{tr('dpName', '스케줄 이름')}</th><th style={TH}>{tr('channel', '채널')}</th><th style={TH}>{tr('dpCoverage', '허용 범위')}</th><th style={TH}>{tr('dpTz', '타임존')}</th><th style={TH}>{tr('status', '상태')}</th><th style={TH}></th>
                  </tr></thead>
                  <tbody>
                    {dayparts.map((s) => (
                      <tr key={s.id}>
                        <td style={{ ...TD, fontWeight: 700 }}>{s.name}</td>
                        <td style={TD}>{chLabel(s.channel)}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{dpSummary(s.dow_hours)}</td>
                        <td style={{ ...TD, fontSize: 11, color: 'var(--text-3,#64748b)' }}>{s.tz || 'Asia/Seoul'}</td>
                        <td style={TD}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: s.enabled ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.12)', color: s.enabled ? '#16a34a' : '#64748b' }}>{s.enabled ? tr('active', '활성') : tr('inactive', '비활성')}</span></td>
                        <td style={TD}>
                          <button onClick={() => dpEdit(s)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 13, marginRight: 6 }} title={tr('edit', '편집')}>✏️</button>
                          <button onClick={() => dpDelete(s.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 14, color: '#ef4444' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 스케줄 편집기 */}
            <div style={{ borderTop: '1px solid var(--border,#e5e7eb)', paddingTop: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>{dpForm.id > 0 ? tr('dpEditTitle', '스케줄 편집') : tr('dpNewTitle', '새 데이파팅 스케줄')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('dpName', '스케줄 이름')}</label>
                  <input value={dpForm.name} placeholder={tr('dpNamePh', '예: 주중 업무시간 노출')} onChange={e => setDpForm(f => ({ ...f, name: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('channel', '채널')}</label>
                  <input value={dpForm.channel} placeholder={tr('chAllPh', '비우면 전 채널')} onChange={e => setDpForm(f => ({ ...f, channel: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('dpTz', '타임존')}</label>
                  <input value={dpForm.tz} placeholder="Asia/Seoul" onChange={e => setDpForm(f => ({ ...f, tz: e.target.value }))} style={inp} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => applyPreset('business')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'var(--surface,#fff)', color: 'var(--text-2,#475569)' }}>{tr('dpPresetBiz', '주중 업무시간(9–18)')}</button>
                <button onClick={() => applyPreset('all')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'var(--surface,#fff)', color: 'var(--text-2,#475569)' }}>{tr('dpPresetAll', '전체 선택')}</button>
                <button onClick={() => applyPreset('clear')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'var(--surface,#fff)', color: 'var(--text-2,#475569)' }}>{tr('dpPresetClear', '전체 해제')}</button>
                <span style={{ fontSize: 11, color: 'var(--text-3,#64748b)', alignSelf: 'center' }}>{tr('dpGridHint', '셀 클릭=시간 토글 · 요일명 클릭=행 전체 토글')}</span>
              </div>

              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '2px 6px', color: 'var(--text-3,#64748b)', fontWeight: 700 }}></th>
                      {Array.from({ length: 24 }, (_, h) => (
                        <th key={h} style={{ padding: '2px 0', width: 18, textAlign: 'center', color: 'var(--text-3,#64748b)', fontWeight: 600, fontSize: 9 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dowLabels.map((dl, d) => (
                      <tr key={d}>
                        <td onClick={() => toggleDay(d)} style={{ padding: '2px 8px', cursor: 'pointer', fontWeight: 700, color: 'var(--text-2,#475569)', whiteSpace: 'nowrap', userSelect: 'none' }}>{dl}</td>
                        {dpForm.grid[d].map((on, h) => (
                          <td key={h} onClick={() => toggleCell(d, h)} title={`${dl} ${h}:00`}
                            style={{ width: 18, height: 18, cursor: 'pointer', border: '1px solid var(--border,#eef1f5)', background: on ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'var(--surface-2,#f1f5f9)' }} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={dpSave} disabled={busy} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : (dpForm.id > 0 ? tr('update', '수정 저장') : tr('save', '저장'))}</button>
                {dpForm.id > 0 && <button onClick={dpReset} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'var(--surface,#fff)', color: 'var(--text-2,#475569)' }}>{tr('cancel', '취소')}</button>}
                <button onClick={dpRun} disabled={busy} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'var(--surface,#fff)', color: 'var(--text-1,#0f172a)' }}>⚡ {tr('dpRunNow', '지금 적용')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: per-user 크로스채널 빈도 캡 */}
        {activeTab === 4 && (
          <div style={{ display: 'grid', gap: 22 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2,#475569)', lineHeight: 1.6 }}>{tr('freqDesc', '한 사용자에게 노출되는 광고/메시지 접점 수를 일·주 단위로 제한합니다. 채널을 비우면 전 채널 합산(크로스채널) 캡으로 동작합니다.')}</div>

            {freqWins.length === 0 ? empty(tr('freqNone', '등록된 빈도 캡이 없습니다.'), tr('freqNoneHint', '아래에서 첫 빈도 캡을 만드세요.')) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={TH}>{tr('freqName', '캡 이름')}</th><th style={TH}>{tr('channel', '채널')}</th><th style={TH}>{tr('freqDaily', '일 캡')}</th><th style={TH}>{tr('freqWeekly', '주 캡')}</th><th style={TH}>{tr('status', '상태')}</th><th style={TH}></th>
                  </tr></thead>
                  <tbody>
                    {freqWins.map((w) => (
                      <tr key={w.id}>
                        <td style={{ ...TD, fontWeight: 700 }}>{w.name}</td>
                        <td style={TD}>{chLabel(w.channel)}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{w.daily_cap > 0 ? w.daily_cap : '—'}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{w.weekly_cap > 0 ? w.weekly_cap : '—'}</td>
                        <td style={TD}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: w.enabled ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.12)', color: w.enabled ? '#16a34a' : '#64748b' }}>{w.enabled ? tr('active', '활성') : tr('inactive', '비활성')}</span></td>
                        <td style={TD}>
                          <button onClick={() => freqEdit(w)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 13, marginRight: 6 }} title={tr('edit', '편집')}>✏️</button>
                          <button onClick={() => freqDelete(w.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 14, color: '#ef4444' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border,#e5e7eb)', paddingTop: 18, maxWidth: 620 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>{freqForm.id > 0 ? tr('freqEditTitle', '빈도 캡 편집') : tr('freqNewTitle', '새 빈도 캡')}</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('freqName', '캡 이름')}</label>
                <input value={freqForm.name} placeholder={tr('freqNamePh', '예: 크로스채널 하루 3회 제한')} onChange={e => setFreqForm(f => ({ ...f, name: e.target.value }))} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('channel', '채널')}</label>
                  <input value={freqForm.channel} placeholder={tr('chCrossPh', '비우면 크로스채널')} onChange={e => setFreqForm(f => ({ ...f, channel: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('freqDaily', '일 캡')}</label>
                  <input type="number" min="0" value={freqForm.daily_cap} placeholder="3" onChange={e => setFreqForm(f => ({ ...f, daily_cap: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{tr('freqWeekly', '주 캡')}</label>
                  <input type="number" min="0" value={freqForm.weekly_cap} placeholder="10" onChange={e => setFreqForm(f => ({ ...f, weekly_cap: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={freqSave} disabled={busy} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : (freqForm.id > 0 ? tr('update', '수정 저장') : tr('save', '저장'))}</button>
                {freqForm.id > 0 && <button onClick={freqReset} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'var(--surface,#fff)', color: 'var(--text-2,#475569)' }}>{tr('cancel', '취소')}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
