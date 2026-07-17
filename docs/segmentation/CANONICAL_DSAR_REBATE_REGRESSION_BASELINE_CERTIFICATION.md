# CANONICAL — DSAR/Rebate Regression Baseline & Golden Certification Governance

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-8 (2/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**. 스펙 수령 시 본 문서가 양보한다.
> ⚠️ **1-8은 선행 블록의 위임이 없다**(`grep "4-5-3-1-8"` → 0) — 근거는 로드맵 슬롯뿐.

---

## §1. 판정 — 1-7과 다르게 **분리 판정**한다

| 대상 | 판정 | 근거 |
|---|---|---|
| **Rebate Golden** | 🔴 **NOT_APPLICABLE** | 구현 0 — **테스트할 대상이 없다** |
| **Preservation Golden** | 🟠 **PARTIAL** | **e2e 3계층 REAL**(GATE 5 배선) — 그러나 보존 대상 커버리지 미측정 |
| **보존 목록 무결성** | 🔴 **FAILED** | **팬텀 1건 + stale 수치 1건**(1/2 §3) |

**1-7은 전부 `NOT_READY`였다. 1-8을 같은 한 마디로 덮으면 두 가지를 놓친다:**

1. **Preservation Golden은 이미 부분적으로 REAL이다** — `npm run e2e`(266차)가 CI GATE 5로 돌고 있다.
   이를 "없음"으로 보고하면 **281차·266차의 실제 자산을 부정**하는 것이고 **무후퇴 원칙 위반**이다.
2. **보존 목록 자체가 검증에 실패했다** — 이것이 골든 케이스 작성보다 먼저다.

> **틀린 목록으로 만든 골든은 틀린 것을 고정한다.**

---

## §2. 🔴 순서 — 목록을 먼저 고친다

| 순서 | 작업 | 이유 |
|---|---|---|
| **1** | **팬텀 제거**(guard 배선 · MR-1-7-05) | 안 도는 가드에 골든을 붙이면 **항상 통과** = 소음 |
| **2** | **stale 수치 정정**(351 → 실측 · 방법 명시) | **351로 회귀 범위를 잡으면 ≈30% 누락** |
| **3** | `MeasurementMethod` 도입 | **재현 불가 기준선은 골든이 아니다** |
| **4** | Preservation Golden 케이스 작성 | **지금 가능** — 코드가 실재 |
| **5** | Rebate Golden | **구현 후** |

**1·2를 건너뛰고 4로 가면 골든이 팬텀과 stale 값을 정본으로 굳힌다.**

---

## §3. 인증 기준

| # | 기준 | 임계 | 현재 |
|---|---|---|---|
| **GD-1** | 보존 대상 `is_effective = true` | **100%** | ❌ **팬텀 1건** |
| **GD-2** | 기준선 수치에 `measurement_method` | **100%** | ❌ **351·455 둘 다 없음** |
| **GD-3** | 보존 대상 골든 커버리지 | 100% | **미측정** |
| **GD-4** | 골든 실행 | **매 배포**(GATE 5) | ✅ **REAL**(e2e) |
| **GD-5** | 정정 전파 미해소 | **0** | ❌ **1건**(5-6 → 5-1 미전파) |
| **GD-6** | Rebate 골든 | N/A | 구현 0 |

### 3-1. GD-2를 100%로 두는 근거

**§1/2 §3-3이 실증했다 — 정직한 grep 3개가 498·467·458을 낸다. 전부 옳다.**

> **method 없이 기록된 수치는 다음 세션에 검증 불가능하다.**
> 검증 불가능하면 **틀렸을 때 아무도 모른다** — **351이 3개 차수를 살아남은 방식이 정확히 이것이다.**

### 3-2. GD-5 — 정정 전파

**5-6이 351을 455로 정정했으나 5-1 §53 문서는 여전히 351이다.**
**한 곳을 고쳐도 복사본이 살아있으면 정정은 완료되지 않았다.**

---

## §4. 엔티티 정의

### E-01. `RegressionBaseline`

`baseline_id` · **`commit_sha`** · `target_id` · `measurement_method_ref` · `value` · `frozen_at`.

**🔴 `value`를 문서에 복사하지 않고 `measurement_method_ref`로 참조한다** — E-10 `CorrectionPropagation`.

### E-02. `GoldenCertificationRun` — 5-8 `CertificationRun` **동일 정본**

**재정의 금지.** 1-7 `LintCertificationRun`과도 **같은 계보** — `commit_sha` 결속.

### E-03. `RegressionVerdict`

`PASS` / `FAIL` / **`VACUOUS`** ← 🔴

**`VACUOUS`가 핵심이다.** 팬텀 대상에 대한 골든은 **PASS가 아니라 VACUOUS**다.

> **"통과"로 기록하면 팬텀이 영원히 안 보인다.**
> **공허하게 참인 케이스를 통과로 세는 순간, 골든 커버리지 %가 거짓이 된다.**

### E-04~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-04 | `BaselineFreeze` | `baseline.json` sacred_sha 패턴 확장 |
| E-05 | `BaselineDriftAlert` | 이탈 경보 |
| E-06 | `GoldenExecutionEvidence` | 5-7 감사 등재 · 중복 감사 금지 |
| E-07 | `RegressionScope` | 회귀 범위 — **stale 수치 사용 금지**(§2-2) |
| E-08 | `EnvironmentCaveat` | 🔴 **GATE 5는 데모 대상**(`deploy.yml:64`) — 운영과 다를 수 있음 |
| E-09 | `GoldenWaiver` | 만료·사유·승인자 필수 |
| E-10 | `GoldenRegressionHistory` | 재발 → `REPEAT_PROBLEM_HISTORY.md` |
| E-11 | `GoldenGapLink` | **1-6 Gap 원장** 연결 |
| E-12 | `CertificationHandoff` | **1-9 Legacy Equivalence** 로 인계 |

---

## §5. 1-8이 인증하지 못하는 것

1. **기대값의 타당성** — 골든은 "설계대로인가"만 본다. **설계가 틀리면 틀린 대로 PASS**한다.
2. **보존 목록의 완전성** — 목록에 **없는** 기능은 골든도 없다.
   **1-4/5-1이 열거한 것이 전부라는 보장은 없다.** 본 세션은 **누락 여부를 검사하지 않았다.**
3. **데모/운영 차이** — GATE 5는 **데모 대상**. **운영에서만 나는 회귀는 못 잡는다.**
4. **1-8 자신** — **위임도 스펙도 없다**(§0). 1-8의 요구 목록은 **저장소에 없다**(1-6 COV-GAP-01 소급).

---

## §6. 비파괴 확인

코드 변경 **0** · §53 문서 **무수정**(**351도 안 고쳤다** — 문서 수정도 승인 대상) ·
골든 케이스 **0** · 러너 신설 **0** · e2e **무수정**.

---

## §7. 다음

**1-9 Legacy Equivalence — 06-A 마지막 블록.**

> ✅ **1-9는 위임이 명시돼 있다**(1-8과 달리):
> `DSAR_REBATE_PROGRAM_LIFECYCLE_FUNCTION_REGRESSION_GATE.md`
> — *"**Legacy Equivalence·Production Certification 은 Part 4-5-3-1-9**"*
> `DSAR_AUTHORIZATION_FUNCTION_REGRESSION_GATE.md`
> — *"**Legacy Equivalence 최우선** — 기존 정상 사용자 접근을 유지하면서 과도한 권한·누락 Scope·
> 우회 가능 API 만 제거(§61)"*
>
> 착수 시 로드맵 재확인은 **여전히 필수**(RP-001).
