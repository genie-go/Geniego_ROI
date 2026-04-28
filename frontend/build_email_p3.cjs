const fs = require('fs');
const code = `
/* Analytics Tab */
function AnalyticsTab() {
    const {t}=useI18n();
    const {emailCampaignsLinked}=useGlobalData();
    const analytics=useMemo(()=>{
        const sentC=emailCampaignsLinked.filter(c=>c.status==='sent');
        const totalSent=sentC.reduce((s,c)=>s+(c.total_sent||0),0);
        const totalOpened=sentC.reduce((s,c)=>s+(c.opened||0),0);
        const totalClicked=sentC.reduce((s,c)=>s+(c.clicked||0),0);
        const totalFailed=sentC.reduce((s,c)=>s+(c.failed||0),0);
        const bySegment={};
        sentC.forEach(c=>{const seg=c.targetSegmentName||c.segment_name||'All';if(!bySegment[seg])bySegment[seg]={sent:0,opened:0,clicked:0,campaigns:0};bySegment[seg].sent+=(c.total_sent||0);bySegment[seg].opened+=(c.opened||0);bySegment[seg].clicked+=(c.clicked||0);bySegment[seg].campaigns+=1;});
        return {totalSent,totalOpened,totalClicked,totalFailed,sentCount:sentC.length,bySegment};
    },[emailCampaignsLinked]);
    const overallOpen=analytics.totalSent>0?(analytics.totalOpened/analytics.totalSent*100).toFixed(1):"0";
    const overallClick=analytics.totalSent>0?(analytics.totalClicked/analytics.totalSent*100).toFixed(1):"0";
    const deliveryRate=analytics.totalSent>0?((analytics.totalSent-analytics.totalFailed)/analytics.totalSent*100).toFixed(1):"100";
    return (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                <KpiBadge icon="📤" label={t('email.anTotalSent')||"Total Sent"} value={analytics.totalSent.toLocaleString()} color={C.accent}/>
                <KpiBadge icon="👁️" label={t('email.anOpenRate')||"Open Rate"} value={overallOpen+"%"} color={C.green} sub={analytics.totalOpened.toLocaleString()+" opened"}/>
                <KpiBadge icon="🖱️" label={t('email.anClickRate')||"Click Rate"} value={overallClick+"%"} color={C.yellow} sub={analytics.totalClicked.toLocaleString()+" clicks"}/>
                <KpiBadge icon="📦" label={t('email.anDelivery')||"Delivery Rate"} value={deliveryRate+"%"} color={C.cyan} sub={analytics.totalFailed+" failed"}/>
            </div>
            <Card glow>
                <div style={{fontWeight:800,fontSize:15,marginBottom:18,display:"flex",alignItems:"center",gap:8,color:'#1f2937'}}>
                    <span style={{fontSize:16}}>📊</span>{t('email.anSegPerf')||"Performance by Segment"}
                </div>
                {Object.keys(analytics.bySegment).length===0?(
                    <div style={{textAlign:"center",padding:32,color:'#6b7280'}}><div style={{fontSize:28,marginBottom:8}}>📉</div>{t('email.anNoData')||"No sent campaigns to analyze yet."}</div>
                ):(
                    <div style={{display:"grid",gap:10}}>
                        {Object.entries(analytics.bySegment).map(([seg,data])=>{
                            const openP=data.sent>0?(data.opened/data.sent*100).toFixed(1):0;
                            const clickP=data.sent>0?(data.clicked/data.sent*100).toFixed(1):0;
                            return (
                                <div key={seg} style={{display:"grid",gridTemplateColumns:"200px repeat(4,1fr)",gap:16,padding:"14px 18px",borderRadius:12,background:'rgba(0,0,0,0.02)',border:'1px solid rgba(0,0,0,0.06)',alignItems:"center"}}>
                                    <div style={{fontWeight:700,fontSize:13,color:'#1f2937'}}>{seg}</div>
                                    <div style={{textAlign:"center"}}><div style={{fontSize:11,color:'#6b7280'}}>{t('email.anCamps')||"Campaigns"}</div><div style={{fontWeight:700,color:'#374151'}}>{data.campaigns}</div></div>
                                    <div style={{textAlign:"center"}}><div style={{fontSize:11,color:'#6b7280'}}>{t('email.colSent')||"Sent"}</div><div style={{fontWeight:700,color:'#374151'}}>{data.sent.toLocaleString()}</div></div>
                                    <div style={{textAlign:"center"}}><div style={{fontSize:11,color:'#6b7280'}}>{t('email.colOpen')||"Open%"}</div><div style={{fontWeight:700,color:Number(openP)>20?C.green:C.yellow}}>{openP}%</div></div>
                                    <div style={{textAlign:"center"}}><div style={{fontSize:11,color:'#6b7280'}}>{t('email.colClick')||"Click%"}</div><div style={{fontWeight:700,color:Number(clickP)>5?C.green:'#6b7280'}}>{clickP}%</div></div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}

/* Connected Channels Badge */
function EmailChannelBadge({t}) {
    const sync=useConnectorSync();const navigate=useNavigate();
    const raw=sync?.connectedChannels||{};
    const allCh=Array.isArray(raw)?raw:Object.entries(raw).filter(([,v])=>v).map(([k])=>({key:k,platform:k}));
    const emailCh=allCh.filter(ch=>['smtp','ses','mailgun','sendgrid','email'].some(e=>(ch.platform||ch.key||'').toLowerCase().includes(e)));
    if(!emailCh.length){
        return (<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.2)',fontSize:11,marginBottom:14}}>
            <span>⚠️</span><span style={{color:'#eab308',fontWeight:600}}>{t('email.noChannels')||'No email channels connected.'}</span>
            <button onClick={()=>navigate('/integration-hub')} style={{marginLeft:'auto',padding:'4px 10px',borderRadius:6,border:'none',background:'#4f8ef7',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>{t('email.goHub')||'Go to Integration Hub'}</button>
        </div>);
    }
    return (<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',padding:'6px 10px',borderRadius:10,background:'rgba(79,142,247,0.06)',border:'1px solid rgba(79,142,247,0.15)',fontSize:10,marginBottom:14}}>
        <span style={{fontWeight:700,color:C.accent,fontSize:11}}>🔗 {t('email.connectedChannels')||'Connected'}:</span>
        {emailCh.map(ch=>(<span key={ch.key||ch.platform} style={{background:C.accent+'15',color:C.accent,border:'1px solid '+C.accent+'25',borderRadius:6,padding:'1px 7px',fontSize:9,fontWeight:700}}>{ch.platform||ch.key}</span>))}
    </div>);
}

/* Security Lock Modal */
function SecurityLockModal({t,onDismiss}) {
    return (<div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#1a0a0a',border:'1px solid rgba(239,68,68,0.5)',borderRadius:20,padding:32,maxWidth:380,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>🛡️</div>
            <div style={{fontWeight:900,fontSize:18,color:'#ef4444',marginBottom:8}}>{t('email.secLockTitle')||'Security Alert'}</div>
            <div style={{fontSize:13,color:'#9ca3af',lineHeight:1.7,marginBottom:20}}>{t('email.secLockDesc')||'Abnormal access detected.'}</div>
            <button onClick={onDismiss} style={{padding:'9px 24px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer'}}>{t('email.dismiss')||'Confirm'}</button>
        </div>
    </div>);
}

/* Guide Tab - 15 Steps */
function GuideTab() {
    const {t}=useI18n();
    const STEPS=[
        {n:'1',k:'guideStep1',c:'#4f8ef7'},{n:'2',k:'guideStep2',c:'#22c55e'},
        {n:'3',k:'guideStep3',c:'#a78bfa'},{n:'4',k:'guideStep4',c:'#f97316'},
        {n:'5',k:'guideStep5',c:'#06b6d4'},{n:'6',k:'guideStep6',c:'#f472b6'},
        {n:'7',k:'guideStep7',c:'#8b5cf6'},{n:'8',k:'guideStep8',c:'#10b981'},
        {n:'9',k:'guideStep9',c:'#f59e0b'},{n:'10',k:'guideStep10',c:'#ef4444'},
        {n:'11',k:'guideStep11',c:'#3b82f6'},{n:'12',k:'guideStep12',c:'#14b8a6'},
        {n:'13',k:'guideStep13',c:'#ec4899'},{n:'14',k:'guideStep14',c:'#6366f1'},
        {n:'15',k:'guideStep15',c:'#84cc16'},
    ];
    const TABS_G=[
        {icon:'🚀',k:'guideCamp',c:'#4f8ef7'},{icon:'📝',k:'guideTpl',c:'#a78bfa'},
        {icon:'📊',k:'guideAnalytics',c:'#22c55e'},{icon:'🎨',k:'guideCreative',c:'#a855f7'},
        {icon:'⚙️',k:'guideSet',c:'#f97316'},
    ];
    return (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{background:'rgba(79,142,247,0.06)',border:'1px solid rgba(79,142,247,0.18)',borderRadius:14,textAlign:'center',padding:32}}>
                <div style={{fontSize:44}}>📧</div>
                <div style={{fontWeight:900,fontSize:22,marginTop:8,color:'#1f2937'}}>{t('email.guideTitle')||'Email Marketing Guide'}</div>
                <div style={{fontSize:13,color:'#4b5563',marginTop:6,maxWidth:700,margin:'6px auto 0',lineHeight:1.7}}>{t('email.guideSub')||'Step-by-step guide for email campaigns, templates, analytics, and channel settings.'}</div>
            </div>
            <Card glow>
                <div style={{fontWeight:800,fontSize:17,marginBottom:16,color:'#1f2937'}}>{t('email.guideStepsTitle')||'Usage Steps'}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                    {STEPS.map((s,i)=>(
                        <div key={i} style={{background:s.c+'0a',border:'1px solid '+s.c+'25',borderRadius:12,padding:16}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                                <span style={{background:s.c,color:'#fff',borderRadius:'50%',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800}}>{s.n}</span>
                                <span style={{fontWeight:700,fontSize:14,color:s.c}}>{t('email.'+s.k+'Title')||'Step '+s.n}</span>
                            </div>
                            <div style={{fontSize:12,color:'#4b5563',lineHeight:1.7}}>{t('email.'+s.k+'Desc')||''}</div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card glow>
                <div style={{fontWeight:800,fontSize:17,marginBottom:16,color:'#1f2937'}}>{t('email.guideTabsTitle')||'Tab Guide'}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                    {TABS_G.map((tb,i)=>(
                        <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 12px',background:'rgba(0,0,0,0.02)',borderRadius:10,border:'1px solid rgba(0,0,0,0.05)'}}>
                            <span style={{fontSize:20,flexShrink:0}}>{tb.icon}</span>
                            <div>
                                <div style={{fontWeight:700,fontSize:12,color:tb.c}}>{t('email.'+tb.k+'Name')||''}</div>
                                <div style={{fontSize:10,color:'#6b7280',marginTop:2,lineHeight:1.6}}>{t('email.'+tb.k+'Desc')||''}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <div style={{background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:14,padding:20}}>
                <div style={{fontWeight:800,fontSize:17,marginBottom:12,color:'#1f2937'}}>💡 {t('email.guideTipsTitle')||'Expert Tips'}</div>
                <ul style={{margin:0,padding:'0 0 0 18px',fontSize:13,color:'#4b5563',lineHeight:2.2}}>
                    {[1,2,3,4,5,6,7].map(i=><li key={i}>{t('email.guideTip'+i)||''}</li>)}
                </ul>
            </div>
        </div>
    );
}

/* Main Content */
function EmailMarketingContent() {
    const {t}=useI18n();
    const {addAlert,broadcastUpdate}=useGlobalData();
    const navigate=useNavigate();
    const [secLocked,setSecLocked]=useState(false);
    useSecurityGuard({addAlert:useCallback((a)=>{if(typeof addAlert==='function')addAlert(a);if(a?.severity==='critical')setSecLocked(true);},[addAlert]),enabled:true});
    const bcRef=useRef(null);
    useEffect(()=>{try{bcRef.current=new BroadcastChannel('geniego_email');bcRef.current.onmessage=()=>{};}catch{}return()=>{try{bcRef.current?.close();}catch{}};},[]);
    const broadcastRefresh=useCallback(()=>{try{bcRef.current?.postMessage({type:'EMAIL_REFRESH',ts:Date.now()});}catch{}if(typeof broadcastUpdate==='function')broadcastUpdate('email',{refreshed:Date.now()});},[broadcastUpdate]);
    const [tab,setTab]=useState("campaigns");
    const TABS=[
        {id:"campaigns",label:t('email.tabCamp')||"Campaigns",icon:"🚀"},
        {id:"templates",label:t('email.tabTpl')||"Templates",icon:"📝"},
        {id:"analytics",label:t('email.tabAnalytics')||"Analytics",icon:"📊"},
        {id:"creative",label:t('email.tabCreative')||"Creative",icon:"🎨"},
        {id:"settings",label:t('email.tabSettings')||"Settings",icon:"⚙️"},
        {id:"guide",label:t('email.tabGuide')||"Guide",icon:"📖"},
    ];
    return (
        <div style={{padding:24,minHeight:"100%",color:'#1e293b'}}>
            {secLocked && <SecurityLockModal t={t} onDismiss={()=>setSecLocked(false)}/>}
            <AIRecommendBanner context="email"/>
            <EmailChannelBadge t={t}/>
            <div style={{padding:'6px 12px',borderRadius:8,background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.12)',fontSize:10,color:'#4f8ef7',fontWeight:600,display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite'}}/>
                {t('email.liveSyncStatus')||'Real-time cross-tab sync active'}
            </div>
            <div style={{borderRadius:16,background:'rgba(79,142,247,0.06)',border:'1px solid rgba(79,142,247,0.15)',padding:"22px 28px",marginBottom:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                        <div style={{fontSize:24,fontWeight:900,letterSpacing:-0.5,color:'#1f2937'}}>{t('email.title')||"📧 Email Marketing"}</div>
                        <div style={{fontSize:13,color:'#4b5563',marginTop:5}}>{t('email.subTitle')||"Create powerful email campaigns with real-time sync"}</div>
                    </div>
                    <button onClick={broadcastRefresh} style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.9)',color:'#374151',fontWeight:700,fontSize:11,cursor:'pointer'}}>🔄 {t('email.syncNow')||'Sync Now'}</button>
                </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
                {TABS.map(Tb=>(
                    <button key={Tb.id} onClick={()=>setTab(Tb.id)} style={{
                        padding:"10px 20px",borderRadius:12,border:"none",cursor:"pointer",
                        background:tab===Tb.id?C.accent:'rgba(255,255,255,0.9)',
                        color:tab===Tb.id?"#fff":"#374151",
                        fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6,
                        boxShadow:tab===Tb.id?'0 4px 16px '+C.accent+'33':'0 1px 3px rgba(0,0,0,0.06)',
                    }}><span>{Tb.icon}</span> {Tb.label}</button>
                ))}
            </div>
            {tab==="campaigns" && <CampaignsTab/>}
            {tab==="templates" && <TemplatesTab/>}
            {tab==="analytics" && <AnalyticsTab/>}
            {tab==="creative" && <CreativeStudioTab sourcePage="email-marketing"/>}
            {tab==="settings" && <SettingsTab/>}
            {tab==="guide" && <GuideTab/>}
            <style>{\`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}\`}</style>
        </div>
    );
}

export default function EmailMarketing() {
    return (<PlanGate feature="email_marketing"><EmailMarketingContent/></PlanGate>);
}
`;
fs.appendFileSync(__dirname+'/src/pages/EmailMarketing.jsx', code, 'utf8');
console.log('Part 3 appended:', code.length, 'chars');
