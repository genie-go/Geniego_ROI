/**
 * Inject missing auth.* translation keys into all locale files
 */
const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, 'src/i18n/locales');

const MISSING_KEYS = {
  // Login page
  prodEnvBanner: { ko: "🏢 운영시스템 로그인", en: "🏢 Production Login" },
  demoEnvBanner: { ko: "🧪 데모 환경 로그인", en: "🧪 Demo Environment Login" },
  demoMemberLogin: { ko: "데모회원 로그인", en: "Demo Login" },
  productionLogin: { ko: "운영시스템 로그인", en: "Production Login" },
  orContinueWith: { ko: "또는 SSO 계속하기", en: "Or continue with SSO" },
  
  // Password strength
  pwWeak: { ko: "약함", en: "Weak" },
  pwModerate: { ko: "보통", en: "Moderate" },
  pwStrong: { ko: "강함", en: "Strong" },
  pwVeryStrong: { ko: "매우 강함", en: "Very Strong" },
  passwordHint: { ko: "비밀번호", en: "Password" },
  passwordConfirm: { ko: "비밀번호 확인", en: "Confirm Password" },
  confirmBtn: { ko: "확인", en: "Confirm" },
  
  // Terms
  termsOfService: { ko: "서비스 이용약관", en: "Terms of Service" },
  privacyPolicy: { ko: "개인정보처리방침", en: "Privacy Policy" },
  ecommerceProtection: { ko: "전자상거래 소비자보호", en: "E-Commerce Consumer Protection" },
  marketingConsent: { ko: "마케팅 수신 동의", en: "Marketing Consent" },
  agreeAllTerms: { ko: "약관 전체 동의", en: "Agree to All Terms" },
  requiredTag: { ko: "필수", en: "Required" },
  optionalTag: { ko: "선택", en: "Optional" },
  viewTerms: { ko: "보기", en: "View" },
  
  // Registration steps
  step1Account: { ko: "계정 정보", en: "Account Info" },
  step2Business: { ko: "사업자 정보", en: "Business Info" },
  step3Channels: { ko: "채널 & 동의", en: "Channels & Agree" },
  paidPlanTitle: { ko: "플랜 구독 가입", en: "Plan Subscription" },
  paidPlanNote: { ko: "가입 후 7일 무료 체험 가능", en: "7-day free trial after signup" },
  nextBusiness: { ko: "다음: 사업자 정보 →", en: "Next: Business Info →" },
  nextChannels: { ko: "다음: 채널 선택 →", en: "Next: Select Channels →" },
  
  // Business fields
  companyLabel: { ko: "회사명", en: "Company Name" },
  ceoNameLabel: { ko: "대표자명", en: "CEO Name" },
  businessTypeLabel: { ko: "업종", en: "Business Type" },
  businessNumberLabel: { ko: "사업자등록번호", en: "Business Reg. No." },
  businessNumberHint: { ko: "000-00-00000 형식", en: "Format: 000-00-00000" },
  phoneLabel: { ko: "전화번호", en: "Phone" },
  countryLabel: { ko: "국가", en: "Country" },
  zipCodeLabel: { ko: "우편번호", en: "Zip Code" },
  addressLabel: { ko: "주소", en: "Address" },
  addressDetailLabel: { ko: "상세주소", en: "Address Detail" },
  websiteLabel: { ko: "웹사이트", en: "Website" },
  businessWarning: { ko: "⚠️ 사업자 정보는 정확히 입력해 주세요.", en: "⚠️ Please enter accurate business information." },
  
  // Channels
  salesChannelTitle: { ko: "판매 채널", en: "Sales Channels" },
  salesChannelNote: { ko: "(1개 이상 선택)", en: "(Select at least 1)" },
  adChannelTitle: { ko: "광고 채널", en: "Ad Channels" },
  adChannelNote: { ko: "(선택사항)", en: "(Optional)" },
  monthlyRevenueLabel: { ko: "월 매출 규모", en: "Monthly Revenue" },
  
  // Completion
  completionNote: { ko: "{{plan}} 플랜 · {{count}}개 채널 선택됨", en: "{{plan}} Plan · {{count}} channels selected" },
  processingRegister: { ko: "가입 처리 중...", en: "Processing..." },
  startPlan: { ko: "플랜 시작하기", en: "Start Plan" },
  alreadyHaveAccount: { ko: "이미 계정이 있나요?", en: "Already have an account?" },
  loginLink: { ko: "로그인", en: "Log in" },
  
  // Validation
  companyRequired: { ko: "회사명을 입력하세요", en: "Company name required" },
  ceoRequired: { ko: "대표자명을 입력하세요", en: "CEO name required" },
  businessTypeRequired: { ko: "업종을 선택하세요", en: "Select business type" },
  businessNumberRequired: { ko: "사업자등록번호를 입력하세요", en: "Business number required" },
  countryRequired: { ko: "국가를 선택하세요", en: "Select country" },
  addressRequired: { ko: "주소를 입력하세요", en: "Address required" },
  phoneRequired: { ko: "전화번호를 입력하세요", en: "Phone number required" },
  salesChannelRequired: { ko: "판매 채널을 1개 이상 선택하세요", en: "Select at least 1 sales channel" },
  
  // Admin
  adminLoginTitle: { ko: "관리자 로그인", en: "Admin Login" },
  adminLoginDesc: { ko: "관리자 전용 인증이 필요합니다", en: "Admin authentication required" },
  adminKeyLabel: { ko: "관리자 인증키", en: "Admin Key" },
  adminKeyPh: { ko: "관리자 키 입력", en: "Enter admin key" },
  wrongAdminKey: { ko: "잘못된 관리자 키입니다", en: "Invalid admin key" },
  verifyKey: { ko: "인증키 확인", en: "Verify Key" },
  keyVerified: { ko: "✅ 인증키 확인 완료", en: "✅ Key verified" },
  adminEmailLabel: { ko: "관리자 이메일", en: "Admin Email" },
  notAdminAccount: { ko: "관리자 계정이 아닙니다", en: "Not an admin account" },
  adminLoginBtn: { ko: "관리자 로그인", en: "Admin Login" },
  reenterKey: { ko: "← 인증키 재입력", en: "← Re-enter key" },
  
  // Language selector
  langSelectTitle: { ko: "언어 선택", en: "Language Selection" },
};

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.js'));
console.log(`Found ${files.length} locale files`);

let totalInjected = 0;

files.forEach(f => {
  const filePath = path.join(localesDir, f);
  const langCode = f.replace('.js', '');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Parse the existing object
  let data;
  try {
    // Extract JSON-like object from 'export default {...}'
    const match = content.match(/export\s+default\s+({[\s\S]*})\s*;?\s*$/);
    if (!match) { console.log(`  ⚠️ ${f}: could not parse`); return; }
    data = eval('(' + match[1] + ')');
  } catch (e) {
    console.log(`  ⚠️ ${f}: parse error: ${e.message}`);
    return;
  }
  
  if (!data.auth) data.auth = {};
  
  let injected = 0;
  Object.entries(MISSING_KEYS).forEach(([key, translations]) => {
    if (!data.auth[key]) {
      // Use the language-specific translation if available, fallback to English
      data.auth[key] = translations[langCode] || translations.en;
      injected++;
    }
  });
  
  if (injected > 0) {
    const output = 'export default ' + JSON.stringify(data);
    fs.writeFileSync(filePath, output, 'utf8');
    totalInjected += injected;
    console.log(`  ✅ ${f}: injected ${injected} auth keys`);
  } else {
    console.log(`  ✓ ${f}: all keys present`);
  }
});

console.log(`\n🎉 Total: ${totalInjected} keys injected across ${files.length} files`);
