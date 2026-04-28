# V315 CSV 업로드 → 통합 DB → 대시보드 파이프라인

## 1) 채널 CSV 업로드(광고비/노출/클릭)
- `scripts/v315/unified_ingest.py`가 채널별 헤더를 `channel_mappers.json`로 매핑하여
  `ads_campaign_daily`로 적재합니다.

### 채널별로 헤더가 다른 이유
각 광고 플랫폼의 내보내기(export) 형식이 다르기 때문입니다.
그래서 V315는 “매핑 파일”을 분리해 유지보수 비용을 줄였습니다.

## 2) 전환/매출 적재
- `scripts/v315/ingest_conversions.py`가 `conversions_daily`에 적재합니다.
- 연결 방식(귀속)은 운영 환경에 따라 선택합니다:
  - 캠페인ID 기반(가장 간단)
  - UTM 기반(채널/캠페인 세분화)
  - 쿠폰/제휴링크 기반(인플루언서 포함 시)

## 3) KPI 산출(뷰)
- `v315_ads_kpi_daily` 뷰에서 CTR/CVR/ROAS/CPA를 계산합니다.

## 4) 대시보드 데이터(JSON) 생성
- `scripts/v315/generate_dashboard_json.py`가 BI/웹 대시보드로 넘기기 좋은 JSON을 생성합니다.

## 5) (선택) 인플루언서 점수/리스크 자동화
- 가중치 파일: `templates/v315/weights.json`
- 편집 UI: `templates/v315/weight_editor.html` (로컬 HTML)
- 점수 엔진: `scripts/v315/influencer_scoring.py`

> 점수 엔진은 '예시 구현'입니다. 실제 운영에서는 오디언스 분포/가짜 팔로워 추정 등 외부 데이터가 들어와야 하며,
> 그 입력값을 score 테이블에 저장한 뒤 합산하도록 확장합니다.
