# DSAR — Approval Assignment Fallback (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`FALLBACK`(§51) — 1차 배정 대상이 무자격/불가일 때 **정해진 순서로 다음 승인 대상을 탐색**하는 폴백 체인. 모든 단계는 Mandatory Control 을 통과해야 한다.

### 폴백 순서 (원문)

1. Valid Delegate
2. Valid Substitute
3. Acting Position
4. Eligible Queue Member
5. Parent Queue
6. Legal Entity Queue
7. Regional Queue
8. Global Shared Service Queue
9. Manager
10. Organization Head
11. Manual Review Queue
12. Dead-letter Queue
13. Block

원문 원칙: **모든 Mandatory Control 통과** (폴백이라도 Authority/SoD/CoI/Capacity 우회 금지).

## 2. 기존 구현 대조

승인 배정용 Fallback 체인은 **부재**하다(개념별 판정: Fallback=PARTIAL·무관). 코드에 존재하는 waterfall 은 `Omnichannel.php` 의 **채널 발송 폴백**(메시지 채널 순차 시도)으로, 이것은 승인 대상 폴백(approver-fallback)이 아니며 순서·의미가 전혀 다르다.

| 폴백 단계/필드 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Approver Fallback 체인 자체 | 부재 — 승인 대상 폴백 순서 코드 0 | ABSENT |
| 채널 waterfall (무관) | `omni_outbox` 채널 발송 폴백(`Omnichannel.php:405,425-448`) — **발송 채널 폴백**이지 approver 폴백 아님 | PARTIAL(무관·채널) |
| Valid Delegate / Substitute / Acting Position | 위임·대리·직위 정본 ABSENT(선행 축3) | BLOCKED_PREREQUISITE |
| Eligible Queue Member / Parent·Legal Entity·Regional Queue | Queue Membership/Eligibility(§24·§25) ABSENT · 큐 계층 없음 | ABSENT |
| Manager / Organization Head | 선행 축3 `reporting_line/org_unit` ABSENT(`UserAuth.php:156-157,1225-1227`) | BLOCKED_PREREQUISITE |
| Manual Review / Dead-letter Queue | 인접 큐 = `catalog_writeback_job`(`Catalog.php:75-84`) 실재하나 dead-letter/manual-review 큐 유형 없음 | PARTIAL(큐 실재·유형 부재) |
| 모든 단계 Mandatory Control 통과 | 축2 Authority·축4 SoD/CoI hook 부재 | BLOCKED_PREREQUISITE |

## 3. 판정

- Verdict: **ABSENT** (인접 waterfall 은 **무관**) — 승인 배정용 Fallback 체인 전무. `Omnichannel.php:405,425-448` 채널 waterfall 은 발송 채널 폴백이지 approver-fallback 이 아니다(오인 금지).
- 선행 의존: Delegate/Substitute/Acting·Manager/Organization Head·Mandatory Control 통과는 **선행 축2·축3·축4 부재**로 `BLOCKED_PREREQUISITE`. Queue 계층 폴백은 Membership/Eligibility(§24·§25) ABSENT 에 의존.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Approver Fallback 은 순신설이며 **채널 waterfall(`Omnichannel.php:405,425-448`)을 재사용/혼동하지 마라** — 발송 채널 폴백과 승인 대상 폴백은 도메인이 다르다(§66 중복 감사: 이름 유사물 오용 금지).
- 폴백 순서(§51 13단계)는 **위임·대리·직위(축3)·큐 계층(§22·§24)·조직 계층(축3)이 모두 선행**되어야 성립. 그 전에는 Manual Review Queue → Block 만 안전하게 구현 가능(fail-closed).
- **핵심 원칙: 폴백이라도 Mandatory Control(Authority/SoD/CoI/Capacity) 우회 금지**(§58 Critical Gap). 폴백은 무자격 대상을 우회 승인시키는 뒷문이 아니다.
- Fallback Loop 방지(§52 FALLBACK_LOOP) — 폴백 체인이 순환하지 않도록 방문 집합 추적. 최종 단계는 항상 Dead-letter Queue → Block.
- Manual Review/Dead-letter Queue 는 `catalog_writeback_job` 를 재구현하지 말고 Queue Type(§22)로 확장.
- 코드 변경 0 유지 — 실 구현은 선행 4축 신설 후 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
