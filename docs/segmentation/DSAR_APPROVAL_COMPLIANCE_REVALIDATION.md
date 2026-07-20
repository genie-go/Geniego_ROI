# DSAR — Compliance Revalidation (Part 3-17 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §25 — Compliance Revalidation)

컴플라이언스 평가 결과를 **유발 이벤트에 반응해 자동 재검증**하는 라이프사이클을 규정한다. 한 번 통과한 통제도 하부 근거가 바뀌면 무효화되어야 하며, 재검증은 "여전히 유효한가"를 재산출한다. 재검증 트리거:

- **Regulation 변경** — 규제 개정 시 매핑된 통제의 재적합성 재판정.
- **Policy 변경** — 정책 개정 시 요구 통제 집합 재도출.
- **Control 변경** — 통제 구현/구성 변경 시 커버리지 재산정.
- **Evidence 변경** — 증거 갱신/만료 시 통제 충족 여부 재확인.

각 트리거는 재검증 작업 `{trigger_type, changed_ref, prior_verdict, revalidated_at}`을 생성하고, 재검증 결과가 이전 verdict과 다르면 posture를 갱신하고 감사에 봉인한다. 재검증은 stale 통과(무효화 누락)를 방지하는 fail-closed 통제다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 변경 이벤트 저장(proto 참고) | `Mapping.php:183`·`:209`(매핑 변경 저장) | **변경 이벤트 proto 참고만**(재검증 엔진 아님) |
| baseline posture 재산출 | `Compliance.php:53-130`(readiness 산출) | 재산출 로직 소스 |
| 재검증 결과 감사 봉인 | `Compliance.php:143-190`(audit 통합)·`SecurityAudit.php:14-68`(해시체인) | 봉인 배선 대상 |
| Trigger→Revalidation 파이프라인 | — | **ABSENT(grep 0)** |
| prior verdict 비교·무효화 | — | **ABSENT** |
| Evidence 만료 감지 재검증 | — | **ABSENT** |

## 3. 설계 계약

1. `ComplianceRevalidation::onChange(trigger) → verdict_delta` — trigger는 `{type: regulation|policy|control|evidence, changed_ref}`. 변경 이벤트 shape는 `Mapping.php:183`·`:209` 매핑 변경 저장을 **proto 참고만** 하고 재검증 엔진은 순신설.
2. 재검증은 `Compliance.php:53-130` posture 재산출을 호출해 신규 verdict 도출, prior verdict과 비교해 델타 산정.
3. verdict 변동 시 posture 갱신 + `Compliance.php:143-190`/`SecurityAudit.php:14-68` 봉인(재검증 사유·이전/이후 verdict 기록).
4. Evidence 만료는 시간 트리거로 재검증 큐에 진입 — fail-closed(만료 증거 기반 통과는 즉시 무효).

## 4. KEEP_SEPARATE (흡수 금지)

- `ModelMonitor.php` — ML 모델 재학습/재검증. 컴플라이언스 통제 재검증 아님.
- `AnomalyDetection.php:2-6`,`:4-6` — SPC 이상 재평가. 규제 근거 재검증 아님.
- `Risk.php:12`,`:149-152` — 마케팅 risk 재산정. 컴플라이언스 verdict 재검증과 분리.

## 5. 판정

**ABSENT** — Regulation/Policy/Control/Evidence 트리거 기반 재검증 파이프라인·prior verdict 비교·무효화 grep 0. Mapping 변경 저장(`Mapping.php:183`·`:209`)은 변경 이벤트 **proto 참고 대상일 뿐** 재검증 엔진이 아니다. 현행은 `Compliance.php:53-130` 일회성 posture 산출뿐 — 이벤트 반응형 재검증 계층 없음. → **재검증 엔진 순신설**. 코드 변경 0 · BLOCKED_PREREQUISITE(선행: 변경 이벤트 버스·Evidence 만료 모델 정의).
