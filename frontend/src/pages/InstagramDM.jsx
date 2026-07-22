import React, { useState, useEffect, useRef, useCallback } from "react";
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js";
import BeginnerGuide from "../components/BeginnerGuide.jsx";
import { GUIDE } from "../lib/guideSpecs.js";
import PlanGate from "../components/PlanGate.jsx";
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js'; // 191차: 세션 토큰 인증(채널 부활 — /api/instagram requirePro)
import { IS_DEMO } from '../utils/demoEnv.js';

/**
 * Instagram / Facebook DM 연동 관리 페이지
 * - Page Access Token 1개 입력 → 즉시 실연동
 * - 대화 관리, DM 발송, 자동 응답 규칙
 * - Instagram + Facebook Messenger 연동
 * - /실 완전 분리
 */

const _CONVERSATIONS = [
    { id: 1, thread_id: 't1', sender_name: '@minjun_style', avatar: 'M', platform: 'instagram', last_message: '안녕하세요! 이 제품 재고 있나요?', time: '2분 전', status: 'unread', followers: 12400 },
    { id: 2, thread_id: 't2', sender_name: '@shopaholic_j', avatar: 'S', platform: 'instagram', last_message: '배송은 얼마나 걸리나요?', time: '14분 전', status: 'unread', followers: 3200 },
    { id: 3, thread_id: 't3', sender_name: 'James Kim', avatar: 'J', platform: 'facebook', last_message: '할인 이벤트 정보 알려주세요', time: '1시간 전', status: 'read', followers: 0 },
    { id: 4, thread_id: 't4', sender_name: '@trendy_sejong', avatar: 'T', platform: 'instagram', last_message: '협업 제안드리고 싶습니다', time: '3시간 전', status: 'read', followers: 89000 },
    { id: 5, thread_id: 't5', sender_name: 'Sarah Park', avatar: 'P', platform: 'facebook', last_message: '제품 문의드립니다', time: '어제', status: 'read', followers: 0 },
];

const _MESSAGES = {
    t1: [
        { id: 1, from: '@minjun_style', text: '안녕하세요! 이 제품 재고 있나요?', time: '14:22', mine: false },
        { id: 2, from: '나', text: '안녕하세요! 네, 현재 재고 있습니다. 어떤 사이즈가 필요하신가요?', time: '14:24', mine: true },
        { id: 3, from: '@minjun_style', text: 'M사이즈 1개 구매하고 싶어요', time: '14:25', mine: false },
    ],
    t2: [
        { id: 1, from: '@shopaholic_j', text: '배송은 얼마나 걸리나요?', time: '13:48', mine: false },
    ],
};

const AUTO_REPLY_RULES = [
    { id: 1, keyword: '배송', reply: '배송은 결제 후 영업일 기준 2~3일 소요됩니다. 도서 산간지역은 1~2일 추가될 수 있습니다.', active: true },
    { id: 2, keyword: '재고', reply: '현재 재고는 쇼핑몰에서 실시간으로 확인하실 수 있습니다. 품절 시 알림 신청도 가능합니다!', active: true },
    { id: 3, keyword: '할인', reply: '현재 진행 중인 할인 이벤트는 링크를 확인해주세요: [링크]', active: false },
];

const TABS = [
    { id: 'messages', label: '💬 DM 관리', labelKey: 'igdm.tabMessages' },
    { id: 'broadcast', label: '📢 단체 발송', labelKey: 'igdm.tabBroadcast' },
    { id: 'auto', label: '🤖 자동 응답', labelKey: 'igdm.tabAuto' },
    { id: 'analytics', label: '📊 분석', labelKey: 'igdm.tabAnalytics' },
    { id: 'settings', label: '⚙️ 연동 설정', labelKey: 'igdm.tabSettings' },
];

// [271차] 데모 표시데이터 15개국 현지화(대화/메시지/자동응답/탭)
try { _dloc(_CONVERSATIONS); _dloc(_MESSAGES); _dloc(AUTO_REPLY_RULES); _dloc(TABS); } catch (_) {}

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
    // 184차 격리: 데모에서만 가상 대화/메시지 시드. 운영(IS_DEMO=false)은 실 API 데이터만(목 데이터 유입 0).
    const isDemo = IS_DEMO;

    // [259차] 자동응답 규칙 영속 — 과거 로컬 state 전용(새로고침 리셋·백엔드 미인지)이던 것을 실 엔드포인트 배선.
    //   데모는 로컬 시드 유지(백엔드 미호출), 운영은 /api/instagram/rules 저장·조회(웹훅 자동응답 실적용).
    const persistRules = (next) => {
        if (isDemo) return;
        postJsonAuth('/api/instagram/rules', { rules: next.map(r => ({ keyword: r.keyword, reply: r.reply, enabled: r.active ? 1 : 0 })) }).catch(() => {});
    };

    useEffect(() => {
        // 191차: 데모는 로컬 시드 사용(백엔드 호출 안 함). 운영은 세션 인증으로 /api/instagram 호출.
        if (isDemo) { setConversations(_CONVERSATIONS); return; }
        getJsonAuth('/api/instagram/settings').then(d => {
            if (d.ok) setSettings(d);
        }).catch(() => {});
        getJsonAuth('/api/instagram/conversations').then(d => {
            setConversations(d.ok && d.conversations?.length ? d.conversations : []);
        }).catch(() => setConversations([]));
        getJsonAuth('/api/instagram/rules').then(d => {
            if (Array.isArray(d?.rules)) setRules(d.rules.map(r => ({ id: r.id, keyword: r.keyword, reply: r.reply, active: !!Number(r.enabled) })));
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedConv) {
            const msgs = isDemo ? (_MESSAGES[selectedConv.thread_id] || []) : (selectedConv.messages || []);
            setMessages(msgs);
        }
    }, [selectedConv]);

    const handleSaveSettings = async () => {
        setSending(true);
        const r = await postJsonAuth('/api/instagram/settings', form);
        setTestResult(r);
        setSending(false);
        if (r.ok) getJsonAuth('/api/instagram/settings').then(d => d.ok && setSettings(d));
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedConv) return;
        const newMsg = { id: Date.now(), from: '나', text: replyText, time: new Date().toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' }), mine: true };
        setMessages(prev => [...prev, newMsg]);
        const sentText = replyText;
        setReplyText('');
        if (!isDemo) {
            // [현 차수] ★발송 결과 확인 — 종전엔 응답을 무시(.catch 삼킴)해서, 24h 윈도우 만료·토큰 오류·IG 거부 시에도
            //   내 말풍선이 그대로 남아 CS 담당자가 "응대 완료"로 오인(고객은 답장을 영영 못 받음). 실패 시 말풍선 회수 + 경고.
            const d = await postJsonAuth('/api/instagram/send', { recipient_id: selectedConv.sender_id, message: sentText, platform: selectedConv.platform }).catch(() => null);
            if (!d || !d.ok) {
                setMessages(prev => prev.filter(m => m.id !== newMsg.id)); // 실패한 말풍선 회수
                setReplyText(sentText); // 입력 복원
                alert(`⚠ 답장을 보내지 못했습니다 — ${d?.error || '발송 실패(24시간 응답 윈도우 만료 또는 연동 오류)'}. 고객에게 전달되지 않았습니다.`);
                return;
            }
            // 발송 직후 통계 동기화(발송 KPI stale 해소)
            getJsonAuth('/api/instagram/settings').then(d2 => d2.ok && setSettings(d2)).catch(() => {});
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastText.trim()) return;
        setSending(true);
        // [현차수] 시뮬레이션 제거 → 실 백엔드 단체발송(POST /api/instagram/broadcast).
        //   데모는 운영 API 미호출(격리) — 로컬 안내만. 운영은 실 발송(24h 윈도우 inbound 대상)+이력/통계 동기화.
        if (isDemo) {
            await new Promise(r => setTimeout(r, 800));
            setSending(false);
            alert(t('igdm.broadcastSentAlert', '✅ {{n}}명에게 메시지를 발송했습니다.', { n: conversations.length }));
            setBroadcastText('');
            return;
        }
        try {
            const r = await postJsonAuth('/api/instagram/broadcast', { message: broadcastText, platform: settings?.settings?.[0]?.platform || 'instagram' });
            if (r.ok) {
                alert(t('igdm.broadcastSentAlert', '✅ {{n}}명에게 메시지를 발송했습니다.', { n: r.sent ?? 0 }));
                setBroadcastText('');
                // 발송 직후 통계 동기화(KPI/분석 stale 해소)
                getJsonAuth('/api/instagram/settings').then(d => d.ok && setSettings(d)).catch(() => {});
            } else {
                alert((r.error || t('igdm.broadcastFail', '발송에 실패했습니다.')));
            }
        } catch (e) {
            alert(t('igdm.broadcastFail', '발송에 실패했습니다.'));
        }
        setSending(false);
    };

    const iconColor = (p) => p === 'instagram' ? '#E1306C' : '#1877F2';

    return (
        <PlanGate feature="instagram_dm">
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up" style={{ padding: '13px 24px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#E1306C,#833AB4,#1877F2)' }}>
                            📸 Instagram & Facebook DM
                        </div>
                        <div className="hero-desc">{t('igdm.heroDesc', 'Page Access Token 1개 → 즉시 실연동 · Instagram + Facebook Messenger 연동 관리 · 자동 응답 규칙')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            {[
                                { l: t('igdm.kpiConnected', '연결됨'), v: settings?.settings?.length > 0 ? '✅' : isDemo ? '📌 ' : t('igdm.kpiNotConnected', '미연동'), c: settings?.ok ? '#22c55e' : '#6b7280' },
                                { l: t('igdm.kpiReceived', '수신 DM'), v: (settings?.stats?.received ?? (isDemo ? 142 : 0)).toLocaleString(), c: '#a855f7' },
                                { l: t('igdm.kpiSent', '발송'), v: (settings?.stats?.sent ?? (isDemo ? 89 : 0)).toLocaleString(), c: '#4f8ef7' },
                                { l: t('igdm.kpiUnread', '미읽음'), v: settings?.stats?.unread ?? (isDemo ? 12 : 0), c: '#ef4444' },
                            ].map(k => (
                                <div key={k.l} style={{ padding: '4px 12px', borderRadius: 16, background: `${k.c}12`, border: `1px solid ${k.c}30`, fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-3)', marginRight: 4 }}>{k.l}</span>
                                    <strong style={{ color: k.c }}>{k.v}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                    {isDemo && (
                        <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {t('igdm.demoModeNote', '📌  모드 — Page Access Token 등록 시 즉시 실연동')}
                        </div>
                    )}
                </div>
            </div>

            <BeginnerGuide spec={GUIDE.igdm} />

            {/* Tabs */}
            <div className="page-subtabs" style={{ display: 'flex', gap: 4, padding: '4px', background: 'rgba(0,0,0,0.25)', borderRadius: 12, marginBottom: 12 }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1, background: tab === tb.id ? 'linear-gradient(135deg,#E1306C,#833AB4)' : 'transparent', color: tab === tb.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms' }}>
                        {t(tb.labelKey, tb.label)}
                    </button>
                ))}
            </div>

            {/* DM Management Tab */}
            {tab === 'messages' && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, height: 520 }}>
                    {/* 대화 List */}
                    <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 750, fontSize: 13 }}>{t('igdm.convList', '대화 목록')}</div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {conversations.map(c => (
                                <div key={c.id} onClick={() => { setSelectedConv(c); setConversations(prev => prev.map(cv => cv.id === c.id ? { ...cv, status: 'read' } : cv)); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedConv?.id === c.id ? 'rgba(225,48,108,0.08)' : 'transparent', transition: 'background 150ms' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${iconColor(c.platform)}aa,${iconColor(c.platform)}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff', flexShrink: 0, position: 'relative' }}>
                                            {c.avatar}
                                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: iconColor(c.platform), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '2px solid #070f1a' }}>
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
                                        {selectedConv.followers > 0 && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('igdm.followers', '팔로워 {{n}}명', { n: (selectedConv.followers || 0).toLocaleString() })}</div>}
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
                                    {[{ k: 'igdm.qr1', d: '네, 감사합니다!' }, { k: 'igdm.qr2', d: '재고 확인 후 답장드릴게요' }, { k: 'igdm.qr3', d: '링크 보내드릴게요' }].map(qr => (
                                        <button key={qr.k} onClick={() => setReplyText(t(qr.k, qr.d))} style={{ padding: '4px 10px', borderRadius: 15, border: '1px solid rgba(225,48,108,0.3)', background: 'transparent', color: '#E1306C', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}>{t(qr.k, qr.d)}</button>
                                    ))}
                                </div>
                                <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderTop: '1px solid var(--border)' }}>
                                    <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendReply()} placeholder={t('igdm.msgInputPh', '메시지 입력...')}
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(225,48,108,0.2)', background: 'rgba(15,20,40,0.8)', color: '#fff', fontSize: 13 }} />
                                    <button onClick={handleSendReply} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#E1306C,#833AB4)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('igdm.send', '전송')}</button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                                <div style={{ fontSize: 13 }}>{t('igdm.selectConvEmpty', '왼쪽에서 대화를 선택하세요')}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 단체 Send Tab */}
            {tab === 'broadcast' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('igdm.broadcastTitle', '📢 DM 단체 발송')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{t('igdm.targetSelect', '대상 선택')}</div>
                            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                                {[
                                    { l: t('igdm.targetAll', '전체 팔로워'), v: t('igdm.targetAllDesc', '모든 DM 수신 허용 팔로워'), cnt: isDemo ? 8400 : (settings?.stats?.followers ?? 0) },
                                    { l: t('igdm.targetNoReply', '미응답 대화'), v: t('igdm.targetNoReplyDesc', '48시간 이상 미응답'), cnt: isDemo ? 23 : (settings?.stats?.unread ?? 0) },
                                    { l: t('igdm.targetRecent', '최근 문의 고객'), v: t('igdm.targetRecentDesc', '최근 7일 문의'), cnt: isDemo ? 142 : (settings?.stats?.received ?? 0) },
                                ].map(tg => (
                                    <label key={tg.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer' }}>
                                        <input type="radio" name="target" defaultChecked={tg.cnt === 142} />
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700 }}>{tg.l}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{tg.v} — {t('igdm.peopleCount', '{{n}}명', { n: tg.cnt.toLocaleString() })}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{t('igdm.msgCompose', '메시지 작성')}</div>
                            <textarea value={broadcastText} onChange={e => setBroadcastText(e.target.value)} rows={5}
                                placeholder={t('igdm.broadcastPh', '발송할 DM 내용을 입력하세요...\n\ntip: {{Name}}으로 개인화 가능')}
                                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(225,48,108,0.2)', background: 'rgba(15,20,40,0.8)', color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />
                            <button onClick={handleBroadcast} disabled={sending || !broadcastText.trim()}
                                style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: sending ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg,#E1306C,#833AB4)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer' }}>
                                {sending ? t('igdm.sending', '⏳ 발송 중...') : t('igdm.broadcastBtn', '📤 발송')}
                            </button>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>{t('igdm.metaPolicyNote', '⚠️ Meta 정책: 고객이 먼저 DM을 보낸 경우에만 발송 가능합니다')}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{t('igdm.sendHistory', '📋 발송 내역')}</div>
                            {/* 206차: 발송이력 하드코딩 IS_DEMO 게이트 — 운영은 빈 내역(목데이터 유입 차단) */}
                            {(isDemo ? [
                                { date: '2026-03-10', target: t('igdm.targetNoReply', '미응답 대화'), cnt: 18, status: t('igdm.statusDone', '완료') },
                                { date: '2026-03-08', target: t('igdm.targetRecent', '최근 문의 고객'), cnt: 61, status: t('igdm.statusDone', '완료') },
                                { date: '2026-03-05', target: t('igdm.targetAllShort', '전체'), cnt: 142, status: t('igdm.statusDone', '완료') },
                            ] : []).map((h, i) => (
                                <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface)', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700 }}>{h.target}</span>
                                        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{h.status}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.date} · {t('igdm.sentCount', '{{n}}명 발송', { n: h.cnt })}</div>
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
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('igdm.autoTitle', '🤖 자동 응답 규칙')}</div>
                        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                            {rules.map(r => (
                                <div key={r.id} style={{ padding: '12px 16px', borderRadius: 12, background: `${r.active ? 'rgba(99,102,241,0.06)' : 'rgba(0,0,0,0.2)'}`, border: `1px solid ${r.active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ padding: '2px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>"{r.keyword}"</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('igdm.autoTriggerSuffix', '포함 시 자동 응답')}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <div onClick={() => setRules(rs => { const next = rs.map(x => x.id === r.id ? { ...x, active: !x.active } : x); persistRules(next); return next; })} style={{ width: 34, height: 18, borderRadius: 20, background: r.active ? '#4f8ef7' : 'rgba(107,114,128,0.3)', cursor: 'pointer', position: 'relative', transition: 'background 300ms' }}>
                                                <div style={{ position: 'absolute', top: 2, left: r.active ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>↳ {r.reply}</div>
                                </div>
                            ))}
                        </div>
                        {/* 새 규칙 추가 */}
                        <div style={{ padding: '14px', borderRadius: 12, background: 'var(--surface)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>{t('igdm.addRuleTitle', '+ 새 자동 응답 규칙 추가')}</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                <input value={newRule.keyword} onChange={e => setNewRule(n => ({ ...n, keyword: e.target.value }))} placeholder={t('igdm.keywordPh', '키워드 (ex: 배송, 환불, 재고)')} className="input" style={{ fontSize: 12 }} />
                                <textarea value={newRule.reply} onChange={e => setNewRule(n => ({ ...n, reply: e.target.value }))} placeholder={t('igdm.autoReplyPh', '자동 응답 메시지')} rows={2}
                                    style={{ padding: '8px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, resize: 'none' }} />
                                <button onClick={() => { if (newRule.keyword && newRule.reply) { setRules(rs => { const next = [...rs, { id: Date.now(), ...newRule, active: true }]; persistRules(next); return next; }); setNewRule({ keyword: '', reply: '' }); }}} style={{ padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    {t('igdm.addRule', '규칙 추가')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Tab */}
            {tab === 'analytics' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('igdm.analyticsTitle', '📊 DM 성과 분석')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                        {/* 207차 운영오염 차단: 분석 KPI 도 실 settings.stats 우선, 데모만 시드, 운영 미연동=— */}
                        {[
                            { l: t('igdm.statTotalReceived', '총 수신 DM'), v: (settings?.stats?.received != null ? Number(settings.stats.received).toLocaleString() : (isDemo ? '2,847' : '—')), c: '#4f8ef7', icon: '📨' },
                            { l: t('igdm.statAvgResponse', '평균 응답 시간'), v: (settings?.stats?.avgResponse ?? (isDemo ? t('igdm.statAvgResponseV', '4.2분') : '—')), c: '#22c55e', icon: '⚡' },
                            { l: t('igdm.statConversion', 'DM → 구매 전환'), v: (settings?.stats?.conversion ?? (isDemo ? '8.4%' : '—')), c: '#f97316', icon: '🛒' },
                            { l: t('igdm.statAutoReplyRate', '자동 응답률'), v: (settings?.stats?.autoReplyRate ?? (isDemo ? '67%' : '—')), c: '#a855f7', icon: '🤖' },
                        ].map(k => (
                            <div key={k.l} style={{ padding: '14px 16px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ fontSize: 24, flex: '0 0 auto' }}>{k.icon}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: k.c, lineHeight: 1.15 }}>{k.v}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{k.l}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '16px', borderRadius: 12, background: 'var(--surface)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{t('igdm.popularKeywords', '인기 키워드 TOP 5')}</div>
                        {(isDemo ? [{ k: '배송', cnt: 342, pct: 35 }, { k: '재고', cnt: 218, pct: 22 }, { k: '할인', cnt: 189, pct: 19 }, { k: '교환', cnt: 124, pct: 13 }, { k: '협업', cnt: 98, pct: 10 }] : (settings?.stats?.keywords ?? [])).map(kw => (
                            <div key={kw.k} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                    <span>"{kw.k}"</span><span style={{ color: '#4f8ef7' }}>{t('igdm.countTimes', '{{n}}회', { n: kw.cnt })}</span>
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
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>{t('igdm.settingsTitle', '⚙️ Meta API 연동 설정')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>{t('igdm.settingsDesc', 'Page Access Token 1개 입력 → Instagram + Facebook Messenger 즉시 연동')}</div>
                        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{t('igdm.platform', '플랫폼')}</div>
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
                                { l: t('igdm.pageIdLabel', 'Page ID (선택)'), k: 'page_id', type: 'text', ph: t('igdm.pageIdPh', '숫자로 된 Page ID') },
                            ].map(f => (
                                <div key={f.k}>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                                    <input type={f.type} value={form[f.k] || ''} onChange={e => setForm(x => ({ ...x, [f.k]: e.target.value }))} placeholder={f.ph} className="input" />
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveSettings} disabled={sending || !form.access_token}
                            style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: sending ? 'rgba(107,114,128,0.3)' : 'linear-gradient(135deg,#E1306C,#833AB4)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
                            {sending ? t('igdm.connecting', '⏳ 연결 중...') : t('igdm.connectSave', '🔗 연결 테스트 + 저장')}
                        </button>
                        {testResult && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: testResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, fontSize: 12 }}>
                                {testResult.ok ? `✅ ${testResult.message || t('igdm.connectSuccess', '연결 성공!')}` : `❌ ${testResult.message || t('igdm.connectFail', '연결 실패')}`}
                            </div>
                        )}
                        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.8 }}>
                            📌 <strong>{t('igdm.setupGuideTitle', '설정 방법:')}</strong><br />
                            1. <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style={{ color: '#4f8ef7' }}>Meta Developer Console</a> → {t('igdm.setupStep1', '앱 생성')}<br />
                            2. {t('igdm.setupStep2', 'Instagram Basic Display API / Messenger 활성화')}<br />
                            3. {t('igdm.setupStep3', 'Page Access Token 복사 후 위에 입력')}<br />
                            4. {t('igdm.setupStep4', '📸 Instagram은 Page ID 필요 · 👤 Facebook은 선택')}
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