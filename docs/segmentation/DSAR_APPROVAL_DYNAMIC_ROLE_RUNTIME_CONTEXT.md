# DSAR — Approval Dynamic Role Runtime Context (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Runtime Context)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Runtime Context는 스펙 §5가 정의하는, Rule Engine·Conditional Role 평가 시점에 참조되는 **현재 상태 스냅샷**이다(Current User·Session·Device·Network·IP·Region·Organization·Project·Environment·Time·Authentication Context). ADR D-3·ground-truth §5는 현행 `user_session` 테이블·`recordSessionMeta`·`listSessions`·`authedUser`/`authedTenant`가 이미 이런 정보를 **기록·표시**하고 있으나, 어느 것도 **role 결정 로직의 입력으로 사용되지 않는다**고 확정한다. 본 엔티티는 "Runtime Context가 기록되는 것"과 "Runtime Context가 role을 결정하는 것"이 서로 다른 단계임을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `runtime_context_id` | Runtime Context 스냅샷 식별자(PK, 세션 스코프) |
| `context_dimension` | §5 열거(Current User/Session/Device/Network/IP/Region/Organization/Project/Environment/Time/Authentication Context) |
| `captured_value` | 캡처된 값 |
| `captured_at` | 캡처 시각 |
| `role_decision_consumed` | role 결정 로직이 이 값을 소비했는지 여부(현행 전부 `false`) |

## 3. 열거형 / 타입

- **`context_dimension`**(스펙 §5 verbatim, 11종): `Current User` · `Current Session` · `Current Device` · `Current Network` · `Current IP` · `Current Region` · `Current Organization` · `Current Project` · `Current Environment` · `Current Time` · `Authentication Context`.
- **`role_decision_consumed`**: `TRUE`(role 계산 로직 입력) · `FALSE`(기록/표시용, 현행 전 항목이 `FALSE`).

## 4. 실 substrate 매핑 (PRESENT_UNCONSUMED/ABSENT·ground-truth만 인용)

| 차원(스펙 §5) | 판정 | 실 substrate (file:line) |
|---|---|---|
| Current Session / Current IP(근사=ip/ua) | **PRESENT_UNCONSUMED** | `user_session`(`Db.php:1111-1117` + ALTER `ip/ua/last_seen`, `UserAuth.php:4237`) |
| Session 메타 기록 | **PRESENT_UNCONSUMED** | `recordSessionMeta`(`UserAuth.php:4243-4251`·best-effort) |
| Session 목록 조회(표시) | **PRESENT_UNCONSUMED(표시용)** | `listSessions`(`UserAuth.php:4254-4281`) |
| Current User / Current Organization(근사=tenant/plan) | **PRESENT(정적 반환·미재계산)** | `authedUser`/`authedTenant` — 정적 `team_role`/`plan` 반환, context로부터 role 계산 안 함(ground-truth §5) |
| Current Device / Current Network / Current Region / Current Project / Current Environment / Current Time / Authentication Context | **미인용(ground-truth §5 범위 밖 개별 substrate) → ABSENT 처리** | 이번 Part 3-5 ground-truth 2문서에 개별 인용 없음 — 반날조 원칙상 부재로 등재(단 Environment는 Attribute Source 문서에서 `Db::envLabel()`(`Db.php:56-61`)로 별도 인용됨을 참고 표기만, 본 Runtime Context 카탈로그로서는 미조사) |

★ground-truth §5 원문: "Runtime Context(`user_session`+`recordSessionMeta`+`listSessions`+`authedUser`/`authedTenant`)가 role 결정 로직 입력으로 연결된 지점 없음." 11개 차원 중 실제 캡처·표시되는 것은 Session/IP/User/Organization 4개 근사치뿐이며, 이마저 **role 계산에 소비되지 않는다**.

## 5. 설계 원칙

1. **"기록됨"과 "role 결정에 쓰임"을 항상 분리 표기** — `role_decision_consumed=FALSE`를 기본값으로 하고, 배선 완료 시에만 `TRUE`로 전환(회귀 방지용 명시적 게이트).
2. **`user_session`/`recordSessionMeta`/`listSessions`를 Runtime Context Adapter의 데이터 소스로 재사용(확장)** — 신규 세션 컨텍스트 테이블 재구현 금지.
3. **`authedUser`/`authedTenant`는 유지, role 재계산 로직만 신설** — 이 함수들이 정적 role/plan을 반환하는 현행 동작 자체는 Part 3-5에서 변경하지 않는다(코드 0 원칙). Dynamic Role 활성화는 별도 계층에서 이 값을 입력으로 삼아 조립.
4. **미조사 7개 차원은 후속 전수조사 대상으로 명시** — Device/Network/Region/Project/Time/Authentication Context는 이번 ground-truth에 미포함되었을 뿐 향후 발견될 수 있음(정직 불확실성).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Runtime Context가 Dynamic Role 활성화 로직의 실제 입력으로 배선되는 지점은 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped 실 구현 이후. 본 차수 코드 0.
- **Gap-1(미소비)**: Session/IP/User/Organization 4개 근사 차원이 실재하나 role 결정에 미소비 — Runtime Context Adapter 신설이 필요.
- **Gap-2(조사 공백)**: Device/Network/Region/Project/Time/Authentication Context 6개(+Current Environment 중복표기 제외) 차원은 이번 ground-truth 문서 범위 밖 — 후속 세션 재조사 필요.
- **정직 부재**: `authedUser`/`authedTenant`가 "이미 context-aware role 계산"을 수행한다고 과신 금지 — 정적 값 반환일 뿐. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).
