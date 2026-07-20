# DSAR — Approval Dynamic Conditional Role (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Conditional Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Conditional Role은 스펙 §13이 정의하는, **Time·Device·Project·Region·Client·Network·Risk·Authentication** 8개 조건 축에 따라 활성/비활성되는 Dynamic Role 유형이다(스펙 §3 Dynamic Role 유형 목록에도 등재). ground-truth §9는 이와 직접 연동되는 **Conditional Component Rule Reference**가 Part 3-2 Canonical Entity의 `CONDITIONAL` enum 열거값으로만 존재(`EPIC_06A_PART3_2_..._SPEC.md:331,661,705`)하며, 이를 실제로 평가하는 Rule Reference Interface(코드/스키마)는 전무하다고 확정한다 — **"이번 Part 3-5가 채울 정확한 빈자리"**. 본 엔티티는 8개 조건 축 각각의 근접 substrate 유무를 정직 매핑하고, "조건에 따라 role이 활성/비활성"되는 동작 자체가 시스템에 존재하지 않음을 등재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `conditional_role_id` | Conditional Role 식별자(PK) |
| `condition_type` | §13 열거(Time/Device/Project/Region/Client/Network/Risk/Authentication) |
| `condition_expression` | 조건 평가식(Rule Expression 참조, 별도 엔티티) |
| `target_role_ref` | 활성화 대상 Role 참조(Part 3-1 Role Registry) |
| `activation_state` | 현재 활성/비활성 상태(런타임 계산값) |
| `conditional_component_ref` | Part 3-2 `CONDITIONAL` enum 연동점(ground-truth §9) |

## 3. 열거형 / 타입

- **`condition_type`**(스펙 §13 verbatim, 8종): `Time` · `Device` · `Project` · `Region` · `Client` · `Network` · `Risk` · `Authentication`.
- **`activation_state`**(설계 판정 축): `ACTIVE` · `INACTIVE` · `UNKNOWN`(★UNKNOWN은 Permit 금지 — ADR D-2·스펙 §9).

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

| 조건 축(스펙 §13) | 판정 | 실 substrate (file:line) |
|---|---|---|
| `Authentication` | **근접 게이트 존재(role 활성 입력 아님)** | Require MFA 로그인 게이트 3단계 정책(`UserAuth.php:929-1036,3719-3760`·MFA_STRICTNESS `:3720`·mfaPolicy `:3738-3759`) — ★로그인 시점 챌린지일 뿐, "role을 조건부 활성화"하는 지점 아님(EXISTING_IMPLEMENTATION §8) |
| `Risk` | **정적 라벨(role 활성 입력 아님)** | `auth_audit_log.risk VARCHAR(16)`(`UserAuth.php:4165`) — 호출부 하드코딩 low/medium/high(`:4174,4203`·실사용 `:970,983`), 계산형 아님(EXISTING_IMPLEMENTATION §4·§7) |
| `Device` / `Network` | **기록·표시용(role 활성 입력 아님)** | `user_session.ip/ua`만 표시용(EXISTING_IMPLEMENTATION §4 표) — device fingerprint/network 분류 컬럼 부재 |
| `Time` | **ABSENT** | 업무시간(BusinessHours)·시간대 조건 평가 grep 0(EXISTING_IMPLEMENTATION §1·§0 총평) |
| `Project` | **ABSENT** | grep 0 |
| `Region` | **ABSENT** | grep 0 |
| `Client` | **ABSENT** | grep 0(RBAC 맥락 조건 평가로서는 부재 — 근접 substrate는 없음. api_key 자체는 정적 role 부여 메커니즘일 뿐 조건부 활성화 아님, EXISTING_IMPLEMENTATION §1) |
| Conditional Component Rule Reference(연동 인터페이스) | **ABSENT(코드) · 설계 enum명만** | `EPIC_06A_PART3_2_..._SPEC.md:331,661,705` — Part 3-2 enum 열거값만 존재, 평가 인터페이스 전무(ground-truth §9) |

★8개 조건 축 중 어느 것도 실제로 "role을 조건부 활성/비활성"시키는 코드 경로에 연결되어 있지 않다(EXISTING_IMPLEMENTATION §0 총평 — "dynamic/runtime/session/conditional/context role" grep 0). Authentication/Risk/Device/Network는 개별목적(로그인 게이트·감사 라벨·표시)으로 실재하나 role 활성화 결정 입력으로 조합되는 지점이 없다.

## 5. 설계 원칙

1. **Part 3-2 CONDITIONAL enum 빈자리를 본 엔티티가 채움** — Conditional Component Rule Reference Interface를 Conditional Role의 Canonical 계약으로 명문화(ADR §3 Adapter).
2. **UNKNOWN은 Permit하지 않는다(§9·D-2)** — `activation_state=UNKNOWN` 시 role 비활성 유지(fail-closed). 현행 `effectiveScope` fail-closed(`TeamPermissions.php:234` — ground-truth §3 인접 인용 범위 밖이므로 이 문서는 원칙만 원용하고 file:line은 재인용하지 않음)를 철학적 선례로 삼되, Conditional Role 자체의 substrate는 아님.
3. **Authentication/Risk 근접 게이트를 결정 입력으로 조립, 오인 금지** — Require MFA 로그인 게이트·risk 정적 라벨은 "이미 role을 조건부로 만든다"는 과신 금지(정적 로그인 게이트일 뿐).
4. **마케팅 automation과 무관** — Conditional Role은 RBAC role 활성화 개념이며 `RuleEngine.php` 등 마케팅 조건(channel_roas/sku_stock)과 완전 별개(KEEP_SEPARATE, ADR D-4).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `target_role_ref`가 Part 3-1 Role Registry 실 레코드와 결합되는 지점은 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped 실 구현 이후. 본 차수 코드 0.
- **Gap-1(전면 ABSENT)**: 8개 조건 축 전부 "role 조건부 활성화" 용도로는 순신규 — Time/Project/Region/Client는 근접 substrate조차 grep 0.
- **Gap-2(연동 인터페이스 부재)**: Part 3-2 `CONDITIONAL` enum이 참조할 Rule Reference Interface가 이번 Part 3-5 설계로 처음 정의됨 — 코드 구현은 후속.
- **정직 부재**: Authentication/Risk/Device/Network 근접 게이트를 "Conditional Role 구현 완료"로 과신 금지 — 로그인 게이트·정적 라벨·표시용 컬럼일 뿐. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).
