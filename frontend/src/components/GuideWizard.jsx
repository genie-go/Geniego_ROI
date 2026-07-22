import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import { GUIDE_CONTENT, GUIDE_NAV, GUIDE_MSG } from "../data/guideContent.js";

/**
 * [237차] 재사용 가이드 위저드 — 인앱(페이지 내 메뉴 박스) 순차 완료 위저드.
 *   ★전체 페이지를 덮지 않고 기존 사이드바·서브탭을 유지한 채 카드 안에서 순차 진행(UX 혼란 방지).
 *   ★완료 게이팅(시스템 검증): 각 단계에서 '✓ 완료 확인'을 누르면 시스템이 실제 완료 여부를 검증한다.
 *     - 필수등록 단계(checks[i]=async 함수): 실제 상태 검증(예 ≥1 채널·결제수단·상품). 미완 시 차단+메시지.
 *     - 안내 단계(checks[i] 없음): 시스템 자동 확인(현 위치/정보성 단계).
 *     검증 통과 시 '✓ 이 단계가 완료되었습니다' 메시지 → '다음 단계' 활성화. ★사용자 자기체크 아님.
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
    try { const v = JSON.parse(localStorage.getItem(storageKey) || "{}"); return { cur: typeof v.cur === "number" ? v.cur : 0, verified: v.verified || {} }; }
    catch { return { cur: 0, verified: {} }; }
  });
  const [warn, setWarn] = useState(false);   // 검증 실패(미완) 메시지
  const [busy, setBusy] = useState(false);
  const persist = useCallback((nx) => { try { localStorage.setItem(storageKey, JSON.stringify(nx)); } catch (e) { /* ignore */ } }, [storageKey]);

  // [238차] ★실제 계정 상태 기반 진행도 자동 산출(SSOT) — localStorage(cur)는 즉시 렌더용 캐시일 뿐.
  //   마운트 시 모든 필수 checks 를 실제 평가하여: ①이미 완료한 필수 단계는 ✓로 복원(재로그인/타기기/하위멤버
  //   에서도 동일) ②첫 미완료 필수 단계로 자동 위치 ③필수가 전부 완료면 자유 진행. → "어디까지 했는지 + 다음 할 일"
  //   을 실데이터로 안내. 안내(검증 없는)단계는 판정 보류(순서대로 자유 진행).
  const [derived, setDerived] = useState(null); // { firstIncomplete, allReqDone, completedCount, hasAnyCheck }
  const derivedRef = useRef("");
  useEffect(() => {
    const sig = `${guideKey}:${total}:${Array.isArray(checks) ? checks.length : 0}`;
    if (derivedRef.current === sig) return;
    derivedRef.current = sig;
    if (!Array.isArray(checks) || !checks.length || !total) return;
    let alive = true;
    (async () => {
      let firstIncomplete = -1, completedCount = 0, hasAnyCheck = false;
      for (let i = 0; i < total; i++) {
        const fn = checks[i];
        if (typeof fn !== "function") continue; // 안내 단계: 판정 보류
        hasAnyCheck = true;
        let ok = false; try { ok = await fn(); } catch (e) { ok = false; }
        if (ok) completedCount++;
        else if (firstIncomplete < 0) firstIncomplete = i;
      }
      if (!alive) return;
      const allReqDone = hasAnyCheck && firstIncomplete < 0;
      setDerived({ firstIncomplete, allReqDone, completedCount, hasAnyCheck });
      // 상태 병합: 첫 미완료 필수 이전 단계는 verified(✓), cur 를 첫 미완료 필수로 정렬(실제가 SSOT).
      setState((s) => {
        const upto = firstIncomplete < 0 ? total : firstIncomplete;
        const v = { ...s.verified };
        for (let i = 0; i < upto; i++) v[i] = true;
        const nx = { cur: upto, verified: v };
        persist(nx);
        return nx;
      });
    })();
    return () => { alive = false; };
  }, [guideKey, total, checks, persist]);

  const cur = Math.max(0, Math.min(total, state.cur));
  const verifiedCur = !!state.verified[cur];

  // 시스템 완료 검증 — checks[cur] 있으면 실제 상태 확인, 없으면 자동 확인(정보성 단계).
  const verify = useCallback(async () => {
    setBusy(true); setWarn(false);
    try {
      const fn = checks && checks[cur];
      const ok = typeof fn === "function" ? await fn() : true;
      if (ok) { setState((s) => { const v = { ...s.verified, [s.cur]: true }; const nx = { ...s, verified: v }; persist(nx); return nx; }); }
      else setWarn(true);
    } catch (e) { setWarn(true); }
    finally { setBusy(false); }
  }, [checks, cur, persist]);

  const advance = useCallback(() => {
    setWarn(false);
    setState((s) => { const nx = { ...s, cur: Math.min(total, s.cur + 1) }; persist(nx); return nx; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [total, persist]);

  const goStep = useCallback((i) => { setWarn(false); setState((s) => { const nx = { ...s, cur: Math.max(0, Math.min(total, i)) }; persist(nx); return nx; }); }, [total, persist]);

  if (!d) return null;
  const isRtl = lang === "ar";
  const pct = Math.round((cur / total) * 100);
  const grad = `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`;
  const allDone = cur >= total;

  const btnSolid = (bg, on) => ({ fontSize: 12.5, fontWeight: 700, color: "#fff", border: "none", cursor: on ? "pointer" : "not-allowed", background: on ? bg : "#94a3b8", padding: "7px 16px", borderRadius: 8, opacity: on ? 1 : 0.7 });

  return (
    <div dir={isRtl ? "rtl" : "ltr"} style={{ maxWidth: 820 }}>
      {/* [237차] 다음 진행 버튼 강조 — 펄스/글로우로 '지금 할 일'을 뚜렷이 구분. */}
      <style>{`
        @keyframes gwPulse{0%,100%{transform:scale(1);box-shadow:0 4px 14px rgba(22,163,74,0.4)}50%{transform:scale(1.05);box-shadow:0 8px 24px rgba(22,163,74,0.6)}}
        @keyframes gwPulseAccent{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)}100%{box-shadow:0 0 0 10px rgba(99,102,241,0)}}
        @keyframes gwArrow{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
        .gw-cta{animation:gwPulse 1.4s ease-in-out infinite}
        .gw-go{animation:gwPulseAccent 1.6s ease-out infinite}
        .gw-arr{display:inline-block;animation:gwArrow 1s ease-in-out infinite}
      `}</style>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-1)" }}>{d.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 3 }}>{d.lead}</div>
      </div>
      <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: "#15803d", marginBottom: 14 }}>{d.safe}</div>

      <div style={{ background: "var(--card-bg, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, padding: "11px 15px", marginBottom: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-3)", marginBottom: 7 }}>
          <span>{nav.step} {Math.min(cur + 1, total)} {nav.of} {total}</span><span>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: "var(--border, #e2e8f0)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, background: grad, width: pct + "%", transition: "width .4s" }} />
        </div>
      </div>

      {/* [238차] 실데이터 기반 '이어서 진행' 요약 — 재로그인/타기기에서도 이미 완료한 필수 단계 수 + 다음 할 일을 안내. */}
      {derived && !allDone && derived.completedCount > 0 && d.steps[cur] && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.06))", border: `1px solid ${accent[0]}44`, borderRadius: 12, padding: "10px 14px", fontSize: 12.5, marginBottom: 13 }}>
          <span style={{ fontWeight: 900, color: "#16a34a", background: "rgba(22,163,74,0.12)", padding: "3px 10px", borderRadius: 99 }}>✓ {derived.completedCount} {nav.doneBadge}</span>
          <span style={{ color: "var(--text-3)", fontWeight: 700 }}>→</span>
          <span style={{ fontWeight: 800, color: accent[0] }}>{nav.step} {cur + 1}: {d.steps[cur][0]}</span>
        </div>
      )}

      {allDone && (
        <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.1),rgba(79,70,229,0.08))", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 14, padding: "18px 20px", fontSize: 14.5, fontWeight: 700, color: "#15803d", marginBottom: 14 }}>
          {d.all}
          <div style={{ marginTop: 11, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => navigate(d.doneRoute || links[0] || "/")} style={{ fontSize: 13, fontWeight: 800, color: "#fff", border: "none", cursor: "pointer", background: grad, padding: "9px 20px", borderRadius: 9, boxShadow: `0 4px 14px ${accent[0]}55` }}>{nav.execute}</button>
            <button onClick={() => { setState((s) => { const nx = { cur: 0, verified: {} }; persist(nx); return nx; }); }} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", border: "1px solid var(--border,#e2e8f0)", cursor: "pointer", background: "transparent", padding: "8px 14px", borderRadius: 9 }}>{nav.reset}</button>
          </div>
        </div>
      )}

      {d.steps.map((s, i) => {
        const done = i < cur, active = i === cur;
        const stepHasCheck = typeof (checks && checks[i]) === "function";
        return (
          <div key={i} style={{ display: "flex", gap: 14, background: "var(--card-bg,#fff)", border: `1px solid ${active ? accent[0] : "var(--border,#e2e8f0)"}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12, opacity: done ? 0.62 : (active ? 1 : 0.42), boxShadow: active ? `0 6px 22px ${accent[0]}22` : "none" }}>
            <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: done ? "#16a34a" : grad, color: "#fff", fontWeight: 900, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{done ? "✓" : i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-1)", marginBottom: active ? 5 : 0 }}>
                {s[0]}{stepHasCheck && active && <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "rgba(220,38,38,0.1)", padding: "2px 7px", borderRadius: 6, marginLeft: 8, verticalAlign: "middle" }}>● 필수 / required</span>}
              </div>
              {active && <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>{s[1]}</div>}
              {active && (
                <>
                  {s[2] && <div style={{ marginBottom: 10 }}><span style={{ fontSize: 12, fontWeight: 700, color: accent[0], background: `${accent[0]}14`, padding: "4px 10px", borderRadius: 7 }}>📍 {s[2]}</span>{" "}
                    {links[i] && <button className="gw-go" onClick={() => {
                      try {
                        // 현재 단계부터 실행까지 연속 안내 큐 구성(각 페이지에서 '다음 단계 →'로 체인 이동).
                        const q = [];
                        const ctas = (guide && guide.ctas) || [];
                        for (let k = i; k < d.steps.length; k++) {
                          if (!links[k]) continue;
                          q.push({ route: links[k], cta: ctas[k] || null, hint: (d.steps[k][0] ? d.steps[k][0] + " — " : "") + (d.steps[k][1] || ""), nextLabel: nav.done, execLabel: nav.execute, multi: /\/(integration-hub|catalog-sync|crm)\b/.test(links[k]) });
                        }
                        if (d.doneRoute && (!q.length || q[q.length - 1].route !== d.doneRoute)) q.push({ route: d.doneRoute, hint: d.all || nav.execute, execLabel: nav.execute });
                        sessionStorage.setItem("genie_onboard_queue", JSON.stringify(q));
                        sessionStorage.setItem("genie_onboard_focus", "1");
                      } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
                      navigate(links[i]);
                    }} style={{ fontSize: 13, fontWeight: 900, color: "#fff", border: "none", cursor: "pointer", background: grad, padding: "8px 18px", borderRadius: 9, boxShadow: `0 3px 10px ${accent[0]}55`, verticalAlign: "middle" }}>👉 {nav.go}</button>}
                  </div>}
                  {/* 시스템 완료 검증 결과 메시지 */}
                  {verifiedCur && <div style={{ fontSize: 12.5, fontWeight: 700, color: "#15803d", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{msg.verified}</div>}
                  {warn && !verifiedCur && <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 10 }}>⚠ {msg.checkRequired}</div>}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {!verifiedCur
                      ? <button onClick={verify} disabled={busy} style={{ ...btnSolid(accent[0], !busy), fontSize: 13, padding: "9px 20px" }}>{busy ? msg.checking : msg.verify}</button>
                      : <button className="gw-cta" onClick={advance} style={{ ...btnSolid("#16a34a", true), fontSize: 13.5, padding: "10px 22px" }}>{nav.done} <span className="gw-arr">→</span></button>}
                    {i > 0 && <button onClick={() => goStep(i - 1)} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", border: "1px solid var(--border,#e2e8f0)", cursor: "pointer", background: "transparent", padding: "6px 12px", borderRadius: 8 }}>{nav.prev}</button>}
                  </div>
                </>
              )}
              {done && <div style={{ marginTop: 4 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", background: "rgba(22,163,74,0.1)", padding: "3px 9px", borderRadius: 7 }}>✓ {nav.doneBadge}</span></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
