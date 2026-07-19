# DSAR — Role Snapshot (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분(P1~P4·admin_roles 폐기) 재플래그 금지.

---

## ① 목적

Role Snapshot = **Role Definition의 특정 Version이 활성화·검토·인증되는 시점의 전체 상태를 불변으로 동결한 캡처**. "지금 이 역할이 무엇을 의미하는가"가 아니라 **"그 시점에 이 역할이 무엇을 의미했는가"**를 사후 재구성하기 위한 substrate.

- **순신규**: 레포에 **역할 스냅샷 개념 자체가 부재**하다. 가장 근접한 substrate인 `team_role`+`TeamPermissions`(`UserAuth.php:188`·`TeamPermissions.php:120-131`)조차 **현재 상태만 보유**하며 시점 동결·이력 재구성 수단이 없다(전수조사 §3 Snapshot=ABSENT).
- Role Definition/Version(별편 [`DSAR_APPROVAL_ROLE_VERSION_SNAPSHOT`](DSAR_APPROVAL_ROLE_VERSION_SNAPSHOT.md)) 위에서, 활성화·검토·인증·리스크 재평가 등 **감사 가능한 순간마다** Role의 전 필드를 동결한다.
- Role Snapshot은 **Role Permission Snapshot**(별편 3)·**Role Evidence**(별편 4)·**Role Digest**(별편 6)와 결합해 완결된다. 본 편은 Role Definition 축의 스냅샷 골격만 규정한다.

## ② Canonical 필드 (코드 0 · 구조 명세)

`ROLE_SNAPSHOT` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | role_snapshot_id | 스냅샷 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수·전역 스냅샷 금지) |
| 3 | role_definition_ref | 대상 Role Definition 참조 |
| 4 | role_version_ref | 동결 대상 Role Version 참조(별편 2) |
| 5 | registry_ref / namespace_ref | Role Registry·Namespace(`{DOMAIN}:{FUNCTION}:{ROLE}`) 스냅샷 |
| 6 | code / name / description | Canonical Code·표시명·설명 |
| 7 | purpose / responsibility | 역할 목적·책임 범위 |
| 8 | type / category | 역할 유형·분류(③ 열거형) |
| 9 | domain_mappings | 이 역할이 걸치는 Authorization Domain 집합 |
| 10 | actor_eligibility | 부여 가능 Actor 유형(HUMAN/API_CLIENT/SERVICE…) |
| 11 | risk / criticality | 리스크 등급·중요도 |
| 12 | permission_mappings | Role→Permission Definition Version 매핑 스냅샷(별편 3) |
| 13 | group_mappings / bundle_mappings | Permission Group·Bundle 매핑 스냅샷 |
| 14 | scope_requirements | 부여 시 요구 Scope 구조(실 Scope 값 아님·Part 3-4) |
| 15 | assignment_policy | 부여 정책 스냅샷(자동활성 금지 등) |
| 16 | ownership | Business/Technical/Security Owner 참조 |
| 17 | review_policy / certification_policy | 검토·인증 정책 스냅샷 |
| 18 | metadata / tags | 부가 메타·태그 |
| 19 | lifecycle | 스냅샷 시점 Lifecycle 상태(③) |
| 20 | captured_at | 캡처 시각(Business/System Time) |
| 21 | snapshot_digest | 스냅샷 무결성 다이제스트(별편 6) |

## ③ 열거형 (설계 · 코드 0)

- **type**: `PLATFORM` · `ADMINISTRATIVE` · `FUNCTIONAL` · `API_CLIENT` · `SERVICE`(선행 Registry 확정 후 봉인)
  - 근거 substrate: `team_role`(owner/manager/member) 3값 위계·`api_key role`(viewer/connector/analyst/admin)·`admin_level`(master/sub)의 정규화 대상.
- **category**: 도메인 분류(설계 예약 · Namespace `{DOMAIN}` 축과 정합)
- **actor_eligibility**: `HUMAN` · `API_CLIENT`(← api_key role) · `SERVICE`(Part 3-6) · `EXTERNAL_IDP`(← SSO group→role Adapter)
- **lifecycle**: `DRAFT` → `SUBMITTED` → `APPROVED` → `ACTIVE` → `SUSPENDED` → `DEPRECATED` → `RETIRED` → `ARCHIVED`
- **risk / criticality**: 등급 열거(설계 예약)

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Snapshot 축 | 최근접 substrate | §5.2 태그 | file:line (2문서) | 판정 |
|---|---|---|---|---|
| role definition/name/code | `team_role`+`TeamPermissions` | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188`·`TeamPermissions.php:120-131` | PARTIAL(문자열 const·정형화 대상) |
| type/actor(API_CLIENT) | `api_key.role` | CANONICAL(별개 actor) | `Keys.php:95`·`index.php:573` | PARTIAL |
| type(ADMINISTRATIVE 세분) | `admin_level` | SUB_ROLE_CANDIDATE | `UserAdmin.php:43-46` | PARTIAL |
| domain/category | AdminMenu ROLE_ENUM | CONSOLIDATION_REQUIRED(반쯤 死) | `AdminMenu.php:247`·rank `:74` | PARTIAL(rank 불일치) |
| actor(EXTERNAL_IDP) | SSO group→role | VALIDATED_IAM(Adapter) | `EnterpriseAuth.php:70-88` | ADAPTER |
| permission_mappings | acl_permission | PARTIAL(3분산) | `TeamPermissions.php:39,152-159` | PARTIAL |
| scope_requirements | data_scope | PARTIAL | `TeamPermissions.php:41,218-322` | PARTIAL |
| **snapshot 시점 동결 자체** | — | — | **ABSENT** | **ABSENT(순신규)** |
| version_ref | — | — | **ABSENT** | **ABSENT** |
| ownership | — | — | **ABSENT** | **ABSENT** |
| review/certification policy | — | — | **ABSENT** | **ABSENT** |
| snapshot_digest | — | — | **ABSENT**(개념=선행 Hash Chain 봉인기) | **ABSENT** |

> ★anti-pattern 회피: `plan 'admin'` god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)를 Role Snapshot의 type/eligibility로 승계 금지(§6.5 Role≠Plan). `admin_roles/user_roles`(`routes.php:1670`·`UserAdmin.php:596-599`)=289차 폐기·재부활 금지.

## ⑤ 설계원칙

- **불변(Append-only)**: 스냅샷 생성 후 직접 수정 금지. 변경은 새 스냅샷이지 덮어쓰기 아님. `AgencyPortal` 류 `revoked_at=NULL` 물리 소거 안티패턴 복제 금지.
- **Tenant 격리 절대**: `tenant` 필드 필수. `auth_audit_log`류 전역 누적 결함 미승계.
- **Snapshot ≠ 현재 재구성**: 현재 Role Definition으로 과거 스냅샷 대체 금지. 과거 의미는 스냅샷에서만 복원.
- **Role≠Permission≠Authority**: 본 스냅샷은 Role Definition 상태만 동결. 실 Subject 부여는 Binding(별편 7)·Part 3-3.
- **Golden Rule(Extend)**: 중복 스냅샷 스토어 신설 금지. `snapshot_digest`는 선행 Canonical Cryptographic Hash Chain 봉인기를 개념 재사용(별편 6).
- **forward-only**: `ensureTables` 경로는 생성만 하고 백필하지 않으므로 스냅샷은 시행일 이후 전방 축적만 가능(소급 스냅샷 불가).

## ⑥ Gap

- Role Snapshot 엔티티·시점 동결 로직·`captured_at` 인덱스·as-of 질의 = **전량 ABSENT**.
- Version 축(별편 2)·Owner·Review/Certification Policy·Digest = **ABSENT**(선행 신설 대상).
- Permission_mappings의 Permission **Version** 결합 = **BLOCKED_PREREQUISITE**(선행 Part 2 Permission Engine 실구현 부재).
- 실 Role Snapshot 엔진 = 선행 Registry/Version/Permission Engine 실구현 후 **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
