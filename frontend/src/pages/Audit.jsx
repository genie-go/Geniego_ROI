import React, { useState, useMemo, useCallback, useEffect } from "react";
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js";
import { useT } from "../i18n";
import useSecurityMonitor from "../hooks/useSecurityMonitor.js";
import { IS_DEMO } from "../utils/demoEnv.js";

// [현 차수] 데모 감사로그 샘플(운영=실 /api/auth/audit-logs). 감사로그는 활동 기록이라 데모용 결정적 시드.
const _DEMO_AUDIT_LOGS = IS_DEMO ? (() => {
  const acts = [
    ['ACTION_EXECUTED','마케팅 자동집행 승인','analyst','low','campaign','CMP-001','Meta 도달 캠페인 예산 +15% 자동 집행'],
    ['ACTION_APPROVED','쿠폰 발급 승인','admin','low','promo','PROMO-002','신규회원 5천원 쿠폰 발급 승인'],
    ['SETTING_CHANGED','정산 수수료율 변경','admin','medium','settlement','coupang','쿠팡 수수료율 10.8%→11.0% 변경'],
    ['LOGIN','관리자 로그인','admin','low','session','-','관리자 콘솔 로그인(MFA 통과)'],
    ['ACTION_EXECUTED','반품 자동 입고','analyst','low','order','ORD-10245','반품 승인 → WMS 자동 입고'],
    ['SETTING_CHANGED','채널 API 키 회전','admin','high','credential','meta_ads','Meta Ads 액세스 토큰 회전(90일 정책)'],
    ['ACTION_REJECTED','예산 초과 집행 거부','analyst','medium','campaign','CMP-004','월 예산 한도 초과 집행 시도 자동 거부'],
    ['EXPORT','정산 리포트 내보내기','analyst','low','report','settlement','6월 정산 리포트 CSV 다운로드'],
  ];
  const now = Date.now();
  return acts.map((a, i) => ({
    id: `AL-${1000 + i}`, action: a[0], detail: a[2] === 'admin' ? a[1] : a[1], actor: a[2] + '@demo.com',
    role: a[2], risk: a[3], entity_type: a[4], entity_id: a[5], ip: `211.45.${10 + i}.${20 + i * 3}`,
    at: new Date(now - i * 5400000).toISOString(),
  })).map((l, i) => ({ ...l, detail: acts[i][6] }));
})() : [];
_dloc(_DEMO_AUDIT_LOGS);

/* ── Constants ─────────────────────────────────────────────────────────── */
const ACTION_COLORS = {
  ACTION_EXECUTED:     "#22c55e",
  ACTION_APPROVED:     "#4f8ef7",
  ACTION_REJECTED:     "#ef4444",
  ALERT_TRIGGERED:     "#f97316",
  POLICY_UPDATED:      "#a855f7",
  KEY_CREATED:         "#14d9b0",
  KEY_REVOKED:         "#ef4444",
  CONNECTOR_SYNCED:    "#4f8ef7",
  MAPPING_UPDATED:     "#eab308",
  SETTLEMENT_IMPORTED: "#14d9b0",
  REPORT_EXPORTED:     "#6366f1",
  USER_ROLE_CHANGED:   "#ec4899",
  LOGIN_SUCCESS:       "#22c55e",
  LOGIN_FAILED:        "#ef4444",
  PERMISSION_DENIED:   "#ef4444",
  DATA_EXPORTED:       "#6366f1",
  SETTINGS_CHANGED:    "#a855f7",
};
const ACTION_ICONS = {
  ACTION_EXECUTED:     "\u26a1",
  ACTION_APPROVED:     "\u2705",
  ACTION_REJECTED:     "\u274c",
  ALERT_TRIGGERED:     "\ud83d\udea8",
  POLICY_UPDATED:      "\ud83d\udcdd",
  KEY_CREATED:         "\ud83d\udd11",
  KEY_REVOKED:         "\ud83d\uddd1",
  CONNECTOR_SYNCED:    "\ud83d\udd0c",
  MAPPING_UPDATED:     "\ud83e\udde9",
  SETTLEMENT_IMPORTED: "\ud83d\udcb0",
  REPORT_EXPORTED:     "\ud83d\udce4",
  USER_ROLE_CHANGED:   "\ud83d\udc64",
  LOGIN_SUCCESS:       "\ud83d\udd13",
  LOGIN_FAILED:        "\ud83d\udeab",
  PERMISSION_DENIED:   "\ud83d\udee1\ufe0f",
  DATA_EXPORTED:       "\ud83d\udce5",
  SETTINGS_CHANGED:    "\u2699\ufe0f",
};
const RISK_CFG = {
  high:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  medium: { color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  low:    { color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso, t) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}${t("audit.secAgo")}`;
  if (s < 3600)  return `${Math.floor(s / 60)}${t("audit.minAgo")}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${t("audit.hrAgo")}`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}${t("audit.dayAgo")}`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTs(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* exportCsv — t passed as parameter to fix scope bug */
function exportCsv(logs, t) {
  const header = [
    t("audit.colId"), t("audit.colTime"), t("audit.colActor"), t("audit.csvRole"),
    t("audit.colEvent"), t("audit.csvEntityType"), t("audit.csvEntityId"),
    t("audit.colRisk"), t("audit.colIp"), t("audit.colDetail"),
  ].join(",");
  const rows = logs.map(l =>
    [l.id, l.at, l.actor, l.role, l.action, l.entity_type, l.entity_id, l.risk, l.ip, `"${(l.detail || "").replace(/"/g, '""')}"`].join(",")
  );
  const bom = "\uFEFF";
  const blob = new Blob([bom + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit_log_${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Sub-Components ─────────────────────────────────────────────────────── */
function RiskBadge({ risk, t }) {
  const r = risk || 'low'; // [259차] 라이브 감사로그 레코드에 risk 결측 시 charAt/slice 널참조 크래시 방지
  const cfg = RISK_CFG[r] || RISK_CFG.low;
  const label = t(`audit.risk${r.charAt(0).toUpperCase() + r.slice(1)}`) || r.toUpperCase();
  return (
    <span style={{
      padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`,
      letterSpacing: 0.5 }}>{label}</span>
  );
}

function ActionBadge({ action, t }) {
  const a = action || 'unknown'; // [259차] action 결측 시 replace 널참조 크래시 방지
  const color = ACTION_COLORS[a] || "#4f8ef7";
  const label = t(`audit.action_${a}`) || a.replace(/_/g, " ");
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}33`,
      whiteSpace: "nowrap" }}>
      {ACTION_ICONS[action] || "\u2022"} {label}
    </span>
  );
}

/* Security Alert Banner */
function SecurityBanner({ alerts, t }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 4, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{"\ud83d\udea8"}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#ef4444" }}>{t("audit.securityAlertTitle")}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t("audit.securityAlertDesc")}</div>
        </div>
        <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 11, fontWeight: 700 }}>{alerts.length} {t("audit.countUnit")}</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {alerts.slice(0, 3).map((a, i) => (
          <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
            <span style={{ color: "#ef4444", fontWeight: 800 }}>{ACTION_ICONS[a.action] || "\u26a0\ufe0f"}</span>
            <span style={{ flex: 1, color: "var(--text-2)" }}>{a.detail}</span>
            <span style={{ color: "var(--text-3)", fontSize: 10, whiteSpace: "nowrap" }}>{timeAgo(a.at, t)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Timeline View */
function TimelineView({ logs, t }) {
  if (logs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>
        {t("audit.noResults")}
    </div>
);
  }
  return (
    <div style={{ display: "grid", gap: 0, position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: "rgba(99,140,255,0.12)", borderRadius: 2 }} />
      {logs.map((l, idx) => {
        const color = ACTION_COLORS[l.action] || "#4f8ef7";
        return (
          <div key={l.id || idx} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: idx < logs.length - 1 ? "1px solid rgba(99,140,255,0.05)" : "none", position: "relative" }}>
            <div style={{
              position: "absolute", left: -19, top: 14,
              width: 10, height: 10, borderRadius: "50%",
              background: color, border: "2px solid var(--surface-1, #070f1a)",
              boxShadow: `0 0 8px ${color}66`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <ActionBadge action={l.action} t={t} />
                <RiskBadge risk={l.risk} t={t} />
                <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                  {fmtTs(l.at)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-1)', marginBottom: 3, lineHeight: 1.5 }}>{l.detail}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-3)" }}>
                <span>{"\ud83d\udc64"} {l.actor}</span>
                <span>{"\ud83d\udcc1"} {l.entity_type} #{l.entity_id}</span>
                {l.ip !== "\u2014" && <span>{"\ud83c\udf10"} {l.ip}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UsageGuide({ t }) {
  const [open, setOpen] = useState(false);
  const steps = [1, 2, 3, 4, 5, 6];
  const colors = ["#a855f7", "#a855f7", "#4f8ef7", "#4f8ef7", "#22c55e", "#22c55e"];
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 auto 16px", padding: "10px 24px", borderRadius: 12, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.06)", color: "#a855f7", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        {open ? `\ud83d\udcd6 ${t("audit.guideTitle")} \u25b2` : `\ud83d\udcd6 ${t("audit.guideTitle")} \u25bc`}
      </button>
      {open && (
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: 24, animation: "fadeUp 0.3s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{"\ud83e\uddd0"}</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", color: 'var(--text-1)' }}>{t("audit.guideTitle")}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>{t("audit.guideSub")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {steps.map(i => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: "rgba(168,85,247,0.03)", border: "1px solid rgba(168,85,247,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,#a855f7,#4f8ef7)", color: '#fff' }}>{i}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: colors[i - 1] }}>{t(`audit.guideStep${i}Title`)}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{t(`audit.guideStep${i}Desc`)}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.15)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4f8ef7", marginBottom: 6 }}>{"\ud83d\udca1"} {t("audit.guideTipTitle")}</div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{t("audit.guideTipDesc")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* [P3 보안거버넌스] MFA 강제 정책 + SIEM 포워딩 + 감사 SIEM 익스포트 — 관리자 거버넌스 패널 */
const _authH = () => ({ Authorization: `Bearer ${localStorage.getItem("genie_token") || localStorage.getItem("demo_genie_token") || ""}`, "Content-Type": "application/json" });
function SecurityGovernancePanel({ t }) {
  const [mfaPolicy, setMfaPolicy] = useState(null);
  const [siem, setSiem] = useState({ endpoint: "", token: "", format: "ndjson", enabled: 0, realtime: 0, realtime_min_severity: "high" });
  const [siemFormats, setSiemFormats] = useState(["ndjson", "cef", "splunk_hec"]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/auth/mfa/policy", { headers: _authH() }).then(r => r.json()).then(d => { if (d?.ok) setMfaPolicy(d); }).catch(() => {});
    fetch("/api/v424/compliance/siem", { headers: _authH() }).then(r => r.json()).then(d => { if (d?.ok && d.config) { setSiem(s => ({ ...s, ...d.config })); if (Array.isArray(d.formats)) setSiemFormats(d.formats); } }).catch(() => {});
  }, []);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const saveMfa = async (pol) => {
    try { const r = await (await fetch("/api/auth/mfa/policy", { method: "PUT", headers: _authH(), body: JSON.stringify({ policy: pol }) })).json();
      if (r?.ok) { setMfaPolicy(p => ({ ...p, policy: r.policy })); flash(t("audit.govSaved", "저장되었습니다.")); } else flash("⚠️ " + (r?.error || "실패")); }
    catch (e) { flash("⚠️ " + String(e?.message || e)); }
  };
  const saveSiem = async () => {
    setBusy(true);
    try { const r = await (await fetch("/api/v424/compliance/siem", { method: "PUT", headers: _authH(), body: JSON.stringify(siem) })).json();
      flash(r?.ok ? t("audit.govSaved", "저장되었습니다.") : "⚠️ " + (r?.error || "실패")); }
    catch (e) { flash("⚠️ " + String(e?.message || e)); } finally { setBusy(false); }
  };
  const pushSiem = async () => {
    setBusy(true);
    try { const r = await (await fetch("/api/v424/compliance/siem/push?window=7", { method: "POST", headers: _authH(), body: "{}" })).json();
      flash(r?.ok ? `✅ ${r.sent} ${t("audit.govPushed", "이벤트 전송됨")} (HTTP ${r.http_code})` : "⚠️ " + (r?.error || "실패")); }
    catch (e) { flash("⚠️ " + String(e?.message || e)); } finally { setBusy(false); }
  };
  const exportUrl = (fmt) => `/api/v424/compliance/audit-export?window=30&format=${fmt}`;
  const dl = async (fmt) => {
    try { const r = await fetch(exportUrl(fmt), { headers: _authH() }); const blob = await r.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `genie_audit.${fmt === "cef" ? "cef" : fmt === "ndjson" ? "ndjson" : "json"}`; a.click(); URL.revokeObjectURL(a.href); }
    catch (e) { flash("⚠️ " + String(e?.message || e)); }
  };
  const card = { background: "var(--surface-1,rgba(255,255,255,0.04))", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 14, padding: 16, marginBottom: 14 };
  const lbl = { fontSize: 11, color: "var(--text-3)", marginBottom: 3, fontWeight: 600 };
  const inp = { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, boxSizing: "border-box" };
  return (
    <div style={card}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>🛡️ {t("audit.govTitle", "보안 거버넌스")}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>{t("audit.govDesc", "MFA 강제 정책·SIEM 감사 포워딩·증적 내보내기(관리자).")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {/* MFA 정책 */}
        <div>
          <div style={lbl}>{t("audit.govMfa", "MFA 강제 정책")}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(mfaPolicy?.options || ["off", "admin", "all"]).map(o => (
              <button key={o} onClick={() => saveMfa(o)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: (mfaPolicy?.policy || "admin") === o ? "#a855f7" : "rgba(168,85,247,0.1)", color: (mfaPolicy?.policy || "admin") === o ? "#fff" : "#7c3aed" }}>
                {(mfaPolicy?.labels && mfaPolicy.labels[o]) || o}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 5 }}>{t("audit.govMfaHint", "강제 시 해당 사용자는 로그인 후 MFA 등록 전까지 앱 사용이 차단됩니다.")}</div>
        </div>
        {/* 감사 익스포트 */}
        <div>
          <div style={lbl}>{t("audit.govExport", "감사 증적 내보내기 (최근 30일)")}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["json", "ndjson", "cef"].map(f => (
              <button key={f} onClick={() => dl(f)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(168,85,247,0.3)", cursor: "pointer", fontSize: 11, fontWeight: 700, background: "transparent", color: "#7c3aed" }}>⬇ {f.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 5 }}>{t("audit.govExportHint", "SOC2/ISO 심사 증적·SIEM 적재용(인증·보안·운영 감사 통합).")}</div>
        </div>
      </div>
      {/* SIEM 포워딩 */}
      <div style={{ marginTop: 14, borderTop: "1px solid rgba(168,85,247,0.12)", paddingTop: 12 }}>
        <div style={lbl}>{t("audit.govSiem", "SIEM 포워딩 (Splunk HEC · Datadog · 범용 HTTPS)")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginTop: 4 }}>
          <input style={inp} placeholder="https://siem.example.com/services/collector" value={siem.endpoint || ""} onChange={e => setSiem(s => ({ ...s, endpoint: e.target.value }))} />
          <input style={inp} type="password" placeholder={t("audit.govSiemToken", "토큰(HEC/Bearer)")} value={siem.token || ""} onChange={e => setSiem(s => ({ ...s, token: e.target.value }))} />
          <select style={inp} value={siem.format || "ndjson"} onChange={e => setSiem(s => ({ ...s, format: e.target.value }))}>
            {siemFormats.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "8px 0" }}>
          <input type="checkbox" checked={!!Number(siem.enabled)} onChange={e => setSiem(s => ({ ...s, enabled: e.target.checked ? 1 : 0 }))} />
          {t("audit.govSiemEnable", "활성화")}
        </label>
        {/* [282차 R3] 실시간 포워딩 토글 — 종전엔 UI 부재로 항상 realtime=0(배치만)이었다. 켜면 임계 이상 이벤트 즉시 전송. */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, margin: "8px 0" }}>
          <input type="checkbox" checked={!!Number(siem.realtime)} onChange={e => setSiem(s => ({ ...s, realtime: e.target.checked ? 1 : 0 }))} />
          {t("audit.govSiemRealtime", "실시간 포워딩(이벤트 즉시 전송)")}
          {!!Number(siem.realtime) && (
            <select style={{ ...inp, width: "auto", padding: "4px 8px", marginLeft: 6 }} value={siem.realtime_min_severity || "high"} onChange={e => setSiem(s => ({ ...s, realtime_min_severity: e.target.value }))}>
              <option value="high">{t("audit.govSevHigh", "high 이상")}</option>
              <option value="medium">{t("audit.govSevMed", "medium 이상")}</option>
            </select>
          )}
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={saveSiem} disabled={busy} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "#a855f7", color: "#fff" }}>💾 {t("audit.govSiemSave", "SIEM 설정 저장")}</button>
          <button onClick={pushSiem} disabled={busy} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(168,85,247,0.3)", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "transparent", color: "#7c3aed" }}>📤 {t("audit.govSiemPush", "지금 전송 테스트")}</button>
        </div>
      </div>
      {msg && <div style={{ fontSize: 12, color: "#16a34a", marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function Audit() {
  const t = useT();
  const { locked } = useSecurityMonitor("audit");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]           = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterActor, setFilterActor]   = useState("all");
  const [filterRisk, setFilterRisk]     = useState("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [viewMode, setViewMode]         = useState("table");

  /* Fetch audit logs from API ([현 차수] 데모=샘플 시드로 즉시 표시, 운영=실 API) */
  useEffect(() => {
    if (IS_DEMO) { setLogs(_DEMO_AUDIT_LOGS); setLoading(false); return; }
    setLoading(true);
    fetch("/api/auth/audit-logs", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("genie_token") || localStorage.getItem("demo_genie_token") || ""}`,
        "Content-Type": "application/json",
      },
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setLogs(d.logs || d.items || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* [R-P3-6] 컴플라이언스 준비도(SOC2/ISO) — 구현 컨트롤 실측 매핑 */
  const [posture, setPosture] = useState(null);
  useEffect(() => {
    fetch("/api/v424/compliance/posture", { headers: { Authorization: `Bearer ${localStorage.getItem("genie_token") || localStorage.getItem("demo_genie_token") || ""}` } })
      .then(r => r.json()).then(d => { if (d && d.ok) setPosture(d); }).catch(() => {});
  }, []);

  const actors      = useMemo(() => [...new Set(logs.map(l => l.actor))].filter(Boolean), [logs]);
  const actionTypes = useMemo(() => [...new Set(logs.map(l => l.action))].filter(Boolean), [logs]);

  const today = todayStr();

  const filtered = useMemo(() =>
    logs.filter(l => {
      if (filterAction !== "all" && l.action !== filterAction) return false;
      if (filterActor  !== "all" && l.actor  !== filterActor)  return false;
      if (filterRisk   !== "all" && l.risk   !== filterRisk)   return false;
      if (dateFrom && l.at < dateFrom) return false;
      if (dateTo && l.at > dateTo + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!((l.detail || "").toLowerCase().includes(q) ||
              (l.action || "").toLowerCase().includes(q) ||
              (l.actor || "").toLowerCase().includes(q) ||
              (l.ip || "").includes(q))) return false;
      }
      return true;
    }), [logs, filterAction, filterActor, filterRisk, dateFrom, dateTo, search]);

  const highRisk   = logs.filter(l => l.risk === "high").length;
  const todayCount = logs.filter(l => (l.at || "").startsWith(today)).length;
  const adminActs  = logs.filter(l => l.role === "admin").length;

  /* Security alerts — high risk events from last 24h */
  const securityAlerts = useMemo(() =>
    logs.filter(l => l.risk === "high" && (Date.now() - new Date(l.at).getTime()) < 86400000)
  , [logs]);

  const actionFreq = useMemo(() => {
    const m = {};
    logs.forEach(l => { m[l.action] = (m[l.action] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const handleExport = useCallback(() => exportCsv(filtered, t), [filtered, t]);

  const resetFilters = () => {
    setSearch(""); setFilterAction("all"); setFilterActor("all"); setFilterRisk("all"); setDateFrom(""); setDateTo("");
  };
  const hasFilters = search || filterAction !== "all" || filterActor !== "all" || filterRisk !== "all" || dateFrom || dateTo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
    <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
      {/* Security Alert Banner */}
      <SecurityBanner alerts={securityAlerts} t={t} />

      {/* [R-P3-6] 컴플라이언스 준비도(SOC2/ISO) */}
      {posture && Array.isArray(posture.controls) && (() => {
        const sc = { implemented: { c: '#22c55e', l: t('audit.cmplImpl', '구현') }, available: { c: '#3b82f6', l: t('audit.cmplAvail', '코드완비') }, manual: { c: '#94a3b8', l: t('audit.cmplManual', '프로세스') } };
        const rp = posture.readiness_pct;
        const rc = rp >= 75 ? '#22c55e' : rp >= 50 ? '#d97706' : '#dc2626';
        return (
          <div style={{ background: 'var(--surface,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🛡️ {t('audit.cmplTitle', '컴플라이언스 준비도')}
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>{(posture.frameworks || []).join(' · ')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('audit.cmplReadiness', '준비도')}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: rc }}>{rp}%</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  ✓{posture.summary?.implemented} · {t('audit.cmplAvail', '코드완비')} {posture.summary?.available} · {t('audit.cmplManual', '프로세스')} {posture.summary?.manual}
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {posture.controls.map((c, i) => {
                const s = sc[c.status] || sc.manual;
                return (
                  <div key={i} style={{ border: '1px solid var(--border,#e2e8f0)', borderLeft: `3px solid ${s.c}`, borderRadius: 9, padding: '8px 11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{c.title}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: s.c, background: s.c + '1a', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>{s.l}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.4 }}>{c.evidence}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, opacity: 0.8 }}>SOC2 {c.soc2} · ISO {c.iso}</div>
                  </div>
                );
              })}
            </div>
            {posture.note && <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>ℹ️ {posture.note}</div>}
          </div>
        );
      })()}

      {/* [P3 보안거버넌스] MFA 정책 · SIEM 포워딩 · 감사 익스포트 */}
      {!IS_DEMO && <SecurityGovernancePanel t={t} />}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(79,142,247,0.15))" }}>{"\ud83e\uddf0"}</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#4f8ef7)" }}>
              {t("audit.pageTitle")}
            </div>
            <div className="hero-desc">
              {t("audit.pageDesc")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "6px 14px", background: viewMode === "table" ? "rgba(79,142,247,0.15)" : "transparent", borderColor: viewMode === "table" ? "rgba(79,142,247,0.5)" : undefined }}
            onClick={() => setViewMode("table")}
          >
            {"\ud83d\udccb"} {t("audit.tableView")}
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "6px 14px", background: viewMode === "timeline" ? "rgba(168,85,247,0.15)" : "transparent", borderColor: viewMode === "timeline" ? "rgba(168,85,247,0.5)" : undefined }}
            onClick={() => setViewMode("timeline")}
          >
            {"\ud83d\udd70"} {t("audit.timelineView")}
          </button>
          <button
            className="btn-primary"
            style={{ fontSize: 11, padding: "6px 14px", background: "linear-gradient(135deg,#22c55e,#14d9b0)", marginLeft: "auto" }}
            onClick={handleExport}
          >
            {"\ud83d\udce5"} {t("audit.csvExport")} ({filtered.length}{t("audit.countUnit")})
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t("audit.totalEvents"),   v: logs.length,   s: t("audit.totalEventsDesc"),  c: "#4f8ef7" },
          { l: t("audit.todayEvents"),   v: todayCount,    s: today,                       c: "#14d9b0" },
          { l: t("audit.highRisk"),      v: highRisk,      s: t("audit.highRiskDesc"),      c: "#ef4444" },
          { l: t("audit.adminActions"),  v: adminActs,     s: t("audit.adminActionsDesc"),  c: "#a855f7" },
        ].map(({ l, v, s, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{loading ? "\u2014" : v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Event Distribution + Risk Summary */}
      <div className="grid2 fade-up fade-up-2">
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.eventDistribution")}</div>
          {actionFreq.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)", fontSize: 12 }}>{t("audit.noData", "데이터가 없습니다")}</div>
          )}
          {actionFreq.map(([action, cnt]) => {
            const color = ACTION_COLORS[action] || "#4f8ef7";
            return (
              <div key={action} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>{ACTION_ICONS[action] || "\u2022"}</span>
                    <span>{t(`audit.action_${action}`) || action.replace(/_/g, " ")}</span>
                  </span>
                  <span style={{ fontWeight: 700, color }}>{cnt}{t("audit.countUnit")}</span>
                </div>
                <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${(cnt / (logs.length || 1)) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.riskClassification")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {["high", "medium", "low"].map(risk => {
              const cfg = RISK_CFG[risk];
              const cnt = logs.filter(l => l.risk === risk).length;
              const label = t(`audit.risk${risk.charAt(0).toUpperCase() + risk.slice(1)}`);
              return (
                <div key={risk} onClick={() => setFilterRisk(filterRisk === risk ? "all" : risk)}
                  style={{
                    padding: "12px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                    background: filterRisk === risk ? cfg.bg : "var(--surface2, rgba(99,140,255,0.04))",
                    border: `1px solid ${filterRisk === risk ? cfg.color + "66" : "rgba(99,140,255,0.12)"}`,
                    transition: "all 150ms" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{cnt}</div>
                  <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, marginTop: 2 }}>{label}</div>
              
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("audit.highRiskEvents")}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {logs.filter(l => l.risk === "high").length === 0 && (
              <div style={{ textAlign: "center", padding: 16, color: "var(--text-3)", fontSize: 11 }}>{t("audit.noHighRisk")}</div>
            )}
            {logs.filter(l => l.risk === "high").slice(0, 5).map((l, i) => (
              <div key={l.id || i} style={{ padding: "8px 10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>{ACTION_ICONS[l.action]} {t(`audit.action_${l.action}`) || (l.action || '').replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: "auto" }}>{timeAgo(l.at, t)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{l.detail}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t("audit.byActor")} {l.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search/Filter bar */}
      <div className="card card-glass fade-up fade-up-3" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input" style={{ flex: 1, minWidth: 180, padding: "7px 10px", fontSize: 11 }}
            placeholder={t("audit.searchPlaceholder")} value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input" style={{ width: 170, padding: "7px 10px", fontSize: 11 }}
            value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="all">{t("audit.filterEventType")}</option>
            {actionTypes.map(a => <option key={a} value={a}>{ACTION_ICONS[a]} {t(`audit.action_${a}`) || a.replace(/_/g, " ")}</option>)}
          </select>
          <select className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={filterActor} onChange={e => setFilterActor(e.target.value)}>
            <option value="all">{t("audit.filterActor")}</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input" style={{ width: 110, padding: "7px 10px", fontSize: 11 }}
            value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="all">{t("audit.filterRisk")}</option>
            <option value="high">{"\ud83d\udd34"} {t("audit.riskHigh")}</option>
            <option value="medium">{"\ud83d\udfe1"} {t("audit.riskMedium")}</option>
            <option value="low">{"\ud83d\udfe2"} {t("audit.riskLow")}</option>
          </select>
          <input type="date" className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            title={t("audit.dateFrom")}
          />
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>~</span>
          <input type="date" className="input" style={{ width: 130, padding: "7px 10px", fontSize: 11 }}
            value={dateTo} onChange={e => setDateTo(e.target.value)}
            title={t("audit.dateTo")}
          />
          <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
            {filtered.length}/{logs.length}{t("audit.countUnit")}
          </span>
          {hasFilters && (
            <button className="btn-ghost" style={{ fontSize: 10, padding: "6px 10px" }}
              onClick={resetFilters}>
              {t("audit.filterReset")}
            </button>
          )}
        </div>
      </div>

      {/* Log view */}
      <div className="card card-glass fade-up fade-up-4">
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "glow 1.5s ease infinite" }}>{"\u23f3"}</div>
            {t("audit.loading")}
          </div>
        ) : viewMode === "table" ? (
          <>
            <div className="section-title" style={{ marginBottom: 14 }}>{t("audit.logTable")}</div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>{t("audit.colId")}</th>
                    <th>{t("audit.colTime")}</th>
                    <th>{t("audit.colActor")}</th>
                    <th>{t("audit.colEvent")}</th>
                    <th>{t("audit.colRisk")}</th>
                    <th>{t("audit.colTarget")}</th>
                    <th>{t("audit.colIp")}</th>
                    <th>{t("audit.colDetail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td style={{ color: "var(--text-3)", fontFamily: "monospace" }}>#{l.id ?? (idx + 1)}{/*[266차] auth_audit_log 는 id 컬럼 부재(PK=at)→행번호 폴백(빈 '#' 해소)*/}</td>
                      <td style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{fmtTs(l.at)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: l.actor === "system" || l.actor === "operator" ? "var(--text-3)" : "var(--text-1)" }}>
                          {l.actor}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{l.role}</div>
                      </td>
                      <td><ActionBadge action={l.action} t={t} /></td>
                      <td><RiskBadge risk={l.risk} t={t} /></td>
                      <td style={{ color: "var(--text-3)", fontSize: 10 }}>
                        {/*[266차] entity_type/entity_id 는 auth_audit_log 에 부재(데모 아티팩트)→부재 시 '—'(빈값 해소)*/}
                        {l.entity_type || '—'}
                        {l.entity_id ? (<><br /><span style={{ fontFamily: "monospace", color: "#4f8ef7" }}>#{l.entity_id}</span></>) : null}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-3)" }}>{l.ip}</td>
                      <td style={{ color: "var(--text-2)", maxWidth: 320 }}>{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
                  {t("audit.noResults")}
                </div>
              )}
          </>
        ) : (
          <>
            <div className="section-title" style={{ marginBottom: 18 }}>{t("audit.timelineHeader")}</div>
            <TimelineView logs={filtered} t={t} />
          </>
        )}
      </div>

      {/* Usage Guide */}
      <UsageGuide t={t} />
    </div>
    </div>
    </div>
  );
}
