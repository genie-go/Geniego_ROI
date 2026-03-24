# V328 OVERVIEW (KO)

V328은 V327 패키지를 기반으로 **상용 SaaS(Triple Whale/Northbeam 계열)** 경쟁 제품에 가까운 운영 형태를 목표로 업그레이드한 버전입니다.

## 1) 오프라인 UI 번들(외부 CDN 제거)
- 기존 V327 React UI는 CDN(unpkg) 의존이 있었기 때문에, 방화벽/내부망/오프라인 환경에서 장애가 발생할 수 있었습니다.
- V328은 **외부 CDN 0개**를 목표로 `dashboard/dashboard_v328_offline.html`을 제공합니다.
  - Vanilla JS 기반(의존성 없음)
  - `/p/<project>/out/dashboard_ads_kpi.json`만 있으면 즉시 렌더링

## 2) 커넥터 프로덕션 패리티(토큰/권한/레이트리밋/워터마크)
- `scripts/v328/ops_store.py`에 `connector_state_v328` 테이블을 추가하여,
  - access/refresh token + expiry
  - scope/권한 스냅샷
  - 로컬 레이트리밋 가드(기본)
  - 증분 워터마크(date_cursor / id_cursor)
  를 채널별로 안전하게 저장합니다.
- `scripts/v328/connectors.py`는 "실제 API 연동"을 끼워 넣기 쉽게 **프로덕션 형태**를 제공하는 스켈레톤입니다.

## 3) MMM 고도화
- `scripts/v328/mmm.py`
  - Adstock(지연/잔존효과)
  - Saturation(한계효용 체감)
  - 진단(R²/AdjR²/RMSE + 지출 상관 기반 다중공선성 경고)
  - 자동 리포트 텍스트(초보자용 해석 + 주의사항)

## 4) 1P Pixel + Server-side 이벤트 + ID 그래프
- `scripts/v328/pixel.py` + `ops_store.py`
- 엔드포인트
  - `/p/<project>/pixel/p.js` : 설치 스크립트
  - `/p/<project>/pixel/e` : 브라우저 수집(기본)
  - `/p/<project>/pixel/s2s` : 서버사이드 수집(API Key 필요)
- ID 그래프
  - anonymous_id(쿠키) ↔ email_hash/customer_id 등의 edge를 축적
  - 크로스 디바이스/로그인 이후 경로를 1개의 사용자 여정으로 묶기 위한 최소 기능

## 시작하기(요약)
1. 프로젝트 생성 및 데이터 적재(V327 방식 동일)
2. `scripts/v328/run_web_ui.py`로 서버 실행
3. 사이트에 Pixel 설치(선택)
4. 커넥터 설정 후 증분 수집(선택)
5. MMM 리포트 생성(선택)
