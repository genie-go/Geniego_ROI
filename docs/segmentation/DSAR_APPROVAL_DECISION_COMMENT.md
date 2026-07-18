# DSAR — Approval Decision Comment (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§39 COMMENT 필수 필드:
- `comment_id` · `tenant_id` · `decision command id` · `record id` · `action type`
- `author subject id` · `comment type` · `classification`
- `text` · `normalized text hash` · `language`
- `visibility`
- `contains PII/sensitive data flag` · `redaction status` · `moderation status reference`
- `created_at` · `immutable hash` · `status` · `evidence`

TYPE(§39): `DECISION_RATIONALE` / `REJECTION_EXPLANATION` / `RETURN_INSTRUCTION` / `CHANGE_REQUEST` / `CANCELLATION` / `WITHDRAWAL_EXPLANATION` / `RESUBMISSION_NOTE` / `INTERNAL` / `EXTERNAL` / `SYSTEM_NOTE` / `CUSTOM`.

## 2. 기존 구현 대조

- 결정 코멘트의 **값 저장은 실재하나** 구조화 속성은 전무 → **PARTIAL**.
- 실존:
  - `Mapping` 승인/거절의 note = 자유텍스트 코멘트(값은 저장됨).
  - `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1330`) in-place UPDATE 시 부수 텍스트, `Alerting` decide 경로의 note(`Handlers/Alerting.php:593`).
- 부재(핵심 통제 속성 전무):
  - `comment type`(11종 enum)·`classification`·`visibility` → **no hits**.
  - `contains PII/sensitive data flag`·`redaction status`·`moderation status reference` → 코멘트에 결합된 것 부재. Redaction 로직 자체는 DSAR PII 전용으로만 존재(`Handlers/Dsar.php:89-97,765`)이며 결정 코멘트에 연결되지 않음.
  - `normalized text hash`·`immutable hash` → 코멘트 불변성 없음(수정 가능한 자유텍스트).
  - `decision command id`/`record id` 결합 → 불변 Decision Record 자체가 부재(§3.1 Decision Core ABSENT)라 코멘트가 결정에 원자 결합되지 않음.

## 3. 판정

- Verdict: **PARTIAL** (note 값 저장 존재 · type/classification/visibility/PII/redaction/hash 전무)
- 선행 의존: §3.1 Decision Core(ABSENT — `decision command/record id` 결합 대상 부재) · §3.5 Content/Document(MIXED — PII/classification 인프라 부분) → cover 근거는 note 저장뿐.
- cover: **note 자유텍스트 저장 1축**(Mapping note·`AdminGrowth.php:1330`) · **구조화/통제 속성 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장(Golden Rule): 기존 note 자유텍스트를 삭제하지 않고 `approval_decision_comment` 레코드로 승격 — `comment type`(11종)·`classification`·`visibility`·`immutable hash` 부여. 레거시 note 값은 `text`로 보존.
- ★필수 통제 신설: `contains PII/sensitive data flag` + `redaction status`. 재사용 = `Dsar.php:89-97,765`의 PII redaction 로직을 결정 코멘트로 확장(엔진 난립 금지 — 신규 redaction 엔진 X).
- `visibility`는 §40 Comment Visibility(별도 문서)로, 정책은 §41 Comment Policy로 위임 — 본 엔티티는 코멘트 레코드 형상에 한정.
- `normalized text hash`/`immutable hash`는 §52 Snapshot·§53 Evidence의 "Comment Reference+Hash"(원문 중복저장 금지)와 결합 — 코멘트 확정 후 수정 금지, 정정은 새 Record(§41).
- 실위험: 현행 코멘트는 수정 가능·PII 플래그 없음 → 민감 내부 코멘트가 요청자에게 무제한 노출될 수 있음(§58 Critical Gap: Comment Visibility·민감노출). Decision Core(§3.1) 구축 전까지 코멘트는 결정에 비원자 결합 상태 = 부분 집행 위험.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
