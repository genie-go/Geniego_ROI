# DSAR — Zero Trust & Continuous Authorization: 신뢰 애널리틱스 (APPROVAL_TRUST_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_TRUST_ANALYTICS`는 지속 인가 신뢰 상태의 집계 지표(aggregate metrics)를 산출하는 읽기 전용 파생물이다. SPEC §23(Analytics)은 지표로 **Average Trust Score · High Risk Sessions · Step-up MFA Count · Session Revocations · Threat Blocks · Trust Trend** 6종을 규정한다. Analytics는 Snapshot(§20)/Evidence(§21)/Digest(§22)의 상류 인가 데이터소스만을 집계하며, **마케팅 analytics와 데이터소스·목적이 완전 분리(KEEP_SEPARATE)** 되어야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §23 지표 | 판정 | 근거(GT 인용) |
|---|---|---|
| Average Trust Score | **ABSENT** | authz Trust Score 산출 자체가 없음(GT② §2)·평균 집계 불가 |
| High Risk Sessions | **ABSENT/PARTIAL** | `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·계산된 세션 risk 없음(GT② §2 Adaptive ABSENT) |
| Step-up MFA Count | **PARTIAL(원자재)** | 로그인 MFA/OTP 경로(`UserAuth.php:929-980`) 존재하나 mid-session step-up 부재·집계 지표 없음 |
| Session Revocations | **PARTIAL(원자재)** | `revokeOtherSessions`(`UserAuth.php:4253-4298`) 수동 폐기 존재하나 집계·트렌드 없음 |
| Threat Blocks | **ABSENT** | Threat Intelligence/차단 자체 부재(GT② §2·§4 B-4·SSRF/rate-limit는 threat intel 아님) |
| Trust Trend | **ABSENT** | 시계열 Trust Score 부재로 트렌드 산출 불가 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드 계약**(§23): `period`, `tenant_id`, `avg_trust_score`, `high_risk_session_count`, `stepup_count`, `session_revocation_count`, `threat_block_count`, `trust_trend`, `computed_at`, `trust_version`.
- **읽기 전용 파생**: Analytics는 상류 Snapshot/Evidence/Digest 집계이며 인가 결정에 직접 진입하지 않는다(관측 계층). 결정은 Adaptive Authorization(§11)이 담당.
- **Tenant Isolation**(§33): `tenant_id` 필수 그룹핑. 집계 소스는 authz `user_session`/`auth_audit_log` 파생만.
- **원자재 승격**(ADR): Step-up Count는 로그인 MFA(`:929-980`)를 mid-session step-up(D-2)으로 확장한 후 집계 가능. Session Revocations는 `revokeOtherSessions`(`:4253-4298`) 이벤트 집계. High Risk Sessions는 정적 risk 라벨(`:4165`)을 계산된 risk(D-5)로 승격한 후 산출.
- **선행 의존**: Average Trust Score·Trust Trend·Threat Blocks는 Trust Score(D-4)·Threat Intel(D-7) 신설 후에만 산출 — 그린필드.

## 4. KEEP_SEPARATE (마케팅 trust/analytics 흡수금지)

★**본 엔티티의 최대 오흡수 위험**. 저장소의 analytics/trust 지표는 거의 전부 마케팅·커머스 도메인이다(GT② §4).

- 마케팅 신뢰 analytics — `Mmm.php:749`·`:939`(MMM 신뢰도)·`AttributionEngine.php:246-261`(`blended_trust`/`mkTrust`/`mmmTrust`)·`DataPlatform.php:281`(데이터 신뢰 대시보드)·`Attribution.php:145-242`(cross-device confidence)는 **authz Average Trust Score 아님**. Analytics 지표에 흡수·집계 금지(GT② §4 B-1).
- 마케팅 risk/anomaly — `AnomalyDetection.php`(광고 SPC)·`ModelMonitor.php:11-18`(ML 드리프트)·`Risk.php:31-55`(공급망 fraud)·`CustomerAI.php:10-18`(churn risk)·`GraphScore.php:12-18`는 High Risk Sessions/Threat Blocks 지표로 오인 금지(GT② §4 B-2).
- 데이터소스 분리 — authz `user_session`/`auth_audit_log` ≠ 마케팅 `performance_metrics`/`attribution_*`/`crm_*`(GT② §5). 두 analytics를 하나의 지표판에 병합 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Avg Trust Score·High Risk Sessions·Threat Blocks·Trust Trend = **ABSENT(순신규)**. Step-up Count·Session Revocations는 원자재 PARTIAL(이벤트 존재·집계 부재). 마케팅 analytics는 **KEEP_SEPARATE(흡수 절대 금지)**.
- **재활용 vs 신설**: `revokeOtherSessions`(`:4253-4298`)·로그인 MFA(`:929-980`)·정적 risk(`:4165`) 이벤트 원자재 재활용. Trust Score 집계·Threat Blocks·Trust Trend·전용 analytics 저장 신설.
- **선행의존**: BLOCKED_PREREQUISITE — Trust Score(D-4)·mid-session Step-up(D-2)·계산 risk(D-5)·Threat Intel(D-7) 신설이 대부분 지표의 선행. 코드 변경 0.

### 본 문서 file:line 인용 목록
`UserAuth.php:4165` · `UserAuth.php:929-980` · `UserAuth.php:4253-4298` · `Mmm.php:749` · `Mmm.php:939` · `AttributionEngine.php:246-261` · `DataPlatform.php:281` · `Attribution.php:145-242` · `AnomalyDetection.php` · `ModelMonitor.php:11-18` · `Risk.php:31-55` · `CustomerAI.php:10-18` · `GraphScore.php:12-18`
