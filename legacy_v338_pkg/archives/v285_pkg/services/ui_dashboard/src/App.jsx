import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const DEFAULT_TENANT = import.meta.env.VITE_TENANT_ID || "-tenant";
const DEFAULT_KEY = import.meta.env.VITE_API_KEY || "";

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json", "X-Tenant-ID": DEFAULT_TENANT };
  if (DEFAULT_KEY) headers["X-API-Key"] = DEFAULT_KEY;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

function Card({ title, children }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, marginBottom: 12, background: "white" }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, background: "#f3f4f6", fontSize: 12, marginRight: 8 }}>
      {children}
    </span>
  );
}

function useAsync(loadFn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr(null);
    loadFn()
      .then((d) => mounted && setData(d))
      .catch((e) => mounted && setErr(e))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, err, loading, reload: () => loadFn().then(setData).catch(setErr) };
}

function Executions() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/executions?limit=50"), []);
  return (
    <Card title="Executions (최근 50건)">
      <div style={{ marginBottom: 8 }}>
        <button onClick={reload}>Reload</button>
      </div>
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
    setNote("");
    reload();
  }
  return (
    <Card title="Pending Approvals">
      <div style={{ marginBottom: 8 }}>
        <button onClick={reload}>Reload</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="decision note (optional)" style={{ width: 360 }} />
      </div>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {Array.isArray(data) && data.length === 0 && <div style={{ opacity: 0.7 }}>No pending approvals.</div>}
      {Array.isArray(data) && data.map((x) => (
        <div key={x.approval_id} style={{ padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 700 }}><Pill>{x.provider}</Pill><Pill>{x.action_type}</Pill><Pill>{x.status}</Pill></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{x.approval_id} / {x.execution_id}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => decide(x.approval_id, x.execution_id, "APPROVED")}>Approve</button>
            <span style={{ marginRight: 8 }} />
            <button onClick={() => decide(x.approval_id, x.execution_id, "REJECTED")}>Reject</button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function ROISummary() {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const [range, setRange] = useState({ from, to });
  const { data, err, loading, reload } = useAsync(() => api(`/v1/roi/summary?from=${range.from}&to=${range.to}`), [range.from, range.to]);
  return (
    <Card title="ROI Summary">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        <button onClick={reload}>Reload</button>
      </div>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {data && (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </Card>
  );
}

function Segments() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/segments"), []);
  const [name, setName] = useState("");
  const [def, setDef] = useState('{"filters":[{"field":"email","op":"contains","value":"@example.com"}]}');

  async function create() {
    const definition = JSON.parse(def);
    await api("/v1/segments", { method: "POST", body: { name, definition } });
    setName("");
    reload();
  }
  async function recompute(id) {
    await api(`/v1/segments/${id}/recompute`, { method: "POST", body: {} });
    reload();
  }

  return (
    <Card title="Segments">
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr auto", gap: 8, marginBottom: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="segment name" />
        <input value={def} onChange={(e) => setDef(e.target.value)} placeholder='definition json' />
        <button onClick={create} disabled={!name}>Create</button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={reload}>Reload</button>
      </div>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {Array.isArray(data) && data.map((x) => (
        <div key={x.segment_id} style={{ padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 700 }}>{x.name} <Pill>{x.segment_id}</Pill></div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => recompute(x.segment_id)}>Recompute members</button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function Connectors() {
  const { data, err, loading, reload } = useAsync(() => api("/v1/connectors/accounts"), []);
  const [provider, setProvider] = useState("google_ads");
  const [accountId, setAccountId] = useState("");
  const [config, setConfig] = useState('{"dry_run":true}');

  async function upsert() {
    await api("/v1/connectors/accounts", { method: "POST", body: { provider, account_id: accountId, config: JSON.parse(config), status: "ACTIVE" } });
    reload();
  }

  return (
    <Card title="Connector Accounts">
      <div style={{ display: "grid", gridTemplateColumns: "160px 180px 1fr auto", gap: 8, marginBottom: 10 }}>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="provider" />
        <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="account_id" />
        <input value={config} onChange={(e) => setConfig(e.target.value)} placeholder='config json' />
        <button onClick={upsert}>Upsert</button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={reload}>Reload</button>
      </div>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {Array.isArray(data) && data.map((x, idx) => (
        <div key={idx} style={{ padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 700 }}><Pill>{x.provider}</Pill> <Pill>{x.account_id}</Pill> <Pill>{x.status}</Pill></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>last_sync_at: {String(x.last_sync_at || "-")}</div>
        </div>
      ))}
    </Card>
  );
}

function Experiments() {
  const [expId, setExpId] = useState("");
  const [name, setName] = useState("Welcome Email Test");
  const [variants, setVariants] = useState('[{"id":"A","weight":1},{"id":"B","weight":1}]');
  const [holdout, setHoldout] = useState(10);
  const [contactId, setContactId] = useState("c_001");
  const [alloc, setAlloc] = useState(null);
  const [err, setErr] = useState(null);

  async function upsert() {
    setErr(null);
    const data = await api("/v1/experiments/message", { method: "POST", body: { experiment_id: expId || undefined, name, channel:"email", status:"RUNNING", holdout_pct: Number(holdout), variants: JSON.parse(variants), policy:{} } });
    setExpId(data.experiment_id);
  }
  async function allocate() {
    setErr(null);
    const data = await api(`/v1/experiments/message/${expId}/allocate`, { method: "POST", body: { contact_id: contactId } });
    setAlloc(data);
  }

  return (
    <Card title="Message Experiments (A/B + Holdout)">
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 120px auto", gap: 8, marginBottom: 10 }}>
        <input value={expId} onChange={(e)=>setExpId(e.target.value)} placeholder="experiment_id (optional)" />
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="name" />
        <input type="number" value={holdout} onChange={(e)=>setHoldout(e.target.value)} />
        <button onClick={upsert}>Upsert</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <input value={variants} onChange={(e)=>setVariants(e.target.value)} style={{ width: "100%" }} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input value={contactId} onChange={(e)=>setContactId(e.target.value)} placeholder="contact_id" />
        <button onClick={allocate} disabled={!expId}>Allocate</button>
      </div>

      {err && <div style={{ color: "crimson" }}>{String(err.message || err)}</div>}
      {alloc && <pre style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{JSON.stringify(alloc, null, 2)}</pre>}
    </Card>
  );
}

export default function App() {
  const tabs = useMemo(() => ([
    { id: "executions", label: "Executions", el: <Executions /> },
    { id: "approvals", label: "Approvals", el: <Approvals /> },
    { id: "roi", label: "ROI", el: <ROISummary /> },
    { id: "segments", label: "Segments", el: <Segments /> },
    { id: "connectors", label: "Connectors", el: <Connectors /> },
    { id: "experiments", label: "Experiments", el: <Experiments /> },
  ]), []);
  const [tab, setTab] = useState("executions");
  const current = tabs.find((t) => t.id === tab) || tabs[0];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>GENIE_ROI V285</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Tenant: <b>{DEFAULT_TENANT}</b></div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>API: {API_BASE}</div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <div style={{ width: 220 }}>
            <Card title="Menu">
              <div style={{ display: "grid", gap: 8 }}>
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: tab === t.id ? "#111827" : "white",
                    color: tab === t.id ? "white" : "#111827",
                    cursor: "pointer",
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Auth">
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                VITE_TENANT_ID / VITE_API_KEY 환경변수로 로그인 구성<br />
                (또는 Gateway의 /v1/admin/bootstrap로 admin 키 발급)
              </div>
            </Card>
          </div>

          <div style={{ flex: 1 }}>
            {current.el}
          </div>
        </div>
      </div>
    </div>
  );
}
