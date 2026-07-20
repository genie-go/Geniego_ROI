# DSAR — Authorization AI Governance: AI 피처 스토어 (APPROVAL_AI_FEATURE_STORE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_FEATURE_STORE`는 Authorization AI 모델이 소비하는 **authz 피처의 표준 저장·서빙 계층**이다. SPEC §1(구현 목표 3 "AI Feature Store")·§2(Canonical Entity)·§4(Feature Store 관리 항목)에 정의된다. 관리 대상 피처(SPEC §4): Identity·Role·Permission·Resource·Session·Device·Risk·Context·Behavioral·Temporal Features. Feature Extraction ≤ 100ms(§35)·Feature 인덱스(§34)·`AI_FEATURE_MISSING`(§30)·Warning "Feature Drift Detected"(§31) 계약을 가진다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 층위 | 판정 | 근거(file:line) |
|---|---|---|
| authz 전용 Feature Store / feature view | **ABSENT** | GT② 표: "전용 feature store/feature view/dataset 버전 없음" |
| 데이터 품질/신뢰 게이트(재사용·ML feature store 아님) | **PRESENT·마케팅 소비** | `DataPlatform.php:23-70`(data_source·tenant_business_profile)·`:231-346`(`dataQuality`·`dataLineage`) — **ML feature store 아님**·소비=마케팅(GT① §C·GT② §2) |
| authz 피처 원천 데이터(재배선 대상) | **PARTIAL·미배선** | acl_permission(`TeamPermissions.php:152-159`)·auth_audit_log(`UserAuth.php:4165`·`:4190-4191`)·access_review_item(`AccessReview.php:87-122`) — 원시 authz 데이터이나 피처 서빙 계층 없음 |

★`DataPlatform.php:231-346`는 데이터 카탈로그+품질/신뢰 게이트이지 **ML feature store가 아니며**(GT① §C 명시), 소비 도메인은 마케팅이다. authz Feature Store는 그린필드.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **피처 클래스(SPEC §4)**: Identity·Role·Permission·Resource·Session·Device·Risk·Context·Behavioral·Temporal — 10종을 표준 스키마로 등록·버전 관리.
- **필드(설계)**: feature_id·feature_name·class·source_ref(acl_permission/auth_audit_log/access_review_item)·feature_version·quality/trust score·Tenant(§33 Tenant Isolation).
- **제약**: Feature Extraction ≤ 100ms(§35)·Feature 인덱스(§34)·Runtime Guard "Feature Tampering" 차단(§28)·Static Lint "Missing Evidence"(§29)·`AI_FEATURE_MISSING`(§30). AI Drift Detection(§26 Feature Drift) 대상.
- **재배선/신설**: `DataPlatform.php:231-346` quality/trust 게이트를 authz feature/dataset quality 참고로 **재배선**(ADR D-1)하되 ML feature 서빙 계층은 순신규.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

`DataPlatform.php:23-70`·`:231-346`의 소비 도메인은 마케팅(tenant_business_profile·마케팅 dataQuality)이며(GT① §C), 마케팅 AI 8종(GT② §4 `AutoRecommend`/`Mmm`/`CustomerAI`/`Decisioning`/`AnomalyDetection`/`Risk`/`DemandForecast`/`GraphScore`)이 사용하는 `performance_metrics`/`crm_*` 피처는 authz Feature Store에 흡수·개명 금지. authz 피처원 `acl_permission`/`auth_audit_log`와 분리(ADR D-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT / PARTIAL(패턴)**. authz Feature Store 순신규(GT② 표: DataPlatform은 ML feature store 아님).
- **재활용(재배선·참고)**: `DataPlatform.php:231-346` 품질/신뢰 게이트를 authz feature/dataset quality 참고로 재배선(ADR D-1). ML feature 서빙·10종 피처 클래스 스키마는 신설. 흡수 아님.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). Observability(3-14) 이벤트가 Behavioral/Temporal 피처 원천(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0.
