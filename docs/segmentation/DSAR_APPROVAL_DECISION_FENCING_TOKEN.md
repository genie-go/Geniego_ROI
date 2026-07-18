# DSAR — Fencing Token (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세 · ★실위험.

## 1. 원문 전사 (Canonical Contract)

### FENCING_TOKEN (§43)

적용 지점: `Decision Validation Finalization`·`Commit`·`Record 생성`·`Slot 점유`·`Snapshot`·`Sequential Completion Reference`·`Outbox`·`Recovery`·`Reconciliation Repair`.

★ 규칙: **낮은 토큰의 Commit 차단** — fencing token 은 단조 증가(monotonic)해야 하며, 오래된(작은) 토큰을 든 stale worker 의 Commit 을 거부한다.

## 2. 기존 구현 대조

### 결정 도메인 = ABSENT
- 승인 4핸들러에 **fencing token 개념이 전무**. stale worker 가 지연 후 뒤늦게 Commit 을 시도해도 이를 걸러낼 단조 토큰이 없다.
- monotonic token·"낮은 토큰 차단" 비교 로직 = **no hits** (결정 도메인).

### ★실위험 — claim_id 는 마커이지 단조 토큰이 아니다
- `Omnichannel::claimBatch`(`Omnichannel.php:390-448`)의 `$claimId = bin2hex(random_bytes(8))`(`Omnichannel.php:392`)는 **워커 소유 마킹용 랜덤 값**이다. 매 배치마다 무작위 생성되며 **단조 증가하지 않는다**.
- 따라서 claim_id 로는 "누가 먼저/나중인가"를 판정할 수 없다 — 오래된 워커의 claim_id 가 새 워커의 것보다 크거나 작을 확률이 반반. **stale worker 의 Commit 을 차단하지 못한다.**
- 이를 fencing token 으로 오인해 결정 Commit 방어에 전용하면 **stale write 방어가 무력화**된다(가장 위험한 오해). claim_id 는 15분 리스 회수(`Omnichannel.php:394-399`)와 조합해 "잃어버린 소유권 회수"만 담당하지, 늦은 쓰기 순서 보장은 하지 못한다.

## 3. 판정

- Verdict: **ABSENT** · ★**실위험**(claim_id 를 fencing token 으로 오인 금지 — 랜덤 마커·비단조).
- 선행 의존: §41 LOCK(fencing token 은 lock 획득 시 발급)·§44 OPTIMISTIC_VERSION(단조 version 소스). Lock 부재 → **BLOCKED_PREREQUISITE**.
- cover: **0** (claim_id 는 대응 자산 아님·오히려 반례).

## 4. 확장/구현 방향 (설계)

- **순신규 단조 토큰**: fencing token 은 §41 Lock 획득 시 **단조 증가 시퀀스**(또는 version 기반)로 발급. Commit(§33)·Record(§35)·Slot 점유·Snapshot·Outbox 마다 "현재 토큰 ≥ 저장된 토큰" 검증, 낮으면 차단(§43 ★).
- **claim_id 재사용 금지(실위험)**: `Omnichannel.php:392` 의 `random_bytes` claim_id 를 fencing 으로 전용하면 stale 방어 실패. 랜덤 ID 는 소유 마킹 전용 — fencing 은 반드시 monotonic.
- **Version 결속**: §44 Optimistic Version 의 단조 version 을 fencing token 원천으로 사용하면 일관. §48 Transaction Boundary 2)Fencing 검증이 3)Expected Version 검증 앞에 위치. 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
