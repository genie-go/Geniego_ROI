# DSAR — Effective Permission Snapshot (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule · Part 1 D-2 재플래그 금지.

---

## ① 목적

**Subject × Resource × Action에 대해 "그 순간 실제로 계산된 Allow/Deny 결과"를 그 근거 사슬·버전과 함께 불변으로 고정.** Definition Snapshot(정의)·Grant Snapshot(부여)이 각각의 재료라면, Effective Snapshot은 **해소 결과(Resolution Result)의 시점 고정**이다. 현행은 `effectiveForUser :366`·`effectiveScope :236`이 **온디맨드로 계산되나 미영속·미캐시**(전수조사 §3 Effective-Set: EXISTS·계산·미영속) — 즉 결과가 남지 않아 사후 재현이 불가능하다. ★**현재 Grant/Definition으로 과거 Snapshot을 덮어쓰기 금지** — 스냅샷은 계산 당시의 입력 버전을 함께 박제한다.

## ② Canonical 필드

`EFFECTIVE_PERMISSION_SNAPSHOT`

| # | 필드 | 설명 |
|---|---|---|
| 1 | `effective_snapshot_id` | 스냅샷 식별자 |
| 2 | `subject` | 대상 주체 |
| 3 | `effective_actor` | 실효 Actor(위임/대행 해소 후) |
| 4 | `resource` | 자원 |
| 5 | `resource_version` | 자원 버전 |
| 6 | `action` | 동작 |
| 7 | `effective_allow_set` | 실효 Allow 집합 |
| 8 | `effective_deny_set` | 실효 Deny 집합(Allow보다 우선) |
| 9 | `source_chains` | 각 결과의 출처 사슬(Grant/Group/Bundle/Hierarchy) |
| 10 | `hierarchy_group_bundle_versions` | 계층/그룹/번들 버전 참조 |
| 11 | `constraints` | 적용 제약 |
| 12 | `resolution_result` | 해소 결과(열거형 §③) |
| 13 | `captured_at` | 캡처 시각 |
| 14 | `immutable_digest` | 불변 다이제스트([Digest 문서](DSAR_APPROVAL_PERMISSION_DIGEST.md)) |

## ③ 열거형

- **resolution_result**: `ALLOW / DENY / NOT_APPLICABLE / INDETERMINATE`(Default Deny·Deny overrides — ADR §D-5).
- **combining precedence**: `DENY_OVERRIDES` → `MOST_SPECIFIC` → `EXPLICIT_OVER_INHERITED`(versioned combining strategy).
- **action**: `view / create / update / delete / approve / export / execute / manage`(`TeamPermissions.php ACTIONS :39`).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| Allow 계산(resolver) | `effectiveForUser`(`TeamPermissions.php:366`) | CANONICAL(Resolver) | EXISTS(계산·미영속) |
| scope 해소 | `effectiveScope :236-265`·`scopeSql :286-293`·`scopeSqlNamed :299-307`·`scopeChannelProduct :315-322` | ROW/DATA_SCOPE | EXISTS(4핸들러 소비) |
| Deny(실효) | `1=0` 센티넬(`:290,303`)·`DENY_SCOPE :234` | — | PARTIAL(first-class deny set 부재) |
| effective_actor | admin bypass `resolveAdminByToken`(`UserAuth.php:2998`)·team_role(`roleOf :120-131`) | CANONICAL(admin SSOT) | PARTIAL(위임 해소 축 없음) |
| PEP(runtime 결과) | 중앙 RBAC `index.php:553-603`(roleRank `:573-576`·write `:590-596`·tenant `:619`) | CANONICAL(PEP) | EXISTS(런타임·미영속) |
| `effective_allow_set`/`effective_deny_set` 영속 | Effective-Set 온디맨드·**미영속·미캐시** | — | **ABSENT(영속체)** |
| `resource_version`/`hierarchy_group_bundle_versions` | 자원/계층/그룹/번들 버전 축 부재 | — | **ABSENT** |
| `source_chains` | 결과별 출처 사슬 영속 없음 | — | **ABSENT** |
| `captured_at`/`immutable_digest`/Snapshot 자체 | 시점 스냅샷 테이블 없음 | — | **ABSENT(순신규)** |

**커버리지 = 계산은 EXISTS·영속/시점 고정은 0.** 결과가 남지 않아 "그 순간 왜 Allow였는가"는 재현 불가.

## ⑤ 설계 원칙

- **★과거 Snapshot 덮어쓰기 금지** — 현재 Grant/Definition으로 재계산해 과거 결과를 갱신하면 감사 근거가 변조된다. Snapshot은 계산 당시 입력 버전을 함께 고정.
- **Default Deny + Deny overrides + Most Specific** — 결합 전략은 versioned.
- **Effective-Set 영속은 계산기(`effectiveForUser`)를 확장** — 중복 Resolver 신설 금지(Golden Rule·ADR §D-1).
- **Scope Intersection(Expansion Guard)** — 결합은 교집합이며 권한 확장 금지.
- **Permission ≠ Authority**: 실효 Allow는 "동작 가능"이지 금액 승인 한도(Part 5)가 아니다.
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 ABSENT(영속체)**: Effective Allow/Deny Set·Source Chain·자원/계층/그룹/번들 Version·시점 Digest 순신규(계산은 있으나 미영속).
- **G2 PARTIAL**: Deny가 `1=0` 센티넬로만 표현 → first-class Deny Set 필요.
- **G3 BLOCKED_PREREQUISITE(RP-002)**: 자원 Version/Decision 결합은 Part 1 Decision Core + Canonical Resource Version Registry 부재로 공회전.
