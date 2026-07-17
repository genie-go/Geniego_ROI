# DSAR — Missing Manager Policy (§43)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §43 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 전면 `ABSENT` — **폴백할 대상이 12종 중 하나도 없다**

§43 은 **Manager 부재 시 대체 경로**를 요구한다. 이는 ① **대체 대상**과 ② **폴백 엔진** 양쪽을 전제한다. **양쪽 다 없다.**

| 계층 | 실측 | 결론 |
|---|---|---|
| **폴백 엔진** | 🔴 **`fallback_policy`·`fallback_sequence`·`max_climb`·`maximum_climb`·`hierarchy_climb` 전부 grep 0** | `ABSENT` |
| **승인자 계산기** | 🔴 **`resolveApprover`·`approval_chain`·`routeApproval` grep 0** — **승인자 후보를 계산하는 코드가 레포에 없다**(`approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `ABSENT` |
| **Manager 관계** | `manager_id`·`reports_to`·`supervisor_id`·`department_head_id`·`head_id` **전부 grep 0** · git 삭제 이력 0 | `ABSENT` |
| **조직 계층** | §3.1 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend grep 0) · **`parent_team_id` grep 0 → 팀 트리 자체가 없다** | `CONTRACT_ONLY` |
| **Position** | 🔴 **전역 0** — `position_idx` = **PM 태스크 정렬순서**(함정) | `ABSENT` |
| **Escalation** | 🔴 `escalat` 히트 = **부정 리뷰 Slack 통지**(`Reviews.php:173-187` `autoEscalate`+`slackWebhook` · `WorkspaceState.php:32` `reviews_escalated`) — **리뷰 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| **Manual Review** | 🔴 **`manual_review` grep 0** | `ABSENT` |

### ★ 승인 경로 4개 전량 = **"호출자가 곧 승인자"** → 폴백이 개입할 지점 자체가 없다

| 경로 | 승인자 결정 | 자격 판정 축 |
|---|---|---|
| `Mapping::approve:238-294` | `actorId($request)`(`:246`) = **요청자 본인** | **정족수(숫자)뿐** — 적격 술어 **0** |
| `Catalog::approveQueue:2341-2365` | 🔴 **행위자를 읽지도 않는다** · `:2343` `requirePro` | **구독 플랜** |
| `AgencyPortal::approveAgency:365-385` | `:370` `isTenantOwner` | 고정 역할(가장 근접하나 **해석 아님**) |
| `FeedTemplate::approveDraft:271` | 라우트 게이트 | — |

> 🔴 ★**규칙 10 적중** — `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.
> 🔴 **"Manager 를 Approver 로 오용 중"이라 적으면 허구다** — **양쪽 개념이 다 없다.**
> 🔴 **`Approval Requirement` 는 축이 아니라 상수** — `required_approvals` 컬럼 존재 · `Mapping.php:287` 이 정족수 판정에 **실사용**. 🔴 **유일 생산자 `:210` 이 리터럴 `2` 하드코딩** — 요청자·금액·위험도 **무엇에도 반응 안 함**. → **§43 의 `approval domain` 별 정책 분기가 성립할 축이 없다**(5-3-3-1 D-13 `menu_defaults.version='baseline'` 과 동형).

### 대상 축 12종 실측 요약

| 폴백 대상 | 실측 | 판정 |
|---|---|---|
| Position Supervisor | Position **전역 0** | `ABSENT` |
| Organization Head | `head_id`·`department_head_id` **0** · 조직 `CONTRACT_ONLY` | `CONTRACT_ONLY` |
| Parent Organization Manager | 🔴 **`parent_team_id` grep 0 → 부모가 없다**(§44) | `ABSENT` |
| Functional Manager | `team.manager_user_id` = **단일 칸** → Type 구분 불가(§4.6) | `ABSENT` |
| Acting / Interim Manager | `acting` **0** · `interim` **1건 = 지오리프트**(`AttributionEngine.php:672`) | `ABSENT` |
| Designated Fallback Role | `team_role ∈ {owner,manager,member}`(`UserAuth.php:168`) — 🔴 **폴백 지정 개념 0** | `ABSENT` |
| Case Owner | 🔴 CRM Account Owner **`ABSENT`** — `CRM.php` 1659줄 전수 grep: `owner`·`assigned`·`sales_rep`·`account_owner`·`assignee`·`manager` **전부 0** | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 26종** (지원 Policy 12 + 필수 필드 14)

### 1-1. 지원 Policy — **12종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | USE_POSITION_SUPERVISOR | 🔴 **Position 전역 0** · `position_idx` = PM 태스크 정렬(함정) | `ABSENT` |
| 2 | USE_ORGANIZATION_HEAD | 🔴 `head_id`·`department_head_id` **grep 0** · §3.1 **18/18 `CONTRACT_ONLY`** | `CONTRACT_ONLY` |
| 3 | USE_PARENT_ORGANIZATION_MANAGER | 🔴 **`parent_team_id` grep 0 → 부모 조직이 없다**(§44 전면 `ABSENT`) | `ABSENT` |
| 4 | USE_FUNCTIONAL_MANAGER | 🔴 `team.manager_user_id` **단일 칸**(`TeamPermissions.php:148`) → Direct/Functional 구분 표현 불가 | `ABSENT` |
| 5 | USE_ACTING_MANAGER | 🔴 **`acting` grep 0** · **`UserAdmin::impersonate:466-525` 매핑 금지**(신원 위장 열람 · 주석 "대행" 6회는 함정) | `ABSENT` |
| 6 | USE_INTERIM_MANAGER | 🔴 **`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672`) | `ABSENT` |
| 7 | USE_DESIGNATED_FALLBACK_ROLE | 🔴 **폴백 지정 개념 0** · `team_role` = **롤 라벨**(owner\|manager\|member `UserAuth.php:168`) — 지정 슬롯 없음 | `ABSENT` |
| 8 | USE_CASE_OWNER_REFERENCE | 🔴 **CRM Account Owner `ABSENT`**(`CRM.php` 전수 grep 0) · `pm_raid.owner`(`PM/Enterprise.php:42`,`:60`) = **RAID 담당자 자유문자열** · `admin_growth_lead.owner`(`AdminGrowth.php:909`) = **자사 B2B 리드 담당자 문자열** — 전부 도메인 상이 | `ABSENT` |
| 9 | CREATE_MANUAL_REVIEW | 🔴 **`manual_review` grep 0** | `ABSENT` |
| 10 | ESCALATE_REFERENCE | 🔴 `escalat` = **부정 리뷰 Slack 통지**(`Reviews.php:173-187`·`:843` `autoEscalate`) — **리뷰 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | BLOCK_APPROVAL | ✅ **차단 선례는 실재** — `Mapping::approve` 미확인 actor **403 fail-closed**(`actorId:52` null → `:187-190`,`:246-250`) · `Dependencies.php:32-34` 쓰기 전 **422 `cycle_detected`** 🔴 **단 Manager 부재를 이유로 차단하는 코드는 0** | `LEGACY_ADAPTER`(차단 기법만) |
| 12 | CUSTOM | 부재 — 정책 확장점 0 | `ABSENT` |

> ★ **지원 Policy 목록은 `evidence` 로 끝나지 않는다**(`CUSTOM` 이 마지막 · `:1611`). **추가하지 않았다.**

### 1-2. 필수 필드 — **14종**

`MISSING_MANAGER_POLICY`:

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 13 | missing_manager_policy_id | 부재 — 정책 엔티티 0 | `ABSENT` |
| 14 | tenant | ✅ **테넌트 축은 건전한 선례 다수** — `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) · `Dependencies.php:91` **매 홉 tenant 필터** · 🔴 **반례 주의**: `menu_audit_log` **tenant_id 없음**(`AdminMenu.php:128` · `lastHash():214-219` tenant 술어 없음) · `admin_growth_approval` **tenant_id 컬럼 없음**(`AdminGrowth.php:142-149` · 조회도 tenant 술어 0: `:641`·`:1292`·`:1306`·`:1324`) · `menu_tree` tenant_id 없음(`AdminMenu::wouldCycle:540-555`) | `PARTIAL`(선례 有·반례 3) |
| 15 | reporting line type | 🔴 **보고선 Type 축 0**(§4.6) — `team.manager_user_id` 단일 칸 | `ABSENT` |
| 16 | approval domain | 🔴 **승인 도메인 구분 축 0** — `required_approvals` 유일 생산자 `Mapping.php:210` 이 **리터럴 `2` 하드코딩**(요청자·금액·위험도 무반응) → 도메인별 분기 불가 | `ABSENT` |
| 17 | organization type | 🔴 §3.1 `CONTRACT_ONLY` · 인접 `team.team_type VARCHAR(48)` — 🔴 **무검증 대입**(`createTeam:461`) · ENUM/CHECK/`in_array` **0** → **제약이 코드로 강제되지 않는다**(규칙 11) | `CONTRACT_ONLY` |
| 18 | legal entity scope | 🔴 **법인 엔티티 0** — `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720` · `:1183` 가입 필수검사) · FK·감독관계·승인라우팅·시점 **전무** · 🔴 **`DATA_SCOPES 'company'` = 무제한 센티넬**(`effectiveScope():258`) — **법인 아님** | `ABSENT` |
| 19 | country scope | 🔴 **탐지·라우팅이지 명부 아님** — `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** · `region` 3축(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| 20 | fallback sequence | 🔴 **`fallback_sequence` grep 0** — 순서 표현 수단 0 | `ABSENT` |
| 21 | maximum hierarchy climb | 🔴 **`max_climb`·`hierarchy_climb` grep 0** · ★**`Dependencies.php:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → **Maximum Depth 로 계산하면 오판** · 🔴 **`ChannelSync.php:955-962` 는 순환 검출기가 아니다**(`$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 조용히 절단**) — **후보 계산 금지** | `ABSENT` |
| 22 | cross legal entity allowed 여부 | 🔴 법인 경계 자체가 0 → 넘을 경계가 없다 | `ABSENT` |
| 23 | evidence requirement | 부재 — 증거 요구 수준 표현 0 | `ABSENT` |
| 24 | manual review threshold | 🔴 **`manual_review` grep 0** · 🔴 인접 `required_approvals` 는 **리터럴 `2`**(`Mapping.php:210`) = **임계가 아니라 상수** | `ABSENT` |
| 25 | status | 부재 · 인접 `team.status VARCHAR(20) DEFAULT 'active'`(`TeamPermissions.php:148`) = 팀 상태 | `ABSENT` |
| 26 | evidence | 부재 · 인접 = `pm_audit_log`(`tenant_id NOT NULL` + `entity` + `diff_json` `:13` + 3인덱스 `:17-19` + append-only `:2-3`) | `LEGACY_ADAPTER`(참조) |

**실측 개수: 26 / 26 전사** (12 + 14). (측정기 26 · 원문 대조 26 · 전사 26 — **3자 일치**.)
커버리지 = **`ABSENT` 20 · `CONTRACT_ONLY` 3 · `LEGACY_ADAPTER` 2 · `KEEP_SEPARATE_WITH_REASON` 1 · `PARTIAL` 1(중복 없이 26) · 커버 0**.

## 2. 규칙

- ★ **§43 전면 판정 = `ABSENT`.** `fallback_policy`·`fallback_sequence`·`max_climb`·`manual_review` **전부 grep 0**. **폴백 엔진도 폴백 대상 12종도 하나도 없다.**
- 🔴 **★§43 은 §29(승인 라우팅)에 종속한다.** 현행 승인 4경로 전량이 **"호출자가 곧 승인자"**(`Mapping::approve:246` 요청자 본인 · `Catalog::approveQueue:2341-2365` **행위자를 읽지도 않음** · `AgencyPortal:370` `isTenantOwner` · `FeedTemplate:271` 라우트 게이트)이므로 **"Manager 를 찾아 라우팅한다"는 단계 자체가 없다** → **폴백이 개입할 지점이 없다**. **승인자 후보 계산기(`resolveApprover` 등 grep 0)가 §43 의 선결 조건.** 없이 설계하면 역산.
- 🔴 **★`required_approvals` 를 "정책 축"으로 계산 금지**(규칙 7) — 컬럼은 실재하고 `Mapping.php:287` 이 정족수 판정에 **실사용**하지만, **유일 생산자 `:210` 이 리터럴 `2` 하드코딩**이라 **요청자·금액·위험도 무엇에도 반응하지 않는다**. **`approval domain`·`manual review threshold` 를 여기에 얹으면 상수 위에 정책을 세우는 꼴.** (5-3-3-1 D-13 `menu_defaults.version='baseline'` 과 동형.)
  - 🔴 `approvals_json`(`Mapping.php:285`) = `{user, ts}` **2키 JSON 배열** → **인덱스·as-of 질의 불가** — **정책 이력 저장소로 채택 금지**(`pm_baseline.captured_at` 과 동형).
- 🔴 **★`BLOCK_APPROVAL` 만 기법 선례가 있다 — 그러나 Manager 부재를 이유로 차단하는 코드는 0.** 차단 기법 자체는 REAL(`Mapping::actorId:52` 미확인 → **403 fail-closed** · `Dependencies.php:32-34` **쓰기 전 422 `cycle_detected`**). **기법만 이식하고 "차단 정책이 있다"로 계산 금지**(규칙 9).
- 🔴 **★기본 정책은 fail-closed 여야 한다.** 현행 fail-open 전례가 실재한다: `is_active TINYINT(1) NOT NULL DEFAULT 1`(`Db.php:1106` — **미지가 자동 "가용"**) · `index.php:508-545` 레이트리밋 **fail-open**. **Manager 부재 시 기본값은 `BLOCK_APPROVAL` 또는 `CREATE_MANUAL_REVIEW`** — **자동 승인 통과 금지**.
- 🔴 **`maximum hierarchy climb` 의 선례를 오독하지 마라** — `Dependencies.php:84` `$depth<10000` 은 **깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**)이다. 🔴 **`ChannelSync.php:955-962` 는 순환 검출기가 아니다**(`$visited` 없이 깊이만 자름 → 순환 시 **탐지 없이 조용히 절단**) — **후보 계산 금지**. **climb 상한은 신규 설계이며, 초과 시 "조용히 절단"이 아니라 명시적 차단이어야 한다.**
- 🔴 **`tenant` 필드 설계 시 반례 3건을 답습하지 마라** — `menu_audit_log`(tenant_id 없음 · `lastHash():214-219` tenant 술어 없음) · `admin_growth_approval`(**tenant_id 컬럼 없음** `AdminGrowth.php:142-149` · 조회 4개소 전부 tenant 술어 0) · `menu_tree`(`wouldCycle:540-555` tenant_id 없음). **채택 선례 = `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) + `Dependencies.php:91` 매 홉 tenant 필터.**
- 🔴 **`ESCALATE_REFERENCE` 를 `Reviews::escalateNegatives`(`:179`)로 배선 금지** — **부정 리뷰 Slack 통지**다. 도메인 상이 → `KEEP_SEPARATE_WITH_REASON`.
- 🔴 **`legal entity scope` 를 `DATA_SCOPES 'company'` 로 매핑 금지** — **무제한 센티넬**(`effectiveScope():258`)이며 법인이 아니다. ⚠️ 참고: `ORG_PRESET` 15팀 중 **8팀 scope 실효 없음**(`'재무팀' => 'company'` `:717` = 무제한 · `partner`(`:720-721`)·`campaign`(`:708-710`,`:718`) **소비처 0 → 영원히 무제한**). **등급 미부여**(설계 의도 미확인).
- 🔴 **`organization type` 을 `team.team_type` 열거로 논증 금지**(규칙 11) — `VARCHAR(48)` **자유 문자열 · ENUM/CHECK/`in_array` 0 · 무검증 대입**(`createTeam:461`). **"열거에 없다"는 열거가 실재할 때만 유효한 논증이다.**
- 🔴 **26종 "있다고 가정"하고 배선 금지.**
