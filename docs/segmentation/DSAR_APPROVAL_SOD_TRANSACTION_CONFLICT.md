# DSAR — Runtime SoD Enforcement: 트랜잭션 충돌 (APPROVAL_SOD_TRANSACTION_CONFLICT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_TRANSACTION_CONFLICT`(SPEC §2·§10)는 **동일인이 특정 트랜잭션의 생성과 승인을 겸하는지**를 차단하는 SoD 하위 엔티티다. SPEC §10 예시:

- Invoice 생성 ↔ Invoice 승인
- Vendor 등록 ↔ Vendor 승인
- User 생성 ↔ User 활성화
- Payment 생성 ↔ Payment 승인

Transaction vs Transaction(§3)·Runtime(§6 승인 요청·결재 처리) 평가 대상이다. **본 엔티티가 5편 중 유일하게 실존 실통제(dual-control)를 인접 선례로 갖는다.**

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 상태 | 근거(파일:라인) |
|---|---|---|
| **Mapping self-approval 차단 (유일 실 SoD-인접·dual-control)** | **PRESENT** | `Mapping.php:268-271` `requested_by===$actor`→403 "self-approval is not allowed (maker-checker)" (GT① §A) |
| 정족수·dedup·fail-closed | PRESENT | 정족수 `Mapping.php:287`·dedup `:278-283`·actorId fail-closed `:186-190`·`:246-250`·익명차단 `:244` (GT① §A) |
| maker 데이터 기반 | PRESENT | `Db.php:632-634` `mapping_change_request`(`requested_by NOT NULL`+`required_approvals INT DEFAULT 2`) (GT① §A) |
| Alerting 트랜잭션 승인 | **VACUOUS** | 정족수 `Alerting.php:642-650`·approved-only `:684-688` 있으나 maker 컬럼 부재 `Db.php:592-600`+생산자(`INSERT action_request`) grep 0 (GT① §B) |
| Transaction SoD (Invoice/Payment/Vendor/User 결재분리) | **ABSENT** | grep 0 (GT② §2) |

판정: **Mapping self-approval만 실성립(dual-control)**, 이는 Transaction Conflict(생성↔승인 분리)의 **인접 선례**다. 그러나 dual-control(2인 필요)≠SoD(1인 상충직무 동시보유). Invoice/Payment/Vendor/User 도메인 결재분리는 ABSENT.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `transaction_type`(Invoice/Payment/Vendor/User·§10)·`create_actor`·`approve_actor`·`conflict_type`(Transaction vs Transaction §3)·`severity`(§15 재무=High/Regulatory)·`resolution_strategy`(§16 Block/Approval Required).
- **평가 계약**: 생성 actor와 승인 actor 동일성 판정을 `Mapping.php:268-271` self-approval 패턴을 **선례로 재사용**하되 SoD(역할충돌)와 dual-control(정족수)을 개념 분리(ADR D-3·GT② §B-2). Runtime(§22 Every Approval) 평가.
- **제약**: Immutable Rule(§36)·Tenant Isolation. Temporal SoD(§7 동일 approval cycle 생성+승인 차단) 연동.
- **증거**: SecurityAudit 체인(`SecurityAudit.php:14-33`) 기록.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Maker-Checker = dual-control ≠ SoD** — `Mapping.php:268-271`·`Alerting.php:642-650`은 "2인 필요"지 "1인 상충직무 동시보유"가 아니다. 인접 substrate 재활용하되 SoD로 개명·흡수 금지(GT② §B-2·ADR D-3).
- **단일승인 게이트 (결재분리 아님)** — `Catalog.php:2383-2407`(approveQueue)=`requirePro`+tenant만·maker 미기록·self-approval 무검증(GT② §B-5).
- **AdminGrowth PARTIAL** — `AdminGrowth.php:1294`·`:1313-1331` `decided_by`만 기록·requested_by↔actor 비교 없음·단일 admin=approved(정족수 없음)→SoD 미성립(GT① §G·GT② §B-5).
- **Alerting VACUOUS는 수정 대상 아님** — maker 부재·생산자 0은 기존 확정 상태. Part 3-10은 설계만·재플래그 아님(ADR D-3·GT② §5).
- **정산 페어링** `PgSettlement.php:221` — Temporal/Transaction SoD 아님(GT② §B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 0.** Transaction Conflict Engine·Invoice/Payment/Vendor/User 결재분리 = **순신규(ABSENT·grep 0)**. 유일 실 인접선례 = Mapping self-approval dual-control(`Mapping.php:268-271`) — 재활용하되 개명 금지. 재활용(Extend) = maker 데이터 기반(`Db.php:632-634`)·SecurityAudit 증거. 선행의존: Conflict Matrix·Temporal SoD(§7) + Part 1~3-9 인증 후 실 구현(BLOCKED_PREREQUISITE). Alerting maker 배선은 실 엔진 세션에서 함께 검토(ADR D-3). 무후퇴: dual-control 통제 유지·병행.
