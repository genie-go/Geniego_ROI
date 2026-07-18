# DSAR — Decision Evidence Foundation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**EVIDENCE_FOUNDATION (§55)** — 필수 필드:
- `evidence_id` · tenant id
- 참조 묶음: decision registry/definition/version/instance/command/action type/record · actor subject/identity snapshot/role assignment/position incumbency · assignment/claim/lease · authority/delegation resolution · request/case/item/requirement/work item · sequential instance/stage/level/step · cursor · legal entity/organization/resource · amount · currency · validation/commit result · idempotency · lock · fencing token · snapshot · outbox
- `effective_at`/`recorded_at` · `immutable_hash` · lineage · audit reference

**★ 저장 금지 목록 (§55)**: Password · Access Token · OTP 원문 · MFA Secret · Private Key · Credential · 전체 Session Token · 전체 Device Fingerprint · 전체 Email/Slack/Teams Body · PII · Security Secret.

## 2. 기존 구현 대조

- **부분 실재 (PARTIAL).** 결정에 대한 근거 축적물의 **일부 재료**는 실존한다:
  - `Mapping::approve` 의 `approvals_json`(`Mapping.php:285`) — 승인자 append 시 `{user, ts}` 를 누적. 이는 §55 가 요구하는 evidence 참조(actor subject·recorded_at)의 **원시 형태**이나, `evidence_id`·`immutable_hash`·`lineage`·`audit reference` 를 갖춘 정식 Evidence 레코드가 아니라 **JSON 컬럼 append** 다.
  - `AdminGrowth::approvalDecide` 는 audit(:1342), `Alerting` 은 audit(:597,655)를 남긴다 — 감사 이벤트는 근거의 한 축이나 §55 의 통합 Evidence 엔티티는 아니다.
- **부재분**: validation/commit result · idempotency · lock · fencing token · snapshot · outbox · authority/delegation resolution 참조는 전부 부재(해당 선행 엔티티 자체가 ABSENT). Evidence 가 이들을 참조하려 해도 참조 대상이 없다.
- **저장 금지 준수 여부 = 미평가·위험 상존.** `approvals_json` 은 현재 `{user, ts}` 만 담아 금지 항목 저촉이 관측되진 않으나, Evidence 를 정식화할 때 §55 금지 목록(전체 Email/Slack/Teams Body·전체 Session Token·PII 등)을 **구조적으로 차단하는 게이트**는 존재하지 않는다. 특히 `Alerting::actor()` 가 헤더(X-User-Email/?actor=)를 신뢰(`Alerting.php:33-35`, BLOCKED_SECURITY)하므로, Evidence 에 위조된 email 이 그대로 근거로 박제될 위험이 있다.

## 3. 판정

- Verdict: **PARTIAL** (핵심 통합 Evidence 엔티티는 부재 → 선행 의존분은 **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.6 Identity/Security 는 PARTIAL(app_user Canonical·SecurityAudit verify PRESENT)이나 Position/Org/Legal Entity/Actor Snapshot 은 ABSENT. Evidence 의 actor identity snapshot·role assignment·position incumbency 참조는 이 부재에 막힌다.
- cover: `approvals_json`(`Mapping.php:285`) 승인자 누적 = 부분 근거 재료. 정식 Evidence 엔티티 커버 **0**.

## 4. 확장/구현 방향 (설계)

- **`approvals_json`(Mapping.php:285) 을 확장 기반**으로 삼되, JSON append 를 **불변 Evidence 레코드(evidence_id·immutable_hash·lineage)** 로 승격. Mapping 의 actor 해석(:36-53, api_key/session·미확인 fail-closed null)은 §18 Actor Resolution 의 정직한 선례이므로 재사용.
- **`immutable_hash`·audit reference** = `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 감사 무결 정본에 lineage 연결 — 신규 감사 엔진 신설 금지.
- **Mandatory Control — 저장 금지 목록(§55) 강제**: Evidence 기록 경로에 금지 필드(전체 Body·Session Token·PII·Credential) redaction/차단 게이트를 넣는다. 이는 [Feedback: credentials 평문노출 회피]·No PII storage 원칙과 정합.
- **실위험 차단**: `Alerting::actor()` 헤더 위조(:33-35)를 근거로 삼지 말 것 — Evidence actor 는 §18 Actor Resolution(Authenticated Principal→Canonical Subject) 통과분만 기록(BLOCKED_SECURITY 선행 치유 필요).
- 실 구현 = 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
