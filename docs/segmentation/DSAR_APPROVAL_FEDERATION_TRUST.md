# DSAR — Authorization Federation Trust Model (Part 3-18 §4·§8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §4 Trust Model·§8 Trust Engine)

**Federation Trust Model**은 두 인가 도메인 사이 신뢰의 성격·강도·범위·수명을 정형화하고, **Trust Engine**이 이를 런타임에 평가하여 cross-domain 인가를 허용/차단한다. 계약 요소:

- **Trust Level** — none / conditional / verified / full 등 단계.
- **Trust Direction** — 단방향(A→B) / 상호(A↔B).
- **Trust Scope** — 신뢰가 미치는 리소스·액션 범위.
- **Trust Duration** — 유효기간·갱신 정책.
- **Trust Certificate** — 신뢰 근거 서명·인증서·검증 메타.
- **Trust Policy / Constraints** — 조건부 신뢰의 제약(시간·IP·MFA 등).
- **Trust Engine** — 위 요소 + reputation을 종합해 **Trust Score** 산출, 임계 미달 시 fail-closed.

Trust Model은 §1 Registry의 trust anchor·§2 Partner Link를 입력으로 하며, 인가 판정 직전 최종 게이트다.

## 2. 실존 substrate 매핑

| 계약 구성요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Trust Level/Direction/Scope | **ABSENT** | grep 0 — authz trust 모델 없음 |
| Trust Duration/Certificate | **ABSENT** | grep 0 |
| Trust Policy/Constraints | **ABSENT** | grep 0 |
| Trust Score/reputation | **ABSENT** | grep 0 (authz 맥락) |
| 최근접: owner 승인 링크 | **PARTIAL** | `AgencyPortal.php:367`(owner 승인이 위임 신뢰의 수동 seed) |
| 외부 IdP 토큰 검증 seed | **PARTIAL** | `EnterpriseAuth.php:522-543`(JWT 서명/issuer 검증)·`:536`·`:538-541` |
| 암호 검증 기반(재사용) | PRESENT | `Crypto.php:45-74`·`:113-114`(서명/복호 기반) |

authz cross-domain trust 모델·Trust Engine·Trust Score는 전무(grep 0). 최근접은 두 가지뿐이다: (1) `AgencyPortal.php:367`의 **owner 수동 승인**이 위임 신뢰의 seed이나 정형 Trust Level/Scope/Duration이 없다, (2) `EnterpriseAuth.php:522-543`의 **외부 IdP JWT 검증**이 issuer/서명 신뢰의 기술 seed이나 federation trust 정책으로 승격돼 있지 않다. 둘 다 Trust Engine이 아니다.

## 3. 설계 계약 (규칙)

1. **Fail-closed 임계**: Trust Score가 도메인쌍 정책 임계 미만이면 cross-domain 인가 Deny(Unknown≠Trusted).
2. **Direction 명시**: 단방향 신뢰는 역방향 인가를 부여하지 않는다 — `AgencyPortal.php:367` 단방향 승인을 상호 신뢰로 오해석 금지.
3. **Certificate 검증 EXTEND**: 기존 JWT 검증(`EnterpriseAuth.php:522-543`)과 `Crypto.php:45-74` 서명 기반을 Trust Certificate 검증에 재사용 — 재구현 금지.
4. **감사 기록**: Trust 평가 결과·거부는 `SecurityAudit.php:14-67`에 append, `:118` verify 대상.
5. **Constraints 정합**: 조건부 신뢰의 시간/IP/MFA 제약은 기존 인증 컨텍스트와 정합하되 별도 신규 엔진 난립 금지(단일 Trust Engine).

## 4. KEEP_SEPARATE — ★데이터/ML trust ≠ authz trust

- **DataTrust**(`DataPlatform.php:281`) — 데이터 품질·신뢰도 스코어. authz 도메인 신뢰 아님.
- **GraphScore**(`GraphScore.php:31`·`:242`) — 마케팅/식별 그래프 스코어. authz trust 아님.
- **trustpilot/reviews**(`Reviews.php:20`) — 리뷰 평판. authz trust 아님.

위 3종은 "trust" 문자열 동음이의로, federation Trust Model에 흡수·병합 금지(중복 인텔리전스 금지).

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** Trust Level/Direction/Scope/Duration/Certificate/Policy·Trust Engine·Trust Score는 **순신설(ABSENT·grep 0)**. 실 seed는 owner 수동 승인(`AgencyPortal.php:367`)과 외부 IdP JWT 검증(`EnterpriseAuth.php:522-543`)뿐이며, DataTrust/GraphScore/trustpilot은 KEEP_SEPARATE(데이터·ML trust). 코드 변경 0 — 실 구현은 선행 Registry(§1)·Partner(§2) 승인 후 별도 세션.
