# ADR — Zero Trust Identity & Continuous Authorization Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-13
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-11 · **3-12(PDP/PEP)** 직접 결합

---

## 1. Context

GeniegoROI의 인가는 **로그인 경계(perimeter-at-login) 인증 + 요청별 정적 RBAC/ABAC 재검증** 모델이다. 인가는 요청마다 재계산되나(`index.php:69-622`·`userByToken` `UserAuth.php:249-286`), 재계산 입력은 **자격증명·plan tier·team_role·api_key scope**로 국한된다. 최초 로그인 이후 **컨텍스트 변화(session/device/network/risk/threat/behavior)를 감지해 권한을 재평가하는 트리거가 전무**하다. `auth_audit_log.risk`(`UserAuth.php:4165`)는 정적 감사 라벨로 SIEM 라우팅에만 쓰이고 인가 결정에 진입하지 않는다.

본 ADR은 **Zero Trust Identity & Continuous Authorization** — "Never Trust, Always Verify"를 인가 전체에 적용해 최초 승인 이후에도 세션/디바이스/네트워크/위험/위협/행위 신호로 권한을 **지속 재평가**하는 Continuous Authorization Platform — 의 거버넌스 기반을 정의한다. NIST SP 800-207(ZTA) 참조. Part 3-12 PDP가 결정 지점이라면, 3-13은 그 PDP에 **신뢰신호를 지속 주입**해 adaptive 결정을 내리는 상보 계층이다.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **세션(PRESENT/PARTIAL)**: `userByToken`(`UserAuth.php:249-286`)·TTL 30일·유휴 자동로그아웃(`:288-311`)·recordSessionMeta ip/ua(`:4232-4251`·기록만)·동시세션 목록/폐기(`:4253-4298`).
- **MFA step-up(PRESENT·로그인)**: OTP 챌린지(`UserAuth.php:929-980`)·TOTP(`:3566-3592`·AES-GCM)·복구코드(`:3600-3634`)·테넌트 정책(`:3745-3767`)·break-glass(`:793-798`).
- **네트워크/환경(PARTIAL·비authz)**: clientIp(`:3443-3463`·수집만)·env(`Db.php:41-60`·비게이트).
- **요청별 게이트(PRESENT)**: `index.php:69-622`·`requirePlan`·**agency 재검증(`index.php:96-122`·continuous 선례)**·guardTeamWrite(`UserAuth.php:1134-1167`·정적).
- **증거/risk(PARTIAL)**: SecurityAudit(`SecurityAudit.php:12-68`)·risk 라벨(`UserAuth.php:4165`·정적).

### 2.2 거버넌스 계층 (GT②)
Continuous Authorization 재인가 트리거·Trust Score·Identity/Device/Session/Network/Environment Trust Engine·Threat Intelligence·Adaptive/Risk-based Authorization·mid-session Step-up·Continuous Re-auth·Behavior UEBA(authz)·Trust Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Reconciliation·ZT Guard/Lint = **grep 0(authz)**.

### 2.3 종합
**판정 = ABSENT-continuous(Zero Trust) / PARTIAL-substrate(로그인 경계 인증) / 대량-KEEP_SEPARATE(마케팅 trust/anomaly/risk).**

## 3. Decision

### D-1. recordSessionMeta(ip/ua)를 Device/Network Trust 입력으로 승격 (Extend, 대체 아님)
현 `recordSessionMeta`(`UserAuth.php:4232-4251`)의 ip/ua 기록을 Device Trust(지문/health)·Network Trust(VPN/TOR/impossible-travel 분류) 신호로 승격. 재사용 시 변화 대조(session hijack 탐지·§6)를 신설.

### D-2. 로그인 MFA를 위험기반 mid-session Step-up으로 확장
로그인 시점 OTP/TOTP(`UserAuth.php:929-980`)를 **민감작업/High-risk/Admin action 시 mid-session step-up**(§12)으로 확장. 세션에 **AAL/MFA-passed 상태·Trust Score 저장**(현행 미저장)을 신설해 요청별 게이트가 지속 참조.

### D-3. Continuous Authorization 재인가 트리거 신설
agency 링크 매요청 재검증(`index.php:96-122`·fail-closed)을 **Continuous Verification 선례**로 일반화. session/device/risk/policy 변경 시 권한 재평가(§9) 트리거를 요청별 게이트(`index.php:69-622`)에 신설·PDP(3-12)에 신뢰신호 주입.

### D-4. Trust Score / Authorization Confidence 순신규
identity/device/session/network/threat/behavior/authentication 종합 0~100 Trust Score(§14)·Confidence(§15) 신설. Adaptive Authorization(§11 permit/challenge/deny/step-up/session-termination)을 Trust Score 임계로 구동.

### D-5. Trust Evidence/Snapshot은 SecurityAudit 확장·risk 라벨 승격
Trust 평가/threat feed/session 분석 증거(§21)는 SecurityAudit 해시체인(`SecurityAudit.php:12-68`) 재활용. 정적 `risk` 라벨(`UserAuth.php:4165`)을 **계산된 risk**로 승격해 인가 결정에 결합.

### D-6. Part 3-12 PDP와의 결합 (신뢰신호 주입·무중복)
3-13은 신뢰신호(Trust Score/Device/Network/Threat)를 PDP(3-12)의 Runtime Context·Risk 입력으로 **주입**한다. PDP를 재구현하지 않는다(중복 금지). Adaptive 결정은 PDP Decision Types(3-12 §9)에 step-up/re-auth/session-termination 추가.

### D-7. Threat Intelligence는 순신규 (방어 프리미티브와 별개)
SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 egress/남용 하드닝이지 threat intel 아님. IOC/threat feed/malicious IP/insider/UEBA(§8)는 순신규.

### D-8. 정직 분리
- **실재 과신 회피**: 인가 요청별 재계산은 authn 신선도이지 컨텍스트 재인가 아님. recordSessionMeta는 기록만. MFA는 로그인 1회. risk는 정적 라벨.
- **부재 과장 회피**: Trust Score/Device/Network Trust/Threat Intel/Adaptive grep 0은 실측 부재(그린필드).
- **오흡수 회피**: 마케팅 trust(Mmm/AttributionEngine)·risk/anomaly(AnomalyDetection/ModelMonitor/Risk.php/CustomerAI)·device-sig(Attribution)는 authz Zero Trust 아님(GT② §4).

## 4. Consequences

- **긍정**: "Never Trust, Always Verify"·컨텍스트 기반 지속 인가·세션 탈취/디바이스 위협 대응·adaptive step-up·규제준수(NIST 800-207/CIS). Zero Trust 완성.
- **비용**: 신규(Trust Engine 7종·Continuous Authorization/Verification·Trust Score/Confidence·Threat Intel·Adaptive·mid-session Step-up·Continuous Re-auth·Trust Snapshot/Evidence/Digest/Analytics/Drift/Simulation·Guard/Lint). 세션 AAL/Trust 저장·device/network 분류 신설.
- **선행 의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)가 신뢰신호 소비지점.
- **무후퇴**: 세션·MFA·요청별 게이트·agency 재검증·SecurityAudit·마케팅 엔진 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance(Trust Eval≤20ms)·Zero Trust Validation(NIST 800-207)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Zero Trust = ABSENT-continuous(Trust Score·Device/Network Trust·Threat Intel·Adaptive·mid-session Step-up·Continuous Re-auth·Trust Snapshot/Evidence/Analytics/Drift/Sim·Guard/Lint 순신규) / PARTIAL-substrate(세션 TTL/idle·MFA/TOTP·요청별 게이트·agency 재검증·SecurityAudit·정적 risk 라벨) / 대량-KEEP_SEPARATE(마케팅 trust Mmm/AttributionEngine·risk/anomaly AnomalyDetection/ModelMonitor/Risk.php/CustomerAI·device-sig Attribution·방어 SSRF/rate-limit). Extend: recordSessionMeta→Device/Network Trust·MFA→mid-session step-up·agency 재검증→Continuous Verification·SecurityAudit→Evidence·risk 라벨→계산 risk·PDP(3-12)에 신뢰신호 주입(무중복). 코드0·NOT_CERTIFIED·선행의존. **마케팅 trust/anomaly/risk 흡수 금지·authn 신선도≠continuous authz.**
