# DSAR — Authorization Digital Twin Failure Model (Part 3-22 §15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §15 — Failure Prediction)

Authorization Digital Twin의 **장애 모델(Failure Model)**은 인가 제어평면(control plane)의 잠재 장애 모드를 트윈 위에서 사전 재현·예측하여, 실 시스템 장애 이전에 열화 신호를 포착하는 예측 계층이다. §14 행동 baseline을 입력으로 받아 **정상 행동 envelope 이탈 → 장애 전조**를 판정한다. 본 §15는 5개 장애 모드를 계약한다:

- **Cache Saturation** — 판정 캐시 포화·적중률 급락으로 인한 PDP 지연 증가.
- **Policy Conflict** — 정책 규칙 충돌·중복·모순으로 인한 Indeterminate 판정 급증.
- **PDP Failure** — Policy Decision Point 처리 지연·타임아웃·판정 오류율 상승.
- **PEP Failure** — Policy Enforcement Point 우회·fail-open 열림·강제 누락.
- **Federation / Control Plane Failure** — 외부 IdP 페더레이션 단절·제어평면 동기화 지연·전파 실패.

## 2. Substrate 매핑 (관측 소스 → Failure 예측 축)

| Failure 모드 | 실 관측 baseline(현행) | file:line | 상태 |
|---|---|---|---|
| Cache Saturation / PDP 지연 | 시스템 메트릭 baseline | `SystemMetrics.php:32` | 메트릭 실재·포화예측 ABSENT |
| PEP Failure(강제 누락) 근거 | 인가 판정 지점 | `UserAuth.php:1167` | 판정 실재·fail-open 예측 ABSENT |
| Policy Conflict 이벤트원 | 인가 감사 이벤트 로그 | `UserAuth.php:4165` | 이벤트 실재·충돌예측 ABSENT |
| 장애 이벤트 무결성 앵커 | append-only 해시체인 | `SecurityAudit.php:56-67`·`:71` | evidence 실재·전조모델 ABSENT |
| Federation/Control Plane 판정 | 감사 evidence 검증 | `SecurityAudit.php:118-153` | 검증 실재·페더레이션 예측 ABSENT |

**failure prediction 자체는 grep 0 — 완전 부재(ABSENT-greenfield)**. `SystemMetrics.php:32`가 유일한 실 baseline 소스이며, 장애 전조 판정·envelope 이탈 로직·페더레이션 단절 예측은 순신설이다.

## 3. 설계 계약 (Failure Model 신설 명세)

- **FM-1 baseline 소비**: 장애 모델은 `SystemMetrics.php:32` 메트릭과 §14 행동 baseline을 **읽기 전용**으로 소비. 메트릭 수집 경로 변경 금지 — 무후퇴.
- **FM-2 fail-closed 원칙**: 모든 장애 모드의 안전 기본값은 **fail-closed**. 특히 PEP Failure 예측은 fail-open 열림을 위험으로 분류하며, 예측 실패 시 자동 완화조치를 임의 집행하지 않고 경고만(승인정책 존중).
- **FM-3 전조 정의**: 각 장애 모드는 (관측지표, 정상 envelope, 이탈 임계, 신뢰도)로 정의. 임의 임계 하드코딩 금지 — baseline 분포에서 파생.
- **FM-4 evidence 앵커**: 장애 예측 스냅샷은 `SecurityAudit.php:56-67` 해시체인에 앵커링, 검증은 `SecurityAudit.php:118-153`을 정본으로.
- **FM-5 미검증 제외**: 표본 부족·신뢰도 미달 예측은 자동 알림/자동집행에서 제외(WARNING/BLOCKED).

## 4. KEEP_SEPARATE (혼입 금지 경계)

- **SPC anomaly**(`AnomalyDetection.php:3`·`:49`) — 범용 시계열 이상탐지로 authz 장애 전조 모델 아님. 통계 기법은 참조 가능하나 authz 장애 substrate로 흡수 금지.
- **ML drift**(`ModelMonitor.php:18-19`·`:42-43`) — ML 모델 품질 드리프트 감시로 인가 제어평면 장애와 무관.
- **DemandForecast**(`DemandForecast.php:18`) — 수요 예측(커머스 도메인)으로 authz failure prediction 아님.

이들을 failure substrate로 통합하면 도메인 오염 — Failure Model은 인가 제어평면 지표만 소비한다.

## 5. 판정

**ABSENT (greenfield · failure prediction grep 0)**. `SystemMetrics.php:32` baseline·감사 evidence(`SecurityAudit.php:56-67`·`:118-153`)·판정 지점(`UserAuth.php:1167`)은 실재하나 장애 전조 예측기는 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §14 행동 baseline·§15 substrate 계약 미확정). KEEP_SEPARATE 3종은 참조 경계로만 고정.
