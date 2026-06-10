
/* ── Enterprise Dynamic Locale Map ────────────────────── */
const LANG_LOCALE_MAP = {
  ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN', 'zh-TW':'zh-TW',
  de:'de-DE', es:'es-ES', fr:'fr-FR', pt:'pt-BR', ru:'ru-RU',
  ar:'ar-SA', hi:'hi-IN', th:'th-TH', vi:'vi-VN', id:'id-ID'
};
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { postJson } from '../services/apiClient.js';
import { useI18n } from '../i18n/index.js';

const USD = (v) => "$" + Number(v).toLocaleString("en-US");

export default function PaymentSuccess() {
  // 209차 P0: line 91 LANG_LOCALE_MAP[lang] 의 lang 미선언 → 결제성공 후 ReferenceError 크래시(흰화면).
  //   useT() 만으론 lang 없음 → useI18n() 로 t+lang 동시 수신.
  const { t, lang } = useI18n();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token, user, upgrade, reloadMenuAccess } = useAuth();
    const [status, setStatus] = useState("confirming"); // confirming | success | error
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const paymentKey = searchParams.get("paymentKey");
        const orderId = searchParams.get("orderId");
        const amount = Number(searchParams.get("amount"));
        const cycle = searchParams.get("cycle") || "monthly";
        const plan = searchParams.get("plan") || "pro";

        if (!paymentKey || !orderId || !amount) {
            setStatus("error");
            setError(t('paymentSuccess.invalidInfo', "결제 정보가 올바르지 않습니다."));
            return;
        }

        (async () => {
            try {
                const d = await postJson("/api/auth/payment/confirm", { paymentKey, orderId, amount, plan, cycle });
                if (!d.ok) throw new Error(d.error || t('paymentSuccess.verifyFailed', "결제 확인 실패"));

                // AuthContext 사용자 정보 갱신
                if (d.user) {
                    await upgrade(d.user.plan, cycle); // 로컬 상태 동기화
                    // 새 플랜의 메뉴 접근 권한 즉시 로드 → 사이드바 잠금 해제
                    if (reloadMenuAccess) reloadMenuAccess();
                }

                setResult(d);
                setStatus("success");
            } catch (e) {
                setError(e.message);
                setStatus("error");
            }
        })();
    }, []); // eslint-disable-line

    const cycle = searchParams.get("cycle") || "monthly";
    const amount = Number(searchParams.get("amount") || 0);
    const cycleLabel = {
        monthly: t('paymentSuccess.cycleMonthly', "월간 (1개월)"),
        quarterly: t('paymentSuccess.cycleQuarterly', "분기 (3개월)"),
        yearly: t('paymentSuccess.cycleYearly', "연간 (12개월)"),
    }[cycle] || t('paymentSuccess.cycleMonthlyShort', "월간");

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px" }}>
            {status === "confirming" && (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1.5s linear infinite" }}>⏳</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{t('paymentSuccess.confirming', "결제 확인 중...")}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t('paymentSuccess.pleaseWait', "잠시만 기다려 주세요.")}</div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {status === "success" && (
                <div style={{ textAlign: "center", maxWidth: 480, width: "100%" }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
                        {t('paymentSuccess.activated', "Pro 플랜 활성화 완료!")}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 28, lineHeight: 1.7 }}>
                        {t('paymentSuccess.activatedDesc', "결제가 완료되었습니다. 모든 Pro 기능을 즉시 이용하실 수 있습니다.")}
                    </div>

                    {/* 결제 상세 */}
                    <div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 24, textAlign: "left" }}>
                        <div style={{ fontWeight: 800, fontSize: 12, color: "#4f8ef7", marginBottom: 12 }}>📋 {t('paymentSuccess.detailTitle', "결제 내역")}</div>
                        {[
                            [t('paymentSuccess.fieldPlan', "플랜"), t('paymentSuccess.proPlan', "Pro 플랜")],
                            [t('paymentSuccess.fieldCycle', "구독 주기"), cycleLabel],
                            [t('paymentSuccess.fieldAmount', "결제 금액"), amount > 0 ? USD(amount) : "—"],
                            [t('paymentSuccess.fieldExpires', "만료일"), result?.payment?.expires_at
                                ? new Date(result.payment.expires_at).toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR')
                                : "—"],
                            [t('paymentSuccess.fieldOrderId', "주문 번호"), result?.payment?.orderId || searchParams.get("orderId") || "—"],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                                <span style={{ color: "var(--text-3)" }}>{label}</span>
                                <span style={{ color: '#fff', fontWeight: 700 }}>{value}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate("/dashboard")}
                        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4f8ef7,#a855f7)", color: '#fff', fontWeight: 900, fontSize: 15, boxShadow: "0 6px 24px rgba(79,142,247,0.4)" }}
                    >🚀 {t('paymentSuccess.goDashboard', "대시보드로 이동")}</button>
                </div>
            )}

            {status === "error" && (
                <div style={{ textAlign: "center", maxWidth: 400 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginBottom: 8 }}>{t('paymentSuccess.verifyFailed', "결제 확인 실패")}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.7 }}>
                        {error || t('paymentSuccess.errorGeneric', "결제 처리 중 오류가 발생했습니다.")}
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button
                            onClick={() => navigate("/pricing")}
                            style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(79,142,247,0.4)", background: "rgba(79,142,247,0.08)", color: "#4f8ef7", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                        >{t('paymentSuccess.toPricing', "요금제 페이지로")}</button>
                        <button
                            onClick={() => navigate("/dashboard")}
                            style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-2)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                        >{t('paymentSuccess.toDashboard', "대시보드로")}</button>
                    </div>
                </div>
            )}
        </div>
    );
}