import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { st } from "./siteI18n.js";
import { LogoOrbit } from "../../layout/PremiumLayout.jsx";
import { detectLang } from "../../i18n/index.js"; // [현 차수] navigator/저장 기반 초기 언어감지(영어 하드코딩 제거)
import ReferralPromo from "../../components/ReferralPromo.jsx"; // [282차 R3] 추천인 제도 홍보(15국)

/* [251차 Phase2 ②] 플랫폼 성장 — 랜딩 방문 이메일 캡처(비침습 하단 슬라이드인). 공개 /v424/growth/capture 호출
   → platform_growth 리드 자동생성(퍼널 최상단 유입). 자체 완결형(메인 컴포넌트 무영향)·1회 닫으면 재노출 안 함. */
function GrowthCapturePopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem("gg_cap_dismissed") === "1") return; } catch (_) {}
    const t = setTimeout(() => setShow(true), 9000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  // [254차 감사] 방문자 언어 — 저장 우선, 없으면 navigator 감지(Landing 본체 패턴 정합). t()=11국 DICT 현지화.
  let lang; try { lang = localStorage.getItem("genie_roi_lang") || localStorage.getItem("landing_lang") || detectLang(); } catch (_) { lang = detectLang(); }
  const close = () => { setShow(false); try { localStorage.setItem("gg_cap_dismissed", "1"); } catch (_) {} };
  const submit = async () => {
    const e = (email || "").trim();
    if (!/.+@.+\..+/.test(e)) return;
    try {
      await fetch("/api/v424/growth/capture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, event: "email_capture", source: "landing_popup", channel: "organic", page: "landing" }),
      });
    } catch (_) {}
    setDone(true); try { localStorage.setItem("gg_cap_dismissed", "1"); } catch (_) {}
    setTimeout(() => setShow(false), 2200);
  };
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, width: 320, maxWidth: "92vw", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", padding: 20, fontFamily: "Apple SD Gothic Neo,Malgun Gothic,sans-serif" }}>
      <button onClick={close} aria-label="close" style={{ position: "absolute", top: 8, right: 12, border: "none", background: "none", fontSize: 18, color: "#94a3b8", cursor: "pointer" }}>×</button>
      {done ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontWeight: 800, color: "#0f172a", marginTop: 8 }}>{t("capThanks", lang)}</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{t("capTitle", lang)}</div>
          <div style={{ fontSize: 12.5, color: "#64748b", margin: "6px 0 12px", lineHeight: 1.6 }}>{t("capDesc", lang)}</div>
          <input value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder={t("capEmailPh", lang)} type="email"
            onKeyDown={(ev) => { if (ev.key === "Enter") submit(); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }} />
          <button onClick={submit} style={{ width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#4f8ef7,#a855f7)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{t("capCta", lang)}</button>
        </>
      )}
    </div>
  );
}

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
    /* ── [254차 감사] Growth 캡처 팝업(전 방문자 노출·기존 하드코딩 한글 → 11국 현지화) ── */
    capThanks: { ko:"감사합니다! 곧 안내드리겠습니다.", en:"Thank you! We'll be in touch shortly.", ja:"ありがとうございます！まもなくご案内します。", zh:"感谢！我们将尽快与您联系。", "zh-TW":"感謝！我們將盡快與您聯繫。", vi:"Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.", th:"ขอบคุณ! เราจะติดต่อกลับเร็วๆ นี้", id:"Terima kasih! Kami akan segera menghubungi Anda.", de:"Danke! Wir melden uns in Kürze.", fr:"Merci ! Nous vous contacterons sous peu.", es:"¡Gracias! Le contactaremos en breve." },
    capTitle: { ko:"🚀 전 광고매체 ROI를 한 곳에서", en:"🚀 All your ad-channel ROI in one place", ja:"🚀 すべての広告媒体のROIを一か所で", zh:"🚀 所有广告渠道的ROI集中管理", "zh-TW":"🚀 所有廣告渠道的ROI集中管理", vi:"🚀 Toàn bộ ROI kênh quảng cáo tại một nơi", th:"🚀 ROI ของทุกช่องทางโฆษณาในที่เดียว", id:"🚀 Semua ROI kanal iklan dalam satu tempat", de:"🚀 Alle Werbekanal-ROIs an einem Ort", fr:"🚀 Tout le ROI de vos canaux publicitaires au même endroit", es:"🚀 Todo el ROI de tus canales publicitarios en un solo lugar" },
    capDesc: { ko:"20일 무료 체험 안내를 받아보세요. 채널별 예산 효율과 ROAS를 한 곳에서 분석합니다.", en:"Get your 20-day free trial guide. Analyze channel budget efficiency and ROAS in one place.", ja:"20日間の無料トライアル案内を受け取りましょう。チャネル別の予算効率とROASを一か所で分析します。", zh:"领取20天免费试用指南。在一处分析各渠道预算效率与ROAS。", "zh-TW":"領取20天免費試用指南。在一處分析各通路預算效率與ROAS。", vi:"Nhận hướng dẫn dùng thử miễn phí 20 ngày. Phân tích hiệu quả ngân sách và ROAS từng kênh tại một nơi.", th:"รับคำแนะนำทดลองใช้ฟรี 20 วัน วิเคราะห์ประสิทธิภาพงบและ ROAS แต่ละช่องทางในที่เดียว", id:"Dapatkan panduan uji coba gratis 20 hari. Analisis efisiensi anggaran dan ROAS tiap kanal di satu tempat.", de:"Erhalten Sie Ihren 20-tägigen Testleitfaden. Analysieren Sie Budgeteffizienz und ROAS pro Kanal an einem Ort.", fr:"Recevez votre guide d'essai gratuit de 20 jours. Analysez l'efficacité budgétaire et le ROAS par canal en un seul endroit.", es:"Reciba su guía de prueba gratuita de 20 días. Analice la eficiencia del presupuesto y el ROAS por canal en un solo lugar." },
    capEmailPh: { ko:"이메일 주소", en:"Email address", ja:"メールアドレス", zh:"电子邮箱", "zh-TW":"電子郵箱", vi:"Địa chỉ email", th:"ที่อยู่อีเมล", id:"Alamat email", de:"E-Mail-Adresse", fr:"Adresse e-mail", es:"Correo electrónico" },
    capCta: { ko:"무료 체험 안내 받기", en:"Get free trial info", ja:"無料トライアル案内を受け取る", zh:"获取免费试用信息", "zh-TW":"取得免費試用資訊", vi:"Nhận thông tin dùng thử miễn phí", th:"รับข้อมูลทดลองใช้ฟรี", id:"Dapatkan info uji coba gratis", de:"Kostenlose Testinfos erhalten", fr:"Obtenir les infos d'essai gratuit", es:"Obtener info de prueba gratis" },
    /* ── Badge ── */
    heroBadge: {
        ko: "🚀 마케팅 성과 분석 · 어트리뷰션 · ROAS 최적화 플랫폼",
        en: "🚀 Marketing Analytics · Attribution · ROAS Optimization Platform",
        ja: "🚀 マーケティング成果分析 · アトリビューション · ROAS最適化プラットフォーム",
        zh: "🚀 营销绩效分析 · 归因 · ROAS 优化平台",
        "zh-TW": "🚀 行銷成效分析 · 歸因 · ROAS 最佳化平台",
        vi: "🚀 Nền tảng Phân tích Hiệu suất Marketing · Attribution · Tối ưu ROAS",
        th: "🚀 แพลตฟอร์มวิเคราะห์ประสิทธิภาพการตลาด · Attribution · เพิ่มประสิทธิภาพ ROAS",
        id: "🚀 Platform Analitik Performa Marketing · Atribusi · Optimasi ROAS",
        de: "🚀 Plattform für Marketing-Analytics · Attribution · ROAS-Optimierung",
        fr: "🚀 Plateforme d'analyse marketing · Attribution · Optimisation du ROAS",
        es: "🚀 Plataforma de análisis de marketing · Atribución · Optimización de ROAS",
    },
    heroTitle: {
        ko: "모든 채널의 마케팅 성과를\n측정 · 기여도 분석 · 최적화",
        en: "Measure, attribute, and optimize\nmarketing performance\nacross every channel.",
        ja: "すべてのチャネルのマーケティング成果を\n測定 · アトリビューション · 最適化",
        zh: "衡量、归因并优化\n每个渠道的营销绩效",
        "zh-TW": "衡量、歸因並最佳化\n每個通路的行銷成效",
        vi: "Đo lường, phân bổ và tối ưu\nhiệu suất marketing trên mọi kênh",
        th: "วัดผล จัดสรรเครดิต และเพิ่มประสิทธิภาพ\nการตลาดในทุกช่องทาง",
        id: "Ukur, atribusikan, dan optimalkan\nperforma marketing di setiap kanal",
        de: "Messen, attribuieren und optimieren Sie\ndie Marketing-Performance über alle Kanäle",
        fr: "Mesurez, attribuez et optimisez\nla performance marketing sur tous les canaux",
        es: "Mida, atribuya y optimice\nel rendimiento de marketing en cada canal",
    },
    heroDesc: {
        ko: "GeniegoROI는 커머스 팀이 연결된 판매·마케팅 채널의 데이터로 ROAS, 고객 여정, 어트리뷰션, LTV, CAC, 전환 기회를 이해하도록 돕습니다.",
        en: "GeniegoROI helps commerce teams understand ROAS, customer journeys, attribution, LTV, CAC, and conversion opportunities from connected sales and marketing channels.",
        ja: "GeniegoROIは、コマースチームが連携した販売・マーケティングチャネルのデータからROAS、カスタマージャーニー、アトリビューション、LTV、CAC、コンバージョン機会を把握できるよう支援します。",
        zh: "GeniegoROI 帮助电商团队从已连接的销售与营销渠道数据中理解 ROAS、客户旅程、归因、LTV、CAC 和转化机会。",
        "zh-TW": "GeniegoROI 幫助電商團隊從已連接的銷售與行銷通路數據中理解 ROAS、顧客旅程、歸因、LTV、CAC 和轉換機會。",
        vi: "GeniegoROI giúp các đội thương mại hiểu ROAS, hành trình khách hàng, attribution, LTV, CAC và cơ hội chuyển đổi từ dữ liệu các kênh bán hàng và marketing đã kết nối.",
        th: "GeniegoROI ช่วยให้ทีมคอมเมิร์ซเข้าใจ ROAS เส้นทางลูกค้า Attribution, LTV, CAC และโอกาสในการเพิ่ม Conversion จากข้อมูลช่องทางการขายและการตลาดที่เชื่อมต่อ",
        id: "GeniegoROI membantu tim commerce memahami ROAS, customer journey, atribusi, LTV, CAC, dan peluang konversi dari data kanal penjualan dan marketing yang terhubung.",
        de: "GeniegoROI hilft Commerce-Teams, ROAS, Customer Journeys, Attribution, LTV, CAC und Conversion-Chancen aus verbundenen Vertriebs- und Marketingkanälen zu verstehen.",
        fr: "GeniegoROI aide les équipes commerce à comprendre le ROAS, les parcours clients, l'attribution, la LTV, le CAC et les opportunités de conversion à partir des canaux de vente et marketing connectés.",
        es: "GeniegoROI ayuda a los equipos de comercio a entender el ROAS, los recorridos del cliente, la atribución, el LTV, el CAC y las oportunidades de conversión a partir de los canales de ventas y marketing conectados.",
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
    // [283차 정직성] 합배송·국제특송 상업송장 자동생성은 코드 부재(부재증명: consolidat|commercial_invoice → backend 0건)였다.
    //   실제 구현분(Wms.php 다중창고·LOT/FEFO·피킹/패킹, Logistics.php shipment_tracking·carriers·track)만 표기.
    f2d: { ko: "다중 창고 재고 추적, LOT·FEFO 관리, 피킹·패킹 워크플로, 운송사 배송추적 API 연동.", en: "Multi-warehouse inventory tracking, LOT/FEFO management, picking & packing workflows, and carrier tracking API integration.", ja: "マルチ倉庫在庫管理、LOT・FEFO管理、ピッキング・パッキング、配送追跡API連携。", zh: "多仓库库存追踪、LOT/FEFO 管理、拣货打包流程及承运商物流追踪 API 集成。", "zh-TW": "多倉庫庫存追蹤、LOT/FEFO 管理、揀貨打包流程及承運商物流追蹤 API 整合。", vi: "Theo dõi kho đa điểm, quản lý LOT/FEFO, quy trình soạn & đóng gói, tích hợp API theo dõi vận chuyển.", th: "ติดตามสินค้าคลังหลายแห่ง จัดการ LOT/FEFO หยิบ-แพ็กสินค้า เชื่อม API ติดตามขนส่ง", id: "Pelacakan inventori multi-gudang, manajemen LOT/FEFO, alur picking & packing, integrasi API pelacakan kurir.", de: "Multi-Lager-Tracking, LOT-/FEFO-Verwaltung, Kommissionierung & Verpackung sowie Carrier-Tracking-API.", fr: "Suivi multi-entrepôt, gestion LOT/FEFO, préparation et emballage, API de suivi transporteurs.", es: "Seguimiento multi-almacén, gestión LOT/FEFO, preparación y embalaje, API de seguimiento de transportistas." },
    f3t: { ko: "멀티채널 어트리뷰션 분석", en: "Multi-Channel Attribution Analytics", ja: "マルチチャネル・アトリビューション分析", zh: "多渠道归因分析", "zh-TW": "多通路歸因分析", vi: "Phân tích Attribution đa kênh", th: "การวิเคราะห์ Attribution หลายช่องทาง", id: "Analitik Atribusi Multi-Channel", de: "Multi-Channel-Attributionsanalyse", fr: "Analyse d'attribution multicanal", es: "Análisis de atribución multicanal" },
    f3d: { ko: "8차원 광고 기여도 분석, 인플루언서 캠페인, 쿠폰 흐름 종합 분석. 데이터 기반 예산 추천과 사람 검토·승인.", en: "8-dimensional contribution scoring across ad channels, influencer campaigns, and coupon flows. Analytics-assisted budget recommendations with human review and approval.", ja: "8次元の広告貢献度分析、インフルエンサーキャンペーン、クーポン分析。データに基づく予算提案と人による確認・承認。", zh: "8维广告贡献度分析，覆盖网红活动和优惠券流向。基于数据的预算建议，由人工审核批准。", "zh-TW": "8維廣告貢獻度分析，涵蓋網紅活動和優惠券流向。基於數據的預算建議，由人工審核批准。", vi: "Phân tích đóng góp quảng cáo 8 chiều, chiến dịch influencer, dòng coupon. Đề xuất ngân sách dựa trên dữ liệu, con người xem xét và phê duyệt.", th: "การวิเคราะห์โฆษณา 8 มิติ แคมเปญอินฟลูเอนเซอร์ และคูปอง คำแนะนำงบจากข้อมูล พร้อมการตรวจสอบและอนุมัติโดยคน", id: "Skor kontribusi 8-dimensi, kampanye influencer, alur kupon. Rekomendasi anggaran berbasis data dengan peninjauan dan persetujuan manusia.", de: "8-dimensionale Beitragsanalyse, Influencer-Kampagnen, Coupon-Flüsse. Datenbasierte Budgetempfehlungen mit menschlicher Prüfung und Freigabe.", fr: "Scoring 8 dimensions, campagnes influenceurs, flux de coupons. Recommandations budgétaires basées sur les données, avec revue et approbation humaines.", es: "Análisis de contribución en 8 dimensiones, campañas de influencers, flujos de cupones. Recomendaciones de presupuesto basadas en datos con revisión y aprobación humana." },
    f4t: { ko: "인플루언서 분석", en: "Influencer Analytics", ja: "インフルエンサー分析", zh: "网红分析", "zh-TW": "網紅分析", vi: "Phân tích Influencer", th: "วิเคราะห์อินฟลูเอนเซอร์", id: "Analitik Influencer", de: "Influencer-Analytik", fr: "Analytique Influenceur", es: "Analítica de Influencer" },
    f4d: { ko: "도달률, 참여율, 전환율, ROI 평가. 자동 수수료 관리와 실시간 캠페인 성과 추적.", en: "Evaluate influencers by reach, engagement rate, conversion, and estimated ROI. Automated commission management and real-time campaign performance tracking.", ja: "リーチ、エンゲージメント率、CVR、ROIでインフルエンサーを評価。自動コミッション管理。", zh: "按触达、互动率、转化和ROI评估网红。自动佣金管理与实时跟踪。", "zh-TW": "按觸達、互動率、轉化和ROI評估網紅。自動佣金管理與即時追蹤。", vi: "Đánh giá influencer theo reach, tương tác, chuyển đổi, ROI. Quản lý hoa hồng tự động.", th: "ประเมินอินฟลูเอนเซอร์ด้วย Reach, Engagement, ROI ติดตามแคมเปญแบบเรียลไทม์", id: "Evaluasi influencer berdasarkan reach, engagement, konversi & ROI. Manajemen komisi otomatis.", de: "Influencer-Bewertung nach Reichweite, Engagement, Konversion & ROI. Auto-Provisionen.", fr: "Évaluez les influenceurs par portée, engagement, conversion et ROI. Commissions auto.", es: "Evalúe influencers por alcance, engagement, conversión y ROI. Comisiones automáticas." },
    f5t: { ko: "통합 손익 분석", en: "Unified P&L Analytics", ja: "統合P&L分析", zh: "统一损益分析", "zh-TW": "統一損益分析", vi: "Phân tích P&L hợp nhất", th: "วิเคราะห์กำไร-ขาดทุนรวม", id: "Analitik P&L Terpadu", de: "Vereinte P&L-Analytik", fr: "Analytique P&L unifiée", es: "Analítica P&L unificada" },
    f5d: { ko: "SKU·채널·캠페인·크리에이터별 실시간 손익. ROAS 하락, 반품 급증, 쿠폰 이상 패턴 자동 감지.", en: "Real-time Profit & Loss by SKU, channel, campaign, and creator. Anomaly detection for ROAS drops, return surges, and coupon abuse patterns.", ja: "SKU・チャネル・キャンペーン別のリアルタイムP/L。ROAS低下、返品急増の異常検知。", zh: "按SKU、渠道、活动实时损益。自动检测ROAS下降和退货异常。", "zh-TW": "按SKU、通路、活動即時損益。自動偵測ROAS下降和退貨異常。", vi: "Lãi/lỗ theo SKU, kênh, chiến dịch. Phát hiện bất thường ROAS, hoàn hàng.", th: "กำไร-ขาดทุนตาม SKU ช่องทาง แคมเปญ ตรวจจับ ROAS ผิดปกติ", id: "P&L real-time per SKU, channel, kampanye. Deteksi anomali ROAS & retur.", de: "Echtzeit-P&L nach SKU, Kanal, Kampagne. Anomalieerkennung für ROAS & Retouren.", fr: "P&L en temps réel par SKU, canal, campagne. Détection d'anomalies ROAS.", es: "P&L en tiempo real por SKU, canal, campaña. Detección de anomalías ROAS." },
    f6t: { ko: "정산·대사", en: "Settlement & Reconciliation", ja: "決済・照合", zh: "结算与对账", "zh-TW": "結算與對帳", vi: "Thanh toán & Đối soát", th: "การชำระเงินและกระทบยอด", id: "Settlement & Rekonsiliasi", de: "Abrechnung & Abstimmung", fr: "Règlement & Rapprochement", es: "Liquidación y Conciliación" },
    f6d: { ko: "모든 채널의 정산 자동 대사. 채널 지급액과 예상 금액 간 불일치를 즉시 포착.", en: "Automated settlement reconciliation across all channels. Catch discrepancies between channel payouts and expected amounts instantly.", ja: "全チャネルの自動決済照合。支払金額と予定金額の不一致を即時検出。", zh: "全渠道自动结算对账，即时发现支付差异。", "zh-TW": "全通路自動結算對帳，即時發現支付差異。", vi: "Đối soát thanh toán tự động. Phát hiện sai lệch ngay lập tức.", th: "กระทบยอดอัตโนมัติ ตรวจจับความต่างระหว่างยอดจ่ายและยอดที่คาดหวัง", id: "Rekonsiliasi otomatis. Deteksi selisih payout channel secara instan.", de: "Automatisierte Abrechnungsabstimmung. Sofortige Diskrepanzerkennung.", fr: "Rapprochement automatisé. Détection instantanée des écarts.", es: "Conciliación automatizada. Detección instantánea de discrepancias." },
    f7t: { ko: "마케팅 자동화 지원", en: "Marketing Automation Support", ja: "マーケティング自動化サポート", zh: "营销自动化支持", "zh-TW": "行銷自動化支援", vi: "Hỗ trợ tự động hoá marketing", th: "การสนับสนุนระบบอัตโนมัติการตลาด", id: "Dukungan Otomasi Marketing", de: "Marketing-Automatisierungs-Support", fr: "Support d'automatisation marketing", es: "Soporte de automatización de marketing" },
    f7d: { ko: "규칙 기반 자동화 워크플로우와 분석 기반 추천. 임계값 설정, 추천 검토, 원클릭 승인·오버라이드.", en: "Rule-based automation workflows with analytics-assisted recommendations. Set thresholds, review suggestions, approve or override with one click.", ja: "ルールベースの自動化ワークフローと分析に基づく推奨。閾値設定、推奨の確認、ワンクリック承認・上書き。", zh: "基于规则的自动化工作流与分析辅助建议。设置阈值、审阅建议、一键批准或覆盖。", "zh-TW": "基於規則的自動化工作流與分析輔助建議。設定閾值、審閱建議、一鍵批准或覆蓋。", vi: "Quy trình tự động hoá dựa trên quy tắc kèm khuyến nghị hỗ trợ bằng phân tích. Đặt ngưỡng, xem xét gợi ý, phê duyệt hoặc ghi đè bằng một cú nhấp.", th: "เวิร์กโฟลว์อัตโนมัติตามกฎ พร้อมคำแนะนำที่ช่วยด้วยการวิเคราะห์ ตั้งเกณฑ์ ตรวจสอบคำแนะนำ อนุมัติหรือแก้ไขด้วยคลิกเดียว", id: "Alur kerja otomasi berbasis aturan dengan rekomendasi berbantuan analitik. Atur threshold, tinjau saran, setujui atau timpa dengan satu klik.", de: "Regelbasierte Automatisierungs-Workflows mit analytikgestützten Empfehlungen. Schwellenwerte festlegen, Vorschläge prüfen, per Klick freigeben oder überschreiben.", fr: "Workflows d'automatisation basés sur des règles avec recommandations assistées par l'analyse. Définissez des seuils, examinez les suggestions, approuvez ou remplacez en un clic.", es: "Flujos de automatización basados en reglas con recomendaciones asistidas por análisis. Defina umbrales, revise sugerencias, apruebe o anule con un clic." },
    f8t: { ko: "30+ 채널 커넥터", en: "30+ Channel Connectors", ja: "30+チャネルコネクタ", zh: "30+渠道连接器", "zh-TW": "30+通路連接器", vi: "30+ Kết nối kênh", th: "30+ ตัวเชื่อมต่อช่องทาง", id: "30+ Konektor Channel", de: "30+ Kanal-Konnektoren", fr: "30+ Connecteurs de canaux", es: "30+ Conectores de Canal" },
    f8d: { ko: "쿠팡, 네이버, 11번가 등 국내 채널과 아마존, 메타, 틱톡 등 글로벌 플랫폼의 사전 구축 API. OAuth 인증 관리.", en: "Pre-built API connectors for domestic channels (Coupang, Naver, 11st) and global platforms (Amazon, Meta, TikTok). OAuth-ready credential management.", ja: "国内（Coupang/Naver/11st）と海外（Amazon/Meta/TikTok）の事前構築APIコネクタ。OAuth認証管理。", zh: "为国内渠道(Coupang/Naver/11st)和全球平台(Amazon/Meta/TikTok)预建API。OAuth凭证管理。", "zh-TW": "為國內通路和全球平台預建API連接器。OAuth憑證管理。", vi: "Kết nối API sẵn có cho kênh nội địa và toàn cầu. Quản lý OAuth.", th: "API สำเร็จรูปสำหรับช่องทางในประเทศและทั่วโลก จัดการ OAuth", id: "Konektor API pra-bangun untuk channel domestik & global. Manajemen OAuth.", de: "Vorgefertigte API-Konnektoren für lokale & globale Kanäle. OAuth-Verwaltung.", fr: "Connecteurs API pré-construits pour canaux locaux & globaux. Gestion OAuth.", es: "Conectores API preconstruidos para canales nacionales y globales. Gestión OAuth." },
    /* ── Testimonials ── */
    testimonialBadge: { ko: "고객 후기", en: "What Our Clients Say", ja: "お客様の声", zh: "客户评价", "zh-TW": "客戶評價", vi: "Khách hàng nói gì", th: "ลูกค้าพูดถึงเรา", id: "Apa Kata Klien Kami", de: "Was unsere Kunden sagen", fr: "Ce que disent nos clients", es: "Lo que dicen nuestros clientes" },
    testimonialTitle: { ko: "커머스 리더들이 신뢰합니다", en: "Trusted by Commerce Leaders", ja: "コマースリーダーに信頼される", zh: "深受电商领军者信赖", "zh-TW": "深受電商領軍者信賴", vi: "Được các nhà lãnh đạo thương mại tin dùng", th: "ผู้นำเทรดต่างไว้วางใจ", id: "Dipercaya Pemimpin Commerce", de: "Von Commerce-Leadern vertraut", fr: "Approuvé par les leaders du commerce", es: "Confiado por líderes del comercio" },
    t1: { ko: "Geniego-ROI 덕분에 8개 채널에서 ROAS가 340% 상승했습니다. 예산 최적화 분석만으로도 주당 20시간의 수작업이 절감됐어요.", en: "Geniego-ROI helped us increase ROAS by 340% across 8 channels. The budget optimization analytics alone saved 20 hours of manual work per week.", ja: "Geniego-ROIで8チャネルのROASが340%向上。予算最適化分析だけで週20時間の手作業を削減。", zh: "Geniego-ROI帮助我们在8个渠道上将ROAS提高了340%。仅预算优化分析每周就节省20小时。", "zh-TW": "Geniego-ROI幫助我們在8個通路提高了340%的ROAS。僅預算最佳化分析每週就節省20小時。", vi: "Geniego-ROI giúp tăng ROAS 340% trên 8 kênh. Chỉ riêng phân tích tối ưu ngân sách đã tiết kiệm 20 giờ/tuần.", th: "Geniego-ROI ช่วยเพิ่ม ROAS 340% ใน 8 ช่องทาง แค่การวิเคราะห์เพิ่มประสิทธิภาพงบก็ช่วยลดงานมือ 20 ชม./สัปดาห์", id: "Geniego-ROI meningkatkan ROAS 340% di 8 channel. Analitik optimasi anggaran saja menghemat 20 jam/minggu.", de: "Geniego-ROI steigerte unseren ROAS um 340% auf 8 Kanälen. Allein die Budgetoptimierungsanalyse sparte 20 Std./Woche.", fr: "Geniego-ROI a augmenté notre ROAS de 340% sur 8 canaux. L'analyse d'optimisation budgétaire à elle seule a économisé 20h/semaine.", es: "Geniego-ROI elevó nuestro ROAS 340% en 8 canales. Solo el análisis de optimización de presupuesto ahorró 20h/semana." },
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
        "pt": "🚀 Plataforma de Análise de Marketing · Atribuição · Otimização de ROAS",
        "ru": "🚀 Платформа маркетинговой аналитики · Атрибуции · Оптимизации ROAS",
        "ar": "🚀 منصة تحليلات التسويق · الإسناد · تحسين ROAS",
        "hi": "🚀 मार्केटिंग एनालिटिक्स · एट्रिब्यूशन · ROAS ऑप्टिमाइज़ेशन प्लेटफ़ॉर्म"
    },
    "heroTitle": {
        "pt": "Meça, atribua e otimize\no desempenho de marketing\nem todos os canais",
        "ru": "Измеряйте, атрибутируйте и оптимизируйте\nэффективность маркетинга\nпо всем каналам",
        "ar": "قِس وأسنِد وحسّن\nأداء التسويق عبر كل قناة",
        "hi": "हर चैनल पर मार्केटिंग प्रदर्शन को\nमापें, एट्रिब्यूट करें और ऑप्टिमाइज़ करें"
    },
    "heroDesc": {
        "pt": "A GeniegoROI ajuda equipes de commerce a entender ROAS, jornadas do cliente, atribuição, LTV, CAC e oportunidades de conversão a partir dos canais de vendas e marketing conectados.",
        "ru": "GeniegoROI помогает командам электронной коммерции понимать ROAS, пути клиентов, атрибуцию, LTV, CAC и возможности конверсии на основе подключённых каналов продаж и маркетинга.",
        "ar": "تساعد GeniegoROI فرق التجارة على فهم ROAS ورحلات العملاء والإسناد وLTV وCAC وفرص التحويل من قنوات المبيعات والتسويق المتصلة.",
        "hi": "GeniegoROI कॉमर्स टीमों को जुड़े हुए बिक्री और मार्केटिंग चैनलों के डेटा से ROAS, कस्टमर जर्नी, एट्रिब्यूशन, LTV, CAC और कन्वर्ज़न अवसरों को समझने में मदद करता है।"
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
        "pt": "Rastreamento multi-armazém, gestão LOT/FEFO, fluxos de separação e embalagem e integração de API de rastreio de transportadoras.",
        "ru": "Учёт по нескольким складам, управление LOT/FEFO, процессы сборки и упаковки, интеграция API отслеживания перевозчиков.",
        "ar": "تتبّع المخزون متعدد المستودعات، إدارة LOT/FEFO، سير عمل الانتقاء والتغليف، وتكامل API لتتبّع الشحنات.",
        "hi": "बहु-गोदाम इन्वेंटरी ट्रैकिंग, LOT/FEFO प्रबंधन, पिकिंग-पैकिंग वर्कफ़्लो और कैरियर ट्रैकिंग API इंटीग्रेशन।"
    },
    "f3t": {
        "pt": "Análise de Atribuição Multicanal",
        "ru": "Аналитика мультиканальной атрибуции",
        "ar": "تحليلات الإسناد متعدد القنوات",
        "hi": "मल्टी-चैनल एट्रिब्यूशन एनालिटिक्स"
    },
    "f3d": {
        "pt": "Pontuação de contribuição em 8 dimensões, campanhas de influenciadores e fluxos de cupom. Recomendações de orçamento baseadas em dados com revisão e aprovação humana.",
        "ru": "8-мерная оценка вклада по каналам, кампании с инфлюенсерами и купоны. Рекомендации бюджета на основе данных с проверкой и подтверждением человеком.",
        "ar": "تقييم إسهام ثماني الأبعاد عبر القنوات وحملات المؤثرين والكوبونات. توصيات ميزانية قائمة على البيانات مع مراجعة وموافقة بشرية.",
        "hi": "8-आयामी योगदान स्कोरिंग, इन्फ्लुएंसर अभियान और कूपन प्रवाह। डेटा-आधारित बजट सिफ़ारिशें, मानव समीक्षा और अनुमोदन के साथ।"
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
        "pt": "Suporte de Automação de Marketing",
        "ru": "Поддержка автоматизации маркетинга",
        "ar": "دعم أتمتة التسويق",
        "hi": "मार्केटिंग ऑटोमेशन सपोर्ट"
    },
    "f7d": {
        "pt": "Fluxos de automação baseados em regras com recomendações assistidas por análise. Defina limites, revise sugestões, aprove ou substitua com um clique.",
        "ru": "Автоматизация на основе правил с рекомендациями на базе аналитики. Задавайте пороги, проверяйте предложения, подтверждайте или переопределяйте одним кликом.",
        "ar": "مسارات أتمتة قائمة على القواعد مع توصيات مدعومة بالتحليلات. حدّد العتبات، وراجع الاقتراحات، ووافق أو تجاوز بنقرة واحدة.",
        "hi": "नियम-आधारित ऑटोमेशन वर्कफ़्लो, एनालिटिक्स-सहायित सिफ़ारिशों के साथ। थ्रेशोल्ड सेट करें, सुझाव देखें, एक क्लिक में अनुमोदित या ओवरराइड करें।"
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
        "pt": "O Geniego-ROI aumentou nosso ROAS em 340% em 8 canais. Só a análise de otimização de orçamento economizou 20 horas de trabalho manual por semana.",
        "ru": "Geniego-ROI повысил наш ROAS на 340% по 8 каналам. Одна только аналитика оптимизации бюджета сэкономила 20 часов ручной работы в неделю.",
        "ar": "ساعدنا Geniego-ROI على رفع ROAS بنسبة 340% عبر 8 قنوات. وفّر تحليل تحسين الميزانية وحده 20 ساعة عمل يدوي أسبوعيًا.",
        "hi": "Geniego-ROI ने 8 चैनलों पर हमारा ROAS 340% बढ़ाया। अकेले बजट ऑप्टिमाइज़ेशन एनालिटिक्स ने प्रति सप्ताह 20 घंटे का मैन्युअल काम बचाया।"
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
  "navData": {
    "ko": "데이터 분석",
    "en": "Analytics"
  },
  "daBadge": {
    "ko": "데이터 분석 엔진",
    "en": "Data Analytics Engine"
  },
  "daTitle": {
    "ko": "당신의 데이터를 신뢰로 바꾸는 방법",
    "en": "How we turn your data into trust"
  },
  "daDesc": {
    "ko": "GeniegoROI는 흩어진 모든 커머스 데이터를 빠짐없이 수집하고, 검증된 분석 방법론으로 가공해, 원천까지 추적 가능한 신뢰할 수 있는 의사결정 자료로 제공합니다. 그리고 그 분석을 근거로 사람 승인 하에 마케팅 실행을 지원합니다.",
    "en": "GeniegoROI collects every piece of your scattered commerce data, processes it with proven analytics methodologies, and delivers trustworthy, fully traceable decision-making insights — then supports acting on that analysis with human-approved marketing execution."
  },
  "da1t": { "ko": "수집", "en": "Collect" },
  "da1d": {
    "ko": "30개 이상 채널의 광고·매출·주문·재고·정산·고객 여정 데이터를 실시간으로 빠짐없이 수집합니다. OAuth 보안 연동과 자동 동기화로 누락 없는 정합성을 보장합니다.",
    "en": "Collect ad, sales, order, inventory, settlement and customer-journey data from 30+ channels in real time — with secure OAuth connections and auto-sync ensuring nothing is missed."
  },
  "da2t": { "ko": "분석", "en": "Analyze" },
  "da2d": {
    "ko": "샤플리·마르코프·MMM 6모델 멀티터치 어트리뷰션, 코호트 리텐션, 수요예측, 채널 시너지까지 — 추정이 아닌 실데이터 기반의 검증된 방법론으로 분석합니다.",
    "en": "Analyze with proven, data-driven methods — 6-model multi-touch attribution (Shapley, Markov, MMM), cohort retention, demand forecasting and channel synergy — never estimates."
  },
  "da3t": { "ko": "신뢰", "en": "Trust" },
  "da3d": {
    "ko": "모든 지표는 원천 데이터까지 추적할 수 있고, 산식이 투명하게 공개됩니다. 테넌트 격리와 은행급 암호화, PII 미저장 원칙으로 데이터를 안전하게 지킵니다.",
    "en": "Every metric drills down to its source data with transparent formulas. Tenant isolation, bank-grade encryption and a no-PII-storage policy keep your data safe."
  },
  "da4t": { "ko": "실행", "en": "Act" },
  "da4d": {
    "ko": "분석 결과를 바탕으로 데이터 기반 예산 추천을 받고, 사람 승인 하에 캠페인을 집행합니다. 월 예산 한도 내 안전한 페이싱으로 분석에서 실행까지 끊김이 없습니다.",
    "en": "Act on the analysis: get analytics-assisted budget recommendations and run campaigns with human approval — safely paced within your monthly budget cap, from insight to execution without a gap."
  },
  "daDataTitle": {
    "ko": "수집하고 분석하는 데이터",
    "en": "The data we collect and analyze"
  },
  "daCat1": { "ko": "광고 성과", "en": "Ad Performance" },
  "daCatD1": {
    "ko": "노출·클릭·전환·광고비·ROAS·CPA를 매체별로",
    "en": "Impressions, clicks, conversions, spend, ROAS, CPA by channel"
  },
  "daCat2": { "ko": "매출·주문", "en": "Sales & Orders" },
  "daCatD2": {
    "ko": "채널별 주문·매출·반품·쿠폰을 단일 원장으로",
    "en": "Orders, revenue, returns and coupons unified into one ledger"
  },
  "daCat3": { "ko": "재고·SKU", "en": "Inventory & SKU" },
  "daCatD3": {
    "ko": "실시간 재고·SKU 회전·수요예측·안전재고",
    "en": "Real-time stock, SKU turnover, demand forecasts, safety stock"
  },
  "daCat4": { "ko": "정산·수수료", "en": "Settlement & Fees" },
  "daCatD4": {
    "ko": "플랫폼 수수료·정산율·순수익을 자동 대사",
    "en": "Platform fees, settlement rates and net payout auto-reconciled"
  },
  "daCat5": { "ko": "고객 여정", "en": "Customer Journey" },
  "daCatD5": {
    "ko": "유입 채널·터치포인트·전환 경로 (PII 미저장)",
    "en": "Source channels, touchpoints and conversion paths (no PII stored)"
  },
  "daTr1": { "ko": "실데이터 기반 · 합성 데이터 0", "en": "Real data only — zero synthetic" },
  "daTr2": { "ko": "원천 데이터까지 추적 가능", "en": "Traceable to source data" },
  "daTr3": { "ko": "은행급 암호화 · 테넌트 격리", "en": "Bank-grade encryption & tenant isolation" },
  "daTr4": { "ko": "PII 미저장 · 집계 전용", "en": "No PII stored — aggregate only" },
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
    "ko": "채널마다 다른 광고 대시보드, 엑셀로 맞추는 정산, 흩어진 재고와 주문 — 커머스 운영의 복잡함이 성장의 발목을 잡습니다. GeniegoROI는 30개 이상 채널의 데이터를 실시간으로 통합해 광고·판매·재고·배송·정산의 성과를 한눈에 분석합니다. 운영자는 의사결정에만 집중하면 됩니다.",
    "en": "Different ad dashboards per channel, settlements stitched together in spreadsheets, scattered inventory and orders — operational complexity caps your growth. GeniegoROI unifies 30+ channels in real time so you can analyze performance across ads, sales, inventory, shipping and settlement in one place. You focus only on decisions."
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
    // [283차 정직성] '합배송 관리' → 코드 부재. 실제 구현분(ChannelSync 주문 상태/배송정보 표준화)으로 정정.
    "ko": "통합 카탈로그·재고 동기화, 주문·배송 상태 표준화",
    "en": "Unified catalog & inventory sync, standardized order & delivery status"
  },
  "m1b3": {
    "ko": "OAuth 자격증명 관리·자동 동기화",
    "en": "OAuth credential management & auto-sync"
  },
  "m2t": {
    "ko": "멀티채널 어트리뷰션 분석",
    "en": "Multi-Channel Attribution Analytics"
  },
  "m2d": {
    "ko": "8차원 광고 기여도 분석과 데이터 기반 예산 추천으로 ROAS를 극대화합니다.",
    "en": "Maximize ROAS with 8-dimensional attribution and analytics-assisted budget recommendations."
  },
  "m2b1": {
    "ko": "멀티터치 어트리뷰션·채널 KPI·경쟁사 분석",
    "en": "Multi-touch attribution, channel KPIs, competitor analysis"
  },
  "m2b2": {
    "ko": "크리에이티브 성과 분석·콘텐츠 캘린더",
    "en": "Creative performance analytics & content calendar"
  },
  "m2b3": {
    "ko": "데이터 기반 예산 배분 + 사람 승인 워크플로우",
    "en": "Data-driven budget allocation with human-in-the-loop approval"
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
    // [283차 정직성] '국제 특송 상업 송장 자동 생성' → 코드 부재(commercial_invoice → backend 0건).
    //   실제 구현분(Wms.php: wms_barcodes·wms_bins/bin_stock·wms_waves/wave_items)으로 교체.
    "ko": "바코드·빈 로케이션 관리, 웨이브 피킹",
    "en": "Barcode & bin location management, wave picking"
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
    // [283차 정직성] '세금계산서 발행·ERP 연동'은 코드 부재(부재증명: tax_invoice|erp → backend 0건).
    //   실제 구현분(Pnl::vat 부가세 자동 산출 · 정산 대사 · DataExport 회계 데이터 내보내기)으로 정정.
    "ko": "부가세 자동 산출·정산 대사·회계 데이터 내보내기",
    "en": "Automated VAT calculation, settlement reconciliation, accounting data export"
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
    "ko": "RFM·VIP·예측 세그먼트, 고객 여정 빌더",
    "en": "RFM/VIP/predictive segments, customer journey builder"
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
    "ko": "마케팅 자동화 지원",
    "en": "Marketing Automation Support"
  },
  "m6d": {
    "ko": "규칙 기반 워크플로우와 분석 기반 추천으로 운영을 효율화합니다.",
    "en": "Streamline operations with rule-based workflows and analytics-assisted recommendations."
  },
  "m6b1": {
    "ko": "룰 엔진·알림 정책·액션 프리셋",
    "en": "Rule engine, alert policies, action presets"
  },
  "m6b2": {
    "ko": "임계값 설정·분석 기반 제안·원클릭 승인",
    "en": "Set thresholds, get analytics-assisted suggestions, one-click approval"
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
    "ko": "2. 성과 분석",
    "en": "2. Analyze performance"
  },
  "how2d": {
    "ko": "광고·매출·재고·정산 데이터를 분석해 기회와 위험을 한눈에 찾아냅니다.",
    "en": "Analyze ads, sales, inventory and settlement data to surface opportunities and risks at a glance."
  },
  "how3t": {
    "ko": "3. 최적화·성장",
    "en": "3. Optimize & grow"
  },
  "how3d": {
    "ko": "분석 기반 추천을 원클릭으로 승인해 실행하세요. 성장에만 집중하면 됩니다.",
    "en": "Approve analytics-assisted recommendations with one click and execute. Focus on growth."
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
    "ko": "카드 없이 무료 데모로 시작하고, 준비되면 계정수·기간에 맞는 요금제로 업그레이드하세요. 30일 전액 환불 보장. (표시 요금은 모두 VAT 별도이며, 결제 시 부가세 10%가 별도 부과됩니다.)",
    "en": "Start free with no card, upgrade when ready by seats and cycle. 30-day full money-back guarantee. (All listed prices exclude VAT; 10% VAT is added at checkout.)"
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
    "ko": "모든 채널의 마케팅 성과를 측정·기여도 분석·최적화하는 글로벌 애널리틱스 SaaS",
    "en": "The global analytics SaaS to measure, attribute, and optimize marketing performance across every channel"
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
 "navData": {
  "ja": "データ分析", "zh": "数据分析", "zh-TW": "數據分析", "vi": "Phân tích", "th": "วิเคราะห์ข้อมูล",
  "id": "Analitik", "de": "Analytik", "fr": "Analytique", "es": "Analítica", "pt": "Análise",
  "ru": "Аналитика", "ar": "التحليلات", "hi": "एनालिटिक्स"
 },
 "daBadge": {
  "ja": "データ分析エンジン", "zh": "数据分析引擎", "zh-TW": "數據分析引擎", "vi": "Công cụ phân tích dữ liệu",
  "th": "เครื่องมือวิเคราะห์ข้อมูล", "id": "Mesin Analitik Data", "de": "Datenanalyse-Engine",
  "fr": "Moteur d'analyse de données", "es": "Motor de análisis de datos", "pt": "Motor de análise de dados",
  "ru": "Движок аналитики данных", "ar": "محرك تحليل البيانات", "hi": "डेटा एनालिटिक्स इंजन"
 },
 "daTitle": {
  "ja": "あなたのデータを信頼に変える方法", "zh": "我们如何将您的数据转化为信任", "zh-TW": "我們如何將您的數據轉化為信任",
  "vi": "Cách chúng tôi biến dữ liệu của bạn thành niềm tin", "th": "วิธีที่เราเปลี่ยนข้อมูลของคุณให้เป็นความเชื่อมั่น",
  "id": "Cara kami mengubah data Anda menjadi kepercayaan", "de": "Wie wir Ihre Daten in Vertrauen verwandeln",
  "fr": "Comment nous transformons vos données en confiance", "es": "Cómo convertimos sus datos en confianza",
  "pt": "Como transformamos os seus dados em confiança", "ru": "Как мы превращаем ваши данные в доверие",
  "ar": "كيف نحوّل بياناتك إلى ثقة", "hi": "हम आपके डेटा को भरोसे में कैसे बदलते हैं"
 },
 "daDesc": {
  "ja": "GeniegoROIは、散在するすべてのコマースデータを漏れなく収集し、実証済みの分析手法で加工して、源泉まで追跡可能な信頼できる意思決定資料として提供します。そしてその分析を根拠に、人の承認のもとでマーケティング実行を支援します。",
  "zh": "GeniegoROI 完整收集您分散的所有电商数据，以经过验证的分析方法进行处理，提供可追溯至源头、值得信赖的决策依据，并在人工审批下支持据此执行营销。",
  "zh-TW": "GeniegoROI 完整收集您分散的所有電商數據，以經過驗證的分析方法進行處理，提供可追溯至源頭、值得信賴的決策依據，並在人工審批下支持據此執行行銷。",
  "vi": "GeniegoROI thu thập đầy đủ mọi dữ liệu thương mại phân tán của bạn, xử lý bằng các phương pháp phân tích đã được kiểm chứng và cung cấp thông tin ra quyết định đáng tin cậy, truy xuất được đến nguồn gốc — rồi hỗ trợ thực thi marketing dựa trên phân tích đó với sự phê duyệt của con người.",
  "th": "GeniegoROI รวบรวมข้อมูลคอมเมิร์ซที่กระจัดกระจายของคุณอย่างครบถ้วน ประมวลผลด้วยวิธีวิเคราะห์ที่ผ่านการพิสูจน์ และส่งมอบข้อมูลการตัดสินใจที่เชื่อถือได้และตรวจสอบย้อนกลับถึงต้นทางได้ จากนั้นสนับสนุนการดำเนินการตลาดบนพื้นฐานการวิเคราะห์นั้นภายใต้การอนุมัติของมนุษย์",
  "id": "GeniegoROI mengumpulkan seluruh data commerce Anda yang tersebar secara lengkap, mengolahnya dengan metodologi analitik teruji, dan menyajikan wawasan keputusan yang tepercaya serta dapat dilacak hingga ke sumbernya — lalu mendukung eksekusi pemasaran berdasarkan analisis tersebut dengan persetujuan manusia.",
  "de": "GeniegoROI erfasst lückenlos all Ihre verstreuten Commerce-Daten, verarbeitet sie mit bewährten Analysemethoden und liefert vertrauenswürdige, bis zur Quelle nachverfolgbare Entscheidungsgrundlagen — und unterstützt die Marketingumsetzung auf Basis dieser Analyse mit menschlicher Freigabe.",
  "fr": "GeniegoROI collecte l'intégralité de vos données commerce dispersées, les traite avec des méthodes d'analyse éprouvées et fournit des informations de décision fiables et traçables jusqu'à la source — puis accompagne l'exécution de votre marketing sur la base de cette analyse, avec validation humaine.",
  "es": "GeniegoROI recopila por completo todos sus datos de comercio dispersos, los procesa con metodologías de análisis probadas y ofrece información de decisión fiable y rastreable hasta su origen, y luego apoya la ejecución de su marketing a partir de ese análisis con aprobación humana.",
  "pt": "A GeniegoROI recolhe integralmente todos os seus dados de comércio dispersos, processa-os com metodologias de análise comprovadas e fornece informações de decisão fiáveis e rastreáveis até à origem — e depois apoia a execução do seu marketing com base nessa análise, com aprovação humana.",
  "ru": "GeniegoROI полностью собирает все ваши разрозненные коммерческие данные, обрабатывает их проверенными методами аналитики и предоставляет надёжные, прослеживаемые до источника данные для принятия решений — а затем поддерживает выполнение маркетинга на основе этого анализа с одобрением человеком.",
  "ar": "تجمع GeniegoROI كل بيانات التجارة المتناثرة لديك دون أي نقص، وتعالجها بمنهجيات تحليل مثبتة، وتقدّم رؤى قرار موثوقة يمكن تتبّعها حتى المصدر — ثم تدعم تنفيذ تسويقك بناءً على ذلك التحليل بموافقة بشرية.",
  "hi": "GeniegoROI आपके बिखरे हुए सभी कॉमर्स डेटा को पूरी तरह एकत्र करता है, उसे सिद्ध विश्लेषण पद्धतियों से संसाधित करता है, और स्रोत तक पता लगाने योग्य भरोसेमंद निर्णय-जानकारी प्रदान करता है — फिर उसी विश्लेषण के आधार पर मानव अनुमोदन के साथ मार्केटिंग निष्पादन में सहायता करता है।"
 },
 "da1t": { "ja": "収集", "zh": "收集", "zh-TW": "收集", "vi": "Thu thập", "th": "รวบรวม", "id": "Kumpulkan", "de": "Erfassen", "fr": "Collecter", "es": "Recopilar", "pt": "Recolher", "ru": "Сбор", "ar": "الجمع", "hi": "संग्रह" },
 "da1d": {
  "ja": "30以上のチャネルの広告・売上・注文・在庫・精算・顧客ジャーニーデータをリアルタイムで漏れなく収集します。OAuthによる安全な連携と自動同期で、抜け漏れのない整合性を保証します。",
  "zh": "实时完整收集 30+ 渠道的广告、销售、订单、库存、结算与客户旅程数据。通过 OAuth 安全连接与自动同步，确保数据零遗漏、完全一致。",
  "zh-TW": "即時完整收集 30+ 渠道的廣告、銷售、訂單、庫存、結算與客戶旅程數據。透過 OAuth 安全連接與自動同步，確保數據零遺漏、完全一致。",
  "vi": "Thu thập theo thời gian thực và đầy đủ dữ liệu quảng cáo, doanh số, đơn hàng, tồn kho, đối soát và hành trình khách hàng từ hơn 30 kênh. Kết nối OAuth an toàn và đồng bộ tự động đảm bảo tính nhất quán không thiếu sót.",
  "th": "รวบรวมข้อมูลโฆษณา ยอดขาย คำสั่งซื้อ สต็อก การกระทบยอด และเส้นทางลูกค้าจากกว่า 30 ช่องทางแบบเรียลไทม์อย่างครบถ้วน ด้วยการเชื่อมต่อ OAuth ที่ปลอดภัยและการซิงค์อัตโนมัติเพื่อความถูกต้องครบถ้วน",
  "id": "Kumpulkan data iklan, penjualan, pesanan, inventaris, rekonsiliasi, dan perjalanan pelanggan dari 30+ kanal secara real-time dan lengkap. Koneksi OAuth yang aman serta sinkronisasi otomatis menjamin konsistensi tanpa ada yang terlewat.",
  "de": "Erfassen Sie Werbe-, Umsatz-, Bestell-, Bestands-, Abrechnungs- und Customer-Journey-Daten aus über 30 Kanälen lückenlos in Echtzeit. Sichere OAuth-Verbindungen und Auto-Sync gewährleisten konsistente Daten ohne Lücken.",
  "fr": "Collectez en temps réel et sans omission les données publicitaires, de ventes, de commandes, de stock, de règlement et de parcours client de plus de 30 canaux. Les connexions OAuth sécurisées et la synchronisation automatique garantissent une cohérence sans faille.",
  "es": "Recopile en tiempo real y sin omisiones los datos de publicidad, ventas, pedidos, inventario, liquidación y recorrido del cliente de más de 30 canales. Las conexiones OAuth seguras y la sincronización automática garantizan una coherencia completa.",
  "pt": "Recolha em tempo real e sem falhas os dados de publicidade, vendas, encomendas, stock, liquidação e jornada do cliente de mais de 30 canais. Ligações OAuth seguras e sincronização automática garantem consistência total.",
  "ru": "Собирайте данные о рекламе, продажах, заказах, запасах, взаиморасчётах и пути клиента из более чем 30 каналов в реальном времени и без пропусков. Безопасные OAuth-подключения и автосинхронизация обеспечивают полную целостность.",
  "ar": "اجمع بيانات الإعلانات والمبيعات والطلبات والمخزون والتسويات ورحلة العميل من أكثر من 30 قناة في الوقت الفعلي ودون نقص. توفّر اتصالات OAuth الآمنة والمزامنة التلقائية اتساقًا كاملًا بلا ثغرات.",
  "hi": "30+ चैनलों के विज्ञापन, बिक्री, ऑर्डर, इन्वेंटरी, सेटलमेंट और ग्राहक-यात्रा डेटा को रीयल-टाइम में पूरी तरह एकत्र करें। सुरक्षित OAuth कनेक्शन और ऑटो-सिंक बिना किसी चूक के संगति सुनिश्चित करते हैं।"
 },
 "da2t": { "ja": "分析", "zh": "分析", "zh-TW": "分析", "vi": "Phân tích", "th": "วิเคราะห์", "id": "Analisis", "de": "Analysieren", "fr": "Analyser", "es": "Analizar", "pt": "Analisar", "ru": "Анализ", "ar": "التحليل", "hi": "विश्लेषण" },
 "da2d": {
  "ja": "シャープレイ・マルコフ・MMMの6モデルマルチタッチアトリビューション、コホートリテンション、需要予測、チャネルシナジーまで——推定ではなく実データに基づく実証済みの手法で分析します。",
  "zh": "从 Shapley、马尔可夫、MMM 等 6 模型多触点归因，到同期群留存、需求预测与渠道协同——全部基于真实数据、而非估算的成熟方法进行分析。",
  "zh-TW": "從 Shapley、馬可夫、MMM 等 6 模型多觸點歸因，到同期群留存、需求預測與渠道協同——全部基於真實數據、而非估算的成熟方法進行分析。",
  "vi": "Phân tích bằng các phương pháp đã được kiểm chứng và dựa trên dữ liệu thực — quy kết đa điểm chạm 6 mô hình (Shapley, Markov, MMM), giữ chân theo cohort, dự báo nhu cầu và cộng hưởng kênh — không phải ước lượng.",
  "th": "วิเคราะห์ด้วยวิธีที่พิสูจน์แล้วและอิงข้อมูลจริง ตั้งแต่การระบุเครดิตหลายจุดสัมผัส 6 โมเดล (Shapley, Markov, MMM) การรักษาลูกค้าแบบ cohort การพยากรณ์อุปสงค์ ไปจนถึงการเสริมพลังระหว่างช่องทาง ไม่ใช่การประมาณการ",
  "id": "Analisis dengan metode teruji berbasis data nyata — atribusi multi-sentuh 6 model (Shapley, Markov, MMM), retensi cohort, prakiraan permintaan, hingga sinergi kanal — bukan perkiraan.",
  "de": "Analysieren Sie mit bewährten, datenbasierten Methoden — 6-Modell-Multi-Touch-Attribution (Shapley, Markov, MMM), Kohorten-Retention, Bedarfsprognose und Kanal-Synergie — niemals Schätzungen.",
  "fr": "Analysez avec des méthodes éprouvées et basées sur des données réelles — attribution multi-touch à 6 modèles (Shapley, Markov, MMM), rétention par cohorte, prévision de la demande et synergie des canaux — jamais des estimations.",
  "es": "Analice con métodos probados y basados en datos reales: atribución multitáctil de 6 modelos (Shapley, Markov, MMM), retención por cohortes, previsión de demanda y sinergia de canales, nunca estimaciones.",
  "pt": "Analise com métodos comprovados e baseados em dados reais — atribuição multitoque de 6 modelos (Shapley, Markov, MMM), retenção por cohort, previsão de procura e sinergia de canais — nunca estimativas.",
  "ru": "Анализируйте проверенными методами на реальных данных — мультитач-атрибуция из 6 моделей (Shapley, Марков, MMM), удержание по когортам, прогноз спроса и синергия каналов — никаких приблизительных оценок.",
  "ar": "حلّل بأساليب مثبتة قائمة على بيانات حقيقية — إسناد متعدد اللمسات بستة نماذج (شابلي، ماركوف، MMM)، والاحتفاظ حسب المجموعات، والتنبؤ بالطلب، وتآزر القنوات — وليس مجرد تقديرات.",
  "hi": "सिद्ध, वास्तविक-डेटा आधारित विधियों से विश्लेषण करें — 6-मॉडल मल्टी-टच एट्रिब्यूशन (Shapley, Markov, MMM), कोहोर्ट रिटेंशन, मांग पूर्वानुमान और चैनल सिनर्जी — अनुमान नहीं।"
 },
 "da3t": { "ja": "信頼", "zh": "信任", "zh-TW": "信任", "vi": "Tin cậy", "th": "ความเชื่อมั่น", "id": "Kepercayaan", "de": "Vertrauen", "fr": "Confiance", "es": "Confianza", "pt": "Confiança", "ru": "Доверие", "ar": "الثقة", "hi": "भरोसा" },
 "da3d": {
  "ja": "すべての指標は源泉データまで追跡でき、計算式も透明に公開されます。テナント分離と銀行級の暗号化、PII非保存の原則で、データを安全に守ります。",
  "zh": "所有指标均可追溯至源头数据，计算公式透明公开。通过租户隔离、银行级加密与不存储 PII 的原则，安全守护您的数据。",
  "zh-TW": "所有指標均可追溯至源頭數據，計算公式透明公開。透過租戶隔離、銀行級加密與不儲存 PII 的原則，安全守護您的數據。",
  "vi": "Mọi chỉ số đều truy xuất được đến dữ liệu nguồn với công thức minh bạch. Cách ly tenant, mã hóa cấp ngân hàng và nguyên tắc không lưu PII bảo vệ dữ liệu của bạn an toàn.",
  "th": "ทุกตัวชี้วัดสามารถตรวจสอบย้อนกลับถึงข้อมูลต้นทางได้พร้อมสูตรคำนวณที่โปร่งใส ด้วยการแยก tenant การเข้ารหัสระดับธนาคาร และหลักการไม่จัดเก็บ PII เพื่อปกป้องข้อมูลของคุณอย่างปลอดภัย",
  "id": "Setiap metrik dapat ditelusuri hingga data sumbernya dengan rumus yang transparan. Isolasi tenant, enkripsi setara perbankan, dan prinsip tanpa penyimpanan PII menjaga data Anda tetap aman.",
  "de": "Jede Kennzahl lässt sich bis zu den Quelldaten zurückverfolgen, mit transparenten Formeln. Mandantentrennung, Verschlüsselung auf Bankniveau und der Grundsatz, keine PII zu speichern, schützen Ihre Daten.",
  "fr": "Chaque indicateur est traçable jusqu'aux données sources, avec des formules transparentes. L'isolation des locataires, le chiffrement de niveau bancaire et le principe de non-stockage des PII protègent vos données.",
  "es": "Cada métrica es rastreable hasta sus datos de origen, con fórmulas transparentes. El aislamiento de inquilinos, el cifrado de nivel bancario y el principio de no almacenar PII protegen sus datos.",
  "pt": "Cada métrica é rastreável até aos dados de origem, com fórmulas transparentes. O isolamento de inquilinos, a encriptação de nível bancário e o princípio de não armazenar PII protegem os seus dados.",
  "ru": "Каждый показатель прослеживается до исходных данных с прозрачными формулами. Изоляция арендаторов, шифрование банковского уровня и принцип отказа от хранения PII надёжно защищают ваши данные.",
  "ar": "كل مقياس يمكن تتبّعه حتى بيانات المصدر مع صيغ حسابية شفافة. عزل المستأجرين والتشفير بمستوى البنوك ومبدأ عدم تخزين البيانات الشخصية يحافظون على أمان بياناتك.",
  "hi": "हर मीट्रिक पारदर्शी सूत्रों के साथ अपने स्रोत डेटा तक पता लगाने योग्य है। टेनेंट आइसोलेशन, बैंक-स्तरीय एन्क्रिप्शन और PII न संग्रहीत करने का सिद्धांत आपके डेटा को सुरक्षित रखते हैं।"
 },
 "da4t": { "ja": "実行", "zh": "执行", "zh-TW": "執行", "vi": "Thực thi", "th": "ดำเนินการ", "id": "Eksekusi", "de": "Handeln", "fr": "Agir", "es": "Actuar", "pt": "Agir", "ru": "Действие", "ar": "التنفيذ", "hi": "क्रियान्वयन" },
 "da4d": {
  "ja": "分析結果に基づくデータドリブンな予算提案を受け取り、人の承認のもとで施策を実行します。月予算の上限内で安全にペース配分し、分析から実行までシームレスにつなぎます。",
  "zh": "获取基于分析的数据驱动预算建议，并在人工审批下执行投放。在月度预算上限内安全配速，让分析到执行无缝衔接。",
  "zh-TW": "取得基於分析的數據驅動預算建議，並在人工審批下執行投放。在月度預算上限內安全配速，讓分析到執行無縫銜接。",
  "vi": "Nhận đề xuất ngân sách dựa trên dữ liệu từ kết quả phân tích và thực thi chiến dịch khi có sự phê duyệt của con người. Điều phối an toàn trong hạn mức ngân sách hằng tháng, liền mạch từ phân tích đến thực thi.",
  "th": "รับคำแนะนำงบประมาณเชิงข้อมูลจากผลการวิเคราะห์ และดำเนินแคมเปญภายใต้การอนุมัติของมนุษย์ จัดสรรอย่างปลอดภัยภายในเพดานงบรายเดือน เชื่อมจากการวิเคราะห์สู่การดำเนินการอย่างไร้รอยต่อ",
  "id": "Dapatkan rekomendasi anggaran berbasis data dari hasil analisis dan jalankan kampanye dengan persetujuan manusia. Pacing aman dalam batas anggaran bulanan, mulus dari analisis hingga eksekusi.",
  "de": "Erhalten Sie datenbasierte Budgetempfehlungen aus der Analyse und führen Sie Kampagnen nach menschlicher Freigabe aus — sicher getaktet innerhalb Ihres Monatsbudgets, nahtlos von der Analyse bis zur Umsetzung.",
  "fr": "Recevez des recommandations budgétaires basées sur les données issues de l'analyse et exécutez les campagnes après validation humaine — avec un rythme sécurisé dans la limite de votre budget mensuel, de l'analyse à l'exécution sans rupture.",
  "es": "Reciba recomendaciones de presupuesto basadas en datos a partir del análisis y ejecute campañas con aprobación humana, con un ritmo seguro dentro de su límite de presupuesto mensual, del análisis a la ejecución sin interrupciones.",
  "pt": "Receba recomendações de orçamento baseadas em dados a partir da análise e execute campanhas com aprovação humana — com ritmo seguro dentro do limite do orçamento mensal, da análise à execução sem interrupções.",
  "ru": "Получайте рекомендации бюджета на основе данных из анализа и запускайте кампании после одобрения человеком — с безопасным распределением в пределах месячного лимита, без разрывов от анализа до исполнения.",
  "ar": "احصل على توصيات ميزانية قائمة على البيانات من نتائج التحليل ونفّذ الحملات بموافقة بشرية — بوتيرة آمنة ضمن سقف ميزانيتك الشهرية، ومن التحليل إلى التنفيذ بلا انقطاع.",
  "hi": "विश्लेषण के आधार पर डेटा-आधारित बजट सिफ़ारिशें प्राप्त करें और मानव अनुमोदन के साथ अभियान चलाएँ — मासिक बजट सीमा के भीतर सुरक्षित पेसिंग के साथ, विश्लेषण से क्रियान्वयन तक निर्बाध।"
 },
 "daDataTitle": {
  "ja": "収集・分析するデータ", "zh": "我们收集与分析的数据", "zh-TW": "我們收集與分析的數據",
  "vi": "Dữ liệu chúng tôi thu thập và phân tích", "th": "ข้อมูลที่เรารวบรวมและวิเคราะห์",
  "id": "Data yang kami kumpulkan dan analisis", "de": "Daten, die wir erfassen und analysieren",
  "fr": "Les données que nous collectons et analysons", "es": "Los datos que recopilamos y analizamos",
  "pt": "Os dados que recolhemos e analisamos", "ru": "Данные, которые мы собираем и анализируем",
  "ar": "البيانات التي نجمعها ونحلّلها", "hi": "जो डेटा हम एकत्र और विश्लेषण करते हैं"
 },
 "daCat1": { "ja": "広告パフォーマンス", "zh": "广告效果", "zh-TW": "廣告成效", "vi": "Hiệu suất quảng cáo", "th": "ประสิทธิภาพโฆษณา", "id": "Performa Iklan", "de": "Werbeleistung", "fr": "Performance publicitaire", "es": "Rendimiento publicitario", "pt": "Desempenho de anúncios", "ru": "Эффективность рекламы", "ar": "أداء الإعلانات", "hi": "विज्ञापन प्रदर्शन" },
 "daCatD1": {
  "ja": "媒体別の表示・クリック・コンバージョン・広告費・ROAS・CPA", "zh": "按媒体统计的展示、点击、转化、广告费、ROAS、CPA", "zh-TW": "依媒體統計的曝光、點擊、轉換、廣告費、ROAS、CPA",
  "vi": "Hiển thị, nhấp, chuyển đổi, chi phí, ROAS, CPA theo từng kênh", "th": "การแสดงผล คลิก คอนเวอร์ชัน ค่าโฆษณา ROAS CPA แยกตามสื่อ",
  "id": "Tayangan, klik, konversi, biaya, ROAS, CPA per media", "de": "Impressionen, Klicks, Conversions, Kosten, ROAS, CPA je Kanal",
  "fr": "Impressions, clics, conversions, coûts, ROAS, CPA par média", "es": "Impresiones, clics, conversiones, coste, ROAS, CPA por medio",
  "pt": "Impressões, cliques, conversões, custo, ROAS, CPA por canal", "ru": "Показы, клики, конверсии, расходы, ROAS, CPA по площадкам",
  "ar": "مرّات الظهور والنقرات والتحويلات والإنفاق وROAS وCPA حسب الوسيط", "hi": "माध्यम-वार इम्प्रेशन, क्लिक, कन्वर्ज़न, खर्च, ROAS, CPA"
 },
 "daCat2": { "ja": "売上・注文", "zh": "销售与订单", "zh-TW": "銷售與訂單", "vi": "Doanh số & Đơn hàng", "th": "ยอดขายและคำสั่งซื้อ", "id": "Penjualan & Pesanan", "de": "Umsatz & Bestellungen", "fr": "Ventes et commandes", "es": "Ventas y pedidos", "pt": "Vendas e encomendas", "ru": "Продажи и заказы", "ar": "المبيعات والطلبات", "hi": "बिक्री और ऑर्डर" },
 "daCatD2": {
  "ja": "チャネル別の注文・売上・返品・クーポンを単一台帳に", "zh": "将各渠道的订单、销售、退货、优惠券汇入单一账本", "zh-TW": "將各渠道的訂單、銷售、退貨、優惠券彙入單一帳本",
  "vi": "Đơn hàng, doanh số, trả hàng, phiếu giảm giá theo kênh trong một sổ cái duy nhất", "th": "รวมคำสั่งซื้อ ยอดขาย การคืนสินค้า คูปอง ของแต่ละช่องทางไว้ในบัญชีเดียว",
  "id": "Pesanan, penjualan, retur, kupon per kanal dalam satu buku besar", "de": "Bestellungen, Umsatz, Retouren und Gutscheine je Kanal in einem Hauptbuch",
  "fr": "Commandes, ventes, retours et coupons par canal dans un registre unique", "es": "Pedidos, ventas, devoluciones y cupones por canal en un único libro mayor",
  "pt": "Encomendas, vendas, devoluções e cupões por canal num único livro", "ru": "Заказы, продажи, возвраты и купоны по каналам в едином реестре",
  "ar": "الطلبات والمبيعات والمرتجعات والقسائم لكل قناة في دفتر واحد", "hi": "चैनल-वार ऑर्डर, बिक्री, रिटर्न और कूपन एक ही बहीखाते में"
 },
 "daCat3": { "ja": "在庫・SKU", "zh": "库存与 SKU", "zh-TW": "庫存與 SKU", "vi": "Tồn kho & SKU", "th": "สต็อกและ SKU", "id": "Inventaris & SKU", "de": "Bestand & SKU", "fr": "Stock et SKU", "es": "Inventario y SKU", "pt": "Stock e SKU", "ru": "Запасы и SKU", "ar": "المخزون وSKU", "hi": "इन्वेंटरी और SKU" },
 "daCatD3": {
  "ja": "リアルタイム在庫・SKU回転・需要予測・安全在庫", "zh": "实时库存、SKU 周转、需求预测、安全库存", "zh-TW": "即時庫存、SKU 週轉、需求預測、安全庫存",
  "vi": "Tồn kho thời gian thực, vòng quay SKU, dự báo nhu cầu, tồn kho an toàn", "th": "สต็อกเรียลไทม์ การหมุนเวียน SKU การพยากรณ์อุปสงค์ สต็อกปลอดภัย",
  "id": "Stok real-time, perputaran SKU, prakiraan permintaan, stok pengaman", "de": "Echtzeit-Bestand, SKU-Umschlag, Bedarfsprognose, Sicherheitsbestand",
  "fr": "Stock en temps réel, rotation des SKU, prévision de la demande, stock de sécurité", "es": "Inventario en tiempo real, rotación de SKU, previsión de demanda, stock de seguridad",
  "pt": "Stock em tempo real, rotação de SKU, previsão de procura, stock de segurança", "ru": "Запасы в реальном времени, оборот SKU, прогноз спроса, страховой запас",
  "ar": "مخزون لحظي ودوران SKU وتنبؤ بالطلب ومخزون أمان", "hi": "रीयल-टाइम स्टॉक, SKU टर्नओवर, मांग पूर्वानुमान, सुरक्षा स्टॉक"
 },
 "daCat4": { "ja": "精算・手数料", "zh": "结算与手续费", "zh-TW": "結算與手續費", "vi": "Đối soát & Phí", "th": "การกระทบยอดและค่าธรรมเนียม", "id": "Rekonsiliasi & Biaya", "de": "Abrechnung & Gebühren", "fr": "Règlement et frais", "es": "Liquidación y comisiones", "pt": "Liquidação e taxas", "ru": "Взаиморасчёты и комиссии", "ar": "التسوية والرسوم", "hi": "सेटलमेंट और शुल्क" },
 "daCatD4": {
  "ja": "プラットフォーム手数料・精算率・純利益を自動照合", "zh": "自动对账平台手续费、结算率与净收益", "zh-TW": "自動對帳平台手續費、結算率與淨收益",
  "vi": "Tự động đối soát phí nền tảng, tỷ lệ đối soát và lợi nhuận ròng", "th": "กระทบยอดอัตโนมัติของค่าธรรมเนียมแพลตฟอร์ม อัตราการกระทบยอด และกำไรสุทธิ",
  "id": "Rekonsiliasi otomatis biaya platform, tingkat penyelesaian, dan laba bersih", "de": "Plattformgebühren, Abrechnungsquoten und Nettoertrag automatisch abgeglichen",
  "fr": "Frais de plateforme, taux de règlement et bénéfice net rapprochés automatiquement", "es": "Comisiones de plataforma, tasas de liquidación y beneficio neto conciliados automáticamente",
  "pt": "Taxas de plataforma, taxas de liquidação e lucro líquido reconciliados automaticamente", "ru": "Автосверка комиссий платформ, ставок взаиморасчётов и чистой прибыли",
  "ar": "مطابقة تلقائية لرسوم المنصّات ونسب التسوية وصافي الربح", "hi": "प्लेटफ़ॉर्म शुल्क, सेटलमेंट दर और शुद्ध लाभ का स्वतः मिलान"
 },
 "daCat5": { "ja": "顧客ジャーニー", "zh": "客户旅程", "zh-TW": "客戶旅程", "vi": "Hành trình khách hàng", "th": "เส้นทางลูกค้า", "id": "Perjalanan Pelanggan", "de": "Customer Journey", "fr": "Parcours client", "es": "Recorrido del cliente", "pt": "Jornada do cliente", "ru": "Путь клиента", "ar": "رحلة العميل", "hi": "ग्राहक यात्रा" },
 "daCatD5": {
  "ja": "流入チャネル・タッチポイント・コンバージョン経路（PII非保存）", "zh": "来源渠道、触点、转化路径（不存储 PII）", "zh-TW": "來源渠道、觸點、轉換路徑（不儲存 PII）",
  "vi": "Kênh nguồn, điểm chạm, lộ trình chuyển đổi (không lưu PII)", "th": "ช่องทางที่มา จุดสัมผัส เส้นทางคอนเวอร์ชัน (ไม่จัดเก็บ PII)",
  "id": "Kanal sumber, titik sentuh, jalur konversi (tanpa simpan PII)", "de": "Quellkanäle, Touchpoints, Conversion-Pfade (keine PII-Speicherung)",
  "fr": "Canaux d'acquisition, points de contact, parcours de conversion (sans stockage de PII)", "es": "Canales de origen, puntos de contacto, rutas de conversión (sin almacenar PII)",
  "pt": "Canais de origem, pontos de contacto, percursos de conversão (sem armazenar PII)", "ru": "Каналы привлечения, точки касания, пути конверсии (без хранения PII)",
  "ar": "قنوات المصدر ونقاط التماس ومسارات التحويل (دون تخزين بيانات شخصية)", "hi": "स्रोत चैनल, टचपॉइंट, कन्वर्ज़न पथ (PII संग्रहीत नहीं)"
 },
 "daTr1": {
  "ja": "実データ基盤・合成データ0", "zh": "基于真实数据 · 零合成数据", "zh-TW": "基於真實數據 · 零合成數據",
  "vi": "Chỉ dữ liệu thực · không dữ liệu tổng hợp", "th": "อิงข้อมูลจริง · ไม่มีข้อมูลสังเคราะห์",
  "id": "Berbasis data nyata · nol data sintetis", "de": "Nur echte Daten · keine synthetischen",
  "fr": "Données réelles uniquement · zéro synthétique", "es": "Solo datos reales · cero sintéticos",
  "pt": "Apenas dados reais · zero sintéticos", "ru": "Только реальные данные · ноль синтетики",
  "ar": "بيانات حقيقية فقط · صفر بيانات اصطناعية", "hi": "केवल वास्तविक डेटा · शून्य सिंथेटिक"
 },
 "daTr2": {
  "ja": "源泉データまで追跡可能", "zh": "可追溯至源头数据", "zh-TW": "可追溯至源頭數據",
  "vi": "Truy xuất đến dữ liệu nguồn", "th": "ตรวจสอบย้อนกลับถึงข้อมูลต้นทาง",
  "id": "Dapat dilacak hingga data sumber", "de": "Bis zu den Quelldaten nachverfolgbar",
  "fr": "Traçable jusqu'aux données sources", "es": "Rastreable hasta los datos de origen",
  "pt": "Rastreável até aos dados de origem", "ru": "Прослеживается до исходных данных",
  "ar": "قابل للتتبّع حتى بيانات المصدر", "hi": "स्रोत डेटा तक पता लगाने योग्य"
 },
 "daTr3": {
  "ja": "銀行級暗号化・テナント分離", "zh": "银行级加密 · 租户隔离", "zh-TW": "銀行級加密 · 租戶隔離",
  "vi": "Mã hóa cấp ngân hàng · cách ly tenant", "th": "เข้ารหัสระดับธนาคาร · แยก tenant",
  "id": "Enkripsi setara bank · isolasi tenant", "de": "Verschlüsselung auf Bankniveau · Mandantentrennung",
  "fr": "Chiffrement de niveau bancaire · isolation des locataires", "es": "Cifrado de nivel bancario · aislamiento de inquilinos",
  "pt": "Encriptação de nível bancário · isolamento de inquilinos", "ru": "Шифрование банковского уровня · изоляция арендаторов",
  "ar": "تشفير بمستوى البنوك · عزل المستأجرين", "hi": "बैंक-स्तरीय एन्क्रिप्शन · टेनेंट आइसोलेशन"
 },
 "daTr4": {
  "ja": "PII非保存・集計専用", "zh": "不存储 PII · 仅聚合", "zh-TW": "不儲存 PII · 僅彙總",
  "vi": "Không lưu PII · chỉ tổng hợp", "th": "ไม่จัดเก็บ PII · เฉพาะข้อมูลรวม",
  "id": "Tanpa simpan PII · hanya agregat", "de": "Keine PII-Speicherung · nur Aggregate",
  "fr": "Sans stockage de PII · agrégats uniquement", "es": "Sin almacenar PII · solo agregados",
  "pt": "Sem armazenar PII · apenas agregados", "ru": "Без хранения PII · только агрегаты",
  "ar": "دون تخزين بيانات شخصية · بيانات مجمّعة فقط", "hi": "PII संग्रहीत नहीं · केवल समग्र"
 },
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
  "ja": "チャネルごとに異なる広告ダッシュボード、Excelで合わせる精算、バラバラの在庫と注文 — 運営の複雑さが成長を阻みます。GeniegoROIは30以上のチャネルのデータをリアルタイムで統合し、広告・販売・在庫・配送・精算の成果を一目で分析できます。運営者は意思決定に集中できます。",
  "zh": "各渠道不同的广告看板、用Excel拼凑的对账、分散的库存与订单 —— 运营的复杂度限制了增长。GeniegoROI 实时统一 30+ 渠道数据，让您在一处分析广告、销售、库存、物流与结算的绩效。您只需专注决策。",
  "zh-TW": "各通路不同的廣告看板、用Excel拼湊的對帳、分散的庫存與訂單 —— 營運的複雜度限制了成長。GeniegoROI 即時統一 30+ 通路資料，讓您在一處分析廣告、銷售、庫存、物流與結算的成效。您只需專注決策。",
  "vi": "Bảng quảng cáo khác nhau theo từng kênh, đối soát bằng bảng tính, tồn kho và đơn hàng rời rạc — sự phức tạp kìm hãm tăng trưởng. GeniegoROI hợp nhất dữ liệu 30+ kênh theo thời gian thực để bạn phân tích hiệu suất quảng cáo, bán hàng, tồn kho, vận chuyển và thanh toán tại một nơi. Bạn chỉ tập trung vào quyết định.",
  "th": "แดชบอร์ดโฆษณาต่างกันในแต่ละช่องทาง การกระทบยอดด้วยสเปรดชีต สต็อกและออเดอร์ที่กระจัดกระจาย — ความซับซ้อนจำกัดการเติบโต GeniegoROI รวมข้อมูล 30+ ช่องทางแบบเรียลไทม์ ให้คุณวิเคราะห์ประสิทธิภาพโฆษณา ขาย สต็อก ขนส่ง และการชำระเงินในที่เดียว คุณเพียงโฟกัสที่การตัดสินใจ",
  "id": "Dasbor iklan berbeda per channel, rekonsiliasi via spreadsheet, inventori dan pesanan tersebar — kompleksitas membatasi pertumbuhan. GeniegoROI menyatukan data 30+ channel secara real-time sehingga Anda dapat menganalisis performa iklan, penjualan, inventori, pengiriman, dan settlement di satu tempat. Anda fokus pada keputusan.",
  "de": "Unterschiedliche Werbe-Dashboards je Kanal, Abstimmung per Tabelle, verstreute Bestände und Bestellungen — Komplexität bremst Wachstum. GeniegoROI vereint 30+ Kanäle in Echtzeit, sodass Sie die Performance über Werbung, Verkauf, Lager, Versand und Abrechnung an einem Ort analysieren. Sie konzentrieren sich nur auf Entscheidungen.",
  "fr": "Des tableaux de bord publicitaires différents par canal, des rapprochements sur tableur, des stocks et commandes dispersés — la complexité freine la croissance. GeniegoROI unifie 30+ canaux en temps réel pour vous permettre d'analyser la performance sur la publicité, les ventes, le stock, la livraison et le règlement au même endroit. Vous vous concentrez sur les décisions.",
  "es": "Paneles de anuncios distintos por canal, conciliación en hojas de cálculo, inventario y pedidos dispersos — la complejidad limita el crecimiento. GeniegoROI unifica 30+ canales en tiempo real para que analice el rendimiento de anuncios, ventas, inventario, envíos y liquidación en un solo lugar. Usted solo decide.",
  "pt": "Painéis de anúncios diferentes por canal, conciliação em planilhas, estoque e pedidos dispersos — a complexidade limita o crescimento. A GeniegoROI unifica 30+ canais em tempo real para você analisar o desempenho de anúncios, vendas, estoque, envio e liquidação num só lugar. Você foca apenas nas decisões.",
  "ru": "Разные рекламные панели по каналам, сверка в таблицах, разрозненные склад и заказы — сложность тормозит рост. GeniegoROI объединяет 30+ каналов в реальном времени, чтобы вы анализировали эффективность рекламы, продаж, склада, доставки и расчётов в одном месте. Вы лишь принимаете решения.",
  "ar": "لوحات إعلانات مختلفة لكل قناة، تسويات عبر الجداول، مخزون وطلبات مبعثرة — التعقيد يحدّ من النمو. توحّد GeniegoROI بيانات أكثر من 30 قناة لحظيًا لتحلّل أداء الإعلانات والمبيعات والمخزون والشحن والتسوية في مكان واحد. تركّز أنت على القرارات فقط.",
  "hi": "हर चैनल पर अलग विज्ञापन डैशबोर्ड, स्प्रेडशीट से मिलान, बिखरी इन्वेंटरी और ऑर्डर — जटिलता विकास को रोकती है। GeniegoROI 30+ चैनलों का डेटा रियल-टाइम एकीकृत करता है ताकि आप विज्ञापन, बिक्री, इन्वेंटरी, शिपिंग और सेटलमेंट के प्रदर्शन का एक ही जगह विश्लेषण कर सकें। आप केवल निर्णयों पर ध्यान दें।"
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
  "ja": "統合カタログ・在庫同期、注文・配送ステータス標準化",
  "zh": "统一目录与库存同步、订单与配送状态标准化",
  "zh-TW": "統一目錄與庫存同步、訂單與配送狀態標準化",
  "vi": "Đồng bộ catalog & tồn kho, chuẩn hoá trạng thái đơn & giao hàng",
  "th": "ซิงค์แคตตาล็อกและสต็อก มาตรฐานสถานะออเดอร์และการจัดส่ง",
  "id": "Sinkron katalog & inventori, standardisasi status pesanan & pengiriman",
  "de": "Katalog- & Lagersynchronisation, standardisierte Bestell- und Versandstatus",
  "fr": "Synchro catalogue & stock, statuts de commande et livraison normalisés",
  "es": "Sincronización de catálogo e inventario, estados de pedido y envío estandarizados",
  "pt": "Sincronização de catálogo e estoque, status de pedido e entrega padronizados",
  "ru": "Синхронизация каталога и склада, стандартизация статусов заказов и доставки",
  "ar": "مزامنة الكتالوج والمخزون وتوحيد حالات الطلب والشحن",
  "hi": "कैटलॉग व इन्वेंटरी सिंक, ऑर्डर व डिलीवरी स्टेटस मानकीकरण"
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
  "ja": "マルチチャネル・アトリビューション分析",
  "zh": "多渠道归因分析",
  "zh-TW": "多通路歸因分析",
  "vi": "Phân tích Attribution đa kênh",
  "th": "การวิเคราะห์ Attribution หลายช่องทาง",
  "id": "Analitik Atribusi Multi-Channel",
  "de": "Multi-Channel-Attributionsanalyse",
  "fr": "Analyse d'attribution multicanal",
  "es": "Análisis de atribución multicanal",
  "pt": "Análise de atribuição multicanal",
  "ru": "Аналитика мультиканальной атрибуции",
  "ar": "تحليلات الإسناد متعدد القنوات",
  "hi": "मल्टी-चैनल एट्रिब्यूशन एनालिटिक्स"
 },
 "m2d": {
  "ja": "8次元の広告貢献度分析とデータに基づく予算提案でROASを最大化。",
  "zh": "8维广告贡献度分析与数据驱动的预算建议，最大化ROAS。",
  "zh-TW": "8維廣告貢獻度分析與數據驅動的預算建議，最大化ROAS。",
  "vi": "Phân tích đóng góp 8 chiều và đề xuất ngân sách dựa trên dữ liệu để tối đa ROAS.",
  "th": "วิเคราะห์ 8 มิติและคำแนะนำงบจากข้อมูลเพื่อ ROAS สูงสุด",
  "id": "Atribusi 8-dimensi dan rekomendasi budget berbasis data untuk ROAS maksimal.",
  "de": "8-dimensionale Attribution und datenbasierte Budgetempfehlungen für maximalen ROAS.",
  "fr": "Attribution 8 dimensions et recommandations budgétaires basées sur les données pour un ROAS maximal.",
  "es": "Atribución de 8 dimensiones y recomendaciones de presupuesto basadas en datos para máximo ROAS.",
  "pt": "Atribuição 8 dimensões e recomendações de orçamento baseadas em dados para ROAS máximo.",
  "ru": "8-мерная атрибуция и рекомендации бюджета на основе данных для максимального ROAS.",
  "ar": "إسناد ثماني الأبعاد وتوصيات ميزانية قائمة على البيانات لتعظيم ROAS.",
  "hi": "अधिकतम ROAS के लिए 8-आयामी एट्रिब्यूशन और डेटा-आधारित बजट सिफ़ारिशें।"
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
  "ja": "クリエイティブ成果分析・コンテンツカレンダー",
  "zh": "创意绩效分析与内容日历",
  "zh-TW": "創意成效分析與內容日曆",
  "vi": "Phân tích hiệu suất sáng tạo & lịch nội dung",
  "th": "วิเคราะห์ประสิทธิภาพครีเอทีฟ & ปฏิทินคอนเทนต์",
  "id": "Analitik performa kreatif & kalender konten",
  "de": "Creative-Performance-Analyse & Content-Kalender",
  "fr": "Analyse de performance créative & calendrier de contenu",
  "es": "Análisis de rendimiento creativo y calendario de contenido",
  "pt": "Análise de desempenho criativo & calendário de conteúdo",
  "ru": "Аналитика эффективности креативов и контент-календарь",
  "ar": "تحليل أداء الإعلانات وتقويم المحتوى",
  "hi": "क्रिएटिव प्रदर्शन विश्लेषण व कंटेंट कैलेंडर"
 },
 "m2b3": {
  "ja": "データに基づく予算配分＋人による承認ワークフロー",
  "zh": "数据驱动的预算分配＋人工审批流程",
  "zh-TW": "數據驅動的預算分配＋人工審批流程",
  "vi": "Phân bổ ngân sách dựa trên dữ liệu + duyệt bởi con người",
  "th": "จัดสรรงบจากข้อมูล + อนุมัติโดยมนุษย์",
  "id": "Alokasi budget berbasis data + persetujuan manusia",
  "de": "Datenbasierte Budgetverteilung + menschliche Freigabe",
  "fr": "Allocation budgétaire basée sur les données + validation humaine",
  "es": "Asignación de presupuesto basada en datos + aprobación humana",
  "pt": "Alocação de orçamento baseada em dados + aprovação humana",
  "ru": "Распределение бюджета на основе данных + подтверждение человеком",
  "ar": "توزيع الميزانية قائم على البيانات + موافقة بشرية",
  "hi": "डेटा-आधारित बजट आवंटन + मानव अनुमोदन"
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
  "ja": "バーコード・ビンロケーション管理、ウェーブピッキング",
  "zh": "条码与储位管理、波次拣货",
  "zh-TW": "條碼與儲位管理、波次揀貨",
  "vi": "Quản lý mã vạch & vị trí bin, soạn hàng theo wave",
  "th": "จัดการบาร์โค้ดและตำแหน่งบิน หยิบสินค้าแบบเวฟ",
  "id": "Manajemen barcode & lokasi bin, wave picking",
  "de": "Barcode- und Lagerplatzverwaltung, Wave-Picking",
  "fr": "Gestion des codes-barres et emplacements, prélèvement par vagues",
  "es": "Gestión de códigos de barras y ubicaciones, picking por olas",
  "pt": "Gestão de códigos de barras e localizações, picking por ondas",
  "ru": "Управление штрихкодами и ячейками, волновая комплектация",
  "ar": "إدارة الباركود ومواقع التخزين، والانتقاء الموجي",
  "hi": "बारकोड व बिन लोकेशन प्रबंधन, वेव पिकिंग"
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
  "ja": "消費税の自動算出・精算照合・会計データ書き出し",
  "zh": "增值税自动核算、结算对账、会计数据导出",
  "zh-TW": "加值稅自動核算、結算對帳、會計資料匯出",
  "vi": "Tự động tính VAT, đối soát quyết toán, xuất dữ liệu kế toán",
  "th": "คำนวณ VAT อัตโนมัติ กระทบยอดการชำระ ส่งออกข้อมูลบัญชี",
  "id": "Perhitungan PPN otomatis, rekonsiliasi settlement, ekspor data akuntansi",
  "de": "Automatische USt-Berechnung, Abrechnungsabgleich, Export von Buchhaltungsdaten",
  "fr": "Calcul automatique de la TVA, rapprochement des règlements, export comptable",
  "es": "Cálculo automático del IVA, conciliación de liquidaciones, exportación contable",
  "pt": "Cálculo automático de IVA, conciliação de liquidações, exportação contábil",
  "ru": "Автоматический расчёт НДС, сверка расчётов, экспорт бухгалтерских данных",
  "ar": "احتساب ضريبة القيمة المضافة تلقائيًا، مطابقة التسويات، تصدير البيانات المحاسبية",
  "hi": "स्वतः VAT गणना, सेटलमेंट मिलान, लेखा डेटा निर्यात"
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
  "ja": "RFM・VIP・予測セグメント、顧客ジャーニービルダー",
  "zh": "RFM/VIP/预测细分、客户旅程构建器",
  "zh-TW": "RFM/VIP/預測分群、客戶旅程建構器",
  "vi": "Phân khúc RFM/VIP/dự đoán, trình tạo hành trình",
  "th": "เซกเมนต์ RFM/VIP/เชิงคาดการณ์, ตัวสร้าง journey",
  "id": "Segmen RFM/VIP/prediktif, journey builder",
  "de": "RFM/VIP/prädiktive Segmente, Journey-Builder",
  "fr": "Segments RFM/VIP/prédictifs, créateur de parcours",
  "es": "Segmentos RFM/VIP/predictivos, creador de journeys",
  "pt": "Segmentos RFM/VIP/preditivos, criador de jornadas",
  "ru": "Сегменты RFM/VIP/прогнозные, конструктор путей",
  "ar": "شرائح RFM/VIP/تنبؤية، منشئ رحلة العميل",
  "hi": "RFM/VIP/पूर्वानुमानित सेगमेंट, जर्नी बिल्डर"
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
  "ja": "マーケティング自動化サポート",
  "zh": "营销自动化支持",
  "zh-TW": "行銷自動化支援",
  "vi": "Hỗ trợ tự động hoá marketing",
  "th": "การสนับสนุนระบบอัตโนมัติการตลาด",
  "id": "Dukungan Otomasi Marketing",
  "de": "Marketing-Automatisierungs-Support",
  "fr": "Support d'automatisation marketing",
  "es": "Soporte de automatización de marketing",
  "pt": "Suporte de automação de marketing",
  "ru": "Поддержка автоматизации маркетинга",
  "ar": "دعم أتمتة التسويق",
  "hi": "मार्केटिंग ऑटोमेशन सपोर्ट"
 },
 "m6d": {
  "ja": "ルールベースのワークフローと分析に基づく推奨で運営を効率化。",
  "zh": "以规则化工作流与分析辅助建议提升运营效率。",
  "zh-TW": "以規則化工作流與分析輔助建議提升營運效率。",
  "vi": "Tối ưu vận hành với workflow dựa trên quy tắc và khuyến nghị hỗ trợ bằng phân tích.",
  "th": "เพิ่มประสิทธิภาพการดำเนินงานด้วยเวิร์กโฟลว์ตามกฎและคำแนะนำที่ช่วยด้วยการวิเคราะห์",
  "id": "Efisienkan operasi dengan workflow berbasis aturan dan rekomendasi berbantuan analitik.",
  "de": "Optimieren Sie den Betrieb mit regelbasierten Workflows und analytikgestützten Empfehlungen.",
  "fr": "Optimisez les opérations avec des workflows à règles et des recommandations assistées par l'analyse.",
  "es": "Optimice las operaciones con flujos basados en reglas y recomendaciones asistidas por análisis.",
  "pt": "Otimize as operações com workflows baseados em regras e recomendações assistidas por análise.",
  "ru": "Оптимизируйте работу с помощью процессов на основе правил и рекомендаций на базе аналитики.",
  "ar": "حسّن العمليات عبر مسارات عمل قائمة على القواعد وتوصيات مدعومة بالتحليلات.",
  "hi": "नियम-आधारित वर्कफ़्लो और एनालिटिक्स-सहायित सिफ़ारिशों से संचालन को कुशल बनाएँ।"
 },
 "m6b1": {
  "ja": "ルールエンジン・通知ポリシー・アクションプリセット",
  "zh": "规则引擎、通知策略、动作预设",
  "zh-TW": "規則引擎、通知策略、動作預設",
  "vi": "Rule engine, chính sách thông báo, action preset",
  "th": "Rule engine นโยบายแจ้งเตือน action preset",
  "id": "Rule engine, kebijakan notifikasi, action preset",
  "de": "Regel-Engine, Benachrichtigungsrichtlinien, Aktions-Presets",
  "fr": "Moteur de règles, politiques d'alerte, presets d'action",
  "es": "Motor de reglas, políticas de alerta, presets de acción",
  "pt": "Motor de regras, políticas de alerta, presets de ação",
  "ru": "Движок правил, политики уведомлений, пресеты действий",
  "ar": "محرّك القواعد، سياسات التنبيه، إعدادات الإجراءات",
  "hi": "रूल इंजन, अलर्ट नीतियाँ, एक्शन प्रीसेट"
 },
 "m6b2": {
  "ja": "閾値設定・分析に基づく提案・ワンクリック承認",
  "zh": "阈值设定、分析辅助建议、一键审批",
  "zh-TW": "閾值設定、分析輔助建議、一鍵審批",
  "vi": "Đặt ngưỡng, gợi ý hỗ trợ bằng phân tích, duyệt một chạm",
  "th": "ตั้งเกณฑ์ คำแนะนำจากการวิเคราะห์ อนุมัติคลิกเดียว",
  "id": "Atur threshold, saran berbantuan analitik, persetujuan satu klik",
  "de": "Schwellenwerte, analytikgestützte Vorschläge, Ein-Klick-Freigabe",
  "fr": "Seuils, suggestions assistées par l'analyse, validation en un clic",
  "es": "Umbrales, sugerencias asistidas por análisis, aprobación con un clic",
  "pt": "Limiares, sugestões assistidas por análise, aprovação com um clique",
  "ru": "Пороги, подсказки на базе аналитики, подтверждение в один клик",
  "ar": "عتبات، اقتراحات مدعومة بالتحليلات، موافقة بنقرة واحدة",
  "hi": "थ्रेशोल्ड, एनालिटिक्स-सहायित सुझाव, एक-क्लिक अनुमोदन"
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
  "ja": "2. 成果分析",
  "zh": "2. 绩效分析",
  "zh-TW": "2. 成效分析",
  "vi": "2. Phân tích hiệu suất",
  "th": "2. วิเคราะห์ประสิทธิภาพ",
  "id": "2. Analisis performa",
  "de": "2. Performance analysieren",
  "fr": "2. Analysez la performance",
  "es": "2. Analice el rendimiento",
  "pt": "2. Analise o desempenho",
  "ru": "2. Анализируйте эффективность",
  "ar": "2. حلّل الأداء",
  "hi": "2. प्रदर्शन विश्लेषण"
 },
 "how2d": {
  "ja": "広告・売上・在庫・精算のデータを分析し、機会とリスクを一目で見つけ出します。",
  "zh": "分析广告、销售、库存与结算数据，一目了然地发现机会与风险。",
  "zh-TW": "分析廣告、銷售、庫存與結算數據，一目了然地發現機會與風險。",
  "vi": "Phân tích dữ liệu quảng cáo, doanh thu, tồn kho, thanh toán để thấy cơ hội và rủi ro trong nháy mắt.",
  "th": "วิเคราะห์ข้อมูลโฆษณา ยอดขาย สต็อก การชำระเงิน เห็นโอกาสและความเสี่ยงในพริบตา",
  "id": "Analisis data iklan, penjualan, inventori, settlement untuk melihat peluang & risiko sekilas.",
  "de": "Analysieren Sie Werbe-, Umsatz-, Lager- und Abrechnungsdaten, um Chancen und Risiken auf einen Blick zu erkennen.",
  "fr": "Analysez les données pub, ventes, stock et règlement pour repérer opportunités et risques d'un coup d'œil.",
  "es": "Analice datos de anuncios, ventas, inventario y liquidación para ver oportunidades y riesgos de un vistazo.",
  "pt": "Analise dados de anúncios, vendas, estoque e liquidação para ver oportunidades e riscos num relance.",
  "ru": "Анализируйте данные рекламы, продаж, склада и расчётов, чтобы видеть возможности и риски с первого взгляда.",
  "ar": "حلّل بيانات الإعلانات والمبيعات والمخزون والتسوية لاكتشاف الفرص والمخاطر بلمحة.",
  "hi": "विज्ञापन, बिक्री, इन्वेंटरी, सेटलमेंट डेटा का विश्लेषण कर अवसर व जोखिम एक नज़र में देखें।"
 },
 "how3t": {
  "ja": "3. 最適化・成長",
  "zh": "3. 优化与增长",
  "zh-TW": "3. 最佳化與成長",
  "vi": "3. Tối ưu & tăng trưởng",
  "th": "3. เพิ่มประสิทธิภาพ & เติบโต",
  "id": "3. Optimalkan & tumbuh",
  "de": "3. Optimieren & wachsen",
  "fr": "3. Optimisez & croissez",
  "es": "3. Optimice y crezca",
  "pt": "3. Otimize & cresça",
  "ru": "3. Оптимизируйте и растите",
  "ar": "3. حسّن وانمُ",
  "hi": "3. ऑप्टिमाइज़ करें व बढ़ें"
 },
 "how3d": {
  "ja": "分析に基づく推奨をワンクリックで承認・実行。成長に集中できます。",
  "zh": "一键审批并执行分析辅助建议。专注增长。",
  "zh-TW": "一鍵審批並執行分析輔助建議。專注成長。",
  "vi": "Duyệt và thực thi khuyến nghị hỗ trợ bằng phân tích chỉ một chạm. Tập trung tăng trưởng.",
  "th": "อนุมัติและดำเนินการคำแนะนำจากการวิเคราะห์ด้วยคลิกเดียว โฟกัสการเติบโต",
  "id": "Setujui dan jalankan rekomendasi berbantuan analitik satu klik. Fokus tumbuh.",
  "de": "Analytikgestützte Empfehlungen per Klick freigeben und ausführen. Fokus aufs Wachstum.",
  "fr": "Validez et exécutez les recommandations assistées par l'analyse en un clic. Place à la croissance.",
  "es": "Apruebe y ejecute recomendaciones asistidas por análisis con un clic. Enfóquese en crecer.",
  "pt": "Aprove e execute recomendações assistidas por análise com um clique. Foque no crescimento.",
  "ru": "Подтверждайте и выполняйте рекомендации на базе аналитики одним кликом. Сосредоточьтесь на росте.",
  "ar": "وافق ونفّذ التوصيات المدعومة بالتحليلات بنقرة واحدة. ركّز على النمو.",
  "hi": "एनालिटिक्स-सहायित सिफ़ारिशें एक-क्लिक अनुमोदित व निष्पादित करें। विकास पर ध्यान दें।"
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
  "ja": "すべてのチャネルのマーケティング成果を測定・アトリビューション・最適化するグローバル分析SaaS",
  "zh": "衡量、归因并优化每个渠道营销绩效的全球分析SaaS",
  "zh-TW": "衡量、歸因並最佳化每個通路行銷成效的全球分析SaaS",
  "vi": "SaaS phân tích toàn cầu giúp đo lường, phân bổ và tối ưu hiệu suất marketing trên mọi kênh",
  "th": "SaaS วิเคราะห์ระดับโลกที่วัดผล จัดสรรเครดิต และเพิ่มประสิทธิภาพการตลาดในทุกช่องทาง",
  "id": "SaaS analitik global untuk mengukur, mengatribusikan, dan mengoptimalkan performa marketing di setiap kanal",
  "de": "Das globale Analytics-SaaS zum Messen, Attribuieren und Optimieren der Marketing-Performance über alle Kanäle",
  "fr": "Le SaaS d'analyse mondial pour mesurer, attribuer et optimiser la performance marketing sur tous les canaux",
  "es": "El SaaS de análisis global para medir, atribuir y optimizar el rendimiento de marketing en cada canal",
  "pt": "O SaaS de análise global para medir, atribuir e otimizar o desempenho de marketing em todos os canais",
  "ru": "Глобальный аналитический SaaS для измерения, атрибуции и оптимизации эффективности маркетинга по всем каналам",
  "ar": "منصة SaaS تحليلية عالمية لقياس وإسناد وتحسين أداء التسويق عبر كل قناة",
  "hi": "हर चैनल पर मार्केटिंग प्रदर्शन को मापने, एट्रिब्यूट करने और ऑप्टिमाइज़ करने वाला वैश्विक एनालिटिक्स SaaS"
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
          <a href="#data" style={navLink} onMouseEnter={e=>e.target.style.background="#f1f5f9"} onMouseLeave={e=>e.target.style.background="transparent"}>{tr("navData")}</a>
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
  // [현 차수] ★영어 하드코딩 폴백 제거 — 저장 언어 우선, 없으면 navigator 기반 detectLang(한국 브라우저→한국어).
  //   geo-IP(접속국가) 감지는 글로벌 I18nProvider가 ipapi로 수행 후 'genie-lang-change' 이벤트로 갱신(아래 리스너).
  const [lang, setLang] = React.useState(() => localStorage.getItem("genie_roi_lang") || localStorage.getItem("landing_lang") || detectLang());
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
  const DA_STAGES = [
    { icon: "📥", c1: "#06b6d4", c2: "#38bdf8", title: tr("da1t"), desc: tr("da1d") },
    { icon: "🔬", c1: "#6366f1", c2: "#818cf8", title: tr("da2t"), desc: tr("da2d") },
    { icon: "🛡️", c1: "#10b981", c2: "#34d399", title: tr("da3t"), desc: tr("da3d") },
    { icon: "🚀", c1: "#f59e0b", c2: "#fbbf24", title: tr("da4t"), desc: tr("da4d") },
  ];
  const DA_CATS = [1,2,3,4,5].map((n,i) => ({ icon: ["📣","🛒","📦","🧾","🧭"][i], title: tr("daCat"+n), desc: tr("daCatD"+n) }));
  const DA_TRUST = [ tr("daTr1"), tr("daTr2"), tr("daTr3"), tr("daTr4") ];

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
        @media (max-width: 980px){ .da-arrow{ display:none !important; } }
        /* [현 차수] 모바일 상단 잘림 근본수정: fixed 헤더(66px)+노치 safe-area 를 확보한 히어로 상단 패딩.
           + 로고 오빗 6도메인 애니메이션을 모바일에서도 잘리지 않게 스케일 정렬. */
        @media (max-width: 768px){
          .lp-hero{ padding: calc(92px + env(safe-area-inset-top,0px)) 16px 50px !important; }
          .lp-orbit-wrap{ transform: scale(.8); transform-origin: top center; margin-bottom: 4px !important; }
        }
        @media (max-width: 420px){
          .lp-hero{ padding: calc(86px + env(safe-area-inset-top,0px)) 14px 44px !important; }
          .lp-orbit-wrap{ transform: scale(.7); }
        }
      `}</style>
      <PremiumHeader lang={lang} setLang={setLang} />

      {/* ═══ HERO ═══ */}
      <section className="lp-hero" style={{ position: "relative", padding: "150px 24px 70px", textAlign: "center", overflow: "hidden", background: "linear-gradient(180deg,#f8faff 0%,#ffffff 60%)" }}>
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 980, height: 520, background: "radial-gradient(ellipse, rgba(79,70,229,0.10) 0%, rgba(124,58,237,0.06) 35%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ ...wrap, position: "relative" }} className="lpUp">
          {/* [현 차수] 로고 중심 6도메인(마케팅·AI자동화·정산·데이터분석·물류·커머스) 애니메이션 확대(186→240) */}
          <div className="lp-orbit-wrap" style={{ marginBottom: 24 }}><LogoOrbit size={240} lang={lang} /></div>
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

      {/* ═══ DATA ANALYTICS ENGINE (수집→분석→신뢰→실행) ═══ */}
      <section id="data" style={{ padding: "88px 24px", background: "linear-gradient(180deg,#0b1224 0%,#111a33 100%)" }}>
        <div style={wrap}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <Badge color="#38bdf8">{tr("daBadge")}</Badge>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 900, color: "#fff", letterSpacing: -1, margin: "0 0 16px", lineHeight: 1.15 }}>{tr("daTitle")}</h2>
            <p style={{ fontSize: 16, color: "#94a3b8", maxWidth: 760, margin: "0 auto", lineHeight: 1.85 }}>{tr("daDesc")}</p>
          </div>

          {/* 4-stage pipeline: Collect → Analyze → Trust → Act */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(238px,1fr))", gap: 18, marginBottom: 44 }}>
            {DA_STAGES.map((s, i) => (
              <div key={i} className="lp-card" style={{ position: "relative", padding: "30px 24px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg," + s.c1 + "," + s.c2 + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16, boxShadow: "0 10px 26px " + s.c1 + "55" }}>{s.icon}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: s.c2, letterSpacing: 1.2, marginBottom: 6 }}>STEP {i+1}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.7 }}>{s.desc}</div>
                {i < DA_STAGES.length - 1 && <div className="da-arrow" style={{ position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)", zIndex: 2, color: "#64748b", fontSize: 22, fontWeight: 900 }}>→</div>}
              </div>
            ))}
          </div>

          {/* data categories collected & analyzed */}
          <div style={{ borderRadius: 24, padding: "34px 30px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", marginBottom: 22, textAlign: "center" }}>{tr("daDataTitle")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(188px,1fr))", gap: 14 }}>
              {DA_CATS.map((c, i) => (
                <div key={i} style={{ padding: "18px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: 22, marginBottom: 9 }}>{c.icon}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* trust signals */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {DA_TRUST.map((tx, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 99, background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.22)" }}>
                <span style={{ color: "#38bdf8", fontWeight: 900 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1" }}>{tx}</span>
              </div>
            ))}
          </div>
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
              <a href="mailto:geniegoroi@ociell.com" style={{ padding: "16px 40px", borderRadius: 13, background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 800, fontSize: 15.5, textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>{tr("ctaBtnContact")}</a>
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 20, position: "relative" }}>{tr("heroTrust")}</div>
          </div>
        </div>
      </section>

      {/* ═══ 추천인 제도 홍보 (15개국 현지어·보상 확실성 강조) ═══ */}
      <ReferralPromo lang={lang} onCta={() => { window.location.href = "/login"; }} />

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
            <span>© 2001. 09. 11. Ociell Co., Ltd. {tr("ftRights")}</span>
            <span>geniegoroi@ociell.com · Seoul, Republic of Korea</span>
          </div>
        </div>
      </footer>
      <GrowthCapturePopup />
    </div>
  );
}
