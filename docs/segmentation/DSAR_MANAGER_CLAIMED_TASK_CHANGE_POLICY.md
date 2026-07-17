# DSAR — Claimed Task와 Manager 변경 (§65)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §65 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **사람의 Task Claim** | ★**개념 자체가 없다** — `APPROVAL_*` 12종 grep 0 · **워크플로 정의 테이블(`workflow_*`/`flow_*`/`wf_*`) `CREATE TABLE` grep 0** · Task 배정/클레임 컬럼 0 | `ABSENT` |
| 유일한 `claim` 실코드 | **`Omnichannel::claimBatch:390`** — `claim_id = bin2hex(random_bytes(8))`(`:392`) · 대상 `omni_outbox` · `SELECT..FOR UPDATE SKIP LOCKED`(`:385` 주석) · **TTL 자동 회수**(`:397-398`) · 폴백 `claimConditional:416` | `KEEP_SEPARATE_WITH_REASON` |
| 유일한 **워크플로 인스턴스** 실체 | `journey_enrollments`(`JourneyBuilder.php:42-47` MySQL / `:68` SQLite) — `journey_id`·**`customer_id`**·`session_id`·`current_node`·`status` · **마케팅 여정 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| Manager 관계 | `manager_id`·`reports_to`·`supervisor_id` **grep 0** · ★git 삭제 이력 0 | `ABSENT` |
| Approval Authority 부여 | 🔴**`'manager'` 문자열 하나에 걸려 있다** — `UserAuth.php:1064` · `TeamPermissions.php:136`(`isManagerAdmin`) | ⊘ |
| 종료/테넌트/법인 상태 축 | `terminated`·`deleted_at`·`on_leave` **grep 0** · 법인 엔티티 **0** · `is_active` = **계정 상태**(base DDL **`Db.php:1106`**) | `ABSENT` |

### ★★ 이 절의 대전제 — **§65 는 Claim 이 존재해야 성립하는 절이다**

§65 는 *"Manager가 Task를 Claim한 후 Reporting Line이 변경된 경우"* 를 전제한다. 현행에는 **Manager 관계도(트리거) · Task 도(대상) · Claim 도(사건) 전부 없다.** 9정책은 **분기할 상황 자체가 발생하지 않는다.**

> 🔴 **규칙 10 적중**: 현행이 *"Claim 후 권한 변경을 재검증하지 않는 것"*은 **정책 미비가 아니라 Claim 이 없어서**다. **"위반 0건"을 준수로 계산하면 역산이다.**

### ★ Task Claim ≠ Job Claim — **주체·대상·목적·인가·해제 5축 상이**(5-3-2 §38 확정 · 재확인)

| 축 | 원문 §65 `Task Claim` | `Omnichannel::claimBatch:390` |
|---|---|---|
| **주체** | **사람**(Manager · 신원 있는 결재자) | **워커 프로세스**(익명 랜덤 16진 `:392`) |
| **대상** | 승인 Task | 발송 아웃박스 행 |
| **목적** | **권한 있는 자의 결재 착수** | **중복 발송 방지**(동시성 제어) |
| **인가** | Manager 관계·Approval Authority 검증 필요 | **인가 개념 0** — 먼저 잡는 워커가 소유 |
| **해제** | **9정책에 따른 판단**(§65 전체) | **TTL 무조건 자동 회수**(`:397-398`) |

🔴 **`claimBatch` 를 §65 의 커버·기반·참조 구현으로 계산 금지.** 특히 **TTL 무조건 회수를 이식하면 `KEEP_CLAIM_UNTIL_COMPLETION`(#1)이 정의상 불가능**해진다.

### ⚠️ 인접: `journey_enrollments` — **유일한 실 인스턴스이나 도메인이 다르다**

`JourneyBuilder.php:42-47` 이 레포에서 **유일하게 "정의된 흐름의 실행 인스턴스"를 영속**한다(`current_node`·`status`). 그러나:
- **주체가 `customer_id`**(`:44`) — **고객이 여정에 등록되는 것**이지 **사람이 Task 를 집는 것**이 아니다.
- **Claim/assignee/소유자 컬럼 0** · **인가 술어 0**.
- 🔴 `JourneyBuilder:511-518` 은 **런타임 순환 탐지이지 쓰기 전 차단이 아니며**, `:512` 주석이 *"작성자 JSON acyclicity 검증 없음"* 을 **자인**한다.

→ **`KEEP_SEPARATE_WITH_REASON`.** 🔴 **`journey_enrollments` 에 `manager_id`/`claim_id` 를 덧붙여 승인 도메인으로 겸용 금지** — 마케팅 발송 도메인이 승인 도메인을 흡수하면 **양쪽 다 신뢰할 수 없게 된다**(중복 인텔리전스 금지 · 헌법 Vol1).

## 1. 원문 전사 + 판정 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | KEEP_CLAIM_UNTIL_COMPLETION | Claim 부재 · 🔴**인접 `claimBatch` 는 정반대** — TTL 초과 시 **무조건 회수**(`:397-398`) → 이 패턴 이식 시 본 정책 **정의상 불가능** | `ABSENT` |
| 2 | REVALIDATE_ON_COMPLETION | 완료 시점 재검증 0 · ★**패턴 선례 최상** = `AgencyPortal::resolveAccessContext:414-432`(**세션 캐시 불신·매 요청 링크 재조회 `:423` → `status!=='approved'` 면 null `:427`**) | `LEGACY_ADAPTER`(패턴만) |
| 3 | RELEASE_AND_REASSIGN | 재할당 대상(Candidate) 계산 코드 **0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) · **release 선례는 `claimBatch:397-398` TTL 회수뿐**(사람 아님) | `ABSENT` |
| 4 | KEEP_IF_AUTHORITY_VALID | 🔴**Authority 가 `team_role='manager'` 문자열 하나**(`UserAuth.php:1064`·`TeamPermissions.php:136`) — **관계가 아니라 롤 라벨** · **유효성 판정 축(범위·기간·시점) 전무** · `Actor Authorization Snapshot` **`ABSENT`**(승인 시점 권한 동결 0) | `ABSENT` |
| 5 | BLOCK_IF_TERMINATED | `terminated`·`deleted_at` **grep 0** · 🔴**`is_active` 로 대체 불가** — **계정 상태**(base DDL `Db.php:1106` · 소비처 전부 인증 게이트) · **`NOT NULL DEFAULT 1` → 미지 = 자동 "가용" = fail-open** · 🔴**`locked_until` ≠ 고용 정지**(`UserAuth.php:3335` **무차별 대입 스로틀** · 키가 `ident`(user_id 아님) · 분 단위 자동 해제) · 🔴**`suspend` grep = 말장난 1건**(`WorkspaceState.php:12` "belt-and-**suspenders**") | `ABSENT` |
| 6 | BLOCK_IF_TENANT_CHANGED | ★**차단 집행 선례 실재**: `PM/Dependencies.php:91`(**매 홉 tenant 필터**)+`:32-34`(**쓰기 전 422**) · `AgencyPortal:428`(세션↔링크 tenant 불일치 방어) · `index.php` fail-closed 403 · 🔴**단 테넌트 "변경"은 표현 불가** — `app_user.parent_user_id` 는 **owner 직속 2단 봉인**이며 `resolveTenantId:200-217` 이 **단일 홉·`LIMIT 1`** 가정 | `LEGACY_ADAPTER` |
| 7 | BLOCK_IF_LEGAL_ENTITY_CHANGED | 🔴**법인 엔티티 자체가 없다** — Legal Entity Officer `ABSENT` · `ceo_name` 은 **`app_user` 프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720`) · FK·감독관계·시점 **전무** · 🔴**`DATA_SCOPES` `'company'` 는 법인이 아니라 무제한 센티넬**(`effectiveScope():258`) | `ABSENT` |
| 8 | MANUAL_REVIEW | 리뷰 큐 **0** · 🔴`Reviews.php` 는 **고객 리뷰**(부정 리뷰 Slack 에스컬레이션 `:174`,`:179`)이지 결재 리뷰 아님 | `ABSENT` |
| 9 | CUSTOM | 확장 슬롯 0 · ⚠️인접 **무검증 자유문자열 선례**(`team.team_type VARCHAR(48)` `createTeam:461` · `ChannelRegistry.php:36` `group_type VARCHAR(40)`) → **`CUSTOM` 을 자유문자열로 열면 정책이 강제되지 않는다** | `ABSENT` |

**실측 개수: 9 / 9 전사.**
- **측정기 분모 9 · 원문 대조 9 · 전사 9 — 3자 일치.** PM 브리핑 "9정책"과도 일치.
- 원문 §65 는 **`evidence` 로 끝나지 않는다**(:2248 = `CUSTOM` · 이후 :2250 은 산문 *"Task Claim 자체가 Approval Authority를 영구 보장하지 않게 하라"*) → **`evidence` 를 추가하지 않았다**(규칙 4 반대 편향 방지).

커버리지 = `ABSENT` 7 · `LEGACY_ADAPTER` 2(#2·#6) · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- ★★🔴 **원문 말미 명령을 최상위 제약으로 삼으라**(:2250): **"Task Claim 자체가 Approval Authority를 영구 보장하지 않게 하라."**
  현행은 이 명령을 **지키고 있는 것이 아니라 시험받은 적이 없다**(Claim 0 · 규칙 10). 🔴 그리고 현행 구조를 그대로 확장하면 **정확히 이 명령을 위반**한다 — **`team_role='manager'` 문자열 하나가 Authority 이므로**(`UserAuth.php:1064`·`TeamPermissions.php:136`), **Claim 시점에 그 문자열을 읽고 끝내면 이후 강등·이동·종료가 반영되지 않는다.**
- ★★🔴 **#4 `KEEP_IF_AUTHORITY_VALID` 가 9정책의 급소다.** 나머지 8정책은 이것 없이는 **판정 불가**다:
  - `Authority` 를 **`team_role` 문자열 판독으로 구현 금지** — **관계(누구의 매니저인가)·범위·유효기간·시점**이 전부 필요하다.
  - **`Actor Authorization Snapshot` 이 선결**이다(현행 `ABSENT`). **Claim 시점 권한을 동결**해야 `REVALIDATE_ON_COMPLETION`(#2)이 **"무엇과 비교하는지"** 가 정의된다. 🔴 **동결 없이 재검증하면 "현재 권한 == 현재 권한" 이라 항상 통과** — 가짜 녹색이다.
  - 🔴 **동결 스냅샷을 `pm_baseline` 방식으로 만들지 마라** — `captured_at` 이 **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가**(`KV_ONLY`). Claim 재검증은 **시점 질의가 필수**이므로 이 형태로는 성립하지 않는다.
- ★🔴 **#5 `BLOCK_IF_TERMINATED` 의 선결 = 고용 상태 축 신설.** `is_active` 재사용 금지(**계정 상태 · fail-open 기본값**). 헌법 Vol3 **Unknown ≠ Eligible** 위반이다. **§41 8종 중 현행 표현 가능 2종(1/0) · `UNKNOWN` 조차 불가.**
  - ★**유일한 인입 확장 지점 = SCIM `active`**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) — **REAL 이며 IdP 종료 이벤트가 실제로 도달**한다. 여기에 **고용 상태를 별도 컬럼으로 분리**해 실으라(계정 상태와 **겸용 금지**).
  - ✅ **집행 자체는 REAL** — 비활성 시 **세션 즉시 폐기**(`UserAuth.php:1381`·`EnterpriseAuth.php:400`,`:413`) · 재활성화 우회 방어(`:854-856`) · owner 잠금 방지(`:398`,`:411`). **집행 계층은 확장하고 상태 계층만 신설**하라.
  - 🔴 **`is_active=0` 은 3경로 혼재**(`UserAuth.php:1380` 팀원 삭제 · `EnterpriseAuth.php:412` SCIM DELETE · `UserAdmin.php:361` 관리자 토글) · **사유·시각·이력 컬럼 0** → **"왜 종료됐는가"를 §65 가 판정할 수 없다.**
- ★🔴 **#6 `BLOCK_IF_TENANT_CHANGED` — 차단은 가능하나 "변경"이 표현 불가.** `app_user.parent_user_id` 는 **테넌트 소속 포인터**(보고선 아님)이며 **전 생성경로가 owner 직속**(`UserAuth.php:1226-1227` · `EnterpriseAuth.php:500` · `:1574/1581` · `:670`) — **3단 경로 없음**. 🔴 **3단을 허용하면 `resolveTenantId:200-217` 의 단일 홉 가정이 붕괴 → 286차 하이재킹과 동형 사고.** **일반화가 선결이며 §65 의 전제가 아니다.**
- ★🔴 **#9 `CUSTOM` 을 무검증 자유문자열로 열지 마라**(규칙 11). 레포에 **ENUM/CHECK/`in_array` 없는 자유 VARCHAR 선례가 이미 사고를 만들었다**(`team_type VARCHAR(48)` 무검증 대입 `createTeam:461` · `group_type VARCHAR(40)` — 주석은 **열거가 아니라 관례**이며 실값 `support` 가 주석에 누락된 stale). **정책 enum 은 코드로 강제**하라.
- ★🔴 **#1 과 #2 는 상충한다 — 기본값을 정하라.** `KEEP_CLAIM_UNTIL_COMPLETION`(유지)과 `BLOCK_IF_TERMINATED`(차단)이 동시에 걸리면 **차단이 이긴다**. 🔴 **기본값을 `KEEP` 으로 두지 마라** — 헌법 Vol3 **fail-closed**. 판정 불가 시 **`MANUAL_REVIEW`(#8)**, 상태 판독 불가 시 **차단**이다(§67 규칙과 동일 축).
- 🔴 **`Alerting::executeAction`(`Alerting.php:601-660`)을 참조 구현으로 삼지 마라 — 정확히 §65 가 금지하는 것의 실물이다.** `:612` 에서 `status` 를 **SELECT 하고도 어디서도 판독하지 않아** `pending`·`rejected` 도 실집행된다. **상태를 저장하는 것과 강제하는 것은 다르다.** 287차가 이를 **"가짜 집행"**으로 확정했다.
  - 🔴 **잠복 결함**: `Alerting::actor:33-36` = **`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백**(위조 가능) · `decideAction:591-595` = **단일 결정으로 즉시 approved**(정족수를 **표시하나 집행하지 않음**) · **상태가드·자기승인차단·dedup 전부 없음**. **현재 생산자 0(VACUOUS) → 도달 불가**이나 **생산자를 붙이는 순간 활성 결함**이다.
  - ✅ **표준으로 삼을 것 = `Mapping::actorId:36-53`** — **3분기 fail-closed**(`apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` 폴백 `:49` / 미확인 **null** `:52` → **403** `:187-190`,`:246-250`).
  - ⚠️ **관찰(등급 미부여)**: 동일인이 **API키/세션 경로로 접근하면 actor 문자열이 다르다** → `Mapping.php:279` dedup·`:268` 자기승인 차단이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.** §65 Claim 소유자 판정을 actor 문자열 동등성으로 구현하면 **이 결함을 상속**한다.
- 🔴 **9종 "있다고 가정"하고 배선 금지.** 5-3-2 팬텀(`INSERT INTO action_request` grep 0 → 죽은 스켈레톤)의 재현이다.
- **회귀 커버리지 0** — `tools/e2e/` 3종에 manager/claim/approval 시나리오 **0**(`render.mjs:17` 이 **마운트 크래시만 검사**함을 자인 · `smoke.mjs:84` `keys:['team','roas']` 는 **Meta Ads 계약키** · 이름 함정). ★**"Claim 후 Manager 가 종료되면 차단되는가"를 검증하는 E2E 가 완료 조건**이다.
