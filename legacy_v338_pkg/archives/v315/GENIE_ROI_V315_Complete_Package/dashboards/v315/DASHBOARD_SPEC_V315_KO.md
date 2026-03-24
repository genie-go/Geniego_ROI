# V315 대시보드 구조(구현 독립 명세)

## 1) 공통 KPI 카드
- 총 광고비(Spend)
- 총 매출(Revenue)
- 총 전환(Conversions)
- ROAS(Revenue/Spend)
- CPA(Spend/Conversions)
- CTR(Clicks/Impressions)
- CVR(Conversions/Clicks)

## 2) 트렌드
- 일별 광고비 vs 매출(2축 가능)
- 일별 ROAS/CPA
- 캠페인별 ROAS 분포(히스토그램/박스)

## 3) 랭킹 테이블
- 채널별 TOP 캠페인(ROAS 기준)
- 채널별 Worst 캠페인(CPA 기준)
- 소재/광고그룹 단위(데이터가 있으면 drill-down)

## 4) (선택) 인플루언서 패널
- 인플루언서별 콘텐츠 조회수/링크 클릭/참여율
- 점수(run_id)별 Top/Bottom
- 리스크 신호(가짜 팔로워/급증 패턴 등) 경고 리스트

## 5) 출력 데이터
- `out/dashboard_ads_kpi.json`
- (선택) `out/dashboard_influencer_kpi.json`

> BI(예: Looker Studio, Power BI, Tableau) 또는 자체 웹 대시보드 모두 적용 가능하도록
> “데이터 스키마 + KPI 정의” 중심으로 설계했습니다.
