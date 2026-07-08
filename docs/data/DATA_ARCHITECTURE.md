# GeniegoROI 통합 데이터 아키텍처 (Unified Data Architecture)

> 최종 갱신: 2026-07-09 (272차). 이 문서는 GeniegoROI의 3계층 데이터 아키텍처 정본이다.
> **다음 개발자 필독**: 아래 "이미 구현됨" 항목을 재구현하지 말 것(중복 방지). 신설은 §5 갭에 한한다.

## 0. 원칙 (지시서 절대원칙 요약)
1. 목/더미/샘플 데이터는 **운영 분석에 절대 미사용**(IS_DEMO 게이트·운영 mock 0·4중 오염방어).
2. 구독등록 데이터와 외부수집 데이터는 **각각 원천으로 별도 보존**.
3. 원천 위에 **통합 분석 레이어**를 구축, 모든 통합데이터는 **원천 추적 가능**.
4. 고객/테넌트/워크스페이스 데이터 **완전 격리**(tenant_id 경계·미들웨어 강제).
5. 외부 데이터는 수집 즉시 **검증·정규화·중복제거·품질**.
6. 이미 구현된 구조는 **확장·통합**, 신규 중복 금지.

## 1. Layer 1 — Subscriber-Owned Data (구독 직접등록 1차 데이터) — ✅ 대부분 구현
| 데이터 | 테이블 | 등록 API |
|---|---|---|
| 상품/SKU | po_products·channel_products·catalog_listing | PriceOpt::createProduct |
| 고객(CRM) | crm_customers·crm_activities·crm_segments | CRM::createCustomer |
| 주문/매출(수동) | kr_settlement_line | KrChannel recon import |
| 캠페인·목표·예산 | auto_campaign·ad_spend_ledger | AutoCampaign |
| 크리에이터·콘텐츠 | influencer_store·creative_asset·brand_asset | Influencer·CreativeStore |
| 리뷰·웹팝업·워크스페이스 | product_review·web_popup·tenant_kv | 각 핸들러 |
| **회사/브랜드 프로필** | **tenant_business_profile (272차 신설)** | **DataPlatform::saveBusinessProfile** |

전부 tenant_id 격리 + requirePro 쓰기 게이트. ★site_company 는 플랫폼 자사용(About)이라 구독사 프로필로 재사용 불가 → tenant_business_profile 신설(정당).

## 2. Layer 2 — External Channel Raw Data (외부수집 원천) — ✅ 구현
- **13개 도메인 원천 테이블**: channel_orders(주문·raw_json 원통화 보존)·performance_metrics(광고)·ad_insight_agg·pg_settlement·product_review·web_analytics_metrics·shipment_tracking·pixel_events·attribution_touch 등.
- **범용 2계층 파이프라인**: `raw_vendor_event`(raw_payload 원문·source_system·dedup_key) → `normalized_activity_event`(표준·account/campaign/channel).
- **정규화**: `Connectors::fxToKrw`(KRW 단일 SSOT)·자연키 upsert·원통화 raw_json 보존.
- **중복제거/멱등**: 전 테이블 자연키 UNIQUE + dedupAggTable/dedup_key.
- **수집 관측성**: `connector_sync_log`(tenant×channel status/rows/synced_at) + `/v423/connectors/freshness`.

## 3. Layer 3 — Unified Intelligence Data (통합 분석) — ✅ 구현
- **Rollup SSOT**: platform/campaign/sku/creator × daily~yearly(취소제외 SSOT `OrderHub::cancelExclusion`).
- **어트리뷰션**: MTA 6모델·Shapley(zeta)·Markov removal-effect·Lift·MMM(MCMC·adstock·Hill·CI).
- **ROAS/CAC/LTV**(BG-NBD·Gamma-Gamma)·세그먼트·코호트·identity360(union-find)·roasReconciliation(매체↔실주문 truthRatio).
- **예산최적화**: Mmm::frontier(이익최적 T*)·AutoRecommend water-filling.

## 4. 데이터 소스 레지스트리·계보·품질·신뢰도 (272차 신설·확장)
- **data_source 레지스트리**(신설): source_type(subscriber_owned/external_channel)·source_channel·source_account·source_credential_id·data_kind·source_priority·status. 외부는 channel_credential 에서 자동유도. `DataPlatform::listSources`.
- **계보(lineage)**: `DataPlatform::dataLineage` — 분석도메인→원천 data_kind + 정규화규칙(SSOT 참조) + 추적가능여부. (신규 테이블 0·data_source+connector 결합)
- **품질 스캔**: `DataPlatform::dataQuality` — 레코드 결측/음수매출/잘못된날짜/음수지출 스캔 + 도메인 완전성 + 신선도.
- **범용 신뢰도점수(reliability_score 0~100)**: 완전성×신선도/오류 패널티. ★통계신뢰지표(MMM R-hat·A/B P(best)·부트스트랩 confidence)와 **구분**(그건 모델 산출물, 이건 집계 KPI 데이터 등급).
- **DataTrustDashboard**: 하드코딩 pass:true 셸 → /api/data-quality 실배선(운영·데모는 샘플 격리).

## 5. 잔여 갭 (다음 단계 후보 — 신설 최소)
- 출처 메타 원천행 부착(현재 소스 레지스트리 레벨·행 레벨 credential_id/raw_payload_hash/sync_job_id 부재=관측성 강화, 정합 결함 아님).
- 크리에이터/콘텐츠 기여도 자동 귀속 심화.
- 계보 end-to-end 그래프(현재 도메인→원천 요약 수준).

## 6. 격리·보안 (재플래그 금지·확정양호)
미들웨어 auth_tenant override(X-Tenant 위조차단)·데모/운영 DB 물리분리(_demo)·AES-256-GCM fail-closed·SSRF·대행사 승인게이트(agency_client_link fail-closed). workspace_id 는 tenant_id 로 대체(신설 불요).

## 완료 기준(중복 방지)
위 §1~4가 구현·배포됨. **다음 개발자는 이 문서의 "구현됨"을 재구현하지 말고 §5 갭만 확장**하라. 변경 시 이 문서 + docs/pm/PM_CHANGE_HISTORY.md 갱신.
