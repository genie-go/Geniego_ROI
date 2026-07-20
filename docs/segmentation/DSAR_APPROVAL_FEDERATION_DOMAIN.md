# DSAR — Authorization Federation Domain Model (Part 3-18 §3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §3 Domain Model)

**Federation Domain**은 자체 identity·인가 정책·PDP를 보유한 독립 권위(authority) 단위다. Part 3-18은 다음 **도메인 종류(kind)** 를 표준 열거로 정의한다:

- **Enterprise** — 최상위 기업 권위(본사).
- **Subsidiary** — 법적으로 분리된 자회사(별도 tenant 경계·본사 정책 상속 가능).
- **Affiliate** — 지분/제휴 관계 계열.
- **Partner** — B2B 계약 파트너(§2·Part 3-18 별도 DSAR).
- **Customer** — 고객사 도메인(위임 수신).
- **Supplier** — 공급사 도메인.
- **Government** — 규제/정부 연동 도메인.
- **SaaS** — 외부 SaaS 제공자 도메인.
- **Cloud** — 클라우드 인프라 권위.
- **External IdP** — 외부 신원 공급자(OIDC/SAML).

각 도메인은 `domain_id`·kind·issuer·trust anchor 참조·상태·소유 tenant를 필드로 갖는다. 도메인 간 관계(상속·연합)는 방향성 그래프로 표현하되, 관계 존재성은 §1·§2 Registry가 소유한다.

## 2. 실존 substrate 매핑

| 도메인 kind | 판정 | 근거(허용목록) |
|---|---|---|
| Enterprise/Subsidiary/Affiliate | **ABSENT** | grep 0 — 다권위 도메인 모델 없음 |
| Partner/Customer/Supplier | **ABSENT** | grep 0 |
| Government/SaaS/Cloud | **ABSENT** | grep 0 |
| External IdP | **PARTIAL(INBOUND만)** | `EnterpriseAuth.php:322-441`(OIDC)·`:443-465`(SAML)·`:522-543`(JWT 검증) — 인바운드 SSO 소비, 도메인 권위로 모델링 안 됨 |
| 현행 단일 플랫폼 tenant | PRESENT(비-federation) | `index.php:619`(단일 tenant 해석)·`AgencyPortal.php:56-81`(내부 3계층) |

현행 시스템은 **단일 GeniegoROI 플랫폼** 이라는 하나의 권위만 존재한다. External IdP는 `EnterpriseAuth.php:322-441`(OIDC)·`:443-465`(SAML)로 **인바운드 로그인 소비**만 하며, 이를 "연합된 인가 도메인"으로 모델링한 코드는 없다(§5 EXTEND 대상이나 현재 도메인 모델 grep 0). tenant/agency(`AgencyPortal.php:56-81`·`index.php:619`)는 모두 동일 플랫폼 내부 격리 단위이지 별도 권위 도메인이 아니다.

## 3. 설계 계약 (규칙)

1. **kind 폐쇄 열거**: 도메인 종류는 위 10종 표준 열거로 고정. 임의 문자열 kind 금지(채널 나열 금지 원칙 준수).
2. **권위 경계 명시**: 각 도메인은 자체 PDP를 갖는 독립 권위로 취급 — 로컬 tenant 격리(`index.php:619`)와 혼동 금지.
3. **External IdP 승격(EXTEND)**: 기존 인바운드 SSO(`EnterpriseAuth.php:322-441`·`:443-465`)를 `External IdP` domain kind로 등록·재사용하되 재구현하지 않는다.
4. **상속 정책 fail-closed**: Subsidiary가 Enterprise 정책을 상속할 때, 상위 정책 미해석 시 Deny로 수렴.

## 4. KEEP_SEPARATE

- 커머스/광고 커넥터의 "domain"·외부 연동(`OAuth.php`·`ChannelSync.php:378-479`·`Connectors.php:133-181`)은 **데이터·마케팅 도메인**으로, 인가 federation 도메인과 동음이의. 흡수 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** Enterprise~External IdP 10종 federation 도메인 모델은 **순신설(ABSENT·grep 0)**. 실존은 인바운드 SSO 소비(`EnterpriseAuth.php:322-441`·`:443-465`)와 단일 플랫폼 tenant/agency(`AgencyPortal.php:56-81`·`index.php:619`)뿐이며, 어느 것도 다권위 도메인 모델이 아니다. 코드 변경 0.
