# DSAR — Authorization Compliance Control Library (Part 3-17 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_COMPLIANCE_CONTROL`(SPEC §4 Control Library)은 authz/보안 통제를 유형 taxonomy로 분류·영속화하는 통제 라이브러리다. 통제 유형 10종:

| # | Control 유형 | 의미 | 실존 매핑축 |
|---|---|---|---|
| 1 | Identity | 신원(계정/SSO/SCIM) | `Compliance.php:71-74` sso_config |
| 2 | Access | 접근권한 부여/회수 | `AccessReview.php` 결정축 |
| 3 | Authorization | 인가 결정(PDP/PEP) | `TeamPermissions.php:695-701` |
| 4 | Logging | 로깅 | `Compliance.php:60-87` 감사로그 카운트 |
| 5 | Audit | 감사 추적 | `SecurityAudit.php`·`UserAuth.php:4159-4168` |
| 6 | Encryption | 암호화(APP_KEY) | `Compliance.php:87` APP_KEY |
| 7 | Session | 세션 정책 | `UserAuth.php:3681-3686` mfa_policy |
| 8 | Data Protection | 데이터 보호 | `Compliance.php:78` gdpr_consent(신호 소비) |
| 9 | Network | 네트워크(SSRF/SIEM URL) | `Compliance.php:411-428` isSafeSiemUrl |
| 10 | Operational | 운영 통제 | `Mapping.php:238-291` maker-checker |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 기능 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| 14 inline control 정의 | **PARTIAL(라이브러리 아님)** | `Compliance.php:90-113` `$add()` 하드코딩 14 control(각 SOC2 TSC+ISO Annex A 태그·`:93`·`:95`·`:97`·`:99-101`·`:105`·`:107`·`:109-113`)·in-memory·요청마다 재구성(GT② §2) |
| Control 유형 taxonomy(10종) | **ABSENT** | 타입 분류 없음(GT② §2)·14 리터럴은 flat 리스트 |
| Control 영속(라이브러리) | **ABSENT** | 저장/조회/버전 없음·`Db.php:116-166` ensureTables 패턴만 재사용 |
| Control 구현상태 신호 | **PARTIAL** | `Compliance.php:60-87`·`:68-70`·`:78-82`·`:83-85` 테이블 카운트로 implemented/available 추론(`:115-120`)·flat 3버킷(GT① §A) |
| Control 이행 증적 | **PRESENT-generic** | `SecurityAudit.php:14-68` 해시체인·control-scoped 아님(GT① §B) |
| PEP/PDP 집행 대상 | **PRESENT** | `index.php:600-619` PEP·`TeamPermissions.php:624-693`·`:695-701` PDP(GT① §F) |

★핵심: 현행 14 control(`Compliance.php:90-113`)은 **정적 in-memory 리터럴**로 taxonomy·영속·버전이 없다. 이를 유형 10종 taxonomy를 가진 영속 Control Library로 **승격(PARTIAL→PRESENT)**.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§4): `control_id`·`tenant_id`·`control_type`(identity|access|authorization|logging|audit|encryption|session|data_protection|network|operational)·`name`·`implementation_status`(implemented|available|manual|absent)·`evidence_signal`·`version`·`framework_tags`(§5 매핑 위임).
- **영속 substrate**(ADR): `Db.php:116-166`·`:308-321` ensureTables 패턴으로 `compliance_control` 신규 DDL. `Compliance.php:90-113` 14 inline control을 시드 라이브러리로 **EXTEND**(하드코딩 리스트→영속 taxonomy·데이터 후퇴 금지).
- **구현상태 산출**: `Compliance.php:60-87` 실 테이블 introspection(sso_config/gdpr_consent/APP_KEY 등)을 라이브러리 status 신호로 배선·`:115-120` readiness 계산은 Control Library 기반으로 재구성.
- **증적**(§20): control 이행 증적은 `SecurityAudit::log`(`SecurityAudit.php:14-33`) 확장으로 control-scoped tamper-evident 기록·`verify()`(`:56-68`).
- **네임스페이스**: `/v424/compliance/*`(`routes.php:1108-1118`) EXTEND·`Compliance.php` 확장.
- **제약**: Tenant Isolation(`Compliance.php:198-209`)·라이브러리 쓰기 enterprise+tenantSecurityWrite(`:269-300`).

## 4. KEEP_SEPARATE (SPC "control"·데이터품질 흡수금지)

★Compliance Control ≠ SPC 관리도. `AnomalyDetection.php:2-6`·`:4-6`(μ±kσ·Western Electric 관리도)의 "Control"은 통계적 공정관리 관리도이지 authz control이 아니다(GT② §B-3). 흡수·개명 금지. 데이터품질 flag `DataPlatform.php:282-287`·`:288-291`·`:297-302`·`:305`(gdpr/pii/retention/audit ok flag→reliability_score)도 데이터-거버넌스 posture이지 authz control taxonomy가 아니다(GT② §B-1). 마케팅 `RuleEngine.php:10-12`·`AttributionEngine.php`도 control 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/PARTIAL승격 · 선행의존)

- **판정**: Control Library = **PARTIAL**(현행 14 inline control `Compliance.php:90-113` 실재하나 taxonomy/영속 없음)를 유형 10종 영속 Control Library로 **승격**. 순수 그린필드 아님·EXTEND.
- **재활용(흡수 아님·확장)**: `Compliance.php:90-113`(정본 EXTEND·시드)·`:60-87` 구현상태 introspection·`Db.php:116-166`·`:308-321` ensureTables·SecurityAudit 증적·`TeamPermissions.php:695-701`/`index.php:600-619` PDP/PEP 집행 대상.
- **KEEP_SEPARATE**: AnomalyDetection SPC 관리도·DataPlatform 데이터품질·RuleEngine/AttributionEngine 마케팅 흡수 금지.
- **선행의존**: Part 1~3-16 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0.
