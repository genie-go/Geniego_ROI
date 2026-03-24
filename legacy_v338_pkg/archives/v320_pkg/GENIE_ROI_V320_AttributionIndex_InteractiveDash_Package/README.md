# GENIE_ROI V320 (정규식/가중치/화이트리스트 + 인터랙티브 Drill-down + 부분매칭 인덱싱) 패키지

V320은 V319를 다음 3가지로 실전 운영에 더 적합하게 확장했습니다.

## V320 업그레이드 요약
1) **fallback 오탐 감소(정규식 룰/가중치/화이트리스트)**
- 룰별 매칭 방식을 점수화(exact/startswith/contains/regex)해서 **최고 점수 매칭만 채택**
- 최소 점수(threshold) 미만은 미귀속 처리
- 룰별 whitelist(허용 키 목록)로 후보군을 제한하여 오탐을 크게 줄임
- 선택적으로 정규식 normalize(예: AD01_v2 → AD01) 가능

2) **대시보드 Drill-down 인터랙션**
- Campaign 테이블 행 클릭 → Ad Group/Ad 테이블이 해당 캠페인으로 즉시 필터링
- Ad Group 행 클릭 → Ad 테이블이 해당 그룹으로 추가 필터링
- [필터 해제] 버튼 제공

3) **대규모 데이터 성능: 부분 매칭 인덱싱**
- contains/startswith fallback이 O(N) 전체 스캔이 되지 않도록
  - prefix 인덱스(앞 N글자)
  - token 인덱스(키 토큰 분해)
  - whitelist 기반 후보 축소
를 사용하여 빠르게 후보를 찾음

---

## 빠른 시작

### 1) DB 초기화
```bash
python scripts/v320/init_db.py --db data/genie_roi.db
```

### 2) 웹 UI 실행
```bash
python scripts/v320/run_web_ui.py --db data/genie_roi.db --port 8787
```

- UI: http://localhost:8787/ui/
- Dashboard: http://localhost:8787/dashboard/

---

## 문서
- docs/v320/V320_OVERVIEW_KO.md
- docs/v320/V320_ATTRIBUTION_RULES_KO.md
- docs/v320/V320_INDEXING_PERFORMANCE_KO.md
- docs/v320/V320_DASHBOARD_INTERACTION_KO.md
- docs/v320/V320_PLATFORM_COMPARISON_KO.md

## 요구사항
- Python 3.10+
- 표준 라이브러리만 사용
