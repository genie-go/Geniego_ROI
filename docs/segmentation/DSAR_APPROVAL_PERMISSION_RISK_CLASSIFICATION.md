# DSAR — Permission Risk Classification (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission의 **위험 등급과 등급별 최소 Control(강제)**을 정형화. Risk가 높을수록 Fresh Authorization·Immutable Snapshot·Step-up·Wildcard 금지 등 무력화 불가능한 통제를 요구한다. Risk는 Definition의 필수 속성이며 Category의 `default_risk_floor`를 하한으로 받는다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `risk_level` | 위험 등급(§3) |
| `min_controls` | 등급별 강제 Control 집합(§3) |
| `cache_allowed` | 결정 캐시 허용 여부(HIGH+는 제한) |
| `step_up_required` | 재인증(Step-up) 요구 |
| `wildcard_forbidden` | wildcard 금지(CRITICAL=true) |
| `mandatory` | Control 고객 비활성 불가(항상 true·Mandatory Control) |

## 3. 열거형 / 타입 + 등급별 최소 Control

**risk_level**: `INFORMATIONAL` · `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` · `REGULATED` · `FINANCIAL_CRITICAL` · `SECURITY_CRITICAL` · `ADMINISTRATIVE_CRITICAL`.

| 등급 | 최소 Control |
|---|---|
| `LOW` | 표준 감사 · 결정 캐시 허용 |
| `HIGH` | Evidence 필수 · **Resource Version Binding** · **Commit Revalidation** |
| `CRITICAL`(및 *_CRITICAL/REGULATED) | **Fresh Authorization**(캐시 금지) · **Immutable Snapshot** · **Step-up** 재인증 · **Wildcard 금지** · Temporary grant 제한 |

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| wildcard 제한(CRITICAL) | api_key scopes wildcard=프로그래매틱 한정 | 제한범위(§6.8) | `Keys.php:191,204`·`UserAuth.php:4307` |
| admin 고위험 판정 | `resolveAdminByToken`(plan/plans/is_active/미만료) | CANONICAL | `UserAuth.php:2998` |
| write 게이트(PEP) | index.php 중앙 RBAC write=analyst+ | CANONICAL | `index.php:590-603` |

★**정직**: Permission별 **Risk 등급 축·등급별 min_controls·`step_up_required`·`cache_allowed`·Fresh Authorization·Immutable Snapshot = 순신규 ABSENT**. 현재 어떤 acl_permission/data_scope row에도 risk 속성 없음. wildcard 제한은 이미 api_key 프로그래매틱 한정으로 substrate 존재(일반 grant wildcard 부재·ADR §6.8). 하드코딩 권한 문자열·FULL_ACCESS/MANAGE_ALL 백도어 = 전무(오탐 방지).

## 5. 설계 원칙 / 결정

- Risk는 Definition 필수 속성 — 미지정 시 Category `default_risk_floor` 이상으로 강제.
- HIGH → Evidence + Resource Version Binding + Commit Revalidation 강제([`DSAR_APPROVAL_PERMISSION_DEFINITION`](DSAR_APPROVAL_PERMISSION_DEFINITION.md) 필드 연동).
- CRITICAL 계열 → Fresh Authorization(캐시 금지)·Immutable Snapshot·Step-up·Wildcard 금지·Temp 제한.
- min_controls는 **Mandatory Control** — 고객 설정으로 비활성 불가(ADR §6.16).
- Golden Rule: 실 wildcard 제한/admin SSOT를 Risk Control 매핑으로 확장(중복 통제엔진 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Risk 등급 축·min_controls·step-up·fresh-auth = 순신규.
- **BLOCKED_PREREQUISITE**: Fresh Authorization/Immutable Snapshot은 선행 Decision Core + Part 1 Snapshot 실 저장체 신설 후 RP-002. Step-up은 Actor Identity(03-03) 결합 필요.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
