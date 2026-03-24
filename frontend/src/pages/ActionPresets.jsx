import React, { useState } from "react";
import { useI18n } from "../i18n";

const PRESETS = [
  {
    id: "pause_campaign",
    icon: "⏸",
    label: "Pause Campaign",
    color: "#ef4444",
    platforms: ["Meta", "TikTok", "Naver", "Google"],
    trigger: "CPC > threshold OR ROAS < lower bound",
    params: { platform: "meta", campaign_id: "{{campaign_id}}", reason: "auto-pause" },
    risk: "high",
    approvalRequired: true,
    desc: "Immediately pauses an ad campaign. High-risk action requiring mandatory approval.",
  },
  {
    id: "budget_cut",
    icon: "📉",
    label: "Budget Cut",
    color: "#f97316",
    platforms: ["Meta", "TikTok", "Coupang"],
    trigger: "ROAS < 1.5 for 3 consecutive days",
    params: { platform: "tiktok", campaign_id: "{{campaign_id}}", cut_pct: 30 },
    risk: "medium",
    approvalRequired: true,
    desc: "Automatically cuts a percentage of the current budget. Can be auto-restored when ROAS recovers.",
  },
  {
    id: "budget_increase",
    icon: "📈",
    label: "Budget Boost",
    color: "#22c55e",
    platforms: ["Meta", "TikTok", "Coupang", "Naver"],
    trigger: "ROAS > 4.5 for 2 consecutive days",
    params: { platform: "coupang", campaign_id: "{{campaign_id}}", boost_pct: 20 },
    risk: "low",
    approvalRequired: false,
    desc: "Automatically increases budget for high-performing campaigns. Max cap setting required.",
  },
  {
    id: "price_change",
    icon: "💡",
    label: "Auto Price Adjustment",
    color: "#4f8ef7",
    platforms: ["Amazon KR", "Coupang", "Naver"],
    trigger: "Stock > 500 OR Competitor price -5%",
    params: { sku: "{{sku}}", channel: "{{channel}}", delta_krw: -15000 },
    risk: "medium",
    approvalRequired: true,
    desc: "Applies price optimization engine's recommended price immediately. Operates within per-SKU / per-channel limits.",
  },
  {
    id: "notify_slack",
    icon: "🔔",
    label: "Send Slack Alert",
    color: "#a855f7",
    platforms: ["All"],
    trigger: "Any condition (policy-defined)",
    params: { channel: "#ops-alerts", mention: "@channel", template: "{{alert_summary}}" },
    risk: "low",
    approvalRequired: false,
    desc: "Sends an immediate notification to the designated Slack channel. No approval needed for informational actions.",
  },
  {
    id: "writeback_catalog",
    icon: "🔄",
    label: "Catalog Write-back",
    color: "#14d9b0",
    platforms: ["Amazon KR", "Coupang"],
    trigger: "On price / stock change",
    params: { sku: "{{sku}}", field: "price", value: "{{recommended_price}}" },
    risk: "high",
    approvalRequired: true,
    desc: "Automatically reflects optimized price/quantity into the channel catalog.",
  },
];

const RISK_CONFIG = {
  low: { label: "Low Risk", badge: "badge-green", color: "#22c55e" },
  medium: { label: "Medium Risk", badge: "badge-yellow", color: "#eab308" },
  high: { label: "High Risk", badge: "badge-red", color: "#ef4444" },
};

export default function ActionPresets() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(null);
  const [filterRisk, setFilterRisk] = useState("all");

  const filtered = filterRisk === "all" ? PRESETS : PRESETS.filter(p => p.risk === filterRisk);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(20,217,176,0.25),rgba(168,85,247,0.15))" }}>🧰</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#14d9b0,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("actionPresets.pageTitle")}
            </div>
            <div className="hero-desc">{t("actionPresets.pageSub")}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: "Total Presets", v: PRESETS.length, c: "#4f8ef7" },
          { l: "Approval Required", v: PRESETS.filter(p => p.approvalRequired).length, c: "#f97316" },
          { l: "Auto Execute", v: PRESETS.filter(p => !p.approvalRequired).length, c: "#22c55e" },
          { l: "Supported Platforms", v: 6, c: "#a855f7" },
        ].map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="section-title">🧩 {t("actionPresets.presetList")}</div>
          <div className="tabs">
            {["all", "low", "medium", "high"].map(r => (
              <button key={r} className={`tab ${filterRisk === r ? "active" : ""}`} onClick={() => setFilterRisk(r)}>
                {r === "all" ? t("actionPresets.risk.all") : t(`actionPresets.risk.${r}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid3 fade-up fade-up-3">
        {filtered.map(p => {
          const rc = RISK_CONFIG[p.risk];
          const isSelected = selected === p.id;
          return (
            <div
              key={p.id}
              className="card card-hover"
              style={{
                padding: "16px 18px",
                cursor: "pointer",
                borderColor: isSelected ? `${p.color}55` : undefined,
                background: isSelected ? `${p.color}08` : undefined,
                borderLeft: `3px solid ${p.color}`,
              }}
              onClick={() => setSelected(isSelected ? null : p.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: p.color }}>{t("demo." + p.label) !== "demo." + p.label ? t("demo." + p.label) : p.label}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-3)", marginTop: 1 }}>{p.id}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <span className={`badge ${rc.badge}`} style={{ fontSize: 10 }}>{rc.label}</span>
                  {p.approvalRequired
                    ? <span className="badge badge-orange" style={{ fontSize: 10 }}>Approval Required</span>
                    : <span className="badge badge-green" style={{ fontSize: 10 }}>Auto Execute</span>
                  }
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10 }}>{t("demo." + p.desc) !== "demo." + p.desc ? t("demo." + p.desc) : p.desc}</div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4, fontWeight: 700 }}>Trigger Condition</div>
                <div style={{ fontSize: 11, color: "#eab308", padding: "4px 8px", background: "rgba(234,179,8,0.07)", borderRadius: 5, border: "1px solid rgba(234,179,8,0.2)" }}>
                  {p.trigger}
                </div>
              </div>

              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {p.platforms.map(pl => (
                  <span key={pl} className="badge" style={{ fontSize: 9, padding: "2px 6px" }}>{pl}</span>
                ))}
              </div>

              {isSelected && (
                <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(6,11,20,0.9)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>⚙ Parameter Template</div>
                  <pre style={{ fontSize: 11, fontFamily: "monospace", color: "#4f8ef7", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {JSON.stringify(p.params, null, 2)}
                  </pre>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
                    <code style={{ color: "#a855f7" }}>{"{{variable}}"}</code> placeholders are bound in Alert Policy settings.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guide */}
      <div className="card card-glass fade-up fade-up-4">
        <div className="section-title" style={{ marginBottom: 12 }}>📖 {t("actionPresets.usageGuide")}</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { step: "1", title: t("actionPresets.guide.step1.title"), desc: t("actionPresets.guide.step1.desc") },
            { step: "2", title: t("actionPresets.guide.step2.title"), desc: t("actionPresets.guide.step2.desc") },
            { step: "3", title: t("actionPresets.guide.step3.title"), desc: t("actionPresets.guide.step3.desc") },
            { step: "4", title: t("actionPresets.guide.step4.title"), desc: t("actionPresets.guide.step4.desc") },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: "rgba(9,15,30,0.5)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.08)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#4f8ef7,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {step}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
