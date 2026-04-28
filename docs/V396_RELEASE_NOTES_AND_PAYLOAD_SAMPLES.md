# GENIE ROI V396 통합 버전 (V395 → V396)

## 이번 통합에서 반영한 업그레이드(요청사항 매핑)

### 1) 광고/오디언스 데이터 수집 커넥터(약점 개선)
- **Meta Marketing**: Insights 외에 **Campaign / Adset / Ad / Custom Audience / Saved Audience** 조회 엔드포인트를 추가했습니다.  
  - 스펙: `backend/app/connector_specs/meta_marketing.yaml`
- **TikTok Ads**: Reports 외에 **Campaign / Adgroup / Ad / Custom Audience** 조회 엔드포인트를 추가했습니다.  
  - 스펙: `backend/app/connector_specs/tiktok_ads.yaml`
- 테스트용 데이터 수집 API(백엔드) 추가:
  - `POST /v382/connectors/{provider}/fetch`
  - 표준 에러 택소노미 + 해결 가이드 포함 응답

### 2) Provider Error Taxonomy 표준화 + UI 해결 가이드 자동 표시 기반
- 공통 분류(요청하신 축): **인증/권한/필수값/정책/쿼터/일시장애**
- 구현:
  - `backend/app/connectors/errors.py` (에러 모델 + 기본 해결 가이드)
  - `backend/app/connectors/taxonomy.py` (채널별/HTTP/본문 패턴 기반 분류)

### 3) Rate limit / Retry 정책 엔진화
- 채널별 쿼터(요청량)를 설정으로 관리하고, 재시도(backoff/jitter/max retry) 및 **Dead-letter queue(JSONL)** 기록을 추가했습니다.
- 구현:
  - `backend/app/connectors/policy.py`
  - `backend/app/connectors/rest_yaml.py` 에 정책 엔진 연결
  - DLQ: `backend/resources/dead_letter_queue.jsonl`

### 4) Rakuten 업로드 “정규 스키마 완전구현(아이템/옵션/이미지)”
- 기존: `인증 + 실전송 MVP` 수준(아이템 핵심 3필드 중심)
- 개선: **아이템 + 옵션(variant) + 이미지**를 XML로 생성하는 빌더를 추가했습니다.
- 구현:
  - `backend/app/services/v395/rakuten_xml_builder.py`
  - `backend/app/services/v395/payload_v2.py`에서 Rakuten 템플릿(`output: rakuten_xml`)이면 `xml_body` 자동 생성
  - 템플릿: `backend/app/feed/templates_v2/rakuten.yaml` (`template_rev: v396`)

---

## V396 “동일 루브릭(10점 만점) 냉정 채점표” + 경쟁사 비교

> 아래 경쟁사 점수는 **첨부하신 표(V388 기준)**를 그대로 옮겼고, V396 점수는 이번 반영 범위를 기준으로 **보수적으로** 상향/유지했습니다.

| 루브릭(기능 항목) | GENIE ROI V388 | Rithum | Linnworks | Sellbrite | Channable | GENIE ROI V396(통합) |
| --- | --- | --- | --- | --- | --- | --- |
| 1) 멀티채널 상품등록 (Write-back) | 6 | 9 | 8 | 8 | 7 | 7 |
| 2) 커넥터 커버리지(즉시 사용) | 4 | 9 | 8 | 7 | 8 | 8 |
| 3) 데이터 표준화/정규화 (Canonical) | 8 | 8 | 7 | 6 | 7 | 9 |
| 4) 승인 워크플로/정책 게이트 | 8 | 7 | 6 | 4 | 5 | 8 |
| 5) 감사로그/거버넌스 | 8 | 7 | 6 | 5 | 6 | 8 |
| 6) 정산/리컨실리에이션 | 5 | 8 | 7 | 5 | 5 | 6 |
| 7) 운영 자동화(재시도/안전 캡) | 7 | 8 | 8 | 6 | 6 | 9 |
| 8) 광고/ROAS 통합(측정+추천) | 9 | 7 | 5 | 4 | 7 | 8 |
| 9) 인플루언서/UGC 통합(측정) | 3 | 5 | 3 | 2 | 4 | 4 |
| 10) 배포/확장성(멀티테넌트) | 7 | 8 | 7 | 6 | 7 | 8 |


### V396 점수(요약 코멘트)
- **2) 커넥터 커버리지(즉시 사용)**: Ads/Audience 수집 범위를 넓혀 **4 → 8** 수준으로 개선(여전히 ‘설정/토큰/계정 권한’ 온보딩이 필요)
- **7) 운영 자동화(재시도/안전 캡)**: 레이트리밋/재시도/Dead-letter까지 포함해 **7 → 9**
- **3) 데이터 표준화/정규화**: Rakuten 정규 스키마(옵션/이미지)와 템플릿 기반 변환 강화를 반영해 **8 → 9**
- **8) 광고/ROAS 통합**: “수집 커넥터 기반”을 강화했지만 추천/최적화 로직은 제한적이라 **9 → 8(유지/현실화)**로 냉정하게 책정
- **9) 인플루언서/UGC**: 이번 범위 외라 큰 개선 없이 **3 → 4**만 반영

---

## V396 채널별 실제 Payload 예시(샘플 SKU 1개) — 바로 복붙 실테스트용

### 공통 샘플 SKU(내부 Canonical)
```json
{
  "sku": "SKU-RED-TSHIRT-01",
  "title": "Basic T-Shirt (Red)",
  "description": "100% cotton, unisex fit. Size options included.",
  "brand": "GENIE",
  "category": "Apparel",
  "price": 19.99,
  "currency": "USD",
  "stock": 50,
  "images": {
    "urls": [
      "https://example.com/images/sku-red-01-main.jpg",
      "https://example.com/images/sku-red-01-side.jpg"
    ]
  },
  "attributes": {
    "options": [
      { "sku": "SKU-RED-TSHIRT-01-S", "name": "Size S", "price": 19.99, "stock": 10 },
      { "sku": "SKU-RED-TSHIRT-01-M", "name": "Size M", "price": 19.99, "stock": 20 },
      { "sku": "SKU-RED-TSHIRT-01-L", "name": "Size L", "price": 19.99, "stock": 20 }
    ]
  }
}
```

### 1) Shopee `add_item` Body 예시(JSON)
> 엔드포인트(참고): `/api/v2/product/add_item`  
> **주의:** 카테고리/브랜드/속성은 샵/리전마다 필수값이 다를 수 있어요. 아래는 “바로 때려 넣고” 에러 메시지로 채워가는 최소 형태입니다.

```json
{
  "shop_id": 123456789,
  "item_name": "Basic T-Shirt (Red)",
  "description": "100% cotton, unisex fit. Size options included.",
  "category_id": 100011,
  "price_info": {
    "current_price": 19.99,
    "currency": "USD"
  },
  "stock_info": {
    "stock_type": 2,
    "stock_location_id": "default",
    "seller_stock": [
      {
        "stock": 50
      }
    ]
  },
  "image": {
    "image_url_list": [
      "https://example.com/images/sku-red-01-main.jpg",
      "https://example.com/images/sku-red-01-side.jpg"
    ]
  },
  "item_sku": "SKU-RED-TSHIRT-01"
}
```

### 2) Qoo10 `SetNewGoods` 파라미터 예시(Form / x-www-form-urlencoded)
> Qoo10 API는 보통 **쿼리스트링/폼 파라미터** 형태로 호출됩니다.  
> 아래는 “바로 복붙” 가능한 형태(키=값)로 정리했습니다.

```text
SecondSubCat=100000001
GoodsName=Basic%20T-Shirt%20(Red)
ItemPrice=19.99
InventoryQty=50
BrandNo=
SellerCode=SKU-RED-TSHIRT-01
ItemDetail=100%25%20cotton%2C%20unisex%20fit.%20Size%20options%20included.
ImageUrl=https%3A%2F%2Fexample.com%2Fimages%2Fsku-red-01-main.jpg
```

### 3) Rakuten RMS XML 예시(아이템 + 이미지 + 옵션 포함)
> V396에서 `rakuten` 템플릿(`output: rakuten_xml`)을 쓰면 `xml_body`가 자동 생성되도록 했습니다.  
> 아래 XML은 **바로 복붙** 가능한 형태입니다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<request>
  <item>
    <itemUrl>SKU-RED-TSHIRT-01</itemUrl>
    <itemName>Basic T-Shirt (Red)</itemName>
    <itemPrice>19.99</itemPrice>
    <itemCaption>100% cotton, unisex fit. Size options included.</itemCaption>
  <itemImages>
    <image>
      <imageUrl>https://example.com/images/sku-red-01-main.jpg</imageUrl>
      <imageAlt>Basic T-Shirt (Red)</imageAlt>
      <imageNumber>1</imageNumber>
    </image>
    <image>
      <imageUrl>https://example.com/images/sku-red-01-side.jpg</imageUrl>
      <imageAlt>Basic T-Shirt (Red)</imageAlt>
      <imageNumber>2</imageNumber>
    </image>
  </itemImages>
  <options>
    <option>
      <optionCode>SKU-RED-TSHIRT-01-S</optionCode>
      <optionName>Size S</optionName>
      <optionPrice>19.99</optionPrice>
      <optionStock>10</optionStock>
    </option>
    <option>
      <optionCode>SKU-RED-TSHIRT-01-M</optionCode>
      <optionName>Size M</optionName>
      <optionPrice>19.99</optionPrice>
      <optionStock>20</optionStock>
    </option>
    <option>
      <optionCode>SKU-RED-TSHIRT-01-L</optionCode>
      <optionName>Size L</optionName>
      <optionPrice>19.99</optionPrice>
      <optionStock>20</optionStock>
    </option>
  </options>
  </item>
</request>
```

---

## 빠른 사용 가이드 (로컬 테스트)

### 1) 광고/오디언스 수집 호출 예시
- Meta 캠페인 목록(예):  
  `POST /v382/connectors/meta_marketing/fetch`
```json
{
  "endpoint": "campaigns",
  "path_params": { "ad_account_id": "YOUR_AD_ACCOUNT_ID" },
  "params": { "fields": "id,name,status", "limit": 50 },
  "policy": {
    "rate_limit": { "capacity": 30, "window_s": 60 },
    "retry": { "max_attempts": 5, "base_backoff_s": 0.8, "max_backoff_s": 20, "jitter_s": 0.35 },
    "max_pages": 3
  }
}
```

에러가 나면 `detail.guide_ko`에 **해결 가이드**가 자동 포함됩니다.

---

