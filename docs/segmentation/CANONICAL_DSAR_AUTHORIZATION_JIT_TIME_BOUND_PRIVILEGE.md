# CANONICAL DSAR — JIT & Time-Bound Privilege (Time-Bound Grant·JIT Elevation·Expiry Enforcement·Revocation·Session Termination)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-5 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **구조·Entity·분류는 실측 + 5-1~5-4 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합** · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**(RP-001 정합).
> 정본 쌍: 본 문서(JIT/Time-Bound) + [`CANONICAL_DSAR_AUTHORIZATION_EMERGENCY_BREAK_GLASS.md`](CANONICAL_DSAR_AUTHORIZATION_EMERGENCY_BREAK_GLASS.md)(Emergency/Break Glass).
> ADR: [`../architecture/ADR_DSAR_REBATE_EMERGENCY_BREAK_GLASS_JIT.md`](../architecture/ADR_DSAR_REBATE_EMERGENCY_BREAK_GLASS_JIT.md).
> 선행: **5-4 Impersonation 2h 만료 패턴**(JIT 인접) · **5-2 Time-bound Assignment Hook** · 5-1(sensitive/production Role) · 1-4(Emergency Disable).
> **범위**: 시간 제한 권한만 — Runtime PDP=5-6 · Audit/Access Review=5-7 · Certification=5-8.

---

## 0. 실측 요약 — ★JIT 은 부재이나 Time-Bound 원재료는 풍부하다

| 스펙 요구 | 현행 실측(코드 근거) | 분류 |
|---|---|---|
| **JIT(Just-in-Time) 권한 상승** | ❌ **부재(grep 0)** — `just_in_time`/`jit_` 전무 | **NOT_APPLICABLE → 신설** |
| **★Impersonation 2시간 만료** | ✅ **REAL** — `$expires = gmdate(..., time() + 2 * 3600)`([UserAdmin.php:495](../../backend/src/Handlers/UserAdmin.php)) · `imp_` 토큰(:493) · `user_session(user_id,token,expires_at,created_at)` INSERT(:496-497) | **VALIDATED_LEGACY → ★JIT 의 실 원형(재사용)** |
| **api_key 만료** | ✅ **REAL** — `expires_at VARCHAR(32)`([Db.php:953](../../backend/src/Db.php)) · `is_active TINYINT(1) DEFAULT 1` · `last_used_at` · `use_count` | **재사용(Time-bound Grant 정본)** |
| **★MFA OTP 만료(해시+시간)** | ✅ **REAL** — `mfa_otp_hash VARCHAR(80)` + **`mfa_otp_expires VARCHAR(32)`**([UserAuth.php:3418](../../backend/src/Handlers/UserAuth.php)) · 만료 검증 `strtotime($prev['mfa_otp_expires']) ?: 0`(:3895) · 재발급 UPDATE(:3908) | **재사용(단기 크레덴셜 정본·Step-up 수단)** |
| **★즉시 Revocation(SCIM deprovision)** | ✅ **REAL** — **`if ($active === 0) $pdo->prepare("DELETE FROM user_session WHERE user_id=?")->execute([$id]); // 즉시 deprovision.`**([EnterpriseAuth.php:400](../../backend/src/Handlers/EnterpriseAuth.php)/413) | **★VALIDATED_LEGACY — 5-1 §43 "Revoked Role 로 Session 접근 지속=Critical" 의 실 해소 사례(재사용)** |
| **강제 세션 종료** | ✅ **REAL** — `DELETE FROM user_session WHERE user_id = ?`([UserAdmin.php:365](../../backend/src/Handlers/UserAdmin.php)) | **재사용(Termination 경로)** |
| **접속키 복구(273차)** | ✅ **REAL** — SMS OTP 기반 최고관리자 접속키 복구(UserAuth) | **참조(비상 복구 인접·짝 문서)** |
| **구독 만료(plan)** | ✅ **REAL** — `subscription_expires_at`(UserAuth.php:41/45) · PlanPolicy::RANK 게이트 | **참조(권한 축 만료)** |
| **쿠폰 유효기간** | ✅ **REAL** — free_coupons `valid_until`/`usable_from`(NULL=무기한·CouponRedeem.php:67-68) | **참조(Validity 규약)** |
| **Time-bound Role Assignment** | ❌ **부재** — Role 부여에 `valid_to` 없음(5-2 확정: Assignment 이력/승인/만료 전무) | **NOT_APPLICABLE → 신설** |
| **만료 세션 정리 Job** | ❌ **부재로 보임** — `DELETE FROM user_session` 는 **deprovision/강제종료 경로만**(EnterpriseAuth·UserAdmin) · **주기 정리 cron 미발견** | **NOT_APPLICABLE → §5 신설**(만료 검증은 조회 시점 수행) |
| **JIT 요청·승인·자동 회수** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **JIT 자체는 부재**지만 **Time-Bound 원재료가 풍부**하다 — **Impersonation 2h 만료(JIT 의 실 원형)** · api_key `expires_at` · **MFA OTP 해시+만료** · **SCIM 즉시 deprovision** · 강제 세션 종료 · subscription_expires_at · 쿠폰 valid_until. **★특히 SCIM `즉시 deprovision`(EnterpriseAuth.php:400)은 5-1 이 Critical Gap 으로 지목한 "Revoked Role ↔ Active Session" 의 실 해소 사례**다. **부재 = JIT 요청/승인/자동 회수 · Time-bound Role Assignment · 만료 정리 Job**.

### ★인접 관찰 (코드변경 0·근거 기록만)
- **[관찰] Impersonation 이 이미 JIT 의 4요소 중 3개를 갖췄다** — **①시간 제한(2h)** ②**감사**(:499) ③**고지**(배너·:525). **부족한 것은 ④사유/승인**(require_reason·approval 부재·5-4 §4a). 즉 **JIT 을 새로 만들 것이 아니라 Impersonation 패턴을 일반화**하는 것이 정합(Golden Rule=Extend).
- **[관찰·미확정] Revocation 이 경로마다 다르다** — **SCIM(EnterpriseAuth)은 즉시 세션 삭제**(:400/413)하지만, **일반 Role 변경·plan 강등에는 세션 무효화가 보이지 않는다**(`team_role` 변경 시 기존 세션 유지 추정). → **5-1 §43 "Revoked Role 로 접근 지속" 이 SCIM 외 경로에서는 여전히 열려 있을 수 있다**. **FP 규약상 PM 재증명 전 P0 단정 금지**(실 확인 필요=권한 판정이 요청마다 DB 재조회하는지 vs 세션/토큰에 캐시하는지 — **`authedTenant` 가 요청시점 해석이면 무증상**일 수 있음·286차 맥락). **비파괴 미수정** → **5-6(Runtime PDP·캐시) 판정 대상**.
- **[관찰] 만료 세션 정리 Job 부재** — 만료는 **조회 시점 검증**으로 처리되는 것으로 보이며, `user_session` 에 **만료 행이 누적**될 수 있다(기능 결함 아님·위생 이슈). 5-7(Access Review) 또는 운영 cron 후보.

---

## 1. Canonical Entity (12) — 자율 설계

TIME_BOUND_GRANT · JIT_REQUEST · JIT_APPROVAL_REFERENCE · JIT_ELEVATION · EXPIRY_POLICY · EXPIRY_ENFORCEMENT_POINT · AUTO_REVOCATION · REVOCATION_EVENT · SESSION_TERMINATION · GRANT_EXTENSION · JIT_RECONCILIATION · JIT_AUDIT_EVENT.

## 2. Time-Bound Grant (§1) · Expiry Policy (§2)

- **Grant(§1)**: time_bound_grant_id · subject · **granted_role / permission · scope · reason · ticket_reference · approval_reference · granted_by · granted_at · valid_from · valid_to · max_duration · auto_revoke_at · extended_count · revoked_at · revocation_reason** · evidence.
- **★현행 정본 재사용**: **Impersonation 2h**(UserAdmin.php:495) · **api_key `expires_at`**(Db.php:953) · **MFA OTP `mfa_otp_expires`**(UserAuth.php:3418) — **셋 다 "발급 시점에 만료를 못 박는" 동일 패턴**.
- **Expiry Policy(§2)**: 대상별 **max_duration** 상한 — 예: 대행 **2h**(현행) · JIT sensitive Role **≤4h** · production Role **≤8h** · Break Glass **≤1h**(짝 문서). **★무기한 부여 금지**(`valid_to` NULL 금지 — **단 free_coupons 의 `valid_until` NULL=무기한 규약과 혼동 금지**: 쿠폰은 자산·권한은 아니다).

## 3. JIT Elevation (§3) — Impersonation 패턴 일반화

- **JIT Request(§3a)**: jit_request_id · requester · **requested_role/permission · target_scope · reason(필수) · ticket_reference · requested_duration(≤ max_duration) · risk_level**(5-3) · requested_at · **expires_if_unapproved** · status · evidence.
- **JIT Approval(§3b)**: **5-3 Approval Workflow 재사용**(중복 승인 금지) · **Maker-Checker 적용**(5-4: 요청자≠승인자·`exclude_requester`) · risk 연동(5-3 §7: risk↑ → required_approvals↑).
- **JIT Elevation(§3c)**: elevation_id · grant · **activated_at · auto_revoke_at · 수행 Action 목록 · terminated_at** · evidence. **★현행 원형**: Impersonation = **시간 제한 + 감사 + 고지**를 이미 갖춘 **JIT 의 실 사례** → **일반화**(사유·승인만 추가).
- **★JIT 4요소**: **①사유/티켓 ②승인 ③시간 제한 ④자동 회수 + 감사·고지**. 현행 Impersonation 은 **③+감사+고지 REAL · ①②④ 부재**.

## 4. Expiry Enforcement (§4) · Auto-Revocation (§5)

- **Enforcement Point(§4, 4)**: **①발급 시점**(max_duration 상한 검증) **②요청 시점**(`valid_to` 경과 = 즉시 차단·5-1 §45 `ROLE_ASSIGNMENT_EXPIRED`) **③캐시 무효화**(5-1 §43 "Policy Cache 가 만료 권한 허용=Critical") **④주기 회수 Job**.
- **★현행 실측**: ②는 **REAL**(조회 시점 만료 검증·OTP `strtotime($prev['mfa_otp_expires'])`·UserAuth.php:3895) · **④는 부재**(만료 정리 cron 미발견·§0 관찰).
- **Auto-Revocation(§5)**: auto_revoke_at 도달 시 **①Grant 상태 REVOKED ②관련 세션 종료 ③캐시 무효화 ④감사**. **★현행 정본 재사용**: **SCIM 즉시 deprovision**(`if ($active === 0) DELETE FROM user_session WHERE user_id=?`·EnterpriseAuth.php:400/413) = **"권한 상실 → 세션 즉시 삭제"의 실 패턴** → **JIT 만료에도 동일 적용**.
- **Grant Extension(§6)**: 연장은 **새 승인 필요**(자동 연장 금지) · `extended_count` 상한 · **연장 남용 = Access Review 신호**(5-7).

## 5. Session Termination (§7) · Revocation Event (§8)

- **Termination(§7)**: **현행 REAL 2경로** — SCIM deprovision(EnterpriseAuth.php:400/413) · 관리자 강제 종료(`DELETE FROM user_session WHERE user_id = ?`·UserAdmin.php:365). **신설**: JIT 만료 종료 · Break Glass 종료(짝 문서) · **대행 강제 종료**(5-4 부재) · 사고 시 일괄 종료.
- **Revocation Event(§8)**: revocation_event_id · subject · **revoked_grants · trigger**(EXPIRY / MANUAL / SCIM_DEPROVISION / INCIDENT / SOD_VIOLATION / RISK) · **세션 종료 결과 · 캐시 무효화 결과** · revoked_at · evidence. **★"권한 회수했는데 세션이 살아 있으면 회수가 아니다"** — 5-1 §43 Critical 정합.

## 6. Reconciliation (§9) · Guard/Error (§10)

- **Reconciliation(§9, 6)**: **Grant `valid_to` ↔ 실 접근**(만료 후 접근 = Critical) · **Revocation ↔ Active Session**(★SCIM 은 REAL·타 경로는 §0 관찰) · JIT Elevation ↔ 수행 Action(범위 초과 탐지) · auto_revoke_at ↔ 실 회수 시각 · 연장 이력 ↔ 승인 · **만료 Grant ↔ Policy Cache**(5-1 §43).
- **Guard(§10a, 7)**: GRANT_EXPIRED · GRANT_NOT_YET_VALID · **MAX_DURATION_EXCEEDED** · JIT_WITHOUT_REASON · JIT_WITHOUT_APPROVAL · **AUTO_EXTENSION_BLOCKED** · **REVOKED_BUT_SESSION_ACTIVE**.
- **Error(§10b, 6)**: `AUTHORIZATION_GRANT_EXPIRED` · `AUTHORIZATION_GRANT_MAX_DURATION_EXCEEDED` · `AUTHORIZATION_JIT_REASON_REQUIRED` · `AUTHORIZATION_JIT_APPROVAL_REQUIRED` · `AUTHORIZATION_JIT_EXTENSION_BLOCKED` · `AUTHORIZATION_REVOCATION_INCOMPLETE`.

## 7. Time-Bound Matrix — 현행

| 대상 | 만료 | 발급 시 상한 | 만료 검증 | 회수 시 세션 종료 | 사유/승인 | 감사 | 근거 |
|---|---|---|---|---|---|---|---|
| **Impersonation** | ✅ **2시간** | ✅ 고정 2h | ✅ | — | **❌ 부재** | ✅ | UserAdmin.php:493-499 |
| **api_key** | ✅ **expires_at** | ❌ 상한 없음 | ✅ | — | ❌ | last_used_at/use_count | Db.php:953 |
| **MFA OTP** | ✅ **mfa_otp_expires** | ✅ | ✅ **strtotime 검증** | — | — | — | UserAuth.php:3418/3895 |
| **SCIM deprovision** | — | — | — | ✅ **★즉시 세션 삭제** | — | ✅ | **EnterpriseAuth.php:400/413** |
| **관리자 강제 종료** | — | — | — | ✅ 세션 삭제 | ❌ | — | UserAdmin.php:365 |
| **Role Assignment** | **❌ 부재** | ❌ | ❌ | **❌**(§0 관찰) | ❌ | ❌ | 5-2 확정 |
| **JIT Elevation** | — | — | — | — | — | — | **부재 → 신설** |
