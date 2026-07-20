# ADR — Dynamic Role Governance (ABAC + Rule Engine + Context-Aware RBAC) (EPIC 06-A-03-02-03-04 Part 3-5)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Permission Engine + Role Registry/Hierarchy/Assignment/Scoped + Decision Core 실 구현 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-20)
- **스펙**: EPIC 06-A-03-02-03-04 Part 3-5 — Dynamic Role Governance (사용자 제공 verbatim · [`docs/spec/EPIC_06A_PART3_5_DYNAMIC_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_5_DYNAMIC_ROLE_GOVERNANCE_SPEC.md))
- **선행 블록**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)(Part 3-4) · [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)(Part 3-3) · [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)(Part 3-2) · [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)(Part 3-1) · [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)(Part 2)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n279_full_audit]] · [[reference_platform_growth_actas_tenant_hijack]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 3-5 — Dynamic Role Governance(ABAC + Rule Engine + Context-Aware RBAC)**. Part 3-1~3-4(Role Registry/Hierarchy/Assignment/Scoped) 위에서, "사용자에게 항상 동일 Role을 부여하지 않고 현재 Context(상황)에 따라 Role을 자동 생성·활성·비활성"하는 **Rule Engine·ABAC·Runtime Role Evaluation·Session Role·PDP/PEP Foundation**을 정형화한다. Part 3-6 Service/System·3-7 Effective Resolution·3-12 PDP/PEP가 재사용할 Dynamic Resolution Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0).

★**능력 기반 전수조사(ⓑ·GROUND_TRUTH·2 Explore 스레드+firsthand)** 핵심 결론 — **Part 3-2(전건 순신규)에 가깝되 근접 substrate 소수 실재**:

- **★Dynamic Role 도메인 대부분 순신규(ABSENT)**: Dynamic/Runtime/Session/Conditional Role·RBAC Rule Engine·PDP/PEP·Policy Decision(Permit/Deny/Challenge/Escalate)·계산형 Runtime Risk = grep 0. team_role/api_key/admin_level은 전부 **정적(fixed) role**(context 재평가 없음).
- **★근접 substrate 3종(전부 dynamic role 엔진 아님)**: ① **ABAC=data_scope 9차원 행필터**(`TeamPermissions.php:236-322`·유일·단일목적 축소판) ② **Require MFA 로그인 게이트**(`UserAuth.php:929-1036,3719-3760`·3단계 정책·실재·단 role 활성 입력 아님·TeamPermissions에 mfa 참조 0) ③ MFA/session/risk/env 속성필드(존재하나 개별목적·role 결정 미연결·`auth_audit_log.risk`=정적 심각도 라벨 계산 아님).
- **★거버넌스 계층 완전 부재(ABSENT)**: Version/Snapshot/Digest/Evidence·Projection/Cache(effectiveScope 라이브 재계산·캐시0)·Drift/Revalidation/Reconciliation/Simulation·Runtime Guard/Static Lint 엔진 = grep 0.
- **★마케팅 automation KEEP_SEPARATE**: `RuleEngine.php`(channel_roas/sku_stock·alert/webhook/pause_channel/reorder)·Alerting·AutoCampaign·Decisioning·AnomalyDetection·FE PolicyTreeEditor = 명명(rule/drift/simulate)만 유사·대상 도메인(광고/재고/ML) 전혀 다름·RBAC Rule Engine 아님.
- **★무통합 정적 rank 4곳 산재(통합 PDP 부재)**: TeamPermissions(ABAC)·index.php RBAC(PEP 근접·이진)·PlanPolicy(구독 rank)·AdminMenu(내부 rank). 하드코딩 role/plan 비교 백엔드 15+FE 22개소 산재(Static Lint 대상·AdminMenu 데드락이 실버그 유발 증거).
- **★CONDITIONAL Component Rule Reference**: Part 3-2 enum명만 존재(`EPIC_06A_PART3_2_..._SPEC.md:331`)·코드 부재. ★이번 Part 3-5가 채울 정확한 빈자리.

## 2. 결정 (Decision)

### D-1. Canonical Dynamic Role Engine을 **제로 신설**하되 근접 substrate를 결정 입력으로 조립(Golden Rule). 마케팅 automation 오흡수 금지·중복 Rule Engine 신설 금지.

| 실존 | 분류 태그 | 결정 |
|---|---|---|
| **ABAC=data_scope** | **ABAC_SUBSTRATE(확장·결정입력)** | Attribute-based 결정의 최근접. Rule Engine attribute source로 편입(단일목적→범용). |
| **Require MFA 게이트** | **CONTEXT_ATTRIBUTE(확장·입력)** | Conditional Role(§13 Authentication) 입력·Runtime Policy(Require MFA §17). 로그인 게이트→role 활성 조건. |
| **MFA/session/risk/env 필드** | **ATTRIBUTE_SOURCE(입력)** | §4 Attribute Source substrate(존재하나 role 미연결→연결). risk는 정적 라벨→계산형 승격 별개. |
| **index.php RBAC** | **PEP_NEAR(확장)** | Policy Enforcement Point 근접(이진). Permit/Deny/Challenge/Escalate 다중결정 PDP 신설. |
| **정적 rank 4곳(TeamPermissions/index/PlanPolicy/AdminMenu)** | **CONSOLIDATION(단일 PDP 수렴)** | 무통합 rank를 단일 Policy Decision Point로. |
| **RuleEngine.php 등 마케팅** | **KEEP_SEPARATE(오흡수 금지)** | 광고/재고/ML 자동화. RBAC Rule Engine 아님. |
| **하드코딩 role/plan 비교 37+개소** | **STATIC_LINT_TARGET(봉인)** | no-literal-role-compare 대상. |
| **Dynamic Role/Rule Engine/PDP/Session Role** | **ABSENT(순신규)** | 제로 신설. |

### D-2. UNKNOWN은 Permit하지 않는다 (§9·핵심 안전 규율)

Rule Evaluation 출력 TRUE/FALSE/UNKNOWN/ERROR 중 **UNKNOWN·ERROR는 Permit 금지**(fail-closed). ★현행 effectiveScope fail-closed(DENY_SCOPE·`TeamPermissions.php:234`)가 이 철학의 근접 substrate. Dynamic Role은 이를 Rule Evaluation 전역으로 확장.

### D-3. Dynamic Role ≠ 정적 role · Context가 role을 결정 (§0·구현 시 강제)

현행 team_role/api_key/admin_level은 로그인 시 세션 스냅샷된 정적값(context 재평가 없음). Dynamic Role은 Runtime Context(session/device/network/time/auth/risk)를 Rule로 평가해 Session Role·Conditional Role을 활성/비활성. Session Role은 세션 종료 시 자동 삭제(§12).

### D-4. 마케팅 Rule Engine 오흡수 금지 (§6·정직 판정)

`RuleEngine.php`(범용 IF-THEN이나 대상=channel_roas/sku_stock)·Alerting·AutoCampaign·Decisioning·AnomalyDetection·PolicyTreeEditor는 **마케팅/운영 자동화**·RBAC Rule Engine 아님. Canonical Dynamic Role Rule Engine은 이들과 **별개 신설**(명칭 유사에 속지 않음).

### D-5. 구현 판정 = ABSENT/근접-substrate/BLOCKED_PREREQUISITE

- Dynamic Role Registry/Rule Engine/Runtime Evaluation/Session Role/PDP·PEP/Projection/Cache/Drift/Simulation = 순신규.
- 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core가 아직 설계(코드 0)라 Rule↔Permission/Scope version 결합·Dynamic Permission Projection = **BLOCKED_PREREQUISITE**.
- 실 엔진="Dynamic Role Engine 제로 신설 + ABAC(data_scope)·MFA 게이트·attribute 필드를 결정 입력으로 조립 + 정적 rank 4곳 단일 PDP 수렴". 이번 차수=설계 명세(코드 0).

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3-6+ 재사용)

- **Dynamic Role Registry/Definition/Version/Type**: Runtime/Session/Conditional/Attribute/Rule/Context Role. Immutable Version. Session Role=세션 스코프.
- **Rule Engine/Expression/Version/Evaluation**: Boolean/DSL/JSON Rule·Immutable Version·TRUE/FALSE/UNKNOWN/ERROR(UNKNOWN Permit 금지). Attribute Source=data_scope+MFA+session+risk+env(연결). 마케팅 RuleEngine 별개.
- **Runtime Context/Attribute Source/Policy Decision(PDP)/Enforcement(PEP)**: index.php RBAC를 PEP substrate로·Permit/Deny/Challenge/Escalate/Manual Review 다중결정 신설. effectiveScope fail-closed를 Rule Evaluation 안전 substrate로.
- **Dynamic Permission/Scope/Constraint Projection·Cache·Snapshot/Evidence/Digest·Drift/Revalidation/Reconciliation/Simulation**: 순신규. Version 기반 Cache(현행 라이브 재계산 승격).
- **Adapter(Part 3-2 Composite CONDITIONAL·Part 3-3 Assignment·3-6 Service/System·3-7 Effective·3-12 PDP/PEP)**: Conditional Component Rule Reference Interface(Part 3-2 enum명이 참조할 빈자리)·Dynamic Resolution Contract 제공.
- **경계 보존**: 마케팅 RuleEngine/Alerting/AutoCampaign/Decisioning/AnomalyDetection은 Dynamic Role 밖(KEEP_SEPARATE).

## 4. 대안 (Considered)

- **A. 지금 Dynamic Role Engine(Rule Engine·PDP·Runtime Evaluation) 구현** — 기각. 선행 Permission Engine·Role Assignment/Scoped·Decision Core 실 구현 부재·RP-002 위반·중복 엔진 리스크.
- **B. 마케팅 `RuleEngine.php`를 RBAC Rule Engine으로 재사용** — 기각. 대상 도메인(광고/재고) 전혀 다름·RBAC role/permission 미취급(오흡수=가짜 녹색).
- **C. 정적 rank 4곳 그대로 두고 Dynamic 얹기** — 기각. 통합 PDP 없이 얹으면 우회 잔존. 단일 Policy Decision Point 수렴이 정답.
- **D. 설계 명세만(코드 0)+근접 substrate 조립계획+Gap+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 2/3-1~3-4 동형.

## 5. 귀결 (Consequences)

- (+) 근접 substrate 3종(ABAC data_scope·MFA 게이트·attribute 필드)의 결정 입력 조립 계획·정적 rank 4곳 단일 PDP 수렴·마케팅 automation KEEP_SEPARATE 확정("발명 아니라 조립+분리").
- (+) Dynamic Role/Rule Engine/PDP 순신규를 grep 0으로 실증 → 투기성 스키마 방지.
- (+) 정직 판정(정적 role·MFA는 로그인 게이트·risk 정적 라벨·마케팅 RuleEngine 오흡수 금지·CONDITIONAL enum명만) — 실재 과신·부재 과장 양방향 회피.
- (+) UNKNOWN Permit 금지·fail-closed 안전 규율(effectiveScope substrate)·하드코딩 role 비교 Static Lint 대상 목록 확보.
- (+) Part 3-2 CONDITIONAL Component Rule Reference 빈자리를 이번 Part가 채움을 명문화.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3-6 Service/System Role Governance**(스펙 권장순서 §37). 신규 실결함 발견 없음(AdminMenu 데드락은 이미 수정·재플래그 아님).

## 6. 규율 준수

Golden Rule(Extend·중복 Rule/Policy Engine 신설 금지·마케팅 automation 오흡수 금지·정적 rank 단일 PDP 수렴) · 무후퇴 · "결론의 근거도 재실증"(Dynamic Role/Rule Engine/PDP 부재·ABAC data_scope·MFA 게이트·risk 정적 라벨·마케팅 RuleEngine·하드코딩 산재 전부 grep/코드 정독·firsthand 재검증) · UNKNOWN Permit 금지 · Dynamic≠정적 role · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · 부재 날조·실재 과신 양방향 금지 · 289차 P1~P5·AdminMenu 수정분 재플래그 금지 · GROUND_TRUTH 외 인용 금지.
