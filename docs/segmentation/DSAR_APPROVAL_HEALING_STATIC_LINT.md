# DSAR — Self-Healing Static Lint (Part 3-20 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Static Lint는 **배포/등록 시점**에 self-healing 규칙 정의를 정적 분석하여, 런타임 이전에 구조적 결함을 차단하는 관문이다. §27은 6개 lint 규칙을 규정한다.

| Lint 규칙 | 계약 |
|---|---|
| Missing Recovery Plan | 복구 규칙에 명시적 복구 계획이 없으면 거부 |
| Missing Rollback Point | 롤백 지점(안전 복귀 상태) 정의가 없으면 거부 |
| Hardcoded Recovery Logic | 복구 로직이 하드코딩(파라미터화 불가)이면 경고/거부 |
| Missing Health Check | 복구 성공 판정용 health check가 없으면 거부 |
| Missing Validation | 복구 후 상태 검증 단계가 없으면 거부 |
| Unsafe Auto-Healing Rule | 승인·안전장치 없는 자동복구 규칙이면 거부 |

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| Missing Health Check | 시스템 상태 지표 수집 `SystemMetrics.php:60` | **baseline만** — health check 규칙 lint 아님 |
| Unsafe Auto-Healing Rule | Safety Guardrail(승인·롤백·로그) 대상 | 설계 대상 |
| Missing Recovery Plan / Rollback Point | (복구 규칙 스키마 부재) | ABSENT |
| Hardcoded Recovery Logic | (복구 규칙 DSL 부재) | ABSENT |
| Missing Validation | (복구 후 검증 계약 부재) | ABSENT |

## 3. 설계 계약

- **Lint 진입점**: self-healing 규칙 등록·변경 시 Static Lint가 단일 관문으로 6개 규칙을 평가한다. 하나라도 위반이면 등록 거부(`CONFIGURATION_HEALING_FAILED` §28 연계).
- **Missing Health Check**: 복구 성공 판정은 `SystemMetrics.php:60`의 시스템 지표 수집을 **health signal source로 재사용**한다 — 신규 지표 파이프라인 신설 금지. Lint는 각 복구 규칙이 최소 1개 health signal에 바인딩됨을 강제.
- **Unsafe Auto-Healing Rule**: 승인(maker-checker)·롤백 지점·감사 로그 3요소를 모두 갖추지 않은 자동복구 규칙은 Safety Guardrail 미충족으로 거부. 이는 §26 Runtime Guard와 정합.
- **Hardcoded Recovery Logic**: 복구 로직은 파라미터화된 규칙 정의로만 표현하며, 인라인 하드코딩은 lint에서 거부 — 재사용성·시뮬레이션 가능성 확보.
- **Missing Recovery Plan / Rollback Point / Validation**: 복구 규칙 스키마는 `plan`·`rollback_point`·`post_validation` 필드를 필수(required)로 갖는다. 누락 시 정적 거부.

## 4. 판정

**ABSENT (grep 0)** — Static Lint 엔진·복구 규칙 스키마·복구 DSL·post-validation 계약 전무. 재사용 가능한 substrate는 Health Check signal source 1건에 한정: `SystemMetrics.php:60` baseline. Unsafe Auto-Healing Rule은 Safety Guardrail(§26 정합) 설계 대상이며 나머지 5개 lint 규칙은 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
