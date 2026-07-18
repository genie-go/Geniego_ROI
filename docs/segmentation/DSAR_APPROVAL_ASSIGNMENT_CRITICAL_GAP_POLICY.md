# DSAR — Approval Assignment Critical Gap Policy (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 0. 판정 원리 — "gap 이 두 종류다"

§58 은 배정 엔진에서 **High/Critical 로 처리하라**는 위험 후보 목록이다. 그러나 이 레포에는 **Approval Assignment 엔진 자체가 부재**하고 **선행 4축(Approval Chain·Authority·Org·SoD)** 이 ABSENT/PARTIAL 이다. 따라서 각 gap 후보는 두 부류로 갈린다.

| 부류 | 의미 | 판정 어휘 |
|---|---|---|
| 🔴 **실재(현행 미방지)** | 배정/승인 판정축이 없어 **무조건 통과**하거나 현행 flat 승인이 이미 안티패턴을 수행 중 → 지금 존재하는 위험 | `CRITICAL_UNPREVENTED` |
| ⚪ **미구현(선행 부재)** | 대상 엔티티(Assignment/Snapshot/Lease/Lock/Queue Version 등)가 없어 "판정 자체가 없다" | `BLOCKED_PREREQUISITE` · `ABSENT` |

★ **`VALIDATED_LEGACY` 미사용**(cover 0). Assignment 엔진이 통째 부재하므로 어떤 gap 도 "기존 구현이 이미 막는다" 가 아니다. ★ **현 상태에서 대부분 gap 은 미방지(Critical)** — 승인 자체는 flat 하게 성립하지만(`AdminGrowth.php:142`·`Catalog.php:2383-2407`·`Mapping.php:267-271`) 그 승인을 **자격·권한·시점·중복·루프 관점에서 검증하는 통제가 통째로 없기 때문**이다.

## 1. 원문 전사 + 판정 (§58 High/Critical Gap 목록)

| # | 원문 gap 후보 | 부류 | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|---|
| 1 | Work Item 없이 배정 | ⚪미구현 | Work Item=PARTIAL(`Catalog.php:75-84` job) · Assignment 부재 | ABSENT |
| 2 | Policy 없이 배정 | ⚪미구현 | Assignment Policy(§8) 부재 | ABSENT |
| 3 | Queue Version 없이 Claim | ⚪미구현 | Queue Version(§23) 0 · 인접 큐 `Catalog.php:75-84`·`Omnichannel.php:405`에 버전 없음 | ABSENT |
| 4 | Authority 미검증 배정 | 🔴실재 | 축2 Authority Matrix ABSENT → 승인자=진입게이트 통과자(requirePro `Catalog.php:2385`)이지 자격자 아님 | CRITICAL_UNPREVENTED |
| 5 | Delegation 미검증 배정 | 🔴/⚪ | 위임 정본 ABSENT · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED=ACL 상한(인접상이) | BLOCKED_PREREQUISITE |
| 6 | Cross-Tenant 배정 | 🔴잔여위험 | tenant 격리 분산·실재(§GROUND_TRUTH 축4 PARTIAL) 하나 배정 경로 전용 재검증 부재 | CRITICAL_UNPREVENTED |
| 7 | Wrong Legal Entity 배정 | ⚪미구현 | Legal Entity 엔티티 0(축3 ABSENT) | ABSENT |
| 8 | Inactive/Terminated/Suspended Subject 배정 | 🔴실재 | Subject 활성/종료 상태판정축 부재(축3) → 비활성 주체 배정 차단 0 | CRITICAL_UNPREVENTED |
| 9 | Wrong Resource/Action 배정 | 🔴실재 | 배정 리소스/액션 스코프 검증 부재 · 승인은 flat 통과 | CRITICAL_UNPREVENTED |
| 10 | Amount 초과 배정 | 🔴실재 | Amount Band(§34) 0 · `Catalog.php:1016` 유일 금액상수는 boolean 게이트만·한도집행 0 | CRITICAL_UNPREVENTED |
| 11 | Currency Mismatch 배정 | ⚪미구현 | currency_scope 0(통화=변환 전용) | ABSENT |
| 12 | Membership 없는 Claim | ⚪미구현 | Queue Membership(§24) 부재 · 인접 claim `Omnichannel.php:425-448`는 멤버십 무검증 | ABSENT |
| 13 | Eligibility 없는 Claim | ⚪미구현 | Queue Eligibility=PARTIAL(RBAC만) · 배정 자격 판독축 부재 | BLOCKED_PREREQUISITE |
| 14 | Lease 없는 Claim | 🔴실재 | 인접 claim(`Catalog.php:1721-1731`·`Omnichannel.php:425-448`)에 **명시적 Lease 개념 없이 claim** — job 회수(`Catalog.php:1699-1702`)는 시간기반이지 Lease 아님 | CRITICAL_UNPREVENTED |
| 15 | 만료 Lease Decision | ⚪미구현 | Lease(§42) 엔티티 부재 → 만료 판정 대상 없음 | ABSENT |
| 16 | Stale Lock Decision | 🔴실재 | 인접 락(`Omnichannel.php:425-448` SKIP LOCKED·`Catalog.php:1721-1731` CAS)에 **Fencing Token 없음**(§GROUND_TRUTH: omni_outbox fencing 없음) → 오래된 프로세스 덮어쓰기 방지 부재 | CRITICAL_UNPREVENTED |
| 17 | 중복 Assignment/Claim | 🔴실재 | 중복 Active 배정 차단 부재 · 인접 CAS(`Catalog.php:1721-1731`)는 단일 job 경합만 방어 | CRITICAL_UNPREVENTED |
| 18 | History 삭제 | 🔴실재 | Assignment History(§14) 부재 · 정면 반례 `AgencyPortal.php:414-427` revoked_at in-place 소거 패턴 | CRITICAL_UNPREVENTED |
| 19 | Snapshot 누락 | 🔴실재 | Snapshot(§54) ABSENT → flat 승인 시점 권한/역할 미보존(축4 Actor Snapshot 부재) | CRITICAL_UNPREVENTED |
| 20 | 과거 재작성 | 🔴실재 | 불변 버전체인 부재 · `AgencyPortal.php:381,414-427` in-place 상태 소거가 현행 안티패턴 | CRITICAL_UNPREVENTED |
| 21 | Reason 누락 배정/변경 | 🔴실재 | 배정 변경 Reason 필수화 부재 · flat 승인은 reason 없이 성립 | CRITICAL_UNPREVENTED |
| 22 | Loop(Reassignment/Routing/Fallback) | ⚪미구현 | Reassignment/Routing/Fallback 개념 ABSENT → 루프 대상 없음 | ABSENT |
| 23 | Orphan Assignment | ⚪미구현 | Assignment 부재 · 인접 = `catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`)는 job orphan 회수 | PARTIAL(job용) |
| 24 | 영구 Claim/Reservation | 🔴실재 | 인접 claim(`Omnichannel.php:425-448`)에 만료 강제 없음 · 600s 회수(`Catalog.php:1699-1702`)는 job 한정 | CRITICAL_UNPREVENTED |
| 25 | Hard Capacity 우회 | 🔴실재 | Capacity=PARTIAL(`PM/Enterprise.php:371-400` 읽기전용·미환류) → Hard 한도 차단 0 | CRITICAL_UNPREVENTED |
| 26 | SoD/CoI 우회 | 🔴실재 | 축4: SoD hook·CoI foundation 부재 · `Mapping.php:268` 자기승인차단 1경로만·나머지 미방어 | CRITICAL_UNPREVENTED |
| 27 | Mandatory Control 제거 | 🔴실재 | Mandatory Control lock 개념 0 → 제거를 막을 대상 부재 | CRITICAL_UNPREVENTED |
| 28 | Decision Actor 불일치 | 🔴실재 | Snapshot 부재(#19)로 Actor↔Snapshot 대조 불가 → 불일치 탐지 0 | CRITICAL_UNPREVENTED |
| 29 | Drift 미처리 | ⚪미구현 | Drift(§53)·Reconciliation(§56) ABSENT → 탐지 계층 없음 | ABSENT |
| 30 | 하드코딩/Email/Role Name Assignee | 🔴실재 | 배정 대상이 canonical binding 아닌 문자열/등급(`team_role` flat 3값·`UserAuth.php:156-157`) 로 파생 | CRITICAL_UNPREVENTED |

**전사 30항.** 커버리지 = **`VALIDATED_LEGACY` 0** · `CRITICAL_UNPREVENTED` 16(#4·6·8·9·10·14·16·17·18·19·20·21·24·25·26·27·28·30 중 실재) · `BLOCKED_PREREQUISITE` 2(#5·13) · `PARTIAL` 1(#23) · `ABSENT` 나머지.

> 🔴 **커버 0. 현 상태에서 대부분 gap 은 미방지(Critical)** — 승인 자체는 flat 하게 성립하나(`AdminGrowth.php:142`·`Catalog.php:2383-2407`·`Mapping.php:267-271`) 자격(#4)·주체상태(#8)·금액(#10)·중복(#17)·History(#18)·Snapshot(#19)·Reason(#21)·SoD/CoI(#26)·Actor 일치(#28)·문자열 Assignee(#30) 를 검증하는 통제가 **통째로 없다**. 선행 4축이 부재한 채 배정을 성립시키면 이 16건이 그대로 구조적 재현된다.

## 2. 규칙

- 🔴 **선행 4축(Approval Chain·Authority·Org·SoD)이 선행 신설되지 않으면 Critical Gap 은 닫히지 않는다** — Assignment 엔진만 먼저 세우면 자격·권한·시점 검증축이 여전히 비어 gap 이 그대로 재유입된다. 본 EPIC 은 **선행 축 신설 후 별도 세션**이 정직한 순서다.
- 🔴 **flat 승인의 미방지 gap(#4·#17·#18·#19·#21·#26·#28)을 "실 결함" 으로 등재하라** — 문서화가 아니라 코드 수정 대상(단 본 세션 코드변경 0 · Golden+verify+배포승인 별도).
- 🔴 **History 삭제(#18)/과거 재작성(#20)의 정면 반례 `AgencyPortal.php:381,414-427` in-place 소거를 재사용 금지** — Assignment History 는 append-only·불변으로 신설. 무결성은 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 확장(🔴 `menu_audit_log.hash_chain` 인용 금지·[[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **Stale Lock(#16)은 Fencing Token 신설로만** — 현행 `omni_outbox`(`Omnichannel.php:425-448`)·`catalog_writeback_job`(`Catalog.php:1721-1731`) 는 fencing 없는 CAS/SKIP LOCKED 이므로 오래된 프로세스 덮어쓰기를 못 막는다. Lock(§44) 에 fencing token 필수.
- 🔴 **문자열 Assignee(#30) 승격 시 `team_role`/`parent_user_id`(`UserAuth.php:156-157,1225-1227`)를 Assignee 소스로 재사용 금지** — 의미 변경이 tenant 해석 전역을 붕괴시킨 선례([[reference_platform_growth_actas_tenant_hijack]]). Assignee 는 canonical binding 으로만.
- 🔴 **무후퇴** — `catalog_writeback_job`·`omni_outbox`·`pm_task_assignees`·`admin_growth_approval`·agency 접근승인은 실존 기능이므로 Critical Gap 봉쇄 과정에서 삭제·재구현 금지(§70).

관련: [[DSAR_APPROVAL_ASSIGNMENT_STATIC_LINT]] · [[DSAR_APPROVAL_ASSIGNMENT_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
