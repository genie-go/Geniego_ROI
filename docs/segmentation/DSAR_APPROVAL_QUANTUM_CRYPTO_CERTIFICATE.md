# DSAR — Authorization Crypto Certificate 자산 (Part 3-23 §2·§8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2·§8)
Authorization 계층이 신뢰하는 **인증서(Certificate) 자산**을 단일 인벤토리로 등록·수명주기 관리한다. 계약 대상: (a) 외부 IdP 서명 검증 인증서, (b) 발급/서명용 키의 공개 자재(JWKS), (c) 만료·회전·폐기(revocation) 상태. **본 Part의 범위는 "인가 결정이 신뢰하는 서명 검증 자산"에 한정**하며 TLS 종단 인증서·제품 안전 인증번호는 §4로 격리한다.

## 2. Substrate 매핑
| SPEC 자산 | 현행 substrate | 상태 |
|---|---|---|
| IdP SAML 서명 인증서 소비 | `EnterpriseAuth.php:49`·`:268`·`:597`·`:598` (테넌트 SAML 설정에서 cert 읽어 assertion 서명 검증) | **소비 전용 · 관리 ABSENT** |
| 발급 키 공개 자재(JWKS) 노출 | `EnterpriseAuth.php:545-568` (JWKS 엔드포인트) · `:536` | PARTIAL(정적 노출·회전 메타 없음) |
| OIDC ID Token 서명 검증 | `EnterpriseAuth.php:521-544`·`:596`·`:600`·`:622` | 소비 전용 |
| 인증서 만료 감시 / `openssl_x509_parse` / 회전 스케줄 | (grep 0) | **ABSENT** |
| 인증서 인벤토리 / 폐기 상태 추적 | (grep 0) | **ABSENT** |

## 3. 설계 계약 (신설 대상)
- **Certificate Registry**: 자산별 {issuer, subject, notBefore, notAfter, keyUsage, fingerprint, source} 레코드. 현행은 SAML cert를 설정 문자열로 즉석 소비만 하므로(`EnterpriseAuth.php:597`) 파싱·만료·지문 무기록 → 인벤토리부터 순신설.
- **Expiry & Rotation Watch**: notAfter 임박 경보. 감사 사건은 기존 append-only 해시체인(`SecurityAudit.php:27`·`:56-68`)에 CERT_EXPIRING/CERT_ROTATED 사건으로 기입(신설 체인 금지).
- **JWKS Rotation Contract**: `EnterpriseAuth.php:545-568`가 노출하는 키셋에 kid/회전 상태 메타 부여. classical→PQC 전환 시 `Crypto.php:84-88` envelope 버전과 정합.
- **Revocation/Trust Anchor**: 소비 인증서의 폐기·신뢰앵커 검증 경로 신설.

## 4. KEEP_SEPARATE (범위 격리)
- **제품안전 인증번호 `kc_cert_no`** — `PriceOpt.php:63`·`PriceOpt.php:345`. 상품 컴플라이언스 데이터이며 암호 서명 자산이 아니다. Certificate Registry에 편입 금지.
- **TLS 종단 인증서** — 인프라(nginx/php-fpm) 계층 자산. 애플리케이션 인가 결정 substrate 아님 → 파일명 없이 인프라로 격리.
- **JWT 발급 자체** — 사용자 세션 토큰(`UserAuth.php:3886`)은 Certificate 자산이 아니라 §5(PQC Profile)/키 관리 대상.

## 5. 판정
Certificate **관리 계층 ABSENT-greenfield**. 현행은 외부 IdP·OIDC 서명 인증서를 **소비만**(`EnterpriseAuth.php:49`·`:268`·`:597`·`:598`) 하고 JWKS를 정적 노출(`:545-568`)할 뿐, 파싱·만료감시·회전·폐기·인벤토리 일체 부재(grep 0). 따라서 Certificate Registry/Expiry Watch/Rotation Contract/Revocation은 **순신설**이며 기존 코드와 중복 없음. `kc_cert_no`·TLS는 KEEP_SEPARATE. 실 구현은 PQC 라이브러리 확정 후속 세션. **코드 변경 0 · NOT_CERTIFIED.**
