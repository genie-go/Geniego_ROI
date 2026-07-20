# DSAR — JIT Access Governance: 상승 위험 평가 (APPROVAL_JIT_RISK)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_RISK`(SPEC §6 Risk Evaluation·Canonical Entity §2)는 특권 상승 **요청 1건의 위험도를 다요소 평가**해 `LOW / MEDIUM / HIGH / CRITICAL`(SPEC §6 출력)로 산출하는 엔티티다. 평가 요소(SPEC §6):

| # | 요소 | 성격 |
|---|---|---|
| 1 | Requested Role Criticality | 대상 역할 임계도 |
| 2 | Permission Sensitivity | 권한 민감도 |
| 3 | Scope Breadth | 범위 폭 |
| 4 | Requested Duration | 요청 기간 |
| 5 | Environment | 실행 환경 |
| 6 | Device Trust | 디바이스 신뢰 |
| 7 | Authentication Assurance | 인증 보증수준 |
| 8 | Behavioral Risk | 행위 위험 |
| 9 | Historical Usage | 이력 사용 |

산출 Risk Level은 승인 워크플로(SPEC §7 Risk-based Approval)·Runtime Guard(SPEC §28)·Warning(SPEC §31 High Risk Elevation)의 입력이 된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 재활용/부재 근거(GT 등장 file:line) |
|---|---|---|
| 상승 Risk Scoring 엔진 전체 | **ABSENT** | GT② §2 "권한상승 risk scoring 0" — `elevation` risk BE 0건 |
| 파생 분류 패턴(임의값 금지) | 재활용 | AccessReview 휴면/만료 **파생 분류** `AccessReview.php:87-122`(Risk/Eligibility 파생 패턴) |
| Authentication Assurance | PARTIAL(재활용) | MFA 정책 `UserAuth.php:930`·mfa_otp 만료 `UserAuth.php:3526`·검증 `:4097-4104`(인증 보증 신호원) |
| Device Trust / Environment | PARTIAL(근접) | impersonation 상승차단 가드 `UserAdmin.php:466-469`(비상승·하향 강제)·act-as `UserAuth.php:418-420` |
| Behavioral / Historical | ABSENT(권한축) | 이상탐지 `AnomalyDetection.php`는 마케팅/지표(GT② B-8)·상승세션 감시 아님 |
| Requested Duration 위험 | 부재(앵커 없음) | grant TTL 앵커 자체 부재 — `acl_permission` 만료컬럼 부재 `TeamPermissions.php:152`(GT① §F) |

## 3. 설계 계약 (SPEC 근거·테넌트격리/불변버전)

- **입력**: `APPROVAL_JIT_REQUEST`(SPEC §3)의 Target Role/Permission/Scope·Requested Start/End·Requester.
- **9요소 → 등급**: 각 요소 파생 점수 합산 → `LOW/MEDIUM/HIGH/CRITICAL`(SPEC §6). **임의 숫자 금지·실제 신호 파생**(AccessReview `:87-122` 선례 계승).
- **불변성**: 평가 결과는 Elevation Snapshot(SPEC §25 Risk Evaluation 필드)·Evidence(SPEC §26 Risk Assessment)에 **불변 저장**(SPEC §33 Immutable Approval·Snapshot Integrity). SecurityAudit 해시체인 `SecurityAudit.php:12-53`(append-only)·`verify` `:56-68` 재활용.
- **테넌트 격리**: SPEC §33 Tenant Isolation — 상승 위험평가는 요청 테넌트 스코프 내에서만.
- **성능**: Risk 평가 ≤ 300ms(SPEC §35).
- **재평가**: Revalidation Trigger(SPEC §22 Risk Score Change) — 위험 상승 시 Auto Revocation(SPEC §14 Risk 상승).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | file:line(GT 등장) | 분리 사유 |
|---|---|---|
| CustomerAI churn `risk_level` | `CustomerAI.php:78-80,:179,:392,:406`(GT② B-8) | 이탈 위험이지 **상승 위험 아님** |
| 마케팅/거래 이상탐지 | `AnomalyDetection.php`(GT② B-8) | 지표 이상이지 상승세션 감시 아님 |
| 마케팅 eligibility 동음이의 | `Referral.php:156,:161`·`Connectors.php:1238-1240`(GT② B-8) | ELIGIBLE 마케팅 판정 |
| model drift | `ModelMonitor.php`(GT② B-8) | ML 드리프트이지 elevation drift 아님 |

> **★혼동 경계**: elevation Risk(상승 위험) ≠ 마케팅 `Risk.php`/CustomerAI churn `risk_level`(GT② B-8). 이름만 `risk`이며 도메인·입력·출력 상이. 재활용은 파생분류 **패턴**(AccessReview)만이며 churn/anomaly 엔진 **흡수·개명 금지**.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 상승 Risk Scoring 엔진 **ABSENT(순신규·grep 0, GT② §2)**. 재활용 substrate = AccessReview 파생분류 패턴(`:87-122`)·MFA 인증신호(`UserAuth.php:930`)·SecurityAudit 불변체인. 성격 = "재활용 기반 신설".
- **최대 공백**: Requested Duration 위험을 걸 grant TTL 앵커 부재(`acl_permission` 만료컬럼 부재 `TeamPermissions.php:152`).
- **선행 의존**: Part 1~3-8 인증 후 RP-track 실 구현(BLOCKED_PREREQUISITE). ERRE(3-7) effective 계산에 결합(ADR §4).
- **무후퇴**: 마케팅 risk/anomaly 엔진 유지·병행. Extend-only. **코드 0 · NOT_CERTIFIED**.
