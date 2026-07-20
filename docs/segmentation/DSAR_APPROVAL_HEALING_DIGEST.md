# DSAR — Approval Recovery Digest (Part 3-20 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_DIGEST

개별 Recovery Snapshot(§18)·Evidence(§19)·Analytics(§21)가 산발한 원자 레코드를 **하나의 결정용 요약
정본(single decision-grade summary)**으로 압축한 파생 산출물. 거버넌스 운영자·감사자가 "이번 치유 사이클에서
무엇이 언제 왜 어떻게 복원되었고 남은 리스크는 무엇인가"를 한 화면에서 판단하도록, 여러 원본을 손실 없이
집약(fold)한다. Part 3-20 §20은 digest의 입력·불변성·재현성을 규정한다.

| # | Digest 입력 | 정의 |
|---|------------|------|
| D1 | Recovery(집행) | §15 Recovery Workflow의 사이클 실행 사실 요약 |
| D2 | Snapshot | §18 목표 스냅샷(System State/Version/Timestamp/Outcome) 참조 |
| D3 | Evidence | §19 증거 사슬(Detection/Approval/Execution/Validation/Result) 집약 |
| D4 | Analytics | §21 지표(MTTD/MTTR/성공률 등)의 사이클 스냅 값 |

Digest는 **원본에서 결정론적으로 파생**되어야 하며(동일 입력→동일 digest), 원본을 대체·변경하지 않는다
(read-only fold). digest 자체도 불변으로 보존되어 사후 재현·대조가 가능해야 한다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| recovery digest 스키마(D1~D4) | (없음) | ABSENT — grep 0 |
| 입력 D1 Recovery | §15 substrate 부재 | ABSENT(선행 미충족) |
| 입력 D2 Snapshot | §18 substrate 부재 | ABSENT(선행 미충족) |
| 입력 D3 Evidence | SecurityAudit 해시체인(`SecurityAudit.php:43-53` ensure 스키마) | 참고만(evidence substrate·digest 아님) |
| 입력 D4 Analytics | §21 substrate 부재 | ABSENT(선행 미충족) |

## 3. 설계 계약

- **판정=ABSENT**: recovery digest 도메인은 grep 0으로 전무하다. Recovery/Snapshot/Evidence/Analytics를
  결정용 요약으로 접는 파생 산출물은 존재하지 않는다.
- **순신설·파생 전용**: digest는 원본을 만들지 않고 §15·§18·§19·§21 산출물을 **결정론적으로 fold**하는
  read-only 파생물로 신설한다. Evidence 저장 스키마(`SecurityAudit.php:43-53`)는 입력 형태 **참고만** 하며,
  digest 로직을 SecurityAudit에 흡수하지 않는다.
- **재현성**: 동일 입력 집합에 대해 동일 digest가 산출되어야 하며(멱등), digest도 불변 보존해 사후 대조 가능.
- **선행 의존**: D1·D2·D4의 substrate(§15·§18·§21)가 모두 ABSENT이므로 digest는 다중 선행 계약에 종속된다.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221`·`:273` — ML 모델 요약/모니터. authz digest 아님. 흡수 금지.
- `PgSettlement.php:215` — 재무 정산 요약. 인가 복원 digest와 도메인 상이. 별개 관심사.
- `GraphScore.php` — 데이터 score 요약. 권한 복원 digest 아님. 흡수 금지.

## 5. 판정

**ABSENT** (recovery digest grep 0). Recovery/Snapshot/Evidence/Analytics를 결정용으로 접는 파생 요약은
부재하며, 인접 참고는 SecurityAudit 증거 스키마(`SecurityAudit.php:43-53`)뿐이다(digest 아님). 입력 4종 중
D1·D2·D4의 substrate가 모두 부재하는 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE
(§15·§18·§19·§21 선행 계약 필요).
