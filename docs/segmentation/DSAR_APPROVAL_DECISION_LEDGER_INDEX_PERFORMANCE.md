# DSAR — Ledger Index / Performance (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§64 `LEDGER_INDEX_PERFORMANCE` — 필수 인덱스/조회 최적화 대상(원문 전사):

1. **Tenant · Ledger · Partition · Sequence 별** Entry 조회.
2. **Decision Record · Commit · Slot · Case · Work Item 별** 조회.
3. **Actor · Action Type · Entry Type 별** 조회.
4. **Previous Entry** 참조(체인 순회).
5. **Correction / Supersession / Reversal Target** 조회.
6. **Source Event ID** 조회(외부 소스 dedup).
7. **Idempotency Key** 조회(§40).
8. **Ledger Head** 조회(강한 일관성).
9. **Checkpoint Range** 조회(§21).
10. **Legal Hold / Retention** 상태 큐(§36/§37).
11. **Gap · Duplicate · Conflict** 조회(§45~§47).
12. **Reconciliation Mismatch** 조회(§54/§55).
13. **Recorded / Effective Time Range** 조회(§48).

## 2. 기존 구현 대조

- **원장 전용 인덱스/성능 계약 부재 → ABSENT.** 위 13개 조회 축 중 대부분은 대응 엔티티(Ledger·Partition·Sequence·Previous Entry·Correction/Supersession Target·Idempotency Key·Head·Checkpoint·Legal Hold·Gap/Duplicate/Conflict·Reconciliation) 자체가 부재하여 인덱싱 대상이 없음.
- 부분 실재(감사·승인 테이블의 우연적 조회):
  - `security_audit_log`(`SecurityAudit.php:48-52`) Tenant/Actor/created_at 조회·lastHash `ORDER BY id DESC`(`:35-41`)는 존재하나 **표준 원장 인덱스 규격 아님**(Head 조회를 id 정렬로 대체·CAS 없음).
  - 도메인 승인 테이블(Mapping approvals_json·admin_growth 계열)의 Tenant/status 컬럼 조회는 존재하나 원장 Sequence/Head/Previous Entry 인덱스 아님.
- **★성능 실 위험(라이브 관련·레지스트리)**: N+1/루프 내 외부 API는 이 리포에서 반복 장애 원인(285차 11번가 상품마다 3MB 재수집→40s 타임아웃→0.25s). 원장 Append 경로가 Head/Sequence 조회에서 인덱스 없이 풀스캔·루프하면 동일 계열 위험. **다만 원장 조회 경로 자체가 미구현이므로 현시점 측정 근거 없음(no hits).**
- Ledger Head는 §65 Cache Policy상 **강한 일관성** 대상 — 인덱스 부재 시 Head 조회가 병목이 되어 동시 Append 직렬화 성능을 좌우.

## 3. 판정

- Verdict: **ABSENT** (원장 인덱스/성능 규격 부재)
- 선행 의존: 조회 축 1~13이 부재 엔티티 참조 → **BLOCKED_PREREQUISITE**.
- cover: **0** (`security_audit_log` Tenant/Actor/created_at·id 정렬 조회만 우연 존재).

## 4. 확장/구현 방향 (설계)

- 순신규: 원장 Append/조회 시 13개 축을 커버하는 복합 인덱스 정의. 특히 **(tenant, ledger_id, partition_id, sequence)** UNIQUE(§19 단조·중복 차단)·**(tenant, decision_record_id)**·**(tenant, idempotency_key)** UNIQUE(§40)·**Ledger Head(tenant, ledger_id, partition_id)** 강한 일관성 인덱스·**Legal Hold/Retention 부분 인덱스**·**Gap/Duplicate/Conflict/Reconciliation Mismatch** 워크큐 인덱스·**previous_entry_id**(체인 순회).
- 성능 안전(레지스트리 반영): 원장 Append·Validation·Reconstruction은 **루프 내 외부 API 호출 금지**·배치/인덱스 조회로 N+1 차단(285차 교훈). 공용 스코프는 읽기도 `__shared__`로 격리.
- Golden Rule(Extend): 기존 `security_audit_log` Tenant/Actor/created_at 조회 인덱스를 원장 감사 축으로 정규화·승격(중복 인덱스 난립 금지 §62). lastHash `ORDER BY id DESC`(`:35-41`)는 Head 전용 인덱스+CAS로 대체(id 정렬 대체를 강한 일관성 Head 조회로 승격).
- 무후퇴: 인덱스 추가는 조회 회귀 없이 성능만 개선. Ledger Head는 §65 Cache≠SoT 원칙 하에 강한 일관성 유지(캐시 무효화는 Append/Checkpoint/Correction/Legal Hold/Retention 후).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_API_CONTRACT]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
