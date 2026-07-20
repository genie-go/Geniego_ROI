# DSAR — Zero Trust & Continuous Authorization: 신뢰 드리프트 (APPROVAL_TRUST_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_TRUST_DRIFT는 최초 승인 이후 신뢰 관련 컨텍스트가 시간에 따라 **점진적으로 저하·변화**하는 것을 탐지하는 엔티티다. SPEC §24(Drift Detection)는 다음 5축을 탐지 대상으로 정의한다.

| 축 | 의미 (SPEC §24) |
|---|---|
| Trust Drift | 세션 지속 중 종합 Trust Score(SPEC §14·0~100)의 하향 이동 |
| Device Drift | Device Trust 요소(patch/EDR/health·SPEC §4)의 신뢰 저하 |
| Threat Drift | Threat Intelligence(IOC/feed·SPEC §8) 노출 증가 |
| Policy Drift | 적용 정책 변화(SPEC §19 Policy Reevaluation)와의 괴리 |
| Session Drift | Session 신선도(age/idle/token·SPEC §6) 이탈 |

Drift 신호는 SPEC §31(Warning Contract)의 `Trust Declining`·`Device Becoming Untrusted`·`Session Aging`·`Threat Increasing` 경고로 표출되며, 임계 초과 시 SPEC §11 Adaptive Authorization(Challenge/Re-auth)을 구동한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | Ground-Truth 근거 |
|---|---|---|
| Trust Drift 탐지(authz Trust Score 변화) | **ABSENT** | Trust Score 자체가 grep 0(GT② §2·`Trust Score/Confidence ABSENT`). 드리프트 산출 기준값 부재 |
| Session Drift(신선도 이탈) | **PARTIAL** | 유휴 자동로그아웃(`UserAuth.php:288-311`·`:302-305`·`:308-310`)·TTL(`UserAuth.php:986`)은 단일 임계 무효화이지 추세 드리프트 탐지 아님 |
| Device Drift 입력 | **PARTIAL(원자료만)** | `recordSessionMeta` ip/ua 기록(`UserAuth.php:4232-4251`·`:4247`)=시점 스냅샷 1개·시계열 대조 없음 |
| Threat Drift | **ABSENT** | Threat Intel/IOC grep 0(GT② §2). SSRF·rate-limit은 방어 프리미티브(GT② §4 B-4) |
| Policy Drift | **ABSENT** | 정적 team_role 게이트(`UserAuth.php:1134-1167`)만·정책 변화 재평가 트리거 부재(GT② §2) |
| 증거 축적 | **재활용 대상** | SecurityAudit 해시체인(`SecurityAudit.php:12-68`)이 드리프트 이력 무결 저장에 재활용(ADR D-5) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **키/격리**: `tenant_id`(SPEC §33 Tenant Isolation 필수)·`session_id`(→`user_session` 참조)·`drift_axis`(trust/device/threat/policy/session)·`baseline_snapshot_id`(→APPROVAL_TRUST_SNAPSHOT·SPEC §20).
- **측정 필드**: `baseline_score`·`current_score`·`delta`·`window`(관측 구간)·`direction`(declining/stable). Trust Score 0~100 범위는 SPEC §14 준수.
- **상태**: `NONE` → `WARNING`(SPEC §31 경고 임계) → `BREACH`(SPEC §11 Adaptive 구동). 상태 전이는 append-only 증거로만 기록(SecurityAudit 확장·ADR D-5·`SecurityAudit.php:12-68`).
- **불변성**: 드리프트 관측 스냅샷은 Immutable(SPEC §33 Immutable Trust Snapshot)·사후 변경 금지. `risk` 라벨은 정적(`UserAuth.php:4165`)에서 **계산된 값으로 승격**(ADR D-5)해 드리프트 입력에 결합.

## 4. KEEP_SEPARATE (마케팅 drift 흡수금지)

★authz Trust Drift는 아래 마케팅/ML 드리프트와 **데이터소스·목적 완전 분리**(GT② §4). 동일 명명(`drift`)이라도 흡수·개명 금지.

| 흡수 위험 대상 | 근거 | 분리 사유 |
|---|---|---|
| ML 모델 드리프트/재학습 | `ModelMonitor.php:11-18`(GT② §4 B-2) | 광고·추천 ML 성능 드리프트이지 세션 신뢰 저하 아님 |
| 광고지표 SPC 이상탐지 | `AnomalyDetection.php`(GT② §4 B-2) | 광고 KPI μ±kσ 이탈이지 authz Trust Score 이동 아님 |
| 마케팅 신뢰도 지표 | `Mmm.php:749`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`(GT② §4 B-1) | MMM/어트리뷰션 confidence이지 인가 신뢰 아님 |

데이터소스 분리: authz drift 입력=`user_session`/`auth_audit_log`, 마케팅=`performance_metrics`/`attribution_*`(GT② §5).

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: authz Trust Drift 탐지 엔진은 grep 0(GT②)·순신규.
- **선행 의존(BLOCKED_PREREQUISITE)**: Trust Score(§14)·Trust Snapshot(§20) baseline 미구축 → 드리프트 delta 산출 불가. Part 1~3-12 인증 후 실 구현(ADR §4).
- **재활용(Extend)**: 세션 신선도(§A)·recordSessionMeta 원자료·SecurityAudit 증거체인·정적 risk 라벨 승격을 입력으로 확장하되 대체 아님(ADR D-1·D-5·무후퇴).
