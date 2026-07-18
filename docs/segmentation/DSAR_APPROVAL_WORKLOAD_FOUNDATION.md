# DSAR — Workload Foundation (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§35 WORKLOAD_FOUNDATION — 승인자 업무량(Workload) 기반 계약. 항목:

1. Active Assignment Count
2. Claimed Assignment Count
3. In-progress Assignment Count
4. Weighted Complexity
5. Amount Exposure
6. Risk Weight
7. Due Date Urgency
8. Average Handling Time
9. Aging
10. Queue Backlog
11. Recent Completion Rate
12. Reassignment Count
13. Current Availability

원칙: **Snapshot + 근거 저장** — 업무량 산정값과 그 근거를 스냅샷으로 남긴다.

## 2. 기존 구현 대조

- **PARTIAL — 읽기전용 리포트만 실존.** `PM/Enterprise.php:371-400` 이 assignee 별 오픈 태스크·est_hours·load_pct 를 40h/wk 기준으로 산출한다. 데이터 소스는 `pm_task_assignees`(`PM/Assignees.php:14,32`, M:N 수동 배정·role 모델).
- **결정적 한계 — 미환류**: 위 산출은 **읽기전용 리포팅**이며 배정 로직에 소비되지 않는다. §35 항목 ①②③(active/claimed/in-progress count)·⑨ Aging·⑩ Queue Backlog 에 대응하는 *유사 신호*(오픈 태스크 수·부하율)는 산출되나, 이를 배정 시점의 **업무량 상한/우선순위로 환류**하는 경로가 없다.
- **부재 항목**: Weighted Complexity(④)·Amount Exposure(⑤)·Risk Weight(⑥)·Due Date Urgency(⑦)·Average Handling Time(⑧)·Recent Completion Rate(⑪)·Reassignment Count(⑫)·Current Availability(⑬) 는 전무. Amount Exposure/Risk Weight 는 축2 Authority Matrix(`authority_matrix/amount_band` ABSENT), Current Availability 는 Availability Matching(§36 ABSENT)에 각각 종속된다.
- **Snapshot + 근거 저장 원칙**: 현행 resourceCapacity 계열 산출은 요청 시점 즉석 계산이며 **불변 스냅샷·근거 저장이 없다** — 배정 재현/감사가 불가능하다.

## 3. 판정

- Verdict: **PARTIAL**
- 선행 의존: active/claimed/in-progress·aging·backlog 유사 지표는 `PM/Enterprise.php:371-400`(읽기전용·미환류)로 부분 존재하나, **배정 환류·업무량 스냅샷·근거 저장이 부재**하다. Amount Exposure·Risk Weight 는 **축2 Authority Matrix(ABSENT)**, Current Availability 는 **Availability Matching(§36 ABSENT)**, Reassignment Count 는 Reassignment(ABSENT)에 종속되어 차단된다.
- cover: `PM/Enterprise.php:371-400`(assignee 별 오픈 태스크·load_pct 읽기전용 산출; 배정 환류·스냅샷으로는 미환류 → 부분 커버) · 소스 `PM/Assignees.php:14,32`

## 4. 확장/구현 방향 (설계)

- **확장 우선(재생성 금지).** 실존 `PM/Enterprise.php:371-400` 의 오픈 태스크·est_hours·load_pct 산출을 Workload Foundation 의 active/claimed/in-progress count·aging·queue backlog 신호원으로 **재사용/환류**한다 — 별도 업무량 산출기 신설 금지. 데이터 소스 `pm_task_assignees`(`PM/Assignees.php:14,32`) 확장.
- **신규 필요 항목**: Weighted Complexity·Amount Exposure·Risk Weight·Due Date Urgency·AHT·Recent Completion Rate·Reassignment Count·Current Availability 는 선행 축(Authority Matrix·Availability·Reassignment) 신설 이후 추가.
- **Mandatory Control**: Workload 는 배정의 **우선순위·제외 보조 신호**이며 권한의 원천이 아니다(§38 Priority Scoring·§39 Tie-break 의 한 차원으로만 편입). 산정값은 **Snapshot + 근거 저장**으로 불변 기록하여 결정론적 재현·감사를 보장한다.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 기존 PM 리포트 표시(resourceCapacity 화면)는 후퇴시키지 않는다. Workload 환류 배선이 없는 동안 "업무량 균형 배정"을 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
