# DSAR — Compliance Exception Manager (Part 3-17 §15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §15 — Compliance Exception Manager)

컴플라이언스 규칙을 **한시적·명시적으로 예외 승인**하는 라이프사이클을 규정한다. 예외는 규칙 위반을 은폐하는 것이 아니라, 위험을 문서화·승인·만료 관리하는 통제이다. 구성요소:

- **Exception Request** — 대상 규칙/인가 컨텍스트, 요청자, 예외 사유.
- **Business Justification** — 예외를 정당화하는 업무적 근거(감사 증적 필수).
- **Risk Acceptance** — 잔여위험을 명시적으로 수용하는 승인 권한자 서명(maker≠checker).
- **Expiration** — 예외의 강제 만료 시각. 만료 후 규칙 원상복귀(fail-closed).
- **Revalidation** — 만료 전 재검토·연장 승인 사이클.

각 예외는 `{id, rule_ref, justification, risk_level, approver, granted_at, expires_at, status}` 계약을 가지며 인가 평가 파이프라인이 예외 유효성(미만료·승인상태)을 조회한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 예외 승인(maker-checker·정족수) | `Mapping.php:238-291`(승인 워크플로)·`:267-269`(self-approval 차단) | 재사용 대상(예외 전용 아님) |
| 승인요청 저장 | `Db.php:592-600`·`:623-636`(action_request/mapping_change_request) | 재사용 대상 |
| Justification 캡처 | `AccessReview.php:217-233`(리뷰 결정 근거)·`:224-233` | 재사용 패턴 |
| Exception 라이프사이클(요청/만료/재검증) | — | **ABSENT(grep 0)** |
| Risk Acceptance·Expiration 데이터모델 | — | **ABSENT** |

## 3. 설계 계약

1. `ComplianceExceptionManager::request(rule_ref, justification, risk_level) → exception_id`. 저장은 `Db.php:592-600` action_request 계열 확장으로 배선.
2. 승인은 `Mapping.php:238-291` maker-checker 정족수를 재사용하되 self-approval 차단(`:267-269`)을 강제 상속.
3. `expires_at` 도달 시 규칙 원상복귀(fail-closed) — 만료 예외는 인가 평가에서 무효.
4. Revalidation은 만료 전 재검토 → 신규 승인 사이클. Justification은 `AccessReview.php:217-233` 근거 캡처 패턴 준용, 증적은 감사(`Compliance.php:143-190`) 연결.

## 4. KEEP_SEPARATE (흡수 금지)

- `Dsar.php`·`GdprConsent.php` — **데이터주체 프라이버시** 예외/동의 철회. 인가 컴플라이언스 예외와 도메인 분리.
- `DataPlatform.php:297-302` — 데이터 품질 rule 예외. 인가 예외 아님.

## 5. 판정

**ABSENT** — Exception Request/Business Justification/Risk Acceptance/Expiration/Revalidation 라이프사이클 grep 0. 예외 데이터모델·만료 강제·재검증 사이클 전무. 다만 승인 substrate(Mapping maker-checker `Mapping.php:238-291`·self-approval 차단 `:267-269`)와 justification 캡처(`AccessReview.php:217-233`)는 재사용 가능. → **순신설**(라이프사이클 상태기계). 코드 변경 0 · BLOCKED_PREREQUISITE(선행: 규칙 평가 hook·예외 유효성 조회 지점 정의).
