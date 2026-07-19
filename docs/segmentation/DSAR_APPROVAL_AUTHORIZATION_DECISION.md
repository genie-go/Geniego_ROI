# DSAR — Authorization Decision (06-A-03-02-03-04 Part 1 · §24)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §24)

`APPROVAL_AUTHORIZATION_DECISION` 필수 필드 (원문 전사):
- `request` · `context` · `evaluation`
- `subject` · `effective actor` · `resource(+version)` · `action`
- `effect` · `result` · `primary reason`
- `reason references` · `obligation references` · `advice references` · `constraint references`
- `challenge reference` · `denial reference` · `exception reference` · `override reference`
- `definition version` · `policy set version` · `engine version`
- `decided at` · `valid from/until` · `commit revalidation required`
- `reusable` · `reuse scope digest` · `decision digest`

의미: Decision은 Request(§21)·Context(§19)·Evaluation(§22)을 결합해 산출된 **불변(Immutable) 인가판정 결과 레코드**다(§5.8 Decision=Immutable Snapshot). subject/effective actor/resource+version/action/effect/result를 고정 결합하고, `reusable`+`reuse scope digest`로 재사용 범위를 봉인하며(§5.11 Context Reuse 제한), `commit revalidation required`로 Commit 직전 재검증을 강제(§5.10). `decision digest`로 무결성·Ledger 결합(§37). ★과거 Decision을 현재 Role/Permission/Policy로 재해석·덮어쓰기 절대 금지(§5.7·§5.8).

## 2. 기존 구현 대조

- **★판정결과 불변저장(Decision 레코드)은 부재(ABSENT)**. 현재 미들웨어(`index.php:553-603`)는 판정 후 401/403을 반환하거나 통과시킬 뿐, subject/resource/version/action/effect를 결합한 **불변 Decision 레코드를 생성·저장하지 않는다**. auth_tenant/auth_role/auth_key attribute attach(`index.php:590-593`)는 요청 처리용 휘발 컨텍스트이지 영속 판정결과가 아니다.
- **`resource(+version)`·`action` 결합 부재**: 현행 판정은 rank/role(`index.php:554`·`TeamPermissions.php:120-136`)과 HTTP 메서드(`index.php:568-578`) 기반이며 특정 resource 인스턴스+version+canonical action에 바인딩된 판정이 없다. IDOR 방어는 tenant 강제주입(`index.php:600`)으로만 이뤄지고 resource-level 판정 결합은 없다.
- **`valid from/until`·`reusable`·`reuse scope digest` 부재**: 판정 유효기간·재사용 범위 봉인 개념이 없다. 매 요청마다 미들웨어가 즉석 재판정하므로 재사용/만료 모델 자체가 없다.
- **`commit revalidation required` 부재**: Validation↔Commit 분리(§5.10)가 없어 Commit 직전 재검증 플래그가 없다. `requireTeamWrite`(`UserAuth.php:1088-1127`)는 요청 시점 1회 검사이지 decision-commit 재검증이 아니다.
- **불변성·audit 결합의 유일 실 substrate(결합 부재)**: `SecurityAudit` 해시체인(`SecurityAudit.php:48-52,27,56-68`·GENESIS `:39`·verify `:56-68`)은 실 append-only 감사트레일이나 이는 단일 이벤트 로그이지 인가 Decision의 불변 결과 레코드가 아니다(KEEP_SEPARATE). Maker-Checker 승인기록(Mapping approve·Alerting decideAction)은 승인 워크플로 상태이지 authorization decision snapshot이 아니다(GROUND_TRUTH §0-3).

## 3. 판정

- Verdict: **ABSENT** (불변 Decision 결과 레코드·resource+version/action 결합·reuse scope digest 순신규).
- cover: **0** — 판정결과 불변저장 전무. `SecurityAudit`(`SecurityAudit.php:48-68`)는 감사트레일 패턴으로 재사용 substrate이나 Decision 레코드 대체 아님(KEEP_SEPARATE).
- 선행 의존: Request(§21)·Context(§19)·Evaluation(§22)·§3.2 Decision Foundation·§3.3 Resource Version 전부 ABSENT → Decision은 이들의 상위 결합체라 연쇄 공회전(BLOCKED_PREREQUISITE).
- ★핵심: "판정결과 불변저장 부재" → 현재는 판정이 매 요청 휘발적 즉시분기라 과거 Decision을 근거로 재현·감사·재사용할 방법이 없음(§5.7·§5.8 무근거).

## 4. 확장/구현 방향 (설계)

- 순신규 `authorization_decision` 불변 레코드 — request/context/evaluation 참조·subject/effective actor/resource(+version)/action/effect/result·reason/obligation/advice/constraint/challenge/denial/exception/override 참조·definition/policy set/engine version·valid from/until·commit revalidation required·reusable·reuse scope digest·decision digest. **INSERT-only·UPDATE/DELETE 금지**(§61 Immutable Update 방지·수정 API 금지 §60).
- Golden Rule=Extend: `SecurityAudit` append-only 해시체인+verify(`SecurityAudit.php:48-68,27,56-68`)를 Decision 불변저장·무결성 검증의 CANONICAL 패턴으로 재사용(단 registry는 그 상위에서 다수 ledger 표준화·KEEP_SEPARATE). `decision digest`=§37 Digest(SHA-256 `SecurityAudit.php:27`) 결합.
- **Reuse 봉인**: `reuse scope digest`에 tenant/effective actor/session/resource+version/action/slot/policy version/environment를 결합(§5.11·§40 Validity) → 하나라도 다르면 재사용 무효. Cross-Tenant 재사용은 tenant 강제주입(`index.php:600`) idiom을 digest 수준으로 승격해 차단(§5.12).
- **Commit Revalidation**: `commit revalidation required=true`인 Decision은 §39 Commit Binding에서 동일 tenant/actor/session/resource version/policy version 재검증 통과 후에만 Commit. 현행 요청 1회 검사(`UserAuth.php:1088-1127`)를 Validation↔Commit 2단계로 확장(실 배선은 후속).
- **불변성 실위험 대비**: `media_gc_cron.php:35,43`이 append-only 감사로그를 물리 DELETE하는 패턴(GROUND_TRUTH 부수발견)을 Decision 레코드에 적용 금지 — Decision은 `delete prevention required`+Retention/Legal Hold로 보호.

관련: [[DSAR_APPROVAL_AUTHORIZATION_REQUEST]] · [[DSAR_APPROVAL_AUTHORIZATION_EVALUATION]] · [[DSAR_APPROVAL_AUTHORIZATION_EFFECT]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_RESULT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
