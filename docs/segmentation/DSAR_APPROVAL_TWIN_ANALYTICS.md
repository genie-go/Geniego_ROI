# DSAR — APPROVAL_TWIN_ANALYTICS (Part 3-22 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

`APPROVAL_TWIN_ANALYTICS`는 권한 승인 트윈의 예측·재생·동기화 성능을 **집계·계측하는 분석 지표 레코드**다. 트윈이 신뢰할 만한지(예측이 실측과 얼마나 부합하는지, 재생이 성공하는지, 실 상태와 얼마나 지연 없이 동기화되는지)를 정량화한다. 계약 지표:

- `prediction` / `forecast_accuracy` — 예측·예보 적중률(예측 대비 실제 승인 결과).
- `replay_success_rate` — 재생 성공률(과거 상태 재현 성공 비율).
- `sync_delay` — 트윈-실 권한 상태 간 동기화 지연.
- `scenario_count` — 활성/누적 what-if 시나리오 수.
- `model_confidence` — 예측 모델의 신뢰도 지표.

## 2. Substrate 매핑

| 계약 지표 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Forecast Accuracy | 없음(예측-실측 집계 부재) | — | ABSENT |
| Replay Success Rate | 없음(재생 엔진 부재) | — | ABSENT |
| Sync Delay | 없음(트윈 동기화 계층 부재) | — | ABSENT |
| Scenario Count | 없음(시나리오 레지스트리 부재) | — | ABSENT |
| Model Confidence | 없음(트윈 모델 부재) | — | ABSENT |

grep 결과 트윈 분석 지표 집계는 **전무(ABSENT)**하다. 시스템 계측(`SystemMetrics.php:32`)·DB 계층(`Db.php:458`)·인증 경로(`UserAuth.php:4165`)·메뉴 게이트(`AdminMenu.php:128`)는 트윈 예측 성능과 무관한 운영 지표로, twin analytics의 substrate가 아니다.

## 3. 설계 계약

1. **트윈 분석 지표는 전부 순신설**한다 — Forecast Accuracy·Replay Success Rate·Sync Delay·Scenario Count·Model Confidence 다섯 지표의 집계기를 신규 설계.
2. Forecast Accuracy·Replay Success Rate는 §19 Evidence(`validation_result`·replay 이력)를 입력으로 파생 — 선행 §19 substrate 완성이 전제(BLOCKED_PREREQUISITE).
3. 트윈 지표는 별도 신규 집계 엔진 남립 금지 원칙에 따라 트윈 도메인 전용 단일 집계 계층에 귀속하되, 재무·ML 지표 계층과 **혼입 금지**(§4 KEEP_SEPARATE).

## 4. KEEP_SEPARATE

twin analytics로 흡수·통합 금지 — 도메인·의미론 상이:
- **ML 모델 모니터링** — `ModelMonitor.php:42-43`(마케팅 ML 모델 지표). 트윈 예측 신뢰도와 별개 도메인.
- **재무 정산 지표** — `PgSettlement.php:294-295`(PG 정산 계측). 트윈 성능과 무관.

두 계층의 지표를 twin analytics로 재라벨링하는 것은 가짜녹색이므로 금지.

## 5. 판정

**ABSENT**(twin 지표 집계 없음). Forecast Accuracy·Replay Success Rate·Sync Delay·Scenario Count·Model Confidence 전부 순신설이며, ML(`ModelMonitor.php:42-43`)·재무(`PgSettlement.php:294-295`) 지표와 KEEP_SEPARATE다. 선행 트윈/예측/재생 substrate 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
