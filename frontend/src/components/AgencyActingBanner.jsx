// [272차] 대행사 전기능 운영 배너 — 대행사가 클라이언트로 전환해 전 앱을 운영 중일 때 표시.
//   현재 어느 클라이언트를 운영 중인지 명시하고, 언제든 대행사 콘솔로 안전 복귀(합성 세션 정리).
import React, { useEffect, useState } from "react";

const _IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const APP_TOKEN_KEY = _IS_DEMO ? "demo_genie_token" : "genie_token";
const APP_USER_KEY = _IS_DEMO ? "demo_genie_user" : "genie_user";

export default function AgencyActingBanner() {
  const [info, setInfo] = useState(() => { try { return JSON.parse(localStorage.getItem("genie_agency_client") || "null"); } catch { return null; } });
  useEffect(() => {
    const h = () => { try { setInfo(JSON.parse(localStorage.getItem("genie_agency_client") || "null")); } catch { setInfo(null); } };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);
  if (!info || !info.tenant) return null;

  const backToConsole = () => {
    // 합성 앱 세션만 정리(대행사 세션 genie_agency_token 은 유지 → 콘솔 로그인 상태 보존).
    try {
      localStorage.removeItem(APP_TOKEN_KEY);
      localStorage.removeItem(APP_USER_KEY);
      localStorage.removeItem("genie_agency_client");
    } catch {}
    window.location.href = "/agency";
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      background: "linear-gradient(90deg,#4f8ef7,#6366f1)", color: "#fff",
      padding: "8px 16px", fontSize: 13, fontWeight: 600,
    }}>
      <span>🏢 대행사 모드 — <b>{info.name}</b> 계정을 {info.write ? "운영(읽기+쓰기)" : "열람(읽기 전용)"} 중입니다. 모든 데이터는 이 클라이언트 계정 범위로 격리됩니다.</span>
      <button onClick={backToConsole} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>← 대행사 콘솔로</button>
    </div>
  );
}
