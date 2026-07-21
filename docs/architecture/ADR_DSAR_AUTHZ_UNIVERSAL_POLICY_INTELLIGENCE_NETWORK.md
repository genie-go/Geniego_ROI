# ADR — DSAR Authorization Universal Policy Intelligence Network (Part 3-54 · EAUPIN)

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②(EAUPIN EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
Part 3-54는 정책을 지능형 네트워크로 통합. ★코드베이스는 **런타임 authz 정책 집행이 실재**한다 — `index.php` RBAC(role/scope)+writeGuard(289차 서버전역)·`Alerting` alert_policy·`UserAuth` tenant_security_policy·`AgencyPortal` scope. 이는 Part 3-53(개발 거버넌스 헌법)과 달리 **매 요청에 정책을 집행**하는 실 정책엔진이다. 단 지능형 네트워크(Federation/Knowledge Graph/Simulation/Conflict Analyzer/Multi-Cloud sync)와 OPA/XACML 형식 엔진은 grep 0.

## 결정
- **D-1 (Policy Registry/Enforcement = index.php RBAC/writeGuard 재사용):** Policy Rule/Runtime Guard = `index.php`(RBAC viewer<connector<analyst<admin·scope write:*·writeGuard 289차 서버전역)+`Alerting`/`UserAuth`/`AgencyPortal` 정책. 형식 통합 Registry는 산재 정책을 인덱싱(중복 정책엔진 신설 금지·[[project_n289_post_writeguard_server_enforcement]]).
- **D-2 (마케팅 RuleEngine KEEP_SEPARATE):** `RuleEngine.php`(마케팅 세그먼트 6-operator DSL·Part 3-2/3-5)는 **마케팅 오디언스 규칙**이지 authz 정책 아님. Policy Network가 오흡수·재정의 금지(도메인 분리).
- **D-3 (Lifecycle/Version = CHANGE_GATE + git 승격):** Policy Lifecycle(Draft→Review→Approval→Enforcement)=`CHANGE_GATE`+git. Version Intelligence(Change History/Semantic Diff)=git diff. 형식 Version Graph/Dependency Tracking 신설.
- **D-4 (KG/Simulation/Federation/Multi-Cloud = ABSENT-formal·조기구현 금지):** Policy Knowledge Graph(Part 3-49)·What-if Simulation·Conflict Analyzer·Federated/Multi-Cloud/Multi-Region/Edge sync·OPA/XACML 엔진은 부재. 단일 호스트라 Multi-Cloud/Region aspirational(Part 3-47/3-52). 조기구현 금지(블라인드 스켈레톤 방지).
- **D-5 (AI Advisor 분리 · Evidence/Isolation 재사용):** AI Policy Advisor는 마케팅 AI(ClaudeAI·Part 3-46) KEEP_SEPARATE. Immutable Policy History=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]]). Cross-Tenant Policy Leakage·Isolation=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]). Duplicate Rule 탐지=중복금지 게이트([[feedback_no_duplicate_features]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. 런타임 RBAC/writeGuard·CHANGE_GATE·SecurityAudit 정합·중복 정책엔진 신설 금지·마케팅 RuleEngine 분리·Federation/KG/시뮬 조기구현 금지. 실행은 선행 Part1~3-53 인증 종속(BLOCKED_PREREQUISITE·네트워크 fabric aspirational).
