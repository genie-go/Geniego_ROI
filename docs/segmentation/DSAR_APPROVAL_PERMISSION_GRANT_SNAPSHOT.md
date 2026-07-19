# DSAR — Permission Grant Snapshot (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule · Part 1 D-2 재플래그 금지.

---

## ① 목적

**"누가 · 어떤 Permission을 · 어떤 출처로 · 어떤 범위·유효기간에 부여받았는가"의 시점 고정.** Part 1 결정이 요구 Permission을 매칭할 때 대조하는 **부여 사실의 불변 스냅샷**이다. 현행은 `acl_permission` INSERT(`replacePerms :325`)로 부여를 표현하나 **Grant Version·Source Chain·유효기간·폐기/정지 상태가 없고**, 부여가 사후 교체되면 과거 결정이 근거했던 부여 상태가 소실된다. Grant Snapshot은 부여를 값 복사로 고정해 이 소실을 막는다.

## ② Canonical 필드

`PERMISSION_GRANT_SNAPSHOT`

| # | 필드 | 설명 |
|---|---|---|
| 1 | `grant_snapshot_id` | 스냅샷 식별자 |
| 2 | `grant_version` | 부여 버전 |
| 3 | `grantee` | 피부여 주체(user/team/member) |
| 4 | `permission` | 부여된 Permission(code + definition version 참조) |
| 5 | `source_type` | 부여 출처 유형(열거형 §③) |
| 6 | `source_chain` | 출처 사슬(위임/그룹/번들 경로) |
| 7 | `scope` | 부여 범위(Tenant/Row/Field/Amount/Time …) |
| 8 | `constraints` | 부여 제약 |
| 9 | `validity` | 유효기간(valid_from / valid_to) |
| 10 | `approval_ref` | 근거 승인 참조(Part 1 Decision) |
| 11 | `revocation_suspension_state` | 폐기/정지 상태(열거형 §③) |
| 12 | `captured_at` | 캡처 시각 |
| 13 | `digest` | 불변 다이제스트([Digest 문서](DSAR_APPROVAL_PERMISSION_DIGEST.md)) |

## ③ 열거형

- **source_type**: `DIRECT`(직접 부여) / `GROUP` / `BUNDLE` / `HIERARCHY` / `DELEGATED`(위임) / `ROLE_ADAPTER`(Part 3 Role→Permission 참조).
- **revocation_suspension_state**: `ACTIVE / SUSPENDED / REVOKED / EXPIRED`.
- **grantee subject_type**(실존 재사용·`TeamPermissions.php acl_permission :152-159`): `user / team / member`.

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| grantee / permission(부여 사실) | `acl_permission` INSERT(`TeamPermissions.php replacePerms :325`·UNIQUE `uq_acl :170`) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | EXISTS(Grant substrate·Direct) |
| source_type=DELEGATED / 위임 상한 | `assignableMap :354-360`·`putMemberPermissions :628-647`(403 `DELEGATION_EXCEEDED`)·`clampActions :396-402`·`reclampTeamMembers :779-800` | CANONICAL(fail-closed 위임) | PARTIAL(위임 상한만·Grant Version 없음) |
| scope | `data_scope`(`:160-166`·`DATA_SCOPES :41`) | ROW/DATA_SCOPE_CANDIDATE | EXISTS(row 축) |
| source_type=ROLE_ADAPTER | `app_user.team_role`(owner/manager/member·`roleOf :120-131`)·SSO group→role(`EnterpriseAuth`) | KEEP_SEPARATE(Part 3 Adapter) | PARTIAL |
| `approval_ref` | Part 1 Authorization Decision 저장체 미존재 | — | **BLOCKED_PREREQUISITE** |
| `grant_version` | Grant 버전화 없음 | — | **ABSENT** |
| `source_chain` | 출처 사슬 영속 없음 | — | **ABSENT** |
| `validity`(valid_from/to) | 부여 유효기간 컬럼 없음 | — | **ABSENT** |
| `revocation_suspension_state` | first-class 폐기/정지 상태 없음(replace로 교체·`:325`) | — | **ABSENT** |
| `captured_at` / `digest` / Grant Snapshot 자체 | 부여 시점 스냅샷 없음 | — | **ABSENT(순신규)** |

**커버리지 = 부여 시점 스냅샷 축 0.** 부여 사실 substrate(`acl_permission`)는 실재하나 **버전·유효기간·폐기상태 축이 없어** 시점 고정 불가.

## ⑤ 설계 원칙

- **Grant Snapshot = 부여의 값 복사** — 가변 `acl_permission` row 참조로 대체 금지.
- **Explicit Deny 우선**: Grant는 Allow 표현이며, Deny Entity([Evidence·Audit 문서 참조])가 항상 우선(Deny overrides·ADR §D-5).
- **위임 상한 무후퇴**: `putMemberPermissions :628-647`의 fail-closed `DELEGATION_EXCEEDED`는 정본 — 완화 방향 변경 금지.
- **Permission ≠ Role**: Grant는 Permission 부여 사실이지 Role Definition(Part 3)이 아니다 — Role은 Adapter로 Permission을 묶어 참조.
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 ABSENT**: Grant Version·Source Chain·유효기간(Temporary/Emergency Expiration)·폐기/정지 first-class 상태 순신규.
- **G2 PARTIAL**: 부여는 replace(`:325`)로 **교체**되어 이력 소실 — Version 축으로 append 전환 필요.
- **G3 BLOCKED_PREREQUISITE(RP-002)**: `approval_ref`가 지목할 Part 1 Authorization Decision 저장체 코드 0.
