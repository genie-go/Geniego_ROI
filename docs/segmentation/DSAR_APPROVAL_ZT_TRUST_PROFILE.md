# DSAR — Zero Trust & Continuous Authorization: 신뢰 프로파일 (APPROVAL_TRUST_PROFILE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_TRUST_PROFILE`(SPEC §2)은 Identity Trust Engine(SPEC §3)의 **출력 프로파일**이다. SPEC §3의 평가 요소(Identity Verification·Employment Status·Role Criticality·Historical Behavior·Previous Incidents·Privilege Level·Authentication Strength)를 종합해 신뢰 등급 4종을 산출한다:

- **Trusted**
- **Conditional**
- **Restricted**
- **Untrusted**

이 프로파일은 SPEC §11 Adaptive Authorization(Permit/Deny/Challenge/Read Only/Step-up/Re-auth/Session Termination)의 입력이 되며, "한 번 승인되면 끝"이 아니라 컨텍스트 변화에 따라 등급이 재계산된다(SPEC §0 Continuous Authorization).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §3 요소 | 판정 | 근거(GT) |
|---|---|---|
| Trust Profile(Trusted/Conditional/Restricted/Untrusted) | **ABSENT(grep 0)** | GT② §2 "trust profile/engine 전용 구조 전무. 신뢰=암묵(로그인 통과=신뢰)" |
| Identity Verification | **PARTIAL** | `userByToken`(`UserAuth.php:249-286`·`:266-268`) 매요청 토큰·세션·활성 재검증(신원 확인의 authn 신선도, 등급화 없음) |
| Authentication Strength | **PARTIAL** | TOTP/OTP/복구코드(`UserAuth.php:929-980`·`:3566-3592`·`:3600-3634`)=강도 신호원이나 프로파일 등급 미산출(GT① §B) |
| Role Criticality / Privilege Level | **PARTIAL** | RBAC rank/scope(`index.php:573-597`·`:608-619`)·team_role(`UserAuth.php:1134-1167`)=정적 권한 수준(신뢰 등급 아님) |
| Historical Behavior / Previous Incidents | **ABSENT** | 로그인/API 패턴이 인가에 피드 안 됨(GT② §2 Behavior UEBA ABSENT) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **출력 등급(불변 enum)**: `Trusted | Conditional | Restricted | Untrusted`(SPEC §3). 등급은 순서형(ordinal)이며 Adaptive Authorization(SPEC §11) 결정과 매핑.
- **입력 필드**: SPEC §3 7요소. 재활용 — Authentication Strength는 TOTP(`UserAuth.php:3566-3592`·RFC6238·AES-256-GCM)·복구코드(`:3600-3634`)에서, Identity Verification은 `userByToken`(`:249-286`)에서 승격(ADR D-2).
- **불변 스냅샷·버전**: SPEC §33 `Immutable Trust Snapshot`·`Trust Version` — 프로파일 산출 시점 스냅샷 불변. `SecurityAudit.php:12-68` 해시체인 재활용(ADR D-5).
- **테넌트 격리**: SPEC §33 `Tenant Isolation` — 프로파일은 요청 tenant(`index.php:69-622` 주입) 경계 내.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

Trust Profile은 **authz 신뢰 등급**이다. 마케팅 신뢰도와 오흡수 금지(GT② §4): `Mmm.php:749`·`:939`(MMM 베이지안 사후 신뢰도)·`AttributionEngine.php:246-261`(`blended_trust`/`mkTrust`/`mmmTrust`)·`DataPlatform.php:281`(데이터 신뢰도 대시보드)·`Attribution.php:145-242`(cross-device confidence)는 어트리뷰션/데이터 신뢰이지 identity trust 등급이 아니다. risk 계열(`CustomerAI.php:10-18` churn risk 0~100·`Risk.php:31-55` 공급망 fraud)도 Historical Behavior/Previous Incidents로 오인 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Trust Profile(4등급 산출) = **ABSENT(순신규)**. 재활용 substrate = `userByToken`(신원 확인)·MFA/TOTP(인증 강도)·RBAC rank/scope(권한 수준)이나 이들은 등급화되지 않은 원재료이며, Historical Behavior/Previous Incidents는 완전 부재.
- **선행 의존**: SPEC §3 Identity Trust Engine(별도 DSAR `DSAR_APPROVAL_ZT_IDENTITY_TRUST.md`)의 산출 로직 신설이 선행. Trust Profile은 그 엔진의 출력 계약(ADR §4 BLOCKED_PREREQUISITE).
- **무후퇴**: 세션·MFA·RBAC 게이트 유지·병행(Extend-only). 코드 변경 0 · NOT_CERTIFIED.
