# Knowledge Graph Ingestion & Edge Writer (forward-looking 설계서)

> **시퀀스 정정(288차)**: 핸드북 정식 **02-B는 Node & Edge Schema Design**이다. 본 문서는 초기 예단으로 "02-B"로 선작성됐으나, 실제로는 **스키마 설계(정식 02-B) 이후 인제스천 EPIC**용 forward-looking 설계다(비파괴 보존). 정식 02-A 정본=[`../knowledge-graph/KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md`](../knowledge-graph/KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md). 정식 스키마 설계 확정 후 본 훅지점/게이트를 재정합할 것.


> **근거**: EPIC 02-A [`KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md`](KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md) + Entity Foundation(01-C VERIFIED 관계·01-D 승인) + 288차 실코드 훅 지점.
> **비파괴 설계 단계**: 본 문서는 **실행 계획·게이트 확정**이며 코드변경 0. 실제 Writer/ALTER 배선은 **라이브 데이터 흐름 검증 + 빌드 + 배포 승인 후**.
> **원칙**: 기존 graph_node/graph_edge 확장(병렬 엔진 금지) · tenant fail-closed · Trust First(READY만) · 무후퇴(GraphScore 3홉/화면/API 보존).
> ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md`](../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md)(§3 Edge Writer 결정).

---

## 1. 목표
02-A가 확정한 **최우선 갭(자동 인제스천 부재)**을 해소: 주문/귀속/CRM 이벤트에서 CE→REL 엣지를 **멱등·격리·신뢰검증** 하에 graph_edge로 write-through. 수동 API 전용 상태를 실운영 그래프로 전환.

## 2. Edge Writer 사양 (신규 `GraphIngest` — GraphScore 확장, 병렬 아님)
- 위치(안): `GraphScore.php`에 `ingestOrderEdges()`/`ingestAttributionEdges()`/`ingestIdentityEdges()` 추가(기존 upsertNode/upsertEdge 재사용). 별도 엔진 클래스 신설 금지.
- **멱등**: 기존 SELECT→UPDATE/INSERT upsert(`:70-79`) 사용. 스키마 UNIQUE 추가 전까지 앱단 멱등 유지, ALTER 후 `INSERT ... ON DUPLICATE KEY UPDATE`로 강화.
- **입력 게이트(Trust First)**: Vol3 Readiness=READY + 비Demo(IS_DEMO 제외) + 취소/반품 제외 술어(OrderHub::cancelExclusion) 적용분만 적재. WARNING/BLOCKED 데이터는 엣지 미생성.

## 3. 훅 지점 (기존 파이프라인·무후퇴 write-through)

| 이벤트 | 훅 위치(검증됨) | 생성 노드/엣지(CE/REL) |
|---|---|---|
| 주문 저장(폴링) | `ChannelSync.php:4314` saveOrders | Order 노드 + Order→SKU(REL-ORD, sku)·Order→Customer(REL-ORD-000001, buyer) |
| 주문→CRM 귀속 | `ChannelSync.php:4667` recordCrmPurchase | Customer 노드 + Customer→Order(REL-CUS-000001) |
| 웹훅 신규주문 | `ChannelSync.php:5707/5726` | 동일(웹훅 경로) — 도출 tenant 사용 |
| 귀속 터치 | `ChannelSync.php:4521`·attribution_touch | Touch→Campaign(REL-MKT-000006)·Order→AttributionResult(REL-ORD-000006) |
| 크리에이터 귀속 | OrderHub creator_id | Creator→Order(REL-CRT-000004)·Creator→Content(REL-CRT-000001) |
| 아이덴티티 | `CRM.php:638` resolveIdentities·merge_link | Customer↔Identity(D/E 재사용, 재구현 금지) |

**격리 절대**: 모든 Writer는 파이프라인 **도출 tenant_id** 사용(웹훅 본문 tenant 신뢰 금지, ChannelSync:5620 패턴 승계). Demo/운영 분리.

## 4. 노드/엣지 카탈로그(1차 — VERIFIED 관계만)
- 노드(CE): Order·Customer·SKU·Creator·AdCampaign·Session. (APPROVED_CANONICAL 우선)
- 엣지(REL): REL-ORD-000001·REL-CUS-000001·REL-MKT-000006·REL-ORD-000006·REL-CRT-000001/004. edge_weight = 매출/기여도, edge_label = REL ID.
- **BLOCKED 제외**: OrderItem(REL-ORD-000002 ABSENT)·NormalizedRecord·ActionRequest는 Foundation 미승인 → 적재 보류. (OrderItem 구현 후 Order→OrderItem→SKU 확장)

## 5. 스키마 마이그레이션(비파괴·Backfill·Rollback)
| 단계 | 작업 | 안전장치 |
|---|---|---|
| 1 | 중복 노드/엣지 정리(현행 UNIQUE 부재) | 정리 전 COUNT/Checksum 스냅샷 |
| 2 | `ALTER ADD UNIQUE(tenant_id, node_type, node_id)` / `(tenant_id, src_type, src_id, dst_type, dst_id, edge_label)` | 중복 제거 후에만·실패 시 롤백 |
| 3 | node_type 화이트리스트 4종→CE 카탈로그 확대(기존 4종 보존) | GraphScore:57 확장, 3홉 스코어러 무변경 |
| 4 | Backfill: 최근 N일 주문/귀속 재적재(멱등) | Row Count vs channel_orders 대조 |
| Rollback | Writer 비활성 플래그 + UNIQUE DROP | graph 조회/스코어러는 기존대로 동작(무후퇴) |

## 6. ★라이브 검증 게이트 (구현 착수 선결 — 블라인드 금지)
1. 자격증명 등록 후 실 채널에서 주문/귀속 데이터가 실제 흐르는지 확인(현재 미등록 시 0건).
2. saveOrders/recordCrmPurchase 훅에서 tenant 도출값이 실 테넌트인지(demo 낙하 없음) 확인.
3. graph_edge 적재 후 GraphScore summary/score API가 실값 반환하는지(현 데모경로와 분리).
→ 3개 통과 전 프로덕션 Writer 활성화 금지.

## 7. 회귀 테스트 매트릭스
- Entity/Edge: 멱등(중복 재적재 시 행 증가 0)·타테넌트 엣지 차단·READY 미달 데이터 미적재·취소주문 엣지 제외.
- 무후퇴: GraphScore 3홉 score/summary/nodes/edges API 응답 필드·`/graph-score` 화면 기존 동작 불변.
- 데이터: graph_edge tenant 혼합 0·edge_weight 매출 합치 대조·Backfill Checksum.
- 성능: saveOrders 훅 추가 지연 측정(주문 저장 hot path 회귀 감시).

## 8. 완료 조건(§)
- Edge Writer 3훅 배선·멱등·격리·Trust 게이트 통과 + 스키마 UNIQUE + Backfill 검증 + 무후퇴 회귀 0 + 라이브 게이트 3개 통과. 그 전까지 상태=**PLANNED(코드변경0)**.
- 이후 **EPIC 02-C — Knowledge Graph Query & Intelligence Serving**(범용 순회·GraphRAG·근거표시) 입력 준비.

## 9. 현재 상태
**설계 확정·코드변경 0.** 실 구현은 (a) 채널 자격증명 등록→라이브 데이터, (b) 빌드 검증, (c) 운영·데모 배포 승인 후. 벡터/임베딩(RAG)은 그래프 인제스천 실사용화 이후 후속(02-D 후보).
