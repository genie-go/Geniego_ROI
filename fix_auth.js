const fs = require('fs');
let lines = fs.readFileSync('frontend/src/pages/AuthPage.jsx', 'utf8').split('\n');
let pre = lines.slice(0, 960);
let post = lines.slice(971);
let inject = `          </div>
        </>
      )}
    </div>
  );
}

export default function AuthPage() {
  const IS_DEMO = true;
  const [mode, setMode] = useState("login");
  const [planType, setPlanType] = useState("free");
  const [selectedPaid, setSelectedPaid] = useState("pro");
  const [loginType, setLoginType] = useState("demo");

  const handleSwitch = (target) => {
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

  const TABS = IS_DEMO
    ? [
        { id: "login", label: "🎪 데모 로그인", color: "#fb923c" },
        { id: "free", label: "🔥 무료 체험 가입", color: "#22c55e" },
      ]
    : [
        { id: "login", label: "🔐 회원 로그인", color: "#4f8ef7" },
        { id: "register", label: "📝 회원가입", color: "#22c55e" },
      ];

  const isFullFlow = IS_DEMO ? false : ["free", "paid"].includes(mode);`;

fs.writeFileSync('frontend/src/pages/AuthPage.jsx', [...pre, inject, ...post].join('\n'));
console.log('Fixed');
