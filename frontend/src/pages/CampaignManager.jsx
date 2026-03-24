import React, { useState, useMemo, useCallback, useEffect } from "react";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import MediaEditor from '../components/MediaEditor.jsx';
import { AIRecommendTab } from './AIRecommendTab.jsx';
import AIMarketingHub from './AIMarketingHub.jsx';
import { CAT_OPTIONS, PRODUCT_CATALOG, CAT_TO_PRODUCT } from './campaignConstants.js';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import ApprovalModal from '../components/ApprovalModal.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const API = '/api';

// currency formatting via useCurrency fmt()
const pct = v => (Number(v) * 100).toFixed(1) + "%";
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

/* ─── Overview Tab ─────────────────────────────────────── */
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
                <KpiCard label={t('campaignMgr.kpiSpent')} value={fmt(totalSpent)} sub={pct(totalSpent / totalBudget) + " " + t('campaignMgr.spent')} color="#f97316" icon="📊" />
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
                                    <div style={{ fontWeight: 800, fontSize: 14 }}>{(t("demo." + c.name) !== "demo." + c.name ? t("demo." + c.name) : c.name)}</div>
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
                                    <Tag key={ch} label={CH_NAME[ch] || ch} color={CH_COLOR[ch] || "#4f8ef7"} />
                                ))}
                                {c.influencers.length > 0 && <Tag label={`👤 ${c.influencers.length}${t('campaignMgr.personUnit')}`} color="#14d9b0" />}
                                {/* 🔐 scheduled Campaign Activate Approve Button */}
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
                                        🔐 {t('campaignMgr.activateApprove')}
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

/* ─── Detail Tab ─────────────────────────────────────── */
function DetailTab({ campaign }) {
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
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{(t("demo." + c.name) !== "demo." + c.name ? t("demo." + c.name) : c.name)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{c.startDate} ~ {c.endDate} · {c.manager}</div>
                </div>
                <Tag label={sm.label} color={sm.color} />
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>🎯 {t('campaignMgr.kpiSection')}</div>
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
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>💰 {t('campaignMgr.channelSection')}</div>
                <div style={{ display: "grid", gap: 12 }}>
                    {Object.entries(c.channels).map(([ch, budget]) => {
                        const spent = c.channelSpent[ch] || 0;
                        const color = CH_COLOR[ch] || "#4f8ef7";
                        return (
                            <div key={ch}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                                    <span style={{ fontWeight: 700, color }}>{CH_NAME[ch] || ch}</span>
                                    <span>
                                        <span style={{ color }}>{fmt(spent)}</span>
                                        <span style={{ color: "var(--text-3)" }}> / {fmt(budget)}</span>
                                        <span style={{ fontWeight: 700, marginLeft: 8 }}>{pct(spent / budget)}</span>
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
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>👤 {t('campaignMgr.influencerSection')}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {c.influencers.map(inf => <Tag key={inf} label={inf} color="#14d9b0" />)}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Gantt Tab ───────────────────────────────────────── */
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
                                {(t("demo." + c.name) !== "demo." + c.name ? t("demo." + c.name) : c.name)}
                            </div>
                            <div style={{ position: "relative", height: 28, background: "rgba(99,140,255,0.04)", borderRadius: 6, borderLeft: "1px solid rgba(99,140,255,0.08)" }}>
                                <div style={{
                                    position: "absolute", top: 4, height: 20, borderRadius: 6,
                                    left: `${Math.min(left, 95)}%`, width: `${width}%`,
                                    background: sm.color + "cc", display: "flex", alignItems: "center",
                                    paddingLeft: 6, fontSize: 9, fontWeight: 700, color: "#fff", overflow: "hidden",
                                    minWidth: 20,
                                }}>
                                    {c.budget > 0 ? `${pct(c.spent / c.budget)} ${t('campaignMgr.spent')}` : t('campaignMgr.statusScheduled')}
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

/* ─── CRM Channel Tab ─────────────────────────────────── */
function CrmChannelTab() {
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
                                    <td style={{ padding: '7px 10px', fontWeight: 700 }}>{(t("demo." + c.name) !== "demo." + c.name ? t("demo." + c.name) : c.name)}</td>
                                    <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{c.segment_name || t('campaignMgr.allSegments')}</td>
                                    <td style={{ padding: '7px 10px' }}>{(c.total_sent || 0).toLocaleString()}</td>
                                    <td style={{ padding: '7px 10px', color: openRate > 20 ? '#22c55e' : 'var(--text-3)' }}>{openRate}%</td>
                                    <td style={{ padding: '7px 10px' }}><S s={(t("demo." + c.status) !== "demo." + c.status ? t("demo." + c.status) : c.status)} /></td>
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
                                <td style={{ padding: '7px 10px', fontWeight: 700 }}>{(t("demo." + c.name) !== "demo." + c.name ? t("demo." + c.name) : c.name)}</td>
                                <td style={{ padding: '7px 10px', color: 'var(--text-3)' }}>{c.segment_name || t('campaignMgr.allSegments')}</td>
                                <td style={{ padding: '7px 10px' }}>{(c.total || 0).toLocaleString()}</td>
                                <td style={{ padding: '7px 10px', color: '#22c55e' }}>{c.success || 0}</td>
                                <td style={{ padding: '7px 10px', color: '#ef4444' }}>{c.failed || 0}</td>
                                <td style={{ padding: '7px 10px' }}><S s={(t("demo." + c.status) !== "demo." + c.status ? t("demo." + c.status) : c.status)} /></td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const CH_COLOR = { meta: "#4f8ef7", tiktok: "#ec4899", amazon: "#eab308", instagram: "#a855f7", influencer: "#14d9b0" };
const CH_NAME = { meta: "Meta Ads", tiktok: "TikTok", amazon: "Amazon", instagram: "Instagram", influencer: "Influencer" };

export default function CampaignManager() {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const navigate = useNavigate();
    const { sharedCampaigns, updateCampaignStatus, abTestResults, aiRecommendationLog, activeRules, rulesFired } = useGlobalData();
    const [tab, setTab] = useState("recommend");
    const [selected, setSelected] = useState(null);
    const [approval, setApproval] = useState(null); // { type, campaign, onConfirm }
    const [localStatus, setLocalStatus] = useState({}); // campaignId → status override

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
        { id: "recommend", label: `🚀 ${t('campaignMgr.tabRecommend')}`, highlight: true },
        { id: "overview", label: `📣 ${t('campaignMgr.tabOverview')}` },
        { id: "ab_test", label: `🧪 ${t('campaignMgr.tabAbTest')}` },
        { id: "detail", label: `🔍 ${t('campaignMgr.tabDetail')}` },
        { id: "gantt", label: `📅 ${t('campaignMgr.tabGantt')}` },
        { id: "crm_channel", label: `📧 ${t('campaignMgr.tabCrm')}` },
    ];

    const CAMPAIGNS = useMemo(() => [
        {
            id: "CMP001", name: t('campaignMgr.cmp1Name'), status: "active",
            type: t('campaignMgr.typeIntegrated'), startDate: "2026-02-15", endDate: "2026-04-30",
            budget: 45000000, spent: 28400000,
            channels: { meta: 15000000, tiktok: 12000000, amazon: 10000000, influencer: 8000000 },
            channelSpent: { meta: 9800000, tiktok: 8200000, amazon: 6500000, influencer: 3900000 },
            kpi: { targetRoas: 4.0, actualRoas: 4.21, targetConv: 2000, actualConv: 1840, targetCpa: 22500, actualCpa: 15435 },
            influencers: [t('campaignMgr.inf1'), t('campaignMgr.inf2'), t('campaignMgr.inf3')],
            manager: t('campaignMgr.mgr1'),
        },
        {
            id: "CMP002", name: "TikTok Brand Awareness", status: "active",
            type: "SNS", startDate: "2026-03-01", endDate: "2026-03-31",
            budget: 12000000, spent: 4200000,
            channels: { tiktok: 8000000, instagram: 4000000 },
            channelSpent: { tiktok: 2900000, instagram: 1300000 },
            kpi: { targetRoas: 2.5, actualRoas: 2.1, targetConv: 500, actualConv: 312, targetCpa: 24000, actualCpa: 13461 },
            influencers: [t('campaignMgr.inf3')],
            manager: t('campaignMgr.mgr2'),
        },
        {
            id: "CMP003", name: "Amazon Prime Day Ready", status: "scheduled",
            type: t('campaignMgr.typePerformance'), startDate: "2026-06-01", endDate: "2026-07-15",
            budget: 30000000, spent: 0,
            channels: { amazon: 25000000, meta: 5000000 },
            channelSpent: {},
            kpi: { targetRoas: 5.0, actualRoas: null, targetConv: 3000, actualConv: 0, targetCpa: 10000, actualCpa: null },
            influencers: [],
            manager: t('campaignMgr.mgr3'),
        },
        {
            id: "CMP004", name: `Q1 ${t('campaignMgr.typeRetargeting')}`, status: "ended",
            type: t('campaignMgr.typeRetargeting'), startDate: "2026-01-02", endDate: "2026-02-28",
            budget: 20000000, spent: 19800000,
            channels: { meta: 12000000, amazon: 8000000 },
            channelSpent: { meta: 11900000, amazon: 7900000 },
            kpi: { targetRoas: 6.0, actualRoas: 7.2, targetConv: 1500, actualConv: 1823, targetCpa: 13333, actualCpa: 10863 },
            influencers: [],
            manager: t('campaignMgr.mgr1'),
        },
    ], [t]);

    const allCampaigns = useMemo(() => {
        const converted = sharedCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status === 'pending' ? 'scheduled' : c.status === 'approved' ? 'active' : c.status,
            type: t('campaignMgr.typeAutomation'),
            startDate: new Date().toISOString().slice(0, 10),
            endDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
            budget: c.budget || 0,
            spent: Math.round((c.budget || 0) * 0.1),
            channels: Object.fromEntries((c.adChannels || []).map(ch => [ch.id, Math.round((c.budget || 0) / Math.max(1, c.adChannels.length))])),
            channelSpent: {},
            kpi: { targetRoas: parseFloat(c.estimatedRoas) || 3.5, actualRoas: null, targetConv: c.totalConversions || 0, actualConv: 0, targetCpa: 20000, actualCpa: null },
            influencers: [],
            manager: t('campaignMgr.managerAI'),
            _isShared: true,
        }));
        return [...converted, ...CAMPAIGNS];
    }, [sharedCampaigns, CAMPAIGNS, t]);

    const handleSelect = c => {
        setSelected(c);
        setTab("detail");
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Management자 Approve Modal */}
            {approval && (
                <ApprovalModal
                    {...approval}
                    onCancel={() => setApproval(null)}
                />
            )}

            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>📣 {t('campaignMgr.pageTitle')}</div>
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
                        >🔐 {t('campaignMgr.newCampaignBtn')}</button>
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
                            {t('campaignMgr.latest')}: {aiRecommendationLog[0]?.title} — {aiRecommendationLog[0]?.executedAt}
                            {activeRules.length > 0 && <span style={{ marginLeft: 10, color: '#eab308' }}>⚡ {t('campaignMgr.activeRules', { n: activeRules.length, f: rulesFired.length })}</span>}
                        </div>
                    </div>
                    <button onClick={() => navigate('/ai-marketing-hub')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{t('campaignMgr.viewAiHub')} →</button>
                </div>
            )}

            {rulesFired && rulesFired.length > 0 && (
                <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#eab308', fontWeight: 700 }}>⚡ {t('campaignMgr.rulesFired', { n: rulesFired.length, r: rulesFired[0]?.ruleName })}</div>
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
                {tab === "recommend" && <AIMarketingHub />}
                {tab === "crm_channel" && <CrmChannelTab />}
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
                                    <button onClick={() => navigate('/email-marketing')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>📧 {t('campaignMgr.startEmailAb')}</button>
                                    <button onClick={() => navigate('/attribution')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>📈 Attribution A/B</button>
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
