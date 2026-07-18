# DSAR — Skill Assignment Foundation (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§33 SKILL_ASSIGNMENT_FOUNDATION — 스킬 기반 배정 기반 계약:

1. Skill Registry Reference
2. Proficiency
3. Effective Date
4. Certification
5. Expiration
6. Required Skill
7. Preferred Skill
8. Minimum Proficiency
9. Skill Match Score

원칙: **Skill 이 없어도 Mandatory Authority 우회 금지**(스킬 부적합·부재가 필수 권한 검증을 건너뛰게 하지 않는다).

## 2. 기존 구현 대조

- **Skill Registry / Skill Match: ABSENT.** 승인자 스킬 레지스트리·숙련도(Proficiency)·자격증(Certification)·Skill Match Score 를 표현하는 엔티티가 전무하다(§GROUND_TRUTH 개념별 판정에 Skill 축 자체가 없고, Affinity=ABSENT 와 함께 배정 신호 부재군에 속함).
- 현행 배정 신호는 `PM/Assignees.php:14,32` 의 role(owner/contributor/reviewer/observer) 과 `PM/Enterprise.php:371-400` 의 capacity/workload(읽기전용)뿐 — **스킬·자격·숙련도 차원 없음**.
- Required/Preferred Skill·Minimum Proficiency 매칭을 소비하는 배정 로직 부재. Skill Match Score 산출 코드 없음.
- **Mandatory Authority 우회 금지 원칙(대조)**: 애초에 Authority Matrix 축이 **ABSENT**(`authority_matrix/amount_band` 0)이므로 "우회할 필수 권한 검증"조차 아직 없다 — 스킬이 권한을 우회하는 위험은 Authority 신설 이후에 관리 대상이 된다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Skill Assignment Foundation 은 순신규 축으로, 스킬 레지스트리·매칭 엔티티가 전혀 없다. 다만 그 상위 안전 원칙(Mandatory Authority 우회 금지)은 **축2 Authority Matrix(ABSENT)** 신설을 전제로 해야 의미를 갖는다. 스킬은 배정 우선순위/제외의 **보조 신호**일 뿐 권한의 원천이 아니므로, Authority·Direct Assignment 검증축이 선행이다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규.** Skill Registry Reference·Proficiency·Certification·Expiration·Required/Preferred Skill·Minimum Proficiency·Skill Match Score 를 신규 도입한다. 기존 `pm_task_assignees` role 모델(`PM/Assignees.php:14,32`)은 role 이지 skill 이 아니므로 확장 대상이 아니며 KEEP_SEPARATE.
- **재사용 자산**: 스킬은 Priority Scoring(§38)/Tie-break(§39)의 한 차원으로만 편입 — 별도 배정 큐 신설 금지, `catalog_writeback_job`·`omni_outbox` 패턴 재사용.
- **Mandatory Control**: **Skill 은 우선순위·제외 신호로만 사용**하고, Skill 부재/부적합이 Mandatory Authority·SoD·Direct Assignment 검증을 우회하게 하지 않는다(fail-closed). Skill Match Score 는 결정론적으로 산출·버전·근거 기록.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. Skill 레지스트리가 없는 동안 "스킬 매칭 완료"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
