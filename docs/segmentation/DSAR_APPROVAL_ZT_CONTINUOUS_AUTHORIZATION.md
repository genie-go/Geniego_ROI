# DSAR — Zero Trust & Continuous Authorization: 지속 인가 (APPROVAL_CONTINUOUS_AUTHORIZATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_CONTINUOUS_AUTHORIZATION은 SPEC §9(Continuous Authorization)이 정의하는 **재평가 트리거 엔진**이다. 최초 승인 이후에도 다음 이벤트 발생 시 권한을 **다시 계산**한다: API 호출·민감 작업·Role 변경·Session 변경·Risk 변경·Device 변경·Geo 변경·Policy 변경(SPEC §9). "한 번 승인되면 끝"이 아니라 컨텍스트 변화를 감지해 권한을 지속 재평가하는 계층으로, SPEC §0의 "Never Trust, Always Verify"를 인가 전체에 적용한다. ADR §D-6은 이 재평가가 Part 3-12 PDP에 **신뢰신호를 주입**하는 방식으로 결합됨을 규정한다(PDP 재구현 금지).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §9 트리거 | 판정 | 근거(파일:라인) |
|---|---|---|
| 요청별 인가 재계산(기반) | **PARTIAL** | api_key 미들웨어 매 요청 DB 재조회·캐시 없음(`index.php:69-622`·`:506-508`·`:518-520`·`:573-597`·`:608-619`)·`userByToken`(`UserAuth.php:249-286`·`:266-268`)·`requirePlan`(`UserAuth.php:364-374`). **입력=자격증명·plan·team_role·scope로 국한**(GT① §1·GT② §2) |
| Session 변경 재평가 | **PARTIAL(authn 신선도)** | 유휴 자동로그아웃(`UserAuth.php:206-213`·`:288-311`·`:302-305`·`:308-310`)=유일 "지속검증" 성격이나 authn 무효화이지 컨텍스트 재인가 아님(GT① §A) |
| Role/Policy 변경 재평가 | **PARTIAL(선례)** | agency 링크 매요청 `status='approved'` 재확인·철회 즉시 403 fail-closed(`index.php:96-122`)=**Continuous Verification 선례**. 일반화는 ABSENT(ADR §D-3) |
| Risk 변경 재평가 | **ABSENT** | `auth_audit_log.risk`(`UserAuth.php:4165`·`:4172`·`:4174`·`:4190-4191`·`:4193`)=정적 문자열 라벨·SIEM 라우팅만·**인가 결정 미반영**(GT① §E·GT② §2) |
| Device/Geo 변경 재평가 | **ABSENT** | `recordSessionMeta` ip/ua 기록만·authz 미반영(`UserAuth.php:4232-4251`·`:4247`)·`clientIp` 수집만(`UserAuth.php:3443-3463`). 변화 대조 트리거 없음(GT① §A·§C) |
| 민감작업 재평가 게이트 | **PARTIAL(정적)** | `guardTeamWrite`/`requireTeamWrite`(`index.php:72-89`·`UserAuth.php:1134-1167`)=고정 team_role·신뢰/드리프트 무관(GT① §D) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **재평가 트리거 집합**(SPEC §9): `api_call`·`sensitive_op`·`role_change`·`session_change`·`risk_change`·`device_change`·`geo_change`·`policy_change`. 각 트리거는 요청별 게이트(`index.php:69-622`)에 신설·PDP(3-12)로 신뢰신호 주입(ADR §D-3·§D-6).
- **결정 상태**(SPEC §11 Adaptive와 결합): Permit·Deny·Challenge·Read Only·Step-up MFA·Re-authentication·Session Termination.
- **제약**: agency 재검증(`index.php:96-122`)의 fail-closed 패턴을 준수 — 신뢰신호 부재/미확정 시 **차단측**으로 결정. 재평가 입력은 세션 AAL/Trust Score(현행 미저장·신설·ADR §D-2)를 참조.
- **테넌트 격리**: api_key 미들웨어 tenant 주입(`index.php:69-622`)·데이터소스 `user_session`/`auth_audit_log`는 authz 전용(GT② §5). 마케팅 `performance_metrics`/`attribution_*`/`crm_*`와 분리.

## 4. KEEP_SEPARATE (마케팅 trust/risk/anomaly 흡수금지)

- **마케팅 risk/anomaly**: `AnomalyDetection.php`(광고 SPC μ±kσ)·`ModelMonitor.php:11-18`(ML 드리프트)·`Risk.php:31-55`(공급망 fraud)·`CustomerAI.php:10-18`(RFM/churn risk)는 SPEC §9 Risk 변경 트리거 입력 **아님**(GT② §B-2).
- **방어 프리미티브**: rate-limit(`index.php:527-570`)·SSRF 가드(`Alerting.php:786`)는 남용/egress 하드닝이지 재인가 트리거 아님(GT② §B-4).
- authz `risk_change`는 계산된 authz risk(ADR §D-5)에서 파생 — 마케팅 risk 재사용 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 재평가 트리거 엔진 = **PARTIAL/ABSENT**. 요청별 재계산·유휴 로그아웃·agency 재검증은 재활용 substrate이나 컨텍스트(risk/device/threat/geo) 진입점 순신규(GT② §2·ADR §D-3).
- **재활용**: `index.php:69-622`(삽입지점)·`index.php:96-122`(선례)·`UserAuth.php:288-311`(idle). **Extend-only·무후퇴**(ADR §66).
- **선행의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)가 신뢰신호 소비지점(ADR §D-6·선행 계보). 코드 변경 0 · NOT_CERTIFIED.
