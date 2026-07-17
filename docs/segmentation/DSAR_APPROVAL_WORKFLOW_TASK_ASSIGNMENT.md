# DSAR — Task Assignment (§37)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §37 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Assignment 엔티티 | `task_assignment`·`assigned_to`·`assignee` **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 조직/그룹 실체 | **`team` 테이블 REAL**(TeamPermissions.php:145 MySQL / :168 SQLite — `tenant_id`·`name`·`team_type`·`manager_user_id`·`status`) | `VALIDATED_LEGACY`(재사용 강제) |
| 역할(role) | `app_user.team_role` **owner > manager > member**(TeamPermissions.php:13,21-25) · API 키 역할 `viewer<connector<analyst<admin`(index.php RBAC) | `VALIDATED_LEGACY` |
| 조직 유형 | `TeamPermissions::TEAM_TYPES` 17종(:43-48 — `internal_super`·`brand`·`marketing`·`sales*`·`logistics`·`finance`·`partner_agency`·`partner_live`·`partner_supplier`·`partner_distribution`·`custom`) | `VALIDATED_LEGACY` |
| 데이터 범위(scope) | `TeamPermissions::DATA_SCOPES` 9종(:41 — `company·brand·team·campaign·product·channel·warehouse·partner·own`) + **외부 실배선 6곳**(AdPerformance.php:26 · Wms.php:1291 · OrderHub.php:261 · Catalog.php:981,982,983) | `VALIDATED_LEGACY` |
| 위임 상한 강제 | `assignableMap`(TeamPermissions.php:354) → `putMemberPermissions` 교집합 검증 → 초과 시 403 `DELEGATION_EXCEEDED`(:645) | `VALIDATED_LEGACY` |
| 🔴 authorization precheck | `acl_permission` 8동작 매트릭스에 **`approve` 동작이 존재**(TeamPermissions.php:39 `ACTIONS`)하고 팀 템플릿이 실제 부여(:708,711,714,716,717)하나 — **`acl_permission` 을 읽는 외부 코드 grep 0**(TeamPermissions.php 자체 CRUD 제외). 승인 3핸들러(`Mapping::approve`·`AdminGrowth::approvalDecide`·`Alerting::decideAction`) 어디도 조회하지 않음 | `CONTRACT_ONLY` |
| 라운드로빈·부하분산 | `round_robin`·`load_balanc` **grep 0** | `NOT_APPLICABLE` |
| 테넌트 격리 | `Mapping::approve` REAL(:253 `WHERE id=? AND tenant_id=?`) ↔ **`admin_growth_approval` 은 `tenant_id` 컬럼 자체 없음**(:1324 `WHERE id=?` 전역) | 혼재 — §37 `required tenant` 의 결번 실증 |

**★축 주의 — `team`/`data_scope` 는 실자산이나 Assignment 가 아니다.** `TeamPermissions` 는 **"이 사용자가 이 메뉴/데이터에 접근 가능한가"**(정적 인가)를 답한다. 원문 §37 은 **"이 Task 를 누가 처리해야 하는가"**(동적 배정)를 요구한다. 인가는 배정의 **전제**(`authorization precheck`)이지 배정 자체가 아니다. `team`/`team_role`/`DATA_SCOPES` 를 §37 커버로 계산하면 역산이다 → **`candidate role`/`candidate group`/`candidate organization` 의 해석 소스로만 재사용**하고, 배정 엔티티는 신설한다.

**★`approve` 동작의 실측 = 부여되나 검사되지 않음.** `acl_permission` 매트릭스는 `approve` 를 부여하고 마케팅팀·영업팀·물류팀·재무팀 템플릿이 이를 실제로 담지만(TeamPermissions.php:708-717), **그 권한을 조회하는 승인 엔드포인트가 0개다.** 즉 §37 `authorization precheck` 가 요구하는 "배정 전 인가 확인"의 **계약은 이미 있고 게이트만 없다** → `CONTRACT_ONLY`. **이는 `NOT_APPLICABLE`(부재)과 다르다 — 신설이 아니라 배선이 답이다.**

## 1. 원문 전사 + 판정 — **원문 21종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | task_assignment_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_task_id | 부재(§36 Task 자체 부재) | `NOT_APPLICABLE` |
| 3 | assignment type | 부재 — 14종 전부(§37 Type 축 문서 참조) | `NOT_APPLICABLE` |
| 4 | candidate subject | 부재 · 인접 신원 = `Mapping::actorId`(Mapping.php:36-50 · `apikey:{id}`/`user:{email}` **위조불가**) | `LEGACY_ADAPTER`(신원 해석 위임) |
| 5 | candidate role | 부재(후보) · 해석 소스 = `team_role` owner/manager/member(TeamPermissions.php:13) | `LEGACY_ADAPTER` |
| 6 | candidate group | 부재(후보) · 해석 소스 = `team` 테이블 + `app_user.team_id`(TeamPermissions.php:145,22) | `LEGACY_ADAPTER` |
| 7 | candidate organization | 부재(후보) · 해석 소스 = `TEAM_TYPES` 17종(TeamPermissions.php:43-48) | `LEGACY_ADAPTER` |
| 8 | required tenant | 부재(Assignment) · 현행 혼재 — `Mapping` REAL(:253) ↔ `admin_growth_approval` **tenant_id 없음**(:1324) ↔ `paddle_events` tenant 검증 부재(:99) | `NOT_APPLICABLE` |
| 9 | required workspace | 부재 — workspace 개념 자체 grep 0 | `NOT_APPLICABLE` |
| 10 | required legal entity | 부재 — legal entity 개념 grep 0 | `NOT_APPLICABLE` |
| 11 | required environment | 부재(Assignment) · 인접 = `Db::envLabel()`(CRM.php:789 등 응답 `_env`) = **환경 라벨링이지 배정 조건 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | required program scope | 부재 · 인접 = `DATA_SCOPES` 9종(TeamPermissions.php:41) — **데이터 범위이지 프로그램 범위 아님** | `LEGACY_ADAPTER`(범위 어휘 재사용) |
| 13 | required financial threshold | 부재 — 금액 임계 기반 배정 grep 0. 현행 승인은 **금액 무관 단일 경로**(`Mapping` 리터럴 `2` :209 · `AdminGrowth` 단일결재 암묵) | `NOT_APPLICABLE` |
| 14 | assignment rule reference | 부재 — 규칙 테이블 없음. 현행은 **"누가·몇 명"이 코드 상수** | `NOT_APPLICABLE` |
| 15 | assignment rule version | 부재 — 규칙 자체가 없으므로 버전도 없음 | `NOT_APPLICABLE` |
| 16 | authorization precheck | **계약 존재·게이트 0** — `acl_permission` `approve` 동작(TeamPermissions.php:39,708-717) 부여되나 외부 판독 grep 0 | `CONTRACT_ONLY` |
| 17 | assigned_at | 부재 | `NOT_APPLICABLE` |
| 18 | valid_from | 부재 · 인접 시간창 선례 = `verify_expires_at`(Dsar.php:201,348) · `connector_token.expires_at`(Connectors.php:160) | `NOT_APPLICABLE` |
| 19 | valid_to | 부재 — **§38 "만료된 Assignment로 Claim" 차단의 전제** | `NOT_APPLICABLE` |
| 20 | status | 부재(Assignment) | `NOT_APPLICABLE` |
| 21 | evidence | 부재 · 인접 감사 = `auth_audit_log` 단일 SSOT(TeamPermissions.php:19 · `/auth/audit-logs` 노출) | `LEGACY_ADAPTER`(감사 기록 위임) |

**실측 개수: 21 / 21 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 13 · 인접 위임(`LEGACY_ADAPTER`) 6 · 계약만(`CONTRACT_ONLY`) 1 · 도메인 분리(`KEEP_SEPARATE_WITH_REASON`) 1 · **현행 충족 0**.

## 2. 규칙

- 🔴 **`team`/`team_role`/`TEAM_TYPES`/`DATA_SCOPES` 를 재구현 금지.** 조직·역할·그룹·범위는 **231차에 엔터티화된 실자산**이며 `scopeSql*` 은 이미 6곳 외부 실배선(AdPerformance.php:26 · Wms.php:1291 · OrderHub.php:261 · Catalog.php:981-983)이다. `candidate role`/`candidate group`/`candidate organization`/`required program scope` 는 **여기서 해석**하고, Assignment 는 그 결과를 **참조만** 한다. 승인 도메인에 두 번째 조직 모델을 만들면 AL-19 위반이다.
- 🔴 **`authorization precheck` 는 신설이 아니라 배선이다.** `acl_permission` 에 `approve` 동작이 이미 있고 팀 템플릿이 실제로 부여한다 — **없는 것은 권한이 아니라 그 권한을 읽는 코드다.** 새 권한 축을 만들면 부여된 `approve` 는 영원히 죽은 채로 남고 권한 모델이 2벌이 된다.
- 🔴 **`candidate subject` 는 `Mapping::actorId`(Mapping.php:36-50) 규율을 따를 것 — 재작성 금지.** 이 함수는 `auth_key`(서버 조회·위조불가) → `UserAuth::authedUser` 세션 도출 → **미확인 시 null → 403 fail-closed**(Mapping.php:245-250)의 3단이다. 재작성하면 **289차 G-01 이 닫은 우회로(익명 승인 2회 = 정족수 충족)를 다시 연다.** 이것은 신규 작성이 아니라 **위치 이동**(공용 트레이트/서비스 추출)이다.
- 🟠 **`candidate subject` 신설 시 `actor_type` 을 반드시 포함하라.** 현행 `actorId` 는 `apikey:`/`user:` 를 **동등 계수**하여 **API 키 2개로 Maker-Checker 충족이 가능**하다(스펙 §20 위배). §37 이 후보 주체를 정의하는 시점이 이 결번을 닫을 자리다.
- 🔴 **`required tenant` 를 선택 필드로 두지 마라.** `admin_growth_approval` 은 **`tenant_id` 컬럼 자체가 없어** 조회도 결정(:1324 `WHERE id=?`)도 전역이다. 원문이 `required tenant` 를 필수로 못박은 이유가 현행에 실재한다.
- **`required financial threshold` 는 §37 의 신규 능력이다.** 현행 승인은 금액과 무관한 단일 경로다 — "기존에 있는데 못 찾은 것"이 아니라 **진짜 결번**이다(`Mapping` 정족수 리터럴 `2` Mapping.php:209).
- **`round_robin`/`load_balanced` 는 원문 스스로 `_REFERENCE` 접미**(§37 Type 축) — 참조 유형이므로 **중복 정의 금지**.
- 🔴 **13종 "있다고 가정"하고 배선 금지.**
- ⚠️ **`evidence` 는 부록이 아니다.** 원문 필드 목록의 **마지막 항목**이며 21번째 필수 필드다.
