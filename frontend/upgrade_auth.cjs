const fs = require('fs');
const file = 'd:/project/GeniegoROI/frontend/src/pages/AuthPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert PasswordStrengthMeter and SSO components before LoginForm
const pwAndSsoCode = `
/* ─── Advanced Auth Features ──────────────────────────────── */
function PasswordStrengthMeter({ password }) {
  const getStrength = (pw) => {
    let score = 0;
    if (!pw) return { score, color: 'transparent', text: '' };
    if (pw.length > 5) score += 1;
    if (pw.match(/[a-z]/) && pw.match(/[A-Z]/)) score += 1;
    if (pw.match(/\\d/)) score += 1;
    if (pw.match(/[^a-zA-Z\\d]/)) score += 1;
    if (pw.length > 11) score += 1;
    
    if (score <= 1) return { score, color: '#ef4444', text: '약함 (보안 취약)' };
    if (score === 2) return { score, color: '#f59e0b', text: '보통 (문자/숫자 조합 필요)' };
    if (score === 3) return { score, color: '#22c55e', text: '안전함' };
    return { score, color: '#10b981', text: '매우 안전 (엔터프라이즈급 권장)' };
  };
  const { score, color, text } = getStrength(password);
  
  return (
    <div style={{ marginTop: 3 }}>
      <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(level => (
          <div key={level} style={{ flex: 1, borderRadius: 2, background: score >= level ? color : 'rgba(255,255,255,0.1)', transition: 'background-color 300ms' }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: text ? color : 'transparent', textAlign: 'right', fontWeight: 600, minHeight: 15 }}>{text || ' '}</div>
    </div>
  );
}

function SSOButtonGroup({ t }) {
  const providers = [
    { id: 'google', bg: '#fff', color: '#333', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg' },
    { id: 'microsoft', bg: '#fff', color: '#333', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
    { id: 'apple', bg: '#000', color: '#fff', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', filter: 'invert(1)' }
  ];
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{t('auth.orContinueWith') || 'Or continue with SSO'}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {providers.map(p => (
          <button type="button" key={p.id} onClick={(e) => { e.preventDefault(); alert("Enterprise SSO Integration Ready! 🚀 (Demo)"); }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: p.bg, cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'transform 150ms'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <img src={p.icon} alt={p.id} style={{ width: 18, height: 18, filter: p.filter || 'none' }} />
          </button>
        ))}
      </div>
    </div>
  );
}
`;

content = content.replace('/* ─── Login Form ─────────────────────────────────────────── */', pwAndSsoCode + '\n/* ─── Login Form ─────────────────────────────────────────── */');

// 2. Add SSO to LoginForm
const loginFormEnd = `      {/* Enterprise 무료 체험 (데모) — 운영 환경에서만 표시 */}`;
const ssoHtml = `      <SSOButtonGroup t={t} />\n\n`;
content = content.replace(loginFormEnd, ssoHtml + loginFormEnd);

// 3. Add PasswordStrengthMeter to FreeRegisterForm
content = content.replace(
  `      <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />`,
  `      <div>\n        <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />\n        <PasswordStrengthMeter password={password} />\n      </div>`
);

// 4. Add SSO to FreeRegisterForm
const freeRegErrorLine = `      {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}`;
content = content.replace(freeRegErrorLine, freeRegErrorLine + `\n\n      <SSOButtonGroup t={t} />`);

// 5. Add PasswordStrengthMeter to PaidRegisterForm (step 1)
content = content.replace(
  `            <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />`,
  `            <div style={{ gridColumn: "1 / -1" }}>\n              <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />\n              <PasswordStrengthMeter password={password} />\n            </div>`
);

// 6. Fix AuthPage mode conditional renders
content = content.replace(
  `          {/* Route: Free registration */}\n          {mode === "free" && (\n            <RegisterForm\n              plan="free"\n              onSwitch={handleSwitch}\n              isDemoMode={IS_DEMO}\n            />\n          )}\n\n          {/* Route: Paid registration */}\n          {mode === "paid" && !IS_DEMO && (\n            <RegisterForm\n              plan={selectedPaid}\n              plans={PAID_PLANS}\n              selectedPaid={selectedPaid}\n              onSelectPaid={setSelectedPaid}\n              onSwitch={handleSwitch}\n              isDemoMode={false}\n            />\n          )}`,
  `          {/* Route: Free registration */}\n          {mode === "free" && (\n            <FreeRegisterForm\n              onSwitch={handleSwitch}\n              onBack={() => setMode("register")}\n            />\n          )}\n\n          {/* Route: Paid registration */}\n          {mode === "paid" && !IS_DEMO && (\n            <PaidRegisterForm\n              selectedPlan={selectedPaid}\n              onSwitch={handleSwitch}\n              onBack={() => setMode("register")}\n            />\n          )}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Upgraded AuthPage with SSO, PasswordStrengthMeter, and fixed RegisterForm routing.');
