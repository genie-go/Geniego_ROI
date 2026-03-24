import React, { useEffect, useMemo, useState } from "react";
import ErrorGuideCard from "../components/ErrorGuideCard.jsx";
import { getJsonAuthWithHeaders, postJsonAuth, requestJsonAuth } from "../services/apiClient.js";

function parseHttpError(e) {
  const s = String(e?.message ?? e ?? "");
  const m = s.match(/HTTP\s+\d+\s+(\{[\s\S]*\})$/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export default function DLQ() {
  const [token, setToken] = useState(localStorage.getItem("accessToken") || "");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState(null);

  const [selected, setSelected] = useState(() => new Set());
  const [filterProvider, setFilterProvider] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRetryable, setFilterRetryable] = useState(true);

  const [schedule, setSchedule] = useState(null);
  const [scheduleErr, setScheduleErr] = useState(null);

  const [replayOut, setReplayOut] = useState(null);
  const [replayErr, setReplayErr] = useState(null);

  async function load() {
    try {
      setErr(null);
      const qs = new URLSearchParams({
        limit: "200",
        offset: "0",
      });
      if (filterProvider) qs.set("provider", filterProvider);
      if (filterCategory) qs.set("category", filterCategory);
      if (filterRetryable) qs.set("retryable", "true");

      const data = await getJsonAuthWithHeaders(`/v398/admin/dlq?${qs.toString()}`);
      setRows(data.items || []);
      setTotal(data.total || 0);
      setSelected(new Set());
    } catch (e) {
      setErr(String(e));
    }
  }

  async function loadSchedule() {
    try {
      setScheduleErr(null);
      const s = await getJsonAuthWithHeaders("/v398/admin/dlq/schedule");
      setSchedule(s);
    } catch (e) {
      setScheduleErr(String(e));
    }
  }

  useEffect(() => { load(); loadSchedule(); }, []);

  async function replay(r) {
    setReplayOut(null);
    setReplayErr(null);
    localStorage.setItem("accessToken", token || "");
    try {
      const out = await postJsonAuth("/v398/admin/dlq/replay", { id: r.id }, token ? { "X-Access-Token": token } : {});
      setReplayOut(out);
      await load();
    } catch (e) {
      setReplayErr(parseHttpError(e));
    }
  }

  function toggle(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(rows.map(r => r.id)));
  }

  function clearSel() {
    setSelected(new Set());
  }

  async function replaySelected() {
    setReplayOut(null);
    setReplayErr(null);
    localStorage.setItem("accessToken", token || "");
    try {
      const out = await postJsonAuth(
        "/v398/admin/dlq/replay_bulk",
        { ids: Array.from(selected), limit: 200 },
        token ? { "X-Access-Token": token } : {}
      );
      setReplayOut(out);
      await load();
    } catch (e) {
      setReplayErr(parseHttpError(e));
    }
  }

  async function deleteSelected() {
    try {
      setErr(null);
      await requestJsonAuth("/v398/admin/dlq", "DELETE", { ids: Array.from(selected) });
      await load();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function saveSchedule() {
    try {
      setScheduleErr(null);
      const out = await requestJsonAuth("/v398/admin/dlq/schedule", "PUT", schedule);
      setSchedule(out);
    } catch (e) {
      setScheduleErr(String(e));
    }
  }

  const tableRows = useMemo(() => rows.map(r => ({
    ...r,
    ts: r.ts ? new Date(r.ts * 1000).toISOString() : "",
  })), [rows]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Dead-letter Queue</h2>
        <p className="sub" style={{ marginTop: 0 }}>
          Requests that finally failed the retry policy accumulate as JSONL. Insert token and Replay to re-call the same requests.
        </p>
      </div>

      <div className="card" style={{ padding: 12, borderRadius: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800 }}>Replay Token</div>
          <input value={token} onChange={(e)=>setToken(e.target.value)} placeholder="X-Access-Token (raw token)" style={{ minWidth: 380, padding: 10, borderRadius: 10 }} />
          <button onClick={load}>Refresh</button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input value={filterProvider} onChange={(e)=>setFilterProvider(e.target.value)} placeholder="provider filter" style={{ padding: 10, borderRadius: 10 }} />
            <input value={filterCategory} onChange={(e)=>setFilterCategory(e.target.value)} placeholder="category filter (e.g. QUOTA)" style={{ padding: 10, borderRadius: 10 }} />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={filterRetryable} onChange={(e)=>setFilterRetryable(e.target.checked)} />
              retryable only
            </label>
            <button onClick={load}>Apply</button>
          </div>
          <div className="sub">Total lines: {total}</div>
        </div>
        {err ? <div className="sub" style={{ marginTop: 10 }}>Error: {err}</div> : null}
      </div>

      <div className="card" style={{ padding: 12, borderRadius: 18 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>Bulk Actions</div>
          <div className="pill">selected: {selected.size}</div>
          <button onClick={selectAll}>Select all</button>
          <button onClick={clearSel}>Clear</button>
          <button onClick={replaySelected} disabled={selected.size === 0}>Replay selected</button>
          <button onClick={deleteSelected} disabled={selected.size === 0}>Delete selected</button>
          <div className="sub">(Delete rewrites the DLQ file. IDs will be re-sorted after deletion)</div>
        </div>
      </div>

      <div className="card" style={{ padding: 12, borderRadius: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>Scheduled Replay (nightly)</div>
          {schedule ? (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={!!schedule.enabled} onChange={(e)=>setSchedule({ ...schedule, enabled: e.target.checked })} />
                enabled
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="sub">hour_utc</span>
                <input type="number" min="0" max="23" value={schedule.hour_utc} onChange={(e)=>setSchedule({ ...schedule, hour_utc: Number(e.target.value) })} style={{ width: 80, padding: 10, borderRadius: 10 }} />
              </label>
              <input value={(schedule.categories || []).join(",")} onChange={(e)=>setSchedule({ ...schedule, categories: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} placeholder="categories (comma)" style={{ padding: 10, borderRadius: 10, minWidth: 260 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="sub">max</span>
                <input type="number" min="1" max="1000" value={schedule.max_items} onChange={(e)=>setSchedule({ ...schedule, max_items: Number(e.target.value) })} style={{ width: 100, padding: 10, borderRadius: 10 }} />
              </label>
              <button onClick={saveSchedule}>Save</button>
              <button onClick={loadSchedule}>Reload</button>
              <div className="sub">Activated when ENABLE_NIGHTLY_DLQ_REPLAY=1 on the server.</div>
            </>
          ) : <div className="sub">Loading schedule…</div>}
        </div>
        {scheduleErr ? <div className="sub" style={{ marginTop: 10 }}>Error: {scheduleErr}</div> : null}
      </div>

      {replayErr ? <ErrorGuideCard errorDetail={replayErr} /> : null}
      {replayOut ? (
        <details className="card" style={{ borderRadius: 18 }}>
          <summary style={{ fontWeight: 800 }}>Replay Response</summary>
          <pre className="code">{JSON.stringify(replayOut, null, 2)}</pre>
        </details>
      ) : null}

      <div className="card" style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>DLQ Items</h3>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>ID</th>
              <th>TS</th>
              <th>Provider</th>
              <th>Endpoint</th>
              <th>Category</th>
              <th>Retryable</th>
              <th>HTTP</th>
              <th>Payload preview</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td>{r.id}</td>
                <td>{r.ts}</td>
                <td>{r.provider}</td>
                <td>{r.endpoint}</td>
                <td>{r.category}</td>
                <td>{String(!!r.retryable)}</td>
                <td>{String(r.http_status ?? "")}</td>
                <td style={{ maxWidth: 520 }}>{r.payload_preview}</td>
                <td><button onClick={() => replay(r)}>Replay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
