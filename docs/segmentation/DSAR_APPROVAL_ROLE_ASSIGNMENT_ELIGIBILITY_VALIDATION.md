# DSAR — Approval Role Assignment Eligibility Validation (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Eligibility · 스펙 §19)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §19 Assignment Eligibility는 Assignment를 **생성하기 전에** 대상 Subject가 해당 Role을 받을 자격이 있는지(Actor Type·Tenant·Organization·Position·Employment Status·Authentication Assurance·Required Membership·Required Certification)를 검증하는 능력이다. 현재 5개 실행 substrate는 **호출자(caller)의 권한**만 검증하고(예: `guardTeamWrite` 정적 team_role 게이트) **대상(target) Subject의 자격**은 검증하지 않는다 — 이 구분이 Eligibility Validation 부재의 핵심이다(GROUND_TRUTH §4 Subject 유형 커버리지 표).

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_ELIGIBILITY`(전부 신규 · 스펙 §19 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | eligibility check id | 식별자 |
| 2 | subject id / subject type | 검증 대상 |
| 3 | target role definition id | 부여하려는 Role |
| 4 | actor type 적합성 | 아래 §3 |
| 5 | tenant/organization/position 적합성 | 아래 §3 |
| 6 | employment status 적합성 | 아래 §3 |
| 7 | authentication assurance 적합성 | 아래 §3 |
| 8 | required membership 충족 여부 | 아래 §3 |
| 9 | required certification 충족 여부 | 아래 §3 |
| 10 | result | PASS/FAIL/PARTIAL |
| 11 | evidence | 판정 근거 |

## 3. 열거형 / 타입

**Eligibility Dimension**(스펙 §19 원문): `ACTOR_TYPE · TENANT · ORGANIZATION · POSITION · EMPLOYMENT_STATUS · AUTHENTICATION_ASSURANCE · REQUIRED_MEMBERSHIP · REQUIRED_CERTIFICATION`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Eligibility Dimension | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| ACTOR_TYPE | **PARTIAL(값 공간만)** | Subject 유형은 Human(app_user+team_role)·API Client(api_key)만 실재, Service Account/System Actor/Robot은 부재(GROUND_TRUTH §4). Eligibility 검증 로직 없이 값 공간만 실재 |
| TENANT | **ABSENT(교차검증 없음)** | team_role/api_key/wms_permissions/pm_task_assignees 모두 테넌트 소속 자체는 스키마상 암묵 전제이나, "이 Subject가 이 테넌트에 role을 받을 자격이 있는지" 명시 검증 로직은 grep 0 |
| ORGANIZATION / POSITION | **ABSENT** | Organization/Position 축 자체 부재. Team 차원(`TeamPermissions::TEAM_TYPES` `:44-49`)은 partner_* 등 팀 유형일 뿐 Subject의 조직상 지위가 아님 |
| EMPLOYMENT_STATUS | **ABSENT** | Employee/External/Partner/Vendor는 Team 차원(TEAM_TYPES)에만 존재하고 Subject 차원 플래그·자격 차등 없음(GROUND_TRUTH §4) |
| AUTHENTICATION_ASSURANCE | **근접이나 미적용** | break-glass MFA 우회(`UserAuth.php:790-801,929-935,995-999`)는 로그인 인증 강도 조정이지, "Assignment 생성 전 대상의 인증 강도를 자격 조건으로 검증"하는 로직이 아님(GROUND_TRUTH §7 표) |
| REQUIRED_MEMBERSHIP | **ABSENT** | 소속 그룹/멤버십 사전요건 개념 부재 |
| REQUIRED_CERTIFICATION | **ABSENT** | 자격증명/교육이수 등 사전요건 개념 부재 |

## 5. 설계 원칙

- Eligibility Validation은 **caller 권한 검증과 분리**된 축이다 — 현행 `guardTeamWrite`(`UserAuth.php:1167`)·`index.php:72-85` 미들웨어는 "이 요청을 보낸 사람이 쓸 권한이 있는가"만 판정하고 "이 요청의 대상이 이 role을 받을 자격이 있는가"는 판정하지 않는다. 신설 시 두 축을 혼동해 하나로 합치지 않는다.
- ACTOR_TYPE 값 공간(Human/API Client)은 기존 Subject 실체를 그대로 재사용하고, Service Account/System Actor/Robot을 날조하지 않는다(Part 3-4/3-6 Service/System Role 확장 시점까지 보류).
- AUTHENTICATION_ASSURANCE는 break-glass MFA 우회 로직을 **참조 패턴으로만** 재사용 가능하되(로그인 시점 인증 강도 판정 구조), break-glass 자체를 Eligibility 대체물로 오흡수하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- ACTOR_TYPE을 제외한 전 차원 = **ABSENT(순신규)**. ACTOR_TYPE도 값 공간만 있을 뿐 검증 로직은 ABSENT.
- Organization/Position/Employment Status/Membership/Certification은 저장소에 **대응 데이터 모델 자체가 없음** — Eligibility Validation 이전에 데이터 모델 신설이 선행돼야 함(BLOCKED_PREREQUISITE 이중 — Assignment Registry 본체 + 조직/직위 모델).
- 실 엔진 = 선행 Assignment Registry(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
