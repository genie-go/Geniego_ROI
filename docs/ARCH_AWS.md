# V377 AWS 아키텍처 설계(권장)

## 목표
- 멀티테넌트 SaaS
- Revenue + Risk + Governance + Settlement 통합 운영 OS
- 리테일러 커넥터/수집 파이프라인의 안정성(재시도/관측)
- 엔터프라이즈 보안(SSO/SAML 확장, 감사로그)

## 1) 기본(권장) 구성: ECS Fargate + RDS + S3 + CloudFront
- **CloudFront**: 정적 UI(React) 캐싱 + WAF 연동
- **S3**: 프론트 빌드 산출물, PDF 리포트 저장, 수집 원본(옵션)
- **ALB**: API 트래픽 라우팅
- **ECS Fargate**
  - api 서비스 (FastAPI)
  - worker 서비스 (수집/정규화/AI batch run)
- **RDS Postgres**: 트랜잭션/정합성 중심 데이터
- **ElastiCache Redis**(옵션): rate-limit, job queue, 세션 캐시
- **SQS**(권장): 수집 작업 큐, 배치/재처리 큐
- **CloudWatch**: 로그/메트릭/알람
- **Secrets Manager**: 커넥터 토큰/DB 패스워드 보관
- **EventBridge**: 스케줄링(예: 매일 02:00 risk batch 예측)

## 2) 네트워크
- VPC (2AZ)
- Public Subnet: ALB
- Private Subnet: ECS tasks, RDS
- NAT Gateway: 외부 API 호출 필요 시

## 3) 보안
- WAF(봇/공격 차단)
- KMS 암호화(RDS, S3, Secrets)
- 감사로그(AuditLog) → CloudWatch/S3 아카이빙

## 4) 확장
- 리테일러/채널 커넥터 추가 시: worker 스케일 아웃
- 대형 고객사의 데이터 증가 시: RDS read replica + 파티셔닝

## 5) 배포 파이프라인
- GitHub Actions → ECR push → ECS deploy
- 프론트: build → S3 업로드 → CloudFront invalidation

### 최소 다이어그램(텍스트)
User -> CloudFront(S3 UI) 
User -> ALB -> ECS(API)
ECS(Worker) <-> SQS
ECS(API/Worker) <-> RDS
RDS/S3/Secrets -> KMS
Logs/metrics -> CloudWatch
