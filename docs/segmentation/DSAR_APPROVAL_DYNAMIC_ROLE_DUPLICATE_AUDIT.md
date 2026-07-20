# DSAR — Dynamic Role 중복/근접 감사 (EPIC 06-A-03-02-03-04 Part 3-5 · ⓑ GROUND_TRUTH)

- **상태**: 중복감사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **원칙**: 동일 목적 구현이 있으면 중복 Rule/Policy Engine 신설 금지 — Canonical Dynamic Role Engine+Adapter로 통합(Golden Rule). ★마케팅 automation을 RBAC Rule Engine으로 오흡수 금지(KEEP_SEPARATE).
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **선행**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 0. 총평

Dynamic Role 도메인이 **대부분 순신규(ABSENT)라 "동일 구현 중복"은 성립하지 않는다**(중복될 실체 부재). 대신 §66형 진짜 위험은 ① **RBAC Rule Engine으로 오인될 마케팅 automation 4곳** ② **무통합 정적 rank/게이트 4곳 산재** ③ **하드코딩 role/plan 비교 37+개소 산재(Static Lint 대상·실버그 유발 이력)**.

## 1. 확인된 산재/근접(오흡수 금지)

### D-1. ★RBAC Rule Engine으로 오인 금지 — 마케팅 automation 4곳(KEEP_SEPARATE)
| 구현 | 위치 | 도메인 |
|---|---|---|
| `RuleEngine.php` | `:12,24,32,34,194-220` | 범용 IF-THEN 마케팅/재고(channel_roas/sku_stock·alert/webhook/pause_channel/reorder) |
| `Alerting.php` | `:12` | 알림 규칙 |
| `AutoCampaign.php` | `:14-15,222-226` | 광고 가드레일(RuleEngine와 소유권 분리) |
| `Decisioning.php` / FE `PolicyTreeEditor.jsx` | `Decisioning.php:12`·`PolicyTreeEditor.jsx:1-24` | 마케팅 decision·roas 조건트리(미배선) |

→ 명명(rule/drift/simulate)만 유사·대상 도메인(광고·재고·ML)이 전혀 다름. Canonical Dynamic Role Engine은 이들을 **흡수하지 않음**(별개 유지). "IF department=X AND MFA=TRUE THEN role" RBAC Rule Engine=순신규.

### D-2. 무통합 정적 rank/게이트 4곳 산재 (통합 PDP 부재)
| substrate | 위치 | 축 |
|---|---|---|
| ABAC scope(effectiveScope) | `TeamPermissions.php:236-322` | data_scope 행필터(정적 저장값 라이브 조회) |
| effectiveForUser(3단 위계) | `TeamPermissions.php:366-394` | owner/manager/member+team clamp |
| index.php RBAC(PEP 근접) | `index.php:572-598,82-89` | api_key rank+guardTeamWrite 이진 게이트 |
| PlanPolicy rank(구독) | `PlanPolicy.php:19-22` | plan tier 정적 rank |
| AdminMenu required_role/rank | `AdminMenu.php:337-356` | 내부 어드민 메뉴 별도 rank(team_role과 별개 명명) |

→ 각자 독립 스토어·독립 문법·단일 Policy Decision Point로 미수렴. Dynamic Role Engine이 이들을 결정 입력으로 조립(중복 신설 아님·확장). ★MFA(`UserAuth.php:3519-3792`)·risk(`auth_audit_log.risk`)는 role 결정 미연결(로그인 게이트·정적 라벨).

### D-3. ★하드코딩 role/plan 비교 산재 (Static Lint 대상·실버그 유발)
- **백엔드 ~15개소**: `TeamPermissions.php:120-136`(roleOf/isAdmin 헬퍼·12개소 재사용)·`UserAuth.php:85,124,1119-1181,3766,3810,3836,4307`·`UserAdmin.php:252,285,300,416,437`·`Pnl.php:522`·`Compliance.php:203`·`Keys.php:191,206`.
- **프론트 ~22개소(8파일)**: `TeamMembers.jsx:191-458`(team_role 리터럴 9~10)·`writeGuard.js:73-74`·`teamApi.js`·`AgentModeCard.jsx`·`AuthContext.jsx`·`App.jsx`·`Topbar.jsx`·`UserManagement.jsx`.
- ★**하드코딩 rank가 실버그 유발 증거**: AdminMenu required_role↔rank 데드락(`AdminMenu.php:337-356`·커밋 974ab0db6ff 수정)—super_admin/moderator가 rank 배열에 없어 admin조차 영구 비노출. Static Lint(no-literal-role-compare) 도입 시 위 file:line 우선 대상.

## 2. 중복이 **아닌** 것 (정직 판정)

- 거버넌스 계층 부재로 "중복 구현" 자체 없음(중복될 실체 부재).
- 마케팅 automation(RuleEngine/Alerting/AutoCampaign/Decisioning/AnomalyDetection)은 정당한 별개 도메인(KEEP_SEPARATE)·Dynamic Role로 오흡수 금지.
- data_scope(ABAC)·MFA·risk·PlanPolicy·AdminMenu rank는 의도적 별개 축·Dynamic Role Engine이 결정 입력으로 조립하되 축 보존.
- 하드코딩 role 비교는 대부분 `roleOf`/`isAdmin` 헬퍼로 중앙화(소비지 미러·정의는 단일화 대상)·Part 3-1 정합.

## 3. 통합 결정 (조립 계획)

- **금지**: 마케팅 RuleEngine을 RBAC Rule Engine으로 재사용·오흡수. 무통합 rank 4곳을 그대로 두고 Dynamic Role Engine 병렬 신설.
- **채택**: Canonical Dynamic Role Engine이 (a) ABAC(data_scope)·MFA 게이트·attribute 필드(session/risk/env)를 **결정 입력**으로 조립(Rule Engine·PDP 신설), (b) 정적 rank 4곳(TeamPermissions/index.php/PlanPolicy/AdminMenu)을 단일 Policy Decision Point로 수렴, (c) 하드코딩 role 비교를 Static Lint로 봉인(no-literal-role-compare), (d) 마케팅 RuleEngine은 KEEP_SEPARATE 명시. Version/Snapshot/Digest/Cache/Drift/Simulation은 순신규.
- **실 구현**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수=설계(코드 0). ★신규 실결함 발견 없음(AdminMenu 데드락은 이미 커밋 974ab0db6ff로 수정·재플래그 아님).
