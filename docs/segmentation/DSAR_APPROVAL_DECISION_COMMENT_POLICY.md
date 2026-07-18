# DSAR — Approval Decision Comment Policy (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§41 COMMENT_POLICY 필수 필드:
- `minimum length` · `maximum length` · `required`
- `allowed languages`
- `prohibited content rule reference`
- `PII detection` · `secret detection`
- `profanity reference` · `abuse reference`
- `legal privilege classification`
- `redaction policy` · `visibility policy` · `edit policy` · `retention policy` · `export policy`

★ Committed 코멘트는 수정 금지 → 정정은 새 Record.

## 2. 기존 구현 대조

- 코멘트 정책(길이/필수/언어/금지콘텐츠/PII·secret 탐지/편집·보존·내보내기)을 선언·강제하는 자산 → **no hits**.
- 실존 코멘트(Mapping note·`AdminGrowth.php:1330` 부수 텍스트)는 정책 게이트 없는 자유텍스트 — `minimum/maximum length`·`required`·`allowed languages` 미검증.
- `PII detection`/`secret detection`/`profanity`/`abuse` → 결정 코멘트에 결합된 탐지 부재. PII redaction은 DSAR 전용(`Handlers/Dsar.php:89-97,765`)이며 코멘트 정책으로 노출되지 않음.
- `edit policy`(Committed 수정 금지) → 부재. 현행 in-place UPDATE 관행(`AdminGrowth.php:1330`)은 오히려 수정 허용 = 정책의 정반대.
- `retention policy`/`export policy`/`legal privilege classification` → 전무.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §39 Comment(PARTIAL — Policy는 Comment의 통제 오버레이) · §3.5 Content/Document(MIXED — PII/secret 탐지·DLP 인프라 부분·범용 미비) · §3.1 Decision Core(ABSENT — edit policy가 결합할 불변 Record 부재) → **BLOCKED_PREREQUISITE**.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_comment_policy` — 테넌트/액션 타입별 `minimum/maximum length`·`required`·`allowed languages`·`edit policy`·`retention policy`를 데이터로 선언. §16/§17/§19 검증의 "Comment Requirement" 게이트 소스.
- ★핵심 불변식 = `edit policy`: Committed 코멘트 수정 금지. 현행 in-place UPDATE(`AdminGrowth.php:1330`) 관행을 **정정 = 새 Record**로 대체(§39 immutable hash와 결합). 이것이 무후퇴 대비 최우선 통제.
- `PII detection`/`secret detection` = `Dsar.php:89-97,765` redaction 로직을 정책 게이트로 확장(재사용). 탐지 히트 시 §39 `redaction status`·`contains PII flag` 자동 세팅.
- `legal privilege classification` + `visibility policy`는 §40 Comment Visibility와 결합 — LEGAL_ONLY/COMPLIANCE_ONLY 코멘트의 자동 노출 차단 정책.
- `prohibited content rule reference`/`profanity`/`abuse`는 초기엔 참조 스텁으로 두되, 최소 length·required·edit-lock부터 강제.
- 실위험: 정책 없이 코멘트를 자유입력·수정 허용하면 감사 무결성 붕괴(코멘트 소급 변조) + 민감정보 무통제 저장 — §58 Critical Gap(Record 수정·민감노출·Mandatory Control 제거).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
