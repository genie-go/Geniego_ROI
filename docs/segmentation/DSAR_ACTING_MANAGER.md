# DSAR — Acting Manager (§29)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §29 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★축 주의 ① — 🔴🔴 **`UserAdmin::impersonate` 를 Acting Manager 로 계산하지 마라**(최우선)

**주석은 "대행"을 6회 쓴다** — `UserAdmin.php:466`(*"회원세션(관리자 **대행** 열람)"*) · `:487`(*"관리자 계정은 **대행** 열람 금지"*) · `:492`(*"단기(2시간) **대행** 토큰 발급"*) · `:525`(*"프론트 **대행** 열람 배너 표시용"*) · `:70`(*"권한상승·**대행**·비번재설정 차단"*) · `routes.php:1664`·`:2700`.

**그러나 능력은 대행이 아니다** — 이것은 **신원 위장 열람**(impersonation)이다:

| 원문 §29 가 요구하는 능력 | `impersonate:472-529` 실측 | 판정 |
|---|---|---|
| 기간부 acting **Assignment 레코드** | **없음** — 발급물은 `user_session` 행 1개(`:496-497`) · `expires_at = +2시간`(`:495`) = **토큰 만료이지 대행기간 아님** | 부재 |
| **original manager reference** | **없음** — 위장 대상(`$user`)만 있고 **"원래 Manager"라는 참조가 존재하지 않는다** | 부재 |
| **covered scope**(대행 범위) | **없음** — `:501-506` 이 대상 회원의 tenant 를 **그대로** 해석 → 범위 축소·한정이 **원리적으로 불가**. 대상의 **전 권한을 통째로** 획득 | 부재 |
| Authority **상속 여부 플래그** | **없음** — 상속/비상속을 고를 축이 없다 | 부재 |

🔴 **결정적 반증**: `:487-490` 이 **관리자 계정 대행을 차단**한다(`plan==='admin'` → 403). 즉 이 기능은 **권한이 더 높은 주체를 대행할 수 없다** — 권한 대행의 정의와 **정반대**다. 대행은 "상급자 업무를 대신 수행"인데, 현행은 **하급자로 내려가 보는 것**만 허용한다.

★**규칙 8 실증**: 주석의 "대행" 6회를 근거로 §29 를 `PARTIAL` 로 계산하면 **오판**이다. 정의부(`:472-529`)를 Read 하면 기간부 Assignment·original manager 참조·covered scope **전무**. **주석이 축을 만들지 않는다.**

### ★축 주의 ② — `대행` 한글 grep 대량 히트 = **전부 비즈니스 도메인 · 직무대리 0건**

| 도메인 | 증거 | 성격 |
|---|---|---|
| 배송/구매**대행** | `ClaudeAI.php:1859`,`:1904`,`:1964`,`:1990-1991`,`:2000-2001`,`:2054-2056` · `MarketingDataHub.php:115`,`:183` | **물류 서비스업종** |
| 광고**대행사** | `AdminGrowth.php:871`(`'광고대행사'` = B2B 리드 세그먼트) · `TeamPermissions.php:718`(`'외부 대행사'` = **팀 프리셋 이름**) · `GeniegoKnowledge.php:420`,`:422`,`:499`,`:501`(카카오 공식 대행사 자격) · `routes.php:301`,`:306`,`:3145`(272차 Agency 콘솔) | **거래처 유형** |
| 결제**대행**(PG) | PG 도메인 | **금융 중개** |
| 운영자 **대행** 접수 | `Dsar.php:264`(*"정보주체 요청 접수(운영자 대행 접수)"*) | **고객 요청 대리 접수**(직원 직무대리 아님) |

★**`TeamPermissions.php:718` 특히 위험** — 조직/팀 파일 안에 `'외부 대행사'` 문자열이 있어 §29 검색 시 **최상위 오염원**이다. 실체는 `ORG_PRESET` **팀 이름**이다.

### ★축 주의 ③ — 영문 후보 전량 부재 또는 오염

| 토큰 | 실측 | 성격 |
|---|---|---|
| `acting` | **backend/src 0건** | — |
| `vacan`(vacancy/vacant) | **0건** | — |
| `deputy` · `stand_in` | **0건** | — |
| `substitute` | 0건 · `substitut` 1건 = `Migrate.php:203` *"단순 substitution"*(**타입 매핑 주석**) | 오염 |
| `interim` | **1건 = `AttributionEngine.php:672`** `$rj['interim']` = **지오리프트 중간결과** | 오염 |
| `proxy` | **7건 전부 HTTP 프록시** — `Connectors.php:3875`,`:3911`(Adobe 헤더) · `WmsCctv.php:799`(HLS) · `AdminMenu.php:21`·`PM/Events.php:17`(nginx 주석) · `UserAuth.php:3344`(`X-Real-IP`) | 오염 |

### ★판정 근거 — **이름·능력 양쪽 부재**(규칙 6·7)

- **이름**: 위 전 토큰 0건.
- **능력**: 기간부 위임 Assignment · original manager 참조 · covered scope · 상속 플래그 — **어느 것도 어떤 형태로도 없다**.
- ★**git 삭제 이력 0**(`acting_manager`·`deputy`·`vacancy`) → **팬텀도 유물도 아니다 — 존재한 적이 없다**.

→ **§29 전 13항목 `ABSENT`.**

## 1. 원문 전사 + 판정 — **원문 13종**

원문(`:1152`): *"`ACTING_MANAGER`는 원래 Manager의 업무를 일정 기간 대행한다."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | acting assignment reference | 기간부 Assignment 레코드 0 · `user_session`(`UserAdmin.php:496`)은 **인증 토큰이지 위임 배정 아님** | `ABSENT` |
| 2 | original manager reference | 🔴 **"원래 Manager"를 가리키는 참조가 레포 전역 0** · `manager_id`·`reports_to` 0 | `ABSENT` |
| 3 | acting manager subject or position | `Position` 개념 0 · Subject = `app_user` 뿐(직무 축 없음) | `ABSENT` |
| 4 | acting reason | 사유 컬럼 0 | `ABSENT` |
| 5 | start date | 0 · `user_session.created_at`(`:496`)은 **토큰 발급시각** | `ABSENT` |
| 6 | end date | 0 · `expires_at=+2h`(`UserAdmin.php:495`)는 **토큰 만료이지 대행 종료일 아님** · `valid_to`/`effective_to` **전역 0** | `ABSENT` |
| 7 | covered manager relationship types | Manager Relationship Type(§11) 축 자체가 0 → 커버 대상을 열거할 대상이 없다 | `ABSENT` |
| 8 | covered scope | 🔴 `impersonate:501-506` 은 대상 tenant 를 **통째로** 승계 — 범위 한정 **원리적 불가** | `ABSENT` |
| 9 | approval routing eligible 여부 | 승인자 후보 계산 코드 0(`resolveApprover`/`approval_chain`/`routeApproval` **0**) → 적격 플래그의 소비처가 없다 | `ABSENT` |
| 10 | approval authority inherited 여부 | 상속 플래그 0 · **상속할 Manager 관계 자체가 0** | `ABSENT` |
| 11 | explicit authority reference | Authority Matrix 0 | `ABSENT` |
| 12 | status | 대행 상태 0 · `team.status`(`TeamPermissions.php:148`)는 **팀 상태**(active/disabled/archived) | `ABSENT` |
| 13 | evidence | 0 | `ABSENT` |

**실측 개수: 13 / 13 전사.**
> 측정기 분모 **13** · 원문 대조 **13**(`:1156-1168`) · 전사 **13** — **3자 일치**. 원문이 `evidence` 로 **끝난다**(`:1168`) → 규칙 4에 따라 전사에 포함.

원문 말미 규범(`:1170`·`:1172`): *"Acting Manager 관계만으로 원래 Manager의 모든 Approval Authority를 자동 상속하지 마라. Authority 상속은 후속 Authority Matrix 정책으로 검증한다."*

★**규칙 10 적중** — 현행이 이 금지를 "위반하지 않는" 것은 **준수가 아니라 상속할 Manager 관계가 없어서**다. 다만 §76 이 지목한 *"Manager라는 이유만으로 Approval Authority 자동 부여"* 는 **`team_role='manager'` 문자열 축에서 이미 실재**한다(`UserAuth.php:1064`·`TeamPermissions.php:136`) → 신설 시 이 패턴을 **상속하지 마라**.

## 2. 규칙

- 🔴🔴 **`UserAdmin::impersonate:472-529` 를 Acting Manager 구현·참조·확장 지점으로 삼지 마라.** 주석의 "대행" 6회는 **신원 위장 열람**을 뜻한다. 확장하면 **2시간 만료 토큰이 무기한 직무대리로 둔갑**하고, `:487` 의 관리자 대행 차단이 **정반대 방향의 게이트**로 남아 설계가 처음부터 모순된다.
- 🔴 **`대행`·`proxy`·`interim`·`substitut` grep 결과를 §29 근거로 인용 금지.** 전량 비즈니스 도메인·HTTP·통계·주석이다. **직무대리 0건.**
- 🔴 **★§76 실재 항목 2건 — 신설 설계가 반드시 해소해야 한다**(부재라고 넘어가면 결함을 물려받는다):

  **① *"Acting Manager를 기존 Manager 덮어쓰기로 처리"*(원문 `:2678`) = 실재**
  `TeamPermissions::updateTeam:492-501` — `manager_user_id` 교체 시 `UPDATE team SET manager_user_id=?`(`:500`) 후 **신임자만 `promoteManager`**(`:501`). **전임자 강등 경로 0.**

  **② *"Vacant Position을 Active Manager로 처리"*(원문 `:2685`) = 실재**
  `promoteManager:768-776` 은 **승격 전용**(`:774` `team_role='manager'` UPDATE) — **강등 코드가 레포에 없다**. 실측: `team_role='manager'` **쓰기 사이트는 `:774` 단 1곳 · `team_role='member'` 로 되돌리는 UPDATE 전역 0**.
  → `manager_user_id=NULL`(`:493` 이 빈 문자열/NULL 을 **허용**한다)로 공석 처리해도 **전임자 `app_user.team_role='manager'` 가 잔존** → **위임 권한 계속 보유**: `isManagerAdmin:136`(`in_array(roleOf($c), ['owner','manager'])`) → `putMemberPermissions:618` 팀원 권한 위임 **계속 가능**.

  🔴 **★원문과 정반대**: §29 는 *"원래 Manager를 삭제하지 않는다"* 를 요구하지만 — **현행은 관계는 덮어쓰고(①: `team` 행에서 전임자 소멸) 권한은 누적한다(②: `app_user` 에 `manager` 잔존)**. **원문이 보존하라는 것(관계·이력)은 지우고, 원문이 통제하라는 것(권한)은 남긴다.** 정확히 뒤집힌 것이며, 신설 Acting Manager 를 이 위에 얹으면 **대행 종료 후에도 권한이 영구 잔존**한다.
- **★부여와 회수는 같은 축에서 설계하라.** ①②의 공통 원인은 **`team.manager_user_id`(관계) 와 `app_user.team_role`(권한) 이 분리된 채 승격만 동기화되고 강등은 동기화되지 않는 것**이다(`promoteManager` 는 있고 `demoteManager` 는 없다). **Acting 종료 = 권한 회수**가 **동일 트랜잭션에서 강제**되지 않으면 §29 는 성립하지 않는다.
- **§29 는 §30·§31 과 배타**: Acting = **기존 Manager 존재 + 일시 부재**(원문 `:1223`). 공석이면 §31 Interim 이다(`:1224`).
- 🔴 **13종 "있다고 가정"하고 배선 금지.** 전 항목 `ABSENT`(이름·능력 양쪽) · **git 삭제 이력 0 = 존재한 적 없음**.
