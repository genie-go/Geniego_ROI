import React, { useState, useMemo, useEffect } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { getJsonAuth } from '../services/apiClient.js';
import { useI18n } from '../i18n';
import AIDesignStudio from '../components/AIDesignStudio.jsx'; // 196차 — AI 광고 디자인 스튜디오

/* 197차 — 운영/데모 데이터 격리 (U-177-A: 운영에 mock/가상 데이터 유입 절대 금지).
 *  - 데모(IS_DEMO): 아래 DEMO_* 풍부한 가상 데이터로 체험감 제공.
 *  - 운영: 실제 저장 소재(GET /v422/ai/ad-design/list, 테넌트 격리)만 표시. 없으면 정직한 빈 상태.
 *  과거: GALLERY_ITEMS/BRAND_ASSETS/하드코딩 KPI가 _isDemo 게이트 없이 운영에도 그대로 노출되던 결함을 제거. */

/* ── Demo 전용 가상 데이터 (운영 미노출) ─────────────── */
const DEMO_GALLERY = [
  { id:'G1', name:'Summer UV Campaign', format:'carousel', platform:'Meta', status:'approved', ctr:4.2, conv:312, date:'2026-04-15' },
  { id:'G2', name:'Spring Lookbook', format:'video', platform:'Instagram', status:'approved', ctr:5.1, conv:287, date:'2026-04-12' },
  { id:'G3', name:'Flash Sale Banner', format:'banner', platform:'Google', status:'review', ctr:3.8, conv:198, date:'2026-04-10' },
  { id:'G4', name:'TikTok Challenge', format:'short', platform:'TikTok', status:'approved', ctr:6.3, conv:456, date:'2026-04-08' },
  { id:'G5', name:'Retargeting DPA', format:'DPA', platform:'Meta', status:'active', ctr:2.9, conv:523, date:'2026-04-05' },
  { id:'G6', name:'Naver Brand Search', format:'banner', platform:'Naver', status:'approved', ctr:4.7, conv:341, date:'2026-04-02' },
];
const DEMO_ASSETS = [
  { id:'BA1', name:'Primary Logo', type:'SVG', size:'24KB', updated:'2026-04-20' },
  { id:'BA2', name:'Brand Guidelines', type:'PDF', size:'4.2MB', updated:'2026-04-18' },
  { id:'BA3', name:'Color Palette', type:'JSON', size:'2KB', updated:'2026-04-15' },
  { id:'BA4', name:'Typography Set', type:'WOFF2', size:'180KB', updated:'2026-04-10' },
  { id:'BA5', name:'Product Photos', type:'ZIP', size:'45MB', updated:'2026-04-08' },
];

const card = { background:"rgba(255,255,255,0.85)", border:"1px solid rgba(0,0,0,0.08)", borderRadius:16, padding:24, backdropFilter:"blur(16px)", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" };

export default function CreativeStudioTab({ sourcePage, onUseCampaign }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [galleryFilter, setGalleryFilter] = useState('all');
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

  /* 운영: 실제 저장 소재 로드(테넌트 격리). 데모는 mock 유지 → fetch 안 함. */
  useEffect(() => {
    if (IS_DEMO) return;
    let alive = true;
    (async () => {
      try {
        const d = await getJsonAuth('/api/v422/ai/ad-design/list');
        if (!alive) return;
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
            svg: typeof r.svg === 'string' && r.svg.indexOf('<svg') === 0 ? r.svg : '',
          };
        }));
      } catch (_) { if (alive) setRealDesigns([]); }
    })();
    return () => { alive = false; };
  }, []);

  const gallery = IS_DEMO ? DEMO_GALLERY : (realDesigns || []);
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
    if (galleryFilter === 'all') return gallery;
    return gallery.filter(g => g.status === galleryFilter);
  }, [gallery, galleryFilter]);

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

  const renderGallery = () => {
    if (loadingReal) return <div style={{ ...card, textAlign:'center', padding:48, color:'#94a3b8', fontSize:13 }}>⏳ {t('marketing.csLoading','소재를 불러오는 중…')}</div>;
    if (!gallery.length) return <EmptyState icon="🖼" title={t('marketing.csEmptyTitle','아직 생성된 소재가 없습니다')} desc={t('marketing.csEmptyDesc','‘새로 만들기’에서 AI로 광고 소재를 만들고 저장하면 여기 갤러리에 표시됩니다.')} cta={t('marketing.csTabCreateNew','새로 만들기')} />;
    return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['all','approved','review','draft'].map(f => (
          <button key={f} onClick={() => setGalleryFilter(f)} style={{
            padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
            background: galleryFilter===f ? '#4f8ef7' : 'rgba(0,0,0,0.04)',
            color: galleryFilter===f ? '#fff' : '#64748b',
          }}>{f === 'all' ? t('marketing.csFilterAll','전체') : f === 'approved' ? t('marketing.csStatusApproved','승인') : f === 'review' ? t('marketing.csStatusReview','검토중') : t('marketing.csStatusDraft','임시저장')}</button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {filteredGallery.map(item => (
          <div key={item.id} style={{ ...card, padding:18, position:'relative' }}>
            {item.svg && (
              <div style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, overflow:'hidden', marginBottom:10, background:'#0f172a' }}
                dangerouslySetInnerHTML={{ __html: item.svg.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"') }} />
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
      return <EmptyState icon="📊" title={t('marketing.csPerfEmptyTitle','성과 데이터 연동 대기')} desc={t('marketing.csPerfEmptyDesc','소재별 CTR·전환·효율 지표는 광고 채널(Meta·Google·TikTok 등)을 연동하면 자동으로 집계되어 여기에 표시됩니다.')} />;
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
    const assets = IS_DEMO ? DEMO_ASSETS : [];
    return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ ...card, background:'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(234,88,12,0.04))', borderColor:'rgba(249,115,22,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:'#1e293b' }}>🎨 {t('marketing.csBrandTitle','브랜드 에셋 관리')}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{t('marketing.csBrandDesc','브랜드 가이드라인에 따른 일관된 소재 관리')}</div>
          </div>
          <button style={{ padding:'8px 16px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:800, fontSize:11 }}>+ {t('marketing.csUploadAsset','에셋 업로드')}</button>
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
              <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{asset.type} · {asset.size} · {asset.updated}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'transparent', color:'#64748b', fontSize:10, fontWeight:600, cursor:'pointer' }}>{t('marketing.csPreview','미리보기')}</button>
              <button style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(79,142,247,0.1)', color:'#4f8ef7', fontSize:10, fontWeight:700, cursor:'pointer' }}>{t('marketing.csDownload','다운로드')}</button>
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
