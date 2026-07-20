# DSAR — Authorization Regulatory Catalog (Part 3-17 §3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_REGULATION`(SPEC §3 Regulatory Catalog)은 준수 대상 규제를 구조화 데이터모델로 등재하는 카탈로그다. 규제별 메타 8필드:

| # | 필드 | 의미 |
|---|---|---|
| 1 | Regulation ID | 규제 식별자 |
| 2 | Name | 규제 명칭(SOC2/ISO 27001/PCI/SOX/GDPR/HIPAA…) |
| 3 | Version | 규제 개정 버전 |
| 4 | Effective Date | 발효일 |
| 5 | Expiration Date | 만료/폐지일 |
| 6 | Region | 적용 지역(관할) |
| 7 | Industry | 적용 산업 |
| 8 | Mandatory | 강제/선택 여부 |

Control Mapping Engine(§5)이 Regulation→Control로 참조하는 상류 데이터모델.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 필드/기능 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| Regulation 데이터모델(ID/Version/Effective/Expiration) | **ABSENT(grep 0)** | regulation 데이터모델 전무(GT② §2). `Compliance.php:90-113`은 control 배열이지 규제 카탈로그 아님 |
| Name(규제 명칭) | **PARTIAL(정적 태그)** | `Compliance.php:93`·`:102`·`:104` SOC2 TSC·ISO Annex A 문자열 라벨만·구조화 엔티티 아님(GT② §2) |
| Region / Industry | **ABSENT(동음이의)** | `Compliance.php`의 region/industry 부재. GT② §2 — region/industry는 지오/벤치 용어이지 규제 관할 아님 |
| Mandatory / Effective·Expiration | **ABSENT** | 발효/만료·강제여부 데이터모델 전무 |
| 프레임워크 커버리지(PCI/SOX/HIPAA) | **ABSENT(grep 0)** | PCI/SOX/HIPAA grep 0(GT② §2). 현행=SOC2/ISO 정적 문자열뿐 |
| 규제-증적 연계 | **PRESENT-generic** | `Compliance.php:60-87` gdpr_consent/sso_config 카운트는 SOC2 privacy control 증거 **신호 소비만**·규제 등재 아님(GT② §B-1) |

★핵심: 현행은 SOC2 TSC/ISO Annex A를 **하드코딩 문자열 태그**(`Compliance.php:93`·`:102`·`:104`)로만 보유. Regulation ID/Version/Effective/Region/Industry/Mandatory 구조화 카탈로그는 순신설.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§3): `regulation_id`·`tenant_id`(또는 platform-global)·`name`·`version`·`effective_date`·`expiration_date`·`region`·`industry`·`mandatory`(bool)·`status`(draft|active|superseded).
- **영속 substrate**(ADR): `Db.php:116-166`·`:308-321` self-healing ensureTables 패턴으로 `compliance_regulation` 신규 DDL. `Compliance.php:93`·`:102`·`:104` 정적 SOC2/ISO 태그를 시드 규제 레코드로 **승격**(EXTEND).
- **버전·발효 규칙**: Version/Effective/Expiration로 시점별 유효 규제 세트 결정. Regulatory Change Manager(SPEC 상위)가 개정 시 superseded 전이.
- **증적 불변성**(§20): 규제 등재/개정 이벤트는 `SecurityAudit::log`(`SecurityAudit.php:14-33`) 확장으로 tamper-evident 기록.
- **네임스페이스**: `/v424/compliance/*`(`routes.php:1108-1118`) 하위로 EXTEND·`Compliance.php` 확장(신규 핸들러 금지).
- **제약**: Tenant Isolation(`Compliance.php:198-209`·`:200-206`)·규제 등재 쓰기는 enterprise+tenantSecurityWrite(`:269-300` 패턴).

## 4. KEEP_SEPARATE (프라이버시 규제·마케팅 흡수금지)

★Regulatory Catalog는 **authz/보안 규제** 카탈로그이며, 데이터주체 프라이버시 규제 처리(GT② §B-1)와 분리된다. `Dsar.php`·`GdprConsent.php`·`PreferenceCenter.php`·`LegalDoc.php`는 DSAR/consent/retention/legal-doc 프라이버시 이행 계층이지 규제 카탈로그가 아니다. ★`Compliance.php:78`·`:105-106`은 gdpr_consent 카운트를 SOC2 privacy control 증거로 **소비만**(소유 아님). 커머스 채널정책(`KrChannel.php:244-297`=정산 매핑)·마케팅 `RuleEngine.php:10-12`도 규제 카탈로그 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Regulatory Catalog 데이터모델 = **ABSENT(regulation 데이터모델 grep 0·순신설)**. 현행=SOC2 TSC/ISO Annex A 정적 문자열 태그(`Compliance.php:93`·`:102`·`:104`)만.
- **재활용(흡수 아님·확장)**: `Compliance.php`(정본 EXTEND·정적 태그→시드 규제)·`Db.php:116-166`·`:308-321` ensureTables·SecurityAudit 증적.
- **KEEP_SEPARATE**: Dsar/GdprConsent/PreferenceCenter/LegalDoc 프라이버시·KrChannel 정산·RuleEngine 마케팅 흡수 금지.
- **선행의존**: Part 1~3-16 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0.
