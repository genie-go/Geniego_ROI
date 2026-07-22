# MEA Part 056 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 056 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(규범=문서·엔진 아님 / 감사=보안용 / 리스크=사업용).
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★전부 0** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, 로케일·`locales_backup`·`demoUiI18n.json`·`autofill.json` 제외): `ai_governance`/`AiGovernance`/`model_risk`/`ai_risk`/`ai_control`/`ai_compliance`/`ai_approval`/`ai_explanation`/`ai_decision`/`ai_exception`/`ai_incident`/`ai_audit`/`ai_review`/`ai_score`/`ai_standard`/`fairness`/`bias_detection`/`xai_`/`trust_score`/`ai_trust`/`governance_registry`/`responsible_ai`/`ethics`/`model_card`/`risk_classification`/`periodic_review`.
② **실 substrate 판독**: `Risk`(+`risk_model_registry`/`risk_prediction`)·`ModelMonitor`(ml_models/ml_model_metrics/ml_retrain_log)·`SecurityAudit`(해시체인)·`AdAdapters`(agent_mode·킬스위치)·`Alerting`(action_request 정족수)·`Decisioning`(explainability 메타·No-PII)·`ClaudeAI`(quota·`ai_analyses`·053 확정)·`AiGenerate`(`ai_generate_log`·053 확정)·`AnomalyDetection`·`Dsar`·`index.php`(writeGuard)·`docs/CONSTITUTION.md`+`docs/CHANGE_GATE.md`+헌법 V2~V5(**문서 규범**).
③ **동음이의 배제(오흡수 방지)**: **`shap` 단어경계 히트 = 0** — 955 히트는 전부 `Shapley`(86+32)·`shape`(20+8)이며 **`Shapley`는 마케팅 채널 기여도 분해**(`frontend/src/lib/mlAttribution.js`·`Attribution.jsx`·`ShapleyTab`/`ShapleyExact`)이지 **모델 피처 설명(SHAP)이 아님** · `explainability` 3히트 = `tools/inject_attrdata_i18n.cjs`(:34·:38 **어트리뷰션 UI 라벨**) + `Decisioning`(:477 응답 메타) · `ai_policy` 2히트 = `Topbar`(:302)·`tenantStorage`(:13) **주석 내 localStorage 설정키 나열**이지 AI_POLICY 엔티티 아님 · **`Risk`(v378~380)=판매자/계정 사업 리스크 예측**이지 **Model** Risk Management 아님 · `RuleEngine` 임계값≠AI Governance Policy · `DataPlatform.reliability_score`(**데이터** 신뢰)≠**AI** Trust Score.

## 실존 substrate (★인간감독·감사·모니터링 축은 실재 / 형식 Governance 계층 부재)

### A. Human Oversight · Approval (★본 Part 최대 실재분)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **Human Oversight(원칙 §4)** | agent_mode 3모드·**기본 approval fail-safe** | `AdAdapters::agentMode`(:42~50) | PARTIAL-strong |
| **AI Safety 킬스위치** | 전역 실행 차단·auto는 킬스위치 종속 | `AdAdapters::executionEnabled`(:34)·`agentAutoAllowed`(:53~55)·(:194·:240) | PARTIAL-strong |
| Human Review(집행) | 제안-only + 승인 단일 액션만 실집행 | `ClaudeAI::agenticExecute`(054 확정·:956) | PARTIAL-strong |
| **Approval Workflow(정족수)** | 2인 정족수·approved만 집행·테넌트 소유 검증 | `Alerting`(:602 required_approvals=2·:626~632·:586) | PARTIAL |
| 승인 무결성 하드닝 | actor 위조 차단(감사·정족수 위조 방지) | `Alerting`(:36 주석·:70) | PARTIAL |
| AI 정책 변경 감사 | agent_mode 변경 high 감사 | `UserAuth`(054 확정·:1748) | PARTIAL |

### B. AI Audit · Immutable Log
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **Immutable Audit Log(§13)** | **append-only + 해시체인**(prev_hash→변조 시 verify 깨짐) | `SecurityAudit`(:8·:29·:38·:48~51) | PARTIAL-strong |
| **Audit 검증기** | 체인 무결성 검증·파손 id 반환 | `SecurityAudit::verify`(:56~64) | PARTIAL-strong |
| **AI Decision Logging** | AI 응답 영속(질문·요약·**model**·tokens·status·error) | `ClaudeAI` `ai_analyses`(053 확정·:469~502) | PARTIAL |
| **Prompt Logging / Response Logging** | 렌더된 프롬프트 + 결과 + 토큰 영속 | `AiGenerate` `ai_generate_log`(053 확정·:59~78·:178~179) | PARTIAL |
| **Model Version Tracking** | 예측마다 `model_version` 기록 | `risk_prediction`(`Db`:458~466)·`Risk`(:91·:124) | PARTIAL |
| User Activity Audit | 보안 감사 로그(actor·action·ip·ua) | `SecurityAudit`(:29·:48~51) | PARTIAL |

### C. Model 등록 · 위험/드리프트 모니터링
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **Model Registration(부분)** | `risk_model_registry`(model_name·**model_version**·**is_deployed**·metrics_json·training_range_json) | `Db`(:447~456)·`Risk`(:81·:118·:149~151·:175) | PARTIAL |
| ML 모델 메타·상태 | ml_models(status·drift_score·drift_status) | `ModelMonitor`(:30~47·052 확정) | PARTIAL-weak |
| **Continuous Monitoring(드리프트)** | drift_score/threshold·needs_retrain·건강도 집계 | `ModelMonitor`(:42~45·:126·:134~136) | PARTIAL |
| 모델 성능 이력 | ml_model_metrics(drift_score 시계열) | `ModelMonitor`(:49~58) | PARTIAL-weak |
| 재학습 이력 | ml_retrain_log(status) | `ModelMonitor`(:62~69·★`retrain()` mt_rand=시뮬레이션·052 확정) | PARTIAL-weak |
| **Risk Scoring(사업 리스크)** | 가중합+시그모이드 확률 | `Risk::predict`(:31~60) | PARTIAL |
| **Explainability(로컬 기여도)** | 피처별 기여도 산출·|기여도| 정렬·drivers 상위 | `Risk::predict`(:56~60)·`risk_prediction.drivers_json`(`Db`:464) | PARTIAL |
| 이상 탐지 | 이상 탐지 핸들러 | `AnomalyDetection`(:21) | PARTIAL-weak |

### D. Responsible AI · Privacy · Transparency
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **Transparency 공시** | 응답에 `no_pii`·`derived_from`(소스)·집계기반 note | `Decisioning`(:477~481) | PARTIAL |
| **Privacy by Design(§4)** | 집계 코호트만·개인 추적 없음(v418.1) | `Decisioning`(:478) | PARTIAL-strong |
| 도구 개인정보 미반환 | 코파일럿 도구=집계값만 | `ClaudeAI`(053 확정·:853) | PARTIAL-strong |
| Privacy Protection(삭제권) | DSAR export/execute·식별그래프 삭제 | `Dsar`(055 확정·:409·:539·:683~698) | PARTIAL |
| **Explainability 지시(생성형)** | 근거 수치 강제·추측/날조 금지 | `ClaudeAI`(053 확정·:271·:309·:876) | PARTIAL-weak |
| 무허위 정직 표기 | AI 미가용 고지·폴백에 허위 성과수치 없음 | `MmmReportI18n`(053 확정·:13)·`AdminGrowth`(:1073) | PARTIAL |
| **AI Usage 통제(비용·남용)** | 테넌트 일일 캡·토큰 미터링 | `ClaudeAI` `ai_usage_quota`(053 확정·:519~521·:529~539) | PARTIAL-strong |

### E. Security · Tenant · 규범(문서)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Tenant Isolation | 미들웨어 auth_tenant만 신뢰·fail-closed | `Risk`(:15~18)·`GraphScore`(055 확정·:33~41) | PARTIAL-strong |
| RBAC·쓰기 봉인 | 서버측 전역 writeGuard | `index.php`(:72~75) | PARTIAL-strong |
| Governance 데이터 암호화 | `Crypto` AES-256-GCM(049) | (049) | PARTIAL |
| **AI Policy(★문서 규범)** | 헌법 V1~V5·CHANGE_GATE | `docs/CONSTITUTION.md`·`docs/CHANGE_GATE.md`·`docs/DATA_TRUST_QUALITY_CONSTITUTION.md`(V3)·`docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(V4)·`docs/MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`(V5) | **PARTIAL(문서)·엔진 ABSENT** |

## 부재(ABSENT — 부재증명 완료·grep 0)
★**AI Governance Platform 전면**: AI_POLICY/AI_STANDARD/AI_RISK/**MODEL_RISK**/AI_CONTROL/AI_COMPLIANCE/AI_APPROVAL/AI_EXPLANATION/AI_DECISION/AI_EXCEPTION/AI_INCIDENT/AI_AUDIT/AI_REVIEW/AI_SCORE/AI_GOVERNANCE **엔티티 전량**·**Governance Registry**(§6 "모든 AI 자산은 Governance Registry 기준" 근간 미충족)·AI Policy Manager·AI Governance Advisor·**AI Trust Dashboard**·AI Safety Manager(형식)·AI Explainability Service(형식).
★**Responsible AI(§8) 대부분**: **Fairness Assessment**·**Bias Detection**·형식 Explainability Analysis·**Transparency Validation(검증기)**·**Ethical Evaluation**·**AI Trust Score**(grep 0 — `DataPlatform.reliability_score`는 **데이터** 신뢰이지 AI 신뢰 아님).
★**Model Risk Management(§9) 전면**: **Risk Classification(모델 위험등급)**·모델 Risk Scoring·**Impact Analysis**·**Failure Analysis**·**Risk Mitigation**·**Control Validation**·Risk Dashboard(모델)·**Periodic Review**(★"모든 AI 모델은 **위험 등급**을 관리한다" **미충족** — 위험등급 개념 자체 부재).
★**AI Compliance(§10) 전면**: Regulatory Compliance·Internal Policy Validation(엔진)·AI Standard Verification·**Compliance Reporting**·Control Monitoring·**Exception Handling**·Compliance Analytics(★`Alerting` action_request 정족수는 **액션 승인**이지 **모델 컴플라이언스 승인**이 아님·생산자 부재는 287/288차 확정 보류분).
★**Governance Lifecycle(§7) 대부분**: **Policy Definition(엔진)**·**Risk Assessment**·형식 Model Registration(**approval/promotion/lineage 부재** — `risk_model_registry`는 `is_deployed` 플래그뿐·`ml_models`는 경량 메타·**052 판정과 일치**)·**Compliance Validation**·**Approval(모델 배포 승인)**·**Periodic Review**·**Retirement**·**Archive**(★"모든 AI 모델은 **Governance 승인 절차**를 따라야 한다" **미충족** — 모델 배포 승인 게이트 부재).
★**AI Audit(§11) 형식 계층**: **Policy Audit**·**Incident Audit**·**Compliance Audit**·AI 전용 감사 트레일(★`SecurityAudit`은 **보안 감사**이며 AI_AUDIT 엔티티 아님)·★**AI 활동 추적의 구멍**: `ClaudeAI` 챗봇/코파일럿/라이브 어시스트 경로는 **감사 행 자체가 없다**(053 확정 — `ai_analyses`/`ai_generate_log`는 2개 경로만).
★**Runtime 규칙(§14)**: **Policy Validation**·**Risk Evaluation**·**Compliance Check**·형식 Explainability 생성·**Incident Detection(AI)**·Governance 기록 — 전부 부재(현행 런타임 게이트는 quota·킬스위치·writeGuard·플랜게이트뿐).
★**API 표준(§15) 8종 전량**·**Event 표준(§16) 8종 전량**(PolicyRegistered/ModelRiskEvaluated/ComplianceValidated/AIApproved/AIRejected/IncidentDetected/GovernanceReviewed/GovernanceAudited).
★**성능 SLA(§18)**: Policy Validation ≤200ms·Risk Assessment ≤1s·Compliance ≤500ms·Audit ≤200ms·**99.99% 가용성**=측정·보증 장치 부재(단일호스트·Part 044/045/050 승계).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ `Alerting` action_request **생산자 INSERT 부재**=**287/288차 확정·보류 등재분**([[project_n287_full_audit]]·[[project_n288_full_audit]]) — 상태 기술만·재플래그 안 함. ⓑ `ModelMonitor::retrain()`의 mt_rand 시뮬레이션=**052 확정·정직 표기분**. ⓒ `risk_model_registry`는 **051/052 GT에서 테이블 단위로 다뤄지지 않았으나** `model_version`+`is_deployed`+`metrics_json`+`training_range_json`을 보유한다 — 다만 **approval/promotion/lineage는 없어** 052의 "형식 Model Registry=ABSENT" 판정과 **모순되지 않는다**(본 Part는 §11 Model Version Tracking 실재분으로만 인정).

## 판정
**PARTIAL-weak (인간감독·불변감사·사용통제 축은 실재 / ★형식 AI Governance·Responsible AI·Model Risk Management 계층 = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: 명세 §4 원칙 중 **Human Oversight**(`agent_mode` 3모드·**기본 approval fail-safe**:42~50 + 킬스위치 종속:34/:53~55 + 제안-only+HITL 집행)·**Audit by Default 일부**(`SecurityAudit` **append-only 해시체인 + verify** :8/:29/:48~51/:56~64 = 저장소 유일 tamper-evident)·**Privacy by Design**(집계 코호트·No-PII v418.1 `Decisioning`:478·도구 개인정보 미반환)·**Security by Default**(테넌트 fail-closed `Risk`:15~18·전역 writeGuard `index.php`:72~75·`Crypto`)·**Continuous Monitoring 일부**(`ModelMonitor` drift_score/threshold/needs_retrain:42~45/:126/:134~136)가 **실제로 동작**한다. 또한 **AI Decision/Prompt/Response Logging 부분**(`ai_analyses`·`ai_generate_log`)·**Model Version Tracking**(`risk_prediction.model_version`)·**로컬 기여도 설명**(`Risk::predict` 피처 기여도 정렬→`drivers_json`)·**Transparency 공시**(`Decisioning`:477~481 `no_pii`/`derived_from`/집계기반 note)·**AI 사용 통제**(`ai_usage_quota` 테넌트 일일 캡)가 실재한다.
★**부재(grep 0·부재증명 완료·축소 금지)**: **Canonical Entity 15종 전량**·**Governance Registry**·AI Policy Manager/Advisor/Trust Dashboard/Safety Manager/Explainability Service·**Fairness·Bias Detection·Ethical Evaluation·AI Trust Score**·**Model Risk Management 전면(위험등급·Impact/Failure 분석·Mitigation·Control Validation·Periodic Review)**·**AI Compliance 전면**·**모델 배포 Governance 승인 게이트**·Policy/Incident/Compliance Audit·**Runtime 7규칙**·**API 8종·Event 8종**·성능 SLA.
★**오흡수 금지**: **`Shapley`(마케팅 채널 기여도 분해·`mlAttribution.js`)≠SHAP 모델 설명** · `explainability` 히트=**어트리뷰션 UI 라벨**(`inject_attrdata_i18n.cjs`:34/:38) + **정적 공시 메타**(`Decisioning`:477)이지 설명 생성 엔진 아님 · **`ai_policy` 2히트=주석 내 localStorage 설정키**≠AI_POLICY 엔티티 · **`Risk`/`risk_model_registry`/`risk_prediction`=판매자·계정 사업 리스크**≠**Model** Risk Management · `ModelMonitor` drift_score≠모델 **위험등급** · **`SecurityAudit`(보안 감사)≠AI_AUDIT 엔티티** · **`Alerting` action_request(액션 승인·생산자 부재)≠모델 배포 Governance 승인** · `RuleEngine` 임계값≠AI Governance Policy · **`DataPlatform.reliability_score`(데이터 신뢰)≠AI Trust Score** · `agent_mode` 3모드≠AI Governance Framework · **헌법 V1~V5·CHANGE_GATE는 문서 규범이지 실행 엔진이 아니다**(정직 표기·과대주장 금지). 코드 변경 0.
