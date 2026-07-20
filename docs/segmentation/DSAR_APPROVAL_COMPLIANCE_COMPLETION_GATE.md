# DSAR — Completion Gate 계약 (Part 3-17 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §36)

Part 3-17 이 CERTIFIED 로 전환되려면 다음이 100% 충족되어야 한다:

- **G-1 Registry / Catalog / Control Library** 구축.
- **G-2 Mapping / Rule Engine** 구축(규정↔통제 매핑·평가 규칙).
- **G-3 Continuous / Assessment** 구축(연속 컴플라이언스 평가).
- **G-4 Evidence Chain / Audit Readiness / Reporting** 구축.
- **G-5 Snapshot / Digest / Analytics / Drift / Simulation** 구축.
- **G-6 Guard / Lint** (거버넌스 자동검증) 구축.
- **G-7 Performance / Compliance Validation / Audit Readiness Validation / Regression 100%** 통과(§34·§35).

## 2. 라이브 substrate 매핑

| 게이트 항목 | 실 substrate | 상태 |
|---|---|---|
| G-1 Registry/Catalog/Control Library | regulation/control 테이블 grep 0 — 라이브는 flat readiness posture(`Compliance.php:53-130`)뿐 | **ABSENT** |
| G-2 Mapping/Rule Engine | 규정↔통제 매핑·평가 규칙 엔진 없음 | **ABSENT** |
| G-3 Continuous/Assessment | 연속 평가 파이프라인 없음(요청 시 flat 재계산만 `Compliance.php:90-113`) | **ABSENT** |
| G-4 Evidence Chain | SecurityAudit 해시체인 evidence `SecurityAudit.php:14-68`·`verify()` `:56-68` = 확장 기반 실재 | **확장 기반만** |
| G-4 Reporting | 감사 CEF/SIEM 익스포트 `Compliance.php:143-190` = 스트림 익스포트(컴플라이언스 리포트 아님) | 대용만 |
| G-5 Snapshot/Digest/Analytics/Drift/Simulation | 시점 봉인·집계·시뮬 substrate 없음 | **ABSENT** |
| G-6 Guard/Lint | 저장소 구성 lint/test 스크립트 없음 | **ABSENT** |
| G-7 Perf/Validation/Regression | §34·§35 전부 미충족 | **미충족** |
| (Tenant Isolation 확장 기반) | 크로스테넌트 차단 `index.php:600-619`·감사 스코프 `Compliance.php:198-209` | 확장 기반 실재 |

## 3. 설계 계약(완료 판정 규칙)

- G-1~G-7 은 **AND** 게이트다. 하나라도 ABSENT 이면 Part 3-17 = NOT_CERTIFIED.
- 선행 종속: **Part1~3-16 이 먼저 CERTIFIED** 여야 3-17 게이트 개시. 현재 Part1~3-16 은 설계 DSAR(코드 0)이므로 3-17 은 BLOCKED_PREREQUISITE.
- G-4 Evidence Chain 은 `SecurityAudit.php:14-68`(append-only·해시체인)·`verify()`(`:56-68`)를 확장 기반으로 삼는다. 별도 evidence 엔진 신설 금지(중복). Tenant Isolation(`index.php:600-619`)도 같은 확장 기반이다.
- G-1~G-3·G-5·G-6 은 순신설이며 현 self-healing 스키마 경로(§32)로 진입한다.

## 4. KEEP_SEPARATE

- ML 위험/모니터링(`Risk.php:12`·`:149-152`·`ModelMonitor.php`)은 컴플라이언스 통제 라이브러리·평가 규칙과 무관 — G-1/G-2 에 병합 금지.

## 5. 판정

**미충족(NOT_CERTIFIED).** G-1~G-7 대부분 ABSENT 또는 미충족. 유일한 확장 기반은 Evidence Chain 축의 SecurityAudit 해시체인(`SecurityAudit.php:14-68`·`:56-68`)과 Tenant Isolation(`index.php:600-619`)뿐이며, 나머지 Registry·Catalog·Control Library·Mapping·Rule Engine·Continuous·Assessment·Snapshot·Digest·Analytics·Drift·Simulation·Guard·Lint·Performance/Regression 은 순신설이다. 게이트 개시 조건 = 선행 Part1~3-16 인증.

코드 변경 0 · BLOCKED_PREREQUISITE.
