import React, { useEffect, useMemo, useState } from "react";
import { getJson, postJson, putJson } from "../services/apiClient";

import { useT } from '../i18n/index.js';
// Simple HTML5 drag/drop mapping editor (no external deps)
const INTERNAL_FIELDS = [
  "sku","title","description","brand","category","price","currency","stock",
  "attributes.color","attributes.size","attributes.material",
  "images"
];

const CHANNEL_PRESETS = {
  shopee: ["item_name","description","category_id","item_sku","price_info.original_price","stock_info.stock","image.image_url_list"],
  qoo10: ["SecondSubCat","ItemTitle","SellerCode","ItemPrice","ItemQty","ItemDescription","StandardImage","BrandNo","ShippingNo","ExpireDate"],
  rakuten: ["item_code","item_name","price","item_description","xml_body"],
  amazon: ["productType","attributes.item_name","attributes.brand","attributes.product_description","attributes.purchasable_offer","attributes.fulfillment_availability"]
};

function DraggableField({ name }) {
  return (
    <div
      draggable
      onDragStart={(e)=>{ e.dataTransfer.setData("text/plain", name); }} style={{ padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 10, marginBottom: 8, background: "white", cursor: "grab" }}
      title="drag"
    >
      {name}
    </div>
  );
}

function DropZone({ onDrop, children }) {
  return (
    <div
      onDragOver={(e)=>e.preventDefault()}
      onDrop={(e)=>{ e.preventDefault(); const v = e.dataTransfer.getData("text/plain"); if (v) onDrop(v); }} style={{ minHeight: 120, padding: 12, border: "1px dashed #cfcfcf", borderRadius: 14, background: "#fafafa" }}
    >
      {children}
    </div>
  );
}

export default function RulesEditorV2(){
  const t = useT();
  const [channel, setChannel] = useState("shopee");
  const [draftId, setDraftId] = useState(null);
  const [meta, setMeta] = useState(null);
  const [mapping, setMapping] = useState({});
  const [msg, setMsg] = useState("");

  const channelFields = useMemo(()=> CHANNEL_PRESETS[channel] || [], [channel]);

  async function refreshMeta(){
    const d = await getJson(`/v395/templates/v2/${channel}/versions`);
    setMeta(d.meta);
  }

  async function loadCurrentAsLocal(){
    const d = await getJson(`/v395/templates/v2/${channel}/current`);
    const text = d.text || "";
    // naive parse mapping block if present (YAML-ish): we only support mapping: {a:b} like lines
    const map = {};
    const lines = text.split("\n");
    let inMap = false;
    for (const ln of lines){
      if (ln.trim() === "mapping:" ){ inMap = true; continue; }
      if (inMap){
        if (!ln.startsWith("  ")) { break; }
        const m = ln.trim().match(/^([^:]+):\s*(.+)\s*$/);
        if (m) map[m[1].trim()] = m[2].trim();
      }
    }
    setMapping(Object.keys(map).length ? map : {});
  }

  useEffect(()=>{
    refreshMeta().catch(()=>{});
    loadCurrentAsLocal().catch(()=>{});
  }, [channel]);

  function addMapping(src){
    const dst = prompt(`'${src}' 를 어떤 Channel 필드로 매핑할까요?`, channelFields[0] || "");
    if (!dst) return;
    setMapping((m)=> ({...m, [src]: dst}));
  }

  function editDst(src){
    const dst = prompt(`'${src}' 의 목적지(Channel 필드)를 Edit하세요`, mapping[src] || "");
    if (!dst) return;
    setMapping((m)=> ({...m, [src]: dst}));
  }

  function remove(src){
    const n = {...mapping};
    delete n[src];
    setMapping(n);
  }

  function buildYaml(){
    // minimal YAML: preserve existing non-mapping parts is out-of-scope; we generate a clean template draft.
    const req = ["sku","title","price","currency"];
    return [
      `channel: ${channel}`,
      `template_rev: v395`,
      `required_fields:`,
      ...req.map(x=>`  - ${x}`),
      `mapping:`,
      ...Object.entries(mapping).map(([k,v])=>`  ${k}: ${v}`),
      `transforms:`,
      `  StandardImage:`,
      `    type: images_to_url_list`,
      `  image.image_url_list:`,
      `    type: images_to_url_list`,
      ""
    ].join("\n");
  }

  async function createDraft(){
    const d = await postJson(`/v395/templates/v2/${channel}/drafts`, { created_by: "admin" });
    setDraftId(d.draft.id);
    setMsg(`Draft Create: ${d.draft.id}`);
  }

  async function saveDraft(){
    if (!draftId){ setMsg("Draft 먼저 Create하세요."); return; }
    const text = buildYaml();
    await putJson(`/v395/templates/v2/${channel}/drafts/${draftId}`, { text, updated_by: "admin" });
    setMsg(`Draft Save: ${draftId}`);
    await refreshMeta();
  }

  async function submit(){
    if (!draftId) return;
    await postJson(`/v395/templates/v2/${channel}/drafts/${draftId}/submit`, { user: "admin" });
    setMsg(`제출됨: ${draftId}`);
    await refreshMeta();
  }

  async function approve(){
    if (!draftId) return;
    await postJson(`/v395/templates/v2/${channel}/drafts/${draftId}/approve`, { user: "admin" });
    setMsg(`Approved: ${draftId}`);
    await refreshMeta();
  }

  async function publish(){
    if (!draftId) return;
    await postJson(`/v395/templates/v2/${channel}/drafts/${draftId}/publish`, { user: "admin" });
    setMsg(`배포됨(현재 Apply): ${draftId}`);
    await refreshMeta();
    await loadCurrentAsLocal();
  }

  return (
    <div className="container">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Rules Editor v2 (드래그&드롭 + 버전/Approval/배포)</div>
          <div className="sub" style={{ marginTop: 6 }}>Channelper 속성 매핑 Rule을 쉽고 안전하게 편집합니다. (V395)</div>
        </div>
        <div style={{ display:"flex", gap: 8, alignItems:"center" }}>
          <select value={channel} onChange={(e)=>{ setDraftId(null); setChannel(e.target.value); }} style={{ padding:"8px 10px", borderRadius: 10 }}>
            <option value="shopee">Shopee</option>
            <option value="qoo10">Qoo10</option>
            <option value="rakuten">Rakuten</option>
            <option value="amazon">Amazon</option>
          </select>
          <button className="btn" onClick={createDraft}>Draft Create</button>
          <button className="btn" onClick={saveDraft}>Save</button>
          <button className="btn" onClick={submit}>제출</button>
          <button className="btn" onClick={approve}>Approval</button>
          <button className="btn" onClick={publish}>배포</button>
        </div>
      </div>

      {msg ? <div className="card" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div style={{ marginTop: 14, display:"grid", gridTemplateColumns:"1fr 2fr", gap: 14 }}>
        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>내부 필드 (드래그)</div>
          {INTERNAL_FIELDS.map((f)=> <DraggableField key={f} name={f} />)}
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>매핑 (드롭)</div>
          <DropZone onDrop={addMapping}>
            {Object.keys(mapping).length === 0 ? (
              <div className="sub">여기로 내부 필드를 드래그해서 매핑을 Add하세요.</div>
            ) : null}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap: 10, marginTop: 6 }}>
              <div style={{ fontWeight: 700 }}>Source</div>
              <div style={{ fontWeight: 700 }}>Destination</div>
              <div />
              {Object.entries(mapping).map(([src,dst])=>(
                <React.Fragment key={src}>
                  <div style={{ padding:"8px 10px", border:"1px solid #eee", borderRadius: 10 }}>{src}</div>
                  <div onClick={()=>editDst(src)} style={{ padding:"8px 10px", border:"1px solid #eee", borderRadius: 10, cursor:"pointer" }} title="Clicks하여 Edit">{dst}</div>
                  <button className="btn" onClick={()=>remove(src)}>Delete</button>
                </React.Fragment>
              ))}
            </div>
          </DropZone>

          <div style={{ marginTop: 14 }} className="sub">
            Draft ID: <b>{draftId || "-"}</b> / Published: <b>{meta?.current_published || "-"}</b>
          </div>
        </div>
      </div>
    </div>
  
  );
}
