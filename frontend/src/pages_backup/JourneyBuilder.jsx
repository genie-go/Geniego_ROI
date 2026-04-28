import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate";
const AIImageGenerator = React.lazy(() => import("../components/AIImageGenerator.jsx"));
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import { useI18n } from "../i18n/index.js";
import { useSecurityGuard } from "../security/SecurityGuard.js";

/* ─── BroadcastChannel Cross-Tab Sync ─── */
const JB_SYNC_CH = 'geniego-journey-builder-sync';
let _jbChannel = null;
try { if (typeof BroadcastChannel !== 'undefined') _jbChannel = new BroadcastChannel(JB_SYNC_CH); } catch { /* ignore */ }
function broadcastJB(type, payload) {
    try {
        if (_jbChannel) _jbChannel.postMessage({ type, payload, ts: Date.now() });
        else { localStorage.setItem('__jb_sync__', JSON.stringify({ type, payload, ts: Date.now() })); localStorage.removeItem('__jb_sync__'); }
    } catch { /* ignore */ }
}

/* ─── Channel Fee Rates (enterprise) ─── */
const CHANNEL_FEES = {
    meta: { name: 'Meta Ads', feeRate: 0.05, icon: '📣' },
    google: { name: 'Google Ads', feeRate: 0.04, icon: '🔍' },
    tiktok: { name: 'TikTok', feeRate: 0.06, icon: '🎵' },
    kakao_moment: { name: 'Kakao', feeRate: 0.03, icon: '💬' },
    naver: { name: 'Naver', feeRate: 0.035, icon: '🟢' },
    line: { name: 'LINE', feeRate: 0.04, icon: '💚' },
    whatsapp: { name: 'WhatsApp', feeRate: 0.02, icon: '📲' },
    instagram: { name: 'Instagram', feeRate: 0.05, icon: '📸' },
    coupang: { name: 'Coupang', feeRate: 0.10, icon: '🛒' },
    shopify: { name: 'Shopify', feeRate: 0.029, icon: '🏪' },
};

/* ─── API Helper ─── */
function makeAPI(token) {
    return (path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json()).catch(() => ({}));
    };
}

/* ─── Theme Colors ─── */
const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    border: "var(--border)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
    orange: "#fb923c", line: "#06c755", whatsapp: "#25d366",
    instagram: "#e1306c", cyan: "#06b6d4",
};
const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };
const INPUT = { width: "100%", padding: "9px 13px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box", fontSize: 13 };
const BTN = (bg, color) => ({ padding: "7px 16px", borderRadius: 8, border: "none", background: bg, color, cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.15s" });

/* ─── Node Type Builder (i18n + Integration Hub aware) ─── */
function buildNodeTypes(t, connectedChannels) {
    const base = {
        trigger:   { label: t('journey.nodeTypes.trigger'),   color: "#10b981", bg: "#10b98120", icon: "🎯" },
        email:     { label: t('journey.nodeTypes.email'),     color: "#4f8ef7", bg: "#4f8ef720", icon: "✉️" },
        sms:       { label: t('journey.nodeTypes.sms'),       color: "#a78bfa", bg: "#a78bfa20", icon: "📱" },
        delay:     { label: t('journey.nodeTypes.delay'),     color: "#94a3b8", bg: "#94a3b820", icon: "⏱" },
        condition: { label: t('journey.nodeTypes.condition'), color: "#f59e0b", bg: "#f59e0b20", icon: "🔀" },
        ab_test:   { label: t('journey.nodeTypes.ab_test'),   color: "#8b5cf6", bg: "#8b5cf620", icon: "🧪" },
        tag:       { label: t('journey.nodeTypes.tag'),       color: "#06b6d4", bg: "#06b6d420", icon: "🏷" },
        webhook:   { label: t('journey.nodeTypes.webhook'),   color: "#fb923c", bg: "#fb923c20", icon: "🔗" },
        push:      { label: t('journey.nodeTypes.push'),      color: "#ef4444", bg: "#ef444420", icon: "🔔" },
        popup:     { label: t('journey.nodeTypes.popup'),     color: "#ec4899", bg: "#ec489920", icon: "🎯" },
        end:       { label: t('journey.nodeTypes.end'),       color: "#6b7280", bg: "#6b728020", icon: "🏁" },
    };
    /* Auto-add channel nodes based on Integration Hub connected channels */
    const channelNodes = {
        kakao:     { label: t('journey.nodeTypes.kakao'),     color: "#fbbf24", bg: "#fbbf2420", icon: "💬", requires: ["kakao_moment", "kakao_notification"] },
        line:      { label: t('journey.nodeTypes.line'),      color: "#06c755", bg: "#06c75520", icon: "💚", requires: ["line"] },
        whatsapp:  { label: t('journey.nodeTypes.whatsapp'),  color: "#25d366", bg: "#25d36620", icon: "📲", requires: ["whatsapp"] },
        instagram: { label: t('journey.nodeTypes.instagram'), color: "#e1306c", bg: "#e1306c20", icon: "📸", requires: ["instagram", "meta"] },
    };
    Object.entries(channelNodes).forEach(([key, node]) => {
        /* Always show channel nodes — grey out if not connected */
        base[key] = { ...node, connected: !node.requires || node.requires.some(r => connectedChannels.includes(r)) };
    });
    return base;
}

function buildTriggerTypes(t) {
    return [
        { value: "signup",          label: t('journey.triggerTypes.signup') },
        { value: "purchase",        label: t('journey.triggerTypes.purchase') },
        { value: "cart_abandoned",   label: t('journey.triggerTypes.cart_abandoned') },
        { value: "churned",         label: t('journey.triggerTypes.churned') },
        { value: "segment_entered", label: t('journey.triggerTypes.segment_entered') },
        { value: "birthday",        label: t('journey.triggerTypes.birthday') },
        { value: "manual",          label: t('journey.triggerTypes.manual') },
        { value: "event",           label: t('journey.triggerTypes.event') },
        { value: "webhook",         label: t('journey.triggerTypes.webhook_trigger') },
    ];
}

/* ─── Visual Journey Canvas ─── */
function JourneyCanvas({ nodes, edges, onSelectNode, selectedNodeId, nodeTypes }) {
    const CARD_W = 190, CARD_H = 64;
    return (
        <div style={{ position: "relative", minHeight: 640, background: "radial-gradient(circle at 50% 50%, rgba(79,142,247,0.03), #070f1a)", borderRadius: 12, overflow: "auto", padding: 20 }}>
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {edges.map((edge, i) => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    const x1 = (fromNode.x || 200) + CARD_W / 2;
                    const y1 = (fromNode.y || 0) + CARD_H;
                    const x2 = (toNode.x || 200) + CARD_W / 2;
                    const y2 = toNode.y || 0;
                    const midY = (y1 + y2) / 2;
                    return (
                        <g key={i}>
                            <path d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                                stroke={edge.label === "no" ? C.red : edge.label === "yes" ? C.green : C.accent}
                                strokeWidth={2} fill="none"
                                strokeDasharray={edge.label === "no" ? "4" : "none"} opacity={0.7} />
                            {edge.label && (
                                <text x={(x1 + x2) / 2} y={midY - 4} fill={edge.label === "yes" ? C.green : C.red} fontSize={10} textAnchor="middle" fontWeight="bold">
                                    {edge.label === "yes" ? "✓ YES" : "✗ NO"}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {nodes.map(node => {
                const type = nodeTypes[node.type] || nodeTypes.trigger;
                const isSelected = node.id === selectedNodeId;
                return (
                    <div key={node.id} onClick={() => onSelectNode(node)}
                        style={{
                            position: "absolute", left: node.x || 200, top: node.y || 0, width: CARD_W,
                            background: type.bg, border: `2px solid ${isSelected ? type.color : type.color + "60"}`,
                            borderRadius: 14, padding: "10px 14px", cursor: "pointer",
                            boxShadow: isSelected ? `0 0 20px ${type.color}50, 0 4px 20px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.3)",
                            transition: "all 0.2s", userSelect: "none", backdropFilter: "blur(6px)",
                        }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: type.color }}>{type.icon} {type.label}</div>
                        <div style={{ fontSize: 12, color: C.text, marginTop: 3, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</div>
                        {node.config?.subject && <div style={{ fontSize: 10, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.config.subject}</div>}
                
);
            })}
    </div>
─── */
function NodePanel({ node, onChange, onDelete, onTriggerAction, t, triggerTypes, nodeTypes, crmSegments }) {
    if (!node) return (
        <div style={{ textAlign: "center", color: C.muted, padding: 40, fontSize: 13 }}>
            {t('journey.clickToEdit')}
    </div>
);
    const type = nodeTypes[node.type] || {};
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 800, color: type.color, fontSize: 15 }}>{type.icon} {type.label}</div>
            <div>
                <label style={{ fontSize: 11, color: C.muted }}>{t('journey.nodeName')}</label>
                <input style={INPUT} value={node.label || ""} onChange={e => onChange({ ...node, label: e.target.value })} />
            {node.type === "trigger" && (
                <>
                    <div>
                        <label style={{ fontSize: 11, color: C.muted }}>{t('journey.triggerType')}</label>
                        <select style={{ ...INPUT }} value={node.config?.type || "manual"} onChange={e => onChange({ ...node, config: { ...node.config, type: e.target.value } })}>
                            {triggerTypes.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                        </select>
                    {node.config?.type === "segment_entered" && crmSegments.length > 0 && (
                        <div>
                            <label style={{ fontSize: 11, color: C.muted }}>{t('journey.selectSegment')}</label>
                            <select style={{ ...INPUT }} value={node.config?.segmentId || ""} onChange={e => onChange({ ...node, config: { ...node.config, segmentId: e.target.value } })}>
                                <option value="">-- {t('journey.selectSegment')} --</option>
                                {crmSegments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
                            </select>
                    )}
                </>
            )}
            {node.type === "email" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.emailSubject')}</label><input style={INPUT} value={node.config?.subject || ""} onChange={e => onChange({ ...node, config: { ...node.config, subject: e.target.value } })} placeholder={t('journey.emailSubjectPh')} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.emailFrom')}</label><input style={INPUT} value={node.config?.from_name || ""} onChange={e => onChange({ ...node, config: { ...node.config, from_name: e.target.value } })} placeholder={t('journey.emailSenderPh')} /></div>
                    <button onClick={() => onTriggerAction("email_send", { subject: node.config?.subject, count: 10 })}
                        style={BTN("#4f8ef720", C.accent)}>{t('journey.emailTestSend')}</button>
                </>
            )}
            {node.type === "kakao" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.kakaoTemplate')}</label><input style={INPUT} value={node.config?.template_code || ""} onChange={e => onChange({ ...node, config: { ...node.config, template_code: e.target.value } })} placeholder="TEMPLATE_001" /></div>
                    <div>
                        <label style={{ fontSize: 11, color: C.muted }}>{t('journey.kakaoMsgType')}</label>
                        <select style={{ ...INPUT }} value={node.config?.msg_type || "alimtalk"} onChange={e => onChange({ ...node, config: { ...node.config, msg_type: e.target.value } })}>
                            <option value="alimtalk">{t('journey.kakaoAlimtalk')}</option>
                            <option value="friendtalk">{t('journey.kakaoFriendtalk')}</option>
                        </select>
                    <button onClick={() => onTriggerAction("kakao_send", { template: node.config?.template_code, count: 5 })}
                        style={BTN("#fbbf2420", C.yellow)}>{t('journey.kakaoTest')}</button>
                </>
            )}
            {node.type === "line" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.lineTemplate')}</label><input style={INPUT} value={node.config?.template_code || ""} onChange={e => onChange({ ...node, config: { ...node.config, template_code: e.target.value } })} placeholder="ORDER_CONFIRM" /></div>
                    <div>
                        <label style={{ fontSize: 11, color: C.muted }}>{t('journey.lineMsgType')}</label>
                        <select style={{ ...INPUT }} value={node.config?.message_type || "text"} onChange={e => onChange({ ...node, config: { ...node.config, message_type: e.target.value } })}>
                            <option value="text">{t('journey.lineMsgText')}</option>
                            <option value="flex">{t('journey.lineMsgFlex')}</option>
                            <option value="template">{t('journey.lineMsgTemplate')}</option>
                        </select>
                    <button onClick={() => onTriggerAction("line_send", { template: node.config?.template_code, count: 8 })}
                        style={BTN("#06c75520", C.line)}>{t('journey.lineTestSend')}</button>
                </>
            )}
            {node.type === "whatsapp" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.waTemplate')}</label><input style={INPUT} value={node.config?.template_name || ""} onChange={e => onChange({ ...node, config: { ...node.config, template_name: e.target.value } })} placeholder="order_confirmation" /></div>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.waLang')}</label><input style={INPUT} value={node.config?.language_code || "en"} onChange={e => onChange({ ...node, config: { ...node.config, language_code: e.target.value } })} /></div>
                </>
            )}
            {node.type === "instagram" && (
                <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.igMessage')}</label><textarea style={{ ...INPUT, minHeight: 60 }} value={node.config?.message || ""} onChange={e => onChange({ ...node, config: { ...node.config, message: e.target.value } })} placeholder={t('journey.igMessagePh')} /></div>
            )}
            {node.type === "sms" && (
                <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.smsMessage')}</label><textarea style={{ ...INPUT, minHeight: 60 }} value={node.config?.message || ""} onChange={e => onChange({ ...node, config: { ...node.config, message: e.target.value } })} placeholder={t('journey.smsMessagePh')} /></div>
            )}
            {node.type === "webhook" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.webhookUrl')}</label><input style={INPUT} value={node.config?.url || ""} onChange={e => onChange({ ...node, config: { ...node.config, url: e.target.value } })} placeholder="https://api.example.com/webhook" /></div>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.webhookMethod')}</label>
                        <select style={INPUT} value={node.config?.method || "POST"} onChange={e => onChange({ ...node, config: { ...node.config, method: e.target.value } })}>
                            <option value="POST">POST</option><option value="GET">GET</option><option value="PUT">PUT</option>
                        </select>
                </>
            )}
            {node.type === "push" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.pushTitle')}</label><input style={INPUT} value={node.config?.title || ""} onChange={e => onChange({ ...node, config: { ...node.config, title: e.target.value } })} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.pushBody')}</label><textarea style={{ ...INPUT, minHeight: 50 }} value={node.config?.body || ""} onChange={e => onChange({ ...node, config: { ...node.config, body: e.target.value } })} /></div>
                </>
            )}
            {node.type === "popup" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.popupTemplate')}</label><input style={INPUT} value={node.config?.template || ""} onChange={e => onChange({ ...node, config: { ...node.config, template: e.target.value } })} placeholder={t('journey.popupTemplatePh')} /></div>
                    <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                        <React.Suspense fallback={<div style={{ color: C.muted, fontSize: 11, padding: 8 }}>Loading AI...</div>}>
                            <AIImageGenerator
                                compact={true}
                                defaultPlatform="popup"
                                onGenerate={(res) => onChange({ ...node, config: { ...node.config, aiImage: res.dataUrl, aiPrompt: res.imagePrompt, aiTheme: res.theme } })}
                                onUpload={(res) => onChange({ ...node, config: { ...node.config, customImage: res.dataUrl, customFileName: res.fileName } })}
                            />
                        </React.Suspense>
                </>
            )}
            {node.type === "delay" && (
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.muted }}>{t('journey.delayTime')}</label><input style={INPUT} type="number" value={node.config?.value || 1} onChange={e => onChange({ ...node, config: { ...node.config, value: parseInt(e.target.value) } })} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.muted }}>{t('journey.delayUnit')}</label>
                        <select style={{ ...INPUT }} value={node.config?.unit || "days"} onChange={e => onChange({ ...node, config: { ...node.config, unit: e.target.value } })}>
                            <option value="minutes">{t('journey.minutes')}</option><option value="hours">{t('journey.hours')}</option><option value="days">{t('journey.days')}</option>
                        </select>)}
            {node.type === "condition" && (
                <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.conditionField')}</label>
                    <select style={{ ...INPUT }} value={node.config?.field || "email_clicked"} onChange={e => onChange({ ...node, config: { ...node.config, field: e.target.value } })}>
                        <option value="email_clicked">{t('journey.conditionEmailClicked')}</option>
                        <option value="email_opened">{t('journey.conditionEmailOpened')}</option>
                        <option value="purchased">{t('journey.conditionPurchased')}</option>
                        <option value="ltv_gt">{t('journey.conditionLtvGt')}</option>
                        <option value="kakao_clicked">{t('journey.conditionKakaoClicked')}</option>
                        <option value="line_clicked">{t('journey.conditionLineClicked')}</option>
                        <option value="page_visited">{t('journey.conditionPageVisited')}</option>
                        <option value="cart_value_gt">{t('journey.conditionCartValueGt')}</option>
                    </select>
            )}
            {node.type === "ab_test" && (
                <div>
                    <label style={{ fontSize: 11, color: C.muted }}>{t('journey.abGroupA')}</label>
                    <input style={INPUT} type="number" min={10} max={90} value={node.config?.split_a || 50} onChange={e => onChange({ ...node, config: { ...node.config, split_a: parseInt(e.target.value) } })} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t('journey.abGroupB')}: {100 - (node.config?.split_a || 50)}%)}
            <button onClick={onDelete} style={{ ...BTN(C.red + "20", C.red), marginTop: 8 }}>{t('journey.deleteNode')}</button>
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

/* ─── Journey Guide Tab (Onboarding) ─── */
function JourneyGuideTab({ t, onStartNew }) {
    const steps = [
        { icon: "1️⃣", title: t('journey.guideStep1Title'), desc: t('journey.guideStep1Desc'), color: C.accent },
        { icon: "2️⃣", title: t('journey.guideStep2Title'), desc: t('journey.guideStep2Desc'), color: C.green },
        { icon: "3️⃣", title: t('journey.guideStep3Title'), desc: t('journey.guideStep3Desc'), color: C.yellow },
        { icon: "4️⃣", title: t('journey.guideStep4Title'), desc: t('journey.guideStep4Desc'), color: C.purple },
        { icon: "5️⃣", title: t('journey.guideStep5Title'), desc: t('journey.guideStep5Desc'), color: C.orange },
        { icon: "6️⃣", title: t('journey.guideStep6Title'), desc: t('journey.guideStep6Desc'), color: C.cyan },
    ];
    const nodeExamples = [
        { icon: "🎯", name: t('journey.nodeTypes.trigger'), desc: t('journey.guideNodeTrigger') },
        { icon: "✉️", name: t('journey.nodeTypes.email'), desc: t('journey.guideNodeEmail') },
        { icon: "💬", name: t('journey.nodeTypes.kakao'), desc: t('journey.guideNodeKakao') },
        { icon: "💚", name: t('journey.nodeTypes.line'), desc: t('journey.guideNodeLine') },
        { icon: "📱", name: t('journey.nodeTypes.sms'), desc: t('journey.guideNodeSms') },
        { icon: "📲", name: t('journey.nodeTypes.whatsapp'), desc: t('journey.guideNodeWhatsapp') },
        { icon: "⏱", name: t('journey.nodeTypes.delay'), desc: t('journey.guideNodeDelay') },
        { icon: "🔀", name: t('journey.nodeTypes.condition'), desc: t('journey.guideNodeCondition') },
        { icon: "🧪", name: t('journey.nodeTypes.ab_test'), desc: t('journey.guideNodeAbTest') },
        { icon: "🔗", name: t('journey.nodeTypes.webhook'), desc: t('journey.guideNodeWebhook') },
        { icon: "🔔", name: t('journey.nodeTypes.push'), desc: t('journey.guideNodePush') },
        { icon: "🏁", name: t('journey.nodeTypes.end'), desc: t('journey.guideNodeEnd') },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Hero */}
            <div style={{ ...CARD, background: "linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.08))", borderColor: C.accent + "40", textAlign: "center", padding: 32 }}>
                <div style={{ fontSize: 40 }}>🗺️</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('journey.guideTitle')}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 500, margin: "6px auto 0" }}>{t('journey.guideSubtitle')}</div>
                <button onClick={onStartNew} style={{ marginTop: 16, padding: "10px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.accent},#6366f1)`, color: 'var(--text-1)', fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                    {t('journey.guideStartBtn')}
                </button>
            {/* Steps */}
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('journey.guideStepsTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + "08", border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
                    ))}
            </div>
            {/* Node Types Reference */}
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('journey.guideNodesTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {nodeExamples.map((n, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", background: 'var(--surface)', borderRadius: 8, border: `1px solid ${C.border}` }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{n.name}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{n.desc}</div>
                        </div>
                    ))}
            </div>
            {/* Tips */}
            <div style={{ ...CARD, background: "rgba(34,197,94,0.05)", borderColor: C.green + "30" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('journey.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: C.muted, lineHeight: 2 }}>
                    <li>{t('journey.guideTip1')}</li>
                    <li>{t('journey.guideTip2')}</li>
                    <li>{t('journey.guideTip3')}</li>
                    <li>{t('journey.guideTip4')}</li>
                    <li>{t('journey.guideTip5')}</li>
                </ul>
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

/* ─── Journey Analytics Tab ─── */
function JourneyAnalyticsTab({ journeys, t }) {
    const totalEntered = journeys.reduce((s, j) => s + (j.stats_entered || 0), 0);
    const totalCompleted = journeys.reduce((s, j) => s + (j.stats_completed || 0), 0);
    const totalActive = journeys.reduce((s, j) => s + (j.active_count || 0), 0);
    const convRate = totalEntered > 0 ? ((totalCompleted / totalEntered) * 100).toFixed(1) : "0.0";
    const kpis = [
        { label: t('journey.analyticsEntered'), value: totalEntered, color: C.accent, icon: "👥" },
        { label: t('journey.analyticsCompleted'), value: totalCompleted, color: C.green, icon: "✅" },
        { label: t('journey.analyticsActive'), value: totalActive, color: C.yellow, icon: "⚡" },
        { label: t('journey.analyticsConvRate'), value: convRate + "%", color: C.purple, icon: "📊" },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
                {kpis.map((kpi, i) => (
                    <div key={i} style={{ ...CARD, textAlign: "center" }}>
                        <div style={{ fontSize: 24 }}>{kpi.icon}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: kpi.color, marginTop: 6 }}>{kpi.value}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{kpi.label}</div>
                ))}
            {journeys.length === 0 ? (
                <div style={{ ...CARD, textAlign: "center", color: C.muted }}>{t('journey.noAnalyticsData')}</div>
            ) : (
                <div style={CARD}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('journey.journeyPerformance')}</div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                    {[t('journey.colName'), t('journey.colStatus'), t('journey.colEntered'), t('journey.colCompleted'), t('journey.colActive'), t('journey.colConvRate'), t('journey.colTrigger')].map((h, i) => (
                                        <th key={i} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {journeys.map(j => (
                                    <tr key={j.id} style={{ borderBottom: `1px solid ${C.border}08` }}>
                                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{j.name}</td>
                                        <td style={{ padding: "8px 12px" }}>
                                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: j.status === "active" ? C.green + "20" : C.surface, color: j.status === "active" ? C.green : C.muted, fontWeight: 700 }}>
                                                {j.status === "active" ? t('journey.statusActive') : t('journey.statusDraft')}
                                            </span>
                                        </td>
                                        <td style={{ padding: "8px 12px", color: C.accent }}>{j.stats_entered || 0}</td>
                                        <td style={{ padding: "8px 12px", color: C.green }}>{j.stats_completed || 0}</td>
                                        <td style={{ padding: "8px 12px", color: C.yellow }}>{j.active_count || 0}</td>
                                        <td style={{ padding: "8px 12px", color: C.purple }}>{j.stats_entered > 0 ? ((j.stats_completed / j.stats_entered) * 100).toFixed(1) : 0}%</td>
                                        <td style={{ padding: "8px 12px", color: C.muted }}>{j.trigger_type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>)}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Journey List Tab ─── */
function JourneyListTab({ journeys, onEdit, onLaunch, onPause, onClone, onDelete, onNew, t, triggerTypes }) {
    const [showNew, setShowNew] = useState(false);
    const [newForm, setNewForm] = useState({ name: "", trigger_type: "purchase" });
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t('journey.myJourneys')}</div>
                <button onClick={() => setShowNew(!showNew)} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.accent},#6366f1)`, color: 'var(--text-1)', fontWeight: 700, cursor: "pointer" }}>
                    {showNew ? t('journey.cancel') : t('journey.newJourney')}
                </button>
            {showNew && (
                <div style={{ ...CARD, borderColor: C.accent + "40" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={{ fontSize: 12, color: C.muted }}>{t('journey.journeyName')}</label><input style={INPUT} value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder={t('journey.journeyNamePh')} /></div>
                        <div><label style={{ fontSize: 12, color: C.muted }}>{t('journey.triggerEvent')}</label>
                            <select style={{ ...INPUT }} value={newForm.trigger_type} onChange={e => setNewForm({ ...newForm, trigger_type: e.target.value })}>
                                {triggerTypes.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                            </select>
                    </div>
                    <button onClick={() => { onNew(newForm); setShowNew(false); setNewForm({ name: "", trigger_type: "purchase" }); }}
                        disabled={!newForm.name}
                        style={{ marginTop: 12, ...BTN(C.green, "#fff") }}>{t('journey.create')}</button>
            )}
            {journeys.length === 0 ? (
                <div style={{ ...CARD, textAlign: "center", color: C.muted, padding: 40 }}>{t('journey.noJourneys')}</div>
            ) : (
                journeys.map(j => (
                    <div key={j.id} style={{ ...CARD, cursor: "pointer" }} onClick={() => onEdit(j)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontWeight: 800, fontSize: 15 }}>{j.name}</span>
                                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 999, fontWeight: 700, background: j.status === "active" ? C.green + "20" : j.status === "paused" ? C.yellow + "20" : C.surface, color: j.status === "active" ? C.green : j.status === "paused" ? C.yellow : C.muted }}>
                                        {j.status === "active" ? t('journey.statusActive') : j.status === "paused" ? t('journey.statusPaused') : t('journey.statusDraft')}
                                    </span>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                                    {t('journey.trigger')}: {triggerTypes.find(tt => tt.value === j.trigger_type)?.label || j.trigger_type} &nbsp;|&nbsp;
                                    {t('journey.entered')}: <span style={{ color: C.accent }}>{j.stats_entered}</span> &nbsp;|&nbsp;
                                    {t('journey.completed')}: <span style={{ color: C.green }}>{j.stats_completed}</span> &nbsp;|&nbsp;
                                    {t('journey.active')}: <span style={{ color: C.yellow }}>{j.active_count}</span>
                                {j.schedule && <div style={{ fontSize: 11, color: C.orange, marginTop: 4 }}>📅 {t('journey.scheduled')}: {j.schedule}</div>}
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t('journey.lastUpdated')}: {j.updated_at?.slice(0, 16)} {j.version > 1 && `· v${j.version}`}</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => onEdit(j)} style={BTN(C.surface, C.accent)}>{t('journey.edit')}</button>
                                <button onClick={() => onClone(j)} style={BTN(C.purple + "20", C.purple)} title={t('journey.clone')}>📋</button>
                                {j.status === "active" ? (
                                    <button onClick={() => onPause(j.id)} style={BTN(C.yellow + "20", C.yellow)}>⏸</button>
                                ) : (
                                    <button onClick={() => onLaunch(j.id)} style={BTN(C.green + "20", C.green)}>▶</button>
                                )}
                                <button onClick={() => { if (window.confirm(t('journey.confirmDelete'))) onDelete(j.id); }} style={BTN(C.red + "15", C.red)} title={t('journey.delete')}>🗑</button>
                        </div>
                        {j.nodes && j.nodes.length > 0 && (
                            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                                {j.nodes.slice(0, 8).map(n => {
                                    const icons = { trigger: "🎯", email: "✉️", kakao: "💬", line: "💚", sms: "📱", delay: "⏱", condition: "🔀", ab_test: "🧪", tag: "🏷", end: "🏁", webhook: "🔗", push: "🔔", whatsapp: "📲", instagram: "📸", popup: "🎯" };
                                    return <span key={n.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: 'var(--surface)', color: C.muted, fontWeight: 700 }}>{icons[n.type] || "⚙"} {n.label}</span>;
                                })}
                                {j.nodes.length > 8 && <span style={{ fontSize: 10, color: C.muted }}>+{j.nodes.length - 8}</span>}
                        )}
                ))
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
);
}

/* ─── Journey Editor Tab ─── */
function JourneyEditorTab({ journey, onSave, onBack, triggerJourneyAction, t, triggerTypes, nodeTypes, crmSegments }) {
    const [nodes, setNodes] = useState(journey.nodes || []);
    const [edges, setEdges] = useState(journey.edges || []);
    const [selectedNode, setSelectedNode] = useState(null);
    const [saving, setSaving] = useState(false);
    const [triggerLog, setTriggerLog] = useState([]);
    const [schedule, setSchedule] = useState(journey.schedule || "");

    const addNode = (type) => {
        const newNode = {
            id: `${type}_${Date.now()}`,
            type, label: nodeTypes[type]?.label.replace(/^.+ /, "") || type,
            config: {}, x: 200 + Math.random() * 80, y: nodes.length * 160 + 50,
        };
        if (nodes.length > 0) {
            setEdges(prev => [...prev, { from: nodes[nodes.length - 1].id, to: newNode.id }]);
        }
        setNodes(prev => [...prev, newNode]);
        setSelectedNode(newNode);
    };

    const updateNode = (updated) => {
        setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
        setSelectedNode(updated);
    };

    const deleteNode = () => {
        if (!selectedNode) return;
        setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
        setEdges(prev => prev.filter(e => e.from !== selectedNode.id && e.to !== selectedNode.id));
        setSelectedNode(null);
    };

    const handleTriggerAction = (type, payload) => {
        triggerJourneyAction(type, payload);
        const label = type === "email_send"
            ? t('journey.emailSendSim').replace('{{count}}', payload.count)
            : type === "kakao_send"
            ? t('journey.kakaoSendSim').replace('{{count}}', payload.count)
            : t('journey.lineSendSim').replace('{{count}}', payload.count);
        setTriggerLog(prev => [{ id: Date.now(), label, at: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
    };

    const save = () => {
        setSaving(true);
        onSave({ ...journey, nodes, edges, schedule, version: (journey.version || 1) + 1 });
        setTimeout(() => setSaving(false), 500);
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onBack} style={BTN(C.surface, C.accent)}>{t('journey.backToList')}</button>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{journey.name}</span>
                    {journey.version > 1 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: C.purple + "20", color: C.purple }}>v{journey.version}</span>}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>📅</span>
                        <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} style={{ ...INPUT, width: 180, fontSize: 11 }} />
                    <button onClick={save} disabled={saving} style={{ padding: "8px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.accent},#6366f1)`, color: 'var(--text-1)', fontWeight: 700, cursor: "pointer" }}>
                        {saving ? t('journey.saving') : t('journey.save')}
                    </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
                <div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                        {Object.entries(nodeTypes).filter(([k]) => k !== "trigger" || nodes.length === 0).map(([type, meta]) => (
                            <button key={type} onClick={() => addNode(type)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${meta.color}40`, background: meta.bg, color: meta.color, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s", opacity: meta.connected === false ? 0.4 : 1 }}
                                title={meta.connected === false ? t('journey.channelNotConnected') : ""}>
                                + {meta.icon} {meta.label}
                            </button>
                        ))}
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, minHeight: 500 }}>
                        <JourneyCanvas nodes={nodes} edges={edges} onSelectNode={setSelectedNode} selectedNodeId={selectedNode?.id} nodeTypes={nodeTypes} />
                    {triggerLog.length > 0 && (
                        <div style={{ marginTop: 12, background: "rgba(79,142,247,0.06)", border: `1px solid ${C.accent}30`, borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 6 }}>{t('journey.execLog')}</div>
                            {triggerLog.map(log => (
                                <div key={log.id} style={{ fontSize: 11, color: C.text, padding: "3px 0", borderBottom: `1px solid rgba(255,255,255,0.05)`, display: "flex", justifyContent: "space-between" }}>
                                    <span>{log.label}</span><span style={{ color: C.muted }}>{log.at}</span>
                            ))}
                    )}
                <div style={{ ...CARD, alignSelf: "start" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: C.muted }}>{t('journey.nodeSettings')}</div>
                    <NodePanel node={selectedNode} onChange={updateNode} onDelete={deleteNode} onTriggerAction={handleTriggerAction} t={t} triggerTypes={triggerTypes} nodeTypes={nodeTypes} crmSegments={crmSegments} />
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

/* ─── Main Page Content ─── */
function JourneyBuilderContent() {
    const { token } = useAuth();
    const { triggerJourneyAction, journeyTriggers, addAlert, crmSegments, channelBudgets } = useGlobalData();
    const { connectedChannels: connectorChannels, connectedCount } = useConnectorSync();
    useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });
    const { t } = useI18n();
    const API = makeAPI(token);

    const [journeys, setJourneys] = useState([]);
    const [editingJourney, setEditingJourney] = useState(null);
    const [activeTab, setActiveTab] = useState("list");

    /* ── Real-time connected channels from ConnectorSyncContext ── */
    const connectedChannels = useMemo(() => {
        const channels = [];
        if (connectorChannels && typeof connectorChannels === 'object') {
            Object.entries(connectorChannels).forEach(([key, info]) => {
                if (info?.connected) channels.push(key);
            });
        }
        /* Fallback: also check localStorage for additional channels */
        try {
            const keys = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]');
            if (Array.isArray(keys)) keys.forEach(k => { if (k.service) channels.push(k.service.toLowerCase()); });
        } catch { /* ignore */ }
        ['meta', 'google', 'tiktok', 'kakao_moment', 'kakao_notification', 'naver', 'line', 'whatsapp', 'instagram', 'coupang'].forEach(ch => {
            try { if (localStorage.getItem(`geniego_channel_${ch}`)) channels.push(ch); } catch { /* ignore */ }
        });
        return [...new Set(channels)];
    }, [connectorChannels]);

    const nodeTypes = useMemo(() => buildNodeTypes(t, connectedChannels), [t, connectedChannels]);
    const triggerTypes = useMemo(() => buildTriggerTypes(t), [t]);

    /* ── Channel fee info for connected channels ── */
    const channelFeeInfo = useMemo(() => {
        return connectedChannels.map(ch => ({
            key: ch,
            ...(CHANNEL_FEES[ch] || { name: ch, feeRate: 0, icon: '📡' }),
            connected: true,
        }));
    }, [connectedChannels]);

    useEffect(() => {
        API("/journey/journeys").then(r => {
            if (r.journeys?.length) { setJourneys(r.journeys); return; }
            // Demo fallback: populate with realistic journey data
            setJourneys([
                { id: 'j-demo-1', name: '신규 가입 웰컴 시리즈', trigger_type: 'signup', status: 'active', stats_entered: 4250, stats_completed: 2890, active_count: 342, updated_at: new Date(Date.now()-2*864e5).toISOString(), version: 3,
                  nodes: [{ id:'t1', type:'trigger', label:'회원가입', x:200, y:30, config:{type:'signup'} }, { id:'e1', type:'email', label:'웰컴 이메일', x:200, y:150, config:{subject:'GenieGo에 오신 것을 환영합니다!'} }, { id:'d1', type:'delay', label:'3일 대기', x:200, y:270, config:{value:3,unit:'days'} }, { id:'c1', type:'condition', label:'이메일 오픈?', x:200, y:390, config:{field:'email_opened'} }, { id:'e2', type:'email', label:'혜택 안내', x:120, y:510, config:{subject:'첫 구매 10% 할인'} }, { id:'k1', type:'kakao', label:'카카오 알림톡', x:320, y:510, config:{template_code:'WELCOME_01',msg_type:'alimtalk'} }, { id:'end1', type:'end', label:'종료', x:200, y:640 }],
                  edges: [{from:'t1',to:'e1'},{from:'e1',to:'d1'},{from:'d1',to:'c1'},{from:'c1',to:'e2',label:'yes'},{from:'c1',to:'k1',label:'no'},{from:'e2',to:'end1'},{from:'k1',to:'end1'}]
                },
                { id: 'j-demo-2', name: '장바구니 이탈 복구', trigger_type: 'cart_abandoned', status: 'active', stats_entered: 8920, stats_completed: 3145, active_count: 1280, updated_at: new Date(Date.now()-864e5).toISOString(), version: 5,
                  nodes: [{ id:'t2', type:'trigger', label:'장바구니 이탈', x:200, y:30, config:{type:'cart_abandoned'} }, { id:'d2', type:'delay', label:'1시간 대기', x:200, y:150, config:{value:1,unit:'hours'} }, { id:'e3', type:'email', label:'잊으신 건 아니죠?', x:200, y:270, config:{subject:'장바구니에 담긴 상품이 있어요!'} }, { id:'d3', type:'delay', label:'24시간', x:200, y:390, config:{value:24,unit:'hours'} }, { id:'c2', type:'condition', label:'구매 완료?', x:200, y:510, config:{field:'purchased'} }, { id:'k2', type:'kakao', label:'10% 쿠폰 발송', x:120, y:630, config:{template_code:'CART_COUPON',msg_type:'friendtalk'} }, { id:'end2', type:'end', label:'완료', x:300, y:630 }],
                  edges: [{from:'t2',to:'d2'},{from:'d2',to:'e3'},{from:'e3',to:'d3'},{from:'d3',to:'c2'},{from:'c2',to:'k2',label:'no'},{from:'c2',to:'end2',label:'yes'},{from:'k2',to:'end2'}]
                },
                { id: 'j-demo-3', name: 'VIP 고객 리워드', trigger_type: 'segment_entered', status: 'active', stats_entered: 1247, stats_completed: 890, active_count: 156, updated_at: new Date(Date.now()-3*864e5).toISOString(), version: 2,
                  nodes: [{ id:'t3', type:'trigger', label:'VIP 세그먼트 진입', x:200, y:30, config:{type:'segment_entered',segmentId:'seg-vip'} }, { id:'e4', type:'email', label:'VIP 전용 혜택', x:200, y:150, config:{subject:'VIP 고객님 특별 혜택'} }, { id:'d4', type:'delay', label:'7일', x:200, y:270, config:{value:7,unit:'days'} }, { id:'push1', type:'push', label:'앱 푸시 알림', x:200, y:390, config:{title:'VIP 전용 시크릿 세일!'} }, { id:'end3', type:'end', label:'종료', x:200, y:510 }],
                  edges: [{from:'t3',to:'e4'},{from:'e4',to:'d4'},{from:'d4',to:'push1'},{from:'push1',to:'end3'}]
                },
                { id: 'j-demo-4', name: '이탈 위험 고객 재활성화', trigger_type: 'churned', status: 'active', stats_entered: 3820, stats_completed: 1240, active_count: 890, updated_at: new Date(Date.now()-5*864e5).toISOString(), version: 4,
                  nodes: [{ id:'t4', type:'trigger', label:'이탈 위험 감지', x:200, y:30, config:{type:'churned'} }, { id:'e5', type:'email', label:'보고 싶어요', x:200, y:150, config:{subject:'오랜만이에요! 특별 혜택을 준비했어요'} }, { id:'d5', type:'delay', label:'5일', x:200, y:270, config:{value:5,unit:'days'} }, { id:'ab1', type:'ab_test', label:'A/B 테스트', x:200, y:390, config:{split_a:60} }, { id:'k3', type:'kakao', label:'쿠폰 카카오톡', x:120, y:510, config:{template_code:'REACTIVATE_COUPON',msg_type:'friendtalk'} }, { id:'sms1', type:'sms', label:'SMS 할인코드', x:320, y:510, config:{message:'COMEBACK20 코드로 20% 할인!'} }, { id:'end4', type:'end', label:'종료', x:200, y:640 }],
                  edges: [{from:'t4',to:'e5'},{from:'e5',to:'d5'},{from:'d5',to:'ab1'},{from:'ab1',to:'k3',label:'yes'},{from:'ab1',to:'sms1',label:'no'},{from:'k3',to:'end4'},{from:'sms1',to:'end4'}]
                },
                { id: 'j-demo-5', name: '구매 후 리뷰 요청', trigger_type: 'purchase', status: 'draft', stats_entered: 0, stats_completed: 0, active_count: 0, updated_at: new Date(Date.now()-864e5).toISOString(), version: 1,
                  nodes: [{ id:'t5', type:'trigger', label:'구매 완료', x:200, y:30, config:{type:'purchase'} }, { id:'d6', type:'delay', label:'14일', x:200, y:150, config:{value:14,unit:'days'} }, { id:'e6', type:'email', label:'리뷰 요청', x:200, y:270, config:{subject:'구매하신 상품은 어떠셨나요?'} }, { id:'end5', type:'end', label:'종료', x:200, y:390 }],
                  edges: [{from:'t5',to:'d6'},{from:'d6',to:'e6'},{from:'e6',to:'end5'}]
                },
            ]);
        });
    }, []);

    /* ── BroadcastChannel Cross-Tab Sync ── */
    useEffect(() => {
        const handler = (msg) => {
            const { type, payload } = msg?.data || msg;
            if (type === 'JOURNEY_UPDATE' && Array.isArray(payload)) setJourneys(payload);
        };
        if (_jbChannel) _jbChannel.onmessage = handler;
        const storageHandler = (e) => {
            if (e.key === '__jb_sync__' && e.newValue) {
                try { handler(JSON.parse(e.newValue)); } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', storageHandler);
        return () => { if (_jbChannel) _jbChannel.onmessage = null; window.removeEventListener('storage', storageHandler); };
    }, []);

    const syncJourneys = useCallback((updated) => {
        setJourneys(updated);
        broadcastJB('JOURNEY_UPDATE', updated);
    }, []);

    const handleLaunch = async (id) => {
        const updated = journeys.map(j => j.id === id ? { ...j, status: "active" } : j);
        syncJourneys(updated);
        await API(`/journey/journeys/${id}/launch`, { method: "POST" });
        if (addAlert) addAlert({ type: 'success', msg: `▶ ${t('journey.statusActive')}: ${journeys.find(j => j.id === id)?.name}` });
    };

    const handlePause = (id) => {
        syncJourneys(journeys.map(j => j.id === id ? { ...j, status: "paused" } : j));
    };

    const handleNew = (form) => {
        const newJ = { id: `j_${Date.now()}`, ...form, status: "draft", stats_entered: 0, stats_completed: 0, active_count: 0, updated_at: new Date().toISOString(), nodes: [], edges: [], version: 1 };
        syncJourneys([newJ, ...journeys]);
        setEditingJourney(newJ);
    };

    const handleClone = (journey) => {
        const cloned = { ...journey, id: `j_${Date.now()}`, name: `${journey.name} (${t('journey.copy')})`, status: "draft", stats_entered: 0, stats_completed: 0, active_count: 0, updated_at: new Date().toISOString(), version: 1 };
        syncJourneys([cloned, ...journeys]);
    };


    const handleDelete = (id) => {
        const updated = journeys.filter(j => j.id !== id);
        syncJourneys(updated);
        API(`/journey/journeys/${id}`, { method: "DELETE" });
    };

    const handleSave = (updated) => {
        const newList = journeys.map(j => j.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : j);
        syncJourneys(newList);
        API(`/journey/journeys/${updated.id}`, { method: "PUT", body: JSON.stringify({ nodes: updated.nodes, edges: updated.edges, schedule: updated.schedule }) });
        if (addAlert) addAlert({ type: 'success', msg: `💾 ${t('journey.save')}: ${updated.name}` });
    };

    /* ── Journey Templates (enterprise) ── */
    const handleUseTemplate = (tpl) => {
        const newJ = {
            id: `j_${Date.now()}`, name: tpl.name, trigger_type: tpl.trigger,
            status: "draft", stats_entered: 0, stats_completed: 0, active_count: 0,
            updated_at: new Date().toISOString(), nodes: tpl.nodes.map((n, i) => ({ ...n, id: `${n.type}_${Date.now()}_${i}`, x: 200, y: i * 120 + 30 })),
            edges: tpl.nodes.length > 1 ? tpl.nodes.slice(0, -1).map((_, i) => ({ from: `${tpl.nodes[i].type}_${Date.now()}_${i}`, to: `${tpl.nodes[i + 1].type}_${Date.now()}_${i + 1}` })) : [],
            version: 1,
        };
        syncJourneys([newJ, ...journeys]);
        setEditingJourney(newJ);
    };

    const TEMPLATES = [
        { key: "welcome", icon: "👋", name: t('journey.tplWelcome') || "Welcome Series", trigger: "signup",
          nodes: [{ type: "trigger", label: "Signup" }, { type: "email", label: "Welcome", config: { subject: "Welcome!" } }, { type: "delay", label: "3 Days", config: { value: 3, unit: "days" } }, { type: "email", label: "Tips", config: { subject: "Getting Started" } }, { type: "end", label: "End" }] },
        { key: "cart", icon: "🛒", name: t('journey.tplCart') || "Cart Recovery", trigger: "cart_abandoned",
          nodes: [{ type: "trigger", label: "Cart Left" }, { type: "delay", label: "1 Hour", config: { value: 1, unit: "hours" } }, { type: "email", label: "Reminder", config: { subject: "Forgot something?" } }, { type: "condition", label: "Purchased?", config: { field: "purchased" } }, { type: "end", label: "End" }] },
        { key: "churn", icon: "🔄", name: t('journey.tplChurn') || "Win-back", trigger: "churned",
          nodes: [{ type: "trigger", label: "Churn Risk" }, { type: "email", label: "We Miss You" }, { type: "delay", label: "5 Days", config: { value: 5, unit: "days" } }, { type: "kakao", label: "Coupon" }, { type: "end", label: "End" }] },
        { key: "birthday", icon: "🎂", name: t('journey.tplBirthday') || "Birthday", trigger: "birthday",
          nodes: [{ type: "trigger", label: "Birthday" }, { type: "email", label: "Happy Birthday!" }, { type: "popup", label: "Birthday Popup" }, { type: "end", label: "End" }] },
        { key: "vip", icon: "👑", name: t('journey.tplVIP') || "VIP Nurture", trigger: "segment_entered",
          nodes: [{ type: "trigger", label: "VIP Segment" }, { type: "email", label: "VIP Welcome" }, { type: "delay", label: "7 Days", config: { value: 7, unit: "days" } }, { type: "webhook", label: "CRM Update" }, { type: "end", label: "End" }] },
        { key: "post_purchase", icon: "📦", name: t('journey.tplPostPurchase') || "Post-Purchase", trigger: "purchase",
          nodes: [{ type: "trigger", label: "Purchase" }, { type: "delay", label: "2 Days", config: { value: 2, unit: "days" } }, { type: "email", label: "Thank You" }, { type: "delay", label: "14 Days", config: { value: 14, unit: "days" } }, { type: "email", label: "Review Request" }, { type: "end", label: "End" }] },
    ];

    const TABS = [
        { key: "list", label: t('journey.tabList'), icon: "📁" },
        { key: "templates", label: t('journey.tabTemplates') || "Templates", icon: "📋" },
        { key: "analytics", label: t('journey.tabAnalytics'), icon: "📊" },
        { key: "guide", label: t('journey.tabGuide'), icon: "📖" },
    ];

    return (
        <div style={{ padding: "0 0 40px 0", background: C.bg, minHeight: "100%", color: C.text }}>
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>🗺️</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 22 }}>{t('journey.pageTitle')}</div>
                        <div style={{ fontSize: 13, color: C.muted }}>{t('journey.pageSub')}</div>
                </div>
                {/* Connected Channels with Fee Rates */}
                {channelFeeInfo.length > 0 && !editingJourney && (
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>🔗 {t('journey.connectedChannels')} ({connectedChannels.length}):</span>
                        {channelFeeInfo.slice(0, 10).map(ch => (
                            <span key={ch.key} title={`${t('journey.channelFee') || 'Fee'}: ${(ch.feeRate * 100).toFixed(1)}%`}
                                style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: C.green + "15", color: C.green, fontWeight: 600, cursor: "help" }}>
                                {ch.icon} {ch.name} <span style={{ opacity: 0.6 }}>({(ch.feeRate * 100).toFixed(1)}%)</span>
                            </span>
                        ))}
                )}
                {/* Recent Triggers */}
                {journeyTriggers.length > 0 && !editingJourney && (
                    <div style={{ marginTop: 12, background: "rgba(6,199,85,0.05)", border: "1px solid rgba(6,199,85,0.2)", borderRadius: 10, padding: "10px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.line, marginBottom: 6 }}>{t('journey.recentTriggers')}</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {journeyTriggers.slice(0, 5).map(tr => (
                                <span key={tr.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: 'var(--surface)', color: C.muted }}>
                                    {tr.type === "email_send" ? "✉️" : tr.type === "kakao_send" ? "💬" : tr.type === "line_send" ? "💚" : "⚡"} {tr.type} · {tr.at?.slice(0, 16)}
                                </span>
                            ))})}

            {editingJourney ? (
                <JourneyEditorTab
                    journey={editingJourney}
                    onSave={handleSave}
                    onBack={() => setEditingJourney(null)}
                    triggerJourneyAction={triggerJourneyAction}
                    t={t}
                    triggerTypes={triggerTypes}
                    nodeTypes={nodeTypes}
                    crmSegments={crmSegments || []}
                />
            ) : (
                <>
                    {/* Tab Bar */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
                        {TABS.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                style={{
                                    flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                                    background: activeTab === tab.key ? `linear-gradient(135deg,${C.accent}20,${C.purple}15)` : "transparent",
                                    color: activeTab === tab.key ? C.accent : C.muted,
                                    fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13,
                                    transition: "all 0.2s", borderBottom: activeTab === tab.key ? `2px solid ${C.accent}` : "2px solid transparent",
                                }}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    {activeTab === "list" && (
                        <JourneyListTab journeys={journeys} onEdit={setEditingJourney} onLaunch={handleLaunch} onPause={handlePause}
                            onClone={handleClone} onDelete={handleDelete} onNew={handleNew} t={t} triggerTypes={triggerTypes} />
                    )}
                    {activeTab === "templates" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))", textAlign: "center", padding: 28 }}>
                                <div style={{ fontSize: 32 }}>📋</div>
                                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>{t('journey.tplTitle') || "Journey Templates"}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{t('journey.tplSub') || "Start with a pre-built template to save time"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                                {TEMPLATES.map(tpl => (
                                    <div key={tpl.key} style={{ ...CARD, cursor: "pointer", transition: "all 0.2s" }} onClick={() => handleUseTemplate(tpl)}>
                                        <div style={{ fontSize: 28, marginBottom: 8 }}>{tpl.icon}</div>
                                        <div style={{ fontWeight: 800, fontSize: 15 }}>{tpl.name}</div>
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                                            {tpl.nodes.length} nodes · {triggerTypes.find(tt => tt.value === tpl.trigger)?.label || tpl.trigger}
                                        <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                                            {tpl.nodes.map((n, i) => {
                                                const icons = { trigger:"🎯", email:"✉️", kakao:"💬", delay:"⏱", condition:"🔀", popup:"🎯", webhook:"🔗", end:"🏁" };
                                                return <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: 'var(--surface)', color: C.muted }}>{icons[n.type] || "⚙"} {n.label}</span>;
                                            })}
                                        <button style={{ marginTop: 12, ...BTN(C.accent + "15", C.accent), width: "100%" }}>{t('journey.tplUse') || "Use Template"}</button>
                                ))})}
                    {activeTab === "analytics" && (
                        <JourneyAnalyticsTab journeys={journeys} t={t} />
                    )}
                    {activeTab === "guide" && (
                        <JourneyGuideTab t={t} onStartNew={() => { setActiveTab("list"); }} />
                    )}
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
);
}

export default function JourneyBuilderPage() {
    return (
<PlanGate feature="journey_builder">
            <JourneyBuilderContent />
        </PlanGate>
    );
}

