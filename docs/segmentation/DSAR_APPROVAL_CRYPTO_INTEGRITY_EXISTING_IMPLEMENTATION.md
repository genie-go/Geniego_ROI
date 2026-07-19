# DSAR — Cryptographic Hash Chain & Tamper Detection: 기존 구현 전수조사 (ⓑ · GROUND_TRUTH)

> EPIC **06-A-03-02-03-02** · 289차 후속 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 2 에이전트 병렬 grep+정독 · 읽기 전용 · 코드 변경 0.
> ★ **이 문서의 file:line 인용목록 = 하위 per-entity DSAR·ADR의 유일 허용 인용원(GROUND_TRUTH allowlist).** 여기 없는 새 file:line 인용 금지(날조 방지).
> 규율: "해시체인 존재 ≠ tamper-evident" · "Canonicalization 없는 SHA-256도 §5.3/§5.4 위반".

## 0. 결론 (Verdict up front)

**Cryptographic Integrity Governance(Registry/Policy/Definition/Version/Profile·Canonicalization·Field Set·Projection·Digest Envelope·Chain/Head/Checkpoint Digest·Verification Engine·Tamper Incident·Rotation·Migration) 부재.** 그러나:
1. **★유일 실 Hash Chain + verify = `SecurityAudit::verify`** — SHA-256 append-only·prev_hash 체인·GENESIS·tenant preimage·**재계산 가능한 created_at**·`hash_equals` 이중검증. §66=**CANONICAL_LEDGER_CHAIN_DIGEST 패턴(확장·KEEP_SEPARATE)**.
2. **★그러나 그 실 체인조차 Canonicalization 부재** — preimage=raw `|`-concat + `json_encode(details,UNESCAPED_UNICODE)`(ksort/NFC/Decimal/Timestamp-precision 정규화 없음) → §5.3(Canonicalization)·§5.4(문자열 임의연결) **위반**. Head-CAS 없음·verify에 tenant 술어 없음·`catch` no-op fail-open.
3. **★Weak-algorithm 무결성 사용 = 0(중대 긍정)** — Tamper/Chain 경로에 MD5/SHA-1/CRC **전무**. 모든 md5/sha1/crc는 비보안(ID/캐시/버킷) 또는 벤더 프로토콜 강제(OAuth1.0a·TOTP·CRAM-MD5).
4. **장식 오인 금지**: `menu_audit_log.hash_chain`(verify 0·preimage `ts` 미저장)·`schema_migrations.checksum`(저장만)·`journey_decision_log`(in-place UPDATE).
5. **선행 §3.1 Immutable Ledger·§3.2 Decision Foundation = 설계전용·코드/테이블 0**(591 DSAR_APPROVAL_* 전부 BLOCKED_PREREQUISITE/cover0) → **해시체인이 결합할 Ledger Entry·Snapshot·Evidence·Audit·Outbox 대상이 없어 공회전** → 이 블록 구현 판정 **BLOCKED_PREREQUISITE**. 단 Platform substrate 실재로 실 엔진은 "발명 아닌 조립".

## 1. 선행조건 재검증 (§3)

| 군 | 판정 | 근거(GROUND_TRUTH) |
|---|---|---|
| §3.1 Immutable Ledger Foundation | **ABSENT(설계전용)** | `approval_decision_ledger`·`ledger_entry`·`ledger_head`·`ledger_checkpoint`·`ledger_correction`·`ledger_supersession` CREATE/ensureTables **0히트**. 46 `DSAR_APPROVAL_DECISION_LEDGER_*` 전부 `코드 변경 0·설계 명세`·verdict BLOCKED_PREREQUISITE·cover0 |
| §3.2 Decision Foundation | **ABSENT(설계전용)** | `DecisionRecord`/`DecisionCommand`/`DecisionCommit`/`decision_snapshot`/`decision_evidence`/`decision_outbox` 클래스·테이블 0히트. `Decisioning.php:36-60`=ad-insights ingest(무관). `DSAR_APPROVAL_DECISION_RECORD.md` verdict ABSENT·cover0 |
| §3.3 Platform Security Foundation | **PRESENT(재사용 substrate)** | §3 상세 |

## 2. Crypto/Digest 개념별 판정 (GROUND_TRUTH 표)

| # | file:line | 용도 | 알고리즘 | Canonicalize? | Verify(재계산+비교)? | §66 태그 |
|---|---|---|---|---|---|---|
| 1 | `SecurityAudit.php:24` | 서버 UTC 시각 `gmdate('Y-m-d H:i:s')` | — | — | — | 재사용 substrate(Trusted Time) |
| 2 | `SecurityAudit.php:27` | security_audit_log 체인 **write** preimage | SHA-256 | ❌ raw `|`-concat(prev·tenant·actor·action·`json_encode(details,UNESCAPED_UNICODE)`·now) | — | LEGACY_STRONG_HASH→**MIGRATION_REQUIRED(Canonicalization 보강)** |
| 3 | `SecurityAudit.php:31` | preimage `$now`를 `created_at`에 명시 저장(재계산 가능) | — | — | — | CANONICAL 패턴 근거 |
| 4 | `SecurityAudit.php:32` | 실패 `catch` no-op(fail-open·체인 silent reset) | — | — | — | BLOCKED(무결성 우선 위배) |
| 5 | `SecurityAudit.php:39-40` | `lastHash()` `ORDER BY id DESC`·오류시 `'GENESIS'` | — | — | — | CANONICAL(Genesis)·**Head-CAS 없음** |
| 6 | `SecurityAudit.php:51` | DDL `created_at VARCHAR(32)`·`prev_hash` 컬럼 | — | — | — | CANONICAL(Link/재계산) |
| 7 | `SecurityAudit.php:56-68`(핵심 `:63-64`) | **verify()**: 행별 재계산·`hash_equals`+`prev_hash===$prev`·`{ok,checked,broken_at}` | SHA-256 | ❌(write와 동일 preimage) | ✅ **유일 실 검증기** | **CANONICAL_VERIFICATION_ENGINE(확장)**·단 tenant 술어 없음 |
| 8 | `AdminGrowth.php:1429` | `SecurityAudit::verify($pdo)` 배선·`integrity` 노출 | — | — | ✅ 소비 | 실 배선 증거 |
| 9 | `Crypto.php:81` | AES 키유도 `sha256($raw,true)` 32B | SHA-256 | N/A(키재료) | N/A | VALIDATED_CRYPTO_HASH_UTILITY |
| 10 | `Crypto.php:98-99` | purpose-bound 토큰 subkey+HMAC | HMAC-SHA256 | N/A | 동일 클래스 verify | VALIDATED_CRYPTO_HASH_UTILITY |
| 11 | `NaverSms.php:94` | SENS 요청 서명 | HMAC-SHA256 | N/A(벤더) | N/A | EXTERNAL_INTEGRITY_ADAPTER |
| 12 | `MediaHost.php:93`(`:88-90` 바이트검증·`:100-102` 원자쓰기) | 내용주소 파일 digest | SHA-256 | N/A(바이트) | ✅ 내용주소 CAS | **VALIDATED_FILE_HASH_SOURCE**(Evidence Store·§33 Attachment 재사용) |
| 13 | `Db.php:272` | `dedup_key` 자연키 dedup | SHA-256(40 truncate) | `implode('|')` | N/A(dedup≠무결성) | KEEP_SEPARATE |
| 14 | `Db.php:998,1006` | 데모 API-key 해시 | SHA-256 | N/A | 조회비교 | KEEP_SEPARATE |
| 15 | `Db.php:1219-1220` | 비밀번호 | bcrypt `password_hash` | N/A | `password_verify` | KEEP_SEPARATE |
| 16 | `Migrate.php:50`·`:63-64` | `schema_migrations.checksum` | SHA-256 | — | ❌ 저장만·비교 미실행 | **장식**(무결성 근거 계상 금지) |
| 17 | `AdAdapters.php:1785`·`Dsar.php:24-29`·`Reviews.php:522`·`Attribution.php:115` | PII 가명화 | SHA-256(정규화) | normalize | N/A | KEEP_SEPARATE(PII pseudonymization) |
| 18 | `CRM.php:589-930` | 가명 `identity_id` | SHA-1 | — | N/A | LEGACY_WEAK_HASH(비무결성·가명화) |

## 3. ★장식(원장/무결성 자산 오인 금지)

- `menu_audit_log.hash_chain` — write `AdminMenu.php:169-212`(preimage `:183-196`·`:195` `'ts'=>date('c')` local-tz·SHA-256 `:197`), INSERT 컬럼 `:199-203`이 `created_at` 미포함 → DB DEFAULT(`:129`·migration `20260526_168_102_create_menu_audit_log.sql:20`)가 덮음 → **preimage 재계산 불가**. `lastHash()` `:214-218`. **verify() 0**(레포 어디에도 재계산기 없음·`auditLog()` `:649`는 조회만). `:18,166` "tamper-evident"는 **주석**. → **BLOCKED_TAMPER_RISK(검증불가 장식)**·[[reference_menu_audit_log_not_tamper_evident]].
- `schema_migrations.checksum`(`Migrate.php:50,63-64`) — 저장만·비교 미실행. preimage=디스크 파일이라 재계산은 가능(menu와 층위 상이).
- `journey_decision_log`(`JourneyBuilder.php:1192`) — in-place UPDATE·append-only 아님.

## 4. §3.3 Platform Security Foundation — 재사용 substrate 실재

| Primitive | 판정 | 증거 |
|---|---|---|
| Cryptographic Library / Hash Utility | **PRESENT** | `Crypto.php:81,98-99`(SHA-256·HMAC-SHA256)·`SecurityAudit.php:27` |
| Canonical JSON Library | **ABSENT(부재)** | ksort/NFC/RFC8785 canonical serializer 0. `json_encode(...,UNESCAPED_UNICODE)`는 canonicalization 아님 |
| Decimal Utility | **ABSENT** | Monetary canonical(minor unit·precision version) 0 |
| Trusted Time | **PRESENT** | `gmdate` 편재(`SecurityAudit.php:24`·`Db.php:438` 계열) |
| Unicode Normalization Utility | **ABSENT** | NFC/NFKC normalizer 0 |
| KMS/HSM/Key Version Registry | **ABSENT** | 알고리즘/키 버전 레지스트리 0(하드코딩 `'sha256'`) |
| Security Event Framework / Evidence Store | **PARTIAL/PRESENT** | `SecurityAudit`(감사 이벤트)·`MediaHost`(내용주소 Evidence `:88-102`) |
| Batch Scheduler / Distributed Worker | **PARTIAL** | cron(`media_gc_cron.php`)·트랜잭션 경계(`Omnichannel.php:404-415` beginTransaction~rollback)·행수준 단일 라이터 직렬화(`Omnichannel.php:405` `FOR UPDATE SKIP LOCKED`·claimBatch `:390-448`·claim UPDATE `:429-441`) — Outbox 워커큐이지 원장 verification job 아님(재사용 substrate) |

## 5. ★실 위험 (별도 수정세션 후보 — 이번엔 설계만)

1. **`SecurityAudit` Canonicalization 부재**(`:27`) — raw concat+UNESCAPED_UNICODE json → §5.3/§5.4 위반. 실 체인이지만 이식·재사용 전 Canonical Projection 보강 필수(무후퇴 예외=개선).
2. **`SecurityAudit` fail-open**(`:32` catch no-op·`:40` GENESIS on error) — 체인 silent reset·§5.11(실패 무시 금지) 위배 창.
3. **`SecurityAudit` Head-CAS/tx경계 부재**(`:39` DESC 조회) — 동시 INSERT 체인분기 이론창(§30 Head Digest·§41 Head Verification 미달).
4. **verify()에 tenant 술어 없음**(`:59` 계열) — 전역 단일 체인. 멀티테넌트 이식 시 `WHERE tenant_id=?` 필수(§5.13 Tenant Binding).
5. **장식 3종**(menu_audit_log·schema_migrations.checksum·journey_decision_log) — 무결성 착시.
6. **선행 Ledger/Decision 부재** — 해시체인 결합 대상(Entry/Snapshot/Evidence/Audit/Outbox) 공회전.

## 6. 06-A-03-02-03-02 착수 판정

- **실·재사용(확장·재생성 금지)**: **SecurityAudit append-only+verify 패턴(CANONICAL·확장)** · `Crypto.php` SHA-256/HMAC-SHA256 · MediaHost 내용주소 CAS(Attachment/Evidence Digest) · 서버 UTC. → Digest·Chain·verify는 "발명 아닌 조립".
- **진짜 부재(순신규 설계)**: Crypto Integrity Registry/Policy/Definition/Version/Profile · Hash Algorithm Registry · Canonicalization Policy(Canonical JSON/Null/Number/Monetary/Timestamp/Unicode/Encoding/Collection/Reference) · Field Set/Projection · Digest Envelope · Payload/Context/Entry/Chain/Head/Link/Checkpoint/Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession/Retention/Legal Hold Digest · Chain/Range/Head/Checkpoint/Reference/Completeness Verification · Tamper Detection/Classification/Incident/Evidence/Response · Verification Job/Run/Result/Snapshot/Reconciliation · Rotation/Dual-Digest/Migration Foundation · Legacy Hash Import · Static Lint/Runtime Guard.
- **구현 BLOCKED_PREREQUISITE** — 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용) → 해시체인이 결합할 불변 대상 부재. 선행 실구현 후 별도 승인세션(RP-002). 이번 차수=설계 명세(코드 0).

정본 결정=[[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]]. 중복감사=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_DUPLICATE_IMPLEMENTATION_AUDIT]]. per-entity=§74 DSAR 세트(ⓒ).
