# MEA Part 064 — GT② DUPLICATE AUDIT (중복 신설 위험 전수 감사)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 헌법 V4(단일 Intelligence Layer·중복 엔진 절대 금지) · [[feedback_no_duplicate_features]] 적용.
> ★규율: **"중복"과 "결여 보강"을 구분**. 스코프가 다르면 **둘 다 참**(060 D-2·061 D-1).

---

## 0. 요약 — 본 Part 는 중복 감사의 성격이 다르다

058~063 의 중복 감사는 **"만들면 기존과 겹치는가"** 를 물었다. 064 는 **애초에 만들지 않기로 결정**했으므로(ADR D-1 사업 범위 밖) 본 문서의 역할은 다르다:

> **"만약 누군가 §3 구축 대상 10종을 그대로 만들려 하면 무엇과 충돌하는가"** 를 **사전 차단 목록**으로 남긴다.

| 구분 | 건수 |
|---|---|
| **★DUPLICATE-HIGH**(신설 시 명백한 중복) | **4** |
| **SEPARATE**(스코프 상이·둘 다 참) | **4** |
| **NO-CONFLICT**(대응 자산 부재, 단 ★신설 자체를 권하지 않음) | **7** |

---

## 1. ★DUPLICATE-HIGH — 신설 금지

### DUP-1 · "Advanced Computing Monitoring Service"(§3-6) / §5 `COMPUTE_METRIC` vs **`SystemMetrics`**
관측 정본은 하나다(057 확정). `SystemMetrics.php:15~19` **목데이터 금지 원칙** · probes · 289차 후속 신설 **AI Gateway 프로브**(`probeAi`).
→ 연산 계측이라도 **프로브를 별도 신설하지 않고 `SystemMetrics` 에 프로브를 추가**하는 것이 정본 경로다(AI 프로브가 그 선례).

### DUP-2 · "Quantum Audit Service"(§3-9) / §12 Audit Trail / §16 `ComputeAudited` vs **`SecurityAudit`**
`SecurityAudit.php:44~52`(`prev_hash`/`hash_chain`) + **`verify()`:55~68** = 저장소 **유일** tamper-evident.
056 D-3 ~ 063 에서 **"체인 정본은 하나"** 확정 — 재판정 금지.
★★**`menu_audit_log.hash_chain` 을 tamper-evident 로 재오염 금지**([[reference_menu_audit_log_not_tamper_evident]]).

### DUP-3 · "Computing Analytics Dashboard"(§3-8) / §11 Executive Dashboard vs **`SystemMonitor`·`DashSystem`**
`SystemMonitor.jsx` · `DashSystem.jsx`(176차 **ZERO-MOCK REWRITE**, `/v424/system/metrics` 소비)가 이미 시스템 상태 대시보드다.
→ **신규 페이지·신규 사이드바 메뉴 신설 금지**([[feedback_minimize_new_menus]]).

### DUP-4 · "Quantum Workload Scheduler"(§3-5) / §8 Batch Scheduling vs **`Reports` 스케줄 엔진**
`Reports.php:104` `computeNextRun` · `:502` `runSchedule` + cron 러너(`/vNNN/worker/run-once`).
→ **별도 스케줄러·cron 체계 신설 금지.** ★단 **연산 잡 스케줄링과 리포트 예약은 성격이 다르므로**(우선순위·자원 점유·선점) 만약 실제로 필요해지면 **"중복"이 아니라 "결여 보강"** 이 된다 — 그때도 **실행 트리거는 기존 cron 경로에 편입**.

---

## 2. SEPARATE — 스코프 상이 · 오흡수 금지 (★둘 다 참)

| 기존 자산 | file:line | 명세 요구 | 왜 다른가 |
|---|---|---|---|
| **`Mmm::frontier`** / **`PriceOpt`** | 058 / 059 GT | §6 Optimization Computing · §10 Cost/Runtime Optimization | **수학적 최적화(예산·가격)** ≠ **연산 자원 최적화**. 축이 다름 |
| **`PriceOpt::simulate`** | `PriceOpt.php:927~948` | §9 Quantum Simulation | **가격 시나리오 시뮬** ≠ **양자 회로 시뮬레이터** |
| **`JourneyBuilder` 노드/워크플로** | `JourneyBuilder.php`(nodes 40) | §5 COMPUTE_WORKLOAD · §7 Workload Submission | **마케팅 여정 워크플로** ≠ **연산 워크로드** |
| **`Crypto`(대칭 AES-256-GCM)** | `Crypto.php:121` | §13 Quantum-Safe Cryptography | **대칭 암호** ≠ **PQC**. ★Grover 하에서도 안전해 **교체 대상 아님**(ADR D-2) |

---

## 3. NO-CONFLICT — 대응 자산 부재 (★단 신설 자체를 권하지 않음)

부재증명 완료(GT① §1) — 중복 위험 0:

**COMPUTE_CLUSTER · HPC_NODE · QUANTUM_PROCESSOR · QUANTUM_JOB · QUANTUM_ALGORITHM · QUANTUM_GATEWAY · Enterprise Computing Registry**

★이 7종은 **"중복이 아니니 만들어도 된다"가 아니라 "사업 범위 밖이라 만들 이유가 없다"**(ADR D-1). NO-CONFLICT 를 **신설 승인 신호로 오독하지 말 것.**

---

## 4. 결론

> **064 에서 신설해야 할 것은 없다.** 명세 §3 의 10종 중 4종은 기존 정본과 **명백히 중복**이고, 나머지는 **사업 범위 밖**이다.
> 본 문서의 실질 가치는 **"미래에 누군가 이 명세를 근거로 신설을 시도할 때 무엇을 재사용해야 하는지"** 를 못 박아 둔 데 있다.
