import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n as _useI18n } from "../i18n";
import PO_DICT from './poI18n.js';
/* Wrap useI18n: priceOpt.* keys resolved from embedded dict first */
function useI18n() {
  const ctx = _useI18n();
  const lang = ctx.lang || 'en';
  const origT = ctx.t;
  const t = (key, fb) => {
    if (key && key.startsWith('priceOpt.')) {
      const k = key.slice(9);
      const loc = PO_DICT[lang] || PO_DICT.en || {};
      if (loc[k] !== undefined) return loc[k];
    }
    return origT(key, fb);
  };
  return { ...ctx, t };
}
import { useGlobalData } from "../context/GlobalDataContext";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { CHANNEL_RATES, getChannelRate } from '../constants/channelRates.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { getJsonAuth, getJsonAuthAbortable, postJsonAuth } from "../services/apiClient";

/* ── Security Monitor ── */
const SEC_PATTERNS = [/[<>]script/i, /union\s+select/i, /drop\s+table/i, /;\s*--/i, /\.\.\/\.\.\//i, /eval\s*\(/i, /javascript:/i, /on(error|load|click)\s*=/i];
function checkSecurity(value) {
    if (!value || typeof value !== 'string') return null;
    for (const p of SEC_PATTERNS) { if (p.test(value)) return { pattern: p.source, value: value.slice(0, 80), at: new Date().toISOString() }; }
    return null;
}

const API = "/api";
const AUTH = (token) => ({
    Authorization: `Bearer ${token || localStorage.getItem("genie_auth_token") || ""}`,
});

const PCT = (v) => (v == null ? "—" : (Number(v) * 100).toFixed(1) + "%");

const CH_COLORS = {
    coupang: "#ef4444", naver: "#22c55e", "11st": "#f97316",
    gmarket: "#6366f1", kakaogift: "#fbbf24", lotteon: "#a855f7",
    auction: "#06b6d4", wemef: "#ec4899", tmon: "#14b8a6",
};
const chColor = (k) => CH_COLORS[k] || "#64748b";

const Badge = ({ label, color }) => (
    <span style={{
        background: color + "22", color, border: `1px solid ${color}55`,
        borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{label}</span>
);

const Card = ({ children, style = {} }) => (
    <div className="card" style={style}>{children}</div>
);

const Stat = ({ label, value, color = "#e2e8f0", sub = null }) => (
    <Card>
        <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        {sub && <div className="sub" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </Card>
);

const ScoreBar = ({ value, max = 1, color = "#6366f1" }) => {
    const pct = Math.min(100, Math.round(((value || 0) / Math.max(max, 0.001)) * 100));
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 10, color, minWidth: 34, fontWeight: 700 }}>{pct}%</span>
        </div>
    
    );
};

// ── Tab: Summary ──────────────────────────────────────────────────────────────
function SummaryTab({ token }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const { inventory, channelProductPrices, isDemo } = useGlobalData();
    const [data, setData] = useState(null);

    // ★ Demo fallback: inventory 시드 데이터로 요약 지표 자동 생성
    const demoFallback = useMemo(() => {
        if (!inventory || inventory.length === 0) return null;
        const products = inventory.length;
        const avgMargin = inventory.reduce((s, item) => {
            const margin = item.price > 0 ? (item.price - (item.cost || 0)) / item.price : 0;
            return s + margin;
        }, 0) / (products || 1);
        const avgOptPx = Math.round(inventory.reduce((s, item) => s + (item.price || 0), 0) / (products || 1));

        // 채널별 집계
        const channelMap = {};
        inventory.forEach(item => {
            const prices = channelProductPrices?.[item.sku] || {};
            Object.entries(prices).forEach(([ch, price]) => {
                if (!channelMap[ch]) channelMap[ch] = { channel: ch, cnt: 0, totalPrice: 0, totalMargin: 0 };
                channelMap[ch].cnt++;
                channelMap[ch].totalPrice += price;
                channelMap[ch].totalMargin += item.price > 0 ? (price - (item.cost || 0)) / price : 0;
            });
        });
        const by_channel = Object.values(channelMap).map(c => ({
            channel: c.channel,
            cnt: c.cnt,
            avg_optimal: (c.totalPrice / (c.cnt || 1)).toFixed(0),
            avg_margin: (c.totalMargin / (c.cnt || 1)).toFixed(3),
        }));

        return {
            products,
            elasticity_pts: Math.round(products * 1.5),
            recommendations: Math.round(products * 0.8),
            avg_margin: avgMargin,
            avg_optimal_px: avgOptPx,
            by_channel,
            recent: inventory.slice(0, 5).map(item => {
                const firstChPrice = Object.values(channelProductPrices?.[item.sku] || {})[0];
                const optPrice = firstChPrice || Math.round(item.price * 1.05);
                return {
                    sku: item.sku,
                    product_name: item.name,
                    channel: Object.keys(channelProductPrices?.[item.sku] || { naver: true })[0] || 'naver',
                    current_price: item.price,
                    optimal_price: optPrice,
                    expected_margin: item.price > 0 ? (optPrice - (item.cost || 0)) / optPrice : 0,
                };
            }),
        };
    }, [inventory, channelProductPrices]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/summary`, ac.signal)
            .then(r => r.json())
            .then(d => {
                // API가 200 OK지만 데이터가 비어있으면 데모 폴백 사용
                if ((!d.products || d.products === 0) && demoFallback) setData(demoFallback);
                else setData(d);
            })
            .catch(() => { if (demoFallback) setData(demoFallback); });
        return () => ac.abort();
    }, [token, demoFallback]);

    const reload = () => {
        setData(null);
        getJsonAuth(`/v420/price/summary`)
            .then(r => r.json())
            .then(d => {
                if ((!d.products || d.products === 0) && demoFallback) setData(demoFallback);
                else setData(d);
            })
            .catch(() => { if (demoFallback) setData(demoFallback); });
    };

    if (!data) return <div className="sub" style={{ padding: 24 }}>{t("priceOpt.loading")}</div>;

    return (
        <div>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
                <Stat label={t("priceOpt.regProduct")} value={data.products} color="#6366f1" />
                <Stat label={t("priceOpt.elasticityData")} value={data.elasticity_pts + t("priceOpt.items")} color="#06b6d4" />
                <Stat label={t("priceOpt.optAdoption")} value={data.recommendations + t("priceOpt.items")} color="#f97316" />
                <Stat label={t("priceOpt.avgMargin")} value={PCT(data.avg_margin)} color="#22c55e"
                    sub={data.avg_optimal_px ? t("priceOpt.avgRecPrice") + " " + fmt(data.avg_optimal_px) : null} />
            </div>

            {/* Channel summary */}
            {data.by_channel?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{t("priceOpt.channelResult")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
                        {data.by_channel.map((ch, i) => (
                            <Card key={i} style={{ borderLeft: `3px solid ${chColor(ch.channel)}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <Badge label={ch.channel} color={chColor(ch.channel)} />
                                    <span style={{ fontSize: 11, color: "#7c8fa8" }}>{ch.cnt} {t("priceOpt.items")}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{t("priceOpt.avgRecPrice")}</div>
                                <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{fmt(parseFloat(ch.avg_optimal))}</div>
                                <div style={{ marginTop: 6 }}>
                                    <ScoreBar value={parseFloat(ch.avg_margin)} max={0.6} color={chColor(ch.channel)} />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent recommendations */}
            {data.recent?.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{t("priceOpt.recentHistory")}</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#7c8fa8" }}>
                                {["SKU", t("priceOpt.regProduct"), "Channel", t("priceOpt.currentPrice"), t("priceOpt.optimalPrice"), t("priceOpt.expectedMargin")].map(h => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: h === "현재가" || h === "권장가" || h === "마진율" ? "right" : "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.recent.map((r, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "5px 8px", fontFamily: "monospace", color: "#6366f1" }}>{r.sku}</td>
                                    <td style={{ padding: "5px 8px" }}>{r.product_name || "—"}</td>
                                    <td style={{ padding: "5px 8px" }}><Badge label={r.channel} color={chColor(r.channel)} /></td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8" }}>{fmt(r.current_price)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{fmt(r.optimal_price)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#f97316" }}>{PCT(r.expected_margin)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!data.recommendations && (
                <div className="sub" style={{ textAlign: "center", padding: 24 }}>
                    {t("priceOpt.noAnalysis")}
                </div>
            )}

            <button className="btn" onClick={reload} style={{ marginTop: 14 }}>↺ {t("priceOpt.refresh")}</button>
        </div>
    );
}

const CAT_KEYS = ['catElecAudio','catElecInput','catElecAccessory','catElecCamera','catElecCharging','catFashionClothing','catFashionShoes','catBeautySkin','catBeautyMakeup','catFoodHealth','catHomeKitchen','catSportsGear','catBooksStationery','catToysHobbies'];
const UNIT_KEYS = ['unitEach','unitDevice','unitBottle','unitSet','unitBox','unitPallet'];

// ── Tab: Products (Enterprise-Grade) ──────────────────────────────────────────
function ProductsTab({ token }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const { inventory } = useGlobalData();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        sku: "", product_name: "", category: "", spec: "", unit: "unitEach",
        cost_price: "", io_fee: "", storage_fee: "", work_fee: "", shipping_fee: "",
        target_margin: "0.30", base_price: "",
        // ── Enterprise: Box/Pallet/Image/Stock ──
        qty_per_box: "", boxes_per_pallet: "", initial_stock: "",
        stock_input_type: "each", // each | box | pallet
        product_image: null, image_preview: null,
    });
    const [msg, setMsg] = useState("");
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // ★ inventory → PriceOpt products 변환 (데모 폴백)
    const inventoryProducts = useMemo(() => {
        if (!inventory || inventory.length === 0) return [];
        return inventory.map(item => ({
            sku: item.sku,
            product_name: item.name,
            category: item.category || '',
            cost_price: item.cost || 0,
            purchase_cost: item.cost || 0,
            target_margin: item.price > 0 ? parseFloat(((item.price - (item.cost || 0)) / item.price).toFixed(2)) : 0.30,
            base_price: item.price || 0,
            initial_stock: Object.values(item.stock || {}).reduce((s, v) => s + v, 0),
        }));
    }, [inventory]);

    const productCost = React.useMemo(() => {
        const vals = [form.cost_price, form.io_fee, form.storage_fee, form.work_fee, form.shipping_fee];
        if (vals.every(v => v === "" || v == null)) return null;
        return vals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
    }, [form.cost_price, form.io_fee, form.storage_fee, form.work_fee, form.shipping_fee]);

    /* ── Computed: Total individual units based on input type ── */
    const stockSummary = React.useMemo(() => {
        const qpb = parseInt(form.qty_per_box) || 0;
        const bpp = parseInt(form.boxes_per_pallet) || 0;
        const raw = parseInt(form.initial_stock) || 0;
        let totalUnits = 0, totalBoxes = 0, totalPallets = 0;
        if (form.stock_input_type === 'each') {
            totalUnits = raw;
            totalBoxes = qpb > 0 ? Math.floor(raw / qpb) : 0;
            totalPallets = (qpb > 0 && bpp > 0) ? Math.floor(totalBoxes / bpp) : 0;
        } else if (form.stock_input_type === 'box') {
            totalBoxes = raw;
            totalUnits = qpb > 0 ? raw * qpb : raw;
            totalPallets = bpp > 0 ? Math.floor(raw / bpp) : 0;
        } else {
            totalPallets = raw;
            totalBoxes = bpp > 0 ? raw * bpp : raw;
            totalUnits = (qpb > 0 && bpp > 0) ? raw * bpp * qpb : raw;
        }
        return { totalUnits, totalBoxes, totalPallets, qpb, bpp };
    }, [form.qty_per_box, form.boxes_per_pallet, form.initial_stock, form.stock_input_type]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/products`, ac.signal)
            .then(r => r.json())
            .then(d => {
                const prods = d.products || [];
                // API가 빈 배열을 반환하면 inventory 데모 폴백 사용
                if (prods.length === 0 && inventoryProducts.length > 0) setProducts(inventoryProducts);
                else setProducts(prods);
            })
            .catch(() => { if (inventoryProducts.length > 0) setProducts(inventoryProducts); });
        return () => ac.abort();
    }, [token, inventoryProducts]);

    /* ── BroadcastChannel: Listen for product updates from CatalogSync ── */
    useEffect(() => {
        const bc = new BroadcastChannel('genie_product_sync');
        bc.onmessage = (e) => {
            if (e.data?.type === 'PRODUCT_UPDATE' && e.data.source !== 'priceOpt') {
                load();
            }
        };
        return () => bc.close();
    }, []);

    const broadcastProductUpdate = () => {
        try {
            const bc = new BroadcastChannel('genie_product_sync');
            bc.postMessage({ type: 'PRODUCT_UPDATE', source: 'priceOpt', ts: Date.now() });
            bc.close();
        } catch {}
    };

    const load = () =>
        getJsonAuth(`/v420/price/products`)
            .then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => { });

    const save = async () => {
        let d;
        try {
            d = await postJsonAuth(`/v420/price/products`, {
                sku: form.sku,
                product_name: form.product_name,
                category: form.category,
                spec: form.spec,
                unit: form.unit,
                cost_price: productCost != null ? productCost : (parseFloat(form.cost_price) || 0),
                purchase_cost: parseFloat(form.cost_price) || 0,
                io_fee: parseFloat(form.io_fee) || 0,
                storage_fee: parseFloat(form.storage_fee) || 0,
                work_fee: parseFloat(form.work_fee) || 0,
                shipping_fee: parseFloat(form.shipping_fee) || 0,
                target_margin: parseFloat(form.target_margin) || 0.30,
                base_price: form.base_price ? parseFloat(form.base_price) : undefined,
                qty_per_box: parseInt(form.qty_per_box) || 0,
                boxes_per_pallet: parseInt(form.boxes_per_pallet) || 0,
                initial_stock: stockSummary.totalUnits,
                stock_boxes: stockSummary.totalBoxes,
                stock_pallets: stockSummary.totalPallets,
                product_image: form.image_preview || null,
            });
        } catch (e) {
            d = { ok: false, error: e.message };
        }
        setMsg(d.ok ? `\u2705 ${t('priceOpt.excelUploadSuccess')}: ${form.sku}` : `\u274c ${d.error || JSON.stringify(d)}`);
        load();
        if (d.ok) broadcastProductUpdate();
    };

    /* ═══ Image handling ═══ */
    const handleImageFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { setMsg('\u274c ' + t('priceOpt.imgMaxSize')); return; }
        const reader = new FileReader();
        reader.onload = (e) => setForm(f => ({ ...f, product_image: file, image_preview: e.target.result }));
        reader.readAsDataURL(file);
    };
    const handleImageDrop = (e) => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files?.[0]); };
    const handleImageSelect = (e) => { handleImageFile(e.target.files?.[0]); };
    const removeImage = () => setForm(f => ({ ...f, product_image: null, image_preview: null }));

    /* ═══ Excel Download ═══ */
    const downloadExcel = async () => {
        const XLSX = (await import('xlsx')).default || await import('xlsx');
        const headers = ['SKU', t('priceOpt.productName'), t('priceOpt.category'), t('priceOpt.spec'),
            t('priceOpt.unit'), t('priceOpt.purchaseCost'), t('priceOpt.ioFee'), t('priceOpt.storageFee'),
            t('priceOpt.workFee'), t('priceOpt.shippingFee'), t('priceOpt.productCostAuto'),
            t('priceOpt.targetMarginRate'), t('priceOpt.baseSalePrice'),
            t('priceOpt.qtyPerBox'), t('priceOpt.boxesPerPallet'), t('priceOpt.initialStockUnits')];
        const rows = products.map(p => [
            p.sku, p.product_name, p.category || '', p.spec || '', p.unit || '',
            p.purchase_cost || p.cost_price || 0, p.io_fee || 0, p.storage_fee || 0,
            p.work_fee || 0, p.shipping_fee || 0, p.cost_price || 0,
            p.target_margin || 0.30, p.base_price || 0,
            p.qty_per_box || 0, p.boxes_per_pallet || 0, p.initial_stock || 0,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map(() => ({ wch: 16 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, `PriceOpt_Products_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    /* ═══ Excel Upload ═══ */
    const handleExcelUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setMsg('');
        try {
            const XLSX = (await import('xlsx')).default || await import('xlsx');
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (rows.length < 2) { setMsg('\u274c ' + t('priceOpt.excelEmptyFile')); return; }
            let successCount = 0, failCount = 0;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0]) continue;
                try {
                    const purchaseCost = parseFloat(row[5]) || 0;
                    const ioFee = parseFloat(row[6]) || 0;
                    const storageFee = parseFloat(row[7]) || 0;
                    const workFee = parseFloat(row[8]) || 0;
                    const shippingFee = parseFloat(row[9]) || 0;
                    const totalCost = purchaseCost + ioFee + storageFee + workFee + shippingFee;
                    const d = await postJsonAuth(`/v420/price/products`, {
                        sku: String(row[0]).trim(),
                        product_name: String(row[1] || '').trim(),
                        category: String(row[2] || '').trim(),
                        spec: String(row[3] || '').trim(),
                        unit: String(row[4] || 'unitEach').trim(),
                        purchase_cost: purchaseCost, io_fee: ioFee, storage_fee: storageFee,
                        work_fee: workFee, shipping_fee: shippingFee,
                        cost_price: totalCost,
                        target_margin: parseFloat(row[11]) || 0.30,
                        base_price: parseFloat(row[12]) || undefined,
                        qty_per_box: parseInt(row[13]) || 0,
                        boxes_per_pallet: parseInt(row[14]) || 0,
                        initial_stock: parseInt(row[15]) || 0,
                    });
                    if (d.ok) successCount++; else failCount++;
                } catch { failCount++; }
            }
            setMsg(`\u2705 ${t('priceOpt.excelUploadResult')}: ${successCount} ${t('priceOpt.excelSuccess')}, ${failCount} ${t('priceOpt.excelFail')}`);
            load();
            if (successCount > 0) broadcastProductUpdate();
        } catch (err) {
            setMsg(`\u274c ${t('priceOpt.excelUploadError')}: ${err.message}`);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    /* ═══ Excel Template Download ═══ */
    const downloadTemplate = async () => {
        const XLSX = (await import('xlsx')).default || await import('xlsx');
        const headers = ['SKU', 'Product Name', 'Category', 'Spec', 'Unit',
            'Purchase Cost', 'IO Fee', 'Storage Fee', 'Work Fee', 'Shipping Fee',
            'Total Cost (auto)', 'Target Margin (0.30=30%)', 'Base Sale Price',
            'Qty per Box', 'Boxes per Pallet', 'Initial Stock (units)'];
        const example = ['SKU-001', 'Sample Product', 'catElecAudio', '100x50mm', 'unitEach',
            10000, 500, 300, 200, 1500, 12500, 0.30, 18000, 24, 40, 960];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        ws['!cols'] = headers.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'PriceOpt_Product_Template.xlsx');
    };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const inpStyle = {
        width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0",
        borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12, boxSizing: "border-box",
    };
    const lbl = (text) => (
        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{text}</label>
    );

    return (
        <div style={{ display: "grid", gap: 20 }}>
            {/* ═══ Excel Toolbar ═══ */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#4f8ef7', marginRight: 8 }}>📊 Excel</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 7, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    📥 {uploading ? t('priceOpt.excelUploading') : t('priceOpt.excelBulkUpload')}
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: 'none' }} />
                </label>
                <button onClick={downloadExcel} disabled={products.length === 0}
                    style={{ padding: '5px 14px', borderRadius: 7, background: 'rgba(99,140,255,0.12)', border: '1px solid rgba(99,140,255,0.3)', color: '#4f8ef7', fontSize: 11, fontWeight: 700, cursor: products.length ? 'pointer' : 'default' }}>
                    📤 {t('priceOpt.excelDownload')} ({products.length})
                </button>
                <button onClick={downloadTemplate}
                    style={{ padding: '5px 14px', borderRadius: 7, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    📋 {t('priceOpt.excelTemplate')}
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* ═══ Enterprise Registration Form ═══ */}
                <div>
                    <h4 style={{ marginTop: 0, fontSize: 13 }}>{t("priceOpt.tabProducts")}</h4>
                    <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                        {/* ── Product Image Upload ── */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 8 }}>📷 {t('priceOpt.productImageTitle')}</div>
                            {form.image_preview ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img src={form.image_preview} alt="Product" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '2px solid #6366f155' }} />
                                    <button onClick={removeImage} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>
                            ) : (
                                <div
                                    onDrop={handleImageDrop}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onClick={() => document.getElementById('prod-img-input')?.click()}
                                    style={{
                                        border: `2px dashed ${dragOver ? '#6366f1' : '#1c2842'}`,
                                        borderRadius: 8, padding: '18px 12px', textAlign: 'center',
                                        cursor: 'pointer', transition: 'border-color 0.2s',
                                        background: dragOver ? 'rgba(99,102,241,0.06)' : 'transparent' }}
                                >
                                    <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
                                    <div style={{ fontSize: 11, color: '#7c8fa8' }}>{t('priceOpt.imgDragDrop')}</div>
                                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>PNG, JPG, WebP ({t('priceOpt.imgMaxLabel')} 5MB)</div>
                                    <input id="prod-img-input" type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                                </div>
                            )}
                        </div>

                        {/* SKU / Product Name */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>{lbl("SKU *")}<input style={inpStyle} value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="SKU-001" /></div>
                            <div>{lbl(t('priceOpt.productName'))}<input style={inpStyle} value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder={t('priceOpt.productName')} /></div>
                        </div>
                        <div>{lbl(t('priceOpt.category'))}<select style={inpStyle} value={form.category} onChange={e => set("category", e.target.value)}>
                            <option value="">{t('priceOpt.categorySelect')}</option>
                            {CAT_KEYS.map(k => <option key={k} value={k}>{t('priceOpt.'+k)}</option>)}
                        </select></div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                            <div>{lbl(t('priceOpt.spec'))}<input style={inpStyle} value={form.spec} onChange={e => set("spec", e.target.value)} placeholder="100x200x50mm, 1kg" /></div>
                            <div>{lbl(t('priceOpt.unit'))}<select style={inpStyle} value={form.unit} onChange={e => set("unit", e.target.value)}>
                                {UNIT_KEYS.map(k => <option key={k} value={k}>{t('priceOpt.'+k)}</option>)}
                            </select></div>
                        </div>

                        {/* ── Box / Pallet Details ── */}
                        <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700, marginBottom: 8 }}>📦 {t('priceOpt.boxPalletTitle')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                    {lbl(t('priceOpt.qtyPerBox'))}
                                    <input style={inpStyle} type="number" min="0" value={form.qty_per_box}
                                        onChange={e => set('qty_per_box', e.target.value)} placeholder="24" />
                                </div>
                                <div>
                                    {lbl(t('priceOpt.boxesPerPallet'))}
                                    <input style={inpStyle} type="number" min="0" value={form.boxes_per_pallet}
                                        onChange={e => set('boxes_per_pallet', e.target.value)} placeholder="40" />
                                </div>
                            </div>
                            {(parseInt(form.qty_per_box) > 0 || parseInt(form.boxes_per_pallet) > 0) && (
                                <div style={{ marginTop: 8, fontSize: 10, color: '#7c8fa8', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {parseInt(form.qty_per_box) > 0 && <span>📦 1 {t('priceOpt.unitBox')} = <b style={{ color: '#06b6d4' }}>{form.qty_per_box}</b> {t('priceOpt.unitEach')}</span>}
                                    {parseInt(form.boxes_per_pallet) > 0 && <span>🏗️ 1 {t('priceOpt.unitPallet')} = <b style={{ color: '#06b6d4' }}>{form.boxes_per_pallet}</b> {t('priceOpt.unitBox')}</span>}
                                    {parseInt(form.qty_per_box) > 0 && parseInt(form.boxes_per_pallet) > 0 && (
                                        <span>🏗️ 1 {t('priceOpt.unitPallet')} = <b style={{ color: '#22c55e' }}>{parseInt(form.qty_per_box) * parseInt(form.boxes_per_pallet)}</b> {t('priceOpt.unitEach')}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Initial Stock ── */}
                        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 8 }}>📊 {t('priceOpt.stockInputTitle')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>
                                    {lbl(t('priceOpt.stockInputType'))}
                                    <select style={inpStyle} value={form.stock_input_type} onChange={e => set('stock_input_type', e.target.value)}>
                                        <option value="each">📦 {t('priceOpt.inputByEach')}</option>
                                        <option value="box">📦 {t('priceOpt.inputByBox')}</option>
                                        <option value="pallet">🏗️ {t('priceOpt.inputByPallet')}</option>
                                    </select>
                                </div>
                                <div>
                                    {lbl(t('priceOpt.stockQtyInput'))}
                                    <input style={inpStyle} type="number" min="0" value={form.initial_stock}
                                        onChange={e => set('initial_stock', e.target.value)}
                                        placeholder={form.stock_input_type === 'each' ? '960' : form.stock_input_type === 'box' ? '40' : '1'} />
                                </div>
                            </div>
                            {parseInt(form.initial_stock) > 0 && (
                                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                    <div style={{ background: "#f1f5f9", borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 9, color: '#7c8fa8' }}>{t('priceOpt.totalUnits')}</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#22c55e' }}>{stockSummary.totalUnits.toLocaleString()}</div>
                                    </div>
                                    <div style={{ background: "#f1f5f9", borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 9, color: '#7c8fa8' }}>{t('priceOpt.totalBoxes')}</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#06b6d4' }}>{stockSummary.totalBoxes.toLocaleString()}</div>
                                    </div>
                                    <div style={{ background: "#f1f5f9", borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 9, color: '#7c8fa8' }}>{t('priceOpt.totalPallets')}</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#a855f7' }}>{stockSummary.totalPallets.toLocaleString()}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cost Price */}
                        <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, marginBottom: 8 }}>{t('priceOpt.costBreakdown')}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                <div>{lbl(t('priceOpt.purchaseCost'))}<input style={inpStyle} type="number" value={form.cost_price} onChange={e => set("cost_price", e.target.value)} placeholder="0" /></div>
                                <div>{lbl(t('priceOpt.ioFee'))}<input style={inpStyle} type="number" value={form.io_fee} onChange={e => set("io_fee", e.target.value)} placeholder="0" /></div>
                                <div>{lbl(t('priceOpt.storageFee'))}<input style={inpStyle} type="number" value={form.storage_fee} onChange={e => set("storage_fee", e.target.value)} placeholder="0" /></div>
                                <div>{lbl(t('priceOpt.workFee'))}<input style={inpStyle} type="number" value={form.work_fee} onChange={e => set("work_fee", e.target.value)} placeholder="0" /></div>
                                <div>{lbl(t('priceOpt.shippingFee'))}<input style={inpStyle} type="number" value={form.shipping_fee} onChange={e => set("shipping_fee", e.target.value)} placeholder="0" /></div>
                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                    <div style={{ background: "#f1f5f9", borderRadius: 6, padding: "6px 10px", border: "1px solid rgba(249,115,22,0.3)" }}>
                                        <div style={{ fontSize: 9, color: "#7c8fa8", marginBottom: 2 }}>{t('priceOpt.productCostAuto')}</div>
                                        <div style={{ fontWeight: 800, fontSize: 15, color: "#f97316" }}>{productCost != null ? fmt(productCost) : "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>{lbl(t('priceOpt.targetMarginRate'))}<input style={inpStyle} type="number" value={form.target_margin} onChange={e => set("target_margin", e.target.value)} placeholder="0.30" /></div>
                            <div>{lbl(t('priceOpt.baseSalePrice'))}<input style={inpStyle} type="number" value={form.base_price} onChange={e => set("base_price", e.target.value)} placeholder="65000" /></div>
                        </div>
                    </div>
                    <button className="btn" onClick={save} disabled={!form.sku} style={{ width: "100%" }}>{t('priceOpt.saveProduct')}</button>
                    {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith("\u2705") ? "#22c55e" : "#ef4444" }}>{msg}</div>}
                </div>

                {/* ═══ Product List ═══ */}
                <div>
                    <h4 style={{ marginTop: 0, fontSize: 13 }}>{t("priceOpt.regProducts")} ({products.length})</h4>
                    {products.map((p, i) => (
                        <div key={i} style={{ padding: "10px 12px", background: "#f1f5f9", borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                            <div style={{ display: "flex", gap: 10 }}>
                                {p.product_image && (
                                    <img src={p.product_image} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: "1px solid #e2e8f0", flexShrink: 0 }} />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontFamily: "monospace", color: "#6366f1", fontWeight: 700 }}>{p.sku}</span>
                                        <span style={{ color: "#94a3b8", fontSize: 10 }}>{p.category || ""} {p.unit ? `\u00b7 ${p.unit}` : ""}</span>
                                    </div>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.product_name}</div>
                                    {p.spec && <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{t('priceOpt.specLabel')}: {p.spec}</div>}
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, color: "#7c8fa8", marginTop: 6 }}>
                                <span>{t('priceOpt.costLabel')} <b style={{ color: "#f97316" }}>{fmt(p.cost_price)}</b></span>
                                <span>{t('priceOpt.marginLabel')} <b style={{ color: "#22c55e" }}>{PCT(p.target_margin)}</b></span>
                                <span>{t('priceOpt.basePriceLabel')} <b style={{ color: '#1e293b' }}>{fmt(p.base_price)}</b></span>
                            </div>
                            {(p.qty_per_box > 0 || p.initial_stock > 0) && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                    {p.qty_per_box > 0 && <span style={{ fontSize: 10, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', padding: '1px 6px', borderRadius: 4 }}>📦 1Box={p.qty_per_box}{t('priceOpt.unitEach')}</span>}
                                    {p.boxes_per_pallet > 0 && <span style={{ fontSize: 10, background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '1px 6px', borderRadius: 4 }}>🏗️ 1PL={p.boxes_per_pallet}Box</span>}
                                    {p.initial_stock > 0 && <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '1px 6px', borderRadius: 4 }}>📊 {p.initial_stock.toLocaleString()}{t('priceOpt.unitEach')}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                    {products.length === 0 && <div style={{ color: "#64748b", fontSize: 11, padding: 12 }}>{t("priceOpt.noProducts")}</div>}
                </div>
            </div>
        </div>
    );
}


// ── Tab: Optimize ─────────────────────────────────────────────────────────────
function OptimizeTab({ token }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ sku: "", channel: "*", current_price: "", inventory: "0" });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState([]);
    // [v11] CatalogSync 양방향 Sync
    const { updateCatalogChannelPrices, updateProductPrice, inventory } = useGlobalData();

    // ★ inventory → OptimizeTab products 폴백
    const inventoryProdsOpt = useMemo(() => {
        if (!inventory || inventory.length === 0) return [];
        return inventory.map(item => ({
            sku: item.sku,
            product_name: item.name,
            cost_price: item.cost || 0,
            base_price: item.price || 0,
        }));
    }, [inventory]);

    const loadRecent = useCallback((signal) =>
        getJsonAuthAbortable(`/v420/price/recommendations`, signal)
            .then(r => r.json())
            .then(d => setRecent(d.recommendations?.slice(0, 6) || []))
            .catch(() => { })
        , [token]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/products`, ac.signal)
            .then(r => r.json())
            .then(d => {
                const prods = d.products || [];
                // API가 빈 배열이면 inventory 폴백
                if (prods.length === 0 && inventoryProdsOpt.length > 0) {
                    setProducts(inventoryProdsOpt);
                    setForm(f => ({ ...f, sku: inventoryProdsOpt[0].sku }));
                } else {
                    setProducts(prods);
                    if (prods.length) setForm(f => ({ ...f, sku: prods[0].sku }));
                }
            }).catch(() => {
                if (inventoryProdsOpt.length > 0) {
                    setProducts(inventoryProdsOpt);
                    setForm(f => ({ ...f, sku: inventoryProdsOpt[0].sku }));
                }
            });
        loadRecent(ac.signal);
        return () => ac.abort();
    }, [token, loadRecent, inventoryProdsOpt]);

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const d = await postJsonAuth(`/v420/price/optimize`, {
                sku: form.sku,
                channel: form.channel || "*",
                current_price: form.current_price ? parseFloat(form.current_price) : undefined,
                inventory: parseInt(form.inventory) || 0,
            });
            setResult(d);
            loadRecent();
            // [v11] PriceOpt → CatalogSync → OrderHub 양방향 Sync
            if (d.sku && d.optimal_price) {
                const channelKey = form.channel === '*' ? 'all' : form.channel;
                updateCatalogChannelPrices?.(d.sku, { [channelKey]: d.optimal_price });
                updateProductPrice?.(d.sku, d.optimal_price, channelKey === 'all' ? null : channelKey);
            }
        } finally { setLoading(false); }
    };

    /* ── Build channel list from ConnectorSync + localStorage fallback ── */
    const { connectedChannels } = useConnectorSync();
    const OPT_CHANNELS = useMemo(() => {
        const all = ["*"];
        /* Priority 1: ConnectorSyncContext (real-time from Integration Hub) */
        const csKeys = Object.entries(connectedChannels)
            .filter(([, v]) => v?.connected)
            .map(([k]) => k)
            .filter(k => CHANNEL_RATES[k]); /* only sales channels with fee data */
        if (csKeys.length > 0) { csKeys.forEach(k => all.push(k)); return all; }
        /* Priority 2: localStorage genie_api_keys */
        try {
            const raw = localStorage.getItem('genie_api_keys');
            if (raw) {
                const keys = JSON.parse(raw);
                Object.entries(keys).filter(([,v]) => v && v.key).forEach(([k]) => all.push(k));
            }
        } catch {}
        if (all.length <= 1) all.push("coupang", "naver", "11st", "gmarket", "kakaogift", "lotteon");
        return all;
    }, [connectedChannels]);

    return (
        <div>
            {/* Form */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>{t("priceOpt.calcParams")}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.labelSku')}</label>
                        <select value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                            style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12 }}>
                            {products.map(p => <option key={p.sku} value={p.sku}>{p.product_name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.labelChannel')}</label>
                        <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                            style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12 }}>
                            {OPT_CHANNELS.map(c => {
                                const rate = c !== '*' ? getChannelRate(c) : null;
                                const feeLabel = rate ? ` (${(rate.commission*100).toFixed(0)}%+${(rate.vat*100).toFixed(0)}%)` : '';
                                return <option key={c} value={c}>{c === "*" ? t("priceOpt.allUnified") : c}{feeLabel}</option>;
                            })}
                        </select>
                    </div>
                    {[["current_price", t("priceOpt.currentSalePrice") || "Current Price"], ["inventory", t("priceOpt.stockQty") || "Stock Qty"]].map(([k, label]) => (
                        <div key={k}>
                            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{label}</label>
                            <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                                style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
                        </div>
                    ))}
                </div>
                <button className="btn" onClick={run} disabled={loading || !form.sku} style={{ background: "#6366f1" }}>
                    {loading ? "⏳ " + (t("priceOpt.calculating") || "Calculating...") : "🧮 " + (t("priceOpt.calcOptimal") || "Optimize")}
                </button>
            </div>

            {/* Result */}
            {result && (
                <div className="card" style={{ marginBottom: 16, borderLeft: "3px solid #22c55e" }}>
                    <h4 style={{ marginTop: 0, fontSize: 13 }}>
                        {t("priceOpt.calcOptimal")}: {result.sku} <span style={{ color: "#7c8fa8", fontWeight: 400 }}>({result.channel})</span>
                        {" "}<Badge label={result.algo} color="#6366f1" />
                        {result.r2 != null && <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>R²={result.r2}</span>}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                        {[
                            { label: t("priceOpt.currentPrice"), value: fmt(result.current_price), color: "#94a3b8" },
                            { label: "🏆 " + t("priceOpt.optimalPrice"), value: fmt(result.optimal_price), color: "#22c55e" },
                            { label: t("priceOpt.costPrice"), value: fmt(result.cost_price), color: "#64748b" },
                            { label: t("priceOpt.minApplyPrice"), value: fmt(result.min_price), color: "#7c8fa8" },
                            { label: t("priceOpt.expectedMargin"), value: PCT(result.expected_margin), color: "#f97316" },
                            { label: t("priceOpt.expectedQty"), value: result.expected_qty ? Math.round(result.expected_qty) + " " + t("priceOpt.unitPcs") : "—", color: "#06b6d4" },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ padding: "8px 10px", background: "#f1f5f9", borderRadius: 6 }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                            </div>
                        ))}
                    </div>
                    {result.clearance_price && (
                        <div style={{ marginTop: 12, padding: "8px 12px", background: result.inventory < 30 ? "#1e1a2e" : "#12200f", borderRadius: 6, fontSize: 12 }}>
                            {result.inventory < 30
                                ? `📦 ${t('priceOpt.stockLow')} (${result.inventory}${t('priceOpt.unitPcs')}) → ${t('priceOpt.premiumSuggest')}: `
                                : `📦 ${t('priceOpt.stockHigh')} (${result.inventory}${t('priceOpt.unitPcs')}) → ${t('priceOpt.clearanceSuggest')}: `}
                            <strong style={{ color: result.inventory < 30 ? "#a855f7" : "#f97316", fontSize: 14 }}>
                                {fmt(result.clearance_price)}
                            </strong>
                        </div>
                    )}
                </div>
            )}

            {/* Recent */}
            {recent.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{t("priceOpt.recentHistory")}</div>
                    {recent.map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#f1f5f9", borderRadius: 6, marginBottom: 5, fontSize: 11, alignItems: "center" }}>
                            <span style={{ fontFamily: "monospace", color: "#6366f1" }}>{r.sku}</span>
                            <Badge label={r.channel} color={chColor(r.channel)} />
                            <span style={{ color: "#94a3b8" }}>{fmt(r.current_price)} →</span>
                            <span style={{ fontWeight: 800, color: "#22c55e" }}>{fmt(r.optimal_price)}</span>
                            <span style={{ color: "#f97316" }}>{PCT(r.expected_margin)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tab: Scenario Simulator ───────────────────────────────────────────────────
function ScenarioTab({ token }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const { connectedChannels } = useConnectorSync();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        sku: "", channel: "*",
        prices: "",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    /* ── Dynamic channel list from ConnectorSync ── */
    const SIM_CHANNELS = useMemo(() => {
        const all = ["*"];
        const csKeys = Object.entries(connectedChannels)
            .filter(([, v]) => v?.connected)
            .map(([k]) => k)
            .filter(k => CHANNEL_RATES[k]);
        if (csKeys.length > 0) { csKeys.forEach(k => all.push(k)); return all; }
        try {
            const raw = localStorage.getItem('genie_api_keys');
            if (raw) { Object.entries(JSON.parse(raw)).filter(([,v]) => v?.key).forEach(([k]) => all.push(k)); }
        } catch {}
        if (all.length <= 1) all.push("coupang", "naver", "11st", "gmarket");
        return all;
    }, [connectedChannels]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/products`, ac.signal)
            .then(r => r.json())
            .then(d => {
                const prods = d.products || [];
                setProducts(prods);
                if (prods.length) setForm(f => ({ ...f, sku: prods[0].sku }));
            }).catch(() => { });
        return () => ac.abort();
    }, [token]);

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const prices = form.prices.split(",").map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
            if (!prices.length) {
                setResult({ error: t("priceOpt.invalidPriceList") });
                return;
                }
            const d = await postJsonAuth(`/v420/price/simulate`, { sku: form.sku, channel: form.channel || "*", prices });
            setResult(d);
        } catch (e) {
            setResult({ error: t("priceOpt.simFailed") + " " + e.message });
        } finally { setLoading(false); }
    };

    const maxProfit = result?.scenarios?.length
        ? Math.max(...result.scenarios.map(s => s.profit || 0), 1)
        : 1;

    return (
        <div>
            <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>{t("priceOpt.scenarioSim")}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.labelSku')}</label>
                        <select value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                            style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12 }}>
                            {products.map(p => <option key={p.sku} value={p.sku}>{p.product_name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.labelChannel')}</label>
                        <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                            style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12 }}>
                            {SIM_CHANNELS.map(c => {
                                const rate = c !== '*' ? getChannelRate(c) : null;
                                const feeLabel = rate ? ` (${(rate.commission*100).toFixed(0)}%+${(rate.vat*100).toFixed(0)}%)` : '';
                                return <option key={c} value={c}>{c === "*" ? t("priceOpt.allUnified") : c}{feeLabel}</option>;
                            })}
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t("priceOpt.testPriceList")}</label>
                    <input value={form.prices} onChange={e => setForm(f => ({ ...f, prices: e.target.value }))}
                        placeholder="55000,60000,65000,70000"
                        style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#94d9a2", padding: "6px 10px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }} />
                </div>
                <button className="btn" onClick={run} disabled={loading || !form.sku} style={{ background: "#f97316" }}>
                    {loading ? t("priceOpt.calculating") : "🚀 " + t("priceOpt.runSim")}
                </button>
            </div>

            {/* Error state */}
            {result?.error && (
                <div style={{ padding: "12px 16px", background: "#1e0f0f", borderRadius: 8, border: "1px solid #ef444433", color: "#ef4444", fontSize: 12, marginBottom: 12 }}>
                    ❌ {result.error}
                </div>
            )}

            {/* Results table */}
            {result?.scenarios && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                        {t("priceOpt.scenarioSim")} — {result.sku} / {result.channel}
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#7c8fa8" }}>
                                {["Price", t("priceOpt.expectedQty"), t("priceOpt.totalProfit"), t("priceOpt.totalProfit"), t("priceOpt.expectedMargin"), "Dist."].map(h => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: "right", fontWeight: 500 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.scenarios.map((s, i) => {
                                const isMax = s.profit === Math.max(...result.scenarios.map(x => x.profit || 0));
                                return (
                                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: isMax ? "#0d2018" : "transparent" }}>
                                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: isMax ? 800 : 400, color: isMax ? "#22c55e" : "#e2e8f0" }}>{fmt(s.price)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#06b6d4" }}>{s.qty_est != null ? Math.round(s.qty_est) + " " + t("priceOpt.unitPcs") : "—"}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(s.revenue)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#22c55e", fontWeight: 700 }}>{fmt(s.profit)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#f97316" }}>{PCT(s.margin)}</td>
                                        <td style={{ padding: "5px 8px", minWidth: 100 }}>
                                            <ScoreBar value={s.profit || 0} max={maxProfit} color={isMax ? "#22c55e" : "#6366f1"} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                        * {t("priceOpt.noAnalysis")}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Tab: Channel Mix ──────────────────────────────────────────────────────────
function ChannelMixTab({ token }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [budget, setBudget] = useState("");
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = useCallback((signal) =>
        getJsonAuthAbortable(`/v420/channel-mix/results`, signal)
            .then(r => r.json())
            .then(d => setHistory(d.results || []))
            .catch(() => { })
        , [token]);

    useEffect(() => {
        const ac = new AbortController();
        loadHistory(ac.signal);
        return () => ac.abort();
    }, [loadHistory]);

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const d = await postJsonAuth(`/v420/channel-mix/simulate`, { total_budget: parseFloat(budget) || 5000000 });
            setResult(d);
            loadHistory();
        } finally { setLoading(false); }
    };

    const maxReturn = result ? Math.max(...(result.allocations || []).map(a => a.expected_return || 0), 1) : 1;

    return (
        <div>
            <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.totalBudget')}</label>
                    <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                        style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: '#fff', padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <button className="btn" onClick={run} disabled={loading} style={{ background: "#a855f7", height: 36 }}>
                    {loading ? "⏳" : "🎯 " + t("priceOpt.runChannelMix")}
                </button>
            </div>

            {result && (
                <div>
                    {/* KPI */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                        <Stat label={t("priceOpt.totalBudget")} value={fmt(result.total_budget)} color="#6366f1" />
                        <Stat label={t("priceOpt.totalProfit")} value={fmt(result.total_return)} color="#22c55e" />
                        <Stat label={t("priceOpt.unifiedROI")} value={result.blended_roi?.toFixed(2) + "x"} color="#f97316"
                            sub={`Profit ${fmt(result.total_profit)}`} />
                    </div>

                    {/* Allocation bars */}
                    <div style={{ marginBottom: 16 }}>
                        {result.allocations.map((a, i) => (
                            <div key={i} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <Badge label={a.channel} color={chColor(a.channel)} />
                                        <span style={{ fontSize: 11, color: "#94a3b8" }}>ROI {a.roi_per_won}x</span>
                                    </div>
                                    <div style={{ fontSize: 11, display: "flex", gap: 12 }}>
                                        <span style={{ color: "#7c8fa8" }}>{a.allocation_pct}%</span>
                                        <span>{fmt(a.spend)}</span>
                                        <span style={{ color: "#22c55e", fontWeight: 700 }}>→ {fmt(a.expected_return)}</span>
                                    </div>
                                </div>
                                <ScoreBar value={a.expected_return} max={maxReturn} color={chColor(a.channel)} />
                            </div>
                        ))}
                    </div>

                    {/* Allocation table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#7c8fa8" }}>
                                {["Channel", "ROI", t('priceOpt.allocPct'), t('priceOpt.execBudget'), t('priceOpt.expectedReturn'), t('priceOpt.expectedProfit')].map(h => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: h === "Channel" ? "left" : "right" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.allocations.map((a, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "5px 8px" }}><Badge label={a.channel} color={chColor(a.channel)} /></td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#f97316", fontWeight: 700 }}>{a.roi_per_won}x</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{a.allocation_pct}%</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(a.spend)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#22c55e", fontWeight: 700 }}>{fmt(a.expected_return)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#06b6d4" }}>{fmt(a.expected_profit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {history.length > 0 && !result && (
                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{t("priceOpt.pastSimulations")}</div>
                    {history.slice(0, 5).map((h, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: "#f1f5f9", borderRadius: 6, marginBottom: 6, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#7c8fa8" }}>#{h.id}</span>
                            <span>Budget <b>{fmt(h.total_budget)}</b></span>
                            <span>Profit <b style={{ color: "#22c55e" }}>{fmt(h.total_return)}</b></span>
                            <span style={{ color: "#f97316" }}>ROI {h.blended_roi?.toFixed(2)}x</span>
                            <span style={{ color: "#64748b", fontSize: 10 }}>{h.created_at?.slice(0, 16)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tab: 경쟁가 모니터링 ─────────────────────────────────────────────────────
function CompetitorPriceTab({ token, inventory, digitalShelfData }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [competitorData, setCompetitorData] = useState([]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/competitor`, ac.signal)
            .then(r => r.json()).then(d => { if (d.items) setCompetitorData(d.items); }).catch(() => {});
        return () => ac.abort();
    }, [token]);

    const alerts = competitorData.filter(d => d.alert);
    return (
        <div style={{ display:'grid', gap:14 }}>
            {alerts.length > 0 && (
                <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:'#ef4444', marginBottom:8 }}>⚠️ {t("priceOpt.minPriceAlert")} ({alerts.length}{t("priceOpt.minPriceAlertSuffix")})</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {alerts.map(a => (
                            <div key={a.sku} style={{ padding:'6px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>
                                <span style={{ fontSize:11, fontWeight:700 }}>{a.name}</span>
                                <span style={{ fontSize:10, color:'#ef4444', marginLeft:8 }}>{fmt(a.ourPrice)} / {fmt(a.compA)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {['SKU', t("priceOpt.regProduct"), t("priceOpt.currentPrice"), 'Comp A', 'Comp B', 'SoS Rank', 'Diff(A)', t("priceOpt.expectedMargin")].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {competitorData.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t("priceOpt.noAnalysis")}</td></tr>}
                    {competitorData.map(d => {
                        const diffA = (d.ourPrice || 0) - (d.compA || 0);
                        return (
                            <tr key={d.sku} style={{ borderBottom: '1px solid #e2e8f0', background:d.alert?'rgba(239,68,68,0.03)':'' }}>
                                <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{d.sku}</td>
                                <td style={{ fontSize:11, fontWeight:600, padding:'8px 4px' }}>{d.name}</td>
                                <td style={{ fontFamily:'monospace', fontWeight:700, padding:'8px 4px' }}>{fmt(d.ourPrice)}</td>
                                <td style={{ fontFamily:'monospace', padding:'8px 4px', color:d.compA<d.ourPrice?'#ef4444':'#22c55e' }}>{fmt(d.compA)}</td>
                                <td style={{ fontFamily:'monospace', padding:'8px 4px', color:d.compB<d.ourPrice?'#ef4444':'#22c55e' }}>{fmt(d.compB)}</td>
                                <td style={{ textAlign:'center', padding:'8px 4px', fontWeight:700, color:d.sosRank<=3?'#22c55e':'#f97316' }} ><span>#{d.sosRank}</span></td>
                                <td style={{ fontFamily:'monospace', padding:'8px 4px', color:diffA<0?'#ef4444':'#22c55e', fontWeight:700 }}>{diffA>0?'+':''}{fmt(diffA)}</td>
                                <td style={{ fontSize:10, padding:'8px 4px', color:'#22c55e', fontWeight:700 }} >{d.alert?<span>⬇ {t("priceOpt.calcOptimal")}</span>:<span>✅</span>}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Tab: 프로모션 캘린더 ──────────────────────────────────────────────────────
function PriceCalendarTab({ token, priceCalendar, addPriceCalendarEvent }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [events, setEvents] = useState([]);
    const [form, setForm] = React.useState({ sku:'', name:'', channel:'all', startDate:'', endDate:'', promoPrice:'', reason:'' });
    const [saved, setSaved] = React.useState(false);
    const CH_BADGE = { coupang:'#ef4444', naver:'#22c55e', '11st':'#f97316', all:'#4f8ef7' };

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/calendar`, ac.signal)
            .then(r => r.json()).then(d => { if (d.events) setEvents(d.events); }).catch(() => {});
        return () => ac.abort();
    }, [token]);

    const allEvents = [...events, ...priceCalendar.filter(pc => !events.find(e => e.sku === pc.sku && e.startDate === pc.startDate))];

    const saveEvent = async () => {
        try {
            await postJsonAuth(`/v420/price/calendar`, form);
            addPriceCalendarEvent?.(form);
            const re = await getJsonAuth(`/v420/price/calendar`);
            const d = await re.json();
            if (d.events) setEvents(d.events);
            setSaved(true); setTimeout(() => setSaved(false), 2000);
        } catch { /* silent */ }
    };

    return (
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[{l:t('priceOpt.promoEventReg'),v:allEvents.length,c:'#4f8ef7'},{l:t('priceOpt.tabCalendar'),v:allEvents.filter(e=>e.status==='예정').length,c:'#22c55e'},{l:t('priceOpt.tabScenario'),v:allEvents.filter(e=>e.status==='초안').length,c:'#f97316'}].map(({l,v,c}) => (
                    <div key={l} style={{ background: '#ffffff', borderRadius:12, padding:'12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{l}</div>
                        <div style={{ fontSize:24, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
                    </div>
                ))}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {['SKU', t('priceOpt.regProduct'), 'Channel', 'Start', 'End', t('priceOpt.optimalPrice'), '%', t('priceOpt.expectedMargin'), 'Status'].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {allEvents.length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t("priceOpt.noAnalysis")}</td></tr>}
                    {allEvents.map((e, idx) => (
                        <tr key={e.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{e.sku}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{e.name}</td>
                            <td style={{ padding:'2px 8px', fontSize:9, fontWeight:700, borderRadius:20, background:(CH_BADGE[e.channel]||'#64748b')+'18', color:(CH_BADGE[e.channel]||'#64748b') }} ><span>{e.channel}</span></td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{e.startDate}</td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{e.endDate}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700, padding:'8px 4px', color:'#f97316' }}>{fmt(e.promoPrice)}</td>
                            <td style={{ fontSize:11, padding:'8px 4px', color:'#22c55e' }}>{e.discountRate}%↓</td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{e.reason}</td>
                            <td style={{ padding:'2px 8px', fontSize:9, fontWeight:700, borderRadius:20, background:e.status===t('priceOpt.statusScheduled')?'rgba(34,197,94,0.15)':'rgba(249,115,22,0.15)', color:e.status===t('priceOpt.statusScheduled')?'#22c55e':'#f97316' }} ><span>{e.status || t('priceOpt.statusDraft')}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ padding:'16px', background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:12 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>📅 {t('priceOpt.promoEventReg')}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[['SKU','sku'],[t('priceOpt.regProduct'),'name'],['Channel','channel'],['Start','startDate'],['End','endDate'],[t('priceOpt.optimalPrice'),'promoPrice'],[t('priceOpt.expectedMargin'),'reason']].map(([lbl,key]) => (
                        <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <label style={{ fontSize:10, color:'var(--text-3)', fontWeight:600 }}>{lbl}</label>
                            <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                                style={{ padding:'7px 10px', borderRadius:8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#fff', fontSize:12 }} />
                        </div>
                    ))}
                </div>
                {saved?<div style={{ marginTop:10, fontSize:11, color:'#22c55e' }}>✅ {t('priceOpt.promoSaved')}</div>:(
                    <button style={{ marginTop:12, padding:'7px 20px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontWeight:700, fontSize:12 }}
                        onClick={saveEvent}>📅 {t('priceOpt.register')}</button>
                )}
            </div>
        </div>
    );
}


// ── Main Page ─────────────────────────────────────────────────────────────────

/* ── Dynamic Repricer Tab ────────────────────────────────────── */
function DynamicRepricerTab({ token, inventory = [], digitalShelfData = {} }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [rules, setRules] = useState([]);
    const [history, setHistory] = useState([]);
    const [marginImprove, setMarginImprove] = useState(null);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/repricer/rules`, ac.signal)
            .then(r => r.json()).then(d => { if (d.rules) setRules(d.rules); if (d.avg_margin_improve != null) setMarginImprove(d.avg_margin_improve); }).catch(() => {});
        getJsonAuthAbortable(`/v420/price/repricer/history`, ac.signal)
            .then(r => r.json()).then(d => { if (d.history) setHistory(d.history); }).catch(() => {});
        return () => ac.abort();
    }, [token]);

    const MODE_LABEL = { min_price: t("priceOpt.minPriceAlert"), roas_target: "ROAS Goal", inventory: t("priceOpt.dsIntegration") };
    const MODE_COLOR = { min_price: "#4f8ef7", roas_target: "#22c55e", inventory: "#f97316" };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                    { l: t("priceOpt.activeRules"), v: rules.filter(r => r.active).length, c: "#22c55e" },
                    { l: t("priceOpt.todayChanges"), v: history.length, c: "#4f8ef7" },
                    { l: t("priceOpt.avgMarginImprove"), v: marginImprove != null ? `+${(marginImprove * 100).toFixed(1)}%` : "—", c: "#a855f7" },
                    { l: t("priceOpt.dsIntegration"), v: digitalShelfData?.sos ? "ON" : "—", c: "#f97316" },
                ].map(({ l, v, c }) => (
                    <div key={l} style={{ padding: "14px 16px", borderRadius: 12, background: `${c}0f`, border: `1px solid ${c}33` }}>
                        <div style={{ fontSize: 10, color: "#7c8fa8", fontWeight: 700, marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
                    </div>
                ))}
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>⚡ {t("priceOpt.autoRules")}</div>
                {rules.length === 0 && <div className="sub" style={{ padding: 16, fontSize: 12 }}>{t("priceOpt.noAnalysis")}</div>}
                <div style={{ display: "grid", gap: 8 }}>
                    {rules.map(r => (
                        <div key={r.id} style={{ padding: "14px 16px", borderRadius: 12, background: '#ffffff', border: `1px solid ${r.active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 800, fontSize: 12, color: '#1e293b' }}>{r.name}</span>
                                    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 99, fontWeight: 700, background: `${MODE_COLOR[r.mode] || '#64748b'}18`, color: MODE_COLOR[r.mode] || '#64748b', border: `1px solid ${MODE_COLOR[r.mode] || '#64748b'}33` }}>{MODE_LABEL[r.mode] || r.mode}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.sku} · {r.channel} · {r.lastRun || '—'} · {r.changeCount || 0}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 10, color: r.active ? "#22c55e" : "#7c8fa8", fontWeight: 700 }}>{r.active ? `● ${t('priceOpt.ruleActive')}` : `○ ${t('priceOpt.ruleInactive')}`}</span>
                                <button onClick={() => { setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x)); postJsonAuth(`/v420/price/repricer/rules/${r.id}/toggle`).catch(() => {}); }} style={{ padding: "4px 12px", borderRadius: 7, border: "none", background: r.active ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: r.active ? "#ef4444" : "#22c55e", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                                    {r.active ? t('priceOpt.ruleStop') : t('priceOpt.ruleActivate')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>📋 {t("priceOpt.changeHistory")}</div>
                <div style={{ display: "grid", gap: 0, borderRadius: 12, overflow: "hidden", border: '1px solid #e2e8f0' }}>
                    <div style={{ display: "grid", gridTemplateColumns: "60px 130px 80px 80px 80px 1fr", gap: 8, padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#7c8fa8", background: '#ffffff' }}>
                        <span>{t('priceOpt.labelTime')}</span><span>{t('priceOpt.labelSku')}</span><span>{t('priceOpt.labelChannel')}</span><span>{t("priceOpt.currentPrice")}</span><span>{t("priceOpt.optimalPrice")}</span><span>{t("priceOpt.expectedMargin")}</span>
                    </div>
                    {history.length === 0 && <div className="sub" style={{ padding: 16, fontSize: 12, textAlign: 'center' }}>{t("priceOpt.noAnalysis")}</div>}
                    {history.map((h, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 130px 80px 80px 80px 1fr", gap: 8, padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 11, alignItems: "center" }}>
                            <span style={{ color: "#7c8fa8", fontFamily: "monospace" }}>{h.time}</span>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{h.sku}</span>
                            <span style={{ color: "#94a3b8" }}>{h.channel}</span>
                            <span style={{ color: "#64748b", textDecoration: "line-through" }}>{fmt(h.prev)}</span>
                            <span style={{ fontWeight: 800, color: h.next > h.prev ? "#ef4444" : "#22c55e" }}>{fmt(h.next)}</span>
                            <span style={{ fontSize: 10, color: "#7c8fa8" }}>{h.reason}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ═══ Channel Fee Reference Tab (읽기 전용 — 각 채널이 부과하는 수수료) ═══ */
function ChannelFeeTab() {
    const { t } = useI18n();

    /* channelRates.js 중앙소스에서 모든 채널 수수료 로드 */
    const allRates = useMemo(() => {
        return Object.entries(CHANNEL_RATES).map(([id, r]) => ({
            id, ...r,
            totalFee: ((r.commission + r.vat) * 100).toFixed(1),
        }));
    }, []);

    const domestic = allRates.filter(r => r.region === 'Domestic');
    const global = allRates.filter(r => r.region !== 'Domestic');

    const regionColors = { Domestic: '#22c55e', Global: '#4f8ef7', Japan: '#ef4444', 'SE Asia': '#f59e0b', Europe: '#a855f7' };

    const renderTable = (channels, title, icon) => (
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>{icon} {title}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                    {[t('priceOpt.feeChName'), t('priceOpt.feeCommission'), t('priceOpt.feeTax'), t('priceOpt.feeTotal'), t('priceOpt.feeRegion')].map(h =>
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                    )}
                </tr></thead>
                <tbody>
                    {channels.map(ch => (
                        <tr key={ch.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: CH_COLORS[ch.id] || '#94a3b8' }}>{ch.label}</span>
                                </div>
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>
                                {(ch.commission * 100).toFixed(0)}%
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#f97316', fontWeight: 700 }}>
                                {(ch.vat * 100).toFixed(0)}%
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: parseFloat(ch.totalFee) > 20 ? '#ef4444' : '#e2e8f0' }}>
                                {ch.totalFee}%
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: (regionColors[ch.region] || '#64748b') + '15', color: regionColors[ch.region] || '#64748b', fontWeight: 600 }}>{ch.region}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1e293b", marginBottom: 4}}>💰 {t('priceOpt.channelFeeTitle')}</div>
                <div style={{ fontSize: 11, color: '#7c8fa8', marginBottom: 8 }}>{t('priceOpt.channelFeeSub')}</div>
                <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                    ℹ️ {t('priceOpt.feeReadOnlyNote')}
                </div>
            </div>
            {renderTable(domestic, t('priceOpt.feeDomestic'), '🇰🇷')}
            {renderTable(global, t('priceOpt.feeGlobal'), '🌏')}
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', fontSize: 11, color: '#94a3b8' }}>
                <b style={{ color: '#eab308' }}>💡 {t('priceOpt.feeTipTitle')}</b><br/>
                {t('priceOpt.feeTipDesc')}
            </div>
        </div>
    );
}

/* ═══ Price Optimization Guide Tab (Enterprise v2) ════════════════════════ */
function PriceOptGuideTab() {
    const { t } = useI18n();
    const STEPS = Array.from({ length: 10 }, (_, i) => ({
        num: i + 1,
        title: t(`priceOpt.guideStep${i + 1}Title`),
        desc: t(`priceOpt.guideStep${i + 1}Desc`),
    }));
    const ICONS = ['📦', '🎯', '🧠', '🚀', '📊', '🔍', '⚡', '💰', '📅', '✅'];
    const COLORS = ['#6366f1', '#22c55e', '#4f8ef7', '#f97316', '#a855f7', '#06b6d4', '#eab308', '#ef4444', '#ec4899', '#14b8a6'];
    const TIPS = Array.from({ length: 5 }, (_, i) => t(`priceOpt.guideTip${i + 1}`));

    const TAB_REF = [
        { id: 'summary', icon: '📊', color: '#6366f1', desc: t('priceOpt.guideTabSummaryDesc') },
        { id: 'products', icon: '📦', color: '#22c55e', desc: t('priceOpt.guideTabProductsDesc') },
        { id: 'optimize', icon: '🎯', color: '#4f8ef7', desc: t('priceOpt.guideTabOptimizeDesc') },
        { id: 'scenario', icon: '🧪', color: '#f97316', desc: t('priceOpt.guideTabScenarioDesc') },
        { id: 'mix', icon: '🔀', color: '#a855f7', desc: t('priceOpt.guideTabMixDesc') },
        { id: 'repricer', icon: '⚡', color: '#06b6d4', desc: t('priceOpt.guideTabRepricerDesc') },
        { id: 'competitor', icon: '🔍', color: '#eab308', desc: t('priceOpt.guideTabCompetitorDesc') },
        { id: 'calendar', icon: '📅', color: '#ec4899', desc: t('priceOpt.guideTabCalendarDesc') },
        { id: 'channelFee', icon: '💰', color: '#ef4444', desc: t('priceOpt.guideTabFeeDesc') },
        { id: 'guide', icon: '📖', color: '#14b8a6', desc: t('priceOpt.guideTabGuideDesc') },
    ];

    return (
        <div style={{ display: 'grid', gap: 24 }}>
            {/* ── Header ── */}
            <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 6 }}>📖 {t('priceOpt.guideTitle')}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{t('priceOpt.guideSub')}</div>
            </div>

            {/* ── Steps Grid ── */}
            <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>{t('priceOpt.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 12, background: '#ffffff', border: `1px solid ${COLORS[i]}22`, transition: 'border-color 200ms, transform 200ms' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS[i] + '55'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS[i] + '22'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                            <div style={{ fontSize: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: `${COLORS[i]}15` }}>{ICONS[i]}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: COLORS[i], marginBottom: 4 }}>{s.num}. {s.title}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab-by-Tab Reference Grid ── */}
            <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>📑 {t('priceOpt.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {TAB_REF.map(tb => (
                        <div key={tb.id} style={{ display: 'flex', gap: 12, padding: '14px', borderRadius: 10, background: '#ffffff', border: `1px solid ${tb.color}18`, transition: 'border-color 200ms' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = tb.color + '44'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = tb.color + '18'}>
                            <div style={{ fontSize: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: `${tb.color}12` }}>{tb.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: tb.color, marginBottom: 3 }}>{t(`priceOpt.tab${tb.id.charAt(0).toUpperCase() + tb.id.slice(1)}`) || tb.id}</div>
                                <div style={{ fontSize: 10, color: '#7c8fa8', lineHeight: 1.5 }}>{tb.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Expert Tips ── */}
            <div style={{ padding: '16px 20px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e', marginBottom: 10 }}>💡 {t('priceOpt.guideTipsTitle')}</div>
                <div style={{ display: 'grid', gap: 6 }}>
                    {TIPS.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                            <span style={{ color: '#22c55e', fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── PriceOpt 메인 Component (Enterprise v2) ──────────────────────────────────── */
export default function PriceOpt() {
    const { fmt } = useCurrency();
    const [tab, setTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('tab') || 'summary';
    });
    const [secAlerts, setSecAlerts] = useState([]);

    const { token } = useAuth();
    const { t } = useI18n();
    const { inventory, digitalShelfData, priceCalendar, addPriceCalendarEvent, addAlert } = useGlobalData();
    const { connectedChannels, connectedCount } = useConnectorSync();

    /* ── BroadcastChannel: Listen for price & promo updates from other tabs ── */
    useEffect(() => {
        const bc = new BroadcastChannel('genie_price_opt_sync');
        bc.onmessage = (e) => {
            if (e.data?.source === 'priceOpt') return;
            if (e.data?.type === 'PRICE_UPDATE' || e.data?.type === 'PROMO_UPDATE') {
                /* Force re-render on cross-tab price/promo changes */
                setTab(prev => prev);
            }
        };
        return () => bc.close();
    }, []);

    /* ── BroadcastChannel: Listen for connector hub changes ── */
    useEffect(() => {
        const bc = new BroadcastChannel('genie_connector_sync');
        bc.onmessage = (e) => {
            if (e.data?.type === 'CHANNEL_REGISTERED' || e.data?.type === 'CHANNEL_REMOVED') {
                /* ConnectorSyncContext auto-refreshes, but we force tab re-render */
                setTab(prev => prev);
            }
        };
        return () => bc.close();
    }, []);

    /* Security: monitor all form inputs across child tabs */
    useEffect(() => {
        const handler = (e) => {
            if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'SELECT') {
                const threat = checkSecurity(e.target.value);
                if (threat) {
                    const alert = { id: `SEC-PO-${Date.now()}`, type: 'error', msg: `🚨 [PriceOpt] Security threat detected: ${threat.pattern} in input`, time: new Date().toLocaleTimeString(), read: false };
                    setSecAlerts(prev => [alert, ...prev.slice(0, 19)]);
                    addAlert?.({ type: 'error', msg: `🛡️ [PriceOpt] Hacking attempt blocked — pattern: ${threat.pattern}` });
                    e.target.value = '';
                    e.preventDefault();
                }
            }
        };
        document.addEventListener('input', handler, true);
        return () => document.removeEventListener('input', handler, true);
    }, [addAlert]);

    const TABS_I18N = [
        { id: "summary",  label: t("priceOpt.tabSummary") },
        { id: "products", label: t("priceOpt.tabProducts") },
        { id: "optimize", label: t("priceOpt.tabOptimize") },
        { id: "scenario", label: t("priceOpt.tabScenario") },
        { id: "mix",      label: t("priceOpt.tabMix") },
        { id: "repricer", label: t("priceOpt.tabRepricer") },
        { id: "competitor", label: t("priceOpt.tabCompetitor") },
        { id: "calendar",   label: t("priceOpt.tabCalendar") },
        { id: "channelFee", label: t("priceOpt.tabChannelFee") },
        { id: "guide",      label: t("priceOpt.tabGuide") },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "0 4px", height: "100%" }}>
            {/* ─── FIXED HEADER: Title + Badges + Sub-Tabs ─── */}
            <div style={{ position: "sticky", top: 0, zIndex: 30, background: "#f8fafc", flexShrink: 0 }}>
                {/* Title + Badge row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, padding: "6px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.5px", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("priceOpt.pageTitle")}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{t("priceOpt.pageSub")}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontWeight: 700 }}>
                            🔗 {connectedCount}{t('priceOpt.badgeChannelUnit', '개 채널 연동')}
                        </span>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontWeight: 700 }}>
                            ✅ {t('priceOpt.badgeRealtimeSync')}
                        </span>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }}>
                            🛡️ {t('priceOpt.badgeSecurityActive')}
                        </span>
                    </div>
                </div>

                {/* Security alerts banner */}
                {secAlerts.length > 0 && (
                    <div style={{ padding: '4px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, margin: '0 8px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>🚨 {t('priceOpt.secBannerBlocked', { count: secAlerts.length })}</span>
                        <button onClick={() => setSecAlerts([])} style={{ fontSize: 10, background: 'none', border: 'none', color: '#7c8fa8', cursor: 'pointer' }}>✕ {t('priceOpt.secBannerDismiss')}</button>
                    </div>
                )}

                {/* Sub-tab bar */}
                <div style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
                    <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
                        {TABS_I18N.map(tb => (
                            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                                padding: "8px 12px",
                                border: "none",
                                borderBottom: tab === tb.id ? "2px solid #4f46e5" : "2px solid transparent",
                                cursor: "pointer",
                                fontWeight: tab === tb.id ? 800 : 600,
                                fontSize: 11,
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                                background: tab === tb.id ? "rgba(79,70,229,0.06)" : "transparent",
                                color: tab === tb.id ? "#312e81" : "#6b7280",
                                transition: "all 150ms",
                            }}>
                                {tb.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── CONTENT CONTAINER ─── */}
            <div style={{ marginTop: 4, padding: 14, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                {tab === "summary"    && <SummaryTab token={token} />}
                {tab === "products"   && <ProductsTab token={token} />}
                {tab === "optimize"   && <OptimizeTab token={token} />}
                {tab === "scenario"   && <ScenarioTab token={token} />}
                {tab === "mix"        && <ChannelMixTab token={token} />}
                {tab === "repricer"   && <DynamicRepricerTab token={token} inventory={inventory} digitalShelfData={digitalShelfData} />}
                {tab === "competitor" && <CompetitorPriceTab token={token} inventory={inventory} digitalShelfData={digitalShelfData} />}
                {tab === "calendar"   && <PriceCalendarTab token={token} priceCalendar={priceCalendar} addPriceCalendarEvent={addPriceCalendarEvent} />}
                {tab === "channelFee" && <ChannelFeeTab />}
                {tab === "guide"      && <PriceOptGuideTab />}
            </div>
        </div>
    );
}
