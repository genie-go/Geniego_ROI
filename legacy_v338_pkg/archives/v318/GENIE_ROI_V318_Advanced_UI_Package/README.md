# GENIE_ROI V318 (고급 운영형 + UI 확장) 패키지

V318은 V317을 다음 3가지로 “실전 운영형”에 더 가깝게 확장했습니다.

## V318 핵심 업그레이드
1) **CSV 컬럼 매핑 UI(드래그/선택 기반)**
- 채널별 CSV 헤더가 달라도, 업로드 전에 UI에서 ‘어떤 열이 date/campaign_id/cost…인지’ 직접 선택
- 저장된 매핑은 `templates/v318/custom_mappers.json`에 누적되어 다음부터 자동 적용

2) **전환 귀속 “우선순위 체인”**
- 단일 룰 선택(V317) → 복수 룰 우선순위(예: `ad_id > campaign_id > utm_campaign`)
- 동일 전환 레코드는 체인에서 **첫 번째로 매칭되는 키 1개에만** 귀속(중복 집계 방지)

3) **환율/세금 운영 옵션 강화**
- UI에서 `fx_rates.json` 업로드(또는 편집) 가능
- 광고비를 원통화(cost_net)와 기준통화(cost_base)로 동시 관리

---

## 빠른 시작

### 1) DB 초기화
```bash
python scripts/v318/init_db.py --db data/genie_roi.db
```

### 2) 웹 UI 실행 (업로드 + 매핑 + 귀속체인 + 대시보드)
```bash
python scripts/v318/run_web_ui.py --db data/genie_roi.db --port 8787
```

- 업로드/설정 UI: http://localhost:8787/ui/
- 대시보드: http://localhost:8787/dashboard/

---

## 문서
- docs/v318/V318_OVERVIEW_KO.md
- docs/v318/V318_MAPPING_UI_KO.md
- docs/v318/V318_ATTRIBUTION_CHAIN_KO.md
- docs/v318/V318_PLATFORM_COMPARISON_KO.md

## 요구사항
- Python 3.10+
- 표준 라이브러리만 사용(추가 설치 불필요)
