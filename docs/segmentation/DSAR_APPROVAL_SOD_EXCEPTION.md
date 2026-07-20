# DSAR — Runtime SoD Enforcement: SoD 예외 관리 (APPROVAL_SOD_EXCEPTION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

**APPROVAL_SOD_EXCEPTION**(SPEC §2 Canonical Entity·§18 Exception Management·§19 Temporary Exception)은 SoD Conflict Matrix가 상충으로 판정한 역할·권한·트랜잭션 조합을 **명시적·기한부·근거기반으로 예외 허용**하는 통제 엔티티다. SPEC §18은 4종 예외를 지원한다: Business Exception · Regulatory Exception · Temporary Exception · Executive Exception. §19 Temporary Exception은 **Duration·Reason·Approval·Evidence 4필드 필수 + 자동 종료(auto-expire)** 를 계약으로 못박는다. 만료된 예외는 §31 Runtime Guard가 `Expired Exception`으로 차단하고 §33 Error Contract `SOD_EXCEPTION_EXPIRED`를 반환한다. 예외는 SoD 강제를 **약화가 아니라 통제된 우회**로, §34 Warning Contract는 `Temporary Exception Expiring`을 사전 경고한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| SoD Exception 전용 워크플로(4종 예외 등록·자동종료) | **ABSENT (grep 0)** | GT② §2 "SoD 위반 시 추가승인·강화MFA 트리거하는 예외 워크플로 없음". `sod\|segregation\|toxic\|incompatible.?role` 전무(GT② §1) |
| 예외 Evidence·justification 저장 패턴 (재활용 substrate) | **PRESENT** | `AccessReview.php:66-80`(access_review_item DDL)·`:192`(justification 필수 fail-secure)·`:219-224`·`:225`(INSERT·SecurityAudit 연동) — GT① §F |
| 예외 승인 증거 불변체인 (재활용 substrate) | **PRESENT** | `SecurityAudit.php:14-33`(prev_hash→hash_chain append-only)·`:35-41`·`:56-69`(lastHash·verify 변조탐지) — GT① §F |
| Duration/자동종료 시간창 (SoD 전용) | **ABSENT** | 시간창 substrate는 전부 비-SoD decoy(`AbTesting.php:161`·`AutoCampaign.php:622`·`PgSettlement.php:221`·GT② B-3) |
| 예외 승인의 결재분리(maker≠checker) 재활용지점 | **PARTIAL** | `Mapping.php:268-271`(self-approval 차단·dual-control)·`:287`(정족수)만 실성립 — GT① §A. Alerting은 VACUOUS(`Db.php:592-600` maker 부재) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·자동종료/테넌트격리)

- **필수 필드(§19)**: `duration`(유효기간·만료시각)·`reason`(예외 사유)·`approval`(승인 기록)·`evidence`(증거 참조). 4필드 결여 시 등록 거부(fail-closed).
- **예외 유형(§18)**: `business` · `regulatory` · `temporary` · `executive`. 유형별 승인 권한·최대 기간 정책 분리.
- **자동 종료(§19)**: `duration` 경과 시 예외 자동 무효화. 만료 예외로 SoD 상충 시도 → §31 Runtime Guard `Expired Exception` 차단 → §33 `SOD_EXCEPTION_EXPIRED`.
- **증거 기록**: 예외 등록·승인·만료 이벤트는 SecurityAudit 불변체인(`SecurityAudit.php:14-33`)에 append. justification 필수 패턴은 `AccessReview.php:192` 재활용.
- **테넌트 격리(§36 Tenant Isolation)**: 예외는 발급 테넌트 스코프. cross-tenant 예외 금지(`index.php:614-619` X-Tenant-Id 서버도출 강제 재활용).
- **경고(§34)**: 만료 임박 예외는 `Temporary Exception Expiring` 사전 경고. 예외 남용은 §26 Analytics `Exception Usage` 지표로 추적.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **access_review_item justification ≠ SoD Exception**: `AccessReview.php:66-80`은 접근검토 증거 저장 패턴이다. SoD 예외 evidence 필드의 **저장 패턴을 재활용**하되 검토 엔티티를 SoD 예외로 개명·흡수 금지(GT① §F).
- **시간창 쿨다운 ≠ Temporary Exception 자동종료**: `AbTesting.php:161`(DCO 쿨다운)·`AutoCampaign.php:622`(explore 쿨다운)·`PgSettlement.php:221`(정산 페어링)은 비즈니스 시간창이지 SoD 예외 만료 아님(GT② B-3).
- **위임상한 클램프 ≠ 예외**: `TeamPermissions.php:599-621`·`:642-658` assignable 클램프는 권한상승 방지이지 상충역할 예외 허용 아님(GT② B-4).
- **단일승인 게이트 ≠ 예외 승인**: `Catalog.php:2383-2407`(approveQueue)·`AdminGrowth.php:1294`·`:1313-1331`은 self-approval 무검증·정족수 없음 → SoD 예외 승인 워크플로 아님(GT② B-5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT 워크플로 / thin-substrate.** SoD Exception 전용 4종 예외 등록·자동종료·Runtime Guard 연동은 순신규(grep 0·GT② §2).
- **재활용(Extend·개명 금지)**: 예외 evidence·justification = `AccessReview.php:66-80`·`:192` 패턴 · 예외 증거 불변기록 = `SecurityAudit.php:14-33`·`:56-69` · 결재분리 선례 = `Mapping.php:268-271` dual-control(ADR D-5) · 테넌트 격리 = `index.php:614-619`.
- **선행 의존(BLOCKED_PREREQUISITE)**: Conflict Matrix·Runtime Evaluator(순신규)가 상충 판정을 선행해야 예외가 성립. Part 1~3-9 인증 후 RP-track 실 구현(ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. 본 DSAR은 계약 확정용 설계 명세.
