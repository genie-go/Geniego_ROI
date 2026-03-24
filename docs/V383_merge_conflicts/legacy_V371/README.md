# GENIE_ROI V364 (Integrated + Official Marketplace API Plug-in)


V364는 V363 통합본 기능을 유지하면서, Shopee/Qoo10/Rakuten 커넥터를 **"문서/스코프/레이트리밋을 나중에 끼워넣기만 하면 되는"**
완성형(실제 HTTP 호출 + 커서 기반 증분 동기화 + 429/5xx 백오프) 구조로 업그레이드한 통합 패키지입니다.

## 1) V348 계열(운영/통제) 포함
- 플랫폼별 **권한검증 강제** (Meta/TikTok/Amazon Ads)
- **Idempotency**(서버 + 외부 호출)로 중복 실행 방지
- **승인 워크플로** (MANAGER → LEGAL → DONE) + SLA
- 비동기 실행(RQ) + 재시도
- **Saga 보상(Compensation)**: 부분 성공/부분 실패 고려

## 2) V349 계열(CDP/수집·정규화·분석) 포함
- DataSource 등록/토글 + 백그라운드 Sync 프레임워크
- CDP/커머스 인텔리전스 스키마:
  - products, listings, orders, order_items
  - inventory_snapshots, price_snapshots, reviews
  - identities, identity_links, events
  - influencers, influencer_posts
- 데모 데이터로 E2E(수집→정규화→적재→분석) 확인 가능

## 3) V338 계열(템플릿/대시보드 프로토타입) 포함
- legacy_v338_pkg/ 아래에 dashboard HTML/템플릿 보존
- API에서 /dashboard 로 정적 서빙(프로토타입 UI 확인)

## 4) V345 계열(신뢰/리포트) 포함
- Wilson interval 기반 trust 계산 유틸(analytics/trust.py)
- ReportLab PDF 리포트 생성(reports/pdf.py) + /reports/latest.pdf

## 주요 엔드포인트 요약
- Auth: /auth/signup, /auth/login
- OAuth: /oauth/{source}/start, /oauth/{source}/callback, /connectors/status
- Actions: /actions/propose_budget_shift, /approvals/list, /approvals/{id}/approve
- CDP/Sync: /sources/create, /sources/list, /sources/{id}/sync
- Analytics: /analytics/overview, /analytics/top-products, /analytics/attribution
- Config: /config/channel-mappers, /config/default-attribution, /tenant/config
- Dashboard: /dashboard (legacy UI)
- Reports: /reports/latest.pdf

## V371 패키지: Demo + 운영 콘솔
- Demo(회원가입/로그인 필수): `/ui/demo`
  - 회원가입 요청에 `demo=true`를 넣으면, 동일한 실전 스키마/흐름 기반의 샘플 데이터가 자동 생성됩니다.
- 운영 콘솔(한 화면): `/ui/console`
  - 피드 실패 Top / 정책 위반 차단 / 롤백 이벤트를 한 화면에서 확인합니다.
- 보안/심사 문서 템플릿: `docs/security/`
- 채널 온보딩 체크리스트/테스트 플로우: `docs/onboarding/`

## 실행
docker-compose로 API/Worker/Postgres/Redis를 올릴 수 있도록 infra/docker-compose.yml 포함.


## V355 Notes
- Integrated V338~V351 into a single codebase.
- Keeps newest implementations when duplicates exist (V351 baseline).
- Adds Coupang expansion (products/inventory/price/claims) collector.
- Adds Claim model + ingestion writer alignment fixes.


## V355 추가: 네이버 스마트스토어 + 네이버 검색광고(SearchAd) 실연동 Collector
- DataSource 플랫폼: `naver_smartstore`
- SmartStore(상품/주문/반품/정산) + SearchAd(광고 지표) 수집을 한 Collector에서 처리(설정에 따라 부분 수집 가능)

### 예시: DataSource 생성(body)
```json
{
  "kind": "COMMERCE",
  "platform": "naver_smartstore",
  "name": "Naver SmartStore + SearchAd",
  "config": {
    "commerce_base_url": "https://api.commerce.naver.com/external",
    "oauth_token_url": "https://api.commerce.naver.com/oauth2/token",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "endpoints": {
      "products": "/v1/seller/products",
      "orders": "/v1/seller/orders",
      "returns": "/v1/seller/returns",
      "settlements": "/v1/seller/settlements"
    },
    "searchad_base_url": "https://api.searchad.naver.com",
    "searchad_customer_id": "YOUR_CUSTOMER_ID",
    "searchad_api_key": "YOUR_API_KEY",
    "searchad_secret_key": "YOUR_SECRET_KEY",
    "searchad_endpoints": {
      "stats": "/stats"
    }
  }
}
```
> 네이버 API는 계정/권한/프로그램에 따라 엔드포인트/필드가 달라질 수 있어, V355은 엔드포인트를 설정으로 오버라이드 가능하게 설계했습니다.


## Naver SmartStore + SearchAd (V355 고정 프로필)
- DataSource config에 `"naver_profile": "naver_smartstore_v1"`를 넣으면, repo에 포함된 고정 엔드포인트/필드 매핑 프로필을 사용합니다.
- SearchAd는 campaign/adgroup/keyword 레벨 지표를 `marketing_metrics`에 적재합니다.
- 분석 API: `GET /analytics/ads/naver?level=campaign|adgroup|keyword`


## V363 Notes
- V356 기반에 V334~V337 템플릿(legacy_v338_pkg/templates/v334~v337)을 유지하면서, 리뷰피드 정규화/업로드, 공식 엔드포인트 스펙 allowlist, 키워드 단위 검색점유(Search Share) API를 추가했습니다.
- 신규 API: /reviews/ingest, /reviews/ingest-file, /analytics/search-share, /admin/source.zip
- 신규 Config API: /config/brand-mapping, /config/campaign-policy, /config/reviews/feed-mapping

### V363: Endpoint Governance 강화
- **2인 승인(4-eyes)**: `PENDING_REVIEW -> REVIEWED -> APPROVED` 단계로 분리 (검수자/승인자 분리, 동일인 불가)
- **쿼리 파라미터 스키마화**: endpoint별 허용 파라미터(allow-only) + 타입/범위/패턴/enum 검증
- **원클릭 롤백 UI**: `/admin/reviews/endpoints/ui`에서 버전 히스토리 조회 + 롤백 버튼 제공
- **커넥터 하드락**: 공식 리뷰 커넥터는 `endpoint_name`(키) 기반으로만 동작하며, 승인(approved) 전에는 실행 불가

> 참고: 브라우저에서 UI 버튼 액션(리뷰/승인/롤백)을 실행하려면, UI 상단 토큰 입력칸에 Bearer 토큰을 붙여 넣어야 합니다.
