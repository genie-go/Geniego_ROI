# DSAR — Approval Recovery Drift Detection Coordinator (Part 3-20 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_RECOVERY_DRIFT`는 인가(authorization) 상태가 **선언된 정본(intended state)** 에서 **관측된 실제(observed state)** 로 시간에 따라 이탈하는 현상을, 복구(self-healing) 이전 단계에서 **탐지·분류·좌표화**하는 Drift Detection Coordinator를 정의한다. 대상 8종 authz drift:

- **Policy Drift** — 배포된 정책 문서 ↔ 런타임에서 실제 평가되는 정책 규칙의 이탈.
- **Role Drift** — Role 정의 정본 ↔ 실제 부여/구성된 Role 그래프의 이탈.
- **Permission Drift** — Permission 카탈로그 ↔ effective permission 집합의 이탈.
- **Assignment Drift** — 승인된 assignment 원장 ↔ 현재 유효 assignment의 이탈.
- **Runtime Drift** — 정적 선언 ↔ 요청 시점 런타임 결정 경로의 이탈.
- **Configuration Drift** — 구성 정본(config baseline) ↔ 배포 인스턴스 구성의 이탈.
- **Compliance Drift** — 규정 요구 통제 ↔ 실제 시행 통제의 이탈.
- **Federation Drift** — 외부 IdP/federation 매핑 정본 ↔ 흡수된 클레임의 이탈.

Coordinator는 각 drift에 대해 (a) baseline snapshot 참조, (b) observed 수집, (c) diff 산출, (d) severity 분류, (e) §23 Simulation·§24 Revalidation으로 위임하는 순수 조율 계층이다.

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| 불변 감사/이벤트 기록 | `backend/src/SecurityAudit.php:14-68`(append-only 해시체인 유일 정본) | 재사용 대상 |
| 접근 검토 원장(assignment 관측 소스) | `backend/src/Handlers/AccessReview.php:141-171` | 부분 substrate |
| 시스템 헬스/메트릭 관측 | `backend/src/Handlers/SystemMetrics.php:53-54`·`:60` · `backend/src/Handlers/Health.php:27` | 관측 substrate |
| 규정 통제 상태 | `backend/src/Handlers/Compliance.php:53`·`:120` | 부분 substrate |
| baseline snapshot 저장/조회 | 부재 — authz drift용 baseline 저장소 없음 | ABSENT |
| authz drift diff/severity 엔진 | 부재(grep 0) | ABSENT |

## 3. 설계 계약

- **DriftDetectionCoordinator**는 authz 도메인 전용이며 baseline은 §25 Reconciliation snapshot에 의존한다(선행 부재 → BLOCKED_PREREQUISITE).
- 모든 drift 판정 이벤트는 `SecurityAudit.php:14-68` 해시체인에 append-only로만 기록하고 물리 삭제/수정 금지.
- Coordinator는 **탐지·분류만** 수행하고 자동 복구를 직접 집행하지 않는다(§23/§24로 위임 — 관심사 분리).
- severity는 SPEC canonical 4단계로 고정하며 임의 숫자 하드코딩 금지(SSOT 파생).

## 4. KEEP_SEPARATE

- **ML drift**: `backend/src/Handlers/ModelMonitor.php:42-43`·`:221`·`:244` — 모델 성능/데이터 분포 drift이며 **authz drift 아님**. 흡수/통합 금지.
- **마케팅 drift**: `backend/src/Handlers/AutoCampaign.php:917` · `backend/src/Handlers/JourneyBuilder.php:1185` — 캠페인/여정 drift이며 authz 관심사 아님. 별개 유지.

## 5. 판정

**ABSENT** — authz Recovery Drift Detection Coordinator는 grep 0으로 순신설 대상이다. 기존 drift 코드(`ModelMonitor.php:221`·`AutoCampaign.php:917`)는 ML·마케팅 도메인이며 authz drift가 아니므로 재사용 불가·KEEP_SEPARATE. baseline snapshot(§25) 선행 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
