# DSAR — Zero Trust & Continuous Authorization: 행위 분석 (APPROVAL_BEHAVIOR_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_BEHAVIOR_ANALYTICS는 SPEC §16(Behavior Analytics)이 정의하는 **authz 행위 분석 엔진**이다. 6개 행위 패턴을 분석한다: **Login Pattern·API Pattern·Data Access Pattern·Command Pattern·Approval Pattern·Session Pattern**(SPEC §16). 분석 결과는 SPEC §8(UEBA Score) 및 §15(Authorization Confidence의 Behavior 요소)로 진입해 Trust Score(§14)·Continuous Decision(§17)에 기여한다. 즉 "이 사용자의 지금 행위가 평소 baseline에서 벗어났는가"를 인가 신뢰신호로 계산하는 UEBA(authz) 계층이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §16 패턴 | 판정 | 근거(파일:라인) |
|---|---|---|
| Login Pattern | **ABSENT(authz)** | 로그인 이벤트는 `auth_audit_log`(`UserAuth.php:4165`·`:4172`·`:4174`·`:4190-4191`·`:4193`)에 정적 기록·패턴 baseline/이탈 분석이 인가에 피드 안 됨(GT② §2) |
| API Pattern | **ABSENT** | 요청별 게이트(`index.php:69-622`)·rate-limit 정적 카운터(`index.php:527-570`)는 남용 차단이지 행위 baseline 아님(GT① §D·GT② §B-4) |
| Session Pattern | **PARTIAL(raw only)** | recordSessionMeta ip/ua/last_seen(`UserAuth.php:4232-4251`·`:4247`)·동시세션 목록(`UserAuth.php:4253-4298`)=raw 재료만·패턴화 없음(GT① §A) |
| Data Access / Command / Approval Pattern | **ABSENT** | authz 행위 UEBA 전무. `AnomalyDetection.php`는 광고 SPC이지 authz 행위분석 아님(GT② §2·§B-2) |
| UEBA Score(§8 연계) | **ABSENT** | Threat Intelligence의 UEBA Score(SPEC §8) 순신규(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **행위 패턴 6종**(SPEC §16): `login_pattern`·`api_pattern`·`data_access_pattern`·`command_pattern`·`approval_pattern`·`session_pattern`. 각 패턴은 baseline 대비 이탈도를 산출해 §15 Authorization Confidence의 Behavior 입력·§14 Trust Score에 결합.
- **입력원 승격**: `auth_audit_log`(`UserAuth.php:4165`)·recordSessionMeta(`UserAuth.php:4232-4251`)를 행위 baseline 원천으로 승격(기록→분석·Extend·ADR §D-1·§D-5). 정적 `risk` 라벨을 계산된 risk로 승격(ADR §D-5).
- **제약·테넌트 격리**: 행위 baseline은 tenant 스코프(`user_session`/`auth_audit_log` authz 전용·GT② §5). PII 미저장 원칙 준수(집계·패턴만). UEBA Score는 §17 Continuous Decision에 신뢰신호로만 주입(단독 차단 금지·fail-closed는 §10 Verification 담당).

## 4. KEEP_SEPARATE (마케팅 trust/risk/anomaly 흡수금지)

- **★최대 오흡수 위험**: `AnomalyDetection.php`(광고지표 SPC 이상탐지 μ±kσ)는 SPEC §16 Behavior Analytics **아님** — 광고 성과 이상탐지이지 authz 행위 UEBA 아님(GT② §2·§B-2). 개명·재사용 금지.
- **마케팅 behavior/risk 도메인**: `ModelMonitor.php:11-18`(ML 드리프트)·`Risk.php:31-55`(공급망 fraud)·`CustomerAI.php:10-18`(RFM/churn/LTV risk 0~100)·`GraphScore.php:12-18`(influencer→sku→order 그래프)는 커머스/마케팅 ML이지 ZT Behavior/Threat 아님(GT② §B-2).
- **device-sig**: `Attribution.php:144-150`(attribution_device_sig ip+ua 해시)=광고 cross-device 식별·행위분석 아님(GT② §B-3). 데이터소스 `performance_metrics`/`attribution_*`/`crm_*` ≠ authz `user_session`/`auth_audit_log`(GT② §5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Behavior Analytics = **ABSENT**(6패턴 전부 인가 미피드). Session Pattern만 raw 재료(recordSessionMeta) PARTIAL. UEBA(authz) 순신규(GT① §3·GT② §2).
- **재활용**: `auth_audit_log`(로그인 이벤트)·recordSessionMeta(세션 raw)를 baseline 입력으로 승격(Extend·기록→분석). SecurityAudit(`SecurityAudit.php:12-68`) 증거화.
- **선행의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). Trust Score(§14)·Confidence(§15)의 Behavior 입력으로 소비. 코드 변경 0 · NOT_CERTIFIED · 마케팅 anomaly 흡수 금지·무후퇴.
