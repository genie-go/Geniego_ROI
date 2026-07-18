# DSAR — Approval Assignment Static Lint (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 0. 판정 원리 — "lint 대상 엔티티가 없다"

§59 는 배정 정의(Definition/Policy/Queue/Strategy)를 **저장·커밋하는 시점에 결손을 잡는 최소 정적 검사(static lint)** 목록이다. lint 는 정의를 저장하는 순간 발동한다. 그러나 이 레포에는 **Approval Assignment Definition/Policy/Queue Version/Strategy/Amount Band 엔티티가 통째로 부재**하다(§GROUND_TRUTH). → **lint 가 겨눌 저장 대상 자체가 없으므로 대부분 `NOT_APPLICABLE`**(엔티티 신설 시 함께 켤 규칙)이다.

★ **`VALIDATED_LEGACY` 미사용**(cover 0). 어떤 lint 도 "기존 구현이 이미 위반을 막는다" 가 아니다. **미구현** — lint 규칙 목록은 스펙에 존재하나 검사 대상 스키마가 없어 발동 불가.

## 1. 원문 전사 + 판정 (§59 Static Lint 차단 목록 — 키트 요약 전사)

§59 원문 차단 목록: Tenant/Version/Policy/Queue/Authority/Delegation/Capacity/Lease/Lock/Amount Band/Currency/Loop/문자열 Assignee 등.

| # | 원문 lint 규칙 | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant 없는 Assignment Definition | Assignment Definition 부재 · 검사할 정의 없음 | NOT_APPLICABLE |
| 2 | Active Version 없는 Active Definition | 불변 버전체인 선례 0 · 인접 큐 `Catalog.php:75-84`에 버전 없음 | NOT_APPLICABLE |
| 3 | Policy 없는 Assignment | Assignment Policy(§8) 부재 | NOT_APPLICABLE |
| 4 | Queue Version 없는 Active Queue | Queue Version(§23) 0 · 인접 `Catalog.php:75-84`·`Omnichannel.php:405` 큐에 버전 없음 | NOT_APPLICABLE |
| 5 | Authority 참조 없는 Assignment Definition | 축2 Authority Matrix ABSENT — 참조 대상 부재 | NOT_APPLICABLE |
| 6 | Delegation 참조 없는 Delegated Assignment | 위임 정본 ABSENT · `TeamPermissions.php:627-647` ACL 상한(인접상이) | NOT_APPLICABLE |
| 7 | Capacity Policy 없는 Load 전략 | Capacity=PARTIAL(`PM/Enterprise.php:371-400` 읽기전용) · 전략 저장 대상 없음 | NOT_APPLICABLE |
| 8 | Lease Policy 없는 Claim Queue | Lease(§42) 엔티티 부재 · 인접 claim(`Omnichannel.php:425-448`)에 명시 Lease 없음 | NOT_APPLICABLE |
| 9 | Lock Fencing 없는 Lock 정의 | 인접 락(`Catalog.php:1721-1731`·`Omnichannel.php:425-448`)에 fencing token 부재 · Lock(§44) 정의 자체 없음 | ABSENT |
| 10 | Amount Band 없는 Monetary Assignment | Amount Band(§34) 0 · `Catalog.php:1016` 단건 상수만 | NOT_APPLICABLE |
| 11 | Lower Bound > Upper Bound | Amount Band 경계 컬럼 부재 → 대소 검사 무대상 | NOT_APPLICABLE |
| 12 | Currency Scope 없는 Monetary Assignment | currency_scope 0(변환 전용) | NOT_APPLICABLE |
| 13 | Loop 가능한 Fallback/Routing Rule | Fallback(§51)·Routing Rule(§26) ABSENT — 루프 검사 대상 없음 | NOT_APPLICABLE |
| 14 | 문자열/Email/Role Name Assignee | Assignee canonical binding 부재 · **현행 `team_role` flat 3값·`parent_user_id`(`UserAuth.php:156-157`) 문자열 파생이 이 lint 가 겨눌 안티패턴** | ABSENT |
| 15 | Snapshot 직접 수정 허용 | Snapshot(§54) 부재 · 불변 정본 = `SecurityAudit.php:56-68` verify() (확장 대상 인접자산) | ABSENT |

**전사(키트 요약 15항).** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 3(#9·14·15) · `NOT_APPLICABLE` 12.

> 🔴 **커버 0. 미구현** — lint 12건이 `NOT_APPLICABLE` 인 것은 "이미 준수" 가 아니라 **검사할 저장 대상(Assignment Definition/Policy/Queue Version/Strategy/Amount Band)이 통째로 없다**는 뜻이다. #14(문자열 Assignee)·#9(Fencing 없는 Lock)·#15(Snapshot 수정)은 인접 안티패턴/자산이 실재하므로 `ABSENT`(의미 있게 빠짐).

## 2. 규칙

- 🔴 **엔티티 신설 = lint 동시 발동이 완료조건** — Definition/Policy/Queue Version/Strategy/Amount Band DDL 신설 커밋에 §59 static lint 를 **같은 PR 로** 붙여라. lint 없는 스키마 신설은 §58 Critical Gap 을 구조적으로 재초대한다.
- 🔴 **문자열 Assignee lint(#14)를 신설 시점부터** — `team_role`/`parent_user_id`(`UserAuth.php:156-157,1225-1227`)를 Assignee 소스로 재사용하면 이 lint 가 자기 코드에 걸린다. Assignee 는 canonical binding 컬럼으로만 저장하고 문자열/Email/Role Name 저장을 lint 로 차단.
- 🔴 **Lock Fencing lint(#9)** — Lock(§44) 정의는 fencing token 필수 컬럼 없이는 커밋 불가하도록 lint. 현행 `omni_outbox`/`catalog_writeback_job` 의 fencing 부재를 스키마 레벨에서 되풀이하지 마라.
- 🔴 **Snapshot immutable lint(#15)는 `SecurityAudit::verify()` 확장** — 새 해시엔진 금지. `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **본 문서는 정책 명세** — §59 원문은 키트에 요약 전사되어 있으며, 실 스키마 신설 시 원문 스펙의 전체 lint 규칙을 재확인해 누락 없이 켜라.

관련: [[DSAR_APPROVAL_ASSIGNMENT_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_ASSIGNMENT_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
