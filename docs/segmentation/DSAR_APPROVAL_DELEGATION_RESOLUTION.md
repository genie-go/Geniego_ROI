# DSAR — Approval Delegation Resolution (§30)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §30 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 결과: [DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md](DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=30` → **§30 = 44**(줄범위 1388-1440 · 불릿 44 · 번호 0). 분할 = **필수필드 44**(하위 ENUM 없음 · PK/승인 참조 8 + 참여자/위임 주체 3 + Delegation 참조 4 + Authority 참조 3 + 해소 컨텍스트 7 + 금액/통화 4 + Authority Resolution 2 + 귀속/결과 12 + 해시/시각/상태/증거 4 · 재검 44).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_RESOLUTION` 엔티티 | `delegation_resolution`·`redelegation`·`delegate_id` 복합어 grep **0** — **Delegation 해소(Resolution) 파이프라인 개념 전무**(ⓑ §0·§1) | `NOT_APPLICABLE`(부재→신설) |
| 선행 Approval/Chain Resolution | 🔴 **§3.1 Approval Foundation(Request/Case/Item/Requirement/Chain/Chain Resolution/Level) 전량 ABSINT**(ⓑ §3·5-3-2/5-3-3-3 커버 0.00%) — 해소가 올라앉을 승인·체인 컨텍스트 자체 부재 | `BLOCKED_PREREQUISITE`(Approval·Chain 선행 부재) |
| 선행 Authority Resolution | 🔴 **§3.2 Authority Foundation(Registry/Matrix/Binding/Resolution/Snapshot) 전면 부재**(5-3-3-4 결론·`authority_matrix`/`amount_band` grep 0) — 이양할 권한 단위·원본 Authority 해소 미정의(ⓑ §3.2) | `BLOCKED_PREREQUISITE`(Authority 선행 부재) |
| Subject(주체) 참조 | 인접 = `app_user`(RBAC 주체·`team_role` flat enum) — Canonical Subject Registry/Employment/Position 부재로 **느슨한 사용자 행**만 존재(ⓑ §3.3) | `LEGACY_ADAPTER`(app_user·Subject Registry 아님) |
| winning/conflict/cycle/depth/effective 산출 | 🔴 복수 위임 중 승자 선정·충돌·순환·깊이·유효 해소 로직 **grep 0** — Delegation 개념 부재로 산출기 없음(ⓑ §2.4 인접 cycle 검출은 PM/메뉴 도메인·KEEP_SEPARATE) | `ABSENT`(해소 산출기 부재) |

★**Resolution 엔티티와 그 4대 선행(Approval·Chain·Authority·Delegation Definition)이 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산"을 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 44종**(필수 필드 44 · 하위 ENUM 없음)

### 필수 필드 (44)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_resolution_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_request_id | 🔴 Approval Request 엔티티 부재(§3.1·ⓑ §3) → FK 대상 없음 | `BLOCKED_PREREQUISITE` |
| 3 | approval_request_version_id | Approval Request Version 부재 → 참조 불가 | `BLOCKED_PREREQUISITE` |
| 4 | approval_case_id | Approval Case 부재(단발 승인 플래그 3종만·ⓑ §3.1) | `BLOCKED_PREREQUISITE` |
| 5 | approval_item_id | Approval Item 부재 | `BLOCKED_PREREQUISITE` |
| 6 | approval_requirement_id | Approval Requirement 부재 | `BLOCKED_PREREQUISITE` |
| 7 | approval_chain_resolution_id | 🔴 Approval Chain·Chain Resolution 부재(5-3-3-3 커버 0.00%) → 해소 컨텍스트 없음 | `BLOCKED_PREREQUISITE` |
| 8 | approval_chain_resolution_level_id | Chain Resolution Level 부재 | `BLOCKED_PREREQUISITE` |
| 9 | original participant subject id | 🔴 원 참여자는 Chain Resolution 산출물 — Chain 부재로 산출 불가(주체 저장은 app_user·ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 10 | delegator subject id | 인접 = `app_user`(RBAC 주체) — Delegator 관계 엔티티는 부재하나 주체 저장계층은 느슨히 실재(ⓑ §3.3) | `LEGACY_ADAPTER` |
| 11 | delegate subject id | 인접 = `app_user`(RBAC 주체) — Delegate 관계 엔티티 부재·주체 저장만 실재 | `LEGACY_ADAPTER` |
| 12 | delegation definition id | Delegation Definition(§9) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 13 | delegation version id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 14 | delegation type | Delegation Type(§8) 엔티티 부재 → 타입 참조 없음 | `NOT_APPLICABLE` |
| 15 | delegation priority | 🔴 우선순위 해소 로직 부재(§32 전량 NOT_APPLICABLE) → 우선순위 필드 산출 없음 | `NOT_APPLICABLE` |
| 16 | authority definition id | 🔴 Approval Authority 전면 부재(5-3-3-4·`authority_matrix` grep 0) → 권한 정의 참조 없음 | `BLOCKED_PREREQUISITE` |
| 17 | authority version id | Authority Version 부재 | `BLOCKED_PREREQUISITE` |
| 18 | matrix entry id | Authority Matrix Entry 부재(§3.2) | `BLOCKED_PREREQUISITE` |
| 19 | action | 🔴 해소 대상 Action 은 Approval Item/Requirement 산출 — 승인 파이프라인 부재로 미정의(인접 `acl_permission` action 은 RBAC·승인 Action 아님) | `BLOCKED_PREREQUISITE` |
| 20 | resource type | 해소 대상 리소스는 Approval Request 컨텍스트 — 부재 | `BLOCKED_PREREQUISITE` |
| 21 | resource id | 상동 — 리소스 인스턴스 참조 불가 | `BLOCKED_PREREQUISITE` |
| 22 | organization id | 🔴 Organization Unit/Hierarchy 엔티티 부재(5-3-3-1)·Manager Resolver ABSENT → 조직 컨텍스트 없음 | `BLOCKED_PREREQUISITE` |
| 23 | legal entity id | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0)·회사프로필 단일 문자열만 | `BLOCKED_PREREQUISITE` |
| 24 | region | 해소 대상 지역은 Approval 컨텍스트 산출 — 부재(인접 `Geo` IP→ISO 는 Authority 지리 스코프 아님) | `BLOCKED_PREREQUISITE` |
| 25 | country | 상동 — 국가 컨텍스트 산출 불가 | `BLOCKED_PREREQUISITE` |
| 26 | original amount | 🔴 유일 금액조건 = `HIGH_VALUE_KRW = 5000000.0` 상수(`Catalog.php:1016`·boolean 게이트 `:1103`) — 금액축 저장계층 없음(ⓑ §18) | `LEGACY_ADAPTER` |
| 27 | original currency | 통화 스코프 0 · 환율 저장계층 부재(`Connectors.php:1790`·ⓑ §4) | `ABSENT` |
| 28 | delegated ceiling | 🔴 원본 Authority Ceiling 부재(§3.2) → 위임 상한 산출·검증 불가(§18 동일) | `BLOCKED_PREREQUISITE` |
| 29 | delegated currency scope | Currency Binding(§19) 도메인 부재 → 위임 통화 스코프 없음 | `ABSENT` |
| 30 | original authority resolution | 🔴 Approval Authority Resolution 부재(5-3-3-4) → 원본 권한 해소 참조 불가 | `BLOCKED_PREREQUISITE` |
| 31 | delegate own authority resolution | Delegate 자신의 Authority Resolution 도 동일 부재 | `BLOCKED_PREREQUISITE` |
| 32 | utilization attribution | Delegator/Delegate 사용량 귀속 계층 0(§18 동일·"누구의 Utilization" 답할 저장계층 부재) | `ABSENT` |
| 33 | acceptance result | Delegation Acceptance(§23) 엔티티 부재 → 수락 결과 없음 | `ABSENT` |
| 34 | approval result | Delegation Approval(§24) 부재 → 위임 승인 결과 없음 | `ABSENT` |
| 35 | eligibility result | Delegation Eligibility Profile(§25) 부재 → 적격 결과 없음 | `ABSENT` |
| 36 | conflict result | 🔴 Delegation Conflict(§34) 산출기 grep 0 → 충돌 결과 없음 | `ABSENT` |
| 37 | cycle result | 🔴 위임 Cycle 검출 부재(인접 PM/메뉴 cycle 은 도메인 상이·KEEP_SEPARATE·ⓑ §2.4) | `ABSENT` |
| 38 | depth result | 🔴 재위임 Depth Governance(§39) 부재 → 깊이 결과 없음 | `ABSENT` |
| 39 | effective result | 유효 해소 결과 산출 로직 0(§31 result enum 미구동) | `ABSENT` |
| 40 | winning delegation | 🔴 복수 위임 승자 선정 로직 0(§32 우선순위·§33 특이성 미구동) | `ABSENT` |
| 41 | resolution hash | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| 42 | resolved_at | Resolution 엔진 부재 → 해소 시각 산출 없음 | `ABSENT` |
| 43 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 44 | evidence | 정본 = `SecurityAudit::verify():56-68` · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 44 / 44 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `BLOCKED_PREREQUISITE` 21 · `ABSENT` 12 · `LEGACY_ADAPTER` 6 · `NOT_APPLICABLE` 5.

> 🔴 **커버 0.** Resolution 엔티티와 4대 선행(Approval·Chain·Authority·Delegation Definition)이 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `BLOCKED_PREREQUISITE` 21건은 **Approval·Chain·Authority Foundation 신설이 선행**돼야 존재한다(승인/체인/권한 참조·해소 컨텍스트·원본 Authority 해소·위임 상한). `LEGACY_ADAPTER` 6건(delegator/delegate subject id·original amount·resolution hash·status·evidence)은 **확장 대상 인접 자산**(app_user·HIGH_VALUE_KRW 상수·SecurityAudit·상태전이)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Resolution 은 신설이나, 하위 인접 자산을 재구현하지 마라** — resolution hash/evidence 는 `SecurityAudit::verify()` 확장(`menu_audit_log.hash_chain` 인용 금지·검증 불가 장식·[[reference_menu_audit_log_not_tamper_evident]]) · subject 참조는 `app_user` 확장(Subject Registry 신설 시 별 엔티티 난립 금지) · cycle/depth 검출은 `PM/Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555` **알고리즘만 참조**하고 도메인 혼용 금지(PM 태스크/메뉴 ≠ Delegation Chain·ⓑ §2.4). **중복 엔진 금지.**
- 🔴 **`BLOCKED_PREREQUISITE` 21필드를 "구현 예정"으로 낙관 표기 금지** — 해소는 Approval Request/Case/Item(§3.1)·Chain Resolution(5-3-3-3 커버 0.00%)·Authority Resolution(5-3-3-4 전면 부재) **3중 선행**이 있어야 성립한다. 이 선행이 없는 상태에서 Resolution 필드를 채우면 §65 "만료·정지된 위임인데 Decision 시점 승인 성공" gap 을 구조적으로 유발한다. **선행 없는 해소는 존재하지 않는다**(우연한 부재≠준수·§58 ⑦).
- 🔴 **`winning delegation`/`conflict`/`cycle`/`depth`/`effective result` 를 "충돌 없음(준수)"으로 오독 금지** — 산출기 자체가 부재(`ABSENT`)라 "충돌이 없는" 게 아니라 "충돌을 검출할 로직이 없는" 것이다. §32 우선순위·§33 특이성 해소가 미구동인 상태에서 복수 위임을 무검증 채택하면 자기위임/순환/과깊이 위임이 통과한다. Resolution 신설 시 §32/§33 을 반드시 동반 구동하라.
- 🔴 **`original authority resolution`/`delegate own authority resolution`/`delegated ceiling` 은 Authority Foundation 없이는 산출 불가** — 원문 §5.2 "Delegate 는 Delegator 의 원본 Scope/Action/Amount/Currency/Period 범위 안에서만" 을 집행하려면 원본 Authority 해소가 선행돼야 한다. Authority 부재 상태에서 위임 상한을 임의 산출하면 §5.2 위반(원본 초과 위임)을 탐지할 수 없다.
