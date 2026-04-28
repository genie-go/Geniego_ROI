# GENIE_ROI V316 (운영형) 패키지

V316은 V315 “완성형”을 **실제 운영에 더 가깝게** 확장한 버전입니다.

## V316 추가 기능
1) **채널별 CSV 업로드 폴더 감시 → 자동 적재(배치)**
- 지정 폴더에 CSV를 넣으면 일정 주기(기본 30초)로 새 파일을 감지해 DB에 자동 적재합니다.
- 처리 완료 파일은 `archive/`, 실패 파일은 `failed/`로 이동(로그 생성).

2) **대시보드 JSON → 로컬 웹 대시보드 즉시 시각화**
- KPI JSON 생성 후, 표준 라이브러리 `http.server`로 로컬 대시보드를 띄웁니다.
- 외부 CDN 없이 동작(오프라인 가능): 테이블 + 간단한 SVG 차트

3) **인플루언서 점수 엔진 운영형 고도화**
- 외부 입력 스키마 추가:
  - 오디언스 분포(국가/성별/연령대 비율)
  - 사기 추정치(가짜 팔로워 %, 의심 참여율 %)
- 이를 기반으로 **Risk / Fit**을 체계화하고 가중치로 총점 산출

---

## 빠른 시작

### 0) Python
- Python 3.10+ 권장

### 1) DB 초기화(SQLite)
```bash
python scripts/v316/init_db.py --db data/genie_roi.db
```

### 2) 샘플 데이터 적재(선택)
```bash
python scripts/v316/ingest_ads.py --db data/genie_roi.db --csv sample_data/ads/google_ads_sample.csv --channel google_ads
python scripts/v316/ingest_conversions.py --db data/genie_roi.db --csv sample_data/conversions/conversions_sample.csv
python scripts/v316/generate_dashboard_json.py --db data/genie_roi.db --out out
```

(선택) 인플루언서 운영 샘플
```bash
python scripts/v316/ingest_influencer_base.py --db data/genie_roi.db --influencers sample_data/influencers/influencers_sample.csv --results sample_data/influencers/influencer_campaign_results_sample.csv
python scripts/v316/ingest_influencer_external.py --db data/genie_roi.db --audience sample_data/influencers/audience_demographics_sample.csv --fraud sample_data/influencers/fraud_estimates_sample.csv
python scripts/v316/influencer_scoring.py --db data/genie_roi.db
python scripts/v316/generate_dashboard_json.py --db data/genie_roi.db --out out
```

### 3) 로컬 대시보드 실행
```bash
python scripts/v316/run_local_dashboard.py --port 8787
```
브라우저: http://localhost:8787/dashboard/

### 4) 운영형 배치(폴더 감시 → 자동 적재)
```bash
python scripts/v316/batch_watch.py \
  --db data/genie_roi.db \
  --watch-ads inbox/ads \
  --watch-conversions inbox/conversions \
  --interval 30 \
  --auto-generate-json
```

- 광고 CSV 파일명은 `채널__*.csv` 권장 (예: `google_ads__2026-02-27.csv`)
- 전환 CSV는 아무 이름이어도 가능

---

## 문서
- docs/v316/V316_OVERVIEW_KO.md
- docs/v316/V316_PIPELINE_KO.md
- docs/v316/INFLUENCER_RISK_FIT_SCHEMA_KO.md
- docs/v316/V316_PLATFORM_COMPARISON_KO.md

## 요구사항
- 표준 라이브러리 기반(추가 설치 불필요)

