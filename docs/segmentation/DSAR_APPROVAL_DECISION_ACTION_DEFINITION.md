# DSAR — Approval Decision Action Definition (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§8 ACTION_DEFINITION 필수 필드 (원문 전사):
- `definition_id` · `registry id` · `action code` · `name` · `description` · `category`
- `allowed workflow reference` · `allowed chain reference`
- `allowed stage/level/step types`
- `allowed actor types`
- `allowed source decision states` · `allowed source sequential states`
- `reason policy reference` · `comment policy reference` · `attachment policy reference` · `target policy reference`
- `action effect mapping reference` · `outcome mapping reference`
- `current version` · `owner` · `valid_from` / `valid_to`
- `status` · `evidence`

§8 CATEGORY enum: `POSITIVE` / `NEGATIVE` / `CORRECTIVE` / `ADMINISTRATIVE` / `REQUESTER` / `INFORMATIONAL` / `TEMPORARY` / `NEUTRAL` / `CUSTOM`.

의미: Action Definition은 Registry(§7) 하위에서 개별 액션(APPROVE·REJECT·RETURN…)을 카테고리·허용 워크플로/스테이지/액터/소스상태·정책참조·Effect/Outcome 매핑 참조와 함께 정의한다. Version(§9)·Capability(§11)·Eligibility(§12) 판정의 정의 기준이다.

## 2. 기존 구현 대조

- **개별 액션을 데이터로 정의하는 Definition 등록소 부재** — `definition_id`·`action code`·`category`·`allowed source decision/sequential states`·`allowed actor types`를 선언하는 구조체 전무.
- 유일한 화이트리스트 근거: `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1321`)의 in_array enum(approved/rejected) — 이는 Definition이 아니라 인라인 상태값 검증. `category`·`allowed source states`·정책참조 전무.
- `allowed workflow/chain reference`·`allowed stage/level/step types` → **no hits**(선행 Sequential §3.2 ABSENT · Return Target 선행 부재).
- `allowed actor types` → **no hits**(Actor Type 결정 정의 부재 · 정적 RBAC role만 `index.php:404-420`).
- `action effect mapping reference`·`outcome mapping reference` → **no hits**(§13 Effect Mapping·§14 Outcome 분리 부재 · 직접 status UPDATE).
- `reason/comment/attachment/target policy reference` → **no hits**(Reason 자유텍스트 `ReturnsPortal.php:36,324` · Comment note만 · Attachment=MediaHost MIME만 `MediaHost.php:81-91`).
- CATEGORY 9종 분류 체계 → **no hits**(액션은 status 문자열에 융합, 카테고리 미부여).

## 3. 판정

- Verdict: **ABSENT · BLOCKED_PREREQUISITE**
- 선행 의존: (1) Action Registry(§7) ABSENT — Definition의 소속 컨테이너 부재. (2) §3.2 Sequential ABSENT — `allowed stage/level/step types`·`allowed source sequential states` 참조 불가. (3) §3.4 Authority/Delegation ABSENT(정적 RBAC만) — `allowed actor types` 결정 부재. (4) §13 Effect·§14 Outcome ABSENT — `effect/outcome mapping reference` 참조 대상 부재.
- cover: **0** (액션 정의는 핸들러 상태문자열에 하드코딩 · Definition 데이터 선언 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_definition` — Registry(§7) 신설 이후에만 착수 가능(BLOCKED). CATEGORY 9종·`allowed source decision/sequential states`·`allowed actor types`를 데이터로 선언, 액션을 status 문자열에서 분리.
- 확장 기반: `AdminGrowth::approvalDecide:1321` 화이트리스트를 Definition의 `action code`·`allowed source decision states` 검증 정본으로 승격(Extend). `Alerting::decideAction`(`Alerting.php:594`)의 else 무음 폴백(approve 아니면 전부 rejected)은 미지원 액션을 무음 오분류하므로 Definition 화이트리스트로 대체·**최우선 제거**.
- 선행 축이 부재하는 필드(workflow/stage/actor/effect/outcome reference)는 해당 선행 EPIC 완료 전까지 `nullable`+`status=DRAFT`로 두되, Mandatory Control(`category`·`allowed source decision states`)은 즉시 강제.
- 실위험: Definition 없이 `Catalog::approveQueue`(`Catalog.php:2383`)·`Mapping::apply`(`Mapping.php:327`)가 각기 다른 status로 승인을 확정 = 액션 정의 표준 부재로 REJECT/RETURN 혼용(§58 High) 위험. Definition의 `category`(NEGATIVE vs CORRECTIVE)로 Reject≠Return 경계를 데이터로 못박아야 함.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
