import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext.jsx';
import { getJsonAuth, postJsonAuth, requestJsonAuth } from "../services/apiClient.js";
import PolicyTreeEditor from "../components/PolicyTreeEditor.jsx";

import { useT } from '../i18n/index.js';
const Card = ({ title, subtitle, right, children }) => (
  <div className="card glass" style={{ padding: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {subtitle ? (
          <div className="sub" style={{ marginTop: 6 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {right}
    </div>
    <div style={{ marginTop: 12 }}>{children}</div>
  </div>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(28,40,66,0.9)",
      background: "rgba(7,16,33,0.75)",
      color: "white",
      outline: "none",
      ...props.style,
    }}
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(28,40,66,0.9)",
      background: "rgba(7,16,33,0.75)",
      color: "white",
      outline: "none",
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span style={{ fontWeight: 800 }}>{label}</span>
  </label>
);

const ChipInput = ({ value, onChange, placeholder }) => {
  const t = useT();
  const [draft, setDraft] = useState("");
  const chips = value || [];
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <button
          className="btn"
          onClick={() => {
            const t = (draft || "").trim();
            if (!t) return;
            onChange([...(chips || []), t]);
            setDraft("");
          }}
        >
          Add
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {chips.map((c, idx) => (
          <span key={idx} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {c}
            <button
              className="chipBtn"
              onClick={() => onChange(chips.filter((x) => x !== c))}
              title="remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

function emptyPolicy() {
  return {
    name: "New Policy",
    enabled: true,
    dimension: "campaign",
    window: "daily",
    lookback: 1,
    severity: "medium",
    message_template: "{platform}/{channel} {dimension}:{key} {metric}={value} (baseline={baseline}, Δ={delta_pct})",
    scope: { include_platforms: [], exclude_platforms: [], include_channels: [], exclude_channels: [], include_keys: [], exclude_keys: [], key_prefixes: [], key_contains: [] },
    rule: { combinator: "AND", conditions: [{ metric: "roas", operator: "lt", threshold: 1 }], groups: [] },
    slack: {
      enabled: false,
      channel: null,
      webhook_url: null,
      use_threads: true,
      snooze: { enabled: true, default_minutes: 30, minutes_by_severity: { low: 20, medium: 30, high: 60, critical: 120 } },
      escalation: { enabled: false, after_hits: 3, channel: null, mention: "<!here>" },
    },
    writeback: { enabled: false, action_type: "raise_ticket", requires_approval: true, params: {} },
  };
}

export default function AlertPolicies() {
  const t = useT();
  const { isDemo } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(emptyPolicy());
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  // Slack Test Send Status
  const [testWebhook, setTestWebhook] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testBusy, setTestBusy] = useState(false);

  async function load() {
    try {
      setErr(null);
      const data = await getJsonAuth("/v410/alert_policies");
      setPolicies(data);
      if (!selected && data.length) setSelected(data[0].id);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const p = policies.find((x) => x.id === selected);
    if (p) setDraft(p);
  }, [selected, policies]);

  async function save() {
    // ── Demo Guard ──────────────────────────────────────
    if (isDemo) { setErr(t('auto.25smdq', '📌 Demo Mode: Notification 정책 Save은 실제 Account에서만 가능합니다.')); return; }
    setBusy(true);
    try {
      setErr(null);
      const body = { ...draft };
      if (draft.id) {
        await requestJsonAuth("PUT", `/v410/alert_policies/${draft.id}`, body);
      } else {
        await postJsonAuth("/v410/alert_policies", body);
      }
      await load();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    if (!id) return;
    // ── Demo Guard ──────────────────────────────────────
    if (isDemo) { setErr(t('auto.gjra61', '📌 Demo Mode: 정책 Delete는 실제 Account에서만 가능합니다.')); return; }
    setBusy(true);
    try {
      await requestJsonAuth("DELETE", `/v410/alert_policies/${id}`);
      setSelected(null);
      setDraft(emptyPolicy());
      await load();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runEvaluate() {
    // ── Demo Guard ──────────────────────────────────────
    if (isDemo) { setErr(t('auto.mi7ool', '📌 Demo Mode: Notification 평가 Run은 실제 Account에서만 가능합니다.')); return; }
    setBusy(true);
    try {
      setErr(null);
      await postJsonAuth(`/v410/alerts/evaluate?window=${draft.window}&send_slack=true`, {});
      alert("Evaluate completed. Check Alerts / Action Center for results.");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  // Slack / Email Test Send
  async function sendTestNotify(channel) {
    // ── Demo Guard ──────────────────────────────────────
    if (isDemo) { setTestResult({ ok: false, detail: t('auto.e7chl6', '📌 Demo Mode: Test Notification Send은 실제 Account에서만 가능합니다.'), channel }); return; }
    const target = channel === 'slack' ? testWebhook : testEmail;
    if (!target.trim()) { alert(channel === 'slack' ? t('auto.2jw234', 'Slack 웹훅 URL을 입력하세요') : t('auto.swwa95', 'Email Address를 입력하세요')); return; }
    setTestBusy(true); setTestResult(null);
    try {
      const res = await fetch('/api/v423/alerts/test-notify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, target: target.trim(), policy_id: draft.id ?? 0 }),
      });
      const data = await res.json();
      setTestResult({ ...data, channel });
    } catch (e) {
      setTestResult({ ok: false, detail: e.message, channel });
    } finally {
      setTestBusy(false);
    }
  }

  const [mainTab, setMainTab] = useState("policies");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Tab 바 */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(28,40,66,0.9)", paddingBottom: 0 }}>
        {[
          { id: "policies", label: t('auto.mzr83u', '🚨 Notification 정책') },
          { id: "presets", label: t('auto.gckxb4', '🧰 Action 프리셋') },
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} style={{
            padding: "11px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: "transparent", border: "none", outline: "none",
            borderBottom: mainTab === t.id ? "2px solid #4f8ef7" : "2px solid transparent",
            color: mainTab === t.id ? "#e2e8f0" : "#7c8fa8", marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── 기존 Notification 정책 Tab ──────────────────────────── */}
      {mainTab === "policies" && (<div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>🚨 Alert Policy Engine (V408)</h2>
            <div className="sub" style={{ marginTop: 6 }}>
              {t('auto.8bh6tu', 'AND/OR 트리(드래그/in progress첩) + 스코프 Filter + Slack(스레드/스누즈/에스컬레이션) + Write-back Approval/감사 로그.')}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => { setSelected(null); setDraft(emptyPolicy()); }}>
              + New
            </button>
            <button className="btn" onClick={save} disabled={busy}>
              Save
            </button>
            <button className="btn" onClick={runEvaluate} disabled={busy}>
              Run Evaluate
            </button>
            {draft.id ? (
              <button className="btn danger" onClick={() => del(draft.id)} disabled={busy}>
                Delete
              </button>
            ) : null}
          </div>
        </div>

        {err ? (
          <div className="card" style={{ padding: 12 }}>
            Error: {err}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
          <Card
            title="Policies"
            subtitle="Select / edit"
            right={<span className="badge">{policies.length}</span>}
          >
            <div style={{ display: "grid", gap: 8 }}>
              {policies.map((p) => (
                <button
                  key={p.id}
                  className="btn"
                  onClick={() => setSelected(p.id)}
                  style={{
                    textAlign: "left",
                    justifyContent: "space-between",
                    display: "flex",
                    gap: 8,
                    opacity: selected === p.id ? 1 : 0.8,
                  }}
                >
                  <span style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <span className="badge">{p.window}/{p.dimension}</span>
                </button>
              ))}
              {!policies.length ? <div className="sub">No policies yet.</div> : null}
            </div>
          </Card>

          <div style={{ display: "grid", gap: 16 }}>
            <Card title="Basics">
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div className="sub">Name</div>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div>
                  <div className="sub">Window</div>
                  <Select
                    value={draft.window}
                    onChange={(v) => setDraft({ ...draft, window: v })}
                    options={[
                      { value: "daily", label: "daily" },
                      { value: "weekly", label: "weekly" },
                    ]}
                  />
                </div>
                <div>
                  <div className="sub">Dimension</div>
                  <Select
                    value={draft.dimension}
                    onChange={(v) => setDraft({ ...draft, dimension: v })}
                    options={[
                      { value: "campaign", label: "campaign" },
                      { value: "sku", label: "sku" },
                      { value: "creator", label: "creator" },
                      { value: "platform", label: "platform" },
                    ]}
                  />
                </div>
                <div>
                  <div className="sub">Severity</div>
                  <Select
                    value={draft.severity}
                    onChange={(v) => setDraft({ ...draft, severity: v })}
                    options={[
                      { value: "low", label: "low" },
                      { value: "medium", label: "medium" },
                      { value: "high", label: "high" },
                    ]}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <Toggle checked={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} label="Enabled" />
                <div className="sub">Lookback</div>
                <Input type="number" value={draft.lookback} onChange={(e) => setDraft({ ...draft, lookback: Number(e.target.value) })} style={{ width: 120 }} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div className="sub">Message template (optional)</div>
                <Input value={draft.message_template || ""} onChange={(e) => setDraft({ ...draft, message_template: e.target.value })} />
              </div>
            </Card>

            <Card title="Rule Tree (AND/OR) — drag & nest">
              <PolicyTreeEditor value={draft.rule} onChange={(rule) => setDraft({ ...draft, rule })} />
            </Card>

            <Card title="Scope Filters (optional)" subtitle="Apply only to specific platform/channel/keys">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div className="sub">include_platforms</div>
                  <ChipInput
                    value={draft.scope?.include_platforms || []}
                    onChange={(v) => setDraft({ ...draft, scope: { ...draft.scope, include_platforms: v } })}
                    placeholder="e.g. naver, coupang, meta, tiktok, youtube"
                  />
                </div>
                <div>
                  <div className="sub">exclude_platforms</div>
                  <ChipInput
                    value={draft.scope?.exclude_platforms || []}
                    onChange={(v) => setDraft({ ...draft, scope: { ...draft.scope, exclude_platforms: v } })}
                    placeholder="exclude platforms"
                  />
                </div>
                <div>
                  <div className="sub">include_channels</div>
                  <ChipInput
                    value={draft.scope?.include_channels || []}
                    onChange={(v) => setDraft({ ...draft, scope: { ...draft.scope, include_channels: v } })}
                    placeholder="e.g. ads, commerce, ugc"
                  />
                </div>
                <div>
                  <div className="sub">key_prefixes</div>
                  <ChipInput
                    value={draft.scope?.key_prefixes || []}
                    onChange={(v) => setDraft({ ...draft, scope: { ...draft.scope, key_prefixes: v } })}
                    placeholder="e.g. SKU-, CAM-"
                  />
                </div>
              </div>
            </Card>

            <Card title="Slack Notification" subtitle="Threads + Snooze + Escalation">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <Toggle
                  checked={draft.slack?.notify}
                  onChange={(v) => setDraft({ ...draft, slack: { ...draft.slack, notify: v } })}
                  label="Notify Slack"
                />
                <Toggle
                  checked={draft.slack?.use_threads}
                  onChange={(v) => setDraft({ ...draft, slack: { ...draft.slack, use_threads: v } })}
                  label="Use Threads"
                />
                <div>
                  <div className="sub">Snooze (minutes)</div>
                  <Input
                    type="number"
                    value={draft.slack?.snooze_minutes ?? 30}
                    onChange={(e) => setDraft({ ...draft, slack: { ...draft.slack, snooze_minutes: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <div className="sub">Channel (optional)</div>
                  <Input value={draft.slack?.channel || ""} onChange={(e) => setDraft({ ...draft, slack: { ...draft.slack, channel: e.target.value || null } })} placeholder="#ops-alerts" />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="sub">Webhook URL override (optional)</div>
                <Input value={draft.slack?.webhook_url || ""} onChange={(e) => setDraft({ ...draft, slack: { ...draft.slack, webhook_url: e.target.value || null } })} placeholder="leave blank to use env SLACK_WEBHOOK_URL or bot token" />
              </div>

              <div style={{ marginTop: 12, borderTop: "1px solid rgba(28,40,66,0.8)", paddingTop: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Toggle
                    checked={draft.slack?.escalation?.enabled}
                    onChange={(v) =>
                      setDraft({
                        ...draft,
                        slack: { ...draft.slack, escalation: { ...(draft.slack?.escalation || {}), enabled: v } },
                      })
                    }
                    label="Escalation"
                  />
                  <div style={{ width: 180 }}>
                    <div className="sub">After count</div>
                    <Input
                      type="number"
                      value={draft.slack?.escalation?.after_hits ?? 3}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          slack: { ...draft.slack, escalation: { ...(draft.slack?.escalation || {}), after_hits: Number(e.target.value) } },
                        })
                      }
                    />
                  </div>
                  <div style={{ width: 220 }}>
                    <div className="sub">Escalation channel</div>
                    <Input
                      value={draft.slack?.escalation?.channel || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          slack: { ...draft.slack, escalation: { ...(draft.slack?.escalation || {}), channel: e.target.value || null } },
                        })
                      }
                      placeholder="#oncall"
                    />
                  </div>
                  <div style={{ width: 220 }}>
                    <div className="sub">Mention</div>
                    <Input
                      value={draft.slack?.escalation?.mention || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          slack: { ...draft.slack, escalation: { ...(draft.slack?.escalation || {}), mention: e.target.value || null } },
                        })
                      }
                      placeholder="<!here> or <@U123>"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Write-back Action (Approval → Execute → Audit)" subtitle="Demo-safe execution (simulated) but operational flow is real">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "end" }}>
                <Toggle
                  checked={draft.writeback?.enabled}
                  onChange={(v) => setDraft({ ...draft, writeback: { ...draft.writeback, enabled: v } })}
                  label="Enable Write-back"
                />
                <div>
                  <div className="sub">Action type</div>
                  <Select
                    value={draft.writeback?.action_type || "raise_ticket"}
                    onChange={(v) => setDraft({ ...draft, writeback: { ...draft.writeback, action_type: v } })}
                    options={[
                      { value: "raise_ticket", label: "raise_ticket" },
                      { value: "pause_campaign", label: "pause_campaign" },
                      { value: "reduce_budget", label: "reduce_budget" },
                      { value: "pause_product", label: "pause_product" },
                    ]}
                  />
                </div>
                <Toggle
                  checked={draft.writeback?.requires_approval}
                  onChange={(v) => setDraft({ ...draft, writeback: { ...draft.writeback, requires_approval: v } })}
                  label="Requires approval"
                />
              </div>
              <div className="sub" style={{ marginTop: 10 }}>
                {t('auto.zh1qxk', 'Run 결과는 Action Center에서 Approval/Run/감사 로그로 Confirm할 Count 있습니다.')}
              </div>
            </Card>

            {/* ── Notification Test Send ── */}
            <Card title="🧪 Notification Test Send" subtitle={t('auto.5ugkrf', 'Slack 웹훅 또는 Email로 즉시 Test Send')}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", marginBottom: 12 }}>
                <div>
                  <div className="sub">Slack Webhook URL</div>
                  <Input
                    value={testWebhook}
                    onChange={(e) => setTestWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                <button className="btn" onClick={() => sendTestNotify('slack')} disabled={testBusy} style={{ whiteSpace: 'nowrap' }}>
                  {testBusy ? 'Send in progress...' : '📤 Slack Test'}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                <div>
                  <div className="sub">Email Address</div>
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <button className="btn" onClick={() => sendTestNotify('email')} disabled={testBusy} style={{ whiteSpace: 'nowrap' }}>
                  {testBusy ? 'Send in progress...' : '📧 Email Test'}
                </button>
              </div>
              {testResult && (
                <div style={{
                  marginTop: 12, padding: 12, borderRadius: 8,
                  background: testResult.ok ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.15)',
                  border: `1px solid ${testResult.ok ? '#27ae60' : '#e74c3c'}`,
                  color: testResult.ok ? '#27ae60' : '#e74c3c',
                  fontWeight: 700,
                }}>
                  {testResult.ok ? '✅' : '❌'} {testResult.detail}
                  {testResult.channel && <span style={{ marginLeft: 8, fontWeight: 400, opacity: 0.8 }}>({testResult.channel})</span>}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      )} {/* policies Tab 끝 */}

      {/* ── Action 프리셋 Tab (ActionPresets Unified) ──────── */}
      {mainTab === "presets" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{t('auto.w3od4h', '🧰 Action 프리셋 라이브러리')}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t('auto.bqxgxj', 'Notification 발생 시 Auto으로 Run할 Write-back Action 템플릿 모음')}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {[
              { name: t('auto.qkkmnp', 'Campaign 일시정지'), icon: "⏸️", desc: t('auto.w5qgaw', 'ROAS 임계Value 이하 시 Meta/TikTok Campaign Auto 일시정지'), category: "Ad", color: "#f59e0b", uses: 24, lastUsed: t('auto.tb5fnf', '2Time 전') },
              { name: t('auto.yxgb6h', 'Budget 30% 삭감'), icon: "💸", desc: t('auto.9plavm', 'ROAS < 1.0 Period 3일 이상 시 Ad Spend 30% Auto Decrease'), category: "Ad", color: "#ef4444", uses: 11, lastUsed: t('auto.tte7ij', '6Time 전') },
              { name: t('auto.34an2u', 'Slack 즉시 Notification'), icon: "📤", desc: t('auto.hfcznv', '#ops-alerts Channel에 상황 Summary 즉시 Send'), category: "Notification", color: "#4f8ef7", uses: 87, lastUsed: t('auto.6odutv', '15분 전') },
              { name: t('auto.ps1rbq', '지라 티켓 Create'), icon: "🎫", desc: t('auto.ga42ac', 'Critical Notification 발생 시 Jira 이슈 Auto Generate 및 Owner 할당'), category: t('auto.g490mm', '워크플로'), color: "#a855f7", uses: 33, lastUsed: t('auto.ea765n', '1일 전') },
              { name: "Coupon Auto Send", icon: "🎁", desc: t('auto.qkwef8', '고가치 Customer 이탈 Forecast 시 10% Coupon Auto Send (Kakao+Email)'), category: "CRM", color: "#22c55e", uses: 19, lastUsed: t('auto.3ck4pc', '3Time 전') },
              { name: t('auto.c3fs0f', 'Stock 발주 요청'), icon: "📦", desc: t('auto.nzwqg9', '30일 내 Stock 소진 Forecast 시 발주Team에 Email+Approval 요청'), category: t('auto.h53dub', '물류'), color: "#14d9b0", uses: 8, lastUsed: t('auto.h0jnqu', '2일 전') },
            ].map(p => (
              <div key={p.name} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</div>
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: `${p.color}15`, color: p.color, fontWeight: 700 }}>{p.category}</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12, lineHeight: 1.6 }}>{p.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                    <span>Run {p.uses}회 · {p.lastUsed}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ padding: "4px 10px", fontSize: 10, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontWeight: 600 }}>{t('auto.eiyn3w', '편집')}</button>
                    <button style={{ padding: "4px 10px", fontSize: 10, borderRadius: 6, border: "none", background: `${p.color}20`, color: p.color, cursor: "pointer", fontWeight: 700 }}>▶ Run</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f8ef7)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", width: "fit-content" }}>{t('auto.0ywsne', '+ 새 프리셋 Add')}</button>
        </div>
      )}
    </div>
  );
}
