import React from "react";
import { useI18n } from '../i18n';

export default function AlertAutomation() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", padding: "22px 28px", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>AlertAutomation</div>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Coming Soon</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Coming Soon</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>Under development.</div>
        </div>
      </div>
    </div>
  );
}

