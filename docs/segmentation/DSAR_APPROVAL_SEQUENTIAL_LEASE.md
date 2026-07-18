# DSAR — Lease (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §47 LEASE — 필드 / 원칙
- **필드**: `lease_id` · `lock_id` · owner process id · lease start/end · heartbeat interval · last heartbeat · `renewal count` · `maximum renewals` · expiration policy · status · evidence.
- **★원칙**: 무기한 금지(모든 리스는 만료·최대 갱신 한계 보유).

## 2. 기존 구현 대조

- **claimed_at + TTL 시간 회수 = PARTIAL.** omni_outbox 는 claim_id/claimed_at 로 소유를 표시하고, 만료된(또는 소유자 미상) 'processing' 을 시간 기준으로 회수한다: `$staleTtl = now-900s`(`Omnichannel.php:395`) → `UPDATE omni_outbox SET status='queued', claim_id=NULL, claimed_at=NULL WHERE status='processing' AND (claimed_at IS NULL OR claimed_at < :ttl)`(`Omnichannel.php:395-399`). 이는 §47 의 "만료 없는 소유 금지 → 시간 만료 시 회수" 를 아웃박스 도메인에서 실현한다.
- 유사 시간회수가 잡(`Catalog.php:1700` 600s)·저니(`JourneyBuilder.php:396` 1800s)에도 존재 — 전부 claimed_at/updated_at + 고정 TTL 기반.
- **그러나 §47 계약의 핵심 부재**:
  - **리스 토큰·펜싱 없음.** lease_id·lock_id·lease token·fencing token 이 없다 — 회수는 claimed_at 시간 비교로만 이뤄져, 만료 직전 느린 소유자가 회수 후에도 커밋하면 이중 처리가 발생할 수 있다(fencing no hits·★실위험).
  - **heartbeat/renewal 없음.** heartbeat interval·last heartbeat·renewal count·maximum renewals 가 없다. 장기 작업이 진행 중임을 알리는 heartbeat 갱신이 불가능하고, TTL 은 고정 상수(900/600/1800s)라 작업 길이에 적응하지 못한다.
  - **명시 Lease 레코드 없음.** claimed_at 은 대상 행에 인라인된 컬럼일 뿐 owner process·expiration policy·status 를 가진 Lease 엔티티가 아니다.

## 3. 판정

- Verdict: **PARTIAL** — claimed_at + 고정 TTL 시간회수(`Omnichannel.php:395-399`)만 존재. **리스 토큰·펜싱·heartbeat·renewal count/limit·명시 Lease 레코드** 전무.
- 선행 의존: Lock(§46 PARTIAL·Fencing 부재)에 종속 → Fencing SoT 부재로 stale-owner 이중커밋 방어 **BLOCKED_PREREQUISITE**(★실위험).
- cover: 부분(claimed_at + TTL 시간회수 primitive) · token/heartbeat/renewal 0

## 4. 확장/구현 방향 (설계)

- 재사용: claimed_at + TTL 시간회수(`Omnichannel.php:395-399` — §66 CANONICAL 계열)를 Sequential Lease 만료 회수의 런타임 패턴으로 흡수 — 폐기 아닌 확장(§71 무후퇴: omni_outbox claim 유지).
- ★순신규 **명시 Lease 레코드 + 리스 토큰/펜싱**(§47 필드·§49). 고정 TTL 을 heartbeat interval + renewal count/maximum renewals 로 확장해 장기 작업 적응 + 무기한 금지 강제. 회수 시 리스 토큰을 무효화하고 fencing token 을 증가시켜 stale-owner 커밋 차단(§49 ★낮은 fencing token 차단).
- 순신규 heartbeat/last heartbeat 로 소유자 생존을 능동 감지(고정 TTL 폴백은 heartbeat 미수신 시에만). Lease 는 §46 Lock 에 1:1 종속(lease_id·lock_id) — Lock/Fencing SoT 신설과 동반 실효.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
