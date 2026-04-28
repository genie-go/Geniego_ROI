/**
 * CampaignManager — Ultra-Advanced Enterprise Campaign Management
 * ──────────────────────────────────────────────────────────────
 * Layout matches AutoMarketing pattern: full-bleed, edge-to-edge,
 * uniform height across all sub-tabs.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';

/* ── i18n ─────────────────────────────────────────── */
const T={title:'campMgr.title',sub:'campMgr.sub',tabOverview:'campMgr.tabOverview',tabList:'campMgr.tabList',tabAnalytics:'campMgr.tabAnalytics',tabABTest:'campMgr.tabABTest',tabGuide:'campMgr.tabGuide',kpiActive:'campMgr.kpiActive',kpiTotal:'campMgr.kpiTotal',kpiBudget:'campMgr.kpiBudget',kpiAvgRoas:'campMgr.kpiAvgRoas',colName:'campMgr.colName',colStatus:'campMgr.colStatus',colBudget:'campMgr.colBudget',colSpent:'campMgr.colSpent',colRoas:'campMgr.colRoas',colChannels:'campMgr.colChannels',colCreated:'campMgr.colCreated',colActions:'campMgr.colActions',filterAll:'campMgr.filterAll',filterActive:'campMgr.filterActive',filterPaused:'campMgr.filterPaused',filterDraft:'campMgr.filterDraft',filterEnded:'campMgr.filterEnded',filterPending:'campMgr.filterPending',noData:'campMgr.noData',goAutoMkt:'campMgr.goAutoMkt',searchPh:'campMgr.searchPh',close:'campMgr.close',pause:'campMgr.pause',resume:'campMgr.resume',save:'campMgr.save',cancel:'campMgr.cancel',edit:'campMgr.edit',delete:'campMgr.delete',duplicate:'campMgr.duplicate',confirmDelete:'campMgr.confirmDelete',impressions:'campMgr.impressions',clicks:'campMgr.clicks',conversions:'campMgr.conversions',roas:'campMgr.roas',channels:'campMgr.channels',source:'campMgr.source',topPerformer:'campMgr.topPerformer',byChannel:'campMgr.byChannel',byStatus:'campMgr.byStatus',budgetUtil:'campMgr.budgetUtil',budgetOverview:'campMgr.budgetOverview',roasRanking:'campMgr.roasRanking',campaignPerf:'campMgr.campaignPerf',funnelAnalysis:'campMgr.funnelAnalysis',statusActive:'campMgr.statusActive',statusPaused:'campMgr.statusPaused',statusDraft:'campMgr.statusDraft',statusEnded:'campMgr.statusEnded',statusPending:'campMgr.statusPending',editCampaign:'campMgr.editCampaign',campName:'campMgr.campName',campBudget:'campMgr.campBudget',campStatus:'campMgr.campStatus',abTestTitle:'campMgr.abTestTitle',abTestCreate:'campMgr.abTestCreate',abTestName:'campMgr.abTestName',abBaseline:'campMgr.abBaseline',abVariant:'campMgr.abVariant',abConfidence:'campMgr.abConfidence',abWinner:'campMgr.abWinner',abNoTest:'campMgr.abNoTest',abStart:'campMgr.abStart',totalBudget:'campMgr.totalBudget',totalSpent:'campMgr.totalSpent',guideTitle:'campMgr.guideTitle',guideSub:'campMgr.guideSub',guideStepsTitle:'campMgr.guideStepsTitle',guideStep1Title:'campMgr.guideStep1Title',guideStep1Desc:'campMgr.guideStep1Desc',guideStep2Title:'campMgr.guideStep2Title',guideStep2Desc:'campMgr.guideStep2Desc',guideStep3Title:'campMgr.guideStep3Title',guideStep3Desc:'campMgr.guideStep3Desc',guideStep4Title:'campMgr.guideStep4Title',guideStep4Desc:'campMgr.guideStep4Desc',guideStep5Title:'campMgr.guideStep5Title',guideStep5Desc:'campMgr.guideStep5Desc',guideStep6Title:'campMgr.guideStep6Title',guideStep6Desc:'campMgr.guideStep6Desc',guideTabsTitle:'campMgr.guideTabsTitle',guideTabOverviewName:'campMgr.guideTabOverviewName',guideTabOverviewDesc:'campMgr.guideTabOverviewDesc',guideTabListName:'campMgr.guideTabListName',guideTabListDesc:'campMgr.guideTabListDesc',guideTabAnalyticsName:'campMgr.guideTabAnalyticsName',guideTabAnalyticsDesc:'campMgr.guideTabAnalyticsDesc',guideTabABTestName:'campMgr.guideTabABTestName',guideTabABTestDesc:'campMgr.guideTabABTestDesc',guideTipsTitle:'campMgr.guideTipsTitle',guideTip1:'campMgr.guideTip1',guideTip2:'campMgr.guideTip2',guideTip3:'campMgr.guideTip3',guideTip4:'campMgr.guideTip4',guideTip5:'campMgr.guideTip5',guideStartBtn:'campMgr.guideStartBtn',abPlaceholder:'campMgr.abPlaceholder',abSelectNone:'campMgr.abSelectNone',abMetricLabel:'campMgr.abMetricLabel',abMetricCtr:'campMgr.abMetricCtr',abMetricCvr:'campMgr.abMetricCvr',abBaselineLabel:'campMgr.abBaselineLabel',abVariantLabel:'campMgr.abVariantLabel'};
const FB={[T.title]:'캠페인 관리',[T.sub]:'AI 마케팅 캠페인 생성·실행·성과 분석',[T.tabOverview]:'대시보드',[T.tabList]:'캠페인 목록',[T.tabAnalytics]:'성과 분석',[T.tabABTest]:'A/B 테스트',[T.kpiActive]:'진행 중',[T.kpiTotal]:'전체',[T.kpiBudget]:'총 예산',[T.kpiAvgRoas]:'평균 ROAS',[T.colName]:'캠페인명',[T.colStatus]:'상태',[T.colBudget]:'예산',[T.colSpent]:'집행액',[T.colRoas]:'ROAS',[T.colChannels]:'채널',[T.colCreated]:'생성일',[T.colActions]:'관리',[T.filterAll]:'전체',[T.filterActive]:'진행 중',[T.filterPaused]:'일시 중지',[T.filterDraft]:'초안',[T.filterEnded]:'종료',[T.filterPending]:'승인 대기',[T.noData]:'등록된 캠페인이 없습니다.',[T.goAutoMkt]:'새 캠페인 생성',[T.searchPh]:'캠페인 검색...',[T.close]:'닫기',[T.pause]:'일시 중지',[T.resume]:'재개',[T.save]:'저장',[T.cancel]:'취소',[T.edit]:'편집',[T.delete]:'삭제',[T.duplicate]:'복제',[T.confirmDelete]:'이 캠페인을 영구 삭제하시겠습니까?',[T.impressions]:'노출수',[T.clicks]:'클릭수',[T.conversions]:'전환수',[T.roas]:'ROAS',[T.channels]:'채널',[T.source]:'소스',[T.topPerformer]:'Top 캠페인',[T.byChannel]:'채널별 분포',[T.byStatus]:'상태 분포',[T.budgetUtil]:'예산 소진율',[T.budgetOverview]:'예산 배분 현황',[T.roasRanking]:'ROAS 순위',[T.campaignPerf]:'캠페인별 성과',[T.funnelAnalysis]:'퍼널 분석',[T.statusActive]:'진행 중',[T.statusPaused]:'일시 중지',[T.statusDraft]:'초안',[T.statusEnded]:'종료',[T.statusPending]:'승인 대기',[T.editCampaign]:'캠페인 편집',[T.campName]:'캠페인명',[T.campBudget]:'예산',[T.campStatus]:'상태',[T.abTestTitle]:'A/B 테스트 관리',[T.abTestCreate]:'새 A/B 테스트 생성',[T.abTestName]:'테스트명',[T.abBaseline]:'기준 캠페인 (A)',[T.abVariant]:'변형 캠페인 (B)',[T.abConfidence]:'신뢰도',[T.abWinner]:'승자',[T.abNoTest]:'등록된 A/B 테스트가 없습니다.',[T.abStart]:'테스트 시작',[T.totalBudget]:'총 예산',[T.totalSpent]:'총 집행액',[T.abPlaceholder]:'예: 여름 캠페인 A/B 비교',[T.abSelectNone]:'-- 선택 --',[T.abMetricLabel]:'비교 지표',[T.abMetricCtr]:'CTR (클릭률)',[T.abMetricCvr]:'CVR (전환율)',[T.abBaselineLabel]:'🅰️ 기준안 (A)',[T.abVariantLabel]:'🅱️ 변형안 (B)'};

const STS={active:{color:'#22c55e',bg:'rgba(34,197,94,0.10)',border:'rgba(34,197,94,0.25)',icon:'🟢'},paused:{color:'#f59e0b',bg:'rgba(245,158,11,0.10)',border:'rgba(245,158,11,0.25)',icon:'⏸'},draft:{color:'#64748b',bg:'rgba(100,116,139,0.10)',border:'rgba(100,116,139,0.25)',icon:'📝'},ended:{color:'#94a3b8',bg:'rgba(148,163,184,0.10)',border:'rgba(148,163,184,0.25)',icon:'✅'},pending:{color:'#a855f7',bg:'rgba(168,85,247,0.10)',border:'rgba(168,85,247,0.25)',icon:'⏳'}};
const fmtShort=v=>{if(v>=1e8)return(v/1e8).toFixed(1)+'억';if(v>=1e4)return(v/1e4).toFixed(0)+'만';return v?.toLocaleString?.()||'0';};

/* ═══ CARD STYLE (shared across all tabs) ═══════════════════ */
const CARD = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 16,
    padding: '20px 24px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

/* ═══ SVG CHARTS ════════════════════════════════════════════ */
function DonutChart({data,size=170,thickness=26,centerLabel,centerValue}){
    const total=data.reduce((s,d)=>s+d.value,0)||1;const r=(size-thickness)/2;const cx=size/2,cy=size/2;const circ=2*Math.PI*r;let offset=0;
    return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness}/>{data.map((d,i)=>{const p=d.value/total;const da=p*circ;const g=circ-da;const o=offset;offset+=p;return(<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${da} ${g}`} strokeDashoffset={-o*circ} transform={`rotate(-90 ${cx} ${cy})`} style={{transition:'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)',filter:`drop-shadow(0 2px 4px ${d.color}30)`}}/>);})}<text x={cx} y={cy-6} textAnchor="middle" fill="#334155" fontSize="22" fontWeight="900">{centerValue}</text><text x={cx} y={cy+12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">{centerLabel}</text></svg>);
}
function HBarChart({items,maxValue}){
    const mv=maxValue||Math.max(...items.map(i=>i.value),1);
    return(<div style={{ display:'flex', flexDirection:'column', gap:10 }}>{items.map((item,i)=>{const pct=Math.round((item.value/mv)*100);return(<div key={i}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:12, fontWeight:800, color:item.color||'#4f8ef7', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><span>{item.label}</span><span>{item.displayValue||item.value}</span></div><div style={{ height:8, background:'#f1f5f9', borderRadius:6, overflow:'hidden' }}><div style={{ width:pct+'%', height:'100%', borderRadius:6, background:item.gradient||`linear-gradient(90deg,${item.color||'#4f8ef7'},${item.colorEnd||item.color||'#6366f1'})`, transition:'width 0.8s cubic-bezier(.4,0,.2,1)' }}/></div></div>);})}</div>);
}
function FunnelChart({steps}){
    const max=Math.max(...steps.map(s=>s.value),1);
    return(<div style={{ display:'flex', flexDirection:'column', gap:2 }}>{steps.map((step,i)=>{const w=Math.max(30,Math.round((step.value/max)*100));const isLast=i===steps.length-1;return(<div key={i}><div style={{ width:w+'%', border:`1px solid ${step.color}25`, display:'flex', justifyContent:'space-between', alignItems:'center', transition:'width 0.6s', minWidth:200, padding:'8px 14px', borderRadius:8, background:`${step.color}08` }}><div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:18 }}>{step.icon}</span><span style={{ fontWeight:700, fontSize:13, color:'#334155' }}>{step.label}</span></div><div style={{ display:'flex', alignItems:'center', gap:10 }}><span style={{ fontWeight:900, fontSize:15, color:step.color }}>{step.value.toLocaleString()}</span>{i>0&&(<span style={{ fontSize:10, fontWeight:800, color:step.rateColor||'#22c55e', padding:'3px 10px', borderRadius:6, background:(step.rateColor||'#22c55e')+'12' }}>{step.rate}</span>)}</div></div>{!isLast&&<div style={{ width:2, height:6, background:'#e2e8f0', marginLeft:20 }}/>}</div>);})}</div>);
}
function Sparkline({values,color='#4f8ef7',width=80,height=28}){
    if(!values||values.length<2)return null;const max=Math.max(...values,1);const min=Math.min(...values,0);const range=max-min||1;const pts=values.map((v,i)=>`${(i/(values.length-1))*width},${height-((v-min)/range)*(height-4)-2}`).join(' ');
    return(<svg width={width} height={height} style={{ display:'block' }}><defs><linearGradient id={`sp-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sp-${color.replace('#','')})`}/><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

/* ═══ Modal ═════════════════════════════════════════════════ */
const Backdrop=({children,onClose})=>(<><div onClick={onClose} style={{ position:'fixed', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,0.98),#f0f5ff)', backdropFilter:'blur(4px)', zIndex:401, top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(94vw,680px)', maxHeight:'88vh', overflowY:'auto', borderRadius:18, border:'1px solid rgba(0,0,0,0.1)', padding:28, boxShadow:'0 24px 64px rgba(0,0,0,0.15)' }} /><div>{children}</div></>);
const INP={width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:13,color:'#1e293b',outline:'none'};
const SEL={...INP,cursor:'pointer'};
const LBL={fontSize:11,fontWeight:700,color:'#64748b',marginBottom:4,display:'block'};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — Layout matches AutoMarketing exactly
═══════════════════════════════════════════════════════════════ */
export default function CampaignManager(){
    const{t}=useI18n();
    const navigate=useNavigate();
    const{fmt}=useCurrency();
    const fmtW = useCallback((v) => fmt(v || 0), [fmt]);
    const{sharedCampaigns=[],updateCampaignStatus,updateCampaign,deleteCampaign,duplicateCampaign,addCampaign,abTestResults=[],addAbTestResult}=useGlobalData?.()||{};
    const[tab,setTab]=useState('overview');
    const[filter,setFilter]=useState('all');
    const[search,setSearch]=useState('');
    const[detailId,setDetailId]=useState(null);
    const[editId,setEditId]=useState(null);
    const[editForm,setEditForm]=useState({});
    const[deleteConfirmId,setDeleteConfirmId]=useState(null);
    const[showAbCreate,setShowAbCreate]=useState(false);
    const[abForm,setAbForm]=useState({name:'',baselineId:'',variantId:'',metric:'roas'});

    /* ── Scroll Isolation: suppress parent scroll, dashboard manages own ── */
    useEffect(() => {
        const appContent = document.querySelector('.app-content-area');
        const parent = appContent?.parentElement;
        if (parent) {
            const prev = parent.style.overflowY;
            parent.style.overflowY = 'hidden';
            return () => { parent.style.overflowY = prev; };
        }
    }, []);

    const tr=useCallback(key=>{const v=t(key);return v===key?(FB[key]||key):v;},[t]);
    const campaigns=useMemo(()=>{let list=sharedCampaigns||[];if(filter!=='all')list=list.filter(c=>c.status===filter);if(search){const q=search.toLowerCase();list=list.filter(c=>c.name?.toLowerCase().includes(q)||c.id?.toLowerCase().includes(q));}return list;},[sharedCampaigns,filter,search]);

    const stats=useMemo(()=>{
        const all=sharedCampaigns||[];const active=all.filter(c=>c.status==='active');
        const totalBudget=all.reduce((s,c)=>s+(c.budget||0),0);const totalSpent=all.reduce((s,c)=>s+(c.spent||0),0);
        const totalImpressions=all.reduce((s,c)=>s+(c.impressions||0),0);const totalClicks=all.reduce((s,c)=>s+(c.clicks||0),0);const totalConv=all.reduce((s,c)=>s+(c.conv||0),0);
        const activeRoas=active.filter(c=>c.roas>0);const avgRoas=activeRoas.length?(activeRoas.reduce((s,c)=>s+c.roas,0)/activeRoas.length).toFixed(1):'0';
        const byStatus={};all.forEach(c=>{byStatus[c.status]=(byStatus[c.status]||0)+1;});
        const byChannel={};all.forEach(c=>{(c.channels||[]).forEach(ch=>{const n=ch.name||ch.id;byChannel[n]=(byChannel[n]||0)+1;});});
        const top5=[...all].filter(c=>c.roas>0).sort((a,b)=>b.roas-a.roas).slice(0,5);
        const sortedByBudget=[...all].filter(c=>c.budget>0).sort((a,b)=>b.budget-a.budget).slice(0,8);
        return{total:all.length,active:active.length,totalBudget,totalSpent,avgRoas,totalImpressions,totalClicks,totalConv,byStatus,byChannel,top5,sortedByBudget,all};
    },[sharedCampaigns]);

    const detail=useMemo(()=>detailId?(sharedCampaigns||[]).find(c=>c.id===detailId):null,[detailId,sharedCampaigns]);
    const stsLabel=s=>({active:tr(T.statusActive),paused:tr(T.statusPaused),draft:tr(T.statusDraft),ended:tr(T.statusEnded),pending:tr(T.statusPending)}[s]||s);

    const openEdit=(c)=>{setEditId(c.id);setEditForm({name:c.name||'',budget:c.budget||0,status:c.status||'draft'});};
    const handleSaveEdit=()=>{if(editId&&updateCampaign){updateCampaign(editId,{name:editForm.name,budget:Number(editForm.budget),status:editForm.status});setEditId(null);}};
    const handleDelete=(id)=>{if(deleteCampaign){deleteCampaign(id);setDeleteConfirmId(null);setDetailId(null);}};
    const handleDuplicate=(id)=>{if(duplicateCampaign){duplicateCampaign(id);setDetailId(null);}};
    const handleCreateAbTest=()=>{
        if(!abForm.name||!abForm.baselineId||!abForm.variantId)return;
        const a=(sharedCampaigns||[]).find(c=>c.id===abForm.baselineId);const b=(sharedCampaigns||[]).find(c=>c.id===abForm.variantId);
        if(!a||!b)return;
        const aS=abForm.metric==='roas'?a.roas:abForm.metric==='ctr'?(a.impressions?(a.clicks/a.impressions*100):0):(a.clicks?(a.conv/a.clicks*100):0);
        const bS=abForm.metric==='roas'?b.roas:abForm.metric==='ctr'?(b.impressions?(b.clicks/b.impressions*100):0):(b.clicks?(b.conv/b.clicks*100):0);
        const winner=aS>=bS?'a':'b';const conf=Math.min(99,Math.round(60+Math.abs(aS-bS)*8));
        if(addAbTestResult){addAbTestResult({name:abForm.name,winner,confidence:conf,pValue:parseFloat(Math.max(0.001,(1-conf/100)).toFixed(3)),variants:[{id:'a',name:a.name,metric:abForm.metric,value:parseFloat(aS.toFixed(2))},{id:'b',name:b.name,metric:abForm.metric,value:parseFloat(bS.toFixed(2))}],source:'campaign_manager'});}
        setShowAbCreate(false);setAbForm({name:'',baselineId:'',variantId:'',metric:'roas'});
    };

    const TABS=[{id:'overview',label:tr(T.tabOverview),icon:'📊'},{id:'list',label:tr(T.tabList),icon:'📋'},{id:'analytics',label:tr(T.tabAnalytics),icon:'📈'},{id:'abtest',label:tr(T.tabABTest),icon:'🧪'},{id:'guide',label:tr(T.tabGuide),icon:'📖'}];
    const TAB_CLR={overview:'#4f8ef7',list:'#a855f7',analytics:'#22c55e',abtest:'#f97316',guide:'#06b6d4'};
    const FILTERS=[{id:'all',label:tr(T.filterAll)},{id:'active',label:tr(T.filterActive)},{id:'paused',label:tr(T.filterPaused)},{id:'draft',label:tr(T.filterDraft)},{id:'ended',label:tr(T.filterEnded)},{id:'pending',label:tr(T.filterPending)}];

    const donutData=useMemo(()=>Object.entries(stats.byStatus).map(([s,v])=>({value:v,color:(STS[s]||STS.draft).color,label:stsLabel(s)})),[stats.byStatus]);
    const channelDonut=useMemo(()=>{const colors=['#4f8ef7','#a855f7','#22c55e','#f97316','#06b6d4','#ef4444','#fbbf24','#6366f1'];return Object.entries(stats.byChannel).map(([ch,v],i)=>({value:v,color:colors[i%colors.length],label:ch}));},[stats.byChannel]);
    const funnel=useMemo(()=>[{label:tr(T.impressions),value:stats.totalImpressions,icon:'👁',color:'#4f8ef7'},{label:tr(T.clicks),value:stats.totalClicks,icon:'👆',color:'#a855f7',rate:stats.totalImpressions?(stats.totalClicks/stats.totalImpressions*100).toFixed(2)+'% CTR':'—',rateColor:'#a855f7'},{label:tr(T.conversions),value:stats.totalConv,icon:'🛒',color:'#22c55e',rate:stats.totalClicks?(stats.totalConv/stats.totalClicks*100).toFixed(2)+'% CVR':'—',rateColor:'#22c55e'}],[stats]);

    const ActBtn=({icon,label,color,onClick,small})=>(<button onClick={e=>{e.stopPropagation();onClick?.(); }} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:small?'4px 8px':'6px 12px', borderRadius:8, border:`1px solid ${color}30`, cursor:'pointer', background:`${color}08`, color, fontSize:small?10:11, fontWeight:700, transition:'all 0.15s', whiteSpace:'nowrap' }} onMouseEnter={e=>{e.currentTarget.style.background=`${color}18`;}} onMouseLeave={e=>{e.currentTarget.style.background=`${color}08`;}}>{icon} {label}</button>);

    /* ═══ CONTENT AREA — shared minHeight for ALL tabs ═══ */
    const CONTENT_MIN = 'calc(100vh - 145px)';

    return(
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1200, margin: '0 auto', width: '100%', height: 'calc(100vh - 54px)', overflow: 'hidden', color: 'var(--text-1, #1e293b)', background: 'transparent' }}>

            {/* ══════ FIXED HEADER AREA (Hero + Sub-tabs) ══════ */}
            <div style={{ flexShrink: 0 }}>
                {/* ── Hero Header ── */}
                <div className="hero" style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border, rgba(99,140,255,0.1))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #f97316, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 14px rgba(249,115,22,0.3)', flexShrink: 0 }}>🎯</div>
                            <div style={{ minWidth: 0 }}>
                                <div className="hero-title" style={{ fontSize: 19, fontWeight: 900, color: '#f97316', letterSpacing: '-0.3px', lineHeight: 1.3 }}>{tr(T.title)}</div>
                                <div className="hero-desc" style={{ fontSize: 11, color: 'var(--text-3, #64748b)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr(T.sub)}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <button onClick={()=>navigate('/auto-marketing')} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.25)', cursor: 'pointer', background: 'rgba(168,85,247,0.06)', color: '#a855f7', fontSize: 11, fontWeight: 700 }}>🚀 {tr(T.goAutoMkt)}</button>
                        </div>
                    </div>
                </div>

                {/* ── Sub-Tab Navigation (fixed, always visible) ── */}
                <div className="sub-tab-nav" style={{ padding: '8px 14px', background: 'var(--bg, rgba(245,247,250,0.97))', borderBottom: '1px solid var(--border, rgba(99,140,255,0.1))', backdropFilter: 'blur(12px)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'var(--surface, rgba(241,245,249,0.7))', border: '1px solid var(--border, rgba(99,140,255,0.1))', borderRadius: 12, padding: '6px 8px' }}>
                        {TABS.map(tb => {
                            const active = tab === tb.id;
                            const c = TAB_CLR[tb.id];
                            return (
                                <button key={tb.id} onClick={() => setTab(tb.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)', background: active ? c : 'transparent', color: active ? '#ffffff' : 'var(--text-2, #64748b)', boxShadow: active ? `0 3px 14px ${c}40` : 'none', transform: active ? 'translateY(-1px)' : 'none' }}>{tb.icon} {tb.label}</button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══════ SCROLLABLE CONTENT AREA ══════ */}
            <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 8px 28px' }}>

            {/* ══════ DASHBOARD ══════════════════════════════════ */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 16, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                    {/* KPI Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {[{label:tr(T.kpiActive),value:stats.active,icon:'🟢',color:'#22c55e',spark:(stats.all||[]).filter(c=>c.status==='active').map(c=>c.roas||0)},{label:tr(T.kpiTotal),value:stats.total,icon:'📊',color:'#4f8ef7',spark:[stats.total,stats.active,stats.total-stats.active]},{label:tr(T.kpiBudget),value:fmt(stats.totalBudget,{compact:true}),icon:'💰',color:'#a855f7',spark:(stats.sortedByBudget||[]).map(c=>c.budget)},{label:tr(T.kpiAvgRoas),value:stats.avgRoas+'x',icon:'📈',color:'#f97316',spark:(stats.top5||[]).map(c=>c.roas)}].map(({label,value,icon,color,spark}) => (
                            <div key={label} style={{ ...CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color, letterSpacing: '-0.5px' }} >{icon} {label}</div><div>{value}</div></div>
                                <Sparkline values={spark.length > 1 ? spark : [0, 1]} color={color} width={70} height={30} />
                            </div>
                        ))}
                    </div>
                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>📋 {tr(T.byStatus)}</div>
                            <DonutChart data={donutData.length ? donutData : [{value: 1, color: '#e2e8f0'}]} centerLabel={tr(T.kpiTotal)} centerValue={stats.total} />
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>{donutData.map(d => (<div key={d.label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#64748b', fontWeight:600 }}><div style={{ width:8, height:8, borderRadius:4, background:d.color }}/><span>{d.label} ({d.value})</span></div>))}</div>
                        </div>
                        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>📡 {tr(T.byChannel)}</div>
                            <DonutChart data={channelDonut.length ? channelDonut : [{value: 1, color: '#e2e8f0'}]} centerLabel={tr(T.channels)} centerValue={Object.keys(stats.byChannel).length} />
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>{channelDonut.map(d => (<div key={d.label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#64748b', fontWeight:600 }}><div style={{ width:8, height:8, borderRadius:4, background:d.color }}/><span>{d.label}</span></div>))}</div>
                        </div>
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>🔻 {tr(T.funnelAnalysis)}</div>
                            <FunnelChart steps={funnel} />
                        </div>
                    </div>
                    {/* Budget + Top */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>💰 {tr(T.budgetOverview)}</div>
                            {stats.sortedByBudget.length > 0 ? <HBarChart items={stats.sortedByBudget.map(c => ({label: c.name, value: c.budget, displayValue: fmtW(c.budget), color: c.roas >= 5 ? '#22c55e' : c.roas >= 3 ? '#4f8ef7' : '#f59e0b', colorEnd: c.roas >= 5 ? '#14d9b0' : c.roas >= 3 ? '#6366f1' : '#f97316'}))} /> : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(T.noData)}</div>}
                        </div>
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>🏆 {tr(T.topPerformer)}</div>
                            {stats.top5.length > 0 ? <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{stats.top5.map((c, i) => (<div key={c.id} onClick={() => setDetailId(c.id)} style={{ padding:'10px 14px', borderRadius:12, cursor:'pointer', background: i===0 ? 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(249,115,22,0.04))' : 'rgba(0,0,0,0.02)', border:`1px solid ${i===0 ? 'rgba(251,191,36,0.2)' : 'rgba(0,0,0,0.05)'}`, transition:'all 0.15s' }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><div style={{ fontWeight:800, fontSize:13, color:'#334155' }}>{'🥇🥈🥉4️⃣5️⃣'.substring(i*2,i*2+2)} {c.name}</div><div style={{ fontWeight:900, fontSize:15, color:'#f97316' }}>{c.roas}x</div></div><div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{fmtW(c.spent)} / {fmtW(c.budget)}</div></div>))}</div> : <div style={{ fontSize:12, color:'#94a3b8', textAlign:'center', padding:30 }}>{tr(T.noData)}</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ LIST ══════════════════════════════════════ */}
            {tab === 'list' && (
                <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                    {/* Search + Filter */}
                    <div style={CARD}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr(T.searchPh)} style={{ flex: 1, minWidth: 200, ...INP }} />
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {FILTERS.map(f => (<button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f.id ? '#4f8ef7' : 'transparent', color: filter === f.id ? '#fff' : '#64748b', border: filter === f.id ? 'none' : '1px solid #e2e8f0' }}>{f.label}</button>))}
                            </div>
                        </div>
                    </div>
                    {/* Table */}
                    <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 130px 60px 100px 90px 130px', gap: 6, padding: '14px 20px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                            <span>{tr(T.colName)}</span><span>{tr(T.colStatus)}</span><span style={{ textAlign:'center' }} >{tr(T.colBudget)}</span><span>{tr(T.colSpent)}</span><span>{tr(T.colRoas)}</span><span>{tr(T.colChannels)}</span><span>{tr(T.colCreated)}</span><span>{tr(T.colActions)}</span>
                        </div>
                        {campaigns.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '10px 24px', fontSize: 13, marginBottom: 16, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#4f8ef7)', fontWeight: 700 }} ><div>📭</div><div>{tr(T.noData)}</div><button onClick={() => navigate('/auto-marketing')}>🚀 {tr(T.goAutoMkt)}</button></div>
                        ) : campaigns.map(c => {
                            const cfg = STS[c.status] || STS.draft;
                            const pct = c.budget ? Math.min(100, Math.round((c.spent || 0) / c.budget * 100)) : 0;
                            return (
                                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 130px 60px 100px 90px 130px', gap: 6, padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.15s', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div onClick={() => setDetailId(c.id)} style={{ cursor: 'pointer', fontSize: 9, fontWeight: 700, color: '#b0b9c5', marginBottom: 1, fontFamily: 'monospace' }} ><div>{c.name}</div><div>{c.id}</div></div>
                                    <div><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>{cfg.icon} {stsLabel(c.status)}</span></div>
                                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#334155' }}>{fmtW(c.budget)}</div>
                                    <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#94a3b8', height: '100%', background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e', borderRadius: 2, marginTop: 1, width: pct + '%', transition: 'width 0.5s' }} ><div>{fmtW(c.spent)}</div><div><div/></div><div>{pct}%</div></div>
                                    <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: c.roas >= 4 ? '#22c55e' : c.roas >= 2 ? '#f59e0b' : '#ef4444' }}>{c.roas > 0 ? c.roas + 'x' : '—'}</div>
                                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', fontWeight: 600 }} >{(c.channels || []).slice(0, 2).map((ch, i) => (<span key={i}>{ch.name || ch.id}</span>))}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{c.createdAt}</div>
                                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <ActBtn icon="✏️" label={tr(T.edit)} color="#4f8ef7" onClick={() => openEdit(c)} small />
                                        <ActBtn icon="📋" label={tr(T.duplicate)} color="#22c55e" onClick={() => handleDuplicate(c.id)} small />
                                        <ActBtn icon="🗑️" label={tr(T.delete)} color="#ef4444" onClick={() => setDeleteConfirmId(c.id)} small />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════ ANALYTICS ═════════════════════════════════ */}
            {tab === 'analytics' && (
                <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                    {/* KPI Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {[{label:tr(T.impressions),value:stats.totalImpressions.toLocaleString(),icon:'👁',color:'#4f8ef7'},{label:tr(T.clicks),value:stats.totalClicks.toLocaleString(),icon:'👆',color:'#a855f7'},{label:tr(T.conversions),value:stats.totalConv.toLocaleString(),icon:'🛒',color:'#22c55e'},{label:tr(T.roas),value:stats.avgRoas+'x',icon:'📈',color:'#f97316'}].map(({label,value,icon,color}) => (
                            <div key={label} style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
                                <div><div style={{ fontSize: 20, fontWeight: 900, color }} >{label}</div><div>{value}</div></div>
                            </div>
                        ))}
                    </div>
                    {/* Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>🏅 {tr(T.roasRanking)}</div>
                            {(sharedCampaigns || []).filter(c => c.roas > 0).length > 0 ? <HBarChart items={(sharedCampaigns || []).filter(c => c.roas > 0).sort((a, b) => b.roas - a.roas).slice(0, 8).map(c => ({label: c.name, value: c.roas, displayValue: c.roas + 'x', color: c.roas >= 5 ? '#22c55e' : c.roas >= 3 ? '#4f8ef7' : '#f59e0b', colorEnd: c.roas >= 5 ? '#14d9b0' : c.roas >= 3 ? '#6366f1' : '#f97316'}))} maxValue={Math.max(...(sharedCampaigns || []).map(c => c.roas || 0), 1)} /> : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(T.noData)}</div>}
                        </div>
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>📊 {tr(T.budgetUtil)}</div>
                            {(sharedCampaigns || []).filter(c => c.budget > 0).length > 0 ? <HBarChart items={(sharedCampaigns || []).filter(c => c.budget > 0).sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget)).slice(0, 8).map(c => { const pct = Math.round((c.spent || 0) / c.budget * 100); return {label: c.name, value: pct, displayValue: pct + '%', color: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e', colorEnd: pct > 90 ? '#f97316' : pct > 70 ? '#fbbf24' : '#14d9b0'}; })} maxValue={100} /> : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(T.noData)}</div>}
                        </div>
                    </div>
                    {/* Performance Table */}
                    <div style={CARD}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>📊 {tr(T.campaignPerf)}</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead><tr style={{ borderBottom: '2px solid #e2e8f0', padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11 }} >{[tr(T.colName), tr(T.colStatus), tr(T.impressions), tr(T.clicks), 'CTR', tr(T.conversions), 'CVR', tr(T.roas)].map(h => (<th key={h}>{h}</th>))}</tr></thead>
                                <tbody>{(sharedCampaigns || []).filter(c => c.impressions > 0).sort((a, b) => b.roas - a.roas).map(c => { const cfg = STS[c.status] || STS.draft; const ctr = c.impressions ? ((c.clicks || 0) / c.impressions * 100).toFixed(2) : '0'; const cvr = c.clicks ? ((c.conv || 0) / c.clicks * 100).toFixed(2) : '0'; return (<tr key={c.id} onClick={() => setDetailId(c.id)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s', padding: '10px 12px', fontWeight: 900, color: c.roas >= 5 ? '#22c55e' : c.roas >= 3 ? '#4f8ef7' : '#f59e0b', borderRadius: 6, fontSize: 14, background: cfg.bg }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><td>{c.name}</td><td><span>{stsLabel(c.status)}</span></td><td>{(c.impressions || 0).toLocaleString()}</td><td>{(c.clicks || 0).toLocaleString()}</td><td>{ctr}%</td><td>{(c.conv || 0).toLocaleString()}</td><td>{cvr}%</td><td>{c.roas}x</td></tr>); })}</tbody>
                            </table>
                            {(sharedCampaigns || []).filter(c => c.impressions > 0).length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(T.noData)}</div>}
                        </div>
                    </div>
                    {/* Funnel */}
                    <div style={CARD}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>🔻 {tr(T.funnelAnalysis)}</div>
                        <FunnelChart steps={funnel} />
                    </div>
                </div>
            )}

            {/* ══════ A/B TEST ══════════════════════════════════ */}
            {tab === 'abtest' && (
                <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                    {/* Header */}
                    <div style={{ ...CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#334155' }}>🧪 {tr(T.abTestTitle)}</div>
                        <button onClick={() => setShowAbCreate(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontWeight: 700, fontSize: 12, boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>+ {tr(T.abTestCreate)}</button>
                    </div>
                    {/* Tests */}
                    {(abTestResults || []).length === 0 ? (
                        <div style={{ ...CARD, textAlign: 'center', padding: '10px 24px', fontSize: 13, marginBottom: 16, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ef4444)', fontWeight: 700 }} ><div>🧪</div><div>{tr(T.abNoTest)}</div><button onClick={() => setShowAbCreate(true)}>+ {tr(T.abTestCreate)}</button></div>
                    ) : (abTestResults || []).map(test => (
                        <div key={test.id} style={CARD}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div><div style={{ fontWeight: 800, fontSize: 10, color: '#94a3b8', marginTop: 2 }} >{test.name}</div><div>{test.completedAt} · {test.source}</div></div>
                                <div style={{ padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: 11, background: test.confidence >= 90 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: test.confidence >= 90 ? '#22c55e' : '#f59e0b', border: `1px solid ${test.confidence >= 90 ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}` }}>{tr(T.abConfidence)}: {test.confidence}%</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                {(test.variants || []).map((v, i) => {
                                    const isWinner = test.winner === v.id;
                                    return (<div key={v.id} style={{ padding: '16px 20px', borderRadius: 14, background: isWinner ? 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(20,217,176,0.04))' : 'rgba(0,0,0,0.02)', border: `2px solid ${isWinner ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.06)'}`, position: 'relative' }}>
                                        {isWinner && <div style={{ position: 'absolute', top: -8, right: 12, padding: '2px 10px', borderRadius: 6, background: '#22c55e', color: '#fff', fontSize: 9, fontWeight: 800 }}>🏆 {tr(T.abWinner)}</div>}
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>{i === 0 ? tr(T.abBaselineLabel) : tr(T.abVariantLabel)}</div>
                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>{v.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 10, color: '#7a90ad', fontWeight: 600 }}>{v.metric?.toUpperCase()}</span>
                                            <span style={{ fontWeight: 900, fontSize: 20, color: isWinner ? '#22c55e' : '#64748b' }}>{v.value}{v.metric === 'roas' ? 'x' : '%'}</span>
                                        </div>
                                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                                            <div style={{ width: Math.min(100, Math.round(v.value / Math.max(...(test.variants || []).map(x => x.value || 1)) * 100)) + '%', height: '100%', borderRadius: 4, background: isWinner ? 'linear-gradient(90deg,#22c55e,#14d9b0)' : 'linear-gradient(90deg,#94a3b8,#cbd5e1)', transition: 'width 0.6s' }}/>
                                        </div>
                                    </div>);
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#7a90ad' }}>
                                <span>p-value: <strong style={{ color: '#334155' }}>{test.pValue}</strong></span>
                                <span>|</span>
                                <span>{tr(T.abConfidence)}: <strong style={{ color: test.confidence >= 95 ? '#22c55e' : test.confidence >= 80 ? '#f59e0b' : '#ef4444' }}>{test.confidence}%</strong></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ══ TAB: GUIDE ════════════════════════════════════════ */}
            {tab==='guide'&&(
                <div className="guide-section" style={{ display:'flex', flexDirection:'column', gap:20, minHeight:CONTENT_MIN, alignContent:'start', color:'#1e293b' }}>
                    <div style={{ ...CARD, background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', border:'1px solid rgba(79,142,247,0.3)', textAlign:'center', padding:32, color:'#1e293b' }}>
                        <div style={{ fontSize:44 }}>🎯</div>
                        <div style={{ fontWeight:900, fontSize:22, color:'#1e293b', marginTop:8 }}>{tr(T.guideTitle)}</div>
                        <div className="guide-sub" style={{ fontSize:13, color:'#475569', marginTop:6, maxWidth:560, margin:'6px auto 0', lineHeight:1.7 }}>{tr(T.guideSub)}</div>
                        <button className="guide-cta" onClick={()=>setTab('overview')} style={{ marginTop:16, padding:'12px 28px', borderRadius:12, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4f8ef7,#a855f7)', color:'#fff', fontWeight:800, fontSize:14 }}>{tr(T.guideStartBtn)}</button>
                    </div>
                    <div style={{ ...CARD, color:'#1e293b' }}>
                        <div style={{ fontWeight:800, fontSize:17, color:'#1e293b', marginBottom:16 }}>📚 {tr(T.guideStepsTitle)}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                            {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},{n:'4️⃣',k:'guideStep4',c:'#f59e0b'},{n:'5️⃣',k:'guideStep5',c:'#f97316'},{n:'6️⃣',k:'guideStep6',c:'#06b6d4'}].map((s,i)=>(
                                <div key={i} style={{ background:s.c+'0a', border:`1px solid ${s.c}25`, borderRadius:12, padding:16, color:'#1e293b' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                        <span style={{ fontSize:20 }}>{s.n}</span>
                                        <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{tr(T[s.k+'Title'])}</span>
                                    </div>
                                    <div className="guide-desc" style={{ fontSize:12, color:'#475569', lineHeight:1.7 }}>{tr(T[s.k+'Desc'])}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ ...CARD, color:'#1e293b' }}>
                        <div style={{ fontWeight:800, fontSize:17, color:'#1e293b', marginBottom:16 }}>{tr(T.guideTabsTitle)}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                            {[{icon:'📊',k:'guideTabOverview',c:'#4f8ef7'},{icon:'📋',k:'guideTabList',c:'#a855f7'},{icon:'📈',k:'guideTabAnalytics',c:'#22c55e'},{icon:'🧪',k:'guideTabABTest',c:'#f97316'}].map((tb,i)=>(
                                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px', background:'rgba(255,255,255,0.6)', borderRadius:10, border:'1px solid rgba(0,0,0,0.06)', color:'#1e293b' }}>
                                    <span style={{ fontSize:22, flexShrink:0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:13, color:tb.c }}>{tr(T[tb.k+'Name'])}</div>
                                        <div className="guide-desc" style={{ fontSize:11, color:'#475569', marginTop:3, lineHeight:1.6 }}>{tr(T[tb.k+'Desc'])}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ ...CARD, background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.3)', color:'#1e293b' }}>
                        <div style={{ fontWeight:800, fontSize:17, color:'#1e293b', marginBottom:12 }}>💡 {tr(T.guideTipsTitle)}</div>
                        <ul className="guide-tip-list" style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'#475569', lineHeight:2.2 }}>
                            <li style={{ color:'#475569' }}>{tr(T.guideTip1)}</li>
                            <li style={{ color:'#475569' }}>{tr(T.guideTip2)}</li>
                            <li style={{ color:'#475569' }}>{tr(T.guideTip3)}</li>
                            <li style={{ color:'#475569' }}>{tr(T.guideTip4)}</li>
                            <li style={{ color:'#475569' }}>{tr(T.guideTip5)}</li>
                        </ul>
                    </div>
                </div>
            )}

            </div>{/* end scrollable content */}

            {/* ══ Detail Modal ═══════════════════════════════ */}
            {detail && (<Backdrop onClose={() => setDetailId(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div><div style={{ fontWeight: 900, fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }} >{detail.name}</div><div>{detail.id}</div></div>
                    <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
                    {[{l:tr(T.totalBudget),v:fmtW(detail.budget),c:'#4f8ef7'},{l:tr(T.totalSpent),v:fmtW(detail.spent),c:'#a855f7'},{l:tr(T.roas),v:(detail.roas||0)+'x',c:'#22c55e'},{l:tr(T.impressions),v:(detail.impressions||0).toLocaleString(),c:'#06b6d4'},{l:tr(T.clicks),v:(detail.clicks||0).toLocaleString(),c:'#f59e0b'},{l:tr(T.conversions),v:(detail.conv||0).toLocaleString(),c:'#f97316'}].map(({l,v,c})=>(<div key={l} style={{ padding:'10px 12px', borderRadius:10, background:'rgba(0,0,0,0.03)', fontSize:16, color:c, fontWeight:800 }} ><div>{l}</div><div>{v}</div></div>))}
                </div>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#4f8ef7', display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 12px', borderRadius: 8, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }} ><div>{tr(T.channels)}</div><div>{(detail.channels || []).map((ch, i) => (<div key={i}>{ch.name || ch.id} ({fmtW(ch.budget)})</div>))}</div></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {detail.status === 'active' && updateCampaignStatus && (<button onClick={() => { updateCampaignStatus(detail.id, 'paused'); setDetailId(null); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontWeight: 800, fontSize: 13 }}>⏸ {tr(T.pause)}</button>)}
                    {detail.status === 'paused' && updateCampaignStatus && (<button onClick={() => { updateCampaignStatus(detail.id, 'active'); setDetailId(null); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#14d9b0)', color: '#fff', fontWeight: 800, fontSize: 13 }}>▶ {tr(T.resume)}</button>)}
                    <ActBtn icon="✏️" label={tr(T.edit)} color="#4f8ef7" onClick={() => { setDetailId(null); openEdit(detail); }} />
                    <ActBtn icon="📋" label={tr(T.duplicate)} color="#22c55e" onClick={() => handleDuplicate(detail.id)} />
                    <ActBtn icon="🗑️" label={tr(T.delete)} color="#ef4444" onClick={() => { setDetailId(null); setDeleteConfirmId(detail.id); }} />
                    <button onClick={() => setDetailId(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(T.close)}</button>
                </div>
            </Backdrop>)}

            {/* ══ Edit Modal ═════════════════════════════════ */}
            {editId && (<Backdrop onClose={() => setEditId(null)}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', marginBottom: 20 }}>✏️ {tr(T.editCampaign)}</div>
                <div style={{ display: 'grid', gap: 16 }}>
                    <div><label style={LBL}>{tr(T.campName)}</label><input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} style={INP} /></div>
                    <div><label style={LBL}>{tr(T.campBudget)}</label><input type="number" value={editForm.budget} onChange={e => setEditForm(p => ({...p, budget: e.target.value}))} style={INP} /></div>
                    <div><label style={LBL}>{tr(T.campStatus)}</label><select value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value}))} style={SEL}>{['active', 'paused', 'draft', 'ended', 'pending'].map(s => (<option key={s} value={s}>{stsLabel(s)}</option>))}</select></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                    <button onClick={handleSaveEdit} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13 }}>💾 {tr(T.save)}</button>
                    <button onClick={() => setEditId(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(T.cancel)}</button>
                </div>
            </Backdrop>)}

            {/* ══ Delete Confirm ════════════════════════════ */}
            {deleteConfirmId && (<Backdrop onClose={() => setDeleteConfirmId(null)}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>{tr(T.confirmDelete)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>{(sharedCampaigns || []).find(c => c.id === deleteConfirmId)?.name || deleteConfirmId}</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => handleDelete(deleteConfirmId)} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>🗑️ {tr(T.delete)}</button>
                        <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(T.cancel)}</button>
                    </div>
                </div>
            </Backdrop>)}

            {/* ══ A/B Test Create Modal ═════════════════════ */}
            {showAbCreate && (<Backdrop onClose={() => setShowAbCreate(false)}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', marginBottom: 20 }}>🧪 {tr(T.abTestCreate)}</div>
                <div style={{ display: 'grid', gap: 16 }}>
                    <div><label style={LBL}>{tr(T.abTestName)}</label><input value={abForm.name} onChange={e => setAbForm(p => ({...p, name: e.target.value}))} placeholder={tr(T.abPlaceholder)} style={INP} /></div>
                    <div><label style={LBL}>{tr(T.abBaseline)}</label><select value={abForm.baselineId} onChange={e => setAbForm(p => ({...p, baselineId: e.target.value}))} style={SEL}><option value="">{tr(T.abSelectNone)}</option>{(sharedCampaigns || []).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                    <div><label style={LBL}>{tr(T.abVariant)}</label><select value={abForm.variantId} onChange={e => setAbForm(p => ({...p, variantId: e.target.value}))} style={SEL}><option value="">{tr(T.abSelectNone)}</option>{(sharedCampaigns || []).filter(c => c.id !== abForm.baselineId).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
                    <div><label style={LBL}>{tr(T.abMetricLabel)}</label><select value={abForm.metric} onChange={e => setAbForm(p => ({...p, metric: e.target.value}))} style={SEL}><option value="roas">ROAS</option><option value="ctr">{tr(T.abMetricCtr)}</option><option value="cvr">{tr(T.abMetricCvr)}</option></select></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                    <button onClick={handleCreateAbTest} disabled={!abForm.name || !abForm.baselineId || !abForm.variantId} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: !abForm.name || !abForm.baselineId || !abForm.variantId ? '#e2e8f0' : 'linear-gradient(135deg,#f97316,#ef4444)', color: !abForm.name || !abForm.baselineId || !abForm.variantId ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: 13 }}>🧪 {tr(T.abStart)}</button>
                    <button onClick={() => setShowAbCreate(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(T.cancel)}</button>
                </div>
            </Backdrop>)}
        </div>
    );
}
