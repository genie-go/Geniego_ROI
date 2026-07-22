# ADR — MEA Part 064 · Enterprise Quantum Computing Readiness & Advanced Computing

> 289차 후속(2026-07-22) · **설계 결정 문서 · 코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 근거는 전량 [`GT①`](../data/MEA_PART064_EXISTING_IMPLEMENTATION.md)·[`GT②`](../data/MEA_PART064_DUPLICATE_AUDIT.md) 실측 인용. 가설 인용 0.
> 상속: 051~063 **재판정 금지**. 상충 시 **스코프 분리해 둘 다 참으로**(060 D-2·061 D-1).

---

## D-1 (★★최대 결정) — 성격은 "부실"이 아니라 **"사업 범위 밖(out of scope)"**

### 결정
064 의 부재를 **결함으로 기록하지 않는다.** MEA 시리즈 판정 어휘에 **제5의 항목**을 추가한다:
**"미달"이 아니라 "사업 범위 밖"**.

### 근거
- 형식 용어 **전량 0**(GT① §1) — `quantum`·`qubit`·`hpc`·`cluster`·`workload`·`scheduler` 모두 0.
- GeniegoROI 는 **단일 호스트 PHP 8.1 / MySQL 커머스·마케팅 SaaS** 다. 양자 프로세서·HPC 클러스터·GPU 스케줄링은 **제품이 파는 것이 아니다**.

### ★063 과의 결정적 차이 (이 구분이 본 Part 의 핵심)
| | 063 ESG | **064 Quantum/HPC** |
|---|---|---|
| 표면(메뉴·탭) | **있음** | **없음** |
| 유료 게이트 | **있음**(Pro) | 없음 |
| 15개국 라벨 | **있음** | 없음 |
| 가이드·온보딩·챗봇 약속 | **있음**(현재형 단정) | **없음** |
| 실체 | 없음 | 없음 |
| **성격** | **약속-실체 불일치(실결함)** | **정직한 부재** |

> 063 은 **팔고 있는데 없었다**. 064 는 **팔지도 않고 없다**. 같은 "ABSENT" 라도 **행동을 요구하는지가 정반대**다.

### 귀결
**§1~§12·§14~§19 는 구현 대상이 아니다.** 로드맵 등재도 하지 않는다. 유일한 예외가 D-2.

---

## D-2 — §13 PQC 만 실질 축이며, **결론은 "지금 할 일이 거의 없다"**

### 결정
§13 Quantum-Safe Cryptography 를 **유일한 실질 검토 대상**으로 분리하되, 판정은 **"미구현"이 아니라 "외부 표준·인프라 선행 종속"** 으로 고정한다.

### 근거 (GT① §3 실측)
- **대칭 자산**(`Crypto` AES-256-GCM `Crypto.php:121` · **HMAC-SHA256 48개소**)은 **Grover 하에서도 실무상 안전**(유효강도 절반이나 ≈128비트). → **교체 대상 아님.**
- **비대칭 5개소가 전부 외부 종속**:
  `WebPush.php:620` VAPID **ES256**(Web Push 표준) · `Connectors.php:3817` **RS256**(Google OAuth2) · `DataExport.php:602` RS256 · `EnterpriseAuth.php:536`·`:600` **SAML/SSO 검증측**(IdP 공개키)
  → 상대(브라우저 벤더·Google·IdP)가 PQC 를 지원해야 따라가는 구조로, **우리가 선제 교체할 수 없다.**
- **최대 노출인 TLS 는 nginx 종단** = 앱 코드 밖·인프라 계층.
- **PKI/KMS/HSM 부재는 062 확정** — 재판정 금지.

### ★과대·과소 주장 동시 금지
- "양자내성 암호를 도입했다" → **거짓**(도입한 적 없음)
- "양자에 취약하다" → **과장**(대칭은 안전하고, 비대칭은 외부 종속이라 우리 결정 밖)
- 정직한 표현: **"앱 계층에 선제 교체 대상이 사실상 없고, 노출은 외부 표준과 인프라 TLS 에 있다."**

### 유일한 실행 가능 항목 (선택)
`hash_hmac('sha1')` 2개소 · `hash_hmac('md5')` 1개소 — **양자와 무관하게** 이미 약한 해시다. 용도가 외부 스펙 강제인지 확인 후 SHA-256 상향 여부를 검토할 수 있다. ★단 **외부 채널 API 가 요구하는 서명 방식이면 변경 불가** — 반드시 용도 확인 선행(본 Part 범위 밖).

---

## D-3 — 신설 금지: 관측·감사·스케줄·최적화는 이미 정본이 있다

§3 의 "Advanced Computing Monitoring Service"·"Quantum Audit Service"·"Computing Analytics Dashboard"·§5 `COMPUTE_METRIC`/`COMPUTE_AUDIT` 를 **가정법으로라도 신설 설계하지 않는다.**
만에 하나 연산 계측이 필요해지는 날이 와도 정본은 이미 정해져 있다(헌법 V4):

| 요구 | 정본 | 상속 |
|---|---|---|
| 계측·프로브 | **`SystemMetrics`**(목데이터 금지 원칙 `:15~19`, 9번째 AI 프로브) | 057 |
| 감사 | **`SecurityAudit`**(`:44~52`·`verify()`:55~68) — 체인 정본은 하나 | 056·062 |
| 스케줄 실행 | **`Reports`**(`computeNextRun`:104·`runSchedule`:502) | 063 |
| 수학적 최적화 | **`Mmm::frontier`** / **`PriceOpt`** | 058·059 |

★★**`menu_audit_log.hash_chain` 재오염 절대 금지**([[reference_menu_audit_log_not_tamper_evident]]).

---

## D-4 — ★Registry 부재 7연속, 그러나 **064 는 승격 대상에서 제외**

058 Decision · 059 Twin · 060 Automation · 061 Device · 062 Blockchain · 063 ESG · **064 Computing** — 7연속 Registry 부재.

**그러나 064 는 공통 Registry 추상화 논의(063 D-x 에서 상위 승격 필요로 판정)의 대상에서 뺀다.**
근거: 058~063 은 **제품이 실제로 다루는 도메인**(의사결정·트윈·자동화·디바이스·원장·ESG)이라 언젠가 Registry 가 필요하지만, **064 는 사업 범위 밖**(D-1)이라 Registry 를 만들 자산 자체가 영원히 생기지 않는다.
→ **공통 Registry 설계 시 064 를 요구사항에 포함하면 과설계**가 된다.

---

## D-5 — §17 AI 조항은 **현행이 구조적으로 충족**(단, "대상이 없어서")

명세 §17 "AI 는 승인 없이 Quantum 알고리즘을 운영 환경에 적용하거나 연산 정책을 자동 변경하지 않는다" 는 **현재 구조적으로 충족**된다:
ⓐ **Quantum 알고리즘 개념이 없다**(적용 대상 부재) ⓑ **연산 정책이 없다**(변경 대상 부재) ⓒ 파괴적 액션은 **제안-only + HITL**·기본값 approval(054 D-2).

★단 이는 **"잘 통제되어서"가 아니라 "대상이 없어서"** 다 — **과대주장 금지**(062 D-x·063 동일 규율).

---

## D-6 — §18 성능 SLA 는 **"미달"이 아니라 "측정 대상 부재"**

Workload Scheduling ≤1초 · Resource Allocation ≤2초 · Cluster Status ≤500ms 등 6종은 **측정할 대상이 존재하지 않는다**.
★단 **"API 응답 ≤300ms"·"Availability ≥99.99%"** 는 범용 지표라 `SystemMetrics`(057)가 이미 관측 축을 갖고 있다 — **스코프 분리**(연산 SLA 는 부재 / 범용 가용성은 057 관측 대상, 둘 다 참).

---

## 부록 A — 오흡수 금지 목록 (상세 GT① §2)

**`nodes` 101 = JourneyBuilder 워크플로 노드 + GraphScore 기여도 그래프(055)** ≠ HPC_NODE · **`queue` 39 = 업무 대기열**(입고·결재·PM·피드백·접근검토·이메일) ≠ COMPUTE_QUEUE · **`throughput` 16 = i18n 라벨 15개국** ≠ 연산 처리량 · **`latency` 11 = `SystemMetrics` 프로브(057)** ≠ HPC 계측 · **`simulation` 16 = `PriceOpt` 가격 시뮬(059)** ≠ Quantum Simulation · **`gpu` 6 = CSS `translateZ(0)` 렌더 레이어** ≠ GPU Computing · **`cpu` 5 = CCTV 트랜스코딩 절약 주석** ≠ HPC · **`capacity` 6 = WMS bin 물리 용량** ≠ Capacity Planning · **`worker` 7 = PHP-FPM 워커·cron 러너·e2e 풀** ≠ HPC worker · **`Reports` 스케줄러 ≠ Quantum Workload Scheduler** · **`gate`(권한 게이트) ≠ Quantum Gate**

## 부록 B — grep 규율 갱신 (신규 트랩)

★**`RSA` 무경계·대소문자무시 검색 금지** — **`conve`rsa`tions`**·**`phrase`**·**`selectWarehouseForSale`** 등 **부분문자열 오탐**이 대량 발생한다.
**비대칭 암호 조사는 API 심볼로**: `openssl_sign` · `openssl_verify` · `OPENSSL_ALGO` · `openssl_pkey_get_(private|public)`.
기존 표준 제외 유지: `--glob '!*.json' --glob '!**/i18n/**' --glob '!**/locales_backup/**' --glob '!**/_archived/**'`
