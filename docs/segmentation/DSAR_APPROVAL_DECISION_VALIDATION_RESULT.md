# DSAR — Approval Decision Validation Result (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§26 VALIDATION_RESULT` — 필수 필드(원문 전사):

`result_id` · `command_id` · validation policy version · validation status · passed/failed/warning checks · (actor/target/state/assignment/claim/lease/authority/delegation/legal entity/organization/resource/action/amount/currency/security/SoD/CoI/idempotency/replay/existing decision/lock/fencing result) · context hash · `validated_at` · `expires_at` · status · evidence.

STATUS(9): `PENDING` · `VALIDATING` · `VALID` · `VALID_WITH_WARNINGS` · `INVALID` · `EXPIRED` · `SUPERSEDED` · `BLOCKED`.

★검증 결과 무기한 재사용 금지 · Commit 직전 Critical 재검증.

## 2. 기존 구현 대조

- **검증 결과 영속화 전면 부재**: `result_id`·validation policy version·per-check result·`context hash`·`validated_at`/`expires_at`를 담는 레코드가 실존하지 않는다. 4개 승인 결정 핸들러는 검증을 **인라인 if로 수행하고 즉시 버린다** — 통과/실패 판정이 지속 저장되지 않는다.
- `AdminGrowth::approvalDecide`(:1327 이미처리 409·:1321 enum)·`Mapping::approve`(:268 자기승인·:278 dedup·:287 정족수)의 검사 결과는 조건 분기 후 소멸하며, 어느 체크가 통과/실패했는지 per-check로 기록되지 않는다.
- **감사 로그와 혼동 금지**: `Mapping`(audit :?)·`AdminGrowth`(:1342 audit)·`Alerting`(:597,:655 audit)의 audit_log는 결정 **사후 기록**이지 검증 결과(passed/failed checks·context hash·expires_at) 영속화가 아니다. 게다가 audit_log는 비무결(정본=`SecurityAudit.php:56-68` verify).
- **재검증 부재로 인한 Drift 노출**: `Mapping::approve` read(:273)→UPDATE(:288)가 트랜잭션 없이(TOCTOU) 이어져, 검증과 커밋 사이 Validation Result의 유효기간·Context Hash 불변 개념 자체가 없다. §26의 "무기한 재사용 금지"를 강제할 대상이 존재하지 않는다.
- validation status(9종)에 대응하는 상태 없음 — 결정은 검증 상태를 거치지 않고 곧바로 status='approved'/'rejected'로 UPDATE(§27 참조).

## 3. 판정

- Verdict: **ABSENT** — 검증 결과 영속화 없음.
- 선행 의존: §25 Validation Pipeline(PARTIAL·인라인만)의 결과물이므로 파이프라인 분리가 선행. 나아가 per-check 필드(assignment/claim/lease/authority/delegation result)는 §3.2/§3.3/§3.4(ABSENT) 축이 있어야 산출 가능.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **결과 영속 엔티티 신설**: §25 파이프라인 27단계의 per-check 결과를 `validation_result`(result_id·command_id·policy version·per-check result·context hash·validated_at·expires_at·status)로 영속화. audit_log 재사용 금지(비무결·사후기록).
- **무기한 재사용 차단**: `expires_at`와 `context hash` 불변을 강제하고, Commit 직전 Critical 재검증(§32)으로 Validation↔Commit 사이 Drift(§51) 시 커밋 차단. `Mapping` TOCTOU(:273→:288)가 정확히 이 결핍의 실증.
- **무결성 정본 연계**: 검증 결과의 위변조 방지는 audit_log가 아니라 `SecurityAudit::verify`(:56-68) 계열의 검증가능 무결 체계에 연결.
- 실 구현 = §25 파이프라인·선행 6군 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
