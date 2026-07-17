# DSAR — Organization Hierarchy 최소 Runtime Guard (§59)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §59 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★정직 등급 — 전건 `CONTRACT_ONLY`

**조직 도메인 실 코드 0 → 24종 Guard 는 전건 `CONTRACT_ONLY`(계약만 · 실코드 0).** 5-3-1(Lint 19 + Guard 30) · 5-3-2(Lint 28 + Guard 37) 가 전부 `CONTRACT_ONLY` 였던 연장이며, 본 블록(Lint 28 + Guard 24)까지 누적 **Lint 75 + Guard 91 = 166종 전건 계약만**이다.

### ★등급 어휘 3단 (§58 과 공유 — Runtime 축의 의미)

| 등급 | 정의 | 현행 | Runtime 축에서의 의미 |
|---|---|---|---|
| `WIRED(pre-commit·로컬)` | `.githooks/pre-commit`(실행권한 O · `core.hooksPath` = `.githooks` **본 클론 설정 확인** · 신규 클론 기본 미설정 · `--no-verify` 우회 가능) | 실재 | **런타임 가드와 무관** — 커밋 시점 |
| `WIRED(CI·탐지)` | `security-scan.yml` `repo-guards`(`:57`) · 규칙 SSOT `tools/scan_secrets.sh`(`:82`) | 실재 | **런타임 가드와 무관** — 파이프라인 시점 |
| 🔴 `ENFORCED(예방)` | 브랜치 보호 + required check **미설정**(G-06b) | **현행 레포에 이 등급 없음** | — |

🔴 **§59 원문의 "차단하라"는 미충족이다.** 위 3단은 **정적·파이프라인 축**이며, Runtime Guard 는 **요청 처리 경로에 실 코드가 있어야만 차단**한다. 조직 도메인은 요청 경로 자체가 없으므로 **24종 전부 집행체 0**이다. 문서 존재가 차단이 아니다.

### 인접 Runtime Guard 실자산 (전부 타 도메인 — 커버 아님 · 선례로만)

| 자산 | 실측 | 판정 |
|---|---|---|
| Cycle 차단(최상급 선례) | `PM/Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) — **반복형 DFS** + 명시적 `$visited` + **tenant 필터** + **최대깊이 10000** + **쓰기 전 차단**(`:32-34` → 422 `cycle_detected`) + self-loop 차단(`:29-31`) | `LEGACY_ADAPTER`(PM 도메인) — **정본 확장 대상** |
| 위상정렬 + degrade | `PM/Gantt`(`PM/Gantt.php:104-125`) Kahn + `count($topo) !== count($taskMap)` 정석 순환 판정 + **순환 시 500이 아니라 부분결과+경고로 degrade** | `LEGACY_ADAPTER` |
| 트리 이동 순환 차단 | `AdminMenu::wouldCycle(:540-555)` — 반복 조상 walk + `$depth<100` 하드캡(`:545`) + 자기참조 즉시 차단(`:542`) + 이동 시 검사 후 UPDATE(`:487-503`) | `LEGACY_ADAPTER` — 🔴 **`tenant_id` 컬럼 없음**(전역 단일 트리) |
| 경로 역주행 + 깊이 가드 | `ChannelSync::elevenStCategoryCatalog(:911-971)` — parent 체인 역주행 `whole` 구성(`:918`)·`depth`(`:914`)·**순환·과깊이 가드 `guard<10`**(`:954-963`) | `LEGACY_ADAPTER` |
| Tenant Mismatch 강제 | **REAL**: 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600`) · 세션→`auth_tenant` 주입(`:429-442`) · **strict fail-closed**(`:585`) | `LEGACY_ADAPTER` — 요청 축 tenant 이지 **조직 노드 간 tenant 일치 검사 아님** |
| 위임 fail-closed | `AgencyPortal::resolveAccessContext`(`:414-432`) — 매 요청 링크 재조회(`:423`) → `status!=='approved'` 이면 null(`:427`) → 세션↔링크 tenant 불일치 방어(`:428`) → `index.php:85-90` **403** | `LEGACY_ADAPTER` — 크로스테넌트 **접근 허가**이지 조직 경계 아님 |
| Graph 순회 | `graph_node`/`graph_edge`(`Db.php:816-839`) · `/v419/graph/*` 9라우트(`routes.php:721-729`) — ⚠️**순환 방어 없음** · `GraphScore::scoreInfluencer:187-240` **하드코딩 3-hop** · **hop3∈hop2∈hop1 = N+1**(`:207-219`) | `KEEP_SEPARATE_WITH_REASON` — 🔴 **답습 금지** |
| Kill Switch | `kill_switch`/`killswitch` 개념 — 조직 도메인 **부재** | `ABSENT` |
| Effective Date 검증 | ★**`WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건.** 유일 컬럼 `kr_fee_rule.effective_from`(`Db.php:898`) 읽기는 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`) · **`effective_to` grep 0** | `ABSENT` — **as-of 조회 능력 자체가 없다** |
| Snapshot Hash 검증 | `menu_defaults`(`AdminMenu.php:120`) **immutable_hash 없음** · `pm_baseline`(`PM\Enterprise.php:55`) 동일 · 해시 선례는 `schema_migrations.checksum`(`Migrate.php:50`)·`menu_audit_log.hash_chain`(`AdminMenu.php:128`) | `PARTIAL`(선례만) |
| Path Index Drift | Path Index 부재 → drift 판정 대상 없음 | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 24종**

원문(§59) 전제: *"다음을 차단하라."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Organization Unit Not Found | Unit 부재 · 404 선례 = `AdminGrowth::fail(... 'NOT_FOUND', 404)`(`AdminGrowth.php:1326`) | `CONTRACT_ONLY` |
| 2 | Organization Version Not Active | 엔티티 version 부재(`menu_defaults.version` 1건뿐) | `CONTRACT_ONLY` |
| 3 | Hierarchy Not Found | Hierarchy 부재 | `CONTRACT_ONLY` |
| 4 | Hierarchy Version Not Active | 동상 | `CONTRACT_ONLY` |
| 5 | Tenant Mismatch | ★요청 축 tenant 강제는 **REAL**(`index.php:585`·`:600`)이나 **조직 노드/엣지 간 tenant 일치 검사는 부재** — 🔴 **대칭 오류 주의: 요청 tenant 격리를 조직 Tenant Mismatch 커버로 계산하면 역산** | `CONTRACT_ONLY` |
| 6 | Workspace Mismatch | Workspace 엔티티 부재 | `CONTRACT_ONLY` |
| 7 | Legal Entity Mismatch | Legal Entity 부재(`biz_no`/`corp_reg`/`tax_id` 0건) | `CONTRACT_ONLY` |
| 8 | Effective Date Outside Validity | ★**as-of 술어 전역 0건** · `effective_to` 0건 → **판정 능력 없음** | `CONTRACT_ONLY` |
| 9 | Organization Retired | 조직·retire 상태 부재 | `CONTRACT_ONLY` |
| 10 | Hierarchy Suspended | 동상 | `CONTRACT_ONLY` |
| 11 | Graph Cycle Detected | 조직 그래프 부재 · 선례 최상급 `PM/Dependencies:79-100`(쓰기 전 차단) · ⚠️`graph_edge` 는 방어 0 | `CONTRACT_ONLY` |
| 12 | Path Resolution Failed | 경로 개념 부재 | `CONTRACT_ONLY` |
| 13 | Maximum Depth Exceeded | 조직 부재 · 선례 깊이캡 **3종 불일치**(10000 `PM/Dependencies` / 100 `AdminMenu.php:545` / 10 `ChannelSync.php:954-963`) | `CONTRACT_ONLY` |
| 14 | Primary Parent Conflict | Primary Parent 부재 · `app_user.parent_user_id` 는 nullable 단일 컬럼 → 충돌 표현 불가 | `CONTRACT_ONLY` |
| 15 | Legal Entity Binding Missing | 부재 | `CONTRACT_ONLY` |
| 16 | Country Binding Missing | ★**Country→Region 매핑 코드 0건**. `Geo`(`Geo.php:23-53`)는 국가→**언어** 매핑(`COUNTRY_LANG_MAP`)이지 조직 매핑 아님 · `region` 3축 병존(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) | `CONTRACT_ONLY` |
| 17 | Approval-eligible Path Missing | 승인 라우팅·경로 양쪽 부재 | `CONTRACT_ONLY` |
| 18 | Manager-resolution Path Missing | ★`reports_to` **0** · `manager_id` **0**(단 `team.manager_user_id` 존재 — 팀 1인 지정이지 보고선 경로 아님) · `app_user.parent_user_id` 순회 = **단일 홉**(`resolveTenantId` `UserAuth.php:200-217`, 재귀 없음) | `CONTRACT_ONLY` |
| 19 | Snapshot Missing | 조직 스냅샷 부재 | `CONTRACT_ONLY` |
| 20 | Snapshot Hash Invalid | ★`menu_defaults`·`pm_baseline` **immutable_hash 없음** → 해시 검증 능력 자체가 없다 | `CONTRACT_ONLY` |
| 21 | Path Index Drift | Path Index 부재 | `CONTRACT_ONLY` |
| 22 | Critical Reconciliation Drift | Reconciliation 개념 부재 · ★집행 수단도 없음(`ensureTables` 는 **백필을 하지 않는다**) | `CONTRACT_ONLY` |
| 23 | Future Change Activation Failed | Future-dated 변경 부재(effective 폐구간 0) | `CONTRACT_ONLY` |
| 24 | Kill Switch 활성 | 조직 Kill Switch 부재 | `CONTRACT_ONLY` |

**실측 개수: 24 / 24 전사.** 판정 = **`CONTRACT_ONLY` 24 / 24.** **커버(`VALIDATED_LEGACY`) 0.**

## 2. 규칙

- 🔴 **24종 전건 `CONTRACT_ONLY` — 요청 경로에 실 코드 0.** §59 원문 "차단하라"는 **미충족**. 이 문서는 **차단이 아니라 차단 계약**이다.
- 🔴 **인접 자산을 커버로 계산 금지**(대칭 오류 = 능력 존재 ≠ 요구 충족):
  - #5 — `index.php:585`/`:600` 의 tenant fail-closed 는 **요청 축**. 조직 노드↔엣지 tenant 일치는 **별개 검사**다.
  - #11 — `PM/Dependencies` 는 **PM 태스크 도메인**. 조직 커버 아님.
  - #18 — `team.manager_user_id` 는 **팀 1인 지정**이지 Manager-resolution **경로**가 아니다. `app_user.parent_user_id` 도 ★**owner 직속 2단으로 봉인**(전 생성 경로 검증: `UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`·`:1574`/`:1581`·`:670`) + **단일 홉 순회**(`UserAuth.php:200-217`) → **보고선 경로 아님.**
- ✅ **정본 확장 대상 = `PM/Dependencies::validateDependency` 패턴**(반복 DFS + 명시적 visited + tenant 필터 + 깊이캡 + **쓰기 전 차단**). 레포 최상급이며 #11/#13 의 정본.
  - 🔴 **`graph_node`/`graph_edge` 순회를 참조 구현으로 삼지 마라**: 순환 방어 **없음** + `GraphScore:207-219` **hop3∈hop2∈hop1 N+1** — 285차 *"루프 내 N+1 = 즉시장애"* 트랩의 DB판이다. **Path Index 도입 정당화 근거**이지 답습 대상이 아니다.
  - **degrade 정책 선례 채택 권장**: `PM/Gantt:104-125` — 순환 시 **500이 아니라 부분결과 + 경고**. §61 Warning Contract 와 정합.
- 🔴 **재귀 CTE 도입 금지 방향.** `WITH RECURSIVE` **backend/src 0** · `Db::sql()`(`Db.php:177-191`)은 **DDL 전용 번역기**(SELECT·CTE 미지원). 레포 트리 5개 전부 **애플리케이션 계층 순회** 채택 = 이식성 관례. 재귀 CTE 는 **두 번째 순회 방식 도입 = 정합 부담**. (⚠️라이브 SQLite 버전 미실측 — 엔진 지원 여부는 추론이며 사실로 인용 금지.)
- **#13 Maximum Depth SSOT 선결**: 현행 3종 불일치(10000/100/10). 조직 도입 시 **상수 1벌**. 5-3-2 "백오프 3공식"·"타임존 3벌", ⓑ 16번 `isDemo` **12핸들러 3이름**과 동형 = **술어 SSOT 부재**의 재발 방지.
- **#8/#23 은 능력부터 신설**: ★**`WHERE effective_from <= :as_of` 술어 = 전역 0건** · `effective_to` **0건** → **폐구간 시점 모델과 as-of 조회는 순수 신규**. 컬럼만 얹으면 `kr_fee_rule` 처럼 **최신승으로 퇴화**한다(`Pnl.php:449` 가 기간을 받고도 `:454` 는 무시 — 관찰 사실 · 등급 미부여 · 주석 `:451` 이 의도 명시).
- **#22 집행 수단 부재 명시**: `backend/migrations/` **172차 정지**(최신 `20260527_172_002`) → 조직 스키마는 `ensureTables` 멱등 경로뿐. ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → Reconciliation·Retroactive 재계산은 **집행 수단부터 신규**.
- 🔴 **가드 신설 위치 = 기존 핸들러 확장.** 두 번째 순회 엔진·두 번째 그래프 스토어 신설 금지(헌법 Vol4 "Intelligence Layer 는 하나").
