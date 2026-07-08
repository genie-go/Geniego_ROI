import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MEMBER_MENU } from "../../layout/sidebarManifest.js"; // 212차 #5: 메뉴접근→서비스명 동적 매핑
import { MENU_KEY_LABEL, SUB_TABS_BY_PATH } from "../../layout/sidebarMenuLabels.js"; // [현 차수] 메뉴 접근 권한 4단계 트리(중메뉴 라벨·서브탭) — admin 과 동일 SSOT
import { Link, useLocation, useNavigate } from "react-router-dom";
import PremiumLayout from "../../layout/PremiumLayout.jsx";
import { useT, useI18n } from "../../i18n/index.js"; // 187차: i18n 배선(앱 내부 한국어 표기 버그 수정)
import SIDEBAR_DICT from "../../layout/sidebarI18n.js"; // 212차 #5 핫픽스: gNav.* 라벨은 sidebarI18n 전용(전역 i18n 부재) → 사이드바와 동일 해석
import { useAuth } from "../../auth/AuthContext.jsx"; // 213차 결제 게이팅 #2: 로그인 사용자 전체정보 입력 게이트
import { localizeDeep as _dloc } from "../../utils/demoUiLocalize.js"; // [271차] 백엔드 플랜 데이터(기능/설명) 15개국 현지화

/**
 * 172차 PHASE 1-A — hardcoded PLANS 제거 → backend `/auth/pricing/public-plans` 기반 동적 fetch.
 * admin이 가격/priceId/features 를 DB 에서 편집하면 즉시 반영 (재빌드 불필요).
 * fallback: 옛 build-time env 변수 + hardcoded default (graceful degradation).
 *
 * 187차 — 3대 수정:
 *  ① i18n: 전 문구를 t('appPricing.*') 로 배선(영어 인라인 fallback). 한국어 등 15개국 현지화.
 *  ② 플랜 선택: 카드 클릭 선택 + 비-Pro 버튼 또렷하게 → 어떤 플랜이든 동등 선택.
 *  ③ 밝은 테마: /app-pricing(앱 내부)은 밝은 테마·찐한 텍스트. 공개 /pricing 은 다크 마케팅 유지.
 */
// 213차 결제 게이팅 #2: 실운영(유료) 전환 전 필수 사업자 정보 완비 여부.
//   user.profile(서버 정규화) 또는 평면 필드를 모두 본다. 하나라도 비면 '미완'.
const LIVE_PROFILE_FIELDS = ["company", "business_number", "ceo_name", "phone", "address"];
function profileIncomplete(user) {
  if (!user) return true;
  const p = user.profile || {};
  return LIVE_PROFILE_FIELDS.some((f) => {
    const v = (p[f] ?? user[f] ?? "").toString().trim();
    return v === "";
  });
}

const PLAN_UI_META = {
  starter:    { color: "#4f8ef7", tagAuto: null },
  pro:        { color: "#6366f1", tagAuto: "Most Popular" },
  enterprise: { color: "#a855f7", tagAuto: "Custom" },
};

// 187차 — 표준 플랜 현지화 메타. 표준 id(starter/pro/enterprise)는 i18n 키로 번역,
// 그 외(admin 신규 플랜)는 API 값을 그대로 사용. 가격/periods 는 항상 API/숫자(언어무관).
const STD_PLAN_CONTENT = {
  starter: {
    desc: "Perfect for small teams managing a few channels.",
    features: [
      "3 sales channels", "1 warehouse (WMS)", "Marketing analytics dashboard",
      "Up to 2 team members", "10,000 API calls / month", "Email support (48h)",
    ],
    notIncluded: ["Attribution analytics", "Influencer evaluation", "International invoice"],
  },
  pro: {
    desc: "For growing brands with multi-channel operations.",
    features: [
      "Unlimited sales channels", "Unlimited warehouses (WMS)", "Multi-channel attribution analytics",
      "Influencer evaluation engine", "Commercial invoice auto-gen", "Up to 10 team members",
      "500,000 API calls / month", "Priority support (8h)",
    ],
    notIncluded: ["Custom predictive models", "Dedicated account manager"],
  },
  enterprise: {
    desc: "For large-scale operations requiring full customization.",
    features: [
      "Everything in Pro", "Custom predictive model training", "Dedicated account manager",
      "SLA 99.9% uptime guarantee", "Unlimited team members", "Unlimited API calls",
      "Custom integrations & webhooks", "On-premise deployment option",
    ],
    notIncluded: [],
  },
};

// fallback: backend 응답 실패 시 사용 (운영 cold start 또는 backend 다운)
const FALLBACK_PLANS = [
    {
        id: "starter", name: "Starter", priceMonthly: 49, priceAnnual: 39,
        tag: null, color: "#4f8ef7", desc: STD_PLAN_CONTENT.starter.desc,
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_STARTER_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL || "",
        features: STD_PLAN_CONTENT.starter.features,
        notIncluded: STD_PLAN_CONTENT.starter.notIncluded,
    },
    {
        id: "pro", name: "Pro", priceMonthly: 149, priceAnnual: 119,
        tag: "Most Popular", color: "#6366f1", desc: STD_PLAN_CONTENT.pro.desc,
        priceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || "",
        priceIdAnnual: import.meta.env.VITE_PADDLE_PRICE_PRO_ANNUAL || "",
        features: STD_PLAN_CONTENT.pro.features,
        notIncluded: STD_PLAN_CONTENT.pro.notIncluded,
    },
    {
        id: "enterprise", name: "Enterprise", priceMonthly: null, priceAnnual: null,
        tag: "Custom", color: "#a855f7", desc: STD_PLAN_CONTENT.enterprise.desc,
        priceIdMonthly: "", priceIdAnnual: "",
        features: STD_PLAN_CONTENT.enterprise.features,
        notIncluded: STD_PLAN_CONTENT.enterprise.notIncluded,
    },
];

/**
 * backend 응답 → frontend PLANS 형식 변환.
 */
function hydratePlanFromApi(p) {
  const meta = PLAN_UI_META[p.id] || { color: "#4f8ef7", tagAuto: null };
  const periods = Array.isArray(p.periods) ? p.periods : [];
  const periodsHydrated = periods.length > 0 ? periods : [
    p.price_id_monthly ? { period_months: 1,  price_usd: p.price_usd ?? null, paddle_price_id: p.price_id_monthly, discount_pct: 0, total_charge: p.price_usd ?? null } : null,
    p.price_id_annual  ? { period_months: 12, price_usd: p.price_annual_usd ?? null, paddle_price_id: p.price_id_annual, discount_pct: 20, total_charge: (p.price_annual_usd != null ? p.price_annual_usd * 12 : null) } : null,
  ].filter(Boolean);
  return {
    id: p.id,
    name: p.name || p.id,
    priceMonthly: p.is_custom_quote ? null : (p.price_usd ?? null),
    priceAnnual:  p.is_custom_quote ? null : (p.price_annual_usd ?? null),
    tag: p.is_custom_quote ? "Custom" : meta.tagAuto,
    color: meta.color,
    desc: p.description || "",
    priceIdMonthly: p.price_id_monthly || "",
    priceIdAnnual:  p.price_id_annual  || "",
    features: Array.isArray(p.features) ? p.features : [],
    notIncluded: [],
    isCustomQuote: !!p.is_custom_quote,
    periods: periodsHydrated,
    // 187차 — admin plan_config 동기화: limits(채널/창고/계정수 -1=무제한) + 계정수 티어·계정수별 가격 매트릭스
    limits: (p.limits && typeof p.limits === "object" && !Array.isArray(p.limits)) ? p.limits : {},
    seatTiers: Array.isArray(p.seatTiers) ? p.seatTiers : [],
    seatPricing: (p.seatPricing && typeof p.seatPricing === "object" && !Array.isArray(p.seatPricing)) ? p.seatPricing : {},
    menuAccessCount: Array.isArray(p.menuAccess) ? p.menuAccess.length : 0,
    menuAccess: Array.isArray(p.menuAccess) ? p.menuAccess : [],
  };
}

// 187차 — admin NAMED_PERIODS 정합(월간/분기/반기/연간/2년/3년 + N개월 fallback). admin 이 1~60개월 자유 추가.
const NAMED_PERIODS = { 1: "monthly", 3: "quarterly", 6: "semiAnnual", 12: "annual", 24: "biennial", 36: "triennial" };
const NAMED_PERIOD_FALLBACK = { 1: "Monthly", 3: "Quarterly", 6: "Semi-Annual", 12: "Annual", 24: "2 Years", 36: "3 Years" };

/** 배열에서 period_months 매칭(없으면 ≤ 가장 가까운, 그래도 없으면 최소). */
function findPeriodIn(arr, months) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const exact = arr.find(pp => pp.period_months === months);
  if (exact) return exact;
  const sorted = [...arr].sort((a, b) => a.period_months - b.period_months);
  const lower = [...sorted].reverse().find(pp => pp.period_months <= months);
  return lower || sorted[0];
}

/** 선택한 계정수(seat)의 기간 배열. seatPricing 없으면 legacy periods(계정1) fallback. */
function periodsForSeat(plan, seatKey) {
  const sp = plan && plan.seatPricing ? plan.seatPricing[seatKey] : null;
  if (Array.isArray(sp) && sp.length) return sp;
  return (plan && Array.isArray(plan.periods)) ? plan.periods : [];
}

/** limits 값 표기: -1/null/unlimited → 무제한, 그 외 숫자. */
function limitDisplay(v, unlimitedLabel) {
  if (v === -1 || v === null || v === undefined || v === "unlimited") return unlimitedLabel;
  return String(v);
}

/** 212차 #5: 메뉴접근 키/경로 → labelKey 맵(sidebarManifest 기반). 플랜별 이용가능 서비스 동적 표기. */
const MENU_LABEL_MAP = (() => {
  const m = {};
  try {
    for (const g of (MEMBER_MENU || [])) {
      if (g && g.key && g.labelKey) m[g.key] = g.labelKey;
      for (const it of ((g && g.items) || [])) {
        if (it.menuKey && it.labelKey && !m[it.menuKey]) m[it.menuKey] = it.labelKey;
        if (it.to && it.labelKey) m[it.to] = it.labelKey;
      }
    }
  } catch (e) { /* manifest 부재 시 빈 맵 */ }
  return m;
})();

const GUIDE_LIMIT_ROWS = [
  { k: 'channels', label: '판매·마케팅 채널' }, { k: 'orders_monthly', label: '월 주문 수' },
  { k: 'products', label: '상품 DB' }, { k: 'suppliers', label: '매입처 ID' },
  { k: 'logistics', label: '물류처 ID' }, { k: 'warehouses', label: '창고' },
  { k: 'image_hosting_gb', label: '이미지 호스팅(GB)' },
];

// [현 차수] 메뉴 접근 권한 매트릭스 라벨 — appPricing 네임스페이스가 로케일에 부재하여
//   sidebarI18n 패턴(자기완결 다국어 dict)으로 15개국 직접 제공. 미지원 lang 은 en 폴백.
const MM_I18N = {
  ko: { title: "플랜별 메뉴 접근 권한", subtitle: "각 플랜에서 이용 가능한 메뉴·서비스 (관리자 설정 실시간 반영)", menu: "메뉴 / 서비스", full: "제공", partial: "일부", none: "미제공", readonly: "열람 전용", expandAll: "전체 펼치기", collapseAll: "전체 접기", active: "활성", lvSection: "대메뉴", lvGroup: "중메뉴", lvLeaf: "하위메뉴", lvSub: "서브탭", note: "열람 전용입니다. 대메뉴를 클릭하면 중메뉴·하위메뉴·서브탭까지 펼쳐 볼 수 있으며, 권한 변경은 관리자만 가능합니다." },
  en: { title: "Menu Access by Plan", subtitle: "Menus & services available in each plan (reflects admin settings in real time)", menu: "Menu / Service", full: "Included", partial: "Partial", none: "Not included", readonly: "Read-only", expandAll: "Expand all", collapseAll: "Collapse all", active: "active", lvSection: "Section", lvGroup: "Group", lvLeaf: "Page", lvSub: "Sub-tab", note: "Read-only. Click a section to expand its groups, pages and sub-tabs. Access changes are admin-only." },
  ja: { title: "プラン別メニューアクセス権限", subtitle: "各プランで利用可能なメニュー・サービス（管理者設定をリアルタイム反映）", menu: "メニュー / サービス", full: "提供", partial: "一部", none: "非提供", readonly: "閲覧専用", expandAll: "すべて展開", collapseAll: "すべて折りたたむ", active: "有効", lvSection: "大メニュー", lvGroup: "中メニュー", lvLeaf: "下位メニュー", lvSub: "サブタブ", note: "閲覧専用です。大メニューをクリックすると中メニュー・下位メニュー・サブタブまで展開でき、権限変更は管理者のみ可能です。" },
  zh: { title: "各套餐菜单访问权限", subtitle: "各套餐可用的菜单·服务（实时反映管理员设置）", menu: "菜单 / 服务", full: "提供", partial: "部分", none: "未提供", readonly: "仅查看", expandAll: "全部展开", collapseAll: "全部收起", active: "启用", lvSection: "主菜单", lvGroup: "中菜单", lvLeaf: "子菜单", lvSub: "子标签", note: "仅查看。点击主菜单可展开中菜单·子菜单·子标签，权限变更仅限管理员。" },
  "zh-TW": { title: "各方案選單存取權限", subtitle: "各方案可用的選單·服務（即時反映管理員設定）", menu: "選單 / 服務", full: "提供", partial: "部分", none: "未提供", readonly: "僅檢視", expandAll: "全部展開", collapseAll: "全部收合", active: "啟用", lvSection: "主選單", lvGroup: "中選單", lvLeaf: "子選單", lvSub: "子分頁", note: "僅檢視。點擊主選單可展開中選單·子選單·子分頁，權限變更僅限管理員。" },
  de: { title: "Menüzugriff nach Plan", subtitle: "In jedem Plan verfügbare Menüs & Dienste (spiegelt Admin-Einstellungen in Echtzeit)", menu: "Menü / Dienst", full: "Enthalten", partial: "Teilweise", none: "Nicht enthalten", readonly: "Nur Ansicht", expandAll: "Alle aufklappen", collapseAll: "Alle zuklappen", active: "aktiv", lvSection: "Hauptmenü", lvGroup: "Gruppe", lvLeaf: "Seite", lvSub: "Unterregister", note: "Nur Ansicht. Klicken Sie auf ein Hauptmenü, um Gruppen, Seiten und Unterregister aufzuklappen. Änderungen nur durch Admins." },
  fr: { title: "Accès aux menus par offre", subtitle: "Menus et services disponibles dans chaque offre (reflète les réglages admin en temps réel)", menu: "Menu / Service", full: "Inclus", partial: "Partiel", none: "Non inclus", readonly: "Lecture seule", expandAll: "Tout déplier", collapseAll: "Tout replier", active: "actif", lvSection: "Section", lvGroup: "Groupe", lvLeaf: "Page", lvSub: "Sous-onglet", note: "Lecture seule. Cliquez sur une section pour déplier groupes, pages et sous-onglets. Modifications réservées aux admins." },
  es: { title: "Acceso a menús por plan", subtitle: "Menús y servicios disponibles en cada plan (refleja la configuración del admin en tiempo real)", menu: "Menú / Servicio", full: "Incluido", partial: "Parcial", none: "No incluido", readonly: "Solo lectura", expandAll: "Expandir todo", collapseAll: "Contraer todo", active: "activo", lvSection: "Sección", lvGroup: "Grupo", lvLeaf: "Página", lvSub: "Subpestaña", note: "Solo lectura. Haga clic en una sección para expandir grupos, páginas y subpestañas. Los cambios son solo para administradores." },
  pt: { title: "Acesso a menus por plano", subtitle: "Menus e serviços disponíveis em cada plano (reflete as configurações do admin em tempo real)", menu: "Menu / Serviço", full: "Incluído", partial: "Parcial", none: "Não incluído", readonly: "Somente leitura", expandAll: "Expandir tudo", collapseAll: "Recolher tudo", active: "ativo", lvSection: "Seção", lvGroup: "Grupo", lvLeaf: "Página", lvSub: "Subaba", note: "Somente leitura. Clique numa seção para expandir grupos, páginas e subabas. Alterações apenas por administradores." },
  ru: { title: "Доступ к меню по тарифу", subtitle: "Меню и сервисы, доступные в каждом тарифе (отражает настройки админа в реальном времени)", menu: "Меню / Сервис", full: "Включено", partial: "Частично", none: "Не включено", readonly: "Только просмотр", expandAll: "Развернуть всё", collapseAll: "Свернуть всё", active: "активно", lvSection: "Раздел", lvGroup: "Группа", lvLeaf: "Страница", lvSub: "Подвкладка", note: "Только просмотр. Нажмите на раздел, чтобы развернуть группы, страницы и подвкладки. Изменения доступны только администраторам." },
  ar: { title: "صلاحيات الوصول للقوائم حسب الباقة", subtitle: "القوائم والخدمات المتاحة في كل باقة (تعكس إعدادات المسؤول فوريًا)", menu: "القائمة / الخدمة", full: "متاح", partial: "جزئي", none: "غير متاح", readonly: "للعرض فقط", expandAll: "توسيع الكل", collapseAll: "طي الكل", active: "مُفعّل", lvSection: "قائمة رئيسية", lvGroup: "مجموعة", lvLeaf: "صفحة", lvSub: "تبويب فرعي", note: "للعرض فقط. انقر على قائمة رئيسية لتوسيع المجموعات والصفحات والتبويبات الفرعية. التغييرات للمسؤولين فقط." },
  hi: { title: "प्लान अनुसार मेन्यू एक्सेस", subtitle: "हर प्लान में उपलब्ध मेन्यू और सेवाएँ (एडमिन सेटिंग्स रीयल-टाइम में दर्शाता है)", menu: "मेन्यू / सेवा", full: "शामिल", partial: "आंशिक", none: "शामिल नहीं", readonly: "केवल पढ़ने योग्य", expandAll: "सभी विस्तृत करें", collapseAll: "सभी संक्षिप्त करें", active: "सक्रिय", lvSection: "मुख्य मेन्यू", lvGroup: "समूह", lvLeaf: "पृष्ठ", lvSub: "उप-टैब", note: "केवल पढ़ने योग्य। मुख्य मेन्यू पर क्लिक कर समूह, पृष्ठ और उप-टैब तक विस्तृत करें। बदलाव केवल एडमिन कर सकते हैं।" },
  th: { title: "สิทธิ์เข้าถึงเมนูตามแพ็กเกจ", subtitle: "เมนูและบริการที่ใช้ได้ในแต่ละแพ็กเกจ (สะท้อนการตั้งค่าผู้ดูแลแบบเรียลไทม์)", menu: "เมนู / บริการ", full: "ให้บริการ", partial: "บางส่วน", none: "ไม่ให้บริการ", readonly: "อ่านอย่างเดียว", expandAll: "ขยายทั้งหมด", collapseAll: "ยุบทั้งหมด", active: "ใช้งาน", lvSection: "เมนูหลัก", lvGroup: "กลุ่ม", lvLeaf: "หน้า", lvSub: "แท็บย่อย", note: "อ่านอย่างเดียว คลิกเมนูหลักเพื่อขยายกลุ่ม หน้า และแท็บย่อย การเปลี่ยนสิทธิ์ทำได้เฉพาะผู้ดูแล" },
  vi: { title: "Quyền truy cập menu theo gói", subtitle: "Menu & dịch vụ khả dụng trong mỗi gói (phản ánh cài đặt quản trị theo thời gian thực)", menu: "Menu / Dịch vụ", full: "Có", partial: "Một phần", none: "Không có", readonly: "Chỉ xem", expandAll: "Mở rộng tất cả", collapseAll: "Thu gọn tất cả", active: "hoạt động", lvSection: "Menu chính", lvGroup: "Nhóm", lvLeaf: "Trang", lvSub: "Tab phụ", note: "Chỉ xem. Nhấp vào menu chính để mở rộng nhóm, trang và tab phụ. Chỉ quản trị viên mới thay đổi được quyền." },
  id: { title: "Akses Menu per Paket", subtitle: "Menu & layanan yang tersedia di tiap paket (mencerminkan pengaturan admin secara real-time)", menu: "Menu / Layanan", full: "Tersedia", partial: "Sebagian", none: "Tidak tersedia", readonly: "Hanya baca", expandAll: "Buka semua", collapseAll: "Tutup semua", active: "aktif", lvSection: "Menu utama", lvGroup: "Grup", lvLeaf: "Halaman", lvSub: "Subtab", note: "Hanya baca. Klik menu utama untuk membuka grup, halaman, dan subtab. Perubahan hanya oleh admin." },
};

// [254차 감사] 플랜 안내 '제공 한도' 행 라벨 — 기존 하드코딩 한글(전 비한글 노출) → MM_I18N 패턴 15국 자기완결.
const GUIDE_LIMIT_I18N = {
  ko: { channels:"판매·마케팅 채널", orders_monthly:"월 주문 수", products:"상품 DB", suppliers:"매입처 ID", logistics:"물류처 ID", warehouses:"창고", image_hosting_gb:"이미지 호스팅(GB)" },
  en: { channels:"Sales & marketing channels", orders_monthly:"Monthly orders", products:"Product DB", suppliers:"Supplier IDs", logistics:"Logistics IDs", warehouses:"Warehouses", image_hosting_gb:"Image hosting (GB)" },
  ja: { channels:"販売・マーケティングチャネル", orders_monthly:"月間注文数", products:"商品DB", suppliers:"仕入先ID", logistics:"物流業者ID", warehouses:"倉庫", image_hosting_gb:"画像ホスティング(GB)" },
  zh: { channels:"销售·营销渠道", orders_monthly:"每月订单数", products:"商品数据库", suppliers:"供应商ID", logistics:"物流商ID", warehouses:"仓库", image_hosting_gb:"图片托管(GB)" },
  "zh-TW": { channels:"銷售·行銷渠道", orders_monthly:"每月訂單數", products:"商品資料庫", suppliers:"供應商ID", logistics:"物流商ID", warehouses:"倉庫", image_hosting_gb:"圖片託管(GB)" },
  de: { channels:"Vertriebs- & Marketingkanäle", orders_monthly:"Bestellungen pro Monat", products:"Produktdatenbank", suppliers:"Lieferanten-IDs", logistics:"Logistik-IDs", warehouses:"Lager", image_hosting_gb:"Bild-Hosting (GB)" },
  th: { channels:"ช่องทางขาย·การตลาด", orders_monthly:"จำนวนคำสั่งซื้อต่อเดือน", products:"ฐานข้อมูลสินค้า", suppliers:"รหัสซัพพลายเออร์", logistics:"รหัสผู้ให้บริการโลจิสติกส์", warehouses:"คลังสินค้า", image_hosting_gb:"โฮสต์รูปภาพ (GB)" },
  vi: { channels:"Kênh bán hàng & tiếp thị", orders_monthly:"Đơn hàng hằng tháng", products:"CSDL sản phẩm", suppliers:"ID nhà cung cấp", logistics:"ID đơn vị vận chuyển", warehouses:"Kho hàng", image_hosting_gb:"Lưu trữ ảnh (GB)" },
  id: { channels:"Kanal penjualan & pemasaran", orders_monthly:"Pesanan per bulan", products:"Basis data produk", suppliers:"ID pemasok", logistics:"ID logistik", warehouses:"Gudang", image_hosting_gb:"Hosting gambar (GB)" },
  ar: { channels:"قنوات البيع والتسويق", orders_monthly:"الطلبات الشهرية", products:"قاعدة بيانات المنتجات", suppliers:"معرّفات الموردين", logistics:"معرّفات اللوجستيات", warehouses:"المستودعات", image_hosting_gb:"استضافة الصور (GB)" },
  es: { channels:"Canales de venta y marketing", orders_monthly:"Pedidos mensuales", products:"BD de productos", suppliers:"ID de proveedores", logistics:"ID de logística", warehouses:"Almacenes", image_hosting_gb:"Alojamiento de imágenes (GB)" },
  fr: { channels:"Canaux de vente et marketing", orders_monthly:"Commandes mensuelles", products:"Base de produits", suppliers:"ID fournisseurs", logistics:"ID logistique", warehouses:"Entrepôts", image_hosting_gb:"Hébergement d'images (Go)" },
  hi: { channels:"बिक्री·मार्केटिंग चैनल", orders_monthly:"मासिक ऑर्डर", products:"उत्पाद DB", suppliers:"आपूर्तिकर्ता ID", logistics:"लॉजिस्टिक्स ID", warehouses:"गोदाम", image_hosting_gb:"इमेज होस्टिंग (GB)" },
  pt: { channels:"Canais de vendas e marketing", orders_monthly:"Pedidos mensais", products:"BD de produtos", suppliers:"IDs de fornecedores", logistics:"IDs de logística", warehouses:"Armazéns", image_hosting_gb:"Hospedagem de imagens (GB)" },
  ru: { channels:"Каналы продаж и маркетинга", orders_monthly:"Заказов в месяц", products:"БД товаров", suppliers:"ID поставщиков", logistics:"ID логистики", warehouses:"Склады", image_hosting_gb:"Хостинг изображений (ГБ)" },
};

/**
 * [현 차수] 플랜별 메뉴 접근 권한 — admin "🔐 플랜별 메뉴 접근 권한" 트리와 동일한 4단계 계층
 *   (대메뉴→중메뉴→하위메뉴→서브탭)을 **열람 전용**으로 미러링(가입/구독 회원용).
 *   admin(/admin/plan-pricing) 설정값(plan_menu_access)을 public-plans 가 그대로 반영 → 실시간 동기화.
 *   ★구독자는 수정·선택 일체 불가(체크박스 없음, ✓/— 표시만). 아코디언으로 단계별 접기·펼치기.
 */
function PlanMenuAccessMatrix({ plans, t, light = true, lang = 'ko' }) {
  const L = MM_I18N[lang] || MM_I18N.en;
  const sections = useMemo(() => (MEMBER_MENU || []), []);
  // section → 고유 menuKey 그룹(중메뉴)
  const groupsOf = (section) => {
    const seen = new Map(); const groups = [];
    for (const it of (section.items || [])) {
      if (!it.menuKey) continue;
      if (!seen.has(it.menuKey)) { const g = { menuKey: it.menuKey, items: [] }; seen.set(it.menuKey, g); groups.push(g); }
      seen.get(it.menuKey).items.push(it);
    }
    return groups;
  };
  const subKeysOfLeaf = (it) => (SUB_TABS_BY_PATH[it.to] || []).map(st => `${it.to}::${st.id}`);
  const keysOfGroup = (g) => { const ks = [g.menuKey]; for (const it of g.items) { if (it.to) ks.push(it.to); ks.push(...subKeysOfLeaf(it)); } return ks; };
  const allMenuKeys = () => { const s = new Set(); for (const sec of sections) for (const g of groupsOf(sec)) s.add(g.menuKey); return s; };
  const allLeafRoutes = () => { const s = new Set(); for (const sec of sections) for (const it of (sec.items || [])) if (it.to) s.add(it.to); return s; };
  const allSectionKeys = () => { const s = new Set(); for (const sec of sections) s.add(sec.key); return s; };
  // 기본 전체 펼침
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [expandMenu, setExpandMenu] = useState(allMenuKeys);
  const [expandLeaf, setExpandLeaf] = useState(allLeafRoutes);
  const expandAll = () => { setCollapsed(new Set()); setExpandMenu(allMenuKeys()); setExpandLeaf(allLeafRoutes()); };
  const collapseAll = () => { setCollapsed(allSectionKeys()); setExpandMenu(new Set()); setExpandLeaf(new Set()); };
  const toggleCollapse = (k) => setCollapsed(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleExpandMenu = (k) => setExpandMenu(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleExpandLeaf = (k) => setExpandLeaf(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  // 대메뉴 클릭 = 그 아래 전체 계층 펼침/접음
  const toggleSection = (sec) => {
    const willExpand = collapsed.has(sec.key);
    setCollapsed(prev => { const n = new Set(prev); willExpand ? n.delete(sec.key) : n.add(sec.key); return n; });
    const gkeys = groupsOf(sec).map(g => g.menuKey);
    const lkeys = groupsOf(sec).flatMap(g => g.items.map(it => it.to).filter(Boolean));
    setExpandMenu(prev => { const n = new Set(prev); gkeys.forEach(k => willExpand ? n.add(k) : n.delete(k)); return n; });
    setExpandLeaf(prev => { const n = new Set(prev); lkeys.forEach(k => willExpand ? n.add(k) : n.delete(k)); return n; });
  };
  if (!sections.length || !plans.length) return null;
  const accSets = plans.map(p => new Set(p.menuAccess || []));
  const onCnt = (pi, keys) => keys.reduce((n, k) => n + (accSets[pi].has(k) ? 1 : 0), 0);

  const titleC = '#0f172a', subC = '#64748b';
  // 열람 전용 표시기: 단일키(✓/—), 계층(coverage: 전체 ✓ / 일부 ◐n/m / 없음 —)
  const indSingle = (pi, key) => accSets[pi].has(key)
    ? <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>
    : <span style={{ color: '#cbd5e1' }}>—</span>;
  const indCover = (pi, keys) => {
    const on = onCnt(pi, keys), tot = keys.length;
    if (tot === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
    if (on === 0) return <span style={{ color: '#cbd5e1' }}>—</span>;
    if (on === tot) return <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>;
    return <span style={{ color: '#d97706', fontWeight: 800, fontSize: 11 }}>◐{on}/{tot}</span>;
  };
  const pill = (label, bg) => <span style={{ fontSize: 9.5, fontWeight: 800, padding: '1px 7px', borderRadius: 6, background: bg, color: '#fff', whiteSpace: 'nowrap' }}>{label}</span>;
  const cellPad = { padding: '7px 9px', borderBottom: '1px solid #eef2f7' };
  const stickyL = (bg) => ({ position: 'sticky', left: 0, background: bg, zIndex: 1 });
  const btnS = { padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' };

  return (
    <div style={{ marginTop: 56, maxWidth: 980, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: titleC, letterSpacing: -0.5 }}>{L.title}</h2>
        <p style={{ fontSize: 12.5, color: subC, marginTop: 6 }}>{L.subtitle}</p>
      </div>
      {/* 펼치기/접기 (열람 전용) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: subC, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span> {L.full}
          <span style={{ color: '#d97706', fontWeight: 800 }}>◐</span> {L.partial}
          <span style={{ color: '#cbd5e1' }}>—</span> {L.none} · 🔒 {L.readonly}
        </span>
        <button onClick={expandAll} style={{ ...btnS, border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0369a1' }}>📂 {L.expandAll}</button>
        <button onClick={collapseAll} style={{ ...btnS, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b' }}>📁 {L.collapseAll}</button>
      </div>
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e6e8ef', borderRadius: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: '#eef2f7' }}>
              <th style={{ ...cellPad, ...stickyL('#eef2f7'), textAlign: 'left', minWidth: 240, color: '#1e293b', fontWeight: 800 }}>{L.menu}</th>
              {plans.map((p, i) => (
                <th key={p.id} style={{ ...cellPad, textAlign: 'center', minWidth: 92 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: subC, marginTop: 1 }}>{onCnt(i, [...allMenuKeys()])}/{allMenuKeys().size} {L.active}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(section => {
              const groups = groupsOf(section);
              if (!groups.length) return null;
              const isCol = collapsed.has(section.key);
              const secLabel = t(section.labelKey, section.labelKey.split('.').pop());
              const secKeys = groups.flatMap(keysOfGroup);
              return (
                <React.Fragment key={section.key}>
                  {/* 대메뉴(섹션) */}
                  <tr style={{ background: '#eaeef6' }}>
                    <td style={{ ...cellPad, ...stickyL('#e4e9f4'), cursor: 'pointer' }} onClick={() => toggleSection(section)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#475569', fontSize: 12, width: 13 }}>{isCol ? '▶' : '▼'}</span>
                        {pill(L.lvSection, '#4f46e5')}
                        <span style={{ fontSize: 14 }}>{section.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>{secLabel}</span>
                      </div>
                    </td>
                    {plans.map((p, pi) => <td key={p.id} style={{ ...cellPad, textAlign: 'center' }}>{indCover(pi, secKeys)}</td>)}
                  </tr>
                  {!isCol && groups.map(g => {
                    const lbl = MENU_KEY_LABEL[g.menuKey];
                    const title = lbl?.title || t(g.items[0]?.labelKey, g.menuKey);
                    const menuExp = expandMenu.has(g.menuKey);
                    const gKeys = keysOfGroup(g);
                    return (
                      <React.Fragment key={g.menuKey}>
                        {/* 중메뉴 */}
                        <tr>
                          <td style={{ ...cellPad, ...stickyL('#f6f8fc'), paddingLeft: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span onClick={() => toggleExpandMenu(g.menuKey)} style={{ cursor: 'pointer', color: '#64748b', fontSize: 11, width: 13, userSelect: 'none' }}>{menuExp ? '▼' : '▶'}</span>
                              {pill(L.lvGroup, '#7c3aed')}
                              <span onClick={() => toggleExpandMenu(g.menuKey)} style={{ fontWeight: 700, color: '#1e293b', fontSize: 12.5, cursor: 'pointer' }}>{title}{g.items.length > 0 && <span style={{ fontSize: 10, color: '#a78bfa', marginLeft: 5, fontWeight: 700 }}>{menuExp ? '▼' : `▶ ${g.items.length}`}</span>}</span>
                            </div>
                          </td>
                          {plans.map((p, pi) => <td key={p.id} style={{ ...cellPad, textAlign: 'center' }}>{indCover(pi, gKeys)}</td>)}
                        </tr>
                        {/* 하위메뉴(leaf) */}
                        {menuExp && g.items.map(it => {
                          const subs = SUB_TABS_BY_PATH[it.to] || [];
                          const leafExp = expandLeaf.has(it.to);
                          const lKeys = [it.to, ...subKeysOfLeaf(it)];
                          const leafLabel = t(it.labelKey, it.labelKey.split('.').pop());
                          return (
                            <React.Fragment key={it.to}>
                              <tr>
                                <td style={{ ...cellPad, ...stickyL('#fff'), paddingLeft: 48 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {subs.length > 0
                                      ? <span onClick={() => toggleExpandLeaf(it.to)} style={{ cursor: 'pointer', color: '#64748b', fontSize: 11, width: 13, userSelect: 'none' }}>{leafExp ? '▼' : '▶'}</span>
                                      : <span style={{ width: 13 }} />}
                                    {pill(L.lvLeaf, '#0891b2')}
                                    <span onClick={subs.length > 0 ? () => toggleExpandLeaf(it.to) : undefined} style={{ fontSize: 12, color: '#334155', fontWeight: 600, cursor: subs.length > 0 ? 'pointer' : 'default' }}>{it.icon} {leafLabel}{subs.length > 0 && <span style={{ color: '#d97706', marginLeft: 4, fontWeight: 700 }}>{leafExp ? '▼' : `▶ ${subs.length}`}</span>}</span>
                                  </div>
                                </td>
                                {plans.map((p, pi) => <td key={p.id} style={{ ...cellPad, textAlign: 'center' }}>{subs.length > 0 ? indCover(pi, lKeys) : indSingle(pi, it.to)}</td>)}
                              </tr>
                              {/* 서브탭 */}
                              {leafExp && subs.map(st => {
                                const sk = `${it.to}::${st.id}`;
                                return (
                                  <tr key={sk}>
                                    <td style={{ ...cellPad, ...stickyL('#fff'), paddingLeft: 74 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 13 }} />
                                        {pill(L.lvSub, '#d97706')}
                                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>📑 {st.label || st.id}</span>
                                      </div>
                                    </td>
                                    {plans.map((p, pi) => <td key={p.id} style={{ ...cellPad, textAlign: 'center' }}>{indSingle(pi, sk)}</td>)}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, padding: '9px 13px', borderRadius: 8, background: '#f8fafc', border: '1px solid #eef2f7', fontSize: 11.5, color: subC, lineHeight: 1.6 }}>
        🔒 {L.note}
      </div>
    </div>
  );
}

/**
 * 212차 #5: 플랜별 제공 서비스 동적 안내 — plan_config(features·menuAccess·limits) 실데이터 기반.
 *   admin 이 기능목록/메뉴접근권한/한도를 변경하면 public-plans 응답이 바뀌어 즉시 반영(재빌드 불요).
 */
function DynamicPlanGuide({ plan, t, light, lang = 'ko' }) {
  const GL = GUIDE_LIMIT_I18N[lang] || GUIDE_LIMIT_I18N.en;
  const [open, setOpen] = useState(true);
  const color = plan.color || '#6366f1';
  const unlimited = t('appPricing.unlimited', '무제한');
  const features = Array.isArray(plan.features) ? plan.features : [];
  // 이용 가능 서비스(메뉴) — menuAccess 는 `/route` + `/route::subtab` + `section||item` 세분화 키
  //   (운영은 플랜당 113~344개)라 raw 노출 시 구독자가 알아볼 수 없는 키 나열이 된다.
  //   base 경로/메뉴키 → 사이드바 라벨로 매핑·중복제거하여 "이용 가능한 페이지/서비스" 깔끔한 목록으로 표기.
  //   (subtab 접미 제거, __section:/__leaf: 내부키 및 미매핑 모호키는 숨김)
  const services = []; const seen = new Set();
  for (const raw of (plan.menuAccess || [])) {
    const key = String(raw || '');
    if (!key || key.startsWith('__')) continue;
    const base = key.split('::')[0];
    const lk = MENU_LABEL_MAP[base] || MENU_LABEL_MAP[key];
    if (!lk) continue;
    const label = t(lk, base);
    if (label && !seen.has(label)) { seen.add(label); services.push(label); }
  }
  const cardBg = light ? '#ffffff' : 'rgba(255,255,255,0.04)';
  const bd = light ? '1px solid #e6e8ef' : '1px solid rgba(255,255,255,0.10)';
  const titleC = light ? '#0f172a' : '#eef0f6';
  const subC = light ? '#475569' : '#aeb4c6';
  const chipBg = light ? `${color}12` : `${color}22`;
  return (
    <div style={{ background: cardBg, border: bd, borderRadius: 14, padding: '18px 20px', borderLeft: `4px solid ${color}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ fontWeight: 900, fontSize: 17, color }}>{plan.name}</span>
        <span style={{ fontSize: 12, color: subC }}>{plan.desc} {open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14, display: 'grid', gap: 16 }}>
          {features.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: titleC, marginBottom: 8 }}>📋 {t('appPricing.guide.features', '제공 기능')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 6 }}>
                {features.map((f, i) => <div key={i} style={{ fontSize: 12.5, color: subC }}><span style={{ color }}>✓</span> {f}</div>)}
              </div>
            </div>
          )}
          {services.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: titleC, marginBottom: 8 }}>🧩 {t('appPricing.guide.services', '이용 가능 서비스/메뉴')} <span style={{ color: subC, fontWeight: 600 }}>({services.length})</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {services.map((s, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: chipBg, color }}>{s}</span>)}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: titleC, marginBottom: 8 }}>📊 {t('appPricing.guide.limits', '제공 한도')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6 }}>
              {GUIDE_LIMIT_ROWS.map(row => (
                <div key={row.k} style={{ fontSize: 12, color: subC, display: 'flex', justifyContent: 'space-between', borderBottom: light ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.06)', padding: '3px 0' }}>
                  <span>{GL[row.k] || row.label}</span><span style={{ fontWeight: 800, color: titleC }}>{limitDisplay((plan.limits || {})[row.k], unlimited)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 173차 — cycle 옵션 (1/3/6/12 개월). admin DB 의 period_months 와 정합 (fallback 용).
const CYCLE_OPTIONS = [
  { months: 1,  key: "monthly",    label: "Monthly",      short: "1mo" },
  { months: 3,  key: "quarterly",  label: "Quarterly",    short: "3mo" },
  { months: 6,  key: "semiAnnual", label: "Semi-Annual",  short: "6mo" },
  { months: 12, key: "annual",     label: "Annual",       short: "12mo" },
];

/** plan.periods 에서 month 매칭. 없으면 가장 가까운 (>=) period fallback. */
function findPeriod(plan, months) {
  if (!plan?.periods || plan.periods.length === 0) return null;
  const exact = plan.periods.find(pp => pp.period_months === months);
  if (exact) return exact;
  const sorted = [...plan.periods].sort((a, b) => a.period_months - b.period_months);
  const lower = [...sorted].reverse().find(pp => pp.period_months <= months);
  return lower || sorted[0];
}

// 187차 — FAQ: i18n 키 + 영어 인라인 fallback.
const FAQS = [
    { key: "cancel",   q: "Can I cancel anytime?", a: "Yes — cancel any time from your account settings. Your access continues until the end of your current billing cycle. No cancellation fees." },
    { key: "payment",  q: "What payment methods are accepted?", a: "Credit and debit cards only (Visa, Mastercard, American Express, and other major networks) via Paddle.com — our Merchant of Record. Paddle handles VAT/GST/sales-tax compliance globally and bills in USD." },
    { key: "cycles",   q: "Which billing cycles are available?", a: "Four cycles: Monthly (1 month), Quarterly (3 months), Semi-Annual (6 months), and Annual (12 months). Longer cycles unlock larger discounts. All cycles renew automatically at the chosen interval." },
    { key: "trial",    q: "Is there a free trial?", a: "Every new account starts on a free Demo plan with no card required. Explore the platform at your own pace, then upgrade when you're ready — backed by our 30-day money-back guarantee." },
    { key: "longCycle",q: "How does billing work for longer cycles?", a: "Quarterly, semi-annual, and annual plans are billed once upfront for the full cycle. The effective monthly rate is shown next to each cycle option above. You can switch cycles or plans at any time; changes take effect at the next renewal." },
    { key: "tax",      q: "Will taxes be added to my bill?", a: "Paddle handles all VAT/GST/sales-tax compliance globally. Applicable taxes are calculated and shown at checkout based on your location. Your invoice will include a detailed tax breakdown." },
    { key: "failed",   q: "What happens if my payment fails?", a: "Paddle automatically retries failed card payments on a fixed schedule (typically days 1, 3, 5, 7). You'll receive email notifications at each retry. If all retries fail, your plan is paused (not cancelled) and can be resumed any time within 90 days." },
    { key: "refund",   q: "How do refunds work?", a: "First-time subscribers get a full refund within 30 days, no questions asked. Refunds return to the same card and your account is automatically downgraded to the Demo plan. See our Refund Policy for full details." },
];

// 187차 — 비교표: feature 라벨 i18n + 값(Unlimited 등) i18n.
const COMPARISON = [
    { key: "channels",  feature: "Sales Channels",            starter: "3",       pro: "{unlimited}", enterprise: "{unlimited}" },
    { key: "wms",       feature: "Warehouses (WMS)",          starter: "1",       pro: "{unlimited}", enterprise: "{unlimited}" },
    { key: "members",   feature: "Team Members",              starter: "2",       pro: "10",          enterprise: "{unlimited}" },
    { key: "api",       feature: "API Calls / Month",         starter: "10,000",  pro: "500,000",     enterprise: "{unlimited}" },
    { key: "aiMkt",     feature: "Multi-Channel Attribution Analytics", starter: "—",       pro: "✓",           enterprise: "✓" },
    { key: "influencer",feature: "Influencer Analytics",      starter: "—",       pro: "✓",           enterprise: "✓" },
    { key: "customAi",  feature: "Custom Predictive Models",  starter: "—",       pro: "—",           enterprise: "✓" },
    { key: "manager",   feature: "Dedicated Account Manager", starter: "—",       pro: "—",           enterprise: "✓" },
    { key: "sla",       feature: "SLA Guarantee",             starter: "—",       pro: "99.5%",       enterprise: "99.9%" },
    { key: "support",   feature: "Support Response",          starter: "48h",     pro: "8h",          enterprise: "1h" },
];

let paddleInitialized = false;
function loadPaddleV2(clientToken) {
    return new Promise((resolve, reject) => {
        if (paddleInitialized && window.Paddle) { resolve(); return; }
        if (window.Paddle) {
            try {
                const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
                if (env === "sandbox") window.Paddle.Environment.set("sandbox");
                window.Paddle.Initialize({ token: clientToken });
                paddleInitialized = true; resolve();
            } catch { resolve(); }
            return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        s.onload = () => {
            const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
            if (env === "sandbox") window.Paddle.Environment.set("sandbox");
            window.Paddle.Initialize({ token: clientToken });
            paddleInitialized = true; resolve();
        };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// 187차 — 테마 토큰. 앱 내부(light=true)는 밝은 배경·찐한 텍스트, 공개(light=false)는 다크 마케팅.
function buildTheme(light) {
    if (light) {
        return {
            light: true,
            pageBg: "#f8fafc",
            glow: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)",
            badgeBg: "rgba(79,142,247,0.10)", badgeBorder: "rgba(79,142,247,0.30)", badgeText: "#2563eb",
            title: "#0f172a", sub: "#475569", text3: "#64748b", link: "#2563eb",
            cycleBarBg: "#eef2f7", cycleBarBorder: "#dbe3ec", cycleInactiveText: "#475569",
            cardBg: "#ffffff", cardBorder: "#e2e8f0",
            // 187차 — Pro 카드 배경은 단색(그라데이션 금지). styles.css 의 light-theme override
            //   `[style*="background: linear-gradient"] * { color:#fff !important }` 가 그라데이션 하위
            //   모든 텍스트를 흰색으로 강제 → 밝은 카드 위 흰 글자(투명) 버그 회피.
            proCardBg: "#eef1ff", proCardBorder: "#6366f1",
            priceText: "#0f172a", featureText: "#334155", featureMuted: "#94a3b8",
            ghostBtnBg: "#ffffff",
            trustCardBg: "#ffffff", trustCardBorder: "#e2e8f0", trustTitle: "#0f172a",
            compBtnBg: "#ffffff", compBtnBorder: "#cbd5e1", compBtnText: "#334155",
            tableBorder: "#e2e8f0", tableHeadBg: "#eef2ff", tableRowAlt: "#f8fafc", tableCellText: "#475569", tableCellMuted: "#cbd5e1",
            faqBorder: "#e2e8f0", faqQ: "#0f172a", faqA: "#475569",
            legalText: "#94a3b8", legalStrong: "#64748b",
            guideHeading: "#0f172a", guideSub: "#64748b",
            selectedShadow: "0 0 0 3px rgba(99,102,241,0.18)",
            successBg: "rgba(34,197,94,0.10)", successBorder: "rgba(34,197,94,0.30)", successText: "#15803d",
            couponBg: "rgba(245,158,11,0.10)", couponBorder: "rgba(245,158,11,0.30)", couponText: "#b45309",
        };
    }
    return {
        light: false,
        pageBg: "transparent",
        glow: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
        badgeBg: "rgba(79,142,247,0.08)", badgeBorder: "rgba(79,142,247,0.25)", badgeText: "#4f8ef7",
        title: "#fff", sub: "rgba(255,255,255,0.55)", text3: "rgba(255,255,255,0.45)", link: "#4f8ef7",
        cycleBarBg: "rgba(255,255,255,0.03)", cycleBarBorder: "rgba(255,255,255,0.08)", cycleInactiveText: "rgba(255,255,255,0.55)",
        cardBg: "rgba(255,255,255,0.02)", cardBorder: "rgba(255,255,255,0.07)",
        proCardBg: "linear-gradient(155deg,rgba(99,102,241,0.1),rgba(79,142,247,0.05))", proCardBorder: "rgba(99,102,241,0.35)",
        priceText: "#fff", featureText: "rgba(255,255,255,0.7)", featureMuted: "rgba(255,255,255,0.2)",
        ghostBtnBg: "rgba(255,255,255,0.06)",
        trustCardBg: "rgba(255,255,255,0.02)", trustCardBorder: "rgba(255,255,255,0.06)", trustTitle: "#fff",
        compBtnBg: "rgba(255,255,255,0.03)", compBtnBorder: "rgba(255,255,255,0.1)", compBtnText: "rgba(255,255,255,0.7)",
        tableBorder: "rgba(255,255,255,0.07)", tableHeadBg: "rgba(79,142,247,0.06)", tableRowAlt: "rgba(255,255,255,0.015)", tableCellText: "rgba(255,255,255,0.6)", tableCellMuted: "rgba(255,255,255,0.2)",
        faqBorder: "rgba(255,255,255,0.06)", faqQ: "#fff", faqA: "rgba(255,255,255,0.55)",
        legalText: "rgba(255,255,255,0.25)", legalStrong: "rgba(255,255,255,0.45)",
        guideHeading: "#fff", guideSub: "#94a3b8",
        selectedShadow: "0 0 0 3px rgba(99,102,241,0.35)",
        successBg: "rgba(34,197,94,0.08)", successBorder: "rgba(34,197,94,0.25)", successText: "#22c55e",
        couponBg: "rgba(245,158,11,0.08)", couponBorder: "rgba(245,158,11,0.25)", couponText: "#f59e0b",
    };
}

/* ─── 213차 결제 게이팅 #2: 실운영 전환용 전체정보 입력 모달 ───────────────────
 *  데모/free 로그인 사용자가 유료 결제 진입 시, 회원가입 때 받지 않은 사업자 정보를
 *  모두 입력해야만 결제(Paddle)로 진행. PATCH /auth/profile 로 영속(extra_data 병합) 후 재개.
 *  백엔드(upgrade/activateLicense)에도 동일 게이트가 있어 프론트 우회 시에도 차단(정본).
 */
function ProfileGateModal({ user, token, plan, T, t, onCancel, onDone }) {
  const p0 = user?.profile || {};
  const [company, setCompany]   = useState(p0.company || user?.company || "");
  const [ceoName, setCeoName]   = useState(p0.ceo_name || "");
  const [bizNum, setBizNum]     = useState(p0.business_number || "");
  const [phone, setPhone]       = useState(p0.phone || user?.phone || "");
  const [address, setAddress]   = useState(p0.address || "");
  const [bizType, setBizType]   = useState(p0.business_type || "");
  const [country, setCountry]   = useState(p0.country || "대한민국");
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (![company, ceoName, bizNum, phone, address].every(v => v.trim())) {
      setErr(t("appPricing.gate.allRequired", "All fields are required to switch to a live (paid) account."));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: user?.name || "", company: company.trim(), phone: phone.trim(),
          ceo_name: ceoName.trim(), business_number: bizNum.trim(),
          address: address.trim(), business_type: bizType.trim(), country: country.trim(),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setErr(d.error || t("appPricing.gate.saveFail", "Failed to save your information. Please try again.")); setBusy(false); return; }
      setBusy(false);
      onDone();
    } catch (e2) {
      setErr(t("appPricing.gate.saveFail", "Failed to save your information. Please try again."));
      setBusy(false);
    }
  };

  const lbl = { display: "block", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.title, marginBottom: 4 };
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.cardBorder || "rgba(15,23,42,0.15)"}`, fontSize: 13, boxSizing: "border-box", marginBottom: 10, background: "#fff", color: "#0f172a" };

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} style={{ width: "100%", maxWidth: 460, background: T.cardBg || "#fff", borderRadius: 16, padding: "26px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.title, marginBottom: 6 }}>
          {t("appPricing.gate.title", "Complete your business profile")}
        </div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginBottom: 16 }}>
          {t("appPricing.gate.desc", "To switch from the demo/free experience to a live {{plan}} account, please provide your full business information. This is required before payment.", { plan: (plan?.name || plan?.id || "") })}
        </div>
        <label style={lbl}>{t("appPricing.gate.company", "Company name")} *</label>
        <input style={inp} value={company} onChange={e => setCompany(e.target.value)} placeholder="Geniego Inc." />
        <label style={lbl}>{t("appPricing.gate.ceo", "Representative (CEO)")} *</label>
        <input style={inp} value={ceoName} onChange={e => setCeoName(e.target.value)} placeholder={t("appPricing.gate.ceoPh", "Full name")} />
        <label style={lbl}>{t("appPricing.gate.bizNum", "Business registration number")} *</label>
        <input style={inp} value={bizNum} onChange={e => setBizNum(e.target.value)} placeholder="000-00-00000" />
        <label style={lbl}>{t("appPricing.gate.phone", "Contact number")} *</label>
        <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
        <label style={lbl}>{t("appPricing.gate.address", "Business address")} *</label>
        <input style={inp} value={address} onChange={e => setAddress(e.target.value)} placeholder={t("appPricing.gate.addressPh", "Street, city, postal code")} />
        <label style={lbl}>{t("appPricing.gate.bizType", "Business type")}</label>
        <input style={inp} value={bizType} onChange={e => setBizType(e.target.value)} placeholder={t("appPricing.gate.bizTypePh", "e.g. E-commerce / Retail")} />
        {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626", fontSize: 12, marginBottom: 10, textAlign: "left" }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: `1px solid ${T.cardBorder || "rgba(15,23,42,0.15)"}`, background: "transparent", color: T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {t("appPricing.gate.cancel", "Cancel")}
          </button>
          <button type="submit" disabled={busy} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: busy ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer" }}>
            {busy ? t("appPricing.gate.saving", "Saving…") : t("appPricing.gate.continue", "Save & continue to payment")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PricingPublic() {
    const t = useT();
    const { lang } = useI18n();
    // 212차 #5 핫픽스: gNav.* 메뉴 라벨은 sidebarI18n(D) 전용이라 전역 t() 로는 해석 불가(미스 시 raw 키 노출).
    //   사이드바 navT 와 동일하게 SIDEBAR_DICT 우선 조회 후 전역 t() 폴백.
    const navT = useCallback((key, fb) => {
        if (key && typeof key === 'string' && key.startsWith('gNav.')) {
            const loc = SIDEBAR_DICT[lang] || SIDEBAR_DICT.en || {};
            const v = loc[key.slice(5)];
            if (v) return v;
        }
        return t(key, fb);
    }, [t, lang]);
    const location = useLocation();
    const navigate = useNavigate();
    // 187차 — /app-pricing(앱 내부 진입)은 밝은 테마. 공개 /pricing 은 다크 마케팅 유지.
    const isAppContext = location.pathname === "/app-pricing";
    // 187차 — 공개 /pricing 도 프리미엄 라이트로 통일(랜딩/소개와 일관). 항상 light.
    const T = buildTheme(true);

    const [cycleMonths, setCycleMonths] = useState(1);
    const [loading, setLoading] = useState({});
    const [success, setSuccess] = useState(false);
    const [faqOpen, setFaqOpen] = useState(null);
    const [showComparison, setShowComparison] = useState(false);
    const [clientToken, setClientToken] = useState(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "");
    const [plans, setPlans] = useState(FALLBACK_PLANS);
    const [plansLoaded, setPlansLoaded] = useState(false);
    // 187차 — 플랜 선택 상태 (카드 클릭). 기본 'pro'.
    const [selectedPlanId, setSelectedPlanId] = useState("pro");
    // 187차 — 계정수(seat) 선택 상태. admin seat_tier 동기화. 기본 '1'(최소 계정수).
    const [seatTier, setSeatTier] = useState("1");
    const autoCheckoutPending = useRef(null); // {planId, cycleMonths}
    const [couponBanner, setCouponBanner] = useState(null);
    // 213차 결제 게이팅 #2: 로그인(데모/free) 사용자가 유료 결제 진입 전, 회원가입 시 받지 않은
    //   전체 사업자 정보를 입력하도록 강제하는 인라인 모달.
    const { user, token, isDemoMode } = useAuth();
    const [profileGate, setProfileGate] = useState(null); // null | { plan, months, seat }
    const pendingAfterProfile = useRef(null); // checkout 인자 보관(프로필 완료 후 재개)

    // 187차 — admin 동기화: 표시 콘텐츠(이름/설명/기능)는 admin API 가 source of truth.
    //   API features 있으면 그대로(완벽 동기화), 없을 때만(오프라인 fallback) i18n STD 사용.
    const localizePlan = useCallback((plan) => {
        const std = STD_PLAN_CONTENT[plan.id];
        const hasApiFeatures = Array.isArray(plan.features) && plan.features.length > 0;
        const dispFeatures = hasApiFeatures
            ? plan.features
            : (std ? std.features.map((f, i) => t(`appPricing.plans.${plan.id}.features.${i}`, f)) : []);
        const dispDesc = plan.desc || (std ? t(`appPricing.plans.${plan.id}.desc`, std.desc) : "");
        return {
            ...plan,
            dispName: plan.name || t(`appPricing.plans.${plan.id}.name`, plan.id),
            dispDesc,
            dispFeatures,
            dispNotIncluded: plan.notIncluded || [],
        };
    }, [t]);

    // 187차 — admin 동기화 파생: 사용 가능한 기간(period_months) / 계정수(seat) 티어를 plans 에서 추출.
    //   admin 이 1~60개월·계정티어를 자유 추가하면 사용자 페이지가 자동 반영(하드코딩 X).
    const availablePeriods = useMemo(() => {
        const set = new Set();
        plans.forEach(pl => {
            const sp = pl.seatPricing || {};
            Object.values(sp).forEach(arr => Array.isArray(arr) && arr.forEach(e => set.add(e.period_months)));
            (pl.periods || []).forEach(e => set.add(e.period_months));
        });
        let list = [...set].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
        if (list.length === 0) list = CYCLE_OPTIONS.map(o => o.months);
        return list;
    }, [plans]);
    const availableSeatTiers = useMemo(() => {
        const pl = plans.find(p => Array.isArray(p.seatTiers) && p.seatTiers.length > 0);
        return pl ? pl.seatTiers : [];
    }, [plans]);
    const hasSeatPricing = useMemo(() => plans.some(p => p.seatPricing && Object.keys(p.seatPricing).length > 0), [plans]);

    // 선택값이 사용 가능 목록에 없으면 보정.
    useEffect(() => {
        if (availablePeriods.length && !availablePeriods.includes(cycleMonths)) {
            setCycleMonths(availablePeriods.includes(1) ? 1 : availablePeriods[0]);
        }
    }, [availablePeriods]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (availableSeatTiers.length && !availableSeatTiers.some(s => s.key === seatTier)) {
            setSeatTier(availableSeatTiers[0].key);
        }
    }, [availableSeatTiers]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const st = location.state;
        if (st?.autoCheckout?.planId) {
            autoCheckoutPending.current = {
                planId: String(st.autoCheckout.planId),
                cycleMonths: Number(st.autoCheckout.cycleMonths) || 1,
            };
            setCycleMonths(autoCheckoutPending.current.cycleMonths);
            setSelectedPlanId(autoCheckoutPending.current.planId);
        }
        if (st?.couponAlert?.ok) setCouponBanner(st.couponAlert);
        if (st && (st.autoCheckout || st.couponAlert)) {
            navigate(location.pathname, { replace: true, state: null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const apiBase = import.meta.env.VITE_API_BASE || "";
        fetch(`${apiBase}/api/v423/paddle/config`).then(r => r.json()).then(d => { if (d.clientToken) setClientToken(d.clientToken); }).catch(() => {});
        fetch(`${apiBase}/auth/pricing/public-plans`).then(r => r.json()).then(d => {
            if (d?.ok && Array.isArray(d.plans) && d.plans.length > 0) {
                setPlans(d.plans.map(p => _dloc(hydratePlanFromApi(p)))); // [271차] 백엔드 플랜 표시데이터 현지화
            }
        })
        .catch(() => { /* fallback to default plans */ })
        .finally(() => setPlansLoaded(true));
    }, []);

    useEffect(() => { if (clientToken) loadPaddleV2(clientToken).catch(console.error); }, [clientToken]);

    const checkout = useCallback(async (plan, cycleArg, seatArg) => {
        setSelectedPlanId(plan.id);
        // 187차 — 선택한 계정수(seat)의 기간별 가격에서 paddle_price_id 산정.
        const seatKey = String(seatArg ?? seatTier ?? "1");
        const seatPeriods = periodsForSeat(plan, seatKey);
        const hasAnyPriceId = plan.priceIdMonthly || plan.priceIdAnnual || seatPeriods.some(pp => pp.paddle_price_id);
        if (!hasAnyPriceId || plan.isCustomQuote) {
            window.location.href = `mailto:geniegoroi@ociell.com?subject=${encodeURIComponent(plan.name + " Plan Inquiry")}`;
            return;
        }
        const months = Number(cycleArg ?? cycleMonths) || 1;
        let priceId = "";
        const period = findPeriodIn(seatPeriods, months);
        if (period?.paddle_price_id) {
            priceId = period.paddle_price_id;
        } else if (months === 12 && plan.priceIdAnnual) {
            priceId = plan.priceIdAnnual;
        } else if (plan.priceIdMonthly) {
            priceId = plan.priceIdMonthly;
        }
        if (!priceId) {
            alert(t("appPricing.alert.noCycle", "{{months}}-month pricing not yet configured for {{name}}. Please choose a different cycle or contact geniegoroi@ociell.com.", { months, name: plan.name }));
            return;
        }
        // ── 213차 결제 게이팅 #2: 데모/free 로그인 사용자 → 유료 결제 진입 전 전체정보 입력 강제 ──
        //   데모 미리보기(isDemoMode)는 실제 결제가 일어나지 않으므로 게이트 생략(체험 유지).
        //   로그인 + 비admin + 프로필 미완 시: 결제(Paddle) 진입을 보류하고 전체정보 모달을 띄운다.
        if (!isDemoMode && token && user && user.plan !== "admin" && profileIncomplete(user)) {
            pendingAfterProfile.current = { plan, months, seatKey };
            setProfileGate({ plan, months, seat: seatKey });
            return;
        }
        setLoading(p => ({ ...p, [plan.id]: true }));
        try {
            if (!clientToken) throw new Error("Payment system not configured");
            await loadPaddleV2(clientToken);
            // [272차 H-P0] 로그인 사용자 이메일을 customData.user_email + customer.email 로 전달.
            //   웹훅(onSubscriptionActivated)은 custom_data.user_email 로만 이메일을 해석하는데 기존엔 미전달 →
            //   $email='' → app_user.plan 승격/쿠폰발화 블록 전체 스킵(결제 성공해도 free 잔존)이었다.
            const _payerEmail = (user && user.email) ? String(user.email) : '';
            window.Paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                customData: { plan_id: plan.id, cycle_months: months, seat_tier: seatKey, ...(_payerEmail ? { user_email: _payerEmail } : {}) },
                ...(_payerEmail ? { customer: { email: _payerEmail } } : {}),
                settings: {
                    displayMode: "overlay",
                    theme: isAppContext ? "light" : "dark",
                    locale: "en",
                    allowedPaymentMethods: ["card"],
                },
                successCallback: () => setSuccess(true),
            });
        } catch (e) {
            console.error("Paddle checkout error:", e);
            alert(t("appPricing.alert.checkoutError", "Unable to open checkout. Please try again or contact geniegoroi@ociell.com."));
        } finally {
            setLoading(p => ({ ...p, [plan.id]: false }));
        }
    }, [cycleMonths, seatTier, clientToken, isAppContext, t, user, token, isDemoMode]);

    // 213차: 전체정보 입력 완료 → 보류했던 결제 재개.
    const proceedAfterProfile = useCallback(() => {
        const pend = pendingAfterProfile.current;
        setProfileGate(null);
        pendingAfterProfile.current = null;
        if (pend?.plan) {
            setTimeout(() => checkout(pend.plan, pend.months, pend.seatKey), 100);
        }
    }, [checkout]);

    useEffect(() => {
        if (!plansLoaded || !clientToken || !autoCheckoutPending.current) return;
        const pending = autoCheckoutPending.current;
        const plan = plans.find(p => p.id === pending.planId);
        if (!plan) { autoCheckoutPending.current = null; return; }
        autoCheckoutPending.current = null;
        const tm = setTimeout(() => checkout(plan, pending.cycleMonths), 250);
        return () => clearTimeout(tm);
    }, [plansLoaded, clientToken, plans, checkout]);

    const inner = (
        <section style={{ padding: isAppContext ? "44px 28px 90px" : "48px 28px 100px", textAlign: "center", position: "relative" }}>
            {profileGate && (
                <ProfileGateModal
                    user={user}
                    token={token}
                    plan={profileGate.plan}
                    T={T}
                    t={t}
                    onCancel={() => { setProfileGate(null); pendingAfterProfile.current = null; }}
                    onDone={proceedAfterProfile}
                />
            )}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 300, borderRadius: "50%", background: T.glow, pointerEvents: "none" }} />

            <div className="pub-section pub-fadeUp" style={{ position: "relative", zIndex: 1 }}>
                <div data-gp="brandText" style={{ display: "inline-block", padding: "5px 20px", borderRadius: 99, background: T.badgeBg, border: `1px solid ${T.badgeBorder}`, fontSize: 11, color: T.badgeText, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 24 }}>
                    {t("appPricing.hero.badge", "Simple, Transparent Pricing")}
                </div>
                <h1 style={{ fontSize: 44, fontWeight: 900, margin: "0 0 14px", color: T.title, letterSpacing: -1.5 }}>{t("appPricing.hero.title", "Plans that grow with you")}</h1>
                <p style={{ fontSize: 15, color: T.sub, marginBottom: 8 }}>
                    {t("appPricing.hero.subtitle", "No hidden fees. Cancel anytime.")}{" "}
                    <Link to="/refund" style={{ color: T.link, fontWeight: 600 }}>{t("appPricing.hero.guarantee", "30-day money-back guarantee.")}</Link>
                </p>

                {success && (
                    <div style={{ margin: "24px auto", maxWidth: 560, padding: "18px 24px", borderRadius: 14, background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.successText, fontSize: 14, fontWeight: 600 }}>
                        {t("appPricing.banner.success", "✅ Payment received! Your account is being activated — confirmation via email.")}
                    </div>
                )}

                {couponBanner && (
                    <div style={{ margin: "16px auto 0", maxWidth: 560, padding: "14px 22px", borderRadius: 14, background: T.couponBg, border: `1px solid ${T.couponBorder}`, color: T.couponText, fontSize: 13, fontWeight: 600 }}>
                        🎟️ {t("appPricing.banner.coupon", "Coupon applied")} — {couponBanner.message || couponBanner.code || t("appPricing.banner.couponFree", "free access granted")}.
                    </div>
                )}

                {/* 187차 — admin 동기화: 계정수(seat) 선택 + 기간(period) 선택. 둘 다 admin 매트릭스에서 파생. */}
                {hasSeatPricing && availableSeatTiers.length > 1 && (
                    <div style={{ marginTop: 30 }}>
                        <div style={{ fontSize: 11, color: T.text3, fontWeight: 800, letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" }}>
                            {t("appPricing.accountsLabel", "Number of accounts")}
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 99, background: T.cycleBarBg, border: `1px solid ${T.cycleBarBorder}` }}>
                            {availableSeatTiers.map(stier => {
                                const active = seatTier === stier.key;
                                return (
                                    <button key={stier.key} data-gp={active ? "onColor" : undefined}
                                        onClick={() => setSeatTier(stier.key)}
                                        style={{
                                            padding: "8px 18px", borderRadius: 99, border: "none",
                                            background: active ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
                                            color: active ? "#fff" : T.cycleInactiveText,
                                            fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 200ms",
                                            boxShadow: active ? "0 2px 12px rgba(79,142,247,0.3)" : "none",
                                        }}>
                                        {stier.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ fontSize: 11, color: T.text3, fontWeight: 800, letterSpacing: 0.8, margin: "20px 0 8px", textTransform: "uppercase" }}>
                    {t("appPricing.periodHeader", "Billing period")}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14, padding: 4, borderRadius: 99, background: T.cycleBarBg, border: `1px solid ${T.cycleBarBorder}` }}>
                    {availablePeriods.map(months => {
                        const active = cycleMonths === months;
                        const nk = NAMED_PERIODS[months];
                        const label = nk ? t(`appPricing.cycle.${nk}`, NAMED_PERIOD_FALLBACK[months]) : t("appPricing.nMonths", "{{n}} months", { n: months });
                        return (
                            <button key={months} data-gp={active ? "onColor" : undefined}
                                onClick={() => setCycleMonths(months)}
                                style={{
                                    padding: "8px 16px", borderRadius: 99, border: "none",
                                    background: active ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
                                    color: active ? "#fff" : T.cycleInactiveText,
                                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 200ms",
                                    boxShadow: active ? "0 2px 12px rgba(79,142,247,0.3)" : "none",
                                }}>
                                {label}
                                {months > 1 && <span style={{ fontSize: 10, marginLeft: 6, opacity: active ? 0.85 : 0.5 }}>({months}mo)</span>}
                            </button>
                        );
                    })}
                </div>
                <p style={{ fontSize: 11, color: T.text3, marginBottom: 32 }}>
                    {t("appPricing.cycle.note", "Longer cycles unlock larger discounts. All cycles billed upfront via Paddle.")} <strong style={{ color: T.legalStrong }}>{t("appPricing.cardOnly", "Card payments only")}</strong>.
                </p>

                {/* Plan cards */}
                {/* 206차: 3컬럼 제한 → 최대 4컬럼(플랜 4개가 한 화면 한 줄에 모두 보이도록). 1fr 컬럼이 컨테이너 폭에 맞춰 축소되어 가로 스크롤 없음. */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 4)},1fr)`, gap: 14, maxWidth: plans.length >= 4 ? 1280 : 1040, margin: "0 auto" }}>
                    {plans.map(rawPlan => {
                        const plan = localizePlan(rawPlan);
                        // 187차 — 선택한 계정수(seat)의 기간별 가격 사용(admin 매트릭스 동기화).
                        const seatPeriods = periodsForSeat(plan, seatTier);
                        const period = plan.isCustomQuote ? null : findPeriodIn(seatPeriods, cycleMonths);
                        const monthlyPrice = period?.price_usd ?? (cycleMonths === 12 ? plan.priceAnnual : plan.priceMonthly);
                        const totalCharge = period?.total_charge ?? (monthlyPrice != null ? monthlyPrice * cycleMonths : null);
                        const discountPct = period?.discount_pct ?? (cycleMonths === 12 ? 20 : 0);
                        const isPro = plan.id === "pro";
                        const isSelected = selectedPlanId === plan.id;
                        return (
                            <div key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPlanId(plan.id); } }}
                                aria-pressed={isSelected}
                                style={{
                                    padding: plans.length >= 4 ? "26px 20px" : "36px 28px", borderRadius: 20, position: "relative", textAlign: "left", cursor: "pointer",
                                    background: isPro ? T.proCardBg : T.cardBg,
                                    border: isSelected ? `2px solid ${plan.color}` : (isPro ? `1px solid ${T.proCardBorder}` : `1px solid ${T.cardBorder}`),
                                    transform: isSelected ? "translateY(-4px)" : (isPro ? "scale(1.02)" : "none"),
                                    boxShadow: isSelected ? T.selectedShadow : (isPro && !T.light ? "0 0 60px rgba(99,102,241,0.1)" : (T.light ? "0 1px 3px rgba(15,23,42,0.06)" : "none")),
                                    transition: "all 220ms",
                                }}
                                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = plan.color + (T.light ? "" : "40"); e.currentTarget.style.transform = "translateY(-4px)"; } }}
                                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = isPro ? T.proCardBorder : T.cardBorder; e.currentTarget.style.transform = isPro ? "scale(1.02)" : "none"; } }}
                            >
                                {plan.tag && (
                                    // 187차 — 밝은테마 단색 브랜드색 + data-gp="onColor"(글로벌 override 가 글자 회색강제 → 흰색 복원).
                                    <div data-gp="onColor" style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", padding: "4px 20px", borderRadius: 99, background: T.light ? plan.color : `linear-gradient(135deg,${plan.color},${plan.color}cc)`, fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", letterSpacing: 0.5, boxShadow: `0 0 20px ${plan.color}30` }}>{t(`appPricing.tag.${plan.id}`, plan.tag)}</div>
                                )}
                                {isSelected && (
                                    <div data-gp="onColor" style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: plan.color, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>
                                        ✓ {t("appPricing.selected", "Selected")}
                                    </div>
                                )}
                                <div style={{ fontSize: 11, fontWeight: 700, color: plan.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{plan.dispName}</div>
                                <div style={{ fontSize: 12, color: T.text3, marginBottom: 24, lineHeight: 1.6, minHeight: 38 }}>{plan.dispDesc}</div>

                                <div style={{ marginBottom: 28 }}>
                                    {monthlyPrice !== null && !plan.isCustomQuote ? (
                                        <>
                                            <span style={{ fontSize: 48, fontWeight: 900, color: T.priceText, letterSpacing: -2 }}>${Math.round(monthlyPrice * 100) / 100}</span>
                                            <span style={{ fontSize: 14, color: T.text3, marginLeft: 4 }}>{t("appPricing.perMonth", "/mo")}</span>
                                            <span style={{ fontSize: 11, color: T.text3, marginLeft: 6 }}>{t("appPricing.exclVat", "(VAT 별도)")}</span>
                                            {cycleMonths > 1 && totalCharge != null && (
                                                <div style={{ fontSize: 11, color: T.text3, marginTop: 6 }}>
                                                    {t("appPricing.billedEvery", "Billed every {{months}} months ({{total}})", { months: cycleMonths, total: "$" + Math.round(totalCharge * 100) / 100 })}
                                                    {discountPct > 0 && (
                                                        <span style={{ color: "#16a34a", fontWeight: 700, marginLeft: 6, padding: "1px 7px", borderRadius: 6, background: "rgba(34,197,94,0.12)" }}>
                                                            {t("appPricing.save", "Save {{pct}}%", { pct: discountPct })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 36, fontWeight: 900, color: T.priceText }}>{t("appPricing.custom", "Custom")}</span>
                                    )}
                                </div>

                                <button onClick={(e) => { e.stopPropagation(); checkout(plan); }} disabled={!!loading[plan.id]}
                                    style={{
                                        width: "100%", padding: "14px 0", borderRadius: 12, cursor: loading[plan.id] ? "default" : "pointer",
                                        fontWeight: 800, fontSize: 14, marginBottom: 28, opacity: loading[plan.id] ? 0.6 : 1, transition: "all 200ms",
                                        // 187차 — 밝은테마 비-Pro 버튼은 단색 브랜드색 배경+흰글자(흰배경+흰글자 강제 버그 회피). 다크는 기존 ghost 유지.
                                        border: (isPro || T.light) ? "none" : `1.5px solid ${plan.color}`,
                                        background: isPro ? "linear-gradient(135deg,#4f8ef7,#7c3aed)" : (T.light ? plan.color : (isSelected ? plan.color : T.ghostBtnBg)),
                                        color: (isPro || T.light) ? "#fff" : (isSelected ? "#fff" : plan.color),
                                        boxShadow: isPro ? "0 0 30px rgba(79,142,247,0.25)" : "none",
                                    }}>
                                    {loading[plan.id]
                                        ? t("appPricing.btn.opening", "Opening checkout…")
                                        : (plan.isCustomQuote || !monthlyPrice)
                                            ? t("appPricing.btn.contact", "Contact Sales")
                                            : t("appPricing.btn.start", "Get Started")}
                                </button>

                                {plan.menuAccessCount > 0 && (
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px",
                                        borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                                    }}>
                                        <span style={{ fontSize: 14 }}>🧩</span>
                                        <span style={{ fontSize: 12, color: T.featureText }}>
                                            {t("appPricing.menuAccess", "{{count}} menus & features available", { count: plan.menuAccessCount })}
                                        </span>
                                    </div>
                                )}

                                <div style={{ display: "grid", gap: 10 }}>
                                    {plan.dispFeatures.map((f, i) => (
                                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: T.featureText }}>
                                            <span style={{ color: "#16a34a", marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>{f}
                                        </div>
                                    ))}
                                    {plan.dispNotIncluded.map((f, i) => (
                                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: T.featureMuted }}>
                                            <span style={{ marginTop: 1, flexShrink: 0 }}>✕</span>{f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trust signals */}
                <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
                    {[
                        { k: "secure",  icon: "🔒", title: "Secure Payments", desc: "PCI DSS Level 1 certified via Paddle", color: "#4f8ef7" },
                        { k: "refund",  icon: "↩", title: "30-Day Refund", desc: "Full refund, no questions asked", color: "#22c55e" },
                        { k: "global",  icon: "🌍", title: "Global Billing", desc: "100+ currencies, VAT handled automatically", color: "#a855f7" },
                    ].map(tr => (
                        <div key={tr.k} style={{ padding: "24px 20px", borderRadius: 16, background: T.trustCardBg, border: `1px solid ${T.trustCardBorder}`, textAlign: "center", transition: "border-color 300ms" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = tr.color + "40"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = T.trustCardBorder}>
                            <div style={{ fontSize: 24, marginBottom: 10 }}>{tr.icon}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.trustTitle, marginBottom: 6 }}>{t(`appPricing.trust.${tr.k}.title`, tr.title)}</div>
                            <div style={{ fontSize: 11, color: T.text3 }}>{t(`appPricing.trust.${tr.k}.desc`, tr.desc)}</div>
                        </div>
                    ))}
                </div>

                {/* Comparison button */}
                <div style={{ marginTop: 48 }}>
                    <button onClick={() => setShowComparison(c => !c)} style={{ padding: "12px 28px", borderRadius: 10, border: `1px solid ${T.compBtnBorder}`, background: T.compBtnBg, color: T.compBtnText, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 200ms" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(79,142,247,0.4)"; e.currentTarget.style.color = T.title; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.compBtnBorder; e.currentTarget.style.color = T.compBtnText; }}>
                        {showComparison ? t("appPricing.comparison.hide", "Hide") : t("appPricing.comparison.view", "View")} {t("appPricing.comparison.label", "Full Feature Comparison")} {showComparison ? "↑" : "↓"}
                    </button>
                </div>

                {/* 187차 — admin 동기화 비교표: plan_config.limits(채널/창고/계정 -1=무제한)에서 동적 파생.
                    플랜 수·이름·한도 모두 admin DB 기준 → 사용자 표기와 admin 완벽 일치. */}
                {showComparison && (() => {
                    const unlimited = t("appPricing.unlimited", "Unlimited");
                    const limitRows = [
                        { lk: "channels",   ik: "channels", label: t("appPricing.comparison.row.channels", "Sales channels") },
                        { lk: "warehouses", ik: "wms",      label: t("appPricing.comparison.row.wms",      "Warehouses (WMS)") },
                        { lk: "users",      ik: "members",  label: t("appPricing.comparison.row.members",  "Team accounts") },
                    ];
                    return (
                        <div style={{ marginTop: 32, maxWidth: 900, marginLeft: "auto", marginRight: "auto", borderRadius: 18, overflow: "hidden", border: `1px solid ${T.tableBorder}` }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: T.tableHeadBg }}>
                                        <th style={{ padding: "16px 20px", textAlign: "left", color: T.tableCellText, fontWeight: 600, borderBottom: `1px solid ${T.tableBorder}` }}>{t("appPricing.comparison.feature", "Feature")}</th>
                                        {plans.map(p => (
                                            <th key={p.id} style={{ padding: "16px 20px", textAlign: "center", color: p.color || "#4f8ef7", fontWeight: 700, borderBottom: `1px solid ${T.tableBorder}` }}>{p.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {limitRows.map((row, i) => (
                                        <tr key={row.key} style={{ background: i % 2 === 0 ? "transparent" : T.tableRowAlt }}>
                                            <td style={{ padding: "12px 20px", color: T.tableCellText, borderBottom: `1px solid ${T.tableBorder}` }}>{row.label}</td>
                                            {plans.map(p => {
                                                const v = limitDisplay((p.limits || {})[row.lk], unlimited);
                                                const isUnlim = v === unlimited;
                                                return (
                                                    <td key={p.id} style={{ padding: "12px 20px", textAlign: "center", color: isUnlim ? "#16a34a" : T.tableCellText, fontWeight: isUnlim ? 700 : 600, borderBottom: `1px solid ${T.tableBorder}` }}>{v}</td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

                {/* 186차 — 플랜별 제공 서비스 상세 안내 */}
                <div style={{ marginTop: 72, maxWidth: 980, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: T.guideHeading, letterSpacing: -0.5 }}>{t("appPricing.guide.title", "Detailed services by plan")}</h2>
                        <p style={{ fontSize: 13, color: T.guideSub, marginTop: 8 }}>{t("appPricing.guide.subtitle", "See exactly which services each plan provides.")}</p>
                    </div>
                    <div style={{ display: "grid", gap: 14 }}>
                        {/* 212차 #5 — plan_config(features·menuAccess·limits) 실데이터 동적 안내.
                            admin 이 기능목록/메뉴접근권한/한도 변경 시 즉시 반영(현재 4플랜 Starter/Growth/Pro/Enterprise). */}
                        {plans.map(pl => (
                            <DynamicPlanGuide key={pl.id} plan={pl} t={navT} light={true} lang={lang} />
                        ))}
                    </div>
                </div>

                {/* 212차 #5 — 플랜별 메뉴 접근 권한 읽기전용 비교표(admin 설정 실시간 반영) */}
                <PlanMenuAccessMatrix plans={plans} t={navT} light={true} lang={lang} />

                {/* FAQ */}
                <div style={{ marginTop: 80, maxWidth: 720, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                    <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 900, color: T.title, letterSpacing: -0.5 }}>{t("appPricing.faq.title", "Frequently Asked Questions")}</h2>
                    </div>
                    {FAQS.map((item, i) => (
                        <div key={item.key} style={{ borderBottom: `1px solid ${T.faqBorder}` }}>
                            <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "20px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: T.faqQ, fontSize: 14, fontWeight: 700 }}>
                                {t(`appPricing.faq.${item.key}.q`, item.q)}
                                <span style={{ fontSize: 20, color: T.text3, transition: "transform 300ms", transform: faqOpen === i ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</span>
                            </button>
                            <div style={{ maxHeight: faqOpen === i ? 320 : 0, overflow: "hidden", transition: "max-height 300ms ease-in-out" }}>
                                <div style={{ fontSize: 13, color: T.faqA, lineHeight: 1.9, paddingBottom: 20 }}>{t(`appPricing.faq.${item.key}.a`, item.a)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legal */}
                <p style={{ marginTop: 56, fontSize: 11, color: T.legalText, lineHeight: 1.8 }}>
                    {t("appPricing.legal.agree", "By purchasing, you agree to our")}{" "}
                    <Link to="/terms" style={{ color: T.link }}>{t("appPricing.legal.terms", "Terms of Service")}</Link> {t("appPricing.legal.and", "and")}{" "}
                    <Link to="/privacy" style={{ color: T.link }}>{t("appPricing.legal.privacy", "Privacy Policy")}</Link>.<br />
                    {t("appPricing.legal.usd", "All prices in USD.")} <strong style={{ color: T.legalStrong }}>{t("appPricing.cardOnly", "Card payments only")}</strong>. {t("appPricing.legal.tax", "All prices exclude VAT (VAT 별도). Applicable VAT/tax (10% in Korea) is added at checkout based on your location and included in the final charge. Powered by Paddle.com (Merchant of Record).")}
                </p>
            </div>
        </section>
    );

    // 187차 — 앱 내부(/app-pricing)는 밝은 컨테이너로 직접 렌더(앱 셸이 헤더/사이드바 제공).
    if (isAppContext) {
        // 187차 — id=genie-pricing-root: styles.css 끝 가독성 override(ID specificity)의 스코프 앵커.
        return <div id="genie-pricing-root" className="genie-pricing-root" style={{ minHeight: "100%", background: T.pageBg, color: T.title, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>{inner}</div>;
    }
    // 187차 — 공개 /pricing: 프리미엄 라이트 레이아웃(랜딩/소개와 일관).
    return <PremiumLayout><div id="genie-pricing-root" className="genie-pricing-root">{inner}</div></PremiumLayout>;
}
