# DSAR — Cross-Domain Authorization Federation (Part 3-18 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_AUTHZ`는 서로 다른 권한 도메인이 **하나의 인가 결정을 연합(federate)**시키는 §6 Cross-Domain Authorization Federation이다. 로컬 authz가 "자기 도메인 주체·자기 도메인 리소스"를 결정하는 것과 달리, federation authz는 **주체·리소스·정책이 도메인 경계를 넘는** 인가를 다룬다. SPEC §6 최소 구성요소:

- **Remote Authorization**: 요청 주체가 원격 도메인 소속일 때, 신뢰된 원격 PDP의 결정을 인용·수용.
- **Delegated Authorization**: 한 도메인이 자기 권한의 부분집합을 다른 도메인 주체에게 명시적으로 위임(상한·기간·스코프 제약).
- **Shared Authorization**: 두 도메인이 공동 소유한 리소스에 대해 양측 정책의 교집합을 결정.
- **Proxy Authorization**: 게이트웨이가 하위 서비스를 대신해 인가를 대리 판정.
- **Federated Decision**: 위 4종의 결정을 deny-overrides로 병합한 단일 최종 결정.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| 로컬 authz 결정 | `TeamPermissions.php:695` 로컬 PDP | KEEP(도메인 내부) |
| 조직 간 위임 근접 | `AgencyPortal.php:317` 대행사↔클라이언트 위임·`:416` per-request 재검증 | 근접(단일 도메인) |
| 위임 승인 게이트 | `AgencyPortal.php:429`,`:430`,`:432` approved 재검증 | 근접(단일 도메인) |
| Remote/Shared/Proxy Authorization | 없음(grep 0) | **ABSENT** |
| Federated Decision 병합 | 없음(grep 0) | **ABSENT** |

**현행 인가는 100% 로컬 PDP**(`TeamPermissions.php:695`)이며, 도메인 경계를 넘는 최근접 사례는 AgencyPortal의 대행사↔클라이언트 위임(`AgencyPortal.php:317`)과 매 요청 approved 재검증(`AgencyPortal.php:416`)뿐이다. 이는 **단일 플랫폼 도메인 내부의 테넌트 위임**이지, 이질적 신뢰 도메인 간 federated authorization이 아니다. Remote/Shared/Proxy 인가·연합 결정 병합은 grep 0으로 전무하다.

## 3. 설계 계약 (신설 대상)

- **RemoteAuthz**: 원격 주체 토큰을 trust anchor로 서명 검증 후, 원격 PDP 결정을 인용. 미검증=fail-closed 거부.
- **DelegatedAuthz**: AgencyPortal 위임 재검증 패턴(`AgencyPortal.php:432`)을 도메인 간으로 일반화 — 위임 상한·기간·스코프를 초과하면 드롭.
- **SharedAuthz**: 공동 리소스는 양측 정책의 **교집합**만 통과. 어느 한쪽 Unknown=Eligible 아님(fail-closed).
- **FederatedDecision**: 4종 결정을 **deny-overrides**로 병합. 결정 근거·연합 경로는 `SecurityAudit.php:14-67`(`:56` verify) 해시체인에 기록.
- **강제 위치**: federation authz는 로컬 PDP(`TeamPermissions.php:695`)를 **대체하지 않고** 전치 게이트로 교집합만 통과시킨다. 로컬 PEP(`index.php:573-597`,`:619`)가 최종 강제점.

## 4. KEEP_SEPARATE

- **로컬 PDP/위임**: `TeamPermissions.php:695`·`AgencyPortal.php:317`,`:416`는 단일 도메인 내부 결정·테넌트 위임 — federation authz가 삼키지 않는다.
- **커머스 동기화**: `ChannelSync.php:378-479` 채널 동기화는 authz 연합 아님. 별도.
- **데이터 export**: `DataExport.php:131-156`는 데이터 반출 경로이지 인가 연합 아님. 별도.

## 5. 판정

**ABSENT** — Remote/Delegated(도메인간)/Shared/Proxy Authorization·Federated Decision grep 0. 현행 인가는 전부 로컬 PDP(`TeamPermissions.php:695`), 최근접은 AgencyPortal 단일 도메인 위임(`AgencyPortal.php:317`,`:416`). 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 trust anchor·federation contract 부재). 실 구현은 별도 승인 세션.
