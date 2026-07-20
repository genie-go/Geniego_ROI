# DSAR — Compliance Reconciliation (Part 3-17 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §26 — Compliance Reconciliation)

**서로 다른 시점·출처의 컴플라이언스 상태 표현을 대사(對査)해 불일치를 검출**하는 엔진을 규정한다. 라이브 상태가 봉인된 기록/평가 결과와 어긋나면 drift로 플래그한다. 대사 대상 4종:

- **Live Compliance** — 현재 실시간 산출 posture.
- **Snapshot** — 특정 시점에 봉인한 상태 사본(불변).
- **Assessment** — 공식 평가 사이클이 확정한 판정 결과.
- **Audit Result** — 외부/내부 감사가 확인한 통제 실효성.

각 대사는 쌍(pair) 간 필드 델타를 산출하고 `{source_a, source_b, field, value_a, value_b, drift}` 불일치 목록을 반환한다. 불일치는 조사·정정 워크플로로 라우팅되며, 미해소 drift는 감사 리스크로 승격된다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| Live Compliance posture | `Compliance.php:53-130`(flat readiness 산출) | **유일 실재 대사원**(나머지 3종 부재) |
| Live 지표 집계 | `Compliance.php:143-190`(audit 통합) | Live 값 소스 |
| 대사 결과 감사 봉인 | `SecurityAudit.php:14-68`(append-only 해시체인) | 봉인 배선 대상 |
| Snapshot(불변 시점 사본) | — | **ABSENT(grep 0) → 비교 대상 미완** |
| Assessment(확정 판정) | — | **ABSENT → 비교 대상 미완** |
| Audit Result(감사 실효 확인) | — | **ABSENT → 비교 대상 미완** |
| pair 델타·drift 검출 엔진 | — | **ABSENT** |

## 3. 설계 계약

1. `ComplianceReconciliation::diff(source_a, source_b) → drift_list` — 4종 상태 표현 중 임의 쌍의 필드 델타 산출. Live 소스는 `Compliance.php:53-130`/`:143-190`에서 확정.
2. drift는 `{field, value_a, value_b}` 목록으로 반환, 임계 초과 drift는 조사 워크플로로 라우팅.
3. 대사 실행·검출된 drift는 `SecurityAudit.php:14-68` 해시체인에 봉인(대사 시점·쌍·결과).
4. **선행 의존**: Snapshot/Assessment/Audit Result 세 대사원이 부재하므로, 비교 대상이 갖춰지기 전에는 Live↔Live 자기대사만 가능(무의미). 실 대사는 Snapshot(§ 별도)·Assessment(§ 별도) 구축 후 배선.

## 4. KEEP_SEPARATE (흡수 금지)

- `ModelMonitor.php` — ML 예측↔실측 대사. 컴플라이언스 상태 대사 아님.
- `AnomalyDetection.php:2-6`,`:4-6` — SPC 관측치 대사. 규제 posture 대사 아님.
- `Risk.php:12`,`:149-152` — 마케팅 risk 대사. 컴플라이언스 drift와 도메인 분리.

## 5. 판정

**ABSENT** — Live/Snapshot/Assessment/Audit Result 4원 대사·pair 델타·drift 검출 grep 0. 현행은 `Compliance.php:53-130` flat posture(Live) 단일 표현만 실재하며 Snapshot·Assessment·Audit Result가 부재해 **비교 대상 자체가 미완**이다. 대사 엔진은 물론 대사원 3종이 선행 부재. → **순신설**(선행: Snapshot·Assessment·Audit Result 대사원 구축이 먼저). 코드 변경 0 · BLOCKED_PREREQUISITE.
