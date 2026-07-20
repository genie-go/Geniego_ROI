# DSAR — Authorization Digital Twin: AI Forecast Engine (Part 3-22 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §16 — AI Forecast Engine)

AI Forecast Engine은 authz 거버넌스 지표의 **미래 궤적을 AI로 추론**한다. Forecast 5종:

- **Trend Forecast** — 승인/거부/권한요청 볼륨 추세
- **Anomaly Forecast** — 이상 접근·정책 위반 급증 선제 탐지
- **Optimization Forecast** — 정책·역할 최적화 여지(중복·과권한) 전망
- **Resource Forecast** — authz 인프라 리소스 소요 궤적
- **Governance Forecast** — 컴플라이언스·인증 만료·리뷰 도래 예측

★ **모든 Forecast는 Confidence(신뢰도) + Explainability(설명가능성) 필수** — 신뢰구간·기여 요인·근거 표본 없이는 출력 금지. Volume 4 XAI(근거 없는 결론 금지) 준수. ★근거 없는 예측 절대 금지.

## 2. Substrate 매핑

| Forecast 요소 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| authz AI forecast 엔진 | 없음 (greenfield) | — | ABSENT (grep 0) |
| LLM 인프라 | ClaudeAI | `ClaudeAI.php:18` | 인접(LLM 호출 기반) |
| 설명/용어 텍스트 생성 | ClaudeAI | `ClaudeAI.php:174`·`:177` | 인접(용어설명·forecast 로직 아님) |
| confidence 텍스트 언급 | ClaudeAI | `ClaudeAI.php:299`·`:309` | 인접(용어 서술·정량 신뢰구간 아님) |
| 시계열 입력 이력 | SecurityAudit 해시체인 | `SecurityAudit.php:56-67` | 인접(read-only 소스) |
| forecast 결과 저장 | Db PDO | `Db.php:458-467` | 인접(신설 테이블 대상) |

★ authz AI forecast는 grep 0 — 순신설. ClaudeAI(`ClaudeAI.php:18`)는 LLM 인프라이나 `:174`·`:299`는 **용어설명·confidence 텍스트 서술**일 뿐 시계열 forecast 로직이 아니다.

## 3. 설계 계약

1. **Confidence 필수**: 모든 forecast 포인트는 정량 신뢰구간(p10/p50/p90 등)을 동반. ClaudeAI의 서술형 confidence 언급(`ClaudeAI.php:299`)은 정량 신뢰구간이 아니므로 그대로 승격 금지 — 별도 계량 계층 필요.
2. **Explainability 필수**: 각 예측의 기여 요인(feature attribution)·근거 이력 구간 제시. 블랙박스 금지.
3. **근거 정합(Trust First)**: 입력은 append-only 감사 시계열(`SecurityAudit.php:56-67`). 검증 미달·목데이터·환각 표본 배제. LLM 자유생성 예측은 근거 이력 결합 없이 출력 금지.
4. **비파괴**: forecast는 관측만 — authz 상태 mutate 0.

## 4. KEEP_SEPARATE

- **마케팅 수요예측** `DemandForecast.php:18`·`:99-132` — 상품 수요 시계열. 커머스 도메인.
- **MMM 미디어믹스 forecast** `Mmm.php:118-129` — 광고 지출 최적 프론티어. 마케팅 도메인.

두 엔진은 비즈니스 지표 대상이며 authz 거버넌스 시계열과 무관 — 흡수·재사용 금지. authz AI Forecast는 승인/거부/정책/컴플라이언스/리소스 지표만 대상으로 한다.

## 5. 판정

**ABSENT — greenfield 순신설.** authz AI forecast grep 0. LLM 인프라는 ClaudeAI(`ClaudeAI.php:18`)로 존재하나 `:174`·`:299`는 용어설명·confidence 서술이지 시계열 forecast가 아님(forecast 로직 없음). DemandForecast/Mmm은 마케팅·커머스로 KEEP_SEPARATE. Confidence+Explainability를 최우선 계약으로 명시하고 근거 없는 LLM 자유예측을 금지. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 시계열 정규화·정량 신뢰구간 계층·모델 거버넌스 부재).
