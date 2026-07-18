# DSAR — Supervisory Hierarchy Version (§10)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §10 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `SUPERVISORY_HIERARCHY_VERSION` | **`hierarchy` grep 0** → **버전을 매길 대상이 없다** | `ABSENT` |
| 엔터티 `version` 컬럼 | **레포 전체 1건** = `menu_defaults.version` · 🔴**유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**(주석 `:281` 이 282차까지 0행 자인) | `NAME_ONLY` |
| optimistic lock `version` | **grep 0** | `ABSENT` |
| `effective_to`/`valid_to`/`valid_from` | **grep 0** | `ABSENT` |
| immutable_hash 선례 | `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain · 생성 `:182-197` · `lastHash():214-219` — 🔴 쓰기 체인만 실재 · `verify()` 0 · preimage ts(`:195`) 소실 → tamper-evident 아님 · 검증형 정본 = `SecurityAudit::verify():56-68`) · `schema_migrations.checksum`(`Migrate.php:50`) | `LEGACY_ADAPTER` |
| 스냅샷 선례 | 🔴**`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |

### ★`node count`/`edge count` — **최우선 오염원(커버 계산 금지)**

`edge_count` 히트 3건(`GraphScore.php:434`,`:438`,`:442`)은 전부 **`COUNT(*) AS edge_count` 질의 별칭**이고 `node_counts`(`:454`)는 **응답 투영 키**다 — **저장된 버전 메트릭 컬럼이 아니다.** 이를 §10 커버로 계산하면 규칙 7 위반(“이름이 있다 → 필드가 있다”).

### ★시점/버전 축 — **부재의 깊이가 다르다**(일반화 금지)

| 축 | 상태 | 교정 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有·질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | **질의 계층**(과거 복원 가능) |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805`) | **저장 계층 신설** — 복원할 게 없다 |

🔴 **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.** §38 **Business/System Time 이중 시간축 = 전례 0.**

## 1. 원문 전사 + 판정 — **원문 19종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | supervisory_hierarchy_version_id | 엔터티 부재 | `ABSENT` |
| 2 | supervisory_hierarchy_id | 부모 엔터티 부재(§9) | `ABSENT` |
| 3 | version_number | **엔터티 `version` = `menu_defaults.version` 1건이며 리터럴 `'baseline'` 라벨**(`AdminMenu.php:309`) · 증분 버전 채번 **0** | `ABSENT` |
| 4 | previous_version_id | 버전 체인 **0** · 인접 해시 체인 선례만 존재(`menu_audit_log` prev-chain `AdminMenu.php:128` — 🔴 쓰기 체인만 · `verify()` 0 · preimage ts(`:195`) 소실 → tamper-evident 아님 · 검증형 정본 = `SecurityAudit::verify():56-68`) | `ABSENT`(선례 = `LEGACY_ADAPTER`) |
| 5 | root references | 루트 개념 부재(§9 #16 `multiple roots allowed` 동일) | `ABSENT` |
| 6 | node count | 🔴**트랩** — `node_counts`(`GraphScore.php:454`) = **응답 투영 키** · 저장 컬럼 아님 | `ABSENT` |
| 7 | edge count | 🔴**트랩** — `COUNT(*) AS edge_count`(`GraphScore.php:434`,`:438`,`:442`) = **질의 별칭** · 저장 컬럼 아님 | `ABSENT` |
| 8 | maximum depth | 저장 필드 부재. 선례 = `AdminMenu::wouldCycle:545` **하드코딩 100** · 🔴`Dependencies:84` **10000 은 방문 노드 예산이지 깊이 캡 아님** | `ABSENT` |
| 9 | affected employees | **직원 아이덴티티 = `app_user` 뿐** · 고용 컬럼 **0**(ALTER 5개소 전량 확인) · 영향도 집계 축 **0** | `ABSENT` |
| 10 | affected contractors | **`contractor`/`freelanc`/`employment_type`/`worker_type` backend 전역 grep 0** · 🔴트랩 `contract_type`(`ClaudeAI.php:1166`) = **인플루언서 계약 유형 JSON 스키마** | `ABSENT` |
| 11 | affected positions | **Position 개념 0** · 🔴트랩 `position_idx` = **PM 태스크 정렬순서** | `ABSENT` |
| 12 | affected tasks | `pm_tasks` **실재**하나 **매니저/보고선 연결 0**(DDL 에 assignee·owner·manager 컬럼 없음 · `created_by` 뿐) → **영향도 산출 불가** | `ABSENT`(명부 = `LEGACY_ADAPTER`) |
| 13 | affected approval cases | 승인 4종 중 **2 REAL**(`mapping_change_request`·`catalog_writeback_job`) 이나 **Manager 관계와 연결 0** — 🔴**승인자 후보 계산 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0**) | `ABSENT` |
| 14 | source version | 🔴**§62 와 동일 구조 — "우선순위 미구현"이 아니라 정렬할 대상이 0개.** manager 데이터를 싣는 소스가 **0개**(HRIS/ERP/Directory 전부 `ABSENT` · SCIM `manager` 전역 0) → `VACUOUS` 이전에 **무대상** | `ABSENT` |
| 15 | effective_from | 🔴**`kr_fee_rule.effective_from` 은 다른 도메인(세율)이며 컬럼 有·질의 無** — 계층 축에는 **컬럼조차 없다** | `ABSENT` |
| 16 | effective_to | **`effective_to` grep 0** | `ABSENT` |
| 17 | immutable_hash | 알고리즘 선례 REAL — `menu_audit_log.hash_chain`(SHA-256 prev-chain `AdminMenu.php:128`·`:182-197`·`lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50`). 🔴**`menu_audit_log` 에 `tenant_id` 없음 · `lastHash()` 에 tenant 술어 없음** · 🔴**쓰기 체인만 실재 · `verify()` 0 · preimage ts(`:195`) 소실 → tamper-evident 아님**(검증형 정본 = `SecurityAudit::verify():56-68`) | `LEGACY_ADAPTER`(알고리즘만) |
| 18 | status | 🔴트랩 `is_active` = **계정 상태**(base DDL `Db.php:1106`) · **`NOT NULL DEFAULT 1` → `UNKNOWN` 표현 불가 = fail-open** | `ABSENT` |
| 19 | evidence | 감사 선례 `pm_audit_log`(`tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스+append-only 주석 `20260526_168_008`) — 계층 버전 축은 부재 | `ABSENT`(선례 = `LEGACY_ADAPTER`) |

**실측 개수: 19 / 19 전사.** 측정기 §10 = **19** — **불일치 없음.** 커버리지 = 부재 18 · 어댑터 1(`immutable_hash`).
★원문이 `evidence` 로 **끝난다**(`:654`) → 전사 포함(규칙 4).

## 2. 규칙

1. 🔴 **`menu_audit_log` 스키마 복제 금지 — 알고리즘만 이식.** `tenant_id` 가 없고 `lastHash():214-219` 에 tenant 술어가 없다. 테넌트별 체인 시 **`WHERE tenant_id=?` 필수**. 🔴 **게다가 이식 대상은 쓰기 체인뿐** — `menu_audit_log` 는 `verify()` 0·preimage ts(`:195`) 소실로 **tamper-evident 아니다** → 검증기(`SecurityAudit::verify():56-68`)까지 함께 이식하라.
2. 🔴 **`node count`/`edge count` 를 `GraphScore` 질의 별칭으로 닫지 마라.** 별칭·응답 키는 **저장된 버전 메트릭이 아니다**.
3. 🔴 **`version_number` 를 리터럴로 고정하면 5-3-3-1 D-13 재발.** `menu_defaults.version='baseline'`(`AdminMenu.php:309`)·`Mapping.php:210` `required_approvals=2` 와 **동형** — **컬럼이 있다 ≠ 모델이 있다**(규칙 7).
4. 🔴 **`pm_baseline` 을 스냅샷 선례로 복제 금지.** `captured_at` 이 **`snapshot_json` 내부 JSON 키**라 **인덱스·as-of 질의 불가**(`KV_ONLY`). 버전 시점은 **DB 컬럼 + 인덱스**로 두라.
5. 🔴 **과거 Snapshot 대체/소거 금지(§55).** 정면 반례가 실재한다 — **`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거**해 **이력이 물리적으로 소멸**한다. 이 패턴을 물려받지 마라.
6. 🔴 **마이그레이션 경로 없음 — §40 Retroactive Correction 집행 수단이 없다.** `backend/migrations/` 는 **21파일 · 172차 정지**이며 이후 스키마는 `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}` 로 적용된다. **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다.** 🔴**`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 데이터 이행기가 아니다.** **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
7. **`source version` 은 §66 Reconciliation 과 함께 이중 공허**다 — 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재**. **"source 측만 만들면 된다"는 역산**이며, **양변 부재 시 자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형). **Canonical 선언이 선결.**
8. **`affected *` 5필드는 산출식이 아니라 스냅샷 저장값**이어야 한다 — 연결 축(employees/contractors/positions/tasks/approval cases)이 **전부 부재**이므로 §9·§11·§13 확정 전에는 **산출 자체가 불가능**하다. 순서를 뒤집지 마라.
