/**
 * Fix Global Component i18n for Vietnamese (vi.js)
 * - Sidebar (gNav.*) — Indonesian → Vietnamese
 * - Topbar (topbar.*) — English/Korean → Vietnamese
 * - Theme names/descriptions — localize via topbar keys
 * - Also fix other locales with wrong translations
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'i18n', 'locales');

// ═══════════════════════════════════════════════════════════
// gNav keys: correct translations per language
// ═══════════════════════════════════════════════════════════
const gNavFixes = {
  vi: {
    adPerformance: "Hiệu suất quảng cáo",
    budgetTracker: "Theo dõi ngân sách",
    accountPerformance: "Hiệu suất tài khoản",
    channelKpi: "KPI kênh",
    graphScore: "Điểm đồ thị",
    crmMain: "Quản lý khách hàng",
    kakaoChannel: "Kênh Kakao",
    emailMarketing: "Email Marketing",
    influencer: "Influencer·UGC",
    reviewsUgc: "Đánh giá & UGC",
    webPopup: "Web Popup",
    omniChannel: "Omni-Channel",
    catalog: "Đồng bộ danh mục",
    performanceHub: "Trung tâm hiệu suất",
    dataProduct: "Sản phẩm dữ liệu",
    aiRuleEngine: "Công cụ quy tắc AI",
    alertAutomation: "Tự động hóa cảnh báo",
    aiPolicy: "Chính sách AI",
    approvals: "Quản lý phê duyệt",
    writeback: "Ghi ngược tự động",
    onboarding: "Hướng dẫn bắt đầu",
    dataSchema: "Lược đồ dữ liệu",
    apiKeys: "API Keys",
    pixelTracking: "Theo dõi Pixel",
    dataTrust: "Độ tin cậy dữ liệu",
    mappingRegistry: "Đăng ký ánh xạ",
    settlements: "Quản lý thanh toán",
    reconciliation: "Đối soát",
    pricing: "Bảng giá",
    auditLog: "Nhật ký kiểm toán",
    workspace: "Không gian làm việc",
    operations: "Vận hành",
    caseStudy: "Nghiên cứu tình huống",
    help: "Trung tâm trợ giúp",
    feedback: "Phản hồi",
    developerHub: "Developer Hub",
    platformEnv: "Cài đặt nền tảng",
    userMgmt: "Quản lý người dùng",
    menuRule: "Quản lý quyền menu",
    dbSchema: "Lược đồ DB",
    paymentPg: "Thanh toán (PG)",
    serverMonitor: "Giám sát máy chủ",
    smsMarketing: "SMS/LMS Marketing",
    contentCalendar: "Lịch nội dung",
    budgetPlanner: "Lập kế hoạch ngân sách",
    marketingIntel: "Phân tích thị trường",
    digitalShelf: "Kệ số",
    amazonRisk: "Rủi ro Amazon",
    whatsapp: "WhatsApp",
    instagramDm: "Instagram/Facebook DM",
    lineChannel: "Kênh LINE",
    krChannel: "Thanh toán kênh Hàn Quốc",
    demandForecast: "Dự báo nhu cầu AI & PO tự động",
    asiaLogistics: "Trung tâm logistics châu Á",
    supplierPortal: "Cổng nhà cung cấp (B2B)",
    myCoupons: "Phiếu giảm giá",
    alertPolicies: "Chính sách cảnh báo",
    actionPresets: "Hành động mẫu",
    connectors: "Kết nối chính",
    eventNorm: "Lược đồ sự kiện",
    adminCenter: "Hệ thống quản trị",
    adminSettings: "Cài đặt quản trị",
    dbAdmin: "Quản trị DB",
    pgConfig: "Cấu hình PG",
    systemMonitor: "Giám sát máy chủ",
    menuAccessManager: "Quản lý quyền menu",
    campaignMgr: "Quản lý chiến dịch",
    adChannel: "Phân tích quảng cáo",
    channelKPI: "KPI kênh",
    abTest: "Thử nghiệm A/B",
    customerAnalysis: "Phân tích khách hàng",
    customerCrm: "Khách hàng·CRM",
    email: "Email Marketing",
    sms: "SMS Marketing",
    catalogSync: "Đồng bộ danh mục",
    performance: "Trung tâm hiệu suất",
    settlement: "Thanh toán",
    systemAdmin: "Quản trị hệ thống",
  },
};

// ═══════════════════════════════════════════════════════════
// topbar keys: correct translations per language
// ═══════════════════════════════════════════════════════════
const topbarFixes = {
  vi: {
    live: "Thời gian thực",
    workspace: "Không gian làm việc",
    unifiedSearch: "Tìm kiếm tổng hợp",
    searchTooltip: "Tìm kiếm (Ctrl+K)",
    helpManual: "Hướng dẫn sử dụng",
    helpTooltip: "Hướng dẫn hệ thống",
    helpPage: "Hướng dẫn hệ thống",
    currentHelp: "Hướng dẫn trang hiện tại",
    themeLabel: "Chủ đề máy tính",
    themeSave: "Chủ đề được lưu tự động",
    darkModeToggle: "Chuyển sang chế độ tối",
    lightModeToggle: "Chuyển sang chế độ sáng",
    themeChangeTitle: "Thay đổi chủ đề nền",
    themeSelect: "🎨 Chủ đề",
    langSelect: "🌐 Chọn ngôn ngữ",
    detectedLang: "Ngôn ngữ phát hiện: {lang}",
    notifCenter: "Trung tâm thông báo",
    unreadCount: "{n} chưa đọc",
    allRead: "Đã đọc tất cả",
    markAllRead: "Đánh dấu đã đọc tất cả",
    noNotif: "📭 Không có thông báo",
    sendFeedback: "💬 Gửi phản hồi",
    clearAll: "Xóa tất cả",
    confirmClear: "Xóa tất cả thông báo?",
    secAgo: "{n} giây trước",
    minAgo: "{n} phút trước",
    hrAgo: "{n} giờ trước",
    dayAgo: "{n} ngày trước",
    moreMenu: "Thêm",
    helpBtn: "📚 Trợ giúp",
    close: "Đóng",
    menuToggle: "Mở/Đóng menu",
    sidebarToggle: "Mở/Đóng thanh bên",
    secsAgo: "giây trước",
    bgTheme: "Chủ đề nền",
    switchLang: "Đổi ngôn ngữ",
  },
};

// ═══════════════════════════════════════════════════════════
// Theme name/desc i18n keys (new keys to add for theme localization)
// ═══════════════════════════════════════════════════════════
const themeI18nFixes = {
  vi: {
    "topbar.themeDeepSpace": "Không gian sâu",
    "topbar.themeDeepSpaceDesc": "Tinh vân không gian sâu · Mặc định",
    "topbar.themeAurora": "Cực quang",
    "topbar.themeAuroraDesc": "Cực quang Bắc cực · Xanh & Tím",
    "topbar.themeMidnightGold": "Vàng nửa đêm",
    "topbar.themeMidnightGoldDesc": "Vàng Premium · Tối sang trọng",
    "topbar.themeOceanDepth": "Đại dương sâu",
    "topbar.themeOceanDepthDesc": "Xanh biển sâu · Cyber trầm lắng",
    "topbar.themeArcticWhite": "Trắng Bắc cực",
    "topbar.themeArcticWhiteDesc": "Trắng sạch · Sáng và gọn gàng",
    "topbar.themePearlOffice": "Văn phòng Ngọc trai",
    "topbar.themePearlOfficeDesc": "Xám trung tính · Sáng văn phòng",
  },
  ko: {
    "topbar.themeDeepSpace": "딥 스페이스",
    "topbar.themeDeepSpaceDesc": "우주 성운 · 기본 테마",
    "topbar.themeAurora": "오로라",
    "topbar.themeAuroraDesc": "북극 오로라 · 그린 & 퍼플",
    "topbar.themeMidnightGold": "미드나잇 골드",
    "topbar.themeMidnightGoldDesc": "골드 프리미엄 · 럭셔리 다크",
    "topbar.themeOceanDepth": "오션 뎁스",
    "topbar.themeOceanDepthDesc": "심해 블루 · 사이버 트랜퀼",
    "topbar.themeArcticWhite": "아틱 화이트",
    "topbar.themeArcticWhiteDesc": "클린 화이트 · 밝고 깔끔한 라이트",
    "topbar.themePearlOffice": "펄 오피스",
    "topbar.themePearlOfficeDesc": "뉴트럴 그레이 · 오피스 라이트",
  },
  en: {
    "topbar.themeDeepSpace": "Deep Space",
    "topbar.themeDeepSpaceDesc": "Deep Space Nebula · Default Theme",
    "topbar.themeAurora": "Aurora Borealis",
    "topbar.themeAuroraDesc": "Arctic Aurora · Green & Purple",
    "topbar.themeMidnightGold": "Midnight Gold",
    "topbar.themeMidnightGoldDesc": "Gold Premium · Luxury Dark",
    "topbar.themeOceanDepth": "Ocean Depth",
    "topbar.themeOceanDepthDesc": "Deep Blue · Cyber Tranquil",
    "topbar.themeArcticWhite": "Arctic White",
    "topbar.themeArcticWhiteDesc": "Clean White · Bright & Clean Light",
    "topbar.themePearlOffice": "Pearl Office",
    "topbar.themePearlOfficeDesc": "Neutral Gray · Office Light",
  },
  ja: {
    "topbar.themeDeepSpace": "ディープスペース",
    "topbar.themeDeepSpaceDesc": "宇宙星雲 · デフォルトテーマ",
    "topbar.themeAurora": "オーロラ",
    "topbar.themeAuroraDesc": "北極オーロラ · グリーン&パープル",
    "topbar.themeMidnightGold": "ミッドナイトゴールド",
    "topbar.themeMidnightGoldDesc": "ゴールドプレミアム · ラグジュアリーダーク",
    "topbar.themeOceanDepth": "オーシャンデプス",
    "topbar.themeOceanDepthDesc": "深海ブルー · サイバートランキル",
    "topbar.themeArcticWhite": "アークティックホワイト",
    "topbar.themeArcticWhiteDesc": "クリーンホワイト · 明るくクリーン",
    "topbar.themePearlOffice": "パールオフィス",
    "topbar.themePearlOfficeDesc": "ニュートラルグレー · オフィスライト",
  },
  zh: {
    "topbar.themeDeepSpace": "深空",
    "topbar.themeDeepSpaceDesc": "深空星云 · 默认主题",
    "topbar.themeAurora": "极光",
    "topbar.themeAuroraDesc": "北极极光 · 绿色与紫色",
    "topbar.themeMidnightGold": "午夜金",
    "topbar.themeMidnightGoldDesc": "金色高端 · 奢华暗色",
    "topbar.themeOceanDepth": "海洋深处",
    "topbar.themeOceanDepthDesc": "深蓝 · 赛博宁静",
    "topbar.themeArcticWhite": "北极白",
    "topbar.themeArcticWhiteDesc": "洁白 · 明亮清新",
    "topbar.themePearlOffice": "珍珠办公",
    "topbar.themePearlOfficeDesc": "中性灰 · 办公室明亮",
  },
  "zh-TW": {
    "topbar.themeDeepSpace": "深空",
    "topbar.themeDeepSpaceDesc": "深空星雲 · 預設主題",
    "topbar.themeAurora": "極光",
    "topbar.themeAuroraDesc": "北極極光 · 綠色與紫色",
    "topbar.themeMidnightGold": "午夜金",
    "topbar.themeMidnightGoldDesc": "金色高端 · 奢華暗色",
    "topbar.themeOceanDepth": "海洋深處",
    "topbar.themeOceanDepthDesc": "深藍 · 賽博寧靜",
    "topbar.themeArcticWhite": "北極白",
    "topbar.themeArcticWhiteDesc": "純白 · 明亮清爽",
    "topbar.themePearlOffice": "珍珠辦公",
    "topbar.themePearlOfficeDesc": "中性灰 · 辦公室明亮",
  },
  de: {
    "topbar.themeDeepSpace": "Deep Space",
    "topbar.themeDeepSpaceDesc": "Weltraumnebel · Standardthema",
    "topbar.themeAurora": "Aurora Borealis",
    "topbar.themeAuroraDesc": "Arktische Aurora · Grün & Lila",
    "topbar.themeMidnightGold": "Mitternachtsgold",
    "topbar.themeMidnightGoldDesc": "Gold Premium · Luxus Dunkel",
    "topbar.themeOceanDepth": "Ozeantiefe",
    "topbar.themeOceanDepthDesc": "Tiefblau · Cyber Tranquil",
    "topbar.themeArcticWhite": "Arktisches Weiß",
    "topbar.themeArcticWhiteDesc": "Sauberes Weiß · Hell und klar",
    "topbar.themePearlOffice": "Perlen Büro",
    "topbar.themePearlOfficeDesc": "Neutralgrau · Büro Hell",
  },
  th: {
    "topbar.themeDeepSpace": "ห้วงอวกาศ",
    "topbar.themeDeepSpaceDesc": "เนบิวลาห้วงอวกาศ · ธีมเริ่มต้น",
    "topbar.themeAurora": "แสงเหนือ",
    "topbar.themeAuroraDesc": "แสงเหนือ · เขียวและม่วง",
    "topbar.themeMidnightGold": "ทองเที่ยงคืน",
    "topbar.themeMidnightGoldDesc": "ทองพรีเมียม · ดาร์กหรูหรา",
    "topbar.themeOceanDepth": "ใต้ท้องทะเล",
    "topbar.themeOceanDepthDesc": "น้ำเงินลึก · ไซเบอร์สงบ",
    "topbar.themeArcticWhite": "ขาวอาร์กติก",
    "topbar.themeArcticWhiteDesc": "ขาวสะอาด · สว่างและสะอาด",
    "topbar.themePearlOffice": "สำนักงานไข่มุก",
    "topbar.themePearlOfficeDesc": "เทาเป็นกลาง · สว่างสำนักงาน",
  },
  id: {
    "topbar.themeDeepSpace": "Ruang Dalam",
    "topbar.themeDeepSpaceDesc": "Nebula Ruang Dalam · Tema Default",
    "topbar.themeAurora": "Aurora Borealis",
    "topbar.themeAuroraDesc": "Aurora Arktik · Hijau & Ungu",
    "topbar.themeMidnightGold": "Emas Tengah Malam",
    "topbar.themeMidnightGoldDesc": "Emas Premium · Mewah Gelap",
    "topbar.themeOceanDepth": "Kedalaman Laut",
    "topbar.themeOceanDepthDesc": "Biru Laut Dalam · Siber Tenang",
    "topbar.themeArcticWhite": "Putih Arktik",
    "topbar.themeArcticWhiteDesc": "Putih Bersih · Terang & Rapi",
    "topbar.themePearlOffice": "Kantor Mutiara",
    "topbar.themePearlOfficeDesc": "Abu-abu Netral · Terang Kantor",
  },
  es: {
    "topbar.themeDeepSpace": "Espacio Profundo",
    "topbar.themeDeepSpaceDesc": "Nebulosa Espacial · Tema Predeterminado",
    "topbar.themeAurora": "Aurora Boreal",
    "topbar.themeAuroraDesc": "Aurora Ártica · Verde y Púrpura",
    "topbar.themeMidnightGold": "Oro de Medianoche",
    "topbar.themeMidnightGoldDesc": "Oro Premium · Oscuro Lujoso",
    "topbar.themeOceanDepth": "Profundidad Oceánica",
    "topbar.themeOceanDepthDesc": "Azul Profundo · Cyber Tranquilo",
    "topbar.themeArcticWhite": "Blanco Ártico",
    "topbar.themeArcticWhiteDesc": "Blanco Limpio · Brillante y Limpio",
    "topbar.themePearlOffice": "Oficina Perla",
    "topbar.themePearlOfficeDesc": "Gris Neutro · Oficina Clara",
  },
  fr: {
    "topbar.themeDeepSpace": "Espace Profond",
    "topbar.themeDeepSpaceDesc": "Nébuleuse Spatiale · Thème par Défaut",
    "topbar.themeAurora": "Aurore Boréale",
    "topbar.themeAuroraDesc": "Aurore Arctique · Vert et Violet",
    "topbar.themeMidnightGold": "Or de Minuit",
    "topbar.themeMidnightGoldDesc": "Or Premium · Sombre Luxueux",
    "topbar.themeOceanDepth": "Profondeur Océanique",
    "topbar.themeOceanDepthDesc": "Bleu Profond · Cyber Tranquille",
    "topbar.themeArcticWhite": "Blanc Arctique",
    "topbar.themeArcticWhiteDesc": "Blanc Pur · Lumineux et Net",
    "topbar.themePearlOffice": "Bureau Perle",
    "topbar.themePearlOfficeDesc": "Gris Neutre · Bureau Lumineux",
  },
};

// ═══════════════════════════════════════════════════════════
// root_pageTitle fixes for vi
// ═══════════════════════════════════════════════════════════
const rootPageTitleFixes = {
  vi: {
    root_pageTitle_marketing: "Hiệu suất quảng cáo",
    root_pageTitle_aiPolicy: "Chính sách AI",
    root_pageTitle_approvals: "Quản lý phê duyệt",
    root_pageTitle_writeback: "Ghi ngược tự động",
    root_pageTitle_onboarding: "Hướng dẫn bắt đầu",
    root_pageTitle_integrationHub: "Trung tâm tích hợp",
    root_pageTitle_mappingRegistry: "Đăng ký ánh xạ",
    root_pageTitle_settlements: "Quản lý thanh toán kênh",
    root_pageTitle_audit: "Nhật ký kiểm toán",
    root_pageTitle_reconciliation: "Đối soát",
  },
};

function processLocaleFile(langCode) {
  const filePath = path.join(LOCALES_DIR, `${langCode}.js`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭  ${langCode}.js not found, skipping`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse: strip "export default " and trailing semicolons
  const jsonStr = content.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  let obj;
  try {
    obj = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`  ❌ Parse error for ${langCode}.js:`, e.message);
    return;
  }

  let changed = false;

  // 1. Fix gNav keys
  if (gNavFixes[langCode]) {
    if (!obj.gNav) obj.gNav = {};
    for (const [key, val] of Object.entries(gNavFixes[langCode])) {
      if (obj.gNav[key] !== val) {
        console.log(`  🔧 gNav.${key}: "${obj.gNav[key]}" → "${val}"`);
        obj.gNav[key] = val;
        changed = true;
      }
    }
  }

  // 2. Fix topbar keys
  if (topbarFixes[langCode]) {
    if (!obj.topbar) obj.topbar = {};
    for (const [key, val] of Object.entries(topbarFixes[langCode])) {
      if (obj.topbar[key] !== val) {
        console.log(`  🔧 topbar.${key}: "${obj.topbar[key]}" → "${val}"`);
        obj.topbar[key] = val;
        changed = true;
      }
    }
  }

  // 3. Add theme i18n keys (nested under topbar)
  if (themeI18nFixes[langCode]) {
    if (!obj.topbar) obj.topbar = {};
    for (const [fullKey, val] of Object.entries(themeI18nFixes[langCode])) {
      const shortKey = fullKey.replace('topbar.', '');
      if (obj.topbar[shortKey] !== val) {
        console.log(`  🎨 topbar.${shortKey}: "${obj.topbar[shortKey] || '(missing)'}" → "${val}"`);
        obj.topbar[shortKey] = val;
        changed = true;
      }
    }
  }

  // 4. Fix root_pageTitle keys
  if (rootPageTitleFixes[langCode]) {
    for (const [key, val] of Object.entries(rootPageTitleFixes[langCode])) {
      if (obj[key] !== val) {
        console.log(`  📄 ${key}: "${obj[key]}" → "${val}"`);
        obj[key] = val;
        changed = true;
      }
    }
  }

  if (changed) {
    const out = 'export default ' + JSON.stringify(obj) + ';\n';
    fs.writeFileSync(filePath, out, 'utf-8');
    console.log(`  ✅ ${langCode}.js saved (${(out.length / 1024).toFixed(0)} KB)`);
  } else {
    console.log(`  ✨ ${langCode}.js — no changes needed`);
  }
}

// Process all locales that need theme i18n, but focus on vi first
console.log('\n═══════════════════════════════════════');
console.log('  Global Component i18n Fix');
console.log('═══════════════════════════════════════\n');

const ALL_LANGS = ['vi', 'ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'id', 'es', 'fr'];
for (const lang of ALL_LANGS) {
  console.log(`\n🌐 Processing ${lang}.js...`);
  processLocaleFile(lang);
}

console.log('\n✅ All locale files processed.\n');
