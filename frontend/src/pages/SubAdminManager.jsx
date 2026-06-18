import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n } from "../i18n";
import { getJsonAuth } from "../services/apiClient.js";
import { MEMBER_MENU, ADMIN_MENU } from "../layout/sidebarManifest.js";

/*
 * [현 차수] 하위 관리자(sub-admin) 관리 — 최고관리자(master) 전용
 *  • 최고관리자가 별도 이메일/비밀번호로 하위 관리자를 발급(plan='admin', admin_level='sub').
 *  • 하위 관리자는 최고관리자와 동일한 접속코드(GENIEGO-ADMIN) + 발급받은 이메일/비번으로 로그인.
 *  • 전체 메뉴 중 일부만 권한 부여(admin_menus). 비밀번호는 하위 관리자 본인이 변경 가능(상단바 프로필).
 *  • 최고관리자만 추가/정지/권한변경 가능(서버 requireMasterAdmin 으로 권한상승 차단).
 */

const card = { background: "var(--card-bg, rgba(255,255,255,0.9))", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 22 };
const input = { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.15)", fontSize: 13, background: "var(--input-bg, #fff)", color: "var(--text-1)" };
const btnPrimary = { padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4f8ef7,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 13 };
const btnGhost = { padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.18)", cursor: "pointer", background: "transparent", color: "var(--text-2)", fontWeight: 700, fontSize: 12 };

export default function SubAdminManager() {
  const { token, adminLevel } = useAuth();
  const { t } = useI18n();

  // 메뉴 트리(권한 부여 대상) — 자기 자신(하위 관리자 관리)은 제외해 권한상승 차단.
  const SECTIONS = useMemo(() => {
    const lbl = (it) => it.label ?? t(it.labelKey, it.labelKey.split(".")[1]);
    const secLbl = (s) => s.label ?? t(s.labelKey, s.labelKey.split(".")[1]);
    return [...MEMBER_MENU, ...ADMIN_MENU]
      .map((s) => ({
        key: s.key, icon: s.icon, label: secLbl(s),
        items: (s.items || []).filter((it) => it.to !== "/admin/sub-admins").map((it) => ({ to: it.to, icon: it.icon, label: lbl(it) })),
      }))
      .filter((s) => s.items.length > 0);
  }, [t]);
  const ALL_PATHS = useMemo(() => SECTIONS.flatMap((s) => s.items.map((i) => i.to)), [SECTIONS]);

  const [list, setList] = useState(null); // null=loading
  const [msg, setMsg] = useState(null);   // { ok, text }
  const [busy, setBusy] = useState(false);

  // 발급 폼
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [menus, setMenus] = useState(() => new Set(["/dashboard"]));

  // 편집 상태
  const [editId, setEditId] = useState(null);
  const [editMenus, setEditMenus] = useState(new Set());
  const [pwId, setPwId] = useState(null);
  const [pwVal, setPwVal] = useState("");

  const authFetch = useCallback(async (path, method, body) => {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok && d.ok !== false, d };
  }, [token]);

  const load = useCallback(async () => {
    try {
      const d = await getJsonAuth("/api/auth/admin/sub-admins");
      setList(Array.isArray(d?.sub_admins) ? d.sub_admins : []);
    } catch { setList([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleMenu = (set, setter, path) => {
    const n = new Set(set);
    n.has(path) ? n.delete(path) : n.add(path);
    setter(n);
  };
  const toggleSection = (set, setter, paths, on) => {
    const n = new Set(set);
    paths.forEach((p) => (on ? n.add(p) : n.delete(p)));
    setter(n);
  };

  const create = async () => {
    setMsg(null); setBusy(true);
    const { ok, d } = await authFetch("/api/auth/admin/sub-admins", "POST", {
      email, name, password, menus: [...menus],
    });
    setBusy(false);
    if (ok) {
      setMsg({ ok: true, text: d.message || "하위 관리자가 발급되었습니다." });
      setEmail(""); setName(""); setPassword(""); setMenus(new Set(["/dashboard"]));
      load();
    } else {
      setMsg({ ok: false, text: d.error || "발급에 실패했습니다." });
    }
  };

  const setActive = async (id, active) => {
    const { ok, d } = await authFetch(`/api/auth/admin/sub-admins/${id}`, "PATCH", { is_active: active ? 1 : 0 });
    setMsg(ok ? { ok: true, text: active ? "활성화되었습니다." : "정지되었습니다." } : { ok: false, text: d.error || "변경 실패" });
    if (ok) load();
  };

  const saveMenus = async (id) => {
    if (editMenus.size < 1) { setMsg({ ok: false, text: "메뉴를 1개 이상 선택하세요." }); return; }
    const { ok, d } = await authFetch(`/api/auth/admin/sub-admins/${id}`, "PATCH", { menus: [...editMenus] });
    setMsg(ok ? { ok: true, text: "메뉴 권한이 변경되었습니다." } : { ok: false, text: d.error || "변경 실패" });
    if (ok) { setEditId(null); load(); }
  };

  const savePw = async (id) => {
    const { ok, d } = await authFetch(`/api/auth/admin/sub-admins/${id}`, "PATCH", { password: pwVal });
    setMsg(ok ? { ok: true, text: "비밀번호가 재설정되었습니다. 해당 하위 관리자는 다시 로그인해야 합니다." } : { ok: false, text: d.error || "변경 실패" });
    if (ok) { setPwId(null); setPwVal(""); }
  };

  // 하위 관리자 본인은 이 페이지 접근 불가(서버에서도 차단됨).
  if (adminLevel === "sub") {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ ...card, maxWidth: 560 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>🔒 접근 권한 없음</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
            하위 관리자는 다른 관리자를 관리할 수 없습니다. 비밀번호 변경은 상단 우측 프로필 메뉴에서 가능합니다.
          </div>
        </div>
      </div>
    );
  }

  const MenuTree = ({ selected, setter }) => (
    <div style={{ display: "grid", gap: 10, maxHeight: 320, overflowY: "auto", padding: 4 }}>
      {SECTIONS.map((s) => {
        const paths = s.items.map((i) => i.to);
        const allOn = paths.every((p) => selected.has(p));
        return (
          <div key={s.key} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "8px 10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={allOn} onChange={() => toggleSection(selected, setter, paths, !allOn)} />
              <span>{s.icon} {s.label}</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 4, marginTop: 6, paddingLeft: 22 }}>
              {s.items.map((it) => (
                <label key={it.to} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", color: "var(--text-2)" }}>
                  <input type="checkbox" checked={selected.has(it.to)} onChange={() => toggleMenu(selected, setter, it.to)} />
                  <span>{it.icon} {it.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const pathLabel = (p) => {
    for (const s of SECTIONS) for (const it of s.items) if (it.to === p) return it.label;
    return p;
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>👤 하위 관리자 관리</div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 6, lineHeight: 1.7 }}>
          최고관리자가 하위 관리자를 발급하고 전체 메뉴 중 일부 권한을 부여합니다.
          하위 관리자는 <b>최고관리자와 동일한 접속코드</b> + 발급받은 <b>이메일/비밀번호</b>로 로그인하며,
          비밀번호는 본인이 상단 프로필에서 변경할 수 있습니다.
        </div>
      </div>

      {msg && (
        <div role="status" style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
          background: msg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: msg.ok ? "#16a34a" : "#dc2626",
          border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
          {msg.ok ? "✅ " : "⚠️ "}{msg.text}
        </div>
      )}

      {/* 발급 폼 */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>＋ 하위 관리자 발급</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><div style={lblS}>이메일(로그인 ID)</div><input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sub-admin@company.com" /></div>
          <div><div style={lblS}>이름</div><input style={input} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" /></div>
          <div><div style={lblS}>초기 비밀번호</div><input style={input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자+ 영문 대/소문자·숫자·특수문자 3종" /></div>
        </div>
        <div style={lblS}>부여할 메뉴 권한 ({menus.size}개 선택)</div>
        <MenuTree selected={menus} setter={setMenus} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={btnGhost} onClick={() => setMenus(new Set([...ALL_PATHS, "/dashboard"]))}>전체 선택</button>
          <button style={btnGhost} onClick={() => setMenus(new Set(["/dashboard"]))}>초기화</button>
          <div style={{ flex: 1 }} />
          <button style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={create}>{busy ? "발급 중…" : "하위 관리자 발급"}</button>
        </div>
      </div>

      {/* 목록 */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>발급된 하위 관리자 {Array.isArray(list) ? `(${list.length})` : ""}</div>
        {list === null && <div style={{ color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>}
        {Array.isArray(list) && list.length === 0 && <div style={{ color: "var(--text-3)", fontSize: 13 }}>아직 발급된 하위 관리자가 없습니다.</div>}
        {Array.isArray(list) && list.map((m) => (
          <div key={m.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>{m.name || "(이름 없음)"}</span>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{m.email}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
                background: m.is_active ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)", color: m.is_active ? "#16a34a" : "#dc2626" }}>
                {m.is_active ? "활성" : "정지"}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>메뉴 {Array.isArray(m.admin_menus) ? m.admin_menus.length : 0}개</span>
              <div style={{ flex: 1 }} />
              <button style={btnGhost} onClick={() => { setEditId(editId === m.id ? null : m.id); setEditMenus(new Set(m.admin_menus || [])); }}>메뉴 권한</button>
              <button style={btnGhost} onClick={() => { setPwId(pwId === m.id ? null : m.id); setPwVal(""); }}>비번 재설정</button>
              {m.is_active
                ? <button style={{ ...btnGhost, color: "#dc2626", borderColor: "rgba(239,68,68,0.4)" }} onClick={() => setActive(m.id, false)}>정지</button>
                : <button style={{ ...btnGhost, color: "#16a34a", borderColor: "rgba(34,197,94,0.4)" }} onClick={() => setActive(m.id, true)}>활성화</button>}
            </div>

            {/* 부여 메뉴 미리보기 */}
            {Array.isArray(m.admin_menus) && m.admin_menus.length > 0 && editId !== m.id && (
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {m.admin_menus.map((p) => (
                  <span key={p} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{pathLabel(p)}</span>
                ))}
              </div>
            )}

            {/* 메뉴 권한 편집 */}
            {editId === m.id && (
              <div style={{ marginTop: 10, padding: 12, background: "rgba(99,102,241,0.04)", borderRadius: 10 }}>
                <div style={lblS}>부여할 메뉴 ({editMenus.size}개)</div>
                <MenuTree selected={editMenus} setter={setEditMenus} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button style={btnGhost} onClick={() => setEditMenus(new Set([...ALL_PATHS, "/dashboard"]))}>전체 선택</button>
                  <div style={{ flex: 1 }} />
                  <button style={btnGhost} onClick={() => setEditId(null)}>취소</button>
                  <button style={btnPrimary} onClick={() => saveMenus(m.id)}>저장</button>
                </div>
              </div>
            )}

            {/* 비번 재설정 */}
            {pwId === m.id && (
              <div style={{ marginTop: 10, padding: 12, background: "rgba(239,68,68,0.04)", borderRadius: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ ...input, maxWidth: 360 }} type="text" value={pwVal} onChange={(e) => setPwVal(e.target.value)} placeholder="새 비밀번호 (8자+ 3종 조합)" />
                <button style={btnGhost} onClick={() => { setPwId(null); setPwVal(""); }}>취소</button>
                <button style={btnPrimary} onClick={() => savePw(m.id)}>재설정</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const lblS = { fontSize: 11.5, fontWeight: 700, color: "var(--text-2)", marginBottom: 5 };
