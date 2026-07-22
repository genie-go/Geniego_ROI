import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { svgToPngDataUrl } from '../utils/svgRasterize.js'; // [Track B] SVG→PNG 클라 래스터화(매체 이미지 업로드용)
import { sanitizeSvg } from '../utils/xssSanitizer.js'; // [282차 F-P1] 저장형 SVG XSS 차단
import { buildSamples, SAMPLE_CATEGORIES } from '../data/aiDesignSamples.js';

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
  'GeniegoROI 회원가입 3개월 무료 이벤트를 럭셔리하게 인스타그램용으로 (🎬 애니메이션으로)',
  '제품 소개를 넘겨보는 캐러셀 광고로 만들어줘 (🎞️ 위에서 컷 수 선택)',
  '여름 세일 50% 할인, 모델 인물 실사 비주얼로 (🖼️ 실사)',
  'https://(제품/브랜드 URL) 이 페이지를 분석해서 그 톤으로 광고 만들어줘 (🔗 URL 참고)',
];

function Preview({ design, svg, image, video }) {
  const vbox = RBOX[design?.ratio] || RBOX['1:1'];
  if (video) {
    return <video src={video} autoPlay loop muted playsInline controls style={{ width: vbox.w, height: vbox.h, borderRadius: 16, objectFit: 'cover', boxShadow: '0 14px 42px rgba(15,23,42,0.28)', background: '#000' }} />;
  }
  if (!design && !svg && !image) {
    return (
      <div style={{ width: 280, height: 280, borderRadius: 16, border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
        <div style={{ fontSize: 40 }}>🎨</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>대화로 디자인이 생성됩니다</div>
      </div>
    );
  }
  const box = RBOX[design?.ratio] || RBOX['1:1'];
  // 실사 이미지 + 텍스트 오버레이(매거진급 광고 합성)
  if (image) {
    const pp = design?.palette || {};
    return (
      <div style={{ width: box.w, height: box.h, borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 14px 42px rgba(15,23,42,0.28)' }}>
        <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,12,24,0.85) 0%, rgba(8,12,24,0.12) 46%, rgba(8,12,24,0.5) 100%)' }} />
        <div style={{ position: 'absolute', top: 18, left: 18, right: 18 }}>
          <div style={{ fontSize: box.w > 250 ? 27 : 21, fontWeight: 900, color: '#fff', lineHeight: 1.14, wordBreak: 'keep-all', textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}>{design?.headline}</div>
          {design?.subheadline && <div style={{ fontSize: 13.5, color: '#fff', opacity: 0.94, marginTop: 7, textShadow: '0 1px 10px rgba(0,0,0,0.55)' }}>{design.subheadline}</div>}
        </div>
        <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18 }}>
          {design?.body && <div style={{ fontSize: 12, color: '#fff', opacity: 0.92, marginBottom: 11, lineHeight: 1.5, textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}>{String(design.body).slice(0, 60)}</div>}
          <div style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 99, background: pp.accent || '#f4d03f', color: pp.bg || '#0a1a3f', fontWeight: 800, fontSize: 13.5, boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>{design?.cta || '지금 보기'}</div>
        </div>
      </div>
    );
  }
  if (svg) {
    const html = sanitizeSvg(svg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"'));
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
  const { t, lang } = useI18n();
  const samples = useMemo(() => buildSamples(lang), [lang]);   // 접속 언어 기반 현지 자연어 샘플
  const catLabel = (cat, fb) => t('aiChat.cat_' + cat, fb);   // 카테고리 라벨 현지화
  const [messages, setMessages] = useState([{ role: 'assistant', content: '안녕하세요! 만들고 싶은 광고를 자유롭게 설명해 주세요. 채널·문구·분위기·색감 등 무엇이든 좋아요. 📎 버튼으로 참고 이미지를 첨부하면 그 스타일·색감을 분석해 디자인에 반영해 드려요. 만든 뒤에도 "더 밝게", "문구 바꿔줘"처럼 대화로 수정할 수 있어요. 😊' }]);
  const [input, setInput] = useState('');
  const [design, setDesign] = useState(null);
  const [svg, setSvg] = useState(null);
  const [image, setImage] = useState(null);      // 실사 이미지(data URI)
  const [imgGenerating, setImgGenerating] = useState(false);
  const [mode, setMode] = useState('auto');      // auto|animated|chart|image|video
  const [video, setVideo] = useState(null);      // 동영상 URL
  const [videoStatus, setVideoStatus] = useState(null); // 진행 상태 텍스트
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [showGallery, setShowGallery] = useState(false); // 기본 접힘 — 채팅·미리보기·저장버튼을 바로 노출
  const [galCat, setGalCat] = useState('static');
  const [refImage, setRefImage] = useState(null);   // 참고 이미지(data URI, 클라이언트 다운스케일)
  const [cuts, setCuts] = useState(1);              // #4 여러 컷(캐러셀) 수
  const [frames, setFrames] = useState(null);       // 캐러셀 프레임 배열(design[])
  const [frameIdx, setFrameIdx] = useState(0);      // 현재 보는 컷
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  // 참고 이미지 업로드 → 최대 1024px JPEG로 다운스케일(전송량·비전 처리 최적화)
  const onPickImage = (e) => {
    const f = e.target.files && e.target.files[0]; if (e.target) e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) { setSaveMsg({ ok: false, text: '이미지 파일만 첨부할 수 있어요.' }); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 1024; let w = im.width, h = im.height;
        if (w > max || h > max) { const s = Math.min(max / w, max / h); w = Math.round(w * s); h = Math.round(h * s); }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        try { setRefImage(cv.toDataURL('image/jpeg', 0.85)); } catch { setRefImage(rd.result); }
      };
      im.onerror = () => setRefImage(rd.result);
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  };

  const gotoFrame = (idx) => {
    if (!frames || idx < 0 || idx >= frames.length) return;
    setFrameIdx(idx); setDesign(frames[idx]); setSvg(null); setImage(null); setVideo(null); setVideoStatus(null);
  };

  const selectSample = (s) => {
    setFrames(null); setFrameIdx(0);
    setDesign(s.design); setSvg(s.svg); setImage(null); setVideo(null); setVideoStatus(null); setSaveMsg(null);
    setMode(s.render_type === 'animated' ? 'animated' : s.render_type === 'chart' ? 'chart' : 'auto');
    setMessages([
      { role: 'assistant', content: `'${s.name}' 샘플을 불러왔어요. 오른쪽 미리보기를 확인하고, 자유롭게 수정 요청을 입력하세요. 예: "헤드라인을 우리 브랜드명으로", "색을 더 밝게", "CTA를 '무료 체험'으로"` },
    ]);
    setShowGallery(false);
  };

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, busy]);

  const send = async (text) => {
    const typed = (typeof text === 'string' ? text : input).trim();
    const att = refImage;
    const msg = typed || (att ? '첨부한 참고 이미지를 분석해서 이 스타일·색감·분위기로 광고를 만들어 줘.' : '');
    if (!msg || busy) return;
    const urlDetected = (typed.match(/https?:\/\/[^\s]+/i) || [])[0] || '';
    const userEntry = { role: 'user', content: msg, ...(att ? { image: att } : {}) };
    const conv = [...messages, userEntry];
    setMessages(conv); setInput(''); setRefImage(null); setBusy(true); setSvg(null); setImage(null); setVideo(null); setVideoStatus(null); setSaveMsg(null);
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-chat`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ messages: conv.map(m => ({ role: m.role, content: m.content })), design, cuts, ...(att ? { reference_image: att } : {}), ...(urlDetected ? { reference_url: urlDetected } : {}) }),
      });
      const d = await r.json();
      if (d.ok) {
        setMessages(m => [...m, { role: 'assistant', content: d.reply || '디자인을 만들었어요! 고급 비주얼로 렌더링 중이에요 ✨' }]);
        if (Array.isArray(d.frames) && d.frames.length > 1) {
          setFrames(d.frames); setFrameIdx(0); setDesign(d.frames[0]); setSvg(null); setImage(null); // 캐러셀: 컷별 그라데이션 프리뷰(빠름)
        } else if (d.design) {
          setFrames(null); setFrameIdx(0); setDesign(d.design); genVisual(d.design); // 단일: 실사/프리미엄 SVG 자동
        }
      } else setMessages(m => [...m, { role: 'assistant', content: d.error || 'AI 응답에 실패했어요. 다시 시도해 주세요.' }]);
    } catch { setMessages(m => [...m, { role: 'assistant', content: '서버 오류가 발생했어요. 다시 시도해 주세요.' }]); }
    setBusy(false);
  };

  // 모드별 생성: auto(실사 or 프리미엄SVG) | animated | chart | image | video
  const genVisual = async (dz, m) => {
    const dd = dz || design;
    const mm = m || mode;
    if (!dd) return;
    if (mm === 'video') return genVideo(dd);
    if (mm === 'image' || (mm === 'auto' && dd.image_prompt)) {
      const ok = await genImage(dd);
      if (ok) return;
      if (mm === 'image') { setSaveMsg({ ok: false, text: '실사 이미지 생성이 아직 설정되지 않았어요(관리자 설정에서 이미지 API 키 등록). 프리미엄 벡터로 표시할게요.' }); }
    }
    renderSvg(dd, (mm === 'animated' || mm === 'chart') ? mm : 'svg');
  };

  const genImage = async (dd) => {
    if (!dd?.image_prompt) return false;
    setImgGenerating(true); setVideo(null); setVideoStatus(null);
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-image`, { method: 'POST', headers: auth(), body: JSON.stringify({ prompt: dd.image_prompt, ratio: dd.ratio }) });
      const j = await r.json();
      if (j.ok && j.image) { setImage(j.image); setSvg(null); setImgGenerating(false); return true; }
    } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ }
    setImgGenerating(false); return false;
  };

  const renderSvg = async (dz, renderType) => {
    const dd = dz || design;
    if (!dd) return;
    setRendering(true); setVideo(null); setVideoStatus(null);
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-render`, { method: 'POST', headers: auth(), body: JSON.stringify({ product_description: dd.body || dd.headline || '', design: dd, render_type: renderType || 'svg' }) });
      const d = await r.json();
      if (d.ok && d.svg) { setSvg(d.svg); setImage(null); }
    } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ }
    setRendering(false);
  };

  const genVideo = async (dd) => {
    setVideoStatus('동영상 생성 요청 중…'); setVideo(null); setSvg(null); setImage(null);
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-video`, { method: 'POST', headers: auth(), body: JSON.stringify({ prompt: dd.image_prompt || dd.body || dd.headline || '', ratio: dd.ratio }) });
      const j = await r.json();
      if (j.configured === false) { setVideoStatus(null); setSaveMsg({ ok: false, text: '동영상 생성이 아직 설정되지 않았어요. 관리자 설정에서 동영상 API 키를 등록하세요.' }); return; }
      if (!j.ok || !j.job_id) { setVideoStatus(null); setSaveMsg({ ok: false, text: j.error || '동영상 생성 실패' }); return; }
      pollVideo(j.job_id, 0);
    } catch { setVideoStatus(null); setSaveMsg({ ok: false, text: '동영상 생성 오류' }); }
  };

  const pollVideo = async (jobId, tries) => {
    if (tries > 72) { setVideoStatus('시간이 초과되었어요. 다시 시도해 주세요.'); return; }
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-video-status?job_id=${encodeURIComponent(jobId)}`, { headers: auth() });
      const j = await r.json();
      if (j.ok && j.status === 'succeeded' && j.video_url) { setVideo(j.video_url); setVideoStatus(null); return; }
      if (j.status === 'failed' || j.status === 'canceled') { setVideoStatus('동영상 생성에 실패했어요. 다시 시도해 주세요.'); return; }
      setVideoStatus(`🎥 동영상 생성 중… (${tries * 5}초 경과 · 보통 1~3분)`);
      setTimeout(() => pollVideo(jobId, tries + 1), 5000);
    } catch { setTimeout(() => pollVideo(jobId, tries + 1), 5000); }
  };

  const save = async (status) => {
    if (!design) return;
    setSaving(true); setSaveMsg(null);
    try {
      const visualType = video ? 'video' : (image ? 'image' : (frames ? 'carousel' : 'svg'));
      // [Track B] SVG 마크업 → PNG 클라 래스터화(매체 이미지 업로드용). video/image 는 우선순위 보존(비-SVG passthrough).
      const svgRaster = await svgToPngDataUrl(svg || '');
      const r = await fetch(`${API}/v422/ai/ad-design/save`, { method: 'POST', headers: auth(), body: JSON.stringify({ product_description: design.body || design.headline || '', category: design.mood || '', design: { ...design, _visual: visualType, ...(frames && frames.length > 1 ? { _frames: frames, _cut: frames.length } : {}) }, svg: video || image || svgRaster || '', status }) });
      const d = await r.json();
      setSaveMsg(d.ok ? { ok: true, text: d.message } : { ok: false, text: d.error || '저장 실패' });
      if (d.ok && status === 'approved' && onApplied) onApplied(d.id, design);
    } catch { setSaveMsg({ ok: false, text: '서버 오류. 다시 시도하세요.' }); }
    setSaving(false);
  };

  const inputStyle = { flex: 1, padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 14, outline: 'none' };
  const navBtn = (dis) => ({ width: 34, height: 34, borderRadius: '50%', border: '1px solid #cbd5e1', background: '#fff', color: dis ? '#cbd5e1' : '#4f46e5', fontSize: 20, cursor: dis ? 'not-allowed' : 'pointer', lineHeight: '30px', padding: 0 });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* 럭셔리 샘플 갤러리 */}
      <div style={{ borderRadius: 16, border: '1px solid var(--border,#e2e8f0)', background: 'var(--bg-card,#fff)', overflow: 'hidden' }}>
        <button onClick={() => setShowGallery(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', fontWeight: 900, fontSize: 14, color: '#1e293b' }}>
          <span>🎨 {t('aiChat.gallery', '럭셔리 샘플 갤러리')} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>— 선택 → 대화로 수정 → 저장</span></span>
          <span style={{ fontSize: 12, color: '#6366f1' }}>{showGallery ? '▲ 접기' : '▼ 펼치기'}</span>
        </button>
        {showGallery && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {SAMPLE_CATEGORIES.map(c => (
                <button key={c.cat} onClick={() => setGalCat(c.cat)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: galCat === c.cat ? 'linear-gradient(135deg,#a855f7,#4f8ef7)' : 'rgba(99,102,241,0.07)', color: galCat === c.cat ? '#fff' : '#64748b' }}>{catLabel(c.cat, c.label)}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
              {samples.filter(s => s.category === galCat).map(s => (
                <button key={s.id} onClick={() => selectSample(s)} title={s.name} style={{ padding: 0, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: '#fff' }}>
                  <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: sanitizeSvg(s.svg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"')) }} />
                  <div style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 채팅 + 미리보기 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
      {/* 채팅 */}
      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', height: 610, borderRadius: 16, border: '1px solid var(--border,#e2e8f0)', background: 'var(--bg-card,#fff)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border,#e2e8f0)', fontWeight: 900, fontSize: 14, color: '#1e293b', background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}>💬 {t('aiChat.title', '대화형 AI 디자인')}</div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.6,
              background: m.role === 'user' ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(99,102,241,0.07)',
              color: m.role === 'user' ? '#fff' : '#334155', borderBottomRightRadius: m.role === 'user' ? 4 : 14, borderBottomLeftRadius: m.role === 'user' ? 14 : 4 }}>
              {m.image && <img src={m.image} alt="참고" style={{ display: 'block', maxWidth: 170, maxHeight: 170, borderRadius: 10, marginBottom: m.content ? 7 : 0, border: '1px solid rgba(255,255,255,0.35)' }} />}
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
        <div style={{ padding: 12, borderTop: '1px solid var(--border,#e2e8f0)' }}>
          {refImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={refImage} alt="참고" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid #cbd5e1' }} />
                <button onClick={() => setRefImage(null)} title="참고 이미지 제거"
                  style={{ position: 'absolute', top: -7, right: -7, width: 21, height: 21, borderRadius: '50%', border: '2px solid #fff', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: '17px', cursor: 'pointer', padding: 0 }}>×</button>
              </div>
              <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>📎 {t('aiChat.refAttached', '참고 이미지 첨부됨 — AI가 이 스타일·색감을 참고해 디자인해요')}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy} title={t('aiChat.attachImage', '참고 이미지 업로드')}
              style={{ flexShrink: 0, padding: '0 15px', borderRadius: 12, border: '1px solid #cbd5e1', background: refImage ? 'rgba(168,85,247,0.1)' : '#fff', color: refImage ? '#a855f7' : '#64748b', fontSize: 20, cursor: busy ? 'not-allowed' : 'pointer' }}>📎</button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={refImage ? t('aiChat.placeholderRef', '참고 이미지로 만들 내용을 입력(비워도 됨)…') : t('aiChat.placeholder', '만들거나 수정할 내용을 입력… (예: 색을 더 밝게)')} style={inputStyle} disabled={busy} />
            <button onClick={() => send()} disabled={busy || (!input.trim() && !refImage)}
              style={{ flexShrink: 0, padding: '0 20px', borderRadius: 12, border: 'none', cursor: busy || (!input.trim() && !refImage) ? 'not-allowed' : 'pointer', background: busy || (!input.trim() && !refImage) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#a855f7,#4f8ef7)', color: '#fff', fontWeight: 800, fontSize: 14 }}>↑</button>
          </div>
        </div>
      </div>

      {/* 미리보기 + 저장 (반응형: 좁으면 채팅 아래로 wrap → 저장버튼 항상 노출) */}
      <div style={{ flex: '1 1 440px', maxWidth: 560, minWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 22, borderRadius: 16, border: '1px solid var(--border,#e2e8f0)', background: 'var(--bg-card,#fff)' }}>
        {/* 생성 모드 */}
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {[['auto', '✨ 자동'], ['animated', '🎬 애니메이션'], ['chart', '📊 그래프'], ['image', '🖼️ 실사'], ['video', '🎥 동영상']].map(([id, label]) => (
            <button key={id} onClick={() => { setMode(id); if (design) genVisual(design, id); }}
              style={{ padding: '6px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: mode === id ? 'linear-gradient(135deg,#a855f7,#4f8ef7)' : 'rgba(99,102,241,0.07)', color: mode === id ? '#fff' : '#64748b' }}>{label}</button>
          ))}
        </div>
        {/* #4 여러 컷(캐러셀) 수 선택 — 다음 생성부터 적용 */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>🎞️ {t('aiChat.cuts', '컷')}</span>
          {[1, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setCuts(n)} title={n === 1 ? t('aiChat.single', '단일 광고') : `${n}${t('aiChat.cutCarousel', '컷 캐러셀(넘겨보기)')}`}
              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: cuts === n ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'rgba(99,102,241,0.07)', color: cuts === n ? '#fff' : '#64748b' }}>{n === 1 ? t('aiChat.single', '단일') : n + t('aiChat.cutUnit', '컷')}</button>
          ))}
          {cuts > 1 && <span style={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>{t('aiChat.cutHint', `다음 생성부터 ${cuts}컷 캐러셀`).replace('{n}', cuts)}</span>}
        </div>
        {design && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{CHLABEL[design.channel] || design.channel || '광고'}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', fontWeight: 700 }}>{design.format || ''} {design.ratio || ''}</span>
          </div>
        )}
        {imgGenerating && <div style={{ fontSize: 11.5, color: '#a855f7', fontWeight: 700 }}>🖼️ 실사 이미지 생성 중… (10~20초)</div>}
        {videoStatus && <div style={{ fontSize: 11.5, color: '#db2777', fontWeight: 700 }}>{videoStatus}</div>}
        <Preview design={design} svg={svg} image={image} video={video} />
        {/* #4 캐러셀 컷 넘기기 내비게이션 */}
        {frames && frames.length > 1 && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => gotoFrame(frameIdx - 1)} disabled={frameIdx === 0} style={navBtn(frameIdx === 0)}>‹</button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {frames.map((_, i) => (
                <button key={i} onClick={() => gotoFrame(i)} title={`${i + 1}컷`}
                  style={{ width: i === frameIdx ? 22 : 8, height: 8, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0, background: i === frameIdx ? 'linear-gradient(135deg,#a855f7,#4f8ef7)' : 'rgba(99,102,241,0.25)', transition: 'all .2s' }} />
              ))}
            </div>
            <button onClick={() => gotoFrame(frameIdx + 1)} disabled={frameIdx === frames.length - 1} style={navBtn(frameIdx === frames.length - 1)}>›</button>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginLeft: 2 }}>{frameIdx + 1}/{frames.length}{t('aiChat.cutUnit', '컷')}</span>
          </div>
        )}
        {design && Array.isArray(design.hashtags) && design.hashtags.length > 0 && (
          <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {design.hashtags.slice(0, 4).map((h, k) => <span key={k} style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>{h}</span>)}
          </div>
        )}
        {design && (
          <>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => genVisual(design)} disabled={imgGenerating} style={{ padding: '10px 0', borderRadius: 10, border: '1px solid rgba(236,72,153,0.35)', cursor: imgGenerating ? 'wait' : 'pointer', background: 'rgba(236,72,153,0.07)', color: '#db2777', fontWeight: 700, fontSize: 12 }}>
                {imgGenerating ? '⏳ 생성 중…' : '🖼️ 실사 이미지 재생성'}
              </button>
              <button onClick={renderSvg} disabled={rendering} style={{ padding: '10px 0', borderRadius: 10, border: '1px solid rgba(168,85,247,0.35)', cursor: rendering ? 'wait' : 'pointer', background: 'rgba(168,85,247,0.07)', color: '#a855f7', fontWeight: 700, fontSize: 12 }}>
                {rendering ? '⏳ 렌더 중…' : '🎨 벡터(SVG)'}
              </button>
            </div>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => save('draft')} disabled={saving} style={{ padding: '10px 0', borderRadius: 10, border: '1px solid rgba(79,142,247,0.35)', cursor: saving ? 'wait' : 'pointer', background: 'rgba(79,142,247,0.07)', color: '#4f8ef7', fontWeight: 700, fontSize: 12.5 }}>📝 {t('aiChat.draft', '임시저장')}</button>
              <button onClick={() => save('approved')} disabled={saving} style={{ padding: '10px 0', borderRadius: 10, border: 'none', cursor: saving ? 'wait' : 'pointer', background: saving ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700, fontSize: 12.5 }}>✅ {t('aiChat.save', '저장')}</button>
            </div>
          </>
        )}
        {saveMsg && <div style={{ width: '100%', padding: '8px 11px', borderRadius: 9, fontSize: 11.5, fontWeight: 600, background: saveMsg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: saveMsg.ok ? '#16a34a' : '#dc2626' }}>{saveMsg.text}</div>}
      </div>
      </div>
    </div>
  );
}
