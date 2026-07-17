# CANONICAL — DSAR/Rebate Authorization Static Lint & Runtime Guard Governance

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-5-8 (1/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**
> 본 문서는 사용자로부터 Part 5-8 스펙을 **받지 않은 상태**에서, 5-1~5-7 산출물과
> 현행 코드 실측을 입력으로 **자율 판단**하여 작성했다. 스펙 수령 시 **본 문서가 양보**한다.
>
> 입력: 5-1~5-7 누적 Lint/Guard 요구 · 현행 CI/hook 실측 · 누적 관찰 10건 · RP-001

---

## §1. 목적과 Golden Rule 적용

5-1~5-7은 **권한 규칙**을 설계했다. 규칙은 **강제 장치가 없으면 문서일 뿐이다.**
5-8은 그 규칙을 **자동 차단**으로 바꾸는 마지막 블록이다.

**핵심 판정 — 신설이 아니라 확장이다.**

이 저장소에는 이미 **다층 게이트 체계가 REAL**로 존재한다(§2). 따라서 Golden Rule
(**Replace가 아니라 Extend**)에 의해 5-8은 **새 CI 파이프라인·새 가드 러너를 만들지 않는다.**
**기존 GATE에 검사 항목을 추가**한다.

> 새 파이프라인을 만들면 게이트가 두 벌이 되고, 두 벌이 되는 순간
> **어느 쪽이 정본인지 아무도 모르게 된다.** 이는 이 저장소가 288차에 확인한
> 가짜녹색(fake-green) systemic 문제의 재발 경로다.

---

## §2. 현행 게이트 실측 (REAL — 코드 근거)

### 2-1. CI 파이프라인 — `.github/workflows/deploy.yml`

| 게이트 | 검사 | 실행 | 근거 |
|---|---|---|---|
| **GATE 1** | 팬텀 정적자산 참조 | `node tools/check_static_refs.mjs` | `deploy.yml:45-46` |
| **GATE 2** | 라우트 등록 정합 + 백엔드 PHP 구문 | `check_routes_registered.mjs` + `php -l` | `deploy.yml:48` |
| **GATE 3** | rules-of-hooks + no-undef (**런타임 ReferenceError 차단**) | eslint | `deploy.yml:53` |
| **GATE 4** | 프로덕션 빌드 | `vite build` | `deploy.yml:59` |
| **GATE 5** | **E2E 스모크 (데모 대상 · 런타임 500/계약 회귀)** | `tools/e2e/*` | `deploy.yml:64` |
| PHASE 1 | EN 로케일 존재 검증 | node | `deploy.yml:92` |
| PHASE 2 | Production Build | npm | `deploy.yml:95` |

**GATE 3·GATE 5는 이 설계에 특히 중요하다.** GATE 3은 280차에 화이트스크린(런타임
ReferenceError)을 CI에서 잡기 위해 도입됐고, GATE 5는 266차 E2E 3계층
(`smoke.mjs` / `render.mjs` / `scenarios.mjs` — `package.json:4-6`)으로 **런타임 500과
계약 회귀**를 잡는다. 즉 **"정적 통과인데 런타임 사망"을 이미 방어하는 뼈대가 있다.**

### 2-2. 보조 CI — `.github/workflows/security-scan.yml`

- `npm audit --audit-level=high` — repo root(`:51`) + `frontend/`(`:56`)
- CodeQL (workflow명 `Security Scan (deps + CodeQL)`)

### 2-3. pre-commit — `.githooks/pre-commit` (154차 bank-grade safety gate)

| 게이트 | 검사 | 근거 |
|---|---|---|
| **B1** | `.bak*` 스테이징 거부 | `pre-commit:23` |
| **B2** | `_quarantine/` 경로 스테이징 거부 | 153차 정책 |
| **B3** | `NEXT_SESSION.md` 크기 범위(1KB~500KB) | 크기 이상 = 손상 탐지 |
| **B4** | **secret-shaped 라인** 스테이징 차단 | 자격증명 유출 방지 |
| — | `guard_channel_writeback.mjs` 실행 | **`pre-commit:175`** |

**baseline.json**(`.githooks/baseline.json`): `version` · `updated` · **`sacred_sha`** ·
`ko_leaf_count` · `leaf_tolerance_pct` — 267차. i18n 정본 훼손을 SHA로 고정한다.

### 2-4. 판정

**게이트 뼈대는 REAL이고 강력하다.** 5-8이 할 일은 **이 뼈대에 권한 검사를 태우는 것**이다.

---

## §3. 결함 — 실측으로 증명된 3건

### 3-1. 🔴 **GUARD-GAP-01 — `guard_headerless_getjson.mjs` 호출처 0 (실효 0)**

**증명(부재증명 수행):**

```
tools/guard_headerless_getjson.mjs          ← 파일 실재 (275차)
grep "guard_headerless_getjson"
  .github/ .githooks/ package.json tools/   → 자기 파일 외 히트 0
```

**대조군이 결정적이다.** 같은 `tools/`의 `guard_channel_writeback.mjs`는
**`.githooks/pre-commit:175`에 배선돼 있다.** 즉 배선은 가능했고, 실제로 다른 가드는
배선됐는데, **이것만 안 됐다.**

**의미:** 275차에 "가드를 만들었다"고 기록됐고 파일은 실재하나,
**단 한 번도 자동 실행되지 않는다.** headerless getJson 회귀는 **지금 무방비다.**

> 이것은 **가드 자신이 가짜녹색**인 사례다. 파일 존재를 배선 증거로 오독하면
> "가드가 지켜준다"고 믿으면서 실제로는 아무것도 막지 못한다.
> **본 세션의 인계서도 이 가드를 "REAL"로 기록**하고 있었다 — 파일 실재는 맞으나
> **배선 여부를 검증하지 않은 서술**이었다. 5-8은 이를 정정한다.

**조치 등급:** 배선은 **코드변경**이므로 본 세션 범위 밖 → **MIGRATION_REQUIRED**로 인계.
**단 이 건은 "설계 판단"이 아니라 "1줄 배선"이므로 난이도가 아니라 승인만 필요하다.**

### 3-2. 🟠 **GUARD-GAP-02 — pre-commit은 강제가 아니다**

**증명:**

```
grep "hooksPath|pre-commit" .github/workflows/   → 0   (CI에서 미실행 확정)
git config core.hooksPath                         → .githooks  (이 클론은 설정 REAL)
pre-commit:4  "Bypass: git commit --no-verify (requires N-145-G explicit approval)"
```

**세 겹의 구멍:**
1. **CI에서 안 돈다** — hook은 로컬 git 이벤트에만 걸린다.
2. **클론별 opt-in** — `core.hooksPath`는 **저장소가 아니라 로컬 config**다.
   **새 클론·새 개발자·CI runner는 설정 전까지 B1~B4가 전부 미실행**이다.
3. **`--no-verify`로 우회 가능** — 문서에 명시된 정식 우회로다.

**의미:** B4(secret-shaped 차단)를 포함한 **bank-grade 게이트가 실제로는 "협조하는
개발자에게만" 작동**한다. 자격증명 유출 방지가 opt-in에 걸려 있다.

**설계 판단:** hook을 없애자는 게 **아니다**. hook은 **빠른 피드백(수초)**이라는 고유 가치가
있다. 올바른 구조는 **hook과 CI의 이중화**다 — hook은 편의, **CI가 강제**.
따라서 **B4 등 보안 필수 게이트는 CI GATE로 승격**해야 한다(§5-2).

### 3-3. 🟠 **GUARD-GAP-03 — 권한(Authorization) Lint/Guard는 0**

GATE 1~5·B1~B4 **어디에도 권한 관련 검사가 없다.** 즉 5-1~5-7이 설계한 규칙 —
deny-by-default, bypass list 무결성, SoD toxic combination, PDP 우회 금지 — 을
**어기는 커밋을 아무도 막지 못한다.**

**가장 위험한 구체 사례:** `public/index.php`의 **bypass list**(143 조건 / 667 lines)에
경로 한 줄만 추가하면 **그 엔드포인트는 인증 없이 공개된다.** 현재 이를 검사하는 게이트는 없다.
279차의 **무인증 db_restore**가 정확히 이 경로로 발생했다.

---

## §4. 엔티티 정의 (Static Lint 영역)

### E-01. `AuthzLintRule` — 권한 정적 검사 규칙

| 필드 | 타입 | 설명 |
|---|---|---|
| `rule_id` | string | `AUTHZ-L-001` 형식 |
| `severity` | enum | `BLOCK` / `WARN` / `INFO` |
| `target` | enum | `bypass_list` / `route` / `handler` / `frontend_policy` |
| `rationale_ref` | string | 근거 블록(5-1~5-7) 참조 |
| `false_positive_policy` | text | FP 발생 시 처리 — **억제는 등재 후에만** |

**`BLOCK`은 CI 실패를 의미한다.** `WARN`은 통과시키되 리포트한다.

**설계 판단 — 처음부터 BLOCK을 쓰지 않는다.** 신규 Lint를 즉시 BLOCK으로 켜면 **기존
위반(레거시)이 전부 터져 파이프라인이 마비**되고, 그러면 **개발자는 Lint를 끈다.**
그것이 이 저장소가 겪어온 실패 패턴이다. 따라서 **Ratchet 방식**(§6)을 채택한다.

### E-02. `BypassListIntegrityRule` — 🔴 최우선

| 검사 | 내용 |
|---|---|
| **BL-1** | `index.php` bypass 조건 **개수 변동 탐지** — baseline 143 대비 증가 시 `BLOCK` |
| **BL-2** | 추가된 경로에 **근거 주석 필수**(왜 공개인가) |
| **BL-3** | **`/api` 별칭 동반 검사** — 192차 P0(`/api` 별칭 권한상승) 재발 방지 |
| **BL-4** | 쓰기 메서드(POST/PUT/PATCH/DELETE) 경로의 bypass 추가는 **무조건 `BLOCK`** |

**BL-1의 baseline 방식은 `.githooks/baseline.json`의 `sacred_sha` 패턴을 그대로 차용한다**
— 이미 이 저장소가 i18n 정본 보호에 쓰는 검증된 패턴이다(**Extend**).

**BL-4의 근거:** 읽기 공개는 정보 노출이지만, **쓰기 공개는 시스템 장악**이다.
279차 db_restore가 쓰기였다. **대칭적으로 다룰 수 없다.**

### E-03. `PdpBypassRule` — PDP 우회 탐지

5-6이 설계한 PDP/PEP 구조에서, **신규 라우트가 PEP를 거치지 않으면** 권한 설계 전체가
무효가 된다.

| 검사 | 내용 |
|---|---|
| **PD-1** | `routes.php` 신규 라우트가 **PEP Registry 미등재** 시 `BLOCK` |
| **PD-2** | 핸들러가 `authedTenant` 미호출 + tenant 데이터 접근 시 `WARN` |

**PD-1은 GATE 2(`check_routes_registered.mjs`)의 확장이다** — 이미 라우트 등록 정합을
검사하는 도구가 있으므로, **"등록됐는가"에 "권한이 정의됐는가"를 더한다.**

### E-04. `SodToxicCombinationRule` — 정적 SoD 검사

5-4의 toxic combination을 **롤 정의 시점**에 검사한다.
런타임 검사(5-4)는 **이미 부여된 뒤**를 막고, 정적 검사는 **부여 자체**를 막는다.

### E-05~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-05 | `PlanPolicyParityRule` | `PlanPolicy.php:14`가 **주석으로만 요구**하는 프론트/백 정합(`MENU_MIN_PLAN`·`PLAN_TIER_RANK`)을 **자동 검사로 승격** |
| E-06 | `AuthzGuardRunner` | **신규 러너 금지** — GATE 2/3 스텝에 편입 |
| E-07 | `LintBaseline` | 기존 위반 동결(Ratchet 기준선) |
| E-08 | `LintSuppression` | 억제는 **만료일·사유·승인자 필수**, 무기한 금지 |
| E-09 | `GuardWiringRule` | **가드 자신의 배선 검사** — GUARD-GAP-01 재발 방지(§5-1) |
| E-10 | `RuntimeGuardHook` | 5-6 Runtime Enforcement와 동일 정본 — **중복 금지** |
| E-11 | `LintCoverageReport` | 5-1~5-7 규칙 중 **Lint로 강제되는 비율** 측정 |
| E-12 | `LintExemptionReview` | 억제 목록의 정기 재검토 — 5-7 Access Review에 편입 |

---

## §5. 재발 방지 — 결함 3건의 구조적 해소

### 5-1. **E-09 `GuardWiringRule` — 메타 가드**

GUARD-GAP-01의 교훈은 "가드를 하나 더 만들자"가 **아니다**. 교훈은
**"가드가 배선됐는지 아무도 검사하지 않았다"**이다.

```
규칙: tools/guard_*.mjs 파일이 존재하면
      → .github/workflows/* 또는 .githooks/* 에서 반드시 호출돼야 한다
      → 호출처 0 이면 BLOCK ("고아 가드")
```

**이 규칙 하나가 GUARD-GAP-01 유형을 영구히 차단한다.**
현재 이 규칙을 켜면 **`guard_headerless_getjson.mjs`가 즉시 걸린다** — 의도된 동작이다.

### 5-2. **B4의 CI 승격**

secret-shaped 라인 차단은 **opt-in이어서는 안 되는 종류**다.
pre-commit B4를 **그대로 두고**(빠른 피드백 유지), **동일 검사를 CI GATE로 복제**한다.
검사 로직은 **단일 스크립트로 공유**한다 — 두 벌로 갈라지면 정본이 사라진다.

### 5-3. **RP-001 재발 방지 체계와의 연결**

RP-001(로드맵 미확인 후 파트 번호 임의 생성)은 **문서 프로세스 결함**이라 Lint로 못 막는다.
대신 **`docs/pm/REPEAT_PROBLEM_HISTORY.md` 확인을 파트 착수 전 필수 단계로 고정**한다.
이는 도구가 아니라 **절차** 통제다 — 정직하게 그렇게 기록한다.

> **모든 것을 자동화로 막을 수 있다고 주장하지 않는다.** 절차 결함은 절차로 막는다.

---

## §6. Ratchet 도입 전략 (BLOCK 즉시 적용 금지)

| 단계 | 내용 | 종료 조건 |
|---|---|---|
| **R0** | Lint 작성 + `INFO` — 위반 **개수만 측정** | 현황 파악 |
| **R1** | `LintBaseline` 동결 — 기존 위반 N건 기록 | baseline 커밋 |
| **R2** | **`BLOCK` 켜되 baseline 초과분만** — **신규 위반 0** | 신규 유입 차단 |
| **R3** | baseline 감축 — 승인 세션에서 기존 위반 해소 | N → 0 |

**R2가 핵심이다.** 기존 위반을 방치하는 게 아니라, **출혈을 먼저 멈춘다.**
전부 고칠 때까지 기다리면 그동안 위반이 더 쌓인다.

---

## §7. 비파괴 확인

- 코드 변경: **0**
- CI/hook 변경: **0** — 본 문서는 **설계 명세**다
- 기존 GATE 1~5 / B1~B4: **무수정 · 무후퇴**
- 신규 파이프라인/러너: **0** (Golden Rule 준수)

---

## §8. 인계 (MIGRATION_REQUIRED — 승인 세션 필요)

| ID | 항목 | 등급 | 비고 |
|---|---|---|---|
| **MR-5-8-01** | `guard_headerless_getjson.mjs` **배선**(pre-commit 또는 CI) | 🔴 | **1줄** · 판단 아닌 승인 문제 |
| **MR-5-8-02** | B4 secret 검사 **CI 승격** | 🟠 | 로직 공유 필수 |
| **MR-5-8-03** | `BypassListIntegrityRule` 구현 | 🔴 | BL-4부터 |
| **MR-5-8-04** | `GuardWiringRule` 구현 | 🟠 | MR-5-8-01 자동 검출 |

**본 세션은 어느 것도 실행하지 않았다.** 전부 코드변경이므로 별도 승인 세션 대상이다.
