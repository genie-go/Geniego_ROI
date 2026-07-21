# EPIC 06-A Part 3-46 — Enterprise AI-Native Governance Architecture (EAINGA) · SPEC v1.0

> **거버넌스 상태**: 설계 명세(canonical) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 Part1~3-45 인증) · 289차 후속(2026-07-21).
> 사용자 제공 handbook(v1.0) verbatim 기반. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §0 작업 목적
Authorization Platform을 AI 중심으로 설계·운영·감사·최적화하는 **AI-Native Governance Architecture(EAINGA)**. AI를 추가가 아니라 Platform을 AI-Native로 재설계 — Policy Lifecycle/Authorization Decision/Compliance/Risk/Operations/Audit/Executive Governance를 AI·사람 협업으로. 원칙: AI-Native by Design · Human-in-the-Loop · Explainability First · Responsible AI · Continuous Learning · Trustworthy AI · Governance by Default · Secure AI Lifecycle · Model Independence · Continuous Verification.

## §1 구현 목표 (25)
AI Governance Registry/Manager · AI Policy Orchestrator · AI Decision Engine · AI Reasoning Coordinator · AI Model Registry · AI Prompt Governance Manager · AI Context Manager · AI Memory Governance · AI Safety Engine · AI Explainability Engine · AI Risk Assessment Engine · AI Compliance Validator · AI Operations Manager · AI Lifecycle Manager · AI Evaluation Framework · AI Snapshot Manager · AI Evidence Repository · AI Digest Manager · AI Analytics Engine · Executive AI Dashboard · Runtime Guard · Static Lint · APIs · Completion Gate.

## §2 Canonical Entity (20)
APPROVAL_AI_{GOVERNANCE·MODEL·POLICY·DECISION·REASONING·PROMPT·CONTEXT·MEMORY·SAFETY·EXPLAINABILITY·COMPLIANCE·RISK·ANALYTICS·BASELINE·VERSION·SNAPSHOT·EVIDENCE·DIGEST·STATUS·CERTIFICATION}. → 상세 판정 = `DSAR_APPROVAL_EAINGA_CANONICAL_ENTITIES.md`.

## §3~§21 도메인 (요지)
- **§3 AI Governance / §6 AI Model Registry / §14 AI Operations**: ★실 substrate — `ClaudeAI.php`(MODEL=claude-sonnet-4-6·마케팅 LLM)·`AiGenerate.php`(DEFAULT_MODEL=claude-haiku-4-5·**모델 은퇴 처리=Model Lifecycle seed**)·`ModelMonitor.php`(드리프트/모니터링)·`AnomalyDetection.php`. **단 KEEP_SEPARATE**: 이들은 **마케팅/데이터 AI**(Volume 4/5 Unified Intelligence Layer)이지 **Authorization 거버넌스 AI 아님**. 형식 Model Card/Registry ABSENT.
- **§5 AI Decision Engine / §11 Explainability**: `Decisioning.php`(confidence·집계전용 v418.1)·`AutoRecommend`. ★Explainability = **데이터 헌법 V4 강제(모든 추천에 근거/신뢰도 표시·근거없는 결론 금지)** — 실 정책 substrate. 형식 Decision Trace/Reason Chain 엔진 ABSENT.
- **§10 AI Safety / §12 Risk / §13 Compliance**: 대부분 **ABSENT-formal**. Data Leakage Prevention=No-PII(집계 코호트)+`Db.php` 테넌트 격리 실재. **Prompt Injection Defense=ABSENT**(LLM 프롬프트 인젝션 엔진 없음). Responsible AI=헌법 aspirational.
- **§7 Prompt Governance / §8 Context / §9 Memory**: **ABSENT** — 프롬프트가 ClaudeAI/AiGenerate 인라인·버전/승인/롤백 없음. Context=요청 컨텍스트 실재하나 형식 AI Context Manager 아님.
- **§16 Evaluation / §20 Analytics**: PARTIAL — `ModelMonitor`(드리프트)·`AnomalyDetection`. AI Trust Index/Hallucination Rate 형식 지표 ABSENT.

## §22 Runtime Guard
Unapproved Model Usage · Prompt Injection · Unsafe AI Decision · Policy Bypass · **Cross-Tenant Context Leakage**(=`Db.php` 격리·[[reference_platform_growth_actas_tenant_hijack]] 교훈 재사용) · Explainability Failure. → PARTIAL(격리·데이터 안전만).

## §23~§28 Lint/Error/Warning/API/DB/Index
§24 Error(AI_MODEL_VALIDATION_FAILED·AI_DECISION_ABORTED·AI_SAFETY_VIOLATION·PROMPT_VALIDATION_FAILED·MODEL_DRIFT_EXCEEDED·AI_COMPLIANCE_FAILED·AI_EXPLAINABILITY_FAILED)=순신설. §26 API(Register AI Model·Execute AI Decision·Validate Prompt·Query AI Governance·Export AI Audit·Query Analytics·Evaluate Model·Publish Baseline)=ABSENT(admin 게이트·최신 버전 프리픽스·[[reference_api_prefix_routing]]). §27 DB(Immutable AI History/Evidence Integrity=`SecurityAudit::verify` 재사용·Tenant Isolation=`Db.php`). → 상세 = `DSAR_APPROVAL_EAINGA_GOVERNANCE_MECHANISMS.md`.

## §29 성능
AI Decision ≤700ms · Explainability ≤2초 · Model Validation ≤30초 · Dashboard ≤5초 · Availability ≥99.999%. (벤치 대상 미존재.)

## §30 테스트
Unit(Decision/Safety/Explainability/Compliance/Analytics)·Integration(Part3-45 EAGDTEF 등 상위 프레임워크)·Performance(10k Models·100M Decisions/일·500M Prompt·50k 동시·100 Region)·**Security(★Prompt Injection·Model Poisoning·Data Leakage·Cross-Tenant Context·Unauthorized Model Deployment)**·Compliance(ISO 42001·23894·NIST AI RMF·27001·EU AI Act)·Regression. 순신설.

## §31 Completion Gate
25 구성요소 구축 + Performance Benchmark + AI-Native Governance Validation + Regression 100%. → **미충족**(형식 AI 거버넌스 ABSENT·마케팅 AI는 KEEP_SEPARATE·코드 0). **BLOCKED_PREREQUISITE**.

## 판정
**PARTIAL(마케팅/데이터 AI 인프라 실재) / ABSENT-formal(authz-도메인 AI 거버넌스 greenfield).** ★핵심=ClaudeAI/AiGenerate/ModelMonitor/Decisioning/DataTrust는 **마케팅·데이터 AI**로 KEEP_SEPARATE — authz AI 거버넌스 신설 시 이들 오흡수 금지, 패턴(model const·드리프트 모니터·Explainable-AI 강제·READY 게이트)만 승격. Prompt Injection Defense·형식 Model Registry·Prompt Governance는 순신설. 코드 변경 0.

## 다음
Part 3-47 Universal Trust Computing Framework → 3-53 Autonomous Constitutional Governance Platform.
