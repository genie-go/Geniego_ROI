# DSAR — Ledger Reconstruction (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_RECONSTRUCTION (§51)** — 재현 대상(원문 전사): Sequence/시점/Case/Instance/Slot 기준으로 다음을 재구성한다 — Decision Instance/Slot 상태 · Committed Decision · Action History · Correction/Supersession Chain · Reversal/Void Reference · Retention/Legal Hold 상태 · Ledger Head · Entry Count · Gap/Conflict.

**★ 절대 원칙 (§51)**: Reconstruction 은 **Production Ledger 자동수정 금지** — 읽기 전용 상태 재현일 뿐, 발견한 gap/conflict 를 자동으로 고치지 않는다.

## 2. 기존 구현 대조

- **부분 존재 (PARTIAL).** 원장 상태를 순서대로 재현하는 능력의 **원시 형태(해시 재계산 재현)만** 실재한다.
- **실재 부분 — `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)**: GENESIS(`:39`)부터 prev_hash 를 따라 각 로우의 hash 를 순차 재계산(`:27`)한다. 이는 저장된 스트림을 처음부터 되짚어 **"이 순서로 존재했음"을 재현·검증하는 replay 1종**이며, §51 의 sequence 기준 재현의 원시 형태다.
- **부재 부분** — §51 이 요구하는 풍부한 재구성 축 대부분:
  - 시점/Case/Instance/Slot 기준 재현 — Decision Instance/Slot(§3.1) ABSENT.
  - Correction/Supersession Chain·Reversal/Void Reference 재현 — 해당 Entry(§29/§32/§33/§34) ABSENT.
  - Retention/Legal Hold 상태 재현 — Binding(§36/§37) ABSENT.
  - Ledger Head·Entry Count·Gap/Conflict 재현 — Head(§20)/Gap(§46)/Conflict(§45) ABSENT.
- SecurityAudit 재현은 **선형 해시 체인 하나**를 되짚는 수준이지, 다차원(시점·케이스·슬롯) 상태 스냅샷 재구성이 아니다.

## 3. 판정

- Verdict: **PARTIAL** (해시 재계산 순차 재현 1종 실재·다차원 상태 재구성 ABSENT)
- 선행 의존: §51 의 시점/Case/Slot 기준 재현은 Decision Instance/Slot(§3.1)·Chain 엔티티(Correction/Supersession/Reversal/Void)·Retention/Legal Hold·Head/Gap/Conflict 신설을 전제. 이들이 서야 "특정 시점의 상태"를 재조립할 소스가 생긴다.
- cover: `SecurityAudit::verify`(`SecurityAudit.php:56-68`+`:27,39`)의 순차 해시 재계산 = **선형 sequence 재현 1종 커버**. 시점/Case/Slot/Chain/Retention/Head/Gap 재현 = **0**.

## 4. 확장/구현 방향 (설계)

- **재사용 대상 = SecurityAudit 순차 재계산 패턴(`:56-68`)**. Ledger Entry(§17) 스트림을 GENESIS→head 순으로 되짚어 상태를 누적 재구성하는 뼈대를 이 패턴에서 확장한다(KEEP_SEPARATE·확장).
- **Mandatory Control — §51**: Reconstruction 은 **읽기 전용**. 재현 중 gap/conflict/head-mismatch 를 발견해도 Production Ledger 를 자동수정하지 않는다 — 발견 사실만 GAP_DETECTED/ORDER_CONFLICT(§45/§46)로 보고. 자동 backfill 은 위조.
- **다차원 인덱스 전제**: 시점/Case/Instance/Slot 기준 재현은 §64 인덱스(sequence/case/instance/slot/recorded·effective time range)를 필요로 함 — Entry·Head 신설과 동반.
- **Replay 와 관계**: 본 Reconstruction 은 상태 재조립(읽기), §52 Replay Foundation 은 이벤트 재실행 프레임 — 동일 순차 재현 substrate(SecurityAudit)를 공유하되 side-effect 차단 원칙(§52)을 함께 준수.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
