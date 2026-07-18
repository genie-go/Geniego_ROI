# DSAR — Approval Decision Reason Definition (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§36 REASON_DEFINITION 필수 필드:
- `definition_id` · `registry id` · `reason code` · `name` · `description` · `category`
- `applicable action types` · `applicable domains`
- `severity`
- `comment required` · `attachment required`
- `escalation required reference`
- `customer selectable` · `system only`
- `parent reason id` (계층)
- `current version` · `valid_from` / `valid_to`
- `status` · `evidence`

CATEGORY(§36 enum 17종): `POLICY` / `FINANCIAL` / `BUDGET` / `LEGAL` / `COMPLIANCE` / `SECURITY` / `FRAUD` / `DATA_QUALITY` / `DOCUMENT` / `ELIGIBILITY` / `AUTHORITY` / `RESOURCE` / `BUSINESS` / `OPERATIONAL` / `REQUESTER` / `SYSTEM` / `CUSTOM`.

## 2. 기존 구현 대조

- 사유를 `reason code`/`category`/`severity`/`comment·attachment required`로 정의하는 자산 → **no hits**.
- 실존은 정규화되지 않은 자유텍스트 사유뿐:
  - `Handlers/ReturnsPortal.php:36` `reason TEXT NOT NULL DEFAULT ''` — 코드·카테고리·심각도 없이 임의 문자열.
  - `AdminGrowth::approvalDecide` 거절 경로에 사유 입력 자체가 없음(`Handlers/AdminGrowth.php:1319-1331`) — 거절이 사유 없이 확정.
  - `Mapping` 승인/거절의 note = 자유텍스트(구조화 사유 아님).
- `category`(17종 enum)·`applicable action types`·`applicable domains`·`severity`·`comment/attachment required`·`escalation`·`customer selectable`·`system only`·`parent reason id`(계층) → 전부 부재.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §35 Reason Registry(ABSENT — Definition은 `registry id` 종속) · §3.1 Decision Core(ABSENT — Reason Snapshot 결합 대상 부재) → **BLOCKED_PREREQUISITE**.
- cover: **0** (자유텍스트만 존재 = `ReturnsPortal.php:36`).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_reason_definition` — 17종 CATEGORY enum + `applicable action types`/`applicable domains`/`severity`/`comment·attachment required`를 데이터로 선언. `parent reason id`로 계층(예: COMPLIANCE → COMPLIANCE_FAILURE).
- §17 REJECT Reason Policy 22종 사유(INSUFFICIENT_EVIDENCE … CUSTOM)를 이 Definition의 시드 코드로 정규화 — REJECT 사유를 `Alerting.php:593` else 파생(이진)에서 분리해 명시 코드로.
- 무후퇴: `ReturnsPortal.php:36` 자유텍스트 값은 삭제 금지 — `reason_code` FK 신설 + 레거시 값 매핑 병존.
- `comment required`/`attachment required` 플래그는 §16 APPROVE·§17 REJECT·§19 RETURN 검증의 "Required Reason/Comment/Attachment" 게이트 데이터 소스 — 하드코딩 대신 Definition 조회.
- 실위험: 사유 Definition 없이 REJECT를 이진 파생으로 확정하면(`AdminGrowth.php:1319-1331` 사유 미입력) §58 Critical Gap(Reason 누락) — 거절 근거 재구성 불가·규제 대응 불가.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
