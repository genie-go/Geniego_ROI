# DSAR — Runtime SoD Enforcement: 시간적 직무분리 (APPROVAL_SOD_TEMPORAL)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_TEMPORAL`은 SPEC §7(Temporal SoD)의 시간적 직무분리 대상이다. 동일 주체가 시간 축에 걸쳐 상충 행위(전형적으로 생성↔승인)를 수행하지 못하게 차단한다.

SPEC §7 평가 시점: 동일 일자 · 동일 Session · 동일 Transaction · **동일 Approval Cycle** · 지정 기간.
SPEC §7 예: **생성과 승인 행위를 같은 사용자가 일정 기간 내 수행 불가.**

본 DSAR의 초점은 SPEC §7의 "동일 approval cycle 생성+승인 차단"이다. SPEC §10(Transaction Conflict: 생성↔승인)과 §11(Workflow Conflict: 동일 Approval Chain)의 시간 축 강제를 담당한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| 동일인 생성↔승인 차단(인접 선례) | PRESENT(재활용) | `Mapping.php:268-271` self-approval 차단(`requested_by===$actor`→403)(GT① §A) — **단 dual-control(2인)이지 temporal SoD 아님** |
| 정족수·maker 데이터 | PRESENT(재활용) | `Mapping.php:287` 정족수·`Db.php:632-634` `requested_by NOT NULL`+`required_approvals DEFAULT 2`(GT① §A) |
| Alerting 승인 시간축 | VACUOUS | maker 부재(`Db.php:592-600`)+생산자 grep 0(GT① §B) — approver≠requester 강제 불가 |
| **Temporal SoD(동일 approval cycle 시간창 차단)** | **ABSENT** | `same.day|created_by.*approv` grep 0(GT② §2 Temporal SoD·B-3) |
| Conflict Snapshot 시계열 | **ABSENT** | SoD 전용 Snapshot/Evidence grep 0(GT② §2) |

**핵심**: 유일한 시간축 인접 통제는 Mapping self-approval(`Mapping.php:268-271`)이나 이는 **dual-control(4-eyes, 2인 필요)**이며 SoD/Temporal SoD와 개념적으로 인접하나 별개다(ADR §D-3·GT② B-2).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **평가 축**: SPEC §7 5축(동일 일자/Session/Transaction/Approval Cycle/지정 기간). 특히 동일 approval cycle 내 동일 actor의 생성 후 승인을 차단.
- **선례 재활용(개명 금지)**: `Mapping.php:268-271` self-approval 차단 패턴을 Transaction Conflict(생성↔승인 분리·§10)의 **선례로 재사용**하되, dual-control(정족수)과 Temporal SoD를 개념 분리(ADR §D-3·GT② B-2).
- **순신규**: Temporal(동일 approval cycle 생성+승인 차단)은 시간창 substrate와 **무관·순신규**(ADR §D-4). 시간창 데이터 기반은 Conflict Snapshot(§23) 시계열 신설 선행.
- **해소**: Severity(§15)·Resolution(§16). Warning Contract(§34)의 "Temporary Exception Expiring"·Error(§33) SOD_CONFLICT_DETECTED.
- **테넌트 격리**: `index.php:614-619` X-Tenant-Id 서버도출 강제 위에서 테넌트별 시계열 평가(§36).
- **증거**: 시간축 충돌 이벤트는 SecurityAudit 불변체인(`SecurityAudit.php:14-33`) 재활용(ADR §D-5).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **시간창 쿨다운 ≠ Temporal SoD**: `AbTesting.php:161`(DCO 쿨다운)·`AutoCampaign.php:622`(explore 쿨다운)·`PgSettlement.php:221`(정산 페어링)은 전부 무관한 시간창 로직이지 생성↔승인 시간분리 SoD 아님(GT② B-3).
- **Maker-Checker = dual-control ≠ Temporal SoD**: `Mapping.php:268-271`(self-approval)·`Alerting.php:642-650`(정족수)는 "두 명이 필요"(dual-control)이지 "동일인이 시간축에 걸쳐 상충행위"(Temporal SoD)가 아님(GT② B-2).
- **단일승인 게이트**: `AdminGrowth.php:1294`·`:1313-1331`은 `requested_by` 저장하나 self-approval 비교·정족수 없음 → SoD 미성립(GT② B-5·GT① §G).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규)**. Temporal SoD 시간창 차단(`same.day|created_by.*approv`) grep 0(GT② §2). 시간축 인접 substrate = Mapping self-approval(dual-control·재활용 선례)뿐.
- **선행 의존**: Conflict Snapshot(§23) 시계열 데이터 기반 신설 선행(ADR §D-4). Part 1~3-9 인증 후 실구현(BLOCKED_PREREQUISITE).
- **정직 분리**: Mapping self-approval은 dual-control이지 Temporal SoD 아님. 존재하는 시간창(AbTesting/AutoCampaign/PgSettlement)은 전부 비-SoD decoy(ADR §D-4·GT② B-3).
- **무후퇴·Extend-only**: maker-checker 선례·SecurityAudit 유지·병행.
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진 구현은 별도 RP-track 승인세션 대상.
