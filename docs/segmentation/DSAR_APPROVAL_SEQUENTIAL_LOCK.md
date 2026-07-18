# DSAR — Lock (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §46 LOCK — 필드 / TYPE
- **필드**: `lock_id` · `instance_id` · scope type · scope id · lock type · owner process/worker id · `lock token hash` · `fencing token` · acquired/expires/released_at · version · status · evidence.
- **LOCK_TYPE**: `INSTANCE/STAGE/LEVEL/STEP_TRANSITION` · `CURSOR_UPDATE` · `RECOVERY` · `RECONCILIATION` · `SYSTEM`.

## 2. 기존 구현 대조

- **CAS 조건부 UPDATE = 사실상 전이 락(PARTIAL).** catalog_writeback_job 선점은 조건부 UPDATE 로 소유권을 판정한다: `UPDATE ... SET status='processing' ... WHERE id=? AND status IN ('queued','awaiting_credentials')`(`Catalog.php:1726`), 이어 `if ($claim->rowCount() < 1) continue`(`Catalog.php:1730`)로 affected-rows 0 이면 타 워커 선점으로 간주해 중복 처리를 차단한다(`Catalog.php:1726-1730`). 이는 §46 의 `STEP_TRANSITION` Lock 을 **상태 전이 시점에 흉내** 낸다 — 두 워커가 같은 항목을 동시에 잡지 못하게 하는 상호배제.
- 동일 패턴이 저니(`JourneyBuilder.php:415-425`)·ChannelSync(`ChannelSync.php:6148`)에도 존재. Omnichannel 은 FOR UPDATE SKIP LOCKED(`Omnichannel.php:405`)로 DB 행 락을 직접 사용한다.
- **그러나 §46 계약의 핵심 부재**:
  - **Fencing Token 없음.** lock token hash·fencing token 필드가 없다(fencing no hits·★실위험). 느린 워커가 만료 후에도 커밋하는 것을 차단할 수단이 없다 — CAS 는 선점 순간만 보호하고 이후 stale 커밋을 막지 못한다.
  - **명시 Lock 레코드 없음.** lock_id·owner process·acquired/expires/released_at·lock type(CURSOR_UPDATE/RECOVERY/RECONCILIATION)·scope 를 가진 Lock 테이블이 없다 — 락은 status 컬럼에 인라인된 암묵 상태일 뿐 관측·감사 불가.
  - **scope 다양성 없음.** INSTANCE/STAGE/LEVEL/STEP/CURSOR_UPDATE 스코프는 다단·Cursor 자체가 ABSENT 이라 존재하지 않는다.

## 3. 판정

- Verdict: **PARTIAL** — CAS 조건부 UPDATE(`Catalog.php:1726-1730`)가 STEP_TRANSITION 락을 사실상 흉내. 그러나 **Fencing Token·명시 Lock 레코드·lock type/scope·만료/해제 추적** 전무.
- 선행 의존: CURSOR_UPDATE/STAGE/LEVEL/STEP Lock 은 Cursor·다단(ABSENT)에 막힘 → **BLOCKED_PREREQUISITE**. Fencing 부재는 ★실위험(§59 Critical Gap: Fencing 없음).
- cover: 부분(CAS 전이락 primitive) · Fencing·명시 Lock·scope 0

## 4. 확장/구현 방향 (설계)

- 재사용: CAS 조건부 UPDATE(`Catalog.php:1726-1730` **CANONICAL**)를 STEP/INSTANCE_TRANSITION Lock 획득의 런타임 primitive 로 채택 — 폐기 아닌 확장(§71 무후퇴: catalog_writeback_job 선점 유지).
- ★순신규 **명시 Lock 레코드 + Fencing Token**(§46 필드·§49). CAS 만으로는 stale-writer 를 못 막으므로 lock token hash + 단조증가 fencing token 을 필수화 — 낮은 fencing token 프로세스의 커밋 차단(§49 ★). Fencing 부재는 이 EPIC 의 최우선 실위험.
- 순신규 lock type(CURSOR_UPDATE/RECOVERY/RECONCILIATION)·scope·만료/해제 타임스탬프로 락을 관측·감사 가능화(§59 Critical Gap: Idempotency/Lock/Fencing 없음 금지). CURSOR_UPDATE/STAGE/LEVEL/STEP Lock 은 각 선행 SoT 신설 후 실효.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
