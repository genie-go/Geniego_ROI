import React from "react";

import { useT } from '../i18n/index.js';
const LOGOS = [
  {
    src: "/logo_v1.png",
    file: "Geniego-ROI_Logo_v1.png",
    version: "Version 1",
    vclass: "v1",
    title: "Genie + 데이터 Analysis Emphasis",
    desc: "Genie 캐릭터가 마법 램프에서 등장하며 ROI Chart와 Graph를 들고 있는 프리미엄 Style",
  },
  {
    src: "/logo_v2.png",
    file: "Geniego-ROI_Logo_v2.png",
    version: "Version 2",
    vclass: "v2",
    title: "원형 엠블렘 미니멀형",
    desc: "원형 배지 안에 Genie + 램프가 담긴 미니멀 프리미엄 엠블렘 Style",
  },
  {
    src: "/logo_v3.png",
    file: "Geniego-ROI_Logo_v3.png",
    version: "Version 3",
    vclass: "v3",
    title: "원본 Genie 얼굴 유지형",
    desc: "원본 Genie 캐릭터 얼굴(귀 포함)을 Max한 보존한 마법 램프 조합 로고",
  },
];

const vcolor = {
  v1: { bg: "rgba(79,142,247,0.18)", color: "#93c5fd", border: "rgba(79,142,247,0.3)" },
  v2: { bg: "rgba(168,85,247,0.18)", color: "#c4b5fd", border: "rgba(168,85,247,0.3)" },
  v3: { bg: "rgba(20,217,176,0.14)", color: "#5eead4", border: "rgba(20,217,176,0.3)" },
};

export default function LogoDownload() {
  return (
    <div style={{
      minHeight: "100vh", padding: "40px 20px 80px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 16px", borderRadius: 99,
          background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.28)",
          fontSize: 11, color: "#93c5fd", fontWeight: 700, letterSpacing: "0.4px",
          marginBottom: 16,
        }}>🎨 로고 에셋 센터</div>
        <h1 style={{
          fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 900, letterSpacing: "-1px",
          background: "linear-gradient(135deg, #4f8ef7, #a855f7, #14d9b0)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: 10, lineHeight: 1.2,
        }}>Geniego-ROI 로고</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)" }}>원하는 Version을 Select해 PNG로 Download하세요</p>
      </div>

      {/* Card 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 24, maxWidth: 900, margin: "0 auto",
      }}>
        {LOGOS.map((logo) => {
          const vc = vcolor[logo.vclass];
          return (
            <div key={logo.version} style={{
              background: "rgba(13,21,37,0.88)",
              border: "1px solid rgba(99,140,255,0.14)",
              borderRadius: 20, overflow: "hidden",
              transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "rgba(79,142,247,0.35)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "rgba(99,140,255,0.14)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Image 영역 */}
              <div style={{
                background: "linear-gradient(135deg, rgba(15,25,50,0.9), rgba(10,16,35,0.95))",
                padding: 24, display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 220,
              }}>
                <img
                  src={logo.src}
                  alt={logo.title}
                  style={{
                    maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8,
                    filter: "drop-shadow(0 8px 24px rgba(79,142,247,0.3))",
                  }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              {/* Card 바디 */}
              <div style={{ padding: "20px 20px 22px" }}>
                <span style={{
                  display: "inline-block", fontSize: 9, fontWeight: 800, padding: "2px 8px",
                  borderRadius: 99, marginBottom: 8,
                  background: vc.bg, color: vc.color, border: `1px solid ${vc.border}`,
                }}>{logo.version}</span>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 5, color: "#e8f0ff" }}>{logo.title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 18, lineHeight: 1.65 }}>{logo.desc}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a
                    href={logo.src}
                    download={logo.file}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 20px", borderRadius: 10,
                      background: "linear-gradient(135deg, #4f8ef7, #6366f1)",
                      color: "#fff", fontWeight: 700, fontSize: 12,
                      textDecoration: "none", boxShadow: "0 4px 16px rgba(79,142,247,0.35)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(79,142,247,0.55)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(79,142,247,0.35)"; e.currentTarget.style.transform = "none"; }}
                  >
                    ⬇ PNG Download
                  </a>
                  <a
                    href={logo.src}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 16px", borderRadius: 10,
                      background: "rgba(79,142,247,0.08)", color: "#93c5fd",
                      border: "1px solid rgba(79,142,247,0.28)",
                      fontWeight: 700, fontSize: 12, textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,142,247,0.18)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(79,142,247,0.08)"; }}
                  >
                    🔍 크게 보기
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 푸터 */}
      <div style={{ textAlign: "center", marginTop: 48, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
        Geniego-ROI · AI Marketing ROI Platform · 로고 에셋 v1.0
      </div>
    </div>
  );
}
