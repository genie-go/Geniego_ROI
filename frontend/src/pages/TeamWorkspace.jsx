import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

const API = "/api";

/* ─── Allowed by Plan Max Account Count ─────────────────── */
const PLAN_MAX_ACCOUNTS = { free: 0, demo: 0, starter: 5, growth: 10, pro: 30, enterprise: 999, admin: 999 };

/* ─── 실제 Platform All 메뉴 (Teamper Permission Select용) ── */
const MENU_GROUPS = [
  { key: "home", label: "🏠 홈", menus: [{ key: "dashboard", label: "Dashboard" }, { key: "kpi_widgets", label: "KPI Widget" }, { key: "realtime", label: "실Time 모니터링" }] },
  { key: "ai_marketing", label: "🚀 AI Marketing Auto화", menus: [{ key: "ai_strategy", label: "AI 전략 Create" }, { key: "campaign_manager", label: "Campaign Management" }, { key: "journey_builder", label: "Customer Journey 빌더" }, { key: "ai_prediction", label: "AI Forecast·스코어" }, { key: "budget_planner", label: "Budget 플래너" }] },
  { key: "crm", label: "👤 Customer·CRM", menus: [{ key: "crm_main", label: "Customer CRM" }, { key: "multi_channel", label: "멀티Channel Message" }, { key: "email_marketing", label: "Email Marketing" }, { key: "loyalty", label: "로열티·포인트" }] },
  { key: "commerce", label: "🛒 커머스·물류", menus: [{ key: "order_hub", label: "Orders 허브" }, { key: "product_mgmt", label: "Product Management" }, { key: "wms_manager", label: "WMS 창고 Management" }, { key: "channels", label: "Integration Channel" }] },
  { key: "analytics", label: "📊 Analysis·Performance", menus: [{ key: "performance", label: "퍼포먼스 허브" }, { key: "ai_insights", label: "AI 인사이트" }, { key: "bi_report", label: "BI 리포트" }, { key: "attribution", label: "기여도 Analysis" }] },
  { key: "connectors", label: "🔌 Integration·API", menus: [{ key: "channel_conn", label: "Channel Integration" }, { key: "api_mgmt", label: "API 키 Management" }] },
];

const PLAN_MENU_ACCESS = {
  starter:    ["home", "ai_marketing", "crm"],
  growth:     ["home", "ai_marketing", "crm", "commerce", "analytics"],
  pro:        ["home", "ai_marketing", "crm", "commerce", "analytics", "connectors"],
  enterprise: ["home", "ai_marketing", "crm", "commerce", "analytics", "connectors"],
  admin:      ["home", "ai_marketing", "crm", "commerce", "analytics", "connectors"],
};

/* ── 업그레이드 Modal ─────────────────────────────── */
export function UpgradeModal({ onClose, trigger = "feature" }) {
  const t = useT();
  const PLANS = [
    { id: "starter", label: "Starter", color: "#22c55e", emoji: "🌱", price: "₩49,000", accounts: 5, desc: "소규모 Team Max 5Account" },
    { id: "growth",  label: "Growth",  color: "#4f8ef7", emoji: "📈", price: "₩129,000", accounts: 10, desc: "성장 in progress인 Team Max 10Account" },
    { id: "pro",     label: "Pro",     color: "#a855f7", emoji: "🚀", price: "₩299,000", accounts: 30, desc: "전문 Team Max 30Account" },
    { id: "enterprise", label: "Enterprise", color: "#f59e0b", emoji: "🌐", price: "문의", accounts: 999, desc: "Unlimited · 전담 지원" },
  ];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#0a0f1e)", border:"1px solid rgba(79,142,247,0.3)", borderRadius:20, padding:"32px 28px", width:"min(800px,95vw)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>🚀 Paid Plan으로 업그레이드</div>
            <div style={{ fontSize:12, color:"#7c8fa8", marginTop:6 }}>
              {trigger==="team" ? "👥 Team Workspace는 Paid Plan에서 이용 가능합니다" : "⚡ 이 Feature은 Paid Plan에서 이용 가능합니다"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#7c8fa8", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>

        <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.2)", marginBottom:20, fontSize:12, color:"#93c5fd" }}>
          <b>💡 Demo vs Paid 차이:</b> Demo는 Free·Paid 회원 모두 샘플 데이터로 Screen 체험 가능.
          Paid Payment Done 후 <b style={{ color:"#22c55e" }}>즉시</b> Live Data Integration·Auto화·Team Workspace Activate.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ borderRadius:14, border:`1px solid ${p.color}44`, background:`${p.color}08`, padding:"18px 16px" }}>
              <div style={{ fontSize:22 }}>{p.emoji}</div>
              <div style={{ fontWeight:900, fontSize:15, color:p.color, margin:"6px 0 4px" }}>{p.label}</div>
              <div style={{ fontSize:11, color:"#7c8fa8", marginBottom:8 }}>{p.desc}</div>
              <div style={{ fontSize:20, fontWeight:900, color:"#e2e8f0", marginBottom:12 }}>{p.price}{p.id!=="enterprise" && <span style={{ fontSize:10, color:"#7c8fa8" }}>/월</span>}</div>
              <button onClick={() => p.id!=="enterprise" ? window.location.href=`/pricing?plan=${p.id}` : alert("enterprise@genie-go.com")}
                style={{ width:"100%", padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:12, background:p.id!=="enterprise" ? `linear-gradient(135deg,${p.color},${p.color}cc)` : "rgba(245,158,11,0.2)", color:p.id!=="enterprise" ? "#fff" : p.color }}>
                {p.id!=="enterprise" ? "Payment하기" : "문의하기"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:"#4b5563", marginTop:16 }}>Payment Done 즉시 Apply · 언제든지 Cancel 가능</div>
      </div>
    </div>
  );
}

/* ── Team 메뉴 Permission Select Modal ─────────────── */
function TeamMenuModal({ team, planKey, onClose, onSave }) {
  const allowed = PLAN_MENU_ACCESS[planKey] || [];
  const [selected, setSelected] = useState(team.menu_access || [...allowed]);

  const toggle = (menuKey) => setSelected(s => s.includes(menuKey) ? s.filter(k=>k!==menuKey) : [...s, menuKey]);
  const toggleGroup = (groupKey) => {
    const allIn = MENU_GROUPS.find(g=>g.key===groupKey)?.menus.every(m=>selected.includes(m.key));
    if (allIn) setSelected(s => s.filter(k => !MENU_GROUPS.find(g=>g.key===groupKey)?.menus.map(m=>m.key).includes(k)));
    else setSelected(s => [...new Set([...s, ...(MENU_GROUPS.find(g=>g.key===groupKey)?.menus.map(m=>m.key)||[])])]);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f172a", border:"1px solid rgba(79,142,247,0.3)", borderRadius:16, padding:"24px", width:"min(680px,95vw)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ fontWeight:900, fontSize:16, color:"#e2e8f0", marginBottom:6 }}>🔒 메뉴 접근Permission Settings — {team.name}</div>
        <div style={{ fontSize:11, color:"#7c8fa8", marginBottom:16 }}>
          Current Plan({planKey.toUpperCase()})에서 Allow된 메뉴 in progress 이 Team이 접근할 Count 있는 메뉴를 Select하세요.
        </div>

        <div style={{ display:"grid", gap:8 }}>
          {MENU_GROUPS.map(group => {
            const isAllowed = allowed.includes(group.key);
            if (!isAllowed) return (
              <div key={group.key} style={{ padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.01)", border:"1px solid rgba(255,255,255,0.04)", opacity:0.4 }}>
                <span style={{ fontSize:12, color:"#4b5563" }}>{group.label} — Current Plan 미포함</span>
              </div>
            );
            const allChecked = group.menus.every(m=>selected.includes(m.key));
            const someChecked = group.menus.some(m=>selected.includes(m.key));
            return (
              <div key={group.key} style={{ borderRadius:10, border:"1px solid rgba(79,142,247,0.2)", overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", background:"rgba(79,142,247,0.08)", display:"flex", alignItems:"center", gap:10 }}>
                  <input type="checkbox" checked={allChecked} ref={el => { if(el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={() => toggleGroup(group.key)} style={{ accentColor:"#4f8ef7", width:14, height:14 }} />
                  <span style={{ fontWeight:800, fontSize:13, color:"#e2e8f0" }}>{group.label}</span>
                  <span style={{ fontSize:10, color:"#4f8ef7" }}>({group.menus.filter(m=>selected.includes(m.key)).length}/{group.menus.length})</span>
                </div>
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
        </div>

        <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>Cancel</button>
          <button onClick={() => onSave(selected)} style={{ padding:"9px 24px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color:"#fff" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ── Team원 Register/편집 Modal ─────────────── */
function MemberModal({ teamId, member, onClose, onSave }) {
  const [form, setForm] = useState({
    name: member?.name || "",
    login_id: member?.login_id || member?.email || "",
    password: "",
    email: member?.email || "",
    role: member?.role || "viewer",
  });
  const [msg, setMsg] = useState("");

  const ROLES = { viewer:"뷰어 (읽기전용)", analyst:"Analysis가", editor:"편집자", manager:"Team 매니저" };

  const doSave = () => {
    if (!form.name.trim()) { setMsg("Name을 입력하세요."); return; }
    if (!form.login_id.trim()) { setMsg("로그인 ID를 입력하세요."); return; }
    if (!member && !form.password) { setMsg("Password를 입력하세요."); return; }
    onSave({ ...form, teamId });
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f172a", border:"1px solid rgba(79,142,247,0.3)", borderRadius:16, padding:"28px 24px", width:420 }}>
        <div style={{ fontWeight:900, fontSize:16, color:"#e2e8f0", marginBottom:20 }}>
          {member ? "✏️ Team원 Info Edit" : "➕ Team원 Register"}
        </div>

        {[
          { field:"name", label:"Name *", ph:"John Doe" },
          { field:"login_id", label:"로그인 ID (아이디) *", ph:"hong.gildong" },
          { field:"email", label:"Email", ph:"hong@company.com" },
        ].map(({ field, label, ph }) => (
          <div key={field} style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>{label}</div>
            <input value={form[field]} onChange={e => setForm(p=>({...p,[field]:e.target.value}))} placeholder={ph}
              style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.04)", color:"#e8eaf6", fontSize:13, boxSizing:"border-box", outline:"none" }} />
          </div>
        ))}

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>
            Password {member ? "(Change 시에만 입력)" : "*"}
          </div>
          <input type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))}
            placeholder={member ? "Change하려면 입력" : "6자 이상"}
            style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.04)", color:"#e8eaf6", fontSize:13, boxSizing:"border-box", outline:"none" }} />
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:700, marginBottom:4, textTransform:"uppercase" }}>역할</div>
          <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
            style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"#0a1628", color:"#e8eaf6", fontSize:13 }}>
            {Object.entries(ROLES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {msg && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>{msg}</div>}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={doSave} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color:"#fff" }}>Save</button>
          <button onClick={onClose} style={{ padding:"10px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"#94a3b8", cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Team Card Component ─────────────────── */
function TeamCard({ team, planKey, planColor, onRename, onDelete, onEditMenu, onAddMember, onEditMember, onRemoveMember }) {
  const [showMembers, setShowMembers] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(team.name);

  const menuCount = (team.menu_access || []).length;
  const memberCount = (team.members || []).length;

  return (
    <div style={{ borderRadius:14, border:`1px solid ${planColor}30`, background:`${planColor}05`, overflow:"hidden" }}>
      {/* Team Header */}
      <div style={{ padding:"14px 18px", background:`${planColor}10`, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:16 }}>🏢</div>
        {editingName ? (
          <input value={nameVal} onChange={e=>setNameVal(e.target.value)} autoFocus
            onBlur={() => { setEditingName(false); if(nameVal.trim()) onRename(team.id, nameVal.trim()); else setNameVal(team.name); }}
            onKeyDown={e => { if(e.key==="Enter") { setEditingName(false); onRename(team.id, nameVal.trim()); } if(e.key==="Escape") { setEditingName(false); setNameVal(team.name); } }}
            style={{ flex:1, padding:"5px 8px", borderRadius:6, border:"1px solid rgba(79,142,247,0.5)", background:"rgba(15,23,42,0.8)", color:"#e2e8f0", fontSize:14, fontWeight:800, outline:"none" }} />
        ) : (
          <span style={{ flex:1, fontWeight:900, fontSize:15, color:"#e2e8f0", cursor:"pointer" }} onDoubleClick={()=>setEditingName(true)}>{team.name}</span>
        )}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#7c8fa8" }}>메뉴 {menuCount}개</span>
          <span style={{ fontSize:10, color:"#7c8fa8" }}>·</span>
          <span style={{ fontSize:10, color:"#7c8fa8" }}>Team원 {memberCount}명</span>
        </div>
        <button onClick={()=>setEditingName(true)} title="Team명 Edit" style={{ padding:"3px 8px", borderRadius:5, border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:10 }}>✏️ NameEdit</button>
        <button onClick={()=>onEditMenu(team)} title="메뉴접근Permission" style={{ padding:"3px 8px", borderRadius:5, border:`1px solid ${planColor}44`, background:`${planColor}10`, color:planColor, cursor:"pointer", fontSize:10, fontWeight:700 }}>🔒 PermissionSettings</button>
        <button onClick={()=>onDelete(team.id)} title="Team Delete" style={{ padding:"3px 8px", borderRadius:5, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.06)", color:"#ef4444", cursor:"pointer", fontSize:10 }}>🗑</button>
      </div>

      {/* 메뉴 접근Permission 뱃지 */}
      {(team.menu_access||[]).length > 0 && (
        <div style={{ padding:"8px 18px", display:"flex", flexWrap:"wrap", gap:4, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
          {(team.menu_access||[]).map(mk => {
            const g = MENU_GROUPS.find(g=>g.menus.some(m=>m.key===mk));
            const m = g?.menus.find(m=>m.key===mk);
            return m ? (
              <span key={mk} style={{ fontSize:9, padding:"2px 7px", borderRadius:99, fontWeight:700, background:`${planColor}15`, border:`1px solid ${planColor}30`, color:planColor }}>{m.label}</span>
            ) : null;
          })}
        </div>
      )}

      {/* Team원 섹션 */}
      <div style={{ padding:"10px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <button onClick={()=>setShowMembers(s=>!s)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:12, fontWeight:700, padding:0 }}>
            {showMembers ? "▼" : "▶"} Team원 List ({memberCount}명)
          </button>
          <button onClick={()=>onAddMember(team)} style={{ padding:"4px 12px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:700, fontSize:11, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color:"#fff" }}>+ Team원 Register</button>
        </div>

        {showMembers && (
          <div style={{ display:"grid", gap:4 }}>
            {(team.members||[]).length === 0 ? (
              <div style={{ textAlign:"center", color:"#4b5563", fontSize:11, padding:"16px 0" }}>Register된 Team원이 없습니다</div>
            ) : (team.members||[]).map(mb => (
              <div key={mb.id} style={{ display:"grid", gridTemplateColumns:"1fr 100px 120px auto auto", gap:8, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{mb.name}</div>
                  <div style={{ fontSize:10, color:"#64748b" }}>ID: {mb.login_id || mb.email}</div>
                </div>
                <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:700, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", color:"#d8b4fe", textAlign:"center" }}>{mb.role}</span>
                <div style={{ fontSize:10, color:"#64748b" }}>{mb.email || ""}</div>
                <button onClick={()=>onEditMember(team, mb)} style={{ padding:"4px 8px", borderRadius:5, border:"1px solid rgba(79,142,247,0.3)", background:"rgba(79,142,247,0.08)", color:"#4f8ef7", cursor:"pointer", fontSize:10 }}>Edit</button>
                <button onClick={()=>onRemoveMember(team.id, mb.id)} style={{ padding:"4px 8px", borderRadius:5, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.06)", color:"#ef4444", cursor:"pointer", fontSize:10 }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 메인 TeamWorkspace ──────────────────── */
export default function TeamWorkspace() {
  const { user, token, plan } = useAuth();
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

  /* 서버 Integration or 로컬 Status Management */
  const loadTeams = useCallback(async () => {
    if (!isPaidPlan) return;
    try {
      const r = await fetch(`${API}/v423/workspace/teams`, { headers: { Authorization:`Bearer ${token}` } });
      const d = await r.json();
      if (d.ok) setTeams(d.teams || []);
      else {
        // Demo 데이터 (API 없을 때)
        setTeams([
          { id:1, name:"MarketingTeam", menu_access:["ai_strategy","campaign_manager","crm_main"], members:[
            { id:1, name:"김마케터", login_id:"kim.mkt", email:"kim@co.com", role:"manager" },
            { id:2, name:"이Analysis가", login_id:"lee.ana", email:"lee@co.com", role:"analyst" },
          ]},
          { id:2, name:"운영Team", menu_access:["order_hub","product_mgmt","wms_manager"], members:[] },
        ]);
      }
    } catch { setTeams([]); }
  }, [token, isPaidPlan]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  /* Team Create */
  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: Date.now(), name: newTeamName.trim(), menu_access: PLAN_MENU_ACCESS[plan] || [], members: [] };
    try {
      const r = await fetch(`${API}/v423/workspace/teams`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ name: newTeamName.trim(), menu_access: newTeam.menu_access }),
      });
      const d = await r.json();
      if (d.ok) { setTeams(t=>[...t, {...newTeam, id:d.team_id}]); }
      else setTeams(t=>[...t, newTeam]);
    } catch { setTeams(t=>[...t, newTeam]); }
    setNewTeamName("");
    showFeedback(`✅ "${newTeamName.trim()}" Team이 Create되었습니다.`);
  };

  /* Team명 Change */
  const renameTeam = async (teamId, newName) => {
    setTeams(ts => ts.map(t => t.id===teamId ? {...t, name:newName} : t));
    try { await fetch(`${API}/v423/workspace/teams/${teamId}`, { method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify({name:newName}) }); } catch {}
    showFeedback("✅ Team명이 Change되었습니다.");
  };

  /* Team Delete */
  const deleteTeam = async (teamId) => {
    if (!window.confirm("이 Team을 Delete하시겠습니까? Team원 Info도 함께 Delete됩니다.")) return;
    setTeams(ts => ts.filter(t => t.id!==teamId));
    try { await fetch(`${API}/v423/workspace/teams/${teamId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} }); } catch {}
    showFeedback("🗑 Team이 Delete되었습니다.", "warn");
  };

  /* 메뉴 Permission Save */
  const saveMenuAccess = async (menuKeys) => {
    const teamId = menuModal.id;
    setTeams(ts => ts.map(t => t.id===teamId ? {...t, menu_access:menuKeys} : t));
    try { await fetch(`${API}/v423/workspace/teams/${teamId}/menu`, { method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify({menu_access:menuKeys}) }); } catch {}
    setMenuModal(null);
    showFeedback("✅ 메뉴 접근Permission이 Save되었습니다.");
  };

  /* Team원 Save */
  const saveMember = async ({ teamId, name, login_id, password, email, role }) => {
    const editingMember = memberModal?.member;
    const newMember = { id: Date.now(), name, login_id, email, role };
    if (editingMember) {
      setTeams(ts => ts.map(t => t.id===teamId ? {...t, members:(t.members||[]).map(m=>m.id===editingMember.id ? {...m, name, login_id, email, role} : m)} : t));
    } else {
      if (usedAccounts >= maxAccounts) { showFeedback(`❌ Account 한도 초과 (Max ${maxAccounts}Account)`, "err"); return; }
      setTeams(ts => ts.map(t => t.id===teamId ? {...t, members:[...(t.members||[]), newMember]} : t));
    }
    try {
      const path = editingMember ? `${API}/v423/workspace/members/${editingMember.id}` : `${API}/v423/workspace/members`;
      await fetch(path, { method: editingMember ? "PATCH" : "POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body: JSON.stringify({team_id:teamId, name, login_id, password, email, role}) });
    } catch {}
    setMemberModal(null);
    showFeedback(editingMember ? "✅ Team원 Info가 Edit되었습니다." : "✅ Team원이 Register되었습니다.");
  };

  /* Team원 Delete */
  const removeMember = async (teamId, memberId) => {
    if (!window.confirm("이 Team원을 Delete하시겠습니까?")) return;
    setTeams(ts => ts.map(t => t.id===teamId ? {...t, members:(t.members||[]).filter(m=>m.id!==memberId)} : t));
    try { await fetch(`${API}/v423/workspace/members/${memberId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} }); } catch {}
    showFeedback("🗑 Team원이 Delete되었습니다.", "warn");
  };

  /* Free User → 업그레이드 유도 */
  if (!isPaidPlan) {
    return (
      <div style={{ padding:"60px 20px", textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>👥</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#e2e8f0", marginBottom:8 }}>Team Workspace</div>
        <div style={{ fontSize:13, color:"#7c8fa8", marginBottom:24 }}>Team/부서를 만들고, 메뉴 접근Permission을 부여하며, Team원을 Register하세요.</div>
        <div style={{ padding:"16px 20px", borderRadius:12, background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.2)", maxWidth:480, margin:"0 auto 24px", textAlign:"left" }}>
          <div style={{ fontWeight:700, color:"#93c5fd", marginBottom:8 }}>💡 현재 Demo 버전</div>
          <div style={{ fontSize:12, color:"#7c8fa8", lineHeight:1.7 }}>
            • 모든 Screen을 <b style={{color:"#e2e8f0"}}>샘플 데이터</b>로 체험할 Count 있습니다<br/>
            • Team Workspace, Live Data Integration은 Paid Plan에서 가능합니다<br/>
            • Paid Payment Done 시 <b style={{color:"#22c55e"}}>즉시</b> 모든 Feature이 Activate됩니다
          </div>
        </div>
        <button onClick={()=>setShowUpgrade(true)} style={{ padding:"14px 36px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:900, fontSize:15, background:"linear-gradient(135deg,#4f8ef7,#a855f7)", color:"#fff", boxShadow:"0 6px 24px rgba(79,142,247,0.4)" }}>
          🚀 Paid Plan 보기 & Payment
        </button>
        {showUpgrade && <UpgradeModal trigger="team" onClose={()=>setShowUpgrade(false)} />}
      </div>
    );
  }

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* Modal */}
      {menuModal && <TeamMenuModal team={menuModal} planKey={plan} onClose={()=>setMenuModal(null)} onSave={saveMenuAccess} />}
      {memberModal && <MemberModal teamId={memberModal.team.id} member={memberModal.member} onClose={()=>setMemberModal(null)} onSave={saveMember} />}

      {/* Header */}
      <div style={{ padding:"16px 20px", borderRadius:14, background:"linear-gradient(135deg,rgba(79,142,247,0.1),rgba(168,85,247,0.08))", border:"1px solid rgba(79,142,247,0.25)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:16, display:"flex", alignItems:"center", gap:8 }}>
            👥 Team Workspace
            <span style={{ fontSize:10, padding:"2px 10px", borderRadius:99, fontWeight:700, background:`${planColor}18`, border:`1px solid ${planColor}33`, color:planColor }}>{plan.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:11, color:"#7c8fa8", marginTop:4 }}>
            {user?.company || user?.name} · Account {usedAccounts}/{maxAccounts}개 사용 in progress · Platform Management자와 독립 운영
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color: usedAccounts>=maxAccounts ? "#ef4444" : "#22c55e" }}>
            {maxAccounts-usedAccounts}Account 남음
          </div>
          {usedAccounts>=maxAccounts && (
            <button onClick={()=>setShowUpgrade(true)} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${planColor}44`, background:`${planColor}10`, color:planColor, cursor:"pointer", fontSize:11, fontWeight:700 }}>
              Upgrade Plan
            </button>
          )}
        </div>
      </div>

      {/* Notification */}
      {msg.text && (
        <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700, background:msg.type==="ok"?"rgba(34,197,94,0.1)":msg.type==="warn"?"rgba(234,179,8,0.08)":"rgba(239,68,68,0.1)", border:`1px solid ${msg.type==="ok"?"rgba(34,197,94,0.3)":msg.type==="warn"?"rgba(234,179,8,0.3)":"rgba(239,68,68,0.3)"}`, color:msg.type==="ok"?"#22c55e":msg.type==="warn"?"#fbbf24":"#ef4444" }}>
          {msg.text}
        </div>
      )}

      {/* 안내 */}
      <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", fontSize:11, color:"#86efac" }}>
        ✅ <b>Paid Plan Activate</b> — Live Data Integration·Auto화 All 사용 가능 · Teamper 메뉴 Permission을 따로 Settings하고 Team원에게 per도 아이디/Password를 부여하세요
      </div>

      {/* Team Create */}
      <div style={{ padding:"14px 18px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:10, alignItems:"center" }}>
        <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="Team/부서명 입력 (예: MarketingTeam, 영업부, 운영Team)"
          onKeyDown={e=>e.key==="Enter" && createTeam()}
          style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.04)", color:"#e8eaf6", fontSize:13, outline:"none" }} />
        <button onClick={createTeam} disabled={!newTeamName.trim()} style={{ padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:800, fontSize:13, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", color:"#fff", opacity:newTeamName.trim()?1:0.5 }}>
          + Team Create
        </button>
      </div>

      {/* Team List */}
      {teams.length === 0 ? (
        <div style={{ textAlign:"center", color:"#4b5563", fontSize:13, padding:"40px 0" }}>
          아직 Create된 Team이 없습니다. 위에서 Team/부서명을 입력하고 Create하세요.
        </div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              planKey={plan}
              planColor={planColor}
              onRename={renameTeam}
              onDelete={deleteTeam}
              onEditMenu={setMenuModal}
              onAddMember={(t) => setMemberModal({team:t, member:null})}
              onEditMember={(t, m) => setMemberModal({team:t, member:m})}
              onRemoveMember={removeMember}
            />
          ))}
        </div>
      )}

      {/* Subscription Info */}
      <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:"#64748b" }}>
          플랜: <b style={{color:planColor}}>{plan.toUpperCase()}</b> · Max {maxAccounts}Account · Team Count Limit None
        </div>
        <button onClick={()=>window.location.href="/pricing"} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${planColor}44`, background:`${planColor}08`, color:planColor, cursor:"pointer", fontSize:11, fontWeight:700 }}>
          플랜 Change →
        </button>
      </div>

      {showUpgrade && <UpgradeModal trigger="upgrade" onClose={()=>setShowUpgrade(false)} />}
    </div>
  );
}

import { useI18n } from '../i18n/index.js';
import { useT } from '../i18n/index.js';