# DSAR — Self-Healing Runtime Guard (Part 3-20 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Self-Healing Runtime Guard는 **자율 복구(auto-remediation)가 실행되기 직전**, 승인·안전성·멱등성 불변식을 런타임에 검증하여 위반 시 복구를 차단(fail-closed)하는 관문이다. §26은 6개 위반 클래스를 규정한다.

| 위반 클래스 | 계약 |
|---|---|
| Unauthorized Recovery | 복구 실행 주체가 승인된 정책 권한을 보유하지 않으면 차단 |
| Recovery Loop | 동일 복구 대상에 대한 순환 재실행(A→B→A) 탐지 시 차단 |
| Infinite Retry | 재시도 상한(backoff budget) 초과 시 차단·escalate |
| Invalid Rollback | 롤백 지점이 유효하지 않거나 무결성 미검증이면 차단 |
| Snapshot Tampering | 복구 스냅샷의 서명/해시체인 불일치 시 차단 |
| Recovery Without Approval | maker-checker 승인 없이 상태변경 복구 실행 시 차단 |

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| Snapshot Tampering 가드 | append-only 해시체인 검증 `SecurityAudit.php:56-68` (verify) | **baseline만** — 복구 스냅샷 대상 아님 |
| Recovery Without Approval | maker-checker 승인 관문 `Mapping.php:240`·확정 경로 `Mapping.php:287` | **baseline만** — 매핑 승인이지 복구 승인 아님 |
| Unauthorized Recovery | (복구 주체 권한 판정기 부재) | ABSENT |
| Recovery Loop / Infinite Retry | (복구 실행기·재시도 예산 부재) | ABSENT |
| Invalid Rollback | (롤백 지점 레지스트리 부재) | ABSENT |

## 3. 설계 계약

- **Guard 진입점**: 모든 auto-remediation 실행 요청은 Runtime Guard를 단일 관문으로 통과한다. Guard는 6개 위반 클래스를 순서대로 평가하고, 하나라도 위반이면 `AUTO_REMEDIATION_BLOCKED`(§28)으로 fail-closed.
- **Snapshot Tampering**: 복구 스냅샷은 `SecurityAudit.php:56-68`의 해시체인 verify 패턴을 **확장 재사용**한다 — 신규 검증엔진 신설 금지. 스냅샷 preimage(대상 상태 + ts + actor)를 체인에 append하고, 복구 직전 verify() 재확인.
- **Recovery Without Approval**: 상태변경을 수반하는 복구는 `Mapping.php:240`의 maker-checker를 **선행 조건**으로 삼는다. 승인 없는 복구는 관문에서 거부되며 확정 경로(`Mapping.php:287`)만 통과.
- **Unauthorized Recovery**: 복구 주체 권한은 Part 3 상위 Authorization Registry에 위임(BLOCKED_PREREQUISITE — 선행 foundation 부재).
- **Recovery Loop / Infinite Retry**: 복구 대상별 실행 원장(append-only)에 이전 복구 이력을 기록하고, 순환·재시도 예산을 관문에서 판정. 원장 무결성은 해시체인 baseline 위에 구축.
- **멱등성**: 동일 복구 요청의 재수신은 no-op — 이미 확정된 복구는 재실행하지 않는다.

## 4. 판정

**ABSENT (grep 0)** — Self-Healing Runtime Guard·복구 실행기·재시도 예산·롤백 지점 레지스트리 전무. 재사용 가능한 substrate는 2건에 한정: Snapshot Tampering=`SecurityAudit.php:56-68` verify baseline, Recovery Without Approval=`Mapping.php:240`·`Mapping.php:287` maker-checker baseline. 나머지 4개 위반 클래스(Unauthorized/Loop/Infinite Retry/Invalid Rollback)는 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE (상위 Authorization Registry 선행 부재).
