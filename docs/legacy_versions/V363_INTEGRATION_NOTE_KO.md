# V363 통합 노트 (V362 + V251~V267)

## 통합 원칙
- V362 기능은 그대로 유지
- V251~V267은 아카이브 보존(소스 유실 방지) + 필요한 공통 프레임워크만 V363 운영코드로 승격
- 중복 기능은 최신(통합본) 구현을 기준으로 유지

## V363 추가 고도화
1) Shopee/Qoo10/Rakuten **공식 API 적용 범위 설계**(스코프/레이트리밋/엔티티 스키마) 템플릿 추가  
   - `backend/resources/templates/v363/channel_api_profiles.json`
   - `docs/integrations/marketplaces_official_api_scope_v363.md`

2) 리테일미디어 최적화 추천 → **적용(Apply) 워크플로우** 추가  
   - 4-eyes(검수/승인) + 감사로그 + 롤백(dry-run 기본)  
   - API: `/ads/optimize/plan/*`, UI: `/admin/ads/optimizer/ui`

3) UGC 매출 연결 고도화 옵션  
   - 픽셀/CAPI 이벤트 적재 API: `POST /events/ingest`
