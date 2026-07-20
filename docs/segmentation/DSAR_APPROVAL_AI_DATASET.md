# DSAR — Authorization AI Governance: ML 데이터셋 (APPROVAL_AI_DATASET)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_DATASET`은 Authorization AI 모델 학습·평가에 쓰이는 **불변 학습 데이터셋**이다. SPEC §1(구현 목표 4 "ML Dataset Manager")·§2(Canonical Entity `APPROVAL_AI_DATASET`)·§3(AI Data Sources 학습 대상)·§4(Feature Store)에 정의된다. 학습 대상(SPEC §3): Authorization Events·Policy Decisions·Runtime Context·Session History·Assignment History·Role History·Permission Usage·SoD Violations·JIT Requests·Audit Events·Threat Intelligence·Compliance Reports. Immutable Training Dataset(§33)·AI Evidence의 Training Dataset 봉인(§23)·`AI_DATASET_INVALID`(§30)·Warning "Dataset Aging"(§31) 계약을 가진다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 층위 | 판정 | 근거(file:line) |
|---|---|---|
| authz 전용 ML Dataset / dataset 버전 | **ABSENT** | GT② 표: "전용 feature store/feature view/dataset 버전 없음" |
| 데이터 소스 카탈로그(재사용·마케팅) | **PRESENT·ML dataset 아님** | `DataPlatform.php:23-70`(data_source 카탈로그)·`:231-346`(quality/lineage) — ML feature store/dataset 아님(GT① §C) |
| authz Data Source 원천(§3 학습 대상) | **PARTIAL·미배선** | Authorization Events/Audit Events=`auth_audit_log`(`UserAuth.php:4165`·`:4190-4191`·logAudit `:4203`)·Role/Permission Usage=`acl_permission`(`TeamPermissions.php:152-159`)·Assignment/Review=access_review_item(`AccessReview.php:87-122`) |
| Immutable Training Dataset(불변강제) | **ABSENT** | GT②: 불변강제(해시체인/WORM) 없음. SecurityAudit(`AccessReview.php:225`) 참조패턴만 존재 |

★§3 학습 대상 원시 데이터(auth_audit_log·acl_permission·access_review_item)는 존재하나 **버전화·불변 봉인된 ML dataset은 전무**하다. `DataPlatform.php`는 카탈로그이지 ML dataset manager가 아니다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(설계)**: dataset_id·source(§3 12종 authz data source)·snapshot_range·feature_ref(APPROVAL_AI_FEATURE_STORE)·dataset_version·quality/validation 결과·hash·Tenant(§33 Tenant Isolation).
- **불변 제약(핵심)**: Immutable Training Dataset(§33) — 생성 후 변경 불가. Data Validation(§21 2단계)·AI Drift Detection "Dataset Drift"(§26)·Runtime Guard "Dataset Poisoning" 차단(§28)·Warning "Dataset Aging"(§31).
- **상태**: Continuous Learning(§21) Data Collection→Data Validation→Feature Extraction 파이프라인 입력. AI Evidence(§23)에 Training Dataset 봉인.
- **재배선/신설**: `DataPlatform.php:231-346` quality/lineage를 authz dataset quality 참고로 재배선(ADR D-1)·불변 봉인은 SecurityAudit 해시체인(`AccessReview.php:225`) 확장(ADR D-5). ML dataset 버전 관리는 순신규.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

`DataPlatform.php:23-70`·`:231-346` 데이터 소스는 마케팅 소비(GT① §C)이며, 마케팅 AI 8종(GT② §4)의 학습원 `performance_metrics`/`crm_*`/`channel_orders`는 authz Dataset이 아니다. `ModelMonitor.php:293-313` seedDemoModels(마케팅 이탈/전환/ROAS)·마케팅 LLM 프롬프트 데이터 흡수·개명 금지(ADR D-7). authz data source(§3)만 대상.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT / PARTIAL(원천 데이터 존재·dataset 계층 부재)**. authz ML Dataset·불변 봉인 순신규(GT② 표).
- **재활용(재배선·참고)**: `DataPlatform.php:231-346` 품질/lineage를 authz dataset quality 참고로 재배선(ADR D-1)·불변강제는 SecurityAudit(`AccessReview.php:225`) 확장(ADR D-5). authz 원천(auth_audit_log/acl_permission/access_review_item)을 dataset source로 재배선. 흡수 아님.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). Observability(3-14) 이벤트가 주 학습원(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0.
