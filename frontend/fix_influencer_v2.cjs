/* Rebuild InfluencerUGC main component to match SMS Marketing layout */
const fs=require('fs');
const file=__dirname+'/src/pages/InfluencerUGC.jsx';
let s=fs.readFileSync(file,'utf8');

// Find the main export function and replace it entirely
const exportIdx=s.indexOf('export default function InfluencerUGC()');
if(exportIdx<0){console.log('ERR: export not found');process.exit(1);}

const beforeExport=s.substring(0,exportIdx);

// Build the new main component matching SMS Marketing style exactly
const newMain=`export default function InfluencerUGC() {
    const { creators: CREATORS = [], ugcReviews = [], channelStats = [], negKeywords = [] } = useGlobalData();
    const { t } = useI18n();
    const { alert: hackAlert, clearAlert: clearHack } = useInfluencerSecurity();
    const { fmt } = useCurrency();
    const [tab, setTab] = useState("identity");

    useInfluencerDataSync();

    const anomalyCount = CREATORS.filter(c =>
        c.contract?.esign === "pending" ||
        (c.contract?.whitelist && daysLeft(c.contract?.whitelistExpiry) < 0) ||
        c.settle?.status === "overpaid" || c.settle?.status === "unpaid"
    ).length;

    const TABS=useMemo(()=>[
        {id:'identity',label:'\\ud83e\\uddd1 '+(t('influencer.tab_identity','크리에이터 통합'))},
        {id:'contract',label:'\\ud83d\\udcdd '+(t('influencer.tab_contract','계약 & 화이트리스트'))},
        {id:'settle',label:'\\ud83d\\udcb0 '+(t('influencer.tab_settle','정산 & 검증'))},
        {id:'roi',label:'\\ud83c\\udfc6 '+(t('influencer.tab_roi','ROI 랭킹'))},
        {id:'ugc',label:'\\u2b50 '+(t('influencer.tab_ugc','UGC 리뷰'))},
        {id:'ai_eval',label:'\\ud83e\\udd16 '+(t('influencer.tab_ai_eval','AI 평가 분석'))},
        {id:'guide',label:'\\ud83d\\udcd6 '+(t('influencer.tab_guide','이용 가이드'))},
    ],[t]);

    const C={accent:"#6366f1",green:"#22c55e",red:"#ef4444",yellow:"#eab308",purple:"#a855f7",cyan:"#06b6d4"};

    return (
        <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
            {/* Security Alert */}
            {hackAlert && (
                <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:99999,
                    background:'rgba(239,68,68,0.95)',backdropFilter:'blur(10px)',border:'1px solid #fca5a5',
                    padding:'16px 24px',borderRadius:12,color:'#fff',fontWeight:900,fontSize:13,
                    boxShadow:'0 20px 40px rgba(220,38,38,0.4)',display:'flex',alignItems:'center',gap:14}}>
                    <span style={{fontSize:24}}>\\ud83d\\udee1\\ufe0f</span>
                    <span>{hackAlert}</span>
                    <button onClick={clearHack} style={{marginLeft:20,background:'rgba(0,0,0,0.3)',border:'none',color:'#fff',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontWeight:700}}>
                        {t('influencer.dismiss','닫기')}
                    </button>
                </div>
            )}

            {/* Sync Bar — same as SMS */}
            <div style={{padding:'6px 12px',borderRadius:8,background:'rgba(99,102,241,0.04)',border:'1px solid rgba(99,102,241,0.12)',
                fontSize:10,color:'#6366f1',fontWeight:600,display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite'}}/>
                {t('influencer.liveSyncMsg','실시간 크로스탭 동기화 활성')}
            </div>

            {/* Hero — exactly like SMS Marketing */}
            <div style={{borderRadius:16,background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.08)',padding:'22px 28px',marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
                    <div>
                        <div style={{fontSize:24,fontWeight:900,color:'#1f2937'}}>\\ud83e\\udd1d {t('influencer.title','인플루언서·UGC 허브')}</div>
                        <div style={{fontSize:13,color:'#6b7280',marginTop:4}}>{t('influencer.subtitle','크리에이터 정체성 통합 · 계약 관리 · 자동 정산 · ROI 랭킹 · 콘텐츠 재활용')}</div>
                        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'#6366f118',color:'#6366f1',border:'1px solid #6366f133',fontWeight:700}}>
                                {t('influencer.totalCreators','크리에이터')} {CREATORS.length}
                            </span>
                            {anomalyCount>0&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'#ef444418',color:'#ef4444',border:'1px solid #ef444433',fontWeight:700}}>
                                \\u26a0 {t('influencer.reviewReq','검토 필요')} {anomalyCount}
                            </span>}
                            <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'#06b6d418',color:'#06b6d4',border:'1px solid #06b6d433',fontWeight:700}}>
                                \\ud83d\\udee1\\ufe0f Security Active
                            </span>
                        </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                        {[
                            {l:t('influencer.totalCreators','크리에이터'),v:CREATORS.length,c:'#6366f1'},
                            {l:t('influencer.connectedPlatforms','연동 플랫폼'),v:CREATORS.reduce((s,c)=>s+c.identities.length,0),c:'#22c55e'},
                            {l:t('influencer.dupSuspected','이상 감지'),v:anomalyCount,c:'#ef4444'}
                        ].map(k=>(
                            <div key={k.l} style={{padding:'8px 14px',borderRadius:10,background:k.c+'10',border:'1px solid '+k.c+'22',textAlign:'center'}}>
                                <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.v}</div>
                                <div style={{fontSize:10,color:'#6b7280'}}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs — same style as SMS Marketing */}
            <div style={{display:'flex',gap:4,padding:5,background:'rgba(0,0,0,0.04)',borderRadius:14,overflowX:'auto',flexShrink:0,marginBottom:12}}>
                {TABS.map(tb=>(
                    <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                        padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,flex:1,whiteSpace:'nowrap',
                        background:tab===tb.id?C.accent:'transparent',color:tab===tb.id?'#fff':'#4b5563',transition:'all 150ms'
                    }}>{tb.label}</button>
                ))}
            </div>

            {/* Content — scrollable area */}
            <div style={{flex:1,overflowY:'auto',paddingBottom:20}}>
                {tab === "identity" && <IdentityTab />}
                {tab === "contract" && <ContractTab />}
                {tab === "settle" && <SettleTab />}
                {tab === "roi" && <ROITab />}
                {tab === "ugc" && <UGCTab />}
                {tab === "ai_eval" && <AIEvalTab />}
                {tab === "guide" && <InfluencerGuideTab />}
            </div>
        </div>
    );
}
`;

s = beforeExport + newMain;
fs.writeFileSync(file, s, 'utf8');
console.log('InfluencerUGC main rebuilt SMS-style. Size:', s.length);
