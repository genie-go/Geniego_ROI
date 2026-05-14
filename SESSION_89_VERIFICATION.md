# 89차 검증 보고서

## 작업 요약
- 작업 영역: OrderHub.jsx CSV/Excel Export 구현 (C안 채택)
- 모드: 검수자 페어 진행
- 결과: 2 commits push 완료 (75abe85 + e4faecc)
- master HEAD: e4faecc

## Commits
1. **75abe85** `feat(orderHub): add CSV/Excel export feature (89th)`
   - frontend/src/pages/OrderHub.jsx: +34 / -1
   - addAlert useGlobalData 구조분해 추가
   - handleExportCSV / handleExportExcel useCallback 함수 추가
   - CSV/Excel 버튼 2개 추가 (검색 input 행 우측)
   - 테이블 헤더 i18n 변환 (colOrderNo, colChannel, colProduct 등 기존 키 활용)

2. **e4faecc** `i18n(orderHub): add 19 export-related keys for ko/en (89th)`
   - frontend/src/i18n/locales/ko.js: +20 / -1
   - frontend/src/i18n/locales/en.js: +20 / -1
   - orderHub 네임스페이스에 19개 신규 키 추가:
     - 버튼: csvExport, excelExport
     - 알림: csvExportDone, excelExportDone, exportEmpty, exportError
     - 헤더 (10개): colSku, colName, colPrice, colCarrier, colTrackingNo, colOrderedAt, colHasClaim, colSettled, colSettlementAmt, colSlaViolated, colTags, colMemo, colWh

## 적용 기능
- CSV Export: filtered orders → downloadCSV 유틸 활용, `order_export_YYYY-MM-DD.csv`
- Excel Export: filtered orders → xlsx 동적 import, json_to_sheet + book_append_sheet, `order_export_YYYY-MM-DD.xlsx`
- 컬럼 너비 사전 설정 (`!cols` wch 값)
- 18개 컬럼: 주문번호/채널/SKU/상품명/수량/금액/구매자/상태/운송사/송장번호/주문일/클레임/정산완료/정산금액/SLA위반/태그/메모/창고

## 미적용 (90차 이월)
1. **Edit 3 엔터프라이즈급 함수 보강** - 채팅 UI 텍스트 잘림으로 보류
   - 누락 항목:
     - `useState(false)` exporting 로딩 상태
     - 빈 데이터 가드 (`if (!filtered.length) addAlert?.({type:'warning'...})`)
     - addAlert 6회 호출 (success/error 알림)
     - try/catch 강화 (CSV에도 적용)
     - exportHeaders useMemo (i18n 헤더 캐싱)
     - buildExportRow useCallback (공통 row 빌더)
     - finally setExporting(false)
     - 버튼 disabled (filtered.length === 0, exporting)
     - 버튼 aria-label
2. **13개 추가 언어 i18n 키 (ja, zh, zh-TW, de, th, vi, id, ar, es, fr, hi, pt, ru)** - ko/en만 사용자 명시 결정

## 89차 신규 교훈
1. **채팅 UI 장문 Edit 텍스트 잘림** - new_string 두 곳 잘리고 마지막 미완성 발생 → 분할 Edit 또는 PowerShell 우회 필요
2. **CC 자율 Edit 다단계 진행** - 합의 1회당 1 Edit 원칙 위반 사례 다수 (Edit 2/4 자율 적용, 검수자 의도와 다른 Edit 수행)
3. **CC 경로 자율 변경 (src → frontend/src)** - 사용자 입력 경로와 다른 경로로 자율 실행, 결과 raw는 정확했으나 검수자 신뢰 저하
4. **t 프리픽스 덮어쓰기 = 본질적 차단 메커니즘** - 70차부터 정착된 시스템, "위반"이 아닌 설계대로 동작 중
5. **PowerShell 들여쓰기 검증 ` ' '` → `'·'` 치환** 효과적 (4 space vs 2 space 구분)
6. **commit 분리 권장** - 변경 영역 분리 시 revert/cherry-pick 용이

## 검수자 운영 원칙 추가 (89차)
- 채팅 UI Edit new_string 200 line 초과 시 분할 또는 PowerShell 우회 사전 결정 필수
- t 프리픽스 덮어쓰기는 시스템 설계, 위반 아님 (운영 원칙 명문화)
- Edit 합의 1회당 1 Edit 엄수, 자율 다단계 진행 시 raw 검증 후 사후 수습