# DSAR — Index / Performance (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 근거: §GROUND_TRUTH(ⓑ 전수조사) + §CONTRACTS §68 INDEX_PERFORMANCE. file:line 인용은 허용목록만.

## 1. 원문 전사 (Canonical Contract §68)

요구 인덱스/조회 축 (전사):

| # | 인덱스 축 | 대응 엔티티 |
|---|---|---|
| 1 | Tenant별 Decision | §12 Instance |
| 2 | Case별 Decision | §12 |
| 3 | Work Item별 Decision | §12 |
| 4 | Assignment별 Decision | §12 |
| 5 | Sequential Step별 Decision | §12·§49 |
| 6 | Slot별 Record | §13·§35 (★단일 Committed 강제) |
| 7 | Actor별 Decision | §35 |
| 8 | Action Type별 | §11·§35 |
| 9 | State별 | §27 |
| 10 | Validation Pending | §26 |
| 11 | Commit Pending | §31·§34 |
| 12 | Retry Pending | §52 |
| 13 | Recovery Pending | §53 |
| 14 | Conflict | §50 |
| 15 | Duplicate | §45 |
| 16 | Idempotency Key | §39 |
| 17 | Request Hash | §39 |
| 18 | Lock Expiration | §41 |
| 19 | Lease Expiration | §42 |
| 20 | Fencing Token | §43 |
| 21 | Decision Sequence | §37 |
| 22 | Outbox Pending / Failed | §46 |
| 23 | Snapshot | §54 |
| 24 | Reconciliation Mismatch | §57·§58 |
| 25 | ERP / Workflow Mismatch | §57 |

★핵심 유니크 인덱스(성능 아닌 정합 강제): **Slot별 단일 Committed Record**(§6·§13·§37·§45), **Idempotency Key**(§16·§39), **Fencing Token 단조성**(§20·§43).

## 2. 기존 구현 대조

정본 인덱스 전략 **부재**(ABSENT). §68 25개 축 중 대응 인덱스 매핑 대상이 **없다** — 인덱싱할 엔티티(Instance/Slot/Record/Command/Idempotency/Lock/Lease/Fencing/Outbox/Reconciliation)가 부재이기 때문:

- 현행 조회는 요청행 `status` 컬럼 WHERE만: `Catalog::approveQueue` `WHERE status='pending'`(`Handlers/Catalog.php:2397` CAS-lite) · `AdminGrowth.php:1327`(이미처리 가드) · `Mapping.php:262`(종결후 가드) · `:1292`(pending 중복방지).
- 인덱스 정본 **없음** — 마이그레이션은 172차 종료(CLAUDE.md), 이후 스키마는 핸들러 `ensureTables` 자가치유로 산발 생성. Decision 전용 복합 인덱스(Slot/Idempotency/Fencing/Outbox) 정의 0.
- §68 축별 현행:
  - #6 Slot별 Record 유니크 = **ABSENT**(DB UNIQUE 없음·앱레벨 409 가드만·[[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] §2 Decision Slot PARTIAL).
  - #16/#17 Idempotency Key/Request Hash = **ABSENT**(결정)/PRESENT(웹훅만 `Paddle.php:343-368` UNIQUE notification_id).
  - #18~#20 Lock/Lease/Fencing Expiration = **ABSENT**(결정). 근접=omni_outbox claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`·발송 전용·KEEP_SEPARATE).
  - #22 Outbox Pending/Failed = **ABSENT**(결정 아웃박스 없음).
  - #24/#25 Reconciliation/ERP Mismatch = **ABSENT**.
- ★성능 위험 실측: `Mapping::approve` approvals_json read-modify-write(`:273→:288`)가 트랜잭션/`FOR UPDATE` 없이 동작 → 인덱스 이전에 **TOCTOU**(동시 승인 경합). 인덱스 신설만으로 해소 불가(§41 Lock·§43 Fencing 동반 필요).

## 3. 판정

- **Verdict**: **ABSENT**(정본 인덱스 전략) · 현행 `status` 단일컬럼 WHERE는 인덱스 축 25개 중 State(#9) 성격만 우발 커버.
- **선행 의존**: 인덱스 대상 엔티티(Instance/Slot/Record/Idempotency/Lock/Lease/Fencing/Outbox/Reconciliation) 전부 **ABSENT** → 엔티티 신설 선행 → **BLOCKED_PREREQUISITE**.
- **cover**: **0**.

## 4. 확장/구현 방향 (설계)

- **정합 유니크 우선**(성능보다 정합): (a) `UNIQUE(tenant_id, slot_key)` on Committed Record — §37 "동일 Slot Single Committed" 강제(현행 앱레벨 409를 DB 레벨로 승격). (b) `UNIQUE(tenant_id, slot_id, idempotency_key)` — §39. (c) Fencing Token 단조 인덱스 — §43 낮은 토큰 Commit 차단.
- **조회 인덱스**: Validation/Commit/Retry/Recovery Pending(#10~#13)·Outbox Pending/Failed(#22)·Lock/Lease Expiration(#18/#19)은 워커 스캔 경로 → 복합 인덱스 `(status, available_at)`/`(status, expires_at)`. Reconciliation Mismatch(#24)·Conflict(#14)·Duplicate(#15)는 운영 대시보드 조회축.
- **재사용 확장**: 워커 클레임 인덱스 설계는 omni_outbox SKIP LOCKED 패턴(`Omnichannel.php:390-448`)을 **참조 원형**으로(복사 아님·KEEP_SEPARATE). Idempotency 유니크는 Paddle 웹훅 패턴 일반화(VALIDATED_LEGACY).
- **성능≠정합 분리**: 인덱스는 조회 최적화, 동시성 안전은 §41 Lock/§43 Fencing/§44 Optimistic Version이 담당. TOCTOU(Mapping approvals_json)는 트랜잭션 경계(§48) + Lock으로 별도 해소.
- **실 구현 = 엔티티 신설 후 별도 승인세션**. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_CACHE_POLICY]] · [[DSAR_APPROVAL_DECISION_API_CONTRACT]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
