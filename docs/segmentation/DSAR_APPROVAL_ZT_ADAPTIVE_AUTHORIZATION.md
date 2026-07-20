# DSAR — Zero Trust & Continuous Authorization: 적응형 인가 (APPROVAL_ADAPTIVE_AUTHORIZATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_ADAPTIVE_AUTHORIZATION은 신뢰신호(Trust Score/Device/Network/Threat/Behavior)를 입력으로 **런타임 인가 결정을 동적으로 변주**하는 엔티티다. SPEC §11(Adaptive Authorization) 결정 코드: **Permit · Deny · Challenge · Read Only · Step-up MFA · Re-authentication · Session Termination**. SPEC §13(Risk-based)은 위험 상승 시 결정을 상향 강도로 전환한다. SPEC §14 Trust Score(0~100) 임계 밴드(90~100 Trusted / 70~89 Low Risk / 50~69 Conditional / 30~49 Restricted / 0~29 Deny)가 결정을 구동한다(ADR D-4).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| ZT 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| 요청별 인가 결정 지점 | PARTIAL | api_key 미들웨어 RBAC rank/scope 게이트 `index.php:69-622`·`:506-508`·`:573-597`(입력=자격증명·plan·team_role·scope뿐) |
| 결정을 컨텍스트로 변주 | **ABSENT** | risk/device/threat가 인가 결정에 진입하는 지점 없음(GT① §1·GT② 표 "Adaptive/Risk-based Authorization ABSENT") |
| 위험 라벨 | PARTIAL·비-adaptive | `auth_audit_log.risk`(`UserAuth.php:4165`·`:4172`) 정적 문자열·`if risk==='high'`→SIEM(`:4193`)·**인가 미반영** |
| 철회 즉시 결정 전환(선례) | PARTIAL | agency 링크 매요청 `status='approved'` 재확인 fail-closed `index.php:96-122`(Continuous Verification 선례·단 신뢰신호 아님) |
| 이진 차단(정적) | PARTIAL | `guardTeamWrite`/`requireTeamWrite` `index.php:72-89`·`UserAuth.php:1134-1167`(고정 team_role·Permit/Deny 2치만·Challenge/Read Only/Step-up 없음) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

| 항목 | 계약 |
|---|---|
| 결정 코드 | `PERMIT`·`DENY`·`CHALLENGE`·`READ_ONLY`·`STEP_UP_MFA`·`REAUTH`·`SESSION_TERMINATE`(SPEC §11) |
| 구동 입력 | Trust Score 0~100(SPEC §14)·Identity/Device/Session/Network/Threat/Behavior/Authentication confidence(SPEC §15) |
| 위험 밴드 | 90~100→Permit · 50~69→Challenge/Read Only · 30~49→Restricted(Step-up/Re-auth) · 0~29→Deny(SPEC §13·§14) |
| 에러/경고 계약 | `TRUST_SCORE_TOO_LOW`·`STEP_UP_REQUIRED`·`REAUTH_REQUIRED`(SPEC §30) / `Trust Declining`(SPEC §31) |
| 성능 | Continuous Authorization ≤ 25ms(SPEC §35) |
| 테넌트 격리 | 결정·Trust Snapshot은 `X-Tenant-Id` 격리(SPEC §33 Tenant Isolation)·`auth_audit_log`/`user_session` authz 축만 |
| 결합 | PDP(3-12) Decision Types에 step-up/re-auth/session-termination **추가**(재구현 금지·ADR D-6) |

## 4. KEEP_SEPARATE (마케팅 risk/anomaly·방어프리미티브 흡수금지)

- **마케팅 risk/anomaly 흡수 금지**: `AnomalyDetection.php`(광고 SPC μ±kσ)·`Risk.php:31-55`(공급망 fraud 로지스틱)·`CustomerAI.php:10-18`(churn/LTV risk 0~100)·`ModelMonitor.php:11-18`(ML 드리프트)는 인가 adaptive 입력 아님(GT② §4 B-2). authz risk(`auth_audit_log.risk`)와 데이터소스·목적 완전 분리.
- **방어 프리미티브 흡수 금지**: rate-limit(`index.php:527-570`)·SSRF 가드(`Alerting.php:786`)는 남용/egress 하드닝이지 adaptive 결정 신호 아님(GT② §4 B-4).
- authz Trust Score ≠ 마케팅 trust(`Mmm.php:749`·`AttributionEngine.php:246-261`).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **Adaptive/Risk-based Authorization = ABSENT(순신규)**. 결정을 신뢰신호로 변주하는 엔진 grep 0(GT② 표·ADR §2.2).
- **재활용(Extend)**: 요청별 게이트(`index.php:69-622`)=삽입지점 · 정적 `risk` 라벨(`UserAuth.php:4165`)→**계산된 risk로 승격**(ADR D-5) · agency 재검증(`index.php:96-122`)→Continuous Verification 일반화(ADR D-3).
- **선행의존**: Part 3-12 PDP에 신뢰신호 주입해 adaptive 결정(ADR D-6). Trust Score/Confidence(§14/§15) 신설 선행. 실 구현=RP-track 승인세션. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
