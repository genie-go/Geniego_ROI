# DSAR — Permission Implication (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

한 Permission이 다른 Permission을 **암묵 포함(Implication)** 하는 방향성 파생을 정형화한다. 예: `UPDATE` implies `VIEW` · `ADMINISTER` may imply `VIEW`/`CREATE`/`UPDATE`. **★단, Critical Permission의 위험 파생은 금지**: `APPROVE`는 `CANCEL`/`OVERRIDE`를 암묵 포함하지 **않으며**, `EXPORT`는 `VIEW_SENSITIVE`를 포함하지 **않는다**. Implication은 편의 파생일 뿐, 위험/민감 권한을 소리 없이 확대해서는 안 된다. Exclusion(§EXCLUSION)이 존재하면 Implication보다 Exclusion이 우선한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `implication_id` | Implication 식별자 |
| `source_permission` | 파생을 유발하는 Permission(A) |
| `implied_permission` | 암묵 포함되는 Permission(B) |
| `transitive` | Boolean(추이 파생 여부·사이클 금지) |
| `risk_guard` | 위험 파생 차단 플래그(Critical→파생 금지) |
| `actor_type_restriction` | 파생 허용 actor 유형 제한(service account 등 제외) |
| `blocked_by_exclusion` | Boolean(대응 Exclusion 존재 시 파생 무효) |

## 3. 열거형 / 타입

- **허용 Implication 예시**: `UPDATE ⟹ VIEW` · `ADMINISTER ⟹ {VIEW, CREATE, UPDATE}`(may imply).
- **금지 Implication(명시)**: `APPROVE ⛔ CANCEL` · `APPROVE ⛔ OVERRIDE` · `EXPORT ⛔ VIEW_SENSITIVE` — Critical/민감 권한 암묵 파생 금지.
- **risk_guard**: `BLOCK_CRITICAL_DERIVATION`(고정·Mandatory) — Critical Permission은 일반 Implication에서 파생 불가.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| VIEW 암묵 포함(실재) | action 부여 시 `view` 자동 포함 | 부분 substrate(UPDATE⟹VIEW의 근접) | `TeamPermissions.php:182-192` |
| superset 포함(실재) | `ACTIONS` manage=superset | 부분(ADMINISTER⟹… 근접) | `TeamPermissions.php:39` |
| Critical 파생 금지(APPROVE⛔CANCEL/OVERRIDE·EXPORT⛔VIEW_SENSITIVE) | — | **ABSENT(순신규)** | — |
| risk_guard·actor_type_restriction·blocked_by_exclusion | — | **ABSENT(순신규)** | — |

★현행은 `view` 자동 포함(`:182-192`)과 `manage=superset`(`:39`)이라는 **실 Implication substrate**가 있으나, **위험 파생 차단(risk_guard)** ·Critical 권한 비파생(APPROVE⛔CANCEL/OVERRIDE·EXPORT⛔VIEW_SENSITIVE)·actor type 제한·Exclusion 연동은 부재. 현행 manage=superset은 위험 파생 가드 없이 광범위 포함이라 정형화 시 risk_guard 부착 대상.

## 5. 설계 원칙 / 결정

- **편의 파생만 허용**: `UPDATE⟹VIEW`·`ADMINISTER⟹{VIEW,CREATE,UPDATE}`. Critical/민감 파생 금지 — `APPROVE`는 `CANCEL`/`OVERRIDE` 불포함, `EXPORT`는 `VIEW_SENSITIVE` 불포함(`risk_guard`).
- **Exclusion 우선**: 대응 Exclusion(§EXCLUSION) 존재 시 `blocked_by_exclusion=true` → 파생 무효(안전 우선).
- **transitive 사이클 금지**: 추이 파생은 유한·비순환 검증(Dependency와 동일 그래프 무결성).
- **actor_type_restriction**: service account 등 특정 actor는 Implication 파생에서 제외(§EXCLUSION의 SERVICE_ACCOUNT_EXECUTE⊘MANUAL_OVERRIDE와 정합).
- Golden Rule: `view` 자동 포함·manage superset을 substrate로 확장·정형화(risk_guard 부착), 중복 파생 해석기 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `source⟹implied` 선언·`risk_guard`·`actor_type_restriction`·Critical 비파생·Exclusion 연동 = 순신규 ABSENT.
- 현행 manage=superset은 risk_guard 없는 광범위 포함 — 위험 파생 가드 미착수(설계만).
- **BLOCKED_PREREQUISITE**: Implication 해석은 Canonical Permission Registry/Definition + Exclusion 엔진과 함께 신설 후 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
