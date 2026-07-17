# CANONICAL DSAR — Authorization Approval Workflow (Request·Workflow·Level·Quorum·State·Decision·Delegation Hook·Evidence)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙(§요구·Entity 필드·분류·산출 문서 목록·완료 보고 형식) **미제공**. 파트 번호·파트명만 선행 스펙(5-1 §1)에 명시. **구조·Entity·분류는 실측 + 5-1/5-2 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합**(RP-001 정합: 번호·이름 추정 없음·세부 자율 명시).
> 정본 쌍: 본 문서(Request/Workflow/Level/Quorum/State/Decision) + [`CANONICAL_DSAR_AUTHORIZATION_RISK_BASED_DECISION.md`](CANONICAL_DSAR_AUTHORIZATION_RISK_BASED_DECISION.md)(Risk Model/Threshold/Escalation/Auto-approval/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_RISK_BASED_DECISION.md`](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_RISK_BASED_DECISION.md).
> 선행: **5-1**(Approval Reference §18·Effect REQUIRE_APPROVAL·Obligation) · **5-2**(Role Registry 통합·Assignment Governance·Escalation Guard).
> **범위**: 승인 워크플로만 — **Maker-Checker/SoD/Delegation/Impersonation=5-4** · Break Glass/JIT=5-5 · Runtime PDP=5-6 · Audit/Access Review=5-7 · Certification=5-8. **중복 구현 금지.**

---

## 0. 실측 요약 — ★Multi-Level Approval 이 이미 실재한다

| 스펙 요구 | 현행 실측(코드 근거) | 분류 |
|---|---|---|
| **★Multi-Level Approval / 정족수(Quorum)** | ✅ **REAL** — **`mapping_change_request.required_approvals INT NOT NULL DEFAULT 2`**([Db.php:634](../../backend/src/Db.php)) + **정족수 누적 판정**: `$approvals[] = ["user"=>$actor,"ts"=>...]` → `count($approvals) >= (int)$r["required_approvals"] ? "approved" : "pending"`([Mapping.php:210-215](../../backend/src/Handlers/Mapping.php)) | **VALIDATED_LEGACY → Quorum 정본(재사용)** |
| **승인 요청 Entity** | ✅ **REAL 2종** — ①**`action_request`**(id·**policy_id**·tenant_id·**status**·**action_json**·**approvals_json**·created_at·[Db.php:592-600](../../backend/src/Db.php)) ②**`mapping_change_request`**(tenant_id·platform·field·raw_value·canonical_value·note·status·**requested_by**·**approvals_json**·**required_approvals**·created_at·[Mapping.php:167](../../backend/src/Handlers/Mapping.php)) | **CONSOLIDATION_REQUIRED**(2계통) |
| **승인 실행 연동** | ✅ **REAL** — **287차 가짜집행 근본수정**: 승인 후 **실 액추에이터(AdAdapters)로 집행 + 정직 상태 기록**(`executed`=실집행성공 / `failed`=실패 / `approved_manual`=자동집행 불가·[Alerting.php:608-611](../../backend/src/Handlers/Alerting.php)) | **VALIDATED_LEGACY(재사용·정본)** |
| **테넌트 격리(IDOR)** | ✅ **REAL** — action_request 승인/거부 시 **테넌트 소유 검증**(208차 P0·Alerting.php:580-582) · mapping approve 도 `WHERE id=? AND tenant_id=?`(Mapping.php:202/215) | **VALIDATED_LEGACY(재사용)** |
| **승인 결정(decision)** | ✅ **REAL** — `$decision = $body["decision"] ?? "approve"`(approve/reject·Alerting.php:578) | **재사용** |
| **Human-in-loop 승인 큐** | ✅ **REAL** — PriceOpt **239차 human-in-loop**: 내부가격 갱신 후 **writeback 큐에 `pending_approval` 적재**([PriceOpt.php:1586](../../backend/src/Handlers/PriceOpt.php)/1598) | **VALIDATED_LEGACY(재사용)** |
| **승인 감사** | ✅ **REAL** — `self::audit($pdo, $actor, "mapping_approve", ...)`(Mapping.php:218) · audit_log 12파일 | **재사용** |
| **★Maker-Checker(자기 승인 방지)** | ❌ **부재** — `approve()` 에 **requested_by == actor 검사 없음**(Mapping.php:196-216 전체 확인) | **NOT_APPLICABLE → 5-4**(본 문서 §7 관찰) |
| **★중복 승인 방지(동일인 2회)** | ❌ **부재** — `$approvals[]` 에 **dedup 없음**(Mapping.php:212) | **NOT_APPLICABLE → §7 관찰·5-4** |
| **Approval Level(단계별 역할)** | ❌ **부재** — `required_approvals` 는 **인원 수(count)만**·**누가/어떤 Role 이 승인해야 하는지 없음** | **NOT_APPLICABLE → 신설** |
| **Threshold 기반 승인**(금액·위험) | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 짝 문서** |
| **승인 만료 / SLA** | ❌ **부재** — expires_at·deadline 없음 | **NOT_APPLICABLE → 신설** |
| **승인 위임(Delegation)** | ❌ **부재** | **NOT_APPLICABLE → 5-4** |
| **승인 철회(Withdraw)/재요청** | ❌ **부재** | **NOT_APPLICABLE → 신설** |
| **Risk-based 자동 승인** | ❌ 부재(`risk_score` 히트는 **CustomerAI 이탈 위험**·승인과 무관=오탐) | **NOT_APPLICABLE → 짝 문서** |
| **SoD(직무분리)** | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 5-4** |

**★결론(정직)**: **승인 워크플로는 부재가 아니다 — 정족수(Quorum)까지 이미 실재**한다(`required_approvals DEFAULT 2` + 누적 판정). **★앞선 1차 grep 에서 "Multi-level/quorum 부재"로 판정했으나 오판**이었다(`quorum`/`approval_level` 만 검색해 **`required_approvals` 를 놓침**). 실 인접 = **승인 요청 2계통**(action_request·mapping_change_request) · **정족수 로직** · **승인 후 실 집행 + 정직 상태**(287차) · **테넌트 IDOR 차단**(208차) · **human-in-loop 큐**(PriceOpt 239차) · 승인 감사. **부재 = Approval Level(역할별 단계) · Threshold · 만료/SLA · 위임 · 철회 · Maker-Checker · 중복 승인 방지 · SoD**.

### ★인접 관찰 (본 세션 코드변경 0·근거 기록만·미확정)

**[관찰·미확정] `Mapping::approve()` 에 중복 승인·자기 승인 방지가 없다** — `approve()` 전체(Mapping.php:196-216) 확인 결과:
1. **중복 승인 방지 없음**: `$approvals[] = ["user"=>$actor, "ts"=>gmdate('c')];` 에 **동일 `$actor` 중복 검사가 없다**(:212). → **한 사용자가 approve 를 2회 호출하면 `count($approvals)=2` 가 되어 `required_approvals DEFAULT 2` 를 혼자 충족 → `approved`**(:214).
2. **자기 승인 방지 없음**: `requested_by`(:167 기록) **와 `$actor` 를 비교하지 않는다**. → **요청자 본인이 승인 가능**.
- **정직 표기**: **FP 레지스트리 규약상 PM 코드 재증명 전 P0 단정 금지** · 실 영향 판정에 필요한 것 = ①`/mapping/.../approve` 엔드포인트의 **호출 권한**(누가 approve 가능한지·5-1 §PEP 분산 상태) ②`mapping_change_request` 의 **실 운영 사용 여부** ③`self::actor()` 해석 방식. **본 세션 비파괴·미수정**.
- **분류**: **MIGRATION_REQUIRED → 5-4(Maker-Checker·SoD) 판정 대상** — 정족수 로직 자체는 정본이므로 **재사용하되 dedup + self-approval 가드를 5-4 에서 추가**.

---

## 1. Canonical Entity (16) — 자율 설계

APPROVAL_WORKFLOW · WORKFLOW_VERSION · APPROVAL_REQUEST · APPROVAL_LEVEL · APPROVAL_QUORUM_POLICY · APPROVER_CANDIDATE · APPROVAL_ACTION · APPROVAL_STATE · APPROVAL_DECISION · APPROVAL_EXPIRY_POLICY · APPROVAL_WITHDRAWAL · APPROVAL_ESCALATION_HOOK · APPROVAL_DELEGATION_REFERENCE · APPROVAL_RECONCILIATION · APPROVAL_EVIDENCE · APPROVAL_AUDIT_EVENT.
**현행 실체**: 승인 요청(action_request·mapping_change_request) · **정족수(required_approvals)** · 승인 누적(approvals_json) · decision(approve/reject) · 승인 후 실 집행(287차) · IDOR 차단(208차) · human-in-loop 큐(PriceOpt) = **REAL 재사용**. 나머지 = **신설**.

## 2. Approval Request (§1) — 2계통 통합

- **Request(§1)**: approval_request_id · **workflow_id · workflow_version · target_resource_type · target_resource_id · action · requested_by · request_reason · request_payload_reference · tenant_id · workspace_id · legal_entity_id · environment · risk_level · requested_amount · required_levels · current_level · state · submitted_at · expires_at · idempotency_key** · evidence.
- **★현행 2계통 매핑(CONSOLIDATION_REQUIRED)**:

| 현행 | 필드 | 용도 | 근거 |
|---|---|---|---|
| **`action_request`** | id · **policy_id** · tenant_id · status · **action_json** · **approvals_json** · created_at | Alerting 정책 액션 승인 | Db.php:592-600 |
| **`mapping_change_request`** | tenant_id · platform · field · raw_value · canonical_value · note · status · **requested_by** · **approvals_json** · **required_approvals** · created_at | 매핑 변경 승인 | Mapping.php:167 · Db.php:634 |

**★통합 원칙**: 두 계통을 **Canonical Approval Request 로 통합**하되 **기존 테이블·필드·판정 코드를 바꾸지 않는다**(회귀 0 · 5-2 Role 통합과 동일 규율). `action_request` 는 **requested_by 가 없고**, `mapping_change_request` 는 **policy_id 가 없다** → Canonical 이 **상위 집합**.

## 3. ★Approval Quorum (§2) — required_approvals 정본 승격

- **Quorum Policy(§2)**: quorum_policy_id · workflow · **required_approvals**(현행 정본) · **required_roles**(부재→신설) · **required_levels**(부재→신설) · **distinct_approver_required**(부재→**§7 관찰**) · **exclude_requester**(부재→**§7 관찰·5-4**) · min_privilege_level · evidence.
- **★현행 정본 재사용**: `required_approvals INT NOT NULL DEFAULT 2`(Db.php:634) + `count($approvals) >= required_approvals ? "approved" : "pending"`(Mapping.php:214) = **정족수 판정의 실 정본**.
- **★신설 필수 3종(§7 관찰 기반)**: **`distinct_approver_required=true`**(동일인 중복 승인 차단·현행 부재) · **`exclude_requester=true`**(자기 승인 차단·현행 부재·**5-4**) · **`required_roles`**(인원 수만이 아니라 **어떤 Role 이 승인해야 하는지**·현행은 count 만).
- **★§4 Quorum ≠ Level**: 현행 `required_approvals` 는 **인원 수(count)**이지 **단계(level)가 아니다**. "2명 승인"과 "Finance 1명 + Legal 1명 승인"은 **다른 요구**다.

## 4. Approval Level (§3) · Approver Candidate (§4) — 부재→신설

- **Level(§3)**: approval_level_id · workflow · **level_order · level_name · required_role · required_scope · required_count · required_clearance · parallel_or_sequential · skip_condition · escalation_after** · evidence. **★부재 확정** — 현행은 **평면 count**만.
- **Candidate(§4)**: 각 Level 에 **승인 가능한 Subject 집합**(Role + Scope + Clearance 로 산출) · **후보 0명이면 워크플로 생성 금지**(승인 불가 교착 방지) · **후보가 요청자 1명뿐이면 SoD 위반**(5-4).
- **Sequential vs Parallel**: 순차(Level1 완료 후 Level2) / 병렬(동시). **★순차에서 상위 Level 이 하위를 건너뛰면 APPROVAL_BYPASS**(5-2 Escalation Guard 8종 중 하나).

## 5. State (§5) · Decision (§6) · Expiry/Withdrawal (§7)

- **State(§5, 10)**: DRAFT · **PENDING**(현행 REAL) · PARTIALLY_APPROVED(현행: count < required 시 pending 유지 → **구분 불가**) · **APPROVED**(현행 REAL) · **REJECTED**(현행 decision=reject) · WITHDRAWN(부재) · **EXPIRED**(부재) · ESCALATED(부재) · **EXECUTED**(현행 REAL·287차) · **FAILED**(현행 REAL·287차).
- **★현행 정본 재사용(287차)**: 승인 후 상태를 **실 집행 결과로 정직 기록** — `executed`=실집행성공 / `failed`=실패 / `approved_manual`=자동집행 불가(Alerting.php:610-611). **★"승인됨"과 "집행됨"은 다른 상태**(287차 가짜집행 근본수정의 핵심 = status='executed' 로만 바꾸고 외부 API 미호출 → fake-looks-real).
- **Decision(§6)**: approval_decision_id · request · level · **approver · decision**(approve/reject·현행 REAL·Alerting.php:578) · **decision_reason**(부재→신설·거절 사유 필수) · decided_at · **on_behalf_of**(위임·5-4) · evidence.
- **Expiry(§7a)**: **현행 부재** — 승인 요청이 **무기한 pending** 가능. → `expires_at` + 만료 시 EXPIRED + 재요청 경로 신설. **★만료된 승인으로 집행 금지**(5-1 §18 "승인 만료 후 발효 금지" 계승).
- **Withdrawal(§7b)**: 요청자 철회 · **이미 APPROVED 면 철회 대신 Rollback 경로**(1-4 §37).

## 6. Approval Matrix — 현행

| 워크플로 | 요청 Entity | 요청자 기록 | 정족수 | 단계 | 만료 | 자기승인 차단 | 중복승인 차단 | 집행 연동 | 근거 |
|---|---|---|---|---|---|---|---|---|---|
| **Alerting 액션 승인** | **`action_request`**(policy_id·action_json·approvals_json) | ❌ 없음 | approvals_json | ❌ | ❌ | ❌ | ❌ | ✅ **실 집행+정직 상태**(287차) | Db.php:592-600 · Alerting.php:578/608-611 |
| **매핑 변경 승인** | **`mapping_change_request`** | ✅ **requested_by** | ✅ **`required_approvals` DEFAULT 2** | ❌(count만) | ❌ | **❌ §7 관찰** | **❌ §7 관찰** | apply() 별도 | Mapping.php:167/210-215 · Db.php:634 |
| **리프라이서 가격 반영** | writeback 큐 **`pending_approval`** | — | ❌ | ❌ | ❌ | — | — | Catalog writeback | PriceOpt.php:1586(239차 human-in-loop) |
| (Rebate 승인) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
