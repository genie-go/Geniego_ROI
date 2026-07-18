# DSAR — Ledger Function Regression Gate (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§66 `LEDGER_FUNCTION_REGRESSION_GATE` — 무후퇴 게이트(원문 전사). Immutable Ledger 신설/통합 시 아래 실존 기능은 **동작 회귀 0**이어야 통과:

1. **SecurityAudit verify** — append-only 해시체인·`verify()` 이중검증.
2. **audit_log** — append-only 감사 write.
3. **pm_audit_log** — PM 감사 write.
4. **omni_outbox** — Outbox 클레임/리스 처리.
5. **schema_migrations** — 스키마 마이그레이션 버전관리.
6. **MediaHost** — CAS Evidence Store(SHA-256·원자쓰기·바이트검증).
7. **기존 승인** — Mapping/AdminGrowth/Alerting/Catalog 결정 경로.

★**예외(무후퇴 예외 = 개선)**: `media_gc_cron` 물리삭제는 **Ledger 대상에서 제외** — 90일 물리 DELETE는 불변성 상충이므로 Ledger Entry에 적용하지 않는 것이 **개선**(회귀 아님).

## 2. 기존 구현 대조 — 무후퇴 대상 확정 (능력 기반)

| # | 기능 | 보존 계약(회귀 금지) | 근거(허용목록) |
|---|---|---|---|
| 1 | **SecurityAudit verify** | append-only 해시체인·`verify()` hash_equals+prev_hash 이중검증·INSERT/SELECT만 | `SecurityAudit.php:8,27,39,56-68`(verify `:56,64`) |
| 2 | **audit_log** | append-only 감사 write | `Db.php:434-440,540-546` |
| 3 | **pm_audit_log** | append-only PM 감사 write | `PM/Shared.php:129-148` |
| 4 | **omni_outbox** | 클레임/리스 15분·SKIP LOCKED 행클레임 | `Omnichannel.php:390-448`(`:395`·`:405,429-441`) |
| 5 | **schema_migrations** | 스키마 버전관리·트랜잭션 | `Migrate.php:38,50,54-60` |
| 6 | **MediaHost** | 내용주소 SHA-256·원자쓰기·바이트검증 | MediaHost `:88-90,93-96,100-102,211` |
| 7 | **기존 승인** | Mapping approve→apply in-place 전이(현행 동작 보존) | `Mapping.php:285-289,327` (AdminGrowth/Alerting/Catalog=[[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] 명칭 참조) |

- 추가 보존 substrate: Inbox dedup(`Paddle.php:108,146,343-368`)·서버UTC(`Db.php:438`·`SecurityAudit.php:24`)·트랜잭션(`Omnichannel.php:404-415`).
- **주의(정직 판정)**: 위 기능은 통합의 CANONICAL/재사용 substrate 정본이므로 **삭제·재구현이 아니라 확장(Extend)** 대상. 회귀 테스트는 통합 전후 동일 입력에 동일 write/verify/클레임 결과를 확인.

## 3. 판정

- Verdict: **무후퇴 대상 7건 확정 + media_gc 예외(개선)**
- 선행 의존: 게이트 자체는 신규(회귀 검증 하네스). 대상 기능은 모두 실존.
- cover: 무후퇴 대상 7건 실존 · **자동 회귀 게이트 = 0**(리포에 test 스크립트 없음·CLAUDE.md).

## 4. 확장/구현 방향 (설계)

- **최우선 회귀 방지 포인트**:
  - `SecurityAudit::verify()` 해시체인 append-only 유지(`:56,64`) — Ledger가 이 패턴을 확장하되 verify 동작 완화 금지.
  - `omni_outbox` 클레임/리스·SKIP LOCKED 유지(`Omnichannel.php:405,429-441`) — Ledger Outbox Binding(§39)이 재사용해도 기존 큐 처리 회귀 금지.
  - `MediaHost` 바이트검증·원자쓰기 유지 — Evidence/Redaction substrate로 재사용 시 검증 완화 금지.
  - 기존 승인(Mapping approve→apply 등) status 전이 유지 — Ledger 적재를 얹되 현행 승인 동작 회귀 0.
- ★**media_gc 물리삭제 = Ledger 대상 제외(개선)**: `media_gc_cron.php:35,43`의 90일 물리 DELETE는 append-only 감사로그 불변성과 상충 — Ledger Entry에는 물리 DELETE를 적용하지 않고 Retention/Legal Hold(§36/§37)로 대체. **이는 무후퇴 위반이 아니라 무결성 개선**(파괴적 동작 축소).
- **Golden Rule(Extend)**: 통합은 기능을 Adapter 뒤로 흡수하되 **write/verify/클레임/검증 동작은 강화만·완화 없음**.
- 무후퇴 원칙(레지스트리): 후퇴 금지·한 값 변경=관련 전부 동시 동기화. 통합으로 인한 무음 기능 손실 0. 자동화는 E2E 스모크(`npm run e2e`·`e2e:render`)·render.mjs 라우트 도출과 연계.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_DUPLICATE_IMPLEMENTATION_AUDIT]] · [[DSAR_APPROVAL_DECISION_LEDGER_MIGRATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
