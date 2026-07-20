# DSAR — Approval Recovery Evidence (Part 3-20 §19·§31 Immutable Recovery History)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_EVIDENCE

자기치유 Recovery의 **각 단계가 실제로 발생했음을 증명하는 불변 사실 기록**. Snapshot(§18)이 "무엇을
목표로 복원하는가"라면, Evidence는 "탐지→승인→집행→검증→결과가 어떻게 일어났는가"의 감사 가능한 증거
사슬(evidence chain)이다. §31 Immutable Recovery History는 이 증거가 append-only로 축적되어 사후 위·변조
불가능하게 보존될 것을 요구한다. Part 3-20 §19는 다음 5종 증거를 규정한다.

| # | Evidence 종류 | 정의 |
|---|--------------|------|
| E1 | Detection Evidence | anomaly(§6) 탐지 사실·신호·baseline 이탈 근거 |
| E2 | Approval Evidence | maker-checker 승인·거부·정족수 충족 사실(승인 경로 추적) |
| E3 | Execution Evidence | remediation 집행 액션·대상 principal·변경 전/후 사실 |
| E4 | Validation Evidence | 집행 후 상태가 목표 스냅샷에 부합함을 검증한 사실 |
| E5 | Recovery Result | 복원 최종 판정(성공/부분/실패)·잔여 리스크 |

APPROVAL_RECOVERY_EVIDENCE는 **불변(append-only) 레코드**이며 조치를 수행하지 않는다(집행은 §15 책임).
증거의 기록·보존·검증까지가 §19의 책임 경계다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| recovery evidence 스키마(E1~E5) | (없음) | ABSENT — grep 0 |
| append-only 증거 기록·해시체인 | SecurityAudit 해시체인(`SecurityAudit.php:14-68`) | **PRESENT-substrate**(재사용 후보) |
| 증거 무결성 검증(§31) | 해시체인 재계산 verify(`SecurityAudit.php:56-68`) | **PRESENT-substrate** |
| Access/리뷰 증거 표면 | AccessReview 증거(`AccessReview.php:225`·`:225-233`) | PARTIAL(리뷰 증거·recovery 증거화 안 됨) |

## 3. 설계 계약

- **판정=PRESENT-substrate**: recovery evidence **도메인 스키마**는 grep 0(ABSENT)이나, 그 핵심 요구인
  **불변·tamper-evident 증거 사슬**은 `SecurityAudit.php:14-68` append-only 해시체인으로 이미 실재한다.
  본 계약은 이 substrate를 recovery evidence로 **확장**한다(엔진 신설 아님).
- **무결성(§31 Immutable Recovery History)**: 증거 사슬의 위·변조 불가능성은 `SecurityAudit.php:56-68`
  해시체인 재계산 verify를 정본으로 삼는다. broken_at 반환이 곧 증거 훼손 탐지.
- **증거≠집행**: §19는 사실 기록에서 멈춘다. Execution Evidence(E3)는 §15 집행의 사후 사실일 뿐,
  본 계약이 remediation을 수행하지 않는다.
- **Explainable**: E1~E5 각 payload에 baseline·정족수·전/후 상태를 명시해 감사 추적 가능하게 한다.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221`·`:273` — ML 모델 모니터/증거. authz recovery 증거 아님. 흡수 금지.
- `PgSettlement.php:215` — 재무 정산 증거. 인가 복원 증거와 도메인 상이. 별개 관심사.
- `GraphScore.php` — 데이터 score. 권한 복원 증거 아님. 흡수 금지.

## 5. 판정

**PRESENT-substrate** (도메인 스키마 ABSENT·불변 증거 substrate PRESENT). recovery evidence 전용 스키마
(E1~E5)는 부재하나, tamper-evident 증거 사슬 자체는 SecurityAudit 해시체인(`SecurityAudit.php:14-68`,
검증 `:56-68`)으로 실재하며, 리뷰 증거 표면(`AccessReview.php:225`)이 인접 substrate다. §31 Immutable
Recovery History는 이 해시체인을 **확장**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE
(§15·§18 선행 계약 필요).
