# DSAR — Zero Trust & Continuous Authorization: 테스트 계약 (Part 3-13 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §36은 6개 테스트 계층을 요구한다.

| 계층 | 항목 |
|---|---|
| Unit | Trust Engine·Device Trust·Session Trust·Threat Evaluation·Continuous Authorization |
| Integration | PDP·PEP·RBAC·JIT·SoD·Effective Resolution Engine |
| Performance | 500K Continuous Evaluations/sec·10M Active Sessions·100M Trust Calculations/day |
| Security | Session Hijacking·Device Spoofing·Token Replay·Trust Manipulation·Threat Feed Poisoning |
| Compliance | Zero Trust Architecture·NIST SP 800-207·ISO 27001·SOC 2·CIS Controls |
| Regression | Authorization·Policy·Workflow·Audit |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 계층 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unit | **ABSENT** (Trust/Device/Threat 엔진 부재→테스트 대상 없음) | Trust Engine 전무(GT② §2). Session Trust만 부분 재활용 대상(`UserAuth.php:249-311`) |
| Integration | **PARTIAL** | 결합 대상 존재: 요청별 게이트(`index.php:69-622`)·requirePlan(`UserAuth.php:364-374`)·guardTeamWrite(`UserAuth.php:1134-1167`)·agency 재검증(`index.php:96-122`). PDP(3-12)와 통합은 선행 인증 필요 |
| Performance | **ABSENT** | Continuous Evaluation·Trust Calculation 자체 부재(GT② §2). 측정 대상 미존재 |
| Security | **PARTIAL** | Session Hijack raw material=recordSessionMeta ip/ua(`UserAuth.php:4232-4251`·기록만·탐지 아님)·Token Replay 근접=토큰 해시저장(`UserAuth.php:266-268`). Device Spoofing/Trust Manipulation/Threat Poisoning 대상 순신규 |
| Compliance | **ABSENT** (Zero Trust/NIST 800-207 검증 부재) | ZTA continuous 축 부재(GT① §1). 준수 검증 대상 미존재 |
| Regression | **PARTIAL** | 기존 감사 증거 재활용: SecurityAudit 해시체인 verify(`SecurityAudit.php:12-53`·`:56-68`)·auth_audit_log(`UserAuth.php:4165`·`:4193`) |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Unit**: Trust Engine 7종(Identity/Device/Session/Network/Environment/Threat/Behavior)·Continuous Authorization 재인가 트리거(§9) 단위 검증. Session Trust는 기존 세션 substrate(`UserAuth.php:249-311`) 기반.
- **Integration**: PDP(3-12)에 신뢰신호 주입(ADR D-6·무중복)·RBAC/JIT/SoD/ERE 결합 회귀. agency 재검증(`index.php:96-122`)=Continuous Verification 선례.
- **Security**: Session Hijack 탐지는 recordSessionMeta 변화 대조(ADR D-1) 검증·Token Replay는 해시저장(`UserAuth.php:266-268`) 기반. Trust Manipulation은 §33 immutable snapshot으로 방어.
- **Compliance/Regression**: NIST 800-207/ISO27001/SOC2/CIS 검증·Regression 100%는 실 구현(RP-track) 조건.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 anomaly/ML 테스트(`AnomalyDetection.php` SPC·`ModelMonitor.php:11-18` 드리프트·`Risk.php:31-55` fraud)는 authz Trust Engine unit/security 테스트와 분리(GT② §4). device-sig(`Attribution.php:144-150`)≠Device Spoofing 테스트.
- **선행의존**: Unit/Performance/Compliance는 Trust Engine 실구현 선행. Integration은 Part 3-12 PDP 인증 선행(BLOCKED_PREREQUISITE).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: Unit/Performance/Compliance = **ABSENT**(엔진·측정·검증 대상 순신규), Integration/Security/Regression = **PARTIAL**(게이트·세션메타·SecurityAudit 재활용 대상 존재).
- **RP-track 실구현 조건**: 6계층 전 통과 — Performance(500K/sec·10M sessions·100M/day)·Security(5종)·Compliance(NIST 800-207 포함)·Regression 100%가 §37 Completion Gate 조건. 현 단계 코드 변경 0 · **NOT_CERTIFIED**. SecurityAudit·세션·게이트 재활용 Extend-only(무후퇴).
