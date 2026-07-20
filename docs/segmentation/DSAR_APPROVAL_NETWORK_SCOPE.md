# DSAR — Network Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §23 Network Scope(Office · VPN · Public · Internal)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**접근 네트워크 경로(Office/VPN/Public/Internal) 단위 접근범위**를 정형화한다. 현행 CORS 설정은 브라우저 Origin 검사(요청 출처 도메인 제한)이며, 요청자의 실제 네트워크 위치(IP 대역·VPN 여부)를 판정·게이팅하지 않는다. 이 개념적 구분을 명확히 하며 순신규 엔티티로 설계한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `network_scope_code` | Network Scope 식별자 |
| `network_class` | OFFICE / VPN / PUBLIC / INTERNAL(§3) |
| `ip_range_ref` | 허용 IP 대역 참조 |
| `vpn_verification_ref` | VPN 검증 방식 참조 |

## 3. 열거형 / 타입

- **network_class**: `OFFICE` · `VPN` · `PUBLIC` · `INTERNAL`(스펙 §23 열거 그대로).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| IP/네트워크 위치 기반 접근 게이트 | — | **ABSENT** | grep 0 — EXISTING §7 "Network/IP: 부재(grep 0)" |
| CORS Origin 검사(개념 인접이나 별개) | — | **NOT_SCOPE(오분류 방지)** | EXISTING §7 "CORS Origin은 브라우저 검사지 IP 접근제어 아님" |

★CORS Origin 헤더 검사는 **브라우저가 강제하는 same-origin 정책 우회 허용 여부**를 서버가 화이트리스트로 응답하는 메커니즘이며, 서버가 요청자의 실제 IP 대역·VPN 상태를 판정하는 것이 아니다. curl/서버간 호출은 CORS의 영향을 받지 않으므로 이를 Network Scope의 substrate로 오분류하면 "네트워크로 보호된다"는 잘못된 확신을 준다(EXISTING §7 정직 배제 판정을 그대로 계승).

## 5. 설계 원칙

- Network Scope는 CORS와 물리적으로 분리된 계층으로 신설 — CORS는 브라우저 정책, Network Scope는 서버측 IP/VPN 판정(예: X-Forwarded-For 신뢰 체인 확립 후 IP allowlist).
- IP 판정 도입 시 프록시/로드밸런서 뒤에서 client IP 신뢰 체인이 먼저 확립되어야 함(현재 X-Forwarded-For 신뢰 검증 로직도 grep 대상 아님 — 선행 조사 필요, 이번 Part 범위 밖).
- VPN 검증은 3rd-party 신호(사내 VPN 게이트웨이 IP 대역 등록) 의존 — 자체 VPN 판정 로직 신설 아님.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — IP/네트워크 위치 기반 게이트 전무. CORS는 오분류 방지 대상으로 명시 배제.
- **BLOCKED_PREREQUISITE**: Client IP 신뢰 체인 확립(프록시 신뢰 검증) 선행 + Canonical Scope Registry 통합 + 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4 재플래그 금지.
