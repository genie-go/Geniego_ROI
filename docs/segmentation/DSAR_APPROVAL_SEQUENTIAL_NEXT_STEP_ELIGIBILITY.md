# DSAR — Next Step Eligibility (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§29 NEXT_STEP_ELIGIBILITY — 다음 Step 자격 판정은 아래 전 조건을 모두 만족해야 성립:
1. 현재 Step 이 Terminal 상태(Completion 또는 Valid Skip)
2. 현재 Step Completion 또는 유효 Skip 성립
3. 이전 Blocking Step/Level/Stage 완료
4. 현재 Level 이 Not Completed(아직 열려 있음)
5. 다음 Step Definition 존재
6. 다음 Step 의 Runtime(Step Instance) 존재 또는 생성 가능
7. Assignment Policy 존재
8. Authority Resolution 가능
9. Delegation Resolution 가능
10. Tenant 일치
11. Legal Entity 일치
12. Instance 가 Pause/Suspend/Block 상태 아님
13. Transition Lock 획득 가능
14. Cursor Version 일치

## 2. 기존 구현 대조

- **다단 Stage/Level/Step 부재**(§GROUND_TRUTH): `current_step/stage/level/step_order/sequence_no` backend 전체 0 hits. "다음 Step"이라는 개념 자체가 실존하지 않는다 → 자격 판정 대상이 없음.
- **Step Definition·Step Instance·Runtime 부재**: 순차 승인 Step 을 정의하거나 인스턴스화하는 테이블/핸들러 없음.
- **Assignment Policy 부재**(§3.4): `work_item/assignment/queue` 0. 7항(Assignment Policy 존재)이 참조할 SoT가 없음.
- **Authority/Delegation Resolution 부재**(§3.2/§3.3): Authority Matrix·Delegation ABSENT. 8·9항 해석 실체 없음.
- **Cursor 부재**(승인): §45 Cursor ABSENT — 14항 Cursor Version 일치 검증 불가.
- 실존 인접자산: JourneyBuilder 의 edges 기반 "다음 노드" 해석(`JourneyBuilder.php:504` current_node)은 **마케팅 그래프 순회**로 승인 Step Eligibility 와 무관(KEEP_SEPARATE). Tenant 일치(10항)만 Tenant Guard `UserAuth.php:403-406` 로 부분 substrate 존재.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Approval Chain(§3.1)·Assignment(§3.4)·Authority(§3.2)·Delegation(§3.3) 전부 부재 → 14개 조건 중 다수가 참조할 실체 없음.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 엔티티. 다단 Stage/Level/Step Instance + Cursor(§45) + Transition Lock(§46) 이 선행되어야 성립.
- **Mandatory Control**: 자격 판정은 `status=COMPLETED` 단독으로 불충분(§28 원칙) — Completion Event + Completion Snapshot 병행 확인을 필수 조건에 편입.
- 확장 substrate: CAS 조건부 UPDATE(`Catalog.php:1726-1730`·CANONICAL)를 Transition Lock 획득(13항)의 기반으로 재사용. JourneyBuilder 그래프 순회 패턴은 참조 정본이나 승인 도메인과 격리.
- **★실위험**: Cursor Version 일치(14항)를 강제할 Fencing Token 이 ABSENT — stale worker 가 이미 진행된 커서 위에서 다음 Step 자격을 오판정할 이론적 창. 자격 판정 자체를 Fencing Token 검증 하에 두어야 무후퇴.
- **BLOCKED_PREREQUISITE**: 선행 4군 신설 전 실 구현 불가.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
