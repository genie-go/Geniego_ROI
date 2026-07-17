# CANONICAL — DSAR/Rebate Lint Rule Registry (전 블록 통합 정본)

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-7 (1/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**. 스펙 수령 시 본 문서가 양보한다.
>
> **RP-001 준수 — 로드맵 확인 완료 (추정 아님)**:
> ① `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7` = "후속 4-5-3-1-2~9 …/**Lint**/Golden/Legacy"
> ② **선행 블록이 1-7을 명시 위임**: `DSAR_REBATE_PROGRAM_LIFECYCLE_STATIC_LINT.md`
> — *"최소 Static Lint (20) — **전체 Certification 은 Part 4-5-3-1-7**"* · *"전체 Certification = **Part 4-5-3-1-7**"*
>
> **5-8과의 범위 중복 해소**: **5-8 = Permission(1-5) 한정** · **1-7 = 06-A 전 블록 통합·인증**.
> 근거 = 각 블록이 **자체 §53 Lint 문서**를 산출했고(1-4·5-1), 그 문서들이 **1-7을 통합점으로 지목**.

---

## §1. 목적

각 블록은 **자기 Lint 규칙**을 계약했다. 흩어져 있으면 **어느 규칙이 있는지 아무도 모른다.**
1-7은 **전 블록 규칙을 하나의 정본으로 통합**한다.

**통합의 목적은 개수를 세는 것이 아니라 "무엇이 없는지"를 드러내는 것이다.**

---

## §2. 통합 레지스트리 실측

### 2-1. 영속된 규칙 (§53 문서 기준)

| 블록 | 문서 | Static Lint | Runtime Guard |
|---|---|---|---|
| **1-4 Lifecycle** | `DSAR_REBATE_PROGRAM_LIFECYCLE_STATIC_LINT.md`(§44) · `..._RUNTIME_GUARDS.md`(§45) | **20** | **21** |
| **5-1 Authorization** | `DSAR_AUTHORIZATION_FOUNDATION_STATIC_LINT.md`(§44) · `..._RUNTIME_GUARDS.md`(§45) | **17** | **23** |
| **계** | **4 문서** | **37** | **44** |

**총 81 규칙 계약 · 구현 0.**

### 2-2. 🔴 **LINT-GAP-01 — 9블록 중 2개만 Lint를 영속했다**

**전수 확인:**

```
ls docs/segmentation/DSAR_*.md | grep -iE "static_lint|runtime_guard"  → 4
  = LIFECYCLE(1-4) 2종 + AUTHORIZATION_FOUNDATION(5-1) 2종
```

| 블록 | §53 Lint 영속 |
|---|---|
| 1-1 Master/Scope | ❌ **0** |
| 1-2 Type | ❌ **0** |
| 1-3 Funding | ❌ **0** |
| **1-4 Lifecycle** | ✅ 20 + 21 |
| **1-5 Permission → 5-1** | ✅ 17 + 23 |
| 1-5 Permission → **5-2~5-7** | ❌ **0** |
| 1-5 Permission → **5-8** | △ **Canonical 형식**(§2-3) |
| **R1~R5** 선행설계 | ❌ **0** |
| 1-6 Coverage/Gap | ❌ **0** |

**의미: Rebate 도메인의 Lint 계약은 Lifecycle 한 축에만 존재한다.**
Master/Scope·Type·Funding — **금전 계약의 근간 3블록에 Lint 규칙이 하나도 없다.**

> **이것이 1-7의 최대 발견이다.** 규칙 81개가 "많다"고 읽으면 안 된다.
> **81개는 2개 블록의 것이고, 7개 블록은 0이다.**

### 2-3. 5-8 규칙은 형식이 다르다 (`KEEP_SEPARATE` 아님 — **정규화 필요**)

5-8은 §53이 아니라 **Canonical 형식**(`CANONICAL_DSAR_AUTHORIZATION_STATIC_LINT_RUNTIME_GUARD.md`
E-01~E-12)으로 규칙을 냈다: `BypassListIntegrityRule`(BL-1~4) · `PdpBypassRule`(PD-1~2) ·
`SodToxicCombinationRule` · `PlanPolicyParityRule` · **`GuardWiringRule`** 등.

**내용은 유효하나 형식이 §53 레지스트리와 다르다** → **1-7 레지스트리로 정규화 편입 대상**.
**중복 생성 금지** — 5-8 규칙을 다시 쓰지 않고 **참조**한다.

---

## §3. 엔티티 정의

### E-01. `LintRuleRegistryEntry` — 통합 규칙 1건

| 필드 | 설명 |
|---|---|
| `rule_id` | **전역 유일** — `LINT-{BLOCK}-{NNN}` |
| `source_block` | 1-1~1-9 · R1~R5 |
| `source_doc` | 🔴 **영속 문서 경로**(1-6 `source_persisted` 원칙) |
| `kind` | `STATIC_LINT` / `RUNTIME_GUARD` |
| `severity` | `BLOCK` / `WARN` / `INFO` (5-8 Ratchet) |
| `impl_status` | **`CONTRACT_ONLY` / `IMPLEMENTED` / `WIRED`** |
| `target` | 검사 대상 |

**🔴 `impl_status`가 3단계인 이유 — 5-8의 고아 가드 교훈이다.**

> `IMPLEMENTED`(코드 존재)와 `WIRED`(실제 실행)를 **한 상태로 합치면
> `guard_headerless_getjson` 사고가 그대로 재현**된다. 파일이 있어도 **호출처가 0이면 실효 0**이다.
> **"구현됨"은 "동작함"이 아니다.**

**현재 81 규칙 전부 `CONTRACT_ONLY`.**

### E-02. 🔴 `LintRuleDeduplication` — 중복 규칙 통합

**1-4와 5-1이 독립 작성했으므로 겹칠 수 있다.** 예: "Evidence 없는 변경 차단"은 양쪽에 있을 법하다.

**규칙: 동일 검사를 두 rule_id로 두지 않는다.** 중복 = **어느 쪽이 정본인지 모르는 상태**
(이 저장소가 반복해 겪은 실패). → **통합 시 `superseded_by` 기록, 삭제 아님**(무후퇴).

**본 세션은 81 규칙의 문면 대조를 수행하지 않았다** — 중복 여부는 **`UNVERIFIED`**로 남긴다.
**"중복 없음"이라 보고하지 않는다.**

### E-03. `LintRuleCoverageByBlock` — §2-2 정본

블록별 규칙 수. **0인 블록을 숨기지 않는다.**

### E-04. `LintRuleReuseMapping` — 현행 게이트 매핑 (Golden Rule)

1-4 문서가 이미 식별한 **재사용 대상**을 정본화한다:

```
.githooks/baseline.json sacred SHA(267차) · CHANGE_GATE 5중 게이트
· npm run e2e smoke(266차) · route check · php -l
```

**+ 5-8 실측 추가**: CI **GATE 1~5**(`deploy.yml:45/48/53/59/64`) · security-scan(npm audit·CodeQL) ·
pre-commit **B1~B4** · `guard_channel_writeback`(`pre-commit:175`).

**신규 러너 금지** — 기존 GATE 편입.

### E-05~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-05 | `LintRuleOwner` | 규칙 담당 블록 |
| E-06 | `LintRuleEvidence` | 규칙 근거(`file:line`) |
| E-07 | `LintRuleRatchet` | 5-8 R0~R3 — **동일 정본, 재정의 금지** |
| E-08 | `LintRuleSuppression` | 5-8 `LintSuppression` **동일 정본** — 만료·사유·승인자 필수 |
| E-09 | `LintRuleConflict` | 규칙 간 모순(A는 요구·B는 금지) |
| E-10 | `LintRuleVersion` | 규칙 버전 — 1-4 Versioning 정본 준수 |
| E-11 | `LintRuleGap` | 규칙 없는 블록 — **1-6 GapEntry 로 등재**(중복 원장 금지) |
| E-12 | `LintRuleCertification` | 1-7 (2/2) 로 위임 |

---

## §4. 1-6 대비 — **여기서는 분모가 있다**

1-6은 **§53 요구 목록이 저장소에 없어 커버리지 계산 불가**였다(COV-GAP-01).

**Lint는 다르다.** 1-4·5-1이 규칙을 **§53 문서로 저장소에 영속**했으므로
**분모(81)를 코드가 아닌 저장소에서 도출할 수 있다.**

> **이 대조가 1-6 D-3의 실증이다.** 같은 EPIC 안에서
> **규칙을 문서로 남긴 블록은 인증 가능하고, 남기지 않은 블록은 인증 불가능하다.**
> 차이는 능력이 아니라 **영속 여부**다.

**단 §2-2가 그 대가를 보여준다** — 7개 블록은 영속하지 않았고, **그 블록들은 1-7이 인증할 수 없다.**

---

## §5. 비파괴 확인

코드 변경 **0** · 기존 §53 문서 **무수정** · 규칙 **재작성 0**(참조만) · 신규 러너 **0**.

---

## §6. 인계

| ID | 항목 | 등급 |
|---|---|---|
| **MR-1-7-01** | 1-1/1-2/1-3 **Lint 계약 부재** — Master/Scope·Type·Funding | 🔴 |
| **MR-1-7-02** | 5-8 Canonical 규칙 **§53 정규화 편입** | 🟠 |
| **MR-1-7-03** | 81 규칙 **중복 대조**(E-02) | 🟠 `UNVERIFIED` |
| **MR-1-7-04** | 81 규칙 **구현 0 → `CONTRACT_ONLY`** | 🟢 **의도됨**(Rebate 도입 시 승인 세션) |

**본 세션 수정 0.**
