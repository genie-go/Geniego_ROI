# DSAR — Reporting Line Version (§8)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §8 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **버전 모델이 없다. `version` 컬럼은 라벨이다** (규칙 7 — 컬럼이 있다 ≠ 모델이 있다)

| 컬럼 | DDL | **유일 생산자** | 판정 |
|---|---|---|---|
| `menu_defaults.version VARCHAR(32) NOT NULL` | `AdminMenu.php:120`(MySQL)/`:139`(SQLite) | `:308-309` **리터럴 `'baseline'` 고정** — `execute(['baseline-'.gmdate('YmdHis'), …, 'baseline', …])` | **버전이 아니라 라벨** |
| `ml_models.version VARCHAR(50) DEFAULT 'v1.0'` | `ModelMonitor.php:35` | `:305` — **하드코딩 데모 시드 배열**(`'v2.1'`,`'v1.8'`,`'v3.0'`,`'v1.5'`,`'v2.3'` `:297-301`) | **ML 아티팩트 라벨**(도메인 상이) |
| `risk_model_registry.model_version VARCHAR(100)` | `Db.php:451` | `Risk.php:151` — **seed 스텁**(`"risk_stub","v0"` · `seed()` `:143`) · **`tenant_id` 없음**(`Db.php:448-455`) | **ML 아티팩트 라벨**(도메인 상이) |

★**ⓑ 정정(경미)**: ⓑ 는 *"엔티티 `version` = `menu_defaults.version` 1건"* 이라 했으나 **이름 축으로는 3컬럼**이다(위 표). **결론은 그대로 유지되며 오히려 강화된다** — 3컬럼 **전부 리터럴/시드 고정 라벨**이고, `previous_version_id`·상태 전이·불변 해시가 **하나도 없다**. 즉 **능력 축으로는 버전 모델 0건**이다(규칙 7: 부재증명도 존재증명도 **이름이 아니라 능력으로**).

🔴 **`menu_defaults` 판독조차 버전을 안 본다**: `:584` `SELECT snapshot_data, version FROM menu_defaults ORDER BY created_at DESC LIMIT 1` = **최신승**이지 active 선택이 아니다. `version` 값은 **읽히기만 하고 판정에 쓰이지 않는다**.
🔴 **optimistic lock `version` grep 0** · **`effective_to`·`valid_to`·`valid_from` grep 0**(289차 재확인 — `Onsite.php:396` `invalid_token` 은 `valid_` 오탐).

### 시점 축 — **부재의 깊이가 다르다** (§38·§39·§40·§63 직결)

| 축 | 상태 | 교정 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有·질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | **질의 계층**(과거 복원 가능) |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV **단일행 덮어쓰기**(`:1804-1805`) | **저장 계층 신설** — 복원할 게 없다 |

> 🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.** §38 **Business/System Time 이중 시간축 = 전례 0.**

- ★**`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`backend/src/Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가** → `KV_ONLY`
- **`as_of` 2건 = 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`)이지 as-of 질의 아님

### ★`immutable_hash` 선례 — **알고리즘은 REAL · 스키마는 복제 금지**

| 선례 | 실측 | 이식 가능성 |
|---|---|---|
| `menu_audit_log.hash_chain CHAR(64)` | DDL `AdminMenu.php:128`(MySQL)/`:143`(SQLite) · **SHA-256 prev-chain** 생성 `:182-197`(`$prevHash = self::lastHash($pdo)` `:182`) · INSERT `:202` · `lastHash():214-219` | ✅ **알고리즘만** — 🔴**`tenant_id` 컬럼 없음** · 🔴**`lastHash():216` `SELECT hash_chain FROM menu_audit_log ORDER BY id DESC LIMIT 1` 에 tenant 술어 없음** → **스키마 복제 시 테넌트 교차 오염 상속**. 테넌트별 체인은 `WHERE tenant_id=?` **필수** |
| `schema_migrations.checksum VARCHAR(64)` | `Migrate.php:50` `hash('sha256', $sql)` · INSERT `:63-64`,`:116` · DDL `:145`/`:151` | ✅ **단일 해시 선례**(체인 아님) · 🔴**`Migrate` 이름 겹침 — DDL 적용기이지 도메인 데이터 이행기가 아니다** |
| `pm_audit_log` | migration `20260526_168_008` — `tenant_id NOT NULL`(`:7`)+`entity`+`diff_json`(`:13`)+3인덱스(`:17-19`)+append-only 주석(`:2-3`) | ✅ **테넌트 격리 REAL 선례** — **hash 는 없음** |

→ **권장 조합 = `pm_audit_log` 의 스키마(tenant_id NOT NULL·diff_json·인덱스) + `menu_audit_log` 의 알고리즘(SHA-256 prev-chain)**. 어느 한쪽만 베끼면 결함을 물려받는다.

### 🔴 이력 소멸의 정면 반례 (§55 직격)

`AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸** = §55 *"과거 Snapshot 대체 금지"* 정면 반례. **버전 설계 시 이 패턴을 절대 재현하지 마라.**

## 1. 원문 전사 + 판정 — **원문 24종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | reporting_line_version_id | 엔티티 부재 — `reporting_line` grep 0 · git 삭제이력 0 | `ABSENT` |
| 2 | reporting_line_definition_id | 상위 Definition 도 `ABSENT`([DSAR_REPORTING_LINE_DEFINITION.md](DSAR_REPORTING_LINE_DEFINITION.md)) → FK 대상 없음 | `ABSENT` |
| 3 | version_number | `version_number` grep 0. 인접 3컬럼 전부 **리터럴 고정 라벨**(`menu_defaults.version='baseline'` `AdminMenu.php:309` · `ml_models.version` 데모시드 `ModelMonitor.php:297-305` · `risk_model_registry.model_version='v0'` `Risk.php:151`) · **증분 로직 0** | `NAME_ONLY` |
| 4 | previous_version_id | **grep 0** — 버전 간 링크 개념 전무. `menu_defaults` 는 `id`+`created_at` 뿐(`AdminMenu.php:119-121`) → **순서는 `created_at` 추정이지 선언된 계보 아님** | `ABSENT` |
| 5 | relationship count | 집계할 관계 자체가 0(`manager_id`·`reports_to` grep 0) | `ABSENT` |
| 6 | active subject count | Subject 축 0 — 직원 아이덴티티 = `app_user` 뿐 · **병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`) | `ABSENT` |
| 7 | active position count | Position 개념 0. 🔴**함정**: `position_idx` = **PM 태스크 정렬순서** | `ABSENT` |
| 8 | active organization count | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 **18/18 `CONTRACT_ONLY`** · `team` 에 `parent_team_id` 없음 → 조직 수를 셀 트리 없음 | `CONTRACT_ONLY` |
| 9 | structural changes | 구조 변경 델타 개념 0. 인접 = `pm_audit_log.diff_json`(migration `…168_008:13`) — **REAL 이나 PM 태스크 도메인**(조직/보고선 아님) | `LEGACY_ADAPTER` |
| 10 | source version | ★**소스가 0개**(§62 · [DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md](DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md)) → **버전을 매길 소스 자체가 없다.** HRIS/ERP/Directory 능력축 전부 0 · SCIM manager **침묵 no-op**(`EnterpriseAuth.php:391-396`) → **`VACUOUS` 이전에 무대상** | `ABSENT` |
| 11 | affected subjects | 영향분석 계층 0 — 변경 전 영향 산출 코드 전무 | `ABSENT` |
| 12 | affected positions | 동일 · Position 축 0 | `ABSENT` |
| 13 | affected organizations | 동일 · 조직 축 `CONTRACT_ONLY` | `ABSENT` |
| 14 | affected approval workflows | 🔴 승인 워크플로 엔티티가 없다 — 승인은 **노드가 아니라 핸들러 메서드**(`Mapping::approve:238-294`). 승인 4종 실측: `mapping_change_request` **REAL** · `catalog_writeback_job` **REAL**(`approvalCreate:2275`→`approveQueue:2341`→집행 `:2362`) · `action_request` **`VACUOUS`**(`INSERT INTO action_request` **grep 0**) · `admin_growth_approval` **REAL(단일테넌트 전제 · `tenant_id` 없음** `AdminGrowth.php:142-149`**)** | `ABSENT` |
| 15 | affected active tasks | 🔴**함정**: `pm_tasks` 는 **REAL 이나 PM 프로젝트 태스크**이지 승인 태스크 아님. `pm_tasks` DDL 에 **assignee·owner·manager 컬럼 없음**(`created_by` 뿐) · 배정은 별도 N:N `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(migration `…168_005`) = **태스크 역할** | `ABSENT` |
| 16 | effective_from | **`valid_from`·`effective_to` grep 0** · 유일 인접 `kr_fee_rule.effective_from`(`Db.php:898`) = **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0 · 읽기 4개소 전부 최신승 `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | `NAME_ONLY` |
| 17 | effective_to | **`effective_to` grep 0** — 종료 시점 개념 전무 | `ABSENT` |
| 18 | recorded_at | 인접 = `created_at`(`menu_defaults` `:121` · `pm_audit_log`). 🔴**System Time 만 존재 · Business Time 없음** → §38 **이중 시간축 전례 0**. `pm_baseline.captured_at` 은 **`snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360`)라 **인덱스·as-of 질의 불가** | `KV_ONLY` |
| 19 | recorded_by | 인접 = `menu_audit_log.changed_by VARCHAR(255) NOT NULL`+`changed_by_role`(`AdminMenu.php:126`) — **REAL 이나 메뉴 도메인**. 🔴 승인 도메인의 actor 는 **전사 표준이 아니다**: `Mapping::actorId:36-53` **REAL 3분기**(`apikey:{id}` `:41` / `user:{email}` `:47` / **`user:#{id}` 폴백** `:49` / 미확인 null `:52` → **403 fail-closed** `:187-190`·`:246-250`) vs 🔴**`Alerting::actor:33-36` = `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백 = 위조가능** | `LEGACY_ADAPTER` |
| 20 | reviewed_by | **Review/Approval 미분화** — 리뷰 단계 개념 0 · `reviewed_by` grep 0. 🔴`pm_task_assignees.role` 의 `'reviewer'` 는 **태스크 역할**이지 버전 리뷰어 아님 | `ABSENT` |
| 21 | approved_by reference | 🔴**★`Existing Approval Manager Resolver` = `ABSENT`** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`·`approval_chain`·`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`). 승인 4경로 전량 **"호출자가 곧 승인자"**. `approvals_json`(`Mapping.php:285`) = `{user, ts}` **2키 JSON 배열** → **인덱스·as-of 질의 불가**. **`Actor Authorization Snapshot` = `ABSENT`**(승인 시점 권한 동결 0) | `KV_ONLY` |
| 22 | immutable_hash | ✅**알고리즘 REAL** = `menu_audit_log.hash_chain CHAR(64)`(DDL `AdminMenu.php:128` · SHA-256 prev-chain `:182-197` · `lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`). 🔴**스키마 복제 금지** — `menu_audit_log` **`tenant_id` 없음** · **`lastHash():216` 에 tenant 술어 없음** → 테넌트별 체인 시 `WHERE tenant_id=?` **필수**. 권장 = `pm_audit_log` 스키마(`tenant_id NOT NULL` `…168_008:7`) + `menu_audit_log` 알고리즘 | `LEGACY_ADAPTER` |
| 23 | status | 인접 `team.status VARCHAR(20) DEFAULT 'active'`(`TeamPermissions.php:148`)·`ml_models.status VARCHAR(30) DEFAULT 'active'`(`ModelMonitor.php:36`) = **무검증 자유문자열** · **전이 규칙 0**. 축 전사 = [DSAR_REPORTING_LINE_VERSION_STATUS.md](DSAR_REPORTING_LINE_VERSION_STATUS.md) | `ABSENT` |
| 24 | evidence | 인접 = `menu_audit_log`(hash_chain·reason·ip_address·user_agent·request_id `AdminMenu.php:126-129`) · `pm_audit_log`(tenant_id·diff_json·append-only). 🔴 tenant 축 결함은 위 #22 와 동일 | `LEGACY_ADAPTER` |

**측정기 분모: 38(§8 전체) / 원문 대조: 필수 필드 24 + 상태 14 = 38 / 본 편 전사: 24.** 잔여 14는 [DSAR_REPORTING_LINE_VERSION_STATUS.md](DSAR_REPORTING_LINE_VERSION_STATUS.md) 에서 전사. **불일치 없음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 14 · `LEGACY_ADAPTER` 5 · `NAME_ONLY` 2 · `KV_ONLY` 2 · `CONTRACT_ONLY` 1.

## 2. 규칙

- 🔴 **`menu_defaults` 를 버전 선례로 삼지 마라**(규칙 7). `version VARCHAR(32)` 는 컬럼이 **있지만** 유일 생산자가 리터럴 `'baseline'` 을 박고(`:309`), 판독(`:584`)은 `created_at` 최신승이라 **값을 판정에 쓰지 않는다**. **컬럼이 있다 ≠ 모델이 있다.** `ml_models.version`·`risk_model_registry.model_version` 도 **데모 시드 리터럴**로 동일하다.
- 🔴 **§8:578 *"Active Version을 직접 수정하지 마라"* 를 강제할 수단이 현행에 0개다.** ACTIVE 행 보호는 **신설 대상**이며, `previous_version_id`(#4) 없이는 **선언된 계보가 없어** "직접 수정"과 "새 버전 발행"을 **구분조차 못 한다**. #4 는 선택 필드가 아니라 §8 전체의 선결 조건이다.
- 🔴 **`immutable_hash`(#22)는 `menu_audit_log` **스키마**를 복제하지 말고 **알고리즘만** 이식하라.** 원본은 `tenant_id` 가 없고 `lastHash():216` 에 tenant 술어가 없어 **테넌트 교차 체인**이 된다. 권장 = **`pm_audit_log` 스키마(`tenant_id NOT NULL`·`diff_json`·3인덱스·append-only) + `menu_audit_log` 알고리즘(SHA-256 prev-chain)**.
- 🔴 **`source version`(#10)을 먼저 설계 금지** — **소스가 0개**다(§62 무대상). 소스 버전 필드를 먼저 만들면 **영원히 NULL 인 컬럼**이 되고, 이후 "동기화 정상"이 **자동 녹색**으로 보고된다(288차 `ok=>true` 위장과 동형).
- 🔴 **`recorded_at`(#18)을 `created_at` 하나로 처리 금지.** §38 **Business/System Time 이중 시간축은 전례 0**이며, `pm_baseline.captured_at` 이 **JSON 키로 들어가 as-of 질의가 불가능해진** 선례(`PM/Enterprise.php:360`)를 반복하면 안 된다. **시점은 컬럼이어야 하고 인덱스가 있어야 한다.**
- 🔴 **`approved_by reference`(#21)를 `approvals_json` 형태로 설계 금지** — `{user, ts}` 2키 JSON 배열(`Mapping.php:285`)은 **인덱스·as-of 질의 불가**하다. 또한 **`Actor Authorization Snapshot` 이 `ABSENT`** 이므로, 승인 시점 권한을 동결하지 않으면 **사후 권한 변경이 과거 승인의 유효성을 소급 변조**한다.
- 🔴 **`recorded_by`(#19)에 `Alerting::actor:33-36` 패턴을 절대 재사용 금지** — `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백은 **289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**이다. **`Mapping::actorId:36-53`(3분기 + 미확인 시 403 fail-closed)만이 참조 구현**이다.
  - ⚠️**관찰(등급 미부여)**: `Mapping::actorId` 조차 동일인이 **API키/세션 경로로 접근하면 actor 문자열이 다르다**(`apikey:{id}` vs `user:{email}`) → `:279` dedup·`:268` 자기승인 차단이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.**
- 🔴 **`AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` 소거 패턴을 재현 금지** — **이력 물리적 소멸** = §55 정면 반례.
- ★**신규 스키마는 마이그레이션 경로가 없다** — `backend/migrations/` **172차 정지**(21파일) → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}`. 🔴**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **§40 Retroactive Correction 집행 수단 없음**. **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
