# V360 통합 노트 (V358 + V304~V320)
- 기준 코드베이스: GENIE_ROI_V358 (통합 플랫폼)
- V304~V320 패키지는 `legacy_v338_pkg/archives/` 아래에 원본 형태로 포함(레퍼런스/마이그레이션 참고용)

## V360 고도화(리뷰 엔드포인트 완전 고정 강화)
- 와일드카드('...') 금지
- 템플릿 경로(`{param}`) + 파라미터 패턴(정규식) 지원
- PUT /config/reviews/endpoints 시 스키마/패턴 검증 강화
- 소스 생성/실행 시 allowlist 기반 overwrite + 위반 즉시 차단(400/403)
- AuditLog 기록(설정 변경/차단 이벤트)

## 승인된 엔드포인트 선택형 관리
- /config/reviews/endpoints/catalog : 엔드포인트 키 카탈로그
- /admin/reviews/endpoints/ui : 간단 관리 UI(드롭다운)
