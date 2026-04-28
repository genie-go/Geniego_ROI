# GENIE_ROI V317 (운영형 + 웹 UI) 패키지

V317은 V316 운영형을 다음 3가지 방향으로 확장한 버전입니다.

## V317 추가/강화 기능
1) **채널별 CSV 형식 차이 더 폭넓게 커버**
- 헤더 다양성(영문/국문/플랫폼별 변형) 매핑 강화
- 통화/세금 처리 지원
  - 통화(Currency) 컬럼이 있거나 파일명에 통화가 포함된 경우 인식
  - FX 환율(`templates/v317/fx_rates.json`)로 기준 통화(기본 KRW) 변환
  - 세금 포함/별도(cost_tax 포함) 및 tax_rate 적용 지원

2) **웹 UI에서 CSV 업로드 버튼 → 즉시 자동 처리(폴더 드롭 없이)**
- 표준 라이브러리만 사용(추가 설치 없음)
- 업로드 → 즉시 적재 → JSON 생성 → 대시보드 갱신

3) **전환 귀속 룰(UTM/캠페인ID/소재ID)을 UI에서 선택**
- 귀속 모드:
  - `campaign_id`
  - `utm_campaign`
  - `ad_id`
- 선택 값은 DB의 `attribution_config`에 저장되며,
  JSON 생성 시 해당 룰로 조인/집계를 수행합니다.

---

## 빠른 시작

### 0) Python
- Python 3.10+ 권장

### 1) DB 초기화
```bash
python scripts/v317/init_db.py --db data/genie_roi.db
```

### 2) 웹 UI 실행 (업로드 + 대시보드)
```bash
python scripts/v317/run_web_ui.py --db data/genie_roi.db --port 8787
```

브라우저:
- 업로드 UI: http://localhost:8787/ui/
- 대시보드: http://localhost:8787/dashboard/

---

## 샘플로 바로 확인(선택)
```bash
python scripts/v317/init_db.py --db data/genie_roi.db
python scripts/v317/ingest_ads.py --db data/genie_roi.db --csv sample_data/ads/google_ads_sample.csv --channel google_ads
python scripts/v317/ingest_conversions.py --db data/genie_roi.db --csv sample_data/conversions/conversions_sample.csv
python scripts/v317/generate_dashboard_json.py --db data/genie_roi.db --out out
python scripts/v317/run_web_ui.py --db data/genie_roi.db --port 8787
```

---

## 핵심 폴더
- `scripts/v317/` : 운영 스크립트(적재/대시보드/웹 UI)
- `db/migrations/0060_v317_ops_ui.sql` : DB 스키마
- `templates/v317/` : 채널 매퍼/환율/설정
- `dashboard/` : 로컬 대시보드(정적)
- `out/` : JSON 생성물
- `sample_data/` : 샘플 CSV

---

## 문서
- docs/v317/V317_OVERVIEW_KO.md
- docs/v317/V317_ATTRIBUTION_RULES_KO.md
- docs/v317/V317_PLATFORM_COMPARISON_KO.md
