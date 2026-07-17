# DSAR — Task Claim (§38)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §38 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

**★이 블록은 5-3-2 전체에서 실자산 접점이 가장 넓다 — 동시성은 레포 최고 성숙 자산이다.** 그러나 **접점이 넓다는 것이 커버가 넓다는 뜻은 아니다**(아래 축 주의).

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_TASK_CLAIM` 엔티티 | `task_claim` **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| Human Task 클레임 | 개념 자체 전무 — 승인은 클레임 없이 **바로 결정**(`Mapping::approve` Mapping.php:238) | `NOT_APPLICABLE` |
| ★리스 기반 배타 선점 | **`Omnichannel::claimBatch`**(Omnichannel.php:394-423) — **stale lease 900s 회수(:395-400) → `SELECT..FOR UPDATE SKIP LOCKED`(:405) + `claim_id`(:392 `bin2hex(random_bytes(8))`) → 조건부 UPDATE 폴백(:415)** | `LEGACY_ADAPTER`(**패턴 정본**) |
| ★2단 폴백 | **`Omnichannel::claimConditional`**(Omnichannel.php:427-447) — `UPDATE..IN(subquery+LIMIT)` → 거부 시 `SELECT` 후 `IN` 목록 + **`AND status='queued'` 가드**(:441) | `LEGACY_ADAPTER`(SQLite 호환 정본) |
| ★조건부 UPDATE + rowCount CAS | **4곳 확립** — `Catalog`:1683-1691(주석 :1680-1682 "SELECT~UPDATE 사이 무방비 → 2회 전송") · `ChannelSync`:6145-6153(주석 :6147-6149 "송장 2회 POST") · `JourneyBuilder`:411-418(주석 :405-410 "중복 발송·실비용·정보통신망법") · `Omnichannel::claimConditional`:427 | `LEGACY_ADAPTER`(**동시성 정본**) |
| ★멱등 자연키 선점 | **`JourneyBuilder::claimSendOnce`**(:450-461) — `INSERT INTO journey_node_sent(tenant_id, enrollment_id, node_id)` UNIQUE → **성공=내가 처리** · **발송 전 선점**(커밋 전 크래시에도 재발송 0) + **`releaseSendOnce`**(:463-471 실제 미처리 시 해제 — 미해제 시 영구 미발송) | `LEGACY_ADAPTER`(**멱등 정본**) |
| stale 회수 리스 | `Omnichannel` **900s**(:395) · `ChannelSync` **600s**(:6136) — **2공식 병존** | `LEGACY_ADAPTER`(통일 필요) |
| 🔴 claim token | `claim_token`·`claimToken` **grep 0**. 유사 = `claim_id`(Omnichannel.php:392) — **워커 배치 소유권 마커**이지 사람에게 발급되는 토큰 아님 | `NOT_APPLICABLE` |
| 🔴 lock version | `lock_version`·optimistic `version` **grep 0** · 분산락·`GET_LOCK` **grep 0** · `flock` = `stock_sync_cron.php:54` **유일** | `NOT_APPLICABLE` |
| actor authorization snapshot | **grep 0** — 인가 스냅샷 개념 전무. 인접 신원 = `Mapping::actorId`(:36-50 위조불가·미확인 null→403) | `LEGACY_ADAPTER`(신원 해석만) |

**★★축 주의 — 형태 유사의 최대 함정이 여기 있다.** 위 `claim*` 5계열은 **전부 워커가 잡/메시지 행을 선점하는 기전**이다. 원문 §38 은 **사람이 Human Task 를 배타적으로 집는 것**이다:

| 축 | 현행 `claim*` | 원문 §38 Task Claim |
|---|---|---|
| 주체 | 워커 프로세스(익명·`claim_id` = 랜덤 8바이트) | **사람**(`claimed_by` = 신원) |
| 대상 | 큐 행(`omni_outbox`·`catalog_writeback_job`·`channel_shipment_job`·`journey_enrollments`) | **승인 Task** |
| 목적 | **중복 전송 차단**(실비용·정보통신망법 — JourneyBuilder.php:407) | **배타적 처리 책임 귀속** |
| 인가 | 없음(워커는 인가 대상이 아님) | **후보·Role·Scope·Tenant·Assignment 만료 5중 검증 필수** |
| 해제 | 리스 만료 자동 회수(900s/600s) | **명시적 Release + 사유**(§39 10종) |

**Task/배정/클레임 개념 자체가 승인 도메인에 전무하다**(`workflow_task`·`task_claim`·`human_task`·`assigned_to`·`assignee` 전부 grep 0). **형태 유사를 커버로 계산하면 역산이다** → 원문 13종 전부 `NOT_APPLICABLE`/`LEGACY_ADAPTER`이며 **`VALIDATED_LEGACY` 는 0건**이다. 이 실자산들은 **오직 구현 패턴의 재사용 근거로만 인용한다.**

**★부재증명은 능력으로.** `claim_token` grep 0 을 근거로 "클레임 기전 부재"라 말하지 않는다 — 능력(배타적 선점)은 **레포에서 가장 성숙하게 존재한다**. 부재한 것은 **그 능력이 사람·인가·승인 대상에 적용된 적이 없다**는 것이다.

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | task_claim_id | 부재 · 형태 유사 = `claim_id`(Omnichannel.php:392 랜덤 8바이트 배치 마커) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | workflow_task_id | 부재(§36 Task 자체 부재) | `NOT_APPLICABLE` |
| 3 | claimed_by | 부재(사람) — 워커 클레임에 신원 없음. 인접 = `Mapping::actorId`(:36-50) | `LEGACY_ADAPTER`(신원 해석 위임) |
| 4 | actor authorization snapshot | **grep 0** — 인가 스냅샷 전무. `Mapping::actorId` 는 **신원만 반환**(`apikey:{id}`/`user:{email}`)하고 인가 상태를 동결하지 않음 | `NOT_APPLICABLE` |
| 5 | claim token | **grep 0** · `claim_id`(Omnichannel.php:392)는 **워커 배치 마커**(사람에게 미발급·검증 미사용) | `NOT_APPLICABLE` |
| 6 | claimed_at | 부재(사람) · 형태 유사 = `omni_outbox.claimed_at`(Omnichannel.php:397,409,417) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | claim expires at | 부재(사람) · 형태 유사 = **stale 리스 회수** `Omnichannel` 900s(:395) · `ChannelSync` 600s(:6136) — **컬럼이 아니라 쿼리 내 계산**(`gmdate(..., time()-900)`) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | exclusive 여부 | 부재(플래그) — 현행 워커 클레임은 **배타가 유일 모드**(비배타 옵션 없음). 원문은 **배타/비배타 선택**을 요구 | `NOT_APPLICABLE` |
| 9 | lock version | **grep 0**(optimistic `version`·분산락·`GET_LOCK` 전부) · 인접 = rowCount CAS 4곳 | `NOT_APPLICABLE` |
| 10 | released_at | 부재(컬럼) · 인접 = `JourneyBuilder` `$release`(:417-418 `status='processing'`→`'waiting'`) · `releaseSendOnce`(:463-471 DELETE) — **해제 시각 미기록** | `LEGACY_ADAPTER`(해제 기전만) |
| 11 | release reason | 부재 — 해제 사유 미기록(§39 10종 전부 부재). 인접 = `Omnichannel::mark` 의 사유 문자열(`quiet_hours_defer`:350 · `sto_defer`:363 · `no_channel_available`:369) = **발송 보류 사유이지 클레임 해제 사유 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | status | 부재(Claim) · 형태 유사 = 잡 status `queued`/`processing`(Omnichannel.php:396,409) | `KEEP_SEPARATE_WITH_REASON` |
| 13 | evidence | 부재 · 인접 감사 = `Mapping::audit`(:292) · `journey_node_logs`(JourneyBuilder.php:50,69) · `auth_audit_log`(TeamPermissions.php:19) | `LEGACY_ADAPTER`(감사 기록 위임) |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 5 · 형태유사 분리(`KEEP_SEPARATE_WITH_REASON`) 5 · 인접 위임(`LEGACY_ADAPTER`) 3 · **현행 충족(`VALIDATED_LEGACY`) 0**.

## 1-2. 원문 차단 요구 전사 — **원문 6종**

| # | 원문 차단 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 후보가 아닌 Subject의 Claim | **차단 0** — 후보 개념 부재. `Mapping::approve` 는 자기승인·중복승인만 차단하고 **후보 검증 없음** → 테넌트 내 유효 신원이면 누구나 승인 | `NOT_APPLICABLE` |
| 2 | 유효하지 않은 Role·Scope로 Claim | **차단 0** — `acl_permission` 의 `approve` 동작(TeamPermissions.php:39,708-717)이 **부여되나 외부 판독 grep 0** → 승인 3핸들러 어디도 Role/Scope 미검증 | `CONTRACT_ONLY` |
| 3 | 다른 Tenant Task Claim | **혼재** — `Mapping::approve` REAL(:253 `WHERE id=? AND tenant_id=?`) ↔ `admin_growth_approval` **tenant_id 컬럼 없음**(:1324 `WHERE id=?` 전역) ↔ `paddle_events` tenant 검증 부재(:99) | `NOT_APPLICABLE`(Claim 단위) |
| 4 | 만료된 Assignment로 Claim | **차단 0** — Assignment `valid_from`/`valid_to`(§37 #18,19) 자체 부재 | `NOT_APPLICABLE` |
| 5 | 이미 Exclusive Claim된 Task 중복 Claim | **능력은 REAL·대상이 부재** — rowCount CAS 4곳(Catalog:1683-1691 · ChannelSync:6145-6153 · JourneyBuilder:411-418 · Omnichannel:427)이 **잡에 대해** 정확히 이것을 한다. 승인 Task 에 적용된 적 없음 | `LEGACY_ADAPTER`(**패턴 강제 재사용**) |
| 6 | Claim Token 없는 완료 | **차단 0** — `claim_token` grep 0. 현행 승인은 **클레임 없이 바로 결정**(`Mapping::approve`:238 · `AdminGrowth::approvalDecide`:1322) | `NOT_APPLICABLE` |

**실측 개수: 6 / 6 전사.** 커버리지 = 부재 4 · 계약만 1 · 패턴 재사용 1 · **현행 충족 0**.

## 2. 규칙

- 🔴 **다른 동시성 모델 도입 = 설계 제약 위반.** optimistic lock(`version`)·분산락·`GET_LOCK` 이 **레포 전역 grep 0** 인 것은 결함이 아니라 **SQLite 폴백 호환이라는 명시적 설계 제약**이다. 증거: `Db.php` 이중 백엔드(MySQL 주 + SQLite 폴백) · `Omnichannel::claimConditional`(:427-447) 이 **SKIP LOCKED 미지원 드라이버 전용 2단 폴백**으로 존재 · `Catalog`:1682 주석 **"FOR UPDATE/SKIP LOCKED 불필요 — SQLite 폴백 환경에서도 동일하게 동작한다"** · `ChannelSync`:6149 주석 동일 취지. **§38 `lock version` 은 반드시 조건부 UPDATE + rowCount CAS 로 구현하라.**
- 🔴 **`claimBatch` 3단 구조를 재작성 금지 — 공용 추출하라.** `Omnichannel::claimBatch`(:394-423)의 **① stale 리스 회수 → ② `FOR UPDATE SKIP LOCKED` + `claim_id` → ③ `claimConditional` 폴백** 은 레포에서 유일하게 완성된 리스 클레임이다. 승인 Task 가 4번째 자체 클레임을 만들면 폴백 경로를 반드시 빠뜨린다(SQLite 환경 무음 실패).
- 🔴 **`claim_token` 은 `claim_id` 로 대체 불가.** `claim_id`(Omnichannel.php:392)는 **워커 배치 소유권 마커**로 랜덤 생성 후 **자기 행 재조회에만 쓰이고 검증되지 않는다**(:417-419). 원문 `claim token` 은 **§38 차단 6번("Claim Token 없는 완료")·§42 완료 검증("Claim이 필요한 경우 유효한 Claim이 있는가")의 검증 대상**이다 — 능력이 다르다.
- 🔴 **`actor authorization snapshot` 은 `Mapping::actorId` 로 대체 불가.** `actorId`(:36-50)는 **신원**(`apikey:{id}`/`user:{email}`)을 반환하지 **인가 상태를 동결하지 않는다**. §39 `ROLE_REVOKED` 가 성립하려면 "클레임 시점의 인가"가 **스냅샷으로 남아야** 한다 — 이것은 진짜 신설이다.
- **`claimed_by` 의 신원 해석은 `Mapping::actorId` 규율(Mapping.php:36-50, 245-250)을 따를 것 — 재작성 금지.** 위조불가 신원 → **미확인 null → 403 fail-closed**. 재작성하면 **289차 G-01 이 닫은 우회로(익명 2회 = 정족수)를 다시 연다.** 신규 작성이 아니라 **위치 이동**이다.
- 🟠 **`claimed_by` 에 `actor_type` 필수.** 현행 `actorId` 는 `apikey:`/`user:` 를 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). 클레임이 신원을 처음 붙잡는 지점이 이 결번을 닫을 자리다.
- 🔴 **`released_at` 을 상태 되돌리기로만 구현 금지.** 현행 해제는 **시각·사유를 남기지 않는다**(`JourneyBuilder` `$release`:417-418 은 `status` 만 되돌리고, `releaseSendOnce`:463-471 은 행을 DELETE 한다). §39 가 10종 사유를 요구하는 이상 **해제는 기록되어야 한다** — 현행 패턴을 그대로 베끼면 §39 가 성립하지 않는다.
- ⚠️ **`releaseSendOnce` 의 교훈(JourneyBuilder.php:463)**: **"해제하지 않으면 영구 미발송"**. 선점 마커를 두는 순간 **모든 비-완료 경로에서 해제 책임이 생긴다.** §38 Claim 신설 시 **해제 누락 경로가 곧 영구 스턱**이다.
- **stale 리스 TTL 은 통일하라.** 현행 **900s**(Omnichannel.php:395) · **600s**(ChannelSync.php:6136) **2공식 병존**. `claim expires at` 은 **쿼리 내 계산이 아니라 컬럼**으로 두어 Task 별 기한을 허용해야 §36 `timeout at` 과 정합한다.
- 🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 참조 구현으로 삼지 마라.** `:612` 가 `status` 를 **SELECT 하고 어디서도 판독하지 않아** `pending`·`rejected` 도 실집행된다. 현재 **VACUOUS**(`INSERT INTO action_request` grep 0 = 생산자 전무)이나 **생산자 배선 시 즉시 활성**이다. §38 이 "클레임 없는 완료"를 차단하려는 바로 그 실패가 **승인 없는 집행**의 형태로 이미 코드에 있다.
- 🔴 **9종(필드 5 + 차단 4) "있다고 가정"하고 배선 금지.**
- ⚠️ **`evidence` 는 부록이 아니다.** 원문 필드 목록의 **마지막 항목**이며 13번째 필수 필드다.
