# DSAR — Authorization AI Governance: 성능 요구사항 (Part 3-15 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §35는 6개 성능 SLO를 요구한다.

| 지표 | 목표 | SPEC 근거 |
|---|---|---|
| Recommendation | ≤ 500ms | §35 · §5~9 추천 생성 |
| Risk Prediction | ≤ 300ms | §35 · §12 |
| Feature Extraction | ≤ 100ms | §35 · §4 |
| Simulation | ≤ 5초 | §35 · §27 |
| Model Load | ≤ 1초 | §35 · §2 |
| Recommendation Accuracy | ≥ 95% | §35 · §25 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 지표 | 판정 | 근거(파일:라인) |
|---|---|---|
| Recommendation ≤500ms | **PARTIAL(결정론 baseline)** | AccessReview classify `AccessReview.php:87-122`·`:158`·심각도 정렬 `:162-163` = 결정론적 임계 proto(AI 아님)·지연 예산 미측정 |
| Risk Prediction ≤300ms | **PARTIAL(패턴·마케팅)** | 배포모델 조회 `Risk.php:81`·`:118`·예측 스탬핑 `:149-152`·`:175` — 마케팅 fraud·authz 예측 ABSENT |
| Feature Extraction ≤100ms | **ABSENT** | authz feature store 전무. `DataPlatform.php:231-346` quality 게이트=마케팅 소비 |
| Simulation ≤5초 | **ABSENT** | authz simulation(Role Reduction/Policy Merge §27) 전무 |
| Model Load ≤1초 | **PARTIAL(패턴)** | is_deployed=1 조회 `Risk.php:81`·ml_models 로드 `ModelMonitor.php:30-72` — 마케팅·authz model load ABSENT |
| Accuracy ≥95% | **PARTIAL(모니터 substrate)** | modelMetrics·drift `ModelMonitor.php:142-158`·`:244-291` = 마케팅 모델 정확도 추적·authz 추천 정확도 ABSENT |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Recommendation ≤500ms**: AccessReview classify(`AccessReview.php:87-122`) 결정론 baseline을 저지연 경로로 승격(ADR D-2)·AI 추천은 500ms 예산 내 응답. quota 게이트 `ClaudeAI.php:542`·`:564`는 LLM XAI 설명 경로에만 적용(추천 핵심경로와 분리).
- **Risk/Feature/Model Load**: risk_model_registry 조회 패턴(`Risk.php:81`·`:118`·`Db.php:448-456`)을 authz로 재배선하되 캐시(Runtime Optimization §10 Cache Utilization) 전제로 예산 충족.
- **Simulation ≤5초**: §27 시뮬레이션(Role Reduction/Policy Merge/Permission Removal/JIT Expansion/SoD 강화) 예상효과(Risk/Compliance/Latency/Cost) 산출을 5초 내.
- **Accuracy ≥95%**: ModelMonitor modelMetrics/drift(`ModelMonitor.php:142-158`·`:244-291`) 상태머신을 authz 모델로 재배선해 정확도·드리프트 추적(§25 Analytics·§26 Drift 정합). 정직 폴백(`:183-194`) 필수 — 미연결 시 mt_rand 날조 금지.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: `Risk.php:81-175`(fraud 예측 지연)·`ModelMonitor.php:142-158`·`:244-291`(마케팅 모델 정확도/드리프트)·`Decisioning.php:12-477`·`AnomalyDetection.php:1-45`는 마케팅 도메인(GT② §4). 성능 **패턴·상태머신만** 재배선·마케팅 모델 성능치 흡수 금지.
- **선행의존**: Feature Store(§4)·Model store(§33)·Recommendation/Prediction 엔진 신설이 선행. Part 1~3-14 인증 후 실 구현.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** 6개 성능 SLO는 현 단계 **미측정·미검증**. authz AI 추천/예측/피처/시뮬레이션/모델로드 경로가 순신규(엔진 부재)이므로 Recommendation≤500ms·Risk≤300ms·Feature≤100ms·Simulation≤5s·Model Load≤1s·Accuracy≥95%의 Performance Benchmark 통과는 **RP-track 실구현 세션 조건**이다. 재활용은 classify 결정론 baseline·ModelMonitor 상태머신·risk_model_registry 조회 패턴의 authz 재배선에 한하며 마케팅 모델 성능치 흡수 금지·정직 폴백 필수. 선행 Part 1~3-14 인증에 의존한다.
