# V392 Upgrade Notes (from V391)

V392의 목적은 V391의 강점(추천→승인/감사→운영 자동화)을 **그대로 유지**하면서,
이전에 냉정평가에서 약점으로 지적된 영역을 **가장 빠르게 체감 가능한 형태로 고도화**하는 것입니다.

## 1) 약점 개선 요약

### (A) 상품등록/피드/신디케이션(가장 큰 약점)
- 채널별 상품등록을 위한 **Feed Template(YAML)** 레이어 추가
- 내부 Product 모델 → 채널별 payload 자동 생성
- 필수필드/길이/허용값 등 **검증(Validation) + 결과 리포트** 제공
- Amazon/Shopee/Qoo10/Rakuten 템플릿 포함(정책/카탈로그 100%가 아니라 “상위 80% 등록 실패 요인” 우선)

### (B) 글로벌 확장(채널 확장 용이성)
- V391의 connector_specs 기반 구조를 유지하되,
  - REST YAML 커넥터에 **재시도/백오프/레이트리밋(429) 대응 + 페이지네이션 지원**을 추가
- 오픈마켓 커넥터는 ‘즉시 완전 구현’이 아니라,
  - (1) 템플릿 기반 feed 생성/검증
  - (2) 승인/잡 큐 기반 write-back 오케스트레이션
  - (3) 각 채널 provider를 추가 구현하면 write-back까지 연결
  의 3단계 전략으로 실운영 확장성을 확보

### (C) 운영성/스케일
- WritebackJob 기반 **잡 러너(run-once)** 추가
- /healthz, /metrics(간단 Prometheus 형식) 제공

## 2) 새로 추가된 API
- `GET /v392/healthz`
- `GET /v392/metrics`
- `POST /v392/feeds/preview` (SKU 1개, 채널 payload + 검증 결과)
- `POST /v392/feeds/export` (상품 목록 → 채널 feed rows + SKU별 검증 결과)
- `POST /v392/writeback/enqueue` (안전한 write-back job enqueue)
- `POST /v392/worker/run-once` (잡 1개 실행)

## 3) 현실적인 한계(투명하게)
- Amazon/Shopee/Qoo10/Rakuten에 대한 **실제 “API write-back”**은 계정/인증/서명/매핑/에러코드 처리가 필요하며,
  V392는 이를 위한 **표준화 레이어(템플릿+검증+잡 오케스트레이션)** 를 먼저 완성했습니다.
- 즉시 체감 성과는 “등록/반려 리스크 감소(검증)” + “피드 생성 자동화(페이로드 표준화)”에서 발생합니다.
