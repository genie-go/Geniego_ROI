# DSAR — Authorization Federation Contract (Part 3-18 §10 Contract Manager)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_CONTRACT`는 두 개 이상의 **독립 권한 도메인**(Authorization Domain) 사이에서 승인·권한 위임을 성립시키는 **Partner Agreement**의 정본 계약 객체다. SPEC §10 Contract Manager가 규정하는 최소 구성요소:

- **Partner Agreement**: federation 상대 도메인의 신원(domain_id)·발효/종료 상태·서명 주체.
- **Authorization Scope**: 상대 도메인에 위임되는(또는 상대로부터 수용되는) 권한/스코프의 명시적 화이트리스트. 미열거=거부(fail-closed).
- **Data Sharing Policy**: federation 경로로 흐르는 주체/속성/감사 데이터의 공유 등급·목적 제한.
- **SLA**: 정책 동기화 지연·응답 시한·가용성 계약.
- **Expiration / Renewal**: 계약 만료 시각·자동 갱신 여부·갱신 실패 시 fail-closed 강등.

federation contract는 **단일 테넌트 내부 RBAC 계약이 아니라 도메인 대 도메인 계약**이라는 점에서 기존 substrate와 근본적으로 다르다.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| Partner Agreement 링크 | `AgencyPortal.php:56-81` agency_client_link(대행사↔클라이언트 단일 위임 링크) | 근접·단일도메인 |
| Authorization Scope | `AgencyPortal.php:432` write-scope 재검증(approved 게이트) | 근접·write 한정 |
| 링크 진입/승인 | `AgencyPortal.php:32`,`:317`,`:367`,`:390`,`:404`,`:416` | 근접·1:N 콘솔 |
| 로컬 authz 정책 | `TeamPermissions.php:695` 로컬 PDP | KEEP(도메인 내부) |
| federation contract 엔진 | 없음(grep 0) | **ABSENT** |

**최근접**: agency_client_link의 scope_json(`AgencyPortal.php:56-81`)과 write-scope 재검증(`:432`)은 "한 대행사가 여러 클라이언트를 대신 조작"하는 **단일 GeniegoROI 도메인 내부의 위임 링크**다. 도메인 경계를 넘는 Partner Agreement·SLA·Expiration/Renewal·Data Sharing Policy는 어디에도 없다.

## 3. 설계 계약 (신설 대상)

- **FederationContract(도메인쌍 정본)**: {local_domain, remote_domain, status, effective_at, expires_at, renewal_policy}. append-only 이력은 `SecurityAudit.php:14-67`(`:56` verify) 해시체인을 재사용해 계약 발효/종료를 tamper-evident 기록.
- **Authorization Scope 바인딩**: 위임 스코프는 명시 화이트리스트, 미열거는 거부. 로컬 강제점은 `TeamPermissions.php:695` PDP 앞단에 federation gate로 삽입(로컬 PDP 대체 아님·전치).
- **Data Sharing Policy**: federation 반출 데이터 등급 태깅. 반출 시 `Crypto.php:108`,`:121`,`:125` 암호화 봉투 재사용.
- **Expiration/Renewal**: expires_at 경과=계약 무효, 위임 스코프 즉시 fail-closed 강등(갱신 성공 전까지 거부).

## 4. KEEP_SEPARATE

- **커머스 채널 계약/레지스트리**: 채널 contract·상품 계약은 별도 커머스 도메인(`ChannelCreds.php:586-620`·`Connectors.php:133-181`·`ChannelSync.php:378-479`). authz federation contract와 통합 금지.
- **커머스 자격증명**: `ChannelCreds.php:25`,`:311`,`:336`·`OAuth.php:24`,`:42-46`,`:369` — 외부 벤더 인증 토큰. federation contract가 아님.
- **PG**: `Paddle.php:19`,`:49` 결제 계약. 별도.

## 5. 판정

**ABSENT** — Authorization Federation Contract 엔진은 grep 0으로 전무. 최근접인 agency_client_link scope(`AgencyPortal.php:56-81`,`:432`)는 단일도메인 위임 링크이며 도메인 경계·SLA·Expiration/Renewal·Data Sharing Policy가 없다. 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 federation identity/trust anchor 부재). 실 구현은 별도 승인 세션.
