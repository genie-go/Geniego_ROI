import React, { useState, useEffect, useCallback } from "react";
import { useT } from "../i18n/index.js";
import { getJsonAuth, postJsonAuth, patchJson, delJson } from "../services/apiClient.js";
import { useVisibleTabs } from "../auth/useVisibleTabs.js";

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
  // [차기] 구독플랜별 탭 게이팅 — 예약 자동발송(schedules)만 growth+. 첫탭(preview)·실행이력은 전 플랜.
  const TABS = useVisibleTabs('report', [["preview", "📊 " + t("reportBuilder.tabPreview", "미리보기")], ["schedules", "📅 " + t("reportBuilder.tabSchedules", "예약 리포트")], ["history", "🕑 " + t("reportBuilder.tabHistory", "실행 이력")]], (pair) => pair[0]);

  return (
    <div style={{ padding: "8px 4px" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>📑 {t("reportBuilder.title", "리포트 빌더")}</h2>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t("reportBuilder.subtitle", "KPI 요약 리포트 생성 · 예약 이메일 발송 · 실행 이력")}</div>
      </div>

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
