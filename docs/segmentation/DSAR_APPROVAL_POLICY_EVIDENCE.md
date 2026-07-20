# DSAR — PDP/PEP Governance: 결정 증거 (APPROVAL_POLICY_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_POLICY_EVIDENCE(SPEC §15·§23)는 **하나의 결정이 어떻게 도출되었는지를 재구성 가능한 추적(trace)으로 저장**하는 엔티티다. SPEC §23이 명시한 저장 필드는 5종의 trace다.

| 필드 | SPEC 근거 | 의미 |
|---|---|---|
| Evaluation Chain | §23·§8 | Decision Pipeline 12단계 평가 순서 궤적 |
| Rule Trace | §23·§16 | 적용/미적용 Dynamic Rule 궤적 |
| Scope Trace | §23·§16 | data_scope 해석·clamp 궤적 |
| Assignment Trace | §23·§16 | Effective Role/권한 부여 근거 궤적 |
| Risk Trace | §23·§16 | Risk 평가 입력·판정 궤적 |

Evidence는 §24 Digest 입력이며 §16 Decision Explain(Which Rule/Scope/Assignment/Risk)의 원자료다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Evidence 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| 불변 증거 저장(해시체인) | **PARTIAL** | SecurityAudit append-only+verify(`SecurityAudit.php:12-53`·`:56-68`) — tamper-evident이나 **문자열 detail만**·rule/scope trace 미기록 (GT① §G, GT② §2) |
| 감사 SSOT | **PARTIAL** | `auth_audit_log`·`logAudit`(`UserAuth.php:4174-4197`·`:4203`) — 문자열 detail·결정 trace 없음 (GT① §G) |
| Scope Trace 재료 | **PARTIAL** | `effectiveScope`·`scopeValuesFor`(`TeamPermissions.php:236-265`·`:272-280`)·clamp(`:356-373`·`:423-429`) 궤적 생성 가능하나 미기록 (GT① §C) |
| Assignment Trace 재료 | **PARTIAL** | `effectiveForUser` clamp(`TeamPermissions.php:393-421`·`:407-416`)·`assignableMap`(`:381-387`) — 부여근거 존재·trace 미저장 (GT① §C) |
| Rule Trace | **ABSENT** | Dynamic Rule 평가 궤적 저장 부재 (GT② §2 authz) |
| Risk Trace | **PARTIAL→ABSENT** | `auth_audit_log.risk`(`UserAuth.php:4165`·`:4172`·`:4190-4191`)는 정적 문자열·PDP 미소비 (GT① §D) |
| 위반 나열(Explain 근접) | **PARTIAL** | `teamAudit`·`$violations`(`TeamPermissions.php:714-731`·`:656-674`) DELEGATION_EXCEEDED 위임위반 나열만 (GT① §G, GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **확장 원칙(신설 아님)**: Evidence는 **SecurityAudit 해시체인 확장**(ADR D-5). 현행 문자열 detail(`UserAuth.php:4174`)을 구조화된 Evaluation Chain/Rule Trace/Scope Trace/Assignment Trace/Risk Trace로 확장. append-only(`SecurityAudit.php:12-53`)+verify(`:56-68`) 무결성 재사용.
- **Evaluation Chain 고정순서**: §8 Decision Pipeline 12단계(Request→Context→Attribute→Effective Role(ERRE 3-7)→Scope→Policy→SoD(3-10)→Risk→Compliance→Decision→Audit→Cache) 순서를 그대로 기록(ADR D-1).
- **불변버전·Digest 무결성**: Evidence 레코드는 append-only·수정 불가. §24 Digest가 Evidence 해시로 변조 검출.
- **테넌트 격리**: §30 Tenant Isolation — Evidence는 `X-Tenant-Id`(`index.php:619`) 경계 내 저장.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

- `Catalog.php:1104`(evaluatePolicy)·`RuleEngine.php:24`·`Decisioning.php:12`·`:432`(마케팅 규칙/추천)의 실행 로그·근거는 **마케팅 결정 증거**이지 authz Evidence 아님(GT② §5 C-1). 흡수·개명 금지.
- `ModelMonitor.php:220-335`(ML 드리프트 증거)·`Mapping.php:269`(maker-checker 알림 거버넌스)도 authz Evidence 아님(GT② §C-2·C-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(SecurityAudit 확장 기반)**. 불변 증거 저장은 **재활용 확장**(SecurityAudit 해시체인)이나 Rule Trace·구조화 Scope/Assignment/Risk Trace는 **ABSENT/미기록**(순신규 확장). Explain 근접물 `$violations`(`TeamPermissions.php:656-674`)는 위임위반 나열에 국한.
- **재활용**: `SecurityAudit.php:12-68`·`auth_audit_log`(`UserAuth.php:4174`)·`effectiveScope`(`TeamPermissions.php:236-265`)·clamp(`:356-373`·`:423-429`)·`$violations`(`:656-674`).
- **선행 의존**: 구조화 Evidence는 중앙 PDP(effectiveForUser `TeamPermissions.php:393-421` 승격)+Decision Pipeline(§8) 배선 후 성립 — **BLOCKED_PREREQUISITE**. 코드 변경 0·NOT_CERTIFIED.
