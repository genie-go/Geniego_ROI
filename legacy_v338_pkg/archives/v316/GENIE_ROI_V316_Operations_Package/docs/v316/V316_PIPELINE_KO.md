# V316 운영 파이프라인

## 1) 데이터 유입
- 광고 CSV: inbox/ads/
- 전환/매출 CSV: inbox/conversions/

## 2) 배치 감시(batch_watch.py)
- 일정 주기 폴더 스캔
- 광고 파일명 `채널__*.csv` → 채널 자동 추론

## 3) 통합 적재
- 광고: ads_campaign_daily (date, channel, campaign_id, impressions, clicks, cost)
- 전환: conversions_daily (date, campaign_id/utm, conversions, revenue)

## 4) KPI 산출
- v316_ads_kpi_daily 뷰에서 CTR/CVR/ROAS/CPA 계산

## 5) JSON 생성
- out/dashboard_ads_kpi.json
- (선택) out/dashboard_influencer_kpi.json

## 6) 로컬 대시보드
- run_local_dashboard.py → /dashboard/ 에서 즉시 시각화
