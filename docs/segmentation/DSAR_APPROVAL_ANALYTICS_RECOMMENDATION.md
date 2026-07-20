# DSAR — RBAC Analytics & Governance Dashboard: 추천 엔진 (APPROVAL_ANALYTICS_RECOMMENDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §23 Recommendation Engine은 authz analytics 산출로부터 **거버넌스 개선 조치를 추천**한다. 추천 7종: **Remove Unused Roles · Merge Duplicate Roles · Reduce Scope · Replace Standing Privilege with JIT · Schedule Certification · Rotate Secrets · Simplify Role Hierarchy**. Role/Permission/Scope/Service Identity Analytics(§8~§13)와 KPI(§20 Least Privilege·ZSP)를 입력으로 최소권한·ZSP 개선 액션을 도출한다. 산출은 §34 Simulation(추천 적용 시 Risk 감소·Approval 증가 영향분석)으로 검증된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 추천 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Recommendation Engine(7종) | **ABSENT(grep 0)** | authz축 추천 전무 — GT② §2 "Trend/Forecast/Recommendation(authz) ABSENT grep 0" |
| Remove Unused Roles 신호 | **PARTIAL** | `AccessReview.php:87-122` `classify`(EXPIRED>STALE_UNUSED>DORMANT>OK 파생·★api_key 축만) — GT① §B. 미사용 파생 패턴 존재, Role 축 미커버 |
| Rotate Secrets 신호 | **PARTIAL** | `AccessReview.php:87-122`(EXPIRED api_key)·`AccessReview.php:177-242`·`:245`(회수 decision·이력) — GT① §B. Service Identity Expired Secrets(§13) 부분 |
| Reduce Scope 신호 | **PARTIAL** | `TeamPermissions.php:56`(data_scope)·`:738-750`(scopeSqlNamed) — GT① §F. scope 정본 존재, 축소 추천 로직 부재 |
| Replace Standing→JIT / Schedule Certification | **ABSENT** | JIT Analytics(§14)·Certification(§16) 축 전용 지표 부재 — GT② §2. Part 3-9/3-8 선행 |

★핵심: **추천 도출 엔진은 순신규**다. `AccessReview.php:87-122` classify는 미사용·만료를 **파생 분류**하는 선례(Remove Unused/Rotate Secrets의 신호원)지만, api_key 축 한정이며 role/scope 축 추천·머지·계층단순화 로직은 GT② §2에서 grep 0. SoD 실집행 선례(`Mapping.php:268-271`, GT② §2)는 있으나 추천이 아닌 강제.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **recommendation_type**: `remove_unused_role|merge_duplicate_role|reduce_scope|replace_standing_with_jit|schedule_certification|rotate_secret|simplify_hierarchy`(SPEC §23).
- **필드**: target_entity(role/permission/api_key/scope)·evidence_ref·rationale·예상효과(Risk 감소·§34 Simulation 연계)·상태(pending/applied/dismissed).
- **신호원(읽기전용)**: `AccessReview.php:87-122`(미사용/만료 분류)·`TeamPermissions.php:454-478`(permission 카운트·중복 후보)·`:738-750`(scope). 원천 통제 무변경(ADR D-1).
- **증거·이력**: 추천 산출/적용은 `SecurityAudit.php:14-33`·`:56-68`(tamper-evident 해시체인) + `access_review_item`(`AccessReview.php:62-81`·`:225` 증거기록) 패턴 재활용(ADR D-4). 추천 적용은 승인정책 존중(자동집행 금지·읽기전용 파생).
- **테넌트 격리 절대**: cross-tenant 격리(`index.php:614-619` — ADR D-6). 테넌트 간 추천 혼입 금지(§35).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★"recommend" grep 히트는 거의 전부 마케팅 추천·의사결정 엔진(GT② §4·ADR D-2). authz Recommendation으로 **절대 흡수·개명 금지**.

| 마케팅 추천/결정 엔진 | 근거(파일:라인) | 분리 사유 |
|---|---|---|
| 예산배분·베이즈·UCB bandit | `AutoRecommend.php:40` (GT② §B-2) | 광고 예산 추천 — SoD/Analytics 추천과 무관 |
| 광고 인사이트 ingest·의사결정 | `Decisioning.php:11`·`:37` (GT② §B-2) | 마케팅 decisioning — authz 아님 |
| 광고 SPC 이상감지(ROAS/CPA/CTR/CVR) | `AnomalyDetection.php:22` (GT② §B-2) | 마케팅 이상탐지 — authz 추천 아님 |

★ADR D-2: 마케팅 recommendation 로직·metric 계층은 재사용 대상이 아니다. 재사용은 증거체인(`SecurityAudit.php:14`)·access_review 분류패턴 등 **엔진 substrate**에 한정.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Recommendation Engine = **ABSENT(순신규·grep 0)**. 재활용 substrate = `AccessReview.php:87-122`(미사용/만료 분류 신호원·api_key 축)·`TeamPermissions.php:738-750`(scope)·`SecurityAudit.php:14`·`:56-68`(추천 증거체인)·`access_review_item`(이력 패턴).
- **선행 의존**: BLOCKED_PREREQUISITE. Replace Standing→JIT·Schedule Certification은 JIT(Part 3-9)·Certification(Part 3-8) 엔진 실 구현 후 그 산출을 소비(ADR D-7). Remove Unused/Rotate는 Role/Service Identity Analytics(§8·§13) 선행.
- **무후퇴**: 마케팅 추천 엔진(AutoRecommend/Decisioning/AnomalyDetection) 병행 유지·흡수 0(ADR D-2·D-8). Extend-only·읽기전용·자동집행 금지. 코드 변경 0 · NOT_CERTIFIED.
