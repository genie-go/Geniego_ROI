import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "../i18n";
import { getJsonAuth, postJsonAuth } from "../services/apiClient.js";

/**
 * 접근 검토(Access Review) — EPIC 06-A Part 3-8 실 구현 슬라이스 프론트.
 * 백엔드: GET/POST /v424/admin/access-review/{keys,decision,history} (admin 세션 self-auth).
 *   ★api_key(머신 아이덴티티) 축만 검토 — 휴면/만료 키를 검토·회수하고 결정을 증거(SecurityAudit)로 남긴다.
 *   ★fail-secure: 회수/승인 모두 사유(justification) 필수. 신규 파괴경로 없음(기존 is_active=0 재사용).
 */

const STATUS_COLOR = {
    EXPIRED: "#ef4444",
    STALE_UNUSED: "#f97316",
    DORMANT: "#eab308",
    EXPIRING_SOON: "#4f8ef7",
    OK: "#22c55e",
};

function KpiCard({ label, value, color, icon }) {
    return (
        <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
                {icon && <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>}
            </div>
            <div style={{ fontWeight: 900, fontSize: 22, color, marginTop: 6 }}>{value}</div>
        </div>
    );
}

function Badge({ status, label }) {
    const c = STATUS_COLOR[status] || "#94a3b8";
    return (
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: `${c}18`, color: c, border: `1px solid ${c}33`, whiteSpace: "nowrap" }}>
            {label}
        </span>
    );
}

function EmptyState({ msg }) {
    return <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>{msg}</div>;
}

export default function AccessReview() {
    const { t } = useI18n();
    const [tab, setTab] = useState("queue");
    const [data, setData] = useState(null);       // keys 응답
    const [history, setHistory] = useState(null);  // history 응답
    const [loadErr, setLoadErr] = useState("");
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(null);      // { item, decision }
    const [justify, setJustify] = useState("");

    const statusLabel = useCallback((s) => ({
        EXPIRED: t("accessReview.status_EXPIRED", "만료됨"),
        STALE_UNUSED: t("accessReview.status_STALE_UNUSED", "미사용"),
        DORMANT: t("accessReview.status_DORMANT", "휴면"),
        EXPIRING_SOON: t("accessReview.status_EXPIRING_SOON", "만료 임박"),
        OK: t("accessReview.status_OK", "정상"),
    }[s] || s), [t]);

    const loadKeys = useCallback(async () => {
        try {
            const d = await getJsonAuth("/v424/admin/access-review/keys");
            setData(d || null);
            setLoadErr("");
        } catch (e) {
            setLoadErr(String(e?.message || e));
        }
    }, []);

    const loadHistory = useCallback(async () => {
        try {
            const d = await getJsonAuth("/v424/admin/access-review/history");
            setHistory(d || null);
        } catch (e) {
            setLoadErr(String(e?.message || e));
        }
    }, []);

    useEffect(() => { loadKeys(); }, [loadKeys]);
    useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

    function openDecision(item, decision) {
        setModal({ item, decision });
        setJustify("");
    }

    async function submitDecision() {
        if (!modal) return;
        if (justify.trim() === "") return; // fail-secure: 사유 필수
        setBusy(true);
        try {
            await postJsonAuth("/v424/admin/access-review/decision", {
                target_id: modal.item.target_id,
                decision: modal.decision,
                justification: justify.trim(),
            });
            setModal(null);
            setJustify("");
            await loadKeys();
            if (tab === "history") await loadHistory();
        } catch (e) {
            setLoadErr(String(e?.message || e));
        }
        setBusy(false);
    }

    const summary = data?.summary || {};
    const items = Array.isArray(data?.items) ? data.items : [];
    const needsReview = items.filter((i) => i.needs_review);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* 헤더 */}
            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>{t("accessReview.pageTitle", "🔐 접근 검토")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                            {t("accessReview.pageSub", "휴면·만료 API 키를 검토하고 회수합니다 (Access Review)")}
                        </div>
                    </div>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => { loadKeys(); if (tab === "history") loadHistory(); }}>
                        🔄 {t("common.refresh", "새로고침")}
                    </button>
                </div>
                {loadErr && <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>⚠ {t("accessReview.loadError", "데이터 로드 실패")}: {loadErr}</div>}
            </div>

            {/* KPI 요약 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label={t("accessReview.kpiNeedsReview", "검토 필요")} value={data?.needs_review ?? 0} color="#ef4444" icon="🔍" />
                <KpiCard label={t("accessReview.kpiExpired", "만료됨")} value={summary.EXPIRED || 0} color="#ef4444" icon="⛔" />
                <KpiCard label={t("accessReview.kpiDormant", "휴면/미사용")} value={(summary.DORMANT || 0) + (summary.STALE_UNUSED || 0)} color="#eab308" icon="💤" />
                <KpiCard label={t("accessReview.kpiExpiringSoon", "만료 임박")} value={summary.EXPIRING_SOON || 0} color="#4f8ef7" icon="⏳" />
            </div>

            {/* 탭 */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)" }}>
                    {[
                        { id: "queue", label: `🗂 ${t("accessReview.tabQueue", "검토 큐")}` },
                        { id: "history", label: `🧾 ${t("accessReview.tabHistory", "검토 이력")}` },
                    ].map((tb) => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                            padding: "13px 12px", border: "none", cursor: "pointer",
                            background: tab === tb.id ? "rgba(79,142,247,0.08)" : "transparent",
                            borderBottom: `2px solid ${tab === tb.id ? "#4f8ef7" : "transparent"}`,
                            fontSize: 12, fontWeight: 700, color: tab === tb.id ? "var(--text-1)" : "var(--text-2)",
                        }}>{tb.label}</button>
                    ))}
                </div>
            </div>

            {/* 본문 */}
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "queue" && (
                    !data ? <EmptyState msg={loadErr ? t("accessReview.loadError", "데이터 로드 실패") : t("common.loading", "로딩 중…")} />
                        : needsReview.length === 0 ? <EmptyState msg={t("accessReview.emptyQueue", "검토 대상 키가 없습니다 — 모든 키가 정상입니다")} />
                            : (
                                <div style={{ display: "grid", gap: 8 }}>
                                    {needsReview.map((it) => (
                                        <div key={it.target_id} style={{
                                            padding: "12px 16px", borderRadius: 12,
                                            background: "var(--surface-2, rgba(9,15,30,0.6))",
                                            border: `1px solid ${STATUS_COLOR[it.status]}20`, borderLeft: `3px solid ${STATUS_COLOR[it.status]}`,
                                            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
                                        }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{it.key_prefix}…</span>
                                                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>{it.name || "—"}</span>
                                                    <Badge status={it.status} label={statusLabel(it.status)} />
                                                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(148,163,184,0.12)", color: "var(--text-3)" }}>{it.role}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: STATUS_COLOR[it.status], marginTop: 4 }}>{it.reason}</div>
                                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                                    {t("accessReview.colLastUsed", "마지막 사용")}: {it.last_used_at || t("accessReview.never", "사용 이력 없음")}
                                                    {it.days_idle != null && ` · ${it.days_idle}${t("accessReview.daysIdleSuffix", "일 유휴")}`}
                                                    {` · ${t("accessReview.useCount", "호출")}: ${it.use_count}`}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => openDecision(it, "approve")}>
                                                    ✓ {t("accessReview.approve", "승인(유지)")}
                                                </button>
                                                <button style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: "1px solid #ef444455", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontWeight: 700 }} onClick={() => openDecision(it, "revoke")}>
                                                    ⛔ {t("accessReview.revoke", "회수")}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                )}

                {tab === "history" && (
                    !history ? <EmptyState msg={t("common.loading", "로딩 중…")} />
                        : !Array.isArray(history.items) || history.items.length === 0 ? <EmptyState msg={t("accessReview.emptyHistory", "검토 이력이 없습니다")} />
                            : (
                                <div style={{ display: "grid", gap: 6 }}>
                                    {history.items.map((h, i) => (
                                        <div key={i} style={{
                                            padding: "10px 14px", borderRadius: 9, background: "rgba(9,15,30,0.55)",
                                            border: `1px solid ${h.decision === "revoke" ? "#ef444422" : "#22c55e22"}`,
                                            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                                        }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: h.decision === "revoke" ? "rgba(239,68,68,0.14)" : "rgba(34,197,94,0.14)", color: h.decision === "revoke" ? "#ef4444" : "#22c55e" }}>
                                                        {h.decision === "revoke" ? t("accessReview.decisionRevoke", "회수") : t("accessReview.decisionApprove", "승인")}
                                                    </span>
                                                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{h.target_label || h.target_id}</span>
                                                    {h.status_at_review && <Badge status={h.status_at_review} label={statusLabel(h.status_at_review)} />}
                                                </div>
                                                {h.justification && <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>“{h.justification}”</div>}
                                            </div>
                                            <div style={{ textAlign: "right", fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                                                <div>{h.reviewer}</div>
                                                <div>{(h.created_at || "").replace("T", " ").slice(0, 16)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                )}
            </div>

            {/* 결정 모달 */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={() => !busy && setModal(null)}>
                    <div className="card card-glass" style={{ maxWidth: 460, width: "100%", padding: 22 }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                            {modal.decision === "revoke" ? `⛔ ${t("accessReview.revoke", "회수")}` : `✓ ${t("accessReview.approve", "승인(유지)")}`}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>
                            <span style={{ fontFamily: "monospace" }}>{modal.item.key_prefix}…</span> {modal.item.name}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t("accessReview.justifyTitle", "검토 결정 사유")}</div>
                        <textarea
                            value={justify}
                            onChange={(e) => setJustify(e.target.value)}
                            placeholder={t("accessReview.justifyPlaceholder", "결정 근거를 입력하세요 (증거 기반 필수)")}
                            rows={3}
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border, rgba(148,163,184,0.25))", background: "rgba(9,15,30,0.5)", color: "var(--text-1)", fontSize: 12, resize: "vertical" }}
                        />
                        <div style={{ fontSize: 10, color: "#eab308", marginTop: 4, minHeight: 14 }}>
                            {justify.trim() === "" ? `⚠ ${t("accessReview.justifyRequired", "사유는 필수입니다")}` : ""}
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                            <button className="btn-ghost" style={{ fontSize: 12 }} disabled={busy} onClick={() => setModal(null)}>{t("accessReview.cancel", "취소")}</button>
                            <button
                                disabled={busy || justify.trim() === ""}
                                onClick={submitDecision}
                                style={{
                                    fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 700, cursor: busy || justify.trim() === "" ? "not-allowed" : "pointer",
                                    background: modal.decision === "revoke" ? "#ef4444" : "#22c55e", color: "#fff", opacity: busy || justify.trim() === "" ? 0.5 : 1,
                                }}
                            >
                                {busy ? "…" : t("accessReview.confirm", "확인")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
