# V302 Upgrade Notes — Multi-marketplace Commerce “Ops-grade” hardening

## 목표
- 대량 업로드(일괄등록) 및 주문/재고 동기화 작업을 **큐/워커 기반으로 운영 마감**
- 레이트리밋/재시도/부분 실패 리포팅까지 포함
- 모든 채널을 “실제 인증 + 필드 매핑 + 주문/재고 완주”로 확장할 수 있도록 **상용 구조(스캐폴딩) 완성**

> 이 소스는 레퍼런스 구현입니다. Shopify는 실제 호출 예시가 포함되어 있고,
> Amazon SP-API/Coupang/Naver SmartStore/Cafe24/Qoo10/Rakuten은
> **인증/서명/필드 매핑을 꽂아 넣을 구조**를 상용 수준으로 갖췄습니다(채널 정책/리전/승인에 따라 세부 엔드포인트는 확정 필요).

## 핵심 변경
### 1) Job 기반 처리 + 부분 실패 리포팅
- `commerce_jobs` (전체 작업)
- `commerce_job_items` (상품 1건/가격 1건/재고 1건 단위)
- `v_commerce_job_summary` (요약 뷰)

API:
- `POST /v1/commerce/products/upload`
- `POST /v1/commerce/prices/update`
- `POST /v1/commerce/orders/sync`
- `POST /v1/commerce/inventory/sync`

상태 확인:
- `GET /v1/commerce/jobs/:job_id`
- `GET /v1/commerce/jobs/:job_id/items`

### 2) connectors 표준 계약(ExecutePayload)로 통일
commerce_worker → connectors:
- channel: `"commerce"`
- provider: `"shopify" | "coupang" | "naver_smartstore" | "cafe24" | "amazon_sp" | "qoo10" | "rakuten"`
- action_type: `upsert_products | update_prices | fetch_orders | sync_inventory`

### 3) 초보자 사용 순서(10분)
1) 실행:
```bash
docker compose up --build
```
2) (관리자) 채널 크리덴셜 저장:
`POST /v1/commerce/channel/credentials`

3) 업로드/동기화 실행 → job_id 획득:
`POST /v1/commerce/products/upload`

4) job 진행 확인:
`GET /v1/commerce/jobs/<job_id>`
`GET /v1/commerce/jobs/<job_id>/items`
