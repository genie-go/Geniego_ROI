# DSAR — Approval Assignment Engine: 기존 구현 전수조사 (ⓑ)

> EPIC 06-A-02 Approval Assignment Engine Governance · 289차 13회차 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 읽기 전용 감사 · 코드 변경 0.
> 방식: grep 전수 + 지목 파일 직접 정독(2 에이전트 병렬). 규율: "내 결론의 근거도 재실증 대상"(DDL/명칭에서 능력 추론 금지).

## 0. 결론 (Verdict up front)

**EPIC 의미의 Approval Assignment Engine — 특정 승인 Work Item을 전략(strategy)으로 적격 후보 풀에서 특정 승인자에게 배정하고 claim/lease/reassignment 하는 엔진 — 은 부재한다.**

실존하는 것은:
- (a) **실 승인 큐 2종** — 승인자가 "임의의 권한 보유자"(per-approver 라우팅 없음)
- (b) **실 job claim/lease 1종** — outbound 처리용(승인용 아님)
- (c) **수동 PM 배정 모델** — 전략·후보·자동해석 없음

Assignment Strategy / Candidate / Resolution / Reconciliation / Drift / Simulation / Snapshot 개념은 **전무**.

## 1. 개념별 판정표 (§1 구현범위 대조)

| 개념 | 판정 | 증거(file:line) |
|---|---|---|
| Work Item | **PARTIAL** | `pm_tasks`(PM work item·수동) `PM/Tasks.php:29-47` · `catalog_writeback_job`(job 단위) `Catalog.php:75-84`. 통합 "approval work item" 추상 없음 |
| Approval Assignment | **ABSENT** | 승인을 특정 승인자에 배정하는 테이블/핸들러 0. 승인=임의 자격 role 결정(`Catalog.php:2383` approveQueue=any requirePro · `AdminGrowth.php:1313` approvalDecide=admin) |
| Assignment Candidate | **ABSENT** | no hit (`candidate` 매치는 `PM/Gantt.php:138-173` CPM 경로수학 오탐) |
| Assignment Resolution | **ABSENT** | no hit |
| Assignment Strategy(round-robin/least-loaded/weighted) | **ABSENT** | `round.robin`/`least.loaded`/`weighted.*assign` 전 backend 0 |
| Approval Queue | **PRESENT** | `catalog_writeback_job`(pending_approval→queued→processing→done/failed `Catalog.php:75-84,396,2383-2407`) · `admin_growth_approval`(pending→approved/rejected `AdminGrowth.php:142,1289-1322`) · `action_request`(소비자만) |
| Queue Membership | **ABSENT** | 어떤 유저가 큐에 속하는지 개념 0. approveQueue=테넌트 내 임의 requirePro |
| Queue Eligibility | **PARTIAL** | RBAC/plan 게이팅만(requirePro `Catalog.php:2385` · analyst `PM/Assignees.php:19` · admin). 큐 스코프 적격 아닌 coarse role |
| Queue Routing | **ABSENT** | no hit. job은 FIFO drain(`ORDER BY id ASC` `Catalog.php:1716`)·owner 라우팅 아님 |
| Claim | **PARTIAL** | 실 CAS claim 존재하나 **job 처리용**: `catalog_writeback_job` 조건부 `UPDATE…status='processing'…WHERE status IN('queued','awaiting_credentials')`·affected-rows 소유(`Catalog.php:1721-1731`) · `omni_outbox` claim_id/claimed_at(`Omnichannel.php:97-99,425-448`) |
| Lease | **PARTIAL** | `omni_outbox.claimed_at`+stuck-processing 600s 회수(`Catalog.php:1699-1702`)=job TTL(승인 아님). "클레임/리스" 주석(`Omnichannel.php:95`) |
| Lock(fencing token) | **PARTIAL / fencing 없음** | 조건부 UPDATE CAS + `FOR UPDATE SKIP LOCKED`(`Omnichannel.php:405`). **fencing token 없음**(claim_id 동등성만·monotonic fence 없음). 인증 스로틀 락(`login_attempt.locked_until`)은 무관 |
| Reservation | **ABSENT** | no hit(`reserve` 매치는 배송 release_addr 오탐) |
| Release | **PARTIAL** | 암묵만: stuck-processing→queued 재적재(`Catalog.php:1700`). 명시 "release" op 없음 |
| Reassignment | **ABSENT** | PM assignee 수동 add/remove(`PM/Assignees.php:17-72`)·엔진 없음 |
| Transfer | **ABSENT** | no hit |
| Fallback | **PARTIAL / 무관** | 채널 waterfall(`Omnichannel.php:110`)·AI fallbackContent(`AdminGrowth.php:1108`). approver-fallback 없음 |
| Capacity | **PARTIAL** | `PM/Enterprise.php:371-400` resourceCapacity(assignee 오픈태스크·est_hours·load_pct vs 40h/wk). **읽기전용 리포트**·배정로직 미소비 |
| Workload | **PARTIAL** | 동일 소스(`Enterprise.php:18,377-397`). 리포팅만 |
| Availability | **ABSENT** | approver 가용/on-call 모델 없음 |
| Affinity | **ABSENT** | 배정용 affinity 없음(CRM affinity는 무관) |
| Assignment Snapshot | **ABSENT** | no hit |
| Assignment Conflict | **PARTIAL** | 동시성 double-claim 방지만(CAS affected-rows `Catalog.php:1730` · SKIP LOCKED). 배정수준 conflict 모델 없음 |
| Assignment Drift | **ABSENT** | no hit |
| Assignment Reconciliation | **ABSENT** | no hit |
| Assignment Simulation | **ABSENT** | `AdminGrowth.php:1147-1239` simulate=캠페인 발송 시뮬(배정 아님) |

## 2. 실존 인접 인프라 — 상세 + §65 잠정 태그

### ⭐ 2.1 `catalog_writeback_job` — 유일한 실 승인 큐(claim 의미론)
- 테이블 `Catalog.php:75-84`(id,tenant_id,channel,sku,operation,status,attempt,payload,result,…). 형제 `catalog_writeback_approval`(:86-94)=얇은 티켓.
- 상태: `pending_approval→queued→processing→done/failed`(+awaiting_credentials/pending/superseded). 생산자=`writeback()` 고위험 op를 pending_approval 적재(:858-865,2289)·`approvalCreate`(:2301-2319)가 SSOT job 테이블 기록(구 고아 승인경로 은퇴 주석 :2312-2314).
- **승인자=테넌트 내 임의 requirePro**(`approveQueue`:2383-2407)·per-approver 배정 없음.
- claim/lease=실 CAS(:1721-1731)+600s 회수(:1699-1702). **job 대상**(승인 아님).
- **§65: `VALIDATED_LEGACY`(Approval Queue) + `CONSOLIDATION_REQUIRED`** — 06-A-02가 승인 큐를 지으면 pending_approval→approve→execute + CAS claim 패턴은 이것을 재사용(중복 금지). ★289차 13회차 high_value 게이트가 이 경로에 서버측 강제를 추가함(정합).

### 2.2 `action_request`(Alerting) — 생산자 부재 VACUOUS 확정
- 테이블 `Db.php:592`(action_json,approvals_json,status,tenant_id). 소비자 실재: `decide`(:582-598)·`executeAction`(:601-665·287차 fake-execution 수정 반영, AdAdapters::pause/updateBudget 정직 집행).
- **생산자 NONE** — `INSERT INTO action_request` backend 전체 0 hit. 287/288차 "생산자 전무" 확정.
- **§65: `BLOCKED_NO_PRODUCER`** — 실 승인/집행 의미론이나 상류 생성원 없음. 생산자(라이브검증/제품결정·288차 보류) 전엔 assignment 엔진 불가.

### 2.3 `admin_growth_approval`(AdminGrowth) — 실 1인 승인 큐
- 테이블 :142(ref_type/ref_id/summary/payload_json/status/requested_by). 생산자 createApproval(:1289-1298·AI콘텐츠 :1067·캠페인런치 :1158·pending dedup). 승인=admin **1인 결정**(:1313). 배정/후보/라우팅 없음.
- **§65: `KEEP_SEPARATE_WITH_REASON`** — 플랫폼 admin growth 승인=별개 도메인(단일 super-admin). shape는 Canonical Approval 스키마 공유 가능.

### 2.4 `TeamPermissions` `DELEGATION_EXCEEDED` — RBAC 부여상한(≠승인 위임)
- :644-647 manager가 자기 미보유 menu:action 위임 시도 시 발생(assignableMap cap :627-643). **권한 부여 상한**(못 가진 걸 못 줌).
- **§65: `KEEP_SEPARATE_WITH_REASON`** — 직교 RBAC. 승인 배정/위임과 혼동 금지(선행 art로 인용 금지).

### 2.5 `AgencyPortal` `agency_client_link` — 접근권 승인(≠업무 배정)
- 테이블 :80(agency_id/client_tenant_id/status pending→approved→revoked/scope_json). 승인=client 테넌트 owner(`approveAgency`:365-384)·매요청 fail-closed 재검증(:414-427).
- **§65: `KEEP_SEPARATE_WITH_REASON`** — 크로스테넌트 접근 위임 grant=별개 엔티티.

### 2.6 `pm_task_assignees` + PM capacity — 수동 배정(가장 근접)
- 테이블 pm_task_assignees(task_id,user_id,role owner/contributor/reviewer/observer `PM/Assignees.php:14,32`). M:N 수동 add/remove·dup 409. 
- capacity/workload=`PM/Enterprise.php:371-400`(assignee별 오픈태스크·est_hours·load_pct)·**읽기전용**·배정 미환류.
- 엔진 없음(전략·후보·claim/lease·자동해석·reassign 0).
- **§65: `VALIDATED_LEGACY`(수동 Work Item+Assignee) + `CONSOLIDATION_REQUIRED`** — 엔진 구축 시 role 모델+capacity 신호를 확장(재생성 금지).

### 2.7 `omni_outbox` claim/lease(Omnichannel) — 실 Claim/Lease/Lock 정본
- claim_id/claimed_at(:97-99)·`FOR UPDATE SKIP LOCKED`(:405)+CAS fallback(claimConditional :425-448)·"원자적 클레임/리스" 주석(:95). **메시지 발송용·승인 아님·fencing 없음**.
- **§65: `CANONICAL`(claim/lease 패턴)** — 이것+catalog CAS가 레포의 검증된 동시성-claim 관용구. Assignment Engine claim/lease는 이 패턴 재사용(SKIP LOCKED + SQLite CAS fallback).

## 3. 선행 4축 재검증 (별도 에이전트·상세는 §3.1~3.4)

| 축 | 선행세션(12회차) | 재검증 | 근거 |
|---|---|---|---|
| 1 Approval Chain | ABSENT | **ABSENT 확정** | `chain_*` 0 · flat 승인테이블 3종만(admin_growth_approval/catalog_writeback_approval/mapping_change_request) |
| 2 Authority Matrix | ABSENT | **ABSENT 확정** | `authority_matrix/amount_band` 0 · `TeamPermissions:627-647` DELEGATION_EXCEEDED=ACL monotonicity(인접·상이) |
| 3 Identity/Org | ABSENT | **ABSENT 확정** | `org_unit/reporting_line/incumbency/legal_entity` 0 · `parent_user_id`=owner 붕괴(`UserAuth:156-157,1225-1227`)·team_role flat 3값 |
| 4 Security/Authz | ABSENT | **PARTIAL(정정 상향)** | `SecurityAudit::verify():56-68`·break-glass(`UserAuth:773-778,864,910,1006`)·tenant격리(분산·비중앙) 실재하나 SoD hook·CoI·Actor Snapshot foundation 부재 |

★4축 재검증은 "결론의 근거도 재실증" 규율로 코드 직접 정독 수행 — 12회차 ABSENT 결론이 유지(축4만 PARTIAL로 미세 상향). Mapping maker-checker(자기승인 차단+정족수 `Mapping.php:267-271`)는 **도메인 국한·범용 SoD 아님(KEEP_SEPARATE)**.

## 4. 06-A-02 착수 판정

- **실·재사용(확장·재생성 금지)**: 승인큐 lifecycle+human-in-loop(`catalog_writeback_job`)·claim/lease/CAS(`omni_outbox`+catalog)·수동 assignee+role+workload신호(`pm_task_assignees`+resourceCapacity).
- **진짜 부재(EPIC 순신규)**: Assignment·Candidate·Resolution·Strategy(round-robin/least-loaded/weighted)·Queue Membership/Routing·Reservation·Reassignment·Transfer·Availability·Affinity·Snapshot·Drift·Reconciliation·Simulation·fencing token.
- **트랩 확정**: action_request=소비자만 VACUOUS(BLOCKED_NO_PRODUCER)·DELEGATION_EXCEEDED=RBAC 부여상한(승인위임 선행art 아님)·AdminGrowth.simulate=캠페인시뮬(배정 아님).
- **선행 4축(chain·authority·org) 부재로 다단 assignment routing이 참조할 SoT 없음** → 실 엔진=선행 신설 후 별도 승인세션(RP-002·12회차 결론 코드유지).

정본 결정=[[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]]. per-entity 판정=§72 DSAR 세트(ⓒ).
