# ADR — Reporting Line Registry, Manager Relationship, Supervisory Hierarchy, Eligibility, Snapshot & Reconciliation Foundation (EPIC 06-A Part 4-5-3-1-5-3-3-2)

- **일자**: 289차 (2026-07-17)
- **상태**: Accepted (Reporting Line & Manager Relationship 계약 명세 확정. **비파괴 — 코드변경 0**). 실 Registry/Relationship/Binding/Assignment/Snapshot 스토어·Lint·Guard 구현은 **후속 승인 세션**(Golden Reporting Line Dataset + Conformance + Legacy Equivalence + verify + 배포승인).
- **근거**: 스펙 원문 [`SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md`](../segmentation/SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §0~§93 · 산출 81편 [`DSAR_REPORTING_LINE_*`·`DSAR_MANAGER_*`·`DSAR_SUPERVISORY_*` 외](../segmentation/) · ⓑ 전수조사(§3.1 18 · §3.2 18 · §3.3 12 · §3.4 **42**).
- **선행 정본**: [`ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION`](ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)(5-3-3-1) · [`ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE`](ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)(5-3-2).
- **커버리지**: 문서에 **미기재** → `node tools/measure_06a_coverage.mjs --block=5332`. 정의·오독 방지 = [`COVERAGE_06A_532_MEASUREMENT_SSOT.md`](../segmentation/COVERAGE_06A_532_MEASUREMENT_SSOT.md)(블록 공용).

---

## 0. 대전제 — **Manager Relationship 축이 레포에 존재하지 않는다**

`manager_id` **0** · `reports_to` **0** · `supervisor_id` **0** · `team_lead_id` **0** · `department_head_id` **0** · `acting` **0** · `vacan` **0** · `deputy`/`substitute`/`stand_in` **0** · **`rebate` 전역 0**(스펙 표제 도메인 자체가 없다).
★**git 이력: `manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy` 삭제 이력 0** → **팬텀도 유물도 아니다 — 존재한 적이 없다**(5-3-3-1 조직 축과 동형 재현).

> 🔴 **그러나 "이름 grep 0 → 부재"로 밀지 않았다.** 8회차 교훈(BPMN grep 0 → JourneyBuilder 반전)대로 **능력축**으로 재조사했고, 그 결과 **분류할 인접 자산 8종**과 **§76 실재 결함 4건**이 나왔다.

---

## 1. 결정 (핵심)

### D-1. 3개 대체물 = **서로 다른 축** · 어느 것도 §4.3/§4.4/§4.6 을 표현 못 한다
| 자산 | 실체 | 커버 아님 근거 |
|---|---|---|
| `app_user.parent_user_id` | **테넌트 소속 포인터** | ★**소비처 54개소 전수 실측 → 4종뿐**(테넌트 해석 `resolveTenantId:207-217` **단일 홉** · 롤 정규화 폴백 · owner 행 선별 · sub-admin 소유 검증) · **감독·승인 술어 판독 0** · 전 생성경로 owner 직속 2단 봉인(`UserAuth.php:1226-1227`·**`EnterpriseAuth.php:500`**·`:1574/1581`·`:670`) · 승격 시 `NULL`(`:573`) |
| `team.manager_user_id` | **팀당 1칸** | `parent_team_id` 없음(`TeamPermissions.php:148`/`:168`) → **팀 트리 자체가 없다** · Type/Priority/Responsibility Scope 표현 불가 · **effective date 0 · 이력 0** |
| `team_role='manager'` | **롤 라벨** | 관계 아님. **이 문자열 하나에 승인 권한이 걸려 있다** |
- ⚠️ **정정**: `seedOrg:739` 시드는 manager 를 비우나(**15팀 전부 NULL**) **쓰기경로는 REAL**(`createTeam:463-469` — manager 수령 → **테넌트 소속 검증 `:464` 422** → INSERT `:466` → `promoteManager:469`). **"team owner 실사용 인용 금지"는 시드 축에 한해 참.**

### D-2. ★§4.1 판정 — **Manager 와 Approver 를 동일시하지도 않는다. 양쪽 개념이 다 없다**
🔴 **"Manager 를 Approver 로 오용 중"이라 적으면 허구다.** 승인 경로 4개 전량 = **"호출자가 곧 승인자"**:
| 경로 | 승인자 결정 | 자격 판정 축 |
|---|---|---|
| `Mapping::approve:238-294` | `actorId($request)`(`:246`) = **요청자 본인** | **정족수(숫자)뿐** — 적격 술어 **0** |
| `Catalog::approveQueue:2341-2365` | 🔴**행위자를 읽지도 않는다** | **구독 플랜**(`:2343` `requirePro`) |
| `AgencyPortal::approveAgency:365-385` | `:370` `isTenantOwner` | 고정 역할(가장 근접하나 **해석 아님**) |
| `FeedTemplate::approveDraft:271` | 라우트 게이트 | — |
- ★**`Existing Approval Manager Resolver` = `ABSENT`** — `resolveApprover`/`approval_chain`/`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열**(`Mapping.php:248`,`:280`). **승인자 후보를 계산하는 코드가 레포에 없다.**
- ★**규칙 10 적중**: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.

### D-3. ★`Approval Requirement` = 축이 아니라 **상수**
`required_approvals` 컬럼 존재 · `Mapping.php:287` 이 정족수 판정에 **실사용**. 🔴**그러나 유일 생산자 `:210` 이 리터럴 `2` 하드코딩** — 요청자·금액·위험도 무엇에도 반응 안 함.
→ **5-3-3-1 D-13 `menu_defaults.version = 리터럴 'baseline'`(버전이 아니라 라벨)과 정확히 동형.** **"컬럼이 있다 → 요건 모델이 있다"는 규칙 7 위반.**
- `approvals_json`(`:285`) = **`{user, ts}` 2키 JSON 배열** → **인덱스·as-of 질의 불가**(`pm_baseline.captured_at` 동형)
- ⚠️ **`menu_defaults.version` 정정**: 엔티티 `version` 은 1건이 아니라 **3컬럼**(`ml_models.version` `ModelMonitor.php:35` · `risk_model_registry.model_version` `Db.php:451`). **결론은 강화된다** — 뒤 2건도 **하드코딩 시드**(`ModelMonitor.php:297-305` · `Risk.php:151`)이고 `previous_version_id`·상태 전이·불변 해시가 **하나도 없다**. 규칙 7 이 **3건 전부에서 적중**.

### D-4. 승인 4종 = **"2 REAL"** (5-3-2 "1 REAL + 3 미달" 정정)
| 구현 | 판정 |
|---|---|
| `mapping_change_request` | **REAL** — 289차 G-01(신원 fail-closed `:246-250` · 자기승인 차단 `:268-271` · dedup `:278-283` · 정족수 `:287`) |
| **`catalog_writeback_job` status=`pending_approval`** | ★**REAL** — 282차 근본수정. `approvalCreate:2275` → `approveQueue:2341`(테넌트 스코프 `:2350`) → **집행 `processWritebackQueue:2362`** |
| `action_request` | **VACUOUS** — INSERT **grep 0** · `Alerting.php:562` `required_approvals=>2` 는 **응답 투영 리터럴** · `decideAction:591-595` **단일 결정 즉시 approved** = **정족수를 표시하나 집행하지 않는다** |
| `admin_growth_approval` | **REAL(단일테넌트 전제)** — 🔴`tenant_id` 컬럼 없음(`:142-149`) · 조회도 tenant 술어 없음 |
- 🔴 **`catalog_writeback_approval` 테이블은 고아가 맞다**(CREATE 2회뿐 · INSERT/SELECT 0 · 주석 `:2269-2272` **자인**) — **테이블은 죽었고 능력은 살아 있다. "테이블 고아 = 축 미달"로 계산하면 규칙 7 위반.**
- 🔴 **통합 시**: `Catalog::approveQueue` 는 `Mapping` 의 maker-checker 를 **전혀 갖지 않는다** → **"중복 제거"로 포장하면 `Mapping` 능력이 소실**된다(규칙 9).

### D-5. ★§76 판정 — **중복 0. 그러나 정합의 증거가 아니라 축의 부재다**
§76 이 탐지를 요구한 항목 대부분이 **1개도 없어서 0**이다. 예: *"Circular Detection 없는 Recursive Manager Query"* = **recursive manager query 가 0개라서 0**(규칙 10).
🔴 **§76 항목 중 4건은 실재한다**:
1. **Acting Manager 를 기존 Manager 덮어쓰기** — `TeamPermissions.php:492-501` **교체 시 전임자 강등 없음**. ★원인 특정 = **`updateTeam:501` 의 `if ($newMgr !== null)` 가드**
2. **Vacant Position 을 Active Manager 로 처리** — `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 전임자 `team_role='manager'` **잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) 계속 보유. ★**`SET team_role` 쓰기 = 전역 2개소뿐**(`:774` 승격 · `EnterpriseAuth.php:489` SCIM 그룹매핑) → **강등 술어 0 확정**
3. **Manager 라는 이유만으로 Approval Authority 자동 부여** — `UserAuth.php:1064`·`TeamPermissions.php:136`
4. ★**Current Manager 만 저장하는 구현** — `updateTeam:495` 가 **전임자 값을 물리적으로 덮어쓴다**
> ★①②가 **같은 한 줄에서 나온다**(`:501` 가드). **관계는 덮어쓰고 권한은 누적**하는 비대칭.
- 🔴 **"중복 0 = 통합 대상 없음 = 기능 유지"로 읽으면 규칙 9 가 경고한 위장**이다. **통합이 아니라 신설**이며 3개 대체물은 **커버 계산 금지**.

### D-6. ★§57 순환탐지 = **6방식 중 2/6** · **축 분리 필수**
| §57 요구 | 실재 | 증거 |
|---|---|---|
| **DFS** | ✅ | **`backend/src/Handlers/PM/Dependencies.php:79-100`** — 반복 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34`(422 `cycle_detected`)** + self-loop `:29-31` |
| **Topological Sort** | ✅ | **`backend/src/Handlers/PM/Gantt.php:104-125`** — Kahn · `:119` 정석 판정 · `:120-125` **500 아닌 부분결과+경고 degrade**. ⚠️**탐지 후 차단 안 함**(읽기 경로) |
| Recursive CTE / Closure Table / Graph Query / Path Prefix | ❌ | 전부 0 |
- 🔴 **축 분리**: **알고리즘 = 충족(`VALIDATED_LEGACY`) · Manager 도메인 적용 = 미배선**. **"§57 은 충족됨"은 거짓.**
- ★**`:84` `$depth<10000` = 방문 노드 예산**(깊이 캡 아님 · `:97` pop 마다). ★**진짜 깊이 캡 선례 = `AdminMenu::wouldCycle:545` `$depth<100`**(`:547` 단일 부모 상향 = **1회전 1홉**) — 단 하드코딩 · `menu_tree` **tenant_id 없음** · **`$visited` 없음** → **알고리즘만 이식**.
- ★**`:90-91` 이 `dep_type` 술어를 안 넣어 전 타입 무차별 순회** → **§11 27종별 순환정책 표현 불가** → 🔴**`pm_task_dependencies` 스키마 복제 금지**(이 결함을 물려받으면 설계 시점에 이미 불가능해진다).
- 🔴 **★§58 실재는 2가 아니라 1**(초판 정정): `:32-34` 가 **422 로 조기 반환하여 `:48` 의 `auditLog` 에 도달하지 않는다** → **순환 탐지 시 감사 이벤트가 발생하지 않는다**(`:48-54` 는 **성공 경로 전용** · severity 인자도 부재).
- **미달 3건**: `AdminMenu::wouldCycle`(`$visited` 없음 · tenant 없음) · `JourneyBuilder:511-518`(**런타임 탐지이지 쓰기 전 차단 아님** · `:512` **자인**) · 🔴**`ChannelSync.php:954-964` 는 순환 검출기가 아니다**(`$visited` 없이 **깊이만 자름** → **탐지 없이 조용히 절단**).

### D-7. §3.4 외부 Source **42항목 전부 부재** · ★SCIM manager 는 **침묵 no-op**
- **HRIS/ERP/Directory `ABSENT`** — `hris`·`workday`·`sap`·`netsuite`·`ldap`·`distinguishedName` **소스 히트 0** · **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0**.
  - 🔴 ★**논증 주의(5-3-3-1 D-11 정정 참조)**: *"`group_type` 열거에 `erp` 없음"* 은 **무효 논증** — `ChannelRegistry.php:36`,`:38`/`:46`,`:47` = **자유 VARCHAR · ENUM/CHECK 없음 · `in_array` 0**. **능력축으로만 논증하라.**
- ★**SCIM `manager` = `ABSENT` 확정**: `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` **전역 0** · `scimUserOut:329-339` = schemas/id/externalId/userName/active/name/emails/meta **뿐** · `scimCreateUser:364-375` = **5종만** 파싱 · **`/Schemas`·`/ResourceTypes` 디스커버리 부재** · **`sso_config` DDL(`EnterpriseAuth.php:45-54`) = `email_attr`·`name_attr` 2슬롯뿐 · `manager_attr` 없음**.
  - 🔴 ★**PATCH = 침묵 no-op(가짜 녹색)**: `scimUpdateUser:391-396` Operations 루프가 **`'active'` 만 분기** → IdP 가 `PATCH {"path":"manager"}` 를 보내면 `:399` 가 `is_active`·`name` 만 UPDATE 하고 **200 + 정상 User 리소스 반환**. **Okta/Entra 콘솔엔 성공 표시·저장된 것은 없다.** **현재 소비자 0 → 관찰 사실·등급 미부여.**
- 🔴 ★**정정**: *"어설션 `groups` 수신(`:374`)"* 은 **오류** — `:374` 는 **SCIM POST body** 를 읽는 줄. OIDC `:240`·SAML `:294` 는 `provisionUser` 를 **8인자로** 호출 → `$groups` 기본값 `[]`(`:476`) → `roleForGroups:81` 즉시 `''`. **OIDC/SAML 어설션은 groups 를 읽지 않는다. 그룹→롤 매핑은 SCIM 경로 전용.**
- ★**§62 Source Priority = "우선순위 미구현"이 아니라 정렬할 대상이 0개.** 권장 12단계 중 **6단계 ABSENT** · **EnterpriseAuth 는 존재하나 manager 데이터를 한 바이트도 싣지 않으므로 manager 보유 소스 = 0개**. **`VACUOUS` 이전에 무대상.**
- 🔴 **IdP 커넥터 신설 = 두 번째 엔진 = 헌법 위반. `EnterpriseAuth` 확장 강제.**

### D-8. ★§66 Reconciliation = **이중 공허**(5-3-3-1 D-14 보다 깊다)
28개 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재**. 좌변 부분실재는 **#11 하나뿐**이며 4결격+우변 부재로 비교 불가(5-3-3-1 §55 는 좌변 부분실재 5).
- 🔴 **양변 부재 → 대사는 항상 `MATCH` = 가짜녹색** = 288차 `ok=>true` 위장과 **동형**.
- ★**순서 강제**: ①Canonical → ②Assignment → ③Path/Version → ④Connector → ⑤대사기 → ⑥상태. **"source 만 만들면 된다"는 역산이며 헌법 Vol2 Unified Data Model·Vol3 Cross Validation 정면 위반.**
- ★**§67 `MATCH` 반전 규칙**(5-3-3-1 §56 선례를 **대사 절 표준으로 승격** — 동일 결함 2절 연속 재발): canonical null → **`BLOCKED`**(#30) · 커넥터 미등록 → **`MANUAL_REVIEW`**(#29). 🔴**"비교 못함" ≠ "일치함".**
- ⚠️ **원문 비대칭(등급 미부여)**: 비교쌍 **#22 `Manager Candidate vs Active Relationship` 에 대응하는 §67 상태가 없다**(27/28 만 1:1). 원문 누락인지·`MANUAL_REVIEW` 흡수 의도인지 **미확인** → **메우지 않았다**.

### D-9. ★§47 Graph Node — **게이트가 근거가 아니다**(5-3-3-1 D-5 정정과 동기)
- ✅ `upsertNode:57-59` 화이트리스트(`['influencer','creative','sku','order']` → 422)
- 🔴 **`upsertEdge:107-148` 에는 없다** — `:117-119` 비어있지 않음만 검사 · **`:126-133` 이 임의 타입으로 `graph_node` 자동 삽입**(PM 재확인) → **`POST /v419/graph/edges` 에 `src_type=SUBJECT` 를 보내면 저장된다**. **게이트는 우회 가능.**
- ✅ **재접지된 `KEEP_SEPARATE_WITH_REASON` 근거 3종**: ①선언된 타입 계약 4종(마케팅 귀속) ②★**판독자 전량이 4종에 하드와이어**(`GraphScore.php:193`~`:297`) → **넣어도 읽는 코드가 없다** ③저장 계층이 §47 을 못 담는다(UNIQUE·인덱스 0 · 시점 컬럼 0)
- ⚠️ **파생(등급 미부여)**: `:127` **`INSERT IGNORE` 는 UNIQUE 가 없어 무의미** → 엣지 upsert 마다 **중복 노드 행 누적**(엣지는 `:138-148` 멱등이나 **노드 자동 upsert 는 멱등 아님**)
- 🔴 **신설 시 두 번째 그래프 스토어 = 헌법 위반** — "부재"라 쓰지 마라.

### D-10. ★§74 Audit — **정본 선례는 `SecurityAudit` 이다**(5-3-2/5-3-3-1 초판 정정)
🔴 **초판이 지목한 `menu_audit_log.hash_chain` 은 "검증 불가능한 장식"이다**: preimage(`AdminMenu.php:183-196`)가 **`'ts' => date('c')`(`:195`)** 를 포함하는데 저장은 **`created_at DATETIME DEFAULT CURRENT_TIMESTAMP`(`:129`)** → **행에서 preimage 재구성 불가** · **검증기 0**(`hash_equals` grep 0). **선례로 삼으면 가짜 녹색을 상속한다.**
✅ **진짜 선례 = `backend/src/SecurityAudit.php`**: `security_audit_log`(`:45-52`) **`tenant_id` 보유** · ★**해시 preimage 에 tenant 포함**(`:27`) · **`prev_hash` 컬럼**(`:51`) · ★**실동작 검증기 `verify():56-68`**(`hash_equals` `:64` + prev 연쇄 + `broken_at`) · **실 소비자 4곳**(`CustomerAI.php:472`·`AdminGrowth.php:1420`,`:1428`,`:1429`).
- **§74 정본 = `SecurityAudit`(알고리즘+스키마+검증기) + `pm_audit_log`(diff_json·3인덱스·append-only 주석)**. `menu_audit_log` 는 **반례**로 등재.
- ⚠️ **`SecurityAudit` 잠복 결함 2건(등급 미부여·라이브 미검증)**: ⓐ `lastHash():38`·`verify():59` **tenant 술어 없음** → 체인 **전역 단일** ⓑ `:31` actor `substr(...,0,190)` 저장 vs `:27` 해시는 **원본 전체** → **190자 초과 시 `verify()` 영구 실패**
- ⚠️ **`pm_audit_log` append-only 는 주석 관례이지 DB 제약 아님** — 핸들러가 UPDATE/DELETE 를 실제 거부하는지 **미검증**.

### D-11. §38/§63 시점 = **부재의 깊이가 다르다**
| 축 | 상태 | 교정 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有·질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승 | **질의 계층**(과거 복원 가능) |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805`) | **저장 계층 신설** — 복원할 게 없다 |
> 🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.** §38 **Business/System Time 이중 시간축 = 전례 0.**
- **§63 12개 "at T" Version 중 실재 0** · `effective_to`/`valid_to`/`valid_from`·`version`(optimistic) **grep 0** · **`as_of` 2건은 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`)
- 🔴 **§40 정면 반례**: `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각 소거** → **이력 물리적 소멸**
- 🔴 **§40 집행 수단 없음**: `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지**. ⚠️**예외 후보 `PM/Shared.php:37-53` 도 예외 아님**(실측 — `pm_projects` 존재검사 1회 후 부재 시에만 **DDL .sql 적용** = **테이블 생성기 확정**).

### D-12. §41 Availability = **8종 중 2종** · **미지가 자동으로 "가용"**
`is_active`(**base DDL `Db.php:1106`** — ALTER 목록 밖) 1/0 뿐. 🔴**`UNKNOWN` 조차 표현 불가**(`NOT NULL DEFAULT 1` → **fail-open**) · **사유·시각·이력 컬럼 0** · `is_active=0` **3경로 혼재**(`UserAuth.php:1380`·`EnterpriseAuth.php:412`·`UserAdmin.php:361`).
- ✅ **집행은 REAL**(로그인 차단 `:805` · 재활성화 우회 방어 `:854-856` · 비활성 시 **세션 즉시 폐기** `:1381`·`EnterpriseAuth.php:400`,`:413`) → `PARTIAL`
- ★**SCIM `active` = IdP→내부 인입 REAL**(`:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) = **§41 Termination/Suspended 의 유일한 확장 지점**
- 🔴 **함정**: `locked_until` = **무차별 대입 스로틀**(키가 `ident`, **user_id 아님**) — Suspension 선례 아님 · `suspend` grep = **말장난 1건**(`WorkspaceState.php:12` "belt-and-suspenders")
- ★**§41 `timezone` 선례 = `daypart_schedule.tz VARCHAR(40)`(`RuleEngine.php:56`)** — ⚠️**초판 `ad_schedule` 은 오표기**(`ad_schedule` 은 테이블이 아니라 `auto_campaign.guardrails` **내부 JSON 키** `RuleEngine.php:235`·`AutoCampaign.php:1085`). 능력 주장(유일 IANA 문자열 tz 컬럼)은 유지. 🔴**단 도메인 상이**(광고 데이파팅) — **직원 근무지 타임존 전역 0** · **스키마 형태만 이식 가능**.

### D-13. §34 Scope = **`UNIQUE` 가 단일행을 스키마로 강제**
`data_scope`(`TeamPermissions.php:160-166`) **`UNIQUE(tenant_id,subject_type,subject_id)` `:164`** → §34 N개 Scope 는 **스키마 변경 선결**(규칙 10 — 정책이 아니라 UNIQUE 가 여러 개를 금지).
- ★**`data_scope.scope_type` 은 본 레포 유일의 코드 강제 열거**(`in_array` `:342`) — `team_type`(`createTeam:461` **무검증 VARCHAR**)과 강제력이 **정반대** → §33 Type 14종의 구현 선례로 **`data_scope` 쪽 채택**. 🔴**단 `:342` 의 무음 강등 폴백(미일치 시 `'own'`)은 복제 금지 — 422 fail-closed 권고.**
- ⚠️ **소비처 0 차원 = `partner`·`campaign`·`team` 3개**(초판 2개 → 정정) → 영원히 무제한 → `NAME_ONLY`
- 🔴 **`'company'` = 법인이 아니라 무제한 센티넬**(`effectiveScope():258` `return null` — **경계를 긋는 게 아니라 지운다**)
- ★**effect INCLUDE 고정** — `READ_ONLY` 등은 **where 절로 표현 불가**(실 선례가 **미들웨어 층** `index.php:92-96` 인 것이 증거)
- ⚠️ **`TeamPermissions.php:284` 는 docblock 예시 줄**(소비처 아님 — 규칙 8 적중). 실 소비처 = `Wms.php:1291`(warehouse) · `OrderHub.php:261`(channel/product/brand, `scopeChannelProduct:318-320` 경유)

### D-14. §78 Rate Limit = **REAL 이나 세션 경로 미도달**
`index.php:508-545` — API 키 단위 1분 윈도우(`api_rate_limit` · 기본 1200/min · **fail-open** · `Retry-After`). 🔴**주석 `:509-510` 자인 + 코드 `:515`(`!empty($keyRow['id'])`)로 독립 재확인**: **`api_key` 프로그래매틱 트래픽만 · SPA/세션 경로는 위에서 이미 return 되어 미도달** → **"레이트리밋 있음"으로 §78 을 닫으면 분모를 API 키 축으로 갈아끼우는 역산**.

### D-15. §80 Cache = **서버 캐시 계층 자체가 부재** → 순수 신규
Redis/Memcached **0**(⚠️`redis` 유일 히트는 `Payment.php:817` `totalBefore`**Dis**`c` **부분문자열 오탐**) · `apcu_*` 는 `SystemMetrics.php:225-451` **지표 보고 전용**. §80 의 무효화 요구는 **무효화할 캐시가 없다**(규칙 10).

---

## 2. ★최종 판정 — 선행조건이 충족되었는가

**정직한 답: 축을 나누면 결론이 갈린다. "선행조건 부재 → 이 블록도 전방호환 계약"은 실측이 지지하지 않는다.**

**§3.1 = 0% 충족**(18/18 `CONTRACT_ONLY` · 5-3-3-1 산출물 · 실 코드 0) · **§3.2 = 18항목 중 14 `ABSENT`** · **§3.3 = 부분 충족**(REAL 2 + PARTIAL 3 + KV_ONLY 2 + ABSENT 4 + CONTRACT_ONLY 1).

그러나 **§3.1 충족도와 5-3-3-2 의 실행 가능성은 같은 질문이 아니다**:
- ✅ **Manager Relationship 축(사람→사람 감독 간선) = 실행 가능하다.** 필요한 것(**Subject 레지스트리** `app_user` REAL · **인접리스트 전례 2종** `pm_task_dependencies`·`menu_tree` · **쓰기 전 순환 차단 최상급 선례** `Handlers/PM/Dependencies.php:79-100`+`Gantt` Kahn · **감사** `SecurityAudit`(tenant+검증기) · **승인 actor** `Mapping::actorId` 위조불가 403)이 **전부 실재**한다. **`ORGANIZATION_UNIT` 없이도 `manager_id` 축은 성립한다.**
- ❌ **Supervisory Hierarchy 축(조직단위 기반 감독·부서장·권한 승계) = 실행 불가.** `ORGANIZATION_UNIT`/`HIERARCHY`/`SCOPE_BINDING` 이 0 → **부착할 대상이 없다.**

**∴ 진짜 blocker 3건**(전부 §3.1 신설로는 풀리지 않는다):
1. 🔴 **`app_user.parent_user_id` 2단 봉인** — `resolveTenantId:200-217` **단일 홉 가정이 그 위에 서 있다** → 보고선을 이 컬럼에 얹으면 **286차 하이재킹과 동형 사고**. **일반화가 선결.**
2. 🔴 **`Approval Requirement` = 리터럴 2** → §4.1 을 **표현할 자리가 없다**. 요건 모델 없이 보고선을 만들면 승인 적격성은 **하드코딩에 남는다**.
3. 🔴 **`Actor Authorization Snapshot` `ABSENT` + 이력 소멸 전례**(`AgencyPortal:304`·`:381`) + **`ensureTables` 백필 부재** → **승인 시점 감독관계를 동결할 수단도, 소급 정정 수단도 없다.**

> **권장 1개**: 5-3-3-2 를 **Manager Relationship(사람 축)** 과 **Supervisory Hierarchy(조직 축)** 로 **분리**하고, **전자만 실 구현 후보로 승격**하되 **선결 = `parent_user_id` 2단 봉인 일반화**. 후자는 §3.1 실 구현(별도 승인 세션) 이후. **두 축을 한 블록으로 묶으면 "선행조건 미충족"을 이유로 전체가 계약으로 밀려나며, 이는 실측이 지지하지 않는 후퇴다.**

---

## 3. 정직 등급

- **실 코드·테이블 0건.** 산출 81편 전부 **계약 명세** — **"구축 완료"가 아니라 "계약 명세 확정"**.
- **커버리지 = 문서 미기재** → `node tools/measure_06a_coverage.mjs --block=5332`(하한값 · 병기행 보수채택 · `LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON` 은 **커버 아님**).
- **§69 Lint / §70 Guard 전건 `CONTRACT_ONLY`** — **네 블록 연속 실 코드 0**.
- **§68 Critical Gap** — 🔴 판정이 대부분 `ABSENT`/`NOT_APPLICABLE` 이어도 **"갭 0 = 양호"로 읽지 마라**. ★**단 3건은 현행 사실**(`PARTIAL`): 공석 Position 이 Active Manager · Manager→Approval Authority 자동 부여 · Manager Relationship Version/Historical Snapshot 없음.
- **가드 등급 3단**: `WIRED(pre-commit·로컬)`(★`core.hooksPath` 는 **본 클론 설정됨** · **신규 클론 기본 미설정** · `--no-verify` 우회 가능 → **보장 아님**) / `WIRED(CI·탐지)` / 🔴**`ENFORCED(예방)` = 현행 부재**(G-06b) → **원문 "차단하라" 미충족**.
- **manager/reporting 회귀 커버리지 0** — `tools/e2e/render.mjs:37` 이 `/team` 등을 포함하나 **마운트 크래시만 검사**(`:17` **자인**) · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 계약키**(이름 함정).
- **미확인/`UNVERIFIED`**: §78 Pagination(전사 표준 미실증) · `AdminGrowth` 봉투가 전사 표준인지 · 라이브 SQLite 버전(재귀 CTE 가용성은 **추론**) · `data_scope`/`graph_node`/`team.manager_user_id` 런타임 행 수.

**원문에 축이 없어 비워 둔 것 / 분모 분해**(지어내지 않음): §31 측정기 13 = 필드 11 + **규범 서술 2** · §32 측정기 16 = 필드 10 + **후속 정책 선택지 6** · §14 32 = 필드 19 + Change Type 13 · §45 34 = 필드 15 + Type 19 · §49 31 = 필드 18 + Path Type 13 · §50 28 = 필드 19 + Chain Type 9.

---

## 4. 관찰 사실 (등급 미부여 · 라이브 확인 선결 · **결함 단정 보류**)

| ID | 관찰 | 확인 방법 |
|---|---|---|
| **RL-O1** | **`Alerting::actor:33-36` = `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백** — **289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**. `decideAction:591` 이 그대로 기록 · 상태가드·자기승인차단·dedup·정족수 **전부 없음**. **`action_request` 생산자 0 이라 도달 불가(VACUOUS) = 잠복** — **생산자를 하나 붙이는 순간 위조가능 승인이 활성화된다** | 생산자 배선 전 필수 수정 |
| **RL-O2** | **`Mapping::actorId` 3분기**(`apikey:{id}` `:41` / `user:{email}` `:47` / **`user:#{id}` 폴백 `:49`**) → 동일인이 API키/세션 경로로 접근하면 **actor 문자열이 다르다** → `:279` dedup·`:268` 자기승인 차단 **경로 전환으로 우회 가능** | **실 경합 경로 미검증** — 동일인 api_key+세션 동시 보유 구성 확인 |
| **RL-O3** | **자기지정 무방비** — `createTeam:463-469`·`updateTeam:492-495` 에 `$mgr === $c['id']` 검사 **없음** | 설계 의도 확인 |
| **RL-O4** | **`memberRow:759` SELECT 에 `is_active` 술어 없음** → **비활성 계정도 팀관리자 지정 가능**(§37 "Active Employment" 요구 직결) | 라이브 확인 |
| **RL-O5** | **SCIM PATCH manager 침묵 no-op** — 200 + 정상 리소스 반환하나 **저장 0**. Okta/Entra 콘솔엔 성공 표시 | 현재 소비자 0 → 무해 |
| **RL-O6** | **`SecurityAudit` 잠복 2건** — tenant 술어 없음(체인 전역 단일) · actor 190자 절단 vs 해시 원본 → **`verify()` 영구 실패** | `SELECT COUNT(*) FROM security_audit_log WHERE LENGTH(actor)>=190` |
| **RL-O7** | **`upsertEdge` 무검증 + `INSERT IGNORE`(UNIQUE 없음)** → 임의 타입 노드 유입 + **중복 노드 행 누적** | `SELECT DISTINCT node_type FROM graph_node` |
| **RL-O8** | **`ORG_PRESET` 8팀 scope 실효 없음**(`'company'` 무제한 센티넬 · `partner`/`campaign` 소비처 0) | 설계 의도 확인 |
| **RL-O9** | ★**이름→지역 추론 코드 실재** — `Wms.php:286`(region 미입력 시 `area/location/name` 텍스트 추정) · `:1002` `warehouseCentroid` 문자열 이어붙여 좌표 추정 · `:284` **주석 자인**. 물류 축이라 현재 무해하나 **원문 §24 금지사항("Region 이름으로 Country 추론 금지")의 정확한 안티패턴 선례** → **조직 축 복제 금지** | — |

---

## 5. ★grep 오염 레지스트리 (이름 grep 이 0 이 아닌 것처럼 보이는 함정 — 후속 세션 필독)

| 검색어 | 오탐 실체 |
|---|---|
| `hris` | **hig`hRis`k**(`SupplyChain.php`) |
| `valid_to` | **`in`valid_to`ken`**(`Onsite.php:396`) — **PM 재확인: 유일 히트** |
| `redis` | **`totalBefore`Dis`c`**(`Payment.php:817`) |
| `substitut` | "단순 substitution"(`Migrate.php:203`) |
| `APAC` | **`SOAPAction`**(`Connectors.php:2894`) · **`capacity`**(`Wms.php:195`) |
| `$dn` | PHP 지역변수(`distinguishedName` 아님) |
| `position_based` | **U자형 기여도 배분 모델**(`AttributionEngine.php:32`,`:1405-1422`) |
| `node_count`/`edge_count` | **`COUNT(*) AS edge_count` 질의 별칭**(`GraphScore.php:434`) |
| `snapshot` | **CCTV JPEG 프레임**(`routes.php:271` `wms/cameras/{id}/snapshot`) — **최다 히트** |
| `interim` | 지오리프트 **중간결과**(`AttributionEngine.php:672`) |
| `proxy` | **HTTP 프록시** 7건 전량 |
| `대행` | **배송/구매대행 · 광고대행사 · 결제대행(PG)** — **직무대리 0건** |
| `manager`(EnterpriseAuth) | **`team_role` 롤 리터럴** 6건 — 관계 아님 |
| `position_idx` | **PM 태스크 정렬순서** |
| `grade` | 고객등급·리드등급·모델품질 45+건 |
| `business_unit_id` | **Trustpilot 자격증명** |
| `company_id` | **Adobe Analytics 자격증명** |
| `sla_days`/`escalate`/`recipients`/`next_run_at` | DSAR 기한 · 부정리뷰 Slack · 리포트 구독자 · 리포트 스케줄 |

---

## 6. 무후퇴·영구 규칙

1. **정본 재구현 금지 · 확장만. 기능후퇴 0.** `EquivalenceProof` 선행 없이 통합 금지.
2. **순서 절대**: `parent_user_id` 2단 봉인 일반화 → 보고선 도입. **뒤집으면 286차 하이재킹 동형.**
3. **순서 절대**: Canonical 선언 → Assignment → Path/Version → Connector → 대사 → 상태. **양변 부재 대사 = 항상 MATCH = 가짜녹색.**
4. **순서 절대**: `Alerting::actor` 위조가능 수정(RL-O1) → `action_request` 생산자 배선. **뒤집으면 위조가능 승인 즉시 활성.**
5. **★부재증명도 존재증명도 이름이 아니라 능력으로.** ★**"검증기가 있는가"를 물어라**(D-10 — `hash_chain` 이 보인다고 검증 가능한 게 아니다).
6. **★주석·docblock 을 근거로 삼지 마라. 정의부를 Read 하라.** **네 블록 연속 재발**: `Alerting::dispatch`(팬텀) · `ChannelSync:914 depth`(주석) · `group_type` "열거"(주석을 스키마 제약으로) · **`TeamPermissions:284`(docblock 예시를 소비처로)**.
7. **★"열거에 없다"는 열거가 실재할 때만 유효한 논증**(ENUM/CHECK/`in_array` 확인 선결).
8. **★"중복 없음" ≠ "기능 충족"**(§76 = 축의 부재).
9. **★우연한 일치를 준수로 계산 금지** — §18 금지 5항목·§32 "첫 Manager 만 선택 금지"·§44 "무제한 Traversal 금지" 를 현행이 "위반하지 않는" 것은 **대상이 없어서**다.
10. **★관찰을 기록만 하고 논증에 반영하지 마라 — 반영하라**(D-9 자기모순: 우회로를 ORG-O5 로 적어놓고 D-5 에서 "결정적"이라 썼다).
11. **테넌트 격리 절대** — `menu_audit_log`·`admin_growth_approval`·`audit_log`·`paddle_events` 의 tenant 부재를 **선례로 삼지 마라**.
12. **SQLite 폴백 호환** — 이중 방언 동시 작성 의무. 진짜 제약은 SQL 문법이 아니라 **마이그레이션 경로**(172차 정지 + `ensureTables` 백필 부재).
13. **`pm_task_dependencies` 스키마 복제 금지**(`dep_type` 무술어 순회를 물려받으면 §11 27종 정책이 설계 시점에 불가능).
14. **`claimBatch` TTL 무조건 회수 이식 금지** — §65 `KEEP_CLAIM_UNTIL_COMPLETION` 이 **정의상 불가능**해진다.

---

## 7. 결과

- **채택**: D-1~D-15. 산출 81편. **코드변경 0 · 배포 없음 · master 미접촉 · 06-A `NOT_CERTIFIED` 불변.**
- **후속 승인 세션 입력**: 축 분리(사람/조직) → 선결 4순서(RL-O1 위조가능 actor · `parent_user_id` 일반화 · Canonical 선언 · `upsertEdge` 비대칭) → 재사용 강제(`Handlers/PM/Dependencies`·`Gantt` 순환탐지 · `SecurityAudit` 감사 · `EnterpriseAuth` IdP · `AdminGrowth::fail` 봉투 · `data_scope` 코드 강제 열거) → 신설 불가피(Reporting Line 전 축 · Path Index · 캐시 계층 · Bitemporal).
- **전제**: Golden Reporting Line Dataset + Conformance + Legacy Equivalence Proof + verify + **배포 승인**.

> ★**이 ADR 의 최대 산출은 결정이 아니라 내 오류 16건이다.** 분모 4(§3.4 45→42 · §75 34→33 · §64 13→20 · §66 28→47 — **전부 "목록이 둘인데 하나만 셈"**) · 줄범위 2 · **주석/docblock 을 코드로 2** · 경로 1 · **깨진 선례 지목 + 진짜 선례 누락 1**(`menu_audit_log` vs `SecurityAudit`) · **잘못된 지시가 날조를 유도 1**(§64 Cache 요구는 §68/§76 소재) · 사실 5.
> **에이전트가 전부 잡았다 — 규율이 문서로 영속돼 있었기 때문이다.** 특히 **"§64 항목으로 전사하지 않았다(규칙 1 날조 0)"** 는 거부는, 규율이 없었다면 **없는 요구를 만들어 넣는 사고**였다.
> **★내가 값을 말하면 틀린다. 측정기가 세면 맞는다.** 그래서 이 블록부터 분모는 `tools/measure_spec_denominator.mjs` 가 센다.
