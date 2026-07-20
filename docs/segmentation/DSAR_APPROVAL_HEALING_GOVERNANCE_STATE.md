# DSAR — Continuous Governance State (Part 3-20 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## §4.1 계약 정의(SPEC) — APPROVAL_GOVERNANCE_STATE

`APPROVAL_GOVERNANCE_STATE`는 인가 거버넌스의 **지속적(Continuous) 준수 상태를 상시 표상**하는 상태 객체다. 스냅샷 감사(point-in-time)가 아니라 **연속 평가**로서, 8개 거버넌스 차원을 지속 측정한다: Policy Compliance · Runtime Consistency · Least Privilege · Zero Trust · Separation of Duties(SoD) · Just-In-Time(JIT) · Audit Readiness · Evidence Integrity. 각 차원은 현재 준수도·이탈(drift)·마지막 평가 시각·증거 앵커를 보유하며, 이탈 발생 시 §1 레지스트리 치유 트리거로 연결되고 §3 Assessment의 Compliance Engine 입력이 된다.

## §4.2 실존 substrate 매핑

| 거버넌스 차원 | 현행 실측 | 판정 |
|---|---|---|
| **지속 거버넌스 상태 객체** | 8차원을 상시 표상·연속 평가하는 상태 엔진 = **grep 0** | **ABSENT**(순신설) |
| **Policy Compliance(준비도)** | `Compliance.php:53`(posture 진입)·`:120`(readiness_pct 가중 산출)·`:124`(스코어카드) — 인접 **point-in-time** 준비도. 연속 평가 아님 | PARTIAL(인접·연속화 필요) |
| **Evidence Integrity** | `SecurityAudit.php:56-68`(verify: 해시체인 재계산·broken_at) — 증거 무결성 실측 실재 | PRESENT(재사용) |
| **Audit Readiness** | `SecurityAudit.php:14`(append-only log)·`:25-31`(prev_hash 체인)·`AccessReview.php:219-222`·`:225`(검토 이력 영속) | PRESENT(앵커) |
| **SoD / maker-checker** | `Mapping.php:209`·`:240`·`:268-271`(자기승인 403)·`:287`(재승인 409) — 직무분리 실측 선례 | PARTIAL(패턴·거버넌스 상태 미표상) |
| **Least Privilege / 접근 재검토** | `AccessReview.php:13-24`·`:141-171`·`:180-242`(revoke·justification 필수·상태 기록) | PARTIAL(주기 검토·연속 아님) |
| **Runtime Consistency / Zero Trust / JIT** | 런타임 일관성·제로트러스트·JIT를 거버넌스 상태로 표상하는 코드 = grep 0 | **ABSENT** |
| **테넌트 격리** | `AccessReview.php:188-194`·`:210-215`·`Compliance.php:50` 테넌트 스코프 강제 | PRESENT |

## §4.3 설계 계약(규칙)

- **R1(연속≠스냅샷)**: `Compliance.php:53`·`:120` posture는 요청시점 스코어카드다. Governance State는 이를 **연속 평가로 승격**하되 재구현하지 않고 소비·확장한다(중복 엔진 금지).
- **R2(증거 재사용)**: Evidence Integrity 차원은 `SecurityAudit.php:56-68` verify를 **직접 소비**한다 — 별도 무결성 엔진 신설 금지.
- **R3(SoD/LP 승격)**: SoD는 `Mapping.php:268-271`·`:287`, Least Privilege는 `AccessReview.php:180-242` 실측을 차원 신호원으로 삼는다.
- **R4(격리)**: 상태 조회·집계는 `AccessReview.php:188-194`·`Compliance.php:50` 테넌트 스코프 강제. 전역 노출 = fail-closed.
- **R5(치유 연계)**: 차원 이탈은 §1 레지스트리 트리거로만 연결한다 — Governance State가 직접 remediation 집행 금지(신호≠집행).
- **R6(무후퇴)**: 현행 posture 산출(`Compliance.php:120`)·verify(`SecurityAudit.php:56-68`) 동작 후퇴 금지.

## §4.4 판정

**ABSENT-greenfield**. 8개 거버넌스 차원을 상시 표상·연속 평가하는 지속 거버넌스 상태 엔진은 코드 전무(grep 0)이며 **순신설**이다. 인접 substrate로 Policy Compliance 준비도(`Compliance.php:53`·`:120`)는 point-in-time 패턴으로 PARTIAL, Evidence Integrity(`SecurityAudit.php:56-68`)·Audit Readiness(`SecurityAudit.php:14`·`AccessReview.php:219-222`)·테넌트 격리는 PRESENT하여 재사용·승격 대상이다. Runtime Consistency/Zero Trust/JIT는 ABSENT. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 = §1 레지스트리·§3 Assessment 계약). 구현은 별도 승인 세션.
