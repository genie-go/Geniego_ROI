import React from "react";

/*
 * 회원세션(관리자 대행 열람) 배너
 * ─────────────────────────────────────────────
 * 관리자가 /user-management 에서 "회원세션" 버튼으로 연 새 창(대행 탭)에만 표시된다.
 * 대행 탭은 impersonationShim.js 가 sessionStorage(탭 격리)에 imp_active=1 을 세팅한다.
 * 관리자 본인 탭·일반 사용자 탭에서는 렌더되지 않는다(회귀 0).
 */
const IS_DEMO = (() => { try { return import.meta.env?.VITE_DEMO_MODE === "true"; } catch { return false; } })();
const PREFIX = IS_DEMO ? "demo_genie_" : "genie_";

function readImp() {
  try {
    if (sessionStorage.getItem(PREFIX + "imp_active") !== "1") return null;
    const raw = sessionStorage.getItem(PREFIX + "user");
    let u = null;
    try { u = raw ? JSON.parse(raw) : null; } catch { u = null; }
    return { email: u?.email || "", name: u?.name || "", plan: u?.plan || "" };
  } catch { return null; }
}

export default function ImpersonationBanner() {
  const imp = readImp();
  if (!imp) return null;

  const label = imp.name || imp.email || "회원";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "8px 16px", background: "linear-gradient(90deg,#7c3aed,#4f46e5)",
      color: "#fff", fontSize: 12.5, fontWeight: 700, zIndex: 50,
      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
    }}>
      <span style={{ fontSize: 15 }}>🪟</span>
      <span>관리자 대행 열람(회원세션) — <b>{label}</b>
        {imp.email && imp.name ? <span style={{ opacity: 0.85, fontWeight: 500 }}> ({imp.email})</span> : null}
        {imp.plan ? <span style={{ marginLeft: 6, padding: "1px 8px", borderRadius: 20, background: "rgba(255,255,255,0.2)", fontSize: 10.5, textTransform: "uppercase" }}>{imp.plan}</span> : null}
        <span style={{ opacity: 0.85, fontWeight: 500 }}> 계정으로 로그인된 화면입니다. 이 탭은 관리자 세션과 분리되어 있습니다.</span>
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={() => { try { window.close(); } catch {} }}
        title="이 회원세션 창을 닫습니다"
        style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>
        ✕ 회원세션 종료
      </button>
    </div>
  );
}
