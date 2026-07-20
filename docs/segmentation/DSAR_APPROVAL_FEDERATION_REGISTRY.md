# DSAR — Authorization Federation Registry (Part 3-18 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §1·§2)

**Authorization Federation Registry**는 서로 독립적으로 인가(authorization)를 결정하는 복수의 **도메인(domain)** 과 그 사이의 **파트너·신뢰 관계**를 중앙에서 등록·조회·수명주기 관리하는 정본(system-of-record)이다. 계약 요소:

- **Domain Entry**: `domain_id`(전역 유일)·kind·issuer·PDP endpoint·상태(active/suspended/revoked)·등록 주체.
- **Partner Link**: 도메인쌍 사이의 관계 레코드(방향·범위·유효기간·승인 이력).
- **Trust Anchor**: 도메인의 신뢰 근거(서명키·인증서·검증 메타)를 registry가 참조.
- **Lifecycle**: register → verify → activate → suspend → revoke, 각 전이는 감사 로그로 append-only 기록.

Registry는 **결정 엔진이 아니라 발견(discovery)·해석(resolution) 계층**이다. 실제 인가 판정은 별도 PDP(Part 3-18 §8 Trust Engine 이후)가 수행하며, registry는 "어떤 도메인·파트너·신뢰가 존재하며 유효한가"만 소유한다.

## 2. 실존 substrate 매핑

| 계약 구성요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Federation Domain Registry | **ABSENT** | grep 0 — federation 도메인 레지스트리 테이블/핸들러 없음 |
| Partner Link 레코드 | **ABSENT** | grep 0 — cross-org 파트너 링크 없음 |
| Trust Anchor 저장소 | **ABSENT** | grep 0 |
| 최근접: 3계층 위임 콘솔 | **PARTIAL** | `AgencyPortal.php:56-81`(agency→client 관계 구조·플랫폼 **내부**) |
| 최근접: 위임 승인 경로 | **PARTIAL** | `AgencyPortal.php:317`(요청)·`AgencyPortal.php:416`(owner 승인) |
| 감사 append-only 기반 | PRESENT(재사용) | `SecurityAudit.php:14-67`(해시체인 append)·`:118`(verify) |
| 공개 경로/베이스패스 처리 | PRESENT | `index.php:619`(tenant 해석)·`:78-89`(public bypass) |

현행 최근접인 `AgencyPortal.php:56-81`의 3계층 구조는 **단일 GeniegoROI 플랫폼 내부의 대행사↔클라이언트 위임**이며, 독립 인가 도메인을 등록·연합하는 registry가 아니다. cross-domain federation registry는 전무하다(grep 0).

## 3. 설계 계약 (규칙)

1. **단일 정본**: 도메인·파트너·신뢰 존재성은 Registry만 소유한다. PDP·SSO·AgencyPortal은 registry를 조회할 뿐 자체 사본을 갖지 않는다(중복 인텔리전스 금지).
2. **Fail-closed 해석**: registry에 active로 등록되지 않은 domain_id·partner link는 인가 판정에서 **Unknown=Deny**로 취급.
3. **Append-only lifecycle**: 모든 등록/상태 전이는 `SecurityAudit.php:14-67` 체인에 기록하고 `:118` verify 대상에 포함한다(장식 아님).
4. **AgencyPortal 확장(EXTEND)**: 기존 `AgencyPortal.php:56-81` 위임 구조를 registry의 domain kind `internal-agency`로 흡수하되, 재구현하지 않고 참조로 연결한다.
5. **테넌트 격리 유지**: registry 자체는 플랫폼 전역이나, 각 domain entry는 소유 tenant를 명시하고 `index.php:619` tenant 해석과 정합한다.

## 4. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** Federation Domain/Partner/Trust 중앙 레지스트리는 **순신설(ABSENT·grep 0)**. 실 기반은 감사 체인(`SecurityAudit.php:14-67`)·tenant 해석(`index.php:619`)뿐이며, 최근접 AgencyPortal 3계층(`AgencyPortal.php:56-81`)은 단일 플랫폼 내부 위임으로 federation registry가 아니다. 코드 변경 0 — 실 구현은 선행 SPEC 승인 후 별도 세션.
