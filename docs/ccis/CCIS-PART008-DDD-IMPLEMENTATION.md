# GeniegoROI Claude Code Implementation Specification

# CCIS Part008 — Domain-Driven Design (DDD) Implementation Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

DDD 구현 표준(Aggregate·Entity·Value Object·Domain Event·Repository·Factory·Specification·Policy·
Bounded Context·ACL·Shared Kernel)을 수립한다.

> ★**성격(Part001~007 과 동일·Part007 심화)**: 사용자가 Part008 명세를 제공했으나 **그대로 따르지 않았다.**
> Part007 이 실측했듯 이 저장소는 **Slim 4 + 평면 `Handlers/` transaction-script** 이며 **Domain 계층
> 자체가 부재**하다. 본 Part 는 그 부재를 **DDD 구성물 수준으로 재확인**하고, 실재하는 대응물을
> 성문화한다. 명세의 DDD apparatus 이식은 **103핸들러 전면 재작성 = Golden Rule 위반**이다.
> 문서 차수(코드 무변경).

---

## 2. 실측 — DDD 구성물 존재 여부

| DDD 구성물 | 명세 요구 | **실측(정본)** |
|-----------|-----------|----------------|
| Aggregate / Aggregate Root | 트랜잭션 경계·Root만 수정 | **0개** — 데이터=PDO row/연관배열 |
| Entity(Identity+Business Logic) | Rich Domain Model | **0개** — Entity 클래스 없음 |
| Value Object(Money/ROI/Email…) | Immutable·Equals·Validation | **0개**(`Money` 등 0) — 스칼라 직접 |
| Domain Event | 과거형·최소데이터 | **0개** — Event/Dispatcher 부재 |
| Repository Interface | Aggregate 단위·SQL 은닉 | **0개** — 핸들러 `Db::pdo()` 직접 인라인 SQL |
| Factory | Aggregate 생성 책임 | **0개** |
| Specification | 복잡조건 분리 | **0개** |
| Policy | Business Rule 캡슐화 | **1개**(`Genie\PlanPolicy` — 플랜 정책) |
| Domain Exception | 의미 명확한 예외 | **0개**(custom) — `\Throwable`/`RuntimeException` 직접, 핸들러가 catch→JSON error |
| Bounded Context 격리 | Context별 독립 Model/DB | **논리적**(핸들러 그룹) — 물리적 단일 DB `geniego_roi` 공유 |
| Context Mapping / ACL | REST/Event/ACL | **0개**(ACL 클래스 없음) — 외부연동은 핸들러 내 직접 변환 |
| Shared Kernel(TenantId 등) | 공유 VO | **0개** — `TenantId`=string 직접(Part005) |
| Ubiquitous Language | 일관 용어 | ★**부분 준수** — 도메인 용어가 핸들러/테이블명에 일관(Attribution·Campaign·OrderHub·Rollup·Wms·CRM) |
| Domain Test(DB 없이) | Aggregate/VO/Policy 테스트 | **부재**(PHPUnit/Pest 없음) |

> ★**판정: Domain 계층 부재는 "기능 오류"도 "누락"도 아니라 "의도적 아키텍처 선택"이다.**
> - **기능 오류 아님**: 앱은 정상 동작한다(본 세션 운영/데모 배포·라이브 검증 완료). DDD 구성물이 없어서
>   깨지는 기능은 없다. transaction-script 는 그 자체로 완결된 정상 패턴이다.
> - **누락 아님**: DDD 는 필수 컴포넌트가 아니라 **대안 아키텍처 스타일**이다. "빠뜨린 것"이 아니라
>   "채택하지 않은 것"이다. DDD 이식은 103핸들러 재작성 = Golden Rule 위반이므로 **고칠 대상이 아니다.**
> - ★**단, 트레이드오프는 실재(정직)**: 규칙이 핸들러에 분산·중복되기 쉽고, DB 없는 단위테스트가 어렵고,
>   일부 핸들러가 비대(God-object: `ChannelSync` ~5,500줄·`ClaudeAI` ~2,700줄)하다. 이 스타일은
>   **무음 실결함이 숨기 쉬운 조건**을 만든다 — 그래서 본 세션에 게이트(PHPStan)가 그 안에서 실제
>   기능 버그 4건(undefined 변수 2·죽은 API 실패감지 1·중복 라우트키 5)을 잡아 고쳤다.
> - **올바른 대응 = 아키텍처를 갈아엎지 말고, 게이트로 그 안의 실결함을 계속 잡는 것**(Part004 PHPStan).

---

## 3. 실 대응물 — DDD 없이 도메인 로직이 사는 곳

Domain 계층은 없지만 도메인 **로직**은 존재한다. 실제 위치:

- **비즈니스 규칙 = 핸들러 정적 메서드 인라인**(transaction-script). 상태 전이·검증·계산이 엔드포인트 메서드에 응집.
- **de-facto "Domain Service"류 핸들러**(명세 §16 의 실 대응): `Mmm`(마케팅믹스·ROI frontier `T*`)·`Decisioning`·`RuleEngine`(규칙엔진)·`PriceOpt`(가격최적화·시뮬)·`AttributionEngine`(어트리뷰션·markov). 도메인 계산을 중앙화하나 DDD Domain Service 형태는 아님.
- **유일한 Policy류**: `Genie\PlanPolicy`(플랜/구독 정책). 그 외 규칙은 인라인 or `RuleEngine`.
- **TenantId = string**(Shared Kernel VO 아님). 격리는 값이 아니라 **전 쿼리 `tenant_id` 조건**으로 강제.
- **Bounded Context = 논리적 핸들러 그룹**(Order/Shipment/Campaign/CRM/Wms/ROI…), 단 **단일 DB 공유**·Context 간 직접 `Db::pdo()` 조회 허용(물리적 격리 없음).
- **Ubiquitous Language**: 용어(Order·Shipment·ROI·Reward·Campaign)가 테이블/핸들러/라우트에 일관 사용 — 개념 어휘는 있으나 도메인 객체로 인코딩되진 않음.

---

## 4. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 DDD 원칙(Rich Model/Aggregate/불변성/Framework 독립) | **대부분 미적용** | 계층 부재. 단 Multi-Tenant·Ubiquitous Language(용어일관)는 부분 준수 |
| §4 Bounded Context | **논리적만** | 핸들러 그룹=논리 컨텍스트. 물리 격리·독립 Model 부재 |
| §5 Context Mapping/ACL | **미적용** | 컨텍스트 간 `Db::pdo()` 직접. ACL 없음 |
| §6~§9 Aggregate/Root/Entity/생명주기 | **미적용** | 0개. 상태전이=핸들러 메서드 + DB status 컬럼 |
| §10~§11 Value Object/Money | **미적용** | 0개. 금액=int/float·통화=string |
| §12~§13 Domain Event/발행/Kafka | **미적용** | Event/Kafka 부재(Part006/007). 실시간=BroadcastChannel/폴링/SSE |
| §14~§15 Repository Interface/구현 | **미적용** | `Db::pdo()` 직접. Repository 신설=93핸들러 재작성 |
| §16 Domain Service | **부분(대응물)** | Mmm/Decisioning/RuleEngine/PriceOpt/AttributionEngine 가 도메인계산 중앙화(단 transaction-script) |
| §17 Factory | **미적용** | 생성=생성자/배열. Factory 클래스 0 |
| §18 Specification | **미적용** | 조건=인라인 if. Specification 0 |
| §19 Policy | **부분** | `PlanPolicy` 1개. 나머지=인라인/RuleEngine |
| §20 Domain Exception | **미적용** | custom 0. `\Throwable`+JSON error |
| §21 Ubiquitous Language | **부분 준수** | 용어 일관(테이블/핸들러명) |
| §22 Shared Kernel | **미적용** | 공유 VO 0. TenantId=string |
| §23 ACL | **미적용** | 외부변환=핸들러 직접(Logistics·NaverSms·ClaudeAI) |
| §24~§25 Validation/Rule 위치 | **부분** | 검증=핸들러 early-return(Fail Fast). VO/Entity 계층 검증 부재 |
| §26 Domain Test | **미적용** | PHPUnit/Pest 부재(Part004) |
| §27 Multi-Tenant Domain | **★강하게 준수** | 전 쿼리 `tenant_id`·격리 우회 금지(헌법). 단 TenantId=string |
| §28 AI/Domain 분리 | **★준수** | AI(`ClaudeAI`)=추천/분석/예측만. **비즈니스 결정은 핸들러/규칙이 수행**(053 게이트웨이·헌법 V4 — 근거없는 자동집행 금지·승인정책) |
| §29 Laravel / §30 Symfony | **대상 없음** | Slim 4 |
| §32 PHP(strict_types/readonly/Enum/Interface) | **부분** | strict_types 93%. readonly/Enum/Interface 거의 미사용 |
| §33 검증(Domain/Architecture Test) | **부분** | phpstan·composer validate 실동작. Domain/Architecture Test 부재 |

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Aggregate/Entity/Value Object/Domain Event/Repository/Factory/Specification/ACL/Shared Kernel 전면 도입** — 안 함. Domain 계층 신설 = 103핸들러 재구조화 = Golden Rule 위반·거대 회귀표면. transaction-script 는 의도적 유지.
2. **Bounded Context 물리 격리(Context별 DB/Model)** — 안 함. 단일 `geniego_roi` DB + `tenant_id` 격리가 정본. Context DB 분리는 인프라 재설계.
3. **Kafka Event-Driven·Domain Event 발행** — 안 함(Part006/007). 인프라 부재.
4. **Domain Exception 체계·Specification·Factory** — 안 함. 인라인 검증/생성이 정본.
5. **Doctrine/Eloquent Mapper 분리(§29/§30)** — 대상 없음(ORM 미사용·PDO 직접).

★**준수하는 실 원칙**(명세 정신 중 실재): **Multi-Tenant 격리(§27)** · **AI/Domain 분리(§28 — AI는 추천/분석, 결정은 규칙·승인정책)** · **Ubiquitous Language(용어 일관)** · **Fail Fast 검증**.

---

## 6. Claude Code 구현 규칙

1. 도메인 로직은 **핸들러 메서드**(또는 기존 도메인핸들러 Mmm/Decisioning/RuleEngine/PriceOpt/AttributionEngine 확장)에 작성. Aggregate/Entity/Repository 계층 신설 금지.
2. ★**전 쿼리 `tenant_id` 격리**(§27·헌법). 격리 우회 금지.
3. **AI는 추천/분석/예측만**(§28). 비즈니스 결정·자동집행은 규칙 + 승인정책(헌법 V4 — 근거·신뢰도 표시·근거없는 결론 금지).
4. **용어 일관**(Ubiquitous Language) — 기존 테이블/핸들러 용어 재사용. 동일개념 다른이름 금지.
5. 플랜/구독 규칙은 `PlanPolicy` 확장. 규칙엔진은 `RuleEngine`. 중복 엔진 신설 금지(헌법 V4 §16).
6. Aggregate/VO/Repository/Factory/Specification/Domain Event/Kafka 를 "명세에 있다"는 이유로 도입하지 않는다.

---

## 7. Completion Criteria

- [x] DDD 구성물 존재여부 **실측**(Aggregate/Entity/VO/Repository/Factory/Specification/Exception/ACL = 0, Policy 1)
- [x] 실 대응물 성문화(핸들러 인라인 + de-facto 도메인핸들러 + PlanPolicy + TenantId string)
- [x] 명세 §3~§33 **섹션별 매핑·판정**
- [x] Bounded Context(논리적·단일DB)·Ubiquitous Language(용어일관) 실측
- [x] Multi-Tenant(§27)·AI/Domain 분리(§28) 준수 명시
- [x] 의도적 미적용 + 사유(§5)
- [x] Claude Code 규칙(§6)
- [x] `composer validate`·`phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 Domain 계층 부재를 DDD 구성물 수준으로 증명하고 실 대응물을 성문화한 것이지, DDD 이식이 아니다. **다음 Part009(Database/PostgreSQL)는 ★DB 가 MySQL+SQLite(PostgreSQL 아님)이므로 동일하게 실측·정정할 것.**

---

## 다음 Part

**CCIS Part009 — Database Design & PostgreSQL Standards** — ★사전 경고: 본 저장소 DB = **MySQL 8 + SQLite 폴백**(PostgreSQL·UUID·파티셔닝·RLS **부재**·Part006 실측). 마이그레이션은 172차 정지 후 핸들러 `ensureTables` 자가치유. Part009 도 실측→PostgreSQL 부재증명→MySQL/SQLite+ensureTables+tenant_id 격리 성문화로 처리(PostgreSQL/RLS 이식 금지).
