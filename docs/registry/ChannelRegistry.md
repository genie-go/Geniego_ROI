# ChannelRegistry — 채널 레지스트리 (포인터)

> ★**주의**: "ChannelRegistry"는 이미 **코드 개념**이다 — `backend/src/Handlers/ChannelRegistry.php`(admin 채널 CRUD·`channel_registry` 테이블·`ChannelRegistry::upsert`). 이 문서는 그 코드 정본을 가리키는 레지스트리 문서(중복 신설 아님).
> 정본: 코드(ChannelRegistry/ChannelSync/AdAdapters/Connectors/ChannelCreds) + `docs/V391_CHANNEL_ROADMAP.md`·`CONNECTOR_EXPANSION_AD_DATASOURCES.md` + IMPLEMENTATION_STATUS §1.

## 채널 인벤토리 요약
- 커머스 20+ 실 fetch+writeback+정산(shopify/amazon/coupang/naver/ebay/tiktok_shop/rakuten/cafe24/11st/gmarket 등).
- 광고 6채널 실집행(meta/google/tiktok/naver_sa/kakao_moment/line_ads) + 광고 리포팅 20+ ingest.
- PG 15·물류·SNS-live·CS·ESP·리뷰 실어댑터.
- 자동연동 SSOT: `ChannelCreds::upsert`(POST /v423/creds)→채널유형별 자동 sync 디스패치(9유형).
- 레지스트리 기반 admin 채널추가(코드수정 없이 sync 편입).

## 원칙
- 신규 채널=ChannelRegistry upsert(admin) 또는 코드 어댑터. 채널키 정규화(short↔full·CRED_CHAN_ALIAS).
- 어댑터 없는 채널=genericFetch 정직 pending(가짜데이터 0).

## 갱신 규칙
신규 채널/어댑터·sync 경로 변경 시 코드 정본 + 여기 인벤토리 반영. 자격증명→자동sync 대칭 확인.
