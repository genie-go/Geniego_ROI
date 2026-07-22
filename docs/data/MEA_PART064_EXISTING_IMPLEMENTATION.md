# MEA Part 064 — GT① EXISTING IMPLEMENTATION (실재 구현 전수조사)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 범위: `backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src` / 제외: `*.json`·`**/i18n/**`·`**/locales_backup/**`·`**/_archived/**`
> 방법: **단어경계 `\b`(rg -w) + 광의 히트 파일 단위 전수 분류**. file:line 전량 실측.

---

## 0. ★★핵심 판정 — ABSENT-total, 단 **"부실"이 아니라 "사업 범위 밖"**

**형식 용어가 하나도 없다.** 062(Blockchain)조차 `ledger`·`SecurityAudit` 같은 인접 자산은 있었으나, 064는 **인접 자산으로 볼 만한 것조차 전부 다른 도메인**이다.

> ★**그러나 이것을 결함으로 보면 오판이다.** GeniegoROI는 **단일 호스트 PHP 8.1 / MySQL 기반 커머스·마케팅 SaaS**다. 양자컴퓨팅·HPC 클러스터·GPU 스케줄링은 **이 제품의 사업 영역이 아니다.**
> **063(ESG)과 결정적으로 다르다** — 063은 **메뉴·Pro 유료 게이트·15개국 라벨로 표면을 팔고 있었다**(약속-실체 불일치). **064는 표면도, 약속도, 사용자 안내도 전혀 없다** → **정직한 부재**다.

★판정 어휘: **"미달"이 아니라 "사업 범위 밖(out of scope)"** · 인프라 요구는 **"미구현"이 아니라 "인프라 선행 종속"**.

---

## 1. 형식 용어 부재증명 — **전량 0** (rg -w 실측)

**양자**: `quantum` · `qubit` · `qpu` · `superposition` · `entanglement` · `annealing` · `shor` · `grover`
**양자 SDK/벤더**: `qiskit` · `cirq` · `braket` · `ionq` · `rigetti` · `dwave`
**HPC**: `hpc` · `slurm` · `cuda` · `mpi` · `openmp` · `cluster` · `workload` · `scheduler` · `orchestrat`
**PQC**: `pqc` · `post_quantum` · `quantum_safe` · `kyber` · `dilithium` · `lattice`
**§5 Canonical Entity 15종**: `compute_cluster` · `hpc_node` · `quantum_processor` · `quantum_job` · `compute_workload` · `compute_queue` · `compute_resource` · `quantum_algorithm` · `quantum_gateway` · `compute_policy` · `compute_session` · `compute_metric` · `compute_analytics` · `compute_version` · `compute_audit`

→ **단 한 건도 없다.** ★`cluster`·`scheduler`·`workload`가 **0**인 것이 특히 결정적이다 — 이 세 단어는 일반 소프트웨어에서도 흔히 쓰이는데 그조차 없다는 것은 **연산 인프라 개념 자체가 코드베이스에 존재하지 않음**을 뜻한다.

---

## 2. ★역방향 오흡수 금지 — 광의 히트 전량 분류 (실측)

| 토큰 | 히트 | 실제 정체 | 판정 |
|---|---|---|---|
| **`nodes`** | 101 | **`JourneyBuilder` 워크플로 노드**(`JourneyBuilder.php` 40 · `JourneyCanvas.jsx` 13 · `JourneyBuilder.jsx` 13) + **`GraphScore` 마케팅 기여도 그래프 노드**(`GraphScore.jsx` 13 · `GraphScore.php` 6 · `mlAttribution.js` 4 · 055 확정 `graph_node`) | ★**HPC_NODE 아님** — 워크플로/그래프 노드 |
| **`queue`** | 39 | **업무 대기열** — 입고 대기(`GuideArrival.jsx` 15) · 결재 대기(`Approvals.jsx` 5) · PM 간트(`PM/Gantt.php` 5) · 피드백(`FeedbackCenter.jsx` 4) · 접근검토(`AccessReview.jsx` 3) · 이메일 발송(`EmailMarketing.php` 2) | ★**COMPUTE_QUEUE 아님** |
| **`throughput`** | 16 | **`DashSystem.jsx` 다국어 라벨 사전**(`:22` ko '처리량' · `:41` ja · `:60` en · `:79` zh …) — **15개국 i18n 문자열** | ★**연산 처리량 계측 아님** |
| **`latency`** | 11 | **`SystemMetrics.php`(057 관측 정본) · `SystemMonitor.jsx` · `DashSystem.jsx`** — 프로브 응답시간 | ★**057 스코프**(HPC 자원 계측 아님·스코프 분리) |
| **`simulation`** | 16 | **`poI18n.js` 9 = `PriceOpt` 가격 시뮬레이션 라벨**(059 확정) + `WmsManager` 2 · `AdminGrowth` 등 | ★**Quantum Simulation 아님** |
| **`gpu`** | 6 | **CSS `transform: translateZ(0)` 브라우저 렌더 레이어 분리**(`MobileBottomNav.jsx:279` "GPU 가속" · `styles.css:2474`·`:2539`·`:2542`·`:2571` · `Topbar.jsx:1114`) | ★**GPU Computing 아님 — 완전 오탐** |
| **`cpu`** | 5 | **CCTV 트랜스코딩 CPU 절약 주석**(`WmsCctv.php:599` "-c copy → CPU 거의 0" · `:1149` · `tools/cctv-bridge/bridge.js:188` · README) | ★**HPC 아님** |
| **`capacity`** | 6 | **WMS 창고 bin 물리 적재용량**(`Wms.php:195`·`:233`·`:1602`·`:1607`·`:1614`) + SMS 잔여건수(`SmsMarketing.jsx:133`) | ★**Capacity Planning 아님** |
| **`worker`** | 7 | **PHP-FPM 워커 점유 보호**(`LiveCommerce.php:30` SSE 300s cap · `PM/Events.php:20`) + cron 러너 엔드포인트(`routes.php` `/vNNN/worker/run-once`) + e2e 동시성 풀(`tools/e2e/smoke.mjs:145`) | ★**HPC worker node 아님** |
| **`parallel`** | 1 | `tools/triage_apply_self_test.sh:32` 주석 "parallel-safe" | ★**Parallel Processing 아님** |
| **`shor`/`grover`** | 0 | — | 인명 오탐 우려했으나 **0건** |

★**신규 grep 트랩 기록**: `RSA` 를 **무경계·대소문자무시**로 검색하면 **`conve`rsa`tions`**(대화)·**`selectWarehouseForSale`**·**`phrase`** 같은 **부분문자열 오탐**이 대량 발생한다. 비대칭 암호 조사는 **`openssl_sign`/`openssl_verify`/`OPENSSL_ALGO` 같은 API 심볼로** 해야 정확하다(본 조사에서 실제로 걸렀다).

---

## 3. ★§13 Quantum-Safe Cryptography — **유일하게 실질적 의미가 있는 절**

§1~§12·§14~§19 는 사업 범위 밖이지만, **PQC 만은 "미래 대비"가 아니라 현재 보유 자산에 대한 실제 리스크 축**이므로 노출면을 실측했다.

### 3.1 앱 계층 **비대칭** 암호 사용 = **5개소**(전수)

| file:line | 정체 | 알고리즘 | 성격 |
|---|---|---|---|
| `backend/src/Handlers/WebPush.php:620` (`vapidJwt` :611) | **Web Push VAPID JWT** | **ES256**(EC P-256, DER→raw r‖s 64B) | 외부 표준(Web Push) 종속 |
| `backend/src/Handlers/Connectors.php:3817` | **Google 서비스계정 OAuth2 JWT bearer 그랜트**(`:3808` `alg:RS256`) | **RS256** | 외부 프로토콜(Google) 종속 |
| `backend/src/Handlers/DataExport.php:602` (`rs256` :595) | JWT 서명 생성 | **RS256** | 외부 연동 서명 |
| `backend/src/Handlers/EnterpriseAuth.php:536` | **SSO 서명 검증**(`openssl_verify`) | RSA/EC + SHA256 | **검증측**(IdP 공개키) |
| `backend/src/Handlers/EnterpriseAuth.php:600` | **SAML XML c14n SignedInfo 검증** | RSA/EC + SHA256 | **검증측**(IdP 공개키) |

### 3.2 앱 계층 **대칭** 암호·서명 (양자 위협 낮음)

- `backend/src/Crypto.php:121` — **AES-256-GCM**(`openssl_encrypt(..., 'aes-256-gcm', ...)`), `:113~114` **fail-closed**(openssl 부재 시 평문 저장 거부)
- `aes-128-gcm` 1개소
- **`hash_hmac('sha256', ...)` 48개소** — 채널/웹훅 API 서명 정본(062 확정)
- `hash_hmac('sha1')` 2 · `hash_hmac('md5')` 1

### 3.3 ★판정 (과대주장·과소평가 모두 금지)

- **대칭 자산은 Grover 하에서도 실무상 안전** — AES-256 의 유효강도가 절반(≈128비트)이 되지만 **여전히 안전 영역**이다. HMAC-SHA256 도 동일. → **교체 대상 아님.**
- **실제 노출은 비대칭 5개소** — 그러나 **전부 외부 표준·프로토콜 종속**이다(Web Push VAPID / Google OAuth2 / SAML). **우리가 임의로 PQC 알고리즘으로 바꿀 수 없다** — 상대(브라우저 벤더·Google·IdP)가 PQC 를 지원해야 따라간다.
- **가장 큰 노출은 TLS** 인데 이는 **nginx 가 종단**하며 **앱 코드 밖·인프라 계층**이다(044/045/050 인프라 선행 종속).
- **PKI/KMS/HSM 은 062 에서 부재 확정** — 재판정 금지.

→ **결론: 앱 계층에서 지금 PQC 로 교체할 대상은 사실상 없다.** §13 은 **"미구현"이 아니라 "외부 표준·인프라 선행 종속"**이다. ★"양자내성 암호를 도입했다"는 주장도, "양자에 취약하다"는 주장도 **둘 다 과장**이 된다.

---

## 4. 재사용해야 할 상위 Part 확정 자산 (★재판정 금지)

| 자산 | file:line | 상속 |
|---|---|---|
| `SystemMetrics` 관측 정본(목데이터 금지 원칙 + **AI Gateway 프로브**) | `SystemMetrics.php:15~19` · probes · `probeAi`(289차 후속 신설) | **057** |
| `SecurityAudit` 유일 tamper-evident 체인 | `SecurityAudit.php:44~52` · `verify()`:55~68 | **056·062** |
| `Crypto` 앱 레벨 대칭 암호(fail-closed) | `Crypto.php:113~114`·`:121` | **049** |
| `Mmm::frontier` 최적화 · `PriceOpt::simulate` 시뮬 | 058 / 059 GT | **058·059**(★스코프 상이) |
| `Reports` 스케줄 엔진 | `Reports.php:104`·`:502` | **063** |

---

## 5. 부수 발견

**없음.** 본 Part 조사 범위에서 신규 실결함 0건. (§13 PQC 노출면은 결함이 아니라 **정상적 외부 종속**으로 판정.)

---

## 6. 인용 무결성

file:line 전량 본 세션 rg/sed 실측. 가설 인용 0. ★063 인계서가 제시한 조사 후보(`Crypto`·`SecurityAudit`·HMAC·`Mmm`/`PriceOpt`·인프라)는 **가설로만 사용**했고 실제 인용은 재검증분만 채택했다.
