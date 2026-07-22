/* 187차 Phase2 — 공개 소개/운영진/연혁 페이지 chrome 15개국 사전.
   콘텐츠(회사명·운영진·연혁 내용)는 admin 한글 입력분을 그대로 표시. chrome 라벨만 현지화. */
const S = {
    navAbout:   { ko:"회사소개", en:"About", ja:"会社概要", zh:"公司介绍", "zh-TW":"公司介紹", vi:"Giới thiệu", th:"เกี่ยวกับเรา", id:"Tentang", de:"Über uns", fr:"À propos", es:"Acerca de", pt:"Sobre", ru:"О нас", ar:"من نحن", hi:"कंपनी" },
    navTeam:    { ko:"운영진", en:"Leadership", ja:"経営陣", zh:"管理团队", "zh-TW":"管理團隊", vi:"Ban lãnh đạo", th:"ทีมผู้บริหาร", id:"Tim", de:"Team", fr:"Équipe", es:"Equipo", pt:"Equipe", ru:"Команда", ar:"الفريق", hi:"नेतृत्व" },
    navProduct: { ko:"제품", en:"Product", ja:"製品", zh:"产品", "zh-TW":"產品", vi:"Sản phẩm", th:"ผลิตภัณฑ์", id:"Produk", de:"Produkt", fr:"Produit", es:"Producto", pt:"Produto", ru:"Продукт", ar:"المنتج", hi:"उत्पाद" },
    navHow:     { ko:"3단계로 시작", en:"Get Started", ja:"3ステップで開始", zh:"三步开始", "zh-TW":"三步開始", vi:"Bắt đầu 3 bước", th:"เริ่มใน 3 ขั้นตอน", id:"Mulai 3 Langkah", de:"In 3 Schritten", fr:"Démarrer en 3 étapes", es:"Empezar en 3 pasos", pt:"Começar em 3 passos", ru:"Старт за 3 шага", ar:"ابدأ بـ 3 خطوات", hi:"3 चरणों में शुरू" },
    navPricing: { ko:"요금제", en:"Pricing", ja:"料金プラン", zh:"定价", "zh-TW":"定價", vi:"Bảng giá", th:"ราคา", id:"Harga", de:"Preise", fr:"Tarifs", es:"Precios", pt:"Preços", ru:"Цены", ar:"الأسعار", hi:"मूल्य" },
    aboutTitle: { ko:"회사소개", en:"About Us", ja:"会社概要", zh:"关于我们", "zh-TW":"關於我們", vi:"Về chúng tôi", th:"เกี่ยวกับเรา", id:"Tentang Kami", de:"Über uns", fr:"À propos de nous", es:"Sobre nosotros", pt:"Sobre nós", ru:"О компании", ar:"من نحن", hi:"हमारे बारे में" },
    vision:     { ko:"비전", en:"Vision", ja:"ビジョン", zh:"愿景", "zh-TW":"願景", vi:"Tầm nhìn", th:"วิสัยทัศน์", id:"Visi", de:"Vision", fr:"Vision", es:"Visión", pt:"Visão", ru:"Видение", ar:"الرؤية", hi:"विज़न" },
    mission:    { ko:"미션", en:"Mission", ja:"ミッション", zh:"使命", "zh-TW":"使命", vi:"Sứ mệnh", th:"พันธกิจ", id:"Misi", de:"Mission", fr:"Mission", es:"Misión", pt:"Missão", ru:"Миссия", ar:"المهمة", hi:"मिशन" },
    founded:    { ko:"설립", en:"Founded", ja:"設立", zh:"成立", "zh-TW":"成立", vi:"Thành lập", th:"ก่อตั้ง", id:"Didirikan", de:"Gegründet", fr:"Fondée", es:"Fundada", pt:"Fundada", ru:"Основана", ar:"التأسيس", hi:"स्थापना" },
    ceo:        { ko:"대표", en:"CEO", ja:"代表", zh:"CEO", "zh-TW":"執行長", vi:"CEO", th:"CEO", id:"CEO", de:"CEO", fr:"PDG", es:"CEO", pt:"CEO", ru:"Гендиректор", ar:"الرئيس التنفيذي", hi:"CEO" },
    contact:    { ko:"연락처", en:"Contact", ja:"連絡先", zh:"联系方式", "zh-TW":"聯絡方式", vi:"Liên hệ", th:"ติดต่อ", id:"Kontak", de:"Kontakt", fr:"Contact", es:"Contacto", pt:"Contato", ru:"Контакты", ar:"التواصل", hi:"संपर्क" },
    address:    { ko:"주소", en:"Address", ja:"住所", zh:"地址", "zh-TW":"地址", vi:"Địa chỉ", th:"ที่อยู่", id:"Alamat", de:"Adresse", fr:"Adresse", es:"Dirección", pt:"Endereço", ru:"Адрес", ar:"العنوان", hi:"पता" },
    historyTitle:{ ko:"연혁", en:"Our Journey", ja:"沿革", zh:"发展历程", "zh-TW":"發展歷程", vi:"Hành trình", th:"เส้นทางของเรา", id:"Perjalanan Kami", de:"Unser Weg", fr:"Notre parcours", es:"Nuestra historia", pt:"Nossa trajetória", ru:"Наш путь", ar:"مسيرتنا", hi:"हमारी यात्रा" },
    teamTitle:  { ko:"운영진 소개", en:"Our Leadership", ja:"経営陣のご紹介", zh:"我们的管理团队", "zh-TW":"我們的管理團隊", vi:"Ban lãnh đạo", th:"ทีมผู้บริหารของเรา", id:"Kepemimpinan Kami", de:"Unser Führungsteam", fr:"Notre direction", es:"Nuestro liderazgo", pt:"Nossa liderança", ru:"Наше руководство", ar:"فريق قيادتنا", hi:"हमारा नेतृत्व" },
    teamSub:    { ko:"GeniegoROI를 이끄는 사람들", en:"The people building GeniegoROI", ja:"GeniegoROIを率いるメンバー", zh:"打造 GeniegoROI 的团队", "zh-TW":"打造 GeniegoROI 的團隊", vi:"Những người xây dựng GeniegoROI", th:"ผู้สร้าง GeniegoROI", id:"Orang-orang di balik GeniegoROI", de:"Die Köpfe hinter GeniegoROI", fr:"Les bâtisseurs de GeniegoROI", es:"Las personas detrás de GeniegoROI", pt:"As pessoas por trás da GeniegoROI", ru:"Создатели GeniegoROI", ar:"فريق بناء GeniegoROI", hi:"GeniegoROI बनाने वाले लोग" },
    empty:      { ko:"콘텐츠가 곧 업데이트됩니다.", en:"Content coming soon.", ja:"コンテンツは近日公開予定です。", zh:"内容即将更新。", "zh-TW":"內容即將更新。", vi:"Nội dung sắp ra mắt.", th:"เนื้อหากำลังจะมาเร็วๆ นี้", id:"Konten segera hadir.", de:"Inhalte folgen in Kürze.", fr:"Contenu bientôt disponible.", es:"Contenido próximamente.", pt:"Conteúdo em breve.", ru:"Контент скоро появится.", ar:"المحتوى قريبًا.", hi:"सामग्री जल्द ही आ रही है।" },
    backHome:   { ko:"← 홈으로", en:"← Home", ja:"← ホーム", zh:"← 首页", "zh-TW":"← 首頁", vi:"← Trang chủ", th:"← หน้าแรก", id:"← Beranda", de:"← Startseite", fr:"← Accueil", es:"← Inicio", pt:"← Início", ru:"← Главная", ar:"← الرئيسية", hi:"← होम" },
};

export function siteLang() {
    try { return localStorage.getItem("genie_roi_lang") || localStorage.getItem("landing_lang") || "en"; } catch { return "en"; }
}

// [239차+] 공개 페이지 언어 선택바 — 15개국 현지 자연어 라벨
export const SITE_LANGS = [
    { code: "ko", label: "한국어" }, { code: "en", label: "English" }, { code: "ja", label: "日本語" },
    { code: "zh", label: "简体中文" }, { code: "zh-TW", label: "繁體中文" }, { code: "vi", label: "Tiếng Việt" },
    { code: "th", label: "ไทย" }, { code: "id", label: "Bahasa Indonesia" }, { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" }, { code: "es", label: "Español" }, { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" }, { code: "ar", label: "العربية" }, { code: "hi", label: "हिन्दी" },
];

export function setSiteLang(lang) {
    try { localStorage.setItem("genie_roi_lang", lang); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
    try { window.dispatchEvent(new CustomEvent("genie-lang-change", { detail: { lang } })); } catch { /* 이벤트 디스패치 실패 무시 */ }
}
export function st(key, lang) {
    return S[key]?.[lang] || S[key]?.en || key;
}
export default S;
