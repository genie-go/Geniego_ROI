# DSAR — Self-Healing 중앙 레지스트리 (Part 3-20 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## §1. 계약 정의(SPEC) — APPROVAL_SELF_HEALING_REGISTRY

`APPROVAL_SELF_HEALING_REGISTRY`는 인가(authz) 자기치유(Self-Healing)의 **단일 진실원(SoT)**이다. 개별 치유 능력(Healing Capability)을 **선언·발견·중재·계보 추적**하는 중앙 대장으로서, 각 항목은 ⓐ 대상 authz 컴포넌트(PDP/PEP/PIP/Policy/Role/Permission/Dynamic Rule/AI Gov/Federation/Compliance Engine) ⓑ 트리거 조건(health signal → threshold) ⓒ 치유 액션(remediation) ⓓ 승인 정책(auto/maker-checker) ⓔ 롤백 계약 ⓕ 증거 앵커(evidence anchor)를 필드로 갖는다. 레지스트리는 **중복 치유 능력의 등록을 거부**(dedup)하고, 각 능력의 활성/봉인(sealed) 상태를 관리하며, 모든 등록·변경을 불변 감사로 남긴다.

## §2. 실존 substrate 매핑

| 계약 요소 | 현행 실측 | 판정 |
|---|---|---|
| **Self-Healing 능력 레지스트리** | authz 자기치유 능력을 등록·발견·중재하는 중앙 대장 = **grep 0**. `feature_flag`·`connector registry` 계열은 존재하나 authz 치유 도메인 아님 | **ABSENT**(순신설) |
| **치유 트리거(health→remediation)** | 인프라 probe는 `SystemMetrics.php:60`·`:67-76`(8-module 집계)·`Health.php:27`가 ok/degraded/down 산출하나 **신호만 방출**할 뿐 자동 교정 액션에 배선된 곳 없음 | **ABSENT**(신호원은 §3 참조) |
| **승인 정책(auto/maker-checker)** | 인접 maker-checker 실재 — `Mapping.php:240`(승인)·`:268-271`(자기승인 403)·`:287`(재승인 409). 단 치유 능력 승인이 아니라 매핑 승인 | PARTIAL(패턴 재사용 대상·치유 미배선) |
| **증거 앵커** | 불변 해시체인 `SecurityAudit.php:14`(log)·`:56-68`(verify) 실재 → 레지스트리 변경 증거 앵커로 재사용 가능 | PRESENT(앵커만) |
| **테넌트 격리** | `AccessReview.php:188-194`·`:210-215` 테넌트 스코프 강제 선례 | PRESENT(패턴) |

## §3. 설계 계약(규칙)

- **R1(SoT 유일성)**: 치유 능력은 이 레지스트리에만 선언한다. `AnomalyDetection`/`ModelMonitor`/`Alerting` 등에 치유 로직을 산재시키지 않는다(중복 엔진 금지·헌법 Golden Rule = Extend).
- **R2(신호≠집행)**: `SystemMetrics.php:60`·`Health.php:27`의 health 신호를 **읽되**, 치유 액션은 반드시 레지스트리 등록 능력을 경유한다. 신호 → 자동 remediation 직결 배선 금지.
- **R3(dedup)**: 동일 (컴포넌트, 트리거, 액션) 3튜플 중복 등록 거부.
- **R4(승인 게이트)**: 파괴적/권한상승 치유는 `Mapping.php:240`의 maker-checker 패턴을 상속 — 자동 집행 금지, 봉인 상태 기본.
- **R5(증거)**: 모든 등록·활성화·집행을 `SecurityAudit.php:14`로 불변 기록, `:56-68` verify 대상에 포함.
- **R6(격리)**: 레지스트리 조회·변경은 `AccessReview.php:188-194` 테넌트 스코프 강제.

## §4. 판정

**ABSENT-greenfield**. authz self-healing 중앙 레지스트리는 코드 전무(grep 0)이며 **순신설** 대상이다. 인프라 health probe(`SystemMetrics.php:60`·`Health.php:27`)는 실재하나 authz-도메인 치유가 아닌 인프라 가용성 신호이며, 증거(`SecurityAudit.php`)·maker-checker(`Mapping.php`)·테넌트 격리(`AccessReview.php`)는 재사용 substrate로 PRESENT/PARTIAL이다. 본 문서는 **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 = §3 Health Assessment/§2 Health Check 계약). 구현은 별도 승인 세션.
