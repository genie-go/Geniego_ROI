# DSAR — Candidate Deduplication (§53)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §53 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★§53 은 **전제가 성립하지 않는다** — 규칙 10 정면 적중

원문(`:1938`): *"동일 Subject가 **다음 여러 경로로** Candidate가 될 수 있다."*

**실측: 경로가 0개다.** 7종 전부 레포에 존재하지 않는다 → **동일 Subject 가 두 경로로 후보가 되는 상황 자체가 발생 불가**.

> ★**규칙 10** — 현행이 "중복 0"인 것은 **중복을 막아서가 아니라 후보를 만드는 경로가 하나도 없어서**다. 이를 **"§53 준수"로 계산하면 갭이 정의상 소멸**한다. §76 이 요구한 탐지 대부분이 "1개도 없어서 0"인 것과 동형이다.

### 현행 dedup 술어 1건 — **축이 다르다**

| 항목 | 실측 | 축 |
|---|---|---|
| `Mapping.php:278-283` | `approvals_json[].user === $actor` → **409** (`"already approved by this approver"`) · **REAL** | 🔴 **"이미 승인한 사람"의 재승인 차단**이지 **"중복 후보"의 병합이 아니다** |

**§53 이 요구하는 것은 차단이 아니라 병합**이다(`:1948` *"중복 Task로 생성하지 말고 Candidate Source와 Relationship Type을 **여러 개 연결**하라"*). 현행 `:278-283` 은 **두 번째를 거절**한다 — **정확히 반대 동작**이다. 이식 대상이 아니다.

### ★복수 연결을 표현할 수단이 **스키마 차원에서 봉인**돼 있다

| 자산 | 실측 | 함의 |
|---|---|---|
| `team.manager_user_id` | **팀당 1칸**(DDL `TeamPermissions.php:148` MySQL/`:168` SQLite) | 한 팀에 매니저 **1명** — Direct/Functional 병존 표현 불가 |
| `app_user.team_id` | **단일 컬럼 = 1인 1팀**(`TeamPermissions.php:175`) · 이력·유효기간 0 | 다중 소속 불가 |
| `data_scope` | 🔴 **`UNIQUE(tenant_id,subject_type,subject_id)`(`:164`)** | **단일행이 스키마로 강제** — 정책이 아니라 **UNIQUE 가 복수를 금지** |
| `pm_projects.owner_user_id` | **단일값**(migration `20260526_168_001:13`) | Direct/Functional/Project 병존 표현 불가 |
| `approvals_json` | `{user, ts}` **2키 JSON 배열**(`Mapping.php:285`) | Source·Relationship Type 슬롯 없음 · **인덱스·as-of 질의 불가** |

🔴 **§53 의 "여러 개 연결"은 현행 어느 자산에서도 표현할 수 없다.** N:1 컬럼을 N:N 으로 바꾸는 것은 **§53 이 아니라 §51 Canonical 선언의 선행 과제**다.

### ★유일한 인접 N:N 선례 — **도메인 상이**

| 자산 | 실측 | 판정 |
|---|---|---|
| `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` | migration `20260526_168_005` — **태스크 배정 N:N** | `KEEP_SEPARATE_WITH_REASON` — **태스크 역할이지 매니저 관계 아님**. ★**형태(N:N+role ENUM)만 이식 가능 · 값·의미·소유자는 신규** |
| `CRM.php:597-643` union-find | 아이덴티티 병합 | 🔴 **고객 전용**(직원 아님) · DSAR "Data Subject" = **고객**. 직원 병합/정규화 계층 **0** |

## 1. 원문 전사 + 판정 — **원문 7종**(Candidate 경로)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Direct Manager | `manager_id`·`reports_to` **grep 0** · `team.manager_user_id` 는 **팀 1칸**이며 Type 표현 불가 · git 삭제 이력 **0** | `ABSENT` |
| 2 | Position Supervisor | `supervisor_id` **grep 0** · Position 개념 전역 0(`position_idx` = **PM 태스크 정렬순서**) | `ABSENT` |
| 3 | Functional Manager | Functional 축 0 · `team_role='manager'`(`UserAuth.php:168`) = **롤 라벨**(관계 아님·Type 없음) | `ABSENT` |
| 4 | Organization Head | `department_head_id`·`head_id` **grep 0** · `ORGANIZATION_*` **backend 전역 grep 0** · `team` 에 **`parent_team_id` 없음** → 조직 트리 자체가 없다 | `CONTRACT_ONLY` |
| 5 | Program Manager | 🔴 **주석 팬텀** — `PM/Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐). **규칙 8 적중 — 주석을 근거로 삼지 마라** | `ABSENT` |
| 6 | Regional Manager | 🔴 **형태 유사 최대 함정** — `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313`)가 **`region`·`country` 와 같은 테이블에 공존**. 실제는 **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** | `NAME_ONLY` |
| 7 | Cost Center Manager | Cost Center 축 0 · `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 매니저 권한 아님 | `ABSENT` |

**실측 개수: 7 / 7 전사.** (측정기 분모 7 · 원문 대조 7 · 전사 7 — **3자 일치**)
원문이 `Cost Center Manager` 로 끝나며 **`evidence` 로 끝나지 않는다**(`:1946`) → **규칙 4 반대편향 회피 — `evidence` 추가하지 않음.**
★**측정기가 세지 않은 산문 규칙 2건**(`:1948` 병합 규칙 · `:1950` Requirement Binding 예외) — 불릿이 아니므로 분모 밖. **§2 에 규칙으로 반영.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 5 · `CONTRACT_ONLY` 1(4) · `NAME_ONLY` 1(6).

## 2. 규칙

- 🔴 **§53 전체 = `ABSENT`.** 7경로 전량 부재 → **dedup 대상 0**. **"중복 없음"을 "기능 충족"으로 계산 금지**(규칙 9).
- 🔴 **`Mapping.php:278-283` 을 §53 구현으로 계산 금지.** 축이 다를 뿐 아니라 **동작이 반대**다 — §53 은 **병합**(`:1948`)을 요구하고 현행은 **거절**(409)한다.
- ★**원문 `:1948` 병합 규칙**: 동일 Subject 가 복수 경로로 후보가 되면 **중복 Task 생성 금지 · Candidate Source 와 Relationship Type 을 여러 개 연결**하라. → 후보 엔터티는 **Subject 1행 + Source/Type N행**(N:N)이 **설계 전제**다. `team.manager_user_id`(1칸)·`app_user.team_id`(1칸)·`data_scope`(`UNIQUE` `:164`)를 **그대로 재사용하면 이 전제가 스키마에서 이미 깨진다**.
- ★**원문 `:1950` 예외**: 각 Relationship 이 **별도 Approval Requirement 를 충족해야 한다면 개별 Requirement Binding 을 유지**하라. → 병합은 **Task 축**이고 Binding 은 **Requirement 축**이다. 🔴 **현행 `required_approvals` 는 유일 생산자 `Mapping.php:210` 이 리터럴 `2` 고정** → **Binding 을 구분할 수단이 없다**(§51 #7 `NAME_ONLY`). **Requirement 모델 선언이 §53 예외 규칙에 선행.**
- 🔴 **Subject 동일성 판정을 actor 문자열로 하지 마라.** `Mapping::actorId:36-53` 3분기(`apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` `:49`)는 **동일 자연인에 복수 문자열**을 부여한다 → dedup 이 경로 전환으로 무력화. **canonical subject = `app_user.id`** 로 판정(§52 §2 라이브 확인 선결과 동일 사안).
- 🔴 **`CRM.php:597-643` union-find 를 직원 병합에 재사용 금지** — **고객 전용**이며 DSAR "Data Subject"=고객이다. 직원 아이덴티티는 `app_user.id`+`email`+**외부 상관자 3컬럼**(`oidc_sub`·`oidc_provider`·`scim_external_id` · 정의부 `EnterpriseAuth.php:64-65`)뿐이고 **병합 계층 0**.
- ★**N:N 신설 시 `pm_task_assignees`(migration `…168_005`) 형태만 참조** — `role ENUM` 선례. **도메인·값·소유자는 신규**(태스크 역할 ≠ 매니저 관계).
- 🔴 **`wms_warehouses.manager` 를 Regional Manager 로 오독 금지** — `region`·`country` 동거로 인한 최대 함정. 판독 술어 0 = **저장된 라벨**.
