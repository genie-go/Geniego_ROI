const fs=require('fs');
const out=`/**
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

const API=import.meta.env.VITE_API_BASE||'';
const apiFetch=async(path,opts={})=>{const tk=localStorage.getItem('genie_token')||"";const r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk,...(opts.headers||{})}});return r.json().catch(()=>({}));};

const C={accent:"#4f8ef7",green:"#22c55e",red:"#ef4444",yellow:"#eab308",purple:"#a855f7",cyan:"#06b6d4"};
const INPUT={width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1e293b",boxSizing:"border-box",fontSize:13,outline:"none"};
const BTN={padding:"10px 22px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13};

function Card({children,style,glow}){
    const[h,setH]=useState(false);
    return(<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:h?'rgba(255,255,255,0.98)':'rgba(255,255,255,0.95)',borderRadius:16,padding:24,border:\`1px solid \${h?C.accent+'44':'rgba(0,0,0,0.08)'}\`,transition:'all 0.3s',boxShadow:h&&glow?\`0 0 24px \${C.accent}15\`:'none',...style}}>{children}</div>);
}
function Tag({label,color=C.accent}){return(<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:color+'18',color,border:'1px solid '+color+'33',fontWeight:700}}>{label}</span>);}

/* Security Monitor */
const SEC_PATS=[/<script/i,/javascript:/i,/on(error|load|click)=/i,/eval\\s*\\(/i,/document\\.(cookie|write)/i,/union\\s+(all\\s+)?select/i,/drop\\s+table/i];
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
        <div style={{display:'grid',gap:14,maxWidth:720}}>
            <Card glow>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
                    <span style={{fontSize:22}}>⚙️</span>
                    <div style={{fontWeight:800,fontSize:16,color:'#1f2937'}}>{t('sms.tabSettings')||'SMS Provider Settings'}</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                    {PROVS.map(p=>(<button key={p.id} onClick={()=>setForm(f=>({...f,provider:p.id}))} style={{padding:'8px 14px',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:11,background:form.provider===p.id?p.color:'rgba(0,0,0,0.04)',color:form.provider===p.id?'#fff':'#374151',border:'none'}}>
                        <div>{p.name}</div><div style={{fontSize:9,opacity:0.7,marginTop:2}}>{p.desc}</div>
                    </button>))}
                </div>
                <div style={{padding:'16px 20px',borderRadius:14,background:(prov?.color||C.accent)+'06',border:'1px solid '+(prov?.color||C.accent)+'22'}}>
                    <div style={{fontWeight:900,fontSize:12,color:prov?.color||C.accent,marginBottom:12}}>🔑 {prov?.name} {t('sms.apiKeySettings')||'API Key Settings'}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginBottom:12}}>
                        {[{k:'app_key',l:'App Key / App ID',ph:'...'},{k:'secret_key',l:'Secret Key',ph:'...',secret:true},{k:'sender_no',l:t('sms.senderNumber')||'Sender Number',ph:'01012345678'}].map(f=>(
                            <div key={f.k}>
                                <div style={{fontSize:10,color:'#6b7280',marginBottom:4,fontWeight:600}}>{f.l}</div>
                                <input type={f.secret?'password':'text'} placeholder={f.ph} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...INPUT}}/>
                            </div>
                        ))}
                    </div>
                    <button onClick={save} disabled={loading} style={{...BTN,background:prov?.color||C.accent}}>
                        {loading?'⏳ '+(t('sms.connectTesting')||'Testing...'):'💾 '+(t('sms.saveAndTest')||'Save & Test')}
                    </button>
                    {result&&(<div style={{marginTop:10,padding:'8px 12px',borderRadius:8,fontSize:12,background:result.ok?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',border:'1px solid '+(result.ok?'#22c55e':'#ef4444')+'33',color:result.ok?'#22c55e':'#ef4444'}}>
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
            <div style={{fontWeight:800,fontSize:15,marginBottom:14,display:'flex',alignItems:'center',gap:8,color:'#1f2937'}}>
                <span style={{fontSize:18}}>✏️</span>{t('sms.composeTitle')||'Compose SMS'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:14,alignItems:'start'}}>
                <div>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('sms.recipientNumber')||'Recipient'}</div>
                    <input value={form.to} onChange={e=>setForm(p=>({...p,to:e.target.value}))} placeholder="01012345678" style={{...INPUT}}/>
                    <div style={{marginTop:14,padding:10,borderRadius:10,background:'rgba(0,0,0,0.02)',fontSize:11,lineHeight:2}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#6b7280'}}>{t('sms.type')||'Type'}</span><Tag label={msgType} color={msgType==='LMS'?C.purple:C.accent}/></div>
                        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#6b7280'}}>{t('sms.charCount')||'Characters'}</span><span style={{color:C.yellow,fontWeight:700}}>{form.message.length}{t('sms.charUnit')||'자'}</span></div>
                        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#6b7280'}}>{t('sms.capacity')||'Size'}</span><span style={{color:'#374151'}}>{bytes}bytes</span></div>
                    </div>
                </div>
                <div>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('sms.messageContent')||'Message'}</div>
                    <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder={t('sms.messagePlaceholder')||'Enter message...'} rows={6} style={{...INPUT,resize:'vertical',lineHeight:1.6}}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                        <div style={{fontSize:10,color:'#6b7280'}}>{msgType==='SMS'?(t('sms.smsCostInfo')||'SMS: ~20 KRW/msg'):(t('sms.lmsCostInfo')||'LMS: ~50 KRW/msg')}</div>
                        <button onClick={send} disabled={loading||!form.to||!form.message} style={{...BTN,opacity:(!form.to||!form.message)?0.5:1}}>
                            {loading?'⏳':'📤 '+(t('sms.send')||'Send')}
                        </button>
                    </div>
                    {result&&(<div style={{marginTop:8,padding:8,borderRadius:8,fontSize:12,color:result.ok?C.green:C.red}}>
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
    const send=async()=>{if(checkInput&&checkInput(message))return;setLoading(true);setResult(null);const ns=numbers.split('\\n').map(n=>n.trim()).filter(Boolean);const d=await apiFetch('/api/sms/broadcast',{method:'POST',body:JSON.stringify({numbers:ns,message})});setResult(d);setLoading(false);};
    const count=numbers.split('\\n').filter(Boolean).length;
    return(
        <Card glow>
            <div style={{fontWeight:800,fontSize:15,marginBottom:14,display:'flex',alignItems:'center',gap:8,color:'#1f2937'}}>
                <span style={{fontSize:18}}>📡</span>{t('sms.broadcastTitle')||'Bulk Broadcast'}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('sms.numberList')||'Number List'}</div>
                    <textarea value={numbers} onChange={e=>setNumbers(e.target.value)} placeholder={'01012345678\\n01098765432\\n...'} rows={10} style={{...INPUT,resize:'vertical',fontFamily:'monospace',fontSize:11}}/>
                    <div style={{fontSize:10,color:'#6b7280',marginTop:4}}>{count} {t('sms.numbersCount')||'numbers'}</div>
                </div>
                <div>
                    <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{t('sms.messageContent')||'Message'}</div>
                    <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={t('sms.broadcastMsgPlaceholder')||'Enter broadcast message...'} rows={6} style={{...INPUT,resize:'vertical'}}/>
                    <div style={{fontSize:10,color:'#6b7280',marginTop:4}}>{message.length}{t('sms.charUnit')||'자'} · {message.length>90?'LMS':'SMS'}</div>
                    <button onClick={send} disabled={loading||!numbers.trim()||!message.trim()} style={{...BTN,marginTop:12,width:'100%',opacity:(!numbers.trim()||!message.trim())?0.5:1}}>
                        {loading?'⏳ '+(t('sms.sending')||'Sending...'):'📡 '+(t('sms.startBroadcast')||'Start Broadcast')}
                    </button>
                    {result&&(<div style={{marginTop:10,padding:10,borderRadius:8,fontSize:12,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',color:C.green,lineHeight:1.7}}>
                        ✓ {t('sms.done')||'Done'} — {t('sms.success')||'Success'}: {result.sent||0} · {t('sms.failed')||'Failed'}: {result.failed||0}
                    </div>)}
                </div>
            </div>
        </Card>
    );
}
`;
fs.writeFileSync(__dirname+'/src/pages/SmsMarketing.jsx',out,'utf8');
console.log('SMS Part 1:',out.length,'chars');
