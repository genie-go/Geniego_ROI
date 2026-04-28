const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "tabGuide":"📖 가이드",
    "guideTitle":"채널 KPI 이용 가이드","guideSub":"비즈니스 목표 설정부터 채널별 KPI 모니터링, AI 분석까지 전체 워크플로우를 안내합니다.",
    "guideStepsTitle":"채널 KPI 관리 6단계",
    "guideStep1Title":"비즈니스 목표 설정","guideStep1Desc":"브랜드 인지도, 웹 트래픽, 전환 중 핵심 목표를 선택합니다.",
    "guideStep2Title":"채널 역할 정의","guideStep2Desc":"검색 광고, SNS, 블로그, 커뮤니티 각 채널의 역할과 핵심 KPI를 확인합니다.",
    "guideStep3Title":"KPI 목표 설정","guideStep3Desc":"채널별 CTR, 전환율, CPA, ROAS, CPC 목표값을 입력합니다.",
    "guideStep4Title":"실적 모니터링","guideStep4Desc":"SNS, 콘텐츠, 커뮤니티 각 채널의 실시간 성과를 확인합니다.",
    "guideStep5Title":"목표 달성도","guideStep5Desc":"설정한 목표 대비 실적을 게이지 바와 카드로 한눈에 파악합니다.",
    "guideStep6Title":"AI 분석","guideStep6Desc":"Claude AI가 채널별 성과를 분석하고 개선 권고를 제시합니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideGoalName":"목표 설정","guideGoalDesc":"비즈니스 핵심 목표를 선택하여 KPI 전략을 수립합니다.",
    "guideRoleName":"채널 역할","guideRoleDesc":"각 채널의 마케팅 역할과 핵심 지표를 정의합니다.",
    "guideSetupName":"KPI 설정","guideSetupDesc":"채널별 세부 KPI 목표값을 입력하고 관리합니다.",
    "guideSnsName":"SNS 성과","guideSnsDesc":"SNS 광고 채널별 도달, 참여, CTR, 동영상 조회를 분석합니다.",
    "guideContentName":"콘텐츠 성과","guideContentDesc":"블로그 페이지뷰, 방문자, 체류시간, 검색유입을 분석합니다.",
    "guideCommunityName":"커뮤니티 성과","guideCommunityDesc":"네이버 카페, 카카오 등 커뮤니티 활동 지표를 분석합니다.",
    "guideTargetName":"목표 달성","guideTargetDesc":"설정 목표 대비 실적을 게이지 바와 카드로 시각화합니다.",
    "guideMonitorName":"AI 모니터링","guideMonitorDesc":"Claude AI가 전체 채널 성과를 분석하고 개선 방향을 제시합니다.",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"비즈니스 목표를 먼저 설정해야 채널별 KPI가 의미를 가집니다.",
    "guideTip2":"채널 역할을 명확히 정의하면 중복 투자를 방지할 수 있습니다.",
    "guideTip3":"KPI 목표는 업종 평균과 과거 실적을 기반으로 설정하세요.",
    "guideTip4":"AI 분석을 주간/월간 정기적으로 실행하면 트렌드를 파악할 수 있습니다.",
    "guideTip5":"모든 데이터는 연동허브 API 기반 실시간 동기화됩니다.",
  },
  en: {
    "tabGuide":"📖 Guide",
    "guideTitle":"Channel KPI Guide","guideSub":"Complete workflow from business goal setting to channel KPI monitoring and AI analysis.",
    "guideStepsTitle":"6 Steps to Channel KPI Management",
    "guideStep1Title":"Set Business Goals","guideStep1Desc":"Select core objectives: brand awareness, web traffic, or conversions.",
    "guideStep2Title":"Define Channel Roles","guideStep2Desc":"Review each channel's role and core KPIs for Search, SNS, Blog, Community.",
    "guideStep3Title":"Set KPI Targets","guideStep3Desc":"Enter target values for CTR, Conv. Rate, CPA, ROAS, CPC per channel.",
    "guideStep4Title":"Monitor Performance","guideStep4Desc":"Track real-time performance across SNS, Content, and Community channels.",
    "guideStep5Title":"Achievement Tracking","guideStep5Desc":"View target vs actual with gauge bars and cards at a glance.",
    "guideStep6Title":"AI Analysis","guideStep6Desc":"Claude AI analyzes channel performance and provides improvement recommendations.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideGoalName":"Goal Setting","guideGoalDesc":"Select core business objectives to build KPI strategy.",
    "guideRoleName":"Channel Roles","guideRoleDesc":"Define marketing role and core metrics for each channel.",
    "guideSetupName":"KPI Setup","guideSetupDesc":"Enter and manage detailed KPI targets per channel.",
    "guideSnsName":"SNS Performance","guideSnsDesc":"Analyze reach, engagement, CTR, video views per SNS channel.",
    "guideContentName":"Content Performance","guideContentDesc":"Analyze blog page views, visitors, time on site, search traffic.",
    "guideCommunityName":"Community Performance","guideCommunityDesc":"Analyze community activity metrics from Naver Cafe, Kakao, etc.",
    "guideTargetName":"Target Achievement","guideTargetDesc":"Visualize target vs actual with gauge bars and cards.",
    "guideMonitorName":"AI Monitoring","guideMonitorDesc":"Claude AI analyzes overall channel performance and suggests improvements.",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Set business goals first to make channel KPIs meaningful.",
    "guideTip2":"Clearly defining channel roles prevents duplicate investment.",
    "guideTip3":"Set KPI targets based on industry averages and past performance.",
    "guideTip4":"Run AI analysis weekly/monthly to identify trends.",
    "guideTip5":"All data syncs in real-time via Integration Hub API keys.",
  },
  ja: {"tabGuide":"📖 ガイド","guideTitle":"チャネルKPIガイド","guideSub":"目標設定からAI分析まで","guideStepsTitle":"6ステップ","guideStep1Title":"目標設定","guideStep1Desc":"ビジネス目標を選択","guideStep2Title":"チャネル役割","guideStep2Desc":"各チャネルの役割を定義","guideStep3Title":"KPI設定","guideStep3Desc":"目標値を入力","guideStep4Title":"モニタリング","guideStep4Desc":"リアルタイム監視","guideStep5Title":"達成度","guideStep5Desc":"目標vs実績","guideStep6Title":"AI分析","guideStep6Desc":"Claude AIが分析","guideTabsTitle":"タブ説明","guideGoalName":"目標設定","guideGoalDesc":"ビジネス目標を選択","guideRoleName":"チャネル役割","guideRoleDesc":"役割と指標を定義","guideSetupName":"KPI設定","guideSetupDesc":"目標値を管理","guideSnsName":"SNS実績","guideSnsDesc":"SNS分析","guideContentName":"コンテンツ","guideContentDesc":"ブログ分析","guideCommunityName":"コミュニティ","guideCommunityDesc":"コミュニティ分析","guideTargetName":"達成度","guideTargetDesc":"目標vs実績","guideMonitorName":"AIモニタリング","guideMonitorDesc":"AI分析と改善","guideTipsTitle":"ヒント","guideTip1":"まず目標を設定","guideTip2":"チャネル役割を明確に","guideTip3":"業界平均を基準に","guideTip4":"AI分析を定期実行","guideTip5":"リアルタイム同期"},
  zh: {"tabGuide":"📖 指南","guideTitle":"渠道KPI指南","guideSub":"目标到AI分析","guideStepsTitle":"6步骤","guideStep1Title":"设定目标","guideStep1Desc":"选择核心目标","guideStep2Title":"渠道角色","guideStep2Desc":"定义角色","guideStep3Title":"KPI设定","guideStep3Desc":"输入目标值","guideStep4Title":"监控","guideStep4Desc":"实时监控","guideStep5Title":"达成度","guideStep5Desc":"目标vs实际","guideStep6Title":"AI分析","guideStep6Desc":"AI推荐","guideTabsTitle":"标签说明","guideGoalName":"目标","guideGoalDesc":"业务目标","guideRoleName":"渠道角色","guideRoleDesc":"角色定义","guideSetupName":"KPI设定","guideSetupDesc":"目标管理","guideSnsName":"SNS","guideSnsDesc":"SNS分析","guideContentName":"内容","guideContentDesc":"博客","guideCommunityName":"社区","guideCommunityDesc":"社区活动","guideTargetName":"达成度","guideTargetDesc":"可视化","guideMonitorName":"AI监控","guideMonitorDesc":"AI改善","guideTipsTitle":"技巧","guideTip1":"先设目标","guideTip2":"明确角色","guideTip3":"参考行业","guideTip4":"定期AI","guideTip5":"实时同步"},
  "zh-TW": {"tabGuide":"📖 指南","guideTitle":"頻道KPI指南","guideSub":"目標到AI","guideStepsTitle":"6步驟","guideStep1Title":"目標","guideStep1Desc":"選擇目標","guideStep2Title":"角色","guideStep2Desc":"定義","guideStep3Title":"KPI","guideStep3Desc":"目標值","guideStep4Title":"監控","guideStep4Desc":"即時","guideStep5Title":"達成","guideStep5Desc":"目標vs實際","guideStep6Title":"AI","guideStep6Desc":"分析","guideTabsTitle":"標籤","guideGoalName":"目標","guideGoalDesc":"業務","guideRoleName":"角色","guideRoleDesc":"定義","guideSetupName":"KPI","guideSetupDesc":"管理","guideSnsName":"SNS","guideSnsDesc":"分析","guideContentName":"內容","guideContentDesc":"部落格","guideCommunityName":"社區","guideCommunityDesc":"活動","guideTargetName":"達成","guideTargetDesc":"視覺化","guideMonitorName":"AI","guideMonitorDesc":"改善","guideTipsTitle":"技巧","guideTip1":"先設目標","guideTip2":"明確角色","guideTip3":"參考行業","guideTip4":"定期AI","guideTip5":"即時同步"},
  de: {"tabGuide":"📖 Anleitung","guideTitle":"Kanal-KPI-Anleitung","guideSub":"Workflow von Zielen bis AI","guideStepsTitle":"6 Schritte","guideStep1Title":"Ziele setzen","guideStep1Desc":"Geschäftsziele wählen","guideStep2Title":"Kanalrollen","guideStep2Desc":"Rollen definieren","guideStep3Title":"KPI-Setup","guideStep3Desc":"Zielwerte eingeben","guideStep4Title":"Monitoring","guideStep4Desc":"Echtzeit-Tracking","guideStep5Title":"Zielerreichung","guideStep5Desc":"Ziel vs Ist","guideStep6Title":"AI-Analyse","guideStep6Desc":"Claude AI analysiert","guideTabsTitle":"Tab-Guide","guideGoalName":"Ziele","guideGoalDesc":"Geschäftsziele","guideRoleName":"Kanalrollen","guideRoleDesc":"Rollen definieren","guideSetupName":"KPI-Setup","guideSetupDesc":"Zielwerte","guideSnsName":"SNS","guideSnsDesc":"SNS-Analyse","guideContentName":"Inhalte","guideContentDesc":"Blog-Analyse","guideCommunityName":"Community","guideCommunityDesc":"Aktivität","guideTargetName":"Erreichung","guideTargetDesc":"Visualisierung","guideMonitorName":"AI-Monitor","guideMonitorDesc":"AI-Verbesserungen","guideTipsTitle":"Tipps","guideTip1":"Zuerst Ziele setzen","guideTip2":"Kanalrollen klären","guideTip3":"Branchendurchschnitt","guideTip4":"AI regelmäßig","guideTip5":"Echtzeit-Sync"},
  th: {"tabGuide":"📖 คู่มือ","guideTitle":"คู่มือ KPI ช่องทาง","guideSub":"เป้าหมายถึง AI","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"ตั้งเป้า","guideStep1Desc":"เลือกเป้าหมาย","guideStep2Title":"บทบาท","guideStep2Desc":"กำหนดบทบาท","guideStep3Title":"ตั้ง KPI","guideStep3Desc":"ใส่เป้า","guideStep4Title":"ตรวจสอบ","guideStep4Desc":"เรียลไทม์","guideStep5Title":"ผลลัพธ์","guideStep5Desc":"เป้าvsจริง","guideStep6Title":"AI","guideStep6Desc":"วิเคราะห์","guideTabsTitle":"แท็บ","guideGoalName":"เป้าหมาย","guideGoalDesc":"ธุรกิจ","guideRoleName":"บทบาท","guideRoleDesc":"กำหนด","guideSetupName":"KPI","guideSetupDesc":"จัดการ","guideSnsName":"SNS","guideSnsDesc":"วิเคราะห์","guideContentName":"เนื้อหา","guideContentDesc":"บล็อก","guideCommunityName":"ชุมชน","guideCommunityDesc":"กิจกรรม","guideTargetName":"ผลลัพธ์","guideTargetDesc":"แสดงผล","guideMonitorName":"AI","guideMonitorDesc":"ปรับปรุง","guideTipsTitle":"เทคนิค","guideTip1":"ตั้งเป้าก่อน","guideTip2":"บทบาทชัดเจน","guideTip3":"อ้างอิงอุตสาหกรรม","guideTip4":"AI ประจำ","guideTip5":"ซิงค์เรียลไทม์"},
  vi: {"tabGuide":"📖 Hướng dẫn","guideTitle":"Hướng dẫn KPI kênh","guideSub":"Từ mục tiêu đến AI","guideStepsTitle":"6 bước","guideStep1Title":"Đặt mục tiêu","guideStep1Desc":"Chọn mục tiêu","guideStep2Title":"Vai trò kênh","guideStep2Desc":"Định nghĩa","guideStep3Title":"Đặt KPI","guideStep3Desc":"Nhập giá trị","guideStep4Title":"Theo dõi","guideStep4Desc":"Real-time","guideStep5Title":"Đạt mục tiêu","guideStep5Desc":"Mục tiêu vs thực tế","guideStep6Title":"AI","guideStep6Desc":"Phân tích","guideTabsTitle":"Tab","guideGoalName":"Mục tiêu","guideGoalDesc":"Mục tiêu kinh doanh","guideRoleName":"Vai trò","guideRoleDesc":"Định nghĩa","guideSetupName":"KPI","guideSetupDesc":"Quản lý","guideSnsName":"SNS","guideSnsDesc":"Phân tích","guideContentName":"Nội dung","guideContentDesc":"Blog","guideCommunityName":"Cộng đồng","guideCommunityDesc":"Hoạt động","guideTargetName":"Đạt","guideTargetDesc":"Trực quan","guideMonitorName":"AI","guideMonitorDesc":"Cải thiện","guideTipsTitle":"Mẹo","guideTip1":"Đặt mục tiêu trước","guideTip2":"Vai trò rõ ràng","guideTip3":"Tham khảo ngành","guideTip4":"AI định kỳ","guideTip5":"Đồng bộ real-time"},
  id: {"tabGuide":"📖 Panduan","guideTitle":"Panduan KPI Kanal","guideSub":"Tujuan sampai AI","guideStepsTitle":"6 Langkah","guideStep1Title":"Target bisnis","guideStep1Desc":"Pilih tujuan","guideStep2Title":"Peran kanal","guideStep2Desc":"Definisi","guideStep3Title":"Set KPI","guideStep3Desc":"Input target","guideStep4Title":"Monitor","guideStep4Desc":"Real-time","guideStep5Title":"Pencapaian","guideStep5Desc":"Target vs aktual","guideStep6Title":"AI","guideStep6Desc":"Analisis","guideTabsTitle":"Tab","guideGoalName":"Target","guideGoalDesc":"Bisnis","guideRoleName":"Peran","guideRoleDesc":"Definisi","guideSetupName":"KPI","guideSetupDesc":"Kelola","guideSnsName":"SNS","guideSnsDesc":"Analisis","guideContentName":"Konten","guideContentDesc":"Blog","guideCommunityName":"Komunitas","guideCommunityDesc":"Aktivitas","guideTargetName":"Pencapaian","guideTargetDesc":"Visualisasi","guideMonitorName":"AI","guideMonitorDesc":"Perbaikan","guideTipsTitle":"Tips","guideTip1":"Set target dulu","guideTip2":"Peran jelas","guideTip3":"Referensi industri","guideTip4":"AI berkala","guideTip5":"Sinkron real-time"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.channelKpiPage) obj.channelKpiPage = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.channelKpiPage, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] channelKpiPage guide: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 Channel KPI guide i18n complete!');
