import React, { useState } from "react";

/* Admin 전용 — 한국어 고정 */
export default function DbAdmin() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['데이터베이스 현황', '테이블 관리', '쿼리 실행기', '백업/복구'];
  const kpis = [
    { emoji: '💾', label: 'DB 크기', val: '2.4 GB' },
    { emoji: '📊', label: '테이블 수', val: 48 },
    { emoji: '✅', label: '연결 상태', val: '정상' },
    { emoji: '⏱️', label: '가동시간', val: '99.97%' },
  ];

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{ borderRadius: 18, padding: "28px 32px", marginBottom: 22, background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.06))", border: "1px solid rgba(239,68,68,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🗄️</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>🗄️ 데이터베이스 관리</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>관리자 전용 · DB 모니터링 및 관리 도구</div>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginTop: 4, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.08)", display: "inline-block" }}>⚠️ 관리자 전용 — 주의하여 사용하세요</div>
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
          {['자동 백업 스케줄링', '실시간 쿼리 모니터', '인덱스 최적화', '접속 로그 감사'].map((f, i) => (
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
