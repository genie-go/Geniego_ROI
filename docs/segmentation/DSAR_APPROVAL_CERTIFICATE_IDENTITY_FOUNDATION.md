# DSAR — Certificate Identity Foundation (06-A-03-02-03-03 · §34)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§34 Certificate Identity Foundation** — 클라이언트 인증서/mTLS 기반 신원의 참조 계약. 필수 필드:
`cert registry id` · `subject / issuer ref`(주체·발급자 참조) · `serial digest`(일련번호 다이제스트) · `validity`(유효기간) · `revocation`(폐기 상태·CRL/OCSP 참조) · `key usage` · `client / principal binding`(클라이언트·주체 결합) · `cert AAL` · `verification time`.

★ **Private Key 저장 금지.** 인증서의 private key는 절대 저장하지 않으며, `serial digest`·subject/issuer 참조·revocation 상태·검증 결과만 보존(§5.7). Method Registry(§19) `CLIENT_CERTIFICATE_REF`/`MTLS`로 등록.

## 2. 기존 구현 대조

- **부재(순신규)** — GROUND_TRUTH §2 인증표: mTLS/Client Cert **ABSENT**(grep 무). client certificate·serial·CRL/OCSP·mTLS 검증 코드 no hits.
- **인접 인증서 자산은 SAML idp_cert 뿐(다른 목적)** — SAML `ds:Signature` C14N+RSA-SHA256 검증(`EnterpriseAuth.php:271-283`)에서 IdP **공개키 인증서**를 assertion 서명 검증에 사용하나(GROUND_TRUTH §2 "idp_cert 평문(공개키)"), 이는 **IdP 서명 검증용**이지 클라이언트 인증서 신원(mTLS)이 아니다. subject/serial/revocation을 principal에 결합하는 §34 계약과 무관.
- **client/principal binding 부재** — 인증서 subject를 canonical principal에 매핑하고 revocation을 반영하는 구조체 전무. cert AAL 개념 없음.

## 3. 판정

- **Verdict: ABSENT(순신규)** — Certificate/mTLS 클라이언트 신원 구현 전무. SAML IdP 공개키(`EnterpriseAuth.php:271-283`)는 서명 검증 전용으로 KEEP_SEPARATE(§34 대체 아님).
- **선행 의존**: §3.2 Authentication Foundation의 mTLS/CA Provider 부재 + §3.3 Decision Binding ABSENT.
- **cover: 0** — Certificate Identity 커버 없음. SAML 서명검증 인증서 처리(`EnterpriseAuth.php:271-283`)만 인접 참조(목적 상이).

## 4. 확장·구현 방향 (설계)

- **순신규 Certificate Identity Foundation** — `cert registry id`·`subject/issuer ref`·`serial digest`·`validity`·`revocation`·`key usage`·`client/principal binding`·`cert AAL`·`verification time`을 Reference 모델로 신설. Method Registry(§19)에 `CLIENT_CERTIFICATE_REF`/`MTLS` 등록.
- ★ **Private Key 비저장 Mandatory Control** — private key 절대 저장 금지(§5.7·§62 Lint). serial digest·subject/issuer 참조·revocation 상태·검증 결과만.
- **revocation 반영** — CRL/OCSP 참조로 폐기된 인증서 Commit 차단(§30·§55). client/principal binding으로 인증서 subject↔canonical principal 매핑.
- **SAML idp_cert(`EnterpriseAuth.php:271-283`)와 분리 유지** — 서명검증용 공개키 처리는 재사용 substrate로 참고하되, 클라이언트 인증서 신원 레지스트리는 KEEP_SEPARATE(§66).
- **선행 필수**: mTLS/CA Provider + Decision Binding 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_WEBAUTHN_FIDO_PASSKEY_FOUNDATION]] · [[DSAR_APPROVAL_DEVICE_IDENTITY_REGISTRY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
