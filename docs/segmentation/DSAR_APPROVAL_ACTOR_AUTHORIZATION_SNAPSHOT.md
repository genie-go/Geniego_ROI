# DSAR — Approval Actor Authorization Snapshot (§21·필드 22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §21 — 원문 그대로 전사.
> 🔴 **분모 불일치**: **REQ 집계 21 ↔ 원문 실측 22 — 원문이 정본.** REQ §7 의 `21` 은 정정 대상(숫자 임의 정합 금지).

## 0. 현행 실측 (file:line)

| 스냅샷에 필요한 재료 | 현행 | 분류 |
|---|---|---|
| **Role Version** | **부재**(`role_version` grep 0) | **NOT_APPLICABLE(부재→신설)** |
| **Assignment / Assignment Scope** | **부재**(`assignment_scope` grep 0) | **NOT_APPLICABLE** |
| **Policy Version** | **부재**(`policy_version` grep 0) | **NOT_APPLICABLE** |
| **AUTHORIZATION_\* 명명 엔티티** | **부재**(`AUTHORIZATION_[A-Z]` grep 0) | **NOT_APPLICABLE** |
| 현재 role(스냅샷 아님·가변) | `api_key.role` `Db.php:942-955` · `team_role` `TeamPermissions.php:145` · `PlanPolicy::RANK` `PlanPolicy.php:17,20,28`(🔴 fail-open `:12`) | **재료**(현재값만 · 이력 없음) |
| scope(스냅샷 아님·가변) | `api_key.scopes_json` `Db.php:942-955` · `acl_permission.menu_key/actions` `TeamPermissions.php:152,169` | **재료** |
| IdP 그룹→역할 | `sso_group_role_map` `EnterpriseAuth.php:43,59,70` — REAL·**가변** | **재료** |
| **Authentication assurance / 세션 / 디바이스 / 네트워크존 / 리스크** 를 승인 결정에 기록 | **부재**(grep 0) · `mfa_policy` 는 존재(`UserAuth.php:909,3573`)하나 **로그인 게이트** 용도 | **NOT_APPLICABLE** |
| 승인 시점 권한 기록 실태 | `Mapping::approve` `:285` — `approvals_json[] = {user, ts}` **2필드뿐** · role/scope/policy **미기록** | **MIGRATION_REQUIRED** |

**핵심**: 현행은 **권한의 "현재값"만** 존재하고 **"그때의 값"이 없다**. Snapshot 은 부재가 아니라 **원리적으로 구성 불가** — 버전 축(Role Version/Policy Version)이 없어 고정할 대상 자체가 없다.

## 1. 결정 시점 권한 고정 — 현행 불만족 명시

> 스펙 §4.6: **승인자는 승인 시점에 유효한 권한을 가져야 한다**
> 스펙 §61: **Actor Authorization Snapshot 보존** · **"현재 Role 로 과거 승인을 재해석하지 마라"**

**현행 대비 판정 = 불만족(원리적)**. 근거 3단:
1. `Mapping::approve` 는 승인 시 **role/scope 를 읽지도 기록하지도 않는다**(`:285` = user·ts 만).
2. 기록했더라도 `api_key.role`·`team_role` 은 **제자리 UPDATE 되는 가변 컬럼**이며 이력 테이블이 없다 → **사후 조회 시 현재값이 반환**된다.
3. 따라서 "이 승인은 당시 유효한 권한으로 이뤄졌는가" 는 **재현 불가**. 승인 후 role 을 강등/승격하면 **과거 승인의 정당성이 소급 변조**된다(감사 관점 치명).

### 1-1. 스펙 §21 필수 필드 — 원문 전사 (실측 22)

`APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT`

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `snapshot_id` | 12 | policy version |
| 2 | `approval_actor_id` | 13 | tenant scope |
| 3 | `approval_case_id` | 14 | workspace scope |
| 4 | `approval_requirement_id` | 15 | legal entity scope |
| 5 | `authorization_request_reference` | 16 | program scope |
| 6 | `authorization_decision_reference` | 17 | environment scope |
| 7 | role | 18 | financial threshold |
| 8 | role version | 19 | field access profile |
| 9 | assignment | 20 | `valid_at_decision_time` |
| 10 | permission | 21 | `immutable_hash` |
| 11 | policy | 22 | `evidence` |

> 스펙 §21 원문 말미: **"승인자의 현재 권한으로 과거 승인을 재해석하지 마라."**

> 🔴 **원문 실측 22 ↔ REQ 집계 21 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

**현행 커버리지 = 22 중 0.** §0 실측과 정합: 스냅샷 엔티티 grep 0 이며, 나아가 **#8 role version · #12 policy version · #9 assignment 축이 부재**하여
위 3단 판정대로 **원리적으로 구성 불가**다. 즉 "22 중 0" 은 미구현이 아니라 **선행 축 부재**의 결과다.

## 2. 규칙

- **Snapshot 은 값 복사(copy-on-decide)** 여야 한다 — 참조(FK to 가변 role)로 대체 금지. 참조는 재해석을 허용하므로 요구를 만족하지 못한다.
- **선행 부재를 먼저 해소**: Role Version·Policy Version 축 없이 Snapshot 테이블만 만들면 **빈 스켈레톤**(287차 교훈).
- **`PlanPolicy` fail-open 위에 Snapshot 을 얹지 말 것** — 미설정을 허용으로 읽는 소스를 고정하면 **fail-open 을 영구 증거로 박제**한다.
- **MFA/인증 ≠ 인가**(5-2 §4.7 유지) — assurance 는 Snapshot 의 **입력**이지 권한 자체가 아니다.
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.
