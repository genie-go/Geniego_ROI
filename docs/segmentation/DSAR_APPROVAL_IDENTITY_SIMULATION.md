# DSAR — Identity Simulation (06-A-03-02-03-03 · §59)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§59 **Identity Simulation** (SPEC 원문):

시뮬레이션 시나리오(15종) — `ACTIVE` · `TERMINATED_EMPLOYEE` · `DISABLED_ACCOUNT` · `TENANT_MISMATCH` · `LEGAL_ENTITY_MISMATCH` · `ROLE_REVOKED` · `POSITION_ENDED` · `VALID_DELEGATE` · `INVALID_DELEGATE` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `IMPERSONATION` · `SUPPORT_ACCESS` · `RECENT_PRIVILEGE_ELEVATION` · `CUSTOM`.

★ 강행규정: **실제 Identity/Session 변경 금지** — 시뮬레이션은 가정된 신원상태로 Resolution/Guard 결과를 예측만 하고 실제 계정·세션·권한을 조작하지 않는다.

연계: §17 Resolution Pipeline(24단계)·§18 Resolution Result·§55 Commit-time Revalidation·§63 Runtime Guard의 예측 실행.

의미: 승인 게이트가 특정 가정(퇴직자·비활성계정·역할회수·유효/무효 위임·서비스/시스템 액터·임퍼소네이션·최근 권한상승)에서 어떤 판정(RESOLVED/BLOCKED)을 낼지를 **실제 상태를 바꾸지 않고** 사전 검증·회귀 테스트할 수 있게 한다.

## 2. 기존 구현 대조

- **신원 시뮬레이션(가정 상태 주입 후 결과 예측) 계층은 전무 — 순신규.**
  - 가장 근접한 것은 Member impersonation(`UserAdmin.php:472-534` `:493-497,499,525`)이나, 이는 **실제 세션을 발급하는 실행위**(`imp_` 2h)이지 시뮬레이션이 아니다. §59 강행규정(실제 Identity/Session 변경 금지)과 정반대 — 시뮬레이션의 반례.
  - `X-Act-As-Tenant`(`UserAuth.php:398`)도 effective tenant를 **실제로 치환**하는 실행위이지 예측이 아니다.
- **시뮬레이션이 예측해야 할 판정 원천 부재**: §17 Resolution Pipeline·§18 Resolution Result가 `ABSENT`. TERMINATED_EMPLOYEE/POSITION_ENDED의 원천(Employment/Position)은 `ABSENT`(team_role만 `TeamPermissions.php:120-136`), DISABLED_ACCOUNT는 `is_active=1`만(`UserAuth.php:248,260` locked/disabled 세분 없음), ROLE_REVOKED는 RBAC rank(`index.php:554`) 스냅샷만, VALID/INVALID_DELEGATE는 Delegation `ABSENT`, RECENT_PRIVILEGE_ELEVATION은 상승 이벤트(§54) `ABSENT`.
- 즉 시뮬레이션 엔진뿐 아니라 **시뮬레이션이 호출할 결정 함수(Resolution/Guard) 자체가 없다.**

## 3. 판정

- Verdict: **ABSENT** (순신규 — 실 identity 변경 없는 예측 계층 전무).
- cover: **0.** 가정 상태 주입 후 Resolution/Guard 결과를 예측하는 시뮬레이션이 부재하며, 예측 대상 함수(§17/§18/§55/§63)와 시나리오 원천(Employment/Role/Position/Delegation/Elevation)도 부재. 실재하는 impersonation·act-as는 실 상태를 변경하는 실행위로 §59 강행규정에 반하므로 시뮬레이션으로 계상 불가.
- 선행 의존: §17 Resolution Pipeline·§18 Resolution Result·§55 Revalidation·§63 Guard ABSENT → **BLOCKED_PREREQUISITE**. 시뮬레이션은 이들 순수함수가 신설된 뒤에야 성립.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_identity_simulation` — 15종 시나리오별로 **가정 신원상태(hypothetical context)를 순수 입력으로** Resolution Pipeline(§17)·Guard(§63)에 주입하고 예상 판정(RESOLVED/BLOCKED+사유)을 산출. DB write·세션 발급·권한 부여 **일절 없음**(강행규정 §59).
- Golden Rule=Extend: Resolution/Guard를 **부작용 없는 순수함수**로 설계하여 실경로와 시뮬레이션 경로가 동일 로직을 공유(로직 이중화 금지). Canonical actor 도출은 `Mapping::actorId`(`Mapping.php:36-53`) 규약을 참조하되 시뮬레이션은 가정 principal을 주입.
- 용도: §72 회귀 스위트의 Security/Migration 케이스(Actor Spoofing·Disabled/Terminated·Cross-Tenant·Low Assurance)를 실제 계정 조작 없이 재현. impersonation/act-as 실행 경로와 **명확히 분리**(시뮬레이션은 read-only 예측 API).
- 무회귀: 시뮬레이션 API는 실 상태에 접근하지 않으므로 기존 로그인/세션/impersonation/act-as에 영향 0. Runtime Guard(§63)에 시뮬레이션 플래그가 실경로로 새지 않도록 격리.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHENTICATION_SIMULATION]] · [[DSAR_APPROVAL_PRIVILEGE_ESCALATION_FOUNDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
