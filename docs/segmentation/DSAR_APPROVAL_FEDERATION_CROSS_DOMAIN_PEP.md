# DSAR — Cross-Domain Policy Enforcement Point (Part 3-18 §18)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_CROSS_DOMAIN_PEP`는 §18 Cross-Domain Policy Enforcement Point로, cross-domain PDP의 결정을 **실제 요청 경로에서 집행**하는 강제점이다. 로컬 PEP가 자기 프로세스 입구에서만 막는 것과 달리, cross-domain PEP는 원격 호출·게이트웨이·서비스 메시 경계에서도 동일 결정을 집행한다. SPEC §18 최소 구성요소:

- **Local Enforcement**: 자기 도메인 라우트 입구에서 결정 집행(현행 미들웨어 재사용).
- **Remote Enforcement**: 원격 도메인으로 나가는/들어오는 호출에 결정을 집행.
- **Shared Resource Enforcement**: 공동 리소스 접근 시 양측 PEP가 일관 집행.
- **API Gateway Enforcement**: 게이트웨이 계층에서 하위 서비스 대신 선행 집행.
- **Service Mesh Enforcement**: 서비스 간 mTLS/sidecar 경계에서 정책 집행.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| Local Enforcement | `index.php:573-597` RBAC 미들웨어·`:604-606`,`:619` 강제 | KEEP(로컬 PEP) |
| 공개경로 bypass 목록 | `index.php:78-89` public paths·`:103-123` auth 분기 | KEEP(로컬 게이트) |
| 인증 키 검증 | `index.php:110-115`,`:117-121` Bearer/api_key 해석 | KEEP(로컬 인증) |
| per-request 재검증 근접 | `AgencyPortal.php:416` 매요청 재검증·`:432` approved 강제·`:497-501` | 근접(단일 도메인 PEP) |
| Remote/Gateway/Mesh Enforcement | 없음(grep 0) | **ABSENT** |

**로컬 PEP는 실재**한다 — `index.php:573-597`·`:604-606`·`:619` RBAC 미들웨어가 모든 비공개 라우트를 막고, public bypass 목록(`:78-89`)·Bearer/api_key 해석(`:110-115`,`:117-121`)이 강제점을 구성한다. AgencyPortal은 매 요청 approved 재검증(`AgencyPortal.php:416`,`:432`)으로 도메인 경계 근접 PEP를 갖는다. 그러나 이는 **단일 플랫폼 프로세스 입구 집행**이며, 원격 호출·API 게이트웨이·서비스 메시 경계 집행은 grep 0으로 전무하다. 따라서 **PARTIAL**.

## 3. 설계 계약 (신설 대상)

- **로컬 재사용**: `index.php:573-619` 미들웨어를 base PEP로 유지 — 대체 금지.
- **RemoteEnforcement**: 도메인 간 호출에 cross-domain PDP 결정을 삽입. AgencyPortal 재검증 패턴(`AgencyPortal.php:416`,`:432`)을 원격 경계로 일반화. 결정 없음/stale=fail-closed.
- **GatewayEnforcement**: 게이트웨이가 하위 서비스 대신 선행 집행. bypass 목록(`index.php:78-89`)은 게이트웨이에서도 동일 소스로 강제(설정 drift 금지).
- **MeshEnforcement**: 서비스 간 경계에서 주체 identity·decision 전파·검증.
- **감사**: 모든 원격 집행 allow/deny는 `SecurityAudit.php:14-67`(`:56` verify) 해시체인에 기록. 라우트 배선은 `routes.php:925-942`·`:1605` 패턴 준수(`/api` 접두 필수).

## 4. KEEP_SEPARATE

- **로컬 PEP**: `index.php:573-619`,`:78-89`는 단일 도메인 강제점 — cross-domain PEP가 대체하지 않고 확장한다.
- **커머스 동기화**: `ChannelSync.php:378-479`는 채널 집행이지 authz PEP 아님. 별도.
- **OAuth/OpenPlatform**: `OAuth.php:369`·`OpenPlatform.php:39`,`:41`는 외부 인증/공개 API 경계로 별도.

## 5. 판정

**PARTIAL** — 로컬 PEP는 실재(`index.php:78-89`,`:573-619`)하고 AgencyPortal per-request 재검증(`AgencyPortal.php:416`,`:432`)이 단일 도메인 경계를 막으나, Remote/Gateway/Mesh 집행은 grep 0. 로컬 PEP를 원격/게이트웨이/mesh 집행으로 확장하는 순신설(remote enforcement). 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 cross-domain PDP·trust anchor 부재). 실 구현은 별도 승인 세션.
