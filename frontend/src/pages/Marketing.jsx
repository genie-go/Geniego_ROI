import React, { useState, useMemo, useCallback } from "react";
import { useI18n } from "../i18n/index.js";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── 공통 유틸 ─────────────────────────────────────────────────── */
// currency formatting via useCurrency fmt()
const fmt = (n, { prefix = "", suffix = "" } = {}) => {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return prefix + (n / 1_000_000).toFixed(2) + "M" + suffix;
  if (abs >= 1_000) return prefix + (n / 1_000).toFixed(1) + "K" + suffix;
  return prefix + n.toLocaleString() + suffix;
};

function Bar({ pct, color, h = 5 }) {
  return (
    <div style={{ height: h, borderRadius: h, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color, borderRadius: h, transition: "width .6s" }} />
    </div>
  );
}

function GaugeRing({ score, size = 48 }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#4f8ef7" : score >= 40 ? "#eab308" : "#ef4444";
  const r = 20; const circ = 2 * Math.PI * r;
  const dash = score != null ? (score / 100) * circ : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      {score != null && <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />}
      <text x="26" y="30" textAnchor="middle" fill={score != null ? color : "var(--text-3)"} fontSize="11" fontWeight="900">
        {score ?? "—"}
      </text>
    </svg>
  );
}

function GradeBadge({ grade }) {
  const colors = { S: "#fde047", A: "#22c55e", B: "#4f8ef7", C: "#eab308", D: "#ef4444" };
  const c = colors[grade] || "var(--text-3)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: 8, fontWeight: 900, fontSize: 15,
      background: c + "18", border: `2px solid ${c}44`, color: c
    }}>{grade}</span>
  );
}

function InsightBox({ text, type = "info" }) {
  const cfg = {
    success: { bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.2)", color: "#22c55e", icon: "✅" },
    warning: { bg: "rgba(234,179,8,0.07)", border: "rgba(234,179,8,0.2)", color: "#eab308", icon: "⚠️" },
    danger: { bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.2)", color: "#ef4444", icon: "🔴" },
    info: { bg: "rgba(79,142,247,0.07)", border: "rgba(79,142,247,0.2)", color: "#4f8ef7", icon: "💡" },
  }[type];
  return (
    <div style={{
      padding: "9px 13px", borderRadius: 9, fontSize: 12, lineHeight: 1.6,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color
    }}>
      {cfg.icon} {text}
    </div>
  );
}

/* ─── 원시 Platform 데이터 ────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: "meta", name: "Meta Ads", icon: "📘", color: "#4f8ef7",
    spend: 148_200, roas: 4.21, ctr: 2.84, cpc: 1.82, impressions: 4_820_000, clicks: 136_800, conv: 1_240,
    campaigns: [
      { name: "Spring_KR_Brand", status: "active", budget: 50000, spent: 38200, roas: 5.12, clicks: 48200 },
      { name: "Retargeting_Q1", status: "active", budget: 30000, spent: 28900, roas: 6.84, clicks: 32100 },
      { name: "Lookalike_Top10", status: "active", budget: 40000, spent: 35800, roas: 3.45, clicks: 29400 },
      { name: "Catalog_Dynamic", status: "paused", budget: 25000, spent: 12300, roas: 2.91, clicks: 14200 },
      { name: "Video_Awareness", status: "active", budget: 20000, spent: 17800, roas: 2.10, clicks: 12900 },
    ],
  },
  {
    id: "tiktok", name: "TikTok Biz", icon: "🎵", color: "#a855f7",
    spend: 89_400, roas: 3.18, ctr: 3.91, cpc: 1.24, impressions: 7_200_000, clicks: 72_100, conv: 820,
    campaigns: [
      { name: "UGC_Challenge_01", status: "active", budget: 35000, spent: 33200, roas: 3.95, clicks: 38100 },
      { name: "Creative_Test_v3", status: "active", budget: 25000, spent: 22800, roas: 2.74, clicks: 19400 },
      { name: "Hashtag_Spring", status: "active", budget: 20000, spent: 18900, roas: 3.21, clicks: 10200 },
      { name: "Brand_Takeover_Apr", status: "planned", budget: 15000, spent: 0, roas: 0, clicks: 0 },
    ],
  },
  {
    id: "shopify", name: "Shopify", icon: "🛒", color: "#22c55e",
    spend: 22_100, roas: 7.24, ctr: 4.12, cpc: 0.91, impressions: 2_100_000, clicks: 24_300, conv: 1_560,
    campaigns: [
      { name: "Email_Spring_Sale", status: "active", budget: 12000, spent: 11200, roas: 8.40, clicks: 14200 },
      { name: "SMS_Retarget", status: "active", budget: 6000, spent: 5800, roas: 6.90, clicks: 5600 },
      { name: "PushNotif_Cart", status: "active", budget: 4000, spent: 3900, roas: 6.10, clicks: 4200 },
    ],
  },
  {
    id: "amazon", name: "Amazon Ads", icon: "📦", color: "#eab308",
    spend: 63_100, roas: 2.87, ctr: 0.84, cpc: 3.21, impressions: 1_950_000, clicks: 19_640, conv: 1_180,
    campaigns: [
      { name: "Sponsored_Products", status: "active", budget: 30000, spent: 28900, roas: 3.10, clicks: 9800 },
      { name: "Sponsored_Brands", status: "active", budget: 20000, spent: 19200, roas: 2.65, clicks: 6400 },
      { name: "Sponsored_Display", status: "active", budget: 13000, spent: 11800, roas: 2.30, clicks: 3440 },
    ],
  },
];

/* ─── AI 평가 요청 ─────────────────────────────────────────────── */
async function fetchMarketingEval() {
  const data = {
    analysis_date: new Date().toISOString().slice(0, 10),
    total_spend: PLATFORMS.reduce((s, p) => s + p.spend, 0),
    channels: PLATFORMS.map(p => ({
      name: p.name,
      spend: p.spend,
      roas: p.roas,
      ctr: p.ctr,
      cpc: p.cpc,
      impressions: p.impressions,
      clicks: p.clicks,
      conversions: p.conv,
      campaigns: p.campaigns.map(c => ({
        name: c.name,
        status: c.status,
        budget: c.budget,
        spent: c.spent,
        burn_rate_pct: c.budget ? Math.round((c.spent / c.budget) * 100) : 0,
        roas: c.roas,
        clicks: c.clicks,
      })),
    })),
  };

  const resp = await fetch("/v422/ai/marketing-eval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || "AI analysis failed");
  return json.result;
}

/* ─── Channel 상세 드릴다운 Modal ──────────────────────────────────── */
function ChannelDetailModal({ channelResult, platform, onClose, t }) {
    const { fmt } = useCurrency();
  if (!channelResult) return null;
  const bd = channelResult.breakdown || {};
  const breakdownItems = [
    { label: "ROAS", score: bd.roas_score, max: 35, actual: platform?.roas?.toFixed(2) + "x" },
    { label: "CTR", score: bd.ctr_score, max: 25, actual: platform?.ctr?.toFixed(2) + "%" },
    { label: t("marketing.conversions"), score: bd.conversion_score, max: 25, actual: platform?.conv?.toLocaleString() },
    { label: "CPC", score: bd.cpc_score, max: 15, actual: "₩" + platform?.cpc?.toFixed(2) },
  ];
  const color = platform?.color || "#4f8ef7";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", zIndex: 500 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(680px,96vw)", maxHeight: "90vh", overflowY: "auto",
        background: "linear-gradient(160deg,#0d1525,#090f1e)",
        border: `1px solid ${color}33`, borderRadius: 22, padding: 28, zIndex: 501,
        boxShadow: "0 32px 80px rgba(0,0,0,0.85)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 3 }}>
              🤖 {t("marketing.aiEvalTitle")}
            </div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{channelResult.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GaugeRing score={channelResult.score} size={60} />
            <GradeBadge grade={channelResult.grade} />
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 22 }}>✕</button>
          </div>
        </div>

        {/* 항목per 점Count breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{t("marketing.breakdown")}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {breakdownItems.map(b => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{b.label}</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ color: "var(--text-3)" }}>{t("marketing.actual")}: <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{b.actual}</span></span>
                    <span style={{ fontWeight: 800, color }}>{b.score ?? 0}&nbsp;<span style={{ color: "var(--text-3)", fontWeight: 400 }}>/{b.max}</span></span>
                  </div>
                </div>
                <Bar pct={b.score != null ? (b.score / b.max) * 100 : 0} color={color} />
              </div>
            ))}
          </div>
        </div>

        {/* 강점 / 약점 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("marketing.strengths")}</div>
            {(channelResult.strengths || []).map((s, i) => (
              <div key={i} style={{
                fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 4,
                background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)", color: "#22c55e"
              }}>• {s}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("marketing.weaknesses")}</div>
            {(channelResult.weaknesses || []).map((w, i) => (
              <div key={i} style={{
                fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 4,
                background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.15)", color: "#eab308"
              }}>• {w}</div>
            ))}
          </div>
        </div>

        {/* AI 권장 Action */}
        {channelResult.ai_recommendation && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: `${color}10`, border: `1px solid ${color}25`, fontSize: 12, color, lineHeight: 1.7 }}>
            🤖 <strong>{t("marketing.aiRecommend")}</strong> {channelResult.ai_recommendation}
          </div>
        )}

        {/* Channel KPI */}
        {platform && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 18 }}>
            {[
              { l: t("marketing.colSpent"), v: fmt(platform.spend) },
              { l: "ROAS", v: platform.roas.toFixed(2) + "x" },
              { l: "CTR", v: platform.ctr.toFixed(2) + "%" },
              { l: "CPC", v: "₩" + platform.cpc.toFixed(2) },
            ].map(({ l, v }) => (
              <div key={l} style={{ textAlign: "center", padding: "10px 0", borderRadius: 10, background: "rgba(9,15,30,0.7)", border: "1px solid rgba(99,140,255,0.08)" }}>
                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{l}</div>
                <div style={{ fontWeight: 800, fontSize: 12, color, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Tab: AI Marketing 효과 평가 Analysis ─────────────────────────────── */
function AIEvalTab() {
    const { fmt } = useCurrency();
  const { t } = useI18n();
  const [evalResult, setEvalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [expandedCamp, setExpandedCamp] = useState(null);

  const runEval = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await fetchMarketingEval();
      setEvalResult(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const totalSpend = useMemo(() => PLATFORMS.reduce((s, p) => s + p.spend, 0), []);
  const selectedChannelPlatform = selectedChannel
    ? PLATFORMS.find(p => p.name === selectedChannel.name) : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Run Header */}
      <div style={{
        padding: "20px 24px", borderRadius: 16,
        background: "linear-gradient(135deg,rgba(79,142,247,0.12),rgba(99,102,241,0.08))",
        border: "1px solid rgba(79,142,247,0.2)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
      }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>{t("marketing.aiEvalTitle")}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
            {t("marketing.aiEvalSub")}
          </div>
        </div>
        <button onClick={runEval} disabled={loading} style={{
          padding: "10px 24px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
          color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? t("marketing.running") : t("marketing.runAI")}
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div style={{
          padding: "12px 18px", borderRadius: 10, background: "rgba(239,68,68,0.09)",
          border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 12
        }}>
          {t("marketing.errorPrefix")} {error}
        </div>
      )}

      {/* Loading 인디케이터 */}
      {loading && (
        <div className="card card-glass" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🤖</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t("marketing.analyzing")}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
            {PLATFORMS.length} channels · {PLATFORMS.reduce((s, p) => s + p.campaigns.length, 0)} campaigns
          </div>
        </div>
      )}

      {/* 데이터 입력 Summary (항상 표시) */}
      {!loading && !evalResult && (
        <div className="card card-glass" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{t("marketing.analysisData")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {PLATFORMS.map(p => (
              <div key={p.id} style={{
                padding: "12px 14px", borderRadius: 12,
                background: "rgba(9,15,30,0.7)", border: `1px solid ${p.color}25`
              }}>
                <div style={{ fontSize: 20, marginBottom: 5 }}>{p.icon}</div>
                <div style={{ fontWeight: 700, color: p.color, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{fmt(p.spend)}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>ROAS {p.roas.toFixed(2)}x · {p.campaigns.length} campaigns</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
            {t("marketing.totalAdSpend")} {fmt(totalSpend)} · {t("marketing.clickToRun")}
          </div>
        </div>
      )}

      {/* AI 평가 결과 */}
      {!loading && evalResult && (
        <>
          {/* All Summary */}
          <div style={{
            padding: "20px 24px", borderRadius: 16,
            background: "linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))",
            border: "1px solid rgba(34,197,94,0.2)",
            display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <GaugeRing score={evalResult.overall_score} size={68} />
              <GradeBadge grade={evalResult.grade} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>{t("marketing.overallSummary")}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{evalResult.summary}</div>
            </div>
          </div>

          {/* 즉시 Run Action */}
          {evalResult.immediate_action && (
            <InsightBox text={evalResult.immediate_action} type="info" />
          )}

          {/* Channel 평가 랭킹 */}
          <div className="card card-glass" style={{ padding: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{t("marketing.channelRanking")}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 16 }}>{t("marketing.channelRankingSub")}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {(evalResult.channels || [])
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((ch, rank) => {
                  const plat = PLATFORMS.find(p => p.name === ch.name);
                  const rankIcon = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;
                  return (
                    <div key={ch.name} onClick={() => setSelectedChannel(ch)}
                      style={{
                        padding: "14px 18px", borderRadius: 12, cursor: "pointer",
                        background: "rgba(9,15,30,0.7)", border: `1px solid ${plat?.color || "#4f8ef7"}25`,
                        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                        transition: "all 180ms",
                      }}
                      onMouseEnter={e => e.currentTarget.style.border = `1px solid ${plat?.color || "#4f8ef7"}55`}
                      onMouseLeave={e => e.currentTarget.style.border = `1px solid ${plat?.color || "#4f8ef7"}25`}
                    >
                      <div style={{ fontSize: 20 }}>{rankIcon}</div>
                      <div style={{ fontSize: 24 }}>{plat?.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: plat?.color }}>{ch.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                          {t("marketing.clickDetail")}
                        </div>
                      </div>
                      {/* 항목per 점Count */}
                      {ch.breakdown && Object.entries({ "ROAS": [ch.breakdown.roas_score, 35], "CTR": [ch.breakdown.ctr_score, 25], "Conv": [ch.breakdown.conversion_score, 25], "CPC": [ch.breakdown.cpc_score, 15] }).map(([lbl, [sc, mx]]) => (
                        <div key={lbl} style={{ textAlign: "center", minWidth: 54 }}>
                          <div style={{ fontSize: 9, color: "var(--text-3)" }}>{lbl}</div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: plat?.color }}>
                            {sc ?? 0}<span style={{ color: "var(--text-3)", fontWeight: 400 }}>/{mx}</span>
                          </div>
                        </div>
                      ))}
                      <GaugeRing score={ch.score} size={48} />
                      <GradeBadge grade={ch.grade} />
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Campaign 평가표 */}
          {(evalResult.campaigns || []).length > 0 && (
            <div className="card card-glass" style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{t("marketing.campaignTable")}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>{t("marketing.campaignTableSub")}</div>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("marketing.colCampaign")}</th>
                      <th>{t("marketing.colChannel")}</th>
                      <th style={{ textAlign: "center" }}>{t("marketing.colScore")}</th>
                      <th style={{ textAlign: "center" }}>{t("marketing.colGrade")}</th>
                      <th style={{ textAlign: "right" }}>ROAS</th>
                      <th style={{ textAlign: "right" }}>{t("marketing.colBurnRate")}</th>
                      <th>{t("marketing.colAiAction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(evalResult.campaigns || []).map(cam => {
                      const plat = PLATFORMS.find(p => p.name === cam.channel);
                      const expanded = expandedCamp === cam.name;
                      return (
                        <React.Fragment key={cam.name}>
                          <tr onClick={() => setExpandedCamp(expanded ? null : cam.name)}
                            style={{ cursor: "pointer", background: expanded ? `${plat?.color || "#4f8ef7"}08` : undefined }}>
                            <td style={{ fontWeight: 700 }}>{cam.name}</td>
                            <td>
                              <span style={{ color: plat?.color, fontWeight: 700, fontSize: 12 }}>
                                {plat?.icon} {cam.channel}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}><GaugeRing score={cam.score} size={36} /></td>
                            <td style={{ textAlign: "center" }}><GradeBadge grade={cam.grade} /></td>
                            <td style={{
                              textAlign: "right", fontWeight: 700,
                              color: cam.breakdown?.roas_score >= 25 ? "#22c55e" : cam.breakdown?.roas_score >= 15 ? "#eab308" : "#ef4444"
                            }}>
                              {PLATFORMS.flatMap(p => p.campaigns).find(c => c.name === cam.name)?.roas?.toFixed(2) || "—"}x
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {(() => {
                                const c = PLATFORMS.flatMap(p => p.campaigns).find(c => c.name === cam.name);
                                return c?.budget ? (c.spent / c.budget * 100).toFixed(0) + "%" : "—";
                              })()}
                            </td>
                            <td style={{ fontSize: 10, color: "var(--text-3)" }}>{expanded ? "▲" : t("marketing.clickView")}</td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={7} style={{ padding: "14px 18px", background: "rgba(9,15,30,0.5)" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                  <InsightBox text={cam.ai_insight || "No analysis data"} type="info" />
                                  <InsightBox text={"🎯 Recommended Action: " + (cam.action || "—")} type="success" />
                                </div>
                                {cam.breakdown && (
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10 }}>
                                    {[
                                      ["ROAS", cam.breakdown.roas_score, 35],
                                      ["Burn Rate", cam.breakdown.burn_rate_score, 25],
                                      ["CTR", cam.breakdown.ctr_score, 25],
                                      ["Status", cam.breakdown.status_score, 15],
                                    ].map(([lbl, sc, mx]) => (
                                      <div key={lbl} style={{
                                        padding: "8px 0", textAlign: "center",
                                        borderRadius: 8, background: "rgba(9,15,30,0.7)", border: "1px solid rgba(99,140,255,0.08)"
                                      }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>{lbl}</div>
                                        <div style={{ fontWeight: 800, color: plat?.color, fontSize: 13 }}>{sc ?? 0}/{mx}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Budget 재배분 권고 */}
          {(evalResult.budget_reallocation || []).length > 0 && (
            <div className="card card-glass" style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{t("marketing.budgetRealloc")}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                {t("marketing.budgetReallocSub")}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("marketing.colChannel")}</th>
                      <th style={{ textAlign: "right" }}>{t("marketing.colCurrent")}</th>
                      <th style={{ textAlign: "right" }}>{t("marketing.colRecommend")}</th>
                      <th style={{ textAlign: "right" }}>{t("marketing.colChange")}</th>
                      <th>{t("marketing.colRationale")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResult.budget_reallocation.map(row => {
                      const plat = PLATFORMS.find(p => p.name === row.channel);
                      const diff = (row.recommended_pct || 0) - (row.current_pct || 0);
                      return (
                        <tr key={row.channel}>
                          <td>
                            <span style={{ color: plat?.color, fontWeight: 700 }}>
                              {plat?.icon} {row.channel}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>{row.current_pct?.toFixed(1)}%</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{row.recommended_pct?.toFixed(1)}%</td>
                          <td style={{
                            textAlign: "right", fontWeight: 700,
                            color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "var(--text-3)"
                          }}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                          </td>
                          <td style={{ fontSize: 11, color: "var(--text-2)" }}>{row.rationale}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 핵심 인사이트 */}
          {evalResult.top_insight && (
            <div style={{
              padding: "16px 20px", borderRadius: 14,
              background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.08))",
              border: "1px solid rgba(99,102,241,0.2)"
            }}>
              <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#a855f7" }}>{t("marketing.topInsight")}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{evalResult.top_insight}</div>
            </div>
          )}

          {/* 다시 Analysis */}
          <div style={{ textAlign: "center" }}>
            <button onClick={runEval} disabled={loading} style={{
              padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(79,142,247,0.3)",
              background: "transparent", color: "#4f8ef7", cursor: "pointer", fontSize: 11, fontWeight: 700
            }}>{t("marketing.rerunAI")}</button>
          </div>
        </>
      )}

      {/* Channel 상세 Modal */}
      {selectedChannel && (
        <ChannelDetailModal
          channelResult={selectedChannel}
          platform={selectedChannelPlatform}
          onClose={() => setSelectedChannel(null)}
          t={t}
        />
      )}
    </div>
  );
}

/* ─── Tab: Campaign Management (기존) ───────────────────────────────────── */
function CampaignTab() {
    const { fmt } = useCurrency();
  const { t } = useI18n();
  const [sel, setSel] = useState("meta");
  const plat = PLATFORMS.find(p => p.id === sel);
  const totalSpend = PLATFORMS.reduce((s, p) => s + p.spend, 0);
  const totalConv = PLATFORMS.reduce((s, p) => s + p.conv, 0);
  const blendedROAS = PLATFORMS.reduce((s, p) => s + p.roas * p.spend, 0) / totalSpend;
  const statusColor = { active: "#22c55e", paused: "#eab308", planned: "#6366f1" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="grid4">
        {[
          { l: t("marketing.colTotalAdSpend"), v: fmt(totalSpend, { prefix: "₩" }), c: "#4f8ef7" },
          { l: t("marketing.colBlendedRoas"), v: blendedROAS.toFixed(2) + "x", c: "#22c55e" },
          { l: t("marketing.colTotalConv"), v: totalConv.toLocaleString(), c: "#a855f7" },
          { l: t("marketing.colActivePlatforms"), v: PLATFORMS.length.toString(), c: "#14d9b0" },
        ].map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid4">
        {PLATFORMS.map(p => (
          <div key={p.id} className="card card-hover"
            style={{ cursor: "pointer", borderColor: sel === p.id ? `${p.color}55` : "var(--border)", background: sel === p.id ? `rgba(${hexToRgb(p.color)},0.08)` : undefined }}
            onClick={() => setSel(p.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 24 }}>{p.icon}</div>
              <span className="badge" style={{ background: `${p.color}22`, borderColor: `${p.color}44`, color: p.color, fontSize: 10 }}>
                ROAS {p.roas.toFixed(2)}x
              </span>
            </div>
            <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14, color: p.color }}>{p.name}</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>₩{fmt(p.spend)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              {[{ l: "CTR", v: p.ctr.toFixed(2) + "%" }, { l: "CPC", v: "₩" + p.cpc.toFixed(2) }, { l: "Conv", v: p.conv.toLocaleString() }, { l: "IMP", v: fmt(p.impressions) }].map(({ l, v }) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {plat && (
        <div className="card card-glass">
          <div className="section-header">
            <div>
              <div className="section-title" style={{ color: plat.color }}>{plat.icon} {plat.name} — {t("marketing.campaignDetail")}</div>
              <div className="section-sub">{t("marketing.spendStatus")}</div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>{t("marketing.colCampaign")}</th>
                <th>{t("marketing.colStatus")}</th>
                <th>{t("marketing.colBudget")}</th>
                <th>{t("marketing.colSpent")}</th>
                <th style={{ minWidth: 120 }}>{t("marketing.colBurnRate")}</th>
                <th>ROAS</th>
                <th>{t("marketing.colClicks")}</th>
              </tr>
            </thead>
            <tbody>
              {plat.campaigns.map(cam => {
                const burnPct = cam.budget ? (cam.spent / cam.budget) * 100 : 0;
                const sc = statusColor[cam.status] || "#8da4c4";
                return (
                  <tr key={cam.name}>
                    <td style={{ fontWeight: 700 }}>{cam.name}</td>
                    <td>
                      <span className="badge" style={{ background: sc + "22", borderColor: sc + "44", color: sc, fontSize: 10 }}>
                        {cam.status === "active" ? t("marketing.statusActive") : cam.status === "paused" ? t("marketing.statusPaused") : cam.status === "planned" ? t("marketing.statusPending") : cam.status}
                      </span>
                    </td>
                    <td>{fmt(cam.budget)}</td>
                    <td>{fmt(cam.spent)}</td>
                    <td>
                      <div style={{ fontSize: 11, marginBottom: 4, color: burnPct > 90 ? "var(--red)" : "var(--text-2)" }}>{burnPct.toFixed(0)}%</div>
                      <Bar pct={burnPct} color={burnPct > 90 ? "#ef4444" : plat.color} />
                    </td>
                    <td style={{ fontWeight: 700, color: cam.roas >= 3 ? "#22c55e" : cam.roas >= 2 ? "#eab308" : "#ef4444" }}>
                      {cam.roas > 0 ? cam.roas.toFixed(2) + "x" : "—"}
                    </td>
                    <td style={{ color: "var(--text-2)" }}>{cam.clicks.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/* ─── Main ──────────────────────────────────────────────────────── */

export default function Marketing() {
    const { fmt } = useCurrency();
  const { t } = useI18n();
  const [tab, setTab] = useState("evaluation");
  const TABS = useMemo(() => [
    { id: "evaluation", label: t("marketing.tabAiEval") },
    { id: "campaigns", label: t("marketing.tabCampaigns") },
  ], [t]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* [v8] AI Recommend Banner */}
      <AIRecommendBanner context="marketing" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{t("marketing.pageTitle")}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {t("marketing.pageSub")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, background: "rgba(9,15,30,0.8)", borderRadius: 12, padding: 4, border: "1px solid rgba(99,140,255,0.1)" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: tab === tb.id ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
              color: tab === tb.id ? "#fff" : "var(--text-3)", transition: "all 150ms",
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      {tab === "evaluation" && <AIEvalTab />}
      {tab === "campaigns" && <CampaignTab />}
    </div>
  );
}
