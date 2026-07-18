# DSAR — Ledger Reversal Reference (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_REVERSAL_REFERENCE(§33)** 필수 필드:
- original decision · reversal decision reference · reason · authorization reference · compensation workflow reference · financial posting reference · legal impact reference · effective time · recorded time.
- ★범위 한정: 이번 산출물은 **Reversal Reference(참조/메타데이터 Entry)**까지 — 실 Reversal Engine(보상 워크플로우·역분개 집행)은 **후속**.
- Reversal은 원본을 무효화하는 것이 아니라, 원본을 보존한 채 「역방향 결정 참조」를 새 Entry로 Append(REVERSES_REFERENCE Link, §23).

## 2. 기존 구현 대조

| 요소 | 실존/부재 | 근거 (허용 목록 file:line) |
|---|---|---|
| Reversal Reference Entry | **ABSENT** | decision_ledger·reversal Entry/Link 0 |
| original + reversal 참조 보존 | **ABSENT** | 결정 취소/철회 시 `Mapping.php:285-289,327` status in-place UPDATE — 원본↔역결정 참조쌍 보존 없음 |
| Original Decision(불변) | **ABSENT** | §3.1 Decision Core ABSENT(테이블 `Db.php:623,655`) |
| financial posting reference | **ABSENT** | 원장-역분개 참조 개념 없음(도메인 역분개는 P&L 별개, Ledger Entry 참조와 미배선) |
| compensation workflow reference | **ABSENT** | 보상 워크플로우 참조 0 |
| REVERSES_REFERENCE Link(§23) | **ABSENT** | Ledger Link는 SecurityAudit prev_hash(`:27,39`)만·역참조 Link 타입 없음 |

## 3. 판정
- **Verdict**: **ABSENT**.
- **선행 의존**: §3.1 Decision Core + Immutable Ledger Entry + Link(§23) 부재 → **BLOCKED_PREREQUISITE**. 실 Reversal Engine은 별도 후속.
- **cover**: 0.

## 4. 확장/구현 방향 (설계)
- **선행 필수**: 불변 Decision Record + Ledger Entry + Link 인프라 신설. 이번 단계는 Reference/Link Entry 수준까지만 설계(집행 엔진 제외).
- **재사용 substrate**: SecurityAudit prev_hash 체인 패턴(`SecurityAudit.php:27,39,64`)을 Link 근간으로 확장 · 트랜잭션 경계(`Omnichannel.php:404-415`)로 「원본 보존 + Reversal Reference Append」 원자화 · 서버UTC(`Db.php:438`·`SecurityAudit.php:24`)로 effective/recorded time 분리.
- **순신규**: REVERSES_REFERENCE Link 타입 · authorization/compensation/financial posting/legal impact reference 필드 · effective≠recorded time 정합.
- **무후퇴/실위험**: 원본 **삭제 금지**(§56 Critical). Reversal은 참조 추가일 뿐 원본 무효 UPDATE 금지. 실 역분개/보상 집행은 이번 범위 밖 — 참조만 남기고 엔진은 후속 승인세션.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_VOID_REFERENCE]] · [[DSAR_APPROVAL_DECISION_LEDGER_SUPERSESSION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
