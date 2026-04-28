/**
 * Full i18n injection:
 * 1) Add missing auth.login-page keys to ALL existing locale files
 * 2) Create pt.js, ru.js, ar.js, hi.js with full auth key set
 * 3) Update i18n/index.js to register new languages
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');

// ── Login-page-specific keys to ADD to auth namespace ──
const LOGIN_KEYS = {
  ko: {
    demoMemberLogin: "데모회원 로그인", productionLogin: "운영시스템 로그인",
    demoSignup: "데모회원가입", prodSignup: "운영시스템회원가입",
    orContinueWith: "또는 소셜 계정으로 계속하기",
    noAccountQuestion: "계정이 없으신가요?", demoEnvBanner: "Enterprise 전 기능 무료 체험 (데모 환경)",
    prodEnvBanner: "Revenue · Risk · Governance 운영 시스템",
    idleLogoutMsg: "장시간 활동이 없어 자동으로 로그아웃되었습니다. 다시 로그인해 주세요.",
    termsOfService: "서비스 이용약관 동의", privacyPolicy: "개인정보처리방침 동의",
    ecommerceProtection: "전자상거래 이용 및 소비자보호 고지 동의",
    marketingConsent: "마케팅 정보 수신 동의", agreeAllTerms: "전체 동의",
    requiredTag: "필수", optionalTag: "선택", viewTerms: "보기", confirmBtn: "확인",
    pwWeak: "약함 (보안 취약)", pwModerate: "보통 (문자/숫자 조합 필요)",
    pwStrong: "안전함", pwVeryStrong: "매우 안전 (엔터프라이즈급 권장)",
    langSelectTitle: "Language / 언어 선택",
  },
  en: {
    demoMemberLogin: "Demo Member Login", productionLogin: "Production Login",
    demoSignup: "Demo Sign Up", prodSignup: "Production Sign Up",
    orContinueWith: "Or continue with",
    noAccountQuestion: "Don't have an account?", demoEnvBanner: "Enterprise Full Features Free Trial (Demo)",
    prodEnvBanner: "Revenue · Risk · Governance Operations",
    idleLogoutMsg: "You have been automatically logged out due to inactivity. Please log in again.",
    termsOfService: "Terms of Service", privacyPolicy: "Privacy Policy",
    ecommerceProtection: "E-Commerce Consumer Protection",
    marketingConsent: "Marketing Communications", agreeAllTerms: "Agree to All",
    requiredTag: "Required", optionalTag: "Optional", viewTerms: "View", confirmBtn: "Confirm",
    pwWeak: "Weak (insecure)", pwModerate: "Moderate (mix letters/numbers)",
    pwStrong: "Strong", pwVeryStrong: "Very strong (enterprise-grade)",
    langSelectTitle: "Language Selection",
  },
  ja: {
    demoMemberLogin: "デモ会員ログイン", productionLogin: "本番ログイン",
    demoSignup: "デモ会員登録", prodSignup: "本番会員登録",
    orContinueWith: "または以下で続ける",
    noAccountQuestion: "アカウントをお持ちではありませんか？", demoEnvBanner: "Enterprise全機能無料体験（デモ環境）",
    prodEnvBanner: "Revenue · Risk · Governance 運用システム",
    idleLogoutMsg: "長時間操作がなかったため自動ログアウトされました。再度ログインしてください。",
    termsOfService: "利用規約に同意", privacyPolicy: "プライバシーポリシーに同意",
    ecommerceProtection: "電子商取引消費者保護に同意",
    marketingConsent: "マーケティング情報受信に同意", agreeAllTerms: "すべて同意",
    requiredTag: "必須", optionalTag: "任意", viewTerms: "表示", confirmBtn: "確認",
    pwWeak: "弱い（セキュリティ脆弱）", pwModerate: "普通（英数字の組合せ推奨）",
    pwStrong: "安全", pwVeryStrong: "非常に安全（エンタープライズ推奨）",
    langSelectTitle: "言語選択",
  },
  zh: {
    demoMemberLogin: "演示会员登录", productionLogin: "生产系统登录",
    demoSignup: "演示注册", prodSignup: "生产系统注册",
    orContinueWith: "或通过以下方式继续",
    noAccountQuestion: "还没有账户？", demoEnvBanner: "企业版全功能免费体验（演示环境）",
    prodEnvBanner: "Revenue · Risk · Governance 运营系统",
    idleLogoutMsg: "由于长时间未操作已自动退出，请重新登录。",
    termsOfService: "服务条款", privacyPolicy: "隐私政策",
    ecommerceProtection: "电子商务消费者保护", marketingConsent: "营销信息接收",
    agreeAllTerms: "全部同意", requiredTag: "必填", optionalTag: "选填", viewTerms: "查看", confirmBtn: "确认",
    pwWeak: "弱（不安全）", pwModerate: "中等（需要字母数字组合）",
    pwStrong: "安全", pwVeryStrong: "非常安全（企业级推荐）",
    langSelectTitle: "语言选择",
  },
  "zh-TW": {
    demoMemberLogin: "示範會員登入", productionLogin: "正式系統登入",
    demoSignup: "示範註冊", prodSignup: "正式系統註冊",
    orContinueWith: "或透過以下方式繼續",
    noAccountQuestion: "還沒有帳戶？", demoEnvBanner: "企業版全功能免費體驗（示範環境）",
    prodEnvBanner: "Revenue · Risk · Governance 營運系統",
    idleLogoutMsg: "因長時間未操作已自動登出，請重新登入。",
    termsOfService: "服務條款", privacyPolicy: "隱私權政策",
    ecommerceProtection: "電子商務消費者保護", marketingConsent: "行銷資訊接收",
    agreeAllTerms: "全部同意", requiredTag: "必填", optionalTag: "選填", viewTerms: "檢視", confirmBtn: "確認",
    pwWeak: "弱（不安全）", pwModerate: "中等（需混合字母數字）",
    pwStrong: "安全", pwVeryStrong: "非常安全（企業級推薦）",
    langSelectTitle: "語言選擇",
  },
  de: {
    demoMemberLogin: "Demo-Anmeldung", productionLogin: "Produktions-Anmeldung",
    demoSignup: "Demo Registrierung", prodSignup: "Produktions-Registrierung",
    orContinueWith: "Oder fortfahren mit",
    noAccountQuestion: "Noch kein Konto?", demoEnvBanner: "Alle Enterprise-Funktionen kostenlos testen (Demo)",
    prodEnvBanner: "Revenue · Risk · Governance Betriebssystem",
    idleLogoutMsg: "Sie wurden wegen Inaktivität automatisch abgemeldet. Bitte erneut anmelden.",
    termsOfService: "Nutzungsbedingungen", privacyPolicy: "Datenschutzrichtlinie",
    ecommerceProtection: "E-Commerce Verbraucherschutz", marketingConsent: "Marketing-Kommunikation",
    agreeAllTerms: "Allen zustimmen", requiredTag: "Erforderlich", optionalTag: "Optional", viewTerms: "Ansehen", confirmBtn: "Bestätigen",
    pwWeak: "Schwach (unsicher)", pwModerate: "Mittel (Buchstaben/Zahlen mischen)",
    pwStrong: "Sicher", pwVeryStrong: "Sehr sicher (Enterprise-Empfehlung)",
    langSelectTitle: "Sprachauswahl",
  },
  es: {
    demoMemberLogin: "Acceso Demo", productionLogin: "Acceso Producción",
    demoSignup: "Registro Demo", prodSignup: "Registro Producción",
    orContinueWith: "O continuar con",
    noAccountQuestion: "¿No tiene cuenta?", demoEnvBanner: "Prueba gratuita Enterprise (Demo)",
    prodEnvBanner: "Revenue · Risk · Governance", idleLogoutMsg: "Se cerró la sesión automáticamente por inactividad.",
    termsOfService: "Términos de servicio", privacyPolicy: "Política de privacidad",
    ecommerceProtection: "Protección al consumidor", marketingConsent: "Comunicaciones de marketing",
    agreeAllTerms: "Aceptar todo", requiredTag: "Obligatorio", optionalTag: "Opcional", viewTerms: "Ver", confirmBtn: "Confirmar",
    pwWeak: "Débil", pwModerate: "Moderada", pwStrong: "Fuerte", pwVeryStrong: "Muy fuerte",
    langSelectTitle: "Selección de idioma",
  },
  fr: {
    demoMemberLogin: "Connexion Démo", productionLogin: "Connexion Production",
    demoSignup: "Inscription Démo", prodSignup: "Inscription Production",
    orContinueWith: "Ou continuer avec",
    noAccountQuestion: "Pas de compte ?", demoEnvBanner: "Essai gratuit Enterprise (Démo)",
    prodEnvBanner: "Revenue · Risk · Governance", idleLogoutMsg: "Déconnexion automatique pour inactivité.",
    termsOfService: "Conditions d'utilisation", privacyPolicy: "Politique de confidentialité",
    ecommerceProtection: "Protection du consommateur", marketingConsent: "Communications marketing",
    agreeAllTerms: "Tout accepter", requiredTag: "Obligatoire", optionalTag: "Facultatif", viewTerms: "Voir", confirmBtn: "Confirmer",
    pwWeak: "Faible", pwModerate: "Moyen", pwStrong: "Fort", pwVeryStrong: "Très fort",
    langSelectTitle: "Sélection de la langue",
  },
  th: {
    demoMemberLogin: "เข้าสู่ระบบสาธิต", productionLogin: "เข้าสู่ระบบจริง",
    demoSignup: "สมัครสาธิต", prodSignup: "สมัครระบบจริง",
    orContinueWith: "หรือดำเนินการต่อด้วย",
    noAccountQuestion: "ยังไม่มีบัญชี?", demoEnvBanner: "ทดลองใช้ Enterprise ฟรี (สาธิต)",
    prodEnvBanner: "Revenue · Risk · Governance", idleLogoutMsg: "ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน",
    termsOfService: "ข้อกำหนดการใช้งาน", privacyPolicy: "นโยบายความเป็นส่วนตัว",
    ecommerceProtection: "การคุ้มครองผู้บริโภค", marketingConsent: "การสื่อสารการตลาด",
    agreeAllTerms: "ยอมรับทั้งหมด", requiredTag: "จำเป็น", optionalTag: "ทางเลือก", viewTerms: "ดู", confirmBtn: "ยืนยัน",
    pwWeak: "อ่อน", pwModerate: "ปานกลาง", pwStrong: "แข็งแกร่ง", pwVeryStrong: "แข็งแกร่งมาก",
    langSelectTitle: "เลือกภาษา",
  },
  vi: {
    demoMemberLogin: "Đăng nhập Demo", productionLogin: "Đăng nhập Sản xuất",
    demoSignup: "Đăng ký Demo", prodSignup: "Đăng ký Sản xuất",
    orContinueWith: "Hoặc tiếp tục với",
    noAccountQuestion: "Chưa có tài khoản?", demoEnvBanner: "Dùng thử Enterprise miễn phí (Demo)",
    prodEnvBanner: "Revenue · Risk · Governance", idleLogoutMsg: "Đã tự động đăng xuất do không hoạt động.",
    termsOfService: "Điều khoản dịch vụ", privacyPolicy: "Chính sách bảo mật",
    ecommerceProtection: "Bảo vệ người tiêu dùng", marketingConsent: "Thông tin tiếp thị",
    agreeAllTerms: "Đồng ý tất cả", requiredTag: "Bắt buộc", optionalTag: "Tùy chọn", viewTerms: "Xem", confirmBtn: "Xác nhận",
    pwWeak: "Yếu", pwModerate: "Trung bình", pwStrong: "Mạnh", pwVeryStrong: "Rất mạnh",
    langSelectTitle: "Chọn ngôn ngữ",
  },
  id: {
    demoMemberLogin: "Masuk Demo", productionLogin: "Masuk Produksi",
    demoSignup: "Daftar Demo", prodSignup: "Daftar Produksi",
    orContinueWith: "Atau lanjutkan dengan",
    noAccountQuestion: "Belum punya akun?", demoEnvBanner: "Uji Coba Enterprise Gratis (Demo)",
    prodEnvBanner: "Revenue · Risk · Governance", idleLogoutMsg: "Keluar otomatis karena tidak aktif.",
    termsOfService: "Ketentuan Layanan", privacyPolicy: "Kebijakan Privasi",
    ecommerceProtection: "Perlindungan Konsumen", marketingConsent: "Komunikasi Pemasaran",
    agreeAllTerms: "Setujui Semua", requiredTag: "Wajib", optionalTag: "Opsional", viewTerms: "Lihat", confirmBtn: "Konfirmasi",
    pwWeak: "Lemah", pwModerate: "Sedang", pwStrong: "Kuat", pwVeryStrong: "Sangat kuat",
    langSelectTitle: "Pilih Bahasa",
  },
};

// ── Step 1: Inject missing keys into existing locale files ──
const existingLocales = ['ko','en','ja','zh','zh-TW','de','es','fr','th','vi','id'];
for (const lang of existingLocales) {
  const fn = lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`;
  const fp = path.join(LOCALES_DIR, fn);
  if (!fs.existsSync(fp)) continue;
  
  let code = fs.readFileSync(fp, 'utf8');
  const keys = LOGIN_KEYS[lang];
  if (!keys) continue;
  
  // Find the auth object and merge new keys
  let changed = false;
  for (const [k, v] of Object.entries(keys)) {
    const escaped = JSON.stringify(k);
    if (!code.includes(`${escaped}:`)) {
      // Find end of auth object (before the closing })
      // Strategy: find "auth":{ and insert before the matching }
      // Simple approach: insert after last known auth key
      const authIdx = code.indexOf('"auth":{');
      if (authIdx < 0) continue;
      // Find the end of auth object - scan for balanced braces
      let depth = 0; let end = -1;
      for (let i = authIdx + 7; i < code.length; i++) {
        if (code[i] === '{') depth++;
        if (code[i] === '}') { if (depth === 0) { end = i; break; } depth--; }
      }
      if (end > 0) {
        code = code.slice(0, end) + ',' + JSON.stringify(k) + ':' + JSON.stringify(v) + code.slice(end);
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(fp, code, 'utf8');
    console.log(`✅ ${lang}: login-page keys injected`);
  } else {
    console.log(`⏭ ${lang}: keys exist or no auth block`);
  }
}

// ── Step 2: Create full locale files for pt, ru, ar, hi ──
// Read en.js as base
const enCode = fs.readFileSync(path.join(LOCALES_DIR, 'en.js'), 'utf8');
// Extract the en object
let enObj;
try {
  // Remove 'export default ' and trailing ';' to get JSON
  const jsonStr = enCode.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  enObj = JSON.parse(jsonStr);
} catch(e) {
  console.error('Failed to parse en.js:', e.message);
  process.exit(1);
}

const NEW_LOCALES = {
  pt: {
    auth: {
      ...enObj.auth,
      ...LOGIN_KEYS.en, // English fallback
      // Portuguese auth overrides
      quickStart: "Início rápido", try: "começar", freeRegister: "Registro gratuito",
      emailLabel: "E-mail", passwordLabel: "Senha", nameLabel: "Nome completo",
      loginBtn: "Entrar", loggingIn: "Entrando...", noAccount: "Não tem conta?",
      registerLink: "Cadastre-se", alreadyHaveAccount: "Já tem conta?", loginLink: "Fazer login",
      agreeAll: "Aceitar tudo", agreeTerms: "Termos de serviço", agreePrivacy: "Política de privacidade",
      agreeConsent: "Proteção ao consumidor", agreeMarketing: "Comunicações de marketing",
      startFree: "Começar grátis", registering: "Cadastrando...",
      companyLabel: "Empresa", phoneLabel: "Telefone", countryLabel: "País",
      businessTypeLabel: "Tipo de negócio", salesChannelTitle: "Canais de venda",
      adChannelTitle: "Canais de publicidade",
      demoMemberLogin: "Acesso Demo", productionLogin: "Acesso Produção",
      demoSignup: "Cadastro Demo", prodSignup: "Cadastro Produção",
      orContinueWith: "Ou continuar com", noAccountQuestion: "Não tem conta?",
      demoEnvBanner: "Teste grátis Enterprise (Demo)",
      prodEnvBanner: "Revenue · Risk · Governance",
      idleLogoutMsg: "Sessão encerrada por inatividade. Faça login novamente.",
      termsOfService: "Termos de serviço", privacyPolicy: "Política de privacidade",
      ecommerceProtection: "Proteção ao consumidor", marketingConsent: "Comunicações de marketing",
      agreeAllTerms: "Aceitar tudo", requiredTag: "Obrigatório", optionalTag: "Opcional",
      viewTerms: "Ver", confirmBtn: "Confirmar",
      pwWeak: "Fraca", pwModerate: "Moderada", pwStrong: "Forte", pwVeryStrong: "Muito forte",
      langSelectTitle: "Seleção de idioma",
      passwordConfirm: "Confirmar senha", passwordHint: "Mínimo 8 caracteres",
      step1Account: "Conta", step2Business: "Negócio", step3Channels: "Canais",
      selectPlaceholder: "Selecionar", nextBusiness: "Próximo: Negócio", nextChannels: "Próximo: Canais",
      addressLabel: "Endereço", websiteLabel: "Website",
      passwordMismatch: "Senhas não correspondem", passwordTooShort: "Senha muito curta",
      emailRequired: "E-mail obrigatório", nameRequired: "Nome obrigatório",
    },
  },
  ru: {
    auth: {
      ...enObj.auth,
      ...LOGIN_KEYS.en,
      quickStart: "Быстрый старт", try: "начать", freeRegister: "Бесплатная регистрация",
      emailLabel: "Электронная почта", passwordLabel: "Пароль", nameLabel: "Полное имя",
      loginBtn: "Войти", loggingIn: "Выполняется вход...", noAccount: "Нет аккаунта?",
      registerLink: "Зарегистрироваться", alreadyHaveAccount: "Уже есть аккаунт?", loginLink: "Войти",
      agreeAll: "Принять все", agreeTerms: "Условия использования", agreePrivacy: "Политика конфиденциальности",
      agreeConsent: "Защита потребителей", agreeMarketing: "Маркетинговые рассылки",
      startFree: "Начать бесплатно", registering: "Регистрация...",
      companyLabel: "Компания", phoneLabel: "Телефон", countryLabel: "Страна",
      businessTypeLabel: "Тип бизнеса", salesChannelTitle: "Каналы продаж",
      adChannelTitle: "Рекламные каналы",
      demoMemberLogin: "Демо-вход", productionLogin: "Вход в продакшн",
      demoSignup: "Демо-регистрация", prodSignup: "Регистрация (продакшн)",
      orContinueWith: "Или продолжить через", noAccountQuestion: "Нет аккаунта?",
      demoEnvBanner: "Бесплатная пробная версия Enterprise (Демо)",
      prodEnvBanner: "Revenue · Risk · Governance",
      idleLogoutMsg: "Выполнен автоматический выход из-за неактивности.",
      termsOfService: "Условия использования", privacyPolicy: "Политика конфиденциальности",
      ecommerceProtection: "Защита потребителей", marketingConsent: "Маркетинговые рассылки",
      agreeAllTerms: "Принять все", requiredTag: "Обязательно", optionalTag: "Необязательно",
      viewTerms: "Просмотр", confirmBtn: "Подтвердить",
      pwWeak: "Слабый", pwModerate: "Средний", pwStrong: "Надёжный", pwVeryStrong: "Очень надёжный",
      langSelectTitle: "Выбор языка",
      passwordConfirm: "Подтвердите пароль", passwordHint: "Минимум 8 символов",
      step1Account: "Аккаунт", step2Business: "Бизнес", step3Channels: "Каналы",
      selectPlaceholder: "Выбрать", nextBusiness: "Далее: Бизнес", nextChannels: "Далее: Каналы",
      addressLabel: "Адрес", websiteLabel: "Сайт",
      passwordMismatch: "Пароли не совпадают", passwordTooShort: "Пароль слишком короткий",
      emailRequired: "Требуется email", nameRequired: "Требуется имя",
    },
  },
  ar: {
    dir: "rtl",
    auth: {
      ...enObj.auth,
      ...LOGIN_KEYS.en,
      quickStart: "بداية سريعة", try: "ابدأ", freeRegister: "تسجيل مجاني",
      emailLabel: "البريد الإلكتروني", passwordLabel: "كلمة المرور", nameLabel: "الاسم الكامل",
      loginBtn: "تسجيل الدخول", loggingIn: "جاري تسجيل الدخول...", noAccount: "ليس لديك حساب؟",
      registerLink: "إنشاء حساب", alreadyHaveAccount: "لديك حساب بالفعل؟", loginLink: "تسجيل الدخول",
      agreeAll: "الموافقة على الكل", agreeTerms: "شروط الخدمة", agreePrivacy: "سياسة الخصوصية",
      agreeConsent: "حماية المستهلك", agreeMarketing: "الاتصالات التسويقية",
      startFree: "ابدأ مجانًا", registering: "جاري التسجيل...",
      companyLabel: "الشركة", phoneLabel: "الهاتف", countryLabel: "الدولة",
      businessTypeLabel: "نوع النشاط", salesChannelTitle: "قنوات البيع",
      adChannelTitle: "قنوات الإعلان",
      demoMemberLogin: "دخول تجريبي", productionLogin: "دخول الإنتاج",
      demoSignup: "تسجيل تجريبي", prodSignup: "تسجيل الإنتاج",
      orContinueWith: "أو المتابعة عبر", noAccountQuestion: "ليس لديك حساب؟",
      demoEnvBanner: "تجربة مجانية للمؤسسات (تجريبي)",
      prodEnvBanner: "Revenue · Risk · Governance",
      idleLogoutMsg: "تم تسجيل الخروج تلقائيًا بسبب عدم النشاط. يرجى تسجيل الدخول مرة أخرى.",
      termsOfService: "شروط الخدمة", privacyPolicy: "سياسة الخصوصية",
      ecommerceProtection: "حماية المستهلك", marketingConsent: "الاتصالات التسويقية",
      agreeAllTerms: "الموافقة على الكل", requiredTag: "مطلوب", optionalTag: "اختياري",
      viewTerms: "عرض", confirmBtn: "تأكيد",
      pwWeak: "ضعيفة", pwModerate: "متوسطة", pwStrong: "قوية", pwVeryStrong: "قوية جدًا",
      langSelectTitle: "اختيار اللغة",
      passwordConfirm: "تأكيد كلمة المرور", passwordHint: "8 أحرف كحد أدنى",
      step1Account: "الحساب", step2Business: "النشاط التجاري", step3Channels: "القنوات",
      selectPlaceholder: "اختر", nextBusiness: "التالي: النشاط", nextChannels: "التالي: القنوات",
      addressLabel: "العنوان", websiteLabel: "الموقع الإلكتروني",
      passwordMismatch: "كلمتا المرور غير متطابقتين", passwordTooShort: "كلمة المرور قصيرة جدًا",
      emailRequired: "البريد الإلكتروني مطلوب", nameRequired: "الاسم مطلوب",
    },
  },
  hi: {
    auth: {
      ...enObj.auth,
      ...LOGIN_KEYS.en,
      quickStart: "क्विक स्टार्ट", try: "शुरू करें", freeRegister: "मुफ्त पंजीकरण",
      emailLabel: "ईमेल", passwordLabel: "पासवर्ड", nameLabel: "पूरा नाम",
      loginBtn: "लॉग इन", loggingIn: "लॉग इन हो रहा है...", noAccount: "खाता नहीं है?",
      registerLink: "साइन अप करें", alreadyHaveAccount: "पहले से खाता है?", loginLink: "लॉग इन करें",
      agreeAll: "सभी स्वीकार करें", agreeTerms: "सेवा की शर्तें", agreePrivacy: "गोपनीयता नीति",
      agreeConsent: "उपभोक्ता संरक्षण", agreeMarketing: "मार्केटिंग संचार",
      startFree: "मुफ्त शुरू करें", registering: "पंजीकरण हो रहा है...",
      companyLabel: "कंपनी", phoneLabel: "फ़ोन", countryLabel: "देश",
      businessTypeLabel: "व्यवसाय प्रकार", salesChannelTitle: "बिक्री चैनल",
      adChannelTitle: "विज्ञापन चैनल",
      demoMemberLogin: "डेमो लॉगिन", productionLogin: "प्रोडक्शन लॉगिन",
      demoSignup: "डेमो साइन अप", prodSignup: "प्रोडक्शन साइन अप",
      orContinueWith: "या इसके साथ जारी रखें", noAccountQuestion: "खाता नहीं है?",
      demoEnvBanner: "Enterprise मुफ्त ट्रायल (डेमो)",
      prodEnvBanner: "Revenue · Risk · Governance",
      idleLogoutMsg: "निष्क्रियता के कारण स्वचालित रूप से लॉग आउट हो गया। कृपया पुनः लॉग इन करें।",
      termsOfService: "सेवा की शर्तें", privacyPolicy: "गोपनीयता नीति",
      ecommerceProtection: "उपभोक्ता संरक्षण", marketingConsent: "मार्केटिंग संचार",
      agreeAllTerms: "सभी स्वीकार करें", requiredTag: "आवश्यक", optionalTag: "वैकल्पिक",
      viewTerms: "देखें", confirmBtn: "पुष्टि करें",
      pwWeak: "कमज़ोर", pwModerate: "मध्यम", pwStrong: "मज़बूत", pwVeryStrong: "बहुत मज़बूत",
      langSelectTitle: "भाषा चुनें",
      passwordConfirm: "पासवर्ड की पुष्टि करें", passwordHint: "न्यूनतम 8 अक्षर",
      step1Account: "खाता", step2Business: "व्यवसाय", step3Channels: "चैनल",
      selectPlaceholder: "चुनें", nextBusiness: "अगला: व्यवसाय", nextChannels: "अगला: चैनल",
      addressLabel: "पता", websiteLabel: "वेबसाइट",
      passwordMismatch: "पासवर्ड मेल नहीं खाते", passwordTooShort: "पासवर्ड बहुत छोटा है",
      emailRequired: "ईमेल आवश्यक है", nameRequired: "नाम आवश्यक है",
    },
  },
};

for (const [lang, data] of Object.entries(NEW_LOCALES)) {
  const fp = path.join(LOCALES_DIR, `${lang}.js`);
  const code = `export default ${JSON.stringify(data)};\n`;
  fs.writeFileSync(fp, code, 'utf8');
  console.log(`✅ ${lang}: full locale file created (${(code.length/1024).toFixed(1)}KB)`);
}

// ── Step 3: Update i18n/index.js ──
const indexPath = path.join(__dirname, 'src/i18n/index.js');
let indexCode = fs.readFileSync(indexPath, 'utf8');

// Add imports for pt, ru, ar, hi
if (!indexCode.includes('import pt')) {
  indexCode = indexCode.replace(
    /import fr from "\.\/locales\/fr\.js";/,
    `import fr from "./locales/fr.js";\nimport pt from "./locales/pt.js";\nimport ru from "./locales/ru.js";\nimport ar from "./locales/ar.js";\nimport hi from "./locales/hi.js";`
  );
}

// Add to LOCALES registry
if (!indexCode.includes('"pt"') && !indexCode.includes(' pt,') && !indexCode.includes(' pt }')) {
  indexCode = indexCode.replace(
    /export const LOCALES = \{([^}]+)\};/,
    (m, inner) => `export const LOCALES = {${inner.trimEnd()}, pt, ru, ar, hi };`
  );
}

// Add to LANG_OPTIONS
if (!indexCode.includes('"pt"')) {
  indexCode = indexCode.replace(
    /\];(\s*\r?\n\s*\/\/ ── 국가 ISO)/,
    `    { code: "pt",    label: "Português",        flag: "🇧🇷", name: "Portuguese" },\n    { code: "ru",    label: "Русский",           flag: "🇷🇺", name: "Russian" },\n    { code: "ar",    label: "العربية",            flag: "🇸🇦", name: "Arabic", dir: "rtl" },\n    { code: "hi",    label: "हिन्दी",              flag: "🇮🇳", name: "Hindi" },\n];$1`
  );
}

// Add country mappings
if (!indexCode.includes('BR: "pt"')) {
  indexCode = indexCode.replace(
    /\/\/ Numeric fallback/,
    `// Portuguese\n    BR: "pt", PT: "pt", AO: "pt", MZ: "pt",\n    // Russian\n    RU: "ru", BY: "ru", KZ: "ru", UA: "ru",\n    // Arabic\n    SA: "ar", AE: "ar", EG: "ar", MA: "ar", IQ: "ar", JO: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", LB: "ar", LY: "ar", TN: "ar", DZ: "ar",\n    // Hindi\n    // (India already maps to "en" — override for Hindi if needed)\n    // Numeric fallback`
  );
}

fs.writeFileSync(indexPath, indexCode, 'utf8');
console.log('✅ i18n/index.js updated with pt, ru, ar, hi');

console.log('\n🎉 All i18n files updated successfully!');
console.log('Languages supported: ko, en, ja, zh, zh-TW, de, es, fr, th, vi, id, pt, ru, ar, hi (15 total)');
