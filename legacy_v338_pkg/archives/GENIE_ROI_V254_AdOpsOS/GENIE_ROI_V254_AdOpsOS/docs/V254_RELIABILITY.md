# V254 Reliability & Trust Framework

## 핵심 업그레이드
- **실행 안전성**: outbox 실행 + 실패 시 롤백 호출 + 상태머신 저장
- **정책/가드레일**: 예산 변동폭 제한, confidence gating
- **AI 신뢰성**: confidence + explain + risk 를 항상 반환, AI 장애 시 보수적으로 처리

## 주의
- 본 ZIP은 기본 `DRY_RUN=true`이며, 실제 채널 API 호출 코드는 포함하지 않습니다.
- 운영 실연동 시 아래를 반드시 추가해야 합니다:
  - OAuth/서명/키 관리(Secrets)
  - Quota/RateLimit, Retry, Backoff
  - Idempotency key
  - Snapshot 저장 + 진짜 롤백 구현
