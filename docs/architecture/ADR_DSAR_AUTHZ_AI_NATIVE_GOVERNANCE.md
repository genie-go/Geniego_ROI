# ADR — DSAR Authorization AI-Native Governance (Part 3-46 · EAINGA)

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②(EAINGA EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
Part 3-46은 Authorization Platform을 AI-Native로 재설계. 코드베이스에는 이미 다수 AI 자산(마케팅/데이터)이 실재하나, **거버넌스 대상 AI = Authorization을 판단·감사하는 AI**는 부재. 데이터 헌법 Volume 3~5가 AI 신뢰(Trust First·READY 게이트)·Explainable AI(근거/신뢰도)·안전한 자동화(safety rule)를 이미 강제하므로, 이 원칙 substrate는 재사용하고 형식 AI 거버넌스 엔진만 신설한다.

## 결정
- **D-1 (마케팅/데이터 AI ≠ authz AI · KEEP_SEPARATE):** `ClaudeAI.php`(claude-sonnet-4-6)·`AiGenerate.php`(claude-haiku-4-5)·`Insights`/`AutoRecommend`/`Mmm`/`CustomerAI`는 **마케팅/데이터 Intelligence Layer**(Volume 4/5). authz AI 거버넌스가 이들을 오흡수·재정의 금지. 단 model-const·model-retirement·drift 패턴은 승격 대상.
- **D-2 (Explainability = 헌법 강제 재사용):** 데이터 헌법 V4 "모든 추천에 근거/신뢰도·근거없는 결론 금지"가 실 정책 substrate. `Decisioning.php` confidence·집계전용(v418.1 No-PII)와 정합. 형식 Decision Trace/Reason Chain은 이 위에 신설.
- **D-3 (AI Operations = ModelMonitor 승격):** `ModelMonitor.php`(드리프트)·`AnomalyDetection.php`·`AiGenerate` 모델은퇴 처리(model lifecycle rollback seed)를 AI Operations/Lifecycle의 seed로. 중복 드리프트 엔진 신설 금지(V3 "엔진 난립 금지").
- **D-4 (AI Safety — Data Leakage = 기존 격리·No-PII / Prompt Injection = 순신설):** Data Leakage Prevention·Cross-Tenant Context Leakage=`Db.php` 테넌트 격리 + 집계전용 No-PII 재사용([[reference_platform_growth_actas_tenant_hijack]] 위임 tenant 고착 방지 교훈). **Prompt Injection Defense·Hallucination Detection·Model Boundary=순신설**(현행 부재).
- **D-5 (Evidence = SecurityAudit::verify · 중복 해시체인 금지):** Immutable AI History·Decision/Audit Evidence=유일 정본 append-only 해시체인 `SecurityAudit::verify` 재사용. 메뉴/저니 snapshot은 tamper-evident 아님([[reference_menu_audit_log_not_tamper_evident]]) — AI Evidence 정본 아님.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. 실행은 선행 Part1~3-45 인증 + AI 거버넌스 foundation 신설 종속(BLOCKED_PREREQUISITE).
