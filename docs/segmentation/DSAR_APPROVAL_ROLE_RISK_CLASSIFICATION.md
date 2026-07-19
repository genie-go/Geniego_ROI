# DSAR — Role Risk Classification (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Role Definition의 **위험 등급**을 산정·선언하는 명세. Role이 내포하는 Permission·관리 권한·결재 행위·민감 데이터 접근의 종합 위험을 단일 등급으로 표현해 Assignment/Review/Certification 통제 강도를 결정한다. Risk는 Role의 **속성**이며 Permission Ris(Part 2)와 별개 축이나, Role이 묶는 Permission들의 Risk를 상향 집계해 산정된다. ★**순신규**(현 substrate에 role risk 축 전무).

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `risk_level` | 산정 위험 등급(§3) |
| `derived_from_permission_risk` | 포함 Permission Risk 상향 집계 근거 |
| `has_admin_permission` | 관리자 Permission 포함 여부 |
| `has_approval_action` | 결재/승인 행위 포함 여부 |
| `has_sensitive_data_access` | 민감 데이터 접근 포함 여부 |
| `has_export_capability` | Export/반출 능력 포함 여부 |
| `has_user_admin` | 사용자 관리 능력 포함 여부 |
| `has_config_capability` | 구성/설정 변경 능력 포함 여부 |
| `has_override_capability` | Override/우회 능력 포함 여부 |
| `direct_assignment_risk` | 직접 부여(그룹 경유 아님) 위험 가중 |
| `machine_actor_risk` | 기계 actor 부여 시 위험 가중 |
| `downgrade_requires_security_review` | Risk 하향 시 Security Review 필수 플래그 |
| `computed_at` | 산정 시각(재산정 이력용) |

## 3. 열거형 / 타입

**risk_level**: `INFORMATIONAL` · `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` · `REGULATED` · `FINANCIAL_CRITICAL` · `SECURITY_CRITICAL` · `ADMINISTRATIVE_CRITICAL`.

**산정 기준(가중 요인)**: 포함 Permission Risk 최대치 · 관리자 Permission 보유 · Approval Action 보유 · 민감 데이터 접근 · Export 능력 · 사용자 관리 · Config 변경 · Override 능력 · 직접 부여 · 기계 actor 부여.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| admin 위험 신호(간접) | `plan 'admin'` god flag / `admin_level` | ANTI_PATTERN·SUB_ROLE_CANDIDATE | `TeamPermissions.php:132`·`UserAdmin.php:43-46` |
| 쓰기 위험 위계(간접) | `team_role`(owner>manager>member) | 위계 substrate | `TeamPermissions.php:120-131` |
| 관리자 rank 신호(간접) | api_key roleRank | 간접 신호 | `index.php:573` |

★**정직**: `risk_level` 9등급·산정 엔진·`derived_from_permission_risk`·`downgrade_requires_security_review`·모든 `has_*` 위험 요인 플래그 = **전부 순신규 ABSENT**. 현 substrate에는 Role별 위험 등급·산정·재산정 개념이 전무하다. 위 매핑은 "위험 신호로 재해석 가능한 간접 substrate"일 뿐 실 risk 필드가 아니다(GraphScore/AnomalyDetection 등 무관 엔진 재사용 금지).

## 5. 설계 원칙 / 결정

- **Risk 하향 = Security Review 필수**: `risk_level` 을 낮추는 재분류는 `downgrade_requires_security_review=true` 게이트 통과 필수(상향은 자동 허용).
- **집계 산정**: Role Risk ≥ 포함 Permission Risk 최대치(하향 불가) + 위험 요인 가중. 관리/결재/Export/Override 보유 Role은 최소 `HIGH`.
- **fail-closed**: risk 미산정 Role은 최고 통제 등급(CRITICAL 취급)으로 처리 — Assignment 게이트가 보수적으로 동작.
- Role Risk ≠ Permission Risk(Part 2) ≠ Criticality(별 엔티티·운영 중요도) — 위험(악용 시 피해)과 중요도(가용성)는 분리.
- Golden Rule: Permission Engine의 Permission Risk를 상향 집계 — 별도 위험 엔진 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Role Risk 등급/산정/하향 게이트 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: `derived_from_permission_risk` 집계는 선행 Part 2 Permission Definition/Risk 실 구현 부재로 결합 공회전.
- Security Review 트리거는 선행 Review/Certification(후속 Part) 및 Decision Core 부재로 자동 집행 불가.
- 289차 P1~P4·폐기 admin_roles 재플래그 금지.
