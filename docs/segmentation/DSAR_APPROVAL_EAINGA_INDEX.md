# DSAR — EAINGA Index (Part 3-46)

> **거버넌스 상태**: 설계 명세 DSAR 인덱스 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).

Part 3-46 (Enterprise Authorization Enterprise AI-Native Governance Architecture) 산출 문서 색인.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/EPIC_06A_PART3_46_AI_NATIVE_GOVERNANCE_SPEC.md` | canonical SPEC v1.0(§0~§31) |
| `docs/architecture/ADR_DSAR_AUTHZ_AI_NATIVE_GOVERNANCE.md` | 설계 결정(D-1~D-5·마케팅 AI KEEP_SEPARATE·ModelMonitor 승격) |
| `DSAR_APPROVAL_EAINGA_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `DSAR_APPROVAL_EAINGA_DUPLICATE_IMPLEMENTATION_AUDIT.md` | GT② 마케팅/데이터 AI·상위 Part 중복 경계 |
| `DSAR_APPROVAL_EAINGA_CANONICAL_ENTITIES.md` | §2 20 엔티티 + §3~21 AI 거버넌스 설계·판정 |
| `DSAR_APPROVAL_EAINGA_GOVERNANCE_MECHANISMS.md` | §22~31 Guard/Lint/Error/API/DB/Test/Gate |
| `DSAR_APPROVAL_EAINGA_INDEX.md` | 본 색인 |

## 판정 요약
- **PARTIAL substrate(마케팅/데이터 AI 실재·authz 거버넌스 아님):** AI Model=`ClaudeAI.php:20`(claude-sonnet-4-6)·`AiGenerate.php:27`(claude-haiku-4-5) · Model Ops/Lifecycle=`AiGenerate.php:25`(모델 은퇴 처리)·`ModelMonitor.php`·`AnomalyDetection.php`(드리프트) · AI Decision=`Decisioning.php`(집계전용·No-PII)·`AutoRecommend.php` · Explainability=헌법 V4(근거/신뢰도 강제) · Evidence=`SecurityAudit.php` · Isolation=`Db.php`.
- **ABSENT-formal/greenfield:** AI Governance Registry(형식) · AI Policy Orchestrator · 형식 Model Registry/Model Card · Prompt Governance(버전/승인/롤백) · Context/Memory Governance · **AI Safety Engine(★Prompt Injection Defense·Hallucination Detection·Model Boundary)** · AI Explainability 엔진(Decision Trace) · AI Risk/Compliance Validator(ISO 42001/NIST AI RMF/EU AI Act) · AI Snapshot/Digest/Trust Index · Executive AI Dashboard · **authz 판단 AI 자체**.
- **★KEEP_SEPARATE:** 마케팅/데이터 AI(`ClaudeAI`/`AiGenerate`/`Insights`/`AutoCampaign`/`CustomerAI`/`Mmm`/`CreativeStudio`) ≠ authz 거버넌스 AI — 오흡수·재정의 금지. 중복 드리프트/해시체인/신뢰 엔진 신설 금지(V3 엔진 난립 금지).
- **★상위 Part 참조:** AI Trust=Part 3-45 EAGDTEF · AI Governance(Human Oversight)=Part 3-40 · Compliance=Part 3-36.
- **★교훈:** [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Context Leakage 차단) · [[reference_menu_audit_log_not_tamper_evident]](AI Evidence 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 Part1~3-45 인증 종속).

## 다음
Part 3-47 Universal Trust Computing Framework → 3-48 Long-Term Strategic Evolution → … → 3-53 Autonomous Constitutional Governance Platform.
