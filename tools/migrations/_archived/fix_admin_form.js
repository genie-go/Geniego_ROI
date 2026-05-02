const fs = require('fs');
let t = fs.readFileSync('frontend/src/pages/AuthPage.jsx', 'utf8');
t = t.replace(
  '  const [step, setStep] = useState(1);\n  };\n\n  return (',
  `  const [step, setStep] = useState(1);
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

  return (`
);
fs.writeFileSync('frontend/src/pages/AuthPage.jsx', t);
console.log('Fixed syntax error in AdminLoginForm');
