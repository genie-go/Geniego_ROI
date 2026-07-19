# DSAR — Role Permission Precedence (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §38 Role Permission Precedence)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Permission Precedence(스펙 §38)는 Role Permission Merge(§36)가 여러 경로(Direct/Mandatory Component/Optional Component/Inherited/UI Hint)로 유입된 Permission과 Deny를 하나의 Effective 결과로 합칠 때 **어떤 소스가 어떤 소스를 이기는가**를 정형화한 14단계 Versioned Ordered Policy다. 기본 순서는 Platform/Tenant Security Explicit Deny를 최상위, Default Deny를 최하위에 두는 **Deny-first, Explicit-over-Implicit** 우선순위이며, Composite Excluded Permission·Component/Inherited Explicit Deny·Role Exclusion이 Direct/Mandatory/Optional/Inherited Allow보다 항상 우선한다. 저장소에는 이런 다단 우선순위 정책 자체가 없다 — 있는 것은 단일 fail-closed 판정(`roleOf`)과, 우선순위 개념 자체를 무력화하는 전역 우회 anti-pattern(`isAdmin` plan god flag)뿐이다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| precedence policy id | Precedence Policy PK |
| tenant id | 소속 테넌트(PLATFORM Policy는 전역) |
| hierarchy registry id | 소속 Registry(§8) 참조 |
| policy version | Versioned Policy(§38 "Versioned Policy로 관리") |
| ordered tier list | 아래 Precedence Tier enum의 순서화된 배열(1~14) |
| tie-break rule | 동일 Tier 내 복수 소스 충돌 시 해소 규칙 |
| override allowed | Tier 순서 재정의 허용 여부(기본 false — 순서 하드코딩 방지용 정책 필드이되 임의 재정렬 금지) |
| effective from / effective to | 유효 기간 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Precedence Tier**(순서 고정 1~14): `PLATFORM_SECURITY_EXPLICIT_DENY` · `TENANT_SECURITY_EXPLICIT_DENY` · `ROLE_RESTRICTION_DENY` · `COMPOSITE_EXCLUDED_PERMISSION` · `COMPONENT_EXPLICIT_DENY` · `INHERITED_EXPLICIT_DENY` · `ROLE_EXCLUSION` · `MORE_SPECIFIC_SCOPED_ALLOW` · `DIRECT_ROLE_PERMISSION` · `MANDATORY_COMPONENT_PERMISSION` · `OPTIONAL_COMPONENT_PERMISSION` · `INHERITED_ROLE_PERMISSION` · `UI_HINT` · `DEFAULT_DENY`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Precedence Tier 순서 정책 자체 | ABSENT(순신규) | Role Graph/Composite/Permission Merge 전무(GROUND_TRUTH §4) — 다단 우선순위 정책 개념 없음 |
| Tier 9 `DIRECT_ROLE_PERMISSION`(단일 판정 근접) | Role Inclusion Candidate 아님·단일 fail-closed 판정 | `roleOf` fail-closed(`TeamPermissions.php:120-131`) — 단일 role→permission 판정일 뿐 14단 Precedence Tier 비교가 아님 |
| Tier 1/2 Explicit Deny 최상위 원칙(부정 사례) | Anti-pattern(§6.5·전역 우회) | `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`) — plan='admin'이면 모든 Tier·모든 Deny를 건너뛰고 즉시 Allow. 이는 §38이 정면으로 금지하려는 사례(Deny가 최상위 Tier여야 하는데 god flag는 Deny 판정 자체를 우회) |
| Precedence Policy Version | ABSENT(순신규) | 대응 substrate 없음 |

## 5. 설계 원칙

- 14단계 순서는 스펙 §38의 고정 순서를 그대로 사용한다 — Platform/Tenant Security Explicit Deny를 항상 최상위, Default Deny를 항상 최하위에 둔다(임의 재배열 금지).
- Composite Excluded Permission(Tier 4)·Component/Inherited Explicit Deny(Tier 5~6)는 Direct/Mandatory/Optional/Inherited Allow(Tier 9~12)보다 항상 우선한다(§6.8 Explicit Deny 보존).
- `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)와 같은 전역 우회는 Precedence Tier 개념 자체를 무효화하므로, 실 Role Graph 도입 시 이 경로를 Precedence Policy 밖의 별도 anti-pattern으로 명시 격리하고 재사용 금지(오변환 금지 — plan 'admin'을 Tier 1 Deny 예외로 승격 금지).
- `roleOf` fail-closed(`TeamPermissions.php:120-131`)는 근접 참조 가능하나 단일 판정이지 순서화된 Precedence Policy가 아니므로, Precedence Tier 9 substrate로 오인·승격 금지.
- Versioned Policy로 관리하며 In-place Update 금지(§6.5) — Tier 순서 변경은 새 Policy Version 생성.

## 6. Gap / BLOCKED_PREREQUISITE

Role Permission Precedence는 **완전 ABSENT(순신규)** 판정이다. 저장소에는 다단 우선순위 비교 로직이 없으며, 근접한 것은 단일 fail-closed 판정(`roleOf`) 하나와, 오히려 Precedence 개념 자체를 무력화하는 `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`) 뿐이다(정직한 부재·반날조 — god flag를 Precedence 구현 근거로 날조 금지). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
