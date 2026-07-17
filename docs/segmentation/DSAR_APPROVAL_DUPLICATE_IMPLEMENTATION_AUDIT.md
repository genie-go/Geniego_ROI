# DSAR — 중복 구현 감사 (§53)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> 기존 구현 실측: [DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md)

## §1. 스펙 §53 감사 대상 — 전수 판정

| 스펙 §53 항목 | 실측 | 판정 |
|---|---|---|
| **여러 Approval Request Table** | **4종** — `mapping_change_request`(Db.php:623) · `action_request`(Db.php:592) · `admin_growth_approval`(AdminGrowth.php:142) · `catalog_writeback_approval`(Catalog.php:86·**고아**) | 🔴 **중복 REAL** |
| **여러 Approval Status Enum** | `pending/approved/applied`(Mapping) · `pending/approved/rejected/executed/failed/approved_manual`(Alerting.php:628,644) · `pending/...`(AdminGrowth) · `pending_approval/queued`(Catalog.php:2341) · `pending/approved/revoked`(AgencyPortal.php:68) · `draft/submitted/approved/published`(FeedTemplate.php:257) | 🔴 **6벌 · 상호 비호환** |
| **여러 Approval Decision Table** | **0** — Decision 테이블 자체가 없음(전부 `UPDATE status`) | ✅ 중복 없음(**부재**) |
| **여러 Approver 모델** | `requested_by`/`approvals_json`(Mapping) · `approvals_json`(action_request) · `decided_by`(admin_growth_approval) · 미기록(Catalog::approveQueue:2341-2364) | 🔴 **3벌 + 1 부재** |
| **여러 Approval History Store** | **0**(Status History 부재) · 감사만 `audit_log` 4곳 호출 | **부재** |
| **여러 Approval Comment Store** | `approval_comment` grep **0** · `mapping_change_request.note`(Db.php:623) 단일 컬럼뿐 | **부재** |
| **여러 Approval Attachment Store** | `approval_attachment` grep **0** | **부재** |
| **여러 Approval Snapshot 모델** | `approval` snapshot grep **0**. 유사물 = `mapping_change_request` 의 raw/canonical **값 복사 보관**(Db.php:623-636) 1건 | **부재**(유사물 1) |
| **여러 Approval Queue 모델** | `catalog_writeback_job.status='pending_approval'`(Catalog.php:2258-2277) · `admin_growth_approval`(pending 큐) · 프론트 `Approvals.jsx` | 🔴 **2~3벌** |
| **여러 Approval Idempotency 구현** | 승인측 = `AdminGrowth.php:1292`(ref pending 재사용) **1건뿐**. 타 도메인 선례 = `dedup_key` UNIQUE(Db.php:257-281) · `Paddle.php:343` | 🟠 **분산**(승인측 사실상 부재) |
| **여러 Approval Execution Binding** | **0**(개념 부재) | **부재** |
| **Claim·Funding·Payout별 독립 Approval Engine** | **부재** — `orderhub_claims.status='pending'`(migrations/…165_001:12) · `orderhub_settlements.status='pending'`(165_002:9) · `pg_settlement`(PgSettlement.php:81) 은 **처리 파이프라인 상태값**이지 승인 아님(approve 핸들러 grep 0) | ✅ **오탐 주의** — 승인 엔진 아님 |
| **ERP·Provider·Admin UI별 독립 승인 상태** | ERP/Provider 승인 grep **0**. Admin UI = `admin_growth_approval`(전역·tenant 없음) | 🟠 **1벌** |
| **API별 하드코딩된 승인 Flag** | 🔴 **`Alerting.php:562` `"required_approvals" => 2` 리터럴** — DB 컬럼 없음·집행 미참조 | 🔴 **REAL(가짜녹색)** |
| **Boolean `approved` 필드만 사용하는 구현** | `is_approved`/`approved_by` grep **0** | ✅ 없음 |
| **원본 Business Record 안에 승인 상태만 저장** | 🔴 **`catalog_writeback_job.status='pending_approval'`**(Catalog.php:2258-2277) — 원본 작업 레코드에 승인 상태를 얹음 · `journeys.status`/`feed_template.status` 동일 패턴 | 🔴 **REAL**(§4.1 위배) |
| **Decision 을 Update 하는 구현** | 🔴 **전부** — `Alerting.php:653` · `AdminGrowth.php:1313-1343` · `Catalog.php:2341-2364` · Mapping 도 `UPDATE ... approvals_json` | 🔴 **REAL**(§4.9 Append-only 위배) |
| **Approval 없이 직접 실행 가능한 우회 경로** | 🔴 **`Alerting::executeAction`**(Alerting.php:601-660) — `:612` status SELECT 후 **미판독** → pending/rejected 도 실집행. **단 생산자 0 → VACUOUS** | 🔴 **REAL(잠복)** |

## §2. ★중복 축의 정체 — "4벌"이 아니라 "1 REAL + 3 미달"

**단순 중복이 아니다.** 4개 승인 구현의 **성숙도가 극단적으로 불균등**하다.

| 축 | mapping | action_request | admin_growth | catalog |
|---|---|---|---|---|
| 정족수 컬럼 | ✅ `required_approvals` | 🔴 **없음** | 🔴 없음(단일결재) | 🔴 없음 |
| 정족수 집행 | ✅ `count>=required` | 🔴 1회→approved | 🔴 단일 | 🔴 없음 |
| 위조불가 신원 | ✅ `actorId`(289차) | 🔴 `X-User-Email` | 🟠 `decided_by` 문자열 | 🔴 **미기록** |
| 자기승인 차단 | ✅ 403 | 🔴 없음 | 🔴 없음 | 🔴 없음 |
| actor dedup | ✅ 409 | 🔴 없음 | — | — |
| 상태 게이트 | ✅ pending 409 · apply :309 | 🔴 **우회**(:612 미판독) | 🟠 | 🔴 벌크 |
| tenant 격리 | ✅ | ✅ (208차 IDOR) | 🔴 **없음** | ✅ |

> 🔴 **"승인 엔진이 4개"가 아니라 "제대로 된 승인 엔진이 1개(mapping)이고 나머지 3개는 승인처럼 보이는 것"이다.**
> 이 표는 **통합 방향을 결정한다** — 평준화가 아니라 **mapping 을 정본으로 승격하고 나머지를 흡수**.

## §3. 통합 계획 (스펙 §54 Step 22 · **본 블록은 계약만 · 코드변경 0**)

| 단계 | 대상 | 방향 |
|---|---|---|
| **1** | `Mapping::actorId`(:36-53) + `Mapping::approve`(:238-294) + `apply` 게이트(:309) | **공용 추출** → `CANONICAL_APPROVAL_ACTOR` / `_DECISION` / `_EXECUTION_BINDING` 정본 |
| **2** | `action_request` | Canonical Request/Case 로 **흡수** · `required_approvals` 컬럼 신설 · `Alerting::actor` 폐기 · `executeAction` 상태 게이트 |
| **3** | `admin_growth_approval` | **흡수** + `tenant_id` 보강(현재 전역) |
| **4** | `catalog_writeback_job.status='pending_approval'` | Canonical Request 로 **흡수**(원본 레코드에서 승인 상태 분리 · §4.1) |
| **5** | `catalog_writeback_approval`(고아) | **DEPRECATION_CANDIDATE** — 읽는 코드 0 확인 후 제거(★삭제 전 5단계 증명 의무) |
| **6** | 팬텀 승인 라우트(routes.php:1868 등) | Canonical 배선 or **제거** — "있어 보이나 부재" 해소 |
| **7** | `TeamPermissions::ACTIONS` 의 `'approve'`(:39·호출부 0) | Canonical Requirement 의 **required action 으로 배선** — 고아 해소 |

> 🔴 **4번째 Approval Foundation 신설 금지.** 위 표대로 **1을 정본으로 승격**한다.
> 🔴 **`EquivalenceProof` 선행 없이 3계통 통합 금지** — 증명 없는 통합은 **286차 rank 맵 붕괴**(starter=growth=pro=1)의 재현이다.
> 상태 Enum **6벌** 통합 시 각 도메인의 **현행 정상 동작 보존이 최우선**(1-9 Legacy Equivalence).

## §4. 규칙

**본 블록 산출 = 계약뿐. 코드변경 0 · 회귀 0.**
통합 실행은 **별도 승인 세션**(사용자 결정 · 289차) — Alerting 계열 4건 수정 포함.
**중복 감사에서 "부재"로 판정된 항목을 신설할 때도 Golden Rule 적용** — 인접 도메인의 검증된 선례
(`menu_audit_log.hash_chain` · `dedup_key` UNIQUE · `Paddle` notification_id · `FeedTemplate` 전이 강제)를
**먼저 확장 검토**하고, 그것이 불가한 근거를 남긴 뒤에만 신설한다.
