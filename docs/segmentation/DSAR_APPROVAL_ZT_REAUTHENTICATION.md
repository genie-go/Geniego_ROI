# DSAR — Zero Trust & Continuous Authorization: 지속 재인증 (APPROVAL_REAUTHENTICATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_REAUTHENTICATION은 활성 세션이 **일정 조건 충족 시 자격증명 재제시(re-authentication)를 강제**하는 지속 인증 엔티티다. SPEC §13(Continuous Re-authentication) 조건: **Risk 상승 · Session 장시간 유지 · Device 변경 · Network 변경**. ★핵심 구분: 현 substrate는 **로그인 1회 + 유휴 자동로그아웃(idle)만 존재**(authn 신선도)이며, 위험/디바이스/네트워크 변화에 따른 continuous re-auth는 ABSENT(GT① §1·ADR §2.1).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| ZT 조건 | 판정 | 근거(GT 인용) |
|---|---|---|
| Session 장시간(TTL) | PARTIAL | 세션 TTL 30일·발급/만료삭제 `UserAuth.php:986`·`:606`·`:990`·`:4261`(재인증 아님·만료뿐) |
| 유휴 시간 무효화 | PARTIAL(유일 지속검증·authn) | `last_seen_at`·`auto_logout_min`·60s throttle 유휴 자동로그아웃 `UserAuth.php:206-213`·`:288-311`·`:302-305`·`:308-310` |
| 토큰/세션 신선도 재검증 | PARTIAL | 매 요청 `userByToken`(`expires_at>now AND is_active=1`) `UserAuth.php:249-286`·`:266-268` |
| Device/Network 변경 감지→재인증 | **ABSENT** | `recordSessionMeta` ip/ua **기록만·authz 미반영** `UserAuth.php:4232-4251`·`:4247`. 변화 대조·impossible-travel 없음(GT② 표) |
| Risk 상승→재챌린지 | **ABSENT** | `auth_audit_log.risk` 정적 라벨·SIEM만(`UserAuth.php:4165`·`:4193`)·재인증 트리거 부재 |
| 동시세션 제한/폐기 | PARTIAL | `listSessions`/`revokeOtherSessions`(수동 폐기·제한/차단 없음) `UserAuth.php:4253-4298` |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

| 항목 | 계약 |
|---|---|
| 재인증 조건 | `RISK_ESCALATION`·`SESSION_LONG_LIVED`·`DEVICE_CHANGE`·`NETWORK_CHANGE`(SPEC §13) |
| 감지 입력 | `recordSessionMeta` ip/ua를 **Device/Network Trust 입력으로 승격**·변화 대조(session hijack 탐지·ADR D-1) |
| 신규 필드 | `last_reauth_at`·`device_fingerprint`·`network_class`(신설·SPEC §4 Device Trust·§5 Network Trust) |
| 재평가 트리거 | agency 매요청 재검증(`index.php:96-122`)을 **Continuous Verification 선례로 일반화**(ADR D-3)·요청별 게이트에 신설 |
| 에러/경고 계약 | `REAUTH_REQUIRED`·`SESSION_INVALID`·`DEVICE_NOT_TRUSTED`·`NETWORK_UNTRUSTED`(SPEC §30) / `Session Aging`(SPEC §31) |
| 테넌트 격리 | 세션·재인증 이력 `X-Tenant-Id` 격리(SPEC §33)·`user_session` authz 축 |

## 4. KEEP_SEPARATE (마케팅 risk/anomaly·방어프리미티브 흡수금지)

- **device-sig 오인 금지**: `Attribution.php:144-150`(`attribution_device_sig` ip+ua 해시)는 **광고 cross-device 식별(마케팅)**이며 Device Trust 재인증 신호로 오인 금지(GT② §4 B-3). 재인증은 `user_session`/`recordSessionMeta` authz 축만 사용.
- **Risk 상승 조건**은 authz risk(계산된 risk 승격·ADR D-5)이며 마케팅 risk/anomaly(`AnomalyDetection.php`·`Risk.php:31-55`·`CustomerAI.php:10-18`) 흡수 금지(GT② §4 B-2).
- 환경 라벨(`Db.php:41-60`·`:53` "게이트에 envLabel 금지")는 재인증 게이트 입력 아님(GT① §C).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **Continuous Re-authentication = ABSENT(순신규)**. 위험/디바이스/네트워크 변경 재인증 트리거 grep 0(GT② 표). 현존은 유휴 로그아웃(authn 신선도)뿐(GT① §A).
- **재활용(Extend)**: `recordSessionMeta`(ip/ua)→Device/Network Trust 입력 승격(ADR D-1) · 유휴 로그아웃/`userByToken`→재검증 substrate · agency 재검증→Continuous Verification 일반화(ADR D-3).
- **선행의존**: Device/Network Trust Engine·계산 risk·세션 변화 대조 신설 선행. 실 구현=RP-track 승인세션. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
