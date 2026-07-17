# DSAR — Dotted-Line Manager (§21)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §21(1000-1024줄) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Dotted-line / Matrix | `dotted`·`matrix_report`·`secondary_manager` **backend/src grep 0** | `ABSENT` |
| **Secondary/Matrix 표현 수단** | 🔴 **0** — `team.manager_user_id`(`TeamPermissions.php:148` MySQL / `:168` SQLite) = **`INT NULL` 단일 칸** · `app_user.team_id` = **단일 컬럼(1인 1팀)** · 관계 N:N 테이블 **없음** | `ABSENT` |
| Manager Chain | 재귀 매니저 질의 **0개** · chain 개념 0 | `ABSENT` |
| priority | 관계 우선순위 축 0(`position_idx` = **PM 태스크 정렬순서** — 동명이축) | `ABSENT` |
| Workflow Policy | 승인 워크플로 정책 엔터티 0 · `required_approvals` **유일 생산자 `Mapping.php:210` 이 리터럴 `2` 하드코딩** | `ABSENT` |
| Self-approval 방지 | ⚠️`Mapping.php:268-271` **REAL** — 단 **actor vs 요청자** 비교이지 **Manager Chain 계산 아님** | `LEGACY_ADAPTER`(알고리즘 선례) |
| valid period | `valid_from`·`valid_to` **grep 0** | `ABSENT` |

**★축 주의 ① — Secondary/Matrix 는 "미구현"이 아니라 표현 수단이 0이다.**
Dotted-line 은 **정의상 Primary 와 병존하는 두 번째 관계**다. 현행에는 **하나를 담는 칸조차 관계가 아니다**: `team.manager_user_id` 는 **팀당 1칸**, `app_user.team_id` 는 **1인 1팀**, `data_scope` 는 **`UNIQUE(tenant_id,subject_type,subject_id)` `:164` 로 단일행이 스키마에 강제**되어 있다. 🔴**"Dotted-line 충돌이 없다"를 정합으로 계산하면 안 된다**(규칙 10) — **두 번째 관계를 담을 행을 만들 수 없어서 충돌이 발생할 수 없는 것**이다. **N:N 관계 엔터티 신설이 §21 전체의 선결 조건.**

**★축 주의 ② — `pm_task_assignees` 를 Matrix 선례로 계산 금지.**
`pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(migration `…168_005`)는 **레포에서 유일한 N:N + 역할 ENUM** 이라 형태가 §21 과 닮았다. 그러나 **태스크 배정 역할이지 매니저 관계가 아니다**(`pm_tasks` DDL 에 assignee·owner·manager 컬럼 **없음** · `created_by` 뿐). **형태만 이식 가능 · 의미·소유자는 신규**(§12 `journeys` 10종 오매핑과 동형 함정).

**★축 주의 ③ — `UserAdmin::impersonate:466-525` 를 Dotted-line/Acting 으로 계산 금지.**
주석이 **"대행"을 6회** 쓰지만(`:466`,`:492`,`:525`) **권한 대행이 아니라 신원 위장 열람**(관리자 2시간 토큰 `:492`)이다. 기간부 Assignment·original manager 참조·covered scope **전무**. 동형 오염원: **`대행` 한글 grep 대량 히트 = 전부 비즈니스 도메인**(배송/구매대행 · 광고**대행사** `TeamPermissions.php:718` · 결제**대행** PG) — **직무대리 0건** · **`proxy` 7건 전부 HTTP 프록시** · **`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672`).

**★축 주의 ④ — Manager 라는 이유만으로 승인권이 자동 부여되는 현행은 §21 기본값 "일반 Manager Chain: 제외"의 반례 토양이다.** `UserAuth.php:1064` · `TeamPermissions.php:136` — 적격 술어 없이 `'manager'` 문자열만으로 위임 권한이 열린다. **Dotted-line 을 `team_role='manager'` 로 표현하면 기본값 #10·#12 가 즉시 위반된다.**

## 1. 원문 전사 + 판정 — **원문 13종**(필수 속성 8 + 기본값 5)

### 1-1. 필수 속성 (원문 불릿 8)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | relationship purpose | **부재** — 관계 자체가 없으므로 목적 축도 0. 🔴`team.team_type VARCHAR(48)` 은 **팀 분류**이며 **무검증 자유 대입**(`createTeam:461`) · **판독 술어 0** → 목적 표현 불가 | `ABSENT` |
| 2 | responsibility scope | **부재** — `data_scope` 는 **인가 스코프**(메뉴/데이터 열람)이지 관리 책임 범위 아님 · **`UNIQUE(...)` `:164` 가 단일행 강제** → 병존 책임 범위 표현 불가 | `ABSENT` |
| 3 | decision scope | **부재** — 의사결정 범위 축 0. 🔴`DELEGATION_EXCEEDED`(`TeamPermissions:645`)는 **권한 부여 상한**이지 결정 범위 아님 | `ABSENT` |
| 4 | approval routing eligibility | **부재** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`·`approval_chain`·`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`). 승인 경로 4개 전량 **"호출자가 곧 승인자"** | `ABSENT` |
| 5 | priority | **부재** — 관계 우선순위 축 0. ⚠️`position_idx` 는 **PM 태스크 정렬순서**(동명이축) · 🔴**우선순위는 복수 관계를 전제**하는데 복수 관계를 담을 수단이 0(축 주의 ①) | `ABSENT` |
| 6 | mandatory review 여부 | **부재** — 🔴**Review 와 Approval 이 미분화**(§12 판정 동일 — `REVIEW_TASK` 부재). 필수 검토 플래그 0 | `ABSENT` |
| 7 | mandatory approval 여부 | **부재** — 필수 승인 플래그 0. 🔴`required_approvals` 컬럼은 존재하고 `Mapping.php:287` 이 정족수 판정에 **실사용**하나, **유일 생산자 `:210` 이 리터럴 `2` 하드코딩** → **요청자·금액·위험도·관계 무엇에도 반응 안 함** = **축이 아니라 상수**("컬럼이 있다 → 요건 모델이 있다"는 규칙 7 위반) | `ABSENT` |
| 8 | valid period | **부재** — `valid_from`·`valid_to`·`effective_to` **grep 0** · `team.manager_user_id` 에 **effective date 0 · 이력 0** | `ABSENT` |

### 1-2. 기본값 (원문 불릿 5)

🔴 **아래 5행의 `ABSENT` 는 "기본값이 없다"는 뜻이다 — "기본값을 지킨다"가 아니다.**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 9 | 조직 감독: Secondary | **부재** — Primary/Secondary 구분 축 0. **Secondary 를 담을 두 번째 행을 만들 수 없다**(축 주의 ①) · §3.1 조직 계약 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend 전역 grep 0) → **감독 주체 자체가 계약뿐** | `ABSENT` |
| 10 | 일반 Manager Chain: 제외 | **부재** — 🔴**Chain 이 0개라 "제외"도 0이다**(규칙 10). 게다가 현행은 **정반대 토양**: `'manager'` 라는 이유만으로 승인/위임 권한 자동 부여(`UserAuth.php:1064` · `TeamPermissions.php:136`) — **제외 술어를 걸 지점이 없다** | `ABSENT` |
| 11 | 명시적 Workflow Policy가 있는 경우 Approval Route 후보 | **부재** — Workflow Policy 엔터티 0 · Approval Route 0. ⚠️**인접 정책 게이트는 REAL**: `Catalog::evaluatePolicy` → `requires_approval`(`Catalog.php:2247`) → `approvalCreate:2275` → `approveQueue:2341` → **집행 `processWritebackQueue:2362`**. 🔴**단 이는 카탈로그 라이트백 정책이지 Manager Route 아님** — 커버 계산 금지 · **정책→승인요구 형태의 이식 선례로만 인용** | `ABSENT` |
| 12 | Direct Manager 대체: 금지 | **부재** — 🔴**Direct Manager 가 0개라 대체할 대상이 없다**(→ [DSAR_DIRECT_MANAGER.md](DSAR_DIRECT_MANAGER.md) 10/10 `ABSENT`). **"대체하지 않는다"를 준수로 계산하면 §21 이 정의상 소멸**한다 | `ABSENT` |
| 13 | Self-approval 방지 계산: 포함 가능 | **부재**(Manager Chain 축). ⚠️**인접 선례는 REAL**: `Mapping::approve:268-271` **자기승인 차단** + 신원 fail-closed(`:246-250`) + dedup(`:278-283`) + 정족수(`:287`). 🔴**단 이는 "actor ≠ 요청자" 단건 비교이지 Manager Chain 을 방지 계산에 포함하는 것이 아니다** — **알고리즘 이식 선례** | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.**
- **측정기 분모 13**(필수 속성 8 + 기본값 5) · **원문 대조 13** · **전사 13** — **일치.**
- ★**규칙 4 확인**: 원문 §21 필수 속성은 `valid period`(1013줄), 기본값은 `Self-approval 방지 계산: 포함 가능`(1021줄)로 **끝난다.** `evidence` 로 끝나지 **않으므로 추가하지 않았다.**
- 커버리지 = **`ABSENT` 12 · `LEGACY_ADAPTER` 1(#13) · 커버(`VALIDATED_LEGACY`) 0.**

## 2. 규칙

- 🔴 **`team.manager_user_id` 를 Dotted-line 으로 확장 금지.** **단일 `INT NULL` 칸**(`TeamPermissions.php:148`)이라 Secondary 를 담을 수 없고, `manager_user_id_2` 같은 칸 증식은 **#5 priority·#8 valid period 를 영구히 불가능**하게 만든다. **§21 은 N:N 관계 엔터티 없이는 어떤 항목도 충족 불가** — 관계 엔터티가 **13항목 전체의 선결 조건**이다.
- 🔴 **`app_user.team_id`(1인 1팀) 확장으로 Matrix 를 표현하려 하지 마라.** 이 컬럼은 `TeamPermissions.php:175`·`promoteManager:774` 가 쓰는 **인가 경로**이며, 다중화하면 **기존 클램프(`reclampTeamMembers:783-785`)가 조용히 오작동**한다(무후퇴 위반).
- 🔴 **#13 Self-approval 방지의 이식 선례는 `Mapping::approve` 뿐이다 — 그러나 그대로는 부족하다.** `:268-271` 은 **actor 단건 비교**이므로 **Manager Chain 을 방지 계산에 포함**하려면 chain 순회가 선행. ⚠️**잠복 결함 인지**: `actorId:36-53` 은 **3분기**(`apikey:{id}`/`user:{email}`/`user:#{id}` 폴백)라 **동일인이 API키/세션 경로로 접근하면 actor 문자열이 다르다** → `:279` dedup·`:268` 자기승인 차단이 **경로 전환으로 우회 가능**(실 경합 경로 **미검증** · 등급 미부여). **Manager Chain 을 얹기 전에 actor 정규화가 선결.**
- 🔴 **`Alerting::actor:33-36` 을 승인 actor 선례로 삼지 마라** — **`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백** = 289차 G-01 이 `Mapping` 에서 고친 **바로 그 위조가능 패턴**. `decideAction:591` 이 이 actor 를 그대로 기록하며 **상태가드·자기승인차단·dedup·정족수 전부 없다.** 현재 `INSERT INTO action_request` **grep 0 → 도달 불가(VACUOUS)**이나 **생산자를 하나 붙이는 순간 위조가능 승인이 활성화된다.**
- 🔴 **#7 mandatory approval 을 `required_approvals` 재사용으로 닫지 마라.** 유일 생산자가 **리터럴 `2`**(`Mapping.php:210`)이며 `approvals_json`(`:285`)은 `{user, ts}` **2키 JSON 배열 → 인덱스·as-of 질의 불가**. **5-3-3-1 D-13 `menu_defaults.version = 리터럴 'baseline'` 과 정확히 동형**(값이 아니라 라벨).
- **#11 의 이식 선례**는 `Catalog::evaluatePolicy`→`requires_approval`(`Catalog.php:2247`) 의 **정책→승인요구 형태**다. 🔴 단 **`Catalog::approveQueue:2341-2365` 를 승인 참조 구현으로 삼지 마라** — `Mapping` 의 maker-checker(**행위자를 읽지도 않는다** `:2343` `requirePro` = **구독 플랜 게이트**)를 **전혀 갖지 않는다.** 통합 시 **`Mapping` 의 능력이 소실**된다(규칙 9). ⚠️`catalog_writeback_approval` **테이블은 고아**(`Catalog.php:86`·`:126` CREATE 뿐 · INSERT/SELECT 0 · 주석 `:2269-2272` 자인) — **테이블은 죽었고 능력은 살아 있다.**
- **#5 priority 는 §11 Manager Type 과 짝이다** — 🔴**`pm_task_dependencies` 스키마 복제 금지**: `Dependencies.php:90-91` 이 `dep_type` 을 술어에 **안 넣어 전 타입 무차별 순회** → **타입별 정책 표현 불가**. 이 결함을 물려받으면 설계 시점에 이미 불가능해진다.
- 🔴 **13종 "있다고 가정"하고 배선 금지.**
