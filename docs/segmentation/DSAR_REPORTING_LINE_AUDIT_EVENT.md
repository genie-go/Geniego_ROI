# DSAR — Audit Event (§74)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §74 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 **"해시체인 없음"은 전역 명제로 쓰면 거짓이다**

**참인 것은 전역 `audit_log` 에 한해서다.**

```
Db.php:540-545          CREATE TABLE IF NOT EXISTS audit_log (
                          id           INT AUTO_INCREMENT PRIMARY KEY,
                          actor        VARCHAR(255) NOT NULL,
                          action       VARCHAR(255) NOT NULL,
                          details_json MEDIUMTEXT,
                          created_at   VARCHAR(32) NOT NULL
                        )
AdminGrowth.php:157-159 CREATE TABLE IF NOT EXISTS audit_log (
                          id $AI, actor TEXT, action TEXT, details_json TEXT, created_at TEXT
                        )   ← 주석 :156 "기존 테이블 재사용"
```

→ 전역 `audit_log` = **4컬럼(+id) · `tenant_id` 없음 · 해시체인 없음 · `entity` 없음 · 인덱스 없음.** **이 축에 한해 "해시체인 없음"은 참.**

### ★선례 실재 — **두 개의 더 나은 감사 스토어**

| 자산 | 실측 | 이식 가치 |
|---|---|---|
| **`menu_audit_log`** | `hash_chain CHAR(64)`(`AdminMenu.php:128` MySQL / `:143` SQLite) · **SHA-256 prev-chain** 생성 `:182-197`(`:197` `hash('sha256', $payload)`) · `lastHash():214-219`(`SELECT hash_chain … ORDER BY id DESC LIMIT 1`) · 마이그레이션 `20260526_168_102` · 주석 `:18` *"모든 mutation 에 audit_log 기록 + hash_chain (tamper-evident)"* | ✅ **해시체인 알고리즘** |
| **`pm_audit_log`** | migration `20260526_168_008` — **`tenant_id VARCHAR(64) NOT NULL`(`:7`)** · `actor_user_id`(`:8`)+`actor_api_key`(`:9`) **2축** · `entity_type ENUM(...)`(`:10`)+`entity_id`(`:11`) · `action ENUM(...)`(`:12`) · **`diff_json JSON`(`:13`)** · `ip_addr`(`:14`)+`user_agent`(`:15`) · `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`(`:16`) · **3인덱스**(`:17-19` — `(tenant_id,created_at)`·`(entity_type,entity_id)`·`(actor_user_id)`) · **append-only 주석**(`:2-3` *"application 차원 UPDATE/DELETE 거부"*) | ✅ **골격** |

### 🔴 **단 선례는 알고리즘 수준이지 스키마 수준이 아니다**

- 🔴 **`menu_audit_log` 에 `tenant_id` 가 없다**(DDL `AdminMenu.php:123-131` 실측 — `menu_id`·`action`·`old_value`·`new_value`·`changed_by`·`changed_by_role`·`reason`·`ip_address`·`user_agent`·`request_id`·`hash_chain`·`created_at` · `PRIMARY KEY (id)` · `KEY idx_audit_menu (menu_id)`). **스키마 복제 금지 — 알고리즘만 이식.**
- 🔴 **`lastHash():214-219` 에 tenant 술어가 없다** — `SELECT hash_chain FROM menu_audit_log ORDER BY id DESC LIMIT 1`. 테넌트별 체인을 만들려면 **`WHERE tenant_id=?` 필수**. 없이 복제하면 **테넌트 A 의 이벤트가 테넌트 B 의 체인에 링크**되어 ①테넌트 간 정보 누출(prev hash) ②한 테넌트의 삽입이 다른 테넌트 체인을 흔듦 ③검증 불가. **286차 하이재킹과 동형의 격리 사고.**
- 🔴 **`pm_audit_log` 에는 `hash_chain` 이 없다** · **`menu_audit_log` 에는 `tenant_id`·`entity`·`diff_json`·다중 인덱스가 없다.** **어느 하나도 §74 를 단독으로 충족하지 못한다.**

### → **§74 정본 = `pm_audit_log` 골격 + `menu_audit_log` 해시체인 합집합 확장**

```
pm_audit_log 골격        : tenant_id NOT NULL · actor 2축 · entity_type/entity_id · action
                           · diff_json · ip/ua · created_at · 3인덱스 · append-only
  ∪  menu_audit_log 해시 : hash_chain CHAR(64) · SHA-256 prev-chain · lastHash()
  +  교정                : lastHash() 에 WHERE tenant_id=? 추가(선례 결함 미승계)
  +  확장                : action ENUM 을 §74 39종으로(현행 ENUM 7종 :12)
                           entity_type ENUM 확장(현행 7종 :10 — 전부 PM 도메인)
```

🔴 **중복 감사 스토어 신설 금지**(헌법). **세 번째 `*_audit_log` 를 만들면 레포에 감사 스토어가 4개가 된다**(`audit_log`·`menu_audit_log`·`pm_audit_log`·신규).

### Manager 도메인 실 코드 0

`REPORTING_LINE_AUDIT_EVENT` backend 전역 grep **0** · 39종 이벤트 **전부 발화 지점 부재**.

### ⚠️ 인접 실측 — 감사 품질 반례

- 🔴 **`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸** = **§55 "과거 Snapshot 대체 금지" 정면 반례**. append-only 를 **주석이 아니라 코드로** 강제해야 한다.
- ⚠️ `pm_audit_log` 의 append-only 는 **DB 제약이 아니라 애플리케이션 관례**(`:2-3` 주석이 *"application 차원 UPDATE/DELETE 거부"* 자인) → **핸들러가 지키지 않으면 뚫린다**(규칙 8 — 주석을 제약으로 오독 금지).

## 1. 원문 전사 + 판정 — **원문 39종**

**축 판정**: 스토어 = `CONSOLIDATION_REQUIRED`(`pm_audit_log` ∪ `menu_audit_log` 확장) · **이벤트 39종 = 전건 `CONTRACT_ONLY`**(발화 지점 0).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REPORTING_LINE_REGISTRY_CREATED | Registry 0 | `CONTRACT_ONLY` |
| 2 | REPORTING_LINE_DEFINITION_CREATED | Definition 0 | `CONTRACT_ONLY` |
| 3 | REPORTING_LINE_VERSION_CREATED | Version 0 · `menu_defaults.version` = 리터럴 `'baseline'` 라벨(`AdminMenu.php:309`) | `CONTRACT_ONLY` |
| 4 | REPORTING_LINE_VALIDATED | 검증 축 0 | `CONTRACT_ONLY` |
| 5 | REPORTING_LINE_ACTIVATED | 활성화 축 0 | `CONTRACT_ONLY` |
| 6 | MANAGER_RELATIONSHIP_CREATED | Relationship 0 | `CONTRACT_ONLY` |
| 7 | MANAGER_RELATIONSHIP_VERSION_CREATED | 🔴 **§68 #15 = 현행 사실**(version 축 0) | `CONTRACT_ONLY` |
| 8 | DIRECT_MANAGER_ASSIGNED | ⚠️**최근접 인접**: `promoteManager:768-776`(팀관리자 지정 → `team_role='manager'`+`team_id` UPDATE `:774`) · `createTeam:469` · 수정 `:492-495` — 🔴**감사 이벤트 발화 없음** · Type 표현 불가 | `CONTRACT_ONLY` |
| 9 | ADMINISTRATIVE_MANAGER_ASSIGNED | Type 축 0 — `manager_user_id` **단일값**이라 Direct/Administrative 구분 불가(규칙 10) | `CONTRACT_ONLY` |
| 10 | FUNCTIONAL_MANAGER_ASSIGNED | 동상 | `CONTRACT_ONLY` |
| 11 | DOTTED_LINE_MANAGER_ASSIGNED | 동상 · Matrix 표현 불가 | `CONTRACT_ONLY` |
| 12 | PROJECT_MANAGER_ASSIGNED | ⚠️`pm_projects.owner_user_id`(migration `…168_001:13` · 쓰기 `Projects.php:58`,`:66`,`:113`) = **`PARTIAL`** — 🔴**4결격**: ①`WHERE owner_user_id` **grep 0 = 판독 술어 0**(저장된 라벨) ②**무검증 자유문자열**(`validId()` 없음 · FK 없음) ③**기본값이 생성자**(`:66` `?? $g['user_id']`) → 미설정 행과 구분 불가 ④**단일값**. **감사 이벤트 발화 없음** | `CONTRACT_ONLY` |
| 13 | PROGRAM_MANAGER_ASSIGNED | 🔴 **`pm_portfolio` "프로그램" = 주석 팬텀**(`Enterprise.php:13` 주석이 자칭하나 **코드에 program 개념 0** · `\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) — 규칙 8 | `CONTRACT_ONLY` |
| 14 | REGIONAL_MANAGER_ASSIGNED | 🔴 **Regional Directory `ABSENT`** — `region` 3축 전부 무관(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0**. ⚠️**`wms_warehouses.manager VARCHAR(120)`**(`Wms.php:62`/`:112`)가 `region`·`country` 와 **같은 테이블에 공존**해 오독하기 쉽다 — **시설 담당자 자유텍스트 · FK 0 · 판독 술어 0** → `NAME_ONLY` | `CONTRACT_ONLY` |
| 15 | COUNTRY_MANAGER_ASSIGNED | Country Directory 0(`Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용**) | `CONTRACT_ONLY` |
| 16 | COST_CENTER_MANAGER_ASSIGNED | Cost Center 축 0 | `CONTRACT_ONLY` |
| 17 | PROFIT_CENTER_MANAGER_ASSIGNED | Profit Center 축 0(`budget_amount` `Projects.php:14-15` = **프로젝트 예산액**) | `CONTRACT_ONLY` |
| 18 | ACTING_MANAGER_ASSIGNED | `acting` 0. 🔴**`UserAdmin::impersonate:466-525` 로 계산 금지** — 주석이 "대행" 6회(`:466`,`:492`,`:525`)이나 **신원 위장 열람**(관리자 2시간 토큰 `:492`) · 기간부 Assignment·original manager 참조·covered scope **전무**. ⚠️`대행` 한글 grep 대량 히트 = **전부 비즈니스 도메인**(배송/구매대행·광고**대행사**·결제**대행**) — **직무대리 0건** | `CONTRACT_ONLY` |
| 19 | TEMPORARY_MANAGER_ASSIGNED | Temporary 0 | `CONTRACT_ONLY` |
| 20 | INTERIM_MANAGER_ASSIGNED | `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) | `CONTRACT_ONLY` |
| 21 | CO_MANAGER_GROUP_CREATED | Co-manager 0 · 단일 칸이라 복수 표현 불가 | `CONTRACT_ONLY` |
| 22 | MANAGER_ASSIGNMENT_ENDED | 🔴 **§68 #10 직결 — 종료 경로 자체가 0**(`SET team_role` 쓰기 **전역 2개소**: `TeamPermissions.php:774` 승격 · `EnterpriseAuth.php:489` SCIM 그룹매핑 → **강등 술어 0 확정**) | `CONTRACT_ONLY` |
| 23 | MANAGER_VACANCY_DETECTED | `vacan` 0 · 탐지기 0 | `CONTRACT_ONLY` |
| 24 | MISSING_MANAGER_DETECTED | Missing Manager Policy 0 | `CONTRACT_ONLY` |
| 25 | MANAGER_CONFLICT_DETECTED | 충돌 판정 축 0 | `CONTRACT_ONLY` |
| 26 | SELF_REPORTING_DETECTED | 선례 `Handlers/PM/Dependencies.php:29-31`(self-loop 422) — **도메인 상이** | `CONTRACT_ONLY` |
| 27 | CIRCULAR_REPORTING_DETECTED | ⚠️**감사 이벤트 선례 有**: `Dependencies.php:48-54`(순환 관련 Audit Event) — **§58 Cycle 처리 11요구 중 실재 2 중 하나**. 🔴`ChannelSync.php:955-962` **후보 아님**(`$visited` 없이 깊이만 자름 → **탐지 없이 조용히 절단**) | `CONTRACT_ONLY` |
| 28 | CROSS_TENANT_MANAGER_BLOCKED | ⚠️선례 `createTeam:464`(테넌트 소속 검증 → 422) — **감사 발화는 없음** | `CONTRACT_ONLY` |
| 29 | CROSS_ENTITY_MANAGER_REVIEWED | Legal Entity 축 0 | `CONTRACT_ONLY` |
| 30 | SUPERVISORY_PATH_CREATED | Path 축 0(Recursive CTE·Closure Table·Path Prefix 0) | `CONTRACT_ONLY` |
| 31 | MANAGER_CANDIDATE_CREATED | 🔴 **Candidate 계산 코드 0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) | `CONTRACT_ONLY` |
| 32 | MANAGER_SNAPSHOT_CREATED | Snapshot 0 · `pm_baseline.captured_at` = **JSON 키**(`Handlers/PM/Enterprise.php:360`) `KV_ONLY` · ★`snapshot` grep 최다 = **CCTV JPEG**(`WmsCctv.php:45`) | `CONTRACT_ONLY` |
| 33 | MANAGER_CHANGE_IMPACT_DETECTED | 영향분석 축 0 | `CONTRACT_ONLY` |
| 34 | TASK_REASSIGNMENT_REQUESTED | `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` = **태스크 역할이지 매니저 아님** · `action ENUM` 에 `assign`/`unassign` 실재(`…168_008:12`)이나 **PM 태스크 도메인** | `CONTRACT_ONLY` |
| 35 | REPORTING_LINE_DRIFT_DETECTED | 🔴 **이중 공허**(좌·우변 부재 → **자동 MATCH = 가짜녹색**) | `CONTRACT_ONLY` |
| 36 | FUTURE_MANAGER_CHANGE_SCHEDULED | 미래 예약 변경 0. ⚠️인접 = SMS 예약 워커(286차) — **도메인 상이** | `CONTRACT_ONLY` |
| 37 | FUTURE_MANAGER_CHANGE_ACTIVATED | 동상 | `CONTRACT_ONLY` |
| 38 | RETROACTIVE_MANAGER_CORRECTION_RECORDED | 🔴 **§40 Retroactive Correction 집행 수단 없음** — `backend/migrations/` **21파일 · 172차 정지** → `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다**. 🔴**`Migrate` 이름 겹침 — DDL 적용기이지 도메인 데이터 이행기가 아니다** | `CONTRACT_ONLY` |
| 39 | MANUAL_REVIEW_REQUESTED | ⚠️인접 `action_request` = **VACUOUS**(`INSERT INTO action_request` **grep 0** · 생산자 전무) · `decideAction:591-595` **단일 결정으로 즉시 approved** = **정족수를 표시하나 집행하지 않는다** | `CONTRACT_ONLY` |

**실측 개수: 39 / 39 전사.**
측정기 분모 **39** · 원문 대조 **39** · 전사 **39** — **3자 일치.**
판정 분포: **`CONTRACT_ONLY` 39 / 39 (100%)** — 발화 지점 0. **스토어 축만 `CONSOLIDATION_REQUIRED`.**

## 2. 규칙

- 🔴 **"해시체인 없음"을 전역 명제로 쓰지 마라 — 거짓이다.** 참인 것은 **전역 `audit_log`**(`Db.php:540-545`/`AdminGrowth.php:157-159` — `actor`·`action`·`details_json`·`created_at` **4컬럼 · tenant 없음 · 해시체인 없음**)에 한해서다. **`menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain)은 실재하는 선례다.** 🔴**단 실재하는 것은 쓰기 체인뿐 — `verify()` 0·preimage ts(`:195`) 소실로 행에서 재계산 불가 → tamper-evident 는 아니다(주석 `:18` 은 주석일 뿐, 코드 근거 아님). 검증형 정본 = `SecurityAudit::verify():56-68`.**
- 🔴 **§74 = `pm_audit_log` 골격 + `menu_audit_log` 해시체인 합집합 확장.** **중복 감사 스토어 신설 금지**(신설 시 레포에 감사 스토어 4개).
- 🔴 **선례는 알고리즘 수준이지 스키마 수준이 아니다.**
  - **`menu_audit_log` 스키마 복제 금지** — `tenant_id` 가 없다(DDL `AdminMenu.php:123-131`). 복제하면 **테넌트 격리 절대 원칙 위반**.
  - **`lastHash():214-219` 에 tenant 술어가 없다** → 테넌트별 체인 시 **`WHERE tenant_id=?` 필수**. 없이 이식하면 테넌트 A 이벤트가 B 의 체인에 링크되어 **누출·오염·검증불가** 3중 사고(286차 하이재킹 동형).
  - **`pm_audit_log` 에는 `hash_chain` 이 없다** → 골격만 취하고 해시는 `menu_audit_log` 에서.
- 🔴 **append-only 를 주석으로 계산 금지**(규칙 8). `pm_audit_log` 의 append-only 는 **DB 제약이 아니라 애플리케이션 관례**(`…168_008:2-3` 자인)다. 반례가 실재한다: **`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이력을 물리 소거** = §55 정면 반례. **코드로 강제하라.**
- 🔴 **`action`·`entity_type` ENUM 확장이 선결.** `pm_audit_log.action ENUM` **7종**(`:12` create/update/delete/restore/status_change/assign/unassign) · `entity_type ENUM` **7종**(`:10` 전부 PM 도메인). §74 는 **39종 이벤트**를 요구 → ENUM 확장(또는 어휘 축 재설계)이 선행하며, **MySQL/SQLite 두 방언 수기 중복 작성 의무**.
- 🔴 **#38 Retroactive Correction 은 오늘 집행 수단이 없다.** `backend/migrations/` 172차 정지 · `ensureTables` 는 **생성만 하고 백필하지 않는다** · **`Migrate` 는 DDL 적용기이지 데이터 이행기가 아니다**. ⚠️예외 후보 = `backend/src/Handlers/PM/Shared.php:37-53`(런타임 `Migrate::applyFiles`) — **미검증**.
- 🔴 **#8·#12·#22 는 "인접 자산이 있으니 절반 됐다"로 계산 금지.** `promoteManager` 는 **감사 이벤트를 발화하지 않고** `pm_projects.owner_user_id` 는 **판독 술어 0의 저장된 라벨**이다(`WHERE owner_user_id` grep 0). **저장 ≠ 감사 · 라벨 ≠ 관계**(규칙 7).
- ⚠️ **회귀 커버리지 0** — manager/reporting 테스트 전무(`render.mjs:37` 은 **마운트 크래시만** 검사 · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 캠페인 계약키**, 조직 team 아님). 감사 이벤트 구현 시 **체인 검증 회귀(테넌트별 prev-hash 연속성)가 완료 조건**.
- 🔴 **본 문서는 코드변경 0.** 실 스토어 확장·해시체인 이식은 **별도 승인세션**(Golden Rule + verify + 배포승인).
