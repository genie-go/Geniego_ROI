# DSAR — Ledger Fencing Token (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§43 LEDGER_FENCING_TOKEN

- **적용 지점**: Sequence Allocation · Entry Append · Head Update · Checkpoint · Correction · Supersession · Retention · Legal Hold · Migration · Reconciliation Repair.
- ★ **낮은 토큰의 Commit 차단**(단조증가 토큰 — 리스 만료 후 부활한 이전 소유자가 뒤늦게 쓰는 것을 막는다).

## 2. 기존 구현 대조

- 코드 기반 판정: **ABSENT** — fencing token 개념·단조증가 토큰 검증 전무. ★**실 위험 지점**.
- 부재:
  - **fencing token = no hits**(EXISTING_IMPLEMENTATION §2·§4 재확인 "Lock/Lease/Fencing PARTIAL" 중 Fencing 축은 0).
  - 리스 만료 회수(`Omnichannel.php:397-399`)는 stale 행을 재큐할 뿐, **회수 시점에 in-flight 였던 좀비 워커의 뒤늦은 쓰기를 토큰으로 차단하지 못한다** — omni_outbox 는 status='queued' 가드로 재클레임을 막지만, 원장 append 처럼 "낮은 토큰 커밋 거부" 단조성 검증은 없음.
  - §43 적용 지점(Sequence Allocation/Entry Append/Head Update/…)이 되는 원장 리소스 자체가 부재(§15/§19/§20 ABSENT).
- 유사물 부재: SecurityAudit lastHash(`SecurityAudit.php:35-41` ORDER BY id DESC)에도 **CAS/토큰 없음** — 동시 INSERT 시 체인 분기 이론창(§4 실 위험 5).

## 3. 판정

- Verdict: **ABSENT · ★실 위험**
- 선행 의존: §43 은 §41 Lock·§42 Lease·§20 Head·§19 Sequence 에 결합되는 안전장치 — 이들 substrate 는 PARTIAL/ABSENT 이나 fencing token 축은 완전 부재. BLOCKED_PREREQUISITE(원장 리소스 신설 선행).
- cover: **0**(fencing token 개념·단조 토큰 검증 전무).

## 4. 확장/구현 방향 (설계)

- 순신규(발명 아님·표준 패턴): 리스(§42) 획득/갱신마다 단조증가 fencing token 을 발급 — Sequence Allocation·Entry Append·Head Update(§20 CAS) 각 지점에서 **현재 저장된 최대 토큰보다 낮은 토큰의 쓰기를 거부**. 좀비 워커(만료 리스 부활)의 뒤늦은 append 를 원천 차단.
- ★실 위험 해소(우선): 현행 omni_outbox 리스 회수(`Omnichannel.php:397-399`)는 fencing 없이 재큐만 하므로, 회수 후 원 워커가 깨어나 쓰면 이중 처리 가능 — 원장 도메인에서는 반드시 fencing 결합. Head Update 에 fencing token + Expected Head Version(§44) 이중 게이트.
- 저장/검증: fencing token 은 §41 lock 레코드·§42 lease·§20 Head 에 컬럼으로 보관. 발급 카운터는 원장/파티션 스코프 단조 — Sequence(§19)와 별개 축.
- 무후퇴: 기존 omni_outbox status 가드는 유지(§68 Regression Gate) — fencing 은 원장 append 경로에만 신규 적용, 발송큐 회귀 금지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_LOCK]] · [[DSAR_APPROVAL_DECISION_LEDGER_LEASE]] · [[DSAR_APPROVAL_DECISION_LEDGER_OPTIMISTIC_VERSION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
