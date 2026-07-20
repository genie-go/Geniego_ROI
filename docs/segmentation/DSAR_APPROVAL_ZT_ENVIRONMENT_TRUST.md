# DSAR — Zero Trust & Continuous Authorization: 환경 신뢰 (APPROVAL_ENVIRONMENT_TRUST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ENVIRONMENT_TRUST`는 SPEC §7(Environment Trust)가 정의하는 **실행 환경 신뢰 평가 엔티티**다. 접근 대상 환경의 민감도를 등급화해 Trust Score(§14)·Adaptive Authorization(§11)에 결합한다.

평가 요소(SPEC §7): Production · QA · Staging · Development · Disaster Recovery. Production/DR 등 고민감 환경 접근에 더 높은 신뢰·step-up(§12)을 요구한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §7 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| env/envLabel(production/demo 판별) | **PRESENT(비authz)** | `env`/`envLabel`(`Db.php:41-60`·`:56-60`) — 존재하나 authz 게이트 아님(GT①) |
| env의 실제 용도(비인가) | **비authz(용도 확정)** | OTP dev_code 게이트(`UserAuth.php:966`·`:2647`·`:4000`)·데모시드(`Db.php:999`·`:1214`) — **authz 아님**(GT①) |
| ★게이트 금지 규율 | **ABSENT(authz)·명시 금지** | `Db.php:53` 주석 "게이트에 envLabel 금지" — env는 OTP 노출/데모시드용이지 인가 결정 진입 금지(GT①/②) |
| Prod/QA/Staging/Dev/DR 신뢰등급 산출 | **ABSENT** | 환경 민감도 기반 authz 신뢰등급·step-up 트리거 전무(SPEC §7 순신규) |

**요약**: `envLabel`은 존재하나 **비authz(OTP 노출·데모시드 전용)**이며 `Db.php:53`이 인가 게이트 사용을 명시적으로 금지한다. Environment Trust 신뢰등급은 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **★핵심 제약(ADR/GT 정직 분리)**: 기존 `envLabel`(`Db.php:41-60`)을 authz 게이트로 **재사용 금지**(`Db.php:53` 규율 준수). Environment Trust는 authz 전용 신뢰등급 필드를 **별도 신설**하며 `envLabel`의 production/demo 판별을 인가 결정에 직접 결선하지 않는다.
- **필드**: `env_class`(production/qa/staging/development/dr)·`env_sensitivity`·`env_step_up_required`(SPEC §7). 전부 순신규.
- **상태 출력**: 환경 등급을 Trust Score(§14)에 기여. 고민감 환경(Production/DR)은 Step-up(§12)·Adaptive(§11) 강화.
- **제약(SPEC §33)**: Immutable Trust Snapshot·Trust Version·**Tenant Isolation**·Digest Validation.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- `envLabel`의 데모시드(`Db.php:999`·`:1214`)·OTP dev_code 노출(`UserAuth.php:966`·`:2647`·`:4000`)은 **운영 편의·개발 지원**이지 authz 환경 신뢰 아님. 흡수·전용(轉用) 금지(GT①).
- 마케팅 trust/anomaly/risk(Mmm/AttributionEngine/AnomalyDetection/ModelMonitor/Risk.php/CustomerAI, GT② §4)는 환경 신뢰와 무관·흡수 금지.
- authz 신뢰축 데이터소스 ≠ `performance_metrics`/`attribution_*`/`crm_*`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Environment Trust = **PRESENT-substrate(envLabel·비authz) / authz 신뢰등급 ABSENT(순신규)**. ★`envLabel`은 재활용 대상이 아니며(`Db.php:53` 게이트 금지 규율), authz 환경 신뢰는 별도 신설.
- **정직 분리(ADR D-8)**: `envLabel` 존재≠환경 인가. 명시적 게이트 금지 규율을 무후퇴로 보존.
- **선행 의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)가 environment trust 소비지점(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0. 무후퇴·Extend-only.
