# DSAR — Change Response Foundation (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§25 CHANGE_RESPONSE_FOUNDATION** — 필수 필드:
`response actor` · `timestamp` · `comment` · changed resource version · changed field references · new value hashes · response attachment references · requester confirmation · validator result · unresolved items · resubmission package reference.

## 2. 기존 구현 대조

- 요청자가 Change Request(§23)/Item(§24)에 응답한 결과를 담는 **응답 토대(response foundation) 부재**. Change Request 흐름 자체가 없다(§22~§24 ABSENT).
- `changed field references`·`new value hashes`·`validator result`·`unresolved items`·`resubmission package reference` 를 기록하는 자산 → **no hits**.
- 자유텍스트 `note`(Mapping/ReturnsPortal/Dsar)는 존재하나 응답 액터·검증결과·미해결 항목 구조를 갖지 않아 대응 엔티티 아님.
- 응답 첨부(`response attachment references`)를 검증할 계층은 이미지 MIME(MediaHost `:81-91`)뿐 — `CreativeStore::brandAssetUpload`(`:265-275`)는 5MB 캡만·무검증(BLOCKED_GAP).

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§24 Change Request Item**(응답이 해소하는 대상, ABSENT)·**§3.1 Decision Core**(changed resource version·불변 Snapshot)·**§30 Resubmission Package**(resubmission package reference). Foundation 은 이들이 있어야 채워진다.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- §25 는 명칭 그대로 **Foundation(토대)** — 상세 Resubmission 처리(§29·§30)로 넘어가기 전, 응답 액터/시각/변경 필드/새 값 해시/미해결 항목만 캡처하는 최소 계층. 순신규.
- **validator result** = Change Request Item(§24)의 `validation rule reference` 실행 결과 — 요청자 자기확인(`requester confirmation`)만으로 자동 RESOLVED 처리 금지(가짜녹색 방지·검증 없는 승인 봉쇄).
- `unresolved items` 가 비어야 Resubmit(§29) 진입 — `mandatory` Item 미해소 시 `resubmission package reference` 생성 차단.
- Mandatory Control: 응답 첨부는 **MediaHost 매직바이트 검증(`:81-91`) 경로로 통일**하고 `CreativeStore` 무검증 경로(`:265-275`) 재사용 금지. Committed 값 수정 금지 — 응답은 새 값 해시(`new value hashes`)로 append, 원본 불변(§41 Committed 수정금지 원칙과 정합).
- 재사용: 응답 증거는 `SecurityAudit::verify`(`:56-68`) append-only. 값·첨부는 Canonical Reference+Hash(원문 중복저장 금지).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CHANGE_REQUEST_ITEM]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
