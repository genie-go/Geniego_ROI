const fs = require('fs');
let t = fs.readFileSync('frontend/src/pages/AuthPage.jsx', 'utf8');

let p1 = t.split('function AdminLoginForm() {')[0];
let p2 = t.split('function AuthLanguageSelector() {')[1];

let mid = `function AdminLoginForm() {
  const t = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ADMIN_GATE = "GENIEGO-ADMIN";

  const verifyKey = (e) => {
    e.preventDefault();
    if (adminKey.trim().toUpperCase() !== ADMIN_GATE) { setError(t("auth.wrongAdminKey")); return; }
    setError(null); setStep(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const user = await login(email, password, "admin");
      const effectivePlan = user.plans || user.plan;
      if (effectivePlan !== "admin") throw new Error(t("auth.notAdminAccount"));
      navigate("/admin", { replace: true });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#ef4444" }}>{t("auth.adminLoginTitle")}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{t("auth.adminLoginDesc")}</div>
        </div>
      </div>
      {step === 1 ? (
        <form onSubmit={verifyKey} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginBottom: 5 }}>{t("auth.adminKeyLabel")}</label>
            <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder={t("auth.adminKeyPh")} required
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)", color: "var(--text-1)", fontSize: 13, outline: "none" }} />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" style={{ padding: "12px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{t("auth.verifyKey")}</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#22c55e" }}>{t("auth.keyVerified")}</div>
          <Field label={t("auth.adminEmailLabel")} type="email" value={email} onChange={setEmail} placeholder="admin@example.com" required autoComplete="email" />
          <Field label={t("auth.passwordLabel")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" />
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: loading ? "rgba(239,68,68,0.4)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? t("auth.loggingIn") : t("auth.adminLoginBtn")}
          </button>
          <button type="button" onClick={() => { setStep(1); setError(null); setAdminKey(""); }} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 11, cursor: "pointer" }}>{t("auth.reenterKey")}</button>
        </form>
      )}
    </div>
  );
}

/* ─── Language Selector for Auth ──────────────────────────── */
function AuthLanguageSelector() {`;

fs.writeFileSync('frontend/src/pages/AuthPage.jsx', p1 + mid + p2);
console.log('Fixed exactly!');
