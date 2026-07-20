# DSAR — Approval Ops-Ready Integration Analytics (Part 3-25 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

`APPROVAL_INTEGRATION_ANALYTICS`는 플랫폼 최종 통합의 **운영 준비 정량 지표를 집계**하여 승인 게이트에 판단 근거를 제공하는 분석 레코드다. 필수 지표:

- **Integration/Deployment Success Rate** — 통합·배포 시도 대비 성공률.
- **Production Readiness Score** — 운영 개시 준비 종합 점수.
- **Operational Readiness Score** — 운영 지속가능 준비 점수(헬스·컴플라이언스 결합).
- **Mean Deployment Time** — 평균 배포 소요 시간.
- **Mean Recovery Time** — 평균 장애 복구 시간(MTTR).

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | 상태 |
|---|---|---|
| Integration 지표 집계 | 없음 (grep 0) | **ABSENT** — greenfield |
| 헬스 메트릭 baseline | `SystemMetrics.php:60-83`(시스템 헬스 지표) | baseline 참고 |
| 운영 헬스 상태 | `Health.php:56-70`(헬스 상태) | baseline 참고 |
| Compliance readiness | `Compliance.php:120-124`(컴플라이언스 준비 요약)·`:50-128`(집계) | baseline 참고 |

Integration/Deployment 성공률·MTTR·배포시간 집계 지표는 코드베이스에 부재(ABSENT). Readiness Score 산출의 baseline 입력만 존재: 시스템 헬스(`SystemMetrics.php:60-83`), 헬스 상태(`Health.php:56-70`), 컴플라이언스 준비도(`Compliance.php:120-124`, 집계 `:50-128`).

## 3. 설계 계약

1. **baseline 결합**: Operational Readiness Score는 `SystemMetrics.php:60-83` 헬스 지표와 `Compliance.php:120-124` 컴플라이언스 준비도를 입력으로 결합한다(신규 메트릭 엔진 신설 금지 — 기존 확장).
2. **집계 신설**: Success Rate·Mean Deployment/Recovery Time은 배포·복구 이벤트 이력 집계가 전제이며 현재 substrate 부재 → 순신설. 시계열 수집원 확보 전 BLOCKED_PREREQUISITE.
3. **Digest 입력**: 본 Analytics 요약은 §20 Digest의 입력이며, 검증되지 않은(신뢰도 미달) 지표는 Digest에 반영 금지(Trust First).
4. **무근거 결론 금지**: Readiness Score는 근거 지표를 함께 노출(Explainable), 임의 숫자 하드코딩 금지·실측 파생.

## 4. KEEP_SEPARATE

- **DataTrust** (`DataPlatform.php:281`) — 데이터 신뢰/품질 엔진은 별개 도메인. Integration Analytics는 이를 흡수하지 않으며, readiness 지표를 DataTrust 스코어로 대체하지 않는다(엔진 난립 금지·경계 유지).

## 5. 판정

**ABSENT** (integration 지표 집계 없음). health metrics(`SystemMetrics.php:60-83`·`Health.php:56-70`)와 Compliance readiness(`Compliance.php:120-124`)를 baseline으로 활용하나 Success Rate·Readiness Score·MTTR 집계는 순신설이다. DataTrust(`DataPlatform.php:281`)는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
