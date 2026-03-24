import React, { useState, useMemo } from "react";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import { useI18n } from '../i18n/index.js';

const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
);

const PLAT_COLOR = { instagram: "#a855f7", youtube: "#ef4444", tiktok: "#ec4899", blog: "#22c55e" };
const PLAT_ICO = { instagram: "📸", youtube: "▶", tiktok: "🎵", blog: "📝" };
const STATUS_META = {
    draft: { label: "Draft", color: "#eab308" },
    review: { label: "In Review", color: "#f97316" },
    scheduled: { label: "예약Done", color: "#4f8ef7" },
    published: { label: "발행Done", color: "#22c55e" },
    cancelled: { label: "Cancel", color: "#ef4444" },
};

const CONTENT_EVENTS = [
    { id: 1, title: "봄 신상 언박싱", creator: "테크 언박싱", platform: "youtube", date: "2026-03-05", status: "published", campaign: "봄 시즌 런칭", views: 89000 },
    { id: 2, title: "3월 신상 TOP5", creator: "데일리 가젯", platform: "instagram", date: "2026-03-07", status: "scheduled", campaign: "봄 시즌 런칭" },
    { id: 3, title: "봄 가젯 챌린지", creator: "테크바이브", platform: "tiktok", date: "2026-03-10", status: "review", campaign: "TikTok 브랜드" },
    { id: 4, title: "WH-1000XM6 리뷰", creator: "테크 언박싱", platform: "youtube", date: "2026-03-14", status: "draft", campaign: "봄 시즌 런칭" },
    { id: 5, title: "홈오피스 셋업 Vol.3", creator: "데일리 가젯", platform: "instagram", date: "2026-03-18", status: "scheduled", campaign: "봄 시즌 런칭" },
    { id: 6, title: "IT 꿀팁 #시리즈41", creator: "IT 꿀팁 박해진", platform: "youtube", date: "2026-03-20", status: "draft", campaign: "—" },
    { id: 7, title: "3월 마감 세일 Notification", creator: "테크바이브", platform: "tiktok", date: "2026-03-25", status: "scheduled", campaign: "TikTok 브랜드" },
    { id: 8, title: "4K 웹캠 Compare", creator: "데일리 가젯", platform: "youtube", date: "2026-04-03", status: "draft", campaign: "—" },
    { id: 9, title: "봄 뷰티 테크 리뷰", creator: "뷰티 테크 지나", platform: "instagram", date: "2026-04-10", status: "draft", campaign: "봄 시즌 런칭" },
    { id: 10, title: "4월 신상 챌린지", creator: "테크바이브", platform: "tiktok", date: "2026-04-15", status: "draft", campaign: "봄 시즌 런칭" },
];

const SEASON_EVENTS = [
    { date: "2026-03-01", label: "3월 시즌 Start", color: "#22c55e" },
    { date: "2026-03-22", label: "봄 특가 세일", color: "#f97316" },
    { date: "2026-04-05", label: "아동의 날 Event", color: "#a855f7" },
];

function getWeeksInMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let current = new Date(firstDay);
    current.setDate(current.getDate() - current.getDay());
    while (current <= lastDay) {
        const week = [];
        for (let i = 0; i < 7; i++) { week.push(new Date(current)); current.setDate(current.getDate() + 1); }
        weeks.push(week);
    }
    return weeks;
}

function MonthCalendar({ year, month, events, seasonEvents }) {
    const weeks = getWeeksInMonth(year, month);
    const DAY_NAMES = ["일", "월", "화", "Count", "목", "금", "토"];
    const toStr = d => d.toISOString().slice(0, 10);
    const evByDate = {};
    for (const e of events) { if (!evByDate[e.date]) evByDate[e.date] = []; evByDate[e.date].push(e); }
    const seByDate = {};
    for (const s of seasonEvents) seByDate[s.date] = s;

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                {DAY_NAMES.map((d, i) => (
                    <div key={d} style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: i === 0 ? "#ef4444" : i === 6 ? "#4f8ef7" : "var(--text-3)", padding: "4px 0" }}>{d}</div>
                ))}
            </div>
            {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
                    {week.map((day, di) => {
                        const ds = toStr(day);
                        const inMonth = day.getMonth() === month;
                        const dayEvents = evByDate[ds] || [];
                        const se = seByDate[ds];
                        const isToday = ds === "2026-03-06";
                        return (
                            <div key={di} style={{
                                minHeight: 62, padding: "4px 5px", borderRadius: 6,
                                background: isToday ? "rgba(99,102,241,0.1)" : inMonth ? "rgba(9,15,30,0.5)" : "rgba(9,15,30,0.15)",
                                border: isToday ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(99,140,255,0.06)",
                                opacity: inMonth ? 1 : 0.3,
                            }}>
                                <div style={{ fontSize: 11, fontWeight: isToday ? 900 : 600, color: di === 0 ? "#ef4444" : di === 6 ? "#4f8ef7" : "var(--text-2)", marginBottom: 2 }}>
                                    {day.getDate()}{isToday && <span style={{ fontSize: 7, color: "#6366f1", marginLeft: 2 }}>TODAY</span>}
                                </div>
                                {se && <div style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: se.color + "20", color: se.color, marginBottom: 2 }}>🎉 {se.label}</div>}
                                {dayEvents.slice(0, 2).map(ev => {
                                    const sc = STATUS_META[ev.status];
                                    return (
                                        <div key={ev.id} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: sc.color + "15", color: sc.color, marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                            {PLAT_ICO[ev.platform]} {ev.title}
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 2 && <div style={{ fontSize: 8, color: "var(--text-3)" }}>+{dayEvents.length - 2}</div>}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function ContentListTab({ events }) {
    const [filter, setFilter] = useState("all");
    const filtered = events.filter(e => filter === "all" || e.status === filter).sort((a, b) => a.date.localeCompare(b.date));
    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {["all", "draft", "review", "scheduled", "published"].map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={{ padding: "4px 12px", borderRadius: 99, border: "1px solid var(--border)", background: filter === s ? "#4f8ef7" : "transparent", color: filter === s ? "#fff" : "var(--text-2)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                        {s === "all" ? "All" : STATUS_META[s]?.label}
                    </button>
                ))}
            </div>
            {filtered.map(ev => {
                const sc = STATUS_META[ev.status];
                return (
                    <div key={ev.id} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${sc.color}18`, borderLeft: `3px solid ${sc.color}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.title}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, display: "flex", gap: 8 }}>
                                <span>{PLAT_ICO[ev.platform]} {ev.platform}</span>
                                <span>👤 {ev.creator}</span>
                                <span>📅 {ev.date}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {ev.views && <Tag label={`👁 ${(ev.views / 1000).toFixed(0)}K`} color="#f97316" />}
                            <Tag label={sc.label} color={sc.color} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}



// Platformper Performance 데이터를 MarketingAIPanel 형식으로 변환
const CONTENT_CHANNELS_FOR_AI = {
    instagram: {
        name: 'Instagram', impressions: 320000, clicks: 12800, spend: 2800000,
        revenue: 8960000, roas: 3.2, conversions: 384, ctr: 4.0, convRate: 3.0, cpc: 219,
    },
    youtube: {
        name: 'YouTube', impressions: 890000, clicks: 8900, spend: 2100000,
        revenue: 5460000, roas: 2.6, conversions: 267, ctr: 1.0, convRate: 3.0, cpc: 236,
        videoViews: 580000, viewRate: 65.2,
    },
    tiktok: {
        name: 'TikTok', impressions: 1240000, clicks: 49600, spend: 1500000,
        revenue: 4950000, roas: 3.3, conversions: 496, ctr: 4.0, convRate: 1.0, cpc: 30,
        videoViews: 980000, viewRate: 79.0,
    },
    blog: {
        name: 'Blog', impressions: 54000, clicks: 3240, spend: 450000,
        revenue: 900000, roas: 2.0, conversions: 97, ctr: 6.0, convRate: 3.0, cpc: 139,
    },
};
const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월"];

export default function ContentCalendar() {
    const { t } = useI18n();
    const [tab, setTab] = useState("calendar");
    const [curMonth, setCurMonth] = useState(2);
    const TABS = useMemo(() => [
        { id: "calendar", label: t("marketing.tabCalendar") },
        { id: "list", label: t("marketing.tabList") },
        { id: "ai", label: t("marketing.tabAiCal") },
    ], [t]);
    const STATUS_META_T = useMemo(() => ({
        draft: { label: t("marketing.status_draft"), color: "#eab308" },
        review: { label: t("marketing.status_review"), color: "#f97316" },
        scheduled: { label: t("marketing.status_scheduled"), color: "#4f8ef7" },
        published: { label: t("marketing.status_published"), color: "#22c55e" },
        cancelled: { label: t("marketing.status_cancelled"), color: "#ef4444" },
    }), [t]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>{t("marketing.calTitle")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{t("marketing.calSub")}</div>
                    </div>
                    <button className="btn-primary" style={{ background: "linear-gradient(135deg,#14d9b0,#4f8ef7)", fontSize: 12 }}>+ 콘텐츠 Register</button>
                </div>
            </div>
            <div className="card card-glass fade-up fade-up-1" style={{ padding: "10px 16px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>Status:</span>
                    {Object.entries(STATUS_META).map(([k, v]) => <Tag key={k} label={v.label} color={v.color} />)}
                </div>
            </div>
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "13px 12px", border: "none", cursor: "pointer", background: tab === t.id ? "rgba(20,217,176,0.08)" : "transparent", borderBottom: `2px solid ${tab === t.id ? "#14d9b0" : "transparent"}`, fontSize: 12, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</button>
                    ))}
                </div>
            </div>
            {tab === "calendar" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <button onClick={() => setCurMonth(m => Math.max(0, m - 1))} className="btn-ghost" style={{ fontSize: 13, padding: "4px 12px" }}>← Previous</button>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>2026년 {MONTH_NAMES[curMonth]}</div>
                        <button onClick={() => setCurMonth(m => Math.min(5, m + 1))} className="btn-ghost" style={{ fontSize: 13, padding: "4px 12px" }}>Next →</button>
                    </div>
                    <MonthCalendar year={2026} month={curMonth}
                        events={CONTENT_EVENTS.filter(e => new Date(e.date).getMonth() === curMonth)}
                        seasonEvents={SEASON_EVENTS.filter(s => new Date(s.date).getMonth() === curMonth)} />
                </div>
            )}
            {tab === "list" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <ContentListTab events={CONTENT_EVENTS} />
                </div>
            )}
            {tab === "ai" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <MarketingAIPanel
                        channels={CONTENT_CHANNELS_FOR_AI}
                        campaigns={[]}
                    />
                </div>
            )}
        </div>
    );
}
