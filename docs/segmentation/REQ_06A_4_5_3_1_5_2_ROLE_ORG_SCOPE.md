# 요구 목록 정본 (분모) — EPIC 06-A Part 4-5-3-1-5-2

> **Rebate Role, Organization, Tenant, Workspace & Scope Governance · Spec Version 1.0**
> 289차 · **스펙 수령분 영속화** · 코드변경 0
>
> ## 🔴 본 문서의 존재 이유
>
> **1-6이 발견한 COV-GAP-01**: "§53 요구 목록이 저장소 어디에도 없다. 스펙은 **채팅에만** 존재했고
> **컨텍스트는 소멸**하므로 커버리지가 **원리적으로 계산 불가능**하다."
>
> **1-6 D-3 규칙**: *"`source_persisted = false`인 요구는 커버리지 분모에 넣을 수 없다.
> 세션 컨텍스트는 저장소가 아니다."*
>
> → **본 문서가 5-2 스펙의 요구 목록을 저장소에 고정한다.**
> **이 블록만큼은 커버리지 계산이 가능하다.** 선행 블록(1-1~1-9·5-1·5-3~5-8)의 분모는
> 여전히 부재이며 **MR-1-6-01로 인계된 상태**다.

---

## §1. 요구 — 산출 문서 (스펙 §58 · **56 + ADR + PM 3 = 60**)

| # | 문서 | 상태 |
|---|---|---|
| 1 | `DSAR_REBATE_ROLE_CATALOG.md` | ✅ |
| 2 | `DSAR_REBATE_ROLE.md` | ✅ |
| 3 | `DSAR_REBATE_ROLE_TYPE.md` | ✅ |
| 4 | `DSAR_REBATE_ROLE_STATUS.md` | ✅ |
| 5 | `DSAR_REBATE_STANDARD_ROLE.md` | ✅ |
| 6 | `DSAR_REBATE_CUSTOM_ROLE.md` | ✅ |
| 7 | `DSAR_REBATE_ROLE_VERSION.md` | ✅ |
| 8 | `DSAR_REBATE_ROLE_VERSION_MIGRATION_POLICY.md` | ✅ |
| 9 | `DSAR_REBATE_ROLE_HIERARCHY.md` | ✅ |
| 10 | `DSAR_REBATE_ROLE_COMPOSITION.md` | ✅ |
| 11 | `DSAR_REBATE_ROLE_PERMISSION_PROFILE.md` | ✅ |
| 12 | `DSAR_REBATE_ORGANIZATION_ROLE_PROFILE.md` | ✅ |
| 13 | `DSAR_REBATE_ROLE_SCOPE_DIMENSION.md` | ✅ |
| 14 | `DSAR_REBATE_TENANT_ROLE.md` | ✅ |
| 15 | `DSAR_REBATE_WORKSPACE_ROLE.md` | ✅ |
| 16 | `DSAR_REBATE_DEPARTMENT_TEAM_ROLE.md` | ✅ |
| 17 | `DSAR_REBATE_LEGAL_ENTITY_ROLE.md` | ✅ |
| 18 | `DSAR_REBATE_BRAND_STORE_MERCHANT_ROLE.md` | ✅ |
| 19 | `DSAR_REBATE_VENDOR_PARTNER_ROLE.md` | ✅ |
| 20 | `DSAR_REBATE_COUNTRY_REGION_ROLE.md` | ✅ |
| 21 | `DSAR_REBATE_ENVIRONMENT_ROLE.md` | ✅ |
| 22 | `DSAR_REBATE_PROGRAM_ROLE.md` | ✅ |
| 23 | `DSAR_REBATE_ROLE_ASSIGNMENT.md` | ✅ |
| 24 | `DSAR_REBATE_ROLE_ASSIGNMENT_TYPE.md` | ✅ |
| 25 | `DSAR_REBATE_ROLE_ASSIGNMENT_STATUS.md` | ✅ |
| 26 | `DSAR_REBATE_DIRECT_ROLE_ASSIGNMENT.md` | ✅ |
| 27 | `DSAR_REBATE_GROUP_ROLE_ASSIGNMENT.md` | ✅ |
| 28 | `DSAR_REBATE_INHERITED_ROLE_ASSIGNMENT.md` | ✅ |
| 29 | `DSAR_REBATE_TEMPORARY_ROLE_ASSIGNMENT.md` | ✅ |
| 30 | `DSAR_REBATE_CONDITIONAL_ROLE_ASSIGNMENT.md` | ✅ |
| 31 | `DSAR_REBATE_ROLE_REQUEST.md` | ✅ |
| 32 | `DSAR_REBATE_ROLE_REQUEST_STATUS.md` | ✅ |
| 33 | `DSAR_REBATE_ROLE_GRANT.md` | ✅ |
| 34 | `DSAR_REBATE_ROLE_REVOCATION.md` | ✅ |
| 35 | `DSAR_REBATE_ROLE_REVOCATION_TYPE.md` | ✅ |
| 36 | `DSAR_REBATE_ROLE_DEPROVISIONING.md` | ✅ |
| 37 | `DSAR_REBATE_ROLE_SCOPE_INHERITANCE.md` | ✅ |
| 38 | `DSAR_REBATE_ROLE_SCOPE_OVERRIDE.md` | ✅ |
| 39 | `DSAR_REBATE_ROLE_SCOPE_EXCLUSION.md` | ✅ |
| 40 | `DSAR_REBATE_ROLE_SCOPE_CONFLICT.md` | ✅ |
| 41 | `DSAR_REBATE_EXTERNAL_USER_ROLE_PROFILE.md` | ✅ |
| 42 | `DSAR_REBATE_SERVICE_ACCOUNT_ROLE_PROFILE.md` | ✅ |
| 43 | `DSAR_REBATE_ROLE_USAGE.md` | ✅ |
| 44 | `DSAR_REBATE_ORPHAN_ROLE.md` | ✅ |
| 45 | `DSAR_REBATE_DORMANT_UNUSED_ROLE.md` | ✅ |
| 46 | `DSAR_REBATE_ROLE_CANDIDATE.md` | ✅ |
| 47 | `DSAR_REBATE_ROLE_RECONCILIATION.md` | ✅ |
| 48 | `DSAR_REBATE_ROLE_RECONCILIATION_STATUS.md` | ✅ |
| 49 | `DSAR_REBATE_ROLE_CRITICAL_GAP_POLICY.md` | ✅ |
| 50 | `DSAR_REBATE_ROLE_STATIC_LINT.md` | ✅ |
| 51 | `DSAR_REBATE_ROLE_RUNTIME_GUARDS.md` | ✅ |
| 52 | `DSAR_REBATE_ROLE_ERROR_WARNING_CONTRACT.md` | ✅ |
| 53 | `DSAR_REBATE_ROLE_EVIDENCE.md` | ✅ |
| 54 | `DSAR_REBATE_ROLE_AUDIT_EVENT.md` | ✅ |
| 55 | `DSAR_REBATE_ROLE_EXISTING_IMPLEMENTATION.md` | ✅ |
| 56 | `DSAR_REBATE_ROLE_DUPLICATE_IMPLEMENTATION_AUDIT.md` | ✅ |
| 57 | `DSAR_REBATE_ROLE_FUNCTION_REGRESSION_GATE.md` | ✅ |
| 58 | `ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md` | ✅ |
| 59 | `PM_CHANGE_HISTORY.md` | ✅ |
| 60 | `REPEAT_PROBLEM_HISTORY.md` | ✅ (RP-002 등재) |
| 61 | `AGENT_EXECUTION_HISTORY.md` | ✅ (AE-289-15) |

**측정 방법(1-8 `MeasurementMethod` 준수 — 재현 명령):**
```
ls docs/segmentation/DSAR_REBATE_ROLE_*.md docs/segmentation/DSAR_REBATE_STANDARD_ROLE.md \
   docs/segmentation/DSAR_REBATE_CUSTOM_ROLE.md ... | wc -l
```

---

## §2. 요구 — Canonical Entity (스펙 §5 · **29종**)

`REBATE_ROLE_CATALOG` · `REBATE_ROLE` · `REBATE_ROLE_VERSION` · `REBATE_STANDARD_ROLE` ·
`REBATE_CUSTOM_ROLE` · `REBATE_ROLE_HIERARCHY` · `REBATE_ROLE_COMPOSITION` ·
`REBATE_ROLE_PERMISSION_PROFILE` · `REBATE_ORGANIZATION_ROLE_PROFILE` · `REBATE_ROLE_ASSIGNMENT` ·
`REBATE_ROLE_ASSIGNMENT_SCOPE` · `REBATE_ROLE_ASSIGNMENT_CONDITION` · `REBATE_ROLE_REQUEST` ·
`REBATE_ROLE_GRANT` · `REBATE_ROLE_REVOCATION` · `REBATE_ROLE_DEPROVISIONING` ·
`REBATE_ROLE_SCOPE_INHERITANCE` · `REBATE_ROLE_SCOPE_OVERRIDE` · `REBATE_ROLE_SCOPE_EXCLUSION` ·
`REBATE_ROLE_SCOPE_CONFLICT` · `REBATE_EXTERNAL_USER_ROLE_PROFILE` ·
`REBATE_SERVICE_ACCOUNT_ROLE_PROFILE` · `REBATE_ROLE_USAGE` · `REBATE_ORPHAN_ROLE` ·
`REBATE_DORMANT_ROLE` · `REBATE_ROLE_CANDIDATE` · `REBATE_ROLE_RECONCILIATION` ·
`REBATE_ROLE_EVIDENCE` · `REBATE_ROLE_AUDIT_EVENT`

**스펙 §5 단서**: *"공통 IAM Entity가 이미 있으면 Rebate 전용으로 복제하지 말고 Resource Domain·Role Profile만 확장하라."*

---

## §3. 요구 — 완료 조건 (스펙 §65 · **41항목**) · 검증 게이트 (§63 · **31항목**) · 완료 보고 (§64 · **57항목**)

**전문은 스펙 원문 기준.** 본 문서는 **분모 존재 증명**이 목적이므로 항목 수와 소재를 고정한다.

---

## §4. 🔴 요구 대비 산출의 정직한 격차

**스펙 §65는 41항목 전부 "구축되었다"를 요구한다.**
**본 블록 산출은 계약 명세(문서)까지이며 실 코드·테이블·Lint·Guard는 0건이다.**

이는 선행 Part 1-1~1-4·5-1의 선례와 **비파괴·코드변경 0** 원칙을 따른 것이며,
**"구축 완료"가 아니라 "계약 명세 확정"으로 읽어야 한다.**

**따라서 §1 표의 ✅는 "문서 산출 완료"이지 "기능 구축 완료"가 아니다.**
**1-6 4축 기준: Design=충족 · Implementation/Data/Verification=0%.**

실 구현 = **고객 Rebate 기능 도입 시 후속 승인 세션**.
