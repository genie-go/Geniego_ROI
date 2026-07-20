# ADR — Enterprise Authorization Governance Maturity Model (Part 3-28)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_28_GOVERNANCE_MATURITY_MODEL_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAGMM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAGMM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-28은 거버넌스 성숙도(Level 0~5)를 정량 측정·개선하는 EAGMM을 규정한다. 본 ADR은 설계 결정과 현행 substrate 대비 판정을 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (형식 Maturity Model 순신설)**: Level 0~5·Domain/Control 스코어·Benchmark·Executive Scorecard·Certification Readiness Engine은 신설(grep 0).
- **D-2 (PARTIAL substrate 재사용·발명 금지)**:
  - Control/Certification Assessment → `Compliance.php`(control inventory·SOC2 readiness 대시보드)를 assessment 소스로 승격.
  - Scoring Engine → `DataPlatform.php` DataTrust(trust/quality score 계산 패턴) 참조(단 governance 도메인용 별도 가중치·데이터 스코어 재사용 아님).
  - Evidence Integrity → `SecurityAudit::verify` 해시체인 재사용(신규 체인 금지·[[reference_menu_audit_log_not_tamper_evident]] 정합).
  - Tenant Isolation → `Db.php` 격리 술어 재사용.
- **D-3 (Assessment History Immutable)**: 성숙도 평가/스코어 이력은 append-only + 버전 무결성. SecurityAudit 패턴 확장.
- **D-4 (Runtime Guard 통합)**: Score 변조·False Certification 차단은 기존 `index.php` RBAC(admin gate)·writeGuard 위에 배치(중복 게이트 신설 금지).
- **D-5 (무후퇴)**: 기존 Compliance readiness UI/데이터는 EAGMM Certification Readiness Engine 신설 시 흡수·보존(중복 대시보드 신설 금지).

## KEEP_SEPARATE (오흡수 금지)
- DataTrust score(`DataPlatform`)·GraphScore·AbTesting 통계 ≠ Governance Maturity Score(도메인·목적 상이).
- ModelMonitor drift ≠ Maturity Drift. 경쟁 스코어 이력(`docs/COMPETITIVE_SCORE_HISTORY.md`) ≠ Assessment History.
- PriceOpt kc_cert·채널 인증 ≠ Certification Readiness(ISO/SOC/NIST). PM baseline/risk(`PM/Enterprise.php`) ≠ Maturity Assessment.

## 결과 (Consequences)
- 판정 = PARTIAL(Compliance readiness·DataTrust scoring·SecurityAudit evidence 실재) / ABSENT-formal(성숙도 레벨·Benchmark·Executive Scorecard·Improvement Roadmap 순신설).
- 실행 순서: 선행 Part 인증 → Maturity Registry+Model 신설 → Compliance/DataTrust/SecurityAudit 승격 배선 → Scoring/Benchmark/Scorecard → Drift/Reconciliation. 코드 0(설계 명세).
