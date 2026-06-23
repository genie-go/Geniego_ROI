import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import { GUIDE_ASK } from "../data/guideContent.js";

/**
 * [237차] 가이드 연속 안내 스포트라이트 — 위저드 '바로 가기'로 시작하면 단계 큐를 따라
 *   페이지를 이동하며 각 자리에서 "👉 할 일" 안내 + 동작 영역([data-onboard-cta]) 스크롤·강조 +
 *   "✓ 완료 · 다음 단계 →" 버튼으로 다음 단계 페이지로 연속 이동(실행 단계까지). 선택/등록 완료 후
 *   다음 순서를 끊김 없이 안내. ★sessionStorage 큐(genie_onboard_queue) 사용(URL 파라미터 미사용=XSS 오탐 회피).
 *   큐 항목: { route, hint, last?, exec? }. App 전역 1회 마운트.
 */
const FLAG = "genie_onboard_focus";
const QUEUE = "genie_onboard_queue";

export default function GuideArrival() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const ask = GUIDE_ASK[lang] || GUIDE_ASK[(lang || "").split("-")[0]] || GUIDE_ASK.ko;
  const [queue, setQueue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [asking, setAsking] = useState(false);

  // 플래그가 세팅된 채 도착하면 큐 로드(1회). 이후 navigate 로 인한 경로변경에는 기존 큐 유지.
  useEffect(() => {
    let active = false, q = null;
    try {
      active = sessionStorage.getItem(FLAG) === "1";
      q = JSON.parse(sessionStorage.getItem(QUEUE) || "null");
    } catch (e) { return; }
    if (active && Array.isArray(q) && q.length) {
      try { sessionStorage.removeItem(FLAG); } catch (e) {}
      setQueue(q); setIdx(0);
    }
  }, [loc.pathname]);

  // 현재 단계의 동작영역(cta)을 브로드캐스트 — 탭 안에 숨은 마커를 가진 페이지가 해당 탭으로 자동 전환하도록.
  //   (예: 이메일 '템플릿' 탭, 주문허브 '라우팅' 탭) 같은 라우트에서 단계만 바뀌는 경우(이메일 2→3→4)도 커버.
  useEffect(() => {
    if (!queue || !queue[idx]) return;
    const cta = queue[idx].cta || "";
    try {
      sessionStorage.setItem("genie_onboard_cta", cta);
      window.dispatchEvent(new CustomEvent("genie-onboard-cta", { detail: { cta } }));
    } catch (e) {}
  }, [queue, idx]);

  // 현재 단계의 동작 영역으로 스크롤·강조(페이지 도착/단계 변경 시).
  useEffect(() => {
    if (!queue) return;
    // 단계별 정확한 동작영역 선택:
    //   cta가 문자열 키 → 해당 마커만 강조(못 찾으면 강조 없음 — 엉뚱한 자리 강조 방지, 힌트 배너만).
    //   cta === null → 의도적 무-스포트라이트(정보성·자동처리 단계, 힌트 배너만).
    //   cta === undefined(레거시 큐) → 첫 마커로 폴백(하위호환).
    const want = queue[idx] ? queue[idx].cta : undefined;
    if (want === null) return; // 의도적 무-스포트라이트 단계: 폴링 없이 힌트 배너만.
    let tries = 0, done = false;
    const timer = setInterval(() => {
      tries++;
      const el = typeof want === "string"
        ? document.querySelector(`[data-onboard-cta="${want}"]`)
        : (want === undefined ? document.querySelector("[data-onboard-cta]") : null);
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        el.classList.add("gw-arrival-pulse");
        if (tries >= 3) { clearInterval(timer); done = true; setTimeout(() => { try { el.classList.remove("gw-arrival-pulse"); } catch (e) {} }, 8000); }
      } else if (tries > 30) { clearInterval(timer); done = true; }
    }, 250);
    return () => { if (!done) clearInterval(timer); };
  }, [queue, idx, loc.pathname]);

  const finish = useCallback(() => { setQueue(null); try { sessionStorage.removeItem(QUEUE); sessionStorage.removeItem("genie_onboard_cta"); } catch (e) {} }, []);
  const goNext = useCallback(() => {
    setAsking(false);
    setQueue((q) => {
      if (!q) return q;
      const ni = idx + 1;
      if (ni >= q.length) { try { sessionStorage.removeItem(QUEUE); sessionStorage.removeItem("genie_onboard_cta"); } catch (e) {} return null; }
      setIdx(ni);
      try { const nx = q[ni]; if (nx && nx.route) navigate(nx.route); } catch (e) {}
      return q;
    });
  }, [idx, navigate]);

  if (!queue || !queue[idx]) return null;
  const cur = queue[idx];
  const isLast = idx >= queue.length - 1;
  const stepNo = `${idx + 1}/${queue.length}`;

  return (
    <>
      <style>{`
        @keyframes gwArrivalRing{0%{box-shadow:0 0 0 0 rgba(245,158,11,0.7),0 0 0 0 rgba(239,68,68,0.5)}100%{box-shadow:0 0 0 12px rgba(245,158,11,0),0 0 0 20px rgba(239,68,68,0)}}
        .gw-arrival-pulse{animation:gwArrivalRing 1.3s ease-out infinite;border-radius:12px;outline:2px solid rgba(245,158,11,0.9);outline-offset:3px;}
        @keyframes gwHintIn{from{transform:translate(-50%,-12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
        @keyframes gwNextPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
      `}</style>
      <div style={{ position: "fixed", top: "calc(58px + env(safe-area-inset-top,0px))", left: "50%", transform: "translateX(-50%)", zIndex: 2147482000, maxWidth: "94vw", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", boxShadow: "0 10px 30px rgba(239,68,68,0.4)", animation: "gwHintIn .35s ease-out", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 900, background: "rgba(255,255,255,0.25)", padding: "2px 9px", borderRadius: 999 }}>STEP {stepNo}</span>
        <span style={{ fontSize: 17 }}>👉</span>
        <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "normal", lineHeight: 1.4, maxWidth: 460 }}>{cur.hint}</span>
        {/* 복수 선택·등록 단계: '더 추가' vs '다음 단계' 선택을 먼저 물어봄 */}
        {cur.multi && asking ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800 }}>{ask.q}</span>
            <button onClick={() => setAsking(false)} style={{ flexShrink: 0, fontSize: 12, fontWeight: 900, color: "#b45309", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", padding: "6px 12px", borderRadius: 9 }}>{ask.more}</button>
            <button onClick={goNext} style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 900, color: "#fff", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#16a34a,#15803d)", padding: "6px 14px", borderRadius: 9 }}>{cur.nextLabel || "다음 단계 →"}</button>
          </span>
        ) : (
          <button onClick={() => { if (cur.multi && !isLast) setAsking(true); else goNext(); }} style={{ animation: "gwNextPulse 1.3s ease-in-out infinite", flexShrink: 0, fontSize: 12.5, fontWeight: 900, color: isLast ? "#fff" : "#b45309", border: "none", cursor: "pointer", background: isLast ? "linear-gradient(135deg,#16a34a,#15803d)" : "#fff", padding: "7px 16px", borderRadius: 9, boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }}>
            {isLast ? (cur.execLabel || "🚀 실행 / 완료") : (cur.nextLabel || "✓ 완료 · 다음 단계 →")}
          </button>
        )}
        <button onClick={finish} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontWeight: 900, fontSize: 13, lineHeight: 1 }}>×</button>
      </div>
    </>
  );
}
