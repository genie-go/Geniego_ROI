# DSAR — Approval Service Certificate Governance (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Certificate Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · Require Rotation(운영 시 강제) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Certificate Governance는 스펙 §13이 정의하는 인증서 생애주기 통제(Expiration·Renewal·Rotation·Revocation·Trust Chain)이다. ADR D-2("서비스 계정도 사람보다 더 엄격")·ground-truth §5는 현행 시스템이 **SAML IdP 인증서 서명 검증**(C14N+RSA-SHA256)은 실제로 수행하지만, 그 인증서 자체의 만료 추적·갱신 알림·신뢰 체인(Trust Chain)·회전(Rotation)·폐기(Revocation) 관리는 전 항목이 존재하지 않는다(`cert_expires` grep 0)고 확정한다. 본 엔티티는 "서명을 검증하는 것"과 "인증서 생애주기를 통제하는 것"이 서로 다른 계층임을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_certificate_id` | Certificate Governance 레코드 식별자(PK) |
| `subject_identity_ref` | 인증서가 귀속된 identity(Service Identity Registry 참조 — 순신규) |
| `cert_material_ref` | 인증서 원문 저장 위치 참조(현행 `sso_config.saml_idp_cert` 재사용) |
| `governance_action` | §13 열거(Expiration/Renewal/Rotation/Revocation/Trust Chain) |
| `valid_to` | 만료 시각(현행 스키마에 컬럼 없음 — Gap) |
| `trust_chain_status` | 신뢰 체인 검증 상태(순신규) |

## 3. 열거형 / 타입

- **`governance_action`**(스펙 §13 verbatim, 5종): `Expiration` · `Renewal` · `Rotation` · `Revocation` · `Trust Chain`.
- **`verification_vs_governance`**(정직 구분용 내부 태그, 비스펙): `SIGNATURE_VERIFIED_ONLY`(현행 SAML sig 검증이 이에 해당) · `LIFECYCLE_GOVERNED`(순신규, 현행 0건).

## 4. 실 substrate 매핑 (SIGNATURE_VERIFIED_ONLY/ABSENT·ground-truth만 인용)

| 스펙 §13 항목 | 판정 | 실 substrate (file:line) |
|---|---|---|
| 서명 검증(Trust Chain의 전제 요소) | **PRESENT(검증만)** | SAML sig 검증(`EnterpriseAuth.php:268`·C14N+RSA-SHA256) |
| 인증서 저장(`sso_config.saml_idp_cert`) | **PRESENT(평문 TEXT·공개키 성격·정당)** | `EnterpriseAuth.php:49,143,268` |
| Expiration(만료 추적) | **ABSENT** | `cert_expires` grep 0(ground-truth §5) |
| Renewal(갱신 알림) | **ABSENT** | ground-truth §5 "만료 추적/갱신 알림 ... 전 항목 부재" |
| Rotation(회전 스케줄) | **ABSENT** | ground-truth §5 "회전 스케줄 ... 부재"·bin cron grep 0(§4) |
| Revocation(폐기) | **ABSENT** | 인증서 전용 revoke 경로 grep 0(ground-truth §5 범위 내 미인용) |
| Trust Chain(신뢰 체인 전체) | **ABSENT** | ground-truth §5 "trust chain ... 부재" |
| mTLS | **ABSENT** | ground-truth §5 "mTLS grep 0" |
| OIDC JWKS(관련 근접) | **PRESENT(소비만)** | `EnterpriseAuth.php:522-531`(kid 매칭·JWKS 자체호스팅 grep 0) |

★ground-truth §5 원문: "SAML sig 검증(`EnterpriseAuth.php:268`)·OIDC JWKS 소비(`:522-531` kid 매칭)·Google/Snowflake JWT bearer(`Connectors.php:3781-3815`·`DataExport.php:550-584`·1시간 TTL 캐시)·VAPID ES256(`WebPush.php:609-610`). 만료 추적/갱신 알림/trust chain/회전 스케줄·client_secret 만료 관리 전 항목 부재(cert_expires grep 0). mTLS grep 0·JWKS 자체호스팅 grep 0(소비만)." Google/Snowflake JWT bearer·VAPID는 인증서(X.509)가 아니라 JWT 서명 키이므로 본 엔티티(Certificate Governance)가 아니라 별도 [`DSAR_APPROVAL_SERVICE_JWT_GOVERNANCE`](DSAR_APPROVAL_SERVICE_JWT_GOVERNANCE.md) 범위로 분리 인용한다(오혼입 금지).

## 5. 설계 원칙

1. **`sso_config.saml_idp_cert`를 Certificate Registry의 유일한 실 substrate로 재사용(확장)** — 신규 인증서 저장 테이블 재구현 금지. 단 저장 방식(평문 TEXT)은 유지(공개키 성격이므로 D-4의 credential at-rest 통합 대상 아님, ground-truth §3 "정당" 판정 재확인).
2. **서명 검증(`EnterpriseAuth.php:268`)과 생애주기 거버넌스(Expiration/Renewal/Rotation/Revocation/Trust Chain)를 별도 계층으로 명시 분리** — 서명이 유효해도 인증서가 만료·폐기됐는지 판단하는 로직은 현재 없다는 사실을 감춰서는 안 됨.
3. **Trust Chain·CRL·OCSP·mTLS는 순신규 설계** — 근접 substrate가 grep 0이므로 조립이 아니라 신설이 될 것임을 ADR D-1에 정직 등재.
4. **Google/Snowflake JWT·VAPID를 본 엔티티에서 배제** — 이들은 X.509 인증서가 아니며 외부 아웃바운드(Google/Snowflake) 또는 별도 JWT 서명키(VAPID)이므로 Certificate Governance Registry에 오등록 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 인증서 생애주기 거버넌스가 Service Identity Registry·Permission Engine과 결합되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(Expiration 컬럼 부재)**: `sso_config.saml_idp_cert`에 만료 시각(`valid_to`) 컬럼이 ground-truth에 인용되지 않음 — Certificate Registry Adapter 신설 시 스키마 확장 필요.
- **Gap-2(Trust Chain/CRL/OCSP/mTLS 전무)**: grep 0 — 순신규 설계 대상. 근접 substrate로 과신 금지.
- **Gap-3(Renewal/Rotation/Revocation 워크플로 부재)**: rotate 함수(api_key/KEK/SCIM)는 존재하나 인증서 전용 rotate/revoke는 ground-truth에 인용 없음 — 신규.
- **정직 부재**: SAML 서명 검증이 실재한다고 해서 "인증서 거버넌스가 갖춰졌다"고 과신 금지 — 검증(Verification)과 거버넌스(Governance)는 다른 계층. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
