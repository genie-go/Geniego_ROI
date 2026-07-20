# DSAR — JIT Access Governance: 자격 평가 (APPROVAL_JIT_ELIGIBILITY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_ELIGIBILITY`(SPEC §5)는 요청자가 특정 상승을 받을 **자격이 있는지**를 승인 이전에 판정하는 게이트다. 평가 항목(SPEC §5): Employment Status·Organization Membership·Security Training·Certification Status·Previous Violations·Active Assignment·SoD Conflict·Risk Score. 자격 미달은 요청을 조기 차단(Eligibility Fail-closed 정신, ADR §D-3 fail-secure)하여 무자격 상승을 원천 봉쇄한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT 등장 file:line) | 재활용 방식 |
|---|---|---|---|
| Eligibility Engine(권한상승 자격) | **ABSENT** | GT② §2 "JIT Analytics/Risk — ABSENT"·권한상승 risk scoring 0 | 순신규 |
| 파생 분류(임의값 금지·자격판정 패턴) | PRESENT | `AccessReview.php:87-122`(휴면/만료 분류·파생·임의값 금지) | Eligibility 판정을 파생값으로 산출(하드코딩 금지) 계승 |
| Organization Membership 원천 | PARTIAL | `EnterpriseAuth.php:487`(SSO 그룹→역할·`app_user.team_role` 영구)·역할 세션해석 `UserAuth.php:1019` | Org Membership 자격 입력원 재사용(영속 매핑) |
| Active Assignment 조회(RBAC 매트릭스) | PARTIAL | `TeamPermissions.php:152`(acl_permission·TTL 부재) | 현행 배정 상태를 Active Assignment 입력으로 조회 |
| Employment/Active 상태 회수 선례 | PARTIAL | `UserAdmin.php:344`(계정 비활성 시 세션 즉시 DELETE) | 비활성 계정 자격 박탈 신호 참조 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **평가 항목**(SPEC §5): 8항 전부. 각 항목은 파생값(임의 상수 금지, `AccessReview.php:87-122` 원칙).
- **SoD Conflict**: 상승이 기존 배정과 직무분리 충돌 시 자격 실패 — Part 3-10(Runtime SoD, SPEC §38-1)과 상보.
- **Risk Score 결합**: Eligibility 통과 후 APPROVAL_JIT_RISK(SPEC §6, LOW/MEDIUM/HIGH/CRITICAL)로 승인 단계 결정.
- **Fail-closed**: 자격 미달·모호는 상승 거부(ADR §D-3 fail-secure). Unknown≠Eligible.
- **테넌트 격리·다국어**: 자격 판정은 테넌트 스코프, 실패 사유 라벨은 i18n.
- **에러 계약**(SPEC §30): `JIT_ELEVATION_DENIED`.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물(마케팅/거래 eligibility 동음이의) | 근거(GT 등장 file:line) | 분리 사유 |
|---|---|---|
| 리퍼럴 자격 | `Referral.php:156,:161` | 추천 프로그램 자격 — 권한상승 eligibility 아님(GT② B-8) |
| 커넥터 ELIGIBLE | `Connectors.php:1238-1240` | 채널 연동 자격 — elevation eligibility 아님(GT② B-8) |
| churn risk_level | `CustomerAI.php:78-80,:179,:392,:406` | 고객 이탈 위험 — 상승 risk score 아님(GT② B-8) |
| billing entitlement | `ProductAddon.php:16,:138` | 과금 부가상품 권한 — JIT grant 아님(GT② B-8) |
| plan/feature 게이팅 | `UserAuth.php:364`·`:77`·`PlanPolicy.php` | 구독 등급 자격 — 시한부 상승 자격 아님(GT② B-3) |

## 5. 판정 (NOT_CERTIFIED · 재활용-substrate/ABSENT-governance · 선행의존)

- **판정 = ABSENT-governance / 재활용-substrate.** 권한상승 전용 Eligibility 엔진은 grep 0(GT② §2)·순신규.
- **재활용**: 파생분류 원칙(`AccessReview.php:87-122`)·Org Membership 원천(`EnterpriseAuth.php:487`·`UserAuth.php:1019`)·Active Assignment 조회(`TeamPermissions.php:152`)를 대체 아닌 **확장**. 마케팅/거래 eligibility 동음이의는 흡수 금지(ADR §D-6, GT② B-8).
- **선행 의존**: Part 1~3-8 인증(특히 ERRE 3-7 effective 계산 결합, ADR §4) 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
