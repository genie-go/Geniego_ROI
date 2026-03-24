import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state";
import { DEMO_USERS } from "../data";

export function Topbar({ onStartTour }: { onStartTour: () => void }) {
  const { tenants, tenant, setTenantId, user, setUser } = useApp();
  const [q, setQ] = React.useState("");
  const nav = useNavigate();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.target as any)?.tagName !== "INPUT") {
        e.preventDefault();
        const el = document.getElementById("globalSearch") as HTMLInputElement | null;
        el?.focus();
      }
      if (e.key === "Enter" && q.trim().length > 0) {
        // simple routing heuristic for demo
        const s = q.toLowerCase();
        if (s.includes("order") || s.includes("주문")) nav("/commerce");
        else if (s.includes("campaign") || s.includes("광고")) nav("/ads");
        else if (s.includes("승인") || s.includes("approval")) nav("/approvals");
        else nav("/analytics");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, nav]);

  return (
    <div className="topbar">
      <div className="toolbar">
        <select className="input" style={{width:220}} value={tenant?.tenant_id ?? ""} onChange={(e)=>setTenantId(e.target.value)}>
          {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.region})</option>)}
        </select>
        <select className="input" style={{width:220}} value={user.id} onChange={(e)=>{
          const u = DEMO_USERS.find(x => x.id === e.target.value);
          if (u) setUser(u);
        }}>
          {DEMO_USERS.map(u => <option key={u.id} value={u.id}>{u.name} ({u.roleId})</option>)}
        </select>
        <input id="globalSearch" className="input" style={{width:360}} value={q} onChange={e=>setQ(e.target.value)}
               placeholder='검색… 예: "주문", "캠페인", "승인"' />
      </div>
      <div className="toolbar">
        <button className="btn" onClick={()=>onStartTour()}>가이드 투어</button>
      </div>
    </div>
  );
}
