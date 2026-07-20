# DSAR — Approval Crypto Inventory & Inventory Manager (Part 3-23 §2·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

**Crypto Inventory & Inventory Manager**는 인가 경로가 의존하는 모든 암호 자산을 발견(discover)·카탈로그(catalog)·상태 관리하는 거버넌스 계약이다. Part 3-23의 근간(§2·§3)으로, PQC 전환의 첫 단계인 "우리가 무엇을(어떤 알고리즘·키·해시·인증서를) 어디에서 쓰는가"를 완전 목록화(Cryptographic Bill of Materials, CBOM)한다. Drift(§21)·Revalidation(§22)·Reconciliation(§23)은 모두 이 인벤토리를 baseline/비교 대상으로 삼는다.

Inventory Manager 책무:
- **Discover** — 코드/런타임 전반의 암호 사용처 자동 발견.
- **Catalog** — 자산별 알고리즘·키 길이·용도·위치·PQC 취약도 등록.
- **Classify** — 고전/PQC-취약/PQC-안전 분류 및 마이그레이션 우선순위.
- **Lifecycle** — 등록/변경/폐기 상태 전이 및 승인 연동.

## 2. Substrate 매핑 (Inventory가 discover/catalog할 실재 자산)

| 자산 유형 | 현행 SOURCE(실재 사용처) | 인용 |
|---|---|---|
| AES-256-GCM 대칭 암복호 | envelope 암호화 | `Crypto.php:108-126` |
| KEK/키 회전 | 키 소재 회전 | `Crypto.php:133-148` |
| RSA/비대칭 키 | 엔터프라이즈 인증 | `EnterpriseAuth.php:536` |
| SHA-256 해시 | 감사 해시체인 | `SecurityAudit.php:27` |
| HMAC | 커넥터 서명 | `Connectors.php:132` |
| bcrypt | 패스워드 credential | `UserAuth.php:498` |
| api_key 해시 secret | 키 저장/조회 | `Keys.php:40` |
| 약한/레거시 해시 | CRM 식별 해시 | `CRM.php:589` |
| 약한/레거시 해시 | OrderHub 식별 해시 | `OrderHub.php:992` |
| 라이브러리 선언 | crypto 의존성 | `composer.json:5-13` |

이 표가 곧 Inventory Manager가 최초 discover해야 할 **SOURCE 자산의 실재 증거**다. 자산은 존재하나 이를 하나의 카탈로그로 관리하는 인벤토리 레지스트리는 부재하다.

## 3. 설계 계약 (Design Contract)

- **CBOM 단일 소스**: 인벤토리는 위 산재 자산을 단일 카탈로그로 정규화(SSOT). 채널/핸들러별 중복 등록 금지.
- **Discover 비침습**: 발견은 정적 스캔+런타임 관측이며 SOURCE 코드(`Crypto.php:108-126`·`EnterpriseAuth.php:536` 등)를 수정하지 않는다.
- **PQC 취약도 태깅**: 각 자산에 양자 취약도(예: RSA/ECC=취약, AES-256=상대적 안전, SHA-256=해시내성) 표기하여 §22 Revalidation·§21 Drift의 baseline 제공.
- **선행 근간**: Inventory는 §21·§22·§23 전부의 선행 조건. 본 인벤토리 부재가 세 계약을 **BLOCKED_PREREQUISITE**로 만든 근원.
- **감사 연동**: 인벤토리 변경은 `SecurityAudit.php:27`·`:56-68` 해시체인 기록.

## 4. KEEP_SEPARATE

- **api_key RBAC 로직**: `Keys.php:88-96` 의 역할/스코프 인가 판정은 인벤토리 대상이 아니다. 인벤토리는 api_key의 **암호 자산 속성(해시 알고리즘·secret 저장)** 만 카탈로그하며, RBAC 접근제어 로직은 별도 도메인으로 KEEP_SEPARATE — 통합·재사용 금지.

## 5. 판정

**ABSENT-엔진 (greenfield)** — 관리 인벤토리/CBOM/Inventory Manager는 grep 0. 그러나 discover 대상 SOURCE 자산은 전부 실재한다(AES `Crypto.php:108-126`·KEK `Crypto.php:133-148`·RSA `EnterpriseAuth.php:536`·SHA-256 `SecurityAudit.php:27`·HMAC `Connectors.php:132`·bcrypt `UserAuth.php:498`·api_key `Keys.php:40`·약한해시 `CRM.php:589`·`OrderHub.php:992`). 인벤토리는 §21/§22/§23의 선행 근간이며, 그 부재가 세 계약의 **BLOCKED_PREREQUISITE** 원천이다. api_key RBAC(`Keys.php:88-96`)은 KEEP_SEPARATE. 순신설 대상. 코드 변경 0 · NOT_CERTIFIED.
