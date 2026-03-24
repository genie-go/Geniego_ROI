import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useI18n } from '../i18n';
import useDemo from '../hooks/useDemo';
import { useGlobalData } from '../context/GlobalDataContext';

/* ── 모바일 감지 훅 ────────────────────────────── */
function useIsMobile(bp = 768) {
    const [m, setM] = useState(() => window.innerWidth <= bp);
    useEffect(() => {
        const h = () => setM(window.innerWidth <= bp);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [bp]);
    return m;
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const CHANNELS = [
    // ── Domestic Channel ────────────────────────────────────────────────────────────
    { id: "coupang",       name: "Coupang Wing",          icon: "🇰🇷", color: "#00bae5" },
    { id: "naver",         name: "Naver Smart Store",      icon: "🟢",  color: "#03c75a" },
    { id: "11st",          name: "11Street",                 icon: "🏬",  color: "#ff0000" },
    { id: "gmarket",       name: "Gmarket",                  icon: "🛍️",  color: "#e83e0b" },
    { id: "kakao_commerce",name: "Kakao Commerce",            icon: "🟡",  color: "#ffd400" },
    { id: "cafe24",        name: "Cafe24",                 icon: "🏪",  color: "#0068ff" },
    { id: "wemakeprice",   name: "WeMakePrice",                  icon: "🔵",  color: "#2d5bff" },
    { id: "interpark",     name: "Interpark",                icon: "🟠",  color: "#ff7400" },
    { id: "lotteon",       name: "Lotte ON",                  icon: "🏢",  color: "#e60012" },
    { id: "own_mall",      name: "Own Mall",                  icon: "🏠",  color: "#6366f1" },
    // ── Global Channel ──────────────────────────────────────────────────────────
    { id: "shopify",       name: "Shopify",                icon: "🛒",  color: "#96bf48" },
    { id: "amazon",        name: "Amazon SP-API",          icon: "📦",  color: "#ff9900" },
    { id: "tiktok",        name: "TikTok Shop",            icon: "🎵",  color: "#ff0050" },
    { id: "rakuten",       name: "Rakuten",                icon: "🇯🇵",  color: "#bf0000" },
    { id: "lazada",        name: "Lazada",                 icon: "🌏",  color: "#0f146b" },
    { id: "qoo10",         name: "Qoo10",                  icon: "🟪",  color: "#9b249f" },
    { id: "zalando",       name: "Zalando",                icon: "🇩🇪",  color: "#ff6900" },
];

/* ─── Channelper Commission/Tax Settings (모든 판매Channel Auto Apply) ──────────────────────────── */
// Commission: Channel이 판매자에게 부과하는 판매 Commission율
// vat: 해당 Channel/Country에서 부가되는 Tax(VAT/GST)율 (Sale Price 계산 시 포함)
const CHANNEL_RATES = {
    // ── Domestic Channel ────────────────────────────────────────────────────────────
    coupang:        { commission: 0.11, vat: 0.10, label: "Coupang Wing",       region: "Domestic",   icon: "🇰🇷" },
    naver:          { commission: 0.05, vat: 0.10, label: "Naver Smart Store",  region: "Domestic",   icon: "🟢"  },
    "11st":         { commission: 0.12, vat: 0.10, label: "11Street",             region: "Domestic",   icon: "🏬"  },
    gmarket:        { commission: 0.12, vat: 0.10, label: "Gmarket",              region: "Domestic",   icon: "🛍️"  },
    kakao_commerce: { commission: 0.10, vat: 0.10, label: "Kakao Commerce",        region: "Domestic",   icon: "🟡"  },
    cafe24:         { commission: 0.03, vat: 0.10, label: "Cafe24",             region: "Domestic",   icon: "🏪"  },
    wemakeprice:    { commission: 0.11, vat: 0.10, label: "WeMakePrice",              region: "Domestic",   icon: "🔵"  },
    interpark:      { commission: 0.09, vat: 0.10, label: "Interpark",            region: "Domestic",   icon: "🟠"  },
    lotteon:        { commission: 0.10, vat: 0.10, label: "Lotte ON",              region: "Domestic",   icon: "🏢"  },
    own_mall:       { commission: 0.00, vat: 0.10, label: "Own Mall",              region: "Domestic",   icon: "🏠"  },
    // ── Global Channel ──────────────────────────────────────────────────────────
    shopify:        { commission: 0.02, vat: 0.00, label: "Shopify",            region: "Global", icon: "🛒"  },
    amazon:         { commission: 0.15, vat: 0.00, label: "Amazon SP-API",      region: "Global", icon: "📦"  },
    tiktok:         { commission: 0.08, vat: 0.00, label: "TikTok Shop",        region: "Global", icon: "🎵"  },
    rakuten:        { commission: 0.08, vat: 0.10, label: "Rakuten",            region: "Japan",   icon: "🇯🇵"  },
    lazada:         { commission: 0.04, vat: 0.07, label: "Lazada",             region: "SE Asia", icon: "🌏"  },
    qoo10:          { commission: 0.10, vat: 0.09, label: "Qoo10",              region: "Global", icon: "🟪"  },
    zalando:        { commission: 0.20, vat: 0.19, label: "Zalando",            region: "Europe",   icon: "🇩🇪"  },
};

/* RecommendSale Price 계산: cost / (1 - commission - vat - margin)
 * fallback: Register되지 않은 Channel은 Commission 10% + Tax 0%로 처리 */
const calcRecommendedPrice = (productCost, channelId, marginRate) => {
    const r = CHANNEL_RATES[channelId] || { commission: 0.10, vat: 0.00 };
    const denom = 1 - r.commission - r.vat - (marginRate / 100);
    if (denom <= 0) return productCost * 3; // 안전장치
    return Math.ceil(productCost / denom / 100) * 100; // 100원 Unit 반올림
};

const CATEGORIES = [
    { id: "", label: "Select Category" },
    { id: "electronics/audio", label: "Electronics > Audio" },
    { id: "electronics/input", label: "Electronics > Input Devices" },
    { id: "electronics/peripherals", label: "Electronics > Peripherals" },
    { id: "electronics/camera", label: "Electronics > Camera" },
    { id: "electronics/charging", label: "Electronics > Charging" },
    { id: "fashion/clothing", label: "Fashion > Clothing" },
    { id: "fashion/accessories", label: "Fashion > Accessories" },
    { id: "beauty/skincare", label: "Beauty > Skincare" },
    { id: "beauty/makeup", label: "Beauty > Makeup" },
    { id: "food/health", label: "Food > Health Supplements" },
    { id: "living/kitchen", label: "Living > Kitchen" },
    { id: "sports/equipment", label: "Sports > Equipment" },
    { id: "books/stationery", label: "Books & Stationery" },
    { id: "toys/hobbies", label: "Toys & Hobbies" },
];

const SYNC_SCOPES = [
    { id: "catalog", label: "Catalog", icon: "📚", desc: "Basic product info, category mapping, brand" },
    { id: "options", label: "Options/Variants", icon: "🎨", desc: "Color, size, material variants, SKU combinations" },
    { id: "inventory", label: "Inventory", icon: "📦", desc: "Available stock, reserve qty, location-based stock" },
    { id: "price", label: "Price", icon: "💰", desc: "Sale price, compare price, channel-specific pricing, FX" },
    { id: "images", label: "Images", icon: "🖼", desc: "Main/sub images, alt text, display order" },
];

/* ─── Mock product data ──────────────────────────────────────────────────────── */
const PRODUCTS_INIT = Array.from({ length: 24 }, (_, i) => {
    const names = ["Wireless Noise-Cancelling Headphones", "RGB Mechanical Keyboard", "USB-C 7-Port Hub", "4K 웹캠 Pro", "Ergo Mouse", "60W Fast Charger"];
    const skus = ["WH-1000XM5", "KB-MXM-RGB", "HC-USB4-7P", "CAM-4K-PRO", "MS-ERG-BL", "CH-60W-GAN"];
    const specs = ["Noise-Cancelling / BT 5.2", "TKL / Blue Switch", "USB4 Gen2 / 60W PD", "4K 30fps / Universal", "Ergo / Wireless", "GaN / USB-C"];
    const units = ["pcs", "pcs", "pcs", "unit", "pcs", "pcs"];
    const idx = i % 6;
    const invBase = 50 + (i * 17) % 300;
    const priceBase = [89000, 149000, 49000, 129000, 69000, 39000][idx];
    const purchaseCost = Math.round(priceBase * 0.45);
    const ioFee = Math.round(priceBase * 0.03);
    const storageFee = Math.round(priceBase * 0.02);
    const workFee = Math.round(priceBase * 0.02);
    const shippingFee = Math.round(priceBase * 0.05);
    return {
        id: `P${String(i + 1).padStart(4, "0")}`,
        sku: `${skus[idx]}-${String(i + 1).padStart(2, "0")}`,
        name: names[idx],
        category: ["Electronics/Audio", "Electronics/Input", "Electronics/Peripherals", "Electronics/Camera", "Electronics/Input", "Electronics/Charging"][idx],
        spec: specs[idx],
        unit: units[idx],
        image: null,
        price: priceBase + (i % 4) * 5000,
        comparePrice: Math.round((priceBase + (i % 4) * 5000) * 1.2),
        purchaseCost,
        ioFee,
        storageFee,
        workFee,
        shippingFee,
        productCost: purchaseCost + ioFee + storageFee + workFee + shippingFee,
        inventory: invBase,
        variants: 2 + (i % 4),
        status: i % 7 === 0 ? "error" : i % 5 === 0 ? "warn" : "ok",
        channels: CHANNELS.filter((_, ci) => (i + ci) % 3 !== 0).map(c => c.id),
        lastSync: i % 3 === 0 ? null : `${16 - (i % 8)}h ago`,
        delta: i % 2 === 0 ? { price: true, inventory: i % 4 === 0 } : {},
    };
});

/* ─── Mock sync jobs ─────────────────────────────────────────────────────────── */
const MOCK_JOBS_INIT = [
    { id: "JOB-001", type: "full", scope: ["catalog", "options", "inventory", "price"], channels: ["shopify", "coupang"], status: "done", progress: 100, total: 1840, done: 1840, errors: 0, startedAt: "15:21:04", duration: "4m 32s" },
    { id: "JOB-002", type: "incremental", scope: ["inventory", "price"], channels: ["amazon", "naver"], status: "done", progress: 100, total: 312, done: 312, errors: 2, startedAt: "16:00:00", duration: "48s" },
    { id: "JOB-003", type: "incremental", scope: ["price"], channels: ["11st"], status: "done", progress: 100, total: 88, done: 88, errors: 0, startedAt: "16:15:33", duration: "12s" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const ch = id => CHANNELS.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };
const fmtKRW = n => n == null ? "-" : n >= 1000 ? `₩${(n / 1000).toFixed(0)}K` : `₩${n}`;
const fmtNum = n => n == null ? "-" : Number(n).toLocaleString();
const statusColor = s => s === "ok" ? "#22c55e" : s === "warn" ? "#eab308" : "#ef4444";
const statusLabel = s => s === "ok" ? "Normal" : s === "warn" ? "Warning" : "Error";

/* ─── Unit Types & Helpers ───────────────────────────────────────────────────── */
const UNIT_TYPES = [
    { id: "ea",  label: "ea (unit)",    icon: "1개",   color: "#22c55e", desc: "Register as individual units" },
    { id: "box", label: "Box",   icon: "📦",   color: "#4f8ef7", desc: "Enter 1 Box = N ea" },
    { id: "pl",  label: "PL (Pallet)", icon: "📦📦", color: "#f59e0b", desc: "1 PL = N Box = M ea" },
];

function toEa(qty, prod) {
    if (prod.unitType === "box") return qty * (parseInt(prod.eaPerBox) || 1);
    if (prod.unitType === "pl")  return qty * (parseInt(prod.boxPerPl) || 1) * (parseInt(prod.eaPerBox) || 1);
    return qty;
}

function fmtStock(qty, prod) {
    if (prod.unitType === "box") {
        const eaPerBox = parseInt(prod.eaPerBox) || 1;
        return `${qty}Box (${(qty * eaPerBox).toLocaleString()}ea)`;
    }
    if (prod.unitType === "pl") {
        const b = parseInt(prod.boxPerPl) || 1;
        const e = parseInt(prod.eaPerBox) || 1;
        return `${qty}PL (${(qty * b)}Box / ${(qty * b * e).toLocaleString()}ea)`;
    }
    return `${Number(qty).toLocaleString()}ea`;
}

/* ─── Empty form state ───────────────────────────────────────────────────────── */
const EMPTY_FORM = {
    name: "", sku: "", category: "", image: null, imagePreview: null,
    spec: "", unitType: "ea", eaPerBox: "", boxPerPl: "",
    price: "", comparePrice: "",
    purchaseCost: "", ioFee: "", storageFee: "", workFee: "", shippingFee: "",
    inventory: "",
};


/* ─── Product Register Modal ─────────────────────────────────────────────────── */
function ProductRegisterModal({ onClose, onSave }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const productCost = useMemo(() => {
        const vals = [form.purchaseCost, form.ioFee, form.storageFee, form.workFee, form.shippingFee];
        if (vals.every(v => v === "" || v == null)) return null;
        return vals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
    }, [form.purchaseCost, form.ioFee, form.storageFee, form.workFee, form.shippingFee]);

    const handleImage = e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setForm(f => ({ ...f, image: file, imagePreview: url }));
    };

    const handleSave = () => {
        if (!form.name || !form.category) { alert("Please enter product name and category."); return; }
        if (form.unitType === "box" && !form.eaPerBox) { alert("Please enter qty per Box."); return; }
        if (form.unitType === "pl" && (!form.eaPerBox || !form.boxPerPl)) { alert("Please enter both qty per Box and Box per PL."); return; }
        const newProd = {
            id: `P${String(Date.now()).slice(-4)}`,
            sku: form.sku || `SKU-${Date.now()}`,
            name: form.name,
            category: form.category,
            spec: form.spec || "",
            unitType: form.unitType || "ea",
            unit: form.unitType === "ea" ? "ea" : form.unitType === "box" ? "Box" : "PL",
            eaPerBox: parseInt(form.eaPerBox) || 1,
            boxPerPl: parseInt(form.boxPerPl) || 1,
            image: form.imagePreview,
            price: parseFloat(form.price) || 0,
            comparePrice: parseFloat(form.comparePrice) || 0,
            purchaseCost: parseFloat(form.purchaseCost) || 0,
            ioFee: parseFloat(form.ioFee) || 0,
            storageFee: parseFloat(form.storageFee) || 0,
            workFee: parseFloat(form.workFee) || 0,
            shippingFee: parseFloat(form.shippingFee) || 0,
            productCost: productCost || 0,
            inventory: parseInt(form.inventory) || 0,
            variants: 1,
            status: "ok",
            channels: [],
            lastSync: null,
            delta: {},
        };
        onSave(newProd);
        onClose();
    };

    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    const inputStyle = { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "rgba(15,20,40,0.7)", color: "var(--text-1)", fontSize: 12 };
    const labelStyle = { fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 4, display: "block" };
    const rowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
    const fieldStyle = { display: "flex", flexDirection: "column" };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 300 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(92vw,680px)", maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(180deg,#0d1525,#090f1e)", border: "1px solid rgba(99,140,255,0.25)", borderRadius: 16, zIndex: 301, padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "var(--text-1)" }}>📦 Register Product</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>

                {/* Basic Info */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#4f8ef7", letterSpacing: 1, marginBottom: 10 }}>▸ Basic Info</div>
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                    <div style={rowStyle}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Product Name *</label>
                            <input style={inputStyle} placeholder="Enter product name" value={form.name} onChange={e => set("name", e.target.value)} />
                        </div>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>SKU</label>
                            <input style={inputStyle} placeholder="SKU Code" value={form.sku} onChange={e => set("sku", e.target.value)} />
                        </div>
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Select Category *</label>
                        <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Spec / Dimensions</label>
                        <input style={inputStyle} placeholder="e.g. 100x200x50mm, 1kg" value={form.spec} onChange={e => set("spec", e.target.value)} />
                    </div>
                </div>

                {/* ★ Unit Select (ea / Box / PL) */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#a855f7", letterSpacing: 1, marginBottom: 10 }}>▸ Unit Selection *</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {UNIT_TYPES.map(u => (
                        <div key={u.id} onClick={() => set("unitType", u.id)} style={{
                            padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                            border: `2px solid ${form.unitType === u.id ? u.color : "rgba(99,140,255,0.12)"}`,
                            background: form.unitType === u.id ? `${u.color}12` : "rgba(9,15,30,0.5)",
                            transition: "all 150ms",
                        }}>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>{u.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: form.unitType === u.id ? u.color : "var(--text-1)" }}>{u.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 3 }}>{u.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Box Select 시: 1Box당 ea */}
                {(form.unitType === "box" || form.unitType === "pl") && (
                    <div style={{ padding: "14px 16px", borderRadius: 10, marginBottom: 12, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.2)" }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: "#4f8ef7", marginBottom: 10 }}>📦 Box Unit Details</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Qty per Box (ea) *</label>
                                <input style={{ ...inputStyle, width: 120 }} type="number" min="1" placeholder="e.g. 12" value={form.eaPerBox} onChange={e => set("eaPerBox", e.target.value)} />
                            </div>
                            {form.eaPerBox && <span style={{ fontSize: 11, color: "#4f8ef7", fontWeight: 700, marginTop: 18 }}>→ 1 Box = {form.eaPerBox} ea</span>}
                        </div>
                    </div>
                )}

                {/* PL Select 시: 1PL당 Box */}
                {form.unitType === "pl" && (
                    <div style={{ padding: "14px 16px", borderRadius: 10, marginBottom: 12, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: "#f59e0b", marginBottom: 10 }}>📦📦 Pallet (PL) Unit Details</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Box Qty per PL *</label>
                                <input style={{ ...inputStyle, width: 120 }} type="number" min="1" placeholder="e.g. 40" value={form.boxPerPl} onChange={e => set("boxPerPl", e.target.value)} />
                            </div>
                            {form.boxPerPl && form.eaPerBox && (
                                <div style={{ marginTop: 18, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>
                                    ✅ 1 PL = {form.boxPerPl} Box = {parseInt(form.boxPerPl) * parseInt(form.eaPerBox)} ea
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ProductImage Register */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#4f8ef7", letterSpacing: 1, marginBottom: 10 }}>▸ Product Image</div>
                <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed rgba(79,142,247,0.3)", borderRadius: 12, padding: 20, cursor: "pointer", background: "rgba(79,142,247,0.04)", gap: 8 }}>
                        {form.imagePreview
                            ? <img src={form.imagePreview} alt="preview" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
                            : <>
                                <span style={{ fontSize: 32 }}>🖼</span>
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>Click to upload image (JPG, PNG, WEBP)</span>
                            </>}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
                    </label>
                    {form.imagePreview && <button onClick={() => setForm(f => ({ ...f, image: null, imagePreview: null }))} style={{ marginTop: 6, fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>✕ Remove Image</button>}
                </div>

                {/* Price */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#4f8ef7", letterSpacing: 1, marginBottom: 10 }}>▸ Pricing</div>
                <div style={{ ...rowStyle, marginBottom: 18 }}>
                    <div style={fieldStyle}><label style={labelStyle}>Sale Price (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.price} onChange={e => set("price", e.target.value)} /></div>
                    <div style={fieldStyle}><label style={labelStyle}>Compare Price (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.comparePrice} onChange={e => set("comparePrice", e.target.value)} /></div>
                </div>

                {/* Cost Price 구성 */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#f97316", letterSpacing: 1, marginBottom: 10 }}>▸ Cost Structure</div>
                <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={fieldStyle}><label style={labelStyle}>Purchase Cost (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.purchaseCost} onChange={e => set("purchaseCost", e.target.value)} /></div>
                        <div style={fieldStyle}><label style={labelStyle}>Inbound/Outbound Fee (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.ioFee} onChange={e => set("ioFee", e.target.value)} /></div>
                        <div style={fieldStyle}><label style={labelStyle}>Storage Fee (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.storageFee} onChange={e => set("storageFee", e.target.value)} /></div>
                        <div style={fieldStyle}><label style={labelStyle}>Handling Fee (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.workFee} onChange={e => set("workFee", e.target.value)} /></div>
                        <div style={fieldStyle}><label style={labelStyle}>Shipping Fee (₩)</label><input style={inputStyle} type="number" placeholder="0" value={form.shippingFee} onChange={e => set("shippingFee", e.target.value)} /></div>
                        <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
                            <div style={{ background: "rgba(249,115,22,0.1)", borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>Product Cost (auto-calc)</div>
                                <div style={{ fontWeight: 900, fontSize: 18, color: "#f97316", fontFamily: "monospace" }}>{productCost != null ? `₩${productCost.toLocaleString()}` : "—"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#4f8ef7", letterSpacing: 1, marginBottom: 10 }}>▸ Initial Stock</div>
                <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Stock Qty ({form.unitType === "ea" ? "ea" : form.unitType === "box" ? "Box" : "PL"} 기준)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input style={{ ...inputStyle, width: 140 }} type="number" placeholder="0" value={form.inventory} onChange={e => set("inventory", e.target.value)} />
                        {form.inventory && (
                            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>
                                {form.unitType === "ea" && `= ${parseInt(form.inventory).toLocaleString()} ea`}
                                {form.unitType === "box" && form.eaPerBox && `= ${(parseInt(form.inventory) * parseInt(form.eaPerBox)).toLocaleString()} ea`}
                                {form.unitType === "pl" && form.boxPerPl && form.eaPerBox && `= ${(parseInt(form.inventory) * parseInt(form.boxPerPl) * parseInt(form.eaPerBox)).toLocaleString()} ea`}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-2)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    <button onClick={handleSave} style={{ padding: "9px 24px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>💾 Save</button>
                </div>
            </div>
        </>
    );
}

function ProgressBar({ pct, color = "#4f8ef7", animated = false }) {
    return (
        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
                width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4,
                transition: "width 0.4s ease",
                backgroundImage: animated ? `repeating-linear-gradient(90deg,transparent,transparent 8px,rgba(255,255,255,0.15) 8px,rgba(255,255,255,0.15) 16px)` : "none",
                backgroundSize: "32px",
                animation: animated ? "stripe 0.8s linear infinite" : "none",
            }} />
        </div>
    );
}

/* ─── Demo Banner ──────────────────────────── */
function DemoBanner({ feature }) {
    return (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🧪</span>
            <div>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#eab308" }}>Demo Mode</span>
                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>{feature} — Simulated without real channel API calls. Live integration available on paid plans.</span>
            </div>
        </div>
    );
}

/* ─── BulkRegisterModal (Sale Price Recommend + Management자 Approval 포함) ─────────────────── */
function BulkRegisterModal({ selectedIds, products, onClose, onApply, isDemo }) {
    // 스텝: 0=Channel+ActionSelect, 1=RecommendSale PriceSettings, 2=Approval+Register
    const [step, setStep] = useState(0);
    const [selChs, setSelChs] = useState(new Set());
    const [action, setAction] = useState("register");
    // Channelper Profit율 (Basic 30%) — Management자가 조정 가능
    const [margins, setMargins] = useState(() => {
        const init = {};
        CHANNELS.forEach(c => { init[c.id] = 30; });
        return init;
    });
    // Channelper 커스텀 Sale Price (Recommend가 override 가능)
    const [customPrices, setCustomPrices] = useState({});
    const [approved, setApproved] = useState(false);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    const selProds = products.filter(p => selectedIds.has(p.id));
    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };
    const selChsArr = [...selChs];

    // Product Cost Average (Select Product 기준)
    const avgCost = useMemo(() => {
        if (!selProds.length) return 0;
        const sum = selProds.reduce((s, p) => s + (p.productCost || p.purchaseCost || 0), 0);
        return Math.round(sum / selProds.length);
    }, [selProds]);

    // Channelper Recommend가 계산
    const recPrices = useMemo(() => {
        const res = {};
        selChsArr.forEach(chId => {
            const rec = calcRecommendedPrice(avgCost, chId, margins[chId] ?? 30);
            res[chId] = customPrices[chId] ?? rec;
        });
        return res;
    }, [selChsArr, avgCost, margins, customPrices]);

    const handleApply = async () => {
        if (!selChs.size) return;
        setRunning(true);

        try {
            if (isDemo) {
                // ── Demo Mode: 시뮬레이션 (실제 API 호출 None) ──
                await new Promise(r => setTimeout(r, 1200));
                onApply(action, [...selChs], recPrices);
                setDone(true);
                setTimeout(onClose, 1500);
                return;
            }

            // ── Paid 모드: /v382/writeback/{channel}/{sku}/execute 실제 호출 ──
            const token = localStorage.getItem('genie_token');
            const BASE = import.meta.env?.VITE_API_BASE ?? '';
            const results = [];
            let hasError = false;

            // Product×Channel 조합마다 writeback Run
            for (const chId of selChs) {
                for (const prod of selProds) {
                    try {
                        const r = await fetch(`${BASE}/v382/writeback/${chId}/${prod.sku}/execute`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                                price: recPrices[chId] ?? prod.price,
                                name: prod.name,
                                category: prod.category,
                                inventory: prod.inventory,
                                spec: prod.spec,
                                action,
                            }),
                        });
                        const d = await r.json().catch(() => ({}));
                        results.push({ chId, sku: prod.sku, ok: r.ok || d.ok, status: d.status });
                        if (!r.ok && !d.ok) hasError = true;
                    } catch {
                        results.push({ chId, sku: prod.sku, ok: false, status: 'network_error' });
                        hasError = true;
                    }
                }
            }

            // 결과 반영 (Success한 항목만 onApply로 전달)
            const successChannels = [...new Set(results.filter(r => r.ok).map(r => r.chId))];
            onApply(action, successChannels.length > 0 ? successChannels : [...selChs], recPrices);
            setDone(true);
            if (hasError) {
                console.warn('[CatalogSync] 일부 Channel writeback Failed:', results.filter(r => !r.ok));
            }
            setTimeout(onClose, 1500);
        } catch (err) {
            console.error('[CatalogSync] writeback Error:', err);
            // 에러 시 로컬 onApply 폴백
            onApply(action, [...selChs], recPrices);
            setDone(true);
            setTimeout(onClose, 1500);
        } finally {
            setRunning(false);
        }
    };

    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    const inputStyle = { width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "rgba(15,20,40,0.7)", color: "var(--text-1)", fontSize: 12 };
    const stepDot = (n) => ({
        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800,
        background: step >= n ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "rgba(99,140,255,0.12)",
        color: step >= n ? "#fff" : "var(--text-3)",
    });

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 400 }} />
            <div style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                width: step === 1 ? "min(96vw,860px)" : "min(92vw,580px)",
                maxHeight: "92vh", overflowY: "auto",
                background: "linear-gradient(180deg,#0d1525,#090f1e)",
                border: "1px solid rgba(99,140,255,0.25)", borderRadius: 18, zIndex: 401, padding: 28,
                transition: "width 0.25s ease",
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>📡 Register Products to Channel</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>

                {/* 스텝 인디케이터 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
                    {["Select Channel", "Set Price", "Approve & Register"].map((label, i) => (
                        <React.Fragment key={i}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={stepDot(i)}>{i + 1}</div>
                                <span style={{ fontSize: 11, fontWeight: step === i ? 700 : 400, color: step === i ? "#4f8ef7" : "var(--text-3)" }}>{label}</span>
                            </div>
                            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i ? "rgba(79,142,247,0.5)" : "rgba(99,140,255,0.1)", margin: "0 4px" }} />}
                        </React.Fragment>
                    ))}
                </div>

                {isDemo && <DemoBanner feature="Channel Product Registration" />}

                {/* Select Product Summary (공통) */}
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📦 Select Product ({selProds.length}개) · Average Product Cost <span style={{ color: "#f97316" }}>₩{avgCost.toLocaleString()}</span></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {selProds.slice(0, 5).map(p => (
                            <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(79,142,247,0.12)", color: "#4f8ef7" }}>{p.name}</span>
                        ))}
                        {selProds.length > 5 && <span style={{ fontSize: 10, color: "var(--text-3)" }}>+{selProds.length - 5}개</span>}
                    </div>
                </div>

                {/* ═══ STEP 0: Channel+Action Select ═══ */}
                {step === 0 && (
                    <>
                        {/* Action Select */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                            {[
                                { id: "register",   label: "✅ Register to Channel",  desc: "Register/activate sales on selected channels",   color: "#22c55e" },
                                { id: "unregister", label: "⛔ Unregister Channel",  desc: "Deactivate product on selected channels",   color: "#ef4444" },
                            ].map(a => (
                                <div key={a.id} onClick={() => setAction(a.id)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `2px solid ${action === a.id ? a.color : "rgba(99,140,255,0.12)"}`, background: action === a.id ? `${a.color}08` : "rgba(9,15,30,0.5)" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: a.color }}>{a.label}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{a.desc}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>📡 대상 Select Channel</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                            {CHANNELS.map(c => {
                                const rate = CHANNEL_RATES[c.id];
                                return (
                                    <label key={c.id} onClick={() => toggleCh(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${selChs.has(c.id) ? c.color + "60" : "rgba(99,140,255,0.12)"}`, background: selChs.has(c.id) ? `${c.color}08` : "rgba(9,15,30,0.5)", transition: "all 150ms" }}>
                                        <input type="checkbox" checked={selChs.has(c.id)} onChange={() => { }} style={{ accentColor: c.color }} />
                                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: selChs.has(c.id) ? c.color : "var(--text-1)" }}>{c.name}</div>
                                            {rate && <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>Commission {(rate.commission * 100).toFixed(0)}% · Tax {(rate.vat * 100).toFixed(0)}% · {rate.region}</div>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
                            <button onClick={() => setSelChs(new Set(CHANNELS.map(c => c.id)))} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", cursor: "pointer" }}>Select All</button>
                            <button onClick={() => setSelChs(new Set())} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", cursor: "pointer" }}>Deselect All</button>
                            {selChs.size > 0 && <span style={{ fontSize: 11, color: "#4f8ef7", alignSelf: "center", marginLeft: 4 }}>{selChs.size}개 Select Channel됨</span>}
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-2)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                            <button
                                onClick={() => action === "register" ? setStep(1) : handleApply()}
                                disabled={!selChs.size}
                                style={{ padding: "9px 24px", borderRadius: 8, background: !selChs.size ? "rgba(79,142,247,0.2)" : action === "register" ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "linear-gradient(135deg,#ef4444,#f97316)", border: "none", color: "#fff", fontWeight: 700, cursor: selChs.size ? "pointer" : "default", fontSize: 12 }}>
                                {action === "register" ? "Next: Set Price →" : `${selProds.length} products unregistered`}
                            </button>
                        </div>
                    </>
                )}

                {/* ═══ STEP 1: Channelper RecommendSet Price ═══ */}
                {step === 1 && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#f59e0b", marginBottom: 6 }}>💰 Channelper Recommend Set Price</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                            Product Cost(매입Cost Price+입출고비+보관료+Actions비+배송비)에 Channel Commission·Tax·Profit율을 반영한 Recommend Sale Price입니다.<br />
                            <span style={{ color: "#4f8ef7" }}>Margin (%)을 조정하면 Recommend가가 실Time 재계산됩니다. Sale Price를 직접 입력해 override할 Count 있습니다.</span>
                        </div>

                        {/* Channelper Table */}
                        <div style={{ overflowX: "auto", marginBottom: 18 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(99,140,255,0.15)" }}>
                                        {["Channel", "지역", "Commission", "Tax(VAT)", "Margin (%)", "Product Cost", "💰 Recommended Price", "Override"].map(h => (
                                            <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: "var(--text-3)", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selChsArr.map(chId => {
                                        const ch = CHANNELS.find(c => c.id === chId) || { name: chId, color: "#4f8ef7", icon: "🔌" };
                                        const rate = CHANNEL_RATES[chId] || { commission: 0.10, vat: 0.10, region: "Other" };
                                        const margin = margins[chId] ?? 30;
                                        const recPrice = calcRecommendedPrice(avgCost, chId, margin);
                                        const finalPrice = customPrices[chId] ?? recPrice;
                                        const actualMargin = avgCost > 0 ? (((finalPrice - avgCost) / finalPrice - rate.commission - rate.vat) * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={chId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: customPrices[chId] ? "rgba(245,158,11,0.04)" : "" }}>
                                                <td style={{ padding: "10px 10px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                                        <span style={{ fontWeight: 600, color: ch.color, fontSize: 11 }}>{ch.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "10px 6px" }}>
                                                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: rate.region === "Domestic" ? "rgba(34,197,94,0.1)" : "rgba(79,142,247,0.1)", color: rate.region === "Domestic" ? "#22c55e" : "#4f8ef7" }}>{rate.region}</span>
                                                </td>
                                                <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#ef4444" }}>{(rate.commission * 100).toFixed(0)}%</td>
                                                <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#f97316" }}>{(rate.vat * 100).toFixed(0)}%</td>
                                                <td style={{ padding: "10px 6px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <input
                                                            type="range" min="5" max="80" step="1" value={margin}
                                                            onChange={e => { setMargins(m => ({ ...m, [chId]: Number(e.target.value) })); setCustomPrices(cp => { const n = { ...cp }; delete n[chId]; return n; }); }}
                                                            style={{ width: 70, accentColor: ch.color }}
                                                        />
                                                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#22c55e", fontSize: 11, minWidth: 30 }}>{margin}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#f97316", fontWeight: 700 }}>₩{avgCost.toLocaleString()}</td>
                                                <td style={{ padding: "10px 10px" }}>
                                                    <div style={{ fontWeight: 900, fontSize: 14, color: customPrices[chId] ? "#f59e0b" : "#22c55e", fontFamily: "monospace" }}>₩{finalPrice.toLocaleString()}</div>
                                                    <div style={{ fontSize: 9, color: actualMargin > 0 ? "#22c55e" : "#ef4444", marginTop: 2 }}>Actual Margin {actualMargin}%</div>
                                                </td>
                                                <td style={{ padding: "10px 6px" }}>
                                                    <input
                                                        type="number"
                                                        placeholder={`₩${recPrice.toLocaleString()}`}
                                                        value={customPrices[chId] ?? ""}
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            setCustomPrices(cp => v ? { ...cp, [chId]: Number(v) } : (({ [chId]: _, ...rest }) => rest)(cp));
                                                        }}
                                                        style={{ width: 110, padding: "5px 8px", borderRadius: 7, border: customPrices[chId] ? "1px solid #f59e0b" : "1px solid rgba(99,140,255,0.2)", background: "rgba(15,20,40,0.7)", color: "var(--text-1)", fontSize: 12 }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 18, fontSize: 11, color: "var(--text-2)" }}>
                            💡 Recommended Price Formula: <span style={{ fontFamily: "monospace", color: "#4f8ef7" }}>Product Cost ÷ (1 - Commission율 - Tax율 - Profit율)</span>
                            &nbsp;·&nbsp; Prices shown in yellow are manually entered.
                        </div>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => setStep(0)} style={{ padding: "9px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-2)", cursor: "pointer", fontSize: 12 }}>← Back</button>
                            <button onClick={() => setStep(2)} style={{ padding: "9px 24px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#4f8ef7)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Next: Approve & Register →</button>
                        </div>
                    </>
                )}

                {/* ═══ STEP 2: Management자 Approve & Register Run ═══ */}
                {step === 2 && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#a855f7", marginBottom: 14 }}>✅ Final Review & Manager Approval</div>

                        {/* Channelper 최종 Sale Price Summary */}
                        <div style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", marginBottom: 10 }}>📋 Channelper 최종 Sale Price Summary</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {selChsArr.map(chId => {
                                    const ch = CHANNELS.find(c => c.id === chId) || { name: chId, icon: "🔌", color: "#4f8ef7" };
                                    const rate = CHANNEL_RATES[chId] || { commission: 0.10, vat: 0.10 };
                                    const finalPrice = recPrices[chId] ?? 0;
                                    const profit = finalPrice - avgCost - Math.round(finalPrice * (rate.commission + rate.vat));
                                    return (
                                        <div key={chId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: ch.color }}>{ch.name}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>Commission+Tax</div>
                                                    <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "monospace" }}>₩{Math.round(finalPrice * (rate.commission + rate.vat)).toLocaleString()}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>Est. Profit</div>
                                                    <div style={{ fontSize: 11, color: profit > 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace", fontWeight: 700 }}>₩{profit.toLocaleString()}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>Sale Price</div>
                                                    <div style={{ fontSize: 15, fontWeight: 900, color: "#f59e0b", fontFamily: "monospace" }}>₩{finalPrice.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Management자 Approval Checkbox */}
                        <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: approved ? "rgba(34,197,94,0.08)" : "rgba(99,140,255,0.05)", border: `1px solid ${approved ? "rgba(34,197,94,0.35)" : "rgba(99,140,255,0.2)"}`, cursor: "pointer", marginBottom: 18 }}>
                            <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#22c55e", cursor: "pointer" }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: approved ? "#22c55e" : "var(--text-1)" }}>✍️ Manager Approval: 위 Sale Price로 {selChsArr.length}개 Channel에 {selProds.length} products will be registered</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>Approval 후 All 또는 Select Channel에 판매 Register이 In Progress됩니다.</div>
                            </div>
                        </label>

                        {done ? (
                            <div style={{ textAlign: "center", padding: "14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: 14 }}>
                                ✅ {selProds.length}개 Product · {selChsArr.length}개 Channel Register Done! {isDemo && "(Demo)"}
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={() => setStep(1)} style={{ padding: "9px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-2)", cursor: "pointer", fontSize: 12 }}>← Back</button>
                                <button
                                    onClick={handleApply}
                                    disabled={!approved || running}
                                    style={{ padding: "9px 28px", borderRadius: 8, background: !approved || running ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg,#22c55e,#a855f7)", border: "none", color: "#fff", fontWeight: 700, cursor: approved && !running ? "pointer" : "default", fontSize: 13 }}
                                >
                                    {running ? "⏳ Registering..." : `🚀 ${selProds.length}개 Product · ${selChsArr.length}개 Channel Register Run`}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

/* ─── BulkPriceModal ─────────────────────────────────── */
function BulkPriceModal({ selectedIds, products, onClose, onApply, isDemo }) {
    const [priceMode, setPriceMode] = useState("fixed"); // fixed | markup | discount
    const [value, setValue] = useState("");
    const [selChs, setSelChs] = useState(new Set(CHANNELS.map(c => c.id)));
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    const selProds = products.filter(p => selectedIds.has(p.id));
    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };

    const previewPrice = (basePrice) => {
        const v = parseFloat(value) || 0;
        if (priceMode === "fixed") return v;
        if (priceMode === "markup") return Math.round(basePrice * (1 + v / 100));
        if (priceMode === "discount") return Math.round(basePrice * (1 - v / 100));
        return basePrice;
    };

    const handleApply = () => {
        if (!value) return;
        setRunning(true);
        setTimeout(() => {
            onApply(priceMode, parseFloat(value), [...selChs]);
            setRunning(false);
            setDone(true);
            setTimeout(onClose, 1200);
        }, isDemo ? 1200 : 800);
    };

    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 400 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(92vw,580px)", maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(180deg,#0d1525,#090f1e)", border: "1px solid rgba(99,140,255,0.25)", borderRadius: 16, zIndex: 401, padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>💰 일괄 Price Edit</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>

                {isDemo && <DemoBanner feature="Price 일괄 Edit" />}

                {/* Select Product */}
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📦 Select Product ({selProds.length}개)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {selProds.slice(0, 5).map(p => (
                            <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(79,142,247,0.12)", color: "#4f8ef7" }}>{p.name} <span style={{ opacity: 0.7 }}>₩{p.price.toLocaleString()}</span></span>
                        ))}
                        {selProds.length > 5 && <span style={{ fontSize: 10, color: "var(--text-3)" }}>+{selProds.length - 5}개</span>}
                    </div>
                </div>

                {/* Price Edit 방식 */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>💱 Price Edit 방식</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                        { id: "fixed", label: "직접 입력", icon: "✏️", desc: "새 Price을 직접 입력", unit: "₩" },
                        { id: "markup", label: "마크업(%)", icon: "📈", desc: "현재가에 %를 올림", unit: "%" },
                        { id: "discount", label: "할인(%)", icon: "🏷️", desc: "현재가에서 % Off", unit: "%" },
                    ].map(m => (
                        <div key={m.id} onClick={() => { setPriceMode(m.id); setValue(""); }} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${priceMode === m.id ? "#f59e0b" : "rgba(99,140,255,0.12)"}`, background: priceMode === m.id ? "rgba(245,158,11,0.06)" : "rgba(9,15,30,0.5)", textAlign: "center" }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: priceMode === m.id ? "#f59e0b" : "var(--text-1)" }}>{m.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{m.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Value 입력 */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-3)" }}>
                            {priceMode === "fixed" ? "₩" : "%"}
                        </span>
                        <input
                            className="input"
                            type="number"
                            placeholder={priceMode === "fixed" ? "새 Sale Price 입력" : priceMode === "markup" ? "올릴 Rate (예: 10)" : "할인율 (예: 10)"}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            style={{ paddingLeft: 28, fontSize: 14, fontWeight: 700 }}
                        />
                    </div>
                    {value && selProds.length > 0 && (
                        <div style={{ fontSize: 11, color: "#22c55e", whiteSpace: "nowrap" }}>
                            → ₩{previewPrice(selProds[0].price).toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Price 미리보기 */}
                {value && selProds.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>📊 Change 미리보기</div>
                        <div style={{ display: "grid", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                            {selProds.map(p => {
                                const newPrice = previewPrice(p.price);
                                const diff = newPrice - p.price;
                                return (
                                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", fontSize: 11 }}>
                                        <span style={{ color: "var(--text-2)" }}>{p.name}</span>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                            <span style={{ color: "var(--text-3)", fontFamily: "monospace" }}>₩{p.price.toLocaleString()}</span>
                                            <span style={{ color: "var(--text-3)" }}>→</span>
                                            <span style={{ color: newPrice > p.price ? "#22c55e" : newPrice < p.price ? "#ef4444" : "var(--text-1)", fontWeight: 700, fontFamily: "monospace" }}>₩{newPrice.toLocaleString()}</span>
                                            <span style={{ fontSize: 10, color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "var(--text-3)" }}>{diff > 0 ? "+" : ""}{diff.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Apply Channel */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>📡 Apply Channel</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {CHANNELS.map(c => (
                        <button key={c.id} onClick={() => toggleCh(c.id)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: selChs.has(c.id) ? 700 : 400, border: `1px solid ${selChs.has(c.id) ? c.color + "80" : "rgba(99,140,255,0.15)"}`, background: selChs.has(c.id) ? `${c.color}15` : "transparent", color: selChs.has(c.id) ? c.color : "var(--text-3)", cursor: "pointer", transition: "all 150ms" }}>
                            {c.icon} {c.name}
                        </button>
                    ))}
                </div>

                {done ? (
                    <div style={{ textAlign: "center", padding: "12px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700 }}>
                        ✅ Price Edit Done! {isDemo && "(Demo 시뮬레이션)"}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-2)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                        <button onClick={handleApply} disabled={!value || running} style={{ padding: "9px 24px", borderRadius: 8, background: running ? "rgba(245,158,11,0.4)" : "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                            {running ? "⏳ Processing..." : `${selProds.length}개 Product Price Edit Apply`}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

/* ─── Tab: Product 카탈로그 ─────────────────────────────────────────────────────────── */
function CatalogTab() {
    const { isDemo } = useDemo();
    const { updateCatalogChannelPrices, syncCatalogItem } = useGlobalData();
    const [products, setProducts] = useState(PRODUCTS_INIT);
    const [search, setSearch] = useState("");
    const [selCh, setSelCh] = useState("all");
    const [selSt, setSelSt] = useState("all");
    const [sortKey, setSortKey] = useState("id");
    const [sortDir, setSortDir] = useState(1);
    const [selected, setSelected] = useState(new Set());
    const [detail, setDetail] = useState(null);
    const [page, setPage] = useState(0);
    const [showRegister, setShowRegister] = useState(false);
    const [showBulkRegister, setShowBulkRegister] = useState(false);
    const [showBulkPrice, setShowBulkPrice] = useState(false);
    const [toast, setToast] = useState(null);
    const isMobile = useIsMobile();
    const PAGE = 8;

    const showToast = (msg, color = "#22c55e") => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBulkRegister = (action, channels, recPrices = {}) => {
        setProducts(prev => prev.map(p => {
            if (!selected.has(p.id)) return p;
            const channelPrices = { ...(p.channelPrices || {}) };
            if (action === "register" && Object.keys(recPrices).length > 0) {
                channels.forEach(ch => { if (recPrices[ch]) channelPrices[ch] = recPrices[ch]; });
            }
            const firstChPrice = channels.map(ch => recPrices[ch]).find(v => v);

            // [v11] GlobalDataContext에 Channelper Sale Price Sync (OrderHub, PriceOpt에서 소비)
            if (action === "register" && Object.keys(channelPrices).length > 0) {
                updateCatalogChannelPrices(p.sku, channelPrices);
                // inventory Sync (sku, name, price, cost)
                syncCatalogItem({ sku: p.sku, name: p.name, price: firstChPrice || p.price, cost: p.productCost || p.purchaseCost || 0 });
            }

            return {
                ...p,
                channels: action === "register"
                    ? [...new Set([...p.channels, ...channels])]
                    : p.channels.filter(c => !channels.includes(c)),
                channelPrices,
                price: action === "register" && firstChPrice ? firstChPrice : p.price,
                lastSync: action === "register" ? "방금" : p.lastSync,
                delta: { ...p.delta, price: action === "register" },
                status: "ok",
            };
        }));
        showToast(`${selected.size}개 Product ${action === "register" ? "Register" : "Disconnect"} Done${isDemo ? " (Demo)" : ""}`);
        setSelected(new Set());
    };

    const handleBulkPrice = (mode, value, channels) => {
        setProducts(prev => prev.map(p => {
            if (!selected.has(p.id)) return p;
            let newPrice = p.price;
            if (mode === "fixed") newPrice = value;
            else if (mode === "markup") newPrice = Math.round(p.price * (1 + value / 100));
            else if (mode === "discount") newPrice = Math.round(p.price * (1 - value / 100));
            return { ...p, price: newPrice, delta: { ...p.delta, price: true }, lastSync: null };
        }));
        showToast(`${selected.size}개 Product Price Edit Done${isDemo ? " (Demo)" : ""}`, "#f59e0b");
        setSelected(new Set());
    };

    const handleAddProduct = p => setProducts(prev => [p, ...prev]);

    const filtered = useMemo(() => {
        let rows = products;
        if (search) rows = rows.filter(r => r.name.includes(search) || r.sku.includes(search));
        if (selCh !== "all") rows = rows.filter(r => r.channels.includes(selCh));
        if (selSt !== "all") rows = rows.filter(r => r.status === selSt);
        const k = sortKey;
        rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : -1) * sortDir);
        return rows;
    }, [products, search, selCh, selSt, sortKey, sortDir]);

    const paged = filtered.slice(page * PAGE, page * PAGE + PAGE);
    const totalPages = Math.ceil(filtered.length / PAGE);

    const toggleSort = k => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(1); } };
    const toggleSel = id => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
    const SortIco = ({ k }) => sortKey === k ? (sortDir > 0 ? " ▲" : " ▼") : " ·";

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {isDemo && <DemoBanner feature="Catalog Sync" />}

            {/* Toast */}
            {toast && (
                <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: toast.color, color: "#fff", fontWeight: 700, fontSize: 13, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {toast.msg}
                </div>
            )}

            {/* Filters + RegisterButton */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input className="input" style={{ flex: "1 1 180px" }} placeholder="Product Name·SKU Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
                <select className="input" style={{ width: 140 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">All Channel</option>
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input" style={{ width: 110 }} value={selSt} onChange={e => setSelSt(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="ok">Normal</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                </select>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>{filtered.length}개 Product</span>
                <button onClick={() => setShowRegister(true)} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add Product</button>
            </div>

            {/* 일괄 Action 바 — Select 시 나타남 */}
            {selected.size > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", borderRadius: 12, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#4f8ef7" }}>✔ {selected.size}개 Product Select됨</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setShowBulkRegister(true)} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#4f8ef7)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        📡 Channel 일괄 Register/Disconnect
                    </button>
                    <button onClick={() => setShowBulkPrice(true)} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        💰 일괄 Price Edit
                    </button>
                    <button onClick={() => setSelected(new Set())} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-3)", fontSize: 11, cursor: "pointer" }}>Select Disconnect</button>
                </div>
            )}

            {/* Table or Mobile Cards */}
            {isMobile ? (
                /* ── 모바일: Card형 List ── */
                <div style={{ display: "grid", gap: 10 }}>
                    {paged.map(r => {
                        const margin = r.price > 0 ? (((r.price - (r.productCost || 0)) / r.price) * 100).toFixed(1) : null;
                        const marginColor = margin == null ? "var(--text-3)" : margin >= 30 ? "#22c55e" : margin >= 10 ? "#eab308" : "#ef4444";
                        const isSelected = selected.has(r.id);
                        return (
                            <div key={r.id} className="card card-glass" style={{ padding: "12px 14px", border: isSelected ? "1px solid rgba(79,142,247,0.5)" : "1px solid rgba(99,140,255,0.12)" }}
                                onClick={() => setDetail(r)}>
                                {/* Header: 체크 + Image + Product Name + Status */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div onClick={e => { e.stopPropagation(); toggleSel(r.id); }} style={{ flexShrink: 0 }}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSel(r.id)} style={{ width: 14, height: 14 }} />
                                    </div>
                                    {r.image
                                        ? <img src={r.image} alt={r.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(79,142,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🖼</div>}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, wordBreak: "break-word" }}>{r.name}</div>
                                        <div style={{ fontSize: 10, color: "#4f8ef7", fontFamily: "monospace", marginTop: 2 }}>{r.id} · {r.sku}</div>
                                    </div>
                                    <span className="badge" style={{ fontSize: 9, background: statusColor(r.status) + "18", color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}33`, flexShrink: 0 }}>
                                        {statusLabel(r.status)}
                                    </span>
                                </div>
                                {/* 규격 + Unit + Category */}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{r.category}</span>
                                    {r.spec && <span style={{ fontSize: 10, color: "var(--text-3)", opacity: 0.8 }}>| {r.spec}</span>}
                                    <span className="badge" style={{ fontSize: 9, padding: "2px 6px",
                                        background: r.unitType === 'box' ? 'rgba(79,142,247,0.12)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)',
                                        color: r.unitType === 'box' ? '#4f8ef7' : r.unitType === 'pl' ? '#f59e0b' : '#22c55e',
                                        border: `1px solid ${r.unitType === 'box' ? 'rgba(79,142,247,0.3)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}`
                                    }}>{r.unit || 'ea'}</span>
                                </div>
                                {/* Price + Cost Price 그리드 */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)" }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>Sale Price</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: r.delta?.price ? "#f97316" : "var(--text-1)" }}>{fmtKRW(r.price)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>매입Cost Price</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#a78bfa" }}>{fmtKRW(r.purchaseCost)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>Product Cost</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#f97316" }}>{fmtKRW(r.productCost)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: margin >= 30 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${marginColor}33` }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>마진%</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: marginColor }}>{margin != null ? `${margin}%` : "-"}</div>
                                    </div>
                                </div>
                                {/* Stock + Sync */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 11, color: r.delta?.inventory ? "#f97316" : "var(--text-2)" }}>
                                        📦 Stock <strong>{fmtStock(r.inventory, r)}</strong>
                                    </div>
                                    <div style={{ fontSize: 10, color: r.lastSync ? "var(--text-3)" : "#ef4444" }}>
                                        {r.lastSync ? `동기: ${r.lastSync}` : "Not Synced"}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
            /* ── PC: 기존 Table ── */
            <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ minWidth: 1100 }}>
                    <thead>
                        <tr>
                            <th style={{ width: 32 }}><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(paged.map(r => r.id)) : new Set())} /></th>
                            <th style={{ width: 60 }}>Image</th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("id")}>ID<SortIco k="id" /></th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>Product Name<SortIco k="name" /></th>
                            <th>Category</th>
                            <th>규격</th>
                            <th>Unit</th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("price")}>Sale Price<SortIco k="price" /></th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("purchaseCost")}>매입Cost Price<SortIco k="purchaseCost" /></th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("productCost")}>Product Cost<SortIco k="productCost" /></th>
                            <th>마진%</th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("inventory")}>Stock<SortIco k="inventory" /></th>
                            <th>체널</th>
                            <th>Sync</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map(r => {
                            const margin = r.price > 0 ? (((r.price - (r.productCost || 0)) / r.price) * 100).toFixed(1) : null;
                            const marginColor = margin == null ? "var(--text-3)" : margin >= 30 ? "#22c55e" : margin >= 10 ? "#eab308" : "#ef4444";
                            return (
                                <tr key={r.id} onClick={() => setDetail(r)} style={{ cursor: "pointer" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"}
                                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                                    <td onClick={e => { e.stopPropagation(); toggleSel(r.id); }}>
                                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
                                    </td>
                                    <td>
                                        {r.image
                                            ? <img src={r.image} alt={r.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(99,140,255,0.2)" }} />
                                            : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(79,142,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🖼</div>}
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{r.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 12 }}>{r.name}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>{r.sku}</div>
                                    </td>
                                    <td style={{ fontSize: 11, color: "var(--text-2)" }}>{r.category}</td>
                                    <td style={{ fontSize: 10, color: "var(--text-3)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.spec || ""}>{r.spec || "-"}</td>
                                    <td style={{ fontSize: 11, color: "var(--text-2)", textAlign: "center" }}>
                                        <span className="badge" style={{ fontSize: 9, padding: "2px 7px", background: r.unitType === 'box' ? 'rgba(79,142,247,0.12)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', color: r.unitType === 'box' ? '#4f8ef7' : r.unitType === 'pl' ? '#f59e0b' : '#22c55e', border: `1px solid ${r.unitType === 'box' ? 'rgba(79,142,247,0.3)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}` }}>{r.unit || 'ea'}</span>
                                        {r.unitType === 'box' && r.eaPerBox > 1 && <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 2 }}>1Box={r.eaPerBox}ea</div>}
                                        {r.unitType === 'pl' && <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 2 }}>{r.boxPerPl}Box/{r.eaPerBox}ea</div>}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: r.delta?.price ? "#f97316" : "var(--text-1)" }}>
                                            {fmtKRW(r.price)} {r.delta?.price && <span style={{ fontSize: 9 }}>●Change</span>}
                                        </div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", textDecoration: "line-through" }}>{fmtKRW(r.comparePrice)}</div>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "#a78bfa" }}>{fmtKRW(r.purchaseCost)}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#f97316" }}>{fmtKRW(r.productCost)}</td>
                                    <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: marginColor }}>{margin != null ? `${margin}%` : "-"}</td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ width: 44, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                                                <div style={{ width: `${Math.min(100, (r.inventory / 350) * 100)}%`, height: "100%", background: r.inventory < 20 ? "#ef4444" : r.inventory < 80 ? "#eab308" : "#22c55e", borderRadius: 4 }} />
                                            </div>
                                            <span style={{ fontSize: 10, fontFamily: "monospace", color: r.delta?.inventory ? "#f97316" : "var(--text-2)" }}>
                                                {fmtStock(r.inventory, r)}{r.delta?.inventory && " ●"}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                            {r.channels.map(cid => {
                                                const c = ch(cid);
                                                return <span key={cid} title={c.name} style={{ fontSize: 13 }}>{c.icon}</span>;
                                            })}
                                            {r.channels.length === 0 && <span style={{ fontSize: 10, color: "var(--text-3)" }}>미Integration</span>}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 11, color: r.lastSync ? "var(--text-3)" : "#ef4444" }}>
                                        {r.lastSync || "Not Synced"}
                                    </td>
                                    <td>
                                        <span className="badge" style={{ fontSize: 9, background: statusColor(r.status) + "18", color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}33` }}>
                                            {statusLabel(r.status)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            )}

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, filtered.length)} / {filtered.length}</span>
                <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Previous</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                        <button key={i} className={`btn-ghost ${i === page ? "btn-primary" : ""}`} style={{ padding: "4px 8px", fontSize: 11, background: i === page ? "#4f8ef7" : "", color: i === page ? "#fff" : "" }} onClick={() => setPage(i)}>{i + 1}</button>
                    ))}
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
                </div>
            </div>

            {/* Detail drawer */}
            {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}

            {/* Register modal */}
            {showRegister && <ProductRegisterModal onClose={() => setShowRegister(false)} onSave={handleAddProduct} />}

            {/* Bulk Register modal */}
            {showBulkRegister && (
                <BulkRegisterModal
                    selectedIds={selected}
                    products={products}
                    onClose={() => setShowBulkRegister(false)}
                    onApply={handleBulkRegister}
                    isDemo={isDemo}
                />
            )}

            {/* Bulk Price modal */}
            {showBulkPrice && (
                <BulkPriceModal
                    selectedIds={selected}
                    products={products}
                    onClose={() => setShowBulkPrice(false)}
                    onApply={handleBulkPrice}
                    isDemo={isDemo}
                />
            )}
        </div>
    );
}

/* ─── Product Detail Drawer ─────────────────────────────────────────────────── */
function ProductDetail({ product: p, onClose }) {
    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    const channelPrices = CHANNELS.filter(c => p.channels.includes(c.id)).map(c => ({
        ...c,
        price: p.price + (c.id === "amazon" ? 3000 : c.id === "coupang" ? -2000 : c.id === "11st" ? -1000 : 0),
        stock: p.inventory - Math.floor(Math.random() * 20),
        lastSync: p.lastSync,
    }));

    const options = [
        { name: "Color", values: ["블랙", "화이트", "네이비"] },
        { name: "사이즈", values: ["S", "M", "L", "XL"] },
    ];

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, animation: "fadeIn 0.2s" }} />
            <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 500, background: "linear-gradient(180deg,#0d1525,#090f1e)", borderLeft: "1px solid rgba(99,140,255,0.2)", zIndex: 201, overflowY: "auto", padding: 26, animation: "slideIn 0.25s cubic-bezier(.4,0,.2,1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: "var(--text-1)" }}>{p.name}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7", marginTop: 2 }}>{p.sku}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{p.category}</div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: "5px 10px" }}>✕</button>
                </div>

                {/* Product Image */}
                {p.image && (
                    <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
                        <img src={p.image} alt={p.name} style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />
                    </div>
                )}

                {/* Cost Price 구성 */}
                {(p.purchaseCost != null || p.productCost != null) && (
                    <div className="card" style={{ marginBottom: 14, border: "1px solid rgba(249,115,22,0.2)" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#f97316", marginBottom: 12 }}>💵 Cost Price 구성</div>
                        {[
                            ["매입Cost Price", p.purchaseCost, "#a78bfa"],
                            ["입·출고비", p.ioFee, "#60a5fa"],
                            ["보관비", p.storageFee, "#34d399"],
                            ["BasicActions비", p.workFee, "#fbbf24"],
                            ["배송비", p.shippingFee, "#f472b6"],
                        ].map(([label, val, color]) => val != null && (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                                <span style={{ fontSize: 11, color: "var(--text-2)" }}>{label}</span>
                                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color }}>{fmtKRW(val)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: "1px solid rgba(249,115,22,0.2)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>Product Cost</span>
                            <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: "#f97316" }}>{fmtKRW(p.productCost)}</span>
                        </div>
                        {p.price > 0 && p.productCost != null && (
                            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(34,197,94,0.08)" }}>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>마진율 (Sale Price 기준)</div>
                                <div style={{ fontWeight: 900, fontSize: 16, color: "#22c55e", fontFamily: "monospace" }}>
                                    {(((p.price - p.productCost) / p.price) * 100).toFixed(1)}%
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Price by channel */}
                <div className="card" style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>💰 Channelper Price</div>
                    {channelPrices.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 16 }}>{c.icon}</span>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: c.color }}>{fmtKRW(c.price)}</span>
                            <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-3)" }}>Stock {c.stock}</span>
                        </div>
                    ))}
                </div>

                {/* Options */}
                <div className="card" style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>🎨 옵션 / Variants ({p.variants})</div>
                    {options.map(o => (
                        <div key={o.name} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 5 }}>{o.name}</div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {o.values.map(v => <span key={v} className="badge" style={{ fontSize: 10, padding: "3px 8px" }}>{v}</span>)}
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>Total {p.variants * 4} SKU 조합</div>
                </div>

                {/* Inventory */}
                <div className="card" style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>📦 Stock 현황</div>
                    {[["가용 Stock", p.inventory, "#22c55e"], ["예약 Stock", Math.floor(p.inventory * 0.15), "#eab308"], ["안전 Stock", 20, "#4f8ef7"]].map(([l, v, c]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{l}</span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: c, fontFamily: "monospace" }}>{v}</span>
                        </div>
                    ))}
                    <ProgressBar pct={(p.inventory / 350) * 100} color={p.inventory < 20 ? "#ef4444" : p.inventory < 80 ? "#eab308" : "#22c55e"} />
                </div>

                <button className="btn-primary" style={{ width: "100%", marginBottom: 8 }}>🔄 이 Product만 Sync Now</button>
                <button className="btn-ghost" style={{ width: "100%" }} onClick={onClose}>Close</button>
            </div>
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes stripe{from{background-position:0 0}to{background-position:32px 0}}`}</style>
        </>
    );
}

/* ─── Tab: Sync Run ─────────────────────────────────────────────────────────── */
function SyncRunTab({ onJobCreated }) {
    const [mode, setMode] = useState("incremental"); // full | incremental
    const [selChs, setSelChs] = useState(new Set(["shopify", "coupang"]));
    const [selScp, setSelScp] = useState(new Set(["inventory", "price"]));
    const [dryRun, setDryRun] = useState(false);
    const [running, setRunning] = useState(false);
    const [liveJob, setLiveJob] = useState(null);
    const intervalRef = useRef(null);

    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };
    const toggleScp = id => { const n = new Set(selScp); n.has(id) ? n.delete(id) : n.add(id); setSelScp(n); };

    const estimate = useMemo(() => {
        const base = mode === "full" ? 1800 : 200;
        const chMul = selChs.size || 1;
        const scpMul = selScp.size || 1;
        return Math.round(base * chMul * scpMul * 0.5);
    }, [mode, selChs, selScp]);

    const startSync = async () => {
        if (!selChs.size || !selScp.size) return;
        setRunning(true);
        const jobId = `JOB-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const job = { id: jobId, type: mode, scope: [...selScp], channels: [...selChs], status: "running", progress: 0, total: estimate, done: 0, errors: 0, startedAt: new Date().toLocaleTimeString("ko-KR"), duration: "—" };
        setLiveJob(job);

        let done = 0;
        const t0 = Date.now();
        intervalRef.current = setInterval(() => {
            const step = Math.floor(estimate * 0.04) + Math.floor(Math.random() * 20);
            done = Math.min(estimate, done + step);
            const prog = Math.round((done / estimate) * 100);
            const errors = Math.floor(done * 0.003);
            setLiveJob(j => ({ ...j, progress: prog, done, errors, duration: `${((Date.now() - t0) / 1000).toFixed(0)}s` }));
            if (done >= estimate) {
                clearInterval(intervalRef.current);
                setLiveJob(j => ({ ...j, status: "done", progress: 100, done: estimate }));
                onJobCreated({ ...job, status: "done", progress: 100, done: estimate, duration: `${((Date.now() - t0) / 1000).toFixed(0)}s` });
                setRunning(false);
            }
        }, 300);
    };

    useEffect(() => () => clearInterval(intervalRef.current), []);

    const statusColor2 = s => s === "done" ? "#22c55e" : s === "running" ? "#4f8ef7" : "#eab308";

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Mode selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                    { k: "full", icon: "⬇", label: "Full Sync (Full Sync)", desc: "모든 Product·Stock·Price 재전송. 최초 Integration, 대량 Edit 후 권장.", time: "~20분" },
                    { k: "incremental", icon: "⚡", label: "Incremental Sync (Delta Sync)", desc: "Change된 항목만 Select적으로 전송. Stock/Price 실Time 반영.", time: "~1분" },
                ].map(m => (
                    <div key={m.k} onClick={() => setMode(m.k)} style={{ padding: "14px 16px", borderRadius: 12, cursor: "pointer", border: `2px solid ${mode === m.k ? "#4f8ef7" : "rgba(99,140,255,0.12)"}`, background: mode === m.k ? "rgba(79,142,247,0.06)" : "rgba(9,15,30,0.4)", transition: "all 200ms" }}>
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: mode === m.k ? "#4f8ef7" : "var(--text-1)" }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5 }}>{m.desc}</div>
                        <div style={{ marginTop: 8, fontSize: 10, color: mode === m.k ? "#4f8ef7" : "var(--text-3)", fontWeight: 700 }}>예상 Time: {m.time}</div>
                    </div>
                ))}
            </div>

            {/* Channel & Scope */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>📡 대상 Channel</div>
                    {CHANNELS.map(c => (
                        <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                            <input type="checkbox" checked={selChs.has(c.id)} onChange={() => toggleCh(c.id)} />
                            <span style={{ fontSize: 15 }}>{c.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                        </label>
                    ))}
                </div>
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>🗂 Sync Scope</div>
                    {SYNC_SCOPES.map(s => (
                        <label key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                            <input type="checkbox" style={{ marginTop: 2 }} checked={selScp.has(s.id)} onChange={() => toggleScp(s.id)} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.icon} {s.label}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{s.desc}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Options & estimate */}
            <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                    <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
                    <span>🧪 Dry-run (실제 반영 없이 검증만)</span>
                </label>
                <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>
                    예상 처리 건Count: <b style={{ color: "#4f8ef7" }}>{estimate.toLocaleString()}</b>개
                </div>
                <button className="btn-primary" onClick={startSync} disabled={running || !selChs.size || !selScp.size}
                    style={{ background: running ? "rgba(79,142,247,0.4)" : "linear-gradient(135deg,#4f8ef7,#a855f7)", minWidth: 140 }}>
                    {running ? "⏳ Syncing…" : dryRun ? "🧪 Dry-run Run" : "▶ Sync Start"}
                </button>
            </div>

            {/* Live progress */}
            {liveJob && (
                <div className="card" style={{ border: `1px solid ${statusColor2(liveJob.status)}33` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{liveJob.id}</span>
                            <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: 9 }}>{liveJob.type === "full" ? "All" : "증분"}</span>
                            {dryRun && <span className="badge badge-yellow" style={{ marginLeft: 4, fontSize: 9 }}>DRY-RUN</span>}
                        </div>
                        <span style={{ fontSize: 11, color: statusColor2(liveJob.status), fontWeight: 700 }}>
                            {liveJob.status === "running" ? `⏳ ${liveJob.progress}%` : "✓ Done"}
                        </span>
                    </div>
                    <ProgressBar pct={liveJob.progress} color={statusColor2(liveJob.status)} animated={liveJob.status === "running"} />
                    <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
                        <span>처리: <b style={{ color: "var(--text-1)" }}>{liveJob.done.toLocaleString()} / {liveJob.total.toLocaleString()}</b></span>
                        <span>Error: <b style={{ color: liveJob.errors > 0 ? "#ef4444" : "#22c55e" }}>{liveJob.errors}</b></span>
                        <span>경과: <b style={{ color: "var(--text-1)" }}>{liveJob.duration}</b></span>
                    </div>
                    {liveJob.status === "running" && (
                        <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(79,142,247,0.05)", borderRadius: 8, fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>
                            [{new Date().toLocaleTimeString("ko-KR")}] [{liveJob.channels.join(",")}] {liveJob.scope.join("+")} Sync In Progress…
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Tab: Price Sync ─────────────────────────────────────────────────────────── */
function PriceSyncTab() {
    const [globalMarkup, setGlobalMarkup] = useState(0);
    const [rounding, setRounding] = useState("900");
    const [exchangeRate, setExchangeRate] = useState(1320);
    const [channelRules, setChannelRules] = useState(
        Object.fromEntries(CHANNELS.map(c => [c.id, { enabled: true, markup: 0, minMargin: 15 }]))
    );
    const [preview, setPreview] = useState(false);

    const updateRule = (cid, k, v) => setChannelRules(r => ({ ...r, [cid]: { ...r[cid], [k]: v } }));

    const samplePrices = useMemo(() => {
        const base = 89000;
        return CHANNELS.map(c => {
            const r = channelRules[c.id];
            const marked = Math.round(base * (1 + (globalMarkup + r.markup) / 100));
            const rounded = rounding === "900" ? Math.ceil(marked / 1000) * 1000 - 100
                : rounding === "990" ? Math.ceil(marked / 1000) * 1000 - 10
                    : marked;
            const margin = ((rounded - 60000) / rounded * 100).toFixed(1);
            return { ...c, base, final: rounded, margin, ok: parseFloat(margin) >= r.minMargin };
        });
    }, [globalMarkup, rounding, channelRules]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Global settings */}
            <div className="card">
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>⚙ 공통 Price 규칙</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <label className="input-label">All 마크업 (%)</label>
                        <input className="input" type="number" value={globalMarkup} onChange={e => setGlobalMarkup(+e.target.value)} />
                    </div>
                    <div>
                        <label className="input-label">끝자리 반올림</label>
                        <select className="input" value={rounding} onChange={e => setRounding(e.target.value)}>
                            <option value="none">None</option>
                            <option value="900">~,900원</option>
                            <option value="990">~,990원</option>
                        </select>
                    </div>
                    <div>
                        <label className="input-label">기준 환율 (₩/USD)</label>
                        <input className="input" type="number" value={exchangeRate} onChange={e => setExchangeRate(+e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Channel rules */}
            <div className="card">
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>📡 Channelper Price 규칙</div>
                <table className="table">
                    <thead>
                        <tr><th>Channel</th><th>Apply</th><th>Add 마크업</th><th>Min 마진 (%)</th></tr>
                    </thead>
                    <tbody>
                        {CHANNELS.map(c => {
                            const r = channelRules[c.id];
                            return (
                                <tr key={c.id}>
                                    <td><span style={{ fontSize: 14 }}>{c.icon}</span> {c.name}</td>
                                    <td><input type="checkbox" checked={r.enabled} onChange={e => updateRule(c.id, "enabled", e.target.checked)} /></td>
                                    <td><input className="input" type="number" value={r.markup} style={{ width: 80, padding: "4px 8px" }} onChange={e => updateRule(c.id, "markup", +e.target.value)} /></td>
                                    <td><input className="input" type="number" value={r.minMargin} style={{ width: 80, padding: "4px 8px" }} onChange={e => updateRule(c.id, "minMargin", +e.target.value)} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Price preview */}
            <button className="btn-primary" onClick={() => setPreview(p => !p)} style={{ alignSelf: "flex-start" }}>
                {preview ? "미리보기 Close" : "💰 Price 미리보기"}
            </button>
            {preview && (
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                        Price Simulation (기준가 ₩89,000 · Cost Price ₩60,000)
                    </div>
                    <table className="table">
                        <thead><tr><th>Channel</th><th>기준가</th><th>최종 Sale Price</th><th>마진</th><th>Min 마진 충족</th></tr></thead>
                        <tbody>
                            {samplePrices.map(r => (
                                <tr key={r.id}>
                                    <td>{r.icon} {r.name}</td>
                                    <td style={{ fontFamily: "monospace" }}>{fmtKRW(r.base)}</td>
                                    <td style={{ fontFamily: "monospace", fontWeight: 700, color: r.color }}>{fmtKRW(r.final)}</td>
                                    <td style={{ fontFamily: "monospace", color: r.ok ? "#22c55e" : "#ef4444" }}>{r.margin}%</td>
                                    <td><span className={`badge ${r.ok ? "badge-green" : "badge-red"}`} style={{ fontSize: 9 }}>{r.ok ? "✓" : "✗"}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ─── Tab: Stock Sync ─────────────────────────────────────────────────────────── */
function InventorySyncTab() {
    const [threshold, setThreshold] = useState(20);
    const [reserve, setReserve] = useState(10);
    const [strategy, setStrategy] = useState("proportional");

    const lowStock = PRODUCTS_INIT.filter(p => p.inventory < 80).slice(0, 8);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="card">
                    <label className="input-label">품절 하한 임계Value</label>
                    <input className="input" type="number" value={threshold} onChange={e => setThreshold(+e.target.value)} />
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>Stock가 이 Value 이하이면 Channel에 품절 처리</div>
                </div>
                <div className="card">
                    <label className="input-label">안전 예비 Stock</label>
                    <input className="input" type="number" value={reserve} onChange={e => setReserve(+e.target.value)} />
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>항상 예약 보관, Channel 전송 제외</div>
                </div>
                <div className="card">
                    <label className="input-label">Channel 분배 전략</label>
                    <select className="input" value={strategy} onChange={e => setStrategy(e.target.value)}>
                        <option value="proportional">비례 분배</option>
                        <option value="priority">Priority Channel 우선</option>
                        <option value="equal">균등 분배</option>
                        <option value="manual">Count동 Settings</option>
                    </select>
                </div>
            </div>

            <div className="card">
                <div style={{ fontWeight: 700, fontSize: 12, color: "#eab308", marginBottom: 12 }}>⚠ Stock 부족 임박 Product ({lowStock.length}건)</div>
                <table className="table">
                    <thead><tr><th>SKU</th><th>Product Name</th><th>현Stock</th><th>Status</th><th>Channel 배분 후</th></tr></thead>
                    <tbody>
                        {lowStock.map(p => {
                            const avail = Math.max(0, p.inventory - reserve);
                            const color = p.inventory <= threshold ? "#ef4444" : "#eab308";
                            return (
                                <tr key={p.id}>
                                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{p.sku}</td>
                                    <td style={{ fontSize: 12 }}>{p.name}</td>
                                    <td style={{ fontWeight: 700, color, fontFamily: "monospace" }}>{p.inventory}</td>
                                    <td>
                                        <span className="badge" style={{ fontSize: 9, color, background: color + "18", border: `1px solid ${color}33` }}>
                                            {p.inventory <= threshold ? "품절 임박" : "Warning"}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                                        {p.channels.map(cid => `${ch(cid).icon}${Math.max(0, Math.floor(avail / p.channels.length))}`).join("  ")}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─── Tab: Actions 이력 ─────────────────────────────────────────────────────────── */
function JobHistoryTab({ jobs }) {
    const statusBadge = s => s === "done" ? "badge-green" : s === "running" ? "badge-blue" : "badge-red";
    return (
        <div className="card">
            <table className="table">
                <thead>
                    <tr><th>Job ID</th><th>Type</th><th>Channel</th><th>범위</th><th>처리</th><th>Error</th><th>In Progress률</th><th>Status</th><th>Start시각</th><th>소요</th></tr>
                </thead>
                <tbody>
                    {jobs.slice().reverse().map(j => (
                        <tr key={j.id}>
                            <td style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{j.id}</td>
                            <td><span className="badge" style={{ fontSize: 9 }}>{j.type === "full" ? "All" : "증분"}</span></td>
                            <td style={{ fontSize: 11 }}>{j.channels.map(c => ch(c).icon).join(" ")}</td>
                            <td style={{ fontSize: 10, color: "var(--text-3)" }}>{j.scope.join(", ")}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 11 }}>{j.done?.toLocaleString()} / {j.total?.toLocaleString()}</td>
                            <td style={{ color: j.errors > 0 ? "#ef4444" : "#22c55e", fontFamily: "monospace", fontSize: 11 }}>{j.errors}</td>
                            <td style={{ minWidth: 80 }}><ProgressBar pct={j.progress} color={j.status === "done" ? "#22c55e" : "#4f8ef7"} /></td>
                            <td><span className={`badge ${statusBadge(j.status)}`} style={{ fontSize: 9 }}>{j.status === "done" ? "Done" : j.status === "running" ? "Runin progress" : "Error"}</span></td>
                            <td style={{ fontSize: 11, color: "var(--text-3)" }}>{j.startedAt}</td>
                            <td style={{ fontSize: 11, color: "var(--text-3)" }}>{j.duration}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {jobs.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)" }}>Run 이력이 없습니다</div>}
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
const TABS = [
    { id: "catalog", label: "📚 카탈로그" },
    { id: "sync", label: "🔄 Sync Run" },
    { id: "price", label: "💰 Price 규칙" },
    { id: "inventory", label: "📦 Stock 정책" },
    { id: "history", label: "📋 Actions 이력" },
];

export default function CatalogSync() {
    const [tab, setTab] = useState("catalog");
    const [jobs, setJobs] = useState(MOCK_JOBS_INIT);

    const addJob = useCallback(j => setJobs(prev => [...prev, j]), []);

    /* KPI summary */
    const totalProducts = PRODUCTS_INIT.length;
    const syncedProducts = PRODUCTS_INIT.filter(p => p.lastSync).length;
    const errorProducts = PRODUCTS_INIT.filter(p => p.status === "error").length;
    const deltaProducts = PRODUCTS_INIT.filter(p => Object.keys(p.delta || {}).length > 0).length;

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(34,197,94,0.15))" }}>🔄</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Catalog &amp; Inventory Sync
                        </div>
                        <div className="hero-desc">
                            카탈로그·Product·옵션·Stock·Price을 6개 Channel에 All(Full) / 증분(Delta) 방식으로 Sync합니다.
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {CHANNELS.map(c => <span key={c.id} className="badge" style={{ fontSize: 10, background: c.color + "18", color: c.color, border: `1px solid ${c.color}33` }}>{c.icon} {c.name}</span>)}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid4 fade-up fade-up-1">
                {[
                    { l: "All Products", v: totalProducts, c: "#4f8ef7" },
                    { l: "Sync Done", v: syncedProducts, c: "#22c55e" },
                    { l: "Change 감지", v: deltaProducts, c: "#f97316" },
                    { l: "Error Product", v: errorProducts, c: "#ef4444" },
                ].map(({ l, v, c }, i) => (
                    <div key={l} className="kpi-card fade-up" style={{ "--accent": c, animationDelay: `${i * 50}ms` }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c }}>{v}</div>
                        <ProgressBar pct={(v / totalProducts) * 100} color={c} />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="card card-glass fade-up fade-up-2">
                <div className="tabs" style={{ marginBottom: 20 }}>
                    {TABS.map(t => (
                        <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
                    ))}
                </div>
                {tab === "catalog" && <CatalogTab />}
                {tab === "sync" && <SyncRunTab onJobCreated={addJob} />}
                {tab === "price" && <PriceSyncTab />}
                {tab === "inventory" && <InventorySyncTab />}
                {tab === "history" && <JobHistoryTab jobs={jobs} />}
            </div>
        </div>
    );
}
