# GeniegoROI Claude Code Implementation Specification

# CCIS Part009 — Database Design & Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

데이터베이스 설계·운영 표준을 수립한다.

> ★**성격(Part001~008 과 동일)**: 사용자가 Part009 명세(PostgreSQL 16·UUID v7·RLS·파티셔닝·
> Materialized View·Doctrine/Eloquent ORM·forward-only migration)를 제공했으나 **그대로 따르지 않았다.**
> 실측 결과 이 저장소 DB = **MySQL 8 InnoDB(utf8mb4) + SQLite 폴백**이며, PostgreSQL 스택은 **부재**다.
> 마이그레이션은 172차 정지 후 **핸들러 `ensureTables` 자가치유 DDL**이 정본이다.
> Part001 §4 에 따라 **실측 → 매핑 → PostgreSQL 부재 증명 → 실재하는 DB 표준을 성문화**했다.
> (문서 차수 — 코드 무변경. §30 root 계정은 권고만.)

---

## 2. 실측 — 현행 DB 현실

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| DBMS | PostgreSQL 16+ | **MySQL 8**(InnoDB 221·utf8mb4 393) + **SQLite 폴백**(`Db.php`·`backend/data/genie_*.sqlite`) |
| PK | **UUID v7**(auto-increment 금지) | **`AUTO_INCREMENT`**(222회) 지배적 · UUID/CHAR(36)=6회(소수) |
| 스키마 분리 | Context별 schema(auth/order/…) | **단일 DB `geniego_roi`**(논리 그룹만) |
| 마이그레이션 | forward-only 파일(`YYYYMMDDNNNN_*.php`) | **172차 정지**(21파일·마지막 `..172_002_coupon_tables.sql`) → **`ensureTables` 자가치유**(98메서드·`CREATE TABLE IF NOT EXISTS` **488**) |
| Soft Delete | `deleted_at`/`deleted_by` | **부재**(`deleted_at`=0) — hard delete / status 기반(취소상태·`is_active=0`) |
| Timestamp | `created_at/updated_at/deleted_at` TIMESTAMPTZ | `created_at`(951)·`updated_at` 표준. TIMESTAMPTZ 아님(MySQL DATETIME/TIMESTAMP) |
| Multi-Tenant | tenant_id + **RLS** | ★**`tenant_id` 3094회**(전 업무테이블) — **앱레벨 `WHERE tenant_id=?`**. RLS **부재**(MySQL 미지원) |
| RLS / Partition / Materialized View | 적용 검토 | **각 0개**. 집계=rollup 핸들러+테이블(`performance_metrics`·`channel_orders`) |
| Audit Log | audit_logs 불변 | ★**실재**: `SecurityAudit`(해시체인·`::verify()`가 유일 tamper-evident 정본)·`action_request`(승인)·`menu_audit_log`·`ai_call_log`(053) |
| ORM | Doctrine/Eloquent | **부재** — **PDO prepared statement 직접**(SQLi 방지 §30 준수) |
| Repository/Mapper | Domain↔Persistence 분리 | **부재**(Part007/008) — 핸들러 인라인 |
| 보안 계정 | root/superuser app 사용 금지 | ★**`GENIE_DB_USER` 기본=`root`** — §30 최소권한 위반(권고 §6) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(정규화·UUID·Soft Delete·forward-only·DB독립 Domain) | **부분** | 정규화·tenant 격리·prepared 준수. UUID/Soft Delete/Domain 독립은 미적용 |
| §4 PostgreSQL 16 | **미적용** | MySQL 8 + SQLite. 상향=인프라 결정 |
| §5 Context별 schema | **미적용** | 단일 DB |
| §6 Table snake_case 복수형 | **준수** | `channel_orders`·`api_key`·`user_session` |
| §7 Column 규칙 | **부분** | snake_case·`created_at`·`tenant_id`·`is_*` 준수. `deleted_at`/`*_by` 계열 대부분 부재 |
| §8 UUID v7 PK | **미적용** | `AUTO_INCREMENT` 정본. UUID 전환=전 테이블 스키마 변경 |
| §9 UUID 구현 | **대상 없음** | Domain Factory 부재 |
| §10 FK 명시 | **부분** | FK 일부. 다수 테이블은 앱레벨 무결성(`ensureTables` 유연성 우선) |
| §11~§13 Index/Composite/Unique | **부분 준수** | `(tenant_id, …)` 인덱스·tenant 포함 unique 존재. EXPLAIN 상시검토는 아님 |
| §14~§15 Check/Enum | **부분** | 상태=VARCHAR + 앱 화이트리스트(PG Enum 아님·MySQL) |
| §16 Timestamp TIMESTAMPTZ/UTC | **부분** | created/updated_at 있음. TIMESTAMPTZ 아님 |
| §17 Soft Delete | **미적용** | `deleted_at` 0. hard/status 삭제 |
| §18 Audit Log | **★준수(실재)** | SecurityAudit(해시체인)·action_request·menu_audit_log·ai_call_log |
| §19 Multi-Tenant | **★강하게 준수** | `tenant_id` 3094·전 쿼리 조건(헌법) |
| §20 RLS | **미적용** | MySQL RLS 미지원. 앱레벨 격리 |
| §21 Partition | **미적용** | 부재 |
| §22 View/Materialized View | **미적용** | rollup 핸들러/테이블로 집계 |
| §23 Transaction | **부분** | 핸들러 내 트랜잭션·외부 API 를 트랜잭션 밖에(285차 502 트랩 교훈). Application 계층은 없음 |
| §24 Lock | **부분** | `FOR UPDATE`/트랜잭션 존재. Optimistic 버전컬럼 표준 아님 |
| §25 Migration forward-only | **부분/전환** | 172까지 forward-only 파일 → 이후 `ensureTables`. **이미 실행된 마이그레이션 수정 금지** 준수 |
| §26 Seeder | **부분** | 데모 시드=코드(GlobalDataContext)·`ensureTables` 초기행. 운영 임의 시드 금지 |
| §27 Repository 매핑 | **미적용** | Repository/Mapper 부재(PDO 직접) |
| §28 Query 최적화(SELECT * 금지·N+1·Pagination) | **부분** | Pagination(limit clamp)·N+1 주의(285차). `SELECT *` 일부 잔존 |
| §29 Backup/PITR | **부분** | 파일 백업 dir 다수·mysqldump. WAL/PITR·복구테스트 정례화 미확인 |
| §30 보안(TLS·최소권한·prepared·Secret Manager) | **부분** | ★**prepared statement 준수**·Secret=`.env`+`Crypto`. **단 app 이 `root` 계정 사용=최소권한 위반**(권고 §6) |
| §31 PHP(ORM/prepared/Repository) | **부분** | PDO prepared 준수. ORM/Repository 미사용 |
| §33 검증(artisan/doctrine migrate) | **대상 없음** | artisan/doctrine 부재. `php backend/bin/migrate.php`(원격 실행) |

---

## 4. 확립된 표준 (신규 스키마가 따를 정본)

- **DBMS**: MySQL 8 InnoDB **utf8mb4**(+ SQLite 폴백). PostgreSQL 문법(SERIAL/RETURNING/RLS) 금지·driver-aware 필요 시 분기.
- **스키마 추가 = 핸들러 `ensureTables`(자가치유 `CREATE TABLE IF NOT EXISTS`)** 가 정본. 마이그레이션 파일 경로는 172 정지 → **어느 쪽을 쓰는지 명시**(Part005 §4·섞지 않기). 이미 실행된 마이그레이션 수정 금지.
- **PK**: 기존 관례 `AUTO_INCREMENT`(BIGINT/INT). 신규도 이 관례 유지(UUID 전환은 전역 결정).
- **필수 컬럼**: `tenant_id`(★전 업무테이블·NOT NULL 지향)·`created_at`(+`updated_at`). boolean `is_*`. 금액=정수/DECIMAL.
- **Multi-Tenant 격리(§19)**: 앱레벨 **`WHERE tenant_id = ?`** 를 모든 조회·변경에 강제. 누락 금지(헌법 — 테넌트 격리 절대). RLS 없음.
- **쿼리**: PDO **prepared statement**(요청값 직접 식별자/SQL 금지·SQLi 방지). limit clamp. **루프 내 외부 API N+1 금지**(285차 502 근본원인). `SELECT *` 지양·컬럼 명시.
- **삭제**: soft delete 미사용 관례. 상태 기반(취소/비활성)·필요 시 hard delete(트랜잭션·영향행수 확인).
- **감사**: 승인/권한/보안 이벤트는 `SecurityAudit`(해시체인)·`action_request`·`menu_audit_log` 재사용(중복 감사엔진 금지). AI 호출은 `ai_call_log`(053).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **PostgreSQL 16 전환** — 안 함. MySQL 8 + SQLite 정본. DBMS 교체=대규모 인프라 재구축·전 DDL 재작성.
2. **UUID v7 PK·RLS·Partition·Materialized View** — 안 함. AUTO_INCREMENT·앱레벨 tenant 격리·rollup 집계가 정본. UUID/RLS 전환=전 테이블 스키마 변경.
3. **Soft Delete(`deleted_at`)** — 안 함. 상태 기반/hard 삭제가 기존 관례(무분별 도입은 조회술어 전역 변경·회귀).
4. **Doctrine/Eloquent ORM·Repository/Mapper** — 안 함(Part007/008). PDO 직접이 정본.
5. **forward-only migration 파일 재개** — 안 함. `ensureTables` 자가치유가 172 이후 정본(CLAUDE.md).

★**준수하는 실 원칙**: **Multi-Tenant 격리(§19)** · **Audit(§18)** · **Prepared Statement(§30)** · snake_case(§6) · tenant 포함 Unique/Index.

---

## 6. ★실재 관찰 및 권고 (§30 — 미변경, 승인 대상)

- **app 이 MySQL `root` 계정 사용**(`GENIE_DB_USER` 기본=`root`) = 명세 §30 "root/superuser app 사용 금지" 위반. 최소권한 원칙상, `geniego_roi`(+`_demo`)에 대한 **DML/DDL 한정 전용 계정**을 만들어 교체하는 것이 바람직하다.
- ★**본 차수 미변경**: DB 계정 교체는 ①한정계정 생성·GRANT ②운영·데모 `.env` `GENIE_DB_USER/PASS` 동시 갱신 ③php-fpm reload ④전 기능 회귀검증을 수반하는 **운영 인프라 변경**이라 **사용자 승인 + 별도 절차** 필요. 무단 변경 시 DDL 자가치유(`ensureTables`) 권한 부족으로 전면 장애 위험. → **권고로만 기록.**

---

## 7. Claude Code 구현 규칙

1. **MySQL(InnoDB·utf8mb4) 문법**. PostgreSQL(SERIAL/RETURNING/RLS/gen_random_uuid) 금지. SQLite 폴백 고려(driver-aware).
2. **스키마 = `ensureTables`**(`CREATE TABLE IF NOT EXISTS`) 확장. 이미 실행된 마이그레이션 수정 금지. 어느 경로인지 명시.
3. ★**전 쿼리 `tenant_id` 조건**(§19·헌법). 격리 우회 금지.
4. **PDO prepared statement**. 요청값을 식별자/경로/명령에 직접 금지. `SELECT *` 지양.
5. **루프 내 외부 API 호출 금지**(N+1·285차 502). 트랜잭션은 짧게·외부호출은 밖에.
6. 감사=`SecurityAudit`/`action_request`/`menu_audit_log`/`ai_call_log` 재사용. 중복 감사엔진·중복 인덱스 금지.
7. UUID/RLS/Partition/Materialized View/ORM 을 "명세에 있다"는 이유로 도입하지 않는다.

---

## 8. Completion Criteria

- [x] DB **실측**(MySQL/SQLite·AUTO_INCREMENT·ensureTables·tenant_id·audit·RLS/partition 0)
- [x] 명세 §3~§33 **섹션별 매핑·판정**(PostgreSQL 부재 증명)
- [x] Table/Column/Index/Unique/Timestamp 관례 성문화(§4)
- [x] Multi-Tenant(§19)·Audit(§18)·Prepared(§30) 준수 명시
- [x] Soft Delete/RLS/Partition/Materialized View/UUID 미적용 + 사유(§5)
- [x] Migration 정본(172 정지 → ensureTables) 성문화
- [x] ★§30 root 계정 관찰·권고(미변경·승인대상)(§6)
- [x] Claude Code 규칙(§7) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 MySQL/SQLite + ensureTables + tenant_id 격리를 성문화하고 PostgreSQL 스택 부재를 증명한 것이지, PostgreSQL/RLS 이식이 아니다.

---

## 다음 Part

**CCIS Part010 — ORM, Repository & Persistence Standards** — ★사전 경고: 본 저장소는 **ORM(Doctrine/Eloquent) 부재·Repository/Mapper 부재·PDO 직접**(본 Part §2·Part007/008 실측). Part010 도 실측→ORM/Repository 부재증명→PDO prepared + 핸들러 인라인 패턴 성문화로 처리(ORM 이식 금지).
