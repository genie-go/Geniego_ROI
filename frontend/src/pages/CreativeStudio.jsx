import React, { useState, useEffect } from "react";
import { useT } from "../i18n/index.js";

/* ─── Category ID List (Order Maintain) ─── */
const CATEGORY_IDS = [
    "overseas_ship", "overseas_buy", "beauty", "food",
    "fashion", "general", "electronics", "sports", "platform",
];

/* ─── Icon/Color/adHints/fields는 Language 독립 ─── */
const CATEGORY_META = {
    overseas_ship: {
        icon: "🚢", color: "#1565c0",
        fields: [
            { key: "service_name", type: "text", required: true },
            { key: "origin", type: "select", options: ["미국", "일본", "독일", "영국", "프랑스", "in progress국", "캐나다", "호주"] },
            { key: "delivery_days", type: "text" },
            { key: "weight_limit", type: "text" },
            { key: "fee_structure", type: "text" },
            { key: "special_feature", type: "textarea" },
            { key: "target_product", type: "text" },
            { key: "price", type: "text" },
            { key: "badge", type: "text" },
        ],
    },
    overseas_buy: {
        icon: "🛒", color: "#7b1fa2",
        fields: [
            { key: "service_name", type: "text", required: true },
            { key: "source_sites", type: "text" },
            { key: "commission_rate", type: "text" },
            { key: "min_amount", type: "text" },
            { key: "delivery_days", type: "text" },
            { key: "special_feature", type: "textarea" },
            { key: "category_focus", type: "text" },
            { key: "price", type: "text" },
            { key: "badge", type: "text" },
        ],
    },
    beauty: {
        icon: "💄", color: "#e91e8c",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "skin_type", type: "select", options: ["All 피부 타입", "건성", "지성", "복합성", "민감성", "트러블성"] },
            { key: "key_ingredient", type: "text" },
            { key: "skin_concern", type: "text" },
            { key: "texture", type: "text" },
            { key: "volume", type: "text" },
            { key: "certification", type: "text" },
            { key: "price", type: "number" },
            { key: "badge", type: "text" },
        ],
    },
    food: {
        icon: "🥗", color: "#388e3c",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "category", type: "select", options: ["건강Feature식품", "가공식품", "신선식품", "유기농·친환경", "다이어트식품", "영양제·보충제", "음료"] },
            { key: "main_ingredient", type: "text" },
            { key: "effect", type: "text" },
            { key: "amount", type: "text" },
            { key: "certification", type: "text" },
            { key: "target", type: "text" },
            { key: "price", type: "number" },
            { key: "badge", type: "text" },
        ],
    },
    fashion: {
        icon: "👗", color: "#424242",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "gender", type: "select", options: ["공용", "여성", "남성"] },
            { key: "season", type: "select", options: ["봄/여름", "가을/겨울", "사계절"] },
            { key: "material", type: "text" },
            { key: "style", type: "text" },
            { key: "size_range", type: "text" },
            { key: "colors", type: "text" },
            { key: "price", type: "number" },
            { key: "badge", type: "text" },
        ],
    },
    general: {
        icon: "🛍", color: "#0288d1",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "usage", type: "text" },
            { key: "feature", type: "text" },
            { key: "spec", type: "text" },
            { key: "material", type: "text" },
            { key: "target", type: "text" },
            { key: "price", type: "number" },
            { key: "badge", type: "text" },
        ],
    },
    electronics: {
        icon: "📱", color: "#1565c0",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "model", type: "text" },
            { key: "key_spec", type: "text" },
            { key: "compatibility", type: "text" },
            { key: "connectivity", type: "text" },
            { key: "warranty", type: "text" },
            { key: "price", type: "number" },
            { key: "badge", type: "text" },
        ],
    },
    sports: {
        icon: "⚽", color: "#c62828",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "sport_type", type: "text" },
            { key: "level", type: "select", options: ["입문자", "in progress급자", "전문가", "All"] },
            { key: "material", type: "text" },
            { key: "feature", type: "text" },
            { key: "size_range", type: "text" },
            { key: "price", type: "number" },
            { key: "badge", type: "text" },
        ],
    },
    platform: {
        icon: "🧩", color: "#7c3aed",
        fields: [
            { key: "product_name", type: "text", required: true },
            { key: "platform_type", type: "select", options: ["SaaS", "PaaS", "IaaS", "B2B 솔루션", "API 서비스", "CRM/ERP", "데이터 Platform"] },
            { key: "target_biz", type: "text" },
            { key: "key_feature", type: "text" },
            { key: "integration", type: "text" },
            { key: "pricing_model", type: "select", options: ["Subscription형(월정액)", "사Capacity 기반", "기업 협의", "Free+Paid"] },
            { key: "trial", type: "text" },
            { key: "price", type: "text" },
            { key: "badge", type: "text" },
        ],
    },
};

/* ─── Field label/placeholder (한국어 Basic, 번역 범위 제외) ─── */
const FIELD_META = {
    service_name: { label: "서비스명", placeholder: "예: 배송대행 서비스" },
    product_name: { label: "Product Name", placeholder: "예: 히알루론산 Count분크림 50ml" },
    origin: { label: "출발 Country", placeholder: "출발 Country Select" },
    delivery_days: { label: "배송 일Count", placeholder: "예: 7~14일" },
    weight_limit: { label: "in progress량 Limit", placeholder: "예: Max 30kg" },
    fee_structure: { label: "Pricing 구조", placeholder: "예: 1kg당 7,900원" },
    special_feature: { label: "특장점", placeholder: "특장점 입력" },
    target_product: { label: "주요 취급 Product", placeholder: "예: 의류, 전자기기" },
    price: { label: "Price", placeholder: "예: 45000" },
    badge: { label: "홍보 뱃지", placeholder: "예: BEST / 신제품" },
    source_sites: { label: "취급 쇼핑몰", placeholder: "예: 아마존, Zara" },
    commission_rate: { label: "Commission율", placeholder: "예: 10%" },
    min_amount: { label: "Min OrdersAmount", placeholder: "예: $10 이상" },
    category_focus: { label: "주력 Category", placeholder: "예: 패션, 건강식품" },
    skin_type: { label: "피부타입", placeholder: "피부타입 Select" },
    key_ingredient: { label: "핵심 성분", placeholder: "예: 히알루론산" },
    skin_concern: { label: "피부 고민", placeholder: "예: 건조함, 주름" },
    texture: { label: "제형·사용감", placeholder: "예: 가벼운 Count분젤" },
    volume: { label: "Capacity", placeholder: "예: 50ml" },
    certification: { label: "인증·특징", placeholder: "예: 비건 인증" },
    category: { label: "식품 분류", placeholder: "분류 Select" },
    main_ingredient: { label: "주요 원료", placeholder: "예: 6년근 홍삼" },
    effect: { label: "Feature·효능", placeholder: "예: 면역력 증진" },
    amount: { label: "Capacity·Quantity", placeholder: "예: 30포" },
    target: { label: "Recommend 대상", placeholder: "예: 40~60대" },
    gender: { label: "성per", placeholder: "성per Select" },
    season: { label: "시즌", placeholder: "시즌 Select" },
    material: { label: "소재", placeholder: "예: 울 80%" },
    style: { label: "Style", placeholder: "예: 미니멀" },
    size_range: { label: "사이즈 범위", placeholder: "예: S~XXL" },
    colors: { label: "컬러", placeholder: "예: 블랙, 아이보리" },
    usage: { label: "사용 용도", placeholder: "예: 가정용 청소" },
    feature: { label: "주요 Feature", placeholder: "예: 무선 충전" },
    spec: { label: "규격·Capacity", placeholder: "예: 배터리 45분" },
    model: { label: "모델명", placeholder: "예: XBF-900S" },
    key_spec: { label: "핵심 스펙", placeholder: "예: ANC 30dB" },
    compatibility: { label: "호환성", placeholder: "예: iOS / Android" },
    connectivity: { label: "Connect 방식", placeholder: "예: Bluetooth 5.3" },
    warranty: { label: "보증·AS", placeholder: "예: 정품 1년 보증" },
    sport_type: { label: "운동 종목", placeholder: "예: 러닝, 등산" },
    level: { label: "User 레벨", placeholder: "레벨 Select" },
    headline_custom: { label: "Ad 헤드라인 (직접 입력)", placeholder: "예: 복잡한 해외직구, 이제 맡기세요" },
    body_custom: { label: "Ad 본문 (직접 입력)", placeholder: "예: 미국·일본 현지 Count령부터 Domestic 문앞까지 ONE-STOP 서비스" },
};

const AD_COPY_POOL = {
    overseas_ship: { hl: ["해외직구, 이제 맡기세요", "미국·일본 현지 Count령, Domestic 문앞까지", "빠르고 안전한 해외배송 대행"], body: ["해외 쇼핑몰 Product을 현지에서 Count령해 Domestic로 안전하게 배송합니다.", "복잡한 통관·관세 걱정 없이 Link만 보내주세요."], cta: ["지금 신청하기", "Free 회Cost Price입", "배송비 계산하기"], colors: ["#1565c0", "#42a5f5"] },
    overseas_buy: { hl: ["해외 명품, 대신 구매해드립니다", "아마존·ASOS 대신 사드려요", "Link 하나로 해외 직구 Done"], body: ["해외 사이트 Payment가 어렵다면? Link만 보내주시면 대신 구매해드립니다.", "10% Commission로 전 세계 쇼핑몰 Product을 구매 대행합니다."], cta: ["구매 의뢰하기", "Link 보내기", "바로 Start하기"], colors: ["#7b1fa2", "#ce93d8"] },
    beauty: { hl: ["피부가 달라지는 경험", "Advanced 스킨케어를 일상으로", "하루 10분, 피부의 결이 달라집니다"], body: ["엄선된 성분으로 만들어진 스킨케어로 피부 건강을 지키세요.", "자연에서 영감 받은 포뮬러, 피부 손상 없는 메이크업."], cta: ["지금 구매하기", "Free 샘플 신청", "피부 타입 Test"], colors: ["#e91e8c", "#ff6b9d"] },
    food: { hl: ["건강하게 먹는 행복", "자연이 담은 풍성한 맛", "내 몸을 위한 첫 번째 Select"], body: ["엄선된 신선한 재료로 만들어진 건강식품. 매일 내 몸을 챙기세요.", "식약처 인정 Feature성 성분으로 건강을 Management하세요."], cta: ["지금 Orders하기", "구매하기", "할인가 Confirm"], colors: ["#388e3c", "#81c784"] },
    fashion: { hl: ["이번 시즌 필 아이템", "당신의 Style을 완성하는 한 가지", "Today도 트렌디하게"], body: ["계절에 맞는 트렌디한 패션으로 매일을 세련되게 연출하세요.", "오피스부터 캐주얼까지, 어울리는 Style링."], cta: ["컬렉션 보기", "지금 구매", "상세 보기"], colors: ["#424242", "#9e9e9e"] },
    general: { hl: ["일상을 더 편리하게", "집에 있어야 할 Basic 아이템", "한번 써보면 못 돌아와요"], body: ["일상을 리치하게 만들어줄 스마트한 생활용품.", "한번 쓰면 돌아올 Count 없는 일상 필품 아이템."], cta: ["지금 구매", "할인가 Confirm", "상세Page 보기"], colors: ["#0288d1", "#4fc3f7"] },
    electronics: { hl: ["기술이 달라지면 일상이 달라진다", "테크 라이프Style 업그레이드", "더 나은 하루를 위한 Select"], body: ["Latest 기술로 더 편리해진 일상을 경험하세요.", "프리미엄 스펙, 합리적인 Price으로 만나는 테크 제품."], cta: ["제품 보기", "지금 구매", "스펙 Confirm"], colors: ["#1565c0", "#42a5f5"] },
    sports: { hl: ["한계를 넘어야 할 순간", "당신의 퍼포먼스를 끌어올려라", "더 멀리, 더 빠르게"], body: ["Pro 선Count에게도 Select받는 장비로 당신만의 루틴을 만들어 보세요.", "강력한 퍼포먼스로 Goal를 달성하세요."], cta: ["지금 업그레이드", "구매하기", "한정 특가 Confirm"], colors: ["#c62828", "#ef9a9a"] },
    platform: { hl: ["비즈니스를 한 단계 위로", "스마트한 Team을 위한 Select", "복잡한 업무, 이제 Auto화하세요"], body: ["클라우드 기반 Platform으로 Team 생산성을 극대화하세요.", "API Integration 한 번으로 모든 업무 시스템을 Connect하세요."], cta: ["Free 체험 Start", "Demo 신청", "사Capacity Unlimited 플랜"], colors: ["#7c3aed", "#a78bfa"] },
};

const CHANNELS = [
    { id: "meta", label: "Meta(Facebook·Instagram)", icon: "📘", color: "#1877f2" },
    { id: "instagram", label: "Instagram", icon: "📸", color: "#e1306c" },
    { id: "tiktok", label: "TikTok", icon: "🎵", color: "#ff0050" },
    { id: "naver", label: "Naver Ads", icon: "🟩", color: "#03c75a" },
    { id: "kakao", label: "Kakao Ads", icon: "💛", color: "#f5a623" },
    { id: "google", label: "Google·YouTube", icon: "🔍", color: "#4285f4" },
];

const FORMATS = {
    meta: [{ name: "Square Feed", w: 250, h: 250, ratio: "1:1" }, { name: "Story", w: 141, h: 250, ratio: "9:16" }],
    instagram: [{ name: "Feed Square", w: 250, h: 250, ratio: "1:1" }, { name: "Reels", w: 141, h: 250, ratio: "9:16" }],
    tiktok: [{ name: "In-Feed", w: 141, h: 250, ratio: "9:16" }],
    naver: [{ name: "Display", w: 260, h: 195, ratio: "4:3" }, { name: "Banner", w: 300, h: 90, ratio: "16:5" }],
    kakao: [{ name: "Business Card", w: 250, h: 250, ratio: "1:1" }, { name: "Channel", w: 195, h: 260, ratio: "3:4" }],
    google: [{ name: "Banner", w: 280, h: 157, ratio: "16:9" }, { name: "Square", w: 200, h: 200, ratio: "1:1" }],
};

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildCreative(formData, catId) {
    const pool = AD_COPY_POOL[catId] || AD_COPY_POOL.general;
    const meta = CATEGORY_META[catId];
    const seed = Date.now() % 9999;
    const productName = formData.product_name || formData.service_name || "";
    return {
        headline: formData.headline_custom || rnd(pool.hl),
        body: formData.body_custom || rnd(pool.body),
        cta: rnd(pool.cta),
        colors: pool.colors,
        img1x1: `https://picsum.photos/seed/${seed}/800/800`,
        img9x16: `https://picsum.photos/seed/${seed + 1}/450/800`,
        img4x3: `https://picsum.photos/seed/${seed + 2}/800/600`,
        img16x9: `https://picsum.photos/seed/${seed + 3}/1200/675`,
        productName, price: formData.price || "", badge: formData.badge || "",
        catIcon: meta?.icon || "🏷",
    };
}

function getImg(creative, ratio) {
    if (ratio === "9:16") return creative.img9x16;
    if (ratio === "4:3") return creative.img4x3;
    if (ratio === "16:9" || ratio === "16:5") return creative.img16x9;
    return creative.img1x1;
}

function AdPreviewCard({ fmt, creative, ch }) {
    const [c1, c2] = creative.colors;
    const imgUrl = getImg(creative, fmt.ratio);
    const isTall = fmt.ratio === "9:16";
    const isWide = fmt.ratio === "16:9" || fmt.ratio === "16:5";
    return (
        <div style={{ width: fmt.w + 20, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 5, fontWeight: 600 }}>{ch.icon} {fmt.name} ({fmt.ratio})</div>
            <div style={{ width: fmt.w, height: fmt.h, borderRadius: 10, overflow: "hidden", position: "relative", border: `2px solid ${ch.color}55`, boxShadow: `0 4px 20px ${ch.color}22` }}>
                <img src={imgUrl} alt="ad" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 30%,rgba(8,10,24,0.9) 100%)" }} />
                {creative.badge && (<div style={{ position: "absolute", top: 8, right: 8, background: c1, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 6 }}>{creative.badge}</div>)}
                <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, background: "rgba(0,0,0,0.5)", borderRadius: 6, padding: "2px 5px" }}>{ch.icon}</span>
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: isTall ? "10px 10px 14px" : "7px 8px 9px" }}>
                    <div style={{ fontWeight: 900, fontSize: isTall ? 13 : isWide ? 9 : 11, color: "#fff", lineHeight: 1.3, marginBottom: 3 }}>{creative.headline}</div>
                    {!isWide && (<div style={{ fontSize: isTall ? 9 : 8, color: "rgba(255,255,255,0.7)", lineHeight: 1.3, marginBottom: 5 }}>{creative.body.slice(0, 45)}…</div>)}
                    {creative.price && (<div style={{ fontSize: isTall ? 11 : 9, fontWeight: 800, color: c2 || "#fff", marginBottom: 4 }}>{isNaN(creative.price) ? creative.price : Number(creative.price).toLocaleString("ko-KR") + "원"}</div>)}
                    <div style={{ display: "inline-block", padding: isWide ? "2px 7px" : "4px 10px", borderRadius: 99, fontSize: isTall ? 10 : 8, fontWeight: 800, color: "#fff", background: `linear-gradient(90deg,${c1},${c2 || c1}cc)` }}>{creative.cta} →</div>
                </div>
            </div>
        </div>
    );
}

function DynamicField({ field, value, onChange, inp }) {
    const fm = FIELD_META[field.key] || { label: field.key, placeholder: "" };
    if (field.type === "select") {
        return (
            <select style={inp} value={value || ""} onChange={e => onChange(field.key, e.target.value)}>
                <option value="">{fm.placeholder}</option>
                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }
    if (field.type === "textarea") {
        return <textarea style={{ ...inp, height: 64, resize: "vertical" }} placeholder={fm.placeholder} value={value || ""} onChange={e => onChange(field.key, e.target.value)} />;
    }
    return <input type={field.type || "text"} style={inp} placeholder={fm.placeholder} value={value || ""} onChange={e => onChange(field.key, e.target.value)} />;
}

export default function CreativeStudio({ onUseCampaign }) {
    const t = useT();
    const card = { background: "var(--card)", border: "1px solid rgba(99,140,255,0.12)", borderRadius: 14, padding: 20 };
    const inp = { width: "100%", background: "rgba(15,20,40,0.7)", border: "1px solid rgba(99,140,255,0.2)", borderRadius: 8, color: "var(--text-1)", padding: "8px 12px", fontSize: 12, boxSizing: "border-box" };
    const lbl = (text, required) => (<div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 5 }}>{text}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}</div>);

    const [selCatId, setSelCatId] = useState("");
    const [formData, setFormData] = useState({});
    const [selCh, setSelCh] = useState(["meta", "instagram", "tiktok"]);
    const [creative, setCreative] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copyMsg, setCopyMsg] = useState("");
    const [viewCopySection, setViewCopySection] = useState(false);

    useEffect(() => { setFormData({}); setCreative(null); }, [selCatId]);

    const setField = (key, val) => setFormData(p => ({ ...p, [key]: val }));
    const toggleCh = (id) => setSelCh(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const catMeta = selCatId ? CATEGORY_META[selCatId] : null;
    const catLabel = selCatId ? t(`creativeStudio.cat_${selCatId}`) : "";
    const catDesc = selCatId ? t(`creativeStudio.cat_${selCatId}_desc`) : "";

    const generate = async () => {
        if (!selCatId) { alert(t("creativeStudio.selectFirst")); return; }
        const nameKey = catMeta?.fields.find(f => f.required)?.key;
        if (nameKey && !formData[nameKey]) { alert(t("creativeStudio.selectFirst")); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 2000));
        setCreative(buildCreative(formData, selCatId));
        setViewCopySection(true);
        setLoading(false);
    };

    const copyText = (text) => {
        navigator.clipboard?.writeText(text).catch(() => { });
        setCopyMsg("✅ " + t("marketingIntel.adCopy"));
        setTimeout(() => setCopyMsg(""), 1500);
    };

    return (
        <div style={{ display: "grid", gap: 18, maxWidth: 1100 }}>
            {/* Header */}
            <div style={{ ...card, padding: "22px 24px", background: "linear-gradient(135deg,rgba(233,30,140,0.07),rgba(99,102,241,0.07))", borderColor: "rgba(233,30,140,0.2)" }}>
                <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 4 }}>{t("marketingIntel.adCreativeTitle")}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t("marketingIntel.adCreativeSub")}</div>
            </div>

            {/* ① Category Select */}
            <div style={card}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#a855f7", marginBottom: 12 }}>
                    {t("creativeStudio.selectStep")} <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 400 }}>— {t("creativeStudio.selectStepHint")}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 8 }}>
                    {CATEGORY_IDS.map(id => {
                        const meta = CATEGORY_META[id];
                        const label = t(`creativeStudio.cat_${id}`);
                        const desc = t(`creativeStudio.cat_${id}_desc`);
                        return (
                            <button key={id} onClick={() => setSelCatId(id)} style={{
                                padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                                background: selCatId === id ? `${meta.color}18` : "rgba(15,20,40,0.5)",
                                border: `1px solid ${selCatId === id ? meta.color + "77" : "rgba(99,140,255,0.1)"}`,
                                transition: "all 150ms",
                            }}>
                                <div style={{ fontSize: 22, marginBottom: 4 }}>{meta.icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: selCatId === id ? meta.color : "var(--text-1)" }}>{label}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                                {selCatId === id && <div style={{ fontSize: 10, color: meta.color, marginTop: 4, fontWeight: 700 }}>{t("creativeStudio.selectedLabel")}</div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ② Product Info 입력 */}
            {catMeta && (
                <div style={{ ...card, borderColor: catMeta.color + "44" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: catMeta.color }}>{catMeta.icon} {catLabel}</span>
                        <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{t("creativeStudio.productInfo")}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14, padding: "6px 10px", borderRadius: 8, background: `${catMeta.color}0d`, border: `1px solid ${catMeta.color}22` }}>
                        {t("creativeStudio.categoryOptimized", { cat: catLabel })}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {catMeta.fields.map(field => {
                            const fm = FIELD_META[field.key] || { label: field.key };
                            const isWide = field.type === "textarea" || ["special_feature", "feature", "key_ingredient"].includes(field.key);
                            return (
                                <div key={field.key} style={isWide ? { gridColumn: "1 / -1" } : {}}>
                                    {lbl(fm.label, field.required)}
                                    <DynamicField field={field} value={formData[field.key]} onChange={setField} inp={inp} />
                                </div>
                            );
                        })}
                    </div>
                    {/* Ad 힌트 */}
                    <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.15)" }}>
                        <div style={{ fontSize: 10, color: "#4f8ef7", fontWeight: 700, marginBottom: 8 }}>{t("creativeStudio.adTipTitle")}</div>
                        <div style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--text-3)" }}>
                            <div>{t("creativeStudio.headlineHint")} {catLabel}</div>
                            <div>{t("creativeStudio.bodyHint")} {catDesc}</div>
                            <div>{t("creativeStudio.ctaHint")} —</div>
                        </div>
                    </div>
                    {/* 직접 입력 */}
                    <div style={{ marginTop: 12 }}>
                        <details style={{ cursor: "pointer" }}>
                            <summary style={{ fontSize: 11, color: "#4f8ef7", fontWeight: 600, userSelect: "none", padding: "6px 0" }}>{t("creativeStudio.customCopyToggle")}</summary>
                            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                                <div>
                                    {lbl(t("creativeStudio.customHeadline"))}
                                    <input style={inp} placeholder={FIELD_META.headline_custom.placeholder} value={formData.headline_custom || ""} onChange={e => setField("headline_custom", e.target.value)} />
                                </div>
                                <div>
                                    {lbl(t("creativeStudio.customBody"))}
                                    <textarea style={{ ...inp, height: 60, resize: "vertical" }} placeholder={FIELD_META.body_custom.placeholder} value={formData.body_custom || ""} onChange={e => setField("body_custom", e.target.value)} />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}

            {/* ③ Channel Select */}
            {catMeta && (
                <div style={card}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#22c55e", marginBottom: 12 }}>{t("creativeStudio.channelStep")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 7 }}>
                        {CHANNELS.map(ch => (
                            <button key={ch.id} onClick={() => toggleCh(ch.id)} style={{
                                padding: "9px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", fontSize: 11, fontWeight: 700, display: "flex", gap: 8, alignItems: "center",
                                background: selCh.includes(ch.id) ? `${ch.color}18` : "rgba(15,20,40,0.5)",
                                border: `1px solid ${selCh.includes(ch.id) ? ch.color + "66" : "rgba(99,140,255,0.1)"}`,
                                color: selCh.includes(ch.id) ? ch.color : "var(--text-2)",
                            }}>
                                <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                <span style={{ flex: 1 }}>{ch.label}</span>
                                {selCh.includes(ch.id) && <span>✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Button */}
            {catMeta && (
                <button onClick={generate} disabled={loading} style={{
                    padding: "14px 0", borderRadius: 12, border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? "rgba(99,140,255,0.2)" : `linear-gradient(135deg,${catMeta.color},#a855f7,#4f8ef7)`,
                    color: "#fff", fontWeight: 900, fontSize: 14,
                    boxShadow: loading ? "none" : `0 4px 20px ${catMeta.color}44`,
                    transition: "all 200ms",
                }}>
                    {loading ? t("marketingIntel.adGenerating") : t("marketingIntel.adGenerate")}
                </button>
            )}

            {/* ④ 결과 */}
            {creative && viewCopySection && (
                <div style={{ display: "grid", gap: 14 }}>
                    <div style={card}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#4f8ef7", marginBottom: 14 }}>
                            {t("marketingIntel.adResult")}
                            {copyMsg && <span style={{ fontSize: 11, color: "#22c55e", marginLeft: 8 }}>{copyMsg}</span>}
                        </div>
                        {[
                            { label: t("marketingIntel.adHeadline"), val: creative.headline, big: true },
                            { label: t("marketingIntel.adBody"), val: creative.body },
                            { label: t("marketingIntel.adCtaLabel"), val: creative.cta },
                        ].map(({ label, val, big }) => (
                            <div key={label} style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(15,20,40,0.6)", border: "1px solid rgba(99,140,255,0.12)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</span>
                                    <button onClick={() => copyText(val)} style={{ fontSize: 9, color: "#4f8ef7", background: "rgba(79,142,247,0.1)", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>{t("marketingIntel.adCopy")}</button>
                                </div>
                                <div style={{ fontSize: big ? 14 : 11, fontWeight: big ? 800 : 400, color: "var(--text-1)", lineHeight: 1.5 }}>{val}</div>
                            </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                            <button onClick={generate} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#4f8ef7", cursor: "pointer", fontWeight: 700 }}>{t("marketingIntel.adRegenerate")}</button>
                            {onUseCampaign && (
                                <button onClick={() => onUseCampaign(selCatId, selCh)} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                                    🚀 {t("marketingIntel.adGenerate")}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Channelper 미리보기 */}
                    {selCh.map(chId => {
                        const ch = CHANNELS.find(c => c.id === chId);
                        const fmts = FORMATS[chId] || [];
                        if (!ch || !fmts.length) return null;
                        return (
                            <div key={chId} style={{ ...card, borderColor: ch.color + "44" }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: ch.color, marginBottom: 12 }}>
                                    {ch.icon} {t("creativeStudio.adPreviewLabel", { ch: ch.label })}
                                    <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 8, fontWeight: 400 }}>{t("creativeStudio.adFormatCount", { n: fmts.length })}</span>
                                </div>
                                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                    {fmts.map((fmt, i) => <AdPreviewCard key={i} fmt={fmt} creative={creative} ch={ch} />)}
                                </div>
                                <div style={{ marginTop: 12, padding: "7px 12px", borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 10, color: "#22c55e" }}>
                                    {t("creativeStudio.adSpec", { ch: ch.label, n: fmts.length })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Select 안내 */}
            {!selCatId && (
                <div style={{ ...card, textAlign: "center", padding: 48 }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>🏷</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>{t("creativeStudio.selectFirst")}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t("creativeStudio.selectFirstDesc")}</div>
                </div>
            )}
        </div>
    );
}
