# CANONICAL — DSAR/Rebate Authorization Golden Dataset & Production Certification Governance

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-5-8 (2/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**
> Part 5-8 스펙을 **받지 않은 상태**에서 자율 판단으로 작성했다. 스펙 수령 시 본 문서가 양보한다.
>
> **본 문서는 Part 1-5(Permission) 8블록의 종결 문서다.**

---

## §1. 목적

Static Lint(5-8 1/2)는 **코드가 규칙을 어기는 것**을 막는다.
Golden Dataset은 **동작이 규칙과 다른 것**을 잡는다. 이 둘은 대체 관계가 아니다.

> Lint는 "bypass list에 줄이 늘었다"를 잡지만,
> **"이 요청이 실제로 거부되는가"는 실행해봐야만 안다.**

---

## §2. 현행 E2E 실측 (REAL)

`package.json:4-6` — **3계층**이 이미 존재한다(266차):

| 계층 | 스크립트 | 역할 |
|---|---|---|
| **smoke** | `tools/e2e/smoke.mjs` | 런타임 500 / 계약 회귀 |
| **render** | `tools/e2e/render.mjs` | **119 라우트 자동 도출 · 무음 사망 탐지**(281차) |
| **scenario** | `tools/e2e/scenarios.mjs` | 시나리오 |

**CI GATE 5에 배선 REAL**(`deploy.yml:64` — "E2E 스모크 (데모 대상 · 런타임 500/계약 회귀)").

**판정:** Golden Dataset 러너를 **새로 만들지 않는다.** `scenarios.mjs`를 **확장**한다
(Golden Rule). 특히 `render.mjs`의 **"라우트 자동 도출"** 패턴은 권한 테스트에 그대로 유효하다 —
**라우트를 사람이 나열하면 신규 라우트가 영원히 누락**되기 때문이다.

---

## §3. 엔티티 정의

### E-01. `AuthzGoldenCase` — 권한 골든 케이스

| 필드 | 타입 | 설명 |
|---|---|---|
| `case_id` | string | `AUTHZ-G-001` |
| `subject` | object | role · plan · tenant · scopes |
| `resource` | object | route · method |
| `expected` | enum | **`ALLOW` / `DENY`** |
| `expected_reason` | string | DENY 사유 코드(5-1 Decision Reason) |
| `citation` | string | 규칙 근거 블록 |

**`expected_reason`을 필수로 두는 이유:** `DENY`만 검증하면 **엉뚱한 이유로 막혀도 통과**한다.
권한 부족으로 막혀야 할 요청이 500 에러로 막히면 테스트는 초록인데 **시스템은 고장**이다.

### E-02. 🔴 `DenyCaseCoverage` — DENY 우선 원칙

**설계의 핵심 판단이다.**

> **ALLOW 케이스만 있는 권한 테스트는 무의미하다.**
> ALLOW는 기능 테스트가 어차피 커버한다(기능이 동작하려면 권한이 통과해야 하므로).
> **권한 시스템의 존재 이유는 DENY다.** 그런데 DENY는 정상 사용 중에 절대 실행되지 않으므로,
> **명시적으로 테스트하지 않으면 영원히 검증되지 않는다.**

따라서: **DENY 케이스 ≥ ALLOW 케이스**를 커버리지 요건으로 고정한다.

이는 5-7의 감사 설계(**"ALLOW는 샘플링, DENY는 전량"**)와 **동일한 철학**이다 — 우연이 아니라
같은 원리(비정상 경로는 관측·검증 압력이 구조적으로 낮다)의 두 적용이다.

### E-03. `NegativeAuthzMatrix` — 부정 매트릭스

5-1의 `roleRank`(`index.php:554` — `viewer:0 · connector:1 · analyst:2 · admin:3`)를
**역방향으로 전수 검사**한다.

```
∀ role r, ∀ 보호 라우트 x :
    rank(r) < required_rank(x)  →  반드시 DENY
```

**여기서 `render.mjs`의 자동 도출 패턴이 결정적이다.** 라우트를 손으로 적으면
**신규 라우트는 매트릭스에 영원히 안 들어온다** — 그러면 신규 라우트가 가장 안 지켜진다.

### E-04. 🔴 `BypassListGoldenCase`

bypass list(143 조건)의 **각 경로가 실제로 공개인지**, 그리고 **그 외 경로가 실제로 보호되는지**를
양방향 검증한다.

**192차 P0 회귀 케이스 고정:** `/v423/admin/*` 과 **`/api/v423/admin/*` 별칭**이
**동일 판정**을 내는지 검사한다. 별칭이 갈리면 그것이 권한상승이다.

### E-05. `TenantIsolationGoldenCase` — 🔴 헌법 요건

**테넌트 격리는 절대**다(데이터 헌법). 테넌트 A 토큰으로 테넌트 B 자원 요청 → **DENY 필수**.

**286차의 `platform_growth` act-as tenant 하이재킹**을 회귀 케이스로 고정한다 —
자동 ON → localStorage 고착 → `X-Act-As-Tenant` → 전 메뉴 공백. **재발 시 즉시 검출돼야 한다.**

### E-06~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-06 | `SodGoldenCase` | toxic combination 부여 시도 → DENY |
| E-07 | `MakerCheckerGoldenCase` | **자기 승인 → DENY** · 정족수 미달 → pending |
| E-08 | `BreakGlassGoldenCase` | 발동 → 감사 기록 필수 · 만료 후 → DENY |
| E-09 | `GoldenDatasetVersion` | 케이스셋 버전 — 규칙 변경 시 동반 갱신 |
| E-10 | `CertificationRun` | 인증 실행 1회분 |
| E-11 | `CertificationCriteria` | 합격 기준(§4) |
| E-12 | `CertificationEvidence` | 5-7 감사 정본에 결과 등재 |

---

## §4. Production Certification 기준

**아래를 전부 만족해야 "권한 체계 운영 인증"이다.**

| # | 기준 | 임계 |
|---|---|---|
| C-1 | Golden DENY 케이스 통과율 | **100%** — 1건 실패도 불가 |
| C-2 | Golden ALLOW 케이스 통과율 | 100% |
| C-3 | `BypassListGoldenCase` | **100%** |
| C-4 | `TenantIsolationGoldenCase` | **100%** — 헌법 요건 |
| C-5 | Authz Lint 신규 위반 | **0** (Ratchet R2) |
| C-6 | 고아 가드(`GuardWiringRule`) | **0** |
| C-7 | Lint Coverage(E-11) | 측정·보고 — **임계 미설정** |

**C-1~C-4를 100%로 두는 근거:** 권한은 **부분 통과가 의미 없는 도메인**이다.
99% 막고 1% 뚫리면 **그 1%로 전부 뚫린다.** 성능·UX 지표와 달리 **비율 완화가 성립하지 않는다.**

**C-7을 임계 없이 두는 이유(정직한 한계):** 5-1~5-7 규칙 중 **Lint로 강제 가능한 것은 일부**다.
"위임은 업무상 필요가 있을 때만" 같은 규칙은 **자동 검사가 불가능**하다.
임계를 세우면 **측정 가능한 규칙만 쓰게 되는 왜곡**이 생긴다. 그래서 **측정하되 강제하지 않는다.**

### 4-1. 인증의 유효기간

**Certification은 1회성이 아니다.** 코드가 바뀌면 인증은 **무효**다.
따라서 `CertificationRun`은 **커밋 SHA에 결속**되며, **GATE 5에서 매 배포마다 재실행**된다.
"작년에 인증받았다"는 **증거가 아니다.**

---

## §5. 5-8이 인증할 수 없는 것 (범위 정직 표기)

**이 인증은 다음을 보증하지 않는다:**

1. **규칙 자체의 타당성** — Golden Dataset은 "설계대로 동작하는가"만 본다.
   **설계가 틀렸으면 틀린 대로 100% 통과**한다.
2. **미설계 영역** — 5-1~5-7이 다루지 않은 권한 경로는 케이스가 없으므로 검증도 없다.
3. **런타임 데이터 의존 판정** — ABAC 속성이 실데이터에 의존하는 경우 데모 환경 결과가
   운영과 다를 수 있다(**GATE 5는 데모 대상**임 — `deploy.yml:64`).

> **3번은 실제 위험이다.** 데모에서 통과한 권한 판정이 운영에서 다를 수 있다.
> 이를 "인증됨"으로 읽으면 안 된다.

---

## §6. Part 1-5 (Permission) 종결 선언

| 블록 | 산출 | 코드변경 |
|---|---|---|
| 5-1 | Authorization Foundation + Policy Decision + **§53 52문서** | 0 |
| 5-2 | Organization/Tenant Scope + Role Governance | 0 |
| 5-3 | Approval Workflow + Risk-Based Decision | 0 |
| 5-4 | Maker-Checker/SoD + Delegation/Impersonation | 0 |
| 5-5 | JIT/Time-Bound + Emergency Break-Glass | 0 |
| 5-6 | Runtime Enforcement + UI/API Consistency | 0 |
| 5-7 | Audit/Evidence + Access Review/Compliance | 0 |
| **5-8** | **Static Lint/Runtime Guard + Golden Dataset/Certification** | **0** |

**총 코드변경 0 · 비파괴 · 무후퇴.**

**1-5 전체를 관통한 판정:** Authorization 도메인은 **부재가 아니라 존재·분산**이다.
따라서 1-5의 결론은 일관되게 **신설이 아니라 통합**이었다.

### 6-1. 1-5가 자기 정정한 사항 (정직 기록)

| # | 정정 |
|---|---|
| 1 | **RP-001** — 로드맵 미확인 파트 번호 임의 생성 → R1~R5 재라벨 |
| 2 | **"requirePro 351"은 코드 주석값**(286차 시점) → 실측 **455** |
| 3 | **R3 "hash-chain 부재"** → hash-chain은 **REAL**(`menu_audit_log`), 금전 원장에만 부재 |
| 4 | **설계 순환 참조** — 5-1~5-6이 부재 기능(Access Review)에 의존 → "Runtime Guard 차단(1차) + Access Review 등재(2차)"로 해소 |
| 5 | **5-2 grep 4건 중 3건 FP** — Workspace/Store/Country Registry |
| 6 | **`guard_headerless_getjson` "REAL"** → 파일 실재하나 **호출처 0**(5-8 발견) |

**6건 모두 "발견 즉시 기록"했고 되돌려 감추지 않았다.**

---

## §7. 누적 인계 — MIGRATION_REQUIRED / 관찰

**본 세션은 아래 어느 것도 수정하지 않았다**(비파괴 · FP 레지스트리 — **PM 코드 재증명 전 P0 단정 금지**).

| 출처 | 항목 | 등급 |
|---|---|---|
| 06-A Part 2 | **무게이트 발송**(`/sms/send` · `/whatsapp/send` · `sendOne` · `/sms/broadcast` · phone DNC 부재) | 🔴 P0 후보 |
| 06-A Part 3 | Audience consent / Removal / Reconcile 부재 | 🟠 |
| R3 | 금전 원장 hash-chain 부재 | 🟠 |
| 5-1 | 감사 스키마 편차(5필드 vs 12필드+체인) | 🟠 |
| 5-3 | `Mapping.php:212` 승인 **중복 제거 없음**(동일 actor 2회 → 정족수 충족) | 🔴 후보 |
| 5-3 | `Alerting.php:593` 승인 **정족수 없음**(1인 approve → approved) | 🟠 |
| 5-4 | `AdminMenu.php:52-54` **fail-open**(team_role 미설정 → owner) | 🟠 |
| 5-7 | `audit_log` **tenant_id 부재** | 관찰 |
| 5-7 | Dormant 탐지 — 인간 Subject `last_used_at` 부재 | 관찰 |
| 5-8 | **`guard_headerless_getjson` 배선 0** | 🔴 **1줄** |
| 5-8 | pre-commit **CI 미강제 · 클론별 opt-in** | 🟠 |
| 5-8 | **권한 Lint/Guard 전무** | 🟠 |

**`Mapping.php:212`가 가장 위험해 보인다** — 승인 중복 제거가 없으면 **1인이 2회 눌러
`required_approvals=2`를 충족**한다. Maker-Checker의 목적 자체가 무효화된다.
**다만 실호출 경로·UI 제약을 확인하지 않았으므로 P0로 단정하지 않는다** — PM 재증명 대상이다.

---

## §8. 다음 단계

**1-5 종결.** 정본 로드맵(`CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`) 기준 잔여:

| 파트 | 내용 |
|---|---|
| **1-6** | Coverage / Gap |
| **1-7** | Lint Certification |
| **1-8** | Golden Dataset |
| **1-9** | Legacy Equivalence |

> ⚠️ **1-7·1-8은 5-8과 주제가 겹친다.** 착수 전 **로드맵 재확인 필수**(RP-001 재발 방지).
> 5-8은 **Permission 도메인 한정**이고 1-7·1-8은 **EPIC 06-A 전체**일 가능성이 높으나,
> **추정하지 않는다** — 확인 후 진행한다.
