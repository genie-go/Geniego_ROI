import React, { useMemo, useState, useEffect, useCallback } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { useAuth } from "../auth/AuthContext.jsx";
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import SummernoteEditor from '../components/SummernoteEditor.jsx'; // [현 차수] 제품 상세내용 WYSIWYG
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
      // [현 차수] 현재 언어블록에 없는 신규 키는 영어 사전으로 폴백(비-ko 언어에 한글 누출 방지).
      if (PO_DICT.en && PO_DICT.en[k] !== undefined) return PO_DICT.en[k];
    }
    return origT(key, fb);
  };
  return { ...ctx, t };
}
import { useGlobalData } from "../context/GlobalDataContext";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { CHANNEL_RATES, getChannelRate } from '../constants/channelRates.js';
import { channelMeta } from '../utils/channelMeta.js'; // [277차] 판매채널 전송 — 채널 표시메타 단일 리졸버 재사용
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { getJsonAuth, getJsonAuthAbortable, postJsonAuth } from "../services/apiClient";
import { PRODUCT_NOTICE_TEMPLATES, noticeTemplateByKey, NOTICE_REFERENCE_TEXT } from '../constants/productNoticeTemplates.js';

/* ── Security Monitor ── */
/**
 * [277차] 상품 전송(writeback)을 실제로 지원하는 판매채널 화이트리스트.
 *   자격증명 보유 채널을 그대로 노출하면 광고·미디어 커넥터(youtube·meta 등)까지 "판매채널 전송" 칩으로 떠서
 *   누르는 순간 백엔드가 write_adapter_pending 을 반환한다(가짜 버튼). 백엔드 사실과 1:1로 맞춘다.
 *   출처: ChannelSync::pushProduct 의 case 목록 + Catalog::pushToChannel 이 자체 처리하는 shopify.
 */
const PUBLISHABLE_CHANNELS = new Set([
    'shopify',
    'cafe24', 'coupang', 'naver', 'naver_smartstore', 'ebay', 'amazon', 'amazon_spapi',
    'tiktok', 'tiktok_shop', 'rakuten', '11st', 'st11', 'gmarket', 'auction', 'lotteon',
    'woocommerce', 'magento', 'shopee', 'lazada', 'walmart', 'qoo10', 'yahoo_jp', 'godomall', 'etsy',
]);

const SEC_PATTERNS = [/[<>]script/i, /union\s+select/i, /drop\s+table/i, /;\s*--/i, /\.\.\/\.\.\//i, /eval\s*\(/i, /javascript:/i, /on(error|load|click)\s*=/i];
function checkSecurity(value) {
    if (!value || typeof value !== 'string') return null;
    for (const p of SEC_PATTERNS) { if (p.test(value)) return { pattern: p.source, value: value.slice(0, 80), at: new Date().toISOString() }; }
    return null;
}

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

    // 빈 상태 폴백: API 실패 + demoFallback 부재 시에도 무한 로딩 방지
    const emptyState = useMemo(() => ({
        products: 0, elasticity_pts: 0, recommendations: 0,
        avg_margin: 0, avg_optimal_px: 0, by_channel: [], recent: [],
    }), []);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/summary`, ac.signal)
                        .then(d => {
                // API가 200 OK지만 데이터가 비어있으면 데모 폴백 사용
                if ((!d.products || d.products === 0)) setData(isDemo && demoFallback ? demoFallback : emptyState);
                else setData(d);
            })
            .catch(err => {
                if (err?.name === 'AbortError') return;
                setData(isDemo && demoFallback ? demoFallback : emptyState);
            });
        return () => ac.abort();
    }, [token, demoFallback, emptyState, isDemo]);

    const reload = () => {
        setData(null);
        getJsonAuth(`/v420/price/summary`)
                        .then(d => {
                if ((!d.products || d.products === 0)) setData(isDemo && demoFallback ? demoFallback : emptyState);
                else setData(d);
            })
            .catch(() => { setData(isDemo && demoFallback ? demoFallback : emptyState); });
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
        // ── [현 차수] 국내 쇼핑몰 필수/권장 항목 + 상세HTML ──
        brand: "", manufacturer: "", origin: "대한민국", model_name: "", barcode: "",
        tax_type: "taxable", ship_method: "courier", ship_fee_type: "free", ship_fee: "",
        as_phone: "", as_guide: "", warranty: "",
        detail_html: "",
        // ── [276차] 상품정보제공고시(법정) + 플랫폼 필수 보강 ──
        notice_category: "etc",   // 품목 key (productNoticeTemplates)
        kc_type: "none",          // none | target(인증대상) | supplier(공급자적합성확인) | exempt(해당없음)
        kc_cert_no: "",           // KC 인증번호
        minor_purchase: "yes",    // yes | no (미성년자 구매 가능 여부)
        mfg_date: "",             // 제조연월일
        expiry_date: "",          // 유효일자(유통/사용기한)
        return_ship_fee: "",      // 반품 배송비
        exchange_ship_fee: "",    // 교환 배송비
        ship_use_default: true,   // 배송/반품지: 계정 공통 기본값 사용
        release_addr: "",         // (예외 시) 출고지
        return_addr: "",          // (예외 시) 반품지
        return_courier: "",       // (예외 시) 택배사
    });
    // [276차] 상품정보제공고시 항목값 { 항목라벨: 값 }
    const [noticeItems, setNoticeItems] = useState({});
    // [276차] 계정 공통 배송/반품 설정(출고지·반품지·택배사·기본배송비)
    const [fulfillment, setFulfillment] = useState(null);
    const [fulfillMsg, setFulfillMsg] = useState("");
    // [현 차수] 복수 이미지(대표=첫 번째) · 옵션 그룹 · 옵션 조합 재고
    const [images, setImages] = useState([]); // [dataURL,...] (max 8)
    const [optGroups, setOptGroups] = useState([]); // [{name, values:[...]}]
    const [combos, setCombos] = useState([]); // [{values:[...], label, sku, stock, add_price}]
    const [msg, setMsg] = useState("");
    const [uploading, setUploading] = useState(false);
    // [277차] 판매채널 전송 — 등록한 상품을 연동채널로 보낼 방법이 없었다(엔진 `/api/catalog/writeback/*` 는
    //   이미 존재했으나 이 페이지에 진입점이 없어 /writeback 에서 SKU·JSON 을 손입력해야 했음).
    //   연동된 채널만 노출(자격증명 보유 채널) → 카드에서 1클릭 전송. 신규 백엔드 없음(기존 큐/승인/어댑터 재사용).
    const [pubChannels, setPubChannels] = useState([]);   // [{id,label}]
    const [pubBusy, setPubBusy] = useState("");            // `${sku}:${channel}` 전송 중
    const [pubMsg, setPubMsg] = useState({});              // { [sku]: {text, ok} }
    const [dragOver, setDragOver] = useState(false);
    const [searchQuery, setSearchQuery] = useState(""); // 206차 #6: 등록 제품 검색

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

    // [현 차수] 옵션 조합이 있으면 대표 재고 = 조합 재고 합계(WMS 반영·목록 표시 정합). 없으면 null.
    const comboStockTotal = React.useMemo(() => {
        if (!combos.length) return null;
        return combos.reduce((s, c) => s + (parseInt(c.stock) || 0), 0);
    }, [combos]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/products`, ac.signal)
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
        const bc = new BroadcastChannel(tChannelName('genie_product_sync'));
        bc.onmessage = (e) => {
            if (e.data?.type === 'PRODUCT_UPDATE' && e.data.source !== 'priceOpt') {
                load();
            }
        };
        return () => bc.close();
    }, []);

    // [276차] 계정 공통 배송/반품 설정 로드
    useEffect(() => {
        getJsonAuth('/v420/price/fulfillment').then(d => { if (d?.ok && d.settings) setFulfillment(d.settings); }).catch(() => {});
    }, []);

    // [276차] 계정 배송/반품 설정 저장
    const saveFulfillment = async (next) => {
        setFulfillMsg("");
        try {
            const d = await postJsonAuth('/v420/price/fulfillment', next);
            if (d?.ok) { setFulfillment(next); setFulfillMsg(`✅ ${t('priceOpt.saved', '저장되었습니다')}`); }
            else setFulfillMsg(`❌ ${d?.error || t('priceOpt.saveFail', '저장 실패')}`);
        } catch (e) { setFulfillMsg(`❌ ${t('priceOpt.saveFail', '저장 실패')}`); }
    };

    const broadcastProductUpdate = () => {
        try {
            const bc = new BroadcastChannel(tChannelName('genie_product_sync'));
            bc.postMessage({ type: 'PRODUCT_UPDATE', source: 'priceOpt', ts: Date.now() });
            bc.close();
        } catch {}
    };

    const load = () =>
        getJsonAuth(`/v420/price/products`)
            .then(d => setProducts(d.products || [])).catch(() => { });

    // [277차] 연동된 판매채널 목록 — channel_credential 보유(활성) 채널만. 미연동 채널로는 전송 버튼을 띄우지 않는다.
    useEffect(() => {
        let alive = true;
        getJsonAuth(`/api/v423/creds`)
            .then(d => {
                if (!alive) return;
                const seen = new Map();
                (d.creds || []).forEach(c => {
                    if (String(c.is_active) === '0') return;
                    const id = String(c.channel || '').trim().toLowerCase();
                    // 상품 전송을 실제로 지원하는 채널만 — 광고/미디어 커넥터(youtube 등) 가짜 버튼 차단.
                    if (!PUBLISHABLE_CHANNELS.has(id)) return;
                    if (!seen.has(id)) { const m = channelMeta(id); seen.set(id, { id, label: m.name, icon: m.icon, color: m.color }); }
                });
                setPubChannels([...seen.values()]);
            })
            .catch(() => { if (alive) setPubChannels([]); });
        return () => { alive = false; };
    }, []);

    /** [277차] 상품 1건을 지정 판매채널로 전송. 기존 writeback 엔진(정책검증→승인큐→어댑터)에 그대로 위임한다.
     *  상세HTML·이미지까지 body 로 실어 보낸다(백엔드 mergeWithExisting 이 body 우선). */
    const publishToChannel = async (p, channel) => {
        const sku = (p.sku || '').trim();
        if (!sku) return;
        setPubBusy(`${sku}:${channel}`);
        setPubMsg(m => ({ ...m, [sku]: null }));
        try {
            const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
            const d = await postJsonAuth(`/api/catalog/writeback/${encodeURIComponent(channel)}/${encodeURIComponent(sku)}`, {
                name: p.product_name || sku,
                price: Number(p.base_price) || Number(p.cost_price) || 0,
                inventory: Number(p.initial_stock) || 0,
                category: p.category || '',
                spec: p.spec || '',
                detail_html: p.detail_html || '',
                image_url: p.product_image || imgs[0] || '',
                images: imgs,
            });
            // 서버 status: queued(전송대기) · pending_approval(승인대기) · awaiting_credentials(자격증명대기) · done
            const st = d.status || (d.ok ? 'queued' : 'failed');
            const okStates = ['queued', 'pending_approval', 'done', 'awaiting_credentials'];
            const label = {
                queued: t('priceOpt.pubQueued', '전송 대기열에 등록했습니다'),
                pending_approval: t('priceOpt.pubApproval', '승인 대기 — 승인 후 채널에 반영됩니다'),
                awaiting_credentials: t('priceOpt.pubNoCreds', '채널 자격증명 대기 — 연동허브에서 인증을 완료하세요'),
                done: t('priceOpt.pubDone', '채널에 반영했습니다'),
            }[st] || (d.error || t('priceOpt.pubFail', '전송 실패'));
            setPubMsg(m => ({ ...m, [sku]: { ok: okStates.includes(st), text: label } }));
        } catch (e) {
            setPubMsg(m => ({ ...m, [sku]: { ok: false, text: `${t('priceOpt.pubFail', '전송 실패')}: ${e.message}` } }));
        } finally {
            setPubBusy("");
        }
    };

    const save = async () => {
        // 206차 #6: 클라이언트 사전 중복 검사 + 서버 중복 차단 알림.
        const skuTrim = (form.sku || '').trim();
        if (!skuTrim) { setMsg(`❌ ${t('priceOpt.skuRequired', 'SKU를 입력하세요')}`); return; }
        if (products.some(p => (p.sku || '').toLowerCase() === skuTrim.toLowerCase())) {
            setMsg(`❌ ${t('priceOpt.dupSku', 'SKU 중복')}: '${skuTrim}' ${t('priceOpt.dupSkuMsg', '은(는) 이미 등록되어 있습니다. 다른 SKU를 사용하거나 기존 제품을 수정하세요.')}`);
            return;
        }
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
                initial_stock: comboStockTotal != null ? comboStockTotal : stockSummary.totalUnits,
                stock_boxes: stockSummary.totalBoxes,
                stock_pallets: stockSummary.totalPallets,
                product_image: images[0] || form.image_preview || null,
                // [현 차수] 국내 쇼핑몰 필수/권장 항목
                brand: form.brand, manufacturer: form.manufacturer, origin: form.origin,
                model_name: form.model_name, barcode: form.barcode, tax_type: form.tax_type,
                ship_method: form.ship_method, ship_fee_type: form.ship_fee_type,
                ship_fee: form.ship_fee_type === 'free' ? 0 : (parseInt(form.ship_fee) || 0),
                as_phone: form.as_phone, as_guide: form.as_guide, warranty: form.warranty,
                // [276차] 상품정보제공고시(법정) + 인증·판매 + 배송/반품
                notice_category: form.notice_category,
                notice_json: JSON.stringify({ category: form.notice_category, items: noticeItems }),
                kc_type: form.kc_type, kc_cert_no: form.kc_cert_no,
                minor_purchase: form.minor_purchase, mfg_date: form.mfg_date, expiry_date: form.expiry_date,
                return_ship_fee: parseInt(form.return_ship_fee) || 0,
                exchange_ship_fee: parseInt(form.exchange_ship_fee) || 0,
                ship_use_default: form.ship_use_default ? 1 : 0,
                release_addr: form.ship_use_default ? '' : form.release_addr,
                return_addr: form.ship_use_default ? '' : form.return_addr,
                return_courier: form.ship_use_default ? '' : form.return_courier,
                // 상세HTML · 복수이미지 · 옵션 · 옵션조합 재고
                detail_html: form.detail_html || '',
                images: images,
                options: optGroups.filter(g => g.name.trim() && g.values.length).map(g => ({ name: g.name.trim(), values: g.values })),
                option_stocks: combos.map(c => ({
                    values: c.values, label: c.label, suffix: c.suffix, sku: c.sku,
                    stock: parseInt(c.stock) || 0, add_price: parseInt(c.add_price) || 0,
                })),
            });
        } catch (e) {
            d = { ok: false, error: e.message };
        }
        if (!d.ok && d.duplicate) {
            setMsg(`\u274c ${t('priceOpt.dupSku', 'SKU \uc911\ubcf5')}: '${form.sku}' ${t('priceOpt.dupSkuMsg', '\uc740(\ub294) \uc774\ubbf8 \ub4f1\ub85d\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 SKU\ub97c \uc0ac\uc6a9\ud558\uac70\ub098 \uae30\uc874 \uc81c\ud488\uc744 \uc218\uc815\ud558\uc138\uc694.')}`);
            return;
        }
        setMsg(d.ok ? `\u2705 ${t('priceOpt.excelUploadSuccess')}: ${form.sku}` : `\u274c ${d.error || JSON.stringify(d)}`);
        load();
        if (d.ok) broadcastProductUpdate();
    };

    /* ═══ Image handling ═══ */
    /* \u2550\u2550\u2550 [\ud604 \ucc28\uc218] \ubcf5\uc218 \uc774\ubbf8\uc9c0(\ucd5c\ub300 8\uc7a5, \uccab \ubc88\uc9f8=\ub300\ud45c) \u2550\u2550\u2550 */
    const MAX_IMAGES = 8;
    const addImageFiles = (fileList) => {
        const files = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
        if (!files.length) return;
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) { setMsg('\u274c ' + t('priceOpt.imgMaxSize')); return; }
            const reader = new FileReader();
            reader.onload = (e) => setImages(prev => prev.length >= MAX_IMAGES ? prev : [...prev, e.target.result]);
            reader.readAsDataURL(file);
        });
    };
    const handleImageDrop = (e) => { e.preventDefault(); setDragOver(false); addImageFiles(e.dataTransfer.files); };
    const handleImageSelect = (e) => { addImageFiles(e.target.files); e.target.value = ''; };
    const removeImageAt = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));
    const moveImageFirst = (idx) => setImages(prev => { const a = [...prev]; const [x] = a.splice(idx, 1); a.unshift(x); return a; });

    /* \u2550\u2550\u2550 [\ud604 \ucc28\uc218] \uc635\uc158 \uadf8\ub8f9 + \uc870\ud569 \uc7ac\uace0 \u2550\u2550\u2550 */
    const addOptGroup = () => setOptGroups(prev => prev.length >= 3 ? prev : [...prev, { name: '', values: [] }]);
    const removeOptGroup = (gi) => setOptGroups(prev => prev.filter((_, i) => i !== gi));
    const setOptGroupName = (gi, name) => setOptGroups(prev => prev.map((g, i) => i === gi ? { ...g, name } : g));
    const setOptGroupValues = (gi, raw) => setOptGroups(prev => prev.map((g, i) => i === gi ? { ...g, values: raw.split(',').map(s => s.trim()).filter(Boolean) } : g));
    // \uc635\uc158 \uadf8\ub8f9 \u2192 \ub370\uce74\ub974\ud2b8 \uacf1\uc73c\ub85c \uc870\ud569 \uc0dd\uc131(\uae30\uc874 \uc7ac\uace0/\ucd94\uac00\uae08\uc561 \ubcf4\uc874).
    const generateCombos = () => {
        const groups = optGroups.filter(g => g.name.trim() && g.values.length);
        if (!groups.length) { setCombos([]); return; }
        let acc = [[]];
        groups.forEach(g => { const next = []; acc.forEach(a => g.values.forEach(v => next.push([...a, v]))); acc = next; });
        const base = (form.sku || '').trim();
        setCombos(prevCombos => acc.map(vals => {
            const label = groups.map((g, i) => `${g.name}:${vals[i]}`).join(' / ');
            const suffix = vals.join('-');
            const existing = prevCombos.find(c => (c.values || []).join('') === vals.join(''));
            return {
                values: vals, label, suffix,
                sku: existing?.sku || (base ? `${base}-${suffix}` : suffix),
                stock: existing?.stock ?? '',
                add_price: existing?.add_price ?? '',
            };
        }));
    };
    const setComboField = (ci, k, v) => setCombos(prev => prev.map((c, i) => i === ci ? { ...c, [k]: v } : c));

    /* ═══ Excel Download ═══ */
    const downloadExcel = async () => {
        const XLSX = (await import('xlsx')).default || await import('xlsx');
        const headers = ['SKU', t('priceOpt.productName'), t('priceOpt.category'), t('priceOpt.spec'),
            t('priceOpt.unit'), t('priceOpt.purchaseCost'), t('priceOpt.ioFee'), t('priceOpt.storageFee'),
            t('priceOpt.workFee'), t('priceOpt.shippingFee'), t('priceOpt.productCostAuto'),
            t('priceOpt.targetMarginRate'), t('priceOpt.baseSalePrice'),
            t('priceOpt.qtyPerBox'), t('priceOpt.boxesPerPallet'), t('priceOpt.initialStockUnits'),
            // [현 차수] 신규 컬럼(뒤에 추가 — 기존 업로드 인덱스 0~15 무변경)
            t('priceOpt.brand'), t('priceOpt.manufacturer'), t('priceOpt.origin'), t('priceOpt.modelName'),
            t('priceOpt.barcode'), t('priceOpt.taxType'), t('priceOpt.shipMethod'), t('priceOpt.shipFeeType'),
            t('priceOpt.shipFee'), t('priceOpt.asPhone'), t('priceOpt.asGuide'), t('priceOpt.warranty'),
            'Options', t('priceOpt.detailTitle')];
        const optStr = (p) => (Array.isArray(p.options) ? p.options : []).map(g => `${g.name}:${(g.values || []).join('|')}`).join(';');
        const stripHtml = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const rows = products.map(p => [
            p.sku, p.product_name, p.category || '', p.spec || '', p.unit || '',
            p.purchase_cost || p.cost_price || 0, p.io_fee || 0, p.storage_fee || 0,
            p.work_fee || 0, p.shipping_fee || 0, p.cost_price || 0,
            p.target_margin || 0.30, p.base_price || 0,
            p.qty_per_box || 0, p.boxes_per_pallet || 0, p.initial_stock || 0,
            p.brand || '', p.manufacturer || '', p.origin || '', p.model_name || '',
            p.barcode || '', p.tax_type || '', p.ship_method || '', p.ship_fee_type || '',
            p.ship_fee || 0, p.as_phone || '', p.as_guide || '', p.warranty || '',
            optStr(p), stripHtml(p.detail_html),
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
                    // [현 차수] 옵션 정의 문자열 파싱: "색상:빨강|파랑;사이즈:S|M" → [{name,values}]
                    const parseOpts = (s) => String(s || '').split(';').map(g => {
                        const [name, vals] = g.split(':');
                        if (!name || !vals) return null;
                        return { name: name.trim(), values: vals.split('|').map(v => v.trim()).filter(Boolean) };
                    }).filter(g => g && g.values.length);
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
                        // [현 차수] 신규 컬럼(16~29)
                        brand: String(row[16] || '').trim(), manufacturer: String(row[17] || '').trim(),
                        origin: String(row[18] || '').trim(), model_name: String(row[19] || '').trim(),
                        barcode: String(row[20] || '').trim(), tax_type: String(row[21] || '').trim() || 'taxable',
                        ship_method: String(row[22] || '').trim() || 'courier', ship_fee_type: String(row[23] || '').trim() || 'free',
                        ship_fee: parseInt(row[24]) || 0, as_phone: String(row[25] || '').trim(),
                        as_guide: String(row[26] || '').trim(), warranty: String(row[27] || '').trim(),
                        options: parseOpts(row[28]), detail_html: String(row[29] || '').trim(),
                        _replace: true, // 206차 #6: 엑셀 일괄 업로드는 기존 SKU 덮어쓰기 허용(중복차단 예외)
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
            'Qty per Box', 'Boxes per Pallet', 'Initial Stock (units)',
            // [현 차수] 신규 컬럼(국내몰 필수 + 옵션 + 상세)
            'Brand', 'Manufacturer', 'Origin', 'Model', 'Barcode', 'TaxType(taxable/exempt)',
            'ShipMethod(courier/direct/pickup/install)', 'ShipFeeType(free/paid/conditional)', 'ShipFee',
            'A/S Phone', 'A/S Guide', 'Warranty', 'Options(색상:빨강|파랑;사이즈:S|M)', 'Detail(text/HTML)'];
        const example = ['SKU-001', 'Sample Product', 'catElecAudio', '100x50mm', 'unitEach',
            10000, 500, 300, 200, 1500, 12500, 0.30, 18000, 24, 40, 960,
            'GenieBrand', 'Genie Mfg', '대한민국', 'GB-100', '8809000000001', 'taxable',
            'courier', 'free', 0, '1588-0000', '구매 후 1년 무상 A/S', '전자제품 품질보증기준 준수',
            '색상:빨강|파랑;사이즈:S|M', '<p>제품 상세 설명 예시</p>'];
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

                    {/* ── [276차] 계정 공통 배송/반품 설정 (한 번 등록 → 전 상품 기본값) ── */}
                    <details style={{ marginBottom: 10, background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 12px' }} open={!fulfillment?.return_zip}>
                        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#f97316' }}>
                            🏬 {t('priceOpt.fulfillmentTitle', '배송/반품 설정 (계정 공통)')} {fulfillment?.return_zip ? <span style={{ color: '#16a34a', fontSize: 11 }}>✓ {t('priceOpt.shipDefaultSet', '설정됨')}</span> : <span style={{ color: '#ef4444', fontSize: 11 }}>({t('priceOpt.shipDefaultNone', '미설정')})</span>}
                        </summary>
                        {(() => {
                            const f = fulfillment || {};
                            const upd = (k, v) => setFulfillment({ ...f, [k]: v });
                            return (
                                <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>{lbl(t('priceOpt.courier', '계약 택배사'))}<input style={inpStyle} value={f.courier || ''} onChange={e => upd('courier', e.target.value)} placeholder="예: CJ대한통운" /></div>
                                        <div>{lbl(t('priceOpt.senderName', '보내는 분/업체'))}<input style={inpStyle} value={f.sender_name || ''} onChange={e => upd('sender_name', e.target.value)} placeholder={t('priceOpt.senderName', '보내는 분/업체')} /></div>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, marginTop: 4 }}>📦 {t('priceOpt.releaseAddr', '출고지 주소')}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                                        <div>{lbl(t('priceOpt.zip', '우편번호'))}<input style={inpStyle} value={f.release_zip || ''} onChange={e => upd('release_zip', e.target.value)} placeholder="00000" /></div>
                                        <div>{lbl(t('priceOpt.addr', '주소'))}<input style={inpStyle} value={f.release_addr || ''} onChange={e => upd('release_addr', e.target.value)} placeholder={t('priceOpt.addr', '주소')} /></div>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, marginTop: 4 }}>↩️ {t('priceOpt.returnAddr', '반품/교환지 주소')}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                                        <div>{lbl(t('priceOpt.zip', '우편번호'))}<input style={inpStyle} value={f.return_zip || ''} onChange={e => upd('return_zip', e.target.value)} placeholder="00000" /></div>
                                        <div>{lbl(t('priceOpt.addr', '주소'))}<input style={inpStyle} value={f.return_addr || ''} onChange={e => upd('return_addr', e.target.value)} placeholder={t('priceOpt.addr', '주소')} /></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                        <div>{lbl(t('priceOpt.returnPhone', '반품 연락처'))}<input style={inpStyle} value={f.return_phone || ''} onChange={e => upd('return_phone', e.target.value)} placeholder="010-0000-0000" /></div>
                                        <div>{lbl(t('priceOpt.defReturnFee', '기본 반품비'))}<input type="number" style={inpStyle} value={f.default_return_fee ?? ''} onChange={e => upd('default_return_fee', e.target.value)} placeholder="3000" /></div>
                                        <div>{lbl(t('priceOpt.defExchangeFee', '기본 교환비'))}<input type="number" style={inpStyle} value={f.default_exchange_fee ?? ''} onChange={e => upd('default_exchange_fee', e.target.value)} placeholder="6000" /></div>
                                    </div>
                                    <button type="button" onClick={() => saveFulfillment(fulfillment || {})}
                                        style={{ marginTop: 4, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                        {t('priceOpt.saveFulfillment', '배송/반품 설정 저장')}
                                    </button>
                                    {fulfillMsg && <div style={{ fontSize: 12, textAlign: 'center', color: fulfillMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{fulfillMsg}</div>}
                                </div>
                            );
                        })()}
                    </details>

                    <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                        {/* ── [현 차수] 복수 제품 이미지 (첫 번째=대표) ── */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 8 }}>📷 {t('priceOpt.imagesTitle')} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({images.length}/{MAX_IMAGES} · {t('priceOpt.imageMax')})</span></div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {images.map((src, i) => (
                                    <div key={i} style={{ position: 'relative' }}>
                                        <img src={src} alt="" style={{ width: 82, height: 82, objectFit: 'cover', borderRadius: 8, border: i === 0 ? '2px solid #6366f1' : '1px solid #e2e8f0' }} />
                                        {i === 0 && <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 8, background: '#6366f1', color: '#fff', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>{t('priceOpt.imgMainLabel', '대표')}</span>}
                                        {i !== 0 && <button onClick={() => moveImageFirst(i)} title={t('priceOpt.imgSetMain', '대표로')} style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', padding: '1px 4px', borderRadius: 3, cursor: 'pointer' }}>★</button>}
                                        <button onClick={() => removeImageAt(i)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✕</button>
                                    </div>
                                ))}
                                {images.length < MAX_IMAGES && (
                                    <div
                                        onDrop={handleImageDrop}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onClick={() => document.getElementById('prod-img-input')?.click()}
                                        style={{ width: 82, height: 82, border: `2px dashed ${dragOver ? '#6366f1' : '#cbd5e1'}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: dragOver ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                                        <div style={{ fontSize: 20 }}>＋</div>
                                        <div style={{ fontSize: 9, color: '#7c8fa8' }}>{t('priceOpt.imageAdd')}</div>
                                    </div>
                                )}
                            </div>
                            <input id="prod-img-input" type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
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

                        {/* ── [현 차수] 쇼핑몰 필수정보 (네이버·쿠팡 등 국내몰 등록 필수/권장) ── */}
                        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>🛒 {t('priceOpt.reqFieldsTitle')} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({t('priceOpt.requiredMark')})</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>{lbl(t('priceOpt.brand'))}<input style={inpStyle} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand" /></div>
                                <div>{lbl(t('priceOpt.manufacturer'))}<input style={inpStyle} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="Maker" /></div>
                                <div>{lbl(t('priceOpt.origin'))}<input style={inpStyle} value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="대한민국" /></div>
                                <div>{lbl(t('priceOpt.modelName'))}<input style={inpStyle} value={form.model_name} onChange={e => set('model_name', e.target.value)} placeholder="Model" /></div>
                                <div>{lbl(t('priceOpt.barcode'))}<input style={inpStyle} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="8809..." /></div>
                                <div>{lbl(t('priceOpt.taxType'))}<select style={inpStyle} value={form.tax_type} onChange={e => set('tax_type', e.target.value)}>
                                    <option value="taxable">{t('priceOpt.taxable')}</option>
                                    <option value="exempt">{t('priceOpt.taxExempt')}</option>
                                </select></div>
                                <div>{lbl(t('priceOpt.shipMethod'))}<select style={inpStyle} value={form.ship_method} onChange={e => set('ship_method', e.target.value)}>
                                    <option value="courier">{t('priceOpt.shipCourier')}</option>
                                    <option value="direct">{t('priceOpt.shipDirect')}</option>
                                    <option value="pickup">{t('priceOpt.shipPickup')}</option>
                                    <option value="install">{t('priceOpt.shipInstall')}</option>
                                </select></div>
                                <div>{lbl(t('priceOpt.shipFeeType'))}<select style={inpStyle} value={form.ship_fee_type} onChange={e => set('ship_fee_type', e.target.value)}>
                                    <option value="free">{t('priceOpt.shipFree')}</option>
                                    <option value="paid">{t('priceOpt.shipPaid')}</option>
                                    <option value="conditional">{t('priceOpt.shipConditional')}</option>
                                </select></div>
                                {form.ship_fee_type !== 'free' && (
                                    <div>{lbl(t('priceOpt.shipFee'))}<input style={inpStyle} type="number" min="0" value={form.ship_fee} onChange={e => set('ship_fee', e.target.value)} placeholder="3000" /></div>
                                )}
                                <div>{lbl(t('priceOpt.asPhone'))}<input style={inpStyle} value={form.as_phone} onChange={e => set('as_phone', e.target.value)} placeholder="1588-0000" /></div>
                                <div style={{ gridColumn: '1 / -1' }}>{lbl(t('priceOpt.asGuide'))}<input style={inpStyle} value={form.as_guide} onChange={e => set('as_guide', e.target.value)} placeholder={t('priceOpt.asGuide')} /></div>
                                <div style={{ gridColumn: '1 / -1' }}>{lbl(t('priceOpt.warranty'))}<input style={inpStyle} value={form.warranty} onChange={e => set('warranty', e.target.value)} placeholder={t('priceOpt.warranty')} /></div>
                            </div>
                        </div>

                        {/* ── [276차] 상품정보제공고시 (전자상거래법 법정 필수) ── */}
                        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>📋 {t('priceOpt.noticeTitle', '상품정보제공고시')} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({t('priceOpt.legalRequired', '법정 필수')})</span></div>
                                <button type="button" onClick={() => {
                                    const tpl = noticeTemplateByKey(form.notice_category);
                                    if (!tpl) return;
                                    const filled = {}; tpl.items.forEach(it => { filled[it] = noticeItems[it] || NOTICE_REFERENCE_TEXT; });
                                    setNoticeItems(filled);
                                }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#16a34a', cursor: 'pointer', fontWeight: 700 }}>{t('priceOpt.noticeFillRef', "전체 '상품상세 참조'로 채우기")}</button>
                            </div>
                            <div style={{ marginBottom: 8 }}>{lbl(t('priceOpt.noticeCategory', '품목 (고시 카테고리)'))}
                                <select style={inpStyle} value={form.notice_category} onChange={e => { set('notice_category', e.target.value); setNoticeItems({}); }}>
                                    {PRODUCT_NOTICE_TEMPLATES.map(tp => <option key={tp.key} value={tp.key}>{tp.label}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gap: 6 }}>
                                {(noticeTemplateByKey(form.notice_category)?.items || []).map(it => (
                                    <div key={it}>{lbl(it)}
                                        <input style={inpStyle} value={noticeItems[it] || ''} onChange={e => setNoticeItems(prev => ({ ...prev, [it]: e.target.value }))} placeholder={NOTICE_REFERENCE_TEXT} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── [276차] 인증·판매 정보 (플랫폼 공통 필수) ── */}
                        <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.18)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 700, marginBottom: 8 }}>🛡️ {t('priceOpt.certSalesTitle', '인증·판매 정보')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>{lbl(t('priceOpt.kcType', 'KC 인증'))}
                                    <select style={inpStyle} value={form.kc_type} onChange={e => set('kc_type', e.target.value)}>
                                        <option value="none">{t('priceOpt.kcNone', '해당 없음/선택 안 함')}</option>
                                        <option value="target">{t('priceOpt.kcTarget', 'KC 인증 대상')}</option>
                                        <option value="supplier">{t('priceOpt.kcSupplier', '공급자 적합성 확인')}</option>
                                        <option value="exempt">{t('priceOpt.kcExempt', '안전기준 준수/면제')}</option>
                                    </select>
                                </div>
                                <div>{lbl(t('priceOpt.kcCertNo', 'KC 인증번호'))}<input style={inpStyle} value={form.kc_cert_no} onChange={e => set('kc_cert_no', e.target.value)} placeholder="예: XU-12345-6789" disabled={form.kc_type === 'none'} /></div>
                                <div>{lbl(t('priceOpt.minorPurchase', '미성년자 구매'))}
                                    <select style={inpStyle} value={form.minor_purchase} onChange={e => set('minor_purchase', e.target.value)}>
                                        <option value="yes">{t('priceOpt.minorYes', '가능')}</option>
                                        <option value="no">{t('priceOpt.minorNo', '불가(성인용품/주류 등)')}</option>
                                    </select>
                                </div>
                                <div />
                                <div>{lbl(t('priceOpt.mfgDate', '제조연월일'))}<input type="date" style={inpStyle} value={form.mfg_date} onChange={e => set('mfg_date', e.target.value)} /></div>
                                <div>{lbl(t('priceOpt.expiryDate', '유효일자(유통/사용기한)'))}<input type="date" style={inpStyle} value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} /></div>
                            </div>
                        </div>

                        {/* ── [276차] 배송·반품/교환 (계정 공통 기본값 + 상품별 예외) ── */}
                        <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, marginBottom: 8 }}>🚚 {t('priceOpt.returnTitle', '배송·반품/교환')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <div>{lbl(t('priceOpt.returnShipFee', '반품 배송비'))}<input type="number" style={inpStyle} value={form.return_ship_fee} onChange={e => set('return_ship_fee', e.target.value)} placeholder="0" /></div>
                                <div>{lbl(t('priceOpt.exchangeShipFee', '교환 배송비'))}<input type="number" style={inpStyle} value={form.exchange_ship_fee} onChange={e => set('exchange_ship_fee', e.target.value)} placeholder="0" /></div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', cursor: 'pointer', marginBottom: form.ship_use_default ? 0 : 8 }}>
                                <input type="checkbox" checked={form.ship_use_default} onChange={e => set('ship_use_default', e.target.checked)} />
                                {t('priceOpt.shipUseDefault', '계정 공통 출고지·반품지·택배사 사용')} {fulfillment?.return_zip ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {t('priceOpt.shipDefaultSet', '설정됨')}</span> : <span style={{ color: '#ef4444' }}>({t('priceOpt.shipDefaultNone', '미설정 — 아래 배송/반품 설정에서 등록')})</span>}
                            </label>
                            {!form.ship_use_default && (
                                <div style={{ display: 'grid', gap: 6 }}>
                                    <div>{lbl(t('priceOpt.releaseAddr', '출고지 주소'))}<input style={inpStyle} value={form.release_addr} onChange={e => set('release_addr', e.target.value)} placeholder={t('priceOpt.releaseAddr', '출고지 주소')} /></div>
                                    <div>{lbl(t('priceOpt.returnAddr', '반품/교환지 주소'))}<input style={inpStyle} value={form.return_addr} onChange={e => set('return_addr', e.target.value)} placeholder={t('priceOpt.returnAddr', '반품/교환지 주소')} /></div>
                                    <div>{lbl(t('priceOpt.returnCourier', '택배사'))}<input style={inpStyle} value={form.return_courier} onChange={e => set('return_courier', e.target.value)} placeholder="예: CJ대한통운" /></div>
                                </div>
                            )}
                        </div>

                        {/* ── [현 차수] 옵션 설정 + 조합별 재고 (WMS 반영) ── */}
                        <div style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 700 }}>🎨 {t('priceOpt.optionsTitle')}</div>
                                <button type="button" onClick={addOptGroup} disabled={optGroups.length >= 3} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)', color: '#a855f7', cursor: optGroups.length >= 3 ? 'default' : 'pointer', fontWeight: 700 }}>＋ {t('priceOpt.addOptionGroup')}</button>
                            </div>
                            {optGroups.length === 0 && <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('priceOpt.noOptions')}</div>}
                            {optGroups.map((g, gi) => (
                                <div key={gi} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                                    <div>{lbl(t('priceOpt.optionGroupName'))}<input style={inpStyle} value={g.name} onChange={e => setOptGroupName(gi, e.target.value)} placeholder={t('priceOpt.optionGroupName')} /></div>
                                    <div>{lbl(t('priceOpt.optionValues'))}<input style={inpStyle} defaultValue={g.values.join(', ')} onBlur={e => setOptGroupValues(gi, e.target.value)} placeholder="빨강, 파랑, 검정" /></div>
                                    <button type="button" onClick={() => removeOptGroup(gi)} style={{ height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
                                </div>
                            ))}
                            {optGroups.some(g => g.name.trim() && g.values.length) && (
                                <button type="button" onClick={generateCombos} style={{ marginTop: 4, fontSize: 10, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>⚙ {t('priceOpt.genCombos')}</button>
                            )}
                            {combos.length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                    <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, marginBottom: 4 }}>{t('priceOpt.optionCombos')} ({combos.length}) · {t('priceOpt.totalUnits')}: <b>{(comboStockTotal || 0).toLocaleString()}</b></div>
                                    <div style={{ maxHeight: 210, overflowY: 'auto', display: 'grid', gap: 4 }}>
                                        {combos.map((c, ci) => (
                                            <div key={ci} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 0.8fr 0.9fr', gap: 4, alignItems: 'center', background: '#faf5ff', borderRadius: 6, padding: '4px 6px' }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>{c.label}</span>
                                                <input style={{ ...inpStyle, fontSize: 10, padding: '3px 6px' }} value={c.sku} onChange={e => setComboField(ci, 'sku', e.target.value)} placeholder={t('priceOpt.comboSku')} />
                                                <input style={{ ...inpStyle, fontSize: 10, padding: '3px 6px' }} type="number" min="0" value={c.stock} onChange={e => setComboField(ci, 'stock', e.target.value)} placeholder={t('priceOpt.optionStock')} />
                                                <input style={{ ...inpStyle, fontSize: 10, padding: '3px 6px' }} type="number" value={c.add_price} onChange={e => setComboField(ci, 'add_price', e.target.value)} placeholder={t('priceOpt.optionAddPrice')} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                    {/* [276\ucc28] \uc800\uc7a5 \ubc84\ud2bc \uac00\uc2dc\uc131 \uc218\uc815: \ud3fc\uc774 \uae38\uc5b4(\uc774\ubbf8\uc9c0\u00b7\uc635\uc158\u00b7\uc6d0\uac00) \uc800\uc7a5 \ubc84\ud2bc\uc774 \ud654\uba74 \ubc16 1700px \uc544\ub798\uc5d0
                        \uc704\uce58 + `.btn`(\ubc30\uacbd 4%)\u00b7disabled(opacity .45) \ub85c \uac70\uc758 \uc548 \ubcf4\uc600\ub2e4. sticky \ud558\ub2e8\uace0\uc815 + \uac15\uc870 \uc2a4\ud0c0\uc77c +
                        \ube44\ud65c\uc131 \uc0ac\uc720 \uc548\ub0b4\ub85c "\uc800\uc7a5\ubc84\ud2bc \uc548\ubcf4\uc784" \uadfc\ubcf8\ud574\uc18c. */}
                    <div style={{ position: "sticky", bottom: 0, background: "#ffffff", paddingTop: 12, marginTop: 6, borderTop: "1px solid #eef2f7", zIndex: 5 }}>
                        <button onClick={save} disabled={!form.sku}
                            style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none",
                                background: form.sku ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "#cbd5e1",
                                color: "#fff", fontSize: 15, fontWeight: 800, cursor: form.sku ? "pointer" : "not-allowed",
                                boxShadow: form.sku ? "0 10px 26px rgba(79,142,247,0.4)" : "none", transition: "all .2s" }}>
                            {t('priceOpt.saveProduct')}
                        </button>
                        {!form.sku && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 7, textAlign: "center" }}>{t('priceOpt.saveNeedSku', 'SKU(\uc0c1\ud488\ucf54\ub4dc)\ub97c \uba3c\uc800 \uc785\ub825\ud558\uba74 \uc800\uc7a5\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4')}</div>}
                        {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith("\u2705") ? "#22c55e" : "#ef4444", textAlign: "center" }}>{msg}</div>}
                    </div>
                </div>

                {/* ═══ Product List ═══ */}
                {(() => { const q = searchQuery.trim().toLowerCase();
                  const filteredProducts = q ? products.filter(p =>
                    (p.sku || '').toLowerCase().includes(q) ||
                    (p.product_name || '').toLowerCase().includes(q) ||
                    (p.category || '').toLowerCase().includes(q)
                  ) : products;
                  return (
                <div>
                    <h4 style={{ marginTop: 0, fontSize: 13 }}>{t("priceOpt.regProducts")} ({filteredProducts.length}{q ? `/${products.length}` : ''})</h4>
                    {/* 206차 #6: 등록 제품 검색(SKU·상품명·카테고리) */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('priceOpt.searchPlaceholder', 'SKU · 상품명 · 카테고리 검색...')}
                            style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, color: '#1e293b', padding: '7px 10px', fontSize: 12 }} />
                        {searchQuery && <button onClick={() => setSearchQuery('')} style={{ padding: '7px 12px', borderRadius: 6, background: 'rgba(99,140,255,0.12)', border: 'none', color: '#4f8ef7', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✕</button>}
                    </div>
                    {filteredProducts.map((p, i) => (
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
                            {/* [277차] 판매채널 전송 — 연동된 채널만 노출. 클릭 1회로 기존 writeback 큐(정책검증·승인·어댑터)에 위임. */}
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 5 }}>📤 {t('priceOpt.pubTitle', '판매채널 전송')}</div>
                                {pubChannels.length === 0 ? (
                                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{t('priceOpt.pubNoChannel', '연동된 판매채널이 없습니다 — 연동허브에서 채널을 먼저 연결하세요')}</div>
                                ) : (
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {pubChannels.map(c => {
                                            const busy = pubBusy === `${p.sku}:${c.id}`;
                                            return (
                                                <button key={c.id} onClick={() => publishToChannel(p, c.id)} disabled={!!pubBusy}
                                                    title={`${c.label} ${t('priceOpt.pubTitle', '판매채널 전송')}`}
                                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 999,
                                                        border: `1px solid ${c.color || '#cbd5e1'}`, background: busy ? "#e2e8f0" : "#fff",
                                                        color: busy ? "#64748b" : (c.color || "#334155"), fontSize: 10, fontWeight: 700,
                                                        cursor: pubBusy ? "not-allowed" : "pointer", opacity: (pubBusy && !busy) ? 0.5 : 1 }}>
                                                    <span>{c.icon}</span>
                                                    <span>{busy ? t('priceOpt.pubSending', '전송 중…') : c.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {pubMsg[p.sku] && (
                                    <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: pubMsg[p.sku].ok ? "#22c55e" : "#ef4444" }}>
                                        {pubMsg[p.sku].ok ? "✅" : "❌"} {pubMsg[p.sku].text}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && <div style={{ color: "#64748b", fontSize: 11, padding: 12 }}>{q ? `"${searchQuery}" ${t('priceOpt.noSearchResult', '검색 결과가 없습니다')}` : t("priceOpt.noProducts")}</div>}
                </div>
                  ); })()}
            </div>

            {/* ── [현 차수] 제품 상세내용 (Summernote WYSIWYG · 전체폭) ── */}
            <div style={{ background: 'rgba(15,23,42,0.02)', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>📝 {t('priceOpt.detailTitle')}</div>
                <div style={{ fontSize: 11, color: '#7c8fa8', marginBottom: 10 }}>{t('priceOpt.detailHint')}</div>
                <SummernoteEditor value={form.detail_html} onChange={(html) => set('detail_html', html)} height={340} placeholder={t('priceOpt.detailTitle')} />
            </div>
        </div>
    );
}


// ── Tab: Optimize ─────────────────────────────────────────────────────────────
function OptimizeTab({ token }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ sku: "", channel: "*", current_price: "", inventory: "0", ship_mode: "", ship_cost: "" });
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
                        .then(d => setRecent(d.recommendations?.slice(0, 6) || []))
            .catch(() => { })
        , [token]);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/products`, ac.signal)
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

    const [gt, setGt] = useState(null);      // [260차] 게임이론 경쟁반응 시뮬 결과
    const [gtLoading, setGtLoading] = useState(false);
    const runGameTheory = async () => {
        setGtLoading(true); setGt(null);
        try {
            const d = await postJsonAuth(`/v420/price/game-theory`, {
                sku: form.sku, channel: form.channel || "*",
                current_price: form.current_price ? parseFloat(form.current_price) : undefined,
            });
            setGt(d);
        } catch (e) { setGt({ ok: false, error: String(e) }); }
        finally { setGtLoading(false); }
    };

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const d = await postJsonAuth(`/v420/price/optimize`, {
                sku: form.sku,
                channel: form.channel || "*",
                current_price: form.current_price ? parseFloat(form.current_price) : undefined,
                inventory: parseInt(form.inventory) || 0,
                // [현 차수] 배송조건 — 미선택('')이면 백엔드가 채널 관행 기본 적용. 무료배송이면 배송비를 실효원가에 가산.
                ship_mode: form.ship_mode || undefined,
                ship_cost: form.ship_cost !== "" ? parseFloat(form.ship_cost) : undefined,
            });
            setResult(d);
            loadRecent();
            // [v11] PriceOpt → CatalogSync → OrderHub 양방향 Sync
            if (d.sku && d.optimal_price) {
                const channelKey = form.channel === '*' ? 'all' : form.channel;
                updateCatalogChannelPrices?.(d.sku, { [channelKey]: d.optimal_price });
                updateProductPrice?.(d.sku, d.optimal_price, channelKey === 'all' ? null : channelKey);
                // 209차 P1: 최적가 백엔드 영속(client-state 만 → 새로고침/타기기 소실 해소·테넌트격리).
                try { await postJsonAuth('/api/catalog/bulk-price', { items: [{ channel: channelKey, sku: d.sku, price: d.optimal_price }] }); } catch { /* 로컬 반영은 유지 */ }
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
                    {[["current_price", t("priceOpt.currentSalePrice", "Current Price")], ["inventory", t("priceOpt.stockQty", "Stock Qty")]].map(([k, label]) => (
                        <div key={k}>
                            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{label}</label>
                            <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                                style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
                        </div>
                    ))}
                </div>
                {/* [현 차수] 배송 조건 — 무료배송(판매자 부담)이면 배송비가 실효원가에 가산되어 최적가가 마진 보존하도록 상향. 신규 메뉴 없이 기존 폼 확장. */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginBottom: 12, alignItems: "end" }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.shipMode', '배송 조건')}</label>
                        <select value={form.ship_mode} onChange={e => setForm(f => ({ ...f, ship_mode: e.target.value }))}
                            style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12 }}>
                            <option value="">{t('priceOpt.shipAuto', '자동(채널 관행)')}</option>
                            <option value="free">{t('priceOpt.shipFree', '무료배송(판매자 부담)')}</option>
                            <option value="buyer_paid">{t('priceOpt.shipBuyer', '소비자 부담')}</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{t('priceOpt.shipCost', '배송비(무료배송 시)')}</label>
                        <input type="number" value={form.ship_cost} onChange={e => setForm(f => ({ ...f, ship_cost: e.target.value }))}
                            placeholder="0" disabled={form.ship_mode === 'buyer_paid'}
                            style={{ width: "100%", background: form.ship_mode === 'buyer_paid' ? "#e2e8f0" : "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: "#1e293b", padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8", paddingBottom: 4 }}>
                        💡 {t('priceOpt.shipHint', '무료배송은 배송비가 실효원가에 가산되어 마진 보존 최적가로 상향됩니다. 자동 선택 시 채널 관행(Amazon·Shopify·쿠팡 등=무료배송, eBay·Etsy·Shopee 등=소비자 부담)이 적용됩니다.')}
                        <div style={{ marginTop: 4 }}>🌐 {t('priceOpt.shipIntlNote', '해외 판매: 유류할증료는 배송비에 포함해 입력하세요. 관세·부가세는 통상 구매자(수입자) 부담(DDU)이며, DDP(판매자 관세부담) 조건일 때만 배송비 항목에 합산하세요.')}</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={run} disabled={loading || !form.sku} style={{ background: "#6366f1" }}>
                        {loading ? "⏳ " + (t("priceOpt.calculating", "Calculating...")) : "🧮 " + (t("priceOpt.calcOptimal", "Optimize"))}
                    </button>
                    <button className="btn" onClick={runGameTheory} disabled={gtLoading || !form.sku} title={t("priceOpt.gtHint", "경쟁사 가격 반응(언더컷)을 시뮬레이션해 내시 균형가 산출 — 순진한 이익최대가의 반응 함정 회피")}
                        style={{ background: "#0ea5e9" }}>
                        {gtLoading ? "⏳ " : "♟️ "}{t("priceOpt.gameTheory", "게임이론 시뮬")}
                    </button>
                </div>
            </div>

            {/* [260차] 게임이론 경쟁반응 시뮬 결과 */}
            {gt && (
                <div className="card" style={{ marginBottom: 16, borderLeft: "3px solid #0ea5e9" }}>
                    <h4 style={{ marginTop: 0, fontSize: 13 }}>♟️ {t("priceOpt.gameTheory", "게임이론 시뮬")} {gt.ok && <span style={{ color: "#7c8fa8", fontWeight: 400 }}>({gt.sku})</span>}</h4>
                    {!gt.ok ? (
                        <div style={{ fontSize: 12, color: "#ef4444" }}>{gt.error}</div>
                    ) : (
                        <div style={{ display: "grid", gap: 8, fontSize: 12.5 }}>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                <div><span style={{ color: "#64748b" }}>{t("priceOpt.gtEqPrice", "내시 균형가")}: </span><b style={{ color: "#0ea5e9", fontSize: 15 }}>{Number(gt.equilibrium_price).toLocaleString()}</b></div>
                                <div><span style={{ color: "#64748b" }}>{t("priceOpt.gtNaive", "순진한 이익최대가")}: </span><b>{Number(gt.naive_price).toLocaleString()}</b></div>
                                <div><span style={{ color: "#64748b" }}>{t("priceOpt.gtRec", "권장가")}: </span><b style={{ color: "#22c55e" }}>{Number(gt.recommendation).toLocaleString()}</b></div>
                            </div>
                            <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.6 }}>
                                {t("priceOpt.gtTrap", "순진한 최저가로 내리면 경쟁사가 반응(언더컷)해 이익이")} <b style={{ color: "#ef4444" }}>{gt.reaction_trap_pct}%</b> {t("priceOpt.gtTrap2", "잠식됩니다. 균형가는 반응을 선반영해 방어적입니다.")}
                                {" "}{t("priceOpt.gtElast", "탄력성")}={gt.elasticity_slope} · {t("priceOpt.gtComp", "경쟁가")} {(gt.competitors || []).map(c => Number(c).toLocaleString()).join(", ")}
                            </div>
                            {Array.isArray(gt.path) && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 10.5, color: "#64748b" }}>
                                    {gt.path.map((p, i) => <span key={i} style={{ background: "#f1f5f9", borderRadius: 6, padding: "2px 8px" }}>R{p.round}: {Number(p.our).toLocaleString()} vs [{(p.comp || []).map(c => Number(c).toLocaleString()).join("/")}]</span>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

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
                            // [현 차수] 배송 반영 — 무료배송이면 실효원가(배송 가산) 표시. 소비자부담/무부담이면 생략.
                            ...(result.ship_mode ? [{ label: t("priceOpt.shipModeLabel", "배송 조건"), value: result.ship_mode === 'free' ? (t('priceOpt.shipFreeShort', '무료배송') + (result.ship_cost ? ' ₩' + fmt(result.ship_cost) : '')) : t('priceOpt.shipBuyerShort', '소비자 부담'), color: result.ship_mode === 'free' ? "#a855f7" : "#64748b" }] : []),
                            ...(result.shipping_burden > 0 ? [{ label: t("priceOpt.effectiveCost", "실효원가(배송반영)"), value: fmt(result.effective_cost), color: "#ef4444" }] : []),
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
                        style={{ width: "100%", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, color: '#0f172a', padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
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
                        {(result.allocations || []).map((a, i) => (
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
                            {(result.allocations || []).map((a, i) => (
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
    // [현 차수] 멀티 마켓플레이스 경쟁가 수집 결과 서피싱(Naver·Coupang·11번가·Amazon)
    const [harvesting, setHarvesting] = useState(false);
    const [harvestRes, setHarvestRes] = useState(null);
    // 소스 마켓플레이스 라벨(백엔드 harvest sources/by_source 키 매핑)
    const MP_META = {
        naver_shopping: { label: t('priceOpt.mpNaver', '네이버쇼핑'), color: '#22c55e' },
        coupang:        { label: t('priceOpt.mpCoupang', '쿠팡'), color: '#ef4444' },
        '11st':         { label: t('priceOpt.mp11st', '11번가'), color: '#f97316' },
        amazon:         { label: t('priceOpt.mpAmazon', 'Amazon'), color: '#6366f1' },
    };
    const mpLabel = (k) => (MP_META[k]?.label || k);
    const mpColor = (k) => (MP_META[k]?.color || '#64748b');

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/competitor`, ac.signal)
            .then(d => { if (d.items) setCompetitorData(d.items); }).catch(() => {});
        return () => ac.abort();
    }, [token]);

    const runHarvest = async () => {
        setHarvesting(true); setHarvestRes(null);
        try {
            const d = await postJsonAuth(`/v420/price/competitor/harvest`, {});
            setHarvestRes(d);
            // 수집 후 경쟁가 테이블 갱신
            try { const c = await getJsonAuth(`/v420/price/competitor`); if (c.items) setCompetitorData(c.items); } catch {}
        } catch (e) {
            setHarvestRes({ ok: false, error: e?.message || String(e) });
        } finally { setHarvesting(false); }
    };

    const alerts = competitorData.filter(d => d.alert);
    return (
        <div style={{ display:'grid', gap:14 }}>
            {/* [현 차수] 경쟁가 자동 수집(4개 마켓플레이스) + 소스별 응답 서피싱 */}
            <div style={{ padding:'12px 16px', background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:12, display:'grid', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <button onClick={runHarvest} disabled={harvesting} style={{ padding:'8px 18px', borderRadius:9, border:'none', cursor:harvesting?'default':'pointer', fontWeight:800, fontSize:12, background:harvesting?'#cbd5e1':'linear-gradient(135deg,#4f8ef7,#6366f1)', color:'#fff' }}>
                        {harvesting ? t('priceOpt.harvesting', '수집 중…') : `🛰️ ${t('priceOpt.harvestNow', '경쟁가 자동 수집')}`}
                    </button>
                    <span style={{ fontSize:11, color:'#7c8fa8' }}>{t('priceOpt.harvestSources', '수집 마켓플레이스')}: {t('priceOpt.mpNaver', '네이버쇼핑')} · {t('priceOpt.mpCoupang', '쿠팡')} · {t('priceOpt.mp11st', '11번가')} · Amazon</span>
                </div>
                {harvestRes && (
                    harvestRes.ok === false ? (
                        <div style={{ fontSize:11, color:'#ef4444', fontWeight:700 }}>❌ {harvestRes.error}</div>
                    ) : harvestRes.pending ? (
                        <div style={{ fontSize:11, color:'#b45309' }}>⏳ {harvestRes.note || t('priceOpt.harvestPending', '수집 자격증명 미설정 — 연동 후 라이브 경쟁가 자동 수집')}</div>
                    ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, color:'#0e7490', fontWeight:700 }}>✅ {t('priceOpt.harvestUpdated', '갱신')}: {harvestRes.updated || 0}</span>
                            {(harvestRes.sources || []).map(s => {
                                const cnt = harvestRes.by_source?.[s] || 0;
                                const got = cnt > 0;
                                return (
                                    <span key={s} title={got ? `${cnt} ${t('priceOpt.harvestReturned', '응답')}` : t('priceOpt.harvestNoData', '데이터 없음')}
                                        style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:got?mpColor(s)+'1f':'rgba(100,116,139,0.12)', color:got?mpColor(s):'#94a3b8', border:`1px solid ${got?mpColor(s)+'55':'#e2e8f0'}` }}>
                                        {got ? '● ' : '○ '}{mpLabel(s)}{got ? ` ${cnt}` : ` · ${t('priceOpt.harvestPendingShort', '대기')}`}
                                    </span>
                                );
                            })}
                            {(harvestRes.sources || []).length === 0 && <span style={{ fontSize:10, color:'#94a3b8' }}>{t('priceOpt.harvestNoSource', '활성 소스 없음')}</span>}
                        </div>
                    )
                )}
            </div>
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
            .then(d => { if (d.events) setEvents(d.events); }).catch(() => {});
        return () => ac.abort();
    }, [token]);

    const allEvents = [...events, ...priceCalendar.filter(pc => !events.find(e => e.sku === pc.sku && e.startDate === pc.startDate))];

    const saveEvent = async () => {
        try {
            await postJsonAuth(`/v420/price/calendar`, form);
            addPriceCalendarEvent?.(form);
            const d = await getJsonAuth(`/v420/price/calendar`);
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
                                style={{ padding:'7px 10px', borderRadius:8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize:12 }} />
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
    // [239차] human-in-loop 리프라이싱: 실행 + 채널 반영 승인
    const [running, setRunning] = useState(false);
    const [runRes, setRunRes] = useState(null);
    const [approving, setApproving] = useState(false);
    const [pendingN, setPendingN] = useState(0);
    const [msg, setMsg] = useState('');
    const [buybox, setBuybox] = useState(null); // [차기 P1] Buybox 승률 현황
    // [239차+ ML] 규칙 생성 폼(ML 탄력성 모드 포함)
    const [newRule, setNewRule] = useState({ name: '', sku: '*', channel: '*', mode: 'elasticity', beat_by: '1', min_price: '', max_price: '', comp_max_age_hours: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const ac = new AbortController();
        getJsonAuthAbortable(`/v420/price/repricer/rules`, ac.signal)
            .then(d => { if (d.rules) setRules(d.rules); if (d.avg_margin_improve != null) setMarginImprove(d.avg_margin_improve); }).catch(() => {});
        getJsonAuthAbortable(`/v420/price/repricer/history`, ac.signal)
            .then(d => { if (d.history) setHistory(d.history); }).catch(() => {});
        // 채널 반영 대기(pending_approval price_update) 건수 — writeback jobs 에서 집계
        getJsonAuthAbortable(`/api/catalog/writeback/jobs`, ac.signal)
            .then(d => { if (Array.isArray(d)) setPendingN(d.filter(j => j.operation === 'price_update' && j.status === 'pending_approval').length); }).catch(() => {});
        getJsonAuthAbortable(`/v420/price/repricer/buybox`, ac.signal)
            .then(d => { if (d?.ok) setBuybox(d); }).catch(() => {});
        return () => ac.abort();
    }, [token]);

    const runReprice = async () => {
        setRunning(true); setMsg('');
        try {
            const d = await postJsonAuth('/v420/price/repricer/run', {});
            setRunRes(d);
            setPendingN(prev => prev + (d.pending_approval || 0));
            getJsonAuth(`/v420/price/repricer/history`).then(h => { if (h.history) setHistory(h.history); }).catch(() => {});
        } catch (e) { setMsg(t('priceOpt.repriceRunErr', 'Failed to run repricer')); }
        setRunning(false);
    };
    const approvePush = async () => {
        setApproving(true); setMsg('');
        try {
            const d = await postJsonAuth('/api/catalog/writeback/approve', { operation: 'price_update' });
            const s = d.summary || {};
            setMsg(`${t('priceOpt.approveDone', 'Approved')} — ${t('priceOpt.approved', 'approved')}: ${d.approved || 0} · push: ${s.done || 0} · ${t('priceOpt.awaitingCred', 'awaiting credentials')}: ${s.awaiting || 0}`);
            setPendingN(0);
        } catch (e) { setMsg(t('priceOpt.approveErr', 'Approval failed')); }
        setApproving(false);
    };

    const MODE_LABEL = { elasticity: "🧠 " + t("priceOpt.modeElasticity", "ML 수요탄력성"), min_price: t("priceOpt.modeUndercut", "언더컷 -1%"), match: t("priceOpt.modeMatch", "경쟁사 매칭"), margin: t("priceOpt.modeMargin", "목표마진"), buybox: "🏆 " + t("priceOpt.modeBuybox", "Buybox 점유"), roas_target: "ROAS Goal", inventory: t("priceOpt.dsIntegration") };
    const MODE_COLOR = { elasticity: "#a855f7", min_price: "#4f8ef7", match: "#22c55e", margin: "#f97316", buybox: "#eab308", roas_target: "#22c55e", inventory: "#f97316" };
    const MODE_OPTIONS = [["elasticity", MODE_LABEL.elasticity], ["buybox", MODE_LABEL.buybox], ["min_price", MODE_LABEL.min_price], ["match", MODE_LABEL.match], ["margin", MODE_LABEL.margin]];
    const createRule = async () => {
        if (!newRule.name.trim()) { setMsg(t("priceOpt.ruleNameReq", "규칙 이름을 입력하세요")); return; }
        setCreating(true); setMsg('');
        try {
            await postJsonAuth(`/v420/price/repricer/rules`, { name: newRule.name.trim(), sku: newRule.sku.trim() || '*', channel: newRule.channel.trim() || '*', mode: newRule.mode,
                beat_by: Number(newRule.beat_by) || 0, min_price: Number(newRule.min_price) || 0, max_price: Number(newRule.max_price) || 0, comp_max_age_hours: Number(newRule.comp_max_age_hours) || 0 });
            const r = await getJsonAuth(`/v420/price/repricer/rules`); if (r?.rules) setRules(r.rules);
            setNewRule({ name: '', sku: '*', channel: '*', mode: 'elasticity', beat_by: '1', min_price: '', max_price: '', comp_max_age_hours: '' }); setMsg(t("priceOpt.ruleAdded", "규칙 추가됨"));
        } catch (e) { setMsg(t("priceOpt.ruleAddFail", "규칙 추가 실패")); }
        setCreating(false);
    };

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
            {/* [239차] 리프라이서 실행 + 채널 반영 승인(human-in-loop) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <button onClick={runReprice} disabled={running} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: running ? 'default' : 'pointer', fontWeight: 800, fontSize: 12, background: running ? '#cbd5e1' : 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>
                    {running ? t('priceOpt.repriceRunning', 'Running…') : `⚡ ${t('priceOpt.repriceRun', 'Run Repricer')}`}
                </button>
                {pendingN > 0 && (
                    <>
                        <span style={{ fontSize: 12, color: '#b45309', fontWeight: 800 }}>🔔 {t('priceOpt.pendingPush', 'Pending channel push')}: {pendingN}</span>
                        <button onClick={approvePush} disabled={approving} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: approving ? 'default' : 'pointer', fontWeight: 800, fontSize: 12, background: approving ? '#cbd5e1' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff' }}>
                            {approving ? t('priceOpt.approving', 'Approving…') : `✅ ${t('priceOpt.approvePush', 'Approve channel push')}`}
                        </button>
                    </>
                )}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('priceOpt.repriceHelp', 'Live marketplace prices apply only after approval (human review).')}</span>
                {runRes?.note && <span style={{ fontSize: 11, color: '#64748b', flexBasis: '100%' }}>{runRes.note}</span>}
                {runRes?.competitor_prices_harvested > 0 && <span style={{ fontSize: 11, color: '#0e7490', flexBasis: '100%' }}>🛰️ {t('priceOpt.harvestedNote', '경쟁가 자동수집')}: {runRes.competitor_prices_harvested}</span>}
                {msg && <span style={{ fontSize: 11, color: '#0e7490', fontWeight: 700, flexBasis: '100%' }}>{msg}</span>}
            </div>

            {/* [차기 P1-(b)] Buybox 승률 현황 */}
            {buybox && buybox.total > 0 && (
                <div style={{ padding: '16px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#fffbeb,#fefce8)', border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#854d0e' }}>🏆 {t('priceOpt.buyboxTitle', 'Buybox 승률 현황')}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 26, fontWeight: 900, color: buybox.win_rate >= 70 ? '#16a34a' : buybox.win_rate >= 40 ? '#d97706' : '#dc2626' }}>{buybox.win_rate}%</span>
                            <span style={{ fontSize: 11, color: '#a16207' }}>({buybox.won}/{buybox.total} {t('priceOpt.buyboxWon', '점유')})</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 5 }}>
                        {buybox.items.slice(0, 6).map((it, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, padding: '6px 10px', borderRadius: 8, background: '#fff', border: '1px solid #fef3c7' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: it.win ? '#16a34a' : '#dc2626', padding: '2px 7px', borderRadius: 6 }}>{it.win ? t('priceOpt.buyboxWin', '점유') : t('priceOpt.buyboxLose', '패배')}</span>
                                <span style={{ fontWeight: 700, minWidth: 80, color: '#1e293b' }}>{it.name || it.sku}</span>
                                <span style={{ color: '#64748b' }}>{t('priceOpt.buyboxOur', '우리')} {fmt(it.our_price)} · {t('priceOpt.buyboxComp', '최저')} {fmt(it.comp_low)}</span>
                                <span style={{ color: it.gap_pct > 0 ? '#dc2626' : '#16a34a' }}>{it.gap_pct > 0 ? '+' : ''}{it.gap_pct}%</span>
                                {it.days_cover != null && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#94a3b8' }}>📦 {t('priceOpt.daysCover', '소진')} {it.days_cover}{t('priceOpt.daysUnit', '일')}</span>}
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: 10, color: '#a16207', marginTop: 8 }}>{t('priceOpt.buyboxHelp', 'Buybox 모드 규칙으로 최저가 점유를 자동화하세요(원가마진 하한 보호). 패배 SKU 우선 표시.')}</div>
                </div>
            )}

            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>⚡ {t("priceOpt.autoRules")}</div>
                {/* [239차+ ML] 규칙 생성 폼 — ML 수요탄력성 모드 포함 */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0", marginBottom: 10 }}>
                    <input value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} placeholder={t("priceOpt.ruleName", "규칙 이름")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 150 }} />
                    <input value={newRule.sku} onChange={e => setNewRule(r => ({ ...r, sku: e.target.value }))} placeholder="SKU (* = 전체)" style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 110 }} />
                    <input value={newRule.channel} onChange={e => setNewRule(r => ({ ...r, channel: e.target.value }))} placeholder={t("priceOpt.labelChannel", "채널") + " (*)"} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 110 }} />
                    <select value={newRule.mode} onChange={e => setNewRule(r => ({ ...r, mode: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, cursor: "pointer" }}>
                        {MODE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {/* [R-P2-5] 전략 파라미터 — 언더컷%·최소/최대가·경쟁가 신선도 가드 */}
                    {(newRule.mode === 'min_price' || newRule.mode === 'match' || newRule.mode === 'ml' || newRule.mode === 'elasticity' || newRule.mode === 'buybox') && (
                        <input type="number" min="0" max="50" step="0.5" value={newRule.beat_by} onChange={e => setNewRule(r => ({ ...r, beat_by: e.target.value }))} title={t("priceOpt.beatByHint", "경쟁사 최저가 대비 언더컷 비율(%)")} placeholder={t("priceOpt.beatBy", "언더컷%")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 80 }} />
                    )}
                    <input type="number" min="0" value={newRule.min_price} onChange={e => setNewRule(r => ({ ...r, min_price: e.target.value }))} title={t("priceOpt.minPriceHint", "절대 최소가(원가마진 하한 위 추가 가드, 0=미설정)")} placeholder={t("priceOpt.minPrice", "최소가")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 90 }} />
                    <input type="number" min="0" value={newRule.max_price} onChange={e => setNewRule(r => ({ ...r, max_price: e.target.value }))} title={t("priceOpt.maxPriceHint", "절대 최대가(0=미설정)")} placeholder={t("priceOpt.maxPrice", "최대가")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 90 }} />
                    <input type="number" min="0" value={newRule.comp_max_age_hours} onChange={e => setNewRule(r => ({ ...r, comp_max_age_hours: e.target.value }))} title={t("priceOpt.compAgeHint", "경쟁가 최대 허용 나이(시간) — 더 오래된 경쟁가는 리프라이싱 제외(stale 방지). 0=무제한")} placeholder={t("priceOpt.compAge", "신선도h")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 80 }} />
                    <button onClick={createRule} disabled={creating} style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: creating ? "default" : "pointer", fontWeight: 800, fontSize: 12, background: creating ? "#cbd5e1" : "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff" }}>{creating ? "…" : "+ " + t("priceOpt.addRule", "규칙 추가")}</button>
                    {newRule.mode === 'elasticity' && <span style={{ fontSize: 11, color: "#94a3b8" }}>{t("priceOpt.mlHint", "실주문 데이터가 쌓이면 수요탄력성으로 이익최대 가격을 자동 산출합니다.")}</span>}
                </div>
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
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(40px,60px) minmax(70px,130px) repeat(3,minmax(46px,80px)) minmax(50px,1fr)", gap: 8, padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#7c8fa8", background: '#ffffff' }}>
                        <span>{t('priceOpt.labelTime')}</span><span>{t('priceOpt.labelSku')}</span><span>{t('priceOpt.labelChannel')}</span><span>{t("priceOpt.currentPrice")}</span><span>{t("priceOpt.optimalPrice")}</span><span>{t("priceOpt.expectedMargin")}</span>
                    </div>
                    {history.length === 0 && <div className="sub" style={{ padding: 16, fontSize: 12, textAlign: 'center' }}>{t("priceOpt.noAnalysis")}</div>}
                    {history.map((h, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(40px,60px) minmax(70px,130px) repeat(3,minmax(46px,80px)) minmax(50px,1fr)", gap: 8, padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 11, alignItems: "center" }}>
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
    // 184차 #5: enterprise 패턴 렌더러(CRM/OmniChannel 정본 동일, NS=priceOpt).
    const { t } = useI18n();
    const g = (k) => { const v = t('priceOpt.' + k, ''); return (v && !String(v).includes('priceOpt.')) ? v : ''; };
    const COLORS = ['#4f8ef7','#22c55e','#f59e0b','#a855f7','#6366f1','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48','#06b6d4','#0ea5e9','#f97316'];
    const ICONS = ['📦','📈','🎯','🧪','🔀','💰','🔍','⚡','📅','🔄','📊','🛡️','📦','🔔','🚀'];
    const steps = [];
    for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[i - 1], color: COLORS[(i - 1) % COLORS.length], n: i }); }
    const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
    const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
    const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
    const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
    const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#eef2ff,#fae8ff)", borderRadius: 16, border: "1px solid #e0d7ff", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💲</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('priceOpt.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('priceOpt.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
                </div>}
            </div>
            {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
            {g('guideAudienceTitle') ? <div style={card}><div style={secTitle}>👥 {g('guideAudienceTitle')}</div><div style={pre}>{g('guideAudienceDesc')}</div></div> : null}
            {steps.length > 0 && <div style={card}>
                {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {steps.map((s) => (
                        <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>}
            {tips.length > 0 && (
                <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
                    <div style={secTitle}>💡 {t('priceOpt.guideTipsTitle')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#ffffff", border: "1px solid rgba(34,197,94,0.12)" }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, WebkitTextFillColor: '#374151' }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {faqs.length > 0 && (
                <div style={card}>
                    <div style={secTitle}>❓ {g('guideFaqTitle') || t('priceOpt.guideFaqTitle', '자주 묻는 질문')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {faqs.map((f, i) => (
                            <div key={i} style={{ padding: '12px 14px', background: 'rgba(241,245,249,0.6)', borderRadius: 10, border: '1px solid #eef2f7' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#4f8ef7', marginBottom: 5, WebkitTextFillColor: '#4f8ef7' }}>Q. {f.q}</div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>A. {f.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}><div style={secTitle}>🛡️ {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
            {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🗓️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
            {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyTitle')}</div>
                <div style={{ fontSize: 13, color: '#374151', maxWidth: 640, margin: '8px auto 0', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>{g('guideReadyDesc')}</div>
            </div> : null}
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

    /* [270차 정리] genie_price_opt_sync 수신자 제거 — 발신자 부재(전 코드베이스 0)로 영원히 미발화하던 死코드.
       크로스탭 가격/상품 갱신은 이미 genie_product_sync(PRODUCT_UPDATE) 수신으로 커버됨(중복). */

    /* ── BroadcastChannel: Listen for connector hub changes ── */
    useEffect(() => {
        const bc = new BroadcastChannel(tChannelName('genie_connector_sync'));
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
                {/* [현 차수] 특정상품 조회 — 전역 동기화(타 메뉴와 동일 상품 컨텍스트). 선택 시 그 상품 매출·순이익·채널/국가별 인라인. */}
                <ProductSelectBar />
                <ProductMarketingPanel period="monthly" />
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
