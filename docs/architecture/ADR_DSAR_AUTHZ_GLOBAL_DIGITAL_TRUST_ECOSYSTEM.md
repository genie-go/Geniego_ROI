# ADR — Enterprise Authorization Global Digital Trust Ecosystem Framework (Part 3-45)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_45_GLOBAL_DIGITAL_TRUST_ECOSYSTEM_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAGDTEF_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAGDTEF_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-45는 글로벌 디지털 생태계 신뢰 상호운용을 규정한다. ★특이점: 연합/크로스조직 substrate가 비교적 강함(EnterpriseAuth·Agency/Partner) + DID/Sovereign은 미래. 본 ADR이 그 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (연합/크로스조직 substrate 재사용·중복 신설 금지)**:
  - Global Identity Federation(SAML/OAuth/OIDC/SCIM)=`EnterpriseAuth.php`(실 SSO·서명검증·Federation Metadata) 승격.
  - Cross-Organization Authorization=`AgencyPortal.php`(대행사→클라이언트 위임·agency_client_link approved·스코프)·`PartnerPortal.php`(partner_session) 승격.
  - Continuous Verification=★AgencyPortal 매 요청 `approved` 재검증 fail-closed(`index.php` agt_ 미들웨어)·세션 만료 재검증 형식화(Zero Trust 패턴).
  - Trust Score=DataTrust(`DataPlatform`·패턴)·Crypto=AES-256-GCM(Cryptographic Assurance)·Privacy=`GdprConsent`/`Dsar`/No-PII. Evidence=`SecurityAudit::verify`. Isolation=`Db.php`.
- **D-2 (형식 글로벌 Trust 순신설)**: 글로벌 Trust Registry·Digital Trust Engine·Trust Score Engine·AI Trust Advisor는 신설(grep 0).
- **D-3 (DID/Sovereign/Cross-Cloud=미래·Part 3-41 참조)**: Verifiable Credentials·Sovereign Identity·Cross-Cloud는 미래 기술(단일 호스트·미존재)·Part 3-41 참조.
- **D-4 (Immutable Trust·Certificate)**: 연합/신뢰/인증 이력=append-only `SecurityAudit::verify`. Certificate Forgery 차단.
- **D-5 (Runtime Guard=Trust 변조·위임 고착 차단)**: Cross-Tenant Trust Leakage·Federation Spoofing 차단=`Db.php` 격리·`index.php` RBAC·★[[reference_platform_growth_actas_tenant_hijack]] 교훈(위임접근 tenant 요청시점 검증·고착 방지). Trust Score=서버 집계 SSOT.

## KEEP_SEPARATE (오흡수 금지)
- DataTrust(데이터 신뢰) ≠ Digital Trust Score(파트너/조직 신뢰·패턴만 참조).
- ClaudeAI(마케팅) ≠ AI Trust Advisor(거버넌스). 제품 파트너(공급사) ≠ Trust Partner Federation(신원 연합).

## 결과 (Consequences)
- 판정 = PARTIAL-strong(EnterpriseAuth 연합·Agency/Partner 크로스조직·fail-closed 재검증·DataTrust·Crypto·Privacy substrate) / ABSENT-formal(글로벌 Trust Registry·DID/Sovereign·Cross-Cloud·AI Advisor 순신설).
- 실행 순서: 선행 Part 인증 → Global Trust Registry 신설 → EnterpriseAuth/Agency/Partner 승격 + Continuous Verification 형식화 → Trust Score/Analytics. 코드 0.
