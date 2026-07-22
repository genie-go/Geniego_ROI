# MEA Part 064 — CANONICAL ENTITIES (§5 15엔티티 · §6~§11 도메인 판정)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 근거 전량 [`GT①`](MEA_PART064_EXISTING_IMPLEMENTATION.md) 실측. 가설 인용 0.
> ★판정 어휘(064에서 **제5항 추가**): "미달"vs**"측정 기반 부재"** · "미구현"vs**"인프라 선행 종속"** · "중복"vs**"결여 보강"** · "부실"vs**"선행 개념 부재"** · **NEW: "미달"vs"사업 범위 밖(out of scope)"**

---

## 1. §5 Canonical Entity 15종 — **전량 ABSENT**

| # | 엔티티 | 판정 | 근거 |
|---|---|---|---|
| 1 | COMPUTE_CLUSTER | **ABSENT** | `compute_cluster`·`cluster` **둘 다 0**. ★`cluster` 가 0인 것은 결정적 — 고객 세그먼트 클러스터링조차 이 단어를 쓰지 않는다 |
| 2 | HPC_NODE | **ABSENT** | `hpc_node`·`hpc` 0. ★`nodes` 101 = **JourneyBuilder 워크플로 노드 + GraphScore 기여도 그래프**(055) — 오탐 |
| 3 | QUANTUM_PROCESSOR | **ABSENT** | `quantum_processor`·`quantum`·`qpu` 0 |
| 4 | QUANTUM_JOB | **ABSENT** | `quantum_job` 0 |
| 5 | COMPUTE_WORKLOAD | **ABSENT** | `compute_workload`·**`workload` 0** |
| 6 | COMPUTE_QUEUE | **ABSENT** | `compute_queue` 0. ★`queue` 39 = **업무 대기열**(입고·결재·PM·피드백·접근검토·이메일) — 오탐 |
| 7 | COMPUTE_RESOURCE | **ABSENT** | `compute_resource` 0 |
| 8 | QUANTUM_ALGORITHM | **ABSENT** | `quantum_algorithm`·`shor`·`grover` 0 |
| 9 | QUANTUM_GATEWAY | **ABSENT** | `quantum_gateway` 0. ★`gate` 는 **권한 게이트**로 광범위 사용 — 무경계 검색 금지 |
| 10 | COMPUTE_POLICY | **ABSENT** | `compute_policy` 0 |
| 11 | COMPUTE_SESSION | **ABSENT** | `compute_session` 0. ★`user_session`(인증)과 무관 |
| 12 | COMPUTE_METRIC | **ABSENT** | `compute_metric` 0. ★계측 정본은 **`SystemMetrics`**(057) — 신설 금지(GT② DUP-1) |
| 13 | COMPUTE_ANALYTICS | **ABSENT** | `compute_analytics` 0 |
| 14 | COMPUTE_VERSION | **ABSENT** | `compute_version` 0 |
| 15 | COMPUTE_AUDIT | **ABSENT** | `compute_audit` 0. ★감사 정본은 **`SecurityAudit`**(056·062) — 체인 이원화 금지 |

### ★총계
**15종 전량 ABSENT.** 062(Blockchain)는 `LEDGER`/`BLOCKCHAIN_AUDIT` 2종이 인접 자산으로 PARTIAL-weak 였으나, **064는 PARTIAL 조차 하나도 없다** — **MEA 시리즈 실재도 최저 기록 갱신.**

> ★단 **ADR D-1**: 이는 **결함이 아니라 사업 범위 밖**이다. 062 는 "블록체인을 표방하지 않았으나 원장 개념은 실제로 쓰인다"는 긴장이 있었지만, 064 는 **긴장 자체가 없다**.

---

## 2. §6 Advanced Computing Domain 10종

| 도메인 | 판정 | 비고 |
|---|---|---|
| Quantum Computing | **ABSENT — 사업 범위 밖** | — |
| High Performance Computing | **ABSENT — 사업 범위 밖** | 단일 호스트 PHP/MySQL |
| **GPU Computing** | **ABSENT** | ★`gpu` 6 = **CSS `translateZ(0)` 브라우저 렌더 레이어** — 완전 오탐 |
| Hybrid Computing | **ABSENT — 사업 범위 밖** | — |
| Distributed Computing | **ABSENT — 인프라 선행 종속** | 단일 호스트(044/045/050) |
| Scientific Computing | **ABSENT — 사업 범위 밖** | — |
| **AI Computing** | **ABSENT (단 AI 자체는 실재)** | ★AI 는 **외부 API 호출**(`ClaudeAI::complete`)이지 **자체 연산 인프라가 아니다** — 스코프 분리 |
| **Optimization Computing** | **ABSENT** | ★`Mmm::frontier`/`PriceOpt` = **수학적 최적화**(058/059) ≠ 연산 자원 최적화 |
| **Quantum Security** | **ABSENT — 외부 표준·인프라 선행 종속** | ★유일한 실질 축 → ADR D-2 |
| Enterprise Advanced Computing | **ABSENT — 사업 범위 밖** | — |
| **Enterprise Computing Registry**(§6 근간) | **ABSENT** | ★Registry 부재 **7연속**(058~064). 단 **064는 공통 Registry 승격 대상에서 제외**(ADR D-4) |

---

## 3. §7 Computing Lifecycle 10단계 · §8 HPC 8종 · §9 Quantum Readiness 8종 · §10 Hybrid 8종

**전부 ABSENT — 사업 범위 밖.** 1단계(Resource Registration)의 **자원 개념 자체가 없으므로** 이후 단계는 판정 대상이 성립하지 않는다.

★§8 세부 오흡수 주의:
- **Batch Scheduling** ≠ `Reports` 리포트 예약(`:104`·`:502`) · ≠ i18n autofill 배치(`AUTOFILL_BATCH`) · ≠ 이메일 발송 배치
- **Parallel Processing** ≠ `tools/triage_apply_self_test.sh:32` "parallel-safe" 주석 · ≠ `tools/e2e/smoke.mjs:145` 동시성 풀(cc=5)
- **Resource Allocation** ≠ `Wms.php` bin `capacity`(물리 적재용량)
- **Job Prioritization** ≠ PM 간트 우선순위

★§9 세부: **Quantum Simulation** ≠ `PriceOpt::simulate`(가격 시나리오·059) · **Experiment Tracking** ≠ A/B 실험(`WebPopupCampaign` variant·264차)

---

## 4. §11 Advanced Computing Analytics 8종

| 기능 | 판정 |
|---|---|
| Resource Utilization · Queue Analysis · Capacity Forecast · Execution Analytics | **ABSENT — 측정 대상 부재** |
| **Performance Analysis** | **ABSENT (연산 축)** — ★`latency` 11 = **`SystemMetrics` 프로브 응답시간**(057) 은 **범용 관측**이지 연산 성능이 아니다(스코프 분리·둘 다 참) |
| Cost Analysis | **ABSENT** — ★`Pnl`/정산은 **사업 비용**이지 연산 비용이 아니다(063 D-2 "비용 축≠환경 축"과 동형 논리) |
| **Energy Consumption Analysis** | **ABSENT — 인프라 선행 종속** · ★**063 판정 상속**(ENERGY_USAGE 는 계량 인프라 부재로 ABSENT, 061 Device 종속) — **재판정 금지** |
| **Executive Dashboard** | **ABSENT** — ★`SystemMonitor`/`DashSystem`(176차 ZERO-MOCK) 이 이미 존재 → **신설 금지**(GT② DUP-3) |

★`throughput` 16 히트는 **`DashSystem.jsx` 다국어 라벨 사전**(`:22` ko '처리량' 외 15개국)이지 **연산 처리량 계측이 아니다.**

---

## 5. ★부재의 성격 요약 (한 줄)

> **엔티티 15종·도메인 10종·라이프사이클 10단계가 전부 없지만, 하나도 "만들었어야 하는데 안 만든 것"이 아니다.**
> 유일하게 실질적인 §13 PQC 조차 **앱 계층에 선제 교체 대상이 없다**(ADR D-2).
