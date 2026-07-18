# DSAR — Ledger Partition (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§16 LEDGER_PARTITION 필수 필드 (원문 전사):
- `partition id` · `decision ledger id` · `tenant id`
- `partition key` · `partition type` · `approval domain`
- `legal entity/case/resource reference`
- `partition start/end time`
- `current head id` · `current sequence`
- `entry/checkpoint count`
- `status` · `evidence`

§16 TYPE enum: `TENANT` / `TENANT_MONTH` / `TENANT_YEAR` / `APPROVAL_DOMAIN` / `LEGAL_ENTITY` / `APPROVAL_CASE` / `RESOURCE` / `CUSTOM`.

§16 불변 원칙: ★동일 Entry를 두 Partition에 Canonical 중복 금지 · Cross-reference는 허용 · **SoT Entry는 하나**.

## 2. 기존 구현 대조

- **Ledger Partition 부재.** partition key·partition type·per-partition head/sequence를 갖는 구조 0(상위 `decision_ledger` 자체가 ABSENT).
- 유사 파티셔닝 신호도 무결성 원장 맥락엔 없음: `SecurityAudit.php`(security_audit_log `:48-52`)는 tenant 스코프 단일 체인일 뿐 파티션 head/sequence를 분리하지 않는다 — lastHash(`:35-41`)는 전체 로그 `ORDER BY id DESC` 단일 최신값.
- 테넌트 격리는 존재하나(tenant_id 컬럼) 이는 §16의 `partition type=TENANT`와 개념이 다르다 — per-partition `current head id`/`current sequence`/`checkpoint count` 축적 구조가 없다.
- `partition type`(TENANT_MONTH/YEAR/APPROVAL_DOMAIN/LEGAL_ENTITY/APPROVAL_CASE/RESOURCE) → **no hits**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Partition은 §15 IMMUTABLE_LEDGER의 하위 분할이며 §17 LEDGER_ENTRY의 SoT 귀속 단위 — 상위 Ledger·Entry 모두 ABSENT, §3.1 Decision Core도 ABSENT.
- cover: **0** (partition 구조 0)

## 4. 확장/구현 방향 (설계)

- 순신규 `ledger_partition`(§16 8-TYPE) — partition key + per-partition `current head id`/`current sequence`/`entry·checkpoint count`. Partition별 Head는 §20 LEDGER_HEAD(CAS)를 파티션 스코프로 인스턴스화.
- ★SoT 불변식(§16): 동일 Entry의 Canonical 파티션은 정확히 하나 — Cross-partition 참조는 §23 LEDGER_LINK(cross-reference)로만 표현하고 Entry 복제 금지. 신설 시 (partition_id, ledger_sequence) UNIQUE + Entry.partition_id 단일 FK로 강제.
- 재사용 substrate: 테넌트 격리(tenant_id 편재)와 서버UTC(`Db.php:438`)를 partition start/end time 기준으로 차용. 파티션 커서 갱신의 원자성은 트랜잭션 PDO(`Omnichannel.php:404-415`)·SKIP LOCKED(`:405,429-441`) 재사용.
- 선행 조립: Decision Core(§3.1) → IMMUTABLE_LEDGER(§15) → 본 Partition. Ledger 부재 상태에서 파티션만 신설 = 공회전 → 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
