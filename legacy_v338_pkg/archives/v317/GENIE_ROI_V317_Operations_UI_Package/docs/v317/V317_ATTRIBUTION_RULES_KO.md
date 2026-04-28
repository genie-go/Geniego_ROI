# 전환 귀속(Attribution) 룰 안내 (V317)

V317에서는 전환(구매/리드/매출)을 광고 성과와 연결할 때, 운영 상황에 맞게 룰을 선택할 수 있습니다.

## 지원 룰
1) campaign_id (캠페인 ID로 매칭)
- 광고 CSV와 전환 CSV 모두에 `campaign_id`가 있을 때 가장 단순/안정적

2) utm_campaign (UTM 캠페인으로 매칭)
- 전환 CSV가 웹/GA/쇼핑몰 로그 기반이고 UTM을 주로 쓰는 경우 적합
- 전환 CSV에 `utm_campaign`이 필요

3) ad_id (소재/광고 ID로 매칭)
- 캠페인 단위가 아니라 소재 단위로 성과를 보고 싶을 때
- 광고 CSV에 `ad_id` / 전환 CSV에 `ad_id`가 필요(또는 UTM에 ad_id를 심어야 함)

## 실무 팁
- 운영 초기는 campaign_id로 시작 → 데이터가 안정되면 UTM 또는 ad_id로 고도화
- 여러 룰이 혼재하면, 우선순위 룰(예: ad_id > campaign_id > utm_campaign)을 추가하는 방식으로 확장 가능
