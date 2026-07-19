# DSAR — Permission Grant (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_GRANT`는 **특정 Subject/Grantee가 특정 Permission을 실제로 보유하게 되는 부여 레코드**다. Bundle/Role/Group에서 파생되었든 직접 부여되었든, 모든 "권한 보유"의 단일 표현체다. Grant는 grant type·grantee type·permission version·scope·constraints·effect·reason·business justification·요청/승인/부여 주체·유효기간·사용횟수·검토여부·취소가능성·digest를 담아, "누가 무엇을 왜 어떤 근거로 언제까지 가질 수 있는가"를 완결적으로 증거화한다.

★**매핑 정본**: `acl_permission` row = **Grant substrate**. 현행 `replacePerms`가 `acl_permission`에 INSERT하는 (subject×menu_key×actions) 행이 곧 실존 Grant다. Grant 엔티티는 이 substrate를 **정형화·버전화·증거화**하는 것이지 새 부여 저장체를 발명하는 것이 아니다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `grant_id` | Canonical 식별자 |
| `tenant_id` | 귀속 테넌트(모든 grant 귀속·격리) |
| `grant_type` | ③ 열거형 |
| `grantee_type` | ③ 열거형 |
| `grantee_ref` | 부여 대상 참조(subject/role assignment/service account/…) |
| `permission_ref` | 대상 Permission Definition(Canonical Code) |
| `permission_version_ref` | 대상 Permission Version(고정) |
| `scope` | 적용 scope(row/data/field/tenant/… · Intersection) |
| `constraints` | 조건(시간/환경/amount/currency · P4 ABAC) |
| `effect` | ALLOW / DENY(Explicit Deny 우선) |
| `reason` / `business_justification` | 부여 사유·업무 정당화 |
| `requested_by` / `approved_by` / `granted_by` | 요청·승인·부여 주체(위조불가 신원) |
| `valid_from` / `valid_to` | 유효기간 |
| `max_use_count` | 최대 사용 횟수(Temporary/Emergency) |
| `review_required` / `review_due_at` | 검토 필요·기한 |
| `revocable` | 취소 가능 여부 |
| `source_ref` | 파생 원천(Bundle/Role/Group version) |
| `current_version_id` | 활성 [`GRANT_VERSION`](DSAR_APPROVAL_PERMISSION_GRANT_VERSION.md) |
| `status` | ACTIVE/SUSPENDED/EXPIRED/REVOKED |
| `digest` | 불변 무결성 해시 |

## ③ 열거형

**`grant_type`**: `DIRECT` · `ROLE_DERIVED_REFERENCE` · `GROUP_DERIVED` · `BUNDLE_DERIVED` · `DELEGATED_REFERENCE` · `TEMPORARY` · `EMERGENCY` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT` · `INTEGRATION` · `BATCH` · `MIGRATED`

**`grantee_type`**: `CANONICAL_SUBJECT` · `USER_ACCOUNT_REF` · `ROLE_ASSIGNMENT_REF` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `API_CLIENT` · `GROUP_REF`

**`effect`**: `ALLOW` · `DENY`(Deny overrides Allow)

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| **Grant 레코드 자체(정본 매핑)** | **`acl_permission` row = Grant substrate**(replacePerms INSERT) | **EXISTS(Grant)** | `TeamPermissions.php:325` |
| grant 대상(subject×menu×action) | `acl_permission`(subject_type/subject_id/menu_key/actions) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171` |
| scope(row/data) | `data_scope`·`effectiveScope`·`scopeSql` | ROW/DATA_SCOPE_CANDIDATE | `TeamPermissions.php:160-322`, `:236-265`, `:286-293` |
| effective set 계산(부여 결과 해석) | `effectiveForUser`(온디맨드·미영속) | EXISTS(계산·미영속) | `TeamPermissions.php:366` |
| granted_by / 위조불가 신원 | `index.php` 미들웨어 auth_key 주입 | CANONICAL(PEP) | `index.php:591-593` |
| 부여상한(자기권한 초과 부여 차단) | `putMemberPermissions`(403 DELEGATION_EXCEEDED)·`clampActions` | 위임상한 확장점 | `TeamPermissions.php:628-647`, `:396-402` |
| SERVICE_ACCOUNT/API_CLIENT grant 재료 | api_key scopes(write:*·write:ingest·…) | CANONICAL(프로그래매틱 RBAC) | `Keys.php:191,204`, `UserAuth.php:4307`, `index.php:577` |
| Explicit DENY(first-class) | `1=0` 센티넬만(deny row 부재) | PARTIAL | `TeamPermissions.php:290,303`(scope), 전수조사 §3 Deny PARTIAL |
| **grant_type/grantee_type 열거형** | — | — | **ABSENT** (Direct/Group 암묵·13종 미구분) |
| **permission_version_ref·digest·source_chain** | — | — | **ABSENT** |
| **valid_from/to·max_use_count·review_required** | — | — | **ABSENT** |

★전수조사 §3: **Grant = EXISTS**("acl_permission INSERT · replacePerms `:325`"). Grant 엔티티의 나머지 정형화(type 열거·version·유효기간·사용횟수·digest·first-class deny)는 순신규.

## ⑤ 설계원칙

- **Golden Rule(정본)**: `acl_permission` row(`replacePerms :325`)를 Grant substrate로 승격·확장 — **별도 Grant 저장체/부여 엔진 신설 금지**. 부여상한 봉인(`:628-647` DELEGATION_EXCEEDED fail-closed)은 모든 grant_type에 상속(자기 권한 초과 부여 불가).
- **Explicit Deny 우선**: `effect=DENY`는 first-class row로 승격(현행 `1=0` 센티넬 대체) · Deny overrides Allow · Precedence=MostSpecific.
- **Scope Intersection·Expansion Guard**: grant scope는 grantee 본래 scope와 교집합 — 확장 금지(`:234` DENY_SCOPE 원칙 계승).
- **위조불가 신원**: `granted_by`/`approved_by`는 서버측 도출 신원(`index.php:591-593` auth_key)만 사용 — 클라이언트 헤더/리터럴 폴백 금지.
- **Permission ≠ Role ≠ Authority**: `ROLE_DERIVED_REFERENCE`는 Role을 **참조**만(P3 Adapter) · Role Assignment를 Grant가 소유하지 않음. 금액 승인 가부는 P5 Authority(별개 축).
- **Grant 변경 In-place 금지**: 모든 변경은 [`GRANT_VERSION`](DSAR_APPROVAL_PERMISSION_GRANT_VERSION.md) 발행(불변·무후퇴).

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: Grant를 Part 1 Authorization Decision/Snapshot/Evidence에 Binding하려면 선행 Decision Core + Canonical Action/Resource Registry 신설 필요(Commit-time Revalidation 공회전).
- grant_type/grantee_type 13종·7종 열거형·permission version 링크·유효기간·사용횟수·검토·digest·first-class deny = **전부 ABSENT/PARTIAL**.
- effective set이 `effectiveForUser`로 계산되나 **미영속·미캐시**(전수조사 §3) — version-aware Cache 순신규.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.
