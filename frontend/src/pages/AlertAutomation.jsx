import React, { useState } from "react";
import { useI18n } from '../i18n';

const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

export default function AlertAutomation() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["Rules","History","Channels","Escalation"];
  const kpis = [{"emoji":"🔔","label":"Active Rules","val":15},{"emoji":"📧","label":"Sent Today","val":34},{"emoji":"✅","label":"Auto-resolved","val":12},{"emoji":"🔇","label":"Suppressed","val":5}];

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{
        borderRadius: 18, padding: "28px 32px", marginBottom: 22,
        background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))",
        border: "1px solid rgba(79,142,247,0.12)", backdropFilter: "blur(16px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🔔</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>🔔 Alert Automation</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>Configure smart alerts and automated responses</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: "18px 20px",
            background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12, transition: "all 0.2s",
            background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
            color: activeTab === i ? "#fff" : "var(--text-2, #475569)"
          }}>{tab}</button>
        ))}
      </div>
      <div style={{
        borderRadius: 16, padding: "28px 32px", minHeight: 320,
        background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1, #1e293b)", marginBottom: 16 }}>{tabs[activeTab]}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {["Multi-channel delivery","Intelligent suppression","Escalation chains","Custom conditions"].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.08)"
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800
              }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1, #1e293b)" }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 24, padding: "16px 20px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))",
          border: "1px solid rgba(34,197,94,0.12)", display: "flex", alignItems: "center", gap: 10
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>System Operational</span>
        </div>
      </div>
    </div>
  );
}
