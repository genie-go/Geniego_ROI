# DSAR — Error·Warning Contract (§71 + §72)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §71·§72 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 오탐 회피 — **"에러 코드 체계 부재"는 과장이다**

**`AdminGrowth::fail` 은 실배선된 코드 봉투다.** 부재로 적으면 허구다.

```
AdminGrowth.php:181-184   private static function fail(Response $res, string $detail,
                                                       string $codeStr = 'ERROR', int $http = 400)
                          → self::json($res, null, $detail, $http, ['code' => $codeStr, 'detail' => $detail])
```

**`approvalDecide` 에 실배선 확인**(승인 도메인 · 본 스펙과 동일 축):

| 위치 | 코드 | HTTP | 조건 |
|---|---|---|---|
| `AdminGrowth.php:1322` | `VALIDATION` | **422** | `decision` 이 approved/rejected 아님 |
| `AdminGrowth.php:1326` | `NOT_FOUND` | **404** | 승인 항목 부재 |
| `AdminGrowth.php:1327` | `CONFLICT` | **409** | 이미 처리된 항목(상태 가드) |

`fail()` 호출처 **10개소 실측**(`:905`·`:929`·`:931`·`:1016`·`:1034`·`:1051`·`:1140`·`:1322`·`:1326`·`:1327`) · 코드 어휘 `VALIDATION`/`NOT_FOUND`/`CONFLICT`/`SAVE_FAILED`.

→ **§71 = `VALIDATED_LEGACY`(봉투 축).** 🔴 **두 번째 에러 봉투 신설 금지** — 헌법 위반(중복 인텔리전스/중복 엔진). §71 의 37종 **코드 문자열**은 `fail()` 의 `$codeStr` 인자로 **그대로 실릴 수 있다.**

### ⚠️ 비대칭 — **§72 Warning 은 봉투 구조 변경이 선결**(작업량 과소평가 금지)

```
AdminGrowth.php:164-179   private static function json(...)
  $body = [
      'success' => $err === null,
      'data'    => $err === null ? $data : null,
      'message' => $msg,
      'error'   => $err,
      'meta'    => ['request_id', 'timestamp', 'version'],
  ];
```

🔴 **키 5개 — `warning` 슬롯이 없다.** §71 은 기존 `error` 슬롯에 얹히지만 **§72 는 얹을 자리가 없다.**

- ⚠️ **`warning` grep 히트는 전부 `data` 페이로드 내부 임시 키**이지 봉투 축이 아니다: `OpenPlatform.php:187`·`UserAuth.php:4250`,`:4288`(시크릿 1회 노출 문구) · `AnomalyDetection.php:71`,`:199`(심각도 카운트) · `Catalog.php:875`,`:1240`,`:2216` · `EmailMarketing.php:959`,`:1016`(등급 랭크). **표준 warning 채널 = 전역 0.**
- 🔴 **§72 는 §71 의 "18종 더 추가" 가 아니다.** ①봉투에 `warning`(또는 `warnings[]`) 슬롯 신설 → ②`success=true` 와 warning 공존 시맨틱 정의(**warning 은 실패가 아니다**) → ③기존 10개 `fail()` 호출처 및 전 `json()` 호출처 회귀 → ④프론트 소비 계층 대응. **§71 대비 작업량이 질적으로 다르다.**

### ⚠️ 가시성 승격 선결

**`fail`(`:181`)·`json`(`:164`) 이 `private static`** → `AdminGrowth` **클래스 외부에서 호출 불가**. Manager 도메인이 이 봉투를 쓰려면 **가시성 승격(또는 공용 트레이트/헬퍼 추출)이 선결**이다. **복사·붙여넣기로 두 번째 구현을 만들면 헌법 위반.**

### ⚠️ 미확인 — **`AdminGrowth` 봉투가 전사 표준인지 확인 못 함**

`AdminGrowth` 국소 실배선은 확정이나, **이 봉투가 레포 전 핸들러의 표준인지는 미확인**이다. 인접 축 관찰: `Mapping`·`Catalog`·`UserAuth` 등은 `['ok'=>true, ...]` 형태를 쓰는 곳이 있어 **봉투가 최소 2계열 이상 공존할 가능성**이 있다(288차 `ok=>true` 축). **표준 선정은 별도 조사 후 결정** — 본 문서는 **"승인 도메인에서 실증된 봉투는 `AdminGrowth::fail` 이다"** 까지만 주장한다.

### Manager 도메인 자체는 실 코드 0

37+18 = **55종 전부 Manager 축 실체 부재**. `manager_id`·`reports_to`·`supervisor_id`·`acting`·`vacan` **grep 0** · git 삭제 이력 **0**.

## 1-A. 원문 전사 + 판정 — **§71 Error Contract · 원문 37종**

**축 판정**: 봉투 = `VALIDATED_LEGACY`(`AdminGrowth::fail:181-184`) · **코드 값 37종 = 전건 `CONTRACT_ONLY`**(Manager 도메인 실 코드 0).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REPORTING_LINE_REGISTRY_NOT_FOUND | Registry 0 · `NOT_FOUND` 코드 어휘는 실재(`:1326` 404) | `CONTRACT_ONLY` |
| 2 | REPORTING_LINE_DEFINITION_NOT_FOUND | Definition 0 | `CONTRACT_ONLY` |
| 3 | REPORTING_LINE_VERSION_NOT_FOUND | Version 0 | `CONTRACT_ONLY` |
| 4 | REPORTING_LINE_VERSION_INACTIVE | Version 상태축 0 · `menu_defaults.version` = 리터럴 `'baseline'` 라벨(`AdminMenu.php:309`) | `CONTRACT_ONLY` |
| 5 | REPORTING_LINE_VERSION_IMMUTABLE | immutability 강제 선례 0(`schema_migrations.checksum` `Migrate.php:50` 은 DDL 축) | `CONTRACT_ONLY` |
| 6 | SUPERVISORY_HIERARCHY_NOT_FOUND | Supervisory 축 0 | `CONTRACT_ONLY` |
| 7 | SUPERVISORY_HIERARCHY_VERSION_NOT_FOUND | 동상 | `CONTRACT_ONLY` |
| 8 | MANAGER_RELATIONSHIP_TYPE_NOT_FOUND | Type 축 0(§4.6 표현 불가) | `CONTRACT_ONLY` |
| 9 | MANAGER_RELATIONSHIP_NOT_FOUND | Relationship 0 | `CONTRACT_ONLY` |
| 10 | MANAGER_RELATIONSHIP_INACTIVE | 관계 상태축 0 · 🔴`is_active` = **계정 상태**(`Db.php:1106`) | `CONTRACT_ONLY` |
| 11 | MANAGER_RELATIONSHIP_INVALID | 유효성 축 0 · 코드 어휘 `VALIDATION` 실재(`:1322` 422) | `CONTRACT_ONLY` |
| 12 | MANAGER_ASSIGNMENT_NOT_FOUND | Assignment 0 | `CONTRACT_ONLY` |
| 13 | MANAGER_ASSIGNMENT_EXPIRED | 만료 축 0(`effective_to`/`valid_to` grep 0) | `CONTRACT_ONLY` |
| 14 | MANAGER_SUBJECT_NOT_FOUND | Subject = `app_user` 뿐이나 Manager Subject 개념 0 | `CONTRACT_ONLY` |
| 15 | MANAGER_SUBJECT_INACTIVE | 고용 상태 0 · 계정 축 집행은 REAL(`UserAuth.php:805`)이나 **축 상이** | `CONTRACT_ONLY` |
| 16 | MANAGER_POSITION_NOT_FOUND | Position 0(`position_idx` = **PM 태스크 정렬순서** — 이름 함정) | `CONTRACT_ONLY` |
| 17 | MANAGER_POSITION_VACANT | 🔴 **§68 #10 의 에러 코드 면** — 결함은 오늘 실재(`promoteManager:768-776` 강등 0)하나 **표현할 코드도 엔티티도 없다** | `CONTRACT_ONLY` |
| 18 | MANAGER_SELF_REPORTING | 선례 `Dependencies.php:29-31`(self-loop 422) — **도메인 상이** | `CONTRACT_ONLY` |
| 19 | MANAGER_CIRCULAR_REPORTING | 선례 `Dependencies.php:32-34` **422 `cycle_detected`** — ★코드 문자열 형태가 가장 근접하나 **PM 태스크 의존 도메인** | `CONTRACT_ONLY` |
| 20 | MANAGER_PRIMARY_CONFLICT | Primary·기간 축 0 · 코드 어휘 `CONFLICT` 실재(`:1327` 409) | `CONTRACT_ONLY` |
| 21 | MANAGER_SOURCE_PRIORITY_CONFLICT | **manager 보유 소스 0개** → 무대상 | `CONTRACT_ONLY` |
| 22 | MANAGER_TENANT_MISMATCH | ⚠️선례 `createTeam:464`(422). 🔴반례 `admin_growth_approval` **tenant_id 컬럼 없음**(`AdminGrowth.php:142-149`) | `CONTRACT_ONLY` |
| 23 | MANAGER_LEGAL_ENTITY_POLICY_VIOLATION | Legal Entity 축 0(`ceo_name` = 프로필 평문 문자열) | `CONTRACT_ONLY` |
| 24 | MANAGER_EFFECTIVE_PERIOD_INVALID | 기간 축 0 · `kr_fee_rule.effective_from`(`Db.php:898`) **컬럼 有·질의 無** | `CONTRACT_ONLY` |
| 25 | MANAGER_ELIGIBILITY_FAILED | 🔴 **적격 술어 0** — 승인 4경로 전량 부재. `Catalog::approveQueue:2343` `requirePro` 는 **구독 플랜**이지 적격 아님 | `CONTRACT_ONLY` |
| 26 | MANAGER_AVAILABILITY_BLOCKED | Leave/OOO/Suspension **전역 0** | `CONTRACT_ONLY` |
| 27 | MANAGER_ACTING_ASSIGNMENT_INVALID | `acting` grep 0. 🔴**`UserAdmin::impersonate:466-525` 로 계산 금지**(신원 위장 열람이지 권한 대행 아님) | `CONTRACT_ONLY` |
| 28 | MANAGER_TEMPORARY_ASSIGNMENT_INVALID | Temporary 축 0 | `CONTRACT_ONLY` |
| 29 | MANAGER_INTERIM_ASSIGNMENT_INVALID | `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) | `CONTRACT_ONLY` |
| 30 | MANAGER_CO_MANAGER_POLICY_MISSING | Co-manager 축 0 · 단일 칸이라 복수 표현 불가 | `CONTRACT_ONLY` |
| 31 | MANAGER_SUPERVISORY_PATH_MISSING | Path 축 0(Recursive CTE·Closure Table·Path Prefix 전부 0) | `CONTRACT_ONLY` |
| 32 | MANAGER_CHAIN_DEPTH_EXCEEDED | Chain 0. ★`Dependencies.php:84` `$depth<10000` 은 **방문 노드 예산**이지 깊이 캡 아님 — **선례 계산 금지** | `CONTRACT_ONLY` |
| 33 | MANAGER_SNAPSHOT_MISSING | Snapshot 축 0 · ★`snapshot` grep 최다 히트 = **CCTV JPEG**(`WmsCctv.php:45`) | `CONTRACT_ONLY` |
| 34 | MANAGER_SNAPSHOT_INVALID | 해시 검증 선례 = `menu_audit_log.hash_chain`(`AdminMenu.php:128`) — **도메인 상이·알고리즘만 이식** | `CONTRACT_ONLY` |
| 35 | MANAGER_TASK_ASSIGNEE_DRIFT | `pm_task_assignees(role ENUM(...))` = **태스크 역할이지 매니저 아님** | `CONTRACT_ONLY` |
| 36 | MANAGER_RECONCILIATION_FAILED | 🔴 **이중 공허**(좌·우변 양쪽 부재) → **자동 MATCH = 가짜녹색** | `CONTRACT_ONLY` |
| 37 | MANAGER_RUNTIME_BLOCKED | 런타임 차단 축 0 · Kill Switch 0 | `CONTRACT_ONLY` |

**§71 실측 개수: 37 / 37 전사.** 측정기 분모 **37** · 원문 대조 **37** · 전사 **37** — **3자 일치.**

## 1-B. 원문 전사 + 판정 — **§72 Warning Contract · 원문 18종**

**축 판정**: 🔴 **봉투 = `ABSENT`** — `AdminGrowth::json:164-179` 키 5개에 **warning 슬롯 없음** · 표준 warning 채널 **전역 0**. **코드 값 18종 = 전건 `CONTRACT_ONLY`.**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REPORTING_LINE_SOURCE_WARNING | 봉투 슬롯 부재 + Reporting Line 축 0 | `CONTRACT_ONLY` |
| 2 | REPORTING_LINE_VERSION_WARNING | 동상 | `CONTRACT_ONLY` |
| 3 | MANAGER_RELATIONSHIP_WARNING | Relationship 0 | `CONTRACT_ONLY` |
| 4 | MANAGER_SOURCE_PRIORITY_WARNING | manager 보유 소스 0개 → 무대상 | `CONTRACT_ONLY` |
| 5 | MANAGER_POSITION_WARNING | Position 0 | `CONTRACT_ONLY` |
| 6 | MANAGER_VACANCY_WARNING | 🔴 **§68 #10 이 실재하므로 신설 즉시 발화할 후보 1순위** — 단 표현 슬롯이 없다 | `CONTRACT_ONLY` |
| 7 | MANAGER_ACTING_WARNING | `acting` 0 | `CONTRACT_ONLY` |
| 8 | MANAGER_TEMPORARY_WARNING | Temporary 0 | `CONTRACT_ONLY` |
| 9 | MANAGER_INTERIM_WARNING | Interim 0 | `CONTRACT_ONLY` |
| 10 | MANAGER_CO_MANAGER_WARNING | Co-manager 0 | `CONTRACT_ONLY` |
| 11 | MANAGER_MATRIX_WARNING | Matrix(Direct/Functional/Dotted 병존) 축 0 — `manager_user_id` **단일값**이라 표현 불가(규칙 10) | `CONTRACT_ONLY` |
| 12 | MANAGER_CROSS_ENTITY_WARNING | Legal Entity 축 0 | `CONTRACT_ONLY` |
| 13 | MANAGER_AVAILABILITY_WARNING | Leave/OOO/Suspension 전역 0 | `CONTRACT_ONLY` |
| 14 | MANAGER_HISTORICAL_WARNING | 이력 축 0 · 🔴`AgencyPortal.php:304`,`:381` 이 **이력을 물리 소거**(§55 정면 반례) | `CONTRACT_ONLY` |
| 15 | MANAGER_SNAPSHOT_WARNING | Snapshot 0 | `CONTRACT_ONLY` |
| 16 | MANAGER_TASK_IMPACT_WARNING | Task 영향분석 축 0 | `CONTRACT_ONLY` |
| 17 | MANAGER_RECONCILIATION_WARNING | 이중 공허 | `CONTRACT_ONLY` |
| 18 | MANAGER_MANUAL_REVIEW_REQUIRED | 수동 검토 요청 축 0. ⚠️인접 `action_request` 는 **VACUOUS**(`INSERT INTO action_request` grep 0 · 생산자 전무) | `CONTRACT_ONLY` |

**§72 실측 개수: 18 / 18 전사.** 측정기 분모 **18** · 원문 대조 **18** · 전사 **18** — **3자 일치.**

**§71+§72 합계: 55 / 55 전사.**
판정 분포: **`CONTRACT_ONLY` 55 / 55 (100%)** — Manager 도메인 **실 코드 0**. 단 **봉투 축**은 §71 `VALIDATED_LEGACY` / §72 `ABSENT` 로 **비대칭**.

## 2. 규칙

- 🔴 **"에러 코드 체계 부재"라 쓰지 마라 — 과장이다.** `AdminGrowth::fail:181-184`(`code`+`detail`+`meta`)가 `approvalDecide` 에 **실배선**(`:1322` VALIDATION 422 / `:1326` NOT_FOUND 404 / `:1327` CONFLICT 409)돼 있다. §71 = **`VALIDATED_LEGACY`(봉투 축)** · 37종 코드 문자열은 `$codeStr` 인자로 그대로 실린다.
- 🔴 **두 번째 에러 봉투 신설 금지.** 헌법(중복 엔진 금지). 확장만 허용.
- 🔴 **§72 를 "§71 에 18종 추가"로 견적 내지 마라.** `AdminGrowth::json:164-179` 는 키 5개(`success`/`data`/`message`/`error`/`meta`)이며 **warning 슬롯이 없다.** §72 는 **봉투 구조 변경이 선결**이고, `success=true` + warning 공존 시맨틱 정의 · 전 `json()` 호출처 회귀 · 프론트 소비 계층 대응이 따라온다. **작업량이 §71 과 질적으로 다르다.**
  - ⚠️ **`warning` grep 히트를 슬롯으로 오독 금지** — `OpenPlatform.php:187`·`UserAuth.php:4250`,`:4288`·`AnomalyDetection.php:71`·`Catalog.php:875` 등은 전부 **`data` 페이로드 내부 임시 키**다.
- 🔴 **가시성 승격이 선결.** `fail`(`:181`)·`json`(`:164`) 이 **`private static`** → 외부 호출 불가. **공용 헬퍼/트레이트 추출**로 해결하고, **복사·붙여넣기 재구현 금지.**
- ⚠️ **미확인 사항 — `AdminGrowth` 봉투가 전사 표준인지 확인하지 못했다.** 최소 `ok=>true` 계열과의 공존 가능성이 있다. **표준 선정은 별도 조사 후 결정**하며, 본 문서는 **"승인 도메인에서 실증된 봉투"** 까지만 주장한다.
- 🔴 **#19 `MANAGER_CIRCULAR_REPORTING` 을 `Dependencies.php:32-34` `cycle_detected` 로 이미 커버됐다고 계산 금지** — 형태만 닮았고 **PM 태스크 의존 도메인**이다(규칙: 형태 유사 ≠ 의미 동일). **알고리즘은 이식하되 코드 문자열·도메인은 신규.**
- 🔴 **본 문서는 코드변경 0.** 봉투 확장·가시성 승격·warning 슬롯 신설은 **별도 승인세션**.
