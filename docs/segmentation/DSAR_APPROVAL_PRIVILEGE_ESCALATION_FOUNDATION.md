# DSAR — Privilege Escalation Detection Foundation (06-A-03-02-03-03 · §54)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만. 신규 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§54 **Privilege Escalation Detection Foundation** (SPEC 원문):

- 탐지 신호: `Role/Authority Added` · `Position Assigned` · `Tenant Admin Granted` · `Legal Entity Access Added` · `Delegation Created` · `Support Privilege Granted` · `Service Account/Client Scope Expanded` ↔ **Decision 시간관계**.
- 규칙: **Recent Elevation Window** 내 고위험 Decision = `Step-up` / `Manual Review`.
- 연계: §31 Step-up Foundation의 `Recent Privilege Elevation` 조건 · §50 Identity Drift(Role Revoked/Position Ended 등)와 대칭 · §65 `RECENT_PRIVILEGE_ELEVATION WARNING`.

의미: 권한/역할/직위/테넌트 관리자/법인 접근/위임/지원권한/서비스계정·클라이언트 스코프가 **부여된 시각**과 그 Actor가 **Decision을 Commit한 시각**의 시간관계를 기록·평가하여, 최근 상승 창(Recent Elevation Window) 내에서 이뤄지는 고위험 결정을 Step-up 재인증 또는 Manual Review로 승격시키는 탐지 기반이다. 부여 이벤트가 시계열로 남지 않으면 "권한을 얻자마자 스스로 고액 승인" 패턴을 사후에도 재현할 수 없다.

## 2. 기존 구현 대조

- **권한/역할 substrate는 실재하나 부여 이벤트의 시계열 기록·Decision 시간관계 연산은 부재.**
  - RBAC rank(`index.php:554` `viewer0/connector1/analyst2/admin3`)·RBAC scopes(`index.php:553-587` `:554,564-567,568-578,590-600,585`)·team_role(`TeamPermissions.php:120-136` owner>manager>member)는 **현재 스냅샷 권한**만 제공한다. "언제 이 role/scope가 부여됐는가"를 event로 남기는 구조는 없다.
  - Tenant Admin/act-as 상승 경로는 실재: `X-Act-As-Tenant`(`UserAuth.php:398` admin+`platform_growth` 단일값·effective tenant만 치환)·Member impersonation(`UserAdmin.php:472-534` `:493-497,499,525` admin→대상 세션 `imp_` 2h 발급). 그러나 이들은 **부여 시점**을 audit로 남길 뿐, 이후 Decision Commit과의 시간관계로 평가되지 않는다.
  - `SecurityAudit`(`SecurityAudit.php:14-33` `:27`) 불변 append-only 해시체인은 개별 이벤트를 시각과 함께 남기지만, 승인경로에 미사용(§29 GROUND_TRUTH)·Elevation↔Decision 상관 질의 없음.
- **부여 이벤트 자체가 없는 축**: Employment/Position(`ABSENT`·team_role만), Delegation/Authority(`ABSENT`·전용 클래스/테이블 0), Legal Entity Membership 전부 부재 → 상승 신호를 만들 원천이 없다.
- **Decision 시간관계의 상대편(불변 Decision Record)도 부재**: 승인 substrate는 `mapping_change_request`(`Db.php:623-634`·정족수 2 실동작)+`action_request`(위조 actor·정족수 없음)뿐. Commit 시각을 담은 불변 Decision Snapshot이 없어 "부여시각↔Commit시각" 비교 대상 자체가 없다.

## 3. 판정

- Verdict: **ABSENT** (부재 — 순신규 설계).
- cover: **0**. role/authority/position/scope **부여 이벤트↔decision 시간관계** 기록·연산이 전무. 권한 스냅샷(RBAC rank/scopes/team_role)은 상승 탐지의 원천 데이터가 아니라 현재상태 조회일 뿐이며, Recent Elevation Window·Step-up 승격·Manual Review 라우팅은 어느 경로에도 존재하지 않는다.
- 선행 의존: §3.4 Assignment/Authority/Delegation Foundation ABSENT·§3.3 Decision Foundation(불변 Commit Record) ABSENT → **BLOCKED_PREREQUISITE**. 부여 이벤트 원천과 Decision Commit 시각 양쪽이 모두 신설되어야 §54가 성립.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_privilege_elevation_event` 이벤트 스트림 — `Role/Authority Added`·`Position Assigned`·`Tenant Admin Granted`·`Legal Entity Access Added`·`Delegation Created`·`Support Privilege Granted`·`Service/Client Scope Expanded`를 canonical subject·granted_by·granted_at·scope digest·source(RBAC/team_role/act-as/impersonation)와 함께 append-only 기록.
- Golden Rule=Extend: `SecurityAudit`(`SecurityAudit.php:14-33`)의 불변 append-only 해시체인을 elevation event의 CANONICAL 기록 패턴으로 재사용(신규 로그 엔진 난립 금지). 상승 원천은 기존 RBAC(`index.php:554`)·team_role(`TeamPermissions.php:120-136`)·act-as(`UserAuth.php:398`)·impersonation(`UserAdmin.php:472-534`) 변경 지점에서 이벤트를 **파생**시키되, 이는 후속 실구현 세션(무회귀+배포승인) 대상.
- Recent Elevation Window 평가: Decision Commit 시(§55 Commit-time Revalidation 내부)에서 canonical subject의 최근 elevation event를 조회, window 내 고위험 Action(고액/결제/정산/계약/관리자취소)이면 §31 Step-up 요구 또는 §65 `RECENT_PRIVILEGE_ELEVATION WARNING`+Manual Review 라우팅. 실 Step-up 결합은 §55·§30 Commit Binding 신설에 종속.
- 무후퇴: 상승 이벤트 기록은 관측 전용(observe-only) 계층으로 신설 — 기존 RBAC/team_role/act-as/impersonation 부여 동작을 변경하지 않는다.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_COMMIT_TIME_IDENTITY_REVALIDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]] · [[reference_platform_growth_actas_tenant_hijack]]
