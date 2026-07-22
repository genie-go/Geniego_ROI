import React, { useState } from 'react';
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { svgToPngDataUrl } from '../utils/svgRasterize.js'; // [Track B] SVG→PNG 클라 래스터화(매체 이미지 업로드용)
import { sanitizeSvg } from '../utils/xssSanitizer.js'; // [282차 F-P1] 저장형 SVG XSS 차단
import AIDesignChat from './AIDesignChat.jsx'; // 196차 — 대화형 AI 디자인

/* 196차 — AI 디자인 스튜디오 (Phase 1)
 * 상품 설명 + 카테고리 + 채널 → 백엔드 Claude 가 채널별 광고 디자인 스펙 생성 →
 * 즉시 미리보기(스펙 합성 광고 목업) → 'AI 정밀 디자인'(Claude SVG 광고 생성) →
 * 피드백 수정 재생성 → 만족 시 '적용하기'(저장, 캠페인 자동화에서 활용). */

const API = '/api';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';
const authHeaders = () => {
  const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

const CHANNELS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', ratio: '9:16' },
  { id: 'meta', label: 'Meta', icon: '📘', ratio: '1:1' },
  { id: 'instagram', label: 'Instagram', icon: '📸', ratio: '4:5' },
  { id: 'kakao', label: 'Kakao', icon: '💬', ratio: '1:1' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', ratio: '16:9' },
];
const CATEGORIES = ['뷰티/화장품', '패션/의류', '식품/건강', '가전/디지털', '리빙/가구', '유아/출산', '스포츠/레저', '반려동물', '도서/문구', '여행/숙박', '금융/핀테크', '보험', '의료/헬스케어', '세무/회계', '법률/전문직', '기타서비스', '기타'];
const RBOX = { '9:16': { w: 176, h: 312 }, '1:1': { w: 256, h: 256 }, '4:5': { w: 240, h: 300 }, '16:9': { w: 320, h: 180 } };
const card = { background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 16, padding: 20 };

/* [현 차수] ★구독회원별 BYO 광고 디자인 생성 API 연동 패널 — 본인 이미지/동영상 생성 API 키를 등록.
   관리자 전역 설정과 별개로, 로그인한 구독회원이 자기 계정에 직접 연동(없으면 전역 폴백). 데모 미노출. */
function CreativeApiConnect() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(null);
  const [img, setImg] = useState({ provider: 'openai', key: '' });
  const [vid, setVid] = useState({ provider: 'replicate', key: '', model: '' });
  const [saving, setSaving] = useState(false);
  const [m, setM] = useState(null);
  const refresh = () => fetch(`${API}/v422/ai/creative-api`, { headers: authHeaders() }).then(r => r.json()).then(d => {
    if (d?.ok) { setSt(d); setImg(i => ({ ...i, provider: d.img?.provider || 'openai' })); setVid(v => ({ ...v, provider: d.video?.provider || 'replicate', model: d.video?.model || '' })); }
  }).catch(() => {});
  React.useEffect(() => { if (!IS_DEMO) refresh(); }, []);
  const save = async () => {
    setSaving(true); setM(null);
    try {
      const r = await fetch(`${API}/v422/ai/creative-api`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ img_provider: img.provider, img_key: img.key, video_provider: vid.provider, video_key: vid.key, video_model: vid.model }) });
      const j = await r.json();
      if (j.ok) { setM({ ok: true, text: t('aiDesign.apiSaved', '✅ 저장되었습니다. 이제 본인 API로 초엔터프라이즈급 광고 크리에이티브가 생성됩니다.') }); setImg(i => ({ ...i, key: '' })); setVid(v => ({ ...v, key: '' })); refresh(); }
      else setM({ ok: false, text: j.error || t('aiDesign.apiSaveFail', '저장에 실패했습니다.') });
    } catch (e) { setM({ ok: false, text: t('aiDesign.serverErr', '서버 오류. 다시 시도하세요.') }); }
    setSaving(false);
  };
  if (IS_DEMO) return null;
  const imgOn = st?.img?.configured, vidOn = st?.video?.configured;
  const inp = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 12.5, outline: 'none' };
  const lab = { fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 5 };
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', borderColor: 'rgba(99,102,241,0.22)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 18px', border: 'none', background: 'linear-gradient(135deg,#0b1224,#1e1b4b)', color: '#fff', cursor: 'pointer' }}>
        <span style={{ fontSize: 13.5, fontWeight: 800 }}>🔌 {t('aiDesign.apiConnectTitle', '내 광고 디자인 생성 API 연동')} <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>({t('aiDesign.optional', '선택')})</span></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: imgOn ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.2)', color: imgOn ? '#4ade80' : '#cbd5e1' }}>이미지 {imgOn ? '연동됨' : '미연동'}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: vidOn ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.2)', color: vidOn ? '#4ade80' : '#cbd5e1' }}>동영상 {vidOn ? '연동됨' : '미연동'}</span>
          <span style={{ fontSize: 16, color: '#a5b4fc' }}>{open ? '▴' : '▾'}</span>
        </span>
      </button>
      {open && (
        <div style={{ padding: 18, background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)' }}>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>{t('aiDesign.apiConnectDesc', '본인이 가입한 이미지/동영상 생성 API(OpenAI·Stability·Replicate 등) 키를 등록하면, 실사 이미지·애니메이션 광고를 본인 계정·본인 비용으로 무제한 생성합니다. 키는 AES-256 암호화 저장됩니다. 미등록 시 플랫폼 기본(전역) 설정을 사용합니다.')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 9 }}>🖼️ {t('aiDesign.imgApi', '실사 이미지 생성 API')}</div>
              <label style={lab}>{t('aiDesign.provider', '제공자')}</label>
              <select value={img.provider} onChange={e => setImg(i => ({ ...i, provider: e.target.value }))} style={{ ...inp, cursor: 'pointer', marginBottom: 9 }}>
                <option value="openai">OpenAI (DALL·E / gpt-image)</option>
                <option value="stability">Stability AI</option>
              </select>
              <label style={lab}>{t('aiDesign.apiKey', 'API 키')} {imgOn && <span style={{ color: '#16a34a' }}>· {t('aiDesign.keep', '등록됨(공란=유지)')}</span>}</label>
              <input type="password" value={img.key} onChange={e => setImg(i => ({ ...i, key: e.target.value }))} placeholder={imgOn ? '••••••••  (변경 시에만 입력)' : 'sk-...'} style={inp} autoComplete="off" />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 9 }}>🎬 {t('aiDesign.videoApi', 'AI 동영상/애니메이션 생성 API')}</div>
              <label style={lab}>{t('aiDesign.provider', '제공자')}</label>
              <select value={vid.provider} onChange={e => setVid(v => ({ ...v, provider: e.target.value }))} style={{ ...inp, cursor: 'pointer', marginBottom: 9 }}>
                <option value="replicate">Replicate</option>
              </select>
              <label style={lab}>{t('aiDesign.modelOpt', '모델 (선택)')}</label>
              <input value={vid.model} onChange={e => setVid(v => ({ ...v, model: e.target.value }))} placeholder="예: minimax/video-01" style={{ ...inp, marginBottom: 9 }} />
              <label style={lab}>{t('aiDesign.apiKey', 'API 키')} {vidOn && <span style={{ color: '#16a34a' }}>· {t('aiDesign.keep', '등록됨(공란=유지)')}</span>}</label>
              <input type="password" value={vid.key} onChange={e => setVid(v => ({ ...v, key: e.target.value }))} placeholder={vidOn ? '••••••••  (변경 시에만 입력)' : 'r8_...'} style={inp} autoComplete="off" />
            </div>
          </div>
          <button onClick={save} disabled={saving} style={{ marginTop: 14, padding: '11px 22px', borderRadius: 10, border: 'none', cursor: saving ? 'wait' : 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 13 }}>{saving ? '저장 중…' : '💾 ' + t('aiDesign.apiSave', 'API 연동 저장')}</button>
          {m && <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 700, color: m.ok ? '#16a34a' : '#dc2626' }}>{m.text}</span>}
        </div>
      )}
    </div>
  );
}

export default function AIDesignStudio({ onApplied }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('chat'); // 'chat' 대화형(기본) | 'form' 양식
  const [product, setProduct] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [channels, setChannels] = useState(['tiktok', 'meta', 'instagram']);
  const [designs, setDesigns] = useState([]);
  const [svgs, setSvgs] = useState({});       // channel -> { svg, loading, err }
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [msg, setMsg] = useState(null);        // { type:'ok'|'err'|'info', text }
  const [source, setSource] = useState('');

  const toggleCh = (id) => setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const generate = async (fb = '') => {
    if (!product.trim()) { setMsg({ type: 'err', text: t('aiDesign.needProduct', '상품 설명을 입력하세요.') }); return; }
    if (!channels.length) { setMsg({ type: 'err', text: t('aiDesign.needChannel', '채널을 1개 이상 선택하세요.') }); return; }
    setLoading(true); setMsg(null); setSvgs({});
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-design`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ product_description: product, category, channels, feedback: fb }) });
      const d = await r.json();
      if (d.ok && Array.isArray(d.designs)) { setDesigns(d.designs); setSource(d.data_source || ''); if (fb) setMsg({ type: 'ok', text: t('aiDesign.reGenerated', '피드백을 반영해 다시 생성했습니다.') }); }
      else setMsg({ type: 'err', text: d.error || t('aiDesign.genFail', 'AI 디자인 생성에 실패했습니다.') });
    } catch (e) { setMsg({ type: 'err', text: t('aiDesign.serverErr', '서버 오류. 다시 시도하세요.') }); }
    setLoading(false);
  };

  const renderSvg = async (d) => {
    setSvgs((s) => ({ ...s, [d.channel]: { loading: true } }));
    try {
      const r = await fetch(`${API}/v422/ai/campaign-ad-render`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ product_description: product, design: d, feedback }) });
      const j = await r.json();
      if (j.ok && j.svg) setSvgs((s) => ({ ...s, [d.channel]: { svg: j.svg, loading: false } }));
      else setSvgs((s) => ({ ...s, [d.channel]: { loading: false, err: true } }));
    } catch (e) { setSvgs((s) => ({ ...s, [d.channel]: { loading: false, err: true } })); }
  };

  const apply = async (d) => {
    try {
      // [Track B] SVG 마크업 → PNG 클라이언트 래스터화 → 매체(Meta /adimages 등) 이미지 업로드 가능.
      //   서버 래스터화 도구 부재 우회. 비-SVG(이미 래스터/빈값)는 passthrough, 실패 시 원본(링크 폴백).
      const raster = await svgToPngDataUrl(svgs[d.channel]?.svg || '');
      const r = await fetch(`${API}/v422/ai/ad-design/save`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ product_description: product, category, design: d, svg: raster }) });
      const j = await r.json();
      setMsg(j.ok ? { type: 'ok', text: `✅ ${(d.channel || '').toUpperCase()} ${t('aiDesign.applied', '디자인이 적용되었습니다 — 캠페인 자동화에서 활용할 수 있습니다.')}` } : { type: 'err', text: j.error || t('aiDesign.applyFail', '적용에 실패했습니다.') });
      if (j.ok && typeof onApplied === 'function') onApplied(j.id, d);
    } catch (e) { setMsg({ type: 'err', text: t('aiDesign.serverErr', '서버 오류. 다시 시도하세요.') }); }
  };

  const Preview = ({ d }) => {
    const box = RBOX[d.ratio] || RBOX['1:1'];
    const p = d.palette || {};
    const sv = svgs[d.channel];
    if (sv?.svg) {
      const svgHtml = sanitizeSvg(sv.svg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"'));
      return <div style={{ width: box.w, height: box.h, borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 34px rgba(15,23,42,0.22)', background: '#fff' }} dangerouslySetInnerHTML={{ __html: svgHtml }} />;
    }
    return (
      <div style={{ width: box.w, height: box.h, borderRadius: 14, overflow: 'hidden', position: 'relative', boxShadow: '0 10px 34px rgba(15,23,42,0.2)', background: `linear-gradient(148deg, ${p.bg || '#0f172a'} 0%, ${p.primary || '#4f8ef7'} 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16 }}>
        <div style={{ position: 'absolute', top: -34, right: -34, width: 130, height: 130, borderRadius: '50%', background: p.accent || '#22d3ee', opacity: 0.28 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: box.w > 230 ? 23 : 18, fontWeight: 900, color: p.text || '#fff', lineHeight: 1.18, wordBreak: 'keep-all' }}>{d.headline}</div>
          {d.subheadline && <div style={{ fontSize: 12.5, color: p.text || '#fff', opacity: 0.86, marginTop: 7 }}>{d.subheadline}</div>}
        </div>
        <div style={{ position: 'relative' }}>
          {d.body && <div style={{ fontSize: 11, color: p.text || '#fff', opacity: 0.82, marginBottom: 10, lineHeight: 1.5 }}>{String(d.body).slice(0, 64)}</div>}
          <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 99, background: p.accent || '#22d3ee', color: p.bg || '#0f172a', fontWeight: 700, fontSize: 12.5 }}>{d.cta || '지금 보기'}</div>
        </div>
      </div>
    );
  };

  const chMeta = (id) => CHANNELS.find((c) => c.id === id) || { label: id, icon: '📐' };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* [현 차수] 구독회원별 BYO 광고 디자인 생성 API 연동 */}
      <CreativeApiConnect />
      {/* 모드 토글: 대화형(기본) / 양식 */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', width: 'fit-content' }}>
        {[['chat', '💬 ' + t('aiDesign.modeChat', '대화형')], ['form', '📝 ' + t('aiDesign.modeForm', '양식 입력')]].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, background: mode === id ? 'linear-gradient(135deg,#a855f7,#4f8ef7)' : 'transparent', color: mode === id ? '#fff' : '#64748b' }}>{label}</button>
        ))}
      </div>

      {mode === 'chat' && <AIDesignChat onApplied={onApplied} />}

      {mode === 'form' && <>
      {/* 입력 패널 */}
      <div style={{ ...card, background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', borderColor: 'rgba(99,102,241,0.2)' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>✨ {t('aiDesign.title', 'AI 광고 디자인 스튜디오')}</div>
        <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{t('aiDesign.desc', '상품 설명과 카테고리·채널을 입력하면 AI가 채널별 최적 광고 디자인을 생성합니다. 미리보기로 확인하고 마음에 들 때까지 수정 후 적용하세요.')}</div>

        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{t('aiDesign.productLabel', '상품 설명 *')}</label>
        <textarea value={product} onChange={(e) => setProduct(e.target.value)} rows={3}
          placeholder={t('aiDesign.productPh', '예: 7일 만에 잔주름 개선, 저자극 비건 레티놀 세럼. 30대 여성 타깃, 프리미엄·신뢰감 강조')}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '11px 13px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 13, resize: 'vertical', outline: 'none' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{t('aiDesign.categoryLabel', '카테고리')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 13, cursor: 'pointer' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{t('aiDesign.channelLabel', '채널 (복수 선택)')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {CHANNELS.map((c) => {
                const on = channels.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggleCh(c.id)}
                    style={{ padding: '7px 12px', borderRadius: 9, border: `1.5px solid ${on ? '#6366f1' : '#cbd5e1'}`, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: on ? 'rgba(99,102,241,0.1)' : '#fff', color: on ? '#4f46e5' : '#64748b' }}>
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={() => generate('')} disabled={loading}
          style={{ width: '100%', marginTop: 16, padding: '13px 0', borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#a855f7,#4f8ef7)', color: '#fff', fontWeight: 800, fontSize: 14.5 }}>
          {loading ? `⏳ ${t('aiDesign.generating', 'AI가 디자인 생성 중…')}` : `✨ ${t('aiDesign.generate', 'AI 광고 디자인 생성')}`}
        </button>
        {msg && <div style={{ marginTop: 10, padding: '9px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : msg.type === 'err' ? 'rgba(239,68,68,0.08)' : 'rgba(79,142,247,0.08)', color: msg.type === 'ok' ? '#16a34a' : msg.type === 'err' ? '#dc2626' : '#4f8ef7' }}>{msg.text}</div>}
      </div>

      {/* 결과 + 수정 */}
      {designs.length > 0 && (
        <>
          <div style={{ ...card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>🔁 {t('aiDesign.refineTitle', '수정 요청 (선택)')}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('aiDesign.refineDesc', '원하는 방향을 입력하고 재생성하세요. 예: 더 역동적으로, 컬러를 따뜻하게, 가격 강조')}</span>
              {source === 'fallback' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#d97706', fontWeight: 700 }}>{t('aiDesign.fallback', '기본 템플릿(AI 일시 미연결)')}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t('aiDesign.refinePh', '수정 요청 입력…')}
                style={{ flex: 1, padding: '10px 13px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 13, outline: 'none' }} />
              <button onClick={() => generate(feedback)} disabled={loading}
                style={{ padding: '10px 18px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>🔁 {t('aiDesign.reGenerate', '수정 재생성')}</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {designs.map((d, i) => {
              const cm = chMeta(d.channel);
              const sv = svgs[d.channel];
              return (
                <div key={d.channel + i} style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{cm.icon} {cm.label}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', fontWeight: 700 }}>{d.format} · {d.ratio}</span>
                  </div>
                  <Preview d={d} />
                  {Array.isArray(d.hashtags) && d.hashtags.length > 0 && (
                    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {d.hashtags.slice(0, 4).map((h, k) => <span key={k} style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>{h}</span>)}
                    </div>
                  )}
                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button onClick={() => renderSvg(d)} disabled={sv?.loading}
                      style={{ padding: '9px 0', borderRadius: 9, border: '1px solid rgba(168,85,247,0.35)', cursor: sv?.loading ? 'wait' : 'pointer', background: 'rgba(168,85,247,0.07)', color: '#a855f7', fontWeight: 700, fontSize: 12 }}>
                      {sv?.loading ? `⏳ ${t('aiDesign.rendering', '디자인 중…')}` : `🎨 ${t('aiDesign.aiRender', 'AI 정밀 디자인')}`}
                    </button>
                    <button onClick={() => apply(d)}
                      style={{ padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700, fontSize: 12 }}>
                      ✅ {t('aiDesign.apply', '적용하기')}
                    </button>
                  </div>
                  {sv?.err && <div style={{ fontSize: 11, color: '#dc2626' }}>{t('aiDesign.renderErr', '정밀 디자인 생성 실패 — 다시 시도하세요.')}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
      </>}
    </div>
  );
}
