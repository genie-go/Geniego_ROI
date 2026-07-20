# DSAR — Runtime SoD Enforcement Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) KEEP_SEPARATE 근접물(동음이의 decoy).

---

## 1. 핵심 판정 — **거버넌스 계층 대부분 ABSENT, dual-control만 실존(SoD 아님)**

`sod`·`segregation`·`conflict.matrix`·`toxic`·`incompatible.role`·`mutually.exclusive` 테이블/핸들러/라우트 **전무**. SoD 거버넌스 골격은 그린필드. 유일 실통제=Mapping self-approval(dual-control·GT① §A). "conflict" 41개 파일 전부 SoD 무관 decoy.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| SoD Registry / Conflict Rule / Conflict Matrix | **ABSENT** | `toxic\|conflict.?matrix\|sod\|segregation\|incompatible.?role\|mutually.?exclusive` → SAML `SPSSODescriptor` 오탐만. role×role/perm×perm 상충 전용 구조 0 |
| Role/Permission/Scope/Context Conflict Engine | **ABSENT(grep 0)** | `roleConflict\|evaluateConflict\|conflictMatrix\|toxicPair\|incompatibleRoles` 매칭 0 |
| Static SoD (Assignment 시점 상충차단) | **ABSENT** | `TeamPermissions.php:599-621`·`:642-658`는 위임상한 클램프(권한상승 방지)뿐 — 상충 role 차단 로직 없음. acl_permission=menu×action 매트릭스지 SoD 매트릭스 아님 |
| Dynamic SoD (세션/JIT 런타임 역할 충돌) | **ABSENT** | 세션은 사용자당 단일 team_role(`UserAuth.php:263-316`) — 다중 활성역할·충돌평가 데이터 기반 자체 부재 |
| Runtime SoD Evaluator (매 요청 충돌평가) | **ABSENT(grep 0)** | 인가 게이트(`index.php:572-611`)는 RBAC 스코프이지 "동시보유 역할 충돌" 판정 아님 |
| Temporal SoD (동일일자/세션/트랜잭션 생성+승인 차단) | **ABSENT(grep 0)** | `same.day\|created_by.*approv` 0. 존재 시간창은 전부 무관(§B-3) |
| Transaction/Workflow SoD (생성↔승인 분리) | **ABSENT/부분** | Invoice/Payment/Vendor/User 결재분리 grep 0. Alerting은 maker 부재로 VACUOUS(GT① §B). Mapping만 실성립(GT① §A) |
| SoD Exception/Override/Compensating Control 워크플로 | **ABSENT** | SoD 위반 시 추가승인·강화MFA 트리거하는 예외 워크플로 없음. break-glass/MFA는 로그인 통제(재활용 substrate·GT① §F) |
| SoD 전용 Evidence/Snapshot/Digest/Analytics/Drift/Recon/Simulation | **ABSENT(grep 0)** | SoD 충돌 이벤트 전용 스키마·분석·드리프트·시뮬 코드경로 0. SecurityAudit는 범용 로거(재활용 substrate) |
| SoD Runtime Guard / Static Lint | **ABSENT(grep 0)** | 하드코딩 예외·SoD 규칙부재·권한우회 탐지 lint 0(히트는 i18n/migration 데이터뿐) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 재활용)

1. **정적 RBAC/ABAC 인가 게이트** — `index.php:572-611`(중앙)·`guardTeamWrite`(`UserAuth.php:1167-1186`)·`requireTeamWrite`(`:1134-1147`)·`guardWarehouse`(`Wms.php:557-590`). **SoD Runtime Evaluator를 얹을 PEP 삽입지점**.
2. **Maker-Checker dual-control** — `Mapping.php:268-271`(self-approval 차단 실성립)·`Alerting.php:642-650`(정족수·단 VACUOUS). SoD Transaction/Workflow 통제의 인접 패턴(개명 금지).
3. **불변 해시체인 감사** — `SecurityAudit.php:14-33`·`:56-69`. SoD Evidence/Snapshot 기록 기반.
4. **검토·증거 저장** — `AccessReview.php:66-80`·`:219-224`(justification 필수 추가전용). Exception Evidence 패턴.
5. **보상통제 substrate** — break-glass(`UserAuth.php:790-801`)·MFA(`:929-961`). Compensating Control(강화MFA/추가검증) 재활용.
6. **Cross-Tenant 격리** — `index.php:614-619`. Cross-System/Cross-Tenant SoD 인접.

## 4. KEEP_SEPARATE — 흡수·개명 금지 근접물 (동음이의 decoy)

### B-1. "conflict" 41개 파일 전부 SoD 무관
- HTTP 409 Conflict 응답·ChannelSync/MenuPricingSync **데이터 sync conflict**·merge/scheduling conflict. SoD role-conflict 도메인 아님. ★"conflict" grep 히트를 SoD로 오인 금지.

### B-2. Maker-Checker = dual-control ≠ SoD
- `Mapping.php:268-271`(self-approval)·`Alerting.php:642-650`(정족수). **"두 명이 필요"(dual-control)** 이지 **"한 사람이 상충역할 동시보유"(SoD)** 가 아니다. SoD 통제의 인접 substrate로 재활용하되 SoD로 개명·흡수 금지.

### B-3. 시간창 로직 (비-SoD)
- `AbTesting.php:161`(DCO 쿨다운)·`AutoCampaign.php:622`(explore 쿨다운)·`PgSettlement.php:221`(정산 페어링). Temporal SoD 아님.

### B-4. 위임상한 클램프 (권한상승 방지 ≠ SoD)
- `TeamPermissions.php:599-621`·`:642-658` `assignable` 클램프. privilege-escalation 통제이지 role-conflict SoD 아님.

### B-5. 단일승인 게이트 (결재분리 아님)
- `Catalog.php:2383-2407`(approveQueue 가격 writeback)=`requirePro`+tenant만·maker 미기록·self-approval 무검증. 단일행위자 승인이라 SoD 워크플로 아님.
- `PgSettlement.php`(approve/requester 패턴 0)·`AdminGrowth.php:1294`·`:1313-1331`(requested_by 저장하나 self-approval 비교·정족수 없음→SoD 미성립).

### B-6. 비즈니스 동음이의 (drift/recon/simulate/anomaly)
- `ModelMonitor.php`(model drift)·`AnomalyDetection.php`(마케팅)·`PgSettlement.php`(정산 recon)·`RuleEngine.php`/`Decisioning.php`/`PriceOpt.php`(비즈 simulate). SoD Drift/Recon/Simulation 아님.

### B-7. 감사 근접 (menu_audit_log)
- `menu_audit_log`(`AdminMenu.php:123-140`·`:200`·`:216`·migration `20260526_168_102_create_menu_audit_log.sql:6-24`). 메뉴 거버넌스 append-only 체인 — SoD 충돌 증거 아님. SecurityAudit(범용)과 별개 관심사.

### B-8. FE 가드 (XSS/테넌트오염 ≠ 권한 SoD)
- FE `SecurityGuard.js`/`ContaminationGuard.js`. SoD Static Lint 아님.

## 5. 종합

**SoD 거버넌스 = ABSENT 골격 / thin-substrate.** Conflict Rule·Matrix·Registry·6종 Conflict Engine·Runtime Evaluator·Temporal·Static/Dynamic SoD·Exception/Override/Compensating·전용 Evidence/Snapshot/Digest/Analytics/Drift/Recon/Simulation·Guard/Lint 전부 순신규. 유일 실통제=Mapping self-approval(dual-control). 재활용(흡수 아님·확장): RBAC/ABAC PEP 게이트·Alerting/Mapping maker-checker 패턴·SecurityAudit 체인·access_review 증거·break-glass/MFA 보상통제·cross-tenant. KEEP_SEPARATE = "conflict" 409/sync·시간창 쿨다운·위임상한 클램프·단일승인 게이트·비즈 drift/recon/simulate·menu_audit_log·FE 가드. **★Alerting action_request VACUOUS(maker 부재·생산자 0)는 기존 확정 상태 — 재플래그 아님(Part 3-10은 설계만·수정 대상 아님).**
