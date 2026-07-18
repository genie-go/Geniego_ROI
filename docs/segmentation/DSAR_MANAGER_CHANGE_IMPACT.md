# DSAR — Manager Change Impact (§64)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §64 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Manager Relationship 축 | `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id` **backend/src grep 0** · ★git 삭제 이력 **0** → **팬텀도 유물도 아니다 · 존재한 적이 없다** | `ABSENT` |
| **Active Task 개념** | ★**`APPROVAL_*` 12종 grep 0**(재확인) · **워크플로 정의 테이블 `workflow_*`/`flow_*`/`wf_*` `CREATE TABLE` grep 0**(5-3-2 확정 · 재확인) | `ABSENT` |
| Task **Claim** | **`Omnichannel::claimBatch:390`** — `claim_id = bin2hex(random_bytes(8))`(`:392`) = **워커 잡 선점**(`omni_outbox` · `FOR UPDATE SKIP LOCKED` `:385` 주석 · TTL 자동 해제 `:397-398`) | `KEEP_SEPARATE_WITH_REASON` |
| 승인자 결정 | 4경로 전량 **"호출자가 곧 승인자"** — `Mapping::approve:238-294`(`actorId :246`) · `Catalog::approveQueue:2341-2365`(🔴**행위자를 읽지도 않음**) · `AgencyPortal::approveAgency:365-385`(`:370` `isTenantOwner`) · `FeedTemplate::approveDraft:271` | ⊘ |
| Approval **Candidate Resolver** | `resolveApprover`·`approval_chain`·`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열**(`Mapping.php:248`,`:280`) | `ABSENT` |
| **서버 캐시 계층** | 🔴**Redis/Memcached grep 0**(재확인 — `Payment.php:817-820` "reDis" 히트는 `totalBefore`**Dis**`c` **오탐**) · `apcu_*` 는 **`SystemMetrics.php:225-451` 지표 보고 전용**(`:235` `apcu_cache_info` · `:433-442` 요청/에러 카운터) — **캐시 API 아님** | `ABSENT` |
| 소급 정정 집행 수단 | 🔴**`ensureTables` 는 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}` 뿐 · 데이터 변환·백필 없음**(39개소) · `backend/migrations/` **172차 정지** | `ABSENT` |

### ★★ 이 절의 대전제 — **"영향"을 계산하려면 영향받을 대상이 있어야 한다**

§64 는 *"Manager Relationship 변경 시 다음 영향을 계산하라"* 고 요구한다. 그러나 **좌변(Manager Relationship)도 우변(Active Task)도 레포에 없다.**

```
Manager Relationship 변경        ← 관계 축 grep 0 (트리거가 없다)
   → Active Approval Task 영향   ← Task 축 grep 0 (대상이 없다)
      → 영향 계산 결과 = ∅        ← "영향 없음"
         → 대시보드 "정상"        ← 🔴 가짜 녹색
```

> 🔴 **규칙 10 적중**: 현행이 Manager 변경 시 Task 를 흔들지 **않는 것은 §64 준수가 아니라 흔들 Task 가 없어서**다. **"영향 0건"을 정합의 증거로 계산하면 288차 `ok=>true` 위장의 재현**이다.

### ★ Task Claim ≠ Job Claim — **5축 상이**(5-3-2 §38 확정 · 본 절에서 재확인)

| 축 | 원문 §64/§65 `Claimed Task` | 현행 `Omnichannel::claimBatch:390` |
|---|---|---|
| **주체** | **사람**(Manager) | **워커 프로세스**(`claim_id` = 익명 랜덤 16진 `:392`) |
| **대상** | 승인 Task | 발송 아웃박스 행(`omni_outbox`) |
| **목적** | **권한 있는 자의 결재 착수** | **중복 처리 방지**(동시성 제어) |
| **인가** | Manager 관계·Approval Authority 검증 필요 | **인가 개념 없음** — 먼저 잡는 워커가 소유 |
| **해제** | 정책(§65 9종)에 따른 판단 | **TTL 자동 회수**(`:397-398` 무조건) |

🔴 **`claimBatch` 를 §64 `Claimed Task` 의 커버로 계산 금지.** 형태(문자열 `claim`)만 같고 **다섯 축 전부 다르다.**

## 1. 원문 전사 + 판정 — **원문 20종**(영향축 13 + 기본 정책 7)

### 1-1. 영향축 — 원문 13종 (:2210-2222)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Active Approval Task Assignee | Task 축 grep 0 · 승인 4종 어디에도 **assignee 컬럼 없음** · 승인자 = 요청 시점 호출자 | `ABSENT` |
| 2 | Available Task Candidate | ★**후보 계산 코드 0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) | `ABSENT` |
| 3 | Claimed Task | `Omnichannel::claimBatch:390` = **잡 선점**(§0 5축 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | Pending Approval Chain | `approval_chain` grep 0 · `approvals_json`(`Mapping.php:285`) = `{user, ts}` **2키 JSON 배열** = **체인 아님·인덱스 불가** | `ABSENT` |
| 5 | Approval Requirement | `required_approvals` 컬럼 **실재** · `Mapping.php:287` **정족수 판정에 실사용** · 🔴**유일 생산자 `:210` 이 리터럴 `2` 하드코딩** → 요청자·금액·위험도·**Manager 변경 무엇에도 반응 안 함** | `PARTIAL` · 🔴**축이 아니라 상수** |
| 6 | SLA Owner Reference | `sla_days` **유일 히트 `Dsar.php:388`** = `SLA_DAYS` 상수(**고객 DSAR 요청 처리 기한**) · **owner 참조 0** | `ABSENT` |
| 7 | Escalation Owner Reference | `escalate` 히트 = **`Reviews.php:174`·`:179` 부정 리뷰 → Slack 통지**(282차 R3) · **소유자 개념 0 · 승인 도메인 아님** | `ABSENT` |
| 8 | Delegation Reference | `DELEGATION_EXCEEDED`(`TeamPermissions.php:645`) = **권한 부여 상한**(위임자가 자기 권한 초과 부여 차단) · 주석 `:16` 도 *"data_scope 로 위임 한계 강제"* · **Manager 직무대리 아님** | `NAME_ONLY` |
| 9 | Notification Recipient | `recipients` = **`Reports.php:73`·`:92` `report_schedule` 이메일 목록**(리포트 구독자) · **Manager 관계에서 수신자를 도출하는 코드 0** · ⚠️인접 발송 인프라(SMS/Email)는 실재 | `ABSENT` |
| 10 | Organization Snapshot | §3.1 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend 전역 grep 0) · `pm_baseline.captured_at` 은 **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360`) → `KV_ONLY` · 🔴`snapshot` grep 최다 히트 = **CCTV JPEG 프레임**(`WmsCctv.php:45`) | `CONTRACT_ONLY` |
| 11 | Manager Snapshot | Manager 관계 자체가 0 → **동결할 대상 0** · `Actor Authorization Snapshot` 도 `ABSENT`(승인 시점 권한 동결 0) | `ABSENT` |
| 12 | Future Scheduled Task | `next_run_at` = **`Reports.php:75`·`:77` 리포트 스케줄러**(+286차 SMS 예약 워커) · **Task 스케줄러 아님** · 🔴**`effective_to`/`valid_to`/`valid_from` grep 0 · as-of 술어 전역 0** → 미래 시점 자체를 표현 못 함 | `ABSENT` |
| 13 | Reconciliation State | §66·§67 참조 — ★**이중 공허**(좌변·우변 양쪽 부재) | `CONTRACT_ONLY` |

### 1-2. 기본 정책 — 원문 7종 (:2226-2232)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 14 | 완료된 Decision: 변경하지 않음 | 🔴🔴 **정면 반례 실재** — `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거**(재초대 `:304` status→`pending` · 승인 `:381` status→`approved`) → **이력이 물리적으로 소멸**. 이전 결정은 **변경되지 않는 게 아니라 흔적조차 남지 않는다.** 그리고 **`ensureTables` 는 백필을 하지 않아**(§0) **소급 정정 집행 수단도 없다** | `ABSENT` · 🔴**반례** |
| 15 | 이미 Claim된 Task: 정책에 따라 유지 또는 재검증 | Claim(사람) 개념 0 → 정책 축 전체가 §65 로 이월 · **9정책 전건 `ABSENT`** | `ABSENT` |
| 16 | 미Claim Task: Candidate 재평가 가능 | Candidate 계산 0(#2) · 🔴**재평가를 트리거할 캐시 무효화 대상 자체가 없다** — **서버 캐시 계층 부재**(§0 · 규칙 10) | `ABSENT` |
| 17 | 새 Approval Case: 새 Manager 관계 사용 | **Approval Case 개념 0** · 승인 4종은 **케이스가 아니라 행 상태**(`mapping_change_request`·`catalog_writeback_job.status`·`action_request`·`admin_growth_approval`) | `ABSENT` |
| 18 | Critical Security Change: Active Task 재검증 | 대상(Task) 0 · ★**단 재검증 패턴 선례는 레포 최상급**: `AgencyPortal::resolveAccessContext:414-432` — **세션 캐시를 믿지 않고 매 요청 링크 재조회**(`:423`) → `status!=='approved'` 면 즉시 null(`:427`) → 세션↔링크 tenant 불일치 방어(`:428`) → `index.php:85-90` **403** | `LEGACY_ADAPTER`(패턴만) |
| 19 | Terminated Manager: Active Task 재할당 Hook | `terminated`·`deleted_at` **grep 0** · 🔴**`is_active` = 계정 상태이지 고용 상태가 아니다**(base DDL **`Db.php:1106`** · 소비처 전부 인증 게이트 `UserAuth.php:248`,`:805`,`:2455`) · **강등 경로 0**(`promoteManager:768-776` — `manager_user_id=NULL` 로 바꿔도 전임자 `team_role='manager'` 잔존 → 위임 권한 계속 보유) | `ABSENT` |
| 20 | Cross-Tenant Drift: 즉시 Block | ★**인접 집행 실재**: `PM/Dependencies.php:91`(**매 홉 tenant 필터**) + `:32-34`(**쓰기 전 422 `cycle_detected`**) · `AgencyPortal:428`(세션↔링크 tenant 불일치 방어) · `index.php` fail-closed 403 | `LEGACY_ADAPTER` |

**실측 개수: 20 / 20 전사.**
- **측정기 분모 20** = 영향축 13 + 기본 정책 7. **원문 대조 20 · 전사 20 — 3자 일치.**
- 🔴 **PM 브리핑은 "§64 13개 영향축"이라 했으나 측정기·원문은 20**이다. 13 은 **첫 목록만**이며 `기본 정책` 7종(:2226-2232)이 누락됐다. **7종을 빠뜨리면 §64 의 절반(정책 축)이 통째로 소실**되므로 20 전건을 전사했다.
- 원문 §64 는 **`evidence` 로 끝나지 않는다**(:2232 = `Cross-Tenant Drift: 즉시 Block`) → **관례에 맞추려고 `evidence` 를 추가하지 않았다**(규율 규칙 4 반대 편향 방지).

커버리지 = `ABSENT` 14 · `CONTRACT_ONLY` 2(#10·#13) · `LEGACY_ADAPTER` 2(#18·#20) · `KEEP_SEPARATE_WITH_REASON` 1(#3) · `NAME_ONLY` 1(#8) · `PARTIAL` 1(#5) · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- ★★🔴 **"영향 0건"을 준수로 계산 금지.** #1~#13 중 12종이 0인 것은 **정합이 아니라 축의 부재**다(규칙 9·10). 영향 계산기를 지금 구현하면 **항상 `영향 없음`을 반환하는 가짜 녹색 생성기**가 된다 — 288차 `ok=>true` 위장(ChannelSync 14채널 18개소)과 **구조적 동형**이다.
- ★★🔴 **#14 "완료된 Decision 변경 금지"는 현행이 이미 위반 중이다.** `AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` **소거 패턴을 신규 설계에 절대 복제 금지.** 상태 전이는 **덮어쓰기가 아니라 append** 여야 한다.
  - **`pm_audit_log` 패턴을 확장하라** — `tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스+append-only(migration `20260526_168_008`).
  - 🔴 **전역 `audit_log`(`Db.php:540-545` · 4컬럼 · **tenant_id 없음** · 해시체인 없음) 사용 금지** — 테넌트 격리가 깨진다.
  - 무결성이 필요하면 `menu_audit_log.hash_chain`(SHA-256 prev-chain `AdminMenu.php:128`·`:182-197`·`:214-219`) **알고리즘만 이식** — 🔴**`menu_audit_log` 스키마는 `tenant_id` 가 없고 `lastHash():214-219` 에 tenant 술어가 없다 → 복제 금지 · 테넌트별 체인 시 `WHERE tenant_id=?` 필수.** 🔴 **단 쓰기 체인만 실재하고 검증기(`verify()`)가 0**이며 preimage `ts`(`:195`)가 INSERT 컬럼에 없어 `created_at` DB DEFAULT 가 덮어 재계산 불가 → tamper-evident 아님. 검증형 정본 = `SecurityAudit::verify():56-68`.
- ★🔴 **#16 캐시 무효화 — 무효화할 캐시가 없다**(규칙 10). **Redis/Memcached 0 · `apcu_*` 는 지표 보고 전용**(`SystemMetrics.php:225-451`). 따라서:
  - **"캐시 무효화 훅을 붙인다"는 설계는 현 시점에 대상이 없다.** 캐시 계층 도입은 **별도 결정**이며 §64 의 전제가 아니다.
  - 🔴 **역으로, Manager Resolution 캐시를 신설한다면 §80 Cache 원칙(Version-aware·Tenant-isolated·Effective-date-aware · 원문 :2858-2860)을 먼저 충족해야 한다.** 캐시를 먼저 만들고 무효화를 나중에 붙이면 **테넌트 교차 오염**(286차 `platform_growth` 하이재킹과 동형)이 발생한다.
  - ⚠️ **`Manager Change 후 Candidate Cache 미갱신` 문자열은 §64 원문에 없다** — 원문 **:2374(§68 Critical Gap 후보)** · **:2687(§76 중복 구현 감사)** 소재다. **§64 항목으로 전사하지 않았다**(규칙 1 · 요구 날조 0). 본 규칙은 §64 #2·#16(`Candidate` 축)에 걸리는 **설계 제약**으로만 기록한다.
- ★🔴 **#5 `required_approvals` 를 "요건 모델 실재"로 계산 금지**(규칙 7). 컬럼은 있고 판정에도 쓰이지만 **생산자가 리터럴 `2`**(`Mapping.php:210`) — **5-3-3-1 D-13 `menu_defaults.version = 리터럴 'baseline'`(버전이 아니라 라벨)과 정확히 동형**이다. **"컬럼이 있다 → 축이 있다"는 이름 기반 존재증명**이며 규칙 7 위반이다.
- ★🔴 **#3 `claimBatch` 를 재사용 금지 · 참조도 신중히.** 5축 상이(§0). 차용 가능한 것은 **동시성 기법**(`FOR UPDATE SKIP LOCKED` `:385` · TTL 회수 `:397-398` · MySQL<8 폴백 `claimConditional :416`)뿐이며, **소유·인가·해제 정책은 전부 신규**다. 🔴 **TTL 무조건 회수를 사람의 Task Claim 에 그대로 이식하면 §65 `KEEP_CLAIM_UNTIL_COMPLETION` 이 정의상 불가능해진다.**
- ★🔴 **#19 Terminated Manager Hook 의 선결 조건 = 고용 상태 축.** `is_active` 로 대체 금지 — **계정 상태**이며 **`NOT NULL DEFAULT 1` → 미지가 자동으로 "가용" = fail-open**(§41 8종 중 표현 가능 2종 · `UNKNOWN` 조차 불가). 헌법 Vol3 **Unknown ≠ Eligible** 위반이다.
  - ★**유일한 확장 지점 = SCIM `active` 인입 경로**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) — **REAL 이며 IdP→내부 상태 반영이 실제로 동작**한다.
  - 🔴 단 **SCIM PATCH 는 `'active'` 경로만 분기**(`scimUpdateUser:391-396`) → **`manager` 경로는 침묵 no-op(200 반환·저장 0)**. **고용 상태를 SCIM 으로 받겠다면 `active` 는 가능하나 `manager` 는 불가능**하다.
- ★**#18·#20 은 `LEGACY_ADAPTER` — 패턴만 차용하고 스키마는 복제하지 마라.**
  - `AgencyPortal::resolveAccessContext:414-432` = **레포 최상 재검증 선례**(매 요청 fail-closed). 🔴 단 **`agency_client_link` 자체 재사용 금지** — 이분(bipartite)·1홉 전용·**동의 기반 접근 허가**이지 감독 관계 아님.
  - `PM/Dependencies.php` = **경로 접두 `backend/src/Handlers/PM/…`**(🔴 **`backend/src/PM/` 는 존재하지 않는다** — 5-3-3-1 문서 25편에 오표기 전파). 🔴**`pm_task_dependencies` 스키마 복제 금지** — `:90-91` 이 `dep_type` 을 술어에 넣지 않아 **전 타입 무차별 순회**이며, 이 결함을 물려받으면 **§11 Manager Type 27종별 정책이 설계 시점에 이미 불가능**해진다.
- 🔴 **#1·#2 를 "구현했다"고 보고 금지 — 생산자 없는 스켈레톤 금지.** 5-3-2 `Alerting::executeAction` 팬텀(`INSERT INTO action_request` **grep 0** → 생산자 전무 → 죽은 스켈레톤)을 287차가 **"가짜 집행"**으로 확정했다. **영향 계산기를 붙이기 전에 Manager Relationship(좌변)과 Task(우변)가 먼저 실재해야 한다.**
- 🔴 **잠복 결함 경고**: `Alerting::actor:33-36` 은 **여전히 `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백**(289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴)이며 `decideAction:591` 이 이를 그대로 기록한다. **현재 생산자 0 이라 도달 불가**이나, **§64 영향 계산기가 `action_request` 를 생산자로 삼는 순간 위조가능 승인이 활성화된다.** → **`Mapping::actorId:36-53` 3분기 fail-closed 패턴**(`apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` 폴백 `:49` / 미확인 null `:52` → **403** `:246-250`)을 표준으로 삼으라.
- **회귀 커버리지 0** — `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인) · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 캠페인 계약키**(조직 team 아님 · 이름 함정) · `scenarios.mjs` 매니저 0. ★**"Manager 변경 시 영향이 실제로 계산되는가"를 검증하는 E2E 가 완료 조건**이다.
- 🔴 **20종 "있다고 가정"하고 배선 금지.**
