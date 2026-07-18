# DSAR — Ledger Replay Foundation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_REPLAY_FOUNDATION (§52)** — Replay 유형(원문 전사): Full · Partition · Case · Instance · Slot · Sequence Range · Time Range · Correction Chain · Supersession Chain · Migration · Recovery Replay.

**★ 절대 원칙 (§52)**: Replay 는 **Side Effect 기본 비활성** — 새 Decision/Assignment/Payment/Notification/External API/Sequential Progression 을 **생성 금지**한다. 원장 이벤트를 되돌려 읽되, 어떤 실 부작용도 재발화하지 않는다.

## 2. 기존 구현 대조

- **부분 존재 (PARTIAL).** 저장 스트림을 처음부터 되짚어 실행하는 능력의 **원시 형태만** 실재한다.
- **실재 부분 — `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)**: GENESIS(`:39`)부터 prev_hash 를 따라 로우별 hash 를 순차 재계산(`:27`)한다 — 이는 저장된 append-only 스트림을 **부작용 없이 되짚는 replay 의 원시 형태**이며, §52 의 "Side Effect 비활성" 원칙을 (읽기 전용 SELECT 이므로) 이미 만족하는 유일 실 사례다.
- **부재 부분** — §52 이 규정한 replay 유형 전부에 대한 **범용 프레임 부재**:
  - Partition/Case/Instance/Slot/Sequence Range/Time Range Replay — 대응 Ledger Partition(§16)/Entry(§17)/Instance/Slot(§3.1) ABSENT.
  - Correction/Supersession Chain Replay — 해당 Entry(§29/§32) ABSENT.
  - Migration/Recovery Replay — Ledger backfill/recovery 경로 ABSENT(`Migrate.php` 는 스키마 마이그레이션용 `:38,50,54-60`이지 원장 replay 아님).
- SecurityAudit 재계산은 **단일 선형 체인 검증**이지, "유형별로 범위를 지정해 부작용 차단 모드로 재실행"하는 Replay Foundation 이 아니다.

## 3. 판정

- Verdict: **PARTIAL** (부작용 없는 선형 순차 재계산 1종 실재·유형별 Replay 프레임 ABSENT)
- 선행 의존: §52 의 유형별 replay 는 Ledger Entry/Partition/Sequence(§16/§17/§19)·Chain 엔티티·Instance/Slot(§3.1) 신설을 전제. 재생할 이벤트 스트림 자체가 아직 없다.
- cover: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 read-only 순차 재계산 = **side-effect-free replay 원형 1종 커버**. 유형별(Partition/Case/Slot/Range/Chain/Migration/Recovery) Replay = **0**.

## 4. 확장/구현 방향 (설계)

- **재사용 대상 = SecurityAudit read-only 순차 재계산(`:56-68`)**. 이 "부작용 없이 스트림을 되짚는" 성질을 Replay Foundation 의 실행 커널로 확장한다(KEEP_SEPARATE·확장).
- **Mandatory Control — §52 절대 원칙**: Replay 는 기본 side-effect OFF. 재생 중 어떤 write 경로(Decision commit/Assignment/Payment/Notification/External API/Sequential Progression)도 발화 금지. side-effect ON 이 필요한 경우는 명시적 Recovery Replay 로 격리하고 별도 승인·감사.
- **Reconstruction 과 공유**: §51 Reconstruction(상태 재조립)과 동일 순차 재현 substrate 를 공유하되, Replay 는 "이벤트 재실행 프레임"(범위 지정·유형별)이라는 점에서 상위 — 로직 이중화 금지, 하나의 read-only 커널을 두 목적이 재사용.
- **정직판정**: Replay/Reconstruction 은 진단·복구 도구로 코어보다 후순위. Ledger Entry 스트림이 실재해야 성립.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
