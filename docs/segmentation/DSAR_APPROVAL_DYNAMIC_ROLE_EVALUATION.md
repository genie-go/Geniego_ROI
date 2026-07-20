# DSAR — Approval Dynamic Role Evaluation (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Evaluation / Conditional Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · ★Dynamic Role ≠ 정적 role(Context가 role을 결정) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE`(스펙 §2 Canonical Entity)의 조건부 활성 축인 Dynamic Role Evaluation(스펙 §13 Conditional Role)은 "Time·Device·Project·Region·Client·Network·Risk·Authentication 조건을 평가해 Role을 활성화"하는 절차다. ADR §1·D-3이 명시하듯 현행 team_role/api_key/admin_level은 로그인 시 세션 스냅샷된 **정적값**이며 context 재평가가 전혀 없다 — Dynamic Role Evaluation은 이 정적 배정 구조 위에 조건 평가 계층을 신설하는 설계다.

## 2. Canonical 필드

스펙 §13은 조건 축 열거만 정의(필드 섹션 없음). 설계 제안: Evaluation ID · User ID · Dynamic Role ID(참조) · Condition Axis(§3 열거값 중 다중) · Condition Result(Rule Evaluation 4상태 재사용) · Evaluated At · Triggering Context Snapshot.

## 3. 열거형 / 타입

스펙 §13 원문 — **Conditional Role 조건**: Time · Device · Project · Region · Client · Network · Risk · Authentication. 판정 결과는 별도 DSAR `DSAR_APPROVAL_DYNAMIC_ROLE_RULE_EVALUATION`의 TRUE/FALSE/UNKNOWN/ERROR 계약을 재사용(중복 신설 금지).

## 4. 실 substrate 매핑 (ABSENT/근접 · ground-truth만 인용)

- **Conditional Role 평가 자체 = ABSENT**(ground-truth §1 총평 "context(로그인/시간/위험)에 따라 자동 생성·활성/비활성되는 role 개념 전무"). `dynamic/runtime/session/conditional/context role` grep 매치는 전부 data_scope ABAC 필터·마케팅 코드일 뿐(ground-truth §1).
- **조건 축별 근접 substrate(존재하나 role 미연결)**(ground-truth §4 Attribute Source 표):
  - **Authentication**: MFA 여부(`mfa_enabled/mfa_secret/mfa_method` `UserAuth.php:3525`·`:946,960`) — 실재하나 로그인 챌린지 게이트만(§8 별도 DSAR), role 활성 입력 아님.
  - **Time**: login time(`auth_audit_log.at` `UserAuth.php:4165`)은 감사 타임스탬프일 뿐 조건 평가 입력 아님.
  - **Risk**: `auth_audit_log.risk`(`UserAuth.php:4165`)는 호출부 하드코딩 정적 심각도 라벨(`:4174,4203`·실사용 `:970,983`)로 계산형 조건 평가가 아님.
  - **Client/Environment**: `Db::envLabel()`(`Db.php:56-61`)은 배포라벨·OTP 개발모드 게이트만(`:966`).
  - **Device/Network**: 컬럼 자체 부재(`user_session.ip/ua`는 표시용만) — 조건 평가 대상이 아예 없음.
  - **Project/Region**: ground-truth·ADR 어디에도 등장하지 않음 — ABSENT.
- **Runtime Context = 기록/표시용**(ground-truth §5): `user_session`(`Db.php:1111-1117`+`UserAuth.php:4237`)·`recordSessionMeta`(`:4243-4251`·best-effort)·`listSessions`(`:4254-4281`·표시). `authedUser`/`authedTenant`는 정적 team_role/plan을 반환할 뿐 context로부터 role을 계산하지 않음 — Conditional Role 평가 로직이 연결될 지점이 현재 전무.

## 5. 설계 원칙

- Conditional Role 8축(§3) 중 즉시 조립 가능한 입력은 Authentication(MFA 게이트)뿐이며, 나머지 7축은 속성 컬럼 신설부터 시작해야 한다(Golden Rule — 존재하는 MFA 게이트를 조건 입력으로 확장, 나머지는 순신규).
- Risk 조건은 `auth_audit_log.risk` 정적 라벨을 그대로 조건 입력으로 승격하지 않는다 — 계산형 Runtime Risk(별도 스펙 §20) 신설이 선행되어야 정직한 조건 평가가 성립한다.
- Dynamic Role Evaluation 결과는 세션 스코프에 한정하고(§12 Session Role과 결합), 세션 종료 시 자동 소멸(별도 Activation/Expiration DSAR와 연동)한다 — 현행 team_role처럼 DB에 영속 저장하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Dynamic Role Evaluation은 선행 Role Registry(Part 3-1)의 Dynamic Role 정의·Rule Evaluation(별도 DSAR) 계약이 먼저 성립해야 평가할 대상·판정 계약이 생긴다.
- **Gap**: Device/Network/Project/Region 4축은 속성 컬럼조차 없음(ground-truth §4) — 스키마 신설이 필요한 실질적 Gap. Risk 축은 계산 엔진 부재로 조건 입력화 자체가 불가능.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002).
