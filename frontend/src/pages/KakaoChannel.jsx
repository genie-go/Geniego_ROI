import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
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

// 179차 — 데모 환경: 가상 카카오 캠페인/템플릿(체험용). 판별은 정본(demoEnv) 사용.
import { IS_DEMO as _IS_DEMO } from '../utils/demoEnv.js';
const DEMO_KC_TEMPLATES = [
  { id: 1, code: 'TPL_VIP_NOTI', name: 'VIP 전용 알림톡', status: 'approved', content: '[GenieGo] {고객명}님, VIP 전용 혜택이 도착했어요 🎁' },
  { id: 2, code: 'TPL_SPRING',   name: '봄 프로모션 친구톡', status: 'approved', content: '봄맞이 최대 40% 할인! 지금 확인하기 🌸' },
  { id: 3, code: 'TPL_CART',     name: '장바구니 리마인드', status: 'approved', content: '{고객명}님, 담아두신 상품이 품절되기 전에 확인하세요!' },
];
const _TPL_LABEL = { alimtalk: '알림톡', friendtalk: '친구톡', bizboard: '비즈보드', marketing: '마케팅' };
// 공유 kakaoCampaignsLinked({id,name,type,status,sent,estimatedReach,targetSegmentName,...}) → 테이블 표시 shape.
// 원본 shape는 보존(LINEChannel/JourneyBuilder가 c.type 사용) — 표시 전용 파생.
function mapKakaoForTable(list) {
  return (Array.isArray(list) ? list : []).map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    template_name: c.template_name || _TPL_LABEL[c.type] || c.type || '-',
    template_code: c.template_code || c.type,
    segment_name: c.segment_name || c.targetSegmentName || '-',
    total: c.total ?? c.estimatedReach ?? c.sent ?? 0,
    success: c.success ?? c.sent ?? 0,
    failed: c.failed ?? Math.max(0, (c.estimatedReach ?? 0) - (c.sent ?? 0)),
  }));
}

const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    border: "var(--border)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    kakao: "#fee500", kakaoText: "#3c1e1e",
    purple: "#a78bfa", muted: "var(--text-3, #6b7280)", text: "var(--text-1, #1e293b)",
};

const INPUT = {
    width: "100%", padding: "9px 13px", borderRadius: 8,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.text, boxSizing: "border-box", fontSize: 13,
};

/* ── Currency Format ──────────────────────────────────────────────────────── */
function useCurrencyFmt() {
  try {
    const { currency, exchangeRates, isDemo } = useGlobalData();
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
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', fontSize:11, marginBottom:14 }}>
        <span>⚠️</span>
        <span style={{ color:'#eab308', fontWeight:600 }}>{t('kakao.noChannels')}</span>
        <button onClick={() => navigate('/integration-hub')} style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:6, border:'none', background:'#eab308', color:'#3c1e1e', fontSize:10, fontWeight:700, cursor:'pointer' }}>{t('kakao.goHub')}</button>
    </div>
);
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', padding:'6px 10px', borderRadius:10, background:'rgba(254,229,0,0.06)', border:'1px solid rgba(254,229,0,0.15)', fontSize:10, marginBottom:14 }}>
      <span style={{ fontWeight:700, color:'#eab308', fontSize:11 }}>🔗 {t('kakao.connectedChannels')}:</span>
      {kakaoChannels.map(ch => (
        <span key={ch.key||ch.platform} style={{ background:'rgba(254,229,0,0.15)', color:'#eab308', border:'1px solid rgba(254,229,0,0.25)', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700 }}>{ch.platform||ch.key}</span>
      ))}
    </div>
);
}

/* ── Security Lock Modal ──────────────────────────────────────────────────── */
function SecurityLockModal({ t, onDismiss }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'linear-gradient(135deg,#1a0a0a,#2a0a0a)', border:'1px solid rgba(239,68,68,0.5)', borderRadius:20, padding:32, maxWidth:380, textAlign:'center', boxShadow:'0 24px 64px rgba(239,68,68,0.2)' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🛡️</div>
        <div style={{ fontWeight:900, fontSize:18, color:'#ef4444', marginBottom:8 }}>{t('kakao.secLockTitle')}</div>
        <div style={{ fontSize:13, color:'#d1d5db', lineHeight:1.7, marginBottom:20 }}>{t('kakao.secLockDesc')}</div>
        <button onClick={onDismiss} style={{ padding:'9px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>{t('kakao.dismiss')}</button>
        </div>
    </div>
);
}

/* ── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 22px" }}>
      <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:24, fontWeight:800, color:color||C.accent }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginTop:2, letterSpacing:'-0.01em' }}>{label}
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
                        <div key={key}>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                            <input value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} style={INPUT} />
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

    const load = () => {
        if (_IS_DEMO) { setTemplates(DEMO_KC_TEMPLATES); return; }
        API("/kakao/templates").then(r => r.ok && setTemplates(r.templates || [])).catch(() => {});
    };
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
            {/* Left: Registration Form */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('kakao.tplRegTit')}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTplCode')}</div>
                        <input value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} placeholder={t('kakao.pTplCode')} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTplName')}</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('kakao.pTplName')} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fMsgType')}</div>
                        <select value={form.msg_type} onChange={e => setForm(f => ({ ...f, msg_type: e.target.value }))} style={INPUT}>
                            <option value="AT">{t('kakao.optAt')}</option>
                            <option value="FT">{t('kakao.optFt')}</option>
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fContent')}</div>
                        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder={t('kakao.pContent')} style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }} />
                    </div>
                    {msg && <div style={{ fontSize: 12, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                    <button onClick={save} style={{ padding: "10px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>{t('kakao.btnTplSave')}</button>
                </div>
            </div>

            {/* Right: Test + Template List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Test Send Panel */}
                <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t('kakao.testTit')}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <input value={test.phone} onChange={e => setTest(x => ({ ...x, phone: e.target.value }))} placeholder={t('kakao.pPhone')} style={{ ...INPUT, flex: 1 }} />
                        <input value={test.name} onChange={e => setTest(x => ({ ...x, name: e.target.value }))} placeholder={t('kakao.pCustName')} style={{ ...INPUT, width: 100, flex: "none" }} />
                    </div>
                    {testResult && (
                        <div style={{ marginTop: 10, background: testResult.ok ? "#22c55e11" : "#f8717111", border: `1px solid ${testResult.ok ? "#22c55e33" : "#f8717133"}`, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                            {testResult.ok ? (<>
                                <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>✅ {testResult.message || t('kakao.msgTestDone')}</div>
                                {testResult.content && <div style={{ color: C.muted }}>📋 {t('kakao.lblContent')} {testResult.content?.slice(0, 80)}...</div>}
                            </>) : (<div style={{ color: C.red }}>❌ {testResult.error || t('kakao.errGeneral')}</div>)}
                        </div>
                    )}
                </div>

                {/* Template List */}
                {templates.map(tpl => (
                    <div key={tpl.id} style={{ background: C.card, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{t('kakao.lblCode')} {tpl.template_code} · {t('kakao.lblType')} {tpl.msg_type}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => doTest(tpl.template_code)} disabled={testingCode === tpl.template_code} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                    {testingCode === tpl.template_code ? t('kakao.testBtnIng') : t('kakao.testBtn')}
                                </button>
                                <button onClick={() => del(tpl.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#f8717122", color: C.red, cursor: "pointer", fontSize: 12 }}>{t('kakao.testBtnDel')}</button>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, background: C.surface, borderRadius: 8, padding: "8px 12px", color: C.muted, whiteSpace: "pre-line", maxHeight: 80, overflow: "hidden" }}>{tpl.content}</div>
                    </div>
                ))}
                {templates.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t('kakao.emptyTpl')}</div>}
            </div>
        </div>
    );
}

/* ─── Campaign Tab ─────────────────────────────────── */
function CampaignsTab({ API, campaigns, setCampaigns, fmt }) {
    const { t } = useI18n();
    // 데모: 공유 상태 read/write (생성·발송·삭제가 대시보드·CRM에 라이브 반영)
    const { addKakaoCampaign, deleteKakaoCampaign, updateKakaoCampaign, crmSegments } = useGlobalData();
    const [templates, setTemplates] = useState([]);
    const [segments, setSegments] = useState([]);
    const [form, setForm] = useState({ name: "", template_code: "", segment_id: "" });
    const [sending, setSending] = useState(null);
    const [msg, setMsg] = useState("");

    const load = () => {
        if (_IS_DEMO) {
            // 데모: 캠페인은 부모가 공유 kakaoCampaignsLinked에서 라이브 파생 → 여기선 템플릿/세그먼트만 시드
            setTemplates(DEMO_KC_TEMPLATES);
            setSegments(Array.isArray(crmSegments) && crmSegments.length
                ? crmSegments.map(s => ({ id: s.id, name: s.name }))
                : [{ id: 'seg-vip', name: 'VIP 고객' }, { id: 'seg-loyal', name: '충성 고객' }, { id: 'seg-churn', name: '최근 이탈자' }, { id: 'seg-new', name: '신규 가입' }]);
            return;
        }
        API("/kakao/campaigns").then(r => r.ok && setCampaigns(r.campaigns || [])).catch(() => {});
        API("/kakao/templates").then(r => r.ok && setTemplates(r.templates || [])).catch(() => {});
        API("/crm/segments").then(r => r.ok && setSegments(r.segments || [])).catch(() => {});
    };
    useEffect(() => { load(); }, [crmSegments]);

    const create = async () => {
        if (_IS_DEMO) {
            // 라이브 생성 → 공유 상태 갱신 → 대시보드/CRM 동시 반영
            const tpl = templates.find(x => x.template_code === form.template_code || x.code === form.template_code);
            const seg = segments.find(s => s.id === form.segment_id);
            addKakaoCampaign({
                name: form.name,
                type: form.template_code && form.template_code.includes('FRIEND') ? 'friendtalk' : 'alimtalk',
                template_name: tpl?.name, template_code: form.template_code,
                targetSegmentId: seg?.id, targetSegmentName: seg?.name,
                estimatedReach: seg ? 1000 : 0, status: 'draft',
            });
            setMsg(t('kakao.msgCampDone')); setForm({ name: "", template_code: "", segment_id: "" });
            return;
        }
        try {
            const r = await API("/kakao/campaigns", { method: "POST", body: JSON.stringify(form) });
            if (r.ok) { setMsg(t('kakao.msgCampDone')); setForm({ name: "", template_code: "", segment_id: "" }); load(); }
            else setMsg("❌ " + (r.error || t('kakao.errGeneral')));
        } catch { setMsg(t('kakao.errGeneral')); }
    };

    const send = async (id) => {
        if (!confirm(t('kakao.msgSendConfirm'))) return;
        if (_IS_DEMO) {
            // 라이브 발송 시뮬레이션 → status/sent 갱신 → 통계 카드 즉시 반영
            const c = (campaigns || []).find(x => x.id === id);
            const reach = c?.total || 1000;
            const succ = Math.round(reach * 0.94);
            updateKakaoCampaign(id, { status: 'sent', sent: succ, success: succ, failed: reach - succ, total: reach });
            setMsg(`✅ ${t('kakao.msgSendSucc')} ${succ}, ${t('kakao.msgSendFail2')}${reach - succ})`);
            return;
        }
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
        if (_IS_DEMO) { deleteKakaoCampaign(id); return; } // 라이브 삭제 → 공유 상태 반영
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
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fCampTpl')}</div>
                        <select value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} style={INPUT}>
                            <option value="">{t('kakao.optSel')}</option>
                            {templates.map(tpl => <option key={tpl.id} value={tpl.template_code}>{tpl.name}</option>)}
                        </select>
                    </div>
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
                    <thead><tr style={{ background: 'var(--surface)' }}>
                        {[t('kakao.colName'), t('kakao.colTpl'), t('kakao.colTarget'), t('kakao.colSendCnt'), t('kakao.colSucc'), t('kakao.colFail'), t('kakao.colStat'), t('kakao.colAction')].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>
                        {campaigns.map((c, i) => (
                            <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? 'var(--surface)' : 'transparent' }}>
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
                                    </div>
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
    // 184차 #5: enterprise 패턴 렌더러(CRM/OmniChannel/PriceOpt 정본 동일, NS=kakao).
    const { t } = useI18n();
    const g = (k) => { const v = t('kakao.' + k, ''); return (v && !String(v).includes('kakao.')) ? v : ''; };
    const COLORS = ['#fee500','#4f8ef7','#22c55e','#f59e0b','#a855f7','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48'];
    const ICONS = ['🔗','🪪','📝','✅','💌','🎯','🛡️','🚀','🎨','📡','📈','🔐'];
    const steps = [];
    for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[(i - 1) % ICONS.length], color: COLORS[(i - 1) % COLORS.length], n: i }); }
    const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
    const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
    const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
    const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
    const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#fffbe6,#fef3c7)", borderRadius: 16, border: "1px solid #fde68a", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('kakao.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('kakao.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
                </div>}
            </div>
            {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
            {steps.length > 0 && <div style={card}>
                {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {steps.map((s) => (
                        <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>}
            {tips.length > 0 && (
                <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
                    <div style={secTitle}>💡 {t('kakao.guideTipsTitle')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "start", fontSize: 12.5, color: "#374151", lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>
                                <span style={{ color: "#22c55e", fontWeight: 900, WebkitTextFillColor: '#22c55e' }}>✓</span><span>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {faqs.length > 0 && (
                <div style={card}>
                    <div style={secTitle}>❓ {t('kakao.guideFaqTitle')}</div>
                    <div style={{ display: "grid", gap: 12 }}>
                        {faqs.map((f, i) => (
                            <div key={i} style={{ borderBottom: i < faqs.length - 1 ? "1px solid #f1f5f9" : "none", paddingBottom: 10 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", marginBottom: 4, WebkitTextFillColor: '#1e293b' }}>Q. {f.q}</div>
                                <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.7, WebkitTextFillColor: '#475569' }}>{f.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={secTitle}>🔒 {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
            {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🛠️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
            {g('guideReadyTitle') ? <div style={{ background: "linear-gradient(135deg,#fffbe6,#fef3c7)", borderRadius: 16, border: "1px solid #fde68a", padding: "24px", textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: "#1e293b", marginBottom: 8, WebkitTextFillColor: '#1e293b' }}>🎉 {g('guideReadyTitle')}</div>
                <div style={{ fontSize: 12.5, color: "#1e293b", lineHeight: 1.8, fontWeight: 500, whiteSpace: 'pre-line', maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyDesc')}</div>
            </div> : null}
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

    const { addAlert, broadcastUpdate, kakaoCampaignsLinked, addKakaoCampaign, deleteKakaoCampaign, updateKakaoCampaign, crmSegments } = useGlobalData();
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
            bcRef.current = new BroadcastChannel(tChannelName('geniego_kakao'));
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
    const [campaignsLocal, setCampaignsLocal] = useState([]);
    // 데모: 공유 kakaoCampaignsLinked에서 라이브 파생(대시보드·CRM과 동기화). 운영: API 로컬 상태.
    const campaigns = useMemo(
        () => _IS_DEMO ? mapKakaoForTable(kakaoCampaignsLinked) : campaignsLocal,
        [kakaoCampaignsLinked, campaignsLocal]
    );
    const setCampaigns = setCampaignsLocal;

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
            <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(254,229,0,0.04)', border:'1px solid rgba(254,229,0,0.12)', fontSize:10, color:'#eab308', fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }} />
                {t('kakao.liveSyncStatus')}
            </div>

            {/* Hero */}
            <div style={{ borderRadius:16, background:'rgba(254,229,0,0.06)', border:'1px solid rgba(234,179,8,0.18)', padding:"22px 28px", marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ background:C.kakao, color:C.kakaoText, borderRadius:8, padding:"6px 12px", fontSize:18, fontWeight:900 }}>💬</span>
                        <div>
                            <div style={{ fontSize:22, fontWeight:800, color:'#1f2937' }}>{t('kakao.title')}</div>
                            <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>{t('kakao.subTitle')}</div>
                        </div>
                    </div>
                    <button onClick={broadcastRefresh} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #d1d5db', background:'rgba(255,255,255,0.8)', color:'#374151', fontWeight:700, fontSize:11, cursor:'pointer' }}>🔄 {t('kakao.syncNow')}</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
                <StatCard icon="📢" label={t('kakao.statCamp')} value={stats.total} color={C.accent} />
                <StatCard icon="📤" label={t('kakao.statSent')} value={stats.sent.toLocaleString()} color={C.kakao.replace('#fee500','#eab308')} />
                <StatCard icon="✅" label={t('kakao.statSucc')} value={stats.succ.toLocaleString()} color={C.green} />
                <StatCard icon="❌" label={t('kakao.statFail')} value={stats.fail.toLocaleString()} color={C.red} />
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:'wrap' }}>
                {TABS.map(T => (
                    <button key={T.id} onClick={() => setTab(T.id)} style={{ padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", background:tab === T.id ? C.kakao : C.card, color:tab === T.id ? C.kakaoText : C.muted, fontWeight:700, fontSize:13 }}>{T.label}</button>
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
