# DSAR — Cross-Domain Identity Federation (Part 3-18 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — Cross-Domain Identity Federation
도메인 경계를 넘어 identity를 신뢰·전파하는 거버넌스 계약. 프로토콜 표면: **SAML 2.0 / OAuth 2.0 / OIDC / SCIM 2.0 / JWT / X.509 / mTLS**. 목표=단일 정본 identity를 cross-domain으로 확장하되 **병렬 identity stack 신설 금지**.

## 2. Substrate 매핑 (현행 코드 실측)
| SPEC 프로토콜 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| OIDC (RS256/JWKS) | ID 토큰 RS256 검증·JWKS 소비 | `EnterpriseAuth.php:522-543` · `:546` | 실재 |
| SAML 2.0 | XSW(서명 래핑) 방어 포함 assertion 소비 | `EnterpriseAuth.php:575-626` · `:596-623` | 실재 |
| SCIM 2.0 | 프로비저닝 users/groups CRUD | `EnterpriseAuth.php:322-441` · `:323` · `:388` | 실재 |
| group→role 매핑 | IdP group을 내부 role로 정규화 | `EnterpriseAuth.php:443-465` · `:467` | 실재 |
| 중복0(inbound 단일) | 단일 inbound federation 진입 | `EnterpriseAuth.php:10-25` · `:19-24` | 실재 |
| JWT 발급/검증 | 세션 토큰(hash-only 저장) | `EnterpriseAuth.php:483-511` · `:513` | 실재 |
| X.509 / mTLS 클라이언트 인증 | 없음 | — | **ABSENT** |

현행 `EnterpriseAuth`는 OIDC(`:521-543`)·SAML XSW 방어(`:575-626`)·SCIM 2.0(`:322-441`)·group→role(`:443-465`)을 갖춘 **단일 inbound federation 정본**(`:10-25` "중복0")이다. cross-domain 확장과 **mTLS/X.509 클라이언트 인증**만이 빈 자리다.

## 3. 설계 계약 (확장 시)
- **Cross-Domain 확장**: 현행 inbound OIDC/SAML/SCIM 정본(`EnterpriseAuth.php:322-441`·`:521-543`·`:575-626`)을 **확장**하여 도메인 간 assertion 전파·신뢰 앵커(§12 Certificate)를 결합. ★새 identity stack 병렬 신설 절대 금지.
- **mTLS/X.509 클라이언트 인증 순신설**: 서비스↔서비스 상호인증. 클라이언트 cert 발급=§12, 개인키 보호=§13에 위임.
- **group→role cross-domain 정규화**: 기존 `:443-465` 경로를 정본으로 유지, 외부 도메인 group도 동일 경로로 흡수(중복 매핑 금지).
- federation 이벤트는 감사 append-only 체인(`SecurityAudit.php:14-67`) 기록.

## 4. KEEP_SEPARATE
- **connector_token**(`Connectors.php:133-181`) — 커넥터 OAuth 자격, human identity federation 아님.
- **SMS HMAC**(`NaverSms.php:94` · `:119`) — 발송 서명.
- **cloud export creds**(`DataExport.php:131-156`) · **OAuth 커넥터**(`OAuth.php:369`) — 데이터소스 인증, identity federation 관할 밖.

## 5. 판정
**PARTIAL-EXTEND**. OIDC RS256/JWKS(`EnterpriseAuth.php:522-543`)·SAML XSW 방어(`:575-626`)·SCIM 2.0(`:322-441`)·group→role(`:443-465`)·단일 inbound "중복0"(`:10-25`)이 실재 substrate이므로 이를 **cross-domain으로 확장**하고, **mTLS/X.509 클라이언트 인증만 순신설**. 병렬 identity stack 신설 금지. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
