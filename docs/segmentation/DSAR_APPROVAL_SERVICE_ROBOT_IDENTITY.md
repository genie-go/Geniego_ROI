# DSAR — Approval Robot Identity (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Robot Identity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Robot Identity는 Automation Bot/Robot Account(RPA류 인간 모사 자동화 계정) 수준의 비인간 주체를 식별하는 엔티티다(스펙 §1 구현목표 항목6 "Robot Identity"·§3 Identity Type 중 "Bot"). 목적은 AI Agent(6번 문서·판단/생성 주체)·System Identity(2번 문서·백엔드 프로세스)와 구분되는 **별도 축**으로 Robot/Bot을 설계 명세에 등재하는 것이며, 스펙 §3이 AI Agent와 Bot을 별개 열거값으로 명시한 만큼 두 개념을 혼동 없이 유지한다.

## 2. Canonical 필드

스펙 §2(Canonical Entity, 상위 `APPROVAL_SERVICE_IDENTITY` 하위분류)·§3(Identity Type)·§35(Database Constraint) 근거의 설계 명세 필드(코드 0·미확정):

- `robot_identity_id`(PK) · `tenant_id` · `robot_role_ref`(→ 스펙 §7 Service Role 서브셋) · `automation_scope_ref`(RPA 작업 범위) · `owner_ref`(소유 주체 — 인간 또는 시스템 프로세스, 설계 시 확정) · `status`(active/deprecated/retired) · `created_at`/`created_by`

## 3. 열거형 / 타입

- `identity_type`(스펙 §3 Identity Type 서브셋): `bot`(Automation Bot·Robot Account)
- `status`: `active` | `deprecated` | `retired`

## 4. 실 substrate 매핑 (ABSENT·ground-truth만 인용)

- **Robot Identity 자체 = ABSENT**: 내부 엔티티(`robot_account` 포함 `service_account_id`/`machine_role`/`system_actor`/`non_human`) grep 0(EXISTING_IMPLEMENTATION §2 "내부 엔티티...grep 0").
- **AI Agent와 별개 부재(혼동 금지)**: `agent_mode`(`UserAuth.php:196,1025,1741-1749`)는 인간 자동화 설정이며 AI Agent Identity 대체물이 아님과 동시에(6번 문서), Robot Identity의 대체물도 아니다 — 스펙 §3이 AI Agent와 Bot을 별개 열거값으로 구분하므로 둘 다 ABSENT이되 서로 대체 관계가 아니다.
- **내부 RBAC role = 인간 계정 전용**: `owner/manager/member/admin`(`TeamPermissions.php:123-136,245-246,368-390`) — Robot/Bot 전용 role 값 부재(EXISTING_IMPLEMENTATION §2).

## 5. 설계 원칙

- **경계 보존**: Robot Identity를 AI Agent Identity·System Identity와 혼동 없이 별도 축으로 유지한다(스펙 §3 별개 열거값 근거). agent_mode를 Robot Identity로도 오등록하지 않는다.
- **Golden Rule — 순신규 인정**: 이 계층은 재사용할 근접 substrate가 코드에 전무하므로, 다른 5개 identity 유형(Registry/System/Machine/API Client/Integration)과 달리 "조립"이 아닌 순수 신규 설계로 등재한다.
- **소유자 축 설계 필요**: RPA류 Robot Account는 통상 인간 또는 시스템 프로세스에 종속되는데(스펙 §0 "서비스 계정도 사람보다 더 엄격"), 이번 문서는 `owner_ref` 필드 자리만 마련하고 구체적 종속 규칙은 System Identity(2번)·AI Agent Identity(6번) 설계 확정 후 결합.

## 6. Gap / BLOCKED_PREREQUISITE

- Robot/Bot 관련 코드 substrate = grep 0 전면(내부 엔티티·RBAC role 값 모두 부재).
- Robot Identity가 참조할 Service Role(스펙 §7)·Runtime Context(§9) 등 하위 엔티티 대부분이 아직 미확정(선행 문서 확정 후 FK 결합).
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic 실 구현 부재.
