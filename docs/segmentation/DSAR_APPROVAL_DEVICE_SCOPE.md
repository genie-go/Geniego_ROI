# DSAR — Device Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §22 Device Scope(Managed Device · BYOD · Kiosk · Mobile · Desktop)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**접근 단말(Managed Device/BYOD/Kiosk/Mobile/Desktop) 유형에 따른 접근범위 제한**을 정형화한다. 현행 시스템은 세션에 IP/User-Agent를 관측 기록하지만, 단말을 식별·분류·신뢰수준별로 접근을 게이팅하는 계층이 없다. 순신규 엔티티.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `device_scope_code` | Device Scope 식별자 |
| `device_class` | MANAGED / BYOD / KIOSK / MOBILE / DESKTOP(§3) |
| `device_trust_level` | 단말 신뢰수준(등록/미등록/차단) |
| `device_id_ref` | 단말 식별자 참조(등록 단말 전제) |

## 3. 열거형 / 타입

- **device_class**: `MANAGED_DEVICE` · `BYOD` · `KIOSK` · `MOBILE` · `DESKTOP`(스펙 §22 열거 그대로).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Device 식별/분류/신뢰수준 게이트 | — | **ABSENT** | grep 0 — EXISTING §7 "Device: 부재(grep 0·device_id/trusted_device 0)" |
| 세션 관측 기록(인접·게이트 아님) | user-agent 기록 | **PARTIAL(관측/포렌식 기록만)** | `UserAuth.php:4243-4268`(ip/ua는 관측/포렌식 기록만) |

★세션 기록에 남는 User-Agent는 사후 감사·포렌식 목적의 관측값이며, "이 단말 유형이면 접근을 제한한다"는 사전 게이팅 로직이 아니다(EXISTING §7 "session(만료 외)=ABSENT" 항목과 동일 계열 — 변경 시 세션무효/재인증 차단 로직 grep 0).

## 5. 설계 원칙

- Device Scope는 세션 관측 기록(User-Agent)을 최초 신호로 활용할 수 있으나, 신뢰수준 판정을 위해서는 별도 Device Registry(등록/폐기/신뢰수준) 신설이 전제 — 관측 로그만으로 MANAGED/BYOD 구분 불가(신뢰할 수 없는 클라이언트 자기신고 UA는 spoof 가능).
- Kiosk/Managed Device처럼 고신뢰 단말과 BYOD/Mobile처럼 저신뢰 단말은 서로 다른 Amount Scope(§25) 상한과 결합될 수 있음(예: 고액 승인은 Managed Device에서만) — 단 이번 Part는 Reference 설계만, 결합 로직은 §26 Dynamic Scope 이후.
- 세션 무효화(단말 변경 시 재인증)는 현재 부재하며, Device Scope 실구현의 선행 조건 중 하나로 별도 등재(Session Scope와 결합 필요).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — Device 식별·분류·신뢰수준 게이트 전무. UA는 관측 기록일 뿐 게이트 아님.
- **BLOCKED_PREREQUISITE**: Device Registry 자체가 선행 신설 대상(순신규) + Canonical Scope Registry 통합 + 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4 재플래그 금지.
