# DSAR — Change Request Item (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§24 CHANGE_REQUEST_ITEM** — 필수 필드:
`item id` · change request id · item sequence · target type/id/version · field path reference · current value hash · requested change type · requested value reference · instruction · mandatory · evidence/attachment required · validation rule reference · response value hash · resolution status · `status` · `evidence`.

**CHANGE_TYPE enum**: `CORRECT` / `COMPLETE` / `REPLACE` / `ADD` / `REMOVE` / `CLARIFY` / `RECALCULATE` / `RECLASSIFY` / `REATTACH` / `VERIFY` / `CUSTOM`.

## 2. 기존 구현 대조

- Change Request(§23)의 **개별 변경 항목(line item)** 을 나타내는 자산 부재 — 상위 Change Request 자체가 없다(§22·§23 ABSENT).
- 필드 단위 변경 지시를 `field path reference`·`current value hash`·`requested value reference`·CHANGE_TYPE 로 구조화하는 자산 → **no hits**.
- `mapping_change_request`(`Mapping.php:209`)는 항목(item) 분해·`current value hash`/`response value hash`·per-item resolution status 를 갖지 않으므로 대응 엔티티 아님.
- Attachment 요구(`evidence/attachment required`) 를 뒷받침할 첨부 검증도 이미지 MIME(MediaHost `:81-91`)에 국한 — 문서/증거 첨부 malware/DLP 검증 전면 부재.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§23 Change Request**(부모 레코드, ABSENT)·**§3.1 Decision Core**(target id/version 이 가리킬 불변 대상). 항목의 `current value hash`↔`response value hash` 비교는 불변 스냅샷 기반이어야 하나 Snapshot 계층 부재.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_change_request_item` — Change Request(§23)의 자식. CHANGE_TYPE 11종으로 변경 의도를 명시(CORRECT/RECALCULATE/REATTACH 등)하고, `current value hash` → 응답 후 `response value hash` 로 해소를 검증. `mandatory=true` 항목은 미해소 시 Resubmit 차단(§29 미해결 Item 확인).
- Mandatory Control: **RECALCULATE/RECLASSIFY 항목은 validation rule reference 필수** — 임의 값 맞추기 금지(SSOT 파생, MEMORY 실제값 자동산출 원칙). `evidence/attachment required` 항목은 첨부 검증(§44)을 통과해야 해소.
- 재사용: `field path reference`·value hash 는 Snapshot(§52)·Evidence(§53) 의 Canonical Reference+Hash 패턴 준수(원문 중복저장 금지). 첨부 검증은 `MediaHost`(`:81-91`) 매직바이트 검증을 문서 타입으로 확장하되, 첨부 malware/DLP(§42~§44)는 순신규(현재 `malware/dlp` 전역 no hits).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CHANGE_REQUEST]] · [[DSAR_APPROVAL_DECISION_CHANGE_RESPONSE_FOUNDATION]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
