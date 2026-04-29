import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from '../i18n/index.js';

export default function PaymentFail() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get("message") || t('payment.failMessage', 'Payment was cancelled or an error occurred.');
  const code = searchParams.get("code") || "";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", padding: "40px 20px", textAlign: "center"
    }}>
      {/* Error Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.15)', marginBottom: 24
      }}>
        <span style={{ fontSize: 40 }}>❌</span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444", marginBottom: 10 }}>
        {t('payment.failTitle', 'Payment Failed')}
      </div>
      <div style={{
        fontSize: 14, color: "var(--text-3, #64748b)", marginBottom: 12,
        lineHeight: 1.7, maxWidth: 420
      }}>
        {message}
      </div>
      {code && (
        <div style={{
          fontSize: 11, color: "var(--text-4, #94a3b8)", marginBottom: 24,
          fontFamily: "monospace", padding: "6px 14px", borderRadius: 8,
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)"
        }}>
          Error Code: {code}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            padding: "12px 32px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: '#fff',
            fontWeight: 800, fontSize: 14, transition: "all 0.2s"
          }}
        >
          🔄 {t('payment.tryAgain', 'Try Again')}
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "12px 28px", borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.8)",
            color: "var(--text-2, #475569)", fontWeight: 700, fontSize: 13, cursor: "pointer"
          }}
        >
          🏠 {t('payment.goToDashboard', 'Go to Dashboard')}
        </button>
        <button
          onClick={() => window.open('mailto:support@genie-go.com', '_blank')}
          style={{
            padding: "12px 28px", borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.8)",
            color: "var(--text-2, #475569)", fontWeight: 700, fontSize: 13, cursor: "pointer"
          }}
        >
          📧 {t('payment.contactSupport', 'Contact Support')}
        </button>
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: 32, padding: "16px 24px", borderRadius: 12, maxWidth: 440,
        background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.1)"
      }}>
        <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", lineHeight: 1.6 }}>
          💡 {t('payment.failHelp', 'If this issue persists, please check your payment method or contact support for assistance.')}
        </div>
      </div>
    </div>
  );
}