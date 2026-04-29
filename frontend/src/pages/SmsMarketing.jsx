/**
 * SmsMarketing.jsx — Enterprise v13 (Fixed JSX + i18n + Arctic White)
 */
import React,{useState,useEffect,useCallback,useMemo,useRef} from "react";
import PlanGate from "../components/PlanGate.jsx";
import {useGlobalData} from "../context/GlobalDataContext.jsx";
import {useConnectorSync} from "../context/ConnectorSyncContext.jsx";
import {useI18n} from '../i18n';
import {useSecurityGuard,sanitizeInput,detectXSS} from "../security/SecurityGuard.js";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import CreativeStudioTab from "./CreativeStudioTab.jsx";
import {useNavigate} from "react-router-dom";

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

const API=import.meta.env.VITE_API_BASE||'';
const apiFetch = async (path,opts={}) => {
  if (_isDemo) { console.warn('[DEMO] API call blocked:', path,opts={}.toString ? '' : ''); return {}; }const tk=localStorage.getItem('genie_token')||"";const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk,...(opts.headers||{})}});return r.json().catch(()=>({}));};

const C={accent:"#4f8ef7",green:"#22c55e",red:"#ef4444",yellow:"#eab308",purple:"#a855f7",cyan:"#06b6d4"};
const INPUT={width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1e293b",boxSizing:"border-box",fontSize:13,outline:"none"};
const BTN={padding:"10px 22px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13};

function Card({children,style,glow}){
    const[h,setH]=useState(false);
    return(<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:h?'rgba(255,255,255,0.98)':'rgba(255,255,255,0.95)',borderRadius:16,padding:24,border:`1px solid ${h?C.accent+'44':'rgba(0,0,0,0.08)'}`,transition:'all 0.3s',boxShadow:h&&glow?`0 0 24px ${C.accent}15`:'none',...style}}>{children}</div>);
}
function Tag({label,color=C.accent}){return(<span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:color+'18', color, border:'1px solid '+color+'33', fontWeight:700 }}>{label}</span>);}

/* Security Monitor */
const SEC_PATS=[/<script/i,/javascript:/i,/on(error|load|click)=/i,/eval\s*\(/i,/document\.(cookie|write)/i,/union\s+(all\s+)?select/i,/drop\s+table/i];
function useSmsSecurity(addAlert){
    const tc=useRef(0);const rl=useRef({c:0,s:Date.now()});
    const checkInput=useCallback((v)=>{if(!v||typeof v!=='string')return false;for(const p of SEC_PATS){if(p.test(v)){tc.current++;if(typeof addAlert==='function')addAlert({type:'warn',msg:'🛡️ SMS Security: blocked'});return true;}}return false;},[addAlert]);
    const checkRate=useCallback(()=>{const n=Date.now();if(n-rl.current.s>10000){rl.current={c:1,s:n};return false;}rl.current.c++;if(rl.current.c>30){if(typeof addAlert==='function')addAlert({type:'warn',msg:'🚨 Rate limit exceeded'});return true;}return false;},[addAlert]);
    return{checkInput,checkRate,tc};
}

/* Auth/Settings Panel */
function AuthPanel({t,onSaved}){
    const[form,setForm]=useState({provider:'nhn',app_key:'',secret_key:'',sender_no:''});
    const[loading,setLoading]=useState(false);
    const[result,setResult]=useState(null);
    const PROVS=[{id:'nhn',name:'NHN Cloud',desc:t('sms.providerNhnDesc')||'Korea SMS gateway',color:C.accent},{id:'aligo',name:'Aligo',desc:t('sms.providerAligoDesc')||'Low-cost Korean SMS',color:C.green},{id:'coolsms',name:'CoolSMS',desc:t('sms.providerCoolDesc')||'Multi-channel SMS',color:C.purple}];
    const save=async()=>{setLoading(true);setResult(null);const d=await apiFetch('/api/sms/settings',{method:'POST',body:JSON.stringify(form)});setResult(d);if(d.ok&&onSaved)onSaved();setLoading(false);};
    const prov=PROVS.find(p=>p.id===form.provider);
    return(
        <div style={{ display:'grid', gap:14, maxWidth:720 }}>
            <Card glow>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <span style={{ fontSize:22 }}>⚙️</span>
                    <div style={{ fontWeight:800, fontSize:16, color:'#1f2937' }}>{t('sms.tabSettings')||'SMS Provider Settings'}</div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                    {PROVS.map(p=>(<button key={p.id} onClick={()=>setForm(f=>({...f,provider:p.id}))} style={{ padding:'8px 14px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:11, background:form.provider===p.id?p.color:'rgba(0,0,0,0.04)', color:form.provider===p.id?'#fff':'#374151', border:'none' }}>
                        <div>{p.name}</div><div style={{ fontSize:9, opacity:0.7, marginTop:2 }}>{p.desc}</div>
                    </button>))}
                </div>
                <div style={{ padding:'16px 20px', borderRadius:14, background:(prov?.color||C.accent)+'06', border:'1px solid '+(prov?.color||C.accent)+'22' }}>
                    <div style={{ fontWeight:900, fontSize:12, color:prov?.color||C.accent, marginBottom:12 }}>🔑 {prov?.name} {t('sms.apiKeySettings')||'API Key Settings'}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, marginBottom:12 }}>
                        {[{k:'app_key',l:'App Key / App ID',ph:'...'},{k:'secret_key',l:'Secret Key',ph:'...',secret:true},{k:'sender_no',l:t('sms.senderNumber')||'Sender Number',ph:'01012345678'}].map(f=>(
                            <div key={f.k}>
                                <div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600 }}>{f.l}</div>
                                <input type={f.secret?'password':'text'} placeholder={f.ph} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{ ...INPUT }}/>
                            </div>
                        ))}
                    </div>
                    <button onClick={save} disabled={loading} style={{ ...BTN, background:prov?.color||C.accent }}>
                        {loading?'⏳ '+(t('sms.connectTesting')||'Testing...'):'💾 '+(t('sms.saveAndTest')||'Save & Test')}
                    </button>
                    {result&&(<div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, fontSize:12, background:result.ok?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)', border:'1px solid '+(result.ok?'#22c55e':'#ef4444')+'33', color:result.ok?'#22c55e':'#ef4444' }}>
                        {result.ok?'✓ '+(result.message||t('sms.connectSuccess')||'Connected'):'✗ '+(result.message||result.error)}
                    </div>)}
                </div>
            </Card>
        </div>
    );
}

/* Compose Panel */
function ComposePanel({t,onSent,checkInput}){
    const[form,setForm]=useState({to:'',message:''});
    const[loading,setLoading]=useState(false);
    const[result,setResult]=useState(null);
    const msgType=form.message.length>90?'LMS':'SMS';
    const bytes=new Blob([form.message]).size;
    const send=async()=>{if(checkInput&&checkInput(form.message))return;setLoading(true);setResult(null);const d=await apiFetch('/api/sms/send',{method:'POST',body:JSON.stringify(form)});setResult(d);if(d.ok&&onSent)onSent();setLoading(false);};
    return(
        <Card glow>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14, display:'flex', alignItems:'center', gap:8, color:'#1f2937' }}>
                <span style={{ fontSize:18 }}>✏️</span>{t('sms.composeTitle')||'Compose SMS'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:14, alignItems:'start' }}>
                <div>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('sms.recipientNumber')||'Recipient'}</div>
                    <input value={form.to} onChange={e=>setForm(p=>({...p,to:e.target.value}))} placeholder="01012345678" style={{ ...INPUT }}/>
                    <div style={{ marginTop:14, padding:10, borderRadius:10, background:'rgba(0,0,0,0.02)', fontSize:11, lineHeight:2 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', color:'#6b7280' }} ><span>{t('sms.type')||'Type'}</span><Tag label={msgType} color={msgType==='LMS'?C.purple:C.accent}/></div>
                        <div style={{ display:'flex', justifyContent:'space-between', color:C.yellow, fontWeight:700 }} ><span>{t('sms.charCount')||'Characters'}</span><span>{form.message.length}{t('sms.charUnit')||'자'}</span></div>
                        <div style={{ display:'flex', justifyContent:'space-between', color:'#374151' }} ><span>{t('sms.capacity')||'Size'}</span><span>{bytes}bytes</span></div>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('sms.messageContent')||'Message'}</div>
                    <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder={t('sms.messagePlaceholder')||'Enter message...'} rows={6} style={{ ...INPUT, resize:'vertical', lineHeight:1.6 }}/>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                        <div style={{ fontSize:10, color:'#6b7280' }}>{msgType==='SMS'?(t('sms.smsCostInfo')||'SMS: ~20 KRW/msg'):(t('sms.lmsCostInfo')||'LMS: ~50 KRW/msg')}</div>
                        <button onClick={send} disabled={loading||!form.to||!form.message} style={{ ...BTN, opacity:(!form.to||!form.message)?0.5:1 }}>
                            {loading?'⏳':'📤 '+(t('sms.send')||'Send')}
                        </button>
                    </div>
                    {result&&(<div style={{ marginTop:8, padding:8, borderRadius:8, fontSize:12, color:result.ok?C.green:C.red }}>
                        {result.ok?'✓ '+(t('sms.sendComplete')||'Sent'):'✗ '+(result.error||t('sms.sendFailed')||'Failed')}
                    </div>)}
                </div>
            </div>
        </Card>
    );
}

/* Broadcast Panel */
function BroadcastPanel({t,checkInput}){
    const[numbers,setNumbers]=useState('');
    const[message,setMessage]=useState('');
    const[loading,setLoading]=useState(false);
    const[result,setResult]=useState(null);
    const send=async()=>{if(checkInput&&checkInput(message))return;setLoading(true);setResult(null);const ns=numbers.split('\n').map(n=>n.trim()).filter(Boolean);const d=await apiFetch('/api/sms/broadcast',{method:'POST',body:JSON.stringify({numbers:ns,message})});setResult(d);setLoading(false);};
    const count=numbers.split('\n').filter(Boolean).length;
    return(
        <Card glow>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14, display:'flex', alignItems:'center', gap:8, color:'#1f2937' }}>
                <span style={{ fontSize:18 }}>📡</span>{t('sms.broadcastTitle')||'Bulk Broadcast'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('sms.numberList')||'Number List'}</div>
                    <textarea value={numbers} onChange={e=>setNumbers(e.target.value)} placeholder={'01012345678\n01098765432\n...'} rows={10} style={{ ...INPUT, resize:'vertical', fontFamily:'monospace', fontSize:11 }}/>
                    <div style={{ fontSize:10, color:'#6b7280', marginTop:4 }}>{count} {t('sms.numbersCount')||'numbers'}</div>
                </div>
                <div>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('sms.messageContent')||'Message'}</div>
                    <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={t('sms.broadcastMsgPlaceholder')||'Enter broadcast message...'} rows={6} style={{ ...INPUT, resize:'vertical' }}/>
                    <div style={{ fontSize:10, color:'#6b7280', marginTop:4 }}>{message.length}{t('sms.charUnit')||'자'} · {message.length>90?'LMS':'SMS'}</div>
                    <button onClick={send} disabled={loading||!numbers.trim()||!message.trim()} style={{ ...BTN, marginTop:12, width:'100%', opacity:(!numbers.trim()||!message.trim())?0.5:1 }}>
                        {loading?'⏳ '+(t('sms.sending')||'Sending...'):'📡 '+(t('sms.startBroadcast')||'Start Broadcast')}
                    </button>
                    {result&&(<div style={{ marginTop:10, padding:10, borderRadius:8, fontSize:12, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', color:C.green, lineHeight:1.7 }}>
                        ✓ {t('sms.done')||'Done'} — {t('sms.success')||'Success'}: {result.sent||0} · {t('sms.failed')||'Failed'}: {result.failed||0}
                    </div>)}
                </div>
            </div>
        </Card>
    );
}

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
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['all',...CATS].map(c=>(<button key={c} onClick={()=>setFilterCat(c)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid '+(filterCat===c?(catColors[c]||C.accent):'rgba(0,0,0,0.08)'), background:filterCat===c?(catColors[c]||C.accent)+'15':'transparent', color:filterCat===c?(catColors[c]||C.accent):'#6b7280', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        {c==='all'?(t('sms.tplAll')||'All'):t('sms.tplCat_'+c)||c}
                    </button>))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('sms.tplSearch')||'Search...'} style={{ ...INPUT, width:180 }}/>
                    <button onClick={()=>{setShowForm(!showForm);setEditId(null);setForm({name:'',category:'promotion',body:'',variables:''}) }} style={{ TN, fontSize:11, padding:'6px 14px' }}>+ {t('sms.tplNew')||'New'}</button>
                </div>
            </div>
            {showForm&&(
                <Card glow style={{ border:'1px solid '+C.accent+'44' }}>
                    <div style={{ fontWeight:900, fontSize:13, marginBottom:12, color:C.accent }}>{editId?'✏️ '+(t('sms.tplEdit')||'Edit'):'➕ '+(t('sms.tplCreate')||'Create')}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div><div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} >{t('sms.tplName')||'Name'}</div><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
                        <div><div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} >{t('sms.tplCategory')||'Category'}</div><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATS.map(c=><option key={c} value={c}>{t('sms.tplCat_'+c)||c}</option>)}</select></div>
                    </div>
                    <div style={{ marginTop:12, fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT, resize:'vertical' }} ><div>{t('sms.tplBody')||'Body'}</div><textarea value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} rows={4}/></div>
                    <div style={{ marginTop:10, fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} ><div>{t('sms.tplVars')||'Variables'}</div><input value={form.variables} onChange={e=>setForm(p=>({...p,variables:e.target.value}))} placeholder="#{name}, #{orderNo}"/></div>
                    <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
                        <button onClick={()=>setShowForm(false)} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', background:'transparent', color:'#374151', fontSize:12, cursor:'pointer' }}>{t('sms.cancel')||'Cancel'}</button>
                        <button onClick={save} disabled={!form.name||!form.body} style={{ ...BTN, fontSize:12, padding:'7px 16px' }}>💾 {t('sms.save')||'Save'}</button>
                    </div>
                </Card>
            )}
            {loading?(<div style={{ textAlign:'center', padding:40, color:'#6b7280' }}>⏳</div>):filtered.length===0?(
                <Card style={{ textAlign:'center', padding:40, fontSize:13, marginBottom:10, color:'#6b7280' }} ><div>📝</div><div>{t('sms.tplEmpty')||'No templates'}</div></Card>
            ):(
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
                    {filtered.map(tp=>(
                        <Card key={tp.id} style={{ padding:16, border:'1px solid '+(catColors[tp.category]||C.accent)+'22' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                <span style={{ fontWeight:800, fontSize:13, color:'#1f2937' }}>{tp.name}</span>
                                <Tag label={t('sms.tplCat_'+tp.category)||tp.category} color={catColors[tp.category]||C.accent}/>
                            </div>
                            <div style={{ fontSize:12, color:'#4b5563', lineHeight:1.6, marginBottom:10, maxHeight:60, overflow:'hidden' }}>{tp.body}</div>
                            <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                                <button onClick={()=>{setForm({name:tp.name,category:tp.category,body:tp.body,variables:(tp.variables||[]).join(', ')});setEditId(tp.id);setShowForm(true); }} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid '+C.accent+'44', background:'transparent', color:C.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>✏️ {t('sms.edit')||'Edit'}</button>
                                <button onClick={()=>del(tp.id)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid '+C.red+'44', background:'transparent', color:C.red, fontSize:10, fontWeight:700, cursor:'pointer' }}>🗑️ {t('sms.delete')||'Delete'}</button>
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
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['all',...STATUSES].map(s=>(<button key={s} onClick={()=>setFilterSt(s)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid '+(filterSt===s?(stColors[s]||C.accent):'rgba(0,0,0,0.08)'), background:filterSt===s?(stColors[s]||C.accent)+'15':'transparent', color:filterSt===s?(stColors[s]||C.accent):'#6b7280', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        {s==='all'?(t('sms.campAll')||'All'):t('sms.campStatus_'+s)||s}
                    </button>))}
                </div>
                <button onClick={()=>setShowForm(!showForm)} style={{ ...BTN, fontSize:11, padding:'6px 14px' }}>+ {t('sms.campNew')||'New Campaign'}</button>
            </div>
            {showForm&&(
                <Card glow style={{ border:'1px solid '+C.accent+'44' }}>
                    <div style={{ fontWeight:900, fontSize:13, marginBottom:12, color:C.accent }}>🚀 {t('sms.campCreate')||'Create Campaign'}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div><div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} >{t('sms.campName')||'Name'}</div><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
                        <div><div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} >{t('sms.campTemplate')||'Template'}</div><select value={form.template_id} onChange={e=>setForm(p=>({...p,template_id:e.target.value}))}><option value="">{t('sms.campSelectTpl')||'Select'}</option>{tpls.map(tp=><option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></div>
                        <div><div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} >{t('sms.campSegment')||'Segment'}</div><input value={form.segment_id} onChange={e=>setForm(p=>({...p,segment_id:e.target.value}))}/></div>
                        <div><div style={{ fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT }} >{t('sms.campSchedule')||'Schedule'}</div><input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(p=>({...p,scheduled_at:e.target.value}))}/></div>
                    </div>
                    <div style={{ marginTop:12, fontSize:10, color:'#6b7280', marginBottom:4, fontWeight:600, ...INPUT, resize:'vertical' }} ><div>{t('sms.campMessage')||'Message'}</div><textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} rows={3}/></div>
                    <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
                        <button onClick={()=>setShowForm(false)} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', background:'transparent', color:'#374151', fontSize:12, cursor:'pointer' }}>{t('sms.cancel')||'Cancel'}</button>
                        <button onClick={create} disabled={!form.name} style={{ ...BTN, fontSize:12, padding:'7px 16px' }}>🚀 {t('sms.campCreateBtn')||'Create'}</button>
                    </div>
                </Card>
            )}
            {loading?(<div style={{ textAlign:'center', padding:40, color:'#6b7280' }}>⏳</div>):filtered.length===0?(
                <Card style={{ textAlign:'center', padding:40, fontSize:13, marginBottom:10, color:'#6b7280' }} ><div>🚀</div><div>{t('sms.campEmpty')||'No campaigns'}</div></Card>
            ):(
                <div style={{ display:'grid', gap:10 }}>
                    {filtered.map(cp=>(
                        <Card key={cp.id} style={{ padding:16, display:'grid', gridTemplateColumns:'1fr auto', gap:14, alignItems:'center' }}>
                            <div>
                                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                                    <span style={{ fontWeight:800, fontSize:14, color:'#1f2937' }}>{cp.name}</span>
                                    <Tag label={t('sms.campStatus_'+cp.status)||cp.status} color={stColors[cp.status]||'#666'}/>
                                </div>
                                <div style={{ display:'flex', gap:14, fontSize:11, color:'#6b7280' }}>
                                    {cp.segment_name&&<span>👥 {cp.segment_name}</span>}
                                    {cp.template_name&&<span>📝 {cp.template_name}</span>}
                                    {cp.scheduled_at&&<span>📅 {cp.scheduled_at.slice(0,16)}</span>}
                                    {cp.sent_count!=null&&<span>📤 {cp.sent_count}</span>}
                                    {cp.success_rate!=null&&<span>✅ {cp.success_rate}%</span>}
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                                {cp.status==='draft'&&(<>
                                    <button onClick={()=>action(cp.id,'schedule')} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid '+C.accent+'44', background:'transparent', color:C.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>📅 {t('sms.campScheduleBtn')||'Schedule'}</button>
                                    <button onClick={()=>action(cp.id,'send')} style={{ padding:'5px 10px', borderRadius:6, border:'none', background:C.green, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>📤 {t('sms.campSendNow')||'Send Now'}</button>
                                </>)}
                                {cp.status==='scheduled'&&(<button onClick={()=>action(cp.id,'pause')} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid '+C.purple+'44', background:'transparent', color:C.purple, fontSize:10, fontWeight:700, cursor:'pointer' }}>⏸️ {t('sms.campPause')||'Pause'}</button>)}
                                {cp.status==='paused'&&(<button onClick={()=>action(cp.id,'resume')} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid '+C.accent+'44', background:'transparent', color:C.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>▶️ {t('sms.campResume')||'Resume'}</button>)}
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
    const csv=[h.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))].join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sms_history_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

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
        <div style={{ display:'grid', gap:18 }}>
            <Card glow style={{ textAlign:'center', padding:32, background:'linear-gradient(135deg,rgba(79,142,247,0.06),rgba(167,139,250,0.04))' }}>
                <div style={{ fontSize:44 }}>📱</div>
                <div style={{ fontWeight:900, fontSize:22, marginTop:8, color:'#1f2937' }}>{t('sms.guideTitle')||'SMS Marketing Guide'}</div>
                <div style={{ fontSize:13, color:'#374151', fontWeight:600, marginTop:6, maxWidth:600, margin:'6px auto 0', lineHeight:1.7 }}>{t('sms.guideSub')||'Step-by-step guide'}</div>
            </Card>
            <Card glow style={{ padding:20 }}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1f2937' }}>{t('sms.guideStepsTitle')||'Usage Steps'}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                    {STEPS.map((s,i)=>(
                        <div key={i} style={{ background:s.c+'0a', border:'1px solid '+s.c+'25', borderRadius:12, padding:16 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                <span style={{ fontSize:14, fontWeight:900, background:s.c, color:'#fff', width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{s.n}</span>
                                <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{t('sms.'+s.k+'Title')||'Step '+s.n}</span>
                            </div>
                            <div style={{ fontSize:12, color:'#6b7280', lineHeight:1.7 }}>{t('sms.'+s.k+'Desc')||''}</div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card glow style={{ padding:20 }}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1f2937' }}>{t('sms.guideTabsTitle')||'Tab Guide'}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
                    {TABS.map((tb,i)=>(
                        <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 12px', background:'rgba(0,0,0,0.02)', borderRadius:10, border:'1px solid rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize:18, flexShrink:0 }}>{tb.icon}</span>
                            <div>
                                <div style={{ fontWeight:700, fontSize:12, color:tb.c }}>{t('sms.'+tb.k+'Name')||''}</div>
                                <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>{t('sms.'+tb.k+'Desc')||''}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <div style={{ background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:14, padding:20 }}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:12, color:'#1f2937' }}>💡 {t('sms.guideTipsTitle')||'Expert Tips'}</div>
                <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'#4b5563', lineHeight:2.2 }}>
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
        <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
            {secLocked&&(
                <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ background:'#fff', border:'2px solid '+C.red, borderRadius:20, padding:32, maxWidth:380, textAlign:'center', boxShadow:'0 24px 64px rgba(239,68,68,0.2)' }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>🛡️</div>
                        <div style={{ fontWeight:900, fontSize:18, color:C.red, marginBottom:8 }}>{t('sms.secLockTitle')||'Security Alert'}</div>
                        <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, marginBottom:20 }}>{t('sms.secLockDesc')||'Abnormal access detected'}</div>
                        <button onClick={()=>setSecLocked(false)} style={{ ...BTN, background:C.red }}>{t('sms.dismiss')||'Dismiss'}</button>
                    </div>
                </div>
            )}

            {/* Warning + Sync Bar */}
            {ihubChannels.length===0&&(
                <div style={{ margin:'0 0 8px', padding:'10px 16px', borderRadius:10, background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.3)', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                    <span style={{ color:'#92400e' }}>⚠️ {t('sms.noChannels')||'No SMS channels connected'}</span>
                    <button onClick={()=>navigate('/integration-hub')} style={{ padding:'5px 14px', borderRadius:8, border:'none', background:C.accent, color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer' }}>{t('sms.goHub')||'Go to Hub'}</button>
                </div>
            )}
            <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(79,142,247,0.04)', border:'1px solid rgba(79,142,247,0.12)', fontSize:10, color:C.accent, fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:C.green }}/>
                {t('sms.liveSyncStatus')||'Real-time sync active'}
                <button onClick={loadData} style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:6, border:'1px solid '+C.accent+'33', background:'transparent', color:C.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>{t('sms.syncNow')||'Sync Now'}</button>
            </div>

            {/* Hero */}
            <div style={{ borderRadius:16, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', padding:'22px 28px', marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
                    <div>
                        <div style={{ fontSize:24, fontWeight:900, color:'#1f2937' }}>📱 {t('sms.heroTitle')||'SMS Marketing'}</div>
                        <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>{t('sms.heroDesc')||'Compose · Broadcast · Templates · Campaigns'}</div>
                        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                            <Tag label={(t('sms.sent')||'Sent')+' '+(stats.sent||0).toLocaleString()} color={C.accent}/>
                            {ihubChannels.length>0&&<Tag label={'🔗 '+ihubChannels.length+' '+(t('sms.ihubLinked')||'connected')} color={C.green}/>}
                            <Tag label="🛡️ Security Active" color={C.cyan}/>
                        </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        {[{l:t('sms.kpiSent')||'Sent',v:stats.sent||0,c:C.accent},{l:t('sms.kpiSuccess')||'Delivered',v:stats.delivered||0,c:C.green},{l:t('sms.kpiFailed')||'Failed',v:stats.failed||0,c:C.red}].map(k=>(
                            <div key={k.l} style={{ padding:'8px 14px', borderRadius:10, background:k.c+'10', border:'1px solid '+k.c+'22', textAlign:'center' }}>
                                <div style={{ fontSize:18, fontWeight:900, color:k.c }}>{k.v}</div>
                                <div style={{ fontSize:10, color:'#6b7280' }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, padding:5, background:'rgba(0,0,0,0.04)', borderRadius:14, overflowX:'auto', flexShrink:0, marginBottom:12 }}>
                {TABS.map(tb=>(
                    <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ padding:'8px 14px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, flex:1, whiteSpace:'nowrap', background:tab===tb.id?C.accent:'transparent', color:tab===tb.id?'#fff':'#4b5563', transition:'all 150ms' }}>{tb.label}</button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex:1, overflowY:'auto', paddingBottom:20 }}>
                {tab==='compose'&&<ComposePanel t={t} onSent={loadData} checkInput={checkInput}/>}
                {tab==='broadcast'&&<BroadcastPanel t={t} checkInput={checkInput}/>}
                {tab==='templates'&&<TemplatesPanel t={t} checkInput={checkInput}/>}
                {tab==='campaigns'&&<CampaignsPanel t={t}/>}
                {tab==='history'&&(
                    <Card glow>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                            <div style={{ fontWeight:800, fontSize:15, color:'#1f2937' }}>📜 {t('sms.historyTitle')||'Message History'}</div>
                            {messages.length>0&&(<button onClick={()=>downloadSmsCsv(messages,t)} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid '+C.accent+'44', background:'transparent', color:C.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>📥 {t('sms.exportCsv')||'CSV'}</button>)}
                        </div>
                        {messages.length===0?(
                            <div style={{ textAlign:'center', padding:30, color:'#6b7280', fontSize:12 }}>{t('sms.noHistory')||'No messages yet'}</div>
                        ):(
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                                    <thead><tr style={{ borderBottom:'2px solid rgba(0,0,0,0.08)' }}>
                                        {[t('sms.type')||'Type',t('sms.recipientNumber')||'To',t('sms.content')||'Content',t('sms.status')||'Status',t('sms.sendTime')||'Time'].map(h=>(<th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'#374151' }}>{h}</th>))}
                                    </tr></thead>
                                    <tbody>{messages.map((m,i)=>{
                                        const sc={delivered:C.green,sent:C.accent,failed:C.red,pending:C.yellow}[m.status]||'#666';
                                        return(<tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                                            <td style={{ padding:'8px 12px' }}><Tag label={m.msg_type||'SMS'} color={m.msg_type==='LMS'?C.purple:C.accent}/></td>
                                            <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:11, color:'#374151' }}>{m.recipient}</td>
                                            <td style={{ padding:'8px 12px', fontSize:11, color:'#4b5563', maxWidth:250 }}>{(m.body||'').slice(0,50)}</td>
                                            <td style={{ padding:'8px 12px' }}><Tag label={m.status} color={sc}/></td>
                                            <td style={{ padding:'8px 12px', fontSize:10, color:'#6b7280' }}>{(m.sent_at||'').slice(0,16)}</td>
                                        </tr>);
                                    })}</tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}
                {tab==='stats'&&(
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                        {[{l:t('sms.statsSentThisMonth')||'Sent This Month',v:(stats.sent||0).toLocaleString(),c:C.accent},{l:t('sms.statsSuccessRate')||'Success Rate',v:(stats.sent>0?(stats.delivered/stats.sent*100).toFixed(1):'0.0')+'%',c:C.green},{l:t('sms.statsBalance')||'Balance',v:settings?.balance||'0',c:C.yellow}].map(k=>(
                            <Card key={k.l} glow style={{ textAlign:'center' }}>
                                <div style={{ fontSize:24, fontWeight:900, color:k.c }}>{k.v}</div>
                                <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>{k.l}</div>
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
