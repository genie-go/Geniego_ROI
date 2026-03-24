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

function Pill({ children }) {
  return <span style={{ padding: "2px 10px", borderRadius: 999, background: "#f3f4f6", fontSize: 12, marginRight: 8 }}>{children}</span>;
}

function useAsync(loadFn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true); setErr(null);
    loadFn().then((d) => mounted && setData(d)).catch((e) => mounted && setErr(e)).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, err, loading, reload: () => loadFn().then(setData).catch(setErr) };
}

function Nav({ tab, setTab }) {
  const items = [
    ["executions", "Executions"],
    ["approvals", "Approvals"],
    ["roi", "ROI"],
    ["segments", "Segments (Rule Builder)"],
    ["templates", "Templates (Personalize)"],
    ["campaigns", "Email A/B + Holdout"],
    ["connectors", "Connectors (Priority)"],
    ["experiments", "Experiments"],
  ];
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom: 14 }}>
      {items.map(([k, label]) => (
        <button key={k} onClick={() => setTab(k)} style={{
          padding:"8px 12px", borderRadius: 999, border:"1px solid #e5e7eb",
          background: tab===k ? "#111827" : "white", color: tab===k ? "white" : "#111827",
          fontWeight: 700, cursor:"pointer"
        }}>{label}</button>
      ))}
    </div>
  );
}

function Executions() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/executions?limit=50"), []);
  return (
    <Card title="Executions (최근 50건)" right={<button onClick={reload}>Reload</button>}>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {Array.isArray(data) && data.map((x) => (
        <div key={x.execution_id} style={{ padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 700 }}>{x.action_type} <Pill>{x.channel}</Pill> <Pill>{x.status}</Pill></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{x.execution_id}</div>
        </div>
      ))}
    </Card>
  );
}

function Approvals() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/approvals/pending"), []);
  const [note, setNote] = useState("");
  async function decide(id, executionId, status) {
    await api(`/v1/approvals/${id}/decide`, { method: "POST", body: { execution_id: executionId, status, note } });
    setNote(""); reload();
  }
  return (
    <Card title="Pending Approvals" right={<button onClick={reload}>Reload</button>}>
      <div style={{ marginBottom: 10 }}>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="decision note (optional)" style={{ width: 420, padding: 8, borderRadius: 10, border:"1px solid #e5e7eb" }} />
      </div>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {Array.isArray(data) && data.length === 0 && <div style={{ opacity: 0.7 }}>No pending approvals.</div>}
      {Array.isArray(data) && data.map((x) => (
        <div key={x.approval_id} style={{ padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 700 }}><Pill>{x.provider}</Pill><Pill>{x.action_type}</Pill><Pill>{x.status}</Pill></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{x.approval_id} / {x.execution_id}</div>
          <div style={{ marginTop: 8, display:"flex", gap:8 }}>
            <button onClick={() => decide(x.approval_id, x.execution_id, "APPROVED")}>Approve</button>
            <button onClick={() => decide(x.approval_id, x.execution_id, "REJECTED")}>Reject</button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function ROI() {
  const [from, setFrom] = useState(() => new Date(Date.now()-7*86400000).toISOString().slice(0,10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const { data, err, loading, reload } = useAsync(() => api(`/v1/roi/summary?from=${from}&to=${to}`), [from, to]);
  return (
    <Card title="ROI Summary" right={<button onClick={reload}>Reload</button>}>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom: 10 }}>
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
        <span>~</span>
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
      </div>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color:"crimson" }}>{String(err.message || err)}</div>}
      {Array.isArray(data) && data.map((r) => (
        <div key={`${r.channel}|${r.provider}`} style={{ padding:"10px 0", borderTop:"1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 800 }}><Pill>{r.channel}</Pill><Pill>{r.provider}</Pill></div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop: 6 }}>
            <div>Spend: <b>{r.spend}</b></div>
            <div>Revenue: <b>{r.revenue}</b></div>
            <div>ROI: <b>{r.roi}</b></div>
          </div>
        </div>
      ))}
    </Card>
  );
}

/** Rule builder -> definition_json compatible with backend recompute logic */
function SegmentRuleBuilder({ onChange }) {
  const [op, setOp] = useState("AND");
  const [conds, setConds] = useState([{ field:"attrs.country", operator:"eq", value:"KR" }]);
  const [eventConds, setEventConds] = useState([{ event_type:"purchase", within_days:30 }]);

  const definition = useMemo(() => ({
    op,
    conditions: conds.map(c => ({ field: c.field, operator: c.operator, value: c.value })),
    event_conditions: eventConds.map(e => ({ event_type: e.event_type, within_days: Number(e.within_days||0) }))
  }), [op, conds, eventConds]);

  useEffect(() => { onChange?.(definition); }, [definition, onChange]);

  function updateCond(i, patch) { setConds(xs => xs.map((x,idx)=> idx===i ? { ...x, ...patch } : x)); }
  function addCond() { setConds(xs => [...xs, { field:"attrs.", operator:"eq", value:"" }]); }
  function delCond(i) { setConds(xs => xs.filter((_,idx)=>idx!==i)); }

  function updateEvent(i, patch) { setEventConds(xs => xs.map((x,idx)=> idx===i ? { ...x, ...patch } : x)); }
  function addEvent() { setEventConds(xs => [...xs, { event_type:"", within_days:7 }]); }
  function delEvent(i) { setEventConds(xs => xs.filter((_,idx)=>idx!==i)); }

  const fieldHelp = (
    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
      Field 예시: <code>email</code>, <code>phone</code>, <code>attrs.country</code>, <code>attrs.ltv</code>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Conditions</div>
        <select value={op} onChange={(e)=>setOp(e.target.value)}>
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button onClick={addCond}>+ Add condition</button>
      </div>
      {conds.map((c, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 0.8fr 1fr auto", gap:8, marginBottom: 8 }}>
          <input value={c.field} onChange={(e)=>updateCond(i,{field:e.target.value})} placeholder="field" />
          <select value={c.operator} onChange={(e)=>updateCond(i,{operator:e.target.value})}>
            <option value="eq">eq</option>
            <option value="neq">neq</option>
            <option value="contains">contains</option>
            <option value="gt">gt</option>
            <option value="gte">gte</option>
            <option value="lt">lt</option>
            <option value="lte">lte</option>
          </select>
          <input value={c.value} onChange={(e)=>updateCond(i,{value:e.target.value})} placeholder="value" />
          <button onClick={()=>delCond(i)}>Remove</button>
        </div>
      ))}
      {fieldHelp}

      <div style={{ marginTop: 14, display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ fontWeight: 700 }}>Event conditions (optional)</div>
        <button onClick={addEvent}>+ Add event</button>
      </div>
      {eventConds.map((e, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr auto", gap:8, marginTop: 8 }}>
          <input value={e.event_type} onChange={(ev)=>updateEvent(i,{event_type:ev.target.value})} placeholder="event_type (e.g. purchase)" />
          <input type="number" value={e.within_days} onChange={(ev)=>updateEvent(i,{within_days:ev.target.value})} placeholder="within_days" />
          <button onClick={()=>delEvent(i)}>Remove</button>
        </div>
      ))}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>definition_json preview</div>
        <pre style={{ background:"#f9fafb", padding: 12, borderRadius: 12, overflow:"auto" }}>{JSON.stringify(definition, null, 2)}</pre>
      </div>
    </div>
  );
}

function Segments() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/segments"), []);
  const [name, setName] = useState("KR 구매가능 고객");
  const [segmentId, setSegmentId] = useState("");
  const [def, setDef] = useState(null);

  async function create() {
    const res = await api("/v1/segments", { method:"POST", body:{ segment_id: segmentId || undefined, name, definition: def || {} } });
    setSegmentId(res.segment_id);
    reload();
  }
  async function recompute(id) {
    await api(`/v1/segments/${id}/recompute`, { method:"POST", body:{} });
    reload();
  }

  return (
    <>
      <Card title="Create / Update Segment">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom: 10 }}>
          <input value={segmentId} onChange={(e)=>setSegmentId(e.target.value)} placeholder="segment_id (optional)" />
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="name" />
        </div>
        <SegmentRuleBuilder onChange={setDef} />
        <div style={{ marginTop: 10, display:"flex", gap:8 }}>
          <button onClick={create}>Save segment</button>
          {segmentId && <button onClick={()=>recompute(segmentId)}>Recompute members</button>}
        </div>
      </Card>

      <Card title="Segments" right={<button onClick={reload}>Reload</button>}>
        {loading && <div>Loading...</div>}
        {err && <div style={{ color:"crimson" }}>{String(err.message || err)}</div>}
        {Array.isArray(data) && data.map((s) => (
          <div key={s.segment_id} style={{ padding:"10px 0", borderTop:"1px solid #f3f4f6" }}>
            <div style={{ fontWeight: 800 }}><Pill>{s.segment_id}</Pill>{s.name}</div>
            <div style={{ marginTop: 8, display:"flex", gap:8 }}>
              <button onClick={()=>{ setSegmentId(s.segment_id); setName(s.name); }}>Load</button>
              <button onClick={()=>recompute(s.segment_id)}>Recompute</button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

function Templates() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/templates"), []);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("{{ upper (default \"고객\" attrs.name) }}님, 혜택을 확인하세요");
  const [body, setBody] = useState("안녕하세요 {{ default \"고객\" attrs.name }}님\n\n{{ default \"\" attrs.offer_text }}\n\n감사합니다.\n");
  const [preview, setPreview] = useState(null);

  async function save() {
    const res = await api("/v1/templates", { method:"POST", body:{ template_id: templateId || undefined, subject, body } });
    setTemplateId(res.template_id);
    reload();
  }
  async function renderPreview() {
    const res = await api(`/v1/templates/${templateId}/render`, { method:"POST", body:{ data:{ attrs:{ name:"민수", offer_text:"이번 주 20% 할인 쿠폰: SAVE20" } } } });
    setPreview(res);
  }

  return (
    <>
      <Card title="Template Editor (with personalization)">
        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
          <input value={templateId} onChange={(e)=>setTemplateId(e.target.value)} placeholder="template_id (optional)" />
          <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="subject" />
          <textarea value={body} onChange={(e)=>setBody(e.target.value)} placeholder="body" rows={10} />
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Variables: <code>{{"{{ attrs.name }}"}}</code>, <code>{{"{{ email }}"}}</code> • Functions: <code>upper</code>, <code>lower</code>, <code>default</code>, <code>urlquery</code>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save}>Save</button>
            <button onClick={renderPreview} disabled={!templateId}>Preview render</button>
            <button onClick={reload}>Reload list</button>
          </div>
        </div>
        {preview && (
          <div style={{ marginTop: 12, borderTop:"1px solid #f3f4f6", paddingTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Preview</div>
            <div><b>Subject:</b> {preview.subject}</div>
            <pre style={{ whiteSpace:"pre-wrap", background:"#f9fafb", padding:12, borderRadius: 12 }}>{preview.body}</pre>
          </div>
        )}
      </Card>

      <Card title="Templates" right={<button onClick={reload}>Reload</button>}>
        {loading && <div>Loading...</div>}
        {err && <div style={{ color:"crimson" }}>{String(err.message || err)}</div>}
        {Array.isArray(data) && data.map((t) => (
          <div key={t.template_id} style={{ padding:"10px 0", borderTop:"1px solid #f3f4f6" }}>
            <div style={{ fontWeight: 800 }}><Pill>{t.template_id}</Pill>{t.subject}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={()=>{ setTemplateId(t.template_id); setSubject(t.subject); setBody(t.body); }}>Load</button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

function Campaigns() {
  const segs = useAsync(() => api("/v1/segments"), []);
  const temps = useAsync(() => api("/v1/templates"), []);
  const exps = useAsync(() => api("/v1/experiments/message"), []);
  const [segmentId, setSegmentId] = useState("");
  const [templateA, setTemplateA] = useState("");
  const [templateB, setTemplateB] = useState("");
  const [experimentId, setExperimentId] = useState("");
  const [provider, setProvider] = useState("ses");
  const [fromEmail, setFromEmail] = useState("noreply@example.com");
  const [maxRecipients, setMaxRecipients] = useState(200);
  const [result, setResult] = useState(null);

  async function send() {
    const r = await api("/v1/email/campaigns/send", { method:"POST", body:{
      name: "V286 캠페인",
      segment_id: segmentId,
      provider,
      from_email: fromEmail,
      template_a: templateA,
      template_b: templateB || undefined,
      experiment_id: experimentId || undefined,
      max_recipients: Number(maxRecipients||0)
    }});
    setResult(r);
  }

  return (
    <Card title="Email Campaign Send (A/B + Holdout)">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Segment</div>
          <select value={segmentId} onChange={(e)=>setSegmentId(e.target.value)} style={{ width:"100%" }}>
            <option value="">-- select --</option>
            {Array.isArray(segs.data) && segs.data.map(s => <option key={s.segment_id} value={s.segment_id}>{s.segment_id} • {s.name}</option>)}
          </select>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Tip: 먼저 “Recompute members”를 눌러 멤버를 계산하세요.
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Provider & From</div>
          <div style={{ display:"flex", gap:8 }}>
            <select value={provider} onChange={(e)=>setProvider(e.target.value)}>
              <option value="ses">SES</option>
              <option value="sendgrid">SendGrid</option>
            </select>
            <input value={fromEmail} onChange={(e)=>setFromEmail(e.target.value)} placeholder="from_email" style={{ flex:1 }} />
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Template A</div>
          <select value={templateA} onChange={(e)=>setTemplateA(e.target.value)} style={{ width:"100%" }}>
            <option value="">-- select --</option>
            {Array.isArray(temps.data) && temps.data.map(t => <option key={t.template_id} value={t.template_id}>{t.template_id} • {t.subject}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Template B (optional)</div>
          <select value={templateB} onChange={(e)=>setTemplateB(e.target.value)} style={{ width:"100%" }}>
            <option value="">-- none --</option>
            {Array.isArray(temps.data) && temps.data.map(t => <option key={t.template_id} value={t.template_id}>{t.template_id} • {t.subject}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Message Experiment (optional)</div>
          <input value={experimentId} onChange={(e)=>setExperimentId(e.target.value)} placeholder="experiment_id (HOLDOUT supported)" style={{ width:"100%" }} />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            experiment_id를 넣으면 HOLDOUT 포함 할당을 사용합니다(backend에서 결정론적 할당).
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Max recipients</div>
          <input type="number" value={maxRecipients} onChange={(e)=>setMaxRecipients(e.target.value)} style={{ width:"100%" }} />
        </div>
      </div>

      <div style={{ marginTop: 12, display:"flex", gap:8 }}>
        <button onClick={send} disabled={!segmentId || !templateA}>Send campaign</button>
        <button onClick={()=>{segs.reload(); temps.reload();}}>Reload lists</button>
      </div>

      {result && (
        <pre style={{ marginTop: 12, background:"#f9fafb", padding:12, borderRadius: 12 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </Card>
  );
}

function Connectors() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/connectors/accounts"), []);
  const plan = [
    { p: "Google Ads", why: "대부분 B2C/B2B 기본 채널, 지표/비용/전환 표준이 탄탄", order: 1 },
    { p: "Meta (Facebook/Instagram)", why: "리치 크리에이티브/캠페인 구조 다양, 증분실험 연동 가치 큼", order: 2 },
    { p: "Naver Search/SA", why: "KR 시장 핵심. 비용/전환 수집이 ROI 락인에 직접 기여", order: 3 },
    { p: "Kakao Moment/Bizmsg", why: "KR 리타겟/카카오 생태계. CRM/메시지와 결합 시 락인 강화", order: 4 },
  ];

  return (
    <>
      <Card title="Connector priority (V286 recommended)">
        {plan.map(x => (
          <div key={x.p} style={{ padding:"10px 0", borderTop:"1px solid #f3f4f6" }}>
            <div style={{ fontWeight: 800 }}>{x.order}. {x.p}</div>
            <div style={{ opacity: 0.8 }}>{x.why}</div>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          V286 코드에는 각 커넥터의 “실전 연동을 위한 플러그인 구조 + 계정/상태 관리”가 포함되어 있고,
          실제 OAuth/토큰/앱 등록은 고객 환경에 맞춰 설정합니다.
        </div>
      </Card>

      <Card title="Configured connector accounts" right={<button onClick={reload}>Reload</button>}>
        {loading && <div>Loading...</div>}
        {err && <div style={{ color:"crimson" }}>{String(err.message || err)}</div>}
        {Array.isArray(data) && data.length === 0 && <div style={{ opacity: 0.7 }}>No accounts.</div>}
        {Array.isArray(data) && data.map((a) => (
          <div key={`${a.provider}|${a.account_id}`} style={{ padding:"10px 0", borderTop:"1px solid #f3f4f6" }}>
            <div style={{ fontWeight: 800 }}><Pill>{a.provider}</Pill><Pill>{a.status}</Pill>{a.account_id}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>last_sync_at: {String(a.last_sync_at || "-")}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

function Experiments() {
  return (
    <Card title="Experiments (message / incrementality)">
      <div style={{ opacity: 0.8 }}>
        V286는 “메시지 실험(A/B + HOLDOUT)”과 “증분 실험(holdout lift)” API를 함께 사용하도록 설계되어 있습니다.
        실무에서는 메시지 실험으로 전송을 나누고, outcome(전환/매출)을 적재해 report에서 lift를 확인합니다.
      </div>
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        API 참고: <code>/v1/experiments/message</code>, <code>/v1/experiments/message/:id/allocate</code>,
        <code>/v1/roi/experiments</code>, <code>/v1/roi/experiments/:id/report</code>
      </div>
    </Card>
  );
}

export default function App() {
  const [tab, setTab] = useState("executions");

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system", background: "#f3f4f6", minHeight: "100vh", padding: 18 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>GENIE_ROI V286 Dashboard</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>tenant: <b>{DEFAULT_TENANT}</b> • api: <b>{API_BASE}</b></div>
          </div>
        </div>

        <Nav tab={tab} setTab={setTab} />

        {tab === "executions" && <Executions />}
        {tab === "approvals" && <Approvals />}
        {tab === "roi" && <ROI />}
        {tab === "segments" && <Segments />}
        {tab === "templates" && <Templates />}
        {tab === "campaigns" && <Campaigns />}
        {tab === "connectors" && <Connectors />}
        {tab === "experiments" && <Experiments />}
      </div>
    </div>
  );
}
