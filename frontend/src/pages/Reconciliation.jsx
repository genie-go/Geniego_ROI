import { useState, useEffect, useCallback, useRef } from 'react';
import '../styles.css';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import useSecurityMonitor from '../hooks/useSecurityMonitor.js';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── Cross-Tab Sync ──────────────────────────────────── */
const RECON_SYNC_CH = 'geniego_recon_sync';
function useReconSync() {
  const chRef = useRef(null);
  useEffect(() => {
    try { chRef.current = new BroadcastChannel(RECON_SYNC_CH); } catch { return; }
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

const API = (path) => `/api${path}`;
const SEVERITY_COLOR = { high: '#e74c3c', medium: '#f39c12', low: '#3498db' };

/* ─── Badge ─────────────────────────────────────────── */
function Badge({ status, t }) {
  const map = {
    open: { label: t('recon.statusOpen'), bg: '#e74c3c' },
    investigating: { label: t('recon.statusInvestigating'), bg: '#f39c12' },
    resolved: { label: t('recon.statusResolved'), bg: '#27ae60' },
    waived: { label: t('recon.statusWaived'), bg: '#95a5a6' },
  };
  const s = map[status] ?? { label: status, bg: '#888' };
  return <span style={{ background: s.bg, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
}

/* ─── Tab1: Upload ─────────────────────────────────── */
function UploadTab({ t, channels }) {
  const [channel, setChannel] = useState(channels[0]?.key || '');
  const [rows, setRows] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      let parsed;
      try { parsed = JSON.parse(rows); }
      catch { setError(t('recon.jsonError')); setLoading(false); return; }
      if (!Array.isArray(parsed)) { setError(t('recon.notArray')); setLoading(false); return; }
      const res = await fetch(API(`/v419/kr/settle/ingest-raw/${channel}`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed }),
      });
      const data = await res.json();
      if (data.ok) setResult(data);
      else setError(data.error || t('recon.uploadFailed'));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>📤 {t('recon.tabUpload')}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>{t('recon.uploadDesc')}</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {channels.map(c => (
          <button key={c.key} onClick={() => setChannel(c.key)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '2px solid', borderColor: channel === c.key ? 'var(--accent)' : 'var(--border)', background: channel === c.key ? 'var(--accent)' : 'transparent', color: channel === c.key ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          💡 {t('recon.uploadHint')}
        </div>
        <textarea value={rows} onChange={e => setRows(e.target.value)} rows={8}
          placeholder={`[\n  {"order_id":"P001","gross_sales":50000,"net_payout":42000,"commission":5000}\n]`}
          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', padding: 12, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
      </div>
      <button onClick={handleUpload} disabled={loading || !rows.trim()}
        style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? `⏳ ${t('recon.processing')}` : `📤 ${t('recon.uploadBtn')}`}
      </button>
      {error && <div style={{ marginTop: 12, color: '#e74c3c', background: 'rgba(231,76,60,0.06)', padding: 12, borderRadius: 8, border: '1px solid rgba(231,76,60,0.2)' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 12, background: 'rgba(39,174,96,0.06)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: 8, padding: 16 }}>
          ✅ <strong>{result.inserted}{t('recon.countUnit')}</strong> {t('recon.uploadSuccess')}
        </div>
      )}
    </div>
  );
}

/* ─── Tab2: Reconciliation Run ──────────────────────── */
function ReconTab({ t, channels, onReconDone }) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = today.slice(0, 8) + '01';
  const [channel, setChannel] = useState(channels[0]?.key || '');
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(API('/v419/kr/recon/run'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_key: channel, period_start: startDate, period_end: endDate }),
      });
      const data = await res.json();
      if (data.ok) { setResult(data); onReconDone && onReconDone(data); }
      else setError(data.error || t('recon.reconFailed'));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>⚖️ {t('recon.tabRecon')}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13 }}>{t('recon.reconDesc')}</p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('recon.channel')}</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {channels.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('recon.startDate')}</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('recon.endDate')}</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
      </div>
      <button onClick={handleRun} disabled={loading}
        style={{ padding: '10px 28px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? `⏳ ${t('recon.processing')}` : `⚖️ ${t('recon.reconRunBtn')}`}
      </button>
      {error && <div style={{ marginTop: 12, color: '#e74c3c', background: 'rgba(231,76,60,0.06)', padding: 12, borderRadius: 8, border: '1px solid rgba(231,76,60,0.2)' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: t('recon.totalOrders'), value: result.total_orders, color: '#667eea' },
              { label: t('recon.matched'), value: result.matched, color: '#27ae60' },
              { label: t('recon.mismatch'), value: result.mismatch, color: '#e74c3c' },
              { label: t('recon.ticketsCreated'), value: result.tickets_created, color: '#f39c12' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: 12, fontSize: 13 }}>
            💰 {t('recon.commissionDiff')}: <strong>{fmtC(result.fee_diff_krw ?? 0)}</strong> &nbsp;|&nbsp;
            💳 {t('recon.settlementDiff')}: <strong>{fmtC(result.net_diff_krw ?? 0)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab3: Reports ────────────────────────────────── */
function ReportsTab({ t, channels, refresh }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API('/v419/kr/recon/reports'), { credentials: 'include' });
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  const loadDetail = async (id) => {
    setSelected(id);
    try {
      const res = await fetch(API(`/v419/kr/recon/reports/${id}`), { credentials: 'include' });
      const data = await res.json();
      setDetail(data.report ?? null);
    } catch { }
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>⏳ {t('recon.loading')}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>📋 {t('recon.tabReports')}</h3>
      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div>{t('recon.noReports')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: '0 0 40%' }}>
            {reports.map(r => (
              <div key={r.id} onClick={() => loadDetail(r.id)}
                style={{ padding: 14, marginBottom: 8, borderRadius: 10, cursor: 'pointer', border: `2px solid ${selected === r.id ? 'var(--accent)' : 'var(--border)'}`, background: selected === r.id ? 'rgba(102,126,234,0.08)' : 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>#{r.id} {channels.find(c => c.key === r.channel_key)?.emoji} {r.channel_key}</span>
                  <Badge status={r.status} t={t} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.period_start} ~ {r.period_end}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13 }}>
                  <span style={{ color: '#27ae60' }}>✅ {r.matched}</span>
                  <span style={{ color: '#e74c3c' }}>❌ {r.mismatch}</span>
                  <span style={{ color: '#f39c12' }}>💰 {fmtC(+r.net_diff || 0)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {detail ? (
              <div>
                <h4 style={{ marginBottom: 12 }}>{t('recon.reportDetail')} #{detail.id}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    [t('recon.channel'), detail.channel_key],
                    [t('recon.period'), `${detail.period_start} ~ ${detail.period_end}`],
                    [t('recon.totalOrders'), detail.total_orders],
                    [t('recon.matched'), detail.matched],
                    [t('recon.mismatch'), detail.mismatch],
                    [t('recon.ticketCount'), detail.tickets?.length ?? 0],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{k}: </span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>
                {detail.tickets?.length > 0 && (
                  <div>
                    <h5 style={{ marginBottom: 8 }}>{t('recon.mismatchTickets')} ({detail.tickets.length}{t('recon.countUnit')})</h5>
                    {detail.tickets.map(tk => (
                      <div key={tk.id} style={{ padding: 10, marginBottom: 6, borderRadius: 8, background: 'var(--bg-card)', border: `1px solid ${SEVERITY_COLOR[tk.severity] ?? '#888'}40`, borderLeft: `4px solid ${SEVERITY_COLOR[tk.severity] ?? '#888'}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{tk.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {t('recon.commissionDiff')}: {fmtC(+tk.fee_diff || 0)} | {t('recon.settlementDiff')}: {fmtC(+tk.net_diff || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 40 }}>{t('recon.selectReport')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab4: Tickets ─────────────────────────────────── */
function TicketsTab({ t }) {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const res = await fetch(API('/v419/kr/recon/reports'), { credentials: 'include' });
        const data = await res.json();
        const reps = data.reports ?? [];
        const all = [];
        for (const r of reps.slice(0, 10)) {
          try {
            const d = await fetch(API(`/v419/kr/recon/reports/${r.id}`), { credentials: 'include' });
            const dd = await d.json();
            (dd.report?.tickets ?? []).forEach(tk => all.push({ ...tk, report_id: r.id }));
          } catch { }
        }
        setTickets(all);
      } catch { }
      finally { setLoading(false); }
    };
    loadAll();
  }, []);

  const updateTicket = async (id, status) => {
    setUpdating(id);
    try {
      await fetch(API(`/v419/kr/recon/tickets/${id}`), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setTickets(prev => prev.map(tk => tk.id === id ? { ...tk, status } : tk));
    } catch { }
    finally { setUpdating(null); }
  };

  const STATUS_MAP = {
    open: t('recon.statusOpen'), investigating: t('recon.statusInvestigating'),
    resolved: t('recon.statusResolved'), waived: t('recon.statusWaived'),
  };
  const filtered = tickets.filter(tk => statusFilter === 'all' || tk.status === statusFilter);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>⏳ {t('recon.loading')}</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>🎫 {t('recon.tabTickets')}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'open', 'investigating', 'resolved', 'waived'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '4px 12px', borderRadius: 16, border: '1px solid var(--border)', background: statusFilter === s ? 'var(--accent)' : 'transparent', color: statusFilter === s ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
              {s === 'all' ? t('recon.filterAll') : STATUS_MAP[s] ?? s}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>{t('recon.noTickets')}</div>
      ) : (
        <div>
          {filtered.map(tk => (
            <div key={tk.id} style={{ padding: 16, marginBottom: 10, borderRadius: 10, background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `4px solid ${SEVERITY_COLOR[tk.severity] ?? '#888'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Badge status={tk.status} t={t} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>#{tk.id} · {t('recon.report')}#{tk.report_id}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['investigating', 'resolved', 'waived'].map(s => (
                    <button key={s} onClick={() => updateTicket(tk.id, s)}
                      disabled={updating === tk.id || tk.status === s}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: updating === tk.id ? 'not-allowed' : 'pointer', fontSize: 12, opacity: tk.status === s ? 0.4 : 1 }}>
                      → {STATUS_MAP[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{tk.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('recon.orderId')}: {tk.order_id ?? '-'} | {t('recon.channel')}: {tk.channel_key} |
                {t('recon.commissionDiff')}: {fmtC(+tk.fee_diff || 0)} | {t('recon.settlementDiff')}: {fmtC(+tk.net_diff || 0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ─── Guide Tab ───────────────────────────────────── */
function GuideTab({ t }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ textAlign: 'center', padding: '24px 0 16px', background: 'linear-gradient(135deg,rgba(139,92,246,0.06),rgba(79,142,247,0.04))', borderRadius: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚖️</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>{t('recon.guideTitle')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('recon.guideSub')}</p>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#8b5cf6' }}>📋 {t('recon.guideStepsTitle')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: 'linear-gradient(135deg,#8b5cf6,#4f8ef7)', color: '#fff' }}>{i}</span>
              <span style={{ fontWeight: 800, fontSize: 12, color: i<=2?'#8b5cf6':i<=4?'#4f8ef7':'#14d9b0' }}>{t(`recon.guideStep${i}Title`)}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{t(`recon.guideStep${i}Desc`)}</p>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#4f8ef7' }}>🗂 {t('recon.guideRolesTitle')}</h3>
      <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        {[{k:'Upload',emoji:'📤',c:'#8b5cf6'},{k:'Recon',emoji:'⚖️',c:'#4f8ef7'},{k:'Ticket',emoji:'🎫',c:'#14d9b0'}].map(r => (
          <div key={r.k} style={{ padding: '10px 14px', borderRadius: 10, background: `${r.c}08`, border: `1px solid ${r.c}15`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{r.emoji}</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(`recon.guideRole${r.k}`)}</span>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#22c55e' }}>💡 {t('recon.guideTipsTitle')}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#8b5cf6', fontWeight: 900 }}>Tip{i}</span> {t(`recon.guideTip${i}`)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────── */
export default function Reconciliation() {
  const { fmt: fmtC } = useCurrency();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { settlementStats, updateSettlement, pnlStats, isDemo } = useGlobalData();
  const { locked } = useSecurityMonitor('reconciliation');
  const { broadcast, onMessage } = useReconSync();

  const [activeTab, setActiveTab] = useState('upload');
  const [reconRefresh, setReconRefresh] = useState(0);

  // Dynamic channels from default list
  const CHANNELS = [
    { key: 'coupang', label: 'Coupang', emoji: '🛍️' },
    { key: 'naver', label: 'Naver', emoji: '🟢' },
    { key: '11st', label: '11Street', emoji: '1️⃣' },
    { key: 'gmarket', label: 'Gmarket', emoji: '🅖' },
    { key: 'auction', label: t('recon.auction'), emoji: '🅐' },
  ];

  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'recon_done') setReconRefresh(p => p + 1);
    });
  }, [onMessage]);

  const handleReconDone = useCallback((result) => {
    if (result && result.channel_key) {
      updateSettlement(result.channel_key, {
        period: new Date().toISOString().slice(0, 7),
        grossSales: result.total_sales || 0,
        platformFee: result.fee_diff_krw || 0,
        netPayout: result.net_diff_krw || 0,
        orders: result.total_orders || 0,
        status: result.mismatch === 0 ? 'settled' : 'pending',
      });
    }
    setReconRefresh(p => p + 1);
    broadcast('recon_done', { ts: Date.now() });
  }, [updateSettlement, broadcast]);

  const TABS = [
    { key: 'upload', label: `📤 ${t('recon.tabUpload')}` },
    { key: 'recon', label: `⚖️ ${t('recon.tabRecon')}` },
    { key: 'reports', label: `📋 ${t('recon.tabReports')}` },
    { key: 'tickets', label: `🎫 ${t('recon.tabTickets')}` },
    { key: 'guide', label: `📖 ${t('recon.tabGuide')}` },
  ];

  if (locked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ padding: '48px 40px', borderRadius: 24, background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))', border: '2px solid rgba(239,68,68,0.3)', maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('recon.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('recon.secLockDesc')}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(79,142,247,0.15))' }}>⚖️</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#8b5cf6,#4f8ef7)' }}>
              {t('recon.pageTitle')}
            </div>
            <div className="hero-desc">{t('recon.pageDesc')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12 }}>
            ✅ <strong style={{ color: '#4ade80' }}>{t('recon.settled')}</strong> {fmtC((settlementStats.settledAmount / 1e6))}
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 12 }}>
            ⏳ <strong style={{ color: '#fbbf24' }}>{t('recon.pending')}</strong> {fmtC((settlementStats.pendingAmount / 1e6))}
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12 }}>
            💸 <strong style={{ color: '#f87171' }}>{t('recon.adDeduction')}</strong> {fmtC((settlementStats.totalAdFee / 1e6))}
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 12 }}>
            🏪 <strong style={{ color: '#c084fc' }}>{t('recon.platformCommission')}</strong> {fmtC((settlementStats.totalPlatformFee / 1e6))}
          </div>
          <button onClick={() => navigate('/pnl-dashboard')} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)', color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            {t('recon.viewPnl')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0, padding: '12px 12px 0', background: 'var(--bg-card)', borderRadius: '12px 12px 0 0', border: '1px solid var(--border)', borderBottom: 'none', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '10px 18px', borderRadius: '8px 8px 0 0', border: 'none', background: activeTab === tab.key ? 'var(--accent)' : 'transparent', color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)', fontWeight: activeTab === tab.key ? 700 : 400, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0 0 12px 12px' }}>
        {activeTab === 'upload' && <UploadTab t={t} channels={CHANNELS} />}
        {activeTab === 'recon' && <ReconTab t={t} channels={CHANNELS} onReconDone={handleReconDone} />}
        {activeTab === 'reports' && <ReportsTab t={t} channels={CHANNELS} refresh={reconRefresh} />}
        {activeTab === 'tickets' && <TicketsTab t={t} />}
        {activeTab === 'guide' && <GuideTab t={t} />}
      </div>
    </div>
  );
}
