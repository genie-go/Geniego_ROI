import React, { useState, useEffect, useCallback } from "react";
// [237차] getJson(헤더 없음=비인증) → getJsonAuth(defaultHeaders=세션 Bearer) 별칭.
//   /v424/admin/growth/* 는 requirePlan('admin') 세션 인증 필수인데 비인증 getJson 으로 호출해
//   GET 전건 401(AUTH_REQUIRED) 이었음. postJson/putJson/delJson 은 이미 인증 헤더 부착(정상).
import { getJsonAuth as getJson, postJson, putJson, delJson } from "../services/apiClient.js";

/**
 * AdminGrowthCenter — 236차 신규.
 *
 * GeniegoROI Admin Growth Automation 콘솔. 플랫폼 운영사가 GeniegoROI 자체를
 * 마케팅 자동화로 성장(리드→데모→체험→유료전환→성과검증)시키는 내부 Growth
 * Command Center.
 *
 * ★중복 0: 백엔드 AdminGrowth(/v424/admin/growth/*)가 기존 엔진(ClaudeAI/AdAdapters/
 *   channel_credential/audit_log)을 예약 테넌트 platform_growth 로 격리 재사용한다.
 *   본 페이지는 그 admin 전용 오케스트레이션 UI. 고객용 마케팅 페이지와 분리.
 *
 * 관례: 관리자 페이지 한국어 고정(Admin.jsx/DbAdmin.jsx 정합). 응답 봉투 {success,data,...}.
 */

const API = "/v424/admin/growth";
const unwrap = (r) => (r && typeof r === "object" && "data" in r ? r.data : r);

const AD_CHANNELS = ["google", "meta", "instagram", "tiktok", "youtube", "naver", "kakao", "line", "linkedin", "email", "sms"];
const EVENT_TYPES = [
  ["visit", "방문"], ["landing", "랜딩 조회"], ["pricing", "가격 조회"], ["download", "콘텐츠 다운로드"],
  ["inquiry", "문의"], ["email_open", "이메일 오픈"], ["email_click", "이메일 클릭"], ["demo", "데모 신청"],
  ["trial", "무료 체험 가입"], ["login", "로그인"], ["feature_use", "기능 사용"], ["invite", "팀원 초대"],
  ["checkout", "결제 진입"], ["consult", "상담 예약"], ["onboarded", "온보딩 완료"], ["paid", "유료 전환"],
  ["active", "사용 활성화"], ["upsell", "재구독/업셀"],
];
const STAGE_LABEL = {
  visitor: "방문자", landing: "랜딩", download: "다운로드", inquiry: "문의", demo: "데모",
  trial: "체험", onboarded: "온보딩", paid: "유료", active: "활성", upsell: "업셀",
};
const GRADE_COLOR = {
  cold: "#64748b", warm: "#0ea5e9", hot: "#f59e0b", sql: "#ef4444",
  trial: "#8b5cf6", paid: "#22c55e", expansion: "#10b981",
};

// ── 스타일 ──────────────────────────────────────────────
const S = {
  wrap: { padding: 20, maxWidth: 1280, margin: "0 auto" },
  card: { background: "var(--card, #14161c)", border: "1px solid var(--border, #2a2f3a)", borderRadius: 12, padding: 16 },
  btn: { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border, #2a2f3a)", background: "var(--card,#1b1f29)", color: "var(--text-1,#e5e7eb)", cursor: "pointer", fontSize: 13 },
  btnP: { padding: "8px 14px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  input: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border,#2a2f3a)", background: "var(--bg,#0d0f14)", color: "var(--text-1,#e5e7eb)", fontSize: 13, boxSizing: "border-box" },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "var(--text-2,#9aa3b2)", borderBottom: "1px solid var(--border,#2a2f3a)", whiteSpace: "nowrap" },
  td: { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid var(--border,#222)", color: "var(--text-1,#e5e7eb)" },
  badge: (bg) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: bg, color: "#fff" }),
};

function KpiCard({ label, value, sub }) {
  return (
    <div style={{ ...S.card, minWidth: 150, flex: "1 1 150px" }}>
      <div style={{ fontSize: 12, color: "var(--text-2,#9aa3b2)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub != null && <div style={{ fontSize: 11, color: "var(--text-2,#9aa3b2)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminGrowthCenter() {
  const [tab, setTab] = useState("dashboard");
  const [mode, setMode] = useState("test");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const flash = (m, isErr) => { if (isErr) { setErr(String(m)); setMsg(""); } else { setMsg(String(m)); setErr(""); } setTimeout(() => { setMsg(""); setErr(""); }, 4000); };

  const tabs = [
    ["dashboard", "📊 대시보드"], ["segments", "🎯 세그먼트"], ["leads", "👥 리드"],
    ["campaigns", "🚀 캠페인"], ["approvals", "✅ 승인"], ["settings", "⚙️ 설정 / 감사"],
  ];

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>그로스 센터</h1>
        <span style={S.badge(mode === "live" ? "#22c55e" : "#f59e0b")}>{mode === "live" ? "LIVE 모드" : "TEST 모드"}</span>
      </div>
      <p style={{ color: "var(--text-2,#9aa3b2)", fontSize: 13, marginTop: 0 }}>
        GeniegoROI 플랫폼 자체 마케팅 자동화 — 리드 → 데모 → 체험 → 유료 전환 → 성과 검증
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={tab === k ? S.btnP : S.btn}>{l}</button>
        ))}
      </div>

      {msg && <div style={{ ...S.card, borderColor: "#22c55e", marginBottom: 10, color: "#22c55e" }}>{msg}</div>}
      {err && <div style={{ ...S.card, borderColor: "#ef4444", marginBottom: 10, color: "#ef4444" }}>{err}</div>}

      {tab === "dashboard" && <DashboardTab setMode={setMode} flash={flash} />}
      {tab === "segments" && <SegmentsTab flash={flash} />}
      {tab === "leads" && <LeadsTab flash={flash} />}
      {tab === "campaigns" && <CampaignsTab flash={flash} mode={mode} />}
      {tab === "approvals" && <ApprovalsTab flash={flash} />}
      {tab === "settings" && <SettingsTab flash={flash} setMode={setMode} />}
    </div>
  );
}

// ── 대시보드 ────────────────────────────────────────────
function DashboardTab({ setMode, flash }) {
  const [d, setD] = useState(null);
  const load = useCallback(async () => {
    try { const r = unwrap(await getJson(`${API}/dashboard`)); setD(r); setMode(r?.mode || "test"); }
    catch (e) { flash(e?.message || e, true); }
  }, [setMode, flash]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div style={S.card}>불러오는 중…</div>;
  const c = d.cards || {};
  const f = d.funnel || {};
  const stages = f.stages || {};
  const maxCount = Math.max(1, ...Object.values(stages).map((s) => s.count || 0));
  const cards = [
    ["오늘 리드", c.todayLeads], ["이번 달 데모", c.monthDemos], ["무료 체험", c.trialSignups],
    ["유료 전환", c.paidConversions], ["MRR", `₩${(c.mrr || 0).toLocaleString()}`], ["Hot 리드", c.hotLeads],
    ["CAC", `₩${(c.cac || 0).toLocaleString()}`], ["LTV", `₩${(c.ltv || 0).toLocaleString()}`],
    ["체험→유료", `${c.trialToPaidRate || 0}%`], ["ROAS", `${c.roas || 0}x`],
    ["회수기간", `${c.paybackMonths || 0}개월`], ["실행 캠페인", `${c.runningCampaigns || 0}/${c.totalCampaigns || 0}`],
    ["승인 대기", c.pendingApprovals], ["누적 광고비", `₩${(c.totalSpend || 0).toLocaleString()}`],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {cards.map(([l, v]) => <KpiCard key={l} label={l} value={v ?? 0} />)}
      </div>
      <div style={S.card}>
        <h3 style={{ marginTop: 0 }}>퍼널 전환 (순이익 ROI {f.netProfitRoi || 0}%)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(f.order || []).map((sg) => {
            const s = stages[sg] || { count: 0 };
            const w = Math.round((s.count / maxCount) * 100);
            return (
              <div key={sg} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 70, fontSize: 12, color: "var(--text-2,#9aa3b2)" }}>{STAGE_LABEL[sg] || sg}</div>
                <div style={{ flex: 1, background: "var(--bg,#0d0f14)", borderRadius: 6, overflow: "hidden", height: 22 }}>
                  <div style={{ width: `${w}%`, minWidth: 2, height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                </div>
                <div style={{ width: 90, textAlign: "right", fontSize: 12 }}>
                  {s.count}{s.convFromPrev != null && <span style={{ color: "var(--text-2,#9aa3b2)" }}> ({s.convFromPrev}%)</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 세그먼트 ────────────────────────────────────────────
function SegmentsTab({ flash }) {
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = useCallback(async () => {
    try { const r = unwrap(await getJson(`${API}/segments`)); setRows(r?.segments || []); }
    catch (e) { flash(e?.message || e, true); }
  }, [flash]);
  useEffect(() => { load(); }, [load]);

  const seed = async () => { try { const r = unwrap(await postJson(`${API}/segments/seed`, {})); flash(`시드 ${r?.seeded ?? 0}종`); load(); } catch (e) { flash(e?.message || e, true); } };
  const save = async () => { try { await postJson(`${API}/segments`, edit); flash("저장됨"); setEdit(null); load(); } catch (e) { flash(e?.message || e, true); } };
  const del = async (id) => { try { await delJson(`${API}/segments/${id}`); flash("삭제됨"); load(); } catch (e) { flash(e?.message || e, true); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={S.btnP} onClick={() => setEdit({ name: "", industry: "", pain_point: "", key_message: "", channels: [], est_conv_rate: 0, est_cac: 0, est_ltv: 0, monthly_value: 0 })}>+ 세그먼트</button>
        {rows.length === 0 && <button style={S.btn} onClick={seed}>기본 타겟 17종 시드</button>}
      </div>
      {edit && (
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
            <input style={S.input} placeholder="이름" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <input style={S.input} placeholder="업종" value={edit.industry} onChange={(e) => setEdit({ ...edit, industry: e.target.value })} />
            <input style={S.input} placeholder="세그먼트 키(영문)" value={edit.seg_key || ""} onChange={(e) => setEdit({ ...edit, seg_key: e.target.value })} />
            <input style={S.input} type="number" placeholder="예상 전환율%" value={edit.est_conv_rate} onChange={(e) => setEdit({ ...edit, est_conv_rate: +e.target.value })} />
            <input style={S.input} type="number" placeholder="예상 CAC" value={edit.est_cac} onChange={(e) => setEdit({ ...edit, est_cac: +e.target.value })} />
            <input style={S.input} type="number" placeholder="예상 LTV" value={edit.est_ltv} onChange={(e) => setEdit({ ...edit, est_ltv: +e.target.value })} />
            <input style={S.input} type="number" placeholder="월 가치(MRR)" value={edit.monthly_value} onChange={(e) => setEdit({ ...edit, monthly_value: +e.target.value })} />
          </div>
          <textarea style={{ ...S.input, marginTop: 8, minHeight: 50 }} placeholder="Pain Point" value={edit.pain_point} onChange={(e) => setEdit({ ...edit, pain_point: e.target.value })} />
          <textarea style={{ ...S.input, marginTop: 8, minHeight: 50 }} placeholder="핵심 메시지" value={edit.key_message} onChange={(e) => setEdit({ ...edit, key_message: e.target.value })} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
            {AD_CHANNELS.map((ch) => {
              const on = (edit.channels || []).includes(ch);
              return <button key={ch} style={on ? S.btnP : S.btn} onClick={() => setEdit({ ...edit, channels: on ? edit.channels.filter((x) => x !== ch) : [...(edit.channels || []), ch] })}>{ch}</button>;
            })}
          </div>
          <div style={{ display: "flex", gap: 6 }}><button style={S.btnP} onClick={save}>저장</button><button style={S.btn} onClick={() => setEdit(null)}>취소</button></div>
        </div>
      )}
      <div style={{ ...S.card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>세그먼트</th><th style={S.th}>업종</th><th style={S.th}>Pain</th><th style={S.th}>예상CAC</th><th style={S.th}>예상LTV</th><th style={S.th}>채널</th><th style={S.th}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}><b>{r.name}</b></td>
                <td style={S.td}>{r.industry}</td>
                <td style={{ ...S.td, maxWidth: 240 }}>{r.pain_point}</td>
                <td style={S.td}>₩{(+r.est_cac).toLocaleString()}</td>
                <td style={S.td}>₩{(+r.est_ltv).toLocaleString()}</td>
                <td style={S.td}>{(r.channels || []).join(", ")}</td>
                <td style={S.td}><button style={S.btn} onClick={() => setEdit({ ...r, channels: r.channels || [] })}>편집</button> <button style={S.btn} onClick={() => del(r.id)}>삭제</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={S.td} colSpan={7}>세그먼트가 없습니다. "기본 타겟 17종 시드"로 시작하세요.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 리드 ────────────────────────────────────────────────
function LeadsTab({ flash }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({ grade: "", stage: "" });
  const [edit, setEdit] = useState(null);
  const [evt, setEvt] = useState(null);
  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (filter.grade) qs.set("grade", filter.grade);
      if (filter.stage) qs.set("stage", filter.stage);
      const r = unwrap(await getJson(`${API}/leads?${qs}`)); setRows(r?.leads || []);
    } catch (e) { flash(e?.message || e, true); }
  }, [filter, flash]);
  useEffect(() => { load(); }, [load]);

  const save = async () => { try { await postJson(`${API}/leads`, edit); flash("저장됨"); setEdit(null); load(); } catch (e) { flash(e?.message || e, true); } };
  const recordEvent = async () => { try { const r = unwrap(await postJson(`${API}/leads/${evt.id}/event`, { event_type: evt.event_type, channel: evt.channel, value: +evt.value || 0 })); flash(`점수 ${r?.scored?.score} · ${r?.scored?.grade}`); setEvt(null); load(); } catch (e) { flash(e?.message || e, true); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button style={S.btnP} onClick={() => setEdit({ email: "", name: "", company: "", segment_key: "", source: "manual" })}>+ 리드</button>
        <select style={{ ...S.input, width: 140 }} value={filter.grade} onChange={(e) => setFilter({ ...filter, grade: e.target.value })}>
          <option value="">전체 등급</option>{["cold", "warm", "hot", "sql", "trial", "paid", "expansion"].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={{ ...S.input, width: 140 }} value={filter.stage} onChange={(e) => setFilter({ ...filter, stage: e.target.value })}>
          <option value="">전체 단계</option>{Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {edit && (
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            <input style={S.input} placeholder="이메일*" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            <input style={S.input} placeholder="이름" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <input style={S.input} placeholder="회사" value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
            <input style={S.input} placeholder="세그먼트 키" value={edit.segment_key} onChange={(e) => setEdit({ ...edit, segment_key: e.target.value })} />
            <input style={S.input} placeholder="유입 소스" value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button style={S.btnP} onClick={save}>저장</button><button style={S.btn} onClick={() => setEdit(null)}>취소</button></div>
        </div>
      )}
      {evt && (
        <div style={S.card}>
          <div style={{ marginBottom: 6, fontSize: 13 }}>이벤트 기록 → <b>{evt.email}</b></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select style={{ ...S.input, width: 180 }} value={evt.event_type} onChange={(e) => setEvt({ ...evt, event_type: e.target.value })}>
              {EVENT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input style={{ ...S.input, width: 140 }} placeholder="채널" value={evt.channel} onChange={(e) => setEvt({ ...evt, channel: e.target.value })} />
            <input style={{ ...S.input, width: 140 }} type="number" placeholder="값(MRR 등)" value={evt.value} onChange={(e) => setEvt({ ...evt, value: e.target.value })} />
            <button style={S.btnP} onClick={recordEvent}>기록</button><button style={S.btn} onClick={() => setEvt(null)}>취소</button>
          </div>
        </div>
      )}
      <div style={{ ...S.card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>이메일</th><th style={S.th}>회사</th><th style={S.th}>세그먼트</th><th style={S.th}>단계</th><th style={S.th}>점수</th><th style={S.th}>등급</th><th style={S.th}>MRR</th><th style={S.th}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>{r.email}</td>
                <td style={S.td}>{r.company}</td>
                <td style={S.td}>{r.segment_key}</td>
                <td style={S.td}>{STAGE_LABEL[r.stage] || r.stage}</td>
                <td style={S.td}><b>{r.score}</b></td>
                <td style={S.td}><span style={S.badge(GRADE_COLOR[r.grade] || "#64748b")}>{r.grade}</span></td>
                <td style={S.td}>{r.mrr ? `₩${(+r.mrr).toLocaleString()}` : "-"}</td>
                <td style={S.td}><button style={S.btn} onClick={() => setEvt({ id: r.id, email: r.email, event_type: "visit", channel: "", value: 0 })}>이벤트</button> <button style={S.btn} onClick={() => setEdit({ ...r })}>편집</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={S.td} colSpan={8}>리드가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 캠페인 ──────────────────────────────────────────────
function CampaignsTab({ flash, mode }) {
  const [rows, setRows] = useState([]);
  const [segs, setSegs] = useState([]);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const load = useCallback(async () => {
    try {
      const r = unwrap(await getJson(`${API}/campaigns`)); setRows(r?.campaigns || []);
      const s = unwrap(await getJson(`${API}/segments`)); setSegs(s?.segments || []);
    } catch (e) { flash(e?.message || e, true); }
  }, [flash]);
  useEffect(() => { load(); }, [load]);

  const save = async () => { try { await postJson(`${API}/campaigns`, edit); flash("저장됨"); setEdit(null); load(); } catch (e) { flash(e?.message || e, true); } };
  const generate = async (id) => { try { const r = unwrap(await postJson(`${API}/campaigns/${id}/generate`, { lang: "ko" })); flash(`AI 콘텐츠 생성(${r?.content?._source}) — 승인 대기`); setView(r?.content); load(); } catch (e) { flash(e?.message || e, true); } };
  const launch = async (id) => {
    try { const r = unwrap(await postJson(`${API}/campaigns/${id}/launch`, {}));
      if (r?.simulation) { setView({ _sim: r.simulation }); flash("테스트 시뮬레이션 완료 (실제 집행 없음)"); }
      else if (r?.missingCredentials) flash(`자격증명 필요: ${r.missingCredentials.join(", ")}`, true);
      else flash(r?.status === "running" ? "Live 실행됨" : `상태: ${r?.status}`);
      load();
    } catch (e) { flash(e?.message || e, true); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button style={S.btnP} onClick={() => setEdit({ name: "", objective: "", segment_key: "", channels: [], budget: 0 })}>+ 캠페인</button>
      {edit && (
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            <input style={S.input} placeholder="캠페인 이름" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <input style={S.input} placeholder="목표(예: 데모 신청)" value={edit.objective} onChange={(e) => setEdit({ ...edit, objective: e.target.value })} />
            <select style={S.input} value={edit.segment_key} onChange={(e) => setEdit({ ...edit, segment_key: e.target.value })}>
              <option value="">세그먼트 선택</option>{segs.map((s) => <option key={s.id} value={s.seg_key}>{s.name}</option>)}
            </select>
            <input style={S.input} type="number" placeholder="예산" value={edit.budget} onChange={(e) => setEdit({ ...edit, budget: +e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
            {AD_CHANNELS.map((ch) => { const on = (edit.channels || []).includes(ch); return <button key={ch} style={on ? S.btnP : S.btn} onClick={() => setEdit({ ...edit, channels: on ? edit.channels.filter((x) => x !== ch) : [...(edit.channels || []), ch] })}>{ch}</button>; })}
          </div>
          <div style={{ display: "flex", gap: 6 }}><button style={S.btnP} onClick={save}>저장</button><button style={S.btn} onClick={() => setEdit(null)}>취소</button></div>
        </div>
      )}
      {view && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><b>{view._sim ? "시뮬레이션 결과 (예상)" : "AI 생성 콘텐츠"}</b><button style={S.btn} onClick={() => setView(null)}>닫기</button></div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--text-1,#e5e7eb)", marginTop: 8 }}>{JSON.stringify(view._sim || view, null, 2)}</pre>
        </div>
      )}
      <div style={{ ...S.card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>캠페인</th><th style={S.th}>목표</th><th style={S.th}>세그먼트</th><th style={S.th}>채널</th><th style={S.th}>예산</th><th style={S.th}>모드</th><th style={S.th}>상태</th><th style={S.th}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}><b>{r.name}</b></td>
                <td style={S.td}>{r.objective}</td>
                <td style={S.td}>{r.segment_key}</td>
                <td style={S.td}>{(r.channels || []).join(", ")}</td>
                <td style={S.td}>₩{(+r.budget).toLocaleString()}</td>
                <td style={S.td}><span style={S.badge(r.mode === "live" ? "#22c55e" : "#f59e0b")}>{r.mode}</span></td>
                <td style={S.td}>{r.status}</td>
                <td style={S.td}>
                  {r.content ? <button style={S.btn} onClick={() => setView(r.content)}>콘텐츠</button> : <button style={S.btn} onClick={() => generate(r.id)}>AI 생성</button>}{" "}
                  <button style={S.btnP} onClick={() => launch(r.id)}>{mode === "live" ? "실행" : "시뮬레이션"}</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={S.td} colSpan={8}>캠페인이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 승인 ────────────────────────────────────────────────
function ApprovalsTab({ flash }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("pending");
  const load = useCallback(async () => {
    try { const r = unwrap(await getJson(`${API}/approvals?status=${status}`)); setRows(r?.approvals || []); }
    catch (e) { flash(e?.message || e, true); }
  }, [status, flash]);
  useEffect(() => { load(); }, [load]);
  const decide = async (id, decision) => { try { await postJson(`${API}/approvals/${id}/decide`, { decision }); flash(`처리됨: ${decision}`); load(); } catch (e) { flash(e?.message || e, true); } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["pending", "approved", "rejected"].map((s) => <button key={s} style={status === s ? S.btnP : S.btn} onClick={() => setStatus(s)}>{s}</button>)}
      </div>
      <div style={{ ...S.card, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>유형</th><th style={S.th}>요약</th><th style={S.th}>요청자</th><th style={S.th}>일시</th><th style={S.th}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>{r.ref_type}</td>
                <td style={S.td}>{r.summary}</td>
                <td style={S.td}>{r.requested_by}</td>
                <td style={S.td}>{(r.created_at || "").slice(0, 16).replace("T", " ")}</td>
                <td style={S.td}>{status === "pending" && <><button style={S.btnP} onClick={() => decide(r.id, "approved")}>승인</button> <button style={S.btn} onClick={() => decide(r.id, "rejected")}>반려</button></>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={S.td} colSpan={5}>항목이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 설정 / 감사 ─────────────────────────────────────────
function SettingsTab({ flash, setMode }) {
  const [s, setS] = useState(null);
  const [logs, setLogs] = useState([]);
  const load = useCallback(async () => {
    try {
      const r = unwrap(await getJson(`${API}/settings`)); setS(r); setMode(r?.mode || "test");
      const l = unwrap(await getJson(`${API}/audit`)); setLogs(l?.logs || []);
    } catch (e) { flash(e?.message || e, true); }
  }, [flash, setMode]);
  useEffect(() => { load(); }, [load]);
  const setModeReq = async (m) => {
    try { const r = unwrap(await putJson(`${API}/settings`, { mode: m }));
      if (r?.requestedLive) flash("Live 전환 승인 요청됨 — 승인 탭에서 승인하세요");
      else flash(`모드: ${r?.mode}`);
      load();
    } catch (e) { flash(e?.message || e, true); }
  };
  if (!s) return <div style={S.card}>불러오는 중…</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={S.card}>
        <h3 style={{ marginTop: 0 }}>실행 모드</h3>
        <p style={{ fontSize: 13, color: "var(--text-2,#9aa3b2)" }}>
          <b>TEST</b>: 실제 발송·광고 집행 차단, 시뮬레이션만. <b>LIVE</b>: 승인 후 실제 실행(감사 기록).
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.mode === "test" ? S.btnP : S.btn} onClick={() => setModeReq("test")}>TEST 모드</button>
          <button style={s.mode === "live" ? S.btnP : S.btn} onClick={() => setModeReq("live")}>LIVE 모드 (승인 필요)</button>
        </div>
      </div>
      <div style={{ ...S.card, overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>감사 로그 (Audit)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={S.th}>일시</th><th style={S.th}>행위자</th><th style={S.th}>액션</th><th style={S.th}>상세</th></tr></thead>
          <tbody>
            {logs.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>{(r.created_at || "").slice(0, 16).replace("T", " ")}</td>
                <td style={S.td}>{r.actor}</td>
                <td style={S.td}>{r.action}</td>
                <td style={{ ...S.td, maxWidth: 320, fontSize: 11, color: "var(--text-2,#9aa3b2)" }}>{JSON.stringify(r.details)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td style={S.td} colSpan={4}>로그가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
