// [272차] 통합 데이터 플랫폼 1단계 — 데이터 자산(회사/브랜드 프로필 + 데이터 소스 레지스트리).
//   구독회원이 등록한 1차 데이터와 외부 채널 수집 데이터를 "출처가 명시된 자산"으로 관리한다.
//   외부 채널 소스는 연동허브(channel_credential)에서 자동 유도되며, 구독 직접등록 소스는 여기서 등록.
import React, { useCallback, useEffect, useState } from "react";
import { getJson, postJson, putJson } from "../services/apiClient.js";

const KIND_LABEL = {
  commerce: "커머스/주문", ad: "광고", analytics: "웹분석", cs: "CS/헬프데스크", esp: "이메일(ESP)",
  review: "리뷰/UGC", pg: "결제/정산", logistics: "물류/배송", messaging: "메시징", "sns-live": "SNS 라이브",
  general: "일반", orders: "주문/매출", products: "상품/SKU", customers: "고객", campaigns: "캠페인",
};
const kindLabel = (k) => KIND_LABEL[k] || k || "일반";
const STATUS = {
  active: { bg: "#dcfce7", fg: "#166534", label: "활성" },
  inactive: { bg: "#f1f5f9", fg: "#64748b", label: "비활성" },
  isolated: { bg: "#fef9c3", fg: "#854d0e", label: "격리(출처불명)" },
};

export default function DataAssets() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [sources, setSources] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // 구독소스 등록 폼
  const [nsChannel, setNsChannel] = useState("");
  const [nsKind, setNsKind] = useState("orders");

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        getJson("/api/data/business-profile").catch(() => ({ profile: null })),
        getJson("/api/data-sources").catch(() => ({ sources: [], summary: {} })),
      ]);
      setProfile(p.profile || {});
      setForm(p.profile || {});
      setSources(s);
    } catch (e) { setMsg(String(e.message || e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setBusy(true); setMsg("");
    try { await putJson("/api/data/business-profile", form || {}); setMsg("회사/브랜드 프로필을 저장했습니다."); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
    finally { setBusy(false); }
  };
  const registerSource = async (e) => {
    e && e.preventDefault(); setMsg("");
    if (!nsChannel.trim()) { setMsg("소스명을 입력하세요."); return; }
    try { await postJson("/api/data-sources", { source_channel: nsChannel.trim(), data_kind: nsKind, source_priority: 100 }); setNsChannel(""); await load(); }
    catch (e2) { setMsg(String(e2.message || e2)); }
  };

  const f = (k) => (form && form[k]) || "";
  const setF = (k, v) => setForm((p) => ({ ...(p || {}), [k]: v }));
  const sub = sources?.subscriber_owned || [];
  const ext = sources?.external_channels || [];
  const sum = sources?.summary || {};

  return (
    <div style={{ maxWidth: 980, margin: "20px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: "var(--text-1,#0f172a)" }}>🗂️ 데이터 자산</div>
        <div style={{ fontSize: 13, color: "var(--text-3,#64748b)", marginTop: 4 }}>
          내 계정의 데이터를 <b>구독 직접등록 원천</b>과 <b>외부 채널 수집 원천</b>으로 구분해 관리합니다. 이 자산이 통합 분석·마케팅 자동화의 정확한 근거가 됩니다.
        </div>
      </div>
      {msg && <div style={{ background: "#eff6ff", color: "#1e40af", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        {tile("전체 소스", sum.total ?? "…")}
        {tile("구독 직접등록", sum.subscriber_owned ?? "…", "#4f8ef7")}
        {tile("외부 채널", sum.external_channels ?? "…", "#059669")}
        {tile("활성", sum.active ?? "…", "#0ea5e9")}
      </div>

      {/* 회사/브랜드 프로필 */}
      <div style={card()}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--text-1,#0f172a)" }}>회사 · 브랜드 프로필 (구독 1차 데이터)</div>
        {form === null ? <div style={{ color: "#94a3b8" }}>불러오는 중…</div> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {inp("회사명", f("company_name"), (v) => setF("company_name", v))}
            {inp("사업자등록번호", f("biz_reg_no"), (v) => setF("biz_reg_no", v))}
            {inp("산업/업종", f("industry"), (v) => setF("industry", v))}
            {inp("회사 규모", f("company_size"), (v) => setF("company_size", v))}
            {inp("국가", f("country"), (v) => setF("country", v))}
            {inp("웹사이트", f("website"), (v) => setF("website", v))}
            {inp("브랜드명", f("brand_name"), (v) => setF("brand_name", v))}
            {inp("브랜드 톤", f("brand_tone"), (v) => setF("brand_tone", v))}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={lbl}>브랜드 포지셔닝</div>
              <textarea value={f("brand_positioning")} onChange={(e) => setF("brand_positioning", e.target.value)} rows={2}
                style={{ ...inpStyle, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button onClick={saveProfile} disabled={busy} style={btn("#4f8ef7")}>{busy ? "저장 중…" : "프로필 저장"}</button>
            </div>
          </div>
        )}
      </div>

      {/* 외부 채널 소스(자동 유도) */}
      <div style={card()}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--text-1,#0f172a)" }}>외부 채널 수집 원천 <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>· 연동허브에서 자동 인식</span></div>
        {ext.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 13, padding: 8 }}>연동된 외부 채널이 없습니다. 연동허브에서 채널 자격증명을 등록하면 자동으로 여기에 나타납니다.</div>
          : ext.map((s) => sourceRow(s, true))}
      </div>

      {/* 구독 직접등록 소스 */}
      <div style={card()}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--text-1,#0f172a)" }}>구독 직접등록 원천</div>
        <form onSubmit={registerSource} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input value={nsChannel} onChange={(e) => setNsChannel(e.target.value)} placeholder="소스명 (예: 수동 매출 입력, CSV 재고 업로드)"
            style={{ ...inpStyle, flex: 1, minWidth: 220 }} />
          <select value={nsKind} onChange={(e) => setNsKind(e.target.value)} style={{ ...inpStyle, width: 150 }}>
            {["orders", "products", "customers", "campaigns", "ad", "general"].map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
          <button type="submit" style={btn("#4f8ef7")}>등록</button>
        </form>
        {sub.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 13, padding: 8 }}>등록된 직접등록 원천이 없습니다.</div>
          : sub.map((s) => sourceRow(s, false))}
      </div>
    </div>
  );
}

function sourceRow(s, external) {
  const st = STATUS[s.status] || STATUS.active;
  return (
    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--border,#f1f5f9)" }}>
      <div>
        <div style={{ fontWeight: 600, color: "var(--text-1,#0f172a)" }}>{s.source_account || s.source_channel} <span style={{ fontSize: 11, color: "#94a3b8" }}>· {kindLabel(s.data_kind)}</span></div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{external ? "외부 수집" : "구독 등록"} · {s.source_channel}{s.last_seen_at ? ` · 최근 ${String(s.last_seen_at).slice(0, 10)}` : ""}</div>
      </div>
      <span style={{ background: st.bg, color: st.fg, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
    </div>
  );
}
const card = () => ({ background: "var(--surface,#fff)", border: "1px solid var(--border,#e5e7eb)", borderRadius: 14, padding: 18, marginBottom: 16 });
const btn = (bg) => ({ padding: "8px 16px", borderRadius: 9, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" });
const inpStyle = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border,#e5e7eb)", fontSize: 14, boxSizing: "border-box", width: "100%" };
const lbl = { fontSize: 12, color: "var(--text-3,#64748b)", marginBottom: 4 };
const inp = (label, val, on) => (
  <div>
    <div style={lbl}>{label}</div>
    <input value={val} onChange={(e) => on(e.target.value)} style={inpStyle} />
  </div>
);
const tile = (label, val, color) => (
  <div style={{ background: "var(--surface,#fff)", border: "1px solid var(--border,#e5e7eb)", borderRadius: 12, padding: "14px 16px" }}>
    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || "#0f172a" }}>{val}</div>
  </div>
);
