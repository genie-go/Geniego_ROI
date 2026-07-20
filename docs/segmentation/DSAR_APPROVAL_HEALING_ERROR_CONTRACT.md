# DSAR — Self-Healing Error Contract (Part 3-20 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Error Contract는 self-healing 파이프라인이 fail-closed로 거부할 때 반환하는 **7종의 결정적 에러코드**를 규정한다. 각 코드는 안정적(stable)·기계판독 가능·감사 추적 가능해야 한다.

| 에러코드 | 발생 조건 |
|---|---|
| `HEALTH_CHECK_FAILED` | health signal이 임계 미달·복구 성공 판정 불가 |
| `RECOVERY_PLAN_INVALID` | 복구 계획이 스키마·불변식 위반 |
| `AUTO_REMEDIATION_BLOCKED` | Safety Guardrail 위반으로 자동복구 차단 |
| `RECOVERY_APPROVAL_REQUIRED` | maker-checker 승인 미완 상태에서 복구 시도 |
| `RECOVERY_EXECUTION_FAILED` | 복구 실행 중 상태변경 실패·부분 적용 |
| `CONFIGURATION_HEALING_FAILED` | 구성 자가치유 규칙 적용 실패 |
| `GOVERNANCE_HEALTH_CRITICAL` | 거버넌스 종합 건전성 지표 임계 붕괴 |

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| HEALTH_CHECK_FAILED 발생원 | health/지표 수집 (`SystemMetrics.php:67-76`·`Health.php:41-42`) | **baseline signal만** — 에러코드 미발생 |
| RECOVERY_APPROVAL_REQUIRED | maker-checker 미승인 경로 (`Mapping.php:268-271`) | **baseline만** — 복구 승인 코드 아님 |
| AUTO_REMEDIATION_BLOCKED | Safety Guardrail(§26·§27) 산출물 | 설계 대상 |
| 나머지 4종 | (발생원·던지는 지점 부재) | ABSENT |

## 3. 설계 계약

- **에러코드 안정성**: 7종 코드는 문자열 상수로 고정하며, 클라이언트·감사 로그·경고 계약(§29)이 동일 코드를 참조한다. 코드 변경은 SPEC canonical 개정으로만 허용.
- **HEALTH_CHECK_FAILED**: health 판정은 `SystemMetrics.php:67-76`·`Health.php:41-42`의 지표를 signal로 삼아 임계 미달 시 발생. 신규 health 파이프라인 신설 금지 — 기존 지표 확장.
- **RECOVERY_APPROVAL_REQUIRED**: maker-checker 미승인 상태(`Mapping.php:268-271` 패턴 재사용)에서 복구가 시도되면 이 코드로 fail-closed. §26 Runtime Guard의 Recovery Without Approval와 1:1 대응.
- **AUTO_REMEDIATION_BLOCKED**: §26 Runtime Guard·§27 Static Lint의 Safety Guardrail 위반은 모두 이 단일 코드로 수렴 — Guardrail 판정의 정본 에러.
- **감사 연계**: 모든 에러 발생은 append-only 감사 원장에 기록되어 사후 추적 가능해야 하며, 해시체인 baseline 위에 구축.
- **부분 적용 방지**: `RECOVERY_EXECUTION_FAILED`는 복구가 부분 적용된 경우 롤백 지점으로의 복귀를 강제(멱등·원자성).

## 4. 판정

**ABSENT (grep 0)** — 7종 에러코드 전부 신규이며, 이를 던지는 발생원·파이프라인 부재. 재사용 가능한 substrate는 health signal(`SystemMetrics.php:67-76`·`Health.php:41-42`)·maker-checker 미승인 경로(`Mapping.php:268-271`) baseline에 한정. `AUTO_REMEDIATION_BLOCKED`는 Safety Guardrail 수렴 코드로 §26·§27과 정합. 나머지는 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
