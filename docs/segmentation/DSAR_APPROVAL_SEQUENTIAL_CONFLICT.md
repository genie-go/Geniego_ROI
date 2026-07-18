# DSAR — Conflict (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §56 CONFLICT TYPE
`MULTIPLE_ACTIVE_STAGES/LEVELS/STEPS` · `DUPLICATE_TRANSITION/EVENT/CURSOR_UPDATE` · `SEQUENCE/DEPENDENCY/VERSION/STATE/CURSOR_CONFLICT` · `ASSIGNMENT/AUTHORITY/DELEGATION/LOCK/LEASE/FENCING_TOKEN/IDEMPOTENCY_CONFLICT` · `SKIP/RECOVERY/REPLAY_CONFLICT` · `EXTERNAL_WORKFLOW_CONFLICT` · `CUSTOM`.

### 필드
conflict_id · instance_id · stage/level/step instance ids · transition/event ids · conflict type · source/expected/actual state · expected/actual cursor · severity · detected_at · resolution policy · winning transition · resolved_by/at · status · evidence.

## 2. 기존 구현 대조

- **Conflict 엔티티 ABSENT.** 충돌을 1급 레코드로 적재하고(conflict type·expected/actual state·winning transition·resolution policy) 심판하는 계층은 없다.
- 실존하는 것은 **동시성 double-claim 방지 하나** — 충돌을 기록하는 게 아니라 발생 자체를 CAS 로 차단하는 방식:
  - catalog_writeback_job 선점 CAS(`Catalog.php:1729`, `SET ... WHERE ... AND status IN(...)`): 두 워커가 동일 잡을 잡으려 하면 affected-rows 로 한쪽만 승리, 나머지는 조용히 탈락. **암묵 winning transition** 은 있으나 패배 측을 CONFLICT 레코드로 남기지 않는다.
  - 유사 primitive: `JourneyBuilder.php:415-425`(노드 선점)·`Omnichannel.php:405`(SKIP LOCKED).
- 그 외 충돌 대응은 상태체크 409(`AdminGrowth.php:1327` 재처리)·재승인 차단(`Mapping.php:262`)이나, 이는 **단일 커넥션의 순차 재입력 방지**이지 동시 전이 심판이 아니다.
- **부재**: MULTIPLE_ACTIVE_STAGES/LEVELS/STEPS(다단 ABSENT)·CURSOR_CONFLICT(Cursor ABSENT §45)·FENCING_TOKEN_CONFLICT(fencing 0 hits)·VERSION_CONFLICT(낙관적 version CAS 부재)·resolution policy·severity·detected_at 기록 전무.

## 3. 판정

- Verdict: **PARTIAL** — 동시성 double-claim 방지(`Catalog.php:1729`)만 존재. 충돌 감지·적재·resolution policy·winning transition 기록 **없음**.
- 선행 의존: 충돌 유형 대부분이 참조하는 Stage/Level/Step·Cursor·Fencing·Version·Assignment/Authority/Delegation 이 ABSENT(§13~§15·§45·§49·§20·§3.3·§3.4) → **BLOCKED_PREREQUISITE**.
- cover: 부분(CAS double-claim 차단 1종) · 그 외 0

## 4. 확장/구현 방향 (설계)

- 순신규 **conflict 레지스트리**. §51 방지 수단이 뚫렸을 때(복수 Active·Duplicate Transition/Event/Cursor·Version/State/Cursor Mismatch·Stale Lock/Fencing) 를 감지·적재하고, resolution policy 로 winning transition 을 결정, 패배 측을 BLOCK(§40)/Manual Review 로 라우팅.
- 재사용 기반: 현재 암묵적 CAS 승패(`Catalog.php:1729`·**CANONICAL**)를 명시 conflict 판정으로 승격 — affected-rows 0 인 패배 측을 `CONFLICT`(§20 Result)로 기록하고 winning transition 참조를 남긴다. `JourneyBuilder.php:415-425`·`Omnichannel.php:405` 가 승패 판정 패턴의 참조정본.
- ★실위험 무후퇴 필수: Fencing/Version 부재로 인해 현재는 **패배 측 stale commit 이 조용히 상태를 덮어쓸 수 있다** — conflict 를 침묵 탈락이 아니라 감지·기록·심판으로 전환해야 안전. Mandatory Control(§59 복수 Active Scope·§61 Runtime Guard). severity/resolution policy 명시, Fail Closed.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
