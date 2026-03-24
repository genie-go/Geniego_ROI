# SaaS 전환 설계 (V240 기준)

## 1) 멀티테넌시 기본
- 요청 헤더 `X-Tenant-Id` (예: `tenant_a`)로 테넌트 스코프 적용
- SaaS에서는:
  - 인증(SSO/OAuth) 후 토큰에 tenant_id를 포함
  - `X-Tenant-Id`는 내부 게이트웨이에서 주입하거나, JWT claim으로 대체

## 2) 인증/인가
권장 구성:
- API Gateway (Cloudflare / Kong / AWS API Gateway)
- Auth: OIDC (Google Workspace / Okta / Azure AD)
- RBAC:
  - Admin: 커넥터/시크릿/룰/정책 관리
  - Operator: 추천 승인/운영 실행
  - Viewer: 리포트/모니터링

## 3) 시크릿/토큰 관리
- Vault (HCP Vault / self-hosted) 권장
- 각 Provider별 Secret schema를 표준화:
  - google: access_token, refresh_token, developer_token, customer_id
  - meta: access_token, ad_account_id
  - ... (tiktok/naver/kakao)

## 4) 이벤트 기반 오퍼레이션
이미 포함된 구성 요소:
- Outbox 패턴 (`outbox.py`)
- Kafka Pub (`kafka_pub.py`), Consumer 서비스

SaaS 확장:
- 이벤트 토픽을 provider/tenant 단위 파티셔닝
- DLQ/재처리 정책, 리플레이 관리
- 작업 큐(예: Celery/Redis)로 전환 가능

## 5) 관측(Observability)
- Prometheus + Grafana 포함
- SaaS에서는:
  - OpenTelemetry tracing 추가
  - tenant 기반 metric label 관리(PII/카디널리티 제한)
  - 알림(Opsgenie/PagerDuty/Slack) 연동

## 6) 과금(Billing) 설계
주요 과금 단위:
- 연결된 광고 계정 수
- 동기화 캠페인 수
- 추천 생성/승인/실행 횟수
- 데이터 보관 기간

엔터프라이즈:
- On-prem ZIP 배포(현재) + 지원 계약
- Vault/SSO/감사로그 옵션

## 7) 데이터 모델 확장(권장)
- 시계열 지표 테이블: `campaign_metric_snapshots`
- 이상 이벤트 테이블: `anomaly_events`
- 추천/승인/실행 로그: `recommendations`, `actions`, `audit_logs`

본 ZIP은 빠른 실행을 위해 핵심 엔드포인트 중심으로 구성했으며,
SaaS 전환 시 위 항목을 단계적으로 추가하면 됩니다.
