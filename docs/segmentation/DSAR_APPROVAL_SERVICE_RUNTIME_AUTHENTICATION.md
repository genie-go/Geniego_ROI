# DSAR — Runtime Authentication 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Runtime Authentication · 스펙 §19)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · 외부 벤더 자격증명 ≠ 내부 identity(ADR D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §19 Runtime Authentication은 비인간 주체의 인증 상태를 **Valid · Expired · Revoked · Unknown** 4상태 통합 열거형으로 판정하는 계층이다. EXISTING_IMPLEMENTATION §9가 firsthand로 확인한 바, 통합 4상태 열거형은 grep 0이나, api_key의 `is_active`(bool)+`expires_at`(string) 두 필드로 인증 게이트가 실제로 동작하고 있어(index.php 인증 미들웨어) 4축 전체가 ABSENT인 다른 편들과 달리 **PARTIAL**로 판정한다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | authentication id | Runtime Authentication 판정 식별자 |
| 2 | service identity id | 대상 비인간 주체(api_key) |
| 3 | authentication state | 아래 §3 열거형 |
| 4 | checked at | 게이트 검사 시각(현재는 매 요청) |
| 5 | source fields | 판정에 쓰인 원본 필드(is_active/expires_at) |

## 3. 열거형 / 타입

**Runtime Authentication State**(스펙 §19 원문): `VALID` · `EXPIRED` · `REVOKED` · `UNKNOWN`

## 4. 실 substrate 매핑 (PARTIAL — 이분 게이트가 4상태 중 2상태에 근접)

| Runtime Authentication State | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| VALID | `is_active=1` AND `expires_at` 미도래 AND sha256 조회 성공 | `index.php:502-508,518-520` | **근접** — 통과 시 요청 계속 진행(암묵적 VALID), 단 별도 상태값으로 반환/기록되지 않음 |
| EXPIRED | `expires_at` 도래 시 요청 거부 | `index.php:518-520` | **근접** — 거부 사유가 코드상 분기되나(만료 체크), VALID/REVOKED와 구분되는 명시적 상태 코드로 응답되는지는 ground-truth 인용 범위 밖(에러 응답 바디 상세는 EXISTING_IMPLEMENTATION·DUPLICATE_AUDIT에 인용 없음) |
| REVOKED | `is_active=0`(rotate 시 기존 키 비활성화, revoke API) | `Keys.php:135-148`(revoke)·`Keys.php:150-187`(rotate 시 기존 is_active=0) | **근접** — is_active=0으로 조회 실패 처리되나, EXPIRED와 **동일한 `is_active` 판정 경로에 있지 않고 별도 필드**이므로 Runtime Authentication이 요구하는 "REVOKED를 EXPIRED와 구분하는 통합 열거형"은 아님(EXISTING_IMPLEMENTATION §9: "is_active(bool)+expires_at(string) 두 필드뿐") |
| UNKNOWN | 없음 — 조회 실패(존재하지 않는 키)와 REVOKED(is_active=0)를 구분하는 별도 상태 없음 | — | **ABSENT** — ADR D-2 "UNKNOWN Permit 금지"는 이 상태 자체가 설계되어 있지 않다는 뜻이며, 현재는 UNKNOWN이 아니라 fail-closed(거부)로 처리되는 것으로 보이나 명시적 UNKNOWN 상태 코드 자체는 grep 0 |

## 5. 설계 원칙

- ★유일하게 PARTIAL 판정을 받는 편 — `is_active`+`expires_at`이라는 **두 개의 원시 bool/timestamp 필드**로 VALID/EXPIRED/REVOKED 3상태에 개별 근접하지만, 이들을 하나의 통합 4상태 열거형(스펙 §19)으로 **명시적으로 표현·반환하는 코드는 없다** — "필드 조합으로 동작은 하지만 열거형은 없다"는 것이 정확한 판정이다.
- ADR §D-2 "UNKNOWN Permit 금지"를 "UNKNOWN 상태가 이미 구현되어 거부되고 있다"로 오판하지 않는다 — UNKNOWN이라는 **상태 자체가 설계에 없으므로**, 현재 동작(존재하지 않는 키=거부)이 "UNKNOWN을 fail-closed 처리한 결과"인지 "단순 조회 실패 분기"인지는 구분되지 않는다. 신설 시 이 구분을 명시적으로 설계해야 한다.
- REVOKED와 EXPIRED가 코드상 **같은 `is_active` 판정 결과로 수렴**하지 않도록(현재는 별도 필드이므로 이미 분리되어 있음을 재확인) — 신설 통합 열거형은 이 두 필드를 소스로 재사용하되 병렬 신규 상태 저장 컬럼 신설 금지(Golden Rule).
- api_key 2경로(Keys.php `/v421/keys` vs UserAuth.php `/auth/api-keys`)가 동일 `is_active`/`expires_at` 필드를 공유하므로(ADR §D-1), Runtime Authentication 통합 열거형은 이 2경로 모두에 적용되어야 한다(DUPLICATE_AUDIT §D-1 감사 비대칭과 별개로 인증 판정 자체는 동일 테이블 공유).

## 6. Gap / BLOCKED_PREREQUISITE

- 4상태 중 VALID/EXPIRED/REVOKED 3상태는 원시 필드 조합으로 개별 근접(PARTIAL), UNKNOWN은 상태 자체 ABSENT, 통합 열거형 표현은 4상태 전체 ABSENT.
- Runtime Authentication을 Runtime Trust(§18 별편)의 AUTHENTICATION 요소로 결합하는 로직 = 순신규.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
