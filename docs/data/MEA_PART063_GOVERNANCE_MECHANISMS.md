# MEA Part 063 — GOVERNANCE MECHANISMS (§12~§19 거버넌스·보안·AI·완료기준 판정)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 근거 전량 [`GT①`](MEA_PART063_EXISTING_IMPLEMENTATION.md)·[`GT②`](MEA_PART063_DUPLICATE_AUDIT.md)·[`ADR`](../architecture/ADR_MEA_PART063_SUSTAINABILITY_ESG_CARBON.md) 실측 인용.

---

## 1. §12 ESG Governance 8종

| 항목 | 판정 | 근거·사유 |
|---|---|---|
| ESG Policy / Carbon Policy / Energy Policy / Sustainability Policy / Reporting Policy / Compliance Policy / Validation Policy | **전량 ABSENT** | `esg_policy`·`regulatory` grep **0**. ★**선행 개념(ESG 도메인 모델) 부재** |
| **Audit Trail** | **ABSENT (기반은 실재)** | ★엔티티는 부재하나 `SecurityAudit`(`SecurityAudit.php:44~52`·**`verify()`:55~68**)이 기반 제공. **ESG 전용 감사 체인 신설 금지**(ADR D-5·GT② DUP-2) |

★★**재오염 절대 금지**: `menu_audit_log.hash_chain`은 **tamper-evident가 아니다**([[reference_menu_audit_log_not_tamper_evident]]·289차 116편 정정). 본 절이 "Audit Trail"을 요구하므로 **재오염 위험 상존**.

---

## 2. §13 Data Security 6종

| 항목 | 판정 | 근거 |
|---|---|---|
| **Tenant Isolation** | **범용 실재 / ESG 스코프 ABSENT** | 테넌트 격리는 전역 확정 자산이나 **ESG 자산이 없어 적용 대상 부재**. ★구현 시 **절대 준수** — ESG 성과는 **경영 기밀**, 교차 노출은 062 D-7(재무 기밀)과 동급 |
| **RBAC** | **범용 실재 / ESG 스코프 ABSENT** | EPIC 06-A 확정 자산. ★신규 ESG API는 **인증 필수 접두**([[reference_api_prefix_routing]] — `/api` 접두 없으면 nginx SPA HTML 폴백으로 **가짜 성공 착시**) |
| ESG Data Encryption | **ABSENT** | ★`Crypto`(049 AES-256-GCM)가 기반이나 ESG 대상 없음 |
| Secure Reporting | **ABSENT** | ★`Reports` 재사용 시 기존 인가 경로 승계(D-4) |
| **Immutable Audit Log** | **ABSENT (기반 실재 · ★한계 명시 필수)** | `SecurityAudit`은 **단일 노드·append-only 코드 규율 의존**이며 **DB 관리자 UPDATE를 탐지할 뿐 막지 못한다**(062 D-1 승계). ★**규제 공시가 제3자 검증 수준 불변성을 요구하면 충족되지 않는다** — **"불변 원장 보유" 과대주장 금지** |
| Audit Logging | **ABSENT (기반 실재)** | 동상 |

---

## 3. §14 Runtime 규칙 7종 · §15 API 8종 · §16 Event 8종

**전량 ABSENT** — 부재증명 완료(GT① §2).

★§16 Event 8종(`ESGDataRegistered`·`CarbonCalculated`·`ESGKPIUpdated`·`SustainabilityTargetReached`·`ESGReportGenerated`·`EnergyThresholdExceeded`·`ESGPolicyValidated`·`ESGAudited`) 중 **`EnergyThresholdExceeded`는 ★061 계량 인프라 선행 종속**이므로, 다른 7종보다 **늦게 가능**하다(ADR D-3).

★§15 API 신설 시 **`/api` 접두 필수**([[reference_api_prefix_routing]]).

---

## 4. §17 AI Integration 8종 — ★가장 위험한 절

| AI 기능 | 판정 |
|---|---|
| Carbon Emission Prediction · Energy Consumption Forecast · ESG Risk Prediction · Sustainability Recommendation · Carbon Reduction Optimization · Climate Impact Analysis · ESG Compliance Recommendation · Explainable Sustainability Analytics | **전량 ABSENT** |

### ★★AI 착수 시 강제 제약 (헌법 V3·V4·V5 + 명세 §17)

1. **★데이터 없이 AI부터 만들지 말 것** — 8종 전부 **CARBON_FACTOR·활동량 선행**(ADR D-7 단계 9: AI는 **최후**). 데이터 없는 예측은 **환각**이다.
2. **V3 신뢰검증 READY 통과 데이터만 사용** — 품질 미달 시 **AI 추천 금지**(데이터 헌법 V3).
3. **Explainable 필수** — 모든 산출에 **근거·신뢰도 표시**. §17 마지막 항목이 명시적으로 "Explainable Sustainability Analytics"를 요구한다.
4. **★★AI는 승인 없이 ESG 보고서 자동 제출·ESG 정책 변경 금지**(명세 §17 · 헌법 V5 · `CHANGE_GATE`).
   > ★**규제 공시는 법적 책임을 수반한다.** 062 D-8(온체인은 롤백 불가 → 사전 승인이 유일한 방어선)과 **동형의 비가역성**을 가진다 — **제출된 허위 공시는 철회해도 법적·평판 노출이 남는다.** 따라서 **ESG 공시 제출은 최고 수위 게이트**(승인 + 감사 + 근거 보존)로 설계한다.
5. **마케팅 AI(`ClaudeAI`) / dev AI(Claude Code) KEEP_SEPARATE** — 상시 규율.
6. **★053 Gateway 부재 상속**: AI 호출이 단일 통과점을 거치지 않는 구조적 문제(053 D-2·056 D-4·057 D-1 동일 뿌리)는 **본 Part에도 그대로 적용**된다. ESG AI를 새 경로로 붙이면 **감사 구멍이 하나 더 늘어난다**.

### ★현행이 §17을 구조적으로 충족하는 부분 (정직 기술 · 후퇴 금지)

명세 §17 "AI는 승인 없이 ESG 보고서를 자동 제출하거나 ESG 정책을 임의로 변경하지 않는다"는 **현재 구조적으로 충족**된다:
ⓐ **ESG 정책 개념 자체가 없다**(변경 대상 부재) ⓑ **AI가 ESG 데이터를 쓰는 경로가 없다** ⓒ 자동 제출 대상 **외부 공시 채널 연동이 없다**.
★단 이는 **"잘 통제되어서"가 아니라 "대상이 없어서"**다 — **과대주장 금지**.

---

## 5. §18 성능 요구사항 6종

| 항목 | 판정 |
|---|---|
| ESG 데이터 수집 ≤5초 / Carbon Calculation ≤2초 / KPI 집계 ≤1초 / Dashboard 조회 ≤2초 / Report 생성 ≤10초 | ★**"미달"이 아니라 "측정 기반 부재"** — 측정 대상 자체가 없다 |
| Platform Availability ≥99.99% | ★관측 정본 `SystemMetrics`(`:15~19`·`:127~353`·`:372`) 재사용. **ESG 전용 관측 신설 금지**(GT② DUP-3) |

★**계측 신설 시 057 규율 승계**: `SystemMetrics.php:15~19`의 **목데이터 금지 원칙**을 ESG 계측에도 적용.

---

## 6. §19 Completion Criteria 10종 — 판정

**10종 전량 미충족(NOT_CERTIFIED).** 본 세션은 **설계 명세이며 코드 변경 0**이므로 어떤 항목도 충족하지 않는다. ★**"거의 됐다"류의 진척 주장 금지.**

---

## 7. ★★본 Part 최대 거버넌스 리스크 — "정직한 빈 화면"을 후퇴시키지 말 것

`ESGTab`은 값이 없을 때 **`t('performance.noData')`를 정직하게 표시**한다(`PerformanceHub.jsx:1050`·`:1064`). 이는 **288차 "가짜 녹색 systemic"(하드실패를 `ok=>true`로 위장)의 정반대**이며 **후퇴 금지 자산**이다.

### ★구현 착수 시 절대 금지 (재발 방지)
- **추정치·업계 평균·목표치·데모 값을 실측값처럼 표시 금지** — 데이터가 없으면 **계속 `noData`**
- **`0`을 "배출량 0"으로 표시 금지** — ★**059/058 정직 미산출 3연속 모범을 계승**한다:
  - `SystemMetrics` → **null 반환**(057)
  - `Mmm::frontier` → **`optimized:false` + 사유**(`Mmm.php:375`·`:378`)
  - `PriceOpt::simulate` → **null/422 + 사유**(`PriceOpt.php:946`)
  → **ESG 산출 불가 시 `null` + 사유(어떤 선행 데이터가 없는지)를 반환**해야 한다. **"0은 '정상'으로 오독된다."**
- **부분 산출을 전체로 표시 금지** — Scope 1만 산출되면 "총 배출량"으로 표기 불가

### ★FIND-063-1(Pro 게이트 빈 화면) 거버넌스
GT① §4·ADR D-6 참조. **권장=①(게이트 해제 + 문구 정정)**이며, 정정 시 **가이드(`perfGuideI18n.js:25`·`:42`·`:110`·`:127`)·온보딩(`Onboarding.jsx:31`)·챗봇 지식(`backend/data/chatbot_feature_map.md:77`·`tools/chatbot_feature_curated.md:77`) 3개소를 동시에** 고쳐야 한다([[feedback_no_regression_value_unification]] — 한 값 변경 = 관련 전부 동시 동기화).
★★**모든 처방은 사용자 승인 후 별도 세션.** 본 세션은 **등재만** 한다.
