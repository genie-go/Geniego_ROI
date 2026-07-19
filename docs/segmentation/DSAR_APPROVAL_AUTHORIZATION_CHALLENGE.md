# DSAR — Authorization Challenge (06-A-03-02-03-04 Part 1 · §31)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§31 CHALLENGE — 원문 전사:
- 유형(10종): `REAUTHENTICATION` / `STEP_UP` / `MFA` / `ADDITIONAL_CONTEXT` / `ADDITIONAL_EVIDENCE` / `MANAGER_CONFIRMATION` / `SECURITY` / `COMPLIANCE` / `MANUAL_REVIEW` / `CUSTOM`.
- 필드: `type` · `reason` · `required assurance` / `required context` · `scope` · `issued` / `expires` / `completed` · `result` · `attempt count`.
- **완료 후 반드시 재평가.**

의미: Challenge는 Authorization 결정이 즉시 PERMIT/DENY로 확정되지 않고, **추가 확인(재인증·스텝업·MFA·추가 컨텍스트/증빙·관리자 확인·보안/컴플라이언스/수동검토)을 요구하는 보류 상태**다(§23 Effect=CHALLENGE·§25 Result=CHALLENGE_REQUIRED/STEP_UP_REQUIRED). 핵심 불변식은 **"완료 후 반드시 재평가"** — Challenge를 통과했다고 자동 Permit이 아니라, 통과 결과를 새 입력으로 삼아 전체 Authorization 파이프라인(§42)을 다시 돌려 최종 Effect를 산출한다. Challenge는 `required assurance`(AAL 등)·`scope`·`expires`·`attempt count`를 가지며 §39 Commit Binding의 `Challenge 완료` 게이트와 결합한다.

## 2. 기존 구현 대조

- **Authorization 결정에 결합된 Challenge 층은 부재** — "권한판정 결과 추가확인 필요→보류→확인 후 재평가"를 인가 파이프라인에 결합한 구조가 없다.
- ★substrate: 03-03(Actor Identity Assurance & Authentication Binding)에서 확인된 **MFA/step-up 스택**이 challenge 요소의 원시재료다. 단 이는 **로그인·세션 수준 인증 강화**이지 특정 Authorization Decision에 부착되어 "이 Action에 대해 step-up 요구→완료 후 재평가"로 동작하는 **authorization challenge와의 결합은 부재**. (해당 MFA 스택 file:line은 본 블록 GROUND_TRUTH allowlist 밖이므로 인용 생략 — 개념 substrate로만 등재.)
  - GROUND_TRUTH 내 인접 자산: 중앙 RBAC(`index.php:553-603`)는 통과/차단 이진이며 "추가확인 후 재평가" 중간상태가 없다. requireAdminUser 재검증(`UserAuth.php:2920`)·admin 세션 재검증(`UserAdmin.php:33-62`)은 재검증이되, MFA-challenge와 결합된 authorization 재평가 루프가 아니다.
  - Maker-Checker(승인권한 substrate) — Mapping approve(`UserAdmin.php` 계열은 아님)·Alerting decideAction 정족수2는 `MANAGER_CONFIRMATION`/`MANUAL_REVIEW` challenge와 발상은 유사하나(다인 확인), 이는 별도 승인 워크플로이지 인가 challenge-재평가 루프가 아니다.
- §5.1(Authentication ≠ Authorization): 현재 시스템은 인증(로그인/MFA)과 인가(RBAC)를 분리하되, **인가결정이 인증강화를 되요구하는 역방향 challenge 루프**가 없다. MFA는 진입 게이트일 뿐 결정단위 step-up이 아니다.
- `required assurance`(AAL)·`challenge scope`·`issued/expires/completed`·`attempt count`·`완료 후 재평가` → **no hits**(authorization 결합 기준).

## 3. 판정

- Verdict: **ABSENT (authorization challenge 결합 부재) · substrate 존재(03-03 MFA)**
- substrate 태그: 03-03 MFA/step-up 인증스택 = **CANDIDATE(재인증·MFA 원시재료)**. 단 authorization 결정 결합·완료 후 재평가 루프 전무이므로 challenge 엔티티로 직접 대체 불가.
- 선행 의존: Challenge는 03-03 Actor Identity/Authentication Foundation(§3.1 Identity/Authentication Snapshot·AAL)·상위 Decision(§24)에 종속 — 03-03 substrate 실재하나 결합층 부재로 BLOCKED_PREREQUISITE.
- cover: **부분(MFA/step-up 인증 substrate 실재, 결정결합 challenge+재평가 0)**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_challenge` — Authorization Decision이 산출한 보류상태. 필드: `challenge_id`·`decision_id`(또는 evaluation_id)·`challenge_type`(10종)·`reason`·`required_assurance`(AAL·03-03 Authentication Snapshot 참조)·`required_context`·`scope`·`issued_at`·`expires_at`·`completed_at`·`result`·`attempt_count`.
- **완료 후 재평가 불변식**(§31·§42): Challenge 통과 결과는 자동 Permit이 아니라 Authorization 파이프라인 재실행 입력. 통과→새 Evaluation(§22)→새 Decision(§24)로 산출하고 이전 결정과 연결(§47 Revalidation "기존 Decision 수정 안 함·새 Decision 생성 후 연결"과 정합). Challenge 미완료·만료·attempt 초과 시 Default Deny(§45).
- Golden Rule=Extend: 03-03 MFA/step-up 스택을 `REAUTHENTICATION`/`STEP_UP`/`MFA` challenge의 **인증 집행 엔진 substrate로 재사용**하되, 결정단위 scope·expires·attempt를 부여하는 authorization challenge 층을 그 위에 신설(진입 MFA와 KEEP_SEPARATE). `required assurance`는 03-03 Authentication AAL과 결합.
- `RECOMMEND_STEP_UP` Advice(§28·권고, 미이행 Permit 유효)와 STEP_UP Challenge(§31·완료 전 Permit 미확정) 명확 분리 — Policy(§10)의 `challenge policy`/`advice policy`에서 라우팅 정책버전화. 고위험 Action은 challenge(강제), 저위험은 advice(권고).
- `MANAGER_CONFIRMATION`/`MANUAL_REVIEW` challenge는 기존 Maker-Checker(Alerting 정족수2 등) substrate와 의미정합하되, 인가 challenge-재평가 루프로 표준화(중복 승인모델 신설 금지·§59). 실 배선/MFA 결합은 후속 enforcement Part.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DENIAL]] · [[DSAR_APPROVAL_AUTHORIZATION_ADVICE]] · [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
