# DSAR — Break Glass Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §13)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: Delegated Assignment ≤ 원 Assignment Scope · Emergency Assignment = Auto Expiration + Mandatory Audit(스펙 §12) · Break Glass는 Critical/Security/DR/Financial Emergency에서만 허용(스펙 §13)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. ★★**본 편이 가장 근접 오인 위험이 높다 — 정직 판정 최우선**: 실존 `UserAuth.php:790-801,929-935,995-999` break-glass는 **로그인 인증(MFA) 우회 메커니즘**이며, 스펙 §13이 요구하는 "Snapshot·Evidence·Notification·Expiration을 갖춘 role 부여/승격 레코드"가 아니다. 이를 실 구현으로 재상표(rebrand)하지 않는다. break-glass MFA 우회 자체는 289차 BLOCKED_SECURITY 등재분(재플래그 금지).

---

## 1. 목적

Break Glass(스펙 §13) = Critical Incident·Security Incident·Disaster Recovery·Financial Emergency의 4개 카테고리에서만 허용되는 예외적 접근 절차이며, 발동 시 반드시 Audit·Snapshot·Evidence·Notification·Expiration을 수반해야 한다(스펙 원문 그대로). Emergency Assignment(§12)가 "무엇을(role) 부여하는가"라면, Break Glass는 "어떤 조건에서(4개 카테고리) 예외 절차가 허용되는가"의 게이트 축이다.

- **근접이나 정직 재분류 필요**: 이름이 동일한 실존 기능(`GENIE_BREAKGLASS_*`)이 있으나, 그 기능은 **인증 절차(MFA) 우회**이지 스펙 §13이 정의하는 "role 부여 예외 절차"가 아니다(ADR §D-5·EXISTING §7 표).

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Break Glass 하위유형 · 스펙 §13 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | break glass category | Critical Incident / Security Incident / Disaster Recovery / Financial Emergency |
| 3 | trigger reason | 발동 사유 |
| 4 | audit | 필수 감사 기록(Mandatory) |
| 5 | snapshot | 필수 발동 시점 상태 스냅샷(Mandatory) |
| 6 | evidence | 필수 근거자료(Mandatory) |
| 7 | notification | 필수 통지(Mandatory) |
| 8 | expiration | 필수 만료(Mandatory) |
| 9 | granted role reference | 부여된 role(있다면 Emergency Assignment §12와 연동) |

## 3. 열거형 / 타입

Break Glass Category(스펙 §13 원문 그대로): `Critical Incident` · `Security Incident` · `Disaster Recovery` · `Financial Emergency`. 이 4개 카테고리 **외에는 허용되지 않는다**(스펙 "…에서만 허용").

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Break Glass 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Break Glass 발동 메커니즘(근접이나 목적 상이) | `GENIE_BREAKGLASS_*` 환경변수 기반 MFA 우회 | `UserAuth.php:790-801,929-935,995-999` | ★**정직 재분류: 로그인 인증 우회이지 role 부여/승격이 아니다.** 스펙 §13이 요구하는 "예외적 role assignment"의 substrate로 오흡수 금지 — 근접 위치 인용만 허용 |
| Break Glass Category(4분류) | — | ABSENT | Critical/Security/DR/Financial Emergency 4개 카테고리 분류 필드 grep 0 — 현 break-glass는 카테고리 무관 단일 MFA 우회 스위치 |
| Audit(Mandatory) | auth.breakglass 이벤트 → SecurityAudit 기록 | `UserAuth.php:790-801,929-935,995-999`(EXISTING §7 표 "auth.breakglass→SecurityAudit") | ★근접 PARTIAL — **인증우회 이벤트**는 tamper-evident 체인(`SecurityAudit.php:56-68`)에 기록되나, 이는 "role 부여" 이벤트가 아니라 "로그인 우회" 이벤트 |
| Snapshot(Mandatory) | — | ABSENT | 발동 시점 상태 스냅샷 개념 grep 0(ADR §D-6 "Snapshot/Digest/Evidence" 전 구간 부재) |
| Notification(Mandatory) | — | ABSENT | 발동 즉시 통지 경로 grep 0 |
| Expiration(Mandatory) | — | ABSENT | break-glass 세션 자체의 자동 만료 워커 grep 0(role/permission 만료 cron 부재와 동일 결론 — EXISTING §2) |
| Financial Emergency 카테고리(근접 아날로그) | pending_approval/approveQueue | `AdminGrowth.php:1063`(EXISTING §3) | ★**Break Glass 아님** — 캠페인/가격 도메인 승인 큐이며 role 부여·긴급 예외 절차와 무관(오탐 방지 명시) |

## 5. 설계 원칙

- **명명 동일성에 현혹되지 않는다**: "break-glass"라는 동일 용어가 코드(`GENIE_BREAKGLASS_*`)와 스펙(§13)에 모두 존재하지만, 전자는 인증 우회, 후자는 role assignment 예외 절차로 목적이 다르다. Canonical Assignment 신설 시 두 개념을 병합하지 말고 "Break Glass Assignment"는 신규 role-grant 레코드로, 기존 MFA 우회는 "인증 계층 별개 기능"으로 명확히 경계를 유지한다(ADR §3 "경계 보존: …break-glass(인증우회)…는 Assignment 밖").
- **4개 카테고리 외 발동 금지는 Mandatory Control**(스펙 §13) — 카테고리 미지정 발동을 허용하지 않도록 설계.
- **Mandatory Audit/Snapshot/Evidence/Notification/Expiration 5요소 동시 충족**: 하나라도 결여된 예외 절차는 Break Glass Assignment로 인정하지 않는 fail-closed 원칙.
- **289차 BLOCKED_SECURITY 재플래그 금지**: 현 break-glass MFA 우회의 보안 처리 상태는 이미 별도 트랙에서 다뤄지고 있으며, 본 문서는 이를 재진단하지 않고 "Assignment governance 관점의 근접 substrate이자 명확히 별개 기능"으로만 기록한다.

## 6. Gap / BLOCKED_PREREQUISITE

- Break Glass Category(4분류) 결합 role assignment = **전 구간 ABSENT**.
- Snapshot·Evidence·Notification·Expiration(Mandatory 5요소 중 4개) = **ABSENT**(Audit만 근접 PARTIAL — 단 인증우회 이벤트 한정).
- 현 break-glass MFA 우회를 Break Glass Assignment 실 구현으로 재상표하는 것은 **금지**(정직 판정 위반) — 별도 신규 role-grant 레코드로 신설 필요.
- Assignment Lifecycle/Version/Approval(스펙 §6·§7·§9) = **BLOCKED_PREREQUISITE**(ADR §D-2 코드 0).
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
