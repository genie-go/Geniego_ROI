# DSAR — Manager Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§30 MANAGER_ASSIGNMENT — 관리자(Manager) 기반 배정 계약:

1. **Manager Resolution Foundation 사용** — 관리자 배정은 별도의 Manager 해석 기반을 통해서만 이루어진다.
2. **관리자 유형 구분**:
   - Direct Manager
   - Functional Manager
   - Dotted-line Manager
   - Acting Manager
   - Organization Head
   - Legal Entity Head
   - Escalation Manager Reference
3. **Manager 없으면 Silent Pass 금지** — 관리자를 해석하지 못하면 조용히 통과시키지 않는다(fail-closed·명시적 fallback/block).

## 2. 기존 구현 대조

- **Manager Resolution Foundation: ABSENT.** 관리자 해석 기반이 없다 — Identity/Org 축 **ABSENT**(`reporting_line/org_unit` grep 0).
- **Reporting Line 붕괴**: 현행에 관리자 관계를 표현할 유일한 인접 필드는 `UserAuth.php:156-157,1225-1227` **parent_user_id 인데, 이는 reporting line(상사)이 아니라 owner(소유/생성 계정) 로 붕괴**되어 있다. 즉 "관리자"를 문의하면 owner 가 반환되는 의미 오염이 있어 Manager 해석의 SoT 로 사용할 수 없다.
- **관리자 유형 구분(②)**: Direct/Functional/Dotted-line/Acting Manager·Organization Head·Legal Entity Head·Escalation Manager 를 구분할 org 구조가 전무(Identity/Org ABSENT). team_role 은 flat 3값으로 계층을 표현하지 못한다.
- **Silent Pass 금지(③)**: 승인자 fallback 자체가 부재(Fallback PARTIAL/무관)하여, 관리자 미해석 시 명시적 block 으로 유도하는 경로가 없다.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: **Reporting Line 이 parent_user_id 의 owner 의미로 붕괴**된 것이 핵심 차단점이다(`UserAuth.php:156-157,1225-1227`). Manager Resolution Foundation 은 **축3 Identity/Org(ABSENT)** 의 신설과, owner 와 reporting line 의 의미 분리를 선행 조건으로 한다. 관리자 유형 구분은 축3 org 계층, Legal Entity Head 는 legal entity 축까지 요구한다.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규 — 선행 4축 후행.** Manager Resolution Foundation 은 축3 Identity/Org 신설 시 reporting line(상사)을 owner(parent_user_id)와 **의미적으로 분리**하여 도입한다. 기존 `parent_user_id`(owner)를 관리자 관계로 재해석하는 것은 금지(의미 오염 확대 금지·무후퇴).
- **재사용 자산**: 관리자 미해석 시 Escalation/Manual Review 종착점은 실존 승인 큐 `catalog_writeback_job`(`Catalog.php:75-84`) 으로 실현.
- **Mandatory Control**: 관리자 해석 실패 시 Silent Pass 금지 — 명시적 fallback(§51 순서) 또는 Manual Review Queue/Block 으로 유도한다. 관리자 유형(Direct/Functional/Dotted-line/Acting/Org Head/Legal Entity Head/Escalation)은 문자열이 아닌 Canonical 관계로 구분.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. Reporting line 이 분리되기 전에는 "관리자 배정 완료"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
