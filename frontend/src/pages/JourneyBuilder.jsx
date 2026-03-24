import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate";
import useDemo from "../hooks/useDemo";
import DemoBanner from "../components/DemoBanner";
import { DEMO_JOURNEYS, DEMO_JOURNEY_TEMPLATES } from "../utils/DemoDataLayer";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useI18n } from "../i18n/index.js";

function makeAPI(token) {
    return (path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json()).catch(() => ({}));
    };
}

const C = {
    bg: "#070f1a", surface: "#0d1829", card: "#111e30",
    border: "rgba(99,102,241,0.15)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "rgba(255,255,255,0.4)", text: "#e8eaf0",
    orange: "#fb923c", line: "#06c755",
};
const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };
const INPUT = { width: "100%", padding: "9px 13px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box", fontSize: 13 };

/* ─── Visual Journey Canvas */
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
                        <div style={{ fontSize: 11, fontWeight: 800, color: type.color }}>{type.label}</div>
                        <div style={{ fontSize: 12, color: C.text, marginTop: 3, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</div>
                        {node.config?.subject && <div style={{ fontSize: 10, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.config.subject}</div>}
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Node Config Panel */
function NodePanel({ node, onChange, onDelete, onTriggerAction, isDemo, t, triggerTypes, nodeTypes }) {
    if (!node) return (
        <div style={{ textAlign: "center", color: C.muted, padding: 40, fontSize: 13 }}>
            {t('journey.clickToEdit')}
        </div>
    );
    const type = nodeTypes[node.type] || {};
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 800, color: type.color, fontSize: 15 }}>{type.label} {t('journey.nodeConfig').replace('⚙️ ', '')}</div>
            <div>
                <label style={{ fontSize: 11, color: C.muted }}>{t('journey.nodeName')}</label>
                <input style={INPUT} value={node.label || ""} onChange={e => onChange({ ...node, label: e.target.value })} />
            </div>
            {node.type === "trigger" && (
                <div>
                    <label style={{ fontSize: 11, color: C.muted }}>{t('journey.triggerType')}</label>
                    <select style={{ ...INPUT }} value={node.config?.type || "manual"} onChange={e => onChange({ ...node, config: { ...node.config, type: e.target.value } })}>
                        {triggerTypes.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                    </select>
                </div>
            )}
            {node.type === "email" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.emailSubject')}</label><input style={INPUT} value={node.config?.subject || ""} onChange={e => onChange({ ...node, config: { ...node.config, subject: e.target.value } })} placeholder={t('journey.emailSubjectPh')} /></div>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.emailFrom')}</label><input style={INPUT} value={node.config?.from_name || ""} onChange={e => onChange({ ...node, config: { ...node.config, from_name: e.target.value } })} placeholder={t('journey.emailSenderPh')} /></div>
                    <button onClick={() => onTriggerAction("email_send", { subject: node.config?.subject, count: 10 })}
                        style={{ padding: "7px", borderRadius: 8, border: "none", background: "#4f8ef720", color: C.accent, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        {isDemo ? t('journey.emailSimulate') : t('journey.emailTestSend')}
                    </button>
                </>
            )}
            {node.type === "kakao" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.kakaoTemplate')}</label><input style={INPUT} value={node.config?.template_code || ""} onChange={e => onChange({ ...node, config: { ...node.config, template_code: e.target.value } })} placeholder="TEMPLATE_001" /></div>
                    <div>
                        <label style={{ fontSize: 11, color: C.muted }}>{t('journey.kakaoMsgType')}</label>
                        <select style={{ ...INPUT }} value={node.config?.msg_type || t('journey.kakaoAlimtalk')} onChange={e => onChange({ ...node, config: { ...node.config, msg_type: e.target.value } })}>
                            <option>{t('journey.kakaoAlimtalk')}</option><option>{t('journey.kakaoFriendtalk')}</option>
                        </select>
                    </div>
                    <button onClick={() => onTriggerAction("kakao_send", { template: node.config?.template_code, count: 5 })}
                        style={{ padding: "7px", borderRadius: 8, border: "none", background: "#fbbf2420", color: C.yellow, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        {isDemo ? t('journey.kakaoTest') : t('journey.emailTestSend')}
                    </button>
                </>
            )}
            {node.type === "line" && (
                <>
                    <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.lineTemplate')}</label><input style={INPUT} value={node.config?.template_code || ""} onChange={e => onChange({ ...node, config: { ...node.config, template_code: e.target.value } })} placeholder="ORDER_CONFIRM_JP" /></div>
                    <div>
                        <label style={{ fontSize: 11, color: C.muted }}>{t('journey.lineMsgType')}</label>
                        <select style={{ ...INPUT }} value={node.config?.message_type || "text"} onChange={e => onChange({ ...node, config: { ...node.config, message_type: e.target.value } })}>
                            <option value="text">テキスト</option>
                            <option value="flex">FlexメッセNew</option>
                            <option value="template">テンプレート</option>
                        </select>
                    </div>
                    <button onClick={() => onTriggerAction("line_send", { template: node.config?.template_code, count: 8 })}
                        style={{ padding: "7px", borderRadius: 8, border: "none", background: "#06c75520", color: C.line, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        {isDemo ? t('journey.lineSimulate') : t('journey.lineTestSend')}
                    </button>
                </>
            )}
            {node.type === "delay" && (
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.muted }}>{t('journey.delayTime')}</label><input style={INPUT} type="number" value={node.config?.value || 1} onChange={e => onChange({ ...node, config: { ...node.config, value: parseInt(e.target.value) } })} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.muted }}>{t('journey.delayUnit')}</label>
                        <select style={{ ...INPUT }} value={node.config?.unit || "days"} onChange={e => onChange({ ...node, config: { ...node.config, unit: e.target.value } })}>
                            <option value="minutes">{t('journey.minutes')}</option><option value="hours">{t('journey.hours')}</option><option value="days">{t('journey.days')}</option>
                        </select>
                    </div>
                </div>
            )}
            {node.type === "condition" && (
                <div><label style={{ fontSize: 11, color: C.muted }}>{t('journey.conditionField')}</label>
                    <select style={{ ...INPUT }} value={node.config?.field || "email_clicked"} onChange={e => onChange({ ...node, config: { ...node.config, field: e.target.value } })}>
                        <option value="email_clicked">{t('journey.conditionEmailClicked')}</option>
                        <option value="email_opened">{t('journey.conditionEmailOpened')}</option>
                        <option value="purchased">{t('journey.conditionPurchased')}</option>
                        <option value="ltv_gt">{t('journey.conditionLtvGt')}</option>
                        <option value="kakao_clicked">{t('journey.conditionKakaoClicked')}</option>
                        <option value="line_clicked">{t('journey.conditionLineClicked')}</option>
                    </select>
                </div>
            )}
            {node.type === "ab_test" && (
                <div>
                    <label style={{ fontSize: 11, color: C.muted }}>{t('journey.abGroupA')}</label>
                    <input style={INPUT} type="number" min={10} max={90} value={node.config?.split_a || 50} onChange={e => onChange({ ...node, config: { ...node.config, split_a: parseInt(e.target.value) } })} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t('journey.abGroupB')}: {100 - (node.config?.split_a || 50)}%</div>
                </div>
            )}
            <button onClick={onDelete} style={{ padding: "8px", borderRadius: 8, border: "none", background: C.red + "20", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 8 }}>{t('journey.deleteNode')}</button>
        </div>
    );
}

/* ─── Journey List Tab */
function JourneyListTab({ journeys, templates, onEdit, onLaunch, onCreateFromTemplate, onNew, isDemo, t, triggerTypes }) {
    const [showNew, setShowNew] = useState(false);
    const [newForm, setNewForm] = useState({ name: "", trigger_type: "purchase" });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Template Quick Start */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('journey.templateQuickStart')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                    {templates.map(tpl => (
                        <div key={tpl.id} style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s" }}
                            onClick={() => onCreateFromTemplate(tpl)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "60"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{(t("demoData." + tpl.name) !== "demoData." + tpl.name ? t("demoData." + tpl.name) : tpl.name)}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{t(`journey.tpl.${tpl.tplKey}Desc`) !== `journey.tpl.${tpl.tplKey}Desc` ? t(`journey.tpl.${tpl.tplKey}Desc`) : tpl.description}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <span style={{ fontSize: 10, color: C.accent, background: C.accent + "20", padding: "2px 8px", borderRadius: 999 }}>{(t("demoData." + tpl.estimated_duration) !== "demoData." + tpl.estimated_duration ? t("demoData." + tpl.estimated_duration) : tpl.estimated_duration)}</span>
                                <span style={{ fontSize: 10, color: C.purple, background: C.purple + "20", padding: "2px 8px", borderRadius: 999 }}>{tpl.nodes_count} {t('journey.steps')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* My Journeys */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t('journey.myJourneys')}</div>
                <button onClick={() => setShowNew(!showNew)} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.accent},#6366f1)`, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    {showNew ? t('journey.cancel') : t('journey.newJourney')}
                </button>
            </div>

            {showNew && (
                <div style={{ ...CARD, borderColor: C.accent + "40" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div><label style={{ fontSize: 12, color: C.muted }}>{t('journey.journeyName')}</label><input style={INPUT} value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder={t('journey.journeyNamePh')} /></div>
                        <div><label style={{ fontSize: 12, color: C.muted }}>{t('journey.triggerEvent')}</label>
                            <select style={{ ...INPUT }} value={newForm.trigger_type} onChange={e => setNewForm({ ...newForm, trigger_type: e.target.value })}>
                                {triggerTypes.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onNew(newForm); setShowNew(false); setNewForm({ name: "", trigger_type: "purchase" }); }}
                        disabled={!newForm.name}
                        style={{ marginTop: 12, padding: "9px 24px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{t('journey.create')}</button>
                </div>
            )}

            {journeys.length === 0 ? (
                <div style={{ ...CARD, textAlign: "center", color: C.muted }}>{t('journey.noJourneys')}</div>
            ) : (
                journeys.map(j => (
                    <div key={j.id} style={{ ...CARD, cursor: "pointer" }} onClick={() => onEdit(j)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontWeight: 800, fontSize: 15 }}>{(t("demoData." + j.name) !== "demoData." + j.name ? t("demoData." + j.name) : j.name)}</span>
                                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 999, fontWeight: 700, background: j.status === "active" ? C.green + "20" : C.surface, color: j.status === "active" ? C.green : C.muted }}>
                                        {j.status === "active" ? t('journey.statusActive') : t('journey.statusDraft')}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                                    {t('journey.trigger')}: {triggerTypes.find(tt => tt.value === j.trigger_type)?.label || j.trigger_type} &nbsp;|&nbsp;
                                    {t('journey.entered')}: <span style={{ color: C.accent }}>{j.stats_entered}</span> &nbsp;|&nbsp;
                                    {t('journey.completed')}: <span style={{ color: C.green }}>{j.stats_completed}</span> &nbsp;|&nbsp;
                                    {t('journey.active')}: <span style={{ color: C.yellow }}>{j.active_count}</span>
                                </div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t('journey.lastUpdated')}: {j.updated_at?.slice(0, 16)}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => onEdit(j)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.surface, color: C.accent, cursor: "pointer", fontSize: 12 }}>{t('journey.edit')}</button>
                                {j.status !== "active" && (
                                    <button onClick={() => onLaunch(j.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.green + "20", color: C.green, cursor: "pointer", fontSize: 12 }}>{t('journey.run')}</button>
                                )}
                            </div>
                        </div>
                        {j.nodes && j.nodes.length > 0 && (
                            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                                {j.nodes.map(n => {
                                    const nt = { trigger: { label: "🎯", color: "#10b981", bg: "#10b98120" }, email: { label: "✉️", color: "#4f8ef7", bg: "#4f8ef720" }, kakao: { label: "💬", color: "#fbbf24", bg: "#fbbf2420" }, line: { label: "💚", color: "#06c755", bg: "#06c75520" }, sms: { label: "📱", color: "#a78bfa", bg: "#a78bfa20" }, delay: { label: "⏱", color: "#94a3b8", bg: "#94a3b820" }, condition: { label: "🔀", color: "#f59e0b", bg: "#f59e0b20" }, ab_test: { label: "🧪", color: "#8b5cf6", bg: "#8b5cf620" }, tag: { label: "🏷", color: "#06b6d4", bg: "#06b6d420" }, end: { label: "🏁", color: "#6b7280", bg: "#6b728020" } }[n.type];
                                    return <span key={n.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: nt?.bg || "rgba(255,255,255,0.05)", color: nt?.color || C.muted, fontWeight: 700 }}>{nt?.label || n.type} {n.label}</span>;
                                })}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

/* ─── Journey Editor Tab */
function JourneyEditorTab({ journey, onSave, onBack, isDemo, triggerJourneyAction, t, triggerTypes, nodeTypes }) {
    const [nodes, setNodes] = useState(journey.nodes || []);
    const [edges, setEdges] = useState(journey.edges || []);
    const [selectedNode, setSelectedNode] = useState(null);
    const [saving, setSaving] = useState(false);
    const [triggerLog, setTriggerLog] = useState([]);

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
        const log = triggerJourneyAction(type, payload);
        const label = type === "email_send"
            ? t('journey.emailSendSim').replace('{{count}}', payload.count)
            : type === "kakao_send"
            ? t('journey.kakaoSendSim').replace('{{count}}', payload.count)
            : t('journey.lineSendSim').replace('{{count}}', payload.count);
        setTriggerLog(prev => [{ id: Date.now(), label, at: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
    };

    const save = () => {
        setSaving(true);
        onSave({ ...journey, nodes, edges });
        setTimeout(() => setSaving(false), 500);
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onBack} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: C.surface, color: C.accent, cursor: "pointer" }}>{t('journey.backToList')}</button>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{journey.name}</span>
                    {isDemo && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#f59e0b20", color: "#f59e0b", fontWeight: 700 }}>{t('journey.demoSimulation')}</span>}
                </div>
                <button onClick={save} disabled={saving} style={{ padding: "8px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.accent},#6366f1)`, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    {saving ? t('journey.saving') : t('journey.save')}
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
                <div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                        {Object.entries(nodeTypes).filter(([k]) => k !== "trigger" || nodes.length === 0).map(([type, meta]) => (
                            <button key={type} onClick={() => addNode(type)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${meta.color}40`, background: meta.bg, color: meta.color, cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s" }}>
                                + {meta.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, minHeight: 500 }}>
                        <JourneyCanvas nodes={nodes} edges={edges} onSelectNode={setSelectedNode} selectedNodeId={selectedNode?.id} nodeTypes={nodeTypes} />
                    </div>
                    {triggerLog.length > 0 && (
                        <div style={{ marginTop: 12, background: "rgba(79,142,247,0.06)", border: `1px solid ${C.accent}30`, borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 6 }}>{t('journey.execLog')}</div>
                            {triggerLog.map(log => (
                                <div key={log.id} style={{ fontSize: 11, color: C.text, padding: "3px 0", borderBottom: `1px solid rgba(255,255,255,0.05)`, display: "flex", justifyContent: "space-between" }}>
                                    <span>{log.label}</span><span style={{ color: C.muted }}>{log.at}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ ...CARD, alignSelf: "start" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: C.muted }}>{t('journey.nodeSettings')}</div>
                    <NodePanel node={selectedNode} onChange={updateNode} onDelete={deleteNode} onTriggerAction={handleTriggerAction} isDemo={isDemo} t={t} triggerTypes={triggerTypes} nodeTypes={nodeTypes} />
                </div>
            </div>
        </div>
    );
}

/* ─── Main Page */
function JourneyBuilderContent() {
    const { token } = useAuth();
    const { isDemo } = useDemo();
    const { triggerJourneyAction, journeyTriggers } = useGlobalData();
    const { t } = useI18n();
    const API = makeAPI(token);

    const [journeys, setJourneys] = useState(isDemo ? DEMO_JOURNEYS : []);
    const [templates] = useState(DEMO_JOURNEY_TEMPLATES);
    const [editingJourney, setEditingJourney] = useState(null);

    // Build node types and trigger types from i18n
    const nodeTypes = {
        trigger: { label: t('journey.nodeTypes.trigger'), color: "#10b981", bg: "#10b98120" },
        email: { label: t('journey.nodeTypes.email'), color: "#4f8ef7", bg: "#4f8ef720" },
        kakao: { label: t('journey.nodeTypes.kakao'), color: "#fbbf24", bg: "#fbbf2420" },
        line: { label: t('journey.nodeTypes.line'), color: "#06c755", bg: "#06c75520" },
        sms: { label: t('journey.nodeTypes.sms'), color: "#a78bfa", bg: "#a78bfa20" },
        delay: { label: t('journey.nodeTypes.delay'), color: "#94a3b8", bg: "#94a3b820" },
        condition: { label: t('journey.nodeTypes.condition'), color: "#f59e0b", bg: "#f59e0b20" },
        ab_test: { label: t('journey.nodeTypes.ab_test'), color: "#8b5cf6", bg: "#8b5cf620" },
        tag: { label: t('journey.nodeTypes.tag'), color: "#06b6d4", bg: "#06b6d420" },
        end: { label: t('journey.nodeTypes.end'), color: "#6b7280", bg: "#6b728020" },
    };

    const triggerTypes = [
        { value: "signup", label: t('journey.triggerTypes.signup') },
        { value: "purchase", label: t('journey.triggerTypes.purchase') },
        { value: "cart_abandoned", label: t('journey.triggerTypes.cart_abandoned') },
        { value: "churned", label: t('journey.triggerTypes.churned') },
        { value: "segment_entered", label: t('journey.triggerTypes.segment_entered') },
        { value: "birthday", label: t('journey.triggerTypes.birthday') },
        { value: "manual", label: t('journey.triggerTypes.manual') },
    ];

    useEffect(() => {
        if (isDemo) return;
        API("/journey/journeys").then(r => r.journeys && setJourneys(r.journeys));
    }, [isDemo]);

    const handleLaunch = async (id) => {
        if (isDemo) {
            setJourneys(prev => prev.map(j => j.id === id ? { ...j, status: "active" } : j));
            return;
        }
        await API(`/journey/journeys/${id}/launch`, { method: "POST" });
        API("/journey/journeys").then(r => r.journeys && setJourneys(r.journeys));
    };

    const handleNew = (form) => {
        const newJ = { id: `j_${Date.now()}`, ...form, status: "draft", stats_entered: 0, stats_completed: 0, active_count: 0, updated_at: new Date().toISOString(), nodes: [], edges: [] };
        setJourneys(prev => [newJ, ...prev]);
        setEditingJourney(newJ);
    };

    const handleCreateFromTemplate = (tpl) => {
        const newJ = { id: `j_${Date.now()}`, name: tpl.name, trigger_type: tpl.trigger_type, status: "draft", stats_entered: 0, stats_completed: 0, active_count: 0, updated_at: new Date().toISOString(), nodes: [], edges: [] };
        setJourneys(prev => [newJ, ...prev]);
        setEditingJourney(newJ);
    };

    const handleSave = (updated) => {
        setJourneys(prev => prev.map(j => j.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : j));
        if (!isDemo) {
            API(`/journey/journeys/${updated.id}`, { method: "PUT", body: JSON.stringify({ nodes: updated.nodes, edges: updated.edges }) });
        }
    };

    return (
        <div style={{ padding: "0 0 40px 0", background: C.bg, minHeight: "100%", color: C.text }}>
            {isDemo && <DemoBanner feature={t('journey.pageTitle')} />}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>🗺️</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 22 }}>{t('journey.pageTitle')}</div>
                        <div style={{ fontSize: 13, color: C.muted }}>{t('journey.pageSub')}</div>
                    </div>
                </div>
                {journeyTriggers.length > 0 && !editingJourney && (
                    <div style={{ marginTop: 12, background: "rgba(6,199,85,0.05)", border: "1px solid rgba(6,199,85,0.2)", borderRadius: 10, padding: "10px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.line, marginBottom: 6 }}>{t('journey.recentTriggers')}</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {journeyTriggers.slice(0, 5).map(tr => (
                                <span key={tr.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: C.muted }}>
                                    {tr.type === "email_send" ? "✉️" : tr.type === "kakao_send" ? "💬" : "💚"} {tr.type} · {tr.at?.slice(0, 16)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {editingJourney ? (
                <JourneyEditorTab
                    journey={editingJourney}
                    onSave={handleSave}
                    onBack={() => setEditingJourney(null)}
                    isDemo={isDemo}
                    triggerJourneyAction={triggerJourneyAction}
                    t={t}
                    triggerTypes={triggerTypes}
                    nodeTypes={nodeTypes}
                />
            ) : (
                <JourneyListTab
                    journeys={journeys}
                    templates={templates}
                    onEdit={setEditingJourney}
                    onLaunch={handleLaunch}
                    onCreateFromTemplate={handleCreateFromTemplate}
                    onNew={handleNew}
                    isDemo={isDemo}
                    t={t}
                    triggerTypes={triggerTypes}
                />
            )}
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
