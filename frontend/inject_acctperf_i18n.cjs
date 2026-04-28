const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "pageTitle":"계정별 성과 분석","pageSub":"팀 및 계정별 퍼포먼스와 예산 요약",
    "tabDashboard":"시각화 대시보드","tabDrilldown":"트리구조 계층 분석","tabGuide":"이용 가이드",
    "teamDashboard":"팀/어카운트 예산 대시보드",
    "objectiveAwareness":"인지 (Awareness)","objectiveConsideration":"고려 (Consideration)","objectiveConversion":"전환 (Conversion)",
    "kpiSpend":"누적 지출","avgRoas":"평균 ROAS",
    "revenueTracking":"목표 기반 수익 트래킹","convRev":"전환 수익","awareRev":"인지도 수익","consRev":"고려도 수익",
    "aiInsightTitle":"💡 AI 전략 인사이트","aiInsightDesc":"각 팀별 목표에 맞춘 고도화 전략 분석",
    "aiInsightHigh":"성과 우수. 예산 증액 권고","aiInsightLow":"효율 저하. 크리에이티브 교체 검토",
    "hierarchyTitle":"캠페인 ➔ 광고 세트 ➔ 광고 (계층 분석)","hierarchyDesc":"행을 클릭하여 마이크로 지표까지 즉시 드릴다운하세요.",
    "colStruct":"조직 구조","colTeam":"팀","colStatus":"상태","colSpend":"지출 추이","colRoas":"ROAS","colImpr":"노출","colClicks":"클릭","colCtr":"CTR(%)","colConv":"기여 전환",
    "defaultTeam":"운영팀",
    "guideTitle":"계정별 성과 분석 이용 가이드","guideSub":"팀별 퍼포먼스 분석, 캠페인 드릴다운, AI 인사이트를 활용하는 방법을 안내합니다.",
    "guideStepsTitle":"성과 분석 6단계",
    "guideStep1Title":"대시보드 확인","guideStep1Desc":"팀별 예산 배정 대비 지출을 바 차트에서 확인합니다.",
    "guideStep2Title":"목표별 KPI","guideStep2Desc":"인지/고려/전환 목표별 누적 지출과 평균 ROAS를 확인합니다.",
    "guideStep3Title":"수익 트래킹","guideStep3Desc":"14일간 목표별 수익 추이를 에리어 차트에서 분석합니다.",
    "guideStep4Title":"AI 인사이트","guideStep4Desc":"AI가 팀별 ROAS를 분석하여 예산 증액 또는 크리에이티브 교체를 권고합니다.",
    "guideStep5Title":"계층 드릴다운","guideStep5Desc":"캠페인 > 광고세트 > 광고 3단계로 마이크로 지표를 드릴다운합니다.",
    "guideStep6Title":"실시간 동기화","guideStep6Desc":"모든 데이터는 새로고침 없이 실시간으로 동기화됩니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideTabDashboardName":"시각화 대시보드","guideTabDashboardDesc":"팀 예산 바차트, 목표별 KPI, 수익 트래킹, AI 인사이트를 한눈에 파악합니다.",
    "guideTabDrilldownName":"트리구조 계층 분석","guideTabDrilldownDesc":"캠페인 > 광고세트 > 광고 3단계 드릴다운으로 상세 지표를 분석합니다.",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"ROAS 4.0x 이상인 팀은 예산 증액을 검토하세요.",
    "guideTip2":"ROAS 2.0x 미만인 팀은 크리에이티브 교체가 필요합니다.",
    "guideTip3":"드릴다운에서 개별 광고의 CTR과 전환을 비교하여 최적 소재를 찾으세요.",
    "guideTip4":"목표별 수익 트래킹에서 전환 수익이 가장 중요한 지표입니다.",
    "guideTip5":"모든 데이터는 연동허브의 API 키 기반으로 실시간 동기화됩니다.",
  },
  en: {
    "pageTitle":"Account Performance","pageSub":"Team & account performance and budget summary",
    "tabDashboard":"Dashboard","tabDrilldown":"Hierarchy Drilldown","tabGuide":"Guide",
    "teamDashboard":"Team/Account Budget Dashboard",
    "objectiveAwareness":"Awareness","objectiveConsideration":"Consideration","objectiveConversion":"Conversion",
    "kpiSpend":"Cumulative Spend","avgRoas":"Avg ROAS",
    "revenueTracking":"Objective-based Revenue Tracking","convRev":"Conversion Revenue","awareRev":"Awareness Revenue","consRev":"Consideration Revenue",
    "aiInsightTitle":"💡 AI Strategic Insights","aiInsightDesc":"Advanced strategy analysis tailored to each team's objectives",
    "aiInsightHigh":"Excellent performance. Budget increase recommended.","aiInsightLow":"Efficiency declining. Creative refresh suggested.",
    "hierarchyTitle":"Campaign ➔ Ad Set ➔ Ad (Hierarchy)","hierarchyDesc":"Click rows to drilldown to micro-level metrics.",
    "colStruct":"Structure","colTeam":"Team","colStatus":"Status","colSpend":"Spend Trend","colRoas":"ROAS","colImpr":"Impressions","colClicks":"Clicks","colCtr":"CTR(%)","colConv":"Conversions",
    "defaultTeam":"Operations",
    "guideTitle":"Account Performance Guide","guideSub":"Learn how to analyze team performance, campaign drilldown, and AI insights.",
    "guideStepsTitle":"6 Steps to Performance Analysis",
    "guideStep1Title":"Check Dashboard","guideStep1Desc":"View team budget allocation vs spend in the bar chart.",
    "guideStep2Title":"Objective KPIs","guideStep2Desc":"Review cumulative spend and avg ROAS by awareness/consideration/conversion.",
    "guideStep3Title":"Revenue Tracking","guideStep3Desc":"Analyze 14-day revenue trends by objective in the area chart.",
    "guideStep4Title":"AI Insights","guideStep4Desc":"AI analyzes team ROAS to recommend budget increases or creative refreshes.",
    "guideStep5Title":"Hierarchy Drilldown","guideStep5Desc":"Drill down Campaign > Ad Set > Ad for micro-level metrics.",
    "guideStep6Title":"Real-time Sync","guideStep6Desc":"All data syncs in real-time without page refresh.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideTabDashboardName":"Dashboard","guideTabDashboardDesc":"Team budget chart, objective KPIs, revenue tracking, AI insights at a glance.",
    "guideTabDrilldownName":"Hierarchy Drilldown","guideTabDrilldownDesc":"3-level Campaign > Ad Set > Ad drilldown with detailed metrics.",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Teams with ROAS above 4.0x should consider budget increases.",
    "guideTip2":"Teams with ROAS below 2.0x need creative refreshes.",
    "guideTip3":"Compare individual ad CTR and conversions in drilldown to find top creatives.",
    "guideTip4":"Conversion revenue is the most critical metric in revenue tracking.",
    "guideTip5":"All data syncs in real-time via Integration Hub API keys.",
  },
  ja: {"pageTitle":"アカウント別実績","pageSub":"チーム別パフォーマンス","tabDashboard":"ダッシュボード","tabDrilldown":"階層分析","tabGuide":"ガイド","teamDashboard":"チーム予算","objectiveAwareness":"認知","objectiveConsideration":"検討","objectiveConversion":"コンバージョン","kpiSpend":"累計支出","avgRoas":"平均ROAS","revenueTracking":"目標別収益","convRev":"CV収益","awareRev":"認知収益","consRev":"検討収益","aiInsightTitle":"💡 AI戦略","aiInsightDesc":"チーム別分析","aiInsightHigh":"高成果。増額推奨","aiInsightLow":"効率低下。クリエイティブ更新","hierarchyTitle":"キャンペーン ➔ 広告セット ➔ 広告","hierarchyDesc":"行クリックでドリルダウン","colStruct":"構造","colTeam":"チーム","colStatus":"状態","colSpend":"支出","colRoas":"ROAS","colImpr":"表示","colClicks":"クリック","colCtr":"CTR","colConv":"CV","defaultTeam":"運用チーム","guideTitle":"アカウント成果ガイド","guideSub":"チーム分析の使い方","guideStepsTitle":"6ステップ","guideStep1Title":"ダッシュボード","guideStep1Desc":"予算vs支出を確認","guideStep2Title":"目標KPI","guideStep2Desc":"目標別指標を確認","guideStep3Title":"収益追跡","guideStep3Desc":"14日間の推移を分析","guideStep4Title":"AIインサイト","guideStep4Desc":"AI分析による推奨","guideStep5Title":"階層分析","guideStep5Desc":"3段階ドリルダウン","guideStep6Title":"リアルタイム同期","guideStep6Desc":"自動同期","guideTabsTitle":"タブ説明","guideTabDashboardName":"ダッシュボード","guideTabDashboardDesc":"チーム予算・KPI・収益","guideTabDrilldownName":"階層分析","guideTabDrilldownDesc":"3段階ドリルダウン","guideTipsTitle":"ヒント","guideTip1":"ROAS4x以上は増額検討","guideTip2":"ROAS2x未満はクリエイティブ更新","guideTip3":"個別広告のCTRを比較","guideTip4":"CV収益が最重要指標","guideTip5":"APIキー基準でリアルタイム同期"},
  zh: {"pageTitle":"账号业绩","pageSub":"团队绩效汇总","tabDashboard":"仪表盘","tabDrilldown":"层级分析","tabGuide":"指南","teamDashboard":"团队预算","objectiveAwareness":"认知","objectiveConsideration":"考虑","objectiveConversion":"转化","kpiSpend":"累计支出","avgRoas":"平均ROAS","revenueTracking":"目标收入追踪","convRev":"转化收入","awareRev":"认知收入","consRev":"考虑收入","aiInsightTitle":"💡 AI策略","aiInsightDesc":"团队策略分析","aiInsightHigh":"表现优秀,建议增加预算","aiInsightLow":"效率下降,建议更换素材","hierarchyTitle":"活动 ➔ 广告组 ➔ 广告","hierarchyDesc":"点击行查看详细","colStruct":"结构","colTeam":"团队","colStatus":"状态","colSpend":"支出","colRoas":"ROAS","colImpr":"展示","colClicks":"点击","colCtr":"CTR","colConv":"转化","defaultTeam":"运营团队","guideTitle":"账号业绩指南","guideSub":"分析方法","guideStepsTitle":"6步骤","guideStep1Title":"仪表盘","guideStep1Desc":"查看预算","guideStep2Title":"KPI","guideStep2Desc":"目标指标","guideStep3Title":"收入","guideStep3Desc":"14天趋势","guideStep4Title":"AI","guideStep4Desc":"AI推荐","guideStep5Title":"层级","guideStep5Desc":"3级下钻","guideStep6Title":"同步","guideStep6Desc":"实时","guideTabsTitle":"标签说明","guideTabDashboardName":"仪表盘","guideTabDashboardDesc":"预算和KPI","guideTabDrilldownName":"层级","guideTabDrilldownDesc":"3级分析","guideTipsTitle":"技巧","guideTip1":"ROAS高于4x增加预算","guideTip2":"ROAS低于2x更换素材","guideTip3":"比较广告CTR","guideTip4":"转化收入最重要","guideTip5":"实时同步"},
  "zh-TW": {"pageTitle":"帳號績效","pageSub":"團隊績效","tabDashboard":"儀表板","tabDrilldown":"階層分析","tabGuide":"指南","teamDashboard":"團隊預算","objectiveAwareness":"認知","objectiveConsideration":"考慮","objectiveConversion":"轉換","kpiSpend":"累計支出","avgRoas":"平均ROAS","revenueTracking":"目標收入","convRev":"轉換收入","awareRev":"認知收入","consRev":"考慮收入","aiInsightTitle":"💡 AI策略","aiInsightDesc":"團隊分析","aiInsightHigh":"高ROAS增加預算","aiInsightLow":"效率低更換素材","hierarchyTitle":"活動 ➔ 廣告組 ➔ 廣告","hierarchyDesc":"點擊查看","colStruct":"結構","colTeam":"團隊","colStatus":"狀態","colSpend":"支出","colRoas":"ROAS","colImpr":"曝光","colClicks":"點擊","colCtr":"CTR","colConv":"轉換","defaultTeam":"營運","guideTitle":"帳號績效指南","guideSub":"分析方法","guideStepsTitle":"6步驟","guideStep1Title":"儀表板","guideStep1Desc":"查看","guideStep2Title":"KPI","guideStep2Desc":"目標","guideStep3Title":"收入","guideStep3Desc":"趨勢","guideStep4Title":"AI","guideStep4Desc":"推薦","guideStep5Title":"階層","guideStep5Desc":"下鑽","guideStep6Title":"同步","guideStep6Desc":"即時","guideTabsTitle":"標籤","guideTabDashboardName":"儀表板","guideTabDashboardDesc":"預算KPI","guideTabDrilldownName":"階層","guideTabDrilldownDesc":"3級","guideTipsTitle":"技巧","guideTip1":"ROAS高增加","guideTip2":"ROAS低更換","guideTip3":"比較CTR","guideTip4":"轉換最重要","guideTip5":"即時同步"},
  de: {"pageTitle":"Kontoleistung","pageSub":"Team-Performance","tabDashboard":"Dashboard","tabDrilldown":"Hierarchie","tabGuide":"Anleitung","teamDashboard":"Team-Budget","objectiveAwareness":"Bekanntheit","objectiveConsideration":"Interesse","objectiveConversion":"Konversion","kpiSpend":"Gesamtausgaben","avgRoas":"Ø ROAS","revenueTracking":"Ziel-Umsatz","convRev":"Konv.-Umsatz","awareRev":"Bekanntheits-Umsatz","consRev":"Interesse-Umsatz","aiInsightTitle":"💡 AI-Strategie","aiInsightDesc":"Team-Analyse","aiInsightHigh":"Hohe Leistung","aiInsightLow":"Effizienz niedrig","hierarchyTitle":"Kampagne ➔ Anzeigengruppe ➔ Anzeige","hierarchyDesc":"Zeile klicken","colStruct":"Struktur","colTeam":"Team","colStatus":"Status","colSpend":"Ausgaben","colRoas":"ROAS","colImpr":"Impressionen","colClicks":"Klicks","colCtr":"CTR","colConv":"Konversionen","defaultTeam":"Betrieb","guideTitle":"Kontoleistung-Anleitung","guideSub":"Analyse-Guide","guideStepsTitle":"6 Schritte","guideStep1Title":"Dashboard","guideStep1Desc":"Budget prüfen","guideStep2Title":"KPIs","guideStep2Desc":"Ziel-KPIs","guideStep3Title":"Umsatz","guideStep3Desc":"14-Tage-Trend","guideStep4Title":"AI","guideStep4Desc":"Empfehlungen","guideStep5Title":"Hierarchie","guideStep5Desc":"3 Ebenen","guideStep6Title":"Sync","guideStep6Desc":"Echtzeit","guideTabsTitle":"Tab-Guide","guideTabDashboardName":"Dashboard","guideTabDashboardDesc":"Budget und KPIs","guideTabDrilldownName":"Hierarchie","guideTabDrilldownDesc":"3-Ebenen","guideTipsTitle":"Tipps","guideTip1":"ROAS über 4x erhöhen","guideTip2":"ROAS unter 2x Creatives erneuern","guideTip3":"CTR vergleichen","guideTip4":"Konversion wichtigster KPI","guideTip5":"Echtzeit-Sync"},
  th: {"pageTitle":"ผลงานบัญชี","pageSub":"ผลงานทีม","tabDashboard":"แดชบอร์ด","tabDrilldown":"วิเคราะห์ลำดับ","tabGuide":"คู่มือ","teamDashboard":"งบทีม","objectiveAwareness":"การรับรู้","objectiveConsideration":"การพิจารณา","objectiveConversion":"การแปลง","kpiSpend":"ใช้จ่ายรวม","avgRoas":"ROAS เฉลี่ย","revenueTracking":"ติดตามรายได้","convRev":"รายได้แปลง","awareRev":"รายได้รับรู้","consRev":"รายได้พิจารณา","aiInsightTitle":"💡 AI กลยุทธ์","aiInsightDesc":"วิเคราะห์ทีม","aiInsightHigh":"ดีเยี่ยม เพิ่มงบ","aiInsightLow":"ต่ำ เปลี่ยนสื่อ","hierarchyTitle":"แคมเปญ ➔ กลุ่ม ➔ โฆษณา","hierarchyDesc":"คลิกเพื่อดู","colStruct":"โครงสร้าง","colTeam":"ทีม","colStatus":"สถานะ","colSpend":"ใช้จ่าย","colRoas":"ROAS","colImpr":"แสดง","colClicks":"คลิก","colCtr":"CTR","colConv":"แปลง","defaultTeam":"ปฏิบัติการ","guideTitle":"คู่มือผลงาน","guideSub":"วิธีใช้","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"แดชบอร์ด","guideStep1Desc":"ดูงบ","guideStep2Title":"KPI","guideStep2Desc":"ดูเป้าหมาย","guideStep3Title":"รายได้","guideStep3Desc":"แนวโน้ม","guideStep4Title":"AI","guideStep4Desc":"คำแนะนำ","guideStep5Title":"ลำดับ","guideStep5Desc":"3 ระดับ","guideStep6Title":"ซิงค์","guideStep6Desc":"เรียลไทม์","guideTabsTitle":"คำอธิบาย","guideTabDashboardName":"แดชบอร์ด","guideTabDashboardDesc":"งบและKPI","guideTabDrilldownName":"ลำดับ","guideTabDrilldownDesc":"3ระดับ","guideTipsTitle":"เทคนิค","guideTip1":"ROAS สูงเพิ่มงบ","guideTip2":"ROAS ต่ำเปลี่ยนสื่อ","guideTip3":"เปรียบเทียบCTR","guideTip4":"รายได้แปลงสำคัญสุด","guideTip5":"ซิงค์เรียลไทม์"},
  vi: {"pageTitle":"Hiệu suất tài khoản","pageSub":"Tổng hợp team","tabDashboard":"Dashboard","tabDrilldown":"Phân cấp","tabGuide":"Hướng dẫn","teamDashboard":"Ngân sách team","objectiveAwareness":"Nhận biết","objectiveConsideration":"Cân nhắc","objectiveConversion":"Chuyển đổi","kpiSpend":"Tổng chi","avgRoas":"ROAS TB","revenueTracking":"Theo dõi doanh thu","convRev":"DT chuyển đổi","awareRev":"DT nhận biết","consRev":"DT cân nhắc","aiInsightTitle":"💡 AI chiến lược","aiInsightDesc":"Phân tích team","aiInsightHigh":"Hiệu quả cao, tăng ngân sách","aiInsightLow":"Giảm hiệu quả, đổi nội dung","hierarchyTitle":"Chiến dịch ➔ Nhóm ➔ QC","hierarchyDesc":"Nhấn để xem chi tiết","colStruct":"Cấu trúc","colTeam":"Team","colStatus":"Trạng thái","colSpend":"Chi","colRoas":"ROAS","colImpr":"Hiển thị","colClicks":"Click","colCtr":"CTR","colConv":"Chuyển đổi","defaultTeam":"Vận hành","guideTitle":"Hướng dẫn hiệu suất","guideSub":"Cách phân tích","guideStepsTitle":"6 bước","guideStep1Title":"Dashboard","guideStep1Desc":"Xem ngân sách","guideStep2Title":"KPI","guideStep2Desc":"Chỉ tiêu","guideStep3Title":"Doanh thu","guideStep3Desc":"Xu hướng","guideStep4Title":"AI","guideStep4Desc":"Đề xuất","guideStep5Title":"Phân cấp","guideStep5Desc":"3 cấp","guideStep6Title":"Đồng bộ","guideStep6Desc":"Real-time","guideTabsTitle":"Tab","guideTabDashboardName":"Dashboard","guideTabDashboardDesc":"Ngân sách+KPI","guideTabDrilldownName":"Phân cấp","guideTabDrilldownDesc":"3 cấp","guideTipsTitle":"Mẹo","guideTip1":"ROAS trên 4x tăng","guideTip2":"ROAS dưới 2x đổi nội dung","guideTip3":"So sánh CTR","guideTip4":"Chuyển đổi quan trọng nhất","guideTip5":"Đồng bộ real-time"},
  id: {"pageTitle":"Performa Akun","pageSub":"Ringkasan tim","tabDashboard":"Dashboard","tabDrilldown":"Hierarki","tabGuide":"Panduan","teamDashboard":"Anggaran Tim","objectiveAwareness":"Kesadaran","objectiveConsideration":"Pertimbangan","objectiveConversion":"Konversi","kpiSpend":"Total Belanja","avgRoas":"Rata-rata ROAS","revenueTracking":"Tracking Pendapatan","convRev":"Pendapatan Konversi","awareRev":"Pendapatan Kesadaran","consRev":"Pendapatan Pertimbangan","aiInsightTitle":"💡 AI Strategi","aiInsightDesc":"Analisis tim","aiInsightHigh":"Performa tinggi, tambah anggaran","aiInsightLow":"Efisiensi rendah, ganti kreatif","hierarchyTitle":"Kampanye ➔ Ad Set ➔ Iklan","hierarchyDesc":"Klik untuk detail","colStruct":"Struktur","colTeam":"Tim","colStatus":"Status","colSpend":"Belanja","colRoas":"ROAS","colImpr":"Tayangan","colClicks":"Klik","colCtr":"CTR","colConv":"Konversi","defaultTeam":"Operasional","guideTitle":"Panduan Performa","guideSub":"Cara analisis","guideStepsTitle":"6 Langkah","guideStep1Title":"Dashboard","guideStep1Desc":"Lihat anggaran","guideStep2Title":"KPI","guideStep2Desc":"Cek target","guideStep3Title":"Pendapatan","guideStep3Desc":"Tren","guideStep4Title":"AI","guideStep4Desc":"Rekomendasi","guideStep5Title":"Hierarki","guideStep5Desc":"3 level","guideStep6Title":"Sinkronisasi","guideStep6Desc":"Real-time","guideTabsTitle":"Panduan Tab","guideTabDashboardName":"Dashboard","guideTabDashboardDesc":"Anggaran+KPI","guideTabDrilldownName":"Hierarki","guideTabDrilldownDesc":"3 level","guideTipsTitle":"Tips","guideTip1":"ROAS di atas 4x tambah anggaran","guideTip2":"ROAS di bawah 2x ganti kreatif","guideTip3":"Bandingkan CTR","guideTip4":"Konversi paling penting","guideTip5":"Sinkron real-time"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.acctPerf) obj.acctPerf = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.acctPerf, k);
  // Also ensure accountPerf namespace maps to same for backward compat
  if (!obj.accountPerf) obj.accountPerf = {};
  Object.assign(obj.accountPerf, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] acctPerf: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 Account Performance i18n complete!');
