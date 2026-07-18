# DSAR — Ledger Duplicate Implementation Audit (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§62 `LEDGER_DUPLICATE_IMPLEMENTATION_AUDIT` — 착수 전 동일 Ledger/Append-only/해시체인/감사 관심사의 중복 구현 실존 열거(중복 신설 금지·기존 확장). ★탐지 대상: **여러 Ledger·이중 진실원·Upsert Entry·Sequence Reset/Renumbering·Generic Cleanup·Manual SQL Mutation·Application Role UPDATE**. ★규율: "해시체인 존재 ≠ tamper-evident"(장식을 원장으로 오인 금지).

## 2. 기존 구현 대조 — 실존 열거 (능력 기반)

### 2.1 유일 실 무결성 자산 (CANONICAL 패턴)

| 자산 | 근거(허용목록) | §62 태그 |
|---|---|---|
| **`SecurityAudit`(security_audit_log)** | `:48-52`(테이블)·`:8`(INSERT/SELECT만·UPDATE/DELETE 0)·`:27`(hash=sha256 prev\|tenant\|actor\|action\|details\|created_at)·`:39`(GENESIS)·`:35-41`(lastHash `ORDER BY id DESC`·CAS 없음)·`:56-68`(verify=hash_equals+prev_hash 이중검증)·배선 `UserAuth.php:4046`·`Compliance.php:162` | **CANONICAL 패턴(KEEP_SEPARATE·확장)** — 단 감사 트레일이지 decision ledger 아님·논리 seq/Head-CAS/tx경계/gap검출 미달 |

### 2.2 append-only 관례 (해시/verify 없음 — CONSOLIDATION)

| 자산 | 근거(허용목록) | §62 태그 |
|---|---|---|
| `audit_log` | `Db.php:434-440,540-546`(append-only 관례·해시체인/verify 없음·DB 미강제) | **CONSOLIDATION_REQUIRED** |
| `pm_audit_log` | `PM/Shared.php:129-148`(append-only 관례·해시/verify 없음) | **CONSOLIDATION_REQUIRED** |
| `menu_audit_log.hash_chain` | `AdminMenu.php:123-143,200-218`(체인 **쓰기만**·**verify() 0**·289차 정정) | **장식(CONSOLIDATION)** — tamper-evident 아님 |

### 2.3 ★장식 (원장으로 오인 금지 — 무결성 착시)

| 자산 | 근거(허용목록) | 실체 |
|---|---|---|
| `schema_migrations.checksum` | `Migrate.php:50,63-64` | 저장만·**비교 미실행**(무결성 검증 없음) |
| `journey_decision_log` | `JourneyBuilder.php:60,74,1192` | **in-place UPDATE**(append-only 아님·과거 소실) |

### 2.4 재사용 substrate (Platform primitive — 중복 아님)

| Primitive | 근거(허용목록) | 역할 |
|---|---|---|
| Outbox `omni_outbox` | `Omnichannel.php:390-448`(리스 `:395`·SKIP LOCKED `:405,429-441`) | Outbox Binding(§39) substrate |
| Inbox dedup(paddle UNIQUE) | `Paddle.php:108,146,343-368` | Idempotency(§40) substrate |
| MediaHost CAS Evidence Store | MediaHost `:88-90,93-96,100-102,211` | Evidence/Redaction substrate |
| SHA-256 3개소 | MediaHost `:93`·Migrate `:50`·SecurityAudit `:27` | 무결성 다이제스트 substrate |

## 3. 판정

- Verdict: **CONSOLIDATION_REQUIRED** (동일 감사/append 관심사 다중 산발 — 신설 금지·기존 통합)
  - **CANONICAL 패턴**: SecurityAudit append-only 해시체인+verify(확장 대상).
  - **CONSOLIDATION**: audit_log·pm_audit_log·menu_audit_log(해시/verify 결여 → 정본 SecurityAudit 패턴으로 통합).
  - **장식(원장 아님)**: schema_migrations.checksum(비교 미실행)·journey_decision_log(in-place UPDATE).
  - **재사용 substrate**: omni_outbox·paddle dedup·MediaHost CAS·SHA-256(중복 신설 금지·Ledger가 위에 적재).
- 선행 의존: 통합의 상위 골격(Immutable Decision Ledger·Entry)이 §3 부재 → **BLOCKED_PREREQUISITE**.
- cover: 감사/append 관심사 다수 실존 · **단일 Immutable Ledger 정본 = 0**.

## 4. 확장/구현 방향 (설계)

- **중복 신설 절대 금지**(레지스트리): 착수 전 grep 전수 완료 — 위 자산이 정본 후보/통합 대상.
- **정본 승격**: `SecurityAudit`(CANONICAL 패턴)을 Ledger Entry append-only 계약(§24)·Ordering/Completeness/Consistency 검증(§48~50)으로 확장. **Head-CAS(§20)·논리 Sequence(§19)·Transaction Boundary(§38)를 신설**로 보강(현행 미달).
- **장식 제거/보강**: `menu_audit_log`·`schema_migrations.checksum`은 verify/비교가 없어 무결성을 보증하지 못함 — 원장으로 오인 금지, 실제 무결성이 필요하면 정본 경로로 흡수.
- **이중 진실원 차단**: Legacy(journey_decision_log in-place)와 Canonical Ledger 병존 금지 — §66 Migration으로 backfill 후 Legacy는 참조 전용.
- 무후퇴: 통합은 기존 감사 write 동작을 회귀 없이 Adapter 뒤로 흡수(§66 Regression Gate 연계).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_FUNCTION_REGRESSION_GATE]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
