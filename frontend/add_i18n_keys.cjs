/**
 * add_i18n_keys.cjs
 * Adds missing translation keys for AIPrediction, AIRecommendTab, Journey templates
 * into all locale files, then updates components to use t()
 */
const fs = require('fs');

// Keys per language: [en, ja, zh, de, th, vi, id, zh-TW, ko]
const KEYS = {
  // AIPrediction page
  'aiPredict.pageTitle': ['AI Forecast Analysis Hub','AI予測分析ハブ','AI预测分析中心','KI-Prognose-Hub','ศูนย์วิเคราะห์ AI','Trung tâm dự báo AI','Pusat Analisis AI Forecast','AI預測分析中心','AI 예측 분석 허브'],
  'aiPredict.pageSub': ['Purchase Probability · LTV Forecast · Churn Score · Product Recommend Engine · ML Model Performance','購買確率・LTV予測・チャーンスコア・商品推薦エンジン・ML性能','购买概率·LTV预测·流失评分·商品推荐引擎·ML模型性能','Kaufwahrscheinlichkeit · LTV-Prognose · Abwanderung · Empfehlungs-Engine · ML-Leistung','ความน่าจะเป็นการซื้อ · LTV · คะแนนการออกจาก · เครื่องยนต์แนะนำ · ML','Xác suất mua · LTV · Điểm rời bỏ · Gợi ý sản phẩm · Hiệu suất ML','Probabilitas Pembelian · LTV · Skor Churn · Mesin Rekomendasi · Performa ML','購買概率·LTV預測·流失評分·推薦引擎·ML效能','구매확률·LTV 예측·이탈 스코어·추천 엔진·ML 성능'],
  'aiPredict.liveDB': ['🟢 Live DB','🟢 ライブDB','🟢 实时数据库','🟢 Live DB','🟢 ฐานข้อมูลสด','🟢 DB Trực tuyến','🟢 DB Langsung','🟢 即時資料庫','🟢 실시간 DB'],
  'aiPredict.demoSim': ['🟡 Demo Simulation','🟡 デモシミュレーション','🟡 演示模拟','🟡 Demo-Simulation','🟡 จำลองสาธิต','🟡 Mô phỏng Demo','🟡 Simulasi Demo','🟡 演示模擬','🟡 데모 시뮬레이션'],
  'aiPredict.kpi.target': ['Forecast Target','予測対象','预测目标','Prognose-Zielgruppe','เป้าหมายการพยากรณ์','Mục tiêu dự báo','Target Forecast','預測目標','예측 대상'],
  'aiPredict.kpi.churnRisk': ['Churn Risk','チャーンリスク','流失风险','Abwanderungsrisiko','ความเสี่ยงการออกจาก','Rủi ro rời bỏ','Risiko Churn','流失風險','이탈 위험'],
  'aiPredict.kpi.churnAction': ['Immediate action needed','即座の対応が必要','需要立即行动','Sofortmaßnahmen erforderlich','ต้องดำเนินการทันที','Cần hành động ngay','Tindakan segera diperlukan','需要立即行動','즉시 개입 필요'],
  'aiPredict.kpi.highLtv': ['High LTV Potential','高LTV潜在力','高LTV潜力','Hohes LTV-Potenzial','ศักยภาพ LTV สูง','Tiềm năng LTV cao','Potensi LTV Tinggi','高LTV潛力','고LTV 잠재'],
  'aiPredict.kpi.highLtvSub': ['CLV ₩3M+','CLV ₩3M以上','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M+','CLV ₩3M 이상'],
  'aiPredict.kpi.revenue': ['30-day Forecast Revenue','30日間収益予測','30天预测收入','30-Tage-Umsatzprognose','รายได้คาดการณ์ 30 วัน','Doanh thu dự báo 30 ngày','Pendapatan Forecast 30 Hari','30天預測收入','30일 예측 매출'],
  'aiPredict.kpi.revenueSub': ['+18% Growth Expected','+18%成長予測','+18%增长预期','+18% Wachstum erwartet','+18% คาดว่าจะเติบโต','+18% Tăng trưởng dự kiến','+18% Pertumbuhan Diharapkan','+18%預期增長','+18% 성장 예상'],
  'aiPredict.kpi.mlAccuracy': ['ML Model Accuracy','MLモデル精度','ML模型精度','ML-Modellgenauigkeit','ความแม่นยำโมเดล ML','Độ chính xác Mô hình ML','Akurasi Model ML','ML模型準確度','ML 모델 정확도'],
  'aiPredict.kpi.mlSub': ['Daily retrain at 04:00','毎日04:00再学習','每天04:00重新训练','Tägl. Neutraining 04:00 Uhr','ฝึกใหม่ทุกวัน 04:00 น.','Huấn luyện lại hàng ngày lúc 04:00','Latih ulang setiap hari 04:00','每天04:00重新訓練','매일 04:00 재학습'],
  'aiPredict.tab.customers': ['👤 Customer Forecast','👤 顧客予測','👤 客户预测','👤 Kundenprognose','👤 พยากรณ์ลูกค้า','👤 Dự báo khách hàng','👤 Prakiraan Pelanggan','👤 客戶預測','👤 고객 예측'],
  'aiPredict.tab.ltv': ['💰 LTV Segments','💰 LTVセグメント','💰 LTV细分','💰 LTV-Segmente','💰 กลุ่ม LTV','💰 Phân khúc LTV','💰 Segmen LTV','💰 LTV細分','💰 LTV 세그먼트'],
  'aiPredict.tab.graph': ['🕸️ Graph Score','🕸️ グラフスコア','🕸️ 图谱评分','🕸️ Graphen-Score','🕸️ คะแนนกราฟ','🕸️ Điểm đồ thị','🕸️ Skor Grafik','🕸️ 圖譜評分','🕸️ 그래프 스코어'],
  'aiPredict.tab.model': ['⚙️ Model Performance','⚙️ モデル性能','⚙️ 模型性能','⚙️ Modell-Leistung','⚙️ ประสิทธิภาพโมเดล','⚙️ Hiệu suất mô hình','⚙️ Kinerja Model','⚙️ 模型效能','⚙️ 모델 성능'],
  'aiPredict.tab.integration': ['🔗 Integration Status','🔗 統合状況','🔗 集成状态','🔗 Integrationsstatus','🔗 สถานะการผสาน','🔗 Trạng thái tích hợp','🔗 Status Integrasi','🔗 整合狀態','🔗 연동 현황'],
  'aiPredict.bulkAction': ['⚡ Bulk Churn Action','⚡ 一括チャーン対応','⚡ 批量流失处理','⚡ Massen-Abwanderung','⚡ การดำเนินการออกจากระบบ','⚡ Xử lý rời bỏ hàng loạt','⚡ Tindakan Churn Massal','⚡ 批量流失處理','⚡ 이탈 일괄 대응'],
  'aiPredict.col.prob30': ['30-day Purchase Prob.','30日購買確率','30天购买概率','30-Tage-Kaufwahrsch.','ความน่าจะเป็นซื้อ 30 วัน','Xác suất mua 30 ngày','Prob. Pembelian 30 Hari','30天購買概率','30일 구매확률'],
  'aiPredict.col.churn': ['Churn Risk','チャーンリスク','流失风险','Abwanderungsrisiko','ความเสี่ยงการออกจาก','Rủi ro rời bỏ','Risiko Churn','流失風險','이탈 위험'],
  'aiPredict.col.ltv12': ['LTV 12-month','LTV 12ヶ月','LTV 12个月','LTV 12-Monate','LTV 12 เดือน','LTV 12 tháng','LTV 12 Bulan','LTV 12個月','LTV 12개월'],
  'aiPredict.col.nextPurchase': ['Next Purchase Est.','次回購入予測','下次购买预测','Nächste Kaufprognose','คาดการณ์ซื้อครั้งต่อไป','Dự báo mua tiếp','Estimasi Pembelian Berikut','下次購買預測','다음 구매 예측'],
  'aiPredict.col.detail': ['→ Details','→ 詳細','→ 详情','→ Details','→ รายละเอียด','→ Chi tiết','→ Detail','→ 詳情','→ 상세'],
  'aiPredict.loading': ['Loading forecast data from ML models...','MLモデルからデータ読み込み中...','从ML模型加载预测数据...','ML-Prognosedaten werden geladen...','กำลังโหลดข้อมูล ML...','Đang tải dữ liệu dự báo ML...','Memuat data dari model ML...','正在從ML模型載入預測資料...','ML 모델에서 예측 데이터 로드 중...'],
  'aiPredict.filterAll': ['All Risk Levels','全リスクレベル','全部风险级别','Alle Risikostufen','ระดับความเสี่ยงทั้งหมด','Tất cả mức rủi ro','Semua Tingkat Risiko','所有風險級別','전체 위험도'],
  'aiPredict.filterHigh': ['🔴 Churn Risk','🔴 チャーンリスク','🔴 流失风险','🔴 Abwanderungsrisiko','🔴 ความเสี่ยงสูง','🔴 Nguy cơ rời bỏ','🔴 Risiko Churn','🔴 流失風險','🔴 이탈위험'],
  'aiPredict.filterMed': ['🟡 Medium Risk','🟡 中リスク','🟡 中等风险','🟡 Mittleres Risiko','🟡 ความเสี่ยงกลาง','🟡 Rủi ro trung bình','🟡 Risiko Sedang','🟡 中等風險','🟡 중간위험'],
  'aiPredict.filterLow': ['🟢 Safe','🟢 安全','🟢 安全','🟢 Sicher','🟢 ปลอดภัย','🟢 An toàn','🟢 Aman','🟢 安全','🟢 안전'],
  'aiPredict.noResults': ['No results found','結果が見つかりません','未找到结果','Keine Ergebnisse','ไม่พบผลลัพธ์','Không tìm thấy kết quả','Tidak ada hasil','未找到結果','검색 결과 없음'],
  'aiPredict.retry': ['Retry','再試行','重试','Erneut versuchen','ลองใหม่','Thử lại','Coba lagi','重試','재시도'],
  'aiPredict.overview': ['Overview','概要','概览','Überblick','ภาพรวม','Tổng quan','Gambaran Umum','概覽','개요'],
  'aiPredict.recommend': ['Recommendations','推薦','推荐','Empfehlungen','คำแนะนำ','Gợi ý','Rekomendasi','推薦','추천'],
  'aiPredict.prob30Label': ['30-day Purchase Prob.','30日購買確率','30天购买概率','30-Tage-Kaufwahrsch.','ความน่าจะเป็นซื้อ 30 วัน','Xác suất mua 30 ngày','Prob. Beli 30 Hari','30天購買概率','30일 구매확률'],
  'aiPredict.churnScore': ['Churn Risk Score','チャーンリスクスコア','流失风险分','Abwanderungsrisiko-Wert','คะแนนความเสี่ยงออกจาก','Điểm rủi ro rời bỏ','Skor Risiko Churn','流失風險分','이탈 위험 스코어'],
  'aiPredict.purchases': ['Purchases','購入回数','购买次数','Käufe','จำนวนซื้อ','Số lần mua','Pembelian','購買次數','구매 횟수'],
  'aiPredict.lastPurchase': ['Last Purchase','最終購入','上次购买','Letzter Kauf','ซื้อล่าสุด','Mua lần cuối','Pembelian Terakhir','上次購買','마지막 구매'],
  'aiPredict.cumulativeLTV': ['Cumulative LTV','累積LTV','累积LTV','Kumulatives LTV','LTV สะสม','LTV lũy kế','LTV Kumulatif','累積LTV','누적 LTV'],
  'aiPredict.prob90': ['90-day Purchase Prob.','90日購買確率','90天购买概率','90-Tage-Kaufwahrsch.','ความน่าจะเป็นซื้อ 90 วัน','Xác suất mua 90 ngày','Prob. Beli 90 Hari','90天購買概率','90일 구매확률'],
  'aiPredict.nextPurchaseDate': ['Next Purchase Est.','次回購入予測','下次购买预测','Nächste Kaufprognose','คาดการณ์ซื้อครั้งถัดไป','Dự báo mua tiếp','Estimasi Beli Berikut','下次購買預測','다음 구매 예측'],
  'aiPredict.rfmScore': ['RFM Score','RFMスコア','RFM评分','RFM-Score','คะแนน RFM','Điểm RFM','Skor RFM','RFM評分','RFM 스코어'],
  'aiPredict.recency': ['Recency','最近性','最近性','Aktualität','ความสด','Gần đây','Keterkinian','近期性','최근성'],
  'aiPredict.frequency': ['Frequency','頻度','频率','Häufigkeit','ความถี่','Tần suất','Frekuensi','頻率','빈도'],
  'aiPredict.grade.champions': ['Champions','チャンピオン','冠军','Champions','แชมเปี้ยน','Vô địch','Champions','冠軍','챔피언스'],
  'aiPredict.grade.loyal': ['Loyal','忠実顧客','忠诚','Treue','ลูกค้าประจำ','Khách trung thành','Setia','忠誠','충성고객'],
  'aiPredict.grade.new': ['New','新規','新客','Neu','ใหม่','Mới','Baru','新客','신규'],
  'aiPredict.grade.churnRisk': ['Churn Risk','チャーンリスク','流失风险','Abwanderungsrisiko','ความเสี่ยงออกจาก','Nguy cơ rời bỏ','Risiko Churn','流失風險','이탈위험'],
  'aiPredict.grade.churned': ['Churned','離脱','已流失','Abgewandert','ออกไปแล้ว','Đã rời bỏ','Sudah Churn','已流失','이탈'],
  // Journey templates
  'journey.tpl.cartDesc': ['Re-engage churned customers via Email + Kakao','離脱顧客をメール+Kakaoで再エンゲージ','通过邮件+Kakao重新吸引流失客户','Abgewanderte Kunden per E-Mail+Kakao reaktivieren','ดึงลูกค้ากลับผ่าน Email+Kakao','Thu hút lại khách qua Email+Kakao','Libatkan kembali pelanggan via Email+Kakao','透過Email+Kakao重新吸引流失客戶','이탈 고객을 Email+Kakao로 재유치'],
  'journey.tpl.onboardDesc': ['3-step automated care after signup','登録後3ステップ自動ケア','注册后3步自动关怀','3-stufige automatische Pflege nach Anmeldung','ดูแลอัตโนมัติ 3 ขั้นตอนหลังสมัคร','Chăm sóc tự động 3 bước sau đăng ký','Perawatan otomatis 3 langkah setelah daftar','註冊後3步自動關懷','가입 후 3단계 자동 케어'],
  'journey.tpl.vipDesc': ['Auto care for VIP segment','VIPセグメント自動ケア','VIP细分自动关怀','Automatische Pflege für VIP-Segment','ดูแลอัตโนมัติสำหรับ VIP','Chăm sóc tự động phân khúc VIP','Perawatan otomatis segmen VIP','VIP細分自動關懷','VIP 세그먼트 자동 케어'],
  'journey.tpl.churnDesc': ['Auto stop high-risk churn customers','高リスクチャーン顧客を自動対応','自动处理高风险流失客户','Hochrisikoabwanderer automatisch stoppen','หยุดลูกค้าที่เสี่ยงออกอัตโนมัติ','Tự động xử lý khách có nguy cơ rời bỏ cao','Hentikan otomatis pelanggan churn berisiko','自動處理高風險流失客戶','고위험 이탈 고객 자동 대응'],
  'journey.tpl.bdayDesc': ['Auto coupon for birthday customers','誕生日顧客へ自動クーポン','生日客户自动优惠券','Automatischer Gutschein für Geburtstagskunden','คูปองอัตโนมัติสำหรับลูกค้าวันเกิด','Phiếu giảm giá tự động cho khách sinh nhật','Kupon otomatis untuk pelanggan ulang tahun','生日客戶自動優惠券','생일 고객 자동 쿠폰'],
  // AIRecommend form labels
  'aiRec.salesInfo': ['📦 Sales Product Info','📦 販売商品情報','📦 销售产品信息','📦 Verkaufsproduktinfo','📦 ข้อมูลสินค้าขาย','📦 Thông tin sản phẩm','📦 Info Produk Penjualan','📦 銷售產品資訊','📦 판매 제품 정보'],
  'aiRec.catalogAuto': ['Catalog Auto-filled','カタログ自動入力','目录自动填写','Katalog automatisch ausgefüllt','กรอกจากแคตตาล็อกอัตโนมัติ','Tự động điền từ danh mục','Katalog Terisi Otomatis','目錄自動填寫','카탈로그 자동 입력'],
  'aiRec.skuCount': ['Product Name/SKU Count','商品名/SKU数','产品名/SKU数','Produktname/SKU-Anzahl','ชื่อสินค้า/จำนวน SKU','Tên sản phẩm/Số SKU','Nama Produk/Jumlah SKU','產品名/SKU數','상품명/SKU 수'],
  'aiRec.monthlyQty': ['Monthly Sales Goal','月間販売目標','月销售目标','Monatliches Verkaufsziel','เป้าหมายขายรายเดือน','Mục tiêu bán hàng tháng','Target Penjualan Bulanan','每月銷售目標','월 판매 목표'],
  'aiRec.avgPrice': ['Avg. Unit Price','平均単価','平均单价','Durchschnittspreis','ราคาเฉลี่ยต่อหน่วย','Giá đơn vị trung bình','Harga Satuan Rata-rata','平均單價','평균 단가'],
  'aiRec.marginRate': ['Margin Rate','マージン率','利润率','Margenrate','อัตรากำไร','Tỷ lệ lợi nhuận','Tingkat Margin','利潤率','마진율'],
  'aiRec.goalRevenue': ['Goal Revenue','目標売上','目标收入','Zielumsatz','รายได้เป้าหมาย','Doanh thu mục tiêu','Pendapatan Target','目標收入','목표 매출'],
  'aiRec.mainChannels': ['Main Sales Channels (multi-select)','主要販売チャネル（複数選択）','主要销售渠道（多选）','Hauptvertriebskanäle (Mehrfachauswahl)','ช่องทางขายหลัก (เลือกหลายรายการ)','Kênh bán hàng chính (nhiều lựa chọn)','Saluran Penjualan Utama (multi-pilih)','主要銷售管道（多選）','주요 판매 채널 (복수 선택)'],
  'aiRec.searchPh': ['e.g. "Beauty brand Instagram ad strategy" or enter your marketing goal','例：「ビューティブランドのInstagram広告戦略」またはマーケティング目標を入力','例："美妆品牌Instagram广告策略"或输入您的营销目标','z.B. \"Beauty-Marken Instagram-Strategie\" oder Ziel eingeben','เช่น "กลยุทธ์โฆษณา Instagram แบรนด์ความงาม" หรือป้อนเป้าหมาย','VD: "Chiến lược quảng cáo Instagram thương hiệu làm đẹp" hoặc nhập mục tiêu','Misal: "Strategi iklan Instagram merek kecantikan" atau tujuan pemasaran','例："美妝品牌Instagram廣告策略"或輸入行銷目標','예: "뷰티 브랜드 인스타그램 광고 전략" 또는 마케팅 목표 입력'],
  // Category names
  'cat.beauty': ['💄 Beauty & Cosmetics','💄 ビューティ・コスメ','💄 美妆·彩妆','💄 Beauty & Kosmetik','💄 ความงาม·เครื่องสำอาง','💄 Làm đẹp & Mỹ phẩm','💄 Kecantikan & Kosmetik','💄 美妝·化妝品','💄 뷰티·코스메틱'],
  'cat.fashion': ['👗 Fashion & Apparel','👗 ファッション・アパレル','👗 时尚·服装','👗 Mode & Bekleidung','👗 แฟชั่น·เสื้อผ้า','👗 Thời trang & Quần áo','👗 Mode & Pakaian','👗 時尚·服裝','👗 패션·의류'],
  'cat.general': ['🛍 General & Household','🛍 生活雑貨','🛍 生活·杂货','🛍 Haushalt & Allgemeines','🛍 สินค้าทั่วไป','🛍 Hàng gia dụng','🛍 Umum & Rumah Tangga','🛍 生活·雜貨','🛍 생활·잡화'],
  'cat.food': ['🥗 Food & Health','🥗 食品・健康','🥗 食品·健康','🥗 Lebensmittel & Gesundheit','🥗 อาหาร·สุขภาพ','🥗 Thực phẩm & Sức khỏe','🥗 Makanan & Kesehatan','🥗 食品·健康','🥗 식품·건강'],
  'cat.electronics': ['📱 Electronics & IT','📱 電子・IT','📱 电子·IT','📱 Elektronik & IT','📱 อิเล็กทรอนิกส์·IT','📱 Điện tử & IT','📱 Elektronik & IT','📱 電子·IT','📱 전자·IT'],
  'cat.forwarding': ['🚢 Freight Forwarding','🚢 配送代行','🚢 货运代理','🚢 Frachtspedition','🚢 ตัวแทนจัดส่ง','🚢 Vận chuyển hàng hóa','🚢 Jasa Pengiriman','🚢 貨運代理','🚢 배송대행'],
  'cat.purchasing': ['🛒 Personal Shopping','🛒 個人購買代行','🛒 个人购物代理','🛒 Persönliches Einkaufen','🛒 ตัวแทนซื้อส่วนตัว','🛒 Mua sắm cá nhân','🛒 Belanja Pribadi','🛒 個人購物代理','🛒 구매대행'],
  'cat.travel': ['✈️ Travel & Accommodation','✈️ 旅行・宿泊','✈️ 旅行·住宿','✈️ Reise & Unterkunft','✈️ การท่องเที่ยว·ที่พัก','✈️ Du lịch & Lưu trú','✈️ Perjalanan & Akomodasi','✈️ 旅行·住宿','✈️ 여행·숙박'],
  'cat.digital': ['💻 Digital & Apps','💻 デジタル・アプリ','💻 数字·应用','💻 Digital & Apps','💻 ดิจิทัล·แอป','💻 Số & Ứng dụng','💻 Digital & Aplikasi','💻 數位·應用','💻 디지털·앱'],
  'cat.sports': ['⚽ Sports & Leisure','⚽ スポーツ・レジャー','⚽ 运动·休闲','⚽ Sport & Freizeit','⚽ กีฬา·นันทนาการ','⚽ Thể thao & Giải trí','⚽ Olahraga & Rekreasi','⚽ 運動·休閒','⚽ 스포츠·레저'],
};

const LANGS = ['en','ja','zh','de','th','vi','id','zh-TW','ko'];
const BASE = 'src/i18n/locales';

for (let li = 0; li < LANGS.length; li++) {
  const lang = LANGS[li];
  const fpath = `${BASE}/${lang}.js`;
  if (!fs.existsSync(fpath)) { console.log('SKIP:', lang); continue; }
  let content = fs.readFileSync(fpath, 'utf8');
  
  // Build insertion block - find last key before closing
  let block = '\n\n    // ── Auto-generated i18n keys ──\n    aiPredict: {\n';
  const aiPredictKeys = Object.entries(KEYS).filter(([k]) => k.startsWith('aiPredict.'));
  for (const [key, vals] of aiPredictKeys) {
    const k = key.replace('aiPredict.', '');
    const val = vals[li].replace(/'/g, "\\'");
    block += `        '${k}': '${val}',\n`;
  }
  block += '    },\n    journeyTpl: {\n';
  const jTplKeys = Object.entries(KEYS).filter(([k]) => k.startsWith('journey.tpl.'));
  for (const [key, vals] of jTplKeys) {
    const k = key.replace('journey.tpl.', '');
    const val = vals[li].replace(/'/g, "\\'");
    block += `        '${k}': '${val}',\n`;
  }
  block += '    },\n    aiRec: {\n';
  const aiRecKeys = Object.entries(KEYS).filter(([k]) => k.startsWith('aiRec.'));
  for (const [key, vals] of aiRecKeys) {
    const k = key.replace('aiRec.', '');
    const val = vals[li].replace(/'/g, "\\'");
    block += `        '${k}': '${val}',\n`;
  }
  block += '    },\n    cat: {\n';
  const catKeys = Object.entries(KEYS).filter(([k]) => k.startsWith('cat.'));
  for (const [key, vals] of catKeys) {
    const k = key.replace('cat.', '');
    const val = vals[li].replace(/'/g, "\\'");
    block += `        '${k}': '${val}',\n`;
  }
  block += '    },\n';

  // Remove old auto-generated block if exists
  content = content.replace(/\n\n    \/\/ ── Auto-generated i18n keys ──[\s\S]*?    },\n(?=\n};)/g, '');

  // Insert before closing };
  const closeIdx = content.lastIndexOf('\n};');
  if (closeIdx === -1) { console.log('NO CLOSE:', lang); continue; }
  content = content.slice(0, closeIdx) + block + '\n};';
  
  fs.writeFileSync(fpath, content, 'utf8');
  console.log('✓', lang);
}
console.log('\nDone adding keys!');
