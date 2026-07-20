# DSAR — Approval Compliance Score (다차원 컴플라이언스 점수) (Part 3-17 §10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §10)

`APPROVAL_COMPLIANCE_SCORE`는 인가(authorization) 통제 상태를 **단일 flat 수치가 아닌 다차원 점수축**으로 산출한다. 축은 다음 6종이며 각 0–100 정규화한다.

- **Overall** — 테넌트 전역 종합 컴플라이언스 점수.
- **Regulation** — 규제 프레임워크별(예: 개인정보/전자상거래/광고심의) 점수.
- **Control** — 인가 통제 항목별(RBAC 부여상한·승인게이트·감사로그·MFA 등) 점수.
- **Department** — 조직/부서 스코프별 점수.
- **Tenant** — 멀티테넌트 격리 관점 테넌트별 점수.
- **Region** — 데이터 레지던시/리전별 점수.

각 점수는 (충족 통제 수 · 가중치 · 증거 신선도)의 파생값이어야 하며(무후퇴·SSOT), 임의 하드코딩을 금지한다(DATA_INTELLIGENCE_CONSTITUTION).

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| 컴플라이언스 posture 산출 | `Compliance::` posture 집계 | `Compliance.php:53-130` | 실재(flat) |
| 종합 readiness 수치 | flat `readiness_pct` 계산 | `Compliance.php:115-120`·`:119-124` | PARTIAL(단일축) |
| 통제 버킷 카운트 | 3버킷(충족/부분/미충족) 카운트 | `Compliance.php:90-113`·`:102`·`:104` | 실재(비-점수) |
| 규제/부서/테넌트/리전 분해 | (없음) | — | ABSENT |
| 점수 근거 감사 기록 | 감사 append-only 해시체인 | `SecurityAudit.php:14-68` | 재사용 대상 |

## 3. 설계 계약

- **확장(Extend)**: 현행 `readiness_pct`(`Compliance.php:119-124`)를 폐기하지 않고 `Overall` 축으로 승격(dual-read). 나머지 5축은 동일 substrate(`:90-113` 버킷)를 스코프 GROUP BY로 재집계하여 파생한다 — 신규 SSOT 없이 기존 posture 쿼리 확장.
- **정규화**: 모든 축 0–100. 축별 가중치는 SPEC 부록의 통제-가중 테이블을 참조하며 코드 하드코딩 금지.
- **증거 신선도**: 각 축 점수에 `evidence_ts`를 병기(Explainable) — 산출 근거 없는 점수 금지.
- **감사**: 점수 스냅샷 생성·재계산 이벤트는 `SecurityAudit.php:56-68` 해시체인에 append(tamper-evident 정본).
- **테넌트 격리 절대**: Tenant/Region 축 집계는 `X-Tenant-Id` 스코프 내에서만 — cross-tenant 합산 금지.

## 4. KEEP_SEPARATE

- `Risk.php:12`·`:149-152`(ML 마케팅 churn/risk 예측)은 **컴플라이언스 점수 아님** — score 축에 흡수 금지.
- `ModelMonitor.php`(모델 드리프트)·`AnomalyDetection.php:2-6`(SPC 관리도)는 통계 품질 신호이며 authz 통제 점수 아님.
- `DataPlatform.php:288-291`·`:305`(데이터 Trust/Quality)는 데이터 신뢰도 축으로, compliance score와 별도 유지.

## 5. 판정

**PARTIAL**. 현행은 단일 flat `readiness_pct`(`Compliance.php:115-120`·`:119-124`)만 존재하고 per-scope(Regulation/Control/Department/Tenant/Region) 분해가 없다. 본 §10은 그 flat 값을 `Overall` 축으로 보존한 채 5축을 순신설·확장하는 설계이며, 실구현은 후속 승인세션(Golden Rule·verify·배포승인)에서 착수한다. 코드 변경 0 · NOT_CERTIFIED.
