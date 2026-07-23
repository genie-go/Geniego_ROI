# GeniegoROI Claude Code Implementation Specification

# CCIS Part010 — ORM, Repository & Persistence Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Persistence Layer(ORM·Repository·Data Mapper·Query Object·Transaction·Cache) 표준을 수립한다.

> ★**성격(Part001~009 과 동일·Part007/009 심화)**: 사용자가 Part010 명세(Repository Pattern·
> Doctrine/Eloquent ORM·Data Mapper·Query Object·Criteria·Unit of Work·Read/Write 분리·
> Cursor Pagination·Persistence Cache)를 제공했으나 **그대로 따르지 않았다.**
> 실측 결과 이 저장소의 Persistence = **핸들러 내 `Db::pdo()` 직접(PDO prepared) + 인라인 SQL**
> 이며, ORM·Repository·Mapper·Query Object·Criteria·Unit of Work 는 **전부 부재**다.
> Part001 §4 에 따라 **실측 → 매핑 → 부재 증명 → 실재하는 Persistence 패턴을 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 Persistence 현실

| 구성물 | 명세 요구 | **실측(정본)** |
|--------|-----------|----------------|
| Repository(Interface+구현) | Aggregate 단위·SQL 은닉 | **0개** — 핸들러가 `Db::pdo()` 직접 인라인 SQL |
| ORM(Eloquent/Doctrine) | Framework 지원 | **부재** — PDO 직접(라이브러리 0) |
| Data Mapper / Persistence Model | Domain↔DB 분리 | **0개**(`*Mapper`=0) — PDO row(연관배열) 직접 사용 |
| Query Object / Criteria | 복잡조회·동적조건 캡슐화 | **0개** — 인라인 SQL + `$where` 문자열 조립 |
| Unit of Work | ORM 변경추적 | **0개**(ORM 부재) |
| Read/Write 분리 | Primary/Read Replica | **부재** — 단일 `Db::pdo()` 커넥션 |
| Lock | Optimistic(version)/Pessimistic | Pessimistic **`FOR UPDATE` 6**(TOCTOU 임계부·쿠폰/재고) · version류 8(제한적). Optimistic 표준 아님 |
| Pagination | Cursor 권장 | **Offset/LIMIT clamp**(cursor 아님) |
| Batch | Chunk/Cursor/Streaming | **cron 워커 33개**(`bin/*_cron.php`)로 배치. chunk idiom 아님 |
| Persistence Cache | Redis 등 | **부재**(Redis 없음·Part006) — 집계는 rollup 테이블 |
| Soft Delete Repository(findActive 등) | 삭제여부 명시 | **대상 없음**(soft delete 미사용·Part009) |
| SQL 안전 | Prepared/Parameter Binding | ★**PDO prepared 준수**(SQLi 방지) |
| `SELECT *` | 금지(§29/§32) | **277회**(기존 관례·컬럼 명시 아님) |
| Multi-Tenant | 전 쿼리 tenant 조건 | ★**관례로 강제**(`WHERE tenant_id=?`·3094)·헌법 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3~§4 Persistence 아키텍처(계층·Repository Interface 의존) | **미적용** | 계층 부재. 핸들러=Persistence 겸함 |
| §5~§8 Repository 구조/Interface/구현/Aggregate | **미적용** | Repository 0. `Db::pdo()` 직접 |
| §9~§12 ORM 선택/Domain-ORM 분리/Data Mapper/Mapping | **미적용** | ORM/Mapper 부재. PDO row 직접 |
| §13~§15 Lazy/Eager/N+1 | **부분** | ORM lazy/eager 개념 없음. ★N+1 방지는 실 교훈(285차 502=루프 내 외부API N+1)·조인/집계로 대응 |
| §16~§18 Query Object/Criteria/Specification | **미적용** | 0개. 인라인 SQL + `$where` 조립 |
| §19 Pagination(Cursor) | **부분** | Offset/LIMIT clamp. Cursor 아님 |
| §20 Batch(Chunk/Cursor) | **부분** | cron 워커 33개로 배치. chunk idiom 아님 |
| §21 Read/Write 분리 | **미적용** | 단일 커넥션. Replica 없음 |
| §22 Transaction=Application | **부분** | 핸들러 내 `beginTransaction/commit/rollBack`. Application 계층 없음. 외부 API 는 트랜잭션 밖(285차) |
| §23 Unit of Work | **대상 없음** | ORM 부재 |
| §24 Optimistic Lock | **부분** | version/updated_at 검증 소수(8). 표준 아님 |
| §25 Pessimistic Lock | **부분 준수** | `FOR UPDATE` 6(쿠폰 TOCTOU·재고 등 임계부·288차 CouponRedeem TOCTOU 정합) |
| §26 Persistence Cache | **대상 없음** | Redis 부재. rollup 테이블 집계 |
| §27 Persistence Event | **대상 없음** | 이벤트 시스템 부재(Part007) |
| §28 Soft Delete Repository | **대상 없음** | soft delete 미사용(Part009) |
| §29 Multi-Tenant Repository(tenant 누락=Critical) | **★관례 준수** | 전 쿼리 `tenant_id`. ★단 `SELECT *` 다수(아래 §5 관찰) |
| §30 Raw SQL(Parameter Binding 필수) | **준수** | 사실상 전부 raw SQL·**prepared 필수 준수** |
| §31~§32 PHP/Claude 규칙(Interface Repository·SELECT * 금지) | **부분** | prepared·tenant 준수. Repository/Interface·SELECT * 금지는 미적용(기존 관례) |
| §33 검증(doctrine:schema:validate/artisan) | **대상 없음** | ORM/artisan 부재. phpstan·`bin/migrate.php` |

---

## 4. 확립된 표준 (신규 코드가 따를 정본)

- **Persistence = 핸들러 내 `Db::pdo()` + PDO prepared statement**. Repository/ORM/Mapper 계층 신설하지 않는다(Part007/008 정합).
- ★**전 쿼리 `WHERE tenant_id = ?`**(§29·헌법 — 누락=Critical). 조회·변경 공통.
- **Parameter Binding 필수**(§30). 요청값을 식별자/SQL/경로에 직접 금지(SQLi).
- **트랜잭션**: 핸들러 내 `beginTransaction/commit/rollBack`. **다단계 쓰기 원자화**. ★**외부 API 호출은 트랜잭션 밖·루프 내 N+1 금지**(285차 502 근본원인).
- **임계 동시성**(쿠폰 사용·재고 차감 등 TOCTOU): `SELECT … FOR UPDATE` + 트랜잭션(288차 CouponRedeem 교훈).
- **배치**: cron 워커(`bin/*_cron.php`) 패턴. 대량은 LIMIT 배치로 분할·전체 메모리 적재 금지.
- **동적 조건**: `$where` 조립 시에도 **바인딩 파라미터로만**(문자열에 값 삽입 금지).
- **집계/대시보드**: rollup 핸들러+테이블(`performance_metrics`·`channel_orders`) 재사용(중복 집계·중복 인덱스 금지).

---

## 5. ★관찰 — `SELECT *` 277회 (미변경, 오탐 주의)

- 명세 §29/§32 는 `SELECT *` 를 금지하나 저장소는 **277회 사용**(기존 관례·컬럼 명시 아님).
- ★**tenant-leak 오탐 금지**: `SELECT *` 중 `tenant_id` 조건이 같은 줄에 없는 사례(`billing_plan`·`risk_model_registry`)를 조사한 결과 **글로벌/설정 테이블**(테넌트 무관·정상)이거나 `$where` 에 tenant 가 포함된 job 조회였다. **명백한 테넌트 격리 누락은 확인되지 않음**. 프로파일 없이 Critical 로 단정하지 않는다(287~289차 전수감사·act-as 트랩 정합).
- **본 차수 미변경**: 277건 컬럼 명시 전환은 대규모 diff·회귀표면. 실 위험(특정 쿼리의 tenant 누락)이 개별 확인되면 그때 수정. 여기서는 **관례로 기록**하고, **신규 코드는 컬럼 명시 지향**을 권고.

---

## 6. Claude Code 구현 규칙

1. Persistence = 핸들러 `Db::pdo()` + prepared. Repository/ORM/Mapper/Query Object/Criteria/Unit of Work 신설 금지.
2. ★**전 쿼리 `tenant_id` 조건**(§29·헌법). 누락=Critical.
3. **Parameter Binding 필수**. `$where` 조립도 값은 바인딩만. `SELECT *` 지양(신규는 컬럼 명시).
4. **트랜잭션은 짧게·외부 API 는 밖에·루프 내 N+1 금지**(285차). 임계 동시성은 `FOR UPDATE`.
5. 배치=cron 워커 패턴·LIMIT 분할. 전체 메모리 적재 금지.
6. Read replica·Persistence Cache(Redis)·Cursor Pagination·ORM 을 "명세에 있다"는 이유로 도입하지 않는다.

---

## 7. Completion Criteria

- [x] Persistence 구성물 **실측**(Repository/ORM/Mapper/QueryObject/Criteria/UnitOfWork=0·단일커넥션·FOR UPDATE 6·cron 33)
- [x] 명세 §3~§33 **섹션별 매핑·판정**(ORM/Repository 부재 증명)
- [x] 실 Persistence 패턴(PDO 직접·prepared·tenant·트랜잭션·FOR UPDATE·cron 배치) 성문화(§4)
- [x] Multi-Tenant(§29)·Prepared(§30)·Pessimistic Lock(§25) 준수 명시
- [x] ORM/Repository/Mapper/QueryObject/ReadReplica/Cache/Cursor 미적용 + 사유
- [x] ★`SELECT *` 277 관찰(오탐 주의·미변경)(§5)
- [x] Claude Code 규칙(§6) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 PDO-직접 Persistence 패턴의 성문화이지 ORM/Repository 이식이 아니다.

---

## 다음 Part

**CCIS Part011 — API Design Standards (REST/OpenAPI/JWT/OAuth2/Versioning/Rate Limiting/Webhook)** — ★사전 경고: 본 저장소 API = **Slim 4 + `routes.php` 문자열매핑 + `/v{NNN}`·`/api` 버전접두**(Part005/007 실측). 메인 인증=**세션토큰**(JWT 아님·`user_session`·hashToken). OpenAPI/Rate Limiting/Idempotency 는 부분/부재. Part011 도 실측→매핑→기존 API 규약 성문화(§19 URL 변경 금지).
