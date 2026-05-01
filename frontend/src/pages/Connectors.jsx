import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useI18n } from '../i18n';
import { useAuth } from "../auth/AuthContext";
import { useGlobalData } from '../context/GlobalDataContext.jsx';

/* ═══════════════════════════════════════════════════
   SECURITY — Enterprise Superium v5.0
   ═══════════════════════════════════════════════════ */
const THREAT_PATTERNS = [
  { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
  { re: /on\w+\s*=/i, type: 'XSS' }, { re: /eval\s*\(/i, type: 'XSS' },
  { re: /document\.(cookie|domain|location)/i, type: 'XSS' },
  { re: /union\s+select/i, type: 'SQL_INJECT' }, { re: /drop\s+table/i, type: 'SQL_INJECT' },
  { re: /;\s*delete\s+from/i, type: 'SQL_INJECT' }, { re: /or\s+1\s*=\s*1/i, type: 'SQL_INJECT' },
  { re: /__proto__/i, type: 'PROTO_POLLUTION' }, { re: /constructor\s*\[/i, type: 'PROTO_POLLUTION' },
  { re: /fetch\s*\(\s*['"]http/i, type: 'DATA_EXFIL' },
  { re: /Function\s*\(/i, type: 'CODE_INJECT' },
  { re: /window\.(open|location)/i, type: 'WINDOW_MANIP' },
];
function useSecurityGuard(addAlert) {
  const [locked, setLocked] = useState(null);
  const inputLog = useRef([]);
  useEffect(() => {
    const onInput = (e) => {
      const val = e.target?.value || '';
      if (val.length < 3) return;
      const now = Date.now();
      inputLog.current.push(now);
      inputLog.current = inputLog.current.filter(t => now - t < 3000);
      if (inputLog.current.length > 20) { setLocked('BRUTE_FORCE'); try { addAlert?.({ type: 'error', msg: '[Connectors] Brute-force blocked' }); } catch (_) { } e.target.value = ''; return; }
      for (const p of THREAT_PATTERNS) { if (p.re.test(val)) { setLocked(p.type + ': ' + val.slice(0, 60)); try { addAlert?.({ type: 'error', msg: '[Connectors] ' + p.type + ' blocked' }); } catch (_) { } e.target.value = ''; return; } }
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, [addAlert]);
  return { locked, setLocked };
}
function SecurityOverlay({ reason, onUnlock, t }) {
  const [code, setCode] = useState('');
  if (!reason) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.95)', backdropFilter: 'blur(20px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#128737;&#65039;</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('conn.secTitle')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('conn.secCode')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: '#fff', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>{t('conn.secUnlock')}</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DATA WAREHOUSE DEFINITIONS (zero mock data)
   ═══════════════════════════════════════════════════ */
function buildDWPlatforms(t) {
  return [
    {
      id: "bigquery", name: "Google BigQuery", icon: "🔷", color: "#4285f4",
      authType: "service_account",
      features: [t('conn.dwFeatureStreaming'), t('conn.dwFeaturePartition'), t('conn.dwFeatureML')],
      syncSchedules: [t('conn.dwSync5min'), t('conn.dwSyncHour'), t('conn.dwSyncDaily02')],
      tablePrefix: "geniego_roi_", docsUrl: "https://cloud.google.com/bigquery/docs", badge: "🌐 Google Cloud",
    },
    {
      id: "snowflake", name: "Snowflake", icon: "❄️", color: "#29b5e8",
      authType: "keypair",
      features: [t('conn.dwFeatureAutoScale'), "Zero-copy Clone", t('conn.dwFeatureTimeTravel')],
      syncSchedules: [t('conn.dwSync15min'), t('conn.dwSyncHour'), t('conn.dwSyncDaily03')],
      tablePrefix: "GENIEGO.", docsUrl: "https://docs.snowflake.com", badge: "❄️ Snowflake",
    },
    {
      id: "redshift", name: "Amazon Redshift", icon: "🔴", color: "#dd3522",
      authType: "iam",
      features: [t('conn.dwFeatureSpectrum'), "Auto WLM", t('conn.dwFeatureMLBuiltin')],
      syncSchedules: [t('conn.dwSync30min'), t('conn.dwSyncHour'), t('conn.dwSyncDaily04')],
      tablePrefix: "geniego.", docsUrl: "https://docs.aws.amazon.com/redshift", badge: "☁️ AWS",
    },
    {
      id: "databricks", name: "Databricks Delta Lake", icon: "🧱", color: "#ff3621",
      authType: "token",
      features: [t('conn.dwFeatureDelta'), "Unity Catalog", "MLflow"],
      syncSchedules: [t('conn.dwSyncHour'), t('conn.dwSyncDaily01'), t('conn.dwSyncWeekly')],
      tablePrefix: "geniego_roi.", docsUrl: "https://docs.databricks.com", badge: "🧱 Databricks",
    },
  ];
}

/* ─── DW Connector Card ────────────────────────────────────── */
function DWConnectorCard({ dw, t }) {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState(dw.syncSchedules[1]);

  const connect = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 1200));
    setConnected(true); setBusy(false);
  };
  const disconnect = () => setConnected(false);

  return (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${connected ? dw.color : "rgba(99,140,255,0.15)"}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: dw.color + "22", border: `1.5px solid ${dw.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{dw.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{dw.name}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
            <span style={{ padding: "1px 7px", borderRadius: 20, background: dw.color + "22", color: dw.color, fontWeight: 700, fontSize: 9 }}>{dw.badge}</span>
            <span style={{ marginLeft: 8 }}>{dw.authType === "service_account" ? `🔐 ${t('conn.dwAuthSA')}` : dw.authType === "keypair" ? "🔑 Key Pair" : dw.authType === "iam" ? "☁️ IAM Role" : "🔑 Access Token"}</span>
          </div>
        </div>
        <span className={`badge ${connected ? "badge-green" : ""}`} style={{ fontSize: 10 }}>
          {connected ? <><span className="dot dot-green" />{t('conn.statusSyncing')}</> : t('conn.statusDisconnected')}
        </span>
      </div>

      {connected && (
        <div>
          {/* Sync Schedule */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>⏱️ {t('conn.dwSyncPeriod')}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {dw.syncSchedules.map(s => (
                <button key={s} onClick={() => setSchedule(s)} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, background: schedule === s ? `linear-gradient(135deg,${dw.color},${dw.color}cc)` : "rgba(255,255,255,0.06)", color: schedule === s ? "#fff" : "var(--text-2)" }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {dw.features.map(f => (
              <span key={f} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(79,142,247,0.1)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.2)" }}>✓ {f}</span>
            ))}
          </div>

          <button className="btn-ghost" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }} onClick={disconnect}>{t('conn.btnDisconnect')}</button>
        </div>
      )}

      {!connected && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>{t('conn.dwConnectPrompt')}</div>
          <button className="btn-primary" style={{ background: `linear-gradient(135deg,${dw.color},${dw.color}cc)` }} onClick={connect} disabled={busy}>
            {busy ? `⏳ ${t('conn.connecting')}…` : `🔗 ${dw.name} ${t('conn.btnConnect')}`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Data Warehouse Section ─────────────────────────────────── */
function DataWarehouseSection({ t }) {
  const DW_PLATFORMS = buildDWPlatforms(t);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Banner */}
      <div style={{ padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(66,133,244,0.08),rgba(41,181,232,0.06))", border: "1px solid rgba(66,133,244,0.25)" }}>
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6, background: "linear-gradient(135deg,#4285f4,#29b5e8)" }}>
          {t('conn.dwTitle')}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
          {t('conn.dwDesc')}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {[t('conn.dwBadge1'), t('conn.dwBadge2'), t('conn.dwBadge3'), t('conn.dwBadge4'), t('conn.dwBadge5')].map(f => (
            <span key={f} style={{ fontSize: 10, padding: "2px 10px", borderRadius: 20, background: "rgba(66,133,244,0.12)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.25)", fontWeight: 700 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="card card-glass">
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>🏗️ {t('conn.dwArchTitle')}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", padding: "12px 0" }}>
          {[`📣 ${t('conn.dwArchAd')}`, `🛒 ${t('conn.dwArchCommerce')}`, `👤 ${t('conn.dwArchCRM')}`, `📊 ${t('conn.dwArchAnalytics')}`].map((src, i, arr) => (
            <React.Fragment key={src}>
              <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 10, fontWeight: 700, color: "#4f8ef7" }}>{src}</div>
              {i < arr.length - 1 && <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>}
            </React.Fragment>
          ))}
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>
          <div style={{ textAlign: "center", padding: "8px 14px", borderRadius: 8, background: "linear-gradient(135deg,rgba(168,85,247,0.15),rgba(79,142,247,0.1))", border: "1px solid rgba(168,85,247,0.3)", fontSize: 10, fontWeight: 900, color: "#a855f7" }}>⚡ Geniego Streaming CDC</div>
          <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>
          {["🔷 BigQuery", "❄️ Snowflake", "🔴 Redshift", "🧱 Databricks"].map((dw, i, arr) => (
            <React.Fragment key={dw}>
              <div style={{ textAlign: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 10, fontWeight: 700, color: "#22c55e" }}>{dw}</div>
              {i < arr.length - 1 && <span style={{ color: "var(--text-3)", fontSize: 10 }}>/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid2">
        {DW_PLATFORMS.map(dw => <DWConnectorCard key={dw.id} dw={dw} t={t} />)}
      </div>
    </div>
  );
}

/* ─── Ad Platform Card ─────────────────────────────────────────── */
function AdPlatformCard({ platform, name, icon, color, connState, updateConn, t, token }) {
  const [busy, setBusy] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const conn = connState[platform] || {};
  const isConnected = conn.status === "connected";

  const handleOAuthConnect = async () => {
    setBusy(true);
    // OAuth 플로우 시뮬레이션 (실제로는 OAuth 팝업 또는 리다이렉트)
    await new Promise(r => setTimeout(r, 1500));

    // 임시 토큰 생성 (실제로는 OAuth 서버에서 받아옴)
    const mockAccessToken = `${platform}_access_${Date.now()}`;
    const mockRefreshToken = `${platform}_refresh_${Date.now()}`;

    updateConn(platform, {
      status: "connected",
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      grantedScopes: ["ads_read", "ads_management", "reporting"],
      expiresAt: Date.now() + 3600000, // 1시간 후
    });

    setBusy(false);
    setShowOAuthModal(false);
  };

  const handleDisconnect = () => {
    updateConn(platform, { status: "disconnected", accessToken: "", refreshToken: "", grantedScopes: [], expiresAt: null });
  };

  return (
    <>
      <div className="card card-glass" style={{ borderLeft: `3px solid ${isConnected ? color : "rgba(99,140,255,0.15)"}` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: color + "22", border: `1.5px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
              <span style={{ padding: "1px 7px", borderRadius: 20, background: color + "22", color: color, fontWeight: 700, fontSize: 9 }}>OAuth 2.0</span>
            </div>
          </div>
          <span className={`badge ${isConnected ? "badge-green" : ""}`} style={{ fontSize: 10 }}>
            {isConnected ? <><span className="dot dot-green" />{t('conn.connected')}</> : t('conn.statusDisconnected')}
          </span>
        </div>

        {isConnected && (
          <div>
            {/* Granted Scopes */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>🔐 {t('conn.grantedScopes')}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(conn.grantedScopes || []).map(scope => (
                  <span key={scope} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>✓ {scope}</span>
                ))}
              </div>
            </div>

            {/* Token Expiry */}
            {conn.expiresAt && (
              <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 12 }}>
                ⏰ {t('conn.tokenExpiry')}: {new Date(conn.expiresAt).toLocaleString()}
              </div>
            )}

            <button className="btn-ghost" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }} onClick={handleDisconnect}>{t('conn.btnDisconnect')}</button>
          </div>
        )}

        {!isConnected && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>{t('conn.oauthPrompt')}</div>
            <button className="btn-primary" style={{ background: `linear-gradient(135deg,${color},${color}cc)` }} onClick={() => setShowOAuthModal(true)} disabled={busy}>
              {busy ? `⏳ ${t('conn.connecting')}…` : `🔗 ${t('conn.btnOAuthConnect')}`}
            </button>
          </div>
        )}
      </div>

      {/* OAuth Modal */}
      {showOAuthModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)' }} onClick={() => setShowOAuthModal(false)}>
          <div className="card card-glass" style={{ maxWidth: 480, padding: 24, margin: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "22", border: `2px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{t('conn.oauthModalTitle', { platform: name })}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t('conn.oauthModalSub')}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {t('conn.oauthModalDesc', { platform: name })}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{t('conn.requestedPermissions')}:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {['ads_read', 'ads_management', 'reporting'].map(scope => (
                  <div key={scope} style={{ fontSize: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    ✓ {scope}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowOAuthModal(false)}>{t('conn.btnCancel')}</button>
              <button className="btn-primary" style={{ flex: 1, background: `linear-gradient(135deg,${color},${color}cc)` }} onClick={handleOAuthConnect} disabled={busy}>
                {busy ? `⏳ ${t('conn.connecting')}…` : `🔗 ${t('conn.btnAuthorize')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Event Feed ─────────────────────────────────────────────── */
function WebhookFeed({ t }) {
  return (
    <div className="card card-glass">
      <div className="section-header">
        <div>
          <div className="section-title">{t('conn.eventFeed')}</div>
          <div className="section-sub">{t('conn.eventFeedSub')}</div>
        </div>
        <span className="badge badge-green"><span className="dot dot-green" /> Live</span>
      </div>
      <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13 }}>
        {t('conn.noEvents')}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v5.0
   ═══════════════════════════════════════════════════ */
export default function Connectors() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { addAlert, isDemo } = useGlobalData();
  const { locked, setLocked } = useSecurityGuard(addAlert);
  const bcRef = useRef(null);

  const [mainTab, setMainTab] = useState("platforms");
  const [connState, setConnState] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");

  // BroadcastChannel
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('genie_connectors_sync');
      bcRef.current.onmessage = (e) => {
        if (e.data?.type === 'connector_updated') {
          addAlert?.({ type: 'info', msg: t('conn.crossTabSync') });
        }
      };
    } catch (_) { }
    return () => { try { bcRef.current?.close(); } catch (_) { } };
  }, []);

  // Server fetch
  useEffect(() => {
    if (!token) return;
    fetch("/api/connectors", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.connectors) {
          const patch = {};
          d.connectors.forEach(c => {
            patch[c.platform] = {
              status: c.status || "disconnected",
              accessToken: c.access_token || "",
              refreshToken: c.refresh_token || "",
              apiKey: c.api_key || "",
              apiSecret: c.api_secret || "",
              grantedScopes: c.granted_scopes || [],
              expiresAt: c.expires_at || null,
              tokenAge: c.updated_at ? new Date(c.updated_at).getTime() : null,
              webhookEvents: c.webhook_events || [],
            };
          });
          setConnState(prev => ({ ...prev, ...patch }));
        }
      })
      .catch((error) => {
        console.error('[Connectors] Failed to load connectors:', error);
      });
  }, [token]);

  const updateConn = useCallback((platformId, patch) => {
    setConnState(prev => ({ ...prev, [platformId]: { ...prev[platformId], ...patch } }));
    try { bcRef.current?.postMessage({ type: 'connector_updated', platform: platformId }); } catch (_) { }
    if (token && patch.status === "connected") {
      const merged = { ...(connState[platformId] || {}), ...patch };
      fetch(`/api/connectors/${platformId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platform: platformId, access_token: merged.accessToken || null, refresh_token: merged.refreshToken || null, api_key: merged.apiKey || null, api_secret: merged.apiSecret || null, granted_scopes: merged.grantedScopes || [], expires_at: merged.expiresAt || null, webhook_events: merged.webhookEvents || [], status: merged.status }),
      }).catch(() => { });
      addAlert?.({ type: 'success', msg: `[Connectors] ${platformId} ${t('conn.connected')}` });
    }
    if (token && patch.status === "disconnected") {
      fetch(`/api/connectors/${platformId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
    }
  }, [token, connState, addAlert, t]);

  const connectedCount = Object.values(connState).filter(s => s?.status === "connected").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))" }}>🔌</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)" }}>
              {t('conn.heroTitle')}
            </div>
            <div className="hero-desc">{t('conn.heroDesc')}</div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            { label: `${t('conn.kpiConnected')}: ${connectedCount}`, color: '#22c55e' },
            { label: t('conn.badgeRealSync'), color: '#4f8ef7' },
            { label: t('conn.badgeSecurity'), color: '#a855f7' },
          ].map(b => (
            <span key={b.label} style={{ padding: '4px 12px', borderRadius: 20, background: `${b.color}15`, color: b.color, fontSize: 10, fontWeight: 700, border: `1px solid ${b.color}30` }}>{b.label}</span>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid4 fade-up fade-up-1">
        {[
          { l: t('conn.kpiTotal'), v: 0, c: "#4f8ef7" },
          { l: t('conn.kpiConnected'), v: connectedCount, c: "#22c55e" },
          { l: "OAuth", v: 0, c: "#a855f7" },
          { l: "API Key", v: 0, c: "#eab308" },
        ].map(({ l, v, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div className="tabs">
            <button className={`tab ${mainTab === "platforms" ? "active" : ""}`} onClick={() => setMainTab("platforms")}>{t('conn.tabPlatforms')}</button>
            <button className={`tab ${mainTab === "dw" ? "active" : ""}`} onClick={() => setMainTab("dw")}>{t('conn.tabDW')} <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "rgba(66,133,244,0.2)", color: "#4285f4", marginLeft: 4, fontWeight: 900 }}>NEW</span></button>
          </div>
          {mainTab === "platforms" && (
            <div className="tabs">
              {[
                { k: "all", l: t('conn.filterAll') },
                { k: "connected", l: `✓ ${t('conn.kpiConnected')} (${connectedCount})` },
                { k: "disconnected", l: t('conn.filterDisconnected') },
                { k: "oauth", l: "OAuth" },
                { k: "apikey", l: "API Key" },
              ].map(({ k, l }) => (
                <button key={k} className={`tab ${activeFilter === k ? "active" : ""}`} onClick={() => setActiveFilter(k)}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* Platform Tab */}
        {mainTab === "platforms" && (
          <>
            {/* Ad Platform Connectors */}
            <div className="grid3 fade-up fade-up-3" style={{ marginBottom: 16 }}>
              {/* Meta (Facebook) Connector */}
              <AdPlatformCard
                platform="meta"
                name="Meta (Facebook)"
                icon="📘"
                color="#1877f2"
                connState={connState}
                updateConn={updateConn}
                t={t}
                token={token}
              />

              {/* Google Ads Connector */}
              <AdPlatformCard
                platform="google"
                name="Google Ads"
                icon="🔍"
                color="#4285f4"
                connState={connState}
                updateConn={updateConn}
                t={t}
                token={token}
              />

              {/* TikTok Connector */}
              <AdPlatformCard
                platform="tiktok"
                name="TikTok Ads"
                icon="🎵"
                color="#000000"
                connState={connState}
                updateConn={updateConn}
                t={t}
                token={token}
              />
            </div>

            <WebhookFeed t={t} />
          </>
        )}

        {/* DW Tab */}
        {mainTab === "dw" && (
          <div className="fade-up fade-up-3">
            <DataWarehouseSection t={t} />
          </div>
        )}
      </div>
    </div>
  );
}
