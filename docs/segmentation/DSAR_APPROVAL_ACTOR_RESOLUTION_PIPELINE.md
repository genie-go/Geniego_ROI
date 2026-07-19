# DSAR — Actor Resolution Pipeline (06-A-03-02-03-03 · §17)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§17 Resolution Pipeline (24단계, 원문 전사):

① Authentication Context 존재 → ② Provider 검증 → ③ Principal ID 추출 → ④ Provider Subject → ⑤ Principal Registry 조회 → ⑥ Canonical Subject Binding → ⑦ Tenant 일치 → ⑧ Account 상태 → ⑨ Subject 상태 → ⑩ Actor Type → ⑪ Employment → ⑫ Tenant/Legal Entity/Organization Membership → ⑬ Role → ⑭ Position → ⑮ Delegation → ⑯ Impersonation → ⑰ Original Principal 결정 → ⑱ Effective Actor 결정 → ⑲ On-behalf-of Chain → ⑳ Identity AAL 계산 → ㉑ Authentication AAL 계산 → ㉒ (추가 검증) → ㉓ (추가 검증) → ㉔ Result 생성.

의미: Pipeline은 Resolution Context(§16)를 입력받아 24단계를 순차 통과시키며 각 단계에서 신원·인증 축을 검증·확정하고 최종 Resolution Result(§18)를 산출하는 **결정론적 해석 파이프라인**이다. §5.1(Principal↔Actor 분리)·§5.4(Commit 시 재검증)의 실행 엔진이다.

## 2. 기존 구현 대조

- **24단계 파이프라인은 부재** — 현재 해석은 `Mapping::actorId`(`Mapping.php:36-53`) 단일 함수가 3분기(api_key→`apikey:{id}`·세션→`user:{email}`·미확인 null)로 즉석 반환할 뿐, 순차 단계·중간 검증·결과 산출 구조가 없다.
- **부분 실재 단계(대략 ①④⑤⑥⑦⑧⑱)**:
  - ① Authentication Context 존재: 미들웨어 신원주입(`index.php:417,437,441`)·세션 검증(`UserAuth.php:229-318`)이 인증 컨텍스트 유무를 판별.
  - ④⑤ Principal/Provider Subject: `actorId`가 api_key id 또는 세션 email을 principal로 도출(`Mapping.php:36-53`). 단 Principal Registry(§13) 테이블은 부재 — app_user 단일 조회(`UserAuth.php:229-264`·`Db.php:942`).
  - ⑥ Canonical Subject Binding: email 문자열을 그대로 subject로 사용 — **Binding 계층 부재**(§5.2 Email 단독 식별 금지 위반 소지).
  - ⑦ Tenant 일치: 미들웨어가 api_key 행 tenant를 위조불가 주입(`index.php:417,437`)·RBAC에서 X-Tenant-Id 강제(`index.php:568-578`).
  - ⑧ Account 상태: `is_active=1`만 검사(`UserAuth.php:248,260`) — locked/disabled 세분 부재(PARTIAL).
  - ⑱ Effective Actor: actorId 반환값이 사실상 effective actor.
- **부재 단계(⑨⑩⑪⑫⑬⑭⑮⑯⑰⑲⑳㉑)**:
  - ⑩ Actor Type: HUMAN/SERVICE/SYSTEM 구분 없음.
  - ⑪ Employment·⑭ Position: 개념 자체 ABSENT(team_role만, `TeamPermissions.php:120-136`).
  - ⑫ Membership·⑬ Role: RBAC rank(`index.php:554`)·team_role은 실재하나 "파이프라인 단계"로 조립되지 않음.
  - ⑮ Delegation·⑯ Impersonation·⑰ Original Principal·⑲ On-behalf-of: Delegation Foundation ABSENT(`Onsite.php:86`은 A/B테스트)·impersonation은 Original Principal 미보존(`UserAdmin.php:472-534`).
  - ⑳㉑ AAL 계산: §12 Assurance Level 미산출.

## 3. 판정

- Verdict: **PARTIAL** — actorId가 일부 단계(인증context→principal→canonical(email)→effective actor)를 실재로 커버하나 employment/membership/role/position/delegation/impersonation/AAL 해석은 부재.
- cover: **부분** (약 7/24 단계 substrate 실재·17단계 순신규. 실재분도 "함수 분기"이지 "파이프라인 단계"로 조립돼 있지 않음).
- 선행 의존: ⑤ Principal Registry(§13)·⑥ Canonical Subject Binding(§14)·⑪ Employment·⑭ Position(§3.1)·⑮⑯ Delegation/Impersonation(§3.4)·⑳㉑ AAL(§12) 전부 선행 부재 → 해당 단계 BLOCKED_PREREQUISITE.

## 4. 확장/구현 방향 (설계)

- 순신규 `ActorResolutionPipeline` 결정론 엔진 — §16 Context 입력, 24단계 순차 통과, §18 Result 출력. Golden Rule=Extend: ④⑤⑱ 단계는 `Mapping::actorId`(`Mapping.php:36-53`)를 그대로 호출(재구현 금지)하고, ⑦은 미들웨어 tenant 주입(`index.php:417,437`), ⑧은 `is_active`(`UserAuth.php:248,260`)를 감싸 확장.
- Canonical Subject Binding(⑥) 신설로 §5.2 준수 — email 직접 사용을 폐기하고 principal→canonical subject 매핑 계층 삽입. Legacy email-only actor는 Mapping Confidence·Candidate·Manual Review 저장(§84).
- Employment/Membership/Role/Position(⑪~⑭) 단계는 §3.1 Canonical Identity Foundation 신설 후 채움 — 그전까지 각 단계는 PASS_THROUGH + WARNING(무회귀 시작점).
- Original Principal/Effective Actor 이중 결정(⑰⑱): impersonation(`UserAdmin.php:472-534`)·X-Act-As-Tenant(`UserAuth.php:398`) 경로에서 두 값을 분리 산출·보존.
- 결정론·멱등 보장: 동일 Context 입력→동일 Result(§72 Property Test 대상). AAL 계산(⑳㉑)은 §12 Level 모델 산출기와 연결.

관련: [[DSAR_APPROVAL_ACTOR_RESOLUTION_CONTEXT]] · [[DSAR_APPROVAL_ACTOR_RESOLUTION_RESULT]] · [[DSAR_APPROVAL_AUTHENTICATION_ASSURANCE_LEVEL]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
