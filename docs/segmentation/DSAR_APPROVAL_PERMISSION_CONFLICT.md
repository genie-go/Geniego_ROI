# DSAR — Permission Conflict (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

두 Permission이 **충돌(Conflict)** 하는 관계를 메타데이터로 선언한다. 주 목적은 **후속 SoD(Segregation of Duties·Part 6)** 가 재사용할 충돌 카탈로그를 세우는 것. 각 Conflict는 type·A·B·severity·동일 scope 한정·resolution policy·SoD rule ref를 갖는다. **★이번 Part에서는 `Critical Mutual Exclusion`과 `Allow/Deny Conflict`만 Runtime Guard에 반영**하고, Toxic Combination 등 나머지 SoD 성격 충돌은 메타데이터로 등재만 하며 실 집행은 Part 6로 이연한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `conflict_id` | Conflict 식별자 |
| `type` | 충돌 유형(§3 열거) |
| `permission_a` / `permission_b` | 충돌 쌍 |
| `severity` | 심각도 |
| `same_scope_only` | Boolean(동일 scope 내에서만 충돌 성립) |
| `resolution_policy` | 해소 정책(DENY_BOTH/PREFER_DENY/…) |
| `runtime_enforced` | Boolean(이번 Part=Critical Mutual Exclusion·Allow/Deny만 true) |
| `sod_rule_ref` | 후속 SoD 규칙 참조(Part 6) |

## 3. 열거형 / 타입

- **type**: `MUTUALLY_EXCLUSIVE` · `TOXIC_COMBINATION_REF` · `ALLOW_DENY_CONFLICT` · `SCOPE_CONFLICT` · `ACTOR_TYPE_CONFLICT` · `CUSTOM`.
- **severity**: `CRITICAL` · `HIGH` · `MEDIUM` · `LOW`.
- **runtime_enforced 이번 Part 범위**: `MUTUALLY_EXCLUSIVE`(Critical) · `ALLOW_DENY_CONFLICT` → true; 그 외 → 메타데이터만(Part 6 SoD 집행).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Allow/Deny 충돌 해소(Deny 우선 substrate) | `DENY_SCOPE`·`1=0` 센티넬(default-deny) | 부분 substrate | `TeamPermissions.php:234`·`:290,303` |
| 위임상한(권한 상호 clamp) | `clampActions`·`reclampTeamMembers` | 부분(상한 clamp·SoD 아님) | `TeamPermissions.php:396-402,779-800` |
| Conflict 메타데이터(type·A·B·severity·resolution·SoD ref) | — | **ABSENT(순신규)** | — |
| 진짜 2-eyes/SoD 워크플로 | — | **ABSENT** — "approve"=action grant일 뿐 승인 워크플로 아님 | EXISTING §1.1 |

★현행에는 **Allow/Deny 우선순위 substrate(default-deny·`1=0` 센티넬)** 만 있고, 명시적 Conflict 카탈로그(Mutual Exclusion·Toxic Combination·Actor Type Conflict)와 SoD 규칙은 부재. EXISTING §1.1이 확인하듯 "approve" action은 grant일 뿐 **진짜 2-eyes 승인/SoD 워크플로가 아님**(재확인·오탐 금지).

## 5. 설계 원칙 / 결정

- **이번 Part 범위 제한**: `MUTUALLY_EXCLUSIVE`(Critical)·`ALLOW_DENY_CONFLICT`만 Runtime Guard 반영. Toxic Combination·Scope/Actor Conflict는 메타데이터 등재만 → 실 집행은 Part 6 SoD(중복 SoD 엔진 신설 금지·`sod_rule_ref`로 연계).
- **Allow/Deny → Deny 우선**: 충돌 시 Explicit Deny가 Allow를 이김(ADR §6.9·default-deny substrate 확장).
- **same_scope_only**: 서로 다른 scope의 권한은 충돌로 오판하지 않음(과잉 차단 방지).
- Conflict는 Exclusion(§EXCLUSION·A가 B 명시 제외)과 구별 — Conflict는 대칭적 상호 배타, Exclusion은 방향성 있는 명시 배제.
- Golden Rule: default-deny substrate 확장, 후속 SoD와 Contract만 연결.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Conflict 메타데이터(type 6종·severity·resolution·sod_rule_ref)·Toxic Combination = 순신규 ABSENT.
- 진짜 SoD/2-eyes 승인 워크플로 부재(EXISTING §1.1·오탐 금지) — Part 6 대상.
- **BLOCKED_PREREQUISITE**: SoD 집행은 Part 6 + Part 1 Decision Core 신설 후 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
