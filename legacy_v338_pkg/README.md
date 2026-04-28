(Auto-generated) GENIE_ROI V335 Package

# GENIE_ROI V323 (멀티 프로젝트/대행사 운영 + 운영진단 고도화)
## V329fh (SaaS Parity Upgrade) 하이라이트
- ✅ React UI 외부 CDN 제거(오프라인 번들): `dashboard/dashboard_v329fh_offline.html`
- ✅ 커넥터별 프로덕션 상태관리: 토큰 갱신/권한/레이트리밋/증분 워터마크 (`scripts/v329fh/connectors.py` + `scripts/v329fh/ops_store.py`)
- ✅ MMM 고도화: Adstock/Saturation/진단/자동 리포트 해석 (`scripts/v329fh/mmm.py`)
- ✅ 1P Pixel + 서버사이드 이벤트 + ID 그래프: `/p/<project>/pixel/p.js`, `/pixel/e`, `/pixel/s2s` (`scripts/v329fh/pixel.py`)

### 실행
```bash
python3 scripts/v329fh/run_web_ui.py --workspace workspace --port 8080
```

V323는 V321을 기반으로 **대행사용 멀티 고객사(프로젝트) 분리 구조(DB/폴더/URL 파라미터)**를 추가하고,
운영 진단을 더 강화한 버전입니다. (Python 표준 라이브러리 + SQLite)

## V323 핵심 업그레이드
1) **멀티 프로젝트(=고객사/브랜드) 분리**
- URL prefix: `/p/<project_id>/ui/` , `/p/<project_id>/dashboard/`
- 프로젝트별로 **DB / templates / out** 폴더가 완전히 분리

2) **프로젝트 홈 + 생성 API**
- 홈: `/` 에서 프로젝트 목록/링크 제공
- 생성: `POST /api/projects/create` (id, name)

3) **매칭 실패 원인 요약(match_fail_summary)**
- 왜 귀속이 안 되는지(날짜에 전환 인덱스 없음 / 키 없음 / 후보 없음 / 룰로 필터링 / min_score 미달) 집계 제공
- 대시보드 JSON의 `diagnostics.match_fail_summary`로 노출

4) V321 기능 유지
- coverage(커버리지), unattributed_cost_top, CSV export, Basic Auth 옵션

---

## 빠른 시작

### 1) 웹 실행 (프로젝트 홈)
```bash
python scripts/v323/run_web_ui.py --port 8787
```

- 프로젝트 홈: http://localhost:8787/
- 예시 프로젝트 UI: http://localhost:8787/p/demo/ui/
- 예시 프로젝트 대시보드: http://localhost:8787/p/demo/dashboard/

(선택) Basic Auth:
```bash
export GENIE_ROI_BASIC_AUTH="admin:1234"
python scripts/v323/run_web_ui.py
```

---

## 워크스페이스 구조
```
<workspace>/
  data/projects.json
  projects/<project_id>/
    data/genie_roi.db
    out/dashboard_ads_kpi.json
    templates/v323/*.json
```

---

## 운영 팁(대행사)
- 고객사별로 프로젝트를 만들어 **DB를 분리**하세요.
- 고객사마다 CSV 컬럼명이 달라질 수 있으므로, 프로젝트별로 `custom_mappers.json`이 저장됩니다.
- 커버리지/미귀속 비용 Top/매칭 실패 원인 요약을 먼저 보고 룰을 조정하세요.



## V323 추가 기능
- 로그인/RBAC(사용자/권한)
- 프로젝트별 API Key (X-API-Key)
- 스케줄링 자동 갱신 (GENIE_ROI_SCHEDULE_TIME)
- 매칭 후보 TopN/스코어 설명 리포트 (diagnostics.match_explanations)


## V324 (준 엔터프라이즈 운영형)
- SSO 헤더 모드(OIDC/SAML via reverse proxy)
- Audit Log / Approvals / Job Queue
- Data Connectors(예시): Google Ads / Meta / Naver SearchAd
- Marketplace Feed Export(오픈마켓 CSV 피드)

실행:
```bash
python scripts/v324/run_web_ui.py --port 8787
```

SSO:
```bash
export GENIE_ROI_SSO_ENABLED=1
export GENIE_ROI_SSO_HEADER=X-Auth-User
```

## V334
- 멀티채널 상품등록/동기화 + 광고/인플루언서/리뷰/정산 수집을 위한 표준 스키마/정규화/KPI 템플릿 추가
- scripts/v334/run_web_ui.py
- templates/v334/*
- docs/v334/V334_OVERVIEW_KO.md


## V336
- Coupang/SmartStore 실제 업로드(상품 등록 + 재고/가격 동기화) CLI 추가: scripts/v336/sync_smartstore.py, scripts/v336/sync_coupang.py


## V337 (Channel Sync Hardening)
- Rate limit + retry(backoff) + job queue worker: scripts/v337/sync_worker.py
- Coupang approval polling + vendorItemId mapping: scripts/v337/connectors_coupang.py
- SmartStore optionNo mapping refresh + failure report: scripts/v337/connectors_smartstore.py


## V338
- Ops console: /dashboard/ui_v338.html
- APIs: /api/v338/sync/summary, /api/v338/bulk/price
