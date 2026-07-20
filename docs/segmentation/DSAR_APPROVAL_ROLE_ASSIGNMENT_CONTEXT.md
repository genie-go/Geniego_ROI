# DSAR — Approval Role Assignment Context (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Context)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_ASSIGNMENT_CONTEXT`는 스펙 §2 Canonical Entity 목록에만 명명되어 있으며, §1~§41 본문에는 "Assignment Context"를 다루는 전용 번호 섹션이 없다(정직 명시 — 스펙 원문상 이 엔티티는 이름만 선언되고 세부 필드 섹션이 배정되지 않았다). 본 문서는 스펙 §19(Assignment Eligibility)·§10(Assignment Request)·§3(Assignment 유형)에서 파생되는 "이 Assignment가 어떤 상황적 조건 하에서 유효한가"의 맥락 정보를 Context 엔티티의 설계 범위로 잠정 정의한다. ★이 파생은 스펙 §19/§10/§3 원문을 근거로 하되, §19/§10/§3 자체를 Context로 재명명하는 것이 아니라 Context가 참조하는 인접 개념임을 명시한다.

## 2. Canonical 필드

스펙 원문에 전용 필드 섹션 없음(§2 명명만). 설계 제안(§19 Eligibility·§10 Request 필드에서 파생): Context ID · Assignment ID(참조) · Actor Type(§19)· Authentication Assurance(§19) · Business Reason(§10 "Business Reason") · Request Origin(예: 팀 초대/SSO 프로비저닝/sub-admin 발급 등 Assignment Source와 연동) · Environment(§8 Scope 축과 중복 가능성 있음 — Context와 Scope의 경계는 Part 3-4+ 설계에서 명확화 필요).

## 3. 열거형 / 타입

스펙 원문에 전용 열거 없음. 참고 가능한 인접 열거값(§19 Assignment Eligibility 원문): Actor Type · Tenant · Organization · Position · Employment Status · Authentication Assurance · Required Membership · Required Certification.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **Context 엔티티 자체 = ABSENT**(ground-truth 어디에도 "context" 구조화 저장을 언급하는 인용 없음).
- **Business Reason 근접 = ABSENT**: 5경로(team_role/SSO provisionUser/api_key/wms_permissions/pm_task_assignees) 어디에도 "왜 이 배정을 하는가"를 기록하는 필드가 없음(ADR §3 승인·SoD 정직 판정 문단에 근거 기록 언급 자체가 없음 — 부재로 판정).
- **Authentication Assurance 근접**: SSO/SCIM `provisionUser`(`EnterpriseAuth.php:483-511`)가 OIDC/SAML/SCIM 프로토콜별 groups 정보를 사용하나(`roleForGroups`, `EnterpriseAuth.php:78-91`), 이는 인증 방식(assurance level)을 Context로 기록하는 것이 아니라 role 매핑 입력값으로만 소비된다 — SAML은 서명 서브트리만 신뢰(`:298-299,301`·XSW 방지) 처리되나 이 신뢰 판정 자체가 Context 필드로 영속되지 않음.
- **Request Origin 근접(암묵)**: 5개 substrate 각각이 서로 다른 진입 경로(팀 초대/SSO/sub-admin 발급/wms 직접등록/pm 과제배정)이지만, Assignment Source와 마찬가지로 이를 정형 필드로 저장하는 substrate는 없음(Definition DSAR §4 "Assignment Source = PARTIAL(암묵)"와 동일 근거).

## 5. 설계 원칙

- Context와 Scope(§8)의 경계를 명확히 유지한다 — Scope는 Assignment의 유효 "범위"(공간·조직·리소스 축), Context는 Assignment가 발생한 "상황"(요청 사유·인증 보증 수준·출처)으로 분리하며, Part 3-4+ 설계에서 이 구분을 재확인해야 한다(스펙 원문이 전용 섹션을 부여하지 않은 만큼, 성급한 필드 확정을 피하고 인접 섹션 파생임을 명시 유지).
- Business Reason·Request Origin은 Assignment Evidence(§27)·Assignment Request(§10)와 중복되지 않도록 참조 관계로 설계(Context가 별도 사본을 만들지 않음).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Context가 참조할 Actor Type/Authentication Assurance는 Part 3-1/3-2 Role Registry/Hierarchy의 Composite Actor Eligibility(ADR D-4 언급) 실구현이 선행되어야 함.
- **Gap**: 스펙 원문 자체가 이 엔티티에 전용 필드 섹션을 배정하지 않아, Part 3-4+ 진행 시 Context 필드셋 자체를 재확정해야 함(현 단계는 파생 초안일 뿐).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
