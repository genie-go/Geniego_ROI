# DSAR — Compliance Assessment (Part 3-17 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §9 — Compliance Assessment)

인가 컴플라이언스의 **종합 평가 스코어카드**를 규정한다. 평가 축:
- **Policy/Control Coverage** — §6 매핑 기반 통제별 정책 커버리지.
- **Evidence Completeness** — 각 통제의 감사 증적 존재·무결성.
- **Audit Readiness** — 외부 감사 대응 준비도(증적·소명·예외 문서화).
- **Exception Status** — 승인된 예외(waiver)의 유효기간·소유자·재검토 기한.

산출물은 authz-keyed(정책/역할/스코프 단위) assessment 리포트이며, gap을 우선순위화한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| readiness 스코어카드 | `Compliance.php:53-130`(posture)·`:115-120`(3버킷)·`:119-124`·`:122-129` | 존재(EXTEND) |
| control 리스트 | `Compliance.php:90-113`·`:105-108`·`:109-113` | 존재 |
| 증적 소스 | `SecurityAudit.php:71-153`(verify)·`Compliance.php:143-190` | 존재 |
| access review 연계 | `AccessReview.php:87-122`·`:125-174`·`:177-242` | 존재(연계 가능) |
| coverage/gap 산출 | — | **ABSENT(§6 매핑 부재로 불가)** |

## 3. 설계 계약

1. `ComplianceAssessment::run(scope) → Scorecard` — scope = policy/role/scope 키. 현행 posture(`Compliance.php:53-130`)를 authz-keyed로 확장.
2. Coverage = §6 `PolicyControlMap` 집계. Evidence = `SecurityAudit.php:71-153` verify PASS 비율. Readiness = 3버킷(`:115-120`) 재해석.
3. Exception Status = waiver 레지스트리(순신설) — 만료/재검토 오버런 gap.
4. gap 리스트를 우선순위(severity×coverage 결손)로 정렬, `AccessReview.php:177-242` 재인증 큐와 상호참조.
5. 스코어카드는 스냅샷 불변·버전드(감사 시점 재현 가능).

## 4. KEEP_SEPARATE

- `ModelMonitor.php`·`AnomalyDetection.php:4-6` — 모델·이상탐지 스코어. 컴플라이언스 assessment 스코어와 별개(흡수 금지).

## 5. 판정

**PARTIAL** — 현행 readiness 스코어카드(`Compliance.php:53-130`·3버킷 `:115-120`)와 control 리스트(`:90-113`)가 존재하나, 이는 **일반 posture**이지 authz-keyed·coverage/gap 기반 assessment가 아니다. Coverage 산출은 §6 매핑 부재로 현재 불가. Evidence/Audit Readiness는 `SecurityAudit`·`AccessReview` substrate로 확장 가능. → substrate **확장 + coverage/gap·Exception 순신설**. 코드 변경 0 · BLOCKED_PREREQUISITE(선행: §6 Policy-to-Control 매핑).
