import React, { useState } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

/* ── Enterprise Demo Isolation Guard ─── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

export default function ReportBuilder() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    t('reportBuilder.tabMyReports', 'My Reports'),
    t('reportBuilder.tabTemplates', 'Templates'),
    t('reportBuilder.tabScheduled', 'Scheduled'),
    t('reportBuilder.tabExportHistory', 'Export History'),
  ];
  // 181차 가상데이터 오염 해소: 운영=실데이터 부재 시 0(빈값), 데모만 시드 노출
  const kpis = [
    { emoji: "📄", label: t('reportBuilder.kpiSaved', 'Saved Reports'),   val: _isDemo ? 12 : 0 },
    { emoji: "📅", label: t('reportBuilder.kpiScheduled', 'Scheduled'),    val: _isDemo ? 5  : 0 },
    { emoji: "📤", label: t('reportBuilder.kpiExportedToday', 'Exported Today'), val: _isDemo ? 8 : 0 },
    { emoji: "👥", label: t('reportBuilder.kpiShared', 'Shared'),          val: _isDemo ? 3  : 0 },
  ];
  const features = [
    t('reportBuilder.featDragDrop', 'Drag-and-drop widgets'),
    t('reportBuilder.featExport', 'PDF/Excel export'),
    t('reportBuilder.featSchedule', 'Scheduled email delivery'),
    t('reportBuilder.featDateRange', 'Custom date ranges'),
  ];

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      {/* ── Hero Header ── */}
      <div style={{
        borderRadius: 18, padding: "28px 32px", marginBottom: 22,
        background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))",
        border: "1px solid rgba(79,142,247,0.12)", backdropFilter: "blur(16px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>📊</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>📊 {t('reportBuilder.heroTitle', 'Report Builder')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>{t('reportBuilder.heroDesc', 'Create custom reports with drag-and-drop widgets')}</div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: "18px 20px",
            background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)",
            backdropFilter: "blur(8px)"
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Sub Tabs ── */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
        background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)"
      }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12, transition: "all 0.2s",
            background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
            color: activeTab === i ? "#fff" : "var(--text-2, #475569)"
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content Area ── */}
      <div style={{
        borderRadius: 16, padding: "28px 32px", minHeight: 320,
        background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1, #1e293b)", marginBottom: 16 }}>
          {tabs[activeTab]}
        </div>
        
        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
              borderRadius: 10, background: "rgba(79,142,247,0.04)",
              border: "1px solid rgba(79,142,247,0.08)"
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800
              }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1, #1e293b)" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Status Banner */}
        <div style={{
          marginTop: 24, padding: "16px 20px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))",
          border: "1px solid rgba(34,197,94,0.12)", display: "flex", alignItems: "center", gap: 10
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
            {t('reportBuilder.statusOperational', 'System Operational — All services running normally')}
          </span>
        </div>
      </div>
    </div>
  );
}
