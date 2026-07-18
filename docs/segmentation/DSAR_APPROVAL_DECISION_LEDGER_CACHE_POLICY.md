# DSAR — Ledger Cache Policy (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§65 `LEDGER_CACHE_POLICY` — ★**Cache ≠ SoT**(캐시는 절대 진실원이 아님). 원장 Head/Sequence는 강한 일관성으로만 판정.

### Cache Key (전 구성요소 — 원문 전사)
`tenant` · `ledger` · `partition` · `head version` · `current sequence` · `entry id` · `decision record id` · `case id` · `sequence range` · `integrity version` · `legal hold state` · `retention state`.

### 캐시 인식 차원 (Cache-aware, 원문 전사)
- **Tenant-aware** · **Head-version-aware** · **Sequence-aware** · **Immutable Entry Cache**(불변 Entry만 캐시 가능).

### 무효화 (Invalidation)
- **Append / Checkpoint / Correction / Supersession / Legal Hold / Retention 후 즉시 Invalidation.**
- **Conflict(§45) / Gap(§46) 감지 시 캐시 우회**(강제 재조회).
- **Verification(§48~50) 실패 시 캐시 폐기.**
- ★**Ledger Head = 강한 일관성** — 캐시된 Head로 Append 판정 금지.

## 2. 기존 구현 대조

- **원장 캐시 부재 → ABSENT.** 캐시 키의 필수 구성요소인 `ledger`·`partition`·`head version`·`current sequence`·`entry id`·`legal hold state`·`retention state`가 전부 부재 엔티티(§15~§20·§36~§37) — 캐시할 불변 대상 자체가 없다.
- 유일 append-only 자산 `SecurityAudit`는 Head를 매 조회 `ORDER BY id DESC`로 직접 계산(`SecurityAudit.php:35-41`) — Head-version 캐시 계층이 없으며 CAS도 없어 캐시화 시 오히려 stale-Head Fail-open 위험.
- 리포 캐시 인프라(데이터 플랫폼/i18n 지연로드)는 존재하나 **원장 Head/Sequence/Entry 캐시로는 no hits**.

## 3. 판정

- Verdict: **ABSENT** (Ledger Cache 미구현)
- 선행 의존: 캐시 키 구성요소 대부분이 부재 엔티티(§15 Ledger·§16 Partition·§20 Head·§19 Sequence·§36 Retention·§37 Legal Hold) → **BLOCKED_PREREQUISITE**.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규**: Immutable Ledger(§15) 신설과 동반해 위 Cache Key 전 구성요소를 포함한 캐시 도입. **부분 키(head version / sequence 누락) 절대 금지** — stale Head는 중복 Sequence·체인 분기(Fail-open) 위험.
- ★**Cache ≠ SoT 강제**: Ledger Head·Current Sequence는 **강한 일관성 경로에서만** 읽어 Append 판정(§20 CAS·Fencing과 결합). 캐시는 **불변 Entry 조회(§17)** 와 읽기 Stream(§52 Replay 조회)에만 한정.
- **전 이벤트 Invalidation**: Append/Checkpoint/Correction/Supersession/Legal Hold/Retention 후 즉시 무효화. **Conflict(§45)/Gap(§46) 시 캐시 우회**·**Verification 실패 시 폐기**(무후퇴·Fail-closed).
- 재사용 substrate: SecurityAudit 불변 Entry(INSERT/SELECT만 `:8`)는 Immutable Entry Cache 대상 후보(단 Head는 강한 일관성 유지). 서버UTC(`Db.php:438`·`SecurityAudit.php:24`)로 캐시 timestamp 위조 차단.
- Golden Rule(Extend): 기존 캐시 인프라를 재사용하되 원장 캐시는 **단일 키 규격**으로 통일(중복 캐시 엔진 금지).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
