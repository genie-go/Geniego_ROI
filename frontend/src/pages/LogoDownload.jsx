import React, { useState } from "react";
import { useI18n } from '../i18n';

export default function LogoDownload() {
  const { t } = useI18n();
  const [downloaded, setDownloaded] = useState({});

  const logos = [
    { id: 'primary', name: 'Primary Logo', desc: 'Full color logo for light backgrounds', emoji: '🎨', formats: ['SVG', 'PNG', 'PDF'] },
    { id: 'dark', name: 'Dark Mode Logo', desc: 'White logo for dark backgrounds', emoji: '🌙', formats: ['SVG', 'PNG'] },
    { id: 'icon', name: 'Icon Only', desc: 'Square icon for favicons and apps', emoji: '⬛', formats: ['SVG', 'PNG', 'ICO'] },
    { id: 'horizontal', name: 'Horizontal', desc: 'Wide format for headers and emails', emoji: '📐', formats: ['SVG', 'PNG'] },
  ];

  const handleDownload = (logoId, format) => {
    setDownloaded(prev => ({ ...prev, [`${logoId}-${format}`]: true }));
    // In production, this would trigger actual file download
    setTimeout(() => setDownloaded(prev => ({ ...prev, [`${logoId}-${format}`]: false })), 2000);
  };

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{
        borderRadius: 18, padding: "28px 32px", marginBottom: 22,
        background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))",
        border: "1px solid rgba(79,142,247,0.12)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🖼️</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>🖼️ Brand Assets</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>Download official logos and brand guidelines</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {logos.map(logo => (
          <div key={logo.id} style={{
            borderRadius: 16, padding: "24px", background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(0,0,0,0.06)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg,#4f8ef7,#6366f1)", fontSize: 24
              }}>{logo.emoji}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-1, #1e293b)" }}>{logo.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3, #64748b)" }}>{logo.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {logo.formats.map(fmt => {
                const key = `${logo.id}-${fmt}`;
                return (
                  <button key={fmt} onClick={() => handleDownload(logo.id, fmt)} style={{
                    padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: downloaded[key] ? "rgba(34,197,94,0.1)" : "rgba(79,142,247,0.06)",
                    color: downloaded[key] ? "#16a34a" : "var(--text-2, #475569)",
                    fontWeight: 700, fontSize: 11, transition: "all 0.2s"
                  }}>
                    {downloaded[key] ? '✅' : '📥'} {fmt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 24, padding: "20px 28px", borderRadius: 14,
        background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1, #1e293b)", marginBottom: 6 }}>📋 Brand Guidelines</div>
        <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", lineHeight: 1.6 }}>
          • Minimum clear space: 1x logo height on all sides<br/>
          • Do not stretch, rotate, or recolor the logo<br/>
          • Primary brand color: #4f8ef7 (Geniego Blue)
        </div>
      </div>
    </div>
  );
}
