# GeniegoROI Claude Code Implementation Specification

# CCIS Part007 — Architecture Pattern & Project Structure

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

소프트웨어 아키텍처·프로젝트 구조 표준을 수립한다.

> ★**성격(Part001~006 과 동일)**: 사용자가 Part007 명세(DDD·Hexagonal·CQRS·Event-Driven·Kafka·
> Modules·Aggregate·ValueObject·Repository·Command/Query Handler)를 제공했으나 **그대로 따르지 않았다.**
> 실측 결과 이 저장소의 실 아키텍처는 **Slim 4 + 평면 `Handlers/`(정적 메서드) + `routes.php` 문자열
> 매핑 = transaction-script(핸들러=엔드포인트) 패턴**이며, 명세의 계층형 DDD 아키텍처는 **전부 부재**다.
> 그 apparatus 이식은 **103개 핸들러 전면 재작성 = Golden Rule("Replace 가 아니라 Extend") 위반**이다.
> Part001 §4 에 따라 **실측 → 매핑 → 부재 증명 → 실재하는 아키텍처를 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 아키텍처

| 구성물 | 명세 요구 | **실측(정본)** |
|--------|-----------|----------------|
| 최상위 구조 | `Modules/{Order,…}/{Domain,Application,Infrastructure,Presentation,…}` | **`src/Handlers/`(103) + `src/Utils/` 평면** (Modules/Domain/Application/Presentation 디렉터리 **0**) |
| Repository | `interface OrderRepository` + `PostgresOrderRepository` | **0개**. 핸들러 **93개가 `Db::pdo()` 직접** — SQL 인라인 |
| Aggregate Root / Entity | Aggregate 중심·Child 직접수정 금지 | **0개**. 데이터=연관배열/PDO row |
| Value Object(Money/Email/ROI…) | Immutable·Equals·Validation | **0개**. 스칼라/배열 직접 사용 |
| CQRS(Command/Query Handler) | Command≠Query 분리 | **0개**. 한 핸들러 메서드가 조회·변경 겸함 |
| Domain Event / Dispatcher | 과거형 이벤트·Kafka 흐름 | **0개**. Event/Kafka 참조 0 |
| Application/Use Case 계층 | Transaction·Authorization·Use Case | **부재**. 트랜잭션·인가·비즈니스로직이 핸들러 메서드에 통합 |
| Presentation 계층 | Controller/Request/Response/Resource | **부재**. 핸들러가 Slim `Request`/`Response` 직접 사용(`self::json` 1985·`TemplateResponder::respond` 338) |
| Infrastructure 계층 | Framework=Infrastructure 분리 | **부재**. Framework(Slim)·DB·외부API 가 핸들러에 직접 결합 |
| AI Module | `AI/{Providers,Prompt,Embedding,Vector,LLM,Agents}` | **단일 게이트웨이** `ClaudeAI::gateway`/`complete`(053 정본) — 별도 Module 아님 |
| Multi-Tenant(§25) | 모든 Repository 테넌트 스코프 | ★**강하게 준수** — `tenantOf`(34)·`X-Tenant-Id`(27)·전 쿼리 `tenant_id` 조건(헌법) |
| Framework 독립성 | Framework 교체 가능 | **아니오**(Slim 직접 결합) — 의도적 단순성 |
| Kafka/Redis | Event/Cache 인프라 | **부재**(Part006 실측) |

**결론**: 실 패턴 = **transaction-script**. 각 핸들러 클래스의 정적 메서드가 `요청 파싱 → 테넌트 체크 → `Db::pdo()` 인라인 SQL → 비즈니스 로직 → `self::json` 응답`을 **한 곳에서** 수행한다. 계층 분리(DDD)가 아니라 **엔드포인트 단위 응집**이다.

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §4 원칙(Clean/Hexagonal/CQRS/Event/Repository/Aggregate/VO/DIP) | **대부분 미적용** | 계층·패턴 부재. 단 Multi-Tenant·Fail Fast(가드 early-return)·Secure by Default(auth 미들웨어·RBAC)는 준수 |
| §5 Module 최상위 구조 | **미적용** | 평면 `Handlers/`. 기술별 최상위 금지 규칙(`Controllers/` 등)도 무관(그런 구조도 없음) |
| §6 Module 내부 계층 | **미적용** | 부재 |
| §7~§11 Domain(Entity/Aggregate/VO/DomainService) | **대상 없음** | Domain 계층 자체 부재 |
| §12 Repository | **미적용** | `Db::pdo()` 직접(DAO 조차 아님·인라인). Repository 신설은 93핸들러 재작성 |
| §13 Application Layer | **미적용** | Use Case 계층 부재(핸들러 통합) |
| §14~§16 CQRS/Command/Query Handler | **미적용** | 분리 부재 |
| §17 Presentation Layer | **부분** | 핸들러가 Presentation 역할 겸함(별도 계층 아님). Request/Response=Slim 직접 |
| §18 Infrastructure Layer | **미적용** | 분리 부재. DB/외부API 가 핸들러 결합 |
| §19 Shared Module | **부분** | `src/Utils/`·`Genie\{Db,Crypto,Mailer,NotifyEngine}` 공용. 계층적 Shared 아님 |
| §20 Contracts(DTO/Event Schema/OpenAPI) | **미적용** | DTO/Event Schema 부재 |
| §21 AI Module | **부분(핵심 준수)** | ★AI 단일 통과점 `ClaudeAI::gateway`(053·감사/계측 일원화)는 명세 "AI 분리" 정신과 정합. 단 DDD Module 형태 아님 |
| §22~§24 Event-Driven/Kafka/Adapter | **미적용** | Event/Kafka 부재. 유일한 Outbound Adapter류=`ClaudeAI`(LLM)·`NaverSms`·`Logistics`(carrier) 가 핸들러 내 정적 |
| §25 Multi-Tenant | **★강하게 준수** | 전 쿼리 `tenant_id`·`tenantOf`·`X-Tenant-Id`. 헌법 "테넌트 격리 절대" |
| §26 Transaction=Application | **N/A** | Application 계층 없음. 트랜잭션은 핸들러 내(`$pdo->beginTransaction`) |
| §27 Cache | **대상 없음** | Redis/캐시 계층 부재(Part006) |
| §28 Queue | **대상 없음** | Queue 부재. 배치=cron(`bin/*_cron.php`) |
| §29 External API=Adapter | **부분** | Adapter 계층 아니나 외부호출은 핸들러/전용 클래스(Logistics·NaverSms·ClaudeAI)에 응집 |
| §30 Laravel / §31 Symfony | **대상 없음** | Slim 4 |
| §33 PHP(PSR-4/12·Typed·readonly·Enum·Interface) | **부분** | PSR-4·strict_types 93% 준수. readonly/Enum/Interface=거의 미사용(Part005) |
| §34 검증(Pest/Architecture Test) | **부분** | phpstan·composer validate 실동작. Pest/Architecture Test 부재 |

---

## 4. 확립된 실 아키텍처 (신규 코드가 따를 정본)

**패턴 = Transaction-Script(엔드포인트-핸들러).** 신규 기능은 이 패턴을 확장한다:

- **핸들러**: `src/Handlers/{Name}.php` → `class {Name}` → `public static function {action}(Request,Response,array): Response`. `routes.php` 문자열 매핑 등록.
- **데이터 접근**: `Db::pdo()` 로 PDO 직접(prepared statement). Repository 계층 신설하지 않는다. ★**모든 쿼리에 `tenant_id` 조건**(§25·헌법).
- **응답**: `self::json($res, [...], $status)` 또는 `TemplateResponder::respond/json`.
- **테넌트**: `self::tenantOf($req)`(또는 핸들러별 tenant 해석) — `X-Tenant-Id` 미들웨어 주입. **요청시점 tenant 해석에 전역 상태 사용 금지**(act-as 하이재킹 트랩).
- **AI**: 반드시 `ClaudeAI::gateway()`/`complete()` 단일 통과점 경유(053 — 감사 `ai_call_log`·quota·BYO). 새 전송 경로 신설 금지.
- **외부연동**: 채널/캐리어/발송은 전용 정적 클래스(`Logistics`·`NaverSms`·`ChannelSync`)에 응집. 자격증명=`Crypto` 복호(Part006).
- **트랜잭션**: 핸들러 내 `beginTransaction/commit/rollBack`(Application 계층 없음). 다단계 쓰기는 트랜잭션으로 원자화.
- **가드**: Fail Fast — 입력/인가 검증 early-return. auth 미들웨어 + RBAC(role/scope).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **DDD 계층(Modules/Domain/Application/Infrastructure/Presentation)** — 안 함. 103핸들러를 계층형으로 재구조화 = 전면 재작성 = Golden Rule 위반·거대 회귀표면. transaction-script 는 이 규모/팀에서 **의도적으로 유지**하는 응집 패턴.
2. **Repository/Aggregate/Value Object/Domain Service** — 안 함. Domain 계층 자체 부재. `Db::pdo()` 직접이 정본.
3. **CQRS(Command/Query 분리)·Command/Query Handler** — 안 함. 핸들러 메서드가 조회·변경 겸함.
4. **Event-Driven/Domain Event/Kafka/Dispatcher** — 안 함. 인프라(Kafka) 부재(Part006). 크로스탭/실시간은 프론트 BroadcastChannel·폴링·SSE.
5. **Hexagonal Port/Adapter 계층** — 안 함. 외부연동은 핸들러/전용 클래스 응집(경계 명시적 Port 아님).
6. **Laravel/Symfony 구조·Pest/Architecture Test·readonly/Enum 전면 채택** — 안 함(Slim·Part004/005 정합).

★**준수하는 실 원칙**(명세 정신 중 실재): **Multi-Tenant 격리(§25)** · **AI 단일 게이트웨이(§21 정신)** · **Fail Fast/Secure by Default(§4)** · **PSR-4·strict_types**.

---

## 6. Claude Code 구현 규칙

1. **패턴 준수**: 신규 = `Handlers/{Name}` 정적 메서드 + `routes.php` 등록. DDD 계층 신설 금지.
2. ★**모든 쿼리 `tenant_id` 격리**(§25·헌법 — 테넌트 격리 절대).
3. **AI 호출은 `ClaudeAI::gateway`** 단일 통과점만(053). 새 전송 경로·중복 엔진 금지(헌법 V4 §16).
4. **중복 금지**: 착수 전 grep 전수 — 동일 핸들러/라우트/기능 있으면 확장(신설 금지).
5. **트랜잭션은 핸들러 내**. 다단계 쓰기 원자화. 외부API 는 루프 내 N+1 금지(285차 502 트랩).
6. Repository/Aggregate/CQRS/Event/Kafka 를 "명세에 있다"는 이유로 도입하지 않는다.

---

## 7. Completion Criteria

- [x] 현행 아키텍처 **실측**(transaction-script·핸들러/routes.php·계층 클래스 0)
- [x] 명세 §4~§34 **섹션별 매핑·판정**
- [x] 실 아키텍처(패턴·데이터접근·테넌트·AI게이트웨이·트랜잭션) 성문화(§4)
- [x] 의도적 미적용 + 사유(§5) — DDD/Hexagonal/CQRS/Event/Kafka 부재 근거
- [x] 준수 원칙 명시(Multi-Tenant·AI Gateway·Fail Fast·PSR-4)
- [x] Claude Code 규칙(§6)
- [x] `composer validate`·`phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 transaction-script 아키텍처의 성문화이지, 가상 DDD 스택 이식이 아니다. **다음 Part008(DDD Implementation)은 Domain 계층 자체가 부재하므로 동일하게 부재 증명·기존 패턴 성문화로 처리할 것.**

---

## 다음 Part

**CCIS Part008 — Domain-Driven Design (DDD) Implementation Standards** — ★사전 경고: 본 저장소에 Domain 계층·Aggregate·Value Object·Repository·Domain Event·Bounded Context **전부 부재**(본 Part §2 실측). Part008 도 실측→부재증명→transaction-script 성문화. DDD 이식(Golden Rule 위반) 금지.
