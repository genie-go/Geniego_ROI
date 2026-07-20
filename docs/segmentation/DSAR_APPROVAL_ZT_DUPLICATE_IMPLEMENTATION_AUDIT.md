# DSAR — Zero Trust & Continuous Authorization: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 마케팅 trust/anomaly/risk(오흡수 최대 위험).

---

## 1. 핵심 판정 — **Continuous Authorization·Trust Engine 부재, 인가는 요청별 정적 RBAC 재검증에 국한**

`trust_score|continuous.author|adaptive.author|step.?up|reauth|threat.?feed|IOC|device.?trust|network.?trust` **authz 매치 0건**(히트는 전부 마케팅 trust/confidence·SSRF 가드·rate-limit). Zero Trust continuous 축은 그린필드. 단 세션·MFA·recordSessionMeta·agency 재검증(GT①)은 재활용.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Zero Trust Registry / Identity Trust Engine | **ABSENT(grep 0)** | trust profile/engine 전용 구조 전무. 신뢰=암묵(로그인 통과=신뢰) |
| Continuous Authorization/Verification(재인가 트리거) | **PARTIAL/ABSENT** | 인가 매 요청 재계산(`index.php:69-622`·`userByToken` `UserAuth.php:249-286`)이나 입력=자격증명·plan·team_role·scope뿐. mid-session 컨텍스트(risk/device/threat) 재평가 트리거 **부재**. 근접="유휴 로그아웃"(`:288-311`)·agency 재검증(`index.php:96-122`)=authn 신선도 |
| Trust Score / Authorization Confidence(0~100) | **ABSENT** | identity/device/session/network 종합 authz confidence 산출 없음. `trust`/`confidence` 히트는 전부 마케팅(§B) |
| Device Trust Engine | **ABSENT** | `recordSessionMeta`가 ua 1개만(`UserAuth.php:4247`). 지문/managed/EDR/TPM/root/health 전무 |
| Network Trust Engine | **ABSENT** | `clientIp`(`UserAuth.php:3443-3463`) 수집만·VPN/TOR/proxy/impossible-travel 분류 없음 |
| Environment Trust(authz) | **ABSENT(authz)** | `Db.php:41-60` env는 OTP 노출/데모시드용·`:53` 주석 "게이트에 envLabel 금지" |
| Threat Intelligence(IOC/feed/UEBA) | **ABSENT** | SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 방어 프리미티브·threat feed 연계 아님 |
| Adaptive / Risk-based Authorization | **ABSENT** | `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 문자열·SIEM 라우팅(`:4193`)만·인가결정 미반영 |
| Step-up(mid-session) / Continuous Re-authentication | **ABSENT** | MFA는 로그인 1회(`UserAuth.php:929-980`). 민감작업 재인증·risk 상승 재챌린지 없음 |
| Behavior Analytics(UEBA·authz) | **ABSENT** | `AnomalyDetection.php`는 광고 SPC(§B). 로그인/API 패턴이 인가에 피드 안 됨 |
| Trust Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Reconciliation | **ABSENT/PARTIAL** | SecurityAudit 체인(`SecurityAudit.php:12-68`) 근접(Evidence)·나머지 authz 전용 전무 |
| ZT Runtime Guard / Static Lint | **ABSENT** | `guardTeamWrite`(`UserAuth.php:1134-1167`)=정적 team_role. 신뢰기반 차단·hardcoded-trust lint 없음 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 재활용)

1. **세션 substrate** — TTL/idle/토큰해시(`UserAuth.php:249-311`)·recordSessionMeta ip/ua(`:4232-4251`). Session Trust + Device/Network 입력원.
2. **MFA step-up** — 로그인 OTP/TOTP/복구코드(`UserAuth.php:929-980`·`:3566-3634`). mid-session step-up으로 확장.
3. **agency 재검증** — `index.php:96-122`(매요청 approved 재확인·fail-closed). Continuous Verification 선례.
4. **요청별 게이트** — `index.php:69-622`·`requirePlan`. 신뢰신호 결합 삽입지점.
5. **SecurityAudit** — `SecurityAudit.php:12-68`. Trust Evidence/Snapshot 무결성.
6. **risk 라벨** — `auth_audit_log.risk`(`UserAuth.php:4165`)·정적→계산된 risk로 승격.
7. **SSRF/rate-limit** — 방어 프리미티브(threat intel 아님·별개).

## 4. ★KEEP_SEPARATE — 마케팅·커머스 trust/anomaly/risk (authz 아님·오흡수 최대 위험·개명 금지)

★저장소의 "trust/risk/anomaly/threat/behavior/confidence/drift" 신호는 **거의 전부 마케팅·커머스·ML** 도메인이다. authz Zero Trust와 데이터 소스·목적 완전 분리.

### B-1. 마케팅 trust/confidence
- `Mmm.php:749`·`:939`(MMM 베이지안 사후 신뢰도 `1/(1+cv)`)·`AttributionEngine.php:246-261`(`blended_trust`/`mkTrust`/`mmmTrust` 어트리뷰션 신뢰등급)·`DataPlatform.php:281`(데이터 신뢰도 대시보드)·`Attribution.php:145-242`(cross-device confidence). authz trust score 아님.

### B-2. 마케팅/커머스 risk·anomaly·drift
- `AnomalyDetection.php`(광고지표 SPC 이상탐지 μ±kσ)·`ModelMonitor.php:11-18`(ML 드리프트/재학습)·`Risk.php:31-55`(공급망/셀러 fraud 로지스틱회귀 neg_review/oos/price)·`CustomerAI.php:10-18`(RFM/churn/LTV risk 0~100)·`GraphScore.php:12-18`(influencer→sku→order 그래프). ZT Trust Drift/Behavior/Threat 아님.

### B-3. device-sig 오인 금지
- `Attribution.php:144-150`(`attribution_device_sig` ip+ua 해시)=광고 cross-device 식별(마케팅 attribution). **Device Trust로 오인 금지**.

### B-4. 방어 프리미티브 (threat intel 아님)
- SSRF 가드(`Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624`·`WmsCctv.php:33`)·rate-limit(`index.php:527-570`). egress/남용 하드닝이지 IOC/threat feed 아님.
- `Health.php:82`(서버 fingerprint 차폐)=정보노출 방지·device trust 아님.

## 5. 종합

**Zero Trust 거버넌스 = ABSENT 골격(Continuous Authorization·Trust Score·Device/Network Trust·Threat Intel·Adaptive·mid-session Step-up·Continuous Re-auth·Trust Analytics/Drift/Sim·Guard/Lint 순신규) / PARTIAL(세션·MFA·요청별 게이트·agency 재검증·SecurityAudit).** 재활용(흡수 아님·확장): 세션→Session/Device/Network Trust 입력·MFA→mid-session step-up·agency 재검증→Continuous Verification·SecurityAudit→Trust Evidence·risk 라벨→계산된 risk. **★KEEP_SEPARATE=마케팅 trust(Mmm/AttributionEngine/DataPlatform)·risk/anomaly(AnomalyDetection/ModelMonitor/Risk.php/CustomerAI/GraphScore)·device-sig(Attribution)·방어 프리미티브(SSRF/rate-limit).** authz trust≠마케팅 trust. 데이터소스 `performance_metrics`/`attribution_*`/`crm_*` ≠ authz `user_session`/`auth_audit_log`.
