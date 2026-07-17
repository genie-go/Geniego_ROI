# DSAR — Manager Candidate (§51)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §51 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **승인자 후보를 계산하는 코드가 레포에 0개다**

| 항목 | 실측 | 판정 |
|---|---|---|
| `MANAGER_CANDIDATE` 엔터티 | **grep 0** | `ABSENT` |
| Existing Approval Manager Resolver | `resolveApprover`·`approval_chain`·`routeApproval` **backend/src grep 0** | `ABSENT` |
| `approver` 문자열 2건 | `Mapping.php:248`·`:280` — **에러 메시지 문자열**(`"approver identity unresolved"`·`"already approved by this approver"`) | **코드 아님 — 존재증명 불가** |
| Manager Relationship 축 | `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id` **전량 0** · git 삭제 이력도 **0** | `ABSENT`(팬텀도 유물도 아님 — 존재한 적 없음) |

**★승인 경로 4개 전량 = "호출자가 곧 승인자"** — 후보 집합을 만들고 그중에서 고르는 단계가 **없다**:

| 경로 | 승인자 결정 | 후보 계산 |
|---|---|---|
| `Mapping::approve:238-294` | `actorId($request)`(`:246`) = **요청자 본인** | **없음** — 정족수(숫자)뿐, 적격 술어 0 |
| `Catalog::approveQueue:2341-2365` | 🔴 **행위자를 읽지도 않는다** · `:2343` `requirePro` | **없음** |
| `AgencyPortal::approveAgency:365-385` | `:370` `isTenantOwner` | **없음**(고정 역할 — 해석 아님) |
| `FeedTemplate::approveDraft:271` | 라우트 게이트 | **없음** |

### ★축 주의 — `candidate` grep 히트는 **전부 오염원**

| 히트 | 실제 정체 |
|---|---|
| `Wms.php:1017`·`:1063` `candidates` | **창고 선정 후보**(배송지 커버리지 점수순) |
| `CRM.php:769`·`:772`·`:835` `identityCandidates` | **고객 아이덴티티 확률매칭 후보**(직원 아님) |
| `Geo.php:105-110` `$candidates` | IP→국가 판정 후보 |
| `PM/Gantt.php:138`·`:167` `$candidate` | **PHP 지역변수**(일정 ES/LF 계산) |

🔴 **이 중 어느 것도 승인자 후보가 아니다.** 형태 유사를 커버로 계산하면 §51 갭이 정의상 소멸한다(규칙 9·10).

### ★규칙 10 적중 — "안 하는 것"이 준수가 아니다

`Mapping::approve` 가 **Manager 권한 자동상속을 하지 않는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다. 마찬가지로 후보 배제·순위·중복제거가 **0건인 것은 정책이 아니라 후보 개념 자체의 부재**다.

## 1. 원문 전사 + 판정 — **원문 32종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_candidate_id | 부재 — 후보 엔터티 없음 | `ABSENT` |
| 2 | subordinate subject | 직원 아이덴티티 = `app_user.id`+`email` 뿐(`UserAuth.php:156-179`) · **하급자 축 없음** | `ABSENT` |
| 3 | subordinate position | Position 개념 전역 0 · `position_idx` = **PM 태스크 정렬순서**(무관) | `ABSENT` |
| 4 | organization | §3.1 `ORGANIZATION_*` **backend 전역 grep 0** | `CONTRACT_ONLY` |
| 5 | approval request | 인접 = `mapping_change_request`(`Mapping.php:209-210`) — **매핑 변경 요청**이지 조직 승인 요청 아님 | `LEGACY_ADAPTER` |
| 6 | approval case | Case 개념 0 — Request/Case 미분화 | `ABSENT` |
| 7 | approval requirement | `required_approvals` 컬럼 존재·`:287` 실사용 — 🔴 **유일 생산자 `:210` 이 리터럴 `2` 하드코딩** → 요청자·금액·위험도 무반응 | `NAME_ONLY` |
| 8 | requested action | `mapping_change_request` = `platform`·`field`·`raw_value`·`canonical_value`(`:209`) — **단일 도메인 고정** | `LEGACY_ADAPTER` |
| 9 | resource | 자원 축 없음(위 4컬럼이 곧 대상) | `ABSENT` |
| 10 | effective date | **`effective_to`/`valid_from`/`valid_to` grep 0** · `kr_fee_rule.effective_from`(`Db.php:898`)은 **세율 도메인이며 질의도 0**(`WHERE effective_from <= :as_of` 전역 0) | `ABSENT` |
| 11 | candidate manager subject | **후보 계산 코드 0** | `ABSENT` |
| 12 | candidate manager position | Position 0 | `ABSENT` |
| 13 | candidate manager organization | `ORGANIZATION_*` 0 | `CONTRACT_ONLY` |
| 14 | relationship type | 관계 자체가 없음 · `team_role='manager'`(`UserAuth.php:168`) = **롤 라벨**(관계 아님) | `ABSENT` |
| 15 | relationship version | 엔티티 `version` = `menu_defaults.version` 1건이며 ★**유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** · optimistic lock `version` grep 0 | `ABSENT` |
| 16 | source type | §3.4 외부 소스 **42항목 전부 부재**(HRIS·ERP·IdP·SCIM manager 전량 0) | `ABSENT` |
| 17 | source priority | ★**"우선순위 미구현"이 아니라 정렬할 대상이 0개**(§62) — manager 보유 소스 = 0 | `ABSENT`(무대상) |
| 18 | assignment priority | Assignment 개념 0 | `ABSENT` |
| 19 | hierarchy level | `team` 에 **`parent_team_id` 없음**(`TeamPermissions.php:148`/`:168`) → 팀 트리 자체가 없다 · `app_user.parent_user_id` 는 **owner 직속 2단 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`) | `ABSENT` |
| 20 | chain distance | 체인 없음 → 거리 없음 | `ABSENT` |
| 21 | legal entity relationship | Legal Entity 0 · `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`) · FK·감독관계 전무 | `ABSENT` |
| 22 | scope match | 인접 = `data_scope`(`TeamPermissions.php:164`) — 🔴 **`UNIQUE(tenant_id,subject_type,subject_id)` = 단일행이 스키마로 강제**(규칙 10 — 정책이 아니라 UNIQUE 가 복수를 금지) | `LEGACY_ADAPTER` |
| 23 | domain match | 도메인 매칭 술어 0 | `ABSENT` |
| 24 | availability state | `on_leave`·`out_of_office`·`vacan`·`acting`·`interim`(무관 1건) **전량 0** · 🔴 `is_active` = **계정 상태이지 고용/가용 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 인증 게이트) | `ABSENT` |
| 25 | eligibility result | 적격 판정 술어 **0** — `Mapping::approve` 는 **정족수(숫자)만** 센다(`:287`) | `ABSENT` |
| 26 | exclusion reasons | §52 참조 — **배제할 후보 집합이 없다** · 현행 3술어는 **승인시점 검증**(축 상이) | `ABSENT` |
| 27 | conflict state | 이해충돌 축 0 | `ABSENT` |
| 28 | ranking score reference | 후보 순위 0 · `GraphScore` 는 **화이트리스트 `['influencer','creative','sku','order']`(`GraphScore.php:57-59`) → 422 가 조직/Subject 노드 저장을 막는다** | `ABSENT` |
| 29 | proposed 여부 | `mapping_change_request.status='pending'`(`:210`) = **요청 상태**이지 후보 제안 플래그 아님 | `ABSENT` |
| 30 | manual review requirement | 수동 검토 축 0 | `ABSENT` |
| 31 | status | 후보 상태 0(위 29 와 동일 이유) | `ABSENT` |
| 32 | evidence | 근거 저장 축 0 · 인접 `pm_audit_log.diff_json`(migration `20260526_168_008:13`)+`tenant_id NOT NULL`(`:7`)+append-only(`:2-3`) | `LEGACY_ADAPTER` |

**실측 개수: 32 / 32 전사.** (측정기 분모 32 · 원문 대조 32 · 전사 32 — **3자 일치**)
원문이 `evidence` 로 **끝난다**(`:1902`) → 규칙 4 충족(추가·삭제 없음).

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 25 · `LEGACY_ADAPTER` 4(5·8·22·32) · `CONTRACT_ONLY` 2(4·13) · `NAME_ONLY` 1(7).

## 2. 규칙

- 🔴 **§51 전체 판정 = `ABSENT`.** 32필드 중 **커버(`VALIDATED_LEGACY`) 0**. `LEGACY_ADAPTER` 4건은 **이식 가능한 인접 자산**이지 커버가 아니다(판정 어휘 §).
- 🔴 **"Manager 를 Approver 로 오용 중"이라 적으면 허구다.** 양쪽 개념이 다 없다 — 오용할 Manager 도, 후보를 고를 Resolver 도 없다.
- 🔴 **`candidate` grep 히트(Wms·CRM·Geo·Gantt)를 §51 후보로 계산 금지.** 전부 타 도메인 지역변수·타 엔터티다.
- 🔴 **`Mapping` 의 3술어(신원 fail-closed·자기승인 차단·dedup)를 §51 커버로 계산 금지.** 이는 **승인 시점 검증**이며 §51 은 **후보 집합 생성**이다 — 축이 다르다(§52 §0 참조).
- ★**후보 계산기 신설 시 `Mapping::actorId:36-53` 의 3분기를 반드시 선결하라.** 동일인이 API키(`:41`)/세션(`:47`)/`user:#{id}` 폴백(`:49`) 경로로 **서로 다른 actor 문자열**을 갖는다 → 후보 동일성 판정이 경로별로 깨진다(§52 §2 라이브 확인 선결 항목).
- ★**`required_approvals` 를 "요건 모델이 있다"의 근거로 삼지 마라**(규칙 7). 컬럼은 있으나 생산자가 리터럴 `2` 고정 → **5-3-3-1 D-13 `menu_defaults.version='baseline'` 과 정확히 동형**.
- ★**`app_user.parent_user_id` 를 보고선으로 재사용 금지.** owner 직속 2단 봉인이며, 3단 허용 시 `resolveTenantId:200-217` **단일 홉 가정이 붕괴** → 286차 하이재킹과 동형 사고. **일반화가 선결.**
- 🔴 **후보 엔터티를 `graph_node`(`Db.php:816-839`)로 신설 금지** — 두 번째 그래프 스토어 = 헌법 위반. ⚠️ 단 `graph_node` 는 **인덱스·UNIQUE 0**(`:816-824`)이므로 스키마 복제도 금지.
