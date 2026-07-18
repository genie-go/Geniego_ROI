# DSAR — Capacity Foundation (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§34 CAPACITY_FOUNDATION — 승인자 수용량(Capacity) 기반 계약. 항목:

1. maximum active assignments
2. maximum claimed assignments
3. maximum amount exposure
4. maximum high-risk
5. daily capacity
6. weekly capacity
7. queue-specific capacity
8. legal-entity-specific capacity
9. domain-specific capacity
10. reserved capacity
11. emergency reserve
12. current utilization
13. remaining capacity
14. valid_from / valid_to

원칙: **Soft / Hard 구분** — Hard 초과 시 배정 차단.

## 2. 기존 구현 대조

- **PARTIAL — 읽기전용 리포트만 실존.** `PM/Enterprise.php:371-400` resourceCapacity 가 assignee 별 오픈 태스크·est_hours·load_pct 를 40h/wk 기준으로 산출한다. 데이터 소스는 `pm_task_assignees`(`PM/Assignees.php:14,32`).
- **결정적 한계 — 미환류**: resourceCapacity 는 **읽기전용 리포팅**이며 배정 로직에 소비되지 않는다(current utilization·remaining capacity 유사 신호가 산출되나 배정 차단으로 환류되지 않음). 즉 §34 항목 ①②(active/claimed 상한)·⑫⑬(utilization/remaining)에 대응하는 *지표*는 있으나, 이를 **한도로 강제(enforce)** 하는 경로가 없다.
- **부재 항목**: maximum amount exposure(③)·maximum high-risk(④)·queue/legal-entity/domain-specific capacity(⑦⑧⑨)·reserved capacity(⑩)·emergency reserve(⑪)·valid_from/to(⑭) 는 전무 — Authority Matrix(amount_band ABSENT)·Identity/Org(legal_entity ABSENT)·Queue Membership(ABSENT) 종속 항목들이다.
- **Soft/Hard 구분·Hard 차단 원칙**: 현행 resourceCapacity 는 load_pct 를 초과해도 배정을 막지 않는다(리포트일 뿐) — Hard 초과 차단 부재.

## 3. 판정

- Verdict: **PARTIAL**
- 선행 의존: active/claimed·utilization·remaining 지표는 `PM/Enterprise.php:371-400`(resourceCapacity, 읽기전용·미환류)로 부분 존재하나, **한도 강제(Hard 차단)·미환류 배선이 부재**하다. amount exposure·high-risk·legal-entity/domain/queue-specific capacity 는 각각 **축2 Authority Matrix·축3 Identity/Org·Queue Membership(모두 ABSENT)** 에 종속되어 차단된다.
- cover: `PM/Enterprise.php:371-400`(resourceCapacity — 읽기전용 지표 산출; 배정 한도 강제로는 미환류 → 부분 커버)

## 4. 확장/구현 방향 (설계)

- **확장 우선(재생성 금지).** 실존 `PM/Enterprise.php:371-400` resourceCapacity 의 오픈 태스크·est_hours·load_pct 산출 로직을 Capacity Foundation 의 current utilization·remaining capacity·maximum active assignments 신호원으로 **재사용/환류**한다 — 별도 capacity 산출기 신설 금지. 데이터 소스 `pm_task_assignees`(`PM/Assignees.php:14,32`) 도 확장 대상.
- **신규 필요 항목**: amount exposure·high-risk·queue/legal-entity/domain-specific capacity·reserved capacity·emergency reserve·valid_from/to 는 선행 축(Authority·Identity/Org·Queue Membership) 신설 이후 추가.
- **Mandatory Control**: Soft/Hard 를 구분하고 **Hard Capacity 초과 시 배정 차단(fail-closed)**. Capacity 는 우선순위·제외 신호이자 상한이며, resourceCapacity 를 "읽기전용 리포트"에서 "배정 시점 검증"으로 승격시키되 기존 PM 리포트 화면의 표시는 후퇴시키지 않는다(무후퇴).
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. Hard 차단 배선이 없는 동안 "수용량 검증 통과"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
