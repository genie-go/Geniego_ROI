# DSAR — Authorization Crypto Asset Inventory (Part 3-23 §2·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Crypto Asset

**APPROVAL_CRYPTO_ASSET**는 인가 도메인이 신뢰근으로 사용하는 개별 암호 자산을 인벤토리로 카탈로그하는 계약이다. 관리 대상 자산 유형: **TLS 인증서 · JWT 서명키 · OAuth/OIDC 토큰 서명 · API Key · HSM/KMS 키 참조 · DB 암호화(at-rest) · Backup 암호화 · Federation certificate**. 각 자산은 다음 속성으로 기술된다: `algorithm` · `key_length` · `expiration` · `rotation_policy` · `owner` · `criticality`.

## 2. 실존 substrate 매핑

| 자산 유형(계약) | 상태 | 근거(허용목록) |
|---|---|---|
| DB/at-rest 봉투 암호화(AES-256-GCM) | PRESENT(SOURCE) | `backend/src/Crypto.php:108-126`(암호화)·`:133-148`(복호화)·`:96-102`(KEK 로드) |
| RSA 서명(SSO/토큰 계열) | PRESENT(SOURCE) | `backend/src/Handlers/EnterpriseAuth.php:536`·`:600`(서명 검증 경로)·`:521-544` |
| 감사 무결성 해시(SHA-256) | PRESENT(SOURCE) | `backend/src/SecurityAudit.php:27`·`:35-41`(체인 append)·`:43-53` |
| API Key 자격증명(해시 저장) | PRESENT(SOURCE) | `backend/src/Handlers/Keys.php:40` · at-rest 해시 `backend/src/Handlers/UserAuth.php:4353` |
| 패스워드 해시(bcrypt) | PRESENT(SOURCE) | `backend/src/Handlers/UserAuth.php:498` |
| 커넥터 서명(HMAC) | PRESENT(SOURCE) | `backend/src/Handlers/Connectors.php:132`·`:152` |
| 통합 Crypto **Asset 인벤토리 카탈로그**(자산별 algorithm/key_length/expiration/owner/criticality 레코드) | **ABSENT** | grep 0 — 자산은 코드에 산재하나 자산 대장(엔진)은 부재 |
| HSM/KMS 참조·Federation cert·별도 TLS 자산 대장 | ABSENT | 전용 자산 레코드 부재 |

**요지**: 인가 신뢰근을 이루는 실제 crypto 자산들은 코드 전반에 **SOURCE로 실재·풍부**하다. 그러나 이들을 "관리 대상 자산"으로 등록하고 속성(만료·회전·소유자·중요도)을 부여하는 **인벤토리 카탈로그 계층은 전무**하다. PQC 마이그레이션 계획의 전제인 "무엇이 어디에 있는가"의 단일 대장이 없다.

## 3. 설계 계약(규칙)

1. **인벤토리-only**: 본 계약은 산재한 자산을 **참조·카탈로그**만 한다 — crypto 원본(`Crypto.php`·`EnterpriseAuth.php` 등)을 재구현하지 않는다(무중복·Extend).
2. **속성 자동수집**: `algorithm`·`key_length`는 실 코드에서 파생(임의값 금지). `expiration`/`rotation`은 §CRYPTO_KEY 회전정책(`Crypto.php:45-74`)과 연동.
3. **criticality**: 인가 신뢰근(RSA 서명·감사 SHA-256·api_key)은 최상위 criticality — HNDL 노출 산정 입력.
4. **무후퇴**: 자산 코드 변경 시 카탈로그 속성 실시간 동기화.
5. **테넌트 격리**: 자산 소유·범위는 테넌트 경계를 넘지 않는다.

## 4. KEEP_SEPARATE

- **api_key RBAC/역할 판정 로직**(`backend/src/Handlers/Keys.php:88-96`·`:99-113`·`:119`)은 인가 정책 엔진이지 **crypto 자산이 아니다** — 인벤토리 대상에서 제외. api_key는 "자격증명 자산"으로만 카탈로그하고, 그 권한 해석 로직은 별도 도메인.
- 비즈니스 식별키(app_setting/channel_credential)는 §CRYPTO_KEY KEEP_SEPARATE와 동일.

## 5. 판정

**NOT_CERTIFIED · SOURCE-PRESENT(자산 실재) + 카탈로그 ABSENT(순신설)**. 자산은 `Crypto.php:108-126`·`EnterpriseAuth.php:536`·`SecurityAudit.php:27`·`Keys.php:40`·`UserAuth.php:498`·`Connectors.php:132`로 풍부히 실재하나, 인벤토리 관리엔진은 grep 0. 본 DSAR은 카탈로그 계약만 규정하며 코드 변경 0.
