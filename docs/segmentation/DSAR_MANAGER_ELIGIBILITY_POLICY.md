# DSAR — 기본 Manager Eligibility (§37)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §37 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

★**축 주의 — §37 은 필드 축이 아니라 규율 축이다.** 원문(`:1413-1430`)은 `MANAGER_*` 엔티티를 선언하지 않고 **"기본적으로 다음을 요구한다"**(`:1415`)로 시작하는 **산문 요구 목록 14건**이다. 이를 §36 같은 **컬럼 목록으로 읽으면 축을 오독**한다 — §36 은 *"적격성을 무엇으로 표현할 것인가"*, §37 은 *"승인 시점에 무엇을 통과시킬 것인가"* 다. 측정기 분모 **14**(불릿 14 · 번호 0).

★**원문은 `evidence` 로 끝나지 않는다**(`:1430` = *"Approval Requirement와 Relationship Type 일치"*). **규칙 4 반대 편향 방지 — `evidence` 를 추가하지 않았다.**

### 🔴 §4.1 재확인 — **Manager 도 Approver 도 개념이 없다**

§36 §0 참조. 승인 경로 **4개 전량 = "호출자가 곧 승인자"**(`Mapping::approve:246` actorId=**요청자 본인** · `Catalog::approveQueue:2343` **행위자를 읽지도 않고** `requirePro` **구독 플랜** 게이트 · `AgencyPortal:370` `isTenantOwner` · `FeedTemplate:271` 라우트 게이트). **"Manager 를 Approver 로 오용 중"이라 적으면 허구다.**

### 🔴 ★§37 요구 14건 중 **4건은 판정 불가**(§3.2 의존 · 판정할 대상이 없다)

| 요구 | 의존 축 | 실측 |
|---|---|---|
| Active Canonical Identity | Canonical Identity | **병합/정규화 계층 0** — 직원 아이덴티티 = `app_user` 뿐(union-find 는 **고객 전용** `CRM.php:597-643`) |
| Active Employment 또는 허용된 Contractor State | Employment | `employment_state`/`employment_status` **grep 0** · Contractor 개념 **0** |
| 비종료 Position | Position | `position_state` **grep 0** · Position 축 **전역 0** |
| Vacancy가 아닌 Manager Position 또는 유효한 Interim Incumbent | Position + Vacancy + Interim | `vacan` **0** · `interim` 1건 = **지오리프트 중간결과**(무관) |

★**Employment/Position 축이 전역 0** 이므로 이 4건은 `ABSENT`(미구현)가 아니라 **판정할 대상이 없는 상태**다.
🔴 **`is_active` 로 대체 금지** — **계정 상태이지 고용 상태가 아니다**(base DDL **`Db.php:1106`** · ALTER 목록 **밖** · 소비처 전부 **인증 게이트** `UserAuth.php:248`,`:805`,`:2455`·`routes.php:2776`). 대체하면 **"로그인 가능 = 재직 중 = 승인 적격"** 이 되어 4건이 **자동 통과** — **288차 `ok=>true` 위장과 동형인 가짜 녹색**이다.

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Active Canonical Identity | 🔴**판정 불가(§3.2)** — Canonical Identity 축 부재. 직원 아이덴티티 = `app_user` 뿐 · 외부 상관자 3컬럼(`oidc_sub`·`oidc_provider`·`scim_external_id` 정의부 **`EnterpriseAuth.php:64-65`**) 존재하나 **병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`) | `ABSENT` |
| 2 | Active Employment 또는 허용된 Contractor State | 🔴**판정 불가(§3.2)** — `employment_state`/`employment_status` **grep 0** · Contractor **0**. `is_active`(`Db.php:1106`)는 **계정 상태**(대체 금지) | `ABSENT` |
| 3 | Active Manager Assignment | Assignment 엔티티 **부재**(§33) · `team.manager_user_id`(`TeamPermissions.php:148`) = **팀당 1칸 · nullable · effective date 0 · 이력 0** → "Active" 를 물을 술어 없음 | `ABSENT` |
| 4 | 유효한 Effective Period | `valid_from`·`valid_to`·`effective_to` **전역 grep 0** · §38 **Business/System Time 이중 시간축 = 전례 0** · 유사 선례 `kr_fee_rule.effective_from`(`Db.php:898`) = **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0) | `ABSENT` |
| 5 | 동일 Tenant 또는 명시적 Cross-Tenant Reference | ✅ **테넌트 축은 REAL** — `resolveTenantId:200-217` · `data_scope.tenant_id NOT NULL`(`:161`) · 미도출 시 `DENY_SCOPE`(`:251`) fail-closed · 🔴**단 Cross-Tenant 명시 참조 수단 0**(현행은 **차단만 가능·명시 허용 불가**) · ⚠️**286차 전례**: `X-Act-As-Tenant` 하이재킹 | `PARTIAL` |
| 6 | 허용된 Legal Entity 관계 | 🔴 **`'company'` = 법인이 아니라 무제한 센티넬**(`effectiveScope():258` `return null`) · `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`) · 법인 엔티티·FK·감독관계 **전무** | `ABSENT` |
| 7 | 비종료 Position | 🔴**판정 불가(§3.2)** — `position_state` **grep 0** · Position 축 **전역 0** · 🔴`position_idx` = **PM 태스크 정렬순서**(무관) | `ABSENT` |
| 8 | Vacancy가 아닌 Manager Position 또는 유효한 Interim Incumbent | 🔴**판정 불가(§3.2)** — `vacan` **0** · `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) · ★**§76 실재 항목 2**: `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** = **Vacant Position 을 Active Manager 로 처리** | `ABSENT` |
| 9 | Required Scope 충족 | 🔴 **정면 충돌** — `effectiveScope():256` `if (!$sc) return null;` = **스코프 미설정 → 테넌트 내 무제한**(주석 `:255` 가 *"설정 미완 사용자 잠금 방지"* 자인) · 실 소비 차원 **4개뿐**(`warehouse` `Wms.php:1291` · `channel`/`product`/`brand` `OrderHub.php:261`) · 🔴`UNIQUE(...) :164` = **단일행 강제** | `PARTIAL` |
| 10 | Self-reporting 아님 | ✅ **유일한 실재 적격 술어** — `Mapping.php:268-271` **289차 G-01** 자기승인 차단 403. 🔴**`Mapping` 국소·전사 표준 아님**(`Catalog::approveQueue`·`Alerting::decideAction` 미보유) · ⚠️**관찰(등급 미부여)**: `actorId:36-53` **3분기**(`apikey:{id}`/`user:{email}`/`user:#{id}`) → 동일인이 **경로 전환으로 우회 가능** · **실 경합 경로 미검증** | `PARTIAL` |
| 11 | Circular Relationship 없음 | ★**§57 6방식 중 2/6 · 도메인만 다름** — **DFS `backend/src/Handlers/PM/Dependencies.php:79-100`**(반복형 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34`** 422 `cycle_detected` + self-loop `:29-31`) · **Topological Sort `PM/Gantt.php:104-125`**(Kahn · `:119` 정석 · ⚠️**탐지 후 차단 안 함**) · Recursive CTE/Closure Table/Graph Query/Path Prefix **전부 0**. 🔴**단 Manager 도메인엔 순환할 관계가 0개** | `LEGACY_ADAPTER` |
| 12 | Security Suspension 아님 | 🔴 **Suspension 개념 전역 0** — `suspend` grep = **말장난 1건**(`WorkspaceState.php:12` "belt-and-suspenders") · 🔴`locked_until` ≠ 고용 정지(`login_attempt` `UserAuth.php:3335`·`agency_login_attempt` `AgencyPortal.php:179` = **무차별 대입 스로틀** · 키가 `ident`(**user_id 아님**) · 분 단위 자동 해제) | `ABSENT` |
| 13 | Authorization Runtime Check 통과 | ✅ **런타임 체크 자체는 REAL** — API 키 SHA-256+RBAC(`index.php` 미들웨어 · `viewer<connector<analyst<admin`) · 위임 읽기전용 403(`:92-96` `AGENCY_READ_ONLY`) · 🔴**그러나 "승인 적격"을 묻는 체크는 0** · **`Actor Authorization Snapshot` = `ABSENT`**(승인 시점 권한 동결 0 → **승인 후 권한 변경 시 소급 불가**) | `PARTIAL` |
| 14 | Approval Requirement와 Relationship Type 일치 | 🔴 **양변 부재** — 좌변 `required_approvals` = **리터럴 `2` 하드코딩**(`Mapping.php:210` · 유일 생산자)이라 **요건이 아니라 상수** · 우변 Relationship Type **전역 0**. **비교할 두 값이 다 없다** | `ABSENT` |

**실측 개수: 14 / 14 전사** (**측정기 분모 14 와 일치** · 원문이 `evidence` 로 끝나지 않아 **추가하지 않음** — 규칙 4).
커버리지 = `ABSENT` 9 · `PARTIAL` 4 · `LEGACY_ADAPTER` 1 · **`VALIDATED_LEGACY` 0**. **그중 4건(#1·#2·#7·#8)은 미구현이 아니라 판정 불가**(§3.2 축 전역 0).

## 2. 규칙

- 🔴 **§37 은 §3.2(Identity·Employment)·§33(Assignment)·§38(Effective Period) 없이 착수 불가.** 14건 중 **4건이 §3.2 의존으로 판정 불가**, **#3·#4 가 Assignment·Period 의존**이다. 이를 무시하고 "게이트 함수"부터 만들면 **술어가 전부 `true` 를 반환하는 통과 장치**가 된다 — **양변 부재 → 자동 MATCH = 가짜 녹색**(§66 이중 공허와 동형).
- 🔴 **`is_active` 재사용 절대 금지**(#1·#2·#7·#8). **계정 상태 ≠ 고용 상태**이며, `NOT NULL DEFAULT 1`(`Db.php:1106`)이라 **미지가 자동으로 "가용"** = **Unknown 이 Eligible 로 통과**한다. §37 의 기본값은 **Fail-closed(Unknown≠Eligible)** 여야 한다.
- 🔴 **#9 는 현행 기본 동작과 정면 충돌한다.** `effectiveScope():256` 이 **스코프 미설정을 무제한으로 해석**하므로, Required Scope 충족을 그 위에 얹으면 **미설정 사용자가 전 스코프 적격**이 된다. **무후퇴 제약**(기존 동작 보존)과 **fail-closed 요구**가 충돌 — **Manager 축은 별도 술어**로 분리하고 기존 `data_scope` 기본값을 건드리지 말 것.
- ★**#10·#11 만 이식 가능하다.** Self-approval = `Mapping.php:268-271` 을 **전사 표준으로 승격**(⚠️actor 경로 이원화 선결). Circular = **`PM/Dependencies.php:79-100` 알고리즘만** 이식하되 — 🔴**★경로 접두 필수**: `backend/src/Handlers/PM/…`(**`backend/src/PM/` 는 존재하지 않는다** — 5-3-3-1 문서 25편에 오표기 전파) · 🔴**`pm_task_dependencies` 스키마 복제 금지**(`:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회** → §11 Manager Type 27종별 순환정책 표현 불가) · ★**`:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 pop 마다) — **§57 "Maximum Depth"로 계산하면 오판**.
- 🔴 **`ChannelSync.php:955-962` 를 순환 검출기로 계산 금지** — `$visited` 없이 **깊이만 자른다** → 순환 시 **탐지 없이 조용히 절단**.
- 🔴 **#13 Runtime Check 를 "레이트리밋·RBAC 있음"으로 닫지 마라** — 그 축은 **인증·인가**이지 **승인 적격**이 아니다. 분모를 갈아끼우는 역산이다.
- 🔴 **#14 를 `required_approvals` 로 충족했다고 계산 금지**(규칙 7). 리터럴 `2`(`Mapping.php:210`)는 **요건 모델이 아니라 상수**이며 **`menu_defaults.version='baseline'`(`AdminMenu.php:309` — 버전이 아니라 라벨)과 동형**이다.
- ★**회귀 커버리지 0** — `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인) · 🔴`smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 캠페인 계약키**(조직 team 아님 · 이름 함정) · `scenarios.mjs` 매니저 **0**. §37 게이트는 **신규 테스트 없이는 검증 불가**.
- 14종 **"있다고 가정"하고 배선 금지**.
