# GeniegoROI Claude Code Implementation Specification

# CCIS Part045 — Enterprise FinOps, Cloud Cost Optimization & Resource Governance Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise FinOps·Cloud Cost Optimization·Resource Governance 표준을 수립한다.

> ★**성격(대체로 사업범위 밖 — 단일 VPS·Cloud FinOps 부재·SaaS 플랜 거버넌스 실재)**: 이 저장소의 인프라는
> **단일 VPS**(roi.geniego.com·nginx/php-fpm/MySQL)이지 **멀티클라우드/쿠버네티스 환경이 아니다**(Docker/k8s/
> Redis/Kafka/S3/Vault 전부 부재·CCIS Part016). 명세가 다루는 **형식 FinOps 도구(CloudHealth/Kubecost)·
> Multi-Cloud Cost Analysis(AWS/Azure/GCP)·Reserved Instance/Savings Plan·Kubernetes Cost·Tag Governance·
> Chargeback/Showback·Carbon Efficiency**은 이 제품의 **사업 범위 밖(out of scope)**이라 **부재**한다(grep
> 0). ★결함이 아니라 정직한 비적용(MEA 064 "out of scope"·Part035~044 어휘 재적용). ★**실재 축(SaaS 플랜/비용
> 거버넌스)**: **`PlanLimits`**(212차·**8차원 플랜 쿼터**·channels/orders/products/users/suppliers/logistics/
> warehouses/image_hosting_gb·-1=무제한·**402 게이트**)·**`ai_call_log`**(LLM 토큰 비용 추적·테넌트별·MEA
> 053)·**구독 빌링**(Paddle MoR/Stripe·Part031)·**php-fpm 풀 튜닝**(Part006)·**테넌트 리소스 격리** 는
> 실재한다. ★★**오흡수 차단**: **`Mmm`(광고예산 최적화·ROI frontier)≠Cloud FinOps** · **`Pnl`(P&L 비용=
> 광고비/원가/물류비)≠Cloud Cost(인프라 비용)** · **`PlanLimits`(SaaS 구독 쿼터)≠Cloud Resource
> Governance(태그/RI)**. Part001 §4 에 따라 실측 → CloudHealth/Kubecost/Multi-Cloud 부재증명 → PlanLimits+
> ai_call_log+빌링 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 비용/거버넌스 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| FinOps Architecture | Cloud→Collector→Analytics→Budget→Optimize | **부분(대응물)** — `PlanLimits`(쿼터)·`ai_call_log`(토큰). 형식 Cloud Cost 파이프라인 아님 |
| FinOps Framework(Inform/Optimize/Govern) | FinOps Foundation | **부분** — 플랜 쿼터·빌링·비용 대시보드(`Pnl`). 형식 FinOps 프레임워크 아님 |
| Cloud Cost Management | Daily/Monthly/Usage/Billing | **부분(대응물)** — `ai_call_log`(LLM 토큰 비용)·구독 빌링. Cloud 인프라 비용 추적 아님 |
| Multi-Cloud Cost Analysis | AWS/Azure/GCP | **부재(out of scope)** — **단일 VPS**(멀티클라우드 아님) |
| Resource Governance | Compute/Storage/K8s/AI | **부분(대응물)** — `PlanLimits`(SaaS 쿼터)·테넌트 격리. Cloud 리소스 거버넌스 아님 |
| Budget Management | Dept/Project/Tenant Budget/Alert | **부분(대응물)** — `PlanLimits`(테넌트 쿼터·402 게이트)·빌링 알림. 형식 Budget Engine 부분 |
| Forecasting | Daily/Monthly/AI 예측 | **부분** — `Pnl`/`DemandForecast`(비즈니스)·구독 갱신. Cloud 비용 예측 아님 |
| Chargeback | Dept/Tenant/Project | **부분(대응물)** — 테넌트별 `ai_call_log`(귀속)·구독 요금. 형식 chargeback 아님 |
| Showback | Team Report/Usage/Trend | **부분** — `ai_call_log`·`Pnl`·역할별 대시보드. 형식 showback 부분 |
| Cost Allocation | Tenant/Project/Env/App | **부분** — 테넌트별 비용 귀속(`ai_call_log`). Project/Env 태그 부분 |
| Tag Governance | Tenant/Owner/Cost Center 태그 | **부재(out of scope)** — 클라우드 리소스 태그 없음(단일 VPS) |
| Reserved Instance | 구매 추천/활용률 | **부재(out of scope)** — RI 없음(VPS 고정) |
| Savings Plan | 추천/커버리지 | **부재(out of scope)** — Savings Plan 없음 |
| Kubernetes Cost | Namespace/Pod/Node Cost | **부재(out of scope)** — k8s 없음(Part016) |
| Carbon Efficiency | Energy/Emission/Green Region | **부재(out of scope)** — 탄소 측정 없음(MEA 063 ESG 空洞·**비용축≠환경축**·배출계수 없음) |
| Financial Reporting | Executive/Dept/Cost Trend | ★**대응물(비즈니스)** — `Pnl`(손익·Part031)·`Reports`·`DataExport`. Cloud 비용 리포트 아님 |
| Monitoring | Daily Spend/Idle Resource/Carbon | **부분** — `ai_call_log`·`SystemMetrics`·php-fpm 풀(Part006). Idle/Carbon 대상 없음 |
| Logging | Resource/Budget/Cost Center | **부분** — `ai_call_log`·`SecurityAudit`. Cost Center 태그 없음 |
| Security(RBAC/Budget Auth/Billing Encrypt) | 청구 접근 제한 | ★**준수** — RBAC·구독 빌링(`Crypto`)·테넌트 격리·PII 미저장 |
| Compliance(재무 통제) | 비용 정책 | **부분** — `Pnl` SSOT·`SecurityAudit`. 형식 재무 통제 부분 |
| Disaster Recovery | Cost DB/Budget 복구 | **부분** — DB 백업(빌링/plan_config). Cloud 비용 DB 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Cost Transparency/Business Value First/Resource Efficiency/Budget Awareness/Tenant Isolated/Sustainable) | **부분(SaaS축)** | ★Business Value First(`Pnl`)·Budget Awareness(`PlanLimits`)·Tenant Isolated. Sustainable Cloud/Multi-Cloud=out of scope |
| §4 FinOps Architecture | **부분(대응물)** | `PlanLimits`·`ai_call_log`. Cloud Cost 파이프라인 아님 |
| §5 FinOps Framework | **부분** | 플랜 쿼터·빌링·`Pnl`. FinOps Foundation 프레임워크 아님 |
| §6 Cloud Cost Management | **부분(대응물)** | `ai_call_log`(LLM 토큰)·빌링. Cloud 인프라 비용 아님 |
| §7 Multi-Cloud | **부재(out of scope)** | 단일 VPS |
| §8 Resource Governance | **부분(대응물)** | `PlanLimits`(SaaS 쿼터)·테넌트 격리. Cloud 리소스 아님 |
| §9 Budget Management | **부분(대응물)** | `PlanLimits`(402 게이트)·빌링 알림 |
| §10 Forecasting | **부분** | `Pnl`/`DemandForecast`·구독 갱신. Cloud 예측 아님 |
| §11~§12 Chargeback/Showback | **부분(대응물)** | 테넌트별 `ai_call_log`·구독 요금·대시보드 |
| §13 Cost Allocation | **부분** | 테넌트 비용 귀속(`ai_call_log`). Project/Env 부분 |
| §14 Tag Governance | **부재(out of scope)** | 클라우드 리소스 태그 없음(단일 VPS) |
| §15~§16 Reserved Instance/Savings Plan | **부재(out of scope)** | RI/SP 없음(VPS 고정) |
| §17 Kubernetes Cost | **부재(out of scope)** | k8s 없음(Part016) |
| §18 Carbon Efficiency | **부재(out of scope)** | 탄소 측정 없음(MEA 063·비용축≠환경축) |
| §19 Financial Reporting | **★대응물(비즈니스)** | `Pnl`·`Reports`·`DataExport`. Cloud 비용 리포트 아님 |
| §20 Monitoring | **부분** | `ai_call_log`·`SystemMetrics`·php-fpm. Idle/Carbon 없음 |
| §21 Logging | **부분** | `ai_call_log`·`SecurityAudit`. Cost Center 없음 |
| §22 Security | **★준수** | RBAC·빌링 `Crypto`·테넌트 격리·PII 미저장 |
| §23 Compliance | **부분** | `Pnl` SSOT·`SecurityAudit` |
| §24 Disaster Recovery | **부분** | DB 백업(빌링/plan_config) |
| §25~§26 PHP/Claude(FinOps/Cost Collector/Budget Engine/Forecast Adapter) | **부분** | ★`PlanLimits`·`ai_call_log`·빌링. Cloud Cost Collector/K8s/Multi-Cloud 부재 |
| §27~§28 검증(finops:health/budget:status/tags:validate) | **대상 없음** | artisan 없음·Cloud FinOps 없음. `PlanLimits`·`ai_call_log`·`Pnl` 로 대체 |

---

## 4. 확립된 표준 (신규 비용/거버넌스 코드가 따를 정본)

- ★**SaaS 플랜 쿼터 정본 = `PlanLimits`**(212차·8차원·`plan_config.limits_json`). 신규 리소스 생성 직전 `PlanLimits::exceeded()` 게이트(402·업그레이드 유도). ★admin 설정(PlanPricing) 존중·`-1=무제한`. 중복 쿼터 로직 신설 금지.
- ★**LLM 비용 = `ai_call_log`**(토큰·테넌트별 귀속·MEA 053). 신규 AI 호출은 Gateway 경유 자동 계측(비용 chargeback 근거). ★사용량 테넌트 미귀속=감사·과금 근거 상실(289차후속 수정).
- ★**빌링 = 구독(Paddle MoR/Stripe·Part031)**. 결제/구독은 이 파이프라인 확장. 빌링 데이터 `Crypto` 암호화·테넌트 격리.
- ★**비즈니스 재무 = `Pnl`**(손익 SSOT·Part031). ★★**오흡수 금지**: `Pnl`(P&L 비용=광고비/원가/물류비)은 **비즈니스 비용이지 Cloud 인프라 비용이 아니다**. `Mmm`(광고예산 ROI frontier)은 **광고 최적화이지 Cloud FinOps 아니다**. 혼동 금지.
- ★**인프라 튜닝 = php-fpm 풀**(Part006·`reference_phpfpm_pool_tuning`). 단일 VPS 리소스 최적화. ★"등록502=워커고갈" 오진 주의(285차·`upstream timed out` 엔드포인트부터).
- ★**정직 미산출·테넌트 격리**: 비용 산출 불가=null+사유(가짜값 금지)·테넌트 비용 귀속 격리·PII 미저장.
- ★**사업범위 원칙**: **Cloud FinOps(Multi-Cloud/K8s/RI/Savings Plan/Tag Governance/Carbon)는 이 제품 범위 밖**(단일 VPS) — 클라우드 이전·k8s 도입 결정 전 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — Cloud FinOps 대부분 out of scope)

1. **형식 FinOps 도구(CloudHealth/Kubecost)·Multi-Cloud Cost Analysis(AWS/Azure/GCP)** — 안 함. **단일 VPS**(멀티클라우드 아님·Part016). Cloud Cost 수집기=클라우드 이전 선행.
2. **Reserved Instance/Savings Plan·Kubernetes Cost·Tag Governance** — 안 함. **VPS 고정·k8s 없음**(Part016). RI/SP/태그 거버넌스 대상 없음.
3. **Carbon Efficiency(탄소 측정/Green Region)** — 안 함. MEA 063 ESG 空洞(배출계수 없음)·**비용축≠환경축**. 탄소 회계 신설=별도 도메인.
4. **형식 Chargeback/Showback/Budget Engine** — 부분. `PlanLimits`(쿼터)·`ai_call_log`(테넌트 귀속)·구독 요금이 대응물. 형식 부서/프로젝트 chargeback 부재.
5. **`Mmm`/`Pnl` 을 Cloud FinOps 로 오흡수 금지** — `Mmm`=광고예산 최적화·`Pnl`=비즈니스 손익(광고비/원가/물류비)이지 클라우드 인프라 비용이 아니다.
6. **artisan `finops:*`/`budget:status`/`tags:validate` 명령** — 없음(Slim·Cloud FinOps 없음). `PlanLimits`·`ai_call_log`·`Pnl` 로 대체.

★**준수하는 실 원칙**: **`PlanLimits`(플랜 쿼터·402 게이트·중복 금지)·`ai_call_log`(LLM 비용·테넌트 귀속)·구독 빌링(Crypto)·php-fpm 풀 튜닝·`Pnl`(비즈니스 재무 SSOT)·테넌트 격리·PII 미저장·정직 미산출**. ★**오흡수 차단**: Mmm/Pnl≠Cloud FinOps·PlanLimits≠Cloud Resource Governance. ★**out of scope 정직 선언**: Cloud FinOps 는 단일 VPS 이 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. SaaS 리소스 쿼터=`PlanLimits::exceeded()` 게이트(402·8차원·`plan_config` 존중). 중복 쿼터 로직 신설 금지.
2. LLM 비용=`ai_call_log`(Gateway 자동 계측·테넌트 귀속). 빌링=구독(Paddle/Stripe·`Crypto` 암호화).
3. ★**오흡수 금지**: `Mmm`(광고예산)/`Pnl`(P&L 비용)을 Cloud FinOps 로 표기·혼동하지 않는다. `PlanLimits`(SaaS 쿼터)≠Cloud Resource Governance.
4. 인프라 튜닝=php-fpm 풀(Part006). ★502 오진 주의(`upstream timed out` 우선). 테넌트 격리·PII 미저장·정직 미산출.
5. ★**Cloud FinOps(Multi-Cloud/K8s Cost/RI/Savings Plan/Tag Governance/Carbon)를 선이식하지 않는다** — 단일 VPS 사업 범위 밖(클라우드 이전·제품결정 선행).
6. CloudHealth/Kubecost/AWS Cost Explorer 를 "명세에 있다"는 이유로 이식하지 않는다(`PlanLimits`+`ai_call_log`+`Pnl` 로 커버).

---

## 7. Completion Criteria

- [x] 비용/거버넌스 스택 **실측**(CloudHealth/Kubecost/Multi-Cloud/RI/Savings Plan/K8s Cost/Tag Governance/Carbon 부재·`PlanLimits`·`ai_call_log`·구독 빌링·php-fpm 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(Cloud FinOps **out of scope**(단일 VPS) 증명·SaaS 플랜 거버넌스 실재)
- [x] 실 비용/거버넌스(PlanLimits+ai_call_log+빌링+Pnl+php-fpm) 성문화(§4)
- [x] ★★**오흡수 차단**(`Mmm`/`Pnl`≠Cloud FinOps·`PlanLimits`≠Cloud Resource Governance)·SaaS 쿼터 게이트·테넌트 비용 귀속·정직 미산출 명시
- [x] 의도적 미적용 + 사유(§5) — CloudHealth/Multi-Cloud/RI/Savings Plan/K8s Cost/Tag Governance/Carbon(대부분 out of scope)
- [x] Claude Code 규칙(§6) · `PlanLimits`·`ai_call_log`·`Pnl`·php-fpm 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **SaaS 플랜/비용 거버넌스**(`PlanLimits` 쿼터 + `ai_call_log`
> LLM 비용 + 구독 빌링 + `Pnl` 비즈니스 재무 + php-fpm 튜닝)의 성문화이지 CloudHealth/Kubecost/Multi-Cloud
> FinOps 이식이 아니다. ★★**오흡수 차단**: **`Mmm`(광고예산)·`Pnl`(P&L 비용)은 Cloud 인프라 비용이 아니다**.
> ★**out of scope 정직 선언**: Cloud FinOps 는 **단일 VPS**(멀티클라우드/k8s 부재) 이 제품 범위 밖이며 부재는
> 결함이 아니다.

---

## 다음 Part

**CCIS Part046 — Enterprise API Economy, API Product Management & Developer Platform** — ★사전 실측 예고: 형식 API Marketplace/Developer Portal/SDK 자동생성/API Monetization 은 **부재/부분**이나, API 실체는 **`api_key`(SHA-256·RBAC viewer<connector<analyst<admin+scopes·발급/폐기 `Keys`)·버전 라우팅(`/v{NNN}`·Part011)·`AccessReview`(휴면키 검토)·연동허브(채널 API 키 발급 가이드·`GeniegoKnowledge`)·OAuth(외부채널)**로 부분~강 실재. Part046 도 실측→API Marketplace/SDK Gen/Monetization 부재증명→api_key+버전 라우팅+Keys+AccessReview 성문화. ★Part011(API Design)·Part030(IAM api_key RBAC)·Part028(Connector) 승계.
