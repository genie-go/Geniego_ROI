const fs = require('fs');
const file = 'd:/project/GeniegoROI/frontend/src/pages/AuthPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const mainStart = content.indexOf('/* ─── MAIN ──────────────────────────────────────────────────── */');
const originalHeader = content.substring(0, mainStart);

const newMain = `/* ─── MAIN ──────────────────────────────────────────────────── */
export default function AuthPage() {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDemoDomain = currentHost.includes('roidemo') || currentHost.includes('demo');
  
  // Read mode from URL parameters if provided (e.g. ?mode=free)
  const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialMode = queryParams.get('mode') || "login";

  const [mode, setMode] = useState(initialMode); // login | register | free | paid | admin
  const [planType, setPlanType] = useState("free");
  const [selectedPaid, setSelectedPaid] = useState("pro");
  const [loginType, setLoginType] = useState(isDemoDomain ? "demo" : "production");

  const t = useT();

  // ─── STRICT ENVIRONMENT ROUTING ───
  const handleSwitch = (target) => {
    // 1. 데모 회원가입 (Demo Registration)
    if (target === "demo_register") {
      if (isDemoDomain) { setMode("free"); }
      else { window.location.href = "https://roidemo.genie-go.com/login?mode=free"; }
      return;
    }
    // 2. 운영시스템 회원가입 (Production Registration)
    if (target === "prod_register") {
      if (!isDemoDomain) { setMode("register"); }
      else { window.location.href = "https://roi.genie-go.com/login?mode=register"; }
      return;
    }
    // 3. 데모 로그인 (Demo Login)
    if (target === "demo_login") {
      if (isDemoDomain) { setMode("login"); setLoginType("demo"); }
      else { window.location.href = "https://roidemo.genie-go.com/login"; }
      return;
    }
    // 4. 운영시스템 로그인 (Production Login)
    if (target === "prod_login") {
      if (!isDemoDomain) { setMode("login"); setLoginType("production"); }
      else { window.location.href = "https://roi.genie-go.com/login"; }
      return;
    }
    setMode(target);
  };

  /* Floating animation keyframes */
  const floatKeyframes = \`
    @keyframes genieLevitate {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-12px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes softPulse {
      0%, 100% { box-shadow: 0 8px 40px rgba(79,142,247,0.15), 0 0 0 0 rgba(79,142,247,0); }
      50% { box-shadow: 0 12px 50px rgba(79,142,247,0.25), 0 0 40px 8px rgba(79,142,247,0.06); }
    }
  \`;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #E8E5F4 0%, #DDD9EE 25%, #E0DDEF 50%, #E5E2F2 75%, #EBE8F6 100%)",
      padding: "24px 16px",
    }}>
      <style>{floatKeyframes}</style>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(79,142,247,0.08) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.06) 0%,transparent 70%)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: mode === "paid" ? 520 : 440, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <AuthLanguageSelector />
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div onClick={() => setMode("admin")} style={{ display: "inline-block", cursor: "pointer", animation: "genieLevitate 4s ease-in-out infinite" }}>
            <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 280, height: 'auto', maxHeight: 260, objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(0 8px 24px rgba(79,142,247,0.18))" }} />
          </div>
          <div style={{
            marginTop: 12, fontWeight: 900, fontSize: 18, letterSpacing: "1.5px",
            background: "linear-gradient(135deg, #4f8ef7 0%, #6366f1 30%, #a855f7 60%, #f59e0b 100%)",
            backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 4s linear infinite", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", textTransform: "uppercase",
          }}>
            AI Marketing ROI Platform
          </div>
          <div style={{ fontSize: 11, color: "#8B87A0", marginTop: 6, fontWeight: 700 }}>
            {isDemoDomain ? '🎪 Enterprise 전 기능 무료 체험 (데모 환경)' : '🏢 Revenue · Risk · Governance 운영 시스템'}
          </div>
        </div>

        <div style={{
          padding: "24px", borderRadius: 20, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(99,140,255,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.08)",
          maxHeight: "80vh", overflowY: "auto", color: "#1e293b",
        }}>

          {/* ─── ENVIRONMENT ROUTING TABS ─── */}
          {mode === "login" && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => handleSwitch('demo_login')}
                style={{
                  padding: '12px 10px', borderRadius: 12, border: loginType === 'demo' ? '2px solid #fb923c' : '1px solid rgba(251,146,60,0.2)',
                  background: loginType === 'demo' ? 'rgba(251,146,60,0.1)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer', transition: 'all 200ms', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>🎪</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: loginType === 'demo' ? '#fb923c' : 'var(--text-2)' }}>Demo Member Login</div>
              </button>
              <button
                type="button"
                onClick={() => handleSwitch('prod_login')}
                style={{
                  padding: '12px 10px', borderRadius: 12, border: loginType === 'production' ? '2px solid #4f8ef7' : '1px solid rgba(79,142,247,0.2)',
                  background: loginType === 'production' ? 'rgba(79,142,247,0.1)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer', transition: 'all 200ms', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>🏢</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: loginType === 'production' ? '#4f8ef7' : 'var(--text-2)' }}>Production Login</div>
              </button>
            </div>
          )}

          {/* Route: Admin */}
          {mode === "admin" && <AdminLoginForm />}

          {/* Route: Login */}
          {mode === "login" && (
            <>
              <LoginForm onSwitch={handleSwitch} loginType={loginType} />
              
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(99,140,255,0.15)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", fontWeight: 700 }}>Don't have an account?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" onClick={() => handleSwitch('demo_register')} style={{ padding: "10px", borderRadius: 10, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                    데모회원가입
                  </button>
                  <button type="button" onClick={() => handleSwitch('prod_register')} style={{ padding: "10px", borderRadius: 10, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.3)", color: "#4f8ef7", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                    운영시스템회원가입
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Route: Register (prod only) */}
          {mode === "register" && !isDemoDomain && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)" }}>
                <span style={{ fontSize: 18 }}>🏢</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#4f8ef7" }}>운영시스템 회원가입 (Production Registration)</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>플랜을 선택하여 운영 계정을 생성합니다.</div>
                </div>
                <button type="button" onClick={() => handleSwitch('login')} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => { setPlanType("free"); setMode("free"); }} style={{ padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🆓</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>Free</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>운영시스템 무료 체험</div>
                </button>
                <button onClick={() => { setPlanType("paid"); setMode("paid"); }} style={{ padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.06)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>💎</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7" }}>Paid</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>운영시스템 구독</div>
                </button>
              </div>
            </div>
          )}

          {/* Route: Demo registration (free only, locked to demo domain) */}
          {mode === "free" && isDemoDomain && (
            <FreeRegisterForm onSwitch={handleSwitch} onBack={() => handleSwitch('login')} />
          )}
          
          {/* Route: Free prod registration */}
          {mode === "free" && !isDemoDomain && (
            <FreeRegisterForm onSwitch={handleSwitch} onBack={() => setMode('register')} />
          )}

          {/* Route: Paid registration */}
          {mode === "paid" && !isDemoDomain && (
            <PaidRegisterForm selectedPlan={selectedPaid} onSwitch={handleSwitch} onBack={() => setMode("register")} />
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "#8B87A0", lineHeight: 1.6 }}>
          v423.0.0 · © 2026 Geniego-ROI. All rights reserved.<br />
          <span style={{ opacity: 0.7, fontWeight: 600, letterSpacing: '0.5px' }}>Strict Isolated Enterprise Flow</span>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(file, originalHeader + newMain, 'utf8');
console.log('Appended strict logical flow and separation.');
