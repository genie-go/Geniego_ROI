const fs = require('fs');
const code = `
/* Templates Tab */
function TemplatesTab() {
    const {t}=useI18n();
    const {emailTemplates,updateEmailTemplates,addAlert}=useGlobalData();
    const [editId,setEditId]=useState("new");
    const [form,setForm]=useState({name:"",subject:"",html_body:"",category:"general"});
    const [msg,setMsg]=useState("");
    const save=()=>{
        if(!form.name||!form.subject)return;
        if(detectXSS(form.name)||detectXSS(form.subject)){addAlert({type:'error',msg:'XSS blocked'});return;}
        let next=[...emailTemplates];
        if(editId==="new"){next.push({id:"tpl_"+Date.now(),...form,createdAt:new Date().toISOString()});addAlert({type:'success',msg:'Template created: "'+form.name+'"'});}
        else{next=next.map(x=>x.id===editId?{...x,...form,updatedAt:new Date().toISOString()}:x);addAlert({type:'info',msg:'Template updated'});}
        updateEmailTemplates(next);setMsg(t('email.saved')||'Saved');setEditId("new");setForm({name:"",subject:"",html_body:"",category:"general"});setTimeout(()=>setMsg(""),2500);
    };
    const del=(id)=>{if(!confirm(t("email.msgDelConfirm")||"Delete?"))return;updateEmailTemplates(emailTemplates.filter(x=>x.id!==id));addAlert({type:'warn',msg:'Template deleted'});};
    const CATS=[{id:"general",label:t('email.catGeneral')||"General",icon:"📋"},{id:"welcome",label:t('email.catWelcome')||"Welcome",icon:"👋"},{id:"promotion",label:t('email.catPromo')||"Promotion",icon:"🎯"},{id:"retention",label:t('email.catRetention')||"Retention",icon:"🔄"},{id:"transactional",label:t('email.catTxn')||"Transactional",icon:"🧾"}];
    return (
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20}}>
            <div>
                <button onClick={()=>{setEditId("new");setForm({name:"",subject:"",html_body:"",category:"general"});}} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px dashed "+C.accent,background:"none",color:C.accent,fontWeight:700,cursor:"pointer",marginBottom:14,fontSize:13}}>
                    ✨ {t("email.tplNew")||"New Template"}
                </button>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {emailTemplates.length===0 && <div style={{textAlign:"center",padding:24,color:'#6b7280',fontSize:12}}>{t('email.noTemplates')||"No templates yet."}</div>}
                    {emailTemplates.map(tx=>{
                        const cat=CATS.find(c=>c.id===tx.category);
                        return (
                            <div key={tx.id} onClick={()=>{setEditId(tx.id);setForm({name:tx.name,subject:tx.subject,html_body:tx.html_body,category:tx.category});}} style={{
                                background:editId===tx.id?C.accent+'15':'rgba(255,255,255,0.95)',border:'1px solid '+(editId===tx.id?C.accent:'rgba(0,0,0,0.08)'),
                                borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
                            }}>
                                <div>
                                    <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6,color:'#1f2937'}}><span>{cat?.icon||"📋"}</span> {tx.name}</div>
                                    <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{cat?.label||tx.category}</div>
                                </div>
                                <button onClick={e=>{e.stopPropagation();del(tx.id);}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:4}}>🗑</button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <Card glow>
                <div style={{fontWeight:800,marginBottom:18,fontSize:15,display:"flex",alignItems:"center",gap:8,color:'#1f2937'}}>
                    <span style={{fontSize:18}}>{editId==="new"?"✨":"✏️"}</span>
                    {editId==="new"?(t("email.tplCreate")||"Create Template"):(t("email.tplEdit")||"Edit Template")}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                    <div>
                        <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('email.lblTplName')||"Template Name"}</div>
                        <SecureInput value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} addAlert={addAlert}/>
                    </div>
                    <div>
                        <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('email.lblCategory')||"Category"}</div>
                        <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{...INPUT}}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                    </div>
                </div>
                <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('email.lblSubject')||"Subject Line"}</div>
                    <SecureInput value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder={t("email.subjPh")||"Enter subject..."} addAlert={addAlert}/>
                </div>
                <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t("email.tfBody")||"HTML Body"}</div>
                    <textarea value={form.html_body} onChange={e=>{if(detectXSS(e.target.value)){addAlert({type:'error',msg:'XSS detected'});return;}setForm(f=>({...f,html_body:e.target.value}));}} rows={14} style={{...INPUT,resize:"vertical",fontFamily:"monospace",lineHeight:1.6,fontSize:12}}/>
                </div>
                {msg && <div style={{fontSize:12,color:C.green,marginTop:10,fontWeight:600}}>✅ {msg}</div>}
                <button onClick={save} disabled={!form.name||!form.subject||!form.html_body} style={{...BTN,marginTop:16,opacity:(!form.name||!form.subject||!form.html_body)?0.5:1,background:C.accent}}>
                    {editId==="new"?(t("email.btnTplSave")||"💾 Save Template"):(t("email.btnEditSave")||"💾 Save Changes")}
                </button>
            </Card>
        </div>
    );
}

/* Campaigns Tab */
function CampaignsTab() {
    const {t}=useI18n();
    const {crmSegments,emailCampaignsLinked,addEmailCampaign,updateEmailCampaign,crmCustomerHistory,emailTemplates,addAlert,emailSettings}=useGlobalData();
    const [form,setForm]=useState({name:"",template_id:"",segment_id:""});
    const [sending,setSending]=useState(null);
    const [msg,setMsg]=useState("");
    const totalCustomers=Object.keys(crmCustomerHistory).length;
    const computeTargetSize=(segId)=>{if(!segId)return totalCustomers;const s=crmSegments.find(x=>x.id===String(segId));return s?s.count:totalCustomers;};
    const kpi=useMemo(()=>{
        const total=emailCampaignsLinked.length;const sent=emailCampaignsLinked.filter(c=>c.status==='sent').length;
        const totalSent=emailCampaignsLinked.reduce((s,c)=>s+(c.total_sent||0),0);
        const totalOpened=emailCampaignsLinked.reduce((s,c)=>s+(c.opened||0),0);
        const totalClicked=emailCampaignsLinked.reduce((s,c)=>s+(c.clicked||0),0);
        const avgOpen=totalSent>0?Math.round(totalOpened/totalSent*100):0;
        const avgClick=totalSent>0?Math.round(totalClicked/totalSent*100):0;
        return {total,sent,totalSent,avgOpen,avgClick};
    },[emailCampaignsLinked]);
    const create=()=>{
        if(!form.name)return;if(detectXSS(form.name)){addAlert({type:'error',msg:'XSS blocked'});return;}
        const nc={id:"ecp_"+Date.now(),name:sanitizeInput(form.name),template_name:emailTemplates.find(x=>x.id===form.template_id)?.name||"N/A",
            segment_name:crmSegments.find(x=>x.id===String(form.segment_id))?.name||"All",targetSegmentId:form.segment_id||null,
            targetSegmentName:crmSegments.find(x=>x.id===String(form.segment_id))?.name||"All",
            status:"draft",total_sent:computeTargetSize(form.segment_id),opened:0,clicked:0,failed:0,at:new Date().toISOString()};
        addEmailCampaign(nc);setMsg(t('email.msgCampDone')||'Campaign created!');setForm({name:"",template_id:"",segment_id:""});setTimeout(()=>setMsg(""),3000);
    };
    const send=(c)=>{
        if(!confirm(t("email.msgSendConfirm")||"Send to all?"))return;
        setSending(c.id);
        setTimeout(()=>{
            setSending(null);const openRate=Math.floor(Math.random()*25+15);const clickRate=Math.floor(openRate*0.3);
            updateEmailCampaign(c.id,{status:"sent",opened:Math.round(c.total_sent*openRate/100),clicked:Math.round(c.total_sent*clickRate/100),sentAt:new Date().toISOString()});
            addAlert({type:'success',msg:'Campaign "'+c.name+'" sent'});setMsg(t('email.msgSendDone')||'Sent!');setTimeout(()=>setMsg(""),3000);
        },1800);
    };
    const STATUS_MAP={draft:{color:'#6b7280',label:"DRAFT",icon:"📝"},sent:{color:C.green,label:"SENT",icon:"✅"},sending:{color:C.yellow,label:"SENDING",icon:"⏳"},scheduled:{color:C.cyan,label:"SCHEDULED",icon:"🕐"}};
    return (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
                <KpiBadge icon="📧" label={t('email.kpiTotal')||"Campaigns"} value={kpi.total} color={C.accent}/>
                <KpiBadge icon="✅" label={t('email.kpiSent')||"Sent"} value={kpi.sent} color={C.green}/>
                <KpiBadge icon="📤" label={t('email.kpiEmails')||"Total Emails"} value={kpi.totalSent.toLocaleString()} color={C.purple}/>
                <KpiBadge icon="👁️" label={t('email.kpiOpen')||"Avg Open%"} value={kpi.avgOpen+"%"} color={C.yellow}/>
                <KpiBadge icon="🖱️" label={t('email.kpiClick')||"Avg Click%"} value={kpi.avgClick+"%"} color={C.cyan}/>
            </div>
            <Card glow>
                <div style={{fontWeight:800,fontSize:15,marginBottom:16,display:"flex",alignItems:"center",gap:8,color:'#1f2937'}}>
                    <span style={{fontSize:18}}>🚀</span>{t('email.cNew')||"New Campaign"}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                    <div><div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('email.fName')||"Campaign Name*"}</div><SecureInput value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} addAlert={addAlert}/></div>
                    <div><div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('email.fTpl')||"Template"}</div><select value={form.template_id} onChange={e=>setForm(f=>({...f,template_id:e.target.value}))} style={{...INPUT}}><option value="">{t('email.optSel')||"-- Select --"}</option>{emailTemplates.map(tp=><option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></div>
                    <div><div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('email.fTarget')||"Target Segment"}</div><select value={form.segment_id} onChange={e=>setForm(f=>({...f,segment_id:String(e.target.value)}))} style={{...INPUT}}><option value="">{t('email.optAll')||"All"} ({totalCustomers})</option>{(crmSegments||[]).map(s=><option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}</select></div>
                </div>
                {msg && <div style={{marginTop:12,fontSize:12,color:C.green,fontWeight:600}}>✅ {msg}</div>}
                <button onClick={create} disabled={!form.name} style={{...BTN,marginTop:16,opacity:!form.name?0.5:1,background:C.accent}}>
                    {t("email.btnCreate")||"🚀 Create Campaign"}
                </button>
            </Card>
            <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:"16px 22px",fontWeight:800,fontSize:15,borderBottom:'1px solid rgba(0,0,0,0.06)',display:"flex",alignItems:"center",gap:8,color:'#1f2937'}}>
                    <span style={{fontSize:16}}>📊</span>{t('email.cStat')||"Campaign Status"} ({emailCampaignsLinked.length})
                </div>
                <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{background:'rgba(0,0,0,0.02)'}}>
                            {[t('email.colName')||"Name",t('email.colTpl')||"Template",t('email.colTarget')||"Segment",t('email.colSent')||"Sent",t('email.colOpen')||"Open%",t('email.colClick')||"Click%",t('email.colStatus')||"Status",t('email.colAction')||"Action"].map(h=>(
                                <th key={h} style={{padding:"12px 16px",textAlign:"left",color:'#6b7280',fontWeight:600,fontSize:11,textTransform:"uppercase"}}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {emailCampaignsLinked.map((c,i)=>{
                                const openR=c.total_sent>0?Math.round((c.opened||0)/c.total_sent*100):0;
                                const clickR=c.total_sent>0?Math.round((c.clicked||0)/c.total_sent*100):0;
                                const st=STATUS_MAP[c.status]||STATUS_MAP.draft;
                                return (<tr key={c.id} style={{borderTop:'1px solid rgba(0,0,0,0.04)',background:i%2?'rgba(0,0,0,0.01)':'transparent'}}>
                                    <td style={{padding:"12px 16px",fontWeight:600,color:'#1f2937'}}>{c.name}</td>
                                    <td style={{padding:"12px 16px",color:'#6b7280'}}>{c.template_name||"-"}</td>
                                    <td style={{padding:"12px 16px",color:'#6b7280'}}>{c.targetSegmentName||c.segment_name||"All"}</td>
                                    <td style={{padding:"12px 16px",color:'#374151'}}>{c.total_sent?.toLocaleString()||0}</td>
                                    <td style={{padding:"12px 16px"}}><span style={{color:openR>20?C.green:openR>10?C.yellow:'#6b7280',fontWeight:700}}>{openR}%</span></td>
                                    <td style={{padding:"12px 16px"}}><span style={{color:clickR>5?C.green:clickR>2?C.yellow:'#6b7280',fontWeight:700}}>{clickR}%</span></td>
                                    <td style={{padding:"12px 16px"}}><span style={{fontSize:11,fontWeight:700,color:st.color,display:"inline-flex",alignItems:"center",gap:4,background:st.color+'15',padding:"3px 10px",borderRadius:6}}>{st.icon} {st.label}</span></td>
                                    <td style={{padding:"12px 16px"}}>{c.status!=="sent" && (<button onClick={()=>send(c)} disabled={sending===c.id} style={{padding:"6px 14px",borderRadius:8,border:"none",background:sending===c.id?'rgba(0,0,0,0.04)':C.green,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>{sending===c.id?"⏳ "+(t('email.btnSending')||"Sending..."):"📤 "+(t('email.btnSend')||"Send")}</button>)}</td>
                                </tr>);
                            })}
                            {emailCampaignsLinked.length===0 && (<tr><td colSpan={8} style={{padding:"48px 24px",textAlign:"center",color:'#6b7280'}}><div style={{fontSize:32,marginBottom:8}}>📭</div><div style={{fontSize:13}}>{t('email.emptyCamp')||"No campaigns yet."}</div></td></tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
`;
fs.appendFileSync(__dirname+'/src/pages/EmailMarketing.jsx', code, 'utf8');
console.log('Part 2 appended:', code.length, 'chars');
