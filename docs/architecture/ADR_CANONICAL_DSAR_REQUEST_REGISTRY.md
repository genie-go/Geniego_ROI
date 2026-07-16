# ADR — Canonical DSAR Foundation & Request Registry (EPIC 06-A Part 3-3-3-3-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (DSAR Foundation·Canonical Request Registry 계약 명세 확정. 비파괴 — 코드변경 0). 실 Identity Verification Method·Data Discovery·Export 파일생성·Correction·Restriction Enforcement·삭제 실행·SLA Policy Engine·CI 가드 구현은 후속 승인 세션(Golden DSAR Dataset+Workflow Conformance+Legacy Equivalence+verify+배포승인). **Identity 미검증 데이터공개·권한없는 Agent Fulfillment·Jurisdiction 근거없는 확정·SLA 임의 하드코딩·법률 자동단정 금지. Identity Verification/Authorization=Part 3-3-3-3-2, Access/Export/Correction/Restriction=Part 3-3-3-3-3~6.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_SCHEMA.md`](../segmentation/CANONICAL_DSAR_SCHEMA.md) · [`WORKFLOW`](../segmentation/CANONICAL_DSAR_WORKFLOW.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_GOVERNANCE.md) · 기존 `Dsar.php`(283차·/v424·dsar_request/dsar_audit_log·타입3·상태4·SLA_DAYS=30·이메일토큰 fail-closed) · `GdprConsent`·`Compliance` · Part 3-3-3-1 Privacy · Part 3-3-3-2 Retention.

## 결정 (핵심)

1. **기존 DSAR 확장(재구현 금지)**: `Dsar.php` create/verify/export/execute(이메일 fail-closed·access/erasure/portability·GDPR Art.20/PIPA §35·anonymize 삭제·append-only audit)·GdprConsent·Compliance 는 **정본 — Canonical DSAR Registry·공통 Workflow 로 확장**. Access/Export/Correction/Restriction/Deletion 별 **독립 Case Registry 신설 금지**(§108). 정식 Request Version·Subject≠Requester·SLA Policy·Task/Dependency·Decision/Approval 는 현행 부재→신설.

2. **일반 Privacy 문의 ≠ DSAR(§3.1)**: 일반문의·Access·Portability·Rectification·Restriction·Erasure·Objection·Consent Withdrawal·Marketing Opt-out·Automated Decision Review·Complaint 를 공식 Request Type 으로 분리. **무관 문의를 DSAR Workflow 로 과대확대·실 권리요청을 단순 Support Ticket 으로 축소 금지**(현행 타입3 하드코딩 → Type Registry 14+Subtype).

3. **접수 ≠ 승인·이행(§3.2)**: 접수만으로 즉시 데이터 공개/수정/삭제 금지. Intake→Classification→Identity Verification→Authorization→Scope→Eligibility→Discovery→Review→Approval→Fulfillment→Delivery→Closure 분리. 금지전이(RECEIVED→COMPLETED·Identity Pending→Delivered·Scope 미확정→대량 Export·Approval Pending→Delivered·Legal Review→자동승인·Closed→재개) 차단.

4. **Requester ≠ Data Subject(§3.3)**: 본인·Authorized Agent·Parent·Guardian·Legal/Company Representative·Executor·Government·Internal Staff·Unauthorized Third Party 구분. 대리인은 Authority Source·Evidence·Allowed Type·Allowed Scope·Validity·Revocation 필수(현행 subject_email=requester 가정 → 분리). 검증 완료 전 Fulfillment 차단(fail-closed).

5. **Jurisdiction 근거없는 확정 금지·SLA 하드코딩 금지(§3.5·3.6)**: Requester 선택값만으로 Jurisdiction 확정 금지 → Subject Residence·Account Region·Contracting Entity·Notice·Service Region·Controller 종합. 불명 시 `LEGAL_REVIEW_REQUIRED`. **법정기간 코드 단일숫자 하드코딩 금지**(현행 SLA_DAYS=30) → Jurisdiction/Type/Verification/Complexity 별 SLA Policy Version. 구체 법정기간=검증된 정책 Registry(임의 단정 금지).

6. **Identity 검증 전 존재노출 금지·Malicious Content 방어(§3.4·3.7)**: 계정 Enumeration·Customer 존재확인·특정 데이터보유 여부 노출 금지. 필요이상 신분증/결제/Secret 수집 금지. Email/Form/Attachment 자연어 지시를 시스템 명령으로 실행 금지 — Prompt Injection·Malware·Macro·Script·Path Traversal·Archive Bomb·Raw Query 삽입 차단.

7. **Duplicate 자동거부 금지·History 불변(§3.8·3.9)**: 반복요청도 이전범위·완료상태·신규데이터·이전결과 오류·정당성·과도성 확인(연결/병합/Follow-up/증분/Manual Review). 분류·Scope·Assignment·DueDate·Extension·Decision·Communication 은 Version/Event 로 보존(덮어쓰기 금지·dsar_audit_log append-only 확장).

8. **정직·무후퇴·법률**: Request Version·SLA Policy·Jurisdiction·Responsible Entity·Scope·Task/Dependency·Processor Request·Decision/Approval/Escalation·Fulfillment Job Contract=현행 부재→목표계약. 법률 적합성 코드 자동확정 금지→`LEGAL_REVIEW_REQUIRED`. Dsar.php 5경로(/v424/dsar/*)·GdprConsent·Compliance 보존(Legacy Equivalence·API Compatibility). UNEXPLAINED·고객영향 LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§108)
신규 Privacy Request/DSAR Type/Intake Channel/SLA/Case Workflow 생성 전: Canonical DSAR Registry·Request Type Registry·Customer Identity Registry(EPIC05)·Jurisdiction Registry·Responsible Entity Mapping·Existing DSAR Workflow·SLA Policy Registry·Evidence/Attachment 정책 조회 → Scope/Verification/Authorization·Assignment/Task/Decision·Fulfillment Engine 연결·Security/Wrong-subject Risk 정의 → Golden/Conformance·중복/후퇴 검사·ADR/PM 기록. **Access/Export/Correction/Restriction/Deletion 별 독립 Case Registry + 공통 Workflow 중복 생성 금지.**

## 결과
DSAR Entity(30)·Request/Version Schema·Type(14)/Subtype·Subject(15)/Requester(10)/Representative/Authorization·Intake(13채널)/Validation/Malicious Defense·Jurisdiction/Responsible Entity·Scope Contract·State Machine(30+·금지전이 10)·Priority(5)/Risk(19)·SLA Policy/Due Date/Extension/Pause·Duplicate(8)/Abuse·Identity/Authorization Hook·Evidence(19)/Attachment Governance·Assignment/Task(22)/Dependency(18)·Processor Request·Communication(14)/보안·Decision(14)/Approval/Escalation(16)·Fulfillment Job Contract·Explain/Lineage·API/Permission(27)/Override·Lint(18)/Guard(17)·Error(25)/Warning(15)·Golden(42+)/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_{SCHEMA,WORKFLOW,GOVERNANCE}.md(§100 90여 문서 통합). 다음 **EPIC 06-A Part 3-3-3-3-2 — DSAR Identity Verification, Requester Authentication & Representative Authorization Governance** 입력 준비 완료.
