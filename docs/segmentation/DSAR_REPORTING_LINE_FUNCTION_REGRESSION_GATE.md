# DSAR — 검증 게이트 (§90)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §90 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★정직 등급 — **실 코드 0 → 전건 `CONTRACT_ONLY`**

🔴 **§90 은 "완료 전에 확인하라"를 묻는다. 그러나 확인 대상 구현이 0건이다.** 본 차수 산출은 **비파괴 설계 명세(코드변경 0)** 이므로 §90 40항목 중 **설계 계약으로 확정된 것과 실 코드로 확인된 것을 엄격히 구분**한다.

- `ORGANIZATION_*` **backend 전역 grep 0** · `DSAR_ORGANIZATION_*` 70편은 **문서**이며 ADR §2 가 *"실 코드·테이블·노드 = 0건 · 계약 명세 확정"* **자인**.
- 🔴 **문서 존재를 구현 존재로 계산하면 역산.** §58 Lint 28 + §59 Guard 24 도 전건 `CONTRACT_ONLY`.

### ★기능후퇴 0 — **코드변경 0 이므로 자명**

본 차수 산출 = `docs/segmentation/*.md` **신규 파일뿐**. `backend/src`·`frontend/src` = **Read/Grep 전용**. → **§90 #37("기존 Reporting 기능의 회귀가 없는가") 는 코드변경 0 으로 충족.** 🔴**단 이는 "회귀 테스트가 통과했다"가 아니라 "변경이 없다"이다** — 실 구현 세션에서는 **재확인 필수**.

### ★`EquivalenceProof` 선행 의무

실 구현 세션에서 기존 자산(`team.manager_user_id`·`team_role='manager'`·`pm_projects.owner_user_id`)에 손대려면 **`EquivalenceProof` 가 선행**해야 한다. 🔴**특히 승인 통합 시**: `Catalog::approveQueue` 는 `Mapping` 의 maker-checker(actor·정족수·자기승인차단)를 **전혀 갖지 않으므로**, 등가 증명 없는 "중복 제거"는 **`Mapping` 능력 소실**이다.

### ★가드 등급 3단 (실측)

| 등급 | 실측 |
|---|---|
| `WIRED(pre-commit·로컬)` | ★`core.hooksPath`=`.githooks` 는 **본 클론에 설정됨** · **신규 클론 기본 미설정** · `--no-verify` 우회 가능 → 🔴**보장 아님** |
| `WIRED(CI·탐지)` | `security-scan.yml` `repo-guards` · 규칙 SSOT `tools/scan_secrets.sh` |
| 🔴 `ENFORCED(예방)` | **현행 부재** — **브랜치 보호 + required check 미설정**(G-06b) → 원문 "차단하라" **미충족** |

### 🔴 ★manager/reporting 회귀 커버리지 = **0** (실측 재확인)

| 도구 | 실측 | 판정 |
|---|---|---|
| `tools/e2e/render.mjs:37` | `/user-management`·`/team-members`·`/team` **포함** — 🔴**그러나 `:15` 가 스스로 한계 자인**: *"마운트 렌더만 커버. 클릭/폼 제출·데이터 채워진 상태의 상호작용 유발 크래시는 미커버"* | **마운트 크래시만 검사 = 회귀 커버 아님** |
| `tools/e2e/smoke.mjs:84` | 🔴**이름 함정** — `{ path:'/api/performance/meta-ads', arrayKey:'campaigns', keys:['team','roas'] }` = **Meta Ads 캠페인 계약키**(조직 team 아님 · 실측 재확인) | **무관** |
| `tools/e2e/scenarios.mjs` | 매니저 시나리오 **0** | **부재** |

→ ★**`/team` 이 render.mjs 목록에 있다는 이유로 "회귀 커버됨"으로 계산하면 규칙 7 위반**(이름이 아니라 능력으로).

## 1. 원문 전사 + 판정 — **원문 40종**

> ★측정기 40 / 원문 대조 40 / 전사 40 — **일치**.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Reporting Line Registry가 구축되었는가 | 실 코드 0 · 계약만 | `CONTRACT_ONLY` |
| 2 | Reporting Line Definition과 Version이 분리되는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 3 | Active Version이 Immutable한가 | 실 코드 0 · 인접 선례 = `menu_audit_log.hash_chain`(`AdminMenu.php:128`) 🔴**쓰기 체인만 실재·`verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님**(검증형 정본 = `SecurityAudit::verify():56-68`) · 🔴**tenant_id 없음 → 알고리즘만 이식** | `CONTRACT_ONLY` |
| 4 | Supervisory Hierarchy와 Version이 구축되는가 | 실 코드 0 · 🔴**`parent_team_id` 없음 → 팀 트리 자체가 없다** | `CONTRACT_ONLY` |
| 5 | Manager Relationship Type이 Registry화되는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 6 | Subject·Position·Organization 기반 관계가 분리되는가 | 실 코드 0 · 현행은 **`team.manager_user_id` 팀당 1칸뿐** | `CONTRACT_ONLY` |
| 7 | Direct Manager가 Effective-dated인가 | 실 코드 0 · 🔴**`effective_to`/`valid_to`/`valid_from` grep 0** | `CONTRACT_ONLY` |
| 8 | Administrative Manager와 Functional Manager가 구분되는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 9 | Dotted-line Manager가 Secondary로 처리되는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 10 | Project·Program Manager가 Resource Scope를 가지는가 | 실 코드 0 · 🔴`pm_projects.owner_user_id` = **무판독 라벨**(`WHERE owner_user_id` grep 0) · **Program 개념 0**(주석 팬텀) | `CONTRACT_ONLY` |
| 11 | Regional·Country Manager가 Geography Scope를 가지는가 | 실 코드 0 · 🔴`wms_warehouses.manager` = **시설 담당자 자유텍스트**(`NAME_ONLY`) | `CONTRACT_ONLY` |
| 12 | Cost Center·Profit Center Manager가 Financial Scope를 가지는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 13 | **Acting Manager가 원래 Manager를 삭제하지 않는가** | 🔴**현행 위반 실재** — `TeamPermissions.php:492-501` **전임자 강등 없음**(§76 실재 ①) | `CONTRACT_ONLY`(🔴**차단 대상 실재**) |
| 14 | Temporary Manager에 종료일이 강제되는가 | 실 코드 0 · **`acting`·`vacan` grep 0** | `CONTRACT_ONLY` |
| 15 | Interim Manager에 Vacancy Reference가 강제되는가 | 실 코드 0 · 🔴**`interim` 1건 = 지오리프트 중간결과**(무관) | `CONTRACT_ONLY` |
| 16 | Co-manager Policy가 지원되는가 | 실 코드 0 · ⚠️**`team.manager_user_id` 1칸 = 여러 개를 표현할 수단이 없다**(규칙 10) | `CONTRACT_ONLY` |
| 17 | Manager Assignment Scope와 Priority가 구축되는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 18 | Eligibility Foundation이 구축되는가 | 실 코드 0 · 🔴**적격 술어 0**(`Mapping::approve` 는 **정족수(숫자)뿐**) | `CONTRACT_ONLY` |
| 19 | Manager 관계가 Bitemporal 또는 Effective-dated인가 | 실 코드 0 · ★**§38 Business/System Time 이중 시간축 전례 0** | `CONTRACT_ONLY` |
| 20 | Future-dated Manager Change가 지원되는가 | 실 코드 0 | `CONTRACT_ONLY` |
| 21 | Retroactive Correction이 Version으로 기록되는가 | 실 코드 0 · 🔴**★집행 수단 없음**: `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지** | `CONTRACT_ONLY`(🔴**경로 부재**) |
| 22 | Vacancy·Missing Manager Policy가 구축되는가 | 🔴**현행 위반 실재** — `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 이어도 **전임자 `team_role='manager'` 잔존**(§76 실재 ②) | `CONTRACT_ONLY`(🔴**차단 대상 실재**) |
| 23 | Supervisory Graph Node·Edge가 구축되는가 | 실 코드 0 · 🔴**`graph_node`/`graph_edge`(`Db.php:816-839`) 스키마 쌍둥이 신설 = 두 번째 그래프 스토어 = 헌법 위반**. `KEEP_SEPARATE_WITH_REASON` 근거 = **게이트 사실**(`GraphScore.php:57-59` 화이트리스트 → 422) | `CONTRACT_ONLY` |
| 24 | Supervisory Path가 구축되는가 | 실 코드 0 — **Closure Table·Materialized Path·Recursive CTE 전부 0** | `CONTRACT_ONLY` |
| 25 | Manager Chain Reference가 구축되는가 | 실 코드 0 · **순회는 단일 홉**(`resolveTenantId:200-217`) | `CONTRACT_ONLY` |
| 26 | Manager Candidate가 생성되는가 | 실 코드 0 · ★**`ABSENT`** — **후보를 계산하는 코드가 레포에 없다** | `CONTRACT_ONLY` |
| 27 | Candidate Deduplication이 작동하는가 | 실 코드 0 · 인접 `Mapping.php:278-283` — ⚠️**API키/세션 경로 전환으로 우회 가능**(등급 미부여 · 실 경합 경로 미검증) | `CONTRACT_ONLY` |
| 28 | Self-reporting이 차단되는가 | 실 코드 0 · 인접 선례 = self-loop 차단 `Dependencies.php:29-31` · 자기승인 차단 `Mapping.php:268-271` | `CONTRACT_ONLY`(선례 이식) |
| 29 | Circular Reporting이 차단되는가 | 실 코드 0 · 알고리즘 선례 **6방식 중 2/6**(DFS `Dependencies.php:79-100` **쓰기 전 차단 `:32-34`** · Kahn `Gantt.php:104-125` ⚠️**차단 안 함**) 🔴**`ChannelSync.php:955-962` 후보 계산 금지**(`$visited` 없이 깊이만 자름 → **조용히 절단**) | `CONTRACT_ONLY`(알고리즘 이식) |
| 30 | Cross-Tenant Manager가 차단되는가 | 실 코드 0 · 선례 `Dependencies.php:91`(매 홉 tenant 필터) 🔴**반례 복제 금지**: `admin_growth_approval`·`menu_tree`·`menu_audit_log` **tenant_id 없음** · `AdminMenu::wouldCycle:540-555` tenant 술어 0 | `CONTRACT_ONLY` |
| 31 | Cross-Legal-Entity 관계가 명시적으로 통제되는가 | 실 코드 0 · **Legal Entity Officer `ABSENT`** · 🔴**`DATA_SCOPES 'company'` = 무제한 센티넬**(법인 아님) | `CONTRACT_ONLY` |
| 32 | Manager Snapshot이 생성되는가 | 실 코드 0 · **`Actor Authorization Snapshot` `ABSENT`** · 🔴**`snapshot` grep 최다 히트 = CCTV JPEG**(`WmsCctv.php:45`) | `CONTRACT_ONLY` |
| 33 | 과거 Manager 관계가 재현되는가 | 실 코드 0 · 🔴**정면 반례**: `AgencyPortal.php:304`·`:381` **`revoked_at=NULL` 로 이력 물리적 소멸**(§55 위반) | `CONTRACT_ONLY`(🔴**차단 대상 실재**) |
| 34 | Manager Change가 Active Task에 미치는 영향이 계산되는가 | 실 코드 0 · **이중 무대상**(캐시 0 · Candidate 0) | `CONTRACT_ONLY` |
| 35 | HRIS·ERP·IdP·Canonical Reconciliation이 작동하는가 | 실 코드 0 · ★**이중 공허**(좌변 source·우변 canonical **양쪽 부재**) · **manager 보유 소스 = 0개** · 🔴**양변 부재 → 자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장 동형) | `CONTRACT_ONLY`(**무대상**) |
| 36 | 최소 Static Lint·Runtime Guard가 작동하는가 | §58 Lint 28 + §59 Guard 24 **전건 `CONTRACT_ONLY`** · 🔴**`ENFORCED(예방)` 등급 현행 부재**(브랜치 보호+required check 미설정 G-06b) → 원문 "차단하라" **미충족** | `CONTRACT_ONLY`(🔴**예방 등급 부재**) |
| 37 | **기존 Reporting 기능의 회귀가 없는가** | ✅ **본 차수 코드변경 0 → 충족.** 🔴**단 "테스트 통과"가 아니라 "변경 없음"이다.** ★**manager/reporting 회귀 커버리지 = 0**(`render.mjs:37` 은 **마운트 크래시만** `:15` 자인 · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 계약키** 이름 함정 · `scenarios.mjs` 매니저 0) | `VALIDATED_LEGACY`(**코드변경 0 한정**) 🔴**커버리지 0 — 실 구현 시 신설 필수** |
| 38 | 중복 Manager Resolver가 생성되지 않았는가 | ✅ **본 차수 코드변경 0 → 충족.** ★**애초에 Manager Resolver 가 0개**(§76) — 🔴**"중복 0"을 정합으로 계산 금지**(규칙 9) | `VALIDATED_LEGACY`(**코드변경 0 한정**) |
| 39 | ADR·PM·Repeat Problem·Agent History가 갱신되었는가 | 본 차수 산출 = `docs/segmentation/*.md` 6편 + ADR 연결 · **NEXT_SESSION 갱신은 사용자 승인 후** | `CONTRACT_ONLY`(**승인 대기**) |
| 40 | 다음 Approval Chain Definition 단계가 실행 가능한가 | ⚠️ **선결 조건 미충족** — Canonical 선언·Manager Candidate·Eligibility 가 **전부 부재**하므로 Approval Chain 은 **결선할 대상이 없다.** 🔴**단 `Alerting::actor:33-36` 잠복 결함**(`X-User-Email` 헤더 위조가능)이 **생산자 배선 순간 활성화** — Chain 단계 진입 전 **선행 차단 필요** | `CONTRACT_ONLY`(🔴**선결 부재**) |

**실측 개수: 40 / 40 전사.** 분포 = `CONTRACT_ONLY` **38** · `VALIDATED_LEGACY` **2**(#37·#38 — 🔴**"코드변경 0" 한정이며 기능 충족의 증거가 아니다**).

## 2. 규칙

- 🔴 **★40항목 중 38 이 `CONTRACT_ONLY`** — 실 코드 0. **문서 70편·본 6편의 존재를 구현 존재로 계산하면 역산이다.** ADR §2 가 *"실 코드·테이블·노드 = 0건"* 을 자인한다.
- 🔴 **#37·#38 의 `VALIDATED_LEGACY` 를 확대 해석 금지.** "코드변경 0 이므로 회귀 0 · 중복 0" 일 뿐이며, **회귀 테스트가 통과했다는 뜻도 · 기능이 충족됐다는 뜻도 아니다**(규칙 9).
- 🔴 **★manager/reporting 회귀 커버리지 = 0 — 실 구현 세션의 선결 과제다.** `render.mjs:37` 에 `/team` 이 있다는 이유로 커버로 계산하면 규칙 7 위반(`:15` 가 **마운트 렌더만** 자인). `smoke.mjs:84` `keys:['team','roas']` 는 **Meta Ads 캠페인 계약키**이지 조직 team 이 아니다.
- 🔴 **`ENFORCED(예방)` 등급이 없다** — 현행 최고 등급은 `WIRED(CI·탐지)` 이며 pre-commit 은 `--no-verify` 로 우회 가능하고 신규 클론에 `core.hooksPath` 가 기본 미설정이다. **원문 "차단하라"를 충족하려면 브랜치 보호 + required check 가 선행**(G-06b).
- 🔴 **`EquivalenceProof` 선행 의무** — 기존 자산 변경 시 필수. 특히 **승인 통합에서 `Catalog::approveQueue` 는 `Mapping` 의 maker-checker 를 전혀 갖지 않으므로**, 등가 증명 없는 통합은 **능력 소실**이다.
- 🔴 **#13·#22·#33 은 "확인하라"가 아니라 "현행이 이미 위반 중"이다** — 통과 여부를 묻기 전에 **차단 대상이 실재**한다. #31 Eligibility(§76 실재 ③ `UserAuth.php:1064`·`TeamPermissions.php:136`)도 동일.
- 🔴 **#40 진입 전 `Alerting::actor:33-36` 을 선행 차단하라** — `action_request` 는 현재 **VACUOUS**(생산자 0)이나, **생산자를 하나 붙이는 순간 위조가능 승인(`X-User-Email` 헤더 · `?actor=` 쿼리 · `'unknown'` 폴백)이 활성화**되며 `decideAction:591-595` 에는 **상태가드·자기승인차단·dedup·정족수가 전부 없다.**
- **실 구현·발송 수정은 별도 승인세션**(Golden Rule + verify + 배포승인). 본 차수는 **비파괴 설계 명세 · 코드변경 0**.
