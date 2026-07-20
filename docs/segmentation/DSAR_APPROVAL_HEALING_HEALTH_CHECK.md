# DSAR — 개별 Authorization Health Check (Part 3-20 §2·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## §2·§3.1 계약 정의(SPEC) — APPROVAL_HEALTH_CHECK

`APPROVAL_HEALTH_CHECK`는 **단일 authz 컴포넌트/불변식(invariant)을 검사하는 최소 단위**다. §3 Health Assessment가 컴포넌트 상태를 집계할 때 소비하는 원자 검사로서, 각 check는 ⓐ 대상(예: PDP 응답성·Policy 로드·Role 그래프 무순환·Permission 정합·PIP 데이터 신선도) ⓑ 측정(latency/count/boolean) ⓒ 임계값 ⓓ 판정(pass/warn/fail) ⓔ 증거를 반환한다. check는 부작용 없이(read-only) 실행되고, 실패는 Assessment로 전파되나 authz 결정을 스스로 차단하지 않는다.

## §2·§3.2 실존 substrate 매핑

| 계약 요소 | 현행 실측 | 판정 |
|---|---|---|
| **원자 probe 단위(read-only·latency·status)** | `SystemMetrics.php:127`(probeDatabase: SELECT 1 round-trip ms + ok/down)·`:261`(단위 probe)·`:323`(단위 probe)·`Health.php:72`(dbProbe) — 컴포넌트당 독립 함수, latency·boolean·증거 반환 | PARTIAL(구조 재사용·인프라 축) |
| **pass/warn/fail 판정** | `SystemMetrics.php:139`·`:155`(ok/down 분기)·`Health.php:41-42`(ok/degraded) → 2단계 실재, warn 미분화 | PARTIAL |
| **부작용 없는 검사** | probe들은 read-only(SELECT 1·filemtime·마이그레이션 조회 `Health.php:99`·`:102`) — 원 액션 비차단 | PRESENT(패턴) |
| **PDP/Policy/Role/Permission check** | authz 불변식(정책 로드·역할 그래프 무순환·권한 정합)을 검사하는 check = **grep 0** | **ABSENT**(순신설) |
| **Role/Permission 정합 원천** | `TeamPermissions.php:618`·`:689`·`:781`(역할·권한 구조) → check가 읽을 PIP 원천 | PRESENT(데이터원) |
| **집계로 전파** | `SystemMetrics.php:417`(cronHealth summary 집계) 패턴으로 Assessment 롤업 | PARTIAL |

## §2·§3.3 설계 계약(규칙)

- **R1(원자성)**: 각 check는 단일 컴포넌트/불변식만 검사한다. 복합 판정은 §3 Assessment 책임.
- **R2(read-only 강제)**: `Health.php:72`·`SystemMetrics.php:127` 패턴 상속 — check는 부작용 0, authz 결정 비차단.
- **R3(구조 상속)**: probe 함수 시그니처(id·status·latency·detail 반환, `SystemMetrics.php:127`·`:261`·`:323`)를 authz check로 확장. 신규 프레임워크 신설 금지.
- **R4(3단계 판정)**: 현행 ok/down·ok/degraded(`SystemMetrics.php:139`·`Health.php:41-42`)를 pass/warn/fail로 정규화.
- **R5(PIP 원천)**: Role/Permission check는 `TeamPermissions.php:618`·`:689`·`:781`을 읽되 변경하지 않는다(read-only).
- **R6(전파만)**: 실패는 §3 Assessment로 전파하고 §1 레지스트리가 치유를 결정한다. check가 직접 remediation 트리거 금지.

## §4. KEEP_SEPARATE

- `AnomalyDetection.php:3`·`:49`·`ModelMonitor.php:42-43`·`:221`(ML drift/SPC)는 마케팅·모델 모니터링 도메인 check로, authz 컴포넌트 check와 명칭만 유사·흡수 금지.

## §5. 판정

**PARTIAL**. probe 단위 구조(`SystemMetrics.php:127`·`:261`·`:323`·`Health.php:72`)와 read-only·pass/fail 판정 패턴이 baseline으로 실재하나 전부 인프라 가용성 check다. PDP/Policy/Role/Permission 등 authz 불변식을 검사하는 개별 check는 **순신설**이며 인프라 probe 구조를 확장한다. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 구현은 별도 승인 세션.
