import React from "react";
import { useT } from "../i18n/index.js";
import { IS_DEMO } from "../utils/demoEnv.js";  // 197차 운영 목데이터 격리

const RISKS = [
  { name: "Account Health Warning", severity: "high", sku: "ACC-001", channel: "Amazon", desc: "Account Health Score 85 → 72 (↓13)", time: "10 min ago" },
  { name: "Review Drop", severity: "medium", sku: "SKU-B2031", channel: "Amazon", desc: "4.6★ → 3.9★ (38 negative reviews in last 7 days)", time: "1 hr ago" },
  { name: "FBA Stock Running Low", severity: "medium", sku: "SKU-D1108", channel: "Amazon", desc: "Stock 40 units · 32 days remaining (safety stock: 60)", time: "2 hrs ago" },
  { name: "Buy Box Share Drop", severity: "low", sku: "SKU-A1024", channel: "Amazon", desc: "97% → 84% (competitor price cut KRW 1,200)", time: "4 hrs ago" },
  { name: "Policy Violation Warning", severity: "high", sku: "SKU-C0412", channel: "Amazon", desc: "Listing image TOS violation detected", time: "6 hrs ago" },
];

const COLOR = { high: "#ef4444", medium: "#eab308", low: "#4f8ef7" };

export default function AmazonRisk() {
  const t = useT();
  // 197차 운영 목데이터 격리(U-177-A): 데모=가상 리스크, 운영=실데이터 연동 전 빈 상태(가짜 알림·KPI 금지)
  const risks = IS_DEMO ? RISKS : [];
  const high = risks.filter(r => r.severity === "high").length;
  const medium = risks.filter(r => r.severity === "medium").length;
  const DASH = "—";

  const METRICS = IS_DEMO ? [
    { l: "Account Health", v: 72, max: 100, unit: t("units.pts"), color: "#eab308" },
    { l: "Buy Box Rate", v: 84, max: 100, unit: "%", color: "#4f8ef7" },
    { l: t("amazonRisk.avgRating"), v: 4.1, max: 5, unit: "★", color: "#22c55e" },
    { l: t("amazonRisk.fbaStockRate"), v: 68, max: 100, unit: "%", color: "#a855f7" },
  ] : [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="grid4">
        {[
          { l: t("amazonRisk.highRisk"), v: high.toString(), c: "#ef4444" },
          { l: t("amazonRisk.mediumRisk"), v: medium.toString(), c: "#eab308" },
          { l: t("amazonRisk.accountScore"), v: IS_DEMO ? `72${t("units.pts")}` : DASH, c: "#eab308" },
          { l: t("amazonRisk.buyBox"), v: IS_DEMO ? "84%" : DASH, c: "#4f8ef7" },
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
            {risks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-3)", fontSize: 12 }}>{t("amazonRisk.empty", "Amazon 계정을 연동하면 계정 건강·리뷰·재고·정책 리스크가 실시간으로 감지되어 표시됩니다.")}</div>
            ) : risks.map((r, i) => (
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
                  <button onClick={() => { window.location.href = '/digital-shelf'; }} className="btn" style={{ fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>{t("amazonRisk.action")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric gauges */}
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 18 }}>{t("amazonRisk.keyMetrics")}</div>
          {METRICS.length === 0 && <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--text-3)", fontSize: 12 }}>{t("amazonRisk.metricsEmpty", "연동 후 핵심 지표가 표시됩니다.")}</div>}
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

import { useI18n } from '../i18n/index.js';