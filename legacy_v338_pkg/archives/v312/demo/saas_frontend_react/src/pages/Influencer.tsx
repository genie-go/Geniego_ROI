import React from "react";
import { loadJson } from "../data";
import { DataTable } from "../components/DataTable";

type Creator = any;

export default function Influencer() {
  const [creators, setCreators] = React.useState<Creator[]>([]);
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    loadJson<Creator[]>("//sample_data/_influencers.json").then(setCreators);
  }, []);

  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>Influencer Hub</h2>
        {toast && <div className="badge" style={{marginTop:10}}>{toast}</div>}
      </div>
      <div className="card span12">
        <DataTable
          rows={creators}
          rowKey={(r)=>r.creator_id}
          searchKeys={["name","platform"]}
          columns={[
            { key:"creator_id", label:"ID" },
            { key:"name", label:"Creator" },
            { key:"platform", label:"Platform" },
            { key:"followers", label:"Followers" },
            { key:"engagement_rate", label:"Engagement" },
            { key:"category", label:"Category", render:(v)=> (v||[]).join(", ") },
          ]}
          bulkActions={[
            { label:"캠페인 제안서 생성(데모)", kind:"primary", onRun:(sel)=>setToast(`제안서 생성: ${sel.length}명 (데모)`) },
          ]}
        />
      </div>
    </div>
  );
}
