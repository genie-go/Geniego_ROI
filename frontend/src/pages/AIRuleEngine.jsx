import React, { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

import { useT } from '../i18n/index.js';
/* ─── Common 유틸 ─────────────────────────────────── */
const rnd = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
        background: color + "1a", color, border: `1px solid ${color}33`,
    }}>{label}</span>
);

const Bar = ({ v, max = 100, color = "#4f8ef7", h = 5 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.06)", borderRadius: h, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width 0.6s ease" }} />
    </div>
);

const Chip = ({ children, active, onClick, color = "#4f8ef7" }) => (
    <button onClick={onClick} style={{
        padding: "4px 12px", borderRadius: 99, border: `1px solid ${active ? color : "rgba(99,140,255,0.18)"}`,
        background: active ? color + "1a" : "transparent", color: active ? color : "var(--text-3)",
        fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 150ms",
    }}>{children}</button>
);

/* ─── Learning Pattern Data ─────────────────────────────── */
const PATTERNS = [
    {
        id: "P001", type: t('auto.inzrye', 'ROAS 이상'), domain: "Ad", confidence: 0.94, impact: "HIGH",
        pattern: t('auto.4rj46w', 'ROAS < 2.5 AND Ad Spend > ₩500K AND Period ≥ 3일'),
        evidence: [t('auto.k7ufy1', 'TikTok CPP 23건'), t('auto.foq98c', 'Coupang DA 18건'), t('auto.kqcygr', 'Average 손실 ₩2.1M/건')],
        suggestedRule: { name: t('auto.z5xi6b', '저ROAS AutoStop'), condition: "channel_roas < 2.5 AND spend_3d > 500000", action: "PAUSE_CAMPAIGN", threshold: 2.5 },
        learnedFrom: t('auto.yfar5b', '12주 Ad Data 41,892건'),
        detectedAt: "2026-03-05 09:14",
    },
    {
        id: "P002", type: t('auto.l7i6gm', '반품률 급등'), domain: t('auto.s10i17', '커머스'), confidence: 0.91, impact: "HIGH",
        pattern: t('auto.dp6ixo', 'return_rate > 12% AND 연속 ≥ 2주 AND SKU 동일'),
        evidence: [t('auto.4q1int', 'SKU-C3 3주 연속 19.8%'), "SKU-D4 20.2%", t('auto.9vg9ku', 'Product Description 불일치 Pattern')],
        suggestedRule: { name: t('auto.jiznxz', '고반품 SKU Alert'), condition: "sku_return_rate > 0.12 AND weeks_consecutive >= 2", action: "ALERT_OPS + HOLD_ADS", threshold: 12 },
        learnedFrom: t('auto.m8s5av', 'Orders/반품 Log 138,420건'),
        detectedAt: "2026-03-05 08:30",
    },
    {
        id: "P003", type: t('auto.u181qs', 'Coupon 남용'), domain: t('auto.oly8zy', '인플루언서'), confidence: 0.87, impact: "MID",
        pattern: t('auto.7h0lw3', 'coupon_use_rate > 1.8‰ AND creator_tier = Macro AND 7일 내'),
        evidence: [t('auto.w1lxyj', '테크바이브 Coupon 340건'), t('auto.xv74kd', '정상 대비 3.1배'), t('auto.7hfuof', 'Coupon 적자 ₩17M')],
        suggestedRule: { name: t('auto.c0ieud', 'Coupon 남용 감지'), condition: "coupon_rate > 0.0018 AND creator_tier = 'macro'", action: "REDUCE_COUPON_LIMIT", threshold: 1.8 },
        learnedFrom: t('auto.7m117z', '인플루언서 Coupon 거래 22,310건'),
        detectedAt: "2026-03-04 23:55",
    },
    {
        id: "P004", type: t('auto.794vz2', '고Performance Budget 기회'), domain: "Ad", confidence: 0.89, impact: "POSITIVE",
        pattern: t('auto.seynge', 'ROAS > 6.5 AND budget_util < 80% AND Last 7 Days 지속'),
        evidence: ["Naver SA 7.1x Budget 73%", "Google Brand 7.0x Budget 68%", t('auto.6lqtab', '증액 시 예상 +₩28M')],
        suggestedRule: { name: t('auto.c08x4x', '고ROAS Auto증액'), condition: "channel_roas > 6.5 AND budget_utilization < 0.8", action: "INCREASE_BUDGET_15PCT", threshold: 6.5 },
        learnedFrom: t('auto.95h8fb', 'Budget Performance 이력 5,240건'),
        detectedAt: "2026-03-05 07:00",
    },
    {
        id: "P005", type: t('auto.caoys5', '화이트리스트 Expired'), domain: t('auto.d7xnjl', '인플루언서'), confidence: 0.99, impact: "MID",
        pattern: t('auto.h8a4z2', 'whitelist_expiry <= 30일 AND whitelist = true AND Ad 집행 in progress'),
        evidence: [t('auto.lk2yda', '테크바이브 Expired 25일 전'), t('auto.z33b49', '데일리가젯 Expired 100일 전'), t('auto.xjy4lp', '권리 위반 잠재 리스크')],
        suggestedRule: { name: t('auto.0ko3te', '화이트리스트 Expired Notification'), condition: "days_to_wl_expiry <= 30 AND active_ads = true", action: "NOTIFY_LEGAL + PAUSE_ADS_ON_EXPIRE", threshold: 30 },
        learnedFrom: t('auto.f86ge1', '계약/Ad 매핑 Data 1,580건'),
        detectedAt: "2026-03-05 06:00",
    },
];

const ACTIVE_RULES = [
    { id: "R001", name: t('auto.wknuuu', 'ROAS 손익Quarter Alert'), condition: "channel_roas < 3.0", action: "ALERT", fires: 34, prevented: "₩18.2M", accuracy: 0.92, status: "active", origin: "AI Recommendation→Approval" },
    { id: "R002", name: t('auto.zan0jr', '반품률 임계 Alert'), condition: "sku_return_rate > 0.15", action: "ALERT + HOLD", fires: 12, prevented: "₩6.4M", accuracy: 0.88, status: "active", origin: "AI Recommendation→Approval" },
    { id: "R003", name: t('auto.48ol6m', 'Ad Spend Daily 캡'), condition: "daily_spend > 2000000", action: "CAP_SPEND", fires: 8, prevented: "₩4.1M", accuracy: 0.95, status: "active", origin: t('auto.mbhptf', 'Count동 Register') },
    { id: "R004", name: t('auto.ltuosw', 'e-Sign 미Done Alert'), condition: "contract_esign = pending AND days > 7", action: "NOTIFY_CREATOR", fires: 3, prevented: t('auto.2hmgyk', '법적 리스크'), accuracy: 0.99, status: "active", origin: "AI Recommendation→Approval" },
    { id: "R005", name: t('auto.az7y9i', '이탈 위험 Email Auto Send'), condition: "last_purchase > 30d AND grade != lost", action: "SEND_EMAIL → CRM", fires: 18, prevented: t('auto.a5layi', '재구매 유도'), accuracy: 0.86, status: "active", origin: "AI Recommendation→Approval", linked: "email" },
    { id: "R006", name: t('auto.qk6srr', 'VIP 구매 Done Kakao Notification'), condition: "purchase_done AND grade = vip OR gold", action: "SEND_KAKAO → CRM", fires: 41, prevented: t('auto.lxrojv', 'VIP 리텐션'), accuracy: 0.97, status: "active", origin: "AI Recommendation→Approval", linked: "kakao" },
];

const MODEL_METRICS = {
    accuracy: 91.4,
    precision: 89.2,
    recall: 93.1,
    f1: 91.1,
    dataPoints: 204442,
    rulesGenerated: 38,
    rulesApproved: 22,
    falsePositiveRate: 8.6,
    weeklyTrend: [82, 84, 86, 87, 89, 90, 91],
};

/* ─── TAB 1: ML Pattern 탐지 & Recommendation ────────────────── */
function PatternDiscoveryTab() {
    const [selected, setSelected] = useState(null);
    const [ruleStatuses, setRuleStatuses] = useState({});
    const [showConfirm, setShowConfirm] = useState(null);

    const impactColors = { HIGH: "#ef4444", MID: "#eab308", POSITIVE: "#22c55e" };
    const domainColors = { Ad: "#4f8ef7t('auto.ujgxxs', ', 커머스:')#f97316t('auto.t4c1os', ', 인플루언서:')#a855f7" };

    const handleApprove = (id) => {
        setRuleStatuses(s => ({ ...s, [id]: "approved" }));
        setShowConfirm(null);
        setSelected(null);
    };
    const handleReject = (id) => {
        setRuleStatuses(s => ({ ...s, [id]: "rejected" }));
        setShowConfirm(null);
    };

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* Summary statsbar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                    { l: t('auto.60pdm0', '탐지된 Pattern'), v: PATTERNS.length + t('auto.0ubrwk', '건'), c: "#4f8ef7", i: "🔍" },
                    { l: "Approval Pending", v: Object.values(ruleStatuses).filter(s => s !== "approved" && s !== "rejected").length === 0 ? (PATTERNS.length - Object.keys(ruleStatuses).length) + t('auto.6of7fk', '건') : (PATTERNS.length - Object.keys(ruleStatuses).length) + t('auto.q3otoo', '건'), c: "#eab308", i: "⏳" },
                    { l: "Approval Done", v: Object.values(ruleStatuses).filter(s => s === "approved").length + t('auto.cqra50', '건'), c: "#22c55e", i: "✅" },
                    { l: t('auto.wjf0hw', '거부'), v: Object.values(ruleStatuses).filter(s => s === "rejected").length + t('auto.a4qi4y', '건'), c: "#ef4444", i: "❌" },
                ].map(({ l, v, c, i }) => (
                    <div key={l} className="card card-glass" style={{ padding: "14px 16px", borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{i} {l}</div>
                        <div style={{ fontWeight: 900, fontSize: 22, color: c, marginTop: 4 }}>{v}</div>
                    </div>
                ))}
            </div>

            {PATTERNS.map(p => {
                const status = ruleStatuses[p.id];
                const isApproved = status === "approved";
                const isRejected = status === "rejected";
                const pendingConfirm = showConfirm === p.id;

                return (
                    <div key={p.id} className="card card-glass" style={{
                        borderLeft: `3px solid ${impactColors[p.impact]}`,
                        opacity: isRejected ? 0.5 : 1,
                        transition: "opacity 300ms",
                    }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{p.type}</div>
                                <Tag label={p.domain} color={domainColors[p.domain]} />
                                <Tag label={p.impact === "POSITIVE" ? t('auto.ii9kqg', '✅ 기회') : p.impact === "HIGH" ? t('auto.6do1w4', '🔴 고위험') : t('auto.t06wll', '🟡 in progress위험')} color={impactColors[p.impact]} />
                                {isApproved && <Tag label={t('auto.o0a6td', '✓ Rule Register됨')} color="#22c55e" />}
                                {isRejected && <Tag label="Rejected" color="#ef4444" />}
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t('auto.howz2y', '신뢰도')}</div>
                                <div style={{ fontWeight: 900, fontSize: 16, color: impactColors[p.impact] }}>{(p.confidence * 100).toFixed(0)}%</div>
                            </div>
                        </div>

                        {/* 신뢰도 바 */}
                        <div style={{ margin: "10px 0" }}>
                            <Bar v={p.confidence * 100} color={impactColors[p.impact]} h={4} />
                        </div>

                        {/* Pattern Condition */}
                        <div style={{ padding: "8px 12px", background: "rgba(9,15,30,0.6)", borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: "#4f8ef7", marginBottom: 10 }}>
                            IF {p.pattern}
                        </div>

                        {/* 증거 */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                            {p.evidence.map((e, i) => (
                                <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(99,140,255,0.07)", color: "var(--text-2)", border: "1px solid rgba(99,140,255,0.1)" }}>{e}</span>
                            ))}
                        </div>

                        {/* Learning 출처 + Date */}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginBottom: 12 }}>
                            <span>📊 Learning Data: {p.learnedFrom}</span>
                            <span>🕐 {p.detectedAt}</span>
                        </div>

                        {/* Recommendation Rule 상자 */}
                        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.15)", marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>🤖 AI Recommendation Rule</div>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{p.suggestedRule.name}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a855f7", marginBottom: 4 }}>IF {p.suggestedRule.condition}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#22c55e" }}>THEN {p.suggestedRule.action}</div>
                        </div>

                        {/* Action Button */}
                        {!isApproved && !isRejected && (
                            pendingConfirm ? (
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <span style={{ fontSize: 11, color: "var(--text-2)" }}>{t('auto.uu3k2l', '이 Rule을 시스템에 Register합니까?')}</span>
                                    <button onClick={() => handleApprove(p.id)} className="btn-primary" style={{ fontSize: 11, padding: "5px 16px", background: "linear-gradient(135deg,#22c55e,#14b8a6)" }}>✓ Approval Register</button>
                                    <button onClick={() => setShowConfirm(null)} className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }}>Cancel</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => setShowConfirm(p.id)} className="btn-primary" style={{ fontSize: 11, padding: "5px 18px", background: "linear-gradient(135deg,#4f8ef7,#6366f1)" }}>✓ Rule Approval</button>
                                    <button onClick={() => setSelected(selected === p.id ? null : p.id)} className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }}>Condition Edit</button>
                                    <button onClick={() => handleReject(p.id)} className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px", color: "#ef4444" }}>{t('auto.341j43', '✗ 거부')}</button>
                                </div>
                            )
                        )}

                        {/* 인라인 Edit */}
                        {selected === p.id && !isApproved && !isRejected && (
                            <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "rgba(99,140,255,0.05)", border: "1px dashed rgba(99,140,255,0.2)" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>{t('auto.a2dfed', '⚙ 임계치 조정')}</div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t('auto.xpal96', '기준Value:')}</span>
                                    <input type="number" defaultValue={p.suggestedRule.threshold}
                                        style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "var(--surface-2)", color: "var(--text-1)", fontSize: 12 }} />
                                    <button onClick={() => setShowConfirm(p.id)} className="btn-primary" style={{ fontSize: 11, padding: "4px 14px" }}>{t('auto.afbn74', 'Edit 후 Approval')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── TAB 2: 모델 Learning 현황 ─────────────────────── */
function ModelStatusTab() {
    const [training, setTraining] = useState(false);
    const [progress, setProgress] = useState(0);
    const [log, setLog] = useState([
        { t: "09:00:01", msg: t('auto.1r9811', 'Data 파이프라인 Reset Done (204,442건 로드)') },
        { t: "09:00:03", msg: t('auto.crst0v', '특성 추출: ROAS, 반품률, Coupon사용률, Ad Spend 등 28개 피처') },
        { t: "09:00:05", msg: t('auto.dh015a', '이상탐지 모델(IsoForest) Learning Start') },
        { t: "09:00:12", msg: t('auto.mex10j', 'Pattern 클러스터링(DBSCAN) Done → 5개 클러스터 발견') },
        { t: "09:00:18", msg: t('auto.kg472e', 'Rule Create 엔진(LLM+Decision Tree) Recommendation Rule 38개 Create') },
        { t: "09:00:22", msg: t('auto.ce1m2a', '검증셋 평가 → 정확도 91.4%, F1 91.1%') },
        { t: "09:00:24", msg: t('auto.bllnxw', '✅ Learning Done. 5개 Pattern 탐지 → User 검토 Pending') },
    ]);

    const startTraining = async () => {
        setTraining(true);
        setProgress(0);
        const steps = [
            [5, t('auto.vakbap', '🔄 Data Count집 in progress... (Ad/커머스/인플루언서 API)')],
            [20, t('auto.upbxrf', '🧹 Data 전처리 및 피처 엔지니어링')],
            [40, t('auto.k7ezzs', '🤖 이상탐지 모델(Isolation Forest) 재Learning')],
            [60, t('auto.m6g82o', '📊 Pattern 클러스터링(DBSCAN) Run')],
            [75, t('auto.mqv83o', '🔤 LLM Rule Create 엔진 호출 (GPT-4o)')],
            [88, t('auto.peewbx', '✅ 검증셋 평가 및 신뢰도 산출')],
            [100, t('auto.or892b', '🎉 재Learning Done! 새 Pattern 3건 Add 발견')],
        ];
        for (const [p, msg] of steps) {
            await sleep(700 + Math.random() * 500);
            setProgress(p);
            setLog(prev => [...prev, { t: new Date().toTimeString().slice(0, 8), msg }]);
        }
        setTraining(false);
    };

    const wt = MODEL_METRICS.weeklyTrend;

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* 메트릭 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                    { l: t('auto.vwtpnf', '정확도'), v: MODEL_METRICS.accuracy + "%", c: "#22c55e" },
                    { l: t('auto.tjh0t4', '정밀도'), v: MODEL_METRICS.precision + "%", c: "#4f8ef7" },
                    { l: t('auto.fbhgsk', '재현율'), v: MODEL_METRICS.recall + "%", c: "#a855f7" },
                    { l: "F1 Score", v: MODEL_METRICS.f1 + "%", c: "#14d9b0" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="card card-glass" style={{ padding: "14px 16px", borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
                        <div style={{ fontWeight: 900, fontSize: 26, color: c, marginTop: 4 }}>{v}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Weekly 정확도 트렌드 SVG */}
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t('auto.7tjbfq', '📈 Weekly 모델 정확도 추이')}</div>
                    <svg width="100%" height={120} viewBox="0 0 300 120" style={{ overflow: "visible" }}>
                        <defs>
                            <linearGradient id="acc-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f8ef7" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {wt.map((v, i) => {
                            const x = (i / (wt.length - 1)) * 280 + 10;
                            const y = 110 - ((v - 78) / 16) * 100;
                            return (
                                <g key={i}>
                                    <circle cx={x} cy={y} r={4} fill="#4f8ef7" />
                                    <text x={x} y={y - 8} textAnchor="middle" fontSize={9} fill="var(--text-3)">{v}%</text>
                                </g>
                            );
                        })}
                        <polyline
                            points={wt.map((v, i) => `${(i / (wt.length - 1)) * 280 + 10},${110 - ((v - 78) / 16) * 100}`).join(" ")}
                            fill="none" stroke="#4f8ef7" strokeWidth={2} />
                        <polygon
                            points={[
                                ...wt.map((v, i) => `${(i / (wt.length - 1)) * 280 + 10},${110 - ((v - 78) / 16) * 100}`),
                                "290,110", "10,110"
                            ].join(" ")}
                            fill="url(#acc-grad)" />
                        {[t('auto.0hj1ho', '3w전'), t('auto.wyzpmt', '2w전'), t('auto.n5124f', '1w전'), t('auto.asu6z7', '이번주')].map((l, i) => (
                            <text key={i} x={(i / 3) * 280 + 10} y={120} fontSize={8} fill="var(--text-3)" textAnchor="middle">{l}</text>
                        ))}
                    </svg>
                </div>

                {/* Learning Data 현황 */}
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t('auto.ldq6mb', '📊 Learning Data 현황')}</div>
                    {[
                        { l: "Ad Event", v: 82340, max: 100000, c: "#4f8ef7" },
                        { l: t('auto.ghp4cn', 'Orders/반품'), v: 62110, max: 100000, c: "#f97316" },
                        { l: t('auto.f1gzzo', '인플루언서 거래'), v: 39820, max: 100000, c: "#a855f7" },
                        { l: t('auto.3pcc45', '정산 레코드'), v: 20172, max: 100000, c: "#22c55e" },
                    ].map(({ l, v, max, c }) => (
                        <div key={l} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{l}</span>
                                <span style={{ color: c, fontWeight: 700 }}>{v.toLocaleString()} items</span>
                            </div>
                            <Bar v={v} max={max} color={c} h={5} />
                        </div>
                    ))}
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>Total {MODEL_METRICS.dataPoints.toLocaleString()}건 Learning</div>
                </div>
            </div>

            {/* 재Learning Run */}
            <div className="card card-glass" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('auto.nz57ur', '🔄 모델 재Learning')}</div>
                    <button onClick={startTraining} disabled={training} className="btn-primary" style={{
                        padding: "7px 20px", fontSize: 12,
                        background: training ? "rgba(99,140,255,0.2)" : "linear-gradient(135deg,#4f8ef7,#a855f7)",
                        cursor: training ? "not-allowed" : "pointer",
                    }}>
                        {training ? "Learning in progress..." : t('auto.6m8n89', '⚡ 지금 재Learning')}
                    </button>
                </div>

                {training && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                            <span style={{ color: "var(--text-2)" }}>{t('auto.3jq1ff', 'Learning In Progress률')}</span>
                            <span style={{ color: "#4f8ef7", fontWeight: 700 }}>{progress}%</span>
                        </div>
                        <Bar v={progress} color="#4f8ef7" h={8} />
                    </div>
                )}

                {/* Log */}
                <div style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 4 }}>
                    {log.map((l, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(99,140,255,0.05)" }}>
                            <span style={{ color: "var(--text-3)", fontFamily: "monospace", flexShrink: 0 }}>{l.t}</span>
                            <span style={{ color: "var(--text-2)" }}>{l.msg}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── TAB 3: Active Rule 현황 ────────────────────────── */
function ActiveRulesTab({ isDemo }) {
    const [rules, setRules] = useState(ACTIVE_RULES);
    const [hoveredId, setHoveredId] = useState(null);

    const toggle = (id) => {
        if (isDemo) { alert(t('auto.dfx457', '📌 Demo Mode: Rule Active/Inactive은 실사용 Account에서만 가능합니다.\n시뮬레이션 Data를 빠를 Count 없습니다.')); return; }
        setRules(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "active" ? "paused" : "active" } : r));
    };

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                    { l: "Active Rule", v: rules.filter(r => r.status === "active").length + t('auto.76oh7m', '건'), c: "#22c55e" },
                    { l: t('auto.9ix8wb', 'Total 발동 횟Count'), v: rules.reduce((s, r) => s + r.fires, 0) + t('auto.751ckj', '회'), c: "#4f8ef7" },
                    { l: t('auto.7drdq1', 'Total 예방 Amount'), v: "₩28.7M", c: "#f97316" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="card card-glass" style={{ padding: "12px 16px", borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
                        <div style={{ fontWeight: 900, fontSize: 22, color: c, marginTop: 4 }}>{v}</div>
                    </div>
                ))}
            </div>

            <div className="card card-glass" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "rgba(9,15,30,0.5)", fontSize: 10, color: "var(--text-3)" }}>
                            {["Rule Name", "Condition", "Action", t('auto.dk5kfh', '발동'), t('auto.dho2xb', '예방 효과'), t('auto.zu5rm4', '정확도'), t('auto.dy4lbq', '출처'), "Status"].map(h => (
                                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map(r => (
                            <tr key={r.id}
                                onMouseEnter={() => setHoveredId(r.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{ background: hoveredId === r.id ? "rgba(79,142,247,0.04)" : "transparent", transition: "background 150ms" }}>
                                <td style={{ padding: "11px 12px", fontWeight: 700, fontSize: 12 }}>{r.name}</td>
                                <td style={{ padding: "11px 12px", fontFamily: "monospace", fontSize: 10, color: "#a855f7" }}>{r.condition}</td>
                                <td style={{ padding: "11px 12px" }}><Tag label={r.action} color="#f97316" /></td>
                                <td style={{ padding: "11px 12px", fontWeight: 700, color: "#4f8ef7" }}>{r.fires}회</td>
                                <td style={{ padding: "11px 12px", fontWeight: 700, color: "#22c55e" }}>{r.prevented}</td>
                                <td style={{ padding: "11px 12px" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: r.accuracy >= 0.9 ? "#22c55e" : "#eab308" }}>{(r.accuracy * 100).toFixed(0)}%</div>
                                </td>
                                <td style={{ padding: "11px 12px" }}><Tag label={r.origin} color={r.origin.includes("AI") ? "#a855f7" : "#6366f1"} /></td>
                                <td style={{ padding: "11px 12px" }}>
                                    <button onClick={() => toggle(r.id)} style={{
                                        padding: "3px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                                        background: r.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                                        color: r.status === "active" ? "#22c55e" : "#ef4444",
                                    }}>{r.status === "active" ? "● Active" : t('auto.l3y7aa', '○ 정지')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─── TAB 4: LLM Rule Create 채팅 ───────────────────── */
const SUGGESTIONS = [
    t('auto.tvnvzh', 'TikTok ROAS가 3일 연속 2.5 미만이면 Auto으로 Ad를 Stop하는 Rule 만들어줘'),
    t('auto.934ys3', '반품률이 15% 초과 SKU는 Ad 집행을 홀드하고 운영Team에 Notification 보내는 Rule'),
    t('auto.l5d6ig', '화이트리스트 Expired 14일 전에 법무Team과 크리에이터에게 Auto Notification'),
    t('auto.ysx0nf', '일 Ad Spend가 Budget의 90% 소진되면 나머지를 ROAS 1위 Channel로 집in progress하는 Rule'),
    t('auto.b7o43b', '30일 이상 구매 없는 이탈 위험 Customer에게 Auto으로 Email Coupon Send'),
    t('auto.sktvcy', 'VIP Customer 구매 Done 시 Kakao Notification톡으로 혜택 안내 Auto Send'),
];

const LLM_MOCK = {
    "TikTok ROAS": {
        rule: `IF channel = 'tiktok'\n   AND channel_roas < 2.5\n   AND consecutive_days >= 3\nTHEN\n   PAUSE_CAMPAIGN(channel='tiktok')\n   NOTIFY_SLACK(channel='#ad-ops', msg='TikTok ROAS Alert')\n   LOG_ACTION(rule_id='LLM-GEN-001')`,
        explain: t('auto.idnbyd', 'TikTok ROAS가 3일 연속 2.5x 미만이면 Campaign을 일시정지하고 Slack Notification을 Send합니다. 과거 Data 기준 유사 상황에서 Average ₩2.1M 손실을 방지할 Count 있을 것으로 Forecast됩니다.'),
        confidence: 0.91,
        risks: [t('auto.73w8qu', '갑작스러운 ROAS 회복 시 기회 손실 가능'), t('auto.agxbcw', '3일 기준이 짧을 Count Present — 5일로 조정 고려')],
    },
    [t('auto.rule_return', '반품률')]: {
        rule: `IF sku_return_rate > 0.15\n   AND measurement_period = '7d'\nTHEN\n   HOLD_AD_SPEND(sku=current_sku)\n   NOTIFY_TEAM(team='ops', priority='HIGH')\n   CREATE_TASK(title=t('auto.ip8sao', '반품률 조사'), assignee='ops-lead')`,
        explain: t('auto.4ca1ll', '7일 Average 반품률 15% 초과 SKU에 대해 Ad 홀드와 운영Team Task를 Auto Generate합니다. 조기 개입 시 월 Average ₩4.8M 손실 방지가 가능합니다.'),
        confidence: 0.89,
        risks: [t('auto.xaam2o', '계절성 반품 급증 시 false positive 가능'), t('auto.e8xha6', 'Stock 상황 고려 로직 Add 권장')],
    },
    [t('auto.rule_whitelist', '화이트리스트')]: {
        rule: `IF contract.whitelist = true\n   AND days_to_expiry <= 14\nTHEN\n   NOTIFY_EMAIL(to='legal@company.com', template='wl_expire')\n   NOTIFY_CREATOR(msg=t('auto.n7ublx', 'Ad 권리 Expired 14일 전 안내'))\n   SCHEDULE_REVIEW(days=7)`,
        explain: t('auto.q5hfot', '화이트리스트 Expired 14일 전에 법무Team과 크리에이터에게 Auto Email·앱 Notification을 Send합니다. 권리 위반 리스크를 사전 Block합니다.'),
        confidence: 0.97,
        risks: [t('auto.jkc2gr', '크리에이터 연락처 Latest 여부 Confirm 필요')],
    },
    [t('auto.rule_ad_spend', '일 Ad Spend')]: {
        rule: `IF daily_budget_utilization >= 0.90\nTHEN\n   REALLOCATE_BUDGET(\n     from='all_channels',\n     to=TOP_ROAS_CHANNEL,\n     pct=0.10\n   )\n   NOTIFY_SLACK(msg=t('auto.rgzghl', 'Budget 90% 소진 → 고ROAS Channel 집in progress'))`,
        explain: t('auto.kcsm0h', '일 Budget 90% 소진 시 잔여 Budget을 당일 ROAS 최고 Channel에 집in progress 투입합니다. 과거 유사 재배분 실험 대비 Average +12% Revenue 개선 효과를 기대합니다.'),
        confidence: 0.85,
        risks: [t('auto.46rxnk', 'ROAS 실Time Data 지연 시 오작동 가능'), t('auto.qumzsx', 'Channel Budget 상한선 Settings 권장')],
    },
};

function LLMRuleGenTab() {
    const [messages, setMessages] = useState([
        { role: "ai", text: t('auto.bibet5', '안녕하세요! Genie AI Rule Create 엔진입니다. 원하는 비즈니스 Condition을 자연어로 Description해주시면 Auto으로 Rule 코드를 Create하고 신뢰도를 평가해드립니다.'), rule: null }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [savedRules, setSavedRules] = useState([]);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const findMock = (q) => {
        const keys = Object.keys(LLM_MOCK);
        for (const k of keys) {
            if (q.includes(k)) return LLM_MOCK[k];
        }
        return {
            rule: `IF custom_condition = true\n   AND threshold_exceeded\nTHEN\n   EXECUTE_ACTION(type='custom')\n   NOTIFY_TEAM()`,
            explain: `"${q}"에 기반하여 Create된 맞춤형 Rule입니다. 비즈니스 Condition에 맞게 세부 Edit이 필요합니다.`,
            confidence: 0.72,
            risks: [t('auto.ev4cv2', '구체적인 Condition Count치 검토 필요'), t('auto.q5tdjc', 'Test 환경에서 먼저 Run 권장')],
        };
    };

    const sendMessage = async (q = input) => {
        if (!q.trim() || loading) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: q }]);
        setLoading(true);
        setMessages(prev => [...prev, { role: "ai", text: "", loading: true }]);

        await sleep(800 + Math.random() * 800);
        const mock = findMock(q);

        setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "ai", text: mock.explain, rule: mock, query: q, loading: false };
            return next;
        });
        setLoading(false);
    };

    const saveRule = (msg) => {
        const ruleData = {
            name: msg.rule.rule?.split('\n')?.[0]?.replace(/^IF\s+/, '') || msg.query?.slice(0, 30) + ' Rule',
            condition: msg.rule.rule || '',
            action: msg.rule.explain || '',
            priority: 'MEDIUM',
            origin: 'LLM AutoCreate',
        };
        // [v8] GlobalDataContext에 Active Rule Register
        try { addActiveRule(ruleData); } catch (e) { /* GlobalData Disconnected 시 무시 */ }
        setSavedRules(prev => [...prev, { text: msg.query, ...msg.rule, savedAt: new Date().toLocaleTimeString() }]);
    };

    return (
        <div style={{ display: "grid", gap: 14 }}>
            {/* 빠른 제안 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} disabled={loading} style={{
                        padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.15)",
                        background: "rgba(99,140,255,0.04)", color: "var(--text-2)", fontSize: 11, textAlign: "left",
                        cursor: loading ? "not-allowed" : "pointer", lineHeight: 1.5, opacity: loading ? 0.5 : 1,
                    }}>💡 {s}</button>
                ))}
            </div>

            {/* 채팅 */}
            <div className="card card-glass" style={{ minHeight: 340, maxHeight: 480, overflowY: "auto", padding: 16, display: "grid", gap: 14, alignContent: "start" }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, justifyContent: m.role === "ai" ? "flex-start" : "flex-end" }}>
                        {m.role === "ai" && (
                            <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#a855f7,#4f8ef7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                        )}
                        <div style={{ maxWidth: "82%", display: "grid", gap: 8 }}>
                            <div style={{
                                padding: "10px 14px", borderRadius: m.role === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                                background: m.role === "ai" ? "rgba(79,142,247,0.07)" : "rgba(99,140,255,0.14)",
                                border: `1px solid ${m.role === "ai" ? "rgba(79,142,247,0.15)" : "rgba(99,140,255,0.2)"}`,
                                fontSize: 12, lineHeight: 1.6,
                            }}>
                                {m.loading ? (
                                    <span style={{ color: "var(--text-3)" }}>● Rule Creating...</span>
                                ) : (
                                    <span style={{ color: "var(--text-1)" }}>{m.text}</span>
                                )}
                            </div>
                            {/* Create된 Rule 코드 */}
                            {m.rule && !m.loading && (
                                <>
                                    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(9,15,30,0.8)", border: "1px solid rgba(99,140,255,0.12)" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t('auto.lphrtz', '📝 Create된 Rule 코드')}</div>
                                        <pre style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7", margin: 0, whiteSpace: "pre-wrap" }}>{m.rule.rule}</pre>
                                    </div>
                                    <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
                                        <span style={{ color: "#22c55e", fontWeight: 700 }}>신뢰도 {(m.rule.confidence * 100).toFixed(0)}%</span>
                                        {m.rule.risks?.map((r, ri) => (
                                            <span key={ri} style={{ color: "#eab308" }}>⚠ {r}</span>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => saveRule(m)} className="btn-primary" style={{ fontSize: 10, padding: "4px 14px", background: "linear-gradient(135deg,#22c55e,#14b8a6)" }}>✓ Rule Save</button>
                                        <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 12px" }}>Edit</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Save된 Rule */}
            {savedRules.length > 0 && (
                <div className="card card-glass" style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "#22c55e" }}>✅ Save된 AI Create Rule ({savedRules.length}건)</div>
                    {savedRules.map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(99,140,255,0.06)", fontSize: 11 }}>
                            <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{r.text?.slice(0, 40)}...</span>
                            <span style={{ color: "var(--text-3)" }}>{r.savedAt}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 입력창 */}
            <div style={{ display: "flex", gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder={t('auto.4lj6y4', '자연어로 Rule Condition을 입력하세요...')}
                    disabled={loading}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", background: "var(--surface-2)", color: "var(--text-1)", fontSize: 12, outline: "none" }} />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="btn-primary" style={{ padding: "10px 20px", fontSize: 12, background: "linear-gradient(135deg,#a855f7,#4f8ef7)" }}>
                    {loading ? "⋯" : "Create →"}
                </button>
            </div>
        </div>
    );
}

/* ─── MAIN ───────────────────────────────────────── */
const TABS = [
    { id: "discover", label: t('auto.kv5z8j', '🔍 Pattern 탐지'), desc: t('auto.evva9m', 'ML이 발견한 이상 Pattern') },
    { id: "model", label: t('auto.sdahw3', '🧠 모델 현황'), desc: t('auto.o5z8a4', 'Learning 메트릭 & 재Learning') },
    { id: "rules", label: "⚙ Active Rule", desc: t('auto.ijxqpv', 'Register된 Automaton Rule') },
    { id: "llm", label: "✨ LLM Create", desc: t('auto.jv65pq', '자연어 → Rule Auto Generate') },
];

export default function AIRuleEngine() {

  const t = useT();
    const [tab, setTab] = useState("discover");
    const { addActiveRule, rulesFired, activeRules } = useGlobalData();
    const { isDemo } = useAuth();
    const navigate = typeof window !== 'undefined' ? null : null; // navigate via window.location

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* [Demo/Paid 분리] Demo 유저 안내 Banner */}
            {isDemo && (
                <div style={{
                    padding: '12px 18px', borderRadius: 12,
                    background: 'linear-gradient(135deg,rgba(168,85,247,0.1),rgba(79,142,247,0.06))',
                    border: '1.5px solid rgba(168,85,247,0.3)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#c084fc' }}>{t('auto.uh9l9t', '🎭 체험 모드 — AI Rule Engine')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {t('auto.t9bvsc', 'Pattern 탐지 · 모델 현황 · Active Rule을 미리 볼 Count 있습니다.')}
                            <strong style={{ color: '#c084fc' }}> {t('auto.bru5lu', 'LLM Rule Create·Save은 Paid Subscription')}</strong>{t('auto.yz8tkj', '이 필요합니다.')}
                        </div>
                    </div>
                    <button onClick={() => window.location.href='/pricing'} style={{
                        padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff',
                        fontWeight: 700, fontSize: 12,
                    }}>{t('auto.q5h979', '💎 Pro 업그레이드')}</button>
                </div>
            )}

            {/* Hero */}
            <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.07),rgba(99,102,241,0.05))", borderColor: "rgba(168,85,247,0.18)" }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.28),rgba(79,142,247,0.18))" }}>🧠</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#6366f1,#4f8ef7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {t('auto.20i5ud', 'AI Learning형 Rule Engine')}
                        </div>
                        <div className="hero-desc">
                            {t('auto.9qbf9a', 'ML 이상탐지(Isolation Forest) · Pattern 클러스터링(DBSCAN) · LLM Rule Auto Generate(GPT-4o) — Data에서 Rule을 스스로 Learning하고 Recommendation합니다')}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {[
                        { label: t('auto.qqu6ll', '모델 정확도 91.4%'), color: "#22c55e" },
                        { label: t('auto.nzxsi9', '5개 Pattern 탐지 in progress'), color: "#eab308" },
                        { label: `${activeRules.length || 22}개 Rule Active`, color: "#4f8ef7" },
                        { label: t('auto.jar4nw', '₩28.7M 손실 방지'), color: "#a855f7" },
                        ...(isDemo ? [{ label: t('auto.tnn9sp', '🎭 체험 모드'), color: "#c084fc" }] : []),
                    ].map(({ label, color }) => (
                        <span key={label} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: color + "1a", color, border: `1px solid ${color}33` }}>{label}</span>
                    ))}
                </div>
            </div>

            {/* Tab 네비게이션 */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? "rgba(168,85,247,0.09)" : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? "#a855f7" : "transparent"}`, transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>
                                {t.label}{isDemo && t.id === 'llm' ? ' 🔒' : ''}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab 컨텐츠 */}
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "discover" && <PatternDiscoveryTab />}
                {tab === "model" && <ModelStatusTab />}
                {tab === "rules" && <ActiveRulesTab isDemo={isDemo} />}
                {tab === "llm" && (
                    isDemo ? (
                        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>LLM Rule Create — Paid Feature</div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.7 }}>
                                {t('auto.j1djm9', '자연어로 Automaton Rule을 Create하는 Feature입니다.')}<br />
                                <strong style={{ color: '#c084fc' }}>{t('auto.pnu4iz', 'Pro Subscription 또는 Free Coupon')}</strong>{t('auto.zuw0ai', '이 있어야 실제 Rule을 Create·Save할 Count 있습니다.')}
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => window.location.href='/pricing'} style={{
                                    padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', fontWeight: 800,
                                }}>{t('auto.mlgz20', '💎 Pro 멤버십 Start하기')}</button>
                                <button onClick={() => window.location.href='/my/coupon'} style={{
                                    padding: '12px 24px', borderRadius: 12, cursor: 'pointer',
                                    border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontWeight: 700,
                                }}>🎁 Free Coupon Register</button>
                            </div>
                        </div>
                    ) : <LLMRuleGenTab />
                )}
            </div>
        </div>
    );
}
