# DSAR — Authorization Recovery Workflow (Part 3-20 §15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_WORKFLOW

Anomaly Event(§6)와 Remediation Plan(§7)을 잇는 **상태기계(state machine)**. 인가 이상으로부터의
회복을 8단계로 규율하며, 각 단계 전이는 불변 감사 레코드를 남긴다.

| # | 단계 | 책임 |
|---|------|------|
| 1 | Detection | §6 anomaly event 수신·workflow 인스턴스 생성 |
| 2 | Classification | anomaly 클래스·심각도·영향범위 판정 |
| 3 | Planning | §7 remediation plan 바인딩(AUTO/MANUAL 등급 확정) |
| 4 | Validation | plan 실행가능성·부작용·멱등성 사전검증 |
| 5 | Approval | MANUAL 등급은 maker-checker 승인 게이트 통과 필수 |
| 6 | Execution | AUTO 조치 집행 / 승인된 MANUAL 조치 집행 |
| 7 | Verification | 조치 후 baseline 복귀·anomaly 해소 재확인 |
| 8 | Closure | 결과 확정·불변 종결 레코드·미해소 시 재-Detection 순환 |

전이는 단방향 진행이 원칙이되, Verification 실패 시 Classification/Planning으로 되돌아가는
보정 루프를 허용한다. 상태·전이·타임스탬프는 append-only.

## 2. Substrate 매핑

| SPEC 단계 | 현존 substrate | 상태 |
|-----------|----------------|------|
| Detection | AccessReview 탐지(`AccessReview.php:87`) | PARTIAL(정기 스냅샷) |
| Approval | maker-checker 정족수(`Mapping.php:240`·`Mapping.php:246-250`) | 재사용 후보 |
| Execution(session) | inline session GC(`UserAuth.php:989`) | PARTIAL |
| 상태기계 전체 | (없음) | ABSENT — recovery workflow grep 0 |
| 전이 감사 | `SecurityAudit.php:14-68` append-only | 재사용 후보 |

## 3. 설계 계약

- **순신설**: 8단계 recovery workflow 상태기계는 grep 0으로 부재. 신규 도입한다.
- **승인 단계 재사용**: 5단계 Approval은 기존 maker-checker(`Mapping.php:240`) 정족수 계약을
  재사용해 중복 승인엔진을 만들지 않는다(단일 게이트 원칙).
- **등급 존중**: §7 plan의 AUTO는 5단계 skip, MANUAL은 5단계 필수. workflow가 plan 등급을 재정의 불가.
- **순환 안전**: 8단계 Closure에서 미해소 시 §6로 재진입하되 무한루프 방지 상한을 명시.
- **불변 전이**: 모든 단계 전이는 `SecurityAudit.php:56-68` 해시체인으로 tamper-evident 기록.

## 4. KEEP_SEPARATE

- `Alerting.php:610-657`·`:660` — 광고 actuation 스켈레톤. recovery execution으로 전용 금지.
- `AutoCampaign.php:892` — 마케팅 자동화 워크플로우. authz recovery 아님.
- `ModelMonitor.php:221`·`:244` — ML drift 모니터. recovery 상태기계 아님.

## 5. 판정

**ABSENT** (recovery workflow grep 0). 상태기계 부재. Approval 단계만 maker-checker(`Mapping.php:240`)로
재사용 가능하고 Detection은 AccessReview(`AccessReview.php:87`)에 부분 의존. 순신설. 코드 변경 0 ·
NOT_CERTIFIED · BLOCKED_PREREQUISITE(§6·§7 선행).
