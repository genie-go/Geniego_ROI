// [272차] 대행사 계정 관리 — 플랫폼 최고관리자(master) 전용.
//   최고관리자가 마케팅/광고 대행사에게 별도 로그인 계정을 발급한다. 대행사는 /agency 전용 콘솔에서
//   이 계정으로 로그인해 승인받은 클라이언트를 관리한다(본사/회원 세션과 완전 분리·은행급 격리).
//   서버 requireMasterAdmin 게이트로 하위관리자 접근 차단.
import React, { useCallback, useEffect, useState } from "react";
import { getJsonAuth, postJson, putJson, delJson } from "../services/apiClient.js";

export default function AgencyManager() {
  const [list, setList] = useState(null);   // null=loading
  const [msg, setMsg] = useState(null);     // { ok, text }
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    try { const d = await getJsonAuth("/api/auth/agencies"); setList(Array.isArray(d.agencies) ? d.agencies : []); }
    catch (e) { setList([]); setMsg({ ok: false, text: String(e.message || e) }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e && e.preventDefault();
    setMsg(null);
    if (!name.trim() || !loginId.trim() || password.length < 8) { setMsg({ ok: false, text: "대행사명·로그인 ID·8자 이상 비밀번호를 입력하세요." }); return; }
    setBusy(true);
    try {
      await postJson("/api/auth/agencies", { name: name.trim(), login_id: loginId.trim().toLowerCase(), password });
      setName(""); setLoginId(""); setPassword("");
      setMsg({ ok: true, text: "대행사 계정을 발급했습니다." });
      await load();
    } catch (e2) { setMsg({ ok: false, text: String(e2.message || e2) }); }
    finally { setBusy(false); }
  };
  const toggle = async (a) => {
    setMsg(null);
    try { await putJson(`/api/auth/agencies/${a.id}`, { active: a.active ? 0 : 1 }); await load(); }
    catch (e) { setMsg({ ok: false, text: String(e.message || e) }); }
  };
  const resetPw = async (a) => {
    const np = window.prompt("새 비밀번호(8자 이상)");
    if (!np) return;
    if (np.length < 8) { setMsg({ ok: false, text: "비밀번호는 8자 이상" }); return; }
    try { await putJson(`/api/auth/agencies/${a.id}`, { password: np }); setMsg({ ok: true, text: "비밀번호를 재설정했습니다(활성 세션 무효화)." }); }
    catch (e) { setMsg({ ok: false, text: String(e.message || e) }); }
  };
  const remove = async (a) => {
    if (!window.confirm(`대행사 계정 '${a.name}' 을(를) 삭제하시겠습니까? 위임 링크·세션이 함께 정리됩니다.`)) return;
    try { await delJson(`/api/auth/agencies/${a.id}`); await load(); }
    catch (e) { setMsg({ ok: false, text: String(e.message || e) }); }
  };

  return (
    <div style={{ maxWidth: 860, margin: "20px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1,#0f172a)" }}>🏢 대행사 계정 관리</div>
        <div style={{ fontSize: 13, color: "var(--text-3,#64748b)", marginTop: 4 }}>
          마케팅/광고 대행사에게 전용 로그인 계정을 발급합니다. 대행사는 <b>/agency</b> 콘솔에서 로그인 후, 클라이언트의 승인을 받아 담당 클라이언트를 관리합니다. (최고관리자 전용)
        </div>
      </div>

      {msg && <div style={{ background: msg.ok ? "#eff6ff" : "#fef2f2", color: msg.ok ? "#1e40af" : "#991b1b", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{msg.text}</div>}

      {/* 발급 폼 */}
      <div style={{ background: "var(--surface,#fff)", border: "1px solid var(--border,#e5e7eb)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--text-1,#0f172a)" }}>대행사 계정 발급</div>
        <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="대행사명" style={inp} />
          <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="로그인 ID(이메일)" autoComplete="off" style={inp} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="비밀번호(8자+)" autoComplete="new-password" style={inp} />
          <button type="submit" disabled={busy} style={btn("#4f8ef7")}>{busy ? "발급 중…" : "발급"}</button>
        </form>
      </div>

      {/* 목록 */}
      <div style={{ background: "var(--surface,#fff)", border: "1px solid var(--border,#e5e7eb)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--text-1,#0f172a)" }}>발급된 대행사 ({list ? list.length : "…"})</div>
        {list === null ? <div style={{ color: "#94a3b8" }}>불러오는 중…</div>
          : list.length === 0 ? <div style={{ color: "#94a3b8", fontSize: 13 }}>발급된 대행사 계정이 없습니다.</div>
            : list.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--border,#f1f5f9)", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-1,#0f172a)" }}>{a.name} <span style={{ fontSize: 11, color: a.active ? "#166534" : "#991b1b", marginLeft: 6 }}>{a.active ? "● 활성" : "○ 비활성"}</span></div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.login_id} · {a.agency_key}{a.last_login ? ` · 최근 로그인 ${String(a.last_login).slice(0, 10)}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => toggle(a)} style={btn("#64748b")}>{a.active ? "비활성화" : "활성화"}</button>
                  <button onClick={() => resetPw(a)} style={btn("#0ea5e9")}>비번 재설정</button>
                  <button onClick={() => remove(a)} style={btn("#dc2626")}>삭제</button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

const inp = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border,#e5e7eb)", fontSize: 14, boxSizing: "border-box", width: "100%" };
const btn = (bg) => ({ padding: "7px 12px", borderRadius: 8, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" });
