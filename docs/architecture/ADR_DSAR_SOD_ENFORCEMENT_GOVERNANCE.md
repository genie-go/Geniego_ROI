# ADR — Runtime Segregation of Duties (SoD) Enforcement Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-10
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-8(Auth Registry~Certification) · **3-9(JIT Access)**

---

## 1. Context

GeniegoROI의 인가는 **역할·스코프 기반 정적 RBAC/ABAC 게이트**(중앙 `index.php:572-611`·`guardTeamWrite` `UserAuth.php:1167-1186`·`guardWarehouse` `Wms.php:557-590`)로 매 요청 강제된다. 그러나 **"한 사용자가 상충하는 직무·역할을 동시에 보유·수행하는가"를 판정·차단하는 SoD(직무분리) 통제는 부재**하다. 세션은 사용자당 단일 team_role만 실어(`UserAuth.php:263-316`) 다중 활성역할 충돌 개념의 데이터 기반조차 없다.

유일한 실 SoD-인접 통제는 `Mapping.php:268-271`의 **self-approval 차단(제안자≠승인자)** 이나, 이는 **dual-control(4-eyes, 2인 필요)** 이며 SoD(1인 상충직무 동시보유 차단)와 **개념적으로 인접하나 별개**다. Alerting 승인 substrate는 maker 컬럼 부재(`Db.php:592-600`)+생산자 grep 0으로 **VACUOUS**(기존 확정).

본 ADR은 **Runtime SoD Enforcement** — Assignment·Approval·Session·Permission 계산·Workflow·API·Transaction·Runtime 전 단계에서 상충 직무 조합을 지속 평가·차단하는 통제 — 의 거버넌스 기반을 정의한다. Part 3-9 JIT(동적 일시 상승)이 "언제/얼마나" 권한을 주는지를 다룬다면, SoD는 "어떤 권한 조합을 **동시에** 가질 수 없는지"를 다루는 직교 통제다.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **유일 실 SoD-인접 통제**: Mapping self-approval 차단(`Mapping.php:268-271`)+정족수(`Db.php:632-634` required_approvals)+dedup(`:278-283`)+fail-closed(`:186-190`) = **dual-control**.
- **Alerting**: 정족수(`Alerting.php:642-650`)·approved-only(`:684-688`)는 있으나 maker 부재(`Db.php:592-600`)+생산자 0 → **VACUOUS**(코드완비·데이터 미배선·기존 확정).
- **재활용 substrate**: RBAC/ABAC PEP 게이트(`index.php:572-611`·`UserAuth.php:1134-1147`·`Wms.php:557-590`)·SecurityAudit 해시체인(`SecurityAudit.php:14-33`·`:56-69`)·access_review_item(`AccessReview.php:66-80`)·break-glass/MFA 보상통제(`UserAuth.php:790-801`·`:929-961`)·cross-tenant(`index.php:614-619`).

### 2.2 거버넌스 계층 (GT②) — 대부분 ABSENT
Conflict Rule·Matrix·Registry·Role/Permission/Scope/Context/Transaction/Workflow/Session Conflict Engine·Runtime Evaluator·Temporal/Dynamic/Static SoD·Exception/Override/Compensating 워크플로·SoD 전용 Evidence/Snapshot/Digest/Analytics/Drift/Recon/Simulation·Guard/Lint = **grep 0**.

### 2.3 종합
**SoD 판정 = ABSENT-governance / thin-substrate.** 최대 공백 = Conflict Matrix·Runtime Evaluator 부재 + 세션 단일역할(다중역할 충돌 데이터 기반 부재).

## 3. Decision

### D-1. RBAC/ABAC PEP 게이트에 SoD Evaluator를 얹는다 (Extend, 대체 아님)
매 요청 인가 게이트(`index.php:572-611`·`guardTeamWrite`·`guardWarehouse`)는 SoD 평가를 삽입할 자연 PEP다. 정적 RBAC 판정 **후**에 "현재 subject의 활성 역할·권한 조합이 Conflict Matrix에 상충하는가"를 평가하는 SoD Runtime Evaluator를 신설한다. 기존 게이트 파괴 없이 평가층 추가.

### D-2. Conflict Matrix·Rule Registry는 순신규(불변버전)
Left/Right Entity·Conflict Type·Severity(Low~Regulatory)·Resolution Strategy(Block/Challenge/Approval/Escalation/Override/Break-Glass)를 담는 SoD Matrix·Rule Registry를 신설. 규칙은 불변 버전(§36 Immutable Conflict Rule)·테넌트 격리.

### D-3. Maker-Checker(dual-control)를 Transaction/Workflow SoD로 재활용(흡수·개명 금지)
- `Mapping.php:268-271` self-approval 차단 패턴을 Transaction Conflict(생성↔승인 분리·§10)의 **선례로 재사용**하되, SoD(역할충돌)와 dual-control(정족수)을 개념 분리(GT② B-2).
- Alerting VACUOUS(`Db.php:592-600` maker 부재)는 **수정 대상 아님**(기존 확정·Part 3-10 설계만). SoD 실 엔진 세션에서 maker 배선 시 함께 검토.

### D-4. Temporal SoD·Session Conflict는 데이터 기반부터 신설
세션 단일 team_role(`UserAuth.php:263-316`)로는 다중 활성역할 충돌을 판정할 수 없다 → 활성 역할/권한 스냅샷(§23 Conflict Snapshot) 신설이 선행. Temporal(동일 approval cycle 생성+승인 차단)은 시간창 substrate(AbTesting/AutoCampaign 쿨다운·GT② B-3)와 **무관·순신규**.

### D-5. Exception/Override/Compensating은 SecurityAudit·break-glass·MFA 재활용
- SoD 예외(Temporary Exception 자동종료·Emergency Override 사후감사)는 신규 워크플로. 증거는 SecurityAudit 불변체인(`SecurityAudit.php:14-33`) 재활용.
- Compensating Control(추가승인/강화MFA/로깅)은 MFA(`UserAuth.php:929-961`)·break-glass(`:790-801`) substrate 재활용.

### D-6. Part 3-9 JIT·Part 1~3-8과의 관계 (직교·무중복)
SoD는 JIT grant·Dynamic Role·Effective Resolution(3-7)의 산출(활성 역할집합)을 **입력**으로 받아 충돌을 평가한다. JIT가 시한부 상승을 발급할 때도 SoD Evaluator가 상충 여부를 재평가(§5 Dynamic SoD). 엔진 분리(JIT=발급/만료, SoD=충돌평가·차단). 중복 엔진 금지.

### D-7. 정직 분리
- **실재 과신 회피**: Mapping self-approval은 dual-control이지 SoD 역할충돌 아님. RBAC 게이트는 인가지점이지 충돌평가 아님. Alerting은 VACUOUS.
- **부재 과장 회피**: Conflict Matrix/Evaluator/Temporal grep 0은 실측 부재(그린필드). "conflict" 41파일은 전부 409/sync decoy(GT② B-1).
- **기존 확정 재플래그 금지**: Alerting action_request 생산자 0(VACUOUS)은 기존 문서 확정 상태 — Part 3-10은 설계만·수정 아님.

## 4. Consequences

- **긍정**: 상충직무 동시보유 차단·규제준수(SOX/SOC2/PCI)·설명가능 충돌해소·런타임 강제. 내부통제 강화.
- **비용**: 신규(Conflict Rule/Matrix/Registry·6종 Conflict Engine·Runtime Evaluator·Risk·Exception/Override/Compensating·Snapshot/Evidence/Digest/Analytics/Drift/Recon/Simulation·Guard/Lint). Conflict Snapshot(활성역할) 데이터 기반 신설.
- **선행 의존**: Part 1~3-9 인증 후 실 구현(BLOCKED_PREREQUISITE). Effective Resolution(3-7)·JIT(3-9) 산출을 입력원으로 결합.
- **무후퇴**: RBAC/ABAC 게이트·maker-checker·SecurityAudit·cross-tenant 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance(≤10ms Runtime Eval)·Compliance(SOX/ISO27001/SOC2/PCI/NIST/COBIT)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: SoD = ABSENT-governance(Conflict Rule/Matrix/Registry·6 Conflict Engine·Runtime Evaluator·Temporal/Dynamic/Static SoD·Exception/Override/Compensating·전용 Evidence/Snapshot/Digest/Analytics/Drift/Recon/Simulation·Guard/Lint 순신규) / thin-substrate(Mapping self-approval dual-control·RBAC/ABAC PEP 게이트·SecurityAudit 체인·access_review 증거·break-glass/MFA 보상통제·cross-tenant). Extend: PEP 게이트에 SoD Evaluator 삽입·Conflict Matrix 신설·maker-checker 재활용(개명 금지)·Conflict Snapshot 데이터기반 신설·JIT(3-9)와 직교 결합·KEEP_SEPARATE(conflict 409/sync·시간창·위임상한·단일승인·비즈 drift/recon·menu_audit_log·FE가드). 코드0·NOT_CERTIFIED·선행의존. **Alerting VACUOUS=기존확정·재플래그 아님.**
