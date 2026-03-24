import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const DEFAULT_TENANT = import.meta.env.VITE_TENANT_ID || "demo-tenant";
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


function Button({ onClick, children, kind="primary", disabled=false }) {
  const bg = kind==="primary" ? "#111827" : "#ffffff";
  const fg = kind==="primary" ? "#ffffff" : "#111827";
  const bd = kind==="primary" ? "1px solid #111827" : "1px solid #e5e7eb";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"10px 12px",
      borderRadius: 12,
      border: bd,
      background: disabled ? "#e5e7eb" : bg,
      color: disabled ? "#6b7280" : fg,
      fontWeight: 800,
      cursor: disabled ? "not-allowed" : "pointer"
    }}>
      {children}
    </button>
  );
}

function Badge({ children }) {
  return (
    <span style={{ display:"inline-block", padding:"3px 8px", borderRadius: 999, border:"1px solid #e5e7eb", background:"#fff", fontWeight:800, fontSize:12 }}>
      {children}
    </span>
  );
}

function Input({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <label style={{ display:"grid", gap:6 }}>
      <div style={{ fontWeight:800, color:"#374151" }}>{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e)=>onChange(e.target.value)}
        style={{ padding:"10px 12px", borderRadius: 12, border:"1px solid #e5e7eb", outline:"none" }}
      />
    </label>
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
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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
        body: { contact:{ contact_id:"c_demo", email:"demo@example.com", attributes:{ name:"Minsu", cart_value:120, coupon:"GENIE" } } }
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


function AnalyticsView() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-02-26");
  const [cohortEvent, setCohortEvent] = useState("signup");
  const [convEvent, setConvEvent] = useState("purchase");
  const [windowDays, setWindowDays] = useState("30");
  const [cohort, setCohort] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [strictOrdered, setStrictOrdered] = useState(true);
  const [seg, setSeg] = useState([]);

  const inputStyle = { padding:10, border:"1px solid #e5e7eb", borderRadius: 12, minWidth: 150 };
  const primaryBtn = { padding:"10px 12px", borderRadius:12, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 };

  async function load() {
    const cohortRows = await api(`/v1/roi/analytics/cohort?from=${from}&to=${to}&cohort_event=${encodeURIComponent(cohortEvent)}&conversion_event=${encodeURIComponent(convEvent)}&window_days=${windowDays}`);
    const funnelRows = await api(`/v1/roi/analytics/funnel?from=${from}&to=${to}&ordered=${strictOrdered?1:0}&step=signup&step=view_product&step=add_to_cart&step=purchase`);
    const segRows = await api(`/v1/roi/analytics/segments?from=${from}&to=${to}&purchase_event=${encodeURIComponent(convEvent)}`);
    setCohort(cohortRows||[]);
    setFunnel(funnelRows||[]);
    setSeg(segRows||[]);
  }

  useEffect(()=>{ load().catch(()=>{}); }, []);

  const tableStyle = { width:"100%", borderCollapse:"collapse" };
  const thtd = { borderBottom:"1px solid #e5e7eb", padding:"10px 8px", textAlign:"left", verticalAlign:"top" };

  return (
    <div>
      <Card title="Analytics Controls" right={<button onClick={load} style={primaryBtn}>Refresh</button>}>
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="from YYYY-MM-DD" style={inputStyle}/>
          <input value={to} onChange={e=>setTo(e.target.value)} placeholder="to YYYY-MM-DD" style={inputStyle}/>
          <input value={cohortEvent} onChange={e=>setCohortEvent(e.target.value)} placeholder="cohort_event" style={inputStyle}/>
          <input value={convEvent} onChange={e=>setConvEvent(e.target.value)} placeholder="conversion_event" style={inputStyle}/>
          <input value={windowDays} onChange={e=>setWindowDays(e.target.value)} placeholder="window_days" style={inputStyle}/>
        </div>
        <div style={{marginTop:10, color:"#6b7280", fontWeight:700}}>
          Cohort/Funnel/Segment drilldown are computed from <code>events</code> and <code>segment_members</code>.
        </div>
      </Card>

      <Card title="Cohort Drilldown (by cohort_date × day_offset)">
        <table style={tableStyle}>
          <thead><tr>
            <th style={thtd}>Cohort Date</th><th style={thtd}>Day Offset</th><th style={thtd}>Cohort Size</th><th style={thtd}>Converted</th><th style={thtd}>Conv Rate</th>
          </tr></thead>
          <tbody>
            {cohort.map((r,idx)=>(
              <tr key={idx}>
                <td style={thtd}>{r.cohort_date}</td>
                <td style={thtd}>{r.day_offset}</td>
                <td style={thtd}>{r.cohort_size}</td>
                <td style={thtd}>{r.converted}</td>
                <td style={thtd}>{((r.conversion_rate||0)*100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Funnel Drilldown (unique contacts reached per step)">
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
          <label style={{display:"flex", alignItems:"center", gap:8, fontWeight:800}}>
            <input type="checkbox" checked={strictOrdered} onChange={(e)=>setStrictOrdered(e.target.checked)} />
            Strict ordered funnel (sequence-aware)
          </label>
          <span style={{color:"#6b7280", fontWeight:700}}>Off = classic funnel approximation; On = per-contact ordered sequence.</span>
        </div>
        <table style={tableStyle}>
          <thead><tr>
            <th style={thtd}>Step</th><th style={thtd}>Reached</th><th style={thtd}>Rate from Start</th>
          </tr></thead>
          <tbody>
            {funnel.map((r,idx)=>(
              <tr key={idx}>
                <td style={thtd}>{r.step}</td>
                <td style={thtd}>{r.reached}</td>
                <td style={thtd}>{((r.rate_from_start||0)*100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Segment Drilldown (members × purchase × ROI)">
        <table style={tableStyle}>
          <thead><tr>
            <th style={thtd}>Segment</th><th style={thtd}>Members</th><th style={thtd}>Purchasers</th><th style={thtd}>Purchase Rate</th><th style={thtd}>Revenue</th><th style={thtd}>ROI</th>
          </tr></thead>
          <tbody>
            {seg.map((r,idx)=>(
              <tr key={idx}>
                <td style={thtd}><div style={{fontWeight:900}}>{r.segment_name}</div><div style={{color:"#6b7280"}}>{r.segment_id}</div></td>
                <td style={thtd}>{r.members}</td>
                <td style={thtd}>{r.purchasers}</td>
                <td style={thtd}>{((r.purchase_rate||0)*100).toFixed(2)}%</td>
                <td style={thtd}>{(r.revenue||0).toFixed(2)}</td>
                <td style={thtd}>{(r.roi||0).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function DealCIView() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-02-26");
  const [items, setItems] = useState([]);

  const inputStyle = { padding:10, border:"1px solid #e5e7eb", borderRadius: 12, minWidth: 160 };
  const primaryBtn = { padding:"10px 12px", borderRadius:12, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 };
  const pill = (t)=>({ padding:"4px 10px", borderRadius: 999, border:"1px solid #e5e7eb", fontWeight:900, background:"white" });

  useEffect(()=>{ api("/v1/products").then(setProducts).catch(()=>{}); }, []);

  async function run() {
    const rows = await api(`/v1/deals/recommend_${method==='bayes'?'bayes':'ci'}?product_id=${productId}&from=${from}&to=${to}`);
    setItems(rows||[]);
  }

  const tableStyle = { width:"100%", borderCollapse:"collapse" };
  const thtd = { borderBottom:"1px solid #e5e7eb", padding:"10px 8px", textAlign:"left", verticalAlign:"top" };

  return (
    <div>
      <Card title="Deal Recommendation (Bayesian credible interval / CI)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <select value={productId} onChange={e=>setProductId(e.target.value)} style={inputStyle}>
            <option value="">Select product</option>
            {products.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="from YYYY-MM-DD" style={inputStyle} />
          <input value={to} onChange={e=>setTo(e.target.value)} placeholder="to YYYY-MM-DD" style={inputStyle} />
          <button onClick={run} style={primaryBtn}>Recommend</button>
        </div>

        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thtd}>Influencer</th><th style={thtd}>Channel</th><th style={thtd}>Clicks</th><th style={thtd}>Conv</th>
              <th style={thtd}>Profit (CI)</th><th style={thtd}>ROI (CI)</th><th style={thtd}>Decision</th><th style={thtd}>Conf.</th>
            </tr></thead>
            <tbody>
              {items.map((it,idx)=>(
                <tr key={idx}>
                  <td style={thtd}><div style={{fontWeight:900}}>{it.influencer_name}</div><div style={{color:"#6b7280"}}>{it.influencer_id}</div></td>
                  <td style={thtd}>{it.channel}</td>
                  <td style={thtd}>{it.clicks}</td>
                  <td style={thtd}>{it.conversions}</td>
                  <td style={thtd}>
                    <div style={{fontWeight:900}}>{(it.profit||0).toFixed(2)}</div>
                    <div style={{color:"#6b7280"}}>[{(it.profit_ci_low||0).toFixed(2)}, {(it.profit_ci_high||0).toFixed(2)}]</div>
                  </td>
                  <td style={thtd}>
                    <div style={{fontWeight:900}}>{(it.roi||0).toFixed(3)}</div>
                    <div style={{color:"#6b7280"}}>[{(it.roi_ci_low||0).toFixed(3)}, {(it.roi_ci_high||0).toFixed(3)}]</div>
                  </td>
                  <td style={thtd}>
                    <span style={pill(it.decision)}>{it.decision}</span>
                  </td>
                  <td style={thtd}>{((it.confidence||0)*100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{color:'#6b7280', marginTop:10, fontWeight:700}}>
          CI is based on Wilson interval of conversion rate + revenue-per-conversion approximation (pragmatic CI).
        </div>
      </Card>
    </div>
  );
}

function JourneyBuilderView() {
  const [name, setName] = useState("Journey Graph - V294");
  const [nodes, setNodes] = useState([
    { id:"n1", type:"trigger", label:"Trigger: signup", x:80, y:80 },
    { id:"n2", type:"action", label:"Action: email_welcome", x:340, y:80 },
    { id:"n3", type:"wait", label:"Wait: 1 day", x:600, y:80 },
    { id:"n4", type:"action", label:"Action: push_nudge", x:860, y:80 },
  ]);
  const [edges, setEdges] = useState([
    { from:"n1", to:"n2" }, { from:"n2", to:"n3" }, { from:"n3", to:"n4" }
  ]);
  const [selected, setSelected] = useState("n2");
  const [templates, setTemplates] = useState([]);
  const inputStyle = { padding:10, border:"1px solid #e5e7eb", borderRadius: 12, minWidth: 160 };
  const primaryBtn = { padding:"10px 12px", borderRadius:12, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 };

  async function refreshTemplates() {
    const t = await api("/v1/templates");
    setTemplates((t||[]).filter(x=>x.kind==="journey_graph"));
  }
  useEffect(()=>{ refreshTemplates().catch(()=>{}); }, []);

  function addNode(type) {
    const id = "n"+Math.floor(Math.random()*1e9).toString(36);
    const x = 80 + (nodes.length%6)*180;
    const y = 200 + Math.floor(nodes.length/6)*120;
    const label = type==="trigger" ? "Trigger: event" : type==="wait" ? "Wait: 1 hour" : type==="branch" ? "Branch: condition" : "Action: send";
    setNodes([...nodes, { id, type, label, x, y }]);
    if (selected) setEdges([...edges, { from:selected, to:id }]);
    setSelected(id);
  }

  function updateSelected(patch) {
    setNodes(nodes.map(n=>n.id===selected?{...n,...patch}:n));
  }

  async function saveAsTemplate() {
    const body = { id: "", kind:"journey_graph", name, content_json: { version:"V294", nodes, edges } };
    await api("/v1/templates", { method:"POST", body });
    await refreshTemplates();
  }

  const width = 1100, height = 520;

  const nodeById = useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,n])), [nodes]);

  return (
    <div>
      <Card title="Node-based Journey Builder (Graph Template)" right={<button onClick={saveAsTemplate} style={primaryBtn}>Save Template</button>}>
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center"}}>
          <input value={name} onChange={e=>setName(e.target.value)} style={{...inputStyle, minWidth: 320}}/>
          <button onClick={()=>addNode("trigger")} style={primaryBtn}>+ Trigger</button>
          <button onClick={()=>addNode("action")} style={primaryBtn}>+ Action</button>
          <button onClick={()=>addNode("wait")} style={primaryBtn}>+ Wait</button>
          <button onClick={()=>addNode("branch")} style={primaryBtn}>+ Branch</button>
        </div>
        <div style={{marginTop:10, color:"#6b7280", fontWeight:700}}>
          This builder stores a <code>journey_graph</code> template. Execution still uses the V292+ journey engine; mapping nodes → steps is a thin transform layer.
        </div>
      </Card>

      <div style={{display:"grid", gridTemplateColumns:"1.7fr 1fr", gap:12}}>
        <Card title="Canvas">
          <svg width={width} height={height} style={{border:"1px solid #e5e7eb", borderRadius: 16, background:"white"}}>
            {edges.map((e,idx)=>{
              const a=nodeById[e.from], b=nodeById[e.to];
              if(!a||!b) return null;
              const x1=a.x+140, y1=a.y+28, x2=b.x, y2=b.y+28;
              return (<g key={idx}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111827" strokeWidth="2" />
                <circle cx={x2} cy={y2} r="4" fill="#111827" />
              </g>);
            })}
            {nodes.map(n=>(
              <g key={n.id} onClick={()=>setSelected(n.id)} style={{cursor:"pointer"}}>
                <rect x={n.x} y={n.y} rx="14" ry="14" width="140" height="56"
                  fill={selected===n.id?"#111827":"white"} stroke="#e5e7eb" />
                <text x={n.x+10} y={n.y+24} fontSize="12" fontWeight="800" fill={selected===n.id?"white":"#111827"}>{n.type.toUpperCase()}</text>
                <text x={n.x+10} y={n.y+44} fontSize="12" fill={selected===n.id?"white":"#111827"}>{n.label}</text>
              </g>
            ))}
          </svg>
        </Card>

        <Card title="Inspector">
          {selected ? (
            <>
              <KV k="Selected" v={selected} />
              <div style={{marginTop:10}}>
                <div style={{fontWeight:900, marginBottom:6}}>Label</div>
                <input value={(nodeById[selected]?.label)||""} onChange={e=>updateSelected({label:e.target.value})} style={{...inputStyle, width:"100%"}}/>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontWeight:900, marginBottom:6}}>Position</div>
                <div style={{display:"flex", gap:10}}>
                  <input value={nodeById[selected]?.x||0} onChange={e=>updateSelected({x:parseInt(e.target.value||"0",10)})} style={inputStyle}/>
                  <input value={nodeById[selected]?.y||0} onChange={e=>updateSelected({y:parseInt(e.target.value||"0",10)})} style={inputStyle}/>
                </div>
              </div>
              <div style={{marginTop:12, color:"#6b7280", fontWeight:700}}>
                Tip: Click nodes to chain automatically; edit label/type to represent real-world steps.
              </div>
            </>
          ) : (
            <div style={{color:"#6b7280", fontWeight:700}}>Select a node.</div>
          )}
        </Card>
      </div>

      <Card title="Saved Journey Graph Templates">
        <ul style={{margin:0, paddingLeft:18}}>
          {templates.map(t=>(<li key={t.id}><b>{t.name}</b> <span style={{color:"#6b7280"}}>({t.id})</span></li>))}
        </ul>
      </Card>
    </div>
  );
}

function MarketplaceView() {
  const [catalog, setCatalog] = useState([]);
  const [offers, setOffers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [apps, setApps] = useState([]);
  const [installs, setInstalls] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState("");

  const [appKey, setAppKey] = useState("");
  const [appName, setAppName] = useState("");
  const [publisher, setPublisher] = useState("GENIE");
  const [appDesc, setAppDesc] = useState("");
  const [rating, setRating] = useState("5");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");

  const [sku, setSku] = useState("");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("0");
  const [offerCode, setOfferCode] = useState("");
  const [offerName, setOfferName] = useState("");
  const [offerType, setOfferType] = useState("discount");

  const inputStyle = { padding:10, border:"1px solid #e5e7eb", borderRadius: 12, minWidth: 160 };
  const primaryBtn = { padding:"10px 12px", borderRadius:12, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 };

  async function refresh() {
    const c = await api("/v1/marketplace/catalog");
    const o = await api("/v1/marketplace/offers");
    const s = await api("/v1/marketplace/settlements");
    const a = await api("/v1/marketplace/apps");
    const i = await api("/v1/marketplace/installs");
    setCatalog(c||[]);
    setOffers(o||[]);
    setSettlements(s||[]);
    setApps(a||[]);
    setInstalls(i||[]);
  }
  useEffect(()=>{ refresh().catch(()=>{}); }, []);
  useEffect(()=>{
    if(!selectedAppId) { setReviews([]); return; }
    api(`/v1/marketplace/reviews?app_id=${selectedAppId}`).then(r=>setReviews(r||[])).catch(()=>setReviews([]));
  }, [selectedAppId]);


  
  async function addApp() {
    await api("/v1/marketplace/apps", { method:"POST", body: { app_key: appKey, name: appName, publisher, description: appDesc, scopes:["events:read","campaigns:write"], install_url:"", status:"listed" } });
    setAppKey(""); setAppName(""); setAppDesc("");
    await refresh();
  }

  async function installSelected() {
    if(!selectedAppId) return;
    await api("/v1/marketplace/installs", { method:"POST", body: { app_id: selectedAppId, installed_by:"admin", status:"installed", config:{ enabled:true } } });
    await refresh();
  }

  async function addReview() {
    if(!selectedAppId) return;
    await api("/v1/marketplace/reviews", { method:"POST", body: { app_id: selectedAppId, reviewer:"user", rating: parseInt(rating||"5",10), title: reviewTitle, body: reviewBody } });
    setReviewTitle(""); setReviewBody("");
    const r = await api(`/v1/marketplace/reviews?app_id=${selectedAppId}`);
    setReviews(r||[]);
  }
async function addCatalog() {
    await api("/v1/marketplace/catalog", { method:"POST", body: { sku, name:itemName, list_price: price, currency:"USD", is_active:true } });
    setSku(""); setItemName(""); setPrice("0");
    await refresh();
  }

  async function addOffer() {
    await api("/v1/marketplace/offers", { method:"POST", body: { offer_code: offerCode, name: offerName, type: offerType, status:"draft", rules_json:{ pct_off: 10 } } });
    setOfferCode(""); setOfferName("");
    await refresh();
  }

  const tableStyle = { width:"100%", borderCollapse:"collapse" };
  const thtd = { borderBottom:"1px solid #e5e7eb", padding:"10px 8px", textAlign:"left", verticalAlign:"top" };

  return (
    <div>
      <Card title="Catalog Items (SKU / pricing)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <input value={sku} onChange={e=>setSku(e.target.value)} placeholder="SKU" style={inputStyle}/>
          <input value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="Name" style={{...inputStyle, minWidth: 280}}/>
          <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="List price" style={inputStyle}/>
          <button onClick={addCatalog} style={primaryBtn}>Add/Upsert</button>
          <button onClick={refresh} style={primaryBtn}>Refresh</button>
        </div>
        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr><th style={thtd}>SKU</th><th style={thtd}>Name</th><th style={thtd}>Price</th><th style={thtd}>Active</th><th style={thtd}>Updated</th></tr></thead>
            <tbody>
              {catalog.map((r,idx)=>(
                <tr key={idx}>
                  <td style={thtd}><b>{r.sku}</b></td>
                  <td style={thtd}>{r.name}</td>
                  <td style={thtd}>{r.currency} {r.list_price}</td>
                  <td style={thtd}>{r.is_active ? "yes":"no"}</td>
                  <td style={thtd}>{String(r.updated_at||"")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>


      <Card title="Appstore (Apps / Installs / Reviews)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center"}}>
          <input value={appKey} onChange={(e)=>setAppKey(e.target.value)} placeholder="app_key" style={inputStyle} />
          <input value={appName} onChange={(e)=>setAppName(e.target.value)} placeholder="App name" style={inputStyle} />
          <input value={publisher} onChange={(e)=>setPublisher(e.target.value)} placeholder="Publisher" style={inputStyle} />
          <input value={appDesc} onChange={(e)=>setAppDesc(e.target.value)} placeholder="Description" style={{...inputStyle, minWidth: 320}} />
          <button onClick={addApp} style={primaryBtn}>Publish / Update App</button>
        </div>

        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginTop:12}}>
          <select value={selectedAppId} onChange={(e)=>setSelectedAppId(e.target.value)} style={{...inputStyle, minWidth: 260}}>
            <option value="">Select app…</option>
            {apps.map(a=>(<option key={a.id} value={a.id}>{a.name} ({a.app_key})</option>))}
          </select>
          <button onClick={installSelected} style={primaryBtn}>Install / Enable</button>
          <span style={{color:"#6b7280", fontWeight:700}}>Installs are tenant-scoped; reviews help marketplace ranking.</span>
        </div>

        <div style={{marginTop:12}}>
          <div style={{fontWeight:900, marginBottom:8}}>Installs</div>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thtd}>App ID</th><th style={thtd}>Status</th><th style={thtd}>Installed At</th>
            </tr></thead>
            <tbody>
              {installs.map((r)=>(
                <tr key={r.id}>
                  <td style={thtd}>{r.app_id}</td>
                  <td style={thtd}><Badge>{r.status}</Badge></td>
                  <td style={thtd}>{(r.installed_at||"").slice(0,19).replace("T"," ")}</td>
                </tr>
              ))}
              {installs.length===0 && <tr><td style={thtd} colSpan={3}>(none)</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{marginTop:12}}>
          <div style={{fontWeight:900, marginBottom:8}}>Reviews (selected app)</div>
          <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:10}}>
            <select value={rating} onChange={(e)=>setRating(e.target.value)} style={{...inputStyle, minWidth: 120}}>
              <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
            </select>
            <input value={reviewTitle} onChange={(e)=>setReviewTitle(e.target.value)} placeholder="Title" style={{...inputStyle, minWidth: 200}} />
            <input value={reviewBody} onChange={(e)=>setReviewBody(e.target.value)} placeholder="Review" style={{...inputStyle, minWidth: 320}} />
            <button onClick={addReview} style={primaryBtn}>Add Review</button>
          </div>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thtd}>Rating</th><th style={thtd}>Title</th><th style={thtd}>Body</th><th style={thtd}>At</th>
            </tr></thead>
            <tbody>
              {reviews.map((r)=>(
                <tr key={r.id}>
                  <td style={thtd}>{r.rating}</td>
                  <td style={thtd}>{r.title}</td>
                  <td style={thtd}>{r.body}</td>
                  <td style={thtd}>{(r.created_at||"").slice(0,19).replace("T"," ")}</td>
                </tr>
              ))}
              {(!selectedAppId) && <tr><td style={thtd} colSpan={4}>(select an app)</td></tr>}
              {(selectedAppId && reviews.length===0) && <tr><td style={thtd} colSpan={4}>(no reviews yet)</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

</Card>

      <Card title="Offers (rules / lifecycle)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <input value={offerCode} onChange={e=>setOfferCode(e.target.value)} placeholder="OFFER_CODE" style={inputStyle}/>
          <input value={offerName} onChange={e=>setOfferName(e.target.value)} placeholder="Offer name" style={{...inputStyle, minWidth: 280}}/>
          <select value={offerType} onChange={e=>setOfferType(e.target.value)} style={inputStyle}>
            <option value="discount">discount</option>
            <option value="cashback">cashback</option>
            <option value="bundle">bundle</option>
            <option value="affiliate">affiliate</option>
          </select>
          <button onClick={addOffer} style={primaryBtn}>Add/Upsert</button>
        </div>
        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr><th style={thtd}>Code</th><th style={thtd}>Name</th><th style={thtd}>Type</th><th style={thtd}>Status</th><th style={thtd}>Rules</th></tr></thead>
            <tbody>
              {offers.map((r,idx)=>(
                <tr key={idx}>
                  <td style={thtd}><b>{r.offer_code}</b></td>
                  <td style={thtd}>{r.name}</td>
                  <td style={thtd}>{r.type}</td>
                  <td style={thtd}>{r.status}</td>
                  <td style={thtd}><code>{JSON.stringify(r.rules_json||{})}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Settlements (payout ledger)">
        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr><th style={thtd}>Date</th><th style={thtd}>Partner</th><th style={thtd}>Gross</th><th style={thtd}>Fees</th><th style={thtd}>Payout</th><th style={thtd}>Status</th></tr></thead>
            <tbody>
              {settlements.map((r,idx)=>(
                <tr key={idx}>
                  <td style={thtd}><b>{r.settlement_date}</b></td>
                  <td style={thtd}>{r.partner_type}:{r.partner_id}</td>
                  <td style={thtd}>{r.currency} {r.gross_revenue}</td>
                  <td style={thtd}>{r.currency} {r.fees}</td>
                  <td style={thtd}><b>{r.currency} {r.payout}</b></td>
                  <td style={thtd}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{color:"#6b7280", marginTop:10, fontWeight:700}}>
          This is the foundation: catalog → offers → settlements. Appstore listing is enabled via <code>marketplace_apps</code> (API add in V295 if needed).
        </div>
      </Card>
    </div>
  );
}


function ExperimentProView() {
  const [experimentId, setExperimentId] = useState("exp_demo_1");
  const [alpha, setAlpha] = useState("0.05");
  const [power, setPower] = useState("0.8");
  const [mde, setMde] = useState("0.02");
  const [looks, setLooks] = useState("6");
  const [seq, setSeq] = useState(null);
  const [decay, setDecay] = useState(null);
  const [days, setDays] = useState("28");

  async function load() {
    try {
      const q1 = new URLSearchParams({experiment_id:experimentId, alpha, power, mde, looks}).toString();
      const q2 = new URLSearchParams({experiment_id:experimentId, metric:"revenue_per_user", days}).toString();
      const a = await fetch("/v1/experiments/sequential_report?"+q1, {headers:{"x-tenant":"demo"}}).then(r=>r.json());
      const b = await fetch("/v1/experiments/holdout_decay?"+q2, {headers:{"x-tenant":"demo"}}).then(r=>r.json());
      setSeq(a); setDecay(b);
    } catch (e) { console.error(e); }
  }

  useEffect(()=>{ load(); }, []);

  const th = { borderBottom:"1px solid #e5e7eb", padding:"10px 8px", textAlign:"left" };
  const td = { borderBottom:"1px solid #f3f4f6", padding:"10px 8px" };

  return (
    <div>
      <Card title="Sequential 테스트 (중간 분석/의사결정)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"end"}}>
          <Field label="experiment_id" value={experimentId} onChange={setExperimentId} />
          <Field label="alpha" value={alpha} onChange={setAlpha} />
          <Field label="power" value={power} onChange={setPower} />
          <Field label="mde" value={mde} onChange={setMde} />
          <Field label="looks" value={looks} onChange={setLooks} />
          <button className="btn" onClick={load}>Run</button>
        </div>

        {seq && (
          <div style={{marginTop:12}}>
            <div style={{fontWeight:900}}>Required N/group (planning): {seq.required_n_per_group}</div>
            <table style={{width:"100%", borderCollapse:"collapse", marginTop:10}}>
              <thead><tr>
                <th style={th}>Look</th><th style={th}>N/group</th><th style={th}>P(uplift&gt;0)</th><th style={th}>Decision</th>
              </tr></thead>
              <tbody>
                {seq.looks_data?.map((x,i)=>(
                  <tr key={i}>
                    <td style={td}>{x.look}</td>
                    <td style={td}>{x.n_per_group}</td>
                    <td style={td}>{(x.posterior_prob_uplift_gt0*100).toFixed(1)}%</td>
                    <td style={td}><span className="pill">{x.decision}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="장기효과 Holdout Decay (시간에 따른 효과 변화)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"end"}}>
          <Field label="days" value={days} onChange={setDays} />
          <button className="btn" onClick={load}>Reload</button>
        </div>
        {decay && (
          <div style={{marginTop:12}}>
            <div style={{fontWeight:900}}>metric: {decay.metric}</div>
            <div style={{color:"#374151"}}>Tip: 실제 운영에서는 day-by-day uplift 추이를 통해 장기 유지/피로(Decay) 신호를 봅니다.</div>
            <table style={{width:"100%", borderCollapse:"collapse", marginTop:10}}>
              <thead><tr>
                <th style={th}>Day</th><th style={th}>Holdout</th><th style={th}>Treatment</th><th style={th}>Delta</th>
              </tr></thead>
              <tbody>
                {decay.points?.slice(0,14).map((x,i)=>(
                  <tr key={i}>
                    <td style={td}>{x.day}</td>
                    <td style={td}>{x.holdout.toFixed(3)}</td>
                    <td style={td}>{x.treatment.toFixed(3)}</td>
                    <td style={td}>{x.delta.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{marginTop:8, color:"#6b7280"}}>표시는 상위 14일만. API는 전체 days를 반환합니다.</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function MarketplaceProView() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-31");
  const [finance, setFinance] = useState(null);
  const [appId, setAppId] = useState("app_demo_1");
  const [reviewRes, setReviewRes] = useState(null);

  async function loadFinance() {
    const q = new URLSearchParams({from, to}).toString();
    const a = await fetch("/v1/marketplace/finance_summary?"+q, {headers:{"x-tenant":"demo"}}).then(r=>r.json());
    setFinance(a);
  }
  async function runAutoReview() {
    const a = await fetch("/v1/marketplace/security_auto_review", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-tenant":"demo"},
      body: JSON.stringify({app_id: appId})
    }).then(r=>r.json());
    setReviewRes(a);
  }

  useEffect(()=>{ loadFinance(); }, []);

  return (
    <div>
      <Card title="결제/정산 요약 (세금/환불/수수료 정책 반영)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"end"}}>
          <Field label="from" value={from} onChange={setFrom} />
          <Field label="to" value={to} onChange={setTo} />
          <button className="btn" onClick={loadFinance}>Refresh</button>
        </div>

        {finance && (
          <div style={{marginTop:12}}>
            <div style={{display:"grid", gridTemplateColumns:"repeat(5, minmax(0,1fr))", gap:10}}>
              <Stat label="Subtotal" value={fmtMoney(finance.subtotal_cents, finance.currency)} />
              <Stat label="Tax" value={fmtMoney(finance.tax_cents, finance.currency)} />
              <Stat label="Fees" value={fmtMoney(finance.fees_cents, finance.currency)} />
              <Stat label="Refunds" value={fmtMoney(finance.refunds_cents, finance.currency)} />
              <Stat label="Net" value={fmtMoney(finance.net_cents, finance.currency)} />
            </div>
            <ul style={{marginTop:10, paddingLeft:18, color:"#374151"}}>
              {finance.notes?.map((x,i)=>(<li key={i}>{x}</li>))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="보안심사 자동화 (Scopes 증빙 기반 Auto-review)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"end"}}>
          <Field label="app_id" value={appId} onChange={setAppId} />
          <button className="btn" onClick={runAutoReview}>Run Auto Review</button>
        </div>

        {reviewRes && (
          <div style={{marginTop:12}}>
            <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
              <Stat label="Status" value={reviewRes.status} />
              <Stat label="Risk score" value={reviewRes.risk_score?.toFixed(3)} />
            </div>
            <pre style={{marginTop:10, background:"#0b1020", color:"#d1d5db", padding:12, borderRadius:12, overflow:"auto"}}>
{JSON.stringify(reviewRes.findings, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

function InsightsView() {
  const [appId, setAppId] = useState("app_demo_1");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-31");
  const [reviews, setReviews] = useState(null);
  const [infl, setInfl] = useState([]);

  async function load() {
    const q = new URLSearchParams({app_id:appId, from, to}).toString();
    const a = await fetch("/v1/insights/reviews?"+q, {headers:{"x-tenant":"demo"}}).then(r=>r.json());
    const b = await fetch("/v1/insights/influencers?"+q, {headers:{"x-tenant":"demo"}}).then(r=>r.json());
    setReviews(a); setInfl(b);
  }

  useEffect(()=>{ load(); }, []);

  const th = { borderBottom:"1px solid #e5e7eb", padding:"10px 8px", textAlign:"left" };
  const td = { borderBottom:"1px solid #f3f4f6", padding:"10px 8px" };

  return (
    <div>
      <Card title="리뷰 내용 분석 → 구매 전환 연결 (요약)">
        <div style={{display:"flex", gap:10, flexWrap:"wrap", alignItems:"end"}}>
          <Field label="app_id" value={appId} onChange={setAppId} />
          <Field label="from" value={from} onChange={setFrom} />
          <Field label="to" value={to} onChange={setTo} />
          <button className="btn" onClick={load}>Refresh</button>
        </div>

        {reviews && (
          <div style={{marginTop:12}}>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:10}}>
              <Stat label="Sentiment" value={reviews.sentiment?.toFixed(3)} />
              <Stat label="Purchase conv." value={(reviews.purchase_conversion_rate*100).toFixed(2)+"%"} />
              <Stat label="Window" value={reviews.from+" → "+reviews.to} />
            </div>

            <table style={{width:"100%", borderCollapse:"collapse", marginTop:10}}>
              <thead><tr>
                <th style={th}>Topic</th><th style={th}>Share</th><th style={th}>Topic sentiment</th>
              </tr></thead>
              <tbody>
                {reviews.topics?.map((x,i)=>(
                  <tr key={i}>
                    <td style={td}>{x.topic}</td>
                    <td style={td}>{(x.share*100).toFixed(1)}%</td>
                    <td style={td}>{Number(x.sentiment).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul style={{marginTop:10, paddingLeft:18, color:"#374151"}}>
              {reviews.notes?.map((x,i)=>(<li key={i}>{x}</li>))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="인플루언서: 구독자/콘텐츠 성과 ↔ 구매 기여 (상관 신호)">
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={th}>Handle</th><th style={th}>Platform</th><th style={th}>Subs</th><th style={th}>Posts</th>
            <th style={th}>Clicks</th><th style={th}>Purchases</th><th style={th}>Revenue</th><th style={th}>Purch/10k subs</th>
          </tr></thead>
          <tbody>
            {infl?.map((x,i)=>(
              <tr key={i}>
                <td style={td}>{x.handle}</td>
                <td style={td}>{x.platform}</td>
                <td style={td}>{x.subscribers}</td>
                <td style={td}>{x.posts}</td>
                <td style={td}>{x.clicks}</td>
                <td style={td}>{x.attributed_purchases}</td>
                <td style={td}>{fmtMoney(x.revenue_cents, "USD")}</td>
                <td style={td}>{Number(x.purchase_per_10k_subs).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:10, color:"#6b7280"}}>
          * 실제 운영에서는 인플루언서 링크/쿠폰/UTM 기반 구매 기여와 실험(홀드아웃)을 함께 사용해 과대추정을 방지합니다.
        </div>
      </Card>
    </div>
  );
}


const PLATFORM_INFO = {
  platform_definition: "전 채널 Growth Operating System: 실행(오케스트레이션) → 검증(코호트/퍼널/실험/딜) → 의사결정(가드레일/확률) → 확장(마켓플레이스/앱스토어)을 하나의 운영 루프로 연결",
  service_domains: [
    { title:"마케팅(CRM/Lifecycle)", detail:"이벤트 트리거 Journey로 온보딩/이탈방지/재구매를 자동화하고, 코호트/퍼널로 효과를 즉시 검증해 운영 속도를 높입니다." },
    { title:"광고(퍼포먼스/리타겟)", detail:"채널별 성과·세그먼트 반응·실험 결과를 한 화면에서 드릴다운해 예산 재배분과 크리에이티브/타겟팅 결정을 가속합니다." },
    { title:"실험/인크리멘털", detail:"샘플사이즈·순차검정·베이지안 업데이트·장기효과(holdout decay)로 ‘결정 가능한 실험’을 운영 자동화합니다." },
    { title:"딜/제휴", detail:"ROI 목표/Max CPA 가드레일과 확률 기반 추천으로 SCALE/HOLD/STOP을 리스크 포함으로 운영합니다." },
    { title:"플랫폼/마켓플레이스", detail:"Scopes 승인·보안심사·버전 배포·결제/정산·리뷰/랭킹·퍼블리셔 콘솔로 파트너 생태계를 제품에 내장합니다." }
  ]
};



function AboutView() {
  return (
    <div>
      <Card title="플랫폼 정의 (V297 사업화 패키지)">
        <div style={{fontSize:16, fontWeight:900, lineHeight:1.4}}>{PLATFORM_INFO.platform_definition}</div>
      </Card>

      <Card title="분야별 적용">
        <ul style={{margin:0, paddingLeft:18}}>
          {PLATFORM_INFO.service_domains.map((x, idx)=>(
            <li key={idx} style={{marginBottom:10}}>
              <div style={{fontWeight:900}}>{x.title}</div>
              <div style={{color:"#374151"}}>{x.detail}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState("Overview");
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


  const tabs = ["Overview","Segments","Templates","Journey Builder","Connectors","ROI","Drilldown","Analytics","Experiment Pro","Deal CI","Marketplace","Marketplace Pro","Insights","About","Approvals","Webhooks","Attribution","Influencers","Products","Recommendations","Billing","Admin Console","Help"];

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

  
async function loadBilling() {
  setErr("");
  try {
    const r = await api("/v1/billing/plans");
    setPlans(r.plans || []);
  } catch (e) { setErr(String(e)); }
}

async function activatePlan(plan_id) {
  setErr("");
  try {
    await api("/v1/billing/subscription", { method:"POST", body:{ plan_id } });
    setSub({ plan_id, status:"active" });
  } catch (e) { setErr(String(e)); }
}

async function loadAudit() {
  setErr("");
  try {
    const r = await api("/v1/audit/logs?limit=50");
    setAudit(r.items || []);
  } catch (e) { setErr(String(e)); }
}

async function loadOIDC() {
  setErr("");
  try {
    const r = await api("/v1/admin/sso/oidc");
    setOidc(r);
  } catch (e) { setErr("SSO not configured (or missing admin permission)."); }
}

async function saveOIDC(next) {
  setErr("");
  try {
    await api("/v1/admin/sso/oidc", { method:"POST", body: next });
    setOidc(next);
  } catch (e) { setErr(String(e)); }
}

return (
    <div style={{ fontFamily:"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial", background:"#f9fafb", minHeight:"100vh" }}>
      <div style={{ maxWidth: 1100, margin:"0 auto", padding:"20px 14px" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>GENIE_ROI V292</div>
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
        {tab==="Journey Builder" && <JourneyBuilderView />}
        {tab==="Connectors" && <ConnectorsTab />}
        {tab==="ROI" && <ROITab />}
        {tab==="Drilldown" && <DrilldownTab />}
        {tab==="Analytics" && <AnalyticsView />}
        {tab==="Deal CI" && <DealCIView />}
        {tab==="Marketplace" && <MarketplaceView />}
        {tab==="About" && <AboutView />}
        {tab==="Experiment Pro" && <ExperimentProView />}
        {tab==="Marketplace Pro" && <MarketplaceProView />}
        {tab==="Insights" && <InsightsView />}
        {tab==="Approvals" && <ApprovalsTab />}
        {tab==="Webhooks" && <WebhooksTab />}
        {tab==="Attribution" && <AttributionTab />}
        {tab==="Influencers" && <InfluencersTab />}
        {tab==="Products" && <ProductsTab />}
        {tab==="Recommendations" && <RecommendationsTab />}

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
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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
  const [accountId, setAccountId] = useState("acct_demo");
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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

function DrilldownTab() {
  const [from, setFrom] = useState("2026-02-01");
  const [to, setTo] = useState("2026-02-28");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  async function load() {
    setErr("");
    try {
      const res = await api(`/v1/roi/drilldown?from=${from}&to=${to}`);
      setData(res);
      setSelectedCampaign(null);
      setSelectedExperiment(null);
    } catch (e) {
      setErr(e.message);
    }
  }

  const overview = data?.overview;
  const channels = data?.channels || [];
  const campaigns = data?.campaigns || [];
  const experiments = data?.experiments || [];
  const deals = data?.deals || [];
  const decisionPack = data?.decision_pack || [];

  const inputStyle = { padding:10, borderRadius:12, border:"1px solid #e5e7eb", width:"100%" };
  const tableStyle = { width:"100%", borderCollapse:"collapse" };
  const thtd = { padding:"10px 8px", borderBottom:"1px solid #e5e7eb", textAlign:"left", fontWeight:800, fontSize:13 };
  const td = { padding:"10px 8px", borderBottom:"1px solid #f3f4f6", verticalAlign:"top", fontWeight:700, fontSize:13 };

  return (
    <div>
      {err && <div style={{ padding:10, borderRadius:12, background:"#fff1f2", border:"1px solid #fecdd3", fontWeight:800, marginBottom: 12 }}>{err}</div>}
      <Card
        title="Drilldown dashboard (Campaign · Experiment · Deal)"
        right={<button onClick={load} style={{ padding:"8px 10px", borderRadius:10, border:"1px solid #111827", background:"#111827", color:"white", fontWeight:800 }}>Load</button>}
      >
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <input value={from} onChange={(e)=>setFrom(e.target.value)} placeholder="from YYYY-MM-DD" style={inputStyle} />
          <input value={to} onChange={(e)=>setTo(e.target.value)} placeholder="to YYYY-MM-DD" style={inputStyle} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:12 }}>
          <div style={{ border:"1px solid #e5e7eb", borderRadius:14, padding:12, background:"#fff" }}>
            <div style={{ color:"#6b7280", fontWeight:800, fontSize:12 }}>Total spend</div>
            <div style={{ fontWeight:900, fontSize:18 }}>{overview ? overview.total_spend.toFixed(0) : "-"}</div>
          </div>
          <div style={{ border:"1px solid #e5e7eb", borderRadius:14, padding:12, background:"#fff" }}>
            <div style={{ color:"#6b7280", fontWeight:800, fontSize:12 }}>Total revenue</div>
            <div style={{ fontWeight:900, fontSize:18 }}>{overview ? overview.total_revenue.toFixed(0) : "-"}</div>
          </div>
          <div style={{ border:"1px solid #e5e7eb", borderRadius:14, padding:12, background:"#fff" }}>
            <div style={{ color:"#6b7280", fontWeight:800, fontSize:12 }}>ROI</div>
            <div style={{ fontWeight:900, fontSize:18 }}>{overview ? (overview.total_roi*100).toFixed(1) + "%" : "-"}</div>
          </div>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
        <div>
          <Card title="Campaign performance (click a row)">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtd}>Channel</th>
                  <th style={thtd}>Provider</th>
                  <th style={thtd}>Campaign</th>
                  <th style={thtd}>Spend</th>
                  <th style={thtd}>Revenue</th>
                  <th style={thtd}>ROAS</th>
                  <th style={thtd}>Clicks</th>
                  <th style={thtd}>Conv</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((r, i)=>(
                  <tr key={i} onClick={()=>setSelectedCampaign(r)} style={{ cursor:"pointer", background: selectedCampaign?.campaign_id===r.campaign_id ? "#f3f4f6" : "transparent" }}>
                    <td style={td}>{r.channel}</td>
                    <td style={td}>{r.provider || "-"}</td>
                    <td style={td}><code>{r.campaign_id || "-"}</code></td>
                    <td style={td}>{(r.spend||0).toFixed(0)}</td>
                    <td style={td}>{(r.revenue||0).toFixed(0)}</td>
                    <td style={td}>{(r.roas||0).toFixed(2)}</td>
                    <td style={td}>{r.clicks || 0}</td>
                    <td style={td}>{r.conversions || 0}</td>
                  </tr>
                ))}
                {campaigns.length===0 && <tr><td style={td} colSpan={8}>No rows (Load first)</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card title="Experiments (click a row)">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtd}>Experiment</th>
                  <th style={thtd}>Status</th>
                  <th style={thtd}>Holdout%</th>
                  <th style={thtd}>Treatment rev</th>
                  <th style={thtd}>Holdout rev</th>
                  <th style={thtd}>Lift</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((r, i)=>(
                  <tr key={i} onClick={()=>setSelectedExperiment(r)} style={{ cursor:"pointer", background: selectedExperiment?.experiment_id===r.experiment_id ? "#f3f4f6" : "transparent" }}>
                    <td style={td}><div style={{fontWeight:900}}>{r.name}</div><div style={{color:"#6b7280"}}><code>{r.experiment_id}</code></div></td>
                    <td style={td}>{r.status}</td>
                    <td style={td}>{r.holdout_pct}</td>
                    <td style={td}>{(r.treatment_revenue||0).toFixed(0)}</td>
                    <td style={td}>{(r.holdout_revenue||0).toFixed(0)}</td>
                    <td style={td}>{(r.lift_pct||0).toFixed(1)}%</td>
                  </tr>
                ))}
                {experiments.length===0 && <tr><td style={td} colSpan={6}>No rows (Load first)</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card title="Deals (incremental, from deal estimation)">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtd}>Channel</th>
                  <th style={thtd}>Content type</th>
                  <th style={thtd}>Estimates</th>
                  <th style={thtd}>Incremental revenue</th>
                  <th style={thtd}>Incremental profit</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((r, i)=>(
                  <tr key={i}>
                    <td style={td}>{r.channel}</td>
                    <td style={td}>{r.content_type}</td>
                    <td style={td}>{r.estimates}</td>
                    <td style={td}>{(r.incremental_revenue||0).toFixed(0)}</td>
                    <td style={td}>{(r.incremental_profit||0).toFixed(0)}</td>
                  </tr>
                ))}
                {deals.length===0 && <tr><td style={td} colSpan={5}>No rows (Load first)</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
          <Card title="Channel breakdown (V293)">
            {channels.length === 0 && <div style={{ color:"#6b7280", fontWeight:700 }}>No channel data</div>}
            {channels.length > 0 && (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Channel</th>
                    <th style={{ textAlign:"right", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Spend</th>
                    <th style={{ textAlign:"right", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Revenue</th>
                    <th style={{ textAlign:"right", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((r, i)=>(
                    <tr key={i}>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", fontWeight:800 }}>{r.channel}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", textAlign:"right" }}>{Number(r.spend||0).toFixed(0)}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", textAlign:"right" }}>{Number(r.revenue||0).toFixed(0)}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", textAlign:"right", fontWeight:900 }}>{Number(r.roi||0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Deal decision pack (V293)">
            {decisionPack.length === 0 && <div style={{ color:"#6b7280", fontWeight:700 }}>No deal data</div>}
            {decisionPack.length > 0 && (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Deal</th>
                    <th style={{ textAlign:"left", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Rec</th>
                    <th style={{ textAlign:"left", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Conf</th>
                    <th style={{ textAlign:"right", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>Inc profit</th>
                    <th style={{ textAlign:"right", padding:"8px 6px", borderBottom:"1px solid #e5e7eb" }}>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {decisionPack.slice(0,10).map((r, i)=>(
                    <tr key={i}>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", fontWeight:800 }}>{r.deal_id}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", fontWeight:900 }}>{r.recommendation}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6" }}>{r.confidence}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", textAlign:"right" }}>{Number(r.incremental_profit||0).toFixed(0)}</td>
                      <td style={{ padding:"8px 6px", borderBottom:"1px solid #f3f4f6", textAlign:"right" }}>{r.roi_ratio==null ? "-" : Number(r.roi_ratio).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop:10, color:"#6b7280", fontWeight:700, fontSize:12 }}>
              SCALE/HOLD/STOP are rule-based proxies (V293). Replace with CI-aware decisioning for production.
            </div>
          </Card>
        </div>



        <div>
          <Card title="Selection detail">
            {!selectedCampaign && !selectedExperiment && <div style={{ color:"#6b7280", fontWeight:800 }}>Click a campaign or experiment row to see details.</div>}
            {selectedCampaign && (
              <div>
                <div style={{ fontWeight:900, marginBottom:8 }}>Campaign</div>
                <KV k="Channel" v={selectedCampaign.channel} />
                <KV k="Provider" v={selectedCampaign.provider || "-"} />
                <KV k="Campaign ID" v={<code>{selectedCampaign.campaign_id || "-"}</code>} />
                <KV k="Spend" v={(selectedCampaign.spend||0).toFixed(0)} />
                <KV k="Revenue" v={(selectedCampaign.revenue||0).toFixed(0)} />
                <KV k="ROAS" v={(selectedCampaign.roas||0).toFixed(2)} />
                <KV k="Clicks" v={selectedCampaign.clicks || 0} />
                <KV k="Conversions" v={selectedCampaign.conversions || 0} />
              </div>
            )}
            {selectedExperiment && (
              <div style={{ marginTop: selectedCampaign ? 14 : 0 }}>
                <div style={{ fontWeight:900, marginBottom:8 }}>Experiment</div>
                <KV k="Name" v={selectedExperiment.name} />
                <KV k="Experiment ID" v={<code>{selectedExperiment.experiment_id}</code>} />
                <KV k="Status" v={selectedExperiment.status} />
                <KV k="Holdout%" v={selectedExperiment.holdout_pct} />
                <KV k="Treatment revenue" v={(selectedExperiment.treatment_revenue||0).toFixed(0)} />
                <KV k="Holdout revenue" v={(selectedExperiment.holdout_revenue||0).toFixed(0)} />
                <KV k="Lift" v={(selectedExperiment.lift_pct||0).toFixed(1) + "%"} />
              </div>
            )}
          </Card>

          <Card title="How to use">
            <div style={{ color:"#111827", fontWeight:800, lineHeight:1.5 }}>
              This view unifies <b>campaign spend</b> (channel_metrics), <b>conversion revenue</b> (conversion_events),
              <b>incrementality</b> (experiment_outcomes), and <b>deal economics</b> (influencer_deal_estimates).
              Use it to decide budget shifts, validate lift, and pick the next deal with positive incremental profit.
            </div>
          </Card>
        </div>
      
{tab==="Billing" && (
  <div>
    <Card title="Plans & Subscription">
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: 10 }}>
        <Button onClick={loadBilling}>Load plans</Button>
      </div>
      {plans.length===0 ? <div style={{ color:"#6b7280" }}>No plans loaded yet.</div> : (
        <div style={{ display:"grid", gap:10 }}>
          {plans.map((p)=>(
            <div key={p.PlanID || p.plan_id} style={{ padding:12, border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
              <div style={{ fontWeight:900 }}>{p.Name || p.name}</div>
              <div style={{ color:"#6b7280" }}>{p.Description || p.description || ""}</div>
              <div style={{ marginTop: 6, display:"flex", gap:10, flexWrap:"wrap" }}>
                <Badge>Base ${( (p.MonthlyBaseCents ?? p.monthly_base_cents ?? 0)/100 ).toFixed(2) }/mo</Badge>
                <Badge>Events incl. {p.IncludedEvents ?? p.included_events ?? 0}</Badge>
                <Badge>Contacts incl. {p.IncludedContacts ?? p.included_contacts ?? 0}</Badge>
                <Badge>Connectors incl. {p.IncludedConnectors ?? p.included_connectors ?? 0}</Badge>
              </div>
              <div style={{ marginTop: 10 }}>
                <Button onClick={()=>setSubscription(p.PlanID || p.plan_id)}>Activate for this tenant</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {sub && <div style={{ marginTop:12 }}><Badge>Subscription: {sub.plan_id} ({sub.status})</Badge></div>}
      <div style={{ marginTop: 10, color:"#6b7280" }}>
        Beginner tip: start with a small plan, run one Journey + one Experiment, then scale using Deal recommendations.
      </div>
    </Card>
  </div>
)}

{tab==="Admin Console" && (
  <div>
    <Card title="SSO (OIDC) scaffold">
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: 10 }}>
        <Button onClick={loadOIDC}>Load config</Button>
        <Button onClick={()=>saveOIDC(oidc || {issuer_url:"",client_id:"",client_secret:"",redirect_url:"",scopes:"openid profile email",enabled:false})}>Save</Button>
      </div>
      <div style={{ color:"#6b7280", marginBottom: 8 }}>
        This demo stores config and exposes endpoints; production needs full token/session validation.
      </div>
      <div style={{ display:"grid", gap:8 }}>
        <Input label="Issuer URL" value={oidc?.issuer_url || ""} onChange={(v)=>setOidc({...(oidc||{}), issuer_url:v})} />
        <Input label="Client ID" value={oidc?.client_id || ""} onChange={(v)=>setOidc({...(oidc||{}), client_id:v})} />
        <Input label="Client Secret" value={oidc?.client_secret || ""} onChange={(v)=>setOidc({...(oidc||{}), client_secret:v})} />
        <Input label="Redirect URL" value={oidc?.redirect_url || ""} onChange={(v)=>setOidc({...(oidc||{}), redirect_url:v})} />
        <Input label="Scopes" value={oidc?.scopes || "openid profile email"} onChange={(v)=>setOidc({...(oidc||{}), scopes:v})} />
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <input type="checkbox" checked={!!oidc?.enabled} onChange={(e)=>setOidc({...(oidc||{}), enabled:e.target.checked})} />
          <div style={{ fontWeight:800 }}>Enabled</div>
        </div>
      </div>
    </Card>

    <Card title="Audit logs">
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: 10 }}>
        <Button onClick={loadAudit}>Load last 50</Button>
      </div>
      {audit.length===0 ? <div style={{ color:"#6b7280" }}>No audit logs loaded yet.</div> : (
        <div style={{ display:"grid", gap:8 }}>
          {audit.map((a)=>(
            <div key={a.ID || a.id} style={{ padding:10, border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
              <div style={{ fontWeight:900 }}>{a.Action || a.action}</div>
              <div style={{ color:"#6b7280" }}>
                {a.ActorUserID || a.actor_user_id || "unknown"} · {a.ActorRole || a.actor_role || "role?"} · {a.StatusCode || a.status_code}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, color:"#6b7280" }}>
        Audit logs help enterprise customers with compliance, incident response, and change tracking.
      </div>
    </Card>
  </div>
)}

{tab==="Help" && (
  <div>
    <Card title="Getting started (for beginners)">
      <ol style={{ marginTop: 0, color:"#111827", lineHeight: 1.6 }}>
        <li><b>Overview</b>: check pending approvals + tips.</li>
        <li><b>Journey Builder</b>: load a preset → publish → trigger events (use quickstart scripts).</li>
        <li><b>Analytics</b>: turn on <b>Ordered Funnel</b> to validate real step sequences.</li>
        <li><b>Experiment Pro</b>: enable <b>Sequential</b> and watch STOP/CONTINUE guidance.</li>
        <li><b>Deal CI</b>: use probability + guardrails to SCALE/HOLD/STOP.</li>
        <li><b>Marketplace Pro</b>: create app → request scopes → auto security review → publish.</li>
        <li><b>Billing</b>: activate a plan, then monitor usage and invoice preview.</li>
      </ol>
      <div style={{ marginTop:10 }}>
        <Badge>Docs</Badge>
        <div style={{ color:"#6b7280", marginTop: 6 }}>
          • docs/V299_BEGINNER_GUIDE.md<br/>
          • docs/V299_ADMIN_GUIDE.md<br/>
          • docs/V299_CONNECTOR_SDK.md<br/>
          • docs/V299_BILLING_AND_PACKAGING.md
        </div>
      </div>
    </Card>
  </div>
)}

</div>
    </div>
  );
}
}

function ApprovalsTab() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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
    event_id:"evt_demo",
    message_id:"msg_demo",
    campaign_id:"camp_demo",
    contact_id:"c_demo",
    event_type:"OPEN",
    meta:{ user_agent:"demo" }
  }, null, 2));
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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
  const [conversionId, setConversionId] = useState("conv_demo");
  const [contactId, setContactId] = useState("c_demo");
  const [lookbackDays, setLookbackDays] = useState(7);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [plans, setPlans] = useState([]);
  const [sub, setSub] = useState(null);
  const [audit, setAudit] = useState([]);
  const [oidc, setOidc] = useState(null);


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


function InfluencersTab() {
  const [items,setItems]=useState([]);
  const [name,setName]=useState("");
  const [handle,setHandle]=useState("");
  const [categories,setCategories]=useState("[]");
  const [notes,setNotes]=useState("");
  const load = async()=>{ const res = await api('/v1/influencers'); setItems(res.items||[]); };
  useEffect(()=>{ load().catch(()=>{}); },[]);
  const create = async()=>{
    const cats = JSON.parse(categories||'[]');
    await api('/v1/influencers',{method:'POST', body:{name, handle: handle||undefined, categories: cats, notes: notes||undefined}});
    setName(''); setHandle(''); setNotes('');
    await load();
  };
  return (
    <div>
      <Card title="Influencers">
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="name" style={inputStyle} />
          <input value={handle} onChange={e=>setHandle(e.target.value)} placeholder="handle" style={inputStyle} />
          <input value={categories} onChange={e=>setCategories(e.target.value)} placeholder='categories JSON e.g. ["beauty","fitness"]' style={{...inputStyle, minWidth:320}} />
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="notes" style={{...inputStyle, minWidth:260}} />
          <button onClick={create} style={primaryBtn}>Create</button>
        </div>
        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr><th>ID</th><th>Name</th><th>Handle</th><th>Categories</th></tr></thead>
            <tbody>
              {items.map(it=>(
                <tr key={it.id}><td style={tdMono}>{it.id}</td><td>{it.name}</td><td>{it.handle||''}</td><td><code>{JSON.stringify(it.categories||[])}</code></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProductsTab() {
  const [items,setItems]=useState([]);
  const [name,setName]=useState('');
  const [sku,setSku]=useState('');
  const [categories,setCategories]=useState('[]');
  const [price,setPrice]=useState('');
  const [margin,setMargin]=useState('');
  const load = async()=>{ const res = await api('/v1/products'); setItems(res.items||[]); };
  useEffect(()=>{ load().catch(()=>{}); },[]);
  const create = async()=>{
    const cats = JSON.parse(categories||'[]');
    await api('/v1/products',{method:'POST', body:{name, sku: sku||undefined, categories: cats, price: price||undefined, margin: margin||undefined}});
    setName(''); setSku(''); setPrice(''); setMargin('');
    await load();
  };
  return (
    <div>
      <Card title="Products">
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="name" style={inputStyle} />
          <input value={sku} onChange={e=>setSku(e.target.value)} placeholder="sku" style={inputStyle} />
          <input value={categories} onChange={e=>setCategories(e.target.value)} placeholder='categories JSON' style={{...inputStyle, minWidth:320}} />
          <input value={price} onChange={e=>setPrice(e.target.value)} placeholder='price' style={inputStyle} />
          <input value={margin} onChange={e=>setMargin(e.target.value)} placeholder='margin' style={inputStyle} />
          <button onClick={create} style={primaryBtn}>Create</button>
        </div>
        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr><th>ID</th><th>Name</th><th>SKU</th><th>Categories</th><th>Price</th></tr></thead>
            <tbody>
              {items.map(it=>(
                <tr key={it.id}><td style={tdMono}>{it.id}</td><td>{it.name}</td><td>{it.sku||''}</td><td><code>{JSON.stringify(it.categories||[])}</code></td><td>{it.price||''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RecommendationsTab() {
  const [products,setProducts]=useState([]);
  const [productId,setProductId]=useState('');
  const [items,setItems]=useState([]);
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  useEffect(()=>{ (async()=>{ const p=await api('/v1/products'); setProducts(p.items||[]); if(!productId && (p.items||[]).length) setProductId(p.items[0].id); })().catch(()=>{}); },[]);
  const run = async()=>{
    const qs = new URLSearchParams({product_id: productId});
    if(from) qs.set('from', from);
    if(to) qs.set('to', to);
    const res = await api('/v1/recommendations/influencers?'+qs.toString());
    setItems(res.items||[]);
  };
  return (
    <div>
      <Card title="Recommendations (best influencers by product & channel)">
        <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
          <select value={productId} onChange={e=>setProductId(e.target.value)} style={inputStyle}>
            {products.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="from YYYY-MM-DD" style={inputStyle} />
          <input value={to} onChange={e=>setTo(e.target.value)} placeholder="to YYYY-MM-DD" style={inputStyle} />
          <button onClick={run} style={primaryBtn}>Recommend</button>
        </div>
        <div style={{marginTop:12}}>
          <table style={tableStyle}>
            <thead><tr><th>Influencer</th><th>Channel</th><th>Score</th><th>Evidence</th></tr></thead>
            <tbody>
              {items.map((it,idx)=>(
                <tr key={idx}><td>{it.influencer_name}</td><td>{it.channel}</td><td>{(it.score||0).toFixed(3)}</td><td><code>{JSON.stringify(it.evidence||{})}</code></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{color:'#6b7280', marginTop:10, fontWeight:700}}>
          Tip: Load influencer_product_stats via <code>/v1/influencers/products/stats/ingest</code> to power recommendations.
        </div>
      </Card>
    </div>
  );
}
