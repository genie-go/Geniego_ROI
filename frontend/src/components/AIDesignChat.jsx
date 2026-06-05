import React, { useState, useRef, useEffect } from 'react';
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

/* 196차 — 대화형 AI 디자인. 사용자가 자유 자연어로 대화하며 광고 디자인을 생성·수정.
 * 좌: 채팅(요청·수정), 우: 실시간 디자인 미리보기 + AI 정밀 SVG + 임시저장/저장. 실 Claude AI. */

const API = '/api';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';
const auth = () => {
  const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const RBOX = { '9:16': { w: 256, h: 455 }, '1:1': { w: 380, h: 380 }, '4:5': { w: 344, h: 430 }, '16:9': { w: 430, h: 242 } };
const CHLABEL = { tiktok: 'TikTok', meta: 'Meta', instagram: 'Instagram', kakao: 'Kakao', youtube: 'YouTube', popup: 'Web Popup' };

const SUGGESTIONS = [
  'GeniegoROI 회원가입 시 3개월 무료 이벤트를 럭셔리하게 인스타그램용으로 만들어줘',
  '여름 세일 50% 할인 광고를 역동적인 틱톡 숏폼으로',
  '신규 회원 환영 카카오 메시지 광고, 따뜻하고 친근하게',
];

function Preview({ design, svg }) {
  if (!design && !svg) {
    return (
      <div style={{ width: 280, height: 280, borderRadius: 16, border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
        <div style={{ fontSize: 40 }}>🎨</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>대화로 디자인이 생성됩니다</div>
      </div>
    );
  }
  const box = RBOX[design?.ratio] || RBOX['1:1'];
  if (svg) {
    const html = svg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"');
    return <div style={{ width: box.w, height: box.h, borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 38px rgba(15,23,42,0.24)', background: '#fff' }} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  const p = design.palette || {};
  return (
    <div style={{ width: box.w, height: box.h, borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 12px 38px rgba(15,23,42,0.22)', background: `linear-gradient(148deg, ${p.bg || '#0f172a'} 0%, ${p.primary || '#4f8ef7'} 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 18 }}>
      <div style={{ position: 'absolute', top: -36, right: -36, width: 140, height: 140, borderRadius: '50%', background: p.accent || '#22d3ee', opacity: 0.28 }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: box.w > 250 ? 24 : 19, fontWeight: 900, color: p.text || '#fff', lineHeight: 1.18, wordBreak: 'keep-all' }}>{design.headline}</div>
        {design.subheadline && <div style={{ fontSize: 13, color: p.text || '#fff', opacity: 0.86, marginTop: 7 }}>{design.subheadline}</div>}
      </div>
      <div style={{ position: 'relative' }}>
        {design.body && <div style={{ fontSize: 11.5, color: p.text || '#fff', opacity: 0.82, marginBottom: 10, lineHeight: 1.5 }}>{String(design.body).slice(0, 64)}</div>}
        <div style={{ display: 'inline-block', padding: '9px 20px', borderRadius: 99, background: p.accent || '#22d3ee', color: p.bg || '#0f172a', fontWeight: 800, fontSize: 13 }}>{design.cta || '지금 보기'}</div>
      </div>
    </div>
  );
}

export default function AIDesignChat({ onApplied }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState([{ role: 'assistant', content: '안녕하세요! 만들고 싶은 광고를 자유롭게 설명해 주세요. 채널·문구·분위기·색감 등 무엇이든 좋아요. 만든 뒤에도 "더 밝게", "문구 바꿔줘"처럼 대화로 수정할 수 있어요. 😊' }]);
  const [input, setInput] = useState('');
  const [design, setDesign] = useState(null);
  const [svg, setSvg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, busy]);

  const send = async (text) => {
    const msg = (typeof text === 'string' ? text : input).trim();
    if (!msg || busy) return;
    const conv = [...messages, { role: 'user', content: msg }];
    setMessages(conv); setInput(''); setBusy(true); setSvg(null); setSaveMsg(null);
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-chat`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ messages: conv.map(m => ({ role: m.role, content: m.content })), design }),
      });
      const d = await r.json();
      if (d.ok) {
        setMessages(m => [...m, { role: 'assistant', content: d.reply || '디자인을 업데이트했어요. 미리보기를 확인해 주세요!' }]);
        if (d.design) setDesign(d.design);
      } else setMessages(m => [...m, { role: 'assistant', content: d.error || 'AI 응답에 실패했어요. 다시 시도해 주세요.' }]);
    } catch { setMessages(m => [...m, { role: 'assistant', content: '서버 오류가 발생했어요. 다시 시도해 주세요.' }]); }
    setBusy(false);
  };

  const renderSvg = async () => {
    if (!design) return;
    setRendering(true);
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-render`, { method: 'POST', headers: auth(), body: JSON.stringify({ product_description: design.body || design.headline || '', design }) });
      const d = await r.json();
      if (d.ok && d.svg) setSvg(d.svg);
    } catch {}
    setRendering(false);
  };

  const save = async (status) => {
    if (!design) return;
    setSaving(true); setSaveMsg(null);
    try {
      const r = await fetch(`${API}/v422/ai/ad-design/save`, { method: 'POST', headers: auth(), body: JSON.stringify({ product_description: design.body || design.headline || '', category: design.mood || '', design, svg: svg || '', status }) });
      const d = await r.json();
      setSaveMsg(d.ok ? { ok: true, text: d.message } : { ok: false, text: d.error || '저장 실패' });
      if (d.ok && status === 'approved' && onApplied) onApplied(d.id, design);
    } catch { setSaveMsg({ ok: false, text: '서버 오류. 다시 시도하세요.' }); }
    setSaving(false);
  };

  const inputStyle = { flex: 1, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 14, outline: 'none' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.8fr) auto', gap: 18, alignItems: 'start' }}>
      {/* 채팅 */}
      <div style={{ display: 'flex', flexDirection: 'column', height: 540, borderRadius: 16, border: '1px solid var(--border,#e2e8f0)', background: 'var(--bg-card,#fff)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border,#e2e8f0)', fontWeight: 900, fontSize: 14, color: '#1e293b', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}>💬 {t('aiChat.title', '대화형 AI 디자인')}</div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.6,
              background: m.role === 'user' ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(99,102,241,0.07)',
              color: m.role === 'user' ? '#fff' : '#334155', borderBottomRightRadius: m.role === 'user' ? 4 : 14, borderBottomLeftRadius: m.role === 'user' ? 14 : 4 }}>
              {m.content}
            </div>
          ))}
          {busy && <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, fontSize: 13, background: 'rgba(99,102,241,0.07)', color: '#94a3b8' }}>⏳ AI가 디자인하는 중…</div>}
          {messages.length <= 1 && !busy && (
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {SUGGESTIONS.map((s, k) => (
                <button key={k} onClick={() => send(s)} style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)', color: '#4f46e5', fontSize: 12, cursor: 'pointer', lineHeight: 1.5 }}>💡 {s}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid var(--border,#e2e8f0)', display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t('aiChat.placeholder', '만들거나 수정할 내용을 입력… (예: 색을 더 밝게)')} style={inputStyle} disabled={busy} />
          <button onClick={() => send()} disabled={busy || !input.trim()}
            style={{ padding: '0 20px', borderRadius: 12, border: 'none', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', background: busy || !input.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#a855f7,#4f8ef7)', color: '#fff', fontWeight: 800, fontSize: 14 }}>↑</button>
        </div>
      </div>

      {/* 미리보기 + 저장 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 470, maxWidth: '46vw', padding: 22, borderRadius: 16, border: '1px solid var(--border,#e2e8f0)', background: 'var(--bg-card,#fff)' }}>
        {design && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{CHLABEL[design.channel] || design.channel || '광고'}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', fontWeight: 700 }}>{design.format || ''} {design.ratio || ''}</span>
          </div>
        )}
        <Preview design={design} svg={svg} />
        {design && Array.isArray(design.hashtags) && design.hashtags.length > 0 && (
          <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {design.hashtags.slice(0, 4).map((h, k) => <span key={k} style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>{h}</span>)}
          </div>
        )}
        {design && (
          <>
            <button onClick={renderSvg} disabled={rendering} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(168,85,247,0.35)', cursor: rendering ? 'wait' : 'pointer', background: 'rgba(168,85,247,0.07)', color: '#a855f7', fontWeight: 700, fontSize: 12.5 }}>
              {rendering ? '⏳ 정밀 디자인 중…' : '🎨 AI 정밀 디자인 (완성 SVG)'}
            </button>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => save('draft')} disabled={saving} style={{ padding: '10px 0', borderRadius: 10, border: '1px solid rgba(79,142,247,0.35)', cursor: saving ? 'wait' : 'pointer', background: 'rgba(79,142,247,0.07)', color: '#4f8ef7', fontWeight: 800, fontSize: 12.5 }}>📝 {t('aiChat.draft', '임시저장')}</button>
              <button onClick={() => save('approved')} disabled={saving} style={{ padding: '10px 0', borderRadius: 10, border: 'none', cursor: saving ? 'wait' : 'pointer', background: saving ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 800, fontSize: 12.5 }}>✅ {t('aiChat.save', '저장')}</button>
            </div>
          </>
        )}
        {saveMsg && <div style={{ width: '100%', padding: '8px 11px', borderRadius: 9, fontSize: 11.5, fontWeight: 600, background: saveMsg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: saveMsg.ok ? '#16a34a' : '#dc2626' }}>{saveMsg.text}</div>}
      </div>
    </div>
  );
}
