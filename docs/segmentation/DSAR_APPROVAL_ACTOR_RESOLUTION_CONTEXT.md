# DSAR — Actor Resolution Context (06-A-03-02-03-03 · §16)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§16 RESOLUTION_CONTEXT 필수 필드 (원문 전사):

- `resolution context id` · `tenant`
- `decision command id` · `decision instance id` · `decision slot id`
- `authenticated principal`
- `claimed actor subject` · `effective actor subject` · `original actor subject`
- `delegated actor ref` · `impersonation session ref`
- `auth session` · `provider` · `client` · `device` · `channel` · `network ref`
- `request time` · `effective time`

의미: Resolution Context는 "이 Decision을 누가·어떤 세션/디바이스/채널로 제출했는가"의 **입력 스냅샷**이다. §17 Resolution Pipeline이 소비하는 원자재이며, 특히 §5.1(Principal ≠ Actor)의 4주체 — authenticated principal(인증된 주체)·claimed actor(주장된 수행자)·effective actor(실 수행자)·original actor(위임/대행 이전 원 주체)를 **동시 보존**한다. Email 단독이 아니라 Decision Slot·Session·Client·Device를 하나의 해석 컨텍스트로 묶는다.

## 2. 기존 구현 대조

- **Resolution Context를 구조체로 구성하는 계층은 부재** — 현재 actor 해석은 단일 함수 `Mapping::actorId`(`Mapping.php:36-53`)가 요청 시점에 즉석 반환하는 방식으로, 컨텍스트를 저장·전달하는 객체가 없다.
- **authenticated principal substrate는 실재(부분)** — `actorId`는 서버 인증 context에서만 principal을 도출(api_key→`apikey:{id}`·세션→`user:{email}`·미확인 null)하며 클라이언트 입력을 미신뢰(GROUND_TRUTH §1). auth session·provider·client 판별은 미들웨어 신원주입(`index.php:417,437,441`)과 세션 검증(`UserAuth.php:229-318`)에 실재한다.
- **claimed/effective/original actor 3분리 부재** — `actorId`는 단일 문자열만 반환(GROUND_TRUTH §1 "문자열만"). claimed(클라 주장)와 effective(서버 확정)의 구별, original(위임 전) 보존 개념이 없다.
- **impersonation session ref 존재하나 컨텍스트 미결합** — Member impersonation(`UserAdmin.php:472-534`)이 대상 사용자 실 세션(`imp_` 2h)을 발급하지만 **Original Principal 미보존**(GROUND_TRUTH §1·§3-6)이라, 대행 승인이 본인 승인과 컨텍스트 상 구별 불가.
- **delegated actor ref 부재** — Assignment/Authority/Delegation Foundation 자체가 ABSENT(`Onsite.php:86`의 onsite_assignment은 A/B테스트일 뿐).
- **decision command/instance/slot id 부재** — 결합 대상인 불변 Decision Record/Snapshot이 없다(GROUND_TRUTH §4 BLOCKED_PREREQUISITE). 승인 substrate는 `mapping_change_request`(`Db.php:623-634`)·`action_request` 2테이블뿐.
- **X-Act-As-Tenant는 effective tenant만 치환** — `UserAuth.php:398`은 admin+`platform_growth` 단일값만 허용하고 actor는 admin 유지하나, Original/Effective tenant 반환값을 컨텍스트로 보존하지 않는다.

## 3. 판정

- Verdict: **PARTIAL** (authenticated principal·auth session·provider/client 판별 substrate 실재 · claimed/effective/original 3분리·delegated/impersonation ref 결합·decision slot 결합 부재).
- cover: **부분** (principal 해석 = `Mapping.php:36-53` 재사용 · 4주체 컨텍스트 구조체 = 순신규).
- 선행 의존: Resolution Context는 §3.3 Decision Foundation의 command/instance/slot id를 입력으로 요구 — 선행 부재로 결합부 BLOCKED_PREREQUISITE. principal/session substrate 실재로 실 엔진은 "기존 actorId·세션검증을 4주체 컨텍스트로 래핑".

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_actor_resolution_context` 구조체 — §16 20필드를 요청 단위로 구성. Golden Rule=Extend: authenticated principal은 `Mapping::actorId`(`Mapping.php:36-53`) 결과를 그대로 채택(재구현 금지)하고, auth session/provider/client는 미들웨어 주입값(`index.php:417,437,441`)·세션 검증(`UserAuth.php:229-318`)을 참조.
- **4주체 명시 분리**(§5.1): claimed actor(요청이 주장, 미신뢰)·effective actor(서버 확정 = actorId)·original actor(위임/대행 전)·authenticated principal(로그인 주체). 위임·대행 부재 시 셋을 동일값으로 채우되 필드는 항상 보존.
- impersonation session ref 결합: `UserAdmin.php:472-534` impersonation 발급 시 Original Principal을 컨텍스트에 기록하도록 확장(현재 미보존 결함 해소). Effective=대상 subject, Original=admin으로 이중 보존.
- decision slot 결합: §3.3 Decision Command Envelope 신설 후 그 command/instance/slot id를 컨텍스트에 바인딩 — 그전까지는 BLOCKED_PREREQUISITE 상태로 설계만 확정.
- network ref는 §5.7 준수(원문 미저장·Reference/Digest만).

관련: [[DSAR_APPROVAL_ACTOR_RESOLUTION_RESULT]] · [[DSAR_APPROVAL_ACTOR_RESOLUTION_PIPELINE]] · [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_CONTEXT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
