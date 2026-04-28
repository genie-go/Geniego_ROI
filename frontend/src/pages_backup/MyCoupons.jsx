import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

import ko from '../i18n/locales/ko.js';
import { useT } from '../i18n/index.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


const API = "/api";

const PERIOD_OPTIONS = [
  { label: "1months", months: 1,  days: 30  },
  { label: "2months", months: 2,  days: 60  },
  { label: "3months", months: 3,  days: 90  },
  { label: "6months", months: 6,  days: 180 },
  { label: "1year",   years: 1,   days: 365 },
];

const STATUS_LABELS = {
  available: { label: "✅ Available", color: "#22c55e" },
  used:      { label: "✔ Used",    color: "#64748b" },
  expired:   { label: "⏰ Expired",   color: "#ef4444" },
};

function CouponCard({ coupon, onUse }) {
  const [copied, setCopied] = useState(false);
  const st = STATUS_LABELS[coupon.status] || STATUS_LABELS.available;

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: coupon.status === "available"
        ? "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.04))"
        : "rgba(255,255,255,0.02)",
      border: coupon.status === "available"
        ? "1.5px solid rgba(79,142,247,0.3)"
        : "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "18px 20px", marginBottom: 12,
      opacity: coupon.status === "available" ? 1 : 0.6,
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1 }}>
          {/* 플랜 배지 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              display: "inline-block", background: "rgba(79,142,247,0.15)", color: "#4f8ef7",
              border: "1px solid rgba(79,142,247,0.25)", borderRadius: 6,
              padding: "2px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase",
            }}>{coupon.plan}</span>
            <span style={{
              display: "inline-block", background: "rgba(34,197,94,0.12)", color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6,
              padding: "2px 10px", fontSize: 12, fontWeight: 600,
            }}>{coupon.period_label || `${coupon.duration_days}일`}</span>
            <span style={{ color: st.color, fontSize: 12, fontWeight: 600 }}>{st.label}</span>

          {/* Coupon코드 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{
              color: "#4f8ef7", fontSize: 18, fontWeight: 900,
              letterSpacing: "2px", fontFamily: "monospace",
            }}>{coupon.code}</code>
            <button onClick={handleCopy} style={{
              background: copied ? "rgba(34,197,94,0.15)" : "rgba(79,142,247,0.1)",
              border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(79,142,247,0.2)"}`,
              color: copied ? "#4ade80" : "#4f8ef7",
              borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer",
              transition: "all 0.2s",
            }}>
              {copied ? "✓ Copy됨" : "Copy"}
            </button>

          {/* Expiry Date */}
          {coupon.expires_at && (
            <p style={{ color: "var(--text-3)", fontSize: 12, margin: "6px 0 0" }}>
              Expired: {new Date(coupon.expires_at).toLocaleDateString("ko-KR")}
              {coupon.note && ` · ${coupon.note}`}
            </p>
          )}

        {/* 사용하기 Button */}
        {coupon.status === "available" && (
          <button onClick={() => onUse(coupon.code)} style={{
            background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
            color: 'var(--text-1)', border: "none", borderRadius: 10,
            padding: "10px 20px", fontWeight: 700, fontSize: 13,
            cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: "0 2px 12px rgba(79,142,247,0.3)",
            transition: "all 0.2s",
          }}>사용하기 →</button>
        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

function RedeemModal({ onClose, onSuccess, prefillCode }) {
  const { token } = useAuth();
  const [code, setCode] = useState(prefillCode || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handleRedeem = async () => {
    if (!code.trim()) { setMsg({ text: "Coupon코드를 입력해주세요.", type: "err" }); return; }
    setLoading(true); setMsg({ text: "", type: "" });
    try {
      const r = await fetch(`${API}/v423/user/redeem-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.toUpperCase().trim() }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg({ text: d.message, type: "ok" });
        setTimeout(() => onSuccess(d), 1500);
      } else {
        setMsg({ text: d.error || "Coupon Use Failed", type: "err" });
      }
    } catch (e) {
      setMsg({ text: "네트워크 Error", type: "err" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#1a1f2e", border: "1.5px solid rgba(79,142,247,0.2)", borderRadius: 16,
        padding: "32px", maxWidth: 440, width: "100%", boxSizing: "border-box",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: 'var(--text-1)', margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>🎟 Coupon Use하기</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 13, margin: "0 0 20px" }}>
          Coupon코드를 입력하면 해당 플랜이 즉시 Apply됩니다.
        </p>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="GENIE-XXXXXXXXXX"
          style={{
            width: "100%", boxSizing: "border-box",
            background: 'var(--surface)', border: "1.5px solid rgba(79,142,247,0.25)",
            borderRadius: 10, color: "#4f8ef7", fontSize: 18, fontWeight: 700,
            padding: "13px 16px", outline: "none", letterSpacing: "1.5px",
            fontFamily: "monospace", marginBottom: 16,
          }}
          onKeyDown={e => e.key === "Enter" && handleRedeem()}
        />
        {msg.text && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: msg.type === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: msg.type === "ok" ? "#4ade80" : "#ef4444",
            border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}>{msg.text}</div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-2)', borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 14,
          }}>Cancel</button>
          <button onClick={handleRedeem} disabled={loading} style={{
            flex: 2, background: loading ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
            border: "none", color: 'var(--text-1)', borderRadius: 10, padding: "12px", cursor: "pointer",
            fontSize: 14, fontWeight: 700,
          }}>
            {loading ? "Processing..." : "🎉 Coupon Use하기"}
          </button>
            </div>
        </div>
    </div>
);
}

export default function MyCoupons() {
  const t = useT();
  const { token, user } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [showRedeem, setShowRedeem] = useState(false);
  const [prefillCode, setPrefillCode] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [inputCode, setInputCode] = useState("");

  const loadCoupons = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/v423/user/my-coupons`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.coupons) setCoupons(d.coupons); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const handleUse = (code) => {
    setPrefillCode(code);
    setShowRedeem(true);
  };

  const handleRedeemSuccess = (data) => {
    setShowRedeem(false);
    setSuccessMsg(data.message);
    loadCoupons();
    setTimeout(() => setSuccessMsg(""), 6000);
  };

  const tabs = ["available", "used", "expired"];
  const tabLabels = { available: "✅ Available", used: "✔ Used", expired: "⏰ Expired" };
  const filtered = coupons.filter(c => c.status === activeTab);
  const availableCount = coupons.filter(c => c.status === "available").length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text-1)', fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
          🎟 내 보유Coupon
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>
          Issue받은 Coupon을 Confirm하고 바로 사용할 Count 있습니다.
        </p>

      {/* Success Banner */}
      {successMsg && (
        <div style={{
          background: "rgba(34,197,94,0.1)", border: "1.5px solid rgba(34,197,94,0.3)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20,
          color: "#4ade80", fontSize: 14, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🎉 {successMsg}
      )}

      {/* Coupon번호 직접 입력 */}
      <div style={{
        background: "rgba(79,142,247,0.06)", border: "1.5px solid rgba(79,142,247,0.15)",
        borderRadius: 14, padding: "18px 20px", marginBottom: 20,
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
      }}>
        <input
          value={inputCode}
          onChange={e => setInputCode(e.target.value.toUpperCase())}
          placeholder="Coupon번호 직접 입력 (GENIE-...)"
          style={{
            flex: 1, minWidth: 200, background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(79,142,247,0.2)", borderRadius: 9,
            color: "#4f8ef7", fontSize: 15, fontWeight: 700,
            padding: "11px 14px", outline: "none", fontFamily: "monospace",
            letterSpacing: "1px",
          }}
          onKeyDown={e => e.key === "Enter" && inputCode && handleUse(inputCode)}
        />
        <button onClick={() => inputCode && handleUse(inputCode)} style={{
          background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)',
          border: "none", borderRadius: 9, padding: "11px 22px", fontWeight: 700,
          fontSize: 14, cursor: "pointer",
        }}>Coupon Use하기</button>

      {/* Tab */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${activeTab === tab ? "rgba(79,142,247,0.35)" : "rgba(255,255,255,0.08)"}`,
            color: activeTab === tab ? "#4f8ef7" : "rgba(255,255,255,0.5)",
            borderRadius: 9, padding: "7px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            {tabLabels[tab]}
            {tab === "available" && availableCount > 0 && (
              <span style={{
                background: "#4f8ef7", color: 'var(--text-1)', borderRadius: "999px",
                padding: "1px 7px", fontSize: 11, marginLeft: 6, fontWeight: 700,
              }}>{availableCount}</span>
            )}
          </button>
        ))}

      {/* Coupon List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
          Loading...
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px",
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            {activeTab === "available" ? "🎟" : activeTab === "used" ? "✔" : "⏰"}
          <div style={{ color: "var(--text-3)", fontSize: 14 }}>
            {activeTab === "available" ? "Available한 Coupon이 없습니다." :
             activeTab === "used" ? "사용한 Coupon이 없습니다." : "Expired된 Coupon이 없습니다."}
          {activeTab === "available" && (
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: "8px 0 0" }}>
              Coupon번호가 있으시면 위에 직접 입력해 사용하세요.
            </p>
          )}
      ) : (
        filtered.map(coupon => (
          <CouponCard key={coupon.id} coupon={coupon} onUse={handleUse} />
        ))
      )}

      {/* 사용하기 Modal */}
      {showRedeem && (
        <RedeemModal
          prefillCode={prefillCode}
          onClose={() => setShowRedeem(false)}
          onSuccess={handleRedeemSuccess}
        />
      )}
                                    </div>
                                </div>
                            </div>
                        </div>
        </div>
    </div>
);
}
