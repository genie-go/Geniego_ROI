import React, { useState, useEffect, useCallback } from "react";
import BeginnerGuide from "../components/BeginnerGuide.jsx";
import { GUIDE } from "../lib/guideSpecs.js";
import { useT } from "../i18n/index.js";
import { getJsonAuth, postJsonAuth, patchJson, delJson, requestJsonAuth } from "../services/apiClient.js";
import { useVisibleTabs } from "../auth/useVisibleTabs.js";
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { BarChart, LineChart, DonutChart, StackedBarChart, AreaChart, ComboChart, Heatmap, ScatterChart, Treemap } from "../components/dashboards/ChartUtils.jsx"; // [239차+ BI심화 / 현 차수 BI확장 / 282차 산점도·트리맵] 시각화 재사용

/*
 * ReportBuilder — 리포트 빌더 + 예약 발송 (193차 Sprint4 실구현).
 *   192차까지 "가짜 셸"(대시보드 리다이렉트)였던 것을 백엔드 /api/reports/* (세션 self-auth,
 *   테넌트 격리, KPI 요약 집계 + Mailer 이메일 발송 + cron)에 맞춰 실기능화.
 */

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 14 };
const input = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1,#e2e8f0)", fontSize: 13, boxSizing: "border-box" };
const btn = (v = "primary") => ({ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: v === "danger" ? "rgba(239,68,68,0.15)" : v === "ghost" ? "var(--surface)" : "linear-gradient(135deg,#4f8ef7,#6366f1)", color: v === "danger" ? "#ef4444" : v === "ghost" ? "var(--text-2,#94a3b8)" : "#fff" });
const fmt = (n) => (n == null ? "0" : Number(n).toLocaleString());

function KpiGrid({ s, t }) {
  if (!s) return null;
  const items = [
    ["💰", t("reportBuilder.kRevenue", "매출"), "₩" + fmt(s.revenue), "#22c55e"],
    ["📢", t("reportBuilder.kSpend", "광고비"), "₩" + fmt(s.spend), "#ef4444"],
    ["📈", t("reportBuilder.kNet", "순이익"), "₩" + fmt(s.net), "#4f8ef7"],
    ["🎯", "ROAS", (s.roas ?? 0) + "x", "#a855f7"],
    ["🛒", t("reportBuilder.kConv", "전환"), fmt(s.conversions), "#f59e0b"],
    ["👆", "CTR", (s.ctr ?? 0) + "%", "#06b6d4"],
    ["✅", "CVR", (s.cvr ?? 0) + "%", "#10b981"],
    ["💵", "CPA", "₩" + fmt(s.cpa), "#f97316"],
    // [265차 확장] 노출·클릭 — 서버 summary(generateKpiSummary)가 이미 산출(이메일 본문엔 노출)하나 미리보기 grid에 누락됐던 것. 값 있을 때만.
    ...(s.impressions != null ? [["👁️", t("reportBuilder.kImpr", "노출"), fmt(s.impressions), "#64748b"]] : []),
    ...(s.clicks != null ? [["🖱️", t("reportBuilder.kClicks", "클릭"), fmt(s.clicks), "#0ea5e9"]] : []),
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
      {items.map(([ic, l, v, c]) => (
        <div key={l} style={{ ...card, marginBottom: 0, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>{ic}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: c, marginTop: 4 }}>{v}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReportBuilder() {
  const t = useT();
  const [tab, setTab] = useState("preview");
  const [msg, setMsg] = useState("");
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  // preview
  const [period, setPeriod] = useState(30);
  const [summary, setSummary] = useState(null);
  const [loadingPv, setLoadingPv] = useState(false);
  const loadPreview = useCallback(async (p) => {
    setLoadingPv(true);
    try { const d = await getJsonAuth(`/api/reports/preview?period_days=${p}`); if (d.ok) setSummary(d.summary); }
    catch { setSummary(null); } finally { setLoadingPv(false); }
  }, []);

  // schedules
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState({ name: "", frequency: "weekly", period_days: 30, recipients: "" });
  const loadSchedules = useCallback(async () => {
    try { const d = await getJsonAuth("/api/reports/schedules"); if (d.ok) setSchedules(d.schedules || []); } catch { setSchedules([]); }
  }, []);

  // history
  const [runs, setRuns] = useState([]);
  const loadHistory = useCallback(async () => {
    try { const d = await getJsonAuth("/api/reports/history"); if (d.ok) setRuns(d.runs || []); } catch { setRuns([]); }
  }, []);

  useEffect(() => { loadPreview(period); }, []); // eslint-disable-line
  useEffect(() => { if (tab === "schedules") loadSchedules(); if (tab === "history") loadHistory(); }, [tab]); // eslint-disable-line

  const createSchedule = async () => {
    if (!form.name.trim()) { flash(t("reportBuilder.needName", "리포트 이름을 입력하세요.")); return; }
    try { const d = await postJsonAuth("/api/reports/schedules", form); if (d.ok) { flash(t("reportBuilder.created", "예약 리포트가 생성되었습니다.")); setForm({ name: "", frequency: "weekly", period_days: 30, recipients: "" }); loadSchedules(); } else flash(d.error || "오류"); }
    catch (e) { flash(String(e.message).slice(0, 80)); }
  };
  const toggle = async (s) => { try { await patchJson(`/api/reports/schedules/${s.id}`, { enabled: s.enabled ? 0 : 1 }); loadSchedules(); } catch (e) { flash(String(e.message).slice(0, 80)); } };
  const runNow = async (s) => { try { const d = await postJsonAuth(`/api/reports/run/${s.id}`, {}); flash(d.ok ? t("reportBuilder.ran", "리포트 발송 완료") + ` (${d.sent}/${d.recipients})` : (d.error || "오류")); loadSchedules(); } catch (e) { flash(String(e.message).slice(0, 80)); } };
  const remove = async (s) => { if (!window.confirm(t("reportBuilder.delConfirm", "이 예약 리포트를 삭제할까요?"))) return; try { await delJson(`/api/reports/schedules/${s.id}`); loadSchedules(); } catch (e) { flash(String(e.message).slice(0, 80)); } };

  const freqLabel = (f) => ({ daily: t("reportBuilder.daily", "매일"), weekly: t("reportBuilder.weekly", "매주"), monthly: t("reportBuilder.monthly", "매월") }[f] || f);
  // [237차] 셀프서비스 BI — 커스텀 분석(지표×차원×기간 → 표 + CSV). 백엔드 /api/reports/query(화이트리스트).
  // [240차 BI⑤] 데이터 소스(ads=광고성과 | commerce=주문 머니경로 | settlement=정산/순이익) — 경쟁사 Looker/Tableau 대비 광고+주문+순이익 통합 쿼리.
  const [qForm, setQForm] = useState({ source: "ads", metrics: ["spend", "revenue", "roas", "conversions"], dimension: "channel", breakdown: "", period_days: 30 });
  const Q_METRICS = qForm.source === "settlement" ? [
    // [현 차수 BI⑤] 정산/순이익 소스 — orderhub_settlements rollup. 백엔드 화이트리스트와 1:1 정합.
    ["gross_sales", t("reportBuilder.mGross", "매출")], ["net_payout", t("reportBuilder.mNetPayout", "정산수령액")],
    ["platform_fee", t("reportBuilder.mPlatformFee", "플랫폼수수료")], ["ad_fee", t("reportBuilder.mAdFee", "광고비차감")],
    ["coupon_discount", t("reportBuilder.mCoupon", "쿠폰할인")], ["return_fee", t("reportBuilder.mReturnFee", "반품수수료")],
    ["orders", t("reportBuilder.mOrders", "주문수")], ["returns", t("reportBuilder.mReturns", "반품수")],
    ["net_profit", t("reportBuilder.mNetProfit", "순이익")], ["fee_rate", t("reportBuilder.mFeeRate", "수수료율%")],
    ["aov", t("reportBuilder.mAov", "객단가")],
  ] : qForm.source === "commerce" ? [
    ["gross_sales", t("reportBuilder.mGross", "매출")], ["orders", t("reportBuilder.mOrders", "주문수")],
    ["units", t("reportBuilder.mUnits", "수량")], ["aov", t("reportBuilder.mAov", "객단가")],
  ] : [
    ["spend", t("reportBuilder.mSpend", "광고비")], ["revenue", t("reportBuilder.mRevenue", "매출")],
    ["roas", "ROAS"], ["conversions", t("reportBuilder.mConv", "전환")],
    ["impressions", t("reportBuilder.mImp", "노출")], ["clicks", t("reportBuilder.mClk", "클릭")],
    ["ctr", "CTR"], ["cvr", "CVR"], ["cpc", "CPC"], ["cpa", "CPA"],
    // [240차 BI⑤] 계산필드(파생지표)
    ["profit", t("reportBuilder.mProfit", "이익")], ["margin", t("reportBuilder.mMargin", "이익률%")],
    ["aov", t("reportBuilder.mAov", "객단가")], ["cpm", "CPM"],
  ];
  const Q_DIMS = qForm.source === "settlement"
    ? [["channel", t("reportBuilder.dimChannel", "채널별")], ["period", t("reportBuilder.dimPeriod", "월별")]]
    : qForm.source === "commerce"
    ? [["channel", t("reportBuilder.dimChannel", "채널별")], ["date", t("reportBuilder.dimDate", "일자별")]]
    : [["channel", t("reportBuilder.dimChannel", "채널별")], ["campaign", t("reportBuilder.dimCampaign", "캠페인별")], ["date", t("reportBuilder.dimDate", "일자별")], ["account", t("reportBuilder.dimAccount", "계정별")]];
  // 소스 전환 시 해당 소스 기본 지표/차원으로 리셋(무효 선택 방지).
  const switchSource = (src) => setQForm(f => f.source === src ? f : ({
    ...f, source: src, dimension: "channel", breakdown: "",
    metrics: src === "settlement" ? ["gross_sales", "net_payout", "platform_fee", "net_profit"]
      : src === "commerce" ? ["gross_sales", "orders", "aov"]
      : ["spend", "revenue", "roas", "conversions"],
  }));
  const [qResult, setQResult] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [viz, setViz] = useState("table"); // [239차+ BI심화 / 현 차수 BI확장] table|bar|line|donut|stacked|combo|area|heatmap
  const [saved, setSaved] = useState([]);
  // [255차 심화] 사용자정의 메트릭(시맨틱 레이어) — 소스별 로드/저장. 백엔드 /reports/metrics(중복0).
  const [userMetrics, setUserMetrics] = useState([]);
  const [mdForm, setMdForm] = useState({ name: "", label: "", formula: "" });
  const loadUserMetrics = useCallback((src) => { getJsonAuth(`/api/reports/metrics?source=${src}`).then(d => { if (d?.ok) setUserMetrics(d.metrics || []); }).catch(() => {}); }, []);
  useEffect(() => { if (tab === "custom") loadUserMetrics(qForm.source); }, [tab, qForm.source, loadUserMetrics]);
  const saveUserMetric = useCallback(async () => {
    const nm = (mdForm.name || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!nm || !mdForm.formula.trim()) { flash(t("reportBuilder.mdNeed", "이름·수식을 입력하세요")); return; }
    const next = [...userMetrics.filter(m => m.name !== nm).map(m => ({ name: m.name, label: m.label, formula: m.formula })), { name: nm, label: mdForm.label || nm, formula: mdForm.formula.trim() }];
    try { await requestJsonAuth("/api/reports/metrics", "PUT", { source: qForm.source, metrics: next }); flash(t("reportBuilder.mdSaved", "메트릭 저장됨")); setMdForm({ name: "", label: "", formula: "" }); loadUserMetrics(qForm.source); }
    catch (e) { flash(String(e.message).slice(0, 80)); }
  }, [mdForm, userMetrics, qForm.source, loadUserMetrics, t]);
  const deleteUserMetric = useCallback(async (name) => {
    const next = userMetrics.filter(m => m.name !== name).map(m => ({ name: m.name, label: m.label, formula: m.formula }));
    try { await requestJsonAuth("/api/reports/metrics", "PUT", { source: qForm.source, metrics: next }); setQForm(f => ({ ...f, metrics: f.metrics.filter(x => x !== name) })); loadUserMetrics(qForm.source); } catch (e) {}
  }, [userMetrics, qForm.source, loadUserMetrics]);
  const toggleMetric = (m) => setQForm(f => ({ ...f, metrics: f.metrics.includes(m) ? f.metrics.filter(x => x !== m) : [...f.metrics, m] }));
  const runQuery = useCallback(async () => {
    if (qForm.metrics.length === 0) { flash(t("reportBuilder.pickMetric", "지표를 1개 이상 선택하세요.")); return; }
    setQLoading(true);
    try { const d = await postJsonAuth("/api/reports/query", qForm); setQResult(d.ok ? d : { rows: [], columns: [], note: d.error || "오류" }); }
    catch (e) { setQResult({ rows: [], columns: [], note: String(e.message).slice(0, 80) }); }
    finally { setQLoading(false); }
  }, [qForm, t]);
  // [264차 BI 성숙화] 드릴다운 — 1차 차원값 클릭 → 그 값으로 필터 + 하위(2차) 차원 breakdown 재조회.
  const runWith = useCallback(async (form) => {
    setQForm(form); setQLoading(true);
    try { const d = await postJsonAuth("/api/reports/query", form); setQResult(d.ok ? d : { rows: [], columns: [], note: d.error || "오류" }); }
    catch (e) { setQResult({ rows: [], columns: [], note: String(e.message).slice(0, 80) }); }
    finally { setQLoading(false); }
  }, []);
  const drillInto = (val) => {
    const drillDim = (Q_DIMS.find(d => d[0] !== qForm.dimension) || [])[0] || "";
    if (!drillDim) return;
    runWith({ ...qForm, filter_val: val, breakdown: drillDim });
  };
  const clearDrill = () => runWith({ ...qForm, filter_val: "", breakdown: "" });
  // [239차+ BI심화] 저장된 리포트(saved_report)
  const loadSaved = useCallback(() => { getJsonAuth("/api/reports/saved").then(d => { if (d?.ok) setSaved(d.reports || []); }).catch(() => {}); }, []);
  useEffect(() => { loadSaved(); }, [loadSaved]);
  const saveCurrent = useCallback(async () => {
    const name = (typeof window !== "undefined" ? window.prompt(t("reportBuilder.savePrompt", "저장할 리포트 이름:"), `${qForm.dimension} ${qForm.period_days}d`) : "");
    if (!name) return;
    try { await postJsonAuth("/api/reports/saved", { name, config: qForm, viz }); flash(t("reportBuilder.saved", "저장됨")); loadSaved(); }
    catch { flash(t("reportBuilder.saveFail", "저장 실패")); }
  }, [qForm, viz, t, loadSaved]);
  const applySaved = useCallback(async (r) => {
    const c = r.config || {};
    // [259차] 기본값 위에 저장 config 전체를 병합 — source(정산/커머스 등) 등 필드 누락으로 저장 리포트가 ads 로 재조회되던 것 수정.
    const form = { metrics: ["spend", "revenue", "roas"], dimension: "channel", breakdown: "", period_days: 30, ...c };
    setQForm(form); setViz(r.viz || "table"); setQLoading(true);
    try { const d = await postJsonAuth("/api/reports/query", form); setQResult(d.ok ? d : { rows: [], columns: [], note: d.error || "오류" }); }
    catch (e) { setQResult({ rows: [], columns: [], note: String(e.message).slice(0, 80) }); }
    finally { setQLoading(false); }
  }, []);
  const deleteSaved = useCallback(async (id) => { try { await delJson(`/api/reports/saved/${id}`); loadSaved(); } catch {} }, [loadSaved]);
  const exportCsv = useCallback(() => {
    if (!qResult || !qResult.rows || !qResult.rows.length) return;
    const cols = qResult.columns || [];
    const head = cols.join(",");
    const body = qResult.rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
    const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `geniego_report_${qForm.dimension}_${qForm.period_days}d.csv`; a.click(); URL.revokeObjectURL(url);
  }, [qResult, qForm]);

  // [차기] 구독플랜별 탭 게이팅 — 예약 자동발송(schedules)만 growth+. 첫탭(preview)·실행이력은 전 플랜.
  const TABS = useVisibleTabs('report', [["preview", "📊 " + t("reportBuilder.tabPreview", "미리보기")], ["custom", "🔎 " + t("reportBuilder.tabCustom", "커스텀 분석")], ["schedules", "📅 " + t("reportBuilder.tabSchedules", "예약 리포트")], ["history", "🕑 " + t("reportBuilder.tabHistory", "실행 이력")]], (pair) => pair[0]);

  return (
    <div style={{ padding: "8px 4px" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>📑 {t("reportBuilder.title", "리포트 빌더")}</h2>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t("reportBuilder.subtitle", "KPI 요약 리포트 생성 · 예약 이메일 발송 · 실행 이력")}</div>
      </div>

      {/* [현 차수] 특정상품 리포트 참조 — 선택 시 그 상품 매출·순이익·채널/국가별 인라인 참조(주문 SSOT). 리포트 본문은 전체 기준. */}
      <ProductSelectBar />
      <ProductMarketingPanel period="monthly" />

      <BeginnerGuide spec={GUIDE.reportBuilder} />
      <div style={{ height: 14 }} />

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...btn(tab === id ? "primary" : "ghost") }}>{label}</button>
        ))}
        {msg && <span style={{ fontSize: 12, color: "#22c55e", alignSelf: "center", marginLeft: 8 }}>{msg}</span>}
      </div>

      {tab === "preview" && (
        <div>
          <div style={{ ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{t("reportBuilder.period", "집계 기간")}</span>
            <select value={period} onChange={e => { const p = +e.target.value; setPeriod(p); loadPreview(p); }} style={{ ...input, width: 140 }}>
              <option value={7}>{t("reportBuilder.last7", "최근 7일")}</option>
              <option value={30}>{t("reportBuilder.last30", "최근 30일")}</option>
              <option value={90}>{t("reportBuilder.last90", "최근 90일")}</option>
            </select>
            <button style={btn("ghost")} onClick={() => loadPreview(period)}>{t("reportBuilder.refresh", "새로고침")}</button>
            {summary && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{summary.since} ~ {summary.until}</span>}
          </div>
          {loadingPv ? <div style={{ color: "var(--text-3)", padding: 30, textAlign: "center" }}>{t("reportBuilder.loading", "불러오는 중…")}</div> : <KpiGrid s={summary} t={t} />}
        </div>
      )}

      {tab === "custom" && (
        <div>
          <div style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              {/* [240차 BI⑤] 데이터 소스 토글 — 광고성과/주문 머니경로 */}
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{t("reportBuilder.source", "데이터 소스")}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[["ads", t("reportBuilder.srcAds", "광고 성과")], ["commerce", t("reportBuilder.srcCommerce", "주문/매출")], ["settlement", t("reportBuilder.srcSettlement", "정산/순이익")]].map(([id, lab]) => (
                  <button key={id} onClick={() => switchSource(id)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: qForm.source === id ? "#8b5cf6" : "rgba(0,0,0,0.05)", color: qForm.source === id ? "#fff" : "var(--text-2)" }}>{lab}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{t("reportBuilder.metrics", "지표 선택")}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 420 }}>
                {Q_METRICS.map(([id, lab]) => (
                  <button key={id} onClick={() => toggleMetric(id)} style={{ padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: qForm.metrics.includes(id) ? "#4f8ef7" : "rgba(0,0,0,0.05)", color: qForm.metrics.includes(id) ? "#fff" : "var(--text-2)" }}>{lab}</button>
                ))}
                {/* [255차 심화] 사용자정의 메트릭 — 보라색 칩(삭제 ✕ 포함) */}
                {userMetrics.map(m => (
                  <span key={m.name} style={{ display: "inline-flex", alignItems: "center", gap: 3, borderRadius: 8, background: qForm.metrics.includes(m.name) ? "#8b5cf6" : "rgba(139,92,246,0.12)", color: qForm.metrics.includes(m.name) ? "#fff" : "#8b5cf6", padding: "0 4px 0 0" }}>
                    <button onClick={() => toggleMetric(m.name)} title={m.formula} style={{ padding: "5px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: "transparent", color: "inherit" }}>ƒ {m.label || m.name}</button>
                    <button onClick={() => deleteUserMetric(m.name)} title={t("reportBuilder.mdDel", "메트릭 삭제")} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 10, color: "inherit", opacity: 0.7 }}>✕</button>
                  </span>
                ))}
              </div>
              {/* [255차 심화] 사용자정의 메트릭 정의(LookML식 시맨틱 — 기존 지표 조합 수식) */}
              <details style={{ marginTop: 8, maxWidth: 420 }}>
                <summary style={{ fontSize: 11, color: "#8b5cf6", cursor: "pointer", fontWeight: 700 }}>ƒ {t("reportBuilder.mdAdd", "사용자정의 메트릭 추가")}</summary>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                  <input value={mdForm.name} onChange={e => setMdForm(f => ({ ...f, name: e.target.value }))} placeholder={t("reportBuilder.mdName", "키(영문)")} style={{ ...input, width: 110 }} />
                  <input value={mdForm.label} onChange={e => setMdForm(f => ({ ...f, label: e.target.value }))} placeholder={t("reportBuilder.mdLabel", "표시명")} style={{ ...input, width: 110 }} />
                  <input value={mdForm.formula} onChange={e => setMdForm(f => ({ ...f, formula: e.target.value }))} placeholder={t("reportBuilder.mdFormula", "수식 예: revenue - spend")} style={{ ...input, width: 180 }} />
                  <button style={btn("primary")} onClick={saveUserMetric}>💾</button>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{t("reportBuilder.mdHint", "기존 지표 키 + 사칙연산(+ - * / )만 사용. 예) (revenue - spend) / conversions")}</div>
              </details>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{t("reportBuilder.dimension", "차원")}</div>
              <select value={qForm.dimension} onChange={e => setQForm(f => ({ ...f, dimension: e.target.value, breakdown: f.breakdown === e.target.value ? "" : f.breakdown }))} style={{ ...input, width: 130 }}>
                {Q_DIMS.map(([id, lab]) => <option key={id} value={id}>{lab}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{t("reportBuilder.breakdown", "2차 차원(피벗)")}</div>
              <select value={qForm.breakdown} onChange={e => setQForm(f => ({ ...f, breakdown: e.target.value }))} style={{ ...input, width: 130 }}>
                <option value="">{t("reportBuilder.brkNone", "없음")}</option>
                {Q_DIMS.filter(d => d[0] !== qForm.dimension).map(([id, lab]) => <option key={id} value={id}>{lab}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{t("reportBuilder.period", "집계 기간")}</div>
              <select value={qForm.period_days} onChange={e => setQForm(f => ({ ...f, period_days: +e.target.value }))} style={{ ...input, width: 130 }}>
                <option value={7}>{t("reportBuilder.last7", "최근 7일")}</option>
                <option value={30}>{t("reportBuilder.last30", "최근 30일")}</option>
                <option value={90}>{t("reportBuilder.last90", "최근 90일")}</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{t("reportBuilder.viz", "시각화")}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 300 }}>
                {[["table", "📋", t("reportBuilder.vizTable", "표")], ["bar", "📊", t("reportBuilder.vizBar", "막대")], ["line", "📈", t("reportBuilder.vizLine", "선")], ["donut", "🍩", t("reportBuilder.vizDonut", "도넛")], ["stacked", "🧱", t("reportBuilder.vizStacked", "누적 막대")], ["combo", "🔀", t("reportBuilder.vizCombo", "콤보(막대+선)")], ["area", "🏔️", t("reportBuilder.vizArea", "면적")], ["heatmap", "🔥", t("reportBuilder.vizHeatmap", "히트맵")], ["scatter", "✴️", t("reportBuilder.vizScatter", "산점도(지표×지표)")], ["treemap", "🗂️", t("reportBuilder.vizTreemap", "트리맵(구성비)")]].map(([v, ic, lab]) => (
                  <button key={v} onClick={() => setViz(v)} title={lab} style={{ padding: "6px 9px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, background: viz === v ? "#4f8ef7" : "rgba(0,0,0,0.05)" }}>{ic}</button>
                ))}
              </div>
            </div>
            <div style={{ alignSelf: "flex-end", display: "flex", gap: 6 }}>
              <button style={btn("primary")} onClick={runQuery} disabled={qLoading}>{qLoading ? "⏳" : "🔎"} {t("reportBuilder.runQuery", "분석 실행")}</button>
              {qResult && qResult.rows && qResult.rows.length > 0 && <button style={btn("ghost")} onClick={exportCsv}>⬇ CSV</button>}
              {qResult && qResult.rows && qResult.rows.length > 0 && <button style={btn("ghost")} onClick={saveCurrent}>💾 {t("reportBuilder.save", "저장")}</button>}
            </div>
          </div>
          {saved.length > 0 && (
            <div style={{ ...card, marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>💼 {t("reportBuilder.savedReports", "저장된 리포트")}:</span>
              {saved.map(r => (
                <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(79,142,247,0.08)", borderRadius: 8, padding: "3px 4px 3px 10px" }}>
                  <button onClick={() => applySaved(r)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#4f8ef7" }}>{r.name}</button>
                  <button onClick={() => deleteSaved(r.id)} title="delete" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--text-3)" }}>✕</button>
                </span>
              ))}
            </div>
          )}
          {qResult && (() => {
            const PALETTE = ["#4f8ef7", "#22c55e", "#a855f7", "#f59e0b", "#ec4899", "#14d9b0", "#ef4444", "#6366f1"];
            const pm = (qResult.metrics || [])[0] || "spend";
            const colLabel = (c) => c === "dim" ? (Q_DIMS.find(d => d[0] === qResult.dimension)?.[1] || "") : c === "brk" ? (Q_DIMS.find(d => d[0] === qResult.breakdown)?.[1] || "") : (Q_METRICS.find(m => m[0] === c)?.[1] || c);
            const rowsN = (qResult.rows || []).length;
            // [현 차수 BI확장] 히트맵은 2차원(피벗) 전용, 그 외 차트는 단일차원(피벗 없음) 전용.
            const isHeatmap = viz === "heatmap" && !!qResult.breakdown && rowsN > 0;
            const flatVizes = ["bar", "line", "donut", "stacked", "combo", "area", "scatter", "treemap"];
            const isChart = flatVizes.includes(viz) && !qResult.breakdown && rowsN > 0;
            const canDrill = !qResult.breakdown && !qResult.filter_val && qResult.dimension !== "date" && qResult.dimension !== "period" && Q_DIMS.length > 1;
            return (
            <div style={{ ...card, marginTop: 12, overflowX: "auto" }}>
              {qResult.filter_val && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-3)" }}>🔍 {colLabel("dim")} =</span>
                  <span style={{ fontWeight: 800, color: "#4f8ef7" }}>{qResult.filter_val}</span>
                  <span style={{ color: "var(--text-3)" }}>→ {t("reportBuilder.drillBy", "하위")} {(Q_DIMS.find(d => d[0] === qResult.breakdown) || [])[1] || qResult.breakdown}</span>
                  <button onClick={clearDrill} style={{ ...btn("ghost"), padding: "3px 10px", fontSize: 11 }}>← {t("reportBuilder.drillBack", "뒤로")}</button>
                </div>
              )}
              {(!qResult.rows || qResult.rows.length === 0) ? (
                <div style={{ color: "var(--text-3)", fontSize: 12, padding: 20, textAlign: "center" }}>{qResult.note || t("reportBuilder.noData", "데이터가 없습니다.")}</div>
              ) : isHeatmap ? (
                <div style={{ padding: "8px 4px" }}>
                  {(() => {
                    const dims = [...new Set(qResult.rows.map(r => String(r.dim)))].slice(0, 40);
                    const brks = [...new Set(qResult.rows.map(r => String(r.brk)))].slice(0, 24);
                    const idx = {};
                    qResult.rows.forEach(r => { idx[String(r.dim) + " " + String(r.brk)] = Number(r[pm] ?? 0); });
                    const matrix = dims.map(dv => brks.map(bv => idx[dv + " " + bv] ?? 0));
                    return (<>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>{colLabel("dim")} × {colLabel("brk")} · {colLabel(pm)}</div>
                      <Heatmap rows={dims} cols={brks} matrix={matrix} color={PALETTE[0]} width={720} />
                    </>);
                  })()}
                </div>
              ) : isChart ? (
                <div style={{ padding: "8px 4px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>{colLabel("dim")} · {colLabel(pm)} ({t("reportBuilder.top", "상위")} {Math.min(viz === "donut" ? 8 : (viz === "line" || viz === "area") ? 90 : 14, qResult.rows.length)})</div>
                  {viz === "bar" && <BarChart data={qResult.rows.slice(0, 14).map(r => ({ dim: r.dim, [pm]: Number(r[pm] ?? 0) }))} xKey="dim" yKey={pm} width={680} height={240} color={PALETTE} />}
                  {viz === "line" && <div style={{ overflowX: "auto" }}><LineChart data={qResult.rows.slice(0, 90).map(r => ({ dim: String(r.dim), [pm]: Number(r[pm] ?? 0) }))} labels={qResult.rows.slice(0, 90).map(r => String(r.dim))} series={[{ key: pm, name: colLabel(pm), color: PALETTE[0] }]} width={720} height={240} /></div>}
                  {viz === "area" && <div style={{ overflowX: "auto" }}><AreaChart data={qResult.rows.slice(0, 90).map(r => ({ dim: String(r.dim), [pm]: Number(r[pm] ?? 0) }))} labels={qResult.rows.slice(0, 90).map(r => String(r.dim))} series={[{ key: pm, name: colLabel(pm), color: PALETTE[0] }]} width={720} height={240} /></div>}
                  {viz === "stacked" && (() => {
                    const ms = (qResult.metrics || [pm]).slice(0, 6);
                    const series = ms.map((m, i) => ({ key: m, name: colLabel(m), color: PALETTE[i % PALETTE.length] }));
                    return (
                      <div style={{ overflowX: "auto" }}>
                        <StackedBarChart data={qResult.rows.slice(0, 14).map(r => { const o = { dim: String(r.dim) }; ms.forEach(m => { o[m] = Number(r[m] ?? 0); }); return o; })} xKey="dim" series={series} width={700} height={260} />
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                          {series.map(s => (<span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-2)" }}><span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />{s.name}</span>))}
                        </div>
                      </div>
                    );
                  })()}
                  {viz === "combo" && (() => {
                    const lk = (qResult.metrics || []).find(m => m !== pm) || null;
                    return (
                      <div style={{ overflowX: "auto" }}>
                        <ComboChart data={qResult.rows.slice(0, 14).map(r => { const o = { dim: String(r.dim), [pm]: Number(r[pm] ?? 0) }; if (lk) o[lk] = Number(r[lk] ?? 0); return o; })} xKey="dim" barKey={pm} lineKey={lk} barName={colLabel(pm)} lineName={lk ? colLabel(lk) : ""} barColor={PALETTE[0]} lineColor={PALETTE[3]} width={700} height={260} />
                        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "var(--text-2)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[0] }} />{colLabel(pm)}</span>
                          {lk && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 3, background: PALETTE[3] }} />{colLabel(lk)}</span>}
                        </div>
                      </div>
                    );
                  })()}
                  {viz === "donut" && (
                    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                      <DonutChart data={qResult.rows.slice(0, 8).map((r, i) => ({ value: Number(r[pm] ?? 0), color: PALETTE[i % PALETTE.length] }))} size={200} label={colLabel(pm)} />
                      <div style={{ display: "grid", gap: 4 }}>
                        {qResult.rows.slice(0, 8).map((r, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
                            <span style={{ color: "var(--text-2)" }}>{r.dim}</span>
                            <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{Number(r[pm] ?? 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {viz === "scatter" && (() => {
                    // [282차] 산점도 — 지표×지표 상관(x=1지표, y=2지표). 2개 지표 필요.
                    const yk = (qResult.metrics || []).find(m => m !== pm) || null;
                    if (!yk) return <div style={{ fontSize: 11, color: "#f59e0b" }}>💡 {t("reportBuilder.scatterNeeds2", "산점도는 지표 2개가 필요합니다(위에서 지표를 하나 더 선택하세요).")}</div>;
                    const pts = qResult.rows.slice(0, 200).map((r, i) => ({ x: Number(r[pm] ?? 0), y: Number(r[yk] ?? 0), label: String(r.dim), color: PALETTE[i % PALETTE.length] }));
                    return <div style={{ overflowX: "auto" }}><ScatterChart points={pts} xLabel={colLabel(pm)} yLabel={colLabel(yk)} trend width={720} height={300} /></div>;
                  })()}
                  {viz === "treemap" && (
                    <div style={{ overflowX: "auto" }}>
                      <Treemap items={qResult.rows.slice(0, 24).map((r, i) => ({ label: String(r.dim), value: Number(r[pm] ?? 0), color: PALETTE[i % PALETTE.length] }))} width={720} height={320} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {viz === "heatmap" && !qResult.breakdown && <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 8 }}>💡 {t("reportBuilder.heatmapNeedsBreakdown", "히트맵은 2차 차원(피벗)이 필요합니다. 위에서 2차 차원을 선택하세요.")}</div>}
                  {["bar", "line", "donut", "stacked", "combo", "area", "scatter", "treemap"].includes(viz) && qResult.breakdown && <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 8 }}>💡 {t("reportBuilder.chartNeedsSingleDim", "이 차트는 단일 차원 전용입니다. 2차 차원(피벗) 데이터는 표 또는 히트맵으로 보세요.")}</div>}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {(qResult.columns || []).map(c => <th key={c} style={{ padding: "8px 10px", textAlign: (c === "dim" || c === "brk") ? "left" : "right", color: "var(--text-3)", fontWeight: 700, fontSize: 11 }}>{colLabel(c)}</th>)}
                  </tr></thead>
                  <tbody>
                    {qResult.rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        {(qResult.columns || []).map(c => <td key={c} style={{ padding: "8px 10px", textAlign: (c === "dim" || c === "brk") ? "left" : "right", fontWeight: (c === "dim" || c === "brk") ? 700 : 400, color: "var(--text-1)" }}>{c === "dim" ? (canDrill ? <button onClick={() => drillInto(r.dim)} title={t("reportBuilder.drillHint", "클릭하여 하위 차원으로 드릴다운")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#4f8ef7", fontWeight: 700, textDecoration: "underline dotted", padding: 0, font: "inherit" }}>{r.dim} 🔎</button> : r.dim) : c === "brk" ? r.brk : Number(r[c] ?? 0).toLocaleString()}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  {/* [265차 확장] 서버가 이미 반환하는 가중 합계행(totals) 렌더 — Looker Grand Total 파리티. 백엔드 무변경. */}
                  {qResult.totals && Object.keys(qResult.totals).length > 0 && (
                    <tfoot><tr style={{ borderTop: "2px solid var(--border)", background: "var(--surface-2, rgba(127,127,127,0.05))" }}>
                      {(qResult.columns || []).map((c, ci) => <td key={c} style={{ padding: "8px 10px", textAlign: (c === "dim" || c === "brk") ? "left" : "right", fontWeight: 800, color: "var(--text-1)" }}>{ci === 0 ? t("reportBuilder.grandTotal", "합계") : (qResult.totals[c] != null ? Number(qResult.totals[c]).toLocaleString() : "")}</td>)}
                    </tr></tfoot>
                  )}
                </table>
                </>
              )}
            </div>
            );
          })()}
        </div>
      )}

      {tab === "schedules" && (
        <div>
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t("reportBuilder.newSchedule", "새 예약 리포트")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>{t("reportBuilder.name", "리포트 이름")}</label>
                <input style={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("reportBuilder.namePh", "예: 주간 KPI 요약")} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>{t("reportBuilder.frequency", "발송 주기")}</label>
                <select style={input} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  <option value="daily">{t("reportBuilder.daily", "매일")}</option>
                  <option value="weekly">{t("reportBuilder.weekly", "매주")}</option>
                  <option value="monthly">{t("reportBuilder.monthly", "매월")}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>{t("reportBuilder.periodDays", "집계 기간(일)")}</label>
                <input type="number" min="1" max="365" style={input} value={form.period_days} onChange={e => setForm(f => ({ ...f, period_days: +e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-3)" }}>{t("reportBuilder.recipients", "수신 이메일(쉼표 구분)")}</label>
                <input style={input} value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} placeholder="a@x.com, b@y.com" />
              </div>
            </div>
            <button style={btn()} onClick={createSchedule}>+ {t("reportBuilder.create", "예약 생성")}</button>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{t("reportBuilder.scheduleList", "예약 목록")}</div>
            {schedules.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 12, padding: 16, textAlign: "center" }}>{t("reportBuilder.noSchedules", "등록된 예약 리포트가 없습니다.")}</div>
            ) : schedules.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name} {Number(s.enabled) ? "" : <span style={{ fontSize: 10, color: "#ef4444" }}>({t("reportBuilder.paused", "중지됨")})</span>}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{freqLabel(s.frequency)} · {s.period_days}{t("reportBuilder.daysUnit", "일")} · {s.recipients || t("reportBuilder.noRecipients", "수신자 없음")}</div>
                  {s.next_run_at && <div style={{ fontSize: 10, color: "var(--text-3)" }}>{t("reportBuilder.nextRun", "다음 발송")}: {s.next_run_at} UTC</div>}
                </div>
                <button style={{ ...btn("ghost"), padding: "5px 10px" }} onClick={() => runNow(s)}>▶ {t("reportBuilder.runNow", "지금 발송")}</button>
                <button style={{ ...btn("ghost"), padding: "5px 10px" }} onClick={() => toggle(s)}>{Number(s.enabled) ? t("reportBuilder.pause", "중지") : t("reportBuilder.resume", "재개")}</button>
                <button style={{ ...btn("danger"), padding: "5px 10px" }} onClick={() => remove(s)}>{t("reportBuilder.delete", "삭제")}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{t("reportBuilder.runHistory", "실행 이력 (최근 50건)")}</div>
          {runs.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 12, padding: 16, textAlign: "center" }}>{t("reportBuilder.noHistory", "실행 이력이 없습니다.")}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ color: "var(--text-3)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>{t("reportBuilder.colTime", "발송 시각")}</th>
                <th style={{ padding: "6px 8px" }}>{t("reportBuilder.colStatus", "상태")}</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>{t("reportBuilder.colSent", "발송 수")}</th>
              </tr></thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px" }}>{r.generated_at} UTC</td>
                    <td style={{ padding: "6px 8px", color: r.status === "ok" ? "#22c55e" : r.status === "failed" ? "#ef4444" : "#f59e0b" }}>{r.status}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{r.recipients_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
