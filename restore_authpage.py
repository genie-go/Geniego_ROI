# -*- coding: utf-8 -*-
"""
AuthPage.jsx 복원 스크립트
- AuthLanguageSelector 함수 끝 다음에 빠진 export default function AuthPage() 전체를 삽입
- IS_DEMO = true 강제 적용
- 로고 클릭 → Admin 진입 (IS_DEMO 제한 없이)
- logo_v4.png 경로 적용
"""

AUTH_PAGE_MAIN = r'''
/* ─── MAIN ──────────────────────────────────────────────────── */
export default function AuthPage() {
  const IS_DEMO = typeof window !== 'undefined'
    ? (window.location.hostname.includes('roidemo') || window.location.hostname.includes('demo') || import.meta.env.VITE_DEMO_MODE === 'true' || window.location.hostname === 'localhost')
    : import.meta.env.VITE_DEMO_MODE === 'true';
  const [mode, setMode] = useState("login"); // login | register | free | paid | admin
  const [planType, setPlanType] = useState("free");    // free | paid
  const [selectedPaid, setSelectedPaid] = useState("pro");
  const [loginType, setLoginType] = useState("demo"); // demo | production — 데모 로그인 유형 선택

  const handleSwitch = (target) => {
    // 데모 모드: "register"나 "free" 모두 바로 가입 폼으로 (플랜 선택 생략)
    if (IS_DEMO && (target === "register" || target === "free")) {
      setMode("free");
      return;
    }
    if (target === "register") { setMode("register"); return; }
    setMode(target);
  };

  const handlePlanContinue = () => {
    if (planType === "free") setMode("free");
    else setMode("paid");
  };

  const t = useT();

  // 데모 모드: 2탭 (데모 로그인 / 무료 체험 가입) — Admin 숨김
  // 운영 모드: 3탭 (회원 로그인 / 회원가입 / Admin)
  const TABS = IS_DEMO
    ? [
        { id: "login", label: "🎪 데모 로그인", color: "#fb923c" },
        { id: "free", label: "🔥 무료 체험 가입", color: "#22c55e" },
      ]
    : [
        { id: "login", label: "🔐 회원 로그인", color: "#4f8ef7" },
        { id: "register", label: "📝 회원가입", color: "#22c55e" },
      ];

  const isFullFlow = IS_DEMO ? false : ["free", "paid"].includes(mode);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--surface-1)", padding: "24px 16px",
    }}>
      {/* Background decorations */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(79,142,247,0.06) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%)" }} />
        {mode === "admin" && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(239,68,68,0.04) 0%,transparent 70%)" }} />}
      </div>

      <div style={{ width: "100%", maxWidth: mode === "paid" ? 520 : 420, position: "relative", zIndex: 1 }}>
        {/* Language Selector — floating top right */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <AuthLanguageSelector />
        </div>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="/logo_v4.png"
            alt="Geniego-ROI"
            onClick={() => setMode(mode === "admin" ? "login" : "admin")}
            style={{
              width: 150, height: 150,
              objectFit: "contain",
              margin: "0 auto 8px",
              display: "block",
              imageRendering: "-webkit-optimize-contrast",
              filter: "brightness(1.1)",
              cursor: "pointer",
            }}
          />
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>
            <span style={{ background: mode === "admin" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#4f8ef7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Geniego-ROI</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
            {IS_DEMO
              ? '🎪 체험용 데모 환경 — Enterprise 전 기능 무료 체험'
              : 'Revenue + Risk + Governance · Settlement OS'
            }
          </div>
        </div>

        {/* Card */}
        <div style={{
          padding: "24px 24px", borderRadius: 20,
          background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)",
          border: `1px solid ${mode === "admin" ? "rgba(239,68,68,0.15)" : "rgba(99,140,255,0.12)"}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          maxHeight: "80vh", overflowY: "auto",
        }}>
          {/* Tab bar */}
          {!isFullFlow && (
            <div style={{
              display: "grid",
              gridTemplateColumns: IS_DEMO ? "1fr 1fr" : "1fr 1fr 1fr",
              gap: 4, marginBottom: 22,
              background: "rgba(99,140,255,0.06)", borderRadius: 10, padding: 4,
            }}>
              {TABS.map(({ id, label, color }) => (
                <button key={id} onClick={() => IS_DEMO && id === 'free' ? setMode('free') : setMode(id)} style={{
                  padding: "8px 0", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 11, cursor: "pointer",
                  background: mode === id ? `${color}20` : "transparent",
                  color: mode === id ? color : "var(--text-3)",
                  transition: "all 150ms",
                  borderBottom: mode === id ? `2px solid ${color}` : '2px solid transparent',
                }}>{label}</button>
              ))}
            </div>
          )}

          {/* 데모 모드: 가입 탭 헤더 배너 */}
          {IS_DEMO && mode === 'free' && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(245,158,11,0.06))',
              border: '1px solid rgba(251,146,60,0.3)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fb923c' }}>🎪 무료 체험(데모) 가입</div>
              <div style={{ fontSize: 10, color: 'rgba(251,146,60,0.7)', marginTop: 2 }}>
                이름, 이메일, 비밀번호만 입력하면 바로 체험 가능
              </div>
            </div>
          )}

          {/* 데모 모드: 로그인 탭 — 회원 유형 선택 */}
          {IS_DEMO && mode === 'login' && (
            <div style={{ marginBottom: 14 }}>
              {/* 회원 유형 선택 버튼 2개 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {/* 무료 데모 체험 회원 */}
                <button
                  type="button"
                  onClick={() => setLoginType('demo')}
                  style={{
                    padding: '14px 10px', borderRadius: 14, border: loginType === 'demo' ? '2px solid #fb923c' : '1px solid rgba(251,146,60,0.2)',
                    background: loginType === 'demo' ? 'rgba(251,146,60,0.1)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', transition: 'all 200ms', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🎪</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: loginType === 'demo' ? '#fb923c' : 'var(--text-2)' }}>무료 데모 체험</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>Demo Trial Member</div>
                </button>
                {/* 운영 시스템 회원 */}
                <button
                  type="button"
                  onClick={() => setLoginType('production')}
                  style={{
                    padding: '14px 10px', borderRadius: 14, border: loginType === 'production' ? '2px solid #4f8ef7' : '1px solid rgba(79,142,247,0.2)',
                    background: loginType === 'production' ? 'rgba(79,142,247,0.1)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', transition: 'all 200ms', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🏢</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: loginType === 'production' ? '#4f8ef7' : 'var(--text-2)' }}>운영 시스템 회원</div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>Production Member</div>
                </button>
              </div>
              {/* 선택된 유형 안내 배너 */}
              <div style={{
                padding: '8px 12px', borderRadius: 10,
                background: loginType === 'demo' ? 'rgba(251,146,60,0.06)' : 'rgba(79,142,247,0.06)',
                border: `1px solid ${loginType === 'demo' ? 'rgba(251,146,60,0.2)' : 'rgba(79,142,247,0.2)'}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: loginType === 'demo' ? '#fb923c' : '#4f8ef7', fontWeight: 700 }}>
                  {loginType === 'demo'
                    ? '🎪 무료 데모 체험 회원으로 로그인합니다'
                    : '🏢 운영 시스템 회원으로 로그인합니다'}
                </div>
              </div>
            </div>
          )}

          {/* Route: Admin */}
          {mode === "admin" && <AdminLoginForm />}

          {/* Route: Login */}
          {mode === "login" && (
            <LoginForm
              onSwitch={handleSwitch}
              loginType={IS_DEMO ? loginType : 'production'}
              isDemoMode={IS_DEMO}
            />
          )}

          {/* Route: Register (plan select) */}
          {mode === "register" && !IS_DEMO && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-1)", textAlign: "center" }}>플랜을 선택하세요</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => { setPlanType("free"); handlePlanContinue(); }} style={{
                  padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(34,197,94,0.3)",
                  background: "rgba(34,197,94,0.06)", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🆓</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>Free</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>무료 체험</div>
                </button>
                <button onClick={() => { setPlanType("paid"); setMode("paid"); }} style={{
                  padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(168,85,247,0.3)",
                  background: "rgba(168,85,247,0.06)", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>💎</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7" }}>Paid</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>유료 구독</div>
                </button>
              </div>
              <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
                이미 계정이 있으신가요?{" "}
                <button type="button" onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>로그인</button>
              </div>
            </div>
          )}

          {/* Route: Free registration */}
          {mode === "free" && (
            <RegisterForm
              plan="free"
              onSwitch={handleSwitch}
              isDemoMode={IS_DEMO}
            />
          )}

          {/* Route: Paid registration */}
          {mode === "paid" && !IS_DEMO && (
            <RegisterForm
              plan={selectedPaid}
              plans={PAID_PLANS}
              selectedPaid={selectedPaid}
              onSelectPaid={setSelectedPaid}
              onSwitch={handleSwitch}
              isDemoMode={false}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "var(--text-3)", lineHeight: 1.6 }}>
          © 2026 Geniego-ROI · OCIELL Corp.<br />
          <span style={{ opacity: 0.6 }}>AI Marketing ROI Analysis Platform</span>
        </div>
      </div>
    </div>
  );
}
'''

import sys

filepath = r'd:\project\GeniegoROI\frontend\src\pages\AuthPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 이미 export default function AuthPage 가 있으면 스킵
if 'export default function AuthPage' in content:
    print('AuthPage already has export default. Skipping.')
    sys.exit(0)

# AuthLanguageSelector 끝 (파일 끝)에 AuthPage 메인 함수 추가
content = content.rstrip() + '\n' + AUTH_PAGE_MAIN

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: AuthPage main component restored.')
print(f'Total chars: {len(content)}')
