# DSAR — Zero Trust & Continuous Authorization: 신원 신뢰 엔진 (Identity Trust Engine)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

Identity Trust Engine(SPEC §3)은 사용자 신원의 신뢰도를 산출하는 엔진이다. 평가 요소:

- **Identity Verification** — 신원 확인 여부
- **Employment Status** — 재직 상태
- **Role Criticality** — 역할 중요도
- **Historical Behavior** — 이력 행위
- **Previous Incidents** — 과거 사고 이력
- **Privilege Level** — 권한 수준
- **Authentication Strength** — 인증 강도

출력은 Trust Profile 4등급(Trusted/Conditional/Restricted/Untrusted·별도 DSAR `DSAR_APPROVAL_ZT_TRUST_PROFILE.md`). 본 엔진은 SPEC §14 Trust Score와 §15 Authorization Confidence의 Identity 축 입력을 담당한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §3 요소 | 판정 | 근거(GT) |
|---|---|---|
| Identity Trust Engine(전용) | **ABSENT(grep 0)** | GT② §2 "Identity Trust Engine ABSENT. 신뢰=암묵(로그인 통과=신뢰)" |
| Identity Verification | **PARTIAL** | `userByToken`(`UserAuth.php:249-286`·`:266-268`·`expires_at>now AND is_active=1`) 매요청 토큰·세션·활성 재검증 |
| Authentication Strength | **PARTIAL** | 로그인 MFA·OTP(`UserAuth.php:929-980`·`:941`·`:957`)·TOTP(`:3566-3592`·`:955-964`·AES-256-GCM `:3863-3925`)·복구코드(`:3600-3634`)·테넌트 MFA 정책(`:3745-3767`) |
| Role Criticality / Privilege Level | **PARTIAL** | RBAC rank/scope(`index.php:573-597`·`:608-619`)·`requirePlan`(`UserAuth.php:364-374`)·guardTeamWrite(`UserAuth.php:1134-1167`) — 정적 권한(중요도 등급화 아님) |
| Historical Behavior / Previous Incidents | **ABSENT** | 인가에 피드되는 행위/사고 이력 엔진 부재(GT② §2 Behavior UEBA authz ABSENT). `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·SIEM 라우팅(`:4193`)만·인가 미반영 |
| Employment Status | **ABSENT** | 재직 상태를 신뢰 입력으로 쓰는 경로 부재(GT①/② 미등장) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **입력 7요소**: SPEC §3. 재활용 승격(ADR D-2·D-5) — Authentication Strength←TOTP/OTP/복구코드(`UserAuth.php:929-980`·`:3566-3634`), Identity Verification←`userByToken`(`:249-286`), Historical Behavior/Previous Incidents←정적 `risk` 라벨(`:4165`)을 **계산된 risk로 승격**해 인가 결정에 결합.
- **출력**: Trust Profile 4등급(SPEC §3). Trust Score(§14) Identity 축·Confidence(§15) Identity 성분으로 전달.
- **불변·버전**: SPEC §33 `Immutable Trust Snapshot`·`Trust Version`. 산출 증거는 `SecurityAudit.php:12-68` 해시체인 재활용(ADR D-5).
- **테넌트 격리**: SPEC §33 — 요청 tenant(`index.php:69-622` 주입) 경계 내 평가.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

Identity Trust는 **authz 신원 신뢰**다. Historical Behavior/Previous Incidents/Role Criticality 산출 시 마케팅 ML 신호 흡수 금지(GT② §4): `CustomerAI.php:10-18`(RFM/churn/LTV risk 0~100)·`Risk.php:31-55`(공급망/셀러 fraud 로지스틱회귀)·`GraphScore.php:12-18`(influencer→sku→order 그래프)·`AnomalyDetection.php`(광고지표 SPC)·`ModelMonitor.php:11-18`(ML 드리프트)는 커머스/광고 도메인이며 인가 행위분석이 아니다. 마케팅 trust(`Mmm.php:749`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`)도 identity trust 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Identity Trust Engine = **ABSENT(순신규)**. PARTIAL 재활용 = `userByToken`(Identity Verification)·MFA/TOTP(Authentication Strength)·RBAC rank/scope(Privilege Level). Employment Status·Historical Behavior·Previous Incidents는 authz 입력으로 완전 부재이며, 정적 `risk` 라벨을 계산된 risk로 승격하는 신설이 필요(ADR D-5).
- **선행 의존**: Part 1~3-12 인증 후 실 구현(ADR §4 BLOCKED_PREREQUISITE). 출력 Trust Profile·하류 Trust Score/Confidence와 결합.
- **무후퇴**: 세션·MFA·RBAC·SecurityAudit 유지·병행(Extend-only). 코드 변경 0 · NOT_CERTIFIED.
