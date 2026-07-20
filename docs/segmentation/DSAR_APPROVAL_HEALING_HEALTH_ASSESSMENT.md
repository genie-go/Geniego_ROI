# DSAR — Authorization Health Assessment Engine (Part 3-20 §3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## §3.1 계약 정의(SPEC) — APPROVAL_HEALTH_ASSESSMENT

`APPROVAL_HEALTH_ASSESSMENT`는 인가 서비스 전 컴포넌트의 **종합 건강 상태를 판정**하는 엔진이다. 대상: Authorization Service · PDP(Policy Decision Point) · PEP(Enforcement) · PIP(Information) · Policy Engine · Role Engine · Permission Engine · Dynamic Rule Engine · AI Governance · Federation · Compliance Engine. 각 컴포넌트를 개별 평가한 뒤 가중 집계하여 도메인 상태를 **Healthy / Warning / Degraded / Critical / Recovery Required** 5단계로 산출한다. 산출은 §2 개별 Health Check의 결과를 롤업하며, 결과는 §1 레지스트리의 치유 트리거 입력이 된다.

## §3.2 실존 substrate 매핑

| 계약 요소 | 현행 실측 | 판정 |
|---|---|---|
| **다-모듈 집계 baseline** | `SystemMetrics.php:60`(metrics 진입)·`:67-76`(db/php/opcache/apcu/disk/tenants/migrations/self 8-probe 배열)·okCount 집계로 종합 상태 산출 | PARTIAL(인프라 축·authz 축 아님) |
| **상태 등급 어휘** | `Health.php:27`·`:41-42`(ok/degraded·503) · `SystemMetrics.php:139`·`:155`(ok/down) → Healthy/Degraded 2~3단계 실재. Warning/Critical/Recovery Required 미분화 | PARTIAL(등급 확장 필요) |
| **컴포넌트별 probe 구조** | `SystemMetrics.php:127`(probeDatabase)·`:164`·`:204`·`:240`·`:261`·`:278` 등 컴포넌트당 독립 probe 반환 패턴 | PARTIAL(패턴 재사용·authz 컴포넌트 부재) |
| **PDP/PEP/Policy/Role/… health** | authz 11개 컴포넌트를 health 대상으로 평가하는 코드 = **grep 0** | **ABSENT**(순신설) |
| **관리자 노출 게이트** | `SystemMetrics.php:53-54`(isAdmin)·`index.php:610` 인가 미들웨어 → 민감 상태 admin 한정 | PRESENT(게이트) |

## §3.3 설계 계약(규칙)

- **R1(축 분리)**: 인프라 health(`SystemMetrics.php:60`·`Health.php:27`)와 authz-도메인 health는 **별개 도메인**이다. 인프라 상태 ok가 authz PDP Healthy를 의미하지 않는다 — 인프라 probe를 authz 판정으로 오용 금지.
- **R2(확장)**: 8-probe 집계 패턴(`SystemMetrics.php:67-76`)과 등급 어휘(`Health.php:41-42`)를 **상속·확장**해 11개 authz 컴포넌트 probe를 추가한다. 신규 엔진 난립 금지.
- **R3(5단계 정규화)**: 현행 ok/degraded/down 3단계를 Healthy/Warning/Degraded/Critical/Recovery Required로 정규화하되 하위호환 매핑 유지.
- **R4(롤업 계약)**: 도메인 상태 = §2 개별 check의 가중 집계(`SystemMetrics.php:417` cronHealth summary 집계 패턴 상속).
- **R5(노출 게이트)**: authz health 상세는 `SystemMetrics.php:53-54` admin 게이트·`index.php:610` 미들웨어 상속. 비인가 노출 = 정찰 위험.
- **R6(치유 연계)**: 산출 상태는 §1 레지스트리 트리거 입력일 뿐 자동 집행하지 않는다(신호≠집행).

## §4. KEEP_SEPARATE

- `AnomalyDetection.php:3`·`:49`(SPC 이상탐지)·`ModelMonitor.php:42-43`·`:221`·`:244`·`:273`(drift)는 **마케팅/ML 도메인**이다. "health/anomaly" 명칭이 유사하나 authz 컴포넌트 건강과 무관 — 흡수·재사용 금지.

## §5. 판정

**PARTIAL**. 인프라 probe 집계·상태 어휘·컴포넌트별 probe 구조(`SystemMetrics.php:60`·`:67-76`·`Health.php:27`)가 baseline으로 실재하나, 이는 인프라 가용성 신호이지 authz-도메인 health가 아니다. 11개 authz 컴포넌트를 health 대상으로 평가·5단계 등급화하는 엔진은 **순신설**이며 baseline 패턴을 확장한다. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 구현은 별도 승인 세션.
