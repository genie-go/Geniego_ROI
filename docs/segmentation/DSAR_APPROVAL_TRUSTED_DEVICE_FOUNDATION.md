# DSAR — Trusted Device Foundation (06-A-03-02-03-03 · §35/§26)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§35/§26 Trusted Device Foundation** — Device Identity Registry(§35) 위에 기기의 **신뢰 상태**를 관리하는 계약. 핵심 축:
`trust state`(신뢰 상태: identified/trusted/attested/managed) · `trust expires`(신뢰 만료) · `compromise status`(침해 상태). §26 Device Binding에서 세션↔device를 결합하며 `device AAL`·`trusted 여부`·`attestation ref`·`fingerprint digest`·`first/last seen`·`verified/expires`를 보존.

원칙 계약(§12 DAL·§31·§51 파생): Device Assurance Level DAL0~DAL4(IDENTIFIED/TRUSTED/ATTESTED_REF/MANAGED_HARDWARE_REF). Trust 만료·compromise 감지 시 Step-up 요구(§31) 또는 Commit 차단, Authentication Drift(§51)에서 Device Trust Revoked/Changed를 탐지.

## 2. 기존 구현 대조

- **부재** — GROUND_TRUTH §2: Device/Fingerprint/**Trusted** **ABSENT**(grep 무). trust state·trust expires·compromise status·device AAL 코드 no hits. §35 Device Identity Registry 자체가 부재하므로 그 위 trust 레이어도 연쇄 부재.
- **세션에 device trust 축 없음** — 기존 세션 만료/유휴(`UserAuth.php:965`·`:282-286` 유휴 자동로그아웃)·revocation(logout `:1765`·revoke-others `:4173`)은 **세션 단위**이지 device trust state가 아니다. "trusted device를 기억해 재인증을 생략" 같은 개념 없음.
- **compromise 감지·drift 부재** — Device Trust Revoked/Changed(§51), new device Step-up(§31) 트리거가 전무. `Alerting::executeAction`(`Alerting.php:601-665`)은 device 신뢰 상태를 전혀 확인하지 않고 집행.

## 3. 판정

- **Verdict: ABSENT** — Trusted Device Foundation 전무. 선행 §35 Device Identity Registry ABSENT에 종속 연쇄.
- **선행 의존**: §35 Device Identity Registry(ABSENT) → 그 위 trust state/expiry/compromise 전체 부재. §3.3 Decision Binding·§26 Device Binding ABSENT.
- **cover: 0** — device trust 커버 없음. 세션 만료/유휴/revocation(`UserAuth.php:965,282-286,1765,4173`)은 세션 레이어로 KEEP_SEPARATE(device trust 아님).

## 4. 확장·구현 방향 (설계)

- **§35 Device Identity Registry 신설 후 그 위에 Trust Foundation** — `trust state`·`trust expires`·`compromise status`·`device AAL`(DAL0~4)를 신설. §26 Device Binding으로 세션↔device 결합, first/last seen·verified/expires 보존.
- **trust 만료·compromise → Step-up/Commit 차단(Mandatory Control)** — new/untrusted device는 §31 Step-up 트리거, compromise 상태는 Commit 차단(§30·§55). Device Trust Revoked/Changed를 §51 Authentication Drift로 탐지.
- **세션 revocation 패턴 재사용(Golden Rule=Extend)** — 기존 세션 revocation(`UserAuth.php:1765,4173`)을 device trust 철회에 확장하되, device trust는 세션과 별도 수명(trust expires)을 갖도록 분리.
- **fingerprint digest만 사용** — trust 판정도 원문 fingerprint 없이 digest 비교(§26·§5.7).
- **선행 필수**: §35 Device Registry + Decision Binding 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DEVICE_IDENTITY_REGISTRY]] · [[DSAR_APPROVAL_STEP_UP_AUTHENTICATION_FOUNDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
