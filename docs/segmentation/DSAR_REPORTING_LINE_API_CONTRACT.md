# DSAR — API Contract (§78)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §78 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 라우트 등록 관례 — **2단계 필수**

| 단계 | 실측 |
|---|---|
| ① `routes.php` 매핑 | `'METHOD /path' => 'Genie\Handlers\Class::method'` 문자열 매핑 · **자동발견 없음** |
| ② `$register` | 핸들러 등록 누락 시 라우트가 **조용히 404** |
| ③ **`/api` 접두 별칭** | 🔴**필수** — 누락 시 nginx SPA HTML 폴백으로 **200 HTML 이 반환되어 "동작하는 것처럼 보인다"**(착시) |

### ★Rate Limit = **REAL** (§78 직결 · 실측 재확인)

`backend/public/index.php:508-545` — API 키 단위 **고정 1분 윈도우** 카운터.

| 축 | 실측 |
|---|---|
| 저장 | `api_rate_limit(key_id, window_min, cnt)` · MySQL `ON DUPLICATE KEY` / SQLite `ON CONFLICT` **양 방언 수기 작성**(`:519-524`) |
| 기본값 | **1200 req/min** · `GENIE_RATE_LIMIT_PER_MIN=0` 이면 비활성 |
| 실패 정책 | 🔴**fail-open** — DB 오류/테이블 부재 시 **차단하지 않는다** |
| 응답 | 429 + `Retry-After` + `X-RateLimit-Limit`(`:544-546`) |
| 자가치유 | 테이블 부재 시 1회 `CREATE TABLE IF NOT EXISTS` 후 재시도(`:532-540`) = `ensureTables` 패턴 |

🔴 **★주석 `:509-510` 이 스스로 자인**: *"대상 = 실제 `api_key` 프로그래매틱 트래픽만(SPA/세션 게이트 경로는 위에서 이미 return 되어 미도달)"* — **코드로 재확인**: 레이트리밋 블록이 `$keyRow['id']` 존재를 조건으로 하며(`:515`), 세션 경로는 그 이전에 return 된다.
→ **"레이트리밋 있음"으로 §78 을 닫으면 분모를 API 키 축으로 갈아끼우는 역산이다.** Manager Relationship API 가 **SPA/세션 경로로 소비되면 레이트리밋에 도달하지 않는다.**

### Optimistic Lock = **부재**

- **`version` grep 0** · `if_match`·`optimistic`·`row_version` **grep 0**(실측 재확인) · `AdminPlans.php:266`,`:279` 의 `version` 은 **DB 엔진 버전 문자열**(무관).
- 유일 엔티티 `version` = `menu_defaults.version` 1건이며 ★**유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**.
- 🔴 **★진짜 제약은 SQL 문법이 아니라 마이그레이션 경로다.** "SQLite 폴백이라 못 한다"는 부정확하다 — 실제 제약은 **`backend/migrations/` 172차 정지**(21파일 · 최신 `20260527_172_002_coupon_tables.sql`) + **`ensureTables` 이중 방언 수기 중복 작성 의무**이며, 🔴**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다.**

## 1. 원문 전사 + 판정 — **원문 55종**

> ★측정기 55 / 원문 대조 55 / 전사 55 — **일치**(하위 9그룹 45 + 공통 10).

### Reporting Line (6)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Registry 조회 | Registry 부재 | `NOT_APPLICABLE`(신설) |
| 2 | Definition 생성·수정 | 부재 | `NOT_APPLICABLE`(신설) |
| 3 | Version 생성 | 부재 · `menu_defaults.version` = **리터럴 라벨** | `NOT_APPLICABLE`(신설) |
| 4 | Version 검증 | 부재 | `NOT_APPLICABLE`(신설) |
| 5 | Version 활성화 | 부재 | `NOT_APPLICABLE`(신설) |
| 6 | 특정 날짜 Version 조회 | 부재 — **`as_of` 2건은 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`)이지 as-of 질의 아님 · `WHERE effective_from <= :as_of` **전역 0** | `NOT_APPLICABLE`(신설) |

### Manager Relationship (8)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 7 | Relationship 생성 | 관계 테이블 0 | `NOT_APPLICABLE`(신설) |
| 8 | Relationship Version 생성 | 부재 | `NOT_APPLICABLE`(신설) |
| 9 | Relationship 종료 | 부재 · 🔴**`effective_to`/`valid_to`/`valid_from` grep 0** | `NOT_APPLICABLE`(신설) |
| 10 | Subject Manager 조회 | 부재 | `NOT_APPLICABLE`(신설) |
| 11 | Position Manager 조회 | Position 축 0 | `NOT_APPLICABLE`(신설) |
| 12 | Organization Manager 조회 | 인접 `team.manager_user_id` 조회 `TeamPermissions.php:444-445` — **팀당 1칸 · 이력 0** | `PARTIAL`(**커버 아님**) |
| 13 | Effective Date 기준 조회 | 부재 — §38 **Business/System Time 이중 시간축 전례 0** | `NOT_APPLICABLE`(신설) |
| 14 | Relationship History 조회 | 부재 | `NOT_APPLICABLE`(신설) |

### Manager Type (6)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 15 | Direct Manager 조회 | 부재 | `NOT_APPLICABLE`(신설) |
| 16 | Administrative Manager 조회 | 부재 — Admin/Functional 미분화 | `NOT_APPLICABLE`(신설) |
| 17 | Functional Manager 조회 | 부재 | `NOT_APPLICABLE`(신설) |
| 18 | Project·Program Manager 조회 | `pm_projects.owner_user_id` 실재하나 🔴**`WHERE owner_user_id` grep 0 = 판독 술어 0** · **Program 개념 0**(`pm_portfolio` "프로그램"은 **주석 팬텀**) | `NAME_ONLY`(**커버 아님**) |
| 19 | Regional·Country Manager 조회 | 🔴**`wms_warehouses.manager` 를 여기로 계산 금지** — `region`·`country` 와 **같은 테이블에 공존**하나 **시설 담당자 자유텍스트** · 판독 술어 0 · `APAC`/`EMEA`/`LATAM` **0** | `NAME_ONLY`(**커버 아님**) |
| 20 | Cost Center·Profit Center Manager 조회 | 축 자체 부재 | `NOT_APPLICABLE`(신설) |

### Acting·Temporary·Interim (5)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 21 | Assignment 생성 | **`acting`·`vacan` grep 0** · 🔴**`UserAdmin::impersonate:466-525` 를 여기로 계산 금지**(신원 위장 열람 · 기간부 Assignment 전무) | `NOT_APPLICABLE`(신설) |
| 22 | Assignment 종료 | 부재 · 🔴 `promoteManager:768-776` **강등 경로 0** | `NOT_APPLICABLE`(신설) |
| 23 | Active Assignment 조회 | 부재 | `NOT_APPLICABLE`(신설) |
| 24 | Vacancy 연결 | **`vacan` grep 0** | `NOT_APPLICABLE`(신설) |
| 25 | 충돌 검증 | 부재 | `NOT_APPLICABLE`(신설) |

### Supervisory Graph (6)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 26 | Direct Parent Manager 조회 | 부재 · 🔴**`app_user.parent_user_id` 는 테넌트 포인터이지 보고선 아님** | `NOT_APPLICABLE`(신설) |
| 27 | Manager Ancestor 조회 | 부재 — **순회가 단일 홉**(`resolveTenantId:200-217` `LIMIT 1` · 재귀 0) | `NOT_APPLICABLE`(신설) |
| 28 | Supervisory Path 조회 | 부재 — **Materialized Path/Closure Table 0** | `NOT_APPLICABLE`(신설) |
| 29 | Chain Depth 조회 | 부재 · ★**`Dependencies.php:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → Depth 로 계산하면 오판 | `NOT_APPLICABLE`(신설) |
| 30 | Cycle 검증 | **알고리즘 선례 REAL**: DFS `Handlers/PM/Dependencies.php:79-100`(**쓰기 전 차단 `:32-34` 422 `cycle_detected`**) · Kahn `Handlers/PM/Gantt.php:104-125`(⚠️탐지 후 차단 안 함) · 🔴**`ChannelSync.php:955-962` 는 검출기가 아니다**(`$visited` 없이 깊이만 자름 → **조용히 절단**) | `LEGACY_ADAPTER`(**알고리즘만 이식 · 도메인 신규**) |
| 31 | Root Manager 조회 | 부재 | `NOT_APPLICABLE`(신설) |

### Candidate (5)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 32 | Manager Candidate 생성 | ★**`ABSENT`** — **승인자 후보를 계산하는 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `ABSENT` |
| 33 | Candidate Exclusion | 부재 · 인접 자기승인 차단 `Mapping.php:268-271`(**요청자 본인 배제뿐**) | `PARTIAL`(**커버 아님**) |
| 34 | Candidate Deduplication | 인접 `Mapping.php:278-283` dedup — ⚠️**API키/세션 경로 전환으로 우회 가능**(등급 미부여 · 실 경합 경로 미검증) | `PARTIAL`(**커버 아님**) |
| 35 | Candidate Ranking Reference | 부재 | `NOT_APPLICABLE`(신설) |
| 36 | Manual Review 전환 | 부재 — Review/Approval 미분화 | `NOT_APPLICABLE`(신설) |

### Snapshot (4)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 37 | Manager Snapshot 생성 | **`Actor Authorization Snapshot` `ABSENT`**(승인 시점 권한 동결 0) · 🔴**`snapshot` grep 최다 히트 = CCTV JPEG**(`routes.php:271`·`WmsCctv.php:45`) | `ABSENT` |
| 38 | Snapshot 조회 | 부재 · ★**`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |
| 39 | Snapshot Hash 검증 | 선례: `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain · 생성 `:182-197` · `lastHash():214-219`) 🔴**단 쓰기 체인만 실재·`verify()` 0** — AdminMenu `hash_equals` 0 · preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼(`:199-203`) 소실 → `created_at` DEFAULT(`:129`)가 덮어 재계산 불가 → **tamper-evident 아님**(`:18` 주석≠근거); **검증형 정본 = `SecurityAudit::verify():56-68`**(`:64` hash_equals+prev_hash 교차) · `schema_migrations.checksum`(`Migrate.php:50`) 🔴**`menu_audit_log` 에 `tenant_id` 없음 → 스키마 복제 금지·알고리즘만 이식** | `LEGACY_ADAPTER`(알고리즘 이식) |
| 40 | Historical Reconstruction | 부재 · 🔴**정면 반례**: `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이력 물리적 소멸** | `NOT_APPLICABLE`(신설) |

### Reconciliation (5)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 41 | Source별 비교 | ★**이중 공허** — 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재**. **manager 보유 소스 = 0개** | `NOT_APPLICABLE`(**Canonical 선언 선행**) |
| 42 | Drift 조회 | 무대상 · 🔴**양변 부재 → 자동 MATCH = 가짜녹색**(288차 `ok=>true` 위장과 동형) | `NOT_APPLICABLE`(신설) |
| 43 | 영향 Task 조회 | 무대상 | `NOT_APPLICABLE`(신설) |
| 44 | Manual Resolution | 무대상 | `NOT_APPLICABLE`(신설) |
| 45 | Reconciliation History | 무대상 | `NOT_APPLICABLE`(신설) |

### 모든 API 공통 적용 (10)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 46 | Tenant Context | **REAL** — `index.php` 미들웨어가 `auth_tenant` 부여 + `X-Tenant-Id` 부재 시 주입 · 선례 `Dependencies.php:91`(**매 홉 tenant 필터**)·`Catalog::approveQueue:2350` 🔴**반례 복제 금지**: `admin_growth_approval`·`menu_tree`·`menu_audit_log` **tenant_id 없음** | `VALIDATED_LEGACY`(**적용 의무**) |
| 47 | Authorization | **REAL** — RBAC `viewer<connector<analyst<admin` + 스코프(`write:*` 등) · 🔴**단 "Manager 라서 승인"(`UserAuth.php:1064`·`TeamPermissions.php:136`)은 §31 이 금지** — **적격 술어 신설 필요** | `PARTIAL`(**커버 아님**) |
| 48 | Effective Date Validation | **`ABSENT`** — `effective_to`/`valid_to`/`valid_from` **grep 0** · `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無**(읽기 4개소 전부 최신승) | `ABSENT` |
| 49 | Idempotency | **선례 REAL** — Paddle webhook `notification_id` UNIQUE(`Paddle.php:343`) · `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` | `LEGACY_ADAPTER`(선례 이식) |
| 50 | Optimistic Lock | 🔴**`ABSENT`** — `version`·`if_match`·`optimistic`·`row_version` **grep 0**(실측 재확인) · ★**진짜 제약 = 마이그레이션 경로**(172차 정지 + `ensureTables` 이중 방언 · **데이터 변환·백필 없음**) | `ABSENT` |
| 51 | Audit | **REAL** — `pm_audit_log`(migration `20260526_168_008`) `tenant_id NOT NULL :7` + `entity` + `diff_json :13` + **3인덱스 `:17-19`** + append-only 주석 `:2-3` · `UserAuth::logAudit` | `VALIDATED_LEGACY`(**이 선례를 따르라**) |
| 52 | Evidence | `CONTRACT_ONLY` — Evidence 개념의 실 코드 0 · 인접 = `menu_audit_log.hash_chain`(**tenant_id 없음**) | `CONTRACT_ONLY` |
| 53 | Rate Limit | ★**REAL**(`index.php:508-545` · 1분 윈도우 · 1200/min · **fail-open** · `Retry-After` `:544-546`) 🔴**단 `api_key` 프로그래매틱 트래픽만 — SPA/세션 경로 미도달**(주석 `:509-510` 자인 · 코드 `:515` 재확인) | `PARTIAL`(🔴**"있음"으로 닫으면 역산**) |
| 54 | Pagination | 미확인 — 전사 표준 페이지네이션 계약 **미실증** | `UNVERIFIED` |
| 55 | Error Contract | **REAL(국소)** — `Mapping::fail`/`TeamPermissions::fail` 4xx 계약(`INVALID` 422 `:464`) · `Dependencies:32-34` 422 `cycle_detected` · **전사 단일 표준 여부는 미확인** | `PARTIAL` |

**실측 개수: 55 / 55 전사.** 커버(`VALIDATED_LEGACY`) = **2**(#46 Tenant Context · #51 Audit) · `LEGACY_ADAPTER` 3 · `PARTIAL` 6 · `ABSENT` 4 · `KV_ONLY` 1 · `NAME_ONLY` 2 · `CONTRACT_ONLY` 1 · `UNVERIFIED` 1 · `NOT_APPLICABLE` 35.

## 2. 규칙

- 🔴 **라우트 3중 등록 필수**: `routes.php` 매핑 + `$register` + **`/api` 접두 별칭**. 별칭 누락 시 **nginx SPA HTML 폴백이 200 을 반환**해 "동작"으로 오독된다.
- 🔴 **★Rate Limit 을 "있다"로 §78 을 닫지 마라.** `index.php:508-545` 는 **`api_key` 축에서만 REAL**이며 **fail-open**이다. Manager Relationship API 를 **SPA/세션 경로로 노출하면 레이트리밋은 0**이다. **분모를 API 키 축으로 갈아끼우는 역산 금지.**
- 🔴 **Optimistic Lock 은 "SQLite 라서 못 한다"가 아니다.** 진짜 제약은 **마이그레이션 경로**(172차 정지 · `ensureTables` 는 **DDL 만 · 데이터 변환/백필 없음** · **MySQL/SQLite 두 방언 수기 중복 작성 의무**). 🔴**`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 데이터 이행기가 아니다.**
- 🔴 **Audit 은 `pm_audit_log` 를 선례로 삼으라**(`tenant_id NOT NULL`+`diff_json`+3인덱스+append-only). **`menu_audit_log` 는 검증형 해시체인 선례가 아니다** — **쓰기 체인만 실재**하고 `verify()` 검증기가 없으며(AdminMenu `hash_equals` 0), preimage `'ts'`(`:195`)가 INSERT 컬럼에서 소실돼 `created_at` DEFAULT 가 덮으므로 **재계산 불가 = tamper-evident 아님**(`:18` 주석≠근거); **검증형 정본은 `SecurityAudit::verify():56-68`**. `menu_audit_log` 는 `tenant_id` 도 없어 **스키마 복제 금지 — 검증형 알고리즘(SHA-256 prev-chain)만 이식**하고 `lastHash()` 에 **`WHERE tenant_id=?` 필수**.
- 🔴 **Reconciliation API(#41~#45) 를 source 측부터 만들지 마라** — **Canonical 선언이 §66 에 선행**한다. 양변 부재 상태의 비교는 **자동 MATCH = 가짜녹색**이다.
- **경로 접두 필수**: `backend/src/Handlers/PM/…` — `backend/src/PM/` 는 **존재하지 않는다**.
