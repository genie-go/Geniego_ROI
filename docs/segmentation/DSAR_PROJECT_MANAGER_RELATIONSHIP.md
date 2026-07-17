# DSAR — Project Manager Relationship (§22)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §22 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

**대전제(ⓑ)** — Manager Relationship 축이 레포에 존재하지 않는다. `manager_id`·`reports_to`·`supervisor_id` **전부 0** · `rebate` **전역 0** · git 삭제 이력 **0**(팬텀도 유물도 아니다 — 존재한 적이 없다).

### ★§22 유일 인접자산 = `pm_projects.owner_user_id` → **`PARTIAL`**

| 축 | 실측 | 증거 |
|---|---|---|
| 정의 | `owner_user_id VARCHAR(64) DEFAULT NULL` | migration `20260526_168_001_create_pm_projects.sql:13` |
| 인덱스 | `KEY idx_pm_proj_owner (owner_user_id)` | 동 migration `:21` |
| 쓰기 | INSERT 컬럼목록 `:58` · 값 `:66` · PATCH 화이트리스트 `:113` | `backend/src/Handlers/PM/Projects.php` |

🔴 **4결격 — 전부 명시한다(하나라도 빠지면 "오너 컬럼 있음 = 매니저 있음"으로 오독된다)**

1. **판독 술어 0** — `WHERE owner_user_id` **grep 0**. 인가·승인라우팅·감독 어디에도 이 값이 걸리지 않는다. `SELECT *`(`Projects.php:94`)로 **반환은 되나** 효과가 없다 → **저장된 라벨**.
2. **무검증 자유문자열** — `validId()` 미적용. `Shared::validId`(`PM/Shared.php:180`)는 실재하나 **프로젝트 id 에만** 걸린다(`Projects.php:93`·`:107`). `owner_user_id` 는 INSERT `:66`·PATCH `:112-117` 모두 body 원값 그대로. **`app_user` FK 없음** · 프론트 `PMSettings.jsx:166-167` = 맨 `<input>`.
3. **기본값이 생성자** — `:66` `$body['owner_user_id'] ?? $g['user_id']` → **미설정 행과 명시적 자기지정 행을 구분할 수 없다**. "오너가 있다"는 통계는 **전부 참**이 되며 무의미하다.
4. **단일값**(규칙 10) — 컬럼 1칸. Direct/Functional/Project Manager **병존 표현 불가**. 현행이 "1개"인 것은 **정책이 아니라 여러 개를 표현할 수단이 없어서**다.

### ★오염원 — 커버 계산 금지

- **`budget_amount`/`budget_currency`**(migration `:14-15`) = **프로젝트 예산액**이지 **매니저 결재 권한이 아니다**. 축이 다르다.
- **`pm_tasks` DDL 에 assignee·owner·manager 컬럼 없음**(`created_by` 뿐). 배정은 별도 N:N `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(migration `…168_005`) = **태스크 역할이지 매니저가 아니다**.
- **`pm_raid.owner`**(`PM/Enterprise.php:42`,`:60`) = RAID 담당자 **자유문자열**.
- 🔴 **`sponsor` grep 0** — 히트 전량이 **Amazon 광고상품 `Sponsored Products`**(`Alerting.php:23` · `Connectors.php:2686`,`:2721`,`:2727`) · **LinkedIn `urn:li:sponsoredAccount`**(`Connectors.php:2529`). §22 sponsor 검색 시 **최우선 오염원**.

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | project reference | `pm_projects.id` PK(migration `:5`) 실재. 단 **오너가 프로젝트 행의 컬럼**이라 "관계 레코드"가 없다 → 참조할 관계가 없다 | `PARTIAL` |
| 2 | project organization | 부재 — 조직 축 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend 전역 grep 0) | `ABSENT` |
| 3 | project role | 부재 — `owner_user_id` **단일값**, 역할 표현 없음. `pm_task_assignees.role` 은 **태스크 역할**(다른 축) | `ABSENT` |
| 4 | project budget scope | `budget_amount`·`budget_currency`(migration `:14-15`) = **프로젝트 예산액** · 매니저 결재 권한 축 **0** | `PARTIAL` |
| 5 | project resource scope | 부재 — `pm_task_assignees` 워크로드 집계(`Enterprise.php:18` 주석)는 **가용량 계산**이지 매니저 권한 범위 아님 | `ABSENT` |
| 6 | project start and end date | `start_date`·`target_date`(migration `:10-11` · 쓰기 `Projects.php:64-65` · PATCH `:112-113`) + `completed_at`(`:12`) 실재. 🔴 단 **프로젝트 일정이지 Manager Relationship 유효기간이 아니다** | `PARTIAL` |
| 7 | project legal entity | 부재 — Legal Entity 축 전역 0. `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:307`,`:499`) · FK·감독관계 전무 | `ABSENT` |
| 8 | project sponsor reference | 부재 — **`sponsor` grep 0**(히트 전량 Amazon/LinkedIn 광고상품) | `ABSENT` |
| 9 | approval routing eligibility | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`**(`resolveApprover`/`approval_chain`/`routeApproval` **0**) | `ABSENT` |
| 10 | valid period | 부재 — `effective_from` 은 **`kr_fee_rule` 전용**(`Db.php:898`) · `effective_to`/`valid_to`/`valid_from` **grep 0** | `ABSENT` |

**실측 개수: 10 / 10 전사.** (측정기 분모 10 · 원문 대조 10 · 전사 10 — **3자 일치**.)
커버리지 = **부재 7 · 부분 3 · 커버(`VALIDATED_LEGACY`) 0.**

## 2. 규칙

- 🔴 **`pm_projects.owner_user_id` 를 Project Manager 로 계산 금지.** 4결격(판독술어 0·무검증·기본값=생성자·단일값) 중 **①이 치명적**이다 — 읽는 코드가 없으므로 **값이 무엇이든 시스템 거동이 동일**하다. 이를 커버로 세면 갭이 정의상 소멸하는 역산이다(규칙 9).
- 🔴 **`budget_amount` → "project budget scope 충족"으로 매핑 금지.** 프로젝트 예산액과 매니저 결재 권한은 **다른 축**이며, 매핑하는 순간 승인 한도가 **프로젝트 총예산으로 오해**된다.
- 🔴 **`start_date`/`target_date` → "valid period 충족"으로 매핑 금지.** 프로젝트 일정과 **관계 유효기간**은 독립이다. 매니저는 프로젝트 도중 교체될 수 있고, 프로젝트 종료 후에도 관계 이력은 **as-of 질의 대상으로 남아야** 한다.
- ★**원문 금지 — *"Project 종료 후 Manager Relationship을 Active로 유지하지 마라"*** : 현행에 대응 위험이 **구조적으로 잠복**한다. `status ENUM(...,'completed','archived')`(migration `:9`)·`completed_at`(`:12`)이 종료를 표현하지만 **`owner_user_id` 와 아무 연동이 없다** → 종료 프로젝트의 오너 값은 **영구 잔존**한다. 현재는 판독 술어가 0이라 무해하나, **판독을 배선하는 순간 종료 프로젝트의 오너가 활성 권한을 얻는다**. 신설 관계는 **`status`/`completed_at` 가 아니라 관계 자신의 `valid_to` 로 종료를 판정**해야 한다.
- **신규 스키마 경로 없음** — `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`. 🔴 **`ensureTables` 는 데이터 변환·백필을 하지 않는다** → 기존 `owner_user_id` 값을 신설 관계로 **이행할 수단이 없다**. MySQL/SQLite **두 방언 수기 중복 작성 의무**.
- **감사 선례는 재사용** — `Projects.php:72-82` 가 `auditLog` 로 `entity_type`·`action`·`diff` 를 남긴다. `pm_audit_log` = `tenant_id NOT NULL`(migration `20260526_168_008:7`)+`diff_json`(`:13`)+3인덱스(`:17-19`)+append-only. **신규 감사 저장소 신설 금지 — 이 경로 확장.**
- 🔴 **경로 접두 필수**: `backend/src/Handlers/PM/…` (**`backend/src/PM/` 는 존재하지 않는다** — 5-3-3-1 문서 25편에 오표기 전파).
