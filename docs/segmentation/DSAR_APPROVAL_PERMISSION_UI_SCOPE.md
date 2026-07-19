# DSAR — Permission UI Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 UI에 투영되는 방식(Menu/Page/Component/Button visibility·enabled·field visibility/editability·Tab·Action Hint)을 정형화한다. **★이 엔티티는 전부 `UI_HINT_ONLY`** — UI 표시/비표시는 사용자 편의·발견성 힌트일 뿐 접근 통제가 아니다. **UI에 버튼이 없어도 직접 API 호출을 허용하지 않는다(서버 재검증 필수·ADR §6.9)**. 289차 세션이 `guardTeamWrite`를 서버 전역 미들웨어로 배선해, FE writeGuard의 UI 힌트를 서버가 실제로 미러·강제함을 실증했다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `ui_scope_code` | UI Scope 식별자 |
| `ui_element_type` | MENU/PAGE/COMPONENT/BUTTON/FIELD/TAB/ACTION_HINT |
| `element_ref` | 대상 UI 요소 참조(menu_key 등) |
| `backing_permission_code` | 이 힌트가 반영하는 Canonical Permission Code |
| `visibility` | 표시 여부(hint) |
| `enabled` | 활성 여부(hint) |
| `field_visibility` | 필드 노출(hint) |
| `field_editability` | 필드 편집 가능(hint) |
| `hint_only` | **항상 true(Mandatory)** — 서버 재검증 없이 접근 판정 불가 |
| `server_mirror_ref` | 대응 서버 enforcement 지점(PEP) |

## 3. 열거형 / 타입

- **ui_element_type**: `MENU` · `PAGE` · `COMPONENT` · `BUTTON` · `FIELD` · `TAB` · `ACTION_HINT`.
- **hint semantics**: `SHOW`/`HIDE`·`ENABLED`/`DISABLED`·`EDITABLE`/`READONLY` — **전부 non-authoritative**.
- **enforcement_class**: `UI_HINT_ONLY`(고정) — 절대 `AUTHORITATIVE` 값 불가(Mandatory Control).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| write 버튼/동작 UI 게이트 | FE `writeGuard.js` | UI_HINT_ONLY(서버 미러됨) | EXISTING §2 `writeGuard.js` |
| team_role UI 정책 | FE `teamRolePolicy.js` | UI_HINT_ONLY | EXISTING §2 `teamRolePolicy.js` |
| plan 기반 메뉴 노출 | FE `planMenuPolicy.js` | UI_HINT_ONLY(서버 미러) | EXISTING §1.4·§2 |
| 메뉴 가시성 | `MenuVisibilityContext` | UI_HINT_ONLY(cosmetic·가시성≠접근통제) | EXISTING §2 |
| **서버 미러 강제(정본)** | `guardTeamWrite` 전역 미들웨어 → 403 `TEAM_READ_ONLY` | CANONICAL(서버 강제·UI 힌트를 실제 봉인) | `index.php:82`·`UserAuth.php:1167` |
| menu_key(UI 지향 식별자) | MENU_CATALOG 26메뉴 | 정형화 필요(Canonical Code 아님) | `TeamPermissions.php:55-82` |
| field visibility/editability·Tab·Action Hint 정형모델 | — | **ABSENT(순신규)** | — |

★FE UI 정책(writeGuard/teamRolePolicy/planMenuPolicy/MenuVisibilityContext)은 **cosmetic 힌트**이며, 실제 봉인은 `index.php:82`가 호출하는 서버 `guardTeamWrite`(`UserAuth.php:1167`)가 수행한다(member 읽기전용 mutating 직접 API 우회 차단).

## 5. 설계 원칙 / 결정

- **UI_HINT_ONLY 불변**: 모든 UI Scope 레코드는 `hint_only=true`. UI 부재를 접근 거부 근거로 삼지 않음 — 반드시 `server_mirror_ref`(PEP)로 재검증.
- 각 UI 힌트는 `backing_permission_code`로 서버 Permission에 종속 — UI 단독으로 권한을 창출/확대 불가.
- field visibility/editability는 API 응답 필드 제약(§API_SCOPE response_field_constraints)과 정합돼야 함(UI만 가려도 API가 열려 있으면 결함).
- Golden Rule: 기존 FE 정책 파일·`guardTeamWrite`·index.php:82 미러를 확장, 중복 UI 게이트 프레임워크 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `ui_element_type` 전체·field-level visibility/editability·Action Hint 정형모델·`backing_permission_code` 링크 = 순신규 ABSENT.
- 현행은 write/menu 수준 coarse 힌트 — 컴포넌트·필드 정밀 매핑 미착수(설계만).
- **BLOCKED_PREREQUISITE**: 서버 Permission Definition/Resolution 신설 후 UI 힌트가 참조할 Canonical Code 확보 필요 — **RP-002**.
- Part 1 D-2 위험 4건(FE writeGuard UI-only 포함) = 289차 P1~P4 해소 — 재플래그 금지.
