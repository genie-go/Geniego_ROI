# DSAR — Manager Eligibility Profile (§36)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §36 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

★**§36/§37 이 §4.1(Manager≠Approver)의 핵심이다.**

### 🔴 §4.1 판정 — **현행은 Manager 와 Approver 를 동일시하지도 않는다. 양쪽 개념이 다 없다.**

**"Manager 를 Approver 로 오용 중"이라 적으면 허구다.** 승인 경로 **4개 전량 = "호출자가 곧 승인자"**:

| 경로 | 승인자 결정 | 자격 판정 축 |
|---|---|---|
| `Mapping::approve:238-294` | `actorId($request)`(`:246`) = **요청자 본인** | **정족수(숫자)뿐** — 적격 술어 **0** |
| `Catalog::approveQueue:2341-2365` | 🔴**행위자를 읽지도 않는다** · `:2343` `requirePro` | **구독 플랜** |
| `AgencyPortal::approveAgency:365-385` | `:370` `isTenantOwner` | 고정 역할(가장 근접하나 **해석 아님**) |
| `FeedTemplate::approveDraft:271` | 라우트 게이트 | — |

★**적격성 판정 = 핸들러별 하드코딩**이며 **"누가 승인 적격인가"를 표현할 자리 자체가 없다**.
★**Existing Approval Manager Resolver = `ABSENT`** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`).
★**규칙 10 적중**: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.

### 🔴 표현 수단 0 실측 (본 세션 재확인 · `backend/src` 전역 grep)

| 원문 축 | grep 히트 | 비고 |
|---|---|---|
| `employment_state` / `employment_status` | **0 / 0** | 고용 상태 축 **전역 0** |
| `position_state` | **0** | Position 축 **전역 0** |
| `job_level` | **0** | 🔴 `admin_level`(master\|sub `UserAuth.php:171`) ≠ Job Level — **콘솔 특권** |
| `executive_level` | **0** | 🔴 `grade` **45+건 전량 무관**(고객등급·리드등급·모델품질) |
| `leave_state` / `on_leave` | **0 / 0** | `out_of_office`·`deleted_at`·`work_location` 도 **0** |
| `suspension_policy` | **0** | 🔴 `suspend` grep = **말장난 1건**(`WorkspaceState.php:12` "belt-and-suspenders") · Suspension 개념 **전역 0** |
| `termination_policy` / `terminated` | **0 / 0** | 종료 사유·시각·이력 컬럼 **0** |
| `conflict_of_interest` | **0** | — |

### 🔴 `is_active` = **계정 상태이지 고용 상태가 아니다**

- **base DDL `Db.php:1106`** `is_active TINYINT(1) NOT NULL DEFAULT 1` (ALTER 목록 **밖** — ★`UserAuth.php:165-179` 만 보면 놓친다)
- 소비처 **전부 인증 게이트**(`UserAuth.php:248`,`:805`,`:2455` · `routes.php:2776`)
- ★**§41 지원 상태 8종 중 표현 가능 2종**(1/0). **`UNKNOWN` 조차 표현 불가** — `NOT NULL DEFAULT 1` → **미지가 자동으로 "가용" = fail-open**
- ✅ **단 집행은 REAL**: 로그인 차단(`:805`) · 재활성화 우회 방어(`:854-856`) · 비활성 시 **세션 즉시 폐기**(`:1381`·`EnterpriseAuth.php:400`,`:413`) · owner 잠금 방지(`:398`,`:411`)
- 🔴 **`locked_until` ≠ 고용 정지** — `login_attempt`(`UserAuth.php:3335`)·`agency_login_attempt`(`AgencyPortal.php:179`) = **무차별 대입 스로틀** · 키가 `ident`(**user_id 아님**) · 분 단위 자동 해제

### 🔴 규칙 7 재적중 — **"컬럼이 있다 → 요건 모델이 있다"**

§36 의 유일한 인접 대응물은 **`required_approvals`**(컬럼 실재 · `Mapping.php:287` 정족수 판정에 실사용)이나 🔴**유일 생산자 `:210` 이 리터럴 `2` 하드코딩**이다. 이는 **적격성 모델이 아니라 상수**이며 **`menu_defaults.version = 리터럴 'baseline'`(`AdminMenu.php:309` — 버전이 아니라 라벨)과 정확히 동형**이다. 두 사례 모두 **컬럼의 존재를 모델의 존재로 오독한 표본**이다.

## 1. 원문 전사 + 판정 — **원문 24종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_eligibility_profile_id | 적격성 프로파일 엔티티 **부재** — **"누가 승인 적격인가"를 표현할 자리 자체가 없다** | `ABSENT` |
| 2 | relationship types | Manager Relationship 축 **전역 0**(`manager_id`·`reports_to`·`supervisor_id` 0) · `team_role ∈ {owner,manager,member}`(`UserAuth.php:168`) = **롤이지 관계 유형 아님** | `ABSENT` |
| 3 | subject types | 🔴 `data_scope.subject_type`(`TeamPermissions.php:162`) = **`user`\|`team`**(`subjectScope` `:253-254`) — **권한 주체**이지 적격성 subject 아님 · 🔴 DSAR "Data Subject" = **고객**(직원 아님) | `NAME_ONLY` |
| 4 | employment states | 🔴 **표현 수단 0** — `employment_state`/`employment_status` **grep 0**. `is_active`(`Db.php:1106`)는 **계정 상태**이며 소비처 전부 **인증 게이트** | `ABSENT` |
| 5 | position states | 🔴 **표현 수단 0** — `position_state` **grep 0** · Position 축 **전역 0** · `position_idx` = **PM 태스크 정렬순서**(무관) | `ABSENT` |
| 6 | required tenant | ✅ **테넌트 축은 REAL** — `data_scope.tenant_id NOT NULL`(`:161`) · `resolveTenantId:200-217` · 🔴**단 `DENY_SCOPE`(`:251`)는 테넌트 미도출 거부이지 적격성 아님** · Cross-Tenant **명시 참조 수단 0** | `PARTIAL` |
| 7 | required organization | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 **18/18 `CONTRACT_ONLY`** · `team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다** | `CONTRACT_ONLY` |
| 8 | legal entity policy | 🔴 **`'company'` = 법인이 아니라 무제한 센티넬**(`effectiveScope():258` `return null`) · `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499` · `:1183` 가입 필수검사) · FK·감독관계·승인라우팅 **전무** | `ABSENT` |
| 9 | country policy | `DATA_SCOPES`(`:41`)에 country 값 **없음** · 🔴 `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용**(탐지이지 정책 아님) | `ABSENT` |
| 10 | role requirement reference | 🔴 **가장 근접하나 미달** — `team_role='manager'` **문자열 하나에 승인 권한이 걸려 있다**(`UserAuth.php:1064`·`TeamPermissions.php:136` `isManagerAdmin`). **참조가 아니라 하드코딩된 상수 비교** | `NAME_ONLY` |
| 11 | minimum job level | 🔴 **표현 수단 0** — `job_level` grep 0 · `admin_level`(master\|sub `:171`) = **콘솔 특권**(순서 없는 2값) · `grade` 45+건 **전량 무관** | `ABSENT` |
| 12 | minimum executive level | 🔴 **표현 수단 0** — `executive_level` grep 0 · Executive 개념 **전역 0** | `ABSENT` |
| 13 | active employment required 여부 | 🔴 **판정 대상 없음** — 고용 상태 축이 **전역 0** 이라 `is_active`(계정)로 대체하면 **"계정이 살아있음"을 "재직 중"으로 위장**한다(가짜 녹색) | `ABSENT` |
| 14 | leave state policy | 🔴 **표현 수단 0** — `leave_state`·`on_leave`·`out_of_office` **전부 0** | `ABSENT` |
| 15 | suspension policy | 🔴 **표현 수단 0** — `suspension_policy` 0 · `suspend` = **말장난 1건**(`WorkspaceState.php:12`) · `locked_until` = **무차별 대입 스로틀**(분 단위 자동 해제 · 키가 `ident`) | `ABSENT` |
| 16 | termination policy | 🔴 **표현 수단 0** — `termination_policy`·`terminated` 0 · `is_active=0` 이 **3경로 혼재**(`UserAuth.php:1380` 팀원삭제 · `EnterpriseAuth.php:412` SCIM DELETE · `UserAdmin.php:361` 관리자 토글) → **사유 구분 불가** | `ABSENT` |
| 17 | conflict of interest hook | `conflict_of_interest` **grep 0** · 훅 계층 부재 | `ABSENT` |
| 18 | self approval exclusion | ✅ **유일한 실재 적격 술어** — `Mapping.php:268-271` **289차 G-01** 자기승인 차단 403(`requested_by === $actor`). 🔴**단 `Mapping` 국소이며 전사 표준 아님**(`Catalog::approveQueue`·`Alerting::decideAction` 미보유) · ⚠️**관찰(등급 미부여)**: 동일인이 API키/세션 경로로 접근 시 **actor 문자열이 달라**(`actorId:36-53` 3분기) `:268` 차단이 **경로 전환으로 우회 가능** — **실 경합 경로 미검증** | `PARTIAL` |
| 19 | approval routing eligible 여부 | 🔴 **승인자 후보 계산 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) → 적격 여부를 물을 대상 **무대상** | `ABSENT` |
| 20 | manager chain eligible 여부 | Manager Chain **전역 0** · `parent_user_id` 순회 = **단일 홉**(`resolveTenantId:200-217` · `LIMIT 1` 1회 · 재귀 없음) → 체인 자체가 없다 | `ABSENT` |
| 21 | valid_from | `valid_from` **전역 grep 0** · 유사 선례 `kr_fee_rule.effective_from`(`Db.php:898`) = **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0 · 읽기 4개소 전부 최신승) | `ABSENT` |
| 22 | valid_to | `valid_to`/`effective_to` **전역 grep 0** | `ABSENT` |
| 23 | status | 프로파일 엔티티 부재로 상태를 걸 대상 없음 | `ABSENT` |
| 24 | evidence | 적격성 판정 근거 기록 **0** · **`Actor Authorization Snapshot` = `ABSENT`**(승인 시점 권한 동결 0) · 이식 선례 `menu_audit_log.hash_chain`(`AdminMenu.php:128`) — 🔴 쓰기 체인만 실재·`verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68` | `LEGACY_ADAPTER` |

**실측 개수: 24 / 24 전사** (**측정기 분모 24 와 일치**).
커버리지 = `ABSENT` 18 · `PARTIAL` 3 · `NAME_ONLY` 2 · `CONTRACT_ONLY` 1 · `LEGACY_ADAPTER` 1 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- 🔴 **`is_active` 를 `active employment required` 의 구현으로 삼지 마라.** **계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 인증 게이트). 재사용하면 **"로그인 가능 = 승인 적격"** 이 되어 §37 요구 14건 중 최소 4건이 **자동 통과**한다 — 288차 `ok=>true` 위장과 동형인 **가짜 녹색**이다.
- 🔴 **`NOT NULL DEFAULT 1`(`Db.php:1106`) 패턴을 적격성 컬럼에 복제 금지.** **미지가 자동으로 "가용"** 이 되는 fail-open 이며, §37 의 Unknown≠Eligible(Fail-closed) 와 정면 충돌한다. 신규 적격성 축은 **`NULL` 허용 + Unknown→거부**.
- 🔴 **`team_role='manager'` 에 적격성을 더 얹지 마라**(§76 실재 항목 3 — *"Manager 라는 이유만으로 Approval Authority 자동 부여"* `UserAuth.php:1064`·`TeamPermissions.php:136`). 이는 §4.1 이 금지하는 바로 그 결합이며, **현행은 아직 그 결합조차 없는 상태**(호출자=승인자)이므로 **지금 얹으면 새 결함을 신설**하는 것이다.
- ★**§36 의 유일한 이식 자산은 `Mapping.php:268-271`(자기승인 차단) 하나다.** 이를 **전사 표준으로 승격**하되 ⚠️**actor 경로 이원화**(`actorId:36-53` `apikey:{id}`/`user:{email}`/`user:#{id}`)를 먼저 해소하지 않으면 차단이 우회 가능하다.
- 🔴 **`Alerting::actor:33-36` 을 참조 구현으로 삼지 마라** — **`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백** = **289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**. `INSERT INTO action_request` **grep 0** 이라 현재 도달 불가(`VACUOUS`)이나 **생산자를 하나 붙이는 순간 위조가능 승인이 활성화**된다.
- 🔴 **적격성 = 핸들러별 하드코딩 상태를 "정책"으로 오독 금지.** 4개 승인 경로가 **서로 다른 축**(정족수 / **구독 플랜** / 테넌트 owner / 라우트 게이트)으로 판정한다 — 이는 정책의 다양성이 아니라 **정책 계층의 부재**다.
- 24종 **"있다고 가정"하고 배선 금지**.
