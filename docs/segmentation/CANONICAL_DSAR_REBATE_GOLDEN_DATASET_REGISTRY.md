# CANONICAL — DSAR/Rebate Golden Dataset Registry

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-8 (1/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**. 스펙 수령 시 본 문서가 양보한다.
>
> **RP-001 준수 — 로드맵 확인 완료**:
> `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7` = "후속 4-5-3-1-2~9 …/Lint/**Golden**/Legacy"
>
> ⚠️ **1-7과 다른 점 — 위임이 없다**: `grep "4-5-3-1-8"` 전수 → **0건**.
> 1-7은 선행 블록이 명시 위임했으나(*"전체 Certification 은 Part 4-5-3-1-7"*),
> **1-8을 지목한 블록은 하나도 없다.** 회귀 게이트들은 **1-9(Legacy)와 5-8**로 위임했다.
> → **1-8의 근거는 로드맵 슬롯뿐이다.** 이를 숨기지 않고 기록한다.

---

## §1. 🔴 Golden 은 두 종류다 — 하나는 불가능하고 하나는 지금 가능하다

**본 블록의 최상위 판단이다.**

| 종류 | 대상 | 가능한가 |
|---|---|---|
| **Rebate Golden** | Rebate 엔진 동작 | ❌ **불가능** — **구현 0**(1-6 재증명: 9/9 grep 0). **테스트할 대상이 없다** |
| **Preservation Golden** | **보존 대상 기존 시스템** | ✅ **지금 가능** — **코드가 실재하고 실행된다** |

> **1-7은 전부 `NOT_READY`였다. 1-8은 다르다.**
> Rebate golden은 1-7과 같은 이유로 불가능하지만, **보존 대상 golden은 오늘 만들 수 있다.**
> **기존 시스템은 지금 운영에서 돌고 있기 때문이다.**

**그리고 일부는 이미 REAL이다** — `npm run e2e` 3계층(`smoke.mjs`/`render.mjs`/`scenarios.mjs` ·
`package.json:4-6` · CI **GATE 5** 배선 `deploy.yml:64`)이 **기존 시스템의 회귀 골든으로 이미 작동 중**이다.

**따라서 1-8의 결론은 "신설"이 아니라 "기존 e2e 골든의 확장"이다**(Golden Rule).

---

## §2. 분모 — 보존 대상 (§53 영속 · 실측)

**1-7과 마찬가지로 분모가 저장소에 있다.** 회귀 게이트 §53 문서 2종이 **보존 대상을 열거**했다.

### 2-1. `DSAR_REBATE_PROGRAM_LIFECYCLE_FUNCTION_REGRESSION_GATE.md` (1-4)

`menu_defaults` · `kr_fee_rule` · `free_coupons` · `catalog_writeback_job` ·
`auto_campaign`(`/v423/auto-campaign/*`) · `action_request`(`/v410/action_requests`) ·
EmailMarketing·KakaoChannel 예약 · Attribution backfill · `migrate.php`·`schema_migrations` ·
**ensureTables 73 핸들러** · **audit_log 12** · `baseline.json` · `GENIE_ENV`·`Db::envLabel()`

### 2-2. `DSAR_AUTHORIZATION_FUNCTION_REGRESSION_GATE.md` (5-1)

TeamPermissions(ACTIONS 8·DATA_SCOPES 9·acl_permission·team_role) · api_key RBAC(roleRank·
scopes_json·key_hash·expires_at·**192차 `/api` 별칭 권한상승 차단**) · PlanPolicy ·
**requirePro/requirePlan(호출부 351)** · index.php 미들웨어 + **bypass 목록** · `authedTenant`(64) ·
`tenant_id=?` RLS · action_request IDOR 차단(208차) · requireMasterAdmin2/requireSubAdminMenu(286차) ·
EnterpriseAuth(SAML/OIDC/SCIM) · UserAuth 세션 · MFA · OAuth.php · channel_credential AES-256-GCM(267차) ·
`no_credentials` 게이트 · **`tools/guard_headerless_getjson.mjs`(275차)** · audit_log 12 ·
Impersonation(UserAdmin)

---

## §3. 🔴 결함 3건 — 보존 목록 자체가 검증됐다

**1-8의 임무는 보존 목록을 골든으로 만드는 것이다. 그러려면 목록이 먼저 옳아야 한다.**

### 3-1. ✅ **GOLDEN-GAP-01 — 보존 대상에 팬텀이 있다** — **289차 해소(팬텀→실 보존대상)**

> **289차 정정(승인 세션):** 아래 결함은 **발견 시점(1-8)에 정확했고, 289차에 근본 해소됐다.**
> `guard_headerless_getjson` 이 `.githooks/pre-commit` **G15** 로 **실제 실행**되기 시작했으므로,
> **이제 이 항목은 팬텀이 아니라 진짜 보존 대상**이다 — **회귀 0 검증이 공허하게 참이 아니라 실제로 참**이 됐다.
> **해소 방식이 중요하다**: 보존 목록에서 **빼서** 모순을 없앤 게 아니라, **가드를 실행시켜서** 목록을 옳게 만들었다
> (목록에서 뺐다면 275차 회귀 클래스가 무방비로 남는다 — **무후퇴 원칙**).
> ⚠️ **잔여**: G15 는 **로컬 pre-commit**(`--no-verify` 우회 · 새 클론 미실행) → **보존은 실효하나 강제는 아직 부분적**.

**5-1 회귀 게이트의 "보존 대상(회귀 0 검증 대상)"에 `tools/guard_headerless_getjson.mjs`(275차)가 들어있다.**
**(이하 발견 시점 기록 — 보존)**

```
보존 목록 내 존재      → grep 히트 (문서에 2회)
그 가드의 호출처       → .github/ .githooks/ package.json 전수 grep → 0
```

**모순이다.** 회귀 게이트는 **"이 가드가 회귀하지 않음을 검증하겠다"**고 선언했는데,
**그 가드는 275차 이래 한 번도 실행된 적이 없다.**

> **실행되지 않는 것은 회귀할 수 없다.** 회귀 0 검증은 **공허하게 참**이다.
> 골든 케이스를 만들어도 **항상 통과한다** — 보호가 없기 때문에 깨질 것도 없다.
>
> **이것이 골든 데이터셋의 최악 실패 모드다:** 초록인데 아무것도 지키지 않는다.
> **5-8의 고아 가드 발견이 여기서 두 번째 피해를 드러낸다** — 가드가 안 도는 것에 더해,
> **회귀 게이트가 그 가드를 보호막으로 계산에 넣고 있었다.**

**조치: 보존 목록에서 제거가 아니라 — 배선(MR-1-7-05)이 선행돼야 골든 케이스가 의미를 갖는다.**
**목록에서 지우면 275차 의도가 사라진다**(무후퇴 위반).

### 3-2. 🔴 **GOLDEN-GAP-02 — 회귀 고위험 실측이 stale (≈30% 과소)**

5-1 회귀 게이트는 **"★회귀 고위험 지점(실측)"**으로 **`requirePro` 호출부 351개**를 적었다.

**출처 추적 결과 — 그것은 실측이 아니라 코드 주석이다:**

```
backend/src/Handlers/UserAuth.php:329
  // [현 차수] ★'유료(starter+)' 게이트로 유지 — 기존 351개 호출부의 실효 동작(...)을 보존한다.
```

**286차 시점의 주석값을 289차 회귀 게이트가 "실측"으로 옮겨 적었다.**

**289차 실측(방법 명시):**

| 방법 | 값 |
|---|---|
| A — 언급 라인(함수정의 제외) | **498** |
| B — 호출 구문 `requirePro(`/`requirePlan(` | **467** |
| C — B 에서 주석 라인 제외 | **458** |
| (5-6 측정 · **방법 미기록**) | 455 |
| **5-1 문서 주장** | **351** |

**어느 방법으로 재도 351보다 100개 이상 많다.** 회귀 범위를 351로 잡으면 **약 30%를 빠뜨린다.**

**이것은 5-6이 이미 잡은 것과 같은 오류의 재발이다**(5-6: 주석 351 → 실측 455).
**정정이 5-1 회귀 게이트 문서에는 반영되지 않았다** — **정정의 전파 실패**.

### 3-3. 🔴 **GOLDEN-GAP-03 — 방법 없는 수치는 골든이 아니다**

**§3-2의 표가 스스로를 증명한다: 정직한 grep 3개가 세 숫자(498·467·458)를 낸다.**

**세 값 모두 맞다.** 세는 대상이 다를 뿐이다.
**method를 안 적으면 455와 498은 모순으로 보이지만, 실은 둘 다 옳을 수 있다.**

> **골든의 정의는 "재현 가능"이다.** 재현 불가능한 기준선은 **골든이 아니라 스냅샷**이다.
> 다음 세션이 같은 숫자를 못 내면 **"회귀"인지 "다르게 셈"인지 구분할 수 없고**,
> 그러면 **골든이 경보가 아니라 소음이 된다** — 그리고 소음은 결국 꺼진다.

**1-6 E-03이 `method`를 필수 필드로 둔 이유가 여기서 실증됐다.**

---

## §4. 엔티티 정의

### E-01. `GoldenCase`

`case_id` · `kind`(**`REBATE` / `PRESERVATION`** — §1) · `input` · `expected` · `source_block` ·
**`measurement_method`**(🔴 필수 · §3-3) · `evidence` · `citation`.

### E-02. 🔴 `PreservationTarget` — 분모 정본

| 필드 | 설명 |
|---|---|
| `target_id` | 보존 대상 |
| `source_doc` | §53 회귀 게이트 문서 |
| **`is_effective`** | 🔴 **실제로 동작하는가** — `false` = **팬텀 보존 대상**(§3-1) |
| `covered_by` | 이를 검증하는 골든 케이스 |

**`is_effective`가 없으면 GOLDEN-GAP-01이 재발한다.** 목록에 있다는 것이 **보호를 뜻하지 않는다.**

### E-03. 🔴 `MeasurementMethod` — 재현 명세

`method_id` · **`command`**(🔴 **재실행 가능한 명령 원문**) · `scope`(경로) · `exclusions` · `measured_value`.

**규칙: 명령 없이 기록된 수치는 골든 기준선으로 채택 금지.**
**"351"은 명령이 없어서 재현·반증이 불가능했고, 그래서 3개 차수를 살아남았다.**

### E-04. `GoldenBaseline` · E-05. `BaselineDrift`

기준선 + 이탈 탐지. **`baseline.json`(sacred_sha·267차) 패턴의 확장** — 신설 아님.

### E-06~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-06 | `GoldenRunner` | **신설 금지** — `e2e/scenarios.mjs` 확장(§1) |
| E-07 | `GoldenCoverage` | 보존 대상 대비 케이스 커버리지 |
| E-08 | `PhantomTargetDetector` | `is_effective=false` 탐지 — **5-8 `GuardWiringRule` 동일 정본** |
| E-09 | `StaleMeasurement` | 주석값·구전값 탐지(§3-2) |
| E-10 | `CorrectionPropagation` | 🔴 **정정 전파** — 5-6이 고친 351을 5-1 문서가 몰랐다 |
| E-11 | `GoldenGapLink` | 미달 → **1-6 Gap 원장 등재**(원장 신설 금지) |
| E-12 | `GoldenCertification` | 1-8 (2/2) 위임 |

### 4-1. E-10 `CorrectionPropagation` 이 필요한 이유

**5-6은 351이 틀렸음을 이미 발견했다. 그런데 5-1의 §53 문서는 여전히 351이다.**
**정정이 한 문서에만 남고 전파되지 않았다.**

> **틀린 값이 여러 문서에 복사돼 있으면, 한 곳을 고쳐도 나머지가 계속 살아있다.**
> 그리고 **다음 사람은 어느 쪽이 정본인지 모른다.**
> → **수치는 `MeasurementMethod`를 참조로 두고, 문서에 값을 복사하지 않는다.**

---

## §5. 비파괴 확인

코드 변경 **0** · **§53 문서 무수정**(351도 고치지 않았다 — **문서 수정도 본 세션 범위 밖**) ·
골든 케이스 작성 **0** · 러너 신설 **0**.

---

## §6. 인계

| ID | 항목 | 등급 |
|---|---|---|
| **MR-1-8-01** | 🔴 **팬텀 보존 대상** — guard 배선(MR-1-7-05) **선행 필요** | 🔴 |
| **MR-1-8-02** | 🔴 **5-1 §53 회귀게이트 `351` → 실측 정정**(방법 명시 필수) | 🔴 |
| **MR-1-8-03** | `MeasurementMethod` 도입 — 명령 없는 수치 채택 금지 | 🟠 |
| **MR-1-8-04** | Preservation Golden 케이스 작성(**지금 가능**) | 🟠 |
| **MR-1-8-05** | Rebate Golden | 🟢 **불가**(구현 0) — Rebate 도입 시 |

**본 세션 수정 0.**
