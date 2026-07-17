# ADR — DSAR Rebate Emergency Access, Break Glass, JIT & Time-Bound Privilege (EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-5)

- **일자**: 289차 (2026-07-17) · **비파괴 — 코드변경 0**
- **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **구조·Entity(22)·분류·규칙은 실측 + 5-1~5-4 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합** · **§요구 부재 → "완료 조건 판정 불가" · §53/§59 없음**. RP-001 정합.
- **상태**: Accepted (JIT·Time-Bound·Emergency·Break Glass 계약 명세 확정). 실 구현은 후속 승인 세션.
- **범위**: 시간 제한 권한·비상 접근만 — Runtime PDP=5-6 · Audit/Access Review=5-7 · Certification=5-8.
- **근거(실측·전부 file:line)**: [`../segmentation/CANONICAL_DSAR_AUTHORIZATION_JIT_TIME_BOUND_PRIVILEGE.md`](../segmentation/CANONICAL_DSAR_AUTHORIZATION_JIT_TIME_BOUND_PRIVILEGE.md) · [`EMERGENCY_BREAK_GLASS`](../segmentation/CANONICAL_DSAR_AUTHORIZATION_EMERGENCY_BREAK_GLASS.md) · **Impersonation 2h**(`$expires = gmdate(..., time() + 2 * 3600)`·UserAdmin.php:495 · `imp_` 토큰·:493 · `user_session` INSERT·:496-497 · 감사·:499 · 배너·:525) · **api_key `expires_at VARCHAR(32)`**(Db.php:953 · is_active · last_used_at · use_count) · **MFA OTP**(`mfa_otp_hash VARCHAR(80)` + **`mfa_otp_expires VARCHAR(32)`**·UserAuth.php:3418 · 만료 검증 `strtotime((string)($prev['mfa_otp_expires'] ?? '')) ?: 0`·:3895 · 재발급 UPDATE·:3908) · **★SCIM 즉시 deprovision**(**`if ($active === 0) $pdo->prepare("DELETE FROM user_session WHERE user_id=?")->execute([$id]); // 즉시 deprovision.`**·EnterpriseAuth.php:400/413) · **강제 세션 종료**(`DELETE FROM user_session WHERE user_id = ?`·UserAdmin.php:365) · `subscription_expires_at`(UserAuth.php:41/45) · free_coupons `valid_until`/`usable_from`(NULL=무기한·CouponRedeem.php:67-68) · **Kill Switch**(AutoCampaign.php:473/602-609·233차) · **273차 SMS OTP 접속키 복구**(UserAuth) · **★부재 확정(grep 0)**: `break_glass`/`breakGlass` · `emergency_access` · `just_in_time`/`jit_` · `incident` · Time-bound Role Assignment(5-2 확정) · 만료 세션 정리 Job.

## 결정 (핵심)

1. **★JIT 은 부재이나 Time-Bound 원재료는 풍부하다(정직)**: **Impersonation 2h**(JIT 의 실 원형) · **api_key `expires_at`** · **MFA OTP 해시+만료** · **SCIM 즉시 deprovision** · 강제 세션 종료 · subscription_expires_at · 쿠폰 valid_until — **셋 다 "발급 시점에 만료를 못 박는" 동일 패턴**. → **JIT 을 새로 만들 것이 아니라 Impersonation 패턴을 일반화**(Golden Rule=Extend).

2. **★Impersonation 이 이미 JIT 4요소 중 3개를 갖췄다**: **①시간 제한(2h·UserAdmin.php:495)** ②**감사**(:499) ③**고지**(배너·:525). **부족 = ④사유/승인**(require_reason·approval 부재·5-4 §4a). **JIT 4요소 = ①사유/티켓 ②승인 ③시간 제한 ④자동 회수 + 감사·고지**.

3. **★SCIM 즉시 deprovision 은 5-1 Critical Gap 의 실 해소 사례**: **`if ($active === 0) DELETE FROM user_session WHERE user_id=?; // 즉시 deprovision`**(EnterpriseAuth.php:400/413) = 5-1 §43 **"Revoked Role 로 기존 Session 접근 지속 = Critical"** 의 **실 패턴**. → **JIT 만료·Break Glass 종료에도 동일 적용**("권한 회수했는데 세션이 살아 있으면 회수가 아니다").

4. **★[관찰·미확정] Revocation 이 경로마다 다르다**: **SCIM 은 즉시 세션 삭제**(:400/413)하지만 **일반 Role 변경·plan 강등에는 세션 무효화가 보이지 않는다** → **5-1 §43 이 SCIM 외 경로에서는 여전히 열려 있을 수 있다**. **FP 규약상 PM 재증명 전 P0 단정 금지** — 실 확인 필요 = **권한 판정이 요청마다 DB 재조회하는지 vs 세션/토큰 캐시인지**(`authedTenant` 가 요청시점 해석이면 **무증상**·286차 맥락). **비파괴 미수정** → **5-6(Runtime PDP·캐시) 판정 대상**.

5. **[관찰] 만료 세션 정리 Job 부재**: `DELETE FROM user_session` 는 **deprovision/강제종료 경로만** · **주기 정리 cron 미발견** → 만료는 **조회 시점 검증**(OTP `strtotime` 패턴·UserAuth.php:3895)으로 처리되고 `user_session` 에 **만료 행 누적** 가능. **기능 결함 아님·위생 이슈** → 5-7/운영 cron 후보.

6. **Time-Bound Grant·Expiry Policy(§1·§2)**: **무기한 권한 부여 금지**(`valid_to` NULL 금지) · 대상별 **max_duration 상한** — 대행 **2h**(현행) · JIT sensitive **≤4h** · production **≤8h** · **Break Glass ≤1h**. **★단 free_coupons 의 `valid_until` NULL=무기한 규약과 혼동 금지**(쿠폰은 자산·권한은 아니다).

7. **JIT Elevation(§3)**: Request(사유 필수·티켓·risk_level·requested_duration ≤ max) → **5-3 Approval Workflow 재사용** + **5-4 Maker-Checker 적용**(요청자≠승인자·`exclude_requester`) + **risk 연동**(5-3 §7: risk↑ → required_approvals↑) → Elevation(auto_revoke_at·수행 Action 로그).

8. **Expiry Enforcement 4단(§4)**: ①발급 시점(max_duration 상한) ②**요청 시점**(`valid_to` 경과 = 즉시 차단·**현행 REAL**) ③**캐시 무효화**(5-1 §43 "Policy Cache 가 만료 권한 허용=Critical") ④**주기 회수 Job**(**현행 부재**). **Auto-Revocation(§5) = Grant REVOKED + 세션 종료 + 캐시 무효화 + 감사**(SCIM 패턴 재사용). **Extension(§6) 은 새 승인 필요**(자동 연장 금지·`extended_count` 상한·연장 남용 = Access Review 신호).

9. **★이 저장소에는 "권한을 여는 비상 경로"가 없다(정직·중요)**: 있는 것은 **닫는 경로**(Kill Switch·Emergency Disable(1-4 §23)·SCIM deprovision·강제 세션 종료)와 **인증 복구**(273차 접속키). **★이는 결함이 아니라 보수적 설계** — Break Glass 는 본질적으로 **위험을 여는 기능**이라 없으면 그 위험도 없다.

10. **★Break Glass 도입 여부 자체가 정책 결정(§6·자율 판단)**: **`enabled` 기본 false**. 도입 필요 조건 = ①정상 경로로 **복구 불가능한 장애**가 실재 ②**금전/고객 영향** 유발 ③**대안**(SCIM deprovision·강제 종료·Kill Switch·Emergency Disable·JIT)으로 **해결 불가**. **★대안이 있으면 만들지 마라** — 현행은 **닫는 경로가 이미 충실**하므로 **여는 경로의 필요성이 입증되기 전까지 `enabled=false` 유지**.

11. **Break Glass 설계(도입 시)**: **선실행 허용 + 사후 승인**(1-4 §23 Emergency Disable 패턴 계승: "긴급 차단은 신속 실행하되 사후 승인·Review Deadline·Audit 강제") · **≤1h** · **allowed_actions 화이트리스트**(기본 최소) · **사유 필수** · **전량 Action 로그**(로그 실패 시 Action 차단 — 로그 없는 비상 접근 = 사후 검증 불가) · **Post-Action Review 필수**(reviewer ≠ operator·5-4 Maker-Checker · UNJUSTIFIED = 보안 사고 · 미검토 시 operator 자격 정지) · **Break Glass 중 승인·집행 금지 권장**(5-4 SoD `IMPERSONATE × APPROVE/EXECUTE` 와 동일 규율).

12. **★방향 구별(§7·혼동 금지)**: **1-4 §23 Emergency Disable = Program 을 닫는 것** · **본 문서 Break Glass = 사람에게 권한을 여는 것** · **273차 접속키 복구 = 인증 복구**(권한 상승 아님 — **동명이의로 Break Glass REAL 표기 금지**·5-2/5-3 오탐 클래스 정합). **★Break Glass 중에도 Kill Switch 우선**(5-1 §45) — **비상 권한이 비상 차단을 무력화하면 안 된다**.

13. **정직·무후퇴**: **코드변경 0 = 회귀 0**. Impersonation(2h/토큰/감사/배너)·api_key expires_at·MFA OTP 만료·**SCIM 즉시 deprovision**·강제 세션 종료·Kill Switch·273차 접속키 복구·subscription_expires_at·free_coupons validity 보존. **스펙 §요구 부재로 완료 조건 판정 불가** · **실 코드·테이블·Lint·Guard 0건**.

## 무후퇴·영구 규칙
신규 JIT/Break Glass 도입 전: **기존 Impersonation 2h 패턴 일반화(JIT 신규 프레임워크 신설 금지) · api_key expires_at · MFA OTP 만료 · ★SCIM 즉시 deprovision · 강제 세션 종료 · Kill Switch 재사용** · **무기한 권한 부여 금지(valid_to 필수·max_duration 상한)** · **JIT 4요소(사유/티켓·승인·시간 제한·자동 회수)+감사·고지** · **JIT 승인은 5-3 재사용 + 5-4 Maker-Checker(요청자≠승인자)** · **자동 연장 금지(연장=새 승인·extended_count 상한)** · **★권한 회수 = Grant REVOKED + 세션 종료 + 캐시 무효화**("세션이 살아 있으면 회수가 아니다") · **★Break Glass 기본 OFF — 대안이 있으면 만들지 마라** · 도입 시 **≤1h · 사유 필수 · allowed_actions 화이트리스트 · 전량 로그(로그 실패=Action 차단) · 사후 검토 필수(reviewer≠operator·UNJUSTIFIED=보안 사고)** · **Break Glass 중 승인/집행 금지 · Kill Switch 우선** · **방향 혼동 금지**(Emergency Disable=닫기 · Break Glass=열기 · 접속키 복구=인증) · **1차 grep 결론 금지** · ADR/PM/Repeat Problem/Agent History 기록.

## 결과
JIT/Time-Bound Entity(12) + Emergency/Break Glass Entity(10) = **22** · **REAL 재사용/승격=★Impersonation 2h(JIT 실 원형·4요소 중 3개 보유)·api_key expires_at·★MFA OTP 해시+만료(단기 크레덴셜 정본)·★SCIM 즉시 deprovision(5-1 §43 Critical 의 실 해소 사례)·강제 세션 종료(UserAdmin.php:365)·Kill Switch(233차)·273차 접속키 복구(인증 복구·Break Glass 아님)·subscription_expires_at·free_coupons validity** · **NOT_APPLICABLE(부재→신설)=Break Glass(전 요소)·Emergency Access·EMERGENCY_OPERATOR·Incident Registry·JIT Request/Approval/Elevation·Time-bound Role Assignment·Auto-Revocation·Grant Extension·Post-Action Review·만료 정리 Job** · **MIGRATION_REQUIRED/관찰 2건(미확정·미수정)=①Revocation 경로 불일치(SCIM 만 즉시 세션 삭제·타 경로 미확인→5-6 판정) ②만료 세션 정리 Job 부재(위생)** · JIT 4요소/Expiry Enforcement(4단)/Trigger(8)/Guard(7+7)/Error(6+5)/Break Glass 도입 판단 기준(3조건) **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_AUTHORIZATION_{JIT_TIME_BOUND_PRIVILEGE,EMERGENCY_BREAK_GLASS}.md. **★스펙 미수령·자율 설계 명시 · JIT 부재이나 Impersonation 이 실 원형(3/4 보유) · SCIM 즉시 deprovision 이 Critical Gap 실 해소 사례 · Revocation 경로 불일치 관찰 · ★"이 저장소엔 권한을 여는 비상 경로가 없다 = 결함이 아니라 보수적 설계" · Break Glass 기본 OFF(대안 있으면 만들지 마라) · 방향 구별(닫기/열기/인증 복구) 정직표기**. 다음 **Part 4-5-3-1-5-6 — Runtime Authorization, API·UI Enforcement & Policy Decision Infrastructure**(입력=5-1 **중앙 PDP 부재·PEP 100+ 분산**(authedTenant 64·requirePro/requirePlan 56/호출부 351·requireMasterAdmin2 5·미들웨어 1) · **PlanPolicy↔planMenuPolicy.js 수동 동기화**(286차 드리프트 실현) · **275차 guard_headerless_getjson CI 가드 선례** · 본 블록 **Revocation 경로 불일치 관찰**).
