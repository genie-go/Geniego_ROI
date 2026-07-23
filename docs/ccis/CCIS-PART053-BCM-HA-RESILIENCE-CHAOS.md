# GeniegoROI Claude Code Implementation Specification

# CCIS Part053 — Enterprise Business Continuity (BCM), High Availability (HA), Resilience & Chaos Engineering Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise BCM·HA·Resilience·Chaos Engineering 표준을 수립한다.

> ★**성격(단일 VPS — 형식 HA/Chaos 사업범위 밖·graceful degradation/self-healing substrate 실재)**: 이
> 저장소의 인프라는 **단일 VPS**(nginx/php-fpm/MySQL·다중 노드/클러스터/LB 부재·Part016/045)다. 명세가
> 다루는 **형식 HA(Active-Active/Passive/Multi-AZ/Load Balancer)·Chaos Engineering(failure injection/
> Gremlin)·형식 Circuit Breaker·Bulkhead·Auto Failover(DB/DNS/Region)·Self-Healing 인프라(auto-scaling/
> auto-restart orchestration)·형식 RTO/RPO/BIA**는 이 제품의 **사업 범위 밖(out of scope)**이라 **부재**한다
> (grep 0·단일 노드). ★결함이 아니라 정직한 비적용(MEA 064 "out of scope"·Part035~052 어휘 재적용). ★**실재 축
> (graceful degradation/self-healing/fault tolerance substrate)**: **MySQL→SQLite 폴백**(Db.php·연결 실패 시
> graceful degradation·환경별 분리)·**`ensureTables` self-healing**(**스키마 자가치유**·per-handler·migration
> 이후 흡수)·**`omni_outbox` retry+DLQ**(attempts+**exponential backoff**·fault tolerance·Part028/051)·
> **health check**(`/health[z]`)·**php-fpm 풀 튜닝**(Part006·502 대응)·**수동 DB 백업**(Part015)·**cron
> 재실행**·**fail-closed**(`Ssrf`·`Crypto`·register-then-execute graceful skip) 는 실재한다. ★★**오흡수 차단**:
> **MySQL→SQLite 폴백 ≠ HA 클러스터**(단일 노드 graceful degradation·**환경변수 1줄 누락=운영 사고**·MySQL
> 복귀 시 데이터 분기 위험) · **`ensureTables` self-healing ≠ Self-Healing 인프라**(스키마 자가치유이지 auto-
> restart/scaling 아님) · **`omni_outbox` retry ≠ Circuit Breaker**(재시도이지 회로 차단 아님). Part001 §4 에
> 따라 실측 → HA/Chaos/Circuit Breaker 부재증명 → 폴백+self-healing+재시도 성문화했다. (문서 차수 — 코드
> 무변경.)

---

## 2. 실측 — 현행 복원력 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| BCM Architecture | App→Health→Resilience→Recovery→Infra | **부분(대응물)** — `/health`·폴백·`omni_outbox` 재시도·수동 백업. 형식 Recovery Engine 아님 |
| Business Continuity Management | BIA/Recovery Strategy/Plan | **부분** — 수동 백업·`omni_outbox` DLQ·폴백. 형식 BIA/Continuity Plan 부분 |
| High Availability | Active-Active/Multi-AZ/LB | **부재(out of scope)** — 단일 VPS(클러스터/LB 없음) |
| Resilience Engineering | Failure Detection/Auto Recovery/Degradation | ★**부분 준수** — MySQL→SQLite **graceful degradation**·`ensureTables` self-healing·fail-closed. Dependency Isolation 부분 |
| Chaos Engineering | Failure/Latency/Resource Injection | **부재(out of scope)** — Chaos 도구 없음(단일 노드) |
| Fault Tolerance | Replication/Redundancy/Retry/Timeout | **부분(Retry/Timeout)** — `omni_outbox` retry·cron 재실행·timeout. Replication/Redundancy 부재(단일 노드) |
| Disaster Avoidance | Preventive Monitoring/Capacity Forecast | **부분** — `Alerting`·`SystemMetrics`·php-fpm 풀 모니터. 형식 Predictive 부분 |
| Auto Failover | Service/DB/DNS/Region Failover | **부분(대응물)** — ★**MySQL→SQLite 폴백**(DB degradation·**HA failover 아님**). Service/DNS/Region 부재 |
| Circuit Breaker | Open/Half-Open/Closed | **부재** — 형식 Circuit Breaker 없음. timeout·fail-closed·register-then-execute skip 이 대응물 |
| Bulkhead Pattern | Resource/Thread/Queue Isolation | **부분(대응물)** — 테넌트 격리·`omni_outbox` 큐 격리·php-fpm 풀. 형식 Bulkhead 아님 |
| Retry Policy | Fixed/Exponential Backoff/Jitter/Limit | ★**실재** — `omni_outbox`(attempts+**backoff**·최대 3회)·quiet-hours defer(attempts 미증가) |
| Self-Healing Infrastructure | Auto Restart/Scaling/Recovery | **부분(스키마)** — ★**`ensureTables` self-healing(스키마 자가치유)**. auto-restart/scaling 부재(인프라 아님) |
| Health Check | Liveness/Readiness/Dependency | ★**부분 준수** — `/health[z]`(`Health.php`·public bypass)·DB 연결 확인. Liveness/Readiness 분리 부분 |
| Service Recovery | Rolling/Partial/Priority | **부분** — 수동 dist swap·fpm reload·`omni_outbox` 재큐·cron 재실행. 형식 rolling 부분 |
| RTO/RPO Management | RTO/RPO/SLA Mapping | **부분** — 수동 백업 주기(RPO 유사). 형식 RTO/RPO 정의 부분 |
| Monitoring | Availability/Recovery Time/Failover Count | **부분** — `/health`·`SystemMetrics`·`Alerting`. Chaos/Failover 지표 없음 |
| Logging | Incident/Service/Recovery ID | **부분** — error_log·`SecurityAudit`·`omni_outbox`. Incident ID 부분 |
| Security(Recovery Auth/Secure Backup/격리) | 복구 보안 | ★**부분 준수** — `Crypto` AES 백업·RBAC·테넌트 격리·**폴백 환경 격리**(prod/demo SQLite 분리) |
| Compliance(ISO 22301/NIST 800-34) | BCM 표준 | **부재(out of scope)** — 형식 BCM 인증 대상 아님 |
| Disaster Recovery | Region/Cluster/DB Recovery/Validation | **부분** — 수동 DB 백업·재수집·`omni_outbox` DLQ replay. Region/Cluster 부재 |
| Performance(Recovery/Failover/Health Cache/Adaptive Retry) | 복구 성능 | **부분** — 폴백 즉시·backoff·HTTP 캐시 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Resilience First/Fail Fast/Recover Automatically/Graceful Degradation/Observable Failure/Tenant Isolated) | **부분(degradation축)** | ★Graceful Degradation(SQLite 폴백)·Fail Fast(fail-closed)·Tenant Isolated·Observable(`/health`). Continuous Availability(HA)=out of scope |
| §4 BCM Architecture | **부분(대응물)** | `/health`·폴백·재시도·백업 |
| §5 BCM | **부분** | 수동 백업·DLQ·폴백. BIA/Plan 부분 |
| §6 High Availability | **부재(out of scope)** | 단일 VPS |
| §7 Resilience Engineering | **부분 준수** | SQLite degradation·`ensureTables` self-healing·fail-closed |
| §8 Chaos Engineering | **부재(out of scope)** | Chaos 도구 없음(단일 노드) |
| §9 Fault Tolerance | **부분(Retry/Timeout)** | `omni_outbox` retry·timeout. Replication 부재 |
| §10 Disaster Avoidance | **부분** | `Alerting`·`SystemMetrics`·php-fpm |
| §11 Auto Failover | **부분(대응물)** | ★MySQL→SQLite 폴백(DB degradation·HA failover 아님) |
| §12 Circuit Breaker | **부재** | 형식 CB 없음. timeout·fail-closed·skip 대응 |
| §13 Bulkhead | **부분(대응물)** | 테넌트/큐/풀 격리. 형식 Bulkhead 아님 |
| §14 Retry Policy | **★실재** | `omni_outbox`(attempts+backoff·defer) |
| §15 Self-Healing Infra | **부분(스키마)** | ★`ensureTables` self-healing. auto-restart/scaling 부재 |
| §16 Health Check | **부분 준수** | `/health[z]`·DB 확인 |
| §17 Service Recovery | **부분** | dist swap·fpm reload·재큐·cron |
| §18 RTO/RPO | **부분** | 수동 백업 주기. 형식 정의 부분 |
| §19 Monitoring | **부분** | `/health`·`SystemMetrics`·`Alerting` |
| §20 Logging | **부분** | error_log·`SecurityAudit`·`omni_outbox` |
| §21 Security | **부분 준수** | `Crypto` 백업·RBAC·**폴백 환경 격리** |
| §22 Compliance | **부재(out of scope)** | ISO 22301 인증 대상 아님 |
| §23 Disaster Recovery | **부분** | 수동 백업·재수집·DLQ replay |
| §24 Performance | **부분** | 폴백 즉시·backoff·캐시 |
| §25~§26 PHP/Claude(Health Monitor/Recovery Orchestrator/Circuit Breaker MW/Retry/Chaos Adapter) | **부분** | ★`/health`·`omni_outbox` retry·`ensureTables`·폴백. Circuit Breaker/Chaos/Recovery Orchestrator 부재 |
| §27~§28 검증(bcm:health/recovery:status/circuit-breaker/chaos:test) | **대상 없음** | artisan 없음·HA/Chaos 없음. `/health`·`omni_outbox`·DLQ replay 로 대체 |

---

## 4. 확립된 표준 (신규 복원력 코드가 따를 정본)

- ★**Graceful Degradation = MySQL→SQLite 폴백**(Db.php·연결 실패 시). ★★**폴백 ≠ HA**: 단일 노드 degradation 이며 **HA 클러스터/failover 가 아니다**. ★**환경변수 1줄 누락=운영 사고**(데모→운영 DB 오염)·**환경별 SQLite 분리**(prod/demo 충돌 방지)·**MySQL 복귀 시 데이터 분기 주의**(폴백 중 쓰기는 SQLite에만).
- ★**스키마 self-healing = `ensureTables`**(per-handler 자가치유·migration 이후 스키마 흡수·MySQL/SQLite 양립). ★**self-healing 인프라(auto-restart/scaling) 아님**(스키마 한정).
- ★**Retry/Fault Tolerance = `omni_outbox`**(attempts+**exponential backoff**·최대 3회·quiet/STO defer는 attempts 미증가·Part051)+cron 재실행. ★**영구실패(4xx/검증) 재시도 금지**.
- ★**Circuit Breaker 대응 = timeout+fail-closed+register-then-execute skip**(외부 호출 실패 시 graceful skip·`Ssrf` 안전 실패). 형식 Circuit Breaker 신설 전 이 패턴.
- ★**Health Check = `/health[z]`**(`Health.php`·public bypass·DB 연결 확인). 신규 종속성 헬스는 이 엔드포인트 확장.
- ★**DR = 수동 DB 백업(Part015)+`omni_outbox` DLQ replay+재수집+cron 재실행**. ★복구 후 무결성 검증(가짜값 금지·정직 미산출).
- ★★**오흡수 차단**: **SQLite 폴백≠HA·`ensureTables`≠Self-Healing 인프라·`omni_outbox` retry≠Circuit Breaker·테넌트 격리≠Bulkhead**. 이름·개념 겹쳐도 형식 패턴 아님.
- ★**사업범위 원칙**: **형식 HA(Multi-AZ/LB)·Chaos Engineering·Auto Failover(Region)·Self-Healing 인프라는 단일 VPS 범위 밖** — 다중 노드/클라우드 이전 결정 전 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 형식 HA/Chaos out of scope)

1. **형식 HA(Active-Active/Passive/Multi-AZ/Load Balancer)·Auto Failover(DB/DNS/Region)** — 안 함. **단일 VPS**(다중 노드/클러스터/LB 없음·Part045). HA=클라우드 이전·인프라 재설계.
2. **Chaos Engineering(failure/latency injection·Gremlin)** — 안 함. **사업 범위 밖**(단일 노드·운영 트래픽 주입 위험). 다중 노드 도입 후.
3. **형식 Circuit Breaker·Bulkhead·Self-Healing 인프라(auto-scaling/restart)** — 부분/부재. timeout·fail-closed·skip·`ensureTables`(스키마)·테넌트/큐 격리가 대응물. 형식 패턴 라이브러리 미도입.
4. **형식 RTO/RPO/BIA·ISO 22301 인증** — 부분. 수동 백업 주기(RPO 유사)·`omni_outbox` DLQ. 형식 정의/인증 부분.
5. **`SQLite 폴백`/`ensureTables`/`omni_outbox` 를 HA/Self-Healing/Circuit Breaker 로 오흡수 금지** — degradation/스키마 자가치유/재시도이지 형식 패턴 아님. ★특히 **SQLite 폴백은 데이터 분기 위험**(HA와 정반대).
6. **artisan `bcm:*`/`chaos:test`/`circuit-breaker` 명령** — 없음(Slim·HA/Chaos 없음). `/health`·`omni_outbox`·DLQ replay 로 대체.

★**준수하는 실 원칙**: **graceful degradation(SQLite 폴백·환경 격리)·스키마 self-healing(ensureTables)·retry+backoff+DLQ(omni_outbox)·fail-closed(Ssrf/Crypto)·health check(/health)·수동 백업/재수집·테넌트 격리·정직 미산출**. ★**오흡수 차단**: 폴백≠HA·self-healing≠인프라·retry≠Circuit Breaker. ★**out of scope 정직 선언**: HA/Chaos/Auto Failover 는 단일 VPS 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. Graceful Degradation=MySQL→SQLite 폴백(Db.php). ★★폴백≠HA(환경변수 누락=운영 사고·환경별 SQLite 분리·데이터 분기 주의).
2. 스키마 자가치유=`ensureTables`(per-handler·MySQL/SQLite 양립). Retry=`omni_outbox`(backoff·영구실패 재시도 금지)+cron.
3. 외부 호출=timeout+fail-closed+register-then-execute skip(graceful). Health=`/health[z]` 확장. DR=수동 백업+DLQ replay+재수집.
4. ★★**오흡수 금지**: SQLite 폴백을 HA 로·`ensureTables`를 Self-Healing 인프라로·`omni_outbox` retry 를 Circuit Breaker 로 표기하지 않는다.
5. ★**형식 HA/Chaos/Circuit Breaker/Self-Healing 인프라를 선이식하지 않는다** — 단일 VPS 사업 범위 밖(다중 노드/클라우드 이전 선행).
6. 복구 후 무결성 검증(가짜값 금지·정직 미산출)·테넌트 격리·`SecurityAudit`. 백업/DR 판정=Part015 정본.

---

## 7. Completion Criteria

- [x] 복원력 스택 **실측**(HA/Chaos/Circuit Breaker/Bulkhead/Auto Failover/Self-Healing 인프라 부재·MySQL→SQLite 폴백·`ensureTables` self-healing·`omni_outbox` retry/DLQ·`/health`·fail-closed 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 HA/Chaos **out of scope**(단일 VPS) 증명·degradation/self-healing 실재)
- [x] 실 복원력(SQLite 폴백+ensureTables+omni_outbox retry+/health+수동 백업) 성문화(§4)
- [x] ★graceful degradation·스키마 self-healing·retry+backoff+DLQ·★★오흡수 차단(폴백≠HA·ensureTables≠인프라·retry≠Circuit Breaker·SQLite 폴백 데이터 분기 위험) 명시
- [x] 의도적 미적용 + 사유(§5) — HA/Chaos/Circuit Breaker/Bulkhead/Auto Failover/Self-Healing 인프라/RTO·RPO(단일 VPS out of scope)
- [x] Claude Code 규칙(§6) · MySQL→SQLite 폴백·`ensureTables`·`omni_outbox`·`/health` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **graceful degradation/self-healing substrate**(MySQL→SQLite
> 폴백 + `ensureTables` 스키마 자가치유 + `omni_outbox` retry/DLQ + `/health` + fail-closed)의 성문화이지 HA
> 클러스터/Chaos Engineering/Circuit Breaker 이식이 아니다. ★★**오흡수 차단**: **SQLite 폴백은 HA 가 아니며
> (단일 노드 degradation·데이터 분기 위험), `ensureTables`는 Self-Healing 인프라가 아니다(스키마 한정)**. ★**out
> of scope 정직 선언**: HA/Chaos/Auto Failover 는 단일 VPS 범위 밖이며 부재는 결함이 아니다.

---

## 다음 Part

**CCIS Part054 — Enterprise AI Agents, Multi-Agent Orchestration, Agent Memory & Autonomous Operations** — ★사전 실측 예고: ★**Part021/022(AI Gateway/Agent·MCP)·MEA 054(AI Agent PARTIAL-strong 최고 실재도)와 중복** — 형식 Multi-Agent Framework(LangGraph/AutoGPT)·Agent Long-Term Memory(Vector)·Planning Engine 은 **부재/부분**이나, Agent 실체는 **`ClaudeAI` Gateway(Tool Calling·MEA 053)·`agent_mode`+`action_request`(HITL 승인·자율 집행 게이트)·`AutoRecommend`/`Decisioning`(자율 의사결정)·`RuleEngine`(자율 액션)·`JourneyBuilder`(자율 워크플로)·V3 Trust(신뢰 게이트)**로 부분~강 실재. Part054 도 실측→Multi-Agent/Agent Memory/Planning 부재증명→ClaudeAI Gateway+agent_mode+AutoRecommend 성문화. ★MEA 054 최고 실재도·헌법 V4/V5·"자율집행=승인정책 존중" 승계.
