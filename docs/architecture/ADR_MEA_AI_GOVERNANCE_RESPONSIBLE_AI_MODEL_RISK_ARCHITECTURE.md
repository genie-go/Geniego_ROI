# ADR — MEA Part 056 Enterprise AI Governance, Responsible AI & Model Risk Management Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·데이터 헌법 V3·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★본 Part는 **051~055를 가로지르는 cross-cutting 계층** — 하위 Part 판정을 **재판정하지 않는다**(값 분산=회귀).

## Context
MEA Part 056은 모든 AI 자산(LLM·Agent·ML·Decision Intelligence)의 정책·위험·컴플라이언스·감사·설명가능성·신뢰를 통합 관리하려 한다. GeniegoROI에는 **원칙 축 일부가 실제로 동작**한다: **Human Oversight**(`agent_mode` 3모드·**기본 approval fail-safe** `AdAdapters`:42~50·킬스위치 종속 auto:34/:53~55·제안-only+HITL 054:956)·**Immutable Audit**(`SecurityAudit` **append-only + prev_hash 해시체인**:8/:29/:48~51 + **검증기** `verify`:56~64 = 저장소 유일 tamper-evident)·**Approval 정족수**(`Alerting` action_request 2인:602·approved만 집행·테넌트 소유 검증:626~632·actor 위조 차단:36/:70)·**Continuous Monitoring**(`ModelMonitor` drift_score/threshold/needs_retrain:42~45/:126/:134~136)·**Privacy by Design**(No-PII 집계 코호트 `Decisioning`:478·DSAR)·**Security by Default**(테넌트 fail-closed `Risk`:15~18·전역 writeGuard `index.php`:72~75)·**AI 사용 통제**(`ai_usage_quota` 053)·**AI Decision/Prompt/Response Logging 부분**(`ai_analyses`·`ai_generate_log`)·**Model Version Tracking**(`risk_prediction.model_version` `Db`:458~466)·**로컬 기여도 설명**(`Risk::predict`:56~60→`drivers_json`).
반면 **형식 거버넌스 계층은 전면 부재**: Canonical Entity 15종 중 11종·Governance Registry·Policy Manager·Fairness/Bias·AI Trust Score·**Model Risk Management 전면**·AI Compliance 전면·Runtime 7규칙·API 8종·Event 8종(전부 grep 0·부재증명 완료).

## D-1 ★★본 Part의 성격 규정 — "규범 없음"이 아니라 "규범은 문서에 있고 기계 집행이 없다"
**결정**: 저장소에는 **AI 거버넌스 규범이 문서로 이미 상당히 갖춰져 있다** — `docs/CONSTITUTION.md`(V1)·`docs/DATA_TRUST_QUALITY_CONSTITUTION.md`(V3: 신뢰 미달 데이터는 AI/자동화에서 제외)·`docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(V4: XAI 근거 표시·단일 Intelligence Layer)·`docs/MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`(V5: 승인 없는 파괴적 자동집행 금지·Safety Rule)·`docs/CHANGE_GATE.md`.
★**그러나 이는 사람이 읽고 지키는 규범이며 런타임 정책 엔진이 아니다.** 따라서 판정은 **"거버넌스 부재"가 아니라 "규범 실재 + 기계 집행 부재"**로 기술한다(**과대주장 금지 + 부재 축소 금지 동시 적용**).
★**AI Policy Manager 설계 원칙**: 문서 규범을 **기계 판독 가능한 정책으로 집행**할 뿐 **새 규범을 만들지 않는다**. 규범을 코드에서 재정의하면 **두 개의 진실**이 생기고 값 분산=회귀다([[feedback_no_regression_value_unification]]).

## D-2 ★Model Risk ≠ 사업 Risk — 최대 오흡수 위험 명시 차단
**결정**: `Risk`(v378~380)·`risk_model_registry`·`risk_prediction`은 **판매자·계정의 사업 리스크 예측**이다 — 피처가 `neg_review_density`·`policy_findings_high`·`policy_repeat_count`·`account_health_warnings`·`oos_rate`·`price_instability`(`Risk`:31~40)이고 산출이 가중합→시그모이드 확률(:41~)이다. **모델 자체의 위험(Model Risk)이 아니다.**
★마찬가지로 `ModelMonitor` drift_score(:42~45)는 **드리프트 신호**이지 **위험등급**이 아니다. 명세 §9 "모든 AI 모델은 **위험 등급**을 관리한다"는 **개념 자체가 부재**(grep 0: model_risk/risk_classification)이며 §9 8항목 전량 순신설이다.
★**설계 원칙**: Model Risk 등급 도입 시 **분류 기준을 문서 규범(헌법 V5 Safety Rule·`CHANGE_GATE`)에서 파생**하고, 등급별 통제는 **기존 게이트에 매핑**한다(고위험→`agent_mode` approval 강제·킬스위치 우선순위·quota 하향). **새 통제 스택 신설 금지.**

## D-3 ★AI_AUDIT=`SecurityAudit` 해시체인 확장 · 감사 체인 이원화 절대 금지
**결정**: `SecurityAudit`은 **append-only(UPDATE/DELETE 코드경로 없음) + prev_hash 해시체인**(:8·:29·:48~51)이며 **검증기 `verify`**(:56~64·변조 시 파손 id 반환)를 가진 **저장소 유일 tamper-evident 감사**다. 명세 §13 "Governance 데이터는 **변경 불가능한 Audit 정책**으로 보호한다"는 **이 패턴이 이미 답**이다.
★AI_AUDIT을 **새 해시체인으로 만들면 두 개의 진실**이 되어 tamper-evidence 자체가 무너진다 — **`SecurityAudit` 위에 AI 이벤트 타입을 얹는다**([[reference_menu_audit_log_not_tamper_evident]] — 체인 정본은 하나).
★**정직 표기**: `ai_analyses`·`ai_generate_log`는 **tamper-evident가 아니다**(평문 append·해시 없음·053 확정). 이를 "AI 감사 체인"으로 승격 주장 금지.

## D-4 ★★AI 활동 추적의 구멍 — 로그 3원화 금지 + 053 Gateway 일원화와 동시 해결
**결정**: 명세 §11 "**모든 AI 활동은 추적 가능해야 한다**"는 **미충족**이다. 현행 AI 로깅은 **`ai_analyses`(053:469~502)·`ai_generate_log`(053:59~78) 2경로만** 커버하며, **`ClaudeAI` 챗봇(053:82)·에이전틱 코파일럿(:839)·라이브 어시스트(:2079)·소재/이미지/영상 생성 경로는 감사 행 자체가 없다**(정직 표기).
★이는 053에서 확인된 **텍스트 LLM 호출 경로 2개 병존**과 **같은 뿌리**다. 따라서 **세 번째 로그 테이블을 신설하지 말고**, **053 ADR D-2 Gateway 일원화(`ClaudeAI::complete` 승격)와 동시에 감사 스키마를 통일**한다 — Gateway가 단일 통과점이 되면 **모든 AI 호출이 자동으로 감사된다**(구조적 해결).
★그때 **최대집합 승계 4조건**(quota 게이트·BYO 키 우선·`Crypto` 복호·감사 스키마)을 그대로 따른다.

## D-5 ★AI_APPROVAL=`action_request` 확장 · 승인 경로 이원화 금지 (액션 승인 ≠ 모델 배포 승인)
**결정**: 승인 정본=`Alerting` action_request(**2인 정족수**:602·**approved 상태에서만 집행**·**테넌트 소유 검증** IDOR 차단:626~632·테넌트 스코프 조회:586·**actor 위조 차단 하드닝**:36 주석/:70). Compliance/모델 승인 도입 시 **새 승인 테이블 신설 금지·확장**(054 D-5와 동일 결정).
★**단 오흡수 금지**: action_request는 **광고/CRM 액션 승인**이지 **모델 배포 Governance 승인**이 아니다. 명세 §7 "모든 AI 모델은 Governance 승인 절차를 따라야 한다"는 **미충족**이며 — `risk_model_registry.is_deployed`(`Db`:447~456)는 **수동 플래그일 뿐 승인 게이트가 아니다**.
★**052 정합**: `risk_model_registry`가 `model_version`+`is_deployed`+`metrics_json`+`training_range_json`을 보유하나 **approval/promotion/lineage는 부재**하므로 052 판정("형식 Model Registry=ABSENT")과 **모순되지 않는다**. 본 Part는 **§11 Model Version Tracking 실재분만 인정**하고 재판정하지 않는다.

## D-6 ★AI Trust Score는 실 로그 파생만 — 임의 수치 금지 (지어내면 본 Part가 반례)
**결정**: AI_SCORE/AI Trust Score는 **부재**(grep 0: trust_score/ai_trust/ai_score)이며 순신설이다. 도입 시 점수는 **실 로그 파생만** 허용한다 — `security_audit_log`·`ai_analyses`(status/error_msg)·`ml_model_metrics`(drift 시계열)·`ai_usage_quota`·`risk_prediction`([[feedback_real_value_autoderive]]).
★**임의 수치·하드코딩 점수 금지**: 신뢰도를 숫자로 지어내면 **본 Part(Responsible AI) 자체가 반례**가 된다.
★**오흡수 금지**: `DataPlatform.reliability_score`(055:308·데이터 헌법 V3)는 **데이터 신뢰**이지 **AI 신뢰**가 아니다 — 축이 다르므로 재사용 금지(다만 AI Trust 산식의 **입력 신호**로는 참조 가능).
★**Explainability 오흡수 금지**: `Shapley`(86+32 히트·`frontend/src/lib/mlAttribution.js`·`Attribution.jsx`·`ShapleyTab`/`ShapleyExact`)는 **마케팅 채널 기여도 분해**이지 **SHAP 모델 피처 설명이 아니다**(**`shap` 단어경계 히트 0**). `explainability` 3히트도 **어트리뷰션 UI 라벨**(`tools/inject_attrdata_i18n.cjs`:34/:38)과 **정적 공시 메타**(`Decisioning`:477)이지 설명 생성 엔진이 아니다. `ai_policy` 2히트는 **주석 내 localStorage 설정키 나열**(`Topbar`:302·`tenantStorage`:13)이다.

## D-7 ★자동 배포·정책 자동 변경 금지는 현행이 구조적으로 충족 (정직 기술·후퇴 금지)
**결정**: 명세 §17 말미 "AI는 **승인되지 않은 모델을 운영 환경에 자동 배포**하거나 **Governance 정책을 자동 변경**하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ **모델 자동 배포 경로 자체가 없다**(`is_deployed`는 수동 플래그·`ModelMonitor::retrain()`은 **mt_rand 시뮬레이션**이며 배포 트리거가 아님·052 확정) ⓑ **Governance 정책이 문서**라 AI가 자동 변경할 대상이 코드에 없다 ⓒ AI 액션은 **제안-only + HITL + 기본 approval + 킬스위치 종속**(054 D-2).
★**후퇴 금지 자산**. 향후 **자동 재학습·자동 승격(promotion)·자동 롤백**을 도입한다면 **승인 게이트를 반드시 앞에 둔다** — 무게이트 자동 배포는 **명세 §17 + 헌법 V5 동시 위반**([[feedback_deploy_approval_mandatory]]).
★**성능 제약 주의**(§18): Policy Validation ≤200ms·Compliance Check ≤500ms는 **매 요청 경로에 얹히므로** 캐시·비동기 설계가 선행되어야 하며, 무분별 삽입 시 기존 응답시간 회귀.
★**API 배치**: 거버넌스·감사·Trust Score API는 **전량 인증 필수 접두 + admin 스코프**(053 D-5 교훈 — `/v422/ai/*` 같은 **공개 bypass 접두에 얹으면 인증 우회**)·`/api` 변형 동시 등재([[reference_api_prefix_routing]]).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL-weak** — 인간감독·불변감사·모니터링·사용통제 축은 실재하나 **형식 AI Governance·Responsible AI·Model Risk Management 계층은 전면 부재**.
- ★중복 금지 재사용: `AdAdapters`(agent_mode·킬스위치)·`Alerting`(action_request)·`SecurityAudit`(해시체인 정본)·`ModelMonitor`(드리프트)·`Risk`(registry·drivers)·`ai_analyses`/`ai_generate_log`/`ai_usage_quota`·`Decisioning`(No-PII 공시)·`AnomalyDetection`·`Dsar`·`index.php`(writeGuard)·`Crypto`·**헌법 V1~V5+`CHANGE_GATE`(문서 규범 정본·재정의 금지)**.
- ★순신설: Canonical Entity 15종 중 11종·Governance Registry·AI Policy Manager(기계 집행)·Fairness/Bias Detection·**AI Trust Score**·Ethical Evaluation·Transparency Validation(검증기)·**Model Risk Management 전면**·**AI Compliance 전면**·모델 배포 승인 게이트·Policy/Incident/Compliance Audit·AI Explainability Service(형식)·AI Trust Dashboard·Safety Manager·Governance Advisor·Runtime 7규칙·API 8종·Event 8종.
- ★오흡수 금지: **`Shapley`(마케팅 채널 기여도)≠SHAP 모델 설명(`shap` 단어경계 0)** · `explainability` 히트=어트리뷰션 UI 라벨+정적 공시 메타 · **`ai_policy`=주석 내 localStorage 키** · **`Risk`/`risk_*`=사업 리스크≠Model Risk** · drift_score≠모델 위험등급 · **`SecurityAudit`(보안 감사)≠AI_AUDIT 엔티티** · **action_request(액션 승인)≠모델 배포 승인** · `RuleEngine` 임계값≠거버넌스 정책 · **`DataPlatform.reliability_score`(데이터 신뢰)≠AI Trust Score** · `AnomalyDetection`(데이터 이상)≠AI_INCIDENT · **헌법·`CHANGE_GATE`=문서 규범이지 실행 엔진 아님**.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·승인되지 않은 모델 자동 배포·Governance 정책 자동 변경 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/046/047/048/049/**051~055**·EPIC 06-A 상속·**재판정 금지**·재감사 금지(287/288차 action_request 생산자·052 retrain mt_rand 확정분).
