import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useT } from '../i18n/index.js';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useNavigate } from 'react-router-dom';

const API = "/api";

const NODE_COLORS = {
  influencer: "#a855f7",
  creative:   "#06b6d4",
  sku:        "#f97316",
  order:      "#22c55e",
};
const DEFAULT_WEIGHTS = { influencer: 1.0, creative: 1.0, sku: 1.0, order: 1.0 };

/* ── Production: all mock/demo data permanently purged ── */

/* ── Auth Token ─────────────────────────────────────────────────────────────── */
function getAuthToken() {
  try { return localStorage.getItem('g_token') || ''; } catch { return ''; }
}

async function apiFetch(path) {
  const r = await fetch(path, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const Badge = ({ label, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
    {label}
  </span>
);

const ScoreBar = ({ value, max = 10 }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 0.001)) * 100));
  const color = pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#f97316";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontWeight: 700, color, fontSize: 11, minWidth: 36 }}>{value?.toFixed(2)}</span>
    </div>
  );
};

const NodeBadge = ({ type }) => <Badge label={type} color={NODE_COLORS[type] || "#64748b"} />;

/* ── CSV Export ──────────────────────────────────────────────────────────────── */
function downloadCsv(headers, rows, filename) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Weight Settings Modal ──────────────────────────────────────────────────── */
function WeightSettingsModal({ weights, onApply, onClose, t }) {
  const [local, setLocal] = useState({ ...weights });
  const set = (k, v) => setLocal(prev => ({ ...prev, [k]: Math.max(0, Math.min(10, parseFloat(v) || 0)) }));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 20, padding: '28px 24px', maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>⚙️</div>
        <div style={{ fontWeight: 900, fontSize: 18, textAlign: 'center', color: '#1e293b', marginBottom: 4 }}>{t('graphScore.weightSettings')}</div>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>{t('graphScore.weightSettingsDesc')}</div>
        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          {[['influencer','#a855f7'],['creative','#06b6d4'],['sku','#f97316'],['order','#22c55e']].map(([k,c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#334155', flex: 1, fontWeight: 600 }}>{t(`graphScore.weight${k.charAt(0).toUpperCase()+k.slice(1)}`)}</span>
              <input type="range" min="0" max="10" step="0.1" value={local[k]} onChange={e => set(k, e.target.value)} style={{ width: 100 }} />
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: c, fontSize: 13, minWidth: 30, textAlign: 'right' }}>{local[k].toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setLocal({ ...DEFAULT_WEIGHTS })} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>{t('graphScore.weightReset')}</button>
          <button onClick={() => { onApply(local); onClose(); }} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#ffffff', fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }}>{t('graphScore.weightApply')}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Connected Channels Badge ───────────────────────────────────────────────── */
function ConnectedChannelsBadge({ t }) {
  const { connectedChannels = [], isConnected } = useConnectorSync();
  const navigate = useNavigate();
  if (!connectedChannels.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 11 }}>
        <span>⚠️</span>
        <span style={{ color: '#eab308', fontWeight: 600 }}>{t('graphScore.noConnectedChannels')}</span>
        <button onClick={() => navigate('/integration-hub')} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#ffffff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{t('graphScore.goIntegrationHub')}</button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '6px 10px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 10 }}>
      <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 11 }}>🔗 {t('graphScore.connectedChannels')}:</span>
      {connectedChannels.map(ch => (
        <span key={ch.key || ch.platform} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>{ch.platform || ch.key}</span>
      ))}
    </div>
  );
}

/* ── Tab: Summary ──────────────────────────────────────────────────────────── */
function SummaryTab({ weights }) {
  const t = useT();
  const [data, setData] = useState(null);
  const load = async () => {
    try { const d = await apiFetch(`${API}/v419/graph/summary`); setData(d || {}); }
    catch { setData({}); }
  };
  useEffect(() => { load(); }, []);
  if (!data) return <div className="sub" style={{ padding: 24 }}>{t('graphScore.loading')}</div>;

  const applyWeight = (val, type) => (parseFloat(val) || 0) * (weights[type] || 1);
  const maxInfW = Math.max(...(data.top_influencers || []).map(r => applyWeight(r.total_weight, 'influencer')), 1);
  const maxCreW = Math.max(...(data.top_creatives || []).map(r => applyWeight(r.total_weight, 'creative')), 1);
  const maxSkuW = Math.max(...(data.top_skus || []).map(r => applyWeight(r.total_weight, 'sku')), 1);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {["influencer", "creative", "sku", "order"].map(type => {
          const cnt = (data?.node_counts || []).find(n => n.node_type === type);
          return (
            <div key={type} className="kpi-card" style={{ borderLeft: `3px solid ${NODE_COLORS[type]}`, "--accent": NODE_COLORS[type] }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2, fontWeight: 700 }}>{t(`graphScore.lbl_${type}`) || type.toUpperCase()}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: NODE_COLORS[type] }}>{cnt?.cnt ?? 0}</div>
              <div className="sub" style={{ fontSize: 10 }}>{t('graphScore.nodes')}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginBottom: 16, fontSize: 12, color: "#334155" }}>
        {t('graphScore.totalEdge')} <b style={{ color: "#1e293b", fontSize: 16, fontWeight: 800 }}>{data.total_edges || 0}</b> {t('graphScore.countUnit')}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[
          { title: `🤝 ${t('graphScore.topInfluencer')}`, rows: data.top_influencers, maxW: maxInfW, type: "influencer" },
          { title: `🎬 ${t('graphScore.topCreative')}`, rows: data.top_creatives, maxW: maxCreW, type: "creative" },
          { title: `📦 ${t('graphScore.topSku')}`, rows: data.top_skus, maxW: maxSkuW, type: "sku" },
        ].map(({ title, rows, maxW, type }) => (
          <div key={type} className="card" style={{ borderTop: `2px solid ${NODE_COLORS[type]}` }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12, color: NODE_COLORS[type] }}>{title}</div>
            {(rows || []).map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", color: NODE_COLORS[type], fontWeight: 600 }}>{r.id}</span>
                  <span style={{ color: "#64748b" }}>{r.edge_count}{t('graphScore.unitCount')}</span>
                </div>
                <ScoreBar value={applyWeight(r.total_weight, type)} max={maxW} />
              </div>
            ))}
            {!rows?.length && <div className="sub" style={{ fontSize: 11 }}>{t('graphScore.noData')}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Graph Browser ────────────────────────────────────────────────────── */
function GraphBrowserTab({ onExport }) {
  const t = useT();
  const [edges, setEdges] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    try { const d = await apiFetch(`${API}/v419/graph/edges`); setEdges(d.edges || []); }
    catch { setEdges([]); }
  };
  useEffect(() => { load(); }, []);

  const filteredEdges = filter
    ? edges.filter(e => e.src_id.includes(filter) || e.dst_id.includes(filter))
    : edges.slice(0, 100);

  const handleExportCsv = () => {
    const headers = [t('graph.sourceNode'), 'src_type', t('graph.targetNode'), 'dst_type', t('graph.weight'), t('graphScore.label')];
    const rows = filteredEdges.map(e => [e.src_id, e.src_type, e.dst_id, e.dst_type, e.edge_weight, e.edge_label || '']);
    downloadCsv(headers, rows, `graph_edges_${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="input" placeholder={t("graphScore.phNodeIdFilter")} value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="btn" onClick={load}>↺ {t('refresh') || "Refresh"}</button>
        <button className="btn" onClick={handleExportCsv} title={t('graphScore.exportCsv')}>📥 {t('graphScore.exportCsv')}</button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>{t("graph.sourceNode")}</th><th style={{ textAlign: "center" }}>→</th>
            <th>{t("graph.targetNode")}</th><th style={{ textAlign: "right" }}>{t("graph.weight")}</th><th>{t('graphScore.label')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredEdges.map((e, i) => (
            <tr key={i}>
              <td><NodeBadge type={e.src_type} />{" "}<span style={{ fontFamily: "monospace", color: NODE_COLORS[e.src_type] }}>{e.src_id}</span></td>
              <td style={{ textAlign: "center", color: "#64748b" }}>→</td>
              <td><NodeBadge type={e.dst_type} />{" "}<span style={{ fontFamily: "monospace", color: NODE_COLORS[e.dst_type] }}>{e.dst_id}</span></td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{parseFloat(e.edge_weight).toFixed(2)}</td>
              <td style={{ color: "#64748b" }}>{e.edge_label ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredEdges.length && <div className="sub" style={{ padding: 24, textAlign: "center" }}>{t("graphScore.noEdge")}</div>}
    </div>
  );
}

/* ── Tab: Influencer Score ──────────────────────────────────────────────────── */
function InfluencerScoreTab({ nodes, weights }) {
  const t = useT();
  const influencers = (nodes || []).filter(n => n.node_type === "influencer");
  const [sel, setSel] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const doFetch = async () => {
    const id = sel.trim();
    if (!id) return;
    setLoading(true);
    try { const r = await apiFetch(`${API}/v419/graph/score/influencer/${encodeURIComponent(id)}`); setResult(r); }
    catch { setResult(null); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input list="inf-list" className="input" placeholder={t("graphScore.phInfId")} value={sel} onChange={e => setSel(e.target.value)} style={{ flex: 1 }} />
        <datalist id="inf-list">{influencers.map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}</datalist>
        <button className="btn-primary" onClick={doFetch} disabled={loading || !sel}>{loading ? "⏳" : `🔍 ${t('graphScore.analysis')}`}</button>
      </div>
      {result && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: t("graphScore.graphScoreLabel"), value: ((result.graph_score || 0) * 100 * (weights.influencer || 1)).toFixed(1) + "%", color: "#a855f7" },
              { label: t("graphScore.connectedSku"), value: result.skus_reached?.length ?? 0, color: "#f97316" },
              { label: t("graphScore.connectedOrders"), value: result.orders_reached?.length ?? 0, color: "#22c55e" },
            ].map(({ label, value, color }) => (
              <div key={label} className="kpi-card" style={{ borderLeft: `3px solid ${color}`, "--accent": color }}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value" style={{ color, fontSize: 22 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{t("graphScore.contribPath") || t("graph.contribPath")}</div>
          {result.paths?.length ? (
            <table className="table">
              <thead><tr>{[t("graph.inf"), t("graph.crt"), t("graph.sku"), t("graph.ord"), t("graph.pathW")].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {result.paths.slice(0, 30).map((p, i) => (
                  <tr key={i}>
                    <td><NodeBadge type="influencer" /> {p.influencer}</td>
                    <td style={{ fontFamily: "monospace", color: "#06b6d4" }}>{p.creative ?? "—"}</td>
                    <td style={{ fontFamily: "monospace", color: "#f97316" }}>{p.sku ?? "—"}</td>
                    <td style={{ fontFamily: "monospace", color: "#22c55e" }}>{p.order}</td>
                    <td style={{ fontWeight: 700 }}>{p.path_weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="sub" style={{ fontSize: 12 }}>{t("graphScore.noPath") || t("graph.noPath")}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Tab: SKU Score ─────────────────────────────────────────────────────────── */
function SkuScoreTab({ nodes, weights }) {
  const t = useT();
  const skus = (nodes || []).filter(n => n.node_type === "sku");
  const [sel, setSel] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const doFetch = async () => {
    const id = sel.trim();
    if (!id) return;
    setLoading(true);
    try { const r = await apiFetch(`${API}/v419/graph/score/sku/${encodeURIComponent(id)}`); setResult(r); }
    catch { setResult(null); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input list="sku-list" className="input" placeholder={t("graphScore.phSkuId")} value={sel} onChange={e => setSel(e.target.value)} style={{ flex: 1 }} />
        <datalist id="sku-list">{skus.map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}</datalist>
        <button className="btn-primary" onClick={doFetch} disabled={loading || !sel}>{loading ? "⏳" : `🔍 ${t('graphScore.analysis')}`}</button>
      </div>
      {result && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            <div className="kpi-card" style={{ borderLeft: "3px solid #06b6d4", "--accent": "#06b6d4" }}>
              <div className="kpi-label">{t("graphScore.connectedCreatives") || t("graph.contribCreative")}</div>
              <div className="kpi-value" style={{ color: "#06b6d4", fontSize: 22 }}>{result.creatives_used}</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: "3px solid #22c55e", "--accent": "#22c55e" }}>
              <div className="kpi-label">{t("graphScore.connectedOrders")}</div>
              <div className="kpi-value" style={{ color: "#22c55e", fontSize: 22 }}>{result.orders_linked}</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: "3px solid #a855f7", "--accent": "#a855f7" }}>
              <div className="kpi-label">{t("graphScore.connectedInfluencers") || t("graph.contribInfluencer")}</div>
              <div className="kpi-value" style={{ color: "#a855f7", fontSize: 22 }}>{result.top_influencers?.length ?? 0}</div>
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{t("graph.topInfluencer")}</div>
          {(result.top_influencers || []).map((inf, i) => (
            <div key={i} className="stat-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#64748b", width: 20, textAlign: "center" }}>{["🥇","🥈","🥉"][i] || `${i+1}`}</span>
                <span style={{ color: "#a855f7", fontFamily: "monospace", fontWeight: 600 }}>{inf.influencer_id}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 80, height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (inf.contribution_weight / 10) * 100)}%`, height: "100%", background: "#a855f7", borderRadius: 4 }} />
                </div>
                <span style={{ fontWeight: 700, color: "#a855f7", fontSize: 12 }}>{inf.contribution_weight}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Creative Score (NEW) ─────────────────────────────────────────────── */
function CreativeScoreTab({ nodes, weights }) {
  const t = useT();
  const creatives = (nodes || []).filter(n => n.node_type === "creative");
  const [sel, setSel] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const doFetch = async () => {
    const id = sel.trim();
    if (!id) return;
    setLoading(true);
    try { const r = await apiFetch(`${API}/v419/graph/score/creative/${encodeURIComponent(id)}`); setResult(r); }
    catch { setResult(null); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input list="crt-list" className="input" placeholder={t("graphScore.phCreativeId")} value={sel} onChange={e => setSel(e.target.value)} style={{ flex: 1 }} />
        <datalist id="crt-list">{creatives.map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}</datalist>
        <button className="btn-primary" onClick={doFetch} disabled={loading || !sel}>{loading ? "⏳" : `🔍 ${t('graphScore.analysis')}`}</button>
      </div>
      {result && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: t("graphScore.graphScoreLabel"), value: ((result.graph_score || 0) * 100 * (weights.creative || 1)).toFixed(1) + "%", color: "#06b6d4" },
              { label: t("graphScore.connectedSku"), value: result.skus_reached?.length ?? result.skus_linked ?? 0, color: "#f97316" },
              { label: t("graphScore.connectedInfluencers"), value: result.influencers_linked ?? 0, color: "#a855f7" },
              { label: t("graphScore.connectedOrders"), value: result.orders_reached?.length ?? result.orders_linked ?? 0, color: "#22c55e" },
            ].map(({ label, value, color }) => (
              <div key={label} className="kpi-card" style={{ borderLeft: `3px solid ${color}`, "--accent": color }}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value" style={{ color, fontSize: 22 }}>{value}</div>
              </div>
            ))}
          </div>
          {result.paths?.length ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{t("graphScore.contribPath") || t("graph.contribPath")}</div>
              <table className="table">
                <thead><tr>{[t("graph.inf"), t("graph.crt"), t("graph.sku"), t("graph.ord"), t("graph.pathW")].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {result.paths.slice(0, 30).map((p, i) => (
                    <tr key={i}>
                      <td><NodeBadge type="influencer" /> {p.influencer ?? "—"}</td>
                      <td style={{ fontFamily: "monospace", color: "#06b6d4" }}>{p.creative}</td>
                      <td style={{ fontFamily: "monospace", color: "#f97316" }}>{p.sku ?? "—"}</td>
                      <td style={{ fontFamily: "monospace", color: "#22c55e" }}>{p.order ?? "—"}</td>
                      <td style={{ fontWeight: 700 }}>{p.path_weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <div className="sub" style={{ fontSize: 12 }}>{t("graphScore.noPath") || t("graph.noPath")}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Guide ────────────────────────────────────────────────────────────── */
function GuideTab() {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(6,182,212,0.08))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 44 }}>🕸️</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('graphScore.guideTitle')}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 700, margin: '6px auto 0', lineHeight: 1.7 }}>{t('graphScore.guideSub')}</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('graphScore.guideStepsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {[{n:'1️⃣',k:'guideStep1',c:'#a855f7'},{n:'2️⃣',k:'guideStep2',c:'#06b6d4'},{n:'3️⃣',k:'guideStep3',c:'#f97316'},{n:'4️⃣',k:'guideStep4',c:'#22c55e'},{n:'5️⃣',k:'guideStep5',c:'#4f8ef7'},{n:'6️⃣',k:'guideStep6',c:'#f472b6'}].map((s,i) => (
            <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{s.n}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`graphScore.${s.k}Title`)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{t(`graphScore.${s.k}Desc`)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('graphScore.guideTabsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          {[{icon:'📊',k:'guideSummary',c:'#a855f7'},{icon:'🔍',k:'guideBrowser',c:'#06b6d4'},{icon:'🤝',k:'guideInfluencer',c:'#f97316'},{icon:'📦',k:'guideSku',c:'#22c55e'},{icon:'🎬',k:'guideCreative',c:'#f472b6'}].map((tb,i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`graphScore.${tb.k}Name`)}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, lineHeight: 1.6 }}>{t(`graphScore.${tb.k}Desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 20, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('graphScore.guideTipsTitle')}</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#64748b', lineHeight: 2.2 }}>
          {[1,2,3,4,5].map(i => <li key={i}>{t(`graphScore.guideTip${i}`)}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ── Security Lock Modal ───────────────────────────────────────────────────── */
function SecurityLockModal({ t, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, maxWidth: 380, textAlign: 'center', boxShadow: '0 24px 64px rgba(239,68,68,0.12)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: '#ef4444', marginBottom: 8 }}>{t('graphScore.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>{t('graphScore.secLockDesc')}</div>
        <button onClick={onDismiss} style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{t('graphScore.dismiss')}</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export default function GraphScore() {
  const t = useT();
  const { addAlert, broadcastUpdate, isDemo } = useGlobalData();
  const navigate = useNavigate();

  /* Security Guard */
  const [secLocked, setSecLocked] = useState(false);
  useSecurityGuard({
    addAlert: useCallback((a) => {
      if (typeof addAlert === 'function') addAlert(a);
      if (a?.severity === 'critical') setSecLocked(true);
    }, [addAlert]),
    enabled: true,
  });

  /* BroadcastChannel — cross-tab sync */
  const bcRef = useRef(null);
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('geniego_graph_score');
      bcRef.current.onmessage = (ev) => {
        if (ev.data?.type === 'GRAPH_REFRESH') loadNodes();
      };
    } catch { /* BroadcastChannel unsupported */ }
    return () => { try { bcRef.current?.close(); } catch {} };
  }, []);

  const broadcastRefresh = useCallback(() => {
    try { bcRef.current?.postMessage({ type: 'GRAPH_REFRESH', ts: Date.now() }); } catch {}
    if (typeof broadcastUpdate === 'function') broadcastUpdate('graphScore', { refreshed: Date.now() });
  }, [broadcastUpdate]);

  /* State */
  const [tab, setTab] = useState("summary");
  const [nodes, setNodes] = useState([]);
  const [weights, setWeights] = useState(() => {
    try { return JSON.parse(localStorage.getItem('g_graph_weights')) || { ...DEFAULT_WEIGHTS }; } catch { return { ...DEFAULT_WEIGHTS }; }
  });
  const [showWeightModal, setShowWeightModal] = useState(false);

  const TABS = useMemo(() => [
    { id: "summary",     label: t('graphScore.tabSummary') },
    { id: "browser",     label: t('graphScore.tabBrowser') },
    { id: "influencer",  label: t('graphScore.tabInfluencer') },
    { id: "sku",         label: t('graphScore.tabSku') },
    { id: "creative",    label: t('graphScore.tabCreative') },
    { id: "guide",       label: t('graphScore.tabGuide') },
  ], [t]);

  const loadNodes = useCallback(async () => {
    try { const d = await apiFetch(`${API}/v419/graph/nodes`); setNodes(d.nodes || []); }
    catch { setNodes([]); }
  }, []);
  useEffect(() => { loadNodes(); }, [loadNodes]);

  const handleWeightApply = useCallback((w) => {
    setWeights(w);
    try { localStorage.setItem('g_graph_weights', JSON.stringify(w)); } catch {}
    broadcastRefresh();
  }, [broadcastRefresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
        <div style={{ display: "grid", gap: 16 }}>
          {/* Security Lock */}
          {secLocked && <SecurityLockModal t={t} onDismiss={() => setSecLocked(false)} />}

          {/* Weight Settings Modal */}
          {showWeightModal && <WeightSettingsModal weights={weights} onApply={handleWeightApply} onClose={() => setShowWeightModal(false)} t={t} />}

          {/* Hero */}
          <div className="hero fade-up">
            <div className="hero-meta">
              <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(6,182,212,0.15))" }}>🕸</div>
              <div>
                <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)" }}>
                  {t('graphScore.pageTitle')}
                </div>
                <div className="hero-desc">{t('graphScore.heroDesc')}</div>
              </div>
            </div>
            {/* Legend + Badges */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {Object.entries(NODE_COLORS).map(([nodeType, c]) => (
                <div key={nodeType} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}88` }} />
                  <span style={{ color: "#334155" }}>{t(`graphScore.lbl_${nodeType}`)}</span>
                </div>
              ))}
              <div style={{ color: "#64748b", fontSize: 11 }}>· {t('graphScore.weightDesc')}</div>
            </div>

            {/* Toolbar: Weight + Export */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setShowWeightModal(true)} className="btn" style={{ fontSize: 11 }}>⚙ {t('graphScore.weightSettings')}</button>
              <button onClick={broadcastRefresh} className="btn" style={{ fontSize: 11 }}>🔄 {t('graphScore.syncNow')}</button>
            </div>
          </div>

          {/* Connected Channels */}
          <div className="fade-up fade-up-1">
            <ConnectedChannelsBadge t={t} />
          </div>

          {/* Live Sync Status */}
          <div className="fade-up fade-up-1" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', fontSize: 10, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            {t('graphScore.liveSyncStatus')}
          </div>

          {/* Tabs */}
          <div className="card card-glass fade-up fade-up-2">
            <div className="tabs" style={{ marginBottom: 20, overflowX: 'auto' }}>
              {TABS.map(tb => (
                <button key={tb.id} className={`tab ${tab === tb.id ? "active" : ""}`} onClick={() => setTab(tb.id)}>{tb.label}</button>
              ))}
            </div>

            {tab === "summary"    && <SummaryTab weights={weights} />}
            {tab === "browser"    && <GraphBrowserTab />}
            {tab === "influencer" && <InfluencerScoreTab nodes={nodes} weights={weights} />}
            {tab === "sku"        && <SkuScoreTab nodes={nodes} weights={weights} />}
            {tab === "creative"   && <CreativeScoreTab nodes={nodes} weights={weights} />}
            {tab === "guide"      && <GuideTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
