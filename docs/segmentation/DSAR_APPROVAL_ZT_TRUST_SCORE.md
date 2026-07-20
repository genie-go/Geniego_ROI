# DSAR — Zero Trust & Continuous Authorization: 신뢰 점수 (APPROVAL_TRUST_SCORE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_TRUST_SCORE`(SPEC §2·§14)는 Identity/Device/Session/Network/Threat/Behavior/Authentication 신호를 종합한 **0~100 신뢰 점수**다. SPEC §14 밴딩:

- **90~100 : Trusted**
- **70~89 : Low Risk**
- **50~69 : Conditional**
- **30~49 : Restricted**
- **0~29 : Deny**

Trust Score는 SPEC §11 Adaptive Authorization의 구동 임계이며(ADR D-4), SPEC §34 Index에 조회 인덱스(Trust Score 축)를 둔다. SPEC §0 원칙상 요청 시점마다 재계산되는 Continuous 값이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 축 | 판정 | 근거(GT) |
|---|---|---|
| Trust Score(0~100 종합 authz) | **ABSENT(grep 0)** | GT② §2 "identity/device/session/network 종합 authz confidence 산출 없음. `trust`/`confidence` 히트는 전부 마케팅" |
| Session 축 | **PARTIAL** | 세션 TTL/idle(`UserAuth.php:249-311`)·recordSessionMeta ip/ua(`:4232-4251`) — 점수화 없음 |
| Authentication 축 | **PARTIAL** | MFA/TOTP(`UserAuth.php:929-980`·`:3566-3592`) — 강도 신호원(점수 미산출) |
| Identity 축 | **PARTIAL** | `userByToken`(`UserAuth.php:249-286`)·RBAC(`index.php:573-597`) |
| Device / Network / Threat / Behavior 축 | **ABSENT** | Device Trust·Network Trust·Threat Intel·UEBA 전부 부재(GT② §2). `clientIp`(`UserAuth.php:3443-3463`)·`recordSessionMeta`(`:4247`)는 수집만·분류/점수 없음 |
| risk 승격 여지 | **PARTIAL** | `auth_audit_log.risk`(`UserAuth.php:4165`·`:4193`)=정적 문자열·계산 점수 아님 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **범위·밴딩**: 0~100 정수, 밴드 enum(Trusted/Low Risk/Conditional/Restricted/Deny — SPEC §14).
- **입력 축**: SPEC §15 Confidence 7성분(Identity/Device/Session/Network/Threat/Behavior/Authentication)과 정합. 재활용(ADR D-1·D-2) — Session←세션 substrate, Authentication←MFA/TOTP, Device/Network←`recordSessionMeta` ip/ua 승격, risk←`auth_audit_log.risk` 계산화(ADR D-5).
- **불변 스냅샷·버전**: SPEC §33 `Immutable Trust Snapshot`·`Trust Version` — 점수 산출 시점 스냅샷 불변, `SecurityAudit.php:12-68` 해시체인 증거(ADR D-5).
- **테넌트 격리**: SPEC §33 — 요청 tenant(`index.php:69-622` 주입) 경계 내.
- **성능**: SPEC §35 Trust Evaluation ≤ 20ms·Trust Cache Hit ≥ 98%(실 구현 조건).
- **PDP 결합**: Trust Score는 Part 3-12 PDP의 Runtime Context/Risk 입력으로 주입, PDP 재구현 금지(ADR D-6).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

Trust Score는 **authz 점수**다. 마케팅 confidence/risk와 데이터 소스·목적 완전 분리(GT② §4): `Mmm.php:749`·`:939`(MMM 사후 신뢰도 `1/(1+cv)`)·`AttributionEngine.php:246-261`(blended/mk/mmm trust)·`DataPlatform.php:281`(데이터 신뢰도)·`Attribution.php:145-242`(cross-device confidence)·`CustomerAI.php:10-18`(churn risk 0~100)·`Risk.php:31-55`(공급망 fraud)·`GraphScore.php:12-18`. authz `user_session`/`auth_audit_log` ≠ 마케팅 `performance_metrics`/`attribution_*`/`crm_*`. 특히 `CustomerAI` risk 0~100은 밴딩이 유사하나 고객 이탈 점수이며 인가 점수 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Trust Score(0~100 종합) = **ABSENT(순신규)**. PARTIAL 재활용 = Session/Authentication/Identity 원재료(세션·MFA·userByToken). Device/Network/Threat/Behavior 축은 각 Trust Engine 부재로 입력 자체가 없음.
- **선행 의존**: Identity Trust Engine·Device/Session/Network Trust·Threat Intel·Behavior UEBA 신설이 선행(각 부재). Part 3-12 PDP가 소비지점(ADR §4·D-6 BLOCKED_PREREQUISITE).
- **무후퇴**: 세션·MFA·요청별 게이트·SecurityAudit 유지·병행(Extend-only). 코드 변경 0 · NOT_CERTIFIED.
