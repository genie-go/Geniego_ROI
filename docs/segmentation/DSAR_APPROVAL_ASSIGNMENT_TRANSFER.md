# DSAR — Approval Assignment Transfer (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`TRANSFER`(§49) — Work Item 을 **다른 Queue / 다른 Legal Entity / 다른 Organization 으로 이관**하는 이벤트. 국경 간(cross-border) 검증을 동반한다.

### 필수 필드 (원문)

1. transfer_id
2. work_item_id
3. source queue / target queue
4. source legal entity / target legal entity
5. source organization / target organization
6. reason
7. authority / legal entity / cross-border validation
8. approved_by
9. transferred_at
10. status
11. evidence

## 2. 기존 구현 대조

Transfer 엔진은 **통째로 부재**하다(개념별 판정: Transfer=ABSENT). Legal Entity·Organization 간 이관은 선행 축3(Identity/Org)이 부재하므로 개념 자체가 성립하지 않는다 — `org_unit/reporting_line/legal_entity` grep 0.

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Transfer 엔티티 자체 | 부재 — 이관 이벤트/검증 코드 0 | ABSENT |
| source/target queue | 인접 큐 = `catalog_writeback_job`(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:95-99`) 실재하나 큐 간 이관 개념 없음 | PARTIAL(큐 실재·이관 부재) |
| source/target legal entity | 선행 축3 `legal_entity` 정본 **ABSENT** | BLOCKED_PREREQUISITE |
| source/target organization | 선행 축3 `org_unit/reporting_line` **ABSENT**(`UserAuth.php:156-157,1225-1227` parent_user_id=owner 붕괴·team_role flat 3값) | BLOCKED_PREREQUISITE |
| authority / cross-border validation | 선행 축2 Authority Matrix ABSENT · cross-border 검증 없음 | BLOCKED_PREREQUISITE |
| approved_by | 인접 승인 = `admin_growth_approval`(`AdminGrowth.php:142`)·`agency_client_link`(`AgencyPortal.php:80`) — 이관 전용 승인 없음 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — Transfer 엔티티·큐/법인/조직 간 이관·cross-border 검증 전무.
- 선행 의존: source/target legal entity·organization·authority/cross-border validation 은 **선행 축2 Authority·축3 Identity/Org 부재**로 `BLOCKED_PREREQUISITE`. source/target queue 만 인접 큐(`Catalog.php:75-84`·`Omnichannel.php:95-99`)로 `PARTIAL`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Transfer 는 순신설이며 **선행 축3(Legal Entity·Organization 정본)·축2(Authority)가 반드시 선행**되어야 성립한다. Org/Legal Entity 모델 없이 이관을 세우면 대상 없는 껍데기가 된다.
- Reassignment(§47)와 **혼동 금지** — Reassignment 는 Assignee 교체, Transfer 는 Queue/Legal Entity/Organization 경계 이관. §66 중복 감사에서 Delegation↔Reassignment 혼용을 지적하듯 Transfer 도 별도 정본.
- cross-border validation(법인 간 이관)은 Mandatory Control — approved_by 필수·authority validation·legal entity validation 통과 후에만. fail-closed(검증 미통과 시 차단).
- target queue 는 `catalog_writeback_job`·`omni_outbox` 를 재구현하지 말고 Queue(§22) 정본으로 확장.
- 코드 변경 0 유지 — 실 구현은 선행 4축 신설 후 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
