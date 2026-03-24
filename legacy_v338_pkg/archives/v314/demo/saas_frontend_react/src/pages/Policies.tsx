import React from "react";

export default function Policies() {
  const rows = [
    { policy:"spend_cap", rule:"daily_budget <= plan_cap", action:"block/require_approval" },
    { policy:"margin_guardrail", rule:"margin >= 20%", action:"block_ads_if_below" },
    { policy:"approval_required", rule:"budget_increase >= 20%", action:"finance_approval" },
  ];
  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>Policies</h2>
        <div className="small">정책은 자동화 실행 전 반드시 통과해야 합니다(데모).</div>
      </div>
      <div className="card span12">
        <table className="table">
          <thead><tr><th>policy</th><th>rule</th><th>action</th></tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.policy}><td>{r.policy}</td><td>{r.rule}</td><td>{r.action}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
