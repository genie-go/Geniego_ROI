# DSAR — Resubmit Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§29 RESUBMIT_ACTION — 검증(Validation) 필수(원문 전사):
- Resubmit 가능 Origin(재제출 허용 기원)
- Origin Record 존재
- 미해결 Item 확인(Unresolved Item)
- Mandatory Change Item 응답 완료
- Required Attachment 충족
- Resource Version 갱신
- **Case Version 증가**
- Amount / Currency 재확인
- Legal Entity / Organization 재확인
- Workflow / Chain 재해석
- Authority / Delegation / Assignment 재해석
- History 보존(이전 라운드 미삭제)
- 새 Round 생성
- Duplicate 없음

## 2. 기존 구현 대조

- 승인 도메인 `RESUBMIT` = **부재** → ABSENT. §GROUND_TRUTH "RESUBMIT=승인도메인 ABSENT" 확정. `resubmit`·`resubmission`·`case version` 데이터 선언 → **no hits**.
- 전제 자산 3중 부재:
  - **Origin Record**: 불변 Decision Record 부재(§3.1 Decision Core ABSENT — `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383` 전부 in-place UPDATE). 기원 결정을 지목·보존할 불변 레코드가 없음.
  - **Case Version 증가**: Case 엔티티·Version 계보 부재. 재제출 라운드를 구분할 버전 축 없음.
  - **미해결 Item / Change Item 응답**: Change Request(§23)·Change Request Item(§24) 부재 → 무엇을 해결해야 재제출 가능한지 정의 자체가 없음.
- 유사 재활용(반려 후 재시도)조차 부재 — `AdminGrowth::approvalDecide`(`AdminGrowth.php:1289-1344`)는 rejected 후 재제출 라운드 개념이 없고, `Alerting::decideAction`(`Alerting.php:572-655`)는 decide→execute 단발.

## 3. 판정

- Verdict: **ABSENT · BLOCKED_PREREQUISITE**
- 선행 의존: §3.1 Decision Core(Origin Record·불변 History) + Case Version(Decision Core 종속) + Change Request/Item(§23·§24 ABSENT). Resubmit은 "이전 라운드 History 보존 + 새 Round + Case Version 증가"를 요구하므로 Case Version·Decision Core 없이는 원천적으로 성립 불가.
- cover: **0** (재제출 액션·Case Version·Origin Record·Unresolved Item 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 — 단, **선행 차단**: Decision Core(불변 Record/Slot/Commit)와 Case Version 축이 먼저 신설돼야 Resubmit의 "Origin Record·History 보존·새 Round"가 정직하게 구현됨. 선행 없이 착수 시 in-place UPDATE 위에 얹혀 이력이 소실되는 가짜 구현이 됨.
- 재제출 = §30 Resubmission Package 생성의 트리거. Change Request Item(§24) 응답을 패키지로 묶어 검증 후 새 Round 오픈.
- Mandatory Control: **History 보존 + Duplicate 없음**. Idempotency(§51 Key에 resubmission package hash 포함)로 동일 재제출 중복 라운드 방지.
- Authority/Delegation/Assignment 재해석 = 선행 §3.4(정적 RBAC만)·§3.3(Assignment 부재, `orderhub_claims`는 CS 클레임 오탐 `OrderHub.php:93,530`) 신설 종속.
- 실위험: Amount/Currency/Legal Entity 변경 재제출은 §31 Version Policy상 **새 Case Version 강제** 대상 — 이를 빠뜨리면 금액·법인 변경이 기존 승인 문맥에 몰래 편입되는 통제 우회.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
