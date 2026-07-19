# DSAR — Role Owner (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만 인용, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role 1건의 **책임 소유(accountability)를 사람/조직에 결속**하는 per-entity 구조를 정의한다. Role Definition은 "무엇을 할 수 있는가(Permission)"를 서술하지만, Owner는 "누가 이 Role의 존재·범위·위험을 책임지고 승인·검토·인증하는가"를 서술한다. Owner는 Role의 Lifecycle(Draft~Archived)·Review·Certification의 **책임 주체 참조**이며, Assignment의 대상(Subject)이 아니다.

★**핵심 강제**: 모든 **Active** Role은 최소 **Business Owner + Technical Owner + Security Owner** 3자를 필수로 가진다. Owner가 부재한 Role은 **활성화(Draft→Active) 및 Assignment가 차단**된다(fail-closed). 이는 §6.17 Mandatory Control(Role Ownership)에 속하며 고객설정으로 비활성화 불가.

Owner ≠ Assignee(Assignment 주체·Part 3-3) ≠ Approval Authority(Part 5) ≠ Actor(신원). Owner는 Role **거버넌스** 책임자이지 Role을 **행사**하는 자가 아니다.

## ② Canonical 필드

| 필드 | 설명 | 불변/가변 |
|---|---|---|
| `role_ref` | 대상 Canonical Role 참조(`{DOMAIN}:{FUNCTION}:{ROLE}` + role_version) | 불변 결속 |
| `owner_type` | 소유 유형(③ 열거형) | 불변 |
| `subject_ref` | Owner canonical subject(사람) 또는 org 참조 — Alias/Display명 저장 금지 | 가변(위임 시 이력 보존) |
| `org_ref` | Owner가 속한 조직/법인 참조 | 가변 |
| `valid_from` / `valid_to` | 소유 유효기간(open-ended 허용, 만료 시 재지정 요구) | append-only |
| `is_primary` | 동일 owner_type 내 1차 책임자 여부(escalation 최상단) | 가변 |
| `escalation_order` | 동일 owner_type 다중 소유 시 에스컬레이션 순번(정수·낮을수록 우선) | 가변 |
| `responsibilities` | 이 Owner가 지는 책임 항목(검토승인/인증서명/위험수용/예산 등 구조화 목록) | 가변 |
| `digest` | Owner 레코드 스냅샷 해시(불변 이력·변조탐지) | 불변(append-only) |

## ③ 열거형

**`owner_type`** (필수 소유 유형 집합):
`BUSINESS_OWNER` · `TECHNICAL_OWNER` · `SECURITY_OWNER` · `DATA_OWNER` · `COMPLIANCE_OWNER` · `LEGAL_OWNER` · `OPERATIONAL_OWNER` · `STEWARD` · `BACKUP_OWNER`

- **필수 3종**(Active Role 활성 전제): `BUSINESS_OWNER`, `TECHNICAL_OWNER`, `SECURITY_OWNER`.
- `DATA_OWNER`/`COMPLIANCE_OWNER`/`LEGAL_OWNER`: Role Metadata의 data/compliance/regulation 도메인이 채워진 경우 추가 필수 후보(설계·Part 3-1 Metadata 참조).
- `STEWARD`: 일상 운영 관리(활성 소유권 아님·검토 실무).
- `BACKUP_OWNER`: 1차 부재 시 escalation 대체(단독으로 필수 3종 충족 불가).

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 소유 개념 전반 | — | **ABSENT** | §5.2 "Owner ABSENT — 역할 소유/승인 개념 없음"(GROUND_TRUTH §3, ADR §1 "Role Owner(Business/Technical/Security)…순신규") |
| owner_type 열거 | — | **ABSENT** | 소유 유형 vocabulary 전무 |
| escalation_order / is_primary | — | **ABSENT** | 역할 에스컬레이션 체인 부재 |
| responsibilities | — | **ABSENT** | 책임 항목 구조 부재 |
| digest(변조탐지 스냅샷) | — | **ABSENT** | 역할 스냅샷/이력 자체 ABSENT(GROUND_TRUTH §3 Snapshot=ABSENT) |
| (인접) 변경 로그 흔적 | `auth_audit_log`(Evidence=변경 로그만) | 참조: GROUND_TRUTH §1.1 · §3 Evidence=PARTIAL | 소유 이벤트 아님 — Owner 기록 substrate 아님 |

→ Role Owner는 **전면 순신규**. team_role/admin_level/api_key role/AdminMenu enum/SSO map 어느 substrate에도 "Role을 소유·책임지는 주체" 개념이 없다. `auth_audit_log`는 변경 로그일 뿐 소유권 레코드가 아니다.

## ⑤ 설계원칙

- **Golden Rule(Extend not Replace)**: 신규 owner 저장소를 만들되, `subject_ref`/`org_ref`는 신규 Person/Org 축이 아니라 **선행 Actor Identity(canonical subject)·Tenant/Org 축을 참조**한다. 별도 사용자 테이블 재발명 금지.
- **Role≠Permission≠Authority≠JobTitle≠Plan**: Owner는 Role의 **거버넌스 책임자**이지 Permission 보유자·Approval Authority·직책(Job Title)·Subscription Plan이 아니다. `owner_type=BUSINESS_OWNER`가 곧 승인 권한을 부여하지 않는다.
- **Alias/Metadata를 Runtime authz Identifier로 사용 금지**: `subject_ref`는 Canonical subject id로만 결속. Owner의 표시명/부서명/직함(Alias·Metadata성 값)을 인가·소유검증 식별자로 쓰지 않는다.
- **Fail-closed 활성 게이트**: 필수 3 owner_type(Business/Technical/Security) 미충족 Role은 Active 전이·Assignment 불가. 만료(`valid_to` 경과)로 필수 소유가 붕괴하면 Role은 재검토 상태로 강등(런타임 신규 Assignment 차단).
- **Historical Immutability**: Owner 변경은 in-place update 금지, append-only + `digest` 스냅샷. 과거 결정 시점의 소유 상태 재구성 가능해야 함(§6.6 무후퇴).

## ⑥ Gap

- **엔진 전무**: Role Owner 저장·필수충족 검증·활성 게이트·에스컬레이션·digest 전부 미구현(코드 0).
- **BLOCKED_PREREQUISITE (RP-002)**: `subject_ref`는 선행 **Actor Identity(canonical subject)** 축, `org_ref`는 **Organization/Legal Entity** 축(현행 ABSENT)에 종속. Role Definition/Registry(Part 3-1 본체) 실 신설 이전에는 결속할 `role_ref` 자체가 없다. 실 엔진은 선행 foundation 신설 후 별도 승인세션.
- **cover: 0** — 본 문서는 설계 명세이며 NOT_CERTIFIED. 어떤 인가 게이트도 Owner를 아직 소비하지 않는다(가짜녹색 금지).
- **289차 재플래그 금지**: admin_roles/user_roles 폐기(289차)·plan god flag·team_role 문자열 미러는 본 Owner 설계의 결함이 아니라 별건 — 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_REVIEW_POLICY]] · [[DSAR_APPROVAL_ROLE_CERTIFICATION_POLICY]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].
