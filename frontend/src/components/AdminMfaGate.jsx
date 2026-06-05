import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT } from "../i18n/index.js";

/*
 * 193차 Sprint4 — 관리자(admin) 2단계 인증(MFA) 의무화 게이트.
 *   admin 플랜이 MFA 미설정이면, 로그인 직후 전체화면 enrollment 게이트로 앱을 차단하고
 *   TOTP 설정(setup→enable)을 강제한다. 활성화 완료 시에만 앱 진입.
 *   - 비-admin/이미 설정/break-glass 는 통과(children 렌더).
 *   - 백엔드: /auth/mfa/{status,setup,enable} (189차), 로그인 응답 mfa_enrollment_required (193차).
 *   - QR 라이브러리 없음 → 설정키(수동입력)+otpauth 텍스트 노출(외부 QR서비스에 secret 미전송).
 */

const overlay = {
  position: "fixed", inset: 0, zIndex: 4000,
  background: "linear-gradient(160deg,#070f1a,#0b1426)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto",
};
const card = {
  width: "min(520px,96vw)", background: "var(--surface,#0f1830)", border: "1px solid rgba(79,142,247,0.3)",
  borderRadius: 18, padding: 30, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", color: "#e2e8f0",
};
const inputStyle = {
  width: "100%", padding: "10px 13px", borderRadius: 9, background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none",
};
const btn = (disabled) => ({
  width: "100%", padding: "11px", borderRadius: 10, border: "none", marginTop: 14,
  background: disabled ? "rgba(107,114,128,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
  color: "#fff", fontWeight: 800, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
});

function MfaEnrollGate({ onDone }) {
  const { token } = useAuth();
  const t = useT();
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const setup = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/mfa/setup", { method: "POST", headers, body: "{}" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setSecret(d.secret || ""); setOtpauth(d.otpauth_uri || ""); }
      else setErr(d.error || t("mfaGate.setupFail", "MFA 설정 시작에 실패했습니다."));
    } catch { setErr(t("mfaGate.serverError", "서버 오류. 다시 시도하세요.")); }
    finally { setBusy(false); }
  }, [token]); // eslint-disable-line

  useEffect(() => { setup(); }, [setup]);

  const enable = async () => {
    if (!/^\d{6}$/.test(code.trim())) { setErr(t("mfaGate.codeInvalid", "6자리 인증 코드를 입력하세요.")); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/mfa/enable", { method: "POST", headers, body: JSON.stringify({ code: code.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setRecovery(d.recovery_codes || []); }
      else setErr(d.error || t("mfaGate.enableFail", "인증 코드가 올바르지 않습니다."));
    } catch { setErr(t("mfaGate.serverError", "서버 오류. 다시 시도하세요.")); }
    finally { setBusy(false); }
  };

  // 활성화 완료 + 복구코드 확인 화면
  if (recovery) {
    return (
      <div style={overlay}><div style={card}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>✅ {t("mfaGate.doneTitle", "2단계 인증이 활성화되었습니다")}</div>
        <div style={{ fontSize: 13, color: "var(--text-3,#94a3b8)", marginBottom: 16 }}>{t("mfaGate.recoveryDesc", "아래 복구 코드를 안전한 곳에 보관하세요. 인증 앱을 사용할 수 없을 때 1회용으로 로그인할 수 있습니다.")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          {recovery.map((c, i) => (
            <div key={i} style={{ fontFamily: "monospace", fontSize: 13, padding: "7px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 7, textAlign: "center", letterSpacing: 1 }}>{c}</div>
          ))}
        </div>
        <button style={btn(false)} onClick={() => onDone && onDone()}>{t("mfaGate.enterApp", "복구 코드를 저장했습니다 — 앱 시작")}</button>
      </div></div>
    );
  }

  return (
    <div style={overlay}><div style={card}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>🔐 {t("mfaGate.title", "관리자 2단계 인증 필수 설정")}</div>
      <div style={{ fontSize: 13, color: "var(--text-3,#94a3b8)", lineHeight: 1.7, marginBottom: 18 }}>
        {t("mfaGate.desc", "보안 정책에 따라 관리자 계정은 2단계 인증(TOTP) 설정이 필수입니다. Google Authenticator·Authy 등 인증 앱에 아래 키를 등록한 뒤, 6자리 코드를 입력하세요.")}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: "var(--text-3,#94a3b8)", fontWeight: 700 }}>{t("mfaGate.setupKey", "설정 키 (Setup Key)")}</label>
        <input value={secret} readOnly onFocus={e => e.target.select()} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 1, marginTop: 4 }} />
        {otpauth && <div style={{ fontSize: 9, color: "var(--text-3,#64748b)", marginTop: 4, wordBreak: "break-all" }}>{otpauth}</div>}
      </div>
      <div>
        <label style={{ fontSize: 11, color: "var(--text-3,#94a3b8)", fontWeight: 700 }}>{t("mfaGate.codeLabel", "인증 코드 (6자리)")}</label>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6}
          placeholder="000000" style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 6, fontSize: 18, textAlign: "center", marginTop: 4 }}
          onKeyDown={e => e.key === "Enter" && enable()} />
      </div>
      {err && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{err}</div>}
      <button style={btn(busy || !secret)} disabled={busy || !secret} onClick={enable}>
        {busy ? t("mfaGate.processing", "처리 중…") : t("mfaGate.activate", "2단계 인증 활성화")}
      </button>
    </div></div>
  );
}

export default function AdminMfaGate({ children }) {
  const { user, token } = useAuth();
  const [state, setState] = useState("checking"); // checking | ok | need

  useEffect(() => {
    let alive = true;
    if (!user || user.plan !== "admin" || !token) { setState("ok"); return; }
    fetch("/api/auth/mfa/status", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).catch(() => ({}))
      .then(d => { if (alive) setState(d && d.ok && d.enabled ? "ok" : "need"); });
    return () => { alive = false; };
  }, [user, token]);

  if (state === "checking") return null;
  if (state === "need") return <MfaEnrollGate onDone={() => setState("ok")} />;
  return children;
}
