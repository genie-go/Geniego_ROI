# DSAR — Ledger Critical Gap Policy (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§56 `LEDGER_CRITICAL_GAP_POLICY` — High/Critical 차단 목록 (원문 §56 전사):

1. **Committed Decision에 Ledger Entry 없음** — 결정이 커밋됐는데 원장에 불변 기록 부재.
2. **Ledger Entry에 Decision Record 없음** — 원장 항목이 참조할 원본 결정 부재(고아 Entry).
3. **Ledger / Record / History / Snapshot / Audit 수정·삭제 가능** — 불변 대상이 물리적으로 변경 가능.
4. **Upsert Ledger** — 원장에 upsert/replace/patch 사용(§24 금지 메서드 위반).
5. **Generic CRUD** — 원장 리포지토리가 범용 CRUD 상속(Update/Delete 노출, §26 위반).
6. **동일 Sequence 복수** — 같은 Ledger/Partition Sequence 중복 부여.
7. **Sequence Reuse / Renumbering** — 삭제·정정으로 Sequence 재사용·재번호화(§19 위반).
8. **Client Sequence 지정** — 클라이언트가 Sequence를 지정(단조성 파괴).
9. **Head 덮어쓰기** — Expected Version/CAS 없이 Ledger Head 덮어쓰기(§20 위반).
10. **Fencing / Idempotency 없음** — Append 경로에 Fencing Token·Idempotency Key 부재.
11. **동일 Commit 복수** — 같은 Decision Commit에 대해 복수 Canonical Entry.
12. **Cross-Tenant Link** — 다른 테넌트 Entry 간 Link 생성(§23 위반).
13. **필수 Reference 누락** — Entry Type별 Mandatory Reference 미충족 Append(§18 위반).
14. **Correction / Supersession / Reversal이 원본 수정·삭제** — 정정이 새 Entry가 아니라 원본을 변경(§29/§30 위반).
15. **Retention Job이 Ledger Row 삭제** — 보존 작업이 원장 행을 물리 삭제(§36 위반).
16. **Legal Hold 중 Payload 삭제** — Hold 상태에서 Payload/Redaction/Archive Purge(§37 위반).
17. **Commit과 Append 비원자** — Decision Commit과 Ledger Append가 단일 트랜잭션 아님(§38 위반).
18. **Outbox ↔ Ledger 불일치** — Committed Decision의 Outbox와 Ledger Entry 불일치(§39 위반).
19. **Gap 자동은폐** — Sequence Gap을 재번호화로 은폐(§46 위반).
20. **Migration Backfill 중복** — 레거시 백필이 중복 Entry 생성(§47/§66 위반).
21. **Manual DB Fix** — Migration Context 외 직접 SQL Mutation(§27 위반).
22. **Application Role UPDATE·DELETE** — 애플리케이션 롤이 원장에 UPDATE/DELETE 가능(§27 위반).
23. **고객 설정 Append-only 제거** — 설정으로 append-only 강제를 해제 가능.
24. **Legacy ↔ Canonical 이중 진실원** — 원장과 레거시 이력이 이중 SoT로 병존(§62 위반).

## 2. 기존 구현 대조 (Gap 전사 — 대부분 미방지)

리포지토리는 위 24개 Critical Gap 중 **대부분을 방지하지 못한다** (정직 판정 — 능력 기반):

| Gap | 방지 여부 | 근거(허용목록) |
|---|---|---|
| 1. Committed→Ledger Entry 없음 | **미방지(구조적)** | 결정=in-place UPDATE(`Mapping.php:285-289,327`)·Ledger 자체 ABSENT |
| 2. Entry→Record 없음 | **N/A(선행부재)** | Ledger Entry·Decision Record 둘 다 ABSENT |
| 3. Ledger/Record/Snapshot/Audit 수정·삭제 가능 | **미방지** | DB 불변강제(Trigger/RLS/Permission) 전무·`SecurityAudit`만 관례적 append-only(`:8` UPDATE/DELETE 코드 0) |
| 4. Upsert Ledger | **미방지** | 승인 도메인이 status upsert/in-place UPDATE(`Mapping.php:288`·`JourneyBuilder.php:1192`) |
| 5. Generic CRUD | **미방지** | Immutable 전용 Insert Repository·Update/Delete 미노출 규율 부재 |
| 6~8. Sequence 중복/Reuse/Client 지정 | **미방지** | 논리 Sequence 부재·id AUTOINCREMENT만 |
| 9. Head 덮어쓰기 | **미방지** | Ledger Head·CAS 부재(`SecurityAudit.php:35-41` lastHash=ORDER BY id DESC·CAS 없음→동시 INSERT 체인분기 이론창) |
| 10. Fencing/Idempotency 없음 | **미방지** | 원장 Idempotency Key·Fencing Token 0 |
| 11. 동일 Commit 복수 | **미방지** | Decision Commit Entry Unique 제약 부재 |
| 12. Cross-Tenant Link | **미방지** | Link 엔티티 ABSENT |
| 13. 필수 Reference 누락 | **미방지** | Reference Matrix(§18) ABSENT |
| 14. Correction이 원본 수정 | **미방지** | Correction/Supersession 엔티티 부재·정정=in-place UPDATE |
| **15. Retention Job이 Ledger Row 삭제** | **★미방지(BLOCKED_GAP)** | `media_gc_cron.php:35,43` append-only 감사로그 90일 물리 DELETE(불변성 상충·Legal Hold 예외 없음) |
| **16. Legal Hold 중 Payload 삭제** | **★미방지(BLOCKED_GAP)** | `legal_hold` 0·Hold 개념 자체 부재→물리삭제 차단 불가 |
| 17. Commit과 Append 비원자 | **미방지** | `SecurityAudit` best-effort 비트랜잭션(`:32`)·원장 트랜잭션 경계 ABSENT |
| 18. Outbox↔Ledger 불일치 | **N/A(Ledger부재)** | omni_outbox 실재(`Omnichannel.php:390-448`)나 Ledger 대응 없음 |
| 19. Gap 자동은폐 | **미방지** | verify는 연속체인만(`SecurityAudit.php:56-68`)·gap 무탐지 |
| 20. Migration Backfill 중복 | **N/A(선행부재)** | Ledger backfill 경로 부재 |
| **21. Manual DB Fix** | **미방지** | Migration Context 외 Direct Mutation 감사·차단 전무 |
| **22. Application Role UPDATE·DELETE** | **★미방지(BLOCKED_GAP)** | 단일 DB 롤·Permission/Trigger/RLS 부재→앱 롤이 감사로그·상태 테이블 UPDATE/DELETE 가능 |
| 23. Append-only 제거 가능 | **미방지** | append-only가 코드 관례일 뿐 설정/DB로 강제 안 됨 |
| 24. Legacy↔Canonical 이중 진실원 | **미방지(잠재)** | in-place status가 유일 SoT·canonical Ledger 도입 시 이중화 위험 |

## 3. 판정

- Verdict: **BLOCKED_GAP** (정책 전사됨 · 대부분 Gap 미방지 · 3건은 실 위험)
- **★BLOCKED_GAP 3건(실 위험 명시)**:
  1. **Gap 15 — `media_gc_cron.php:35,43` 물리 DELETE**: append-only 감사로그를 90일 후 물리 삭제(불변성 상충·Legal Hold 예외 없음·감사 무결성 파괴 창).
  2. **Gap 16 — Legal Hold 부재**: `legal_hold` 0이라 Hold 중 삭제 차단이 원천 불가.
  3. **Gap 22 — Application Role UPDATE·DELETE**: DB 불변강제(Permission/Trigger/RLS) 전무·앱 롤이 원장/감사 테이블 UPDATE/DELETE 가능.
- 선행 의존: §3.1 Decision Core(불변 Record/Commit)·§15 Ledger·§17 Entry·§20 Head·§36 Retention·§37 Legal Hold 부재 → Gap 1·2·9·11·13·14 등은 **BLOCKED_PREREQUISITE**로만 방지 가능.
- cover: **0** (범용 Gap 방지 정책 부재) · 실효 통제는 `SecurityAudit` append-only+verify 관례(부분)·MediaHost CAS(부분)뿐.

## 4. 확장/구현 방향 (설계)

- **BLOCKED_GAP 3건은 최우선 실 위험**으로 명시(별도 수정세션 후보 — 이번엔 설계만):
  1. **`media_gc_cron` 물리삭제(Gap 15)**: append-only 감사로그를 물리 삭제 대상에서 제외하고, Retention은 §36 `REMOVE_NONESSENTIAL_PAYLOAD`/`ARCHIVE`(논리·payload만)로 대체 — Sequence·무결성 Metadata·감사는 삭제 금지. Legal Hold Binding(§37) 도입 시 Hold 대상은 물리삭제 예외 강제.
  2. **DB Immutability Guard(§27) 신설**: Application Role INSERT·SELECT만 부여, Migration Role 분리, Ledger/Link/Record/History/Snapshot/Audit UPDATE·DELETE를 Permission으로 차단 — ★Trigger 단독 금지(Permission + Append-only Extension 병행). Manual DB Fix(Gap 21)는 감사·알림으로 탐지.
  3. **Head-CAS + Transaction Boundary(§20/§38)**: `SecurityAudit` lastHash를 Expected Head Version·CAS·Fencing으로 승격해 동시 INSERT 체인분기(이론창) 차단.
- Gap 방지 정책은 순신규 — 24개 Critical Gap을 Static Lint(§57)·Runtime Guards(§58)·Error Contract(§59/§60)로 강제. 각 Gap은 대응 Error 코드로 매핑돼 무음 통과 불가.
- Golden Rule(Extend): 실재 substrate 재사용 — `SecurityAudit` append-only+verify 패턴(CANONICAL·확장)·SHA-256 3개소(MediaHost/Migrate/SecurityAudit)·트랜잭션 경계·`omni_outbox` 클레임·SKIP LOCKED·서버UTC·MediaHost CAS Evidence Store. 발명이 아니라 조립.
- 무후퇴: 기존 실효 통제(`SecurityAudit` 해시체인·MediaHost 매직바이트·Tenant Guard `index.php:404-420`)는 Gap 방지 substrate로 보존(§68). ★media_gc 물리삭제 개선은 무후퇴 예외(불변성 개선이지 기능 후퇴 아님).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_STATIC_LINT]] · [[DSAR_APPROVAL_DECISION_LEDGER_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
