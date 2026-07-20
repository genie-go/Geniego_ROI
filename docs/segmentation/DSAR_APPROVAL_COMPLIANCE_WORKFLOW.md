# DSAR — Compliance Workflow (Part 3-17 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §14 — Compliance Workflow)

컴플라이언스 통제 활동을 **7단계 상태기계**로 규정한다. 각 단계는 산출물과 승인 게이트를 가진다:

1. **Assessment** — 대상 통제/규칙에 대한 초기 평가.
2. **Review** — maker-checker 검토(요청자 ≠ 검토자).
3. **Remediation** — 위반·갭에 대한 조치 계획·실행.
4. **Validation** — 조치 결과의 유효성 검증.
5. **Approval** — 정족수 기반 최종 승인.
6. **Evidence** — 증적 축적(감사 append-only).
7. **Closure** — 워크플로 종결·상태 봉인.

각 인스턴스는 `{id, stage, control_ref, maker, checker, evidence_refs, status}` 계약을 가지며 단계 전이는 게이트 통과 시에만 허용된다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| maker-checker 정족수(Review/Approval) | `Mapping.php:238-291`(승인 워크플로)·`:267-269`(self-approval 차단) | PARTIAL(compliance 워크플로로 배선) |
| 적용 게이트(Closure 전이) | `Mapping.php:309-310`(apply 게이트) | 재사용 대상 |
| 승인요청 상태 저장 | `Db.php:592-600`·`:623-636`(mapping_change_request) | 재사용 대상 |
| Assessment/Remediation/Validation 단계 | `Compliance.php:53-130`(posture)·`:90-113`(control) | 평가 입력만·단계기계 아님 |
| Evidence append-only | `SecurityAudit.php:14-68`·`:56-68`(해시체인 verify) | 재사용 대상 |
| 7단계 상태기계 | — | **ABSENT(전이 로직 grep 0)** |

## 3. 설계 계약

1. `ComplianceWorkflow::transition(id, from_stage, to_stage)` — 단계 전이는 게이트 통과 시에만. Review/Approval 전이는 `Mapping.php:238-291` maker-checker 정족수 재사용, self-approval 차단(`:267-269`) 강제.
2. Closure 전이는 `Mapping.php:309-310` apply 게이트 패턴을 준용 — 미승인 시 종결 불가.
3. Assessment 입력은 `Compliance.php:53-130` posture·`:90-113` control 리스트를 소비하되, 단계기계 상태는 별도 저장(`Db.php:592-600` 확장).
4. Evidence는 `SecurityAudit.php:14-68` append-only 해시체인에 연결(`:56-68` verify 정본).

## 4. KEEP_SEPARATE (흡수 금지)

- `Dsar.php`·`LegalDoc.php` — **데이터주체 프라이버시** 처리 워크플로. compliance 통제 워크플로와 분리.
- `DataPlatform.php:297-302` — 데이터 품질 rule. 통제 워크플로 아님.

## 5. 판정

**PARTIAL** — 승인 substrate(Mapping 정족수 maker-checker `Mapping.php:238-291`·self-approval 차단 `:267-269`·apply 게이트 `:309-310`)와 evidence append-only(`SecurityAudit.php:14-68`)는 실재하나, 7단계 상태기계(Assessment→Review→Remediation→Validation→Approval→Evidence→Closure) 전이 로직은 grep 0. 현행 substrate를 compliance 워크플로로 배선하는 **순신설**(7단계 상태기계). 코드 변경 0 · BLOCKED_PREREQUISITE(선행: 단계 정의·게이트 조건 정본화).
