# V335 Overview (KO)

V335는 V334 구조(표준 상품 스키마/정규화/KPI 템플릿)를 그대로 유지하면서, 상품화(대행사/브랜드 유료 SaaS)에서 점수에 큰 영향을 주는 3가지를 묶었습니다.

1. **피드 룰 엔진 최소버전**
   - 채널별 필수값/길이/금지어/이미지 개수 등 검증
   - 일괄/선택 가격 조정(퍼센트/고정), 할인(세일가), 쿠폰(장바구니/상품쿠폰) 사양 정의
2. **Shopify / Meta Ads CSV 자동 적재 파이프라인**
   - CSV 업로드 → 정규화 테이블(marketing_spend_norm_v334 등)로 적재
   - ingest_jobs_v335로 상태 추적
3. **정산 검증 리포트**
   - 주문(orders_norm_v334)과 정산(settlements_norm_v334) 간 매출/수수료/환불 차이를 계산
   - 임계치 기반 WARN/ERROR 표시 + report 저장(settlement_validation_v335)

실행:
`python scripts/v335/run_web_ui.py --workspace ./workspace --host 0.0.0.0 --port 8080`
