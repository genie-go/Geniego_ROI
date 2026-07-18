# DSAR — Approval Delegation Runtime Guards (§53)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §53(2163-2208) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §2·§3·§5 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=53` → **§1 항목 39**(불릿 39·번호 0). 육안 금지·측정기 산출.

## 0. 판정 원리 — "차단할 대상이 실행시점에 있는가"

§53은 위임 **집행(runtime) 직전에 차단하라**는 39개 가드다. §52 static lint(저장 시점)와 달리, 여기서는 **이미 실재하는 런타임 통제(tenant 격리·해시검증)를 재사용**할 수 있는 항목이 갈린다. 그러나 이 레포에는 **Delegation 도메인이 통째로 부재**하다(ⓑ §1) → 대부분 차단 대상 자체가 없다.

| 판정 | 의미 |
|---|---|
| `LEGACY_ADAPTER` | 인접 런타임 통제가 실재하여 **Delegation 경로에서 확장·연결하면 되는** 가드(재구현 금지) — Tenant 격리·SecurityAudit 해시 |
| `BLOCKED_PREREQUISITE` | 차단 판정이 Approval Authority Foundation(§3.2)에 의존 · Authority 신설이 선행 |
| `ABSENT` | 차단 로직이 통째로 없음 · 단 인접 데이터축(주체 identity·감사)은 존재 |
| `NOT_APPLICABLE` | 차단 대상 Delegation 서브엔티티·서브상태(Period/Acceptance/Approval/Conflict/Resolution/Scope-mismatch)가 부재 |

★**`VALIDATED_LEGACY` 미사용**(cover 0). `LEGACY_ADAPTER` 2건은 **확장 대상 인접 가드**(tenant 격리·해시검증)이지 커버가 아니다.

★**Authority 블록(5-3-3-4 §67)과의 차이**: Authority는 인접 마케팅/FX/acl 자산을 승인 가드에 매핑해 `LEGACY_ADAPTER`가 11건이었으나, Delegation은 **위임 메커니즘이 완전 부재**하고 인접 자산(acl 위임상한·AgencyPortal·Geo·HTTP 메서드 축)이 전부 **KEEP_SEPARATE(별 도메인)**라 Delegation 가드로 재사용할 수 없다. 재사용 가능한 것은 tenant 격리·SecurityAudit 해시 2건뿐이다.

## 1. 원문 전사 + 판정 — **원문 39종**(§53 2167-2205)

| # | 원문 runtime guard(verbatim) | 현행 대조(ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Delegation Registry Not Found | Delegation Registry 엔티티 부재(ⓑ §1) · 조회 대상 없음 — 신설 시 발동 가드 | `ABSENT` |
| 2 | Delegation Definition Not Found | Delegation Definition 엔티티 부재(ⓑ §1) | `ABSENT` |
| 3 | Delegation Version Inactive | Delegation Version·활성/비활성 상태전이 0(ⓑ §2.1) | `ABSENT` |
| 4 | Delegator Inactive | Delegator binding 부재이나 Subject(user) identity 실재 → 비활성 판정이 겨눌 주체 존재(ⓑ §2.1) | `ABSENT` |
| 5 | Delegate Inactive | 동상 · Delegate binding 부재이나 대상 주체 실재(ⓑ §2.1) | `ABSENT` |
| 6 | Original Authority Missing | Approval Authority 개념 부재 → 존재확인할 Original Authority 미정의(ⓑ §3.2) · Authority Foundation 선행 필요 | `BLOCKED_PREREQUISITE` |
| 7 | Original Authority Inactive | 동상 · Authority Resolution·활성상태 부재(ⓑ §3.2) · Authority Foundation 선행 필요 | `BLOCKED_PREREQUISITE` |
| 8 | Delegation Not Started | Delegation Period(§20)·활성시점 부재(ⓑ §3.2) — 시작상태 판정 대상 없음 | `NOT_APPLICABLE` |
| 9 | Delegation Expired | Delegation Period·만료상태 부재 · `valid_to` grep 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 10 | Delegation Suspended | Delegation Suspension(§30) 서브상태 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 11 | Delegation Revoked | Delegation Revocation(§31) 서브상태 부재 · `revoke`=토큰/자격 폐기 오탐(ⓑ §0) | `NOT_APPLICABLE` |
| 12 | Acceptance Missing | Delegation Acceptance(§23) 서브엔티티 부재(ⓑ §2.1) | `NOT_APPLICABLE` |
| 13 | Approval Missing | Delegation Approval(§24) 서브엔티티 부재(ⓑ §3.1) | `NOT_APPLICABLE` |
| 14 | Tenant Mismatch | **REAL** — `index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기 · `:593` auth_tenant · 단 strict 기본 OFF(`:585`)·SPA/세션 미도달(ⓑ §3.4·§5) → Delegation 경로에서 확장 대상 | `LEGACY_ADAPTER` |
| 15 | Legal Entity Mismatch | Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) — 법인 경계 대조 대상 부재 | `NOT_APPLICABLE` |
| 16 | Organization Mismatch | Org Unit/Hierarchy 부재·`parent_user_id`가 최상위 owner로 붕괴(ⓑ §3.3) — 조직 위임 스코프 부재 | `NOT_APPLICABLE` |
| 17 | Geography Mismatch | Delegation Geographic Binding 부재 · `Geo`(IP→ISO)·TikTok country_code는 **별 도메인**(위임 지리 스코프 아님·KEEP_SEPARATE) | `NOT_APPLICABLE` |
| 18 | Resource Mismatch | Delegation Resource Binding 부재 · `acl_permission` scopeSql은 데이터-행 필터(별 도메인·장식·ⓑ §2.1) | `NOT_APPLICABLE` |
| 19 | Action Mismatch | Delegation Action Binding 부재 · HTTP 메서드 축(`index.php:568`)은 위임 action 스코프 아님 | `NOT_APPLICABLE` |
| 20 | Authority Domain Mismatch | Approval Authority Domain(§3.2) 부재 → 도메인 대조 대상 없음, Authority Foundation 선행 필요 | `NOT_APPLICABLE` |
| 21 | Authority Type Mismatch | Approval Authority Type(§3.2) 부재(ⓑ §3.2) | `NOT_APPLICABLE` |
| 22 | Amount Above Delegated Ceiling | Delegated Ceiling·Original Authority Ceiling 부재(HIGH_VALUE_KRW boolean만·`Catalog.php:1016`·ⓑ §3.2) — 초과 비교 기준 없음 | `NOT_APPLICABLE` |
| 23 | Currency Mismatch | Delegation Currency Binding·`currency_scope` 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 24 | Period Limit Exhausted | Delegation Period Limit·utilization 부재(ⓑ §3.2) · `AutoCampaign` 예산 페이싱은 마케팅 도메인(승인/위임 아님) | `NOT_APPLICABLE` |
| 25 | Self Delegation | Delegator→Delegate 관계 부재 → 자기위임 무발동(ⓑ §5) · 신설 시 활성화 게이트 필수 차단(§5.9) | `ABSENT` |
| 26 | Re-delegation Blocked | 재위임 경로 grep 0(ⓑ §2.1) → 차단할 재위임 무발동 · 신설 시 기본금지(§5.7) | `ABSENT` |
| 27 | Maximum Depth Exceeded | 재위임 체인 부재 → 깊이 초과 무발동(ⓑ §5) · 순환검출 `PM/Dependencies:79-100` depth cap은 PM 도메인(참조만·KEEP_SEPARATE) | `ABSENT` |
| 28 | Delegation Cycle | 위임 간선 부재 → 순환 무발동(ⓑ §5·§2.4) · 신설 시 활성화 선차단(`BLOCKED_CYCLE_RISK`) | `ABSENT` |
| 29 | Security Blocked | Security Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님·ⓑ §3.4) — 위임 보안차단 개념 부재(인증 미들웨어는 write 게이트이지 위임 보안정지 아님) | `ABSENT` |
| 30 | SoD Failed | Segregation-of-Duties Hook grep 0(ⓑ §3.4) — 무결성 게이트 부재 | `ABSENT` |
| 31 | Conflict-of-interest | Conflict-of-interest Hook grep 0(ⓑ §3.4) | `ABSENT` |
| 32 | Unresolved Conflict | Delegation Conflict(§34)·복수 Delegation 부재 → 충돌해소 무발동(ⓑ §1) | `NOT_APPLICABLE` |
| 33 | Snapshot Missing | Delegation Snapshot 엔티티 부재(ⓑ §2.5) — 저장 자체 없음 · 인접 불변정본=`SecurityAudit::verify()`(확장 대상이나 미적용) | `ABSENT` |
| 34 | Snapshot Hash Invalid | **불변 정본=`SecurityAudit::verify():56-68`** 해시 재계산+`hash_equals`+prev 교차(ⓑ §2.5) · 단 Delegation snapshot에 미적용 → 확장 대상 · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| 35 | Delegation Changed Since Claim | Claim(EPIC 06-A-02 범위·본 블록 미구현)·Delegation Version 추적 부재(ⓑ §2.1) — 변경 대조 대상 없음 | `NOT_APPLICABLE` |
| 36 | Task Assignee Drift | Delegation Candidate/Resolution·Task Assignment(EPIC 06-A-02) 부재(ⓑ §4) — assignee 대조 대상 없음 | `NOT_APPLICABLE` |
| 37 | Decision Actor Drift | Decision actor는 일부 경로 저장(`Mapping:285`)되나 **Delegation Snapshot 대조 기준 부재**(#33·ⓑ §2.5) → drift 판정 불가 | `ABSENT` |
| 38 | Critical Reconciliation Drift | Delegation Reconciliation(§43) 부재 · Tenant 마스터 부재로 대사 기준 자체 없음(ⓑ §3.4·§4) | `NOT_APPLICABLE` |
| 39 | Kill Switch 활성 | 위임 레벨 kill switch 부재 · `agent_mode` 이진게이트(`AdAdapters:42-49`)는 자동집행 억제용(위임 kill 아님·별 스코프·ⓑ §1) | `ABSENT` |

**실측 개수: 39 / 39 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(#14·34) · `BLOCKED_PREREQUISITE` 2(#6·7) · `ABSENT` 15(#1·2·3·4·5·25·26·27·28·29·30·31·33·37·39) · `NOT_APPLICABLE` 20(#8·9·10·11·12·13·15·16·17·18·19·20·21·22·23·24·32·35·36·38).

> 🔴 **커버 0.** `LEGACY_ADAPTER` 2건(#14 Tenant Mismatch·#34 Snapshot Hash Invalid)은 **확장 대상 인접 가드**(tenant 격리·SecurityAudit 해시검증)이지 "Delegation 가드가 이미 있다"가 아니다. `ABSENT` 15건은 Delegation 통제 로직이 통째로 없되 주체(user)·감사 데이터축은 존재하는 경우(엔티티 신설 시 발동)이고, `NOT_APPLICABLE` 20건은 차단 대상 Delegation 서브엔티티/서브상태(Period/Acceptance/Approval/Conflict/Scope-mismatch)가 부재하다. `BLOCKED_PREREQUISITE` 2건(#6·7)은 Approval Authority Foundation(§3.2) 신설이 선행돼야 판정 가능하다.

## 2. 규칙

- 🔴 **2개 `LEGACY_ADAPTER`는 "재사용", 15개 `ABSENT`는 "신설 발동", 20개 `NOT_APPLICABLE`은 "서브엔티티 후 발동", 2개 `BLOCKED_PREREQUISITE`는 "Authority 선행 후"** — 이 4분류가 §53 착수 순서다. 인접 가드를 새로 짜지 마라(중복 엔진 금지).
- 🔴 **Tenant Mismatch(#14)를 Delegation 경로에서 strict 기본 ON으로** — `index.php:600` 런타임 덮어쓰기는 신뢰하되 strict fail-closed(`:585` opt-in)를 위임 집행 직전 **기본 ON**으로. SPA/세션 경로가 미들웨어를 우회하므로(ⓑ §3.4·§5) 위임 핸들러 내부에서 tenant 재검증(§5.4 Cross-Tenant Delegation 금지 강제).
- 🔴 **Snapshot Hash Invalid(#34)는 `SecurityAudit::verify()` 확장** — 새 해시엔진 금지. tenant 포함 해시+prev 교차 정본을 Delegation Snapshot에 연결. `menu_audit_log.hash_chain`은 검증 불가능한 장식 → **인용 금지**([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **Self/Cycle/Depth(#25·27·28)는 활성화 게이트에서 선차단** — 활성화 이후 감지가 아니라 활성화 직전 차단(`BLOCKED_CYCLE_RISK`). 순환검출은 `PM/Dependencies:79-100`(DFS)·`AdminMenu::wouldCycle:540-555`(조상 walk) 골격을 **참조**하되 노드=Subject·간선=Delegator→Delegate로 재해석하고 tenant·legal entity·authority 축을 추가하라(재구현 금지).
- 🔴 **Original Authority(#6·7)를 Authority Foundation 선행 후에만 가드** — Approval Authority Registry/Resolution(§3.2) 신설 전에는 "Original Authority Missing/Inactive"를 "통과"로 계산 금지(우연한 부재를 준수로 오계상 금지·`BLOCKED_PREREQUISITE`). §5.2("Delegation은 Original Authority를 초과할 수 없다") 집행은 Authority Resolution 실재가 전제다.
- 🔴 **Scope-mismatch 가드(#15~24)를 인접 자산으로 대체 착각 금지** — Geography(#17)·Resource(#18)·Action(#19)의 인접(Geo·acl scopeSql·HTTP 메서드)은 **전부 별 도메인(KEEP_SEPARATE)**이지 위임 스코프가 아니다(ⓑ §2.1). Authority 블록처럼 `LEGACY_ADAPTER`로 매핑하지 말고 Delegation Binding 신설 후 `NOT_APPLICABLE`→발동으로 전환하라.
- 🔴 **SoD/CoI/Security Blocked/Kill Switch(#29·30·31·39)는 Hook·통제 부재가 근본원인** — Security Suspension은 로그인 스로틀(권한정지 아님·ⓑ §3.4)이고 `agent_mode`는 자동집행 억제(위임 kill 아님)다. "부분 있음"으로 오표기 금지하고 Delegation Eligibility(§25)·활성화 게이트에 1급으로 신설하라.
