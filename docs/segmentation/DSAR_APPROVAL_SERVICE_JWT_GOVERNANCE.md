# DSAR — Approval Service JWT Governance (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: JWT Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: ★외부 벤더 JWT(Google/Snowflake) ≠ 내부 identity(오흡수 절대 금지) · Require Rotation(운영 시 강제) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

JWT Governance는 스펙 §15가 정의하는 JWT Client 통제(Issuer·Audience·Subject·Signature·Key Rotation·Expiration)이다. ADR §1·D-3·ground-truth §2·§5는 현행 시스템의 JWT 사용을 두 방향으로 정직 분리한다: **① 아웃바운드(우리→벤더)** — Google GCP 서비스계정 JWT·Snowflake 키페어 JWT는 GeniegoROI가 외부 벤더를 인증하기 위해 발급하는 자격증명이며 **내부 identity가 아니다**. **② 인바운드 소비** — OIDC JWKS를 kid로 소비해 외부 IdP가 서명한 JWT를 검증하는 경로는 실재하나, 자체 JWT 발급·Key Rotation·Governance는 갖추지 않는다. 본 엔티티는 두 방향 모두에서 "발급/검증이 실재한다"는 것과 "JWT 거버넌스(Key Rotation·통합 Issuer/Audience 레지스트리)가 실재한다"는 것을 분리한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_jwt_client_id` | JWT Governance 레코드 식별자(PK) |
| `direction` | `OUTBOUND`(우리→벤더) / `INBOUND_CONSUMED`(외부 IdP→우리, 검증만) — 정직 구분용 내부 태그, 비스펙 |
| `issuer` | §15 Issuer |
| `audience` | §15 Audience |
| `subject` | §15 Subject |
| `signature_alg` | §15 Signature(현행 RS256/ES256 혼재) |
| `key_rotation_status` | §15 Key Rotation(현행 전 항목 ABSENT) |
| `expiration_policy` | §15 Expiration(현행 TTL 캐시만, 정책 아님) |

## 3. 열거형 / 타입

- **`governance_action`**(스펙 §15 verbatim, 6종): `Issuer` · `Audience` · `Subject` · `Signature` · `Key Rotation` · `Expiration`.
- **`direction`**(비스펙·정직 구분용): `OUTBOUND` · `INBOUND_CONSUMED`.

## 4. 실 substrate 매핑 (PRESENT(발급/검증만)/ABSENT·ground-truth만 인용 · ★외부 아웃바운드 오흡수 금지)

| 스펙 §15 항목 | 방향 | 판정 | 실 substrate (file:line) |
|---|---|---|---|
| Google GCP 서비스계정 JWT | **OUTBOUND** | **PRESENT(발급만·외부 벤더 인증용)** | `Connectors.php:3781-3815`(`googleSaToken`·RS256 JWT→OAuth2·GA4) |
| Snowflake 키페어 JWT | **OUTBOUND** | **PRESENT(발급만·외부 벤더 인증용)** | `DataExport.php:130-132,550-584`(Sheets/BigQuery service_account_json·Snowflake 키페어 JWT) |
| Google/Snowflake JWT bearer 캐시 | **OUTBOUND** | **PRESENT(TTL 캐시·정책 아님)** | ground-truth §5 "1시간 TTL 캐시" |
| VAPID ES256 서명 | 내부(웹푸시 발신) | **PRESENT(발급만)** | `WebPush.php:609-610` |
| OIDC JWKS 소비(SSO 로그인) | **INBOUND_CONSUMED** | **PRESENT(검증만·kid 매칭)** | `EnterpriseAuth.php:522-531` |
| Key Rotation(전 방향) | 공통 | **ABSENT** | ground-truth §5 "회전 스케줄 ... 부재"·`SECRET_KEYS`(`DataExport.php:28`) 고정 키 저장일 뿐 회전 아님 |
| 내부 JWT 발급(Service Identity용) | 내부 | **ABSENT** | grep 0(ground-truth §2 "내부 엔티티 ... grep 0") |

★ground-truth §2 원문: "★Google GCP 서비스계정 JWT=외부 아웃바운드: `googleSaToken`(`Connectors.php:3781-3815`·GA4 RS256 JWT→OAuth2)·`DataExport.php:130-132,550-584`(Sheets/BigQuery service_account_json·Snowflake 키페어 JWT)·`SECRET_KEYS`(`DataExport.php:28`). 테넌트 등록 '우리→구글/스노우플레이크' 발신 자격증명·GeniegoROI 내부 identity/role/session 전무(내부 RBAC와 완전 분리)." §5 원문: "Google/Snowflake JWT bearer(`Connectors.php:3781-3815`·`DataExport.php:550-584`·1시간 TTL 캐시) ... 회전 스케줄 ... 전 항목 부재."

## 5. 설계 원칙

1. **Google/Snowflake JWT를 Service/System Identity Registry에 절대 오등록 금지(ADR D-3)** — Integration Adapter로 격리해 "외부 벤더가 우리를 신뢰하는 자격증명"과 "우리 내부 identity"를 구조적으로 분리. Part 3-6 전체 불변.
2. **OIDC JWKS 소비 경로(`EnterpriseAuth.php:522-531`)를 JWT Verifier substrate로 재사용(확장)** — 신규 JWKS 소비 로직 재구현 금지.
3. **VAPID(`WebPush.php:609-610`)는 내부 발신 JWT로 별도 분류** — 벤더 인증(OUTBOUND)도 아니고 사용자 로그인 JWT(내부 identity)도 아닌 웹푸시 페이로드 서명 목적. 세 갈래(OUTBOUND 벤더/INBOUND_CONSUMED SSO/내부 발신 VAPID) 혼동 금지.
4. **Key Rotation은 전 방향 순신규** — `SECRET_KEYS`(`DataExport.php:28`) 등 고정 키 저장을 "회전 갖춰짐"으로 과신 금지.
5. **내부 Service Identity 전용 JWT 발급/검증 계층은 순신규** — Service Identity Registry(D-1) 확정 후 Part 3-7 Effective Resolution이 소비할 Contract로 예약.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: JWT Governance가 Service Identity Registry·Permission Engine과 결합되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(Key Rotation 전무)**: 4개 실 substrate(Google/Snowflake/VAPID/JWKS) 전부 Key Rotation grep 0 — 순신규.
- **Gap-2(내부 JWT identity 부재)**: 내부 Service Identity가 자체 발급하는 JWT 개념 grep 0.
- **Gap-3(오흡수 리스크)**: Google/Snowflake JWT를 "이미 갖춰진 비인간 identity"로 오판정하면 가짜 녹색 — ADR D-3·본 문서 §5-1 불변 재확인.
- **정직 부재**: JWT 발급/검증(TTL 캐시 포함)이 실재한다고 해서 "JWT Governance(통합 Key Rotation·Issuer/Audience 레지스트리)가 갖춰졌다"고 과신 금지. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
