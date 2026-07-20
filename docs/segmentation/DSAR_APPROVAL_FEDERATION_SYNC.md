# DSAR — Federation Synchronization (Part 3-18 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_SYNC`는 §14 Federation Synchronization으로, 연합에 참여하는 도메인들이 **정책·메타데이터·신뢰·인증서·키·컨텍스트를 최신 상태로 동기화**시키는 계층이다. federation authz/PDP/PEP가 결정·집행을 담당한다면, sync는 그 결정에 쓰이는 **상태의 최신성·일관성**을 보장한다. SPEC §14 최소 구성요소:

- **Policy Sync**: 도메인 간 정책 문서·버전 벡터 동기화·stale 정책 거부.
- **Metadata Sync**: 도메인 identity·엔드포인트·capability 메타데이터 동기화.
- **Trust Sync**: trust level·trust anchor 변경 전파.
- **Certificate Sync**: 인증서 발급·폐기(CRL/OCSP) 상태 동기화.
- **Key Sync**: 서명/암호화 키 롤오버·회전 전파.
- **Context Sync**: 결정 컨텍스트(세션·위임 상태) 동기화.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| 스키마 자가치유 upsert | `Db.php:942-955`,`:961-973` ensureTables 패턴 | KEEP(로컬 지속화 도구) |
| 감사 상태 기록 | `SecurityAudit.php:14-67` append-only·`:56` verify | KEEP(로컬 기록) |
| 라우트 등록 패턴 | `routes.php:925-942`,`:1605` | KEEP(로컬 배선) |
| Policy/Trust/Certificate/Key/Context Sync | 없음(grep 0) | **ABSENT** |
| 커머스 sync(별도 도메인) | `ChannelSync.php:378-479` 채널 동기화 | KEEP_SEPARATE |

**도메인 간 federation sync는 grep 0으로 전무**하다. 현행에는 정책/메타/신뢰/인증서/키/컨텍스트를 도메인 간에 동기화하는 어떤 경로도 없다. `Db.php:942-955`,`:961-973` 자가치유 upsert와 `SecurityAudit.php:14-67` 해시체인은 **로컬 상태 지속화·기록 도구**일 뿐 연합 동기화가 아니다. ★핵심 오탐 회피: `ChannelSync.php:378-479`(커머스 채널 동기화)·`DataExport.php:131-156`(데이터 반출)는 상품/주문/데이터의 동기화이지 **authz federation sync가 아니다** — KEEP_SEPARATE.

## 3. 설계 계약 (신설 대상)

- **PolicySync**: 정책 버전 벡터·수신 시각을 `Db.php:942-955`,`:961-973` 패턴으로 지속화. stale=거부.
- **MetadataSync**: 도메인 identity·엔드포인트·capability를 인증 경로로 교환. 미서명=드롭.
- **TrustSync**: trust level 변경을 즉시 전파. 하향(신뢰 강등)은 fail-closed 우선 적용.
- **CertificateSync**: 인증서 폐기(CRL/OCSP) 상태 전파. 폐기 인증서=즉시 거부.
- **KeySync**: 서명/암호화 키 롤오버 전파. 이전 키 grace window 후 폐기.
- **ContextSync**: 위임·세션 상태 전파. 모든 sync 이벤트는 `SecurityAudit.php:14-67`(`:56` verify) 해시체인 기록. 라우트는 `routes.php:925-942` 패턴(`/api` 접두 필수).

## 4. KEEP_SEPARATE

- **커머스 sync**: `ChannelSync.php:378-479`는 상품/주문 채널 동기화 — authz federation sync **아님**. 절대 삼키지 않는다.
- **데이터 export**: `DataExport.php:131-156`는 데이터 반출 경로 — federation sync 아님. 별도.
- **로컬 지속화**: `Db.php:942-955`,`:961-973`는 도구로 재사용하되 그 자체는 연합 동기화가 아니다.

## 5. 판정

**ABSENT** — 도메인 간 정책/메타/신뢰/인증서/키/컨텍스트 sync grep 0. 현행은 로컬 지속화 도구(`Db.php:942-955`,`:961-973`)·로컬 감사 기록(`SecurityAudit.php:14-67`)뿐이며 연합 동기화 경로 없음. ★커머스 sync(`ChannelSync.php:378-479`)·데이터 export(`DataExport.php:131-156`)는 authz federation sync가 아니므로 KEEP_SEPARATE. 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 federation contract·trust anchor·key infra 부재). 실 구현은 별도 승인 세션.
