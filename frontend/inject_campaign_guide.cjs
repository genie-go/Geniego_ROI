const fs = require('fs');
const path = require('path');
const LOCALES_DIR = path.join(__dirname, 'src/i18n/locales');
const LOCALE_FILES = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const guideKeys = {
  ko: {
    tabGuide:"이용 가이드",
    guideTitle:"캠페인 매니저 이용 가이드", guideSub:"캠페인 등록부터 성과 분석, 예산 관리, AI 카피라이팅까지 캠페인 관리의 모든 것을 안내합니다.",
    guideStepsTitle:"캠페인 관리 6단계",
    guideStep1Title:"캠페인 현황 확인", guideStep1Desc:"개요 탭에서 전체 캠페인의 상태, 예산 소진률, ROAS를 한눈에 확인합니다.",
    guideStep2Title:"상세 분석", guideStep2Desc:"캠페인을 클릭하면 채널별 소진, KPI 달성율, 인플루언서 정보를 확인할 수 있습니다.",
    guideStep3Title:"간트 차트 일정 관리", guideStep3Desc:"간트 탭에서 모든 캠페인의 일정을 시각적으로 관리합니다.",
    guideStep4Title:"ROI 분석", guideStep4Desc:"ROI 대시보드에서 캠페인별 ROAS 랭킹과 수익률을 비교합니다.",
    guideStep5Title:"예산 알림 관리", guideStep5Desc:"예산 알림 탭에서 소진율 70% 이상인 캠페인을 자동 감지하고 조치합니다.",
    guideStep6Title:"AI 카피라이팅", guideStep6Desc:"AI가 채널과 톤에 맞는 광고 카피를 자동 생성합니다.",
    guideTabsTitle:"탭별 상세 안내",
    guideTabOverviewName:"캠페인 개요", guideTabOverviewDesc:"전체 캠페인 목록, 상태 필터, KPI, 예산 소진률을 확인합니다.",
    guideTabAbName:"A/B 테스트", guideTabAbDesc:"이메일, Attribution A/B 테스트 결과와 승자/패자 분석을 확인합니다.",
    guideTabDetailName:"상세 분석", guideTabDetailDesc:"선택한 캠페인의 KPI, 채널별 예산 소진, 인플루언서 정보를 분석합니다.",
    guideTabGanttName:"간트 차트", guideTabGanttDesc:"캠페인 일정을 타임라인으로 시각화합니다.",
    guideTabCrmName:"CRM 채널", guideTabCrmDesc:"이메일, 카카오톡 캠페인 발송 현황과 오픈율을 모니터링합니다.",
    guideTabRoiName:"ROI 대시보드", guideTabRoiDesc:"캠페인별 ROAS 랭킹, 총 지출, 총 수익, 평균 CPA를 비교합니다.",
    guideTabMonitorName:"실시간 모니터", guideTabMonitorDesc:"활성 캠페인의 실시간 소진율, 일일 예산, 전환수를 추적합니다.",
    guideTabBudgetName:"예산 알림", guideTabBudgetDesc:"소진율 70% 이상인 캠페인을 자동 감지하여 3단계(주의/경고/위험) 알림을 제공합니다.",
    guideTabCopyName:"AI 카피라이터", guideTabCopyDesc:"채널, 톤, 프롬프트를 입력하면 AI가 광고 카피를 생성합니다.",
    guideTipsTitle:"유용한 팁",
    guideTip1:"개요 탭에서 'scheduled' 상태 캠페인을 바로 승인하여 활성화할 수 있습니다.",
    guideTip2:"AI 오토 마케팅에서 제출한 캠페인이 자동으로 여기에 연동됩니다.",
    guideTip3:"예산 소진율이 95%를 넘으면 자동 일시정지가 적용됩니다.",
    guideTip4:"ROI 대시보드에서 ROAS 3x 이상인 캠페인을 우선 확대하세요.",
    guideTip5:"AI 카피라이터는 연동허브에서 API 키를 등록한 채널에서 더 정확한 결과를 제공합니다.",
  },
  en: {
    tabGuide:"Guide",
    guideTitle:"Campaign Manager Guide", guideSub:"Learn how to manage campaigns from creation to performance analysis, budget management, and AI copywriting.",
    guideStepsTitle:"6 Steps to Manage Campaigns",
    guideStep1Title:"Check Campaign Status", guideStep1Desc:"View all campaign statuses, burn rates, and ROAS at a glance in the Overview tab.",
    guideStep2Title:"Detailed Analysis", guideStep2Desc:"Click a campaign to see channel spending, KPI achievement, and influencer details.",
    guideStep3Title:"Gantt Chart Scheduling", guideStep3Desc:"Manage campaign schedules visually in the Gantt tab.",
    guideStep4Title:"ROI Analysis", guideStep4Desc:"Compare ROAS rankings and profitability in the ROI Dashboard.",
    guideStep5Title:"Budget Alerts", guideStep5Desc:"Auto-detect campaigns with 70%+ burn rate in the Budget Alert tab.",
    guideStep6Title:"AI Copywriting", guideStep6Desc:"AI generates ad copy matching your channel and tone.",
    guideTabsTitle:"Tab-by-Tab Guide",
    guideTabOverviewName:"Campaign Overview", guideTabOverviewDesc:"View all campaigns, status filters, KPIs, and burn rates.",
    guideTabAbName:"A/B Testing", guideTabAbDesc:"View email and attribution A/B test results with winner analysis.",
    guideTabDetailName:"Detailed Analysis", guideTabDetailDesc:"Analyze selected campaign KPIs, channel spending, and influencer data.",
    guideTabGanttName:"Gantt Chart", guideTabGanttDesc:"Visualize campaign schedules on a timeline.",
    guideTabCrmName:"CRM Channels", guideTabCrmDesc:"Monitor email and KakaoTalk campaign delivery and open rates.",
    guideTabRoiName:"ROI Dashboard", guideTabRoiDesc:"Compare ROAS rankings, total spend, revenue, and average CPA.",
    guideTabMonitorName:"Real-time Monitor", guideTabMonitorDesc:"Track active campaign burn rates, daily budgets, and conversions live.",
    guideTabBudgetName:"Budget Alerts", guideTabBudgetDesc:"Auto-detect campaigns above 70% burn rate with 3-level alerts.",
    guideTabCopyName:"AI Copywriter", guideTabCopyDesc:"Enter channel, tone, and prompt for AI-generated ad copy.",
    guideTipsTitle:"Useful Tips",
    guideTip1:"Approve 'scheduled' campaigns directly from the Overview tab to activate instantly.",
    guideTip2:"Campaigns submitted from AI Auto Marketing auto-sync here.",
    guideTip3:"Campaigns exceeding 95% burn rate are auto-paused.",
    guideTip4:"Prioritize scaling campaigns with ROAS above 3x in the ROI Dashboard.",
    guideTip5:"AI Copywriter works best with API-connected channels from Integration Hub.",
  },
  ja: { tabGuide:"ガイド", guideTitle:"キャンペーンマネージャーガイド", guideSub:"キャンペーン管理のすべてをご案内します。", guideStepsTitle:"キャンペーン管理6ステップ", guideStep1Title:"現況確認", guideStep1Desc:"概要タブで全体を確認。", guideStep2Title:"詳細分析", guideStep2Desc:"キャンペーンクリックで詳細表示。", guideStep3Title:"ガントチャート", guideStep3Desc:"日程を視覚管理。", guideStep4Title:"ROI分析", guideStep4Desc:"ROASランキングを比較。", guideStep5Title:"予算アラート", guideStep5Desc:"消費率70%以上を自動検出。", guideStep6Title:"AIコピー", guideStep6Desc:"AIが広告コピーを生成。", guideTabsTitle:"タブ別ガイド", guideTabOverviewName:"概要", guideTabOverviewDesc:"全キャンペーン一覧。", guideTabAbName:"A/Bテスト", guideTabAbDesc:"テスト結果確認。", guideTabDetailName:"詳細", guideTabDetailDesc:"選択キャンペーン分析。", guideTabGanttName:"ガント", guideTabGanttDesc:"タイムライン表示。", guideTabCrmName:"CRM", guideTabCrmDesc:"メールとカカオトーク。", guideTabRoiName:"ROI", guideTabRoiDesc:"ROASランキング。", guideTabMonitorName:"モニター", guideTabMonitorDesc:"リアルタイム追跡。", guideTabBudgetName:"予算アラート", guideTabBudgetDesc:"消費率自動監視。", guideTabCopyName:"AIコピー", guideTabCopyDesc:"AI広告コピー生成。", guideTipsTitle:"ヒント", guideTip1:"概要から直接承認可能。", guideTip2:"AI連動キャンペーン自動同期。", guideTip3:"95%超で自動停止。", guideTip4:"ROAS 3x以上を拡大。", guideTip5:"API連携で精度向上。" },
  zh: { tabGuide:"指南", guideTitle:"活动管理器指南", guideSub:"从创建到分析的活动管理全流程。", guideStepsTitle:"管理6步", guideStep1Title:"查看概况", guideStep1Desc:"在概览中确认所有活动。", guideStep2Title:"详细分析", guideStep2Desc:"点击活动查看详情。", guideStep3Title:"甘特图", guideStep3Desc:"可视化管理日程。", guideStep4Title:"ROI分析", guideStep4Desc:"比较ROAS排名。", guideStep5Title:"预算警报", guideStep5Desc:"自动检测超70%消耗率。", guideStep6Title:"AI文案", guideStep6Desc:"AI生成广告文案。", guideTabsTitle:"标签说明", guideTabOverviewName:"概览", guideTabOverviewDesc:"全部活动列表。", guideTabAbName:"A/B测试", guideTabAbDesc:"测试结果。", guideTabDetailName:"详情", guideTabDetailDesc:"选中活动分析。", guideTabGanttName:"甘特图", guideTabGanttDesc:"时间线。", guideTabCrmName:"CRM", guideTabCrmDesc:"邮件和KakaoTalk。", guideTabRoiName:"ROI", guideTabRoiDesc:"ROAS排名。", guideTabMonitorName:"监控", guideTabMonitorDesc:"实时追踪。", guideTabBudgetName:"预算", guideTabBudgetDesc:"消耗率监控。", guideTabCopyName:"AI文案", guideTabCopyDesc:"AI广告文案。", guideTipsTitle:"技巧", guideTip1:"可直接审批。", guideTip2:"AI活动自动同步。", guideTip3:"95%自动暂停。", guideTip4:"优先扩展ROAS>3x。", guideTip5:"API连接提升精度。" },
  "zh-TW": { tabGuide:"指南", guideTitle:"活動管理器指南", guideSub:"活動管理全流程。", guideStepsTitle:"管理6步", guideStep1Title:"查看概況", guideStep1Desc:"確認所有活動。", guideStep2Title:"詳細分析", guideStep2Desc:"點擊查看。", guideStep3Title:"甘特圖", guideStep3Desc:"視覺化管理。", guideStep4Title:"ROI分析", guideStep4Desc:"比較ROAS。", guideStep5Title:"預算警報", guideStep5Desc:"偵測70%+消耗。", guideStep6Title:"AI文案", guideStep6Desc:"AI生成文案。", guideTabsTitle:"標籤說明", guideTabOverviewName:"概覽", guideTabOverviewDesc:"活動列表。", guideTabAbName:"A/B測試", guideTabAbDesc:"結果。", guideTabDetailName:"詳情", guideTabDetailDesc:"分析。", guideTabGanttName:"甘特圖", guideTabGanttDesc:"時間線。", guideTabCrmName:"CRM", guideTabCrmDesc:"郵件。", guideTabRoiName:"ROI", guideTabRoiDesc:"排名。", guideTabMonitorName:"監控", guideTabMonitorDesc:"即時追蹤。", guideTabBudgetName:"預算", guideTabBudgetDesc:"消耗監控。", guideTabCopyName:"AI文案", guideTabCopyDesc:"AI文案。", guideTipsTitle:"技巧", guideTip1:"直接審批。", guideTip2:"自動同步。", guideTip3:"95%暫停。", guideTip4:"擴展ROAS>3x。", guideTip5:"API提升精度。" },
  de: { tabGuide:"Anleitung", guideTitle:"Kampagnenmanager Anleitung", guideSub:"Kampagnenverwaltung von A bis Z.", guideStepsTitle:"6 Schritte", guideStep1Title:"Ubersicht", guideStep1Desc:"Alle Kampagnen prufen.", guideStep2Title:"Details", guideStep2Desc:"Kampagne anklicken.", guideStep3Title:"Gantt", guideStep3Desc:"Zeitplan verwalten.", guideStep4Title:"ROI", guideStep4Desc:"ROAS-Ranking.", guideStep5Title:"Budget-Alarm", guideStep5Desc:">70% Verbrauch erkennen.", guideStep6Title:"AI-Text", guideStep6Desc:"AI generiert Texte.", guideTabsTitle:"Tab-Guide", guideTabOverviewName:"Ubersicht", guideTabOverviewDesc:"Kampagnenliste.", guideTabAbName:"A/B-Test", guideTabAbDesc:"Ergebnisse.", guideTabDetailName:"Details", guideTabDetailDesc:"Analyse.", guideTabGanttName:"Gantt", guideTabGanttDesc:"Zeitplan.", guideTabCrmName:"CRM", guideTabCrmDesc:"E-Mail/Kakao.", guideTabRoiName:"ROI", guideTabRoiDesc:"Rankings.", guideTabMonitorName:"Monitor", guideTabMonitorDesc:"Live-Tracking.", guideTabBudgetName:"Budget", guideTabBudgetDesc:"Verbrauch.", guideTabCopyName:"AI-Text", guideTabCopyDesc:"AI-Texte.", guideTipsTitle:"Tipps", guideTip1:"Direkte Genehmigung.", guideTip2:"Auto-Sync.", guideTip3:"95% Pause.", guideTip4:"ROAS>3x skalieren.", guideTip5:"API verbessert Ergebnisse." },
  th: { tabGuide:"คู่มือ", guideTitle:"คู่มือตัวจัดการแคมเปญ", guideSub:"จัดการแคมเปญครบวงจร", guideStepsTitle:"6 ขั้นตอน", guideStep1Title:"ดูภาพรวม", guideStep1Desc:"ตรวจสอบทุกแคมเปญ", guideStep2Title:"วิเคราะห์", guideStep2Desc:"คลิกดูรายละเอียด", guideStep3Title:"แกนต์", guideStep3Desc:"จัดตาราง", guideStep4Title:"ROI", guideStep4Desc:"เปรียบเทียบ ROAS", guideStep5Title:"แจ้งเตือนงบ", guideStep5Desc:"ตรวจจับ>70%", guideStep6Title:"AI คอปี้", guideStep6Desc:"AI สร้างข้อความ", guideTabsTitle:"คำอธิบายแท็บ", guideTabOverviewName:"ภาพรวม", guideTabOverviewDesc:"รายการ", guideTabAbName:"A/B", guideTabAbDesc:"ผลทดสอบ", guideTabDetailName:"รายละเอียด", guideTabDetailDesc:"วิเคราะห์", guideTabGanttName:"แกนต์", guideTabGanttDesc:"ไทม์ไลน์", guideTabCrmName:"CRM", guideTabCrmDesc:"อีเมล/คาคาว", guideTabRoiName:"ROI", guideTabRoiDesc:"อันดับ", guideTabMonitorName:"มอนิเตอร์", guideTabMonitorDesc:"ติดตามสด", guideTabBudgetName:"งบ", guideTabBudgetDesc:"ตรวจจับ", guideTabCopyName:"AI คอปี้", guideTabCopyDesc:"สร้างข้อความ", guideTipsTitle:"เคล็ดลับ", guideTip1:"อนุมัติได้เลย", guideTip2:"ซิงค์อัตโนมัติ", guideTip3:"95%หยุดอัตโนมัติ", guideTip4:"ขยาย ROAS>3x", guideTip5:"API ช่วยแม่นยำ" },
  vi: { tabGuide:"Hướng dẫn", guideTitle:"Hướng dẫn Quản lý Chiến dịch", guideSub:"Quản lý chiến dịch từ A-Z.", guideStepsTitle:"6 bước", guideStep1Title:"Xem tổng quan", guideStep1Desc:"Kiểm tra tất cả.", guideStep2Title:"Phân tích", guideStep2Desc:"Nhấn để xem chi tiết.", guideStep3Title:"Gantt", guideStep3Desc:"Quản lý lịch.", guideStep4Title:"ROI", guideStep4Desc:"So sánh ROAS.", guideStep5Title:"Cảnh báo ngân sách", guideStep5Desc:"Phát hiện >70%.", guideStep6Title:"AI viết bài", guideStep6Desc:"AI tạo bản sao.", guideTabsTitle:"Hướng dẫn tab", guideTabOverviewName:"Tổng quan", guideTabOverviewDesc:"Danh sách.", guideTabAbName:"A/B", guideTabAbDesc:"Kết quả.", guideTabDetailName:"Chi tiết", guideTabDetailDesc:"Phân tích.", guideTabGanttName:"Gantt", guideTabGanttDesc:"Timeline.", guideTabCrmName:"CRM", guideTabCrmDesc:"Email/Kakao.", guideTabRoiName:"ROI", guideTabRoiDesc:"Xếp hạng.", guideTabMonitorName:"Monitor", guideTabMonitorDesc:"Theo dõi.", guideTabBudgetName:"Ngân sách", guideTabBudgetDesc:"Phát hiện.", guideTabCopyName:"AI Copy", guideTabCopyDesc:"Tạo bản sao.", guideTipsTitle:"Mẹo", guideTip1:"Phê duyệt trực tiếp.", guideTip2:"Tự đồng bộ.", guideTip3:"95% tự dừng.", guideTip4:"Mở rộng ROAS>3x.", guideTip5:"API tăng chính xác." },
  id: { tabGuide:"Panduan", guideTitle:"Panduan Manajer Kampanye", guideSub:"Kelola kampanye dari awal hingga akhir.", guideStepsTitle:"6 Langkah", guideStep1Title:"Lihat Ringkasan", guideStep1Desc:"Periksa semua kampanye.", guideStep2Title:"Analisis Detail", guideStep2Desc:"Klik untuk detail.", guideStep3Title:"Gantt", guideStep3Desc:"Kelola jadwal.", guideStep4Title:"ROI", guideStep4Desc:"Bandingkan ROAS.", guideStep5Title:"Peringatan Anggaran", guideStep5Desc:"Deteksi >70%.", guideStep6Title:"AI Copywriting", guideStep6Desc:"AI buat teks iklan.", guideTabsTitle:"Panduan Tab", guideTabOverviewName:"Ringkasan", guideTabOverviewDesc:"Daftar kampanye.", guideTabAbName:"A/B Test", guideTabAbDesc:"Hasil tes.", guideTabDetailName:"Detail", guideTabDetailDesc:"Analisis.", guideTabGanttName:"Gantt", guideTabGanttDesc:"Timeline.", guideTabCrmName:"CRM", guideTabCrmDesc:"Email/Kakao.", guideTabRoiName:"ROI", guideTabRoiDesc:"Peringkat.", guideTabMonitorName:"Monitor", guideTabMonitorDesc:"Lacak langsung.", guideTabBudgetName:"Anggaran", guideTabBudgetDesc:"Deteksi.", guideTabCopyName:"AI Copy", guideTabCopyDesc:"Buat teks.", guideTipsTitle:"Tips", guideTip1:"Setujui langsung.", guideTip2:"Sinkron otomatis.", guideTip3:"95% otomatis jeda.", guideTip4:"Skala ROAS>3x.", guideTip5:"API tingkatkan akurasi." }
};

LOCALE_FILES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const objStr = raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '');
  try {
    const obj = JSON.parse(objStr);
    if (!obj.campaignMgr) obj.campaignMgr = {};
    const keys = guideKeys[lang] || guideKeys.en;
    Object.assign(obj.campaignMgr, keys);
    fs.writeFileSync(filePath, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
    console.log(`✅ [${lang}] campaignMgr guide: ${Object.keys(keys).length} keys`);
  } catch (e) {
    console.log(`❌ [${lang}] ${e.message.substring(0, 80)}`);
  }
});
console.log('\n🎉 Campaign Manager guide i18n complete!');
