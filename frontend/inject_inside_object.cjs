/**
 * inject_inside_object.cjs
 * Inserts translation keys INSIDE the main locale object,
 * right before the }; before export default.
 */
const fs = require('fs');

const LOCALE_ADD = {
  ko: {
    aiPredict: { pageTitle:'AI 예측 분석 허브', pageSub:'구매확률·LTV·이탈스코어·추천엔진·ML', liveDB:'🟢 실시간 DB', demoSim:'🟡 데모 시뮬레이션', loading:'ML 모델에서 예측 데이터 로드 중...', filterAll:'전체 위험도', filterHigh:'🔴 이탈위험', filterMed:'🟡 중간위험', filterLow:'🟢 안전', noResults:'검색 결과 없음', retry:'재시도', bulkAction:'⚡ 이탈 일괄 대응', kpi:{target:'예측 대상', churnRisk:'이탈 위험', churnAction:'즉시 개입 필요', highLtv:'고LTV 잠재', highLtvSub:'CLV ₩3M 이상', revenue:'30일 예측 매출', revenueSub:'+18% 성장 예상', mlAccuracy:'ML 정확도', mlSub:'매일 04:00 재학습'}, tab:{customers:'👤 고객 예측', ltv:'💰 LTV 세그먼트', graph:'🕸️ 그래프 스코어', model:'⚙️ 모델 성능', integration:'🔗 연동 현황'}, col:{prob30:'30일 구매확률', churn:'이탈 위험', ltv12:'LTV 12개월', nextPurchase:'다음 구매 예측', detail:'→ 상세'}, grade:{champions:'챔피언스', loyal:'충성고객', new:'신규', churnRisk:'이탈위험', churned:'이탈'} },
    journeyTpl: { cartDesc:'이탈 고객을 Email+Kakao로 재유치', onboardDesc:'가입 후 3단계 자동 케어', vipDesc:'VIP 세그먼트 자동 케어', churnDesc:'고위험 이탈 고객 자동 대응', bdayDesc:'생일 고객 자동 쿠폰' },
    aiRec: { salesInfo:'📦 판매 제품 정보', catalogAuto:'카탈로그 자동 입력', skuCount:'상품명/SKU 수', monthlyQty:'월 판매 목표', avgPrice:'평균 단가', marginRate:'마진율', goalRevenue:'목표 매출', mainChannels:'주요 판매 채널', searchPh:'예: "뷰티 브랜드 인스타그램 광고 전략" 또는 마케팅 목표 입력' },
    cat: { beauty:'💄 뷰티·코스메틱', fashion:'👗 패션·의류', general:'🛍 생활·잡화', food:'🥗 식품·건강', electronics:'📱 전자·IT', forwarding:'🚢 배송대행', purchasing:'🛒 구매대행', travel:'✈️ 여행·숙박', digital:'💻 디지털·앱', sports:'⚽ 스포츠·레저' }
  },
  en: {
    aiPredict: { pageTitle:'AI Forecast Analysis Hub', pageSub:'Purchase Probability · LTV Forecast · Churn Score · Product Recommend Engine · ML', liveDB:'🟢 Live DB', demoSim:'🟡 Demo Simulation', loading:'Loading forecast data from ML models...', filterAll:'All Risk Levels', filterHigh:'🔴 Churn Risk', filterMed:'🟡 Medium Risk', filterLow:'🟢 Safe', noResults:'No results found', retry:'Retry', bulkAction:'⚡ Bulk Churn Action', kpi:{target:'Forecast Target', churnRisk:'Churn Risk', churnAction:'Immediate action needed', highLtv:'High LTV Potential', highLtvSub:'CLV ₩3M+', revenue:'30-day Forecast Revenue', revenueSub:'+18% Growth Expected', mlAccuracy:'ML Model Accuracy', mlSub:'Daily retrain at 04:00'}, tab:{customers:'👤 Customer Forecast', ltv:'💰 LTV Segments', graph:'🕸️ Graph Score', model:'⚙️ Model Performance', integration:'🔗 Integration Status'}, col:{prob30:'30-day Purchase Prob.', churn:'Churn Risk', ltv12:'LTV 12-month', nextPurchase:'Next Purchase Est.', detail:'→ Details'}, grade:{champions:'Champions', loyal:'Loyal', new:'New', churnRisk:'Churn Risk', churned:'Churned'} },
    journeyTpl: { cartDesc:'Re-engage churned customers via Email + Kakao', onboardDesc:'3-step automated care after signup', vipDesc:'Auto care for VIP segment', churnDesc:'Auto stop high-risk churn customers', bdayDesc:'Auto coupon for birthday customers' },
    aiRec: { salesInfo:'📦 Sales Product Info', catalogAuto:'Catalog Auto-filled', skuCount:'Product Name/SKU Count', monthlyQty:'Monthly Sales Goal', avgPrice:'Avg. Unit Price', marginRate:'Margin Rate', goalRevenue:'Goal Revenue', mainChannels:'Main Sales Channels (multi-select)', searchPh:'e.g. "Beauty brand Instagram ad strategy" or enter your marketing goal' },
    cat: { beauty:'💄 Beauty & Cosmetics', fashion:'👗 Fashion & Apparel', general:'🛍 General & Household', food:'🥗 Food & Health', electronics:'📱 Electronics & IT', forwarding:'🚢 Freight Forwarding', purchasing:'🛒 Personal Shopping', travel:'✈️ Travel & Accommodation', digital:'💻 Digital & Apps', sports:'⚽ Sports & Leisure' }
  },
  ja: {
    aiPredict: { pageTitle:'AI予測分析ハブ', pageSub:'購買確率・LTV予測・チャーンスコア・商品推薦エンジン・ML', liveDB:'🟢 ライブDB', demoSim:'🟡 デモシミュレーション', loading:'MLモデルからデータ読み込み中...', filterAll:'全リスクレベル', filterHigh:'🔴 チャーンリスク', filterMed:'🟡 中リスク', filterLow:'🟢 安全', noResults:'結果なし', retry:'再試行', bulkAction:'⚡ 一括チャーン対応', kpi:{target:'予測対象', churnRisk:'チャーンリスク', churnAction:'即座の対応が必要', highLtv:'高LTV潜在力', highLtvSub:'CLV ₩3M以上', revenue:'30日間収益予測', revenueSub:'+18%成長予測', mlAccuracy:'MLモデル精度', mlSub:'毎日04:00再学習'}, tab:{customers:'👤 顧客予測', ltv:'💰 LTVセグメント', graph:'🕸️ グラフスコア', model:'⚙️ モデル性能', integration:'🔗 統合状況'}, col:{prob30:'30日購買確率', churn:'チャーンリスク', ltv12:'LTV 12ヶ月', nextPurchase:'次回購入予測', detail:'→ 詳細'}, grade:{champions:'チャンピオン', loyal:'忠実', new:'新規', churnRisk:'チャーンリスク', churned:'離脱'} },
    journeyTpl: { cartDesc:'離脱顧客をメール+Kakaoで再エンゲージ', onboardDesc:'登録後3ステップ自動ケア', vipDesc:'VIPセグメント自動ケア', churnDesc:'高リスクチャーン自動対応', bdayDesc:'誕生日自動クーポン' },
    aiRec: { salesInfo:'📦 販売商品情報', catalogAuto:'カタログ自動入力', skuCount:'商品名/SKU数', monthlyQty:'月間販売目標', avgPrice:'平均単価', marginRate:'マージン率', goalRevenue:'目標売上', mainChannels:'主要販売チャネル（複数選択）', searchPh:'例：「ビューティのInstagram広告戦略」またはマーケティング目標を入力' },
    cat: { beauty:'💄 ビューティ・コスメ', fashion:'👗 ファッション・アパレル', general:'🛍 生活雑貨', food:'🥗 食品・健康', electronics:'📱 電子・IT', forwarding:'🚢 配送代行', purchasing:'🛒 個人購買代行', travel:'✈️ 旅行・宿泊', digital:'💻 デジタル・アプリ', sports:'⚽ スポーツ・レジャー' }
  },
  zh: {
    aiPredict: { pageTitle:'AI预测分析中心', pageSub:'购买概率·LTV·流失评分·推荐·ML', liveDB:'🟢 实时DB', demoSim:'🟡 演示模拟', loading:'从ML模型加载预测数据...', filterAll:'全部风险', filterHigh:'🔴 流失风险', filterMed:'🟡 中等风险', filterLow:'🟢 安全', noResults:'未找到结果', retry:'重试', bulkAction:'⚡ 批量流失处理', kpi:{target:'预测目标', churnRisk:'流失风险', churnAction:'需要立即行动', highLtv:'高LTV潜力', highLtvSub:'CLV ₩3M+', revenue:'30天预测收入', revenueSub:'+18%增长预期', mlAccuracy:'ML模型精度', mlSub:'每天04:00重新训练'}, tab:{customers:'👤 客户预测', ltv:'💰 LTV细分', graph:'🕸️ 图谱评分', model:'⚙️ 模型性能', integration:'🔗 集成状态'}, col:{prob30:'30天购买概率', churn:'流失风险', ltv12:'LTV 12个月', nextPurchase:'下次购买预测', detail:'→ 详情'}, grade:{champions:'冠军', loyal:'忠诚', new:'新客', churnRisk:'流失风险', churned:'已流失'} },
    journeyTpl: { cartDesc:'通过邮件+Kakao重新吸引流失客户', onboardDesc:'注册后3步自动关怀', vipDesc:'VIP细分自动关怀', churnDesc:'自动处理高风险流失', bdayDesc:'生日自动优惠券' },
    aiRec: { salesInfo:'📦 销售产品信息', catalogAuto:'目录自动填写', skuCount:'产品名/SKU数', monthlyQty:'月销售目标', avgPrice:'平均单价', marginRate:'利润率', goalRevenue:'目标收入', mainChannels:'主要销售渠道（多选）', searchPh:'例："美妆品牌Instagram广告策略"或输入营销目标' },
    cat: { beauty:'💄 美妆·彩妆', fashion:'👗 时尚·服装', general:'🛍 生活·杂货', food:'🥗 食品·健康', electronics:'📱 电子·IT', forwarding:'🚢 货运代理', purchasing:'🛒 个人购物代理', travel:'✈️ 旅行·住宿', digital:'💻 数字·应用', sports:'⚽ 运动·休闲' }
  },
  de: {
    aiPredict: { pageTitle:'KI-Prognose-Hub', pageSub:'Kaufwahrsch. · LTV · Abwanderung · Empfehlung · ML', liveDB:'🟢 Live DB', demoSim:'🟡 Demo-Simulation', loading:'ML-Prognosedaten laden...', filterAll:'Alle Risikostufen', filterHigh:'🔴 Abwanderungsrisiko', filterMed:'🟡 Mittleres Risiko', filterLow:'🟢 Sicher', noResults:'Keine Ergebnisse', retry:'Erneut', bulkAction:'⚡ Massen-Churn', kpi:{target:'Prognose-Zielgruppe', churnRisk:'Abwanderungsrisiko', churnAction:'Sofortmaßnahmen', highLtv:'Hohes LTV-Potenzial', highLtvSub:'CLV ₩3M+', revenue:'30-Tage-Umsatz', revenueSub:'+18% Wachstum', mlAccuracy:'ML-Genauigkeit', mlSub:'Neutraining 04:00'}, tab:{customers:'👤 Kundenprognose', ltv:'💰 LTV-Segmente', graph:'🕸️ Graphen-Score', model:'⚙️ Modell-Leistung', integration:'🔗 Integrationsstatus'}, col:{prob30:'30-Tage-Kaufwahrsch.', churn:'Abwanderungsrisiko', ltv12:'LTV 12-Monate', nextPurchase:'Nächste Kaufprognose', detail:'→ Details'}, grade:{champions:'Champions', loyal:'Treue', new:'Neu', churnRisk:'Abwanderungsrisiko', churned:'Abgewandert'} },
    journeyTpl: { cartDesc:'Abgewanderte per E-Mail+Kakao reaktivieren', onboardDesc:'3-stufige Pflege nach Anmeldung', vipDesc:'Automatische Pflege VIP', churnDesc:'Hochrisikoabwanderer stoppen', bdayDesc:'Geburtstagsgutschein' },
    aiRec: { salesInfo:'📦 Verkaufsproduktinfo', catalogAuto:'Katalog automatisch', skuCount:'Produktname/SKU', monthlyQty:'Monatl. Verkaufsziel', avgPrice:'Durchschnittspreis', marginRate:'Margenrate', goalRevenue:'Zielumsatz', mainChannels:'Hauptkanäle (Mehrfachauswahl)', searchPh:'z.B. "Beauty-Strategie" oder Ziel' },
    cat: { beauty:'💄 Beauty & Kosmetik', fashion:'👗 Mode & Bekleidung', general:'🛍 Haushalt', food:'🥗 Lebensmittel & Gesundheit', electronics:'📱 Elektronik & IT', forwarding:'🚢 Frachtspedition', purchasing:'🛒 Einkaufen', travel:'✈️ Reise & Unterkunft', digital:'💻 Digital & Apps', sports:'⚽ Sport & Freizeit' }
  },
  th: {
    aiPredict: { pageTitle:'ศูนย์วิเคราะห์ AI', pageSub:'ความน่าจะเป็นซื้อ·LTV·คะแนนออก·แนะนำ·ML', liveDB:'🟢 DB สด', demoSim:'🟡 จำลองสาธิต', loading:'กำลังโหลดข้อมูล ML...', filterAll:'ทุกระดับความเสี่ยง', filterHigh:'🔴 ความเสี่ยงสูง', filterMed:'🟡 ความเสี่ยงกลาง', filterLow:'🟢 ปลอดภัย', noResults:'ไม่พบผลลัพธ์', retry:'ลองใหม่', bulkAction:'⚡ การดำเนินการออก', kpi:{target:'เป้าหมายพยากรณ์', churnRisk:'ความเสี่ยงออก', churnAction:'ต้องดำเนินการทันที', highLtv:'LTV สูง', highLtvSub:'CLV ₩3M+', revenue:'รายได้ 30 วัน', revenueSub:'+18% เติบโต', mlAccuracy:'ความแม่นยำ ML', mlSub:'ฝึกใหม่ 04:00'}, tab:{customers:'👤 พยากรณ์ลูกค้า', ltv:'💰 กลุ่ม LTV', graph:'🕸️ คะแนนกราฟ', model:'⚙️ ประสิทธิภาพ', integration:'🔗 สถานะ'}, col:{prob30:'ความน่าจะเป็น 30 วัน', churn:'ความเสี่ยง', ltv12:'LTV 12 เดือน', nextPurchase:'ซื้อครั้งหน้า', detail:'→ รายละเอียด'}, grade:{champions:'แชมเปี้ยน', loyal:'ประจำ', new:'ใหม่', churnRisk:'ความเสี่ยง', churned:'ออก'} },
    journeyTpl: { cartDesc:'ดึงลูกค้ากลับผ่าน Email+Kakao', onboardDesc:'ดูแลอัตโนมัติ 3 ขั้น', vipDesc:'ดูแลอัตโนมัติ VIP', churnDesc:'หยุดผู้มีความเสี่ยงสูง', bdayDesc:'คูปองวันเกิด' },
    aiRec: { salesInfo:'📦 ข้อมูลสินค้าขาย', catalogAuto:'กรอกจากแคตตาล็อก', skuCount:'ชื่อสินค้า/SKU', monthlyQty:'เป้าหมายรายเดือน', avgPrice:'ราคาเฉลี่ย', marginRate:'อัตรากำไร', goalRevenue:'รายได้เป้าหมาย', mainChannels:'ช่องทางหลัก', searchPh:'เช่น "กลยุทธ์ Instagram"' },
    cat: { beauty:'💄 ความงาม', fashion:'👗 แฟชั่น', general:'🛍 สินค้าทั่วไป', food:'🥗 อาหาร·สุขภาพ', electronics:'📱 อิเล็กทรอนิกส์', forwarding:'🚢 ตัวแทนจัดส่ง', purchasing:'🛒 ตัวแทนซื้อ', travel:'✈️ การท่องเที่ยว', digital:'💻 ดิจิทัล', sports:'⚽ กีฬา' }
  },
  vi: {
    aiPredict: { pageTitle:'Trung tâm dự báo AI', pageSub:'Xác suất mua·LTV·Điểm rời bỏ·Gợi ý·ML', liveDB:'🟢 DB Trực tuyến', demoSim:'🟡 Mô phỏng', loading:'Đang tải dữ liệu ML...', filterAll:'Tất cả mức rủi ro', filterHigh:'🔴 Nguy cơ rời bỏ', filterMed:'🟡 Rủi ro trung bình', filterLow:'🟢 An toàn', noResults:'Không tìm thấy', retry:'Thử lại', bulkAction:'⚡ Xử lý hàng loạt', kpi:{target:'Mục tiêu dự báo', churnRisk:'Rủi ro rời bỏ', churnAction:'Cần hành động ngay', highLtv:'LTV cao', highLtvSub:'CLV ₩3M+', revenue:'Doanh thu 30 ngày', revenueSub:'+18% Tăng trưởng', mlAccuracy:'Độ chính xác ML', mlSub:'Huấn luyện lại 04:00'}, tab:{customers:'👤 Dự báo khách hàng', ltv:'💰 Phân khúc LTV', graph:'🕸️ Điểm đồ thị', model:'⚙️ Hiệu suất', integration:'🔗 Trạng thái'}, col:{prob30:'Xác suất mua 30 ngày', churn:'Rủi ro', ltv12:'LTV 12 tháng', nextPurchase:'Mua tiếp theo', detail:'→ Chi tiết'}, grade:{champions:'Vô địch', loyal:'Trung thành', new:'Mới', churnRisk:'Nguy cơ', churned:'Đã rời bỏ'} },
    journeyTpl: { cartDesc:'Thu hút lại qua Email+Kakao', onboardDesc:'Chăm sóc 3 bước', vipDesc:'Chăm sóc VIP', churnDesc:'Xử lý rời bỏ cao', bdayDesc:'Phiếu giảm giá sinh nhật' },
    aiRec: { salesInfo:'📦 Thông tin sản phẩm', catalogAuto:'Tự động điền', skuCount:'Tên/SKU', monthlyQty:'Mục tiêu tháng', avgPrice:'Giá trung bình', marginRate:'Tỷ lệ lợi nhuận', goalRevenue:'Doanh thu mục tiêu', mainChannels:'Kênh chính', searchPh:'VD: "Chiến lược quảng cáo"' },
    cat: { beauty:'💄 Làm đẹp', fashion:'👗 Thời trang', general:'🛍 Hàng gia dụng', food:'🥗 Thực phẩm', electronics:'📱 Điện tử', forwarding:'🚢 Vận chuyển', purchasing:'🛒 Mua sắm', travel:'✈️ Du lịch', digital:'💻 Số', sports:'⚽ Thể thao' }
  },
  id: {
    aiPredict: { pageTitle:'Pusat Analisis AI', pageSub:'Prob. Pembelian·LTV·Churn·Rekomendasi·ML', liveDB:'🟢 DB Langsung', demoSim:'🟡 Simulasi', loading:'Memuat data ML...', filterAll:'Semua Tingkat', filterHigh:'🔴 Risiko Churn', filterMed:'🟡 Risiko Sedang', filterLow:'🟢 Aman', noResults:'Tidak ada hasil', retry:'Coba lagi', bulkAction:'⚡ Tindakan Massal', kpi:{target:'Target Forecast', churnRisk:'Risiko Churn', churnAction:'Tindakan segera', highLtv:'LTV Tinggi', highLtvSub:'CLV ₩3M+', revenue:'Pendapatan 30 Hari', revenueSub:'+18% Pertumbuhan', mlAccuracy:'Akurasi ML', mlSub:'Latih ulang 04:00'}, tab:{customers:'👤 Prakiraan', ltv:'💰 Segmen LTV', graph:'🕸️ Skor Grafik', model:'⚙️ Kinerja', integration:'🔗 Status'}, col:{prob30:'Prob. 30 Hari', churn:'Risiko Churn', ltv12:'LTV 12 Bulan', nextPurchase:'Beli Berikut', detail:'→ Detail'}, grade:{champions:'Champions', loyal:'Setia', new:'Baru', churnRisk:'Risiko', churned:'Churn'} },
    journeyTpl: { cartDesc:'Reaktivasi via Email+Kakao', onboardDesc:'Perawatan 3 langkah', vipDesc:'Perawatan VIP', churnDesc:'Hentikan churn', bdayDesc:'Kupon ulang tahun' },
    aiRec: { salesInfo:'📦 Info Produk', catalogAuto:'Katalog Otomatis', skuCount:'Nama/SKU', monthlyQty:'Target Bulanan', avgPrice:'Harga Rata-rata', marginRate:'Margin', goalRevenue:'Pendapatan Target', mainChannels:'Saluran Utama', searchPh:'Misal: "Strategi iklan"' },
    cat: { beauty:'💄 Kecantikan', fashion:'👗 Mode', general:'🛍 Rumah Tangga', food:'🥗 Makanan', electronics:'📱 Elektronik', forwarding:'🚢 Pengiriman', purchasing:'🛒 Belanja', travel:'✈️ Perjalanan', digital:'💻 Digital', sports:'⚽ Olahraga' }
  },
  'zh-TW': {
    aiPredict: { pageTitle:'AI預測分析中心', pageSub:'購買概率·LTV·流失·推薦·ML', liveDB:'🟢 即時DB', demoSim:'🟡 演示模擬', loading:'正在載入ML資料...', filterAll:'所有風險', filterHigh:'🔴 流失風險', filterMed:'🟡 中等風險', filterLow:'🟢 安全', noResults:'未找到結果', retry:'重試', bulkAction:'⚡ 批量處理', kpi:{target:'預測目標', churnRisk:'流失風險', churnAction:'需要立即行動', highLtv:'高LTV潛力', highLtvSub:'CLV ₩3M+', revenue:'30天預測收入', revenueSub:'+18%增長', mlAccuracy:'ML準確度', mlSub:'每天04:00重新訓練'}, tab:{customers:'👤 客戶預測', ltv:'💰 LTV細分', graph:'🕸️ 圖譜評分', model:'⚙️ 模型效能', integration:'🔗 整合狀態'}, col:{prob30:'30天購買概率', churn:'流失風險', ltv12:'LTV 12個月', nextPurchase:'下次購買', detail:'→ 詳情'}, grade:{champions:'冠軍', loyal:'忠誠', new:'新客', churnRisk:'流失風險', churned:'已流失'} },
    journeyTpl: { cartDesc:'透過Email+Kakao重新吸引', onboardDesc:'3步自動關懷', vipDesc:'VIP自動關懷', churnDesc:'自動處理高風險', bdayDesc:'生日優惠券' },
    aiRec: { salesInfo:'📦 銷售產品資訊', catalogAuto:'目錄自動', skuCount:'產品名/SKU', monthlyQty:'每月目標', avgPrice:'平均單價', marginRate:'利潤率', goalRevenue:'目標收入', mainChannels:'主要管道', searchPh:'例："美妝廣告策略"' },
    cat: { beauty:'💄 美妝', fashion:'👗 時尚', general:'🛍 生活雜貨', food:'🥗 食品', electronics:'📱 電子', forwarding:'🚢 貨運', purchasing:'🛒 購物', travel:'✈️ 旅行', digital:'💻 數位', sports:'⚽ 運動' }
  }
};

function toJsObj(obj, indent) {
  let s = '{\n';
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      s += `${indent}    ${k}: ${JSON.stringify(v)},\n`;
    } else {
      s += `${indent}    ${k}: ${toJsObj(v, indent + '    ')}`;
    }
  }
  s += `${indent}},\n`;
  return s;
}

const BASE = 'src/i18n/locales';
const FILE_MAP = { ko:'ko', en:'en', ja:'ja', zh:'zh', de:'de', th:'th', vi:'vi', id:'id', 'zh-TW':'zh-TW' };
const VAR_MAP  = { ko:'ko', en:'en', ja:'ja', zh:'zh', de:'de', th:'th', vi:'vi', id:'id', 'zh-TW':'zhTW' };

for (const [lang, data] of Object.entries(LOCALE_ADD)) {
  const fpath = `${BASE}/${FILE_MAP[lang]}.js`;
  let content = fs.readFileSync(fpath, 'utf8');
  
  // Remove any previously inserted auto-gen sections (both inside and outside)
  // Pattern: // ── i18n Auto Keys ── ... until next top-level section or end
  content = content.replace(/\n\n    \/\/ ── (?:Auto-generated|i18n Auto) i18n keys? ──[\s\S]*?(?=\n\n};|\n};)/g, '');
  content = content.replace(/\n\n    \/\/ ─+ i18n Auto Keys ─+[\s\S]*?(?=\n\n};|\n};)/g, '');
  
  // CRITICAL: Find the }; that is BEFORE 'export default'
  // This is the one that closes the main object
  const exportIdx = content.indexOf('export default');
  if (exportIdx < 0) {
    console.log(`WARN: no export default in ${lang}`);
    continue;
  }
  
  // Find the last }; before export default
  const mainCloseIdx = content.lastIndexOf('};', exportIdx);
  if (mainCloseIdx < 0) {
    console.log(`WARN: no }; before export default in ${lang}`);
    continue;
  }
  
  // Build the section to insert
  let insertSection = '\n\n    // ── i18n Auto Keys ──\n';
  for (const [sKey, sData] of Object.entries(data)) {
    insertSection += `    ${sKey}: ${toJsObj(sData, '    ')}`;
  }
  
  // Insert BEFORE the main closing };
  content = content.slice(0, mainCloseIdx) + insertSection + '\n' + content.slice(mainCloseIdx);
  
  fs.writeFileSync(fpath, content, 'utf8');
  
  // Verify: aiRec should now appear before export default  
  const newExportIdx = content.indexOf('export default');
  const newAirIdx = content.indexOf('aiRec:');
  const insertOK = newAirIdx > 0 && newAirIdx < newExportIdx;
  console.log(`✓ ${lang}: aiRec at ${newAirIdx}, export at ${newExportIdx}, inside=${insertOK}`);
}

console.log('\nDone!');
