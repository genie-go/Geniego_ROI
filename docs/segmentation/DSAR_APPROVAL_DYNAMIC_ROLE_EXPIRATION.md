# DSAR — Approval Dynamic Role Expiration (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Expiration)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · ★Dynamic Role ≠ 정적 role(현행은 세션 종료 후에도 명시적 만료 절차 없음) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE_RUNTIME`(스펙 §2 Canonical Entity)의 소멸 축인 Dynamic Role Expiration(스펙 §11)은 Trigger 이벤트 발생 시 활성화된 Role을 비활성화하는 절차다. Activation(별도 DSAR)의 거울상으로, 근접 substrate는 **`user_session` 만료 관련 컬럼(created_at/last_seen)뿐**이며 이마저 role을 소멸시키는 로직과 연결되어 있지 않다 — ground-truth §4는 session age를 "role 활성 입력? ✗ /auth/sessions 표시만"으로 명시적으로 부정한다.

## 2. Canonical 필드

스펙 §11은 Trigger 열거만 정의(필드 섹션 없음). 설계 제안: Expiration ID · User ID · Dynamic Role ID(참조) · Expiration Trigger(§3 열거값) · Expired At · Prior Role State · Reason.

## 3. 열거형 / 타입

스펙 §11 원문 — **Expiration Trigger**: Session End · Timeout · Business Hours 종료 · Risk 상승 · Context 변경 · Project 종료.

## 4. 실 substrate 매핑 (ABSENT/근접 · ground-truth만 인용)

- **Dynamic Role Expiration 개념 자체 = ABSENT**(ground-truth §1 총평 — "자동 생성·활성/비활성되는 role 개념 전무"). 정적 role(team_role/admin_level/api_key.role)은 애초에 활성화되는 개념이 없으므로 만료 개념도 대칭적으로 부재.
- **★가장 근접한 substrate = `user_session` 추적 컬럼(만료 강제 아님)**(ground-truth §4·§5): `user_session.created_at/last_seen`(`Db.php:1111-1119`·`UserAuth.php:4237`)이 세션 시각을 기록하고, `recordSessionMeta`(`:4243-4251`·best-effort)·`listSessions`(`:4254-4281`)가 이를 **표시**한다. ground-truth §4가 명시적으로 "role 활성 입력? ✗ /auth/sessions 표시만"이라 부정하므로, Session End/Timeout Trigger에 대응하는 자동 role 비활성 로직은 없음 — 세션 메타데이터는 조회 가능하나 그것이 role을 만료시키지는 않는다.
- **Business Hours / Risk 상승 / Context 변경 / Project 종료 = ABSENT**: `Db::envLabel()`(`Db.php:56-61`)·`auth_audit_log.risk`(`UserAuth.php:4165`·정적 라벨 `:4174,4203`)는 각각 배포라벨·정적 심각도일 뿐 시간대/위험도 상승/컨텍스트 변경을 감지해 만료를 유발하는 계산 로직이 아님. Project 종료 이벤트 = grep 0.

## 5. 설계 원칙

- Session End Trigger는 Session Role(§12)과 결합해 "세션 종료 시 자동 삭제"(스펙 §12 원문)로 우선 구현 대상이 되어야 한다 — 다만 이는 **세션 스코프 role 저장소 자체가 순신규**이므로, 현행 `user_session` 표시용 컬럼을 만료 트리거로 그대로 승격하지 않는다(표시 ≠ 강제 소멸).
- Timeout Trigger는 `last_seen` 컬럼을 입력으로 사용할 수 있는 유일한 근접 지점이나, 현재 이 컬럼을 읽어 세션을 강제 종료하는 백그라운드 절차가 없음(신규 스케줄러/가드 필요).
- Risk 상승 Trigger는 계산형 Runtime Risk(별도 스펙 §20) 신설이 선행되어야 하며, `auth_audit_log.risk` 정적 라벨을 그대로 조건으로 쓰지 않는다(Rule Evaluation DSAR와 동일 원칙 — 정직 판정 유지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Expiration은 Activation(별도 DSAR)이 먼저 성립해야 소멸시킬 활성 상태가 존재한다.
- **Gap**: Business Hours/Project 종료 2종 Trigger는 감지 이벤트 소스 자체가 시스템에 없음. Risk 상승 Trigger는 계산형 Risk 엔진 부재로 조건화 불가.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 별도 승인세션(RP-002).
