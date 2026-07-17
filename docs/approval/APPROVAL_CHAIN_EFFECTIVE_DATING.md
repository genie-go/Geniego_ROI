# Approval Chain — Effective Dating · Future-Dated Change · Retroactive Correction

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §46, §47, §48 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §46. Effective Dating (원문 줄 2164-2190 · 분모 14)

`APPROVAL_CHAIN_EFFECTIVE_PERIOD` — 필수 필드 14.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_effective_period_id | `approval_chain`/`approval_route` 이름 grep **0**(backend/src·frontend/src 전역). 엔티티 자체 부재 | ABSENT |
| 2 | entity type | 동일 엔티티 부재. 인접: `menu_audit_log.action`(`AdminMenu.php:123`)은 감사 행위 타입이지 유효기간 대상 타입 아님 | ABSENT |
| 3 | entity id | 엔티티 부재 | ABSENT |
| 4 | business valid from | Chain 도메인 **0**. 인접 선례 = `kr_fee_rule.effective_from`(`Db.php:898` VARCHAR(32) NOT NULL) — **컬럼 有·as-of 질의 無** | ABSENT |
| 5 | business valid to | `effective_to`/`valid_to`/`valid_from` grep **0**. ★오탐: `valid_to` 유일 히트 = `Onsite.php:396` `in`**`valid_to`**`ken`(문자열 `invalid_token`) | ABSENT |
| 6 | system recorded from | Bitemporal System Time 축 **0**. `created_at` 은 행 삽입 시각이지 System Time 구간 아님(`Db.php:898` 인근 DDL 확인) | ABSENT |
| 7 | system recorded to | System Time 종료 축 **0**. 이력 행 무효화 없이 **덮어쓰기**가 현행 패턴(`Connectors.php:1804-1805`) | ABSENT |
| 8 | timezone | 타임존 컬럼 **0**. 현행은 `gmdate('c')` UTC 문자열 암묵 고정(`Mapping.php:285` · `Alerting.php:591` · `AdminGrowth.php:1329`) — 필드로 보존되지 않음 | ABSENT |
| 9 | future dated 여부 | 미래 발효 플래그 **0** | ABSENT |
| 10 | retroactive 여부 | 소급 플래그 **0** | ABSENT |
| 11 | scheduled activation reference | 스케줄 발효 참조 **0**. `idempoten` grep 5건 전량 DDL/시드 멱등(`AdminGrowth.php:820` · `OrderHub.php:385` · `UserAdmin.php:1366` · `SiteIntro.php:35` · `UserAuth.php:154`) — 스케줄러 아님 | ABSENT |
| 12 | source effective date | 원천 발효일 보존 **0**. `KrChannel.php:140` `$body['effective_from'] ?? date('Y-m-d')` = 클라이언트 입력 무검증 수용(출처 미기록) | ABSENT |
| 13 | status | 유효기간 상태 축 **0**. `SET status *=` **128건/42파일**은 전부 도메인 엔티티 상태이며 유효기간 엔티티 없음 | ABSENT |
| 14 | evidence | 근거 보존 축 **0** | ABSENT |

### §47. Future-Dated Chain Change (원문 줄 2191-2228 · 분모 26)

지원 변경 14 + 필수 기록 12.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | New Chain Activation | Chain 엔티티 부재 → 활성화 대상 없음. `approval_chain` grep 0 | ABSENT |
| 2 | Chain Version Replacement | Chain Version 축 **0**. optimistic lock `version` grep **0**(`SET version=version+1`·`WHERE version=?` 전역 0) | ABSENT |
| 3 | Stage Addition | `approval_stage`/`step_order` grep **0**. ★오탐: `stage`/`sc_stages` = 물류 마일스톤 체크리스트(`SupplyChain.php:50-54`, `:193-199` · `done TINYINT`=체크박스) | ABSENT |
| 4 | Stage Removal | 동일 — Stage 개념 부재 | ABSENT |
| 5 | Level Addition | `approval_level`/`manager_level`/`approval_depth` grep **0**. ★오탐: `depth` = 루프 지역변수(`AdminMenu.php:544` · `PM/Dependencies.php:84`) | ABSENT |
| 6 | Level Removal | 동일 — Level 개념 부재 | ABSENT |
| 7 | Route Change | `approval_route`/`route_id` grep **0**. ★오탐: `route` 단독 = SPA URL(`menu_tree.route VARCHAR(255)`) · `backend/src/routes.php` | ABSENT |
| 8 | Condition Change | 승인 조건 엔티티 부재. 인접 확장기반 = `RuleEngine.php:24`(화이트리스트 `OPS:33` · `compare:433-439` · `eval` 미사용) — 버전·발효 축 없음 | ABSENT |
| 9 | Priority Change | Chain 우선순위 축 **0**. ★오탐: `override` = 스칼라 선행순위(`Mmm.php:381-382` · `OrderHub.php:1274`) · `source_priority` = 데이터소스 Trust 우선순위(`DataPlatform.php:65`, `:184`) | ABSENT |
| 10 | Applicability Change | Applicability 엔티티 부재. 인접 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` → `:1103-1105` `requires_approval=true` — **하드코딩 상수 1개**(버전·발효 없음) | ABSENT |
| 11 | Template Change | Template 버전 축 **0**. 인접 = `createJourney:120-125` `$defaultNodes`/`$defaultEdges` PHP 리터럴 시드(생성 시 1회 복사 · 레지스트리·재적용 전무) | ABSENT |
| 12 | Override Start | Override 발효 시작 축 **0** | ABSENT |
| 13 | Override End | Override 종료 축 **0**. `effective_to`/`valid_to` grep 0과 동일 근거 | ABSENT |
| 14 | Fallback Change | Fallback 엔티티 부재. 인접 폴백은 전부 하드코딩(`JourneyBuilder nextNode:811-814` 위치 폴백 · `pickWeighted:729` 첫 키 폴백) — 정의 대상 아님 | ABSENT |
| 15 | scheduled effective date | 스케줄 발효일 **0**. 예약 실행 선례 = 286차 SMS 예약워커뿐(승인 무관) | ABSENT |
| 16 | predecessor version | 선행 버전 참조 **0** | ABSENT |
| 17 | successor version | 후행 버전 참조 **0** | ABSENT |
| 18 | affected scopes | 영향 스코프 산출 **0** | ABSENT |
| 19 | affected request types | 요청 유형 축 부재(승인 4경로 전부 스키마 상이 · 유형 열거 없음) | ABSENT |
| 20 | affected active cases | Approval Case 개념 자체 **ABSENT**(요청 1행 = 결정 1행 = 종결) | ABSENT |
| 21 | affected future requests | 미래 요청 집합 산출 **0** | ABSENT |
| 22 | validation result | Chain 검증 결과 보존 **0**. 인접 DAG 검증 = `PM/Dependencies.php:79-100`(반복 DFS + `$visited` + tenant 필터 `:91`) — 결과를 **저장하지 않고** 422 반환만 | ABSENT |
| 23 | compilation result | Compile 산출물 **0**(compiled artifact 개념 부재) | ABSENT |
| 24 | activation result | 활성화 결과 보존 **0** | ABSENT |
| 25 | rollback reference | 롤백 참조 **0**. 인접 = `AdminMenu.php:584-641` menu_defaults 복원(스냅샷 되감기 · 버전 참조는 `snapshot_version` 표시용 `:641`) — Chain 무관 | ABSENT |
| 26 | evidence | 근거 보존 축 **0** | ABSENT |

### §48. Retroactive Chain Correction (원문 줄 2229-2253 · 분모 14)

과거 Chain Definition 수정 시 강제 항목 14.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Correction Reason | 정정 사유 축 **0**. 인접 = `menu_audit_log.reason TEXT`(`AdminMenu.php:124`) — 감사 사유이지 소급 정정 사유 아님 | ABSENT |
| 2 | Authorized Requester | 소급 정정 요청자 축 **0**. 🔴 현행 4경로 전량 "호출자가 곧 승인자" — 별도 권한 축 없음 | ABSENT |
| 3 | Approval Reference | 정정 자체에 대한 승인 참조 **0** | ABSENT |
| 4 | Original Chain Version | 원본 Chain Version 부재(Version 축 0) | ABSENT |
| 5 | Correction Version | 정정 Version 부재. 🔴 현행 패턴은 **덮어쓰기**: `TeamPermissions.php:495` manager 변경이 이전 값 소멸 · `Connectors.php:1804-1805` fx 단일행 덮어쓰기 | ABSENT |
| 6 | Affected Period | 영향 기간 산출 **0**(§46 유효기간 엔티티 부재의 귀결) | ABSENT |
| 7 | Affected Approval Requests | 영향 요청 집합 산출 **0** | ABSENT |
| 8 | Affected Approval Cases | Approval Case 개념 **ABSENT** → 피연산자 없음 | ABSENT |
| 9 | Affected Tasks | Approval Task 개념 **ABSENT**. ★오탐: `pm_task*` = PM 도메인(일정 의존 `dep_type ENUM('FS','SS','FF','SF')`) | ABSENT |
| 10 | Affected Decisions | 결정 이력 축은 존재하나 소급 영향 산출 **0**. `Mapping.php:285` `approvals_json` = `["user"=>$actor,"ts"=>gmdate('c')]` **정확히 2키** · `Alerting.php:591` `{actor,decision,ts}` 3키 · `AdminGrowth.php:147` `decided_by`/`decided_at` 2컬럼 — **어느 것도 승인시점 Chain Version 미참조** | ABSENT |
| 11 | Historical Snapshot Impact | 스냅샷 영향 산출 **0**. Chain 스냅샷 자체 부재(→ `APPROVAL_CHAIN_SNAPSHOT.md`) | ABSENT |
| 12 | Financial Impact Reference | 리베이트 금액 영향 참조 **0**. 인접 = `Catalog.php:1016` `HIGH_VALUE_KRW` 임계 상수 1개(사후 영향 재계산 없음) | ABSENT |
| 13 | Reconciliation | 조정 엔티티 **0**. ★오탐: `reconcil` 히트 = `Connectors.php:902` `roasReconciliation`(매체 vs 귀속 ROAS) · `Wms.php:2160` `reconcileChannelStock`(채널 재고) — 둘 다 Chain 무관 | ABSENT |
| 14 | Manual Review | 수동 검토 훅 **0** | ABSENT |

## 2. 설계 계약

후속 구현이 지켜야 할 계약(코드 아님).

### C-46-1 · Bitemporal 이원 축 필수
`APPROVAL_CHAIN_EFFECTIVE_PERIOD` 는 **Business Time**(`business valid from`/`to`)과 **System Time**(`system recorded from`/`to`)을 **별도 컬럼으로 보존**한다. 원문 §46 산문: *"Business Time과 System Time을 구분하라."*

### C-46-2 · Chain Resolution 은 `resolution_time_basis` 를 따른다
원문 §46 산문: *"Chain Resolution은 요청의 `resolution_time_basis`에 따라 유효 Version을 선택한다."* → 해석 시각 기준을 **요청이 명시**하며, 기본값을 암묵 "최신승"으로 두지 마라.

### C-46-3 · 교정 계층이 축마다 다르다 (실측 기반)

| 축 | 상태 | 교정 계층 |
|---|---|---|
| 세율 `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有·질의 無** — `WHERE effective_from <= :as_of` 전역 **0**. 읽기 **4개소 전부** `ORDER BY effective_from DESC` 최신승(`Pnl.php:454` · `KrChannel.php:102`, `:151`, `:459`) | **질의 계층** — 스키마 유지, 질의에 as-of 술어 추가 |
| 환율 `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805` `ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)`) | **저장 계층 신설** — 이력 테이블부터 만들어야 as-of 가능 |
| Approval Chain | **엔티티 자체 無** | **엔티티+저장+질의 전 계층 신설** |

→ Chain 유효기간은 **세율 모델(컬럼 있음)을 복제하지 마라**. 세율 모델은 as-of 질의가 없어 이미 미달이다. 신설 시 처음부터 as-of 술어를 강제하라.

### C-47-1 · Scheduler Idempotency
원문 §47 산문: *"Scheduler 중복 실행에도 Idempotent하게 동작하라."* → 동일 `scheduled effective date` + 동일 `predecessor version` 조합의 재실행이 **두 번째 활성화를 만들지 않아야** 한다. 현행 레포의 `idempotent` 5히트는 전량 **DDL/시드 멱등**이며 스케줄러 멱등 선례가 아니다 — 참조하지 마라.

### C-48-1 · 덮어쓰기 금지 (원문 §48 산문 2건)
- *"과거 Chain Version·Snapshot·Decision Evidence를 덮어쓰지 마라."*
- *"Correction Version과 원본 Version을 모두 보존하라."*

### C-48-2 · 🔴 정면 반례를 복제하지 마라
`AgencyPortal.php:304`(`SET status='pending', invited_at=?, revoked_at=NULL`) · `:381`(`SET status='approved', scope_json=?, approved_at=?, revoked_at=NULL`) 이 **이전 해지 시각을 `NULL` 로 소거**한다. → 위임 이력이 **물리적으로 소멸**하여 **as-of 승인권 재구성 불가**. 이는 §48 의 정면 반례가 레포에 **실재**하는 것이며, Chain 도메인에 **절대 이식 금지**.

### C-48-3 · 감사 정본 선례 = `SecurityAudit`
- 재사용 대상: `backend/src/SecurityAudit.php:27`(`hash('sha256', $prev.'|'.$tenant.'|'.$actor.'|'.$action.'|'.$dj.'|'.$now)` — **tenant 포함**) · `:45-52` DDL(`tenant_id`/`prev_hash`/`hash_chain`) · **`verify():56-68`** — `:64` `hash_equals` 로 preimage 재계산 검증.
- 🔴 **`menu_audit_log.hash_chain` 인용 금지 — 검증 불가능한 장식**(★근거 정정 · 289차 10회차 ⓔ): **막히는 축은 `ts` 하나**다 — preimage 의 `'ts'=>date('c')`(`AdminMenu.php:195`) 가 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없어 어디에도 저장되지 않는다**(`:129` DB `DEFAULT CURRENT_TIMESTAMP` 가 채움) → **재구성 불가** · `hash_equals` 검증기 **부재**(전역 24히트 중 `AdminMenu` 0건). (`prev` 는 `lastHash():216` 이 직전 행 `hash_chain` 을 읽어 공급 → 재구성 가능 · `prev_hash` 컬럼 부재는 결함이 아니다.)

## 3. 미결·선행조건

### BLOCKED_PREREQUISITE — Chain 엔티티 선행
§46/§47/§48 **54항목 전량 ABSENT**. 유효기간·미래발효·소급정정은 모두 **Chain Definition·Chain Version 을 피연산자로 요구**하는데 그 피연산자가 없다. → §70 Step 2 확정(`APPROVAL_ROUTE_*` 신규 SoT 구축이 정합)이 선행되어야 본 문서의 계약이 집행 가능하다.

### 🔴 BLOCKED_MIGRATION_RISK — §48 Retroactive 집행 수단이 없다
- `backend/migrations/` **21파일 · `20260527_172_002_coupon_tables.sql` 에서 정지**(172차). approval/chain/route/workflow 마이그레이션 **0건**(실측 재확인).
- 신규 스키마는 핸들러별 `ensureTables` 로만 적용되는데 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다**.
- → **소급 정정을 집행할 이행 경로가 레포에 없다.** §48 은 스키마 신설 시점에 이행 경로를 **함께** 설계해야 한다.
- ★ **`Migrate` 이름 겹침 주의**: `backend/src/Migrate.php` 는 **DDL 적용기**(`:50` `schema_migrations.checksum`)이지 도메인 이행기가 아니다. `PM/Shared.php:37-53` 도 예외가 아니다.

### 우연한 일치를 준수로 계산하지 않았음 (규칙 7)
현행이 "과거 Chain Version 을 덮어쓰지 않는" 것은 **덮어쓸 Chain Version 이 없기 때문**이다. 준수가 아니라 **대상 부재**다. 따라서 §48 산문 2건을 `NOT_APPLICABLE` 이 아니라 §2 계약으로 이관했고, 표에는 원문 항목 14개만 전사했다.

### 분모 대조
- §46 = 14행 / 분모 14 ✅ (원문 산문 2건 — Business/System Time 구분 · `resolution_time_basis` — 은 불릿이 아니므로 §2 로 이관)
- §47 = 26행 / 분모 26 ✅ (지원 변경 14 + 필수 기록 12. 산문 1건 — Scheduler Idempotent — 은 §2 로 이관)
- §48 = 14행 / 분모 14 ✅ (산문 2건 — 덮어쓰기 금지 · 양 Version 보존 — 은 §2 로 이관)
- **합계 54행 / 분모 54 ✅**
