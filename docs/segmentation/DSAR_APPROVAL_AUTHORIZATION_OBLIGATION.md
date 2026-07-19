# DSAR — Authorization Obligation (06-A-03-02-03-04 Part 1 · §27)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §27)

`APPROVAL_AUTHORIZATION_OBLIGATION` (Permit 후 강제되는 후속 의무) type enum (16종·원문 전사):
`AUDIT` / `SNAPSHOT` / `EVIDENCE_REQUIRED` / `MASK` / `LIMIT_FIELDS` / `REQUIRE_REASON` / `ATTACHMENT` / `REAUTHENTICATION` / `SECOND_REVIEW` / `NOTIFICATION` / `WATERMARK` / `READ_ONLY` / `EXPORT_LOG` / `RETENTION` / `LEGAL_HOLD` / `CUSTOM`.

필드 (원문 전사): `type` · `parameters` · `mandatory` · `execution phase/deadline` · `fulfillment status` · `failure behavior`.

원문 규율(전사): **Mandatory Obligation 미충족 시 Commit 금지.** Obligation은 Permit에 부수해 반드시 이행돼야 하는 의무(감사·마스킹·2차검토·재인증 등)이며, Advice(§28 권고·불이행 가능)와 구분된다.

의미: Obligation은 "허용하되 ~를 반드시 수행하라"는 조건부 허용(CONDITIONAL_PERMIT §23)의 이행 계약이다. mandatory=true 의무가 미충족이면 Commit Binding(§39)에서 커밋을 차단해, 허용이 의무 이행 없이 완결되는 것을 방지한다.

## 2. 기존 구현 대조

- **선언적 Obligation 모델은 부재(ABSENT)**. "허용에 부수해 강제되는 후속 의무"를 type·mandatory·fulfillment status·failure behavior로 구조화한 구조체가 없다. 현행 허용은 미들웨어 통과(`index.php:590-593`) 후 별도 의무 이행 계약 없이 완결된다.
- **★가장 근접한 유사 substrate = data_scope 행필터**: `MASK`/`LIMIT_FIELDS` 계열 의무의 유사물로 ABAC data_scope 행필터(`TeamPermissions.php:236-322`·effectiveScope/scopeSql)가 존재한다 — 쿼리에 scope 조건을 주입해 결과 행을 제한하고 DENY_SCOPE fail-closed(`TeamPermissions.php:234`)를 적용. 그러나 이는 **판정 시점 쿼리 필터이지 "Permit 후 이행·미충족 시 Commit 차단"이라는 Obligation 모델이 아니다**(substrate이나 모델 부재).
- **`AUDIT`/`EVIDENCE_REQUIRED` 유사물(결합 부재)**: `SecurityAudit` 해시체인 감사기록(`SecurityAudit.php:48-52,27,56-68`·배선 `UserAuth.php:4046`·`Compliance.php:162`)이 실 append-only 감사를 수행하나, 이는 특정 Decision의 mandatory obligation으로 결합되어 "미기록 시 Commit 금지"를 강제하지는 않는다.
- **`SECOND_REVIEW` 유사물**: Maker-Checker(Mapping approve 자기승인차단/정족수·Alerting decideAction 정족수2·GROUND_TRUTH §0-3)가 2차검토 substrate이나 authorization obligation으로 모델링되지 않은 별도 승인 워크플로다.
- **`REAUTHENTICATION`/`RETENTION`/`LEGAL_HOLD`/`WATERMARK`/`EXPORT_LOG` 등 부재**: 인가 허용에 결합된 재인증·보존·법적보류·워터마크·내보내기로그 의무 모델 전무.
- **`mandatory`+`fulfillment status`+"미충족 시 Commit 금지" 결합 부재**: Validation↔Commit 분리(§5.10)와 Commit Binding(§39)이 없어 의무 이행 여부로 커밋을 게이팅하는 메커니즘 자체가 없다.

## 3. 판정

- Verdict: **ABSENT** (Obligation 모델·16종 type·mandatory 미충족 Commit 차단 순신규).
- cover: **부분 substrate** — data_scope 행필터(`TeamPermissions.php:236-322,234`)가 MASK/LIMIT_FIELDS의 유사 substrate, SecurityAudit(`SecurityAudit.php:48-68`)가 AUDIT/EVIDENCE 유사물, Maker-Checker가 SECOND_REVIEW 유사물이나 **어느 것도 Obligation 이행계약·Commit 게이팅 모델이 아님**. 판정=PRESENT-substrate / 모델 ABSENT.
- 선행 의존: CONDITIONAL_PERMIT(§23)·Commit Binding(§39)·Constraint(§29) ABSENT로 "미충족 Commit 금지" 강제 불가(BLOCKED_PREREQUISITE).

## 4. 확장/구현 방향 (설계)

- 순신규 `authorization_obligation` — type(16종)·parameters·mandatory·execution phase/deadline·fulfillment status·failure behavior. Decision(§24)의 `obligation references`로 결합, Commit Binding(§39)에서 **mandatory=true 미충족 시 Commit 차단**(§27 규율).
- Golden Rule=Extend: `MASK`/`LIMIT_FIELDS`/`READ_ONLY` obligation의 실집행을 data_scope 행필터(`TeamPermissions.php:236-322`)+DENY_SCOPE fail-closed(`TeamPermissions.php:234`)로 재사용 — 필터를 obligation parameters로 파라미터화. `AUDIT`/`EVIDENCE_REQUIRED`는 `SecurityAudit` 해시체인(`SecurityAudit.php:48-68`)을 이행 substrate로, `SECOND_REVIEW`는 Maker-Checker(Mapping/Alerting)를 obligation 이행경로로 흡수(중복엔진 신설 금지).
- **Advice(§28)와 엄격 분리**: mandatory Obligation(미충족→Commit 차단)과 Advice(권고·불이행 가능)를 혼동 금지 — Effect=CONDITIONAL_PERMIT은 mandatory obligation 전부 fulfillment 후에만 Commit(§23·§39).
- **불변성 실위험 대비**: `RETENTION`/`LEGAL_HOLD` obligation 대상은 `media_gc_cron.php:35,43`의 감사로그 90일 물리 DELETE 패턴(GROUND_TRUTH 부수발견)에서 제외되도록 delete prevention과 결합 — 법적보류 중 삭제 차단.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EFFECT]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION]] · [[DSAR_APPROVAL_AUTHORIZATION_REASON]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
