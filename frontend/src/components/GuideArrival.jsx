import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * [237차] 가이드 바로가기 도착 스포트라이트 — 위저드 '바로 가기'로 페이지에 도착하면
 *   ① "👉 이 화면에서 [할 일]" 안내 배너를 즉시 표시(이용자가 어디서 무엇을 할지 바로 인지) +
 *   ② 해당 페이지의 동작 영역([data-onboard-cta])으로 자동 스크롤·강조(있을 때, best-effort).
 *   ★sessionStorage 플래그/힌트 사용(URL 파라미터 조기 제거 레이스 회피). 배너는 힌트가 있으면 항상 표시.
 *   GuideWizard 가 바로가기 직전 genie_onboard_focus=1, genie_onboard_hint=<단계 안내문> 세팅 → 1회성 소비.
 */
const FLAG = "genie_onboard_focus";
const HINT = "genie_onboard_hint";

export default function GuideArrival() {
  const loc = useLocation();
  const [hint, setHint] = useState(null);

  useEffect(() => {
    let active = false, stored = "";
    try { active = sessionStorage.getItem(FLAG) === "1"; stored = sessionStorage.getItem(HINT) || ""; } catch (e) { return; }
    if (!active) return;
    try { sessionStorage.removeItem(FLAG); sessionStorage.removeItem(HINT); } catch (e) {} // 1회성 소비
    // 배너 즉시 표시(신뢰) — CTA 탐색 여부와 무관하게 '여기서 무엇을 할지' 안내
    setHint(stored || "이 화면에서 등록·선택을 진행하세요");
    // 동작 영역 스크롤·강조(있을 때, 재렌더 대비 반복 시도)
    let tries = 0, done = false;
    const timer = setInterval(() => {
      tries++;
      const el = document.querySelector("[data-onboard-cta]");
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        el.classList.add("gw-arrival-pulse");
        const h = el.getAttribute("data-onboard-hint"); if (h) setHint(h);
        if (el.getAttribute("data-onboard-open") === "1") setTimeout(() => { try { el.click(); } catch (e) {} }, 700);
        if (tries >= 3) { clearInterval(timer); done = true; setTimeout(() => { try { el.classList.remove("gw-arrival-pulse"); } catch (e) {} }, 8000); }
      } else if (tries > 30) { clearInterval(timer); done = true; }
    }, 250);
    // 배너 자동 정리(20초)
    const hide = setTimeout(() => setHint(null), 20000);
    return () => { if (!done) clearInterval(timer); clearTimeout(hide); };
  }, [loc.pathname]);

  if (!hint) return null;
  return (
    <>
      <style>{`
        @keyframes gwArrivalRing{0%{box-shadow:0 0 0 0 rgba(245,158,11,0.7),0 0 0 0 rgba(239,68,68,0.5)}100%{box-shadow:0 0 0 12px rgba(245,158,11,0),0 0 0 20px rgba(239,68,68,0)}}
        .gw-arrival-pulse{animation:gwArrivalRing 1.3s ease-out infinite;border-radius:12px;outline:2px solid rgba(245,158,11,0.9);outline-offset:3px;}
        @keyframes gwHintIn{from{transform:translate(-50%,-12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
      `}</style>
      <div style={{ position: "fixed", top: "calc(58px + env(safe-area-inset-top,0px))", left: "50%", transform: "translateX(-50%)", zIndex: 2147482000, maxWidth: "92vw", display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderRadius: 999, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", boxShadow: "0 10px 30px rgba(239,68,68,0.4)", animation: "gwHintIn .35s ease-out" }}>
        <span style={{ fontSize: 17 }}>👉</span>
        <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "normal", lineHeight: 1.4 }}>{hint}</span>
        <button onClick={() => setHint(null)} style={{ flexShrink: 0, marginLeft: 4, width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 13, lineHeight: 1 }}>×</button>
      </div>
    </>
  );
}
