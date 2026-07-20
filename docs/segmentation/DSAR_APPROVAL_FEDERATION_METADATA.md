# DSAR — Authorization Federation Metadata Manager (Part 3-18 §11 Metadata Manager)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_METADATA`는 federation 상대 도메인의 **연결 메타데이터**를 관리하는 §11 Metadata Manager다. Policy Federation(§7)·Contract(§10)이 성립하려면 상대 도메인의 **who/where/how**를 신뢰 가능하게 알아야 한다. SPEC §11 최소 구성요소:

- **Domain Metadata**: federation 도메인 식별자·발행자(issuer)·표시명.
- **Endpoint**: 정책/승인 교환 엔드포인트 URL(inbound/outbound).
- **Public Keys**: 상대 도메인 서명 검증용 공개키(키 롤오버 포함).
- **Certificates**: 신뢰 앵커 인증서·체인 검증.
- **Protocols**: 지원 federation 프로토콜/버전(SAML/OIDC 등 교환 규약).
- **Version**: 메타데이터 문서 버전·발행 시각·만료.

핵심 차이: 현행은 **단일 IdP metadata**(우리가 소비하는 하나의 신원공급자)만 다루지만, federation metadata manager는 **다수 대등 도메인의 메타데이터 교환·검증**을 요구한다.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| Domain Metadata | `EnterpriseAuth.php:43-54` sso_config(단일 IdP) | PARTIAL·단일 |
| SAML Metadata 발행 | `EnterpriseAuth.php:307` samlMetadata·`:521-543`,`:575-626` | PARTIAL·SP측 단일 |
| Public Keys / 서명검증 | `EnterpriseAuth.php:443-465`,`:483`,`:596-623`,`:597-598` | PARTIAL·IdP 검증 |
| 인증서/암호봉투 | `Crypto.php:108`,`:121`,`:125`,`:133`,`:148` | 재사용 가능 |
| Protocols(교환규약) | SAML/SSO 단일방향 소비 | PARTIAL |
| 다도메인 metadata exchange | 없음(grep 0) | **ABSENT(확장부)** |

**최근접이자 실재**: sso_config(`EnterpriseAuth.php:43-54`)·samlMetadata 발행(`:307`)·SAML 응답 서명 검증(`:443-465`,`:596-623`)은 **하나의 IdP를 소비하는 단일 방향 metadata**다. Public Key·Certificate·Protocol 처리 로직이 이미 존재하므로 federation metadata는 **순전한 신설이 아니라 이 단일 IdP 파이프라인을 다도메인 교환으로 확장**하는 형태다.

## 3. 설계 계약 (신설 대상 — 확장)

- **FederationMetadata(도메인별 정본)**: {domain_id, issuer, endpoints, public_keys[], certificates[], protocols[], version, expires_at}. `EnterpriseAuth.php:43-54` sso_config 스키마를 다도메인 배열로 일반화(단일 IdP → N 도메인).
- **Public Key/Cert 검증 재사용**: SAML 서명 검증 경로(`EnterpriseAuth.php:443-465`,`:596-623`,`:597-598`)와 `Crypto.php:133`,`:148` 서명 검증을 federation 메타데이터 서명 검증에 재사용. 검증 실패=신뢰 앵커 거부.
- **Metadata Exchange**: outbound는 `EnterpriseAuth.php:307` samlMetadata 발행 패턴 확장(우리 도메인 메타 게시), inbound는 상대 메타 수신·검증·저장(`Db.php:942-955` 스키마 자가치유 재사용).
- **Version/Expiry**: 메타데이터 만료·키 롤오버 시 stale 거부. 이력은 `SecurityAudit.php:14-67`(`:56` verify) 해시체인.

## 4. KEEP_SEPARATE

- **커머스 자격증명 메타**: `ChannelCreds.php:586-620`·`OAuth.php:24`,`:42-46`,`:369`는 벤더 인증 메타 — federation authz metadata 아님. 별도.
- **커머스 커넥터 레지스트리**: `Connectors.php:133-181`·`ChannelSync.php:378-479` 별도 도메인.
- **PG·데이터 반출**: `Paddle.php:19`,`:49`·`DataExport.php:131-156` 별도.

## 5. 판정

**PARTIAL** — 단일 IdP metadata(`EnterpriseAuth.php:43-54` sso_config·`:307` samlMetadata·`:443-465`/`:596-623` 서명검증)는 실재하나 **다수 대등 도메인 metadata 교환은 grep 0으로 부재**. federation metadata manager는 기존 단일 IdP 파이프라인을 다도메인 교환으로 확장하는 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 contract·policy engine 부재). 실 구현은 별도 승인 세션.
