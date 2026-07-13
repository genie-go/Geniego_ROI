import React, { useEffect, useMemo, useState } from "react";
// [현 차수] 헤더리스 getJson → getJsonAuth. FeedTemplate::versions/current 는 tenant '' 시 401.
import { getJsonAuth as getJson, postJson, putJson } from "../services/apiClient";
import { useT } from '../i18n/index.js';

/* [282차 R3] 피드 변환 규칙 빌더 — 필드별 [source|value|template] + 순서있는 transform 파이프라인 + 라이브 dry-run 프리뷰.
 *   저장 포맷 = JSON 스펙(백엔드 FeedTransform 이 실제 전송 직전 적용). 발행 시 catalog writeback 파이프라인이 자동 소비. */

// writeback 실어댑터 보유 채널(백엔드 FeedTemplate::CHANNELS 정합).
const CHANNELS = [
  ["shopee", "Shopee"], ["lazada", "Lazada"], ["qoo10", "Qoo10"], ["rakuten", "Rakuten"], ["amazon", "Amazon"],
  ["ebay", "eBay"], ["etsy", "Etsy"], ["walmart", "Walmart"], ["yahoo_jp", "Yahoo! JP"], ["cafe24", "Cafe24"],
  ["coupang", "쿠팡"], ["naver", "네이버"], ["tiktok", "TikTok Shop"], ["11st", "11번가"], ["gmarket", "G마켓"],
  ["auction", "옥션"], ["lotteon", "롯데온"], ["woocommerce", "WooCommerce"], ["magento", "Magento"], ["shopify", "Shopify"],
];
// 오버레이 시 실전송에 즉시 반영되는 canonical 필드(그 외 target 은 채널-네이티브 확장으로 전달).
const CANONICAL = ["title", "name", "price", "currency", "inventory", "quantity", "category", "category_code", "spec", "detail_html", "image_url", "brand", "maker", "model", "barcode", "origin", "description"];
const SOURCE_FIELDS = ["sku", "title", "name", "price", "currency", "inventory", "category", "brand", "spec", "detail_html", "image_url", "maker", "model", "barcode", "origin"];

// 각 op 의 파라미터 스키마(입력 렌더용). 없으면 파라미터 없음.
const OP_PARAMS = {
  trim: [], upper: [], lower: [], ucfirst: [], strip_html: [],
  truncate: [["len", "길이", "number"], ["suffix", "말줄임", "text"]],
  prefix: [["text", "접두문자", "text"]], suffix: [["text", "접미문자", "text"]],
  replace: [["from", "찾기", "text"], ["to", "바꾸기", "text"]],
  regex_replace: [["pattern", "정규식", "text"], ["replacement", "치환", "text"]],
  map: [["table", "매핑표(JSON)", "json"], ["fallback", "미일치시(keep/empty/값)", "text"]],
  number_format: [["decimals", "소수", "number"], ["thousands_sep", "천단위구분", "text"]],
  multiply: [["by", "×", "number"]], divide: [["by", "÷", "number"]], add: [["by", "+", "number"]], subtract: [["by", "−", "number"]],
  round: [["to", "반올림단위", "number"]], ceil: [["to", "올림단위", "number"]], floor: [["to", "내림단위", "number"]],
  clamp: [["min", "최소", "number"], ["max", "최대", "number"]],
  pad: [["len", "길이", "number"], ["char", "채움문자", "text"], ["side", "left/right", "text"]],
  substring: [["start", "시작", "number"], ["len", "길이", "number"]],
  default_if_empty: [["value", "기본값", "text"]],
  date_format: [["format", "형식(Y-m-d)", "text"]],
  concat: [["field", "결합필드", "text"], ["sep", "구분자", "text"]],
  coalesce: [["fields", "우선필드(쉼표)", "text"], ["default", "기본값", "text"]],
};
const OP_LIST = Object.keys(OP_PARAMS);
const DEFAULT_SAMPLE = {
  sku: "SKU-001", title: "프리미엄 무선 이어폰 노이즈캔슬링", name: "무선이어폰",
  price: 29900, currency: "KRW", inventory: 12, category: "전자/음향", brand: "GenieGo",
  spec: "블루투스 5.3 / 30시간", detail_html: "<p>최고의 <b>음질</b></p>", image_url: "https://cdn.example.com/a.jpg",
};

export default function RulesEditorV2() {
  const t = useT();
  const [channel, setChannel] = useState("shopee");
  const [draftId, setDraftId] = useState(null);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);      // [{target, mode, src, required, transforms:[{op,...}]}]
  const [msg, setMsg] = useState("");
  const [sample, setSample] = useState(JSON.stringify(DEFAULT_SAMPLE, null, 2));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  // 규칙 → JSON 스펙.
  const buildSpec = () => ({
    version: 2,
    fields: rules.filter(r => (r.target || "").trim()).map(r => {
      const f = { target: r.target.trim() };
      if (r.mode === "value") f.value = r.src;
      else if (r.mode === "template") f.template = r.src;
      else f.source = (r.src || r.target).trim();
      if (r.required) f.required = true;
      if (Array.isArray(r.transforms) && r.transforms.length) f.transforms = r.transforms;
      return f;
    }),
  });

  // JSON 스펙(또는 레거시 YAML) → 규칙.
  const parseToRules = (text) => {
    if (!text || !text.trim()) return [];
    try {
      const j = JSON.parse(text);
      if (j && Array.isArray(j.fields)) {
        return j.fields.map(f => ({
          target: f.target || "",
          mode: f.value != null ? "value" : (f.template ? "template" : "source"),
          src: f.value != null ? f.value : (f.template || f.source || ""),
          required: !!f.required,
          transforms: Array.isArray(f.transforms) ? f.transforms : [],
        }));
      }
      if (j && j.mapping) return Object.entries(j.mapping).map(([s, tg]) => ({ target: String(tg), mode: "source", src: s, required: false, transforms: [] }));
    } catch { /* 레거시 YAML 폴백 */ }
    const out = []; let inMap = false;
    for (const ln of text.split("\n")) {
      if (ln.trim() === "mapping:") { inMap = true; continue; }
      if (inMap && ln.startsWith("  ") && ln.includes(":")) {
        const m = ln.trim().match(/^([^:]+):\s*(.+)$/);
        if (m) out.push({ target: m[2].trim(), mode: "source", src: m[1].trim(), required: false, transforms: [] });
      } else if (inMap && !ln.startsWith(" ")) inMap = false;
    }
    return out;
  };

  async function refreshMeta() { try { const d = await getJson(`/v395/templates/v2/${channel}/versions`); setMeta(d.meta); } catch { setMeta(null); } }
  async function loadCurrent() { try { const d = await getJson(`/v395/templates/v2/${channel}/current`); setRules(parseToRules(d.text || "")); } catch { setRules([]); } }
  useEffect(() => { refreshMeta(); loadCurrent(); setDraftId(null); setPreview(null); /* eslint-disable-next-line */ }, [channel]);

  // ── 규칙 편집 ──
  const addRule = () => setRules(r => [...r, { target: "", mode: "source", src: "", required: false, transforms: [] }]);
  const setRule = (i, patch) => setRules(r => r.map((x, j) => j === i ? { ...x, ...patch } : x));
  const delRule = (i) => setRules(r => r.filter((_, j) => j !== i));
  const addTransform = (i) => setRule(i, { transforms: [...(rules[i].transforms || []), { op: "trim" }] });
  const setTransform = (i, k, patch) => setRule(i, { transforms: rules[i].transforms.map((tr, j) => j === k ? { ...tr, ...patch } : tr) });
  const delTransform = (i, k) => setRule(i, { transforms: rules[i].transforms.filter((_, j) => j !== k) });
  const changeOp = (i, k, op) => setTransform(i, k, { op }); // 파라미터는 유지(op 별로 무시됨)

  // ── 라이브 프리뷰(dry-run) ──
  async function runPreview() {
    setBusy(true); setPreview(null);
    let product = {}; try { product = JSON.parse(sample); } catch { setMsg("샘플 상품 JSON 형식 오류"); setBusy(false); return; }
    try {
      const spec = JSON.stringify(buildSpec());
      const d = await postJson(`/v395/templates/v2/${channel}/preview`, { text: spec, product });
      setPreview(d);
    } catch (e) { setMsg("미리보기 실패: " + (e?.message || "")); }
    finally { setBusy(false); }
  }

  // ── 워크플로우 ──
  async function createDraft() { const d = await postJson(`/v395/templates/v2/${channel}/drafts`, { created_by: "admin" }); if (!d?.draft?.id) { setMsg(`Draft 생성 실패: ${d?.error || '응답 없음'}`); return; } setDraftId(d.draft.id); setMsg(`초안 생성: ${d.draft.id}`); }
  async function saveDraft() { if (!draftId) { setMsg("초안을 먼저 생성하세요."); return; } await putJson(`/v395/templates/v2/${channel}/drafts/${draftId}`, { text: JSON.stringify(buildSpec(), null, 2), updated_by: "admin" }); setMsg(`저장됨: ${draftId}`); await refreshMeta(); }
  async function submit() { if (!draftId) return; await postJson(`/v395/templates/v2/${channel}/drafts/${draftId}/submit`, { user: "admin" }); setMsg(`제출됨: ${draftId}`); await refreshMeta(); }
  async function approve() { if (!draftId) return; await postJson(`/v395/templates/v2/${channel}/drafts/${draftId}/approve`, { user: "admin" }); setMsg(`승인됨: ${draftId}`); await refreshMeta(); }
  async function publish() { if (!draftId) return; await postJson(`/v395/templates/v2/${channel}/drafts/${draftId}/publish`, { user: "admin" }); setMsg(`배포됨(실전송 적용): ${draftId}`); await refreshMeta(); await loadCurrent(); }

  const cell = { padding: "6px 8px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: "100%", boxSizing: "border-box" };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{t('rulesEditorPage.pageTitle2', '피드 변환 규칙 (실전송 적용 · 버전/승인/배포)')}</div>
          <div className="sub" style={{ marginTop: 6 }}>{t('rulesEditorPage.pageSub2', '채널별 필드 매핑 + 변환 파이프라인을 만들고, 배포하면 상품 전송 시 자동 적용됩니다.')}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10 }}>
            {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn" onClick={createDraft}>{t("rulesEditorPage.draftCreate", "초안 생성")}</button>
          <button className="btn" onClick={saveDraft}>{t("rulesEditorPage.save", "저장")}</button>
          <button className="btn" onClick={submit}>{t('rulesEditorPage.submit', '제출')}</button>
          <button className="btn" onClick={approve}>{t("rulesEditorPage.approval", "승인")}</button>
          <button className="btn" onClick={publish}>{t('rulesEditorPage.publish', '배포')}</button>
        </div>
      </div>

      {msg ? <div className="card" style={{ marginTop: 12 }}>{msg}</div> : null}
      <div className="sub" style={{ marginTop: 10 }}>{t('rulesEditorPage.draftId', '초안 ID')}: <b>{draftId || "-"}</b> / {t('rulesEditorPage.published', '배포됨')}: <b>{meta?.current_published || "-"}</b></div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        {/* 규칙 빌더 */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>{t('rulesEditorPage.rules', '필드 규칙')}</div>
            <button className="btn" onClick={addRule}>+ {t('rulesEditorPage.addRule', '규칙 추가')}</button>
          </div>
          {rules.length === 0 && <div className="sub">{t('rulesEditorPage.noRules', '규칙이 없습니다. [규칙 추가]로 시작하세요.')}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rules.map((r, i) => (
              <div key={i} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1.4fr auto", gap: 8, alignItems: "center" }}>
                  <input list="canon" value={r.target} onChange={e => setRule(i, { target: e.target.value })} placeholder={t('rulesEditorPage.target', '대상 채널필드')} style={cell} />
                  <select value={r.mode} onChange={e => setRule(i, { mode: e.target.value })} style={cell}>
                    <option value="source">{t('rulesEditorPage.mSource', '소스필드')}</option>
                    <option value="value">{t('rulesEditorPage.mValue', '상수값')}</option>
                    <option value="template">{t('rulesEditorPage.mTemplate', '템플릿')}</option>
                  </select>
                  {r.mode === "source"
                    ? <input list="srcf" value={r.src} onChange={e => setRule(i, { src: e.target.value })} placeholder="source" style={cell} />
                    : <input value={r.src} onChange={e => setRule(i, { src: e.target.value })} placeholder={r.mode === "template" ? "예: [{brand}] {title}" : "상수값"} style={cell} />}
                  <button className="btn" onClick={() => delRule(i)} title={t("rulesEditorPage.delete", "삭제")}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12 }}><input type="checkbox" checked={!!r.required} onChange={e => setRule(i, { required: e.target.checked })} /> {t('rulesEditorPage.required', '필수')}</label>
                  {CANONICAL.includes((r.target || "").trim()) && <span style={{ fontSize: 11, color: "#0a7", fontWeight: 700 }}>● {t('rulesEditorPage.liveField', '실전송 반영')}</span>}
                  <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => addTransform(i)}>+ {t('rulesEditorPage.addTransform', '변환')}</button>
                </div>
                {(r.transforms || []).map((tr, k) => (
                  <div key={k} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "wrap", background: "#fafafa", padding: 6, borderRadius: 8 }}>
                    <select value={tr.op} onChange={e => changeOp(i, k, e.target.value)} style={{ ...cell, width: 130 }}>
                      {OP_LIST.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    {(OP_PARAMS[tr.op] || []).map(([pk, pl, pt]) => (
                      pt === "json"
                        ? <input key={pk} value={typeof tr[pk] === "object" ? JSON.stringify(tr[pk]) : (tr[pk] || "")} onChange={e => { let v = e.target.value; try { v = JSON.parse(e.target.value); } catch { /* keep string */ } setTransform(i, k, { [pk]: v }); }} placeholder={pl} style={{ ...cell, width: 160 }} />
                        : <input key={pk} type={pt === "number" ? "number" : "text"} value={tr[pk] ?? ""} onChange={e => setTransform(i, k, { [pk]: pt === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })} placeholder={pl} style={{ ...cell, width: 110 }} />
                    ))}
                    <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => delTransform(i, k)}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <datalist id="canon">{CANONICAL.map(f => <option key={f} value={f} />)}</datalist>
          <datalist id="srcf">{SOURCE_FIELDS.map(f => <option key={f} value={f} />)}</datalist>
        </div>

        {/* 라이브 프리뷰(dry-run) */}
        <div className="card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{t('rulesEditorPage.preview', '변환 미리보기 (dry-run)')}</div>
          <div className="sub" style={{ marginBottom: 6 }}>{t('rulesEditorPage.sampleProduct', '샘플 상품(JSON)')}</div>
          <textarea value={sample} onChange={e => setSample(e.target.value)} rows={10} style={{ width: "100%", fontFamily: "monospace", fontSize: 12, borderRadius: 8, border: "1px solid #ddd", boxSizing: "border-box", padding: 8 }} />
          <button className="btn" onClick={runPreview} disabled={busy} style={{ marginTop: 8 }}>{busy ? "…" : t('rulesEditorPage.runPreview', '미리보기 실행')}</button>
          {preview && (
            <div style={{ marginTop: 10 }}>
              {preview.errors?.length > 0 && <div style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>⚠ {t('rulesEditorPage.missingReq', '필수 누락')}: {preview.errors.join(", ")}</div>}
              {preview.warnings?.length > 0 && <div style={{ color: "#d97706", fontSize: 12, marginBottom: 6 }}>{preview.warnings.join("; ")}</div>}
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 4 }}>{t('rulesEditorPage.mappedOut', '변환 결과(전송값)')}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {Object.entries(preview.mapped || {}).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 8, fontSize: 12, padding: "3px 6px", background: CANONICAL.includes(k) ? "#e8f7f0" : "#f5f5f5", borderRadius: 6 }}>
                    <b style={{ minWidth: 120 }}>{k}</b><span style={{ wordBreak: "break-all" }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
                {Object.keys(preview.mapped || {}).length === 0 && <div className="sub">{t('rulesEditorPage.noOutput', '변환 결과 없음(규칙을 추가하세요).')}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
