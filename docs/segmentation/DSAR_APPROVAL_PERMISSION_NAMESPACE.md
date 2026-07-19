# DSAR — Permission Namespace (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission Code의 **구조·유일성·예약어·wildcard 정책**을 지배하는 Canonical Namespace. 모든 Permission Definition은 정확히 하나의 Canonical Code(`{DOMAIN}:{RESOURCE}:{ACTION}`)를 가진다. 서로 다른 rank/vocab 3체계(plan RANK·api_key roleRank·team_role)와 team-menu `menu_key`를 **단일 주소공간**으로 수렴시키는 정규화 계약.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `namespace_code` | Namespace 식별자 |
| `code_format` | `{DOMAIN}:{RESOURCE}:{ACTION}` 고정 |
| `prefix` | 도메인 prefix |
| `separator` | `:` (고정·escape 규칙) |
| `reserved_words` | 예약어 집합(wildcard·시스템 예약) |
| `wildcard_policy` | wildcard 허용 경계(기본 금지·api_key 프로그래매틱 예외) |
| `parent_namespace` | 상위 Namespace(계층) |
| `domain` | 소속 도메인 |

## 3. 열거형 / 타입

- **code format**: `{DOMAIN}:{RESOURCE}:{ACTION}` — 예 `APPROVAL:DECISION:APPROVE`, `FINANCIAL:SETTLEMENT:EXECUTE`, `CATALOG:PRODUCT:UPDATE`.
- **wildcard_policy**: `NONE`(기본) · `RESTRICTED_PROGRAMMATIC`(api_key 한정) · (일반 사용자 grant wildcard = 금지).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| ACTION 어휘 | `ACTIONS` 8동작 | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:39` |
| RESOURCE 근접 | `menu_key`(26 MENU_CATALOG) | 정형화 필요 | `TeamPermissions.php:55-82` |
| wildcard 제한 정본 | api_key scopes `write:*`/`read:*` | 제한범위(§6.8) | `Keys.php:191,204`·`UserAuth.php:4307` |
| 프로그래매틱 scope 예 | `write:ingest`·`write:attribution`·`write:mta`·`admin:keys` | VALIDATED | `Keys.php:191,204` |

★**정직 Gap**: 현재 `menu_key`는 **Canonical Code가 아님**(UI 메뉴 지향 식별자). `{DOMAIN}:{RESOURCE}:{ACTION}` 3-segment 주소체계·`separator`·`reserved_words`·`parent_namespace`·`code_format` 강제 = **순신규 ABSENT**. api_key scopes는 `{scope}:{qualifier}` 2-segment로 Canonical 3-segment와 형식 불일치.

## 5. 설계 원칙 / 결정

- **1 Permission = 1 Canonical Code**(전역 유일). menu_key·plan feature key·api_key scope는 Legacy Alias로 Code에 매핑(confidence 기록).
- wildcard는 Namespace 정책에서 기본 금지 — api_key 프로그래매틱 RBAC만 `RESTRICTED_PROGRAMMATIC` 예외(ADR §6.8 부합·일반 부여 금지).
- reserved_words(wildcard·시스템 예약)는 Definition Code로 사용 불가.
- Golden Rule: 새 주소공간을 만들되 3 rank/vocab 체계를 **매핑**으로 흡수(중복 Namespace 신설 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `code_format`·`separator`·`reserved_words`·`parent_namespace` 강제 = 순신규.
- 3 분리 rank/vocab(plan·api_key·team_role)·menu_key의 Canonical Code 정규화 = 미착수(설계만).
- **BLOCKED_PREREQUISITE**: 실 정규화 엔진은 Canonical Action/Resource Registry 신설 후 RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
