# DSAR — Approval Decision Reason Category (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§36 REASON_CATEGORY enum (원문 전사 · 17종):
`POLICY` / `FINANCIAL` / `BUDGET` / `LEGAL` / `COMPLIANCE` / `SECURITY` / `FRAUD` / `DATA_QUALITY` / `DOCUMENT` / `ELIGIBILITY` / `AUTHORITY` / `RESOURCE` / `BUSINESS` / `OPERATIONAL` / `REQUESTER` / `SYSTEM` / `CUSTOM`.

(Reason Definition(§36)의 `category` 필드 값 집합. 사유를 분류축으로 묶어 정책·심각도·에스컬레이션·필수여부를 카테고리 단위로 통제.)

## 2. 기존 구현 대조

- 사유 카테고리 enum(17종 중 어느 것이든)을 선언·검증하는 자산 → **no hits**.
- 실존 자유텍스트 사유(`Handlers/ReturnsPortal.php:36`)는 분류축 없음 — POLICY/COMPLIANCE/FRAUD 등 어떤 카테고리로도 태깅되지 않는 임의 문자열.
- `AdminGrowth::approvalDecide` 거절 경로는 사유 미입력(`Handlers/AdminGrowth.php:1319-1331`)이므로 카테고리화 대상 자체가 없음.
- 유일하게 관찰되는 "분류 유사물" = 액션 이진 파생(approve/rejected, `Alerting.php:594`)이며 이는 사유 카테고리가 아니라 결과값.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §36 Reason Definition(ABSENT — Category는 Definition의 필드 도메인) · §35 Reason Registry(ABSENT) → **BLOCKED_PREREQUISITE**.
- cover: **0** (17종 enum 중 실존 0).

## 4. 확장/구현 방향 (설계)

- 순신규: 17종 CATEGORY를 Reason Definition(§36)의 `category` 제약 enum으로 선언. 별도 테이블 불요 — Definition의 값 도메인 + 카테고리별 정책 오버레이 테이블(선택).
- 카테고리를 통제축으로 활용: `SECURITY`/`FRAUD`/`LEGAL`/`COMPLIANCE` 카테고리 사유는 §36 `comment required`/`attachment required`/`escalation required` 기본 강제, `REQUESTER`/`OPERATIONAL`은 완화 — 카테고리 단위 기본값 상속.
- §17 REJECT Reason Policy 22종을 17 카테고리로 정규 매핑(예: POLICY_VIOLATION→POLICY, BUDGET_UNAVAILABLE→BUDGET, LEGAL_RISK→LEGAL, FRAUD_RISK→FRAUD, MISSING_DOCUMENT→DOCUMENT).
- `SYSTEM` 카테고리는 §36 `system only`=true와 결합 — 사용자 선택 불가·시스템 자동 사유 전용.
- 실위험: 카테고리 없이 사유를 자유텍스트로 유지하면 심각도/에스컬레이션/규제 리포팅을 카테고리로 집계 불가 — §58 Critical Gap(Reason 누락)의 하위 증상.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
