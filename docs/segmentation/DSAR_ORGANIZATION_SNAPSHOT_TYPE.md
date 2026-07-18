# DSAR — Organization Snapshot Type (§48 / §49)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §48(Snapshot Type)·§49(Snapshot 원칙) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> 필수 필드 29종 + §49 원칙 10종은 별도 문서: [DSAR_ORGANIZATION_SNAPSHOT.md](DSAR_ORGANIZATION_SNAPSHOT.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `snapshot type` 축 | **backend/src grep 0** — 스냅샷 타입 개념 전무 | `ABSENT` |
| 현행 스냅샷 2건의 타입 축 | ★**둘 다 타입 컬럼이 없다** — `menu_defaults`(`AdminMenu.php:119-122`: `id`,`snapshot_data`,`version`,`created_at`) · `pm_baseline`(`PM/Enterprise.php:55`: `id`,`tenant_id`,`project_id`,`name`,`bac`,`snapshot_json`,`created_at`) | `ABSENT` |
| ★**타입 대신 무엇이 있나** | **스냅샷 1종 = 용도 1개 고정** — `menu_defaults` 는 *"공장 기본값 복원"* 전용(`AdminMenu.php:294` 주석 · `version` 리터럴 `'baseline'` `:308`) · `pm_baseline` 은 *"프로젝트 베이스라인"* 전용(`:360-364`) | **다형성 부재** |
| **10종 트리거 시점의 실재 여부** | 승인 도메인(Request/Case/Approver/Task/Decision/Execution) **전무**(5-3-2 확정) · 조직 변경(§45~§47) **전무** · Reconciliation(§46) **집행 수단 부재** | `ABSENT` |
| 인접 타입 열거 선례 | `pm_audit_log.entity_type` **MySQL ENUM**(`PM/Enterprise.php:65-67` 자인: *"ENUM(제한값)이라 신규 엔터티 기록 시 enum 위반→INSERT 예외"*) · `menu_audit_log.action VARCHAR(32)`(`AdminMenu.php:125`) | `LEGACY_ADAPTER` |

### ★Snapshot Type 축은 **10종 전부가 "언제 찍는가"를 정의한다** — 그리고 그 시점이 하나도 없다

§48 의 Snapshot Type 10종은 **스냅샷의 종류**가 아니라 **스냅샷을 촬영하는 트리거 시점**의 열거다(원문: *"Approval Request 제출, Case 생성 및 Decision 시점에 사용할 조직 Snapshot 기반을 구축한다"*).

→ **따라서 이 축의 판정은 "타입 컬럼이 있는가"가 아니라 "그 트리거 시점이 코드에 실재하는가"로 해야 한다**(규율 8 — **부재증명은 이름이 아니라 능력으로**).

실측 결과: **10종 중 7종이 승인 도메인 시점**인데 **승인 엔티티 자체가 부재**(5-3-2 확정: 승인은 노드가 아니라 핸들러 메서드 `Mapping::approve` Mapping.php:238-294 뿐)이고, **3종(ORGANIZATION_CHANGE/RECONCILIATION/AUDIT_RECONSTRUCTION)은 조직 도메인 시점**인데 **조직 계층이 애초에 존재한 적이 없다**(ⓑ 대전제). → **10/10 전부 `ABSENT`.**

### ⚠️ 형태 유사 함정 — 인용 금지 3건

| 대상 | 왜 Snapshot Type 선례가 아닌가 |
|---|---|
| `AgencyPortal.php:381` `status='approved'` + `approved_at` | **대행사 접근 동의**이지 승인 워크플로 Decision 아님 · 스냅샷 촬영 없음 · `:304`/`:381` 이 `revoked_at=NULL` 로 **이력을 지운다** |
| `Mapping::approve`(5-3-2 실측) | **승인이 노드가 아니라 메서드** — Case/Task/Assignment 개념 자체가 없어 트리거 시점을 정의할 수 없음 |
| `menu_defaults` 복원(`AdminMenu.php:584-590`) | **AUDIT_RECONSTRUCTION 아님** — 감사 재현이 아니라 **공장 초기화**. 게다가 **최신 1건만 조회** = 과거 재현 불가(§49 원칙 2 위반 형태) |

## 1. 원문 전사 + 판정 — Snapshot Type **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_REQUEST_SUBMISSION | 승인 Request 엔티티 **부재**(5-3-2 확정) → 트리거 시점 없음 | `ABSENT` |
| 2 | APPROVAL_CASE_CREATION | Case 개념 **전무**(`SUB_WORKFLOW`·Case grep 0) | `ABSENT` |
| 3 | APPROVER_RESOLUTION | 승인자 해석 로직 부재 — 🔴**`api_key` RBAC 인용 금지**: `roleRank`(`index.php:554`)의 `connector` 는 **기계 신원 API 등급**(ingest 쓰기 허용 `:571-574`)이지 조직 승인자 아님 · 판정 축이 **HTTP 메서드**(`:568`) | `ABSENT` |
| 4 | TASK_ASSIGNMENT | Task/배정 개념 부재(5-3-2 `HUMAN_TASK` `NOT_APPLICABLE`). ⚠️`pm_tasks`(`PM/Enterprise.php:358`)는 **프로젝트 관리 태스크** — 승인 태스크 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 5 | TASK_CLAIM | 클레임 개념 **전무** | `ABSENT` |
| 6 | APPROVAL_DECISION | 부재 · 인접 = `Mapping::approve`(Mapping.php:238-294) **단일 메서드** — Decision 시점 스냅샷 촬영 0 | `ABSENT` |
| 7 | APPROVAL_EXECUTION | 부재. 🔴**`Alerting::executeAction`(Alerting.php:601-660) 참조 금지** — `:612` 에서 `status` SELECT 후 **판독 안 함**(승인 우회) · **`INSERT INTO action_request` grep 0 → 생산자 전무 = VACUOUS** | `VACUOUS` |
| 8 | ORGANIZATION_CHANGE | 조직 변경 이벤트 **부재**(§45·§47 — `reparent`·`lifecycle_event` grep 0) | `ABSENT` |
| 9 | RECONCILIATION | ★**부재 + 집행 수단 없음** — `ensureTables` 는 **테이블 생성만 · 데이터 변환/백필 없음**(ⓑ §20 제약 2) · `backend/migrations/` **172차 정지** | `ABSENT` |
| 10 | AUDIT_RECONSTRUCTION | 🔴**부재 — 재현 능력이 구조적으로 없다**: `effective_from *<=` **전역 0건** + 스냅샷 조회가 **최신 1건**(`AdminMenu.php:584`) → **"과거 어느 시점의 조직"을 물을 수단 자체가 없음**. ⚠️인접 = `menu_audit_log.hash_chain`(`AdminMenu.php:128`·`:182-197`) = **prev-chain 쓰기 선례**(단 메뉴 도메인 · 🔴 `verify()` 0·preimage ts 소실 → **tamper-evident 아님**; 검증형은 `SecurityAudit::verify()`) | `ABSENT` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 1 · `VACUOUS` 1 · `ABSENT` 8.

## 2. 규칙

- ★**Snapshot Type 축 판정 = `ABSENT`**(이름·능력 양쪽). **타입 컬럼도 없고, 10종이 지목하는 트리거 시점도 하나도 없다.** 🔴 **"타입은 VARCHAR 하나 추가하면 된다"로 축소 금지** — **문제는 컬럼이 아니라 촬영 시점 7종의 도메인(승인)이 통째로 부재**한 것이다.
- ★**의존 순서를 명시하라.** Snapshot Type 10종 중 **7종이 승인 도메인 시점**이므로 **5-3-2(Approval Workflow Execution Engine) 선행 없이는 정의 불가**. 나머지 3종은 **§45~§47(조직 변경/라이프사이클) 선행 필요**. → **Snapshot Type 은 이 EPIC 에서 가장 후행하는 축이다.** 🔴 **먼저 만들면 값이 들어오지 않는 죽은 열거가 된다.**
- 🔴 **★죽은 스켈레톤을 만들지 마라 — 레포에 실사례가 있다.** `graph_node`/`graph_edge` 는 **9라우트 실배선인데 내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐 · frontend 0) → **외부 POST 전용 유입**. `Alerting::executeAction` 은 **`action_request` 생산자 전무 = VACUOUS**. **Snapshot Type 열거를 생산자 없이 선행 정의하면 세 번째 사례가 된다.**
- 🔴 **타입 컬럼에 MySQL `ENUM` 금지.** `pm_audit_log.entity_type` 이 반면교사 — `PM/Enterprise.php:65-67` 자인: *"MySQL ENUM(제한값)이라 신규 엔터티(portfolio/raid/time_log/baseline) 기록 시 enum 위반→INSERT 예외 발생"* → 값 추가 ALTER 로 땜질. **Snapshot Type 은 10종이고 증설이 전제**이므로 **`VARCHAR(64)` + 애플리케이션 검증 + SQLite 는 TEXT**(방언 분기 의무 · ⓑ §20 제약 3).
- 🔴 **`AUDIT_RECONSTRUCTION` 을 "감사로그로 대체 가능"으로 처리 금지.** 감사로그(`menu_audit_log`/`pm_audit_log`)는 *"누가 언제 무엇을 바꿨나"* 의 **변경 기록**이고, `AUDIT_RECONSTRUCTION` 스냅샷은 *"그 시점의 조직 전체 상태"* 의 **정지 화면**이다. **변경 기록으로 상태를 역재생하려면 최초 상태 + 결손 없는 전 변경이 보장돼야 하는데, 현행은 둘 다 없다**(초기 스냅샷 0 · `agency_client_link` 처럼 덮어쓰기로 전이가 소실). **역재생 가정은 역산이다.**
- 🔴 **`api_key` RBAC 의 `roleRank`(`index.php:554`)를 `APPROVER_RESOLUTION` 근거로 인용 금지.** **주체가 사람이 아니라 키**(`auth_key`/`auth_role` 주입 `:590-593`) · `connector` 는 조직 직위가 아니라 **ingest 쓰기 허용 등급** · 조직 역할축(`team_role` `TeamPermissions.php:17`)과 **매핑 코드 없음**(`effectiveScope():245-246` 은 `team_role` 만 읽고 `auth_role` 미참조). → `KEEP_SEPARATE_WITH_REASON`.
- ★**타입별 스냅샷 크기·빈도를 설계에 반영하라.** 10종 중 `APPROVAL_*` 6종은 **승인 건마다 발생**하므로 **조직 전체를 매번 통째로 직렬화하면 폭증**한다. 🔴 **N+1 순회로 조립하지 마라** — `GraphScore::scoreInfluencer:207-219`(hop3∈hop2∈hop1)가 레포의 실사례이며 285차 *"루프 내 N+1 = 즉시장애"* 트랩의 DB판이다. **Path Index 선행 또는 참조 기반 스냅샷(조직 version 참조 + 델타)을 검토하라.**
