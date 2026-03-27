import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useI18n } from '../i18n';
import { useAuth } from "../auth/AuthContext";
import useDemo from "../hooks/useDemo";
import { useNotification } from "../context/NotificationContext.jsx";

import { useT } from '../i18n/index.js';

/* Mocked defaults for removed DemoDataLayer */
const DEMO_CONNECTOR_STATE = {};

/* ─── Platform Definitions ──────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: "meta",
    name: "Meta (Facebook/Instagram)",
    icon: "📘",
    color: "#1877f2",
    authType: "oauth",
    scopes: ["ads_read", "ads_management", "business_management", "pages_read_engagement", "instagram_basic"],
    webhookEvents: ["ad_account_update", "leadgen", "page_post"],
    tokenExpiry: "60Day",
    docsUrl: "https://developers.facebook.com/docs/marketing-api",
  },
  {
    id: "tiktok",
    name: "TikTok for Business",
    icon: "🎵",
    color: "#ff0050",
    authType: "oauth",
    scopes: ["ad.read", "ad.write", "report.read", "campaign.read", "campaign.write"],
    webhookEvents: ["ad_account.update", "conversion", "pixel.track"],
    tokenExpiry: "24Hour (refresh 30Day)",
    docsUrl: "https://ads.tiktok.com/marketing_api/docs",
  },
  {
    id: "google",
    name: "Google Ads",
    icon: "🔍",
    color: "#4285f4",
    authType: "oauth",
    scopes: ["https://www.googleapis.com/auth/adwords", "https://www.googleapis.com/auth/analytics.readonly"],
    webhookEvents: ["conversion_upload", "offline_conversions"],
    tokenExpiry: "1Hour (refresh Required)",
    docsUrl: "https://developers.google.com/google-ads/api",
  },
  {
    id: "amazon",
    name: "Amazon SP-API",
    icon: "📦",
    color: "#ff9900",
    authType: "oauth",
    scopes: ["sellingpartnerapi:reports:read", "sellingpartnerapi:orders:read", "sellingpartnerapi:inventory:read"],
    webhookEvents: ["ORDER_CHANGE", "REPORT_PROCESSING_FINISHED", "FEED_PROCESSING_FINISHED"],
    tokenExpiry: "1Hour (LWA refresh token)",
    docsUrl: "https://developer-docs.amazon.com/sp-api",
  },
  {
    id: "coupang",
    name: "Coupang Wing",
    icon: "🇰🇷",
    color: "#00bae5",
    authType: "apikey",
    scopes: ["products:read", "orders:read", "settlement:read", "returns:read"],
    webhookEvents: ["order.created", "order.shipped", "order.cancelled", "settlement.completed"],
    tokenExpiry: "Unlimited (HMAC-SHA256 Signature)",
    docsUrl: "https://developers.coupangwing.com",
  },
  {
    id: "naver",
    name: "Naver Smart Store",
    icon: "🟢",
    color: "#03c75a",
    authType: "apikey",
    scopes: ["products.read", "orders.read", "settlement.read", "claims.read"],
    webhookEvents: ["ecom.order", "ecom.claim", "ecom.settlement"],
    tokenExpiry: "Unlimited (Client Secret)",
    docsUrl: "https://apicenter.commerce.naver.com",
  },
  {
    id: "shopify",
    name: "Shopify Admin",
    icon: "🛒",
    color: "#96bf48",
    authType: "oauth",
    scopes: ["read_products", "read_orders", "read_customers", "read_analytics"],
    webhookEvents: ["orders/create", "orders/updated", "products/update", "refunds/create"],
    tokenExpiry: "Unlimited (offline access token)",
    docsUrl: "https://shopify.dev/docs/admin-api",
  },
  {
    id: "11st",
    name: "11Street",
    icon: "🏬",
    color: "#ff0000",
    authType: "apikey",
    scopes: ["order:read", "product:read", "settlement:read"],
    webhookEvents: ["order.new", "order.cancel", "delivery.update"],
    tokenExpiry: "Unlimited (API + Secret)",
    docsUrl: "https://openapi.11st.co.kr",
  },
  {
    id: "rakuten",
    name: "Rakuten Ichiba (楽天市場)",
    icon: "🇯🇵",
    color: "#bf0000",
    authType: "apikey",
    scopes: ["item:read", "order:read", "settlement:read", "review:read", "shop:read"],
    webhookEvents: ["order.new", "order.cancel", "order.shipped", "settlement.created"],
    tokenExpiry: "Unlimited (Service Secret + License Key)",
    docsUrl: "https://webservice.rakuten.co.jp/documentation",
    badge: "🇯🇵 Japan",
  },
  {
    id: "yahoo_jp",
    name: "Yahoo! Shopping Japan",
    icon: "🔴",
    color: "#ff0033",
    authType: "oauth",
    scopes: ["openid", "address", "bb.order.read", "bb.item.read"],
    webhookEvents: ["order.payment_settled", "order.shipped"],
    tokenExpiry: "1Hour (refresh token 30Day)",
    docsUrl: "https://developer.yahoo.co.jp/webapi/shopping",
    badge: "🇯🇵 Japan",
  },
  {
    id: "shopify_app",
    name: "Shopify App Store",
    icon: "🏪",
    color: "#5c6ac4",
    authType: "oauth",
    scopes: ["read_products", "read_orders", "read_customers", "write_products", "read_analytics", "write_apps"],
    webhookEvents: ["app/subscriptions_approaches_capped_amount", "app_subscriptions/update", "app/uninstalled"],
    tokenExpiry: "Unlimited (offline token)",
    docsUrl: "https://shopify.dev/docs/apps/distribution",
    badge: "🌐 App Store",
  },
  {
    id: "aws_marketplace",
    name: "AWS Marketplace",
    icon: "☁️",
    color: "#ff9900",
    authType: "apikey",
    scopes: ["aws-marketplace:Subscribe", "aws-marketplace:Unsubscribe", "aws-marketplace:ViewSubscriptions", "metering:MeterUsage"],
    webhookEvents: ["subscribe-success", "subscribe-fail", "unsubscribe-pending", "entitlement-updated"],
    tokenExpiry: "Unlimited (IAM Key)",
    docsUrl: "https://docs.aws.amazon.com/marketplace",
    badge: "☁️ Cloud",
  },
  {
    id: "google_merchant",
    name: "Google Merchant Center",
    icon: "🛍️",
    color: "#34a853",
    authType: "oauth",
    scopes: ["https://www.googleapis.com/auth/content", "https://www.googleapis.com/auth/analytics.readonly"],
    webhookEvents: ["account_status_change", "product_status_change", "datafeed_fetch_error"],
    tokenExpiry: "1Hour (refresh Required)",
    docsUrl: "https://developers.google.com/shopping-content",
    badge: "🌐 Global",
  },
];

/* ─── Mock connector storage (브라우저 로컬 Status) ────────────────────────────── */
const DEFAULT_STATE = () =>
  Object.fromEntries(
    PLATFORMS.map(p => [
      p.id,
      {
        status: "disconnected", // disconnected | connecting | connected | error
        accessToken: "",
        refreshToken: "",
        apiKey: "",
        apiSecret: "",
        expiresAt: null,
        grantedScopes: [],
        webhookUrl: `https://genie-roi.example.com/webhooks/${p.id}`,
        webhookSecret: `whsec_demo_${p.id}_${Math.random().toString(36).slice(2, 10)}`,
        webhookEvents: [],
        lastEvent: null,
        tokenAge: null,
      },
    ])
  );

const WEBHOOK_FEED_MOCK = [
  { id: 1, platform: "meta", event: "ad_account_update", ts: "16:26:11", status: "ok", payload: '{"account_id":"act_123","event":"BUDGET_CHANGE","value":50000}' },
  { id: 2, platform: "tiktok", event: "conversion", ts: "16:22:44", status: "ok", payload: '{"advertiser_id":"7001","event":"PURCHASE","value":128000}' },
  { id: 3, platform: "coupang", event: "order.created", ts: "16:19:03", status: "ok", payload: '{"orderId":"OID-20260304-0041","amount":89000,"sku":"WH-1000XM5"}' },
  { id: 4, platform: "amazon", event: "ORDER_CHANGE", ts: "16:15:27", status: "ok", payload: '{"AmazonOrderId":"114-9876543-1234567","OrderStatus":"Shipped"}' },
  { id: 5, platform: "naver", event: "ecom.settlement", ts: "16:10:58", status: "warn", payload: '{"settlementId":"NST-2026030401","amount":2400000}' },
  { id: 6, platform: "rakuten", event: "order.new", ts: "16:08:21", status: "ok", payload: '{"orderNumber":"RK-20260304-00128","itemCode":"WH-1000XM5-JP","orderPrice":39800}' },
  { id: 7, platform: "yahoo_jp", event: "order.payment_settled", ts: "16:05:44", status: "ok", payload: '{"orderId":"YJ-2026030400891","amount":29700,"currency":"JPY"}' },
  { id: 8, platform: "shopify", event: "orders/create", ts: "16:07:32", status: "ok", payload: '{"id":5001,"total_price":"129000","email":"user@example.com"}' },
  { id: 9, platform: "meta", event: "leadgen", ts: "15:58:19", status: "error", payload: '{"error":"signature_mismatch","expected":"abc123","received":"xyz789"}' },
  { id: 10, platform: "google", event: "conversion_upload", ts: "15:41:00", status: "ok", payload: '{"conversion_name":"Purchase","conversion_value":79000}' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function PlatformIcon({ p, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, background: p.color + "22",
      border: `1.5px solid ${p.color}44`, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.5, flexShrink: 0
    }}>
      {p.icon}
    </div>
  );
}

function StatusPill({ status }) {
  
  const cfg = {
    connected: { label: t('super.conStatConn') || "Connected", cls: "badge-green", dot: "dot-green" },
    connecting: { label: t('super.conStatConnProg') || "Connect in progress…", cls: "badge-blue", dot: "dot-blue" },
    disconnected: { label: t('super.conStatDiscon') || "Disconnected", cls: "badge", dot: "" },
    error: { label: t('super.conStatErr') || "Error", cls: "badge-red", dot: "dot-red" },
  }[status] || { label: status, cls: "badge", dot: "" };
  return (
    <span className={`badge ${cfg.cls}`} style={{ fontSize: 10 }}>
      {cfg.dot && <span className={`dot ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}

function CopyBtn({ text }) {
  
  const [copied, setCopied] = useState(false);
  return (
    <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }}
      onClick={() => { navigator.clipboard.writeText(text).catch(() => { }); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? (t('super.conCopied') || "✓ Copy됨") : (t('super.conCopy') || "Copy")}
    </button>
  );
}

/* ─── OAuth Flow Simulator ────────────────────────────────────────────────────── */
function OAuthFlow({ p, state, onUpdate }) {
  
  const [step, setStep] = useState(0); // 0=idle 1=redirect 2=callback 3=done
  const [selScopes, setSelScopes] = useState(new Set(p.scopes));
  const [busy, setBusy] = useState(false);

  const startOAuth = async () => {
    setBusy(true);
    onUpdate(p.id, { status: "connecting" });
    setStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setStep(2);
    await new Promise(r => setTimeout(r, 1000));
    // Simulate token exchange
    const now = Date.now();
    const expMs = p.id === "google" ? 3600 : p.id === "tiktok" ? 86400 : 5184000;
    onUpdate(p.id, {
      status: "connected",
      accessToken: `ya29.demo_${p.id}_access_${Math.random().toString(36).slice(2, 12)}`,
      refreshToken: `1//demo_${p.id}_refresh_${Math.random().toString(36).slice(2, 14)}`,
      grantedScopes: [...selScopes],
      expiresAt: new Date(now + expMs * 1000).toISOString(),
      tokenAge: now,
      webhookEvents: p.webhookEvents.slice(0, 2),
    });
    setStep(3);
    setBusy(false);
  };

  const refreshToken = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 900));
    const expMs = p.id === "google" ? 3600 : 86400;
    onUpdate(p.id, {
      accessToken: `ya29.refreshed_${p.id}_${Math.random().toString(36).slice(2, 12)}`,
      expiresAt: new Date(Date.now() + expMs * 1000).toISOString(),
      tokenAge: Date.now(),
    });
    setBusy(false);
  };

  const disconnect = () => {
    setStep(0);
    onUpdate(p.id, { status: "disconnected", accessToken: "", refreshToken: "", grantedScopes: [], expiresAt: null });
  };

  return (
    <div>
      {/* Scope selector */}
      {state.status !== "connected" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 8 }}>{t('super.conLabelPermSel') || "Select Permission"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.scopes.map(s => {
              const on = selScopes.has(s);
              return (
                <button key={s} onClick={() => {
                  const n = new Set(selScopes);
                  if (on) n.delete(s); else n.add(s);
                  setSelScopes(n);
                }} style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 10, cursor: "pointer", fontWeight: 600,
                  background: on ? p.color + "22" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${on ? p.color + "66" : "rgba(99,140,255,0.15)"}`,
                  color: on ? p.color : "var(--text-3)",
                  transition: "all 150ms",
                }}>
                  {on ? "✓ " : ""}{s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* OAuth step indicator */}
      {step > 0 && step < 3 && (
        <div style={{ padding: "12px 14px", background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {[
              { n: 1, label: "Auth Page 리다이렉트" },
              { n: 2, label: "콜백 · 코드 교환" },
              { n: 3, label: "Token Save Done" },
            ].map(x => (
              <div key={x.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: step >= x.n ? p.color : "rgba(255,255,255,0.08)",
                  color: step >= x.n ? "#fff" : "var(--text-3)",
                  transition: "all 0.3s",
                }}>{x.n}</div>
                <span style={{ fontSize: 10, color: step >= x.n ? "var(--text-1)" : "var(--text-3)" }}>{x.label}</span>
                {x.n < 3 && <span style={{ color: "var(--text-3)", fontSize: 10 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected state */}
      {state.status === "connected" && (
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <div style={{ padding: "12px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ Access Token</div>
              <CopyBtn text={state.accessToken} />
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-2)", wordBreak: "break-all" }}>
              {state.accessToken.slice(0, 40)}…
            </div>
          </div>
          {state.refreshToken && (
            <div style={{ padding: "10px 14px", background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.1)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 4 }}>Refresh Token</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-2)", wordBreak: "break-all" }}>
                {state.refreshToken.slice(0, 40)}…
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "10px 12px", background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.08)", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>Expired 예정</div>
              <div style={{ fontSize: 11, color: "var(--text-1)", marginTop: 4 }}>
                {state.expiresAt ? new Date(state.expiresAt).toLocaleString("ko-KR") : p.tokenExpiry}
              </div>
            </div>
            <div style={{ padding: "10px 12px", background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.08)", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>부여된 Permission</div>
              <div style={{ fontSize: 11, color: p.color, marginTop: 4, fontWeight: 700 }}>{state.grantedScopes.length}개</div>
            </div>
          </div>
          {state.grantedScopes.length > 0 && (
            <div style={{ padding: "10px 12px", background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.08)", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>부여된 Permission 범위</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {state.grantedScopes.map(s => (
                  <span key={s} className="badge badge-green" style={{ fontSize: 9 }}>✓ {s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {state.status !== "connected" ? (
        <button className="btn-primary" style={{ background: `linear-gradient(135deg,${p.color},${p.color}cc)`, boxShadow: `0 4px 16px ${p.color}33` }}
          onClick={startOAuth} disabled={busy || selScopes.size === 0}>
          {busy ? "⏳ Auth in progress…" : t('super.conAuthStart')}
        </button>
      ) : (
        <>
          <button className="btn-primary" style={{ background: "linear-gradient(135deg,#22c55e,#14d9b0)" }}
            onClick={refreshToken} disabled={busy}>
            {busy ? "⏳" : t('super.conRefresh')}
          </button>
            <button className="btn-ghost" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
              onClick={disconnect}>
              {t('super.conDisconnect')}
            </button>
          </>
        )}
        <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 11 }}>
          📖 {t('super.conApiDocs')}
        </a>
      </div>
    </div>
  );
}

/* ─── API Flow ──────────────────────────────────────────────────────────── */
function ApiKeyFlow({ p, state, onUpdate }) {
  
  const [key, setKey] = useState(state.apiKey || "");
  const [secret, setSecret] = useState(state.apiSecret || "");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const connect = async () => {
    if (!key) return;
    setBusy(true);
    onUpdate(p.id, { status: "connecting" });
    await new Promise(r => setTimeout(r, 800));
    onUpdate(p.id, {
      status: "connected",
      apiKey: key,
      apiSecret: secret,
      grantedScopes: p.scopes,
      expiresAt: null,
      tokenAge: Date.now(),
      webhookEvents: p.webhookEvents.slice(0, 2),
    });
    setBusy(false);
  };

  const disconnect = () => {
    setKey(""); setSecret("");
    onUpdate(p.id, { status: "disconnected", apiKey: "", apiSecret: "", grantedScopes: [] });
  };

  return (
    <div>
      {state.status !== "connected" && (
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <div>
            <label className="input-label">{t('super.conInputApiKey') || "API *"}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="input" type={show ? "text" : "password"} value={key}
                onChange={e => setKey(e.target.value)} placeholder={`${p.name} API`} style={{ flex: 1 }} />
              <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}
                onClick={() => setShow(v => !v)}>{show ? "숨김" : "표시"}</button>
            </div>
          </div>
          {secret !== undefined && (
            <div>
              <label className="input-label">{t('super.conApiSecretStr')}</label>
              <input className="input" type={show ? "text" : "password"} value={secret}
                onChange={e => setSecret(e.target.value)} placeholder="Select 사항 (HMAC Signature용)" />
            </div>
          )}
          <div style={{ padding: "8px 12px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 8, fontSize: 11, color: "#eab308" }}>
            ⚠ API는 브라우저 세션에만 Temporary Save됩니다. Pro덕션에서는 KMS/Vault secrets_ref를 사용하세요.
          </div>
        </div>
      )}

      {state.status === "connected" && (
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <div style={{ padding: "12px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✓ API Connected</div>
              <CopyBtn text={state.apiKey} />
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-2)" }}>
              {state.apiKey.slice(0, 8)}{"*".repeat(Math.max(0, state.apiKey.length - 8))}
            </div>
          </div>
          <div style={{ padding: "10px 12px", background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.08)", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>부여된 Permission 범위</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {state.grantedScopes.map(s => (
                <span key={s} className="badge badge-green" style={{ fontSize: 9 }}>✓ {s}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: "8px 12px", background: "rgba(9,15,30,0.5)", border: "1px solid rgba(99,140,255,0.08)", borderRadius: 8, fontSize: 11, color: "var(--text-2)" }}>
            🔑 갱신 주기: {p.tokenExpiry}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {state.status !== "connected" ? (
          <button className="btn-primary" style={{ background: `linear-gradient(135deg,${p.color},${p.color}cc)` }}
            onClick={connect} disabled={busy || !key}>
            {busy ? "⏳ Confirm in progress…" : t('super.conApiConn')}
          </button>
        ) : (
          <button className="btn-ghost" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
            onClick={disconnect}>{t('super.conDisconnect')}</button>
        )}
        <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 11 }}>
          📖 {t('super.conApiDocs')}
        </a>
      </div>
    </div>
  );
}

/* ─── Webhook Config ────────────────────────────────────────────────────────── */
function WebhookConfig({ p, state, onUpdate }) {
  
  const [selEvents, setSelEvents] = useState(new Set(state.webhookEvents || []));
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const toggleEvent = e => {
    const n = new Set(selEvents);
    if (n.has(e)) n.delete(e); else n.add(e);
    setSelEvents(n);
    onUpdate(p.id, { webhookEvents: [...n] });
  };

  const sendTest = async () => {
    setTestBusy(true); setTestResult(null);
    await new Promise(r => setTimeout(r, 700));
    setTestResult({ ok: true, status: 200, latency: Math.floor(Math.random() * 80 + 30), ts: new Date().toLocaleTimeString("ko-KR") });
    onUpdate(p.id, { lastEvent: { event: p.webhookEvents[0], ts: new Date().toLocaleTimeString("ko-KR"), status: "ok" } });
    setTestBusy(false);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Endpoint */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>Webhook Count신 엔드포인트</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{
            flex: 1, fontFamily: "monospace", fontSize: 11, padding: "8px 12px",
            background: "rgba(9,15,30,0.8)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)",
            color: "#4f8ef7", wordBreak: "break-all"
          }}>
            {state.webhookUrl}
          </div>
          <CopyBtn text={state.webhookUrl} />
        </div>
      </div>

      {/* Secret */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>Webhook Signature Secret</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{
            flex: 1, fontFamily: "monospace", fontSize: 10, padding: "8px 12px",
            background: "rgba(9,15,30,0.8)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)",
            color: "var(--text-2)", wordBreak: "break-all"
          }}>
            {state.webhookSecret}
          </div>
          <CopyBtn text={state.webhookSecret} />
        </div>
      </div>

      {/* Event subscription */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 8 }}>Count신할 Event</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {p.webhookEvents.map(e => {
            const on = selEvents.has(e);
            return (
              <button key={e} onClick={() => toggleEvent(e)} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 10, cursor: "pointer", fontWeight: 600,
                background: on ? p.color + "22" : "rgba(255,255,255,0.03)",
                border: `1px solid ${on ? p.color + "55" : "rgba(99,140,255,0.1)"}`,
                color: on ? p.color : "var(--text-3)", transition: "all 150ms",
              }}>
                {on ? "✓ " : ""}{e}
              </button>
            );
          })}
        </div>
      </div>

      {/* Test button */}
      <div>
        <button className="btn-primary" style={{ fontSize: 11, padding: "7px 16px", background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
          onClick={sendTest} disabled={testBusy || state.status !== "connected"}>
          {testBusy ? "⏳ 전송 in progress…" : t('super.conTestSend')}
        </button>
        {state.status !== "connected" && (
          <span style={{ marginLeft: 10, fontSize: 11, color: "var(--text-3)" }}>먼저 Account을 Connect하세요</span>
        )}
      </div>

      {testResult && (
        <div style={{
          padding: "10px 14px", background: testResult.ok ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
          border: `1px solid ${testResult.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: 10
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: testResult.ok ? "#22c55e" : "#ef4444", marginBottom: 4 }}>
            {testResult.ok ? `✓ HTTP ${testResult.status} — ${testResult.latency}ms` : "✗ Count신 Failed"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>Count신 시각: {testResult.ts}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Platform Card ─────────────────────────────────────────────────────────── */
function PlatformCard({ p, state, onUpdate }) {
  
  const [tab, setTab] = useState("auth"); // auth | webhook

  return (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${state.status === "connected" ? p.color : "rgba(99,140,255,0.15)"}`, transition: "border-color 0.4s" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
        <PlatformIcon p={p} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                {p.authType === "oauth" ? "🔐 OAuth 2.0" : "🔑 API"} · {p.tokenExpiry}
              </div>
            </div>
            <StatusPill status={state.status} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === "auth" ? "active" : ""}`} onClick={() => setTab("auth")}>{t('super.conBtnAcctConn') || "🔐 {t('super.conActConn')}"}</button>
        <button className={`tab ${tab === "webhook" ? "active" : ""}`} onClick={() => setTab("webhook")}>{t('super.conBtnWhSettings') || "🎣 {t('super.conActWh')}"}</button>
      </div>

      {tab === "auth" && (p.authType === "oauth"
        ? <OAuthFlow p={p} state={state} onUpdate={onUpdate} />
        : <ApiKeyFlow p={p} state={state} onUpdate={onUpdate} />
      )}
      {tab === "webhook" && <WebhookConfig p={p} state={state} onUpdate={onUpdate} />}
    </div>
  );
}

/* ─── Webhook Live Feed ─────────────────────────────────────────────────────── */
function WebhookFeed({ connState }) {
  
  const [events, setEvents] = useState(WEBHOOK_FEED_MOCK);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Inject live events when connectors emit them
  const connectedPlatforms = Object.entries(connState)
    .filter(([, s]) => s.status === "connected" && s.lastEvent)
    .map(([id, s]) => ({ id, ...s.lastEvent }));

  useEffect(() => {
    if (connectedPlatforms.length > 0) {
      const last = connectedPlatforms[connectedPlatforms.length - 1];
      const newEv = {
        id: Date.now(),
        platform: last.id,
        event: last.event,
        ts: last.ts,
        status: last.status || "ok",
        payload: `{"demo_event":"${last.event}","platform":"${last.id}","timestamp":"${last.ts}"}`,
      };
      setEvents(prev => [newEv, ...prev.slice(0, 19)]);
    }
  }, [JSON.stringify(connectedPlatforms)]);  // eslint-disable-line

  const filtered = filterPlatform === "all" ? events : events.filter(e => e.platform === filterPlatform);
  const platform = id => PLATFORMS.find(p => p.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };

  return (
    <div className="card card-glass">
      <div className="section-header">
        <div>
          <div className="section-title">{t('super.conEventFeed')}</div>
          <div className="section-sub">{t('super.conRealtime')}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-green"><span className="dot dot-green" /> Live</span>
          <select className="input" style={{ width: 130, padding: "5px 8px", fontSize: 11 }}
            value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
            <option value="all">{t("super.conAllPlat")}</option>
            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {filtered.map(ev => {
          const pl = platform(ev.platform);
          const isSelected = selectedEvent === ev.id;
          return (
            <div key={ev.id}
              onClick={() => setSelectedEvent(isSelected ? null : ev.id)}
              style={{
                padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                background: ev.status === "error" ? "rgba(239,68,68,0.04)" : isSelected ? "rgba(79,142,247,0.05)" : "rgba(9,15,30,0.5)",
                border: `1px solid ${ev.status === "error" ? "rgba(239,68,68,0.15)" : isSelected ? "rgba(79,142,247,0.2)" : "rgba(99,140,255,0.08)"}`,
                transition: "all 150ms",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isSelected ? 8 : 0 }}>
                <span style={{ fontSize: 14 }}>{pl.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 11, color: pl.color || "#4f8ef7" }}>{pl.name}</span>
                <span className="badge" style={{ fontSize: 9, background: "rgba(255,255,255,0.05)", borderColor: "rgba(99,140,255,0.12)" }}>
                  {ev.event}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>{ev.ts}</span>
                  <span className={`badge ${ev.status === "ok" ? "badge-green" : ev.status === "warn" ? "badge-yellow" : "badge-red"}`} style={{ fontSize: 9 }}>
                    {ev.status === "ok" ? "✓" : ev.status === "warn" ? "⚠" : "✗"} {ev.status}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>{isSelected ? "▲" : "▼"}</span>
                </div>
              </div>
              {isSelected && (
                <div style={{ marginTop: 6, padding: "8px 10px", background: "rgba(6,11,20,0.9)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.12)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4, fontWeight: 700 }}>Payload</div>
                  <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 10, color: "#4f8ef7", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {JSON.stringify(JSON.parse(ev.payload), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
            Count신된 Event가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── DATA WAREHOUSE CONNECTORS ─────────────────────────────────────────────── */
const DW_PLATFORMS = [
  {
    id: "bigquery", name: "Google BigQuery", icon: "🔷", color: "#4285f4",
    authType: "service_account",
    features: ["실Hour 스트리밍 삽입", "파티셔닝 Auto화", "ML 모델 Unified"],
    syncSchedules: ["5분마다", "매Hour", "매Day 02:00"],
    tablePrefix: "geniego_roi_",
    docsUrl: "https://cloud.google.com/bigquery/docs",
    badge: "🌐 Google Cloud",
    tables: ["ad_performance", "channel_attribution", "order_events", "customer_ltv"],
  },
  {
    id: "snowflake", name: "Snowflake", icon: "❄️", color: "#29b5e8",
    authType: "keypair",
    features: ["Auto 스케Day링", "Zero-copy Clone", "Time Travel 90Day"],
    syncSchedules: ["15분마다", "매Hour", "매Day 03:00"],
    tablePrefix: "GENIEGO.",
    docsUrl: "https://docs.snowflake.com",
    badge: "❄️ Snowflake",
    tables: ["AD_PERFORMANCE", "ATTRIBUTION_RESULTS", "ORDER_HUB", "PNL_SUMMARY"],
  },
  {
    id: "redshift", name: "Amazon Redshift", icon: "🔴", color: "#dd3522",
    authType: "iam",
    features: ["Spectrum 외부 Table", "Auto WLM", "ML 내장 지원"],
    syncSchedules: ["30분마다", "매Hour", "매Day 04:00"],
    tablePrefix: "geniego.",
    docsUrl: "https://docs.aws.amazon.com/redshift",
    badge: "☁️ AWS",
    tables: ["ad_performance", "attribution_results", "order_hub", "pnl_summary"],
  },
  {
    id: "databricks", name: "Databricks Delta Lake", icon: "🧱", color: "#ff3621",
    authType: "token",
    features: ["Delta 트랜잭션", "Unity Catalog", "MLflow Integration"],
    syncSchedules: ["매Hour", "매Day 01:00", "Weekly Day요Day"],
    tablePrefix: "geniego_roi.",
    docsUrl: "https://docs.databricks.com",
    badge: "🧱 Databricks",
    tables: ["ad_performance_delta", "attribution_delta", "orders_delta", "pnl_delta"],
  },
];

const DW_SYNC_STATS = {
  bigquery:   { rows: "12,847,320", lastSync: "5분 전", size: "4.2 GB", status: "synced" },
  snowflake:  { rows: "11,203,441", lastSync: "22분 전", size: "3.8 GB", status: "synced" },
  redshift:   { rows: "9,887,100",  lastSync: "55분 전", size: "3.1 GB", status: "synced" },
  databricks: { rows: "0",          lastSync: "Disconnected",   size: "—",      status: "disconnected" },
};

function DWConnectorCard({ dw }) {
  const [connected, setConnected] = useState(dw.id !== "databricks");
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState(dw.syncSchedules[1]);
  const [queryResult, setQueryResult] = useState(null);
  const [queryBusy, setQueryBusy] = useState(false);
  const stats = DW_SYNC_STATS[dw.id];

  const connect = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 1200));
    setConnected(true);
    setBusy(false);
  };

  const runTestQuery = async () => {
    setQueryBusy(true);
    await new Promise(r => setTimeout(r, 900));
    setQueryResult({
      rows: 5,
      latency: Math.floor(Math.random() * 300 + 80),
      sample: [
        { channel: "Meta Ads", revenue: "48,320,000", roas: "4.2" },
        { channel: "Google Ads", revenue: "71,450,000", roas: "5.5" },
        { channel: "Naver Ads", revenue: "36,800,000", roas: "3.8" },
      ],
    });
    setQueryBusy(false);
  };

  return (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${connected ? dw.color : "rgba(99,140,255,0.15)"}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: dw.color + "22", border: `1.5px solid ${dw.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {dw.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{dw.name}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
            <span style={{ padding: "1px 7px", borderRadius: 20, background: dw.color + "22", color: dw.color, fontWeight: 700, fontSize: 9 }}>{dw.badge}</span>
            <span style={{ marginLeft: 8 }}>{dw.authType === "service_account" ? "🔐 서비스 Account" : dw.authType === "keypair" ? "🔑 Key Pair" : dw.authType === "iam" ? "☁️ IAM Role" : "🔑 Access Token"}</span>
          </div>
        </div>
        <span className={`badge ${connected ? "badge-green" : ""}`} style={{ fontSize: 10 }}>
          {connected ? <><span className="dot dot-green" />Syncing</> : "Disconnected"}
        </span>
      </div>

      {connected && (
        <>
          {/* Sync Statistics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { l: "누적 행Count", v: stats.rows, c: "#4f8ef7" },
              { l: "데이터 Size", v: stats.size, c: "#a855f7" },
              { l: "마지막 Sync", v: stats.lastSync, c: "#22c55e" },
            ].map(k => (
              <div key={k.l} style={{ textAlign: "center", padding: "8px 6px", borderRadius: 8, background: `${k.c}08`, border: `1px solid ${k.c}18` }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: k.c }}>{k.v}</div>
                <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Sync Table List */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>📋 Sync Table</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {dw.tables.map(t => (
                <span key={t} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: dw.color + "15", color: dw.color, border: `1px solid ${dw.color}30`, fontFamily: "monospace" }}>
                  {dw.tablePrefix}{t}
                </span>
              ))}
            </div>
          </div>

          {/* Sync 스케줄 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>⏱️ Sync 주기</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {dw.syncSchedules.map(s => (
                <button key={s} onClick={() => setSchedule(s)} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, background: schedule === s ? `linear-gradient(135deg,${dw.color},${dw.color}cc)` : "rgba(255,255,255,0.06)", color: schedule === s ? "#fff" : "var(--text-2)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 쿼리 Test */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>🧪 Connect Test 쿼리</div>
            <div style={{ fontFamily: "monospace", fontSize: 10, padding: "8px 12px", background: "rgba(6,11,20,0.9)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)", color: "#4f8ef7", marginBottom: 8 }}>
              SELECT channel, SUM(revenue) as revenue, AVG(roas) as roas<br/>
              FROM {dw.tablePrefix}ad_performance<br/>
              WHERE date &gt;= CURRENT_DATE - 7<br/>
              GROUP BY channel ORDER BY revenue DESC LIMIT 5;
            </div>
            <button className="btn-primary" style={{ fontSize: 11, padding: "7px 16px", background: `linear-gradient(135deg,${dw.color},${dw.color}aa)` }} onClick={runTestQuery} disabled={queryBusy}>
              {queryBusy ? "⏳ Run in progress…" : "▶ 쿼리 Run"}
            </button>
            {queryResult && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 8 }}>✓ {queryResult.rows}행 반환 · {queryResult.latency}ms</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["channel", "revenue", "roas"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 9, color: "var(--text-3)", padding: "3px 6px", fontFamily: "monospace" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.sample.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 10, padding: "4px 6px", color: dw.color, fontWeight: 700 }}>{r.channel}</td>
                        <td style={{ fontSize: 10, padding: "4px 6px", color: "#22c55e", fontFamily: "monospace" }}>₩{r.revenue}</td>
                        <td style={{ fontSize: 10, padding: "4px 6px", color: "#4f8ef7", fontFamily: "monospace" }}>{r.roas}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feature 뱃지 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {dw.features.map(f => (
              <span key={f} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.2)" }}>✓ {f}</span>
            ))}
          </div>
        </>
      )}

      {!connected && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>Data Warehouse Connect 후<br/>Marketing 데이터를 Auto Sync합니다</div>
          <button className="btn-primary" style={{ background: `linear-gradient(135deg,${dw.color},${dw.color}cc)` }} onClick={connect} disabled={busy}>
            {busy ? "⏳ Connect in progress…" : `🔗 ${dw.name} Connect`}
          </button>
        </div>
      )}
    </div>
  );
}

function DataWarehouseSection() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 안내 Banner */}
      <div style={{ padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(66,133,244,0.08),rgba(41,181,232,0.06))", border: "1px solid rgba(66,133,244,0.25)" }}>
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6, background: "linear-gradient(135deg,#4285f4,#29b5e8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {t('super.conTabDw')} — Analysis 데이터 Auto Sync
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
          BigQuery · Snowflake · Redshift · Databricks에 Marketing Performance, 어트리뷰션, Orders/정산 데이터를 실Hour으로 Sync합니다.<br/>
          <span style={{ color: "#4285f4", fontWeight: 700 }}>Native Connector</span>로 쿼리 재작성 없이 기존 BI 도구(Looker Studio, Power BI, Tableau)와 즉시 Integration 가능합니다.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {["✓ Zero-ETL 파이프라인", "✓ 실Hour 스트리밍 삽입", "✓ 증분 Sync (CDC)", "✓ Auto 스키마 진화", "✓ 압축·파티셔닝 Auto화"].map(f => (
            <span key={f} style={{ fontSize: 10, padding: "2px 10px", borderRadius: 20, background: "rgba(66,133,244,0.12)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.25)", fontWeight: 700 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* 아키텍처 다이어그램 */}
      <div className="card card-glass">
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>🏗️ Data Pipeline 아키텍처</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: "12px 0" }}>
          {["📣 Ad Platforms", "🛒 Commerce", "👤 CRM", "📊 Analytics"].map((src, i, arr) => (
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

      {/* DW Card 그리드 */}
      <div className="grid2">
        {DW_PLATFORMS.map(dw => <DWConnectorCard key={dw.id} dw={dw} />)}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function Connectors() {
  const t = useT();

  
  const [mainTab, setMainTab] = useState("platforms"); // platforms | dw
  const { token } = useAuth();

  const { isDemo } = useDemo();
  const [connState, setConnState] = useState(DEFAULT_STATE);
  const [activeFilter, setActiveFilter] = useState("all"); // all | connected | disconnected | oauth | apikey

  /* Demo: DEMO_CONNECTOR_STATE Auto Apply / Paid: 서버에서 로드 */
  useEffect(() => {
    if (isDemo) {
      setConnState(prev => ({ ...prev, ...DEMO_CONNECTOR_STATE }));
      return;
    }
    if (!token) return;
    fetch("/api/connectors", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.connectors) {
          const patch = {};
          d.connectors.forEach(c => {
            patch[c.platform] = {
              status: c.status || "disconnected",
              accessToken: c.access_token || "",
              refreshToken: c.refresh_token || "",
              apiKey: c.api_key || "",
              apiSecret: c.api_secret || "",
              grantedScopes: c.granted_scopes || [],
              expiresAt: c.expires_at || null,
              tokenAge: c.updated_at ? new Date(c.updated_at).getTime() : null,
              webhookEvents: c.webhook_events || [],
              lastEvent: null,
              webhookUrl: `https://roi.genie-go.com/webhooks/${c.platform}`,
              webhookSecret: c.webhook_secret || `whsec_${c.platform}_live`,
            };
          });
          setConnState(prev => ({ ...prev, ...patch }));
        }
      })
      .catch(() => { });
  }, [isDemo, token]);

  /* Connectors Status Update + Paid 유저 서버 Save */
  const updateConn = useCallback((platformId, patch) => {
    setConnState(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], ...patch },
    }));
    if (!isDemo && token && patch.status === "connected") {
      const merged = { ...(DEFAULT_STATE()[platformId] || {}), ...patch };
      fetch(`/api/connectors/${platformId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform: platformId,
          access_token: merged.accessToken || null,
          refresh_token: merged.refreshToken || null,
          api_key: merged.apiKey || null,
          api_secret: merged.apiSecret || null,
          granted_scopes: merged.grantedScopes || [],
          expires_at: merged.expiresAt || null,
          webhook_events: merged.webhookEvents || [],
          status: merged.status,
        }),
      }).catch(() => { });
    }
    if (!isDemo && token && patch.status === "disconnected") {
      fetch(`/api/connectors/${platformId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => { });
    }
  }, [isDemo, token]);

  const filtered = useMemo(() => {
    return PLATFORMS.filter(p => {
      const s = connState[p.id];
      if (activeFilter === "connected") return s.status === "connected";
      if (activeFilter === "disconnected") return s.status !== "connected";
      if (activeFilter === "oauth") return p.authType === "oauth";
      if (activeFilter === "apikey") return p.authType === "apikey";
      return true;
    });
  }, [activeFilter, connState]);

  const stats = useMemo(() => ({
    total: PLATFORMS.length,
    connected: Object.values(connState).filter(s => s.status === "connected").length,
    oauth: PLATFORMS.filter(p => p.authType === "oauth").length,
    apikey: PLATFORMS.filter(p => p.authType === "apikey").length,
  }), [connState]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Demo Banner */}
      
      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))" }}>🔌</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t('super.conHeroTitle') || "Connectors & Integrations"}
            </div>
            <div className="hero-desc">
              {t('super.conHeroDesc') || "{t('super.conActConn')}(OAuth 2.0 / API), Permission 범위 Management, Token Auto 갱신, Webhook Event Count신을 한 Screen에서 Management합니다."}
              {isDemo && <span style={{ marginLeft: 8, fontSize: 11, color: "#eab308" }}>* Demo: 가상 Connect Status입니다</span>}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t('super.conKpiAll') || "{t('super.conKpiAll')}", v: stats.total, c: "#4f8ef7" },
          { l: t('super.conKpiConnected') || "{t('super.conKpiConn')}", v: stats.connected, c: "#22c55e" },
          { l: t('super.conKpiOauth') || "{t('super.conKpiOauth')}", v: stats.oauth, c: "#a855f7" },
          { l: t('super.conKpiApi') || "{t('super.conKpiApi')}", v: stats.apikey, c: "#eab308" },
        ].map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 메인 Tab Conversion */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="tabs">
            <button className={`tab ${mainTab === "platforms" ? "active" : ""}`} onClick={() => setMainTab("platforms")}>{t('super.conTabPlatform') || "{t('super.conTabPlat')}"}</button>
            <button className={`tab ${mainTab === "dw" ? "active" : ""}`} onClick={() => setMainTab("dw")}>{t('super.conTabDw') || "{t('super.conTabDw')}"} <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "rgba(66,133,244,0.2)", color: "#4285f4", marginLeft: 4, fontWeight: 900 }}>NEW</span></button>
          </div>
          {mainTab === "platforms" && (
            <div className="tabs">
              {[
                { k: "all", l: t('super.conFltAllBase') || "All" },
                { k: "connected", l: `✓ ${(t('super.conKpiConnected') || "Connected")} (${stats.connected})` },
                { k: "disconnected", l: t('super.conFltDiscon') || "Disconnected" },
                { k: "oauth", l: t('super.conFltOauth') || "OAuth" },
                { k: "apikey", l: t('super.conFltApi') || "API" },
              ].map(({ k, l }) => (
                <button key={k} className={`tab ${activeFilter === k ? "active" : ""}`}
                  onClick={() => setActiveFilter(k)}>{l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform Connect Tab */}
      {mainTab === "platforms" && (
        <>
          <div className="grid2 fade-up fade-up-3">
            {filtered.map(p => (
              <PlatformCard key={p.id} p={p} state={connState[p.id]} onUpdate={updateConn} />
            ))}
          </div>
          <div className="fade-up fade-up-4">
            <WebhookFeed connState={connState} />
          </div>
        </>
      )}

      {/* Data Warehouse Tab */}
      {mainTab === "dw" && (
        <div className="fade-up fade-up-3">
          <DataWarehouseSection />
        </div>
      )}
    </div>
  );
}
