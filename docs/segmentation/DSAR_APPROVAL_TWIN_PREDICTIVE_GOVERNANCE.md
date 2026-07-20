# DSAR — Authorization Digital Twin: Predictive Governance Engine (Part 3-22 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §8 — Predictive Governance)

Predictive Governance Engine은 authz 거버넌스의 **미래 상태(Digital Twin 투영)**를 예측하여 후퇴·붕괴를 선제 차단한다. 예측 5축:

- **Governance Stability** — 정책·역할·권한 그래프의 구조적 안정성 궤적 예측
- **Policy Effectiveness** — 정책의 실효(과권한/사문화/우회) 저하 추세 예측
- **Runtime Health** — authz 런타임(평가 지연·거부율·오류율) 건전성 예측
- **Trust Evolution** — Trust Score·인증 상태의 시간적 진화 예측
- **Operational Risk** — 운영 리스크(만료·미인증·권한 표류) 누적 예측

★ 모든 예측은 **Confidence + Explainability**를 동반한다(§16 AI Forecast 계약 상속). 근거·신뢰구간 없는 예측 출력 금지.

## 2. Substrate 매핑

| 예측 요소 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| predictive governance 엔진 | 없음 (greenfield) | — | ABSENT (grep 0) |
| readiness baseline | Compliance readiness | `Compliance.php:133-151` | 인접(정적 스냅샷·예측 아님) |
| runtime 지표 baseline | SystemMetrics | `SystemMetrics.php:32` | 인접(현재값·시계열 예측 아님) |
| 시계열 입력 이력 | SecurityAudit 해시체인 | `SecurityAudit.php:56-67` | 인접(read-only 소스) |
| 예측 결과 저장 | Db PDO | `Db.php:458` | 인접(신설 테이블 대상) |

★ predictive governance는 grep 0 — 순신설. `Compliance.php:133-151`은 **현재 readiness 스냅샷**, `SystemMetrics.php:32`는 **현재 지표**로, 둘 다 미래 궤적을 산출하지 않는다(예측 로직 부재).

## 3. 설계 계약

1. **투영 전용(Digital Twin)**: 예측은 관측·시뮬 산출물 — 실 authz 상태 mutate 0(비파괴).
2. **Baseline 승계**: 초기값은 Compliance readiness(`Compliance.php:133-151`)·SystemMetrics(`SystemMetrics.php:32`)의 현재 스냅샷을 시계열 시드로 사용. 새 지표 임의 날조 금지(SSOT 파생).
3. **Confidence 필수**: 5축 각 예측은 신뢰구간·표본 근거 동반. 점추정 단독 금지.
4. **Explainability 필수**: 기여 요인·근거 이력 구간 제시. 블랙박스 결론 금지(Volume 4 XAI).
5. **근거 정합(Trust First)**: 입력은 append-only 감사 시계열(`SecurityAudit.php:56-67`). 검증 미달·목데이터 배제.

## 4. KEEP_SEPARATE

- **마케팅 수요예측** `DemandForecast.php:18`·`:99-132` — 상품 수요 시계열. 커머스 도메인.
- **MMM 미디어믹스 forecast** `Mmm.php:118-129` — 광고 지출 최적 프론티어. 마케팅 도메인.
- **ML 리스크 스코어링** `Risk.php:31`·`:34-35`·`:91` — 신용/거래 리스크 ML. 리스크 도메인.
- **마케팅 액션 추천** `AutoRecommend.php:363-481` — 캠페인 추천. 마케팅 도메인.

네 엔진은 비즈니스·리스크 지표 대상이며 authz 거버넌스 미래 상태와 무관 — 흡수·재사용 금지. Predictive Governance는 정책/역할/권한/Trust/운영 리스크 지표만 예측한다.

## 5. 판정

**ABSENT — greenfield 순신설.** predictive governance grep 0. baseline은 Compliance readiness(`Compliance.php:133-151`)·SystemMetrics(`SystemMetrics.php:32`)의 정적 스냅샷으로 존재하나 시계열 예측 로직은 부재. DemandForecast/Mmm/Risk/AutoRecommend는 비즈니스·리스크 도메인으로 KEEP_SEPARATE. Confidence+Explainability를 최우선 계약으로 승계. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 시계열 정규화·모델 거버넌스·Digital Twin substrate 부재).
