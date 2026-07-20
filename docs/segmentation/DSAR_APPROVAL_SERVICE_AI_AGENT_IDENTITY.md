# DSAR — Approval AI Agent Identity (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: AI Agent Identity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT) · ★AI Agent=인간설정(agent_mode)이지 별도 identity 아님 — 설계 오인 방지 최우선

## 1. 목적

AI Agent Identity는 AI 에이전트를 사람·서비스 계정과 구분되는 별도 identity 축으로 식별하는 엔티티다(스펙 §1 구현목표 항목7 "AI Agent Identity"·§2 Canonical Entity `APPROVAL_AI_AGENT`·§20 AI Agent Governance: AI Agent Identity·Agent Role·Agent Scope·Agent Session·Agent Permission·Agent Runtime Audit). ★목적의 핵심은 **설계 오인 방지**다 — 현재 `agent_mode`는 AI Agent identity가 아니라 인간(app_user)이 설정하는 자동화 자율성 설정값이며, 이를 AI Agent Identity로 오해·대체하지 않도록 경계를 명문화하는 것이 본 문서의 1차 목적이다.

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§20(AI Agent Governance)·§35(Database Constraint) 근거의 설계 명세 필드(코드 0·미확정):

- `ai_agent_id`(PK) · `tenant_id` · `owner_app_user_id`(설계상 인간 소유 강제 — 사람 없는 독립 Agent 미허용) · `agent_role_ref`(→ 스펙 §20 Agent Role) · `agent_scope_ref`(→ Agent Scope) · `agent_session_ref`(→ Agent Session, human session과 별도 축) · `agent_permission_ref`(→ Agent Permission) · `runtime_audit_ref`(→ Agent Runtime Audit, actor=agent 구분) · `status`

## 3. 열거형 / 타입

- `agent_mode`(실 substrate 근접값, identity 아님 — 참고용): `recommend` | `approval` | `auto`
- `identity_type`(스펙 §3 서브셋): `ai_agent`

## 4. 실 substrate 매핑 (ABSENT·ground-truth만 인용)

- **AI Agent identity/governance = ABSENT**: `X-Agent`/`ai_agent` grep 0(EXISTING_IMPLEMENTATION §6).
- **agent_mode = 인간 자동화 설정(identity 아님)**: `UserAuth.php:196,1025,1741-1749` — app_user(인간) 소유의 자동화 자율성 설정(recommend/approval/auto)이며, 변경 감사의 actor는 human으로 기록된다(`UserAuth.php:1748`). AI Agent 고유 identity가 아니다.
- **AiGenerate.php = 인간 session/api_key 재사용**: `AiGenerate.php:29-51` — 별도 agent 식별자/세션/role 없이 인간 session 또는 `ai_settings.api_key`를 그대로 사용한다.
- **AgencyPortal = 무관(명칭 혼동 주의)**: AgencyPortal은 인간 파트너(대행사) 주체이며 AI Agent와 무관하다(EXISTING_IMPLEMENTATION §6 "명칭 혼동" 경고).

## 5. 설계 원칙

- **경계 보존(오등록 절대 금지)**: `agent_mode`를 AI Agent Identity로 오등록하지 않는다(ADR §3 경계보존 명문 — "AI Agent Identity(agent_mode≠identity)"). 이는 289차 계열 전체에서 가장 명시적으로 경고된 오인 지점이다.
- **human actor / agent actor 분리가 선행**: 현재 감사 시스템은 actor를 human으로만 기록하며(`UserAuth.php:1748`), agent actor라는 축 자체가 없다. AI Agent Identity·Agent Runtime Audit 설계는 이 분리를 전제로 하는 순신규 작업이다.
- **소유자 강제**: 스펙 §0 "서비스 계정도 사람보다 더 엄격"에 따라 AI Agent는 반드시 `owner_app_user_id`를 갖는 인간 종속 identity로 설계하며(현재 agent_mode가 실제로 인간 소유인 것과 정합), 독립 Agent 계정은 이번 설계 범위 밖.

## 6. Gap / BLOCKED_PREREQUISITE

- AI Agent Identity·Agent Role·Agent Scope·Agent Session·Agent Permission·Agent Runtime Audit(스펙 §20) 전 항목 = grep 0.
- Agent Runtime Audit(별도 actor 축) 없이는 §20 전체가 실질적으로 BLOCKED — human actor 전용 감사 인프라(`UserAuth.php:1748`)를 agent actor까지 확장하는 선행 설계가 이번 문서 범위 밖.
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic 실 구현 부재. agent_mode(인간 설정)와 AI Agent Identity(순신규)의 결합 설계는 RP-002 이후 별도 세션.
