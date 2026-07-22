// [272차] 클라이언트(테넌트 소유자) 대행사 접근 승인 게이트.
//   내 계정에 대한 대행사의 접근 요청을 열람하고 승인/거부/철회한다. 승인 시 권한 범위(읽기전용/쓰기허용)를
//   내가 지정한다. 언제든 즉시 철회 가능(서버 fail-closed 재검증으로 다음 요청부터 즉시 차단).
import React, { useCallback, useEffect, useState } from "react";
// [현 차수] 헤더리스 getJson → getJsonAuth. AgencyPortal::myAgencyRequests 는 authedTenant null 시 401
//   → 요청목록이 영원히 [] ("요청 없음" 오표시)이라 대행사 승인 게이트가 무동작이었다.
import { getJsonAuth as getJson, postJson } from "../services/apiClient.js";
// [282차 J-P1] 전 회원(free 티어) 도달 페이지인데 100% 한글 리터럴이라 비한국어 사용자에게 한글 노출이었다.
//   t('key','한글fb') 로 감싸면 deploy inline autofill(deploy.ps1:27)이 15개국 자동 번역(오버레이).
import { useI18n } from "../i18n";

export default function AgencyAccess() {
  const { t } = useI18n();
  const STATUS = {
    approved: { bg: "#dcfce7", fg: "#166534", label: t("agencyAccess.stApproved", "승인됨(접근 허용 중)") },
    pending: { bg: "#fef9c3", fg: "#854d0e", label: t("agencyAccess.stPending", "승인 대기") },
    revoked: { bg: "#fee2e2", fg: "#991b1b", label: t("agencyAccess.stRevoked", "철회됨(접근 차단)") },
  };
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr("");
    try {
      const d = await getJson("/api/v423/agency-access/requests");
      setRows(Array.isArray(d.requests) ? d.requests : []);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (id, write) => {
    setErr(""); setMsg("");
    try { await postJson(`/api/v423/agency-access/${id}/approve`, { write: !!write }); setMsg(write ? t("agencyAccess.msgApprovedWrite", "쓰기 허용으로 승인했습니다.") : t("agencyAccess.msgApprovedRead", "읽기 전용으로 승인했습니다.")); await load(); }
    catch (e) { setErr(String(e.message || e)); }
  };
  const revoke = async (id) => {
    setErr(""); setMsg("");
    if (!window.confirm(t("agencyAccess.confirmRevoke", "이 대행사의 접근을 즉시 철회하시겠습니까? 철회 즉시 접근이 차단됩니다."))) return;
    try { await postJson(`/api/v423/agency-access/${id}/revoke`, {}); setMsg(t("agencyAccess.msgRevoked", "접근을 철회했습니다.")); await load(); }
    catch (e) { setErr(String(e.message || e)); }
  };

  return (
    <div style={{ maxWidth: 820, margin: "20px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1,#0f172a)" }}>🏢 {t("agencyAccess.title", "대행사 접근 관리")}</div>
        <div style={{ fontSize: 13, color: "var(--text-3,#64748b)", marginTop: 4 }}>
          {t("agencyAccess.subtitle", "내 계정 데이터에 대한 대행사(마케팅/광고 대행)의 접근을 직접 승인·철회합니다. 승인 전에는 어떤 대행사도 접근할 수 없으며, 데이터는 내 계정 경계를 벗어나지 않습니다.")}
        </div>
      </div>

      {err && <div style={{ background: "#fef2f2", color: "#991b1b", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{err}</div>}
      {msg && <div style={{ background: "#eff6ff", color: "#1e40af", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{msg}</div>}

      {loading ? (
        <div style={{ color: "#94a3b8", padding: 20 }}>{t("agencyAccess.loading", "불러오는 중…")}</div>
      ) : rows.length === 0 ? (
        <div style={{ background: "var(--surface,#fff)", border: "1px solid var(--border,#e5e7eb)", borderRadius: 14, padding: 28, textAlign: "center", color: "#94a3b8" }}>
          {t("agencyAccess.empty", "현재 대행사 접근 요청이 없습니다.")}
        </div>
      ) : (
        rows.map((r) => {
          const s = STATUS[r.status] || STATUS.pending;
          return (
            <div key={r.id} style={{ background: "var(--surface,#fff)", border: "1px solid var(--border,#e5e7eb)", borderRadius: 14, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-1,#0f172a)", fontSize: 14 }}>{r.agency_name || r.agency_login}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {r.agency_login} · {t("agencyAccess.reqScope", "요청 권한")}: {r.scope?.write ? t("agencyAccess.scopeRW", "읽기+쓰기") : t("agencyAccess.scopeRO", "읽기 전용")}
                    {r.approved_at ? ` · ${t("agencyAccess.approvedAt", "승인")} ${String(r.approved_at).slice(0, 10)}` : ""}
                  </div>
                </div>
                <span style={{ background: s.bg, color: s.fg, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{s.label}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {r.status !== "approved" && (
                  <>
                    <button onClick={() => approve(r.id, false)} style={btn("#4f8ef7")}>{t("agencyAccess.btnApproveRead", "읽기 전용 승인")}</button>
                    <button onClick={() => approve(r.id, true)} style={btn("#059669")}>{t("agencyAccess.btnApproveWrite", "쓰기까지 허용 승인")}</button>
                  </>
                )}
                {r.status === "approved" && (
                  <>
                    <button onClick={() => approve(r.id, !r.scope?.write)} style={btn("#64748b")}>{r.scope?.write ? t("agencyAccess.btnToRead", "읽기 전용으로 변경") : t("agencyAccess.btnToWrite", "쓰기 허용으로 변경")}</button>
                    <button onClick={() => revoke(r.id)} style={btn("#dc2626")}>{t("agencyAccess.btnRevoke", "즉시 철회")}</button>
                  </>
                )}
                {r.status === "revoked" && <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>{t("agencyAccess.reReqHint", "대행사가 재요청하면 다시 승인할 수 있습니다.")}</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const btn = (bg) => ({ padding: "8px 14px", borderRadius: 9, border: "none", background: bg, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" });
