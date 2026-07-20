# DSAR — Runtime SoD Enforcement: 경고 계약 (Part 3-10 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §34 Warning Contract는 차단(Block)은 아니나 위험 상승을 알리는 5종 비차단 경고다: Frequent Conflict·Temporary Exception Expiring·Override Usage Increased·Runtime Risk Elevated·Missing Review. §26 Analytics(Exception/Override Usage·High Risk Conflicts) 및 §27 Drift와 연결되며, 에러(§33 차단)와 달리 알림·검토 유도 목적이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §34 경고 | 판정 | 인접 substrate(재활용 앵커) | GT 인용 |
|---|---|---|---|
| Frequent Conflict | **ABSENT** | SoD 충돌 이벤트 전용 Analytics 스키마 grep 0 | GT②2(전용 Analytics ABSENT) |
| Temporary Exception Expiring | **ABSENT** | SoD 예외 자동종료 워크플로 부재 | GT②2·SPEC §19 |
| Override Usage Increased | ABSENT(앵커만) | break-glass 비상경로(사후감사 대상)만 존재 | `UserAuth.php:790-801`(GT①§F) |
| Runtime Risk Elevated | **ABSENT** | SoD Risk Engine·Runtime 충돌평가 부재 | GT②2.2·SPEC §17 |
| Missing Review | ABSENT(앵커만) | access_review_item 저장 substrate(justification 필수 추가전용) | `AccessReview.php:66-80`·`:219-224`·`:192`(GT①§F) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **5종 비차단 경고 순신규**: 전부 grep 0. §33 에러(차단)와 구분 — 경고는 응답 진행을 막지 않고 §26 Analytics·§13 Missing Review 검토큐로 라우팅.
- **재활용 앵커**: Missing Review는 access_review_item 추가전용 저장 패턴(`AccessReview.php:66-80`·`:219-224`)을; Override Usage Increased는 break-glass 사후감사(`UserAuth.php:790-801`)를; 근거 기록은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`·`:56-69`)을 앵커로 재활용(ADR D-5).
- **임계·집계**: Frequent Conflict·Runtime Risk Elevated는 §26 Analytics 지표(Total Conflicts·High Risk Conflicts·Top Violated Rules)·§38 False Positive ≤ 0.5% 기준 위에서 산출(신규).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **비즈 drift/anomaly ≠ SoD 경고**: `ModelMonitor.php`(model drift)·`AnomalyDetection.php`(마케팅)는 SoD Drift/Runtime Risk 경고 아님(GT② B-6). 흡수 금지.
- **정산 recon ≠ SoD Reconciliation 경고**: `PgSettlement.php` recon은 정산 페어링(`:221`)이지 SoD 충돌 재조정 아님(GT② B-3·B-6).
- **menu_audit_log ≠ SoD 검토 경고**: `AdminMenu.php:123-140`·`:200`·`:216` 메뉴 거버넌스 체인은 Missing Review(SoD) 대상 아님(GT② B-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

Warning Contract **5종 전부 ABSENT·순신규**. access_review·break-glass·SecurityAudit는 **재활용 앵커**(대체 아님). 비즈 drift/recon/menu_audit_log는 KEEP_SEPARATE. 코드 변경 0·NOT_CERTIFIED. 선행: §26 Analytics·§17 Risk Engine·§19 Exception 신설 후 결선(BLOCKED_PREREQUISITE).
