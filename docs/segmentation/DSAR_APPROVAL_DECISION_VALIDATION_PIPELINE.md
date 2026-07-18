# DSAR — Approval Decision Validation Pipeline (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§25 VALIDATION_PIPELINE` — 27단계(원문 순서 전사):

Envelope → Tenant → Auth Context → Actor Resolution → Target Resolution → Decision Version → Sequential State → Assignment → Claim → Lease → Authority → Delegation → Legal Entity → Org → Resource → Action → Amount → Currency → Security → SoD → CoI → Idempotency → Replay → Existing Decision → Lock Acquisition → Fencing Token → Final Context Hash.

★순서는 Versioned Policy로 저장.

## 2. 기존 구현 대조

파이프라인은 **분리·순서화된 27단계로 실존하지 않는다**. 검증은 각 핸들러의 단일 메서드 안에 인라인으로 소수 단계만 뒤섞여 수행된다.

**인라인으로 근사 실존하는 단계(순서 없음)**:
- **Tenant**(2단계): Tenant Guard(index.php WHERE tenant_id) — 유일하게 일관.
- **Auth Context/Actor Resolution**(3~4단계, 부분): `Mapping`(:36-53) api_key/session actor 확정, 미확인 fail-closed null→403(:247) · `AdminGrowth`(:197) 세션 actor.
- **Action**(16단계, 부분): `AdminGrowth`(:1321) enum 화이트리스트 · `Alerting::decideAction`(:572-599) action_json(:612).
- **Existing Decision**(24단계, 부분): `AdminGrowth`(:1327) 이미처리 409·pending 중복(:1292) · `Catalog::approveQueue`(:2397) CAS-lite · `Mapping`(:278) dedup·정족수(:287).

**부재 단계**: Envelope(1)·Target Resolution(5)·Decision Version(6)·Sequential State(7)·Assignment(8)·Claim(9)·Lease(10)·Authority(11)·Delegation(12)·Legal Entity(13)·Org(14)·Resource(15)·Amount(17)·Currency(18)·Security(19)·SoD(20)·CoI(21)·Idempotency(22)·Replay(23)·Lock Acquisition(25)·Fencing Token(26)·Final Context Hash(27) — 결정 도메인에 전면 부재.

**구조적 결함**:
- 파이프라인이 **커밋과 분리되지 않음**: `Mapping::approve`(:273 read → :288 UPDATE)가 **트랜잭션 없이**(TOCTOU) 검증-커밋을 뭉쳐 수행. §25의 "검증→(Lock/Fencing)→Commit" 경계가 없다.
- **순서가 정책이 아님**: 27단계 순서를 Versioned Policy로 저장하는 구조 없음. 인라인 검사는 코드 순서에 우발적으로 고정.
- `Alerting::executeAction`(:601-665)의 집행(:631)+UPDATE(:653) 비원자 + actor()(:33-35) 위조 → 파이프라인을 얹기 전 BLOCKED_SECURITY.

## 3. 판정

- Verdict: **PARTIAL** — 인라인 검증만(소수 단계·순서 없음), 27단계 분리·순서화·Versioned Policy 부재.
- 선행 의존: §3.2 Authority·§3.3 Delegation·§3.4 Assignment·§3.5 Sequential·Instance/Version(전부 ABSENT). 27단계 중 22단계가 이 축들 부재로 미구현.
- cover: Tenant·Actor(부분)·Action(부분)·Existing Decision(부분) 4축 근사. 나머지 = 0.

## 4. 확장/구현 방향 (설계)

- **인라인 → 파이프라인 분리**: 핸들러 내부 검사를 27개 독립 단계로 분해하고 실행 순서를 Versioned Policy(§25)로 저장 → 결정 버전별 재현/감사 가능.
- **검증-커밋 경계 신설**: `Mapping::approve` TOCTOU(:273→:288) 제거. Validation Pipeline은 커밋과 분리하되, Commit 직전 Critical 재검증(§26 무기한 재사용 금지·§32)으로 Drift 차단.
- **재사용 자산**: Tenant Guard(index.php)를 2단계 정본으로, `Mapping` actor 확정(:36-53)을 4단계(Actor Resolution) 출발점으로 확장. Idempotency 단계(22)는 Paddle 웹훅 UNIQUE(notification_id) 멱등(`Paddle.php:343-368`)을 VALIDATED_LEGACY로 일반화.
- **BLOCKED_SECURITY 선결**: `Alerting::actor()`(:33-35) 위조 제거 전에는 Security(19)/SoD(20)/CoI(21) 단계를 "통과"로 기록 금지.
- 실 구현 = 선행 6군 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
