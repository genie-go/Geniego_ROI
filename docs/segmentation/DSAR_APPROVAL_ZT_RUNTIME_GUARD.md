# DSAR — Zero Trust & Continuous Authorization: 런타임 가드 (Part 3-13 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §28 Runtime Guard는 요청 실행 경로에서 신뢰·위협 신호로 접근을 **런타임 차단**하는 6개 가드다: Low Trust · High Threat · Session Hijack · Device Compromise · Invalid Token · Risk Escalation. §11(Adaptive Authorization)의 Deny/Session Termination·§17(Continuous Decision)의 Suspend/Revoke Session과 결합해 "Never Trust, Always Verify"를 요청별로 강제한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §28 가드 | 판정 | 근거(파일:라인) |
|---|---|---|
| Invalid Token | **PARTIAL(재활용)** | `userByToken`(`UserAuth.php:249-286`·`:266-268`) 매요청 토큰해시·`expires_at>now AND is_active=1` 재검증 · api_key 미들웨어 해시조회/만료(`index.php:69-622`·`:506-508`) |
| (정적) 권한 차단 | **PARTIAL(재활용)** | `guardTeamWrite`/`requireTeamWrite`(`UserAuth.php:1134-1167`·`index.php:72-89`) 정적 team_role read-only 게이트 · RBAC rank/scope(`index.php:573-597`·`:608-619`) |
| Session Hijack | **ABSENT** | `recordSessionMeta` ip/ua **기록만**(`UserAuth.php:4232-4251`·`:4247`)·변화 대조 차단 없음. 유휴 무효화(`:288-311`)는 authn 신선도뿐 |
| Low Trust / Risk Escalation | **ABSENT** | Trust Score 부재. `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·SIEM 라우팅(`:4193`)만·인가 미반영 |
| Device Compromise | **ABSENT(grep 0)** | managed/EDR/TPM/root/health 신호 전무(GT② §2) |
| High Threat | **ABSENT(grep 0)** | IOC/threat feed 부재. SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 방어 프리미티브·threat intel 아님 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **차단 지점 단일화**: 6개 가드는 요청별 게이트(`index.php:69-622`)와 PDP(3-12)에 신뢰신호를 주입해 판정한다. 별도 미들웨어 난립 금지(ADR D-6 무중복).
2. **Invalid Token/정적 권한**은 현행 `userByToken`·`guardTeamWrite`를 재활용(Extend)하고, 신뢰기반 4가드(Low Trust/High Threat/Session Hijack/Device Compromise/Risk Escalation)는 순신규(ADR D-1·D-3·D-4·D-7).
3. **Session Hijack**은 `recordSessionMeta` ip/ua(`UserAuth.php:4232-4251`)를 Device/Network Trust 입력으로 승격 후 세션 바인딩 변화 대조로 탐지(ADR D-1)→§17 Revoke Session.
4. **Low Trust/Risk Escalation**은 §14 Trust Score 임계·계산된 risk(정적 `:4165` 승격, ADR D-5)로 구동→§11 Deny/Challenge/Session Termination.
5. **Fail-closed**: agency 재검증(`index.php:96-122`) 선례를 일반화해 신뢰신호 부재/미결정은 차단(Unknown≠Trusted).
6. **증거화**: 모든 가드 차단은 SecurityAudit 해시체인(`SecurityAudit.php:12-68`)에 append-only 기록(ADR D-5).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- 마케팅 anomaly/risk(`AnomalyDetection.php`·`ModelMonitor.php:11-18`·`Risk.php:31-55`·`CustomerAI.php:10-18`)는 광고 SPC/공급망 fraud/churn이지 authz 가드 아님(GT② §4-B2).
- `Attribution.php:144-150` device-sig(ip+ua 해시)=마케팅 cross-device 식별·**Device Compromise 신호로 오인 금지**(GT② §B-3).
- SSRF/rate-limit·`Health.php:82` fingerprint 차폐는 방어 프리미티브·High Threat 가드로 승격 금지(GT② §B-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Runtime Guard = PARTIAL(Invalid Token·정적 권한 재활용) / ABSENT(Low Trust·High Threat·Session Hijack·Device Compromise·Risk Escalation 순신규).** 재활용: `userByToken`·`guardTeamWrite`·요청별 게이트·agency fail-closed·SecurityAudit. 선행: Part 1~3-12(PDP/PEP) 인증·Trust Score(§14)·Device/Network Trust·Threat Intel 신설 후 구현. 코드 변경 0·BLOCKED_PREREQUISITE. authn 신선도≠continuous authz 차단.
