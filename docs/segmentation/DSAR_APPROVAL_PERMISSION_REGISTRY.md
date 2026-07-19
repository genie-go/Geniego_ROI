# DSAR — Permission Registry (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

플랫폼 전체 Permission의 **최상위 소유·식별·정책 경계**를 선언하는 Canonical Registry. Permission Definition/Namespace/Version/Category/Effect/Risk/Lifecycle 엔티티가 귀속되는 루트. 단순 문자열 나열이 아니라 **default-deny·wildcard 제한·snapshot/evidence/audit 필수**를 Registry 수준에서 강제하는 정책 컨테이너. 중복 Registry 신설 금지 — 실존 `TeamPermissions` MENU_CATALOG/ACTIONS/DATA_SCOPES를 team-menu 한정 substrate로 흡수·정규화.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `registry_code` | Registry 식별자(전역 유일) |
| `type` | Registry 분류(§3 열거) |
| `namespace_policy` | code format 정책(`{DOMAIN}:{RESOURCE}:{ACTION}`·separator·reserved words) |
| `supported_types` | 이 Registry가 수용하는 Permission type 집합 |
| `default_deny_enforced` | Boolean(항상 true·비활성 불가·Mandatory Control) |
| `wildcard_restricted` | Boolean(일반 grant wildcard 금지·api_key 프로그래매틱 예외만) |
| `snapshot_required` / `evidence_required` / `audit_required` | Boolean(전부 true·Mandatory Control) |
| `owner` | Registry 소유 주체(플랫폼/테넌트) |
| `active_version` | 현재 유효 Registry 버전 |
| `status` | Lifecycle 상태(§DSAR_APPROVAL_PERMISSION_LIFECYCLE) |
| `digest` | Registry 정의 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**registry type**: `PLATFORM` · `TENANT` · `APPROVAL` · `FINANCIAL` · `PAYMENT` · `SETTLEMENT` · `REBATE` · `CLAIM` · `CONTRACT` · `SECURITY` · `COMPLIANCE` · `ADMINISTRATION` · `DATA` · `REPORTING` · `INTEGRATION` · `CUSTOM`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Registry 컨테이너 | `TeamPermissions` MENU_CATALOG(26메뉴 서버 SSOT) | CANONICAL_PERMISSION_SCOPE_CANDIDATE(정형화) | `TeamPermissions.php:55-82` |
| supported actions vocabulary | `ACTIONS` 8동작(view/create/update/delete/approve/export/execute/manage·manage=superset) | 정형화 | `TeamPermissions.php:39`·자동 view 포함 `:182-192` |
| data 차원 정책 | `DATA_SCOPES` 9 dims | 정형화 | `TeamPermissions.php:41` |
| default-deny 강제 | `DENY_SCOPE`·`1=0` 센티넬 | 부분 substrate | `TeamPermissions.php:234`·`:290,303` |
| wildcard 제한 정본 | api_key scopes(`write:*`/`read:*`)=프로그래매틱 한정 | 제한범위(§6.8 부합) | `Keys.php:191,204`·`UserAuth.php:4307` |

★현재 substrate는 **team-menu 도메인 한정 Registry**이며, 플랫폼 전역 다도메인 Registry(PLATFORM/FINANCIAL/APPROVAL 등 16 type)와 `registry_code`·`active_version`·`digest`·snapshot/evidence 강제는 **순신규 ABSENT**.

## 5. 설계 원칙 / 결정

- Registry는 Permission의 소유·경계·정책만 선언 — 개별 Permission 판정 로직을 담지 않음(그것은 Definition/Resolution).
- default_deny·wildcard_restricted·snapshot/evidence/audit_required는 **고객 설정으로 비활성 불가**(Mandatory Control·ADR §6.16).
- `menu_key`는 Canonical Code가 아님 → Legacy Permission Mapping으로 정규화(confidence 기록·[`DSAR_APPROVAL_PERMISSION_NAMESPACE`](DSAR_APPROVAL_PERMISSION_NAMESPACE.md) 참조).
- Golden Rule: 중복 Registry/Resolver 신설 금지 — MENU_CATALOG/ACTIONS/DATA_SCOPES 확장·정규화.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `registry_code`/`type`(16종)/`active_version`/`digest`/snapshot·evidence 강제 = 순신규 ABSENT.
- **BLOCKED_PREREQUISITE**: 실 Registry 엔진은 선행 Decision Core + Canonical Action/Resource Registry 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
