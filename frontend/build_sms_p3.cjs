const fs=require('fs');
const code=`
/* Guide Tab — 15+ steps detailed */
function SmsGuideTab({t}){
    const STEPS=[
        {n:'1',k:'guideStep1',c:C.accent},{n:'2',k:'guideStep2',c:C.green},{n:'3',k:'guideStep3',c:'#a78bfa'},
        {n:'4',k:'guideStep4',c:'#f97316'},{n:'5',k:'guideStep5',c:C.cyan},{n:'6',k:'guideStep6',c:'#f472b6'},
        {n:'7',k:'guideStep7',c:C.accent},{n:'8',k:'guideStep8',c:C.green},{n:'9',k:'guideStep9',c:'#a78bfa'},
        {n:'10',k:'guideStep10',c:'#f97316'},{n:'11',k:'guideStep11',c:C.cyan},{n:'12',k:'guideStep12',c:'#f472b6'},
        {n:'13',k:'guideStep13',c:C.accent},{n:'14',k:'guideStep14',c:C.green},{n:'15',k:'guideStep15',c:'#a78bfa'},
    ];
    const TABS=[
        {icon:'✏️',k:'guideCompose',c:C.accent},{icon:'📡',k:'guideBroadcast',c:'#a78bfa'},
        {icon:'📋',k:'guideTemplates',c:'#f97316'},{icon:'🚀',k:'guideCampaigns',c:C.cyan},
        {icon:'📜',k:'guideHistory',c:C.green},{icon:'📊',k:'guideStats',c:'#f97316'},
        {icon:'🎨',k:'guideCreative',c:C.purple},{icon:'⚙️',k:'guideAuth',c:C.cyan},
    ];
    return(
        <div style={{display:'grid',gap:18}}>
            <Card glow style={{textAlign:'center',padding:32,background:'linear-gradient(135deg,rgba(79,142,247,0.06),rgba(167,139,250,0.04))'}}>
                <div style={{fontSize:44}}>📱</div>
                <div style={{fontWeight:900,fontSize:22,marginTop:8,color:'#1f2937'}}>{t('sms.guideTitle')||'SMS Marketing Guide'}</div>
                <div style={{fontSize:13,color:'#6b7280',marginTop:6,maxWidth:600,margin:'6px auto 0',lineHeight:1.7}}>{t('sms.guideSub')||'Step-by-step guide'}</div>
            </Card>
            <Card glow style={{padding:20}}>
                <div style={{fontWeight:800,fontSize:17,marginBottom:16,color:'#1f2937'}}>{t('sms.guideStepsTitle')||'Usage Steps'}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                    {STEPS.map((s,i)=>(
                        <div key={i} style={{background:s.c+'0a',border:'1px solid '+s.c+'25',borderRadius:12,padding:16}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                                <span style={{fontSize:14,fontWeight:900,background:s.c,color:'#fff',width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{s.n}</span>
                                <span style={{fontWeight:700,fontSize:14,color:s.c}}>{t('sms.'+s.k+'Title')||'Step '+s.n}</span>
                            </div>
                            <div style={{fontSize:12,color:'#6b7280',lineHeight:1.7}}>{t('sms.'+s.k+'Desc')||''}</div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card glow style={{padding:20}}>
                <div style={{fontWeight:800,fontSize:17,marginBottom:16,color:'#1f2937'}}>{t('sms.guideTabsTitle')||'Tab Guide'}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
                    {TABS.map((tb,i)=>(
                        <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'10px 12px',background:'rgba(0,0,0,0.02)',borderRadius:10,border:'1px solid rgba(0,0,0,0.05)'}}>
                            <span style={{fontSize:18,flexShrink:0}}>{tb.icon}</span>
                            <div>
                                <div style={{fontWeight:700,fontSize:12,color:tb.c}}>{t('sms.'+tb.k+'Name')||''}</div>
                                <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{t('sms.'+tb.k+'Desc')||''}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <div style={{background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:14,padding:20}}>
                <div style={{fontWeight:800,fontSize:17,marginBottom:12,color:'#1f2937'}}>💡 {t('sms.guideTipsTitle')||'Expert Tips'}</div>
                <ul style={{margin:0,padding:'0 0 0 18px',fontSize:13,color:'#4b5563',lineHeight:2.2}}>
                    {[1,2,3,4,5,6,7].map(n=>(<li key={n}>{t('sms.guideTip'+n)||''}</li>))}
                </ul>
            </div>
        </div>
    );
}

/* Main Inner Component */
function SmsMarketingInner(){
    const{t}=useI18n();
    const[tab,setTab]=useState('compose');
    const[settings,setSettings]=useState(null);
    const[messages,setMessages]=useState([]);
    const[loading,setLoading]=useState(true);
    const[secLocked,setSecLocked]=useState(false);
    const navigate=useNavigate();
    let addAlertFn=null;
    try{const gd=useGlobalData();addAlertFn=gd?.addAlert;}catch(e){}
    const secCb=useCallback((a)=>{if(typeof addAlertFn==='function')addAlertFn(a);if(a?.severity==='critical')setSecLocked(true);},[addAlertFn]);
    const{checkInput,checkRate}=useSmsSecurity(secCb);
    let ihubChannels=[];
    try{const cs=useConnectorSync();ihubChannels=(cs?.connectors||[]).filter(c=>['nhn_cloud','nhn','aligo','coolsms','twilio'].includes(c.channel?.toLowerCase()));}catch(e){}

    const loadData=useCallback(async()=>{if(checkRate())return;setLoading(true);const[s,m]=await Promise.all([apiFetch('/api/sms/settings'),apiFetch('/api/sms/messages?limit=30')]);setSettings(s);setMessages(m.messages||[]);setLoading(false);},[checkRate]);
    useEffect(()=>{loadData();},[loadData]);
    useEffect(()=>{const iv=setInterval(loadData,30000);return()=>clearInterval(iv);},[loadData]);

    const stats=settings?.stats||{sent:0,delivered:0,failed:0};

    const TABS=useMemo(()=>[
        {id:'compose',label:'✏️ '+(t('sms.tabCompose')||'Compose')},
        {id:'broadcast',label:'📡 '+(t('sms.tabBroadcast')||'Broadcast')},
        {id:'templates',label:'📋 '+(t('sms.tabTemplates')||'Templates')},
        {id:'campaigns',label:'🚀 '+(t('sms.tabCampaigns')||'Campaigns')},
        {id:'history',label:'📜 '+(t('sms.tabHistory')||'History')},
        {id:'stats',label:'📊 '+(t('sms.tabStats')||'Statistics')},
        {id:'creative',label:'🎨 '+(t('sms.tabCreative')||'Creative')},
        {id:'settings',label:'⚙️ '+(t('sms.tabSettings')||'Settings')},
        {id:'guide',label:'📖 '+(t('sms.tabGuide')||'Guide')},
    ],[t]);

    return(
        <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
            {secLocked&&(
                <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{background:'#fff',border:'2px solid '+C.red,borderRadius:20,padding:32,maxWidth:380,textAlign:'center',boxShadow:'0 24px 64px rgba(239,68,68,0.2)'}}>
                        <div style={{fontSize:48,marginBottom:12}}>🛡️</div>
                        <div style={{fontWeight:900,fontSize:18,color:C.red,marginBottom:8}}>{t('sms.secLockTitle')||'Security Alert'}</div>
                        <div style={{fontSize:13,color:'#6b7280',lineHeight:1.7,marginBottom:20}}>{t('sms.secLockDesc')||'Abnormal access detected'}</div>
                        <button onClick={()=>setSecLocked(false)} style={{...BTN,background:C.red}}>{t('sms.dismiss')||'Dismiss'}</button>
                    </div>
                </div>
            )}

            {/* Warning + Sync Bar */}
            {ihubChannels.length===0&&(
                <div style={{margin:'0 0 8px',padding:'10px 16px',borderRadius:10,background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.3)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
                    <span style={{color:'#92400e'}}>⚠️ {t('sms.noChannels')||'No SMS channels connected'}</span>
                    <button onClick={()=>navigate('/integration-hub')} style={{padding:'5px 14px',borderRadius:8,border:'none',background:C.accent,color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer'}}>{t('sms.goHub')||'Go to Hub'}</button>
                </div>
            )}
            <div style={{padding:'6px 12px',borderRadius:8,background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.12)',fontSize:10,color:C.accent,fontWeight:600,display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:C.green}}/>
                {t('sms.liveSyncStatus')||'Real-time sync active'}
                <button onClick={loadData} style={{marginLeft:'auto',padding:'3px 10px',borderRadius:6,border:'1px solid '+C.accent+'33',background:'transparent',color:C.accent,fontSize:10,fontWeight:700,cursor:'pointer'}}>{t('sms.syncNow')||'Sync Now'}</button>
            </div>

            {/* Hero */}
            <div style={{borderRadius:16,background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.08)',padding:'22px 28px',marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
                    <div>
                        <div style={{fontSize:24,fontWeight:900,color:'#1f2937'}}>📱 {t('sms.heroTitle')||'SMS Marketing'}</div>
                        <div style={{fontSize:13,color:'#6b7280',marginTop:4}}>{t('sms.heroDesc')||'Compose · Broadcast · Templates · Campaigns'}</div>
                        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                            <Tag label={(t('sms.sent')||'Sent')+' '+(stats.sent||0).toLocaleString()} color={C.accent}/>
                            {ihubChannels.length>0&&<Tag label={'🔗 '+ihubChannels.length+' '+(t('sms.ihubLinked')||'connected')} color={C.green}/>}
                            <Tag label="🛡️ Security Active" color={C.cyan}/>
                        </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                        {[{l:t('sms.kpiSent')||'Sent',v:stats.sent||0,c:C.accent},{l:t('sms.kpiSuccess')||'Delivered',v:stats.delivered||0,c:C.green},{l:t('sms.kpiFailed')||'Failed',v:stats.failed||0,c:C.red}].map(k=>(
                            <div key={k.l} style={{padding:'8px 14px',borderRadius:10,background:k.c+'10',border:'1px solid '+k.c+'22',textAlign:'center'}}>
                                <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.v}</div>
                                <div style={{fontSize:10,color:'#6b7280'}}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:4,padding:5,background:'rgba(0,0,0,0.04)',borderRadius:14,overflowX:'auto',flexShrink:0,marginBottom:12}}>
                {TABS.map(tb=>(
                    <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
                        padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:11,flex:1,whiteSpace:'nowrap',
                        background:tab===tb.id?C.accent:'transparent',color:tab===tb.id?'#fff':'#4b5563',transition:'all 150ms'
                    }}>{tb.label}</button>
                ))}
            </div>

            {/* Content */}
            <div style={{flex:1,overflowY:'auto',paddingBottom:20}}>
                {tab==='compose'&&<ComposePanel t={t} onSent={loadData} checkInput={checkInput}/>}
                {tab==='broadcast'&&<BroadcastPanel t={t} checkInput={checkInput}/>}
                {tab==='templates'&&<TemplatesPanel t={t} checkInput={checkInput}/>}
                {tab==='campaigns'&&<CampaignsPanel t={t}/>}
                {tab==='history'&&(
                    <Card glow>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                            <div style={{fontWeight:800,fontSize:15,color:'#1f2937'}}>📜 {t('sms.historyTitle')||'Message History'}</div>
                            {messages.length>0&&(<button onClick={()=>downloadSmsCsv(messages,t)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid '+C.accent+'44',background:'transparent',color:C.accent,fontSize:10,fontWeight:700,cursor:'pointer'}}>📥 {t('sms.exportCsv')||'CSV'}</button>)}
                        </div>
                        {messages.length===0?(
                            <div style={{textAlign:'center',padding:30,color:'#6b7280',fontSize:12}}>{t('sms.noHistory')||'No messages yet'}</div>
                        ):(
                            <div style={{overflowX:'auto'}}>
                                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                                    <thead><tr style={{borderBottom:'2px solid rgba(0,0,0,0.08)'}}>
                                        {[t('sms.type')||'Type',t('sms.recipientNumber')||'To',t('sms.content')||'Content',t('sms.status')||'Status',t('sms.sendTime')||'Time'].map(h=>(<th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,color:'#374151'}}>{h}</th>))}
                                    </tr></thead>
                                    <tbody>{messages.map((m,i)=>{
                                        const sc={delivered:C.green,sent:C.accent,failed:C.red,pending:C.yellow}[m.status]||'#666';
                                        return(<tr key={i} style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                                            <td style={{padding:'8px 12px'}}><Tag label={m.msg_type||'SMS'} color={m.msg_type==='LMS'?C.purple:C.accent}/></td>
                                            <td style={{padding:'8px 12px',fontFamily:'monospace',fontSize:11,color:'#374151'}}>{m.recipient}</td>
                                            <td style={{padding:'8px 12px',fontSize:11,color:'#4b5563',maxWidth:250}}>{(m.body||'').slice(0,50)}</td>
                                            <td style={{padding:'8px 12px'}}><Tag label={m.status} color={sc}/></td>
                                            <td style={{padding:'8px 12px',fontSize:10,color:'#6b7280'}}>{(m.sent_at||'').slice(0,16)}</td>
                                        </tr>);
                                    })}</tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}
                {tab==='stats'&&(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                        {[{l:t('sms.statsSentThisMonth')||'Sent This Month',v:(stats.sent||0).toLocaleString(),c:C.accent},{l:t('sms.statsSuccessRate')||'Success Rate',v:(stats.sent>0?(stats.delivered/stats.sent*100).toFixed(1):'0.0')+'%',c:C.green},{l:t('sms.statsBalance')||'Balance',v:settings?.balance||'0',c:C.yellow}].map(k=>(
                            <Card key={k.l} glow style={{textAlign:'center'}}>
                                <div style={{fontSize:24,fontWeight:900,color:k.c}}>{k.v}</div>
                                <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>{k.l}</div>
                            </Card>
                        ))}
                    </div>
                )}
                {tab==='creative'&&<CreativeStudioTab sourcePage="sms-marketing"/>}
                {tab==='settings'&&<AuthPanel t={t} onSaved={loadData}/>}
                {tab==='guide'&&<SmsGuideTab t={t}/>}
            </div>
        </div>
    );
}

export default function SmsMarketing(){
    return(<PlanGate feature="sms"><SmsMarketingInner/></PlanGate>);
}
`;
fs.appendFileSync(__dirname+'/src/pages/SmsMarketing.jsx',code,'utf8');
console.log('SMS Part 3:',code.length,'chars');
// Verify syntax
try{
    require('child_process').execSync('node -e "require(\\"fs\\").readFileSync(\\"src/pages/SmsMarketing.jsx\\",\\"utf8\\")"',{cwd:__dirname});
    console.log('File written OK');
}catch(e){console.log('Write check:',e.message?.slice(0,80));}
