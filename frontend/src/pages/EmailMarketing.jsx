/**
 * EmailMarketing.jsx — Enterprise v13 (Fixed JSX + i18n + Visibility)
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { useAuth } from "../auth/AuthContext";
import { tabAllowedByPlan } from "../auth/tabPlanPolicy.js"; // [현 차수] 플랜별 탭 노출
import { IS_DEMO as _IS_DEMO_EM } from "../utils/demoEnv";
import PlanGate from "../components/PlanGate.jsx";
import GuideWizard from '../components/GuideWizard.jsx'; // [237차] 인앱 순차 완료 위저드(필수등록 게이팅)
import { getJsonAuth as _gjaEmail } from '../services/apiClient.js';
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { emailApi } from "../services/emailApi.js"; // 191차 2단계: 운영 백엔드 실배선(/email/*, /crm/segments)
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
    return (<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{ background:h?'rgba(255,255,255,0.98)':'rgba(255,255,255,0.95)',borderRadius:16,padding:24,border:`1px solid ${h?C.accent+'44':'rgba(0,0,0,0.08)'}`,transition:'all 0.3s',boxShadow:h&&glow?`0 0 24px ${C.accent}15`:'none',...style }}>{children}</div>);
}

function KpiBadge({ icon, label, value, color, sub }) {
    return (<Card glow style={{ display:"flex", alignItems:"center", gap:14, minWidth:0, padding:"16px 20px" }}>
        <div style={{ fontSize:28, flex:"0 0 auto" }}>{icon}</div>
        <div style={{ minWidth:0 }}>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:4, letterSpacing:0.5, textTransform:"uppercase" }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:color||'#1e293b' }}>{value}</div>
            {sub && <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>{sub}</div>}
        </div>
    </Card>);
}

function SecureInput({ value, onChange, type="text", placeholder, style: sx, addAlert, ...rest }) {
    const handleChange = useCallback((e)=>{
        const val=e.target.value;
        if(detectXSS(val)){if(addAlert)addAlert({type:'error',msg:'XSS blocked'});return;}
        onChange(e);
    },[onChange,addAlert]);
    return (<input type={type} value={value} onChange={handleChange} placeholder={placeholder} style={{ ...INPUT, ...sx }} {...rest}/>);
}

/* Settings Tab */
function SettingsTab() {
    const {t}=useI18n();
    const { emailSettings,updateEmailSettings,addAlert, isDemo } = useGlobalData();
    const [localSet,setLocalSet]=useState(emailSettings);
    const [msg,setMsg]=useState("");
    const [saving,setSaving]=useState(false);
    useEffect(()=>{setLocalSet(emailSettings);},[emailSettings]);
    // 191차 2단계 운영 실배선: 백엔드 email_settings 로드(비밀번호/시크릿은 응답에서 마스킹됨 → 변경 시에만 재입력).
    //   데모는 GlobalData 로컬 시뮬레이션 유지.
    useEffect(()=>{ if(isDemo) return; let on=true;
        emailApi.getSettings().then(r=>{ if(on && r?.settings) setLocalSet(s=>({...s,...r.settings})); }).catch(()=>{});
        return ()=>{on=false;};
    },[isDemo]);
    const save=async()=>{
        setSaving(true);
        if(isDemo){
            setTimeout(()=>{
                updateEmailSettings(localSet);setSaving(false);
                setMsg(t('email.aiSetSaved', 'Settings saved'));
                addAlert({type:'info',msg:'Email settings updated'});
                setTimeout(()=>setMsg(""),3000);
            },400);
            return;
        }
        try{
            await emailApi.saveSettings(localSet); // 빈 smtp_pass/aws_secret 은 백엔드가 기존값 보존(미덮어쓰기)
            setMsg(t('email.aiSetSaved', 'Settings saved'));
            addAlert({type:'info',msg:'Email settings updated'});
            setTimeout(()=>setMsg(""),3000);
        }catch(e){ addAlert({type:'error',msg:'설정 저장 실패: '+(e?.message||'')}); }
        finally{ setSaving(false); }
    };
    return (
        <div style={{ maxWidth:720 }}>
            <Card glow>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                    <span style={{ fontSize:22 }}>📮</span>
                    <div style={{ fontWeight:800, fontSize:16, color:'#1f2937' }}>{t('email.setTitle', 'Email Provider Settings')}</div>
                </div>
                <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, color:'#6b7280', marginBottom:8, fontWeight:600, textTransform:"uppercase" }}>{t('email.lblProvider', 'Provider')}</div>
                    <div style={{ display:"flex", gap:10 }}>
                        {[["smtp","SMTP"],["ses","AWS SES"]].map(([val,label])=>(
                            <button key={val} onClick={()=>setLocalSet(s=>({...s,provider:val}))} style={{ padding:"10px 20px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, background:localSet.provider===val?C.accent:'rgba(0,0,0,0.04)', color:localSet.provider===val?"#fff":"#374151" }}>{label}</button>
                        ))}
                    </div>
                </div>
                {localSet.provider==="smtp" && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {[
                            [t('email.lblSmtpHost', "SMTP Host"),"smtp_host","smtp.gmail.com"],
                            [t('email.lblSmtpPort', "SMTP Port"),"smtp_port","587"],
                            [t('email.lblSmtpUser', "SMTP User"),"smtp_user","user@example.com"],
                            [t('email.lblPassword', "Password"),"smtp_pass","••••••••"],
                            [t("email.fromEmail", "From Email"),"from_email","noreply@yourdomain.com"],
                            [t("email.fromName", "From Name"),"from_name","Geniego-ROI"],
                        ].map(([label,key,ph])=>(
                            <div key={key}>
                                <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{label}</div>
                                <SecureInput type={key==="smtp_pass"?"password":"text"} value={localSet[key]||""} onChange={e=>setLocalSet(s=>({...s,[key]:e.target.value}))} placeholder={ph} addAlert={addAlert}/>
                            </div>
                        ))}
                    </div>
                )}
                {localSet.provider==="ses" && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        {[
                            [t("email.awsRegion", 'AWS Region'),"aws_region","ap-northeast-2"],
                            ["Access Key ID","aws_key","AKIA..."],
                            ["Secret Access Key","aws_secret","••••••••"],
                            [t("email.fromEmail", "From Email"),"from_email","noreply@yourdomain.com"],
                            [t("email.fromName", "From Name"),"from_name","Geniego-ROI"],
                        ].map(([label,key,ph])=>(
                            <div key={key} style={{ gridColumn:key==="aws_secret"?"span 2":undefined }}>
                                <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{label}</div>
                                <SecureInput type={key.includes("secret")?"password":"text"} value={localSet[key]||""} onChange={e=>setLocalSet(s=>({...s,[key]:e.target.value}))} placeholder={ph} addAlert={addAlert}/>
                            </div>
                        ))}
                    </div>
                )}
                {msg && <div style={{ marginTop:16, fontSize:13, color:C.green, fontWeight:600 }}>✅ {msg}</div>}
                <button onClick={save} disabled={saving} style={{ ...BTN, marginTop:20, opacity:saving?0.7:1, background:C.accent }}>
                    {saving?"⏳ "+(t('email.saving', "Saving...")):(t('email.setSaveBtn', "💾 Save Settings"))}
                </button>
            </Card>
        </div>
    );
}

/* Templates Tab */
function TemplatesTab() {
    const {t}=useI18n();
    // 191차 2단계: 운영=백엔드(/email/templates) CRUD, 데모=GlobalData 로컬 유지.
    const {emailTemplates:gdTemplates,updateEmailTemplates,addAlert,isDemo}=useGlobalData();
    const [opTemplates,setOpTemplates]=useState([]);
    const emailTemplates = isDemo ? gdTemplates : opTemplates;
    const [editId,setEditId]=useState("new");
    const [form,setForm]=useState({name:"",subject:"",html_body:"",category:"general"});
    const [msg,setMsg]=useState("");
    const reloadOp=()=>{ emailApi.listTemplates().then(r=>setOpTemplates(r.templates||[])).catch(()=>{}); };
    useEffect(()=>{ if(isDemo) return; reloadOp(); },[isDemo]);
    // 목록 항목 선택 → 폼 채우기(운영은 목록에 html_body 미포함이라 전체 조회)
    const pick=async(tx)=>{
        setEditId(tx.id);
        if(isDemo){ setForm({name:tx.name,subject:tx.subject,html_body:tx.html_body,category:tx.category}); return; }
        try{ const r=await emailApi.getTemplate(tx.id); const tp=r.template||tx;
            setForm({name:tp.name||"",subject:tp.subject||"",html_body:tp.html_body||"",category:tp.category||"general"});
        }catch(e){ setForm({name:tx.name||"",subject:tx.subject||"",html_body:"",category:tx.category||"general"}); }
    };
    const save=async()=>{
        if(!form.name||!form.subject)return;
        if(detectXSS(form.name)||detectXSS(form.subject)){addAlert({type:'error',msg:'XSS blocked'});return;}
        if(isDemo){
            let next=[...gdTemplates];
            if(editId==="new"){next.push({id:"tpl_"+Date.now(),...form,createdAt:new Date().toISOString()});addAlert({type:'success',msg:'Template created: "'+form.name+'"'});}
            else{next=next.map(x=>x.id===editId?{...x,...form,updatedAt:new Date().toISOString()}:x);addAlert({type:'info',msg:'Template updated'});}
            updateEmailTemplates(next);
        } else {
            try{
                if(editId==="new"){ await emailApi.createTemplate(form); addAlert({type:'success',msg:'Template created: "'+form.name+'"'}); }
                else{ await emailApi.updateTemplate(editId, form); addAlert({type:'info',msg:'Template updated'}); }
                reloadOp();
            }catch(e){ addAlert({type:'error',msg:'템플릿 저장 실패: '+(e?.message||'')}); return; }
        }
        setMsg(t('email.saved', 'Saved'));setEditId("new");setForm({name:"",subject:"",html_body:"",category:"general"});setTimeout(()=>setMsg(""),2500);
    };
    const del=async(id)=>{
        if(!confirm(t("email.msgDelConfirm", "Delete?")))return;
        if(isDemo){ updateEmailTemplates(gdTemplates.filter(x=>x.id!==id)); addAlert({type:'warn',msg:'Template deleted'}); return; }
        try{ await emailApi.deleteTemplate(id); addAlert({type:'warn',msg:'Template deleted'}); reloadOp();
            if(editId===id){setEditId("new");setForm({name:"",subject:"",html_body:"",category:"general"});}
        }catch(e){ addAlert({type:'error',msg:'삭제 실패: '+(e?.message||'')}); }
    };
    const CATS=[{id:"general",label:t('email.catGeneral', "General"),icon:"📋"},{id:"welcome",label:t('email.catWelcome', "Welcome"),icon:"👋"},{id:"promotion",label:t('email.catPromo', "Promotion"),icon:"🎯"},{id:"retention",label:t('email.catRetention', "Retention"),icon:"🔄"},{id:"transactional",label:t('email.catTxn', "Transactional"),icon:"🧾"}];
    return (
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20 }}>
            <div>
                <button onClick={()=>{setEditId("new");setForm({name:"",subject:"",html_body:"",category:"general"}); }} data-onboard-cta="email-template" data-onboard-hint={t("email.onboardHint","여기서 이메일 템플릿을 만드세요")} style={{ width:"100%", padding:"12px", borderRadius:12, border:"1px dashed "+C.accent, background:"none", color:C.accent, fontWeight:700, cursor:"pointer", marginBottom:14, fontSize:13 }}>
                    ✨ {t("email.tplNew", "New Template")}
                </button>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {emailTemplates.length===0 && <div style={{ textAlign:"center", padding:24, color:'#6b7280', fontSize:12 }}>{t('email.noTemplates', "No templates yet.")}</div>}
                    {emailTemplates.map(tx=>{
                        const cat=CATS.find(c=>c.id===tx.category);
                        return (
                            <div key={tx.id} onClick={()=>pick(tx)} style={{ background:editId===tx.id?C.accent+'15':'rgba(255,255,255,0.95)', border:'1px solid '+(editId===tx.id?C.accent:'rgba(0,0,0,0.08)'), borderRadius:12, padding:"12px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <div>
                                    <div style={{ fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:6, color:'#1f2937' }}><span>{cat?.icon||"📋"}</span> {tx.name}</div>
                                    <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{cat?.label||tx.category}</div>
                                </div>
                                <button onClick={e=>{e.stopPropagation();del(tx.id); }} style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:14, padding:4 }}>🗑</button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <Card glow>
                <div style={{ fontWeight:800, marginBottom:18, fontSize:15, display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
                    <span style={{ fontSize:18 }}>{editId==="new"?"✨":"✏️"}</span>
                    {editId==="new"?(t("email.tplCreate", "Create Template")):(t("email.tplEdit", "Edit Template"))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                    <div>
                        <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('email.lblTplName', "Template Name")}</div>
                        <SecureInput value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} addAlert={addAlert}/>
                    </div>
                    <div>
                        <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('email.lblCategory', "Category")}</div>
                        <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{ ...INPUT }}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                    </div>
                </div>
                <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('email.lblSubject', "Subject Line")}</div>
                    <SecureInput value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder={t("email.subjPh", "Enter subject...")} addAlert={addAlert}/>
                </div>
                <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t("email.tfBody", "HTML Body")}</div>
                    <textarea value={form.html_body} onChange={e=>{if(detectXSS(e.target.value)){addAlert({type:'error',msg:'XSS detected'});return;}setForm(f=>({...f,html_body:e.target.value}));}} rows={14} style={{ ...INPUT, resize:"vertical", fontFamily:"monospace", lineHeight:1.6, fontSize:12 }}/>
                </div>
                {msg && <div style={{ fontSize:12, color:C.green, marginTop:10, fontWeight:600 }}>✅ {msg}</div>}
                <button onClick={save} disabled={!form.name||!form.subject||!form.html_body} style={{ ...BTN, marginTop:16, opacity:(!form.name||!form.subject||!form.html_body)?0.5:1, background:C.accent }}>
                    {editId==="new"?(t("email.btnTplSave", "💾 Save Template")):(t("email.btnEditSave", "💾 Save Changes"))}
                </button>
            </Card>
        </div>
    );
}

/* Campaigns Tab */
function CampaignsTab() {
    const {t}=useI18n();
    // 191차 2단계: 운영=백엔드(/email/campaigns·/email/templates·/crm/segments), 데모=GlobalData 로컬 유지.
    const {crmSegments:gdSegments,emailCampaignsLinked:gdCampaigns,addEmailCampaign,updateEmailCampaign,crmCustomerHistory,emailTemplates:gdTemplates,addAlert,emailSettings,isDemo}=useGlobalData();
    const [opCampaigns,setOpCampaigns]=useState([]);
    const [opTemplates,setOpTemplates]=useState([]);
    const [opSegments,setOpSegments]=useState([]);
    const emailCampaignsLinked = isDemo ? gdCampaigns : opCampaigns;
    const emailTemplates = isDemo ? gdTemplates : opTemplates;
    const crmSegments = isDemo ? gdSegments : opSegments;
    const [form,setForm]=useState({name:"",template_id:"",segment_id:""});
    const [sending,setSending]=useState(null);
    const [msg,setMsg]=useState("");
    const reloadCampaigns=()=>emailApi.listCampaigns().then(r=>setOpCampaigns(r.campaigns||[])).catch(()=>{});
    useEffect(()=>{ if(isDemo) return;
        reloadCampaigns();
        emailApi.listTemplates().then(r=>setOpTemplates(r.templates||[])).catch(()=>{});
        emailApi.listSegments().then(r=>setOpSegments((r.segments||[]).map(s=>({...s,count:s.member_count??0})))).catch(()=>{});
    },[isDemo]);
    const totalCustomers=isDemo?Object.keys(crmCustomerHistory).length:0;
    const computeTargetSize=(segId)=>{if(!segId)return totalCustomers;const s=crmSegments.find(x=>String(x.id)===String(segId));return s?(s.count||0):totalCustomers;};
    const kpi=useMemo(()=>{
        const total=emailCampaignsLinked.length;const sent=emailCampaignsLinked.filter(c=>c.status==='sent').length;
        const totalSent=emailCampaignsLinked.reduce((s,c)=>s+(c.total_sent||0),0);
        const totalOpened=emailCampaignsLinked.reduce((s,c)=>s+(c.opened||0),0);
        const totalClicked=emailCampaignsLinked.reduce((s,c)=>s+(c.clicked||0),0);
        const avgOpen=totalSent>0?Math.round(totalOpened/totalSent*100):0;
        const avgClick=totalSent>0?Math.round(totalClicked/totalSent*100):0;
        return {total,sent,totalSent,avgOpen,avgClick};
    },[emailCampaignsLinked]);
    const create=async()=>{
        if(!form.name)return;if(detectXSS(form.name)){addAlert({type:'error',msg:'XSS blocked'});return;}
        if(isDemo){
            const nc={id:"ecp_"+Date.now(),name:sanitizeInput(form.name),template_name:emailTemplates.find(x=>String(x.id)===String(form.template_id))?.name||"N/A",
                segment_name:crmSegments.find(x=>String(x.id)===String(form.segment_id))?.name||"All",targetSegmentId:form.segment_id||null,
                targetSegmentName:crmSegments.find(x=>String(x.id)===String(form.segment_id))?.name||"All",
                status:"draft",total_sent:computeTargetSize(form.segment_id),opened:0,clicked:0,failed:0,at:new Date().toISOString()};
            addEmailCampaign(nc);
        } else {
            try{ await emailApi.createCampaign({name:sanitizeInput(form.name),template_id:form.template_id?Number(form.template_id):0,segment_id:form.segment_id?Number(form.segment_id):0}); await reloadCampaigns(); }
            catch(e){ addAlert({type:'error',msg:'캠페인 생성 실패: '+(e?.message||'')}); return; }
        }
        setMsg(t('email.msgCampDone', 'Campaign created!'));setForm({name:"",template_id:"",segment_id:""});setTimeout(()=>setMsg(""),3000);
    };
    const send=async(c)=>{
        if(!confirm(t("email.msgSendConfirm", "Send to all?")))return;
        setSending(c.id);
        if(isDemo){
            setTimeout(()=>{
                setSending(null);
                // 206차: 오픈율/클릭율 결정적화(캠페인 id 해시) — random 제거, 캠페인별 일관값
                const _h=String(c.id||c.name||'').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
                const openRate=18+(_h%22);const clickRate=Math.round(openRate*0.3);
                updateEmailCampaign(c.id,{status:"sent",opened:Math.round(c.total_sent*openRate/100),clicked:Math.round(c.total_sent*clickRate/100),sentAt:new Date().toISOString()});
                addAlert({type:'success',msg:'Campaign "'+c.name+'" sent'});setMsg(t('email.msgSendDone', 'Sent!'));setTimeout(()=>setMsg(""),3000);
            },1800);
            return;
        }
        // 운영: 실 발송(Mailer SMTP). 결과(발송/미설정mock/실패) 표기. 오픈·클릭은 가짜 주입 없이
        //   trackOpen 비콘으로 0부터 누적(정직). SMTP 미설정 시 백엔드가 honest mock_sent 반환.
        try{
            const r=await emailApi.sendCampaign(c.id);
            await reloadCampaigns();
            const parts=[`발송 ${r.sent??0}`]; if(r.mock_sent)parts.push(`미설정 ${r.mock_sent}`); if(r.failed)parts.push(`실패 ${r.failed}`);
            addAlert({type:'success',msg:`"${c.name}" — ${parts.join(', ')} (대상 ${r.total??0})`});
            setMsg(t('email.msgSendDone', 'Sent!'));setTimeout(()=>setMsg(""),3000);
        }catch(e){ addAlert({type:'error',msg:'발송 실패: '+(e?.message||'')}); }
        finally{ setSending(null); }
    };
    const STATUS_MAP={draft:{color:'#6b7280',label:"DRAFT",icon:"📝"},sent:{color:C.green,label:"SENT",icon:"✅"},sending:{color:C.yellow,label:"SENDING",icon:"⏳"},scheduled:{color:C.cyan,label:"SCHEDULED",icon:"🕐"}};
    return (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14 }}>
                <KpiBadge icon="📧" label={t('email.kpiTotal', "Campaigns")} value={kpi.total} color={C.accent}/>
                <KpiBadge icon="✅" label={t('email.kpiSent', "Sent")} value={kpi.sent} color={C.green}/>
                <KpiBadge icon="📤" label={t('email.kpiEmails', "Total Emails")} value={kpi.totalSent.toLocaleString()} color={C.purple}/>
                <KpiBadge icon="👁️" label={t('email.kpiOpen', "Avg Open%")} value={kpi.avgOpen+"%"} color={C.yellow}/>
                <KpiBadge icon="🖱️" label={t('email.kpiClick', "Avg Click%")} value={kpi.avgClick+"%"} color={C.cyan}/>
            </div>
            <Card glow>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:16, display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
                    <span style={{ fontSize:18 }}>🚀</span>{t('email.cNew', "New Campaign")}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                    <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('email.fName', "Campaign Name*")}</div><SecureInput value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} addAlert={addAlert}/></div>
                    <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600, ...INPUT }} >{t('email.fTpl', "Template")}</div><select value={form.template_id} onChange={e=>setForm(f=>({...f,template_id:e.target.value}))}><option value="">{t('email.optSel', "-- Select --")}</option>{emailTemplates.map(tp=><option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></div>
                    <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600, ...INPUT }} >{t('email.fTarget', "Target Segment")}</div><select value={form.segment_id} onChange={e=>setForm(f=>({...f,segment_id:String(e.target.value)}))}><option value="">{t('email.optAll', "All")} ({totalCustomers})</option>{(crmSegments||[]).map(s=><option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}</select></div>
                </div>
                {msg && <div style={{ marginTop:12, fontSize:12, color:C.green, fontWeight:600 }}>✅ {msg}</div>}
                <button onClick={create} disabled={!form.name} style={{ ...BTN, marginTop:16, opacity:!form.name?0.5:1, background:C.accent }}>
                    {t("email.btnCreate", "🚀 Create Campaign")}
                </button>
            </Card>
            <Card style={{ padding:0, overflow:"hidden" }}>
                <div style={{ padding:"16px 22px", fontWeight:800, fontSize:15, borderBottom:'1px solid rgba(0,0,0,0.06)', display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
                    <span style={{ fontSize:16 }}>📊</span>{t('email.cStat', "Campaign Status")} ({emailCampaignsLinked.length})
                </div>
                <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                        <thead><tr style={{ background:'rgba(0,0,0,0.02)' }}>
                            {[t('email.colName', "Name"),t('email.colTpl', "Template"),t('email.colTarget', "Segment"),t('email.colSent', "Sent"),t('email.colOpen', "Open%"),t('email.colClick', "Click%"),t('email.colStatus', "Status"),t('email.colAction', "Action")].map(h=>(
                                <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:'#6b7280', fontWeight:600, fontSize:11, textTransform:"uppercase" }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {emailCampaignsLinked.map((c,i)=>{
                                const openR=c.total_sent>0?Math.round((c.opened||0)/c.total_sent*100):0;
                                const clickR=c.total_sent>0?Math.round((c.clicked||0)/c.total_sent*100):0;
                                const st=STATUS_MAP[c.status]||STATUS_MAP.draft;
                                return (<tr key={c.id} style={{ borderTop:'1px solid rgba(0,0,0,0.04)', background:i%2?'rgba(0,0,0,0.01)':'transparent' }}>
                                    <td style={{ padding:"12px 16px", fontWeight:600, color:'#1f2937' }}>{c.name}</td>
                                    <td style={{ padding:"12px 16px", color:'#6b7280' }}>{c.template_name||"-"}</td>
                                    <td style={{ padding:"12px 16px", color:'#6b7280' }}>{c.targetSegmentName||c.segment_name||"All"}</td>
                                    <td style={{ padding:"12px 16px", color:'#374151' }}>{c.total_sent?.toLocaleString()||0}</td>
                                    <td style={{ padding:"12px 16px", color:openR>20?C.green:openR>10?C.yellow:'#6b7280', fontWeight:700 }} ><span>{openR}%</span></td>
                                    <td style={{ padding:"12px 16px", color:clickR>5?C.green:clickR>2?C.yellow:'#6b7280', fontWeight:700 }} ><span>{clickR}%</span></td>
                                    <td style={{ padding:"3px 10px", fontSize:11, fontWeight:700, color:st.color, display:"inline-flex", alignItems:"center", gap:4, background:st.color+'15', borderRadius:6 }} ><span>{st.icon} {st.label}</span></td>
                                    <td style={{ padding:"8px 14px" }} >{c.status!=="sent" && (<button onClick={()=>send(c)} disabled={sending===c.id} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:sending===c.id?'#94a3b8':C.green, color:"#fff", fontWeight:700, cursor:sending===c.id?"wait":"pointer", fontSize:12 }}>{sending===c.id?"⏳ "+(t('email.btnSending', "Sending...")):"📤 "+(t('email.btnSend', "Send"))}</button>)}</td>
                                </tr>);
                            })}
                            {emailCampaignsLinked.length===0 && (<tr><td colSpan={8} style={{ padding:"48px 24px", textAlign:"center", color:'#6b7280', fontSize:13, marginBottom:8 }} ><div>📭</div><div>{t('email.emptyCamp', "No campaigns yet.")}</div></td></tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

/* Analytics Tab */
function AnalyticsTab() {
    const {t}=useI18n();
    // 191차 2단계: 운영=백엔드 캠페인 집계, 데모=GlobalData.
    const {emailCampaignsLinked:gdCampaigns,isDemo}=useGlobalData();
    const [opCampaigns,setOpCampaigns]=useState([]);
    const emailCampaignsLinked = isDemo ? gdCampaigns : opCampaigns;
    useEffect(()=>{ if(isDemo) return; emailApi.listCampaigns().then(r=>setOpCampaigns(r.campaigns||[])).catch(()=>{}); },[isDemo]);
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
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                <KpiBadge icon="📤" label={t('email.anTotalSent', "Total Sent")} value={analytics.totalSent.toLocaleString()} color={C.accent}/>
                <KpiBadge icon="👁️" label={t('email.anOpenRate', "Open Rate")} value={overallOpen+"%"} color={C.green} sub={analytics.totalOpened.toLocaleString()+" opened"}/>
                <KpiBadge icon="🖱️" label={t('email.anClickRate', "Click Rate")} value={overallClick+"%"} color={C.yellow} sub={analytics.totalClicked.toLocaleString()+" clicks"}/>
                <KpiBadge icon="📦" label={t('email.anDelivery', "Delivery Rate")} value={deliveryRate+"%"} color={C.cyan} sub={analytics.totalFailed+" failed"}/>
            </div>
            <Card glow>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:18, display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
                    <span style={{ fontSize:16 }}>📊</span>{t('email.anSegPerf', "Performance by Segment")}
                </div>
                {Object.keys(analytics.bySegment).length===0?(
                    <div style={{ textAlign:"center", padding:32, color:'#6b7280', fontSize:28, marginBottom:8 }} ><div>📉</div>{t('email.anNoData', "No sent campaigns to analyze yet.")}</div>
                ):(
                    <div style={{ display:"grid", gap:10 }}>
                        {Object.entries(analytics.bySegment).map(([seg,data])=>{
                            const openP=data.sent>0?(data.opened/data.sent*100).toFixed(1):0;
                            const clickP=data.sent>0?(data.clicked/data.sent*100).toFixed(1):0;
                            return (
                                <div key={seg} style={{ display:"grid", gridTemplateColumns:"200px repeat(4,1fr)", gap:16, padding:"14px 18px", borderRadius:12, background:'rgba(0,0,0,0.02)', border:'1px solid rgba(0,0,0,0.06)', alignItems:"center" }}>
                                    <div style={{ fontWeight:700, fontSize:13, color:'#1f2937' }}>{seg}</div>
                                    <div style={{ textAlign:"center", fontSize:11, color:'#374151', fontWeight:700 }} ><div>{t('email.anCamps', "Campaigns")}</div><div>{data.campaigns}</div></div>
                                    <div style={{ textAlign:"center", fontSize:11, color:'#374151', fontWeight:700 }} ><div>{t('email.colSent', "Sent")}</div><div>{data.sent.toLocaleString()}</div></div>
                                    <div style={{ textAlign:"center", fontSize:11, color:Number(openP)>20?C.green:C.yellow, fontWeight:700 }} ><div>{t('email.colOpen', "Open%")}</div><div>{openP}%</div></div>
                                    <div style={{ textAlign:"center", fontSize:11, color:Number(clickP)>5?C.green:'#6b7280', fontWeight:700 }} ><div>{t('email.colClick', "Click%")}</div><div>{clickP}%</div></div>
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
        return (<div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', fontSize:11, marginBottom:14 }}>
            <span>⚠️</span><span style={{ color:'#eab308', fontWeight:600 }}>{t('email.noChannels', 'No email channels connected.')}</span>
            <button onClick={()=>navigate('/integration-hub')} style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:6, border:'none', background:'#4f8ef7', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>{t('email.goHub', 'Go to Integration Hub')}</button>
        </div>);
    }
    return (<div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', padding:'6px 10px', borderRadius:10, background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', fontSize:10, marginBottom:14 }}>
        <span style={{ fontWeight:700, color:C.accent, fontSize:11 }}>🔗 {t('email.connectedChannels', 'Connected')}:</span>
        {emailCh.map(ch=>(<span key={ch.key||ch.platform} style={{ background:C.accent+'15', color:C.accent, border:'1px solid '+C.accent+'25', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700 }}>{ch.platform||ch.key}</span>))}
    </div>);
}

/* Security Lock Modal */
function SecurityLockModal({t,onDismiss}) {
    return (<div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'#1a0a0a', border:'1px solid rgba(239,68,68,0.5)', borderRadius:20, padding:32, maxWidth:380, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🛡️</div>
            <div style={{ fontWeight:900, fontSize:18, color:'#ef4444', marginBottom:8 }}>{t('email.secLockTitle', 'Security Alert')}</div>
            <div style={{ fontSize:13, color:'#9ca3af', lineHeight:1.7, marginBottom:20 }}>{t('email.secLockDesc', 'Abnormal access detected.')}</div>
            <button onClick={onDismiss} style={{ padding:'9px 24px', borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>{t('email.dismiss', 'Confirm')}</button>
        </div>
    </div>);
}

/* Guide Tab - 15 Steps */
function GuideTab() {
    // 184차 #5: enterprise 패턴 렌더러(CRM/OmniChannel/PriceOpt/Kakao 정본 동일, NS=email).
    const {t}=useI18n();
    const g = (k) => { const v = t('email.' + k, ''); return (v && !String(v).includes('email.')) ? v : ''; };
    const COLORS = ['#4f8ef7','#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48'];
    const ICONS = ['🔑','🪪','📝','✨','🎨','🎯','🛡️','🚀','🧪','⚙️','📈','🔐'];
    const steps = [];
    for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[(i - 1) % ICONS.length], color: COLORS[(i - 1) % COLORS.length], n: i }); }
    const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
    const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
    const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
    const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
    const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#eef2ff,#e0f2fe)", borderRadius: 16, border: "1px solid #c7d2fe", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('email.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('email.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
                </div>}
            </div>
            {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
            {steps.length > 0 && <div style={card}>
                {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {steps.map((s) => (
                        <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>}
            {tips.length > 0 && (
                <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
                    <div style={secTitle}>💡 {t('email.guideTipsTitle')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "start", fontSize: 12.5, color: "#374151", lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>
                                <span style={{ color: "#22c55e", fontWeight: 900, WebkitTextFillColor: '#22c55e' }}>✓</span><span>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {faqs.length > 0 && (
                <div style={card}>
                    <div style={secTitle}>❓ {t('email.guideFaqTitle')}</div>
                    <div style={{ display: "grid", gap: 12 }}>
                        {faqs.map((f, i) => (
                            <div key={i} style={{ borderBottom: i < faqs.length - 1 ? "1px solid #f1f5f9" : "none", paddingBottom: 10 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", marginBottom: 4, WebkitTextFillColor: '#1e293b' }}>Q. {f.q}</div>
                                <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.7, WebkitTextFillColor: '#475569' }}>{f.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={secTitle}>🔒 {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
            {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🛠️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
            {g('guideReadyTitle') ? <div style={{ background: "linear-gradient(135deg,#eef2ff,#e0f2fe)", borderRadius: 16, border: "1px solid #c7d2fe", padding: "24px", textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: "#1e293b", marginBottom: 8, WebkitTextFillColor: '#1e293b' }}>🎉 {g('guideReadyTitle')}</div>
                <div style={{ fontSize: 12.5, color: "#1e293b", lineHeight: 1.8, fontWeight: 500, whiteSpace: 'pre-line', maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyDesc')}</div>
            </div> : null}
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
    useEffect(()=>{try{bcRef.current=new BroadcastChannel(tChannelName('geniego_email'));bcRef.current.onmessage=()=>{};}catch{}return()=>{try{bcRef.current?.close();}catch{}};},[]);
    const broadcastRefresh=useCallback(()=>{try{bcRef.current?.postMessage({type:'EMAIL_REFRESH',ts:Date.now()});}catch{}if(typeof broadcastUpdate==='function')broadcastUpdate('email',{refreshed:Date.now()});},[broadcastUpdate]);
    const {user:_eu,isAdmin:_eIsAdmin}=useAuth(); // [현 차수] 구독플랜별 탭 노출
    const _ePlan=(_eu&&(_eu.plans||_eu.plan))||'free';
    const _eTabVisible=(id)=>(_IS_DEMO_EM||_eIsAdmin)?true:tabAllowedByPlan(_ePlan,'email',id);
    const [tab,setTab]=useState("campaigns");
    // [238차] 온보딩 가이드 큐가 '템플릿 작성' 단계를 가리키면 템플릿 탭으로 자동 전환(마커 노출).
    useEffect(() => {
        const apply = (cta) => { if (cta === "email-template") setTab("templates"); };
        try { apply(sessionStorage.getItem("genie_onboard_cta")); } catch (e) {}
        const h = (e) => apply(e && e.detail && e.detail.cta);
        window.addEventListener("genie-onboard-cta", h);
        return () => window.removeEventListener("genie-onboard-cta", h);
    }, []);
    const TABS=[
        {id:"campaigns",label:t('email.tabCamp', "Campaigns"),icon:"🚀"},
        {id:"templates",label:t('email.tabTpl', "Templates"),icon:"📝"},
        {id:"analytics",label:t('email.tabAnalytics', "Analytics"),icon:"📊"},
        {id:"creative",label:t('email.tabCreative', "Creative"),icon:"🎨"},
        {id:"settings",label:t('email.tabSettings', "Settings"),icon:"⚙️"},
        {id:"guide",label:t('email.tabGuide', "Guide"),icon:"📖"},
    ];
    const emailChecks = useMemo(() => {
        const cnt = async (ep, keys) => { try { const r = await _gjaEmail(ep); for (const k of keys) { if (Array.isArray(r?.[k])) return r[k].length > 0; } return Array.isArray(r) ? r.length > 0 : false; } catch { return false; } };
        return [
            null,                                                                   // 0 로그인
            null,                                                                   // 1 발신자 인증(자동)
            null,                                                                   // 2 수신자 리스트(자동)
            async () => cnt('/api/email/templates', ['templates', 'items', 'rows']), // 3 ★템플릿 1개 이상 작성 필수
            null,                                                                   // 4 발송·A/B(자동)
            null,                                                                   // 5 성과 분석(자동)
        ];
    }, []);
    return (
        <div style={{ padding:24, minHeight:"100%", color:'#1e293b' }}>
            {secLocked && <SecurityLockModal t={t} onDismiss={()=>setSecLocked(false)}/>}
            <AIRecommendBanner context="email"/>
            <EmailChannelBadge t={t}/>
            <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(79,142,247,0.04)', border:'1px solid rgba(79,142,247,0.12)', fontSize:10, color:'#4f8ef7', fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }}/>
                {t('email.liveSyncStatus', 'Real-time cross-tab sync active')}
            </div>
            <div style={{ borderRadius:16, background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', padding:"13px 24px", marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        <div style={{ fontSize:24, fontWeight:900, letterSpacing:-0.5, color:'#1f2937' }}>{t('email.title', "📧 Email Marketing")}</div>
                        <div style={{ fontSize:13, color:'#4b5563', marginTop:5 }}>{t('email.subTitle', "Create powerful email campaigns with real-time sync")}</div>
                    </div>
                    <button onClick={broadcastRefresh} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', background:'rgba(255,255,255,0.9)', color:'#374151', fontWeight:700, fontSize:11, cursor:'pointer' }}>🔄 {t('email.syncNow', 'Sync Now')}</button>
                </div>
            </div>
            <div className="page-subtabs" style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                {TABS.filter(Tb=>_eTabVisible(Tb.id)).map(Tb=>(
                    <button key={Tb.id} onClick={()=>setTab(Tb.id)} style={{ padding:"10px 20px", borderRadius:12, border:"none", cursor:"pointer", background:tab===Tb.id?C.accent:'rgba(255,255,255,0.9)', color:tab===Tb.id?"#fff":"#374151", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:6, boxShadow:tab===Tb.id?'0 4px 16px '+C.accent+'33':'0 1px 3px rgba(0,0,0,0.06)' }}><span>{Tb.icon}</span> {Tb.label}</button>
                ))}
            </div>
            {tab==="campaigns" && <CampaignsTab/>}
            {tab==="templates" && <TemplatesTab/>}
            {tab==="analytics" && <AnalyticsTab/>}
            {tab==="creative" && <CreativeStudioTab sourcePage="email-marketing"/>}
            {tab==="settings" && <SettingsTab/>}
            {tab==="guide" && (
                <>
                    <div style={{ background:"var(--card-bg,#fff)", border:"1px solid var(--border,#e2e8f0)", borderRadius:16, padding:"20px 22px", marginBottom:16 }}>
                        <GuideWizard guideKey="email" checks={emailChecks} />
                    </div>
                    <GuideTab/>
                </>
            )}
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
    );
}

export default function EmailMarketing() {
    return (<PlanGate feature="email_marketing"><EmailMarketingContent/></PlanGate>);
}
