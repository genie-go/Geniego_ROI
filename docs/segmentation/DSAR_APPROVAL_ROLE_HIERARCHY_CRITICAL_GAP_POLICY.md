# DSAR — Approval Role Hierarchy Critical Gap Policy (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Critical Gap Policy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§67 Critical Gap 후보는 Role Hierarchy Version 부재부터 Graph Tamper 미탐지까지 26개 High/Critical 위험 항목을 열거한다. 본 문서는 각 항목을 이 저장소 실측과 대조해 **두 부류로 분류**한다.

| 부류 | 의미 | 판정 어휘 |
|---|---|---|
| 🔴 **실재(순신규 High)** | Canonical Role Graph 계약 자체가 부재해 위험을 방지할 통제가 없음 → 지금 열려있는 구조적 위험 | `HIGH_UNPREVENTED` |
| ⚪ **정직 부재(해당없음)** | 대상 substrate가 레포에 전무하여 위험을 유발할 코드조차 없음 | `NOT_APPLICABLE_ABSENT` |
| ★ **부수 발견 실결함(수정 아님·인용만)** | 2 Explore 스레드 교차확인한 실재 결함 — DUPLICATE_AUDIT §D-8 원문 인용, 이번 차수 수정하지 않음 | `LIVE_DEFECT_REFERENCE` |

## 2. 열거 / 항목 (§67 Critical Gap 후보 전사 + 판정)

| # | §67 gap 후보 | 부류 | 현행 대조 (substrate file:line) | 판정 |
|---|---|---|---|---|
| 1 | Role Hierarchy Version 없음 | 🔴순신규 | Hierarchy Version 컬럼/개념 전무 | HIGH_UNPREVENTED |
| 2 | Composite Role Version 없음 | 🔴순신규 | Composite 자체 부재(GROUND_TRUTH §4) | HIGH_UNPREVENTED |
| 3 | Parent ID만 있고 Edge 의미 없음 | 🔴실재 | `menu_tree.parent_id`(`AdminMenu.php:108,117,268`)·`parent_user_id`(`UserAuth.php:176,316`)가 정확히 이 패턴(Edge Type/Direction 없는 순수 parent id) — **단 대상이 Role이 아니므로 Role Hierarchy Gap 자체는 아니고 오용 경계**(§6.1) | HIGH_UNPREVENTED(오용 경계 형태로) |
| 4 | Circular Role Hierarchy | 🔴순신규 | Role 대상 Cycle Detection 부재. 근접 알고리즘은 메뉴(`AdminMenu.php:540-555`) 대상뿐 | HIGH_UNPREVENTED |
| 5 | Circular Composite | 🔴순신규 | Composite 자체 부재 | HIGH_UNPREVENTED |
| 6 | Cross-Tenant Role Edge | 🔴순신규 | Role Edge 개념 부재. `parent_user_id`는 교차테넌트 차단이 계정 도메인에서 실재(`UserAuth.php:423-426`)하나 Role Edge와 무관 | HIGH_UNPREVENTED |
| 7 | Retired Role Active Graph 포함 | 🔴순신규 | Role Lifecycle/Graph 부재 | HIGH_UNPREVENTED |
| 8 | Suspended Role Runtime 상속 | 🔴순신규 | 동일 | HIGH_UNPREVENTED |
| 9 | Deprecated Role 신규 Component | 🔴순신규 | Composite/Component 부재 | HIGH_UNPREVENTED |
| 10 | Permission Version 미고정 | 🔴선행 | Part 2 Permission Engine 미구현 | BLOCKED_PREREQUISITE |
| 11 | Explicit Deny 상속 중 소실 | 🔴순신규 | Deny 전파 계약 부재 | HIGH_UNPREVENTED |
| 12 | Scope Union 자동 확대 | 🔴순신규 | Scope Aggregation 계약 부재 | HIGH_UNPREVENTED |
| 13 | Human·Machine Role 혼합 | 🔴순신규 | Actor Eligibility 계약 부재 | HIGH_UNPREVENTED |
| 14 | Approval·Requester 독성 조합 | 🔴순신규 | Approval Authority(Part 5) 개념 부재(Part 3-1 GROUND_TRUTH 정합) | HIGH_UNPREVENTED |
| 15 | Composite Risk 하향 | 🔴순신규 | Composite Risk 계약 부재 | HIGH_UNPREVENTED |
| 16 | Diamond Ambiguity | 🔴순신규 | Diamond Inheritance 탐지 부재 | HIGH_UNPREVENTED |
| 17 | Multiple Path Scope/Deny 불일치 | 🔴순신규 | Path Evidence 부재 | HIGH_UNPREVENTED |
| 18 | Graph Snapshot 없음 | 🔴순신규 | Role Graph Snapshot 부재. (근접 비-Role 패턴: `menu_defaults` 스냅샷·`AdminMenu.php:119-122,295-311,583-589`) | HIGH_UNPREVENTED |
| 19 | Path Evidence 없음 | 🔴순신규 | 부재 | HIGH_UNPREVENTED |
| 20 | Graph Digest 없음 | 🔴순신규 | 부재 | HIGH_UNPREVENTED |
| 21 | Cache Key에 Graph Version 없음 | 🔴순신규 | Role Graph Cache 자체 부재 | HIGH_UNPREVENTED |
| 22 | Hierarchy 변경 후 Cache 미무효화 | 🔴순신규 | 동일 | HIGH_UNPREVENTED |
| 23 | Legacy IAM Composite 자동 허용 | ⚪정직 부재 | GROUND_TRUTH §4 "IAM/Keycloak/LDAP/AD nested group adapter = 전무" — 자동 허용할 Legacy IAM Composite 자체가 없음 | NOT_APPLICABLE_ABSENT |
| 24 | **Organization Hierarchy를 Role Hierarchy로 사용** | 🔴실재 위험(오용 경계) | `parent_user_id`(`UserAuth.php:176,316,423-426`)·`menu_tree.parent_id`(`AdminMenu.php:108,117,268`)가 정확히 이 위험의 실제 substrate(ADR D-1·§67 Critical Gap 후보 원문과 1:1 대응) — **아직 Role Hierarchy로 오용되지 않았으나 오용 방지 통제가 없다는 의미의 HIGH** | HIGH_UNPREVENTED |
| 25 | 고객 설정으로 Cycle Guard 제거 | 🔴순신규(§6.16) | Mandatory Control lock 개념 부재 | HIGH_UNPREVENTED |
| 26 | Runtime Error 후 Allow | 🔴순신규 | Role Graph Runtime 자체 부재 | HIGH_UNPREVENTED |
| 27 | Graph Tamper 미탐지 | 🔴순신규 | Role Graph Evidence 부재. 감사 해시체인 오인용 경계는 EXISTING_IMPLEMENTATION §5 "menu_audit_log — tamper-evident 아님"(`AdminMenu.php:123-131,169-219`) 참조 | HIGH_UNPREVENTED |

**전사 27항.** 커버리지 = `HIGH_UNPREVENTED` 대다수(순신규+오용 경계 실재) · `BLOCKED_PREREQUISITE` 1(#10) · `NOT_APPLICABLE_ABSENT` 1(#23 Legacy IAM Composite).

## 3. ★부수 발견 — 실 결함 2건 (DUPLICATE_AUDIT §D-8 인용 · 수정 아님)

- **AdminMenu `required_role` 쓰기측 ROLE_ENUM ↔ 읽기측 rank 데드락**: 쓰기 검증 `ROLE_ENUM['admin','super_admin','moderator']`(`AdminMenu.php:247,401`) vs 읽기 가시성 rank `['viewer'=>0..'admin'=>3]`(`AdminMenu.php:338,343-346`). `required_role='super_admin'|'moderator'` 저장 시 admin(rank3)조차 `$need=99`로 해당 메뉴 영구 비노출(논리 데드락). §67 항목 #3(Parent ID만 있고 Edge 의미 없음)·#24(Organization Hierarchy 오용)와 인접한 실사례이나 대상은 메뉴 도메인. **이번 문서 수정 대상 아님**(별도 fix 세션 승인 필요).
- **SSO group→role 부분 배선**: `roleForGroups`(`EnterpriseAuth.php:78-91`)는 SCIM(`:374-375`)에서만 groups를 실제로 받고, OIDC 콜백(`:240`)·SAML ACS(`:294`)는 groups 미전달로 `default_role` 폴백. §67 항목 #23(Legacy IAM Composite 자동 허용)과 인접하나 이 저장소엔 IAM Composite 자체가 없으므로 §23은 여전히 NOT_APPLICABLE_ABSENT. **이번 문서 수정 대상 아님**.

## 4. 설계 원칙

1. **두 부류 분리가 정직의 핵심** — `parent_user_id`/`menu_tree`가 "Role Hierarchy Gap"이 아니라 "Role Hierarchy로 오용될 위험이 있는 별개 도메인 substrate"임을 명확히 구분(#3·#24). 이 substrate들의 **부재(Role Graph 아님)를 결함으로 날조 금지**(ADR D-6).
2. Legacy IAM Composite(#23)는 대상 자체가 없으므로 `NOT_APPLICABLE_ABSENT` — "부재"를 "은폐된 위험"으로 과장하지 않는다.
3. 부수 발견 실결함 2건(§3)은 **인용만 하고 수정하지 않는다** — DUPLICATE_AUDIT §D-8 원문과 동일 판정 유지, 재플래그·재해석 금지.
4. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지, 289차 P1~P4(writeGuard·featurePlan·admin판정 SSOT) 재플래그 금지 — 본 Gap Policy가 이들을 새 Critical Gap으로 재등재하지 않는다.

## 5. Gap / BLOCKED_PREREQUISITE

27항 중 25항 `HIGH_UNPREVENTED`(순신규 또는 오용 경계 실재), 1항 `BLOCKED_PREREQUISITE`(#10 Permission Version·RP-002), 1항 `NOT_APPLICABLE_ABSENT`(#23 Legacy IAM Composite). 부수 실결함 2건은 인용 근거로만 등재하고 수정하지 않는다. 실 Gap 해소는 Role Graph 실 신설 + 선행 Permission Engine 실구현 이후 별도 승인세션(RP-002). NOT_CERTIFIED.
