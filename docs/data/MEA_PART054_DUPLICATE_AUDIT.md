# MEA Part 054 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Agent/Workflow 신설이 기존 `ClaudeAI`(코파일럿·도구)·`JourneyBuilder`(워크플로)·`RuleEngine`(규칙)·`Alerting`(승인)·`AdAdapters`(액추에이터·권한모드)와 중복 재정의하지 않도록 경계 확정. ★★마케팅 AI/dev AI KEEP_SEPARATE.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| AI Platform/모델 자산 | ★MEA Part 051(`ClaudeAI`·`ModelMonitor`) | ★재정의 금지·재사용 |
| MLOps/드리프트 | ★MEA Part 052(`ModelMonitor`) | ★재정의 금지·재사용 |
| 단일 Intelligence Layer(중복 엔진 금지) | ★헌법 Volume 4 | ★재정의 금지 |
| 안전 자동화·승인정책·Safety Rule | ★헌법 Volume 5·`CHANGE_GATE` | ★재정의 금지·재사용 |
| AI 사용 데이터 신뢰(READY만) | ★데이터 헌법 V3·`DataPlatform` | ★재정의 금지·재사용 |
| Agent Security(테넌트·RBAC·감사·암호화) | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |
| Role/Permission 거버넌스 | ★EPIC 06-A Part1~3-6 | ★재정의 금지(Agent Identity는 그 위에) |
| Generative AI/LLM 계층 | ★MEA Part 053 **완결**(289차 후속 2026-07-22·`MEA_PART053_INDEX.md`) | ★재정의 금지·재사용(Function Calling=본 Part Tool Calling과 동일 substrate) |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 Agent/Workflow 엔진 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| AI Agent | tool-use 코파일럿 | `ClaudeAI::agenticAsk`(:839) | ★재사용(중복 코파일럿 금지) |
| Multi-Agent Orchestrator | 단일 루프 | `ClaudeAI`(:907 반복) | ★오흡수 금지(단일≠다중 협업) |
| Tool Calling | tools 배열·디스패치 | `ClaudeAI`(:849~870/:919~926) | ★재사용(도구 증설은 기존 배열에) |
| Tool Permission Control | `requirePro`+테넌트 스코프 | `ClaudeAI`(:840/:841) | ★오흡수 금지(플랜게이트≠per-tool 권한 엔진) |
| Agent Memory | 프론트 제공 history(10턴/4000자) | `ClaudeAI`(:878~903) | ★오흡수 금지(클라이언트 컨텍스트≠서버 Memory Service) |
| Planning Engine | 도구 반복 루프 | `ClaudeAI`(:907) | ★오흡수 금지(암묵 선택≠계획 산출물) |
| Human Approval | HITL 집행 | `ClaudeAI::agenticExecute`(:956) | ★재사용(중복 승인경로 금지) |
| Agent Policy | agent_mode 3모드 | `AdAdapters`(:44/:53) | ★재사용(중복 모드 저장 금지) |
| Autonomous Workflow | 노드 그래프 엔진 | `JourneyBuilder`(:553~724) | ★재사용(중복 워크플로 엔진 절대 금지) |
| Goal Planning | 사람이 그린 캔버스 | `JourneyBuilder`(:134~135 노드) | ★오흡수 금지(정적 설계≠자율 계획) |
| Workflow Policy | 규칙 임계값 | `RuleEngine`(:41~50) | ★재사용·★오흡수 금지(임계값≠Agent Policy Engine) |
| Approval Policy | action_request 정족수 | `Alerting`(:660~665/:698) | ★재사용(중복 승인 테이블 금지) |
| Agent Runtime | cron 37종 | `backend/bin/` | ★오흡수 금지(배치 스케줄≠Runtime Isolation/Scaling) |
| Planner Agent | Budget/Inventory "Planner" | `DemandForecast`(:315)·`PlanGate`(:36) | ★오흡수 금지(UI 명칭≠Agent) |
| Agent(비AI) | CCTV 브리지 에이전트 | `WmsCctv`(:160/:1101) | ★오흡수 금지(온프렘 브리지≠AI Agent) |
| Agent Audit | 해시체인 | `SecurityAudit::verify` | ★재사용(정본) |
| Agent Identity | api_key(유일 비인간 identity) | EPIC 06-A Part3-6 | ★재사용·Agent 전용은 순신설 |

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. `ClaudeAI`(코파일럿)·`JourneyBuilder`(워크플로)·`RuleEngine`(규칙)·`Alerting`(승인) 실재 → **중복 에이전트/워크플로/규칙/승인 엔진 신설 금지·기존 심화**. 헌법 V4 "중복 인텔리전스 금지".
- ★[[feedback_minimize_new_menus]]: Agent Operations Dashboard는 신규 사이드바가 아니라 기존 AI/자동화 메뉴 편입 우선.
- ★[[feedback_no_regression_value_unification]]: 제안-only+HITL+기본 approval+킬스위치 종속 게이트는 **약화 시 즉시 회귀**. Multi-Agent 도입이 이 게이트를 우회하면 안 된다.
- ★[[feedback_competitive_gap_verify]]: Multi-Agent·Registry·Planning·Memory·Runtime 부재=grep 0 부재증명 완료(코드 존재분 감점 금지).
- ★[[feedback_audit_reference_past_fixes]]·[[project_n288_full_audit]]: `action_request` 생산자 부재는 **287/288차 확정·보류 등재분** — 본 Part는 상태 기술만, 재플래그 금지.
- ★[[reference_menu_audit_log_not_tamper_evident]]: Agent Audit 정본=`SecurityAudit::verify`만.
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: AI Agent의 기업 정책 자동 변경·승인 없는 파괴적 외부 작업 불가·배포 승인.
- ★[[feedback_real_value_autoderive]]: Agent Metric(성공률·도구 사용률)은 실 실행 로그(`journey_node_logs`·`rule_engine_log`) 파생이어야 하며 임의 수치 금지.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격**: Agent=`ClaudeAI::agenticAsk`(Executor 승격)·Tool=`ClaudeAI` tools 배열 증설·Workflow=`JourneyBuilder`·Rule=`RuleEngine`·Approval=`Alerting` action_request·Policy=`agent_mode`·액추에이터=`AdAdapters`·Audit=`SecurityAudit`·암호화=`Crypto`·테넌트/RBAC=`Db`/`index.php`.
- **순신설**: ★Multi-Agent Orchestrator(Coordinator/Planner/Reviewer)·Agent Registry(AI_AGENT·버전·폐기)·Planning Engine(Goal Decomposition·AGENT_PLAN)·Agent Memory Service(암호화·영속)·Agent Session·Agent Runtime(Isolation·Task Queue·Scaling)·형식 Tool Registry/Permission Control·Agent Identity(AGENT_ROLE)·Agent Metric/Operations Dashboard/Advisor·Event 표준 8종·Workflow Recovery.

## 판정
**중복 위험 高(에이전트·워크플로·규칙·승인 substrate 전부 실재).** ★핵심=`ClaudeAI`(단일 tool-use 코파일럿+HITL)·`JourneyBuilder`(자율 워크플로 엔진)·`RuleEngine`(규칙 자동화)·`Alerting`(Maker-Checker)·`AdAdapters`(agent_mode·액추에이터·킬스위치)·`AutoCampaign`/`Decisioning`/`AutoRecommend`(의사결정)·`Crypto`/`SecurityAudit`/`index.php`(보안)는 **재사용/승격**(★중복 Agent/Workflow 엔진 신설 절대 금지=헌법 V4·값 분산=회귀·정본 재구현 금지). 헌법 V4/V5·데이터 헌법 V3·Part 047/048/049/051/052/**053**·EPIC 06-A **재정의 금지**. 본 Part 고유 순신설=★Multi-Agent Orchestrator·Agent Registry·Planning Engine·Agent Memory/Session·Agent Runtime·형식 Tool Permission·Agent Identity·Agent Metric/Dashboard·Event 표준(부재·grep 0·부재증명 완료)뿐. ★오흡수 금지(단일 루프≠Multi-Agent·프론트 history≠Memory Service·도구 반복≠Planning·캔버스≠Goal Planning·cron≠Runtime·"Planner" UI≠Planner Agent·CCTV `agent_version`≠AI Agent)·★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★승인 없는 파괴적 자동집행 불가(V5+CHANGE_GATE)·★**Part 053 완결·갭 해소**(2026-07-22·053 ADR D-6): 053 LLM 계층(호출·프롬프트·quota·RAG)과 본 Part Agent 계층의 경계 확정 — Function Calling/Tool Calling은 **동일 substrate 단일 기술**·중복 도구 레지스트리 신설 금지.
