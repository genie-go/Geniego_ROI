# DSAR — Temporary Manager (§30)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §30 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★핵심 — **원문이 강제하라는 것을 강제할 컬럼 자체가 없다**

원문(`:1197`·`:1199`)은 **종료일 강제**와 **Maximum Duration**을 요구한다. 현행 실측:

| 원문이 요구하는 강제 수단 | 실측 | 귀결 |
|---|---|---|
| `valid_to` | 🔴 **backend/src 전역 0** | 종료일을 **저장할 칸이 없다** |
| `valid_from` | **전역 0** | 시작일 없음 |
| `effective_to` | **전역 0** | — |
| Maximum Duration | 개념 0 | 상한을 **비교할 대상이 없다** |
| Renewal Count | 개념 0 | 갱신을 **셀 수 없다** |

★**"미구현"이 아니라 "무대상"이다.** 종료일 강제는 *컬럼에 값을 넣고 검증하는 일*인데, **컬럼이 없으므로 검증 로직을 붙일 자리조차 없다**. → **§30 을 `PARTIAL` 로 계산하면 오판.**

⚠️ **grep 부분문자열 함정(자진 신고)**: `valid_to` 는 대소문자 무시 검색 시 **`invalid_token` 에 히트**한다(`Onsite.php:396` `'invalid_token'`). 이는 **토큰 검증 에러 코드**이며 유효기간 컬럼이 아니다. `valid_to` **전역 0** 결론은 이 오염을 배제한 뒤에도 유지된다.

### ★유일 인접 자산 = `team.manager_user_id` — **시점 축이 통째로 없다**

- DDL `TeamPermissions.php:148`(MySQL)/`:168`(SQLite): `id · tenant_id · name · description · team_type · manager_user_id · status · created_by · created_at · updated_at`
- 🔴 **`manager_user_id` 에 붙은 시점 컬럼 0** — `created_at`/`updated_at` 은 **행 감사 타임스탬프**이지 **관계 유효기간이 아니다**. `updated_at`(`:498`)은 *"마지막으로 무언가 바뀐 시각"*일 뿐 **어느 매니저가 언제부터 언제까지였는지 복원 불가**.
- 🔴 **★§76 *"Current Manager만 저장하는 구현"*(원문 `:2680`) = 실재** — `manager_user_id` 는 **스칼라 1칸**이며 이력 테이블이 없다. `updateTeam:495` 의 `manager_user_id=?` UPDATE 는 **전임자 값을 물리적으로 덮어쓴다** → **이전 관계 소멸**.
  ★ 이는 §55 *"과거 Snapshot 대체 금지"* 의 반례이며, `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 해지 이력을 소거하는 것과 **동형 패턴**이다.
- 🔴 **★§76 *"Temporary Manager 종료일 없는 구현"*(원문 `:2679`) = 탐지 0 · 그러나 정합의 증거가 아니다**(규칙 9·10). **Temporary Manager 구현이 0개라서 0**이다. 축이 생기는 순간 현행 스키마 관행(시점 컬럼 0)을 물려받으면 **즉시 이 항목에 적중**한다.

### ★시점 축 선례 — **부재의 깊이가 축마다 다르다**(§38·§39 직결)

| 축 | 상태 | 교정 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有 · 질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | 질의 계층 |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805`) | **저장 계층 신설** |
| **Manager 관계** | **컬럼도 이력도 無 · 게다가 관계 축 자체가 無** | **엔티티 신설** |

★**Manager 시점 축은 셋 중 가장 깊은 부재다.** *"시점 컬럼만 붙이면 된다"* 는 일반화는 환율 축에서 이미 깨졌고, Manager 축에서는 **붙일 테이블조차 없다**. **§38 Business/System Time 이중 시간축 = 전례 0.**

### ★판정 근거 — **이름·능력 양쪽 부재**(규칙 6·7)

`temporary`(직무 의미) · `acting` · `deputy` · `stand_in` **0건** · `valid_from`/`valid_to`/`effective_to` **0건** · **git 삭제 이력 0** → **존재한 적이 없다**. → **§30 전 14항목 `ABSENT`.**

## 1. 원문 전사 + 판정 — **원문 14종**

원문(`:1178`): *"Temporary Manager는 특정 조직·Project·Program 또는 Transition 기간의 임시 관리자다."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | temporary assignment reference | Assignment 엔티티 0 | `ABSENT` |
| 2 | temporary manager | 임시 매니저 축 0 · `team.manager_user_id`(`:148`)는 **상시 1칸**(임시/상시 구분 불가) | `ABSENT` |
| 3 | target subject·position·organization | 🔴 **3축 전부 부재** — Position 0 · 조직 계층 0(`team` 에 **`parent_team_id` 없음** → 팀 트리 자체가 없다) · Program **주석 팬텀**(`Enterprise.php:13` 이 "포트폴리오/프로그램" 자칭하나 코드에 program 개념 0) | `ABSENT` |
| 4 | assignment purpose | 목적 컬럼 0 | `ABSENT` |
| 5 | relationship type | Manager Relationship Type(§11) 축 0 | `ABSENT` |
| 6 | scope | 🔴 `data_scope` 는 **`UNIQUE(tenant_id,subject_type,subject_id)`**(`:164`) = **주체당 단일행이 스키마로 강제** → 임시 배정용 **별도 범위 병존 불가** | `ABSENT` |
| 7 | valid_from | **전역 0** | `ABSENT` |
| 8 | valid_to | 🔴 **전역 0** — 원문 `:1197` 종료일 강제의 **대상 컬럼이 없다** | `ABSENT` |
| 9 | maximum duration | 0 — 상한 비교 대상 없음 | `ABSENT` |
| 10 | renewal count | 0 | `ABSENT` |
| 11 | approval routing eligibility | 승인자 후보 계산 코드 0(`resolveApprover`/`approval_chain`/`routeApproval` **전역 0**) | `ABSENT` |
| 12 | approval reference | 임시 배정을 승인한 결정 참조 0 · 기존 승인 4종 중 **어느 것도 조직 배정을 대상으로 하지 않는다** | `ABSENT` |
| 13 | status | 배정 상태 0 · `team.status`(`:148`)는 **팀 상태** | `ABSENT` |
| 14 | evidence | 0 | `ABSENT` |

**실측 개수: 14 / 14 전사.**
> 측정기 분모 **14** · 원문 대조 **14**(`:1182-1195`) · 전사 **14** — **3자 일치**. 원문이 `evidence` 로 **끝난다**(`:1195`) → 규칙 4에 따라 포함.

## 2. 규칙

- 🔴 **원문 `:1197`·`:1199`(*"종료일을 강제한다 / 무기한 Temporary Assignment를 허용하지 마라"*)를 "현행 준수"로 계산 금지.** 현행에 **무기한 Temporary Assignment 가 없는 것은 Temporary Assignment 자체가 없어서**다(규칙 10). **`valid_to` 전역 0** → 강제할 컬럼이 없다.
- 🔴 **`valid_to` grep 시 `invalid_token`(`Onsite.php:396`) 오염 배제.** 부분문자열 히트를 "유효기간 컬럼 존재"로 읽으면 규칙 7 위반.
- 🔴 **★종료일은 컬럼이 아니라 집행이다.** `valid_to` 컬럼만 추가하면 **세율 축의 실패를 그대로 복제**한다 — `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼이 있는데 `WHERE effective_from <= :as_of` 질의가 전역 0**이라 읽기 4개소가 전부 최신승이다. **컬럼 + as-of 질의 + 만료 집행(스케줄러/게이트) 3자가 함께**여야 §30 이 성립한다. **컬럼만 = 가짜 녹색.**
- 🔴 **★만료 = 권한 회수여야 한다(§29 §2 와 동일 결함 상속 경고).** `promoteManager:768-776` 은 **승격 전용이고 강등 경로가 0**이다(`team_role='manager'` 쓰기 사이트 `:774` 단 1곳 · `'member'` 로 되돌리는 UPDATE 전역 0). 임시 배정이 `valid_to` 로 만료돼도 **`app_user.team_role='manager'` 가 잔존**하면 `isManagerAdmin:136` → `putMemberPermissions:618` 위임 권한을 **영구 보유**한다. **만료가 권한을 회수하지 않으면 §30 은 무의미하다.**
- 🔴 **★§76 *"Current Manager만 저장하는 구현"*(원문 `:2680`) = 실재 — `team.manager_user_id` 단일 스칼라 · 이력 0 · `updateTeam:495` 가 전임자 값을 덮어쓴다.** 신설 Temporary Assignment 를 **`team` 행 UPDATE 로 표현하면 이 항목에 즉시 적중**한다. **배정은 별도 이력 엔티티(append-only)여야 하고 `team.manager_user_id` 는 파생 투영이어야 한다.**
- **Migration 제약(§39·§40 직격)**: `backend/migrations/` **21파일 · 172차 정지** → 신규 스키마는 마이그레이션 경로 없이 `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}`. 🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **기존 `manager_user_id` 값을 이력 엔티티로 이관할 집행 수단이 없다**. **MySQL/SQLite 두 방언 수기 중복 작성 의무**(`:148` vs `:168`).
- **§30 은 §29·§31 과 구분**: Temporary = **조직/Project/Transition 기간의 임시 관리자**(원문 `:1178`) · Acting = 기존 Manager **일시 부재**(`:1223`) · Interim = **Position 공석**(`:1224`).
- 🔴 **14종 "있다고 가정"하고 배선 금지.** 전 항목 `ABSENT`(이름·능력 양쪽) · **git 삭제 이력 0 = 존재한 적 없음**.
