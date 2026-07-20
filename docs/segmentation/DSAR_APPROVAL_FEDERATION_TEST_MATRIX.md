# DSAR — Authorization Federation Test Matrix (Part 3-18 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §36 Test Matrix)

Federation 인가의 검증 매트릭스 — 6개 카테고리:

- **Unit** — Trust Engine·Routing·Metadata Exchange·Certificate Validation·Decision Broker 단위.
- **Integration** — PDP·PEP·Fabric·Zero Trust·Compliance·AI Governance 연동.
- **Performance** — 10K Domains·1M Decisions/sec·100K Trust relations·50 Regions 스케일.
- **Security** — Certificate Spoofing·Metadata Tampering·Replay·Trust Escalation·Cross-Tenant.
- **Compliance** — SAML·OAuth·OIDC·SCIM·ISO27001·NIST 800-63.
- **Regression** — 기존 인증/인가 무후퇴.

## 2. 실존 substrate 매핑

| 테스트 카테고리 | 판정 | 근거(허용목록) |
|---|---|---|
| Unit(Trust/Routing/Metadata/Cert/Broker) | **미구현** | grep 0 — 대상 엔진 전무. Cert seed만 `Crypto.php:108`·`:133`·`:148` |
| Integration(PDP/PEP/Fabric/ZT/Compliance/AI Gov) | **미구현** | grep 0 — federation PDP/PEP 부재. 로컬 PDP만 `TeamPermissions.php:715-731` |
| Performance(10K/1M/100K/50R) | **미구현** | grep 0 — §35 참조(측정 대상 부재) |
| Security · Replay | **PARTIAL(표적 존재)** | SAML replay consume/방어 `EnterpriseAuth.php:575-626`·`:597-598`(one-time 소비) |
| Security · Cross-Tenant | **PARTIAL(라이브 표적)** | tenant 격리 `index.php:619`(cross-tenant 하이재킹 회귀 표적) |
| Security · Cert Spoofing/Tampering/Trust Escalation | **미구현** | grep 0 — federation cert/trust 부재 |
| Compliance(SAML/OAuth/OIDC/SCIM) | **PARTIAL** | SSO ACS/메타 처리 `EnterpriseAuth.php:322-441`(SAML 흐름 실재)·`:521-543`(OIDC/JWT) |
| Compliance(ISO27001/NIST 800-63) | **미구현** | grep 0 — 정형 통제 매핑 부재 |
| Regression | **PARTIAL** | 기존 인증 회귀 표적 실재 `EnterpriseAuth.php:322-441`·`TeamPermissions.php:715-731` |

federation 전용 테스트 대상 대부분은 미구현(grep 0)이나, 두 축은 **라이브 회귀 표적**으로 실재한다: Replay는 SAML replay 소비 방어(`EnterpriseAuth.php:575-626`·`:597-598`)를, Cross-Tenant는 tenant 격리(`index.php:619`)를 각각 대상으로 삼을 수 있다. SAML/OIDC 흐름(`EnterpriseAuth.php:322-441`·`:521-543`)은 Compliance 회귀 표적이다.

## 3. 설계 계약 (규칙)

1. **RP-track 조건**: Unit/Integration/Performance는 대상 엔진(Trust Engine·federation PDP/PEP) 실존 후 착수 — 부재 대상 테스트는 작성 불가.
2. **라이브 표적 우선**: Replay(`EnterpriseAuth.php:575-626`·`:597-598`)·Cross-Tenant(`index.php:619`)는 federation 이전에도 회귀 스위트에 편입 — 기존 방어 무후퇴 보증.
3. **Compliance 재사용**: SAML/OIDC 준수 테스트는 기존 흐름(`EnterpriseAuth.php:322-441`·`:521-543`)을 표적으로 하고 신규 스택 도입 금지.
4. **Regression 필수**: 모든 federation 변경은 로컬 인가(`TeamPermissions.php:715-731`) 무후퇴를 회귀로 증명.
5. **감사 검증 포함**: 보안 테스트는 결과를 `SecurityAudit.php:14-67` 체인 append·verify 대상에 포함(장식 아님).

## 4. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE(미구현).** Unit/Integration/Performance·Cert Spoofing/Tampering/Trust Escalation·ISO27001/NIST 매핑은 대상 federation 엔진 부재로 **미구현(grep 0)**. 단, Replay는 SAML replay 소비 방어(`EnterpriseAuth.php:575-626`·`:597-598`), Cross-Tenant는 tenant 격리(`index.php:619`), Compliance는 SAML/OIDC 흐름(`EnterpriseAuth.php:322-441`·`:521-543`)이 각각 **라이브 회귀 표적**으로 실재한다. **RP-track 조건** — 전면 매트릭스는 선행 엔진 인증 후. 코드 변경 0.
