const fs = require('fs');
const path = require('path');

const LOCALES_DIR = 'src/i18n/locales';

// 언어별 pricing 번역 (8개 언어)
const PRICING_TRANSLATIONS = {
  en: {
    badge: "Subscription Plans",
    heroTitle: "Geniego‑ROI Subscription Plans",
    heroDesc: "Marketing automation · E-commerce analytics · WMS · AI insights — all in one platform",
    heroSaving: "Up to",
    heroSavingBold: "85% cost savings vs. individual tools",
    currentPlanLabel: "Your Current Plan",
    cycleMonthly: "Monthly",
    cycleQuarterly: "3 Months",
    cycleSemiAnnual: "6 Months",
    cycleYearly: "Annual",
    btnFreeStart: "Start for Free",
    btnSubscribe: "Subscribe Now",
    btnCurrent: "✓ Current Plan",
    btnPaying: "Processing...",
    btnViewAll: "▾ View All Features",
    btnViewLess: "▴ View Less",
    acctSelect: "Select Account Count",
    registerSoon: "Pricing Coming Soon",
    freeForever: "Free Forever",
    totalLabel: " month total",
    compareBtnShow: "▾ View Detailed Feature Comparison",
    compareBtnHide: "▴ Hide Comparison",
    compareTitle: "📊 Plan Feature Comparison",
    compareFeature: "Feature",
    savingTitle: "💡 Individual Tools vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics combined monthly cost",
    savingDesc2: "Geniego‑ROI Pro subscription —",
    savingBold: "Up to 85% Cost Savings",
    faqTitle: "Frequently Asked Questions",
    faq1q: "Can I change my plan at any time?",
    faq1a: "Yes, you can upgrade or downgrade at any time. The difference is calculated on a pro-rata basis.",
    faq2q: "What does 'Account Count' mean?",
    faq2a: "Number of independent user accounts that can access simultaneously. Enterprise has unlimited accounts.",
    faq3q: "What is the refund policy if I cancel?",
    faq3a: "Monthly plans: 100% refund if canceled same day. Quarterly/Semi-annual/Annual: refund for remaining period.",
    faq4q: "What's the difference between Free and Paid plans?",
    faq4a: "Free is a demo plan with sample data. Real channel integration, live data, and AI automation are available from the Growth plan.",
    faq5q: "Why does pricing show 'Coming Soon'?",
    faq5a: "The pricing for that plan/cycle has not been set in the admin center yet. It will be updated soon.",
    faq6q: "How do I purchase the Enterprise plan?",
    faq6a: "Enterprise plans are customized. Please contact us at contact@genie-roi.com.",
    terms: "Terms of Service",
    termsNote: "By subscribing, you agree to our Terms of Service. All prices include VAT (VAT may apply separately).",
    loadingText: "Loading pricing information…",
    limitedFeat: "⚠ Features not available in this plan",
    pageTitle: "💳 Plans & Billing",
    pageSub: "Choose a plan, manage billing & subscription",
    currentPlan: "Current Plan", upgrade: "Upgrade", perMonth: "/ mo",
  },
  ja: {
    badge: "サブスクリプションプラン",
    heroTitle: "Geniego‑ROI サブスクリプションプラン",
    heroDesc: "マーケティング自動化 · EC分析 · WMS · AIインサイト — 全て1つのプラットフォームで",
    heroSaving: "最大",
    heroSavingBold: "85%のコスト削減",
    currentPlanLabel: "現在のプラン",
    cycleMonthly: "月次",
    cycleQuarterly: "3ヶ月",
    cycleSemiAnnual: "6ヶ月",
    cycleYearly: "年次",
    btnFreeStart: "無料で始める",
    btnSubscribe: "今すぐ登録",
    btnCurrent: "✓ 現在のプラン",
    btnPaying: "処理中...",
    btnViewAll: "▾ 全機能を見る",
    btnViewLess: "▴ 閉じる",
    acctSelect: "アカウント数を選択",
    registerSoon: "料金設定予定",
    freeForever: "無料（永続）",
    totalLabel: "ヶ月合計",
    compareBtnShow: "▾ 詳細機能比較表を見る",
    compareBtnHide: "▴ 比較表を隠す",
    compareTitle: "📊 プラン別機能比較",
    compareFeature: "機能",
    savingTitle: "💡 個別ツール合計 vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 月額合計",
    savingDesc2: "Geniego‑ROI Pro —",
    savingBold: "最大85%のコスト削減",
    faqTitle: "よくある質問",
    faq1q: "プランはいつでも変更できますか？",
    faq1a: "はい、いつでも上位・下位プランに変更できます。日割り計算で差額が調整されます。",
    faq2q: "アカウント数とは何ですか？",
    faq2a: "同時にアクセスできる独立したユーザーアカウントの数です。Enterpriseは無制限です。",
    faq3q: "解約時の返金ポリシーは？",
    faq3a: "月次：当日解約で100%返金。四半期・半年・年次：残り期間の比率で返金。",
    faq4q: "無料プランと有料プランの違いは？",
    faq4a: "無料はデモデータを使った体験プランです。実際のデータ連携・AI自動化はGrowtプラン以上で利用できます。",
    faq5q: "「登録予定」と表示される理由は？",
    faq5a: "管理センターでそのプラン・周期の料金がまだ設定されていません。まもなく更新されます。",
    faq6q: "Enterpriseプランの購入方法は？",
    faq6a: "Enterpriseは別途ご相談後にカスタム契約となります。contact@genie-roi.comまでお問い合わせください。",
    terms: "利用規約",
    termsNote: "登録により利用規約に同意したものとみなされます。全料金はVAT込みです（別途VATが発生する場合があります）。",
    loadingText: "料金情報を読み込み中…",
    limitedFeat: "⚠ このプランで制限される機能",
    pageTitle: "💳 プラン・請求",
    pageSub: "プランの選択・決済・サブスクリプション管理",
    currentPlan: "現在のプラン", upgrade: "アップグレード", perMonth: "/ 月",
  },
  zh: {
    badge: "订阅方案",
    heroTitle: "Geniego‑ROI 订阅方案",
    heroDesc: "营销自动化 · 电商分析 · WMS · AI洞察 — 全在一个平台",
    heroSaving: "最高节省",
    heroSavingBold: "85% 费用",
    currentPlanLabel: "当前方案",
    cycleMonthly: "月付", cycleQuarterly: "3个月", cycleSemiAnnual: "6个月", cycleYearly: "年付",
    btnFreeStart: "免费开始", btnSubscribe: "立即订阅", btnCurrent: "✓ 当前方案",
    btnPaying: "处理中...", btnViewAll: "▾ 查看全部功能", btnViewLess: "▴ 收起",
    acctSelect: "选择账户数量", registerSoon: "定价即将公布", freeForever: "永久免费",
    totalLabel: "个月合计",
    compareBtnShow: "▾ 查看详细功能对比", compareBtnHide: "▴ 隐藏对比",
    compareTitle: "📊 方案功能对比", compareFeature: "功能",
    savingTitle: "💡 单独工具 vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 月费合计",
    savingDesc2: "Geniego‑ROI Pro —", savingBold: "最高节省85%费用",
    faqTitle: "常见问题",
    faq1q: "可以随时更改方案吗？", faq1a: "是的，随时可以升级或降级。差额按日计算。",
    faq2q: "账户数量是什么意思？", faq2a: "同时可访问的独立用户账户数。Enterprise无限制。",
    faq3q: "取消订阅的退款政策？", faq3a: "月付：当天取消全额退款。季付/半年/年付：按剩余期限比例退款。",
    faq4q: "免费与付费方案的区别？", faq4a: "免费是演示数据体验方案。实际数据连接、AI自动化需要Growth方案以上。",
    faq5q: "为什么显示'即将公布'？", faq5a: "该方案/周期的定价尚未在管理中心设置，即将更新。",
    faq6q: "如何购买Enterprise方案？", faq6a: "Enterprise需单独咨询。请联系 contact@genie-roi.com。",
    terms: "服务条款", termsNote: "订阅即表示同意服务条款。所有价格含VAT（可能另收VAT）。",
    loadingText: "正在加载定价信息…", limitedFeat: "⚠ 此方案中受限的功能",
    pageTitle: "💳 方案与账单", pageSub: "选择方案·支付·订阅管理",
    currentPlan: "当前方案", upgrade: "升级", perMonth: "/ 月",
  },
  de: {
    badge: "Abonnementpläne",
    heroTitle: "Geniego‑ROI Abonnementpläne",
    heroDesc: "Marketing-Automatisierung · E-Commerce-Analyse · WMS · KI-Einblicke — alles auf einer Plattform",
    heroSaving: "Bis zu",
    heroSavingBold: "85% Kosteneinsparung",
    currentPlanLabel: "Aktueller Plan",
    cycleMonthly: "Monatlich", cycleQuarterly: "3 Monate", cycleSemiAnnual: "6 Monate", cycleYearly: "Jährlich",
    btnFreeStart: "Kostenlos starten", btnSubscribe: "Jetzt abonnieren", btnCurrent: "✓ Aktueller Plan",
    btnPaying: "Wird verarbeitet...", btnViewAll: "▾ Alle Funktionen ansehen", btnViewLess: "▴ Weniger anzeigen",
    acctSelect: "Kontoanzahl wählen", registerSoon: "Preis folgt bald", freeForever: "Dauerhaft kostenlos",
    totalLabel: " Monate gesamt",
    compareBtnShow: "▾ Detaillierten Vergleich anzeigen", compareBtnHide: "▴ Vergleich ausblenden",
    compareTitle: "📊 Planvergleich", compareFeature: "Funktion",
    savingTitle: "💡 Einzelne Tools vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics monatlich",
    savingDesc2: "Geniego‑ROI Pro —", savingBold: "Bis zu 85% Kosteneinsparung",
    faqTitle: "Häufig gestellte Fragen",
    faq1q: "Kann ich meinen Plan jederzeit ändern?", faq1a: "Ja, jederzeit. Die Differenz wird anteilig berechnet.",
    faq2q: "Was bedeutet 'Kontoanzahl'?", faq2a: "Anzahl unabhängiger Nutzerkonten. Enterprise ist unbegrenzt.",
    faq3q: "Was passiert bei Kündigung?", faq3a: "Monatlich: 100% Erstattung am selben Tag. Quartal/Halbjahr/Jährlich: anteilige Erstattung.",
    faq4q: "Unterschied Free vs. bezahlte Pläne?", faq4a: "Free ist ein Demo-Plan mit Beispieldaten. Echte Daten und KI-Automatisierung ab Growth-Plan.",
    faq5q: "Warum wird 'Preis folgt' angezeigt?", faq5a: "Der Preis für diesen Plan wurde noch nicht im Admin-Center gesetzt.",
    faq6q: "Wie kaufe ich den Enterprise-Plan?", faq6a: "Enterprise ist individuell. Kontaktieren Sie uns: contact@genie-roi.com.",
    terms: "Nutzungsbedingungen", termsNote: "Mit dem Abonnieren stimmen Sie den Nutzungsbedingungen zu. Alle Preise inkl. MwSt.",
    loadingText: "Preise werden geladen…", limitedFeat: "⚠ In diesem Plan nicht verfügbare Funktionen",
    pageTitle: "💳 Pläne & Abrechnung", pageSub: "Plan wählen · Zahlung · Abonnementverwaltung",
    currentPlan: "Aktueller Plan", upgrade: "Upgrade", perMonth: "/ Mo.",
  },
  th: {
    badge: "แผนการสมัครสมาชิก",
    heroTitle: "แผนการสมัครสมาชิก Geniego‑ROI",
    heroDesc: "การตลาดอัตโนมัติ · วิเคราะห์อีคอมเมิร์ซ · WMS · ข้อมูลเชิงลึก AI — ทุกอย่างในแพลตฟอร์มเดียว",
    heroSaving: "ประหยัดสูงสุด",
    heroSavingBold: "85% เมื่อเทียบกับเครื่องมือแยก",
    currentPlanLabel: "แผนปัจจุบัน",
    cycleMonthly: "รายเดือน", cycleQuarterly: "3 เดือน", cycleSemiAnnual: "6 เดือน", cycleYearly: "รายปี",
    btnFreeStart: "เริ่มต้นฟรี", btnSubscribe: "สมัครเลย", btnCurrent: "✓ แผนปัจจุบัน",
    btnPaying: "กำลังดำเนินการ...", btnViewAll: "▾ ดูฟีเจอร์ทั้งหมด", btnViewLess: "▴ ย่อ",
    acctSelect: "เลือกจำนวนบัญชี", registerSoon: "กำลังกำหนดราคา", freeForever: "ฟรีตลอดกาล",
    totalLabel: " เดือน รวม",
    compareBtnShow: "▾ ดูตารางเปรียบเทียบ", compareBtnHide: "▴ ซ่อนตาราง",
    compareTitle: "📊 เปรียบเทียบแผน", compareFeature: "ฟีเจอร์",
    savingTitle: "💡 เครื่องมือแยก vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics รวมรายเดือน",
    savingDesc2: "Geniego‑ROI Pro —", savingBold: "ประหยัดสูงสุด 85%",
    faqTitle: "คำถามที่พบบ่อย",
    faq1q: "เปลี่ยนแผนได้เมื่อไหร่?", faq1a: "ได้ตลอดเวลา คำนวณตามสัดส่วนวัน",
    faq2q: "จำนวนบัญชีคืออะไร?", faq2a: "จำนวนบัญชีผู้ใช้อิสระที่เข้าถึงพร้อมกันได้ Enterprise ไม่จำกัด",
    faq3q: "นโยบายคืนเงินเมื่อยกเลิก?", faq3a: "รายเดือน: คืน 100% วันเดียวกัน รายไตรมาส/ครึ่งปี/ปี: คืนตามสัดส่วน",
    faq4q: "ต่างกันอย่างไรระหว่างฟรีกับชำระเงิน?", faq4a: "ฟรีเป็นแผนทดลองใช้ข้อมูลตัวอย่าง ข้อมูลจริงและ AI อัตโนมัติต้องใช้แผน Growth ขึ้นไป",
    faq5q: "ทำไมแสดง 'กำลังกำหนดราคา'?", faq5a: "ยังไม่ได้กำหนดราคาในศูนย์ผู้ดูแล จะอัปเดตเร็วๆ นี้",
    faq6q: "ซื้อแผน Enterprise ได้อย่างไร?", faq6a: "Enterprise ต้องปรึกษาแยกต่างหาก ติดต่อ contact@genie-roi.com",
    terms: "ข้อกำหนดการใช้งาน", termsNote: "การสมัครถือว่าตกลงตามข้อกำหนดการใช้งาน ราคาทั้งหมดรวม VAT",
    loadingText: "กำลังโหลดข้อมูลราคา…", limitedFeat: "⚠ ฟีเจอร์ที่ไม่พร้อมใช้งานในแผนนี้",
    pageTitle: "💳 แผนและการเรียกเก็บเงิน", pageSub: "เลือกแผน · ชำระเงิน · จัดการสมาชิก",
    currentPlan: "แผนปัจจุบัน", upgrade: "อัปเกรด", perMonth: "/ เดือน",
  },
  vi: {
    badge: "Gói Đăng Ký",
    heroTitle: "Gói Đăng Ký Geniego‑ROI",
    heroDesc: "Tự động hóa marketing · Phân tích thương mại điện tử · WMS · AI insights — tất cả trên một nền tảng",
    heroSaving: "Tiết kiệm đến",
    heroSavingBold: "85% chi phí",
    currentPlanLabel: "Gói hiện tại",
    cycleMonthly: "Hàng tháng", cycleQuarterly: "3 tháng", cycleSemiAnnual: "6 tháng", cycleYearly: "Hàng năm",
    btnFreeStart: "Bắt đầu miễn phí", btnSubscribe: "Đăng ký ngay", btnCurrent: "✓ Gói hiện tại",
    btnPaying: "Đang xử lý...", btnViewAll: "▾ Xem tất cả tính năng", btnViewLess: "▴ Thu gọn",
    acctSelect: "Chọn số tài khoản", registerSoon: "Sắp có giá", freeForever: "Miễn phí mãi mãi",
    totalLabel: " tháng tổng cộng",
    compareBtnShow: "▾ Xem so sánh chi tiết", compareBtnHide: "▴ Ẩn so sánh",
    compareTitle: "📊 So sánh gói", compareFeature: "Tính năng",
    savingTitle: "💡 Công cụ riêng lẻ vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics hàng tháng",
    savingDesc2: "Geniego‑ROI Pro —", savingBold: "Tiết kiệm đến 85% chi phí",
    faqTitle: "Câu hỏi thường gặp",
    faq1q: "Tôi có thể thay đổi gói bất cứ lúc nào không?", faq1a: "Có, bạn có thể nâng cấp hoặc hạ cấp bất cứ lúc nào. Chênh lệch được tính theo ngày.",
    faq2q: "Số tài khoản nghĩa là gì?", faq2a: "Số tài khoản người dùng độc lập có thể truy cập đồng thời. Enterprise không giới hạn.",
    faq3q: "Chính sách hoàn tiền khi hủy?", faq3a: "Hàng tháng: hoàn 100% nếu hủy cùng ngày. Quý/Nửa năm/Năm: hoàn theo tỷ lệ thời gian còn lại.",
    faq4q: "Sự khác biệt giữa Free và gói trả phí?", faq4a: "Free là gói trải nghiệm với dữ liệu mẫu. Dữ liệu thực và AI tự động hóa từ gói Growth trở lên.",
    faq5q: "Tại sao hiện 'Sắp có giá'?", faq5a: "Giá cho gói/chu kỳ này chưa được thiết lập. Sẽ cập nhật sớm.",
    faq6q: "Mua gói Enterprise như thế nào?", faq6a: "Enterprise cần tư vấn riêng. Liên hệ contact@genie-roi.com.",
    terms: "Điều khoản dịch vụ", termsNote: "Khi đăng ký, bạn đồng ý với Điều khoản dịch vụ. Giá đã bao gồm VAT.",
    loadingText: "Đang tải thông tin giá…", limitedFeat: "⚠ Tính năng không có trong gói này",
    pageTitle: "💳 Gói & Thanh toán", pageSub: "Chọn gói · Thanh toán · Quản lý đăng ký",
    currentPlan: "Gói hiện tại", upgrade: "Nâng cấp", perMonth: "/ tháng",
  },
  id: {
    badge: "Paket Langganan",
    heroTitle: "Paket Langganan Geniego‑ROI",
    heroDesc: "Otomatisasi pemasaran · Analitik e-commerce · WMS · Wawasan AI — semua dalam satu platform",
    heroSaving: "Hemat hingga",
    heroSavingBold: "85% biaya",
    currentPlanLabel: "Paket saat ini",
    cycleMonthly: "Bulanan", cycleQuarterly: "3 Bulan", cycleSemiAnnual: "6 Bulan", cycleYearly: "Tahunan",
    btnFreeStart: "Mulai Gratis", btnSubscribe: "Berlangganan Sekarang", btnCurrent: "✓ Paket saat ini",
    btnPaying: "Memproses...", btnViewAll: "▾ Lihat Semua Fitur", btnViewLess: "▴ Tutup",
    acctSelect: "Pilih Jumlah Akun", registerSoon: "Harga segera", freeForever: "Gratis Selamanya",
    totalLabel: " bulan total",
    compareBtnShow: "▾ Lihat Perbandingan Detail", compareBtnHide: "▴ Sembunyikan",
    compareTitle: "📊 Perbandingan Paket", compareFeature: "Fitur",
    savingTitle: "💡 Alat Individual vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics bulanan",
    savingDesc2: "Geniego‑ROI Pro —", savingBold: "Hemat hingga 85%",
    faqTitle: "Pertanyaan Umum",
    faq1q: "Bisakah saya mengubah paket kapan saja?", faq1a: "Ya, kapan saja. Selisih dihitung secara proporsional.",
    faq2q: "Apa itu 'Jumlah Akun'?", faq2a: "Jumlah akun pengguna independen yang bisa mengakses bersamaan. Enterprise tidak terbatas.",
    faq3q: "Kebijakan pengembalian dana saat cancel?", faq3a: "Bulanan: 100% di hari yang sama. Triwulan/Setengah tahun/Tahunan: proporsional.",
    faq4q: "Perbedaan Free vs paket berbayar?", faq4a: "Free adalah paket demo dengan data sampel. Data nyata dan otomatisasi AI mulai paket Growth.",
    faq5q: "Mengapa tampil 'Harga segera'?", faq5a: "Harga untuk paket/siklus ini belum ditetapkan. Segera diperbarui.",
    faq6q: "Cara membeli paket Enterprise?", faq6a: "Enterprise perlu konsultasi terpisah. Hubungi contact@genie-roi.com.",
    terms: "Syarat Layanan", termsNote: "Dengan berlangganan, Anda menyetujui Syarat Layanan. Semua harga sudah termasuk PPN.",
    loadingText: "Memuat informasi harga…", limitedFeat: "⚠ Fitur yang tidak tersedia di paket ini",
    pageTitle: "💳 Paket & Penagihan", pageSub: "Pilih paket · Pembayaran · Manajemen langganan",
    currentPlan: "Paket saat ini", upgrade: "Upgrade", perMonth: "/ bln",
  },
  "zh-TW": {
    badge: "訂閱方案",
    heroTitle: "Geniego‑ROI 訂閱方案",
    heroDesc: "行銷自動化 · 電商分析 · WMS · AI洞察 — 全在一個平台",
    heroSaving: "最高節省",
    heroSavingBold: "85% 費用",
    currentPlanLabel: "目前方案",
    cycleMonthly: "月付", cycleQuarterly: "3個月", cycleSemiAnnual: "6個月", cycleYearly: "年付",
    btnFreeStart: "免費開始", btnSubscribe: "立即訂閱", btnCurrent: "✓ 目前方案",
    btnPaying: "處理中...", btnViewAll: "▾ 查看所有功能", btnViewLess: "▴ 收起",
    acctSelect: "選擇帳戶數量", registerSoon: "定價即將公布", freeForever: "永久免費",
    totalLabel: "個月合計",
    compareBtnShow: "▾ 查看詳細功能對比", compareBtnHide: "▴ 隱藏對比",
    compareTitle: "📊 方案功能對比", compareFeature: "功能",
    savingTitle: "💡 個別工具 vs. Geniego‑ROI",
    savingDesc: "HubSpot Pro + Klaviyo + Shopify WMS + Supermetrics 月費合計",
    savingDesc2: "Geniego‑ROI Pro —", savingBold: "最高節省85%費用",
    faqTitle: "常見問題",
    faq1q: "可以隨時更改方案嗎？", faq1a: "可以，隨時升降級。差額按日計算。",
    faq2q: "帳戶數量是什麼意思？", faq2a: "可同時存取的獨立用戶帳戶數。Enterprise無限制。",
    faq3q: "取消訂閱的退款政策？", faq3a: "月付：當天取消全額退款。季付/半年/年付：按剩餘期限比例退款。",
    faq4q: "免費與付費方案的區別？", faq4a: "免費是示範資料體驗方案。實際資料連接、AI自動化需要Growth方案以上。",
    faq5q: "為什麼顯示「即將公布」？", faq5a: "該方案/週期的定價尚未在管理中心設置，即將更新。",
    faq6q: "如何購買Enterprise方案？", faq6a: "Enterprise需單獨諮詢。請聯繫 contact@genie-roi.com。",
    terms: "服務條款", termsNote: "訂閱即表示同意服務條款。所有價格含VAT。",
    loadingText: "正在載入定價資訊…", limitedFeat: "⚠ 此方案中受限的功能",
    pageTitle: "💳 方案與帳單", pageSub: "選擇方案·支付·訂閱管理",
    currentPlan: "目前方案", upgrade: "升級", perMonth: "/ 月",
  },
};

let successCount = 0;
let failCount = 0;

Object.entries(PRICING_TRANSLATIONS).forEach(([lang, pricingObj]) => {
  const filePath = path.join(LOCALES_DIR, lang === 'zh-TW' ? 'zh-TW.js' : `${lang}.js`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${filePath}`);
    failCount++;
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if pricing section already exists in this file
  if (content.includes('.pricing =') || content.includes('.pricing={')) {
    // Already has pricing section - need to add new keys
    // Find the pricing section and check if cycleMonthly exists
    if (content.includes('cycleMonthly')) {
      console.log(`⏭ ${lang}.js already has cycleMonthly, skipping`);
      return;
    }
    
    // Add new keys to existing pricing section
    const pricingKeys = Object.entries(pricingObj)
      .filter(([k]) => !['pageTitle','pageSub','currentPlan','upgrade','perMonth'].includes(k));
    
    const newKeysStr = pricingKeys.map(([k,v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`).join('\n');
    
    // Find the closing }; of pricing
    const pricingIdx = content.indexOf('.pricing =');
    if (pricingIdx >= 0) {
      const closingIdx = content.indexOf('};', pricingIdx);
      if (closingIdx >= 0) {
        content = content.slice(0, closingIdx) + newKeysStr + '\n' + content.slice(closingIdx);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${lang}.js with ${pricingKeys.length} new pricing keys`);
        successCount++;
        return;
      }
    }
  }
  
  // Add new pricing section at the end
  const pricingStr = `\n// ── Pricing Page i18n (added by script) ──────────────────────────────────────\nconst _${lang.replace('-','_')}Locale = typeof ${lang.replace('-','_')} !== 'undefined' ? ${lang.replace('-','_')} : (typeof ko !== 'undefined' ? ko : {});\n_${lang.replace('-','_')}Locale.pricing = Object.assign(_${lang.replace('-','_')}Locale.pricing || {}, {\n${Object.entries(pricingObj).map(([k,v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`).join('\n')}\n});\n`;
  
  // Try to find the locale variable name
  const varMatch = content.match(/^(?:const|let|var)\s+([a-z_]+)\s*=/m);
  const varName = varMatch ? varMatch[1] : null;
  
  if (varName) {
    const appendStr = `\n// ── Pricing Page i18n ──────────────────────────────────────────────────────────\n${varName}.pricing = Object.assign(${varName}.pricing || {}, {\n${Object.entries(pricingObj).map(([k,v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`).join('\n')}\n});\n`;
    content += appendStr;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Added pricing section to ${lang}.js (var: ${varName})`);
    successCount++;
  } else {
    console.log(`⚠ Could not find variable name in ${lang}.js`);
    failCount++;
  }
});

console.log(`\nDone: ${successCount} success, ${failCount} fail`);
