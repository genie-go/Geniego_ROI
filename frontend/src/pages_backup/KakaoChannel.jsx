import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import { useI18n } from '../i18n';
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import CreativeStudioTab from "./CreativeStudioTab.jsx";
import { useNavigate } from "react-router-dom";

const APIF = (path, opts = {}) =>
    fetch(`/api${path}`, { headers: { "Content-Type": "application/json", ...opts.headers }, ...opts }).then(r => r.json());

const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    border: "var(--border)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    kakao: "#fee500", kakaoText: "#3c1e1e",
    purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
};

const INPUT = {
    width: "100%", padding: "9px 13px", borderRadius: 8,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.text, boxSizing: "border-box", fontSize: 13,
};

/* ── Currency Format ──────────────────────────────────────────────────────── */
function useCurrencyFmt() {
  try {
    const { currency, exchangeRates } = useGlobalData();
    return useCallback((krw) => {
      if (!krw && krw !== 0) return '-';
      const cur = currency || 'KRW';
      const rate = exchangeRates?.[cur] || 1;
      const converted = krw * rate;
      const sym = { KRW:'₩', USD:'$', EUR:'€', JPY:'¥', CNY:'¥', GBP:'£', THB:'฿', VND:'₫', IDR:'Rp' }[cur] || cur+' ';
      if (['KRW','JPY'].includes(cur)) return `${sym}${Math.round(converted).toLocaleString()}`;
      return `${sym}${converted.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})}`;
    }, [currency, exchangeRates]);
  } catch { return v => `₩${Math.round(v||0).toLocaleString()}`; }
}

/* ── CSV Export ───────────────────────────────────────────────────────────── */
function downloadCsv(headers, rows, filename) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Connected Channels Badge ─────────────────────────────────────────────── */
function ChannelBadge({ t }) {
  const sync = useConnectorSync();
  const navigate = useNavigate();
  const raw = sync?.connectedChannels || {};
  const allChannels = Array.isArray(raw) ? raw : Object.entries(raw).filter(([,v]) => v).map(([k]) => ({ key: k, platform: k }));
  const kakaoChannels = allChannels.filter(ch => (ch.platform || ch.key || '').toLowerCase().includes('kakao'));
  if (!kakaoChannels.length) {
    return (
      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.2)',fontSize:11,marginBottom:14 }}>
        <span>⚠️</span>
        <span style={{ color:'#eab308',fontWeight:600 }}>{t('kakao.noChannels')}</span>
        <button onClick={() => navigate('/integration-hub')} style={{ marginLeft:'auto',padding:'4px 10px',borderRadius:6,border:'none',background:'linear-gradient(135deg,#fee500,#eab308)',color:'#3c1e1e',fontSize:10,fontWeight:700,cursor:'pointer' }}>{t('kakao.goHub')}</button>
    </div>
);
  }
  return (
    <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',padding:'6px 10px',borderRadius:10,background:'rgba(254,229,0,0.06)',border:'1px solid rgba(254,229,0,0.15)',fontSize:10,marginBottom:14 }}>
      <span style={{ fontWeight:700,color:'#eab308',fontSize:11 }}>🔗 {t('kakao.connectedChannels')}:</span>
      {kakaoChannels.map(ch => (
        <span key={ch.key||ch.platform} style={{ background:'rgba(254,229,0,0.15)',color:'#eab308',border:'1px solid rgba(254,229,0,0.25)',borderRadius:6,padding:'1px 7px',fontSize:9,fontWeight:700 }}>{ch.platform||ch.key}</span>
      ))}
    </div>
);
}

/* ── Security Lock Modal ──────────────────────────────────────────────────── */
function SecurityLockModal({ t, onDismiss }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'linear-gradient(135deg,#1a0a0a,#2a0a0a)',border:'1px solid rgba(239,68,68,0.5)',borderRadius:20,padding:32,maxWidth:380,textAlign:'center',boxShadow:'0 24px 64px rgba(239,68,68,0.2)' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>🛡️</div>
        <div style={{ fontWeight:900,fontSize:18,color:'#ef4444',marginBottom:8 }}>{t('kakao.secLockTitle')}</div>
        <div style={{ fontSize:13,color: 'var(--text-3)',lineHeight:1.7,marginBottom:20 }}>{t('kakao.secLockDesc')}</div>
        <button onClick={onDismiss} style={{ padding:'9px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#ef4444,#dc2626)',color: 'var(--text-1)',fontWeight:800,fontSize:13,cursor:'pointer' }}>{t('kakao.dismiss')}</button>
        </div>
    </div>
);
}

/* ── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 22px" }}>
      <div style={{ fontSize:22,marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:24,fontWeight:800,color:color||C.accent }}>{value}</div>
      <div style={{ fontSize:13,fontWeight:600,color:C.text,marginTop:2 }}>{label}
        </div>
    </div>
);
}

/* ─── Settings Tab ──────────────────────────────────── */
function SettingsTab({ API }) {
    const { t } = useI18n();
    const [settings, setSettings] = useState({
        sender_key: "", api_key: "", channel_id: "",
        channel_name: "",
    });
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        API("/kakao/settings").then(r => { if (r.ok && r.settings) setSettings(s => ({ ...s, ...r.settings })); }).catch(() => {});
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const r = await API("/kakao/settings", { method: "PUT", body: JSON.stringify(settings) });
            setSaving(false);
            setMsg(r.ok ? t('kakao.msgSaveDone') : `${t('kakao.msgSaveFail')} ${r.error || ''}`);
        } catch (e) { setSaving(false); setMsg(t('kakao.errGeneral')); }
    };

    return (
        <div style={{ maxWidth: 640 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{t('kakao.setTit')}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{t('kakao.setDesc')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                        [t('kakao.fName'), "channel_name", t('kakao.pName')],
                        [t('kakao.fId'), "channel_id", t('kakao.pId')],
                        [t('kakao.fSender'), "sender_key", t('kakao.pSender')],
                        [t('kakao.fApi'), "api_key", t('kakao.pApi')],
                    ].map(([label, key, placeholder]) => (
                        </div>
                    ))}
                </div>
                {msg && <div style={{ marginTop: 14, fontSize: 13, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                <button onClick={save} disabled={saving} style={{ marginTop: 18, padding: "10px 24px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                    {saving ? t('kakao.btnSaving') : t('kakao.btnSave')}
                </button>
            </div>
        </div>
    );
}

/* ─── Templates Tab ──────────────────────────────────── */
function TemplatesTab({ API }) {
    const { t } = useI18n();
    const [templates, setTemplates] = useState([]);
    const [form, setForm] = useState({ template_code: "", name: "", content: "", msg_type: "AT", buttons: [] });
    const [test, setTest] = useState({ phone: "", name: "" });
    const [testResult, setTestResult] = useState(null);
    const [msg, setMsg] = useState("");
    const [testingCode, setTestingCode] = useState(null);

    const load = () => API("/kakao/templates").then(r => r.ok && setTemplates(r.templates || [])).catch(() => {});
    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.template_code || !form.name || !form.content) { setMsg(t('kakao.msgTplReq')); return; }
        try {
            const r = await API("/kakao/templates", { method: "POST", body: JSON.stringify(form) });
            if (r.ok) { setMsg(t('kakao.msgSaveDone')); setForm({ template_code: "", name: "", content: "", msg_type: "AT", buttons: [] }); load(); }
            else setMsg("❌ " + (r.error || t('kakao.errGeneral')));
        } catch { setMsg(t('kakao.errGeneral')); }
    };

    const doTest = async (code) => {
        if (!test.phone) { alert(t('kakao.msgTestPhone')); return; }
        setTestingCode(code);
        try {
            const r = await API(`/kakao/templates/${code}/test`, { method: "POST", body: JSON.stringify({ phone: test.phone, name: test.name }) });
            setTestingCode(null); setTestResult(r);
        } catch { setTestingCode(null); setTestResult({ ok: false, error: t('kakao.errGeneral') }); }
    };

    const del = async (id) => {
        if (!confirm(t('kakao.btnDelConfirm'))) return;
        await API(`/kakao/templates/${id}`, { method: "DELETE" }).catch(() => {}); load();
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('kakao.tplRegTit')}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTplCode')}</div>
                    <input value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} placeholder={t('kakao.pTplCode')} style={INPUT} /></div>
                    <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTplName')}</div>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('kakao.pTplName')} style={INPUT} /></div>
                    <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fMsgType')}</div>
                    <select value={form.msg_type} onChange={e => setForm(f => ({ ...f, msg_type: e.target.value }))} style={INPUT}>
                        <option value="AT">{t('kakao.optAt')}</option><option value="FT">{t('kakao.optFt')}</option>
                    </select></div>
                    <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fContent')}</div>
                    <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder={t('kakao.pContent')} style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }} /></div>
                    {msg && <div style={{ fontSize: 12, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                    <button onClick={save} style={{ padding: "10px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>{t('kakao.btnTplSave')}</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t('kakao.testTit')}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <input value={test.phone} onChange={e => setTest(x => ({ ...x, phone: e.target.value }))} placeholder={t('kakao.pPhone')} style={{ ...INPUT, flex: 1 }} />
                        <input value={test.name} onChange={e => setTest(x => ({ ...x, name: e.target.value }))} placeholder={t('kakao.pCustName')} style={{ ...INPUT, width: 100, flex: "none" }} />
                    {testResult && (
                        <div style={{ marginTop: 10, background: testResult.ok ? "#22c55e11" : "#f8717111", border: `1px solid ${testResult.ok ? "#22c55e33" : "#f8717133"}`, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                            {testResult.ok ? (<>
                                <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>✅ {testResult.message || t('kakao.msgTestDone')}</div>
                                {testResult.content && <div style={{ color: C.muted }}>📋 {t('kakao.lblContent')} {testResult.content?.slice(0, 80)}...</div>}
                            </>) : (<div style={{ color: C.red }}>❌ {testResult.error || t('kakao.errGeneral')}</div>)}
                    )}
                {templates.map(tpl => (
                    <div key={tpl.id} style={{ background: C.card, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{t('kakao.lblCode')} {tpl.template_code} · {t('kakao.lblType')} {tpl.msg_type}</div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => doTest(tpl.template_code)} disabled={testingCode === tpl.template_code} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                    {testingCode === tpl.template_code ? t('kakao.testBtnIng') : t('kakao.testBtn')}
                                </button>
                                <button onClick={() => del(tpl.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#f8717122", color: C.red, cursor: "pointer", fontSize: 12 }}>{t('kakao.testBtnDel')}</button>
                        </div>
                        <div style={{ fontSize: 12, background: C.surface, borderRadius: 8, padding: "8px 12px", color: C.muted, whiteSpace: "pre-line", maxHeight: 80, overflow: "hidden" }}>{tpl.content}</div>
                ))}
                {templates.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t('kakao.emptyTpl')}</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Campaign Tab ─────────────────────────────────── */
function CampaignsTab({ API, campaigns, setCampaigns, fmt }) {
    const { t } = useI18n();
    const [templates, setTemplates] = useState([]);
    const [segments, setSegments] = useState([]);
    const [form, setForm] = useState({ name: "", template_code: "", segment_id: "" });
    const [sending, setSending] = useState(null);
    const [msg, setMsg] = useState("");

    const load = () => {
        API("/kakao/campaigns").then(r => r.ok && setCampaigns(r.campaigns || [])).catch(() => {});
        API("/kakao/templates").then(r => r.ok && setTemplates(r.templates || [])).catch(() => {});
        API("/crm/segments").then(r => r.ok && setSegments(r.segments || [])).catch(() => {});
    };
    useEffect(() => { load(); }, []);

    const create = async () => {
        try {
            const r = await API("/kakao/campaigns", { method: "POST", body: JSON.stringify(form) });
            if (r.ok) { setMsg(t('kakao.msgCampDone')); setForm({ name: "", template_code: "", segment_id: "" }); load(); }
            else setMsg("❌ " + (r.error || t('kakao.errGeneral')));
        } catch { setMsg(t('kakao.errGeneral')); }
    };

    const send = async (id) => {
        if (!confirm(t('kakao.msgSendConfirm'))) return;
        setSending(id);
        try {
            const r = await API(`/kakao/campaigns/${id}/send`, { method: "POST" });
            setSending(null);
            if (r.ok) { setMsg(`✅ ${t('kakao.msgSendSucc')} ${r.success || 0}, ${t('kakao.msgSendFail2')}${r.failed || 0})`); load(); }
            else setMsg(t('kakao.msgSendFailT'));
        } catch { setSending(null); setMsg(t('kakao.errGeneral')); }
    };

    const delCamp = async (id) => {
        if (!confirm(t('kakao.delConfirm'))) return;
        await API(`/kakao/campaigns/${id}`, { method: "DELETE" }).catch(() => {}); load();
    };

    const handleExport = () => {
        const headers = [t('kakao.colName'), t('kakao.colTpl'), t('kakao.colTarget'), t('kakao.colSendCnt'), t('kakao.colSucc'), t('kakao.colFail'), t('kakao.colStat')];
        const rows = campaigns.map(c => [c.name, c.template_name || c.template_code || '-', c.segment_name || t('kakao.valAll'), c.total || 0, c.success || 0, c.failed || 0, c.status]);
        downloadCsv(headers, rows, `kakao_campaigns_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const STATUS_COLOR = { draft: C.muted, sent: C.green, scheduled: C.yellow };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>{t('kakao.campNew')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fCampName')}</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fCampTpl')}</div>
                        <select value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} style={INPUT}>
                            <option value="">{t('kakao.optSel')}</option>
                            {templates.map(tpl => <option key={tpl.id} value={tpl.template_code}>{tpl.name}</option>)}
                        </select>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTarget')}</div>
                        <select value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: e.target.value }))} style={INPUT}>
                            <option value="">{t('kakao.optAll')}</option>
                        </select>
                    </div>
                </div>
                {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={create} disabled={!form.name} style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>{t('kakao.btnCampCreate')}</button>
                    <button onClick={handleExport} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📥 {t('kakao.exportCsv')}</button>
                </div>
            </div>

            <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{t('kakao.campStat')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ background: "var(--surface)" }}>
                        {[t('kakao.colName'), t('kakao.colTpl'), t('kakao.colTarget'), t('kakao.colSendCnt'), t('kakao.colSucc'), t('kakao.colFail'), t('kakao.colStat'), t('kakao.colAction')].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>
                        {campaigns.map((c, i) => (
                            <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "var(--surface)" : "transparent" }}>
                                <td style={{ padding: "10px 16px", fontWeight: 600 }}>{c.name}</td>
                                <td style={{ padding: "10px 16px", color: C.muted }}>{c.template_name || c.template_code || "-"}</td>
                                <td style={{ padding: "10px 16px", color: C.muted }}>{c.segment_name || t('kakao.valAll')}</td>
                                <td style={{ padding: "10px 16px" }}>{c.total?.toLocaleString() || 0}</td>
                                <td style={{ padding: "10px 16px", color: C.green }}>{c.success || 0}</td>
                                <td style={{ padding: "10px 16px", color: C.red }}>{c.failed || 0}</td>
                                <td style={{ padding: "10px 16px" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[c.status] || C.muted }}>● {c.status || 'draft'}</span>
                                </td>
                                <td style={{ padding: "10px 16px" }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {c.status !== "sent" && (
                                            <button onClick={() => send(c.id)} disabled={sending === c.id} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: sending === c.id ? C.surface : C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                                {sending === c.id ? t('kakao.btnSending') : t('kakao.btnSend')}
                                            </button>
                                        )}
                                        <button onClick={() => delCamp(c.id)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "#f8717122", color: C.red, cursor: "pointer", fontSize: 12 }}>{t('kakao.btnDel')}</button>
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: C.muted }}>{t('kakao.emptyCamp')}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─── Guide Tab ──────────────────────────────────────── */
function GuideTab() {
    const { t } = useI18n();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(254,229,0,0.12),rgba(60,30,30,0.08))', border: '1px solid rgba(254,229,0,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 44 }}>💬</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('kakao.guideTitle')}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 700, margin: '6px auto 0', lineHeight: 1.7 }}>{t('kakao.guideSub')}</div>
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('kakao.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                    {[{n:'1️⃣',k:'guideStep1',c:'#fee500'},{n:'2️⃣',k:'guideStep2',c:'#4f8ef7'},{n:'3️⃣',k:'guideStep3',c:'#22c55e'},{n:'4️⃣',k:'guideStep4',c:'#a78bfa'},{n:'5️⃣',k:'guideStep5',c:'#f97316'},{n:'6️⃣',k:'guideStep6',c:'#06b6d4'}].map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.n}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`kakao.${s.k}Title`)}</span>
                            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{t(`kakao.${s.k}Desc`)}</div>
                    ))}
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('kakao.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                    {[{icon:'📢',k:'guideCamp',c:'#fee500'},{icon:'📄',k:'guideTpl',c:'#4f8ef7'},{icon:'⚙️',k:'guideSet',c:'#22c55e'},{icon:'🎨',k:'guideCreative',c:'#a855f7'}].map((tb,i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`kakao.${tb.k}Name`)}</div>
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.6 }}>{t(`kakao.${tb.k}Desc`)}</div>
                        </div>
                    ))}
            </div>
            <div style={{ background: 'rgba(254,229,0,0.04)', border: '1px solid rgba(254,229,0,0.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('kakao.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: C.muted, lineHeight: 2.2 }}>
                    {[1,2,3,4,5].map(i => <li key={i}>{t(`kakao.guideTip${i}`)}</li>)}
                </ul>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN KAKAO CHANNEL CONTENT
   ══════════════════════════════════════════════════════════════════════════════ */
function KakaoChannelContent() {
    const { token } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();
    const fmt = useCurrencyFmt();

    const { addAlert, broadcastUpdate } = useGlobalData();
    const [secLocked, setSecLocked] = useState(false);
    useSecurityGuard({
        addAlert: useCallback((a) => {
            if (typeof addAlert === 'function') addAlert(a);
            if (a?.severity === 'critical') setSecLocked(true);
        }, [addAlert]),
        enabled: true,
    });

    /* BroadcastChannel */
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            bcRef.current = new BroadcastChannel('geniego_kakao');
            bcRef.current.onmessage = () => {};
        } catch {}
        return () => { try { bcRef.current?.close(); } catch {} };
    }, []);
    const broadcastRefresh = useCallback(() => {
        try { bcRef.current?.postMessage({ type: 'KAKAO_REFRESH', ts: Date.now() }); } catch {}
        if (typeof broadcastUpdate === 'function') broadcastUpdate('kakao', { refreshed: Date.now() });
    }, [broadcastUpdate]);

    const authorizedAPI = useCallback((path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return APIF(path, { ...opts, headers });
    }, [token]);

    const [tab, setTab] = useState("campaigns");
    const [campaigns, setCampaigns] = useState([]);

    const stats = useMemo(() => {
        const total = campaigns.length;
        const sent = campaigns.reduce((s, c) => s + (c.total || 0), 0);
        const succ = campaigns.reduce((s, c) => s + (c.success || 0), 0);
        const fail = campaigns.reduce((s, c) => s + (c.failed || 0), 0);
        return { total, sent, succ, fail };
    }, [campaigns]);

    const TABS = [
        { id: "campaigns", label: t('kakao.tabCamp') },
        { id: "templates", label: t('kakao.tabTpl') },
        { id: "creative", label: t('kakao.tabCreative') },
        { id: "settings", label: t('kakao.tabSet') },
        { id: "guide", label: t('kakao.tabGuide') },
    ];

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            {secLocked && <SecurityLockModal t={t} onDismiss={() => setSecLocked(false)} />}
            <AIRecommendBanner context="kakao" />
            <ChannelBadge t={t} />

            {/* Live Sync */}
            <div style={{ padding:'6px 12px',borderRadius:8,background:'rgba(254,229,0,0.04)',border:'1px solid rgba(254,229,0,0.12)',fontSize:10,color:'#eab308',fontWeight:600,display:'flex',alignItems:'center',gap:6,marginBottom:14 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                {t('kakao.liveSyncStatus')}
            </div>

            {/* Hero */}
            <div className="page-hero" style={{ borderRadius:16,background:`linear-gradient(135deg, var(--surface), var(--bg))`,border:`1px solid ${C.border}`,padding:"22px 28px",marginBottom:20 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                        <span style={{ background:C.kakao,color:C.kakaoText,borderRadius:8,padding:"6px 12px",fontSize:18,fontWeight:900 }}>💬</span>
                        <div>
                            <div style={{ fontSize:22,fontWeight:800 }}>{t('kakao.title')}</div>
                            <div style={{ fontSize:13,color:C.muted,marginTop:4 }}>{t('kakao.subTitle')}</div>
                        </div>
                    </div>
                    <button onClick={broadcastRefresh} style={{ padding:'8px 14px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontWeight:700,fontSize:11,cursor:'pointer' }}>🔄 {t('kakao.syncNow')}</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20 }}>
                <StatCard icon="📢" label={t('kakao.statCamp')} value={stats.total} color={C.accent} />
                <StatCard icon="📤" label={t('kakao.statSent')} value={stats.sent.toLocaleString()} color={C.kakao.replace('#fee500','#eab308')} />
                <StatCard icon="✅" label={t('kakao.statSucc')} value={stats.succ.toLocaleString()} color={C.green} />
                <StatCard icon="❌" label={t('kakao.statFail')} value={stats.fail.toLocaleString()} color={C.red} />
            </div>

            {/* Tabs */}
            <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:'wrap' }}>
                {TABS.map(T => (
                    <button key={T.id} onClick={() => setTab(T.id)} style={{
                        padding:"9px 18px",borderRadius:10,border:"none",cursor:"pointer",
                        background:tab === T.id ? C.kakao : C.card,
                        color:tab === T.id ? C.kakaoText : C.muted,fontWeight:700,fontSize:13,
                    }}>{T.label}</button>
                ))}
            </div>

            {tab === "campaigns" && <CampaignsTab API={authorizedAPI} campaigns={campaigns} setCampaigns={setCampaigns} fmt={fmt} />}
            {tab === "templates" && <TemplatesTab API={authorizedAPI} />}
            {tab === "creative" && <CreativeStudioTab sourcePage="kakao-channel" />}
            {tab === "settings" && <SettingsTab API={authorizedAPI} />}
            {tab === "guide" && <GuideTab />}
        </div>
    );
}

export default function KakaoChannel() {
    return (
<PlanGate feature="kakao_channel">
            <KakaoChannelContent />
        </PlanGate>
    );
}
