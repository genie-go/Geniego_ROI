import React, { useState, useEffect, useCallback } from "react";
import { useT } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import useSecurityMonitor from "../hooks/useSecurityMonitor.js";

const API = "/api";

/* Plan Max Account Count */
const PLAN_MAX_ACCOUNTS = { free: 0, demo: 0, starter: 5, growth: 10, pro: 30, enterprise: 999, admin: 999 };

/* Menu groups — labels use i18n */
const getMenuGroups = (t) => [
  { key: "home", label: t("workspace.mgHome"), menus: [
    { key: "dashboard", label: t("workspace.mDashboard") },
    { key: "kpi_widgets", label: t("workspace.mKpiWidget") },
    { key: "realtime", label: t("workspace.mRealtime") },
  ]},
  { key: "ai_marketing", label: t("workspace.mgAiMarketing"), menus: [
    { key: "ai_strategy", label: t("workspace.mAiStrategy") },
    { key: "campaign_manager", label: t("workspace.mCampaign") },
    { key: "journey_builder", label: t("workspace.mJourney") },
    { key: "ai_prediction", label: t("workspace.mAiPredict") },
    { key: "budget_planner", label: t("workspace.mBudget") },
  ]},
  { key: "crm", label: t("workspace.mgCrm"), menus: [
    { key: "crm_main", label: t("workspace.mCrmMain") },
    { key: "multi_channel", label: t("workspace.mMultiChannel") },
    { key: "email_marketing", label: t("workspace.mEmail") },
    { key: "loyalty", label: t("workspace.mLoyalty") },
  ]},
  { key: "commerce", label: t("workspace.mgCommerce"), menus: [
    { key: "order_hub", label: t("workspace.mOrderHub") },
    { key: "product_mgmt", label: t("workspace.mProduct") },
    { key: "wms_manager", label: t("workspace.mWms") },
    { key: "channels", label: t("workspace.mChannels") },
  ]},
  { key: "analytics", label: t("workspace.mgAnalytics"), menus: [
    { key: "performance", label: t("workspace.mPerformance") },
    { key: "ai_insights", label: t("workspace.mAiInsights") },
    { key: "bi_report", label: t("workspace.mBiReport") },
    { key: "attribution", label: t("workspace.mAttribution") },
  ]},
  { key: "connectors", label: t("workspace.mgConnectors"), menus: [
    { key: "channel_conn", label: t("workspace.mChannelConn") },
    { key: "api_mgmt", label: t("workspace.mApiMgmt") },
  ]},
];

const PLAN_MENU_ACCESS = {
  starter:    ["home", "ai_marketing", "crm"],
  growth:     ["home", "ai_marketing", "crm", "commerce", "analytics"],
  pro:        ["home", "ai_marketing", "crm", "commerce", "analytics", "connectors"],
  enterprise: ["home", "ai_marketing", "crm", "commerce", "analytics", "connectors"],
  admin:      ["home", "ai_marketing", "crm", "commerce", "analytics", "connectors"],
};

/* Upgrade Modal */
export function Upgradal({ onClose, trigger = "feature" }) {
  const t = useT();
  const PLANS = [
    { id: "starter", color: "#22c55e", emoji: "\ud83c\udf31", price: "\u20a949,000" },
    { id: "growth",  color: "#4f8ef7", emoji: "\ud83d\udcc8", price: "\u20a9129,000" },
    { id: "pro",     color: "#a855f7", emoji: "\ud83d\ude80", price: "\u20a9299,000" },
    { id: "enterprise", color: "#f59e0b", emoji: "\ud83c\udf10", price: t("workspace.contactUs") },
  ];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#0a0f1e)", border:"1px solid rgba(79,142,247,0.3)", borderRadius:20, padding:"32px 28px", width:"min(800px,95vw)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:900, color: 'var(--text-1)' }}>{"\ud83d\ude80"} {t("workspace.upgradeTo")}</div>
            <div style={{ fontSize:12, color:"#7c8fa8", marginTop:6 }}>
              {trigger==="team" ? t("workspace.upgradeTeamDesc") : t("workspace.upgradeFeatureDesc")}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#7c8fa8", cursor:"pointer", fontSize:20 }}>{"\u2715"}</button>
        <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.2)", marginBottom:20, fontSize:12, color:"#93c5fd" }}>
          <b>{"\ud83d\udca1"} {t("workspace.upgradeDiff")}</b>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ borderRadius:14, border:`1px solid ${p.color}44`, background:`${p.color}08`, padding:"18px 16px" }}>
              <div style={{ fontSize:22 }}>{p.emoji}</div>
              <div style={{ fontWeight:900, fontSize:15, color:p.color, margin:"6px 0 4px" }}>{t(`workspace.plan_${p.id}`)}</div>
              <div style={{ fontSize:11, color:"#7c8fa8", marginBottom:8 }}>{t(`workspace.planDesc_${p.id}`)}</div>
              <div style={{ fontSize:20, fontWeight:900, color: "var(--text-1)", marginBottom:12 }}>{p.price}{p.id!=="enterprise" && <span style={{ fontSize:10, color:"#7c8fa8" }}>/{t("workspace.month")}</span>}</div>
              <button onClick={() => p.id!=="enterprise" ? window.location.href=`/pricing?plan=${p.id}` : alert("enterprise@genie-go.com")}
                style={{ width:"100%", padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:12, background:p.id!=="enterprise" ? `linear-gradient(135deg,${p.color},${p.color}cc)` : "rgba(245,158,11,0.2)", color:p.id!=="enterprise" ? "#fff" : p.color }}>
                {p.id!=="enterprise" ? t("workspace.btnPayment") : t("workspace.btnContact")}
              </button>
          ))}
        <div style={{ textAlign:"center", fontSize:11, color:"#4b5563", marginTop:16 }}>{t("workspace.paymentNote")}</div>
                            </div>
            </div>
        </div>
    </div>
);
}

/* Team Menu Permission Modal */
function TeamMenuModal({ team, planKey, onClose, onSave }) {
  const t = useT();
  const MENU_GROUPS = getMenuGroups(t);
  const allowed = PLAN_MENU_ACCESS[planKey] || [];
  const [selected, setSelected] = useState(team.menu_access || [...allowed]);
  const toggle = (mk) => setSelected(s => s.includes(mk) ? s.filter(k=>k!==mk) : [...s, mk]);
  const toggleGroup = (gk) => {
    const g = MENU_GROUPS.find(g=>g.key===gk);
    const allIn = g?.menus.every(m=>selected.includes(m.key));
    if (allIn) setSelected(s => s.filter(k => !g?.menus.map(m=>m.key).includes(k)));
    else setSelected(s => [...new Set([...s, ...(g?.menus.map(m=>m.key)||[])])]);
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f172a", border:"1px solid rgba(79,142,247,0.3)", borderRadius:16, padding:"24px", width:"min(680px,95vw)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ fontWeight:900, fontSize:16, color: "var(--text-1)", marginBottom:6 }}>{"\ud83d\udd12"} {t("workspace.permTitle")} — {team.name}</div>
        <div style={{ fontSize:11, color:"#7c8fa8", marginBottom:16 }}>{t("workspace.permDesc").replace("{plan}", planKey.toUpperCase())}</div>
        <div style={{ display:"grid", gap:8 }}>
          {MENU_GROUPS.map(group => {
            const isAllowed = allowed.includes(group.key);
            if (!isAllowed) return (
              <div key={group.key} style={{ padding:"10px 14px", borderRadius:8, background: 'var(--surface)', border: '1px solid var(--border)', opacity:0.4 }}>
                <span style={{ fontSize:12, color:"#4b5563" }}>{group.label} — {t("workspace.notInPlan")}</span>
            
);
            const allChecked = group.menus.every(m=>selected.includes(m.key));
            const someChecked = group.menus.some(m=>selected.includes(m.key));
            return (
              <div key={group.key} style={{ borderRadius:10, border:"1px solid rgba(79,142,247,0.2)", overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", background:"rgba(79,142,247,0.08)", display:"flex", alignItems:"center", gap:10 }}>
                  <input type="checkbox" checked={allChecked} ref={el => { if(el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={() => toggleGroup(group.key)} style={{ accentColor:"#4f8ef7", width:14, height:14 }} />
                  <span style={{ fontWeight:800, fontSize:13, color: "var(--text-1)" }}>{group.label}</span>
                  <span style={{ fontSize:10, color:"#4f8ef7" }}>({group.menus.filter(m=>selected.includes(m.key)).length}/{group.menus.length})</span>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"10px 14px" }}>
                  {group.menus.map(m => (
                    <label key={m.key} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"4px 10px", borderRadius:6, background:selected.includes(m.key) ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.03)", border:`1px solid ${selected.includes(m.key) ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.07)"}` }}>
                      <input type="checkbox" checked={selected.includes(m.key)} onChange={() => toggle(m.key)} style={{ accentColor:"#4f8ef7", width:12, height:12 }} />
                      <span style={{ fontSize:11, color:selected.includes(m.key) ? "#93c5fd" : "#64748b" }}>{m.label}</span>
                    </label>
                  ))}
                </div>
            
              </div>
);
          })}
        <div style={{ display:"flex",
            </div>
 gap:8, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border: '1px solid var(--border)', background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>{t("workspace.cancel")}</button>
          <button onClick={() => onSave(selected)} style={{ padding:"9px 24px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)' }}>{t("workspace.save")}</button>
            </div>
        </div>
    </div>
mber, onClose, onSave }) {
  const t = useT();
  const [form, setForm] = useState({
    name: member?.name || "", login_id: member?.login_id || member?.email || "",
    password: "", email: member?.email || "", role: member?.role || "viewer",
  });
  const [msg, setMsg] = useState("");
  const ROLES = { viewer: t("workspace.roleViewer"), analyst: t("workspace.roleAnalyst"), editor: t("workspace.roleEditor"), manager: t("workspace.roleManager") };
  const doSave = () => {
    if (!form.name.trim()) { setMsg(t("workspace.errName")); return; }
    if (!form.login_id.trim()) { setMsg(t("workspace.errLoginId")); return; }
    if (!member && !form.password) { setMsg(t("workspace.errPassword")); return; }
    onSave({ ...form, teamId });
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f172a", border:"1px solid rgba(79,142,247,0.3)", borderRadius:16, padding:"28px 24px", width:420 }}>
        <div style={{ fontWeight:900, fontSize:16, color: "var(--text-1)", marginBottom:20 }}>
          {member ? `\u270f\ufe0f ${t("workspace.editMember")}` : `\u2795 ${t("workspace.addMember")}`}
        {[
          { field:"name", label:t("workspace.fieldName"), ph:"John Doe" },
          { field:"login_id", label:t("workspace.fieldLoginId"), ph:"hong.gildong" },
          { field:"email", label:t("workspace.fieldEmail"), ph:"hong@company.com" },
        ].map(({ field, label, ph }) => (
          <div key={field} style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>{label}</div>
            <input value={form[field]} onChange={e => setForm(p=>({...p,[field]:e.target.value}))} placeholder={ph}
              style={{ width:"100%", padding:"9px 12px", borderRadius:8, border: '1px solid var(--border)', background: 'var(--surface)', color:"#e8eaf6", fontSize:13, boxSizing:"border-box", outline:"none" }} />
        ))}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>
            {t("workspace.fieldPassword")} {member ? `(${t("workspace.pwChangeOnly")})` : "*"}
          <input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))}
            placeholder={member ? t("workspace.pwChangePh") : t("workspace.pwNewPh")}
            style={{ width:"100%", padding:"9px 12px", borderRadius:8, border: '1px solid var(--border)', background: 'var(--surface)', color:"#e8eaf6", fontSize:13, boxSizing:"border-box", outline:"none" }} />
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>{t("workspace.fieldRole")}</div>
          <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
            style={{ width:"100%", padding:"9px 12px", borderRadius:8, border: '1px solid var(--border)', background:"#0a1628", color:"#e8eaf6", fontSize:13 }}>
            {Object.entries(ROLES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        {msg && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>{msg}</div>}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={doSave} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)' }}>{t("workspace.save")}</button>
          <button onClick={onClose} style={{ padding:"10px 16px", borderRadius:8, border: '1px solid var(--border)', background:"transparent", color:"#94a3b8", cursor:"pointer" }}>{t("workspace.cancel")}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* Team Card */
function TeamCard({ team, planKey, planColor, t, menuGroups, onRename, onDelete, onEditMenu, onAddMember, onEditMember, onRemoveMember }) {
  const [showMembers, setShowMembers] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(team.name);
  const menuCount = (team.menu_access || []).length;
  const memberCount = (team.members || []).length;
  return (
    <div style={{ borderRadius:14, border:`1px solid ${planColor}30`, background:`${planColor}05`, overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", background:`${planColor}10`, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:16 }}>{"\ud83c\udfe2"}</div>
        {editingName ? (
          <input value={nameVal} onChange={e=>setNameVal(e.target.value)} autoFocus
            onBlur={() => { setEditingName(false); if(nameVal.trim()) onRename(team.id, nameVal.trim()); else setNameVal(team.name); }}
            onKeyDown={e => { if(e.key==="Enter") { setEditingName(false); onRename(team.id, nameVal.trim()); } if(e.key==="Escape") { setEditingName(false); setNameVal(team.name); } }}
            style={{ flex:1, padding:"5px 8px", borderRadius:6, border:"1px solid rgba(79,142,247,0.5)", background:"rgba(15,23,42,0.8)", color: "var(--text-1)", fontSize:14, fontWeight:800, outline:"none" }} />
        ) : (
          <span style={{ flex:1, fontWeight:900, fontSize:15, color: "var(--text-1)", cursor:"pointer" }} onDoubleClick={()=>setEditingName(true)}>{team.name}</span>
        )}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#7c8fa8" }}>{t("workspace.menuCount").replace("{n}", menuCount)}</span>
          <span style={{ fontSize:10, color:"#7c8fa8" }}>{"\u00b7"}</span>
          <span style={{ fontSize:10, color:"#7c8fa8" }}>{t("workspace.memberCount").replace("{n}", memberCount)}</span>
        <button onClick={()=>setEditingName(true)} style={{ padding:"3px 8px", borderRadius:5, border: '1px solid var(--border)', background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:10 }}>{"\u270f\ufe0f"} {t("workspace.btnRename")}</button>
        <button onClick={()=>onEditMenu(team)} style={{ padding:"3px 8px", borderRadius:5, border:`1px solid ${planColor}44`, background:`${planColor}10`, color:planColor, cursor:"pointer", fontSize:10, fontWeight:700 }}>{"\ud83d\udd12"} {t("workspace.btnPerm")}</button>
        <button onClick={()=>onDelete(team.id)} style={{ padding:"3px 8px", borderRadius:5, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.06)", color:"#ef4444", cursor:"pointer", fontSize:10 }}>{"\ud83d\uddd1"}</button>
      {(team.menu_access||[]).length > 0 && (
        <div style={{ padding:"8px 18px", display:"flex", flexWrap:"wrap", gap:4, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          {(team.menu_access||[]).map(mk => {
            const g = menuGroups.find(g=>g.menus.some(m=>m.key===mk));
            const m = g?.menus.find(m=>m.key===mk);
            return m ? (<span key={mk} style={{ fontSize:9, padding:"2px 7px", borderRadius:99, fontWeight:700, background:`${planColor}15`, border:`1px solid ${planColor}30`, color:planColor }}>{m.label}</span>) : null;
          })}
      )}
      <div style={{ padding:"10px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <button onClick={()=>setShowMembers(s=>!s)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:12, fontWeight:700, padding:0 }}>
            {showMembers ? "\u25bc" : "\u25b6"} {t("workspace.memberList").replace("{n}", memberCount)}
          </button>
          <button onClick={()=>onAddMember(team)} style={{ padding:"4px 12px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:700, fontSize:11, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)' }}>+ {t("workspace.addMember")}</button>
        {showMembers && (
          <div style={{ display:"grid", gap:4 }}>
            {(team.members||[]).length === 0 ? (
              <div style={{ textAlign:"center", color:"#4b5563", fontSize:11, padding:"16px 0" }}>{t("workspace.noMembers")}</div>
            ) : (team.members||[]).map(mb => (
              <div key={mb.id} style={{ display:"grid", gridTemplateColumns:"1fr 100px 120px auto auto", gap:8, padding:"8px 12px", borderRadius:8, background: 'var(--surface)', border: '1px solid var(--border)', alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color: "var(--text-1)" }}>{mb.name}</div>
                  <div style={{ fontSize:10, color:"#64748b" }}>ID: {mb.login_id || mb.email}</div>
                <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:700, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", color:"#d8b4fe", textAlign:"center" }}>{mb.role}</span>
                <div style={{ fontSize:10, color:"#64748b" }}>{mb.email || ""}</div>
                <button onClick={()=>onEditMember(team, mb)} style={{ padding:"4px 8px", borderRadius:5, border:"1px solid rgba(79,142,247,0.3)", background:"rgba(79,142,247,0.08)", color:"#4f8ef7", cursor:"pointer", fontSize:10 }}>{t("workspace.edit")}</button>
                <button onClick={()=>onRemoveMember(team.id, mb.id)} style={{ padding:"4px 8px", borderRadius:5, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.06)", color:"#ef4444", cursor:"pointer", fontSize:10 }}>{t("workspace.delete")}</button>
            ))}
        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* Usage Guide */
function UsageGuide({ t }) {
  const [open, setOpen] = useState(false);
  const steps = [1, 2, 3, 4, 5, 6];
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(v => !v)} style={{ display:"flex", alignItems:"center", gap:8, margin:"0 auto 16px", padding:"10px 24px", borderRadius:12, border:"1px solid rgba(79,142,247,0.3)", background:"rgba(79,142,247,0.06)", color:"#4f8ef7", fontSize:13, fontWeight:700, cursor:"pointer" }}>
        {open ? `\ud83d\udcd6 ${t("workspace.guideTitle")} \u25b2` : `\ud83d\udcd6 ${t("workspace.guideTitle")} \u25bc`}
      </button>
      {open && (
        <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(79,142,247,0.15)", borderRadius:16, padding:24, animation:"fadeUp 0.3s ease" }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>{"\ud83d\udc65"}</div>
            <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 6px", color: 'var(--text-1)' }}>{t("workspace.guideTitle")}</h2>
            <p style={{ color: 'var(--text-3)', fontSize:12 }}>{t("workspace.guideSub")}</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            {steps.map(i => (
              <div key={i} style={{ padding:14, borderRadius:12, background:"rgba(79,142,247,0.03)", border:"1px solid rgba(79,142,247,0.08)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)' }}>{i}</span>
                  <span style={{ fontWeight:800, fontSize:12, color:"#4f8ef7" }}>{t(`workspace.guideStep${i}Title`)}</span>
                <p style={{ fontSize:11, color: 'var(--text-3)', lineHeight:1.6, margin:0 }}>{t(`workspace.guideStep${i}Desc`)}</p>
            ))}
          <div style={{ padding:"14px 16px", borderRadius:10, background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.15)" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#a855f7", marginBottom:6 }}>{"\ud83d\udca1"} {t("workspace.guideTipTitle")}</div>
            <p style={{ fontSize:11, color: 'var(--text-3)', lineHeight:1.6, margin:0 }}>{t("workspace.guideTipDesc")}</p>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* Main Component */
export default function TeamWorkspace() {
  const t = useT();
  const { user, token, plan } = useAuth();
  const { locked } = useSecurityMonitor("workspace");
  const MENU_GROUPS = getMenuGroups(t);
  const [teams, setTeams] = useState([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [menuModal, setMenuModal] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [msg, setMsg] = useState({ text:"", type:"ok" });

  const isPaidPlan = ["starter","growth","pro","enterprise","admin"].includes(plan);
  const maxAccounts = PLAN_MAX_ACCOUNTS[plan] || 0;
  const usedAccounts = teams.reduce((s, t) => s + (t.members||[]).length, 0);
  const planColor = { starter:"#22c55e", growth:"#4f8ef7", pro:"#a855f7", enterprise:"#f59e0b", admin:"#ef4444" }[plan] || "#8da4c4";

  const showFeedback = (text, type="ok") => { setMsg({text,type}); setTimeout(()=>setMsg({text:"",type:"ok"}), 3500); };

  const loadTeams = useCallback(async () => {
    if (!isPaidPlan) return;
    try {
      const r = await fetch(`${API}/v423/workspace/teams`, { headers: { Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.ok) setTeams(d.teams || []);
      else setTeams([]);
    } catch { setTeams([]); }
  }, [token, isPaidPlan]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: Date.now(), name: newTeamName.trim(), menu_access: PLAN_MENU_ACCESS[plan] || [], members: [] };
    try {
      const r = await fetch(`${API}/v423/workspace/teams`, { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify({ name: newTeamName.trim(), menu_access: newTeam.menu_access }) });
      const d = await r.json();
      if (d.ok) setTeams(ts=>[...ts, {...newTeam, id:d.team_id}]);
      else setTeams(ts=>[...ts, newTeam]);
    } catch { setTeams(ts=>[...ts, newTeam]); }
    setNewTeamName("");
    showFeedback(`\u2705 "${newTeamName.trim()}" ${t("workspace.fbTeamCreated")}`);
  };

  const renameTeam = async (teamId, newName) => {
    setTeams(ts => ts.map(ti => ti.id===teamId ? {...ti, name:newName} : ti));
    try { await fetch(`${API}/v423/workspace/teams/${teamId}`, { method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify({name:newName}) }); } catch {}
    showFeedback(`\u2705 ${t("workspace.fbRenamed")}`);
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm(t("workspace.confirmDeleteTeam"))) return;
    setTeams(ts => ts.filter(ti => ti.id!==teamId));
    try { await fetch(`${API}/v423/workspace/teams/${teamId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} }); } catch {}
    showFeedback(`\ud83d\uddd1 ${t("workspace.fbDeleted")}`, "warn");
  };

  const saveMenuAccess = async (menuKeys) => {
    const teamId = menuModal.id;
    setTeams(ts => ts.map(ti => ti.id===teamId ? {...ti, menu_access:menuKeys} : ti));
    try { await fetch(`${API}/v423/workspace/teams/${teamId}/menu`, { method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify({menu_access:menuKeys}) }); } catch {}
    setMenuModal(null);
    showFeedback(`\u2705 ${t("workspace.fbPermSaved")}`);
  };

  const saveMember = async ({ teamId, name, login_id, password, email, role }) => {
    const editingMember = memberModal?.member;
    const newMember = { id: Date.now(), name, login_id, email, role };
    if (editingMember) {
      setTeams(ts => ts.map(ti => ti.id===teamId ? {...ti, members:(ti.members||[]).map(m=>m.id===editingMember.id ? {...m, name, login_id, email, role} : m)} : ti));
    } else {
      if (usedAccounts >= maxAccounts) { showFeedback(`\u274c ${t("workspace.errMaxAccounts").replace("{n}", maxAccounts)}`, "err"); return; }
      setTeams(ts => ts.map(ti => ti.id===teamId ? {...ti, members:[...(ti.members||[]), newMember]} : ti));
    }
    try {
      const path = editingMember ? `${API}/v423/workspace/members/${editingMember.id}` : `${API}/v423/workspace/members`;
      await fetch(path, { method: editingMember ? "PATCH" : "POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body: JSON.stringify({team_id:teamId, name, login_id, password, email, role}) });
    } catch {}
    setMemberModal(null);
    showFeedback(editingMember ? `\u2705 ${t("workspace.fbMemberEdited")}` : `\u2705 ${t("workspace.fbMemberAdded")}`);
  };

  const removeMember = async (teamId, memberId) => {
    if (!window.confirm(t("workspace.confirmDeleteMember"))) return;
    setTeams(ts => ts.map(ti => ti.id===teamId ? {...ti, members:(ti.members||[]).filter(m=>m.id!==memberId)} : ti));
    try { await fetch(`${API}/v423/workspace/members/${memberId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} }); } catch {}
    showFeedback(`\ud83d\uddd1 ${t("workspace.fbMemberRemoved")}`, "warn");
  };

  if (!isPaidPlan) {
    return (
      <div style={{ padding:"60px 20px", textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>{"\ud83d\udc65"}</div>
        <div style={{ fontSize:20, fontWeight:800, color: "var(--text-1)", marginBottom:8 }}>{t("workspace.title")}</div>
        <div style={{ fontSize:13, color:"#7c8fa8", marginBottom:24 }}>{t("workspace.freeDesc")}</div>
        <button onClick={()=>setShowUpgrade(true)} style={{ padding:"14px 36px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:900, fontSize:15, background:"linear-gradient(135deg,#4f8ef7,#a855f7)", color: 'var(--text-1)', boxShadow:"0 6px 24px rgba(79,142,247,0.4)" }}>
          {"\ud83d\ude80"} {t("workspace.viewPlans")}
        </button>
        {showUpgrade && <Upgradal trigger="team" onClose={()=>setShowUpgrade(false)} />}
    </div>
);
  }

  return (
<div style={{ display:"grid", gap:16 }}>
      {menuModal && <TeamMenuModal team={menuModal} planKey={plan} onClose={()=>setMenuModal(null)} onSave={saveMenuAccess} />}
      {memberModal && <MemberModal teamId={memberModal.team.id} member={memberModal.member} onClose={()=>setMemberModal(null)} onSave={saveMember} />}

      {/* Header */}
      <div style={{ padding:"16px 20px", borderRadius:14, background:"linear-gradient(135deg,rgba(79,142,247,0.1),rgba(168,85,247,0.08))", border:"1px solid rgba(79,142,247,0.25)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:16, display:"flex", alignItems:"center", gap:8 }}>
            {"\ud83d\udc65"} {t("workspace.title")}
            <span style={{ fontSize:10, padding:"2px 10px", borderRadius:99, fontWeight:700, background:`${planColor}18`, border:`1px solid ${planColor}33`, color:planColor }}>{plan.toUpperCase()}</span>
          <div style={{ fontSize:11, color:"#7c8fa8", marginTop:4 }}>
            {user?.company || user?.name} {"\u00b7"} {t("workspace.accountUsage").replace("{used}", usedAccounts).replace("{max}", maxAccounts)}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color: usedAccounts>=maxAccounts ? "#ef4444" : "#22c55e" }}>
            {t("workspace.accountsLeft").replace("{n}", maxAccounts-usedAccounts)}
        </div>

      {msg.text && (
        <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700, background:msg.type==="ok"?"rgba(34,197,94,0.1)":msg.type==="warn"?"rgba(234,179,8,0.08)":"rgba(239,68,68,0.1)", border:`1px solid ${msg.type==="ok"?"rgba(34,197,94,0.3)":msg.type==="warn"?"rgba(234,179,8,0.3)":"rgba(239,68,68,0.3)"}`, color:msg.type==="ok"?"#22c55e":msg.type==="warn"?"#fbbf24":"#ef4444" }}>
          {msg.text}
      )}

      <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", fontSize:11, color:"#86efac" }}>
        {"\u2705"} <b>{t("workspace.paidBannerTitle")}</b> — {t("workspace.paidBannerDesc")}

      {/* Team Create */}
      <div style={{ padding:"14px 18px", borderRadius:12, background: 'var(--surface)', border: '1px solid var(--border)', display:"flex", gap:10, alignItems:"center" }}>
        <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder={t("workspace.teamInputPh")}
          onKeyDown={e=>e.key==="Enter" && createTeam()}
          style={{ flex:1, padding:"10px 14px", borderRadius:8, border: '1px solid var(--border)', background: 'var(--surface)', color:"#e8eaf6", fontSize:13, outline:"none" }} />
        <button onClick={createTeam} disabled={!newTeamName.trim()} style={{ padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color: 'var(--text-1)', opacity:newTeamName.trim()?1:0.5 }}>
          + {t("workspace.btnCreateTeam")}
        </button>

      {teams.length === 0 ? (
        <div style={{ textAlign:"center", color:"#4b5563", fontSize:13, padding:"40px 0" }}>{t("workspace.noTeams")}</div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {teams.map(team => (
            <TeamCard key={team.id} team={team} planKey={plan} planColor={planColor} t={t} menuGroups={MENU_GROUPS}
              onRename={renameTeam} onDelete={deleteTeam} onEditMenu={setMenuModal}
              onAddMember={(ti) => setMemberModal({team:ti, member:null})}
              onEditMember={(ti, m) => setMemberModal({team:ti, member:m})}
              onRemoveMember={removeMember} />
          ))}
      )}

      <div style={{ padding:"12px 16px", borderRadius:10, background: 'var(--surface)', border: '1px solid var(--border)', display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:"#64748b" }}>
          {t("workspace.planLabel")}: <b style={{color:planColor}}>{plan.toUpperCase()}</b> {"\u00b7"} {t("workspace.maxAccounts").replace("{n}", maxAccounts)}
        <button onClick={()=>window.location.href="/pricing"} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${planColor}44`, background:`${planColor}08`, color:planColor, cursor:"pointer", fontSize:11, fontWeight:700 }}>
          {t("workspace.changePlan")} {"\u2192"}
        </button>

      <UsageGuide t={t} />
      {showUpgrade && <Upgradal trigger="upgrade" onClose={()=>setShowUpgrade(false)} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}