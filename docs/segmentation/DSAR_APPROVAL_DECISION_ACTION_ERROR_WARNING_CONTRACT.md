# DSAR — Action Error / Warning Contract (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§61 `ACTION_ERROR_CONTRACT` — **Error 45코드** (범위 앵커: `REGISTRY_NOT_FOUND` … `RUNTIME_BLOCKED`).
§62 `ACTION_WARNING_CONTRACT` — **Warning 17코드**.

> 규율: 45/17 전체 코드 문자열의 축자 나열은 §61/§62 **원문 정본**에 있으며, 여기서는 날조 없이 **앵커 코드 + §CONTRACTS 엔티티로부터 파생되는 오류군(family)**만 전사한다.

### Error 45 — 오류군 (§CONTRACTS 엔티티 앵커)
1. **Registry/Definition/Version 부재군** — `REGISTRY_NOT_FOUND`(앵커)·Definition/Version Not Found·Version Not Active(§7~9).
2. **Capability/Eligibility 거부군** — Capability NOT_ALLOWED·Actor Type/Source State 불허·Assignment/Authority/Delegation 미충족(§11/§12).
3. **Reason 오류군** — Reason Required·Invalid Reason Code·Reason Not Applicable(§18/§38).
4. **Comment 오류군** — Comment Required·Length·Prohibited Content·PII/Secret Detected(§41).
5. **Attachment 오류군** — Required·Count/Size 초과·Invalid MIME/Extension·**Malware Detected**·**DLP Blocked**·Executable/Macro·Quarantined·Client Filename Untrusted(§43/§44).
6. **Return 오류군** — Return Not Allowed·Target Required·Invalid/Cross-Case/Forward Target·Return Loop·Max Returns Exceeded(§19~21).
7. **Request Changes 오류군** — Change Item Required·Invalid Change Target·Duplicate Change Request(§22~24).
8. **Cancel/Withdraw 오류군** — Not Authorized·Invalid Actor·Irreversible Effect·Committed Record Protected(§26~28).
9. **Resubmit 오류군** — Unresolved Items·Version Increment Required·Duplicate Round(§29~31).
10. **Conflict/Compatibility 오류군** — Incompatible Actions·Multiple Terminal·Action Conflict(§49/§50).
11. **Concurrency 오류군** — Idempotency Conflict·Expected Version Mismatch·Decision Locked/Fencing(§51).
12. **Runtime 종결군** — Snapshot/Audit Failure·`RUNTIME_BLOCKED`(앵커, 런타임 가드 차단).

### Warning 17 — 경고군
- Reason 미권장·Comment 권장 미기재·Attachment 선택 미첨부·Return 근접 임계(Max-1)·Defer 기한 임박·SLA Aging·Manual Review 권고·Reconciliation Mismatch(비차단)·Simulation-only 등 **비차단 경고 17종**(§62 원문).

## 2. 기존 구현 대조

- **표준 Error/Warning 계약 부재 → 미구현(ABSENT).** 결정 액션에 통일된 오류 코드 체계 없음.
- 실재 반응은 산발적·비표준:
  - `AdminGrowth::approvalDecide:1321` 화이트리스트 밖 값=암묵 거부(전용 에러코드 없음).
  - **`Alerting::decideAction:594` else 폴백** = 미지원 액션을 오류가 아니라 **REJECT로 무음 오분류**(오류군3/10을 삼킴 — 정직판정: 계약 위반의 원형).
  - Malware Detected/DLP Blocked(오류군5) 대응 코드 **부재** — 스캔 자체가 전역 0 hits이므로 발생 불가.
  - Idempotency/Expected Version(오류군11) 코드 부재.
- 부분 대비: `MediaHost`는 Invalid MIME를 예외로 거부(`:81-91`)하나 표준 코드가 아니라 핸들러 로컬 예외.

## 3. 판정

- Verdict: **ABSENT** (표준 Error/Warning 계약 미구현)
- 선행 의존: 오류군 대부분이 부재 엔티티(Capability/Return/Change Request/Conflict/Idempotency)를 참조 → BLOCKED_PREREQUISITE.
- cover: **0** (핸들러 로컬 예외/무음 폴백만 산발).

## 4. 확장/구현 방향 (설계)

- 순신규 표준 Error 45 / Warning 17 코드 테이블 — 각 코드를 §58 Critical Gap·§59 Lint·§60 Runtime Guard와 1:1 매핑(오류=차단, 경고=진행+로그).
- **최우선 제거**: `Alerting::decideAction:594` else 무음 폴백 → 미지원 액션은 `INVALID_ACTION`/`ACTION_NOT_ALLOWED`로 명시 거부(오분류가 승인 이력 오염, §58 Gap #2/#3).
- Golden Rule(Extend): `AdminGrowth:1321` 화이트리스트를 Capability 검증 정본으로 승격해 오류군2 소스로 사용.
- **Malware Detected/DLP Blocked** 코드는 §44 스캔 신설과 동시 도입(현재 스캔 부재로 사문화 방지).
- 무후퇴: 기존 MediaHost 예외 거부는 표준 코드로 승격하되 거부 동작 자체는 회귀 없이 보존.

관련: [[DSAR_APPROVAL_DECISION_ACTION_API_CONTRACT]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
