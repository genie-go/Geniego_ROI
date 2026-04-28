# GENIE_ROI V319 (실전 운영형 + 자동추천 + 템플릿 + 귀속확장 + Drill-down) 패키지

V319는 V318을 다음 3개 축으로 즉시 업그레이드한 버전입니다.

## V319 업그레이드 요약
1) **매핑 UI 자동 추천(유사도) + 템플릿 내보내기/가져오기**
- CSV 헤더를 읽으면, 표준 필드(date/campaign_id/cost...)에 대해 **자동 추천**(문자 유사도 + 키워드)
- [템플릿 내보내기]로 매핑 JSON을 다운로드
- [템플릿 가져오기]로 매핑 JSON을 업로드하면 DB에 적용(대행사/브랜드 간 재사용)

2) **귀속 체인 확장: 우선순위 + fallback(부분 매칭)**
- 예: `ad_id > campaign_id > utm_campaign`
- 각 룰에서 `exact`가 실패하면 선택적으로 `contains/startswith` 같은 fallback을 적용
- 전환 레코드는 여전히 **한 번만 귀속**(중복 집계 방지)

3) **대시보드 Drill-down 탭 추가**
- Campaign → Ad Group → Ad(소재) 순으로 집계를 내려가며 확인
- ROAS/CPA/비용/매출/전환을 계층적으로 비교

---

## 빠른 시작

### 1) DB 초기화
```bash
python scripts/v319/init_db.py --db data/genie_roi.db
```

### 2) 웹 UI 실행
```bash
python scripts/v319/run_web_ui.py --db data/genie_roi.db --port 8787
```

- UI: http://localhost:8787/ui/
- Dashboard: http://localhost:8787/dashboard/

---

## 문서
- docs/v319/V319_OVERVIEW_KO.md
- docs/v319/V319_MAPPING_AUTOSUGGEST_TEMPLATES_KO.md
- docs/v319/V319_ATTRIBUTION_CHAIN_FALLBACK_KO.md
- docs/v319/V319_DASHBOARD_DRILLDOWN_KO.md
- docs/v319/V319_PLATFORM_COMPARISON_KO.md

## 요구사항
- Python 3.10+
- 표준 라이브러리만 사용
