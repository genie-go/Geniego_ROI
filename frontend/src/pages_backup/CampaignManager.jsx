import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AIRecommendTab } from './AIRecommendTab.jsx';
import AIMarketingHub from './AIMarketingHub.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import ApprovalModal from '../components/ApprovalModal.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { UnifiedAnalyticsTab, AiPredictiveEngineTab } from './CampaignEnterpriseTabs.jsx';

// currency formatting via useCurrency fmt() — NaN-safe
const pct = v => { const n = Number(v); return (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%'; };
const fmtM = v => v >= 1e8 ? (v / 1e8).toFixed(1) + "B" : v >= 1e4 ? (v / 1e4).toFixed(0) + "M" : String(v);

const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
);
const KpiCard = ({ label, value, sub, color = "#4f8ef7", icon }) => (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 18, opacity: .7 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color, marginTop: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
);

const Bar = ({ v, max = 1, color = "#4f8ef7", h = 6 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.06)", borderRadius: h }}>
        <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width .5s" }} />
    </div>
);

/* ─── Overview Tab ─── */
function OverviewTab({ campaigns, onSelect, onApprove }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [filter, setFilter] = useState("all");
    const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

    const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const activeCnt = campaigns.filter(c => c.status === "active").length;

    const STATUS_META = {
        active: { label: t('campaignMgr.statusActive'), color: "#22c55e" },
        scheduled: { label: t('campaignMgr.statusScheduled'), color: "#4f8ef7" },
        ended: { label: t('campaignMgr.statusEnded'), color: "var(--text-3)" },
        paused: { label: t('campaignMgr.statusPaused'), color: "#eab308" },
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                <KpiCard label={t('campaignMgr.kpiTotal')} value={campaigns.length + t('campaignMgr.countUnit')} color="#4f8ef7" icon="📣" />
                <KpiCard label={t('campaignMgr.kpiActive')} value={activeCnt + t('campaignMgr.countUnit')} color="#22c55e" icon="▶" />
                <KpiCard label={t('campaignMgr.kpiBudget')} value={fmt(totalBudget)} color="#a855f7" icon="💰" />
                <KpiCard label={t('campaignMgr.kpiSpent')} value={fmt(totalSpent)} sub={pct(totalBudget > 0 ? totalSpent / totalBudget : 0) + " " + t('campaignMgr.spent')} color="#f97316" icon="📊" />
            </div>

            <div style={{ display: "flex", gap: 6 }}>
                {["all", "active", "scheduled", "ended"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: "5px 14px", borderRadius: 20, border: "1px solid var(--border)",
                        background: filter === f ? "#4f8ef7" : "transparent",
                        color: filter === f ? "#fff" : "var(--text-2)", cursor: "pointer", fontSize: 11, fontWeight: 700
                    }}>
                        {f === "all" ? t('campaignMgr.filterAll') : STATUS_META[f]?.label}
                    </button>
                ))}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {filtered.map(c => {
                    const sm = STATUS_META[c.status] || STATUS_META.ended;
                    const spentPct = c.budget > 0 ? c.spent / c.budget : 0;
                    return (
                        <div key={c.id} className="card card-glass" style={{ borderLeft: `3px solid ${sm.color}`, cursor: "pointer" }}
                            onClick={() => onSelect(c)}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 14 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                        {c.startDate} ~ {c.endDate} · {t('campaignMgr.manager')}: {c.manager}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <Tag label={sm.label} color={sm.color} />
                                    <Tag label={c.type} color="#6366f1" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 12, marginBottom: 12 }}>
                                {[
                                    [t('campaignMgr.budget'), fmt(c.budget), "#a855f7"],
                                    [t('campaignMgr.spent'), fmt(c.spent), "#f97316"],
                                    [t('campaignMgr.targetRoas'), c.kpi.targetRoas + "x", "#4f8ef7"],
                                    [t('campaignMgr.actualRoas'), c.kpi.actualRoas ? c.kpi.actualRoas + "x" : "—",
                                        c.kpi.actualRoas ? (c.kpi.actualRoas >= c.kpi.targetRoas ? "#22c55e" : "#ef4444") : "var(--text-3)"],
                                ].map(([l, v, col]) => (
                                    <div key={l}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{l}</div>
                                        <div style={{ fontWeight: 800, color: col, fontSize: 13 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                                    <span style={{ color: "var(--text-3)" }}>{t('campaignMgr.burnRate')}</span>
                                    <span style={{ fontWeight: 700, color: spentPct > 0.9 ? "#ef4444" : "#22c55e" }}>{pct(spentPct)}</span>
                                </div>
                                <Bar v={c.spent} max={c.budget} color={spentPct > 0.9 ? "#ef4444" : spentPct > 0.7 ? "#eab308" : "#22c55e"} />
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                                {Object.keys(c.channels).map(ch => (
                                    <Tag key={ch} label={CH_NAME[ch] || ch} color={CH_COLOR[ch]} />
                                ))}
                                {c.influencers.length > 0 && <Tag label={`👥 ${c.influencers.length}${t('campaignMgr.personUnit')}`} color="#14d9b0" />}
                                {/* scheduled Campaign Activate Approve Button */}
                                {c.status === 'scheduled' && onApprove && (
                                    <button
                                        onClick={e => { e.stopPropagation(); onApprove(c); }}
                                        style={{
                                            marginLeft: 'auto', padding: '4px 12px',
                                            borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)',
                                            background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                                            fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >
                                        ✅ {t('campaignMgr.activateApprove')}

// currency formatting via useCurrency fmt() — NaN-safe
const pct = v => { const n = Number(v); return (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%'; };
const fmtM = v => v >= 1e8 ? (v / 1e8).toFixed(1) + "B" : v >= 1e4 ? (v / 1e4).toFixed(0) + "M" : String(v);

const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
);
const KpiCard = ({ label, value, sub, color = "#4f8ef7", icon }) => (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 18, opacity: .7 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color, marginTop: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
);

const Bar = ({ v, max = 1, color = "#4f8ef7", h = 6 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.06)", borderRadius: h }}>
        <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width .5s" }} />
    </div>
);

/* ─── Overview Tab ─── */
function OverviewTab({ campaigns, onSelect, onApprove }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [filter, setFilter] = useState("all");
    const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

    const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const activeCnt = campaigns.filter(c => c.status === "active").length;

    const STATUS_META = {
        active: { label: t('campaignMgr.statusActive'), color: "#22c55e" },
        scheduled: { label: t('campaignMgr.statusScheduled'), color: "#4f8ef7" },
        ended: { label: t('campaignMgr.statusEnded'), color: "var(--text-3)" },
        paused: { label: t('campaignMgr.statusPaused'), color: "#eab308" },
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                <KpiCard label={t('campaignMgr.kpiTotal')} value={campaigns.length + t('campaignMgr.countUnit')} color="#4f8ef7" icon="📣" />
                <KpiCard label={t('campaignMgr.kpiActive')} value={activeCnt + t('campaignMgr.countUnit')} color="#22c55e" icon="▶" />
                <KpiCard label={t('campaignMgr.kpiBudget')} value={fmt(totalBudget)} color="#a855f7" icon="💰" />
                <KpiCard label={t('campaignMgr.kpiSpent')} value={fmt(totalSpent)} sub={pct(totalBudget > 0 ? totalSpent / totalBudget : 0) + " " + t('campaignMgr.spent')} color="#f97316" icon="📊" />
            </div>

            <div style={{ display: "flex", gap: 6 }}>
                {["all", "active", "scheduled", "ended"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: "5px 14px", borderRadius: 20, border: "1px solid var(--border)",
                        background: filter === f ? "#4f8ef7" : "transparent",
                        color: filter === f ? "#fff" : "var(--text-2)", cursor: "pointer", fontSize: 11, fontWeight: 700
                    }}>
                        {f === "all" ? t('campaignMgr.filterAll') : STATUS_META[f]?.label}
                    </button>
                ))}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {filtered.map(c => {
                    const sm = STATUS_META[c.status] || STATUS_META.ended;
                    const spentPct = c.budget > 0 ? c.spent / c.budget : 0;
                    return (
                        <div key={c.id} className="card card-glass" style={{ borderLeft: `3px solid ${sm.color}`, cursor: "pointer" }}
                            onClick={() => onSelect(c)}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 14 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                        {c.startDate} ~ {c.endDate} · {t('campaignMgr.manager')}: {c.manager}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <Tag label={sm.label} color={sm.color} />
                                    <Tag label={c.type} color="#6366f1" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 12, marginBottom: 12 }}>
                                {[
                                    [t('campaignMgr.budget'), fmt(c.budget), "#a855f7"],
                                    [t('campaignMgr.spent'), fmt(c.spent), "#f97316"],
                                    [t('campaignMgr.targetRoas'), c.kpi.targetRoas + "x", "#4f8ef7"],
                                    [t('campaignMgr.actualRoas'), c.kpi.actualRoas ? c.kpi.actualRoas + "x" : "—",
                                        c.kpi.actualRoas ? (c.kpi.actualRoas >= c.kpi.targetRoas ? "#22c55e" : "#ef4444") : "var(--text-3)"],
                                ].map(([l, v, col]) => (
                                    <div key={l}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{l}</div>
                                        <div style={{ fontWeight: 800, color: col, fontSize: 13 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                                    <span style={{ color: "var(--text-3)" }}>{t('campaignMgr.burnRate')}</span>
                                    <span style={{ fontWeight: 700, color: spentPct > 0.9 ? "#ef4444" : "#22c55e" }}>{pct(spentPct)}</span>
                                </div>
                                <Bar v={c.spent} max={c.budget} color={spentPct > 0.9 ? "#ef4444" : spentPct > 0.7 ? "#eab308" : "#22c55e"} />
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                                {Object.keys(c.channels).map(ch => (
                                    <Tag key={ch} label={CH_NAME[ch] || ch} color={CH_COLOR[ch]} />
                                ))}
                                {c.influencers.length > 0 && <Tag label={`👥 ${c.influencers.length}${t('campaignMgr.personUnit')}`} color="#14d9b0" />}
                                {c.status === 'scheduled' && onApprove && (
                                    <button
                                        onClick={e => { e.stopPropagation(); onApprove(c); }}
                                        style={{
                                            marginLeft: 'auto', padding: '4px 12px',
                                            borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)',
                                            background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                                            fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >
                                        ✅ {t('campaignMgr.activateApprove')}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
        </div>
    </div>
    );
}

/* ─── Detail Tab ─── */
function CampaignDetailTab({ campaign }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();

    const STATUS_META = {
        active: { label: t('campaignMgr.statusActive'), color: "#22c55e" },
        scheduled: { label: t('campaignMgr.statusScheduled'), color: "#4f8ef7" },
        ended: { label: t('campaignMgr.statusEnded'), color: "var(--text-3)" },
        paused: { label: t('campaignMgr.statusPaused'), color: "#eab308" },
    };

    if (!campaign) return (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            {t('campaignMgr.selectCampaignHint')}
        </div>
    );
    const c = campaign;
    const sm = STATUS_META[c.status] || STATUS_META.ended;

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{c.startDate} ~ {c.endDate} · {c.manager}</div>
                </div>
                <Tag label={sm.label} color={sm.color} />
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📊 {t('campaignMgr.kpiSection')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
                    {[
                        { label: "ROAS", target: c.kpi.targetRoas + "x", actual: c.kpi.actualRoas ? c.kpi.actualRoas + "x" : "—", good: c.kpi.actualRoas >= c.kpi.targetRoas },
                        { label: t('campaignMgr.conversions'), target: c.kpi.targetConv.toLocaleString() + t('campaignMgr.caseUnit'), actual: c.kpi.actualConv.toLocaleString() + t('campaignMgr.caseUnit'), good: c.kpi.actualConv >= c.kpi.targetConv },
                        { label: "CPA", target: fmt(c.kpi.targetCpa), actual: c.kpi.actualCpa ? fmt(c.kpi.actualCpa) : "—", good: !c.kpi.actualCpa || c.kpi.actualCpa <= c.kpi.targetCpa },
                    ].map(({ label, target, actual, good }) => (
                        <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${good !== undefined ? (good ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)") : "rgba(99,140,255,0.1)"}` }}>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>{label}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <div>
                                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>{t('campaignMgr.target')}</div>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{target}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>{t('campaignMgr.actual')}</div>
                                    <div style={{ fontWeight: 900, fontSize: 14, color: good !== undefined ? (good ? "#22c55e" : "#ef4444") : "var(--text-2)" }}>{actual}</div>
                                </div>
                            </div>
                            {good !== undefined && (
                                <div style={{ fontSize: 10, color: good ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                                    {good ? `✓ ${t('campaignMgr.goalAchieved')}` : `✗ ${t('campaignMgr.goalMissed')}`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📡 {t('campaignMgr.channelSection')}</div>
                <div style={{ display: "grid", gap: 12 }}>
                    {Object.entries(c.channels).map(([ch, budget]) => {
                        const spent = c.channelSpent[ch] || 0;
                        const color = CH_COLOR[ch];
                        return (
                            <div key={ch}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                                    <span style={{ fontWeight: 700, color }}>{CH_NAME[ch] || ch}</span>
                                    <span>
                                        <span style={{ color }}>{fmt(spent)}</span>
                                        <span style={{ color: "var(--text-3)" }}> / {fmt(budget)}</span>
                                        <span style={{ fontWeight: 700, marginLeft: 8 }}>{pct(budget > 0 ? spent / budget : 0)}</span>
                                    </span>
                                </div>
                                <Bar v={spent} max={budget} color={color} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {c.influencers.length > 0 && (
                <div className="card card-glass" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>👥 {t('campaignMgr.influencerSection')}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {c.influencers.map(inf => <Tag key={inf} label={inf} color="#14d9b0" />)}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Gantt Tab ─── */
function GanttTab({ campaigns }) {
    const { t } = useI18n();
    const months = t('campaignMgr.months') || ["Jan","Feb","Mar","Apr","May","Jun","Jul"];
    const monthList = Array.isArray(months) ? months : ["Jan","Feb","Mar","Apr","May","Jun","Jul"];
    const startOf2026 = new Date("2026-01-01").getTime();
    const daysInYear = 365;
    const toPercent = dateStr => Math.max(0, (new Date(dateStr).getTime() - startOf2026) / (daysInYear * 864e5) * 100);
    const widthPct = (start, end) => Math.min(100 - toPercent(start), Math.max(1, (new Date(end).getTime() - new Date(start).getTime()) / (daysInYear * 864e5) * 100));

    const STATUS_META = {
        active: { label: t('campaignMgr.statusActive'), color: "#22c55e" },
        scheduled: { label: t('campaignMgr.statusScheduled'), color: "#4f8ef7" },
        ended: { label: t('campaignMgr.statusEnded'), color: "var(--text-3)" },
        paused: { label: t('campaignMgr.statusPaused'), color: "#eab308" },
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📅 {t('campaignMgr.ganttTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 0, marginBottom: 8 }}>
                    <div />
                    <div style={{ display: "flex" }}>
                        {monthList.map((m, i) => (
                            <div key={i} style={{ flex: 1, fontSize: 9, color: "var(--text-3)", textAlign: "center", borderLeft: "1px solid rgba(99,140,255,0.08)" }}>
                                {m}
                            </div>
                        ))}
                    </div>
                </div>
                {campaigns.map(c => {
                    const sm = STATUS_META[c.status] || STATUS_META.ended;
                    const left = toPercent(c.startDate);
                    const width = widthPct(c.startDate, c.endDate);
                    return (
                        <div key={c.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 0, marginBottom: 10, alignItems: "center" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, paddingRight: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}
                            </div>
                            <div style={{ position: "relative", height: 28, background: "rgba(99,140,255,0.04)", borderRadius: 6, borderLeft: "1px solid rgba(99,140,255,0.08)" }}>
                                <div style={{
                                    position: "absolute", top: 4, height: 20, borderRadius: 6,
                                    left: `${Math.min(left, 95)}%`, width: `${width}%`,
                                    background: sm.color + "cc", display: "flex", alignItems: "center",
                                    paddingLeft: 6, fontSize: 9, fontWeight: 700, color: 'var(--text-1)', overflow: "hidden",
                                    minWidth: 20,
                                }}>
                                    {c.budget > 0 ? `${pct(c.budget > 0 ? c.spent / c.budget : 0)} ${t('campaignMgr.spent')}` : t('campaignMgr.statusScheduled')}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>
                    {t('campaignMgr.todayNote')}
                </div>
            </div>
        </div>
    );
}

/* ─── CRM Target Tab ─── */
function CrmTargetTab() {
    const { t } = useI18n();
    const [emailCampaigns, setEmailCampaigns] = useState([]);
    const [kakaoCampaigns, setKakaoCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/email/campaigns').then(r => r.json()).catch(() => ({ campaigns: [] })),
            fetch('/api/kakao/campaigns').then(r => r.json()).catch(() => ({ campaigns: [] })),
        ]).then(([em, kk]) => {
            setEmailCampaigns(em.campaigns || []);
            setKakaoCampaigns(kk.campaigns || []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('loading')}</div>;

    const S = ({ s }) => {
        const col = { sent: '#22c55e', draft: 'var(--text-3)', sending: '#eab308' }[s] || 'var(--text-3)';
        return <span style={{ fontSize: 10, fontWeight: 700, color: col }}>● {s}</span>;
    };

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            <div className="card card-glass" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>✉️ {t('campaignMgr.emailTitle')}</div>
                    <a href="/email-marketing" style={{ fontSize: 11, color: '#4f8ef7', textDecoration: 'none' }}>{t('campaignMgr.manage')} →</a>
                </div>
                {emailCampaigns.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '12px 0' }}>{t('campaignMgr.noEmail')}</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ color: 'var(--text-3)', fontSize: 11 }}>
                            {[t('campaignMgr.colName'), t('campaignMgr.colSegment'), t('campaignMgr.colSent'), t('campaignMgr.colOpenRate'), t('status')].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{emailCampaigns.map(c => {
                            const openRate = c.total_sent > 0 ? Math.round(c.opened / c.total_sent * 100) : 0;
                            return (
                                <tr key={c.id} style={{ borderTop: '1px solid rgba(99,140,255,0.07)' }}>
                                    <td style={{ padding: '7px 10px', fontWeight: 700 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</td>
                                    <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{c.segment_name || t('campaignMgr.allSegments')}</td>
                                    <td style={{ padding: '7px 10px' }}>{(c.total_sent || 0).toLocaleString()}</td>
                                    <td style={{ padding: '7px 10px', color: openRate > 20 ? '#22c55e' : 'var(--text-3)' }}>{openRate}%</td>
                                    <td style={{ padding: '7px 10px' }}><S s={(t("Data." + c.status) !== "Data." + c.status ? t("Data." + c.status) : c.status)} /></td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                )}
            </div>

            <div className="card card-glass" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>💬 {t('campaignMgr.kakaoTitle')}</div>
                    <a href="/kakao-channel" style={{ fontSize: 11, color: '#fee500', textDecoration: 'none' }}>{t('campaignMgr.manage')} →</a>
                </div>
                {kakaoCampaigns.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '12px 0' }}>{t('campaignMgr.noKakao')}</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ color: 'var(--text-3)', fontSize: 11 }}>
                            {[t('campaignMgr.colName'), t('campaignMgr.colSegment'), t('campaignMgr.colSent'), t('campaignMgr.colSuccess'), t('campaignMgr.colFailed'), t('status')].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{kakaoCampaigns.map(c => (
                            <tr key={c.id} style={{ borderTop: '1px solid rgba(99,140,255,0.07)' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 700 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</td>
                                <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{c.segment_name || t('campaignMgr.allSegments')}</td>
                                <td style={{ padding: '7px 10px' }}>{(c.total || 0).toLocaleString()}</td>
                                <td style={{ padding: '7px 10px', color: '#22c55e' }}>{c.success || 0}</td>
                                <td style={{ padding: '7px 10px', color: '#ef4444' }}>{c.failed || 0}</td>
                                <td style={{ padding: '7px 10px' }}><S s={(t("Data." + c.status) !== "Data." + c.status ? t("Data." + c.status) : c.status)} /></td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/* ─── ROI Dashboard Tab ─── */
function RoiDashboardTab({ campaigns }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const sorted = [...campaigns].sort((a, b) => {
        const roasA = a.kpi.actualRoas || a.kpi.targetRoas || 0;
        const roasB = b.kpi.actualRoas || b.kpi.targetRoas || 0;
        return roasB - roasA;
    });
    const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + ((c.spent || 0) * (c.kpi.actualRoas || c.kpi.targetRoas || 0)), 0);
    const avgRoas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : '0.00';
    const avgCpa = campaigns.length > 0
        ? Math.round(campaigns.reduce((s, c) => s + (c.kpi.actualCpa || c.kpi.targetCpa || 0), 0) / campaigns.length)
        : 0;
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <KpiCard label={t('campaignMgr.roiTotalSpent')} value={fmt(totalSpent)} color="#f97316" icon="💸" />
                <KpiCard label={t('campaignMgr.roiTotalRevenue')} value={fmt(totalRevenue)} color="#22c55e" icon="💸" />
                <KpiCard label={t('campaignMgr.roiAvgRoas')} value={avgRoas + 'x'} color="#4f8ef7" icon="💰" />
                <KpiCard label={t('campaignMgr.roiAvgCpa')} value={fmt(avgCpa)} color="#a855f7" icon="📈" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>🏆 {t('campaignMgr.roiRanking')}</div>
            {sorted.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>{t('campaignMgr.noCampaigns')}</div>
            ) : sorted.map((c, idx) => {
                const roas = c.kpi.actualRoas || c.kpi.targetRoas || 0;
                const revenue = (c.spent || 0) * roas;
                const roi = c.spent > 0 ? ((revenue - c.spent) / c.spent * 100).toFixed(1) : '0.0';
                const barColor = roas >= 3 ? "#22c55e" : roas >= 2 ? "#eab308" : "#ef4444";
                return (
                    <div key={c.id} style={{ padding: 14, borderRadius: 10, background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.08)", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: idx < 3 ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: 'var(--text-1)', flexShrink: 0 }}>
                            {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                            <Bar v={roas} max={6} color={barColor} h={4} />
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: 11, flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ color: "var(--text-3)", fontSize: 9 }}>ROAS</div>
                                <div style={{ fontWeight: 900, color: barColor }}>{roas}x</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ color: "var(--text-3)", fontSize: 9 }}>ROI</div>
                                <div style={{ fontWeight: 900, color: parseFloat(roi) > 0 ? "#22c55e" : "#ef4444" }}>{roi}%</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ color: "var(--text-3)", fontSize: 9 }}>{t('campaignMgr.spent')}</div>
                                <div style={{ fontWeight: 700, color: "#f97316" }}>{fmt(c.spent || 0)}</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── AI Copywriter Tab (ConnectorSync-Aware) ─── */
function AiCopywriterTab() {
    const { t } = useI18n();
    const { isConnected } = useConnectorSync();
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState("");
    const [channel, setChannel] = useState("meta");
    const [tone, setTone] = useState("professional");
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState([]);

    const CHANNELS = useMemo(() => [
        { id: "meta", label: "Meta Ads", icon: "📘", connKey: "meta_ads" },
        { id: "google", label: "Google Ads", icon: "🔍", connKey: "google_ads" },
        { id: "email", label: "Email", icon: "✉️", connKey: "email" },
        { id: "kakao", label: "KakaoTalk", icon: "💬", connKey: "kakao" },
        { id: "tiktok", label: "TikTok", icon: "🎵", connKey: "tiktok_ads" },
        { id: "sms", label: "SMS", icon: "📱", connKey: "sms" },
    ], []);

    const TONES = useMemo(() => [
        { id: "professional", label: t('campaignMgr.toneProfessional') },
        { id: "casual", label: t('campaignMgr.toneCasual') },
        { id: "urgent", label: t('campaignMgr.toneUrgent') },
        { id: "friendly", label: t('campaignMgr.toneFriendly') },
        { id: "luxury", label: t('campaignMgr.toneLuxury') },
    ], [t]);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) return;
        setGenerating(true);
        setResults([]);
        try {
            const res = await fetch('/api/ai/copywrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, channel, tone }),
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data.copies || []);
            }
        } catch { }
        setGenerating(false);
    }, [prompt, channel, tone]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>💬 {t('campaignMgr.aiCopyTitle')}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>{t('campaignMgr.copyChannel')}</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {CHANNELS.map(ch => {
                            const connected = isConnected(ch.connKey);
                            return (
                                <button key={ch.id} onClick={() => connected ? setChannel(ch.id) : navigate('/integration-hub?tab=keys&auto_request=1')}
                                    style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${channel === ch.id ? "#4f8ef7" : connected ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.25)"}`, background: channel === ch.id ? "rgba(79,142,247,0.15)" : "transparent", color: channel === ch.id ? "#4f8ef7" : connected ? "var(--text-3)" : "#f59e0b", cursor: "pointer", fontSize: 11, fontWeight: 700, opacity: connected ? 1 : 0.7 }}>
                                    {ch.icon} {ch.label} {!connected && '🔑'}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>{t('campaignMgr.copyTone')}</label>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {TONES.map(tn => (
                            <button key={tn.id} onClick={() => setTone(tn.id)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${tone === tn.id ? "#a855f7" : "rgba(255,255,255,0.1)"}`, background: tone === tn.id ? "rgba(168,85,247,0.15)" : "transparent", color: tone === tn.id ? "#a855f7" : "var(--text-3)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{tn.label}</button>
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('campaignMgr.copyPrompt')} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", background: "rgba(0,0,0,0.3)", color: 'var(--text-1)', fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
                <button onClick={handleGenerate} disabled={generating || !prompt.trim()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f8ef7,#a855f7)", color: 'var(--text-1)', fontWeight: 800, cursor: "pointer", opacity: generating ? 0.7 : 1 }}>{generating ? "⏳" : "🪄"} {generating ? t('campaignMgr.generating') : t('campaignMgr.generate')}</button>
            </div>
            {results.length > 0 && (
                <div style={{ display: "grid", gap: 12 }}>
                    {results.map(r => (
                        <div key={r.id} style={{ padding: 16, borderRadius: 12, background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.1)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{r.headline}</div>
                                <div style={{ padding: "3px 10px", borderRadius: 99, background: r.score >= 85 ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: r.score >= 85 ? "#22c55e" : "#eab308", fontSize: 11, fontWeight: 800 }}>{t('campaignMgr.copyScore')}: {r.score}</div>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 8 }}>{r.body}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#10b981)", color: 'var(--text-1)', fontWeight: 700 }}>{r.cta}</span>
                                <button onClick={() => navigator.clipboard?.writeText(r.headline + "\n" + r.body + "\n" + r.cta)} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#4f8ef7", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>📋 {t('campaignMgr.copyCopy')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Real-time Campaign Monitor ─── */
function CampaignMonitorTab({ campaigns }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const activeCampaigns = campaigns.filter(c => c.status === "active");
    const now = new Date();
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>📈 {t('campaignMgr.monitorTitle')}</div>
                <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>● LIVE {now.toLocaleTimeString()}</div>
            {activeCampaigns.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>{t('campaignMgr.noActive')}</div>
            ) : activeCampaigns.map(c => {
                const pct = c.budget > 0 ? (c.spent / c.budget * 100).toFixed(1) : '0.0';
                const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate) - now) / 864e5));
                const dailyBurn = daysLeft > 0 ? ((c.budget - c.spent) / daysLeft) : 0;
                const roas = c.kpi.actualRoas || c.kpi.targetRoas || 0;
                return (
                    <div key={c.id} style={{ padding: 18, borderRadius: 12, background: "rgba(9,15,30,0.6)", border: "1px solid rgba(34,197,94,0.15)", borderLeft: "4px solid #22c55e" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{c.startDate} ~ {c.endDate} · {daysLeft}{t('campaignMgr.daysLeft')}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: roas >= 3 ? "#22c55e" : roas >= 2 ? "#eab308" : "#ef4444" }}>{roas}x</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                            <div style={{ textAlign: "center", padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{t('campaignMgr.burnRate')}</div>
                                <div style={{ fontWeight: 900, color: parseFloat(pct) > 85 ? "#ef4444" : "#4f8ef7" }}>{pct}%</div>
                            <div style={{ textAlign: "center", padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{t('campaignMgr.dailyBudget')}</div>
                                <div style={{ fontWeight: 900, color: "#a855f7" }}>{fmt(Math.round(dailyBurn))}</div>
                            <div style={{ textAlign: "center", padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{t('campaignMgr.conversions')}</div>
                                <div style={{ fontWeight: 900, color: "#22c55e" }}>{c.kpi.actualConv || 0}</div>
                            <div style={{ textAlign: "center", padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>CPA</div>
                                <div style={{ fontWeight: 900, color: "#f97316" }}>{c.kpi.actualCpa ? fmt(c.kpi.actualCpa) : "—"}</div>
                        <div style={{ marginTop: 10 }}>
                            <Bar v={parseFloat(pct)} max={100} color={parseFloat(pct) > 85 ? "#ef4444" : "#22c55e"} h={4} />
                
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
            })}
        </div>
    </div>
"#ec4899", google: "#ea4335", naver: "#03cf5d", amazon: "#eab308", instagram: "#a855f7", kakao: "#fee500", coupang: "#e44d2e", influencer: "#14d9b0" };
const CH_NAME = { meta: "Meta Ads", tiktok: "TikTok", google: "Google Ads", naver: "Naver", amazon: "Amazon", instagram: "Instagram", kakao: "Kakao", coupang: "Coupang", influencer: "Influencer" };
const SYNC_CHANNEL = 'geniego-roi-global-sync';

export default function CampaignManager() {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const navigate = useNavigate();
    const { sharedCampaigns, updateCampaignStatus, abTestResults, aiRecommendationLog, activeRules, rulesFired, addAlert } = useGlobalData();
    const [tab, setTab] = useState("overview");
    const [selected, setSelected] = useState(null);
    const [approval, setApproval] = useState(null);
    const [localStatus, setLocalStatus] = useState({});

    // 🔒 SecurityGuard — enterprise security (XSS·CSRF·Clickjack·Brute-force)
    const _secAlert = useCallback((a) => { if (typeof addAlert === 'function') addAlert({ ...a, _src: 'CampaignManager' }); }, [addAlert]);
    useSecurityGuard({ addAlert: _secAlert, enabled: true });

    /* ── 🔄 Cross-Tab Real-time Sync ── */
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                bcRef.current = new BroadcastChannel(SYNC_CHANNEL);
                bcRef.current.onmessage = (e) => {
                    const { type } = e?.data || {};
                    if (type === 'CAMPAIGNS_UPDATE' || type === 'CONNECTOR_UPDATE') {
                        setSelected(null);
                        setTab('overview');
                    }
                };
            }
        } catch {}
        return () => { try { bcRef.current?.close(); } catch {} };
    }, []);

    const handleCampaignApproval = (campaign) => {
        setApproval({
            title: t('campaignMgr.approvalTitle'),
            subtitle: t('campaignMgr.approvalSubtitle', { name: campaign.name }),
            items: [
                { label: t('campaignMgr.colName'), value: campaign.name, color: '#4f8ef7' },
                { label: t('campaignMgr.budget'), value: '₩' + Number(campaign.budget).toLocaleString(), color: '#a855f7' },
                { label: t('campaignMgr.period'), value: `${campaign.startDate} ~ ${campaign.endDate}`, color: 'var(--text-1)' },
                { label: t('campaignMgr.manager'), value: campaign.manager, color: '#22c55e' },
            ],
            warnings: [
                t('campaignMgr.approvalWarn1'),
                t('campaignMgr.approvalWarn2'),
            ],
            requireNote: true,
            confirmText: t('campaignMgr.activateApprove'),
            confirmColor: '#22c55e',
            onConfirm: (note) => {
                setLocalStatus(prev => ({ ...prev, [campaign.id]: 'active' }));
                updateCampaignStatus?.(campaign.id, 'approved');
                setApproval(null);
            },
        });
    };

    const handleNewCampaign = () => {
        setApproval({
            title: t('campaignMgr.newCampaignTitle'),
            subtitle: t('campaignMgr.newCampaignSubtitle'),
            items: [
                { label: t('campaignMgr.campaignType'), value: t('campaignMgr.typeAutomation'), color: '#a855f7' },
                { label: t('campaignMgr.adChannels'), value: 'Meta / TikTok / Amazon', color: '#4f8ef7' },
                { label: t('campaignMgr.afterApproval'), value: t('campaignMgr.afterApprovalDesc'), color: '#22c55e' },
            ],
            warnings: [t('campaignMgr.newCampaignWarn')],
            requireNote: false,
            confirmText: t('campaignMgr.newCampaignConfirm'),
            confirmColor: '#a855f7',
            onConfirm: () => {
                setApproval(null);
                setTab('recommend');
            },
        });
    };

    const TABS = [
        { id: "overview", label: `📣 ${t('campaignMgr.tabOverview')}`, highlight: true },
        { id: "analytics", label: `🔬 ${t('campaignMgr.tabAnalytics', '통합 분석')}` },
        { id: "ab_test", label: `🧪 ${t('campaignMgr.tabAbTest')}` },
        { id: "detail", label: `🔍 ${t('campaignMgr.tabDetail')}` },
        { id: "gantt", label: `📅 ${t('campaignMgr.tabGantt')}` },
        { id: "crm_channel", label: `📧 ${t('campaignMgr.tabCrm')}` },
        { id: "roi_dashboard", label: `📊 ${t('campaignMgr.tabRoi')}` },
        { id: "monitor", label: `📈 ${t('campaignMgr.tabMonitor')}` },
        { id: "budget_alert", label: `🔔 ${t('campaignMgr.tabBudgetAlert')}` },
        { id: "copywriter", label: `💬 ${t('campaignMgr.tabCopywriter')}` },
        { id: "ai_engine", label: `🧠 ${t('campaignMgr.tabAiEngine', 'AI 예측 엔진')}` },
        { id: "guide", label: `📖 ${t('campaignMgr.tabGuide', '이용 가이드')}` },
    ];

    /* CAMPAIGNS: populated exclusively from GlobalDataContext.sharedCampaigns */

    const allCampaigns = useMemo(() => {
        const converted = sharedCampaigns.map(c => {
            const budget = c.budget || 0;
            const spent = c.spent || 0;
            const channels = {};
            if (c.allocations) {
                c.allocations.forEach(a => { if (a.ch?.id) channels[a.ch.id] = a.alloc; });
            } else if (c.adChannels) {
                c.adChannels.forEach(ch => { if (ch.id) channels[ch.id] = Math.round(budget / c.adChannels.length); });
            }
            return {
                id: c.id,
                name: c.name,
                status: c.status === 'pending' ? 'scheduled' : c.status === 'approved' ? 'active' : c.status,
                type: t('campaignMgr.typeAutomation'),
                startDate: c.startDate || new Date().toISOString().slice(0, 10),
                endDate: c.endDate || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
                budget,
                spent,
                channels,
                channelSpent: c.channelSpent || {},
                kpi: {
                    targetRoas: parseFloat(c.estimatedRoas) || 3.5,
                    actualRoas: c.actualRoas || c.roas || null,
                    targetConv: c.totalConversions || c.conv || 0,
                    actualConv: c.actualConv || c.conv || 0,
                    targetCpa: 20000,
                    actualCpa: c.actualCpa || (c.conv > 0 && spent > 0 ? Math.round(spent / c.conv) : null)
                },
                influencers: c.influencers || [],
                manager: t('campaignMgr.managerAI'),
                _isShared: true,
            };
        });
        return converted;
    }, [sharedCampaigns, t]);

    const handleSelect = c => {
        setSelected(c);
        setTab("detail");
    };

    return (
<div style={{ display: "grid", gap: 16 }}>
            {/* 관리자 Approve Modal */}
            {approval && (
                <ApprovalModal
                    {...approval}
                    onCancel={() => setApproval(null)}
                />
            )}

            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>📋 {t('campaignMgr.pageTitle')}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                            {t('campaignMgr.pageSub')}
                            {sharedCampaigns.length > 0 && (
                                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 99, fontSize: 9, background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)", fontWeight: 700 }}>
                                    🚀 {t('campaignMgr.automationLinked', { n: sharedCampaigns.length })}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={() => navigate('/auto-marketing')}
                            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontSize: 11, fontWeight: 600 }}
                        >🚀 {t('campaignMgr.btnAutoMarketing')}</button>
                        <button
                            onClick={handleNewCampaign}
                            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer", background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: 11, fontWeight: 700 }}
                        >🎯 {t('campaignMgr.newCampaignBtn')}</button>
                        <button className="btn-primary"
                            onClick={() => setTab('recommend')}
                            style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)", fontSize: 12, fontWeight: 800 }}>
                            🚀 {t('campaignMgr.btnAiRecommend')}
                        </button>
                    </div>
                </div>
            </div>

            {aiRecommendationLog && aiRecommendationLog.length > 0 && (
                <div style={{ padding: '12px 18px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: '#a855f7' }}>🤖 {t('campaignMgr.aiHubLinked', { n: aiRecommendationLog.length })}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                            {t('campaignMgr.latest')}: {aiRecommendationLog[0]?.title} ??{aiRecommendationLog[0]?.executedAt}
                            {activeRules.length > 0 && <span style={{ marginLeft: 10, color: '#eab308' }}>⚡ {t('campaignMgr.activeRules', { n: activeRules.length, f: rulesFired.length })}</span>}
                        </div>
                    </div>
                    <button onClick={() => navigate('/ai-marketing-hub')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{t('campaignMgr.viewAiHub')} →</button>
                </div>
            )}

            {rulesFired && rulesFired.length > 0 && (
                <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#eab308', fontWeight: 700 }}>??{t('campaignMgr.rulesFired', { n: rulesFired.length, r: rulesFired[0]?.ruleName })}</div>
                    <button onClick={() => navigate('/ai-rule-engine')} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', background: 'rgba(234,179,8,0.12)', color: '#eab308', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>{t('campaignMgr.ruleEngine')} →</button>
                </div>
            )}

            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${TABS.length},1fr)` }}>
                    {TABS.map(tabItem => (
                        <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{
                            padding: "13px 8px", border: "none", cursor: "pointer", textAlign: "center",
                            background: tab === tabItem.id
                                ? (tabItem.highlight ? "linear-gradient(135deg,rgba(79,142,247,0.15),rgba(168,85,247,0.15))" : "rgba(99,102,241,0.08)")
                                : "transparent",
                            borderBottom: `2px solid ${tab === tabItem.id ? (tabItem.highlight ? '#a855f7' : '#6366f1') : 'transparent'}`,
                            fontSize: 11, fontWeight: 800,
                            color: tab === tabItem.id ? (tabItem.highlight ? '#a855f7' : 'var(--text-1)') : 'var(--text-2)',
                            transition: "all 200ms", whiteSpace: 'nowrap',
                        }}>{tabItem.label}</button>
                    ))}
                </div>
            </div>

            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "overview" && <OverviewTab campaigns={allCampaigns} onSelect={handleSelect} onApprove={handleCampaignApproval} />}
                {tab === "detail" && <DetailTab campaign={selected} />}
                {tab === "gantt" && <GanttTab campaigns={allCampaigns} />}
                {tab === "crm_channel" && <CrmChannelTab />}
                {tab === "roi_dashboard" && <RoiDashboardTab campaigns={allCampaigns} />}
                {tab === "monitor" && <CampaignMonitorTab campaigns={allCampaigns} />}
                {tab === "budget_alert" && <BudgetAlertTab campaigns={allCampaigns} />}
                {tab === "copywriter" && <AiCopywriterTab />}
                {tab === "analytics" && <UnifiedAnalyticsTab campaigns={allCampaigns} />}
                {tab === "ai_engine" && <AiPredictiveEngineTab campaigns={allCampaigns} />}
                {tab === "recommend" && <AIRecommendTab />}
                {tab === "guide" && (
                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                        <div className="card card-glass" style={{ background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor:'rgba(79,142,247,0.3)', textAlign:'center', padding:32 }}>
                            <div style={{ fontSize:44 }}>📊</div>
                            <div style={{ fontWeight:900, fontSize:22, marginTop:8 }}>{t('campaignMgr.guideTitle')}</div>
                            <div style={{ fontSize:13, color:'var(--text-3)', marginTop:6, maxWidth:560, margin:'6px auto 0', lineHeight:1.7 }}>{t('campaignMgr.guideSub')}</div>
                        </div>
                        <div className="card card-glass" style={{ padding:20 }}>
                            <div style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>{t('campaignMgr.guideStepsTitle')}</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                                {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},{n:'4️⃣',k:'guideStep4',c:'#f59e0b'},{n:'5️⃣',k:'guideStep5',c:'#f97316'},{n:'6️⃣',k:'guideStep6',c:'#06b6d4'}].map((s,i) => (
                                    <div key={i} style={{ background:s.c+'0a', border:`1px solid ${s.c}25`, borderRadius:12, padding:16 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                            <span style={{ fontSize:20 }}>{s.n}</span>
                                            <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{t(`campaignMgr.${s.k}Title`)}</span>
                                        </div>
                                        <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7 }}>{t(`campaignMgr.${s.k}Desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card card-glass" style={{ padding:20 }}>
                            <div style={{ fontWeight:800, fontSize:17, marginBottom:16 }}>{t('campaignMgr.guideTabsTitle')}</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                                {[{icon:'📣',k:'guideTabOverview',c:'#4f8ef7'},{icon:'🔬',k:'guideTabAnalytics',c:'#06b6d4'},{icon:'🧪',k:'guideTabAb',c:'#22c55e'},{icon:'🔍',k:'guideTabDetail',c:'#a855f7'},{icon:'📅',k:'guideTabGantt',c:'#f59e0b'},{icon:'📧',k:'guideTabCrm',c:'#f97316'},{icon:'📊',k:'guideTabRoi',c:'#06b6d4'},{icon:'📈',k:'guideTabMonitor',c:'#ec4899'},{icon:'🔔',k:'guideTabBudget',c:'#ef4444'},{icon:'💬',k:'guideTabCopy',c:'#8b5cf6'},{icon:'🧠',k:'guideTabAiEngine',c:'#f472b6'}].map((tb,i) => (
                                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', background: 'var(--surface)', borderRadius:10, border:'1px solid rgba(99,140,255,0.08)' }}>
                                        <span style={{ fontSize:20, flexShrink:0 }}>{tb.icon}</span>
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:12, color:tb.c }}>{t(`campaignMgr.${tb.k}Name`)}</div>
                                            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2, lineHeight:1.6 }}>{t(`campaignMgr.${tb.k}Desc`)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="card card-glass" style={{ padding:20, background:'rgba(34,197,94,0.05)', borderColor:'rgba(34,197,94,0.3)' }}>
                            <div style={{ fontWeight:800, fontSize:17, marginBottom:12 }}>💡 {t('campaignMgr.guideTipsTitle')}</div>
                            <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'var(--text-3)', lineHeight:2.2 }}>
                                <li>{t('campaignMgr.guideTip1')}</li>
                                <li>{t('campaignMgr.guideTip2')}</li>
                                <li>{t('campaignMgr.guideTip3')}</li>
                                <li>{t('campaignMgr.guideTip4')}</li>
                                <li>{t('campaignMgr.guideTip5')}</li>
                            </ul>
                        </div>
                    </div>
                )}
                
                {tab === "ab_test" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>🧪 {t('campaignMgr.abTitle')}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('campaignMgr.abSub')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => navigate('/email-marketing')} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(99,102,241,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>📧 {t('campaignMgr.emailAb')} →</button>
                                <button onClick={() => navigate('/attribution')} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(99,102,241,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>📈 Attribution A/B →</button>
                            </div>
                        </div>
                        {abTestResults.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                                {t('campaignMgr.abEmpty')}
                                <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
                                    <button onClick={() => navigate('/email-marketing')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>📧 {t('campaignMgr.startEmailAb')}</button>
                                    <button onClick={() => navigate('/attribution')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>📈 Attribution A/B</button>
                                </div>
                            </div>
                        ) : (
                            abTestResults.map(test => (
                                <div key={test.id} className="card card-glass" style={{ padding: 16, borderLeft: '3px solid #22c55e' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{test.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('campaignMgr.completed')}: {test.completedAt} · {t('campaignMgr.source')}: {test.source}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 900, color: '#22c55e', fontSize: 14 }}>🏆 {test.winner?.toUpperCase()} {t('campaignMgr.winner')}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('campaignMgr.confidence')} {test.confidence}% (p={test.pValue})</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
