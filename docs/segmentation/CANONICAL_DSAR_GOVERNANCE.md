# Canonical DSAR Governance — Explain/Lineage, API/Permission/Security, Override, Lint/Guard, Error/Warning, Golden Dataset, Conformance/Equivalence, Observability, Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Dsar.php`(운영자 execute·fail-closed verified·append-only dsar_audit_log·UserAuth::logAudit `dsar_request_created`) · index.php `/dsar/verify` public bypass(토큰 인증) · Part 3-3-3-1 Privacy(Runtime Enforcement·Override)·Part 3-3-3-2 Retention(Runtime Expiry).
> 형제: [`CANONICAL_DSAR_SCHEMA.md`](CANONICAL_DSAR_SCHEMA.md) · [`CANONICAL_DSAR_WORKFLOW.md`](CANONICAL_DSAR_WORKFLOW.md) · ADR=[`../architecture/ADR_CANONICAL_DSAR_REQUEST_REGISTRY.md`](../architecture/ADR_CANONICAL_DSAR_REQUEST_REGISTRY.md)

---

## 1. Lineage (§79) & Explain (§80)

**Lineage(§79)**: Intake → Requester → Subject → Identity Verification → Authorization → Jurisdiction → Responsible Entity → Scope → Classification → SLA → Tasks → Data Assets/Processors → Decision → Fulfillment → Delivery → Closure. 각 단계 ID·Version·Actor·Time·Policy 기록.
**Explain(§80)**: 어떤 요청유형·누구의 요청·Requester-Subject 관계·적용 Jurisdiction·책임 Entity·Scope·필요 Verification·적용 SLA·Due Date 계산근거·남은 Task/Dependency·관련 Processor·승인/제한/거부 사유·발송 Communication·종료시점을 설명 가능.

---

## 2. API (§81) & Security (§82)

**기능(§81)**: Request 생성/조회/분류 · Subject/Requester/Representative 연결 · Jurisdiction 조회·설정 · Scope 조회·변경 · SLA/Due Date 조회 · Extension 요청 · Pause/Resume · Assignment · Task 조회·변경 · Evidence 등록·조회 · Attachment 등록·조회 · Communication 발송·조회 · Decision 생성 · Approval · Escalation · Fulfillment Job 생성 · Withdrawal · Closure · Explain · Lineage · Audit 조회. (현행 = create/verify/listRequests/export/execute 5종 → 확장·기존 경로 보존.)
**Security(§82)**: Actor 인증 · Tenant/Workspace/Brand Scope · Legal Entity Scope · Request Ownership · Privacy/Evidence/Attachment Permission · Sensitive Metadata Masking · Rate Limit · Enumeration 방지 · Idempotency · Audit · Environment 분리. **★신규 실배선 `/api` 접두 필수**(basePath strip 정합·프로젝트 함정).

---

## 3. Permission (§83) & Override (§84)

**Permission(§83, 27종)**: CREATE_DSAR_REQUEST · VIEW_DSAR_REQUEST · VIEW_DSAR_STATUS · CLASSIFY_DSAR · LINK_DSAR_SUBJECT · MANAGE_DSAR_REQUESTER · VERIFY_DSAR_IDENTITY · VERIFY_DSAR_AUTHORIZATION · RESOLVE_DSAR_JURISDICTION · DEFINE_DSAR_SCOPE · MANAGE_DSAR_SLA · REQUEST_DSAR_EXTENSION · APPROVE_DSAR_EXTENSION · PAUSE_DSAR · RESUME_DSAR · ASSIGN_DSAR_CASE · MANAGE_DSAR_TASK · VIEW_DSAR_EVIDENCE · UPLOAD_DSAR_EVIDENCE · SEND_DSAR_COMMUNICATION · CREATE_DSAR_DECISION · APPROVE_DSAR_DECISION · ESCALATE_DSAR · RUN_DSAR_FULFILLMENT · CLOSE_DSAR · VIEW_DSAR_AUDIT · ADMIN_OVERRIDE. (v421 RBAC viewer<connector<analyst<admin + scope 정합.)
**Override(§84)**: override_id·request_id·original/requested_state·scope·reason·evidence·controls·approvers·effective_time·expiry·audit. **★일반 Override 금지**: 미검증 Identity 로 데이터공개·권한없는 Agent 공개·Cross-Tenant Scope·타 Subject 데이터포함·Security Secret 공개·Approval 없는 Denial·SLA 조작·Audit 삭제·Evidence 위조·Legal Hold 무시.

---

## 4. Static Lint (§85) & Runtime Guard (§86)

**Static Lint(§85·CI)**: Request Type 없는 DSAR · Subject 없는 Fulfillment · Identity Verification Reference 없는 Export · Authorization 없는 Agent Request · Jurisdiction 없는 SLA 계산 · **Due Date 하드코딩**(현행 SLA_DAYS=30 대상) · Request Scope 없는 Discovery · Request Version 없는 상태변경 · Audit 없는 Decision · Approval 없는 Denial · Evidence 없는 Override · Tenant Scope 없는 Request Query · Raw Attachment 자동실행 · Request 원문 Prompt 직접실행 · 다른 Request 결과재사용 시 Subject 검증누락 · Communication 수신자 검증누락 · Closed Request 재실행 · Idempotency 없는 Fulfillment Job.
**Runtime Guard(§86)**: Identity 미검증 Fulfillment · Authorization 미검증 Agent Fulfillment · Cross-Tenant Subject · Wrong Brand · Scope 미확정 · Jurisdiction 미해결 · Closed/Cancelled Request 실행 · Expired Authorization · Invalid Evidence · Wrong Delivery Recipient · Duplicate Fulfillment · Due Date Policy Version 불일치 · Legal Review Required 자동실행 · Security Risk High/Critical · Attachment Malware · Requester Withdrawal 후 신규 Job · **Kill Switch** 활성.

---

## 5. Error (§87) & Warning (§88)

**Error(§87, 25종)**: DSAR_REQUEST_INVALID · _TYPE_NOT_FOUND · SUBJECT_NOT_FOUND · REQUESTER_NOT_FOUND · AUTHORIZATION_REQUIRED · AUTHORIZATION_INVALID · IDENTITY_VERIFICATION_REQUIRED · IDENTITY_VERIFICATION_FAILED · JURISDICTION_UNRESOLVED · RESPONSIBLE_ENTITY_UNRESOLVED · SCOPE_NOT_CONFIRMED · SLA_POLICY_NOT_FOUND · DUE_DATE_CALCULATION_FAILED · EXTENSION_NOT_ALLOWED · PAUSE_NOT_ALLOWED · DUPLICATE_DETECTED · RISK_TOO_HIGH · EVIDENCE_INVALID · ATTACHMENT_BLOCKED · TASK_DEPENDENCY_BLOCKED · DECISION_NOT_APPROVED · FULFILLMENT_NOT_ALLOWED · DELIVERY_RECIPIENT_INVALID · PERMISSION_DENIED · REQUEST_CLOSED.
**Warning(§88, 15종)**: DUE_DATE_APPROACHING · IDENTITY_REVIEW_REQUIRED · AUTHORIZATION_EXPIRING · JURISDICTION_CONFLICT · SCOPE_CLARIFICATION_REQUIRED · POSSIBLE_DUPLICATE · PROCESSOR_DELAY · DATA_DISCOVERY_GAP · HIGH_SENSITIVE_DATA · MINOR_REQUEST · EXTENSION_RECOMMENDED · COMMUNICATION_DELIVERY_WARNING · MANUAL_REVIEW_REQUIRED · LEGACY_WORKFLOW_USED · SLA_AT_RISK.

---

## 6. Golden Dataset (§89) & Conformance (§90) & Equivalence (§91-92)

**Golden Dataset(§89·테스트 전용 42+ 시나리오)**: 본인 Access/Export/Rectification/Restriction/Erasure/Objection · Consent Withdrawal · Marketing Opt-out · Authorized Agent · Expired Authorization · Invalid Agent Evidence · Parent/Guardian · Minor · Company Representative · Anonymous Visitor · Deleted Subject · Unknown Subject · Email/Web Form/Support Ticket Intake · Duplicate/Overlapping/Follow-up/Reopened · Spam · Malicious Attachment · **Prompt Injection Attempt** · Cross-Tenant · Wrong Brand · Multiple Jurisdiction · Legal Review Required · Scope Clarification/Expansion · SLA Due Soon/Extension · Invalid Pause · Processor Dependency · High-risk Sensitive · Wrong Recipient Delivery 차단 · Withdrawal · Closure with Open Task 차단 · Denial Approval Required · Closed Request 재실행 차단 · Historical Request Version 조회.
**Workflow Conformance(§90)**: Access·Portability·Rectification·Restriction·Erasure·Objection·Automated Decision Review·Complaint 에 동일 공통기반(Intake·Subject·Requester·Verification·Authorization·Jurisdiction·Scope·SLA·Assignment·Task·Decision·Approval·Communication·Audit) 적용 검증.
**Legacy Equivalence(§91)**: 기존 Dsar.php·Privacy·Support·Deletion Workflow 와 비교(Type·Status·Subject·Requester·Identity·Authorization·Jurisdiction·Scope·SLA·Due Date·Assignment·Communication·Decision·Fulfillment·Closure·Error·Warning). **Difference 상태(§92)**: MATCH · EXPECTED_{CLASSIFICATION/SCOPE/IDENTITY/AUTHORIZATION/JURISDICTION/SLA/SECURITY}_CORRECTION · LEGACY_PRIVACY_DEFECT · LEGACY_SECURITY_DEFECT · LEGACY_SLA_RISK · CANONICAL_DSAR_DEFECT · LEGAL_REVIEW_REQUIRED · MANUAL_REVIEW · UNEXPLAINED · BLOCKED. **★`UNEXPLAINED`·고객영향 `LEGACY_PRIVACY_DEFECT`·`LEGACY_SECURITY_DEFECT` = 자동 운영전환 차단**.

---

## 7. Observability (§93) & Audit Event (§94)

**Metrics(§93)**: Request Count·Type Count·Intake Channel Count·Open·Identity Pending·Authorization Pending·Jurisdiction Review·Scope Review·Due Soon·Overdue·Extension·Pause·Duplicate·High-risk·Assignment Delay·Processor Delay·Communication Failure·Decision Pending·Fulfillment Pending·Closed·Denied·Withdrawn·Manual Review·Legacy Workflow Usage·P50/P95/P99.
**Audit Event(§94, 32종)**: DSAR_REQUEST_RECEIVED·_CLASSIFIED·_VERSION_CREATED · SUBJECT/REQUESTER/REPRESENTATIVE_LINKED · AUTHORIZATION_REQUESTED/VERIFIED · IDENTITY_VERIFICATION_REQUESTED/VERIFIED · JURISDICTION_RESOLVED · RESPONSIBLE_ENTITY_RESOLVED · SCOPE_DEFINED/CONFIRMED · DUE_DATE_CALCULATED · EXTENSION_REQUESTED/APPROVED · PAUSED/RESUMED · DUPLICATE_LINKED · RISK_ASSESSED · CASE_ASSIGNED · TASK_CREATED/COMPLETED · PROCESSOR_REQUEST_SENT · COMMUNICATION_SENT · DECISION_CREATED/APPROVED · ESCALATED · FULFILLMENT_JOB_CREATED · REQUEST_WITHDRAWN · REQUEST_CLOSED · RUNTIME_BLOCKED. (현행 dsar_audit_log append-only 확장·삭제 금지.)

---

## 8. Existing Implementation Classification (§95) & Duplicate Audit (§96) & Regression Gate (§97)

**분류(§95)**: 실측 결과 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `Dsar.php` create/verify/listRequests(dsar_request·dsar_audit_log) | `MIGRATION_REQUIRED` → `CANONICAL_DSAR_REQUEST_REGISTRY` | 단일테이블·타입3·상태4·Version부재 → Registry+Version 확장 |
| `Dsar.php` verify(이메일토큰 fail-closed) | `LEGACY_ADAPTER` → `CANONICAL` Identity Hook | 정상동작·Part 3-3-3-3-2 Method 확장 |
| `Dsar.php` export(GDPR Art.20/PIPA §35·collectSubjectData) | `VALIDATED_LEGACY` | 정상 — Part 3-3-3-3-4 Export Engine 로 확장 |
| `Dsar.php` execute/eraseSubject(anonymize) | `VALIDATED_LEGACY` | Part 3-3-3-3-5/6 Correction/Restriction·Part 3-3-3-2 Deletion Eligibility 연계 |
| `SLA_DAYS=30` 하드코딩 | `CONSOLIDATION_REQUIRED` → SLA Policy Registry | Jurisdiction/Type별 Policy Version 로 치환(Due Date Static Lint 대상) |
| `GdprConsent`(쿠키동의) | `KEEP_SEPARATE_WITH_REASON` | Consent 도메인(Part 3-3-1)·Marketing Opt-out DSAR 와 연계만 |
| `Compliance`(SOC2/ISO 리포팅) | `VALIDATED_LEGACY` | Audit·Certification 참조 |
**Duplicate Audit(§96)**: 실측 — **별도 deletion_request/access_request/privacy support queue/독립 SLA·Case Engine 없음**(단일 Dsar.php·grep `deletion_request` = 주석 1건). 중복 Store 신설 위험만 차단(§108 Type별 독립 Case Registry 금지).
**Regression Gate(§97)**: 변경 전후 Intake Channel·Type·Subject·Requester·Representative·Identity·Authorization·Jurisdiction·Responsible Entity·Scope·SLA·Extension·Pause·Duplicate·Assignment·Task·Evidence·Attachment·Communication·Decision·Approval·Escalation·Fulfillment·Withdrawal·Closure·Explain·Audit·**Existing API Compatibility**(/v424/dsar/* 보존) 비교. 승인없는 기능감소 = 전환차단.

---

## 9. 완료 상태 요약

Canonical DSAR Entity 30 · Request Type 14 · Subtype(Access 9·Rect 7·Restr 5) · Subject Type 15 · Requester Type 10 · Intake Channel 13 · Request Status 30+ · 금지 Transition 10 · Jurisdiction Resolution 7상태 · Responsible Entity 7상태 · Scope Field 18 · Priority 5 · Risk 19 · SLA Policy Schema · Due Date/Extension/Pause · Duplicate Match 8 · Identity Hook 10상태 · Authorization Hook 10상태 · Evidence Type 19 · Attachment Rule 13 · Assignment · Task Type 22 · Dependency 18 · Processor Request 12상태 · Communication Type 14 · Decision Type 14 · Approval 8상태 · Escalation Trigger 16 · Fulfillment Job Contract · Static Lint 18 · Runtime Guard 17 · Error 25 · Warning 15 · Golden 42+ · **계약 명세 확정**(코드변경 0). **실 Data Discovery·Export·Correction·Restriction·삭제 실행 = Part 3-3-3-3-2~8(후속 승인 세션·verify+배포승인).**
