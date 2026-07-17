# CANONICAL — DSAR/Rebate Legacy Equivalence Registry

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-9 (1/2) — 06-A 최종 블록**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**. 스펙 수령 시 본 문서가 양보한다.
>
> **RP-001 준수 — 로드맵 + 위임 모두 확인 (1-8과 대조: 1-8은 위임 0이었다)**:
> ① `MASTER_REGISTRY:7` = "후속 4-5-3-1-2~9 …/Golden/**Legacy**"
> ② `DSAR_REBATE_PROGRAM_LIFECYCLE_FUNCTION_REGRESSION_GATE.md`
>    — *"**Legacy Equivalence·Production Certification 은 Part 4-5-3-1-9**"*
> ③ `DSAR_AUTHORIZATION_FUNCTION_REGRESSION_GATE.md:18`
>    — *"**Legacy Equivalence 최우선** — **기존 정상 사용자 접근을 유지**하면서 과도한 권한·
>      누락 Scope·우회 가능 API 만 제거(§61)"*

---

## §1. 최우선 명령 — 무엇을 지키는 블록인가

> **"기존 정상 사용자 접근을 유지하면서 과도한 권한·누락 Scope·우회 가능 API 만 제거"**
> — 5-1 §58:18

**1-9는 06-A에서 유일하게 "지키는" 블록이다.** 1-1~1-8은 **무엇을 만들지**를 설계했고,
1-9는 **무엇을 부수면 안 되는지**를 고정한다.

**권한 통합의 실패는 두 방향인데 무게가 다르다:**

| 실패 | 결과 |
|---|---|
| **과도한 권한을 못 지움** | 보안 위험 — **나쁘다** |
| **정상 접근을 지워버림** | **고객이 로그인 못 함** — **즉시 장애** |

> **후자가 먼저다.** 보안 강화가 서비스를 멈추면 그 강화는 **롤백되고, 롤백되면 보안도 사라진다.**
> **살아남지 못하는 개선은 개선이 아니다.**

---

## §2. 분류 체계 — 이미 REAL이다 (신설 아님)

5-1 §50/§51이 **실측 file:line 기반 분류를 완료**했다. **1-9는 그것을 재작성하지 않고 정본화**한다.

| 분류 | 의미 | 1-9 규칙 |
|---|---|---|
| **VALIDATED_LEGACY** | 검증된 기존 구현 | 🔴 **재사용 강제**(Golden Rule) |
| **CONSOLIDATION_REQUIRED** | 통합 필요 | **실효 동작 보존 후에만** |
| **KEEP_SEPARATE_WITH_REASON** | 분리 유지 | 사유 필수 |
| **MIGRATION_REQUIRED** | 이관 필요 | **PM 재증명 전 P0 금지** |
| **NOT_APPLICABLE** | 부재 | 🔴 **"있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤 교훈) |

### 2-1. 실측 분류 (5-1 §50 · 발췌)

**VALIDATED_LEGACY (재사용 강제)**: scope 게이트 + **192차 `/api` 별칭 권한상승 차단**
(`index.php:562-575` · **영구 규칙: 신규 게이트도 `/api` 변형 동시 매칭**) · Tenant Isolation
(agency 토큰 **서버바인딩·위조불가** `index.php:97-100`) · `authedTenant`(64) · RLS ·
**action_request IDOR 차단**(208차 P0 · `Alerting.php:545-546/578-582`) ·
channel_credential **AES-256-GCM**(267차) · `no_credentials` 게이트 · Impersonation

**CONSOLIDATION_REQUIRED**: Role **3계통**(team_role · api_key roleRank · admin master/sub) ·
`authedTenant` 64 PEP · Field Masking **3+** · requirePro/requirePlan

**NOT_APPLICABLE(부재)**: 중앙 PDP · Decision 기록 · Policy Version · Obligation · Conflict ·
ABAC Context · Field Access Profile · Break Glass · Access Review · Prod/Sandbox 권한 분리

---

## §3. 🔴 결함 3건 — 분류 자체를 검증했다

**1-9의 임무는 분류를 정본화하는 것이다. 그러려면 분류가 먼저 옳아야 한다.**

### 3-1. ✅ **LEGACY-GAP-01 — `VALIDATED_LEGACY` 인데 검증된 적이 없다** — **289차 해소(분류가 참이 됨)**

> **289차 정정(승인 세션):** **`VALIDATED_LEGACY` 분류가 이제 참이다** — `.githooks/pre-commit` **G15** 배선 +
> **양방향 실증**(위반 stage→exit 1 차단 · 정상→통과 · 저장소 위반 0)으로 **실제 검증이 수행됐다**.
> **"재사용 강제"도 이제 정당하다** — 아무것도 안 하는 파일이 아니라 **실제로 막는 가드**를 재사용하라는 명령이 됐다.
> ⚠️ **단 분류표의 `(275차 인가 회귀 **CI** 가드)` 표기는 여전히 부정확** → **`pre-commit 가드(로컬)`** 로 읽어야 한다(§3-1 하단 정정표).
> ★**이 건이 1-9가 요구한 `is_effective` 필드의 최초 실증 사례다** — `VALIDATED_LEGACY` 라는 분류만으로는
> **"존재 확인"과 "실효 검증"을 구분할 수 없었고**, 두 상태(배선 0 / 배선 1)가 **같은 라벨을 달고 있었다**.

**5-1 §50 분류(발견 시점 — 보존):**

```
| tools/guard_headerless_getjson.mjs (275차 인가 회귀 ~~CI 가드~~ → **pre-commit 가드(로컬)**·**289차 G15 배선**) | VALIDATED_LEGACY(Lint 기반) · **`is_effective=true`(289차부터)** |
규칙: "VALIDATED_LEGACY 는 재사용 강제"
```

**그 가드의 호출처는 0이다.**

> **"VALIDATED"가 거짓이다.** 아무도 검증하지 않았다 — **파일 존재가 검증으로 대체됐다.**
> 그리고 **`VALIDATED_LEGACY`는 "재사용 강제"이므로, 이 분류는
> "아무것도 하지 않는 파일을 반드시 재사용하라"는 명령이 된다.**
>
> **`CI 가드`라는 설명도 사실이 아니다** — CI에 없다.

**★같은 고아 가드가 이제 세 번째 거버넌스 층을 오염시켰다:**

| 층 | 오염 |
|---|---|
| **5-8** Lint | 가드가 실행 안 됨 (호출처 0) |
| **1-8** Golden | **보존 대상**에 등재 → 회귀 검증이 **공허하게 참** |
| **1-9** Legacy | **`VALIDATED_LEGACY`** → **재사용 강제** |

> **하나의 미배선 파일이 세 층에서 "보호가 있다"는 신뢰를 만들어냈다.**
> **이것이 오신뢰의 복리(compounding)다** — 각 층은 앞 층을 근거로 신뢰를 키웠다.

### 3-2. 🔴 **LEGACY-GAP-02 — 5-8이 위임을 떨어뜨렸다 (본 세션의 자기 결함)**

**5-1이 Permission 범위 Legacy Equivalence를 5-8로 위임했다:**

```
DSAR_AUTHORIZATION_DUPLICATE_IMPLEMENTATION_AUDIT.md:10
  "CONSOLIDATION_REQUIRED(★4번째 금지 · 실효 동작 보존 = 5-8 Legacy Equivalence)"
DSAR_AUTHORIZATION_FUNCTION_REGRESSION_GATE.md:18
  "Legacy Equivalence 최우선 ... 전 Certification = 5-8"
```

**그러나 5-8은 Legacy Equivalence를 수행하지 않았다.**

```
grep -c "Legacy"  CANONICAL_..._STATIC_LINT_RUNTIME_GUARD.md      → 0
                  CANONICAL_..._GOLDEN_DATASET_CERTIFICATION.md    → 1   ("다음=1-9")
                  ADR_..._LINT_GUARD_CERTIFICATION.md              → 1   ("다음=1-9")
```

**5-8은 Lint·Guard·Golden·Certification만 다뤘고, 위임받은 Legacy Equivalence를 누락했다.**

> **이것은 본 세션(289차)이 만든 결함이다.** 남의 결함이 아니다.
> 5-8은 자신이 "Permission 8/8 종결"이라 선언했으나 **위임 1건을 이행하지 않은 종결**이었다.
>
> **RP-001과 같은 계열의 실패다** — 그때는 로드맵을 안 봤고, 이번엔 **위임을 안 봤다.**

**조치: 1-9가 06-A 전체 범위이므로 Permission Legacy Equivalence를 흡수한다.**
**5-8을 소급 수정하지 않는다**(무후퇴 · 이력 보존) — **본 문서가 그 위임의 이행처**임을 명시한다.

### 3-3. 🔴 **LEGACY-GAP-03 — stale 값이 4벌로 복제됐다**

**1-8이 설계한 `CorrectionPropagation`의 필요성이 여기서 규모로 실증됐다.**

```
grep -rln "351" docs/segmentation/DSAR_AUTHORIZATION_*.md   → 4
  DSAR_AUTHORIZATION_CRITICAL_GAP_POLICY.md
  DSAR_AUTHORIZATION_DUPLICATE_IMPLEMENTATION_AUDIT.md
  DSAR_AUTHORIZATION_EXISTING_IMPLEMENTATION.md
  DSAR_AUTHORIZATION_FUNCTION_REGRESSION_GATE.md
+ 원본: backend/src/Handlers/UserAuth.php:329 (286차 주석)
```

**5-6이 351→455로 정정했다. 4벌은 그대로 351이다.**

> **정정이 한 곳에만 남으면 정정이 아니다.**
> 다음 사람은 **4:1로 351을 보게 되고, 다수결로 351이 정본이 된다.**
> **틀린 값이 복제 수로 이긴다.**

**실측(방법 명시)**: A=498 · B=467 · C=458. **어느 방법으로도 351보다 100 이상 많다.**

> ### ★289차 ② 정정 — **이 글롭이 6편을 놓쳤다**
>
> 위 `grep -rln "351" docs/segmentation/DSAR_AUTHORIZATION_*.md → 4` 는
> **`CANONICAL_DSAR_AUTHORIZATION_*.md` 6편을 통째로 제외한다**(접두사 `CANONICAL_`).
> 289차 재측정: **351 주장 = 코드 1 + 문서 약 15편**(ADR 5 · CANONICAL 6 포함) → **"4벌"은 과소측정**.
>
> **1-9는 stale 값의 위험을 정확히 진단하면서, 그 위험의 크기를 자기 글롭 때문에 과소평가했다.**
> **`measurement_method` 는 값에만 필요한 게 아니라 "개수 주장"에도 필요하다** — 이 줄이 그 증거다.
>
> **또한 위 실측값(498/467/458)도 이미 낡았다** — 289차 재측정은 **500/466/450 · 호출부 448**.
> **정정값조차 stale 이 된다** → **289차는 값을 고치는 대신 값을 제거하고 측정 명령으로 대체**했다:
> `node tools/measure_authz_surface.mjs` · [측정 SSOT](./AUTHZ_SURFACE_MEASUREMENT_SSOT.md)

---

## §4. 엔티티 정의

### E-01. `LegacyClassification` — §2 정본

`item_id` · `classification` · **`evidence`**(`file:line`) · **`is_effective`**(🔴 §3-1) ·
`validated_by` · **`validated_at`** · `source_doc`.

**🔴 `is_effective` + `validated_by`가 핵심이다.**
**`VALIDATED_LEGACY`라는 이름은 누군가 검증했음을 함의하지만, 누가·언제 검증했는지 필드가 없었다.**
**그래서 검증 없이 `VALIDATED`가 붙었다.**

### E-02. 🔴 `EquivalenceProof` — 통합 전 동등성 증명

**Role 3계통 통합 · PEP 100+ 통합은 06-A 최대 과제이고 최대 위험이다.**

```
규칙: CONSOLIDATION_REQUIRED 항목은
      → 기존 동작의 Golden(1-8) 확보
      → 신 구현이 동일 입력에 동일 출력 증명
      → 그 후에만 교체
```

**증명 없는 통합 = 286차 rank 맵 붕괴의 재현.** 그 사건은 **실제로 일어났고 실측 이력**이다.

### E-03. 🔴 `EquivalenceScope` — **부정 동등성도 포함**

**동등성은 "되던 게 된다"만이 아니다. "안 되던 게 계속 안 된다"도 동등성이다.**

> 통합 후 **막혀야 할 요청이 통과하면** 그것도 동등성 위반이다.
> **1-8 D-6(DENY 우선)과 같은 논리** — ALLOW만 보면 권한 통합의 실패를 못 잡는다.

### E-04~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-04 | `PermanentRule` | **192차 `/api` 별칭 동시 매칭 = 영구 규칙** — 신규 게이트도 준수 |
| E-05 | `EffectiveBehaviorSnapshot` | 실효 동작 스냅샷 — **1-8 Golden 동일 정본** |
| E-06 | `ConsolidationPlan` | 통합 계획 — **4번째 Role Registry 금지** |
| E-07 | `RollbackPlan` | 🔴 **통합은 롤백 가능해야 착수** |
| E-08 | `DeadClassificationDetector` | `is_effective=false` — **5-8 `GuardWiringRule` 동일 정본** |
| E-09 | `DelegationLedger` | 🔴 **위임 추적**(§3-2) — 떨어뜨린 위임 탐지 |
| E-10 | `ValueSingleSource` | **수치 복사 금지** — 1-8 `CorrectionPropagation` 동일 정본 |
| E-11 | `LegacyGapLink` | **1-6 Gap 원장** 연결 |
| E-12 | `ProductionCertification` | 1-9 (2/2) 위임 |

### 4-1. E-09 `DelegationLedger` — §3-2의 구조적 해소

**블록이 후속 블록에 위임한 항목을 원장으로 추적한다.**

```
규칙: 블록 종결 선언 시 → 자신이 위임받은 항목 전수 이행 확인
      미이행 위임 있으면 → "종결" 선언 금지
```

**5-8이 "Permission 8/8 종결"을 선언할 때 이 원장이 있었다면 Legacy 누락이 잡혔다.**
**사람의 기억으로 위임을 추적하면 떨어진다 — 실제로 떨어졌다.**

---

## §5. 비파괴 확인

코드 변경 **0** · **§53 문서 무수정**(351 4벌 · `VALIDATED_LEGACY` 오분류 **둘 다 안 고쳤다**) ·
**5-8 소급 수정 0**(무후퇴 · 이력 보존).

---

## §6. 인계

| ID | 항목 | 등급 |
|---|---|---|
| ~~**MR-1-9-01**~~ | ~~🔴 `guard_headerless_getjson` **분류 정정 + 배선** — 3층 오염 근원~~ → ✅ **289차 CLOSED** — G15 배선 + **4층 전부 정정**(5-8 §3-1 · 1-7 L-2 · 1-8 GOLDEN-GAP-01 · 1-9 LEGACY-GAP-01) | ✅ |
| ~~**MR-1-9-02**~~ | ~~🔴 **351 4벌 정정**(방법 명시 · 값 복사 금지)~~ → ✅ **289차 ② CLOSED** — **값을 고치지 않고 값을 제거**했다: `tools/measure_authz_surface.mjs`(측정기) + [측정 SSOT](./AUTHZ_SURFACE_MEASUREMENT_SSOT.md) 신설 · **발원지(UserAuth.php 주석) + 정본 분류표 3편 + 회귀게이트** 정정 | ✅ |
| **MR-289-02a** | 🟠 잔여 §53·ADR **약 11편의 `351` 인용** → SSOT 포인터 교체(**인용 시 재측정 규칙(SSOT §4)으로 이미 무해화**) | 🟠 |
| **MR-1-9-03** | Role 3계통 · PEP 100+ 통합 — **`EquivalenceProof` 선행 필수** | 🟠 |
| **MR-1-9-04** | `DelegationLedger` 도입 | 🟠 |

**본 세션 수정 0.**
