# DSAR — Approval Dynamic Role Activation (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Activation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · ★Dynamic Role ≠ 정적 role(현행은 로그인 시 1회 배정·재평가 없음) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE_RUNTIME`(스펙 §2 Canonical Entity)의 활성화 축인 Dynamic Role Activation(스펙 §10)은 Trigger 이벤트 발생 시 Role을 자동 활성하는 절차다. ADR §1이 명시하듯 현행 team_role/api_key/admin_level은 **로그인 시 1회 스냅샷**되며(`UserAuth.php:1019`), 이후 세션 중 어떤 이벤트가 발생해도 재평가되지 않는다. Dynamic Role Activation은 이 "1회 배정" 구조를 "이벤트 기반 재활성" 구조로 확장하는 설계다.

## 2. Canonical 필드

스펙 §10은 Trigger 열거만 정의(필드 섹션 없음). 설계 제안: Activation ID · User ID · Dynamic Role ID(참조) · Trigger Type(§3 열거값) · Triggered At · Prior Role State · New Role State · Evaluation Reference(`DSAR_APPROVAL_DYNAMIC_ROLE_RULE_EVALUATION` 결합).

## 3. 열거형 / 타입

스펙 §10 원문 — **Trigger**: Login · MFA Success · Session Created · Organization Changed · Context Changed · Project Changed · Risk Changed · Manual Refresh.

## 4. 실 substrate 매핑 (ABSENT · ground-truth만 인용)

- **Dynamic Role Activation 개념 자체 = ABSENT**(ground-truth §1). team_role은 `UserAuth.php:1019`에서 로그인 시 세션에 스냅샷될 뿐 "활성화 이벤트"로 모델링되지 않으며, 이후 변경은 팀배정 관리작업(`TeamPermissions.php:774`)으로만 발생 — 8종 Trigger 중 어느 것도 role 재활성을 유발하지 않는다.
- **Trigger별 근접 substrate(전부 role 미연결)**:
  - **Login**: 로그인 흐름은 실재(`UserAuth.php:929-1036`)하나 그 결과는 team_role 1회 스냅샷일 뿐 "Activation 이벤트"가 아님.
  - **MFA Success**: MFA 검증 흐름 실재(TOTP `UserAuth.php:955-964`·OTP 챌린지 `:965-978`·락아웃 예외 `:968-970`·break-glass `:995-999`)하나, 성공 시 role을 활성하는 로직은 없음 — 로그인 게이트 통과 판정에 그침.
  - **Session Created**: `user_session` 레코드 생성(`Db.php:1111-1119`·`UserAuth.php:4237`)은 실재하나 role 활성과 무관(기록용).
  - **Organization/Project/Risk Changed**: 조직/프로젝트 변경 감지 로직 자체가 grep 0(ground-truth 어디에도 없음) — ABSENT. Risk는 `auth_audit_log.risk`(`UserAuth.php:4165`)가 정적 라벨(`:4174,4203`)이라 "변경 감지"할 계산값이 없음.
  - **Context Changed / Manual Refresh**: grep 0 — ABSENT.

## 5. 설계 원칙

- Trigger 8종 중 즉시 구현 착수 가능한 근접 지점은 Login(`UserAuth.php:1019` 스냅샷 지점)·MFA Success(`UserAuth.php:955-978` 검증 성공 분기)뿐이며, 나머지 6종(Organization/Session Created/Project/Risk/Context Changed/Manual Refresh)은 감지 이벤트 자체를 신설해야 한다.
- Activation은 Dynamic Role Evaluation(별도 DSAR)의 판정 결과를 소비하는 후속 절차로 설계하며, Evaluation 없이 임의로 role을 활성하지 않는다(순서 종속).
- Activation 이력은 Session Role(§12·별도 스코프)에 국한되어야 하며, 정적 team_role UPDATE 패턴(DB 영속)과 혼동하지 않는다(Dynamic ≠ 정적 — ADR D-3).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Activation은 Role Registry(Part 3-1)의 Dynamic Role 정의·Rule Evaluation 계약이 선행되어야 발동시킬 대상이 생긴다.
- **Gap**: Organization/Project/Risk/Context Changed 4종 Trigger는 감지할 이벤트 소스 자체가 시스템에 없음(신규 이벤트 파이프라인 설계 필요) — 단순 스키마 추가로 해결되지 않는 실질적 Gap.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002).
