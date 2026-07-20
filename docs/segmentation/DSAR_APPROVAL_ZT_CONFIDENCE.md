# DSAR — Zero Trust & Continuous Authorization: 인가 확신도 (APPROVAL_AUTHORIZATION_CONFIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AUTHORIZATION_CONFIDENCE`(SPEC §2·§15)는 인가 결정의 **확신도(Confidence)** 를 산출한다. SPEC §15 계산 성분 7종:

- **Identity**
- **Device**
- **Session**
- **Network**
- **Threat**
- **Behavior**
- **Authentication**

Trust Score(§14)가 "얼마나 신뢰하는가"라면, Confidence는 "그 결정을 얼마나 확신하는가"(신호 완전성/일관성)를 나타내며, SPEC §11 Adaptive Authorization이 낮은 확신도에서 Challenge/Step-up으로 전환하는 근거가 된다. 요청 시점마다 재계산되는 Continuous 값이다(SPEC §0).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| §15 성분 | 판정 | 근거(GT) |
|---|---|---|
| Authorization Confidence(종합 authz) | **ABSENT(grep 0)** | GT② §2 "종합 authz confidence 산출 없음. `confidence` 히트 전부 마케팅" |
| Identity | **PARTIAL** | `userByToken`(`UserAuth.php:249-286`·`:266-268`) 매요청 신원 재검증 |
| Session | **PARTIAL** | 세션 TTL/idle(`UserAuth.php:249-311`)·동시세션(`:4253-4298`)·recordSessionMeta(`:4232-4251`) |
| Authentication | **PARTIAL** | MFA/OTP/TOTP/복구코드(`UserAuth.php:929-980`·`:3566-3592`·`:3600-3634`)·break-glass(`:793-798`) |
| Device | **ABSENT** | `recordSessionMeta` ua 1개만(`UserAuth.php:4247`)·지문/health 전무(GT② §2) |
| Network | **ABSENT** | `clientIp`(`UserAuth.php:3443-3463`) 수집만·VPN/TOR 분류 없음(GT② §2) |
| Threat | **ABSENT** | IOC/threat feed 부재. SSRF(`Alerting.php:786`)·rate-limit(`index.php:527-570`)=방어 프리미티브·threat intel 아님(GT② §4) |
| Behavior | **ABSENT** | 로그인/API 패턴 인가 피드 없음(GT② §2 UEBA authz ABSENT) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **성분 7종**: SPEC §15. Trust Score(§14) 축과 정합. 재활용(ADR D-1·D-2) — Identity←`userByToken`, Session←세션 substrate, Authentication←MFA/TOTP, Device/Network←`recordSessionMeta` ip/ua 및 `clientIp` 승격. Threat/Behavior는 순신규 엔진 산출 대기.
- **낮은 확신 → Adaptive**: 성분 결측/불일치 시 Confidence 하락 → SPEC §11 Challenge/Step-up/Read Only. agency 재검증(`index.php:96-122`·fail-closed)이 "신호 미확인 시 차단"의 실존 선례.
- **불변·버전·격리**: SPEC §33 `Immutable Trust Snapshot`·`Trust Version`·`Tenant Isolation`. 증거 `SecurityAudit.php:12-68` 재활용(ADR D-5). 요청 tenant(`index.php:69-622` 주입) 경계.
- **PDP 결합**: Confidence는 Part 3-12 PDP Runtime Context 입력으로 주입, 중복 구현 금지(ADR D-6).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

Confidence는 **authz 확신도**다. "confidence" 히트는 저장소에서 거의 전부 마케팅이므로 오흡수 최대 위험(GT② §4): `Attribution.php:145-242`(cross-device confidence)·`Mmm.php:749`·`:939`(MMM 사후 신뢰도)·`AttributionEngine.php:246-261`(blended trust)·`DataPlatform.php:281`(데이터 신뢰도)는 어트리뷰션/데이터 확신이지 인가 확신 아님. Behavior 성분 산출 시 `AnomalyDetection.php`(광고 SPC)·`CustomerAI.php:10-18`(고객 행위 RFM/churn)·`GraphScore.php:12-18` 흡수 금지 — 인가 행위분석 아님. device-sig(`Attribution.php:144-150`·ip+ua 해시)는 마케팅 cross-device 식별이며 Device 성분으로 오인 금지(GT② §B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Authorization Confidence(7성분 종합) = **ABSENT(순신규)**. PARTIAL 재활용 = Identity/Session/Authentication 3성분 원재료. Device/Network/Threat/Behavior 4성분은 각 Trust Engine·Threat Intel·UEBA 부재로 입력 자체가 없음.
- **선행 의존**: Device/Session/Network Trust Engine·Threat Intelligence·Behavior Analytics·Trust Score(§14) 신설이 선행. Part 3-12 PDP 결합(ADR §4·D-6 BLOCKED_PREREQUISITE).
- **무후퇴**: 세션·MFA·agency 재검증·요청별 게이트·SecurityAudit 유지·병행(Extend-only). 코드 변경 0 · NOT_CERTIFIED.
