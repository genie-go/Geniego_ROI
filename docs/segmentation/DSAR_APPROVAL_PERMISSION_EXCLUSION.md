# DSAR — Permission Exclusion (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

한 Permission이 다른 Permission을 **명시적으로 배제(Exclusion)** 하는 방향성 관계를 정형화한다. 예: `READ_ONLY` excludes `UPDATE` · `SUPPORT_VIEW` excludes `APPROVE` · `IMPERSONATION_VIEW` excludes `FINANCIAL_APPROVE` · `SERVICE_ACCOUNT_EXECUTE` excludes `MANUAL_OVERRIDE`. **★Exclusion이 Implication(암묵포함·§IMPLICATION)보다 우선한다** — 어떤 Permission이 target을 암묵 파생시키더라도, 명시 Exclusion이 있으면 target은 거부된다(안전 우선). Conflict(§CONFLICT·대칭 상호배타)와 달리 Exclusion은 방향성(A→excludes→B)을 갖는다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `exclusion_id` | Exclusion 식별자 |
| `source_permission` | 배제를 선언하는 Permission(A) |
| `excluded_permission` | 배제되는 Permission(B) |
| `reason` | 배제 근거(안전/컴플라이언스) |
| `precedence_over_implication` | Boolean(**항상 true**·Implication보다 우선) |
| `hard` | Boolean(hard=우회 불가·override 금지) |
| `scope_ref` | 적용 scope 경계 |

## 3. 열거형 / 타입

- **표준 Exclusion 예시(설계)**: `READ_ONLY ⊘ UPDATE` · `SUPPORT_VIEW ⊘ APPROVE` · `IMPERSONATION_VIEW ⊘ FINANCIAL_APPROVE` · `SERVICE_ACCOUNT_EXECUTE ⊘ MANUAL_OVERRIDE`.
- **precedence**: `EXCLUSION_OVER_IMPLICATION`(고정·Mandatory) — Implication으로 파생돼도 Exclusion이 있으면 DENY.
- **hard**: `HARD`(우회/override 불가) · `SOFT`(정책 예외 가능·감사 필수).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Deny 우선(배제의 근접 substrate) | `DENY_SCOPE`·`1=0` 센티넬 | 부분(Deny 우선·명시 배제 아님) | `TeamPermissions.php:234`·`:290,303` |
| impersonation 경계(개념 근접) | — | **ABSENT** — IMPERSONATION_VIEW⊘FINANCIAL_APPROVE 명시 배제 없음 | — |
| 명시적 Exclusion(source⊘excluded·precedence·hard) | — | **ABSENT(순신규)** | — |

★현행에는 **default-deny/Deny 우선 substrate**(`:234,290,303`)만 있고, 방향성 있는 명시 Exclusion(`READ_ONLY⊘UPDATE`·`SUPPORT_VIEW⊘APPROVE`·`IMPERSONATION_VIEW⊘FINANCIAL_APPROVE`·`SERVICE_ACCOUNT_EXECUTE⊘MANUAL_OVERRIDE`)과 Exclusion>Implication 우선 규칙은 부재. 특히 지원/대행(impersonation) 뷰가 재무 승인을 배제하는 안전 경계는 순신규.

## 5. 설계 원칙 / 결정

- **Exclusion > Implication**: 명시 배제가 암묵 파생을 이김 — Implication으로 target이 생겨도 Exclusion이 있으면 DENY(안전 우선·`precedence_over_implication=true`).
- **읽기전용/지원/대행 경계**: `READ_ONLY⊘UPDATE`·`SUPPORT_VIEW⊘APPROVE`·`IMPERSONATION_VIEW⊘FINANCIAL_APPROVE`로 지원·대행·서비스 계정이 mutating/재무 결정을 우회하지 못하게 명시 배제.
- **hard Exclusion 우회 불가**: `hard=true`는 어떤 role/wildcard로도 override 불가(Mandatory Control).
- Exclusion(방향성)과 Conflict(대칭)를 구별 — 배제 관계를 Conflict 엔티티로 합치지 않음.
- Golden Rule: Deny 우선 substrate 확장, 중복 배제 해석기 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `source⊘excluded` 선언·`precedence_over_implication`·`hard`·표준 배제 4쌍 = 순신규 ABSENT.
- 현행은 default-deny만 — 방향성 명시 Exclusion·Exclusion>Implication 우선 미착수(설계만).
- **BLOCKED_PREREQUISITE**: Exclusion 해석은 Canonical Permission Registry/Definition + Implication 엔진과 함께 신설 후 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
