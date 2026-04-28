const fs = require('fs');
const out = `/**
 * EmailMarketing.jsx — Enterprise v13 (Fixed JSX + i18n + Visibility)
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import { useI18n } from '../i18n';
import { useSecurityGuard, sanitizeInput, detectXSS } from "../security/SecurityGuard.js";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import CreativeStudioTab from "./CreativeStudioTab.jsx";
import { useNavigate } from "react-router-dom";

const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    cardHover: "var(--surface)", border: "var(--border, rgba(0,0,0,0.08))",
    accent: "#4f8ef7", accentDark: "#3a6fd8",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", cyan: "#22d3ee",
    muted: "var(--text-3, #6b7280)", text: "var(--text-1, #1e293b)",
    glass: "var(--surface)",
};
const INPUT = { width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.9)",border:"1px solid rgba(0,0,0,0.1)",color:"#1e293b",boxSizing:"border-box",fontSize:13,outline:"none" };
const BTN = { padding:"10px 22px",borderRadius:10,border:"none",background:C.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13 };

function Card({ children, style, glow }) {
    const [h, setH] = useState(false);
    return (<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{ background:h?'rgba(255,255,255,0.98)':'rgba(255,255,255,0.95)',borderRadius:16,padding:24,border:\`1px solid \${h?C.accent+'44':'rgba(0,0,0,0.08)'}\`,transition:'all 0.3s',boxShadow:h&&glow?\`0 0 24px \${C.accent}15\`:'none',...style }}>{children}</div>);
}

function KpiBadge({ icon, label, value, color, sub }) {
    return (<Card glow style={{ textAlign:"center",minWidth:0 }}>
        <div style={{ fontSize:24,marginBottom:6 }}>{icon}</div>
        <div style={{ fontSize:11,color:'#6b7280',marginBottom:4,letterSpacing:0.5,textTransform:"uppercase" }}>{label}</div>
        <div style={{ fontSize:22,fontWeight:800,color:color||'#1e293b' }}>{value}</div>
        {sub && <div style={{ fontSize:11,color:'#6b7280',marginTop:4 }}>{sub}</div>}
    </Card>);
}

function SecureInput({ value, onChange, type="text", placeholder, style: sx, addAlert, ...rest }) {
    const handleChange = useCallback((e)=>{
        const val=e.target.value;
        if(detectXSS(val)){if(addAlert)addAlert({type:'error',msg:'XSS blocked'});return;}
        onChange(e);
    },[onChange,addAlert]);
    return (<input type={type} value={value} onChange={handleChange} placeholder={placeholder} style={{...INPUT,...sx}} {...rest}/>);
}

/* Settings Tab */
function SettingsTab() {
    const {t}=useI18n();
    const {emailSettings,updateEmailSettings,addAlert}=useGlobalData();
    const [localSet,setLocalSet]=useState(emailSettings);
    const [msg,setMsg]=useState("");
    const [saving,setSaving]=useState(false);
    useEffect(()=>{setLocalSet(emailSettings);},[emailSettings]);
    const save=()=>{
        setSaving(true);
        setTimeout(()=>{
            updateEmailSettings(localSet);setSaving(false);
            setMsg(t('email.aiSetSaved')||'Settings saved');
            addAlert({type:'info',msg:'Email settings updated'});
            setTimeout(()=>setMsg(""),3000);
        },400);
    };
    return (
        <div style={{maxWidth:720}}>
            <Card glow>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
                    <span style={{fontSize:22}}>📮</span>
                    <div style={{fontWeight:800,fontSize:16,color:'#1f2937'}}>{t('email.setTitle')||'Email Provider Settings'}</div>
                </div>
                <div style={{marginBottom:20}}>
                    <div style={{fontSize:12,color:'#6b7280',marginBottom:8,fontWeight:600,textTransform:"uppercase"}}>{t('email.lblProvider')||'Provider'}</div>
                    <div style={{display:"flex",gap:10}}>
                        {[["smtp","SMTP"],["ses","AWS SES"]].map(([val,label])=>(
                            <button key={val} onClick={()=>setLocalSet(s=>({...s,provider:val}))} style={{
                                padding:"10px 20px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
                                background:localSet.provider===val?C.accent:'rgba(0,0,0,0.04)',
                                color:localSet.provider===val?"#fff":"#374151",
                            }}>{label}</button>
                        ))}
                    </div>
                </div>
                {localSet.provider==="smtp" && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                        {[
                            [t('email.lblSmtpHost')||"SMTP Host","smtp_host","smtp.gmail.com"],
                            [t('email.lblSmtpPort')||"SMTP Port","smtp_port","587"],
                            [t('email.lblSmtpUser')||"SMTP User","smtp_user","user@example.com"],
                            [t('email.lblPassword')||"Password","smtp_pass","••••••••"],
                            [t("email.fromEmail")||"From Email","from_email","noreply@yourdomain.com"],
                            [t("email.fromName")||"From Name","from_name","Geniego-ROI"],
                        ].map(([label,key,ph])=>(
                            <div key={key}>
                                <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{label}</div>
                                <SecureInput type={key==="smtp_pass"?"password":"text"} value={localSet[key]||""} onChange={e=>setLocalSet(s=>({...s,[key]:e.target.value}))} placeholder={ph} addAlert={addAlert}/>
                            </div>
                        ))}
                    </div>
                )}
                {localSet.provider==="ses" && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                        {[
                            [t("email.awsRegion")||'AWS Region',"aws_region","ap-northeast-2"],
                            ["Access Key ID","aws_key","AKIA..."],
                            ["Secret Access Key","aws_secret","••••••••"],
                            [t("email.fromEmail")||"From Email","from_email","noreply@yourdomain.com"],
                            [t("email.fromName")||"From Name","from_name","Geniego-ROI"],
                        ].map(([label,key,ph])=>(
                            <div key={key} style={{gridColumn:key==="aws_secret"?"span 2":undefined}}>
                                <div style={{fontSize:11,color:'#6b7280',marginBottom:6,fontWeight:600}}>{label}</div>
                                <SecureInput type={key.includes("secret")?"password":"text"} value={localSet[key]||""} onChange={e=>setLocalSet(s=>({...s,[key]:e.target.value}))} placeholder={ph} addAlert={addAlert}/>
                            </div>
                        ))}
                    </div>
                )}
                {msg && <div style={{marginTop:16,fontSize:13,color:C.green,fontWeight:600}}>✅ {msg}</div>}
                <button onClick={save} disabled={saving} style={{...BTN,marginTop:20,opacity:saving?0.7:1,background:C.accent}}>
                    {saving?"⏳ "+(t('email.saving')||"Saving..."):(t('email.setSaveBtn')||"💾 Save Settings")}
                </button>
            </Card>
        </div>
    );
}
`;
fs.writeFileSync(__dirname+'/src/pages/EmailMarketing.jsx', out, 'utf8');
console.log('Part 1 written:', out.length, 'chars');
