# V324 Overview (KO)

V324는 V323(운영형)를 기반으로 다음을 추가/확장한 '준 엔터프라이즈' 버전입니다.

## 1. SSO 연동 (SAML / OIDC)
- V324는 표준 라이브러리만 사용하므로, **앱 내부에서 SAML/OIDC 토큰 검증을 직접 수행하지 않습니다.**
- 대신 실무에서 가장 흔한 방식인 **SSO 게이트웨이/리버스프록시(예: Nginx + oauth2-proxy, Keycloak Gatekeeper 등)** 뒤에서 운영합니다.
- 프록시가 SAML/OIDC 인증을 완료하면, 앱으로 `X-Auth-User`(기본값) 또는 `Remote-User` 헤더로 사용자 ID를 전달합니다.
- 앱은 해당 헤더를 신뢰(사내망/프록시 보호 전제)하여 자동 로그인/세션을 발급합니다.

환경변수:
- `GENIE_ROI_SSO_ENABLED=1`
- `GENIE_ROI_SSO_HEADER=X-Auth-User` (기본)

## 2. 감사로그 (Audit Log)
- 중요한 작업을 `workspace/data/ops_v324.db`에 저장합니다.
- 조회 API: `/p/<project_id>/api/audit`

## 3. 권한 세분화 + 승인 워크플로우
- role 기반(RBAC)을 유지하면서, 기능별 permission을 추가했습니다.
- 승인 워크플로우가 켜져 있으면(기본 ON), 업로드/커넥터 실행/마켓 피드 출력 등은 '승인요청'으로 생성되고,
  approver가 승인하면 Job Queue에 들어가 실행됩니다.

환경변수:
- `GENIE_ROI_APPROVAL_REQUIRED=1` (기본)

API:
- 승인 목록: `/p/<project_id>/api/approvals?status=pending`
- 승인/반려: `POST /p/<project_id>/api/approve` (id, decision=approve|reject)

## 4. 대용량 처리: 배치/증분/큐
- `ops_v324.db` 기반의 `job_queue`로 무거운 작업을 백그라운드(worker thread)에서 실행합니다.
- ingest 스크립트는 `ingest_log` 테이블에 파일 해시를 저장하여 **중복 업로드를 자동 스킵(증분)** 합니다.

## 5. 데이터 커넥터(자동 수집)
- 프로젝트별 `templates/v324/connectors.json`에 자격증명을 저장하고,
  `/api/connectors/run` 으로 지정 날짜 데이터를 수집합니다.
- 기본 제공 예시:
  - Meta(Insights)
  - Naver SearchAd(서명 방식 예시)
  - Google Ads(searchStream REST 예시)

주의: 실제 운영에는 토큰 발급/앱 승인/권한 설정이 필요합니다.

## 6. 오픈마켓(상품등록/정보수집) 스캐폴딩
- 제품 카탈로그를 `projects/<project_id>/data/products.json`로 관리
- 채널별 CSV 피드 생성(네이버/쿠팡/11번가/지마켓/옥션/범용)
- '정보수집'은 크롤링 자체를 포함하지 않고, 합법적인 ETL 결과를 적재하는 인터페이스를 제공합니다.
