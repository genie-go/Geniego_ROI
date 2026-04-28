import React from "react";
import { useApp } from "../state";
import { _APPROVALS } from "../data";
import { DataTable } from "../components/DataTable";
import type { Approval } from "../types";

export default function Approvals() {
  const { tenant, has } = useApp();
  const [rows, setRows] = React.useState<Approval[]>(_APPROVALS);
  const [toast, setToast] = React.useState("");

  const my = rows.filter(r => r.tenantId === tenant?.tenant_id);

  const approve = (selected: Approval[]) => {
    if(!has("approvals:write")) { setToast("권한이 없습니다(approvals:write)."); return; }
    const ids = new Set(selected.map(s=>s.id));
    setRows(r => r.map(x => ids.has(x.id) ? {...x, status:"APPROVED"} : x));
    setToast(`승인 처리: ${selected.length}건`);
  };

  const reject = (selected: Approval[]) => {
    if(!has("approvals:write")) { setToast("권한이 없습니다(approvals:write)."); return; }
    const ids = new Set(selected.map(s=>s.id));
    setRows(r => r.map(x => ids.has(x.id) ? {...x, status:"REJECTED"} : x));
    setToast(`반려 처리: ${selected.length}건`);
  };

  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>승인함</h2>
        <div className="small">정책 기반 자동화는 승인함을 통해 안전하게 운영됩니다(데모).</div>
        {toast && <div className="badge" style={{marginTop:10}}>{toast}</div>}
      </div>
      <div className="card span12">
        <DataTable
          rows={my}
          rowKey={(r)=>r.id}
          searchKeys={["title","type","status"]}
          columns={[
            { key:"status", label:"Status" },
            { key:"type", label:"Type" },
            { key:"title", label:"Title" },
            { key:"requestedBy", label:"Requested By" },
            { key:"createdAt", label:"Created" },
          ]}
          bulkActions={[
            { label:"승인", kind:"primary", onRun:approve },
            { label:"반려", kind:"danger", onRun:reject },
          ]}
        />
      </div>
    </div>
  );
}
