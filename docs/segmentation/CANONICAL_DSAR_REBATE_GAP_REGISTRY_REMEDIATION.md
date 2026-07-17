# CANONICAL — DSAR/Rebate Gap Registry & Remediation Governance

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-6 (2/2)**
> **비파괴 설계 명세 · 코드변경 0**
>
> ⚠️ **스펙 미수령 — 자율 판단 설계**. 스펙 수령 시 본 문서가 양보한다.

---

## §1. 목적

1-6 (1/2)는 **얼마나 덮였는가**를 측정했다. 본 문서는 **덮이지 않은 것을 등재·분류·추적**한다.

**Gap 등재의 목적은 고치는 것이 아니다.** 고치는 것은 승인 세션의 일이다.
**등재의 목적은 잊히지 않게 하는 것**이다. 등재되지 않은 Gap은 **존재하지 않는 것처럼 행동**하게 된다.

---

## §2. 🔴 Gap 분류 — 종류가 다르면 대응도 다르다

**본 설계의 핵심 판단이다.** 06-A의 Gap은 **성질이 전혀 다른 두 종류**가 섞여 있고,
이를 한 목록에 평평하게 나열하면 **가장 위험한 것이 가장 안전한 것과 같은 줄에 놓인다.**

| 등급 | 정의 | 06-A 사례 | 위험 성격 |
|---|---|---|---|
| **ABSENT** | 기능이 **없음** | Rebate 엔진 전체(grep 0) | 🟢 **낮음** — 없는 건 오작동하지 않는다 |
| **DEFECT** | **있는데 잘못 동작** | `Mapping.php:212` 승인 중복 미제거 | 🔴 **높음** — **지금 운영에서 작동 중** |
| **PARTIAL** | 있는데 일부만 | 감사 스키마 편차(5필드 vs 12필드+체인) | 🟠 |
| **UNVERIFIED** | **모름** | 보고 52 vs 실측 47 | 🟠 **모름은 양호가 아니다** |
| **WIRING** | 있는데 **연결 안 됨** | ~~`guard_headerless_getjson` 호출처 0~~ → ✅ **289차 해소**(G15 배선). **분류 예시로는 유효**(현행 잔여 예시 = `action_request` **생산자 0** — G-02 `VACUOUS`) | 🔴 **가짜녹색** |

### 2-1. 🔴 **ABSENT를 DEFECT보다 위에 두면 안 된다**

**06-A의 최대 Gap은 "Rebate 엔진 전체 부재"다. 그리고 그것은 가장 안 급하다.**

> **없는 기능은 아무도 해치지 않는다.** 고객이 rebate를 못 쓸 뿐이다.
> **반면 `Mapping.php:212`는 지금 운영에서 돌고 있고, 1인이 승인 버튼을 두 번 누르면
> `required_approvals=2`를 충족한다.** Maker-Checker가 **있다고 믿는 상태로 없다.**

**규칙: 우선순위는 Gap 크기가 아니라 `현재 운영 영향 × 오신뢰(false confidence)`로 정한다.**

**오신뢰가 결정적 인자다.** 없는 기능은 아무도 믿지 않지만, **WIRING/DEFECT는 "있다"고 믿게 만든다.**
믿음이 있는 곳에서만 사고가 난다.

---

## §3. 엔티티 정의

### E-01. `GapEntry`

| 필드 | 설명 |
|---|---|
| `gap_id` | 식별자 |
| `gap_class` | §2 — `ABSENT`/`DEFECT`/`PARTIAL`/`UNVERIFIED`/`WIRING` |
| `evidence` | 🔴 **코드 근거 `file:line` 또는 grep 결과 필수** |
| `evidence_method` | `grep`/`ls`/`실행` — 5-8 교훈 |
| `operational_impact` | 현재 운영 영향 |
| `false_confidence` | 🔴 **"있다고 믿게 하는가"** |
| `priority` | `impact × false_confidence` (§2-1) |
| `proof_status` | **`PROVEN` / `UNVERIFIED`** — FP 레지스트리 |
| `owner` · `aging` | 담당 · 경과일 |

### E-02. 🔴 `GapProofStatus` — 단정 금지 게이트

**FP 레지스트리(**PM 코드 재증명 전 P0 단정 금지**)의 Gap 적용.**

```
규칙: proof_status = UNVERIFIED 인 Gap 은
      → P0/P1 등급 부여 금지
      → 단, 등재는 필수 (모른다는 사실을 기록)
```

> **"모르면 P0"도 틀렸고 "모르면 무시"도 틀렸다.** 모른다는 것을 **정확히 기록**한다.

### E-03. `GapAging` — 방치 탐지

**Gap의 진짜 실패는 등재 실패가 아니라 방치다.** 등재만 하고 6개월 두면
**등재가 면죄부**가 된다("알고 있었다"). → `aging` 임계 초과 시 **5-7 Access Review에 자동 상정**.

### E-04. `GapWaiver` — 유예

**만료일·사유·승인자 필수. 무기한 금지**(5-8 `LintSuppression`과 동일 원칙).

### E-05~E-12 (요약)

| ID | 엔티티 | 요지 |
|---|---|---|
| E-05 | `RemediationPlan` | 해소 계획 — **승인 세션 단위** |
| E-06 | `RemediationVerification` | 해소 **검증**(고쳤다는 주장 ≠ 고쳐짐) |
| E-07 | `GapRecurrence` | 재발 — `REPEAT_PROBLEM_HISTORY.md` 연결 |
| E-08 | `GapSourceBlock` | 발견 블록(1-1~1-9) |
| E-09 | `GapDependency` | Gap 간 의존 — **MR-1-6-02는 MR-1-6-01 선행 필요** |
| E-10 | `GapClassTransition` | `UNVERIFIED → PROVEN/CLOSED` 전이 |
| E-11 | `GapReport` | 보고 — **class별 분리**(§2) |
| E-12 | `GapCertification` | 5-8 `CertificationRun` **동일 정본** — 중복 금지 |

---

## §4. 🔴 06-A 누적 Gap 원장 (실측 · 14건)

**전부 본 세션 미수정**(비파괴 · FP 레지스트리).

### 4-1. `DEFECT` — 🔴 **최우선 (운영 중 · 오신뢰 있음)**

| ID | Gap | 근거 | proof |
|---|---|---|---|
| **G-01** | 🔴 **PM 재증명 완료 → `PROVEN` · P1** — **원인 정정: "중복 미제거"가 아니라 행위자 신원 부재**. `actor()` 가 **클라이언트 헤더 `X-User-Email`** 을 읽고(`Mapping.php:22-25`) **프론트는 그 헤더를 안 보냄**(grep 0) → **실 경로에서 actor 는 항상 `'unknown'`** → 1인 2회로 `count>=2` 충족 → **정족수 2 하드코딩**(`:167-168`)이 **1인으로 완주**. `audit_log.actor='unknown'`. **완화**: 무인증 아님(analyst+ 필요) · **UI 소비처 0** · 금전 아님(매핑 정규화) → **P0 아님** | `Mapping.php:22-25/167-168/212/214` · `routes.php:459/461` · 상세=[`PROOF_G01_G02_APPROVAL_QUORUM_REPROOF.md`](PROOF_G01_G02_APPROVAL_QUORUM_REPROOF.md) | **`PROVEN`** |
| **G-02** | 🔴 **PM 재증명 완료 → `PROVEN`(코드) · verdict `VACUOUS`(위험)** — **정족수를 아예 읽지 않음**(1인 approve → approved). `required_approvals` 유일 히트는 **`:562` 응답 직렬화**("2인 필요"라고 **알리기만** 함 = 표시≠실제·가짜녹색). **단 `INSERT INTO action_request` = 0 → 생산자 전무 → 도달 불가**(287차 "죽은 스켈레톤" 유효). **생산자 배선 시 즉시 P1** | `Alerting.php:562/591-593` · `Db.php:634` · 생산자 grep 0 | **`PROVEN`·`VACUOUS`** |
| **G-03** | **fail-open** — `team_role` 미설정 → **owner 부여** | `AdminMenu.php:52-54` (주석에 의도 명시 — **레거시 단독회원 호환**) | `UNVERIFIED` — **의도일 가능성 높음** |
| **G-04** | **무게이트 발송** — `/sms/send`·`/whatsapp/send`·`sendOne`·`/sms/broadcast`·phone DNC 부재 | 06-A Part 2 | `UNVERIFIED` |

> **G-01이 원장 전체의 최상위다.** ABSENT인 Rebate 엔진보다 위다 — §2-1.
> **다만 `UNVERIFIED`이므로 P0로 단정하지 않는다**(E-02). **PM 재증명 대상.**
> **G-03은 주석이 의도를 명시**하므로 결함이 아닐 가능성이 상당하다 — 정직하게 표기한다.

### 4-2. `WIRING` — 🔴 가짜녹색

| ID | Gap | 근거 |
|---|---|---|
| ~~**G-05**~~ ✅ **CLOSED(289차)** | ~~`guard_headerless_getjson.mjs` **호출처 0** — 275차 이래 미실행~~ → **`.githooks/pre-commit` G15 배선** | **양방향 실증**: 위반 stage→**hook exit 1 차단** · 정상 import→**G15 통과** · 저장소 **위반 0건**. 가드 파일 **무수정**(275차 원본이 처음부터 옳았음) |
| ~~**G-05b**~~ 🟡 **부분 해소(289차 ④)** | ~~**G15 가 CI 에선 여전히 미실행**~~ → **`security-scan.yml` `repo-guards` 잡에서 실행**(차단 게이트·`continue-on-error` 없음) | **잔여 = 브랜치 보호 부재**(아래 G-06b) |
| ~~**G-06**~~ 🟡 **부분 해소(289차 ④)** | ~~pre-commit **CI 미강제** → **B4 가 opt-in**~~ → **B4 규칙을 `tools/scan_secrets.sh` 로 SSOT 이관** 후 **훅·CI 양쪽이 같은 스크립트 호출** · CI `repo-guards` 에서 커밋범위 스캔 | **양방향 실증**: 시크릿 stage → 차단(값 마스킹 확인) · 정상 → 통과 · `--range`/all-zero SHA 폴백 검증 |
| **G-06b** | 🔴 **탐지≠예방** — 브랜치 보호·required check **부재** → master **직 push 시 `repo-guards` 실패가 배포를 막지 못하고 사후 통보만** 한다(`deploy.yml` 은 독립 트리거). `--no-verify` 도 여전히 유효 | **GitHub 저장소 설정 = 코드로 해결 불가 · 사용자 결정사항**. ★**"CI 가드 있음 = 안전"으로 읽으면 275차 오독의 재현** |

### 4-3. `PARTIAL`

| ID | Gap |
|---|---|
| **G-07** | 감사 스키마 편차(5필드 vs `menu_audit_log` 12필드+**hash_chain**) — **상향 표준화**(하향 금지) |
| **G-08** | 금전 원장 hash-chain 부재 — **패턴은 REAL**(`menu_audit_log`) → **확장**이지 신설 아님 |
| **G-09** | Audience consent/Removal/Reconcile 부재 |
| **G-10** | 권한 Lint 전무 — bypass list(143조건) 무검사 |

### 4-4. `UNVERIFIED`

| ID | Gap |
|---|---|
| **G-11** | `audit_log` **tenant_id 부재** — 플랫폼 도메인이면 **의도**일 수 있음 |
| **G-12** | Dormant 탐지 — 인간 Subject `last_used_at` 부재 |
| **G-13** | 🔴 **§53 요구 목록 저장소 부재** — **커버리지 분모 없음**(COV-GAP-01) |
| **G-14** | 🔴 **보고 52 vs 실측 47** — **G-13 때문에 판별 불가**(COV-GAP-02 · `GapDependency` → G-13) |

### 4-5. `ABSENT` — 🟢 최하위

| ID | Gap |
|---|---|
| **G-15** | **Rebate 엔진 전체**(9/9 키워드 grep 0) · Legal Entity/Workspace/Brand/Store Registry 부재 |

> **원장에서 가장 큰 Gap이 가장 안 급하다.** 이 역설을 명시하지 않으면
> **원장은 "Rebate 만들자"로 읽히고 G-01은 묻힌다.**

---

## §5. 🔴 자기 지적 — 1-6은 스스로를 측정하지 못한다

**G-13이 1-6에게도 적용된다.** 1-6의 스펙 역시 **수령하지 않았다**(자율 판단).
따라서 **1-6의 요구 목록도 저장소에 없고, 1-6의 커버리지도 계산 불가능**하다.

**본 문서는 자신이 완전하다고 주장하지 않는다.** Gap 14건은 **발견된 것**이지 **전부가 아니다.**
발견되지 않은 Gap의 수는 **알 수 없으며, 그것을 0으로 보고하지 않는다.**

---

## §6. 비파괴 확인

코드 변경 **0** · 기존 문서 수정 **0** · **Gap 14건 전부 미수정**(승인 세션 대상).

---

## §7. 다음

잔여: **1-7 Lint Certification · 1-8 Golden Dataset · 1-9 Legacy Equivalence**.

> ⚠️ **1-7·1-8은 5-8과 주제 중복.** 5-8 = **Permission 한정**, 1-7·1-8 = **06-A 전체**로 보이나
> **추정 금지** — 착수 전 로드맵 재확인(RP-001).
