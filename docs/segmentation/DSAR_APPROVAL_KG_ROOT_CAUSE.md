# DSAR — Authorization Knowledge Graph Root Cause Analysis (Part 3-21 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14)

Root Cause Analysis 엔진은 인가 지식그래프에서 **관측된 인가 실패·충돌을 그래프 경로 역추적으로 근본 원인 노드까지 소급**하는 읽기전용 진단 엔진이다. 계약 대상 5개 root-cause 축:

- **Authorization Failure** — 접근 거부의 원인 정책·권한 부재 노드 소급.
- **Policy Conflict** — 허용/거부 정책 충돌의 발원 노드.
- **SoD Conflict** — 직무분리 위반의 유발 역할/권한 조합.
- **Runtime Failure** — 런타임 인가 판정 예외의 원인 경로.
- **Compliance Failure** — 컴플라이언스 위반 상태의 근본 원인 사슬.

Root Cause 엔진은 **진단만 수행**하며 자동 교정을 하지 않는다(diagnose-only). 모든 근본원인 주장은 감사 원천 이벤트에 앵커링되어야 한다.

## 2. Substrate 매핑 표

| Root-cause 축 | 현행 substrate(근거 원천) | file:line | 근본원인 분석 존재? |
|---|---|---|---|
| 실패/충돌 감사 원천 | SecurityAudit append-only 기록 | `SecurityAudit.php:25-31` | ABSENT |
| 감사 무결성 검증 | 해시체인 verify | `SecurityAudit.php:63-64` | ABSENT |
| 액션 상한 충돌 근거 | clampActions 상한 판정 | `TeamPermissions.php:194-198` | ABSENT |
| 유효권한 판정 경로 | effectiveForUser | `TeamPermissions.php:393-421` | ABSENT |
| 근본원인 역추적 엔진 | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **감사 앵커링**: 모든 근본원인 경로는 `SecurityAudit.php:25-31` append-only 기록을 원천으로 하고 `SecurityAudit.php:63-64` verify로 무결성을 확인한 이벤트만 근거로 채택한다(위조 감사 기반 진단 금지 — menu_audit_log류 tamper-evident 아닌 기록은 근거 배제).
2. **충돌 근본원인 SOURCE**: Policy/SoD Conflict의 발원 후보는 `TeamPermissions.php:194-198` clampActions 상한 판정에서 관측되는 액션 초과·상한 위반을 근거로 소급한다. clampActions는 상한을 *집행*하나 근본원인을 *진단*하지 않으므로 진단 계층은 순신설이다.
3. **Authorization Failure 역추적**: 접근 거부의 원인은 `TeamPermissions.php:393-421` effectiveForUser 판정 결과의 결핍(누락 권한·역할)을 역추적하여 도출한다.
4. **Diagnose-only 불변식**: 근본원인 분석은 어떤 정책·권한도 자동 변경하지 않으며, 진단 결과는 사람 승인 하 교정으로만 이어진다(자동집행 금지 원칙 정합).
5. **Explainable RCA**: 각 근본원인은 앵커 감사 이벤트·경로를 인용하며 근거 없는 원인 단정을 금지한다.

## 4. KEEP_SEPARATE

- **마케팅 attribution(`AttributionEngine.php:242`)** — 전환 귀속 원인 분석과 인가 실패 근본원인은 별개 도메인. 재사용 금지.
- **데이터 lineage(`DataPlatform.php:313-345`)** — 데이터 품질 원인 추적과 분리.
- **PM DAG(`PM/Gantt.php:20`)**·**GraphScore(`GraphScore.php:12-30`)** — 일정 지연/그래프 스코어 도메인으로 분리 유지.

## 5. 판정

**ABSENT (root cause grep 0)**. 인가 실패·정책/SoD 충돌·런타임/컴플라이언스 실패를 근본 원인 노드까지 역추적하는 진단 엔진은 존재하지 않는다. 근거 원천은 SecurityAudit 감사(`SecurityAudit.php:25-31`, verify `:63-64`)와 clampActions 충돌 근거(`TeamPermissions.php:194-198`)이며, 이를 근본원인 역추적으로 종합하는 계층은 **순신설**이다. attribution(`AttributionEngine.php:242`)·데이터 lineage(`DataPlatform.php:313-345`)와 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
