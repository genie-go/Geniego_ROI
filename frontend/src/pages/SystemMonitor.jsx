import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../i18n";
import { getJsonAuth } from "../services/apiClient.js";

import { useT } from '../i18n/index.js';

// 192차: 백엔드 실측 module status → 프론트 service 카드 매핑
const STATUS_MAP = { ok: "ok", degraded: "warn", down: "error" };
function mapModuleToService(m) {
  return {
    name: m.name || m.id,
    icon: m.icon || "•",
    status: STATUS_MAP[m.status] || "info",
    latency: (typeof m.latency_ms === "number") ? Math.round(m.latency_ms) : null,
    uptime: (typeof m.uptime === "number") ? m.uptime
            : (typeof m.uptime_seconds === "number" ? Math.round(m.uptime_seconds / 86400 * 10) / 10 : null),
    requests: (typeof m.rpm === "number") ? m.rpm : null,
    note: m.detail ? Object.entries(m.detail).filter(([k]) => k !== "error").slice(0, 2)
            .map(([k, v]) => `${k}: ${v}`).join(" · ") + (m.detail.error ? ` ⚠ ${m.detail.error}` : "") : "",
  };
}
const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
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

const API_SERVICES = [];

const PIPELINE_JOBS = [];

const ERROR_LOGS = [];

const STATUS_COLOR = { ok: "#22c55e", warn: "#eab308", error: "#ef4444", info: "#4f8ef7" };
// STATUS_LABEL will be generated dynamically using i18n

function EmptyState({ msg }) {
    return (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            {msg}
        </div>
    );
}

function Dot({ status }) {
    const c = STATUS_COLOR[status] || "#4f8ef7";
    return (
        <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
            <span style={{ display: "block", width: 10, height: 10, borderRadius: "50%", background: c }}></span>
            {status !== "ok" && <span style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `2px solid ${c}`, animation: "skeleton-pulse 1.5s infinite", opacity: 0.6 }}></span>}
        </span>
    );
}

function ApiStatusTab({ services, statusLabel, t }) {
    const errCnt = services.filter(s => s.status === "error").length;
    const warnCnt = services.filter(s => s.status === "warn").length;
    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label={t('systemMonitor.kpiConnected', 'Connected Services')} value={services.length} color="#4f8ef7" icon="🔌" />
                <KpiCard label={t('systemMonitor.kpiOk', 'Healthy')} value={services.filter(s => s.status === "ok").length} color="#22c55e" icon="✓" />
                <KpiCard label={t('systemMonitor.kpiWarn', 'Warning')} value={warnCnt} color="#eab308" icon="⚠" />
                <KpiCard label={t('systemMonitor.kpiError', 'Error')} value={errCnt} color="#ef4444" icon="✗" />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
                {services.map(s => (
                    <div key={s.name} style={{
                        padding: "12px 16px", borderRadius: 12, background: "var(--surface-2, rgba(9,15,30,0.6))",
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
                                ["Latency", (s.latency != null) ? s.latency + "ms" : "—", (s.latency != null && s.latency > 500) ? "#eab308" : "var(--text-2)"],
                                [t('systemMonitor.uptime', 'Uptime'), (s.uptime != null) ? s.uptime + "%" : "—", (s.uptime == null) ? "var(--text-3)" : (s.uptime >= 99 ? "#22c55e" : s.uptime >= 97 ? "#eab308" : "#ef4444")],
                                [t('systemMonitor.requests', 'Requests'), (s.requests != null) ? s.requests.toLocaleString() : "—", "#4f8ef7"],
                            ].map(([l, v, c]) => (
                                <div key={l} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{l}</div>
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

function PipelineTab({ jobs, t }) {
    return (
        <div style={{ display: "grid", gap: 10 }}>
            {jobs.map(j => (
                <div key={j.name} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${STATUS_COLOR[j.status]}15`, borderLeft: `3px solid ${STATUS_COLOR[j.status]}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{j.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>⏰ {j.schedule} · Last: {j.last} · {t('systemMonitor.elapsed', 'Elapsed')}: {j.elapsed}</div>
                        {j.note && <div style={{ fontSize: 10, color: STATUS_COLOR[j.status], marginTop: 2 }}>{j.note}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {j.records != null && <div style={{ textAlign: "center", fontSize: 10, color: "var(--text-3)", fontWeight: 700 }} ><div>{t('systemMonitor.processed', 'Processed')}</div><div>{j.records.toLocaleString()}</div></div>}
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
                    <span style={{ marginLeft: 8, color: '#fff' }}>{l.msg}</span>
                    <span style={{ marginLeft: 8, color: "var(--text-3)", fontSize: 10 }}>({l.code})</span>
                </div>
            ))}
        </div>
    );
}

// Tabs defined in component to use i18n

/* [Track B] cron 헬스 탭 — 자동화 두뇌의 데이터 파이프라인(수집·갱신·최적화) 실행 신선도 가시화. */
function CronHealthTab({ cron, t }) {
    const S = cron.summary || {};
    const COL = { ok: '#22c55e', stale: '#ef4444', missing: '#94a3b8', unknown: '#94a3b8' };
    const LBL = {
        ok: t('systemMonitor.cronOk', '정상'),
        stale: t('systemMonitor.cronStale', '지연/중단'),
        missing: t('systemMonitor.cronMissing', '미실행'),
        unknown: t('systemMonitor.cronUnknown', '확인불가'),
    };
    const fmtAge = (m) => m == null ? '—' : (m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`);
    const critical = S.critical_stale || 0;
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>⚙️ {t('systemMonitor.cronTitle', '자동화 스케줄러(cron) 상태')}</div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(148,163,184,0.12)', color: 'var(--text-3)' }}>{cron.env}</span>
                <span style={{ fontSize: 11, color: critical > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                    {critical > 0
                        ? `⚠ ${t('systemMonitor.cronCriticalStale', '핵심 작업 중단')}: ${critical}`
                        : `✓ ${S.ok || 0}/${S.total || 0} ${t('systemMonitor.cronAllOk', '정상')}`}
                </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                {t('systemMonitor.cronDesc', '광고 성과 수집·OAuth 토큰 갱신·자동 최적화 등 자동화 작업의 마지막 실행 시각입니다. 핵심(★) 작업이 "지연/중단"이면 자동화 두뇌가 데이터를 받지 못하거나 토큰이 만료될 수 있습니다.')}
            </div>
            {cron.note && (
                <div style={{ fontSize: 11, padding: '8px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#eab308' }}>
                    ℹ️ {cron.note}
                </div>
            )}
            <div style={{ display: 'grid', gap: 6 }}>
                {cron.runners.map(r => (
                    <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
                        background: r.status === 'ok' ? 'rgba(34,197,94,0.04)' : r.status === 'stale' ? 'rgba(239,68,68,0.06)' : 'rgba(148,163,184,0.04)',
                        border: `1px solid ${r.status === 'ok' ? 'rgba(34,197,94,0.15)' : r.status === 'stale' ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.12)'}`,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COL[r.status] || '#94a3b8', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0, flex: 1 }}>
                            {r.critical && <span style={{ color: '#eab308', marginRight: 4 }}>★</span>}{r.label}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtAge(r.age_min)}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${COL[r.status]}1a`, color: COL[r.status], fontWeight: 800, whiteSpace: 'nowrap' }}>
                            {LBL[r.status] || r.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SystemMonitor() {
    const { t } = useI18n();
    const [tab, setTab] = useState("api");
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [services, setServices] = useState([]);
    const [summary, setSummary] = useState(null);
    const [cron, setCron] = useState(null); // [Track B] cron 헬스
    const [loadErr, setLoadErr] = useState("");

    // 192차: /v424/system/metrics 실측 데이터 로드(가상/목 데이터 제거)
    const load = useCallback(async () => {
        try {
            const d = await getJsonAuth("/v424/system/metrics"); // [259차] 세션 인증 전송(민감 플랫폼 정보는 인증 시에만)
            const mods = Array.isArray(d?.modules) ? d.modules : [];
            setServices(mods.map(mapModuleToService));
            setSummary(d?.summary || null);
            setCron(d?.cron || null); // [Track B] 자동화 cron 헬스
            setLoadErr("");
        } catch (e) {
            setLoadErr(String(e?.message || e));
        }
        setLastUpdate(new Date());
    }, []);

    useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);
    const STATUS_LABEL = { ok: t("systemMonitor.status_ok", "OK"), warn: t("systemMonitor.status_warning", "Warning"), error: t("systemMonitor.status_error", "Error") };
    const TABS = [
        { id: "api", label: `🔌 ${t("systemMonitor.tabApis", "API Status")}` },
        { id: "pipeline", label: `🔄 ${t("common.pipeline", "Pipeline")}` },
        { id: "logs", label: `📋 ${t("common.errorLog", "Error Log")}` },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>{t("systemMonitor.pageTitle", "🖥️ System Monitor")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                            {t("systemMonitor.pageSub", "API Status · Pipeline · Error Log")}
                            <span style={{ marginLeft: 10, color: "#22c55e" }}>● {lastUpdate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={load}>🔄 {t("common.refresh", "Refresh")}</button>
                </div>
                {loadErr && <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>⚠ {t("systemMonitor.loadError", "지표 로드 실패")}: {loadErr}</div>}
            </div>
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "13px 12px", border: "none", cursor: "pointer", background: tab === t.id ? "rgba(239,68,68,0.07)" : "transparent", borderBottom: `2px solid ${tab === t.id ? "#ef4444" : "transparent"}`, fontSize: 12, fontWeight: 700, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</button>
                    ))}
                </div>
            </div>
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "api" && (services.length > 0
                    ? <ApiStatusTab services={services} statusLabel={STATUS_LABEL} t={t} />
                    : <EmptyState msg={loadErr ? t("systemMonitor.loadError", "지표 로드 실패") : t("common.loading", "로딩 중…")} />)}
                {tab === "pipeline" && (cron && Array.isArray(cron.runners) && cron.runners.length > 0
                    ? <CronHealthTab cron={cron} t={t} />
                    : <EmptyState msg={t("systemMonitor.noPipeline", "수집된 파이프라인 작업 데이터가 없습니다")} />)}
                {tab === "logs" && (ERROR_LOGS.length > 0
                    ? <LogsTab logs={ERROR_LOGS} />
                    : <EmptyState msg={t("systemMonitor.noLogs", "수집된 오류 로그가 없습니다")} />)}
            </div>
        </div>
    );
}
