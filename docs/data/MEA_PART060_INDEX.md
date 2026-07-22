# MEA Part 060 — Enterprise Cognitive Enterprise, Hyperautomation & Autonomous Enterprise Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(grep 0·**단어경계 + 광의 히트 파일 단위 전수 분류**)·정직 표기(**마케팅 워크플로 실재 / 전사 BPA·RPA 전무** 동시 기술)·과대주장 금지·**부재 축소 금지**·오흡수 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054·058 판정 상속·재판정 금지**·**경계 고정: 054=Agent/Workflow 실행, 058=의사결정, 059=모사, 060=전사 프로세스 자동화**.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART060_COGNITIVE_HYPERAUTOMATION_AUTONOMOUS_ENTERPRISE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19(verbatim) |
| 2 | ADR | `docs/architecture/ADR_MEA_COGNITIVE_HYPERAUTOMATION_AUTONOMOUS_ENTERPRISE_ARCHITECTURE.md` | 결정 D-1~D-7 |
| 3 | GT① EXISTING | `docs/data/MEA_PART060_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART060_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART060_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART060_GOVERNANCE_MECHANISMS.md` | §7~§17 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART060_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL (마케팅 워크플로 자동화 축은 실재[054 정본] / ★전사 BPA·RPA·Process Mining·Cognitive·Automation Registry = 전면 ABSENT).**
★★**본 Part의 성격 규정(ADR D-1)**: **"자동화가 없다"가 아니라 "마케팅 도메인 자동화는 있고 전사 프로세스 자동화(BPA/RPA)는 없다."** `hyperautomation`·`rpa_bot`·`process_mining`·`bpmn`·`camunda`·`zeebe`·`flowable`·`cognitive`·`ocr` **전부 단어 자체 0**이지만, 워크플로 축은 **엔티티 수준으로 대응**된다.
★**실재(정직 인정·평가절하 금지)**: ① **워크플로 엔티티 대응** — `journeys`(AUTOMATION_WORKFLOW `JourneyBuilder`:35)·**`journey_enrollments`(PROCESS_INSTANCE:42)**·`journey_node_logs`(:48)·`journey_decision_arm`/`_log`(AUTOMATION_DECISION:54·:60) ② **054 확정 워크플로 기능**(조건분기·delay resume·event wait+timeout·트리거 detector·발송 안전게이트·Thompson) ③ **규칙**(`RuleEngine` 058)·**스케줄**(cron **36 파일**·daypart) ④ **Human Approval**(2인 정족수 `Alerting`·**`agent_mode` 기본 approval fail-safe**·킬스위치) ⑤ **AI Decision Integration**(058 7엔진) ⑥ **Automation Chaining**(email/sms/kakao/webhook 노드) ⑦ **도메인 자동화 토글**(`ReturnsPortal::toggleAutomation`:387·`routes.php`:829·:3863) ⑧ **자체 마케팅 자동화**(236차 Admin Growth Automation `routes.php`:1324·:2655) ⑨ **★PPM 축** — **작업 의존성 그래프**(`PM/Dependencies.php` `predecessor_id`/`successor_id`/**`dep_type` FS**/`lag_days`:22~39 + **DFS 순환 검출**:77~79)·**CPM 임계경로**(`PM/Gantt.php` ES/EF/LS/LF·**`slack=LS−ES`**·**`critical=slack 0`**:10·:17~18·:181~183)·`pm_portfolio`/`pm_raid`/`pm_time_log`/`pm_baseline`(`PM/Enterprise.php`:33~53)+핸들러 12종+프론트 13페이지 ⑩ **도메인 SLA**(정산 대사 티켓 upsert/조회/**sweep** `routes.php`:1980~1982·:2011~2013·:2072~2074 · DSAR 법정기한 `Dsar`:388) ⑪ 보안 상속(테넌트 fail-closed·전역 writeGuard·해시체인 감사·`Crypto`).
★**ABSENT(grep 0·부재증명 완료·축소 금지)**: ★★**Hyperautomation·Cognitive·RPA는 단어 자체가 없다** — **Enterprise Automation Registry**(§6 근간)·Cognitive Process Engine·Automation Orchestrator(형식)·**RPA Integration 전량**(Bot Management/Scheduling·**Desktop/Web/Legacy Automation**·**OCR**·Bot Monitoring/Analytics)·Process Intelligence Service·Automation Governance Manager·Automation Monitoring Dashboard·Automation Audit Service·Enterprise Automation Advisor · **§6 미보유**: BPA(전사)·RPA·**Intelligent Document Processing**·**Process Mining**·Process Intelligence·**Autonomous Enterprise**·Enterprise Hyperautomation · **엔티티**: BUSINESS_PROCESS·**RPA_BOT**·**AUTOMATION_VERSION** + 형식 PROCESS_STEP/AUTOMATION_TASK/AUTOMATION_POLICY/AUTOMATION_AUDIT · **§7**: Process Discovery·**Process Modeling(BPMN)**·Automation Deployment(형식)·Retirement·Archive · **§8**: Parallel Processing(형식)·**SLA Management(워크플로)** · **§9**: **Recovery Automation·Runtime Optimization** · **§11**: **Process Mining·Bottleneck(프로세스)·Cycle Time·Automation Opportunity Detection** · **§12** Policy 객체 6종·Security Validation · **§13** **Workflow Encryption·Bot Credential Vault** · **§14** Process Validation·형식 Policy Evaluation·Event 생성 · **API 8종·Event 8종 전량** · §17 AI 5종 · 성능 SLA(§18·**"미달"이 아니라 "측정 기반 부재"**).
★★**§7 핵심 미충족**: "모든 자동화 프로세스는 **변경 이력**을 관리한다" → `journeys`·`rule_engine` 모두 **현재값 덮어쓰기**이고 실행 로그는 변경 이력이 아니다(058 §9와 **동일 병리**). ★**AUTOMATION_VERSION은 "중복"이 아니라 "결여 보강"**(append-only 이력 신설·기존은 현재값 뷰 유지).
★★**판정 정합(ADR D-2)**: **054**("`JourneyBuilder`=자율 워크플로 엔진 PARTIAL-strong")와 **EPIC 06-A 5-3-1**("BPMN/Temporal/Camunda/Flowable/Zeebe/StepFunctions grep 0 → 워크플로 엔진 부재")은 **상충이 아니라 스코프 차이**다(054=마케팅 여정 실행 엔진 실재 / EPIC 06-A=범용 BPM 엔진 부재). **양쪽 판정 모두 유지**하고 기준 차이를 명시 — **cross-cutting Part에서 상충 판정을 만났을 때의 표준 처리법**.
★**오흡수 금지(동음이의 실측)**: **`rpa` 1히트 = `DataTrustDashboard.jsx`(:197) i18n 키 `rPass` 우연 일치 = 완전 오탐** · **`bot` 1히트 = `Line.php`(:24) LINE Messaging API URL**(`https://api.line.me/v2/bot`)**≠RPA_BOT** · **`bottleneck` 2히트 = 아카이브 i18n 마케팅 문구 + `PMGanttView.jsx`(:130) CPM 임계경로 범례**("Critical = Slack 0 (project bottleneck)")**≠Process Mining 병목** · **`workflow` 61 = `tools/ci_watch.sh` GitHub Actions workflow(14)·`PremiumLayout.jsx`(6)·아카이브 i18n 패치·가이드 라벨** · `automation` 75·`sla` 80 **대부분 메뉴명·i18n 라벨** · **cron 36 ≠ Hyperautomation**(배치 스케줄) · `JourneyBuilder`(**마케팅 여정**·054 소관)**≠Enterprise BPA** · **PM 도메인 = 프로젝트 관리(PPM) ≠ BPA** · **`PM/Gantt` CPM = 프로젝트 임계경로 ≠ Process Mining 병목** · `pm_time_log` = **프로젝트 공수** ≠ 프로세스 사이클 타임 · **`AIInsights.jsx`(:599) "Autonomous orchestration…" 마케팅 카피 ≠ Autonomous Enterprise**(058·059 확정) · `RuleEngine` 임계값 ≠ Automation Policy 객체 · 챗봇(`ClaudeAI` 053) ≠ RPA_BOT · **도메인 SLA(정산·DSAR) ≠ 워크플로 SLA Management**(축 상이).
★**강점 정직 기술(후퇴 금지)**: 명세 §17 "AI는 **승인 정책 없이 핵심 비즈니스 프로세스를 자동 변경**하거나 **조직 정책을 임의로 수정**하지 않는다"는 **현행이 구조적으로 충족** — ⓐ**프로세스 정의(`journeys` 캔버스)는 사람이 설계**하며 AI가 자동 변경하지 않는다 ⓑ자율 실행은 **`agent_mode='auto'`+킬스위치+결제/딜리버리 게이트** 통과 시에만이고 미충족 시 **정직 보류+사유**(058 확정) ⓒ**기본값 approval**(fail-safe) ⓓ파괴적 액션은 **제안-only+HITL**(054 D-2) ⓔ**조직 정책이 문서/코드**라 AI가 수정할 대상이 없다(056 D-7). 코드 변경 0.

## ★★핵심 설계 제약 9종 (구현 착수 시 필수)
1. **Automation Orchestrator는 새 실행 엔진이 아니라 디스패처**(D-3) — ★**058 D-1 "8번째 결정 엔진 금지" · 059 D-3 "통합 Simulation Engine=디스패처" · 060 "Orchestrator=디스패처" = 동일 원칙 3연속**.
2. **범용 BPM 필요 시 `JourneyBuilder` 노드 타입 확장이 1순위 검토**(D-3) — 별도 엔진은 **마케팅 여정과의 경계·데이터 이중화 비용 정량 비교 후**에만.
3. **실행 로그 이원화 금지**(D-3) — `journey_node_logs`·`rule_engine_log`·`optimization_log`·`po_repricer_history`를 **파괴하지 말고 뷰 통합**(058 D-1 승계).
4. **AUTOMATION_VERSION은 결여 보강**(D-4) — append-only 이력 신설·기존은 **현재값 뷰 유지**(무회귀).
5. **Bot identity는 `api_key` 위에**(D-5) — **`api_key`가 유일 비인간 identity**(EPIC 06-A Part3-6)·별도 계정 체계 신설 금지·자격은 **`Crypto`(049) Vault**.
6. **PM CPM을 프로세스 병목으로 오흡수 금지**(D-6) — 프로젝트 임계경로≠Process Mining 병목·`pm_time_log`≠사이클 타임.
7. **Process Intelligence 지표는 실 실행 로그 파생만 · 산출 불가 시 0이 아니라 null·명시적 사유**(D-6) — ★**057 null · 058 `optimized:false` · 059 null/422 = 3연속 모범** 승계(**0은 "정상"으로 오독되어 병목을 은폐**).
8. **도메인 SLA를 워크플로 SLA로 흡수 금지**(D-6) — 정산 대사·DSAR SLA는 **축이 다르다**(패턴만 참조).
9. **Automation API는 인증 필수 접두 + 테넌트 격리 절대**(D-7) — 프로세스 정의·승인 이력·실행 로그 = **조직 기밀**. AUTOMATION_AUDIT은 `SecurityAudit` 확장이되 **고빈도 실행 로그는 앵커링**(체인 직접 유입 금지).
※ **§17 게이트는 범위가 넓을수록 더 엄격히**(D-7) — Hyperautomation은 자동화 범위를 넓히는 일이라 **무게이트 사고의 파급이 크다**(059 D-7과 같은 논리).

## 상속·다음
- **상속**: **051~059 전체** — 특히 **054(Workflow 정본)·058(의사결정 7엔진)과 경계 고정·재판정 금지** + **EPIC 06-A**(BPM 엔진 부재 확정·`api_key` 비인간 identity) + 헌법 V4/V5 + 데이터 헌법 V3 + `CHANGE_GATE` + Security(047~049) + Observability(046/057) + 가용성(044/045/050) + API GW(042).
- **다음**: **MEA Part 061 — Enterprise IoT, Edge AI & Intelligent Device Platform Architecture**(명세 지정). ★예상 조사 후보=**`WmsCctv`**(274차 온프렘 CCTV 브리지·`tools/cctv-bridge` Node 에이전트·ONVIF 자동발견·`agent_version`)·`Wms`(창고 장비)·`MediaHost`·`SystemMetrics`(057). ★**부재 예상은 반드시 grep 부재증명 후 판정**(053 선례). ★오흡수 사전 주의: **`WmsCctv.agent_version`(온프렘 브리지)≠AI Agent**(054 확정)이자 **≠Edge AI** · CCTV 스트림 릴레이≠IoT Device Platform · `tools/cctv-bridge`(Node 무의존 에이전트)≠Edge Runtime · **059에서 이미 "CCTV 비디오월≠Asset Twin" 확정**.

## ★AI Platform 진행 (Part 051~060)
051 AI Foundation(PARTIAL) · 052 ML/MLOps(ABSENT-heavy) · 053 GenAI/LLM(PARTIAL·**호출경로 2개 병존**) · 054 AI Agent(**PARTIAL-strong·최고 실재도**) · 055 Knowledge/RAG(PARTIAL-weak) · 056 AI Governance(PARTIAL-weak·**"규범은 문서에 있고 기계 집행이 없다"**) · 057 AI Observability(PARTIAL-weak·**AI 미프로브**) · 058 Decision Intelligence(**PARTIAL**·**"결정 엔진이 7개인데 통합 Registry가 없다"**) · 059 Digital Twin/Simulation(PARTIAL-weak·**`twin` 단어경계 0**) · **060 Cognitive/Hyperautomation/Autonomous Enterprise(★PARTIAL — 워크플로 엔티티 대응·PPM 의존성/CPM 실재 / BPA·RPA·Process Mining·Registry 전무)** → 다음 **061 IoT/Edge AI/Intelligent Device**.
★★**Registry 부재 3연속**(058 Decision · 059 Twin · 060 Automation)=**같은 구조적 병리**이며 처방도 같다(**기존 엔진 위의 얇은 통합 계층**). ★**AI 시리즈 반복 결론**: 053(Gateway 부재)→056(감사 구멍)→057(AI 미프로브)→058·059·060(Registry 부재 3연속). **053 Gateway 일원화가 실 구현 1순위**. ★**정직 미산출 3연속 모범**(057 null·058 `optimized:false`·059 null/422)은 **저장소 최강 문화 자산**으로 신규 구현 필수 승계.
