# DSAR — Ledger Static Lint (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§57 `LEDGER_STATIC_LINT` — 배포 전 정적 차단 규칙(원문 §57 "차단 목록"). 차단 대상은 §24 Append-only Contract 금지 메서드·§26 Repository Immutability Guard·§27 Database Immutability Guard·§56 Critical Gap을 소스/스키마 수준에서 사전 탐지하는 것으로 파생 전사한다(§57 축자 룰 번호는 원문 정본 참조):

1. **원장 대상 금지 메서드 호출 정적 탐지(§24)** — `updateEntry` · `deleteEntry` · `saveOrUpdate` · `upsertEntry` · `replaceEntry` · `patchEntry` · `bulkUpdateEntry` · `truncateLedger` · `resequenceLedger` · `resetHeadWithoutRecovery` · `overwritePayload` 호출 금지.
2. **Ledger/Record/History/Snapshot/Audit 테이블에 `UPDATE`/`DELETE` SQL** 정적 탐지(§27) — Migration Context 외 Mutation 차단.
3. **Generic CRUD 상속·범용 Repository 사용**(§26) — Immutable 전용 Insert Repository 미사용 경로.
4. **Head 갱신에 Expected Version/CAS/Fencing 미참조**(§20/§43/§44).
5. **Append 경로에 Idempotency Key 미참조**(§40).
6. **Entry Type별 Mandatory Reference 미검증 Append**(§18).
7. **Client 지정 Sequence·Sequence Reuse/Renumbering 코드**(§19).
8. **Cross-Tenant Link 생성 가능 경로**(§23) — Tenant 술어 없는 Link Insert.
9. **Decision Commit ↔ Ledger Append 비원자**(단일 트랜잭션 밖 Append, §38).
10. **Retention/GC Job이 원장·감사 Row를 물리 `DELETE`**(§36) — payload-only 아닌 행삭제.
11. **Legal Hold 검사 없는 삭제/Redaction/Archive Purge**(§37).
12. **Append-only 강제를 설정/플래그로 우회 가능한 경로**(§56 Gap 23).

## 2. 기존 구현 대조

- **정적 린트 계층 부재 → 미구현(ABSENT).** 리포에 원장 무결성 전용 정적 검사(CI 게이트·AST 룰·스키마 린트) 없음. CLAUDE.md에도 lint/test 스크립트 부재 명시.
- 위 규칙이 잡아야 할 위반은 소스에 **실재**하나 자동 탐지 없음:
  - 규칙1/2: 감사·상태 테이블 in-place `UPDATE`(`Mapping.php:285-289,327`·`JourneyBuilder.php:1192` in-place rewarded UPDATE)·`media_gc_cron.php:35,43` append-only 로그 물리 `DELETE`.
  - 규칙3: Immutable 전용 Insert Repository 규율 부재(범용 PDO 직접 접근).
  - 규칙4/5: Head/CAS·Idempotency Key 미참조(`SecurityAudit.php:35-41` lastHash ORDER BY id DESC·CAS 없음).
  - 규칙10: `media_gc_cron.php:35,43` append-only 감사로그 90일 물리 DELETE(§56 Gap 15).
  - 규칙11: Legal Hold(`legal_hold` 0) 검사 없이 삭제 가능.
- 실효 대비 사례(린트가 아니라 런타임 검증): `MediaHost.php:88-91` 매직바이트 재검증·`index.php:404-420` Tenant Guard — 이는 일부 위반을 런타임에 막지만 **정적 사전차단은 아님**.

## 3. 판정

- Verdict: **ABSENT** (정적 린트 미구현)
- 선행 의존: 린트 대상인 Ledger/Entry/Head/Sequence/Link/Correction/Retention/Legal Hold 엔티티가 §15~§37 전반 부재 → 룰의 참조 대상 자체가 없음(BLOCKED_PREREQUISITE 성격). 단 §24 금지 메서드·§27 UPDATE/DELETE 정적 탐지는 **현행 in-place UPDATE·media_gc 물리삭제를 지금도 잡을 수 있는 즉시 적용 가능한 룰**.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 CI 정적 게이트 — 12개 파생 룰을 AST/grep 기반 차단으로 신설. 각 룰은 §59/§60 Error 코드로 매핑. Repo에 lint/test 스크립트가 없으므로(CLAUDE.md) 도입 시 CI Phase로 추가(EN locale guard 다음 단계).
- 선(先) 탐지 우선순위(실재 위반 기준): (1) 원장/감사 테이블 `UPDATE`/`DELETE` SQL 정적 금지(§24/§27) → 현행 `Mapping.php:288` in-place UPDATE·`media_gc_cron.php:35,43` 물리 DELETE를 즉시 플래그, (2) Head 갱신 CAS/Fencing 미참조 금지, (3) Append 경로 Idempotency Key 필수.
- Golden Rule(Extend): 기존 `MediaHost` 매직바이트 검증·`index.php:404-420` Tenant Guard·`SecurityAudit` append-only 관례를 린트가 "필수 호출/패턴"으로 요구하는 참조 정본으로 승격.
- 무후퇴: 린트는 신규 차단만 추가하며 기존 통과 경로를 회귀시키지 않음. ★단 `media_gc_cron` 물리삭제 플래그는 불변성 개선(무후퇴 예외 §68) — Retention 논리삭제로 대체 유도.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_DECISION_LEDGER_CRITICAL_GAP_POLICY]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
