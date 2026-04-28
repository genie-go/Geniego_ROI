# GENIE_ROI V334 개요 (상품화/멀티채널 확장)

## V334 목표
V333의 강점(알림→조치→복구→보고의 닫힌 루프)을 유지하면서, **멀티 오픈마켓 상품등록/동기화 + 광고/인플루언서/리뷰/정산 수집**까지 확장해
대행사/브랜드/유통사가 바로 쓰는 **커머스 데이터 운영 플랫폼**으로 상품화합니다.

## 이번 버전에서 추가된 것
1) **채널 표준 상품 스키마(Product Master)**
- `templates/v334/product_schema_v1.json`
- 모든 채널(스마트스토어/쿠팡/아마존/쇼피파이/쇼피/큐텐/라쿠텐 등)의 입력을 표준 SKU 기반으로 통일합니다.

2) **커넥터 우선순위(로드맵)**
- `templates/v334/connector_priority.json`
- P0/P1/P2로 단계화하여 “볼륨/리스크/난이도” 기준으로 빠르게 상품화합니다.

3) **수집/정규화/대시보드 KPI 템플릿**
- `templates/v334/kpi_templates.json`
- 광고(성별/연령/지역), 인플루언서, 리뷰, 정산까지 KPI를 한 덩어리로 설계합니다.

4) **정규화 데이터 레이크(라이트 버전)**
- OpsStore에 V334 테이블 추가
  - `product_master_v334`, `channel_listing_v334`
  - `orders_norm_v334`, `reviews_norm_v334`, `settlements_norm_v334`
  - `marketing_spend_norm_v334`, `influencer_posts_norm_v334`

5) **API 엔드포인트(템플릿 제공 + 정규화 데이터 적재)**
- `/p/<project_id>/api/v334/schema/product`
- `/p/<project_id>/api/v334/templates/connector_priority`
- `/p/<project_id>/api/v334/templates/kpis`
- `/p/<project_id>/api/v334/ingest/normalized`  (analyst 이상 권한)

## 실행
```bash
python scripts/v334/run_web_ui.py --workspace ./workspace --host 0.0.0.0 --port 8080
```

## “바로 실행 가능한” 운영 방식
- 1) 채널/광고/인플루언서에서 **CSV Export**를 먼저 받아서 적재(가장 빠름)
- 2) 점진적으로 각 채널 API 커넥터를 붙여서 자동화(토큰/권한/레이트리밋 필요)

> V334는 “설계(스키마/정규화/KPI)”를 먼저 고정하고 커넥터는 단계별로 확장하는 구조입니다.
