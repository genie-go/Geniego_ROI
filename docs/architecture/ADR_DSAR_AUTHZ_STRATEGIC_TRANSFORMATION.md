# ADR — Enterprise Authorization Strategic Transformation Framework (Part 3-39)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_39_STRATEGIC_TRANSFORMATION_FRAMEWORK_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EASTF_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EASTF_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-39는 전략수립·조직변화·기술전환·운영혁신을 Transformation Lifecycle로 통합한다. ★특이점: PPM(`PM/Enterprise.php`) substrate 실재 + Part 3-27/3-32/3-34 중복 + 조직 요소. 본 ADR이 그 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (형식 Transformation Governance 순신설)**: Transformation Lifecycle·Business Capability Mapping·Value Stream·Benefits Realization·Transformation KPI·AI Transformation Advisor는 신설(grep 0).
- **D-2 (PPM/상위 Part 재사용·재정의 금지)**:
  - Portfolio/Risk & Dependency → `PM/Enterprise.php`(pm_portfolio·pm_raid RAID·baseline) 패턴 참조(★테넌트 PM≠플랫폼 프로그램).
  - Strategic Roadmap/Capability → Part 3-27 LTER 참조. Portfolio/Initiative → Part 3-32 EACIF. Executive Dashboard → Part 3-34 EAEGD.
  - AI Advisor → `ClaudeAI`/`AutoRecommend` 패턴(★마케팅≠거버넌스). Approval → pending_approval. Evidence → `SecurityAudit::verify`. Isolation → `Db.php`.
- **D-3 (조직 요소=비-코드)**: Executive Steering Committee·Organizational Readiness는 조직/인력 신설(코드 아님).
- **D-4 (Immutable Transformation·서버 집계 KPI)**: 로드맵/포트폴리오/KPI 이력=append-only `SecurityAudit::verify`·KPI=서버 집계 SSOT([[reference_real_value_autoderive]]).
- **D-5 (Runtime Guard=Roadmap/Portfolio 변조 차단)**: 무단 로드맵/포트폴리오 변경 차단=admin 게이트·SecurityAudit·`index.php` RBAC 위 배치(신규 게이트 신설 금지).

## KEEP_SEPARATE (오흡수 금지)
- PM 프로젝트 포트폴리오(`PM/Enterprise.php`·테넌트 PM) ≠ 플랫폼 Transformation Program(패턴만 참조).
- 비즈니스 ROI(`Pnl`)/마케팅 예측(`Mmm`) ≠ Benefits Realization/Investment(플랫폼) · ClaudeAI/AutoRecommend(마케팅) ≠ AI Transformation Advisor(거버넌스).

## 결과 (Consequences)
- 판정 = PARTIAL(PM/Enterprise PPM·Part 3-27/3-32/3-34 참조·ClaudeAI·SecurityAudit substrate) / ABSENT-formal(Transformation Lifecycle·Value Stream·Benefits Realization·Transformation KPI 순신설) + 조직 요소.
- 실행 순서: 선행 Part 인증 + 조직 신설 → Transformation Registry 신설 → PM/상위 Part 패턴 참조 배선 → Value Stream/Benefits/KPI/AI Advisor. 코드 0.
