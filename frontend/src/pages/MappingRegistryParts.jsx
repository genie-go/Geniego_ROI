import React, { useState, useCallback } from "react";
import { useT } from '../i18n/index.js';

/* ── LocalStorage Hook ── */
function useLS(key, def) {
    const [d, setD] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } });
    const save = useCallback(v => { setD(v); localStorage.setItem(key, JSON.stringify(v)); }, [key]);
    const reset = useCallback(() => { save(def); try { localStorage.removeItem('genie_pf'); localStorage.removeItem('genie_ded'); } catch {} }, [save, def]);
    return [d, save, reset];
}

const DEF_PF = [];
const DEF_DED = [];
const PC = { SELLER: "#ef4444", PLATFORM: "#22c55e", SHARED: "#eab308" };
const genId = () => "d" + Date.now().toString(36);

const Badge = ({ label, color }) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "1a", color, border: `1px solid ${color}33` }}>{label}</span>
);
const iS = { padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "rgba(9,15,30,0.5)", color: '#fff', fontSize: 11, width: "100%", boxSizing: "border-box" };

const ROLLUP = {
    meta: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    google: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    tiktok: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    naver: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    coupang: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    shopee: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
};

function calcKPI(pid, deds) {
    const R = ROLLUP[pid]; if (!R) return null;
    const rev = R.rev, spend = R.spend;
    let sellerDed = 0;
    deds.filter(d => d.pid === pid).forEach(d => {
        const base = d.base === "spend" ? spend : rev;
        const share = d.payer === "SELLER" ? 1 : d.payer === "PLATFORM" ? 0 : (d.sp / 100);
        sellerDed += base * (d.pct / 100) * share;
    });
    const cogs = rev * (R.cogs_pct / 100);
    const retLoss = R.orders * (R.return_rate / 100) * 7000;
    const gp = rev - sellerDed - cogs - retLoss - spend;
    const roas = spend > 0 ? rev / spend : 0;
    const margin = rev > 0 ? (gp / rev) * 100 : 0;
    return { roas, margin, gp, sellerDed, rev, spend };
}

function getPL(t) {
    return { SELLER: t('mr.dedSellerBurden'), PLATFORM: t('mr.dedPlatformBurden'), SHARED: t('mr.dedShared') };
}

function getCats(t) {
    return [
        { key: "Commission", label: t('mr.dedCatCommission') },
        { key: "Settlement", label: t('mr.dedCatSettlement') },
        { key: "Tax", label: t('mr.dedCatTax') },
        { key: "Promotion", label: t('mr.dedCatPromotion') },
        { key: "Shipping", label: t('mr.dedCatShipping') },
    ];
}

/* Stub components - original backed up to pages_backup */
function PlatformTab() {
    return (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>시스템 점검 중</div>
        </div>
    );
}

function DeductionTab() {
    return (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>시스템 점검 중</div>
        </div>
    );
}

export { PlatformTab, DeductionTab, calcKPI, ROLLUP, DEF_PF, DEF_DED, Badge, iS, PC, getPL, getCats, useLS };
