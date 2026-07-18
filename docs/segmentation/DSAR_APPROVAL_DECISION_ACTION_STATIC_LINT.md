# DSAR — Action Static Lint (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§59 `ACTION_STATIC_LINT` — 배포 전 정적 차단 규칙(원문 §58 Critical Gap을 소스/스키마 수준에서 사전 탐지). 대상 위반:

1. 결정/집행이 **직접 `UPDATE SET status`**로 액션을 status 문자열에 융합(Action Definition→Effect Mapping 우회).
2. **Action↔Outcome 1:1 하드코딩**(Versioned Mapping §14 미참조).
3. **미지원 액션 무음 폴백**(else 분기로 REJECT 오분류 등).
4. **Reason/Comment/Attachment 필수요건 미참조** 커밋 경로.
5. **Client Filename/MIME 신뢰**·서버 매직바이트 재검증 없는 파일 저장.
6. **Malware/DLP 스캔 호출 없는** 첨부 저장.
7. **Committed Record in-place UPDATE**(정정은 새 Record여야 함).
8. **Tenant 스코프 술어 없는** 액션 대상 조회.
9. **Compatibility/Conflict 검증(§49/§50) 미참조** 종결 액션.
10. **Idempotency Key(§51) 미참조** 상태변경 액션.
11. **Snapshot/Audit Event(§52/§54) 미생성** 커밋 경로.
12. **RETURN/CANCEL/WITHDRAW/RESUBMIT 액션에 Target/Scope/Actor 검증 없음**.

## 2. 기존 구현 대조

- **정적 린트 계층 부재 → 미구현(ABSENT).** 리포에 결정 액션 전용 정적 검사(CI 게이트·AST 룰·스키마 린트) 없음.
- 위 규칙이 잡아야 할 위반은 소스에 **실재**하나 자동 탐지 없음:
  - 규칙1/7: in-place `UPDATE SET status`(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`).
  - 규칙3: `Alerting::decideAction:594` else 무음 폴백(approve 아니면 전부 rejected).
  - 규칙4: `AdminGrowth::approvalDecide:1319-1331` 거절 사유 미수취.
  - 규칙5/6: `CreativeStore::brandAssetUpload:265-275` MIME/매직바이트/malware 미검증 직저장.
- 실효 대비 사례(린트가 아니라 런타임 검증): `MediaHost.php:88-91` 매직바이트 재검증·`index.php:404-420` Tenant Guard — 이는 규칙5/8 위반을 런타임에 막지만 **정적 사전차단은 아님**.

## 3. 판정

- Verdict: **ABSENT** (정적 린트 미구현)
- 선행 의존: 린트 대상인 Action Definition/Effect Mapping/Reason Registry/Attachment Policy가 §3 전반 부재 → 린트 룰의 참조 대상 자체가 없음(BLOCKED_PREREQUISITE 성격).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 CI 정적 게이트 — 12개 룰을 AST/grep 기반 차단으로 신설. 각 룰은 §61 Error 코드로 매핑.
- 선(先) 탐지 우선순위(실재 위반 기준): (1) `UPDATE SET status` 직접호출 금지 → Effect Mapping 경유 강제, (2) `Alerting::decideAction:594` 무음 else 폴백 금지, (3) 파일 저장 경로에 매직바이트+malware 스캔 호출 필수(`CreativeStore` 위반 차단).
- Golden Rule(Extend): 기존 `MediaHost` 매직바이트 검증·Tenant Guard를 린트가 "필수 호출"로 요구하는 참조 정본으로 승격.
- 무후퇴: 린트는 신규 차단만 추가하며 기존 통과 경로를 회귀시키지 않음. Repo에 lint/test 스크립트가 없으므로(CLAUDE.md) 도입 시 CI Phase로 추가.

관련: [[DSAR_APPROVAL_DECISION_ACTION_RUNTIME_GUARDS]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
