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
import { getJsonAuth as _gjaEmail, postJsonAuth as _pjaEmail } from '../services/apiClient.js';
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { emailApi } from "../services/emailApi.js"; // 191차 2단계: 운영 백엔드 실배선(/email/*, /crm/segments)
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import { useI18n } from '../i18n';
import { useSecurityGuard, sanitizeInput, detectXSS } from "../security/SecurityGuard.js";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import CreativeStudioTab from "./CreativeStudioTab.jsx";
import { useNavigate } from "react-router-dom";
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';

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
                <div style={{ fontWeight:800, marginBottom:18, fontSize:14, display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
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

/* [283차 P0] 캠페인 토픽(콘텐츠 카테고리) — 백엔드 PreferenceCenter::TOPICS 가 SSOT(promo/newsletter/product/event).
 *   수신자가 공개 선호센터에서 특정 주제를 끄면 그 주제의 캠페인은 발송되지 않는다(CRM::isMarketingSendAllowed 토픽 게이트).
 *   'transactional'(주문·배송·결제 등 거래성)은 억제 대상이 아니라 목록에 없다 = 항상 발송. */
const CAMPAIGN_TOPICS = [
    { id:'promo',      icon:'🏷️', ko:'프로모션·할인' },
    { id:'newsletter', icon:'📰', ko:'뉴스레터·소식' },
    { id:'product',    icon:'✨', ko:'신상품·업데이트' },
    { id:'event',      icon:'🎪', ko:'이벤트·웨비나' },
];

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
    // [283차 P0/P1] topic(콘텐츠 카테고리 — 선호센터 토픽 옵트아웃 강제) · sto_opt_in(개인별 예측 발송시각).
    const [form,setForm]=useState({name:"",template_id:"",segment_id:"",subject_b:"",ab_test:false,topic:"",sto_opt_in:false});
    const [sending,setSending]=useState(null);
    const [msg,setMsg]=useState("");
    const [abModal,setAbModal]=useState(null); // [현 차수] A/B 결과 모달 대상 캠페인
    const [deliv,setDeliv]=useState(null); // [R-P2-4] 딜리버러빌리티 건강도(운영 전용)
    const [warmup,setWarmup]=useState(null); // [현 차수 초고도화 ②-3] 발신 워밍업 램프(opt-in)
    const reloadCampaigns=()=>emailApi.listCampaigns().then(r=>setOpCampaigns(r.campaigns||[])).catch(()=>{});
    useEffect(()=>{ if(isDemo) return;
        reloadCampaigns();
        emailApi.listTemplates().then(r=>setOpTemplates(r.templates||[])).catch(()=>{});
        emailApi.listSegments().then(r=>setOpSegments((r.segments||[]).map(s=>({...s,count:s.member_count??0})))).catch(()=>{});
        _gjaEmail('/api/email/deliverability?window=90').then(d=>{ if(d&&d.ok) setDeliv(d); }).catch(()=>{});
        _gjaEmail('/api/email/warmup').then(w=>{ if(w&&w.ok) setWarmup(w); }).catch(()=>{});
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
        // [현 차수] A/B: subject_b 입력이 있으면 자동 활성. (백엔드 동일 규칙 — subject_b!=='' → ab_test=1)
        const subjectB=sanitizeInput(form.subject_b||"").trim();
        const abOn=(form.ab_test || subjectB!=="")?1:0;
        if(subjectB && detectXSS(form.subject_b)){addAlert({type:'error',msg:'XSS blocked'});return;}
        if(isDemo){
            const nc={id:"ecp_"+Date.now(),name:sanitizeInput(form.name),template_name:emailTemplates.find(x=>String(x.id)===String(form.template_id))?.name||"N/A",
                segment_name:crmSegments.find(x=>String(x.id)===String(form.segment_id))?.name||"All",targetSegmentId:form.segment_id||null,
                targetSegmentName:crmSegments.find(x=>String(x.id)===String(form.segment_id))?.name||"All",
                subject_b:subjectB||null,ab_test:abOn,ab_winner:null,
                status:"draft",total_sent:computeTargetSize(form.segment_id),opened:0,clicked:0,failed:0,at:new Date().toISOString()};
            addEmailCampaign(nc);
        } else {
            // [283차 P0/P1] topic(토픽 옵트아웃 강제) · sto_opt_in(개인 최적시각 발송) 동봉.
            try{ await emailApi.createCampaign({name:sanitizeInput(form.name),template_id:form.template_id?Number(form.template_id):0,segment_id:form.segment_id?Number(form.segment_id):0,subject_b:subjectB,ab_test:abOn,topic:form.topic||"",sto_opt_in:form.sto_opt_in?1:0}); await reloadCampaigns(); }
            catch(e){ addAlert({type:'error',msg:'캠페인 생성 실패: '+(e?.message||'')}); return; }
        }
        setMsg(t('email.msgCampDone', 'Campaign created!'));setForm({name:"",template_id:"",segment_id:"",subject_b:"",ab_test:false});setTimeout(()=>setMsg(""),3000);
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

            {/* [R-P2-4] 딜리버러빌리티 건강도 — 발신자 평판등급·바운스/컴플레인율·도메인 인증(운영 전용) */}
            {!isDemo && deliv && deliv.reputation && (deliv.volume?.accepted>0 || deliv.volume?.bounced>0) && (()=>{
                const rep=deliv.reputation, r=deliv.rates, da=deliv.domain_auth||{};
                const gc={'good':C.green,'warning':C.yellow,'at-risk':'#dc2626'}[rep.grade]||C.green;
                const gl={'good':t('email.delivGood','양호'),'warning':t('email.delivWarn','주의'),'at-risk':t('email.delivRisk','위험')}[rep.grade]||rep.grade;
                const Cell=({label,val,warn})=>(<div style={{textAlign:'center',minWidth:84}}><div style={{fontSize:18,fontWeight:900,color:warn?'#dc2626':'#1f2937'}}>{val}</div><div style={{fontSize:10.5,color:'#6b7280',marginTop:2}}>{label}</div></div>);
                return (
                  <Card glow>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
                      <div style={{fontWeight:800,fontSize:14,display:'flex',alignItems:'center',gap:8,color:'#1f2937'}}>
                        <span style={{fontSize:18}}>📬</span>{t('email.delivTitle','딜리버러빌리티 건강도')}
                        <span style={{fontSize:10,color:'#9ca3af',fontWeight:600}}>· {deliv.window_days}{t('email.delivDays','일')}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:11,color:'#6b7280'}}>{t('email.delivRep','발신자 평판')}</span>
                        <span style={{fontSize:12,fontWeight:700,color:gc,background:gc+'1a',padding:'4px 12px',borderRadius:8}}>{gl} · {rep.score}/100</span>
                      </div>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:18,alignItems:'center'}}>
                      <Cell label={t('email.delivDelivery','도달률')} val={r.delivery_rate+'%'}/>
                      <Cell label={t('email.delivBounce','바운스율')} val={r.bounce_rate+'%'} warn={rep.bounce_grade==='at-risk'}/>
                      <Cell label={t('email.delivComplaint','스팸신고율')} val={r.complaint_rate+'%'} warn={rep.complaint_grade==='at-risk'}/>
                      <Cell label={t('email.delivUnsub','수신거부율')} val={r.unsubscribe_rate+'%'}/>
                      <Cell label={t('email.delivOpen','오픈율')} val={r.open_rate+'%'}/>
                      <Cell label={t('email.delivClick','클릭율')} val={r.click_rate+'%'}/>
                      {da.domain && (
                        <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:'auto'}}>
                          <span style={{fontSize:10.5,color:'#6b7280'}}>{da.domain}</span>
                          <span style={{fontSize:10,fontWeight:700,color:da.spf?C.green:'#dc2626'}}>SPF {da.spf?'✓':'✗'}</span>
                          <span style={{fontSize:10,fontWeight:700,color:da.dmarc?C.green:'#dc2626'}}>DMARC {da.dmarc?'✓':'✗'}</span>
                        </div>
                      )}
                    </div>
                    {deliv.advice && <div style={{marginTop:10,fontSize:11.5,color:'#6b7280',lineHeight:1.5,background:'rgba(0,0,0,0.02)',padding:'8px 12px',borderRadius:8}}>💡 {deliv.advice}</div>}
                  </Card>
                );
            })()}
            {/* [현 차수 초고도화 ②-3] 발신 워밍업 램프 토글(opt-in·운영 전용) */}
            {!isDemo && (
              <Card>
                <div style={{ fontWeight:800, fontSize:14, marginBottom:10, display:'flex', alignItems:'center', gap:8, color:'#1f2937', flexWrap:'wrap' }}>
                    <span style={{ fontSize:16 }}>🌡️</span>{t('email.warmupTitle','발신 워밍업 램프')}
                    <span style={{ fontSize:10.5, color:'#9ca3af', fontWeight:600 }}>· {t('email.warmupSub','신규 발신 도메인 평판 보호(일일 한도 점진 증대)')}</span>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:12.5 }}>
                    <input type="checkbox" checked={!!warmup?.enabled} onChange={async e=>{
                        const enabled=e.target.checked;
                        const start=warmup?.start_date || new Date().toISOString().slice(0,10);
                        setWarmup(w=>({...(w||{}),enabled,start_date:start}));
                        try{ const r=await _pjaEmail('/api/email/warmup',{enabled,start_date:start}); if(r?.ok) setWarmup(r); }catch(_){}
                    }} />
                    <span>{t('email.warmupEnable','워밍업 활성화')} {warmup?.enabled && warmup?.start_date && <span style={{ color:'#6b7280', fontSize:11 }}>({t('email.warmupStart','시작')} {warmup.start_date})</span>}</span>
                </label>
                <div style={{ marginTop:8, fontSize:10.5, color:'#9ca3af', lineHeight:1.6 }}>
                    {t('email.warmupNote','활성화 시 시작일 기준 14일간 일일 발송량을 단계적으로 늘려 스팸 차단·평판 하락을 방지합니다. 기존 대량 발신자는 비활성(기본) 유지 권장.')}
                </div>
              </Card>
            )}
            <Card glow>
                <div style={{ fontWeight:800, fontSize:14, marginBottom:16, display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
                    <span style={{ fontSize:18 }}>🚀</span>{t('email.cNew', "New Campaign")}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                    <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('email.fName', "Campaign Name*")}</div><SecureInput value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} addAlert={addAlert}/></div>
                    <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600, ...INPUT }} >{t('email.fTpl', "Template")}</div><select value={form.template_id} onChange={e=>setForm(f=>({...f,template_id:e.target.value}))}><option value="">{t('email.optSel', "-- Select --")}</option>{emailTemplates.map(tp=><option key={tp.id} value={tp.id}>{tp.name}</option>)}</select></div>
                    <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600, ...INPUT }} >{t('email.fTarget', "Target Segment")}</div><select value={form.segment_id} onChange={e=>setForm(f=>({...f,segment_id:String(e.target.value)}))}><option value="">{t('email.optAll', "All")} ({totalCustomers})</option>{(crmSegments||[]).map(s=><option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}</select></div>
                </div>
                {/* [현 차수] A/B 테스트(제목 variant B) — 토글 ON 시 subject_b 입력 노출. 발송 시 수신자 50/50 분배 후 베이지안 승자판정. */}
                <div style={{ marginTop:14, padding:"14px 16px", borderRadius:12, background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.18)' }}>
                    <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none" }}>
                        <input type="checkbox" checked={!!form.ab_test} onChange={e=>setForm(f=>({...f,ab_test:e.target.checked}))} style={{ width:16, height:16, accentColor:C.purple, cursor:"pointer" }}/>
                        <span style={{ fontWeight:700, fontSize:13, color:'#6d28d9' }}>🧪 {t('email.abEnable', "A/B Test (Subject Line)")}</span>
                        <span style={{ fontSize:11, color:'#6b7280' }}>{t('email.abHint', "Split recipients 50/50, pick winner by Bayesian open-rate")}</span>
                    </label>
                    {(!!form.ab_test || (form.subject_b||"")!=="") && (
                        <div style={{ marginTop:12 }}>
                            <div style={{ fontSize:11, color:'#6b7280', marginBottom:6, fontWeight:600 }}>{t('email.abSubjectB', "Subject B (variant)")}</div>
                            <SecureInput value={form.subject_b} onChange={e=>setForm(f=>({...f,subject_b:e.target.value}))} placeholder={t("email.abSubjectBPh", "Alternate subject line for variant B...")} addAlert={addAlert}/>
                            <div style={{ fontSize:10.5, color:'#9ca3af', marginTop:6 }}>{t('email.abSubjectBNote', "Variant A uses the template's subject. Leave empty to disable A/B.")}</div>
                        </div>
                    )}
                </div>
                {/* [283차 P0] 콘텐츠 주제(토픽) — 선택 시 수신자의 선호센터 주제별 수신거부가 발송 직전 강제된다.
                    미선택(주제 없음)은 기존과 동일하게 토픽 게이트 미적용. 거래성 알림은 애초에 이 캠페인 경로가 아니다. */}
                <div style={{ marginTop:14, padding:"14px 16px", borderRadius:12, background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.16)' }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#1d4ed8', marginBottom:4 }}>🗂️ {t('email.topicTitle', '콘텐츠 주제(수신거부 강제)')}</div>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:10 }}>{t('email.topicHint', '주제를 지정하면 해당 주제를 수신거부한 고객에게는 발송되지 않습니다(선호센터 연동).')}</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <button type="button" onClick={()=>setForm(f=>({...f,topic:""}))}
                            style={{ padding:"7px 13px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:700,
                                border: form.topic===""?'2px solid #64748b':'1px solid #e2e8f0',
                                background: form.topic===""?'rgba(100,116,139,0.10)':'#f8fafc', color: form.topic===""?'#475569':'#94a3b8' }}>
                            {t('email.topicNone', '주제 없음')}
                        </button>
                        {CAMPAIGN_TOPICS.map(tp=>{ const sel=form.topic===tp.id; return (
                            <button key={tp.id} type="button" onClick={()=>setForm(f=>({...f,topic:sel?"":tp.id}))}
                                style={{ padding:"7px 13px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:700,
                                    border: sel?'2px solid #2563eb':'1px solid #e2e8f0',
                                    background: sel?'rgba(37,99,235,0.10)':'#f8fafc', color: sel?'#1d4ed8':'#64748b' }}>
                                {tp.icon} {t('email.topic_'+tp.id, tp.ko)}
                            </button>
                        );})}
                    </div>
                    {/* [283차 P0] 안전 기본값 '제안'(강제 아님) — 미지정 캠페인은 기존처럼 토픽 게이트 없이 발송되므로,
                        프로모션성 캠페인에는 promo 지정을 권고한다(수신거부 미준수 = 법적 리스크). */}
                    {form.topic==="" && (
                        <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", fontSize:11, color:'#b45309' }}>
                            <span>⚠️ {t('email.topicSuggest', '주제 미지정 캠페인은 주제별 수신거부가 적용되지 않습니다. 할인·프로모션 발송이라면 「프로모션·할인」을 지정하세요.')}</span>
                            <button type="button" onClick={()=>setForm(f=>({...f,topic:'promo'}))}
                                style={{ padding:"4px 10px", borderRadius:7, border:'1px solid rgba(180,83,9,0.35)', background:'rgba(251,191,36,0.12)', color:'#b45309', fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                {t('email.topicSuggestApply', '프로모션으로 지정')}
                            </button>
                        </div>
                    )}
                </div>
                {/* [283차 P1] STO(개인별 예측 발송시각) — ON 시 수신자별 과거 참여 최빈시각에 큐잉 발송(cron 드레인). 기본 OFF=즉시발송. */}
                <div style={{ marginTop:12, padding:"14px 16px", borderRadius:12, background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.16)' }}>
                    <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none" }}>
                        <input type="checkbox" checked={!!form.sto_opt_in} onChange={e=>setForm(f=>({...f,sto_opt_in:e.target.checked}))} style={{ width:16, height:16, accentColor:C.green, cursor:"pointer" }}/>
                        <span style={{ fontWeight:700, fontSize:13, color:'#15803d' }}>⏰ {t('email.stoEnable', '개인별 최적 발송시간(STO)')}</span>
                        <span style={{ fontSize:11, color:'#6b7280' }}>{t('email.stoHint', '수신자별 과거 오픈·클릭 최빈 시각에 맞춰 자동 예약 발송(즉시발송 대신 큐 적재)')}</span>
                    </label>
                </div>
                {msg && <div style={{ marginTop:12, fontSize:12, color:C.green, fontWeight:600 }}>✅ {msg}</div>}
                <button onClick={create} disabled={!form.name} style={{ ...BTN, marginTop:16, opacity:!form.name?0.5:1, background:C.accent }}>
                    {t("email.btnCreate", "🚀 Create Campaign")}
                </button>
            </Card>
            <Card style={{ padding:0, overflow:"hidden" }}>
                <div style={{ padding:"16px 22px", fontWeight:800, fontSize:14, borderBottom:'1px solid rgba(0,0,0,0.06)', display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
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
                                    <td style={{ padding:"12px 16px", fontWeight:600, color:'#1f2937' }}>{c.name}{(c.ab_test==1||c.ab_test===true) && <span title={t('email.abBadgeTip','A/B test active')} style={{ marginLeft:8, fontSize:10.5, fontWeight:700, color:'#6d28d9', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:6, padding:'1px 6px', verticalAlign:'middle' }}>🧪 A/B{c.ab_winner?` · ${c.ab_winner}✓`:''}</span>}</td>
                                    <td style={{ padding:"12px 16px", color:'#6b7280' }}>{c.template_name||"-"}</td>
                                    <td style={{ padding:"12px 16px", color:'#6b7280' }}>{c.targetSegmentName||c.segment_name||"All"}</td>
                                    <td style={{ padding:"12px 16px", color:'#374151' }}>{c.total_sent?.toLocaleString()||0}</td>
                                    <td style={{ padding:"12px 16px", color:openR>20?C.green:openR>10?C.yellow:'#6b7280', fontWeight:700 }} ><span>{openR}%</span></td>
                                    <td style={{ padding:"12px 16px", color:clickR>5?C.green:clickR>2?C.yellow:'#6b7280', fontWeight:700 }} ><span>{clickR}%</span></td>
                                    <td style={{ padding:"3px 10px", fontSize:11, fontWeight:700, color:st.color, display:"inline-flex", alignItems:"center", gap:4, background:st.color+'15', borderRadius:6 }} ><span>{st.icon} {st.label}</span></td>
                                    <td style={{ padding:"8px 14px" }} ><div style={{ display:"flex", gap:6, alignItems:"center" }}>{c.status!=="sent" && (<button onClick={()=>send(c)} disabled={sending===c.id} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:sending===c.id?'#94a3b8':C.green, color:"#fff", fontWeight:700, cursor:sending===c.id?"wait":"pointer", fontSize:12 }}>{sending===c.id?"⏳ "+(t('email.btnSending', "Sending...")):"📤 "+(t('email.btnSend', "Send"))}</button>)}{(c.ab_test==1||c.ab_test===true) && (<button onClick={()=>setAbModal(c)} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid rgba(167,139,250,0.4)", background:'rgba(167,139,250,0.12)', color:'#6d28d9', fontWeight:700, cursor:"pointer", fontSize:12 }}>🧪 {t('email.abResultBtn', "A/B Result")}</button>)}</div></td>
                                </tr>);
                            })}
                            {emailCampaignsLinked.length===0 && (<tr><td colSpan={8} style={{ padding:"48px 24px", textAlign:"center", color:'#6b7280', fontSize:13, marginBottom:8 }} ><div>📭</div><div>{t('email.emptyCamp', "No campaigns yet.")}</div></td></tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
            {abModal && <AbResultModal t={t} campaign={abModal} isDemo={isDemo} onClose={()=>setAbModal(null)}/>}
        </div>
    );
}

/* [현 차수] A/B 결과 모달 — 운영: 백엔드 ab-result(베이지안). 데모: 결정적 시뮬레이션(동일 베이지안 식). */
function AbResultModal({ t, campaign, isDemo, onClose }) {
    const [data,setData]=useState(null);
    const [loading,setLoading]=useState(true);
    const [err,setErr]=useState("");
    useEffect(()=>{ let on=true;
        const run=async()=>{
            if(isDemo){ if(on){ setData(simulateAbResult(campaign)); setLoading(false); } return; }
            try{ const r=await emailApi.abResult(campaign.id); if(on){ setData(r); setLoading(false); } }
            catch(e){ if(on){ setErr(e?.message||'load failed'); setLoading(false); } }
        };
        run();
        return ()=>{on=false;};
    },[campaign,isDemo]);
    const V=data?.variants||{A:{sent:0,opened:0,clicked:0,open_rate:0},B:{sent:0,opened:0,clicked:0,open_rate:0}};
    const winner=data?.winner;
    const probB=data?.prob_b_best??50;
    const maxOpen=Math.max(V.A.open_rate||0,V.B.open_rate||0,1);
    const bar=(label,v,isWin)=>{
        const cr=v.sent>0?Math.round((v.clicked||0)/v.sent*100*10)/10:0;
        return (<div style={{ flex:1, padding:"16px 18px", borderRadius:14, background:isWin?'rgba(34,197,94,0.07)':'rgba(0,0,0,0.02)', border:'1px solid '+(isWin?'rgba(34,197,94,0.35)':'rgba(0,0,0,0.08)') }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontWeight:900, fontSize:16, color:isWin?'#16a34a':'#374151' }}>Variant {label}</span>
                {isWin && <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:'#22c55e', borderRadius:6, padding:'2px 8px' }}>👑 {t('email.abWinner','WINNER')}</span>}
            </div>
            <div style={{ fontSize:30, fontWeight:900, color:isWin?'#16a34a':'#1f2937', lineHeight:1 }}>{(v.open_rate||0).toFixed(1)}<span style={{ fontSize:14 }}>%</span></div>
            <div style={{ fontSize:11, color:'#6b7280', marginTop:3, marginBottom:10 }}>{t('email.abOpenRate','Open rate')}</div>
            <div style={{ height:8, borderRadius:99, background:'rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:12 }}>
                <div style={{ width:`${Math.round((v.open_rate||0)/maxOpen*100)}%`, height:'100%', background:isWin?'#22c55e':'#a78bfa', borderRadius:99 }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:'#475569' }}>
                <span>{t('email.abSent','Sent')}: <b>{(v.sent||0).toLocaleString()}</b></span>
                <span>{t('email.abOpened','Opened')}: <b>{(v.opened||0).toLocaleString()}</b></span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:'#475569', marginTop:4 }}>
                <span>{t('email.colClick','Click%')}: <b>{cr}%</b></span>
                <span>{t('email.abClicked','Clicked')}: <b>{(v.clicked||0).toLocaleString()}</b></span>
            </div>
        </div>);
    };
    return (<div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:9998, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:560, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:6 }}>
                <div>
                    <div style={{ fontWeight:900, fontSize:18, color:'#1e293b' }}>🧪 {t('email.abModalTitle','A/B Test Result')}</div>
                    <div style={{ fontSize:12.5, color:'#6b7280', marginTop:3 }}>{campaign.name}</div>
                </div>
                <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#9ca3af', cursor:'pointer', lineHeight:1 }}>×</button>
            </div>
            {loading && <div style={{ padding:'40px 0', textAlign:'center', color:'#6b7280', fontSize:13 }}>⏳ {t('email.abLoading','Computing Bayesian result...')}</div>}
            {err && <div style={{ padding:'24px 0', textAlign:'center', color:'#ef4444', fontSize:13 }}>⚠️ {err}</div>}
            {!loading && !err && data && (<>
                <div style={{ display:"flex", gap:14, marginTop:16, marginBottom:18 }}>
                    {bar('A',V.A,winner==='A')}
                    {bar('B',V.B,winner==='B')}
                </div>
                {/* P(B>A) 게이지 */}
                <div style={{ padding:"14px 16px", borderRadius:12, background:'rgba(79,142,247,0.05)', border:'1px solid rgba(79,142,247,0.15)', marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:'#475569', marginBottom:6, fontWeight:600 }}>
                        <span>A {t('email.abBetter','better')}</span>
                        <span style={{ color:'#4f8ef7', fontWeight:800 }}>{t('email.abProbBBest','P(B is best)')}: {probB}%</span>
                        <span>B {t('email.abBetter','better')}</span>
                    </div>
                    <div style={{ position:'relative', height:10, borderRadius:99, background:'linear-gradient(90deg,#fbbf24,#e5e7eb,#22c55e)' }}>
                        <div style={{ position:'absolute', top:-3, left:`calc(${Math.max(0,Math.min(100,probB))}% - 8px)`, width:16, height:16, borderRadius:99, background:'#fff', border:'3px solid #4f8ef7', boxShadow:'0 1px 4px rgba(0,0,0,0.25)' }}/>
                    </div>
                </div>
                <div style={{ padding:"12px 16px", borderRadius:12, textAlign:'center', fontWeight:800, fontSize:13.5,
                    background:winner?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)', color:winner?'#15803d':'#b45309',
                    border:'1px solid '+(winner?'rgba(34,197,94,0.3)':'rgba(245,158,11,0.3)') }}>
                    {winner?'🏆 ':'⏳ '}{data.verdict||(winner?`Winner: variant ${winner}`:t('email.abNoWinner','No significant winner yet — expand sample/duration'))}
                </div>
            </>)}
        </div>
    </div>);
}

/* [현 차수] 데모 A/B 시뮬레이터 — 캠페인 id 해시로 결정적. 백엔드와 동일 베이지안(정규근사). */
function simulateAbResult(c){
    const total=c.total_sent||c.opened*4||200;
    const sentA=Math.floor(total/2), sentB=total-sentA;
    const h=String(c.id||c.name||'').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
    const baseOpen=18+(h%18); // 18~35%
    const orA=baseOpen, orB=baseOpen+((h%2)?4:-3)+(h%5); // variant B 차등
    const openedA=Math.round(sentA*orA/100), openedB=Math.round(sentB*Math.max(1,orB)/100);
    const clickedA=Math.round(openedA*0.28), clickedB=Math.round(openedB*0.31);
    // 베이지안 P(B>A) — 백엔드 betaBestProb 동일 식
    const norm=(x)=>{const tt=1/(1+0.2316419*Math.abs(x));const d=0.3989422804014327*Math.exp(-x*x/2);const p=d*tt*(0.319381530+tt*(-0.356563782+tt*(1.781477937+tt*(-1.821255978+tt*1.330274429))));return x>0?1-p:p;};
    const mA=(openedA+1)/(sentA+2), vA=mA*(1-mA)/(sentA+3);
    const mB=(openedB+1)/(sentB+2), vB=mB*(1-mB)/(sentB+3);
    const sd=Math.sqrt(vA+vB)||1; const probB=norm((mB-mA)/sd);
    let winner=null; if(sentA>=50&&sentB>=50){ if(probB>=0.95)winner='B'; else if(probB<=0.05)winner='A'; }
    const verdict=winner?`승자: variant ${winner} (95% 신뢰수준)`:'아직 유의한 승자 없음 — 표본/기간 확대 필요';
    return { ok:true, variants:{
        A:{sent:sentA,opened:openedA,clicked:clickedA,open_rate:Math.round(openedA/Math.max(1,sentA)*1000)/10},
        B:{sent:sentB,opened:openedB,clicked:clickedB,open_rate:Math.round(openedB/Math.max(1,sentB)*1000)/10},
    }, prob_b_best:Math.round(probB*1000)/10, winner, confidence:Math.round(Math.max(probB,1-probB)*1000)/10, verdict };
}

/* Analytics Tab */
/* [P1 커넥터 폭] 외부 ESP 인바운드(Mailchimp·Klaviyo·SendGrid) — esp_metrics 실DB 파생.
   발송/전달/오픈/클릭/매출. 자체 발송과 분리·보완. 자격증명 미등록·미동기화 시 정직 빈 상태. */
function EspConnectorTab() {
    const {t}=useI18n();
    const [source,setSource]=useState('all');
    const [data,setData]=useState(null);
    const [status,setStatus]=useState('idle');
    useEffect(()=>{
        let alive=true; setStatus('loading');
        _gjaEmail(`/api/v426/esp/metrics?source=${source}`)
            .then(r=>{ if(!alive) return; setData(r&&r.ok?r:{rows:[],totals:{}}); setStatus('done'); })
            .catch(()=>{ if(alive){ setData({rows:[],totals:{}}); setStatus('done'); } });
        return ()=>{ alive=false; };
    },[source]);
    const rows=Array.isArray(data?.rows)?data.rows:[];
    const tot=data?.totals||{};
    const nf=(n)=>Number(n||0).toLocaleString();
    const SRC=[{id:'all',label:t('email.espAll','전체')},{id:'mailchimp',label:'Mailchimp'},{id:'klaviyo',label:'Klaviyo'},{id:'sendgrid',label:'SendGrid'}];
    const cards=[
        {label:t('email.espDelivered','전달'),c:'#2563eb',v:nf(tot.emails_delivered)},
        {label:t('email.espOpens','오픈'),c:'#16a34a',v:nf(tot.opens)},
        {label:t('email.espClicks','클릭'),c:'#7c3aed',v:nf(tot.clicks)},
        {label:t('email.espCampaigns','캠페인'),c:'#ea580c',v:nf(tot.campaigns_sent)},
    ];
    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'linear-gradient(135deg,rgba(255,224,27,0.10),rgba(26,130,226,0.06))', border:'1px solid rgba(26,130,226,0.18)', borderRadius:14, padding:16 }}>
                <div style={{ fontWeight:900, fontSize:16, color:'#1e293b' }}>📧 {t('email.tabEsp','ESP 연동')}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:6, lineHeight:1.6 }}>{t('email.espDesc','연동허브에서 Mailchimp·Klaviyo·SendGrid 자격증명을 등록하면 발송·오픈·클릭·매출이 인바운드 수집됩니다. 자체 발송 성과와 함께 통합 가시화합니다.')}</div>
            </div>
            <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.95)', borderRadius:10, padding:4, border:'1px solid rgba(0,0,0,0.06)', width:'fit-content', flexWrap:'wrap' }}>
                {SRC.map(s=>(<button key={s.id} onClick={()=>setSource(s.id)} style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:source===s.id?'#1a82e2':'transparent', color:source===s.id?'#fff':'#475569' }}>{s.label}</button>))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                {cards.map((c,i)=>(<div key={i} style={{ background:c.c+'0d', border:`1px solid ${c.c}22`, borderRadius:12, padding:'12px 14px' }}><div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{c.label}</div><div style={{ fontSize:18, fontWeight:900, color:c.c, marginTop:4 }}>{c.v}</div></div>))}
            </div>
            <div style={{ background:'rgba(255,255,255,0.97)', border:'1px solid rgba(0,0,0,0.06)', borderRadius:14, padding:14, overflowX:'auto' }}>
                {status==='loading'?(<div style={{ textAlign:'center', padding:30, color:'#94a3b8', fontSize:13 }}>{t('common.loading','불러오는 중…')}</div>)
                : rows.length===0?(<div style={{ textAlign:'center', padding:36, color:'#94a3b8', fontSize:13, lineHeight:1.8 }}><div style={{ fontSize:30, marginBottom:8 }}>🔌</div>{t('email.espEmpty','Mailchimp·Klaviyo·SendGrid 자격증명을 등록하면 ESP 성과가 표시됩니다.')}<div style={{ marginTop:8 }}><button onClick={()=>{ window.location.href='/api-keys'; }} style={{ padding:'6px 16px', borderRadius:8, border:'1px solid rgba(37,99,235,0.3)', background:'rgba(37,99,235,0.06)', color:'#2563eb', fontSize:11, fontWeight:700, cursor:'pointer' }}>{t('email.espGoConnect','연동허브로 이동 →')}</button></div></div>)
                :(<table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}><thead><tr style={{ borderBottom:'2px solid rgba(0,0,0,0.08)', color:'#475569', textAlign:'right' }}><th style={{ textAlign:'left', padding:'8px 10px' }}>{t('email.espSource','채널')}</th><th style={{ padding:'8px 10px' }}>{t('email.espDelivered','전달')}</th><th style={{ padding:'8px 10px' }}>{t('email.espOpens','오픈')}</th><th style={{ padding:'8px 10px' }}>{t('email.espOpenRate','오픈율')}</th><th style={{ padding:'8px 10px' }}>{t('email.espClicks','클릭')}</th><th style={{ padding:'8px 10px' }}>{t('email.espClickRate','클릭율')}</th></tr></thead><tbody>{rows.map((r,i)=>(<tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)', textAlign:'right' }}><td style={{ textAlign:'left', padding:'7px 10px', fontWeight:600, color:'#1e293b', textTransform:'capitalize' }}>{r.source}</td><td style={{ padding:'7px 10px', color:'#334155' }}>{nf(r.emails_delivered)}</td><td style={{ padding:'7px 10px', color:'#334155' }}>{nf(r.opens)}</td><td style={{ padding:'7px 10px', color:'#16a34a', fontWeight:600 }}>{(Number(r.open_rate||0)*100).toFixed(1)}%</td><td style={{ padding:'7px 10px', color:'#334155' }}>{nf(r.clicks)}</td><td style={{ padding:'7px 10px', color:'#7c3aed', fontWeight:600 }}>{(Number(r.click_rate||0)*100).toFixed(1)}%</td></tr>))}</tbody></table>)}
            </div>
        </div>
    );
}

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
        const totalFailed=sentC.reduce((s,c)=>s+(c.failed||c.bounced||0),0);/*[266차 계약불일치] 백엔드 컬럼=bounced(failed 아님)→전송률 항상100%·실패0 이던 것 정합*/
        const bySegment={};
        sentC.forEach(c=>{const seg=c.targetSegmentName||c.segment_name||'All';if(!bySegment[seg])bySegment[seg]={sent:0,opened:0,clicked:0,campaigns:0};bySegment[seg].sent+=(c.total_sent||0);bySegment[seg].opened+=(c.opened||0);bySegment[seg].clicked+=(c.clicked||0);bySegment[seg].campaigns+=1;});
        return {totalSent,totalOpened,totalClicked,totalFailed,sentCount:sentC.length,bySegment};
    },[emailCampaignsLinked]);
    const overallOpen=analytics.totalSent>0?(analytics.totalOpened/analytics.totalSent*100).toFixed(1):"0";
    const overallClick=analytics.totalSent>0?(analytics.totalClicked/analytics.totalSent*100).toFixed(1):"0";
    const deliveryRate=analytics.totalSent>0?((analytics.totalSent-analytics.totalFailed)/analytics.totalSent*100).toFixed(1):"100";
    // [246차 P2] 딜리버러빌리티 평판 시계열 — email_reputation_daily(일별 cron 스냅샷) + 현재값.
    const [rep,setRep]=useState(null);
    useEffect(()=>{ if(isDemo) return; _gjaEmail('/api/email/deliverability/history?days=90').then(r=>{ if(r?.ok) setRep(r); }).catch(()=>{}); },[isDemo]);
    const gColor=(g)=> g==='good'?C.green : g==='warning'?C.yellow : '#ef4444';
    return (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                <KpiBadge icon="📤" label={t('email.anTotalSent', "Total Sent")} value={analytics.totalSent.toLocaleString()} color={C.accent}/>
                <KpiBadge icon="👁️" label={t('email.anOpenRate', "Open Rate")} value={overallOpen+"%"} color={C.green} sub={analytics.totalOpened.toLocaleString()+" opened"}/>
                <KpiBadge icon="🖱️" label={t('email.anClickRate', "Click Rate")} value={overallClick+"%"} color={C.yellow} sub={analytics.totalClicked.toLocaleString()+" clicks"}/>
                <KpiBadge icon="📦" label={t('email.anDelivery', "Delivery Rate")} value={deliveryRate+"%"} color={C.cyan} sub={analytics.totalFailed+" failed"}/>
            </div>
            <Card glow>
                <div style={{ fontWeight:800, fontSize:14, marginBottom:18, display:"flex", alignItems:"center", gap:8, color:'#1f2937' }}>
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

            {/* [246차 P2] 딜리버러빌리티 평판 추이 — 발신자 평판(repScore)·바운스/컴플레인 시계열 */}
            {!isDemo && rep && rep.current && (() => {
                const series = Array.isArray(rep.series) ? rep.series : [];
                const cur = rep.current;
                const scores = series.map(s => Number(s.rep_score) || 0);
                const maxS = 100, minS = 0;
                const W = 600, H = 60, pad = 4;
                const pts = scores.map((v, i) => {
                    const x = pad + (scores.length <= 1 ? 0 : (i / (scores.length - 1)) * (W - pad * 2));
                    const y = H - pad - ((v - minS) / (maxS - minS || 1)) * (H - pad * 2);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                return (
                    <Card glow>
                        <div style={{ fontWeight:800, fontSize:14, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, color:'#1f2937' }}>
                            <span style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:16 }}>📈</span>{t('email.repTrendTitle', '딜리버러빌리티 평판 추이')}</span>
                            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:24, fontWeight:900, color:gColor(cur.grade) }}>{cur.rep_score}</span>
                                <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, color:gColor(cur.grade), background:gColor(cur.grade)+'1a' }}>
                                    {cur.grade==='good'?t('email.repGood','양호'):cur.grade==='warning'?t('email.repWarn','주의'):t('email.repRisk','위험')}
                                </span>
                            </span>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
                            <KpiBadge icon="📉" label={t('email.repBounce','바운스율')} value={cur.bounce_rate+"%"} color={cur.bounce_rate<2?C.green:cur.bounce_rate<5?C.yellow:'#ef4444'}/>
                            <KpiBadge icon="🚫" label={t('email.repComplaint','스팸신고율')} value={cur.complaint_rate+"%"} color={cur.complaint_rate<0.1?C.green:cur.complaint_rate<0.5?C.yellow:'#ef4444'}/>
                            <KpiBadge icon="👁️" label={t('email.repOpen','오픈율')} value={cur.open_rate+"%"} color={C.cyan}/>
                        </div>
                        {scores.length >= 2 ? (
                            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }} preserveAspectRatio="none">
                                <polyline points={pts.join(' ')} fill="none" stroke={gColor(cur.grade)} strokeWidth="2" />
                            </svg>
                        ) : (
                            <div style={{ fontSize:11.5, color:'#94a3b8', padding:'8px 0' }}>{rep.note || t('email.repNote','평판 시계열은 일별 스냅샷 누적 후 표시됩니다(현재값은 7일 롤링).')}</div>
                        )}
                        <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:8 }}>🔬 {t('email.repMethod','7일 롤링 발신자 평판(바운스×8 + 스팸신고×80 페널티, 100점)·일별 스냅샷 시계열. SPF/DMARC·리스트 위생이 점수를 좌우합니다.')}</div>
                    </Card>
                );
            })()}
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
        {emailCh.map(ch=>(<span key={ch.key||ch.platform} style={{ background:C.accent+'15', color:C.accent, border:'1px solid '+C.accent+'25', borderRadius:6, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{ch.platform||ch.key}</span>))}
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
    const secTitle = { fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#eef2ff,#e0f2fe)", borderRadius: 16, border: "1px solid #c7d2fe", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('email.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('email.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 700, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
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
                                {s.phase ? <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
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
                <div style={{ fontWeight: 900, fontSize: 16, color: "#1e293b", marginBottom: 8, WebkitTextFillColor: '#1e293b' }}>🎉 {g('guideReadyTitle')}</div>
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
        {id:"esp",label:t('email.tabEsp', "ESP 연동"),icon:"🔌"},
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
            {/* [현 차수] 특정상품 조회 — 전역 동기화. 선택 시 그 상품 매출·세그먼트·채널/국가별 인라인. */}
            <ProductSelectBar />
            <ProductMarketingPanel period="monthly" />
            <div className="page-subtabs" style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                {TABS.filter(Tb=>_eTabVisible(Tb.id)).map(Tb=>(
                    <button key={Tb.id} onClick={()=>setTab(Tb.id)} style={{ padding:"10px 20px", borderRadius:12, border:"none", cursor:"pointer", background:tab===Tb.id?C.accent:'rgba(255,255,255,0.9)', color:tab===Tb.id?"#fff":"#374151", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:6, boxShadow:tab===Tb.id?'0 4px 16px '+C.accent+'33':'0 1px 3px rgba(0,0,0,0.06)' }}><span>{Tb.icon}</span> {Tb.label}</button>
                ))}
            </div>
            {tab==="campaigns" && <CampaignsTab/>}
            {tab==="templates" && <TemplatesTab/>}
            {tab==="analytics" && <AnalyticsTab/>}
            {tab==="esp" && <EspConnectorTab/>}
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
