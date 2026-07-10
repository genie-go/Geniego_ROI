import React, { useState, useMemo, useEffect, useCallback } from "react";
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js";
import { IS_DEMO } from '../utils/demoEnv';
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';
import { useI18n } from '../i18n';
import AIDesignStudio from '../components/AIDesignStudio.jsx'; // 196차 — AI 광고 디자인 스튜디오

/* 197차 — 운영/데모 데이터 격리 (U-177-A: 운영에 mock/가상 데이터 유입 절대 금지).
 *  - 데모(IS_DEMO): 아래 DEMO_* 풍부한 가상 데이터로 체험감 제공.
 *  - 운영: 실제 저장 소재(GET /v422/ai/ad-design/list, 테넌트 격리)만 표시. 없으면 정직한 빈 상태.
 *  과거: GALLERY_ITEMS/BRAND_ASSETS/하드코딩 KPI가 _isDemo 게이트 없이 운영에도 그대로 노출되던 결함을 제거. */

/* ── Demo 전용 가상 데이터 (운영 미노출) ─────────────── */
const DEMO_GALLERY = [
  { id:'G1', name:'Summer UV Campaign', format:'carousel', platform:'Meta', status:'approved', ctr:4.2, conv:312, date:'2026-04-15', periodStart:'2026-05-01', periodEnd:'2026-05-31', animation:'fadeIn' },
  { id:'G2', name:'Spring Lookbook', format:'video', platform:'Instagram', status:'approved', ctr:5.1, conv:287, date:'2026-04-12', periodStart:'2026-04-20', periodEnd:'2026-05-20', animation:'slideUp' },
  { id:'G3', name:'Flash Sale Banner', format:'banner', platform:'Google', status:'review', ctr:3.8, conv:198, date:'2026-04-10', periodStart:'2026-04-25', periodEnd:'2026-04-27', animation:'pulse' },
  { id:'G4', name:'TikTok Challenge', format:'short', platform:'TikTok', status:'approved', ctr:6.3, conv:456, date:'2026-04-08', periodStart:'2026-05-01', periodEnd:'2026-06-30', animation:'zoomIn' },
  { id:'G5', name:'Retargeting DPA', format:'DPA', platform:'Meta', status:'active', ctr:2.9, conv:523, date:'2026-04-05', periodStart:'2026-04-10', periodEnd:'2026-07-10', animation:'shine' },
  { id:'G6', name:'YouTube Bumper Promo', format:'short', platform:'YouTube', status:'approved', ctr:4.7, conv:341, date:'2026-04-02', periodStart:'2026-05-05', periodEnd:'2026-05-19', animation:'float' },
];
_dloc(DEMO_GALLERY);
const DEMO_ASSETS = [
  { id:'BA1', name:'Primary Logo', type:'SVG', size:'24KB', updated:'2026-04-20' },
  { id:'BA2', name:'Brand Guidelines', type:'PDF', size:'4.2MB', updated:'2026-04-18' },
  { id:'BA3', name:'Color Palette', type:'JSON', size:'2KB', updated:'2026-04-15' },
  { id:'BA4', name:'Typography Set', type:'WOFF2', size:'180KB', updated:'2026-04-10' },
  { id:'BA5', name:'Product Photos', type:'ZIP', size:'45MB', updated:'2026-04-08' },
];
_dloc(DEMO_ASSETS);

const card = { background:"rgba(255,255,255,0.85)", border:"1px solid rgba(0,0,0,0.08)", borderRadius:16, padding:24, backdropFilter:"blur(16px)", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" };

/* [현 차수] 채널별 광고물 구분 — AI디자인 플랫폼 id/표시명을 매체 패밀리로 묶어 필터링.
 *  저장된 ad_design.channel(플랫폼 id) 또는 데모 platform 표시명 모두 매칭. */
const CHANNEL_FAMILIES = [
  { id:'youtube',   label:'YouTube',   icon:'▶️', match:/youtube|유튜브/i },
  { id:'meta',      label:'Meta/FB',   icon:'📘', match:/meta|facebook|(^|[^a-z])fb([^a-z]|$)/i },
  { id:'instagram', label:'Instagram', icon:'📸', match:/instagram|insta|(^|[^a-z])ig([^a-z]|$)/i },
  { id:'tiktok',    label:'TikTok',    icon:'🎵', match:/tiktok|틱톡/i },
  { id:'kakao',     label:'Kakao',     icon:'💬', match:/kakao|카카오/i },
  { id:'naver',     label:'Naver',     icon:'🟢', match:/naver|네이버/i },
  { id:'google',    label:'Google/Display', icon:'🌐', match:/google|gdn|display|landing|popup|banner/i },
];
const familyOf = (platform) => {
  const p = String(platform || '');
  const f = CHANNEL_FAMILIES.find(x => x.match.test(p));
  return f ? f.id : 'etc';
};

/* [현 차수] 저장 광고물 CSS 모션 애니메이션 — AiDesignEngine 과 동일 정의(keyframes=styles.css ad*). */
const ANIM_CSS = {
  fadeIn:  { css: 'adFadeIn 1.2s ease both', label: '페이드 인' },
  slideUp: { css: 'adSlideUp 0.9s cubic-bezier(.2,.8,.2,1) both', label: '슬라이드 업' },
  zoomIn:  { css: 'adZoomIn 0.9s ease both', label: '줌 인' },
  pulse:   { css: 'adPulse 1.8s ease-in-out infinite', label: '펄스' },
  float:   { css: 'adFloat 2.8s ease-in-out infinite', label: '플로팅' },
  shine:   { css: 'adShine 2.2s ease-in-out infinite', label: '샤인' },
};
_dloc(ANIM_CSS);

export default function CreativeStudioTab({ sourcePage, onUseCampaign }) {
  const { t } = useI18n();
  // [259차] 브랜드 에셋 업로드 실배선(과거 죽은 버튼). 데모=시드, 운영=테넌트 스코프 실 저장(/creatives/brand-assets).
  const [brandAssets, setBrandAssets] = useState([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const loadBrandAssets = useCallback(() => {
    if (IS_DEMO) { setBrandAssets(DEMO_ASSETS); return; }
    getJsonAuth('/api/creatives/brand-assets/list').then(d => { if (Array.isArray(d?.assets)) setBrandAssets(d.assets); }).catch(() => {});
  }, []);
  useEffect(() => { loadBrandAssets(); }, [loadBrandAssets]);
  const onUploadAsset = useCallback((file) => {
    if (!file || IS_DEMO) return; // 데모는 시드 유지(운영 오염 방지)
    if (file.size > 5 * 1024 * 1024) { alert(t('marketing.csAssetTooLarge', '5MB 이하 파일만 업로드할 수 있습니다.')); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingAsset(true);
      const ext = (file.name.split('.').pop() || '').toUpperCase().slice(0, 8);
      const size = file.size < 1024 ? file.size + 'B' : file.size < 1048576 ? Math.round(file.size / 1024) + 'KB' : (file.size / 1048576).toFixed(1) + 'MB';
      try {
        const r = await postJsonAuth('/api/creatives/brand-assets/save', { name: file.name, type: ext, size, data_url: String(reader.result || '') });
        if (r?.ok) loadBrandAssets(); else alert(t('marketing.csUploadFail', '업로드에 실패했습니다.'));
      } catch { alert(t('marketing.csUploadFail', '업로드에 실패했습니다.')); }
      finally { setUploadingAsset(false); }
    };
    reader.readAsDataURL(file);
  }, [loadBrandAssets, t]);
  const assetAction = useCallback(async (asset, mode) => {
    if (IS_DEMO || !asset?.id) { alert(t('marketing.csDemoAsset', '데모 샘플 에셋입니다(실 파일 없음).')); return; }
    try {
      const d = await getJsonAuth(`/api/creatives/brand-assets/item/${asset.id}`);
      const url = d?.asset?.data_url;
      if (!url) { alert(t('marketing.csAssetMissing', '에셋 데이터를 찾을 수 없습니다.')); return; }
      if (mode === 'preview') { window.open(url, '_blank'); }
      else { const a = document.createElement('a'); a.href = url; a.download = asset.name || 'asset'; a.click(); }
    } catch { alert(t('marketing.csDownloadFail', '다운로드에 실패했습니다.')); }
  }, [t]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all'); // [현 차수] 채널별 광고물 필터
  // 운영: 실제 저장 소재. null=로딩전, []=없음
  const [realDesigns, setRealDesigns] = useState(IS_DEMO ? [] : null);

  /* Arctic White Theme Detection */
  const [isLight, setIsLight] = useState(() => {
    const th = document.documentElement.getAttribute('data-theme');
    return th === 'arctic_white' || th === 'pearl_office';
  });
  React.useEffect(() => {
    const check = () => {
      const th = document.documentElement.getAttribute('data-theme');
      setIsLight(th === 'arctic_white' || th === 'pearl_office');
    };
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    check();
    return () => obs.disconnect();
  }, []);

  // [237차 Creative AI Studio] 대량 변형 생성 + Creative Insights 상태.
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ product: '', category: '', channel: 'meta_feed', count: 3, with_image: false, image_count: 1, ratios: [] });
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchMsg, setBatchMsg] = useState(null);
  const [insights, setInsights] = useState(null);     // null=로딩전
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [cockpit, setCockpit] = useState(null);       // [245차 P1-2] 크리에이티브 코크핏

  /* 운영: 실제 저장 소재 로드(테넌트 격리). 데모는 mock 유지 → fetch 안 함. 배치 생성 후 재호출. */
  const loadDesigns = useCallback(async () => {
    if (IS_DEMO) return;
    try {
      const d = await getJsonAuth('/api/v422/ai/ad-design/list');
      const rows = Array.isArray(d?.designs) ? d.designs : [];
      setRealDesigns(rows.map(r => {
        const spec = r.design || {};
        return {
          id: 'AD' + r.id,
          name: r.product || spec.headline || r.category || ('Creative #' + r.id),
          format: spec.format || r.channel || '',
          platform: r.channel || spec.channel || '—',
          status: r.status === 'approved' ? 'approved' : (r.status === 'draft' ? 'draft' : 'review'),
          ctr: null, conv: null,                 // 성과는 광고 채널 연동 후 (가짜 수치 금지)
          date: String(r.created_at || '').slice(0, 10),
          periodStart: r.period_start || null,
          periodEnd: r.period_end || null,
          animation: spec.animation || '',
          // [237차] 영상 소재 지원 — ad_design.svg 에 영상 URL(AIDesignChat 가 video||image||svg 저장)이 담기면
          //   data:image/<svg 가 아니므로 갤러리 미리보기가 공백이었다. http(s) URL=영상으로 인지해 <video> 렌더.
          img: /^data:image\//.test(String(r.svg || '')) ? r.svg : '',
          svg: typeof r.svg === 'string' && r.svg.indexOf('<svg') === 0 ? r.svg : '',
          video: (typeof r.svg === 'string' && /^https?:\/\//.test(r.svg) && !/^data:image\//.test(r.svg)) ? r.svg : '',
        };
      }));
    } catch (_) { setRealDesigns([]); }
  }, []);
  useEffect(() => { loadDesigns(); }, [loadDesigns]);

  /* [237차] AI 대량 변형 생성 → ad_design draft N건 → 갤러리 새로고침. */
  const runBatch = useCallback(async () => {
    if (batchBusy) return;
    if (!batchForm.product.trim() && !batchForm.category.trim()) { setBatchMsg({ err: true, text: t('marketing.csBatchNeedInput', '상품 또는 카테고리를 입력하세요.') }); return; }
    setBatchBusy(true); setBatchMsg(null);
    try {
      const r = await postJsonAuth('/api/v422/ai/studio/batch', {
        product: batchForm.product, category: batchForm.category, channel: batchForm.channel,
        count: Math.max(1, Math.min(8, +batchForm.count || 3)), with_image: !!batchForm.with_image,
        image_count: Math.max(1, Math.min(4, +batchForm.image_count || 1)), // [①] 조합형 DCO 이미지 종수
        ratios: Array.isArray(batchForm.ratios) ? batchForm.ratios : [],     // [①-3] 멀티 종횡비(플레이스먼트)
      });
      if (r?.ok) {
        setBatchMsg({ err: false, text: (r.note || (t('marketing.csBatchDone', '대량 변형 생성 완료') + ': ' + (r.generated || 0))) });
        setRealDesigns(null); await loadDesigns();  // 갤러리 즉시 반영
      } else {
        setBatchMsg({ err: true, text: r?.error || t('marketing.csBatchFail', '생성 실패') });
      }
    } catch (e) {
      setBatchMsg({ err: true, text: String(e?.message || e).slice(0, 160) });
    } finally { setBatchBusy(false); }
  }, [batchBusy, batchForm, loadDesigns, t]);

  /* [237차] Creative Insights 로드(성과 탭). 집행 전이면 measured 0(정직 빈상태). */
  const loadInsights = useCallback(async () => {
    if (IS_DEMO) return;
    setInsightsLoading(true);
    try { const r = await getJsonAuth('/api/v422/ai/studio/insights?days=30'); setInsights(r?.ok ? r : { designs: [], winners: [], losers: [], measured: 0, total: 0 }); }
    catch (_) { setInsights({ designs: [], winners: [], losers: [], measured: 0, total: 0 }); }
    finally { setInsightsLoading(false); }
  }, []);
  // [245차 P1-2] 코크핏 로드(피로도·스코어·신뢰도·차원분석). insights 와 동반.
  const loadCockpit = useCallback(async () => {
    if (IS_DEMO) return;
    try { const r = await getJsonAuth('/api/v422/ai/studio/cockpit?days=14'); setCockpit(r?.ok ? r : { designs: [], by_channel: [], by_format: [], by_angle: [], need_refresh: [], summary: {} }); }
    catch (_) { setCockpit({ designs: [], by_channel: [], by_format: [], by_angle: [], need_refresh: [], summary: {} }); }
  }, []);
  useEffect(() => { if (!IS_DEMO && activeTab === 2 && insights === null) loadInsights(); }, [activeTab, insights, loadInsights]);
  useEffect(() => { if (!IS_DEMO && activeTab === 2 && cockpit === null) loadCockpit(); }, [activeTab, cockpit, loadCockpit]);

  // [276차] realDesigns falsy 시 매 렌더 새 [] → gallery 소비 useMemo(KPI·filteredGallery) 매 렌더 재계산.
  //   루프는 아니나(useMemo=fetch/재렌더 유발 안 함) 불필요 재계산 방지로 참조 안정화.
  const gallery = useMemo(() => IS_DEMO ? DEMO_GALLERY : (realDesigns || []), [realDesigns]);
  const loadingReal = !IS_DEMO && realDesigns === null;

  /* ── Format label map ─────────────────────────────── */
  const fmtLabel = (key) => {
    const map = {
      carousel: t('marketing.csFmtCarousel','카루셀'),
      video: t('marketing.csFmtVideo','동영상'),
      banner: t('marketing.csFmtBanner','배너'),
      short: t('marketing.csFmtShort','숏폼'),
      DPA: 'DPA',
    };
    return map[key] || key || '—';
  };

  const tabs = [
    { label: t('marketing.csTabGallery','갤러리'), icon:'🖼', color:'#4f8ef7' },
    { label: t('marketing.csTabCreateNew','새로 만들기'), icon:'✨', color:'#a855f7' },
    { label: t('marketing.csTabPerformance','성과 분석'), icon:'📊', color:'#22c55e' },
    { label: t('marketing.csTabBrandAssets','브랜드 에셋'), icon:'🎨', color:'#f97316' },
  ];

  // KPI: 데모=가상, 운영=실제 저장 소재에서 산출(없으면 0 / 미측정은 '—')
  const kpis = useMemo(() => {
    if (IS_DEMO) return [
      { emoji:"🎬", label:t('marketing.csKpiCreatives','소재'), val:156, delta:'+12', color:'#4f8ef7' },
      { emoji:"📱", label:t('marketing.csKpiFormats','포맷'), val:12, delta:'+2', color:'#a855f7' },
      { emoji:"✅", label:t('marketing.csKpiApproved','승인됨'), val:142, delta:'+8', color:'#22c55e' },
      { emoji:"📊", label:t('marketing.csKpiTopCtr','최고 CTR'), val:"5.2%", delta:'+0.3%', color:'#f97316' },
    ];
    const g = gallery;
    return [
      { emoji:"🎬", label:t('marketing.csKpiCreatives','소재'), val: loadingReal ? '…' : g.length, delta:'', color:'#4f8ef7' },
      { emoji:"📱", label:t('marketing.csKpiFormats','포맷'), val: loadingReal ? '…' : new Set(g.map(x => x.platform).filter(Boolean)).size, delta:'', color:'#a855f7' },
      { emoji:"✅", label:t('marketing.csKpiApproved','승인됨'), val: loadingReal ? '…' : g.filter(x => x.status === 'approved').length, delta:'', color:'#22c55e' },
      { emoji:"📊", label:t('marketing.csKpiTopCtr','최고 CTR'), val:"—", delta:'', color:'#f97316' },
    ];
  }, [gallery, loadingReal, t]);

  const filteredGallery = useMemo(() => {
    let g = gallery;
    if (galleryFilter !== 'all') g = g.filter(x => x.status === galleryFilter);
    if (channelFilter !== 'all') g = g.filter(x => familyOf(x.platform) === channelFilter);
    return g;
  }, [gallery, galleryFilter, channelFilter]);

  // [현 차수] 갤러리에 실제 존재하는 채널 패밀리만 필터 칩으로 노출
  const presentFamilies = useMemo(() => {
    const ids = new Set(gallery.map(g => familyOf(g.platform)));
    return CHANNEL_FAMILIES.filter(f => ids.has(f.id));
  }, [gallery]);

  const handleUseCampaign = (catId, chIds) => {
    if (typeof onUseCampaign === 'function') {
      onUseCampaign(catId || selectedCat, chIds || selectedChannels);
    }
  };

  const statusBadge = (status) => {
    const map = {
      approved: { bg:'rgba(34,197,94,0.12)', color:'#22c55e', label:`✅ ${t('marketing.csStatusApproved','승인')}` },
      review: { bg:'rgba(245,158,11,0.12)', color:'#f59e0b', label:`⏳ ${t('marketing.csStatusReview','검토중')}` },
      draft: { bg:'rgba(148,163,184,0.15)', color:'#64748b', label:`📝 ${t('marketing.csStatusDraft','임시저장')}` },
      active: { bg:'rgba(79,142,247,0.12)', color:'#4f8ef7', label:`🟢 ${t('marketing.csStatusActive','활성')}` },
    };
    const s = map[status] || map.review;
    return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700, background:s.bg, color:s.color }}>{s.label}</span>;
  };

  /* 공통 빈 상태 카드 */
  const EmptyState = ({ icon, title, desc, cta }) => (
    <div style={{ ...card, textAlign:'center', padding:'48px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ fontSize:44, opacity:0.8 }}>{icon}</div>
      <div style={{ fontWeight:800, fontSize:15, color:'#1e293b' }}>{title}</div>
      <div style={{ fontSize:12, color:'#64748b', maxWidth:420, lineHeight:1.7 }}>{desc}</div>
      {cta && (
        <button onClick={() => setActiveTab(1)} style={{ marginTop:8, padding:'10px 22px', borderRadius:11, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#a855f7,#4f8ef7)', color:'#fff', fontWeight:800, fontSize:13 }}>✨ {cta}</button>
      )}
    </div>
  );

  /* ── Tab Content Renderers ────────────────────────── */

  /* [237차] AI 대량 변형 생성 패널 — 브리프 1개로 카피 변형 N종 즉시 생성(Smartly AI Studio급). 운영 전용. */
  const renderBatchPanel = () => {
    if (IS_DEMO) return null;
    const inp = { padding:'8px 10px', borderRadius:8, border:'1px solid rgba(0,0,0,0.12)', fontSize:12, background:'#fff', color:'#1e293b' };
    return (
      <div style={{ ...card, padding:16, border:'1px solid rgba(168,85,247,0.25)', background:'linear-gradient(135deg,rgba(168,85,247,0.05),rgba(79,142,247,0.05))' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setBatchOpen(o => !o)}>
          <div style={{ fontWeight:800, fontSize:13, color:'#7c3aed' }}>⚡ {t('marketing.csBatchTitle','AI 대량 변형 생성')}</div>
          <span style={{ fontSize:11, color:'#94a3b8' }}>{batchOpen ? '▴' : '▾'} {t('marketing.csBatchSub','브리프 1개로 카피 변형을 한 번에 생성')}</span>
        </div>
        {batchOpen && (
          <div style={{ marginTop:12, display:'grid', gap:8 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:8 }}>
              <input style={inp} placeholder={t('marketing.csBatchProduct','상품/서비스')} value={batchForm.product} onChange={e => setBatchForm(f => ({ ...f, product: e.target.value }))} />
              <input style={inp} placeholder={t('marketing.csBatchCategory','카테고리(예: beauty)')} value={batchForm.category} onChange={e => setBatchForm(f => ({ ...f, category: e.target.value }))} />
              <select style={inp} value={batchForm.channel} onChange={e => setBatchForm(f => ({ ...f, channel: e.target.value }))}>
                <option value="meta_feed">Meta 피드</option><option value="instagram_story">Instagram 스토리</option>
                <option value="youtube_thumb">YouTube</option><option value="tiktok">TikTok</option>
                <option value="kakao">Kakao</option><option value="gdn">Google/Display</option>
              </select>
              <select style={inp} value={batchForm.count} onChange={e => setBatchForm(f => ({ ...f, count: +e.target.value }))}>
                {[2,3,4,5,6,8].map(n => <option key={n} value={n}>{n}{t('marketing.csBatchVariants','종 변형')}</option>)}
              </select>
            </div>
            <label style={{ fontSize:11, color:'#64748b', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input type="checkbox" checked={batchForm.with_image} onChange={e => setBatchForm(f => ({ ...f, with_image: e.target.checked }))} />
              🖼 {t('marketing.csBatchWithImage','공유 비주얼(AI 이미지) 동반 생성 — 이미지 API 키 등록 시')}
            </label>
            {batchForm.with_image && (
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', fontSize:11, color:'#64748b' }}>
                {/* [①] 조합형 DCO 이미지 종수 (이미지 M × 카피 N) */}
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>{t('marketing.csBatchImages','이미지 종수')}
                  <select style={{ ...inp, width:'auto', padding:'5px 8px' }} value={batchForm.image_count} onChange={e => setBatchForm(f => ({ ...f, image_count: +e.target.value }))}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </span>
                {/* [①-3] 멀티 종횡비 — 선택 비율에 이미지 분산(플레이스먼트 커버) */}
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>{t('marketing.csBatchAspects','종횡비')}:
                  {['1:1','9:16','16:9','4:5'].map(rr => (
                    <label key={rr} style={{ display:'flex', alignItems:'center', gap:3, cursor:'pointer' }}>
                      <input type="checkbox" checked={(batchForm.ratios||[]).includes(rr)} onChange={e => setBatchForm(f => { const s = new Set(f.ratios||[]); if (e.target.checked) s.add(rr); else s.delete(rr); return { ...f, ratios:[...s] }; })} />{rr}
                    </label>
                  ))}
                </span>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={runBatch} disabled={batchBusy} style={{ padding:'9px 20px', borderRadius:10, border:'none', cursor: batchBusy?'wait':'pointer', background: batchBusy?'#cbd5e1':'linear-gradient(135deg,#a855f7,#4f8ef7)', color:'#fff', fontWeight:800, fontSize:12 }}>
                {batchBusy ? '⏳ ' + t('marketing.csBatchBusy','생성 중…') : '⚡ ' + t('marketing.csBatchRun','대량 생성')}
              </button>
              {batchMsg && <span style={{ fontSize:11, fontWeight:700, color: batchMsg.err ? '#ef4444' : '#22c55e' }}>{batchMsg.err ? '⚠ ' : '✓ '}{batchMsg.text}</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGallery = () => {
    if (loadingReal) return <div style={{ display:'grid', gap:16 }}>{renderBatchPanel()}<div style={{ ...card, textAlign:'center', padding:48, color:'#94a3b8', fontSize:13 }}>⏳ {t('marketing.csLoading','소재를 불러오는 중…')}</div></div>;
    if (!gallery.length) return <div style={{ display:'grid', gap:16 }}>{renderBatchPanel()}<EmptyState icon="🖼" title={t('marketing.csEmptyTitle','아직 생성된 소재가 없습니다')} desc={t('marketing.csEmptyDesc','‘새로 만들기’에서 AI로 광고 소재를 만들고 저장하거나, 위 ‘AI 대량 변형 생성’으로 한 번에 만드세요.')} cta={t('marketing.csTabCreateNew','새로 만들기')} /></div>;
    return (
    <div style={{ display:'grid', gap:16 }}>
      {renderBatchPanel()}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['all','approved','review','draft'].map(f => (
          <button key={f} onClick={() => setGalleryFilter(f)} style={{
            padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
            background: galleryFilter===f ? '#4f8ef7' : 'rgba(0,0,0,0.04)',
            color: galleryFilter===f ? '#fff' : '#64748b',
          }}>{f === 'all' ? t('marketing.csFilterAll','전체') : f === 'approved' ? t('marketing.csStatusApproved','승인') : f === 'review' ? t('marketing.csStatusReview','검토중') : t('marketing.csStatusDraft','임시저장')}</button>
        ))}
      </div>
      {/* [현 차수] 채널별(유튜브/메타/인스타/틱톡 등) 광고물 필터 */}
      {presentFamilies.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#64748b' }}>📡 {t('marketing.csChannelFilter','채널별')}:</span>
          {[{ id:'all', label:t('marketing.csFilterAll','전체'), icon:'🗂' }, ...presentFamilies].map(f => (
            <button key={f.id} onClick={() => setChannelFilter(f.id)} style={{
              padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
              display:'flex', alignItems:'center', gap:4,
              background: channelFilter===f.id ? '#a855f7' : 'rgba(0,0,0,0.04)',
              color: channelFilter===f.id ? '#fff' : '#64748b',
            }}>{f.icon ? <span>{f.icon}</span> : null} {f.label}</button>
          ))}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {filteredGallery.map(item => (
          <div key={item.id} style={{ ...card, padding:18, position:'relative' }}>
            {(item.img || item.svg || item.video) && (
              <div style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, overflow:'hidden', marginBottom:10, background:'#0f172a', position:'relative' }}>
                {item.video
                  ? <video src={item.video} muted loop playsInline autoPlay style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', background:'#000' }} />
                  : item.img
                  ? <img src={item.img} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', animation:(ANIM_CSS[item.animation]||{}).css || 'none' }} />
                  : <div style={{ width:'100%', height:'100%', animation:(ANIM_CSS[item.animation]||{}).css || 'none' }} dangerouslySetInnerHTML={{ __html: item.svg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"') }} />}
                {item.video && <span style={{ position:'absolute', top:6, left:6, padding:'2px 8px', borderRadius:6, fontSize:9, fontWeight:800, background:'rgba(236,72,153,0.92)', color:'#fff' }}>🎬 VIDEO</span>}
                {item.animation && ANIM_CSS[item.animation] && (
                  <span style={{ position:'absolute', top:6, right:6, padding:'2px 8px', borderRadius:6, fontSize:9, fontWeight:800, background:'rgba(236,72,153,0.92)', color:'#fff' }}>📽️ {ANIM_CSS[item.animation].label}</span>
                )}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>{item.name}</div>
              {statusBadge(item.status)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
              <div style={{ textAlign:'center', padding:'8px 0', borderRadius:8, background:'rgba(79,142,247,0.06)' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#4f8ef7' }}>{item.ctr == null ? '—' : item.ctr + '%'}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>CTR</div>
              </div>
              <div style={{ textAlign:'center', padding:'8px 0', borderRadius:8, background:'rgba(34,197,94,0.06)' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#22c55e' }}>{item.conv == null ? '—' : item.conv}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>{t('marketing.csConv','전환')}</div>
              </div>
              <div style={{ textAlign:'center', padding:'8px 0', borderRadius:8, background:'rgba(168,85,247,0.06)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#a855f7' }}>{item.platform}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>{fmtLabel(item.format)}</div>
              </div>
            </div>
            {(item.periodStart || item.periodEnd) && (
              <div style={{ fontSize:10, fontWeight:700, color:'#4f8ef7', marginBottom:8, display:'flex', alignItems:'center', gap:4, padding:'5px 8px', borderRadius:7, background:'rgba(79,142,247,0.07)' }}>
                📅 {t('marketing.csPeriod','노출 기간')}: {item.periodStart || '—'} ~ {item.periodEnd || '—'}
              </div>
            )}
            {item.animation && ANIM_CSS[item.animation] && (
              <div style={{ fontSize:10, fontWeight:700, color:'#ec4899', marginBottom:8, display:'flex', alignItems:'center', gap:4, padding:'5px 8px', borderRadius:7, background:'rgba(236,72,153,0.07)' }}>
                📽️ {t('marketing.csAnimation','애니메이션')}: {ANIM_CSS[item.animation].label}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, color:'#94a3b8' }}>{item.date}</span>
              <button onClick={() => handleUseCampaign('beauty', ['meta'])} style={{
                padding:'5px 12px', borderRadius:7, border:'1px solid rgba(79,142,247,0.3)',
                background:'rgba(79,142,247,0.08)', color:'#4f8ef7', fontSize:10, fontWeight:700, cursor:'pointer'
              }}>{t('marketing.csUseCampaign','캠페인 활용')} →</button>
            </div>
          </div>
        ))}
      </div>
      {!IS_DEMO && (
        <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center' }}>ℹ️ {t('marketing.csPerfHint','CTR·전환 등 성과 지표는 광고 채널을 연동하면 자동 집계됩니다.')}</div>
      )}
    </div>
    );
  };

  const renderCreateNew = () => (<AIDesignStudio onApplied={() => { if (!IS_DEMO) setRealDesigns(null); }} />);

  const renderPerformance = () => {
    if (!IS_DEMO) {
      // [237차] 실 Creative Insights — ad_design ← creative_variant → ad_insight_agg 소재별 ROAS/CTR/승자·패자.
      if (insightsLoading || insights === null) return <div style={{ ...card, textAlign:'center', padding:48, color:'#94a3b8', fontSize:13 }}>⏳ {t('marketing.csLoading','분석을 불러오는 중…')}</div>;
      const ds = Array.isArray(insights.designs) ? insights.designs : [];
      const winners = Array.isArray(insights.winners) ? insights.winners : [];
      const measured = insights.measured || 0;
      const tdc = { padding:'10px 12px', fontSize:12 };
      const rcolor = (v) => v >= 3 ? '#22c55e' : (v >= 1 ? '#f59e0b' : '#94a3b8');
      // [245차 P1-2] 코크핏 헬퍼 — 피로도/스코어/신뢰도 배지.
      const FAT = { fatigued:{c:'#dc2626',l:t('marketing.csFatHigh','교체 권고')}, fatiguing:{c:'#f59e0b',l:t('marketing.csFatMid','피로 진행')}, stable:{c:'#22c55e',l:t('marketing.csFatStable','안정')}, rising:{c:'#0ea5e9',l:t('marketing.csFatRising','상승')}, insufficient:{c:'#94a3b8',l:t('marketing.csFatNa','표본부족')} };
      const scoreColor = (s) => s >= 75 ? '#16a34a' : s >= 55 ? '#f59e0b' : '#dc2626';
      const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
      const cp = cockpit && cockpit.summary ? cockpit : null;
      const rollTable = (title, rows) => (
        <div style={{ flex:'1 1 220px', minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#475569', marginBottom:6 }}>{title}</div>
          {(rows || []).slice(0,6).map(r => (
            <div key={r.key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, padding:'4px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#1e293b' }}>{r.key}</span>
              <span style={{ color:'#64748b' }}>{r.creatives}개</span>
              <span style={{ fontWeight:700, color: r.roas >= 1 ? '#16a34a' : '#64748b' }}>ROAS {r.roas}x</span>
              <span style={{ color:'#64748b' }}>CTR {r.ctr}%</span>
            </div>
          ))}
          {(!rows || rows.length === 0) && <div style={{ fontSize:11, color:'#cbd5e1' }}>—</div>}
        </div>
      );
      return (
        <div style={{ display:'grid', gap:16 }}>
          {/* [245차 P1-2] 크리에이티브 코크핏 — 피로도·스코어·신뢰도·차원분석(Triple Whale 대응) */}
          {cp && (
            <div style={{ ...card, padding:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>🎯 {t('marketing.csCockpit','크리에이티브 코크핏')}</div>
                <div style={{ display:'flex', gap:18 }}>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:20, fontWeight:900, color:scoreColor(cp.summary.avg_score||0) }}>{cp.summary.avg_score||0}</div><div style={{ fontSize:10, color:'#64748b' }}>{t('marketing.csAvgScore','평균 스코어')}</div></div>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:20, fontWeight:900, color:'#22c55e' }}>{cp.summary.measured||0}</div><div style={{ fontSize:10, color:'#64748b' }}>{t('marketing.csInsMeasured','실측 집행')}</div></div>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:20, fontWeight:900, color:'#dc2626' }}>{cp.summary.fatigued||0}</div><div style={{ fontSize:10, color:'#64748b' }}>{t('marketing.csNeedRefresh','교체 권고')}</div></div>
                </div>
              </div>
              {Array.isArray(cp.need_refresh) && cp.need_refresh.length > 0 && (
                <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:10, background:'rgba(220,38,38,0.05)', border:'1px solid rgba(220,38,38,0.2)' }}>
                  <div style={{ fontSize:11.5, fontWeight:800, color:'#dc2626', marginBottom:6 }}>⚠️ {t('marketing.csRefreshList','피로도 높은 소재 — 교체 권고')}</div>
                  {cp.need_refresh.slice(0,5).map(r => (
                    <div key={r.design_id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, padding:'3px 0' }}>
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#1e293b' }}>{r.headline || ('#'+r.design_id)}</span>
                      <span style={{ color:'#64748b' }}>{r.channel}</span>
                      <span style={{ fontWeight:800, color:'#dc2626' }}>CTR ↓{r.fatigue_pct}%</span>
                      <span style={{ color:'#64748b' }}>{r.age_days}일차</span>
                    </div>
                  ))}
                </div>
              )}
              {(cp.summary.measured||0) > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:18 }}>
                  {rollTable('📺 '+t('marketing.csByChannel','채널별'), cp.by_channel)}
                  {rollTable('🖼️ '+t('marketing.csByFormat','포맷별'), cp.by_format)}
                  {rollTable('🎭 '+t('marketing.csByAngle','앵글별'), cp.by_angle)}
                </div>
              )}
              {(cp.summary.measured||0) === 0 && <div style={{ fontSize:11, color:'#94a3b8' }}>ℹ️ {cp.note || t('marketing.csCockpitEmpty','집행 성과 수집 후 피로도·스코어·차원분석이 표시됩니다.')}</div>}
            </div>
          )}
          <div style={{ ...card, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>📊 {t('marketing.csInsightsTitle','Creative Insights — 소재별 성과')}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>{insights.note || ''}</div>
            </div>
            <div style={{ display:'flex', gap:16 }}>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:20, fontWeight:900, color:'#4f8ef7' }}>{insights.total || ds.length}</div><div style={{ fontSize:10, color:'#64748b' }}>{t('marketing.csInsTotal','전체 소재')}</div></div>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:20, fontWeight:900, color:'#22c55e' }}>{measured}</div><div style={{ fontSize:10, color:'#64748b' }}>{t('marketing.csInsMeasured','실측 집행')}</div></div>
            </div>
          </div>
          {measured > 0 && winners.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight:800, fontSize:13, color:'#16a34a', marginBottom:10 }}>🏆 {t('marketing.csInsWinners','상위 소재(ROAS)')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                {winners.map(w => (
                  <div key={w.design_id} style={{ padding:12, borderRadius:10, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.headline || ('#' + w.design_id)}</div>
                    <div style={{ display:'flex', gap:10, marginTop:6, fontSize:11 }}>
                      <span style={{ fontWeight:800, color:'#22c55e' }}>ROAS {w.roas}x</span>
                      <span style={{ color:'#64748b' }}>CTR {w.ctr}%</span>
                      <span style={{ color:'#64748b' }}>{w.channel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={card}>
            <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:16 }}>📋 {t('marketing.csPerfTable','소재별 성과 테이블')}</div>
            {ds.length === 0 ? (
              <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:12 }}>{t('marketing.csInsNoDesigns','저장된 소재가 없습니다. 갤러리에서 ‘AI 대량 변형 생성’으로 만들어 보세요.')}</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr style={{ borderBottom:'2px solid rgba(0,0,0,0.08)' }}>
                    {['소재(헤드라인)','채널','노출','클릭','CTR','전환','ROAS','상태'].map(h => <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748b', fontWeight:700, fontSize:11 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ds.map(d => (
                      <tr key={d.design_id} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ ...tdc, fontWeight:700, color:'#1e293b', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.headline || ('#' + d.design_id)}</td>
                        <td style={{ ...tdc, color:'#a855f7' }}>{d.channel || '—'}</td>
                        <td style={tdc}>{d.has_data ? d.impressions.toLocaleString() : '—'}</td>
                        <td style={tdc}>{d.has_data ? d.clicks.toLocaleString() : '—'}</td>
                        <td style={{ ...tdc, fontWeight:700, color: d.has_data ? (d.ctr >= 2 ? '#22c55e' : '#f59e0b') : '#cbd5e1' }}>{d.has_data ? d.ctr + '%' : '—'}</td>
                        <td style={tdc}>{d.has_data ? d.conversions : '—'}</td>
                        <td style={{ ...tdc, fontWeight:800, color: d.has_data ? rcolor(d.roas) : '#cbd5e1' }}>{d.has_data ? d.roas + 'x' : '—'}</td>
                        <td style={tdc}>{statusBadge(d.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginTop:12 }}>ℹ️ {t('marketing.csInsHint','‘—’ 지표는 해당 소재가 아직 캠페인에 집행되지 않았거나 매체 성과 수집 전입니다. 캠페인 활성화 후 자동 채워집니다.')}</div>
          </div>
        </div>
      );
    }
    return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {[
          { label:t('marketing.csPerfAvgCtr','평균 CTR'), value:'3.8%', delta:'+0.5%', color:'#4f8ef7', icon:'👆' },
          { label:t('marketing.csPerfAvgConv','평균 전환율'), value:'4.2%', delta:'+0.8%', color:'#22c55e', icon:'🎯' },
          { label:t('marketing.csPerfTotalConv','총 전환수'), value:'2,117', delta:'+342', color:'#a855f7', icon:'🛒' },
          { label:t('marketing.csPerfEffScore','소재 효율 점수'), value:'87/100', delta:'+5', color:'#f97316', icon:'⭐' },
        ].map((m, i) => (
          <div key={i} style={{ ...card, textAlign:'center', padding:20 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{m.icon}</div>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:m.color }}>{m.value}</div>
            <div style={{ fontSize:10, color:'#22c55e', fontWeight:700, marginTop:4 }}>▲ {m.delta}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:16 }}>📊 {t('marketing.csPerfTable','소재별 성과 테이블')}</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid rgba(0,0,0,0.08)' }}>
                {[ t('marketing.csColName','소재명'), t('marketing.csColFormat','포맷'), t('marketing.csColPlatform','플랫폼'), 'CTR', t('marketing.csConv','전환'), t('marketing.csColStatus','상태') ].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748b', fontWeight:700, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_GALLERY.map(item => (
                <tr key={item.id} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:'#1e293b' }}>{item.name}</td>
                  <td style={{ padding:'10px 12px', color:'#64748b' }}>{fmtLabel(item.format)}</td>
                  <td style={{ padding:'10px 12px' }}><span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700, background:'rgba(168,85,247,0.08)', color:'#a855f7' }}>{item.platform}</span></td>
                  <td style={{ padding:'10px 12px', fontWeight:800, color: item.ctr >= 4 ? '#22c55e' : '#f59e0b' }}>{item.ctr}%</td>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:'#1e293b' }}>{item.conv}</td>
                  <td style={{ padding:'10px 12px' }}>{statusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ ...card, background:'rgba(34,197,94,0.04)', borderColor:'rgba(34,197,94,0.2)' }}>
        <div style={{ fontWeight:800, fontSize:13, color:'#22c55e', marginBottom:10 }}>💡 {t('marketing.csAiOptTitle','AI 소재 최적화 제안')}</div>
        <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12, color:'#475569', lineHeight:2.2 }}>
          <li>{t('marketing.csAiOpt1','동영상 소재의 CTR이 카루셀 대비 1.5배 높습니다. 동영상 비율을 확대하세요.')}</li>
          <li>{t('marketing.csAiOpt2','TikTok 숏폼 소재의 전환율이 가장 높습니다. 15초 이내 소재를 추가 제작하세요.')}</li>
          <li>{t('marketing.csAiOpt3','2주 이상 된 소재는 광고 피로도가 상승합니다. 새로운 크리에이티브를 교체하세요.')}</li>
        </ul>
      </div>
    </div>
    );
  };

  const renderBrandAssets = () => {
    const assets = brandAssets;
    return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ ...card, background:'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(234,88,12,0.04))', borderColor:'rgba(249,115,22,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:'#1e293b' }}>🎨 {t('marketing.csBrandTitle','브랜드 에셋 관리')}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{t('marketing.csBrandDesc','브랜드 가이드라인에 따른 일관된 소재 관리')}</div>
          </div>
          <label style={{ padding:'8px 16px', borderRadius:10, border:'none', cursor: (IS_DEMO||uploadingAsset)?'not-allowed':'pointer', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:800, fontSize:11, display:'inline-flex', alignItems:'center', gap:6, opacity:(IS_DEMO||uploadingAsset)?0.6:1 }}>
            + {uploadingAsset ? '⏳' : t('marketing.csUploadAsset','에셋 업로드')}
            <input type="file" style={{ display:'none' }} disabled={IS_DEMO||uploadingAsset} accept="image/*,.pdf,.json,.svg,.woff2,.zip" onChange={e=>{ onUploadAsset(e.target.files?.[0]); e.target.value=''; }} />
          </label>
        </div>
      </div>
      {!assets.length ? (
        <EmptyState icon="🎨" title={t('marketing.csAssetEmptyTitle','등록된 브랜드 에셋이 없습니다')} desc={t('marketing.csAssetEmptyDesc','로고·가이드라인·컬러·폰트 등 브랜드 에셋을 업로드하면 일관된 소재 제작에 활용됩니다.')} />
      ) : (
      <div style={{ display:'grid', gap:10 }}>
        {assets.map(asset => (
          <div key={asset.id} style={{ ...card, padding:16, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(168,85,247,0.08))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              {asset.type === 'SVG' ? '🖼' : asset.type === 'PDF' ? '📄' : asset.type === 'JSON' ? '🎨' : asset.type === 'WOFF2' ? '🔤' : '📦'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{asset.name}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{asset.type} · {asset.size} · {asset.updated_at || asset.updated}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>assetAction(asset,'preview')} style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'transparent', color:'#64748b', fontSize:10, fontWeight:600, cursor:'pointer' }}>{t('marketing.csPreview','미리보기')}</button>
              <button onClick={()=>assetAction(asset,'download')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(79,142,247,0.1)', color:'#4f8ef7', fontSize:10, fontWeight:700, cursor:'pointer' }}>{t('marketing.csDownload','다운로드')}</button>
            </div>
          </div>
        ))}
      </div>
      )}
      {IS_DEMO && (
      <div style={{ ...card, borderColor:'rgba(99,140,255,0.2)' }}>
        <div style={{ fontWeight:800, fontSize:13, color:'#4f8ef7', marginBottom:12 }}>🔍 {t('marketing.csBrandCheck','브랜드 일관성 검사')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
          {[
            { label:t('marketing.csColorComp','컬러 준수율'), value:'98%', color:'#22c55e' },
            { label:t('marketing.csFontComp','폰트 일관성'), value:'95%', color:'#22c55e' },
            { label:t('marketing.csLogoComp','로고 사용 준수'), value:'100%', color:'#22c55e' },
            { label:t('marketing.csGuideViolation','가이드라인 위반'), value:`0${t('marketing.csUnitCount','건')}`, color:'#22c55e' },
          ].map((m, i) => (
            <div key={i} style={{ padding:14, borderRadius:10, background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.15)', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:900, color:m.color }}>{m.value}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
    );
  };

  const TAB_CONTENT = [renderGallery, renderCreateNew, renderPerformance, renderBrandAssets];

  return (
    <div style={{ padding:0, minHeight:"100%", color:"#1e293b" }}>
      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-8, right:-8, fontSize:48, opacity:0.06 }}>{k.emoji}</div>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.emoji}</div>
            <div style={{ fontSize:24, fontWeight:900, color: isLight ? (k.color === '#4f8ef7' ? '#1d4ed8' : k.color === '#a855f7' ? '#7c3aed' : k.color === '#22c55e' ? '#15803d' : '#c2410c') : k.color }}>{k.val}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <span style={{ fontSize:11, color: isLight ? '#374151' : "#64748b", fontWeight:600 }}>{k.label}</span>
              {k.delta && <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>{k.delta}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{ display:"flex", gap:4, marginBottom:20, padding:5, borderRadius:12, background:"rgba(0,0,0,0.03)", border:"1px solid rgba(0,0,0,0.05)" }}>
        {tabs.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <button key={i} className={isActive ? 'cs-active-tab' : 'cs-inactive-tab'}
              onClick={() => setActiveTab(i)}
              style={{
                flex:1, padding:"10px 16px", borderRadius:10, border:"none", cursor:"pointer",
                fontWeight:700, fontSize:12, transition:"all 0.2s",
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                background: isActive ? tab.color : 'transparent',
                color: isActive ? '#fff' : '#374151',
                boxShadow: isActive ? `0 3px 12px ${tab.color}40` : 'none',
              }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight:320 }}>
        {TAB_CONTENT[activeTab]()}
      </div>

      {/* System Status */}
      <div style={{ marginTop:24, padding:"14px 20px", borderRadius:12, background: isLight ? 'rgba(34,197,94,0.05)' : "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))", border:"1px solid rgba(34,197,94,0.12)", display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18 }}>✅</span>
        <span style={{ fontSize:12, fontWeight:700, color: isLight ? '#15803d' : "#16a34a" }}>{t('marketing.csSystemOk','크리에이티브 스튜디오 시스템 정상 운영 중')}</span>
        <span style={{ marginLeft:'auto', fontSize:10, color: isLight ? '#374151' : '#64748b' }}>{IS_DEMO ? t('marketing.csLastSync','마지막 동기화: 방금') : t('marketing.csRealData','실데이터 연동')}</span>
      </div>
    </div>
  );
}
