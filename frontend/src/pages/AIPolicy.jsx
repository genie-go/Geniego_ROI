import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { getJsonAuth, postJsonAuth } from "../services/apiClient.js";

const Card = ({ title, subtitle, children, right }) => (
  <div className="card glass">
    <div className="cardHeader">
      <div>
        <div className="cardTitle">{title}</div>
        {subtitle && <div className="cardSubtitle">{subtitle}</div>}
      </div>
      {right}
    </div>
    <div className="cardBody">{children}</div>
  </div>
);

export default function AIPolicy() {
  const { t } = useI18n();
  const [dimension, setDimension] = useState("campaign");
  const [days, setDays] = useState(14);
  const [data, setData] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const j = await getJsonAuth(`/v416/ai/policies/suggest?days=${days}&dimension=${dimension}`);
      setData((Array.isArray(j) ? j : (j.suggestions || [])));
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  async function applySuggestion(s) {
    const body = {
      name: s.name,
      is_enabled: true,
      dimension: s.dimension || dimension,
      severity: s.severity || "medium",
      condition_tree: s.condition_tree,
      scope: {},
      slack: { enabled: true, snooze_minutes_default: 30, minutes_by_severity: { high: 10, medium: 30, low: 60 } },
      writeback: { enabled: false, required_approvals: 2 },
    };
    await postJsonAuth("/v411/alert_policies", body);
    await load();
    alert("Created policy from AI suggestion.");
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="h1">{t("aiPolicy.pageTitle") || "🤖 AI Policy Suggestions"}</div>
          <div className="muted">{t("aiPolicy.pageSub") || "Learns guardrails from recent rollup distributions."}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="input">
            <option value="campaign">campaign</option>
            <option value="sku">sku</option>
            <option value="creator">creator</option>
            <option value="platform">platform</option>
          </select>
          <input className="input" type="number" min="7" max="60" value={days} onChange={(e) => setDays(parseInt(e.target.value || "14", 10))} style={{ width: 90 }} />
          <button className="btn" onClick={load}>Refresh</button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <Card title="Suggested policies" subtitle="Click Apply to create an editable policy in Alert Policy Engine.">
        <div style={{ display: "grid", gap: 10 }}>
          {data.map((s, idx) => (
            <div key={idx} className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{s.name}</div>
                <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {s.human_explanation || ""}
                </div>
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>Rule:</span>{" "}
                  {s.metric} {s.operator} {String(s.threshold)}

                  {s.policy_sentence && (
                    <div className="mt-2 text-sm">
                      <div className="font-semibold">Policy Sentence</div>
                      <div className="opacity-90">{s.policy_sentence}</div>
                    </div>
                  )}
                  {Array.isArray(s.evidence_table) && s.evidence_table.length > 0 && (
                    <div className="mt-3 text-sm">
                      <div className="font-semibold mb-1">Basis Metric Summary</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="opacity-70">
                              <th className="text-left p-1">Item</th>
                              <th className="text-left p-1">Value</th>
                              <th className="text-left p-1">Criteria</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.evidence_table.map((r, idx) => (
                              <tr key={idx} className="border-t border-white/10">
                                <td className="p-1">{r["Item"]}</td>
                                <td className="p-1">{String(r["Value"])}</td>
                                <td className="p-1">{r["Criteria"]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {s.scope && (
                    <div className="mt-3 text-xs opacity-80">
                      <span className="font-semibold">Auto Scope:</span>{" "}
                      {s.scope.include_keys ? s.scope.include_keys.join(", ") : JSON.stringify(s.scope)}
                    </div>
                  )}

                  {s.recommended_action_preset_id && (
                    <>
                      {" "}· <span style={{ fontWeight: 700 }}>Preset:</span>{" "}
                      {s.recommended_action_preset_id}
                    </>
                  )}
                </div>
              </div>
              <button className="btn" onClick={() => applySuggestion(s)}>Apply</button>
            </div>
          ))}
          {data.length === 0 && <div className="muted">No suggestions yet (need rollup history).</div>}
        </div>
      </Card>
    </div>
  );
}
