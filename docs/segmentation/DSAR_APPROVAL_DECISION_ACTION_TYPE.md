# DSAR — Approval Decision Action Type (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§11 ACTION_TYPE enum (원문 전사):
`APPROVE` / `REJECT` / `RETURN` / `REQUEST_CHANGES` / `CANCEL` / `WITHDRAW` / `RESUBMIT` / `ACKNOWLEDGE` / `ABSTAIN_REFERENCE` / `DEFER_REFERENCE` / `CUSTOM`.

§11 ACTION_TYPE 필수 필드:
- `action_type_id` · `action_code` · `name` · `category`
- `terminal effect reference` · `step completion effect reference` · `progression effect reference`
- `reason/comment required default` · `attachment allowed`
- `signature/MFA required reference`
- `allowed/prohibited source states`
- `status` · `evidence`

(Action별 상세 동작 규격 = 06-A-03-02-02 로 위임.)

## 2. 기존 구현 대조

- **승인 액션 자체는 실재하나, Action Type registry(정본 등록소)는 부재** → PARTIAL.
- 실존하는 액션(코드 기반 판정):
  - `APPROVE`: `Mapping::approve`(`Handlers/Mapping.php:238-293`) · `AdminGrowth::approvalDecide` `approved`(`Handlers/AdminGrowth.php:1321`) · `Catalog::approveQueue` status='queued'(`Handlers/Catalog.php:2397`).
  - `REJECT`: `AdminGrowth` `rejected`(`AdminGrowth.php:1321`) · `Alerting::decideAction` else 분기(`Handlers/Alerting.php:594`).
- 부재/미구현:
  - `RETURN`/`REQUEST_CHANGES`/`CANCEL`/`WITHDRAW`/`RESUBMIT`/`ACKNOWLEDGE`/`ABSTAIN_REFERENCE`/`DEFER_REFERENCE` → **no hits**.
  - `action_type_id`·`action_code`·`category`·`terminal/step completion/progression effect reference`·`allowed/prohibited source states` 를 데이터로 선언하는 등록소 → 부재. 액션은 status 문자열에 융합돼 있고 효과(terminal/progression)는 핸들러 로직에 하드코딩.
  - `signature/MFA required reference` → 결정 액션에 결합된 서명/MFA 요구 부재.
- 검증 패턴: `AdminGrowth::approvalDecide:1321`의 in_array enum 화이트리스트 = 유일한 정본 검증 근거. 반면 `Alerting::decideAction:594`의 else 폴백(approve 아니면 전부 rejected)은 미지원 액션을 무음 오분류.

## 3. 판정

- Verdict: **PARTIAL** (승인 액션 실재 · registry 없음)
- 선행 의존: Action Type registry는 Definition(§9)의 `allowed action types` 참조 대상이자 Registry(§7) 종속 — 둘 다 ABSENT. 단, APPROVE/REJECT 액션 실행 로직은 이미 실재.
- cover: **2/11 액션 실행 존재**(APPROVE·REJECT) · **registry/effect/source-state 규격 = 0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_type` 등록소 — 11종 enum + effect reference(terminal/step completion/progression)를 데이터로 선언. 액션을 status 문자열에서 분리(§66 Direct Status Update 중복 해소).
- 확장 기반: `AdminGrowth::approvalDecide:1321` 화이트리스트를 `allowed action types` 검증 정본으로 승격(Golden Rule = Extend). `Alerting::decideAction:594` else 무음 폴백은 **최우선 제거** — 미지원 액션은 명시적 거부(오분류가 승인 이력 오염).
- `allowed/prohibited source states`로 상태머신(§27) 결합: 예) `WITHDRAW`는 미Commit 상태에서만, `RESUBMIT`은 REJECTED 이후에만 허용.
- Action별 상세 효과(terminal/progression 매핑)는 **06-A-03-02-02**에서 규격화 — 본 문서는 등록소 존재/부재 판정에 한정.
- 실위험: `Alerting::executeAction`의 집행(`Alerting.php:631,653`)은 액션 확정과 비원자·무아웃박스로 분리돼 부분 집행 위험 — Action Type의 `terminal effect reference`를 Transaction Boundary(§48) 안으로 흡수해야 안전.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
