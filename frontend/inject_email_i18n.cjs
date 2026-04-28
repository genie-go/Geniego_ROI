const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "tabGuide":"📖 가이드",
    "guideTitle":"이메일 마케팅 이용 가이드","guideSub":"이메일 캠페인 생성부터 템플릿 관리, 성과 분석, 발송 설정까지 전체 워크플로우를 안내합니다.",
    "guideStepsTitle":"이메일 마케팅 6단계",
    "guideStep1Title":"발송 설정","guideStep1Desc":"SMTP 또는 AWS SES 프로바이더를 설정하고 발신 이메일을 등록합니다.",
    "guideStep2Title":"템플릿 생성","guideStep2Desc":"캠페인에 사용할 HTML 이메일 템플릿을 카테고리별로 생성합니다.",
    "guideStep3Title":"캠페인 생성","guideStep3Desc":"템플릿과 대상 세그먼트를 선택하여 이메일 캠페인을 생성합니다.",
    "guideStep4Title":"발송 실행","guideStep4Desc":"생성된 캠페인을 대상 세그먼트에 일괄 발송합니다.",
    "guideStep5Title":"성과 분석","guideStep5Desc":"오픈율, 클릭률, 전달률 등 캠페인 성과를 실시간 분석합니다.",
    "guideStep6Title":"최적화","guideStep6Desc":"세그먼트별 성과를 비교하고 다음 캠페인 전략을 수립합니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideCampName":"캠페인 관리","guideCampDesc":"캠페인 생성, KPI 확인, 발송 관리를 합니다.",
    "guideTplName":"템플릿 관리","guideTplDesc":"HTML 이메일 템플릿을 카테고리별로 생성/편집합니다.",
    "guideAnalyticsName":"성과 분석","guideAnalyticsDesc":"오픈율, 클릭률, 전달률을 세그먼트별로 분석합니다.",
    "guideSetName":"발송 설정","guideSetDesc":"SMTP/SES 프로바이더, 발신 이메일을 설정합니다.",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"Mock 모드에서는 실제 발송 없이 캠페인 워크플로우를 테스트할 수 있습니다.",
    "guideTip2":"CRM 세그먼트를 활용하면 타겟팅 정밀도가 크게 향상됩니다.",
    "guideTip3":"제목 라인에 수신자 이름을 넣으면 오픈율이 평균 20% 증가합니다.",
    "guideTip4":"A/B 테스트를 위해 동일 세그먼트에 다른 템플릿으로 캠페인을 생성하세요.",
    "guideTip5":"모든 캠페인 데이터는 GlobalDataContext를 통해 실시간 동기화됩니다.",
  },
  en: {
    "tabGuide":"📖 Guide",
    "guideTitle":"Email Marketing Guide","guideSub":"Complete workflow from email campaign creation to template management, analytics, and send settings.",
    "guideStepsTitle":"6 Steps to Email Marketing",
    "guideStep1Title":"Send Settings","guideStep1Desc":"Configure SMTP or AWS SES provider and register sender email.",
    "guideStep2Title":"Create Templates","guideStep2Desc":"Create HTML email templates by category for campaigns.",
    "guideStep3Title":"Create Campaign","guideStep3Desc":"Select template and target segment to create an email campaign.",
    "guideStep4Title":"Execute Send","guideStep4Desc":"Send the created campaign to the target segment in bulk.",
    "guideStep5Title":"Analyze Performance","guideStep5Desc":"Analyze open rate, click rate, delivery rate in real-time.",
    "guideStep6Title":"Optimize","guideStep6Desc":"Compare segment performance and plan next campaign strategy.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideCampName":"Campaign Management","guideCampDesc":"Create campaigns, check KPIs, manage sending.",
    "guideTplName":"Template Management","guideTplDesc":"Create/edit HTML email templates by category.",
    "guideAnalyticsName":"Performance Analytics","guideAnalyticsDesc":"Analyze open, click, delivery rates by segment.",
    "guideSetName":"Send Settings","guideSetDesc":"Configure SMTP/SES provider and sender email.",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Mock mode lets you test campaign workflow without actual sending.",
    "guideTip2":"CRM segment integration significantly improves targeting precision.",
    "guideTip3":"Including recipient names in subject lines increases open rates by ~20%.",
    "guideTip4":"Create campaigns with different templates for the same segment for A/B testing.",
    "guideTip5":"All campaign data syncs in real-time via GlobalDataContext.",
  },
  ja: {"tabGuide":"📖 ガイド","guideTitle":"メールマーケティングガイド","guideSub":"キャンペーンからテンプレートまで","guideStepsTitle":"6ステップ","guideStep1Title":"送信設定","guideStep1Desc":"SMTP/SES設定","guideStep2Title":"テンプレート","guideStep2Desc":"HTML作成","guideStep3Title":"キャンペーン","guideStep3Desc":"作成","guideStep4Title":"送信","guideStep4Desc":"一括送信","guideStep5Title":"分析","guideStep5Desc":"開封率・クリック率","guideStep6Title":"最適化","guideStep6Desc":"戦略","guideTabsTitle":"タブ説明","guideCampName":"キャンペーン","guideCampDesc":"管理","guideTplName":"テンプレート","guideTplDesc":"作成・編集","guideAnalyticsName":"分析","guideAnalyticsDesc":"パフォーマンス","guideSetName":"設定","guideSetDesc":"プロバイダー","guideTipsTitle":"ヒント","guideTip1":"Mockモードで安全テスト","guideTip2":"CRMセグメント活用","guideTip3":"件名に名前で開封率UP","guideTip4":"A/Bテスト","guideTip5":"リアルタイム同期"},
  zh: {"tabGuide":"📖 指南","guideTitle":"邮件营销指南","guideSub":"从活动到模板","guideStepsTitle":"6步骤","guideStep1Title":"发送设置","guideStep1Desc":"SMTP/SES","guideStep2Title":"模板","guideStep2Desc":"HTML创建","guideStep3Title":"活动","guideStep3Desc":"创建","guideStep4Title":"发送","guideStep4Desc":"批量","guideStep5Title":"分析","guideStep5Desc":"打开率","guideStep6Title":"优化","guideStep6Desc":"策略","guideTabsTitle":"标签","guideCampName":"活动","guideCampDesc":"管理","guideTplName":"模板","guideTplDesc":"创建","guideAnalyticsName":"分析","guideAnalyticsDesc":"性能","guideSetName":"设置","guideSetDesc":"提供商","guideTipsTitle":"技巧","guideTip1":"Mock模式","guideTip2":"CRM细分","guideTip3":"主题行个性化","guideTip4":"A/B测试","guideTip5":"实时同步"},
  "zh-TW": {"tabGuide":"📖 指南","guideTitle":"郵件行銷指南","guideSub":"活動到範本","guideStepsTitle":"6步驟","guideStep1Title":"發送設定","guideStep1Desc":"SMTP/SES","guideStep2Title":"範本","guideStep2Desc":"HTML建立","guideStep3Title":"活動","guideStep3Desc":"建立","guideStep4Title":"發送","guideStep4Desc":"批量","guideStep5Title":"分析","guideStep5Desc":"開啟率","guideStep6Title":"優化","guideStep6Desc":"策略","guideTabsTitle":"標籤","guideCampName":"活動","guideCampDesc":"管理","guideTplName":"範本","guideTplDesc":"建立","guideAnalyticsName":"分析","guideAnalyticsDesc":"效能","guideSetName":"設定","guideSetDesc":"供應商","guideTipsTitle":"技巧","guideTip1":"Mock模式","guideTip2":"CRM區隔","guideTip3":"主旨個人化","guideTip4":"A/B測試","guideTip5":"即時同步"},
  de: {"tabGuide":"📖 Anleitung","guideTitle":"E-Mail-Marketing-Anleitung","guideSub":"Kampagne bis Vorlage","guideStepsTitle":"6 Schritte","guideStep1Title":"Einstellungen","guideStep1Desc":"SMTP/SES","guideStep2Title":"Vorlage","guideStep2Desc":"HTML erstellen","guideStep3Title":"Kampagne","guideStep3Desc":"Erstellen","guideStep4Title":"Versand","guideStep4Desc":"Massenversand","guideStep5Title":"Analyse","guideStep5Desc":"Öffnungsrate","guideStep6Title":"Optimierung","guideStep6Desc":"Strategie","guideTabsTitle":"Tab-Guide","guideCampName":"Kampagne","guideCampDesc":"Verwaltung","guideTplName":"Vorlage","guideTplDesc":"Erstellen","guideAnalyticsName":"Analyse","guideAnalyticsDesc":"Performance","guideSetName":"Einstellungen","guideSetDesc":"Anbieter","guideTipsTitle":"Tipps","guideTip1":"Mock-Modus","guideTip2":"CRM-Segmente","guideTip3":"Betreffzeile personalisieren","guideTip4":"A/B-Test","guideTip5":"Echtzeit-Sync"},
  th: {"tabGuide":"📖 คู่มือ","guideTitle":"คู่มืออีเมลมาร์เก็ตติ้ง","guideSub":"แคมเปญถึงเทมเพลต","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"ตั้งค่า","guideStep1Desc":"SMTP/SES","guideStep2Title":"เทมเพลต","guideStep2Desc":"สร้าง HTML","guideStep3Title":"แคมเปญ","guideStep3Desc":"สร้าง","guideStep4Title":"ส่ง","guideStep4Desc":"ส่งจำนวนมาก","guideStep5Title":"วิเคราะห์","guideStep5Desc":"อัตราเปิด","guideStep6Title":"ปรับปรุง","guideStep6Desc":"กลยุทธ์","guideTabsTitle":"แท็บ","guideCampName":"แคมเปญ","guideCampDesc":"จัดการ","guideTplName":"เทมเพลต","guideTplDesc":"สร้าง","guideAnalyticsName":"วิเคราะห์","guideAnalyticsDesc":"ประสิทธิภาพ","guideSetName":"ตั้งค่า","guideSetDesc":"ผู้ให้บริการ","guideTipsTitle":"เทคนิค","guideTip1":"โหมด Mock","guideTip2":"CRM เซกเมนต์","guideTip3":"หัวเรื่องส่วนตัว","guideTip4":"A/B ทดสอบ","guideTip5":"ซิงค์เรียลไทม์"},
  vi: {"tabGuide":"📖 Hướng dẫn","guideTitle":"Hướng dẫn Email","guideSub":"Từ chiến dịch đến mẫu","guideStepsTitle":"6 bước","guideStep1Title":"Cài đặt","guideStep1Desc":"SMTP/SES","guideStep2Title":"Mẫu","guideStep2Desc":"Tạo HTML","guideStep3Title":"Chiến dịch","guideStep3Desc":"Tạo","guideStep4Title":"Gửi","guideStep4Desc":"Gửi hàng loạt","guideStep5Title":"Phân tích","guideStep5Desc":"Tỷ lệ mở","guideStep6Title":"Tối ưu","guideStep6Desc":"Chiến lược","guideTabsTitle":"Tab","guideCampName":"Chiến dịch","guideCampDesc":"Quản lý","guideTplName":"Mẫu","guideTplDesc":"Tạo","guideAnalyticsName":"Phân tích","guideAnalyticsDesc":"Hiệu suất","guideSetName":"Cài đặt","guideSetDesc":"Nhà cung cấp","guideTipsTitle":"Mẹo","guideTip1":"Chế độ Mock","guideTip2":"CRM phân khúc","guideTip3":"Tiêu đề cá nhân","guideTip4":"A/B test","guideTip5":"Đồng bộ real-time"},
  id: {"tabGuide":"📖 Panduan","guideTitle":"Panduan Email Marketing","guideSub":"Kampanye hingga template","guideStepsTitle":"6 Langkah","guideStep1Title":"Pengaturan","guideStep1Desc":"SMTP/SES","guideStep2Title":"Template","guideStep2Desc":"Buat HTML","guideStep3Title":"Kampanye","guideStep3Desc":"Buat","guideStep4Title":"Kirim","guideStep4Desc":"Kirim massal","guideStep5Title":"Analisis","guideStep5Desc":"Rasio buka","guideStep6Title":"Optimasi","guideStep6Desc":"Strategi","guideTabsTitle":"Tab","guideCampName":"Kampanye","guideCampDesc":"Kelola","guideTplName":"Template","guideTplDesc":"Buat","guideAnalyticsName":"Analisis","guideAnalyticsDesc":"Performa","guideSetName":"Pengaturan","guideSetDesc":"Provider","guideTipsTitle":"Tips","guideTip1":"Mode Mock","guideTip2":"CRM segmen","guideTip3":"Subjek personal","guideTip4":"A/B test","guideTip5":"Sinkron real-time"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  // Email uses crm.email namespace
  if (!obj.crm) obj.crm = {};
  if (!obj.crm.email) obj.crm.email = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.crm.email, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] email guide: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 Email Marketing guide i18n complete!');
