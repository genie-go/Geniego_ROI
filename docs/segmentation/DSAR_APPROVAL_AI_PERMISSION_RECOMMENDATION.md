# DSAR — Authorization AI Governance: 권한 추천 (APPROVAL_AI_PERMISSION_RECOMMENDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_PERMISSION_RECOMMENDATION`(SPEC §2)은 Permission Optimization Engine(SPEC §7)이 생성하는 **권한** 최적화 추천이다. 분석 대상: **Unused Permissions·Excessive Permissions·High Risk Permissions·Duplicate Permissions·Permission Bundles·Permission Refactoring**(SPEC §7). Production Permission 변경은 Human Approval 필수(§19), Permission 삭제는 Autonomous 자동수행 불가(§20).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 분석 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unused Permissions | **PARTIAL(proto)** | `AccessReview.php:87-122` classify(STALE_UNUSED·결정론적 임계·AI 아님)(GT① §2.A) |
| Duplicate/Excessive Permissions | **ABSENT** | 중복 permission AI 추천 없음(GT② §2). authz 정적 RBAC/ABAC(`TeamPermissions.php:152-159`)(GT① §2.A) |
| High Risk Permissions | **ABSENT(예측)** | `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·`:4174`·`:4190-4191`·예측 없음(GT① §2.E) |
| Permission Bundles/Refactoring | **ABSENT** | AI 번들/리팩터 추천 전무(GT② §2) |
| XAI/Confidence(권한) | **ABSENT** | 인가 추천 confidence/근거/training feature 없음(GT② §2) |
| Human Approval 게이트 | **PARTIAL(substrate·AI 미배선)** | `Mapping.php:238-294`·`:268-271`(2인·self 차단)·`Alerting.php:601-608`·`:642-650`(quorum≥2)(GT① §2.B) |

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | recommendation_type(unused/excessive/high_risk/duplicate/bundle/refactor)·target_permission(acl_permission)·confidence_score(0~100)·evidence_ref·expected_benefit·expected_risk·tenant_id |
| baseline | `AccessReview.php:87-122` classify(STALE_UNUSED)를 Permission Recommendation baseline으로 승격·AI 확장(ADR D-2) |
| High Risk | 현행 `UserAuth.php:4165` 정적 risk 라벨(예측 아님)→AI 예측 신설(§12·ADR 정직분리 D-8) |
| XAI 필수 | Recommendation·Confidence·Evidence·Feature·Benefit·Risk(§17). 근거없는 결론 금지(ADR D-4) |
| Human Approval | Production Permission·Permission 삭제 자동수행 불가(§19·§20). maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`) 게이트 배선(ADR D-3) |
| 테넌트 격리 | Tenant Isolation(§33). authz `acl_permission`/`auth_audit_log` 소스 |

## 4. KEEP_SEPARATE (마케팅 AI recommendation 흡수금지)

authz **권한** 추천은 마케팅 fraud/이상탐지 설명과 분리된다(ADR D-7).

| 마케팅 AI | 근거 | 오흡수 위험 |
|---|---|---|
| `Risk.php:61-66` top_drivers(fraud 피처기여) | GT② §B-3 | ★fraud 피처기여≠권한판정 설명(오흡수 함정·ADR D-7) |
| `Decisioning.php:433-477` "explainability" | GT② §B-3 | ★광고추천 설명≠authz XAI |
| `AnomalyDetection.php:1-45`(광고 SPC μ±kσ) | GT② §B-3 | 광고 이상탐지≠High Risk Permission |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(Duplicate/Excessive/High-Risk/Bundle AI 추천·XAI·Confidence·권한 risk 예측 순신규) / PARTIAL-substrate(`AccessReview.php:87-122` classify=Unused Permission proto baseline·ADR D-2 / maker-checker=Human Approval 게이트·ADR D-3).** 현행 High Risk는 `UserAuth.php:4165` 정적 라벨이라 예측 ABSENT(ADR D-8 정직분리). 마케팅 AI(`Risk.php:61-66` top_drivers·`Decisioning.php:433-477` explainability·AnomalyDetection)는 흡수 금지. 선행: Part 1~3-14 인증(BLOCKED_PREREQUISITE). 코드 0 · NOT_CERTIFIED.
