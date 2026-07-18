# DSAR — Role Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§28 ROLE_ASSIGNMENT — Role 기반 배정 계약:

1. Role 만 저장한 후 **미해석 Decision 금지** — Role 을 배정 대상으로만 남겨 두고 실제 승인 주체로 해석하지 않은 채 결정에 진입하는 것을 금지.
2. Role Assignment → **Active Subject 해석** — Role 배정은 결정 전 활성 실주체(들)로 해석되어야 한다.
3. **Snapshot** 기록 항목:
   - Role Version
   - Role Assignment Version
   - Subject
   - Org
   - Legal Entity
   - Authority
   - Effective Time

## 2. 기존 구현 대조

- **Role Registry / Role Assignment 엔티티: ABSENT.** 승인 배정을 위한 Role 레지스트리·Role Assignment(주체↔역할 배정) 엔티티가 없다.
- 현행 역할 신호는 **flat 3값 team_role** 뿐 — Identity/Org 축 **ABSENT**(`UserAuth.php:156-157,1225-1227` parent_user_id=owner 붕괴, team_role flat 3값). 이는 Role *Assignment* 가 아니라 사용자당 단일 문자열 역할이다(버전·Effective Time·Org/Legal Entity 바인딩 없음).
- `TeamPermissions.php:627-647` 은 manager 가 자기 미보유 권한을 위임하려 할 때의 ACL 부여상한(DELEGATION_EXCEEDED)일 뿐, Role→Active Subject 해석도 Role Version/Assignment Version snapshot 도 아니다(인접·상이).
- **미해석 Decision 금지(①)의 현행 위반 소지**: 승인은 Role 해석 없이 엔드포인트 도달자가 처리 — `Catalog.php:2383` approveQueue(:2385 requirePro), `AdminGrowth.php:1313` admin 1인. Role Assignment 를 Active Subject 로 해석하는 단계 자체가 부재.
- **Snapshot(③)**: Assignment Snapshot 개념 전무(§GROUND_TRUTH 개념별 판정 = Snapshot ABSENT). Role Version·Assignment Version·Authority snapshot 을 남기는 코드 없음.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: Role Registry / Role Assignment 엔티티가 부재하고, 그 기반인 **축3 Identity/Org(ABSENT)** 가 없다. Role→Active Subject 해석의 Snapshot 필수 항목(Org·Legal Entity·Authority)은 각각 축3·축2(Authority Matrix ABSENT)에 종속된다. 선행 축이 신설되기 전에는 Role Assignment 를 해석할 대상 자체가 없다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규 — 단, 선행 4축 후행.** Role Registry·Role Assignment·Role Version 엔티티는 신규이나, 착수는 축2(Authority)·축3(Identity/Org) 신설 이후로 게이트된다.
- **재사용 자산**: 배정 이후 lifecycle 은 `catalog_writeback_job`(`Catalog.php:75-84`) 승인 큐 패턴, claim/lease 는 `omni_outbox`(`Omnichannel.php:95-99,405,425-448`) 를 확장한다. 기존 `pm_task_assignees` role 모델(`PM/Assignees.php:14,32` owner/contributor/reviewer/observer)은 **작업 배정 role** 로 KEEP_SEPARATE — 승인 Role Assignment 와 명명 혼동 금지.
- **Mandatory Control**: Role 은 반드시 결정 전 Active Subject 집합으로 해석하고, 해석 시점의 Role Version·Role Assignment Version·Authority·Effective Time 을 immutable snapshot 으로 고정한다(결정 시점 재검증 유지). 미해석 Role 로 Decision 진입 금지(fail-closed).
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 본 문서 코드변경 0. Role 테이블이 없는 동안 "Role 검증 통과"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
