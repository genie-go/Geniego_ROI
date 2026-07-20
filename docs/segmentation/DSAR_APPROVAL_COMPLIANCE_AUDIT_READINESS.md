# DSAR — Authorization Compliance Audit Readiness (Part 3-17 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §17 Audit Readiness)

**Audit Readiness**는 규제 감사가 개시되는 시점에 "제출 가능한 증거·통제 상태가 즉시 준비되어 있는가"를 지표화하는 posture다. SPEC §17은 5축을 규정한다: **Evidence Availability**(요구 증거가 존재·검증 가능한가)·**Policy Coverage**(적용 대상 대비 정책이 몇 %를 덮는가)·**Control Status**(각 통제가 활성/위반/미구현 중 어디인가)·**Review Status**(주기 검토가 최신인가)·**Exception Status**(예외·면제가 승인·만료 관리되는가). Readiness는 READY/WARNING/BLOCKED 3단계로 롤업되며, 하나라도 미달이면 조직은 감사 대응 불가로 표기된다.

## 2. Substrate 매핑

| SPEC 축 (§17) | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| Evidence Availability(검증 가능성) | SecurityAudit verify | `SecurityAudit.php:56-68` | PRESENT |
| Compliance posture 산출 | Compliance posture | `Compliance.php:53-130` | PARTIAL |
| Audit Export(제출물 생성) | Compliance auditExport | `Compliance.php:269-300` | PARTIAL |
| Review Status(검토 최신성) | AccessReview 검토 흐름 | `AccessReview.php:177-242` | PARTIAL(api_key 축) |
| Policy Coverage | — (grep 0) | — | ABSENT(순신설) |
| Exception Status | — (grep 0) | — | ABSENT(순신설) |

Evidence Availability는 `SecurityAudit.php:56-68` verify로 검증 가능성이 보장된다. Posture/Export는 `Compliance.php:53-130`·`:269-300`가 부분 실재하나, **Policy Coverage·Exception Status 2축은 grep 0으로 순신설** 영역이다.

## 3. 설계 계약 (무후퇴 확장 + 순신설)

1. **5축 롤업 posture**: `Compliance.php:53-130` posture 산출을 5축(Evidence/Policy/Control/Review/Exception) 스코어보드로 일반화한다. 기존 posture 필드를 훼손하지 않고 축별 상태를 부가 편입, `Compliance.php:269-300` auditExport에 축별 요약을 첨부.
2. **Evidence Availability 배선**: readiness 산출 시 `SecurityAudit.php:56-68` verify를 호출해 evidence가 실제로 검증 통과함을 확인한다 — "존재"가 아니라 "verified"만 READY로 카운트(Trust First).
3. **Review Status 참조**: `AccessReview.php:177-242` 검토 최신성을 Review 축으로 참조한다. 단 현행은 api_key 축이므로 app_user 축은 §16 attestation 선행에 의존(BLOCKED).
4. **Policy Coverage / Exception Status(순신설)**: 적용 대상(control 집합) 대비 정책 매핑 %와 예외 승인·만료 상태를 신규 산출한다. 예외는 만료일·승인 주체를 필수로 하고 만료분은 `EXPIRED`로 자동 강등 — 무기한 면제 금지.
5. **롤업 규칙(Fail-closed)**: 어느 한 축이 BLOCKED면 조직 readiness는 BLOCKED로 롤업한다. Coverage/Exception 미산출(ABSENT) 상태는 WARNING 이하로 표기해 "가짜 READY" 금지.

## 4. KEEP_SEPARATE (혼입 금지)

- **Ops audit_log**(`Compliance.php:177-187`) — tenant_id 축 부재·비-tamper-evident. Readiness의 Evidence 축 소스로 사용 금지.
- **Attribution evidence**(`Db.php:809`) — 마케팅 기여 근거. Control/Evidence 축과 무관, 병합 금지.
- 데이터 플랫폼/마케팅 posture 명명 아티팩트는 §17 authz audit readiness와 명명 분리.

## 5. 판정

**PARTIAL**. Evidence verify(`SecurityAudit.php:56-68`)·posture(`Compliance.php:53-130`)·auditExport(`Compliance.php:269-300`)·검토 흐름(`AccessReview.php:177-242`)가 부분 실재하나, **Policy Coverage·Exception Status 2축은 grep 0(순신설)** 이며 Review 축의 app_user 확장은 §16 선행에 의존. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
