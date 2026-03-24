import React, { useState, useEffect } from "react";
import { useI18n } from "../i18n";

const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
);
const KpiCard = ({ label, value, sub, color = "#4f8ef7", icon }) => (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 18, opacity: .7 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 18, color, marginTop: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
);

const API_SERVICES = [
    { name: "Meta Ads API", icon: "📘", status: "ok", latency: 142, uptime: 99.8, lastCheck: "1min ago", requests: 4821 },
    { name: "TikTok Business API", icon: "🎵", status: "ok", latency: 218, uptime: 99.5, lastCheck: "1min ago", requests: 2103 },
    { name: "Amazon SP-API", icon: "📦", status: "ok", latency: 88, uptime: 99.9, lastCheck: "2min ago", requests: 7642 },
    { name: "Google Analytics 4", icon: "📊", status: "ok", latency: 175, uptime: 99.7, lastCheck: "2min ago", requests: 3310 },
    { name: "Claude AI API", icon: "🤖", status: "ok", latency: 2840, uptime: 98.2, lastCheck: "just now", requests: 42 },
    { name: "Naver Search API", icon: "🔍", status: "warn", latency: 580, uptime: 97.1, lastCheck: "3min ago", requests: 890, note: "Latency Increase (>500ms)" },
    { name: "Coupang Partners API", icon: "🏪", status: "ok", latency: 200, uptime: 99.3, lastCheck: "2min ago", requests: 1540 },
    { name: "MySQL DB (prod)", icon: "🗄", status: "ok", latency: 8, uptime: 99.99, lastCheck: "just now", requests: 52100 },
    { name: "Email (SMTP)", icon: "📧", status: "error", latency: null, uptime: 95.0, lastCheck: "15min ago", requests: 0, note: "Connect Failed - Settings Confirm 필요" },
];

const PIPELINE_JOBS = [
    { name: "Ad 데이터 Count집 (Meta)", schedule: "매Time", last: "2026-03-06 10:00", status: "ok", records: 12480, elapsed: "42초" },
    { name: "TikTok 인사이트 Count집", schedule: "2Time마다", last: "2026-03-06 10:00", status: "ok", records: 4210, elapsed: "28초" },
    { name: "Amazon Orders Sync", schedule: "30분마다", last: "2026-03-06 10:30", status: "ok", records: 7821, elapsed: "18초" },
    { name: "인플루언서 Statistics Aggregate", schedule: "매일 06:00", last: "2026-03-06 06:00", status: "ok", records: 1240, elapsed: "3분 12초" },
    { name: "Rollup Aggregate (일per)", schedule: "매일 02:00", last: "2026-03-06 02:00", status: "ok", records: 85600, elapsed: "12분 40초" },
    { name: "AI Analysis 레포트 Create", schedule: "매일 07:00", last: "2026-03-06 07:00", status: "warn", records: 0, elapsed: "—", note: "Claude API 모델 Error 발생" },
    { name: "데이터 백업 (S3)", schedule: "매일 03:00", last: "2026-03-06 03:00", status: "ok", records: null, elapsed: "2분 5초" },
];

const ERROR_LOGS = [
    { time: "10:35", level: "error", service: "Email SMTP", msg: "Connection refused: smtp.genie.kr:587", code: "ECONNREFUSED" },
    { time: "10:30", level: "warn", service: "Naver Search API", msg: "Response time exceeded 500ms (580ms)", code: "SLOW_RESPONSE" },
    { time: "07:02", level: "error", service: "AI Analysis 레포트", msg: "Claude API 404: model not found", code: "MODEL_404" },
    { time: "01:40", level: "info", service: "Amazon SP-API", msg: "Access token refreshed successfully", code: "TOKEN_REFRESH" },
    { time: "00:15", level: "info", service: "MySQL DB", msg: "Auto vacuum completed. Freed 48MB", code: "DB_VACUUM" },
];

const STATUS_COLOR = { ok: "#22c55e", warn: "#eab308", error: "#ef4444", info: "#4f8ef7" };
// STATUS_LABEL will be generated dynamically using i18n

function Dot({ status }) {
    const c = STATUS_COLOR[status] || "#4f8ef7";
    return (
        <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
            <span style={{ display: "block", width: 10, height: 10, borderRadius: "50%", background: c }}></span>
            {status !== "ok" && <span style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `2px solid ${c}`, animation: "skeleton-pulse 1.5s infinite", opacity: 0.6 }}></span>}
        </span>
    );
}

function ApiStatusTab({ services, statusLabel }) {
    const errCnt = services.filter(s => s.status === "error").length;
    const warnCnt = services.filter(s => s.status === "warn").length;
    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label="Connect된 서비스" value={services.length} color="#4f8ef7" icon="🔌" />
                <KpiCard label="정상" value={services.filter(s => s.status === "ok").length} color="#22c55e" icon="✓" />
                <KpiCard label="Warning" value={warnCnt} color="#eab308" icon="⚠" />
                <KpiCard label="Error" value={errCnt} color="#ef4444" icon="✗" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
                {services.map(s => (
                    <div key={s.name} style={{
                        padding: "12px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)",
                        border: `1px solid ${STATUS_COLOR[s.status]}20`, borderLeft: `3px solid ${STATUS_COLOR[s.status]}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
                    }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <Dot status={s.status} />
                            <span style={{ fontSize: 14 }}>{s.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{s.name}</div>
                                {s.note && <div style={{ fontSize: 10, color: STATUS_COLOR[s.status], marginTop: 2 }}>{s.note}</div>}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                            {[
                                ["Latency", s.latency ? s.latency + "ms" : "—", s.latency > 500 ? "#eab308" : "var(--text-2)"],
                                ["가동률", s.uptime + "%", s.uptime >= 99 ? "#22c55e" : s.uptime >= 97 ? "#eab308" : "#ef4444"],
                                ["요청Count", s.requests.toLocaleString(), "#4f8ef7"],
                            ].map(([l, v, c]) => (
                                <div key={l} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>{l}</div>
                                    <div style={{ fontWeight: 700, color: c, fontSize: 12 }}>{v}</div>
                                </div>
                            ))}
                            <Tag label={statusLabel[s.status]} color={STATUS_COLOR[s.status]} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PipelineTab({ jobs }) {
    return (
        <div style={{ display: "grid", gap: 10 }}>
            {jobs.map(j => (
                <div key={j.name} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${STATUS_COLOR[j.status]}15`, borderLeft: `3px solid ${STATUS_COLOR[j.status]}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{j.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>⏰ {j.schedule} · Last used: {j.last} · 소요: {j.elapsed}</div>
                        {j.note && <div style={{ fontSize: 10, color: STATUS_COLOR[j.status], marginTop: 2 }}>{j.note}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {j.records != null && <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "var(--text-3)" }}>처리 건Count</div><div style={{ fontWeight: 700 }}>{j.records.toLocaleString()}</div></div>}
                        <Tag label={j.status === "ok" ? "✓ Done" : j.status === "warn" ? "⚠ Warning" : "✗ Error"} color={STATUS_COLOR[j.status]} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function LogsTab({ logs }) {
    return (
        <div style={{ display: "grid", gap: 6 }}>
            {logs.map((l, i) => (
                <div key={i} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(9,15,30,0.7)", border: `1px solid ${STATUS_COLOR[l.level]}15`, fontFamily: "monospace", fontSize: 11 }}>
                    <span style={{ color: "var(--text-3)" }}>{l.time}</span>
                    <Tag label={l.level.toUpperCase()} color={STATUS_COLOR[l.level]} />
                    <span style={{ marginLeft: 8, color: "#4f8ef7" }}>[{l.service}]</span>
                    <span style={{ marginLeft: 8, color: "var(--text-1)" }}>{l.msg}</span>
                    <span style={{ marginLeft: 8, color: "var(--text-3)", fontSize: 10 }}>({l.code})</span>
                </div>
            ))}
        </div>
    );
}

// Tabs defined in component to use i18n

export default function SystemMonitor() {
    const { t } = useI18n();
    const [tab, setTab] = useState("api");
    const [lastUpdate, setLastUpdate] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setLastUpdate(new Date()), 30000); return () => clearInterval(t); }, []);
    const STATUS_LABEL = { ok: t("systemMonitor.status_ok") || "OK", warn: t("systemMonitor.status_warning") || "Warning", error: t("systemMonitor.status_error") || "Error" };
    const TABS = [
        { id: "api", label: `🔌 ${t("systemMonitor.tabApis") || "API Status"}` },
        { id: "pipeline", label: `🔄 ${t("common.pipeline") || "Pipeline"}` },
        { id: "logs", label: `📋 ${t("common.errorLog") || "Error Log"}` },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>{t("systemMonitor.pageTitle") || "🖥️ System Monitor"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                            {t("systemMonitor.pageSub") || "API Status · Pipeline · Error Log"}
                            <span style={{ marginLeft: 10, color: "#22c55e" }}>● {lastUpdate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                    <button className="btn-ghost" style={{ fontSize: 12 }}>🔄 {t("common.refresh") || "Refresh"}</button>
                </div>
            </div>
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "13px 12px", border: "none", cursor: "pointer", background: tab === t.id ? "rgba(239,68,68,0.07)" : "transparent", borderBottom: `2px solid ${tab === t.id ? "#ef4444" : "transparent"}`, fontSize: 12, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</button>
                    ))}
                </div>
            </div>
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "api" && <ApiStatusTab services={API_SERVICES} statusLabel={STATUS_LABEL} />}
                {tab === "pipeline" && <PipelineTab jobs={PIPELINE_JOBS} />}
                {tab === "logs" && <LogsTab logs={ERROR_LOGS} />}
            </div>
        </div>
    );
}
