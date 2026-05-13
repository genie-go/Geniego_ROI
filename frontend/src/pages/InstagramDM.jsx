import React, { useState, useEffect, useRef, useCallback } from "react";
import PlanGate from "../components/PlanGate.jsx";
import { getJson, postJson } from '../services/apiClient.js';

/**
 * Instagram / Facebook DM Integration Management Page
 * - Page Access Token 1개 Input → 즉시 실Integration
 * - 대화 Management, DM Send, Auto 응답 규칙
 * - Instagram + Facebook Messenger Integration
 * - /실 완전 분리
 */

const _CONVERSATIONS = [
    { id: 1, thread_id: 't1', sender_name: '@minjun_style', avatar: 'M', platform: 'instagram', last_message: '안녕하세요! 이 제품 Stock 있나요?', time: '2분 전', status: 'unread', followers: 12400 },
    { id: 2, thread_id: 't2', sender_name: '@shopaholic_j', avatar: 'S', platform: 'instagram', last_message: '배송은 얼마나 걸리나요?', time: '14분 전', status: 'unread', followers: 3200 },
    { id: 3, thread_id: 't3', sender_name: 'James Kim', avatar: 'J', platform: 'facebook', last_message: '할인 Event Info 알려주세요', time: '1Time 전', status: 'read', followers: 0 },
    { id: 4, thread_id: 't4', sender_name: '@trendy_sejong', avatar: 'T', platform: 'instagram', last_message: '협업 제안드리고 싶습니다', time: '3Time 전', status: 'read', followers: 89000 },
    { id: 5, thread_id: 't5', sender_name: 'Sarah Park', avatar: 'P', platform: 'facebook', last_message: '제품 문의드립니다', time: 'Yesterday', status: 'read', followers: 0 },
];

const _MESSAGES = {
    t1: [
        { id: 1, from: '@minjun_style', text: '안녕하세요! 이 제품 Stock 있나요?', time: '14:22', mine: false },
        { id: 2, from: '나', text: '안녕하세요! 네, 현재 Stock 있습니다. 어떤 사이즈가 필요하신가요?', time: '14:24', mine: true },
        { id: 3, from: '@minjun_style', text: 'M사이즈 1개 구매하고 싶어요', time: '14:25', mine: false },
    ],
    t2: [
        { id: 1, from: '@shopaholic_j', text: '배송은 얼마나 걸리나요?', time: '13:48', mine: false },
    ],
};

const AUTO_REPLY_RULES = [
    { id: 1, keyword: '배송', reply: '배송은 Payment 후 영업일 기준 2~3일 소요됩니다. 도서 산간지역은 1~2일 Add될 Count 있습니다.', active: true },
    { id: 2, keyword: 'Stock', reply: '현재 Stock는 쇼핑몰에서 실Time으로 Confirm하실 Count 있습니다. 품절 시 Notification 신청도 가능합니다!', active: true },
    { id: 3, keyword: '할인', reply: '현재 In Progress인 할인 Event는 Link를 Confirm해주세요: [Link]', active: false },
];

const TABS = [
    { id: 'messages', label: '💬 DM Management' },
    { id: 'broadcast', label: '📢 단체 Send' },
    { id: 'auto', label: '🤖 Auto 응답' },
    { id: 'analytics', label: '📊 Analysis' },
    { id: 'settings', label: '⚙️ Integration Settings' },
];

export default function InstagramDM() {
  const t = useT();
    const [tab, setTab] = useState('messages');
    const [settings, setSettings] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [form, setForm] = useState({ access_token: '', page_id: '', platform: 'instagram' });
    const [sending, setSending] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [broadcastText, setBroadcastText] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [rules, setRules] = useState(AUTO_REPLY_RULES);
    const [newRule, setNewRule] = useState({ keyword: '', reply: '' });
    /* isDemo permanently disabled */

    useEffect(() => {
        getJson('/api/instagram/settings').then(d => {
            if (d.ok) {
                setSettings(d);
                setConversations((d.conversations || _CONVERSATIONS));
            }
        });
        getJson('/api/instagram/conversations').then(d => {
            if (d.ok && d.conversations?.length) setConversations(d.conversations);
            else setConversations(_CONVERSATIONS);
        });
    }, []);

    useEffect(() => {
        if (selectedConv) {
            const msgs = _MESSAGES[selectedConv.thread_id] || [];
            setMessages(msgs);
        }
    }, [selectedConv]);

    const handleSaveSettings = async () => {
        setSending(true);
        const r = await postJson('/api/instagram/settings', form);
        setTestResult(r);
        setSending(false);
        if (r.ok) getJson('/api/instagram/settings').then(d => d.ok && setSettings(d));
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedConv) return;
        const newMsg = { id: Date.now(), from: '나', text: replyText, time: new Date().toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' }), mine: true };
        setMessages(prev => [...prev, newMsg]);
        setReplyText('');
        if (!isDemo) await postJson('/api/instagram/send', { recipient_id: selectedConv.sender_id, message: replyText, platform: selectedConv.platform });
    };

    const handleBroadcast = async () => {
        if (!broadcastText.trim()) return;
        setSending(true);
        await new Promise(r => setTimeout(r, 1500)); // 시뮬레이션
        setSending(false);
        alert(`✅ ${conversations.length}명에게 Message를 Send했습니다.`);
        setBroadcastText('');
    };

    const iconColor = (p) => p === 'instagram' ? '#E1306C' : '#1877F2';

    return (
        <PlanGate feature="instagram_dm">
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#E1306C,#833AB4,#1877F2)' }}>
                            📸 Instagram & Facebook DM
                        </div>
                        <div className="hero-desc">Page Access Token 1개 → 즉시 실Integration · Instagram + Facebook Messenger Integration Management · Auto 응답 Rule</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            {[
                                { l: 'Connected', v: settings?.settings?.length > 0 ? '✅' : isDemo ? '📌 ' : '미Integration', c: settings?.ok ? '#22c55e' : '#6b7280' },
                                { l: 'Count신 DM', v: (settings?.stats?.received || 142).toLocaleString(), c: '#a855f7' },
                                { l: 'Send', v: (settings?.stats?.sent || 89).toLocaleString(), c: '#4f8ef7' },
                                { l: '미Read', v: settings?.stats?.unread || 12, c: '#ef4444' },
                            ].map(k => (
                                <div key={k.l} style={{ padding: '5px 14px', borderRadius: 20, background: `${k.c}12`, border: `1px solid ${k.c}30`, fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-3)', marginRight: 4 }}>{k.l}</span>
                                    <strong style={{ color: k.c }}>{k.v}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                    {isDemo && (
                        <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                            📌  Mode — Page Access Token Register 시 즉시 실Integration
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1, background: tab === t.id ? 'linear-gradient(135deg,#E1306C,#833AB4)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* DM Management Tab */}
            {tab === 'messages' && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, height: 520 }}>
                    {/* 대화 List */}
                    <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 750, fontSize: 13 }}>대화 List</div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {conversations.map(c => (
                                <div key={c.id} onClick={() => { setSelectedConv(c); setConversations(prev => prev.map(cv => cv.id === c.id ? { ...cv, status: 'read' } : cv)); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedConv?.id === c.id ? 'rgba(225,48,108,0.08)' : 'transparent', transition: 'background 150ms' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${iconColor(c.platform)}aa,${iconColor(c.platform)}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#fff', flexShrink: 0, position: 'relative' }}>
                                            {c.avatar}
                                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: iconColor(c.platform), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, border: '2px solid #070f1a' }}>
                                                {c.platform === 'instagram' ? '📸' : '👤'}
                                            </div>
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: c.status === 'unread' ? '#fff' : 'var(--text-2)' }}>{c.sender_name}</span>
                                                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.time}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_message}</div>
                                            {c.status === 'unread' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E1306C', marginTop: 4 }} />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 대화 Panel */}
                    <div className="card card-glass" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                        {selectedConv ? (
                            <>
                                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ fontSize: 20 }}>{selectedConv.platform === 'instagram' ? '📸' : '👤'}</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 14 }}>{selectedConv.sender_name}</div>
                                        {selectedConv.followers > 0 && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Follower {(selectedConv.followers || 0).toLocaleString()}명</div>}
                                    </div>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {messages.map(m => (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: m.mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.mine ? 'linear-gradient(135deg,#E1306C,#833AB4)' : 'rgba(255,255,255,0.07)', fontSize: 13 }}>
                                                {m.text}
                                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{m.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* 빠른 답장 템플릿 */}
                                <div style={{ padding: '8px 16px', display: 'flex', gap: 6, overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
                                    {['네, 감사합니다!', 'Stock Confirm 후 Reply드릴게요', 'Link 보내드릴게요'].map(t => (
                                        <button key={t} onClick={() => setReplyText(t)} style={{ padding: '4px 10px', borderRadius: 15, border: '1px solid rgba(225,48,108,0.3)', background: 'transparent', color: '#E1306C', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>{t}</button>
                                    ))}
                                </div>
                                <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderTop: '1px solid var(--border)' }}>
                                    <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendReply()} placeholder="Message Input..."
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(225,48,108,0.2)', background: 'rgba(15,20,40,0.8)', color: '#fff', fontSize: 13 }} />
                                    <button onClick={handleSendReply} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#E1306C,#833AB4)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send</button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                                <div style={{ fontSize: 13 }}>Left에서 대화를 Select하세요</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 단체 Send Tab */}
            {tab === 'broadcast' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📢 DM 단체 Send</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>대상 Select</div>
                            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                                {[
                                    { l: 'All Follower ()', v: '모든 DM Count신 Allow Follower', cnt: 8400 },
                                    { l: '미응답 대화', v: '48Time 이상 미응답', cnt: 23 },
                                    { l: '최근 문의 Customer', v: 'Last 7 Days 문의', cnt: 142 },
                                ].map(t => (
                                    <label key={t.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer' }}>
                                        <input type="radio" name="target" defaultChecked={t.cnt === 142} />
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700 }}>{t.l}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.v} — {t.cnt.toLocaleString()}명</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Message 작성</div>
                            <textarea value={broadcastText} onChange={e => setBroadcastText(e.target.value)} rows={5}
                                placeholder="Send할 DM 내용을 Input하세요...&#10;&#10;tip: {{Name}}으로 Personal화 가능"
                                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(225,48,108,0.2)', background: 'rgba(15,20,40,0.8)', color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />
                            <button onClick={handleBroadcast} disabled={sending || !broadcastText.trim()}
                                style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: sending ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg,#E1306C,#833AB4)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer' }}>
                                {sending ? '⏳ Sending...' : `📤 Send`}
                            </button>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>⚠️ Meta 정책: Customer이 먼저 DM을 보낸 경우에만 Send 가능합니다</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>📋 Send History</div>
                            {[
                                { date: '2026-03-10', target: '미응답 대화', cnt: 18, status: 'Done' },
                                { date: '2026-03-08', target: '최근 문의 Customer', cnt: 61, status: 'Done' },
                                { date: '2026-03-05', target: 'All', cnt: 142, status: 'Done' },
                            ].map((h, i) => (
                                <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700 }}>{h.target}</span>
                                        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{h.status}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.date} · {h.cnt}명 Send</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Auto 응답 Tab */}
            {tab === 'auto' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>🤖 Auto 응답 Rule</div>
                        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                            {rules.map(r => (
                                <div key={r.id} style={{ padding: '12px 16px', borderRadius: 12, background: `${r.active ? 'rgba(99,102,241,0.06)' : 'rgba(0,0,0,0.2)'}`, border: `1px solid ${r.active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ padding: '2px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>"{r.keyword}"</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>포함 시 Auto 응답</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <div onClick={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, active: !x.active } : x))} style={{ width: 34, height: 18, borderRadius: 20, background: r.active ? '#4f8ef7' : 'rgba(107,114,128,0.3)', cursor: 'pointer', position: 'relative', transition: 'background 300ms' }}>
                                                <div style={{ position: 'absolute', top: 2, left: r.active ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>↳ {r.reply}</div>
                                </div>
                            ))}
                        </div>
                        {/* 새 Rule Add */}
                        <div style={{ padding: '14px', borderRadius: 12, background: 'var(--surface)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>+ 새 Auto 응답 Rule Add</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                <input value={newRule.keyword} onChange={e => setNewRule(n => ({ ...n, keyword: e.target.value }))} placeholder="키워드 (ex: 배송, 환불, Stock)" className="input" style={{ fontSize: 12 }} />
                                <textarea value={newRule.reply} onChange={e => setNewRule(n => ({ ...n, reply: e.target.value }))} placeholder="Auto 응답 Message" rows={2}
                                    style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, resize: 'none' }} />
                                <button onClick={() => { if (newRule.keyword && newRule.reply) { setRules(rs => [...rs, { id: Date.now(), ...newRule, active: true }]); setNewRule({ keyword: '', reply: '' }); }}} style={{ padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    Rule Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Tab */}
            {tab === 'analytics' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📊 DM Performance Analysis</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                        {[
                            { l: 'Total Count신 DM', v: '2,847', c: '#4f8ef7', icon: '📨' },
                            { l: 'Average 응답 Time', v: '4.2분', c: '#22c55e', icon: '⚡' },
                            { l: 'DM → 구매 Conversion', v: '8.4%', c: '#f97316', icon: '🛒' },
                            { l: 'Auto 응답률', v: '67%', c: '#a855f7', icon: '🤖' },
                        ].map(k => (
                            <div key={k.l} style={{ padding: '16px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>인기 키워드 TOP 5</div>
                        {[{ k: '배송', cnt: 342, pct: 35 }, { k: 'Stock', cnt: 218, pct: 22 }, { k: '할인', cnt: 189, pct: 19 }, { k: '교환', cnt: 124, pct: 13 }, { k: '협업', cnt: 98, pct: 10 }].map(kw => (
                            <div key={kw.k} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                    <span>"{kw.k}"</span><span style={{ color: '#4f8ef7' }}>{kw.cnt}회</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
                                    <div style={{ width: `${kw.pct}%`, height: '100%', background: 'linear-gradient(90deg,#E1306C,#833AB4)', borderRadius: 6 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>⚙️ Meta API Integration Settings</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>Page Access Token 1개 Input → Instagram + Facebook Messenger 즉시 Integration</div>
                        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>Platform</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['instagram', 'facebook'].map(p => (
                                        <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${form.platform === p ? iconColor(p) : 'rgba(255,255,255,0.1)'}`, background: form.platform === p ? `${iconColor(p)}15` : 'transparent', color: form.platform === p ? iconColor(p) : 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                            {p === 'instagram' ? '📸 Instagram' : '👤 Facebook'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {[
                                { l: 'Page Access Token', k: 'access_token', type: 'password', ph: 'EAAxxxx...' },
                                { l: 'Page ID (Select)', k: 'page_id', type: 'text', ph: '숫자로 된 Page ID' },
                            ].map(f => (
                                <div key={f.k}>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                                    <input type={f.type} value={form[f.k] || ''} onChange={e => setForm(x => ({ ...x, [f.k]: e.target.value }))} placeholder={f.ph} className="input" />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveSettings} disabled={sending || !form.access_token}
                            style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: sending ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg,#E1306C,#833AB4)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
                            {sending ? '⏳ Connecting...' : '🔗 Connect Test + Save'}
                        </button>
                        {testResult && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: testResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: 12 }}>
                                {testResult.ok ? `✅ ${testResult.message || 'Connect Success!'}` : `❌ ${testResult.message || 'Connect Failed'}`}
                            </div>
                        )}
                        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.8 }}>
                            📌 <strong>Settings 방법:</strong><br />
                            1. <a href="https://developers.facebook.com/apps" target="_blank" style={{ color: '#4f8ef7' }}>Meta Developer Console</a> → 앱 Create<br />
                            2. Instagram Basic Display API / Messenger Activate<br />
                            3. Page Access Token Copy 후 위에 Input<br />
                            4. 📸 Instagram은 Page ID 필요 · 👤 Facebook은 Select
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PlanGate>
    );
}

import { useI18n } from '../i18n/index.js';
import { useT } from '../i18n/index.js';