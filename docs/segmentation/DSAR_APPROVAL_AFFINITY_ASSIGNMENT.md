# DSAR — Affinity Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§37 AFFINITY_ASSIGNMENT — 친화도(Affinity, 담당 연속성) 기반 배정 계약. Affinity 차원:

1. Previous Assignee
2. Current Case Assignee
3. Customer
4. Partner
5. Program
6. Project
7. Brand
8. Product
9. Country
10. Region
11. Legal Entity
12. Organization
13. Contract
14. Claim
15. Settlement

원칙: **Affinity 가 Authority/SoD 보다 우선 금지** — 담당 연속성 신호가 필수 권한 검증·직무분리(SoD) 를 넘어서지 못한다.

## 2. 기존 구현 대조

- **ABSENT.** 이전 담당자·동일 케이스 담당자·고객/파트너/프로그램/프로젝트/브랜드/제품 친화도를 배정 신호로 표현·소비하는 엔티티가 전무하다. §GROUND_TRUTH 개념별 판정에서 **Affinity=ABSENT**.
- 현행 배정 관련 신호는 `PM/Assignees.php:14,32` 의 role 모델과 `PM/Enterprise.php:371-400` 의 capacity/workload(읽기전용)뿐 — **담당 연속성(sticky assignee)·엔티티 친화도 차원 없음**.
- Previous/Current Case Assignee 를 우선 배정하는 sticky 로직, Customer/Contract/Claim/Settlement 단위 담당 연속성 로직 부재.
- **"Affinity 가 Authority/SoD 보다 우선 금지" 원칙(대조)**: 상위 권한축 축2 Authority Matrix(ABSENT)·직무분리 SoD hook(축4 Security/Authz PARTIAL, **SoD hook 부재**) 자체가 아직 없으므로, "친화도가 권한/SoD 를 우회"하는 위험은 그 축들 신설 이후에 관리 대상이 된다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Affinity Assignment 는 순신규 축으로 관련 엔티티가 전혀 없다. Legal Entity/Organization 친화도(⑪⑫)는 **축3 Identity/Org(`org_unit/legal_entity` ABSENT)**, Authority/SoD 대비 우선순위 억제는 **축2 Authority Matrix(ABSENT)·축4 SoD hook(부재)** 신설을 전제로 한다. 친화도는 배정 **우선순위 보조 신호**일 뿐 권한의 원천이 아니다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규.** Previous/Current Case Assignee·Customer/Partner/Program/Project/Brand/Product/Country/Region/Legal Entity/Organization/Contract/Claim/Settlement 친화도 차원을 신규 도입한다. 기존 `pm_task_assignees`(`PM/Assignees.php:14,32`)의 배정 이력은 Previous Assignee 신호원으로 **참조 재사용** 가능하나 그 자체가 친화도 엔진은 아니다.
- **재사용 자산**: Affinity 는 §38 Priority Scoring/§39 Tie-break 의 한 차원(Stronger Affinity)으로만 편입 — 별도 배정 큐/엔진 신설 금지.
- **Mandatory Control**: **Affinity 는 우선순위 신호로만 사용**하고, Authority·SoD·CoI·Direct Assignment 검증을 우회하거나 그보다 우선하게 하지 않는다(fail-closed). Sticky assignee 라도 결정 시점 재검증(Decision-time Revalidation)을 유지한다.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. 친화도 엔진이 없는 동안 "담당 연속성 자동배정"을 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
