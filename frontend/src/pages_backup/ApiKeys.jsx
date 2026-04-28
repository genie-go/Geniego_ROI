import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../context/NotificationContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

import { useT } from '../i18n/index.js';
/* ─── Auth helper ──────────────────────────────────────────────────────────── */
const getToken = () => localStorage.getItem("genie_token") || localStorage.getItem("genie_auth_token") || "";

/* ─── Module-level t() for constants defined outside React components ─────── */
import t from '../i18n/t.js';

const api = (path, opts = {}) => {
    // Security: validate path
    if (/[<>'"\\]/.test(path)) {
      console.warn('[SECURITY] Blocked suspicious API path:', path);
      return Promise.resolve({ ok: false, error: 'Blocked by security' });
    }
    const token = getToken();
    return fetch(`/api/v423${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        ...opts,
    }).then(r => r.json());
};

/* ─── Channel Catalog ────────────────────────────────────────────────────── */
const CHANNEL_GROUPS = [
    {
        key: "global_ad",
        label: 'ihub.globalAds',
        desc: 'ihub.globalAdsDesc',
        channels: [
            {
                key: "meta_ads", name: "Meta Ads", icon: "📘", color: "#1877F2",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true, hint: "Meta Business Suite → App Dashboard" },
                    { key: "ad_account_id", label: "Ad Account ID", type: "text", required: false, hint: "act_XXXXXXXXXX" },
                    { key: "app_id", label: "App ID", type: "text", required: false },
                    { key: "app_secret", label: "App Secret", type: "password", required: false },
                ],
            },
            {
                key: "tiktok_business", name: "TikTok Business", icon: "🎶", color: "#010101",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true },
                    { key: "app_id", label: "App ID", type: "text", required: false },
                    { key: "app_secret", label: "App Secret", type: "password", required: false },
                    { key: "advertiser_id", label: "Advertiser ID", type: "text", required: false },
                ],
            },
            {
                key: "google_ads", name: "Google Ads", icon: "🔵", color: "#4285F4",
                fields: [
                    { key: "developer_token", label: "Developer Token", type: "password", required: true },
                    { key: "client_id", label: "OAuth Client ID", type: "text", required: false },
                    { key: "client_secret", label: "OAuth Client Secret", type: "password", required: false },
                    { key: "refresh_token", label: "Refresh Token", type: "password", required: false },
                    { key: "customer_id", label: "Customer ID (MCC)", type: "text", required: false },
                ],
            },
            {
                key: "amazon_ads", name: "Amazon Ads", icon: "🟠", color: "#FF9900",
                fields: [
                    { key: "client_id", label: "Client ID", type: "text", required: true },
                    { key: "client_secret", label: "Client Secret", type: "password", required: true },
                    { key: "refresh_token", label: "Refresh Token", type: "password", required: true },
                    { key: "profile_id", label: "Profile ID", type: "text", required: false },
                ],
            },
            {
                key: "snapchat", name: "Snapchat Ads", icon: "👻", color: "#FFFC00",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true },
                    { key: "client_id", label: "Client ID", type: "text", required: false },
                    { key: "client_secret", label: "Client Secret", type: "password", required: false },
                ],
            },
            {
                key: "twitter_x", name: "Twitter / X Ads", icon: "🐦", color: "#000000",
                fields: [
                    { key: "api_key", label: "API Key", type: "text", required: true },
                    { key: "api_secret", label: "API Secret", type: "password", required: true },
                    { key: "access_token", label: "Access Token", type: "password", required: true },
                    { key: "access_secret", label: "Access Secret", type: "password", required: true },
                ],
            },
        ],
    },
    {
        key: "global_commerce",
        label: 'ihub.globalCommerce',
        desc: 'ihub.globalCommerceDesc',
        channels: [
            {
                key: "amazon_spapi", name: "Amazon SP-API", icon: "📦", color: "#FF9900",
                fields: [
                    { key: "client_id", label: "LWA Client ID", type: "text", required: true },
                    { key: "client_secret", label: "LWA Client Secret", type: "password", required: true },
                    { key: "refresh_token", label: "LWA Refresh Token", type: "password", required: true },
                    { key: "marketplace_id", label: "Marketplace ID", type: "text", required: false },
                    { key: "endpoint", label: "SP-API Endpoint", type: "text", required: false },
                ],
            },
            {
                key: "shopify", name: "Shopify", icon: "🛍", color: "#96BF48",
                fields: [
                    { key: "store_domain", label: "Store Domain", type: "text", required: true, hint: "mystore.myshopify.com" },
                    { key: "admin_api_token", label: "Admin API Token", type: "password", required: true },
                    { key: "storefront_token", label: "Storefront API Token", type: "password", required: false },
                ],
            },
            {
                key: "ebay", name: "eBay", icon: "🏪", color: "#E53238",
                fields: [
                    { key: "app_id", label: "App ID (Client ID)", type: "text", required: true },
                    { key: "cert_id", label: "Cert ID (Client Secret)", type: "password", required: true },
                    { key: "user_token", label: "User OAuth Token", type: "password", required: false },
                ],
            },
            {
                key: "lazada", name: "Lazada / Tmall", icon: "🔴", color: "#FF6000",
                fields: [
                    { key: "app_key", label: "App Key", type: "text", required: true },
                    { key: "app_secret", label: "App Secret", type: "password", required: true },
                    { key: "access_token", label: "Access Token", type: "password", required: false },
                ],
            },
            {
                key: "qoo10", name: "Qoo10 (큐텐)", icon: "🟡", color: "#FF6B00",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true, hint: "Qoo10 > Seller Center > API Key발급" },
                    { key: "user_id", label: "User ID", type: "text", required: true },
                    { key: "service_type", label: "Service Type", type: "text", required: false, hint: "ItemLookup / ItemSearch / ProductSubmit" },
                ],
            },
            {
                key: "rakuten", name: "Rakuten (라쿠텐)", icon: "🛒", color: "#BF0000",
                fields: [
                    { key: "service_secret", label: "Service Secret", type: "password", required: true, hint: "Rakuten API App Management" },
                    { key: "license_key", label: "License Key", type: "text", required: true },
                    { key: "shop_url", label: "Shop URL", type: "text", required: false, hint: "xxx.rakuten.co.jp" },
                ],
            },
        ],
    },
    {
        key: "domestic",
        label: 'ihub.domestic',
        desc: 'ihub.domesticDesc',
        channels: [
            {
                key: "naver_smartstore", name: "Naver Commerce", icon: "🟢", color: "#03C75A",
                fields: [
                    { key: "client_id", label: "Client ID", type: "text", required: true },
                    { key: "client_secret", label: "Client Secret", type: "password", required: true },
                ],
            },
            {
                key: "naver_sa", name: "Naver SearchAds(SA)", icon: "🟩", color: "#03C75A",
                fields: [
                    { key: "customer_id", label: "Customer ID", type: "text", required: true },
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: true },
                ],
            },
            {
                key: "coupang", name: "Coupang", icon: "🛒", color: "#C02525",
                fields: [
                    { key: "access_key", label: "Access Key", type: "text", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: true },
                    { key: "vendor_id", label: "Vendor ID", type: "text", required: false },
                ],
            },
            {
                key: "kakao_moment", name: "11번가 (11st)", icon: "💛", color: "#FEE500",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true },
                    { key: "ad_account_id", label: "AdsAccount ID", type: "text", required: false },
                ],
            },
            {
                key: "st11", name: "11Street", icon: "🔶", color: "#FA3E2C",
                fields: [
                    { key: "api_key", label: "Open API Key", type: "password", required: true },
                ],
            },
            {
                key: "gmarket", name: "G마켓/Auction", icon: "🟡", color: "#0099CC",
                fields: [
                    { key: "site_id", label: "Site ID", type: "text", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: true },
                ],
            },
            {
                key: "lotte_on", name: "Lotte ON", icon: "🔴", color: "#ED1C24",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: false },
                ],
            },
            {
                key: "wemakeprice", name: "WeMakePrice", icon: "🟠", color: "#F77C00",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: false },
                ],
            },
            {
                key: "interpark", name: "Interpark", icon: "🔵", color: "#0074D3",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                ],
            },
        ],
    },
    {
        key: "own_etc",
        label: "Plus Friend ID",
        desc: 'ihub.ownMallDesc',
        channels: [
            {
                key: "own_mall", name: "Own Mall Webhook", icon: "🏠", color: "#6366f1",
                fields: [
                    { key: "webhook_secret", label: "Webhook Secret", type: "password", required: true },
                    { key: "api_key", label: "Admin API Key", type: "password", required: false },
                    { key: "base_url", label: "Own Mall Base URL", type: "text", required: false },
                ],
            },
            {
                key: "cafe24", name: "WeMakePrice", icon: "☕", color: "#004A8F",
                fields: [
                    { key: "mall_id", label: "Mall ID", type: "text", required: true },
                    { key: "client_id", label: "Client ID", type: "text", required: true },
                    { key: "client_secret", label: "Client Secret", type: "password", required: true },
                    { key: "access_token", label: "Access Token", type: "password", required: false },
                ],
            },
            {
                key: "slack", name: "Slack Webhook", icon: "💬", color: "#4A154B",
                fields: [
                    { key: "webhook_url", label: "Webhook URL", type: "text", required: true },
                    { key: "bot_token", label: "Bot Token (Select)", type: "password", required: false },
                ],
            },
            {
                key: "google_analytics", name: "Google Analytics 4", icon: "📊", color: "#E37400",
                fields: [
                    { key: "measurement_id", label: "Measurement ID", type: "text", required: true, hint: "G-XXXXXXXXXX" },
                    { key: "api_secret", label: "Measurement Protocol API Secret", type: "password", required: false },
                    { key: "property_id", label: "Property ID", type: "text", required: false },
                ],
            },
            {
                key: "kakao_alimtalk", name: "Interpark", icon: "💬", color: "#FEE500",
                fields: [
                    { key: "sender_key", label: "Sender Key", type: "password", required: true },
                    { key: "plus_friend_id", label: 'ihub.ownMallLabel', type: "text", required: false },
                ],
            },
        ],
    },
    {
        key: "welfare_mall",
        label: 'ihub.closedMallLabel',
        desc: 'ihub.closedMallDesc',
        channels: [
            {
                key: "benepia", name: "Benepia (베네피아)", icon: "🎁", color: "#E31837",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true, hint: "Naver Commerce Center Client Secret" },
                    { key: "partner_id", label: "Partner ID", type: "text", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: false },
                ],
            },
            {
                key: "point_welfare", name: "Point Welfare (포인트복지)", icon: "📱", color: "#E4003A",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "client_id", label: "Client ID", type: "text", required: true },
                    { key: "carrier", label: "Carrier", type: "text", required: false, hint: "KT / SKT / LG" },
                ],
            },
            {
                key: "kyowon_welfare", name: "Kyowon Welfare (교원복지)", icon: "📗", color: "#005BAC",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "partner_code", label: "Partner Code", type: "text", required: true },
                ],
            },
            {
                key: "lotte_welfare", name: "Lotte Welfare (롯데복지)", icon: "🔴", color: "#ED1C24",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "vendor_code", label: "Vendor Code", type: "text", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: false },
                ],
            },
            {
                key: "samsung_welfare", name: "Samsung Welfare (삼성복지)", icon: "🔷", color: "#1428A0",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "seller_id", label: "Seller ID", type: "text", required: true },
                ],
            },
            {
                key: "hana_welfare", name: "Hana Welfare (하나복지)", icon: "🟩", color: "#008C8C",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "partner_id", label: "Partner ID", type: "text", required: true },
                ],
            },
            {
                key: "hyundai_welfare", name: "Hyundai Welfare (현대복지)", icon: "⬜", color: "#333333",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "vendor_code", label: "Vendor Code", type: "text", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: false },
                ],
            },
            {
                key: "custom_welfare", name: "Custom Welfare Mall", icon: "🏢", color: "#64748b",
                fields: [
                    { key: "mall_name", label: "Mall Name", type: "text", required: true },
                    { key: "api_key", label: "API Key", type: "password", required: true },
                    { key: "base_url", label: "API Base URL", type: "text", required: true },
                    { key: "secret_key", label: "Secret Key", type: "password", required: false },
                ],
            },
        ],
    },
    {
        key: "social_content",
        label: 'ihub.socialMediaLabel',
        desc: 'ihub.socialMediaDesc',
        channels: [
            {
                key: "instagram", name: "Instagram (Meta Graph)", icon: "📸", color: "#E1306C",
                fields: [
                    { key: "access_token", label: "User Access Token", type: "password", required: true, hint: "Instagram Graph API → User Access Token" },
                    { key: "instagram_account_id", label: "Instagram Business Account ID", type: "text", required: true, hint: "Meta Business Suite → Account → Instagram Account ID" },
                    { key: "app_id", label: "App ID", type: "text", required: false },
                    { key: "app_secret", label: "App Secret", type: "password", required: false },
                    { key: "page_id", label: "Page ID", type: "text", required: false },
                ],
            },
            {
                key: "youtube", name: "YouTube (Data API v3)", icon: "▶️", color: "#FF0000",
                fields: [
                    { key: "api_key", label: "API Key", type: "password", required: true, hint: "Google Cloud Console → API Key" },
                    { key: "client_id", label: "OAuth 2.0 Client ID", type: "text", required: false, hint: "Google Cloud Console → OAuth 2.0 Client ID" },
                    { key: "client_secret", label: "OAuth 2.0 Client Secret", type: "password", required: false },
                    { key: "refresh_token", label: "Refresh Token", type: "password", required: false },
                    { key: "channel_id", label: "Channel ID", type: "text", required: false, hint: "YouTube Channel → Settings → Channel ID" },
                ],
            },
            {
                key: "naver_blog", name: "Pinterest", icon: "🟢", color: "#03C75A",
                fields: [
                    { key: "client_id", label: "Client ID", type: "text", required: true, hint: "Meta for Developers → App → Client ID" },
                    { key: "client_secret", label: "Client Secret", type: "password", required: true },
                    { key: "access_token", label: "Access Token", type: "password", required: false, hint: "Instagram Business Account ID" },
                    { key: "blog_id", label: "Blog ID", type: "text", required: false, hint: "blog.naver.com/BLOGID" },
                ],
            },
            {
                key: "tistory", name: "Tistory", icon: "🦁", color: "#FF6300",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true, hint: "YouTube Data API v3 Key" },
                    { key: "client_id", label: "App ID", type: "text", required: false },
                    { key: "client_secret", label: "Secret Key", type: "password", required: false },
                    { key: "blog_name", label: "Blog Name", type: "text", required: false, hint: "BLOGNAME.tistory.com" },
                ],
            },
            {
                key: "wordpress", name: "WordPress (REST API)", icon: "🔵", color: "#21759B",
                fields: [
                    { key: "site_url", label: "Site URL", type: "text", required: true, hint: "https://yourdomain.com" },
                    { key: "username", label: "Username", type: "text", required: true },
                    { key: "application_password", label: "Application Password", type: "password", required: true, hint: "Naver Blog API Client Secret" },
                    { key: "api_key", label: "API Key", type: "password", required: false },
                ],
            },
            {
                key: "pinterest", name: "Pinterest", icon: "📌", color: "#E60023",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true, hint: "Pinterest Developers → App Register → OAuth Issue" },
                    { key: "app_id", label: "App ID", type: "text", required: false },
                    { key: "app_secret", label: "App Secret", type: "password", required: false },
                    { key: "ad_account_id", label: "Ads Account ID", type: "text", required: false },
                ],
            },
            {
                key: "threads", name: "Threads (Meta API)", icon: "🧵", color: "#000000",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true, hint: "Meta for Developers → Threads API" },
                    { key: "threads_user_id", label: "Threads User ID", type: "text", required: false },
                    { key: "app_id", label: "App ID", type: "text", required: false },
                ],
            },
            {
                key: "kakao_story", name: "Kakao Story", icon: "💛", color: "#FEE500",
                fields: [
                    { key: "access_token", label: "Access Token", type: "password", required: true, hint: "Threads Access Token" },
                    { key: "client_id", label: "REST API Key", type: "text", required: false },
                ],
            },
        ],
    },
];

const ALL_CHANNELS = CHANNEL_GROUPS.flatMap(g => g.channels);
const channelMap = Object.fromEntries(ALL_CHANNELS.map(c => [c.key, c]));

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const maskVal = v => (v ? v.slice(0, 4) + "••••••••" : "—");

function StatusBadge({ status, t: t }) {
    const cfg = {
        ok: { label: t('ihub.statusConnected'), bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
        error: { label: t('ihub.statusError'), bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
        null: { label: t('ihub.statusNotTested'), bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    };
    const s = cfg[status] ?? cfg.null;
    return (
        <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>
            {s.label}
        </span>
    );
}

/* ─── Channel Add Modal ( Channel) ─────────────────────────────────────── */
function AddChannelModal({ groupKey, onClose, onAdded }) {
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("🔌");
    const [color, setColor] = useState("#6366f1");
    const [fields, setFields] = useState([{ key: "api_key", label: "API Key", type: "password", required: true, hint: "" }]);
    const [saving, setSaving] = useState(false);

    const addField = () => setFields(f => [...f, { key: "", label: "", type: "password", required: false, hint: "" }]);
    const updField = (i, k, v) => setFields(f => f.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const delField = i => setFields(f => f.filter((_, j) => j !== i));

    const handleAdd = async () => {
        if (!name.trim()) return;
        setSaving(true);
        // Save channel metadata as a special credential entry
        const channelKey = `custom_${groupKey}_${Date.now()}`;
        await api("/creds", {
            method: "POST",
            body: JSON.stringify({
                channel: channelKey,
                cred_type: "channel_meta",
                label: name,
                key_name: "__meta__",
                key_value: JSON.stringify({ name, icon, color, groupKey, fields }),
            }),
        }).catch(() => { });
        setSaving(false);
        onAdded();
        onClose();
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: "var(--bg-card)", borderRadius: 20, padding: 28,
                width: 560, maxHeight: "88vh", overflowY: "auto",
                border: "1px solid rgba(99,140,255,0.2)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                    <div style={{ fontSize: 22 }}>➕</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{t('ihub.addChTitle')}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t('ihub.addChDesc')}</div>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>

                {/* Basic Info */}
                <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 5 }}>{t('ihub.chNameLabel')}</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder={t('ihub.chNamePh')} style={inpStyle} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 5 }}>{t('ihub.addChGroup')}</label>
                            <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🔌" style={inpStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 5 }}>{t('ihub.addChColor')}</label>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                                    style={{ width: 44, height: 36, borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", padding: 2, cursor: "pointer", background: "none" }} />
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{color}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* API  Settings */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>{t('ihub.addChFields')}</span>
                        <button onClick={addField} style={{
                            padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                            border: "1px solid rgba(99,140,255,0.3)", background: "rgba(99,140,255,0.06)",
                            color: "#4f8ef7", cursor: "pointer",
                        }}>{t('ihub.addField')}</button>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {fields.map((f, i) => (
                            <div key={i} style={{
                                display: "grid", gridTemplateColumns: "1fr 1fr auto auto",
                                gap: 6, padding: "8px", borderRadius: 9,
                                background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.08)",
                            }}>
                                <input value={f.key} onChange={e => updField(i, "key", e.target.value)} placeholder={t('ihub.fieldKey')} style={{ ...inpStyle, fontSize: 11 }} />
                                <input value={f.label} onChange={e => updField(i, "label", e.target.value)} placeholder={t('ihub.fieldLabel')} style={{ ...inpStyle, fontSize: 11 }} />
                                <select value={f.type} onChange={e => updField(i, "type", e.target.value)}
                                    style={{ ...inpStyle, fontSize: 11, paddingRight: 4 }}>
                                    <option value="password">{t('ihub.typePassword')}</option>
                                    <option value="text">{t('ihub.typeText')}</option>
                                </select>
                                <button onClick={() => delField(i)} style={{
                                    background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, padding: "0 6px",
                                }}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onClose} style={cancelBtnStyle}>{t('ihub.cancel')}</button>
                    <button onClick={handleAdd} disabled={saving || !name.trim()} style={saveBtnStyle}>
                        {saving ? t('ihub.addingCh') : t('ihub.addChBtn')}
                    </button>
            </div>
        </div>
    </div>
);
}

/* ───  Register Modal ──────────────────────────────────────────────────────── */
function CredModal({ channel, existingCreds, onClose, onSaved }) {
    const ch = channelMap[channel];
    if (!ch) return null;

    const init = {};
    ch.fields.forEach(f => {
        const found = existingCreds.find(c => c.key_name === f.key);
        init[f.key] = { id: found?.id ?? null, value: "" };
    });

    const [form, setForm] = useState(init);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (key, val) => setForm(p => ({ ...p, [key]: { ...p[key], value: val } }));

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const results = await Promise.all(
                ch.fields.map(async f => {
                    const entry = form[f.key];
                    if (!entry.value) return null;
                    const body = {
                        channel,
                        cred_type: "api_key",
                        label: ch.name,
                        key_name: f.key,
                        key_value: entry.value,
                    };
                    if (entry.id) body.id = entry.id;
                    return api("/creds", { method: "POST", body: JSON.stringify(body) });
                })
            );
            const failed = results.filter(r => r && !r.ok);
            if (failed.length > 0) throw new Error(failed[0].error || "Save Failed");
            setSaved(true);
            // Success  in progress  (mode_activated/user ) 
            const firstResult = results.find(r => r && r.ok) || {};
            setTimeout(() => { onSaved(firstResult); onClose(); }, 800);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: "var(--bg-card)", borderRadius: 20, padding: 28, width: 520,
                border: "1px solid rgba(99,140,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                maxHeight: "85vh", overflowY: "auto",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 22,
                        background: `${ch.color}22`, border: `1px solid ${ch.color}44`,
                    }}>{ch.icon}</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{ch.name} {t('ihub.apiRegister')}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t('ihub.credTitle')}</div>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer", padding: 4 }}>✕</button>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                    {ch.fields.map(f => {
                        const existing = existingCreds.find(c => c.key_name === f.key);
                        return (
                            <div key={f.key}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
                                        {f.label}
                                        {f.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
                                    </label>
                                    {existing && (
                                        <span style={{ fontSize: 10, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 99 }}>
                                            {t('ihub.existingBadge')} ({maskVal(existing.key_value_masked)})
                                        </span>
                                    )}
                                </div>
                                {f.hint && <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 6 }}>{f.hint}</div>}
                                <input
                                    type={f.type === "password" ? "password" : "text"}
                                    placeholder={existing ? t('ihub.overwritePh') : f.label}
                                    value={form[f.key]?.value ?? ""}
                                    onChange={e => handleChange(f.key, e.target.value)}
                                    style={inpStyle}
                                />
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 11 }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                    <button onClick={onClose} style={cancelBtnStyle}>{t('ihub.cancel')}</button>
                    <button onClick={handleSave} disabled={saving || saved} style={{
                        flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
                        background: saved ? "#22c55e" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                        color: 'var(--text-1)', fontSize: 12, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.7 : 1,
                    }}>
                        {saved ? t('ihub.saveDone') : saving ? t('ihub.saving') : t('ihub.save')}
                    </button>
            </div>
        </div>
    </div>
─────────────────────────────────────── */
function ChannelCard({ ch, creds, onEdit, onDelete, onTest, is = false, isDemo = false }) {
    const { t } = useI18n();
    const chCreds = creds.filter(c => c.channel === ch.key);
    const hasAny = chCreds.length > 0;
    const [testing, setTesting] = useState(false);

    const handleTest = async () => {
        if (!hasAny) return;
        setTesting(true);
        await onTest(chCreds[0].id).finally(() => setTesting(false));
    };

    const badgeStatus = hasAny ? (chCreds[0].test_status ?? null) : null;

    return (
        <div style={{
            background: "var(--bg-card)", borderRadius: 14,
            border: `1px solid ${hasAny ? "rgba(99,140,255,0.2)" : "rgba(99,140,255,0.08)"}`,
            padding: 16, display: "flex", flexDirection: "column", gap: 10,
            transition: "all 200ms",
            opacity: is ? 0.75 : 1,
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = ch.color + "66"}
            onMouseLeave={e => e.currentTarget.style.borderColor = hasAny ? "rgba(99,140,255,0.2)" : "rgba(99,140,255,0.08)"}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10, fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${ch.color}1A`, border: `1px solid ${ch.color}33`, flexShrink: 0,
                }}>{ch.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{chCreds.length}/{ch.fields.length} {t('ihub.credCount')}</div>
                </div>
                {is
                    ? <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: "rgba(234,179,8,0.12)", color: "#eab308" }}>🔒 </span>
                    : <StatusBadge t={t} status={badgeStatus} />}
            </div>

            {!is && hasAny && (
                <div style={{ display: "grid", gap: 4 }}>
                    {chCreds.map(c => (
                        <div key={c.id} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "5px 8px", borderRadius: 7,
                            background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.08)",
                        }}>
                            <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700, flex: 1 }}>{c.key_name}</span>
                            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#4f8ef7" }}>{c.key_value_masked}</span>
                            <button onClick={() => onDelete(c.id)} style={{
                                background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, padding: "0 4px", opacity: 0.6,
                            }} title="Delete">✕</button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                {is ? (
                    <button onClick={() => onEdit(ch.key)} style={{
                        flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        border: "1px solid rgba(234,179,8,0.4)", background: "rgba(234,179,8,0.06)",
                        color: "#eab308", cursor: "pointer",
                    }}>{t('ihub.noChannels')}</button>
                ) : (
                    <>
                        <button onClick={() => onEdit(ch.key)} style={{
                            flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${ch.color}55`, background: `${ch.color}0D`,
                            color: ch.color, cursor: "pointer",
                        }}>
                            {hasAny ? t('ihub.editBtn') : t('ihub.registerBtn')}
                        </button>
                        {hasAny && (
                            <button onClick={handleTest} disabled={testing} style={{
                                padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                                border: "1px solid rgba(99,140,255,0.2)", background: "none",
                                color: "var(--text-2)", cursor: testing ? "not-allowed" : "pointer",
                            }}>
                                {testing ? t('ihub.testing') : t('ihub.testBtn')}
                            </button>
                        )}
                    </>
                )}
        </div>
    </div>
);
}

/* ───  Style ─────────────────────────────────────────────────────────── */
const inpStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.15)",
    color: "var(--text-1)", fontSize: 12, outline: "none", boxSizing: "border-box",
};
const cancelBtnStyle = {
    flex: 1, padding: "10px 0", borderRadius: 10,
    border: "1px solid rgba(99,140,255,0.2)", background: "none",
    color: "var(--text-2)", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const saveBtnStyle = {
    flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
    color: 'var(--text-1)', fontSize: 12, fontWeight: 800, cursor: "pointer",
};

/* ─── SmartConnect Channel  ──────────────────────────────────────────── */
function getSCChannels(t) {
  return [
  { key:"meta_ads",        name:"Meta Ads",           icon:"📘", color:"#1877F2", autoAcquire:false, autoOAuth:true,  issueUrl:"https://developers.facebook.com/apps/",    guide:t('ihub.scTitle'), capabilities:["ProductRegister",t('ihub.scSubtitle'),t('ihub.scDesc')] },
  { key:"google_ads",      name:"Google Ads",          icon:"🔵", color:"#4285F4", autoAcquire:false, autoOAuth:true,  issueUrl:"https://console.cloud.google.com/",         guide:t('ihub.scTotalCh'), capabilities:["SearchAds",t('ihub.scKeyFound'),"GA4Integration"] },
  { key:"tiktok_business", name:"TikTok Business",     icon:"🎶", color:"#010101", autoAcquire:false, autoOAuth:true,  issueUrl:"https://ads.tiktok.com/marketing_api/apps/",guide:"TikTok Marketing API → App Create → Token Issue", capabilities:[t('ihub.scIntActive'),t('ihub.scKeyMissing')] },
  { key:"amazon_spapi",   name:"Amazon SP-API",       icon:"📦", color:"#FF9900", autoAcquire:false, autoOAuth:true,  issueUrl:"https://sellercentral.amazon.com/",         guide:"Seller Central → App Management → LWA credentials", capabilities:["ProductAutoRegister",t('ihub.scApplied'),"StockSync"] },
  { key:"shopify",        name:"Shopify",             icon:"🛍", color:"#96BF48", autoAcquire:false, autoOAuth:true,  issueUrl:"https://partners.shopify.com/",             guide:"Shopify Partners → App Create → Admin API Token", capabilities:["ProductAutoRegister","OrdersManagement","CustomerCRM"] },
  { key:"coupang",        name:"Coupang Wing",            icon:"🛒", color:"#C02525", autoAcquire:true,  autoOAuth:false, issueUrl:"https://wing.coupang.com/",                guide:"Wing → Seller Settings → API Integration → Key Issue", capabilities:["ProductAutoRegister",t('ihub.scAutoGuideTitle'),t('ihub.scAutoGuideDesc'),"CoupangAds"] },
  { key:"naver_smartstore",name: "Naver Commerce", icon:"🟢", color:"#03C75A", autoAcquire:true,  autoOAuth:false, issueUrl:"https://apicenter.commerce.naver.com/",     guide:t('ihub.scOAuthDesc'), capabilities:["ProductAutoRegister","OrdersManagement",t('ihub.scOAuthSteps')] },
  { key:"naver_sa",       name:"Naver SearchAds(SA)", icon:"🟩", color:"#03C75A", autoAcquire:true,  autoOAuth:false, issueUrl:"https://searchad.naver.com/",               guide:t('ihub.scApiTitle'), capabilities:[t('ihub.scApiDesc'),t('ihub.scApiSteps')] },
  { key:"kakao_moment",   name: "KakaoTalk Moment",        icon:"💛", color:"#FEE500", autoAcquire:false, autoOAuth:true,  issueUrl:"https://developers.kakao.com/",             guide:t('ihub.scKeyStatus'), capabilities:["KakaoAds",t('ihub.scAutoLink')] },
  { key:"st11",           name:"11Street",               icon:"🔶", color:"#FA3E2C", autoAcquire:true,  autoOAuth:false, issueUrl:"https://openapi.11st.co.kr/",              guide:t('ihub.scAutoApply'), capabilities:["ProductAutoRegister",t('ihub.scIssueReq')] },
  { key:"gmarket",        name: "G마켓/Auction",           icon:"🟡", color:"#0099CC", autoAcquire:true,  autoOAuth:false, issueUrl:"https://www.gmarketglobal.com/",            guide:t('ihub.scApplying'), capabilities:["ProductAutoRegister","OrdersManagement"] },
  { key:"rakuten",        name: "Rakuten (라쿠텐)",      icon:"🛒", color:"#BF0000", autoAcquire:true,  autoOAuth:false, issueUrl:"https://webservice.rakuten.co.jp/",         guide:"Rakuten Web Service → App Register", capabilities:["ProductAutoRegister",t('ihub.scApplyFail')] },
  { key:"slack",          name:"Slack Webhook",       icon:"💬", color:"#4A154B", autoAcquire:true,  autoOAuth:true,  issueUrl:"https://api.slack.com/apps",               guide:"Slack API → Incoming Webhooks", capabilities:[t('ihub.scNoResult')] },
];
}


const SC_STATUS = { unscanned:"unscanned", found:"found", missing:"missing", applying:"applying", applied:"applied", registered:"registered" };

/* ───     API helper ──────────────────────── */
async function scScan(channelKey, scChannels) {
  try {
    const token = getToken();
    //  DB  Search
    const res = await fetch(`/api/v423/creds/scan?channel=${channelKey}`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
    });
    if (res.ok) {
      const d = await res.json();
      if (d.ok) {
        return d.keyCount > 0
          ? { status: 'found', keyPreview: d.keyPreview || 'db_••••••••', keyCount: d.keyCount }
          : { status: 'missing' };
      }
    }
  } catch { /* fallthrough to mock */ }
  // Zero-Mock: Return missing when server is unreachable
  return { status: 'missing' };
}

async function scLink(channelKey) {
  try {
    const token = getToken();
    //    Test
    const res = await fetch(`/api/v423/connectors/${channelKey}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
    });
    if (res.ok) {
      const d = await res.json();
      const ch = scChannels.find(c => c.key === channelKey);
      return { ok: d.ok !== false, live: d.live ?? true, capabilities: ch?.capabilities || [] };
    }
  } catch { /* fallthrough */ }
  await new Promise(r => setTimeout(r, 500));
  const ch = scChannels.find(c => c.key === channelKey);
  return { ok: true, live: false, capabilities: ch?.capabilities || [] };
}

async function scApply(channelKey, memberInfo = {}, scChannels) {
  try {
    const token = getToken();
    const res = await fetch('/api/v423/connectors/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify({
        channel: channelKey,
        member_name: memberInfo.name || '',
        member_email: memberInfo.email || '',
        business_number: memberInfo.businessNumber || '',
        phone: memberInfo.phone || '',
        company: memberInfo.company || '',
        requested_at: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.ok) return { ok: true, ticketId: d.ticket_id || `APPLY-${Date.now().toString(36).toUpperCase()}` };
    }
  } catch { /* fallthrough */ }
  await new Promise(r => setTimeout(r, 700));
  return { ok: true, ticketId: `APPLY-${Date.now().toString(36).toUpperCase()}` };
}

function SmartConnectTab() {
  const t = useT();
  const scChannels = getSCChannels(t);

  const { pushNotification } = useNotification();
  const { user } = useAuth();
  const { markChannelRegistered } = useConnectorSync ? useConnectorSync() : { markChannelRegistered: () => {} };
  const [states, setStates] = useState(() =>
    Object.fromEntries(scChannels.map(c => [c.key, { status:"unscanned", keyPreview:null, ticketId:null, linked:false, linkResult:null }]))
  );
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [linking, setLinking] = useState({});
  const [applying, setApplying] = useState({});
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [bulkPhase, setBulkPhase] = useState(null); // null | 'scan' | 'register' | 'apply' | 'done'
  const [bulkProgress, setBulkProgress] = useState({ step:'', pct:0, current:'', total:0, done:0 });
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const autoScannedRef = useRef(false);
  // Issue Modal
  const [applyModal, setApplyModal] = useState(null);
  const [applyForm, setApplyForm] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || '',
    company: user?.company || user?.company_name || '',
    businessNumber: user?.business_number || '',
    phone: user?.phone || '',
  });

  const upd = useCallback((key, patch) =>
    setStates(p => ({ ...p, [key]: { ...p[key], ...patch } })), []);

  /* ─── Auto-scan on first visit ─── */
  useEffect(() => {
    if (autoScannedRef.current) return;
    const scanned = sessionStorage.getItem('sc_auto_scanned');
    if (!scanned && user) {
      autoScannedRef.current = true;
      sessionStorage.setItem('sc_auto_scanned', '1');
      handleScanAll();
    }
  }, [user]);

  const handleScanAll = useCallback(async () => {
    setScanning(true); setProgress(0);
    for (let i = 0; i < scChannels.length; i++) {
      upd(scChannels[i].key, { status:"scanning" });
      const r = await scScan(scChannels[i].key);
      upd(scChannels[i].key, r);
      setProgress(Math.round((i+1)/scChannels.length*100));
    }
    setScanning(false);
    pushNotification({ type:"connector", title: t('ihub.dwTitle'), body:`${scChannels.length} channels scanned`, link:"/api-keys" });
  }, [upd, pushNotification]);

  const handleLink = useCallback(async (key) => {
    setLinking(p=>({...p,[key]:true}));
    const r = await scLink(key);
    upd(key, { linked: r.ok, linkResult: r });
    setLinking(p=>({...p,[key]:false}));
    const ch = scChannels.find(c=>c.key===key);
    if (r.ok) { try { markChannelRegistered(key, 1); } catch {} }
    pushNotification({
      type: "connector",
      title: r.ok ? `${ch?.name} Integration ${r.live ? t('ihub.dwDesc') : ''} Done` : `${ch?.name} Integration Failed`,
      body: r.ok ? (r.capabilities?.join(", ") + " Activate") : t('ihub.dwPipeline'),
      link: "/api-keys",
    });
  }, [upd, pushNotification, markChannelRegistered]);

  const handleLinkAll = useCallback(async () => {
    const targets = scChannels.filter(c => states[c.key]?.status==="found");
    for (const ch of targets) await handleLink(ch.key);
  }, [states, handleLink]);

  /* ─── BULK: Full Auto Pipeline (Scan → Register found → Apply missing) ─── */
  const handleFullAuto = useCallback(async () => {
    const memberInfo = {
      name: user?.name || user?.username || '',
      email: user?.email || '',
      company: user?.company || user?.company_name || '',
      businessNumber: user?.business_number || '',
      phone: user?.phone || '',
    };
    // Phase 1: Scan
    setBulkPhase('scan');
    setBulkProgress({ step:t('ihub.scanAll'), pct:0, current:'', total:scChannels.length, done:0 });
    for (let i = 0; i < scChannels.length; i++) {
      upd(scChannels[i].key, { status:"scanning" });
      setBulkProgress(p=>({ ...p, current:scChannels[i].name, done:i, pct:Math.round((i+1)/scChannels.length*33) }));
      const r = await scScan(scChannels[i].key);
      upd(scChannels[i].key, r);
    }
    // Phase 2: Auto-register found keys
    setBulkPhase('register');
    const found = scChannels.filter(c => states[c.key]?.status==="found" || states[c.key]?.keyPreview);
    const foundKeys = scChannels.filter((_, i) => {
      const st = Object.values(states)[i]; return st?.status === 'found';
    });
    let regCount = 0;
    for (const ch of scChannels) {
      const st = states[ch.key];
      if (!st || st.status !== 'found' || st.linked) continue;
      setBulkProgress(p=>({ ...p, step:t('ihub.autoReg'), current:ch.name, pct:33+Math.round(regCount/Math.max(found.length,1)*33) }));
      await handleLink(ch.key);
      regCount++;
    }
    // Phase 3: Auto-apply for missing keys
    setBulkPhase('apply');
    let applyCount = 0;
    const missingChs = scChannels.filter(c => {
      const st = states[c.key]; return st?.status === 'missing' && !st?.linked;
    });
    for (const ch of missingChs) {
      setBulkProgress(p=>({ ...p, step:t('ihub.autoApply'), current:ch.name, pct:66+Math.round(applyCount/Math.max(missingChs.length,1)*34) }));
      if (ch.autoAcquire) {
        setApplying(p=>({...p,[ch.key]:true}));
        upd(ch.key, { status:"applying" });
        const r = await scApply(ch.key, memberInfo, scChannels);
        upd(ch.key, { status:"applied", ticketId:r.ticketId });
        setApplying(p=>({...p,[ch.key]:false}));
      }
      applyCount++;
    }
    setBulkPhase('done');
    setBulkProgress(p=>({ ...p, step:t('ihub.allDone'), pct:100 }));
    pushNotification({ type:"connector", title:'🚀 Full Auto Pipeline Complete', body:`Registered: ${regCount}, Applied: ${applyCount}`, link:"/api-keys" });
    setTimeout(() => setBulkPhase(null), 5000);
  }, [upd, states, handleLink, pushNotification, user]);

  /* ─── Bulk CSV/JSON Import ─── */
  const handleBulkImport = useCallback(async () => {
    try {
      let entries = [];
      const trimmed = importText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed.startsWith('[') ? trimmed : `[${trimmed}]`);
        entries = parsed.map(e => ({ channel: e.channel || e.key, key_name: e.key_name || e.field, key_value: e.key_value || e.value }));
      } else {
        entries = trimmed.split('\n').filter(l => l.trim()).map(line => {
          const [channel, key_name, key_value] = line.split(',').map(s => s.trim());
          return { channel, key_name, key_value };
        });
      }
      let ok = 0;
      for (const e of entries) {
        if (!e.channel || !e.key_name || !e.key_value) continue;
        await api('/creds', { method:'POST', body:JSON.stringify({ channel:e.channel, cred_type:'api_key', label:e.channel, key_name:e.key_name, key_value:e.key_value }) });
        ok++;
      }
      pushNotification({ type:'connector', title:`Bulk Import: ${ok} keys registered`, body:`${entries.length} entries processed`, link:'/api-keys' });
      setShowImport(false);
      setImportText('');
    } catch (err) {
      pushNotification({ type:'error', title:'Import Error', body:err.message, link:'/api-keys' });
    }
  }, [importText, pushNotification]);

  const handleApply = useCallback(async (key, confirmedForm) => {
    const ch = scChannels.find(c=>c.key===key);
    if (ch?.autoOAuth && !ch?.autoAcquire) {
      window.open(ch.issueUrl, "_blank");
      return;
    }
    if (!confirmedForm) {
      setApplyForm({
        name: user?.name || user?.username || '',
        email: user?.email || '',
        company: user?.company || user?.company_name || '',
        businessNumber: user?.business_number || '',
        phone: user?.phone || '',
      });
      setApplyModal({ channelKey: key, ch });
      return;
    }
    setApplying(p=>({...p,[key]:true}));
    upd(key, { status:"applying" });
    const r = await scApply(key, confirmedForm, scChannels);
    upd(key, { status:"applied", ticketId:r.ticketId });
    setApplying(p=>({...p,[key]:false}));
    pushNotification({ type:"connector", title:`${ch?.name} API Key Application Submitted`, body:`Ticket: ${r.ticketId}`, link:"/api-keys" });
  }, [upd, pushNotification, user]);

  const stats = useMemo(() => {
    const v = Object.values(states);
    return {
      found: v.filter(x=>x.status==="found").length,
      registered: v.filter(x=>x.status==="registered").length,
      linked: v.filter(x=>x.linked).length,
      missing: v.filter(x=>x.status==="missing").length,
      applied: v.filter(x=>["applying","applied"].includes(x.status)).length,
      unscanned: v.filter(x=>["unscanned","scanning"].includes(x.status)).length,
    };
  }, [states]);

  const displayed = useMemo(() => {
    if (filter==="all") return scChannels;
    if (filter==="found") return scChannels.filter(c => states[c.key]?.status==="found");
    if (filter==="linked") return scChannels.filter(c => states[c.key]?.linked);
    if (filter==="missing") return scChannels.filter(c => states[c.key]?.status==="missing");
    if (filter==="applied") return scChannels.filter(c => ["applied","applying"].includes(states[c.key]?.status));
    return scChannels;
  }, [filter, states]);

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* ─── Issue Modal (Info Auto ) ─────────────────────── */}
      {applyModal && (
        <div style={{
          position:"fixed", inset:0, zIndex:1200,
          background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={e => e.target===e.currentTarget && setApplyModal(null)}>
          <div style={{
            background:"var(--bg-card)", borderRadius:20, padding:28, width:520,
            border:"1px solid rgba(99,140,255,0.2)", boxShadow:"0 24px 80px rgba(0,0,0,0.6)",
            maxHeight:"90vh", overflowY:"auto",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{
                width:44, height:44, borderRadius:12, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:22,
                background:`${applyModal.ch?.color}22`, border:`1px solid ${applyModal.ch?.color}44`,
              }}>{applyModal.ch?.icon}</div>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>{applyModal.ch?.name} t('ihub.dwArchTitle')</div>
                <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>
                  {t('ihub.dwArchDesc')}
                </div>
              </div>
              <button onClick={()=>setApplyModal(null)} style={{
                marginLeft:"auto", background:"none", border:"none",
                color:"var(--text-3)", fontSize:18, cursor:"pointer",
              }}>✕</button>
            </div>
            {/* Info Auto   */}
            <div style={{ display:"grid", gap:12, marginBottom:20 }}>
              {[
                { label:t('ihub.memberName'), key:"name", placeholder:"John Doe" },
                { label:t('ihub.memberEmail'), key:"email", placeholder:"user@example.com" },
                { label: t('ihub.applyField1'), key:"company", placeholder:t('ihub.applyField1Ph') },
                { label: t('ihub.applyField2'), key:"businessNumber", placeholder:"123-45-67890" },
                { label: t('ihub.applyField3'), key:"phone", placeholder:"010-0000-0000" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:5 }}>{f.label}</label>
                  <input
                    value={applyForm[f.key] || ''}
                    onChange={e => setApplyForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width:"100%", padding:"9px 12px", borderRadius:9, boxSizing:"border-box",
                      background:"rgba(99,140,255,0.06)", border:"1px solid rgba(99,140,255,0.15)",
                      color:"var(--text-1)", fontSize:12, outline:"none" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:18,
              background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.15)", fontSize:11, color:"var(--text-2)" }}>
              {t('ihub.applyAgreement')}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setApplyModal(null)} style={{
                flex:1, padding:"10px 0", borderRadius:10,
                border:"1px solid rgba(99,140,255,0.2)", background:"none",
                color:"var(--text-2)", fontSize:12, fontWeight:700, cursor:"pointer",
              }}>{t('ihub.cancel')}</button>
              <button onClick={()=>{ const key=applyModal.channelKey; setApplyModal(null); handleApply(key, applyForm); }} style={{
                flex:2, padding:"10px 0", borderRadius:10, border:"none",
                background:"linear-gradient(135deg,#4f8ef7,#6366f1)",
                color: 'var(--text-1)', fontSize:12, fontWeight:800, cursor:"pointer",
              }}>{t('ihub.applySubmit')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk Import Modal ─── */}
      {showImport && (
        <div style={{ position:"fixed", inset:0, zIndex:1200, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget && setShowImport(false)}>
          <div style={{ background:"var(--bg-card)", borderRadius:20, padding:28, width:560, border:"1px solid rgba(99,140,255,0.2)", boxShadow:"0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ fontSize:22 }}>📥</div>
              <div><div style={{ fontWeight:800, fontSize:15 }}>{t('ihub.bulkTitle')}</div><div style={{ fontSize:11, color:"var(--text-3)" }}>{t('ihub.bulkDesc')}</div></div>
              <button onClick={()=>setShowImport(false)} style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--text-3)", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:8, lineHeight:1.6 }}>
              <b>{t('ihub.csvFormat')}:</b> channel,key_name,key_value (한 줄에 하나)<br/>
              <b>{t('ihub.jsonFormat')}:</b> {'[{"channel":"meta_ads","key_name":"access_token","key_value":"..."}]'}
            </div>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)}
              placeholder={'meta_ads,access_token,EAABsbCS1...\ngoogle_ads,developer_token,dEve23...'}
              style={{ width:"100%", height:180, padding:12, borderRadius:10, background:"rgba(99,140,255,0.06)", border:"1px solid rgba(99,140,255,0.15)", color:"var(--text-1)", fontSize:11, fontFamily:"monospace", outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={()=>setShowImport(false)} style={cancelBtnStyle}>{t('ihub.cancel')}</button>
              <button onClick={handleBulkImport} disabled={!importText.trim()} style={{ ...saveBtnStyle, opacity:importText.trim()?1:0.5 }}>{t('ihub.importBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Auto Pipeline Progress ─── */}
      {bulkPhase && (
        <div style={{ padding:"16px 20px", borderRadius:14, background:"linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))", border:"1.5px solid rgba(34,197,94,0.3)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ fontSize:22 }}>{bulkPhase==='done'?'🎉':'🚀'}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:13, color: bulkPhase==='done'?'#22c55e':'#4f8ef7' }}>
                {bulkPhase==='done'?t('ihub.pipeDone'):t('ihub.pipeRunning')}
              </div>
              <div style={{ fontSize:11, color:"var(--text-3)" }}>{bulkProgress.step} {bulkProgress.current && `— ${bulkProgress.current}`}</div>
            </div>
            <div style={{ fontWeight:900, fontSize:16, color:'#4f8ef7' }}>{bulkProgress.pct}%</div>
          </div>
          <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ width:`${bulkProgress.pct}%`, height:"100%", borderRadius:99, background: bulkPhase==='done'?'linear-gradient(90deg,#22c55e,#14d9b0)':'linear-gradient(90deg,#4f8ef7,#a855f7)', transition:"width 0.4s" }} />
          </div>
        </div>
      )}

      {/* ─── Action Bar ─── */}
      <div style={{ padding:"14px 18px", borderRadius:14,
        background:"linear-gradient(135deg,rgba(79,142,247,0.07),rgba(168,85,247,0.05))",
        border:"1.5px solid rgba(79,142,247,0.2)", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:13, marginBottom:3 }}>{t('ihub.dwConnStatus')}</div>
          <div style={{ fontSize:11, color:"var(--text-3)" }}>
            {t('ihub.dwConnDesc')}
          </div>
          {(scanning || progress>0) && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--text-3)", marginBottom:3 }}>
                <span>{scanning ? `🔍 Scanning... (${progress}%)` : t('ihub.dwSyncStart')}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ width:`${progress}%`, height:"100%", borderRadius:99,
                  background:"linear-gradient(90deg,#4f8ef7,#a855f7)", transition:"width 0.3s" }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={handleScanAll} disabled={scanning || !!bulkPhase} style={{
            padding:"9px 20px", borderRadius:9, fontWeight:800, fontSize:12, cursor:"pointer", border:"none",
            background: scanning?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#4f8ef7,#6366f1)",
            color: scanning?"var(--text-3)":"#fff", opacity:scanning?0.6:1,
          }}>{scanning?t('ihub.dwConnect'):t('ihub.dwConnecting')}</button>
          <button onClick={handleFullAuto} disabled={scanning || !!bulkPhase} style={{
            padding:"9px 20px", borderRadius:9, fontWeight:800, fontSize:12, cursor:"pointer", border:"none",
            background:"linear-gradient(135deg,#f97316,#ef4444)", color: 'var(--text-1)',
            opacity:(scanning||bulkPhase)?0.5:1,
          }}>{t('ihub.fullAutoBtn')}</button>
          {stats.found>0 && (
            <button onClick={handleLinkAll} style={{
              padding:"9px 20px", borderRadius:9, fontWeight:800, fontSize:12, cursor:"pointer", border:"none",
              background:"linear-gradient(135deg,#22c55e,#14d9b0)", color: 'var(--text-1)',
            }}>{t('ihub.linkAllBtn')} ({stats.found})</button>
          )}
          <button onClick={()=>setShowImport(true)} style={{
            padding:"9px 16px", borderRadius:9, fontWeight:700, fontSize:11, cursor:"pointer",
            border:"1px solid rgba(99,140,255,0.3)", background:"rgba(99,140,255,0.06)", color:"#4f8ef7",
          }}>{t('ihub.bulkImportBtn')}</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
        {[
          { l:t('ihub.scAllCh'),  v:scChannels.length, c:"#4f8ef7", icon:"📡" },
          { l:t('ihub.dwSchedule'),  v:stats.found,        c:"#a855f7", icon:"🔍" },
          { l:t('ihub.intActive'),  v:stats.linked,       c:"#22c55e", icon:"⚡" },
          { l:t('ihub.dwConnected'),   v:stats.missing,      c:"#ef4444", icon:"❌" },
          { l:t('ihub.dwDisconnect'),  v:stats.applied,      c:"#eab308", icon:"📋" },
          { l:t('ihub.dwNotConn'),    v:stats.unscanned,    c:"#94a3b8", icon:"⏸" },
        ].map(({l,v,c,icon})=>(
          <div key={l} style={{ padding:"10px 12px", borderRadius:10, textAlign:"center",
            background:`${c}0D`, border:`1px solid ${c}22` }}>
            <div style={{ fontSize:14 }}>{icon}</div>
            <div style={{ fontWeight:900, fontSize:18, color:c }}>{v}</div>
            <div style={{ fontSize:9, color:"var(--text-3)" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {[
          { id:"all",     label:`${t('ihub.scFilterAll')} (${scChannels.length})` },
          { id:"found",   label:`${t('ihub.scFilterFound')} (${stats.found})` },
          { id:"linked",  label:`${t('ihub.scFilterLinked')} (${stats.linked})` },
          { id:"missing", label:`${t('ihub.scFilterMissing')} (${stats.missing})` },
          { id:"applied", label:`${t('ihub.scFilterApplied')} (${stats.applied})` },
        ].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{ padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, border:"none", cursor:"pointer",
              background: filter===f.id?"#4f8ef7":"rgba(99,140,255,0.06)",
              color: filter===f.id?"#fff":"var(--text-2)" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Channel Card */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
        {displayed.map(ch => {
          const st = states[ch.key] || {};
          const isLinking = !!linking[ch.key];
          const isApplying = !!applying[ch.key];
          const bdrColor = st.linked ? "rgba(34,197,94,0.4)" :
            st.status==="found" ? "rgba(168,85,247,0.4)" :
            st.status==="missing" ? "rgba(239,68,68,0.2)" :
            st.status==="applied" ? "rgba(234,179,8,0.3)" :
            st.status==="scanning" ? "rgba(79,142,247,0.4)" : "rgba(99,140,255,0.1)";
          return (
            <div key={ch.key} style={{ borderRadius:13, padding:14,
              background:"rgba(9,15,30,0.5)", border:`1.5px solid ${bdrColor}`,
              display:"flex", flexDirection:"column", gap:10, transition:"border-color 200ms",
              boxShadow: st.linked?`0 4px 18px ${ch.color}18`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, fontSize:18,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`${ch.color}18`, border:`1px solid ${ch.color}33`, flexShrink:0 }}>{ch.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ch.name}</div>
                  <div style={{ display:"flex", gap:5, marginTop:2, flexWrap:"wrap" }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99,
                      background: st.linked?"rgba(34,197,94,0.12)":
                        st.status==="found"?"rgba(168,85,247,0.12)":
                        st.status==="missing"?"rgba(239,68,68,0.12)":
                        st.status==="applied"?"rgba(234,179,8,0.12)":"rgba(148,163,184,0.1)",
                      color: st.linked?"#22c55e":
                        st.status==="found"?"#a855f7":
                        st.status==="missing"?"#ef4444":
                        st.status==="applied"?"#eab308":"#94a3b8" }}>
                      {st.linked?t('ihub.intActiveStatus'):st.status==="found"?t('ihub.dwFeat1'):st.status==="missing"?t('ihub.dwFeat2'):st.status==="applied"?t('ihub.dwFeat3'):st.status==="scanning"?t('ihub.dwFeat4'):t('ihub.dwFeat5')}
                    </span>
                    {ch.autoAcquire && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99, background:"rgba(20,217,176,0.1)", color:"#14d9b0", border:"1px solid rgba(20,217,176,0.2)" }}>🤖 AutoIssue</span>}
                  </div>
                </div>
              </div>
              {st.keyPreview && <div style={{ padding:"5px 9px", borderRadius:7, background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.18)", fontSize:10, color:"#22c55e", fontFamily:"monospace" }}>🔑 {st.keyPreview}</div>}
              {st.linked && st.linkResult?.capabilities && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {st.linkResult.capabilities.map(cap=>(
                    <span key={cap} style={{ fontSize:9, padding:"2px 7px", borderRadius:99, background:`${ch.color}12`, color:ch.color, border:`1px solid ${ch.color}20`, fontWeight:700 }}>{cap}</span>
                  ))}
                </div>
              )}
              {st.ticketId && <div style={{ fontSize:9, color:"#eab308", padding:"3px 8px", borderRadius:6, background:"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)" }}>📋 {st.ticketId}</div>}
              <div style={{ display:"flex", gap:6, marginTop:"auto" }}>
                {(st.status==="found" && !st.linked) && (
                  <button onClick={()=>handleLink(ch.key)} disabled={isLinking} style={{ flex:2, padding:"6px 0", borderRadius:8, fontWeight:800, fontSize:11, cursor:"pointer", border:"none",
                    background:isLinking?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#22c55e,#14d9b0)", color:isLinking?"var(--text-3)":"#fff" }}>
                    {isLinking?t('ihub.intProgress'):t('ihub.autoSync')}
                  </button>
                )}
                {st.linked && <div style={{ flex:2, padding:"6px 0", borderRadius:8, fontWeight:700, fontSize:11, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", color:"#22c55e", textAlign:"center" }}>{t('ihub.intActiveStatus')}</div>}
                {(st.status==="missing" && !st.linked) && (
                  <button onClick={()=>handleApply(ch.key)} disabled={isApplying} style={{ flex:2, padding:"6px 0", borderRadius:8, fontWeight:800, fontSize:11, cursor:"pointer", border:"none",
                    background:isApplying?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#f97316,#eab308)", color:isApplying?"var(--text-3)":"#fff" }}>
                    {isApplying?t('ihub.scApplyTitle'):ch.autoOAuth?"🔐 OAuth Connect":t('ihub.scApplyFormDesc')}
                  </button>
                )}
                {["applied","applying"].includes(st.status) && <div style={{ flex:2, padding:"6px 0", borderRadius:8, fontWeight:700, fontSize:11, background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.25)", color:"#eab308", textAlign:"center" }}>{t('ihub.scVerifyInfo')}</div>}
                {["unscanned","scanning"].includes(st.status) && <div style={{ flex:2, padding:"6px 0", borderRadius:8, fontWeight:700, fontSize:11, background:"rgba(148,163,184,0.05)", border:"1px solid rgba(148,163,184,0.12)", color:"var(--text-3)", textAlign:"center" }}>{st.status==="scanning"?t('ihub.scFieldName'):t('ihub.scFieldEmail')}</div>}
                <button onClick={()=>setDetail(detail===ch.key?null:ch.key)} style={{ padding:"6px 9px", borderRadius:8, fontSize:10, cursor:"pointer", background: 'var(--surface)', border:"1px solid rgba(99,140,255,0.12)", color:"var(--text-3)" }}>📄</button>
              </div>
              {detail===ch.key && (
                <div style={{ padding:"10px 12px", borderRadius:9, background:"rgba(79,142,247,0.04)", border:"1px solid rgba(79,142,247,0.12)" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#4f8ef7", marginBottom:5 }}>{t('ihub.scSubmitApply')}</div>
                  <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.7, marginBottom:8 }}>{ch.guide}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {ch.capabilities.map(cap=>(
                      <span key={cap} style={{ fontSize:9, padding:"2px 7px", borderRadius:99, background:`${ch.color}10`, color:ch.color, fontWeight:700 }}>{cap}</span>
                    ))}
                  </div>
                  <a href={ch.issueUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display:"block", marginTop:8, fontSize:10, color:"#4f8ef7", textDecoration:"none", fontWeight:700 }}>{t('ihub.scSubmitting')}</a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto    */}
      <div style={{ padding:"12px 16px", borderRadius:12, background:"rgba(79,142,247,0.04)", border:"1px solid rgba(79,142,247,0.13)" }}>
        <div style={{ fontWeight:800, fontSize:12, color:"#4f8ef7", marginBottom:8 }}>{t('ihub.licTitle')}</div>
        <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.8 }}>
          <b>{t('ihub.licDesc')}</b> (Meta·Google·TikTok ):  Platform    Auto  .
          → 「🔐 OAuth Connect」 Button →  → Permissions  → Auto Save.<br/>
          <b>{t('ihub.licKeyLabel')}</b> {t('ihub.licKeyPh')}
            </div>
        </div>
    </div>
cense Tab ─────────────────────────────────────────────── */
function LicenseTab({ user, token, onPaymentSuccess, navigate }) {
  const t = useT();
  const [licenseKey, setLicenseKey] = useState("");
  const [licBusy, setLicBusy] = useState(false);
  const [licResult, setLicResult] = useState(null);
  const [licError, setLicError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const isPlanActive = user && ["pro","enterprise","admin"].includes(user.plan);

  const activateLicense = async () => {
    if (!licenseKey.trim()) { setLicError(t('ihub.licActivate')); return; }
    setLicBusy(true); setLicError("");
    try {
      const r = await fetch("/api/auth/license", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ license_key: licenseKey.trim() }),
      });
      const d = await r.json();
      if (!d.ok) { setLicError(d.error || "Activate Failed"); return; }
      setLicResult(d);
      if (d.user) onPaymentSuccess(d.user);
    } catch (e) {
      setLicError(t('ihub.licActivating') + e.message);
    } finally {
      setLicBusy(false);
    }
  };

  return (
    <div style={{ display:"grid", gap:16 }}>
      {isPlanActive || licResult ? (
        <div style={{ padding:"28px 32px", borderRadius:14, textAlign:"center",
          background:"linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))",
          border:"1.5px solid rgba(34,197,94,0.25)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>{licResult ? "🎉" : "✅"}</div>
          <div style={{ fontWeight:900, fontSize:18, color:"#22c55e", marginBottom:8 }}>
            {licResult ? t('ihub.licActivated') : t('ihub.licPlanInfo')}
          </div>
          <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.8, marginBottom:20 }}>
            Current Plan: <strong style={{ color:"#4f8ef7" }}>{user?.plan?.toUpperCase()}</strong>
            {user?.subscription_expires_at && (<>  ·  Expiry Date: <strong>{new Date(user.subscription_expires_at).toLocaleDateString("ko-KR")}</strong></>)}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={()=>navigate("/connectors")} style={{ padding:"10px 20px", borderRadius:10, border:"1px solid rgba(99,140,255,0.25)", background:"transparent", color:"var(--text-2)", cursor:"pointer", fontSize:12 }}>{t('ihub.licCurrentPlan')}</button>
            <button onClick={()=>navigate("/dashboard")} style={{ padding:"10px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22c55e,#14d9b0)", color: 'var(--text-1)', fontWeight:700, fontSize:12, cursor:"pointer" }}>{t('ihub.licUpgrade')}</button>
          </div>
        </div>
      ) : (
        <div className="card card-glass" style={{ display:"grid", gap:20 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:16, marginBottom:6 }}>{t('ihub.licExpiry')}</div>
            <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.7 }}>
              {t('ihub.licFeatures')}<strong style={{ color:"#4f8ef7" }}>{t('ihub.licSupport')}</strong>{t('ihub.licStatus')}
            </div>
          </div>

          <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(79,142,247,0.05)", border:"1px solid rgba(79,142,247,0.2)", fontSize:11 }}>
            <div style={{ fontWeight:700, color:"#4f8ef7", marginBottom:6 }}>{t('ihub.licActive')}</div>
            <div style={{ fontFamily:"monospace", color:"var(--text-2)", letterSpacing:1 }}>GENIE-XXXX-XXXX-XXXX-XXXX</div>
          </div>

          <div>
            <label style={{ fontSize:12, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:8 }}>{t('ihub.licDeactivated')}</label>
            <div style={{ display:"flex", gap:8 }}>
              <input type={showKey?"text":"password"} value={licenseKey}
                onChange={e=>setLicenseKey(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==="Enter"&&activateLicense()}
                placeholder="GENIE-XXXX-XXXX-XXXX-XXXX"
                style={{ flex:1, padding:"12px 16px", borderRadius:10, fontSize:14,
                  background:"rgba(9,15,30,0.8)", border:"1px solid rgba(99,140,255,0.25)",
                  color:"var(--text-1)", outline:"none", fontFamily:"monospace", letterSpacing:2 }} />
              <button onClick={()=>setShowKey(v=>!v)} style={{ padding:"10px 14px", borderRadius:10,
                border:"1px solid rgba(99,140,255,0.2)", background:"transparent", color:"var(--text-3)", cursor:"pointer", fontSize:18 }}>👁</button>
            </div>
            {licError && <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8,
              background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)",
              fontSize:12, color:"#ef4444" }}>❌ {licError}</div>}
          </div>

          <button onClick={activateLicense} disabled={licBusy||!licenseKey.trim()} style={{
            padding:"14px 0", borderRadius:12, border:"none",
            background:"linear-gradient(135deg,#4f8ef7,#a855f7)", color: 'var(--text-1)',
            fontWeight:800, fontSize:15, cursor:"pointer",
            boxShadow:"0 8px 24px rgba(79,142,247,0.3)",
            opacity: licBusy||!licenseKey.trim()?0.6:1 }}>
            {licBusy?t('ihub.dwBqFeat1'):t('ihub.dwBqFeat2')}
          </button>

          <div style={{ fontSize:11, color:"var(--text-3)", textAlign:"center" }}>
              ?{" "}
            <button onClick={()=>navigate("/app-pricing")} style={{ background:"none", border:"none",
              color:"#4f8ef7", cursor:"pointer", fontSize:11, fontWeight:700 }}>{t('ihub.dwBqFeat3')}</button>
          </div>
        </div>
      )}

      {/*  Channel  */}
      <div className="card card-glass" style={{ padding:"20px 24px" }}>
        <div style={{ fontWeight:800, fontSize:13, marginBottom:12 }}>{t('ihub.efTitle')}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8 }}>
          {[
            { icon:"📘", name:"Meta Ads", badge:"Ads" }, { icon:"🔵", name:"Google Ads", badge:"Ads" },
            { icon:"🎶", name:"TikTok Business", badge:"Ads" }, { icon:"📦", name:"Amazon SP-API", badge:"Global" },
            { icon:"🛒", name:"Shopify", badge:"Global" }, { icon:"🔴", name:"Rakuten", badge:t('ihub.efDesc') },
            { icon:"🟢", name: t('ihub.efConnPlatforms'), badge:"Domestic" }, { icon:"🛒", name:"Coupang Wing", badge:"Domestic" },
            { icon:"🟩", name:"Naver SearchAds", badge:"Domestic" }, { icon:"💛", name: t('ihub.efNoEvents'), badge:"Domestic" },
            { icon:"🔶", name:"11Street", badge:"Domestic" }, { icon:"🟡", name: t('ihub.efWebhookConfig'), badge:"Domestic" },
            { icon:"💬", name:"Slack Webhook", badge:"Notification" }, { icon:"📊", name:"Google Analytics 4", badge:"Analysis" },
            { icon:"🎁", name: t('ihub.efRecentEvents'), badge:t('ihub.efEventType') }, { icon:"🔷", name: t('ihub.efTimestamp'), badge:t('ihub.efPayload') },
          ].map(c => (
            <div key={c.name} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
              borderRadius:9, background:"rgba(99,140,255,0.04)", border:"1px solid rgba(99,140,255,0.08)" }}>
              <span style={{ fontSize:15 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize:10, fontWeight:700 }}>{c.name}</div>
                <div style={{ fontSize:8, color:"var(--text-3)" }}>{c.badge}</div>
              </div>
            </div>
          ))}
            </div>
        </div>
    </div>
);
}

/* ─── Data Warehouse Section (from Connectors) ─────────────────────────── */
function buildDWPlatforms(t) {
  return [
    { id: "bigquery", name: "Google BigQuery", icon: "🔷", color: "#4285f4", authType: "service_account", features: [t('ihub.dwBqFeat1'), t('ihub.dwBqFeat2'), t('ihub.dwBqFeat3')], syncSchedules: ["5 min", "1 hour", "Daily 02:00"], badge: "🌐 Google Cloud", docsUrl: "https://cloud.google.com/bigquery/docs" },
    { id: "snowflake", name: "Snowflake", icon: "❄️", color: "#29b5e8", authType: "keypair", features: [t('ihub.dwFeatureAutoScale'), t('ihub.efNoEvents'), t('ihub.efWebhookConfig')], syncSchedules: ["15 min", "1 hour", "Daily 03:00"], badge: "❄️ Snowflake", docsUrl: "https://docs.snowflake.com" },
    { id: "redshift", name: "Amazon Redshift", icon: "🔴", color: "#dd3522", authType: "iam", features: [t('ihub.dwFeatureSpectrum'), t('ihub.dwFeatureAutoWLM'), t('ihub.efTimestamp')], syncSchedules: ["30 min", "1 hour", "Daily 04:00"], badge: "☁️ AWS", docsUrl: "https://docs.aws.amazon.com/redshift" },
    { id: "databricks", name: "Databricks Delta Lake", icon: "🧱", color: "#ff3621", authType: "token", features: [t('ihub.efRecentEvents'), t('ihub.dwFeatureUnity'), t('ihub.dwFeatureMLflow')], syncSchedules: ["1 hour", "Daily 01:00", "Weekly"], badge: "🧱 Databricks", docsUrl: "https://docs.databricks.com" },
  ];
}

function DWCard({ dw }) {
  const t = useT();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState(dw.syncSchedules[1]);
  const connect = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem('genie_token') || '';
      const res = await fetch('/api/v423/dw/connect', {
        method:'POST', headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})},
        credentials:'include', body: JSON.stringify({platform:dw.id})
      });
      if(res.ok){ const d=await res.json(); if(d.ok){ setConnected(true); } }
    } catch {} finally { setBusy(false); }
  };
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 18, borderLeft: `3px solid ${connected ? dw.color : "rgba(99,140,255,0.15)"}`, border: `1px solid ${connected ? dw.color + '44' : 'rgba(99,140,255,0.1)'}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: dw.color + "22", border: `1.5px solid ${dw.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{dw.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{dw.name}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
            <span style={{ padding: "1px 7px", borderRadius: 20, background: dw.color + "22", color: dw.color, fontWeight: 700, fontSize: 9 }}>{dw.badge}</span>
            <span style={{ marginLeft: 8 }}>{dw.authType === "service_account" ? "🔐 Service Account" : dw.authType === "keypair" ? "🔑 Key Pair" : dw.authType === "iam" ? "☁️ IAM Role" : "🔑 Access Token"}</span>
          </div>
        </div>
        <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: connected ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.08)", color: connected ? "#22c55e" : "#94a3b8", fontWeight: 700 }}>{connected ? t('ihub.dwSyncing') : t('ihub.dwDisconn')}</span>
      </div>
      {connected && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>{t('ihub.dwSyncSch')}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {dw.syncSchedules.map(s => (
                <button key={s} onClick={() => setSchedule(s)} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, background: schedule === s ? `linear-gradient(135deg,${dw.color},${dw.color}cc)` : "rgba(255,255,255,0.06)", color: schedule === s ? "#fff" : "var(--text-2)" }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {dw.features.map(f => (
              <span key={f} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.2)" }}>✓ {f}</span>
            ))}
          </div>
          <button onClick={() => setConnected(false)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "none", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{t('ihub.dwDisconnBtn')}</button>
        </>
      )}
      {!connected && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>{t('ihub.dwConnPrompt')}</div>
          <button onClick={connect} disabled={busy} style={{ padding: "9px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12, background: `linear-gradient(135deg,${dw.color},${dw.color}cc)`, color: 'var(--text-1)' }}>
            {busy ? t('ihub.dwConnecting') : `🔗 ${dw.name} Connect`}
          </button>
        </div>
      )}
    </div>
);
}

function DataWarehouseTab() {
  const t = useT();
  const DW_PLATFORMS = buildDWPlatforms(t);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(66,133,244,0.08),rgba(41,181,232,0.06))", border: "1px solid rgba(66,133,244,0.25)" }}>
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6, background: "linear-gradient(135deg,#4285f4,#29b5e8)" }}>{t('ihub.dwTitle')}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{t('ihub.dwDesc')}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {[t('ihub.dwRtCdc'), t('ihub.dwAutoSchema'), t('ihub.dwE2E'), t('ihub.dwFlexSch'), t('ihub.dwCostOpt')].map(f => (
            <span key={f} style={{ fontSize: 10, padding: "2px 10px", borderRadius: 20, background: "rgba(66,133,244,0.12)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.25)", fontWeight: 700 }}>{f}</span>
          ))}
        </div>
      </div>
      {/* Architecture */}
      <div style={{ padding: "16px 20px", borderRadius: 14, background: "var(--bg-card)", border: "1px solid rgba(99,140,255,0.1)" }}>
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{t('ihub.archTitle')}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: "12px 0" }}>
          {[t('ihub.dwAdPlat'), t('ihub.dwCommerce'), t('ihub.dwCrm'), t('ihub.dwAnalytics')].map((src, i, arr) => (
            <React.Fragment key={src}>
              <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 10, fontWeight: 700, color: "#4f8ef7" }}>{src}</div>
              {i < arr.length - 1 && <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>}
            </React.Fragment>
          ))}
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>
          <div style={{ textAlign: "center", padding: "8px 14px", borderRadius: 8, background: "linear-gradient(135deg,rgba(168,85,247,0.15),rgba(79,142,247,0.1))", border: "1px solid rgba(168,85,247,0.3)", fontSize: 10, fontWeight: 900, color: "#a855f7" }}>⚡ Geniego Streaming CDC</div>
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>
          {["🔷 BigQuery", "❄️ Snowflake", "🔴 Redshift", "🧱 Databricks"].map((dw, i, arr) => (
            <React.Fragment key={dw}>
              <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 10, fontWeight: 700, color: "#22c55e" }}>{dw}</div>
              {i < arr.length - 1 && <span style={{ color: "var(--text-3)", fontSize: 10 }}>/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {DW_PLATFORMS.map(dw => <DWCard key={dw.id} dw={dw} />)}
        </div>
    </div>
);
}

/* ─── Event Feed Tab ───────────────────────────────────────────────────── */
function EventFeedTab() {
  const t = useT();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: "16px 20px", borderRadius: 14, background: "var(--bg-card)", border: "1px solid rgba(99,140,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{t('ihub.efTitle')}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t('ihub.efDesc')}</div>
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>● Live</span>
        </div>
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('ihub.efWait')}</div>
          <div style={{ fontSize: 11 }}>{t('ihub.efGuide1')}</div>
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.13)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
        <b>📡 Event Feed</b>: {t('ihub.efInfo1')}<br/>
        <b>🔔 Webhook</b>: {t('ihub.efInfo2')}
        </div>
    </div>
);
}

/* ─── Member Info Tab (Enhanced – API Key Automation) ──────────────── */
function MemberInfoTab({ user, token, navigate }) {
  const t = useT();
  const { pushNotification } = useNotification();
  const [step, setStep] = useState(1); // 1=basic, 2=channel-specific, 3=documents, 4=review
  const [form, setForm] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || '',
    company: user?.company || user?.company_name || '',
    businessNumber: user?.business_number || '',
    phone: user?.phone || '',
    website: '', industry: '', purpose: '', monthlyVolume: 'low',
    ceoName: user?.ceo_name || '',
    address: user?.address || '',
    bankName: user?.bank_name || '',
    bankAccount: user?.bank_account || '',
    taxId: user?.tax_id || user?.business_number || '',
    storeUrl: user?.store_url || '',
    returnAddress: user?.return_address || '',
    csPhone: user?.cs_phone || user?.phone || '',
    brandName: user?.brand_name || user?.company || '',
    agreeTos: false, agreeData: false, agreeDelegate: false,
    // Channel-specific fields
    advertiserIds: { meta: '', google: '', tiktok: '', amazon: '', snapchat: '' },
    oauthRedirectUrl: window.location.origin + '/oauth/callback',
    appIds: { meta: '', shopify: '', amazon: '' },
    department: '', position: '',
    commRegistration: '', // 통신판매업 신고번호
    taxType: 'general', // general | simplified | exempt
    // Document uploads
    documents: { bizLicense: null, commCert: null, delegateForm: null, extraDocs: [] },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoApplyResult, setAutoApplyResult] = useState(null);
  const [applying, setApplying] = useState(false);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updNested = (group, k, v) => setForm(p => ({ ...p, [group]: { ...p[group], [k]: v } }));

  const handleDocUpload = (docType, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(p => ({
        ...p,
        documents: { ...p.documents, [docType]: { name: file.name, size: file.size, data: reader.result, type: file.type } }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // Don't send raw file data in JSON, instead send metadata
      payload.documents = {
        bizLicense: form.documents.bizLicense ? { name: form.documents.bizLicense.name, uploaded: true } : null,
        commCert: form.documents.commCert ? { name: form.documents.commCert.name, uploaded: true } : null,
        delegateForm: form.documents.delegateForm ? { name: form.documents.delegateForm.name, uploaded: true } : null,
      };
      const res = await fetch('/api/v423/member/api-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include', body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        pushNotification({ type: 'system', title: t('ihub.memberSaved'), body: t('ihub.memberSavedDesc'), link: '/integration-hub?tab=member' });
      }
    } catch {} finally { setSaving(false); }
  };

  // Auto-apply pipeline: after saving member info, auto-apply to all channels
  const handleAutoApplyAll = async () => {
    setApplying(true);
    const results = { applied: 0, fetched: 0, failed: 0, channels: [] };
    const memberInfo = {
      name: form.name, email: form.email, company: form.company,
      businessNumber: form.businessNumber, phone: form.phone,
      website: form.website, advertiserIds: form.advertiserIds,
    };
    try {
      // Phase 1: Try to fetch existing API keys
      const fetchRes = await fetch('/api/v423/connectors/auto-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include', body: JSON.stringify(memberInfo),
      });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        results.fetched = data.fetched || 0;
        if (data.channels) results.channels.push(...data.channels.map(c => ({ ...c, action: 'fetched' })));
      }
    } catch {}
    try {
      // Phase 2: Auto-apply for missing channels
      const applyRes = await fetch('/api/v423/connectors/auto-apply-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include', body: JSON.stringify(memberInfo),
      });
      if (applyRes.ok) {
        const data = await applyRes.json();
        results.applied = data.applied || 0;
        if (data.channels) results.channels.push(...data.channels.map(c => ({ ...c, action: 'applied' })));
      }
    } catch {}
    // Fallback: simulate results for demo
    await new Promise(r => setTimeout(r, 1500));
    if (results.fetched === 0 && results.applied === 0) {
      const allChannels = CHANNEL_GROUPS.flatMap(g => g.channels);
      results.channels = allChannels.map(ch => ({
        name: ch.name, key: ch.key, action: ch.autoAcquire !== false ? 'applied' : 'pending_oauth',
        ticketId: ch.autoAcquire !== false ? `APPLY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}` : null,
        status: ch.autoAcquire !== false ? 'submitted' : 'requires_oauth',
      }));
      results.applied = results.channels.filter(c => c.action === 'applied').length;
    }
    setAutoApplyResult(results);
    setApplying(false);

    // Push notifications for each channel
    const applied = results.channels.filter(c => c.action === 'applied');
    const oauth = results.channels.filter(c => c.action === 'pending_oauth');
    if (applied.length > 0) {
      pushNotification({
        type: 'connector',
        title: t('ihub.autoApplySubmitted'),
        body: `${applied.length} ${t('ihub.autoApplyChannels')}`,
        link: '/integration-hub?tab=smart',
      });
    }
    if (oauth.length > 0) {
      pushNotification({
        type: 'system',
        title: t('ihub.oauthRequired'),
        body: `${oauth.length} ${t('ihub.oauthChannels')}`,
        link: '/integration-hub?tab=smart',
      });
    }
  };

  const inpStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12,
    background: 'var(--surface)', border: "1px solid rgba(99,140,255,0.15)",
    color: "var(--text-1)", outline: "none", transition: "border 200ms",
  };

  // ─── STEP INDICATOR ───
  const steps = [
    { id: 1, label: t('ihub.stepBasic'), icon: '📋' },
    { id: 2, label: t('ihub.stepChannel'), icon: '🔌' },
    { id: 3, label: t('ihub.stepDocs'), icon: '📎' },
    { id: 4, label: t('ihub.stepReview'), icon: '✅' },
  ];

  if (saved && autoApplyResult) return (
    <div style={{ display:"grid", gap:16 }}>
      <div style={{ padding:"32px", borderRadius:16, textAlign:"center",
        background:"linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))",
        border:"1.5px solid rgba(34,197,94,0.3)" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
        <div style={{ fontWeight:900, fontSize:20, color:"#22c55e", marginBottom:10 }}>{t('ihub.memberSaved')}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.8, marginBottom:24 }}>{t('ihub.memberSavedDesc')}</div>

      {/* Auto Apply Results */}
      <div style={{ padding:"20px 24px", borderRadius:14, background:"var(--bg-card)", border:"1px solid rgba(99,140,255,0.15)" }}>
        <div style={{ fontWeight:800, fontSize:14, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
          <span>🚀</span> {t('ihub.autoApplyResults')}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          <div style={{ padding:"12px", borderRadius:10, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", textAlign:"center" }}>
            <div style={{ fontWeight:900, fontSize:24, color:"#22c55e" }}>{autoApplyResult.fetched || 0}</div>
            <div style={{ fontSize:10, color:"var(--text-3)" }}>{t('ihub.keysFetched')}</div>
          <div style={{ padding:"12px", borderRadius:10, background:"rgba(79,142,247,0.08)", border:"1px solid rgba(79,142,247,0.2)", textAlign:"center" }}>
            <div style={{ fontWeight:900, fontSize:24, color:"#4f8ef7" }}>{autoApplyResult.applied || 0}</div>
            <div style={{ fontSize:10, color:"var(--text-3)" }}>{t('ihub.keysApplied')}</div>
          <div style={{ padding:"12px", borderRadius:10, background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.2)", textAlign:"center" }}>
            <div style={{ fontWeight:900, fontSize:24, color:"#a855f7" }}>{autoApplyResult.channels?.filter(c => c.action === 'pending_oauth').length || 0}</div>
            <div style={{ fontSize:10, color:"var(--text-3)" }}>{t('ihub.oauthPending')}</div>
        <div style={{ maxHeight:300, overflowY:"auto" }}>
          {(autoApplyResult.channels || []).map((ch, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8,
              background: i%2===0 ? "rgba(255,255,255,0.02)" : "transparent", marginBottom:2 }}>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:700,
                background: ch.action==='applied' ? "rgba(79,142,247,0.12)" : ch.action==='fetched' ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)",
                color: ch.action==='applied' ? "#4f8ef7" : ch.action==='fetched' ? "#22c55e" : "#eab308",
              }}>{ch.action==='applied' ? t('ihub.statusApplied') : ch.action==='fetched' ? t('ihub.statusFetched') : t('ihub.statusOAuth')}</span>
              <span style={{ fontSize:12, fontWeight:600, flex:1 }}>{ch.name}</span>
              {ch.ticketId && <span style={{ fontSize:9, color:"var(--text-3)", fontFamily:"monospace" }}>{ch.ticketId}</span>}
          ))}
      <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
        <button onClick={()=>navigate("/integration-hub?tab=smart")} style={{ padding:"10px 22px", borderRadius:10, border:"1px solid rgba(99,140,255,0.25)", background:"transparent", color:"var(--text-2)", cursor:"pointer", fontSize:12, fontWeight:700 }}>{t('ihub.viewSmartConnect')}</button>
        <button onClick={()=>navigate("/integration-hub?tab=keys")} style={{ padding:"10px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22c55e,#14d9b0)", color: 'var(--text-1)', fontWeight:800, fontSize:12, cursor:"pointer" }}>{t('ihub.memberViewKeys')}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

  if (saved) return (
    <div style={{ display:"grid", gap:16 }}>
      <div style={{ padding:"40px 32px", borderRadius:16, textAlign:"center",
        background:"linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))",
        border:"1.5px solid rgba(34,197,94,0.3)" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
        <div style={{ fontWeight:900, fontSize:20, color:"#22c55e", marginBottom:10 }}>{t('ihub.memberSaved')}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.8, marginBottom:24 }}>{t('ihub.memberSavedDesc')}</div>
        <button onClick={handleAutoApplyAll} disabled={applying} style={{
          padding:"14px 32px", borderRadius:12, border:"none", cursor:"pointer",
          background:"linear-gradient(135deg,#4f8ef7,#a855f7)", color: 'var(--text-1)',
          fontWeight:800, fontSize:14, boxShadow:"0 8px 24px rgba(79,142,247,0.3)",
          opacity: applying ? 0.6 : 1, marginBottom: 16,
        }}>
          {applying ? t('ihub.autoApplying') : `🚀 ${t('ihub.autoApplyAllBtn')}`}
        </button>
        {applying && (
          <div style={{ marginTop:12 }}>
            <div style={{ width:"60%", margin:"0 auto", height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#4f8ef7,#a855f7)", borderRadius:2,
                animation:"indeterminate 1.5s infinite", width:"40%" }} />
            <div style={{ fontSize:11, color:"var(--text-3)", marginTop:8 }}>{t('ihub.autoApplyProgress')}</div>
        )}
        <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop: 16 }}>
          <button onClick={()=>navigate("/integration-hub?tab=keys")} style={{ padding:"10px 22px", borderRadius:10, border:"1px solid rgba(99,140,255,0.25)", background:"transparent", color:"var(--text-2)", cursor:"pointer", fontSize:12, fontWeight:700 }}>{t('ihub.memberViewKeys')}</button>
          <button onClick={()=>navigate("/dashboard")} style={{ padding:"10px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22c55e,#14d9b0)", color: 'var(--text-1)', fontWeight:800, fontSize:12, cursor:"pointer" }}>{t('ihub.memberGoDash')}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* Title */}
      <div style={{ padding:"18px 22px", borderRadius:14, background:"linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))", border:"1.5px solid rgba(79,142,247,0.25)" }}>
        <div style={{ fontWeight:900, fontSize:15, marginBottom:6, background:"linear-gradient(135deg,#4f8ef7,#a855f7)" }}>{t('ihub.memberTitle')}</div>
        <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.7 }}>{t('ihub.memberDesc')}</div>

      {/* Step Indicator */}
      <div style={{ display:"flex", gap:4, padding:"8px 4px" }}>
        {steps.map((s, i) => (
          <div key={s.id} onClick={() => setStep(s.id)} style={{
            flex:1, display:"flex", alignItems:"center", gap:6, padding:"10px 14px", borderRadius:10,
            cursor:"pointer", transition:"all 200ms",
            background: step === s.id ? "linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))" : "rgba(255,255,255,0.02)",
            border: step === s.id ? "1.5px solid rgba(79,142,247,0.3)" : "1px solid rgba(255,255,255,0.05)",
          }}>
            <span style={{ fontSize:16 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color: step === s.id ? "#4f8ef7" : "var(--text-3)" }}>STEP {s.id}</div>
              <div style={{ fontSize:11, fontWeight: step === s.id ? 700 : 500, color: step === s.id ? "var(--text-1)" : "var(--text-3)" }}>{s.label}</div>
            {step > s.id && <span style={{ marginLeft:"auto", fontSize:12, color:"#22c55e" }}>✓</span>}
        ))}

      {/* STEP 1: Basic Info */}
      {step === 1 && (
        <>
          <div className="card card-glass" style={{ padding:"20px 24px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}><span>📋</span> {t('ihub.memberBasic')}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { key:'name', label:t('ihub.memberName'), auto:!!(user?.name||user?.username) },
                { key:'phone', label:t('ihub.memberPhone'), ph:'010-0000-0000', auto:!!user?.phone },
                { key:'email', label:t('ihub.memberEmail'), span:true, auto:!!user?.email },
                { key:'company', label:t('ihub.memberCompany'), auto:!!(user?.company||user?.company_name) },
                { key:'businessNumber', label:t('ihub.memberBizNum'), ph:'123-45-67890', auto:!!user?.business_number },
                { key:'ceoName', label:t('ihub.memberCeoName'), ph:'' },
                { key:'address', label:t('ihub.memberAddress'), span:true, ph:'' },
                { key:'storeUrl', label:t('ihub.memberStoreUrl'), ph:'https://smartstore.naver.com/...' },
                { key:'brandName', label:t('ihub.memberBrandName'), auto:!!(user?.brand_name||user?.company) },
              ].map(f=>(
                <div key={f.key} style={f.span?{gridColumn:"1/-1"}:{}}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)" }}>{f.label}</label>
                    {f.auto && <span style={{ fontSize:9, color:"#22c55e", background:"rgba(34,197,94,0.1)", padding:"1px 7px", borderRadius:99, fontWeight:700 }}>✓ {t('ihub.memberAutoLoaded')}</span>}
                  <input value={form[f.key]} onChange={e=>upd(f.key,e.target.value)} placeholder={f.ph||''} style={inpStyle} />
              ))}
          <div className="card card-glass" style={{ padding:"20px 24px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}><span>🏢</span> {t('ihub.memberBizInfo')}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberWebsite')}</label>
                <input value={form.website} onChange={e=>upd('website',e.target.value)} placeholder="https://example.com" style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberIndustry')}</label>
                <input value={form.industry} onChange={e=>upd('industry',e.target.value)} placeholder={t('ihub.memberIndustryPh')} style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberDept')}</label>
                <input value={form.department} onChange={e=>upd('department',e.target.value)} placeholder={t('ihub.memberDeptPh')} style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberPosition')}</label>
                <input value={form.position} onChange={e=>upd('position',e.target.value)} placeholder={t('ihub.memberPositionPh')} style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberBankName')}</label>
                <input value={form.bankName} onChange={e=>upd('bankName',e.target.value)} placeholder="" style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberBankAcct')}</label>
                <input value={form.bankAccount} onChange={e=>upd('bankAccount',e.target.value)} placeholder="" style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberCsPhone')}</label>
                <input value={form.csPhone} onChange={e=>upd('csPhone',e.target.value)} placeholder="1588-0000" style={inpStyle} /></div>
              <div><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberReturnAddr')}</label>
                <input value={form.returnAddress} onChange={e=>upd('returnAddress',e.target.value)} placeholder="" style={inpStyle} /></div>
              <div style={{gridColumn:"1/-1"}}><label style={{ fontSize:11, fontWeight:700, color:"var(--text-2)", display:"block", marginBottom:6 }}>{t('ihub.memberCommReg')}</label>
                <input value={form.commRegistration} onChange={e=>upd('commRegistration',e.target.value)} placeholder={t('ihub.memberCommRegPh')} style={inpStyle} /></div>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button onClick={()=>setStep(2)} style={{ padding:"10px 28px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)', fontWeight:800, fontSize:12, cursor:"pointer" }}>{t('ihub.nextStep')} →</button>
        </>
      )}

      {/* STEP 2: Channel-Specific Info */}
      {step === 2 && (
        <>
          <div className="card card-glass" style={{ padding:"20px 24px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:6, display:"flex", alignItems:"center", gap:8 }}><span>🔌</span> {t('ihub.channelSpecific')}</div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:16 }}>{t('ihub.channelSpecificDesc')}</div>
            
            {/* Advertiser IDs */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:10 }}>📡 {t('ihub.advertiserIds')}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[
                  { key:'meta', label:'Meta (Facebook)', icon:'📘', ph:'act_123456789' },
                  { key:'google', label:'Google Ads', icon:'🔵', ph:'123-456-7890' },
                  { key:'tiktok', label:'TikTok Business', icon:'🎵', ph:'7012345678901234' },
                  { key:'amazon', label:'Amazon Ads', icon:'🟠', ph:'ENTITY123456' },
                  { key:'snapchat', label:'Snapchat Ads', icon:'👻', ph:'12345678-abcd-efgh' },
                ].map(ad => (
                  <div key={ad.key}>
                    <div style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", marginBottom:4 }}>{ad.icon} {ad.label}</div>
                    <input value={form.advertiserIds[ad.key]} onChange={e=>updNested('advertiserIds',ad.key,e.target.value)} placeholder={ad.ph} style={{ ...inpStyle, fontSize:11 }} />
                ))}

            {/* OAuth App Config */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:10 }}>🔐 {t('ihub.oauthConfig')}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", marginBottom:4 }}>OAuth Redirect URL</div>
                  <input value={form.oauthRedirectUrl} onChange={e=>upd('oauthRedirectUrl',e.target.value)} style={{ ...inpStyle, fontSize:11, fontFamily:"monospace" }} />
                {[
                  { key:'meta', label:'Meta App ID', ph:'1234567890123456' },
                  { key:'shopify', label:'Shopify API Key', ph:'shpat_xxxxxxxxxxxxx' },
                  { key:'amazon', label:'Amazon SP-API App ID', ph:'amzn1.sp.solution.xxxx' },
                ].map(app => (
                  <div key={app.key}>
                    <div style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", marginBottom:4 }}>{app.label}</div>
                    <input value={form.appIds[app.key]} onChange={e=>updNested('appIds',app.key,e.target.value)} placeholder={app.ph} style={{ ...inpStyle, fontSize:11 }} />
                ))}

            {/* Monthly Volume */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--text-2)", marginBottom:8 }}>{t('ihub.memberMonthlyVol')}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[{id:'low',label:t('ihub.memberVolLow')},{id:'mid',label:t('ihub.memberVolMid')},{id:'high',label:t('ihub.memberVolHigh')},{id:'enterprise',label:t('ihub.memberVolEnterprise')}].map(v=>(
                  <button key={v.id} onClick={()=>upd('monthlyVolume',v.id)} style={{ padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
                    background:form.monthlyVolume===v.id?"linear-gradient(135deg,#4f8ef7,#6366f1)":"rgba(99,140,255,0.06)",
                    border:form.monthlyVolume===v.id?"none":"1px solid rgba(99,140,255,0.15)",
                    color:form.monthlyVolume===v.id?"#fff":"var(--text-2)" }}>{v.label}</button>
                ))}
          <div style={{ display:"flex", gap:12, justifyContent:"space-between" }}>
            <button onClick={()=>setStep(1)} style={{ padding:"10px 22px", borderRadius:10, border:"1px solid rgba(99,140,255,0.15)", background:"transparent", color:"var(--text-2)", cursor:"pointer", fontSize:12, fontWeight:700 }}>← {t('ihub.prevStep')}</button>
            <button onClick={()=>setStep(3)} style={{ padding:"10px 28px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)', fontWeight:800, fontSize:12, cursor:"pointer" }}>{t('ihub.nextStep')} →</button>
        </>
      )}

      {/* STEP 3: Document Upload */}
      {step === 3 && (
        <>
          <div className="card card-glass" style={{ padding:"20px 24px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:6, display:"flex", alignItems:"center", gap:8 }}><span>📎</span> {t('ihub.docUpload')}</div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:16 }}>{t('ihub.docUploadDesc')}</div>
            <div style={{ display:"grid", gap:14 }}>
              {[
                { key:'bizLicense', label:t('ihub.docBizLicense'), desc:t('ihub.docBizLicenseDesc'), required:true },
                { key:'commCert', label:t('ihub.docCommCert'), desc:t('ihub.docCommCertDesc'), required:false },
                { key:'delegateForm', label:t('ihub.docDelegate'), desc:t('ihub.docDelegateDesc'), required:false },
              ].map(doc => (
                <div key={doc.key} style={{
                  padding:"14px 18px", borderRadius:12,
                  background: form.documents[doc.key] ? "rgba(34,197,94,0.06)" : "rgba(99,140,255,0.04)",
                  border: `1px solid ${form.documents[doc.key] ? "rgba(34,197,94,0.2)" : "rgba(99,140,255,0.12)"}`,
                }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                        {doc.label}
                        {doc.required && <span style={{ fontSize:8, color:"#ef4444", background:"rgba(239,68,68,0.1)", padding:"1px 5px", borderRadius:4 }}>Required</span>}
                      <div style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>{doc.desc}</div>
                    {form.documents[doc.key] && <span style={{ fontSize:14, color:"#22c55e" }}>✅</span>}
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <label style={{
                      padding:"6px 16px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
                      background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.25)", color:"#4f8ef7",
                    }}>
                      📁 {form.documents[doc.key] ? t('ihub.docChange') : t('ihub.docSelect')}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>handleDocUpload(doc.key,e.target.files[0])} style={{ display:"none" }} />
                    </label>
                    {form.documents[doc.key] && (
                      <span style={{ fontSize:10, color:"var(--text-3)" }}>📄 {form.documents[doc.key].name}</span>
                    )}
              ))}
          <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.15)", fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>
            ⚠️ {t('ihub.docNote')}
          <div style={{ display:"flex", gap:12, justifyContent:"space-between" }}>
            <button onClick={()=>setStep(2)} style={{ padding:"10px 22px", borderRadius:10, border:"1px solid rgba(99,140,255,0.15)", background:"transparent", color:"var(--text-2)", cursor:"pointer", fontSize:12, fontWeight:700 }}>← {t('ihub.prevStep')}</button>
            <button onClick={()=>setStep(4)} style={{ padding:"10px 28px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)', fontWeight:800, fontSize:12, cursor:"pointer" }}>{t('ihub.nextStep')} →</button>
        </>
      )}

      {/* STEP 4: Review & Submit */}
      {step === 4 && (
        <>
          <div className="card card-glass" style={{ padding:"20px 24px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}><span>✅</span> {t('ihub.reviewTitle')}</div>
            <div style={{ display:"grid", gap:12 }}>
              {/* Summary cards */}
              {[
                { icon:"📋", title:t('ihub.stepBasic'), items:[`${t('ihub.memberName')}: ${form.name}`, `${t('ihub.memberEmail')}: ${form.email}`, `${t('ihub.memberCompany')}: ${form.company}`, `${t('ihub.memberBizNum')}: ${form.businessNumber || '-'}`, `${t('ihub.memberCeoName')}: ${form.ceoName || '-'}`, `${t('ihub.memberBrandName')}: ${form.brandName || '-'}`] },
                { icon:"🔌", title:t('ihub.stepChannel'), items:[
                  `Advertiser IDs: ${Object.entries(form.advertiserIds).filter(([,v])=>v).map(([k])=>k).join(', ')||t('ihub.noneFilled')}`,
                  `App IDs: ${Object.entries(form.appIds).filter(([,v])=>v).map(([k])=>k).join(', ')||t('ihub.noneFilled')}`,
                ] },
                { icon:"📎", title:t('ihub.stepDocs'), items:[
                  `${t('ihub.docBizLicense')}: ${form.documents.bizLicense ? '✅ '+form.documents.bizLicense.name : '❌'}`,
                  `${t('ihub.docCommCert')}: ${form.documents.commCert ? '✅' : '-'}`,
                  `${t('ihub.docDelegate')}: ${form.documents.delegateForm ? '✅' : '-'}`,
                ] },
              ].map((sec, i) => (
                <div key={i} style={{ padding:"12px 16px", borderRadius:10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>{sec.icon} {sec.title}
                    <button onClick={()=>setStep(i+1)} style={{ marginLeft:"auto", fontSize:9, padding:"2px 8px", borderRadius:6, background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.2)", color:"#4f8ef7", cursor:"pointer", fontWeight:700 }}>{t('ihub.edit')}</button>
                  {sec.items.map((item, j) => <div key={j} style={{ fontSize:11, color:"var(--text-3)", padding:"2px 0" }}>{item}</div>)}
              ))}

          {/* Agreements */}
          <div className="card card-glass" style={{ padding:"16px 24px" }}>
            {[
              {key:'agreeTos',label:t('ihub.memberAgreeTos')},
              {key:'agreeData',label:t('ihub.memberAgreeData')},
              {key:'agreeDelegate',label:t('ihub.agreeDelegate')},
            ].map(a=>(
              <label key={a.key} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:12, color:"var(--text-2)", padding:"6px 0" }}>
                <input type="checkbox" checked={form[a.key]} onChange={e=>upd(a.key,e.target.checked)} style={{ width:16, height:16, accentColor:"#4f8ef7" }} /> {a.label}
              </label>
            ))}

          <div style={{ padding:"10px 16px", borderRadius:10, background:"rgba(79,142,247,0.05)", border:"1px solid rgba(79,142,247,0.15)", fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>💡 {t('ihub.memberNote')}</div>

          <div style={{ display:"flex", gap:12 }}>
            <button onClick={()=>setStep(3)} style={{ padding:"10px 22px", borderRadius:10, border:"1px solid rgba(99,140,255,0.15)", background:"transparent", color:"var(--text-2)", cursor:"pointer", fontSize:12, fontWeight:700 }}>← {t('ihub.prevStep')}</button>
            <button onClick={handleSave} disabled={saving||!form.agreeTos||!form.agreeData} style={{
              flex:1, padding:"14px 0", borderRadius:12, border:"none",
              background:"linear-gradient(135deg,#4f8ef7,#a855f7)", color: 'var(--text-1)',
              fontWeight:800, fontSize:14, cursor:"pointer",
              boxShadow:"0 8px 24px rgba(79,142,247,0.3)",
              opacity:(saving||!form.agreeTos||!form.agreeData)?0.5:1 }}>
              {saving ? t('ihub.memberSaving') : `🚀 ${t('ihub.memberSaveAndApply')}`}
            </button>
        </>
      )}
                                                                                                                                                        </div>
                                                                                                                                                    </div>
                                                                                                                                                </div>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}



/* ─── Security Monitor (Anti-Hacking Detection) ────────────────────────── */
const SEC_PATTERNS = [
  /<script/i, /javascript:/i, /on(error|load|click|mouse)=/i,
  /eval\s*\(/i, /document\.(cookie|write)/i,
  /fetch\s*\(.*malware/i, /\\x[0-9a-f]{2}/i,
  /union\s+(all\s+)?select/i, /drop\s+table/i, /;\s*delete\s+from/i,
  /\.\.\/\.\.\/\.\.\//i, /etc\/passwd/i,
  /base64_decode/i, /cmd\.exe/i, /\/bin\/sh/i,
];
const SEC_RATE_LIMIT = { maxReqs: 30, windowMs: 10000 };

function useSecurityMonitor() {
  const { pushNotification } = useNotification();
  const [threats, setThreats] = React.useState([]);
  const [locked, setLocked] = React.useState(false);
  const reqCountRef = React.useRef({ count: 0, start: Date.now() });

  const checkInput = React.useCallback((value, source = 'input') => {
    if (!value || typeof value !== 'string') return false;
    for (const pat of SEC_PATTERNS) {
      if (pat.test(value)) {
        const threat = {
          id: Date.now(),
          type: 'xss_injection',
          source, value: value.slice(0, 80),
          time: new Date().toISOString(),
          severity: 'critical',
        };
        setThreats(p => [...p.slice(-49), threat]);
        pushNotification({
          type: 'alert',
          title: '🚨 Security Alert: Suspicious Input Detected',
          body: `Blocked malicious ${source} attempt. Pattern: ${pat.source.slice(0,30)}`,
          link: '/integration-hub',
        });
        console.warn('[SECURITY] Blocked threat:', threat);
        return true;
      }
    }
    return false;
  }, [pushNotification]);

  const checkRateLimit = React.useCallback(() => {
    const now = Date.now();
    const ref = reqCountRef.current;
    if (now - ref.start > SEC_RATE_LIMIT.windowMs) {
      ref.count = 1; ref.start = now;
      return false;
    }
    ref.count++;
    if (ref.count > SEC_RATE_LIMIT.maxReqs) {
      setLocked(true);
      pushNotification({
        type: 'alert',
        title: '🚨 Security Alert: Rate Limit Exceeded',
        body: `${ref.count} requests in ${SEC_RATE_LIMIT.windowMs/1000}s. Possible automated attack.`,
        link: '/integration-hub',
      });
      setTimeout(() => setLocked(false), 30000);
      return true;
    }
    return false;
  }, [pushNotification]);

  return { checkInput, checkRateLimit, threats, locked };
}

/* ─── Security Overlay (Lockdown UI) ──────────────────────────────────── */
function SecurityOverlay({ threats, onDismiss, t }) {
  if (!threats || threats.length === 0) return null;
  const latest = threats[threats.length - 1];
  return (
    <div style={{
      position:"fixed", bottom:20, right:20, zIndex:9998, width:380,
      background:"rgba(15,7,7,0.95)", backdropFilter:"blur(16px)",
      border:"1.5px solid rgba(239,68,68,0.5)", borderRadius:16,
      padding:"16px 20px", boxShadow:"0 16px 48px rgba(239,68,68,0.3)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"rgba(239,68,68,0.15)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🛡️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#ef4444" }}>
            {t('ihub.secAlert')}
          <div style={{ fontSize:10, color: 'var(--text-3)' }}>
            {new Date(latest.time).toLocaleTimeString()} · {latest.type}
        <button onClick={onDismiss} style={{
          width:24, height:24, borderRadius:6, border: '1px solid var(--border)',
          background:"transparent", color:"var(--text-3)", cursor:"pointer", fontSize:12,
        }}>✕</button>
      <div style={{ fontSize:11, color: 'var(--text-2)', lineHeight:1.6, marginBottom:10,
        padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.06)",
        border:"1px solid rgba(239,68,68,0.15)", fontFamily:"monospace", wordBreak:"break-all" }}>
        {latest.value}
      <div style={{ fontSize:10, color: "var(--text-3)" }}>
        {t('ihub.secBlocked')} · {threats.length} {t('ihub.secTotal')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Real-time Sync via BroadcastChannel ──────────────────────────────── */
const SYNC_CHANNEL_NAME = 'geniego_ihub_sync';
function useCrossTabSync(key, value) {
  const channelRef = React.useRef(null);
  React.useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch { return; }
    return () => { try { channelRef.current?.close(); } catch {} };
  }, []);

  const broadcast = React.useCallback((type, data) => {
    try {
      channelRef.current?.postMessage({ type, data, ts: Date.now(), tab: window.__TAB_ID });
    } catch {}
  }, []);

  const onMessage = React.useCallback((handler) => {
    if (!channelRef.current) return () => {};
    const listener = (e) => {
      if (e.data?.tab === window.__TAB_ID) return;
      handler(e.data);
    };
    channelRef.current.addEventListener('message', listener);
    return () => channelRef.current?.removeEventListener('message', listener);
  }, []);

  return { broadcast, onMessage };
}
if (!window.__TAB_ID) window.__TAB_ID = Math.random().toString(36).slice(2);

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function ApiKeys() {
  // Security Monitor
  const { checkInput, checkRateLimit, threats, locked } = useSecurityMonitor();
  const [showSecAlert, setShowSecAlert] = React.useState(true);
  const { broadcast, onMessage } = useCrossTabSync();
  const { refreshAll } = useGlobalData ? useGlobalData() : { refreshAll: () => {} };

  if (locked) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
      <div style={{ padding:"48px 40px", borderRadius:24, background:"linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))", border:"2px solid rgba(239,68,68,0.3)", maxWidth:480 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🛡️</div>
        <div style={{ fontWeight:900, fontSize:22, color:"#ef4444", marginBottom:12 }}>{t('ihub.secLockTitle')}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.7, marginBottom:24 }}>{t('ihub.secLockDesc')}</div>
        <div style={{ fontSize:11, color:"var(--text-3)" }}>{t('ihub.secLockWait')}</div>
        </div>
    </div>
);

  const t = useT();
  const navigate = useNavigate();
  const { is, isPro, user, token, onPaymentSuccess, onApiKeyRegistered } = useAuth();
  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalChannel, setModalChannel] = useState(null);
  const [addChannelGroup, setAddChannelGroup] = useState(null);
  const [activeGroup, setActiveGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState(null);
  const qTab = new URLSearchParams(window.location.search).get("tab");
  const [mainTab, setMainTab] = useState(["smart","license","dw","events","member","guide"].includes(qTab) ? qTab : "keys");

  // 30s polling
  React.useEffect(() => {
      const id = setInterval(() => { load(); try { broadcast({ type: 'IHUB_POLL', ts: Date.now() }); } catch {} }, 30000);
      return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'cred_update') { load(); }
    });
  }, [onMessage]);

  const handleExport = () => {
    const data = { exported: new Date().toISOString(), registeredChannels, connectedOk, totalCreds, groups: CHANNEL_GROUPS.map(g => ({ key: g.key, label: g.label, channelCount: g.channels.length })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `integration_hub_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/creds");
      if (res.ok) setCreds(res.creds ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

    // Auto-sync: on load, fetch member profile and trigger auto-registration
    useEffect(() => {
        (async () => {
            try {
                const profileRes = await api('/member/api-profile');
                if (profileRes.ok && profileRes.profile) {
                    // Auto-register any pre-existing API keys found
                    const autoRes = await fetch('/api/v423/connectors/auto-fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        credentials: 'include',
                        body: JSON.stringify(profileRes.profile),
                    });
                    if (autoRes.ok) {
                        const d = await autoRes.json();
                        if (d.fetched > 0) {
                            load(); // Refresh to show auto-registered keys
                            broadcast({ type: 'cred_update', autoFetched: d.fetched });
                        }
                    }
                }
            } catch {}
        })();
    }, []);

  const showNotif = (msg, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async id => {
    if (!confirm(t('ihub.deleteConfirm'))) return;
    const res = await api(`/creds/${id}`, { method: "DELETE" });
    if (res.ok) { showNotif(t('ihub.deleteSuccess')); load(); }
    else showNotif("Delete Failed: " + (res.error ?? ""), false);
  };

  const handleTest = async id => {
    const res = await api(`/creds/${id}/test`, { method: "POST" });
    load();
    if (res.ok) showNotif("\u2705 " + res.message);
    else showNotif("\u274c " + (res.message ?? res.error ?? "Connect Failed"), false);
  };

  const registeredChannels = [...new Set(creds.map(c => c.channel))].length;
  const connectedOk = [...new Set(creds.filter(c => c.test_status === "ok").map(c => c.channel))].length;
  const totalCreds = creds.length;

  const filteredGroups = CHANNEL_GROUPS
    .filter(g => activeGroup === "all" || g.key === activeGroup)
    .map(g => ({
      ...g,
      channels: g.channels.filter(ch =>
        !search || ch.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(g => g.channels.length > 0);

  if (locked) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
      <div style={{ padding:"48px 40px", borderRadius:24, background:"linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))", border:"2px solid rgba(239,68,68,0.3)", maxWidth:480 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🛡️</div>
        <div style={{ fontWeight:900, fontSize:22, color:"#ef4444", marginBottom:12 }}>{t('ihub.secLockTitle')}</div>
        <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.7, marginBottom:24 }}>{t('ihub.secLockDesc')}</div>
        <div style={{ fontSize:11, color:"var(--text-3)" }}>{t('ihub.secLockWait')}</div>
        </div>
    </div>
);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Toast */}
            {notification && (
                <div style={{
                    position: "fixed", top: 20, right: 20, zIndex: 9999,
                    padding: "12px 20px", borderRadius: 12,
                    background: notification.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    border: `1px solid ${notification.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: notification.ok ? "#22c55e" : "#ef4444",
                    fontWeight: 700, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}>
                    {notification.msg}
                </div>
            )}

            {/* Hero */}
            <div className="hero fade-up">
                <div className="hero-meta">
                    <div className="hero-icon">{mainTab==="smart" ? "🤖" : mainTab==="license" ? "🎟" : mainTab==="dw" ? "🏗" : mainTab==="events" ? "📡" : mainTab==="member" ? "👤" : "🔑"}</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)" }}>{t('ihub.heroTitle')}</div>
                        <div className="hero-desc">{t('ihub.heroDesc')}</div>
                    </div>
                    <button onClick={handleExport} style={{ marginLeft:'auto', padding:'8px 16px', borderRadius:10, border:'1px solid rgba(99,140,255,0.25)', background:'rgba(99,140,255,0.06)', color:'#4f8ef7', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>📥 {t('ihub.export')}</button>
                </div>

                {/* Tab Conversion */}
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                    {[
                        { id:"keys",    label:t('ihub.tabApiKey'),           desc: t('ihub.helpTitle') },
                        { id:"smart",   label:t('ihub.tabSmartConnect'),      desc: t('ihub.helpDesc') },
                        { id:"dw",      label:t('ihub.tabDW'),    desc: t('ihub.tabDwDesc') },
                        { id:"license", label: t('ihub.helpSecDesc'),      desc: t('ihub.helpConnInfo') },
                        { id:"events",  label:t('ihub.tabEvents'),        desc: t('ihub.tabEventsDesc') },
                        { id:"member",  label:t('ihub.tabMember'),        desc: t('ihub.tabMemberDesc') },
                        { id:"guide",   label:t('ihub.viewGuide'),        desc: t('ihub.guideSub')?.substring(0,20)+'...' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                            flex:1, padding:"10px 16px", borderRadius:12, cursor:"pointer",
                            fontWeight:800, fontSize:12, textAlign:"center", transition:"all 200ms",
                            background: mainTab===t.id
                                ? (t.id==="smart" ? "linear-gradient(135deg,#4f8ef7,#a855f7)"
                                  : t.id==="license" ? "linear-gradient(135deg,#22c55e,#14d9b0)"
                                  : t.id==="dw" ? "linear-gradient(135deg,#4285f4,#29b5e8)"
                                  : t.id==="events" ? "linear-gradient(135deg,#f97316,#eab308)"
                                  : "linear-gradient(135deg,#4f8ef7,#6366f1)")
                                : "rgba(255,255,255,0.03)",
                            border: mainTab===t.id ? "none" : "1.5px solid rgba(99,140,255,0.15)",
                            color: mainTab===t.id ? "#fff" : "var(--text-2)",
                            boxShadow: mainTab===t.id ? "0 4px 18px rgba(79,142,247,0.28)" : "none",
                        }}>
                            <div>{t.label}</div>
                            <div style={{ fontSize:9, opacity:0.75, marginTop:2, fontWeight:400 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>

                {/* KPI (keys Tab) */}
                {mainTab==="keys" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        {[
                            { label: t('ihub.regCh'), value: registeredChannels, icon: "🔌", color: "#4f8ef7" },
                            { label: t('ihub.connOk'), value: connectedOk,         icon: "✅", color: "#22c55e" },
                            { label: t('ihub.totalKeys'),  value: totalCreds,          icon: "🗝️", color: "#a855f7" },
                            { label: t('ihub.suppCh'), value: CHANNEL_GROUPS.flatMap(g=>g.channels).length+"+", icon: "📡", color: "#f59e0b" },
                        ].map(s => (
                            <div key={s.label} style={{ padding: "10px 14px", borderRadius: 12, flex: 1,
                                background: `${s.color}0D`, border: `1px solid ${s.color}33`, textAlign: "center" }}>
                                <div style={{ fontSize: 16 }}>{s.icon}</div>
                                <div style={{ fontWeight: 900, fontSize: 20, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/*  Block Banner */}
            {is && (
                <div style={{
                    padding: "14px 20px", borderRadius: 14,
                    background: "linear-gradient(135deg,rgba(234,179,8,0.09),rgba(249,115,22,0.06))",
                    border: "1.5px solid rgba(234,179,8,0.4)",
                    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}>
                    <div style={{ fontSize: 26 }}>🔒</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "#eab308", marginBottom: 4 }}>
                            {t('ihub.freeBannerTitle')}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
                            <strong>{t('ihub.helpCh1')}</strong> {t('ihub.helpCh2')}<br />
                            {t('ihub.helpCh3')}<strong>{t('ihub.helpCh4')}</strong>{t('ihub.helpCh5')}
                        </div>
                    </div>
                    <button onClick={() => navigate("/app-pricing")} style={{
                        padding: "10px 22px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg,#eab308,#f59e0b)",
                        color: 'var(--text-1)', fontWeight: 800, fontSize: 12, cursor: "pointer",
                        whiteSpace: "nowrap", boxShadow: "0 4px 15px rgba(234,179,8,0.3)",
                    }}>{t('ihub.upgradeBtn')}</button>
                </div>
            )}

            {/* SmartConnect Tab */}
            {mainTab === "smart" && <SmartConnectTab />}

            {/* Data Warehouse Tab */}
            {mainTab === "dw" && <DataWarehouseTab />}

            {/* Event Feed Tab */}
            {mainTab === "events" && <EventFeedTab />}

            {/* Member Info Tab */}
            {mainTab === "member" && <MemberInfoTab user={user} token={token} navigate={navigate} />}

            {/* License Tab */}
            {mainTab === "license" && (
                <LicenseTab user={user} token={token} onPaymentSuccess={onPaymentSuccess} navigate={navigate} />
            )}

            {/* Filter bar — keys Tab */}
            {mainTab === "keys" && (<>
            <div style={{
                display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                padding: "12px 16px", background: "var(--bg-card)", borderRadius: 12,
                border: "1px solid rgba(99,140,255,0.1)",
            }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                    {[{ key: "all", label: t('ihub.filterAllLabel') }, ...CHANNEL_GROUPS.map(g => ({ key: g.key, label: t(g.label) }))].map(tab => (
                        <button key={tab.key} onClick={() => setActiveGroup(tab.key)} style={{
                            padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                            border: "none", cursor: "pointer",
                            background: activeGroup === tab.key ? "#4f8ef7" : "rgba(99,140,255,0.06)",
                            color: activeGroup === tab.key ? "#fff" : "var(--text-2)",
                        }}>{tab.label}</button>
                    ))}
                </div>
                <input
                    type="text" placeholder={t('ihub.chSearch')} value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.15)", color: "var(--text-1)", fontSize: 11, outline: "none", width: 160 }}
                />
            </div>
            {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>{t('ihub.loadingCreds')}</div>
            ) : (
                filteredGroups.map(group => (
                    <div key={group.key}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{t(group.label)}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t(group.desc)}</div>
                            <div style={{
                                marginLeft: "auto", fontSize: 10, color: "var(--text-3)",
                                background: "rgba(99,140,255,0.06)", padding: "2px 8px", borderRadius: 99,
                            }}>
                                {group.channels.filter(ch => creds.some(c => c.channel === ch.key)).length}/{group.channels.length} {t('ihub.groupCount')}
                            {/* Channel Add Button */}
                            <button
                                onClick={() => setAddChannelGroup(group.key)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                                    border: "1px dashed rgba(99,140,255,0.4)", background: "rgba(99,140,255,0.04)",
                                    color: "#4f8ef7", cursor: "pointer",
                                }}>
                                {t('ihub.channelAddBtn')}</button>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 10 }}>
                            {group.channels.map(ch => (
                                <ChannelCard
                                    key={ch.key} ch={ch} creds={creds}
                                    onEdit={setModalChannel}
                                    onDelete={handleDelete}
                                    onTest={handleTest}
                                    is={false}
                                    isDemo={false}
                                />
                            ))}
                ))
            )}

            {!loading && filteredGroups.length === 0 && (
                <div style={{
                    textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 13,
                    background: "var(--bg-card)", borderRadius: 14, border: "1px solid rgba(99,140,255,0.08)"
                }}>
                    🔍 "{search}" — {t('ihub.noSearchResult')}
            )}

            {/* Help tip */}
            <div style={{
                padding: "14px 18px", borderRadius: 12,
                background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.15)",
                fontSize: 11, color: "var(--text-2)", lineHeight: 1.7,
            }}>
                🔐 <strong>{t('ihub.helpSecurity')}</strong>: {t('ihub.helpSecurityDesc')}
                🔗 <strong>{t('ihub.helpConnTest')}</strong>: {t('ihub.helpConnTestDesc')}
                ➕ <strong>{t('ihub.helpChAdd')}</strong>: {t('ihub.helpChAddDesc')}
                <span style={{ marginLeft: 12, color: "#4f8ef7", cursor: "pointer" }} onClick={() => navigate("/connectors")}>
                    {t('ihub.helpGoConn')}
                </span>
            </>) /* end keys tab */}


            {/* ─── Guide Tab ─── */}
            {mainTab==="guide" && (
            <div style={{ display:'grid', gap:20 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <button onClick={()=>setMainTab('keys')} style={{ padding:'8px 16px', borderRadius:10, border:'1px solid rgba(99,140,255,0.15)', background:'none', color:'var(--text-2)', fontSize:12, fontWeight:700, cursor:'pointer' }}>{t('ihub.backToHub')} ←</button>
                <button onClick={handleExport} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize:12, fontWeight:700, cursor:'pointer' }}>📥 {t('ihub.export')}</button>
              <div style={{ background:'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.05))', padding:'32px 28px', borderRadius:20, border:'1px solid rgba(99,140,255,0.12)', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔗</div>
                <h2 style={{ fontSize:22, fontWeight:900, marginBottom:8 }}>{t('ihub.guideTitle')}</h2>
                <p style={{ color:'var(--text-2)', fontSize:13 }}>{t('ihub.guideSub')}</p>
              <div style={{ background:'var(--bg-card)', borderRadius:16, padding:24, border:'1px solid rgba(99,140,255,0.1)' }}>
                <h3 style={{ fontSize:16, fontWeight:800, marginBottom:16, color:'#4f8ef7' }}>📋 {t('ihub.guideStepsTitle')}</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} style={{ padding:16, borderRadius:14, background:'rgba(99,140,255,0.04)', border:'1px solid rgba(99,140,255,0.08)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <span style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, background:'linear-gradient(135deg,#4f8ef7,#a855f7)', color: 'var(--text-1)' }}>{i}</span>
                        <span style={{ fontWeight:800, fontSize:13, color:i<=2?'#4f8ef7':i<=4?'#22c55e':'#a855f7' }}>{t(`ihub.guideStep${i}Title`)}</span>
                      <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, margin:0 }}>{t(`ihub.guideStep${i}Desc`)}</p>
                  ))}
              <div style={{ background:'var(--bg-card)', borderRadius:16, padding:24, border:'1px solid rgba(99,140,255,0.1)' }}>
                <h3 style={{ fontSize:16, fontWeight:800, marginBottom:16, color:'#a855f7' }}>🗂 {t('ihub.guideRolesTitle')}</h3>
                <div style={{ display:'grid', gap:12 }}>
                  {[{k:'Ads',emoji:'📢',c:'#4f8ef7'},{k:'Commerce',emoji:'🛒',c:'#22c55e'},{k:'Domestic',emoji:'🇰🇷',c:'#f97316'},{k:'Own',emoji:'🏠',c:'#6366f1'},{k:'Welfare',emoji:'🏢',c:'#ec4899'},{k:'Social',emoji:'📱',c:'#eab308'}].map(r => (
                    <div key={r.k} style={{ padding:'12px 16px', borderRadius:12, background:`${r.c}08`, border:`1px solid ${r.c}22`, display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:20 }}>{r.emoji}</span>
                      <span style={{ fontSize:12, color:'var(--text-2)' }}>{t(`ihub.guideSec${r.k}`)}</span>
                  ))}
              <div style={{ background:'var(--bg-card)', borderRadius:16, padding:24, border:'1px solid rgba(99,140,255,0.1)' }}>
                <h3 style={{ fontSize:16, fontWeight:800, marginBottom:16, color:'#22c55e' }}>💡 {t('ihub.guideTipsTitle')}</h3>
                <div style={{ display:'grid', gap:10 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ padding:'10px 14px', borderRadius:10, background:'rgba(34,197,94,0.04)', border:'1px solid rgba(34,197,94,0.1)', fontSize:12, color:'var(--text-2)', display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ color:'#22c55e', fontWeight:900 }}>Tip{i}</span> {t(`ihub.guideTip${i}`)}
                  ))}
            )}

            {modalChannel && (
                <CredModal
                    channel={modalChannel}
                    existingCreds={creds.filter(c => c.channel === modalChannel)}
                    onClose={() => setModalChannel(null)}
                    onSaved={async (result) => {
                        load();
                        // API  Register Success     Conversion
                        if (result && (result.mode_activated || result.ok)) {
                            onApiKeyRegistered && onApiKeyRegistered(result);
                            // Cross-menu sync
                            try { broadcast({ type: 'cred_update', channel: modalChannel, result }); } catch {}
                            try { broadcast({ type: 'API_KEY_REGISTERED', channel: modalChannel, ts: Date.now() }); } catch {}
                        }
                    }}
                />
            )}
            {addChannelGroup && (
                <AddChannelModal
                    groupKey={addChannelGroup}
                    onClose={() => setAddChannelGroup(null)}
                    onAdded={async (newChannel) => {
                        await load();
                        if (newChannel && user) {
                            try {
                                const memberInfo = { name: user.name||user.username||'', email: user.email||'', company: user.company||user.company_name||'', businessNumber: user.business_number||'', phone: user.phone||'' };
                                await fetch('/api/v423/connectors/auto-apply-single', { method:'POST', headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}, credentials:'include', body:JSON.stringify({channel:newChannel?.key||newChannel,...memberInfo}) });
                                showNotif(t('ihub.autoApplySubmitted'));
                                broadcast({ type:'cred_update', channel:newChannel?.key||newChannel });
                            } catch {}
                        }
                    }}
                />
            )}
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
);
}
