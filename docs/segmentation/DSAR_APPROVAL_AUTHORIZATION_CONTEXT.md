# DSAR — Authorization Context (06-A-03-02-03-04 · §19)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §19 CONTEXT · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§19 CONTEXT — 필수 필드 (원문 전사):
- `domain` · `definition (+version)` · `policy set`
- `subject reference` / `resource reference` / `action reference` / `environment reference`
- `decision command` / `instance` / `slot`
- `approval case (+version)` · `work item`
- `assignment` · `authority/delegation resolution`
- `sequential step`
- `amount` · `currency`
- `context schema version`
- `created` / `expires`
- `immutable digest`

의미: Context는 4대 Contract(Subject §15·Resource §16·Action §17·Environment §18)를 **하나의 판정 단위로 결합**하고, 여기에 decision command/slot/approval case/assignment/authority-delegation resolution/sequential step/amount를 묶어 인가 평가(§22)의 유일 입력을 만든다. §5.11(Context Reuse 제한 — 구성요소 하나라도 다르면 재사용 금지)의 실체. context schema version으로 계약 진화를 버전화하고 immutable digest로 봉인한다.

## 2. 기존 구현 대조

- **Authorization Context 결합체 부재(순신규)**:
  - 4대 Contract를 하나의 불변 판정 단위로 결합하고 `context schema version`·`immutable digest`로 봉인하는 구조체 → **no hits**. 현재 인가는 요청마다 roleOf+plan+tenant(subject)·`WHERE tenant_id`(resource)·HTTP 메서드(action)를 미들웨어에서 즉석 조합할 뿐, 결합된 Context 객체·digest·schema version 없음.
- **파편적 substrate(결합 안 된 조각들)**:
  - subject reference: `TeamPermissions.php:120-136`(roleOf)+`index.php:600`(tenant) — §19 `subject reference`의 조각.
  - resource reference: `TeamPermissions.php:236-322` data_scope 행필터 — resource scope 조각(version 없음).
  - action reference: `index.php:568-578`(write 게이트)·`TeamPermissions.php:39`(acl 8동작) — action 조각(canonical code 아님).
  - assignment/authority: Maker-Checker approve(`:238-292`)·decideAction(`:598-658`)·위임 상한(`TeamPermissions.php:615-647` DELEGATION_EXCEEDED) — `assignment`·`authority/delegation resolution`의 substrate이나 Context에 결합되지 않고 도메인별 산재.
  - amount/currency: 인가 Context 결합 → no hits(도메인 게이트만).
- **decision command / slot / approval case (+version) / sequential step**:
  - §3.2 Decision Foundation(Decision Command/Slot/Case)·§3.3 Sequential Approval State에 종속 — 대부분 부재(GROUND_TRUTH §0.7·선행 Decision/Governance Foundation 부재). Context가 결합할 상위 대상 자체가 없음.
- **immutable digest / context schema version**:
  - 인가 Context digest·schema version → no hits. (참고: 실 append-only 해시체인은 `SecurityAudit`가 유일하나 감사트레일이지 Context digest 아님 — 인용은 Decision Integrity DSAR 소관.)

## 3. 판정

- Verdict: **ABSENT (순신규)** — 4대 Contract를 결합하는 Authorization Context·context schema version·immutable digest는 전무. subject/resource/action/assignment 조각은 산재하나 결합·봉인되지 않음.
- cover: **0** (결합 Context 구조체 부재. 개별 조각은 각 Contract DSAR에서 substrate로 계상).
- 선행 의존: `decision command/slot`·`approval case (+version)`·`sequential step`은 §3.2 Decision Foundation·§3.3 Governance(Sequential Approval State)에 연쇄 종속 — 다수 부재로 Context 상위 결합 공회전.
- ★Context Reuse 제한(§5.11)의 실 기반 없음 — 결합 Context·digest 부재 → 구성요소 변경 시 재사용 차단 불가.

## 4. 확장/구현 방향 (설계)

- Authorization Context 순신규 — Subject(§15)/Resource(§16)/Action(§17)/Environment(§18) reference를 결합하고 decision command/slot/approval case(+version)/assignment/authority-delegation resolution/sequential step/amount/currency를 묶어 단일 판정 입력 생성. `context schema version`으로 계약 진화 버전화·`immutable digest`(앞 블록 §37 Digest·Hash Chain 정책)로 봉인.
- Golden Rule=Extend:
  - subject/resource/action/assignment 조각(roleOf `TeamPermissions.php:120-136`·data_scope `:236-322`·acl `:39`·위임상한 `:615-647`·Maker-Checker `:238-292`·`:598-658`)을 각 Contract 어댑터로 흡수해 Context가 참조 — 재구현 금지, 결합만 신설.
  - `index.php:600` tenant 강제주입 = Context의 tenant 격리 기준(§5.12 Cross-tenant Context 재사용 차단)로 승격.
- §5.11 봉인: Context digest에 Tenant/Subject/Resource/Version/Action/Slot/Case Version/Amount/Currency/Policy Version/Session/Environment를 포함해, 하나라도 다르면 digest 불일치→재사용 차단.
- 선행 결합: decision command/slot/approval case/sequential step은 §3.2/§3.3 신설 후 결합 — 미완 시 Gap 기록·Interface/Adapter로 연결(§3 선행조건).
- 실 Context 결합·digest·schema version 배선 = 선행 Foundation 신설 후 별도 승인세션(이번 Part=계약 명세·코드 0).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT_SNAPSHOT]] · [[DSAR_APPROVAL_AUTHORIZATION_SUBJECT_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_RESOURCE_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_ACTION_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_ENVIRONMENT_CONTRACT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
