# V391 채널 확장 로드맵 (현실적 범위)

## 현재 런타임에서 '실제 동작'하는 커넥터
- Meta Marketing API (Facebook/Instagram Ads)
- TikTok Ads
- Shopify Admin API
- Amazon SP-API: 인증/서명 포함 스켈레톤(실운영용으로는 엔드포인트 추가/권한 승인 절차 필요)

## 이번 V391에 추가한 STUB(명세 뼈대)
- Shopee OpenAPI
- Qoo10 QAPI
- Rakuten RMS

> STUB는 '코드가 아직 없는 상태'의 명세 파일입니다.
> 즉, UI/DB/정규화 모델을 붙이기 위한 최소 토대만 제공합니다.

## STUB를 '실운영 커넥터'로 올리기 위한 체크리스트
1) 인증(토큰 발급/갱신/서명) 구현
2) 증분 동기화(SyncCursor) 기준 정의 (updated_at / cursor / pagination)
3) Canonical 모델 매핑(Product, Order, Settlement 등)
4) Rate limit / 재시도 / 백오프 / idempotency
5) Write-back 시 승인(ApprovalRequest) 강제 + 정책검증(PolicyFinding)
6) 감사로그(AuditLog)와 변경 이력(WritebackJob) 저장
7) 채널별 금지 데이터/PII 저장 금지 정책 적용

## 예상 개발 난이도(상/중/하)
- Shopee: 중~상 (서명/파트너키/권한 범위가 복잡)
- Qoo10: 중 (API 품질 편차, 필드 매핑이 복잡)
- Rakuten: 상 (지역별 차이, 접근 제약/IP, 스키마 복잡)

