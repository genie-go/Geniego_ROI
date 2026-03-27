import { useState, useEffect, useCallback } from 'react';
import '../styles.css';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';

const API = (path) => `/api${path}`;

// Channel List
const CHANNELS = [
  { key: 'coupang', label: 'Coupang', emoji: '🛍️' },
  { key: 'naver', label: 'Naver', emoji: '🟢' },
  { key: '11st', label: '11Street', emoji: '1️⃣' },
  { key: 'gmarket', label: 'Gmarket', emoji: '🅖' },
  { key: 'auction', label: t('auto.a7fodt', '옥션'), emoji: '🅐' },
];

const SEVERITY_COLOR = { high: '#e74c3c', medium: '#f39c12', low: '#3498db' };
const STATUS_BADGE = {
  open: { label: t('auto.mk0dsg', '미처리'), bg: '#e74c3c' },
  investigating: { label: t('auto.g8r09m', '조사in progress'), bg: '#f39c12' },
  resolved: { label: t('auto.vgs487', '해결'), bg: '#27ae60' },
  waived: { label: t('auto.a2g2s6', '면제'), bg: '#95a5a6' },
};

function Badge({ status }) {
  const s = STATUS_BADGE[status] ?? { label: status, bg: '#888' };
  return (
    <span style={{
      background: s.bg, color: '#fff', borderRadius: 4, padding: '2px 8px',
      fontSize: 11, fontWeight: 700,
    }}>{s.label}</span>
  );
}

// ─── Tab1: 정산 데이터 Upload ─────────────────────────────────────────────────
function UploadTab() {
  const [channel, setChannel] = useState('coupang');
  const [rows, setRows] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      let parsed;
      try { parsed = JSON.parse(rows); }
      catch { setError(t('auto.json_err', 'JSON 형식 에러. 배열 형태로 입력하세요.')); setLoading(false); return; }
      if (!Array.isArray(parsed)) { setError(t('auto.not_arr', '배열 형태가 아닙니다.')); setLoading(false); return; }

      const res = await fetch(API(`/v419/kr/settle/ingest-raw/${channel}`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed }),
      });
      const data = await res.json();
      if (data.ok) setResult(data);
      else setError(data.error || 'Upload Failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>{t('auto.sa27lc', '📤 정산 데이터 Upload')}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
        {t('auto.0ipu9q', 'Channel에서 받은 정산 데이터를 JSON 배열로 붙여넣으세요. 한글 컬럼명을 Auto으로 표준 필드로 변환합니다.')}
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {CHANNELS.map(c => (
          <button key={c.key}
            onClick={() => setChannel(c.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '2px solid',
              borderColor: channel === c.key ? 'var(--accent)' : 'var(--border)',
              background: channel === c.key ? 'var(--accent)' : 'transparent',
              color: channel === c.key ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer', fontWeight: 600,
            }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          💡 {CHANNELS.find(c => c.key === channel)?.label} 한글 컬럼 예시: Orders번호, 정산Amount, Commission, Coupon할인, 판매Amount
        </div>
        <textarea
          value={rows}
          onChange={e => setRows(e.target.value)}
          rows={10}
          placeholder={`[\n  {t('auto.mr789w', 'Orders번호'):"P001",t('auto.0iy7a9', '판매Amount'):50000,t('auto.sc6npu', '정산Amount'):42000,"Commission":5000,t('auto.9dvczd', 'Coupon할인'):3000}\n]`}
          style={{
            width: '100%', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            padding: 12, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box',
          }}
        />
      </div>
      <button
        onClick={handleUpload} disabled={loading || !rows.trim()}
        style={{
          padding: '10px 24px', background: 'var(--accent)', color: '#fff',
          border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1,
        }}>
        {loading ? 'Upload in progress...' : '📤 Upload'}
      </button>

      {error && <div style={{ marginTop: 12, color: '#e74c3c', background: '#fdf0f0', padding: 12, borderRadius: 8 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #27ae60', borderRadius: 8, padding: 16 }}>
          ✅ <strong>{result.inserted}건</strong> Upload Success (Channel: {result.channel_key})
        </div>
      )}
    </div>
  );
}

// ─── Tab2: 대사 Run ──────────────────────────────────────────────────────────
function ReconTab({ onReconDone }) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = today.slice(0, 8) + '01';
  const [channel, setChannel] = useState('coupang');
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
      if (data.ok) { setResult(data); onReconDone && onReconDone(); }
      else setError(data.error || t('auto.opre0m', '대사 Run Failed'));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>⚖️ Reconciliation Run</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
        {t('auto.gv4r0c', 'Upload된 정산 데이터와 Commission 규칙을 Compare해 차이를 Auto Calculate합니다.')}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Channel</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {CHANNELS.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('auto.frgeo3', 'Start일')}</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <button onClick={handleRun} disabled={loading}
        style={{
          padding: '10px 28px', background: '#8b5cf6', color: '#fff',
          border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1,
        }}>
        {loading ? 'Analysis in progress...' : t('auto.supil9', '⚖️ 대사 Run')}
      </button>

      {error && <div style={{ marginTop: 12, color: '#e74c3c', background: '#fdf0f0', padding: 12, borderRadius: 8 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'All Orders', value: result.total_orders, color: '#667eea' },
              { label: t('auto.1wmipx', '매칭'), value: result.matched, color: '#27ae60' },
              { label: t('auto.27h59f', '불일치'), value: result.mismatch, color: '#e74c3c' },
              { label: t('auto.50hsuy', '티켓 Create'), value: result.tickets_created, color: '#f39c12' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, background: '#fffbf0', border: '1px solid #f39c12', borderRadius: 8, padding: 12 }}>
            {t('auto.097xk9', '💰 Commission 차이:')}<strong>₩{(result.fee_diff_krw ?? 0).toLocaleString()}</strong> &nbsp;|&nbsp;
            💳 Settlement Diff: <strong>₩{(result.net_diff_krw ?? 0).toLocaleString()}</strong>
            &nbsp;(리포트 ID: #{result.report_id})
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab3: 대사 리포트 ────────────────────────────────────────────────────────
function ReportsTab({ refresh }) {
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

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>{t('auto.q8styk', '📋 대사 리포트 List')}</h3>
      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div>{t('auto.limqwg', '아직 대사 리포트가 없습니다. 먼저 데이터를 Upload하고 대사를 Run하세요.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20 }}>
          {/* 리포트 List */}
          <div style={{ flex: '0 0 40%' }}>
            {reports.map(r => (
              <div key={r.id}
                onClick={() => loadDetail(r.id)}
                style={{
                  padding: 14, marginBottom: 8, borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${selected === r.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected === r.id ? 'rgba(102,126,234,0.08)' : 'var(--bg-card)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>#{r.id} {CHANNELS.find(c => c.key === r.channel_key)?.emoji} {r.channel_key}</span>
                  <Badge status={r.status} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {r.period_start} ~ {r.period_end}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13 }}>
                  <span style={{ color: '#27ae60' }}>✅ {r.matched}</span>
                  <span style={{ color: '#e74c3c' }}>❌ {r.mismatch}</span>
                  <span style={{ color: '#f39c12' }}>💰 ₩{(+r.net_diff || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          {/* 리포트 상세 */}
          <div style={{ flex: 1 }}>
            {detail ? (
              <div>
                <h4 style={{ marginBottom: 12 }}>리포트 #{detail.id} 상세</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    ['Channel', detail.channel_key],
                    ['Period', `${detail.period_start} ~ ${detail.period_end}`],
                    ['All Orders', detail.total_orders],
                    [t('auto.w4sb94', '매칭'), detail.matched],
                    [t('auto.dh4f1z', '불일치'), detail.mismatch],
                    [t('auto.ondgbc', '티켓 Count'), detail.tickets?.length ?? 0],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{k}: </span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>
                {detail.tickets?.length > 0 && (
                  <div>
                    <h5 style={{ marginBottom: 8 }}>불일치 티켓 ({detail.tickets.length}건)</h5>
                    {detail.tickets.map(t => (
                      <div key={t.id} style={{
                        padding: 10, marginBottom: 6, borderRadius: 8,
                        background: 'var(--bg-card)', border: `1px solid ${SEVERITY_COLOR[t.severity] ?? '#888'}40`,
                        borderLeft: `4px solid ${SEVERITY_COLOR[t.severity] ?? '#888'}`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Commission 차이: ₩{(+t.fee_diff || 0).toLocaleString()} | Settlement Diff: ₩{(+t.net_diff || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 40 }}>{t('auto.4fmodr', '리포트를 Clicks하세요')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab4: 티켓 대응 ──────────────────────────────────────────────────────────
function TicketsTab() {
  const [reports, setReports] = useState([]);
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
        setReports(reps);
        const all = [];
        for (const r of reps.slice(0, 10)) {
          try {
            const d = await fetch(API(`/v419/kr/recon/reports/${r.id}`), { credentials: 'include' });
            const dd = await d.json();
            (dd.report?.tickets ?? []).forEach(t => all.push({ ...t, report_id: r.id }));
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
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch { }
    finally { setUpdating(null); }
  };

  const filtered = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{t('auto.iqdzrx', '🎫 불일치 티켓 대응')}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'open', 'investigating', 'resolved', 'waived'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 12px', borderRadius: 16, border: '1px solid var(--border)',
                background: statusFilter === s ? 'var(--accent)' : 'transparent',
                color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13,
              }}>
              {s === 'all' ? 'All' : STATUS_BADGE[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>{t('auto.85bevl', '해당 Status의 티켓이 없습니다.')}</div>
      ) : (
        <div>
          {filtered.map(t => (
            <div key={t.id} style={{
              padding: 16, marginBottom: 10, borderRadius: 10,
              background: 'var(--bg-card)', border: `1px solid var(--border)`,
              borderLeft: `4px solid ${SEVERITY_COLOR[t.severity] ?? '#888'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Badge status={t.status} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>#{t.id} · 리포트#{t.report_id}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['investigating', 'resolved', 'waived'].map(s => (
                    <button key={s} onClick={() => updateTicket(t.id, s)}
                      disabled={updating === t.id || t.status === s}
                      style={{
                        padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text-secondary)',
                        cursor: updating === t.id ? 'not-allowed' : 'pointer', fontSize: 12,
                        opacity: t.status === s ? 0.4 : 1,
                      }}>
                      → {STATUS_BADGE[s]?.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Orders번호: {t.order_id ?? '-'} | Channel: {t.channel_key} |
                Commission 차이: ₩{(+t.fee_diff || 0).toLocaleString()} | Settlement Diff: ₩{(+t.net_diff || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab5: Commission 규칙 Settings ────────────────────────────────────────────────────
function FeeRulesTab() {
  const [channel, setChannel] = useState('coupang');
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ platform_fee_rate: 0.05, ad_fee_rate: 0.01, vat_rate: 0.1, note: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API(`/v419/kr/fee-rules/${channel}`), { credentials: 'include' });
        const data = await res.json();
        setRules(data.rules ?? []);
      } catch { }
    };
    load();
  }, [channel]);

  const handleSave = async () => {
    setLoading(true); setSaved(false);
    try {
      await fetch(API('/v419/kr/fee-rules'), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_key: channel, ...form }),
      });
      setSaved(true);
      // 리로드
      const res = await fetch(API(`/v419/kr/fee-rules/${channel}`), { credentials: 'include' });
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch { }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>{t('auto.tytk85', '⚙️ Channelper Commission 규칙')}</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {CHANNELS.map(c => (
          <button key={c.key} onClick={() => setChannel(c.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '2px solid',
              borderColor: channel === c.key ? 'var(--accent)' : 'var(--border)',
              background: channel === c.key ? 'var(--accent)' : 'transparent',
              color: channel === c.key ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer', fontWeight: 600,
            }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, maxWidth: 600 }}>
        {[
          { field: 'platform_fee_rate', label: t('auto.r6zynz', 'Platform Commission율'), placeholder: '0.05 = 5%' },
          { field: 'ad_fee_rate', label: t('auto.6w20f2', 'Ad Spend율'), placeholder: '0.01 = 1%' },
          { field: 'vat_rate', label: t('auto.qce5y9', '부가세율'), placeholder: '0.1 = 10%' },
          { field: 'note', label: t('auto.rytfcq', '비고'), placeholder: 'Note' },
        ].map(({ field, label, placeholder }) => (
          <div key={field}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
            <input
              type={field === 'note' ? 'text' : 'number'} step="0.001"
              value={form[field]}
              onChange={e => setForm(prev => ({ ...prev, [field]: field === 'note' ? e.target.value : +e.target.value }))}
              placeholder={placeholder}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={loading}
        style={{ padding: '10px 24px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
        {loading ? 'Save in progress...' : t('auto.ctzbj7', '💾 규칙 Save')}
      </button>
      {saved && <span style={{ marginLeft: 12, color: '#27ae60', fontWeight: 700 }}>{t('auto.kq3p3v', '✅ Save되었습니다')}</span>}

      {rules.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12 }}>{t('auto.cwwnes', 'Register된 규칙 이력')}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)' }}>{t('auto.et8d60', 'Apply일')}</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)' }}>Platform Commission</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)' }}>Ad Spend</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)' }}>{t('auto.wf16yz', '부가세')}</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)' }}>{t('auto.0f6cwr', '비고')}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px' }}>{r.effective_from}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{((+r.platform_fee_rate) * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{((+r.ad_fee_rate) * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{((+r.vat_rate) * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 메인 Component ────────────────────────────────────────────────────────────
export default function Reconciliation() {
  const t = useT();
  const navigate = useNavigate();
  const { settlementStats, updateSettlement, approveSettlement, pnlStats } = useGlobalData();

  const [activeTab, setActiveTab] = useState('upload');
  const [reconRefresh, setReconRefresh] = useState(0);

  // 대사 Done 시 GlobalDataContext 정산 데이터 Update (P&L Auto 반영)
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
  }, [updateSettlement]);

  const TABS = [
    { key: 'upload', label: '📤 Upload', },
    { key: 'recon', label: t('auto.cm1t1o', '⚖️ 대사 Run'), },
    { key: 'reports', label: t('auto.zwl4qm', '📋 리포트'), },
    { key: 'tickets', label: t('auto.80sn2d', '🎫 티켓 대응'), },
    { key: 'feerules', label: '⚙️ Commission Settings', },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
          {t('auto.112s5b', '⚖️ 정산 Auto 대조 시스템')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          {t('auto.2za51t', 'Coupang·Naver·11Street·Gmarket 정산 데이터를 Upload하고, Commission 규칙과 Auto으로 대조합니다.')}
        </p>

        {/* ✅ GlobalDataContext 실Time 정산 Aggregate */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12 }}>
            ✅ <strong style={{ color: '#4ade80' }}>{t('auto.r4s8k3', '정산 Done')}</strong> ₩{(settlementStats.settledAmount / 1e6).toFixed(1)}M
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 12 }}>
            ⏳ <strong style={{ color: '#fbbf24' }}>{t('auto.k26xiq', '정산 Pending')}</strong> ₩{(settlementStats.pendingAmount / 1e6).toFixed(1)}M
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12 }}>
            💸 <strong style={{ color: '#f87171' }}>{t('auto.eo8zzk', 'Ad Spend 차감')}</strong> ₩{(settlementStats.totalAdFee / 1e6).toFixed(1)}M
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 12 }}>
            🏪 <strong style={{ color: '#c084fc' }}>Platform Commission</strong> ₩{(settlementStats.totalPlatformFee / 1e6).toFixed(1)}M
          </div>
          <button onClick={() => navigate('/pnl-dashboard')} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)', color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            {t('auto.s8ql8c', '🌊 P&L Dashboard에서 Confirm →')}
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          {t('auto.kzbeb5', '🔴 실Time P&L 영업Profit:')}<strong style={{ color: pnlStats.operatingProfit >= 0 ? '#4ade80' : '#f87171' }}>₩{(pnlStats.operatingProfit / 1e6).toFixed(1)}M</strong>
          {t('auto.o0xohs', '&nbsp;· 정산 데이터 Change 시 P&L Auto 반영됩니다')}
        </div>
      </div>

      {/* Tab 네비게이션 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0, padding: '12px 12px 0', background: 'var(--bg-card)', borderRadius: '12px 12px 0 0', border: '1px solid var(--border)', borderBottom: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', borderRadius: '8px 8px 0 0', border: 'none',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 700 : 400,
              cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 컨텐츠 */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0 0 12px 12px' }}>
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'recon' && <ReconTab onReconDone={handleReconDone} />}
        {activeTab === 'reports' && <ReportsTab refresh={reconRefresh} />}
        {activeTab === 'tickets' && <TicketsTab />}
        {activeTab === 'feerules' && <FeeRulesTab />}
      </div>
    </div>
  );
}
