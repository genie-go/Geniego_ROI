# DSAR — Resubmission Package (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§30 RESUBMISSION_PACKAGE — 필수 필드(원문 전사):
- `package_id` · `tenant_id`
- `case id` · `previous case version id` · `new case version id`
- `origin action type` · `origin decision record id`
- `return target id`
- `change request ids`
- `resolved item ids` · `unresolved item ids`
- `changed resource references`
- `changed field/document manifest`
- `previous amount` · `new amount`
- `previous currency` · `new currency`
- `previous legal entity` · `new legal entity`
- `previous organization` · `new organization`
- `resubmitted by` · `submitted_at`
- `validation result`
- `new decision round`
- `status` · `evidence`

## 2. 기존 구현 대조

- Resubmission Package = **부재** → ABSENT. `resubmission`·`resubmission_package`·`change request ids`·`new decision round` 데이터 선언 → **no hits**.
- 필수 필드 대다수의 상위 엔티티가 부재:
  - `case id` / `previous·new case version id` / `new decision round`: Case·Case Version 축 부재(§3.1 Decision Core ABSENT).
  - `origin decision record id`: 불변 Decision Record 부재(in-place UPDATE `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`).
  - `return target id`: Return Action/Target(§19·§20) 부재.
  - `change request ids` / `resolved·unresolved item ids`: Change Request/Item(§23·§24) 부재.
  - `previous·new amount/currency/legal entity/organization`: 변경 델타를 스냅샷할 구조 부재.
- `changed field/document manifest`: Attachment Manifest(§42) 부재. 파일 검증은 `MediaHost.php:81-91`(이미지 4종 MIME·매직바이트 `:88-91`) 한정이며 결정 첨부 Manifest가 아님.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(Case/Case Version/Origin Record) · Return Target(§20) · Change Request/Item(§23·§24) · Attachment Manifest(§42). 패키지는 이들 참조를 묶는 집합체이므로, 참조 대상이 전부 부재하면 패키지 자체가 성립 불가.
- cover: **0** (패키지 엔티티·변경 델타 스냅샷·resolved/unresolved item 참조 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_resubmission_package` — §29 Resubmit 액션의 산출물. 재제출 시점의 이전/신규 델타(amount·currency·legal entity·organization·case version)를 **불변 스냅샷**으로 고정.
- Mandatory Control: `resolved item ids` / `unresolved item ids` 로 미해결 Change Item이 남으면 재제출 차단(§29 검증). `validation result` = 패키지 게이트.
- Evidence 원칙(§53): Comment 원문·Attachment 내용 **전체 중복저장 금지** — `changed field/document manifest`는 Canonical Reference + Hash로만. `MediaHost` SHA-256(파일 무결성) 재사용, 결정 첨부 Manifest는 신규.
- 실위험: `previous·new amount/currency/legal entity` 델타를 기록하지 않으면 재제출로 금액·법인을 바꿔치기해도 감사 불가 — §31 Version Policy와 결합해 중요 변경 시 `new case version id` 강제.
- 선행 차단: Case Version·Decision Record·Change Request가 먼저 존재해야 패키지의 참조 무결성이 성립(BLOCKED_PREREQUISITE 성격).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
