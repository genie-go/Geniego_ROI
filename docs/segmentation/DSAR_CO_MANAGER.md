# DSAR — Co-Manager (§32)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §32 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★핵심 — **`team.manager_user_id` 는 단일 칸이다 → 복수 관리자를 표현할 수단이 없다**

`manager_user_id` **backend/src 전수 grep = 10 히트 · 전량 단일 스칼라 취급**:

| file:line | 성격 | 카디널리티 |
|---|---|---|
| `TeamPermissions.php:148` | **MySQL DDL** — `manager_user_id INT NULL` | 🔴 **컬럼 1개 · 스칼라** |
| `TeamPermissions.php:168` | **SQLite DDL** — `manager_user_id INTEGER` | 🔴 **컬럼 1개 · 스칼라** |
| `:463` | `createTeam` 수령 — `(int)$b['manager_user_id']` **단일 캐스팅** | 1 |
| `:466` | `createTeam` INSERT — 값 1개 | 1 |
| `:492-495` | `updateTeam` 교체 — `manager_user_id=?` **1값 대입** | 1 |
| `:444-445` | 조회 — `manager_name` **단수 필드**로 투영 | 1 |
| `:17` | 주석 — *"`manager_user_id` 로 팀관리자 지정"* | — |

- 🔴 **N:N 조인 테이블 없음** — `team_manager`/`team_managers` 류 테이블 **0**. 관계는 **`team` 행에 인라인된 스칼라 FK 흉내**(실제 FK 제약도 없음).
- 🔴 **`team` 에 `parent_team_id` 없음**(`:148`·`:168`) → 팀 트리 자체가 없다 → *"동일 범위"*(원문 `:1230`)를 정의할 상위 구조도 없다.
- ★**시드는 manager 를 아예 넣지 않는다** — `seedOrg:739` INSERT 컬럼 **8개**(`tenant_id, name, description, team_type, status, created_by, created_at, updated_at`)에 **`manager_user_id` 부재** → **`ORG_PRESET` 15팀 전부 manager NULL**. 단 **쓰기경로는 REAL**(`createTeam:463-469` — 테넌트 소속 검증 `:464` 422 → INSERT `:466` → `promoteManager:469`).

### ★🔴 규칙 10 적중 — **가장 중요한 판정**

원문(`:1245`): *"Co-manager가 존재할 때 임의로 첫 번째 Manager만 선택하지 마라."*

현행은 이 금지를 **"위반하지 않는다"**. 🔴 **그러나 이것은 준수가 아니다** — **선택할 복수가 없어서**다.

- `manager_user_id` 가 **1칸**이므로 "첫 번째 Manager 를 고르는 코드"가 **존재할 수 없다**. `LIMIT 1`·`[0]`·`array_shift` 로 매니저를 고르는 지점이 **0개**인 이유는 **고를 배열이 애초에 없기 때문**이다.
- ★**우연한 일치를 준수로 계산 금지.** *"현행은 첫 번째만 선택하지 않는다 → §32 부분 충족"* 은 **역산**이다. 정확한 서술은 **"현행은 Co-Manager 를 표현할 수 없으므로 이 규범의 적용 대상이 아니다"**.
- ★**규칙 9 연쇄**: `manager_user_id` 1칸을 *"중복 없는 단일 SSOT"* 라고 부르면 **미달이 정합으로 위장**된다. **단일 칸은 정규화의 성과가 아니라 표현력의 한계**다.

### ★현행 스키마가 Co-Manager 를 만나면 — **조용한 축출**

`updateTeam:492-501` 에 두 번째 매니저를 지정하면 **UPDATE 가 첫 번째를 덮어쓴다**(`:495`·`:500`). 결과:

- **관계 축**: 전임자가 `team` 행에서 **소멸**(§76 *"Current Manager만 저장하는 구현"* `:2680` 적중 · 이력 0)
- **권한 축**: 🔴 **전임자 `app_user.team_role='manager'` 는 잔존** — `promoteManager:768-776` 은 **승격 전용**이고 **강등 경로가 레포에 0**(`team_role='manager'` 쓰기 사이트 `:774` 단 1곳 · `'member'` 복귀 UPDATE **전역 0**)

★**즉 현행에서 Co-Manager 를 시도하면 "복수 매니저"가 아니라 — 관계상 1명 · 권한상 2명이라는 불일치 상태**가 만들어진다. **원문이 요구하는 조율(responsibility split·decision policy)은 없이, 원문이 경계하는 복수 권한만 발생한다.** 이는 §29 §2 ①②·§31 과 **동일 근원**(부여만 있고 회수가 없음)이다.

### ★판정 근거 — **표현 수단 부재**(규칙 6·7)

`co_manager`·`co-manager` **0건** · N:N 조인 0 · `manager_user_id` 스칼라 1칸 · **git 삭제 이력 0** → **§32 전 10항목 `ABSENT`.**

## 1. 원문 전사 + 판정 — **원문 10종**

원문(`:1230`): *"`CO_MANAGER`는 동일 범위에 복수의 공식 Manager가 존재하는 구조다."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | co-manager group reference | 그룹 엔티티 0 · `co_manager` grep 0 | `ABSENT` |
| 2 | members | 🔴 **`team.manager_user_id`(`:148`) 단일 칸 — 복수 표현 불가** · N:N 조인 테이블 0 | `ABSENT` |
| 3 | responsibility split | 책임 분할 축 0 · `data_scope` **`UNIQUE(tenant_id,subject_type,subject_id)`**(`:164`) = **주체당 단일행을 스키마가 강제** → 분할 병존 **원리적 불가**(규칙 10 — 정책이 아니라 UNIQUE 가 금지) | `ABSENT` |
| 4 | primary coordination manager | primary/secondary 구분 축 0 — **구분할 복수가 없다** | `ABSENT` |
| 5 | decision policy reference | 결정 정책 0 · `Mapping.php:287` 정족수는 **매핑 변경요청 전용**이며 🔴 유일 생산자 `:210` 이 리터럴 `2` 하드코딩 → **정책이 아니라 상수** | `ABSENT` |
| 6 | approval routing policy | 승인자 후보 계산 코드 0(`resolveApprover`/`approval_chain`/`routeApproval` **전역 0**) · 승인 4경로 전량 **"호출자가 곧 승인자"** | `ABSENT` |
| 7 | conflict policy | 충돌 정책 0 — **충돌할 복수 매니저가 없다** · 🔴 `DELEGATION_EXCEEDED`(`TeamPermissions:645`)는 **권한 부여 상한**이지 Manager 대결 아님 | `ABSENT` |
| 8 | valid period | `valid_from`/`valid_to` **전역 0** · `manager_user_id` 에 시점 컬럼 0 | `ABSENT` |
| 9 | status | 0 · `team.status`(`:148`)는 **팀 상태**(active/disabled/archived) | `ABSENT` |
| 10 | evidence | 0 | `ABSENT` |

**실측 개수: 10 / 10 전사.**
> 🔴 **측정기 분모 16 · 원문 필수필드 10 · 전사 10 — 불일치를 사실대로 적는다**(규칙 3). 측정기가 센 16은 **필수 필드 10(`:1234-1243`) + 후속 Approval Chain 정책 선택지 6(`:1249-1254`)** 이다. 선택지 6종은 **§32 의 필수 필드가 아니라 후속 정책에 요구되는 열거**이므로 표에 전사하지 않고 아래 §2 규칙으로 이관했다.
> 원문이 `evidence` 로 **끝난다**(`:1243`) → 규칙 4에 따라 포함.

## 2. 규칙

- 🔴🔴 **★원문 `:1245`(*"임의로 첫 번째 Manager만 선택하지 마라"*)를 "현행 준수"로 계산 금지 — 규칙 10.** 현행이 첫 번째를 고르지 **않는 이유는 고를 복수가 없어서**다(`manager_user_id` **1칸**). **표현력의 부재를 준수로 계산하면 §32 의 갭이 정의상 소멸한다.**
- 🔴 **★`manager_user_id` 1칸을 "정규화된 단일 SSOT" 로 포장 금지 — 규칙 9.** 단일 칸은 성과가 아니라 **한계**다. **"중복 없음" ≠ "기능 충족".**
- 🔴 **★`team.manager_user_id` 확장으로 Co-Manager 를 구현하지 마라.** 컬럼을 CSV/JSON 으로 바꾸는 것은 **인덱스·FK·as-of 질의를 모두 포기**하는 길이며(전례: `approvals_json` `Mapping.php:285` = `{user,ts}` 2키 배열 → **인덱스·as-of 질의 불가** · `pm_baseline.captured_at` `Enterprise.php:360` = **DB 컬럼이 아니라 JSON 키** → `KV_ONLY`), `updateTeam:495` 의 **덮어쓰기 의미론**도 그대로 남는다. **관계는 별도 엔티티(멤버 N행 · append-only 이력)** 여야 하고 `team.manager_user_id` 는 **파생 투영**(primary coordination manager)이어야 한다.
- 🔴 **★복수 매니저 도입 전에 강등 경로가 선결이다.** 현행은 `promoteManager:768-776` **승격 전용 · 강등 0**(`team_role='manager'` 쓰기 `:774` 1곳 · `'member'` 복귀 UPDATE **전역 0**). 이 상태에서 Co-Manager 를 켜면 **members 에서 빠져도 `app_user.team_role='manager'` 가 잔존** → `isManagerAdmin:136` → `putMemberPermissions:618` 위임 권한을 **영구 보유**한다. **그룹 탈퇴 = 권한 회수**가 동일 트랜잭션에서 강제돼야 한다.
- **원문 `:1247-1254` — 후속 Approval Chain 정책은 다음 중 하나를 선택 가능해야 한다**(측정기가 필드로 오산한 6불릿의 정체 · **§32 의 필드가 아니라 후속 정책의 열거**):
  `ANY_ONE` · `ALL` · `PRIMARY_ONLY` · `DOMAIN_SPECIFIC` · `MANUAL_SELECTION` · `POLICY_RESOLVED`
  🔴 **6종 전부 현행 부재.** 인접 최근접은 `Mapping::approve:287` 정족수뿐이며 이는 **`ALL` 도 `ANY_ONE` 도 아닌 "숫자 N명"** 이고, 🔴 **N 은 리터럴 `2` 하드코딩**(`:210`)이라 **정책이 아니라 상수**다(= `menu_defaults.version` 리터럴 `'baseline'`(`AdminMenu.php:309`)이 **버전이 아니라 라벨**인 것과 동형). **"정족수가 있으니 `ALL` 을 지원한다"로 계산하면 규칙 7 위반.**
- 🔴 **★적격 술어가 없다는 사실을 잊지 마라.** `Mapping::approve:238-294` 의 판정축은 **정족수(숫자)뿐** — **누가 승인 자격이 있는가를 판정하는 술어가 0**이다. `ANY_ONE`/`PRIMARY_ONLY`/`DOMAIN_SPECIFIC` 은 전부 **"후보 집합에서 자격자를 고르는" 정책**이므로, **Approval Manager Resolver(현행 `ABSENT`)** 없이는 **6종 어느 것도 구현 불가**하다.
- **§32 는 §29·§30·§31 과 직교**: Co-Manager = **동시 복수**(구조) · Acting/Temporary/Interim = **시간축 대체**(1인). 🔴 **단 현행 강등 부재 때문에 §29/§31 을 순진하게 구현하면 의도치 않은 Co-Manager 가 발생**한다(전임자 권한 잔존) — **조율 정책 없는 복수 권한** = 최악의 형태. **§32 의 정책 축은 §29/§31 구현의 전제이기도 하다.**
- 🔴 **10종 "있다고 가정"하고 배선 금지.** 전 항목 `ABSENT` · **git 삭제 이력 0 = 존재한 적 없음**.
