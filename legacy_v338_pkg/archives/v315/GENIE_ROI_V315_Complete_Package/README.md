# GENIE_ROI V315 Complete Package (전체 소스 포함)

이 ZIP은 “광고만 운영”과 “인플루언서 포함 운영”을 **선택적으로** 지원하는
ROI 중심 운영 시스템의 **참조 구현(reference implementation)** 패키지입니다.

## 핵심 기능
- 채널별 광고 CSV 업로드(구글/메타/틱톡/네이버 예시) → 통합 DB 스키마 적재
- 전환/매출 데이터 적재(캠페인ID/UTM/쿠폰 기반 귀속)
- CTR/CVR/ROAS/CPA 자동 계산(뷰)
- 대시보드용 JSON 산출(어떤 BI/웹 대시보드에도 연결 가능)
- (선택) 인플루언서 점수 자동 계산 + 가중치 설정(JSON + 로컬 편집기)

## 요구사항
- Python 3.10+
- 패키지: pandas (일반적으로 설치됨)
- DB: SQLite(기본 내장)

## Quick Start
1) 광고 CSV 적재
```
python scripts/v315/unified_ingest.py --db genie_roi.db --channel google_ads --csv sample_data/google_ads_export.csv --cost_unit currency
python scripts/v315/unified_ingest.py --db genie_roi.db --channel meta_ads   --csv sample_data/meta_ads_export.csv
```

2) 전환/매출 적재
```
python scripts/v315/ingest_conversions.py --db genie_roi.db --csv sample_data/conversions.csv
```

3) KPI/대시보드 JSON 생성
```
python scripts/v315/generate_dashboard_json.py --db genie_roi.db --outdir out
```

4) (선택) 인플루언서 점수 가중치 편집
- `templates/v315/weight_editor.html` 을 브라우저에서 열고 JSON 다운로드
- 다운로드한 `weights.json`을 `templates/v315/weights.json`로 교체

5) (선택) 인플루언서 점수 계산
```
python scripts/v315/influencer_scoring.py --db genie_roi.db --run_note "V315 scoring"
```

## 참고
- 실제 광고 플랫폼 내보내기 컬럼은 계정/지역/설정에 따라 달라질 수 있습니다.
  이 경우 `templates/v315/channel_mappers.json`에서 컬럼 매핑을 조정하세요.
