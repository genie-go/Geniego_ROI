# CANONICAL DSAR — Authorization Risk-Based Decision (Risk Model·Threshold·Escalation·Auto-Approval·Reconciliation·Lint/Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)** · 정본 스펙 수령 시 재정합.
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_APPROVAL_WORKFLOW.md`](CANONICAL_DSAR_AUTHORIZATION_APPROVAL_WORKFLOW.md)(Request/Workflow/Level/Quorum/State/Decision) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_RISK_BASED_DECISION.md`](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_RISK_BASED_DECISION.md).
> **범위**: 위험 기반 승인 판정만 — Maker-Checker/SoD=5-4 · Break Glass=5-5 · Runtime PDP=5-6 · Audit=5-7 · Certification=5-8.

---

## 0. 실측 요약

| 스펙 요구 | 현행 실측 | 분류 |
|---|---|---|
| **Risk-based 승인** | ❌ **부재** — `risk_score` 히트는 **CustomerAI 이탈 위험(churn)**·승인과 무관=**오탐** | **NOT_APPLICABLE → 신설** |
| **Threshold 기반 승인**(금액) | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 신설** |
| **금액 상한 Enforcement(인접)** | ✅ **REAL** — **`enforceBudgetCaps` 97%**(284차 예산 하드상한·캠페인별 기간내 배정) · **MTD budget cap**(BillingMethod monthly_budget) · **`charging` 선점**(이중청구 방지) | **재사용(Threshold 패턴 정본)** |
| **위험 판정 인접** | ✅ **REAL** — **`AnomalyDetection`**(이상 탐지·1-3/1-6 Claim Fraud 인접) · Alerting **condition_tree**(metric/op/threshold·Alerting.php:71/387-393) | **재사용(Risk Signal 원천)** |
| **자동 집행 안전장치(인접)** | ✅ **REAL(원칙)** — 헌법 Vol5: **Safety Rule**(신뢰도/권한/동기화/통계신뢰 부족 시 **자동집행 금지→경고**) · Vol3: **Trust READY 미달 시 AI/자동화 제외** · **ROAS 실패→광고중지 금지** | **재사용(정책 근거)** |
| **Step-up 인증(인접)** | ✅ **REAL** — MFA(`mfa_policy`·UserAuth) | **재사용(Escalation 수단)** |
| **Risk Escalation / 자동 승인 정책** | ❌ **부재** | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Risk-based 승인 판정은 부재**(risk_score 오탐 주의). 그러나 **Threshold Enforcement 의 실 정본은 존재**(enforceBudgetCaps 97% · MTD cap · charging 선점) → **금액 임계 패턴 재사용**. Risk Signal 원천 = AnomalyDetection · Alerting condition_tree. 정책 근거 = **헌법 Vol5 Safety Rule · Vol3 Trust READY**.

### ★인접 관찰 (코드변경 0)
- **[관찰] `risk_score` 는 승인 위험이 아니다** — CustomerAI 의 **이탈 예측(churn_prob)** 이다(선행설계 R1 §DSL 시드에서 `churn_prob` 확인·CRM.php:1447-1448). **동명이의로 Risk-based Approval 의 REAL 근거로 삼으면 오탐**(FP 규약 정합).
- **[관찰] 자동 승인의 최대 위험은 이 저장소의 재발 클래스와 직결** — 287차 `Alerting::executeAction` **가짜집행**(승인 "실행완료" 표시하나 외부 API 미호출) · 288차 ChannelSync **하드실패 `ok=>true` 위장**. → **자동 승인 도입 시 "승인=집행"으로 착각하는 순간 동일 클래스 재발** → §4 에서 **자동 승인 ≠ 자동 집행** 분리 강제.

---

## 1. Canonical Entity (12) — 자율 설계

RISK_MODEL · RISK_FACTOR · RISK_SCORE_SNAPSHOT · RISK_LEVEL_POLICY · APPROVAL_THRESHOLD_POLICY · THRESHOLD_RULE · AUTO_APPROVAL_POLICY · RISK_ESCALATION_RULE · STEP_UP_REQUIREMENT · RISK_DECISION · RISK_RECONCILIATION · RISK_AUDIT_EVENT.

## 2. Risk Model (§1) · Factor (§2) · Level (§3)

- **Risk Model(§1)**: risk_model_id · **model_version · factors · weighting · score_range · level_mapping · effective_from/to · immutable_hash · approved_by** · evidence. **★Policy Version 규율 계승**(5-1 §22: **현재 모델로 과거 Decision 근거 덮어쓰기 금지**).
- **Factor(§2, 14)**: **requested_amount**(금액) · **resource_financial_sensitivity** · **resource_PII_sensitivity** · action_mutating · **environment**(Production 가중) · **legal_entity 교차** · cross_tenant_attempt · subject_privilege_level · **subject_authentication_assurance / MFA_state** · session_age · device_trust · network_zone · **anomaly_signal**(AnomalyDetection) · historical_violation.
- **Level Policy(§3, 6)**: NONE · LOW · MEDIUM · HIGH · **CRITICAL** · **UNKNOWN**. **★UNKNOWN = CRITICAL 취급(fail-closed)** — 위험 미산출 상태로 자동 승인 금지(5-2 §CHANGE_RISK_LEVEL 규율 계승).
- **Score Snapshot(§4)**: Decision 시점 **factor 값·모델 버전·산출 점수 고정**(현재 값으로 과거 판정 재현 금지·1-4 §38 계승) · **freshness/confidence 기록**(5-1 §20 Stale 금지).

## 3. ★Threshold Policy (§5) — enforceBudgetCaps 정본 재사용

- **Threshold Policy(§5)**: threshold_policy_id · **threshold_type · scope · currency · value(Decimal) · comparison · action_on_exceed · approver_level_required** · valid_from/to · evidence. **Type(8)**: **PER_TRANSACTION_AMOUNT** · **PER_PERIOD_CUMULATIVE** · PER_SUBJECT · PER_RESOURCE · **EXPORT_ROW_COUNT** · **FIELD_SENSITIVITY** · RISK_SCORE · CUSTOM.
- **★현행 정본 재사용**: **`enforceBudgetCaps` 97%**(284차 예산 하드상한·캠페인별 기간내 배정) · **MTD budget cap**(BillingMethod `monthly_budget`) · **`charging` 선점**(이중청구 방지) — **금액 임계 + 초과 시 차단**의 실 패턴.
- **★규칙**: **초과 시 동작 명시 필수**(BLOCK / REQUIRE_APPROVAL / REQUIRE_STEP_UP / MANUAL_REVIEW) · **암묵적 허용 금지** · 금액은 **Decimal 또는 정수 minor unit**(선행설계 R3 §43 계승·Float 금지) · **★in-flight 포함 집계**(선행설계 R3 §53: "빠지면 이중청구의 원인이었다" — **임계 판정도 진행중 금액 포함 필수**).
- **★5-1 §34 정합**: "Funding 변경 금액이 개인 Threshold 이하면 ALLOW · **초과 시 REQUIRE_APPROVAL**".

## 4. ★Auto-Approval Policy (§6) — 자동 승인 ≠ 자동 집행

- **Policy(§6)**: auto_approval_policy_id · **허용 조건**(risk_level ≤ X AND amount < Y AND environment ≠ Production AND anomaly_signal 없음 AND subject_clearance 충족) · **금지 조건** · **max_auto_approved_amount** · **일일/기간 한도** · **kill switch** · approval_reference(정책 자체의 승인) · evidence.
- **★§4 자동 승인 ≠ 자동 집행(본 파트 최우선 계약)**: 자동 승인은 **"승인 단계를 생략"**할 뿐 **집행 결과를 보장하지 않는다**. **집행 상태는 반드시 실 결과로 기록**(287차 정본: `executed`=실집행성공 / `failed`=실패 / `approved_manual`=자동집행 불가·Alerting.php:610-611). **★"자동 승인됨"을 "집행 완료"로 표기 = 287/288차 fake-looks-real 클래스 재발**.
- **★금지 조건(강행)**: **Production 고위험** · **금융 데이터/Payout/Credential** · **Cross-Tenant/Legal Entity 교차** · **anomaly_signal 존재** · **Trust READY 미달**(헌법 Vol3: 신뢰도 미달 데이터로 자동화 금지) · **Stale attribute**(5-1 §20) · **risk UNKNOWN** · **정족수 정책이 distinct_approver/exclude_requester 를 요구하는 건**(5-4). → **전부 REQUIRE_APPROVAL 또는 MANUAL_REVIEW**.
- **★헌법 Vol5 Safety Rule 정합**: 신뢰도/권한/동기화/통계신뢰 부족 시 **자동집행 금지 → 경고**. **외부 채널 변경은 명시적 권한 내에서만**.

## 5. Risk Escalation (§7) · Step-up (§8)

- **Escalation Rule(§7)**: risk_level 상승 시 **required_approvals 증가**(예: LOW=1 · MEDIUM=2 · HIGH=3 + Finance Role · CRITICAL=Manual Review + Security Role) · **required_roles 추가** · **Level 추가**(5-3 §3) · **escalation_after**(SLA 초과 시 상위 이관). **★현행 `required_approvals` 는 고정값(DEFAULT 2)** → **위험 연동 부재** → 신설.
- **Step-up(§8)**: risk 또는 임계 초과 시 **REQUIRE_STEP_UP_AUTH**(5-1 §Effect) — **MFA 재인증**(현행 `mfa_policy` REAL 재사용) · **Production Credential 사용은 항상 Step-up**(5-1 §34).

## 6. Reconciliation (§9) · Lint/Guard (§10) · Error (§11)

- **Reconciliation(§9, 8)**: Risk Model Version ↔ Decision 기록 · Threshold ↔ 실 집행 금액 · **자동 승인 건 ↔ 실 집행 결과**(287차 클래스 감시) · required_approvals ↔ 실 승인자 수 · **승인자 ↔ 요청자 동일 여부**(5-4) · **동일 승인자 중복 여부**(§7 관찰) · 만료 승인 ↔ 집행 여부 · anomaly_signal ↔ 자동 승인 여부.
- **Lint(§10, 9)**: Threshold 미설정 고위험 Action · **초과 시 동작 미지정** · **Float 금액 임계** · risk UNKNOWN 자동 승인 · **자동 승인에 kill switch 없음** · Risk Model Version 없는 Decision · **in-flight 제외 임계 집계**(R3 §4.4 클래스) · Production 자동 승인 · Evidence 없는 자동 승인.
- **Guard(§10b, 8)**: Threshold Exceeded · Risk Too High · Risk Unknown · Anomaly Present · Trust Not Ready · Stale Attribute · Auto-Approval Kill Switch 활성 · Production Auto-Approval Blocked.
- **Error(§11, 8)**: `APPROVAL_THRESHOLD_EXCEEDED` · `APPROVAL_RISK_TOO_HIGH` · `APPROVAL_RISK_UNKNOWN_BLOCKED` · `APPROVAL_AUTO_BLOCKED_PRODUCTION` · `APPROVAL_AUTO_BLOCKED_ANOMALY` · `APPROVAL_MODEL_VERSION_INVALID` · `APPROVAL_STALE_RISK_DATA` · `APPROVAL_MANUAL_REVIEW_REQUIRED`.

## 7. Risk Matrix — 현행

| 축 | 현행 | 근거 |
|---|---|---|
| **금액 임계 Enforcement** | ✅ **REAL** — enforceBudgetCaps **97%**(284차) · MTD budget cap · **charging 선점**(이중청구 방지) | 284차 · BillingMethod |
| **이상 탐지 Signal** | ✅ REAL — AnomalyDetection | 1-3/1-6 인접 |
| **조건 평가 엔진** | ✅ REAL — Alerting condition_tree(metric/op/threshold) | Alerting.php:71/387-393 |
| **Step-up 수단** | ✅ REAL — MFA(mfa_policy) | UserAuth |
| **자동화 안전 원칙** | ✅ REAL(정책) — **헌법 Vol5 Safety Rule** · **Vol3 Trust READY** | 헌법 |
| **Risk Model / Score(승인용)** | ❌ **부재**(risk_score=이탈 예측 **오탐**) | CustomerAI |
| **Approval Threshold Policy** | ❌ 부재 | — |
| **Auto-Approval Policy** | ❌ 부재 | — |
| **Risk↔required_approvals 연동** | ❌ 부재(**고정 DEFAULT 2**) | Db.php:634 |
