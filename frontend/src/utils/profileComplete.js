/* [238차] 회사정보(프로필) 완성도 판정 — 단일 소스(SSOT).
 *  백엔드 UserAuth.php `liveProfileMissing`(실운영 전환 게이트)와 동일한 필수 5필드 기준으로,
 *  온보딩 가이드/연동허브가 "API 키 발급·실운영에 필요한 회사정보가 완성됐는지"를 일관되게 판정한다.
 *  회원가입 폼은 주소(address)를 받지 않으므로 가입 직후에는 보통 미완성 → 채널 연동 전에 완성을 선행 안내.
 */
export const PROFILE_REQUIRED_FIELDS = ["company", "business_number", "ceo_name", "phone", "address"];

// AuthContext user → 정규화된 프로필 평면 객체(profile 우선, 없으면 user 직접 필드 폴백).
function flatProfile(user) {
  const p = (user && user.profile) || {};
  const pick = (k, ...alts) => {
    const cands = [p[k], user && user[k], ...alts.map((a) => user && user[a])];
    for (const c of cands) { if (c != null && String(c).trim()) return String(c).trim(); }
    return "";
  };
  return {
    company: pick("company"),
    business_number: pick("business_number", "businessNumber"),
    ceo_name: pick("ceo_name", "ceoName"),
    phone: pick("phone", "contact"),
    address: pick("address"),
  };
}

// 누락된 필수 필드 키 배열(없으면 빈 배열 = 완성).
export function profileMissing(user) {
  const fp = flatProfile(user);
  return PROFILE_REQUIRED_FIELDS.filter((f) => !fp[f]);
}

export function profileComplete(user) {
  return profileMissing(user).length === 0;
}
