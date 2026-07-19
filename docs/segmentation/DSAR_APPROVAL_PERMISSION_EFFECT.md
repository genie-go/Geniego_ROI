# DSAR — Permission Effect (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 Resolution에서 산출하는 **효과의 정형 열거와 결합(combining) 규칙**. Deny 우선·Default Deny·UI 힌트와 서버 permit의 엄격 분리를 강제한다. Effect는 Resolution Pipeline의 Precedence/Combining Strategy가 소비하는 핵심 축이다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `effect` | 효과 값(§3) |
| `precedence_class` | 결합 우선순위(DENY > ALLOW) |
| `server_enforced` | 서버 permit 여부(UI_HINT_ONLY=false) |
| `missing_effect_default` | 누락 시 기본값 = `DENY`(fail-closed) |
| `scope_breadth` | 동일/광범위 scope 비교용 폭(MostSpecific 판정) |

## 3. 열거형 / 타입

**effect**: `ALLOW` · `DENY` · `CONDITIONAL_ALLOW` · `UI_HINT_ONLY`.

**결합 규칙**:
- `DENY`가 동일하거나 더 광범위한 scope의 `ALLOW`보다 **우선**(Deny overrides).
- `UI_HINT_ONLY`는 **서버 permit이 아님** — 서버측 재검증 필수.
- effect 누락/미해석 = **Deny**(fail-closed).
- `CONDITIONAL_ALLOW`는 조건(scope/Risk Control) 충족 시에만 permit.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| DENY(부분·fail-closed) | `DENY_SCOPE`·`1=0` 센티넬 | 부분 substrate | `TeamPermissions.php:234`·`:290,303` |
| ALLOW(grant) | `acl_permission` INSERT(replacePerms) | EXISTS | `TeamPermissions.php:325-336` |
| 서버 enforce 우선 | index.php 중앙 RBAC(PEP)·`guardTeamWrite` | CANONICAL | `index.php:553-603`·`index.php:82` |
| UI_HINT_ONLY | FE `writeGuard.js`/`planMenuPolicy.js`/`MenuVisibilityContext` | UI_HINT_ONLY(서버 미러) | GROUND_TRUTH §2 |

★**정직**: 현 코드의 Deny는 **`1=0` 센티넬**로 표현(first-class explicit-deny row 부재·Deny PARTIAL). `effect` 열거·`precedence_class`·`CONDITIONAL_ALLOW`·`UI_HINT_ONLY` 정형 구분 = **순신규 ABSENT**. writeGuard(UI)는 289차 P1에 서버 배선(`index.php:82` guardTeamWrite)으로 실증됨 — UI_HINT_ONLY≠서버 permit 원칙이 이미 substrate로 존재.

## 5. 설계 원칙 / 결정

- **Deny overrides**: 동일/광범위 scope에서 DENY가 ALLOW를 항상 이김.
- **missing = DENY**: effect 부재는 fail-closed 기본값.
- **UI_HINT_ONLY는 서버 permit 아님**: FE 힌트는 서버 재검증 없이는 무효(ADR §6.9·289차 writeGuard 서버배선으로 실증).
- Explicit Deny를 first-class Entity로 신설(현 `1=0` 센티넬 대체).
- Golden Rule: DENY_SCOPE/센티넬을 explicit-deny로 정형화(중복 정책엔진 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: effect 4값 열거·precedence·first-class Explicit Deny = 순신규.
- **BLOCKED_PREREQUISITE**: 실 Combining/Precedence 엔진은 Resolution Pipeline + Decision Core 신설 후 RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
