const fs=require('fs');
const code=`
/* Templates Panel */
function TemplatesPanel({t,checkInput}){
    const[tpls,setTpls]=useState([]);
    const[loading,setLoading]=useState(true);
    const[showForm,setShowForm]=useState(false);
    const[editId,setEditId]=useState(null);
    const[form,setForm]=useState({name:'',category:'promotion',body:'',variables:''});
    const[search,setSearch]=useState('');
    const[filterCat,setFilterCat]=useState('all');
    const loadT=useCallback(async()=>{setLoading(true);const d=await apiFetch('/api/sms/templates');setTpls(d.templates||[]);setLoading(false);},[]);
    useEffect(()=>{loadT();},[loadT]);
    const save=async()=>{if(checkInput&&checkInput(form.name))return;const method=editId?'PUT':'POST';const path=editId?'/api/sms/templates/'+editId:'/api/sms/templates';await apiFetch(path,{method,body:JSON.stringify(form)});setShowForm(false);setEditId(null);setForm({name:'',category:'promotion',body:'',variables:''});loadT();};
    const del=async(id)=>{await apiFetch('/api/sms/templates/'+id,{method:'DELETE'});loadT();};
    const CATS=['promotion','notification','authentication','transaction'];
    const catColors={promotion:'#f97316',notification:C.accent,authentication:C.green,transaction:C.purple};
    const filtered=useMemo(()=>{let l=tpls;if(filterCat!=='all')l=l.filter(x=>x.category===filterCat);if(search)l=l.filter(x=>x.name.toLowerCase().includes(search.toLowerCase()));return l;},[tpls,filterCat,search]);
    return(
        <div style={{display:'grid',gap:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {['all',...CATS].map(c=>(<button key={c} onClick={()=>setFilterCat(c)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid '+(filterCat===c?(catColors[c]||C.accent):'rgba(0,0,0,0.08)'),background:filterCat===c?(catColors[c]||C.accent)+'15':'transparent',color:filterCat===c?(catColors[c]||C.accent):'#6b7280',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        {c==='all'?(t('sms.tplAll')||'All'):t('sms.tplCat_'+c)||c}
                    </button>))}
                </div>
                <div style={{display:'flex',gap:8}}>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('sms.tplSearch')||'Search...'} style={{...INPUT,width:180}}/>
                    <button onClick={()=>{setShowForm(!showForm);setEditId(null);setForm({name:'',category:'promotion',body:'',variables:''});}} style={{...BTN,fontSize:11,padding:'6px 14px'}}>+ {t('sms.tplNew')||'New'}</button>
                </div>
            </div>
            {showForm&&(
                <Card glow style={{border:'1px solid '+C.accent+'44'}}>
                    <div style={{fontWeight:900,fontSize:13,marginBottom:12,color:C.accent}}>{editId?'✏️ '+(t('sms.tplEdit')||'Edit'):'➕ '+(t('sms.tplCreate')||'Create')}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        <div><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.tplName')||'Name'}</div><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={{...INPUT}}/></div>
                        <div><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.tplCategory')||'Category'}</div><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...INPUT}}>{CATS.map(c=><option key={c} value={c}>{t('sms.tplCat_'+c)||c}</option>)}</select></div>
                    </div>
                    <div style={{marginTop:12}}><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.tplBody')||'Body'}</div><textarea value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} rows={4} style={{...INPUT,resize:'vertical'}}/></div>
                    <div style={{marginTop:10}}><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.tplVars')||'Variables'}</div><input value={form.variables} onChange={e=>setForm(p=>({...p,variables:e.target.value}))} placeholder="#{name}, #{orderNo}" style={{...INPUT}}/></div>
                    <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}}>
                        <button onClick={()=>setShowForm(false)} style={{padding:'7px 16px',borderRadius:8,border:'1px solid rgba(0,0,0,0.1)',background:'transparent',color:'#374151',fontSize:12,cursor:'pointer'}}>{t('sms.cancel')||'Cancel'}</button>
                        <button onClick={save} disabled={!form.name||!form.body} style={{...BTN,fontSize:12,padding:'7px 16px'}}>💾 {t('sms.save')||'Save'}</button>
                    </div>
                </Card>
            )}
            {loading?(<div style={{textAlign:'center',padding:40,color:'#6b7280'}}>⏳</div>):filtered.length===0?(
                <Card style={{textAlign:'center',padding:40}}><div style={{fontSize:36,marginBottom:10}}>📝</div><div style={{color:'#6b7280',fontSize:13}}>{t('sms.tplEmpty')||'No templates'}</div></Card>
            ):(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
                    {filtered.map(tp=>(
                        <Card key={tp.id} style={{padding:16,border:'1px solid '+(catColors[tp.category]||C.accent)+'22'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                                <span style={{fontWeight:800,fontSize:13,color:'#1f2937'}}>{tp.name}</span>
                                <Tag label={t('sms.tplCat_'+tp.category)||tp.category} color={catColors[tp.category]||C.accent}/>
                            </div>
                            <div style={{fontSize:12,color:'#4b5563',lineHeight:1.6,marginBottom:10,maxHeight:60,overflow:'hidden'}}>{tp.body}</div>
                            <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                                <button onClick={()=>{setForm({name:tp.name,category:tp.category,body:tp.body,variables:(tp.variables||[]).join(', ')});setEditId(tp.id);setShowForm(true);}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid '+C.accent+'44',background:'transparent',color:C.accent,fontSize:10,fontWeight:700,cursor:'pointer'}}>✏️ {t('sms.edit')||'Edit'}</button>
                                <button onClick={()=>del(tp.id)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid '+C.red+'44',background:'transparent',color:C.red,fontSize:10,fontWeight:700,cursor:'pointer'}}>🗑️ {t('sms.delete')||'Delete'}</button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

/* Campaigns Panel */
function CampaignsPanel({t}){
    const[camps,setCamps]=useState([]);const[tpls,setTpls]=useState([]);const[loading,setLoading]=useState(true);const[showForm,setShowForm]=useState(false);
    const[form,setForm]=useState({name:'',template_id:'',segment_id:'',scheduled_at:'',message:''});const[filterSt,setFilterSt]=useState('all');
    const load=useCallback(async()=>{setLoading(true);const[c,tp]=await Promise.all([apiFetch('/api/sms/campaigns'),apiFetch('/api/sms/templates')]);setCamps(c.campaigns||[]);setTpls(tp.templates||[]);setLoading(false);},[]);
    useEffect(()=>{load();},[load]);
    const create=async()=>{await apiFetch('/api/sms/campaigns',{method:'POST',body:JSON.stringify(form)});setShowForm(false);setForm({name:'',template_id:'',segment_id:'',scheduled_at:'',message:''});load();};
    const action=async(id,act)=>{await apiFetch('/api/sms/campaigns/'+id+'/'+act,{method:'POST'});load();};
    const stColors={draft:C.yellow,scheduled:C.accent,sent:C.green,paused:C.purple,failed:C.red};
    const STATUSES=['draft','scheduled','sent','paused'];
    const filtered=useMemo(()=>filterSt==='all'?camps:camps.filter(c=>c.status===filterSt),[camps,filterSt]);
    return(
        <div style={{display:'grid',gap:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {['all',...STATUSES].map(s=>(<button key={s} onClick={()=>setFilterSt(s)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid '+(filterSt===s?(stColors[s]||C.accent):'rgba(0,0,0,0.08)'),background:filterSt===s?(stColors[s]||C.accent)+'15':'transparent',color:filterSt===s?(stColors[s]||C.accent):'#6b7280',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        {s==='all'?(t('sms.campAll')||'All'):t('sms.campStatus_'+s)||s}
                    </button>))}
                </div>
                <button onClick={()=>setShowForm(!showForm)} style={{...BTN,fontSize:11,padding:'6px 14px'}}>+ {t('sms.campNew')||'New Campaign'}</button>
            </div>
            {showForm&&(
                <Card glow style={{border:'1px solid '+C.accent+'44'}}>
                    <div style={{fontWeight:900,fontSize:13,marginBottom:12,color:C.accent}}>🚀 {t('sms.campCreate')||'Create Campaign'}</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        <div><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.campName')||'Name'}</div><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={{...INPUT}}/></div>
                        <div><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.campTemplate')||'Template'}</div><select value={form.template_id} onChange={e=>setForm(p=>({...p,template_id:e.target.value}))} style={{...INPUT}}><option value="">{t('sms.campSelectTpl')||'Select'}</option>{tpls.map(tp=><option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></div>
                        <div><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.campSegment')||'Segment'}</div><input value={form.segment_id} onChange={e=>setForm(p=>({...p,segment_id:e.target.value}))} style={{...INPUT}}/></div>
                        <div><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.campSchedule')||'Schedule'}</div><input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(p=>({...p,scheduled_at:e.target.value}))} style={{...INPUT}}/></div>
                    </div>
                    <div style={{marginTop:12}}><div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{t('sms.campMessage')||'Message'}</div><textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} rows={3} style={{...INPUT,resize:'vertical'}}/></div>
                    <div style={{display:'flex',gap:8,marginTop:14,justifyContent:'flex-end'}}>
                        <button onClick={()=>setShowForm(false)} style={{padding:'7px 16px',borderRadius:8,border:'1px solid rgba(0,0,0,0.1)',background:'transparent',color:'#374151',fontSize:12,cursor:'pointer'}}>{t('sms.cancel')||'Cancel'}</button>
                        <button onClick={create} disabled={!form.name} style={{...BTN,fontSize:12,padding:'7px 16px'}}>🚀 {t('sms.campCreateBtn')||'Create'}</button>
                    </div>
                </Card>
            )}
            {loading?(<div style={{textAlign:'center',padding:40,color:'#6b7280'}}>⏳</div>):filtered.length===0?(
                <Card style={{textAlign:'center',padding:40}}><div style={{fontSize:36,marginBottom:10}}>🚀</div><div style={{color:'#6b7280',fontSize:13}}>{t('sms.campEmpty')||'No campaigns'}</div></Card>
            ):(
                <div style={{display:'grid',gap:10}}>
                    {filtered.map(cp=>(
                        <Card key={cp.id} style={{padding:16,display:'grid',gridTemplateColumns:'1fr auto',gap:14,alignItems:'center'}}>
                            <div>
                                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                                    <span style={{fontWeight:800,fontSize:14,color:'#1f2937'}}>{cp.name}</span>
                                    <Tag label={t('sms.campStatus_'+cp.status)||cp.status} color={stColors[cp.status]||'#666'}/>
                                </div>
                                <div style={{display:'flex',gap:14,fontSize:11,color:'#6b7280'}}>
                                    {cp.segment_name&&<span>👥 {cp.segment_name}</span>}
                                    {cp.template_name&&<span>📝 {cp.template_name}</span>}
                                    {cp.scheduled_at&&<span>📅 {cp.scheduled_at.slice(0,16)}</span>}
                                    {cp.sent_count!=null&&<span>📤 {cp.sent_count}</span>}
                                    {cp.success_rate!=null&&<span>✅ {cp.success_rate}%</span>}
                                </div>
                            </div>
                            <div style={{display:'flex',gap:6}}>
                                {cp.status==='draft'&&(<>
                                    <button onClick={()=>action(cp.id,'schedule')} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+C.accent+'44',background:'transparent',color:C.accent,fontSize:10,fontWeight:700,cursor:'pointer'}}>📅 {t('sms.campScheduleBtn')||'Schedule'}</button>
                                    <button onClick={()=>action(cp.id,'send')} style={{padding:'5px 10px',borderRadius:6,border:'none',background:C.green,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📤 {t('sms.campSendNow')||'Send Now'}</button>
                                </>)}
                                {cp.status==='scheduled'&&(<button onClick={()=>action(cp.id,'pause')} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+C.purple+'44',background:'transparent',color:C.purple,fontSize:10,fontWeight:700,cursor:'pointer'}}>⏸️ {t('sms.campPause')||'Pause'}</button>)}
                                {cp.status==='paused'&&(<button onClick={()=>action(cp.id,'resume')} style={{padding:'5px 10px',borderRadius:6,border:'1px solid '+C.accent+'44',background:'transparent',color:C.accent,fontSize:10,fontWeight:700,cursor:'pointer'}}>▶️ {t('sms.campResume')||'Resume'}</button>)}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

/* CSV Export */
function downloadSmsCsv(messages,t){
    const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const h=[t('sms.type')||'Type',t('sms.recipientNumber')||'Recipient',t('sms.content')||'Content',t('sms.status')||'Status',t('sms.sendTime')||'Time'];
    const rows=messages.map(m=>[m.msg_type||'SMS',m.recipient,(m.body||'').slice(0,200),m.status,(m.sent_at||'').slice(0,16)]);
    const csv=[h.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))].join('\\n');
    const blob=new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sms_history_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}
`;
fs.appendFileSync(__dirname+'/src/pages/SmsMarketing.jsx',code,'utf8');
console.log('SMS Part 2:',code.length,'chars');
