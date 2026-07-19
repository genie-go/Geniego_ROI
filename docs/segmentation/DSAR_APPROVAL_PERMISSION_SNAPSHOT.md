# DSAR — Permission Snapshot (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule(발명 아닌 조립) · Part 1 D-2 재플래그 금지 · ★**순신규**(현재 permission의 시점 스냅샷 부재).

---

## ① 목적

**Permission Definition의 "그때 그 버전의 정의"를 값 복사(copy-on-capture)로 고정**한다. Part 1 Authorization Decision이 "무엇을 요구했는가"를 판정할 때, 요구된 Permission의 **정의 자체가 결정 시점에 어떤 모습이었는지**를 불변으로 보존한다. 현행은 `acl_permission`(menu×action)의 **현재값만** 존재하고 시점 스냅샷·이력이 없어(§4), 정의가 사후 변경되면 과거 결정의 근거가 소급 변조된다. Snapshot은 이 소급 변조를 차단하는 **불변 재료**다. Definition을 In-place Update 금지(ADR §3)하고 Version으로 고정한 스냅샷을 남긴다.

## ② Canonical 필드

`PERMISSION_SNAPSHOT`

| # | 필드 | 설명 |
|---|---|---|
| 1 | `permission_snapshot_id` | 스냅샷 식별자 |
| 2 | `permission_definition_version` | 고정된 Definition Version(In-place Update 불가) |
| 3 | `code` | Canonical Code `{DOMAIN}:{RESOURCE}:{ACTION}` |
| 4 | `namespace` | Permission Namespace |
| 5 | `domain` | 도메인 |
| 6 | `resource_type` | 자원 유형 |
| 7 | `action` | 동작(열거형 §③) |
| 8 | `effect` | ALLOW / DENY |
| 9 | `risk` | 위험 등급 |
| 10 | `scope_requirements` | 요구 Scope 축(Tenant/Row/Field/Amount/Currency/Time …) |
| 11 | `constraints` | 제약(조건) |
| 12 | `dependencies` | 의존 Permission |
| 13 | `exclusions` | 상호배제 Permission |
| 14 | `implications` | 함의(보유 시 파생 허용) |
| 15 | `actor_restrictions` | 허용 Actor 유형 제한 |
| 16 | `lifecycle` | 생애주기 상태(열거형 §③) |
| 17 | `captured_at` | 캡처 시각 |
| 18 | `snapshot_digest` | 불변 다이제스트([Digest 문서](DSAR_APPROVAL_PERMISSION_DIGEST.md)) |

## ③ 열거형

- **action**(실존 vocabulary 재사용·`TeamPermissions.php ACTIONS :39`): `view / create / update / delete / approve / export / execute / manage`(manage=superset·view 자동포함 `:182-192`).
- **effect**: `ALLOW / DENY`(Deny overrides — ADR §D-5).
- **risk**: `LOW / MEDIUM / HIGH / CRITICAL`(순신규).
- **lifecycle**: `DRAFT / ACTIVE / SUSPENDED / DEPRECATED / RETIRED`(순신규·Definition 상태기계).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| code / namespace / domain / resource_type | `acl_permission.menu_key`(`TeamPermissions.php:152-159`·SQLite `:169-170`) — **`menu_key`는 UI 메뉴 식별자**이지 `{DOMAIN}:{RESOURCE}:{ACTION}` Canonical Code 아님 | CANONICAL_PERMISSION_SCOPE_CANDIDATE(정형화) | PARTIAL — Legacy Mapping(menu_key→Canonical Code) 필요 |
| action | `TeamPermissions.php ACTIONS :39`(8동작)·`MENU_CATALOG 26메뉴 :55-82` | CANONICAL_PERMISSION_SCOPE_CANDIDATE | EXISTS(team-menu 한정) |
| scope_requirements | `data_scope`(`:160-166`/`:171-172`·`DATA_SCOPES :41` 9축) | ROW/DATA_SCOPE_CANDIDATE | EXISTS(row 축만·4핸들러 소비) |
| effect | `1=0` 센티넬(`:290,303`)·`DENY_SCOPE :234` — first-class deny 부재 | — | PARTIAL |
| `permission_definition_version` | permission-schema 버전화 없음 | — | **ABSENT** |
| risk / constraints / dependencies / exclusions / implications / actor_restrictions | 정형 정의체 부재 | — | **ABSENT** |
| lifecycle | Definition 상태기계 부재 | — | **ABSENT** |
| `captured_at` / `snapshot_digest` / Snapshot 자체 | permission 시점 스냅샷/이력 테이블 없음 | — | **ABSENT(순신규)** |

**커버리지 = 시점 스냅샷 축 0.** 재료(`acl_permission`·`data_scope`)는 **현재값만** 존재하고 **Version 축이 없어** 고정할 대상 자체가 없다 → 미구현이 아니라 **선행 축(Definition Version) 부재의 결과**.

## ⑤ 설계 원칙

- **Snapshot은 값 복사(copy-on-capture)** — 가변 `acl_permission` row에 대한 FK 참조로 대체 금지(참조는 재해석을 허용).
- **선행 부재 먼저 해소**: Definition Version 축 없이 Snapshot 테이블만 만들면 빈 스켈레톤(287차 교훈).
- **Permission ≠ Role ≠ Authority**: 본 스냅샷은 Permission **정의**의 시점 고정이지 Role 부여(Part 3)·금액 Authority(Part 5)가 아니다.
- **Definition In-place Update 금지**(ADR §3) — 정의 변경은 새 Version → 새 스냅샷 대상.
- 실 구현 = 별도 승인세션(RP-002). 본 문서 코드변경 0.

## ⑥ Gap

- **G1 ABSENT**: Permission Definition/Version/Namespace/Canonical Code·risk/constraints/dependencies/exclusions/implications/actor_restrictions·lifecycle 정형 정의체 전부 순신규.
- **G2 PARTIAL**: `menu_key`(UI 지향) → Canonical `{DOMAIN}:{RESOURCE}:{ACTION}` Legacy Mapping(confidence 기록) 미수립.
- **G3 BLOCKED_PREREQUISITE(RP-002)**: 스냅샷을 소비할 Part 1 Authorization Decision/Snapshot 실 저장체·Decision Core가 코드 0 → 결합 상위는 공회전.
