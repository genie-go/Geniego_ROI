# DSAR — Approval Recovery Snapshot (Part 3-20 §18·§31 Snapshot Integrity)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_SNAPSHOT

자기치유(self-healing) Recovery Workflow가 착수·집행·검증되기 위한 **정지 시점의 권한 상태
정본(point-in-time authorization state)**. 인가 상태가 anomaly(§6)로 이탈해 Remediation이 실행될 때,
"어떤 정상 상태로 복원할 것인가"를 규정하는 기준선(baseline snapshot)이자, 복원 이후 "무엇이 바뀌었는가"를
대조하는 before/after 앵커다. Part 3-20 §18은 스냅샷이 다음 5요소를 불변으로 담을 것을 규정한다.

| # | 스냅샷 요소 | 정의 |
|---|------------|------|
| S1 | System State | 스냅샷 시점 effective role/permission/policy·활성 session·delegation 상태의 집합 |
| S2 | Recovery Plan | 이 스냅샷을 복원 목표로 삼는 remediation 계획 참조(§7 산출물 링크) |
| S3 | Version | 스냅샷 스키마·정책 baseline 버전(단조 증가·불변 식별자) |
| S4 | Timestamp | 스냅샷 확정 UTC 시각(변조 불가·해시체인 앵커) |
| S5 | Outcome | 스냅샷을 목표로 한 복원의 최종 결과(성공/부분/실패·미확정 시 pending) |

APPROVAL_RECOVERY_SNAPSHOT은 **불변(append-only) 레코드**이며 그 자체로 상태를 변경하지 않는다
(복원 집행은 §15 Recovery Workflow의 책임). §31 Snapshot Integrity는 스냅샷의 위·변조 불가능성을 요구한다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| recovery snapshot 스키마(S1~S5) | (없음) | ABSENT — grep 0 |
| System State 캡처(S1) | AccessReview 정기 스냅샷 표면(`AccessReview.php:141-171`) | PARTIAL(리뷰 관점 열람·recovery baseline 아님) |
| 불변 저장·Version·Timestamp(S3·S4) | SecurityAudit append-only 해시체인(`SecurityAudit.php:14-68`) | 재사용 후보(현재 recovery snapshot 미기록) |
| 무결성 검증(§31) | 해시체인 재계산 verify(`SecurityAudit.php:56-68`) | 재사용 후보 |

## 3. 설계 계약

- **판정=ABSENT**: recovery snapshot 도메인은 grep 0으로 전무하다. System State/Recovery Plan/Version/
  Timestamp/Outcome 5요소를 담는 정지 시점 정본은 존재하지 않는다.
- **불변성은 순신설**: 스냅샷의 tamper-evident 저장은 `SecurityAudit.php:14-68` append-only 해시체인 계약을
  **확장**해 신규 레코드 타입으로 도입한다(§31 Snapshot Integrity = `SecurityAudit.php:56-68` verify 재사용).
- **캡처≠복원**: §18은 상태 정본 확정에서 멈춘다. 복원 집행은 §15로 넘길 뿐 스냅샷 자체는 읽기 앵커로 불변.
- **Explainable**: Version·baseline·Recovery Plan 링크를 payload에 명시해 복원 근거를 추적 가능하게 한다.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221`·`:273` — ML drift/모델 스냅샷. 인가 상태 스냅샷과 도메인 상이. 흡수 금지.
- `PgSettlement.php:215` — 재무 정산 스냅샷. authz recovery snapshot 아님. 별개 관심사.
- `GraphScore.php` — 데이터 score 스냅샷. 권한 baseline 아님. 흡수 금지.

## 5. 판정

**ABSENT** (recovery snapshot grep 0). System State/Recovery Plan/Version/Timestamp/Outcome 정본은 부재하며,
최근접은 AccessReview 정기 스냅샷 표면(`AccessReview.php:141-171`)뿐이다(recovery baseline 아님). 불변 저장·
무결성(§31)은 SecurityAudit 해시체인(`SecurityAudit.php:14-68`)을 확장하는 **순신설**. 코드 변경 0 ·
NOT_CERTIFIED · BLOCKED_PREREQUISITE(§7·§15 선행 계약 필요).
