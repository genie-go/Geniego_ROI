import React, { useState } from "react";

/* Admin 전용 — 한국어 고정 */
export default function MenuAccessPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['메뉴 권한 설정', '역할별 접근', '감사 로그', '정책 관리'];
  const kpis = [
    { emoji: '🔐', label: '역할 수', val: 6 },
    { emoji: '📋', label: '메뉴 항목', val: 94 },
    { emoji: '👥', label: '사용자', val: 24 },
    { emoji: '🔒', label: '제한 메뉴', val: 12 },
  ];

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{ borderRadius: 18, padding: "28px 32px", marginBottom: 22, background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.06))", border: "1px solid rgba(239,68,68,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🔐</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>🔐 메뉴 접근 권한 관리</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>관리자 전용 · 역할 기반 접근 제어(RBAC)</div>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginTop: 4, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.08)", display: "inline-block" }}>⚠️ 관리자 전용</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s", background: activeTab === i ? "linear-gradient(135deg,#dc2626,#ef4444)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-2, #475569)" }}>{tab}</button>
        ))}
      </div>
      <div style={{ borderRadius: 16, padding: "28px 32px", minHeight: 300, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1, #1e293b)", marginBottom: 16 }}>{tabs[activeTab]}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {['역할 기반 접근 제어(RBAC)', '메뉴별 권한 매트릭스', '접근 이력 감사 로그', 'IP 기반 접근 제한'].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.08)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1, #1e293b)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
