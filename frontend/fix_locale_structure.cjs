/**
 * fix_locale_structure.cjs
 * Rewrites the auto-generated sections in locale files to use proper nested objects
 * instead of dot-notation string keys.
 * Example: 'kpi.target': '...' → kpi: { target: '...' }
 */
const fs = require('fs');

const LANGS = ['en','ja','zh','de','th','vi','id','zh-TW','ko'];
const LANG_IDX = { en:0, ja:1, zh:2, de:3, th:4, vi:5, id:6, 'zh-TW':7, ko:8 };
const BASE = 'src/i18n/locales';

// Complete structured translation data (nested format)
const TRANSLATIONS = {
  aiPredict: {
    pageTitle: ['AI Forecast Analysis Hub','AI予測分析ハブ','AI预测分析中心','KI-Prognose-Hub','ศูนย์วิเคราะห์ AI','Trung tâm dự báo AI','Pusat Analisis AI','AI預測分析中心','AI 예측 분석 허브'],
    pageSub: ['Purchase Probability · LTV Forecast · Churn Score · Product Recommend Engine · ML Model Performance','購買確率・LTV予測・チャーンスコア・商品推薦エンジン・ML性能','购买概率·LTV预测·流失评分·商品推荐引擎·ML性能','Kaufwahrsch. · LTV-Prognose · Abwanderung · Empfehlungs-Engine · ML','ความน่าจะเป็นซื้อ · LTV · คะแนนออก · แนะนำ · ML','Xác suất mua · LTV · Điểm rời bỏ · Gợi ý · ML','Prob. Pembelian · LTV · Skor Churn · Rekomendasi · ML','購買概率·LTV預測·流失評分·推薦·ML','구매확률·LTV·이탈스코어·추천엔진·ML'],
    liveDB: ['🟢 Live DB','🟢 ライブDB','🟢 实时DB','🟢 Live DB','🟢 DB สด','🟢 DB Trực tuyến','🟢 DB Langsung','🟢 即時DB','🟢 실시간 DB'],
    demoSim: ['🟡 Demo Simulation','🟡 デモシミュレーション','🟡 演示模拟','🟡 Demo-Simulation','🟡 จำลองสาธิต','🟡 Mô phỏng Demo','🟡 Simulasi Demo','🟡 演示模擬','🟡 데모 시뮬레이션'],
    loading: ['Loading forecast data from ML models...','MLモデルからデータ読み込み中...','从ML模型加载预测数据...','ML-Prognosedaten laden...','กำลังโหลดข้อมูล ML...','Đang tải dữ liệu ML...','Memuat data ML...','正在載入ML預測資料...','ML 모델 데이터 로드 중...'],
    filterAll: ['All Risk Levels','全リスクレベル','全部风险','Alle Risikostufen','ทุกระดับความเสี่ยง','Tất cả mức rủi ro','Semua Tingkat','所有風險','전체 위험도'],
    filterHigh: ['🔴 Churn Risk','🔴 チャーンリスク','🔴 流失风险','🔴 Abwanderungsrisiko','🔴 ความเสี่ยงสูง','🔴 Nguy cơ rời bỏ','🔴 Risiko Churn','🔴 流失風險','🔴 이탈위험'],
    filterMed: ['🟡 Medium Risk','🟡 中リスク','🟡 中等风险','🟡 Mittleres Risiko','🟡 ความเสี่ยงกลาง','🟡 Rủi ro trung bình','🟡 Risiko Sedang','🟡 中等風險','🟡 중간위험'],
    filterLow: ['🟢 Safe','🟢 安全','🟢 安全','🟢 Sicher','🟢 ปลอดภัย','🟢 An toàn','🟢 Aman','🟢 安全','🟢 안전'],
    noResults: ['No results found','結果なし','未找到结果','Keine Ergebnisse','ไม่พบผลลัพธ์','Không tìm thấy','Tidak ada hasil','未找到結果','결과 없음'],
    retry: ['Retry','再試行','重试','Erneut','ลองใหม่','Thử lại','Coba lagi','重試','재시도'],
    bulkAction: ['⚡ Bulk Churn Action','⚡ 一括チャーン対応','⚡ 批量流失处理','⚡ Massen-Abwanderung','⚡ การดำเนินการออก','⚡ Xử lý rời bỏ hàng loạt','⚡ Tindakan Churn Massal','⚡ 批量流失處理','⚡ 이탈 일괄 대응'],
    kpi: {
      target: ['Forecast Target','予測対象','预测目标','Prognose-Zielgruppe','เป้าหมายพยากรณ์','Mục tiêu dự báo','Target Forecast','預測目標','예측 대상'],
      churnRisk: ['Churn Risk','チャーンリスク','流失风险','Abwanderungsrisiko','ความเสี่ยงออก','Rủi ro rời bỏ','Risiko Churn','流失風險','이탈 위험'],
      churnAction: ['Immediate action needed','即座の対応が必要','需要立即行动','Sofortmaßnahmen','ต้องดำเนินการทันที','Cần hành động ngay','Tindakan segera','需要立即行動','즉시 개입 필요'],
      highLtv: ['High LTV Potential','高LTV潜在力','高LTV潜力','Hohes LTV-Potenzial','LTV สูง','LTV cao','LTV Tinggi','高LTV潛力','고LTV 잠재'],
      highLtvSub: ['CLV ₩3M+','CLV ₩3M以上','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M 이상'],
      revenue: ['30-day Forecast Revenue','30日間収益予測','30天预测收入','30-Tage-Umsatzprognose','รายได้ 30 วัน','Doanh thu 30 ngày','Pendapatan 30 Hari','30天預測收入','30일 예측 매출'],
      revenueSub: ['+18% Growth Expected','+18%成長予測','+18%增长预期','+18% Wachstum','+18% เติบโต','+18% Tăng trưởng','+18% Pertumbuhan','+18%增長','+18% 성장 예상'],
      mlAccuracy: ['ML Model Accuracy','MLモデル精度','ML模型精度','ML-Modellgenauigkeit','ความแม่นยำ ML','Độ chính xác ML','Akurasi ML','ML模型準確度','ML 정확도'],
      mlSub: ['Daily retrain at 04:00','毎日04:00再学習','每天04:00重新训练','Tägl. Neutraining 04:00','ฝึกใหม่ 04:00','Huấn luyện lại 04:00','Latih ulang 04:00','每天04:00重新訓練','매일 04:00 재학습'],
    },
    tab: {
      customers: ['👤 Customer Forecast','👤 顧客予測','👤 客户预测','👤 Kundenprognose','👤 พยากรณ์ลูกค้า','👤 Dự báo khách hàng','👤 Prakiraan','👤 客戶預測','👤 고객 예측'],
      ltv: ['💰 LTV Segments','💰 LTVセグメント','💰 LTV细分','💰 LTV-Segmente','💰 กลุ่ม LTV','💰 Phân khúc LTV','💰 Segmen LTV','💰 LTV細分','💰 LTV 세그먼트'],
      graph: ['🕸️ Graph Score','🕸️ グラフスコア','🕸️ 图谱评分','🕸️ Graphen-Score','🕸️ คะแนนกราฟ','🕸️ Điểm đồ thị','🕸️ Skor Grafik','🕸️ 圖譜評分','🕸️ 그래프 스코어'],
      model: ['⚙️ Model Performance','⚙️ モデル性能','⚙️ 模型性能','⚙️ Modell-Leistung','⚙️ ประสิทธิภาพ','⚙️ Hiệu suất','⚙️ Kinerja Model','⚙️ 模型效能','⚙️ 모델 성능'],
      integration: ['🔗 Integration Status','🔗 統合状況','🔗 集成状态','🔗 Integrationsstatus','🔗 สถานะ','🔗 Trạng thái','🔗 Status Integrasi','🔗 整合狀態','🔗 연동 현황'],
    },
    col: {
      prob30: ['30-day Purchase Prob.','30日購買確率','30天购买概率','30-Tage-Kauf.','ความน่าจะเป็น 30 วัน','Xác suất mua 30 ngày','Prob. 30 Hari','30天購買概率','30일 구매확률'],
      churn: ['Churn Risk','チャーンリスク','流失风险','Abwanderung','ความเสี่ยง','Rủi ro rời bỏ','Risiko Churn','流失風險','이탈 위험'],
      ltv12: ['LTV 12-month','LTV 12ヶ月','LTV 12个月','LTV 12-Monate','LTV 12 เดือน','LTV 12 tháng','LTV 12 Bulan','LTV 12個月','LTV 12개월'],
      nextPurchase: ['Next Purchase Est.','次回購入予測','下次购买预测','Nächste Kaufprognose','ซื้อครั้งหน้า','Mua tiếp theo','Pembelian Berikut','下次購買','다음 구매 예측'],
      detail: ['→ Details','→ 詳細','→ 详情','→ Details','→ รายละเอียด','→ Chi tiết','→ Detail','→ 詳情','→ 상세'],
    },
    grade: {
      champions: ['Champions','チャンピオン','冠军','Champions','แชมเปี้ยน','Vô địch','Champions','冠軍','챔피언스'],
      loyal: ['Loyal','忠実','忠诚','Treue','ประจำ','Trung thành','Setia','忠誠','충성'],
      new: ['New','新規','新客','Neu','ใหม่','Mới','Baru','新客','신규'],
      churnRisk: ['Churn Risk','チャーンリスク','流失风险','Abwanderungsrisiko','ความเสี่ยง','Nguy cơ','Risiko Churn','流失風險','이탈위험'],
      churned: ['Churned','離脱','已流失','Abgewandert','ออก','Đã rời bỏ','Churn','已流失','이탈'],
    },
  },
  journeyTpl: {
    cartDesc: ['Re-engage churned customers via Email + Kakao','離脱顧客をメール+Kakaoで再エンゲージ','通过邮件+Kakao重新吸引流失客户','Abgewanderte per E-Mail+Kakao reaktivieren','ดึงลูกค้ากลับผ่าน Email+Kakao','Thu hút lại qua Email+Kakao','Reaktivasi pelanggan via Email+Kakao','透過Email+Kakao重新吸引流失客戶','이탈 고객 Email+Kakao 재유치'],
    onboardDesc: ['3-step automated care after signup','登録後3ステップ自動ケア','注册后3步自动关怀','3-stufige Pflege nach Anmeldung','ดูแลอัตโนมัติ 3 ขั้นหลังสมัคร','Chăm sóc 3 bước sau đăng ký','Perawatan 3 langkah setelah daftar','註冊後3步自動關懷','가입 후 3단계 자동 케어'],
    vipDesc: ['Auto care for VIP segment','VIPセグメント自動ケア','VIP细分自动关怀','Automatische Pflege für VIP','ดูแลอัตโนมัติ VIP','Chăm sóc tự động VIP','Perawatan otomatis VIP','VIP細分自動關懷','VIP 세그먼트 자동 케어'],
    churnDesc: ['Auto stop high-risk churn customers','高リスクチャーン自動対応','自动处理高风险流失','Hochrisikoabwanderer automatisch','หยุดผู้มีความเสี่ยงสูง','Tự động xử lý rời bỏ cao','Hentikan churn berisiko','自動處理高風險流失','이탈 고위험 자동 대응'],
    bdayDesc: ['Auto coupon for birthday customers','誕生日自動クーポン','生日自动优惠券','Geburtstags-Gutschein','คูปองวันเกิดอัตโนมัติ','Phiếu giảm giá sinh nhật','Kupon ulang tahun otomatis','生日自動優惠券','생일 고객 쿠폰 자동'],
  },
  aiRec: {
    salesInfo: ['📦 Sales Product Info','📦 販売商品情報','📦 销售产品信息','📦 Verkaufsproduktinfo','📦 ข้อมูลสินค้าขาย','📦 Thông tin sản phẩm','📦 Info Produk','📦 銷售產品資訊','📦 판매 제품 정보'],
    catalogAuto: ['Catalog Auto-filled','カタログ自動入力','目录自动填写','Katalog automatisch','กรอกจากแคตตาล็อกอัตโนมัติ','Tự động điền','Katalog Otomatis','目錄自動填寫','카탈로그 자동 입력'],
    skuCount: ['Product Name/SKU Count','商品名/SKU数','产品名/SKU数','Produktname/SKU','ชื่อสินค้า/SKU','Tên sản phẩm/SKU','Nama/SKU','產品名/SKU','상품명/SKU 수'],
    monthlyQty: ['Monthly Sales Goal','月間販売目標','月销售目标','Monatliches Ziel','เป้าหมายรายเดือน','Mục tiêu tháng','Target Bulanan','每月銷售目標','월 판매 목표'],
    avgPrice: ['Avg. Unit Price','平均単価','平均单价','Durchschnittspreis','ราคาเฉลี่ย','Giá trung bình','Harga Rata-rata','平均單價','평균 단가'],
    marginRate: ['Margin Rate','マージン率','利润率','Margenrate','อัตรากำไร','Tỷ lệ lợi nhuận','Tingkat Margin','利潤率','마진율'],
    goalRevenue: ['Goal Revenue','目標売上','目标收入','Zielumsatz','รายได้เป้าหมาย','Doanh thu mục tiêu','Pendapatan Target','目標收入','목표 매출'],
    mainChannels: ['Main Sales Channels (multi-select)','主要販売チャネル（複数選択）','主要销售渠道（多选）','Hauptkanäle (Mehrfachauswahl)','ช่องทางหลัก (เลือกหลายรายการ)','Kênh chính (nhiều)','Saluran Utama (multi-pilih)','主要銷售管道（多選）','주요 판매 채널'],
    searchPh: ['e.g. "Beauty brand Instagram ad strategy" or enter your marketing goal','例：「ビューティのInstagram広告戦略」を入力','例："美妆品牌广告策略"或营销目标','z.B. "Beauty-Strategie" oder Ziel','เช่น "กลยุทธ์ Instagram" หรือเป้าหมาย','VD: "Chiến lược quảng cáo" hoặc mục tiêu','Misal: "Strategi iklan" atau tujuan','例："美妝廣告策略"或輸入目標','예: "뷰티 인스타 광고" 또는 마케팅 목표'],
  },
  cat: {
    beauty: ['💄 Beauty & Cosmetics','💄 ビューティ・コスメ','💄 美妆·彩妆','💄 Beauty & Kosmetik','💄 ความงาม·เครื่องสำอาง','💄 Làm đẹp & Mỹ phẩm','💄 Kecantikan & Kosmetik','💄 美妝·化妝品','💄 뷰티·코스메틱'],
    fashion: ['👗 Fashion & Apparel','👗 ファッション・アパレル','👗 时尚·服装','👗 Mode & Bekleidung','👗 แฟชั่น·เสื้อผ้า','👗 Thời trang & Quần áo','👗 Mode & Pakaian','👗 時尚·服裝','👗 패션·의류'],
    general: ['🛍 General & Household','🛍 生活雑貨','🛍 生活·杂货','🛍 Haushalt & Allgemeines','🛍 สินค้าทั่วไป','🛍 Hàng gia dụng','🛍 Umum & Rumah Tangga','🛍 生活·雜貨','🛍 생활·잡화'],
    food: ['🥗 Food & Health','🥗 食品・健康','🥗 食品·健康','🥗 Lebensmittel & Gesundheit','🥗 อาหาร·สุขภาพ','🥗 Thực phẩm & Sức khỏe','🥗 Makanan & Kesehatan','🥗 食品·健康','🥗 식품·건강'],
    electronics: ['📱 Electronics & IT','📱 電子・IT','📱 电子·IT','📱 Elektronik & IT','📱 อิเล็กทรอนิกส์','📱 Điện tử & IT','📱 Elektronik & IT','📱 電子·IT','📱 전자·IT'],
    forwarding: ['🚢 Freight Forwarding','🚢 配送代行','🚢 货运代理','🚢 Frachtspedition','🚢 ตัวแทนจัดส่ง','🚢 Vận chuyển hàng hóa','🚢 Jasa Pengiriman','🚢 貨運代理','🚢 배송대행'],
    purchasing: ['🛒 Personal Shopping','🛒 個人購買代行','🛒 個人购物代理','🛒 Persönliches Einkaufen','🛒 ตัวแทนซื้อ','🛒 Mua sắm cá nhân','🛒 Belanja Pribadi','🛒 個人購物代理','🛒 구매대행'],
    travel: ['✈️ Travel & Accommodation','✈️ 旅行・宿泊','✈️ 旅行·住宿','✈️ Reise & Unterkunft','✈️ การท่องเที่ยว·ที่พัก','✈️ Du lịch & Lưu trú','✈️ Perjalanan & Akomodasi','✈️ 旅行·住宿','✈️ 여행·숙박'],
    digital: ['💻 Digital & Apps','💻 デジタル・アプリ','💻 数字·应用','💻 Digital & Apps','💻 ดิจิทัล·แอป','💻 Số & Ứng dụng','💻 Digital & Aplikasi','💻 數位·應用','💻 디지털·앱'],
    sports: ['⚽ Sports & Leisure','⚽ スポーツ・レジャー','⚽ 运动·休闲','⚽ Sport & Freizeit','⚽ กีฬา·นันทนาการ','⚽ Thể thao & Giải trí','⚽ Olahraga & Rekreasi','⚽ 運動·休閒','⚽ 스포츠·레저'],
  },
};

const LANG_NAMES = ['en','ja','zh','de','th','vi','id','zh-TW','ko'];

function buildSection(obj, langIdx, indent = '    ') {
  let result = '{\n';
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) {
      const v = val[langIdx].replace(/'/g, "\\'").replace(/\\/g, '\\\\').replace(/\\\\'/g, "\\'");
      result += `${indent}    ${key}: '${v}',\n`;
    } else {
      result += `${indent}    ${key}: ${buildSection(val, langIdx, indent + '    ')}`;
    }
  }
  result += `${indent}},\n`;
  return result;
}

for (let li = 0; li < LANG_NAMES.length; li++) {
  const lang = LANG_NAMES[li];
  const fpath = `${BASE}/${lang}.js`;
  let c = fs.readFileSync(fpath, 'utf8');
  
  // Remove old auto-generated section
  c = c.replace(/\n\n    \/\/ ── Auto-generated i18n keys ──[\s\S]*?(?=\n};?\n\nexport default)/g, '');
  
  // Build new properly nested section
  let newSection = '\n\n    // ── Auto-generated i18n keys ──\n';
  for (const [sectionKey, sectionData] of Object.entries(TRANSLATIONS)) {
    newSection += `    ${sectionKey}: ${buildSection(sectionData, li)}`;
  }
  
  // Insert before closing };
  const closeIdx = c.lastIndexOf('\n};');
  if (closeIdx === -1) {
    // Try just };
    const closeIdx2 = c.lastIndexOf('};');
    if (closeIdx2 > 0) {
      c = c.slice(0, closeIdx2) + newSection + '\n};\n';
    }
  } else {
    c = c.slice(0, closeIdx) + newSection + '\n};';
  }
  
  // Ensure export default exists
  if (!c.includes('export default')) {
    const varName = lang === 'zh-TW' ? 'zhTW' : lang;
    c = c.trimEnd() + `\n\nexport default ${varName};\n`;
  }
  
  fs.writeFileSync(fpath, c, 'utf8');
  console.log(`✓ ${lang}`);
}
console.log('\nDone! All locale files updated with proper nested structure.');
