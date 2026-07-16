# ADR — Entity Relationships (EPIC 01-C)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (비파괴 문서·REL ID 메타데이터 단계). FK/Cascade 변경·마이그레이션은 후속.
- **근거**: [`../entities/CANONICAL_RELATIONSHIP_REGISTRY.md`](../entities/CANONICAL_RELATIONSHIP_REGISTRY.md) · [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md) · [`../entities/ENTITY_INVENTORY.md`](../entities/ENTITY_INVENTORY.md).

## 맥락
EPIC 01-B에서 확정한 Canonical Entity 간 관계를 실제 FK·join·API·sync·analytics·automation 근거로 공식화한다. 목적: 무결성·테넌트 경계·데이터 계보·중복/충돌/고아/순환 파악 → Knowledge Graph(후속) 입력.

## 결정 (핵심)
1. **관계는 코드 근거로만**(FK/join/query/sync/analytics/automation). 근거 없으면 RELATIONSHIP_CANDIDATE/UNVERIFIED. REL ID 영구부여.
2. **핵심 소유 체인**: Tenant `contains` User/Order/Customer/Credential(전부 tenant_id 경계). Customer `purchased` Order(buyer→crm_customers). Order `refunded_by` Claim·`attributed_to` AttributionResult·`deducts` Inventory. Product `identified_by` SKU `stocked_as` wms_stock. AdCampaign→AdGroup(=AdSet)→Ad→Creative. Journey `enrolls` Enrollment `executes` Action `gated_by` isMarketingSendAllowed(SSOT).
3. **삭제정책**: Customer DSAR=ANONYMIZE_CHILD(Order는 RETAIN_FOR_AUDIT). Connector/Campaign 삭제 시 Raw/Attribution RETAIN(무후퇴). 임의 CASCADE 금지.
4. **테넌트 경계 강제**: Tenant Scoped 관계는 동일 tenant_id 내에서만. real→demo 낙하(tenant DEFAULT 'demo') 방지 대상.
5. **위험 순환 0 확인**: Journey/Campaign 순환은 멱등마커(journey_node_sent)·승인게이트로 차단.

## 확정 이슈(관계 관점)
| 이슈 | 관계 | 계획 | 위험 |
|---|---|---|---|
| **OrderItem 부재** | Order→OrderItem(ABSENT) | 라인아이템 테이블+채널 line_items 전체수집 | CRITICAL(다품목 COGS/귀속) |
| 재고 이중차감 | Order→Inventory(wms+channel) | 파생-only로 단일화 | HIGH |
| ROAS/LTV 이원관계 | Metric→Order/AdPerf(PHP+JS) | 공용헬퍼 단일화 | HIGH(수치변동) |
| normalized_event 고아 | RawRecord→Normalized→(없음) | 하류 배선 or 라벨 | 라이브검증 |
| action_request 고아 | ActionRequest→생산자(없음) | 생산자 신설 or 제거 | 제품결정 |
| identity 미연결 | AnonymousIdentity→Customer | 결합 로직 | UNVERIFIED |

## 무후퇴·영구 규칙
- 기존 유효 FK/관계/API응답/분석연결/동기화매핑 삭제·축소 금지. 잘못된 관계도 즉시 제거 금지 → 영향분석+마이그레이션 계획 후.
- 신규 관계는 Relationship Registry 조회 후에만. Tenant Scoped 관계는 tenant_id 강제. 미검증 관계를 AI/자동화 근거로 사용 금지.

## 결과
Canonical Relationship Registry 확정. 다음 **EPIC 01-D — Entity Validation, Consolidation Planning & Regression Gate** 입력자료 준비 완료.
