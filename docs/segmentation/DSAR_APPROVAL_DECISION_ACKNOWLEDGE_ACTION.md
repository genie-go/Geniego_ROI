# DSAR — Acknowledge Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§32 ACKNOWLEDGE_ACTION (원문 전사):
- 성격: **비승인성 정보 확인**(Non-approving Informational Acknowledgement).
- ★ `APPROVE`로 취급 **금지**.

효과(Effect):
- Acknowledgement Record 생성
- Step Completion = **Step Type Policy에 따름**(무조건 완료 아님)
- **Authority Ceiling 미소비**(권한 한도 차감 없음)
- **Approval Outcome 미생성**(승인 결과 없음)
- Audit / Snapshot

## 2. 기존 구현 대조

- `ACKNOWLEDGE` = **부재** → ABSENT. `acknowledge`·`acknowledgement record` 승인 도메인 데이터 → **no hits**.
- 위험한 인접 오탐: `Alerting::decideAction`(`Alerting.php:594`)의 else 폴백은 "approve 아니면 전부 rejected"로 이진 분기 — Acknowledge 같은 비종결·비승인 액션이 들어오면 **rejected로 무음 오분류**되거나, 반대로 승인 계열로 오인될 구조. 정보확인을 승인/거절 어느 쪽으로도 융합하면 안 되는데 현행은 제3의 상태가 없음.
- `Authority Ceiling 미소비` 판정 전제인 Authority/Delegation = 부재(§3.4 정적 RBAC만). 승인 한도 소비/미소비를 구분하는 축 자체가 없음.
- Acknowledgement Record(비승인 확인 레코드)를 남길 불변 Record 계층 부재(§3.1 Decision Core ABSENT).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(Acknowledgement Record·Snapshot) · §3.4 Authority(Ceiling 미소비 구분) · Sequential Step Type Policy(§3.2, Step Completion 조건부 판정). Acknowledge의 핵심(승인과 격리·한도 미소비)은 이 축들이 있어야 성립.
- cover: **0** (Acknowledge 액션·Acknowledgement Record·Authority 미소비 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 — 별도 액션 타입. **APPROVE와 코드 경로 완전 분리**(중복/융합 금지). Approval Outcome을 생성하지 않으므로 §14 Outcome 매핑에서 `ACKNOWLEDGED`(비종결 참조)로만 귀결.
- Mandatory Control(실위험 = 오분류): `Alerting::decideAction:594`의 else 무음 폴백은 **최우선 제거** — Acknowledge를 rejected/approved로 삼키면 감사·권한 이력 오염. 미지원 액션은 명시적 거부.
- Authority Ceiling **미소비** 강제 — Acknowledge가 승인 한도를 차감하면 Mandatory 승인 정족수를 가짜로 충족(§34 Abstain과 동일 계열 위험). 선행 Authority Foundation(§3.4) 신설 후 정직 구현.
- Step Completion = Step Type Policy 조건부 — 무조건 완료로 처리하면 Sequential 진행이 조작됨. Sequential Effect Mapping(§47)에서 `STEP_ACKNOWLEDGED` 이벤트로만 전이(Cursor 직접변경 금지).
- Audit/Snapshot 필수 — SecurityAudit(`SecurityAudit::verify():56,64`) 재사용.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
