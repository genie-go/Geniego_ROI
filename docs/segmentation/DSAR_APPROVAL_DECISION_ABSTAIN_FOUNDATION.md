# DSAR — Abstain Foundation (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§34 ABSTAIN_FOUNDATION (원문 전사) — Foundation(기반)만 정의:
- `Action Type`(Abstain 참조 액션)
- `Reason`(기권 사유)
- `Conflict-of-interest Reference`(이해상충 참조)
- `Snapshot Foundation`(기권 스냅샷 기반)
- ★ Sequential 단일 승인 Mandatory 충족으로 **처리 금지**(기권을 승인 정족수 충족으로 삼지 말 것).
- ★ 상세(정족수 계산·기권 허용 임계) = **Committee / Quorum** 도메인으로 위임.

## 2. 기존 구현 대조

- `ABSTAIN`(기권) = **부재** → ABSENT. `abstain`·`conflict of interest`·`quorum` 승인 데이터 → **no hits**.
- 기권을 담을 제3 상태 부재 — 승인은 approved/rejected 이진(`AdminGrowth::approvalDecide` `AdminGrowth.php:1289-1344` · `Alerting::decideAction` `Alerting.php:594` else 폴백). 기권이 들어오면 이진 폴백에 삼켜져 rejected로 무음 오분류.
- `Conflict-of-interest Reference` 판정 전제인 Actor/Authority 관계 축 부재(§3.4 정적 RBAC만). 이해상충을 식별할 배정/권한 관계가 없음.
- Committee/Quorum(정족수) 도메인 자체 부재 — 다승인·위원회 결정 구조가 없어 기권의 정족수 효과를 계산할 기반이 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(Snapshot Foundation·비종결 기권 Record) · §3.4 Authority(Conflict-of-interest 관계 판정) · Committee/Quorum 도메인(상세 정족수 — 본 §34 범위 밖, 별도 선행). Foundation조차 이 축들 없이는 성립 불가.
- cover: **0** (기권 액션·이해상충 참조·기권 스냅샷 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 — **Foundation 한정**. 본 문서/엔티티는 Action Type·Reason·CoI Reference·Snapshot 기반만 정의하고, 정족수 계산은 Committee/Quorum 도메인으로 명시 위임(중복 구현 방지).
- Mandatory Control(★핵심 실위험): 기권을 **Mandatory 승인 충족으로 처리 금지**. 단일 승인 스텝에서 기권이 승인으로 카운트되면 정족수를 가짜로 충족 — §32 Acknowledge의 "Authority Ceiling 미소비"와 동일 계열. Abstain은 Approval Outcome을 생성하지 않고 `ABSTAINED_REFERENCE`(§14 비종결 참조)로만 귀결.
- `Alerting::decideAction:594` else 이진 폴백은 기권을 삼키므로 **최우선 제거** 대상 — 미지원 액션 명시적 거부(무음 오분류가 승인 정족수를 오염).
- `Conflict-of-interest Reference` = 선행 Authority/Delegation(§3.4) + Assignment(§3.3) 신설 종속. 이해상충 당사자의 기권 강제 판정은 관계 축이 있어야 정직.
- Snapshot/Audit 필수 — SecurityAudit(`SecurityAudit::verify():56,64`) 재사용. Sequential Effect(§47) `STEP_ABSTAINED_REFERENCE` 이벤트로만 전이.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
