import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { st } from "./siteI18n.js";
import { LogoOrbit } from "../../layout/PremiumLayout.jsx";

/* ═══════════════════════════════════════════════════════════════════
   11-Language Dictionary — Landing Page Only
   ko, en, ja, zh, zh-TW, vi, th, id, de, fr, es
   ═══════════════════════════════════════════════════════════════════ */
const LANGS = [
    { code: "ko", flag: "🇰🇷", label: "한국어" },
    { code: "en", flag: "🇺🇸", label: "English" },
    { code: "ja", flag: "🇯🇵", label: "日本語" },
    { code: "zh", flag: "🇨🇳", label: "中文(简)" },
    { code: "zh-TW", flag: "🇹🇼", label: "中文(繁)" },
    { code: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
    { code: "th", flag: "🇹🇭", label: "ภาษาไทย" },
    { code: "id", flag: "🇮🇩", label: "Bahasa" },
    { code: "de", flag: "🇩🇪", label: "Deutsch" },
    { code: "fr", flag: "🇫🇷", label: "Français" },
    { code: "es", flag: "🇪🇸", label: "Español" },
    { code: "pt", flag: "🇧🇷", label: "Português" },
    { code: "ru", flag: "🇷🇺", label: "Русский" },
    { code: "ar", flag: "🇸🇦", label: "العربية" },
    { code: "hi", flag: "🇮🇳", label: "हिन्दी" },
];

const DICT = {
    /* ── Badge ── */
    heroBadge: {
        ko: "🚀 올인원 커머스 AI 자동화 플랫폼",
        en: "🚀 All-in-One AI Commerce Automation Platform",
        ja: "🚀 オールインワン AI コマース自動化プラットフォーム",
        zh: "🚀 一站式 AI 电商自动化平台",
        "zh-TW": "🚀 一站式 AI 電商自動化平台",
        vi: "🚀 Nền tảng Tự động hóa Thương mại AI Toàn diện",
        th: "🚀 แพลตฟอร์ม AI อีคอมเมิร์ซครบวงจร",
        id: "🚀 Platform Otomatisasi Commerce AI All-in-One",
        de: "🚀 All-in-One KI-Commerce-Automatisierungsplattform",
        fr: "🚀 Plateforme d'automatisation commerce IA tout-en-un",
        es: "🚀 Plataforma de automatización comercial IA todo-en-uno",
    },
    heroTitle: {
        ko: "인공지능 데이터 분석을 통한\n광고 · 판매 · 재고 · 배송 · 정산\n모든 채널 운영을 하나의 플랫폼으로 자동화",
        en: "Through AI Data Analytics\nAds · Sales · Inventory · Shipping · Settlement\nAll Channel Operations Automated in One Platform",
        ja: "AI データ分析による\n広告 · 販売 · 在庫 · 配送 · 精算\n全チャネル運営をワンプラットフォームで自動化",
        zh: "通过 AI 数据分析\n广告 · 销售 · 库存 · 物流 · 结算\n所有渠道运营 一个平台自动化",
        "zh-TW": "透過 AI 數據分析\n廣告 · 銷售 · 庫存 · 物流 · 結算\n所有通路營運 一個平台自動化",
        vi: "Thông qua Phân tích Dữ liệu AI\nQuảng cáo · Bán hàng · Tồn kho · Vận chuyển · Thanh toán\nVận hành mọi kênh tự động hóa trong một nền tảng",
        th: "ผ่านการวิเคราะห์ข้อมูล AI\nโฆษณา · ขาย · สต็อก · ขนส่ง · ชำระเงิน\nดำเนินงานทุกช่องทาง อัตโนมัติในแพลตฟอร์มเดียว",
        id: "Melalui Analisis Data AI\nIklan · Penjualan · Stok · Pengiriman · Settlement\nOperasi semua channel otomatis dalam satu platform",
        de: "Durch KI-Datenanalyse\nWerbung · Verkauf · Lager · Versand · Abrechnung\nAlle Kanäle automatisiert in einer Plattform",
        fr: "Grâce à l'Analyse de Données IA\nPub · Vente · Stock · Livraison · Règlement\nTous les canaux automatisés en une plateforme",
        es: "Mediante Análisis de Datos con IA\nAnuncios · Ventas · Inventario · Envíos · Liquidación\nTodos los canales automatizados en una plataforma",
    },
    heroDesc: {
        ko: "광고 자동화 · 상품 등록 · 재고 관리 · 주문 처리 · 배송 추적 · 성과 분석 · 정산 대사까지 — 커머스 운영의 A부터 Z를 AI가 자동화합니다.",
        en: "Ad automation · Product listing · Inventory management · Order processing · Shipping tracking · Performance analytics · Settlement — AI automates your commerce from A to Z.",
        ja: "広告自動化 · 商品登録 · 在庫管理 · 受注処理 · 配送追跡 · 成果分析 · 精算まで — コマース運営のA〜ZをAIが自動化。",
        zh: "广告自动化 · 商品上架 · 库存管理 · 订单处理 · 物流追踪 · 绩效分析 · 结算对账 — AI 将电商运营从 A 到 Z 全面自动化。",
        "zh-TW": "廣告自動化 · 商品上架 · 庫存管理 · 訂單處理 · 物流追蹤 · 績效分析 · 結算對帳 — AI 將電商營運從 A 到 Z 全面自動化。",
        vi: "Tự động quảng cáo · Đăng sản phẩm · Quản lý tồn kho · Xử lý đơn hàng · Theo dõi vận chuyển · Phân tích hiệu suất · Đối soát — AI tự động hóa thương mại từ A đến Z.",
        th: "โฆษณาอัตโนมัติ · ลงสินค้า · จัดการสต็อก · ประมวลผลออเดอร์ · ติดตามขนส่ง · วิเคราะห์ผล · เคลียร์บัญชี — AI ทำให้อีคอมเมิร์ซอัตโนมัติครบ A ถึง Z",
        id: "Otomasi iklan · Listing produk · Manajemen stok · Pemrosesan pesanan · Pelacakan pengiriman · Analitik performa · Settlement — AI mengotomatisasi commerce dari A sampai Z.",
        de: "Anzeigen-Automatisierung · Produktlisting · Lagerverwaltung · Auftragsabwicklung · Versandverfolgung · Leistungsanalyse · Abrechnung — KI automatisiert Ihren Commerce von A bis Z.",
        fr: "Automatisation pub · Mise en ligne · Gestion de stock · Traitement des commandes · Suivi livraison · Analyse de performance · Règlement — l'IA automatise votre commerce de A à Z.",
        es: "Automatización de anuncios · Listado de productos · Gestión de inventario · Procesamiento de pedidos · Seguimiento de envíos · Análisis de rendimiento · Liquidación — la IA automatiza su comercio de la A a la Z.",
    },
    btnTrial: {
        ko: "무료 체험 시작 →", en: "Start Free Trial →", ja: "無料トライアル開始 →", zh: "开始免费试用 →",
        "zh-TW": "開始免費試用 →", vi: "Dùng thử miễn phí →", th: "ทดลองใช้ฟรี →", id: "Mulai Uji Coba Gratis →",
        de: "Kostenlos testen →", fr: "Essai gratuit →", es: "Prueba gratis →",
    },
    btnLogin: {
        ko: "대시보드 로그인", en: "Login to Dashboard", ja: "ダッシュボードにログイン", zh: "登录仪表板",
        "zh-TW": "登入儀表板", vi: "Đăng nhập Dashboard", th: "เข้าสู่แดชบอร์ด", id: "Masuk Dashboard",
        de: "Zum Dashboard", fr: "Accéder au tableau", es: "Ir al Panel",
    },
    /* ── Stats ── */
    statChannels: { ko: "판매 채널", en: "Sales Channels", ja: "販売チャネル", zh: "销售渠道", "zh-TW": "銷售通路", vi: "Kênh bán hàng", th: "ช่องทางขาย", id: "Channel Penjualan", de: "Vertriebskanäle", fr: "Canaux de vente", es: "Canales de venta" },
    statSKUs: { ko: "관리 SKU", en: "SKUs Managed", ja: "管理SKU", zh: "管理SKU", "zh-TW": "管理SKU", vi: "SKU quản lý", th: "SKU ที่จัดการ", id: "SKU Dikelola", de: "Verwaltete SKUs", fr: "SKU gérées", es: "SKUs gestionados" },
    statData: { ko: "일일 데이터", en: "Data Points / Day", ja: "日次データ", zh: "每日数据", "zh-TW": "每日資料", vi: "Dữ liệu/ngày", th: "ข้อมูล/วัน", id: "Data / Hari", de: "Datenpunkte/Tag", fr: "Données / jour", es: "Datos / día" },
    statClients: { ko: "기업 고객", en: "Enterprise Clients", ja: "企業顧客", zh: "企业客户", "zh-TW": "企業客戶", vi: "Khách hàng DN", th: "ลูกค้าองค์กร", id: "Klien Enterprise", de: "Unternehmenskunden", fr: "Clients enterprise", es: "Clientes empresariales" },
    /* ── Integrations ── */
    integrationsLabel: { ko: "글로벌 연동 서비스", en: "Trusted Integrations", ja: "連携パートナー", zh: "集成服务", "zh-TW": "整合服務", vi: "Tích hợp đáng tin cậy", th: "การเชื่อมต่อที่เชื่อถือได้", id: "Integrasi Terpercaya", de: "Vertrauenswürdige Integrationen", fr: "Intégrations de confiance", es: "Integraciones confiables" },
    /* ── Features ── */
    featuresBadge: { ko: "플랫폼 기능", en: "Platform Capabilities", ja: "プラットフォーム機能", zh: "平台功能", "zh-TW": "平台功能", vi: "Năng lực nền tảng", th: "ความสามารถของแพลตฟอร์ม", id: "Kemampuan Platform", de: "Plattform-Funktionen", fr: "Capacités de la plateforme", es: "Capacidades de la plataforma" },
    featuresTitle: {
        ko: "성장에 필요한 모든 것", en: "Everything You Need to Scale", ja: "スケールに必要なすべて",
        zh: "规模化所需的一切", "zh-TW": "規模化所需的一切", vi: "Mọi thứ để mở rộng quy mô",
        th: "ทุกสิ่งที่ต้องการเพื่อขยายธุรกิจ", id: "Semua yang Anda Butuhkan untuk Scale",
        de: "Alles was Sie zum Skalieren brauchen", fr: "Tout ce qu'il faut pour croître", es: "Todo lo necesario para escalar",
    },
    featuresDesc: {
        ko: "창고에서 결제까지 — 전체 매출 생명주기를 위한 하나의 플랫폼",
        en: "From warehouse to wallet — one platform for the entire revenue lifecycle",
        ja: "倉庫から決済まで — 収益ライフサイクル全体をカバー",
        zh: "从仓库到钱包 — 收益全生命周期的一站式平台",
        "zh-TW": "從倉庫到錢包 — 營收全生命週期的一站式平台",
        vi: "Từ kho hàng đến ví tiền — một nền tảng cho toàn bộ vòng đời doanh thu",
        th: "จากคลังสินค้าถึงกระเป๋าเงิน — แพลตฟอร์มเดียวสำหรับทั้งวงจรรายได้",
        id: "Dari gudang ke dompet — satu platform untuk seluruh siklus pendapatan",
        de: "Vom Lager zum Konto — eine Plattform für den gesamten Umsatzzyklus",
        fr: "De l'entrepôt au portefeuille — une plateforme pour tout le cycle revenu",
        es: "Del almacén a la cartera — una plataforma para todo el ciclo de ingresos",
    },
    /* ── Feature Titles & Descs ── */
    f1t: { ko: "옴니채널 커머스", en: "OmniChannel Commerce", ja: "オムニチャネルコマース", zh: "全渠道电商", "zh-TW": "全通路電商", vi: "Thương mại đa kênh", th: "ค้าปลีกหลายช่องทาง", id: "OmniChannel Commerce", de: "Omni-Channel Commerce", fr: "Commerce Omnicanal", es: "Comercio Omnicanal" },
    f1d: { ko: "쿠팡, 네이버, 아마존, 쇼피파이, 틱톡샵 등 30개 이상 마켓을 하나의 허브로 연결. 주문·재고·배송을 표준화합니다.", en: "Connect 30+ domestic & global marketplaces — Coupang, Naver, Amazon, Shopify, TikTok Shop. Standardize orders, inventory, and fulfillment in one unified hub.", ja: "30以上の国内外マーケットプレイスを接続。注文・在庫・出荷を統合ハブで標準化。", zh: "连接30+国内外市场，统一管理订单、库存和履约。", "zh-TW": "連接30+國內外市場，統一管理訂單、庫存和履約。", vi: "Kết nối 30+ sàn thương mại, chuẩn hoá đơn hàng, tồn kho và vận chuyển.", th: "เชื่อมต่อ 30+ ตลาด มาตรฐานคำสั่งซื้อ สินค้า และการจัดส่ง", id: "Hubungkan 30+ marketplace, standarisasi pesanan, inventori, dan fulfillment.", de: "Verbinden Sie 30+ Marktplätze. Standardisieren Sie Bestellungen, Lager & Versand.", fr: "Connectez 30+ places de marché. Standardisez commandes, stock et expédition.", es: "Conecte 30+ marketplaces. Estandarice pedidos, inventario y fulfillment." },
    f2t: { ko: "WMS — 창고·물류 관리", en: "WMS — Warehouse & Logistics", ja: "WMS — 倉庫・物流", zh: "WMS — 仓储物流", "zh-TW": "WMS — 倉儲物流", vi: "WMS — Kho & Logistics", th: "WMS — คลังสินค้า & โลจิสติกส์", id: "WMS — Gudang & Logistik", de: "WMS — Lager & Logistik", fr: "WMS — Entrepôt & Logistique", es: "WMS — Almacén y Logística" },
    f2d: { ko: "다중 창고 재고 추적, 합배송 관리, 운송사 API 연동, 국제 특송 상업 송장 자동 생성.", en: "Multi-warehouse inventory tracking, combined-shipment management, carrier API integration, and auto-generated commercial invoices for international express.", ja: "マルチ倉庫在庫管理、合配送、キャリアAPI連携、国際速達の商業送り状自動作成。", zh: "多仓库库存追踪、合单管理、承运商API集成及国际快递商业发票自动生成。", "zh-TW": "多倉庫庫存追蹤、合單管理、承運商API整合及國際快遞商業發票自動生成。", vi: "Theo dõi kho đa điểm, quản lý gộp đơn, tích hợp API vận chuyển, tự động tạo hoá đơn quốc tế.", th: "ติดตามสินค้าคลังหลายแห่ง จัดการรวมส่ง เชื่อม API ขนส่ง ออกใบกำกับสินค้าอัตโนมัติ", id: "Pelacakan inventori multi-gudang, manajemen gabung kirim, integrasi carrier API, invoice komersial otomatis.", de: "Multi-Lager-Tracking, Kombi-Versand, Carrier-API und automatische Handelsrechnungen.", fr: "Suivi multi-entrepôt, gestion groupée, API transporteurs et factures automatiques.", es: "Seguimiento multi-almacén, envío combinado, API de transporte y facturas automáticas." },
    f3t: { ko: "AI 마케팅 인텔리전스", en: "AI Marketing Intelligence", ja: "AIマーケティングインテリジェンス", zh: "AI营销智能", "zh-TW": "AI行銷智慧", vi: "AI Marketing thông minh", th: "AI Marketing Intelligence", id: "AI Marketing Intelligence", de: "KI-Marketing-Intelligenz", fr: "Intelligence Marketing IA", es: "Inteligencia de Marketing IA" },
    f3d: { ko: "8차원 광고 기여도 분석, 인플루언서 캠페인, 쿠폰 흐름 종합 분석. AI 예산 추천과 실시간 승인.", en: "8-dimensional contribution scoring across ad channels, influencer campaigns, and coupon flows. AI-driven budget recommendations with human-in-the-loop approval.", ja: "8次元の広告貢献度分析、インフルエンサーキャンペーン、クーポン分析。AIの予算提案と人間承認。", zh: "8维广告贡献度分析，覆盖网红活动和优惠券流向，AI预算建议。", "zh-TW": "8維廣告貢獻度分析，涵蓋網紅活動和優惠券流向，AI預算建議。", vi: "Phân tích đóng góp quảng cáo 8 chiều, chiến dịch influencer, dòng coupon. AI đề xuất ngân sách.", th: "การวิเคราะห์โฆษณา 8 มิติ แคมเปญอินฟลูเอนเซอร์ AI แนะนำงบ", id: "Skor kontribusi 8-dimensi, kampanye influencer, alur kupon. Rekomendasi budget AI.", de: "8-dimensionale Beitragsanalyse, Influencer-Kampagnen, KI-Budgetempfehlungen.", fr: "Scoring 8 dimensions, campagnes influenceurs, suggestions budget IA.", es: "Análisis 8 dimensiones, campañas influencer, recomendaciones presupuesto IA." },
    f4t: { ko: "인플루언서 분석", en: "Influencer Analytics", ja: "インフルエンサー分析", zh: "网红分析", "zh-TW": "網紅分析", vi: "Phân tích Influencer", th: "วิเคราะห์อินฟลูเอนเซอร์", id: "Analitik Influencer", de: "Influencer-Analytik", fr: "Analytique Influenceur", es: "Analítica de Influencer" },
    f4d: { ko: "도달률, 참여율, 전환율, ROI 평가. 자동 수수료 관리와 실시간 캠페인 성과 추적.", en: "Evaluate influencers by reach, engagement rate, conversion, and estimated ROI. Automated commission management and real-time campaign performance tracking.", ja: "リーチ、エンゲージメント率、CVR、ROIでインフルエンサーを評価。自動コミッション管理。", zh: "按触达、互动率、转化和ROI评估网红。自动佣金管理与实时跟踪。", "zh-TW": "按觸達、互動率、轉化和ROI評估網紅。自動佣金管理與即時追蹤。", vi: "Đánh giá influencer theo reach, tương tác, chuyển đổi, ROI. Quản lý hoa hồng tự động.", th: "ประเมินอินฟลูเอนเซอร์ด้วย Reach, Engagement, ROI ติดตามแคมเปญแบบเรียลไทม์", id: "Evaluasi influencer berdasarkan reach, engagement, konversi & ROI. Manajemen komisi otomatis.", de: "Influencer-Bewertung nach Reichweite, Engagement, Konversion & ROI. Auto-Provisionen.", fr: "Évaluez les influenceurs par portée, engagement, conversion et ROI. Commissions auto.", es: "Evalúe influencers por alcance, engagement, conversión y ROI. Comisiones automáticas." },
    f5t: { ko: "통합 손익 분석", en: "Unified P&L Analytics", ja: "統合P&L分析", zh: "统一损益分析", "zh-TW": "統一損益分析", vi: "Phân tích P&L hợp nhất", th: "วิเคราะห์กำไร-ขาดทุนรวม", id: "Analitik P&L Terpadu", de: "Vereinte P&L-Analytik", fr: "Analytique P&L unifiée", es: "Analítica P&L unificada" },
    f5d: { ko: "SKU·채널·캠페인·크리에이터별 실시간 손익. ROAS 하락, 반품 급증, 쿠폰 이상 패턴 자동 감지.", en: "Real-time Profit & Loss by SKU, channel, campaign, and creator. Anomaly detection for ROAS drops, return surges, and coupon abuse patterns.", ja: "SKU・チャネル・キャンペーン別のリアルタイムP/L。ROAS低下、返品急増の異常検知。", zh: "按SKU、渠道、活动实时损益。自动检测ROAS下降和退货异常。", "zh-TW": "按SKU、通路、活動即時損益。自動偵測ROAS下降和退貨異常。", vi: "Lãi/lỗ theo SKU, kênh, chiến dịch. Phát hiện bất thường ROAS, hoàn hàng.", th: "กำไร-ขาดทุนตาม SKU ช่องทาง แคมเปญ ตรวจจับ ROAS ผิดปกติ", id: "P&L real-time per SKU, channel, kampanye. Deteksi anomali ROAS & retur.", de: "Echtzeit-P&L nach SKU, Kanal, Kampagne. Anomalieerkennung für ROAS & Retouren.", fr: "P&L en temps réel par SKU, canal, campagne. Détection d'anomalies ROAS.", es: "P&L en tiempo real por SKU, canal, campaña. Detección de anomalías ROAS." },
    f6t: { ko: "정산·대사", en: "Settlement & Reconciliation", ja: "決済・照合", zh: "结算与对账", "zh-TW": "結算與對帳", vi: "Thanh toán & Đối soát", th: "การชำระเงินและกระทบยอด", id: "Settlement & Rekonsiliasi", de: "Abrechnung & Abstimmung", fr: "Règlement & Rapprochement", es: "Liquidación y Conciliación" },
    f6d: { ko: "모든 채널의 정산 자동 대사. 채널 지급액과 예상 금액 간 불일치를 즉시 포착.", en: "Automated settlement reconciliation across all channels. Catch discrepancies between channel payouts and expected amounts instantly.", ja: "全チャネルの自動決済照合。支払金額と予定金額の不一致を即時検出。", zh: "全渠道自动结算对账，即时发现支付差异。", "zh-TW": "全通路自動結算對帳，即時發現支付差異。", vi: "Đối soát thanh toán tự động. Phát hiện sai lệch ngay lập tức.", th: "กระทบยอดอัตโนมัติ ตรวจจับความต่างระหว่างยอดจ่ายและยอดที่คาดหวัง", id: "Rekonsiliasi otomatis. Deteksi selisih payout channel secara instan.", de: "Automatisierte Abrechnungsabstimmung. Sofortige Diskrepanzerkennung.", fr: "Rapprochement automatisé. Détection instantanée des écarts.", es: "Conciliación automatizada. Detección instantánea de discrepancias." },
    f7t: { ko: "AI 자동화 엔진", en: "AI Automation Engine", ja: "AI自動化エンジン", zh: "AI自动化引擎", "zh-TW": "AI自動化引擎", vi: "AI tự động hoá", th: "เครื่องยนต์ AI อัตโนมัติ", id: "Mesin Otomatisasi AI", de: "KI-Automatisierungsengine", fr: "Moteur d'automatisation IA", es: "Motor de Automatización IA" },
    f7d: { ko: "규칙 기반 + GPT 자동화 워크플로우. 임계값 설정, AI 제안, 원클릭 승인·오버라이드.", en: "Rule-based and GPT-powered automation with approval workflows. Set thresholds, get AI suggestions, approve or override with one click.", ja: "ルールベース＋GPT自動化。閾値設定、AI提案、ワンクリック承認。", zh: "基于规则和GPT的自动化，一键审批或覆盖。", "zh-TW": "基於規則和GPT的自動化，一鍵審批或覆蓋。", vi: "Tự động hoá dựa trên quy tắc & GPT. Đặt ngưỡng, nhận gợi ý AI, duyệt 1 click.", th: "อัตโนมัติตามกฎ + GPT ตั้งเกณฑ์ รับคำแนะนำ AI อนุมัติด้วยคลิกเดียว", id: "Otomasi berbasis aturan + GPT. Atur threshold, dapat saran AI, setujui satu klik.", de: "Regel- & GPT-basierte Automatisierung. KI-Vorschläge, Ein-Klick-Genehmigung.", fr: "Automatisation par règles & GPT. Suggestions IA, approbation en un clic.", es: "Automatización basada en reglas y GPT. Sugerencias IA, aprobación en un clic." },
    f8t: { ko: "30+ 채널 커넥터", en: "30+ Channel Connectors", ja: "30+チャネルコネクタ", zh: "30+渠道连接器", "zh-TW": "30+通路連接器", vi: "30+ Kết nối kênh", th: "30+ ตัวเชื่อมต่อช่องทาง", id: "30+ Konektor Channel", de: "30+ Kanal-Konnektoren", fr: "30+ Connecteurs de canaux", es: "30+ Conectores de Canal" },
    f8d: { ko: "쿠팡, 네이버, 11번가 등 국내 채널과 아마존, 메타, 틱톡 등 글로벌 플랫폼의 사전 구축 API. OAuth 인증 관리.", en: "Pre-built API connectors for domestic channels (Coupang, Naver, 11st) and global platforms (Amazon, Meta, TikTok). OAuth-ready credential management.", ja: "国内（Coupang/Naver/11st）と海外（Amazon/Meta/TikTok）の事前構築APIコネクタ。OAuth認証管理。", zh: "为国内渠道(Coupang/Naver/11st)和全球平台(Amazon/Meta/TikTok)预建API。OAuth凭证管理。", "zh-TW": "為國內通路和全球平台預建API連接器。OAuth憑證管理。", vi: "Kết nối API sẵn có cho kênh nội địa và toàn cầu. Quản lý OAuth.", th: "API สำเร็จรูปสำหรับช่องทางในประเทศและทั่วโลก จัดการ OAuth", id: "Konektor API pra-bangun untuk channel domestik & global. Manajemen OAuth.", de: "Vorgefertigte API-Konnektoren für lokale & globale Kanäle. OAuth-Verwaltung.", fr: "Connecteurs API pré-construits pour canaux locaux & globaux. Gestion OAuth.", es: "Conectores API preconstruidos para canales nacionales y globales. Gestión OAuth." },
    /* ── Testimonials ── */
    testimonialBadge: { ko: "고객 후기", en: "What Our Clients Say", ja: "お客様の声", zh: "客户评价", "zh-TW": "客戶評價", vi: "Khách hàng nói gì", th: "ลูกค้าพูดถึงเรา", id: "Apa Kata Klien Kami", de: "Was unsere Kunden sagen", fr: "Ce que disent nos clients", es: "Lo que dicen nuestros clientes" },
    testimonialTitle: { ko: "커머스 리더들이 신뢰합니다", en: "Trusted by Commerce Leaders", ja: "コマースリーダーに信頼される", zh: "深受电商领军者信赖", "zh-TW": "深受電商領軍者信賴", vi: "Được các nhà lãnh đạo thương mại tin dùng", th: "ผู้นำเทรดต่างไว้วางใจ", id: "Dipercaya Pemimpin Commerce", de: "Von Commerce-Leadern vertraut", fr: "Approuvé par les leaders du commerce", es: "Confiado por líderes del comercio" },
    t1: { ko: "Geniego-ROI 덕분에 8개 채널에서 ROAS가 340% 상승했습니다. AI 예산 배분기만으로도 주당 20시간의 수작업이 절감됐어요.", en: "Geniego-ROI helped us increase ROAS by 340% across 8 channels. The AI budget allocator alone saved 20 hours of manual work per week.", ja: "Geniego-ROIで8チャネルのROASが340%向上。AI予算配分で週20時間の手作業を削減。", zh: "Geniego-ROI帮助我们在8个渠道上将ROAS提高了340%。AI预算分配器每周节省20小时。", "zh-TW": "Geniego-ROI幫助我們在8個通路提高了340%的ROAS。AI預算分配器每週節省20小時。", vi: "Geniego-ROI giúp tăng ROAS 340% trên 8 kênh. AI phân bổ ngân sách tiết kiệm 20 giờ/tuần.", th: "Geniego-ROI ช่วยเพิ่ม ROAS 340% ใน 8 ช่องทาง AI จัดสรรงบช่วยลดงานมือ 20 ชม./สัปดาห์", id: "Geniego-ROI meningkatkan ROAS 340% di 8 channel. AI budget allocator menghemat 20 jam/minggu.", de: "Geniego-ROI steigerte unseren ROAS um 340% auf 8 Kanälen. KI-Budget sparte 20 Std./Woche.", fr: "Geniego-ROI a augmenté notre ROAS de 340% sur 8 canaux. L'IA budget économise 20h/semaine.", es: "Geniego-ROI elevó nuestro ROAS 340% en 8 canales. El presupuesto IA ahorró 20h/semana." },
    t2: { ko: "아마존, 쿠팡, 쇼피파이를 아우르는 통합 손익 뷰가 그동안 없던 명확한 인사이트를 제공했습니다. 6개월 만에 매출 2.8배 성장.", en: "The unified P&L view across Amazon, Coupang, and Shopify gave us clarity we never had. Revenue grew 2.8x in 6 months.", ja: "Amazon、Coupang、ShopifyのP/L統合ビューで6ヶ月で売上2.8倍。", zh: "跨Amazon、Coupang、Shopify的统一损益视图，6个月收入增长2.8倍。", "zh-TW": "跨Amazon、Coupang、Shopify的統一損益視圖，6個月營收增長2.8倍。", vi: "P&L hợp nhất trên Amazon, Coupang, Shopify cho insight rõ ràng. Doanh thu x2.8 trong 6 tháng.", th: "มุมมอง P&L รวมข้าม Amazon, Coupang, Shopify รายได้โต 2.8 เท่าใน 6 เดือน", id: "View P&L terpadu Amazon, Coupang, Shopify. Revenue naik 2.8x dalam 6 bulan.", de: "Die vereinte P&L über Amazon, Coupang und Shopify: 2,8x Umsatz in 6 Monaten.", fr: "Vue P&L unifiée Amazon, Coupang, Shopify : revenus x2,8 en 6 mois.", es: "Vista P&L unificada Amazon, Coupang, Shopify: ingresos x2.8 en 6 meses." },
    t3: { ko: "인플루언서 분석 엔진은 게임 체인저입니다. ROI 상위 5명의 크리에이터를 발굴하고 낭비 지출을 65% 줄였습니다.", en: "Influencer analytics engine is a game-changer. We identified our top 5 ROI creators and cut wasted spend by 65%.", ja: "インフルエンサー分析エンジンは革命的。上位5名のROIクリエイターを特定し、無駄を65%削減。", zh: "网红分析引擎改变了游戏规则。我们找到ROI前5位创作者，减少65%浪费。", "zh-TW": "網紅分析引擎改變了遊戲規則。找到ROI前5位創作者，減少65%浪費。", vi: "Công cụ phân tích influencer thật sự đột phá. Tìm top 5 ROI, giảm 65% chi phí lãng phí.", th: "เครื่องวิเคราะห์อินฟลูเอนเซอร์เปลี่ยนเกม! พบ 5 อันดับ ROI ลดค่าใช้จ่ายเปล่า 65%", id: "Engine analitik influencer adalah game-changer. Menemukan top 5 ROI, mengurangi 65% spending.", de: "Influencer-Analytik ist ein Game-Changer. Top-5-ROI-Creator identifiziert, 65% weniger Verschwendung.", fr: "L'analyse influenceurs est un game-changer. Top 5 ROI identifiés, 65% de dépenses réduites.", es: "La analítica de influencers es un game-changer. Top 5 ROI identificados, 65% menos gasto." },
    /* ── CTA ── */
    ctaTitle: {
        ko: "매출 성장의 잠재력을 열어보세요", en: "Ready to unlock your revenue potential?",
        ja: "収益の可能性を解放する準備はできましたか？", zh: "准备释放您的收入潜力？",
        "zh-TW": "準備釋放您的營收潛力？", vi: "Sẵn sàng khai phóng tiềm năng doanh thu?",
        th: "พร้อมปลดล็อกศักยภาพรายได้ของคุณ?", id: "Siap membuka potensi pendapatan Anda?",
        de: "Bereit, Ihr Umsatzpotenzial freizuschalten?", fr: "Prêt à libérer votre potentiel de revenus ?",
        es: "¿Listo para desbloquear su potencial de ingresos?",
    },
    ctaDesc: {
        ko: "무료 데모 계정으로 시작하세요. 준비되면 월 $49의 Starter로 업그레이드. 언제든 해지 가능.",
        en: "Start with a free Demo account. Upgrade to Starter at $49/mo when you're ready. Cancel anytime.",
        ja: "無料デモアカウントで開始。準備ができたら月額$49のStarterにアップグレード。いつでもキャンセル可能。",
        zh: "免费Demo账号上手，准备好后升级至$49/月Starter。随时取消。",
        "zh-TW": "免費Demo帳號開始，準備好後升級至$49/月Starter。隨時取消。",
        vi: "Bắt đầu miễn phí. Nâng cấp Starter $49/tháng khi sẵn sàng. Huỷ bất kỳ lúc nào.",
        th: "เริ่มด้วยบัญชี Demo ฟรี อัปเกรด Starter $49/เดือน ยกเลิกเมื่อไหร่ก็ได้",
        id: "Mulai dengan akun Demo gratis. Upgrade ke Starter $49/bln saat siap. Batalkan kapan saja.",
        de: "Starten Sie kostenlos. Upgrade auf Starter für $49/Monat. Jederzeit kündbar.",
        fr: "Commencez gratuitement. Passez à Starter à 49$/mois. Annulez à tout moment.",
        es: "Comience gratis. Actualice a Starter por $49/mes. Cancele en cualquier momento.",
    },
    ctaBtnPricing: { ko: "요금제 보기 →", en: "View Pricing →", ja: "料金プランを見る →", zh: "查看定价 →", "zh-TW": "查看定價 →", vi: "Xem bảng giá →", th: "ดูราคา →", id: "Lihat Harga →", de: "Preise ansehen →", fr: "Voir les tarifs →", es: "Ver precios →" },
    ctaBtnContact: { ko: "영업팀 문의", en: "Contact Sales", ja: "営業に連絡", zh: "联系销售", "zh-TW": "聯繫銷售", vi: "Liên hệ bán hàng", th: "ติดต่อฝ่ายขาย", id: "Hubungi Sales", de: "Vertrieb kontaktieren", fr: "Contacter les ventes", es: "Contactar ventas" },
};


const DICT_EXT = {
    "heroBadge": {
        "pt": "🚀 Plataforma All-in-One de Automação de Commerce com IA",
        "ru": "🚀 Универсальная платформа AI-автоматизации коммерции",
        "ar": "🚀 منصة متكاملة لأتمتة التجارة بالذكاء الاصطناعي",
        "hi": "🚀 ऑल-इन-वन AI कॉमर्स ऑटोमेशन प्लेटफ़ॉर्म"
    },
    "heroTitle": {
        "pt": "Com Análise de Dados por IA\nAnúncios · Vendas · Estoque · Envio · Liquidação\nToda a operação de canais automatizada em uma plataforma",
        "ru": "С помощью AI-аналитики данных\nРеклама · Продажи · Склад · Доставка · Расчёты\nВсе каналы автоматизированы на одной платформе",
        "ar": "عبر تحليلات البيانات بالذكاء الاصطناعي\nالإعلانات · المبيعات · المخزون · الشحن · التسوية\nأتمتة تشغيل جميع القنوات في منصة واحدة",
        "hi": "AI डेटा एनालिटिक्स के माध्यम से\nविज्ञापन · बिक्री · इन्वेंटरी · शिपिंग · सेटलमेंट\nसभी चैनल संचालन एक प्लेटफ़ॉर्म में स्वचालित"
    },
    "heroDesc": {
        "pt": "Automação de anúncios · Cadastro de produtos · Gestão de estoque · Processamento de pedidos · Rastreamento · Análise de desempenho · Liquidação — a IA automatiza seu comércio de A a Z.",
        "ru": "Автоматизация рекламы · Листинг товаров · Управление складом · Обработка заказов · Отслеживание доставки · Аналитика · Расчёты — AI автоматизирует коммерцию от А до Я.",
        "ar": "أتمتة الإعلانات · إدراج المنتجات · إدارة المخزون · معالجة الطلبات · تتبّع الشحن · تحليل الأداء · التسوية — الذكاء الاصطناعي يؤتمت تجارتك من الألف إلى الياء.",
        "hi": "विज्ञापन ऑटोमेशन · प्रोडक्ट लिस्टिंग · इन्वेंटरी प्रबंधन · ऑर्डर प्रोसेसिंग · शिपिंग ट्रैकिंग · प्रदर्शन एनालिटिक्स · सेटलमेंट — AI आपके कॉमर्स को A से Z तक स्वचालित करता है।"
    },
    "btnTrial": {
        "pt": "Iniciar teste grátis →",
        "ru": "Начать бесплатно →",
        "ar": "ابدأ مجانًا →",
        "hi": "नि:शुल्क शुरू करें →"
    },
    "btnLogin": {
        "pt": "Entrar no painel",
        "ru": "Войти в панель",
        "ar": "تسجيل الدخول إلى اللوحة",
        "hi": "डैशबोर्ड लॉगिन"
    },
    "statChannels": {
        "pt": "Canais de venda",
        "ru": "Каналы продаж",
        "ar": "قنوات البيع",
        "hi": "बिक्री चैनल"
    },
    "statSKUs": {
        "pt": "SKUs gerenciados",
        "ru": "Управляемые SKU",
        "ar": "وحدات SKU المُدارة",
        "hi": "प्रबंधित SKU"
    },
    "statData": {
        "pt": "Dados / dia",
        "ru": "Данные / день",
        "ar": "بيانات / يوم",
        "hi": "डेटा / दिन"
    },
    "statClients": {
        "pt": "Clientes enterprise",
        "ru": "Корпоративные клиенты",
        "ar": "عملاء المؤسسات",
        "hi": "एंटरप्राइज़ ग्राहक"
    },
    "integrationsLabel": {
        "pt": "Integrações confiáveis",
        "ru": "Надёжные интеграции",
        "ar": "تكاملات موثوقة",
        "hi": "विश्वसनीय इंटीग्रेशन"
    },
    "featuresBadge": {
        "pt": "Recursos da plataforma",
        "ru": "Возможности платформы",
        "ar": "إمكانات المنصة",
        "hi": "प्लेटफ़ॉर्म क्षमताएं"
    },
    "featuresTitle": {
        "pt": "Tudo que você precisa para escalar",
        "ru": "Всё, что нужно для роста",
        "ar": "كل ما تحتاجه للتوسّع",
        "hi": "स्केल करने के लिए ज़रूरी सब कुछ"
    },
    "featuresDesc": {
        "pt": "Do armazém à carteira — uma plataforma para todo o ciclo de receita",
        "ru": "От склада до кошелька — одна платформа для всего цикла выручки",
        "ar": "من المستودع إلى المحفظة — منصة واحدة لكامل دورة الإيرادات",
        "hi": "गोदाम से वॉलेट तक — पूरे राजस्व चक्र के लिए एक प्लेटफ़ॉर्म"
    },
    "f1t": {
        "pt": "Comércio Omnichannel",
        "ru": "Омниканальная коммерция",
        "ar": "تجارة متعددة القنوات",
        "hi": "ऑम्निचैनल कॉमर्स"
    },
    "f1d": {
        "pt": "Conecte 30+ marketplaces — Coupang, Naver, Amazon, Shopify, TikTok Shop. Padronize pedidos, estoque e fulfillment em um hub unificado.",
        "ru": "Подключите 30+ маркетплейсов — Coupang, Naver, Amazon, Shopify, TikTok Shop. Стандартизируйте заказы, склад и фулфилмент в едином хабе.",
        "ar": "اربط أكثر من 30 سوقًا — Coupang وNaver وAmazon وShopify وTikTok Shop. وحّد الطلبات والمخزون والتنفيذ في مركز واحد.",
        "hi": "30+ मार्केटप्लेस जोड़ें — Coupang, Naver, Amazon, Shopify, TikTok Shop। ऑर्डर, इन्वेंटरी और फुलफिलमेंट एक हब में मानकीकृत करें।"
    },
    "f2t": {
        "pt": "WMS — Armazém & Logística",
        "ru": "WMS — склад и логистика",
        "ar": "WMS — المستودع واللوجستيات",
        "hi": "WMS — गोदाम और लॉजिस्टिक्स"
    },
    "f2d": {
        "pt": "Rastreamento multi-armazém, gestão de envio combinado, integração de API de transportadoras e faturas comerciais automáticas para expresso internacional.",
        "ru": "Учёт по нескольким складам, объединённые отправления, интеграция API перевозчиков и автогенерация коммерческих инвойсов.",
        "ar": "تتبّع المخزون متعدد المستودعات، إدارة الشحن المجمّع، تكامل API لشركات الشحن، وإنشاء فواتير تجارية تلقائيًا.",
        "hi": "बहु-गोदाम इन्वेंटरी ट्रैकिंग, संयुक्त शिपमेंट प्रबंधन, कैरियर API इंटीग्रेशन और स्वतः वाणिज्यिक चालान।"
    },
    "f3t": {
        "pt": "Inteligência de Marketing IA",
        "ru": "AI-маркетинг-аналитика",
        "ar": "ذكاء التسويق بالـ AI",
        "hi": "AI मार्केटिंग इंटेलिजेंस"
    },
    "f3d": {
        "pt": "Pontuação de contribuição em 8 dimensões, campanhas de influenciadores e fluxos de cupom. Recomendações de orçamento por IA com aprovação humana.",
        "ru": "8-мерная оценка вклада по каналам, кампании с инфлюенсерами и купоны. AI-рекомендации бюджета с подтверждением человеком.",
        "ar": "تقييم إسهام ثماني الأبعاد عبر القنوات وحملات المؤثرين والكوبونات. توصيات ميزانية بالـ AI مع موافقة بشرية.",
        "hi": "8-आयामी योगदान स्कोरिंग, इन्फ्लुएंसर अभियान और कूपन प्रवाह। मानव-अनुमोदन के साथ AI बजट सिफ़ारिशें।"
    },
    "f4t": {
        "pt": "Analítica de Influenciadores",
        "ru": "Аналитика инфлюенсеров",
        "ar": "تحليلات المؤثرين",
        "hi": "इन्फ्लुएंसर एनालिटिक्स"
    },
    "f4d": {
        "pt": "Avalie influenciadores por alcance, engajamento, conversão e ROI. Gestão automática de comissões e acompanhamento em tempo real.",
        "ru": "Оценка инфлюенсеров по охвату, вовлечённости, конверсии и ROI. Автоуправление комиссиями и мониторинг в реальном времени.",
        "ar": "قيّم المؤثرين حسب الوصول والتفاعل والتحويل والعائد. إدارة عمولات تلقائية وتتبّع لحظي.",
        "hi": "रीच, एंगेजमेंट, कन्वर्ज़न और ROI के आधार पर इन्फ्लुएंसर मूल्यांकन। स्वतः कमीशन प्रबंधन और रियल-टाइम ट्रैकिंग।"
    },
    "f5t": {
        "pt": "Analítica de P&L Unificada",
        "ru": "Единая P&L-аналитика",
        "ar": "تحليلات الأرباح والخسائر الموحّدة",
        "hi": "एकीकृत P&L एनालिटिक्स"
    },
    "f5d": {
        "pt": "Lucros e perdas em tempo real por SKU, canal, campanha e criador. Detecção de anomalias para quedas de ROAS, picos de devolução e abuso de cupom.",
        "ru": "Прибыли и убытки в реальном времени по SKU, каналу, кампании. Выявление аномалий: падение ROAS, всплески возвратов, злоупотребление купонами.",
        "ar": "أرباح وخسائر لحظية حسب SKU والقناة والحملة. كشف الشذوذ لانخفاض ROAS وارتفاع المرتجعات وإساءة الكوبونات.",
        "hi": "SKU, चैनल, अभियान और क्रिएटर के अनुसार रियल-टाइम लाभ-हानि। ROAS गिरावट, रिटर्न उछाल और कूपन दुरुपयोग का पता।"
    },
    "f6t": {
        "pt": "Liquidação & Conciliação",
        "ru": "Расчёты и сверка",
        "ar": "التسوية والمطابقة",
        "hi": "सेटलमेंट और मिलान"
    },
    "f6d": {
        "pt": "Conciliação automática de liquidação em todos os canais. Capture discrepâncias entre repasses e valores esperados instantaneamente.",
        "ru": "Автоматическая сверка расчётов по всем каналам. Мгновенно выявляйте расхождения между выплатами и ожидаемыми суммами.",
        "ar": "مطابقة التسوية تلقائيًا عبر جميع القنوات. اكتشف الفروق بين المدفوعات والمبالغ المتوقعة فورًا.",
        "hi": "सभी चैनलों में स्वतः सेटलमेंट मिलान। पेआउट और अपेक्षित राशि के बीच विसंगतियाँ तुरंत पकड़ें।"
    },
    "f7t": {
        "pt": "Motor de Automação IA",
        "ru": "Движок AI-автоматизации",
        "ar": "محرّك الأتمتة بالـ AI",
        "hi": "AI ऑटोमेशन इंजन"
    },
    "f7d": {
        "pt": "Automação baseada em regras e GPT com fluxos de aprovação. Defina limites, receba sugestões de IA, aprove ou substitua com um clique.",
        "ru": "Автоматизация на правилах и GPT с согласованиями. Задавайте пороги, получайте AI-подсказки, подтверждайте одним кликом.",
        "ar": "أتمتة قائمة على القواعد وGPT مع مسارات موافقة. حدّد العتبات واحصل على اقتراحات AI ووافق بنقرة واحدة.",
        "hi": "नियम-आधारित और GPT ऑटोमेशन, अनुमोदन वर्कफ़्लो के साथ। थ्रेशोल्ड सेट करें, AI सुझाव पाएं, एक क्लिक में अनुमोदित करें।"
    },
    "f8t": {
        "pt": "30+ Conectores de Canal",
        "ru": "30+ коннекторов каналов",
        "ar": "أكثر من 30 موصّل قناة",
        "hi": "30+ चैनल कनेक्टर"
    },
    "f8d": {
        "pt": "Conectores de API prontos para canais nacionais (Coupang, Naver, 11st) e globais (Amazon, Meta, TikTok). Gestão de credenciais OAuth.",
        "ru": "Готовые API-коннекторы для локальных (Coupang, Naver, 11st) и глобальных (Amazon, Meta, TikTok) каналов. Управление учётными данными OAuth.",
        "ar": "موصّلات API جاهزة للقنوات المحلية (Coupang وNaver و11st) والعالمية (Amazon وMeta وTikTok). إدارة بيانات اعتماد OAuth.",
        "hi": "घरेलू (Coupang, Naver, 11st) और वैश्विक (Amazon, Meta, TikTok) चैनलों के लिए पूर्व-निर्मित API कनेक्टर। OAuth क्रेडेंशियल प्रबंधन।"
    },
    "testimonialBadge": {
        "pt": "O que dizem nossos clientes",
        "ru": "Что говорят клиенты",
        "ar": "ماذا يقول عملاؤنا",
        "hi": "हमारे ग्राहक क्या कहते हैं"
    },
    "testimonialTitle": {
        "pt": "Confiado por líderes do comércio",
        "ru": "Нам доверяют лидеры коммерции",
        "ar": "موثوق من قادة التجارة",
        "hi": "कॉमर्स लीडर्स का भरोसा"
    },
    "t1": {
        "pt": "O Geniego-ROI aumentou nosso ROAS em 340% em 8 canais. Só o alocador de orçamento por IA economizou 20 horas de trabalho manual por semana.",
        "ru": "Geniego-ROI повысил наш ROAS на 340% по 8 каналам. Один только AI-распределитель бюджета сэкономил 20 часов ручной работы в неделю.",
        "ar": "ساعدنا Geniego-ROI على رفع ROAS بنسبة 340% عبر 8 قنوات. وفّر موزّع الميزانية بالـ AI وحده 20 ساعة عمل يدوي أسبوعيًا.",
        "hi": "Geniego-ROI ने 8 चैनलों पर हमारा ROAS 340% बढ़ाया। अकेले AI बजट एलोकेटर ने प्रति सप्ताह 20 घंटे का मैन्युअल काम बचाया।"
    },
    "t2": {
        "pt": "A visão unificada de P&L entre Amazon, Coupang e Shopify nos deu clareza inédita. A receita cresceu 2,8x em 6 meses.",
        "ru": "Единый обзор P&L по Amazon, Coupang и Shopify дал ясность, которой не было. Выручка выросла в 2,8 раза за 6 месяцев.",
        "ar": "منحتنا رؤية الأرباح والخسائر الموحّدة عبر Amazon وCoupang وShopify وضوحًا غير مسبوق. نمت الإيرادات 2.8 ضعفًا في 6 أشهر.",
        "hi": "Amazon, Coupang और Shopify में एकीकृत P&L व्यू ने वह स्पष्टता दी जो पहले नहीं थी। 6 महीनों में राजस्व 2.8 गुना बढ़ा।"
    },
    "t3": {
        "pt": "O motor de analítica de influenciadores é revolucionário. Identificamos nossos 5 criadores de maior ROI e cortamos 65% de gasto desperdiçado.",
        "ru": "Движок аналитики инфлюенсеров — переломный момент. Мы нашли топ-5 авторов по ROI и сократили лишние расходы на 65%.",
        "ar": "محرّك تحليلات المؤثرين نقلة نوعية. حدّدنا أفضل 5 صنّاع محتوى من حيث العائد وخفّضنا الإنفاق المهدور 65%.",
        "hi": "इन्फ्लुएंसर एनालिटिक्स इंजन गेम-चेंजर है। हमने शीर्ष 5 ROI क्रिएटर पहचाने और बर्बाद खर्च 65% घटाया।"
    },
    "ctaTitle": {
        "pt": "Pronto para liberar seu potencial de receita?",
        "ru": "Готовы раскрыть потенциал выручки?",
        "ar": "هل أنت مستعد لإطلاق إمكانات إيراداتك؟",
        "hi": "अपनी राजस्व क्षमता खोलने के लिए तैयार?"
    },
    "ctaDesc": {
        "pt": "Comece com uma conta Demo gratuita. Faça upgrade quando estiver pronto. Cancele a qualquer momento.",
        "ru": "Начните с бесплатного Demo-аккаунта. Повышайте тариф, когда будете готовы. Отмена в любое время.",
        "ar": "ابدأ بحساب Demo مجاني. قم بالترقية عندما تكون جاهزًا. ألغِ في أي وقت.",
        "hi": "नि:शुल्क Demo अकाउंट से शुरू करें। तैयार होने पर अपग्रेड करें। कभी भी रद्द करें।"
    },
    "ctaBtnPricing": {
        "pt": "Ver preços →",
        "ru": "Смотреть тарифы →",
        "ar": "عرض الأسعار →",
        "hi": "मूल्य देखें →"
    },
    "ctaBtnContact": {
        "pt": "Falar com vendas",
        "ru": "Связаться с отделом продаж",
        "ar": "تواصل مع المبيعات",
        "hi": "सेल्स से संपर्क करें"
    }
};

const DICT15 = {
    "heroTrust": {
        "ko": "✓ 카드 불필요    ✓ 30일 전액 환불 보장    ✓ 5분 안에 시작",
        "en": "✓ No card required    ✓ 30-day money-back    ✓ Start in 5 minutes",
        "ja": "✓ カード不要    ✓ 30日間返金保証    ✓ 5分で開始",
        "zh": "✓ 无需信用卡    ✓ 30天退款保证    ✓ 5分钟开始",
        "zh-TW": "✓ 無需信用卡    ✓ 30天退款保證    ✓ 5分鐘開始",
        "vi": "✓ Không cần thẻ    ✓ Hoàn tiền 30 ngày    ✓ Bắt đầu trong 5 phút",
        "th": "✓ ไม่ต้องใช้บัตร    ✓ คืนเงินใน 30 วัน    ✓ เริ่มใน 5 นาที",
        "id": "✓ Tanpa kartu    ✓ Garansi 30 hari    ✓ Mulai dalam 5 menit",
        "de": "✓ Keine Karte nötig    ✓ 30 Tage Geld-zurück    ✓ In 5 Minuten starten",
        "fr": "✓ Sans carte    ✓ Remboursé sous 30 jours    ✓ Démarrez en 5 minutes",
        "es": "✓ Sin tarjeta    ✓ Reembolso de 30 días    ✓ Comience en 5 minutos",
        "pt": "✓ Sem cartão    ✓ Reembolso em 30 dias    ✓ Comece em 5 minutos",
        "ru": "✓ Без карты    ✓ Возврат за 30 дней    ✓ Старт за 5 минут",
        "ar": "✓ بدون بطاقة    ✓ استرداد خلال 30 يومًا    ✓ ابدأ خلال 5 دقائق",
        "hi": "✓ कार्ड की ज़रूरत नहीं    ✓ 30-दिन मनी-बैक    ✓ 5 मिनट में शुरू"
    },
    "trustBadge": {
        "ko": "엔터프라이즈 신뢰 기반",
        "en": "Enterprise Trust",
        "ja": "エンタープライズの信頼",
        "zh": "企业级信任",
        "zh-TW": "企業級信任",
        "vi": "Niềm tin doanh nghiệp",
        "th": "ความน่าเชื่อถือระดับองค์กร",
        "id": "Kepercayaan Enterprise",
        "de": "Enterprise-Vertrauen",
        "fr": "Confiance entreprise",
        "es": "Confianza empresarial",
        "pt": "Confiança enterprise",
        "ru": "Корпоративное доверие",
        "ar": "ثقة المؤسسات",
        "hi": "एंटरप्राइज़ भरोसा"
    },
    "trustTitle": {
        "ko": "어디 내놔도 자신 있는 초엔터프라이즈 기반",
        "en": "Built on Super-Enterprise Foundations",
        "ja": "超エンタープライズ基盤",
        "zh": "超企业级基础架构",
        "zh-TW": "超企業級基礎架構",
        "vi": "Nền tảng siêu doanh nghiệp",
        "th": "รากฐานระดับซูเปอร์เอนเตอร์ไพรส์",
        "id": "Fondasi Super-Enterprise",
        "de": "Auf Super-Enterprise-Fundament",
        "fr": "Bâti sur des fondations super-entreprise",
        "es": "Sobre bases super-empresariales",
        "pt": "Sobre bases super-enterprise",
        "ru": "На фундаменте супер-энтерпрайз",
        "ar": "مبني على أسس فائقة المستوى للمؤسسات",
        "hi": "सुपर-एंटरप्राइज़ नींव पर निर्मित"
    },
    "ts1": {
        "ko": "은행급 보안 · PCI DSS · 종단 암호화",
        "en": "Bank-grade security · PCI DSS · E2E encryption",
        "ja": "銀行レベルのセキュリティ · PCI DSS · 暗号化",
        "zh": "银行级安全 · PCI DSS · 端到端加密",
        "zh-TW": "銀行級安全 · PCI DSS · 端到端加密",
        "vi": "Bảo mật cấp ngân hàng · PCI DSS · Mã hoá",
        "th": "ความปลอดภัยระดับธนาคาร · PCI DSS · เข้ารหัส",
        "id": "Keamanan kelas bank · PCI DSS · Enkripsi",
        "de": "Bank-Sicherheit · PCI DSS · Verschlüsselung",
        "fr": "Sécurité bancaire · PCI DSS · Chiffrement",
        "es": "Seguridad bancaria · PCI DSS · Cifrado",
        "pt": "Segurança bancária · PCI DSS · Criptografia",
        "ru": "Банковская безопасность · PCI DSS · Шифрование",
        "ar": "أمان مصرفي · PCI DSS · تشفير",
        "hi": "बैंक-स्तरीय सुरक्षा · PCI DSS · एन्क्रिप्शन"
    },
    "ts2": {
        "ko": "99.9% 가동률 SLA 보장",
        "en": "99.9% uptime SLA",
        "ja": "99.9% 稼働率 SLA",
        "zh": "99.9% 可用性 SLA",
        "zh-TW": "99.9% 可用性 SLA",
        "vi": "SLA hoạt động 99,9%",
        "th": "SLA อัปไทม์ 99.9%",
        "id": "SLA uptime 99,9%",
        "de": "99,9% Verfügbarkeits-SLA",
        "fr": "SLA 99,9% de disponibilité",
        "es": "SLA de disponibilidad 99,9%",
        "pt": "SLA de uptime 99,9%",
        "ru": "SLA доступности 99,9%",
        "ar": "اتفاقية مستوى خدمة 99.9%",
        "hi": "99.9% अपटाइम SLA"
    },
    "ts3": {
        "ko": "15개국 현지 자연어 지원",
        "en": "15 languages, natively localized",
        "ja": "15言語のネイティブ対応",
        "zh": "15种语言本地化",
        "zh-TW": "15種語言在地化",
        "vi": "Bản địa hoá 15 ngôn ngữ",
        "th": "รองรับ 15 ภาษา",
        "id": "15 bahasa terlokalisasi",
        "de": "15 Sprachen nativ lokalisiert",
        "fr": "15 langues localisées",
        "es": "15 idiomas localizados",
        "pt": "15 idiomas localizados",
        "ru": "15 языков с локализацией",
        "ar": "15 لغة موطّنة محليًا",
        "hi": "15 भाषाएं, मूल स्थानीयकरण"
    },
    "ts4": {
        "ko": "30일 전액 환불 보장",
        "en": "30-day full money-back",
        "ja": "30日間全額返金保証",
        "zh": "30天全额退款",
        "zh-TW": "30天全額退款",
        "vi": "Hoàn tiền đầy đủ 30 ngày",
        "th": "คืนเงินเต็มจำนวน 30 วัน",
        "id": "Pengembalian penuh 30 hari",
        "de": "30 Tage volle Rückerstattung",
        "fr": "Remboursement intégral 30 jours",
        "es": "Reembolso total de 30 días",
        "pt": "Reembolso total de 30 dias",
        "ru": "Полный возврат за 30 дней",
        "ar": "استرداد كامل خلال 30 يومًا",
        "hi": "30-दिन पूर्ण मनी-बैक"
    }
};

const DICT_RICH = {
  "navProduct": {
    "ko": "제품",
    "en": "Product"
  },
  "navSolutions": {
    "ko": "솔루션",
    "en": "Solutions"
  },
  "navPricing": {
    "ko": "요금제",
    "en": "Pricing"
  },
  "navStart": {
    "ko": "무료로 시작",
    "en": "Start free"
  },
  "navLogin2": {
    "ko": "로그인",
    "en": "Log in"
  },
  "problemBadge": {
    "ko": "왜 GeniegoROI인가",
    "en": "Why GeniegoROI"
  },
  "problemTitle": {
    "ko": "흩어진 커머스 운영,\n이제 하나의 지능형 플랫폼으로",
    "en": "Fragmented commerce ops,\nnow one intelligent platform"
  },
  "problemDesc": {
    "ko": "채널마다 다른 광고 대시보드, 엑셀로 맞추는 정산, 흩어진 재고와 주문 — 커머스 운영의 복잡함이 성장의 발목을 잡습니다. GeniegoROI는 30개 이상 채널의 데이터를 실시간으로 통합하고, AI가 광고·판매·재고·배송·정산을 자동으로 분석·실행합니다. 운영자는 의사결정에만 집중하면 됩니다.",
    "en": "Different ad dashboards per channel, settlements stitched together in spreadsheets, scattered inventory and orders — operational complexity caps your growth. GeniegoROI unifies 30+ channels in real time, and AI automatically analyzes and acts across ads, sales, inventory, shipping and settlement. You focus only on decisions."
  },
  "modulesBadge": {
    "ko": "하나의 플랫폼, 모든 기능",
    "en": "One Platform, Every Capability"
  },
  "modulesTitle": {
    "ko": "커머스 운영의 전 과정을 통합",
    "en": "The entire commerce lifecycle, unified"
  },
  "modulesDesc": {
    "ko": "연결부터 분석, 자동화까지 — 따로 놀던 도구를 하나로 대체합니다.",
    "en": "From connection to analytics to automation — replace your scattered tools with one."
  },
  "m1t": {
    "ko": "옴니채널 커머스",
    "en": "OmniChannel Commerce"
  },
  "m1d": {
    "ko": "30개 이상 국내외 마켓을 하나의 허브로 연결해 주문·재고·배송을 표준화합니다.",
    "en": "Connect 30+ marketplaces into one hub and standardize orders, inventory and fulfillment."
  },
  "m1b1": {
    "ko": "쿠팡·네이버·아마존·쇼피파이·틱톡샵 등 사전 구축 커넥터",
    "en": "Pre-built connectors: Coupang, Naver, Amazon, Shopify, TikTok Shop"
  },
  "m1b2": {
    "ko": "통합 카탈로그·재고 동기화, 합배송 관리",
    "en": "Unified catalog & inventory sync, combined shipments"
  },
  "m1b3": {
    "ko": "OAuth 자격증명 관리·자동 동기화",
    "en": "OAuth credential management & auto-sync"
  },
  "m2t": {
    "ko": "AI 마케팅 인텔리전스",
    "en": "AI Marketing Intelligence"
  },
  "m2d": {
    "ko": "8차원 광고 기여도 분석과 AI 예산 추천으로 ROAS를 극대화합니다.",
    "en": "Maximize ROAS with 8-dimensional attribution and AI budget recommendations."
  },
  "m2b1": {
    "ko": "멀티터치 어트리뷰션·채널 KPI·경쟁사 분석",
    "en": "Multi-touch attribution, channel KPIs, competitor analysis"
  },
  "m2b2": {
    "ko": "AI 광고 소재 생성·콘텐츠 캘린더",
    "en": "AI ad-creative generation & content calendar"
  },
  "m2b3": {
    "ko": "AI 예산 배분 + 사람 승인 워크플로우",
    "en": "AI budget allocation with human-in-the-loop approval"
  },
  "m3t": {
    "ko": "WMS — 창고·물류",
    "en": "WMS — Warehouse & Logistics"
  },
  "m3d": {
    "ko": "다중 창고 재고와 국제 물류를 한 화면에서 관리합니다.",
    "en": "Manage multi-warehouse inventory and global logistics in one view."
  },
  "m3b1": {
    "ko": "LOT·FEFO 재고 추적, 피킹·패킹·합포장",
    "en": "LOT/FEFO tracking, picking, packing, consolidation"
  },
  "m3b2": {
    "ko": "운송사 API 연동·배송 추적",
    "en": "Carrier API integration & shipment tracking"
  },
  "m3b3": {
    "ko": "국제 특송 상업 송장 자동 생성",
    "en": "Auto-generated commercial invoices for international express"
  },
  "m4t": {
    "ko": "통합 손익 · 정산 대사",
    "en": "Unified P&L & Settlement"
  },
  "m4d": {
    "ko": "SKU·채널·캠페인별 실시간 손익과 자동 정산 대사로 새는 돈을 막습니다.",
    "en": "Real-time P&L by SKU/channel/campaign and automated settlement reconciliation."
  },
  "m4b1": {
    "ko": "실시간 손익·ROAS·반품·쿠폰 이상 감지",
    "en": "Real-time P&L, ROAS, return & coupon anomaly detection"
  },
  "m4b2": {
    "ko": "전 채널 정산 자동 대사·불일치 즉시 포착",
    "en": "Auto-reconcile all channels, catch discrepancies instantly"
  },
  "m4b3": {
    "ko": "세금계산서·전자 정산·ERP 연동",
    "en": "Tax invoices, e-settlement, ERP integration"
  },
  "m5t": {
    "ko": "인플루언서 · CRM",
    "en": "Influencer & CRM"
  },
  "m5d": {
    "ko": "고객 여정과 인플루언서 ROI를 데이터로 운영하고 자동화합니다.",
    "en": "Run customer journeys and influencer ROI on data, automatically."
  },
  "m5b1": {
    "ko": "RFM·VIP·AI 세그먼트, 고객 여정 빌더",
    "en": "RFM/VIP/AI segments, customer journey builder"
  },
  "m5b2": {
    "ko": "이메일·카카오·LINE·WhatsApp·Instagram DM",
    "en": "Email, Kakao, LINE, WhatsApp, Instagram DM"
  },
  "m5b3": {
    "ko": "인플루언서 도달·전환·ROI 평가·수수료 관리",
    "en": "Influencer reach/conversion/ROI scoring & commission management"
  },
  "m6t": {
    "ko": "AI 자동화 엔진",
    "en": "AI Automation Engine"
  },
  "m6d": {
    "ko": "규칙 + GPT 기반 워크플로우로 운영을 자율 실행합니다.",
    "en": "Autonomous operations via rule + GPT-powered workflows."
  },
  "m6b1": {
    "ko": "AI 룰 엔진·알림 정책·액션 프리셋",
    "en": "AI rule engine, alert policies, action presets"
  },
  "m6b2": {
    "ko": "임계값 설정·AI 제안·원클릭 승인",
    "en": "Set thresholds, get AI suggestions, one-click approval"
  },
  "m6b3": {
    "ko": "데이터 라이트백·즉시 롤백 안전망",
    "en": "Data write-back with instant rollback safety net"
  },
  "howBadge": {
    "ko": "3단계로 시작",
    "en": "Get Started in 3 Steps"
  },
  "howTitle": {
    "ko": "연결하고, 분석하고, 자동화하세요",
    "en": "Connect, analyze, automate"
  },
  "how1t": {
    "ko": "1. 채널 연결",
    "en": "1. Connect channels"
  },
  "how1d": {
    "ko": "5분 안에 30개 이상 채널을 OAuth로 연결. 데이터가 실시간으로 통합됩니다.",
    "en": "Connect 30+ channels via OAuth in 5 minutes. Data unifies in real time."
  },
  "how2t": {
    "ko": "2. AI 분석",
    "en": "2. AI analyzes"
  },
  "how2d": {
    "ko": "AI가 광고·매출·재고·정산을 분석해 기회와 위험을 자동으로 찾아냅니다.",
    "en": "AI analyzes ads, sales, inventory and settlement to surface opportunities and risks."
  },
  "how3t": {
    "ko": "3. 자동 실행·성장",
    "en": "3. Automate & grow"
  },
  "how3d": {
    "ko": "AI 추천을 원클릭 승인하면 운영이 자율 실행됩니다. 성장에만 집중하세요.",
    "en": "Approve AI recommendations with one click and operations run themselves. Focus on growth."
  },
  "useBadge": {
    "ko": "누구를 위한 플랫폼인가",
    "en": "Built For"
  },
  "useTitle": {
    "ko": "성장하는 모든 커머스 팀을 위해",
    "en": "For every growing commerce team"
  },
  "use1t": {
    "ko": "D2C 브랜드",
    "en": "D2C Brands"
  },
  "use1d": {
    "ko": "멀티채널 매출과 마케팅 ROI를 한곳에서. 데이터 기반으로 브랜드를 키우세요.",
    "en": "Multichannel revenue and marketing ROI in one place. Grow your brand on data."
  },
  "use2t": {
    "ko": "글로벌 셀러",
    "en": "Global Sellers"
  },
  "use2d": {
    "ko": "국내외 마켓을 통합 운영하고 국제 물류·정산까지 자동화합니다.",
    "en": "Operate domestic and global marketplaces together, automate logistics and settlement."
  },
  "use3t": {
    "ko": "마케팅 대행사",
    "en": "Agencies"
  },
  "use3d": {
    "ko": "여러 브랜드 계정을 통합 대시보드로 관리하고 성과를 한눈에 리포팅합니다.",
    "en": "Manage multiple brand accounts in one dashboard and report performance at a glance."
  },
  "metricsTitle": {
    "ko": "숫자로 증명하는 성과",
    "en": "Proven by the numbers"
  },
  "metric1v": {
    "ko": "+340%",
    "en": "+340%"
  },
  "metric1l": {
    "ko": "평균 ROAS 향상",
    "en": "Average ROAS lift"
  },
  "metric2v": {
    "ko": "2.8×",
    "en": "2.8×"
  },
  "metric2l": {
    "ko": "6개월 매출 성장",
    "en": "Revenue growth in 6 months"
  },
  "metric3v": {
    "ko": "20h",
    "en": "20h"
  },
  "metric3l": {
    "ko": "주당 수작업 절감",
    "en": "Manual hours saved / week"
  },
  "whyTitle2": {
    "ko": "왜 초엔터프라이즈급인가",
    "en": "Why super-enterprise"
  },
  "pricingTzTitle": {
    "ko": "비즈니스에 맞는 요금제",
    "en": "Pricing that fits your business"
  },
  "pricingTzDesc": {
    "ko": "무료 데모로 시작해 계정수·기간에 맞춰 확장하세요. 카드 불필요, 30일 전액 환불.",
    "en": "Start with a free demo and scale by seats and billing cycle. No card, 30-day money-back."
  },
  "faqBadge": {
    "ko": "자주 묻는 질문",
    "en": "FAQ"
  },
  "faqTitle2": {
    "ko": "궁금한 점을 빠르게",
    "en": "Quick answers"
  },
  "fq1q": {
    "ko": "어떤 채널과 연동되나요?",
    "en": "Which channels integrate?"
  },
  "fq1a": {
    "ko": "쿠팡·네이버·11번가·G마켓 등 국내와 아마존·쇼피파이·메타·구글·틱톡 등 글로벌 30개 이상 채널을 사전 구축 커넥터로 연결합니다.",
    "en": "30+ pre-built connectors across domestic (Coupang, Naver, 11st, Gmarket) and global (Amazon, Shopify, Meta, Google, TikTok)."
  },
  "fq2q": {
    "ko": "도입은 얼마나 걸리나요?",
    "en": "How long to get started?"
  },
  "fq2a": {
    "ko": "OAuth로 5분 안에 채널을 연결하면 데이터가 실시간 통합됩니다. 별도 개발 없이 바로 사용할 수 있습니다.",
    "en": "Connect channels via OAuth in 5 minutes and data unifies in real time. No development needed."
  },
  "fq3q": {
    "ko": "보안은 안전한가요?",
    "en": "Is it secure?"
  },
  "fq3a": {
    "ko": "은행급 보안과 PCI DSS, 종단 암호화, 멀티테넌트 데이터 격리, 99.9% 가동률 SLA를 제공합니다.",
    "en": "Bank-grade security, PCI DSS, end-to-end encryption, multi-tenant isolation, and a 99.9% uptime SLA."
  },
  "fq4q": {
    "ko": "무료로 시작할 수 있나요?",
    "en": "Can I start free?"
  },
  "fq4a": {
    "ko": "카드 없이 무료 데모로 시작하고, 준비되면 계정수·기간에 맞는 요금제로 업그레이드하세요. 30일 전액 환불 보장.",
    "en": "Start free with no card, upgrade when ready by seats and cycle. 30-day full money-back guarantee."
  },
  "finalTitle": {
    "ko": "지금, 데이터로 성장하세요",
    "en": "Start growing on data today"
  },
  "finalDesc": {
    "ko": "전 세계 15개국, 200개 이상 기업이 GeniegoROI로 커머스를 자동화하고 있습니다.",
    "en": "Across 15 countries, 200+ companies automate commerce with GeniegoROI."
  },
  "ftTagline": {
    "ko": "AI로 커머스 운영의 A부터 Z까지 자동화하는 글로벌 SaaS",
    "en": "The global SaaS that automates commerce from A to Z with AI"
  },
  "ftProduct": {
    "ko": "제품",
    "en": "Product"
  },
  "ftCompany": {
    "ko": "회사",
    "en": "Company"
  },
  "ftLegal": {
    "ko": "약관",
    "en": "Legal"
  },
  "ftRights": {
    "ko": "All rights reserved.",
    "en": "All rights reserved."
  }
};

const DICT_RICH_EXT = {
 "navProduct": {
  "ja": "製品",
  "zh": "产品",
  "zh-TW": "產品",
  "vi": "Sản phẩm",
  "th": "ผลิตภัณฑ์",
  "id": "Produk",
  "de": "Produkt",
  "fr": "Produit",
  "es": "Producto",
  "pt": "Produto",
  "ru": "Продукт",
  "ar": "المنتج",
  "hi": "उत्पाद"
 },
 "navSolutions": {
  "ja": "ソリューション",
  "zh": "解决方案",
  "zh-TW": "解決方案",
  "vi": "Giải pháp",
  "th": "โซลูชัน",
  "id": "Solusi",
  "de": "Lösungen",
  "fr": "Solutions",
  "es": "Soluciones",
  "pt": "Soluções",
  "ru": "Решения",
  "ar": "الحلول",
  "hi": "समाधान"
 },
 "navPricing": {
  "ja": "料金プラン",
  "zh": "定价",
  "zh-TW": "定價",
  "vi": "Bảng giá",
  "th": "ราคา",
  "id": "Harga",
  "de": "Preise",
  "fr": "Tarifs",
  "es": "Precios",
  "pt": "Preços",
  "ru": "Тарифы",
  "ar": "الأسعار",
  "hi": "मूल्य"
 },
 "navStart": {
  "ja": "無料で始める",
  "zh": "免费开始",
  "zh-TW": "免費開始",
  "vi": "Bắt đầu miễn phí",
  "th": "เริ่มฟรี",
  "id": "Mulai gratis",
  "de": "Kostenlos starten",
  "fr": "Démarrer",
  "es": "Empezar gratis",
  "pt": "Começar grátis",
  "ru": "Начать бесплатно",
  "ar": "ابدأ مجانًا",
  "hi": "नि:शुल्क शुरू"
 },
 "navLogin2": {
  "ja": "ログイン",
  "zh": "登录",
  "zh-TW": "登入",
  "vi": "Đăng nhập",
  "th": "เข้าสู่ระบบ",
  "id": "Masuk",
  "de": "Anmelden",
  "fr": "Connexion",
  "es": "Iniciar sesión",
  "pt": "Entrar",
  "ru": "Войти",
  "ar": "تسجيل الدخول",
  "hi": "लॉग इन"
 },
 "problemBadge": {
  "ja": "なぜGeniegoROIか",
  "zh": "为何选择 GeniegoROI",
  "zh-TW": "為何選擇 GeniegoROI",
  "vi": "Vì sao chọn GeniegoROI",
  "th": "ทำไมต้อง GeniegoROI",
  "id": "Mengapa GeniegoROI",
  "de": "Warum GeniegoROI",
  "fr": "Pourquoi GeniegoROI",
  "es": "Por qué GeniegoROI",
  "pt": "Por que GeniegoROI",
  "ru": "Почему GeniegoROI",
  "ar": "لماذا GeniegoROI",
  "hi": "GeniegoROI क्यों"
 },
 "problemTitle": {
  "ja": "バラバラなコマース運営を\n一つの知能プラットフォームへ",
  "zh": "分散的电商运营，\n现在汇于一个智能平台",
  "zh-TW": "分散的電商營運，\n現在匯於一個智慧平台",
  "vi": "Vận hành thương mại rời rạc,\nnay là một nền tảng thông minh",
  "th": "การดำเนินงานที่กระจัดกระจาย\nรวมเป็นแพลตฟอร์มอัจฉริยะเดียว",
  "id": "Operasi commerce terpisah,\nkini satu platform cerdas",
  "de": "Fragmentierter Commerce,\njetzt eine intelligente Plattform",
  "fr": "Des opérations dispersées,\ndésormais une plateforme intelligente",
  "es": "Operaciones dispersas,\nahora una plataforma inteligente",
  "pt": "Operações fragmentadas,\nagora uma plataforma inteligente",
  "ru": "Разрозненные операции —\nтеперь одна умная платформа",
  "ar": "عمليات تجارة مبعثرة،\nالآن منصة ذكية واحدة",
  "hi": "बिखरा हुआ कॉमर्स संचालन,\nअब एक बुद्धिमान प्लेटफ़ॉर्म"
 },
 "problemDesc": {
  "ja": "チャネルごとに異なる広告ダッシュボード、Excelで合わせる精算、バラバラの在庫と注文 — 運営の複雑さが成長を阻みます。GeniegoROIは30以上のチャネルのデータをリアルタイムで統合し、AIが広告・販売・在庫・配送・精算を自動で分析・実行します。運営者は意思決定に集中できます。",
  "zh": "各渠道不同的广告看板、用Excel拼凑的对账、分散的库存与订单 —— 运营的复杂度限制了增长。GeniegoROI 实时统一 30+ 渠道数据，AI 自动分析并执行广告、销售、库存、物流与结算。您只需专注决策。",
  "zh-TW": "各通路不同的廣告看板、用Excel拼湊的對帳、分散的庫存與訂單 —— 營運的複雜度限制了成長。GeniegoROI 即時統一 30+ 通路資料，AI 自動分析並執行廣告、銷售、庫存、物流與結算。您只需專注決策。",
  "vi": "Bảng quảng cáo khác nhau theo từng kênh, đối soát bằng bảng tính, tồn kho và đơn hàng rời rạc — sự phức tạp kìm hãm tăng trưởng. GeniegoROI hợp nhất dữ liệu 30+ kênh theo thời gian thực, AI tự động phân tích và thực thi quảng cáo, bán hàng, tồn kho, vận chuyển và thanh toán. Bạn chỉ tập trung vào quyết định.",
  "th": "แดชบอร์ดโฆษณาต่างกันในแต่ละช่องทาง การกระทบยอดด้วยสเปรดชีต สต็อกและออเดอร์ที่กระจัดกระจาย — ความซับซ้อนจำกัดการเติบโต GeniegoROI รวมข้อมูล 30+ ช่องทางแบบเรียลไทม์ และ AI วิเคราะห์และดำเนินการโฆษณา ขาย สต็อก ขนส่ง และการชำระเงินอัตโนมัติ คุณเพียงโฟกัสที่การตัดสินใจ",
  "id": "Dasbor iklan berbeda per channel, rekonsiliasi via spreadsheet, inventori dan pesanan tersebar — kompleksitas membatasi pertumbuhan. GeniegoROI menyatukan data 30+ channel secara real-time, dan AI otomatis menganalisis serta menjalankan iklan, penjualan, inventori, pengiriman, dan settlement. Anda fokus pada keputusan.",
  "de": "Unterschiedliche Werbe-Dashboards je Kanal, Abstimmung per Tabelle, verstreute Bestände und Bestellungen — Komplexität bremst Wachstum. GeniegoROI vereint 30+ Kanäle in Echtzeit, und KI analysiert und steuert automatisch Werbung, Verkauf, Lager, Versand und Abrechnung. Sie konzentrieren sich nur auf Entscheidungen.",
  "fr": "Des tableaux de bord publicitaires différents par canal, des rapprochements sur tableur, des stocks et commandes dispersés — la complexité freine la croissance. GeniegoROI unifie 30+ canaux en temps réel, et l'IA analyse et exécute automatiquement publicité, ventes, stock, livraison et règlement. Vous vous concentrez sur les décisions.",
  "es": "Paneles de anuncios distintos por canal, conciliación en hojas de cálculo, inventario y pedidos dispersos — la complejidad limita el crecimiento. GeniegoROI unifica 30+ canales en tiempo real, y la IA analiza y ejecuta automáticamente anuncios, ventas, inventario, envíos y liquidación. Usted solo decide.",
  "pt": "Painéis de anúncios diferentes por canal, conciliação em planilhas, estoque e pedidos dispersos — a complexidade limita o crescimento. A GeniegoROI unifica 30+ canais em tempo real, e a IA analisa e executa automaticamente anúncios, vendas, estoque, envio e liquidação. Você foca apenas nas decisões.",
  "ru": "Разные рекламные панели по каналам, сверка в таблицах, разрозненные склад и заказы — сложность тормозит рост. GeniegoROI объединяет 30+ каналов в реальном времени, а AI автоматически анализирует и выполняет рекламу, продажи, склад, доставку и расчёты. Вы лишь принимаете решения.",
  "ar": "لوحات إعلانات مختلفة لكل قناة، تسويات عبر الجداول، مخزون وطلبات مبعثرة — التعقيد يحدّ من النمو. توحّد GeniegoROI بيانات أكثر من 30 قناة لحظيًا، ويحلّل الذكاء الاصطناعي وينفّذ تلقائيًا الإعلانات والمبيعات والمخزون والشحن والتسوية. تركّز أنت على القرارات فقط.",
  "hi": "हर चैनल पर अलग विज्ञापन डैशबोर्ड, स्प्रेडशीट से मिलान, बिखरी इन्वेंटरी और ऑर्डर — जटिलता विकास को रोकती है। GeniegoROI 30+ चैनलों का डेटा रियल-टाइम एकीकृत करता है, और AI विज्ञापन, बिक्री, इन्वेंटरी, शिपिंग और सेटलमेंट का स्वतः विश्लेषण व निष्पादन करता है। आप केवल निर्णयों पर ध्यान दें।"
 },
 "modulesBadge": {
  "ja": "一つのプラットフォーム、全機能",
  "zh": "一个平台，全部能力",
  "zh-TW": "一個平台，全部能力",
  "vi": "Một nền tảng, mọi năng lực",
  "th": "แพลตฟอร์มเดียว ครบทุกความสามารถ",
  "id": "Satu platform, semua kemampuan",
  "de": "Eine Plattform, alle Funktionen",
  "fr": "Une plateforme, toutes les capacités",
  "es": "Una plataforma, todas las capacidades",
  "pt": "Uma plataforma, todas as capacidades",
  "ru": "Одна платформа, все возможности",
  "ar": "منصة واحدة، كل الإمكانات",
  "hi": "एक प्लेटफ़ॉर्म, हर क्षमता"
 },
 "modulesTitle": {
  "ja": "コマース運営の全工程を統合",
  "zh": "整合电商运营全流程",
  "zh-TW": "整合電商營運全流程",
  "vi": "Hợp nhất toàn bộ vòng đời thương mại",
  "th": "รวมทุกขั้นตอนการดำเนินงาน",
  "id": "Seluruh siklus commerce, terpadu",
  "de": "Der gesamte Commerce-Lebenszyklus, vereint",
  "fr": "Tout le cycle commerce, unifié",
  "es": "Todo el ciclo de comercio, unificado",
  "pt": "Todo o ciclo de commerce, unificado",
  "ru": "Весь цикл коммерции — едино",
  "ar": "كامل دورة التجارة موحّدة",
  "hi": "पूरा कॉमर्स चक्र, एकीकृत"
 },
 "modulesDesc": {
  "ja": "接続から分析、自動化まで — バラバラのツールを一つに置き換えます。",
  "zh": "从连接到分析再到自动化 —— 用一个平台取代分散的工具。",
  "zh-TW": "從連接到分析再到自動化 —— 用一個平台取代分散的工具。",
  "vi": "Từ kết nối đến phân tích đến tự động hoá — thay thế công cụ rời rạc bằng một.",
  "th": "ตั้งแต่เชื่อมต่อ วิเคราะห์ ถึงอัตโนมัติ — แทนที่เครื่องมือกระจัดกระจายด้วยหนึ่งเดียว",
  "id": "Dari koneksi ke analitik ke otomatisasi — ganti alat tersebar dengan satu.",
  "de": "Von Anbindung über Analyse bis Automatisierung — ersetzen Sie verstreute Tools durch eins.",
  "fr": "De la connexion à l'analyse à l'automatisation — remplacez vos outils dispersés par un seul.",
  "es": "De la conexión al análisis a la automatización — reemplace sus herramientas dispersas por una.",
  "pt": "Da conexão à análise à automação — substitua ferramentas dispersas por uma.",
  "ru": "От подключения до аналитики и автоматизации — замените разрозненные инструменты одним.",
  "ar": "من الربط إلى التحليل إلى الأتمتة — استبدل أدواتك المبعثرة بأداة واحدة.",
  "hi": "कनेक्शन से एनालिटिक्स से ऑटोमेशन तक — बिखरे टूल को एक से बदलें।"
 },
 "m1t": {
  "ja": "オムニチャネルコマース",
  "zh": "全渠道电商",
  "zh-TW": "全通路電商",
  "vi": "Thương mại đa kênh",
  "th": "ค้าปลีกหลายช่องทาง",
  "id": "OmniChannel Commerce",
  "de": "Omni-Channel Commerce",
  "fr": "Commerce omnicanal",
  "es": "Comercio omnicanal",
  "pt": "Comércio omnichannel",
  "ru": "Омниканальная коммерция",
  "ar": "تجارة متعددة القنوات",
  "hi": "ऑम्निचैनल कॉमर्स"
 },
 "m1d": {
  "ja": "30以上の国内外マーケットを一つのハブに接続し、注文・在庫・配送を標準化。",
  "zh": "将30+国内外市场连接为一个中枢，统一订单、库存与履约。",
  "zh-TW": "將30+國內外市場連接為一個中樞，統一訂單、庫存與履約。",
  "vi": "Kết nối 30+ sàn vào một hub, chuẩn hoá đơn hàng, tồn kho và vận chuyển.",
  "th": "เชื่อม 30+ ตลาดเป็นฮับเดียว มาตรฐานออเดอร์ สต็อก และจัดส่ง",
  "id": "Hubungkan 30+ marketplace ke satu hub, standarisasi pesanan, inventori, fulfillment.",
  "de": "30+ Marktplätze in einem Hub verbinden, Bestellungen, Lager und Versand standardisieren.",
  "fr": "Connectez 30+ places de marché dans un hub, standardisez commandes, stock et expédition.",
  "es": "Conecte 30+ marketplaces en un hub, estandarice pedidos, inventario y fulfillment.",
  "pt": "Conecte 30+ marketplaces em um hub, padronize pedidos, estoque e fulfillment.",
  "ru": "Подключите 30+ маркетплейсов в один хаб, стандартизируйте заказы, склад и фулфилмент.",
  "ar": "اربط أكثر من 30 سوقًا في مركز واحد ووحّد الطلبات والمخزون والتنفيذ.",
  "hi": "30+ मार्केटप्लेस एक हब में जोड़ें, ऑर्डर, इन्वेंटरी और फुलफिलमेंट मानकीकृत करें।"
 },
 "m1b1": {
  "ja": "Coupang・Naver・Amazon・Shopify・TikTok Shop 等の事前構築コネクタ",
  "zh": "Coupang、Naver、Amazon、Shopify、TikTok Shop 等预建连接器",
  "zh-TW": "Coupang、Naver、Amazon、Shopify、TikTok Shop 等預建連接器",
  "vi": "Kết nối sẵn: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "th": "คอนเนคเตอร์สำเร็จรูป: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "id": "Konektor siap: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "de": "Vorgefertigte Konnektoren: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "fr": "Connecteurs prêts : Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "es": "Conectores listos: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "pt": "Conectores prontos: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "ru": "Готовые коннекторы: Coupang, Naver, Amazon, Shopify, TikTok Shop",
  "ar": "موصّلات جاهزة: Coupang وNaver وAmazon وShopify وTikTok Shop",
  "hi": "पूर्व-निर्मित कनेक्टर: Coupang, Naver, Amazon, Shopify, TikTok Shop"
 },
 "m1b2": {
  "ja": "統合カタログ・在庫同期、合配送管理",
  "zh": "统一目录与库存同步、合单管理",
  "zh-TW": "統一目錄與庫存同步、合單管理",
  "vi": "Đồng bộ catalog & tồn kho, quản lý gộp đơn",
  "th": "ซิงค์แคตตาล็อกและสต็อก จัดการรวมส่ง",
  "id": "Sinkron katalog & inventori, manajemen gabung kirim",
  "de": "Katalog- & Lagersynchronisation, Kombi-Versand",
  "fr": "Synchro catalogue & stock, expéditions groupées",
  "es": "Sincronización de catálogo e inventario, envíos combinados",
  "pt": "Sincronização de catálogo e estoque, envios combinados",
  "ru": "Синхронизация каталога и склада, объединённые отправления",
  "ar": "مزامنة الكتالوج والمخزون وإدارة الشحن المجمّع",
  "hi": "कैटलॉग व इन्वेंटरी सिंक, संयुक्त शिपमेंट प्रबंधन"
 },
 "m1b3": {
  "ja": "OAuth認証管理・自動同期",
  "zh": "OAuth凭证管理与自动同步",
  "zh-TW": "OAuth憑證管理與自動同步",
  "vi": "Quản lý OAuth & tự động đồng bộ",
  "th": "จัดการ OAuth และซิงค์อัตโนมัติ",
  "id": "Manajemen OAuth & sinkron otomatis",
  "de": "OAuth-Verwaltung & Auto-Sync",
  "fr": "Gestion OAuth & synchro auto",
  "es": "Gestión OAuth y sincronización automática",
  "pt": "Gestão OAuth & sincronização automática",
  "ru": "Управление OAuth и автосинхронизация",
  "ar": "إدارة OAuth والمزامنة التلقائية",
  "hi": "OAuth प्रबंधन व स्वतः सिंक"
 },
 "m2t": {
  "ja": "AIマーケティングインテリジェンス",
  "zh": "AI营销智能",
  "zh-TW": "AI行銷智慧",
  "vi": "AI Marketing thông minh",
  "th": "AI Marketing Intelligence",
  "id": "AI Marketing Intelligence",
  "de": "KI-Marketing-Intelligenz",
  "fr": "Intelligence marketing IA",
  "es": "Inteligencia de marketing IA",
  "pt": "Inteligência de marketing IA",
  "ru": "AI-маркетинг-аналитика",
  "ar": "ذكاء التسويق بالـ AI",
  "hi": "AI मार्केटिंग इंटेलिजेंस"
 },
 "m2d": {
  "ja": "8次元の広告貢献度分析とAI予算提案でROASを最大化。",
  "zh": "8维广告贡献度分析与AI预算建议，最大化ROAS。",
  "zh-TW": "8維廣告貢獻度分析與AI預算建議，最大化ROAS。",
  "vi": "Phân tích đóng góp 8 chiều và đề xuất ngân sách AI để tối đa ROAS.",
  "th": "วิเคราะห์ 8 มิติและ AI แนะนำงบเพื่อ ROAS สูงสุด",
  "id": "Atribusi 8-dimensi dan rekomendasi budget AI untuk ROAS maksimal.",
  "de": "8-dimensionale Attribution und KI-Budgetempfehlungen für maximalen ROAS.",
  "fr": "Attribution 8 dimensions et suggestions budget IA pour un ROAS maximal.",
  "es": "Atribución de 8 dimensiones y recomendaciones de presupuesto IA para máximo ROAS.",
  "pt": "Atribuição 8 dimensões e recomendações de orçamento IA para ROAS máximo.",
  "ru": "8-мерная атрибуция и AI-рекомендации бюджета для максимального ROAS.",
  "ar": "إسناد ثماني الأبعاد وتوصيات ميزانية بالـ AI لتعظيم ROAS.",
  "hi": "अधिकतम ROAS के लिए 8-आयामी एट्रिब्यूशन और AI बजट सिफ़ारिशें।"
 },
 "m2b1": {
  "ja": "マルチタッチ・アトリビューション、チャネルKPI、競合分析",
  "zh": "多触点归因、渠道KPI、竞品分析",
  "zh-TW": "多觸點歸因、通路KPI、競品分析",
  "vi": "Attribution đa điểm chạm, KPI kênh, phân tích đối thủ",
  "th": "Attribution หลายจุดสัมผัส KPI ช่องทาง วิเคราะห์คู่แข่ง",
  "id": "Atribusi multi-touch, KPI channel, analisis kompetitor",
  "de": "Multi-Touch-Attribution, Kanal-KPIs, Wettbewerbsanalyse",
  "fr": "Attribution multi-touch, KPI de canaux, analyse concurrentielle",
  "es": "Atribución multitáctil, KPIs de canal, análisis de competencia",
  "pt": "Atribuição multi-touch, KPIs de canal, análise de concorrência",
  "ru": "Мультитач-атрибуция, KPI каналов, анализ конкурентов",
  "ar": "إسناد متعدد اللمسات، مؤشرات القنوات، تحليل المنافسين",
  "hi": "मल्टी-टच एट्रिब्यूशन, चैनल KPI, प्रतिस्पर्धी विश्लेषण"
 },
 "m2b2": {
  "ja": "AI広告クリエイティブ生成・コンテンツカレンダー",
  "zh": "AI广告素材生成与内容日历",
  "zh-TW": "AI廣告素材生成與內容日曆",
  "vi": "Tạo quảng cáo AI & lịch nội dung",
  "th": "สร้างครีเอทีฟ AI และปฏิทินคอนเทนต์",
  "id": "Generasi kreatif iklan AI & kalender konten",
  "de": "KI-Werbemittel-Generierung & Content-Kalender",
  "fr": "Génération de créas IA & calendrier de contenu",
  "es": "Generación de creatividades IA y calendario de contenido",
  "pt": "Geração de criativos IA & calendário de conteúdo",
  "ru": "AI-генерация креативов и контент-календарь",
  "ar": "إنشاء إعلانات بالـ AI وتقويم المحتوى",
  "hi": "AI विज्ञापन क्रिएटिव जनरेशन व कंटेंट कैलेंडर"
 },
 "m2b3": {
  "ja": "AI予算配分＋人による承認ワークフロー",
  "zh": "AI预算分配＋人工审批流程",
  "zh-TW": "AI預算分配＋人工審批流程",
  "vi": "Phân bổ ngân sách AI + duyệt bởi con người",
  "th": "จัดสรรงบ AI + อนุมัติโดยมนุษย์",
  "id": "Alokasi budget AI + persetujuan manusia",
  "de": "KI-Budgetverteilung + menschliche Freigabe",
  "fr": "Allocation budget IA + validation humaine",
  "es": "Asignación de presupuesto IA + aprobación humana",
  "pt": "Alocação de orçamento IA + aprovação humana",
  "ru": "AI-распределение бюджета + подтверждение человеком",
  "ar": "توزيع الميزانية بالـ AI + موافقة بشرية",
  "hi": "AI बजट आवंटन + मानव अनुमोदन"
 },
 "m3t": {
  "ja": "WMS — 倉庫・物流",
  "zh": "WMS — 仓储物流",
  "zh-TW": "WMS — 倉儲物流",
  "vi": "WMS — Kho & Logistics",
  "th": "WMS — คลังสินค้า & โลจิสติกส์",
  "id": "WMS — Gudang & Logistik",
  "de": "WMS — Lager & Logistik",
  "fr": "WMS — Entrepôt & Logistique",
  "es": "WMS — Almacén y Logística",
  "pt": "WMS — Armazém & Logística",
  "ru": "WMS — склад и логистика",
  "ar": "WMS — المستودع واللوجستيات",
  "hi": "WMS — गोदाम और लॉजिस्टिक्स"
 },
 "m3d": {
  "ja": "マルチ倉庫在庫と国際物流を一画面で管理。",
  "zh": "在一个界面管理多仓库库存与国际物流。",
  "zh-TW": "在一個介面管理多倉庫庫存與國際物流。",
  "vi": "Quản lý tồn kho đa điểm và logistics quốc tế trong một màn hình.",
  "th": "จัดการสต็อกหลายคลังและโลจิสติกส์ระหว่างประเทศในจอเดียว",
  "id": "Kelola inventori multi-gudang dan logistik global dalam satu layar.",
  "de": "Multi-Lager-Bestände und globale Logistik in einer Ansicht.",
  "fr": "Gérez stocks multi-entrepôts et logistique internationale en une vue.",
  "es": "Gestione inventario multi-almacén y logística global en una vista.",
  "pt": "Gerencie estoque multi-armazém e logística global em uma tela.",
  "ru": "Управляйте складами и международной логистикой в одном окне.",
  "ar": "أدر مخزون عدة مستودعات واللوجستيات الدولية في شاشة واحدة.",
  "hi": "बहु-गोदाम इन्वेंटरी और वैश्विक लॉजिस्टिक्स एक स्क्रीन में।"
 },
 "m3b1": {
  "ja": "LOT・FEFO在庫追跡、ピッキング・パッキング・合包",
  "zh": "LOT/FEFO库存追踪、拣货、打包、合包",
  "zh-TW": "LOT/FEFO庫存追蹤、揀貨、打包、合包",
  "vi": "Theo dõi LOT/FEFO, picking, packing, gộp gói",
  "th": "ติดตาม LOT/FEFO, หยิบ, แพ็ก, รวมกล่อง",
  "id": "Pelacakan LOT/FEFO, picking, packing, konsolidasi",
  "de": "LOT/FEFO-Tracking, Kommissionierung, Verpackung, Bündelung",
  "fr": "Suivi LOT/FEFO, picking, packing, consolidation",
  "es": "Seguimiento LOT/FEFO, picking, packing, consolidación",
  "pt": "Rastreamento LOT/FEFO, picking, packing, consolidação",
  "ru": "Учёт LOT/FEFO, пикинг, упаковка, консолидация",
  "ar": "تتبّع LOT/FEFO، الانتقاء، التغليف، الدمج",
  "hi": "LOT/FEFO ट्रैकिंग, पिकिंग, पैकिंग, कंसोलिडेशन"
 },
 "m3b2": {
  "ja": "キャリアAPI連携・配送追跡",
  "zh": "承运商API集成与物流追踪",
  "zh-TW": "承運商API整合與物流追蹤",
  "vi": "Tích hợp API vận chuyển & theo dõi",
  "th": "เชื่อม API ขนส่งและติดตามพัสดุ",
  "id": "Integrasi API kurir & pelacakan",
  "de": "Carrier-API-Integration & Sendungsverfolgung",
  "fr": "Intégration API transporteurs & suivi",
  "es": "Integración API de transportistas y seguimiento",
  "pt": "Integração API de transportadoras & rastreamento",
  "ru": "Интеграция API перевозчиков и отслеживание",
  "ar": "تكامل API شركات الشحن وتتبّع الشحنات",
  "hi": "कैरियर API इंटीग्रेशन व ट्रैकिंग"
 },
 "m3b3": {
  "ja": "国際速達の商業送り状を自動生成",
  "zh": "国际快递商业发票自动生成",
  "zh-TW": "國際快遞商業發票自動生成",
  "vi": "Tự động tạo hoá đơn thương mại quốc tế",
  "th": "สร้างใบกำกับสินค้าระหว่างประเทศอัตโนมัติ",
  "id": "Buat invoice komersial ekspres internasional otomatis",
  "de": "Automatische Handelsrechnungen für internationalen Express",
  "fr": "Factures commerciales auto pour l'express international",
  "es": "Facturas comerciales automáticas para envío internacional",
  "pt": "Faturas comerciais automáticas para expresso internacional",
  "ru": "Автогенерация коммерческих инвойсов для международной доставки",
  "ar": "إنشاء فواتير تجارية تلقائيًا للشحن الدولي السريع",
  "hi": "अंतरराष्ट्रीय एक्सप्रेस के लिए स्वतः वाणिज्यिक चालान"
 },
 "m4t": {
  "ja": "統合P&L・精算照合",
  "zh": "统一损益与结算对账",
  "zh-TW": "統一損益與結算對帳",
  "vi": "P&L hợp nhất & đối soát",
  "th": "P&L รวม & กระทบยอด",
  "id": "P&L Terpadu & Rekonsiliasi",
  "de": "Vereinte P&L & Abrechnung",
  "fr": "P&L unifié & rapprochement",
  "es": "P&L unificado y conciliación",
  "pt": "P&L unificado & conciliação",
  "ru": "Единый P&L и сверка",
  "ar": "الأرباح والخسائر الموحّدة والتسوية",
  "hi": "एकीकृत P&L व सेटलमेंट"
 },
 "m4d": {
  "ja": "SKU・チャネル・キャンペーン別のリアルタイム損益と自動精算照合で漏れを防止。",
  "zh": "按SKU、渠道、活动的实时损益与自动对账，杜绝资金流失。",
  "zh-TW": "按SKU、通路、活動的即時損益與自動對帳，杜絕資金流失。",
  "vi": "Lãi/lỗ thời gian thực theo SKU/kênh/chiến dịch và đối soát tự động chống thất thoát.",
  "th": "กำไร-ขาดทุนเรียลไทม์ตาม SKU/ช่องทาง/แคมเปญ และกระทบยอดอัตโนมัติ",
  "id": "P&L real-time per SKU/channel/kampanye dan rekonsiliasi otomatis cegah kebocoran.",
  "de": "Echtzeit-P&L nach SKU/Kanal/Kampagne und automatische Abstimmung gegen Verluste.",
  "fr": "P&L en temps réel par SKU/canal/campagne et rapprochement auto contre les pertes.",
  "es": "P&L en tiempo real por SKU/canal/campaña y conciliación automática contra fugas.",
  "pt": "P&L em tempo real por SKU/canal/campanha e conciliação automática contra perdas.",
  "ru": "P&L в реальном времени по SKU/каналу/кампании и автосверка против потерь.",
  "ar": "أرباح وخسائر لحظية حسب SKU/القناة/الحملة وتسوية تلقائية تمنع التسرّب.",
  "hi": "SKU/चैनल/अभियान अनुसार रियल-टाइम P&L और स्वतः मिलान से रिसाव रोकें।"
 },
 "m4b1": {
  "ja": "リアルタイム損益・ROAS・返品・クーポン異常検知",
  "zh": "实时损益、ROAS、退货与优惠券异常检测",
  "zh-TW": "即時損益、ROAS、退貨與優惠券異常偵測",
  "vi": "P&L thời gian thực, ROAS, phát hiện bất thường hoàn hàng & coupon",
  "th": "P&L เรียลไทม์ ROAS ตรวจจับคืนสินค้าและคูปองผิดปกติ",
  "id": "P&L real-time, ROAS, deteksi anomali retur & kupon",
  "de": "Echtzeit-P&L, ROAS, Anomalieerkennung für Retouren & Coupons",
  "fr": "P&L temps réel, ROAS, détection d'anomalies retours & coupons",
  "es": "P&L en tiempo real, ROAS, detección de anomalías de devoluciones y cupones",
  "pt": "P&L em tempo real, ROAS, detecção de anomalias de devoluções e cupons",
  "ru": "P&L в реальном времени, ROAS, выявление аномалий возвратов и купонов",
  "ar": "أرباح وخسائر لحظية، ROAS، كشف شذوذ المرتجعات والكوبونات",
  "hi": "रियल-टाइम P&L, ROAS, रिटर्न व कूपन विसंगति पहचान"
 },
 "m4b2": {
  "ja": "全チャネルの精算を自動照合、不一致を即時検出",
  "zh": "全渠道结算自动对账，即时发现差异",
  "zh-TW": "全通路結算自動對帳，即時發現差異",
  "vi": "Tự động đối soát mọi kênh, phát hiện sai lệch tức thì",
  "th": "กระทบยอดทุกช่องทางอัตโนมัติ ตรวจจับความต่างทันที",
  "id": "Rekonsiliasi otomatis semua channel, deteksi selisih instan",
  "de": "Alle Kanäle automatisch abstimmen, Diskrepanzen sofort erkennen",
  "fr": "Rapprochez tous les canaux automatiquement, détectez les écarts instantanément",
  "es": "Concilie todos los canales automáticamente, detecte discrepancias al instante",
  "pt": "Concilie todos os canais automaticamente, detecte divergências na hora",
  "ru": "Автосверка всех каналов, мгновенное выявление расхождений",
  "ar": "مطابقة جميع القنوات تلقائيًا واكتشاف الفروق فورًا",
  "hi": "सभी चैनल स्वतः मिलान, विसंगतियाँ तुरंत पहचानें"
 },
 "m4b3": {
  "ja": "税金計算書・電子精算・ERP連携",
  "zh": "税务发票、电子结算、ERP集成",
  "zh-TW": "稅務發票、電子結算、ERP整合",
  "vi": "Hoá đơn thuế, e-settlement, tích hợp ERP",
  "th": "ใบกำกับภาษี การชำระอิเล็กทรอนิกส์ เชื่อม ERP",
  "id": "Faktur pajak, e-settlement, integrasi ERP",
  "de": "Steuerrechnungen, E-Abrechnung, ERP-Integration",
  "fr": "Factures fiscales, e-règlement, intégration ERP",
  "es": "Facturas fiscales, liquidación electrónica, integración ERP",
  "pt": "Notas fiscais, liquidação eletrônica, integração ERP",
  "ru": "Налоговые счета, э-расчёты, интеграция с ERP",
  "ar": "فواتير ضريبية، تسوية إلكترونية، تكامل ERP",
  "hi": "टैक्स इनवॉइस, ई-सेटलमेंट, ERP इंटीग्रेशन"
 },
 "m5t": {
  "ja": "インフルエンサー・CRM",
  "zh": "网红 · CRM",
  "zh-TW": "網紅 · CRM",
  "vi": "Influencer & CRM",
  "th": "อินฟลูเอนเซอร์ & CRM",
  "id": "Influencer & CRM",
  "de": "Influencer & CRM",
  "fr": "Influenceurs & CRM",
  "es": "Influencers y CRM",
  "pt": "Influenciadores & CRM",
  "ru": "Инфлюенсеры и CRM",
  "ar": "المؤثرون و CRM",
  "hi": "इन्फ्लुएंसर व CRM"
 },
 "m5d": {
  "ja": "顧客ジャーニーとインフルエンサーROIをデータで運用・自動化。",
  "zh": "以数据运营并自动化客户旅程与网红ROI。",
  "zh-TW": "以資料運營並自動化客戶旅程與網紅ROI。",
  "vi": "Vận hành hành trình khách hàng và ROI influencer bằng dữ liệu, tự động.",
  "th": "ดำเนินการ customer journey และ ROI อินฟลูเอนเซอร์ด้วยข้อมูลอัตโนมัติ",
  "id": "Jalankan customer journey dan ROI influencer berbasis data, otomatis.",
  "de": "Customer Journeys und Influencer-ROI datenbasiert betreiben und automatisieren.",
  "fr": "Pilotez parcours clients et ROI influenceurs par la donnée, automatiquement.",
  "es": "Opere customer journeys y ROI de influencers con datos, automáticamente.",
  "pt": "Opere jornadas do cliente e ROI de influenciadores com dados, automaticamente.",
  "ru": "Управляйте клиентскими путями и ROI инфлюенсеров на данных, автоматически.",
  "ar": "شغّل رحلات العملاء وعائد المؤثرين بالبيانات وبشكل آلي.",
  "hi": "डेटा पर ग्राहक यात्रा और इन्फ्लुएंसर ROI चलाएं, स्वतः।"
 },
 "m5b1": {
  "ja": "RFM・VIP・AIセグメント、顧客ジャーニービルダー",
  "zh": "RFM/VIP/AI细分、客户旅程构建器",
  "zh-TW": "RFM/VIP/AI分群、客戶旅程建構器",
  "vi": "Phân khúc RFM/VIP/AI, trình tạo hành trình",
  "th": "เซกเมนต์ RFM/VIP/AI, ตัวสร้าง journey",
  "id": "Segmen RFM/VIP/AI, journey builder",
  "de": "RFM/VIP/KI-Segmente, Journey-Builder",
  "fr": "Segments RFM/VIP/IA, créateur de parcours",
  "es": "Segmentos RFM/VIP/IA, creador de journeys",
  "pt": "Segmentos RFM/VIP/IA, criador de jornadas",
  "ru": "Сегменты RFM/VIP/AI, конструктор путей",
  "ar": "شرائح RFM/VIP/AI، منشئ رحلة العميل",
  "hi": "RFM/VIP/AI सेगमेंट, जर्नी बिल्डर"
 },
 "m5b2": {
  "ja": "メール・Kakao・LINE・WhatsApp・Instagram DM",
  "zh": "邮件、Kakao、LINE、WhatsApp、Instagram DM",
  "zh-TW": "郵件、Kakao、LINE、WhatsApp、Instagram DM",
  "vi": "Email, Kakao, LINE, WhatsApp, Instagram DM",
  "th": "อีเมล, Kakao, LINE, WhatsApp, Instagram DM",
  "id": "Email, Kakao, LINE, WhatsApp, Instagram DM",
  "de": "E-Mail, Kakao, LINE, WhatsApp, Instagram DM",
  "fr": "E-mail, Kakao, LINE, WhatsApp, Instagram DM",
  "es": "Email, Kakao, LINE, WhatsApp, Instagram DM",
  "pt": "Email, Kakao, LINE, WhatsApp, Instagram DM",
  "ru": "Email, Kakao, LINE, WhatsApp, Instagram DM",
  "ar": "البريد، Kakao، LINE، WhatsApp، Instagram DM",
  "hi": "ईमेल, Kakao, LINE, WhatsApp, Instagram DM"
 },
 "m5b3": {
  "ja": "インフルエンサーのリーチ・転換・ROI評価・コミッション管理",
  "zh": "网红触达/转化/ROI评估与佣金管理",
  "zh-TW": "網紅觸達/轉化/ROI評估與佣金管理",
  "vi": "Đánh giá reach/chuyển đổi/ROI influencer & quản lý hoa hồng",
  "th": "ประเมิน reach/แปลง/ROI อินฟลู และจัดการคอมมิชชัน",
  "id": "Skor reach/konversi/ROI influencer & manajemen komisi",
  "de": "Influencer-Reichweite/Konversion/ROI & Provisionsverwaltung",
  "fr": "Évaluation portée/conversion/ROI influenceurs & gestion des commissions",
  "es": "Evaluación de alcance/conversión/ROI de influencers y gestión de comisiones",
  "pt": "Avaliação de alcance/conversão/ROI de influenciadores & comissões",
  "ru": "Оценка охвата/конверсии/ROI инфлюенсеров и управление комиссиями",
  "ar": "تقييم وصول/تحويل/عائد المؤثرين وإدارة العمولات",
  "hi": "इन्फ्लुएंसर रीच/कन्वर्ज़न/ROI मूल्यांकन व कमीशन प्रबंधन"
 },
 "m6t": {
  "ja": "AI自動化エンジン",
  "zh": "AI自动化引擎",
  "zh-TW": "AI自動化引擎",
  "vi": "AI tự động hoá",
  "th": "เครื่องยนต์ AI อัตโนมัติ",
  "id": "Mesin Otomatisasi AI",
  "de": "KI-Automatisierungsengine",
  "fr": "Moteur d'automatisation IA",
  "es": "Motor de automatización IA",
  "pt": "Motor de automação IA",
  "ru": "Движок AI-автоматизации",
  "ar": "محرّك الأتمتة بالـ AI",
  "hi": "AI ऑटोमेशन इंजन"
 },
 "m6d": {
  "ja": "ルール＋GPTベースのワークフローで運営を自律実行。",
  "zh": "以规则+GPT工作流自主执行运营。",
  "zh-TW": "以規則+GPT工作流自主執行營運。",
  "vi": "Vận hành tự động qua workflow dựa trên quy tắc + GPT.",
  "th": "ดำเนินงานอัตโนมัติด้วยเวิร์กโฟลว์กฎ + GPT",
  "id": "Operasi otonom via workflow berbasis aturan + GPT.",
  "de": "Autonomer Betrieb über regel- & GPT-basierte Workflows.",
  "fr": "Opérations autonomes via des workflows à règles + GPT.",
  "es": "Operaciones autónomas mediante flujos basados en reglas + GPT.",
  "pt": "Operações autônomas via workflows baseados em regras + GPT.",
  "ru": "Автономная работа через workflow на правилах + GPT.",
  "ar": "تشغيل ذاتي عبر مسارات عمل قائمة على القواعد + GPT.",
  "hi": "नियम + GPT वर्कफ़्लो से स्वायत्त संचालन।"
 },
 "m6b1": {
  "ja": "AIルールエンジン・通知ポリシー・アクションプリセット",
  "zh": "AI规则引擎、通知策略、动作预设",
  "zh-TW": "AI規則引擎、通知策略、動作預設",
  "vi": "AI rule engine, chính sách thông báo, action preset",
  "th": "AI rule engine นโยบายแจ้งเตือน action preset",
  "id": "AI rule engine, kebijakan notifikasi, action preset",
  "de": "KI-Regel-Engine, Benachrichtigungsrichtlinien, Aktions-Presets",
  "fr": "Moteur de règles IA, politiques d'alerte, presets d'action",
  "es": "Motor de reglas IA, políticas de alerta, presets de acción",
  "pt": "Motor de regras IA, políticas de alerta, presets de ação",
  "ru": "AI-движок правил, политики уведомлений, пресеты действий",
  "ar": "محرّك قواعد AI، سياسات التنبيه، إعدادات الإجراءات",
  "hi": "AI रूल इंजन, अलर्ट नीतियाँ, एक्शन प्रीसेट"
 },
 "m6b2": {
  "ja": "閾値設定・AI提案・ワンクリック承認",
  "zh": "阈值设定、AI建议、一键审批",
  "zh-TW": "閾值設定、AI建議、一鍵審批",
  "vi": "Đặt ngưỡng, gợi ý AI, duyệt một chạm",
  "th": "ตั้งเกณฑ์ คำแนะนำ AI อนุมัติคลิกเดียว",
  "id": "Atur threshold, saran AI, persetujuan satu klik",
  "de": "Schwellenwerte, KI-Vorschläge, Ein-Klick-Freigabe",
  "fr": "Seuils, suggestions IA, validation en un clic",
  "es": "Umbrales, sugerencias IA, aprobación con un clic",
  "pt": "Limiares, sugestões IA, aprovação com um clique",
  "ru": "Пороги, AI-подсказки, подтверждение в один клик",
  "ar": "عتبات، اقتراحات AI، موافقة بنقرة واحدة",
  "hi": "थ्रेशोल्ड, AI सुझाव, एक-क्लिक अनुमोदन"
 },
 "m6b3": {
  "ja": "データライトバック・即時ロールバックの安全網",
  "zh": "数据回写与即时回滚安全网",
  "zh-TW": "資料回寫與即時回滾安全網",
  "vi": "Data write-back & rollback tức thì",
  "th": "data write-back และ rollback ทันที",
  "id": "Data write-back & rollback instan",
  "de": "Daten-Write-back & sofortiges Rollback",
  "fr": "Write-back de données & rollback instantané",
  "es": "Write-back de datos y rollback instantáneo",
  "pt": "Write-back de dados & rollback instantâneo",
  "ru": "Запись данных и мгновенный откат",
  "ar": "إعادة كتابة البيانات وتراجع فوري",
  "hi": "डेटा राइट-बैक व तत्काल रोलबैक"
 },
 "howBadge": {
  "ja": "3ステップで開始",
  "zh": "三步开始",
  "zh-TW": "三步開始",
  "vi": "Bắt đầu trong 3 bước",
  "th": "เริ่มใน 3 ขั้น",
  "id": "Mulai dalam 3 langkah",
  "de": "In 3 Schritten starten",
  "fr": "Démarrez en 3 étapes",
  "es": "Empiece en 3 pasos",
  "pt": "Comece em 3 passos",
  "ru": "Старт за 3 шага",
  "ar": "ابدأ في 3 خطوات",
  "hi": "3 चरणों में शुरू"
 },
 "howTitle": {
  "ja": "接続し、分析し、自動化する",
  "zh": "连接、分析、自动化",
  "zh-TW": "連接、分析、自動化",
  "vi": "Kết nối, phân tích, tự động hoá",
  "th": "เชื่อมต่อ วิเคราะห์ อัตโนมัติ",
  "id": "Hubungkan, analisis, otomatisasi",
  "de": "Verbinden, analysieren, automatisieren",
  "fr": "Connectez, analysez, automatisez",
  "es": "Conecte, analice, automatice",
  "pt": "Conecte, analise, automatize",
  "ru": "Подключите, проанализируйте, автоматизируйте",
  "ar": "اربط، حلّل، أتمت",
  "hi": "कनेक्ट करें, विश्लेषण करें, ऑटोमेट करें"
 },
 "how1t": {
  "ja": "1. チャネル接続",
  "zh": "1. 连接渠道",
  "zh-TW": "1. 連接通路",
  "vi": "1. Kết nối kênh",
  "th": "1. เชื่อมช่องทาง",
  "id": "1. Hubungkan channel",
  "de": "1. Kanäle verbinden",
  "fr": "1. Connecter les canaux",
  "es": "1. Conecte canales",
  "pt": "1. Conecte canais",
  "ru": "1. Подключите каналы",
  "ar": "1. اربط القنوات",
  "hi": "1. चैनल जोड़ें"
 },
 "how1d": {
  "ja": "5分以内に30以上のチャネルをOAuthで接続。データがリアルタイムで統合されます。",
  "zh": "5分钟内通过OAuth连接30+渠道，数据实时统一。",
  "zh-TW": "5分鐘內透過OAuth連接30+通路，資料即時統一。",
  "vi": "Kết nối 30+ kênh qua OAuth trong 5 phút. Dữ liệu hợp nhất tức thì.",
  "th": "เชื่อม 30+ ช่องทางผ่าน OAuth ใน 5 นาที ข้อมูลรวมเรียลไทม์",
  "id": "Hubungkan 30+ channel via OAuth dalam 5 menit. Data menyatu real-time.",
  "de": "Verbinden Sie 30+ Kanäle per OAuth in 5 Minuten. Daten vereinen sich in Echtzeit.",
  "fr": "Connectez 30+ canaux via OAuth en 5 minutes. Données unifiées en temps réel.",
  "es": "Conecte 30+ canales vía OAuth en 5 minutos. Datos unificados en tiempo real.",
  "pt": "Conecte 30+ canais via OAuth em 5 minutos. Dados unificados em tempo real.",
  "ru": "Подключите 30+ каналов через OAuth за 5 минут. Данные объединяются мгновенно.",
  "ar": "اربط أكثر من 30 قناة عبر OAuth خلال 5 دقائق. تتوحّد البيانات لحظيًا.",
  "hi": "OAuth से 5 मिनट में 30+ चैनल जोड़ें। डेटा रियल-टाइम एकीकृत।"
 },
 "how2t": {
  "ja": "2. AI分析",
  "zh": "2. AI分析",
  "zh-TW": "2. AI分析",
  "vi": "2. AI phân tích",
  "th": "2. AI วิเคราะห์",
  "id": "2. AI menganalisis",
  "de": "2. KI analysiert",
  "fr": "2. L'IA analyse",
  "es": "2. La IA analiza",
  "pt": "2. A IA analisa",
  "ru": "2. AI анализирует",
  "ar": "2. الذكاء الاصطناعي يحلّل",
  "hi": "2. AI विश्लेषण करता है"
 },
 "how2d": {
  "ja": "AIが広告・売上・在庫・精算を分析し、機会とリスクを自動で見つけ出します。",
  "zh": "AI分析广告、销售、库存与结算，自动发现机会与风险。",
  "zh-TW": "AI分析廣告、銷售、庫存與結算，自動發現機會與風險。",
  "vi": "AI phân tích quảng cáo, doanh thu, tồn kho, thanh toán để tìm cơ hội và rủi ro.",
  "th": "AI วิเคราะห์โฆษณา ยอดขาย สต็อก การชำระเงิน หาโอกาสและความเสี่ยง",
  "id": "AI menganalisis iklan, penjualan, inventori, settlement untuk peluang & risiko.",
  "de": "KI analysiert Werbung, Umsatz, Lager und Abrechnung und findet Chancen und Risiken.",
  "fr": "L'IA analyse pub, ventes, stock et règlement pour révéler opportunités et risques.",
  "es": "La IA analiza anuncios, ventas, inventario y liquidación para hallar oportunidades y riesgos.",
  "pt": "A IA analisa anúncios, vendas, estoque e liquidação para achar oportunidades e riscos.",
  "ru": "AI анализирует рекламу, продажи, склад и расчёты, находя возможности и риски.",
  "ar": "يحلّل الذكاء الاصطناعي الإعلانات والمبيعات والمخزون والتسوية ليكشف الفرص والمخاطر.",
  "hi": "AI विज्ञापन, बिक्री, इन्वेंटरी, सेटलमेंट का विश्लेषण कर अवसर व जोखिम खोजता है।"
 },
 "how3t": {
  "ja": "3. 自動実行・成長",
  "zh": "3. 自动执行与增长",
  "zh-TW": "3. 自動執行與成長",
  "vi": "3. Tự động & tăng trưởng",
  "th": "3. อัตโนมัติ & เติบโต",
  "id": "3. Otomatisasi & tumbuh",
  "de": "3. Automatisieren & wachsen",
  "fr": "3. Automatisez & croissez",
  "es": "3. Automatice y crezca",
  "pt": "3. Automatize & cresça",
  "ru": "3. Автоматизируйте и растите",
  "ar": "3. أتمت وانمُ",
  "hi": "3. ऑटोमेट करें व बढ़ें"
 },
 "how3d": {
  "ja": "AI提案をワンクリック承認すれば運営が自律実行。成長に集中できます。",
  "zh": "一键审批AI建议，运营即自主执行。专注增长。",
  "zh-TW": "一鍵審批AI建議，營運即自主執行。專注成長。",
  "vi": "Duyệt gợi ý AI một chạm, vận hành tự chạy. Tập trung tăng trưởng.",
  "th": "อนุมัติคำแนะนำ AI คลิกเดียว ระบบทำงานเอง โฟกัสการเติบโต",
  "id": "Setujui saran AI satu klik, operasi berjalan sendiri. Fokus tumbuh.",
  "de": "KI-Vorschläge per Klick freigeben, der Betrieb läuft selbst. Fokus aufs Wachstum.",
  "fr": "Validez les suggestions IA en un clic, les opérations tournent seules. Place à la croissance.",
  "es": "Apruebe sugerencias IA con un clic y las operaciones se ejecutan solas. Enfóquese en crecer.",
  "pt": "Aprove sugestões IA com um clique e as operações rodam sozinhas. Foque no crescimento.",
  "ru": "Подтвердите AI-подсказки одним кликом — операции выполняются сами. Сосредоточьтесь на росте.",
  "ar": "وافق على اقتراحات AI بنقرة، وتعمل العمليات ذاتيًا. ركّز على النمو.",
  "hi": "AI सुझाव एक-क्लिक अनुमोदित करें, संचालन स्वतः चले। विकास पर ध्यान दें।"
 },
 "useBadge": {
  "ja": "誰のためのプラットフォームか",
  "zh": "为谁打造",
  "zh-TW": "為誰打造",
  "vi": "Dành cho ai",
  "th": "สร้างมาเพื่อใคร",
  "id": "Dibuat untuk",
  "de": "Für wen gebaut",
  "fr": "Conçu pour",
  "es": "Hecho para",
  "pt": "Feito para",
  "ru": "Для кого",
  "ar": "لمن صُمّم",
  "hi": "किसके लिए"
 },
 "useTitle": {
  "ja": "成長するすべてのコマースチームへ",
  "zh": "为每个成长中的电商团队",
  "zh-TW": "為每個成長中的電商團隊",
  "vi": "Cho mọi đội thương mại đang phát triển",
  "th": "สำหรับทุกทีมคอมเมิร์ซที่กำลังเติบโต",
  "id": "Untuk setiap tim commerce yang berkembang",
  "de": "Für jedes wachsende Commerce-Team",
  "fr": "Pour chaque équipe commerce en croissance",
  "es": "Para cada equipo de comercio en crecimiento",
  "pt": "Para cada equipe de commerce em crescimento",
  "ru": "Для каждой растущей команды коммерции",
  "ar": "لكل فريق تجارة ينمو",
  "hi": "हर बढ़ती कॉमर्स टीम के लिए"
 },
 "use1t": {
  "ja": "D2Cブランド",
  "zh": "D2C品牌",
  "zh-TW": "D2C品牌",
  "vi": "Thương hiệu D2C",
  "th": "แบรนด์ D2C",
  "id": "Brand D2C",
  "de": "D2C-Marken",
  "fr": "Marques D2C",
  "es": "Marcas D2C",
  "pt": "Marcas D2C",
  "ru": "D2C-бренды",
  "ar": "علامات D2C",
  "hi": "D2C ब्रांड"
 },
 "use1d": {
  "ja": "マルチチャネル売上とマーケROIを一箇所で。データでブランドを育てます。",
  "zh": "在一处管理多渠道销售与营销ROI，用数据培育品牌。",
  "zh-TW": "在一處管理多通路銷售與行銷ROI，用資料培育品牌。",
  "vi": "Doanh thu đa kênh và ROI marketing một nơi. Nuôi dưỡng thương hiệu bằng dữ liệu.",
  "th": "ยอดขายหลายช่องทางและ ROI การตลาดในที่เดียว สร้างแบรนด์ด้วยข้อมูล",
  "id": "Revenue multichannel & ROI marketing dalam satu tempat. Bangun brand dengan data.",
  "de": "Multichannel-Umsatz und Marketing-ROI an einem Ort. Marke datenbasiert aufbauen.",
  "fr": "Revenus multicanaux et ROI marketing au même endroit. Construisez votre marque sur la donnée.",
  "es": "Ingresos multicanal y ROI de marketing en un lugar. Construya su marca con datos.",
  "pt": "Receita multicanal e ROI de marketing num só lugar. Construa a marca com dados.",
  "ru": "Мультиканальная выручка и ROI маркетинга в одном месте. Растите бренд на данных.",
  "ar": "إيرادات متعددة القنوات وعائد التسويق في مكان واحد. ابنِ علامتك بالبيانات.",
  "hi": "मल्टीचैनल राजस्व व मार्केटिंग ROI एक जगह। डेटा से ब्रांड बनाएं।"
 },
 "use2t": {
  "ja": "グローバルセラー",
  "zh": "全球卖家",
  "zh-TW": "全球賣家",
  "vi": "Người bán toàn cầu",
  "th": "ผู้ขายทั่วโลก",
  "id": "Seller Global",
  "de": "Globale Verkäufer",
  "fr": "Vendeurs mondiaux",
  "es": "Vendedores globales",
  "pt": "Vendedores globais",
  "ru": "Глобальные продавцы",
  "ar": "البائعون العالميون",
  "hi": "वैश्विक विक्रेता"
 },
 "use2d": {
  "ja": "国内外マーケットを統合運営し、国際物流・精算まで自動化します。",
  "zh": "统一运营国内外市场，自动化国际物流与结算。",
  "zh-TW": "統一營運國內外市場，自動化國際物流與結算。",
  "vi": "Vận hành chung sàn nội địa & toàn cầu, tự động logistics và thanh toán.",
  "th": "ดำเนินตลาดในและต่างประเทศร่วมกัน อัตโนมัติโลจิสติกส์และการชำระเงิน",
  "id": "Operasikan marketplace domestik & global bersama, otomatis logistik & settlement.",
  "de": "Lokale und globale Marktplätze gemeinsam betreiben, Logistik und Abrechnung automatisieren.",
  "fr": "Exploitez marketplaces locales et mondiales ensemble, automatisez logistique et règlement.",
  "es": "Opere marketplaces nacionales y globales juntos, automatice logística y liquidación.",
  "pt": "Opere marketplaces domésticos e globais juntos, automatize logística e liquidação.",
  "ru": "Управляйте локальными и глобальными площадками вместе, автоматизируйте логистику и расчёты.",
  "ar": "شغّل الأسواق المحلية والعالمية معًا وأتمت اللوجستيات والتسوية.",
  "hi": "घरेलू व वैश्विक मार्केटप्लेस साथ चलाएं, लॉजिस्टिक्स व सेटलमेंट स्वतः।"
 },
 "use3t": {
  "ja": "マーケティング代理店",
  "zh": "营销代理商",
  "zh-TW": "行銷代理商",
  "vi": "Agency marketing",
  "th": "เอเจนซีการตลาด",
  "id": "Agensi",
  "de": "Agenturen",
  "fr": "Agences",
  "es": "Agencias",
  "pt": "Agências",
  "ru": "Агентства",
  "ar": "الوكالات",
  "hi": "एजेंसियाँ"
 },
 "use3d": {
  "ja": "複数ブランドのアカウントを統合ダッシュボードで管理し、成果を一目でレポート。",
  "zh": "在统一看板管理多品牌账号，成果一目了然地报告。",
  "zh-TW": "在統一看板管理多品牌帳號，成果一目了然地報告。",
  "vi": "Quản lý nhiều tài khoản thương hiệu trên một dashboard, báo cáo trực quan.",
  "th": "จัดการหลายแบรนด์ในแดชบอร์ดเดียว รายงานผลในพริบตา",
  "id": "Kelola banyak akun brand dalam satu dasbor, laporkan performa sekilas.",
  "de": "Mehrere Markenkonten in einem Dashboard verwalten, Leistung auf einen Blick reporten.",
  "fr": "Gérez plusieurs comptes de marques dans un dashboard, reportez les performances d'un coup d'œil.",
  "es": "Gestione varias cuentas de marca en un panel, reporte el rendimiento de un vistazo.",
  "pt": "Gerencie várias contas de marca num painel, reporte o desempenho num relance.",
  "ru": "Управляйте несколькими брендами в одном дашборде, отчётность с первого взгляда.",
  "ar": "أدر عدة حسابات علامات في لوحة واحدة وقدّم التقارير بنظرة واحدة.",
  "hi": "कई ब्रांड खाते एक डैशबोर्ड में प्रबंधित करें, प्रदर्शन एक नज़र में रिपोर्ट करें।"
 },
 "metricsTitle": {
  "ja": "数字で証明する成果",
  "zh": "用数字证明成效",
  "zh-TW": "用數字證明成效",
  "vi": "Chứng minh bằng con số",
  "th": "พิสูจน์ด้วยตัวเลข",
  "id": "Terbukti dengan angka",
  "de": "Durch Zahlen belegt",
  "fr": "Prouvé par les chiffres",
  "es": "Probado por los números",
  "pt": "Comprovado pelos números",
  "ru": "Доказано цифрами",
  "ar": "مثبت بالأرقام",
  "hi": "आंकड़ों से सिद्ध"
 },
 "metric1l": {
  "ja": "平均ROAS向上",
  "zh": "平均ROAS提升",
  "zh-TW": "平均ROAS提升",
  "vi": "ROAS trung bình tăng",
  "th": "ROAS เฉลี่ยเพิ่ม",
  "id": "Kenaikan ROAS rata-rata",
  "de": "Durchschnittlicher ROAS-Anstieg",
  "fr": "Hausse moyenne du ROAS",
  "es": "Aumento medio de ROAS",
  "pt": "Aumento médio de ROAS",
  "ru": "Средний рост ROAS",
  "ar": "ارتفاع ROAS المتوسط",
  "hi": "औसत ROAS वृद्धि"
 },
 "metric2l": {
  "ja": "6か月の売上成長",
  "zh": "6个月营收增长",
  "zh-TW": "6個月營收增長",
  "vi": "Tăng trưởng doanh thu 6 tháng",
  "th": "การเติบโตรายได้ 6 เดือน",
  "id": "Pertumbuhan revenue 6 bulan",
  "de": "Umsatzwachstum in 6 Monaten",
  "fr": "Croissance du CA en 6 mois",
  "es": "Crecimiento de ingresos en 6 meses",
  "pt": "Crescimento de receita em 6 meses",
  "ru": "Рост выручки за 6 месяцев",
  "ar": "نمو الإيرادات في 6 أشهر",
  "hi": "6 माह में राजस्व वृद्धि"
 },
 "metric3l": {
  "ja": "週あたりの手作業削減",
  "zh": "每周减少的人工工时",
  "zh-TW": "每週減少的人工工時",
  "vi": "Giờ thủ công tiết kiệm/tuần",
  "th": "ชั่วโมงงานมือที่ลด/สัปดาห์",
  "id": "Jam manual dihemat/minggu",
  "de": "Eingesparte manuelle Stunden/Woche",
  "fr": "Heures manuelles économisées/semaine",
  "es": "Horas manuales ahorradas/semana",
  "pt": "Horas manuais economizadas/semana",
  "ru": "Сэкономлено ручных часов/неделю",
  "ar": "ساعات العمل اليدوي الموفّرة/أسبوع",
  "hi": "प्रति सप्ताह बचाए मैन्युअल घंटे"
 },
 "whyTitle2": {
  "ja": "なぜ超エンタープライズ級か",
  "zh": "为何是超企业级",
  "zh-TW": "為何是超企業級",
  "vi": "Vì sao siêu doanh nghiệp",
  "th": "ทำไมระดับซูเปอร์เอนเตอร์ไพรส์",
  "id": "Mengapa super-enterprise",
  "de": "Warum Super-Enterprise",
  "fr": "Pourquoi super-entreprise",
  "es": "Por qué super-empresarial",
  "pt": "Por que super-enterprise",
  "ru": "Почему супер-энтерпрайз",
  "ar": "لماذا فائق المستوى للمؤسسات",
  "hi": "सुपर-एंटरप्राइज़ क्यों"
 },
 "pricingTzTitle": {
  "ja": "ビジネスに合う料金プラン",
  "zh": "适合您业务的定价",
  "zh-TW": "適合您業務的定價",
  "vi": "Bảng giá phù hợp doanh nghiệp",
  "th": "ราคาที่เหมาะกับธุรกิจคุณ",
  "id": "Harga yang sesuai bisnis Anda",
  "de": "Preise, die zu Ihrem Geschäft passen",
  "fr": "Des tarifs adaptés à votre activité",
  "es": "Precios que se ajustan a su negocio",
  "pt": "Preços que cabem no seu negócio",
  "ru": "Тарифы под ваш бизнес",
  "ar": "أسعار تناسب أعمالك",
  "hi": "आपके व्यवसाय के अनुकूल मूल्य"
 },
 "pricingTzDesc": {
  "ja": "無料デモで始め、アカウント数と期間に合わせて拡張。カード不要、30日全額返金。",
  "zh": "免费Demo开始，按账户数与周期扩展。无需信用卡，30天全额退款。",
  "zh-TW": "免費Demo開始，按帳戶數與週期擴展。無需信用卡，30天全額退款。",
  "vi": "Bắt đầu demo miễn phí, mở rộng theo số tài khoản và chu kỳ. Không cần thẻ, hoàn tiền 30 ngày.",
  "th": "เริ่มด้วยเดโมฟรี ขยายตามจำนวนบัญชีและรอบ ไม่ต้องใช้บัตร คืนเงิน 30 วัน",
  "id": "Mulai demo gratis, skala per akun & siklus. Tanpa kartu, refund 30 hari.",
  "de": "Mit kostenloser Demo starten, nach Konten und Zyklus skalieren. Keine Karte, 30 Tage Geld-zurück.",
  "fr": "Démarrez avec une démo gratuite, évoluez selon comptes et cycle. Sans carte, remboursé 30 jours.",
  "es": "Empiece con demo gratis, escale por cuentas y ciclo. Sin tarjeta, reembolso de 30 días.",
  "pt": "Comece com demo grátis, escale por contas e ciclo. Sem cartão, reembolso de 30 dias.",
  "ru": "Начните с бесплатного демо, масштабируйте по аккаунтам и циклу. Без карты, возврат 30 дней.",
  "ar": "ابدأ بنسخة تجريبية مجانية وتوسّع حسب الحسابات والدورة. بدون بطاقة، استرداد 30 يومًا.",
  "hi": "नि:शुल्क डेमो से शुरू करें, खातों व चक्र अनुसार स्केल करें। कार्ड नहीं, 30-दिन मनी-बैक।"
 },
 "faqBadge": {
  "ja": "よくある質問",
  "zh": "常见问题",
  "zh-TW": "常見問題",
  "vi": "Câu hỏi thường gặp",
  "th": "คำถามที่พบบ่อย",
  "id": "FAQ",
  "de": "FAQ",
  "fr": "FAQ",
  "es": "Preguntas frecuentes",
  "pt": "Perguntas frequentes",
  "ru": "Частые вопросы",
  "ar": "الأسئلة الشائعة",
  "hi": "सामान्य प्रश्न"
 },
 "faqTitle2": {
  "ja": "気になることをすぐに",
  "zh": "快速解答",
  "zh-TW": "快速解答",
  "vi": "Giải đáp nhanh",
  "th": "คำตอบเร็ว",
  "id": "Jawaban cepat",
  "de": "Schnelle Antworten",
  "fr": "Réponses rapides",
  "es": "Respuestas rápidas",
  "pt": "Respostas rápidas",
  "ru": "Быстрые ответы",
  "ar": "إجابات سريعة",
  "hi": "त्वरित उत्तर"
 },
 "fq1q": {
  "ja": "どのチャネルと連携しますか？",
  "zh": "支持哪些渠道？",
  "zh-TW": "支援哪些通路？",
  "vi": "Tích hợp những kênh nào?",
  "th": "เชื่อมต่อช่องทางใดบ้าง?",
  "id": "Channel apa yang terintegrasi?",
  "de": "Welche Kanäle sind integriert?",
  "fr": "Quels canaux sont intégrés ?",
  "es": "¿Qué canales se integran?",
  "pt": "Quais canais integram?",
  "ru": "Какие каналы интегрируются?",
  "ar": "ما القنوات المتكاملة؟",
  "hi": "कौन-से चैनल इंटीग्रेट होते हैं?"
 },
 "fq1a": {
  "ja": "Coupang・Naver・11st・Gmarketなど国内と、Amazon・Shopify・Meta・Google・TikTokなどグローバルの30以上のチャネルを事前構築コネクタで接続します。",
  "zh": "通过预建连接器接入国内（Coupang、Naver、11st、Gmarket）和全球（Amazon、Shopify、Meta、Google、TikTok）30+渠道。",
  "zh-TW": "透過預建連接器接入國內（Coupang、Naver、11st、Gmarket）和全球（Amazon、Shopify、Meta、Google、TikTok）30+通路。",
  "vi": "30+ kết nối sẵn cho kênh nội địa (Coupang, Naver, 11st, Gmarket) và toàn cầu (Amazon, Shopify, Meta, Google, TikTok).",
  "th": "คอนเนคเตอร์สำเร็จรูป 30+ ทั้งในประเทศ (Coupang, Naver, 11st, Gmarket) และทั่วโลก (Amazon, Shopify, Meta, Google, TikTok)",
  "id": "30+ konektor siap untuk channel domestik (Coupang, Naver, 11st, Gmarket) dan global (Amazon, Shopify, Meta, Google, TikTok).",
  "de": "30+ vorgefertigte Konnektoren für lokale (Coupang, Naver, 11st, Gmarket) und globale (Amazon, Shopify, Meta, Google, TikTok) Kanäle.",
  "fr": "30+ connecteurs prêts pour les canaux locaux (Coupang, Naver, 11st, Gmarket) et mondiaux (Amazon, Shopify, Meta, Google, TikTok).",
  "es": "30+ conectores listos para canales nacionales (Coupang, Naver, 11st, Gmarket) y globales (Amazon, Shopify, Meta, Google, TikTok).",
  "pt": "30+ conectores prontos para canais domésticos (Coupang, Naver, 11st, Gmarket) e globais (Amazon, Shopify, Meta, Google, TikTok).",
  "ru": "30+ готовых коннекторов для локальных (Coupang, Naver, 11st, Gmarket) и глобальных (Amazon, Shopify, Meta, Google, TikTok) каналов.",
  "ar": "أكثر من 30 موصّلًا جاهزًا للقنوات المحلية (Coupang وNaver و11st وGmarket) والعالمية (Amazon وShopify وMeta وGoogle وTikTok).",
  "hi": "घरेलू (Coupang, Naver, 11st, Gmarket) और वैश्विक (Amazon, Shopify, Meta, Google, TikTok) के लिए 30+ पूर्व-निर्मित कनेक्टर।"
 },
 "fq2q": {
  "ja": "導入にどれくらいかかりますか？",
  "zh": "上手需要多久？",
  "zh-TW": "上手需要多久？",
  "vi": "Mất bao lâu để bắt đầu?",
  "th": "เริ่มใช้นานแค่ไหน?",
  "id": "Berapa lama untuk mulai?",
  "de": "Wie lange dauert der Start?",
  "fr": "Combien de temps pour démarrer ?",
  "es": "¿Cuánto tarda en empezar?",
  "pt": "Quanto tempo para começar?",
  "ru": "Сколько занимает старт?",
  "ar": "كم يستغرق البدء؟",
  "hi": "शुरू होने में कितना समय?"
 },
 "fq2a": {
  "ja": "OAuthで5分以内にチャネルを接続すればデータがリアルタイムで統合されます。開発不要ですぐ使えます。",
  "zh": "通过OAuth在5分钟内连接渠道，数据实时统一。无需开发，即刻可用。",
  "zh-TW": "透過OAuth在5分鐘內連接通路，資料即時統一。無需開發，即刻可用。",
  "vi": "Kết nối kênh qua OAuth trong 5 phút và dữ liệu hợp nhất tức thì. Không cần phát triển.",
  "th": "เชื่อมช่องทางผ่าน OAuth ใน 5 นาที ข้อมูลรวมเรียลไทม์ ไม่ต้องพัฒนา",
  "id": "Hubungkan channel via OAuth dalam 5 menit dan data menyatu real-time. Tanpa pengembangan.",
  "de": "Kanäle per OAuth in 5 Minuten verbinden, Daten vereinen sich in Echtzeit. Keine Entwicklung nötig.",
  "fr": "Connectez les canaux via OAuth en 5 minutes, données unifiées en temps réel. Sans développement.",
  "es": "Conecte canales vía OAuth en 5 minutos y los datos se unifican en tiempo real. Sin desarrollo.",
  "pt": "Conecte canais via OAuth em 5 minutos e os dados se unificam em tempo real. Sem desenvolvimento.",
  "ru": "Подключите каналы через OAuth за 5 минут, данные объединяются мгновенно. Без разработки.",
  "ar": "اربط القنوات عبر OAuth خلال 5 دقائق وتتوحّد البيانات لحظيًا. دون تطوير.",
  "hi": "OAuth से 5 मिनट में चैनल जोड़ें, डेटा रियल-टाइम एकीकृत। कोई डेवलपमेंट नहीं।"
 },
 "fq3q": {
  "ja": "セキュリティは安全ですか？",
  "zh": "安全吗？",
  "zh-TW": "安全嗎？",
  "vi": "Có an toàn không?",
  "th": "ปลอดภัยไหม?",
  "id": "Apakah aman?",
  "de": "Ist es sicher?",
  "fr": "Est-ce sécurisé ?",
  "es": "¿Es seguro?",
  "pt": "É seguro?",
  "ru": "Это безопасно?",
  "ar": "هل هو آمن؟",
  "hi": "क्या यह सुरक्षित है?"
 },
 "fq3a": {
  "ja": "銀行レベルのセキュリティ、PCI DSS、エンドツーエンド暗号化、マルチテナント分離、99.9%稼働率SLAを提供します。",
  "zh": "提供银行级安全、PCI DSS、端到端加密、多租户隔离及99.9%可用性SLA。",
  "zh-TW": "提供銀行級安全、PCI DSS、端到端加密、多租戶隔離及99.9%可用性SLA。",
  "vi": "Bảo mật cấp ngân hàng, PCI DSS, mã hoá đầu-cuối, cô lập đa tenant và SLA 99,9%.",
  "th": "ความปลอดภัยระดับธนาคาร PCI DSS เข้ารหัสปลายทาง แยกหลายผู้เช่า และ SLA 99.9%",
  "id": "Keamanan kelas bank, PCI DSS, enkripsi end-to-end, isolasi multi-tenant, dan SLA 99,9%.",
  "de": "Bank-Sicherheit, PCI DSS, Ende-zu-Ende-Verschlüsselung, Mandantentrennung und 99,9% SLA.",
  "fr": "Sécurité bancaire, PCI DSS, chiffrement de bout en bout, isolation multi-tenant et SLA 99,9%.",
  "es": "Seguridad bancaria, PCI DSS, cifrado de extremo a extremo, aislamiento multi-tenant y SLA 99,9%.",
  "pt": "Segurança bancária, PCI DSS, criptografia ponta a ponta, isolamento multi-tenant e SLA 99,9%.",
  "ru": "Банковская безопасность, PCI DSS, сквозное шифрование, изоляция тенантов и SLA 99,9%.",
  "ar": "أمان مصرفي، PCI DSS، تشفير شامل، عزل متعدد المستأجرين، واتفاقية مستوى خدمة 99.9%.",
  "hi": "बैंक-स्तरीय सुरक्षा, PCI DSS, एंड-टू-एंड एन्क्रिप्शन, मल्टी-टेनेंट आइसोलेशन व 99.9% SLA।"
 },
 "fq4q": {
  "ja": "無料で始められますか？",
  "zh": "可以免费开始吗？",
  "zh-TW": "可以免費開始嗎？",
  "vi": "Có thể bắt đầu miễn phí?",
  "th": "เริ่มฟรีได้ไหม?",
  "id": "Bisa mulai gratis?",
  "de": "Kann ich kostenlos starten?",
  "fr": "Puis-je démarrer gratuitement ?",
  "es": "¿Puedo empezar gratis?",
  "pt": "Posso começar grátis?",
  "ru": "Можно начать бесплатно?",
  "ar": "هل أبدأ مجانًا؟",
  "hi": "क्या नि:शुल्क शुरू कर सकता हूँ?"
 },
 "fq4a": {
  "ja": "カードなしの無料デモで始め、準備ができたらアカウント数と期間に合うプランにアップグレード。30日全額返金保証。",
  "zh": "无需信用卡，免费Demo开始，准备好后按账户数与周期升级。30天全额退款保证。",
  "zh-TW": "無需信用卡，免費Demo開始，準備好後按帳戶數與週期升級。30天全額退款保證。",
  "vi": "Bắt đầu miễn phí không cần thẻ, nâng cấp theo số tài khoản và chu kỳ khi sẵn sàng. Hoàn tiền 30 ngày.",
  "th": "เริ่มฟรีไม่ต้องใช้บัตร อัปเกรดตามจำนวนบัญชีและรอบเมื่อพร้อม คืนเงิน 30 วัน",
  "id": "Mulai gratis tanpa kartu, upgrade per akun & siklus saat siap. Garansi refund 30 hari.",
  "de": "Kostenlos ohne Karte starten, bei Bedarf nach Konten und Zyklus upgraden. 30 Tage Geld-zurück-Garantie.",
  "fr": "Démarrez gratuitement sans carte, évoluez selon comptes et cycle. Garantie remboursé 30 jours.",
  "es": "Empiece gratis sin tarjeta, mejore por cuentas y ciclo cuando esté listo. Garantía de 30 días.",
  "pt": "Comece grátis sem cartão, faça upgrade por contas e ciclo quando quiser. Garantia de 30 dias.",
  "ru": "Начните бесплатно без карты, повышайте по аккаунтам и циклу. Гарантия возврата 30 дней.",
  "ar": "ابدأ مجانًا دون بطاقة وارتقِ حسب الحسابات والدورة عند الاستعداد. ضمان استرداد 30 يومًا.",
  "hi": "बिना कार्ड नि:शुल्क शुरू करें, तैयार होने पर खातों व चक्र अनुसार अपग्रेड करें। 30-दिन गारंटी।"
 },
 "finalTitle": {
  "ja": "今、データで成長を",
  "zh": "即刻，以数据增长",
  "zh-TW": "即刻，以資料成長",
  "vi": "Bắt đầu tăng trưởng bằng dữ liệu",
  "th": "เริ่มเติบโตด้วยข้อมูลวันนี้",
  "id": "Mulai tumbuh dengan data hari ini",
  "de": "Wachsen Sie heute mit Daten",
  "fr": "Commencez à croître avec la donnée",
  "es": "Empiece a crecer con datos hoy",
  "pt": "Comece a crescer com dados hoje",
  "ru": "Начните расти на данных сегодня",
  "ar": "ابدأ النمو بالبيانات اليوم",
  "hi": "आज डेटा से बढ़ना शुरू करें"
 },
 "finalDesc": {
  "ja": "世界15か国、200社以上がGeniegoROIでコマースを自動化しています。",
  "zh": "全球15个国家、200+企业正用GeniegoROI自动化电商。",
  "zh-TW": "全球15個國家、200+企業正用GeniegoROI自動化電商。",
  "vi": "Trên 15 quốc gia, hơn 200 công ty tự động hoá thương mại với GeniegoROI.",
  "th": "กว่า 15 ประเทศ 200+ บริษัทใช้ GeniegoROI อัตโนมัติคอมเมิร์ซ",
  "id": "Di 15 negara, 200+ perusahaan mengotomatiskan commerce dengan GeniegoROI.",
  "de": "In 15 Ländern automatisieren 200+ Unternehmen Commerce mit GeniegoROI.",
  "fr": "Dans 15 pays, 200+ entreprises automatisent le commerce avec GeniegoROI.",
  "es": "En 15 países, 200+ empresas automatizan el comercio con GeniegoROI.",
  "pt": "Em 15 países, 200+ empresas automatizam o commerce com a GeniegoROI.",
  "ru": "В 15 странах 200+ компаний автоматизируют коммерцию с GeniegoROI.",
  "ar": "في 15 دولة، تؤتمت أكثر من 200 شركة تجارتها مع GeniegoROI.",
  "hi": "15 देशों में, 200+ कंपनियाँ GeniegoROI से कॉमर्स ऑटोमेट करती हैं।"
 },
 "ftTagline": {
  "ja": "AIでコマース運営のAからZまで自動化するグローバルSaaS",
  "zh": "用AI将电商运营从A到Z自动化的全球SaaS",
  "zh-TW": "用AI將電商營運從A到Z自動化的全球SaaS",
  "vi": "SaaS toàn cầu tự động hoá thương mại từ A đến Z bằng AI",
  "th": "SaaS ระดับโลกที่อัตโนมัติคอมเมิร์ซตั้งแต่ A ถึง Z ด้วย AI",
  "id": "SaaS global yang mengotomatiskan commerce dari A sampai Z dengan AI",
  "de": "Das globale SaaS, das Commerce mit KI von A bis Z automatisiert",
  "fr": "Le SaaS mondial qui automatise le commerce de A à Z avec l'IA",
  "es": "El SaaS global que automatiza el comercio de la A a la Z con IA",
  "pt": "O SaaS global que automatiza o commerce de A a Z com IA",
  "ru": "Глобальный SaaS, автоматизирующий коммерцию от А до Я с помощью AI",
  "ar": "SaaS عالمي يؤتمت التجارة من الألف إلى الياء بالذكاء الاصطناعي",
  "hi": "AI से कॉमर्स को A से Z तक स्वचालित करने वाला वैश्विक SaaS"
 },
 "ftProduct": {
  "ja": "製品",
  "zh": "产品",
  "zh-TW": "產品",
  "vi": "Sản phẩm",
  "th": "ผลิตภัณฑ์",
  "id": "Produk",
  "de": "Produkt",
  "fr": "Produit",
  "es": "Producto",
  "pt": "Produto",
  "ru": "Продукт",
  "ar": "المنتج",
  "hi": "उत्पाद"
 },
 "ftCompany": {
  "ja": "会社",
  "zh": "公司",
  "zh-TW": "公司",
  "vi": "Công ty",
  "th": "บริษัท",
  "id": "Perusahaan",
  "de": "Unternehmen",
  "fr": "Entreprise",
  "es": "Empresa",
  "pt": "Empresa",
  "ru": "Компания",
  "ar": "الشركة",
  "hi": "कंपनी"
 },
 "ftLegal": {
  "ja": "規約",
  "zh": "条款",
  "zh-TW": "條款",
  "vi": "Pháp lý",
  "th": "กฎหมาย",
  "id": "Legal",
  "de": "Rechtliches",
  "fr": "Mentions légales",
  "es": "Legal",
  "pt": "Legal",
  "ru": "Правовое",
  "ar": "قانوني",
  "hi": "कानूनी"
 },
 "ftRights": {
  "ja": "All rights reserved.",
  "zh": "版权所有。",
  "zh-TW": "版權所有。",
  "vi": "Bảo lưu mọi quyền.",
  "th": "สงวนลิขสิทธิ์",
  "id": "Hak cipta dilindungi.",
  "de": "Alle Rechte vorbehalten.",
  "fr": "Tous droits réservés.",
  "es": "Todos los derechos reservados.",
  "pt": "Todos os direitos reservados.",
  "ru": "Все права защищены.",
  "ar": "جميع الحقوق محفوظة.",
  "hi": "सर्वाधिकार सुरक्षित।"
 }
};

const t = (key, lang) => DICT[key]?.[lang] || DICT_EXT[key]?.[lang] || DICT15[key]?.[lang] || DICT_RICH[key]?.[lang] || DICT_RICH_EXT[key]?.[lang] || DICT[key]?.en || DICT15[key]?.en || DICT_RICH[key]?.en || key;

const INTEGRATIONS = [
    "Coupang", "Naver", "Amazon", "Shopify", "TikTok Shop",
    "11Street", "Gmarket", "Meta Ads", "Google Ads", "Stripe",
];

function AnimatedCounter({ target, suffix = "" }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                const num = parseInt(target.replace(/[^0-9]/g, "")) || 0;
                let i = 0;
                const step = Math.ceil(num / 40);
                const timer = setInterval(() => { i = Math.min(i + step, num); setCount(i); if (i >= num) clearInterval(timer); }, 30);
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [target]);
    const display = target.includes("K") ? `${count}K` : target.includes("M") ? `${count}M` : `${count}`;
    return <span ref={ref}>{display}{suffix}</span>;
}

/* ── Language Selector Component ── */

/* ═══════════ 187차 프리미엄 라이트 랜딩 (자체완결형) ═══════════ */
const PALETTE = ["#4f46e5", "#7c3aed", "#06b6d4", "#0ea5e9", "#10b981", "#f59e0b"];

function PremiumHeader({ lang, setLang }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const [vis, setVis] = React.useState({ about: false, team: false });
  const lref = React.useRef(null);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    const onClick = (e) => { if (lref.current && !lref.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener("mousedown", onClick);
    const base = import.meta.env.VITE_API_BASE || "";
    fetch(base + "/auth/site/intro").then(r => r.json()).then(d => { if (d?.visibility) setVis(d.visibility); }).catch(() => {});
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mousedown", onClick); };
  }, []);
  const cur = LANGS.find(l => l.code === lang) || LANGS[1];
  const tr = (k) => t(k, lang);
  const navLink = { fontSize: 14, fontWeight: 600, color: "#334155", textDecoration: "none", padding: "8px 12px", borderRadius: 8, transition: "all 150ms" };
  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, transition: "all 300ms",
      background: scrolled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(18px) saturate(160%)",
      borderBottom: scrolled ? "1px solid #eef2f7" : "1px solid transparent", boxShadow: scrolled ? "0 4px 24px rgba(15,23,42,0.05)" : "none" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "0 24px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover", boxShadow: "0 4px 14px rgba(79,70,229,0.25)" }} />
          <span style={{ fontWeight: 900, fontSize: 17, color: "#0f172a", letterSpacing: -0.4 }}>Geniego<span style={{ color: "#4f46e5" }}>ROI</span></span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="lp-nav">
          <a href="#product" style={navLink} onMouseEnter={e=>e.target.style.background="#f1f5f9"} onMouseLeave={e=>e.target.style.background="transparent"}>{tr("navProduct")}</a>
          <a href="#how" style={navLink} onMouseEnter={e=>e.target.style.background="#f1f5f9"} onMouseLeave={e=>e.target.style.background="transparent"}>{tr("howBadge")}</a>
          {vis.about && <Link to="/about" style={navLink} onMouseEnter={e=>e.target.style.background="#f1f5f9"} onMouseLeave={e=>e.target.style.background="transparent"}>{st("navAbout", lang)}</Link>}
          {vis.team && <Link to="/team" style={navLink} onMouseEnter={e=>e.target.style.background="#f1f5f9"} onMouseLeave={e=>e.target.style.background="transparent"}>{st("navTeam", lang)}</Link>}
          <Link to="/pricing" style={navLink} onMouseEnter={e=>e.target.style.background="#f1f5f9"} onMouseLeave={e=>e.target.style.background="transparent"}>{tr("navPricing")}</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div ref={lref} style={{ position: "relative" }}>
            <button onClick={() => setLangOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ fontSize: 15 }}>{cur.flag}</span><span className="lp-langlabel">{cur.label}</span><span style={{ fontSize: 9, opacity: .5 }}>▼</span>
            </button>
            {langOpen && <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6, minWidth: 168, maxHeight: 360, overflowY: "auto", boxShadow: "0 16px 48px rgba(15,23,42,0.16)" }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); localStorage.setItem("landing_lang", l.code); localStorage.setItem("genie_roi_lang", l.code); try { window.dispatchEvent(new CustomEvent("genie-lang-change", { detail: { lang: l.code } })); } catch {} }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: lang === l.code ? "#eef2ff" : "transparent", color: lang === l.code ? "#4f46e5" : "#334155" }}>
                  <span style={{ fontSize: 15 }}>{l.flag}</span><span>{l.label}</span>
                </button>
              ))}
            </div>}
          </div>
          <Link to="/login" style={{ ...navLink, color: "#475569" }} className="lp-loginbtn">{tr("navLogin2")}</Link>
          <Link to="/login?tab=register" style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 13.5, textDecoration: "none", boxShadow: "0 6px 20px rgba(79,70,229,0.32)", whiteSpace: "nowrap" }}>{tr("navStart")}</Link>
        </div>
      </div>
    </header>
  );
}

const Badge = ({ children, color }) => (
  <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 99, background: color + "14", color, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 18 }}>{children}</div>
);
const H2 = ({ children }) => (
  <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 900, color: "#0f172a", letterSpacing: -1, margin: "0 0 14px", lineHeight: 1.15 }}>{children}</h2>
);

export default function Landing() {
  const [lang, setLang] = React.useState(() => localStorage.getItem("genie_roi_lang") || localStorage.getItem("landing_lang") || "en");
  React.useEffect(() => {
    const onL = (e) => { if (e?.detail?.lang) setLang(e.detail.lang); };
    window.addEventListener("genie-lang-change", onL);
    return () => window.removeEventListener("genie-lang-change", onL);
  }, []);
  const tr = (k) => t(k, lang);

  const STATS = [
    { label: tr("statChannels"), value: "30+", icon: "🌐" },
    { label: tr("statSKUs"), value: "1M+", icon: "📦" },
    { label: tr("statData"), value: "500K+", icon: "📈" },
    { label: tr("statClients"), value: "200+", icon: "🏢" },
  ];
  const MODULES = [1,2,3,4,5,6].map((n,i) => ({
    icon: ["🌐","📣","🏭","📊","🤝","🤖"][i], color: PALETTE[i],
    title: tr("m"+n+"t"), desc: tr("m"+n+"d"), bullets: [tr("m"+n+"b1"), tr("m"+n+"b2"), tr("m"+n+"b3")],
  }));
  const HOW = [1,2,3].map(n => ({ title: tr("how"+n+"t"), desc: tr("how"+n+"d") }));
  const USES = [1,2,3].map((n,i) => ({ icon:["🚀","🌏","📈"][i], color: PALETTE[i], title: tr("use"+n+"t"), desc: tr("use"+n+"d") }));
  const METRICS = [1,2,3].map(n => ({ value: tr("metric"+n+"v"), label: tr("metric"+n+"l") }));
  const WHY = [ tr("ts1"), tr("ts2"), tr("ts3"), tr("ts4") ];
  const WHY_ICON = ["🛡️","⚡","🌍","↩️"];
  const TESTI = [
    { name: "Sarah Kim", role: "Head of E-Commerce, Luxe Beauty Co.", text: tr("t1"), avatar: "SK" },
    { name: "James Park", role: "CEO, GlobalTrade Inc.", text: tr("t2"), avatar: "JP" },
    { name: "MinJi Lee", role: "Marketing Director, K-Style Fashion", text: tr("t3"), avatar: "ML" },
  ];
  const FAQS = [1,2,3,4].map(n => ({ q: tr("fq"+n+"q"), a: tr("fq"+n+"a") }));

  const sectionPad = { padding: "84px 24px" };
  const wrap = { maxWidth: 1180, margin: "0 auto" };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0f172a", fontFamily: "'Pretendard','Inter','Apple SD Gothic Neo','Segoe UI',system-ui,sans-serif" }}>
      <style>{` @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes lpUp { from { opacity:0; transform:translateY(22px);} to {opacity:1; transform:translateY(0);} }
        .lpUp { animation: lpUp .6s cubic-bezier(.2,.7,.2,1) forwards; }
        .lp-card { transition: transform .28s cubic-bezier(.2,.7,.2,1), box-shadow .28s, border-color .28s; }
        .lp-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(15,23,42,0.12) !important; }
        @media (max-width: 860px){ .lp-nav,.lp-loginbtn,.lp-langlabel{ display:none !important; } }
      `}</style>
      <PremiumHeader lang={lang} setLang={setLang} />

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", padding: "150px 24px 70px", textAlign: "center", overflow: "hidden", background: "linear-gradient(180deg,#f8faff 0%,#ffffff 60%)" }}>
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 980, height: 520, background: "radial-gradient(ellipse, rgba(79,70,229,0.10) 0%, rgba(124,58,237,0.06) 35%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ ...wrap, position: "relative" }} className="lpUp">
          <div style={{ marginBottom: 30 }}><LogoOrbit size={186} lang={lang} /></div>
          <Badge color="#4f46e5">{tr("heroBadge")}</Badge>
          <h1 style={{ fontSize: "clamp(32px,5vw,58px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5, margin: "0 0 22px", color: "#0f172a" }}>
            {tr("heroTitle").split(String.fromCharCode(10)).map((line, i) => (
              <span key={i} style={{ display: "block", ...(i === 0 ? { fontSize: "clamp(18px,2.4vw,26px)", fontWeight: 800, letterSpacing: 1, marginBottom: 10, background: "linear-gradient(90deg,#06b6d4,#4f46e5 45%,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : {}) }}>{line}</span>
            ))}
          </h1>
          <p style={{ fontSize: 18, color: "#475569", maxWidth: 680, margin: "0 auto 34px", lineHeight: 1.75 }}>{tr("heroDesc")}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <Link to="/login?tab=register" style={{ padding: "16px 38px", borderRadius: 13, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: "0 12px 34px rgba(79,70,229,0.36)" }}>{tr("btnTrial")}</Link>
            <Link to="/pricing" style={{ padding: "16px 38px", borderRadius: 13, background: "#fff", color: "#1e293b", fontWeight: 800, fontSize: 16, textDecoration: "none", border: "1.5px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.05)" }}>{tr("ctaBtnPricing")}</Link>
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 56 }}>{tr("heroTrust")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, maxWidth: 820, margin: "0 auto" }}>
            {STATS.map(sx => (
              <div key={sx.label} className="lp-card" style={{ padding: "22px 14px", borderRadius: 18, background: "#fff", border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
                <div style={{ fontSize: 16, marginBottom: 6 }}>{sx.icon}</div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}><AnimatedCounter target={sx.value} suffix={sx.value.includes("+") ? "+" : ""} /></div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{sx.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST / INTEGRATIONS ═══ */}
      <section style={{ padding: "26px 24px 50px", borderBottom: "1px solid #eef2f7" }}>
        <div style={{ textAlign: "center", marginBottom: 22, fontSize: 12, color: "#94a3b8", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{tr("integrationsLabel")}</div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", ...wrap }}>
          {INTEGRATIONS.map(n => <div key={n} style={{ padding: "9px 18px", borderRadius: 10, background: "#f8fafc", border: "1px solid #eef2f7", fontSize: 13, fontWeight: 700, color: "#64748b" }}>{n}</div>)}
        </div>
      </section>

      {/* ═══ PROBLEM → SOLUTION ═══ */}
      <section style={{ ...sectionPad, background: "#f8fafc" }}>
        <div style={{ ...wrap, maxWidth: 880, textAlign: "center" }}>
          <Badge color="#7c3aed">{tr("problemBadge")}</Badge>
          <H2>{tr("problemTitle").split(String.fromCharCode(10)).map((l,i)=><span key={i} style={{display:"block"}}>{l}</span>)}</H2>
          <p style={{ fontSize: 16.5, color: "#475569", lineHeight: 1.9, marginTop: 18 }}>{tr("problemDesc")}</p>
        </div>
      </section>

      {/* ═══ PRODUCT MODULES (deep dive) ═══ */}
      <section id="product" style={sectionPad}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <Badge color="#4f46e5">{tr("modulesBadge")}</Badge>
            <H2>{tr("modulesTitle")}</H2>
            <p style={{ fontSize: 15.5, color: "#64748b", maxWidth: 560, margin: "0 auto" }}>{tr("modulesDesc")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 }}>
            {MODULES.map(m => (
              <div key={m.title} className="lp-card" style={{ padding: "30px 28px", borderRadius: 22, background: "#fff", border: "1px solid #eef2f7", boxShadow: "0 10px 34px rgba(15,23,42,0.05)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: m.color + "16", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 18 }}>{m.icon}</div>
                <div style={{ fontSize: 19, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>{m.title}</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 16 }}>{m.desc}</div>
                <div style={{ display: "grid", gap: 9 }}>
                  {m.bullets.map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "#334155", fontWeight: 500 }}>
                      <span style={{ color: m.color, marginTop: 1, flexShrink: 0, fontWeight: 900 }}>✓</span>{b}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" style={{ ...sectionPad, background: "linear-gradient(180deg,#f8faff,#ffffff)" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <Badge color="#06b6d4">{tr("howBadge")}</Badge>
            <H2>{tr("howTitle")}</H2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {HOW.map((h, i) => (
              <div key={i} style={{ padding: "32px 26px", borderRadius: 20, background: "#fff", border: "1px solid #eef2f7", boxShadow: "0 8px 26px rgba(15,23,42,0.05)", position: "relative" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg," + PALETTE[i] + "," + PALETTE[i+1] + ")", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, marginBottom: 16 }}>{i+1}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>{h.title}</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section style={sectionPad}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <Badge color="#10b981">{tr("useBadge")}</Badge>
            <H2>{tr("useTitle")}</H2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
            {USES.map(u => (
              <div key={u.title} className="lp-card" style={{ padding: "30px 28px", borderRadius: 20, background: u.color + "0a", border: "1px solid " + u.color + "26" }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{u.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>{u.title}</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.75 }}>{u.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ METRICS ═══ */}
      <section style={{ padding: "70px 24px" }}>
        <div style={{ ...wrap, maxWidth: 980 }}>
          <div style={{ borderRadius: 26, padding: "52px 40px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 30px 70px rgba(79,70,229,0.30)", textAlign: "center" }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 34, letterSpacing: -0.5 }}>{tr("metricsTitle")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {METRICS.map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: "clamp(30px,5vw,48px)", fontWeight: 900, color: "#fff", letterSpacing: -1.5 }}>{m.value}</div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", fontWeight: 600, marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY / SECURITY ═══ */}
      <section style={{ ...sectionPad, background: "#f8fafc" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Badge color="#0ea5e9">{tr("trustBadge")}</Badge>
            <H2>{tr("whyTitle2")}</H2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {WHY.map((w, i) => (
              <div key={i} className="lp-card" style={{ padding: "28px 24px", borderRadius: 18, background: "#fff", border: "1px solid #eef2f7", textAlign: "center", boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{WHY_ICON[i]}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", lineHeight: 1.6 }}>{w}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section style={sectionPad}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Badge color="#7c3aed">{tr("testimonialBadge")}</Badge>
            <H2>{tr("testimonialTitle")}</H2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {TESTI.map((tm, i) => (
              <div key={tm.name} className="lp-card" style={{ padding: "32px 28px", borderRadius: 20, background: "#fff", border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
                <div style={{ color: "#f59e0b", fontSize: 15, marginBottom: 14 }}>★★★★★</div>
                <div style={{ fontSize: 14.5, color: "#334155", lineHeight: 1.85, marginBottom: 22 }}>“{tm.text}”</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg," + PALETTE[i] + "," + PALETTE[i+1] + ")", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>{tm.avatar}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{tm.name}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{tm.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING TEASER ═══ */}
      <section style={{ ...sectionPad, background: "#f8fafc", textAlign: "center" }}>
        <div style={{ ...wrap, maxWidth: 700 }}>
          <Badge color="#4f46e5">{tr("navPricing")}</Badge>
          <H2>{tr("pricingTzTitle")}</H2>
          <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.8, marginBottom: 26 }}>{tr("pricingTzDesc")}</p>
          <Link to="/pricing" style={{ padding: "15px 38px", borderRadius: 13, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 15.5, textDecoration: "none", boxShadow: "0 12px 30px rgba(79,70,229,0.32)" }}>{tr("ctaBtnPricing")}</Link>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={sectionPad}>
        <div style={{ ...wrap, maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <Badge color="#06b6d4">{tr("faqBadge")}</Badge>
            <H2>{tr("faqTitle2")}</H2>
          </div>
          {FAQS.map((f, i) => (
            <div key={i} style={{ padding: "22px 24px", borderRadius: 16, background: "#fff", border: "1px solid #eef2f7", marginBottom: 12, boxShadow: "0 4px 16px rgba(15,23,42,0.03)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{f.q}</div>
              <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{ padding: "30px 24px 90px" }}>
        <div style={{ ...wrap, maxWidth: 920 }}>
          <div style={{ borderRadius: 28, padding: "64px 40px", textAlign: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#0f172a,#312e81)", boxShadow: "0 30px 80px rgba(15,23,42,0.35)" }}>
            <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)" }} />
            <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", fontWeight: 900, color: "#fff", letterSpacing: -0.8, marginBottom: 14, position: "relative" }}>{tr("finalTitle")}</h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 30, position: "relative" }}>{tr("finalDesc")}</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
              <Link to="/login?tab=register" style={{ padding: "16px 40px", borderRadius: 13, background: "linear-gradient(135deg,#06b6d4,#4f46e5)", color: "#fff", fontWeight: 800, fontSize: 15.5, textDecoration: "none", boxShadow: "0 12px 34px rgba(6,182,212,0.4)" }}>{tr("btnTrial")}</Link>
              <a href="mailto:support@genie-go.com" style={{ padding: "16px 40px", borderRadius: 13, background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 800, fontSize: 15.5, textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>{tr("ctaBtnContact")}</a>
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 20, position: "relative" }}>{tr("heroTrust")}</div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: "1px solid #eef2f7", background: "#fafbfc" }}>
        <div style={{ ...wrap, padding: "52px 24px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 36, marginBottom: 36 }} className="lp-footgrid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
                <span style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>Geniego<span style={{ color: "#4f46e5" }}>ROI</span></span>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8, maxWidth: 280 }}>{tr("ftTagline")}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{tr("ftProduct")}</div>
              {[[tr("navPricing"),"/pricing"],["Dashboard","/login"]].map(([l,to]) => <div key={l}><Link to={to} style={{ fontSize: 13, color: "#475569", textDecoration: "none", lineHeight: 2.3 }}>{l}</Link></div>)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{tr("ftCompany")}</div>
              {[[st("navAbout",lang),"/about"],[st("navTeam",lang),"/team"]].map(([l,to]) => <div key={l}><Link to={to} style={{ fontSize: 13, color: "#475569", textDecoration: "none", lineHeight: 2.3 }}>{l}</Link></div>)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{tr("ftLegal")}</div>
              {[["Terms","/terms"],["Privacy","/privacy"],["Refund","/refund"]].map(([l,to]) => <div key={l}><Link to={to} style={{ fontSize: 13, color: "#475569", textDecoration: "none", lineHeight: 2.3 }}>{l}</Link></div>)}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #eef2f7", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 12, color: "#94a3b8" }}>
            <span>© 2024–2026 OCIELL Co., Ltd. {tr("ftRights")}</span>
            <span>support@genie-go.com · Seoul, Republic of Korea</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
