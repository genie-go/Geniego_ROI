# DSAR — Authorization AI Governance: AI 다이제스트 (APPROVAL_AI_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_DIGEST`(SPEC §24)는 하위 4엔티티를 **합성해 봉인하는 상위 무결성 단위**로 다음을 입력받는다.

| 입력 | SPEC 근거 | 대응 엔티티 |
|---|---|---|
| Recommendation | §24·§5~§16 | Policy/Role/Permission/Scope/Assignment Recommendation |
| Snapshot | §24·§22 | `APPROVAL_AI_SNAPSHOT`(Model/Feature Version·Confidence·Timestamp) |
| Evidence | §24·§23 | `APPROVAL_AI_EVIDENCE`(Feature Set·Dataset·Reason·Evaluation·Approval) |
| Analytics | §24·§25 | `APPROVAL_AI_ANALYTICS`(Acceptance/Accuracy/Drift/FP/FN/Override) |

목적: 추천 1건의 Recommendation+Snapshot+Evidence+Analytics를 하나의 봉인 레코드로 묶어 사후 재현·감사·규제 제출을 단일 단위로 보장. Recommendation Integrity·Evidence Integrity·Tenant Isolation(§33) 제약.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Digest 입력 | 판정 | 근거(파일:라인) |
|---|---|---|
| Recommendation baseline(결정론·proto) | **PARTIAL** | `backend/src/Handlers/AccessReview.php:87-122`·`:158`·`:162-163`(classify·needs_review·심각도 정렬·proto-recommendation·AI 아님) |
| Snapshot substrate | **PARTIAL** | `backend/src/Db.php:448-456`(risk_model_registry 버전 패턴)·`backend/src/Handlers/ModelMonitor.php:35`(ml_models.version) — 별도 `APPROVAL_AI_SNAPSHOT` DSAR |
| Evidence substrate | **PARTIAL** | `backend/src/Handlers/AccessReview.php:225`(SecurityAudit)·`backend/src/Handlers/UserAuth.php:4203`(logAudit) — 별도 `APPROVAL_AI_EVIDENCE` DSAR |
| Analytics substrate | **ABSENT / PARTIAL(마케팅)** | `backend/src/Handlers/ModelMonitor.php:244-291`(drift report·마케팅) — 별도 `APPROVAL_AI_ANALYTICS` DSAR |
| Digest 무결성(합성 해시체인) | **PARTIAL(근접·재활용)** | `backend/src/Handlers/AccessReview.php:225`(SecurityAudit 해시체인 참조패턴) |
| authz 전용 AI Digest | **ABSENT** | GT② §2 "AI Snapshot/Evidence/Digest/Analytics/Drift/Simulation(authz) = ABSENT / PARTIAL". authz 전용 Digest 전무 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **입력**: Recommendation + Snapshot + Evidence + Analytics(§24). 4엔티티 참조를 원자적으로 봉인.
- **불변성/Digest 무결성**: Digest는 하위 Snapshot(불변)·Evidence(불변·§33)를 참조·봉인하므로 자체도 append-only. SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴) 확장으로 4입력의 위변조·누락 탐지(ADR §D-5). Recommendation Integrity·Evidence Integrity(§33) 충족.
- **합성 규율**: Digest는 신규 엔진이 아니라 하위 4엔티티(Recommendation baseline `AccessReview.php:87-122`·Snapshot·Evidence·Analytics)를 **합성**한다. 하위 통제 재구현 금지(ADR §D-6). 테넌트 격리(§33) 절대.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- Digest가 합성하는 Analytics substrate `ModelMonitor.php:244-291`(drift)는 **마케팅 모델** 대상이다(GT② §B-5). authz Digest의 Analytics 입력으로 마케팅 drift를 흡수 금지.
- Recommendation baseline은 `AccessReview.php:87-122`(authz proto)만 사용. 마케팅 추천(`AutoRecommend.php:35-920`·`Decisioning.php:12-477`)은 흡수 금지(GT② §B-1·§B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**APPROVAL_AI_DIGEST = ABSENT-greenfield(authz 전용 합성 봉인 단위 순신규).** Digest는 자립 엔진이 아니라 `APPROVAL_AI_SNAPSHOT`·`APPROVAL_AI_EVIDENCE`·`APPROVAL_AI_ANALYTICS`·Recommendation(baseline `AccessReview.php:87-122`)의 **합성물**이므로 이 4엔티티가 모두 신설된 후에만 성립. 재활용(흡수 아님): SecurityAudit 해시체인(AccessReview.php:225)을 Digest 무결성 봉인으로 확장(ADR §D-5). 마케팅 drift/추천 KEEP_SEPARATE. 선행: Snapshot/Evidence/Analytics + Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE·강한 하위 의존).
