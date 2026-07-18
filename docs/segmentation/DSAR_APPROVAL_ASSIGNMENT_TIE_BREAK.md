# DSAR — Assignment Tie-Break (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§39 TIE_BREAK — 동점 후보 결정(Tie-break) 우선순위 사슬. 순서:

1. Exact Authority
2. Exact Legal Entity
3. Exact Resource
4. Exact Action
5. Exact Amount Band
6. Active Delegation
7. Higher Availability
8. Higher Remaining Capacity
9. Lower Workload
10. Higher Skill
11. Stronger Affinity
12. Queue Priority
13. Oldest Last Assignment
14. Stable Subject Identifier

원칙: **무작위 tie-break 은 Deterministic Seed 가 있을 때만** — 임의 난수 금지, 재현 가능한 결정론적 seed 하에서만 허용.

## 2. 기존 구현 대조

- **ABSENT.** 동점 후보를 위 우선순위 사슬로 결정하는 Tie-break 로직이 전무하다. 그 전제인 Candidate·Resolution·Priority Scoring 이 모두 **ABSENT** 이므로 "동점" 상황 자체가 산출되지 않는다.
- Tie-break 입력 대부분이 부재/부분: Exact Authority/Amount Band·Active Delegation(①⑤⑥) → 축2 Authority Matrix **ABSENT**; Exact Legal Entity(②) → 축3 Identity/Org **ABSENT**; Higher Availability(⑦) → §36 **ABSENT**; Remaining Capacity/Lower Workload(⑧⑨) → `PM/Enterprise.php:371-400` **읽기전용·미환류**; Higher Skill/Stronger Affinity(⑩⑪) → **ABSENT**.
- Stable Subject Identifier(⑭) 로 최종 결정론을 보장하는 안정 정렬 키·Deterministic Seed 기록 구조 부재.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Tie-break 은 상위 §38 Priority Scoring(ABSENT·BLOCKED_PREREQUISITE)의 하위 결정 단계로, 그 산출(동점 후보 집합)이 있어야 동작한다. 사슬의 각 단계가 **축2 Authority Matrix·축3 Identity/Org(모두 ABSENT)·§36 Availability·§33 Skill·§37 Affinity(모두 ABSENT)** 및 `PM/Enterprise.php:371-400`(Capacity/Workload 읽기전용)에 종속된다. 따라서 선행 4축·상위 Scoring 신설이 선행이다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규(§38 이후).** Tie-break 사슬은 §38 Priority Scoring 산출 이후 최종 결정 단계로만 편입한다 — 별도 배정 엔진 신설 금지. Capacity/Workload 단계는 실존 `PM/Enterprise.php:371-400` 산출 재사용.
- **결정론(§21) 필수**: 사슬 마지막의 **Stable Subject Identifier** 로 완전 결정론을 보장하고, 사슬 앞 단계로 해소되지 않는 잔여 동점에만 **Deterministic Seed**(cursor version·partition key·candidate set hash·resolution timestamp·replay seed 기록)를 적용한다 — 임의 난수 금지.
- **Mandatory Control**: Tie-break 은 **동점 해소 순서**만 정하며 Mandatory Authority·SoD·CoI 검증을 대체·우회하지 않는다(fail-closed). Availability/Skill/Affinity 단계는 가점 신호일 뿐 권한을 부여하지 않는다.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 결정론적 tie-break 이 없는 동안 "동점 담당자 자동결정"을 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
