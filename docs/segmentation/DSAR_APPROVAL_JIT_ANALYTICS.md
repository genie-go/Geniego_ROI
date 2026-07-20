# DSAR — JIT Access Governance: Elevation 분석 (APPROVAL_JIT_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_ANALYTICS`(SPEC §20)는 elevation 프로그램의 **집계 지표(governance metrics)** 다. 지표: Active Elevations · Average Duration · Average Approval Time · Revoked Sessions · Emergency Elevations · Break Glass Usage · High Risk Requests · Denied Requests(SPEC §20). Drift(§21)·Simulation(§24)의 통계 기반이며, ZSP 준수(상시특권 축소) 효과를 측정한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §20 지표 | 판정 | 근거(GT 파일:라인) |
|---|---|---|
| Active/Duration/Approval Time/Revoked/High Risk/Denied 집계 | **ABSENT** | GT②§2: JIT Analytics/Risk/Anomaly on elevation grep 0 |
| 권한상승 risk scoring | **ABSENT** | GT②§2: 권한상승 risk scoring 0 |
| Break Glass Usage(원천 이벤트만) | **ABSENT(집계)** / 원천 PARTIAL | 원천=`auth.breakglass` 감사 `UserAuth.php:997-999`. 단 집계 지표 없음 |
| Emergency Elevations 집계 | **ABSENT** | GT②§2: 권한상승 계층 전무(집계 대상 데이터 부재) |

★함정 준수: 아래는 **재활용 참고**일 뿐 elevation analytics가 **아니다**.
- api_key `use_count`·AccessReview classify(`AccessReview.php:87-122` 휴면/만료 파생분류, GT①§4-E) = 파생분류 패턴 참고 — elevation analytics 아님.
- `ModelMonitor.php`(ML 모델 드리프트)·`AnomalyDetection.php`(마케팅/지표 이상탐지) = KEEP_SEPARATE(GT② B-8).

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 지표 | Active Elevations·Average Duration·Average Approval Time·Revoked Sessions·Emergency Elevations·Break Glass Usage·High Risk Requests·Denied Requests(SPEC §20) |
| 데이터 원천 | Request/Approval/Session/Revocation/Evidence 원장 집계(모두 순신규 선행 필요) |
| 파생 원칙 | 임의값 금지·실측 파생. AccessReview 파생분류(`AccessReview.php:87-122`) 원리 참고(집계는 순신규) |
| Break Glass 원천 | `auth.breakglass` 감사이벤트(`UserAuth.php:997-999`)를 집계 소스로 참조 |
| 테넌트 격리 | Tenant Isolation(SPEC §33) 적용 |
| 상위 소비 | Drift(SPEC §21)·Simulation(SPEC §24) 입력 |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| `ModelMonitor.php` | GT② B-8 | ML 모델 드리프트 — elevation analytics/drift 아님 |
| `AnomalyDetection.php` | GT② B-8 / GT②§2 | 마케팅·지표 이상탐지 — 상승세션 감시 아님 |
| `Risk.php` | GT②§2 | 마케팅/거래 risk — 권한상승 risk scoring 아님 |
| api_key `use_count`·AccessReview classify | GT①§4-E(`AccessReview.php:87-122`) | 재활용 참고(파생분류 원리)이지 elevation analytics 아님(★함정) |
| eligibility/risk 마케팅 동음이의 | GT② B-8(`CustomerAI.php:78-80`·`Referral.php:156`·`Connectors.php:1238-1240`) | churn/추천 지표 — elevation 지표 아님 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규)**. JIT Analytics/Risk/Anomaly on elevation grep 0(GT②§2). 집계 대상 원장(Request/Approval/Session/Revocation) 자체가 부재.
- **재활용 참고(집계 아님)**: AccessReview 파생분류 원리(`AccessReview.php:87-122`)·`auth.breakglass` 원천 이벤트(`UserAuth.php:997-999`). 기존 마케팅 analytics 엔진(ModelMonitor/AnomalyDetection/Risk)은 KEEP_SEPARATE.
- **선행 의존**: Request~Revocation 원장 확정 후에만 지표 산출(BLOCKED_PREREQUISITE, ADR §4·D-5 중복엔진 금지). Part 1~3-8 인증 선행.
- 코드 변경 0 · Extend-only · 무후퇴.
