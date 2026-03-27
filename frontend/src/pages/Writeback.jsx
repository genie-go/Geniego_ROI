import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { getJsonAuth, postJson, postJsonAuth } from "../services/apiClient.js";
import DataTable from "../components/DataTable.jsx";

import { useT } from '../i18n/index.js';
export default function Writeback() {
  const { t } = useI18n();
  const [channel, setChannel] = useState("shopify");
  const [sku, setSku] = useState("SKU-001");
  const [prepared, setPrepared] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [categorySuggestion, setCategorySuggestion] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [err, setErr] = useState(null);

  const sampleProduct = useMemo(() => ({
    sku,
    title: "Sample Product Name",
    description: "Ready-to-test sample product description",
    price: 19900,
    currency: "KRW",
    category: "DEFAULT",
    images: [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
    ],
    attributes: {
      brand: "GENIE",
      color: "Black",
      size: "M",
    },
    options: [
      { name: "Color", values: ["Black", "White"] },
      { name: "Size", values: ["S", "M", "L"] },
    ],
  }), [sku]);

  const [productText, setProductText] = useState(JSON.stringify(sampleProduct, null, 2));
  const [preview, setPreview] = useState(null);
  const [previewErr, setPreviewErr] = useState(null);

  async function prepare() {
    try {
      setErr(null);
      const pol = await postJson(`/v401/writeback/policy_validate`, { channel, product: sampleProduct });
      setPolicy(pol);
      const cat = await postJson(`/v401/writeback/category/suggest`, { channel, product: sampleProduct });
      setCategorySuggestion(cat);
      const data = await postJson(`/v382/writeback/${channel}/${sku}/prepare?operation=publish`, {});
      setPrepared(data);
    } catch (e) { setErr(String(e)); }
  }

  async function execute() {
    try {
      setErr(null);
      let approvalId = null;
      if (prepared?.requires_approval) {
        const ar = await postJson(`/v382/approvals`, {
          type: prepared.approval_type,
          channel,
          sku,
          payload: prepared.payload,
        });
        approvalId = ar.id;
        // In real life: manager/legal approves in Approvals screen.
        // Demo: auto-approve by calling decide endpoint is not done here.
        setErr("Approval created. Go to Approvals page and approve, then execute with approval_id.");
        return;
      }
      await postJson(`/v382/writeback/${channel}/${sku}/execute`, {
        idempotency_key: `${channel}:${sku}:publish`,
        operation: "publish",
      });
      await loadJobs();
    } catch (e) { setErr(String(e)); }
  }

  async function loadJobs() {
    try {
      const data = await getJsonAuth("/v382/writeback/jobs");
      setJobs(data);
    } catch (e) { setErr(String(e)); }
  }

  async function runPreview() {
    setPreview(null);
    setPreviewErr(null);
    try {
      const product = JSON.parse(productText);
      const out = await postJsonAuth("/v398/writeback/preview", { channel, product });
      setPreview(out);
    } catch (e) {
      setPreviewErr(String(e));
    }
  }

  return (
    <div>
      <h2>{t("writeback.pageTitle") || "Write-back"}</h2>
      <div className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>Channel</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="shopify">Shopify</option>
            <option value="amazon">Amazon</option>
            <option value="qoo10">Qoo10</option>
            <option value="rakuten">Rakuten</option>
            <option value="shopee">Shopee</option>
          </select>
          <label>SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} />
          <button onClick={prepare}>Prepare</button>
          <button onClick={execute}>Execute</button>
          <button onClick={loadJobs}>Refresh Jobs</button>
          <button onClick={runPreview}>Preview/Validate</button>
        </div>


        <div className="grid2">
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Policy Validate (V401)</div>
            <pre style={{ margin: 0, fontSize: 12 }}>{policy ? JSON.stringify(policy, null, 2) : "Run Prepare to validate policy."}</pre>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Category Suggestion</div>
            <pre style={{ margin: 0, fontSize: 12 }}>{categorySuggestion ? JSON.stringify(categorySuggestion, null, 2) : "Run Prepare to get suggestion."}</pre>
          </div>
        </div>

        {err && <div style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8 }}>⚠ {err}</div>}

        {prepared && (
          <div style={{ display: "grid", gap: 8 }}>
            <div><b>Requires Approval:</b> {String(prepared.requires_approval)} {prepared.approval_type ? `(type: ${prepared.approval_type})` : ""}</div>
            <div><b>Policy Findings:</b> {prepared.findings?.length || 0}</div>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(prepared, null, 2)}</pre>
          </div>
        )}

        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800 }}>Payload Preview (V398)</div>
            <div className="pill">template=current.yaml</div>
            <div className="sub">{t('auto.drgkpj', 'Channel 템플릿 기준으로 검증 + payload/xml_body까지 Create합니다.')}</div>
          </div>
          <textarea value={productText} onChange={(e) => setProductText(e.target.value)} rows={10} style={{ width: "100%", padding: 10, borderRadius: 12 }} />
          {previewErr ? <div className="sub">Error: {previewErr}</div> : null}
          {preview ? (
            <div className="card" style={{ padding: 12, borderRadius: 18 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>Validation</div>
                <div className={preview.validation?.ok ? "pill ok" : "pill warn"}>
                  {preview.validation?.ok ? "OK" : "Needs Fix"}
                </div>
                <div className="sub">findings: {preview.validation?.findings?.length || 0}</div>
              </div>
              <pre className="code">{JSON.stringify(preview, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      </div>

      <DataTable
        title="Write-back Jobs"
        columns={[
          { key: "id", label: "ID" },
          { key: "channel", label: "Channel" },
          { key: "sku", label: "SKU" },
          { key: "operation", label: "Op" },
          { key: "status", label: "Status" },
          { key: "attempt", label: "Attempt" },
          { key: "updated_at", label: "Updated" },
        ]}
        rows={jobs}
      />
    </div>
  );
}
