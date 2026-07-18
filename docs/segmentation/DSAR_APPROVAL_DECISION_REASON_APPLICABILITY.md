# DSAR — Approval Decision Reason Applicability (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§38 REASON_APPLICABILITY Dimension (원문 전사):
`Action Type` · `Approval Domain` · `Workflow` · `Chain` · `Stage` · `Level` · `Step` · `Resource Type` · `Resource` · `Legal Entity` · `Organization` · `Country` · `Amount Band` · `Currency` · `Risk Level` · `Actor Type` · `Customer Segment` · `Partner` · `Program` · `Project`.

★ 잘못된 Action에 Reason Code를 붙이는 것 금지(예: APPROVE에 REJECT 사유). Applicability는 사유 코드가 특정 (액션·도메인·리소스·금액대…) 조합에서만 선택 가능하도록 게이트.

## 2. 기존 구현 대조

- 사유 코드의 적용 가능 차원(Action Type/Domain/Resource/Amount Band/Country…)을 검증하는 자산 → **no hits**.
- 실존 자유텍스트 사유(`Handlers/ReturnsPortal.php:36`)는 어떤 차원 게이트도 없음 — 임의 문자열이 모든 맥락에 무차별 허용.
- Action↔Reason 정합 검증(잘못된 액션에 부적합 사유 차단) → 부재. REJECT 사유가 이진 else 파생(`Alerting.php:593,594`)이라 사유-액션 매칭 검사 자체가 없음.
- `Amount Band`/`Currency`/`Legal Entity`/`Risk Level`별 사유 스코프 → 전부 부재(선행 Sequential/Amount 스코프 §3.2도 ABSENT).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §36 Reason Definition(ABSENT — Applicability는 `applicable action types/domains`의 확장 차원) · §3.2 Sequential(ABSENT — Stage/Level/Step 차원 선행 부재) · §11 Action Type(PARTIAL — Action Type 차원 대상) → **BLOCKED_PREREQUISITE**.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_reason_applicability` — 사유 코드 × 20개 Dimension 매트릭스. §12 Action Eligibility의 "Reason Requirement" 검증이 이 매트릭스를 조회해 (액션·도메인·금액대·리스크레벨) 조합에서 허용 사유만 노출.
- ★핵심 불변식: APPROVE 액션에 REJECT 카테고리 사유 결합 차단(§49 Action Compatibility·§50 Conflict REASON_MISMATCH). Applicability 위반 = §58 Critical Gap.
- `Amount Band`/`Currency`/`Legal Entity`/`Risk Level` 차원은 선행 Authority(§3.4 ABSENT)·Sequential(§3.2 ABSENT) 구축 후 결합 — 현재는 차원 소스가 없어 부분 구현조차 불가(BLOCKED_PREREQUISITE 근거).
- 초기 최소 구현: `Action Type` + `Approval Domain` 2차원만으로 시작(가장 위험한 Action↔Reason 오결합 우선 차단), 나머지 18차원은 선행 축 완성 후 점증.
- 실위험: Applicability 없이 사유를 자유입력하면 거절/반품 사유가 액션 맥락과 무관하게 기록 — 감사 화해(§55 REASON_APPLICABILITY 비교)에서 상시 MISMATCH.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
