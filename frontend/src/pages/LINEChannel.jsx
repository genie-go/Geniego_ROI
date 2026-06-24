import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { getJsonAuth, postJsonAuth, requestJsonAuth } from '../services/apiClient.js'; // 191차: 세션 토큰 인증(LINE 백엔드 신설 — requirePro). [현차수] 쓰기액션(저장/생성/삭제) 배선.
import { useI18n } from '../i18n';
import { IS_DEMO } from '../utils/demoEnv';

/* ─── 180차: 데모 가상데이터 (빈 데이터 0 — roidemo.* 에서 LINE 채널 전 탭 시드) ─── */
const DEMO_LINE_STATS = { ok: true, total_followers: 12483, monthly_sent: 38500, avg_open_rate: 72.4, avg_click_rate: 18.9 };
const DEMO_LINE_CAMPAIGNS = [
  { id: "ln_d1", name: "新春セール告知", type: "marketing", template_name: "セール告知v2", status: "active", sent: 9820, opened: 7110, clicked: 1340 },
  { id: "ln_d2", name: "配送完了通知", type: "transactional", template_name: "配送ステータス", status: "active", sent: 15240, opened: 13980, clicked: 2210 },
  { id: "ln_d3", name: "リピート顧客クーポン", type: "marketing", template_name: "クーポン配布", status: "paused", sent: 5400, opened: 3720, clicked: 980 },
];
const DEMO_LINE_TEMPLATES = [
  { id: "tpl_d1", name: "セール告知v2", type: "marketing", status: "approved", usage: 24 },
  { id: "tpl_d2", name: "配送ステータス", type: "transactional", status: "approved", usage: 156 },
  { id: "tpl_d3", name: "クーポン配布", type: "marketing", status: "approved", usage: 18 },
];
const DEMO_LINE_SETTINGS = { ok: true, channel_id: "@geniego_demo", connected: true, webhook: "https://roidemo.genie-go.com/api/line/webhook", plan: "Messaging API" };

const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    border: "var(--border)", accent: "#06c755",  // LINE Green
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
    line: "#06c755", lineLight: "rgba(6,199,85,0.15)",
};

/* ─── Statistics Card */
function StatCard({ icon, label, value, color, sub }) {
    return (
        <div style={{ background: C.card, borderRadius: 14, padding: "14px 18px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26, flex: "0 0 auto" }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text, lineHeight: 1.15 }}>{value}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
                {sub && <div style={{ fontSize: 10, color: color || C.accent, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
            </div>
        </div>
    );
}

/* ─── Campaign Tab — [현차수] 생성/발송/삭제 배선(액션→onChanged 재조회→stats 동기화). 데모는 읽기전용. */
function CampaignsTab({ campaigns, templates = [], isDemo = false, onChanged }) {
    const { t } = useI18n();
    const { kakaoCampaignsLinked } = useGlobalData();
    // 180차: 데모/운영 공통 — 공유 상태에서 line 타입 캠페인 라이브 파생(CRM·대시보드와 동기화)
    const linkedLine = kakaoCampaignsLinked.filter(c => c.type === "line");

    const [form, setForm] = useState({ name: '', type: 'marketing', template_id: '' });
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setBusy(true); setNotice(null);
        try { await postJsonAuth('/api/line/campaigns', { ...form, template_id: form.template_id ? Number(form.template_id) : 0 }); setForm({ name: '', type: 'marketing', template_id: '' }); onChanged && onChanged(); }
        catch (e) { setNotice({ ok: false, msg: String(e.message || e) }); }
        setBusy(false);
    };
    const handleSend = async (id) => {
        setBusy(true); setNotice(null);
        try { const r = await postJsonAuth(`/api/line/campaigns/${id}/send`, {}); setNotice({ ok: r.ok, msg: r.ok ? t('line.sendDone','Broadcast sent') : (r.error || t('line.sendFail','Send failed')) }); onChanged && onChanged(); }
        catch (e) { setNotice({ ok: false, msg: String(e.message || e) }); }
        setBusy(false);
    };
    const handleDelete = async (id) => {
        setBusy(true); setNotice(null);
        try { await requestJsonAuth(`/api/line/campaigns/${id}`, 'DELETE'); onChanged && onChanged(); }
        catch (e) { setNotice({ ok: false, msg: String(e.message || e) }); }
        setBusy(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* [현차수] 새 캠페인 생성 — 운영 전용 */}
            {!isDemo && (
                <div style={{ background: C.card, border: `1px dashed ${C.line}40`, borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>+ {t('line.newCampaign','New Campaign')}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                        <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{t('line.campaignName','Campaign name')}</div>
                            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('line.campaignName','Campaign name')}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{t('line.type','Type')}</div>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box' }}>
                                <option value="marketing">{t('line.typeMarketing','📣 Marketing')}</option>
                                <option value="transactional">{t('line.typeTransactional','🔔 Transactional')}</option>
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{t('line.template','Template')}</div>
                            <select value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box' }}>
                                <option value="">{t('line.noTemplate','None')}</option>
                                {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                            </select>
                        </div>
                        <button onClick={handleCreate} disabled={busy || !form.name.trim()}
                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.line, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (busy || !form.name.trim()) ? 0.6 : 1 }}>
                            {t('line.create','Create')}
                        </button>
                    </div>
                    {notice && <div style={{ marginTop: 10, fontSize: 12, color: notice.ok ? C.green : C.red }}>{notice.ok ? '✓ ' : '✗ '}{notice.msg}</div>}
                </div>
            )}
            {/* CRM Integration Campaign (Paid) */}
            {linkedLine.length > 0 && (
                <div style={{ background: C.lineLight, border: `1px solid ${C.line}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.line, marginBottom: 8 }}>🔗 {t('line.crmIntegration','CRM Segment Integration')} ({linkedLine.length})</div>
                    {linkedLine.map(c => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                            <span style={{ fontSize: 12 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</span>
                            <span style={{ fontSize: 11, color: C.muted }}>→ {c.targetSegmentName}</span>
                        </div>
                    ))}
                </div>
            )}
            {campaigns.map(c => (
                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                <span style={{ background: c.type === "transactional" ? "rgba(79,142,247,0.15)" : C.lineLight, color: c.type === "transactional" ? "#4f8ef7" : C.line, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                                    {c.type === "transactional" ? t('line.typeTransactional','🔔 Transactional') : t('line.typeMarketing','📣 Marketing')}
                                </span>
                                <span style={{ marginLeft: 8 }}>{c.template_name}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700, background: (c.status === "active" || c.status === "sent") ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: (c.status === "active" || c.status === "sent") ? "#22c55e" : "#eab308" }}>
                                {c.status === "sent" ? t('line.statusSent','📤 Sent') : c.status === "active" ? t('line.statusActive','✅ Active') : c.status === "draft" ? t('line.statusDraft','📝 Draft') : t('line.statusScheduled','⏰ Scheduled')}
                            </span>
                            {/* [현차수] 발송/삭제 액션 — 운영 전용. 발송→백엔드 broadcast→재조회로 stats 동기화. */}
                            {!isDemo && c.id != null && (
                                <>
                                    {c.status !== "sent" && (
                                        <button onClick={() => handleSend(c.id)} disabled={busy}
                                            style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, border: 'none', background: C.line, color: '#000', cursor: 'pointer', fontWeight: 700 }}>
                                            📤 {t('line.send','Send')}
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(c.id)} disabled={busy}
                                        style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.red}40`, background: "rgba(248,113,113,0.08)", color: C.red, cursor: 'pointer', fontWeight: 700 }}>
                                        🗑
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                        {[[t('line.metricSent','Sent'), (c.sent || 0).toLocaleString()], [t('line.metricOpenRate','Open Rate'), `${c.sent ? (((c.opened || 0) / c.sent) * 100).toFixed(1) : (c.open_rate ?? 0)}%`], [t('line.metricClickRate','Click Rate'), `${c.sent ? (((c.clicked || 0) / c.sent) * 100).toFixed(1) : (c.click_rate ?? 0)}%`]].map(([l, v]) => (
                            <div key={l} style={{ background: 'var(--surface)', borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{l}</div>
                                <div style={{ fontWeight: 800, fontSize: 15 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── 템플릿 Tab — [현차수] 생성/삭제 배선(저장→onChanged 재조회). 데모는 읽기전용. */
function TemplatesTab({ templates, isDemo = false, onChanged }) {
    const { t } = useI18n();
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'marketing', content: '' });
    const [busy, setBusy] = useState(false);

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setBusy(true);
        try { await postJsonAuth('/api/line/templates', form); setForm({ name: '', type: 'marketing', content: '' }); onChanged && onChanged(); }
        catch (e) { /* swallow; UI stays */ }
        setBusy(false);
    };
    const handleDelete = async (id) => {
        setBusy(true);
        try { await requestJsonAuth(`/api/line/templates/${id}`, 'DELETE'); if (selected?.id === id) setSelected(null); onChanged && onChanged(); }
        catch (e) { /* swallow */ }
        setBusy(false);
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {templates.map(tpl => (
                    <div key={tpl.id} onClick={() => setSelected(tpl)} style={{ background: selected?.id === tpl.id ? C.lineLight : C.card, border: `1px solid ${selected?.id === tpl.id ? C.line : C.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{tpl.name}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{tpl.category || tpl.type}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: tpl.status === "approved" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: tpl.status === "approved" ? "#22c55e" : "#eab308" }}>
                                    {tpl.status === "approved" ? t('line.statusApproved','Approved') : t('line.statusReviewing','Reviewing')}
                                </span>
                                {!isDemo && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }} disabled={busy}
                                        style={{ fontSize: 10, padding: "3px 8px", borderRadius: 8, border: `1px solid ${C.red}40`, background: "rgba(248,113,113,0.08)", color: C.red, cursor: "pointer", fontWeight: 700 }}>
                                        🗑 {t('line.delete','Delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {templates.length === 0 && <div style={{ color: C.muted, fontSize: 12, padding: 12 }}>{t('line.noTemplates','No templates yet.')}</div>}

                {/* [현차수] 새 템플릿 생성 — 운영 전용 */}
                {!isDemo && (
                    <div style={{ background: C.card, border: `1px dashed ${C.line}40`, borderRadius: 12, padding: "14px 18px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>+ {t('line.newTemplate','New Template')}</div>
                        <input placeholder={t('line.templateName','Template name')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box', marginBottom: 8 }} />
                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box', marginBottom: 8 }}>
                            <option value="marketing">{t('line.typeMarketing','📣 Marketing')}</option>
                            <option value="transactional">{t('line.typeTransactional','🔔 Transactional')}</option>
                        </select>
                        <textarea placeholder={t('line.templateContent','Message content…')} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={2}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box', marginBottom: 8, resize: 'vertical' }} />
                        <button onClick={handleCreate} disabled={busy || !form.name.trim()}
                            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: C.line, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (busy || !form.name.trim()) ? 0.6 : 1 }}>
                            {t('line.createTemplate','Create Template')}
                        </button>
                    </div>
                )}
            </div>
            {/* Template Preview */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                {selected ? (
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 12, color: C.line }}>📱 {t('line.preview','Preview')}: {selected.name}</div>
                        <div style={{ background: "#00b900", borderRadius: 16, padding: "14px 18px", maxWidth: 280 }}>
                            <div style={{ fontSize: 11, color: '#fff', marginBottom: 8, fontWeight: 600 }}>{t('line.officialAccount','LINE Official Account')}</div>
                            <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px" }}>
                                <div style={{ fontSize: 12, color: "#333", lineHeight: 1.7, whiteSpace: "pre-line" }}>{selected.preview || selected.content || "—"}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>{t('line.selectTemplate','Please select a template')}</div>
                )}
            </div>
        </div>
    );
}

/* ─── Settings Tab — [현차수] 자격증명 저장 폼 배선(저장→onSaved 전탭 재조회). 데모는 읽기전용. */
function SettingsTab({ settings, isDemo = false, onSaved }) {
    const { t } = useI18n();
    const [form, setForm] = useState({ channel_id: '', channel_secret: '', access_token: '' });
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);

    const connected = settings.connected || settings.status === "connected";

    const handleSave = async () => {
        if (!form.access_token.trim()) return;
        setSaving(true); setResult(null);
        try {
            const r = await postJsonAuth('/api/line/settings', form);
            setResult(r);
            if (r.ok && onSaved) onSaved(); // 저장 직후 settings/templates/campaigns/stats 전탭 재조회(stale 해소)
        } catch (e) {
            setResult({ ok: false, message: String(e.message || e) });
        }
        setSaving(false);
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: C.line }}>🔧 {t('line.settingsTitle','LINE Channel Settings')}</div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Channel ID</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{settings.channel_id || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{t('line.statusLabel','Connection Status')}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: connected ? C.green : C.red }}>{connected ? t('line.connected','✅ Connected') : t('line.disconnected','❌ Not Connected')}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Webhook</span>
                    <span style={{ fontSize: 11, fontWeight: 600, wordBreak: "break-all", maxWidth: 220, textAlign: "right" }}>{settings.webhook || "—"}</span>
                </div>

                {/* [현차수] 자격증명 등록 폼 — 운영(비데모)만. 데모는 읽기전용 시드. */}
                {!isDemo && (
                    <div style={{ marginTop: 18 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: C.muted, marginBottom: 10 }}>🔑 {t('line.credTitle','Channel Credentials')}</div>
                        {[
                            { k: 'channel_id', l: 'Channel ID', ph: '1234567890' },
                            { k: 'channel_secret', l: 'Channel Secret', ph: '••••••••', secret: true },
                            { k: 'access_token', l: t('line.accessToken','Access Token (Long-lived)'), ph: 'Bearer token…', secret: true },
                        ].map(f => (
                            <div key={f.k} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{f.l}</div>
                                <input type={f.secret ? 'password' : 'text'} placeholder={f.ph} value={form[f.k]}
                                    onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--surface)', color: C.text, fontSize: 12, boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <button onClick={handleSave} disabled={saving || !form.access_token.trim()}
                            style={{ marginTop: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: C.line, color: '#000', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: (saving || !form.access_token.trim()) ? 0.6 : 1 }}>
                            {saving ? ('⏳ ' + t('line.connecting','Connecting…')) : ('💾 ' + t('line.saveConnect','Save + Test Connection'))}
                        </button>
                        {result && (
                            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)', color: result.ok ? C.green : C.red }}>
                                {result.ok ? `✓ ${result.message || t('line.connectSuccess','Connected')}` : `✗ ${result.message || result.error}`}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>📊 {t('line.monthlyPerf','Monthly Performance')}</div>
                {/* 206차: 하드코딩 통계 IS_DEMO 게이트 — 운영(미연동)은 '—', 데모만 시드값 노출(목데이터 운영유입 차단) */}
                {[[t('line.monthlySent','Monthly Sent'), settings.monthly_sent?.toLocaleString() || (IS_DEMO ? "37,376" : "—")], [t('line.avgOpenRate','Avg Open Rate'), IS_DEMO ? "91.2%" : "—"], [t('line.avgClickRate','Avg Click Rate'), IS_DEMO ? "37.8%" : "—"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                        <span style={{ fontSize: 13, color: C.muted }}>{l}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.line }}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── LINE Channel 내용 */
function LINEChannelContent() {
    const { token } = useAuth();
    const { t } = useI18n();
    const isDemo = IS_DEMO; /* 180차: demoEnv 정본 — 데모 가상데이터 활성(빈 데이터 0) */
    const { kakaoCampaignsLinked, createKakaoCampaignFromSegment, crmSegments } = useGlobalData();

    const [tab, setTab] = useState("campaigns");
    const TABS = [
        { id: "campaigns", label: t('line.tabCampaigns', '📊 Campaigns') },
        { id: "templates", label: t('line.tabTemplates', '📝 Templates') },
        { id: "settings", label: t('line.tabSettings', '⚙️ Settings') },
    ];

    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [settings, setSettings] = useState({});
    const [stats, setStats] = useState(null);

    // [현차수] loadData 분리 — 자격증명 저장/템플릿·캠페인 생성·발송·삭제 직후 전탭 재조회(stale 해소).
    const loadData = React.useCallback(() => {
        if (isDemo) {
            setCampaigns(DEMO_LINE_CAMPAIGNS);
            setTemplates(DEMO_LINE_TEMPLATES);
            setSettings(DEMO_LINE_SETTINGS);
            setStats(DEMO_LINE_STATS);
            return;
        }
        // 191차: 세션 인증(/api/line requirePro). getJson(무인증)→getJsonAuth.
        getJsonAuth('/api/line/campaigns').then(r => r.campaigns && setCampaigns(r.campaigns)).catch(() => { });
        getJsonAuth('/api/line/templates').then(r => r.templates && setTemplates(r.templates)).catch(() => { });
        getJsonAuth('/api/line/settings').then(r => r.ok && setSettings(r)).catch(() => { });
        getJsonAuth('/api/line/stats').then(r => r.ok && setStats(r)).catch(() => { });
    }, [isDemo]);

    useEffect(() => { loadData(); }, [loadData, token]);

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            

            {/* Header */}
            <div style={{ borderRadius: 16, background: `linear-gradient(135deg, #004225, #00b900)`, border: `1px solid ${C.line}40`, padding: "22px 28px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 32 }}>💚</span> {t('line.title','LINE Channel')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{t('line.headerSub','Message broadcast · Template management · Japan market support')}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.line }}>{stats?.total_followers?.toLocaleString() || (IS_DEMO ? "12,483" : "—")}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{t('line.followers','Followers')}</div>
                </div>
            </div>

            {/* Statistics Card */}
            {stats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
                    <StatCard icon="👥" label={t('line.statFollowers','Followers')} value={stats.total_followers?.toLocaleString()} color={C.line} />
                    <StatCard icon="📤" label={t('line.statMonthlySent','Monthly Sent')} value={stats.monthly_sent?.toLocaleString()} color="#4f8ef7" />
                    <StatCard icon="👁" label={t('line.statOpenRate','Avg Open Rate')} value={`${stats.avg_open_rate}%`} color="#22c55e" sub={t('line.industryAvg','vs industry avg 67.8%')} />
                    <StatCard icon="🖱" label={t('line.statClickRate','Avg Click Rate')} value={`${stats.avg_click_rate}%`} color="#f59e0b" />
                </div>
            )}

            {/* CRM 세그먼트 Integration Button (도 사용 가능) */}
            <div style={{ background: C.card, borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: C.muted }}>🔗 {t('line.crmLink','CRM Segment Link')}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {crmSegments.map(s => (
                        <button key={s.id} onClick={() => createKakaoCampaignFromSegment(s.id, `[LINE] ${(t("Data." + s.name) !== "Data." + s.name ? t("Data." + s.name) : s.name)} ${t('line.campaignSuffix','Campaign')}`)}
                            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.line}40`, background: C.lineLight, color: C.line, cursor: "pointer", fontWeight: 700 }}>
                            💚 {(t("Data." + s.name) !== "Data." + s.name ? t("Data." + s.name) : s.name)} ({t('line.memberCount','{{count}} members').replace('{{count}}', s.count)})
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab 네비게이션 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.id ? C.line : C.card, color: tab === t.id ? "#000" : C.muted, fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}>{t.label}</button>
                ))}
            </div>

            {tab === "campaigns" && <CampaignsTab campaigns={campaigns} templates={templates} isDemo={isDemo} onChanged={loadData} />}
            {tab === "templates" && <TemplatesTab templates={templates} isDemo={isDemo} onChanged={loadData} />}
            {tab === "settings" && <SettingsTab settings={settings} isDemo={isDemo} onSaved={loadData} />}
        </div>
    );
}

/* ─── 메인 */
export default function LINEChannel() {
    return (
        <PlanGate feature="line_channel">
            <LINEChannelContent />
        </PlanGate>
    );
}

/* Mocked defaults for removed DataLayer */
const _LINE_CAMPAIGNS = [];
const _LINE_TEMPLATES = [];
const _LINE_STATS = {};
const _LINE_SETTINGS = {};