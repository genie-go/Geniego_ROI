# DSAR — Approval Organization Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Organization Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT · 부재 유형 날조 금지)

## 1. 목적

스펙 §1-8(Organization Assignment)·§3(지원 Assignment 유형에 Organization 포함)·§8(Assignment Scope에 Organization 레벨 포함) — 조직(Organization) 단위에 대한 Role 부여를 다루는 Assignment 유형이다. 본 문서는 ADR D-4 "Subject 유형·Actor Eligibility" 정직 판정에 따라, 근접해 보이는 Team 차원(`TEAM_TYPES`)이 Organization Assignment의 대체 substrate가 아님을 명확히 한다.

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문(공통) + §8 Assignment Scope의 Organization 레벨: Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Organization) · Assignment Scope(=Organization) · Assignment Owner · Assignment Status · Assignment Lifecycle · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Organization(§3).
- **Assignment Scope**(§8): Tenant · Legal Entity · **Organization** · Business Unit · Department · Project · Resource Type · Resource Instance · Region · Country · Currency · Amount · Time · Channel · Client · Device · Environment. Intersection 기본 적용.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**ABSENT — Organization Assignment 실행 substrate 자체가 ground-truth 2편에 언급 0건.** 유일하게 근접한 것은 Team 차원이며, ADR D-4가 이를 명시적으로 배제한다:

- ADR §1 전수조사 결론(D-4 대응): "Employee/External/Partner/Vendor=Team 차원(TEAM_TYPES)이지 **Subject 차원 아님**". Canonical Assignment는 Subject Type을 1급 축으로 신설하되 부재 유형을 날조하지 않는다.
- EXISTING §4 Subject 유형 표: "Employee/External/Partner/Vendor | **Team 차원만**(`TeamPermissions::TEAM_TYPES` `:44-49` partner_*)·Subject 차원 플래그/차등 없음 | partner 멤버도 동일 team_role 3값·role 부여 로직에 위험차등 0".
- ★`TEAM_TYPES`(`TeamPermissions.php:44-49`)는 **Team 엔티티의 하위 분류**(partner_* 등)이지 Organization/Business Unit/Department 등 조직 계층 엔티티가 아니다. Organization Assignment가 요구하는 조직 계층 구조·Scope Intersection(§8) 자체는 grep 매치 없음(ground-truth에 미언급 = ABSENT).

**ABSENT — 거버넌스 계층**: Registry/Definition/Version/Lifecycle/Snapshot/Evidence/Digest 전 구간 순신규(EXISTING §6 공통 부재 목록에 포함, Organization 전용 substrate 자체가 없으므로 이 목록 전체가 그대로 적용).

## 5. 설계 원칙

- ADR D-4를 그대로 적용: Organization Assignment 설계는 `TEAM_TYPES`(Team 차원)를 Organization Subject로 오흡수하지 않는다. Team 차원과 Organization 차원은 별개 축으로 분리 설계.
- Assignment Scope(§8)의 Organization 레벨은 Scope 필드로서는 스펙에 존재하나, 그 Scope를 소비할 실 Organization 엔티티/계층 구조는 순신규임을 명시.
- 부재 유형 날조 금지 원칙(ADR 반날조) — Organization Assignment는 "Team 차원이 사실상 Organization"이라는 방식으로 실재를 과장하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: 실 Organization Assignment 엔진 자체가 선행 전제(Permission Engine·Role Registry/Hierarchy·Decision Core) 이전에 조직 계층 엔티티 신설이 별도로 필요.
- **Gap**: Organization 엔티티·조직 계층 구조·Organization Scope Resolution 전부 순신규(ground-truth 미언급). Team 차원(`TEAM_TYPES`)과의 관계 정의(별개 축 vs 매핑) 설계 확정 필요.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002), 그 이전에 Organization 엔티티 자체의 순신규 설계 필요. 이번 차수는 설계 명세(코드 0).
