// [272차] 대행사(Agency) 멀티클라이언트 콘솔 — 자체완결형(별도 agt_ 세션·화이트라벨).
//   대행사가 여러 클라이언트(기업/테넌트)를 하나의 대행사 로그인으로 관리한다. 클라이언트 데이터는
//   테넌트 경계를 벗어나지 않으며(서버 격리), 대행사 접근은 반드시 클라이언트 승인 게이트 통과 후에만
//   가능하고 클라이언트가 언제든 즉시 철회한다. 이 페이지는 일반 사용자 세션(genie_token)과 무관하게
//   agt_ 토큰만 사용한다(localStorage: genie_agency_token).
import React, { useCallback, useEffect, useState } from "react";

const AGT_KEY = "genie_agency_token";
const base = import.meta.env.VITE_API_BASE || "";
// [272차 전기능 브릿지] 대행사가 클라이언트로 전환하면 앱 인증 컨텍스트(TOKEN_KEY/USER_KEY)를 agt_ 세션으로
//   심어 전 앱을 클라이언트 스코프로 운영한다. 키 접두는 빌드별(데모/운영) 정합.
const _IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const APP_TOKEN_KEY = _IS_DEMO ? "demo_genie_token" : "genie_token";
const APP_USER_KEY = _IS_DEMO ? "demo_genie_user" : "genie_user";

async function agFetch(path, { method = "GET", body, token } = {}) {
  const h = { "Content-Type": "application/json" };
  const t = token || (() => { try { return localStorage.getItem(AGT_KEY) || ""; } catch (e) { return ""; } })();
  if (t) h["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${base}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch (e) { /* 응답 본문 파싱 실패 무시 */ }
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data || {};
}

const fmtKRW = (n) => "₩" + Math.round(Number(n) || 0).toLocaleString("ko-KR");

const STATUS_BADGE = {
  approved: { bg: "#dcfce7", fg: "#166534", label: "승인됨" },
  pending: { bg: "#fef9c3", fg: "#854d0e", label: "승인 대기" },
  revoked: { bg: "#fee2e2", fg: "#991b1b", label: "철회됨" },
};

export default function AgencyConsole() {
  const [token, setToken] = useState(() => { try { return localStorage.getItem(AGT_KEY) || ""; } catch (e) { return ""; } });
  const [agency, setAgency] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [active, setActive] = useState(null);     // { link, kpi }
  const [portfolio, setPortfolio] = useState(null);

  const persist = (t) => { try { if (t) localStorage.setItem(AGT_KEY, t); else localStorage.removeItem(AGT_KEY); } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ } setToken(t); };

  const loadMe = useCallback(async () => {
    try { const d = await agFetch("/api/agency/me"); setAgency(d.agency); }
    catch (e) { persist(""); setAgency(null); }
  }, []);
  const loadClients = useCallback(async () => {
    try { const d = await agFetch("/api/agency/clients"); setClients(Array.isArray(d.clients) ? d.clients : []); }
    catch (e) { setErr(String(e.message || e)); }
  }, []);

  useEffect(() => { if (token) { loadMe(); loadClients(); } }, [token, loadMe, loadClients]);

  const doLogin = async (e) => {
    e && e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const d = await agFetch("/api/agency/login", { method: "POST", body: { login_id: loginId.trim().toLowerCase(), password: pw }, token: "x" });
      persist(d.token); setAgency(d.agency); setPw("");
    } catch (e2) { setErr(String(e2.message || e2)); }
    finally { setLoading(false); }
  };
  const doLogout = async () => {
    try { await agFetch("/api/agency/logout", { method: "POST" }); } catch (e) { /* 실패 무시(best-effort) */ }
    // 대행사 세션 + 전기능 브릿지 앱 세션 모두 정리(잔존 방지).
    try { localStorage.removeItem(APP_TOKEN_KEY); localStorage.removeItem(APP_USER_KEY); localStorage.removeItem("genie_agency_client"); } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
    persist(""); setAgency(null); setClients([]); setActive(null); setPortfolio(null);
  };
  const doInvite = async (e) => {
    e && e.preventDefault();
    setErr("");
    const em = inviteEmail.trim().toLowerCase();
    if (!em || !em.includes("@")) { setErr("클라이언트 이메일을 입력하세요."); return; }
    try { await agFetch("/api/agency/clients/invite", { method: "POST", body: { client_email: em } }); setInviteEmail(""); await loadClients(); }
    catch (e2) { setErr(String(e2.message || e2)); }
  };

  // 클라이언트 전환 → 해당 클라이언트 스코프로 핵심 KPI 조회(기존 엔드포인트 재사용·agt_ 토큰).
  const openClient = async (link) => {
    setErr(""); setLoading(true); setActive(null);
    try {
      await agFetch(`/api/agency/clients/${link.id}/switch`, { method: "POST" });
      const [pnl, ordStats] = await Promise.all([
        agFetch("/api/v424/pnl").catch(() => null),
        agFetch("/api/v424/orderhub/orders/stats").catch(() => null),
      ]);
      setActive({ link, pnl, ordStats });
    } catch (e2) { setErr(String(e2.message || e2)); }
    finally { setLoading(false); }
  };

  // [272차 전기능 브릿지] 클라이언트로 전환 후 GeniegoROI 전 기능(대시보드/캠페인/CRM/WMS 등)을
  //   클라이언트 스코프로 운영. agt_ 세션을 앱 인증 컨텍스트로 심고 전 앱 진입(권한=클라이언트 승인 스코프).
  const operateClient = async (link) => {
    setErr(""); setLoading(true);
    try {
      await agFetch(`/api/agency/clients/${link.id}/switch`, { method: "POST" });
      const synthUser = {
        id: (agency && agency.id) || 0, email: (agency && agency.login_id) || "agency",
        name: (link.client_name || link.client_email) + " (대행 운영)", company: agency && agency.name,
        tenant_id: link.client_tenant_id, plan: "pro", plans: "pro",
        _agencyActing: true, _agencyClientName: link.client_name || link.client_email,
      };
      localStorage.setItem(APP_TOKEN_KEY, token);              // token=agt_ → apiClient 가 클라이언트 스코프로 전송
      localStorage.setItem(APP_USER_KEY, JSON.stringify(synthUser));
      localStorage.setItem("genie_agency_client", JSON.stringify({ name: link.client_name || link.client_email, tenant: link.client_tenant_id, write: !!(link.scope && link.scope.write) }));
      window.location.href = "/dashboard";
    } catch (e2) { setErr(String(e2.message || e2)); setLoading(false); }
  };

  // 포트폴리오: 승인된 전 클라이언트 KPI 합산(순차 전환·읽기).
  const loadPortfolio = async () => {
    setErr(""); setLoading(true);
    const approved = clients.filter((c) => c.status === "approved");
    const rows = [];
    for (const c of approved) {
      try {
        await agFetch(`/api/agency/clients/${c.id}/switch`, { method: "POST" });
        const pnl = await agFetch("/api/v424/pnl").catch(() => null);
        rows.push({ name: c.client_name || c.client_email, tenant: c.client_tenant_id,
          revenue: pnl?.revenue ?? pnl?.components?.revenue ?? 0, net: pnl?.netProfit ?? pnl?.net ?? 0 });
      } catch (e) { rows.push({ name: c.client_name || c.client_email, error: true }); }
    }
    try { await agFetch("/api/agency/clients/exit", { method: "POST" }); } catch (e) { /* 실패 무시(best-effort) */ }
    setPortfolio({ rows, total: rows.reduce((a, r) => a + (Number(r.revenue) || 0), 0) });
    setLoading(false);
  };

  // ── 로그인 화면 ──
  if (!token || !agency) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 28, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 34 }}>🏢</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>대행사 콘솔</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>담당 클라이언트를 한 곳에서 관리하세요</div>
        </div>
        <form onSubmit={doLogin}>
          <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="대행사 로그인 ID" autoComplete="username"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 10, fontSize: 14, boxSizing: "border-box" }} />
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="비밀번호" autoComplete="current-password"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 14, fontSize: 14, boxSizing: "border-box" }} />
          {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 14 }}>대행사 계정은 GeniegoROI 관리자가 발급합니다.</div>
      </div>
    );
  }

  const approvedCount = clients.filter((c) => c.status === "approved").length;

  // ── 콘솔 ──
  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>🏢 {agency.name || "대행사 콘솔"}</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{agency.login_id} · 담당 클라이언트 {approvedCount}곳</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadPortfolio} style={btn("#0ea5e9")}>📊 포트폴리오</button>
          <button onClick={doLogout} style={btn("#64748b")}>로그아웃</button>
        </div>
      </div>

      {err && <div style={{ background: "#fef2f2", color: "#991b1b", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13 }}>{err}</div>}

      {/* 클라이언트 초대 */}
      <div style={card()}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>클라이언트 위임 요청</div>
        <form onSubmit={doInvite} style={{ display: "flex", gap: 8 }}>
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="클라이언트 계정 이메일(소유자)"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }} />
          <button type="submit" style={btn("#4f8ef7")}>요청 보내기</button>
        </form>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>요청 후 클라이언트가 승인해야 데이터에 접근할 수 있습니다(읽기 전용 기본 · 쓰기는 클라이언트가 별도 허용).</div>
      </div>

      {/* 클라이언트 목록 */}
      <div style={card()}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>담당 클라이언트 ({clients.length})</div>
        {clients.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>아직 위임 요청한 클라이언트가 없습니다.</div>}
        {clients.map((c) => {
          const b = STATUS_BADGE[c.status] || STATUS_BADGE.pending;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{c.client_name || c.client_email}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.client_email} · 권한 {c.scope?.write ? "읽기+쓰기" : "읽기 전용"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: b.bg, color: b.fg, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{b.label}</span>
                {c.status === "approved" && <button onClick={() => openClient(c)} style={btn("#64748b")}>요약</button>}
                {c.status === "approved" && <button onClick={() => operateClient(c)} style={btn("#4f8ef7")}>전기능 운영 →</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 활성 클라이언트 KPI */}
      {active && (
        <div style={card()}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>📈 {active.link.client_name || active.link.client_email} — 핵심 지표</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            {kpiTile("매출", fmtKRW(active.pnl?.revenue ?? active.pnl?.components?.revenue ?? 0))}
            {kpiTile("순이익", fmtKRW(active.pnl?.netProfit ?? active.pnl?.net ?? 0))}
            {kpiTile("주문수", (active.ordStats?.count ?? active.ordStats?.orders ?? 0).toLocaleString("ko-KR"))}
            {kpiTile("광고비", fmtKRW(active.pnl?.adSpend ?? active.pnl?.components?.adSpend ?? 0))}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>클라이언트 테넌트 경계 내 데이터만 표시됩니다(서버 격리·승인 기반).</div>
        </div>
      )}

      {/* 포트폴리오 */}
      {portfolio && (
        <div style={card()}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>📊 포트폴리오 — 담당 클라이언트 합산 매출 {fmtKRW(portfolio.total)}</div>
          {portfolio.rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f1f5f9", fontSize: 14 }}>
              <span style={{ color: "#0f172a" }}>{r.name}</span>
              <span style={{ color: r.error ? "#dc2626" : "#0f172a", fontWeight: 600 }}>{r.error ? "조회 오류" : fmtKRW(r.revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btn = (bg) => ({ padding: "8px 14px", borderRadius: 9, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" });
const card = () => ({ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, marginBottom: 16 });
const kpiTile = (label, val) => (
  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{val}</div>
  </div>
);
