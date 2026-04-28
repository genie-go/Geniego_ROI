# GENIE_ROI V329fh (SaaS-Feeling Upgrade)

V329fh는 V328에서 지적된 '상용 SaaS 수준 부족' 항목을 **점수 올리기 우선순위**로 끌어올린 버전입니다.

핵심 목표는 아래 4가지입니다.

1) **UI**: 차트/드릴다운/필터/리포트 다운로드 + 권한별 메뉴(RBAC)  
2) **Pixel**: 이벤트 스키마 버전 + 재처리(Replay) + 중복제거(Idempotency) + 동의모드(CMP-lite)  
3) **ID Graph**: 해시 정책(옵션 salt) + 신뢰도(confidence) + 병합 규칙(그룹 merge) + 크로스디바이스 기반(identify)  
4) **커넥터**: 한국 채널 최소 2~3개를 “완성본 형태”로 탑재(스마트스토어/쿠팡/카카오모먼트)

---

## 1. SaaS 느낌 UI (운영 콘솔)

- 파일: `dashboard/ui_v329fh.html`
- 로그인: `dashboard/login_v329fh.html`

### 무엇이 좋아졌나
- **필터**: 프로젝트/기간/채널/검색어
- **차트**: 일자별 지출 vs 매출(기여), 채널별 기여(Top)
- **드릴다운**: 테이블 행 클릭 → 상세 진단/추천 액션 표시
- **다운로드**:
  - `/api/export?format=csv|json&scope=dashboard_rows|pixel_events|id_graph_nodes`
  - `/api/report_bundle?format=zip` : 보고서 번들 ZIP (dashboard json + id graph summary + report.md)
- **권한별 메뉴**: viewer/analyst/manager/admin 에 따라 메뉴 자동 노출

---

## 2. Pixel (퍼스트파티 수집)

- 서버 엔드포인트:
  - `/p/<project>/pixel/p.js` : 설치 스크립트 제공
  - `/p/<project>/pixel/e` : 브라우저 이벤트 수집
  - `/p/<project>/pixel/s2s` : 서버사이드 이벤트 수집 (X-API-Key)

### V329fh에서 추가/강화된 점
- **schema_version=2**: 이벤트 스키마 버전 필드 포함
- **event_id 기반 멱등성**: 동일 event_id는 DB에 1번만 저장(중복 제거)
- **재처리(Re-play) 준비**: 브라우저에서 localStorage 큐로 재전송(망/브라우저 실패 대비)
- **CMP-lite 동의모드**:
  - `genie_consent=1`일 때만 이벤트 전송
  - 동의/거부 배너 기본 포함
  - 기존 CMP가 있다면 `genie('consent', true/false)`로 연동

---

## 3. ID Graph (Identity stitching)

- 테이블:
  - `id_graph_edges_v329fh` : 연결(edge) + confidence + evidence
  - `id_graph_nodes_v329fh` : 노드(type,value) + group_id(병합 결과) + best_confidence

### 병합 규칙(간단하지만 운영형)
- identify 이벤트로 들어온 `anon ↔ email_hash/customer_id/phone_hash` 를 edge로 저장
- edge 추가 시 두 노드가 속한 group_id를 병합(Union-Find의 DB 버전)
- confidence는 식별자 강도에 따라 기본값 부여(예: email_hash 0.95)

---

## 4. 커넥터 (KR 채널 2~3개 탑재)

- `scripts/v329fh/connectors_coupang.py` : 쿠팡 Open API (HMAC signature)
- `scripts/v329fh/connectors_smartstore.py` : 네이버 스마트스토어(커머스) 형태( OAuth2는 프로젝트별 endpoint 확정 필요 )
- `scripts/v329fh/connectors_kakao_moment.py` : 카카오모먼트 광고 리포트 형태(참조 구현)

> 실제 운영에서는 각 채널 앱 등록/승인/키 발급이 필요하며,
> 프로젝트마다 스코프와 엔드포인트가 달라질 수 있어 **credential 세팅**이 전제입니다.

---

## 빠른 실행(로컬)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scripts/v329fh/run_web_ui.py --workspace workspace --host 0.0.0.0 --port 8080
```

브라우저:
- http://localhost:8080/login_v329fh.html
- http://localhost:8080/ui_v329fh.html

