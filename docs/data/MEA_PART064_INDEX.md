# MEA Part 064 — INDEX (Enterprise Quantum Computing Readiness & Advanced Computing)

> 289차 후속(2026-07-22) · **설계 명세 · 코드 변경 0 · NOT_CERTIFIED · 배포 없음**

---

## 1. 문서 세트 (7편)

| # | 문서 | 역할 |
|---|---|---|
| ⓐ | [`docs/spec/MEA_PART064_QUANTUM_ADVANCED_COMPUTING_ARCHITECTURE_SPEC.md`](../spec/MEA_PART064_QUANTUM_ADVANCED_COMPUTING_ARCHITECTURE_SPEC.md) | 원문 §1~§19 **verbatim** + 거버넌스 헤더 |
| ⓑ | [`MEA_PART064_EXISTING_IMPLEMENTATION.md`](MEA_PART064_EXISTING_IMPLEMENTATION.md) | **GT①** 부재증명 + 오흡수 배제 + **PQC 노출면 실측** |
| ⓒ | [`MEA_PART064_DUPLICATE_AUDIT.md`](MEA_PART064_DUPLICATE_AUDIT.md) | **GT②** 신설 시 충돌 사전 차단 목록 |
| ⓓ | [`../architecture/ADR_MEA_PART064_QUANTUM_ADVANCED_COMPUTING.md`](../architecture/ADR_MEA_PART064_QUANTUM_ADVANCED_COMPUTING.md) | **ADR D-1~D-6** + 오흡수·grep 규율 |
| ⓔ | [`MEA_PART064_CANONICAL_ENTITIES.md`](MEA_PART064_CANONICAL_ENTITIES.md) | §5 15엔티티 + §6~§11 |
| ⓕ | [`MEA_PART064_GOVERNANCE_MECHANISMS.md`](MEA_PART064_GOVERNANCE_MECHANISMS.md) | §12~§19 |
| ⓖ | 본 문서 | INDEX |

---

## 2. ★★핵심 판정 한 줄

> **ABSENT-total — 단 "부실"이 아니라 "사업 범위 밖(out of scope)".**

- **§5 Canonical Entity 15종 = 전량 ABSENT** (062의 2종 PARTIAL-weak 조차 없음 → **MEA 실재도 최저 기록 갱신**)
- **형식 용어 전량 0**: `quantum`·`qubit`·`qpu`·`hpc`·`cluster`·`workload`·`scheduler`·`pqc`·벤더 SDK 전부
- **★그러나 결함이 아니다** — GeniegoROI 는 단일 호스트 PHP/MySQL 커머스·마케팅 SaaS다

### ★063 과의 결정적 차이 (본 Part 핵심)

| | 063 ESG | **064 Quantum/HPC** |
|---|---|---|
| 표면·유료게이트·15개국라벨·챗봇 약속 | **있음** | **없음** |
| 실체 | 없음 | 없음 |
| **성격** | **약속-실체 불일치(실결함)** | **정직한 부재** |

> **063은 팔고 있는데 없었다. 064는 팔지도 않고 없다.** 같은 ABSENT라도 **행동을 요구하는지가 정반대**다.

### MEA 시리즈 성격 4분류 (064에서 확장)
| 유형 | Part |
|---|---|
| 엔진O / Registry X | 058·059·060·061 |
| 엔진 자체 X | 062 |
| 표면만 O (약속-실체 불일치) | 063 |
| **사업 범위 밖 (정직한 부재)** | **064** ★신설 |

---

## 3. ADR 결정 6종

| ID | 결정 |
|---|---|
| **D-1** ★★ | 성격 = **"사업 범위 밖"**. 판정 어휘에 **제5항 추가**("미달"vs**"out of scope"**). §1~§12·§14~§19는 **로드맵 등재도 하지 않는다** |
| **D-2** ★ | §13 PQC만 실질 축. **결론은 "지금 할 일이 거의 없다"** — 대칭은 안전, 비대칭 5개소는 **전부 외부 표준 종속**, 최대 노출 TLS는 인프라 계층 |
| **D-3** | 관측=`SystemMetrics` · 감사=`SecurityAudit` · 스케줄=`Reports` · 최적화=`Mmm`/`PriceOpt` **정본 고정, 신설 금지** |
| **D-4** | **Registry 부재 7연속**이나 **064는 공통 Registry 승격 대상에서 제외** — 자산이 영원히 안 생기므로 포함 시 **과설계** |
| **D-5** | §17 AI 조항은 **현행이 구조적으로 충족** — 단 **"대상이 없어서"**(과대주장 금지) |
| **D-6** | §18 SLA는 **"측정 대상 부재"**. 단 **범용 가용성은 `SystemMetrics` 관측 대상**(스코프 분리·둘 다 참) |

---

## 4. ★PQC 노출면 (실측 · 본 Part 유일한 실질 산출)

**비대칭 5개소 — 전부 외부 종속이라 선제 교체 불가**

| file:line | 정체 | 알고리즘 |
|---|---|---|
| `WebPush.php:620` (`vapidJwt`:611) | Web Push VAPID | **ES256** (EC P-256) |
| `Connectors.php:3817` (`:3808` alg) | Google 서비스계정 OAuth2 JWT | **RS256** |
| `DataExport.php:602` (`rs256`:595) | JWT 서명 | **RS256** |
| `EnterpriseAuth.php:536` | SSO 서명 **검증** | RSA/EC+SHA256 |
| `EnterpriseAuth.php:600` | SAML XML c14n **검증** | RSA/EC+SHA256 |

**대칭 — 교체 대상 아님**: `Crypto.php:121` AES-256-GCM(+`:113~114` fail-closed) · **`hash_hmac('sha256')` 48개소**

> ★"양자내성 암호 도입" = **거짓** / "양자에 취약" = **과장**.
> 정직한 표현: **"앱 계층에 선제 교체 대상이 사실상 없고, 노출은 외부 표준과 인프라 TLS에 있다."**

★별건(양자 무관): `hash_hmac('sha1')` 2 · `('md5')` 1 — 이미 약한 해시. **외부 스펙 강제 여부 확인 선행 필요**.

---

## 5. ★오흡수 금지 (전량 실측 배제)

**`nodes` 101 = JourneyBuilder 워크플로 + GraphScore 기여도 그래프(055)** ≠ HPC_NODE · **`queue` 39 = 업무 대기열**(입고·결재·PM·피드백·접근검토·이메일) ≠ COMPUTE_QUEUE · **`throughput` 16 = `DashSystem` i18n 라벨 15개국** ≠ 연산 처리량 · **`latency` 11 = `SystemMetrics` 프로브(057)** ≠ HPC 계측 · **`simulation` 16 = `PriceOpt` 가격 시뮬(059)** ≠ Quantum Simulation · **`gpu` 6 = CSS `translateZ(0)` 렌더 레이어** ≠ GPU Computing · **`cpu` 5 = CCTV 트랜스코딩 주석** ≠ HPC · **`capacity` 6 = WMS bin 물리 용량** ≠ Capacity Planning · **`worker` 7 = PHP-FPM 워커·cron 러너·e2e 풀** ≠ HPC worker · **`parallel` 1 = 테스트 주석** · **`Reports` 스케줄러 ≠ Quantum Workload Scheduler** · **`gate`(권한) ≠ Quantum Gate** · **`Pnl` 비용 ≠ 연산 비용**(063 D-2 동형) · **AI quota 초과 ≠ CapacityExceeded**

---

## 6. ★grep 규율 갱신 (신규 트랩)

**`RSA` 무경계·대소문자무시 검색 금지** — **`conve`rsa`tions`** · **`phrase`** · **`selectWarehouseForSale`** 등 부분문자열 오탐 대량 발생.
→ **비대칭 암호 조사는 API 심볼로**: `openssl_sign` · `openssl_verify` · `OPENSSL_ALGO` · `openssl_pkey_get_(private|public)`

표준 제외 유지: `--glob '!*.json' --glob '!**/i18n/**' --glob '!**/locales_backup/**' --glob '!**/_archived/**'`

---

## 7. 다음 Part

**MEA Part 065 — Enterprise Unified Intelligence Platform & Future Enterprise Reference Architecture**(064 SPEC 지정).

★**성격 예고**: 065는 **시리즈 종합·참조 아키텍처**로 보인다. 051~064 판정을 **집대성**하는 성격이라면 **기판정 substrate 재판정 금지**가 그 어느 때보다 중요하다.
★**헌법 V4 정면 대상**: "Unified Intelligence Platform"은 **`docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(Volume 4)와 직접 충돌·중복 가능성**이 높다 — **반드시 헌법 V4 원문을 먼저 읽고**, 신설이 아니라 **기존 Intelligence Layer 확장**으로 판정해야 한다(중복 엔진 절대 금지).
★조사 후보(가설·**인용 금지**): `Decisioning`·`AutoRecommend`·`Insights`·`AttributionEngine`·`CustomerAI`·`Mmm`·`DataPlatform`.
