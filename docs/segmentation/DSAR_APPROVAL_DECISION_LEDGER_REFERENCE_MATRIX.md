# DSAR — Ledger Reference Matrix (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§18 LEDGER_REFERENCE_MATRIX (원문 전사): Entry Type별 Mandatory Reference(Versioned).

- **DECISION_COMMITTED 필수 참조**: `decision record` · `commit` · `instance` · `slot` · `actor` · `action type` · `case version` · `sequential step` · `assignment` · `authority resolution` · `snapshot` · `audit` · `outbox`.
- **CORRECTION 필수 참조**: `correction target entry` · `reason` · `corrected field` · `previous·new value digest` · `authorized actor` · `approval` · `effective·recorded time`.
- **SUPERSESSION 필수 참조**: `supersession target` · `new decision record` · `reason` · `actor` · `policy version`.
- ★누락 시 **Append 차단**(Mandatory Reference 미충족 = 원장 기록 거부).

## 2. 기존 구현 대조

- **Reference Matrix 부재.** Entry Type별 필수 참조를 검증하는 계층이 없다(상위 §17 Entry·§3.1 Decision Core 모두 ABSENT).
- DECISION_COMMITTED가 요구하는 참조 원천이 대부분 부재: `decision record/commit/instance/slot`(§3.1 ABSENT·`approval_decision` 0) · `authority resolution`/`assignment`/`sequential step`(§3.3 Runtime ABSENT). 승인 확정은 in-place UPDATE(`Mapping.php:285-289,327`)로 이 참조들을 남기지 않는다.
- 실존 참조 후보는 **결합되지 않은 채 산재**: `audit` = SecurityAudit(`:48-52`) · `outbox` = omni_outbox(`Omnichannel.php:390-448`) · `snapshot/evidence` = MediaHost CAS(`:88-90,93-96,100-102,211`). 이들을 DECISION_COMMITTED Entry에 필수로 묶는 매트릭스 검증은 없다.
- CORRECTION/SUPERSESSION 필수 참조(`correction target entry`·`previous·new value digest`·`supersession target`·`policy version`) → **no hits**(정정=덮어쓰기).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Reference Matrix는 §17 Entry Type × 참조 대상(§3.1 Decision Core·§3.3 Runtime)의 교차 계약 — 양축 모두 ABSENT. Append 차단 게이트가 걸릴 원장 자체가 없다.
- cover: **0** (매트릭스/검증 0)

## 4. 확장/구현 방향 (설계)

- 순신규 Reference Matrix 검증기 — Entry Type별 Mandatory Reference를 **Append 전 게이트**로 강제(누락 시 fail-closed 거부, §18). 데이터 선언(versioned matrix) + Append 경로 단일화.
- 재사용 substrate(발명 아닌 조립): `audit`/`outbox`/`snapshot`/`evidence` 참조는 신설이 아니라 **기존 자산 링크** — SecurityAudit(`:48-52`)·omni_outbox(`Omnichannel.php:390-448`)·MediaHost CAS(`:88-90,93-96`)를 reference id로 결선. `previous·new value digest` = SHA-256(`:27`·`:50`·`:93`) 재사용.
- ★DECISION_COMMITTED의 `decision record/commit/instance/slot/authority resolution/assignment` 참조는 §3.1 Core·§3.3 Runtime 선행 신설 없이는 항상 누락 → Append 영구 차단 → 원장 공회전. 따라서 매트릭스 강제의 실효는 Core/Runtime 신설에 종속.
- CORRECTION/SUPERSESSION 필수 참조는 정정을 append-only(§29/§32)로 강제하는 게이트 — 현행 in-place UPDATE(`Mapping.php:288`) 대체.
- 선행 조립: Decision Core(§3.1)+Runtime(§3.3) → Entry/Entry Type → 본 Matrix. 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_ENTRY_TYPE]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
