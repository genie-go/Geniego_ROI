# DSAR — 외부 Workflow Engine 통합 원칙 (§73)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §73 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

원문 §73 은 **"Temporal, Camunda, Flowable, Zeebe, Step Functions 또는 기타 엔진이 이미 존재하는 경우"** 를 전제로 한다. **이 전제는 현행에서 성립하지 않는다.**

| 항목 | 실측 | 판정 |
|---|---|---|
| Temporal | `backend/src` **grep 0** | `NOT_APPLICABLE` |
| Camunda | `backend/src` **grep 0** | `NOT_APPLICABLE` |
| Flowable | `backend/src` **grep 0** | `NOT_APPLICABLE` |
| Zeebe | `backend/src` **grep 0** | `NOT_APPLICABLE` |
| Step Functions | `backend/src` **grep 0** | `NOT_APPLICABLE` |
| BPMN | `backend/src` **grep 0** | `NOT_APPLICABLE` |
| **전용 브로커**(메시지 브로커·워크플로 브로커) | **부재** — 잡/큐 REAL 7종은 **전부 DB 테이블 기반**(`omni_outbox` · `catalog_writeback_job` · `channel_shipment_job` · `catalog_sync_job` · `ad_delivery_dlq` · `webhook_delivery`/`webhook_endpoint` · `raw_vendor_event`) · 러너 37종은 **얇은 어댑터** | `NOT_APPLICABLE` |
| **스케줄링 수단** | **OS cron 단일 수단**(`journey_cron.php:29-35` */5 · `install_crontab.sh` 정본 등재 · `stock_sync_cron.php`). **타이머 서비스·지연큐 부재** | `VALIDATED_LEGACY`(유일 수단) |
| **SQLite 폴백 호환** | **명시적 설계 제약**(`backend/src/Db.php` — MySQL 불가 시 SQLite 로 투명 폴백). 그 귀결로 `optimistic lock(version)`·분산락·`GET_LOCK` **전부 grep 0** · `Omnichannel::claimConditional`:427-447 이 **SQLite/MySQL<8 용 2단 폴백**으로 실재 | **제약** — §2 규칙 |

### 0.1 ★축 주의 — **grep 0 을 "엔진 부재"로 확대 해석하지 마라 (8회차 교훈)**

**이 문서의 grep 0 은 "이 벤더 엔진들을 쓰지 않는다"만 증명한다. "워크플로 실행 엔진이 없다"는 증명이 아니다.**

8회차에 정확히 이 확대 해석을 했고 **전수조사로 뒤집혔다**: `JourneyBuilder`(JourneyBuilder.php:498-700+)가 **노드 13종 · delay/wait 타이머 · 원자적 claim(:411) · 순회 멱등 `claimSendOnce`(:672) · 순환 감지(:512) · 노드 감사(`journey_node_logs` :50,:69) · cron 배선 REAL** 을 갖춘 **레포 유일 실 Flow 실행 엔진**으로 존재한다(→ [DSAR_APPROVAL_WORKFLOW_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_WORKFLOW_EXISTING_IMPLEMENTATION.md) §0).

**부재증명은 이름이 아니라 능력으로 하라.** 본 §73 의 결론은 **"엔진이 없다"가 아니라 "외부 엔진이 없다 = 내부 엔진(JourneyBuilder)만 있다"** 이다. 이 구분이 §73 전체의 판정을 결정한다.

### 0.2 결론 — §73 은 **조건부 미발동 · 계약만 확정**

외부 엔진이 부재하므로 §73 의 17개 매핑 항목은 **현재 구현 대상이 아니다**. 그러나 **원문이 요구하는 계약은 확정해 둔다**(`CONTRACT_ONLY` — 실 코드 0). 이는 두 가지 이유로 필요하다.

1. **미래 도입 시의 계약 고정** — 외부 엔진 도입은 §73 계약 없이는 Canonical 계약을 우회하게 된다(원문 마지막 문장).
2. **`BLOCKED_DUPLICATE_EXECUTION` 예방** — 외부 엔진을 도입하는 순간 `JourneyBuilder`(내부 엔진)와의 **이중 실행**(§72-24)이 즉시 실 표면이 된다. 현재 그 표면이 없는 유일한 이유는 외부 엔진이 없기 때문이다.

## 1. 원문 전사 + 판정 — **원문 17종**

**전제 미성립 고지**: 아래 17종은 전부 "외부 엔진이 이미 존재하는 경우" 적용되는 매핑이다. 현행 외부 엔진 grep 0 → **전 항목 `CONTRACT_ONLY`(계약만 확정 · 실 코드 0)**. 🔴 **"있다고 가정"하고 배선 금지.**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Canonical Workflow Definition ID 매핑 | 외부 엔진 0 · **Canonical 정의 스토어도 0**(`workflow_*` grep 0) → 매핑 양변 모두 부재 | `CONTRACT_ONLY` |
| 2 | Canonical Workflow Version 매핑 | 외부 엔진 0 · Canonical 버전 축 0 | `CONTRACT_ONLY` |
| 3 | External Deployment ID 매핑 | 외부 엔진 0 · 배포 개념 부재 | `CONTRACT_ONLY` |
| 4 | Canonical Instance ID 매핑 | 외부 엔진 0 · 인접 = `journey_enrollments`(마케팅 · `customer_id` 종속) | `CONTRACT_ONLY` |
| 5 | External Instance ID 매핑 | 외부 엔진 0 | `CONTRACT_ONLY` |
| 6 | Canonical Task ID 매핑 | 외부 엔진 0 · **Task 엔티티 자체가 0** | `CONTRACT_ONLY` |
| 7 | External Task ID 매핑 | 외부 엔진 0 | `CONTRACT_ONLY` |
| 8 | Canonical State Mapping | 외부 엔진 0 · **전이 규칙 선언 0**(`UPDATE … SET status=` 155건/44파일 전부 인라인 · 가드 4곳뿐: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `CONTRACT_ONLY` |
| 9 | Event Correlation | 외부 엔진 0 · **범용 이벤트 버스·in-process dispatcher·구독 기전 grep 0**(내부는 전부 직접 static 호출) · `OpenPlatform::emit`:311-328 은 **웹훅 발신 전용**(화이트리스트 · 구독 0이면 no-op · **예외 절대 미전파** :325) | `CONTRACT_ONLY` + `KEEP_SEPARATE_WITH_REASON`(emit 은 상관 기전 아님) |
| 10 | Tenant Context | 외부 엔진 0 · **현행 인접 결함 실재**: `admin_growth_approval` **tenant_id 없음**(`AdminGrowth:1324 WHERE id=?`) · `paddle_events` tenant_id 없음(Paddle.php:99) | `CONTRACT_ONLY` — 🔴 도입 시 `BLOCKED_CROSS_TENANT` 선재 위험 |
| 11 | Authorization Context | 외부 엔진 0 · 인접 REAL = `Mapping::actorId`(289차 · `apikey:{id}`/`user:{email}` 만 · 미확인 null→**403 fail-closed**) · 🟠 **`actor_type` 부재** | `CONTRACT_ONLY`(인접은 `VALIDATED_LEGACY`) |
| 12 | Idempotency | 외부 엔진 0 · **`idempotency_key` grep 0** · 자연키 선점 3패턴(`claimSendOnce` JourneyBuilder:672 · `notification_id` UNIQUE Paddle · `uq_rve_dedup` Db.php:1017-1034) | `CONTRACT_ONLY` — **5-3-2 가 채울 결번** |
| 13 | Audit Synchronization | 외부 엔진 0 · 인접 = `journey_node_logs`(:50,:69) | `CONTRACT_ONLY` |
| 14 | Retry State Mapping | 외부 엔진 0 · **현행 백오프 3공식 병존**(AdAdapters:1187-1228 `600*2^n` **86400s 캡** · OpenPlatform:466-471 `min(60,2^n)`분 · Omnichannel:365 **백오프 없음**) → 매핑 대상 상태가 **단일하지 않음** | `CONTRACT_ONLY` — **선결: 공식 통일**(`AdAdapters:1221` 채택 권고) |
| 15 | Cancellation Mapping | 외부 엔진 0 · 승인 도메인 Pause/Resume/Cancel 부재 · 인접 킬스위치 = `AdAdapters::executionEnabled`:34-40(**호출부 9곳 실배선 REAL**) | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(킬스위치 재사용 강제) |
| 16 | Migration Mapping | 외부 엔진 0 · 실행 중 정의 마이그레이션 개념 전무 | `CONTRACT_ONLY` |
| 17 | Reconciliation | 외부 엔진 0 · 대사 대상 자체가 부재 | `CONTRACT_ONLY` |

**실측 개수: 17 / 17 전사.** 원문 개수와 전사 개수 **일치**.
커버리지 = **`CONTRACT_ONLY` 17 / 17**(외부 엔진 전제 미성립 · 실 코드 0). 인접 실자산 참조 = `VALIDATED_LEGACY` 2(actorId · executionEnabled) · `KEEP_SEPARATE_WITH_REASON` 1(`OpenPlatform::emit`).

## 2. 규칙

- ★ **grep 0 → "엔진 부재" 확대 해석 금지.** 이 문서의 grep 0 이 증명하는 것은 **"외부 벤더 엔진 미사용"** 뿐이다. **내부 엔진 `JourneyBuilder` 는 실재한다**(8회차에 이 오판으로 결론이 뒤집혔다). **부재증명은 이름이 아니라 능력으로.**
- 🔴 **외부 Workflow Engine 도입 금지(현 단계).** 도입 시:
  - `JourneyBuilder`(내부 실 엔진)와의 **이중 실행**(§72-24)이 **즉시 실 표면**이 된다 → `BLOCKED_DUPLICATE_EXECUTION`.
  - **SQLite 폴백 호환**이라는 **명시적 설계 제약**과 충돌한다(외부 엔진은 예외 없이 전용 스토어·브로커를 요구한다).
  - **스케줄링=OS cron 단일 수단** 전제가 깨진다 — 배포·운영 표면(`install_crontab.sh` 정본)이 이원화된다.
  - → **5-3-2 의 해는 `JourneyBuilder` 에 `approval` 노드 추가 + `wait` event-mode 재폴링 패턴(:565-570) 재사용이다. 단 enrollment 컨텍스트 일반화가 선결**(`customer_id` 필수 · JourneyBuilder.php:551/:556).
- 🔴 **전용 브로커 도입 금지.** 잡/큐 REAL 7종이 전부 DB 테이블 기반이고 러너 37종이 얇은 어댑터인 것은 **우연이 아니라 SQLite 폴백 제약의 귀결**이다.
- 🔴 **`version` optimistic lock·분산락·`GET_LOCK` 도입 금지** — 전부 grep 0 이며, 그 부재가 **SQLite 폴백 호환 제약**의 직접 결과다. 조건부 UPDATE+rowCount CAS(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:394-447)를 채택하라.
- **★원문 마지막 문장은 무조건 계약이다**: **"외부 엔진이 존재한다는 이유로 Canonical Approval·Authorization·Evidence Contract를 생략하지 마라."** 미래에 외부 엔진이 도입되더라도 **Canonical 계약이 상위**이며, 외부 엔진은 그 계약의 **어댑터**일 뿐이다(`EXTERNAL_ENGINE_ADAPTER`). 외부 엔진의 상태·감사·권한을 Canonical 로 **대체 금지**.
- 🔴 **17종 "있다고 가정"하고 배선 금지.** 전 항목 `CONTRACT_ONLY` — **실 코드 0 임을 산출물에 정직하게 표기**해야 하며, 어떤 항목도 "구현됨"으로 계상 금지.
- **선결 부채 고지**: Retry State Mapping(#14)은 **현행 백오프 3공식 병존** 때문에 매핑 대상 상태가 단일하지 않다 → **외부 엔진 도입 여부와 무관하게 공식 통일이 선행 과제**다.
