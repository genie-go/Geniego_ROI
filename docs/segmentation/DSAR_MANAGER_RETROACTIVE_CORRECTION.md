# DSAR — Retroactive Manager Correction (§40)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §40 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 최우선 ① — **집행 수단이 없다** → 전면 `CONTRACT_ONLY`

§40 은 **과거 데이터의 소급 정정**을 요구한다. 이는 **데이터 이행(backfill/transform)** 능력을 전제한다. **현행에 그 능력이 없다.**

| 계층 | 실측 | 결론 |
|---|---|---|
| `backend/migrations/` | **21파일 · 172차 정지** (최신 `20260527_172_002_coupon_tables.sql`) | 🔴 **신규 스키마는 마이그레이션 파일 경로 자체가 없다** |
| `ensureTables` 패턴 | 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` | 🔴 ★**테이블 생성만 하고 데이터 변환·백필을 하지 않는다** |
| 방언 | **MySQL/SQLite 두 방언 수기 중복 작성 의무**(예: `TeamPermissions.php:148` MySQL / `:168` SQLite) | 정정 스크립트도 2벌 |

> 🔴 ★**`Migrate` 이름 겹침 함정** — `\Genie\Migrate` 는 **DDL 적용기이지 도메인 데이터 이행기가 아니다.**
> ⚠️ **예외 후보** = `backend/src/Handlers/PM/Shared.php:37-53` — 런타임에 `Migrate::applyFiles($pdo, $files)`(`:53`) 호출. **단 실체 확인**: `pm_projects` **존재검사 1회**(`:44`)로 이미 있으면 **즉시 반환**하고, 부재 시에만 `glob('…/migrations/20260526_168_00*.sql')`(`:51`) **DDL 파일을 적용**한다. → **테이블 생성기이지 소급 정정기가 아니다.** 유일한 "런타임 마이그레이션 실행 경로"라는 점에서 **참조 가치는 있으나 §40 커버 계산 금지.**
> `schema_migrations.checksum`(`Migrate.php:50`) = **파일 무결성 확인**이지 데이터 이력 아님.

### ★★ 최우선 ② — **원문 말미의 정면 반례가 실재한다**

원문(`:1517`): *"과거 Assignment·Snapshot·Decision Evidence를 덮어쓰지 마라."*

🔴 **현행이 이미 이 금지를 위반하는 코드가 실재한다** — 도메인은 다르나 **패턴이 정확히 동일**:

| 코드 | 행위 | 결과 |
|---|---|---|
| `AgencyPortal.php:304` | `UPDATE agency_client_link SET status='pending', invited_at=?, revoked_at=NULL, …` (revoked 링크 **재초대** 시) | 🔴 **이전 해지 시각 소거** |
| `AgencyPortal.php:381` | `UPDATE agency_client_link SET status='approved', scope_json=?, approved_at=?, revoked_at=NULL, …` (**승인** 시) | 🔴 **이전 해지 시각 소거** |

- 생산자는 `:400`(`status='revoked', revoked_at=?`) 하나뿐이며 **`revoked_at` 은 컬럼 1칸**(`:69` MySQL / `:80` SQLite) → **덮어쓰는 순간 "언제 해지됐었는가"가 물리적으로 소멸**한다.
- **이력 테이블 없음** · 조회 `:267`·`:353` 는 **현재 행만** 읽는다.
- → **§55 "과거 Snapshot 대체 금지" 및 §40 말미의 정면 반례.** 📌 **이 패턴을 Manager 도메인에 복제하면 §40 이 설계 시점에 이미 위반된다.**

### 정정 대상 축 — **대부분 존재하지 않는다**

| 축 | 실측 | 판정 |
|---|---|---|
| 과거 Assignment | `manager_id`·`reports_to`·`supervisor_id`·`acting` **전부 grep 0** · **git 삭제 이력 0** → **정정할 과거가 없다** | `ABSENT` |
| 관계 버전 | **optimistic lock `version` grep 0** · 엔티티 `version` = `menu_defaults.version` **1건**이며 🔴 유일 생산자 `AdminMenu.php:309` 가 **리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | `NAME_ONLY` |
| Affected Period | `effective_to`/`valid_from`/`valid_to` **grep 0** → **기간을 표현할 수단 0** | `ABSENT` |
| Historical Snapshot | 🔴 `pm_baseline.captured_at` = **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |
| Approval Reference | 🔴 **승인자 후보 계산기 0**(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0**) | `ABSENT` |
| Reconciliation | 🔴 **§66 이중 공허** — 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재** | `ABSENT` |
| `manual_review` | **grep 0** | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 11종**

원문: *"과거 Manager 관계를 수정할 때 다음을 강제하라."*(`:1503`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Correction Reason | 부재 — 사유 컬럼 0 · 🔴 `is_active=0` **3경로 혼재**(`UserAuth.php:1380`·`EnterpriseAuth.php:412`·`UserAdmin.php:361`)인데 **어느 경로도 사유를 남기지 않는다** = 사유 미기록의 현행 관행 | `ABSENT` |
| 2 | Authorized Requester | 부재 · 인접 `Mapping::actorId:36-53` **REAL**(3분기: `apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` 폴백 `:49` / **미확인 null `:52` → 403 fail-closed** `:187-190`,`:246-250`) — 🔴 **국소 표준이며 전사 표준 아님**(`Alerting::actor:33-36` = `X-User-Email` 헤더 위조가능) | `LEGACY_ADAPTER`(Mapping 한정) |
| 3 | Approval Reference | 🔴 **참조할 승인 엔티티가 소급 도메인에 0** · 인접 승인 **2 REAL**(`mapping_change_request` · `catalog_writeback_job`) — **둘 다 소급 정정 도메인 아님** | `ABSENT` |
| 4 | Original Relationship Version | 🔴 **관계도 없고 버전 축도 없다**(`version` optimistic lock **grep 0**) — **이중 부재** | `ABSENT` |
| 5 | Correction Version | 동상 | `ABSENT` |
| 6 | Affected Period | **`effective_to`/`valid_from`/`valid_to` grep 0** → 기간 표현 수단 0 | `ABSENT` |
| 7 | Affected Approval Tasks | 부재 — 🔴 **Task/배정/클레임 개념 전무** · 승인은 노드가 아니라 **핸들러 메서드**(`Mapping::approve:238-294`) | `ABSENT` |
| 8 | Affected Decisions | 🔴 `action_request` **VACUOUS**(`INSERT INTO action_request` **grep 0 확정**) · `decideAction:591-595` **단일 결정으로 즉시 approved** — **정족수를 표시하나 집행하지 않는다** | `VACUOUS` |
| 9 | Historical Snapshot Impact | 🔴 `pm_baseline` 스냅샷 = **JSON 내부 키**(`PM/Enterprise.php:360`) → **as-of 질의 불가** · 🔴 `snapshot` **grep 최다 히트가 CCTV JPEG 프레임**(`routes.php:271`·`WmsCctv.php:45`) = **§54/§40 검색 시 최우선 오염원** | `KV_ONLY` |
| 10 | Reconciliation | 🔴 **§66 이중 공허** — 좌변(source)·우변(canonical) **양쪽 부재** → **자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형) | `ABSENT` |
| 11 | Manual Review for Financial Approval Impact | **`manual_review` grep 0** · 🔴 `rebate` **전역 0** — **스펙 표제 도메인(재무 영향의 본체)이 레포에 없다** | `ABSENT` |

> ★ **원문 11종은 `evidence` 로 끝나지 않는다**(`Manual Review for Financial Approval Impact` 가 마지막 · `:1515`). **추가하지 않았다**(규율 규칙 4 반대편향 방지).

**실측 개수: 11 / 11 전사.** (측정기 11 · 원문 대조 11 · 전사 11 — **3자 일치**.) 커버리지 = **부재 8 · `KV_ONLY` 2 · `VACUOUS` 1 · `LEGACY_ADAPTER` 1(중복 계상 없이: 부재 7 · KV_ONLY 2 · VACUOUS 1 · LEGACY_ADAPTER 1) · 커버 0**.

## 2. 규칙

- ★ **§40 전면 판정 = `CONTRACT_ONLY`.** 요구 11종을 계약으로 명세할 수는 있으나 **집행 수단이 레포에 없다**: `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않으며**, `backend/migrations/` 는 **172차에 정지**했다. **소급 정정 스크립트를 놓을 자리가 없다.**
- 🔴 **★`Migrate` 를 §40 커버로 계산 금지**(이름 겹침) — **DDL 적용기이지 도메인 데이터 이행기가 아니다.** ⚠️ `PM/Shared.php:37-53` 의 런타임 `Migrate::applyFiles`(`:53`)조차 **`pm_projects` 부재 시 DDL 파일 적용**(`:44` 존재검사 → 즉시 반환)일 뿐이다. **"런타임 마이그레이션이 있다 → 소급 정정 가능"은 규칙 7 위반**(이름이 아니라 능력으로).
- 🔴 **★원문 말미 *"과거 Assignment·Snapshot·Decision Evidence를 덮어쓰지 마라"* 의 정면 반례가 실재한다** — `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거**(단일 컬럼 · 이력 테이블 0) → **이력 물리적 소멸**. 📌 **이 패턴(상태 전이 시 이전 시각 컬럼을 NULL 로 되돌리기)을 Manager 도메인에 복제 금지.** 상태 전이는 **행 추가**여야 하며 **컬럼 되감기가 되어서는 안 된다**.
- 🔴 **정정은 UPDATE 가 아니라 "새 버전 행 + 원본 보존"이어야 한다.** `Original Relationship Version` / `Correction Version` 이 **동시에 요구된다**는 것이 그 증거다. 🔴 그러나 현행에 **optimistic lock `version` 이 grep 0** 이고 엔티티 `version` 은 `menu_defaults.version='baseline'` **리터럴 라벨 1건**뿐 → **버전 개념 전체가 신규**다. **"컬럼이 있다 → 버전 모델이 있다"는 규칙 7 위반.**
- 🔴 **`Reconciliation` 을 "source 측만 만들면 된다"로 읽지 마라**(역산 금지) — **§66 은 좌변·우변 양쪽이 부재**다. **Canonical 선언이 §66 에 선행**한다(5-3-3-1 D-14 동형). 양변 부재 상태로 대사를 돌리면 **자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형).
- 🔴 **`Affected Decisions` 를 `action_request` 로 배선 금지** — 생산자 **0**(`VACUOUS`)이며, 🔴 **잠복 결함**이다: `Alerting::actor:33-36` 이 **`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백**(289차 G-01 이 `Mapping` 에서 고친 **바로 그 위조가능 패턴**)이고 `decideAction:591` 이 이를 그대로 기록하며 **상태가드·자기승인차단·dedup·정족수 전부 없다**. **생산자를 하나 붙이는 순간 위조가능 승인이 활성화된다.**
- **`Authorized Requester` 는 `Mapping::actorId:36-53` 형태 채택**(3분기 + 미확인 → **403 fail-closed** `:52`) — 🔴 `Alerting::actor` 형태 **채택 금지**. ⚠️ **관찰(등급 미부여)**: 동일인이 **API키/세션 경로로 접근하면 actor 문자열이 다르다** → dedup(`:279`)·자기승인 차단(`:268`)이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.**
- 🔴 **`snapshot` 검색 시 CCTV 오염 주의** — `wms/cameras/{id}/snapshot`(`routes.php:271`·`WmsCctv.php:45`)가 **최다 히트**다. `Historical Snapshot` 근거로 계산 금지.
- 🔴 **11종 "있다고 가정"하고 배선 금지.**
