# CANONICAL — DSAR/Rebate Coverage Measurement Governance

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-6 (1/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**. 스펙 수령 시 본 문서가 양보한다.
>
> **로드맵 확인 완료(RP-001 준수)**: 정본 `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`
> = "후속 4-5-3-1-2~9 Type/Funding/Lifecycle/Permission/**Coverage**/Lint/Golden/Legacy" ·
> 동 문서 §1 = 후속 블록 엔티티에 **`COVERAGE·GAP`** 명시. → **1-6 = Coverage + Gap**. **추정 아님.**

---

## §1. 목적

1-1~1-5는 **설계**했다. 1-6은 **"얼마나 덮였는가"를 측정**한다.

**측정 블록의 유일한 실패 방식은 좋은 숫자를 내는 것이다.**
커버리지 문서가 높은 %를 보고하면 읽는 사람은 안심한다. 그 안심이 틀렸을 때
**이 문서 자체가 가짜녹색의 원천**이 된다. 그래서 §2를 먼저 고정한다.

---

## §2. 🔴 커버리지를 하나의 숫자로 말하지 않는다

**본 설계의 최상위 판단이다.**

| 축 | 질문 | 06-A 현재 |
|---|---|---|
| **Design Coverage** | 요구가 **설계**됐는가 | **높음** (§4) |
| **Implementation Coverage** | 설계가 **코드**로 있는가 | **0%** (§3) |
| **Data Coverage** | 코드에 **실데이터**가 흐르는가 | **0%** (구현 0 → 자동 0) |
| **Verification Coverage** | 동작이 **검증**됐는가 | **0%** (5-8 Golden 미구현) |

> **네 축을 하나로 합치면 안 된다.** 합치는 순간 "설계 100%"가 "완료 100%"로 읽힌다.
> **이 저장소가 288차에 발견한 가짜녹색 systemic의 문서판 재현**이다.
>
> **06-A는 설계는 두껍고 구현은 0이다.** 이 문장이 커버리지 보고의 첫 줄이어야 한다.

**규칙: Coverage 보고는 항상 4축 분리 제시. 종합 단일 %는 금지.**

---

## §3. Implementation Coverage = 0% (재증명)

**1-1의 "부재" 주장을 신뢰하지 않고 1-6에서 직접 재측정했다**(측정 블록은 선행 문서를 인용하지 않는다).

```
backend/src/ 전수 grep (대소문자 무시, 파일 단위)
  rebate → 0        scan-back → 0     scanback → 0
  bill-back → 0     billback → 0      ship-and-debit → 0
  MDF → 0           co-op → 0         coop → 0
```

**9/9 키워드 히트 0 → Rebate 엔진 부재 확정.** 1-1의 판정은 **유효**하다.

**따라서 06-A의 Implementation Coverage = 0%이며, Data/Verification Coverage는 자동으로 0%다**
(존재하지 않는 코드에 데이터가 흐르거나 검증될 수 없다).

**이것은 결함이 아니라 설계 의도다.** 06-A는 처음부터 **전방호환 설계 계약**이었고
**코드변경 0**을 원칙으로 진행했다. 0%는 **정직한 상태 보고**이지 실패가 아니다.

---

## §4. Design Coverage 실측

| 산출물 | 실측 |
|---|---|
| `CANONICAL_DSAR_*.md` | **90** |
| §53 세부 문서 | **101** (REBATE **54** + AUTHORIZATION **47**) |
| `ADR_DSAR_*.md` | **39** |

### 4-1. 🔴 **COV-GAP-01 — 분모가 없다 (측정 불가)**

**Coverage = 충족 / 요구.** 분자는 셀 수 있다(§4). **분모는 셀 수 없다.**

**증명:**

```
grep "§53"  CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md
            CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md   → 0
```

**§53 요구 목록이 저장소 어디에도 없다.** 요구 목록은 **사용자가 채팅에 붙여넣은 스펙**에만 존재했고
**저장소에 정본으로 남지 않았다.**

**귀결: 06-A의 커버리지는 원리적으로 계산 불가능하다.** 분모가 세션 컨텍스트에만 있고
컨텍스트는 소멸하므로, **다음 세션은 무엇이 요구였는지 알 방법이 없다.**

### 4-2. 🔴 **COV-GAP-02 — 보고 52 vs 실측 47 (원인 미확정)**

```
PM_CHANGE_HISTORY.md:294   "§53 산출 문서 52종 신설" · "㊼생성 문서 57(§53 52종 + …)"
실측  ls DSAR_AUTHORIZATION_*.md   → 47
git ls-files 동일                  → 47   (전부 추적 — 파일 유실 아님)
```

**5건 차이.** 원인은 **둘 중 하나인데 판별할 수 없다:**

| 가설 | 의미 |
|---|---|
| (a) 요구 52 · 생성 47 | **실제 §53 문서 5건 누락** |
| (b) 생성 47 · 보고 52 | **자기 보고 과대 집계**(문서는 완전) |

**판별에는 5-1 스펙의 §53 목록이 필요한데 — COV-GAP-01에 의해 저장소에 없다.**
**두 결함이 맞물려 있다.** 분모 부재가 검증 불가를 낳는다.

**분류: `UNVERIFIED`.** 누락(a)으로 단정하지 않는다 — **FP 레지스트리(코드 재증명 전 단정 금지)**의
문서판 적용이다. **동시에 "괜찮다"고도 하지 않는다.** 모른다는 것이 사실이다.

> **대조군이 이 발견을 뒷받침한다:** REBATE 측은 보고 49 · 실측 `DSAR_REBATE_PROGRAM_*` **49**로 **일치**한다.
> 즉 집계 자체는 가능했고 **AUTHORIZATION 측만 어긋났다** — 우연한 오타로 보기 어렵다.

---

## §5. 엔티티 정의

### E-01. `CoverageAxis` — 4축 (§2)

`DESIGN` / `IMPLEMENTATION` / `DATA` / `VERIFICATION`. **혼합 금지.**

### E-02. 🔴 `CoverageRequirementRegistry` — 분모 정본

**COV-GAP-01의 구조적 해소.**

| 필드 | 설명 |
|---|---|
| `requirement_id` | 요구 단위 |
| `source` | **출처 — 스펙 문서 · 헌법 · ADR** |
| `source_persisted` | 🔴 **출처가 저장소에 있는가** (false = 측정 불가) |
| `block_ref` | 담당 블록(1-1~1-9) |
| `axis_status` | 4축별 충족 상태 |

**핵심 규칙: `source_persisted = false`인 요구는 커버리지 분모에 넣을 수 없다.**
**세션 컨텍스트는 저장소가 아니다.** 채팅에만 있는 요구는 **다음 세션에 존재하지 않는 것과 같다.**

> **이 규칙이 06-A 전체에 소급 적용되면 현재 분모는 대부분 무효**다. 불편하지만 사실이다.

### E-03. `CoverageMeasurement` — 측정 1회분

`measured_at` · `commit_sha` · `axis` · `numerator` · `denominator` · `method`(**grep/ls/실행**) ·
`evidence`.

**`method`를 필수로 두는 이유:** "설계함"은 `ls`로 세지만 **"동작함"은 실행해야 안다.**
방법을 안 적으면 **`ls` 결과가 동작 증거로 오독**된다 — 5-8의 고아 가드가 정확히 그 사고였다
(파일 존재를 배선 증거로 오독).

### E-04. `CoverageBaseline` · E-05. `CoverageTrend`

기준선 + 추세. **단일 시점 %는 의미가 약하다** — 중요한 건 **방향**이다.

### E-06. `SelfReportReconciliation` — 🔴 자기보고 대조

**COV-GAP-02의 구조적 해소.** PM 이력의 주장 숫자를 **실측과 자동 대조**한다.

```
규칙: PM_CHANGE_HISTORY / AGENT_EXECUTION_HISTORY 의 산출 개수 주장
      ↔ ls 실측  →  불일치 시 GAP 등재
```

**사람이 센 숫자를 사람이 다시 세게 하면 같은 실수를 반복한다.**

### E-07~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-07 | `ScopeCoverage` | 1-1 Scope registry 재사용 커버리지(Provider/Vendor/Product/Tenant **REAL** vs Legal Entity/Workspace **부재**) |
| E-08 | `BlockCoverage` | 블록별(1-1~1-9) 4축 상태 |
| E-09 | `EntityCoverage` | Canonical Entity 단위 — 1-1 **17 엔티티** 기준 |
| E-10 | `CoverageExclusion` | 측정 제외 — **사유·승인자·만료 필수**(무기한 금지) |
| E-11 | `CoverageReport` | 4축 분리 보고(§2) · **단일 % 금지** |
| E-12 | `CoverageCertification` | 5-8 `CertificationRun`과 **동일 정본** — 중복 금지 |

---

## §6. Golden Rule 적용

**측정 인프라를 신설하지 않는다.** 이미 있다:

- `ls`/`grep` 기반 실측 — 본 문서가 사용한 방법
- **`baseline.json`**(`sacred_sha`·`ko_leaf_count`·`leaf_tolerance_pct`) — **기준선 동결의 검증된 선례**
- **`render.mjs` 119 라우트 자동 도출**(281차) — **분모 자동 산출의 선례**

**E-02의 분모 레지스트리는 `baseline.json` 패턴의 확장**이지 신규 발명이 아니다.

**특히 `render.mjs` 패턴이 핵심 교훈이다:** 라우트 커버리지가 신뢰받는 이유는
**분모를 사람이 안 세고 코드에서 도출**하기 때문이다. **06-A는 정확히 그것을 안 했다.**

---

## §7. 비파괴 확인

- 코드 변경 **0** · CI/hook 변경 **0** · 기존 문서 수정 **0**
- 본 문서는 **측정 결과 기록 + 측정 체계 설계**다

---

## §8. 인계 (MIGRATION_REQUIRED)

| ID | 항목 | 등급 |
|---|---|---|
| **MR-1-6-01** | **§53 요구 목록(분모) 저장소 영속화** — COV-GAP-01 | 🔴 |
| **MR-1-6-02** | **보고 52 vs 실측 47 판별** — MR-1-6-01 선행 필요 | 🔴 `UNVERIFIED` |
| **MR-1-6-03** | `SelfReportReconciliation` 자동 대조 | 🟠 |

**본 세션 수정 0.**
