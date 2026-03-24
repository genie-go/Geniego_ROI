import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const DEFAULT_TENANT = import.meta.env.VITE_TENANT_ID || "demo-tenant";
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
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("executions");
  const [error, setError] = useState("");
  const [executions, setExecutions] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [roi, setRoi] = useState(null);

  const tabs = useMemo(
    () => [
      { id: "executions", name: "Executions" },
      { id: "approvals", name: "Approvals" },
      { id: "roi", name: "ROI Summary" },
    ],
    []
  );

  useEffect(() => {
    setError("");
    (async () => {
      try {
        if (tab === "executions") {
          const d = await api("/v1/executions?limit=50");
          setExecutions(d.items || []);
        } else if (tab === "approvals") {
          const d = await api("/v1/approvals/pending");
          setApprovals(d.items || []);
        } else if (tab === "roi") {
          const to = new Date();
          const from = new Date(to.getTime() - 6 * 24 * 3600 * 1000);
          const fmt = (x) => x.toISOString().slice(0, 10);
          const d = await api(`/v1/roi/summary?from=${fmt(from)}&to=${fmt(to)}`);
          setRoi(d);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [tab]);

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>GENIE_ROI V284 Dashboard</div>
          <div style={{ opacity: 0.7, marginTop: 2 }}>
            Tenant: <b>{DEFAULT_TENANT}</b> · API: <code>{API_BASE}</code>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "1px solid #ccc",
                background: tab === t.id ? "#eee" : "white",
                cursor: "pointer",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {!DEFAULT_KEY && (
        <Card title="API Key needed">
          <div style={{ lineHeight: 1.5 }}>
            Set <code>VITE_API_KEY</code> (and optionally <code>VITE_TENANT_ID</code>, <code>VITE_API_BASE</code>) in
            your environment, then run <code>npm run dev</code>.
          </div>
        </Card>
      )}

      {error && <Card title="Error"><div style={{ color: "crimson" }}>{error}</div></Card>}

      {tab === "executions" && (
        <Card title="Latest executions">
          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>ID</th><th>Channel</th><th>Action</th><th>Status</th><th>Policy</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((x) => (
                <tr key={x.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular", fontSize: 12 }}>{x.id}</td>
                  <td>{x.channel}</td>
                  <td>{x.action_type}</td>
                  <td><b>{x.status}</b></td>
                  <td style={{ fontSize: 12 }}>v{x.policy_version}</td>
                  <td style={{ fontSize: 12 }}>{String(x.created_at).slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "approvals" && (
        <Card title="Pending approvals">
          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>ID</th><th>Action</th><th>Requested by</th><th>Steps</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ fontFamily: "ui-monospace, SFMono-Regular", fontSize: 12 }}>{a.id}</td>
                  <td>{a.action_type}</td>
                  <td>{a.requested_by}</td>
                  <td>{a.current_step}/{a.required_steps}</td>
                  <td style={{ fontSize: 12 }}>{String(a.created_at).slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "roi" && (
        <Card title="ROI summary (last 7 days)">
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{roi ? JSON.stringify(roi, null, 2) : "Loading..."}</pre>
        </Card>
      )}
    </div>
  );
}
