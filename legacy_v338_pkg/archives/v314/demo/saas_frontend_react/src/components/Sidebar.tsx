import { NavLink } from "react-router-dom";
import { useApp } from "../state";

type Item = { to: string; label: string; perm: Parameters<ReturnType<typeof useApp>["has"]>[0] };

export function Sidebar() {
  const { tenant, user, has } = useApp();
  const items: Item[] = [
    { to: "/", label: "Overview", perm: "overview:read" },
    { to: "/commerce", label: "Commerce Hub", perm: "commerce:read" },
    { to: "/ads", label: "Ads Hub", perm: "ads:read" },
    { to: "/influencer", label: "Influencer Hub", perm: "influencer:read" },
    { to: "/approvals", label: "승인함", perm: "approvals:read" },
    { to: "/analytics", label: "Analytics", perm: "analytics:read" },
    { to: "/policies", label: "Policies", perm: "policies:read" },
    { to: "/admin", label: "Admin", perm: "admin:read" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">GENIE_ROI V311 Demo</div>
      <div className="small">Tenant: <b>{tenant?.name ?? "Loading…"}</b></div>
      <div className="small">User: <b>{user.name}</b></div>
      <div className="nav">
        {items.filter(i => has(i.perm)).map(i => (
          <NavLink key={i.to} to={i.to} className={({isActive}) => isActive ? "active" : ""}>
            {i.label}
          </NavLink>
        ))}
      </div>
      <div style={{marginTop:14}} className="small">
        <div>Tip: <span className="kbd">/</span> 로 검색 포커스</div>
      </div>
    </aside>
  );
}
