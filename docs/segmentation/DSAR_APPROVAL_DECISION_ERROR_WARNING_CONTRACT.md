# DSAR — Error / Warning Contract (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 근거: §GROUND_TRUTH(ⓑ 전수조사) + §CONTRACTS §63(Error)/§64(Warning). file:line 인용은 허용목록만.

## 1. 원문 전사 (Canonical Contract)

### 1.1 §64 Warning — 16코드 (키트 전사 완전)

| # | Warning Code |
|---|---|
| 1 | `APPROVAL_DECISION_ACTOR_WARNING` |
| 2 | `APPROVAL_DECISION_ASSIGNMENT_WARNING` |
| 3 | `APPROVAL_DECISION_CLAIM_WARNING` |
| 4 | `APPROVAL_DECISION_LEASE_EXPIRING` |
| 5 | `APPROVAL_DECISION_LOCK_EXPIRING` |
| 6 | `APPROVAL_DECISION_AUTHORITY_WARNING` |
| 7 | `APPROVAL_DECISION_DELEGATION_WARNING` |
| 8 | `APPROVAL_DECISION_STATE_WARNING` |
| 9 | `APPROVAL_DECISION_AMOUNT_WARNING` |
| 10 | `APPROVAL_DECISION_CURRENCY_WARNING` |
| 11 | `APPROVAL_DECISION_CHANNEL_WARNING` |
| 12 | `APPROVAL_DECISION_IDEMPOTENCY_WARNING` |
| 13 | `APPROVAL_DECISION_OUTBOX_WARNING` |
| 14 | `APPROVAL_DECISION_DRIFT_WARNING` |
| 15 | `APPROVAL_DECISION_RECONCILIATION_WARNING` |
| 16 | `APPROVAL_DECISION_MANUAL_REVIEW_REQUIRED` |

★Warning = 차단 아님 → State `VALID_WITH_WARNINGS`/`COMMITTED_WITH_WARNINGS`(§26·§27·§34)로 흐르되 감사·Reconciliation 대상. **Warning을 조용히 삼키면 안 됨**(§56 Audit·§57 Reconciliation 연결).

### 1.2 §63 Error — 52코드

★**정직 고지**: 이 키트의 §63은 count=**52** + anchor 2개(**first=`APPROVAL_DECISION_REGISTRY_NOT_FOUND` … last=`APPROVAL_DECISION_RUNTIME_BLOCKED`**)만 제공한다. 아래 52코드는 키트에 **verbatim 전사된** §24 GUARD·§26 VALIDATION_RESULT·§32 COMMIT_REVALIDATION·§34 COMMIT_RESULT·§7~§17 엔티티 NOT_FOUND 계열에서 **1:1 정합 도출**한 것으로, anchor 2개가 정확히 처음/끝에 위치한다. **정본 verbatim 순서·문자열은 마스터 SPEC §63**을 따른다(이 문서는 도출본).

엔티티·라이프사이클 (§7~§17):
1. `APPROVAL_DECISION_REGISTRY_NOT_FOUND` ← anchor(first)
2. `APPROVAL_DECISION_POLICY_NOT_FOUND`
3. `APPROVAL_DECISION_DEFINITION_NOT_FOUND`
4. `APPROVAL_DECISION_VERSION_NOT_FOUND`
5. `APPROVAL_DECISION_VERSION_NOT_ACTIVE`
6. `APPROVAL_DECISION_INSTANCE_NOT_FOUND`
7. `APPROVAL_DECISION_COMMAND_NOT_FOUND`
8. `APPROVAL_DECISION_ACTION_TYPE_UNKNOWN`

테넌트·스코프 (§20·§24 TENANT/LEGAL_ENTITY/ORGANIZATION/RESOURCE_MATCH):
9. `APPROVAL_DECISION_TENANT_MISMATCH`
10. `APPROVAL_DECISION_LEGAL_ENTITY_MISMATCH`
11. `APPROVAL_DECISION_ORGANIZATION_MISMATCH`
12. `APPROVAL_DECISION_RESOURCE_MISMATCH`

Actor·자격 (§18·§21·§24):
13. `APPROVAL_DECISION_ACTOR_UNRESOLVED`
14. `APPROVAL_DECISION_ACTOR_NOT_ELIGIBLE`
15. `APPROVAL_DECISION_ACTOR_NOT_ASSIGNEE`
16. `APPROVAL_DECISION_ACTOR_NOT_VALID_DELEGATE`
17. `APPROVAL_DECISION_SECURITY_SUSPENDED`
18. `APPROVAL_DECISION_SOD_VIOLATION`
19. `APPROVAL_DECISION_CONFLICT_OF_INTEREST`

상태·단계 (§24·§27):
20. `APPROVAL_DECISION_CASE_NOT_ACTIVE`
21. `APPROVAL_DECISION_WORK_ITEM_NOT_ACTIVE`
22. `APPROVAL_DECISION_STEP_NOT_ACTIVE`
23. `APPROVAL_DECISION_STEP_NOT_WAITING_FOR_DECISION`
24. `APPROVAL_DECISION_CURSOR_MISMATCH`
25. `APPROVAL_DECISION_STATE_INVALID`

할당·클레임·리스·권한·위임 (§24):
26. `APPROVAL_DECISION_ASSIGNMENT_NOT_ACTIVE`
27. `APPROVAL_DECISION_CLAIM_NOT_ACTIVE`
28. `APPROVAL_DECISION_LEASE_EXPIRED`
29. `APPROVAL_DECISION_AUTHORITY_NOT_ACTIVE`
30. `APPROVAL_DECISION_DELEGATION_NOT_ACTIVE`

액션·금액·통화 (§24):
31. `APPROVAL_DECISION_ACTION_NOT_ALLOWED`
32. `APPROVAL_DECISION_AMOUNT_EXCEEDS_LIMIT`
33. `APPROVAL_DECISION_CURRENCY_NOT_ALLOWED`

동시성·멱등·재생·락·펜싱·버전 (§39·§40·§41·§43·§44·§24):
34. `APPROVAL_DECISION_EXPECTED_VERSION_MISMATCH`
35. `APPROVAL_DECISION_IDEMPOTENCY_CONFLICT`
36. `APPROVAL_DECISION_REPLAY_DETECTED`
37. `APPROVAL_DECISION_NONCE_INVALID`
38. `APPROVAL_DECISION_REQUEST_EXPIRED`
39. `APPROVAL_DECISION_LOCK_ACQUISITION_FAILED`
40. `APPROVAL_DECISION_STALE_FENCING_TOKEN`
41. `APPROVAL_DECISION_EXISTING_COMMITTED_DECISION`

검증·커밋 (§26·§32·§34):
42. `APPROVAL_DECISION_VALIDATION_FAILED`
43. `APPROVAL_DECISION_VALIDATION_EXPIRED`
44. `APPROVAL_DECISION_COMMIT_REVALIDATION_FAILED`
45. `APPROVAL_DECISION_COMMIT_FAILED`
46. `APPROVAL_DECISION_DUPLICATE_DECISION`
47. `APPROVAL_DECISION_OUTBOX_FAILURE`
48. `APPROVAL_DECISION_SNAPSHOT_FAILURE`
49. `APPROVAL_DECISION_AUDIT_FAILURE`

채널·봉투 (§15·§16):
50. `APPROVAL_DECISION_CHANNEL_NOT_ALLOWED`
51. `APPROVAL_DECISION_ENVELOPE_INVALID`

런타임:
52. `APPROVAL_DECISION_RUNTIME_BLOCKED` ← anchor(last)

## 2. 기존 구현 대조

정본 에러/경고 컨트랙트는 **부재**. 현행은 핸들러별 산발 HTTP 코드뿐이며 표준 코드 테이블·경고 채널 없음:

- 403(actor 미확인 fail-closed): `Mapping::approve` `Handlers/Mapping.php:247`(actorId `:36-53` null → 거부).
- 409(종결후 재결정·pending 중복): `Mapping.php:262` · `AdminGrowth::approvalDecide` `Handlers/AdminGrowth.php:1327`(이미처리) · `:1292`(pending 중복방지).
- enum 화이트리스트(422 성격): `AdminGrowth.php:1321` `in_array(['approved','rejected'])` — **유일한 정본 검증 패턴**.
- **Warning 계층 자체 없음** — `VALID_WITH_WARNINGS`/`COMMITTED_WITH_WARNINGS`(§27) 상태 부재이므로 경고 16코드에 대응할 흐름 없음. `Alerting::decideAction`의 `else → rejected` 무음 폴백(§Type 문서 참조)은 오히려 경고 없이 오분류.
- 표준 에러 바디(code/severity/retryable/evidence 참조)·correlation id 없음. `Alerting::actor` 헤더 위조(`Handlers/Alerting.php:33-35`)로 인해 에러/경고 감사 주체 자체가 신뢰 불가(BLOCKED_SECURITY).

## 3. 판정

- **Verdict**: **ABSENT**(정본 Error 52 / Warning 16 컨트랙트) · 현행 HTTP 코드 산발은 **PARTIAL**(403/409/enum-422 3종만·비표준·핸들러별 상이).
- **선행 의존**: 대부분의 Error 코드가 검증할 대상(§3.1 Approval / §3.2 Authority / §3.3 Delegation / §3.4 Assignment / §3.5 Sequential = **ABSENT**)을 전제 → **BLOCKED_PREREQUISITE**. Warning 채널은 State Machine(§27 `*_WITH_WARNINGS`) 신설 선행.
- **cover**: **0**(정본 컨트랙트 기준). 재사용 substrate = `AdminGrowth.php:1321` enum 검증(422 계열 확장 기반).

## 4. 확장/구현 방향 (설계)

- **표준 에러 바디**: `{ error_code, http_status, severity, retryable, correlation_id, evidence_ref }`. 52코드를 category별(NOT_FOUND / TENANT-SCOPE / ACTOR / STATE / ASSIGNMENT-LEASE / ACTION-AMOUNT / CONCURRENCY / VALIDATION-COMMIT / CHANNEL / RUNTIME)로 그룹핑해 재시도 가능성(retryable) 표기 — §52 Retry 대상(Lock Timeout/Temp Conflict 등)만 retryable=true, Business Validation Failure는 false.
- **Warning 16 → 비차단 흐름**: State Machine에 `VALID_WITH_WARNINGS`/`COMMITTED_WITH_WARNINGS`(§27) 신설 후, 경고를 삼키지 말고 §56 Audit + §57 Reconciliation 큐로 라우팅. `MANUAL_REVIEW_REQUIRED`(§64 #16)은 Commit 허용하되 후속 검토 outbox(§46 `MANUAL_REVIEW_REQUIRED`) 발행.
- **정본 검증 승격**: `AdminGrowth.php:1321` 화이트리스트를 전 핸들러 공통 검증기로 승격(Golden Rule=Extend). `Alerting`의 무음 `else` 폴백은 `ACTION_TYPE_UNKNOWN`(§63 #8) 명시 반환으로 대체.
- **Mandatory Control**: Mandatory Guard(§24) 실패는 전부 Fail-Closed → 대응 Error 코드 강제 발행(무음 통과 금지). 에러/경고 발행 주체는 canonical actor(`Mapping::actorId` 패턴) 확정 후에만 신뢰 — Alerting 헤더 위조(BLOCKED_SECURITY) 선치유.
- **실 구현 = 선행 6군 신설 후 별도 승인세션**. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_API_CONTRACT]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
