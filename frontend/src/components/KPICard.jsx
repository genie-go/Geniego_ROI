import React from "react";

export default function KPICard({ title, value, subtitle, right }) {
  return (
    <div className="card glass tilt">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="sub" style={{ letterSpacing: 0.4 }}>{title}</div>
          <div className="kpi">{value}</div>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
        {right ? <div style={{ width: 90, opacity: 0.9 }}>{right}</div> : null}
      </div>
    </div>
  );
}
