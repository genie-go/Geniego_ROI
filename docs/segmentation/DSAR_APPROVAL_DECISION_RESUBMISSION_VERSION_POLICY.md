# DSAR — Resubmission Version Policy (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§31 RESUBMISSION_VERSION_POLICY (원문 전사):

**새 Case Version 요구(Material Change)** — 다음 변경 시 새 Case Version 강제:
- Amount · Currency
- Legal Entity · Organization
- Resource · Contract Terms
- Customer · Partner · Product · Program
- Budget · Cost Center
- Approval Requirement
- Risk Classification
- Supporting Evidence
- Material Business Justification

**비중요(Non-material)** = Minor Revision — 새 Version 없이 처리하되 **Audit + Hash** 로 추적.

## 2. 기존 구현 대조

- Resubmission Version Policy = **부재** → ABSENT. `case version`·`material change`·`minor revision` 데이터/분기 → **no hits**.
- 전제인 **Case Version 축 자체가 부재**(§3.1 Decision Core ABSENT). 버전을 올릴 대상(Case)도, 버전 계보도 없음 → 정책이 규율할 축이 존재하지 않음.
- 변경 중요도(Material vs Minor)를 판정하는 로직 부재. 승인 확정은 `AdminGrowth::approvalDecide`(`AdminGrowth.php:1289-1344`) approved/rejected 이진뿐이며 변경 분류가 없음.
- 유일한 유사 자산 = `Mapping::approve/apply`의 Maker-Checker(`Mapping.php:238-331`, apply `:287,327`) — 그러나 이는 매핑 승인 워크플로우이지 재제출 버전 정책이 아님(대상·의미 상이).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(Case Version 축) · §30 Resubmission Package(변경 델타 소스) · Change Request Item(§24, 변경 대상 식별). 버전 승격 판정은 델타 소스가 있어야 성립하나 셋 다 부재.
- cover: **0** (Material/Minor 분류·Case Version 승격·Minor Revision Audit/Hash 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 정책 엔진 — §30 Resubmission Package의 이전/신규 델타를 입력받아 Material 목록(Amount·Currency·Legal Entity·Risk Classification 등) 대조 후 **새 Case Version 여부 결정**.
- Mandatory Control: Material 변경이 Minor로 우회되면 안 됨(실위험 = 금액·법인·리스크 등급 변경을 Minor Revision으로 숨기면 기존 승인 문맥에 몰래 편입). Material 판정은 화이트리스트 기반 fail-closed(목록 외 = 불확실 시 Material 취급).
- Minor Revision 경로도 **Audit + Hash 필수** — 무버전 정정이라도 감사 소실 금지. SecurityAudit(`SecurityAudit::verify():56,64` 재사용)로 무결성 체인.
- 선행 차단: Case Version 축(Decision Core)·Resubmission Package(§30)가 먼저 존재해야 정책이 규율 대상을 가짐(BLOCKED_PREREQUISITE 성격).
- §57 Simulation의 `CASE_VERSION_CHANGE`/`AMOUNT`/`CURRENCY`/`LEGAL_ENTITY_CHANGE` 타입으로 사전 시뮬레이션 — 실 Record 미생성 상태에서 버전 승격 여부 미리 검증.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
