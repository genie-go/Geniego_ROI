# DSAR — Assignment Priority Scoring (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§38 PRIORITY_SCORING — 후보 순위 산정(Priority Scoring) 계약. 점수 차원(Dimension):

1. Authority Match
2. Delegation Match
3. Legal Entity Match
4. Organization Match
5. Geography Match
6. Resource Match
7. Action Match
8. Monetary Match
9. Currency Match
10. Availability
11. Capacity
12. Workload
13. Skill
14. Affinity
15. Queue Priority
16. Actor Priority
17. Recency Penalty
18. Reassignment Penalty
19. Conflict Penalty

원칙: **각 Dimension 의 Weight·Version 저장** — 가중치와 버전을 기록하여 점수 산정이 결정론적으로 재현·감사 가능해야 한다.

## 2. 기존 구현 대조

- **ABSENT.** 후보를 다차원 가중 점수로 랭킹하는 Priority Scoring 엔진이 전무하다. §GROUND_TRUTH 개념별 판정에서 Candidate·Resolution·Strategy 가 모두 **ABSENT** 이며, 이를 소비하는 점수 산정 로직도 없다.
- 각 점수 차원의 **입력 축 대부분이 부재/부분**이다: Authority/Delegation/Monetary Match(①②⑧) → 축2 Authority Matrix **ABSENT**; Legal Entity/Organization/Geography Match(③④⑤) → 축3 Identity/Org **ABSENT**; Availability(⑩) → §36 **ABSENT**; Capacity/Workload(⑪⑫) → `PM/Enterprise.php:371-400` **읽기전용·미환류**; Skill(⑬)/Affinity(⑭) → **ABSENT**; Conflict Penalty(⑲) → Conflict PARTIAL(동시성만).
- Dimension Weight·Version 을 저장하고 점수를 결정론적으로 재산정하는 저장/버전 구조 부재.

## 3. 판정

- Verdict: **ABSENT · BLOCKED_PREREQUISITE**
- 선행 의존: Priority Scoring 은 다수 Dimension 이 선행 4축에 직접 종속되어 **BLOCKED_PREREQUISITE** 이다 — **축1 Approval Chain(ABSENT)** ·**축2 Authority Matrix(ABSENT, `TeamPermissions.php:627-647` DELEGATION_EXCEEDED 는 ACL 부여상한으로 상이)** ·**축3 Identity/Org(ABSENT, `UserAuth.php:156-157,1225-1227` parent_user_id=owner 로 붕괴)** ·**축4 Security/Authz(PARTIAL, `SecurityAudit.php:56-68` verify() 실재하나 SoD/CoI hook 부재)** 가 신설되기 전에는 Authority/Legal Entity/SoD 차원 점수를 산정할 수 없다. Capacity/Workload 차원만이 `PM/Enterprise.php:371-400`(읽기전용) 로 부분 가용.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규(선행 4축 신설 후).** Priority Scoring 은 각 Dimension 을 **선행 4축 신설 이후** 하나씩 편입한다. Capacity/Workload 차원은 실존 `PM/Enterprise.php:371-400` 산출을 신호원으로 재사용(별도 산출기 신설 금지), Affinity/Availability/Skill 차원은 각 순신규 축(§36·§37·§33) 신설분을 참조한다.
- **결정론(§21)**: 동일 입력·정책버전·후보 Snapshot·Effective Time 이면 동일 점수/랭킹을 산출한다. 각 Dimension 의 **Weight·Version·candidate set hash·tie-break key·replay seed 를 저장**한다.
- **Mandatory Control**: Priority Scoring 은 **후보 순위**만 정하며 Mandatory Authority·SoD·CoI·Direct Assignment(§27) 검증을 대체하지 않는다 — 점수가 높아도 필수 검증 실패 후보는 제외(fail-closed). Availability/Skill/Affinity 는 가점/제외 신호일 뿐 권한을 부여하지 않는다.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 선행 4축·입력 차원이 갖춰지기 전에는 "최적 담당자 점수 산정 완료"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
