const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "tabGuide":"📖 가이드",
    "guideTitle":"그래프 스코어 이용 가이드","guideSub":"인플루언서, 크리에이티브, SKU, 주문 간의 관계를 그래프 네트워크로 분석하는 방법을 안내합니다.",
    "guideStepsTitle":"그래프 분석 6단계",
    "guideStep1Title":"요약 확인","guideStep1Desc":"노드 수(인플루언서/크리에이티브/SKU/주문)와 엣지 수를 확인합니다.",
    "guideStep2Title":"Top 노드 확인","guideStep2Desc":"기여도 가중치가 높은 상위 인플루언서, 크리에이티브, SKU를 분석합니다.",
    "guideStep3Title":"그래프 브라우저","guideStep3Desc":"노드 간 연결(엣지)을 필터링하고 가중치를 확인합니다.",
    "guideStep4Title":"인플루언서 스코어","guideStep4Desc":"특정 인플루언서의 Graph Score와 연결된 SKU/주문을 분석합니다.",
    "guideStep5Title":"SKU 스코어","guideStep5Desc":"특정 SKU에 기여한 인플루언서와 크리에이티브를 분석합니다.",
    "guideStep6Title":"인사이트 적용","guideStep6Desc":"분석 결과를 캠페인 전략과 인플루언서 선정에 반영합니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideSummaryName":"요약 대시보드","guideSummaryDesc":"노드 수, 엣지 수, Top 인플루언서/크리에이티브/SKU를 한눈에 파악합니다.",
    "guideBrowserName":"그래프 브라우저","guideBrowserDesc":"전체 엣지를 필터링하고 소스/타겟/가중치를 테이블로 확인합니다.",
    "guideInfluencerName":"인플루언서 스코어","guideInfluencerDesc":"인플루언서의 Graph Score, 연결 SKU/주문, 기여 경로를 분석합니다.",
    "guideSkuName":"SKU 스코어","guideSkuDesc":"SKU에 기여한 크리에이티브, 주문, 인플루언서 랭킹을 분석합니다.",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"Graph Score가 높은 인플루언서는 다양한 SKU와 주문에 간접적으로 기여합니다.",
    "guideTip2":"엣지 가중치가 높을수록 두 노드 간의 연결 강도가 큽니다.",
    "guideTip3":"Top SKU에 기여한 인플루언서를 파악하면 효과적인 협업 전략을 수립할 수 있습니다.",
    "guideTip4":"그래프 브라우저에서 노드 ID로 필터링하면 특정 관계를 빠르게 찾을 수 있습니다.",
    "guideTip5":"모든 데이터는 API 기반으로 실시간 동기화됩니다.",
  },
  en: {
    "tabGuide":"📖 Guide",
    "guideTitle":"Graph Score Guide","guideSub":"Learn how to analyze relationships between influencers, creatives, SKUs, and orders using graph networks.",
    "guideStepsTitle":"6 Steps to Graph Analysis",
    "guideStep1Title":"Check Summary","guideStep1Desc":"Review node counts (influencer/creative/SKU/order) and edge counts.",
    "guideStep2Title":"Top Nodes","guideStep2Desc":"Analyze top influencers, creatives, and SKUs by contribution weight.",
    "guideStep3Title":"Graph Browser","guideStep3Desc":"Filter node connections (edges) and check weights.",
    "guideStep4Title":"Influencer Score","guideStep4Desc":"Analyze a specific influencer's Graph Score and connected SKUs/orders.",
    "guideStep5Title":"SKU Score","guideStep5Desc":"Analyze influencers and creatives that contributed to a specific SKU.",
    "guideStep6Title":"Apply Insights","guideStep6Desc":"Apply results to campaign strategy and influencer selection.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideSummaryName":"Summary Dashboard","guideSummaryDesc":"View node counts, edge counts, top influencers/creatives/SKUs at a glance.",
    "guideBrowserName":"Graph Browser","guideBrowserDesc":"Filter all edges and view source/target/weight in a table.",
    "guideInfluencerName":"Influencer Score","guideInfluencerDesc":"Analyze influencer Graph Score, connected SKUs/orders, contribution paths.",
    "guideSkuName":"SKU Score","guideSkuDesc":"Analyze contributing creatives, orders, and influencer rankings for a SKU.",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Influencers with high Graph Scores contribute indirectly to many SKUs and orders.",
    "guideTip2":"Higher edge weight means stronger connection between two nodes.",
    "guideTip3":"Identifying influencers contributing to top SKUs helps build effective collaboration strategies.",
    "guideTip4":"Filter by node ID in Graph Browser to quickly find specific relationships.",
    "guideTip5":"All data syncs in real-time via API.",
  },
  ja: {"tabGuide":"📖 ガイド","guideTitle":"グラフスコアガイド","guideSub":"ネットワーク分析","guideStepsTitle":"6ステップ","guideStep1Title":"サマリー確認","guideStep1Desc":"ノード数とエッジ数","guideStep2Title":"Top分析","guideStep2Desc":"上位ノード","guideStep3Title":"ブラウザ","guideStep3Desc":"エッジ確認","guideStep4Title":"インフルエンサー","guideStep4Desc":"スコア分析","guideStep5Title":"SKU","guideStep5Desc":"SKU分析","guideStep6Title":"適用","guideStep6Desc":"戦略反映","guideTabsTitle":"タブ説明","guideSummaryName":"サマリー","guideSummaryDesc":"概要","guideBrowserName":"ブラウザ","guideBrowserDesc":"エッジ一覧","guideInfluencerName":"インフルエンサー","guideInfluencerDesc":"スコア","guideSkuName":"SKU","guideSkuDesc":"貢献分析","guideTipsTitle":"ヒント","guideTip1":"高スコア=間接貢献","guideTip2":"エッジ重み=強度","guideTip3":"Top SKU貢献者","guideTip4":"IDフィルター","guideTip5":"リアルタイム同期"},
  zh: {"tabGuide":"📖 指南","guideTitle":"图谱评分指南","guideSub":"网络分析","guideStepsTitle":"6步骤","guideStep1Title":"概览","guideStep1Desc":"节点和边数","guideStep2Title":"Top分析","guideStep2Desc":"排名","guideStep3Title":"浏览器","guideStep3Desc":"查看边","guideStep4Title":"KOL评分","guideStep4Desc":"分析","guideStep5Title":"SKU","guideStep5Desc":"分析","guideStep6Title":"应用","guideStep6Desc":"策略","guideTabsTitle":"标签","guideSummaryName":"概览","guideSummaryDesc":"总览","guideBrowserName":"浏览器","guideBrowserDesc":"边列表","guideInfluencerName":"KOL","guideInfluencerDesc":"评分","guideSkuName":"SKU","guideSkuDesc":"贡献","guideTipsTitle":"技巧","guideTip1":"高分=间接贡献","guideTip2":"权重=强度","guideTip3":"Top SKU贡献者","guideTip4":"ID过滤","guideTip5":"实时同步"},
  "zh-TW": {"tabGuide":"📖 指南","guideTitle":"圖譜評分指南","guideSub":"網路分析","guideStepsTitle":"6步驟","guideStep1Title":"概覽","guideStep1Desc":"節點","guideStep2Title":"Top","guideStep2Desc":"排名","guideStep3Title":"瀏覽器","guideStep3Desc":"邊","guideStep4Title":"KOL","guideStep4Desc":"分析","guideStep5Title":"SKU","guideStep5Desc":"分析","guideStep6Title":"應用","guideStep6Desc":"策略","guideTabsTitle":"標籤","guideSummaryName":"概覽","guideSummaryDesc":"總覽","guideBrowserName":"瀏覽器","guideBrowserDesc":"邊","guideInfluencerName":"KOL","guideInfluencerDesc":"評分","guideSkuName":"SKU","guideSkuDesc":"貢獻","guideTipsTitle":"技巧","guideTip1":"高分","guideTip2":"權重","guideTip3":"Top SKU","guideTip4":"過濾","guideTip5":"即時"},
  de: {"tabGuide":"📖 Anleitung","guideTitle":"Graph-Score-Anleitung","guideSub":"Netzwerkanalyse","guideStepsTitle":"6 Schritte","guideStep1Title":"Zusammenfassung","guideStep1Desc":"Knoten und Kanten","guideStep2Title":"Top-Analyse","guideStep2Desc":"Ranking","guideStep3Title":"Browser","guideStep3Desc":"Kanten","guideStep4Title":"Influencer","guideStep4Desc":"Score","guideStep5Title":"SKU","guideStep5Desc":"Analyse","guideStep6Title":"Anwenden","guideStep6Desc":"Strategie","guideTabsTitle":"Tab-Guide","guideSummaryName":"Zusammenfassung","guideSummaryDesc":"Überblick","guideBrowserName":"Browser","guideBrowserDesc":"Kanten","guideInfluencerName":"Influencer","guideInfluencerDesc":"Score","guideSkuName":"SKU","guideSkuDesc":"Beitrag","guideTipsTitle":"Tipps","guideTip1":"Hoher Score","guideTip2":"Gewicht","guideTip3":"Top SKU","guideTip4":"Filter","guideTip5":"Echtzeit"},
  th: {"tabGuide":"📖 คู่มือ","guideTitle":"คู่มือกราฟ","guideSub":"วิเคราะห์เครือข่าย","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"สรุป","guideStep1Desc":"โหนดและเอดจ์","guideStep2Title":"Top","guideStep2Desc":"อันดับ","guideStep3Title":"เบราว์เซอร์","guideStep3Desc":"เอดจ์","guideStep4Title":"อินฟลูเอนเซอร์","guideStep4Desc":"คะแนน","guideStep5Title":"SKU","guideStep5Desc":"วิเคราะห์","guideStep6Title":"ใช้งาน","guideStep6Desc":"กลยุทธ์","guideTabsTitle":"แท็บ","guideSummaryName":"สรุป","guideSummaryDesc":"ภาพรวม","guideBrowserName":"เบราว์เซอร์","guideBrowserDesc":"เอดจ์","guideInfluencerName":"อินฟลูฯ","guideInfluencerDesc":"คะแนน","guideSkuName":"SKU","guideSkuDesc":"วิเคราะห์","guideTipsTitle":"เทคนิค","guideTip1":"คะแนนสูง","guideTip2":"น้ำหนัก","guideTip3":"Top SKU","guideTip4":"กรอง","guideTip5":"เรียลไทม์"},
  vi: {"tabGuide":"📖 Hướng dẫn","guideTitle":"Hướng dẫn Graph","guideSub":"Phân tích mạng","guideStepsTitle":"6 bước","guideStep1Title":"Tổng quan","guideStep1Desc":"Nút và cạnh","guideStep2Title":"Top","guideStep2Desc":"Xếp hạng","guideStep3Title":"Trình duyệt","guideStep3Desc":"Cạnh","guideStep4Title":"Influencer","guideStep4Desc":"Điểm","guideStep5Title":"SKU","guideStep5Desc":"Phân tích","guideStep6Title":"Áp dụng","guideStep6Desc":"Chiến lược","guideTabsTitle":"Tab","guideSummaryName":"Tổng quan","guideSummaryDesc":"Tổng hợp","guideBrowserName":"Trình duyệt","guideBrowserDesc":"Cạnh","guideInfluencerName":"Influencer","guideInfluencerDesc":"Điểm","guideSkuName":"SKU","guideSkuDesc":"Đóng góp","guideTipsTitle":"Mẹo","guideTip1":"Điểm cao","guideTip2":"Trọng số","guideTip3":"Top SKU","guideTip4":"Lọc","guideTip5":"Real-time"},
  id: {"tabGuide":"📖 Panduan","guideTitle":"Panduan Graph","guideSub":"Analisis jaringan","guideStepsTitle":"6 Langkah","guideStep1Title":"Ringkasan","guideStep1Desc":"Node dan edge","guideStep2Title":"Top","guideStep2Desc":"Peringkat","guideStep3Title":"Browser","guideStep3Desc":"Edge","guideStep4Title":"Influencer","guideStep4Desc":"Skor","guideStep5Title":"SKU","guideStep5Desc":"Analisis","guideStep6Title":"Terapkan","guideStep6Desc":"Strategi","guideTabsTitle":"Tab","guideSummaryName":"Ringkasan","guideSummaryDesc":"Overview","guideBrowserName":"Browser","guideBrowserDesc":"Edge","guideInfluencerName":"Influencer","guideInfluencerDesc":"Skor","guideSkuName":"SKU","guideSkuDesc":"Kontribusi","guideTipsTitle":"Tips","guideTip1":"Skor tinggi","guideTip2":"Bobot","guideTip3":"Top SKU","guideTip4":"Filter","guideTip5":"Real-time"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.graphScore) obj.graphScore = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.graphScore, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] graphScore guide: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 Graph Score guide i18n complete!');
