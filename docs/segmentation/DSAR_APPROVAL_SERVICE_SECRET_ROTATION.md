# DSAR — Approval Service Secret Rotation (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Secret Rotation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: Require Rotation(운영 시 강제) · rotate 함수 실재≠rotation policy 실재(구분 필수) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Secret Rotation은 스펙 §12가 정의하는 시크릿 생애주기 통제(Rotation·Expiration·Version·Revocation·Audit)이다. ADR §1·D-1·ground-truth §4·D-4는 현행 시스템에 **rotate "함수"는 3개 실재**(api_key·KEK·SCIM 토큰)하지만 **rotation "정책"(스케줄/자동워커/강제 만료상한)은 전무**하다고 확정한다. 본 엔티티는 "관리자가 수동으로 회전 버튼을 누를 수 있다"는 것과 "시크릿이 정책에 따라 자동으로 회전을 강제받는다"는 것이 다른 계층임을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_secret_rotation_id` | Secret Rotation 레코드 식별자(PK) |
| `secret_ref` | 회전 대상 시크릿 참조(api_key/KEK/SCIM 토큰 등 재사용) |
| `governance_action` | §12 열거(Rotation/Expiration/Version/Revocation/Audit) |
| `rotation_trigger` | `MANUAL_ADMIN`(현행 전 항목) / `SCHEDULED`(순신규, 현행 0건) |
| `audit_recorded` | 회전 시 감사 기록 여부(현행 경로별 비대칭 — D-1) |

## 3. 열거형 / 타입

- **`governance_action`**(스펙 §12 verbatim, 5종): `Secret Rotation` · `Expiration` · `Version` · `Revocation` · `Audit`.
- **`rotation_trigger`**(비스펙·정직 구분용): `MANUAL_ADMIN` · `SCHEDULED`.

## 4. 실 substrate 매핑 (PARTIAL(수동만)/ABSENT·ground-truth만 인용)

| 스펙 §12 항목 | 판정 | 실 substrate (file:line) |
|---|---|---|
| api_key Rotation(수동) | **PARTIAL/PRESENT** | `Keys.php:150-187`(기존 is_active=0+신규 생성·role/scope/expires 승계·**수동 HTTP만**) |
| KEK Rotation(무파괴·수동) | **PARTIAL/PRESENT** | `Crypto.php:133-148`(`rotateKek`)·admin 라우트 `routes.php:920`→`EnterpriseAuth.php:466-473` |
| SCIM 토큰 Rotation(수동) | **PARTIAL/PRESENT** | `EnterpriseAuth.php:917` |
| Revocation(api_key) | **PRESENT** | `Keys.php:135-148`(is_active=0) |
| Version(KEK만) | **PARTIAL** | `Crypto.php:23-24`(KEK 버전 관리)·api_key는 회전=신규 row(버전 개념 아님) |
| Expiration(api_key) | **PARTIAL(강제 상한 없음)** | `expires_at`(생성 시 클라 지정·**강제 max TTL 없음**)·게이트 검사 `index.php:518-520` |
| Audit(회전 시 기록) | **비대칭(경로 의존)** | `/auth/api-keys`(`UserAuth.php:4375`) 감사 REAL vs `/v421/keys`(`Keys.php:150-187`) 감사 grep 0(중복감사 D-1) |
| Scheduled/자동 Rotation | **ABSENT** | bin 35 cron grep 0(§4)·bin 33 cron grep 0(D-4) |
| oauth client_secret Rotation | **ABSENT** | rotate 대상 목록에 미포함(§4) |

★ground-truth §4 원문: "api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`·무파괴·admin 수동 `routes.php:920`→`EnterpriseAuth.php:466-473`)·SCIM 토큰 회전(`EnterpriseAuth.php:917`). 전부 수동 HTTP·자동/주기 스케줄 부재(bin 35 cron grep 0)." D-4 원문: "api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`)·SCIM(`EnterpriseAuth.php:917`) 전부 수동 admin. 강제 스케줄/자동회전 워커/만료상한 부재(bin 33 cron grep 0)."

## 5. 설계 원칙

1. **api_key/KEK/SCIM rotate 3개 함수를 Rotation Adapter의 실행부(Execution Layer)로 재사용(확장)** — 신규 회전 실행 로직 재구현 금지. 3개 경로를 단일 Rotation Policy 계층이 호출하는 구조로 조립.
2. **"함수 실재"와 "정책 실재"를 항상 분리 표기** — `rotation_trigger=MANUAL_ADMIN`을 기본값으로 하고, 스케줄러 배선 완료 시에만 `SCHEDULED`로 전환(회귀 방지 게이트).
3. **api_key 2경로 감사 비대칭(D-1)을 Secret Rotation 감사 통합의 선결 과제로 등재** — `/v421/keys` 경로에 감사 배선 없이 Rotation Policy를 얹으면 감사 사각지대가 정책 계층까지 전파됨.
4. **강제 max TTL·Expiration 상한은 순신규** — 현행 `expires_at`은 클라이언트가 임의 지정 가능한 값일 뿐 시스템이 강제하는 상한이 아님(과신 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Secret Rotation Policy가 Service Identity Registry·Permission Engine과 결합되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(스케줄러 부재)**: bin cron 전수(35개/33개, 두 ground-truth 문서 각각 인용)에 자동 회전 워커 grep 0 — 신규.
- **Gap-2(강제 상한 부재)**: api_key `expires_at` 강제 max TTL 없음 — Rotation Policy가 상한을 강제하려면 신규 검증 로직 필요.
- **Gap-3(감사 비대칭)**: `Keys.php` 경로 회전/폐기 감사 0건 — 통합 전 선결 수정 필요(단, 이번 차수는 설계만·수정 아님).
- **Gap-4(client_secret 회전 미포함)**: OAuth `oidc_client_secret` 회전 함수 자체가 rotate 목록에 없음(별도 Gap — [`DSAR_APPROVAL_SERVICE_OAUTH_GOVERNANCE`](DSAR_APPROVAL_SERVICE_OAUTH_GOVERNANCE.md) 참조).
- **정직 부재**: rotate 함수 3개가 실재한다고 해서 "Secret Rotation 거버넌스가 갖춰졌다"고 과신 금지 — 수동 실행부(Execution)와 정책(Policy/Schedule/Enforcement)은 다른 계층. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
