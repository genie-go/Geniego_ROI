import React from "react";
import { useApp } from "../state";
import { loadJson } from "../data";
import { DataTable } from "../components/DataTable";

type Campaign = any;

export default function Ads() {
  const { tenant, has } = useApp();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    loadJson<Campaign[]>("//sample_data/_ads_campaigns.json").then(setCampaigns);
  }, []);

  const my = campaigns.filter(c => c.tenant_id === tenant?.tenant_id);

  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>Ads Hub</h2>
        <div className="small">실시간 제어는 정책/승인/감사로그 기반으로 통제됩니다(데모).</div>
        {toast && <div className="badge" style={{marginTop:10}}>{toast}</div>}
      </div>

      <div className="card span12">
        <DataTable
          rows={my}
          rowKey={(r)=>r.campaign_id}
          searchKeys={["campaign_id","provider","status"]}
          columns={[
            { key:"campaign_id", label:"Campaign" },
            { key:"provider", label:"Provider" },
            { key:"status", label:"Status" },
            { key:"daily_budget", label:"Daily Budget", render:(v,row)=>`${v} ${row.currency}` },
            { key:"roas", label:"ROAS" },
          ]}
          bulkActions={[
            { label:"대량 Pause 요청", kind:"danger", onRun:(sel)=>{
              if(!has("ads:write")) { setToast("권한이 없습니다(ads:write)."); return; }
              setToast(`Pause 요청 생성: ${sel.length}건 (승인함에서 처리)`);
            }},
            { label:"예산 변경 요청(+10%)", kind:"primary", onRun:(sel)=>{
              if(!has("ads:write")) { setToast("권한이 없습니다(ads:write)."); return; }
              setToast(`예산 변경 요청 생성: ${sel.length}건 (+10%) (승인함에서 처리)`);
            }},
          ]}
        />
      </div>
    </div>
  );
}
