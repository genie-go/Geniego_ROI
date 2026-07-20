# DSAR — Authorization Federation Static Lint (Part 3-18 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_STATIC_LINT(§29)

Federation Static Lint는 **연합 구성(설정·계약·메타데이터·인증서·채널)이 배포 이전(build/CI 시점)에 안전 규칙을 위반하지 않는지 정적으로 검사**하는 계약이다. §28 Runtime Guard가 요청 시점 방어라면, §29는 그보다 앞선 형상(configuration) 방어다 — 위험한 연합 구성이 아예 프로덕션에 도달하지 못하게 한다. 본 §29는 6개 lint 규칙을 규정한다.

- **Missing Trust Rule** — 파트너를 등록했으나 신뢰 판정 규칙(trust policy)이 비어 있음.
- **Missing Certificate Validation** — 인증서 검증 없이 파트너 assertion을 수용하도록 구성됨.
- **Hardcoded Partner** — 파트너 도메인/엔드포인트/키가 코드·설정에 하드코딩(레지스트리 미경유).
- **Invalid Metadata** — 메타데이터 스키마 위반·필수 필드 결손.
- **Missing Contract** — 연합 관계에 계약 레코드가 결여.
- **Unencrypted Federation Channel** — 파트너 간 컨텍스트 교환 채널이 암호화 미강제.

계약상 Static Lint 위반은 **CI 게이트 실패**(배포 차단)로 표면화된다. 경고가 아니라 하드 실패다.

## 2. Substrate 매핑

| SPEC 개념(§29) | 현행 substrate | 상태 |
|---|---|---|
| Certificate Validation 존재 확인 | IdP cert 소비(`EnterpriseAuth.php:596-623`·`:597-598`) | baseline — SAML IdP 인증서를 소비, 그러나 정적 lint 규칙 아님 |
| 채널 암호화 primitive | `Crypto.php:108`·`:113-114`·`:133`(AES-256-GCM) | 암호화 수단 존재, 강제 lint 규칙 부재 |
| 설정 로딩 지점 | SAML 설정 소비(`EnterpriseAuth.php:522-543`·`:522`) | 파트너 설정 substrate proto, 검증 lint 아님 |
| Missing Trust Rule/Hardcoded Partner/Invalid Metadata/Missing Contract/Unencrypted Channel lint | 부재 | **ABSENT (grep 0)** |

## 3. 설계 계약

- **LintRule 세트** — 6개 규칙을 CI 정적 검사기로 구현. 각 규칙은 `{rule_id, severity(ERROR), locus, remediation}` 산출. 위반 1건 이상 → CI 실패.
- **Certificate Validation 재사용** — Missing Certificate Validation lint는 `EnterpriseAuth.php:596-623`의 IdP cert 소비 경로가 파트너 구성마다 배선되었는지 정적 확인. 검증 로직 신설 금지, 배선 존재 여부만 lint.
- **Hardcoded Partner** — 파트너 식별자가 레지스트리(계약 레코드)를 경유하는지 검사, 리터럴 도메인/키 발견 시 ERROR.
- **Unencrypted Channel** — 교환 채널이 `Crypto.php:108`·`:113-114` 암호화 primitive를 경유하도록 강제, 평문 경로 발견 시 ERROR.
- **Fail-closed** — lint 판정 불능(구성 파싱 실패) 자체를 ERROR로 취급, 통과 처리 금지.

## 4. KEEP_SEPARATE

- **OpenPlatform HMAC**(`OpenPlatform.php:39`·`:41`·`:394`) — API 소비자 서명이며 파트너 연합 계약이 아님. lint 대상 아님.
- **OAuth 콜백**(`OAuth.php:24`·`:369`) — 소셜 로그인 콜백 설정. federation 채널 lint와 무관.

## 5. 판정

**ABSENT** — federation static lint 6종 규칙 grep 0. Certificate Validation은 `EnterpriseAuth.php:596-623`(IdP cert 소비)가 baseline으로 존재하나 이는 런타임 소비이지 배포 전 정적 검사 규칙이 아니다. 암호화 primitive(`Crypto.php:108`·`:113-114`·`:133`)는 존재하나 채널 강제 lint는 부재. §29 lint 세트 전체 순신설(CI 게이트). **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(파트너 계약·메타데이터 레지스트리 substrate 부재로 검사 대상 미완).
