# EPIC 02-C — Knowledge Graph Projection, Synchronization & Reconciliation (정식 마스터)

> **근거**: 02-A(저장=graph_node/edge 확장)·02-B(Node/Edge Schema)·01-D(승인) + 288차 **기존 Sync 인프라 전수조사**(실코드). **비파괴**: 설계·Registry·정책만. 코드변경 0. 운영 Graph 전환·기존 Worker 삭제·대량 재구축 없음(§31).
> **§32 통합**: 18개 파편 대신 본 마스터가 Projection Source Registry·Pipeline·Idempotency·Ordering/Late·Upsert·Tombstone·Retry/DLQ/Replay·Rebuild·Reconciliation·Drift·SLO·Observability·Security·기존Sync 통합계획·Test Matrix를 통합. ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_PROJECTION.md`](../architecture/ADR_KNOWLEDGE_GRAPH_PROJECTION.md).
> **핵심 제약(중복 금지)**: 신규 poller·이벤트버스·MQ 신설 **금지**. 기존 **멱등 chokepoint 하류**에서만 소비(원천 재파싱 시 이중계산). Node/Edge Type은 02-B Registry 등재분만.

---

## 1. 기존 Sync 인프라 (재사용 대상·실코드)
| 자산 | 위치 | 성격 | KG 재사용 |
|---|---|---|---|
| **멱등 chokepoint** | saveOrders(ChannelSync:4305, UNIQUE tenant,channel,channel_order_id)·saveProducts(:4259)·persistMetricRows(Connectors:1836)·upsertAdInsights(dedup_key sha256) | 자연키 upsert | ★Projection은 **여기 하류**에서 소비 |
| **emit 훅** | OpenPlatform::emit('order.created'/'order.cancelled') ChannelSync:4377/5730/5668 | 이미 주문 chokepoint 배선 | graph emit 추가 지점 |
| **아웃박스+DLQ** | webhook_delivery+drainPending(OpenPlatform:341)·ad_delivery_dlq+retryDeliveryDlq(AdAdapters:1187, 지수백오프 600*2^attempts·max5) | transactional outbox | Projection 워커 템플릿 |
| **정규화 파이프라인** | raw_vendor_event→normalized_activity_event(DataPlatform:387-483, dedup_key UNIQUE·status머신) | Layer1→2 | 상류 피드(고아 해소 겸) |
| **신선도** | connector_sync_log(tenant×channel 최신, Connectors:1586) | freshness(커서 아님) | Projection cursor 테이블 선례 |
| **배치 러너 SSOT** | install_crontab.sh + bin/*_cron.php | crontab(앱 스케줄러/MQ 없음) | graph_projection_cron 추가 |
| **Reconciliation 선례** | roasReconciliation(Connectors:902)·rollupSettlementsCore(commerce_cron 끝·웹훅) | 원천↔집계 주기재계산 | Drift 탐지 템플릿 |

**증분 실태**: 커서/watermark 아님 = **고정 lookback 윈도우 폴링 + 자연키 멱등 upsert**. 진짜 커서는 catalog_sync_job(페이지네이션)·DLQ next_retry_at뿐. → Projection도 **동일 철학**(재fetch+멱등) 채택.

## 2. 절대 원칙 매핑(§3)
- **재구축 가능**: Graph는 파생 — channel_orders/performance_metrics(SoT)에서 Full/Tenant/Type/기간 Rebuild(§18).
- **멱등**: 이벤트 중복 도착해도 graph_node/edge 무오염(02-B UNIQUE + upsert).
- **순서 불신**: 고정윈도우 재fetch가 out-of-order/late를 자연 흡수. Stale은 source_version 비교로 무시.
- **Tenant 경계=Projection 단계부터**: 도출 tenant(webhook 본문 불신 ChannelSync:5620) — scope 불명시 Node/Edge 미생성·격리.
- **단일 Canonical Pipeline**: chokepoint 하류 단일 소비. 중복 Worker 금지.
- **무후퇴**: 기존 RDB/분석/자동화/API 병행 — Graph는 점진 확대.

## 3. Projection Source Matrix (§33)

| Source ID | Source System | Object | Node/Edge Target | Sync Mode | Ordering | Delete Signal | Rebuild | Scope | SLO | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| PS-ORD | ChannelSync | Order(chokepoint) | NT-ORD/ET-CUS-000001 PURCHASED | **Event(emit)** + Batch backup | source_version | order.cancelled→Tombstone | channel_orders | Tenant | 수분 | LOW |
| PS-ORD-CUS | recordCrmPurchase | Customer↔Order | NT-CUS/ET-CUS-000001 | Event(chokepoint 하류) | updated_at | DSAR 익명화 | crm_customers | Tenant | 수분 | LOW |
| PS-SKU | saveProducts | SKU | NT-SKU/ET-INV STOCKED_AS | Batch(고정윈도우) | updated_at | 미노출→Deprecate | channel_products/wms | Tenant | 시간 | LOW |
| PS-ADM | persistMetricRows | AdCampaign | NT-CMP/ET-MKT ATTRIBUTED_TO | Batch cron(매시) | 고정 7일 재fetch | — | performance_metrics | Tenant | 시간 | LOW |
| PS-ATT | attribution_cron | Touch↔Campaign↔Order | ET-ORD-000002/ET-MKT-000001 | Batch(*/30) | 재집계 | 취소제외 SSOT | attribution_result | Tenant | 30분 | LOW |
| PS-CRT | OrderHub creator_id | Creator↔Order/Content | ET-CRT-000001/002 | Event(하류) | — | — | influencer_store | Tenant | 수분 | LOW |
| PS-ID | CRM resolveIdentities | Customer↔Identity | ET-CUS-000002 CONNECTED_TO | Batch(승인병합) | merge_link | 승인 철회 | crm identity(D/E) | Tenant | 시간 | LOW |
| PS-NORM | normalized_activity_event | (범용 이벤트) | 다양 | Event(status머신) | dedup_key | status | raw_vendor_event | Tenant | 수분 | MED(고아 해소) |
| PS-CNV | pixel_events | ConversionEvent↔Session | ET-MKT-000004 | Batch(볼륨) | event_time | — | pixel_events | Tenant | 시간 | **PERF(볼륨)** |

## 4. Canonical Projection Pipeline & Matrix (§6/§34)
**표준 20단계**(§6): 수신→Auth/Signature→Tenant Scope→Source Schema Validation→Dedup→Ordering/Version→Source 보강→**Entity Resolution**→Relationship Resolution→Node Schema Validation→Edge Schema Validation→Data Classification→Sensitive 제거→**Node Upsert**→**Edge Upsert**→Tombstone/Delete→Lineage→Projection Log→Metrics→Ack. 실패 단계·원인 기록·재처리 가능 상태 보존.

| Pipeline ID | Source | Node Types | Edge Types | Idempotency Key | Retry | DLQ | Replay | Reconcile | Status |
|---|---|---|---|---|---|---|---|---|---|
| PP-ORDER | PS-ORD/PS-ORD-CUS | Order,Customer,SKU | PURCHASED,CONTAINS* | tenant+channel+channel_order_id+ver+proj_ver | 지수백오프 max5 | graph_projection_dlq | 재emit(멱등) | edge count vs channel_orders | CANDIDATE |
| PP-ADS | PS-ADM/PS-ATT | AdCampaign,Touch | ATTRIBUTED_TO,DERIVED_FROM | tenant+campaign_ext_id+period+proj_ver | 지수백오프 | 동일 | attribution_cron 재집계 | roasReconciliation 병기 | CANDIDATE |
| PP-CREATOR | PS-CRT | Creator,Content | CREATED_BY,INFLUENCED_BY | tenant+creator_id+order_id | 지수백오프 | 동일 | 재emit | — | CANDIDATE |
| PP-IDENTITY | PS-ID | Customer,Identity | CONNECTED_TO,POSSIBLY_SAME_AS | tenant+a_id+b_id | 제한(승인) | — | resolve 재실행 | merge_link 대조 | 재사용(D/E) |

*CONTAINS는 OrderItem BLOCKED → PP-ORDER는 Order/Customer만 1차, SKU 라인은 OrderItem 구현 후.

## 5. Idempotency / Ordering / Late (§8/§9/§10)
- **Idempotency Key** = `tenant+source_system+source_account+source_object_type+source_record_id+source_version(updated_at)+projection_version` (이벤트형은 +event_id/delivery_id). = 02-B Uniqueness + 기존 자연키 승계.
- **Ordering**: 고정윈도우 재fetch가 out-of-order 흡수. Stale(수신 source_version < 저장분) → **Ignore Stale**(기본) / 시간가변 Type은 Historical Version 저장(02-B valid_from). Node/Edge Type별 정책.
- **Late Event**(지연 Conversion/Refund/Shipment/과거 Touch): 현재상태 무조건 덮어쓰기 금지 → **valid_from/to 수정 또는 역사 관계 추가**(Temporal). Refund→ET-CUS-000001 확정매출 역분개 반영(취소제외 SSOT 승계).

## 6. Upsert / Tombstone (§11/§12/§13)
- **Node Upsert**: Type 등록·CE 승인·Unique Key·Tenant·source_version·필수필드·민감정보 부재·기존 상태·Tombstone·ER 결과 검증. **Source별 복제 금지**(SourceObject Reference로 연결).
- **Edge Upsert**: Type 등록·**Source/Target Node 존재**·Tenant 일치·허용 타입·Cardinality·Unique·Temporal·Confidence·기존 상태. **필수 Node 부재 시**: Dependency Retry / Pending Edge / Source Node 먼저 Projection / DLQ. **Placeholder Node 무조건 생성 금지**.
- **Tombstone**: order.cancelled emit→Edge valid_to 설정/Node Tombstone. 거래·결제·감사·분석 근거는 물리삭제 금지·Audit/Lineage 유지.

## 7. Retry / DLQ / Replay (§15/§16/§17)
- **Retry 가능**: 네트워크·RateLimit·Lock·Timeout·일시 장애. **차단**: Schema Validation 실패·Tenant 불일치·권한·잘못된 Type·민감정보 위반·영구삭제 Source·충돌. **지수백오프+Jitter, 무한재시도 금지**(ad_delivery_dlq 패턴 승계: 600*2^attempts·max5).
- **DLQ** `graph_projection_dlq`(원본 Event·Tenant·Source·Failure Stage·Error·Retry History·Schema/Projection Version·Remediation). **대시보드+경고**(방치 금지).
- **Replay**: Event/Record/Run/기간/Tenant/Workspace/Connector/Node·Edge Type/Schema Version 범위. **멱등**(재emit=upsert).

## 8. Full Rebuild / Incremental (§18/§19)
- **Full Rebuild**: Scope 결정→Consistent Read(channel_orders 등 SoT)→Rebuild Version→임시 Projection→Count/Referential Integrity/Tenant Scope 검증→Quality Gate→**Shadow Compare**→Cutover→Rollback Window→이전 Archive. **운영 Graph 직접 비우기 금지**.
- **Incremental**: 기존 철학대로 **고정윈도우 재fetch+멱등**(커서 미도입). catalog_sync_job식 페이지커서는 대량 카탈로그만. Checkpoint=성공 범위까지만.

## 9. Reconciliation & Drift (§20/§21)
- **Reconciliation Engine**(roasReconciliation/rollupSettlementsCore 패턴): graph_edge count vs channel_orders·Missing/Extra Node·Edge·Property/Version/Tenant Drift·Deleted Source 잔존·Orphan Edge·Duplicate·Lineage Missing·Stale 비교. 주기 cron.
- **Drift 상태**: IN_SYNC/MINOR/MAJOR/CRITICAL_DRIFT/RECONCILING/REBUILD_REQUIRED/MANUAL_REVIEW/BLOCKED_SECURITY. Drift→자동수정/Replay/Rebuild/수동검토 선택.

## 10. SLO / Observability (§22/§23/§27)
- **SLO**: Event/Webhook 수분·광고 API 수시간·Batch Analytics 일·Reference 주. 측정=Event Lag·Source-to-Graph Lag·Queue Lag·Processing·Reconciliation Age·Last Successful.
- **Metrics**: Runs·Processed·Success/Failure/Duplicate/Stale Rate·DLQ·Retry·Lag·Drift·Rebuild Duration·Node/Edge Upsert·Tombstone·**Cross-Tenant Block**·Schema Validation Failure. **로그에 민감정보 금지**.
- **Projection Job 메타**(§7): projection_run_id·tenant·source·cursor_start/end·event/success/skipped/duplicate/stale/failed/tombstone_count·status·retry·lineage_batch·evidence.

## 11. Security (§26) — ★위험 명시
- Projection 단계 차단: Cross-Tenant Event·잘못된 Credential Source·**위조 Webhook**·Replay Attack·과도 Payload·민감정보 복제·Admin 오용·Demo/Prod 혼합·Unauthorized Source Account·Graph Injection.
- ⚠️ **발견 위험**: 채널 인바운드 웹훅(ChannelSync:5612)은 **HMAC 서명 검증 없음**(토큰만). KG가 웹훅 이벤트를 신뢰 소스로 쓰기 전 **HMAC 도입 권고**(현재는 Batch 재fetch가 백업이라 정합은 유지되나, 위조 이벤트로 그래프 오염 가능 → 신뢰경로엔 서명 필수). **Security Risk 1(웹훅 HMAC 부재)**.

## 12. 기존 Sync 통합 계획 (§28 — 삭제 없이)
- **신설 금지**: 주문/상품 poller(commerce_sync_cron+saveOrders 커버)·이벤트버스/MQ(normalized_activity_event/OpenPlatform outbox로 충분)·원천 재파싱 Projection(이중계산).
- **확장**: OpenPlatform::emit에 graph 이벤트 추가 → graph_projection outbox(webhook_delivery 패턴 복제) → graph_projection_cron 워커 → graph_node/edge upsert. Reconciliation은 rollup 패턴 복제.
- 기존 이중경로(폴링+웹훅·저장+cron+웹훅)는 이미 chokepoint 멱등 수렴 → Projection도 chokepoint 하류 단일 소비.

## 13. Test Matrix (§29)
- 단위: Node/Edge Upsert·Idempotency·Stale·Late·Tombstone·Scope·Schema Validation.
- 통합: Event/Webhook/CDC(해당없음)/Batch→Projection·Retry·DLQ·Replay·Reconciliation.
- E2E: Source 변경→Graph→Query→분석→자동화 근거 반영.
- 보안: Cross-Tenant 차단·Demo/Prod 혼합 차단·Invalid Credential·Forged Webhook·Sensitive 제거.
- 회귀: 기존 API·분석·자동화·대시보드·RDB 경로 무변경(무후퇴).

## 14. §36 완료 보고 수치
조사 기존 Sync/Projection 구현 7군(chokepoint·emit·outbox·DLQ·정규화·신선도·reconciliation) · Projection Source 9(PS-*) · Pipeline 4(PP-*) · Event-Driven 3(Order/Creator/Norm) · CDC 0(스택 미보유) · Webhook 1(order·⚠️HMAC부재) · Batch 4(Ads/Attribution/SKU/Conversion) · Full Rebuild 대상=전 Node/Edge(SoT 재구축 가능) · Reconciliation 대상 3(Order edge·roas·identity) · Duplicate Pipeline 후보 0(신설 금지 확정) · **Security Risk 1(웹훅 HMAC 부재)** · Tenant Isolation Risk 0(도출 tenant fail-secure) · Schema Compatibility Risk 1(projection_version 혼합 방지 필요) · 테스트/Shadow=Shadow Compare 계획 · 문서=본 마스터+ADR+PM · 남은리스크=웹훅 HMAC·볼륨노드(Conversion/Raw)·A 실적재·OrderItem BLOCKED · **EPIC02-D(Query/Traversal/Security/Validation Gate) 준비 완료**. 코드변경 0.
