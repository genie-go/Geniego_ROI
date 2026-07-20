# DSAR — Zero Trust & Continuous Authorization: 신뢰 재검증 (APPROVAL_TRUST_REVALIDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_TRUST_REVALIDATION은 특정 컨텍스트 변화 이벤트가 감지되면 **기존 신뢰 평가를 즉시 무효화하고 재평가를 강제**하는 엔티티다(SPEC §25). Continuous Authorization(§9)의 능동 트리거로, "한 번 승인=끝"을 차단한다.

| Revalidation Trigger (SPEC §25) | 의미 |
|---|---|
| Device 변경 | Device Trust(§4) 재평가 강제 |
| Threat 변경 | Threat Intelligence(§8) 갱신 시 재평가 |
| Session 변경 | Session Trust(§6·hijack/concurrent) 재평가 |
| Authentication 변경 | AAL/MFA 상태(§10 Continuous Verification) 재평가 |

Revalidation 결과는 SPEC §11 Adaptive Authorization으로 흘러 Challenge/Step-up(§12)/Re-authentication(§13)/Session Termination을 유발할 수 있다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | Ground-Truth 근거 |
|---|---|---|
| 컨텍스트 변화 재평가 트리거 | **ABSENT** | mid-session risk/device/threat 재평가 트리거 grep 0(GT② §2·GT① §1) |
| Continuous Verification 선례 | **PARTIAL(재활용)** | agency 링크 매요청 `approved` 재확인·fail-closed(`index.php:96-122`) = 철회 즉시 403·재검증 선례(ADR D-3) |
| 요청별 재계산(authn 신선도) | **PARTIAL** | `userByToken`(`UserAuth.php:249-286`)·`requirePlan`(`UserAuth.php:364-374`)·api_key 미들웨어(`index.php:69-622`)는 매 요청 재조회이나 입력=자격증명·plan·role·scope뿐(GT① §1·컨텍스트 미반영) |
| 유휴 재검증 | **PARTIAL** | 자동로그아웃(`UserAuth.php:288-311`)은 idle 단일 조건·authn 신선도(ADR §2.1) |
| Authentication 변경 재검증 | **PARTIAL(로그인 국한)** | MFA/OTP는 로그인 1회(`UserAuth.php:929-980`)·mid-session 재인증 부재(GT② §2). AAL 세션 저장 미구현(ADR D-2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **키/격리**: `tenant_id`(SPEC §33 Tenant Isolation)·`session_id`(→`user_session`)·`trigger_type`(device/threat/session/authentication·SPEC §25).
- **트리거 필드**: `triggered_at`·`prior_snapshot_id`(→APPROVAL_TRUST_SNAPSHOT·SPEC §20)·`revalidation_result`(→Adaptive 결정 §11).
- **상태**: `TRIGGERED` → `EVALUATING` → `RESOLVED`(permit/challenge/step-up/reauth/terminate·SPEC §11·§17). Unknown/미완료는 fail-closed(agency 선례 준수·`index.php:96-122`).
- **결합 지점**: 재검증 트리거는 요청별 게이트(`index.php:69-622`)에 신설·PDP(Part 3-12)에 신뢰신호 주입(ADR D-3·D-6·무중복). agency 재검증(`index.php:96-122`)의 일반화이지 재구현 아님.
- **증거**: 재검증 이벤트·결과는 SecurityAudit 해시체인(`SecurityAudit.php:12-68`)에 append-only 기록(ADR D-5).

## 4. KEEP_SEPARATE (마케팅 흡수금지)

★Revalidation은 순신규 authz 개념이나, 인접 신호가 마케팅 도메인과 명명 충돌하지 않도록 경계한다(GT② §4).

| 경계 대상 | 근거 | 분리 사유 |
|---|---|---|
| ML 재학습(retrain) | `ModelMonitor.php:11-18`(GT② §4 B-2) | 모델 재학습이지 세션 신뢰 재평가 아님 |
| 정적 risk 감사 라벨 | `UserAuth.php:4165`(GT① §E) | SIEM 라우팅용 정적 라벨(`:4193`)·인가 재평가 트리거 아님 → 계산 risk로 승격 후에야 입력(ADR D-5) |
| device-sig(광고 식별) | `Attribution.php:144-150`(GT② §4 B-3) | 광고 cross-device 식별이지 Device 변경 재검증 신호 아님 |

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: 컨텍스트 변화 기반 authz 재검증 트리거는 grep 0(GT②)·순신규.
- **선행 의존(BLOCKED_PREREQUISITE)**: Device/Session/Threat Trust 신호(§4·§6·§8)와 AAL 세션 저장(ADR D-2)이 선행되어야 트리거 판별 성립. Part 1~3-12 인증 후 실 구현.
- **재활용(Extend)**: agency 재검증(`index.php:96-122`)을 Continuous Verification 일반화 선례로·요청별 게이트에 트리거 삽입·SecurityAudit 증거 재활용(ADR D-3·D-5). 대체 아님·무후퇴.
