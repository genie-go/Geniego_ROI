# DSAR — Governance Federation Gateway (Part 3-24 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §17)

Governance Federation Gateway는 외부 거버넌스 권위와의 **연합(federation) 경계**에서 신뢰·프로토콜·의미를 변환한다. SPEC이 요구하는 5개 하위 계약:

- **Federation** — 외부 권위 도메인과의 신뢰 관계 수립·유지(연합 멤버십).
- **Protocol Adaptation** — 이종 프로토콜(SAML/OIDC/SCIM/커스텀) 간 변환.
- **Context Translation** — 외부 subject/claim을 내부 권한 컨텍스트로 사상.
- **Policy Translation** — 외부 정책 표현을 내부 정책 모델로 변환.
- **Security Validation** — 연합 유입 주장(assertion)의 서명·발급자·만료·재생 검증.

## 2. Substrate 매핑

| SPEC §17 계약 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Federation Gateway | 부재(연합 게이트웨이 grep 0) | — | ABSENT |
| Protocol Adaptation | 부재(다중 프로토콜 어댑터 없음) | — | ABSENT |
| Context Translation | 테넌트 SSO 컨텍스트 수립(local, group→role 부분) | `EnterpriseAuth.php:43-53` | local만 |
| Policy Translation | 부재 | — | ABSENT |
| Security Validation | 테넌트 SSO 검증 경로(local) | `EnterpriseAuth.php:20-24` | local만 |
| (참고) 조직 경계 접근 | 대행사 포털(매요청 재검증, local) | `AgencyPortal.php:64-71` | local만 |

현행 연합 관련 자산은 전부 **로컬 경계 내부**다. `EnterpriseAuth.php:43-53`은 테넌트 SSO의 컨텍스트 수립(그룹→롤 부분 배선 포함)이고 `EnterpriseAuth.php:20-24`는 그 검증 경로이나, 둘 다 **단일 IdP↔단일 테넌트** local 흐름이다. `AgencyPortal.php:64-71`의 대행사 접근도 매요청 approved 재검증의 local 계약으로, 연합 프로토콜 변환(protocol adaptation)·외부 정책 변환 계층이 아니다 — federation gateway는 grep 0.

## 3. 설계 계약 (신설 대상)

1. **Federation Registry** — 신뢰 외부 권위 `{issuer, protocol, jwks/metadata, trust_level}` 등록.
2. **Protocol Adapter 계층** — SAML/OIDC/SCIM 입력을 내부 정규 assertion으로 변환(순신설 — 현행 단일 로컬 SSO 확장 아님).
3. **Context/Policy Translator** — 외부 claim/policy → 내부 subject·scope·정책 모델 사상; 미매핑 claim은 fail-closed.
4. **Security Validation 파이프라인** — 서명·발급자 화이트리스트·aud·exp·nonce(재생 방지). `EnterpriseAuth.php:20-24` local 검증을 참조 패턴으로 하되 연합 경계용으로 신설.
5. **감사** — 연합 유입/변환 결정 append-only 기록(`SecurityAudit.php:27` hook 지점).

## 4. KEEP_SEPARATE

- **테넌트 SSO** — `EnterpriseAuth.php:43-53`·`:20-24`. 단일 IdP↔테넌트 local 인증으로, 다중 외부 권위 연합 게이트웨이가 아니다. Gateway는 이를 참조하되 흡수하지 않음.
- **대행사 포털** — `AgencyPortal.php:64-71`. 조직 간 local 접근 계약(매요청 재검증)이며 protocol adaptation 계층과 무관 → KEEP_SEPARATE.

## 5. 판정

**ABSENT — greenfield(federation gateway grep 0).** 현행 연합 자산은 테넌트 SSO(`EnterpriseAuth.php:43-53`·`:20-24`)·대행사(`AgencyPortal.php:64-71`) 전부 **local만**. Protocol adaptation·Policy translation·다중 외부 권위 federation 계층은 substrate 없음 → **순신설**. 미매핑 claim/policy는 fail-closed 원칙. 선행 부재로 **BLOCKED_PREREQUISITE**, 코드 변경 0, NOT_CERTIFIED.
