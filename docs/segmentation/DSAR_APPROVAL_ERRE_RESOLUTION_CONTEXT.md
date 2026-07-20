# DSAR — ERRE: 해석 컨텍스트 (APPROVAL_ROLE_RESOLUTION_CONTEXT)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_CONTEXT`** — ERRE 파이프라인이 매 해석 시점에 참조하는 **13요소 해석 컨텍스트**(SPEC §6) — 를 명세한다.

SPEC §6(L184~196) Context 요소:

1. Tenant
2. Organization
3. Department
4. Project
5. Session
6. Device
7. Authentication Level
8. Environment
9. Business Calendar
10. Client
11. IP Address
12. Geo Location
13. Time Zone

Context는 ERRE를 **Context-aware·Time-aware·Multi-tenant**(SPEC §0)로 만드는 입력 캡슐이며, Dynamic Evaluation(SPEC §4-6)·Constraint Projection(§4-8)·Risk Projection(§4-10)이 이를 소비한다. Digest 입력(SPEC §20)에 "Runtime Context"로 포함되어 스냅샷 버전에 바인딩된다.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 통합 Context 모델 = ABSENT

13요소를 하나의 불변 Context 객체로 캡슐화하여 파이프라인에 주입하는 실체는 부재하다. 현행은 요청 속성으로 **분산 주입**될 뿐 canonical context 모델이 없다.

### 2.2 요소별 substrate 매핑 (PARTIAL·분산)

| SPEC §6 요소 | 현행 substrate (`파일:라인`) | 판정 |
|---|---|---|
| Tenant | `auth_tenant` 주입 + `X-Tenant-Id` 강제덮어쓰기(위조차단) `index.php:608` · `authedTenant()` `UserAuth.php:409` · 모든 쿼리 `WHERE tenant_id=?` `TeamPermissions.php:202`·`:215` | PRESENT |
| Organization/Department/Project | (전용 컨텍스트 필드 부재) | ABSENT |
| Session | `userByToken()` 세션→user 로드·유휴 자동로그아웃 `UserAuth.php:249` · 세션 토큰 hash-only(P5) | PARTIAL |
| Device | ABSENT(디바이스 컨텍스트 미수집) | ABSENT |
| Authentication Level | MFA 정적 게이트 `UserAuth.php:941`(off/admin/all·risk-score 없음) | PARTIAL(정적) |
| Environment | `GENIE_STRICT_AUTH` env 게이트 `index.php:604` · demo/운영 라벨(`Db.php` envLabel 계열) | PARTIAL |
| Business Calendar | ABSENT | ABSENT |
| Client | api_key(AI경로)·세션 토큰 fallback 주입 `index.php:423` · agency `agt_` 토큰 `index.php:99` | PARTIAL |
| IP Address / Geo | ABSENT(권한 컨텍스트로 미사용) | ABSENT |
| Time Zone | ABSENT(권한 해석 컨텍스트 미반영) | ABSENT |

### 2.3 종합

13요소 중 **PRESENT 1(Tenant) · PARTIAL 4(Session·Auth Level·Environment·Client) · ABSENT 8**. Tenant 격리만 견고하며(위조차단 포함) 나머지는 부분/부재. 통합 Context 캡슐은 순신규.

### 2.4 KEEP_SEPARATE

- MFA 정적 게이트(`UserAuth.php:941`)는 Authentication Level substrate로 재활용 가능하나 **risk-score가 없는 정적 게이트**임을 명시(Ground-Truth ② §4). Risk-aware context로 오해 금지.
- `Risk.php`(churn ML)의 risk score는 마케팅 예측이지 **인증/세션 risk가 아니다** — KEEP_SEPARATE, Context Risk substrate로 인용 금지.

---

## 3. Canonical 설계 (불변 Context·Digest 바인딩)

### 3.1 불변 Context 캡슐

- 13요소를 매 해석 진입 시 **1회 스냅샷**하여 불변 객체로 고정. 파이프라인 전 단계가 동일 Context를 참조하여 결정성(SPEC §16) 보장 — 해석 도중 컨텍스트 변경 불가.
- Tenant 요소는 현행 위조차단(`index.php:608` X-Tenant-Id 강제덮어쓰기)을 계승하여 cross-tenant 하이재킹 방지.

### 3.2 Digest·Snapshot 바인딩 (SPEC §20·§18)

- Context는 Digest 입력의 "Runtime Context"(SPEC §20 L408)로 해시에 포함되어, 동일 Subject라도 Context가 다르면 다른 스냅샷 버전을 가진다.
- Cache Invalidation Trigger에 "Runtime Context 변경"(SPEC §22 L437)이 포함 — Context 변화 시 캐시 무효화·재계산.

### 3.3 Runtime Guard (SPEC §28)

- Runtime Guard는 "Unknown Runtime Context"(SPEC §28 L518)를 차단한다. 미해석 Context 요소는 fail-secure — Unknown→Deny(ADR D-4 계열).

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

Context는 파이프라인의 **횡단(cross-cutting) 입력**이다. 특히:

- Subject Resolution(§4-1)·Identity Validation(§4-2) — Session/Auth Level/Client 소비.
- Dynamic Evaluation(§4-6) — Environment/Business Calendar/Time 조건 평가.
- Constraint Projection(§4-8) — Device/Region/Network/Time constraint(SPEC §10) 판정.
- Risk Projection(§4-10) — Session/Device/Network Risk(SPEC §12) 입력.

---

## 5. 무후퇴·Extend 원칙

- ADR D-1·D-7: 현행 `authedTenant`(`UserAuth.php:409`)·`auth_tenant` 주입(`index.php:608`)의 tenant 격리·위조차단을 **파괴하지 않고** Context Tenant 요소로 승격. P1~P5 보안수정(세션 토큰 hash-only·admin SSOT)은 Session/Auth Level substrate로 재활용(재플래그 금지).
- 무후퇴: 현행 X-Tenant-Id 강제덮어쓰기 로직은 유지.

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37 완료 조건에 Context 전용 항목은 없으나, "Resolution Engine 구축"·"Constraint Calculator 구축"·"Simulation 구축"(Runtime Change 시뮬레이션·SPEC §26)의 전제로서 통합 Context 모델이 필요.
- Regression Test(SPEC §36) ABAC 항목이 Context 기반 평가를 검증.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `index.php`: `:99`(agency 토큰) · `:423`(fallback 주입) · `:604`(GENIE_STRICT_AUTH) · `:608`(auth_tenant·X-Tenant-Id 위조차단)
- `UserAuth.php`: `:249`(userByToken 세션) · `:409`(authedTenant) · `:941`(MFA 정적 게이트)
- `TeamPermissions.php`: `:202`·`:215`(tenant isolation `WHERE tenant_id=?`)
- `Db.php`(envLabel 계열·환경 라벨)
- KEEP_SEPARATE(비-권한, substrate 인용 아님): `Risk`(churn ML risk score)

**판정 요약: APPROVAL_ROLE_RESOLUTION_CONTEXT = ABSENT(통합 Context 모델). 13요소 중 PRESENT 1(Tenant)·PARTIAL 4·ABSENT 8. 불변 Context 캡슐·Digest 바인딩은 순신규.**
