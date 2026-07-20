# DSAR — Approval Risk-to-Control Mapping (리스크-통제 매핑) (Part 3-17 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §13)

`APPROVAL_RISK_TO_CONTROL`은 인가 리스크를 통제로 사상(map)하여 **잔여 리스크(residual risk)를 산출**한다. 각 레코드 필드는 다음이다.

- **Risk Category** — 인가 리스크 분류(예: 과다권한·부여상한 초과·감사부재·MFA우회·cross-tenant).
- **Impact** — 실현 시 영향도.
- **Likelihood** — 발생 가능성.
- **Required Controls** — 리스크 완화에 요구되는 통제 집합.
- **Residual Risk** — (Impact × Likelihood) 대비 통제 적용 후 잔여치.

각 매핑은 §10 Control 점수·§11 Missing Control gap과 양방향 정합해야 한다(무후퇴·단일소스).

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| 통제 존재/집계 | posture 통제 집계 | `Compliance.php:143-190`·`:269-300` | 통제 substrate 존재 |
| RBAC 부여상한 통제 | 권한 상한 검증 | `TeamPermissions.php:695-701`·`:704-712` | Required Control 후보 |
| 부여상한 초과 판정 | 상한 초과 거부 | `TeamPermissions.php:737`·`:738-739` | 리스크 완화 통제 |
| 인증 우회/공개경로 리스크 | 공개경로 bypass 목록 | `index.php:600-619` | Risk Category 근거 |
| 감사 통제(tamper-evident) | append-only 해시체인 | `SecurityAudit.php:56-68` | 필수 통제 |
| Risk→Control 사상·잔여치 | (없음) | — | ABSENT |

## 3. 설계 계약

- **순신설(사상 계층)**: Risk Category ↔ Required Controls 매핑 테이블은 신규지만, Required Controls는 **기존 통제를 참조**한다 — RBAC 상한(`TeamPermissions.php:695-701`·`:737`), 공개경로 관리(`index.php:600-619`), 감사(`SecurityAudit.php:56-68`), posture 통제(`Compliance.php:143-190`).
- **정합**: 각 Required Control의 이행 여부는 §11 Missing Control gap 판정과 동일 substrate에서 읽어 잔여 리스크를 파생 — 두 문서가 다른 결론을 내면 무후퇴 위반.
- **테넌트 격리**: cross-tenant를 별도 Risk Category로 명시하고, 완화 통제는 `X-Tenant-Id` 스코프 강제로 사상.
- **Explainable**: 모든 Residual Risk에 산출 근거(적용 통제·미적용 통제)를 병기 — 근거 없는 잔여치 금지.
- **감사**: 리스크-통제 매핑 변경은 `SecurityAudit.php:14-68` 해시체인에 append.

## 4. KEEP_SEPARATE (★critical)

- `Risk.php:12`·`:149-152`는 **ML 마케팅 risk/churn 예측**이다 — compliance risk-to-control이 아니므로 본 §13에 흡수 금지(명명 충돌 주의).
- `AnomalyDetection.php:2-6`의 "control"은 **SPC 통계적 관리도(control chart)**이며 authz control이 아니다 — 통제 사상 대상에서 제외.
- `ModelMonitor.php`(모델 모니터링)·`DataPlatform.php:288-291`(Trust/Quality)도 별개 도메인으로 유지.

## 5. 판정

**ABSENT**. Risk→Control 사상 및 residual risk 산출 로직은 grep 0이다. 본 §13은 순신설 사상 계층이되 Required Controls는 기존 통제(`TeamPermissions.php`·`index.php`·`SecurityAudit.php`·`Compliance.php`)를 재사용하며, §10/§11과 단일 substrate 정합을 유지한다. `Risk.php`/`AnomalyDetection.php`는 명명만 유사할 뿐 별도 도메인으로 KEEP_SEPARATE. 실구현은 후속 승인세션. 코드 변경 0 · NOT_CERTIFIED.
