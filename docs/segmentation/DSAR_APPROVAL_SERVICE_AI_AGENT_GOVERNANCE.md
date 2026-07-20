# DSAR — AI Agent Governance 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: AI Agent Governance · 스펙 §20)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · AI Agent=인간 자동화 설정(agent_mode≠identity, ADR §1·EXISTING_IMPLEMENTATION §6) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §20 AI Agent Governance는 **AI Agent Identity · Agent Role · Agent Scope · Agent Session · Agent Permission · Agent Runtime Audit** 6요소로 AI Agent를 사람·서비스 계정과 동등(이상) 수준으로 통제하는 계층이다. EXISTING_IMPLEMENTATION §6·ADR §1이 firsthand 정독으로 확인한 결론은 명확히 **ABSENT**다 — 현 시스템의 "AI Agent"에 해당하는 코드는 전부 **인간 사용자가 설정하는 자동화 자율성 옵션**이며, 별도 Agent Identity/Session/Audit actor를 갖지 않는다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | agent id | AI Agent Identity 식별자 |
| 2 | owner service/human id | Agent를 소유/설정한 주체 |
| 3 | agent element | 아래 §3 열거형(6요소) |
| 4 | element value | 요소별 값 |
| 5 | session id | Agent 실행 세션(있다면) |
| 6 | audit actor | Runtime Audit 기록 시 actor 표기 |

## 3. 열거형 / 타입

**AI Agent Element**(스펙 §20 원문): `AI_AGENT_IDENTITY` · `AGENT_ROLE` · `AGENT_SCOPE` · `AGENT_SESSION` · `AGENT_PERMISSION` · `AGENT_RUNTIME_AUDIT`

## 4. 실 substrate 매핑 (ABSENT — 6요소 전부 부재, 근접값은 "인간 설정"으로 정정)

| AI Agent Element | 근접(오인 소지) substrate | file:line | 판정 |
|---|---|---|---|
| AI_AGENT_IDENTITY | `agent_mode`(recommend/approval/auto) — **app_user(인간) 소유 컬럼**, 별도 Agent PK/lifecycle 없음 | `UserAuth.php:196,1025,1741-1749` | **ABSENT(identity 아님)** — 이름에 "agent"가 들어가나 이는 인간 계정에 딸린 자동화 자율성 설정값이지 별도 주체 식별자가 아님 |
| AGENT_ROLE | 없음 — agent_mode의 3값(recommend/approval/auto)은 "AI가 얼마나 자율적으로 실행할지"의 정책 옵션이지 Role 계층(API/Integration/Scheduler/Worker/AI/ETL/Batch/K8s Role, 스펙 §7)이 아님 | `UserAuth.php:196` | **ABSENT** |
| AGENT_SCOPE | `AiGenerate.php:29-51`이 **인간 session/api_key를 재사용**하고 `ai_settings.api_key`를 사용 — 별도 Agent Scope 없음 | `AiGenerate.php:29-51` | **ABSENT** — AI 생성 호출이 인간의 기존 인증 컨텍스트를 그대로 상속할 뿐, Agent 전용 Scope 제한이 없음 |
| AGENT_SESSION | 없음 — 별도 agent 세션/식별자(`X-Agent` 헤더 등) grep 0 | — | **ABSENT** |
| AGENT_PERMISSION | 없음 — AGENT_SCOPE와 동일 사유, 인간 권한을 그대로 사용 | — | **ABSENT** |
| AGENT_RUNTIME_AUDIT | agent_mode 변경 감사 — **actor=human으로 기록** | `UserAuth.php:1748` | **ABSENT(as AI actor)** — 변경 자체는 감사되나 actor가 명시적으로 인간이며, "AI Agent가 행위자로 기록되는 감사"는 존재하지 않음 |

**경계 보존**: `AgencyPortal`(대행사 파트너 포털)은 인간 파트너 사용자를 위한 것이며 AI Agent와 명칭·개념 모두 무관하다(EXISTING_IMPLEMENTATION §6 명시 오탐 배제) — AI Agent Governance 근접 substrate로 오인 금지.

## 5. 설계 원칙

- ★6요소 전부 ABSENT — 이는 "설계가 부족해서"가 아니라 **현재 아키텍처상 AI 호출이 애초에 별도 identity 개념 없이 인간 세션/api_key를 통해서만 실행되기 때문**이다(정직 판정, ADR §D-5 "PARTIAL-substrate/ABSENT-governance"의 극단 사례 — 여기는 substrate조차 없음).
- `agent_mode`를 AI Agent Identity로 오등록하지 않는다 — ADR 본문이 명시적으로 "AI Agent = 인간 자동화 설정"이라 판정했으며, 재플래그·재해석 금지(GROUND_TRUTH 재확정 사항).
- 신설 시 AI Agent Identity는 §1 Service Identity Registry(신규 계층, ADR §3)의 Identity Type 중 하나(스펙 §3 Identity Type: "AI Agent")로 편입하되, 인간의 `agent_mode` 설정은 "이 AI Agent를 이 인간이 어느 자율성 수준으로 승인했는가"를 나타내는 **정책 참조**로 남기고 Agent 자체의 identity/session/audit actor는 별도 신설한다(혼동 금지).
- Agent Runtime Audit 신설 시, 현재 인간 actor 기반 감사(`UserAuth.php:1748`)와 향후 AI actor 기반 감사를 **동일 감사 테이블 내 actor_type 구분**으로 통합할지, 별도 테이블로 분리할지는 §1 Registry 설계 시점에 결정(현재는 판단 보류 — 본 편은 Gap 등재만).

## 6. Gap / BLOCKED_PREREQUISITE

- AI_AGENT_IDENTITY·AGENT_ROLE·AGENT_SCOPE·AGENT_SESSION·AGENT_PERMISSION·AGENT_RUNTIME_AUDIT 6요소 전부 ABSENT.
- 현재 AI 호출(`AiGenerate.php`)이 인간 인증 컨텍스트를 상속하는 구조 자체가 스펙 §20이 요구하는 격리(Agent 전용 identity/scope)와 근본적으로 배치 — 신설 시 기존 `AiGenerate.php` 호출 경로의 인증 상속 구조 변경이 필요할 수 있음(설계 영향 범위, 코드 변경은 이번 차수 대상 아님).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
