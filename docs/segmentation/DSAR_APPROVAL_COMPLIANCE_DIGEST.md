# DSAR — Approval Compliance Digest (Part 3-17 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

APPROVAL_COMPLIANCE_DIGEST은 다수의 입력 산출물을 **요약·집약한 인간 판독용 단일 문서**다. 스냅샷이 시점 봉인이라면, Digest는 그 봉인들과 평가 결과를 사람이 한눈에 읽을 수 있게 압축한다. 입력은 4종이다.

- **Assessment**: 통제 평가 결과(합격/불합격/부분).
- **Snapshot(§19)**: 시점 봉인된 compliance 자세.
- **Evidence**: 증거 수집 상태·누락 목록.
- **Analytics(§22)**: 추세·커버리지 등 집계 지표.

Digest 출력은 요약 헤드라인(총 Compliance Score·핵심 리스크·Open Findings 수)·통제 도메인별 롤업·미해결 항목 Top-N·다음 조치 권고를 포함한다. Digest는 **읽기 전용 합성물**이며 원천을 변형하지 않는다.

## 2. Substrate 매핑

| SPEC 입력 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| Assessment(자세 평가) | flat readiness 산출 | `Compliance.php:53-130` | PARTIAL(집약 아님) |
| Snapshot | 시점 봉인 레코드 | — | ABSENT(§19 신설 선행) |
| Evidence | audit 이벤트 통합 | `Compliance.php:143-190` | PARTIAL(원천만) |
| Analytics | compliance 지표 집계 | — | ABSENT(§22 신설 선행) |
| 요약 조립/봉인 | 해시체인 append | `SecurityAudit.php:56-68` | 확장(발행 봉인) |
| Digest 문서 substrate | 다이제스트 산출물 | — | **ABSENT** |

현행은 요청 단위 flat readiness(`Compliance.php:53-130`)만 존재하고 4종 입력을 집약하는 다이제스트 계층이 없다 — digest 의미 grep 0.

## 3. 설계 계약

1. **입력 수집**: Digest는 Assessment(`Compliance.php:53-130` 재사용)·Snapshot(§19)·Evidence(`Compliance.php:143-190` 이벤트 요약)·Analytics(§22)를 **읽기 전용**으로 수집한다.
2. **합성**: 도메인별 롤업·Top-N Open Findings·헤드라인 Score를 계산한다. 신규 점수 계산은 §22 Analytics 산출물을 재사용하고 Digest 내부에서 재산출하지 않는다(SSOT).
3. **발행 봉인**: 발행된 Digest는 `SecurityAudit.php:56-68` append로 봉인해 "언제·무엇을 근거로 발행했는가"를 재현 가능하게 남긴다.
4. **비변형**: 입력 산출물(스냅샷·이벤트)은 절대 수정하지 않는다.

## 4. KEEP_SEPARATE

- 마케팅 성과 요약/리포트 로직과 분리 — Digest는 인가·승인 컴플라이언스 전용.
- `ModelMonitor.php`·`AnomalyDetection.php:4-6`의 통계/ML 요약과 무관.

## 5. 판정

**ABSENT** — 4종 입력(Assessment/Snapshot/Evidence/Analytics)을 집약하는 compliance digest 부재. 현행은 flat readiness(`Compliance.php:53-130`) 단건 산출만 존재. Digest는 §19·§22 산출물을 상위 입력으로 재사용하는 **순신설** 합성 계층이며 발행 봉인은 `SecurityAudit.php:56-68` 확장. NOT_CERTIFIED · BLOCKED_PREREQUISITE(§19·§22 선행).
