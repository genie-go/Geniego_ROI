import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n";

/**
 * DemoBanner — Demo Mode에서 각 페이지 상단에 표시되는 안내 배너
 */
export default function DemoBanner({ feature }) {
    const navigate = useNavigate();
    const t = useT();
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8, padding: "8px 12px", marginBottom: 12,
            background: "linear-gradient(90deg,rgba(79,142,247,0.10),rgba(168,85,247,0.08))",
            border: "1px solid rgba(79,142,247,0.30)", borderRadius: 10,
            position: "relative", flexWrap: "nowrap", overflow: "hidden",
        }}>
            {/* 왼쪽: 배지 + 짧은 설명 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                <span style={{
                    fontWeight: 900, fontSize: 10, color: "#a5b4fc",
                    padding: "2px 7px", borderRadius: 99, whiteSpace: "nowrap",
                    background: "rgba(79,142,247,0.15)", border: "1px solid rgba(79,142,247,0.27)",
                    flexShrink: 0,
                }}>{t('demo.demoBadge') || '🎭 Demo'}</span>
                <span style={{
                    fontSize: 11, color: "rgba(255,255,255,0.55)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{t('demo.demoRunning') || 'Exploring with virtual data'}</span>
            </div>

            {/* 오른쪽: CTA 버튼 + Close */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <button
                    onClick={() => navigate("/app-pricing")}
                    style={{
                        padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
                        color: "#fff", fontWeight: 800, fontSize: 11,
                        whiteSpace: "nowrap",
                    }}
                >{t('demo.demoPriceCheck') || 'Pricing'}</button>
                <button
                    onClick={() => navigate("/register")}
                    style={{
                        padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                        color: "#fff", fontWeight: 800, fontSize: 11,
                        whiteSpace: "nowrap",
                    }}
                >{t('demo.demoJoin') || '🚀 Upgrade'}</button>
                <button
                    onClick={() => setDismissed(true)}
                    title={t('close') || 'Close'}
                    style={{
                        width: 22, height: 22, borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "rgba(255,255,255,0.4)",
                        cursor: "pointer", fontSize: 11, display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                >✕</button>
            </div>
        </div>
    );
}
