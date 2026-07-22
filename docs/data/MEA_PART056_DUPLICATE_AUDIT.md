# MEA Part 056 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = AI Governance/Responsible AI/Model Risk 계층 신설이 기존 **인간감독**(`AdAdapters` agent_mode·킬스위치)·**승인**(`Alerting` action_request)·**불변 감사**(`SecurityAudit` 해시체인)·**모니터링**(`ModelMonitor`)·**모델/예측 기록**(`Risk` registry·prediction)·**AI 로깅**(`ai_analyses`·`ai_generate_log`)·**사용 통제**(`ai_usage_quota`)·**보안**(`index.php` writeGuard·`Crypto`)·**규범 문서**(헌법 V1~V5·`CHANGE_GATE`)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**본 Part는 051~055를 가로지르는 cross-cutting 계층**이다 — 하위 Part가 이미 판정한 substrate를 **재판정하지 않는다**(값 분산=회귀).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| AI 자산·모델 메타·서빙 | ★MEA Part 051(`ClaudeAI`·`ModelMonitor`·`Risk` 등) | ★재정의 금지·재사용 |
| ML 수명주기·드리프트·재학습 | ★MEA Part 052(`ModelMonitor`·형식 Model Registry=ABSENT 확정) | ★재정의 금지·**재판정 금지** |
| LLM 호출·프롬프트·토큰·감사 로그 | ★MEA Part 053(`ClaudeAI`·`ai_analyses`·`ai_generate_log`·`ai_usage_quota`) | ★재정의 금지·재사용 |
| Agent 권한모드·HITL·Maker-Checker | ★MEA Part 054(`agent_mode`·`agenticExecute`·`Alerting`) | ★재정의 금지·**재판정 금지** |
| Knowledge/RAG·Knowledge ACL | ★MEA Part 055 | ★재정의 금지 |
| **AI Policy 규범 정본(문서)** | ★헌법 V1(CONSTITUTION)·V3(Data Trust)·V4(Unified Intelligence)·V5(Marketing Automation)·`CHANGE_GATE` | ★**재정의 금지** — Policy 엔진은 이 문서를 **집행**할 뿐 새 규범을 만들지 않는다 |
| 데이터 신뢰·품질(READY) | ★데이터 헌법 V3·`DataPlatform` | ★재정의 금지(★**데이터** 신뢰≠**AI** Trust Score) |
| 테넌트·RBAC·감사·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |
| Role/Permission·승인 위임 거버넌스 | ★EPIC 06-A Part1~3-8(설계·코드 0) | ★재정의 금지(AI_APPROVAL은 그 위에) |
| API Gateway·Observability | ★MEA Part 042/046 | ★재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 거버넌스/감사 엔진 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Human Oversight | agent_mode 3모드·기본 approval | `AdAdapters`(:42~50) | ★재사용(중복 모드 저장 금지) |
| AI Safety 킬스위치 | 전역 실행 차단 | `AdAdapters::executionEnabled`(:34·:194·:240) | ★재사용(중복 스위치 금지) |
| AI_APPROVAL | action_request 2인 정족수 | `Alerting`(:602·:626~632) | ★재사용·★오흡수 금지(**액션 승인≠모델 배포 승인**) |
| **AI_AUDIT** | 보안 해시체인 감사 | `SecurityAudit`(:8·:29·:56~64) | ★재사용(정본)·★오흡수 금지(**보안 감사≠AI 감사 엔티티**) |
| AI Decision Logging | AI 응답 영속 | `ai_analyses`(053·:469~502) | ★재사용(중복 로그 테이블 금지) |
| Prompt/Response Logging | 프롬프트+결과+토큰 | `ai_generate_log`(053·:59~78) | ★재사용·★정직 표기(**2경로만 커버**) |
| Model Version Tracking | 예측별 model_version | `risk_prediction`(`Db`:458~466) | ★재사용 |
| **MODEL_RISK** | 판매자·계정 사업 리스크 | `Risk`(:12·:31~60)·`risk_model_registry`(`Db`:447~456) | ★**오흡수 금지**(사업 리스크≠모델 리스크) |
| Model Registration | model_version·is_deployed | `risk_model_registry`(`Db`:447~456)·`ml_models`(`ModelMonitor`:30~47) | ★재사용·★오흡수 금지(**approval/promotion/lineage 부재**·052 판정 유지) |
| Continuous Monitoring | drift_score/threshold | `ModelMonitor`(:42~45·:126) | ★재사용·★오흡수 금지(드리프트≠모델 **위험등급**) |
| AI_EXPLANATION | 피처 기여도 정렬·drivers | `Risk::predict`(:56~60)·`drivers_json`(`Db`:464) | ★재사용·승격(중복 설명기 금지) |
| Explainability(생성형) | 근거 강제·날조 금지 지시 | `ClaudeAI`(053·:271·:309·:876) | ★재사용·★오흡수 금지(지시문≠설명 생성 엔진) |
| **Shapley(설명)** | 마케팅 채널 기여도 분해 | `frontend/src/lib/mlAttribution.js`·`Attribution.jsx` | ★**오흡수 금지**(채널 어트리뷰션≠SHAP 모델 설명·**`shap` 단어경계 0**) |
| Transparency Validation | `no_pii`·`derived_from` 공시 | `Decisioning`(:477~481) | ★재사용·★오흡수 금지(정적 공시≠검증기) |
| AI Trust Score | 데이터 신뢰도 점수 | `DataPlatform`(055·:231·:308) | ★**오흡수 금지**(데이터 신뢰≠AI Trust) |
| AI Usage 통제 | 테넌트 일일 캡·토큰 미터링 | `ai_usage_quota`(053·:519~521·:529~539) | ★재사용(중복 quota 금지) |
| Privacy Protection | 집계 코호트·DSAR 삭제 | `Decisioning`(:478)·`Dsar`(055·:409·:539) | ★재사용(중복 삭제 경로 금지) |
| AI_POLICY | 주석 내 localStorage 설정키 | `Topbar`(:302)·`tenantStorage`(:13) | ★**오흡수 금지**(설정 키 나열≠정책 엔티티) |
| AI Governance Policy | 규칙 임계값 | `RuleEngine`(054·:41~50) | ★오흡수 금지(임계값≠거버넌스 정책) |
| Incident Detection | 이상 탐지 | `AnomalyDetection`(:21) | ★재사용·★오흡수 금지(데이터 이상≠**AI** 인시던트) |
| Tenant/RBAC | fail-closed·writeGuard | `Risk`(:15~18)·`index.php`(:72~75) | ★재사용(중복 IAM 금지) |
| Governance 암호화 | `Crypto` AES-256-GCM | (049) | ★재사용 |

## ★★핵심 경계 — "규범은 문서에 있고 엔진이 없다"
저장소에는 **AI Governance 규범이 문서로 이미 존재**한다: `docs/CONSTITUTION.md`(V1)·`docs/DATA_INTELLIGENCE_CONSTITUTION.md`·`docs/DATA_TRUST_QUALITY_CONSTITUTION.md`(V3)·`docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(V4)·`docs/MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`(V5)·`docs/CHANGE_GATE.md`.
★그러나 이는 **사람이 읽고 지키는 규범**이며 **런타임 정책 엔진이 아니다**(정직 표기·과대주장 금지). 본 Part의 AI Policy Manager는 **새 규범을 만드는 것이 아니라 이 문서들을 기계 판독 가능한 정책으로 집행**하는 것이며, **규범 자체를 재정의하면 값 분산(회귀)**이다([[feedback_no_regression_value_unification]]).

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **감사 체인 이원화 금지**: AI_AUDIT을 새 해시체인으로 만들면 `SecurityAudit::verify`와 **두 개의 진실**. **`SecurityAudit` 위에 AI 이벤트 타입을 얹는다**([[reference_menu_audit_log_not_tamper_evident]] — 체인 정본은 하나).
2. **승인 경로 이원화 금지**: AI_APPROVAL을 새 테이블로 만들면 `action_request` 정족수와 중복. **`action_request` 확장**(054 D-5 동일 결정). ★단 **생산자 부재는 287/288차 확정 보류분**이므로 재플래그하지 않는다.
3. **로그 3원화 금지**: AI Decision/Prompt/Response Logging은 이미 `ai_analyses`·`ai_generate_log` **2개**로 갈라져 있다(053 확정). **세 번째 로그 테이블 신설 금지** — 053 ADR D-2 Gateway 일원화와 **동시에** 감사 스키마를 통일한다.
4. **모니터링 이원화 금지**: Continuous Monitoring은 `ModelMonitor` 확장. 별도 모델 감시기 신설 금지.
5. **인간감독 게이트 우회 금지**: Governance 도입이 `agent_mode` 기본 approval·킬스위치·제안-only를 **약화시키면 즉시 회귀**(054 D-2와 동일).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. 인간감독·승인·불변감사·모니터링·AI 로깅·사용통제 substrate가 **전부 실재** → **중복 거버넌스/감사/승인 엔진 신설 금지·기존 심화**. 헌법 V4.
- ★[[feedback_minimize_new_menus]]: AI Trust Dashboard·Governance Console은 신규 사이드바가 아니라 기존 AI/관리자 메뉴 편입 우선.
- ★[[feedback_no_regression_value_unification]]: **agent_mode 기본 approval·킬스위치·제안-only·2인 정족수·해시체인 append-only·테넌트 fail-closed·writeGuard·quota 캡**은 약화 시 즉시 회귀. **후퇴 금지 자산.**
- ★[[feedback_competitive_gap_verify]]: Fairness·Bias·Trust Score·Model Risk·Compliance·Event 8종 부재=grep 0 부재증명 완료. **동시에 인간감독·해시체인 감사·드리프트 모니터링·기여도 설명은 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_real_value_autoderive]]: AI Trust Score·Governance Analytics는 **실 로그 파생만**(`security_audit_log`·`ai_analyses`·`ml_model_metrics`·`ai_usage_quota`) — 임의 점수 금지. ★**Trust Score를 숫자로 지어내면 본 Part 자체가 반례**가 된다.
- ★[[feedback_audit_reference_past_fixes]]: `action_request` 생산자 부재(287/288차)·`ModelMonitor::retrain()` mt_rand(052)·`graph_node` UNIQUE(288차)=**확정·보류/수정 완료분** — 상태 기술만·재플래그 금지.
- ★[[reference_platform_growth_actas_tenant_hijack]]: Governance 데이터는 **테넌트 격리 절대**. `Risk`(:15~18)의 fail-closed 패턴 준수.
- ★[[reference_api_prefix_routing]]·053 ADR D-5: 신규 Governance API는 `/api` 접두 동시 등재 + **인증 공개 bypass 접두 배치 금지**(인증 우회).
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인되지 않은 모델을 운영에 자동 배포하거나 Governance 정책을 자동 변경 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: Human Oversight=`agent_mode`+킬스위치 · AI_APPROVAL=`action_request` · **AI_AUDIT=`SecurityAudit` 해시체인 위에 AI 이벤트 타입 추가** · AI Decision/Prompt/Response Log=`ai_analyses`+`ai_generate_log` **스키마 통일** · Continuous Monitoring=`ModelMonitor` · Model Version Tracking=`risk_prediction.model_version` · AI_EXPLANATION=`Risk::predict` drivers 승격 · Transparency=`Decisioning` 공시 확장 · Usage 통제=`ai_usage_quota` · Privacy=`Dsar`+No-PII · 보안=`index.php`/`Crypto`/`Db` · **정책 원문=헌법 V1~V5·`CHANGE_GATE`(집행만·재정의 금지)**.
- **순신설(부재·grep 0)**: ★Canonical Entity 15종·**Governance Registry**·AI Policy Manager(문서 규범의 기계 집행)·**Fairness/Bias Detection**·**AI Trust Score**·Ethical Evaluation·Transparency Validation(검증기)·**Model Risk Management 전면**(위험등급·Impact/Failure 분석·Mitigation·Control Validation·Periodic Review)·**AI Compliance 전면**·**모델 배포 Governance 승인 게이트**·Policy/Incident/Compliance Audit·AI Explainability Service(형식)·**AI Trust Dashboard**·AI Safety Manager·Governance Advisor·Runtime 7규칙·**API 8종·Event 8종**.

## 판정
**중복 위험 高(인간감독·승인·불변감사·모니터링·AI 로깅·사용통제 substrate 전부 실재) + ★신설 시 발생할 내부 중복 5종 사전 차단 명시 + ★★규범 문서 재정의 절대 금지.** ★핵심=`AdAdapters`(agent_mode·킬스위치)·`Alerting`(action_request 정족수)·**`SecurityAudit`(append-only 해시체인+verify=저장소 유일 tamper-evident)**·`ModelMonitor`(드리프트)·`Risk`(+`risk_model_registry`/`risk_prediction`·기여도 drivers)·`ClaudeAI`/`AiGenerate`(`ai_analyses`·`ai_generate_log`·`ai_usage_quota`)·`Decisioning`(No-PII 공시)·`AnomalyDetection`·`Dsar`·`index.php`(writeGuard)·`Crypto`·**헌법 V1~V5+`CHANGE_GATE`(문서 규범 정본)**는 **재사용/승격**(★중복 거버넌스·감사 체인·승인 경로·로그 테이블·모니터링 엔진 신설 절대 금지=헌법 V4·정본 재구현 금지). 헌법 V4/V5·데이터 헌법 V3·Part 042/046/047/048/049/**051/052/053/054/055**·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=★Canonical Entity 15종·Governance Registry·Policy Manager·Fairness/Bias·AI Trust Score·Model Risk Management 전면·AI Compliance 전면·모델 배포 승인 게이트·Trust Dashboard·Runtime 7규칙·API/Event 각 8종뿐(부재·grep 0·부재증명 완료). ★오흡수 금지(**`Shapley`(마케팅 채널 기여도)≠SHAP 모델 설명·`shap` 단어경계 0** · `explainability` 히트=어트리뷰션 UI 라벨+정적 공시 메타 · **`ai_policy` 2히트=주석 내 localStorage 설정키** · **`Risk`/`risk_*`=사업 리스크≠Model Risk** · drift_score≠모델 위험등급 · **`SecurityAudit`(보안)≠AI_AUDIT 엔티티** · **action_request(액션 승인)≠모델 배포 승인** · `RuleEngine` 임계값≠거버넌스 정책 · **`DataPlatform.reliability_score`(데이터 신뢰)≠AI Trust Score** · `AnomalyDetection`(데이터 이상)≠AI 인시던트 · **헌법·CHANGE_GATE=문서 규범이지 실행 엔진 아님**). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★승인되지 않은 모델 자동 배포·Governance 정책 자동 변경 불가(V5+CHANGE_GATE).
