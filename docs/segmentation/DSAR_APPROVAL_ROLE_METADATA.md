# DSAR — Role Metadata (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role의 **서술적 메타데이터(descriptive metadata)** 를 정의한다. Metadata는 Role을 **비즈니스·기술·규제·조직 컨텍스트**에 위치시키는 부가 서술이다 — 어떤 비즈니스 역량/프로세스에 속하는가, 어느 애플리케이션/모듈/제품/기능에 걸치는가, 어떤 데이터/컴플라이언스 도메인·규제를 다루는가, 어느 코스트센터·서비스 티어에 귀속되는가, 어떤 외부 시스템과 연계되는가.

★**Metadata는 Enforcement(인가 결정)를 직접 대체하지 않는다.** Metadata는 검색·거버넌스·검토/인증 트리거·리포팅의 **컨텍스트**일 뿐, Runtime authz Identifier(Canonical Role Code)를 대신할 수 없다. 예: `data_domain=PII`는 인가 게이트가 아니라 Review/Certification 필수화와 Owner 요구를 **유발**하는 신호다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_ref` | 대상 Canonical Role(코드+버전) 참조 |
| `business_capability` | 이 Role이 지원하는 비즈니스 역량 |
| `business_process` | 관련 비즈니스 프로세스 |
| `application_ref` | 귀속/연관 애플리케이션 |
| `module_ref` | 모듈 |
| `product_ref` | 제품 |
| `feature_ref` | 기능 |
| `data_domain` | 다루는 데이터 도메인(예: PII·재무·주문·마케팅) |
| `compliance_domain` | 컴플라이언스 도메인(예: 개인정보·결제·감사) |
| `regulation_ref` | 관련 규제 참조(예: GDPR·PCI·SOX 식별자) |
| `cost_center` | 비용 귀속 코스트센터 |
| `support_tier` | 지원 티어 |
| `operational_tier` | 운영 티어 |
| `service_tier` | 서비스 티어 |
| `external_system_ref` | 연계 외부 시스템 참조 |
| `custom` | 테넌트 정의 확장 키-값(구조화·자유서술 최소화) |

## ③ 열거형

- Metadata 대부분은 **자유 참조/문자열**이나 티어·도메인은 통제 vocabulary 권장:
  - **`support_tier`/`operational_tier`/`service_tier`**: `TIER_0`(미션크리티컬) · `TIER_1` · `TIER_2` · `TIER_3` · `UNCLASSIFIED`.
  - **`data_domain`(예시 통제값)**: `PII` · `FINANCIAL` · `ORDER` · `MARKETING` · `OPERATIONAL` · `NONE`.
  - **`compliance_domain`(예시)**: `PRIVACY` · `PAYMENT` · `AUDIT` · `SECURITY` · `NONE`.
- 티어/도메인이 고위험값이면 Role Tag(HIGH_RISK/SENSITIVE_DATA·Part 3-1 Tag)·Owner(DATA_OWNER/COMPLIANCE_OWNER 필수)·Review/Certification 강화를 **유발**(Enforcement 대체 아님).

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 서술 메타데이터 전반 | — | **ABSENT** | Role에 비즈니스/기술/규제 컨텍스트 부착 개념 전무 |
| application/module/feature ref | (인접) menu×action 도메인 | `TeamPermissions.php:39,152-159`(acl menu×action) · `AdminMenu.php:247`(required_role) | 메뉴 축은 Permission 매핑 대상일 뿐 Role 메타데이터 아님 |
| data_domain / compliance_domain / regulation_ref | — | **ABSENT** | 데이터/규제 도메인 태깅 없음(단 헌법 V1~V5 Trust/Compliance는 데이터 파이프라인용·Role 메타 아님) |
| cost_center | — | **ABSENT** | 코스트센터 귀속 없음 |
| service/support/operational_tier | — | **ABSENT** | Role 티어 개념 없음 |
| external_system_ref | (인접) SSO group→role | `EnterpriseAuth.php:70-72`(`sso_group_role_map`) · `:78-88`(`roleForGroups`) | 외부 IdP 연계는 Alias/Adapter(Part 3-1 Alias)이지 Role 메타데이터 필드 아님 |
| custom | (인접) admin_menus JSON | 참조: GROUND_TRUTH §1.3(admin_menus JSON) | 메뉴 허용 목록일 뿐 Role 메타 확장 아님 |

→ Role Metadata는 **순신규**. acl menu 축·SSO map·admin_menus JSON이 인접하나 어느 것도 "Role의 비즈니스/규제/티어 컨텍스트"를 담지 않는다.

## ⑤ 설계원칙

- **Metadata ≠ Enforcement**: Metadata는 인가 결정 입력이 아니다. Runtime authz는 항상 Canonical Role Code로만 수행. `data_domain`/`tier`는 거버넌스 신호로 Review/Certification/Owner 요건을 유발하되 게이트 판정을 직접 내리지 않는다.
- **Alias/Metadata를 Runtime authz Identifier로 사용 금지**: `external_system_ref`·`custom`·티어 문자열을 인가 식별자로 쓰지 않는다(§규율). 외부 시스템 코드는 Alias(Part 3-1 Alias)로 별도 관리.
- **Golden Rule**: `application/module/feature_ref`는 신규 카탈로그를 재발명하지 말고 기존 메뉴/모듈 축(`TeamPermissions.php:39,152-159`)을 참조. `external_system_ref`는 SSO/커넥터 레지스트리를 참조.
- **Role≠Permission≠Authority≠JobTitle≠Plan**: Metadata의 `cost_center`/`tier`가 조직 컨텍스트를 서술해도 Role을 직책·Plan으로 만들지 않는다.
- **무후퇴**: Metadata 변경은 Role Version과 결합·이력 보존. 검색/리포팅이 과거 컨텍스트를 재구성 가능해야 함.

## ⑥ Gap

- **엔진 전무**: Metadata 저장·통제 vocabulary·티어→강화 유발·검색 전부 미구현(코드 0).
- **BLOCKED_PREREQUISITE (RP-002)**: `role_ref` 결속 대상인 Role Registry/Definition(Part 3-1 본체 ABSENT) 선행. `application/feature_ref`의 정본 카탈로그도 표준화 선행 필요.
- **cover: 0** — 설계 명세·NOT_CERTIFIED. 어떤 게이트/리포트도 Role Metadata를 소비하지 않는다.
- **289차 재플래그 금지**: admin_menus JSON·SSO map은 별건(각각 메뉴 허용·IAM Adapter). Metadata 부재를 그 코드의 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_TAG]] · [[DSAR_APPROVAL_ROLE_ALIAS]] · [[DSAR_APPROVAL_ROLE_OWNER]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].
