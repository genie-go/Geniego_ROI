# DSAR — Decision Drift (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**DRIFT(§51)** — Validation 시점과 Commit 시점 사이에 전제가 바뀌는 사건들:
Actor Inactive · Employment 종료 · Role 제거 · Position 변경 · Assignment 변경/Release · Claim Release · Lease Expiration · Authority Revocation · Authority Limit 감소 · Delegation Expiration/Revocation · Legal Entity 변경 · Organization 변경 · Resource 변경 · Amount 변경 · Currency 변경 · Security Suspension · SoD/CoI 신규 발생 · Sequential Step/Cursor/Decision Version 변경 · Existing Decision 생성 · Outbox/Snapshot/Audit 누락.

★핵심 계약: **Validation ↔ Commit 사이 Drift 발생 시 Commit 차단**(§32 Commit Revalidation과 짝). 즉 검증 결과의 무기한 재사용 금지 — 커밋 직전 Critical 축 재검증.

## 2. 기존 구현 대조

- **Decision Drift = ABSENT.** Drift는 **Validation 단계와 Commit 단계가 분리**되어 있어야 성립하는데, 현행 4핸들러는 **검증-커밋이 단일 UPDATE로 융합**되어 그 사이 시간창 자체가 없다: `Mapping::approve:288` · `AdminGrowth::approvalDecide:1330` · `Alerting::decideAction:594` · `Catalog::approveQueue:2397`. 별도 Validation Result(§26)·Commit Revalidation(§32)이 없으므로 재검증할 대상도 없다.
- 선행 전제 축이 대부분 부재하여 **drift를 감지할 원천 스냅샷이 없다**: Authority(§3.2 ABSENT)·Delegation(§3.3 ABSENT)·Assignment(§3.4 ABSENT)·Sequential(§3.5 ABSENT)·Snapshot(§54 ABSENT). 커밋 시점에 "Authority가 그 사이 회수됐는가"를 물을 근거 데이터가 존재하지 않는다.
- 실존 부분 방어는 drift가 아니라 **종결 상태 재요청 차단**(`AdminGrowth:1327` 409)뿐 — 이는 이미 종결된 건의 재실행을 막는 것이지, 검증 후 전제 변화(Actor 비활성·Authority 회수 등)를 잡는 것이 아니다.
- ★정정 참조: `parent_user_id` 붕괴는 286차 치유(`UserAuth.php:403-406`)로 **재플래그 금지** — Identity 축의 이 부분은 drift 결함으로 재기록하지 않는다.

## 3. 판정

- **Verdict: ABSENT.**
- **선행 의존**: Validation/Commit 2단계 분리(§25/§26/§32)·Snapshot(§54)·Authority(§3.2)·Delegation(§3.3)·Assignment(§3.4)·Sequential(§3.5) 전부 부재. Drift 감지의 **비교 기준선(검증 시점 스냅샷)과 재검증 지점(커밋 시점)** 둘 다 없어 성립 자체가 다중 BLOCKED.
- **cover: 0.**

## 4. 확장/구현 방향 (설계)

- Drift는 **파생 축**이다 — Validation Result(§26)에 Context Hash(§17)를 남기고, Commit Revalidation(§32)에서 Critical 축(Actor Eligible·Claim Active·Lease 미만료·Authority/Delegation Active·Security Suspension·SoD/CoI·동일 Slot Committed·Lock/Fencing 최신)을 **재평가**하는 구조가 선행돼야 감지 가능. 선행 6군·Snapshot 신설 전 착수 시 BLOCKED_PREREQUISITE.
- **검증 결과 무기한 재사용 금지** — Validation Result에 `expires_at`(§26)을 두고, 만료·Context Hash 불일치·Critical 축 변화 시 자동 Commit을 막고 Revalidation으로 되돌린다(§44 Version Mismatch와 동일 정책).
- Drift 감지는 **Audit + Warning(§64 `DRIFT_WARNING`)/Reconciliation(§57)** 로 가시화 — 조용히 커밋 진행 금지(가짜녹색 금지). Amount/Currency/Authority Limit 감소 같은 축은 **Commit 차단(fail-closed)**.
- 실 구현 = **별도 승인 세션**(선행 신설 이후). 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
