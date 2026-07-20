# DSAR — Authorization Compliance Attestation (Part 3-17 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §16 Attestation)

**Attestation**은 인가 상태(role·permission·access)에 대해 책임 주체가 "내가 검토했고 이것이 정당하다"를 명시적으로 서약(sign-off)하는 규제 통제다. SPEC §16은 5주체를 규정한다: **User**(내 접근이 필요하다)·**Manager**(내 부하의 접근을 승인한다)·**Auditor**(통제가 준수됨을 검증한다)·**Executive**(조직 전체 인가 상태를 책임진다)·**System**(비인간 identity의 권한을 소유자가 서약한다). 각 attestation은 justification(정당화 근거)·evidence(뒷받침 증거)·타임스탬프·불변 기록을 필수로 한다. 핵심은 recertification — 주기적으로 "여전히 정당한가"를 재서약하고 미서약분은 회수 대상으로 표기한다.

## 2. Substrate 매핑

| SPEC 주체/요소 (§16) | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| Justification + Evidence 기록 | AccessReview justification/evidence | `AccessReview.php:177-242` | PARTIAL(api_key 축) |
| 검토 판정(decision) 기록 | AccessReview 판정 필드 | `AccessReview.php:191-194` | PARTIAL |
| 증거 append(불변) | AccessReview 증거 기록 | `AccessReview.php:224-233` | PARTIAL |
| Maker-Checker 승인 재사용 | Mapping 이중승인 | `Mapping.php:238-291` | PRESENT-재사용 |
| 서약 불변 봉인 | SecurityAudit 체인 | `SecurityAudit.php:56-68` | PRESENT |

현행 attestation substrate는 `AccessReview.php:177-242` 검토 흐름에 국한되며, justification+evidence를 남기되(`:188-190`,`:191-194`,`:224-233`) 대상 축이 **api_key(비인간 identity)** 에 한정된다. **app_user(인간 5주체) 축은 grep 0** — Attestation Engine(User/Manager/Auditor/Executive/System)은 부재다.

## 3. 설계 계약 (무후퇴 확장 · 선행 의존)

1. **app_user 축 선행(BLOCKED)**: 5주체 recertification은 인간 identity 원장(app_user) 위에서만 성립한다. 현행 `AccessReview.php:177-242`는 api_key 축이므로, app_user 축의 role·permission 확정(Part 3-1~3-8 선행)이 **전제**다. 이 전제 미충족이 BLOCKED_PREREQUISITE의 사유다.
2. **Justification 계약 승격**: `AccessReview.php:188-190` justification·`:191-194` decision을 5주체 각각의 attestation 레코드 스키마로 일반화한다. 기존 검토 흐름을 훼손하지 않고 `subject_type`(user/manager/auditor/executive/system)·`recert_cycle` 필드를 부가.
3. **Maker-Checker 재사용**: Manager/Executive 서약의 승인 게이트는 `Mapping.php:238-291` 이중승인(maker≠checker, `:244-248`,`:267-269`,`:291`)을 **재사용** 한다 — 신규 승인엔진 신설 금지.
4. **불변 봉인**: 각 attestation은 `AccessReview.php:224-233` 증거 append를 거쳐 `SecurityAudit.php:56-68` verify로 봉인된다. Recert 미서약분은 `LAPSED`로 표기해 회수 큐로 이관(집행은 후속 승인 세션).
5. **Fail-closed**: 서약 대상 identity가 확정 불가(app_user 부재)면 attestation은 `NOT_ATTESTABLE` — 자동 정당화 금지.

## 4. KEEP_SEPARATE (혼입 금지)

- **Ops audit_log**(`Compliance.php:177-187`) — tenant_id 축 부재·비-tamper-evident. Attestation 증거로 사용 금지.
- **Attribution evidence**(`Db.php:809`) — 마케팅 기여 근거. 5주체 서약과 무관, 병합 금지.
- 마케팅 도메인의 승인/검토 명명 아티팩트는 §16 attestation과 명명 분리.

## 5. 판정

**PARTIAL**. Justification+evidence 기록(`AccessReview.php:177-242`)·불변 봉인(`SecurityAudit.php:56-68`)·maker-checker(`Mapping.php:238-291`)가 실재하나 **api_key 축 한정**이며 5주체 Attestation Engine은 grep 0. app_user 축(role/permission 확정) 선행이 전제다. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
