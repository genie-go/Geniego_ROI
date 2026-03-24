import React from "react";
import { useT } from "../i18n/index.js";

const RISKS = [
  { name: "Account Health Warning", severity: "high", sku: "ACC-001", channel: "Amazon", desc: "Account Health Score 85 → 72 (↓13)", time: "10 min ago" },
  { name: "Review Drop", severity: "medium", sku: "SKU-B2031", channel: "Amazon", desc: "4.6★ → 3.9★ (38 negative reviews in last 7 days)", time: "1 hr ago" },
  { name: "FBA Stock Running Low", severity: "medium", sku: "SKU-D1108", channel: "Amazon", desc: "Stock 40 units · 32 days remaining (safety stock: 60)", time: "2 hrs ago" },
  { name: "Buy Box Share Drop", severity: "low", sku: "SKU-A1024", channel: "Amazon", desc: "97% → 84% (competitor price cut ₩1,200)", time: "4 hrs ago" },
  { name: "Policy Violation Warning", severity: "high", sku: "SKU-C0412", channel: "Amazon", desc: "Listing image TOS violation detected", time: "6 hrs ago" },
];

const COLOR = { high: "#ef4444", medium: "#eab308", low: "#4f8ef7" };

export default function AmazonRisk() {
  const t = useT();
  const high = RISKS.filter(r => r.severity === "high").length;
  const medium = RISKS.filter(r => r.severity === "medium").length;

  const METRICS = [
    { l: "Account Health", v: 72, max: 100, unit: t("units.pts"), color: "#eab308" },
    { l: "Buy Box Rate", v: 84, max: 100, unit: "%", color: "#4f8ef7" },
    { l: t("amazonRisk.avgRating"), v: 4.1, max: 5, unit: "★", color: "#22c55e" },
    { l: t("amazonRisk.fbaStockRate"), v: 68, max: 100, unit: "%", color: "#a855f7" },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="grid4">
        {[
          { l: t("amazonRisk.highRisk"), v: high.toString(), c: "#ef4444" },
          { l: t("amazonRisk.mediumRisk"), v: medium.toString(), c: "#eab308" },
          { l: t("amazonRisk.accountScore"), v: `72${t("units.pts")}`, c: "#eab308" },
          { l: t("amazonRisk.buyBox"), v: "84%", c: "#4f8ef7" },
        ].map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid21">
        {/* Risk list */}
        <div className="card card-glass">
          <div className="section-header">
            <div className="section-title">{t("amazonRisk.riskAlerts")}</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {RISKS.map((r, i) => (
              <div key={i} className="card card-hover" style={{
                padding: "12px 14px",
                borderLeft: `3px solid ${COLOR[r.severity]}`, borderColor: `${COLOR[r.severity]}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span className="badge" style={{
                        fontSize: 10,
                        background: `${COLOR[r.severity]}22`, borderColor: `${COLOR[r.severity]}44`, color: COLOR[r.severity]
                      }}>
                        {r.severity}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>{r.desc}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                      <span className="mono">{r.sku}</span> · {r.channel} · {r.time}
                    </div>
                  </div>
                  <button className="btn" style={{ fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>{t("amazonRisk.action")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric gauges */}
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 18 }}>{t("amazonRisk.keyMetrics")}</div>
          {METRICS.map(m => {
            const pct = (m.v / m.max) * 100;
            return (
              <div key={m.l} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.l}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.v}{m.unit}</span>
                </div>
                <div className="progress-track" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: m.color, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, textAlign: "right" }}>
                  {t("amazonRisk.goal")}: {m.max}{m.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
