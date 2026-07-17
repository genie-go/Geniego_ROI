# DSAR — 기존 구현 분류 (§52)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **★핵심: 승인은 부재가 아니라 존재·분산·불균등 — 통합이지 신설이 아니다.**
> **★단 Rebate 승인 "대상"은 진짜 부재** — `REBATE_*` 코드 **0줄**(§4).

## §1. 승인 테이블 4종 (전부 인라인 DDL · `backend/migrations` 에 승인 DDL **0**)

| 테이블 | 분류 | 근거 | 실측 |
|---|---|---|---|
| **`mapping_change_request`** | **CANONICAL_APPROVAL_REQUEST**(승격·정본 후보) | Db.php:623-636 · idx :655 | `tenant_id·platform·field·raw_value·canonical_value·note·status('pending')·requested_by·approvals_json·**required_approvals INT DEFAULT 2**·created_at` — **유일하게 정족수 컬럼 보유** |
| **`action_request`** | **MIGRATION_REQUIRED** | Db.php:592-600 · tenant ALTER :589 | `policy_id·tenant_id·status·action_json·approvals_json·created_at` — 🔴 **`required_approvals` 컬럼 없음**(정족수 개념이 스키마에 부재) |
| **`admin_growth_approval`** | **CONSOLIDATION_REQUIRED** | AdminGrowth.php:142-149 | `ref_type·ref_id·ref_key·summary·payload_json·status·requested_by·decided_by·decided_at` — 🔴 **`tenant_id` 없음**(전역) · **단일 결재**(decided_by 1명) |
| **`catalog_writeback_approval`** | **DEPRECATION_CANDIDATE**(고아) | Catalog.php:86-94 / :126-130 | 🔴 **읽는 SELECT/승인 코드 0** — `Catalog.php:2269-2272` 주석이 자인. 실 SSOT = `catalog_writeback_job.status='pending_approval'` |
| `agency_client_link` | **LEGACY_ADAPTER**(승인 후 취소 선례) | AgencyPortal.php:68 / :80 | `status pending→approved→**revoked**` + `scope_json·approved_at·revoked_at` — **현행 유일한 revoke 선례** |

## §2. 승인 핸들러 — 실측 판정

| 심볼 | 분류 | 근거 | 실측 동작 |
|---|---|---|---|
| **`Mapping::actorId`** | **CANONICAL_APPROVAL_ACTOR**(★정본 패턴) | Mapping.php:36-53 | `auth_key`(미들웨어가 key_hash 검증 후 주입한 api_key 행) → `apikey:{id}` · `UserAuth::authedUser` → `user:{email}` · **미확인 = null → 403 fail-closed** |
| **`Mapping::approve`** | **CANONICAL_APPROVAL_DECISION**(★유일 REAL maker-checker) | Mapping.php:238-294 | 신원 미확인 403 · **자기승인 403** · **동일 actor 재승인 409** · **pending 아니면 409** · `count>=required_approvals` |
| **`Mapping::apply`** | **VALIDATED_LEGACY**(실행 전 승인 게이트 정본) | Mapping.php:296-327 · 게이트 :309 | `status!=='approved'` 거부 → `applied` 전이 — **현행 유일한 실행 전 게이트** |
| **`FeedTemplate::transition`** | **VALIDATED_LEGACY**(상태전이 강제 선례) | FeedTemplate.php:248-285 | `draft→submitted→approved→published` 순차 강제 · 역행 차단 · `must_approve_first` **409** |
| **`AgencyPortal::approveAgency`** | **VALIDATED_LEGACY** | AgencyPortal.php:365-384 · 재검증 :427 | 링크 approved + scope_json · **매 요청 approved 재검증 fail-closed** |
| 🔴 **`Alerting::actor`** | **MIGRATION_REQUIRED** | Alerting.php:33-36 | **클라이언트 `X-User-Email` 헤더 / `?actor=` 쿼리 → 기본 `'unknown'`** = 위조 가능. **Mapping 이 289차에 고친 것과 동일 결함이 미전파** |
| 🔴 **`Alerting::decideAction`** | **MIGRATION_REQUIRED** | Alerting.php:572-599 | **1회 approve → 즉시 `approved`**. 정족수·자기승인·dedup **전무** |
| 🔴 **`Alerting::listActionRequests`** | **MIGRATION_REQUIRED**(표시≠실제) | Alerting.php:541-569 · 리터럴 :562 | 응답에 `"required_approvals" => 2` **하드코딩** — DB 컬럼 없고 집행이 참조 안 함 = **장식** |
| 🔴 **`Alerting::executeAction`** | **MIGRATION_REQUIRED**(승인 우회) | Alerting.php:601-660 · SELECT :612 | `status` 를 SELECT 하나 **어디서도 판독 안 함**(죽은 읽기) → `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) **실집행** |
| `AdminGrowth::approvalDecide` | **CONSOLIDATION_REQUIRED** | AdminGrowth.php:1313-1343 | 단일 `decided_by` → ref 엔티티 전이 + audit. **tenant 스코프 없음** |
| `AdminGrowth::approvals` | **CONSOLIDATION_REQUIRED** | AdminGrowth.php:1299-1310 | `WHERE status=?` **전역 조회**(테넌트 격리 없음) |
| `AdminGrowth::createApproval` | **LEGACY_ADAPTER**(약한 dedup 선례) | AdminGrowth.php:1289-1297 · :1292 | 동일 `ref_type/ref_id` pending 존재 시 재사용 — **현행 유일한 승인측 중복 방지** |
| `Catalog::approveQueue` | **MIGRATION_REQUIRED** | Catalog.php:2341-2364 | `pending_approval→queued` **벌크 전이 · 승인자 신원 미기록** |
| `Catalog::approvalCreate` | **LEGACY_ADAPTER** | Catalog.php:2258-2277 | 고아 테이블 대신 `catalog_writeback_job` 에 적재(우회 구현) |
| 🔴 **`TeamPermissions::ACTIONS`** 의 `'approve'` | **UNVERIFIED → 고아** | TeamPermissions.php:39 · 시드 :708-717 | 상수·시드에만 존재 · **전 핸들러 통틀어 approve 권한 검사 호출부 grep 0** = **데이터만 있는 고아** |

## §3. 인접 기반 — 재사용 대상

| 항목 | 분류 | 근거 |
|---|---|---|
| `api_key` RBAC(`role`·`scopes_json`·SHA-256 `key_hash`) + 미들웨어 주입(`auth_key`/`auth_role`/`auth_tenant`) | **VALIDATED_LEGACY**(★Actor 신뢰근원) | Db.php:942-955 · index.php:591-593 |
| `menu_audit_log.hash_chain CHAR(64)` | **`PARTIAL`** — 🔴**"유일 선례" 거짓**(`SecurityAudit` 실재) · 🔴**"tamper-evident" 거짓**: 체인 연결만 실재(`:194`+`lastHash():216`) · preimage `'ts'=>date('c')`(`:195`)가 **INSERT 컬럼(`:199-203`)에 `created_at` 부재**로 미저장(`:129` DB DEFAULT) → **검증 영구 불가** · 검증기 0. **재사용 대상 아님 — 이식할 정본은 `SecurityAudit::verify():56-68`** | AdminMenu.php:123-131 · :194-203 · SecurityAudit.php:27/29-31/56-68 |
| `dedup_key` + `uq_{table}_dedup` UNIQUE · `Paddle.php:343` `notification_id` UNIQUE | **VALIDATED_LEGACY**(Idempotency 선례 → 확장) | Db.php:257-281 · :1023,1034 · Paddle.php:343 |
| `channel_credential` AES-256-GCM · `no_credentials` 게이트 | **VALIDATED_LEGACY**(Evidence 자격증명 금지 기반) | Db.php:976 · 267차 |
| `fxToKrw`(24통화 + `app_setting` 24h 캐시) | **VALIDATED_LEGACY**(다통화 합산 차단 기반) | Connectors.php:1749 |
| `audit_log` | **CONSOLIDATION_REQUIRED** | Db.php:540-546 · 중복 DDL AdminGrowth.php:157 |
| `pm_audit_log` | **KEEP_SEPARATE_WITH_REASON**(PM 도메인) | migrations/20260526_168_008:5-15 — `action` ENUM 에 **`approve` 없음** |
| `PlanPolicy` | **BLOCKED_POLICY_DRIFT**(승인 게이트 기반 부적격) | PlanPolicy.php:12 — 🔴 **fail-open**(주석 자인) |
| `acl_permission`(`menu_key`×8동작) | **KEEP_SEPARATE_WITH_REASON**(**메뉴 게이팅** ≠ 레코드 권한) | TeamPermissions.php:152,169 |

## §4. 🔴 `NOT_APPLICABLE`(부재·grep 0 → 신설) — 스펙 요구 대비

- **`REBATE_*` 전부** — `backend/src`·`frontend/src` **0 occurrence / 0 file**. **승인 대상 엔티티 자체가 코드에 없다**(Rebate 는 문서에만 존재) → 본 블록은 **전방호환 계약**이다.
- **Approval Case / Item / Requirement / Participant / Candidate** — 현행은 전부 **단일 레코드 1건 승인**(다품목·부분승인 구조 0)
- **Version**(Request/Case) · **Snapshot**(Resource/Context/Actor Authorization) · **Immutable Hash**(승인 도메인)
- **Decision 테이블 자체** — 현행은 전부 `UPDATE ... SET status=?` **덮어쓰기**(Append-only 위배·§4.9)
- **Status History** · **State Machine**(BPMN/Temporal/Camunda/Flowable/Zeebe/Step Functions **backend/src grep 0**)
- **Execution Binding · Consumption · Single-use · 잔여 실행 횟수 · Validity**
- **Correlation** · **Idempotency**(승인) · **Withdrawal/Cancellation/Reopen/Supersession** · **Reconciliation**
- **Policy Version** · **Role Version / Assignment Scope** → **결정 시점 권한 고정 불가**(§4.6 미충족)
- **레지스트리**: Workspace(실체=`tenant_kv` KV · WorkspaceState.php:59) · Organization · Department · Legal Entity · Country/Region · Feature Flag · Incident · Task · Workflow

## §5. 팬텀 승인 라우트 (API 는 응답하나 구현 없음)

`$register` 가 `$custom` 맵에 없으면 `$templateHandler` **501 폴백**(routes.php:1821-1827):
`:1868` `/v384/budget/requests/{id}/approve` · `:1943,1953,1967,1998,2059` `/v399~403/recon/reports/{id}/approve`
→ **budget·recon 승인은 "있어 보이나 부재"** = 기존 드리프트 사례(§43 Reconciliation 근거).

## §6. 규칙

**VALIDATED_LEGACY 는 재사용 강제**(헌법 Golden Rule = Replace 가 아니라 Extend).
**★Canonical Approval Foundation 은 신설이 아니라 `Mapping::approve`+`actorId` 의 검증된 maker-checker 를 공용 추출**하고
`action_request`·`admin_growth_approval`·`catalog_writeback_job` 을 그 위로 흡수하는 것이다 —
**위조불가 신원·자기승인 차단·actor dedup·정족수·상태 게이트는 이미 REAL 이며 단 한 도메인(mapping)에만 있다.**

🔴 **`NOT_APPLICABLE` 을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤 교훈).
🔴 **`MIGRATION_REQUIRED` 4건(Alerting 계열)은 본 블록 미수정** — **비파괴·코드변경 0** · **별도 승인 세션**(사용자 결정).
단 **`Alerting::executeAction` 승인 우회는 `INSERT INTO action_request` grep 0 → 생산자 전무 → 현재 도달 불가(VACUOUS)**.
**생산자 배선 시 즉시 활성 결함** — 그 전에 고쳐야 한다(G-01 이 노출 0일 때 고쳐진 것과 동일 논리).
