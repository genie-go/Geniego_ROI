# DSAR — Workflow Replay (§58)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §58 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 워크플로 Replay | grep 0 | `NOT_APPLICABLE` |
| DLQ 재시도 | `AdAdapters::retryDeliveryDlq`(AdAdapters.php:1187-1228 · maxAttempts 5 · `600*2^n`, 86400s 캡) · 라우트 `POST /v397/admin/dlq/replay`·`/v398/admin/dlq/replay_bulk`(routes.php:1927,1931-1932) | `LEGACY_ADAPTER`(**광고 전송 도메인**) |
| DLQ 테이블 | **`ad_delivery_dlq` 1개뿐**(AdAdapters.php:1127) — 나머지는 원 테이블 `status='failed'` 잔류 | `LEGACY_ADAPTER` |
| Replay 공격 방어 | `Paddle.php:1067`(5분 윈도) · `EnterpriseAuth.php:20`(state/nonce) · `PixelTracking.php:212,:255`(INSERT IGNORE) — **전부 "재전송 차단" 축** | `KEEP_SEPARATE_WITH_REASON` |
| 감사 원본 보관 | `paddle_events` raw payload(Paddle.php:18 — 주석이 "audit / replay" 명시) | `LEGACY_ADAPTER`(원본 보관 선례) |
| 멱등키 | `idempotency_key` **레포 grep 0** | `NOT_APPLICABLE` |

**★축 주의 — `replay` 어휘가 레포에 두 갈래로 존재하나 둘 다 §58이 아니다.**
① **DLQ replay**(AdAdapters·routes) = 실패한 **광고 전송의 재시도**. 형태는 "재실행"이나 워크플로 인스턴스 축이 아니다.
② **Replay 공격 방어**(Paddle·EnterpriseAuth·PixelTracking) = **재전송을 막는** 보안 축으로, §58의 **의도적 재실행과 방향이 정반대**다.
어휘 grep으로 "replay 있음"을 커버로 계산하면 역산이다. 다만 ①의 **백오프 공식·attempts 규율**은 실행 프리미티브로 인용 가능하다.

## 1. 원문 전사 + 판정 — Replay Type **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | EVENT_REPLAY | 부재 — 🔴 범용 이벤트 버스·구독 기전 grep 0 · 인접 = `raw_vendor_event`(Db.php:1017-1034 · `uq_rve_dedup` UNIQUE)에 원본 보관 | `LEGACY_ADAPTER`(원본 소스만) |
| 2 | TASK_REPLAY | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 3 | CALLBACK_REPLAY | 부재(승인) · 인접 = Paddle 멱등(`notification_id` UNIQUE · **`processed=1`일 때만 skip · `processed=0`은 재처리 허용**·272차) = **사실상 콜백 재처리 선례** | `LEGACY_ADAPTER` |
| 4 | TRANSITION_REPLAY | 부재 — 🔴 전이 규칙 선언 0(§63) → 재생할 전이 이력 자체가 없음 | `NOT_APPLICABLE` |
| 5 | DEAD_LETTER_REPLAY | 인접 실자산 = `AdAdapters::retryDeliveryDlq`(:1187-1228) + 라우트(routes.php:1927,1931-1932) — **광고 전송 도메인** | `LEGACY_ADAPTER` |
| 6 | RECONCILIATION_REPLAY | 부재(워크플로) · 인접 = `PgSettlement::reconcile`(:215) · `Connectors::roasReconciliation`(:902) · `Wms::reconcileChannelStock`(:2160) — **전부 금액/재고 대사** | `KEEP_SEPARATE_WITH_REASON` |
| 7 | AUDIT_RECONSTRUCTION | 부재 · 인접 = `audit_log`(AdminGrowth.php:157-159) · `journey_node_logs`(JourneyBuilder.php:50,:69) · `paddle_events`(Paddle.php:18) — **보관은 되나 재구성 코드 0** | `NOT_APPLICABLE`(재구성 부재) |

**실측 개수: 7 / 7 전사.** 커버리지 = 부재 3 · 어댑터 3 · 분리 1.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | replay_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow instance | 부재 · 인접 = `journey_enrollments`(🔴 `customer_id` 필수 :554) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | source execution | 부재 | `NOT_APPLICABLE` |
| 4 | source event | 부재 · 인접 = `raw_vendor_event`(Db.php:1017-1034) | `LEGACY_ADAPTER` |
| 5 | replay type | 부재 | `NOT_APPLICABLE` |
| 6 | replay reason | 부재 | `NOT_APPLICABLE` |
| 7 | requested by | 부재(replay 축) · 신원 산출 = `Mapping::actorId`(위조불가) | `LEGACY_ADAPTER`(신원 재사용) |
| 8 | replay from point | 부재 — Safe Point/노드 좌표 개념 전무 | `NOT_APPLICABLE` |
| 9 | dry run 여부 | 부재 · 인접 = `dry_run_diff`(Alerting.php:564) — **응답 패스스루 · 생산자 0(VACUOUS)** | `NOT_APPLICABLE` |
| 10 | side effect policy | 부재 | `NOT_APPLICABLE` |
| 11 | idempotency validation | 🔴 부재 — `idempotency_key` grep 0 · 인접 3패턴 = `claimSendOnce`(JourneyBuilder.php:672) · `notification_id` UNIQUE(Paddle) · `uq_rve_dedup`(Db.php:1034) | `NOT_APPLICABLE`(결번 · 5-3-2가 채움) |
| 12 | resource version validation | 부재 — 🔴 optimistic lock(`version`) grep 0 | `NOT_APPLICABLE` |
| 13 | started at | 부재(replay 축) | `NOT_APPLICABLE` |
| 14 | completed at | 부재(replay 축) | `NOT_APPLICABLE` |
| 15 | result | 부재 · 인접 = `retryDeliveryDlq` 반환 배열(:1187) | `LEGACY_ADAPTER` |
| 16 | status | 유사 존재(`ad_delivery_dlq.status` pending/done/failed :1217,:1223) 🔴 단 전이 규칙 선언 0 | `NOT_APPLICABLE` |
| 17 | evidence | 부재 · 인접 = `audit_log`·`journey_node_logs`·`paddle_events` | `LEGACY_ADAPTER` |

**실측 개수: 17 / 17 전사.** 커버리지 = 부재 11 · 어댑터 5 · 분리 1.

## 3. 규칙

- 🔴 **Replay 기본값 = Side-effect 방지 모드**(원문 명시). 신설 시 dry-run이 기본이고 실집행이 opt-in이어야 한다 — 반대로 만들면 승인 재생이 실 지출을 재발생시킨다.
- 🔴 **Financial System Task 의 Side Effect 재실행 전 외부 실행 상태 + Idempotency 확인**(원문 명시). 현행 `idempotency_key` **grep 0** = 확인할 수단이 없다 → **§58은 멱등 결번이 메워지기 전까지 실행 불가**.
- **멱등 패턴은 `claimSendOnce` 자연키 선점 마커 채택**(JourneyBuilder.php:672 · 커밋 전 크래시 시 재발송 차단·277차). 승인 결정의 재생 방지에 가장 정합하다.
- **백오프는 `AdAdapters` 공식 채택**(:1221 · `600*2^n`, 86400s 캡). 🔴 현행 **백오프 3공식 병존**(AdAdapters `600*2^n` · OpenPlatform `min(60,2^n)`분 :466-471 · Omnichannel 백오프 없음 :365) — 신설분이 4번째 공식을 만들면 안 된다.
- ★ **defer ≠ 실패 규율 유지**(Omnichannel:349,362 — quiet_hours/sto_defer는 attempts 미증가) · ★ **honest pending**(ChannelSync:6173·Catalog:1712 — 어댑터 부재 시 재시도 미소모). Replay도 이 규율을 따라야 한다.
- 🔴 **DLQ replay(광고 전송)를 승인 Replay로 재사용 금지 — 도메인 상이.** 단 라우트/백오프/attempts 규율은 프리미티브로 인용 가능. **DLQ 테이블은 `ad_delivery_dlq` 1개뿐**이므로 승인 축 DLQ는 신설 대상이다.
- 🔴 **Replay 공격 방어(Paddle:1067·EnterpriseAuth:20·PixelTracking:212)를 §58 커버로 계산 금지 — 방향이 정반대**(재전송 차단 ↔ 의도적 재실행).
- **AUDIT_RECONSTRUCTION 은 "로그가 있으니 된다"고 판단하지 마라.** 보관(`audit_log`·`journey_node_logs`·`paddle_events`)은 있으나 **재구성 코드가 0**이다.
- 🔴 7종·17종 **"있다고 가정"하고 배선 금지**.
