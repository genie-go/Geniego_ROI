# DSAR — Authorization Digital Twin Behavior Model (Part 3-22 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14 — Approval Twin Behavior Model)

Authorization Digital Twin의 **행동 모델(Behavior Model)**은 실 운영 인가 시스템의 관측 가능한 행동을 통계적으로 재현하는 디지털 트윈 계층이다. 목적은 예측이 아니라 **행동 프로파일링** — 실 시스템이 "정상적으로 어떻게 행동하는가"의 기준선(baseline behavioral envelope)을 수립하여 §15 Failure·§12 Risk·§13 Compliance 예측 모델의 입력 substrate를 제공한다. 본 §14는 4개 행동 축을 계약한다:

- **User Behavior Pattern** — 주체(user/actor)별 인가 요청 빈도·시간대 분포·자원 접근 다양성·escalation 시도율.
- **Manager Approval Pattern** — 승인자별 승인/반려 비율·평균 처리지연·위임 체인 깊이·정족수 충족 패턴.
- **Runtime Decision Pattern** — PDP 판정(Permit/Deny/Indeterminate) 분포·정책 히트맵·캐시 적중률·판정 지연 분포.
- **Regional·Seasonal Trend** — 테넌트/리전별 요청량 계절성·업무시간 편중·이벤트 기간(프로모션 등) 인가 부하 변동.

## 2. Substrate 매핑 (관측 소스 → Twin 행동 축)

| Twin 행동 축 | 실 관측 소스(현행) | file:line | 상태 |
|---|---|---|---|
| User Behavior Pattern | 인가/인증 감사 이벤트 로그 | `UserAuth.php:4165` | 이벤트 소스 실재·프로파일러 ABSENT |
| Runtime Decision event 기록 | 감사 이벤트 append 경로 | `UserAuth.php:4217-4220` | 이벤트 write 실재·집계 ABSENT |
| Manager Approval Pattern | 인증/세션 판정 경로 | `UserAuth.php:1167` | 판정 지점 실재·승인패턴 모델 ABSENT |
| Runtime Decision 무결성 근거 | append-only 해시체인 | `SecurityAudit.php:27`·`:56-67` | evidence 실재·행동집계 ABSENT |
| Regional·Seasonal Trend | 시스템 메트릭 baseline | `SystemMetrics.php:32` | 메트릭 실재·계절성 모델 ABSENT |

이벤트 소스는 실재하나(위 표), **authz behavior model 자체는 grep 0 — 완전 부재(ABSENT-greenfield)**. 행동 프로파일러·baseline envelope·트렌드 집계 로직은 순신설이다.

## 3. 설계 계약 (Behavior Model 신설 명세)

- **BM-1 이벤트 수집**: 행동 모델은 `UserAuth.php:4165`의 auth_audit_log를 **읽기 전용 소비자**로만 사용한다. 원 이벤트 스키마·write 경로(`UserAuth.php:4217-4220`) 변경 금지 — 무후퇴.
- **BM-2 프로파일 산출**: 4개 축 각각에 대해 (표본기간, 집계단위, 분포통계, 신뢰구간)을 산출. 임의 하드코딩 기준선 금지 — 관측 이벤트에서 자동 파생(SSOT).
- **BM-3 무결성 앵커**: 행동 스냅샷은 `SecurityAudit.php:27` 해시체인에 앵커링하여 재현 시점의 evidence를 tamper-evident 하게 고정(정본 검증=`SecurityAudit.php:118-153`).
- **BM-4 테넌트 격리**: Regional·Seasonal 집계는 테넌트 경계를 절대 넘지 않는다. cross-tenant 행동 혼입은 fail-closed.
- **BM-5 미검증 제외**: 신뢰도 미달·표본 부족 프로파일은 하위 예측 모델(§12/§13/§15)에 READY로 전달 금지(WARNING/BLOCKED 표기).

## 4. KEEP_SEPARATE (혼입 금지 경계)

본 행동 모델은 아래 기존 ML/통계 엔진과 **동일 도메인이 아니다** — 재사용·통합 금지, 참조만:

- **ML risk 예측**(`Risk.php:31`·`Db.php:458` risk_prediction) — churn/fraud/Amazon 리스팅 리스크로 **마케팅·상품 도메인**이며 authz 행동과 무관.
- **SPC anomaly**(`AnomalyDetection.php:3`) — 시계열 이상탐지 통계로 authz 행동 baseline 아님.
- **ML drift**(`ModelMonitor.php:18-19`) — 모델 품질 드리프트 감시로 인가 행동 트윈 아님.

이들을 authz behavior substrate로 흡수하면 도메인 오염 — Twin은 인가 이벤트만 소비한다.

## 5. 판정

**ABSENT (greenfield · authz behavior model grep 0)**. 이벤트 소스(`UserAuth.php:4165`·`:4217-4220`)·무결성 앵커(`SecurityAudit.php:27`)·메트릭 baseline(`SystemMetrics.php:32`)은 실재하나 행동 프로파일러는 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §14 substrate 계약 미확정). KEEP_SEPARATE 3종은 참조 경계로만 고정.
