# DSAR — Dynamic Role Function Regression Gate (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Function Regression Gate)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · Dynamic≠정적 role · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§35(Regression: 기존 Approval·기존 Workflow·기존 Assignment)의 **기존 기능 회귀 게이트**를 정의한다. Canonical Dynamic Role Engine은 근접 substrate 3종(ABAC data_scope·MFA 로그인 게이트·attribute 필드)과 무통합 정적 rank 4곳(TeamPermissions/index.php/PlanPolicy/AdminMenu)을 **대체·재구현이 아니라 결정 입력으로 조립·단일 PDP로 수렴**하므로(ADR D-1), **실 구현 시 이들 위에 서 있는 실존 기능이 동일하게 동작**해야 한다(무후퇴·회귀 0). 본 게이트는 어떤 기능 표면을 어떤 기준으로 재검증할지 명세한다.

★**본 차수는 코드 변경 0(설계 명세만)이므로 회귀 표면이 발생하지 않는다** — 실제 게이트 실행은 Canonical Dynamic Role Engine 실구현 세션(RP-002)에서 발동한다. 본 문서는 그 세션의 통과 기준을 사전 봉인한다.

## 2. Canonical 필드

- **기능 표면 ID** — 아래 §3 표 번호
- **검증 기준(회귀 0)** — 도입 전/후 판정 동일성 조건
- **현행 substrate** — 근접 인용(file:line)
- **회귀 위험도** — `HIGH`(직접 결정 입력으로 편입) / `MEDIUM`(단일 PDP 수렴 대상) / `LOW`(경계 보존·KEEP_SEPARATE)

## 3. 열거형 / 타입 (회귀 검증 표면 + 통과 기준)

| # | 기능 표면 | 검증 기준(회귀 0) | 현행 substrate (file:line) | 위험도 |
|---|---|---|---|---|
| 1 | **ABAC data_scope 행필터(effectiveScope)** | owner/admin null·비owner+무tenant DENY_SCOPE·예외 DENY_SCOPE·company null 등 fail-closed 분기 전부 판정 동일 | `TeamPermissions.php:236-265` | **HIGH**(Dynamic Role attribute source로 편입 대상, ADR D-1 ABAC_SUBSTRATE) |
| 2 | **Require MFA 로그인 게이트** | `MFA_STRICTNESS` 3단계 정책·TOTP 검증·OTP 챌린지·락아웃 예외·break-glass 우회+불변감사·Enroll 강제 판정 전부 동일 | `UserAuth.php:929-1036,3719-3760` | **HIGH**(Conditional Role 입력으로 편입 대상, ADR D-1 CONTEXT_ATTRIBUTE) |
| 3 | **MFA/session/risk/env 속성 필드** | `mfa_enabled/mfa_secret/mfa_method`·`user_session` 컬럼·`auth_audit_log.risk` 정적 라벨·`Db::envLabel()` 값 산출 전부 동일 | `UserAuth.php:3525,4165,4174,4203`·`Db.php:1111-1119,56-61` | **HIGH**(ADR D-1 ATTRIBUTE_SOURCE, risk는 정적 라벨 유지가 무후퇴 기준·계산형 승격은 별개) |
| 4 | **index.php RBAC 게이트(PEP_NEAR)** | roleRank·method별 rank/scope 비교·403/통과 이진 판정 동일 | `index.php:572-598` | **HIGH**(PEP_NEAR 확장 대상, Permit/Deny/Challenge/Escalate 다중결정 PDP 신설 시에도 기존 이진 판정 결과 불변) |
| 5 | **guardTeamWrite 전역 쓰기가드** | 쓰기 요청 이진 차단 판정 동일 | `index.php:82-89` | **HIGH**(PEP_NEAR 확장 대상) |
| 6 | **정적 role 스냅샷(team_role/admin_level/api_key.role)** | 로그인 시 세션 스냅샷값·`roleRank` 순위화 결과 전부 동일(context 재평가 미도입이 무후퇴 기준) | `UserAuth.php:1019,191,1022`·`Db.php:942-955`·`index.php:573-576` | **HIGH**(Dynamic Role은 이 위에 추가되는 레이어이지 대체가 아님, ADR §0) |
| 7 | **PlanPolicy 구독 tier rank** | plan tier 정적 rank 판정 동일 | `PlanPolicy.php:19-22` | **MEDIUM**(단일 PDP 수렴 대상, DUPLICATE_AUDIT D-2) |
| 8 | **AdminMenu required_role/rank** | 메뉴 노출 판정 동일 — 974ab0db6ff로 이미 수정된 데드락(super_admin/moderator rank 배열 누락) 재발 금지 | `AdminMenu.php:337-356` | **MEDIUM**(단일 PDP 수렴 대상·재발 방지가 회귀 기준, 289차 재플래그 아님) |
| 9 | **하드코딩 role/plan 비교 산재(백엔드 15+FE 22개소)** | Static Lint 도입이 즉시 삭제·강제치환하지 않고 점진 봉인 — 기존 판정 로직 동일 유지 | `TeamPermissions.php:120-136`·`UserAuth.php:85,124,1119-1181,3766,3810,3836,4307`·`UserAdmin.php:252,285,300,416,437`·`Pnl.php:522`·`Compliance.php:203`·`Keys.php:191,206`·FE `TeamMembers.jsx:191-458`·`writeGuard.js:73-74`·`teamApi.js`·`AgentModeCard.jsx`·`AuthContext.jsx`·`App.jsx`·`Topbar.jsx`·`UserManagement.jsx` | **MEDIUM**(Static Lint 대상, DUPLICATE_AUDIT D-3) |
| 10 | **마케팅 automation(RuleEngine.php 등 4곳)** | channel_roas/sku_stock 조건 평가·alert/webhook/pause_channel/reorder 액션 판정 동일 — Dynamic Role Engine에 오흡수되지 않음(경계 보존) | `RuleEngine.php:12,24,32,34,194-220`·`Alerting.php:12`·`AutoCampaign.php:14-15,222-226`·`Decisioning.php:12`·`PolicyTreeEditor.jsx:1-24` | **LOW**(KEEP_SEPARATE, ADR D-4·경계 검증) |

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 회귀 표면 | 판정 | 실 substrate (file:line) |
|---|---|---|
| ABAC data_scope | **ABAC_SUBSTRATE(확장·결정입력·무후퇴)** | `TeamPermissions.php:236-322` |
| Require MFA 로그인 게이트 | **CONTEXT_ATTRIBUTE(확장·입력·무후퇴)** | `UserAuth.php:929-1036,3719-3760` |
| MFA/session/risk/env 필드 | **ATTRIBUTE_SOURCE(입력·무후퇴)** | `UserAuth.php:3525,4165,4174,4203`·`Db.php:1111-1119,56-61` |
| index.php RBAC(PEP_NEAR) | **PEP_NEAR(확장·무후퇴)** | `index.php:572-598,82-89` |
| 정적 rank 4곳(TeamPermissions/index/PlanPolicy/AdminMenu) | **CONSOLIDATION(단일 PDP 수렴·무후퇴)** | `TeamPermissions.php:366-394`·`index.php:572-598`·`PlanPolicy.php:19-22`·`AdminMenu.php:337-356` |
| 하드코딩 role/plan 비교 37+개소 | **STATIC_LINT_TARGET(봉인·무후퇴)** | DUPLICATE_AUDIT D-3 전체 목록 |
| RuleEngine.php 등 마케팅 | **KEEP_SEPARATE(경계 보존)** | `RuleEngine.php`·`Alerting.php`·`AutoCampaign.php`·`Decisioning.php`·`PolicyTreeEditor.jsx` |

## 5. 설계 원칙

1. **Extend not Replace = 회귀 0의 근거** — Canonical Dynamic Role Engine은 근접 substrate 3종·정적 rank 4곳을 삭제하지 않고 **결정 입력으로 조립 + 단일 PDP로 수렴**하므로(ADR D-1), 정형화 후에도 위 10개 표면은 **동일 판정**이어야 한다.
2. **정적 role 스냅샷(#6)은 Dynamic Role 도입 후에도 대체되지 않는다** — ADR §0이 명시한 대로 Dynamic Role은 Runtime Context를 평가해 Session/Conditional Role을 **추가로 활성/비활성**하는 레이어이지, team_role/api_key/admin_level 정적 스냅샷을 제거하는 것이 아니다.
3. **AdminMenu 데드락(#8)은 이미 수정된 결함이며 재발 방지가 회귀 기준** — 커밋 974ab0db6ff로 해결 완료(289차 재플래그 금지). 단일 PDP 수렴 설계가 이 재발을 구조적으로 막아야 한다.
4. **risk 정적 라벨(#3)을 계산형으로 승격하는 것은 별개 설계 트랙** — 이번 회귀 게이트는 "정적 라벨 유지"가 무후퇴 기준이며, 계산형 Runtime Risk 신설은 §20(Runtime Risk) 별도 설계 대상.
5. **마케팅 automation(#10)은 Dynamic Role Engine 밖 유지가 회귀 기준** — RuleEngine.php 등에 role/permission 문자열이 유입되거나 Dynamic Role Engine이 이를 흡수하면 그 자체가 회귀(ADR D-4 KEEP_SEPARATE 위반).
6. **정직 부재는 게이트 대상 아님** — Dynamic Role Registry·Rule Engine·PDP·Projection·Session Role 등은 현재 존재하지 않으므로 "회귀"가 아니라 "신규 기능 검증"으로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 게이트 실행은 Canonical Dynamic Role Engine + Part 2/3-1/3-2/3-3/3-4 실 구현 세션에서 발동.
- **본 차수 회귀 표면 없음**: 코드 변경 0(설계 명세)이므로 이번 세션에서 회귀할 기능이 없다(정직).
- **최고위험 감시 지점(부수 발견 아님·설계 우선순위)**: 정적 role 스냅샷 무후퇴(#6)·ABAC/MFA 결정 입력 편입 시 기존 fail-closed 판정 불변(#1·#2)·정적 rank 4곳 단일 PDP 수렴 시 기존 판정 결과 동일(#7·#8) — 전부 ADR D-1·GROUND_TRUTH 인용, 본 차수 수정 아님.
- **무후퇴 원칙**: 위 10개 표면은 실존 기능(또는 명시적 유지 대상) → Dynamic Role Engine 도입 과정에서 삭제·재구현 금지.
- **판정**: NOT_CERTIFIED · 실 게이트 = Canonical Dynamic Role Engine 신설 세션(RP-002)에서 실행.

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_TEST_STRATEGY]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]
