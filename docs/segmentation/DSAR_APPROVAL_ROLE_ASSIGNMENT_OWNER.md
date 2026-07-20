# DSAR — Role Assignment Owner (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §1.22)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: Delegated Assignment ≤ 원 Assignment Scope · Emergency Assignment = Auto Expiration + Mandatory Audit(스펙 §12·§14) · 과거 Version 수정 금지(ADR §D-2)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. ★**용어 충돌 주의**: 스펙 §22 "Assignment Owner"는 **Assignment 레코드의 책임자/관리 주체 메타데이터 필드**를 뜻한다. 이는 team_role의 값 `'owner'`(테넌트 최고 권한 role — `UserAuth.php:1384,1441`·`EnterpriseAuth.php:405,418`에서 강등/변경대상 배제)와 **동음이의**이며 서로 다른 개념이다. 두 개념을 혼동해 인용하지 않는다.

---

## 1. 목적

Assignment Owner(스펙 §5 Assignment Definition 필드 목록 중 "Assignment Owner"·§1 항목 22)는 특정 Role Assignment **레코드**가 누구/어떤 조직 단위의 책임 하에 있는지를 나타내는 거버넌스 메타데이터다. 이는 "누가 이 Assignment를 신청/승인/관리·해지 책임을 지는가"를 가리키며, 권한을 부여받는 Subject(피할당자) 자체와는 다른 축이다. 스펙 원문에는 전용 섹션이 없어(§11/§12/§13/§14만 전용 섹션 보유) §5 필드 목록에서 파생한다.

- **순신규**: Assignment 레코드 자체가 부재(ADR §D-6)하므로, 그 레코드에 대한 소유자/책임자 메타데이터도 논리적으로 부재.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Owner 하위 · 스펙 §5에서 파생)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | assignment owner | Assignment 레코드의 책임 주체(사람/조직 단위) |
| 3 | created by | Assignment를 생성한 주체(스펙 §5) |
| 4 | approved by | Assignment를 승인한 주체(스펙 §5) |
| 5 | owner type | 개인/역할/조직 단위 등 소유자 유형 |
| 6 | ownership transfer reference | 소유권 이전 이력(있다면) |

## 3. 열거형 / 타입

전용 열거형은 스펙 원문에 없음(§5 필드 목록의 단일 필드). Owner Type은 Subject 유형(스펙 §3 — Human/Employee/External/Partner/Vendor/Service Account/API Client/Machine Identity/System Actor/Robot Account)과 동일 축 재사용이 자연스러우나, "Assignment의 소유자"와 "Assignment의 대상(Subject)"은 스펙상 별개 필드(Assignment Owner ≠ Subject ID)로 분리 설계.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Owner 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Assignment 레코드의 owner/책임자 메타데이터 | — | ABSENT | Assignment Definition 자체가 코드 0(ADR §D-6)이므로 그 필드인 Assignment Owner도 논리적 ABSENT |
| ★용어 충돌 대조군(다른 개념·오인 방지용 인용) | team_role 값 `'owner'`(테넌트 최고 권한) — 변경/강등 대상에서 항상 배제 | `UserAuth.php:1384,1441`·`EnterpriseAuth.php:405,418` | **다른 개념** — 이는 "누가 최고 권한 role을 갖는가"이지 "이 Assignment 레코드를 누가 관리하는가"가 아님. Assignment Owner 필드의 실 구현으로 인용 금지(용어 동음이의 함정) |
| 소유권 이전(ownership transfer) | — | ABSENT | EXISTING §1.1 "★소유권 이전(ownership transfer)=부재(grep 0). owner는 모든 변경대상에서 명시 배제" — team_role owner조차 이전 경로가 없음(별개 확인이나 Assignment Owner 필드 부재를 보강하는 방증) |
| Created By / Approved By(근접) | 감사 로그 actor 필드(비일관) | — | ADR §1 "감사 있음/없음 비일관"(EXISTING §5) — 일부 경로(sub-admin·apiKeys·TeamPermissions CRUD)는 actor를 감사에 기록하나, 이것이 Assignment 레코드의 구조적 owner 필드는 아님(감사 로그 ≠ 소유자 메타데이터) |

## 5. 설계 원칙

- **Assignment Owner(레코드 책임자) vs team_role='owner'(테넌트 최고 권한) vs Subject(피할당자)를 3개 별개 축으로 명확히 구분**: 셋을 동일 필드로 병합 설계하지 않는다. Canonical Assignment Definition은 `subject_id`(피할당자)와 `assignment_owner`(관리 책임자)를 별도 컬럼으로 보유해야 한다.
- **Owner 필드는 책임 소재(accountability) 목적**: 감사/이력 조회 시 "이 Assignment를 누가 책임지고 있는지"를 즉시 식별할 수 있어야 하며, 이는 단순 `created_by` 로그 문자열과 달리 구조적으로 조회 가능한 1급 필드여야 한다(현재 감사 비일관 문제 — DUPLICATE_AUDIT D-3 — 를 반복하지 않기 위함).
- **소유권 이전(ownership transfer) 경로 신설 시 team_role owner 이전 부재 교훈 반영**: EXISTING §1.1이 지적한 "owner 이전 경로 자체 부재"는 team_role 축의 실 결함이며, Assignment Owner 설계는 이를 반면교사로 삼아 이전(transfer) 연산을 Version Type(스펙 §6 — "Migration"/"Correction" 등)으로 명시 지원.

## 6. Gap / BLOCKED_PREREQUISITE

- Assignment Owner 필드 자체 = **전 구간 ABSENT**(Assignment Definition 코드 0).
- team_role `'owner'` 값과의 용어 혼동 방지 — 실 구현 인용 절대 금지(반날조 규율 핵심).
- Ownership Transfer 연산 = **ABSENT**(team_role owner 이전 부재와 별개 확인·EXISTING §1.1).
- Created By/Approved By의 구조적 Owner 필드화 = 현재 비일관 감사 로그(DUPLICATE_AUDIT D-3)를 SecurityAudit 체인으로 승격한 이후에나 통합 가능 — **BLOCKED_PREREQUISITE**.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
