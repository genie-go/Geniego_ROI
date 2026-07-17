# DSAR — Future-Dated Manager Change (§39)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §39 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 전제 — **미래 일자 변경을 표현할 계층이 통째로 없다**

| 계층 | 실측 | 판정 |
|---|---|---|
| **관계 축** | `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id` **전부 grep 0** · **git 삭제 이력 0** | `ABSENT` — 존재한 적이 없다 |
| **시점 축** | `effective_to`/`valid_from`/`valid_to` **grep 0** · `kr_fee_rule.effective_from`(`Db.php:898`) 은 **컬럼 有·as-of 질의 無**(읽기 4개소 전부 최신승 `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | `PARTIAL`(타 도메인) |
| **예약 집행기** | 🔴 **미래 일자 변경을 발동시킬 스케줄러 0** · 인접 = SMS 예약 워커(286차 신설) — **발송 도메인** | `ABSENT` |
| **조직 축** | §3.1 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` **backend/src grep 0**) · `parent_team_id` **grep 0** → **팀 트리 자체가 없다** | `CONTRACT_ONLY` |
| **마이그레이션** | `backend/migrations/` **21파일 · 172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) | — |

### 현행 Manager 교체 = **즉시·무기록·무예약**

`team.manager_user_id INT NULL`(DDL `TeamPermissions.php:148` MySQL / `:168` SQLite) = **팀당 1칸**.

- 쓰기경로는 **REAL**: `createTeam:463-469`(manager 수령 → **테넌트 소속 검증 `:464` 422** → INSERT `:466` → `promoteManager:469`) · 수정 `:492-495`
- `promoteManager:768-776` = `app_user.team_role='manager'`+`team_id` UPDATE(`:774`) · owner 강등 차단(`:773`)
- 🔴 **결여**: **effective date 0 · 이력 0 · 예약 0 · nullable** → 교체는 **UPDATE 한 방**이며 **언제부터인지 기록되지 않는다**
- 🔴 ★**전임자 강등 없음**(`TeamPermissions.php:492-501`) → **교체해도 전임자가 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유**

> 🔴 **★규칙 10 적중** — 현행이 "미래 일자 변경을 잘못 처리하지 않는" 것은 **§39 준수가 아니라 미래 일자라는 개념이 없어서**다.

### 지원 변경 18종의 대상 축 — **대상조차 대부분 없다**

| 축 | 인접 자산 | 실측 |
|---|---|---|
| Position | 🔴 **직무 Position 개념 전역 0** — `position_idx`(`PM/Milestones.php:28`·`Gantt.php:42`·`Tasks.php:167`) = **PM 태스크 정렬순서** · `job_title`/`job_code`/`position_id` **0** | `ABSENT` |
| Organization | §3.1 **18/18 `CONTRACT_ONLY`** · `ORG_PRESET` = 열거+시딩 · **계층 링크 0** | `CONTRACT_ONLY` |
| Legal Entity | `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`) · **법인 엔티티 0** · 🔴 `DATA_SCOPES 'company'` = **무제한 센티넬**(`effectiveScope():258`) — 법인 아님 | `ABSENT` |
| Project | `pm_projects.owner_user_id` **PARTIAL** — 🔴 **`WHERE owner_user_id` grep 0 = 판독 술어 0**(저장된 라벨) · 무검증 자유문자열 · 기본값이 생성자(`Projects.php:66`) | `PARTIAL` |
| Program | 🔴 **주석 팬텀** — `PM/Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0** | `ABSENT`(규칙 8) |
| Regional / Country | **탐지·라우팅·세그먼트이지 명부 아님** — `Geo.php:23-53`(IP→ISO alpha-2 **언어 결정용**) · `region` 3축(광고 인구통계 `Db.php:681` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| Cost Center | **`cost_center` grep 0** | `ABSENT` |
| Acting / Temporary / Interim | **`acting` 0 · `interim` 1건 무관**(`AttributionEngine.php:672` 지오리프트 중간결과) · `deputy`/`substitute`/`stand_in` **0** | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 30종** (지원 변경 18 + Future Change 기록 12)

### 1-1. 지원 변경 — **18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Direct Manager Change | `team.manager_user_id` UPDATE(`TeamPermissions.php:492-495`) — **즉시 · effective date 0 · 이력 0 · 전임자 강등 0** | `PARTIAL`(즉시 교체만) |
| 2 | Position Supervisor Change | **Position 개념 전역 0** → 변경할 대상 부재 | `ABSENT` |
| 3 | Functional Manager Change | **Functional/Direct 구분 축 0**(§4.6 Type 표현 불가 · **단일 칸**) | `ABSENT` |
| 4 | Organization Head Change | §3.1 `CONTRACT_ONLY` · `department_head_id`·`head_id` **grep 0** | `ABSENT` |
| 5 | Acting Assignment Start | **`acting` grep 0** · 🔴 `UserAdmin::impersonate:466-525` 매핑 금지(신원 위장 열람) | `ABSENT` |
| 6 | Acting Assignment End | 동상 — **종료 시점 표현 수단(`effective_to`) 자체가 0** | `ABSENT` |
| 7 | Temporary Assignment Start | 부재 | `ABSENT` |
| 8 | Temporary Assignment End | 부재 | `ABSENT` |
| 9 | Interim Assignment Start | **`interim` 1건 = 지오리프트**(이름 함정) | `ABSENT` |
| 10 | Interim Assignment End | 부재 | `ABSENT` |
| 11 | Organization Transfer | §3.1 `CONTRACT_ONLY` — 🔴 이동시킬 조직 노드가 실 코드에 0 | `CONTRACT_ONLY` |
| 12 | Position Transfer | Position 부재 | `ABSENT` |
| 13 | Legal Entity Transfer | 법인 엔티티 부재(`ceo_name` = 평문 프로필) | `ABSENT` |
| 14 | Project Assignment Change | `pm_projects.owner_user_id` 쓰기 有(`Projects.php:58`,`:66`,`:113`) · 🔴 **판독 술어 0 · 시점 0 · 이력 0** | `PARTIAL` |
| 15 | Program Assignment Change | 🔴 **program = 주석 팬텀**(`PM/Enterprise.php:13`) — 코드 0 | `ABSENT` |
| 16 | Regional Manager Change | 🔴 `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112`)는 **`region`·`country` 와 같은 테이블에 공존**해 오독하기 쉽다 — **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** | `NAME_ONLY` |
| 17 | Country Manager Change | 동상 — Country 명부 0 | `ABSENT` |
| 18 | Cost Center Manager Change | **`cost_center` grep 0** | `ABSENT` |

> ★ **원문 지원 변경 목록은 `evidence` 로 끝나지 않는다**(`Cost Center Manager Change` 가 마지막 · `:1482`). **추가하지 않았다**(규율 규칙 4 반대편향 방지).

### 1-2. Future Change 기록 항목 — **12종**

원문: *"Future Change에는 다음을 기록한다."*(`:1484`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 19 | scheduled effective date | 🔴 **미래 일자 컬럼 0** · `kr_fee_rule.effective_from` 은 **과거/현재 기준 최신승**이며 **미래 행을 배제하는 술어(`<= NOW()`)가 없다** → 미래 행 삽입 시 **즉시 활성** | `ABSENT` |
| 20 | predecessor manager | 🔴 **`TeamPermissions.php:492-501` 교체 시 전임자 기록 0 · 강등도 0** → 전임자는 **소멸도 보존도 아닌 잔존** | `ABSENT` |
| 21 | successor manager | 신 manager 는 `manager_user_id` 에 **덮어쓰기** — 예약 슬롯 없음 | `ABSENT` |
| 22 | affected subjects | 부재 — 영향 계산기 0 | `ABSENT` |
| 23 | affected positions | Position 부재 | `ABSENT` |
| 24 | affected organizations | §3.1 `CONTRACT_ONLY` | `CONTRACT_ONLY` |
| 25 | affected active tasks | `pm_tasks` 실재 · 🔴 **DDL 에 assignee·owner·manager 컬럼 없음**(`created_by` 뿐) · 배정은 별도 N:N `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(migration `…168_005`) = **태스크 역할이지 매니저 아님** → **manager 변경과 연결할 축이 없다** | `KEEP_SEPARATE_WITH_REASON` |
| 26 | affected approval chains | 🔴 **`approval_chain`/`resolveApprover`/`routeApproval` grep 0** — **승인자 후보를 계산하는 코드가 레포에 없다**(`approver` 2건 = **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `ABSENT` |
| 27 | source | §3.4 외부 소스 **42항목 전부 부재**(HRIS/ERP/Directory 히트 0) · SCIM `manager` **전역 0** · `sso_config` DDL(`EnterpriseAuth.php:45-54`) = `email_attr`·`name_attr` **2슬롯뿐** | `ABSENT` |
| 28 | validation result | 부재 · 인접 = `createTeam:464` 테넌트 소속 검증 **422**(단일 술어) | `PARTIAL`(인접) |
| 29 | activation result | 🔴 **예약 활성화 개념 0** — 활성화할 예약이 없다 | `ABSENT` |
| 30 | evidence | 부재 · 🔴 인접 `pm_audit_log` = `tenant_id NOT NULL`(migration `20260526_168_008:7`)+`entity`+`diff_json`(`:13`)+3인덱스(`:17-19`)+**append-only 주석**(`:2-3`) — **가장 건전한 감사 선례** | `LEGACY_ADAPTER`(참조) |

**실측 개수: 30 / 30 전사** (18 + 12). (측정기 30 · 원문 대조 30 · 전사 30 — **3자 일치**.) 커버리지 = **부재 25 · `CONTRACT_ONLY` 2 · `PARTIAL` 3 · 커버 0**.

## 2. 규칙

- 🔴 **★§39 는 "미래 일자 처리가 잘못됐다"가 아니라 "미래 일자라는 개념이 없다"**이다. 현행 교체(`TeamPermissions.php:492-495`)는 **UPDATE 한 방 · 즉시 · 무기록**. **미래 예약 슬롯 · 예약 집행기 · 활성화 결과 = 전부 신규.**
- 🔴 **★`effective_from` 에 미래 날짜를 넣는 것으로 §39 를 닫지 마라.** `kr_fee_rule` 읽기 4개소 전부 `ORDER BY effective_from DESC LIMIT 1` 이며 **`WHERE effective_from <= NOW()` 술어가 없다**(전역 grep 0) → **미래 행을 넣는 순간 즉시 활성화된다**. 이는 §39 의 정반대다. **미래 행 배제 술어가 `scheduled effective date` 의 선결 조건.**
- 🔴 **★predecessor 를 반드시 명시적으로 강등하라.** 현행은 교체 시 전임자 `team_role='manager'` 가 **잔존**해 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`)을 **계속 보유**한다. §76 이 탐지를 요구한 *"Acting Manager 를 기존 Manager 덮어쓰기"* 의 **실재 사례**다 → **predecessor manager 기록 + 강등을 같은 트랜잭션에 묶어라.**
- 🔴 **`affected approval chains` 는 계산 대상이 0**이다 — 승인 경로 4개 전량 **"호출자가 곧 승인자"**(`Mapping::approve:246` `actorId` = 요청자 본인 · `Catalog::approveQueue:2341-2365` **행위자를 읽지도 않는다** · `AgencyPortal::approveAgency:370` `isTenantOwner` · `FeedTemplate::approveDraft:271` 라우트 게이트). **"Manager 를 Approver 로 오용 중"이라 적으면 허구다** — **양쪽 개념이 다 없다.**
- 🔴 **`affected active tasks` 를 `pm_task_assignees` 로 매핑 금지**(규칙 9) — `role ENUM('owner','contributor','reviewer','observer')` 는 **태스크 역할**이며 감독 관계가 아니다. 미달을 커버라 부르면 **§39 갭이 정의상 소멸**한다.
- 🔴 **`wms_warehouses.manager`(`Wms.php:62`)를 Regional Manager 로 계산 금지** — `region`·`country` 컬럼과 **같은 테이블에 공존**하는 것이 유일한 근거이며, 실체는 **시설 담당자 자유텍스트**(FK 0 · 판독 술어 0) = `NAME_ONLY`.
- **`source` 는 §62 와 짝** — **manager 데이터를 한 바이트라도 싣는 소스가 0개**다. **`VACUOUS` 이전에 무대상.** 소스 없이 `source effective date` 를 설계하면 역산.
- **`evidence` 는 `pm_audit_log` 형태 채택**(`tenant_id NOT NULL` + `diff_json` + append-only) — 🔴 `menu_audit_log` **스키마 복제 금지**(`tenant_id` 부재).
- 🔴 **30종 "있다고 가정"하고 배선 금지.**
