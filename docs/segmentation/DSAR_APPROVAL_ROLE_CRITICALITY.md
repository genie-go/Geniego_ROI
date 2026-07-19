# DSAR — Role Criticality (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Role Definition의 **운영 중요도(Criticality)**를 선언하는 명세. Risk(악용 시 피해)와 별개로, 해당 Role이 비즈니스/운영/재무/컴플라이언스/보안/플랫폼 연속성에 얼마나 중요한지를 표현한다. Critical Role은 최소 통제 집합(Owner·Assignment Approval·Review·Certification·Immutable Snapshot 등)을 **비활성 불가 강제**로 요구한다(§6.17 Mandatory Control). ★**순신규**.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `criticality_level` | 운영 중요도 등급(§3) |
| `requires_owner` | Owner(Business/Technical/Security) 필수 |
| `requires_assignment_approval` | Assignment 승인 필수 |
| `requires_periodic_review` | 주기적 Review 필수 |
| `requires_certification` | Certification 필수 |
| `requires_immutable_snapshot` | 불변 Snapshot 필수 |
| `direct_assignment_restricted` | 직접 부여 제한 |
| `temp_assignment_restricted` | 임시(Temp) 부여 제한 |
| `commit_revalidation_required` | commit 시점 재검증 필수 |
| `cache_ttl_max` | Effective 캐시 TTL 상한(강제 축소) |
| `drift_check_intensified` | Drift 탐지 강화 대상 |

## 3. 열거형 / 타입

**criticality_level**: `NON_CRITICAL` · `BUSINESS_IMPORTANT` · `OPERATION_CRITICAL` · `FINANCIAL_CRITICAL` · `COMPLIANCE_CRITICAL` · `SECURITY_CRITICAL` · `PLATFORM_CRITICAL`.

**Critical Role 최소 통제(Mandatory)**: Owner 지정 · Assignment Approval · 주기 Review · Certification · Immutable Snapshot · Direct/Temp Assignment 제한 · Commit Revalidation · Cache TTL 상한 · Drift 강화.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 최고 권한 위계(간접 중요) | `team_role` owner / `admin_level` master | 위계 substrate | `TeamPermissions.php:134`·`UserAdmin.php:43-46` |
| 관리자 판정 SSOT(중요 계정) | `resolveAdminByToken`(289차 P4·plan\|plans+admin_level 폴백) | EXISTS(정합 기반) | ADR §D-2 |
| 변경 로그(Review 부분 근거) | `auth_audit_log` | PARTIAL(Evidence 로그만) | ADR §1·EXISTING §3 |

★**정직**: `criticality_level` 7등급·모든 Critical 최소 통제 플래그(`requires_*`·`*_restricted`·`cache_ttl_max`·`drift_check_intensified`) = **전부 순신규 ABSENT**. 현 substrate에 Role 운영 중요도·중요 Role 강제 통제·캐시 TTL 상한·Drift 강화 개념 전무. Owner 개념 ABSENT(EXISTING §3 Owner=ABSENT). Certification/Snapshot ABSENT.

## 5. 설계 원칙 / 결정

- **Critical Role = 최소 통제 비활성 불가(§6.17)**: `OPERATION_CRITICAL` 이상은 Owner·Assignment Approval·Review·Certification·Immutable Snapshot·Commit Revalidation을 고객 설정으로 끌 수 없다.
- **Direct/Temp Assignment 제한**: Critical Role은 직접 부여·임시 부여를 기본 차단(예외는 Emergency 별도 검토·감사).
- **Cache TTL 상한 강제**: 중요도 높을수록 Effective Role 캐시 TTL 상한 축소(무효화 지연 위험 최소화).
- Criticality ≠ Risk(별 엔티티) — 중요도(가용성/연속성)와 위험(악용 피해)은 독립. 둘 다 통제 강도에 기여.
- Golden Rule: team_role/admin_level/auth_audit_log substrate 위에 중요도·통제 계층 신설 — 중복 감사/스냅샷 store 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Criticality 7등급·Critical 최소 통제 강제·Cache TTL 상한·Drift 강화 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Immutable Snapshot·Commit Revalidation은 선행 불변 Ledger/Decision Core 부재로 공회전. Certification/Review는 후속 Part.
- Owner 필수 강제는 Role Owner 엔티티(ADR §3·후속) 구현 후 유효.
- 289차 P1~P4(resolveAdminByToken 정합 포함)·폐기 admin_roles 재플래그 금지.
