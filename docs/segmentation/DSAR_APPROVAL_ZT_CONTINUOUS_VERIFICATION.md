# DSAR — Zero Trust & Continuous Authorization: 지속 검증 (APPROVAL_CONTINUOUS_VERIFICATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_CONTINUOUS_VERIFICATION은 SPEC §10(Continuous Verification)이 정의하는 **지속 검증 엔진**이다. 재인가 트리거(§9)가 발동될 때마다 다음 6요소를 검증한다: **MFA 유지·Token 유효성·Device 상태·Session 상태·Trust Score·Threat 여부**(SPEC §10). §9(Authorization)가 "언제 다시 계산하는가"라면, §10(Verification)은 "무엇을 확인하는가"이다. ADR §D-3은 agency 매요청 재검증을 이 엔진의 일반화 선례로 지정한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §10 검증요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Token 유효성 | **PRESENT** | `userByToken`(user_session JOIN·`expires_at>now AND is_active=1`·토큰 해시저장)(`UserAuth.php:249-286`·`:266-268`)·TTL 30일(`UserAuth.php:986`·`:606`·`:990`·`:609`·`:989`·`:4261`) |
| Session 상태 | **PARTIAL** | 유휴 자동로그아웃(`last_seen_at`·`auto_logout_min`·60s throttle)(`UserAuth.php:206-213`·`:288-311`·`:302-305`·`:308-310`)=서버측 지속 무효화(authn)·동시세션 목록/수동폐기(`UserAuth.php:4253-4298`·제한/차단 없음) |
| MFA 유지 | **PARTIAL(로그인 시점)** | 로그인 MFA·`mfaPolicy`·OTP 챌린지·`mfa_required` 401(`UserAuth.php:929-980`·`:941`·`:957`·`:973`·`:977`·`issueLoginOtp :972`·`:3997`)·TOTP(`:3566-3592`·`:955-964`·AES-256-GCM `:3863-3925`)·복구코드(`:3600-3634`·`:961`·`:975`)·테넌트정책(`:3745-3767`). **mid-session MFA 유지검증 ABSENT**(GT② §2) |
| Device 상태 | **ABSENT** | `recordSessionMeta` ua 255자 기록만·authz 미반영(`UserAuth.php:4232-4251`·`:4247`). 지문/managed/EDR/TPM/root/health 전무(GT② §2) |
| Trust Score | **ABSENT** | identity/device/session/network 종합 authz confidence 산출 없음. `trust`/`confidence` 히트는 전부 마케팅(GT② §2·§B-1) |
| Threat 여부 | **ABSENT** | SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 방어 프리미티브·IOC/threat feed 연계 아님(GT② §B-4) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **검증 6요소**(SPEC §10): `mfa_valid`·`token_valid`·`device_state`·`session_state`·`trust_score`·`threat_flag`. 요청별 게이트(`index.php:69-622`)가 각 검증을 실행·하나라도 실패 시 §11 Adaptive 결정(Challenge/Deny/Step-up).
- **세션 저장 신설**: AAL/MFA-passed 상태·Trust Score를 세션에 저장(현행 미저장·ADR §D-2)해 매 요청 재참조. Token 검증은 기존 `userByToken` 재활용(Extend).
- **제약**: agency 재검증 fail-closed(`index.php:96-122`) 패턴 준수 — Unknown≠Verified. Token 해시저장(`UserAuth.php:266-268`) 무결성 유지. break-glass(`UserAuth.php:793-798`·`:995-999`·`:998`)는 예외경로로 감사(`auth.breakglass`).
- **테넌트 격리**: MFA 정책 tenant 스코프(`UserAuth.php:3745-3767`·`:3754-3757`·`:3764-3766`)·`user_session`/`auth_audit_log` authz 전용(GT② §5).

## 4. KEEP_SEPARATE (마케팅 trust/risk/anomaly 흡수금지)

- **마케팅 trust/confidence**: `Mmm.php:749`·`:939`(베이지안 사후 신뢰도)·`AttributionEngine.php:246-261`(blended_trust/mkTrust/mmmTrust)·`DataPlatform.php:281`(데이터 신뢰도)·`Attribution.php:145-242`(cross-device confidence)는 SPEC §10 Trust Score **아님**(GT② §B-1).
- **device-sig 오인 금지**: `Attribution.php:144-150`(attribution_device_sig ip+ua 해시)=광고 cross-device 식별이지 Device 상태검증 아님(GT② §B-3).
- **환경(env)**: `Db.php:41-60`·`:53`(주석 "게이트에 envLabel 금지")=OTP dev_code/데모시드용·authz 검증요소 아님(GT① §C).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 6요소 중 Token=PRESENT·Session/MFA=PARTIAL(로그인 시점)·Device/Trust Score/Threat=ABSENT. mid-session 지속 검증은 순신규(GT① §3·GT② §5).
- **재활용**: `userByToken`(Token)·유휴 로그아웃(Session)·MFA/TOTP/복구코드(로그인 step-up)·agency 재검증(선례). Device는 recordSessionMeta 승격·MFA는 mid-session 확장(ADR §D-1·§D-2).
- **선행의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED. Extend-only·무후퇴(ADR §66).
