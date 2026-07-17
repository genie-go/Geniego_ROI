# DSAR — Parent Organization Manager Fallback (§44)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §44 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 전면 `ABSENT` — **Traversal 할 부모가 없다**

§44 는 **Parent Organization 을 타고 올라가는 폴백**을 요구한다. 이는 ① **조직 계층**, ② **Manager 관계**, ③ **Traversal 엔진** 을 전제한다.

| 전제 | 실측 | 결론 |
|---|---|---|
| **조직 계층** | 🔴 §3.1 **18/18 `CONTRACT_ONLY`** — `ORGANIZATION_*` **backend/src grep 0** · ADR §2 가 *"실 코드·테이블·노드 = 0건 · 계약 명세 확정"* **자인** | 🔴 ★**§44 의 Traversal 대상 자체가 `CONTRACT_ONLY`** |
| **팀 트리** | 🔴 **`parent_team_id` grep 0** — `team` DDL(`TeamPermissions.php:148` MySQL / `:168` SQLite)에 부모 컬럼 **없음** | 🔴 **팀 트리 자체가 없다** |
| **Manager 관계** | `manager_id`·`reports_to`·`supervisor_id`·`head_id` **전부 grep 0** · git 삭제 이력 0 | `ABSENT` |
| **Traversal 엔진** | 🔴 **`WITH RECURSIVE` grep 0** · Recursive CTE / Closure Table / Graph Query / Path Prefix **전부 0** | `ABSENT` |
| **Climb 상한** | 🔴 **`max_climb`·`maximum_climb`·`hierarchy_climb` grep 0** | `ABSENT` |

> 🔴 ★**핵심(규칙 10) — "무제한 Parent Traversal 을 허용하지 마라"(원문 `:1646`)를 현행이 위반하지 않는 것은 traversal 할 부모가 없어서다.**
> **준수가 아니라 무대상이다.** 이를 "§44 준수"로 계산하면 **우연한 일치를 준수로 계산하는 오판**이며, 부모 컬럼을 추가하는 **바로 그 순간 위반이 활성화**된다.

### ★ 유일한 부모 포인터 — `app_user.parent_user_id` = **보고선이 아니다**

`app_user.parent_user_id`(정의 `UserAuth.php:156-167` · 주석 `:156` · **nullable**) = 🔴 **테넌트 소속 포인터** · **owner 직속 2단 봉인**.

- **전 생성경로가 owner 직속**: `:1226-1227`(주석 `:1225` *"항상 최상위 owner 에 종속"*) · **`EnterpriseAuth.php:500`**(`(int)$owner['id']` · `:494-496` owner 조회) · `:1574/1581`(`$masterId`) · `:670`(null). → **3단 경로 없음.**
- **순회 = 단일 홉**: `resolveTenantId:200-217` — **`LIMIT 1` 1회 · 재귀 없음** · 하위계정이 상위 owner tenant_id 를 **그대로** 물려받음(`:197`·`:214`)
- 🔴 **★3단 허용 시 `resolveTenantId` 단일 홉 가정이 붕괴 → 286차 Growth Center tenant 하이재킹과 동형 사고.** **일반화가 선결.**

→ **§44 의 "Organization Path" 로 계산 금지** — 소속 포인터이지 조직 경로가 아니며, **깊이 2 로 봉인**돼 있어 climb 개념이 성립하지 않는다.

### ★ Traversal 선례 — **도메인만 다르고 기법은 REAL (2/6)**

§57 이 요구한 6방식 중 **2방식 실재**. 🔴 **★경로 접두 필수: `backend/src/Handlers/PM/…`** (**`backend/src/PM/` 는 존재하지 않는다** — 5-3-3-1 문서 25편에 오표기 전파).

| 기법 | 실재 | 증거 | §44 적용 |
|---|---|---|---|
| **DFS** | ✅ | `Handlers/PM/Dependencies.php:79-100` — 반복형 DFS + **`$visited`** + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34`(422 `cycle_detected`)** + self-loop `:29-31` | ✅ **채택 후보**(알고리즘만) |
| **Topological Sort** | ✅ | `Handlers/PM/Gantt.php:104-125` — Kahn · `:119` `count($topo)!==count($taskMap)` 정석 · `:120-125` **500 아닌 부분결과+경고 degrade** · ⚠️ **탐지 후 차단 안 함**(읽기 경로) | 참조 |
| Recursive CTE / Closure Table / Graph Query / Path Prefix | ❌ | **전부 0** | — |

🔴 **그 외 순환 코드 3건 전부 §44/§57 미달**:
- `AdminMenu::wouldCycle:540-555` — **`$visited` 없음** · `menu_tree` **tenant_id 없음**
- `JourneyBuilder:511-518` — **런타임 탐지이지 쓰기 전 차단 아님** · `:512` 주석이 *"작성자 JSON acyclicity 검증 없음"* **자인**
- 🔴 **`ChannelSync.php:955-962` 는 순환 검출기가 아니다** — `$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 조용히 절단**. **§44 `Maximum Climb` 선례로 계산 금지**

★ **`Dependencies.php:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → **`Maximum Climb` 으로 계산하면 오판**.
★ **`:90-91` 이 `dep_type` 을 술어에 안 넣어 전 타입 무차별 순회** → **§11 Manager Type 27종별 정책 표현 불가**. 🔴 **`pm_task_dependencies` 스키마 복제 금지** — 이 결함을 물려받으면 **설계 시점에 이미 불가능**해진다.

### 🔴 `graph_node`/`graph_edge` 주의

`Db.php:816-839` 가 **스키마 쌍둥이** → 조직 그래프 신설 시 **두 번째 그래프 스토어 = 헌법 위반** 위험. **`KEEP_SEPARATE_WITH_REASON` 의 근거는 "다른 것"이 아니라 게이트 사실**: `GraphScore.php:57-59` **화이트리스트 `['influencer','creative','sku','order']` → 422** 가 조직/Subject 노드 저장을 **막는다**. ⚠️ `graph_node` **인덱스·UNIQUE 0**(`:816-824` = id PK 뿐 · `:838-839` 는 **edge 전용**) · **내부 생산자 0 → `VACUOUS` 미배제**.

## 1. 원문 전사 + 판정 — **원문 9종**

원문: *"Parent Organization Manager를 사용할 때 다음을 검증하라."*(`:1634`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 같은 Tenant인가 | ✅ **기법 선례 REAL** — `Dependencies.php:91` **매 홉 tenant 필터**(순회 중 이탈 차단) · `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) · 🔴 **반례**: `AdminMenu::wouldCycle:540-555` `menu_tree` **tenant_id 없음** · `admin_growth_approval` **tenant_id 컬럼 없음**(`AdminGrowth.php:142-149`) · 🔴 **단 검사할 조직 계층이 0** | `LEGACY_ADAPTER`(기법만) |
| 2 | 허용된 Hierarchy Type인가 | 🔴 **Hierarchy Type 축 0** — §3.1 `CONTRACT_ONLY` · 🔴 `team.team_type VARCHAR(48)` **무검증 대입**(`createTeam:461`) · **ENUM/CHECK/`in_array` 0** → **"열거에 없다"는 논증 무효**(규칙 11) | `ABSENT` |
| 3 | 유효한 Organization Path인가 | 🔴 **Path 개념 0** — `parent_team_id` **grep 0** · Path Prefix **0** · 🔴 `app_user.parent_user_id` 는 **테넌트 소속 포인터**(`UserAuth.php:156-167`)이며 **owner 직속 2단 봉인** → **Path 아님** | `ABSENT` |
| 4 | Maximum Climb을 초과하지 않는가 | 🔴 **`max_climb`·`hierarchy_climb` grep 0** · ★`Dependencies.php:84` `$depth<10000` = **방문 노드 예산**(깊이 캡 아님 · `:97` pop 마다 증가) · 🔴 `ChannelSync.php:955-962` = **`$visited` 없이 깊이만 자름**(순환 시 조용히 절단) — **선례 계산 금지** | `ABSENT` |
| 5 | Legal Entity Boundary를 넘는가 | 🔴 **법인 엔티티 0** — `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`) · FK·감독관계 전무 · 🔴 **`DATA_SCOPES 'company'` = 무제한 센티넬**(`effectiveScope():258`) — 법인 아님 → **넘을 경계가 없다** | `ABSENT` |
| 6 | Cross-Legal-Entity 정책이 있는가 | 🔴 법인 경계 0 → 정책 대상 0 · 인접 = `BLOCKED_CROSS_TENANT` 개념(테넌트 축)뿐 | `ABSENT` |
| 7 | 해당 Manager Type이 Approval Domain과 일치하는가 | 🔴 **양변 부재** — Manager Type 축 0(`team.manager_user_id` **단일 칸**) · Approval Domain 축 0(`required_approvals` 유일 생산자 `Mapping.php:210` **리터럴 `2` 하드코딩**) → **일치 검사가 자동 통과 = 가짜 녹색 위험**(§66 이중 공허와 동형) | `ABSENT` |
| 8 | Manager Eligibility를 충족하는가 | 🔴 **적격 술어 0** — 승인 4경로 전량이 **"호출자가 곧 승인자"**(`Mapping::approve:246` 요청자 본인 · `Catalog::approveQueue:2341-2365` **행위자를 읽지도 않음**) · 🔴 **§76 실재 사례: "Manager 라는 이유만으로 Approval Authority 자동 부여"**(`UserAuth.php:1064`·`TeamPermissions.php:136`) | `ABSENT`(🔴 실재 결함 有) |
| 9 | Root까지 도달했는데도 Manager가 없는가 | 🔴 **Root 개념 0** — 트리가 없다 · 🔴 §43 폴백 정책 **전면 `ABSENT`**(`fallback_policy` grep 0) → **소진 시 처리 미정의** | `ABSENT` |

> ★ **원문 9종은 `evidence` 로 끝나지 않는다**(`Root까지 도달했는데도 Manager가 없는가` 가 마지막 · `:1644`). **추가하지 않았다**(규율 규칙 4 반대편향 방지).

**실측 개수: 9 / 9 전사.** (측정기 9 · 원문 대조 9 · 전사 9 — **3자 일치**.)
커버리지 = **`ABSENT` 8 · `LEGACY_ADAPTER` 1 · 커버 0**.

## 2. 규칙

- ★ **§44 전면 판정 = `ABSENT`.** 🔴 **★Traversal 대상인 조직 계층 자체가 `CONTRACT_ONLY`**(§3.1 **18/18** · `ORGANIZATION_*` backend grep 0 · ADR §2 자인) 이고 **`parent_team_id` 는 grep 0**(팀 트리 없음)이다.
- 🔴 **★규칙 10 — "무제한 Parent Traversal 금지"를 현행이 위반하지 않는 것은 traversal 할 부모가 없어서다.** **준수가 아니라 무대상.** 📌 **부모 컬럼을 추가하는 그 순간 위반이 활성화**되므로, **`maximum hierarchy climb` 상한은 부모 컬럼과 동시에 도입**해야 한다. 나중에 붙이면 그 사이가 무제한이다.
- 🔴 **★`app_user.parent_user_id` 를 Organization Path 로 쓰지 마라.** **테넌트 소속 포인터**(`UserAuth.php:156-167` · 주석 `:156`)이며 **전 생성경로가 owner 직속**(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`)으로 **2단 봉인**돼 있다. 🔴 **3단 허용 시 `resolveTenantId:200-217` 의 단일 홉 가정(`LIMIT 1` 1회·재귀 없음)이 붕괴 → 286차 Growth Center tenant 하이재킹과 동형 사고.** **일반화가 선결이며, 조직 계층과 소속 포인터는 반드시 분리하라.**
- ★ **Traversal 은 `Dependencies.php:79-100` 알고리즘을 이식하라** — 반복형 DFS + **`$visited`** + **매 홉 tenant 필터(`:91`)** + **쓰기 전 차단(`:32-34` 422)** 이 §44 ①④와 정확히 맞물린다.
  - 🔴 **단 스키마는 복제 금지**: `pm_task_dependencies` 는 **`:90-91` 이 `dep_type` 을 술어에 안 넣어 전 타입 무차별 순회** → **Manager Type 별 정책 표현 불가**. **이 결함을 물려받으면 설계 시점에 이미 불가능해진다.**
  - 🔴 **`:84` `$depth<10000` 을 `Maximum Climb` 으로 계산 금지** — **방문 노드 예산**이다(`:97` `$depth++` 가 pop 마다).
  - 🔴 **`ChannelSync.php:955-962` 를 후보로 계산 금지** — `$visited` 없이 **깊이만 자른다** → 순환 시 **탐지 없이 조용히 절단**. §44 는 **명시적 검증**을 요구하지 조용한 절단이 아니다.
  - 🔴 **경로 접두 주의**: `backend/src/Handlers/PM/…` — **`backend/src/PM/` 는 존재하지 않는다**(문서 25편 오표기 전파).
- 🔴 **★⑦⑧ 은 "자동 통과 = 가짜 녹색" 위험이 가장 크다.** Manager Type 축도 Approval Domain 축도 **양쪽이 0** 이므로, **일치 검사를 그대로 구현하면 항상 통과**한다(§66 이중 공허 · 288차 `ok=>true` 위장과 동형). **양변 선언이 검사에 선행**한다.
- 🔴 **★§76 실재 결함 — "Manager 라는 이유만으로 Approval Authority 자동 부여"**(`UserAuth.php:1064`·`TeamPermissions.php:136`). **Manager Eligibility 는 `team_role='manager'` 문자열 검사로 대체될 수 없다** — **이 문자열 하나에 승인 권한이 걸려 있는 것이 현행 결함**이며, §44 ⑧ 은 그것을 **명시적 적격 술어로 대체하라**는 요구다.
- 🔴 **`graph_node`/`graph_edge`(`Db.php:816-839`)로 조직 그래프를 구현하지 마라** — **스키마 쌍둥이 신설 = 두 번째 그래프 스토어 = 헌법 위반**. 분리 근거는 **게이트 사실**(`GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422**)이다. ⚠️ `graph_node` **인덱스·UNIQUE 0** · **내부 생산자 0 → `VACUOUS` 미배제**.
- 🔴 **⑨ Root 소진 시 처리는 §43 에 종속** — §43 전면 `ABSENT`(`fallback_policy` grep 0). **기본값은 fail-closed**(`BLOCK_APPROVAL`/`CREATE_MANUAL_REVIEW`). 🔴 **현행 fail-open 전례 답습 금지**(`is_active NOT NULL DEFAULT 1` `Db.php:1106` — 미지가 자동 "가용" · `index.php:508-545` 레이트리밋 fail-open).
- 🔴 **9종 "있다고 가정"하고 배선 금지.**
