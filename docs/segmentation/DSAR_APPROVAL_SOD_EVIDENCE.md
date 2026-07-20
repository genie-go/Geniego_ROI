# DSAR — Runtime SoD Enforcement: 충돌 증거 (APPROVAL_SOD_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_EVIDENCE`는 충돌평가 1건의 감사가능 증거 레코드다(SPEC §24). 저장 6종:

| 필드 | SPEC §24 항목 | 목적 |
|---|---|---|
| Conflict Rule | 적용된 충돌 규칙 | 어느 규칙에 걸렸는가 |
| Runtime Evaluation | 매 요청/승인 평가 결과(§22) | 언제·무엇을 평가했는가 |
| Policy Decision | Block/Challenge/Approval 등 결정(§16) | 어떻게 해소했는가 |
| Exception | 적용된 예외(§18~19) | 예외 근거·기간 |
| Approval | 관련 승인 이력 | 누가 승인했는가 |
| Audit | 불변 감사 연결 | 변조탐지 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Evidence 필드 | 실존 근거 | 판정 |
|---|---|---|
| Audit(불변) | SecurityAudit `log()`/INSERT prev_hash→hash 체인 `SecurityAudit.php:14-33`·lastHash `:35-41`·verify hash_equals `:56-69` | **PRESENT(재활용 기반)** |
| Exception 증거 패턴 | access_review_item DDL/INSERT `AccessReview.php:66-80`·`:219-224`·SecurityAudit 연동 `:225`·justification fail-secure `:192` | PRESENT(재활용) |
| Approval(dual-control) | Mapping self-approval 차단 `Mapping.php:268-271`·정족수 `:287`·dedup `:278-283`·actorId fail-closed `:186-190`·`:246-250` | PRESENT(인접·SoD 아님) |
| Approval(VACUOUS) | Alerting 정족수 `Alerting.php:642-650`·approved-only `:684-688`·actorId `:42-57`·`:598-606` — maker 부재 `Db.php:592-600`+생산자 0 | PARTIAL(VACUOUS·기존확정) |
| Exception 보상통제 | break-glass `UserAuth.php:790-801`·MFA `:929-961`·`:940-945` | PRESENT(재활용) |
| Conflict Rule / Runtime Evaluation / Policy Decision | SoD 충돌 이벤트 전용 Evidence 스키마 grep 0(GT② §2 ABSENT행·ADR 2.2) | **ABSENT(grep 0)** |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **추가전용·불변**: Evidence는 append-only로 SecurityAudit 해시체인(`SecurityAudit.php:14-33`) 위에 기록·verify(`:56-69`)로 변조탐지. access_review_item justification 필수(`AccessReview.php:192`) 패턴을 SoD Exception 근거 필수로 재활용.
- **Runtime Evaluation ≤10ms**: 매 요청/승인/민감행위 평가 증거 생성(SPEC §22·§38). 평가 결과는 Digest(§25) 입력.
- **Approval 개념 분리**: Mapping(`:268-271`)은 dual-control(2인) 증거이지 SoD(1인 상충역할) 증거 아님(ADR D-3·GT② B-2) — 흡수·개명 금지.
- **테넌트 격리**: 증거는 auth_tenant(`index.php:608-612`·`:614-619`) 격리.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **menu_audit_log ≠ SoD Evidence**: `AdminMenu.php:123-140`·`:200`·`:216`·migration `20260526_168_102_create_menu_audit_log.sql:6-24`는 메뉴 거버넌스 체인(GT② B-7)이지 충돌 증거 아님. SecurityAudit(범용)과 별개 관심사.
- **Alerting VACUOUS 재플래그 금지**: maker 부재(`Db.php:592-600`)+생산자 0은 기존 확정(`APPROVAL_CHAIN_TEST_PLAN.md:172`·`APPROVAL_CHAIN_SECURITY_AND_GUARDS.md:385`) — Part 3-10은 설계만·수정 아님(ADR D-7).
- **AdminGrowth 단일승인 ≠ SoD 증거**: `AdminGrowth.php:1294`·`:1313-1331`은 decided_by만 기록·self-approval 비교 없음(GT② B-5) → 결재분리 증거 미성립.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **NOT_CERTIFIED · 코드 0**: Conflict Rule/Runtime Evaluation/Policy Decision 전용 Evidence 스키마 = 순신규(grep 0).
- **재활용(Extend)**: SecurityAudit 불변체인(`SecurityAudit.php:14-33`·`:56-69`)·access_review 증거패턴(`AccessReview.php:66-80`·`:192`)·break-glass/MFA(`UserAuth.php:790-801`·`:929-961`) 위에 SoD Evidence층 신설.
- **선행 의존**: Snapshot(§23)·Runtime Evaluator 실 구현 후에만 유효 증거 생성(BLOCKED_PREREQUISITE). Alerting maker 배선은 SoD 실 엔진 세션 검토(ADR D-3).
