import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import useSecurityMonitor from '../hooks/useSecurityMonitor.js';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── Cross-Tab Sync ─────────────────────────────────────── */
const SETTLE_SYNC_CH = 'geniego_settle_sync';
function useSettleSync() {
  const chRef = useRef(null);
  useEffect(() => {
    try { chRef.current = new BroadcastChannel(SETTLE_SYNC_CH); } catch { return; }
    return () => { try { chRef.current?.close(); } catch {} };
  }, []);
  const broadcast = useCallback((type, data) => {
    try { chRef.current?.postMessage({ type, data, ts: Date.now() }); } catch {}
  }, []);
  const onMessage = useCallback((handler) => {
    if (!chRef.current) return () => {};
    const fn = (e) => handler(e.data);
    chRef.current.addEventListener('message', fn);
    return () => chRef.current?.removeEventListener('message', fn);
  }, []);
  return { broadcast, onMessage };
}
/* ─── CSV Download ──────────────────────────────────────── */
function downloadCSV(filename, headers, rows) {
  const BOM = '\uFEFF';
  const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))];
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── Initial Data ──────── */
const INIT_SETTLEMENTS = [];

const FX = { KRW: 1, USD: 1330, JPY: 8.8, EUR: 1450 };
const toKRW = (v, cur) => Math.round(v * (FX[cur] || 1));
const fmtCur = (v, cur) => {
  if (cur === "KRW") return v; // useCurrency handles formatting
  if (cur === "USD") return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 0 });
  if (cur === "JPY") return "¥" + Math.round(v).toLocaleString("ja-JP");
  return String(v);
};
const fmtM = v => v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(Math.round(v));
const fmtKRWM = v => fmtM(v); // useCurrency handles symbol



/* ─── Drawer ─────────────────────────────────────────────── */
function Drawer({ children, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 500, background: "linear-gradient(180deg,var(--surface),#090f1e)", borderLeft: "1px solid rgba(99,140,255,0.2)", zIndex: 201, overflowY: "auto", padding: 26, animation: "slideIn 0.25s cubic-bezier(.4,0,.2,1)" }}>
        {children}
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      </div>
    </>
  
  );
}

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "rgba(34,197,94,0.95)", color: '#fff', padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      {msg}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function Settlements() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const gd = useGlobalData();
  const { locked } = useSecurityMonitor('settlements');
  const { broadcast, onMessage } = useSettleSync();

  // Pull settlement data from GlobalDataContext if available, else empty
  const liveRows = useMemo(() => {
    if (gd?.settlements?.length) return gd.settlements;
    return INIT_SETTLEMENTS;
  }, [gd?.settlements]);
  const [rows, setRows] = useState(liveRows);
  useEffect(() => { setRows(liveRows); }, [liveRows]);

  // Cross-tab sync: receive updates from other tabs
  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'settle_filter') {
        if (msg.data?.channel) setFilterChannel(msg.data.channel);
      }
    });
  }, [onMessage]);

  // Derive channels/currencies dynamically
  const CHANNELS = useMemo(() => [...new Set(rows.map(r => r.channel))], [rows]);
  const CURRENCIES = useMemo(() => [...new Set(rows.map(r => r.currency))], [rows]);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [sortKey, setSortKey] = useState("net_payout_krw");
  const [sortDir, setSortDir] = useState("desc");

  /* Period List */
  const periods = useMemo(() => {
    const s = new Set(rows.map(r => r.period_start));
    return [...s].sort().reverse();
  }, [rows]);

  /* Filter + Sort */
  const filtered = useMemo(() => {
    let r = rows.filter(row => {
      if (filterChannel !== "all" && row.channel !== filterChannel) return false;
      if (filterStatus !== "all" && row.status !== filterStatus) return false;
      if (filterCurrency !== "all" && row.currency !== filterCurrency) return false;
      if (filterPeriod !== "all" && row.period_start !== filterPeriod) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!row.channel.toLowerCase().includes(q) && !String(row.id).includes(q)) return false;
      }
      return true;
    });
    return [...r]
      .map(row => ({ ...row, net_payout_krw: toKRW(row.net_payout, row.currency) }))
      .sort((a, b) => {
        const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      });
  }, [rows, filterChannel, filterStatus, filterCurrency, filterPeriod, search, sortKey, sortDir]);

  /* KPIs (Filter된 데이터 기준) */
  const totals = useMemo(() => ({
    grossKRW: filtered.reduce((s, r) => s + toKRW(r.gross_sales, r.currency), 0),
    netKRW:   filtered.reduce((s, r) => s + toKRW(r.net_payout, r.currency), 0),
    feeKRW:   filtered.reduce((s, r) => s + toKRW(r.platform_fee + r.ad_fee + r.payment_fee, r.currency), 0),
    refKRW:   filtered.reduce((s, r) => s + toKRW(r.refunds, r.currency), 0),
    orders:   filtered.reduce((s, r) => s + r.orders, 0),
    count:    filtered.length,
    pending:  filtered.filter(r => r.status === "pending").length,
  }), [filtered]);

  /* Toggle sort */
  const setSort = useCallback(k => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }, [sortKey]);

  const SortTh = ({ k, label, right }) => (
    <th style={{ textAlign: right ? "right" : "left", cursor: "pointer", userSelect: "none" }}
      onClick={() => setSort(k)}>
      {label} {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  /* CSV */
  const handleDownload = () => {
    downloadCSV(
      `settlement_${new Date().toISOString().slice(0, 10)}.csv`,
      ["ID", t('settlements.colChannel'), t('settlements.colCurrency'), t('settlements.colPeriod'), t('settlements.colGrossSales'), t('settlements.colPlatformFee'), t('settlements.colAdFee'), t('settlements.colPayFee'), t('settlements.colRefunds'), t('settlements.colNetPayout'), t('settlements.colNetKRW'), t('settlements.colOrders'), t('settlements.colFeeRate'), t('status')],
      filtered.map(r => [
        r.id, r.channel, r.currency, `${r.period_start}~${r.period_end}`,
        r.gross_sales, r.platform_fee, r.ad_fee, r.payment_fee, r.refunds, r.net_payout,
        toKRW(r.net_payout, r.currency), r.orders, r.fee_rate + "%",
        r.status === "confirmed" ? t('settlements.statusConfirmed') : t('settlements.statusPending')
      ])
    );
    setToast(t('settlements.csvSuccess'));
  };

  /* Import */
  const doImport = async () => {
    setImportBusy(true);
    try {
      const res = await fetch("/v382/settlements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      setToast(res.ok ? t('settlements.importSuccess') : `⚠ ` + res.status);
    } catch { setToast(t('settlements.importMock')); }
    finally { setImportBusy(false); }
  };

  /* Channel breakdown (All rows 기준) */
  const byChannel = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!map[r.channel]) map[r.channel] = { gross: 0, net: 0, cnt: 0, color: r.color, icon: r.icon };
      map[r.channel].gross += toKRW(r.gross_sales, r.currency);
      map[r.channel].net += toKRW(r.net_payout, r.currency);
      map[r.channel].cnt++;
    });
    return Object.entries(map).map(([ch, v]) => ({ ch, ...v })).sort((a, b) => b.net - a.net);
  }, [rows]);

  const maxNet = byChannel[0]?.net || 1;

  // Security lockdown
  if (locked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ padding: '48px 40px', borderRadius: 24, background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))', border: '2px solid rgba(239,68,68,0.3)', maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('mr.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('mr.secLockDesc')}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(20,217,176,0.25),rgba(79,142,247,0.15))" }}>📋</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#14d9b0,#4f8ef7)" }}>
              {t("settlements.pageTitle")}
            </div>
            <div className="hero-desc">{t('settlements.pageDesc')}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn-primary" style={{ fontSize: 11, padding: "6px 14px" }} onClick={doImport} disabled={importBusy}>
            {importBusy ? `⏳ ${t('settlements.processing')}` : t('settlements.importBtn')}
          </button>
          <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }} onClick={handleDownload}>
            📥 {t('settlements.csvDownload')}
          </button>
          <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowGuide(!showGuide)}>
            📖 {t('settlements.tabGuide')}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-1" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {[
          { l: t('settlements.kpiGrossSales'), v: fmtKRWM(totals.grossKRW), s: `${totals.count} ${t('settlements.kpiSettlements')}`, c: "#4f8ef7" },
          { l: t('settlements.kpiNetPayout'), v: fmtKRWM(totals.netKRW), s: `${t('settlements.kpiPayRate')} ${totals.grossKRW > 0 ? (totals.netKRW / totals.grossKRW * 100).toFixed(1) : '0.0'}%`, c: "#14d9b0" },
          { l: t('settlements.kpiDeductions'), v: fmtKRWM(totals.feeKRW + totals.refKRW), s: t('settlements.kpiDeductSub'), c: "#ef4444" },
          { l: t('settlements.kpiOrders'), v: totals.orders.toLocaleString(), s: t('settlements.kpiOrderSub'), c: "#a855f7" },
          { l: t('settlements.kpiPending'), v: totals.pending, s: totals.pending > 0 ? `⚠ ${t('settlements.kpiPendingWarn')}` : `✓ ${t('settlements.kpiAllDone')}`, c: totals.pending > 0 ? "#eab308" : "#22c55e" },
        ].map(({ l, v, s, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c, fontSize: 18 }}>{v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Channelper Bar Chart */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-title" style={{ marginBottom: 14 }}>📊 {t('settlements.channelNetTitle')}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {byChannel.map(({ ch, gross, net, cnt, color, icon }) => {
            const eff = (net / gross * 100).toFixed(1);
            return (
<div key={ch}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color }}>{ch}</span>
                    <span className="badge" style={{ fontSize: 9 }}>{cnt}{t('settlements.countUnit')}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 11 }}>
                    <span style={{ color: "var(--text-3)" }}>{t('settlements.totalSales')} {fmtKRWM(gross)}</span>
                    <span style={{ fontWeight: 800, color }}>{t('settlements.netPayout')} {fmtKRWM(net)}</span>
                    <span style={{ color: Number(eff) >= 80 ? "#22c55e" : Number(eff) >= 70 ? "#eab308" : "#ef4444", fontWeight: 700 }}>{eff}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--surface)', borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(net / maxNet) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            
);
          })}
        </div>
      </div>

      {/* Settlements 내역 Table */}
      <div className="card card-glass fade-up fade-up-3">
        <div className="section-header">
          <div>
            <div className="section-title">📁 {t('settlements.historyTitle')}</div>
            <div className="section-sub">{filtered.length} {t('settlements.itemsShown')}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ width: 140, padding: "6px 10px", fontSize: 11 }}
              placeholder={t('settlements.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input" style={{ width: 130, padding: "6px 10px", fontSize: 11 }}
              value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
              <option value="all">{t('settlements.allChannels')}</option>
              {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
            <select className="input" style={{ width: 110, padding: "6px 10px", fontSize: 11 }}
              value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}>
              <option value="all">{t('settlements.allCurrencies')}</option>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" style={{ width: 130, padding: "6px 10px", fontSize: 11 }}
              value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="all">{t('settlements.allPeriods')}</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input" style={{ width: 100, padding: "6px 10px", fontSize: 11 }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">{t('settlements.allStatus')}</option>
              <option value="confirmed">{t('settlements.statusConfirmed')}</option>
              <option value="pending">{t('settlements.statusPending')}</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <SortTh k="channel" label={t('settlements.colChannel')} />
                <th>{t('settlements.colCurrency')}</th>
                <th>{t('settlements.colPeriod')}</th>
                <SortTh k="gross_sales" label={t('settlements.colGrossSales')} right />
                <SortTh k="platform_fee" label={t('settlements.colPlatformFee')} right />
                <SortTh k="ad_fee" label={t('settlements.colAdFee')} right />
                <SortTh k="refunds" label={t('settlements.colRefunds')} right />
                <SortTh k="net_payout" label={t('settlements.colNetPayout')} right />
                <SortTh k="net_payout_krw" label={t('settlements.colNetKRW')} right />
                <SortTh k="orders" label={t('settlements.colOrders')} right />
                <th>{t('status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ color: "var(--text-3)", fontSize: 10, fontFamily: "monospace" }}>#{r.id}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{r.icon}</span>
                      <span style={{ fontWeight: 700, color: r.color, fontSize: 12 }}>{r.channel}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(99,140,255,0.1)", border: "1px solid rgba(99,140,255,0.15)" }}>
                      {r.currency}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: "var(--text-3)" }}>{r.period_start} ~ {r.period_end.slice(5)}</td>
                  <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmtCur(r.gross_sales, r.currency)}</td>
                  <td style={{ textAlign: "right", color: "#ef4444", fontFamily: "monospace" }}>
                    -{fmtCur(r.platform_fee, r.currency)}
                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>{r.fee_rate}%</div>
                  </td>
                  <td style={{ textAlign: "right", color: "#f97316", fontFamily: "monospace" }}>-{fmtCur(r.ad_fee, r.currency)}</td>
                  <td style={{ textAlign: "right", color: "#a855f7", fontFamily: "monospace" }}>-{fmtCur(r.refunds, r.currency)}</td>
                  <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#14d9b0" }}>{fmtCur(r.net_payout, r.currency)}</td>
                  <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--text-2)", fontSize: 11 }}>
                    {r.currency !== "KRW" ? fmtKRWM(toKRW(r.net_payout, r.currency)) : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{r.orders.toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${r.status === "confirmed" ? "green" : "yellow"}`} style={{ fontSize: 10 }}>
                      <span className={`dot dot-${r.status === "confirmed" ? "green" : "yellow"}`} />
                      {r.status === "confirmed" ? t('settlements.statusConfirmed') : t('settlements.statusPending')}
                    </span>
                  </td>
                  <td>
                    <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setDetail(r)}>
                      {t('detail')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid rgba(99,140,255,0.2)", background: "rgba(79,142,247,0.04)" }}>
                <td colSpan={4} style={{ fontWeight: 800, fontSize: 11 }}>{t('total')}</td>
                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>
                  {fmtKRWM(totals.grossKRW)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#ef4444", fontSize: 11 }}>
                  -{fmtKRWM(totals.feeKRW)}
                </td>
                <td colSpan={2} style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#a855f7", fontSize: 11 }}>
                  -{fmtKRWM(totals.refKRW)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 900, color: "#14d9b0", fontSize: 12 }}>
                  {fmtKRWM(totals.netKRW)}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <Drawer onClose={() => setDetail(null)}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{detail.icon}</span>
                <span style={{ color: detail.color }}>{detail.channel}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>#{detail.id} · {detail.period_start} ~ {detail.period_end}</div>
            </div>
            <button className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => setDetail(null)}>✕</button>
          </div>

          {/* Currency 표시 */}
          <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.15)", fontSize: 11 }}>
            <span style={{ color: "var(--text-3)" }}>{t('settlements.currency')}: </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#4f8ef7" }}>{detail.currency}</span>
            {detail.currency !== "KRW" && (
              <span style={{ color: "var(--text-3)", marginLeft: 8 }}>· {t('settlements.exchangeRate')}: 1{detail.currency} = {fmtC(FX[detail.currency])}</span>
            )}
          </div>

          {/* Settlements 내역 */}
          <div style={{ display: "grid", gap: 2, marginBottom: 20 }}>
            {[
              [t('settlements.detailGrossSales'), fmtCur(detail.gross_sales, detail.currency), "var(--text-1)", true],
              [t('settlements.detailPlatformFee'), `- ${fmtCur(detail.platform_fee, detail.currency)} (${detail.fee_rate}%)`, "#ef4444", false],
              [t('settlements.detailAdFee'), `- ${fmtCur(detail.ad_fee, detail.currency)}`, "#f97316", false],
              [t('settlements.detailPayFee'), `- ${fmtCur(detail.payment_fee, detail.currency)}`, "#eab308", false],
              [t('settlements.detailRefunds'), `- ${fmtCur(detail.refunds, detail.currency)}`, "#a855f7", false],
            ].map(([l, v, c, bold]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12 }}>
                <span style={{ color: "var(--text-3)" }}>{l}</span>
                <span style={{ fontWeight: bold ? 700 : 600, color: c }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 15 }}>
              <span style={{ fontWeight: 800 }}>{t('settlements.netSettlement')}</span>
              <span style={{ fontWeight: 900, color: "#14d9b0" }}>{fmtCur(detail.net_payout, detail.currency)}</span>
            </div>
            {detail.currency !== "KRW" && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: "rgba(20,217,176,0.06)", borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: "var(--text-3)" }}>{t('settlements.krvConversion')}</span>
                <span style={{ fontWeight: 800, color: "#14d9b0" }}>{fmtKRWM(toKRW(detail.net_payout, detail.currency))}</span>
              </div>
            )}
          </div>

          {/* Add Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              [t('settlements.detailTotalOrders'), detail.orders.toLocaleString() + t('settlements.countUnit'), "#4f8ef7"],
              [t('settlements.detailStatus'), detail.status === "confirmed" ? `✓ ${t('settlements.statusConfirmed')}` : `⏳ ${t('settlements.statusPending')}`, detail.status === "confirmed" ? "#22c55e" : "#eab308"],
              [t('settlements.detailEfficiency'), (detail.net_payout / detail.gross_sales * 100).toFixed(1) + "%", "#a855f7"],
              [t('settlements.detailFeeRate'), detail.fee_rate + "%", "#ef4444"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.08)" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 3 }}>{l}</div>
                <div style={{ fontWeight: 800, color: c, fontSize: 14 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
              downloadCSV(`settlement_${detail.channel}_${detail.period_start}.csv`,
                [t('settlements.detailGrossSales'), t('settlements.colNetPayout'), t('settlements.colNetKRW')],
                [
                  [t('settlements.detailGrossSales'), fmtCur(detail.gross_sales, detail.currency), fmtKRWM(toKRW(detail.gross_sales, detail.currency))],
                  [t('settlements.detailPlatformFee'), fmtCur(detail.platform_fee, detail.currency), fmtKRWM(toKRW(detail.platform_fee, detail.currency))],
                  [t('settlements.detailAdFee'), fmtCur(detail.ad_fee, detail.currency), fmtKRWM(toKRW(detail.ad_fee, detail.currency))],
                  [t('settlements.detailRefunds'), fmtCur(detail.refunds, detail.currency), fmtKRWM(toKRW(detail.refunds, detail.currency))],
                  [t('settlements.netSettlement'), fmtCur(detail.net_payout, detail.currency), fmtKRWM(toKRW(detail.net_payout, detail.currency))],
                ]);
              setToast(t('settlements.detailCsvDone'));
            }}>📥 {t('settlements.detailCsvBtn')}</button>
            <button className="btn-ghost" onClick={() => setDetail(null)}>{t('close')}</button>
          </div>
        </Drawer>
      )}

      {/* Guide Section */}
      {showGuide && (
        <div className="card card-glass fade-up" style={{ borderColor: 'rgba(34,197,94,0.15)' }}>
          <div style={{ textAlign: 'center', padding: '24px 0 16px', background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.04))', borderRadius: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>{t('settlements.guideTitle')}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>{t('settlements.guideSub')}</p>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#22c55e' }}>📋 {t('settlements.guideStepsTitle')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: 'linear-gradient(135deg,#14d9b0,#4f8ef7)', color: '#fff' }}>{i}</span>
                  <span style={{ fontWeight: 800, fontSize: 12, color: i<=2?'#14d9b0':i<=4?'#4f8ef7':'#a855f7' }}>{t(`settlements.guideStep${i}Title`)}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>{t(`settlements.guideStep${i}Desc`)}</p>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#4f8ef7' }}>🗂 {t('settlements.guideRolesTitle')}</h3>
          <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            {[{k:'Fee',emoji:'💰',c:'#14d9b0'},{k:'Currency',emoji:'💱',c:'#4f8ef7'},{k:'Sync',emoji:'🔄',c:'#a855f7'}].map(r => (
              <div key={r.k} style={{ padding: '10px 14px', borderRadius: 10, background: `${r.c}08`, border: `1px solid ${r.c}15`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{r.emoji}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t(`settlements.guideRole${r.k}`)}</span>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#22c55e' }}>💡 {t('settlements.guideTipsTitle')}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)', fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: '#14d9b0', fontWeight: 900 }}>Tip{i}</span> {t(`settlements.guideTip${i}`)}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
