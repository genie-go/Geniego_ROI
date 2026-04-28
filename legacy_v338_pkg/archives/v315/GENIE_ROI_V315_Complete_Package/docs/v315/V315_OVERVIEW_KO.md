# GENIE_ROI V315 (완성형) 개요

V315는 V314(광고만 모드 + 자동 리포트 + 대시보드 구조)에서 한 단계 더 나아가,
**채널별 CSV 업로드 → 통합 스키마(DB) 적재 → KPI 산출 → 대시보드 데이터(JSON) 생성**까지
한 번에 돌아가는 “운영 파이프라인” 예시를 포함한 패키지입니다.

## 무엇이 '완성형'인가요?
1) **광고만 운영(인플루언서 없이도 가능)**: Google/Meta/TikTok/Naver 등 채널별 CSV를 통합 스키마로 변환합니다.  
2) **인플루언서 운영(선택)**: 선정/리스크/성과 점수화를 가중치 파일로 관리하고 자동 계산합니다.  
3) **자동 리포팅**: 엑셀 템플릿 + DB 기반 KPI 산출 + 대시보드 JSON 출력.  
4) **가중치 설정 UI(로컬)**: weight_editor.html로 가중치(JSON)를 편집해 점수 엔진에 반영합니다.

## 폴더 구조(핵심)
- `db/migrations/0040_v315_complete.sql` : 통합 스키마/뷰
- `templates/v315/channel_mappers.json` : 채널별 CSV 헤더 매핑
- `templates/v315/weights.json` : 인플루언서 점수 가중치
- `templates/v315/weight_editor.html` : 가중치 편집기(로컬)
- `scripts/v315/unified_ingest.py` : 채널 CSV → DB 적재
- `scripts/v315/ingest_conversions.py` : 전환/매출 CSV → DB 적재
- `scripts/v315/generate_dashboard_json.py` : DB → dashboard JSON
- `scripts/v315/influencer_scoring.py` : 인플루언서 자동 점수화(예시 엔진)
- `spreadsheets/*.xlsx` : 자동 리포트 템플릿(엑셀/구글시트 변환 가능)
- `sample_data/` : 샘플 CSV

## 빠른 시작(로컬)
1) DB 스키마 생성 + 광고 CSV 적재  
   `python scripts/v315/unified_ingest.py --db genie_roi.db --channel google_ads --csv sample_data/google_ads_export.csv --cost_unit currency`

2) 전환/매출 CSV 적재  
   `python scripts/v315/ingest_conversions.py --db genie_roi.db --csv sample_data/conversions.csv`

3) 대시보드 JSON 생성  
   `python scripts/v315/generate_dashboard_json.py --db genie_roi.db --outdir out`

4) (선택) 인플루언서 점수화  
   - 인플루언서/콘텐츠 데이터를 먼저 적재(엑셀 템플릿 또는 DB 직접 입력)  
   - `python scripts/v315/influencer_scoring.py --db genie_roi.db --run_note "Feb scoring"`

> 주의: 실제 현업에서는 채널/API/권한에 따라 CSV 컬럼이 다를 수 있으므로,
> `channel_mappers.json`의 매핑을 내보내기 형식에 맞게 조정합니다.
