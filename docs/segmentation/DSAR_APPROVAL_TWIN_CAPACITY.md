# DSAR — Authorization Digital Twin: Capacity Forecast (Part 3-22 §10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §10 — Capacity Forecast)

Capacity Forecast는 authz 서브시스템의 **자원 소요 궤적**을 실측 baseline에서 projection한다. 예측 대상 7종:

- **Authorization TPS** — 초당 authz 결정 처리량 성장 궤적
- **Concurrent Sessions** — 동시 세션 수 및 피크 예측
- **Decision Cache** — 결정 캐시 적중률·메모리 점유 추이
- **Memory** — authz 프로세스 메모리 소요
- **CPU** — authz 결정 연산 CPU 부하
- **Storage** — 정책·역할·감사 이력 저장 증가율
- **Event Volume** — authz 이벤트(감사로그) 발생량

각 지표는 현행 실측을 baseline으로, 테넌트·트래픽 성장 가정 하에 projection·임계 도달 시점(saturation ETA)을 산출한다.

## 2. Substrate 매핑

| Capacity 요소 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| 시스템 메트릭 실측 baseline | SystemMetrics | `SystemMetrics.php:32`·`:22-30` | **PARTIAL(실측 존재)** |
| 메트릭 수집 진입 | SystemMetrics | `SystemMetrics.php:14-30`·`:36-45` | 인접(baseline 소스) |
| forecast projection 레이어 | 없음 (greenfield) | — | ABSENT |
| projection 결과 저장 | Db PDO | `Db.php:63-87` | 인접(신설 테이블 대상) |

★ SystemMetrics(`SystemMetrics.php:32`)는 현재값 실측만 — forecast/projection 없음. baseline을 미래 궤적으로 확장하는 계층이 순신설 대상.

## 3. 설계 계약

1. **실측 앵커(Measured Anchor)**: projection의 t0는 반드시 SystemMetrics 실측값(`SystemMetrics.php:22-30`). 임의 초기값 금지 — 실제값 자동산출(SSOT).
2. **Projection 확장**: baseline 시계열에 성장 가정(테넌트/트래픽)을 적용해 궤적·saturation ETA 산출. 가정은 명시·감사.
3. **무후퇴(No-regression)**: 기존 SystemMetrics 실측 경로 불변 — 확장만, 대체 금지. Golden Rule(Extend).
4. **비파괴**: capacity forecast는 읽기·계산만 — 운영 리소스·설정 mutate 0.

## 4. KEEP_SEPARATE

- authz Capacity Forecast는 **authz 서브시스템 리소스**만 대상. 마케팅 forecast(`DemandForecast.php:18`)·MMM(`Mmm.php:118-129`)·price 시뮬(`PriceOpt.php:105`)은 비즈니스 지표로 무관 — 흡수 금지.
- SystemMetrics 실측 경로는 트윈에 편입하되 원 수집 책임은 SystemMetrics에 유지(중복 엔진 금지).

## 5. 판정

**PARTIAL — SystemMetrics 실측 baseline 존재, forecast 순신설.** 현행은 시스템 메트릭 현재값 실측(`SystemMetrics.php:32`·`:22-30`)까지만 존재하고 projection/forecast 레이어는 grep 0. 실측을 앵커로 미래 궤적을 산출하는 계층을 신설하며 기존 수집 경로는 무후퇴 확장. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 트윈 상태·시계열 저장 계약 부재).
