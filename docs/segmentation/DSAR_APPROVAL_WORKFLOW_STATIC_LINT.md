# DSAR — 최소 Static Lint (§65)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §65 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Workflow Definition/Version 테이블 | `workflow_*`/`flow_*`/`wf_*` **grep 0** | `NOT_APPLICABLE` — **Lint 대상 산출물이 없다** |
| Workflow Lint/Validator | 승인 도메인 그래프 검증기 **grep 0** | `NOT_APPLICABLE` |
| 그래프 방어 (인접) | `JourneyBuilder` 순환 감지 :512 — ★주석이 **"작성자 JSON 에 acyclicity 검증 없음"을 자인** = **런타임 방어만·Static Lint 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 레포 스캔 게이트 | `tools/scan_secrets.sh`(규칙 SSOT) ← `.githooks/pre-commit:50`(`--staged`) + `.github/workflows/security-scan.yml` `repo-guards` 잡(:57 · :82 `--range "$BASE" "$HEAD_SHA"`) | `WIRED(pre-commit·로컬)` + `WIRED(CI·탐지)` — **등급 주의(아래)** |
| G15 인가 회귀 가드 | `.githooks/pre-commit:195-204`(275차 신설 · **289차 배선**) + `security-scan.yml` `repo-guards` | `WIRED(pre-commit·로컬)` |
| 전이 규칙 선언 | **0건** — `UPDATE ... SET status=` **155건/44파일**이 전부 호출지점 인라인. 전이 가드는 4곳뿐(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `NOT_APPLICABLE` — 정적 검증할 **선언이 존재하지 않음** |

### ★등급 축 주의 — **정직 등급 필수**

- **5-3-1의 Lint 19 + Guard 30 은 전부 `CONTRACT_ONLY`(실 코드·테이블 0건)였다.** 이 문서의 신설분도 **실 코드가 없으면 `CONTRACT_ONLY`**로 적는다. 계약 문서가 존재한다는 사실을 "린트가 있다"로 바꿔 읽으면 5-3-1의 가짜녹색을 그대로 반복하는 것이다.
- 🔴 **"CI 가드"라는 표현은 배선 후에도 거짓일 수 있다.** 289차 ④ 실측:
  - `.githooks/pre-commit` = **로컬 훅**. `core.hooksPath` 를 설정하지 않은 클론에서는 **아예 실행되지 않는다.** 정확한 등급은 **`WIRED(pre-commit·로컬)`** 이지 "CI 가드"가 아니다.
  - `security-scan.yml` 의 `repo-guards` 잡은 실재한다(:57 · :82). 규칙 SSOT 는 `tools/scan_secrets.sh` 하나이며 **pre-commit 과 CI 가 같은 스크립트를 호출**한다 → 🔴 **정규식을 CI 에 복사하면 규칙 분기의 병을 새로 심는다**(호출처 하나 유지 = 289차 ④ 설계 의도).
  - 🔴 **브랜치 보호 + required check 미설정** → `repo-guards` 가 실패해도 **머지를 막지 못한다**. 즉 **가드는 탐지일 뿐 예방이 아니다**(사용자 결정 대기 **G-06b**).
  - → 결론: 현행 최고 성숙 가드조차 **`WIRED(탐지)`** 이지 **`ENFORCED(예방)` 가 아니다.** §65 원문은 **"차단하라"**고 요구한다 — **탐지는 §65 요구를 충족하지 않는다.**
- **§65는 Lint(정적)이고 §66은 Guard(런타임)다.** JourneyBuilder :512 의 순환 감지는 **런타임 방어**이므로 §65 #9(무한 Loop 종료 조건 누락)의 커버가 **아니다**. 이를 커버로 계산하면 역산이다.

## 1. 원문 전사 + 판정 — **원문 28종**

원문 §65 서두: **"전체 Production Certification은 마지막 Approval Audit 단계에서 완성한다. 이번 블록에서는 다음을 차단하라."** — 즉 28종은 **이번 블록의 최소 차단 집합**이다.

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | Active Workflow에 Start Node 없음 | Start Node 개념 grep 0(§12 #1 `NOT_APPLICABLE`) | `CONTRACT_ONLY` |
| 2 | Terminal Node 없음 | END 개념 grep 0(§12 #2) | `CONTRACT_ONLY` |
| 3 | Unreachable Node | 그래프 정적 검증기 부재 | `CONTRACT_ONLY` |
| 4 | Dead-end Non-terminal Node | 동상 | `CONTRACT_ONLY` |
| 5 | Orphan Edge | Edge 개념 부재 | `CONTRACT_ONLY` |
| 6 | 잘못된 Source·Target | 동상 | `CONTRACT_ONLY` |
| 7 | Node Code 중복 | 동상 | `CONTRACT_ONLY` |
| 8 | Edge Code 중복 | 동상 | `CONTRACT_ONLY` |
| 9 | 무한 Loop 종료 조건 누락 | **정적 검증 0** · JourneyBuilder :512 는 **런타임** 순환 감지(주석이 작성자 JSON acyclicity 미검증 자인) | `CONTRACT_ONLY` · `KEEP_SEPARATE_WITH_REASON`(:512 는 §66 축) |
| 10 | Gateway Default Path 규칙 위반 | Gateway 개념 grep 0(§12 #11~#16) | `CONTRACT_ONLY` |
| 11 | Approval Requirement 없는 Approval Task | Requirement 테이블 부재 · **인접 실증**: `action_request` 정족수 **컬럼 없음**·`Alerting:562` 리터럴 `2` 장식 = **원문 #11 이 겨냥한 상태 그 자체** | `CONTRACT_ONLY`(Lint) · 🔴 인접 갭 실재 |
| 12 | Assignment Hook 없는 Human Task | Human Task/Assignment 개념 부재 | `CONTRACT_ONLY` |
| 13 | Retry Policy 없는 Critical External Task | Retry Policy **선언** 0 — 현행은 **코드 상수 3공식 병존**(AdAdapters:1187-1228 · OpenPlatform:466-471 · Omnichannel:365) = **선언이 없으니 Lint 불가** | `CONTRACT_ONLY` |
| 14 | Idempotency 없는 System Task | `idempotency_key` **grep 0** · 자연키 선례만(`claimSendOnce` JourneyBuilder.php:672) | `CONTRACT_ONLY` |
| 15 | Tenant Scope 없는 Workflow Definition | Definition 부재 · **인접 실증**: `admin_growth_approval` tenant_id 없음 · `paddle_events` tenant_id 없음(:99) | `CONTRACT_ONLY` · 🔴 인접 갭 실재 |
| 16 | Environment Scope 없는 Production Workflow | Environment Scope 개념 부재 | `CONTRACT_ONLY` |
| 17 | Version 없는 Workflow 실행 | Version 개념 부재 · **`optimistic lock(version)` grep 0** | `CONTRACT_ONLY` |
| 18 | Mutable Active Workflow Version | 불변 Version 개념 부재 | `CONTRACT_ONLY` |
| 19 | Production Script Task | **Script Task 미도입** = 위반 대상 부재 | `CONTRACT_ONLY` — **미도입 유지가 정답**(§64 #25 와 짝) |
| 20 | Cross-Tenant Sub-workflow | **Sub-workflow 부재**(`sub_journey`/`call_activity` grep 0) | `CONTRACT_ONLY` |
| 21 | Version 미고정 Sub-workflow | 동상 | `CONTRACT_ONLY` |
| 22 | Secret Variable | Workflow Variable 부재 · **인접 REAL**: `tools/scan_secrets.sh`(규칙 SSOT) ← pre-commit:50 + `repo-guards`:82 | `CONTRACT_ONLY`(Workflow Variable) · `WIRED(pre-commit·로컬)`+`WIRED(CI·탐지)`(레포 소스) — 🔴 **required check 미설정 → 예방 아님** |
| 23 | Masking 없는 Sensitive Variable | Variable/Masking 개념 부재 | `CONTRACT_ONLY` |
| 24 | Evidence Requirement 없는 Critical Manual Task | Evidence Requirement 부재(§69 전 축 신설) | `CONTRACT_ONLY` |
| 25 | Completion Policy 없는 Task | Task/Completion Policy 부재 | `CONTRACT_ONLY` |
| 26 | Error Handling 없는 Critical Node | Boundary 계열 grep 0(§12 #24~#26) | `CONTRACT_ONLY` |
| 27 | State Mapping 없는 End Node | End Node·State Mapping 부재(§63 Mapping Registry 요구와 짝) | `CONTRACT_ONLY` |
| 28 | 기존 Workflow Engine 중복 생성 | **현행 유일 실 엔진 = `JourneyBuilder`**(노드 13종·`advanceEnrollment`:498-700+·cron REAL `journey_cron.php:29-35`) — 이름 grep(BPMN/Temporal) 0 을 "엔진 부재"로 읽으면 **오판** | `CONTRACT_ONLY`(Lint) · 🔴 **설계 결론 1 강제**(엔진 신설 금지) |

**실측 개수: 28 / 28 전사.** 커버리지 = `CONTRACT_ONLY` 28 (**실 Lint 코드 0건 · 검증 대상 산출물 0건**) · 그중 인접 도메인 실자산 인용 3건(#9·#22·#28) · 인접 갭 실재 2건(#11·#15).

🔴 **28/28 `CONTRACT_ONLY` = 5-3-1(Lint 19 전건 `CONTRACT_ONLY`)의 연장이다.** 5-3-2 시점에도 **승인 워크플로 Static Lint 는 단 1건도 코드로 존재하지 않는다.** 이 숫자를 "계약 완비"로 읽지 마라 — **계약만 있고 집행이 없다.**

## 2. 규칙

- 🔴 **등급을 부풀리지 마라.** 실 코드·테이블이 0이면 `CONTRACT_ONLY`. 문서가 존재한다는 것은 **계약이 있다**는 뜻이지 **차단된다**는 뜻이 아니다. 5-3-1 Lint 19 + Guard 30 이 전건 `CONTRACT_ONLY` 였던 사실을 매번 명시하라.
- 🔴 **"CI 가드"라고 쓰지 마라.** 정확한 등급 어휘:
  - `WIRED(pre-commit·로컬)` — `.githooks/pre-commit`. **`core.hooksPath` 미설정 클론에서는 미실행.**
  - `WIRED(CI·탐지)` — `security-scan.yml` `repo-guards`(:57·:82). **브랜치 보호 + required check 미설정(G-06b·사용자 결정 대기) → 실패해도 머지 가능 = 탐지일 뿐 예방이 아니다.**
  - `ENFORCED(예방)` — **현행 레포에 이 등급은 아직 없다.** §65 원문의 "차단하라"는 이 등급을 요구한다.
- 🔴 **규칙 SSOT 는 `tools/scan_secrets.sh` 하나다.** pre-commit(:50 `--staged`)과 CI(`repo-guards`:82 `--range`)가 **같은 스크립트**를 호출한다. **정규식을 CI YAML 에 복사하면 규칙 분기의 병을 새로 심는다** — 5-3-2 Lint 도 동일 원칙: **규칙 구현 1곳 · 호출처 N곳**.
- **§65 #9 를 JourneyBuilder :512 로 덮지 마라.** :512 는 **런타임** 순환 감지이고 주석이 **"작성자 JSON 에 acyclicity 검증 없음"을 자인**한다. §65 는 정적 검증을 요구한다 → **:512 존재 = §65 #9 미충족**. (오히려 :512 주석이 §65 #9 갭의 **자백 증거**다.)
- **§65 #28 은 이 문서 전체를 지배한다.** 이름 grep(BPMN/Temporal) 0 을 "워크플로 엔진 부재"로 확대 해석했다가 **JourneyBuilder 라는 실 엔진의 존재로 뒤집힌 것이 8회차의 교훈**이다. **부재증명은 이름이 아니라 능력으로 하라.** → Flow 실행 엔진 **신설 금지**, `JourneyBuilder` 에 `approval` 노드 추가(설계 결론 1). 단 **enrollment 컨텍스트 일반화 선결**(`customer_id` 필수 :554 → 비-고객 승인 불가).
- **§65 #13 Retry Policy 는 "선언"을 요구한다.** 현행 3공식은 전부 **코드 상수**여서 Lint 대상이 아니다. 선언화 시 **`AdAdapters::retryDeliveryDlq`(:1187-1228 · `600*2^n` · 86400s 캡) 공식 채택** — 4번째 공식 금지.
- **§65 #17 Version**: `optimistic lock(version)`·분산락·`GET_LOCK` **전부 grep 0**이며 **SQLite 폴백 호환이 명시적 설계 제약**이다. Workflow Version 을 낙관적 락으로 구현하면 **제약 위반**이다 → **조건부 UPDATE + rowCount CAS**(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 확립 패턴) 채택.
- **§65 #19/#20/#21**: Script Task·Sub-workflow 는 **미도입 상태를 유지하는 것이 최선의 Lint 준수**다. 도입 시 #19~#21 이 즉시 활성화된다.
- 🔴 **28종 "있다고 가정"하고 배선 금지.** 부재는 부재로 기록했다.
