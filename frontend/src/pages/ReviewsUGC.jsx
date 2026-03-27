import React, { useEffect, useState, useMemo } from "react";
import { useNotification } from "../context/NotificationContext.jsx";
import { useI18n } from "../i18n";

import { useT } from '../i18n/index.js';
const MOCK_REVIEWS = [
  { id: 1, channel: "Amazon KR", product: "Noise-Cancelling Headphones XM5", rating: 5, sentiment: "positive", text: "Exceptional sound quality. Best noise cancelling I've ever used!", category: "Sound Quality", date: "2026-03-03", helpful: 42 },
  { id: 2, channel: "Coupang", product: "RGB Mechanical Keyboard MX", rating: 4, sentiment: "positive", text: "Great typing feel and beautiful RGB. Fast delivery.", category: "Typing Feel", date: "2026-03-03", helpful: 28 },
  { id: 3, channel: "Naver", product: "USB4 7-Port Hub Pro", rating: 2, sentiment: "negative", text: "Screen flickering when connecting 4K monitor. Waiting for support.", category: "Compatibility", date: "2026-03-02", helpful: 15 },
  { id: 4, channel: "Amazon KR", product: "Gaming Mouse Pro X", rating: 3, sentiment: "neutral", text: "Good grip but DPI software is unstable.", category: "Software", date: "2026-03-02", helpful: 9 },
  { id: 5, channel: "Coupang", product: "Noise-Cancelling Headphones XM5", rating: 1, sentiment: "negative", text: "Package arrived damaged. Refund requested.", category: "Shipping", date: "2026-03-01", helpful: 31 },
  { id: 6, channel: "11st", product: "RGB Mechanical Keyboard MX", rating: 5, sentiment: "positive", text: "Perfect for office use. Just the right amount of noise.", category: "Noise Level", date: "2026-03-01", helpful: 19 },
  { id: 7, channel: "Amazon KR", product: "Portable Charger 20K", rating: 4, sentiment: "positive", text: "PD 45W support charges even laptops quickly.", category: "Performance", date: "2026-02-28", helpful: 37 },
  { id: 8, channel: "Naver", product: "Gaming Mouse Pro X", rating: 2, sentiment: "negative", text: "Click response started failing after 2 months. Possible durability issue.", category: "Durability", date: "2026-02-28", helpful: 22 },
];

const CHANNEL_STATS = [
  { channel: "Amazon KR", avg: 4.1, total: 2841, pos: 78, neg: 12, icon: "📦", color: "#eab308" },
  { channel: "Coupang", avg: 3.8, total: 5203, pos: 71, neg: 18, icon: "🏪", color: "#14d9b0" },
  { channel: "Naver", avg: 3.5, total: 1892, pos: 64, neg: 22, icon: "🔍", color: "#22c55e" },
  { channel: "11st", avg: 4.3, total: 987, pos: 82, neg: 9, icon: "🛒", color: "#4f8ef7" },
];

const NEG_KEYWORDS = [
  { word: "Shipping Delay", count: 43, change: +8 },
  { word: "Compatibility Issue", count: 31, change: +12 },
  { word: "Durability", count: 28, change: -3 },
  { word: "Software Bug", count: 19, change: +5 },
  { word: "Support Complaint", count: 14, change: -1 },
];

const SENTIMENT_COLOR = { positive: "#22c55e", neutral: "#eab308", negative: "#ef4444" };
const SENTIMENT_LABEL = { positive: "Positive", neutral: "Neutral", negative: "Negative" };

/* Generate AI reply draft (mock) */
function generateAiReply(review) {
  if (review.sentiment === "positive") {
    return `Hello! 😊\n\nThank you so much for your wonderful review of ${review.product}! Your positive feedback means a great deal to our team.\n\nWe'll continue to deliver great products and service. Hope to see you again! 🙏`;
  } else if (review.sentiment === "neutral") {
    return `Hello,\n\nThank you for using ${review.product}. We're sorry to hear you experienced issues with ${review.category}.\n\nWe've forwarded this to our technical team for improvement. We'll do our best to provide a better experience. For further inquiries, please contact our support team.`;
  } else {
    return `Hello,\n\nWe sincerely apologize for the inconvenience you experienced with ${review.product}.\n\nWe've identified the ${review.category} issue you mentioned. A dedicated CS representative has been assigned and will contact you within 24 hours.\n\nYour valuable feedback helps us improve. We are truly sorry for the trouble. 🙇`;
  }
}

function Stars({ n }) {
  return (
    <span style={{ color: "#fde047", letterSpacing: 1, fontSize: 12 }}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

/* 리뷰 Card Component */
function ReviewCard({ r, replyState, escalateState, onGenReply, onCopyReply, onEscalate }) {
  const [showReply, setShowReply] = useState(false);
  const reply = replyState[r.id];
  const escalated = escalateState[r.id];

  return (
    <div style={{
      padding: "14px 16px",
      background: r.sentiment === "negative" ? "rgba(239,68,68,0.04)" : "rgba(9,15,30,0.4)",
      borderRadius: 12,
      border: `1px solid ${r.sentiment === "negative" ? "rgba(239,68,68,0.18)" : "rgba(99,140,255,0.08)"}`,
      transition: "all 200ms",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`badge badge-${r.sentiment === "positive" ? "green" : r.sentiment === "neutral" ? "yellow" : "red"}`} style={{ fontSize: 10 }}>
            {SENTIMENT_LABEL[r.sentiment]}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.channel}</span>
          <span className="badge" style={{ fontSize: 10 }}>{r.category}</span>
          {escalated && (
            <span className="badge badge-blue" style={{ fontSize: 9 }}>
              🎯 CS Assigned
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Stars n={r.rating} />
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>{r.date}</span>
        </div>
      </div>

      {/* Product Name + 리뷰 본문 */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 4 }}>{r.product}</div>
      <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6, marginBottom: 10 }}>{r.text}</div>

      {/* Bottom Action 바 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 4 }}>👍 {r.helpful} found helpful</span>

        {/* AI 답변 초안 Button */}
        <button
          className="btn-ghost"
          style={{ fontSize: 10, padding: "4px 10px", color: "#4f8ef7", borderColor: "rgba(79,142,247,0.3)" }}
          onClick={() => { onGenReply(r); setShowReply(true); }}
        >
          {reply ? "✓ Regenerate AI Reply" : "🤖 AI Draft Reply"}
        </button>

        {/* 부정 리뷰: 에스컬레이션 Button */}
        {r.sentiment === "negative" && (
          <button
            className="btn-ghost"
            style={{
              fontSize: 10, padding: "4px 10px",
              color: escalated ? "#22c55e" : "#ef4444",
              borderColor: escalated ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
            }}
            onClick={() => onEscalate(r.id)}
          >
            {escalated ? "✓ CS 배정됨" : "🚨 CS 에스컬레이션"}
          </button>
        )}

        {/* 답변 Toggle */}
        {reply && (
          <button
            className="btn-ghost"
            style={{ fontSize: 10, padding: "4px 10px", marginLeft: "auto" }}
            onClick={() => setShowReply(v => !v)}
          >
            {showReply ? "▲ Hide Reply" : "▼ Show Reply"}
          </button>
        )}
      </div>

      {/* AI 답변 초안 표시 */}
      {reply && showReply && (
        <div style={{
          marginTop: 12, padding: "12px 14px",
          background: "rgba(79,142,247,0.05)",
          border: "1px solid rgba(79,142,247,0.2)",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7" }}>🤖 AI Generated Reply Draft</div>
            <button
              className="btn-ghost"
              style={{ fontSize: 10, padding: "2px 8px" }}
              onClick={() => onCopyReply(reply)}
            >
              📋 Copy
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{reply}</div>
          <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
            * This is an AI-generated draft. Please review and edit before sending.
          </div>
        </div>
      )}
    </div>
  );
}

/* 토스트 Notification */
function Toast({ message, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "rgba(34,197,94,0.95)", color: "#fff",
      padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "fadeIn 0.2s ease",
    }}>
      {message}
    </div>
  );
}

export default function ReviewsUGC() {
  const { pushNotification } = useNotification();
  const { t } = useI18n();
  const [channel, setChannel] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [search, setSearch] = useState("");
  const [replyState, setReplyState] = useState({});   // { reviewId: draftText }
  const [escalateState, setEscalateState] = useState({}); // { reviewId: true }
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    return MOCK_REVIEWS.filter(r => {
      if (channel !== "all" && r.channel !== channel) return false;
      if (sentiment !== "all" && r.sentiment !== sentiment) return false;
      if (search && !r.text.includes(search) && !r.product.includes(search)) return false;
      return true;
    });
  }, [channel, sentiment, search]);

  const totalReviews = CHANNEL_STATS.reduce((s, c) => s + c.total, 0);
  const avgRating = (CHANNEL_STATS.reduce((s, c) => s + c.avg * c.total, 0) / totalReviews).toFixed(2);
  const negCount = MOCK_REVIEWS.filter(r => r.sentiment === "negative").length;
  const repliedCount = Object.keys(replyState).length;
  const escalatedCount = Object.keys(escalateState).length;

  const handleGenReply = (r) => {
    const draft = generateAiReply(r);
    setReplyState(prev => ({ ...prev, [r.id]: draft }));
    setToast(t('reviews.draftGenerated'));
  };

  const handleCopyReply = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setToast(t('reviews.copied'));
  };

  const handleEscalate = (id) => {
    setEscalateState(prev => ({ ...prev, [id]: true }));
    setToast(t('reviews.escalated'));
    pushNotification({
      type: "review",
      title: t('reviews.escalationTitle'),
      body: t('reviews.escalationBody', { id }),
      link: "/reviews-ugc",
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 토스트 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(234,179,8,0.25),rgba(249,115,22,0.15))" }}>⭐</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#fde047,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Reviews &amp; UGC
            </div>
            <div className="hero-desc">Channel review data with AI sentiment analysis · Automated reply drafts · Negative review CS escalation for proactive customer issue resolution.</div>
          </div>
        </div>
        {/* 빠른 Action */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            style={{ fontSize: 11, padding: "6px 14px", background: "linear-gradient(135deg,#ef4444,#f97316)" }}
            onClick={() => {
              MOCK_REVIEWS.filter(r => r.sentiment === "negative").forEach(r => {
                handleEscalate(r.id);
              });
            }}
          >
            🚨 {t('reviews.bulkEscalate')}
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: 11, padding: "6px 14px" }}
            onClick={() => {
              MOCK_REVIEWS.forEach(r => handleGenReply(r));
            }}
          >
            🤖 {t('reviews.bulkGenReply')}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t('reviews.kpiTotal'), v: totalReviews.toLocaleString(), s: t('reviews.kpiTotalSub'), c: "#4f8ef7" },
          { l: t('reviews.kpiAvgRating'), v: `★ ${avgRating}`, s: t('reviews.kpiAvgRatingSub'), c: "#fde047" },
          { l: t('reviews.kpiNegative'), v: `${negCount} items`, s: escalatedCount > 0 ? `${t('reviews.escalationCount')} ${escalatedCount}건` : `⚠ ${t('reviews.kpiNegativeSub')}`, c: "#ef4444" },
          { l: t('reviews.kpiAiReply'), v: `${repliedCount} items`, s: `${t('reviews.kpiAiReplySub')} ${MOCK_REVIEWS.length}건 in progress`, c: "#22c55e" },
        ].map(({ l, v, s, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c, fontSize: 22 }}>{v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Channel Cards + Neg Keywords */}
      <div className="grid2 fade-up fade-up-2">
        {/* Channel Cards */}
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>📊 {t('reviews.channelRatingTitle')}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {CHANNEL_STATS.map(c => (
              <div key={c.channel} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(9,15,30,0.5)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.08)" }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{c.channel}</div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-3)" }}>
                    <span style={{ color: "#22c55e" }}>{t('reviews.positive')} {c.pos}%</span>
                    <span style={{ color: "#ef4444" }}>{t('reviews.negative')} {c.neg}%</span>
                    <span>{t('reviews.totalCount')} {c.total.toLocaleString()}</span>
                  </div>
                  {/* 긍정/부정 Bar */}
                  <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${c.pos}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#14d9b0)", borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: c.color }}>★ {c.avg}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>/5.0</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Negative Keywords */}
        <div className="card card-glass">
          <div className="section-title" style={{ marginBottom: 14 }}>⚠ {t('reviews.negKeywordsTitle')}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {NEG_KEYWORDS.map((k, i) => (
              <div key={k.word} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(9,15,30,0.4)", borderRadius: 8, border: `1px solid ${i === 0 ? "rgba(239,68,68,0.2)" : "rgba(99,140,255,0.08)"}` }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "var(--text-3)", width: 20, textAlign: "center" }}>{i + 1}</span>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{k.word}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ height: 4, width: 60, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(k.count / 43) * 100}%`, height: "100%", background: "#ef4444", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, width: 24 }}>{k.count}</span>
                  <span style={{ fontSize: 11, color: k.change > 0 ? "#ef4444" : "#22c55e", width: 30 }}>
                    {k.change > 0 ? `▲${k.change}` : `▼${Math.abs(k.change)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(239,68,68,0.05)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
            <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>🚨 {t('reviews.autoAlertActive')}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t('reviews.autoAlertDesc')}</div>
          </div>
        </div>
      </div>

      {/* Review Feed */}
      <div className="card card-glass fade-up fade-up-3">
        <div className="section-header">
          <div className="section-title">💬 Review Feed
            <span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>
              AI reply drafts · CS escalation support
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" style={{ width: 120, padding: "6px 10px", fontSize: 11 }}
              value={channel} onChange={e => setChannel(e.target.value)}>
              <option value="all">All Channel</option>
              {CHANNEL_STATS.map(c => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
            </select>
            <select className="input" style={{ width: 100, padding: "6px 10px", fontSize: 11 }}
              value={sentiment} onChange={e => setSentiment(e.target.value)}>
              <option value="all">All Sentiment</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
            <input className="input" style={{ width: 160, padding: "6px 10px", fontSize: 11 }}
              placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(r => (
            <ReviewCard
              key={r.id}
              r={r}
              replyState={replyState}
              escalateState={escalateState}
              onGenReply={handleGenReply}
              onCopyReply={handleCopyReply}
              onEscalate={handleEscalate}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-3)", padding: 32, fontSize: 13 }}>{t('noData')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
