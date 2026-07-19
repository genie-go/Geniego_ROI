# DSAR — System Actor Identity (06-A-03-02-03-03 · §37)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§37 System Actor Identity** — 자동 의사결정을 수행하는 시스템 주체의 신원 계약. 필수 축:
`Auto-decision Policy`(자동결정 정책) · `System Actor Registry` · `allowed Decision Action / Resource Type / Amount` · `Currency Scope` · `Rule Version` · `Model Version Ref` · `Input Snapshot`(입력 스냅샷) · `Execution Trace`(집행 추적) · `Human Override Policy` · `Audit` · `Ledger Entry`.

★ **인간 Approver ID로 기록 금지**(§5.9·§62). System Actor의 자동결정은 사람 승인자 ID로 위장 기록될 수 없으며, rule/model version과 input snapshot을 명시하고 human override policy를 갖춰야 한다.

## 2. 기존 구현 대조

- **'system'/'admin' 문자열 혼재·정책 부재** — 시스템 주체를 별도 canonical actor type으로 구분하는 구조가 없다. Mapping actor는 api_key/session/null만 도출하며(`Mapping.php:36-53`), 시스템 자동행위의 감사 actor는 `actor() = actorId() ?? 'unknown'`(`Mapping.php:56-58`)으로 얼버무린다. 'system'·'admin' 문자열이 코드 곳곳에 혼재하나 System Actor Registry로 정규화되지 않았다.
- **Auto-decision Policy·rule/model version·input snapshot 전무** — 자동결정의 rule version·model version·input snapshot·execution trace를 봉인하는 구조체 no hits. `Alerting::executeAction`(`Alerting.php:601-665`)은 자동집행에 가깝게 동작하나 rule/model version·input snapshot 기록 없이 AdAdapters로 dispatch한다(§37 Execution Trace 부재).
- ★ **자동행위가 human approver로 오계상될 위험 실재** — `Alerting::actor()`(`Alerting.php:33-36`)가 `X-User-Email`/`?actor=`를 그대로 채택(BLOCKED_SECURITY)하므로, 시스템/자동 경로가 임의 human email을 승인자로 기록할 수 있다 — §37 "인간 Approver ID로 기록 금지" 정면 위반 가능. `decideAction`(`Alerting.php:574,591,593,597`)·policy ops(`:82,127,171,189,603`) 동일.
- **Human Override Policy 부재** — 자동결정을 사람이 뒤집는 override 경로·정책이 명시돼 있지 않다.

## 3. 판정

- **Verdict: ABSENT(순신규·문자열 혼재)** — System Actor Identity 정규화 전무. Auto-decision Policy·rule/model version·input snapshot·execution trace·human override policy 어느 축도 없다. 'system'/'admin' 문자열만 혼재.
- **선행 의존**: §3.1 System Identity 부재 + §3.3 Decision Foundation·Ledger Entry ABSENT.
- **cover: 0** — System Actor governance 커버 없음. actor 도출(`Mapping.php:36-53,56-58`)은 human/api_key 전용으로 system actor를 구분하지 못함. **`Alerting::actor()`(`:33-36`)는 BLOCKED_SECURITY로 human 오계상 위험.**

## 4. 확장·구현 방향 (설계)

- **순신규 System Actor Registry + Auto-decision Policy** — 시스템 자동결정 주체를 별도 actor type(§8 `SYSTEM_ACTOR`)으로 정규화. `allowed Decision Action/Resource/Amount`·`Currency Scope`·`Rule Version`·`Model Version Ref`·`Input Snapshot`·`Execution Trace`·`Human Override Policy`를 봉인.
- ★ **인간 Approver ID 오기록 금지 Mandatory Control** — system 자동결정을 human email/actor로 기록 금지(§62 Lint). `Alerting::actor()`(`Alerting.php:33-36`) 헤더/쿼리 신뢰 제거는 이 원칙의 선결 봉합(BLOCKED_SECURITY·자립 수정 가능).
- **'system'/'admin' 문자열을 canonical System Identity로 통합** — Mapping actor 도출(`Mapping.php:36-53`)에 system actor 분기 추가, 감사 preimage(`SecurityAudit.php:14-33,27`)에 rule/model version·input snapshot 포함.
- **Human Override Policy 명시** — 자동결정을 사람이 뒤집을 때 Original(System) Actor + Overriding(Human) Actor 이중 보존(§5.1·§41 On-behalf-of Chain).
- **선행 필수**: System Identity·Decision Ledger 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_SERVICE_ACCOUNT_IDENTITY]] · [[DSAR_APPROVAL_DECISION_ACTOR_RESOLUTION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
