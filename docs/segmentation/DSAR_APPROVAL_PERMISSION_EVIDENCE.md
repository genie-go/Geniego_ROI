# DSAR — Permission Evidence (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule(auth_audit_log=Evidence substrate·단 변경만·per-request 결정 미감사) · Part 1 결합.

---

## ① 목적

**한 건의 Authorization Decision이 "어떤 Permission 근거로 · 어떤 매칭/거부 스냅샷으로 · 어떤 검사 결과를 거쳐" 도출됐는지 재구성 가능한 불변 증거 묶음.** Part 1 Authorization Evidence/Digest에 Permission Resolution Result를 결합하는 축이다. 현행 Evidence substrate = `auth_audit_log`(SSOT·`UserAuth::logAudit`)이나 **PARTIAL** — permission **변경**(team_permissions_set 등)만 기록하고 **per-request 인가 결정/거부(deny at gate)는 미감사**(ADR §1, 전수조사 §3 Evidence). 즉 "요청이 왜 허용/거부됐는가"의 결정 증거가 없다.

## ② Canonical 필드

`PERMISSION_EVIDENCE`

| # | 필드 | 설명 |
|---|---|---|
| 1 | `permission_evidence_id` | 증거 식별자 |
| 2 | `authorization_decision_id` | 근거 결정(Part 1) |
| 3 | `resolution_result_id` | 해소 결과 |
| 4 | `required_permission_snapshot` | 요구 Permission 스냅샷([Snapshot](DSAR_APPROVAL_PERMISSION_SNAPSHOT.md)) |
| 5 | `matching_grant_snapshots` | 매칭된 Grant 스냅샷([Grant](DSAR_APPROVAL_PERMISSION_GRANT_SNAPSHOT.md)) |
| 6 | `matching_deny_snapshots` | 매칭된 Deny 스냅샷 |
| 7 | `effective_permission_snapshot` | 실효 스냅샷([Effective](DSAR_APPROVAL_EFFECTIVE_PERMISSION_SNAPSHOT.md)) |
| 8 | `hierarchy_group_bundle_version_refs` | 계층/그룹/번들 버전 참조 |
| 9 | `dependency_result` | 의존 검사 결과 |
| 10 | `exclusion_result` | 배제 검사 결과 |
| 11 | `conflict_result` | 충돌 검사 결과 |
| 12 | `scope_result` | Scope 검사 결과 |
| 13 | `constraint_result` | 제약 검사 결과 |
| 14 | `actor_type_result` | Actor 유형 검사 결과 |
| 15 | `client_result` | 클라이언트 검사 결과 |
| 16 | `permission_digest` | Permission 다이제스트 |
| 17 | `immutable_digest` | 불변 다이제스트([Digest](DSAR_APPROVAL_PERMISSION_DIGEST.md)) |

## ③ 열거형

- **각 *_result**: `PASS / FAIL / NOT_APPLICABLE / INDETERMINATE`.
- **decision outcome**: `GRANTED / DENIED`(Default Deny·Deny overrides).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| Evidence 저장체 | `auth_audit_log`(SSOT·`UserAuth::logAudit`) | CANONICAL(Evidence substrate) | **PARTIAL — 변경만 기록·per-request 결정/거부 미감사** |
| deny at gate(거부 사건) | 중앙 RBAC `index.php:553-603`(write 게이트 `:590-596`·`/v421/keys :583-586`)·team_role 전역 `guardTeamWrite`(`UserAuth.php:1167`·`index.php:82` 403 `TEAM_READ_ONLY`) | CANONICAL(PEP) | **거부 실집행되나 감사 미기록** |
| `required_permission_snapshot` | Permission Snapshot 부재 | — | **ABSENT** |
| `matching_grant_snapshots`/`matching_deny_snapshots` | Grant/Deny 스냅샷 부재 | — | **ABSENT** |
| `effective_permission_snapshot` | Effective 스냅샷 미영속 | — | **ABSENT** |
| `authorization_decision_id`/`resolution_result_id` | Part 1 Decision 저장체 코드 0 | — | **BLOCKED_PREREQUISITE** |
| dependency/exclusion/conflict/scope/constraint/actor/client result | scope 검사만 실존(`scopeSql :286-293`)·나머지 검사 축 부재 | ROW/DATA_SCOPE | PARTIAL(scope만)·나머지 **ABSENT** |
| `permission_digest`/`immutable_digest` | [Digest](DSAR_APPROVAL_PERMISSION_DIGEST.md) 순신규 | — | **ABSENT** |

## ⑤ 설계 원칙

- **★per-request 인가 결정/거부 감사 = 최우선 Gap** — `auth_audit_log`는 변경만 기록. `index.php:553-603` PEP가 실제로 거부(deny)하나 그 사건이 남지 않는다 → Evidence 재구성 불가. 결정/거부 이벤트를 `auth_audit_log`에 **확장 기록**(SSOT 유지·중복 로그 신설 금지).
- **Evidence는 스냅샷 참조로 구성** — 가변 현재값 참조 금지(재해석 방지).
- **auth_audit_log SSOT 확장**(Golden Rule) — 별도 감사 저장소 신설 금지.
- **Permission ≠ Authority**: Evidence는 Permission 검사 증거이지 금액 승인 근거(Part 5)가 아니다.
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 PARTIAL(핵심)**: `auth_audit_log`가 변경만 감사·**per-request 결정/거부 미감사** → 결정 Evidence 부재. SSOT 확장이 실 엔진의 최초 착수점.
- **G2 ABSENT**: required/grant/deny/effective 스냅샷·dependency/exclusion/conflict/constraint/actor/client 검사 결과·Digest 순신규.
- **G3 BLOCKED_PREREQUISITE(RP-002)**: `authorization_decision_id`·`resolution_result_id`가 지목할 Part 1 Decision/Resolution 저장체 코드 0.
