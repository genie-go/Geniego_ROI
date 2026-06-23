import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n } from "../i18n";
import { PROFILE_REQUIRED_FIELDS } from "../utils/profileComplete.js";

/* [238차] 회사정보 완성 모달 — 범용 재사용(결제 흐름과 분리). 온보딩 선행조건/연동허브에서 호출.
 *  PATCH /auth/profile(AuthContext.updateProfile)로 영속 → user.profile 갱신 → 완성도 자동 재평가.
 *  ProfileGateModal(결제 게이트)과 목적이 다름(여기는 "API 키 발급 등 다음 작업의 선행조건 충족"). */
export default function CompanyProfileModal({ onClose, onSaved }) {
  const { user, updateProfile } = useAuth();
  const { t } = useI18n();
  const p0 = (user && user.profile) || {};
  const [company, setCompany] = useState(p0.company || user?.company || "");
  const [ceoName, setCeoName] = useState(p0.ceo_name || user?.ceo_name || "");
  const [bizNum, setBizNum] = useState(p0.business_number || user?.business_number || "");
  const [phone, setPhone] = useState(p0.phone || user?.phone || "");
  const [address, setAddress] = useState(p0.address || "");
  const [bizType, setBizType] = useState(p0.business_type || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const fieldVals = { company, business_number: bizNum, ceo_name: ceoName, phone, address };
  const missing = PROFILE_REQUIRED_FIELDS.filter((f) => !String(fieldVals[f] || "").trim());

  const save = async (e) => {
    e.preventDefault();
    setErr(null);
    if (missing.length) { setErr(t("companyInfo.allRequired", "필수 항목(회사명·사업자번호·대표자·연락처·주소)을 모두 입력하세요.")); return; }
    setBusy(true);
    try {
      const r = await updateProfile({
        name: user?.name || "", company: company.trim(), phone: phone.trim(),
        ceo_name: ceoName.trim(), business_number: bizNum.trim(),
        address: address.trim(), business_type: bizType.trim(),
      });
      if (!r || !r.ok) { setErr((r && r.error) || t("companyInfo.saveFail", "저장에 실패했습니다. 다시 시도해 주세요.")); setBusy(false); return; }
      setBusy(false);
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (e2) {
      setErr(t("companyInfo.saveFail", "저장에 실패했습니다. 다시 시도해 주세요."));
      setBusy(false);
    }
  };

  const lbl = { display: "block", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--text-1,#0f172a)", marginBottom: 4 };
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border,rgba(15,23,42,0.15))", fontSize: 13, boxSizing: "border-box", marginBottom: 10, background: "var(--card-bg,#fff)", color: "var(--text-1,#0f172a)" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2147483400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ width: "100%", maxWidth: 460, background: "var(--card-bg,#fff)", borderRadius: 16, padding: "26px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-1,#0f172a)", marginBottom: 6 }}>🏢 {t("companyInfo.title", "회사정보 완성")}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-3,#64748b)", lineHeight: 1.6, marginBottom: 16 }}>
          {t("companyInfo.desc", "API 키 발급신청·채널 연동·정산에 자동으로 사용됩니다. 한 번만 입력하면 이후 다시 입력할 필요가 없습니다.")}
        </div>
        <label style={lbl}>{t("companyInfo.company", "회사(브랜드)명")} *</label>
        <input style={inp} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("companyInfo.companyPh", "(주)회사명")} />
        <label style={lbl}>{t("companyInfo.ceo", "대표자명")} *</label>
        <input style={inp} value={ceoName} onChange={(e) => setCeoName(e.target.value)} placeholder={t("companyInfo.ceoPh", "성명")} />
        <label style={lbl}>{t("companyInfo.bizNum", "사업자등록번호")} *</label>
        <input style={inp} value={bizNum} onChange={(e) => setBizNum(e.target.value)} placeholder="000-00-00000" />
        <label style={lbl}>{t("companyInfo.phone", "연락처")} *</label>
        <input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-0000-0000" />
        <label style={lbl}>{t("companyInfo.address", "사업장 주소")} *</label>
        <input style={inp} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("companyInfo.addressPh", "도로명/지번 주소")} />
        <label style={lbl}>{t("companyInfo.bizType", "사업분야")}</label>
        <input style={inp} value={bizType} onChange={(e) => setBizType(e.target.value)} placeholder={t("companyInfo.bizTypePh", "예: 이커머스 / 리테일")} />
        {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626", fontSize: 12, marginBottom: 10, textAlign: "left" }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="button" onClick={onClose} disabled={busy} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid var(--border,rgba(15,23,42,0.15))", background: "transparent", color: "var(--text-3,#64748b)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t("companyInfo.cancel", "취소")}</button>
          <button type="submit" disabled={busy} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: busy ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer" }}>{busy ? t("companyInfo.saving", "저장 중…") : t("companyInfo.save", "저장하기")}</button>
        </div>
      </form>
    </div>
  );
}
