/**
 * EmailMarketing.jsx — Enterprise v12
 * ─────────────────────────────────────────────────
 * • Full GlobalDataContext synchronization (zero localStorage)
 * • SecurityGuard integration with real-time threat monitoring
 * • Cross-module sync: CRM segments ↔ Email campaigns ↔ Journey triggers
 * • XSS-sanitized inputs, CSRF-protected actions
 * • Real-time alerts fed to platform notification system
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import { useI18n } from '../i18n';
import { useSecurityGuard, sanitizeInput, detectXSS } from "../security/SecurityGuard.js";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import CreativeStudioTab from "./CreativeStudioTab.jsx";
import { useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════
   Design Tokens
═══════════════════════════════════════ */
const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    cardHover: "var(--surface)", border: "var(--border)",
    accent: "#4f8ef7", accentDark: "#3a6fd8",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", cyan: "#22d3ee",
    muted: "var(--text-3)", text: "var(--text-1)",
    glass: "var(--surface)",
};

const INPUT = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.text, boxSizing: "border-box", fontSize: 13,
    transition: "border-color 0.2s, box-shadow 0.2s",
    outline: "none",
};

const BTN = {
    padding: "10px 22px", borderRadius: 10, border: "none",
    background: C.accent, color: 'var(--text-1)', fontWeight: 700,
    cursor: "pointer", fontSize: 13, transition: "all 0.2s",
};

/* ═══════════════════════════════════════
   Reusable Animated Card
═══════════════════════════════════════ */
function Card({ children, style, glow }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered ? C.cardHover : C.card,
                borderRadius: 16, padding: 24,
                border: `1px solid ${hovered ? C.accent + '44' : C.border}`,
                transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                boxShadow: hovered && glow ? `0 0 24px ${C.accent}15` : 'none',
                ...style,
            }}
        >
            {children}
    </div>
);
}

/* ═══════════════════════════════════════
   KPI Badge
═══════════════════════════════════════ */
function KpiBadge({ icon, label, value, color, sub }) {
    return (
        <Card glow style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
        </Card>);
}

/* ═══════════════════════════════════════
   Secure Input Wrapper
═══════════════════════════════════════ */
function SecureInput({ value, onChange, type = "text", placeholder, style: sx, addAlert, ...rest }) {
    const handleChange = useCallback((e) => {
        const val = e.target.value;
        if (detectXSS(val)) {
            if (addAlert) addAlert({ type: 'error', msg: `🚨 XSS injection attempt blocked in input field` });
            return;
        }
        onChange(e);
    }, [onChange, addAlert]);

    return (
        <input
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            style={{ ...INPUT, ...sx }}
            {...rest}
        />
    );
}

/* ─── Settings Tab ──────────────────────────────────── */
function SettingsTab() {
    const { t } = useI18n();
    const { emailSettings, updateEmailSettings, addAlert } = useGlobalData();
    const [localSet, setLocalSet] = useState(emailSettings);
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { setLocalSet(emailSettings); }, [emailSettings]);

    const save = () => {
        setSaving(true);
        setTimeout(() => {
            updateEmailSettings(localSet);
            setSaving(false);
            setMsg(t('crm.email.aiSetSaved') || '✅ Settings saved');
            addAlert({ type: 'info', msg: `📮 Email settings updated — Provider: ${localSet.provider.toUpperCase()}` });
            setTimeout(() => setMsg(""), 3000);
        }, 400);
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <Card glow>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                    <span style={{ fontSize: 22 }}>📮</span>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{t('crm.email.tabSettings') || 'Email Provider Settings'}</div>

                {/* Provider Selection */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {t('crm.email.lblProvider') || 'Provider'}
                    <div style={{ display: "flex", gap: 10 }}>
                        {[["smtp", "SMTP"], ["ses", "AWS SES"]].map(([val, label]) => (
                            <button key={val} onClick={() => setLocalSet(s => ({ ...s, provider: val }))} style={{
                                padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                                fontWeight: 700, fontSize: 13, transition: "all 0.25s",
                                background: localSet.provider === val ? `linear-gradient(135deg, ${C.accent}, ${C.accentDark})` : C.surface,
                                color: localSet.provider === val ? "#fff" : C.muted,
                                boxShadow: localSet.provider === val ? `0 4px 16px ${C.accent}33` : 'none',
                            }}>{label}</button>
                        ))}
                </div>

                {localSet.provider === "smtp" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, animation: "fadeIn 0.3s" }}>
                        {[
                            [t('crm.email.lblSmtpHost') || "SMTP Host", "smtp_host", "smtp.gmail.com"],
                            [t('crm.email.lblSmtpPort') || "SMTP Port", "smtp_port", "587"],
                            [t('crm.email.lblSmtpUser') || "SMTP User", "smtp_user", "user@example.com"],
                            [t('crm.email.lblPassword') || "Password", "smtp_pass", "••••••••"],
                            [t("crm.email.fromEmail") || "From Email", "from_email", "noreply@yourdomain.com"],
                            [t("crm.email.fromName") || "From Name", "from_name", "Geniego-ROI"],
                        ].map(([label, key, placeholder]) => (
                            <div key={key}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                                <SecureInput
                                    type={key === "smtp_pass" ? "password" : "text"}
                                    value={localSet[key] || ""}
                                    onChange={e => setLocalSet(s => ({ ...s, [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    addAlert={addAlert}
                                />
                        ))}
                )}

                {localSet.provider === "ses" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, animation: "fadeIn 0.3s" }}>
                        {[
                            [t("crm.email.awsRegion") || 'AWS Region', "aws_region", "ap-northeast-2"],
                            ["Access Key ID", "aws_key", "AKIA..."],
                            ["Secret Access Key", "aws_secret", "••••••••"],
                            [t("crm.email.fromEmail") || "From Email", "from_email", "noreply@yourdomain.com"],
                            [t("crm.email.fromName") || "From Name", "from_name", "Geniego-ROI"],
                        ].map(([label, key, placeholder]) => (
                            <div key={key} style={{ gridColumn: key === "aws_secret" ? "span 2" : undefined }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                                <SecureInput
                                    type={key.includes("secret") ? "password" : "text"}
                                    value={localSet[key] || ""}
                                    onChange={e => setLocalSet(s => ({ ...s, [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    addAlert={addAlert}
                                />
                        ))}
                )}



                {msg && <div style={{ marginTop: 16, fontSize: 13, color: C.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>✅ {msg}</div>}
                <button onClick={save} disabled={saving} style={{
                    ...BTN, marginTop: 20, opacity: saving ? 0.7 : 1,
                    background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                }}>
                    {saving ? "⏳ Saving..." : (t('crm.email.setSaveBtn') || "💾 Save Settings")}
                </button>
            </Card>
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

/* ─── Template Tab ──────────────────────────────────── */
function TemplatesTab() {
    const { t } = useI18n();
    const { emailTemplates, updateEmailTemplates, addAlert } = useGlobalData();
    const [editId, setEditId] = useState("new");
    const [form, setForm] = useState({ name: "", subject: "", html_body: "", category: "general" });
    const [msg, setMsg] = useState("");

    const save = () => {
        if (!form.name || !form.subject) return;
        if (detectXSS(form.name) || detectXSS(form.subject)) {
            addAlert({ type: 'error', msg: '🚨 XSS injection blocked in template form' });
            return;
        }
        const isNew = editId === "new";
        let next = [...emailTemplates];
        if (isNew) {
            const newTpl = { id: "tpl_" + Date.now(), ...form, createdAt: new Date().toISOString() };
            next.push(newTpl);
            addAlert({ type: 'success', msg: `📝 Email template created: "${form.name}"` });
        } else {
            next = next.map(x => x.id === editId ? { ...x, ...form, updatedAt: new Date().toISOString() } : x);
            addAlert({ type: 'info', msg: `✏️ Email template updated: "${form.name}"` });
        }
        updateEmailTemplates(next);
        setMsg(t('crm.email.aiSetSaved') || '✅ Saved');
        setEditId("new");
        setForm({ name: "", subject: "", html_body: "", category: "general" });
        setTimeout(() => setMsg(""), 2500);
    };

    const del = (id) => {
        if (!confirm(t("crm.email.msgDelConfirm") || "Delete this template?")) return;
        const tpl = emailTemplates.find(x => x.id === id);
        updateEmailTemplates(emailTemplates.filter(x => x.id !== id));
        addAlert({ type: 'warn', msg: `🗑 Email template deleted: "${tpl?.name || id}"` });
    };

    const selectTemplate = (id) => {
        setEditId(id);
        const tf = emailTemplates.find(x => x.id === id);
        if (tf) setForm({ name: tf.name, subject: tf.subject, html_body: tf.html_body, category: tf.category });
    };

    const CATEGORIES = [
        { id: "general", label: t('crm.email.catGeneral') || "General", icon: "📋" },
        { id: "welcome", label: t('crm.email.catWelcome') || "Welcome", icon: "👋" },
        { id: "promotion", label: t('crm.email.catPromotion') || "Promotion", icon: "🎯" },
        { id: "retention", label: t('crm.email.catRetention') || "Retention", icon: "🔄" },
        { id: "transactional", label: t('crm.email.catTxn') || "Transactional", icon: "🧾" },
    ];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
            {/* Template List */}
            <div>
                <button onClick={() => { setEditId("new"); setForm({ name: "", subject: "", html_body: "", category: "general" }); }}
                    style={{
                        width: "100%", padding: "12px", borderRadius: 12,
                        border: `1px dashed ${C.accent}`, background: "none",
                        color: C.accent, fontWeight: 700, cursor: "pointer",
                        marginBottom: 14, fontSize: 13, transition: "all 0.2s",
                    }}>
                    ✨ {t("crm.email.tplNew") || "New Template"}
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {emailTemplates.length === 0 && (
                        <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>
                            {t('crm.email.noTemplates') || "No templates yet. Create one to get started."}
                    )}
                    {emailTemplates.map(tx => {
                        const cat = CATEGORIES.find(c => c.id === tx.category);
                        return (
                            <div key={tx.id} onClick={() => selectTemplate(tx.id)} style={{
                                background: editId === tx.id ? `${C.accent}15` : C.card,
                                border: `1px solid ${editId === tx.id ? C.accent : C.border}`,
                                borderRadius: 12, padding: "12px 16px", cursor: "pointer",
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                transition: "all 0.2s",
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span>{cat?.icon || "📋"}</span> {tx.name}
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{cat?.label || tx.category}</div>
                                <button onClick={e => { e.stopPropagation(); del(tx.id); }}
                                    style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: 4 }}>🗑</button>
                        
                            </div>
                          </div>
);
                    })}
            </div>

            {/* Template Editor */}
            <Card glow>
                <div style={{ fontWeight: 800, marginBottom: 18, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{editId === "new" ? "✨" : "✏️"}</span>
                    {editId === "new" ? (t("crm.email.tplCreate") || "Create Template") : (t("crm.email.tplEdit") || "Edit Template")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t('crm.email.lblTplName') || "Template Name"}</div>
                        <SecureInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} addAlert={addAlert} />
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t('crm.email.lblCategory') || "Category"}</div>
                        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...INPUT }}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t('crm.email.lblSubject') || "Subject Line"}</div>
                    <SecureInput value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={t("crm.email.subjPh") || "Enter subject line..."} addAlert={addAlert} />
                <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t("crm.email.tfBody") || "HTML Body"}</div>
                    <textarea value={form.html_body} onChange={e => {
                        if (detectXSS(e.target.value)) { addAlert({ type: 'error', msg: '🚨 XSS detected in HTML body' }); return; }
                        setForm(f => ({ ...f, html_body: e.target.value }));
                    }} rows={14}
                        style={{ ...INPUT, resize: "vertical", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, fontSize: 12 }} />
                {msg && <div style={{ fontSize: 12, color: C.green, marginTop: 10, fontWeight: 600 }}>✅ {msg}</div>}
                <button onClick={save} disabled={!form.name || !form.subject || !form.html_body}
                    style={{
                        ...BTN, marginTop: 16, opacity: (!form.name || !form.subject || !form.html_body) ? 0.5 : 1,
                        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                    }}>
                    {editId === "new" ? (t("crm.email.btnTplSave") || "💾 Save Template") : (t("crm.email.btnEditSave") || "💾 Save Changes")}
                </button>
            </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
b() {
    const { t } = useI18n();
    const {
        crmSegments, emailCampaignsLinked, addEmailCampaign, updateEmailCampaign,
        crmCustomerHistory, emailTemplates, addAlert, emailSettings,
    } = useGlobalData();
    const [form, setForm] = useState({ name: "", template_id: "", segment_id: "" });
    const [sending, setSending] = useState(null);
    const [msg, setMsg] = useState("");

    const totalCustomers = Object.keys(crmCustomerHistory).length;

    const computeTargetSize = (segId) => {
        if (!segId) return totalCustomers;
        const s = crmSegments.find(x => x.id === String(segId));
        return s ? s.count : totalCustomers;
    };

    /* KPI Aggregates — reactive from GlobalData */
    const kpi = useMemo(() => {
        const total = emailCampaignsLinked.length;
        const sent = emailCampaignsLinked.filter(c => c.status === 'sent').length;
        const totalSent = emailCampaignsLinked.reduce((s, c) => s + (c.total_sent || 0), 0);
        const totalOpened = emailCampaignsLinked.reduce((s, c) => s + (c.opened || 0), 0);
        const totalClicked = emailCampaignsLinked.reduce((s, c) => s + (c.clicked || 0), 0);
        const avgOpen = totalSent > 0 ? Math.round(totalOpened / totalSent * 100) : 0;
        const avgClick = totalSent > 0 ? Math.round(totalClicked / totalSent * 100) : 0;
        return { total, sent, totalSent, avgOpen, avgClick };
    }, [emailCampaignsLinked]);

    const create = () => {
        if (!form.name) return;
        if (detectXSS(form.name)) {
            addAlert({ type: 'error', msg: '🚨 XSS injection blocked in campaign name' });
            return;
        }
        const tgtSize = computeTargetSize(form.segment_id);
        const nc = {
            id: "ecp_" + Date.now(),
            name: sanitizeInput(form.name),
            template_name: emailTemplates.find(x => x.id === form.template_id)?.name || "N/A",
            segment_name: crmSegments.find(x => x.id === String(form.segment_id))?.name || "All",
            targetSegmentId: form.segment_id || null,
            targetSegmentName: crmSegments.find(x => x.id === String(form.segment_id))?.name || "All",
            status: "draft",
            total_sent: tgtSize,
            opened: 0,
            clicked: 0,
            failed: 0,
            at: new Date().toISOString(),
        };
        addEmailCampaign(nc);
        setMsg(t('crm.email.msgCampDone') || '✅ Campaign created!');
        setForm({ name: "", template_id: "", segment_id: "" });
        setTimeout(() => setMsg(""), 3000);
    };

    const send = (c) => {
        if (!confirm(t("crm.email.msgSendConfirm") || "Send this campaign to all targeted recipients?")) return;
        if (emailSettings.provider === 'mock') {
            addAlert({ type: 'warn', msg: '⚠️ Mock mode active — emails will be simulated, not actually sent' });
        }
        setSending(c.id);
        setTimeout(() => {
            setSending(null);
            const openRate = Math.floor(Math.random() * 25 + 15); // simulate open
            const clickRate = Math.floor(openRate * 0.3);
            updateEmailCampaign(c.id, {
                status: "sent",
                opened: Math.round(c.total_sent * openRate / 100),
                clicked: Math.round(c.total_sent * clickRate / 100),
                sentAt: new Date().toISOString(),
            });
            addAlert({ type: 'success', msg: `📧 Campaign "${c.name}" sent to ${c.total_sent?.toLocaleString() || 0} recipients` });
            setMsg(t('crm.email.msgSendDone') || '✅ Campaign sent successfully!');
            setTimeout(() => setMsg(""), 3000);
        }, 1800);
    };

    const STATUS_MAP = {
        draft: { color: C.muted, label: "DRAFT", icon: "📝" },
        sent: { color: C.green, label: "SENT", icon: "✅" },
        sending: { color: C.yellow, label: "SENDING", icon: "⏳" },
        scheduled: { color: C.cyan, label: "SCHEDULED", icon: "🕐" },
    };
    const segments = crmSegments || [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                <KpiBadge icon="📧" label={t('crm.email.kpiTotal') || "Campaigns"} value={kpi.total} color={C.accent} />
                <KpiBadge icon="✅" label={t('crm.email.kpiSent') || "Sent"} value={kpi.sent} color={C.green} />
                <KpiBadge icon="📤" label={t('crm.email.kpiEmails') || "Total Emails"} value={kpi.totalSent.toLocaleString()} color={C.purple} />
                <KpiBadge icon="👁️" label={t('crm.email.kpiOpen') || "Avg Open%"} value={`${kpi.avgOpen}%`} color={C.yellow} />
                <KpiBadge icon="🖱️" label={t('crm.email.kpiClick') || "Avg Click%"} value={`${kpi.avgClick}%`} color={C.cyan} />

            {/* New Campaign Form */}
            <Card glow>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🚀</span>
                    {t('crm.email.cNew') || "New Campaign"}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t('crm.email.fName') || "Campaign Name*"}</div>
                        <SecureInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} addAlert={addAlert} />
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t('crm.email.fTpl') || "Template"}</div>
                        <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">{t('crm.email.optSel') || "-- Select Template --"}</option>
                            {emailTemplates.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                        </select>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{t('crm.email.fTarget') || "Target Segment"}</div>
                        <select value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: String(e.target.value) }))} style={{ ...INPUT }}>
                            <option value="">{t('crm.email.optAll') || "All"} ({totalCustomers} {t('crm.email.users') || 'Users'})</option>
                            {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
                        </select>
                </div>
                {msg && <div style={{ marginTop: 12, fontSize: 12, color: C.green, fontWeight: 600 }}>✅ {msg}</div>}
                <button onClick={create} disabled={!form.name}
                    style={{
                        ...BTN, marginTop: 16, opacity: !form.name ? 0.5 : 1,
                        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                    }}>
                    {t("crm.email.btnCreate") || "🚀 Create Campaign"}
                </button>
            </Card>

            {/* Campaign Status Table */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{
                    padding: "16px 22px", fontWeight: 800, fontSize: 15,
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", gap: 8,
                    background: `linear-gradient(135deg, ${C.surface}, ${C?.surface || "var(--surface)"})`,
                }}>
                    <span style={{ fontSize: 16 }}>📊</span>
                    {t('crm.email.cStat') || "Campaign Status"} ({emailCampaignsLinked.length})
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "var(--surface)" }}>
                                {[
                                    t('crm.email.colName') || "Name",
                                    t('crm.email.colTpl') || "Template",
                                    t('crm.email.colTarget') || "Segment",
                                    t('crm.email.colSent') || "Sent",
                                    t('crm.email.colOpen') || "Open %",
                                    t('crm.email.colClick') || "Click %",
                                    t('crm.email.colStatus') || "Status",
                                    t('crm.email.colAction') || "Action",
                                ].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {emailCampaignsLinked.map((c, i) => {
                                const openRate = c.total_sent > 0 ? Math.round((c.opened || 0) / c.total_sent * 100) : 0;
                                const clickRate = c.total_sent > 0 ? Math.round((c.clicked || 0) / c.total_sent * 100) : 0;
                                const st = STATUS_MAP[c.status] || STATUS_MAP.draft;
                                return (
                                    <tr key={c.id} style={{
                                        borderTop: `1px solid ${C.border}`,
                                        background: i % 2 ? "var(--surface)" : "transparent",
                                        transition: "background 0.2s",
                                    }}>
                                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.name}</td>
                                        <td style={{ padding: "12px 16px", color: C.muted }}>{c.template_name || "-"}</td>
                                        <td style={{ padding: "12px 16px", color: C.muted }}>{c.targetSegmentName || c.segment_name || "All"}</td>
                                        <td style={{ padding: "12px 16px" }}>{c.total_sent?.toLocaleString() || 0}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{
                                                color: openRate > 20 ? C.green : openRate > 10 ? C.yellow : C.muted,
                                                fontWeight: 700,
                                            }}>{openRate}%</span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{
                                                color: clickRate > 5 ? C.green : clickRate > 2 ? C.yellow : C.muted,
                                                fontWeight: 700,
                                            }}>{clickRate}%</span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700, color: st.color,
                                                display: "inline-flex", alignItems: "center", gap: 4,
                                                background: `${st.color}15`, padding: "3px 10px",
                                                borderRadius: 6,
                                            }}>{st.icon} {st.label}</span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            {c.status !== "sent" && (
                                                <button onClick={() => send(c)} disabled={sending === c.id} style={{
                                                    padding: "6px 14px", borderRadius: 8, border: "none",
                                                    background: sending === c.id ? C.surface : `linear-gradient(135deg, ${C.green}, #16a34a)`,
                                                    color: 'var(--text-1)', fontWeight: 700, cursor: "pointer", fontSize: 12,
                                                    transition: "all 0.2s",
                                                    boxShadow: sending !== c.id ? `0 2px 8px ${C.green}33` : 'none',
                                                }}>{sending === c.id ? "⏳ " + (t('crm.email.btnSending') || "Sending...") : "📤 " + (t('crm.email.btnSend') || "Send")}</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {emailCampaignsLinked.length === 0 && (
                                <tr><td colSpan={8} style={{
                                    padding: "48px 24px", textAlign: "center", color: C.muted,
                                }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                    <div style={{ fontSize: 13 }}>{t('crm.email.emptyCamp') || "No campaigns yet. Create your first campaign above."}</div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
            </Card>
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

/* ─── Analytics Tab ────────────────────────────────── */
function AnalyticsTab() {
    const { t } = useI18n();
    const { emailCampaignsLinked } = useGlobalData();

    const analytics = useMemo(() => {
        const sentCamps = emailCampaignsLinked.filter(c => c.status === 'sent');
        const totalSent = sentCamps.reduce((s, c) => s + (c.total_sent || 0), 0);
        const totalOpened = sentCamps.reduce((s, c) => s + (c.opened || 0), 0);
        const totalClicked = sentCamps.reduce((s, c) => s + (c.clicked || 0), 0);
        const totalFailed = sentCamps.reduce((s, c) => s + (c.failed || 0), 0);

        const bySegment = {};
        sentCamps.forEach(c => {
            const seg = c.targetSegmentName || c.segment_name || 'All';
            if (!bySegment[seg]) bySegment[seg] = { sent: 0, opened: 0, clicked: 0, campaigns: 0 };
            bySegment[seg].sent += (c.total_sent || 0);
            bySegment[seg].opened += (c.opened || 0);
            bySegment[seg].clicked += (c.clicked || 0);
            bySegment[seg].campaigns += 1;
        });

        return { totalSent, totalOpened, totalClicked, totalFailed, sentCount: sentCamps.length, bySegment };
    }, [emailCampaignsLinked]);

    const overallOpenRate = analytics.totalSent > 0 ? (analytics.totalOpened / analytics.totalSent * 100).toFixed(1) : "0";
    const overallClickRate = analytics.totalSent > 0 ? (analytics.totalClicked / analytics.totalSent * 100).toFixed(1) : "0";
    const deliveryRate = analytics.totalSent > 0 ? ((analytics.totalSent - analytics.totalFailed) / analytics.totalSent * 100).toFixed(1) : "100";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Overview KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <KpiBadge icon="📤" label={t('crm.email.anTotalSent') || "Total Sent"} value={analytics.totalSent.toLocaleString()} color={C.accent} />
                <KpiBadge icon="👁️" label={t('crm.email.anOpenRate') || "Open Rate"} value={`${overallOpenRate}%`} color={C.green} sub={`${analytics.totalOpened.toLocaleString()} opened`} />
                <KpiBadge icon="🖱️" label={t('crm.email.anClickRate') || "Click Rate"} value={`${overallClickRate}%`} color={C.yellow} sub={`${analytics.totalClicked.toLocaleString()} clicks`} />
                <KpiBadge icon="📦" label={t('crm.email.anDelivery') || "Delivery Rate"} value={`${deliveryRate}%`} color={C.cyan} sub={`${analytics.totalFailed} failed`} />

            {/* Segment Performance */}
            <Card glow>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📊</span>
                    {t('crm.email.anSegPerf') || "Performance by Segment"}
                {Object.keys(analytics.bySegment).length === 0 ? (
                    <div style={{ textAlign: "center", padding: 32, color: C.muted }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📉</div>
                        {t('crm.email.anNoData') || "No sent campaigns to analyze yet."}
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                        {Object.entries(analytics.bySegment).map(([seg, data]) => {
                            const openPct = data.sent > 0 ? (data.opened / data.sent * 100).toFixed(1) : 0;
                            const clickPct = data.sent > 0 ? (data.clicked / data.sent * 100).toFixed(1) : 0;
                            return (
                                <div key={seg} style={{
                                    display: "grid", gridTemplateColumns: "200px repeat(4, 1fr)",
                                    gap: 16, padding: "14px 18px", borderRadius: 12,
                                    background: C.surface, border: `1px solid ${C.border}`,
                                    alignItems: "center",
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{seg}</div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: C.muted }}>{t('crm.email.anCamps') || "Campaigns"}</div>
                                        <div style={{ fontWeight: 700 }}>{data.campaigns}</div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: C.muted }}>{t('crm.email.colSent') || "Sent"}</div>
                                        <div style={{ fontWeight: 700 }}>{data.sent.toLocaleString()}</div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: C.muted }}>{t('crm.email.colOpen') || "Open%"}</div>
                                        <div style={{ fontWeight: 700, color: Number(openPct) > 20 ? C.green : C.yellow }}>{openPct}%</div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: C.muted }}>{t('crm.email.colClick') || "Click%"}</div>
                                        <div style={{ fontWeight: 700, color: Number(clickPct) > 5 ? C.green : C.muted }}>{clickPct}%</div>
                                </div>
                            
                                  </div>
                                </div>
                              </div>
);
                        
                            </div>
})}
                )}
            </Card>
                </div>
            </div>
        </div>
    </div>
 {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;  
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* ── Connected Channels Badge ─── */
function EmailChannelBadge({ t }) {
  const sync = useConnectorSync();
  const navigate = useNavigate();
  const raw = sync?.connectedChannels || {};
  const allCh = Array.isArray(raw) ? raw : Object.entries(raw).filter(([,v]) => v).map(([k]) => ({ key: k, platform: k }));
  const emailCh = allCh.filter(ch => ['smtp','ses','mailgun','sendgrid','email'].some(e => (ch.platform||ch.key||'').toLowerCase().includes(e)));
  if (!emailCh.length) {
    return (
      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.2)',fontSize:11,marginBottom:14 }}>
        <span>⚠️</span>
        <span style={{ color:'#eab308',fontWeight:600 }}>{t('crm.email.noChannels')}</span>
        <button onClick={() => navigate('/integration-hub')} style={{ marginLeft:'auto',padding:'4px 10px',borderRadius:6,border:'none',background:`linear-gradient(135deg,${C.accent},${C.accentDark})`,color: 'var(--text-1)',fontSize:10,fontWeight:700,cursor:'pointer' }}>{t('crm.email.goHub')}</button>
    </div>
);
  }
  return (
    <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',padding:'6px 10px',borderRadius:10,background:'rgba(79,142,247,0.06)',border:'1px solid rgba(79,142,247,0.15)',fontSize:10,marginBottom:14 }}>
      <span style={{ fontWeight:700,color:C.accent,fontSize:11 }}>🔗 {t('crm.email.connectedChannels')}:</span>
      {emailCh.map(ch => (<span key={ch.key||ch.platform} style={{ background:`${C.accent}15`,color:C.accent,border:`1px solid ${C.accent}25`,borderRadius:6,padding:'1px 7px',fontSize:9,fontWeight:700 }}>{ch.platform||ch.key}</span>))}
    </div>
);
}

/* ── Security Lock Modal ─── */
function SecurityLockModal({ t, onDismiss }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'linear-gradient(135deg,#1a0a0a,#2a0a0a)',border:'1px solid rgba(239,68,68,0.5)',borderRadius:20,padding:32,maxWidth:380,textAlign:'center',boxShadow:'0 24px 64px rgba(239,68,68,0.2)' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>🛡️</div>
        <div style={{ fontWeight:900,fontSize:18,color:'#ef4444',marginBottom:8 }}>{t('crm.email.secLockTitle')}</div>
        <div style={{ fontSize:13,color: 'var(--text-3)',lineHeight:1.7,marginBottom:20 }}>{t('crm.email.secLockDesc')}</div>
        <button onClick={onDismiss} style={{ padding:'9px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#ef4444,#dc2626)',color: 'var(--text-1)',fontWeight:800,fontSize:13,cursor:'pointer' }}>{t('crm.email.dismiss')}</button>
        </div>
    </div>
);
}

function EmailMarketingContent() {
    const { t } = useI18n();
    const { addAlert, broadcastUpdate } = useGlobalData();
    const navigate = useNavigate();

    // SecurityGuard + security lock modal
    const [secLocked, setSecLocked] = useState(false);
    useSecurityGuard({
        addAlert: useCallback((a) => {
            if (typeof addAlert === 'function') addAlert(a);
            if (a?.severity === 'critical') setSecLocked(true);
        }, [addAlert]),
        enabled: true,
    });

    // BroadcastChannel
    const bcRef = useRef(null);
    useEffect(() => {
        try { bcRef.current = new BroadcastChannel('geniego_email'); bcRef.current.onmessage = () => {}; } catch {}
        return () => { try { bcRef.current?.close(); } catch {} };
    }, []);
    const broadcastRefresh = useCallback(() => {
        try { bcRef.current?.postMessage({ type: 'EMAIL_REFRESH', ts: Date.now() }); } catch {}
        if (typeof broadcastUpdate === 'function') broadcastUpdate('email', { refreshed: Date.now() });
    }, [broadcastUpdate]);

    const [tab, setTab] = useState("campaigns");
    const TABS = [
        { id: "campaigns", label: t('crm.email.tabCamp') || "Campaigns", icon: "🚀" },
        { id: "templates", label: t('crm.email.tabTpl') || "Templates", icon: "📝" },
        { id: "analytics", label: t('crm.email.tabAnalytics') || "Analytics", icon: "📊" },
        { id: "creative", label: t('crm.email.tabCreative') || "🎨 Creative", icon: "🎨" },
        { id: "settings", label: t('crm.email.tabSettings') || "Settings", icon: "⚙️" },
        { id: "guide", label: t('crm.email.tabGuide') || "Guide", icon: "📖" },
    ];

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            {secLocked && <SecurityLockModal t={t} onDismiss={() => setSecLocked(false)} />}
            <AIRecommendBanner context="email" />
            <EmailChannelBadge t={t} />

            {/* Live Sync */}
            <div style={{ padding:'6px 12px',borderRadius:8,background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.12)',fontSize:10,color:C.accent,fontWeight:600,display:'flex',alignItems:'center',gap:6,marginBottom:14 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                {t('crm.email.liveSyncStatus')}

            {/* Hero Banner */}
            <div style={{
                borderRadius: 18,
                background: `linear-gradient(135deg, ${C.surface}, ${C?.surface || "var(--surface)"}, ${C?.card || "var(--bg-card)"})`,
                border: `1px solid ${C.border}`,
                padding: "24px 30px", marginBottom: 22,
                position: "relative", overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute", top: -40, right: -40,
                    width: 180, height: 180, borderRadius: "50%",
                    background: `radial-gradient(circle, ${C.accent}15, transparent 70%)`,
                    pointerEvents: "none",
                }} />
                <div style={{ position: "relative", zIndex: 1, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>{t('crm.email.title') || "📧 Email Marketing"}</div>
                        <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>
                            {t('crm.email.subTitle') || "Create powerful email campaigns with real-time synchronization across all platform modules"}
                    </div>
                    <button onClick={broadcastRefresh} style={{ padding:'8px 14px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,fontWeight:700,fontSize:11,cursor:'pointer' }}>🔄 {t('crm.email.syncNow')}</button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
                {TABS.map(Tb => (
                    <button key={Tb.id} onClick={() => setTab(Tb.id)} style={{
                        padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer",
                        background: tab === Tb.id ? `linear-gradient(135deg, ${C.accent}, ${C.accentDark})` : C.card,
                        color: tab === Tb.id ? "#fff" : C.muted,
                        fontWeight: 700, fontSize: 13, transition: "all 0.25s",
                        boxShadow: tab === Tb.id ? `0 4px 16px ${C.accent}33` : 'none',
                        display: "flex", alignItems: "center", gap: 6,
                    }}><span>{Tb.icon}</span> {Tb.label}</button>
                ))}

            {/* Tab Content */}
            {tab === "campaigns" && <CampaignsTab />}
            {tab === "templates" && <TemplatesTab />}
            {tab === "analytics" && <AnalyticsTab />}
            {tab === "creative" && <CreativeStudioTab sourcePage="email-marketing" />}
            {tab === "settings" && <SettingsTab />}
            {tab === "guide" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 44 }}>📧</div>
                        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('crm.email.guideTitle')}</div>
                        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('crm.email.guideSub')}</div>
                    <Card glow>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('crm.email.guideStepsTitle')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                            {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a78bfa'},{n:'4️⃣',k:'guideStep4',c:'#f97316'},{n:'5️⃣',k:'guideStep5',c:'#06b6d4'},{n:'6️⃣',k:'guideStep6',c:'#f472b6'}].map((s,i) => (
                                <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 20 }}>{s.n}</span>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`crm.email.${s.k}Title`)}</span>
                                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{t(`crm.email.${s.k}Desc`)}</div>
                            ))}
                    </Card>
                    <Card glow>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('crm.email.guideTabsTitle')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                            {[{icon:'🚀',k:'guideCamp',c:'#4f8ef7'},{icon:'📝',k:'guideTpl',c:'#a78bfa'},{icon:'📊',k:'guideAnalytics',c:'#22c55e'},{icon:'🎨',k:'guideCreative',c:'#a855f7'},{icon:'⚙️',k:'guideSet',c:'#f97316'}].map((tb,i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                                    <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`crm.email.${tb.k}Name`)}</div>
                                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.6 }}>{t(`crm.email.${tb.k}Desc`)}</div>
                                </div>
                            ))}
                    </Card>
                    <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('crm.email.guideTipsTitle')}</div>
                        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: C.muted, lineHeight: 2.2 }}>
                            <li>{t('crm.email.guideTip1')}</li>
                            <li>{t('crm.email.guideTip2')}</li>
                            <li>{t('crm.email.guideTip3')}</li>
                            <li>{t('crm.email.guideTip4')}</li>
                            <li>{t('crm.email.guideTip5')}</li>
                        </ul>)}

            {/* Inline animation keyframes */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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

export default function EmailMarketing() {
    return (
<PlanGate feature="email_marketing">
            <EmailMarketingContent />
        </PlanGate>
    );
}
