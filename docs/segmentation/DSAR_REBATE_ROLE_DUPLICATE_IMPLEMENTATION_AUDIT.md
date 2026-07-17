# DSAR — 중복 구현 감사 (§56)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 전수 탐지 결과 (실측)

| 감사 항목 | 결과 | 조치 |
|---|---|---|
| **여러 Role Catalog** | **0**(Catalog 개념 부재) | 신설 시 **1개만** |
| **여러 Standard Role Definition** | **0**(Rebate Role 부재) | — |
| 여러 Custom Role Store | **0** | — |
| 여러 Role Version Store | **0** | — |
| 여러 Role Hierarchy | **2 선형 rank**(index.php:554 · team_role) | **통합**(SPECIALIZES 표현·의미 보존) |
| **여러 Role Assignment Table** | 🔴 **3** — `team`/`team_role` · `api_key` · `sso_group_role_map` | **CONSOLIDATION_REQUIRED**(★**4번째 금지**) |
| **여러 Group-to-Role Mapping** | **1** — `sso_group_role_map` | **재사용**(중복 신설 금지) |
| **여러 Tenant Admin Role** | 🔴 **2** — `team_role=owner` · admin master(requireMasterAdmin2) | **CONSOLIDATION_REQUIRED** |
| 여러 Workspace Role 모델 | **0**(Registry 부재) | — |
| 여러 Legal Entity Scope 모델 | **0**(부재) | — |
| **여러 External User Role 모델** | 🔴 **3** — AgencyPortal · PartnerPortal · SupplyChain(sc_suppliers) | **KEEP_SEPARATE_WITH_REASON**(대행사/파트너/공급망 = **용도 상이**) + Canonical 상위 통합 |
| **여러 Service Account Role 모델** | **1** — `api_key` | **재사용**(Type 승격) |
| **여러 Deprovisioning Job** | **1** — `EnterpriseAuth.php:400` | **재사용**(패턴 확장) |
| **여러 Role Cache** | **0**(캐시 부재) | — |
| **여러 SCIM Mapping** | **1** — `sso_config`+`sso_group_role_map` | **재사용** |
| IdP·ERP·Admin UI별 독립 Role 모델 | **프론트 1** — `planMenuPolicy.js`(PLAN_TIER_RANK/MENU_MIN_PLAN) | ★**수동 동기화 위험**(PlanPolicy.php:14) → **MIGRATION_REQUIRED**(5-6) |
| **Rebate 기능별 중복 Role Enum** | **0**(미착수) | ★**신설 금지** |

## 🔴 결론 — 중복 위험의 실체 (5-1 §51 계승·심화)
1. **"Rebate 전용 IAM 을 새로 만드는 것"** — Rebate Role·Scope 는 **기존 `acl_permission` 매트릭스와 DATA_SCOPES 9 에 등록**해야 하며 **별도 IAM 신설 금지**.
2. **"이미 3계통인 Role Assignment 를 4번째로 늘리는 것"** — Canonical 로 **통합**하되 **3계통의 실효 동작 보존**(1-9 `EquivalenceProof` 선행 필수 · **286차 rank 맵 붕괴 재현 금지**).
3. **"Group Mapping 을 또 만드는 것"** — `sso_group_role_map` 이 **이미 정본**이다. **removal behavior 를 추가**할 뿐 새 테이블을 만들지 않는다.
4. **"Deprovisioning Job 을 또 만드는 것"** — `EnterpriseAuth.php:400` 이 **패턴 정본**이다. **Trigger 를 확장**한다.

근거: 헌법 Golden Rule(Replace 가 아니라 Extend) · CHANGE_GATE Duplicate Prevention 15카테고리 · 메모리 `feedback_no_duplicate_features`(착수 전 grep 전수 · 있으면 신설금지·기존 심화).
