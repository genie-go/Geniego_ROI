const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "tabGuide":"📖 가이드",
    "guideTitle":"고객 관리(CRM) 이용 가이드","guideSub":"주문 데이터 기반 고객 분류, AI 세그먼트, RFM 분석으로 고객 가치를 극대화하는 방법을 안내합니다.",
    "guideStepsTitle":"CRM 관리 6단계",
    "guideStep1Title":"고객 목록 확인","guideStep1Desc":"주문 히스토리 기반으로 자동 생성된 고객 목록과 LTV를 확인합니다.",
    "guideStep2Title":"RFM 분석","guideStep2Desc":"Champions, Loyal, At Risk, Lost, New 등급으로 고객을 자동 분류합니다.",
    "guideStep3Title":"AI 세그먼트","guideStep3Desc":"VIP Upsell, Churn Risk 등 AI가 자동 생성한 세그먼트를 활용합니다.",
    "guideStep4Title":"수동 세그먼트","guideStep4Desc":"커스텀 조건(LTV, 구매 횟수 등)으로 직접 세그먼트를 생성합니다.",
    "guideStep5Title":"마케팅 연결","guideStep5Desc":"세그먼트별 이메일, 카카오, 고객여정빌더와 연동합니다.",
    "guideStep6Title":"성과 추적","guideStep6Desc":"세그먼트 전환율과 LTV 변화를 실시간으로 추적합니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideCustName":"고객 목록","guideCustDesc":"주문 기반 자동 생성된 고객 정보, LTV, 등급을 관리합니다.",
    "guideAiName":"AI 세그먼트","guideAiDesc":"AI가 자동 발견한 VIP, 이탈 위험 등 핵심 세그먼트를 확인합니다.",
    "guideSegName":"수동 세그먼트","guideSegDesc":"LTV, 구매 횟수 등 커스텀 조건으로 세그먼트를 직접 생성합니다.",
    "guideRfmName":"RFM 분석","guideRfmDesc":"Recency/Frequency/Monetary 기반 고객 등급 분포를 분석합니다.",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"Champions 등급 고객에게 VIP 혜택을 제공하면 재구매율이 크게 향상됩니다.",
    "guideTip2":"At Risk 고객에게는 7일 이내 리텐션 캠페인을 발송하세요.",
    "guideTip3":"AI 세그먼트의 예측 매출을 기반으로 마케팅 우선순위를 결정하세요.",
    "guideTip4":"수동 세그먼트로 특정 조건의 고객군을 타겟팅할 수 있습니다.",
    "guideTip5":"모든 고객 데이터는 주문 히스토리 기반 실시간 동기화됩니다.",
  },
  en: {
    "tabGuide":"📖 Guide",
    "guideTitle":"CRM Guide","guideSub":"Maximize customer value with order-based segmentation, AI segments, and RFM analysis.",
    "guideStepsTitle":"6 Steps to CRM Management",
    "guideStep1Title":"Customer List","guideStep1Desc":"Review auto-generated customer list and LTV from order history.",
    "guideStep2Title":"RFM Analysis","guideStep2Desc":"Auto-classify customers into Champions, Loyal, At Risk, Lost, New grades.",
    "guideStep3Title":"AI Segments","guideStep3Desc":"Leverage AI-generated segments like VIP Upsell and Churn Risk.",
    "guideStep4Title":"Manual Segments","guideStep4Desc":"Create custom segments with conditions like LTV and purchase count.",
    "guideStep5Title":"Marketing Integration","guideStep5Desc":"Connect segments with Email, Kakao, and Journey Builder.",
    "guideStep6Title":"Performance Tracking","guideStep6Desc":"Track segment conversion rates and LTV changes in real-time.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideCustName":"Customer List","guideCustDesc":"Manage auto-generated customer info, LTV, and grades from orders.",
    "guideAiName":"AI Segments","guideAiDesc":"View AI-discovered key segments like VIP and churn risk.",
    "guideSegName":"Manual Segments","guideSegDesc":"Create segments with custom conditions like LTV and frequency.",
    "guideRfmName":"RFM Analysis","guideRfmDesc":"Analyze customer grade distribution based on Recency/Frequency/Monetary.",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Offering VIP perks to Champions significantly boosts repurchase rates.",
    "guideTip2":"Send retention campaigns to At Risk customers within 7 days.",
    "guideTip3":"Use AI segment predicted revenue to prioritize marketing efforts.",
    "guideTip4":"Manual segments let you target specific customer groups by conditions.",
    "guideTip5":"All customer data syncs in real-time from order history.",
  },
  ja: {"tabGuide":"📖 ガイド","guideTitle":"CRMガイド","guideSub":"顧客価値最大化","guideStepsTitle":"6ステップ","guideStep1Title":"顧客一覧","guideStep1Desc":"注文履歴から自動生成","guideStep2Title":"RFM分析","guideStep2Desc":"自動分類","guideStep3Title":"AIセグメント","guideStep3Desc":"AI自動生成","guideStep4Title":"手動セグメント","guideStep4Desc":"カスタム条件","guideStep5Title":"連携","guideStep5Desc":"マーケティング連携","guideStep6Title":"追跡","guideStep6Desc":"リアルタイム追跡","guideTabsTitle":"タブ説明","guideCustName":"顧客一覧","guideCustDesc":"LTVと等級管理","guideAiName":"AI","guideAiDesc":"自動セグメント","guideSegName":"手動","guideSegDesc":"カスタム条件","guideRfmName":"RFM","guideRfmDesc":"等級分布分析","guideTipsTitle":"ヒント","guideTip1":"Champions顧客にVIP特典","guideTip2":"At Risk顧客にリテンション","guideTip3":"AI予測ベースの優先度","guideTip4":"手動セグメントでターゲティング","guideTip5":"リアルタイム同期"},
  zh: {"tabGuide":"📖 指南","guideTitle":"CRM指南","guideSub":"客户价值最大化","guideStepsTitle":"6步骤","guideStep1Title":"客户列表","guideStep1Desc":"订单生成","guideStep2Title":"RFM","guideStep2Desc":"自动分类","guideStep3Title":"AI细分","guideStep3Desc":"AI生成","guideStep4Title":"手动细分","guideStep4Desc":"自定义","guideStep5Title":"集成","guideStep5Desc":"营销","guideStep6Title":"追踪","guideStep6Desc":"实时","guideTabsTitle":"标签","guideCustName":"客户","guideCustDesc":"LTV管理","guideAiName":"AI","guideAiDesc":"自动","guideSegName":"手动","guideSegDesc":"自定义","guideRfmName":"RFM","guideRfmDesc":"分布","guideTipsTitle":"技巧","guideTip1":"VIP优惠","guideTip2":"挽回风险客户","guideTip3":"AI预测","guideTip4":"手动细分","guideTip5":"实时同步"},
  "zh-TW": {"tabGuide":"📖 指南","guideTitle":"CRM指南","guideSub":"客戶價值","guideStepsTitle":"6步驟","guideStep1Title":"客戶","guideStep1Desc":"訂單","guideStep2Title":"RFM","guideStep2Desc":"分類","guideStep3Title":"AI","guideStep3Desc":"AI","guideStep4Title":"手動","guideStep4Desc":"自訂","guideStep5Title":"整合","guideStep5Desc":"行銷","guideStep6Title":"追蹤","guideStep6Desc":"即時","guideTabsTitle":"標籤","guideCustName":"客戶","guideCustDesc":"管理","guideAiName":"AI","guideAiDesc":"自動","guideSegName":"手動","guideSegDesc":"自訂","guideRfmName":"RFM","guideRfmDesc":"分佈","guideTipsTitle":"技巧","guideTip1":"VIP","guideTip2":"風險客戶","guideTip3":"AI預測","guideTip4":"手動","guideTip5":"即時"},
  de: {"tabGuide":"📖 Anleitung","guideTitle":"CRM-Anleitung","guideSub":"Kundenwert maximieren","guideStepsTitle":"6 Schritte","guideStep1Title":"Kundenliste","guideStep1Desc":"Aus Bestellungen","guideStep2Title":"RFM","guideStep2Desc":"Auto-Klassifizierung","guideStep3Title":"AI","guideStep3Desc":"AI-Segmente","guideStep4Title":"Manuell","guideStep4Desc":"Benutzerdefiniert","guideStep5Title":"Integration","guideStep5Desc":"Marketing","guideStep6Title":"Tracking","guideStep6Desc":"Echtzeit","guideTabsTitle":"Tab-Guide","guideCustName":"Kunden","guideCustDesc":"LTV-Verwaltung","guideAiName":"AI","guideAiDesc":"Auto-Segmente","guideSegName":"Manuell","guideSegDesc":"Benutzerdefiniert","guideRfmName":"RFM","guideRfmDesc":"Verteilung","guideTipsTitle":"Tipps","guideTip1":"VIP-Vorteile","guideTip2":"Risiko-Kunden","guideTip3":"AI-Prognose","guideTip4":"Manuelle Segmente","guideTip5":"Echtzeit-Sync"},
  th: {"tabGuide":"📖 คู่มือ","guideTitle":"คู่มือ CRM","guideSub":"เพิ่มมูลค่าลูกค้า","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"รายชื่อ","guideStep1Desc":"จากคำสั่งซื้อ","guideStep2Title":"RFM","guideStep2Desc":"จัดกลุ่มอัตโนมัติ","guideStep3Title":"AI","guideStep3Desc":"AI สร้าง","guideStep4Title":"กำหนดเอง","guideStep4Desc":"เงื่อนไข","guideStep5Title":"เชื่อมต่อ","guideStep5Desc":"การตลาด","guideStep6Title":"ติดตาม","guideStep6Desc":"เรียลไทม์","guideTabsTitle":"แท็บ","guideCustName":"ลูกค้า","guideCustDesc":"จัดการ","guideAiName":"AI","guideAiDesc":"อัตโนมัติ","guideSegName":"กำหนด","guideSegDesc":"เงื่อนไข","guideRfmName":"RFM","guideRfmDesc":"กระจาย","guideTipsTitle":"เทคนิค","guideTip1":"VIP สิทธิพิเศษ","guideTip2":"ลูกค้าเสี่ยง","guideTip3":"AI ทำนาย","guideTip4":"กำหนดเอง","guideTip5":"ซิงค์เรียลไทม์"},
  vi: {"tabGuide":"📖 Hướng dẫn","guideTitle":"Hướng dẫn CRM","guideSub":"Tối đa hóa giá trị","guideStepsTitle":"6 bước","guideStep1Title":"Danh sách","guideStep1Desc":"Từ đơn hàng","guideStep2Title":"RFM","guideStep2Desc":"Tự động phân loại","guideStep3Title":"AI","guideStep3Desc":"AI tạo","guideStep4Title":"Thủ công","guideStep4Desc":"Tùy chỉnh","guideStep5Title":"Tích hợp","guideStep5Desc":"Marketing","guideStep6Title":"Theo dõi","guideStep6Desc":"Real-time","guideTabsTitle":"Tab","guideCustName":"Khách hàng","guideCustDesc":"Quản lý","guideAiName":"AI","guideAiDesc":"Tự động","guideSegName":"Thủ công","guideSegDesc":"Tùy chỉnh","guideRfmName":"RFM","guideRfmDesc":"Phân bố","guideTipsTitle":"Mẹo","guideTip1":"VIP ưu đãi","guideTip2":"Khách rủi ro","guideTip3":"AI dự đoán","guideTip4":"Phân khúc thủ công","guideTip5":"Đồng bộ real-time"},
  id: {"tabGuide":"📖 Panduan","guideTitle":"Panduan CRM","guideSub":"Maksimalkan nilai pelanggan","guideStepsTitle":"6 Langkah","guideStep1Title":"Daftar","guideStep1Desc":"Dari pesanan","guideStep2Title":"RFM","guideStep2Desc":"Klasifikasi otomatis","guideStep3Title":"AI","guideStep3Desc":"AI buat","guideStep4Title":"Manual","guideStep4Desc":"Kustom","guideStep5Title":"Integrasi","guideStep5Desc":"Marketing","guideStep6Title":"Pelacakan","guideStep6Desc":"Real-time","guideTabsTitle":"Tab","guideCustName":"Pelanggan","guideCustDesc":"Kelola","guideAiName":"AI","guideAiDesc":"Otomatis","guideSegName":"Manual","guideSegDesc":"Kustom","guideRfmName":"RFM","guideRfmDesc":"Distribusi","guideTipsTitle":"Tips","guideTip1":"VIP benefit","guideTip2":"Pelanggan risiko","guideTip3":"Prediksi AI","guideTip4":"Segmen manual","guideTip5":"Sinkron real-time"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.crm) obj.crm = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.crm, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] crm guide: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 CRM guide i18n complete!');
