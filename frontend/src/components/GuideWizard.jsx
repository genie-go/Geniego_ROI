import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import { GUIDE_CONTENT, GUIDE_NAV, GUIDE_MSG } from "../data/guideContent.js";

/**
 * [237차] 재사용 가이드 위저드 — 인앱(페이지 내 메뉴 박스) 순차 완료 위저드.
 *   ★전체 페이지를 덮지 않고 기존 사이드바·서브탭을 유지한 채 카드 안에서 순차 진행(UX 혼란 방지).
 *   ★완료 게이팅(2종):
 *     - 필수 등록 단계(checks[i]=함수): 실제 상태 검증(예 ≥1 채널 등록·결제수단 등록). 미완 시 차단+메시지.
 *     - 안내 단계(checks[i] 없음): 온라인 '완료 확인'(동의) 체크해야 진행.
 *   ★최종 완료(전 단계 통과) 시에만 '실행하기' 활성화 → 실제 실행 화면으로 이동.
 *   콘텐츠 단일 소스 guideContent.js(15개국). props: guideKey, checks?(단계별 async ()=>bool 배열).
 */
export default function GuideWizard({ guideKey, checks }) {
  const { lang: rawLang } = useI18n();
  const navigate = useNavigate();
  const guide = GUIDE_CONTENT[guideKey];

  const lang = guide && guide[rawLang] ? rawLang : (guide && guide[(rawLang || "").split("-")[0]] ? rawLang.split("-")[0] : "ko");
  const d = guide ? (guide[lang] || guide.ko) : null;
  const nav = GUIDE_NAV[lang] || GUIDE_NAV.ko;
  const msg = GUIDE_MSG[lang] || GUIDE_MSG.ko;
  const links = (guide && guide.links) || [];
  const accent = (guide && guide.accent) || ["#4f46e5", "#7c3aed"];
  const storageKey = `genie_guide_v2_${guideKey}`;

  const total = d ? d.steps.length : 0;
  const [state, setState] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(storageKey) || "{}"); return { cur: typeof v.cur === "number" ? v.cur : 0, agreed: v.agreed || {} }; }
    catch { return { cur: 0, agreed: {} }; }
  });
  const [warn, setWarn] = useState("");     // "", "agree", "check"
  const [busy, setBusy] = useState(false);
  const persist = useCallback((nx) => { try { localStorage.setItem(storageKey, JSON.stringify(nx)); } catch (e) { /* ignore */ } }, [storageKey]);

  const cur = Math.max(0, Math.min(total, state.cur));
  const hasCheck = typeof (checks && checks[cur]) === "function";
  const agreedCur = !!state.agreed[cur];

  const advance = useCallback(() => {
    setState((s) => { const nx = { ...s, cur: Math.min(total, s.cur + 1) }; persist(nx); return nx; });
    setWarn("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [total, persist]);

  const toggleAgree = useCallback(() => {
    setWarn("");
    setState((s) => { const ag = { ...s.agreed, [s.cur]: !s.agreed[s.cur] }; const nx = { ...s, agreed: ag }; persist(nx); return nx; });
  }, [persist]);

  const onNext = useCallback(async () => {
    if (hasCheck) {
      setBusy(true); setWarn("");
      try {
        const ok = await checks[cur]();
        if (ok) advance(); else setWarn("check");
      } catch (e) { setWarn("check"); }
      finally { setBusy(false); }
    } else {
      if (agreedCur) advance(); else setWarn("agree");
    }
  }, [hasCheck, checks, cur, agreedCur, advance]);

  const goStep = useCallback((i) => { setWarn(""); setState((s) => { const nx = { ...s, cur: Math.max(0, Math.min(total, i)) }; persist(nx); return nx; }); }, [total, persist]);

  if (!d) return null;
  const isRtl = lang === "ar";
  const pct = Math.round((cur / total) * 100);
  const grad = `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`;
  const allDone = cur >= total;
  const nextDisabled = busy || (!hasCheck && !agreedCur);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text-1)" }}>{d.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 3 }}>{d.lead}</div>
      </div>
      <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: "#15803d", marginBottom: 14 }}>{d.safe}</div>

      <div style={{ background: "var(--card-bg, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, padding: "11px 15px", marginBottom: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "var(--text-3)", marginBottom: 7 }}>
          <span>{nav.step} {Math.min(cur + 1, total)} {nav.of} {total}</span><span>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: "var(--border, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, background: grad, width: pct + "%", transition: "width .4s" }} />
        </div>
      </div>

      {allDone && (
        <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.1),rgba(79,70,229,0.08))", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 14, padding: "18px 20px", fontSize: 14.5, fontWeight: 700, color: "#15803d", marginBottom: 14 }}>
          {d.all}
          <div style={{ marginTop: 11, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => navigate(d.doneRoute || links[0] || "/")} style={{ fontSize: 13, fontWeight: 800, color: "#fff", border: "none", cursor: "pointer", background: grad, padding: "9px 20px", borderRadius: 9, boxShadow: `0 4px 14px ${accent[0]}55` }}>{nav.execute}</button>
            <button onClick={() => goStep(0)} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", border: "1px solid var(--border,#e2e8f0)", cursor: "pointer", background: "transparent", padding: "8px 14px", borderRadius: 9 }}>{nav.reset}</button>
          </div>
        </div>
      )}

      {d.steps.map((s, i) => {
        const done = i < cur, active = i === cur;
        const stepHasCheck = typeof (checks && checks[i]) === "function";
        return (
          <div key={i} style={{ display: "flex", gap: 14, background: "var(--card-bg,#fff)", border: `1px solid ${active ? accent[0] : "var(--border,#e2e8f0)"}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12, opacity: done ? 0.62 : (active ? 1 : 0.42), boxShadow: active ? `0 6px 22px ${accent[0]}22` : "none" }}>
            <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: done ? "#16a34a" : grad, color: "#fff", fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>{done ? "✓" : i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", marginBottom: active ? 5 : 0 }}>
                {s[0]}{stepHasCheck && active && <span style={{ fontSize: 10, fontWeight: 800, color: "#dc2626", background: "rgba(220,38,38,0.1)", padding: "2px 7px", borderRadius: 6, marginLeft: 8, verticalAlign: "middle" }}>● 필수 / required</span>}
              </div>
              {active && <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>{s[1]}</div>}
              {active && (
                <>
                  {s[2] && <div style={{ marginBottom: 10 }}><span style={{ fontSize: 12, fontWeight: 700, color: accent[0], background: `${accent[0]}14`, padding: "4px 10px", borderRadius: 7 }}>📍 {s[2]}</span>{" "}
                    {links[i] && <button onClick={() => navigate(links[i])} style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", border: "none", cursor: "pointer", background: grad, padding: "6px 14px", borderRadius: 8, boxShadow: `0 3px 10px ${accent[0]}55`, verticalAlign: "middle" }}>{nav.go}</button>}
                  </div>}
                  {/* 안내 단계: 온라인 완료 확인(동의). 필수 등록 단계(stepHasCheck): 실제 검증이므로 체크박스 없음. */}
                  {!stepHasCheck && (
                    <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", background: agreedCur ? "rgba(22,163,74,0.08)" : "rgba(0,0,0,0.03)", border: `1px solid ${agreedCur ? "rgba(22,163,74,0.35)" : "var(--border,#e2e8f0)"}`, borderRadius: 9, padding: "9px 13px", marginBottom: 10 }}>
                      <input type="checkbox" checked={agreedCur} onChange={toggleAgree} style={{ width: 17, height: 17, accentColor: "#16a34a", cursor: "pointer" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: agreedCur ? "#15803d" : "var(--text-2)" }}>{nav.agree}</span>
                    </label>
                  )}
                  {warn === "agree" && <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 9 }}>⚠ {nav.agreeRequired}</div>}
                  {warn === "check" && <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 9 }}>⚠ {msg.checkRequired}</div>}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={onNext} disabled={nextDisabled}
                      style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", border: "none", cursor: nextDisabled ? "not-allowed" : "pointer", background: nextDisabled ? "#94a3b8" : "#16a34a", padding: "7px 16px", borderRadius: 8, boxShadow: nextDisabled ? "none" : "0 3px 10px rgba(22,163,74,0.3)", opacity: nextDisabled ? 0.7 : 1 }}>
                      {busy ? msg.checking : nav.done}
                    </button>
                    {i > 0 && <button onClick={() => goStep(i - 1)} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", border: "1px solid var(--border,#e2e8f0)", cursor: "pointer", background: "transparent", padding: "6px 12px", borderRadius: 8 }}>{nav.prev}</button>}
                  </div>
                </>
              )}
              {done && <div style={{ marginTop: 4 }}><span style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", background: "rgba(22,163,74,0.1)", padding: "3px 9px", borderRadius: 7 }}>✓ {nav.doneBadge}</span></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
