# DSAR — Permission Dependency (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission 간 **선행 의존(Dependency)** 을 정형화한다. 특정 Permission이 성립하려면 다른 Permission이 선행돼야 하는 관계(source→required)를 선언한다. 예: `APPROVE` requires `VIEW` · `EXPORT` requires `VIEW` · `FIELD_EDIT` requires `FIELD_VIEW` · `ADMINISTER` requires `VIEW`+`UPDATE`. **Missing Required → Grant/Resolution 차단**(선행 미충족이면 부여·유효 계산 단계에서 거부). Dependency는 Implication(암묵포함·§IMPLICATION)과 구별된다 — Dependency는 "필요조건"이고 Implication은 "자동 파생"이다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `dependency_id` | Dependency 식별자 |
| `source_permission` | 의존하는 Permission Code |
| `required_permission` | 선행 필요 Permission Code |
| `type` | 의존 유형(§3 열거) |
| `transitive` | Boolean(추이적 확장 여부) |
| `scope_inheritance` | required의 scope를 source가 상속/교집합하는 규칙 |
| `enforcement_stage` | 검증 단계(GRANT_TIME/RESOLUTION_TIME/BOTH) |
| `missing_effect` | 선행 부재 시 효과(BLOCK_GRANT/BLOCK_RESOLUTION) |

## 3. 열거형 / 타입

- **type**: `REQUIRED`(필수 선행) · `RECOMMENDED`(권고·비차단) · `CONDITIONAL`(조건부 선행) · `EXCLUSIVE_REF`(상호배타 참조·§CONFLICT/EXCLUSION 연계) · `CUSTOM`.
- **enforcement_stage**: `GRANT_TIME` · `RESOLUTION_TIME` · `BOTH`.
- **missing_effect**: `BLOCK_GRANT`(부여 차단) · `BLOCK_RESOLUTION`(유효 계산서 제외).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| VIEW 자동 포함(암묵 선행의 근접) | action 부여 시 `view` 자동 포함 | 부분 substrate(Implication 성격·Dependency 아님) | `TeamPermissions.php:182-192` |
| manage=superset(광범위 포함) | `ACTIONS` manage=superset | 부분(포함 관계) | `TeamPermissions.php:39` |
| 위임상한(부여 차단의 근접) | `clampActions`·`putMemberPermissions`(403 DELEGATION_EXCEEDED) | 부분(grant-time 차단이나 상한 clamp이지 선행 dependency 아님) | `TeamPermissions.php:396-402,628-647` |
| 명시적 Dependency(source→required·type·transitive·scope inheritance) | — | **ABSENT(순신규)** | — |

★현행은 `view` 자동 포함(`:182-192`)과 manage superset(`:39`)이라는 **암묵 포함**만 있고, `APPROVE requires VIEW`·`FIELD_EDIT requires FIELD_VIEW`·`ADMINISTER requires VIEW+UPDATE` 같은 **선언적 필요조건(Dependency Graph)** 과 Missing Required 차단은 부재. 위임상한(`clampActions`)은 부여 상한 제한이지 선행 dependency가 아님(혼동 금지).

## 5. 설계 원칙 / 결정

- **Dependency ≠ Implication**: Dependency는 "required가 없으면 source 불가"(필요조건·차단). Implication은 "source가 있으면 target 자동 성립"(파생·§IMPLICATION). 두 관계를 같은 엔티티로 합치지 않음.
- **Missing Required → 차단**: `type=REQUIRED` 선행 부재 시 `missing_effect`에 따라 부여 또는 유효 계산서 차단(fail-closed).
- **scope_inheritance = 교집합**: required의 scope를 넘어서 source가 확장되지 않도록 상속은 Intersection(Expansion Guard·ADR §6.9).
- **transitive**: 추이 의존은 사이클 금지·경로 유한성 검증(그래프 무결성).
- Golden Rule: `view` 자동 포함·manage superset·clampActions를 substrate 참고로 확장, 중복 의존 해석기 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `source→required` 선언·`type`·`transitive`·`scope_inheritance`·Missing Required 차단 = 순신규 ABSENT.
- 현행은 암묵 포함(view/manage)만 — 선언적 Dependency Graph 미착수(설계만).
- **BLOCKED_PREREQUISITE**: Dependency 해석은 Canonical Permission Registry/Definition 신설 후 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
