import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const DEFAULT_TENANT = import.meta.env.VITE_TENANT_ID || "-tenant";
const DEFAULT_KEY = import.meta.env.VITE_API_KEY || "";

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json", "X-Tenant-ID": DEFAULT_TENANT };
  if (DEFAULT_KEY) headers["X-API-Key"] = DEFAULT_KEY;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

function Card({ title, children, right }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, marginBottom: 12, background: "white" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom: 10 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: active ? "1px solid #111827" : "1px solid #e5e7eb",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        fontWeight: 700
      }}
    >
      {children}
    </button>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"6px 0", borderBottom:"1px solid #f3f4f6" }}>
      <div style={{ color:"#6b7280" }}>{k}</div>
      <div style={{ fontWeight:700, textAlign:"right" }}>{String(v)}</div>
    </div>
  );
}

// ---------- V287 UX: Segment Rule Builder (AND/OR groups) ----------
function SegmentBuilder({ value, onChange }) {
  const def = value || { op: "AND", conditions: [], event_conditions: [] };

  function update(next) {
    onChange({ ...def, ...next });
  }

  function addCond() {
    update({ conditions: [...def.conditions, { field: "attrs.intent", operator: "EQ", value: "high" }] });
  }
  function addEvent() {
    update({ event_conditions: [...def.event_conditions, { event_type: "product_view", within_days: 7 }] });
  }

  return (
    <div style={{ display:"grid", gap:10 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ fontWeight:700 }}>Group operator</div>
        <select value={def.op} onChange={(e)=>update({ op: e.target.value })} style={{ padding:8, borderRadius:10, border:"1px solid #e5e7eb" }}>
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button onClick={addCond} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"white", fontWeight:700 }}>+ Condition</button>
        <button onClick={addEvent} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"white", fontWeight:700 }}>+ Event</button>
      </div>

      <Card title="Conditions">
        <div style={{ display:"grid", gap:8 }}>
          {def.conditions.map((c, idx) => (
            <div key={idx} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8 }}>
              <input value={c.field} onChange={(e)=>{
                const next=[...def.conditions]; next[idx]={...next[idx], field:e.target.value}; update({conditions: next});
              }} style={{ padding:8, borderRadius:10, border:"1px solid #e5e7eb" }} />
              <select value={c.operator} onChange={(e)=>{
                const next=[...def.conditions]; next[idx]={...next[idx], operator:e.target.value}; update({conditions: next});
              }} style={{ padding:8, borderRadius:10, border:"1px solid #e5e7eb" }}>
                <option value="EQ">EQ</option>
                <option value="NEQ">NEQ</option>
                <option value="GTE">GTE</option>
                <option value="LTE">LTE</option>
                <option value="CONTAINS">CONTAINS</option>
              </select>
              <input value={String(c.value ?? "")} onChange={(e)=>{
                const next=[...def.conditions]; next[idx]={...next[idx], value:e.target.value}; update({conditions: next});
              }} style={{ padding:8, borderRadius:10, border:"1px solid #e5e7eb" }} />
              <button onClick={()=>{
                const next=[...def.conditions]; next.splice(idx,1); update({conditions: next});
              }} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #fee2e2", background:"#fff1f2", fontWeight:800 }}>×</button>
            </div>
          ))}
          {def.conditions.length===0 && <div style={{ color:"#6b7280" }}>No conditions yet.</div>}
        </div>
      </Card>

      <Card title="Event conditions">
        <div style={{ display:"grid", gap:8 }}>
          {def.event_conditions.map((e, idx) => (
            <div key={idx} style={{ display:"grid", gridTemplateColumns:"2fr 1fr auto", gap:8 }}>
              <input value={e.event_type} onChange={(ev)=>{
                const next=[...def.event_conditions]; next[idx]={...next[idx], event_type: ev.target.value}; update({event_conditions: next});
              }} style={{ padding:8, borderRadius:10, border:"1px solid #e5e7eb" }} />
              <input type="number" value={e.within_days} onChange={(ev)=>{
                const next=[...def.event_conditions]; next[idx]={...next[idx], within_days: Number(ev.target.value)}; update({event_conditions: next});
              }} style={{ padding:8, borderRadius:10, border:"1px solid #e5e7eb" }} />
              <button onClick={()=>{
                const next=[...def.event_conditions]; next.splice(idx,1); update({event_conditions: next});
              }} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #fee2e2", background:"#fff1f2", fontWeight:800 }}>×</button>
            </div>
          ))}
          {def.event_conditions.length===0 && <div style={{ color:"#6b7280" }}>No event conditions yet.</div>}
        </div>
      </Card>

      <Card title="Definition JSON (preview)">
        <pre style={{ margin:0, background:"#0b1220", color:"white", padding:12, borderRadius:12, overflow:"auto" }}>
          {JSON.stringify(def, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

// ---------- V287 UX: Template editor + variable browser ----------
const VAR_SNIPPETS = [
  "{{.email}}",
  "{{.contact_id}}",
  "{{default "friend" .attrs.name}}",
  "{{upper (default "" .attrs.name)}}",
  "{{.attrs.cart_value}}",
  "{{urlquery (default "" .attrs.coupon)}}",
];

function TemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("welcome_a");
  const [subject, setSubject] = useState("Hi {{upper .email}}");
  const [body, setBody] = useState("Hello {{default "friend" .attrs.name}}");
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    try { setTemplates(await api("/v1/templates")); } catch(e){ setErr(e.message); }
  }

  useEffect(()=>{ refresh(); }, []);

  async function save() {
    setErr("");
    try {
      await api("/v1/templates", { method:"POST", body:{ template_id: templateId, subject, body }});
      await refresh();
    } catch(e){ setErr(e.message); }
  }

  async function renderPreview() {
    setErr("");
    try {
      const res = await api(`/v1/templates/${encodeURIComponent(templateId)}/render`, {
        method:"POST",
        body: { contact:{ contact_id:"c_", email:"@example.com", attributes:{ name:"Minsu", cart_value:120, coupon:"GENIE" } } }
      });
      setPreview(res);
    } catch(e){ setErr(e.message); }
  }

  function insertSnippet(s) {
    setBody((b)=> b + "\n" + s);
  }

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:700 }}>{err}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Card title="Edit template" right={<button onClick={save} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 }}>Save</button>}>
          <div style={{ display:"grid", gap:10 }}>
            <div style={{ display:"grid", gap:6 }}>
              <div style={{ color:"#6b7280", fontWeight:700 }}>Template ID</div>
              <input value={templateId} onChange={(e)=>setTemplateId(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
            </div>
            <div style={{ display:"grid", gap:6 }}>
              <div style={{ color:"#6b7280", fontWeight:700 }}>Subject</div>
              <input value={subject} onChange={(e)=>setSubject(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
            </div>
            <div style={{ display:"grid", gap:6 }}>
              <div style={{ color:"#6b7280", fontWeight:700 }}>Body</div>
              <textarea value={body} onChange={(e)=>setBody(e.target.value)} rows={10} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace" }} />
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {VAR_SNIPPETS.map((s)=>(
                <button key={s} onClick={()=>insertSnippet(s)} style={{ padding:"6px 8px", borderRadius:999, border:"1px solid #e5e7eb", background:"white", fontWeight:800 }}>
                  + {s.replaceAll("\n"," ")}
                </button>
              ))}
            </div>
            <button onClick={renderPreview} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"white", fontWeight:800 }}>Render preview</button>
          </div>
        </Card>

        <Card title="Templates">
          <div style={{ display:"grid", gap:8 }}>
            {templates.map((t)=>(
              <button
                key={t.template_id}
                onClick={()=>{ setTemplateId(t.template_id); setSubject(t.subject); setBody(t.body); setPreview(null); }}
                style={{ textAlign:"left", padding:10, borderRadius:12, border:"1px solid #e5e7eb", background:"white" }}
              >
                <div style={{ fontWeight:800 }}>{t.template_id}</div>
                <div style={{ color:"#6b7280", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.subject}</div>
              </button>
            ))}
            {templates.length===0 && <div style={{ color:"#6b7280" }}>No templates yet.</div>}
          </div>
        </Card>
      </div>

      <Card title="Preview">
        <pre style={{ margin:0, background:"#0b1220", color:"white", padding:12, borderRadius:12, overflow:"auto" }}>
          {preview ? JSON.stringify(preview, null, 2) : "Click 'Render preview' to see the rendered subject/body."}
        </pre>
      </Card>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState("Overview");
  const [err, setErr] = useState("");

  const tabs = ["Overview","Segments","Templates","Connectors","ROI","Approvals","Webhooks","Attribution"];

  const [overview, setOverview] = useState(null);

  useEffect(()=>{
    (async ()=>{
      try {
        setErr("");
        // quick overview: list pending approvals + templates count
        const approvals = await api("/v1/approvals/pending");
        const templates = await api("/v1/templates");
        setOverview({ pending_approvals: approvals?.length || 0, templates: templates?.length || 0 });
      } catch(e){ setErr(e.message); }
    })();
  }, [tab]);

  return (
    <div style={{ fontFamily:"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial", background:"#f9fafb", minHeight:"100vh" }}>
      <div style={{ maxWidth: 1100, margin:"0 auto", padding:"20px 14px" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>GENIE_ROI V287</div>
            <div style={{ color:"#6b7280", fontWeight:700 }}>Tenant: {DEFAULT_TENANT} · Gateway: {API_BASE}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop: 14, marginBottom: 12 }}>
          {tabs.map((t)=>(
            <TabButton key={t} active={tab===t} onClick={()=>setTab(t)}>{t}</TabButton>
          ))}
        </div>

        {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800, marginBottom: 12 }}>{err}</div>}

        {tab==="Overview" && (
          <div>
            <Card title="Operator snapshot">
              <KV k="Pending approvals" v={overview?.pending_approvals ?? "-"} />
              <KV k="Templates" v={overview?.templates ?? "-"} />
              <div style={{ color:"#6b7280", marginTop: 8 }}>
                Tip: Use <b>Templates</b> to create personalized content, then wire it into campaigns via API.
              </div>
            </Card>
            <Card title="What V287 adds (lock-in drivers)">
              <ul style={{ margin:0, paddingLeft: 18, color:"#111827", fontWeight:700 }}>
                <li>Segment rule builder (AND/OR) + event conditions</li>
                <li>Template personalization preview + versioning</li>
                <li>Email provider webhooks → normalized message events</li>
                <li>Attribution link (last-touch) to close ROI loop</li>
                <li>Collector checkpoints to enable incremental sync</li>
              </ul>
            </Card>
          </div>
        )}

        {tab==="Segments" && <SegmentsTab />}
        {tab==="Templates" && <TemplateEditor />}
        {tab==="Connectors" && <ConnectorsTab />}
        {tab==="ROI" && <ROITab />}
        {tab==="Approvals" && <ApprovalsTab />}
        {tab==="Webhooks" && <WebhooksTab />}
        {tab==="Attribution" && <AttributionTab />}
      </div>
    </div>
  );
}

// ---------- existing-ish tabs (simple, pragmatic) ----------
function SegmentsTab() {
  const [name, setName] = useState("HighIntent");
  const [def, setDef] = useState({ op:"OR", conditions:[], event_conditions:[] });
  const [segments, setSegments] = useState([]);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    try { setSegments(await api("/v1/segments")); } catch(e){ setErr(e.message); }
  }
  useEffect(()=>{ refresh(); }, []);

  async function create() {
    setErr("");
    try {
      await api("/v1/segments", { method:"POST", body:{ name, definition: def }});
      await refresh();
    } catch(e){ setErr(e.message); }
  }

  async function recompute(id) {
    setErr("");
    try { await api(`/v1/segments/${encodeURIComponent(id)}/recompute`, { method:"POST" }); await refresh(); }
    catch(e){ setErr(e.message); }
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800 }}>{err}</div>}
      <Card title="Create segment" right={<button onClick={create} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 }}>Save</button>}>
        <div style={{ display:"grid", gap:10 }}>
          <input value={name} onChange={(e)=>setName(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
          <SegmentBuilder value={def} onChange={setDef} />
        </div>
      </Card>

      <Card title="Segments">
        <div style={{ display:"grid", gap:8 }}>
          {segments.map((s)=>(
            <div key={s.segment_id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:10, borderRadius:12, border:"1px solid #e5e7eb", background:"white" }}>
              <div>
                <div style={{ fontWeight:900 }}>{s.name}</div>
                <div style={{ color:"#6b7280", fontSize: 12 }}>{s.segment_id}</div>
              </div>
              <button onClick={()=>recompute(s.segment_id)} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"white", fontWeight:800 }}>Recompute</button>
            </div>
          ))}
          {segments.length===0 && <div style={{ color:"#6b7280" }}>No segments yet.</div>}
        </div>
      </Card>
    </div>
  );
}

function ConnectorsTab() {
  const [accounts, setAccounts] = useState([]);
  const [provider, setProvider] = useState("google_ads");
  const [accountId, setAccountId] = useState("acct_");
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    try { setAccounts(await api("/v1/connectors/accounts")); } catch(e){ setErr(e.message); }
  }
  useEffect(()=>{ refresh(); }, []);

  async function add() {
    setErr("");
    try {
      await api("/v1/connectors/accounts", { method:"POST", body:{ provider, account_id: accountId, display_name: accountId }});
      await refresh();
    } catch(e){ setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800 }}>{err}</div>}
      <Card title="Add connector account" right={<button onClick={add} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 }}>Add</button>}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <select value={provider} onChange={(e)=>setProvider(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }}>
            <option value="google_ads">google_ads</option>
            <option value="meta_ads">meta_ads</option>
            <option value="naver_sa">naver_sa</option>
            <option value="kakao_moment">kakao_moment</option>
          </select>
          <input value={accountId} onChange={(e)=>setAccountId(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
        </div>
      </Card>

      <Card title="Accounts">
        <pre style={{ margin:0, background:"#0b1220", color:"white", padding:12, borderRadius:12, overflow:"auto" }}>
          {JSON.stringify(accounts, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

function ROITab() {
  const [from, setFrom] = useState("2026-02-01");
  const [to, setTo] = useState("2026-02-28");
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try { setSummary(await api(`/v1/roi/summary?from=${from}&to=${to}`)); } catch(e){ setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800 }}>{err}</div>}
      <Card title="ROI summary" right={<button onClick={load} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 }}>Load</button>}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <input value={from} onChange={(e)=>setFrom(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
          <input value={to} onChange={(e)=>setTo(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
        </div>
      </Card>
      <Card title="Result">
        <pre style={{ margin:0, background:"#0b1220", color:"white", padding:12, borderRadius:12, overflow:"auto" }}>
          {summary ? JSON.stringify(summary, null, 2) : "Click Load"}
        </pre>
      </Card>
    </div>
  );
}

function ApprovalsTab() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    try { setItems(await api("/v1/approvals/pending")); } catch(e){ setErr(e.message); }
  }
  useEffect(()=>{ refresh(); }, []);

  async function decide(id, status) {
    setErr("");
    try { await api(`/v1/approvals/${id}/decide`, { method:"POST", body:{ status } }); await refresh(); }
    catch(e){ setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800 }}>{err}</div>}
      <Card title="Pending approvals" right={<button onClick={refresh} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"white", fontWeight:800 }}>Refresh</button>}>
        <div style={{ display:"grid", gap:8 }}>
          {items.map((a)=>(
            <div key={a.approval_id} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb", background:"white" }}>
              <div style={{ fontWeight:900 }}>{a.approval_id}</div>
              <div style={{ color:"#6b7280", fontSize: 12 }}>execution_id: {a.execution_id}</div>
              <div style={{ display:"flex", gap:8, marginTop: 10 }}>
                <button onClick={()=>decide(a.approval_id,"APPROVED")} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:900 }}>Approve</button>
                <button onClick={()=>decide(a.approval_id,"REJECTED")} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"white", fontWeight:900 }}>Reject</button>
              </div>
            </div>
          ))}
          {items.length===0 && <div style={{ color:"#6b7280" }}>No pending approvals.</div>}
        </div>
      </Card>
    </div>
  );
}

function WebhooksTab() {
  const [payload, setPayload] = useState(JSON.stringify({
    provider:"ses",
    event_id:"evt_",
    message_id:"msg_",
    campaign_id:"camp_",
    contact_id:"c_",
    event_type:"OPEN",
    meta:{ user_agent:"" }
  }, null, 2));
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  async function send() {
    setErr("");
    try { setRes(await api("/v1/webhooks/email", { method:"POST", body: JSON.parse(payload) })); }
    catch(e){ setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800 }}>{err}</div>}
      <Card title="Send webhook (simulated)">
        <textarea value={payload} onChange={(e)=>setPayload(e.target.value)} rows={12} style={{ width:"100%", padding:10, borderRadius:12, border:"1px solid #e5e7eb", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace" }} />
        <div style={{ marginTop:10, display:"flex", gap:8 }}>
          <button onClick={send} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:900 }}>POST</button>
        </div>
      </Card>
      <Card title="Result">
        <pre style={{ margin:0, background:"#0b1220", color:"white", padding:12, borderRadius:12, overflow:"auto" }}>
          {res ? JSON.stringify(res, null, 2) : "—"}
        </pre>
      </Card>
    </div>
  );
}

function AttributionTab() {
  const [conversionId, setConversionId] = useState("conv_");
  const [contactId, setContactId] = useState("c_");
  const [lookbackDays, setLookbackDays] = useState(7);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  async function link() {
    setErr("");
    try { setRes(await api("/v1/attribution/link", { method:"POST", body:{ conversion_id: conversionId, contact_id: contactId, lookback_days: Number(lookbackDays) } })); }
    catch(e){ setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800 }}>{err}</div>}
      <Card title="Link attribution (last-touch)">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:10 }}>
          <input value={conversionId} onChange={(e)=>setConversionId(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
          <input value={contactId} onChange={(e)=>setContactId(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
          <input type="number" value={lookbackDays} onChange={(e)=>setLookbackDays(e.target.value)} style={{ padding:10, borderRadius:12, border:"1px solid #e5e7eb" }} />
          <button onClick={link} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:900 }}>Link</button>
        </div>
      </Card>
      <Card title="Result">
        <pre style={{ margin:0, background:"#0b1220", color:"white", padding:12, borderRadius:12, overflow:"auto" }}>
          {res ? JSON.stringify(res, null, 2) : "—"}
        </pre>
      </Card>
    </div>
  );
}

export default App;
