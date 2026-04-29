import React, { useState, useMemo } from "react";
import { useI18n } from '../i18n';

const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

/* ── Demo Gallery Data ──────────────────────────────── */
const GALLERY_ITEMS = [
  { id:'G1', name:'Summer UV Campaign', format:'카루셀', platform:'Meta', status:'approved', ctr:4.2, conv:312, date:'2026-04-15' },
  { id:'G2', name:'Spring Lookbook', format:'동영상', platform:'Instagram', status:'approved', ctr:5.1, conv:287, date:'2026-04-12' },
  { id:'G3', name:'Flash Sale Banner', format:'배너', platform:'Google', status:'review', ctr:3.8, conv:198, date:'2026-04-10' },
  { id:'G4', name:'TikTok Challenge', format:'숏폼', platform:'TikTok', status:'approved', ctr:6.3, conv:456, date:'2026-04-08' },
  { id:'G5', name:'Retargeting DPA', format:'DPA', platform:'Meta', status:'active', ctr:2.9, conv:523, date:'2026-04-05' },
  { id:'G6', name:'Naver Brand Search', format:'배너', platform:'Naver', status:'approved', ctr:4.7, conv:341, date:'2026-04-02' },
];

const BRAND_ASSETS = [
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

  const tabs = [
    { label: t('marketing.csTabGallery','갤러리'), icon:'🖼', color:'#4f8ef7' },
    { label: t('marketing.csTabCreateNew','새로 만들기'), icon:'✨', color:'#a855f7' },
    { label: t('marketing.csTabPerformance','성과 분석'), icon:'📊', color:'#22c55e' },
    { label: t('marketing.csTabBrandAssets','브랜드 에셋'), icon:'🎨', color:'#f97316' },
  ];

  const kpis = [
    { emoji:"🎬", label:t('marketing.csKpiCreatives','소재'), val:156, delta:'+12', color:'#4f8ef7' },
    { emoji:"📱", label:t('marketing.csKpiFormats','포맷'), val:12, delta:'+2', color:'#a855f7' },
    { emoji:"✅", label:t('marketing.csKpiApproved','승인됨'), val:142, delta:'+8', color:'#22c55e' },
    { emoji:"📊", label:t('marketing.csKpiTopCtr','최고 CTR'), val:"5.2%", delta:'+0.3%', color:'#f97316' },
  ];

  const filteredGallery = useMemo(() => {
    if (galleryFilter === 'all') return GALLERY_ITEMS;
    return GALLERY_ITEMS.filter(g => g.status === galleryFilter);
  }, [galleryFilter]);

  const handleUseCampaign = (catId, chIds) => {
    if (typeof onUseCampaign === 'function') {
      onUseCampaign(catId || selectedCat, chIds || selectedChannels);
    }
  };

  const statusBadge = (status) => {
    const map = {
      approved: { bg:'rgba(34,197,94,0.12)', color:'#22c55e', label:'✅ 승인' },
      review: { bg:'rgba(245,158,11,0.12)', color:'#f59e0b', label:'⏳ 검토중' },
      active: { bg:'rgba(79,142,247,0.12)', color:'#4f8ef7', label:'🟢 활성' },
    };
    const s = map[status] || map.review;
    return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700, background:s.bg, color:s.color }}>{s.label}</span>;
  };

  /* ── Tab Content Renderers ────────────────────────── */

  const renderGallery = () => (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['all','approved','review','active'].map(f => (
          <button key={f} onClick={() => setGalleryFilter(f)} style={{
            padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
            background: galleryFilter===f ? '#4f8ef7' : 'rgba(0,0,0,0.04)',
            color: galleryFilter===f ? '#fff' : '#64748b',
          }}>{f === 'all' ? '전체' : f === 'approved' ? '승인' : f === 'review' ? '검토중' : '활성'}</button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {filteredGallery.map(item => (
          <div key={item.id} style={{ ...card, padding:18, position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>{item.name}</div>
              {statusBadge(item.status)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
              <div style={{ textAlign:'center', padding:'8px 0', borderRadius:8, background:'rgba(79,142,247,0.06)' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#4f8ef7' }}>{item.ctr}%</div>
                <div style={{ fontSize:9, color:'#64748b' }}>CTR</div>
              </div>
              <div style={{ textAlign:'center', padding:'8px 0', borderRadius:8, background:'rgba(34,197,94,0.06)' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#22c55e' }}>{item.conv}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>전환</div>
              </div>
              <div style={{ textAlign:'center', padding:'8px 0', borderRadius:8, background:'rgba(168,85,247,0.06)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#a855f7' }}>{item.platform}</div>
                <div style={{ fontSize:9, color:'#64748b' }}>{item.format}</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, color:'#94a3b8' }}>{item.date}</span>
              <button onClick={() => handleUseCampaign('beauty', ['meta'])} style={{
                padding:'5px 12px', borderRadius:7, border:'1px solid rgba(79,142,247,0.3)',
                background:'rgba(79,142,247,0.08)', color:'#4f8ef7', fontSize:10, fontWeight:700, cursor:'pointer'
              }}>캠페인 활용 →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCreateNew = () => (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ ...card, background:'linear-gradient(135deg,rgba(168,85,247,0.08),rgba(79,142,247,0.06))', borderColor:'rgba(168,85,247,0.25)', textAlign:'center', padding:40 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>✨</div>
        <div style={{ fontWeight:900, fontSize:20, color:'#1e293b', marginBottom:8 }}>AI 크리에이티브 생성</div>
        <div style={{ fontSize:12, color:'#64748b', maxWidth:500, margin:'0 auto', lineHeight:1.7, marginBottom:20 }}>
          카테고리와 채널을 선택하면 AI가 최적의 광고 소재를 자동 생성합니다. 생성된 소재는 바로 캠페인에 활용할 수 있습니다.
        </div>
        <button onClick={() => handleUseCampaign()} style={{
          padding:'12px 28px', borderRadius:12, border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#a855f7,#4f8ef7)', color:'#fff', fontWeight:800, fontSize:14
        }}>⚙ 캠페인 설정에서 시작하기</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
        {[
          { icon:'🖼', title:'카루셀 광고', desc:'여러 이미지를 슬라이드로 구성', formats:'Meta · Instagram' },
          { icon:'🎬', title:'동영상 광고', desc:'15~60초 숏폼 영상 자동 제작', formats:'TikTok · YouTube' },
          { icon:'📐', title:'배너 광고', desc:'반응형 디스플레이 배너 생성', formats:'Google · Naver' },
          { icon:'📱', title:'스토리 광고', desc:'9:16 세로형 풀스크린 소재', formats:'Instagram · TikTok' },
          { icon:'🛍', title:'쇼핑 광고', desc:'상품 피드 기반 DPA 소재', formats:'Meta · Coupang' },
          { icon:'💬', title:'메시지 광고', desc:'카카오톡·LINE 템플릿', formats:'Kakao · LINE' },
        ].map((f, i) => (
          <div key={i} style={{ ...card, padding:18, cursor:'pointer', transition:'all 150ms' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{f.icon}</div>
            <div style={{ fontWeight:800, fontSize:13, color:'#1e293b', marginBottom:4 }}>{f.title}</div>
            <div style={{ fontSize:11, color:'#64748b', lineHeight:1.6, marginBottom:8 }}>{f.desc}</div>
            <div style={{ fontSize:10, color:'#a855f7', fontWeight:700 }}>{f.formats}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {[
          { label:'평균 CTR', value:'3.8%', delta:'+0.5%', color:'#4f8ef7', icon:'👆' },
          { label:'평균 전환율', value:'4.2%', delta:'+0.8%', color:'#22c55e', icon:'🎯' },
          { label:'총 전환수', value:'2,117', delta:'+342', color:'#a855f7', icon:'🛒' },
          { label:'소재 효율 점수', value:'87/100', delta:'+5', color:'#f97316', icon:'⭐' },
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
        <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:16 }}>📊 소재별 성과 테이블</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid rgba(0,0,0,0.08)' }}>
                {['소재명','포맷','플랫폼','CTR','전환','상태'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'#64748b', fontWeight:700, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GALLERY_ITEMS.map(item => (
                <tr key={item.id} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ padding:'10px 12px', fontWeight:700, color:'#1e293b' }}>{item.name}</td>
                  <td style={{ padding:'10px 12px', color:'#64748b' }}>{item.format}</td>
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
        <div style={{ fontWeight:800, fontSize:13, color:'#22c55e', marginBottom:10 }}>💡 AI 소재 최적화 제안</div>
        <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:12, color:'#475569', lineHeight:2.2 }}>
          <li>동영상 소재의 CTR이 카루셀 대비 1.5배 높습니다. 동영상 비율을 확대하세요.</li>
          <li>TikTok 숏폼 소재의 전환율이 가장 높습니다. 15초 이내 소재를 추가 제작하세요.</li>
          <li>2주 이상 된 소재는 광고 피로도가 상승합니다. 새로운 크리에이티브를 교체하세요.</li>
        </ul>
      </div>
    </div>
  );

  const renderBrandAssets = () => (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ ...card, background:'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(234,88,12,0.04))', borderColor:'rgba(249,115,22,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color:'#1e293b' }}>🎨 브랜드 에셋 관리</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>브랜드 가이드라인에 따른 일관된 소재 관리</div>
          </div>
          <button style={{ padding:'8px 16px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:800, fontSize:11 }}>+ 에셋 업로드</button>
        </div>
      </div>
      <div style={{ display:'grid', gap:10 }}>
        {BRAND_ASSETS.map(asset => (
          <div key={asset.id} style={{ ...card, padding:16, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(168,85,247,0.08))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              {asset.type === 'SVG' ? '🖼' : asset.type === 'PDF' ? '📄' : asset.type === 'JSON' ? '🎨' : asset.type === 'WOFF2' ? '🔤' : '📦'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{asset.name}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{asset.type} · {asset.size} · {asset.updated}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'transparent', color:'#64748b', fontSize:10, fontWeight:600, cursor:'pointer' }}>미리보기</button>
              <button style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(79,142,247,0.1)', color:'#4f8ef7', fontSize:10, fontWeight:700, cursor:'pointer' }}>다운로드</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...card, borderColor:'rgba(99,140,255,0.2)' }}>
        <div style={{ fontWeight:800, fontSize:13, color:'#4f8ef7', marginBottom:12 }}>🔍 브랜드 일관성 검사</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
          {[
            { label:'컬러 준수율', value:'98%', color:'#22c55e' },
            { label:'폰트 일관성', value:'95%', color:'#22c55e' },
            { label:'로고 사용 준수', value:'100%', color:'#22c55e' },
            { label:'가이드라인 위반', value:'0건', color:'#22c55e' },
          ].map((m, i) => (
            <div key={i} style={{ padding:14, borderRadius:10, background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.15)', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:900, color:m.color }}>{m.value}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TAB_CONTENT = [renderGallery, renderCreateNew, renderPerformance, renderBrandAssets];

  return (
    <div style={{ padding:0, minHeight:"100%", color:"#1e293b" }}>
      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:14, marginBottom:22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-8, right:-8, fontSize:48, opacity:0.06 }}>{k.emoji}</div>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.emoji}</div>
            <div style={{ fontSize:24, fontWeight:900, color:k.color }}>{k.val}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>{k.label}</span>
              <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>{k.delta}</span>
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
      <div style={{ marginTop:24, padding:"14px 20px", borderRadius:12, background:"linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))", border:"1px solid rgba(34,197,94,0.12)", display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18 }}>✅</span>
        <span style={{ fontSize:12, fontWeight:700, color:"#16a34a" }}>{t('marketing.csSystemOk','크리에이티브 스튜디오 시스템 정상 운영 중')}</span>
        <span style={{ marginLeft:'auto', fontSize:10, color:'#64748b' }}>마지막 동기화: 방금</span>
      </div>
    </div>
  );
}
