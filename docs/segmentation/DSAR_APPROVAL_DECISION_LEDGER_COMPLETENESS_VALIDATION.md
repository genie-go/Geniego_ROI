# DSAR — Ledger Completeness Validation (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_COMPLETENESS_VALIDATION (§49)** — 검증 항목(원문 전사): Committed Decision 마다 다음이 모두 존재(또는 Not Applicable 명시)함을 확인한다 — Decision Record · History · Snapshot · Evidence · Audit · Outbox · Sequential Reference · Ledger Entry · Link · Head 반영 · Idempotency Result · Transaction Reference.

**★ 핵심 불변식 (§5.2)**: **Decision Record 만 있고 Ledger Entry 가 없는 상태 금지** — Orphan Record/Orphan Entry 탐지가 완전성 검증의 골자다.

## 2. 기존 구현 대조

- **전면 부재 (ABSENT·BLOCKED).** §49 는 "Committed Decision 마다 Record/History/Snapshot/Evidence/Audit/Outbox/Sequential Reference/Ledger Entry/Link/Head/Idempotency/Transaction 이 모두 존재"를 교차 확인한다. 그러나 이 대조군의 **거의 전부가 ABSENT**다:
  - Decision Core(§3.1) ABSENT — 불변 Decision Record/Commit 로우가 없다(`approval_decision` 0·유일 승인=Mapping approvals_json in-place UPDATE `Mapping.php:285-289,327`·테이블 `Db.php:623,655`).
  - Ledger Entry/Link/Head(§17/§23/§20) ABSENT — decision_ledger 0.
  - Idempotency Result(§40) ABSENT — 원장 idempotency 저장소 없음.
  - Sequential Reference(§3.3 Runtime) ABSENT.
- **인접 존재의 한계**: Outbox(`Omnichannel.php:390-448`)·Evidence Store(MediaHost CAS `:88-90,93-96,100-102`)·Audit(`SecurityAudit.php:48-52`)는 개별적으로 실재하나, 이들을 "하나의 Committed Decision 에 대해 전부 갖춰졌는가"로 묶어 대조하는 **완전성 판정기**는 없다. 묶을 중심(Decision Record)이 없기 때문이다.
- 완전성 검증은 대조할 두 집합(Committed Decision 집합 ↔ 부속 Entry 집합)이 모두 존재해야 성립하는데, 여기선 **양쪽 집합이 다 비어 있어** 검사 자체가 공회전한다.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- 선행 의존: §49 는 Decision Core(§3.1)·Actions(§3.2)·Runtime(§3.3) 3군 전부 + Ledger Entry/Link/Head/Idempotency 를 대조 입력으로 요구한다. 이 선행 4군이 ABSENT 이므로 완전성 검증은 **가장 늦게 성립하는 파생 검사** — 코어·원장·부속 엔티티가 모두 선 뒤에야 의미를 가진다.
- cover: **0** (개별 Outbox/Evidence/Audit 이 실재하나 Decision 단위 완전성 대조기는 부재)

## 4. 확장/구현 방향 (설계)

- **순신규 검증기** — 재사용할 대응 자산 없음. 단, 대조 입력 각각은 실존 substrate 를 확장해 채운다: Outbox(omni_outbox `Omnichannel.php:390-448`)·Evidence(MediaHost CAS `:93-96`)·Audit(SecurityAudit `:48-52`)를 Decision Record 에 참조로 묶는다.
- **Orphan 양방향 탐지**: §5.2 에 따라 (a) Record 있는데 Entry 없음, (b) Entry 있는데 Record 없음 두 방향 모두를 검출. Not Applicable 은 명시적 플래그로만 허용(암묵적 누락과 구분).
- **선행 순서**: 이 문서는 §68 세트에서 **후순위 확정** — Decision Core → Ledger Entry/Head/Idempotency → 부속 Reference 배선이 끝난 뒤에야 완전성 검증이 대조할 데이터를 갖는다.
- **Reconciliation 연계**: 완전성 실패는 RECONCILIATION_REQUIRED(§54)로 승격하되, Production Ledger 자동수정 금지(§51 원칙) — 누락을 자동 backfill 하면 그 자체가 위조.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
