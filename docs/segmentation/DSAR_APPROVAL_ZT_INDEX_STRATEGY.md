# DSAR — Zero Trust & Continuous Authorization: 인덱스 전략 (Part 3-13 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §34는 Continuous Authorization 쿼리(§9 트리거·§18 Runtime Monitoring)를 지원할 6개 인덱스 축을 요구한다.

| # | 인덱스 축 | 지원 쿼리 |
|---|---|---|
| I1 | Trust Score | Trust Score(§14 0~100)·Confidence(§15) 임계 조회 |
| I2 | Session | 세션 신뢰/age/idle·동시세션(§6) 조회 |
| I3 | Device | Device Trust(§4 managed/EDR/health) 조회 |
| I4 | Threat | Threat Intelligence(§8 IOC/feed/malicious IP) 매칭 |
| I5 | Policy | Policy Reevaluation(§19) 정책 세대 조회 |
| I6 | Decision | Continuous Decision(§17)·재인가 결정 조회 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 축 | 판정 | 근거(파일:라인) |
|---|---|---|
| I1 Trust Score | **ABSENT** (trust score 전용 인덱스 전무) | authz 종합 trust/confidence 산출 자체 부재(GT② §2). trust score 컬럼 미존재→인덱싱 대상 없음 |
| I2 Session | **PARTIAL** | `user_session` 조회 존재(`UserAuth.php:249-286`·`:266-268`·`expires_at>now AND is_active=1`)·recordSessionMeta(`:4232-4251`)·listSessions(`:4253-4298`). trust 전용 인덱스 아님(만료/활성 필터 목적) |
| I3 Device | **ABSENT** | `recordSessionMeta` ua 1개만 기록(`UserAuth.php:4247`)·지문/health 미존재(GT② §2). device trust 인덱스 대상 전무 |
| I4 Threat | **ABSENT** | IOC/threat feed 연계 부재(GT② §2). SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 방어 프리미티브·인덱싱 threat 대상 아님 |
| I5 Policy | **ABSENT** | 정책 세대/버전 저장 미존재(§33 C2와 연동·순신규) |
| I6 Decision | **PARTIAL** | `auth_audit_log`(`UserAuth.php:4165`·`:4174`·`:4190-4191`)=감사 로그(정적 risk 라벨)·계산된 인가 결정 저장 아님. continuous decision 전용 인덱스 ABSENT |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **I1**: `approval_trust_snapshot(tenant_id, trust_score)` 복합 인덱스 — Trust Eval ≤20ms(§35) 임계 조회. 순신규.
- **I2**: 기존 `user_session`(`UserAuth.php:249-311`) 조회 경로에 신뢰/age 필터 인덱스 추가(Extend). 동시세션(§6) 카디널리티 지원.
- **I3/I4**: Device fingerprint·Threat IOC 매칭 인덱스 순신규(recordSessionMeta ip/ua `:4232-4251` 승격 입력 기반).
- **I5/I6**: Policy version·Decision(계산된 risk 승격) 인덱스 순신규. `auth_audit_log` risk 라벨(`UserAuth.php:4165`)은 정적→계산 risk 승격(ADR D-5) 후 인덱싱.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 device-sig 인덱스(`Attribution.php:144-150` `attribution_device_sig`)=광고 cross-device 식별·Device Trust 인덱스로 오인 금지(GT② §B-3). 마케팅 trust/anomaly 인덱스(`Mmm.php`·`AnomalyDetection.php`·`GraphScore.php:12-18`)와 authz 인덱스 분리.
- **선행의존**: I1/I3/I4/I5는 §33 신설 테이블 선행. Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: I1/I3/I4/I5 = **ABSENT**(trust score/device/threat/policy 전용 인덱스 순신규), I2/I6 = **PARTIAL**(세션·감사로그 조회 재활용·trust 전용 인덱스 미존재).
- **RP-track 실구현 조건**: 6축 인덱스 구축 + Trust Cache Hit ≥98%(§35)·Trust Eval ≤20ms 벤치 통과. 현 단계 코드 변경 0 · **NOT_CERTIFIED**. `user_session` 조회 경로 Extend-only(무후퇴).
