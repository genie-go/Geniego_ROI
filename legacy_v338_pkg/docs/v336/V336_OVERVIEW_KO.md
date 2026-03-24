# GENIE_ROI V336 (Coupang/SmartStore 업로드 커넥터 포함) - Overview (KO)

V336의 목표는 '피드/정규화/검증'에서 한 단계 더 나아가 **실제 오픈마켓(쿠팡/스마트스토어)에 업로드(상품 등록 + 가격/재고 동기화)** 까지 닫힌 루프를 제공하는 것입니다.

## 포함 기능
- SmartStore(네이버 커머스API): (v2) 상품 등록 `POST /v2/products`, 옵션 재고/가격/할인가 변경 `PUT /v1/products/origin-products/{originProductNo}/option-stock`
- Coupang Open API: 상품 생성 `POST /v2/providers/seller_api/apis/api/v1/marketplace/seller-products`, 옵션(vendorItemId) 단위 가격/재고 변경
- 피드 룰 엔진(v335) 결과를 **채널별 Payload로 변환** + 업로드/동기화 실행
- Dry-run / 실제 실행 모드 지원

## 실행 (CLI)
- SmartStore 업로드:
  `python scripts/v336/sync_smartstore.py --workspace ./workspace --project testclient --mode dry-run`
- Coupang 업로드:
  `python scripts/v336/sync_coupang.py --workspace ./workspace --project testclient --mode dry-run`

환경 변수는 `templates/v336/channel_sync_config.json` 참고.

## 주의
- 실제 API는 판매자 계정/앱 권한이 필요합니다.
- SmartStore/네이버 커머스API의 상품관리/재고/가격 API 경로 및 기능은 공식 문서를 기준으로 합니다.
