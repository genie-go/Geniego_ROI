const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src/i18n/locales');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const keys = {
  ko: {
    "tabGuideLabel":"📖 가이드","tabGuideDesc":"이용 방법",
    "guideTitle":"기여도 분석 이용 가이드","guideSub":"9가지 어트리뷰션 모델을 활용하여 마케팅 채널의 진정한 기여도를 분석하는 방법을 안내합니다.",
    "guideStepsTitle":"기여도 분석 6단계",
    "guideStep1Title":"MTA 모델 선택","guideStep1Desc":"First Touch, Last Touch, Linear, Time Decay, Position 중 원하는 멀티터치 모델을 선택합니다.",
    "guideStep2Title":"Shapley 분석","guideStep2Desc":"게임이론 기반 공정한 채널 기여도를 산출하고 시너지 효과를 확인합니다.",
    "guideStep3Title":"MMM 시뮬레이션","guideStep3Desc":"52주 시계열 데이터로 Bayesian MMM 모델을 실행하고 예산 시뮬레이션합니다.",
    "guideStep4Title":"이상감지 모니터링","guideStep4Desc":"Z-score 기반 실시간 이상감지로 채널별 성과 변동을 즉시 파악합니다.",
    "guideStep5Title":"모델 비교 (A-Score)","guideStep5Desc":"여러 모델의 기여도 결과를 레이더 차트로 비교하고 신뢰도를 평가합니다.",
    "guideStep6Title":"인사이트 적용","guideStep6Desc":"분석 결과를 예산 배분, 캠페인 전략에 실시간 반영합니다.",
    "guideTabsTitle":"탭별 상세 안내",
    "guideMtaName":"Multi-Touch","guideMtaDesc":"5가지 멀티터치 어트리뷰션 모델로 채널 기여도를 비교합니다.",
    "guideShapleyName":"Exact Shapley","guideShapleyDesc":"게임이론 기반 공정한 기여도 산출과 채널 시너지를 분석합니다.",
    "guideMmmName":"Bayesian MMM","guideMmmDesc":"52주 시계열 마케팅 믹스 모델로 채널별 투자 효율을 분석합니다.",
    "guideMarkovName":"Markov+Uplift","guideMarkovDesc":"마르코프 체인 제거 효과와 Double ML 증분 효과를 분석합니다.",
    "guideAbName":"Bayesian A/B","guideAbDesc":"Beta-Binomial 모델과 Thompson Sampling으로 A/B 테스트를 분석합니다.",
    "guideCohortName":"코호트","guideCohortDesc":"주차별 구매 코호트의 유지율을 히트맵으로 추적합니다.",
    "guideLtvName":"LTV vs CAC","guideLtvDesc":"채널별 고객 생애가치와 획득 비용을 비교 분석합니다.",
    "guideAnomalyName":"이상감지","guideAnomalyDesc":"Z-score 기반 실시간 이상감지로 성과 변동을 모니터링합니다.",
    "guideCompareName":"A-Score","guideCompareDesc":"모든 모델의 기여도를 레이더 차트로 비교하고 신뢰도를 평가합니다.",
    "guideTipsTitle":"유용한 팁",
    "guideTip1":"여러 모델의 결과가 일치할수록 해당 채널의 기여도 신뢰성이 높습니다.",
    "guideTip2":"Shapley 값이 높은 채널은 다른 채널과의 시너지가 크므로 예산 유지가 중요합니다.",
    "guideTip3":"MMM 포화도가 70% 이상이면 해당 채널의 추가 투자 효율이 떨어집니다.",
    "guideTip4":"이상감지에서 Z-score |2.0| 초과 시 즉시 원인 분석이 필요합니다.",
    "guideTip5":"모든 데이터는 연동허브 API 기반으로 실시간 동기화됩니다.",
  },
  en: {
    "tabGuideLabel":"📖 Guide","tabGuideDesc":"How to use",
    "guideTitle":"Attribution Analysis Guide","guideSub":"Learn how to use 9 attribution models to analyze true marketing channel contributions.",
    "guideStepsTitle":"6 Steps to Attribution Analysis",
    "guideStep1Title":"Select MTA Model","guideStep1Desc":"Choose from First Touch, Last Touch, Linear, Time Decay, or Position-based models.",
    "guideStep2Title":"Shapley Analysis","guideStep2Desc":"Calculate fair channel contributions using game theory and check synergy effects.",
    "guideStep3Title":"MMM Simulation","guideStep3Desc":"Run Bayesian MMM with 52-week time series data and simulate budget allocation.",
    "guideStep4Title":"Anomaly Detection","guideStep4Desc":"Monitor channel performance changes in real-time using Z-score based detection.",
    "guideStep5Title":"Model Compare (A-Score)","guideStep5Desc":"Compare attribution results across models with radar charts and evaluate confidence.",
    "guideStep6Title":"Apply Insights","guideStep6Desc":"Apply analysis results to budget allocation and campaign strategies in real-time.",
    "guideTabsTitle":"Tab-by-Tab Guide",
    "guideMtaName":"Multi-Touch","guideMtaDesc":"Compare channel contributions using 5 multi-touch attribution models.",
    "guideShapleyName":"Exact Shapley","guideShapleyDesc":"Fair contribution calculation and channel synergy analysis using game theory.",
    "guideMmmName":"Bayesian MMM","guideMmmDesc":"52-week time series marketing mix model for channel investment efficiency.",
    "guideMarkovName":"Markov+Uplift","guideMarkovDesc":"Markov chain removal effect and Double ML incremental uplift analysis.",
    "guideAbName":"Bayesian A/B","guideAbDesc":"A/B test analysis with Beta-Binomial model and Thompson Sampling.",
    "guideCohortName":"Cohort","guideCohortDesc":"Track weekly purchase cohort retention with heatmaps.",
    "guideLtvName":"LTV vs CAC","guideLtvDesc":"Compare customer lifetime value and acquisition cost by channel.",
    "guideAnomalyName":"Anomaly Detection","guideAnomalyDesc":"Real-time anomaly detection monitoring using Z-score based analysis.",
    "guideCompareName":"A-Score","guideCompareDesc":"Compare all model contributions with radar charts and evaluate confidence.",
    "guideTipsTitle":"Useful Tips",
    "guideTip1":"Higher consistency across models means more reliable channel contribution estimates.",
    "guideTip2":"Channels with high Shapley values have strong synergy effects — maintain budget allocation.",
    "guideTip3":"MMM saturation above 70% indicates diminishing returns on additional investment.",
    "guideTip4":"Z-score exceeding |2.0| in anomaly detection requires immediate root cause analysis.",
    "guideTip5":"All data syncs in real-time via Integration Hub API keys.",
  },
  ja: {"tabGuideLabel":"📖 ガイド","tabGuideDesc":"使い方","guideTitle":"アトリビューション分析ガイド","guideSub":"9つのモデルで貢献度を分析","guideStepsTitle":"6ステップ","guideStep1Title":"MTAモデル選択","guideStep1Desc":"5つのモデルを選択","guideStep2Title":"Shapley分析","guideStep2Desc":"ゲーム理論で公平な貢献度","guideStep3Title":"MMMシミュレーション","guideStep3Desc":"52週時系列分析","guideStep4Title":"異常検知","guideStep4Desc":"Z-scoreリアルタイム監視","guideStep5Title":"モデル比較","guideStep5Desc":"レーダーチャート比較","guideStep6Title":"インサイト適用","guideStep6Desc":"リアルタイム反映","guideTabsTitle":"タブ説明","guideMtaName":"Multi-Touch","guideMtaDesc":"5モデル比較","guideShapleyName":"Shapley","guideShapleyDesc":"公平な貢献度","guideMmmName":"Bayesian MMM","guideMmmDesc":"52週分析","guideMarkovName":"Markov+Uplift","guideMarkovDesc":"除去効果分析","guideAbName":"Bayesian A/B","guideAbDesc":"A/Bテスト","guideCohortName":"コホート","guideCohortDesc":"維持率追跡","guideLtvName":"LTV vs CAC","guideLtvDesc":"LTV/CAC比較","guideAnomalyName":"異常検知","guideAnomalyDesc":"Z-score監視","guideCompareName":"A-Score","guideCompareDesc":"信頼度評価","guideTipsTitle":"ヒント","guideTip1":"モデル一致度が高いほど信頼性が高い","guideTip2":"Shapley値の高いチャネルはシナジーが大きい","guideTip3":"MMM飽和度70%以上は投資効率低下","guideTip4":"Z-score |2.0|超過は即時分析必要","guideTip5":"APIキーでリアルタイム同期"},
  zh: {"tabGuideLabel":"📖 指南","tabGuideDesc":"使用方法","guideTitle":"归因分析指南","guideSub":"9种模型分析渠道贡献","guideStepsTitle":"6步骤","guideStep1Title":"选择MTA","guideStep1Desc":"5种模型","guideStep2Title":"Shapley","guideStep2Desc":"博弈论","guideStep3Title":"MMM","guideStep3Desc":"52周时序","guideStep4Title":"异常检测","guideStep4Desc":"Z-score监控","guideStep5Title":"模型比较","guideStep5Desc":"雷达图","guideStep6Title":"应用","guideStep6Desc":"实时","guideTabsTitle":"标签说明","guideMtaName":"Multi-Touch","guideMtaDesc":"5模型","guideShapleyName":"Shapley","guideShapleyDesc":"公平贡献","guideMmmName":"MMM","guideMmmDesc":"52周","guideMarkovName":"Markov","guideMarkovDesc":"移除效应","guideAbName":"A/B","guideAbDesc":"测试","guideCohortName":"队列","guideCohortDesc":"留存","guideLtvName":"LTV/CAC","guideLtvDesc":"比较","guideAnomalyName":"异常","guideAnomalyDesc":"监控","guideCompareName":"A-Score","guideCompareDesc":"信度","guideTipsTitle":"技巧","guideTip1":"模型一致性越高越可靠","guideTip2":"Shapley高的渠道协同效应大","guideTip3":"MMM饱和度70%以上效率下降","guideTip4":"Z-score超过2.0需分析","guideTip5":"实时同步"},
  "zh-TW": {"tabGuideLabel":"📖 指南","tabGuideDesc":"使用方法","guideTitle":"歸因分析指南","guideSub":"9種模型分析","guideStepsTitle":"6步驟","guideStep1Title":"選擇MTA","guideStep1Desc":"5種模型","guideStep2Title":"Shapley","guideStep2Desc":"博弈論","guideStep3Title":"MMM","guideStep3Desc":"52週","guideStep4Title":"異常偵測","guideStep4Desc":"Z-score","guideStep5Title":"比較","guideStep5Desc":"雷達圖","guideStep6Title":"應用","guideStep6Desc":"即時","guideTabsTitle":"標籤","guideMtaName":"Multi-Touch","guideMtaDesc":"5模型","guideShapleyName":"Shapley","guideShapleyDesc":"公平","guideMmmName":"MMM","guideMmmDesc":"52週","guideMarkovName":"Markov","guideMarkovDesc":"移除","guideAbName":"A/B","guideAbDesc":"測試","guideCohortName":"隊列","guideCohortDesc":"留存","guideLtvName":"LTV/CAC","guideLtvDesc":"比較","guideAnomalyName":"異常","guideAnomalyDesc":"監控","guideCompareName":"A-Score","guideCompareDesc":"信度","guideTipsTitle":"技巧","guideTip1":"一致性高","guideTip2":"協同效應","guideTip3":"飽和度","guideTip4":"Z-score異常","guideTip5":"即時同步"},
  de: {"tabGuideLabel":"📖 Anleitung","tabGuideDesc":"Anleitung","guideTitle":"Attributions-Anleitung","guideSub":"9 Modelle","guideStepsTitle":"6 Schritte","guideStep1Title":"MTA-Modell","guideStep1Desc":"5 Modelle wählen","guideStep2Title":"Shapley","guideStep2Desc":"Spieltheorie","guideStep3Title":"MMM","guideStep3Desc":"52 Wochen","guideStep4Title":"Anomalie","guideStep4Desc":"Z-Score","guideStep5Title":"Vergleich","guideStep5Desc":"Radar","guideStep6Title":"Anwenden","guideStep6Desc":"Echtzeit","guideTabsTitle":"Tab-Guide","guideMtaName":"Multi-Touch","guideMtaDesc":"5 Modelle","guideShapleyName":"Shapley","guideShapleyDesc":"Fair","guideMmmName":"MMM","guideMmmDesc":"52W","guideMarkovName":"Markov","guideMarkovDesc":"Entfernung","guideAbName":"A/B","guideAbDesc":"Test","guideCohortName":"Kohorte","guideCohortDesc":"Retention","guideLtvName":"LTV/CAC","guideLtvDesc":"Vergleich","guideAnomalyName":"Anomalie","guideAnomalyDesc":"Überwachung","guideCompareName":"A-Score","guideCompareDesc":"Vertrauen","guideTipsTitle":"Tipps","guideTip1":"Konsistenz = Vertrauen","guideTip2":"Shapley-Synergie","guideTip3":"Sättigung 70%+","guideTip4":"Z-Score prüfen","guideTip5":"Echtzeit-Sync"},
  th: {"tabGuideLabel":"📖 คู่มือ","tabGuideDesc":"วิธีใช้","guideTitle":"คู่มือการวิเคราะห์","guideSub":"9 โมเดล","guideStepsTitle":"6 ขั้นตอน","guideStep1Title":"เลือก MTA","guideStep1Desc":"5 โมเดล","guideStep2Title":"Shapley","guideStep2Desc":"ทฤษฎีเกม","guideStep3Title":"MMM","guideStep3Desc":"52 สัปดาห์","guideStep4Title":"ตรวจจับ","guideStep4Desc":"Z-score","guideStep5Title":"เปรียบเทียบ","guideStep5Desc":"เรดาร์","guideStep6Title":"ใช้งาน","guideStep6Desc":"เรียลไทม์","guideTabsTitle":"คู่มือแท็บ","guideMtaName":"Multi-Touch","guideMtaDesc":"5 โมเดล","guideShapleyName":"Shapley","guideShapleyDesc":"ยุติธรรม","guideMmmName":"MMM","guideMmmDesc":"52 สัปดาห์","guideMarkovName":"Markov","guideMarkovDesc":"ลบออก","guideAbName":"A/B","guideAbDesc":"ทดสอบ","guideCohortName":"โคฮอร์ต","guideCohortDesc":"รักษา","guideLtvName":"LTV/CAC","guideLtvDesc":"เปรียบ","guideAnomalyName":"ตรวจจับ","guideAnomalyDesc":"ตรวจสอบ","guideCompareName":"A-Score","guideCompareDesc":"ความเชื่อ","guideTipsTitle":"เทคนิค","guideTip1":"ความสอดคล้องสูง","guideTip2":"Shapley สูง","guideTip3":"อิ่มตัว 70%","guideTip4":"Z-score ตรวจ","guideTip5":"ซิงค์เรียลไทม์"},
  vi: {"tabGuideLabel":"📖 Hướng dẫn","tabGuideDesc":"Cách dùng","guideTitle":"Hướng dẫn phân tích","guideSub":"9 mô hình","guideStepsTitle":"6 bước","guideStep1Title":"Chọn MTA","guideStep1Desc":"5 mô hình","guideStep2Title":"Shapley","guideStep2Desc":"Lý thuyết trò chơi","guideStep3Title":"MMM","guideStep3Desc":"52 tuần","guideStep4Title":"Phát hiện","guideStep4Desc":"Z-score","guideStep5Title":"So sánh","guideStep5Desc":"Radar","guideStep6Title":"Áp dụng","guideStep6Desc":"Real-time","guideTabsTitle":"Tab","guideMtaName":"Multi-Touch","guideMtaDesc":"5 mô hình","guideShapleyName":"Shapley","guideShapleyDesc":"Công bằng","guideMmmName":"MMM","guideMmmDesc":"52 tuần","guideMarkovName":"Markov","guideMarkovDesc":"Loại bỏ","guideAbName":"A/B","guideAbDesc":"Thử nghiệm","guideCohortName":"Đoàn hệ","guideCohortDesc":"Giữ chân","guideLtvName":"LTV/CAC","guideLtvDesc":"So sánh","guideAnomalyName":"Bất thường","guideAnomalyDesc":"Giám sát","guideCompareName":"A-Score","guideCompareDesc":"Tin cậy","guideTipsTitle":"Mẹo","guideTip1":"Nhất quán cao = tin cậy","guideTip2":"Shapley cao = hiệp đồng","guideTip3":"Bão hòa 70%+","guideTip4":"Z-score kiểm tra","guideTip5":"Đồng bộ real-time"},
  id: {"tabGuideLabel":"📖 Panduan","tabGuideDesc":"Cara pakai","guideTitle":"Panduan Atribusi","guideSub":"9 model","guideStepsTitle":"6 Langkah","guideStep1Title":"Pilih MTA","guideStep1Desc":"5 model","guideStep2Title":"Shapley","guideStep2Desc":"Teori permainan","guideStep3Title":"MMM","guideStep3Desc":"52 minggu","guideStep4Title":"Deteksi","guideStep4Desc":"Z-score","guideStep5Title":"Bandingkan","guideStep5Desc":"Radar","guideStep6Title":"Terapkan","guideStep6Desc":"Real-time","guideTabsTitle":"Panduan Tab","guideMtaName":"Multi-Touch","guideMtaDesc":"5 model","guideShapleyName":"Shapley","guideShapleyDesc":"Adil","guideMmmName":"MMM","guideMmmDesc":"52 minggu","guideMarkovName":"Markov","guideMarkovDesc":"Penghapusan","guideAbName":"A/B","guideAbDesc":"Uji","guideCohortName":"Kohort","guideCohortDesc":"Retensi","guideLtvName":"LTV/CAC","guideLtvDesc":"Banding","guideAnomalyName":"Anomali","guideAnomalyDesc":"Monitor","guideCompareName":"A-Score","guideCompareDesc":"Kepercayaan","guideTipsTitle":"Tips","guideTip1":"Konsistensi tinggi","guideTip2":"Shapley tinggi = sinergi","guideTip3":"Saturasi 70%+","guideTip4":"Z-score periksa","guideTip5":"Sinkron real-time"},
};

LANGS.forEach(lang => {
  const fp = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(fp)) return;
  const raw = fs.readFileSync(fp, 'utf8');
  const obj = JSON.parse(raw.replace(/^export\s+default\s+/, '').replace(/;\s*$/, ''));
  if (!obj.attrData) obj.attrData = {};
  const k = keys[lang] || keys.en;
  Object.assign(obj.attrData, k);
  fs.writeFileSync(fp, 'export default ' + JSON.stringify(obj) + ';', 'utf8');
  console.log(`✅ [${lang}] attrData guide: ${Object.keys(k).length} keys`);
});
console.log('\n🎉 Attribution guide i18n complete!');
