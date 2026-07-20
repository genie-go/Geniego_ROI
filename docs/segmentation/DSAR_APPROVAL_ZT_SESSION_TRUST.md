# DSAR — Zero Trust & Continuous Authorization: 세션 신뢰 (APPROVAL_SESSION_TRUST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SESSION_TRUST`는 SPEC §6(Session Trust Engine)가 정의하는 **세션 신뢰 평가 엔티티**다. 활성 세션의 수명·유휴·토큰 신선도·인증 상태·탈취 여부를 지속 평가해 Trust Score(§14)·Continuous Verification(§10)에 결합한다.

평가 요소(SPEC §6): Session Age · Idle Time · Token Freshness · MFA Status · Session Hijack Detection · Concurrent Session. 4개 ZT 신뢰축 중 **substrate가 가장 성숙**한 축이다(PRESENT/PARTIAL).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §6 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Token Freshness(매요청 토큰·세션·계정활성 재검증) | **PRESENT** | `userByToken`(user_session JOIN·`expires_at>now AND is_active=1`·토큰 해시저장)(`UserAuth.php:249-286`·`:266-268`, GT①) |
| Session Age / TTL(30일·발급·만료삭제) | **PRESENT** | `UserAuth.php:986`·`:606`·`:990`·`:609`·`:989`·`:4261`(GT①) |
| Idle Time(유휴 자동로그아웃·60s throttle) | **PRESENT** | `last_seen_at`·`auto_logout_min`(`UserAuth.php:206-213`·`:288-311`·`:302-305`·`:308-310`) — 유일 "지속검증" 성격(authn)(GT①) |
| MFA Status(세션 저장) | **PARTIAL(미저장)** | MFA는 로그인 1회(`UserAuth.php:929-980`). **세션에 AAL/MFA-passed 상태·Trust Score 저장 현행 미저장**(ADR D-2) |
| Concurrent Session(목록/수동폐기) | **PARTIAL** | `listSessions`·`revokeOtherSessions`(토큰 마스킹·타기기 폐기·**제한/차단 없음**)(`UserAuth.php:4253-4298`, GT①) |
| Session Hijack Detection | **ABSENT** | ip/ua 변화 대조 기반 탈취 탐지 전무. `recordSessionMeta`는 기록만(`UserAuth.php:4232-4251`·`:4247`, GT①) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **재활용(ADR D-2/D-3)**: 세션 substrate(TTL/idle/토큰해시 `UserAuth.php:249-311`·recordSessionMeta `:4232-4251`)를 Session Trust 입력으로 사용. 세션에 **AAL/MFA-passed·Trust Score 저장(신설)**해 요청별 게이트(`index.php:69-622`)가 지속 참조.
- **필드**: `session_age`·`idle_seconds`·`token_freshness`·`mfa_passed_at`·`aal_level`·`hijack_signal`·`concurrent_count`(SPEC §6). AAL/Trust Score·hijack 신호는 순신규.
- **Hijack Detection 신설(ADR D-1)**: recordSessionMeta ip/ua 변화 대조로 session hijack 탐지. Runtime Guard(§28)의 Session Hijack 차단과 연동.
- **제약(SPEC §33)**: Immutable Trust Snapshot·Trust Version·**Tenant Isolation**·Digest Validation. 세션 축 데이터소스 `user_session`(마케팅 `attribution_*`/`crm_*`와 분리).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- 마케팅 "Session Pattern"(SPEC §16 Behavior Analytics의 session pattern)은 UEBA authz 신호로 순신규이며, 마케팅 세션분석(cross-device confidence `Attribution.php:145-242`)과 별개.
- `CustomerAI.php:10-18`(RFM/churn/LTV risk)·`AnomalyDetection.php`(광고 SPC)의 세션류 신호는 authz Session Trust 아님(GT② B-1/B-2).
- authz `user_session`/`auth_audit_log` ≠ 마케팅 데이터소스.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Session Trust = **PRESENT/PARTIAL substrate**. 재활용: Token Freshness·Session Age·Idle(PRESENT)·Concurrent(PARTIAL). 순신규: **MFA Status 세션저장(AAL)·Session Hijack Detection·Trust Score 결합**.
- **정직 분리(ADR D-8)**: 매요청 재계산·유휴 로그아웃은 **authn 신선도이지 컨텍스트 재인가 아님**. recordSessionMeta는 기록만·MFA는 로그인 1회.
- **선행 의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)가 세션 신뢰 소비지점(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0. 무후퇴·Extend-only.
