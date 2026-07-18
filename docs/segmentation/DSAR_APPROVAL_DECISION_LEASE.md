# DSAR — Lease (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### LEASE (§42)

필드: `lease_id`·`lock id`·`lease start/end`·`heartbeat interval`·`last heartbeat`·`renewal count`·`maximum renewals`·`expiration policy`·`status`·`evidence`.

★ 규칙: **무기한 리스 금지** — lease 는 만료·갱신 상한을 가진다.

## 2. 기존 구현 대조

### 결정 도메인 = ABSENT
- 승인 4핸들러에 **lease/heartbeat/renewal 개념이 전무**. 결정 처리는 단발 요청-응답이며, 점유 시간·갱신·만료 정책이 없다.
- lease_id·heartbeat interval·renewal count·maximum renewals = **no hits** (결정 도메인).
- §41 Lock 이 결정 도메인에 ABSENT 이므로, 그에 결속되는 Lease(§42 `lock id` 참조) 역시 성립 대상이 없다.

### 인접 자산 = omni_outbox 15분 리스 (메시지 발송, 참조 원형)
- `Omnichannel::claimBatch`(`Omnichannel.php:390-448`)의 stale 회수 로직이 **암묵적 리스**를 구현: 15분(`900`초) 초과한 `status='processing'` 행을 `queued` 로 되돌려 재발송(`Omnichannel.php:394-399`). `$staleTtl = gmdate(..., time() - 900)`(`:395`).
- 그러나 이는 **메시지 발송 워커의 점유 만료**(무기한 점유 방지)이지 **결정 처리 리스**가 아니다. heartbeat·renewal count·maximum renewals·expiration policy enum 이 없고, 목적(발송 유실 방지)이 다르다.

## 3. 판정

- Verdict: **ABSENT** (결정 도메인) / omni_outbox 15분 리스 = **KEEP_SEPARATE** (메시지 발송용·참조 원형).
- 선행 의존: §41 LOCK(lease 는 lock 에 결속, `lease.lock id`). Lock 이 ABSENT/BLOCKED_PREREQUISITE 이므로 Lease 도 연쇄 → **BLOCKED_PREREQUISITE**.
- cover: **0** (omni 15분 리스는 인접 메시지 자산·결정 리스 아님).

## 4. 확장/구현 방향 (설계)

- **패턴 재사용(KEEP_SEPARATE)**: `Omnichannel.php:394-399` 의 stale-TTL 회수(고정 15분)를 **개념 원형**으로 참조하되, Decision Lease 는 heartbeat/renewal count/maximum renewals/expiration policy 를 갖춘 **별도 엔티티**로 신설. 고정 15분 하드코딩을 결정에 전용 금지 — 결정 검증/커밋 지속시간에 맞는 정책 필요.
- **무기한 금지(§42 ★)**: 장기 실행 검증·복구 워커가 lock 을 무기한 점유하지 않도록 heartbeat 기반 갱신 + maximum renewals 상한. 만료 시 §53 Recovery 로 이관.
- **Lock 종속**: §41 Decision Lock 신설이 선행. Lease 는 그 위에 얹힌다. 실 구현 = 별도 승인 세션.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
