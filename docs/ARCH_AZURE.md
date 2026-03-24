# V377 Azure 아키텍처 설계(권장)

## 1) 기본(권장) 구성: Azure Container Apps(or AKS) + Azure Database for PostgreSQL
- **Azure Front Door**: 글로벌 라우팅/캐싱 + WAF
- **Static Web Apps**(또는 Blob Storage + CDN): React 정적 호스팅
- **Container Apps**(간단) 또는 **AKS**(대규모/정교)
  - api 서비스
  - worker 서비스
- **Azure Database for PostgreSQL**: 트랜잭션 데이터
- **Azure Storage**: PDF 리포트, 원본 데이터(옵션)
- **Service Bus Queue**: 수집/배치 작업 큐
- **Application Insights**: 관측(로그/트레이싱)
- **Key Vault**: 토큰/시크릿 보관
- **Azure Scheduler/Logic Apps**: 스케줄 배치 트리거

## 2) 네트워크/보안
- VNet 통합, Private Endpoint(Postgres/Storage/KeyVault)
- WAF 정책(봇/공격 차단), RBAC/AAD 연동(SSO 확장)

## 3) 배포 파이프라인
- GitHub Actions → ACR push → Container Apps(or AKS) rollout
- 프론트: build → Static Web Apps 배포

### 텍스트 다이어그램
User -> Front Door(WAF) -> UI(Static) 
User -> Front Door -> Container Apps(API)
Worker <-> Service Bus
API/Worker <-> Azure Postgres
API/Worker <-> Storage/KeyVault
Telemetry -> App Insights
