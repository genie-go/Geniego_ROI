import React, { useState, useMemo } from "react";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import DemoBanner from '../components/DemoBanner';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const CARD_NETWORKS = [
    { id: 'visa', label: 'VISA', color: '#1a1f71', icon: '💳' },
    { id: 'master', label: 'MasterCard', color: '#eb001b', icon: '💳' },
    { id: 'amex', label: 'AMEX', color: '#007bc1', icon: '💳' },
    { id: 'local', label: 'Local Card', color: '#22c55e', icon: '🏦' },
];

// KRW formatter replaced by useCurrency fmt()
const pct = v => (Number(v) * 100).toFixed(1) + "%";

const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
);
const KpiCard = ({ label, value, sub, color = "#4f8ef7", icon }) => (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 18, opacity: .7 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color, marginTop: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
);
const Bar = ({ v, max = 1, color = "#4f8ef7", h = 6 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.06)", borderRadius: h }}>
        <div style={{ width: `${Math.min(100, (v / (max || 1)) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width .5s" }} />
    </div>
);

const MONTHLY_BUDGET = [
    { month: "Jan", budget: 40000000, spent: 38200000 },
    { month: "Feb", budget: 43000000, spent: 41800000 },
    { month: "Mar", budget: 53000000, spent: 31400000 },
    { month: "Apr", budget: 48000000, spent: 0 },
    { month: "May", budget: 45000000, spent: 0 },
    { month: "Jun", budget: 60000000, spent: 0 },
];

/* ══ Channel Budget Tab — GlobalDataContext ══════════════════════════ */
function ChannelBudgetTab({ channelBudgets, useBudget, setBudget }) {
    const { isDemo } = useAuth();
    const { fmt } = useCurrency();
    const [editingId, setEditingId] = useState(null);
    const [editVal, setEditVal] = useState("");
    const [allocating, setAllocating] = useState(null);
    const [allocAmt, setAllocAmt] = useState("");

    const channels = Object.entries(channelBudgets).map(([id, c]) => ({ id, ...c }));
    const total = channels.reduce((s, c) => s + c.budget, 0);
    const totalSpent = channels.reduce((s, c) => s + c.spent, 0);

    const applyBudget = (id) => {
        const val = Number(editVal.replace(/[^0-9]/g, ''));
        if (isDemo) { alert('📌 Demo mode: Budget changes only take effect on paid plans.'); setEditingId(null); return; }
        if (val > 0) setBudget(id, val);
        setEditingId(null);
    };

    const applySpend = (id) => {
        const val = Number(allocAmt.replace(/[^0-9]/g, ''));
        if (isDemo) { alert('📌 Demo mode: Ad spend execution only applies on paid plans.'); setAllocating(null); setAllocAmt(""); return; }
        if (val > 0) useBudget(id, val);
        setAllocating(null);
        setAllocAmt("");
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {isDemo && <DemoBanner feature="Ad Budget Execution" />}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label="Total Allocated Budget" value={fmt(total)} color="#4f8ef7" icon="💰" />
                <KpiCard label="Total Spent" value={fmt(totalSpent)} sub={pct(totalSpent / total) + " spent"} color="#f97316" icon="📊" />
                <KpiCard label="Remaining Budget" value={fmt(total - totalSpent)} color="#22c55e" icon="💵" />
                <KpiCard label="Channels" value={channels.length.toString()} color="#a855f7" icon="📣" />
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>💰 Channel Budget Allocation &amp; Burn Rate</div>
                <div style={{ display: "grid", gap: 14 }}>
                    {channels.map(c => {
                        const spentPct = c.spent / c.budget;
                        const alert = spentPct > 0.85;
                        const roasOk = c.roas >= c.targetRoas;
                        return (
                            <div key={c.id}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <span style={{ fontSize: 16 }}>{c.icon}</span>
                                        <span style={{ fontWeight: 700, color: c.color }}>{c.name}</span>
                                        {alert && <Tag label="⚠ Budget Low" color="#eab308" />}
                                        <Tag label={roasOk ? `ROAS ${c.roas}x ✓` : `ROAS ${c.roas}x ✗`} color={roasOk ? "#22c55e" : "#ef4444"} />
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                                        <span style={{ color: c.color, fontWeight: 700 }}>{fmt(c.spent)}</span>
                                        <span style={{ color: "var(--text-3)" }}>/ {editingId === c.id
                                            ? <input value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => applyBudget(c.id)}
                                                style={{ width: 100, padding: "2px 6px", borderRadius: 6, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(79,142,247,0.4)", color: "#fff", fontSize: 12 }}
                                                autoFocus />
                                            : <span style={{ cursor: "pointer", textDecoration: "underline dotted" }} onClick={() => { setEditingId(c.id); setEditVal(String(c.budget)); }}>{fmt(c.budget)}</span>
                                        }</span>
                                        <span style={{ fontWeight: 700, color: alert ? "#eab308" : "var(--text-2)" }}>{pct(spentPct)}</span>
                                    </div>
                                </div>
                                <Bar v={c.spent} max={c.budget} color={alert ? "#eab308" : c.color} />
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    {allocating === c.id ? (
                                        <>
                                            <input value={allocAmt} onChange={e => setAllocAmt(e.target.value)} placeholder="Enter amount to spend"
                                                style={{ flex: 1, maxWidth: 150, padding: "4px 8px", borderRadius: 6, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,193,7,0.4)", color: "#fff", fontSize: 11 }} />
                                            <button onClick={() => applySpend(c.id)} style={{ padding: "4px 12px", borderRadius: 6, background: "#eab308", border: "none", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Execute</button>
                                            <button onClick={() => setAllocating(null)} style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-3)", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                                        </>
                                    ) : (
                                        <button onClick={() => setAllocating(c.id)} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.2)", color: "#4f8ef7", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                                            + Execute Ad Spend
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📊 Channel Performance Details</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Channel</th>
                                <th style={{ textAlign: "right" }}>Budget</th>
                                <th style={{ textAlign: "right" }}>Spent</th>
                                <th style={{ textAlign: "right" }}>Remaining</th>
                                <th style={{ textAlign: "center" }}>Target ROAS</th>
                                <th style={{ textAlign: "center" }}>Actual ROAS</th>
                                <th style={{ textAlign: "center" }}>Burn Rate</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.map(c => {
                                const roasOk = c.roas >= c.targetRoas;
                                const spentPct = c.spent / c.budget;
                                return (
                                    <tr key={c.id}>
                                        <td><span style={{ color: c.color, fontWeight: 700 }}>{c.icon} {c.name}</span></td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(c.budget)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(c.spent)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#22c55e" }}>{fmt(c.budget - c.spent)}</td>
                                        <td style={{ textAlign: "center" }}>{c.targetRoas}x</td>
                                        <td style={{ textAlign: "center", fontWeight: 800, color: roasOk ? "#22c55e" : "#ef4444" }}>{c.roas}x</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span style={{ color: spentPct > 0.85 ? "#eab308" : "var(--text-2)", fontWeight: 700 }}>{pct(spentPct)}</span>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <Tag label={roasOk ? "✓ Achieved" : "✗ Below"} color={roasOk ? "#22c55e" : "#ef4444"} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MonthlyBudgetTab({ totalBudget }) {
    const { fmt } = useCurrency();
    const totalMonthly = MONTHLY_BUDGET.reduce((s, m) => s + m.budget, 0);
    const totalSpent = MONTHLY_BUDGET.reduce((s, m) => s + m.spent, 0);
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <KpiCard label="Annual Total Budget" value={fmt(totalMonthly)} color="#4f8ef7" icon="📅" />
                <KpiCard label="Cumulative Spend" value={fmt(totalSpent)} sub={pct(totalSpent / totalMonthly) + " spent"} color="#f97316" icon="📊" />
                <KpiCard label="Ad Channel Total Budget" value={fmt(totalBudget)} color="#22c55e" icon="💰" sub="Live from GlobalDataContext" />
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📅 Monthly Budget Status (2026)</div>
                <div style={{ display: "grid", gap: 12 }}>
                    {MONTHLY_BUDGET.map(m => {
                        const isPast = m.spent > 0;
                        const spentPct = isPast ? m.spent / m.budget : 0;
                        const color = spentPct > 0.95 ? "#f97316" : spentPct > 0.8 ? "#eab308" : "#22c55e";
                        return (
                            <div key={m.month}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                                    <span style={{ fontWeight: 700 }}>{m.month}</span>
                                    <span>
                                        {isPast ? (
                                            <><span style={{ color, fontWeight: 700 }}>{fmt(m.spent)}</span> / {fmt(m.budget)} <span style={{ color }}>{pct(spentPct)}</span></>
                                        ) : (
                                            <span style={{ color: "var(--text-3)" }}>Budget: {fmt(m.budget)} (pending)</span>
                                        )}
                                    </span>
                                </div>
                                <Bar v={m.spent} max={m.budget} color={isPast ? color : "rgba(99,140,255,0.12)"} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ══ Payment Card Tab ══════════════════════ */
function PaymentCardTab({ paymentCards, addPaymentCard, removePaymentCard, setDefaultCard }) {
    const { isDemo } = useAuth();
    const { fmt } = useCurrency();
    const [form, setForm] = useState({ alias: '', number: '', expiry: '', cvc: '', network: 'visa', limit: '' });
    const [adding, setAdding] = useState(false);
    const [saved, setSaved] = useState(false);

    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const fmtNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
    const fmtExpiry = (v) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
    };

    const handleSave = () => {
        if (isDemo) {
            alert('📌 Demo mode: Real cards can only be added on paid plans. Virtual cards are used in demo.');
            setAdding(false);
            return;
        }
        const num = form.number.replace(/\s/g, '');
        if (num.length < 12) return alert('Please enter a valid card number');
        if (!form.expiry.includes('/')) return alert('Please enter expiry in MM/YY format');
        addPaymentCard({
            alias: form.alias || (form.network.toUpperCase() + ' Card'),
            number: '****-****-****-' + num.slice(-4),
            last4: num.slice(-4),
            expiry: form.expiry,
            network: form.network,
            limit: parseInt(form.limit.replace(/[^0-9]/g, '')) || 0,
        });
        setForm({ alias: '', number: '', expiry: '', cvc: '', network: 'visa', limit: '' });
        setAdding(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            {/* Info Banner */}
            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(79,142,247,0.1),rgba(168,85,247,0.08))', border: '1px solid rgba(79,142,247,0.2)' }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>💳 Ad Payment Card Management</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    Registered cards are used for automatic execution after AI marketing recommendation approval.<br />
                    The default card is auto-charged within the approved ad spend limit.
                </div>
            </div>

            {/* Card List */}
            {paymentCards.length > 0 && (
                <div style={{ display: 'grid', gap: 10 }}>
                    {paymentCards.map(card => {
                        const net = CARD_NETWORKS.find(n => n.id === card.network) || CARD_NETWORKS[0];
                        return (
                            <div key={card.id} className="card card-glass" style={{ padding: '16px 20px', border: `1.5px solid ${card.isDefault ? '#4f8ef7' : 'rgba(255,255,255,0.07)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                        <div style={{ width: 48, height: 30, borderRadius: 6, background: `linear-gradient(135deg,${net.color},${net.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 800 }}>
                                            {net.label.slice(0, 4)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{card.alias}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{card.number} · {card.expiry}</div>
                                            {card.limit > 0 && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Monthly limit {fmt(card.limit)}</div>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {card.isDefault ? (
                                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.3)', fontWeight: 700 }}>⭐ Default Card</span>
                                        ) : (
                                            <button onClick={() => setDefaultCard(card.id)}
                                                style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>
                                                Set as Default
                                            </button>
                                        )}
                                        {card.totalCharged > 0 && (
                                            <span style={{ fontSize: 10, color: '#f97316' }}>Charged {fmt(card.totalCharged)}</span>
                                        )}
                                        <button onClick={() => removePaymentCard(card.id)}
                                            style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer' }}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {paymentCards.length === 0 && !adding && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
                    No payment cards registered.<br />
                    <span style={{ fontSize: 11 }}>Add a card to enable automatic ad spend execution after AI approval.</span>
                </div>
            )}

            {/* Add Card Form */}
            {adding ? (
                <div className="card card-glass" style={{ padding: 20, border: '1px solid rgba(79,142,247,0.3)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>➕ Register New Payment Card</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        {[['Card Alias', 'alias', 'text', 'e.g. Corporate VISA'], ['Card Number', 'number', 'text', '0000 0000 0000 0000'], ['Expiry', 'expiry', 'text', 'MM/YY'], ['CVC', 'cvc', 'password', '***'], ['Monthly Limit (₩)', 'limit', 'number', 'e.g. 10000000']].map(([lbl, key, type, ph]) => (
                            <div key={key}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{lbl}</div>
                                <input type={type} value={form[key]} placeholder={ph}
                                    onChange={e => setF(key, key === 'number' ? fmtNumber(e.target.value) : key === 'expiry' ? fmtExpiry(e.target.value) : e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(79,142,247,0.25)', color: '#e2e8f0', fontSize: 12 }}
                                />
                            </div>
                        ))}
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Card Network</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {CARD_NETWORKS.map(n => (
                                    <button key={n.id} onClick={() => setF('network', n.id)}
                                        style={{ flex: 1, padding: '8px 4px', borderRadius: 7, border: `1px solid ${form.network === n.id ? n.color : 'rgba(255,255,255,0.1)'}`, background: form.network === n.id ? n.color + '18' : 'transparent', color: form.network === n.id ? n.color : 'var(--text-3)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                        {n.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleSave}
                            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            💳 Register Card
                        </button>
                        <button onClick={() => setAdding(false)}
                            style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 10 }}>🔒 Card info is encrypted. CVC is not stored.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setAdding(true)}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        + Add Payment Card
                    </button>
                    {saved && <span style={{ fontSize: 11, color: '#22c55e', alignSelf: 'center' }}>✅ Card registered!</span>}
                </div>
            )}
        </div>
    );
}

const TABS = [
    { id: "channel", label: "📊 Channel Budget" },
    { id: "monthly", label: "📅 Monthly Status" },
    { id: "card", label: "💳 Payment Cards" },
    { id: "ai", label: "🤖 AI Analysis" },
];

export default function BudgetPlanner() {
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { channelBudgets, budgetStats, useBudget, setBudget, pnlStats, paymentCards, addPaymentCard, removePaymentCard, setDefaultCard } = useGlobalData();
    const [tab, setTab] = useState("channel");

    const channelsForAI = useMemo(() => {
        return Object.entries(channelBudgets).reduce((acc, [id, c]) => {
            acc[id] = {
                name: c.name,
                spend: c.spent,
                revenue: Math.round(c.spent * c.roas),
                roas: c.roas,
                conversions: Math.round(c.spent / 12000),
                impressions: Math.round(c.spent / 8),
                clicks: Math.round(c.spent / 120),
                ctr: 2.8,
                convRate: 3.0,
                cpc: Math.round(c.spent / Math.max(Math.round(c.spent / 120), 1)),
            };
            return acc;
        }, {});
    }, [channelBudgets]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>💰 Ad Budget Planner</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Channel budget allocation · Real-time ad spend · AI reallocation simulation</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {/* Real-time P&L Summary */}
                        <div style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11 }}>
                            <span style={{ color: "var(--text-3)" }}>Revenue: </span>
                            <span style={{ color: "#22c55e", fontWeight: 700 }}>{fmt(pnlStats.revenue)}</span>
                        </div>
                        <div style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11 }}>
                            <span style={{ color: "var(--text-3)" }}>Ad Spend: </span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>{fmt(budgetStats.totalSpent)}</span>
                        </div>
                        <div style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 11 }}>
                            <span style={{ color: "var(--text-3)" }}>Remaining: </span>
                            <span style={{ color: "#4f8ef7", fontWeight: 700 }}>{fmt(budgetStats.remaining)}</span>
                        </div>
                        <button onClick={() => navigate('/channel-kpi')} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontSize: 11, fontWeight: 600 }}>📊 Channel KPI →</button>
                        <button onClick={() => navigate('/campaign-manager')} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontSize: 11, fontWeight: 600 }}>🎯 Campaign Manager →</button>
                        <button onClick={() => navigate('/wms')} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontSize: 11, fontWeight: 600 }}>🏭 Inventory →</button>
                    </div>
                </div>
            </div>

            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${TABS.length},1fr)` }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "13px 12px", border: "none", cursor: "pointer", background: tab === t.id ? "rgba(34,197,94,0.08)" : "transparent", borderBottom: `2px solid ${tab === t.id ? "#22c55e" : "transparent"}`, fontSize: 12, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</button>
                    ))}
                </div>
            </div>

            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "channel" && <ChannelBudgetTab channelBudgets={channelBudgets} useBudget={useBudget} setBudget={setBudget} />}
                {tab === "monthly" && <MonthlyBudgetTab totalBudget={budgetStats.totalBudget} />}
                {tab === "card" && <PaymentCardTab paymentCards={paymentCards} addPaymentCard={addPaymentCard} removePaymentCard={removePaymentCard} setDefaultCard={setDefaultCard} />}
                {tab === "ai" && (
                    <MarketingAIPanel
                        channels={channelsForAI}
                        campaigns={[]}
                    />
                )}
            </div>
        </div>
    );
}
