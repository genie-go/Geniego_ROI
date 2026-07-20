# DSAR — B2B Partner Federation (Part 3-18 §2·§10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §2·§10)

**Partner Federation**은 서로 다른 조직(별도 인가 권위)에 속한 **B2B 파트너 도메인** 사이에서, 한 도메인의 인가 결정을 다른 도메인이 계약 범위 내에서 신뢰·수용하는 관계다. 계약 요소:

- **Partner Link**: (domain_A, domain_B) 방향쌍·허용 범위(scope)·유효기간·계약 근거.
- **Cross-Org Delegation**: 파트너 도메인 사용자가 상대 도메인 리소스에 접근할 때의 위임 규칙·상한.
- **Bilateral Approval**: 양 도메인 owner 승인이 모두 성립해야 link 활성(단방향 owner 승인만으로는 불충분).
- **Revocation Propagation**: 한쪽 revoke 시 상대 도메인 세션·토큰까지 무효 전파.

Partner Federation은 §1 Registry의 Partner Link 레코드를 소비하고, §4 Trust Model의 신뢰 검증을 전제로 한다.

## 2. 실존 substrate 매핑

| 계약 구성요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Cross-org Partner Link | **ABSENT** | grep 0 — 조직 간 파트너 연합 없음 |
| Bilateral Approval | **ABSENT** | grep 0 |
| Revocation Propagation | **ABSENT** | grep 0 |
| 최근접: intra-tenant 서브계정 | **PARTIAL** | `PartnerPortal.php:17-62`(파트너 포털 부트스트랩)·`:52-66`(서브계정 범위·**동일 tenant 내부**) |
| 최근접: agency 위임 링크 | **PARTIAL** | `AgencyPortal.php:367`(owner 승인 링크·단일도메인 위임) |
| 파트너 컨텍스트 해석 | PARTIAL | `PartnerPortal.php:27`·`:47`·`:226`(tenant 스코프 내 파트너 조회) |

현행 `PartnerPortal.php:17-62`·`:52-66`의 파트너는 **동일 tenant 내부의 서브계정** 이며, 별도 인가 권위를 가진 외부 조직이 아니다 — federation이 아니다. `AgencyPortal.php:367`의 승인 링크도 **단일 GeniegoROI 도메인 내부의 owner 위임**으로, 상호(bilateral) 조직 간 신뢰 협약이 아니다. cross-org partner federation은 전무(grep 0).

## 3. 설계 계약 (규칙)

1. **Bilateral 강제**: partner link 활성화는 양 도메인 owner 승인 성립 시에만. 단방향 `AgencyPortal.php:367` 패턴은 intra-domain 위임에만 유효하며 cross-org에 재사용 금지.
2. **Scope 상한**: 파트너 위임 범위는 §1 Registry의 link scope를 초과할 수 없다(fail-closed).
3. **Revocation 전파**: revoke는 상대 도메인 세션까지 즉시 무효화하고 `SecurityAudit.php:14-67`에 기록.
4. **PartnerPortal 분리 유지(EXTEND, 아님)**: `PartnerPortal.php:17-62`은 intra-tenant 서브계정 정본으로 그대로 유지 — cross-org federation과 명명·경계 분리(중복 구현 금지, 흡수도 금지).

## 4. KEEP_SEPARATE

- 광고/커머스 파트너 API(`AdAdapters.php`·`Connectors.php:133-181`·`OpenPlatform.php:394`)의 "partner"는 **외부 벤더 연동**으로 인가 federation과 동음이의. 흡수 금지.
- `PartnerPortal.php`(intra-tenant)와 cross-org Partner Federation은 서로 다른 계층 — 병합 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** Cross-org B2B partner federation은 **순신설(ABSENT·grep 0)**. 실존은 intra-tenant 서브계정 포털(`PartnerPortal.php:17-62`·`:52-66`)과 단일도메인 owner 위임(`AgencyPortal.php:367`)뿐이며, 어느 것도 조직 간 상호 신뢰 연합이 아니다. 코드 변경 0.
