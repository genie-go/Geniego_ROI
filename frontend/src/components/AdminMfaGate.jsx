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

const METHODS = [
  { id: "email", icon: "📧", labelKey: "mfaGate.mEmail", label: "이메일 인증", descKey: "mfaGate.mEmailDesc", desc: "가입 이메일로 6자리 코드를 보냅니다." },
  { id: "kakao", icon: "💬", labelKey: "mfaGate.mKakao", label: "카카오톡 인증", descKey: "mfaGate.mKakaoDesc", desc: "카카오톡으로 인증 코드를 받습니다." },
  { id: "sms",   icon: "📱", labelKey: "mfaGate.mSms",   label: "문자(SMS) 인증", descKey: "mfaGate.mSmsDesc", desc: "휴대폰 문자로 인증 코드를 받습니다." },
  { id: "totp",  icon: "🔑", labelKey: "mfaGate.mTotp",  label: "인증 앱(TOTP)", descKey: "mfaGate.mTotpDesc", desc: "Google Authenticator 등 인증 앱을 사용합니다." },
];

function MfaEnrollGate({ onDone }) {
  const { token } = useAuth();
  const t = useT();
  const [stage, setStage] = useState("choose"); // choose | verify | done
  const [method, setMethod] = useState("");
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [avail, setAvail] = useState({ email: true, totp: true, sms: false, kakao: false });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch("/api/auth/mfa/status", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).catch(() => ({}))
      .then(d => { if (d && d.methods_available) setAvail(d.methods_available); });
  }, [token]);

  // 방식 선택 → 코드 발송(email/sms/kakao) 또는 setup(totp)
  const choose = async (m) => {
    setErr(""); setInfo(""); setBusy(true); setMethod(m); setCode("");
    try {
      if (m === "totp") {
        const r = await fetch("/api/auth/mfa/setup", { method: "POST", headers, body: "{}" });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) { setSecret(d.secret || ""); setOtpauth(d.otpauth_uri || ""); setStage("verify"); }
        else setErr(d.error || t("mfaGate.setupFail", "MFA 설정 시작에 실패했습니다."));
      } else {
        const r = await fetch("/api/auth/mfa/otp/send", { method: "POST", headers, body: JSON.stringify({ method: m }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) { setInfo(d.message || t("mfaGate.codeSent", "인증 코드를 보냈습니다.")); setStage("verify"); }
        else if (d.reason === "provider_not_configured") { setErr(d.error || t("mfaGate.providerGate", "해당 인증 제공자가 아직 설정되지 않았습니다. 다른 방식을 선택하세요.")); setMethod(""); }
        else { setErr(d.error || t("mfaGate.sendFail", "인증 코드 발송에 실패했습니다.")); setMethod(""); }
      }
    } catch { setErr(t("mfaGate.serverError", "서버 오류. 다시 시도하세요.")); setMethod(""); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/mfa/otp/send", { method: "POST", headers, body: JSON.stringify({ method }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setInfo(d.message || t("mfaGate.codeResent", "인증 코드를 다시 보냈습니다."));
      else setErr(d.error || t("mfaGate.sendFail", "인증 코드 발송에 실패했습니다."));
    } catch { setErr(t("mfaGate.serverError", "서버 오류. 다시 시도하세요.")); }
    finally { setBusy(false); }
  };

  const enable = async () => {
    if (!/^\d{6}$/.test(code.trim())) { setErr(t("mfaGate.codeInvalid", "6자리 인증 코드를 입력하세요.")); return; }
    setBusy(true); setErr("");
    try {
      const url = method === "totp" ? "/api/auth/mfa/enable" : "/api/auth/mfa/otp/enable";
      const body = method === "totp" ? { code: code.trim() } : { method, code: code.trim() };
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setRecovery(d.recovery_codes || []); setStage("done"); }
      else setErr(d.error || t("mfaGate.enableFail", "인증 코드가 올바르지 않습니다."));
    } catch { setErr(t("mfaGate.serverError", "서버 오류. 다시 시도하세요.")); }
    finally { setBusy(false); }
  };

  // 완료 + 복구코드
  if (stage === "done" && recovery) {
    return (
      <div style={overlay}><div style={card}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>✅ {t("mfaGate.doneTitle", "2단계 인증이 활성화되었습니다")}</div>
        <div style={{ fontSize: 13, color: "var(--text-3,#94a3b8)", marginBottom: 16 }}>{t("mfaGate.recoveryDesc", "아래 복구 코드를 안전한 곳에 보관하세요. 인증 수단을 사용할 수 없을 때 1회용으로 로그인할 수 있습니다.")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          {recovery.map((c, i) => (
            <div key={i} style={{ fontFamily: "monospace", fontSize: 13, padding: "7px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 7, textAlign: "center", letterSpacing: 1 }}>{c}</div>
          ))}
        </div>
        <button style={btn(false)} onClick={() => onDone && onDone()}>{t("mfaGate.enterApp", "복구 코드를 저장했습니다 — 앱 시작")}</button>
      </div></div>
    );
  }

  // 방식 선택
  if (stage === "choose") {
    return (
      <div style={overlay}><div style={card}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>🔐 {t("mfaGate.title", "관리자 2단계 인증 필수 설정")}</div>
        <div style={{ fontSize: 13, color: "var(--text-3,#94a3b8)", lineHeight: 1.7, marginBottom: 18 }}>
          {t("mfaGate.chooseDesc", "보안 정책에 따라 관리자 계정은 2단계 인증이 필수입니다. 인증 방식을 선택하세요.")}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {METHODS.map(m => {
            const ok = avail[m.id] !== false;
            return (
              <button key={m.id} type="button" disabled={busy} onClick={() => choose(m.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "13px 15px", borderRadius: 12, cursor: busy ? "wait" : "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(79,142,247,0.25)", color: "#e2e8f0", opacity: ok ? 1 : 0.62 }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{t(m.labelKey, m.label)}{!ok && <span style={{ marginLeft: 8, fontSize: 10, color: "#fbbf24" }}>{t("mfaGate.notReady", "준비 중")}</span>}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3,#94a3b8)", marginTop: 2 }}>{t(m.descKey, m.desc)}</div>
                </span>
                <span style={{ color: "#4f8ef7", fontSize: 16 }}>›</span>
              </button>
            );
          })}
        </div>
        {err && <div style={{ color: "#f87171", fontSize: 12, marginTop: 12 }}>{err}</div>}
        {/* 196차: 발송 인프라(SMTP 등) 준비 전 강제 enroll 락아웃 방지 — 7일 유예 후 재안내 */}
        <button type="button" onClick={() => { try { localStorage.setItem("genie_mfa_defer", String(Date.now() + 7 * 24 * 3600 * 1000)); } catch (e) {} onDone && onDone(); }}
          style={{ width: "100%", marginTop: 18, background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          {t("mfaGate.deferLater", "나중에 설정하기 (7일 후 다시 안내)")}
        </button>
      </div></div>
    );
  }

  // 코드 검증(verify)
  const mLabel = (METHODS.find(m => m.id === method) || {});
  return (
    <div style={overlay}><div style={card}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>🔐 {t(mLabel.labelKey, mLabel.label || "2단계 인증")}</div>
      <button type="button" onClick={() => { setStage("choose"); setErr(""); setInfo(""); setMethod(""); setSecret(""); setCode(""); }}
        style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 11, cursor: "pointer", padding: 0, marginBottom: 14 }}>← {t("mfaGate.changeMethod", "인증 방식 변경")}</button>
      {method === "totp" ? (
        <>
          <div style={{ fontSize: 13, color: "var(--text-3,#94a3b8)", lineHeight: 1.7, marginBottom: 14 }}>
            {t("mfaGate.totpDesc", "Google Authenticator·Authy 등 인증 앱에 아래 설정 키를 등록한 뒤, 표시되는 6자리 코드를 입력하세요.")}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: "var(--text-3,#94a3b8)", fontWeight: 700 }}>{t("mfaGate.setupKey", "설정 키 (Setup Key)")}</label>
            <input value={secret} readOnly onFocus={e => e.target.select()} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 1, marginTop: 4 }} />
            {otpauth && <div style={{ fontSize: 9, color: "var(--text-3,#64748b)", marginTop: 4, wordBreak: "break-all" }}>{otpauth}</div>}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: "var(--text-3,#94a3b8)", lineHeight: 1.7, marginBottom: 14 }}>
          {method === "email" ? t("mfaGate.emailVerifyDesc", "가입 이메일로 보낸 6자리 인증 코드를 입력하세요. 코드는 5분간 유효합니다.")
            : method === "sms" ? t("mfaGate.smsVerifyDesc", "문자로 보낸 6자리 인증 코드를 입력하세요. 코드는 5분간 유효합니다.")
            : t("mfaGate.kakaoVerifyDesc", "카카오톡으로 보낸 6자리 인증 코드를 입력하세요. 코드는 5분간 유효합니다.")}
        </div>
      )}
      {info && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontSize: 11.5, marginBottom: 12 }}>📨 {info}</div>}
      <div>
        <label style={{ fontSize: 11, color: "var(--text-3,#94a3b8)", fontWeight: 700 }}>{t("mfaGate.codeLabel", "인증 코드 (6자리)")}</label>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6}
          placeholder="000000" style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 6, fontSize: 18, textAlign: "center", marginTop: 4 }}
          onKeyDown={e => e.key === "Enter" && enable()} />
      </div>
      {err && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{err}</div>}
      <button style={btn(busy)} disabled={busy} onClick={enable}>
        {busy ? t("mfaGate.processing", "처리 중…") : t("mfaGate.activate", "2단계 인증 활성화")}
      </button>
      {method !== "totp" && (
        <button type="button" onClick={resend} disabled={busy}
          style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#4f8ef7", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", textDecoration: "underline" }}>
          {t("mfaGate.resend", "인증 코드 재발송")}
        </button>
      )}
    </div></div>
  );
}

export default function AdminMfaGate({ children }) {
  const { user, token } = useAuth();
  const [state, setState] = useState("checking"); // checking | ok | need

  useEffect(() => {
    let alive = true;
    if (!user || user.plan !== "admin" || !token) { setState("ok"); return; }
    // 196차: '나중에 설정' 유예 기간 내면 게이트 건너뜀(발송 인프라 준비 전 락아웃 방지).
    try {
      const until = Number(localStorage.getItem("genie_mfa_defer") || 0);
      if (until && Date.now() < until) { setState("ok"); return; }
    } catch (e) {}
    fetch("/api/auth/mfa/status", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).catch(() => ({}))
      .then(d => { if (alive) setState(d && d.ok && d.enabled ? "ok" : "need"); });
    return () => { alive = false; };
  }, [user, token]);

  if (state === "checking") return null;
  if (state === "need") return <MfaEnrollGate onDone={() => setState("ok")} />;
  return children;
}
