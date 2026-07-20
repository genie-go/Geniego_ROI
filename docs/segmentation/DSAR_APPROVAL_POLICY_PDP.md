# DSAR — PDP/PEP Governance: 정책 결정 지점 (APPROVAL_PDP)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_PDP는 모든 접근 요청을 단일 지점에서 **결정론적(Deterministic)** 으로 평가하는 중앙 정책 결정 계층이다(SPEC §4·§0 흐름 `PIP→PDP→Decision Cache→PEP`). PDP는 다음 12요소를 모두 평가한다(SPEC §4): Effective Role · Effective Permission · Scope · Constraint · Explicit Deny · Dynamic Rule · Runtime Context · Risk · Policy · SoD · JIT · Compliance. 평가는 Decision Pipeline 고정순서(SPEC §8)와 Deny-Overrides 기본 결합(SPEC §10)을 따르며, 출력은 SPEC §9 Decision Types(Permit/Deny/Challenge/Escalate/Require Approval/Require MFA/Require Re-auth/Read Only/Time Limited)로 확정된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| PDP 평가요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| **통합 결정론 PDP(중앙 평가)** | **ABSENT / PARTIAL(proto)** | 유일 proto-PDP=`effectiveForUser`(`TeamPermissions.php:393-421`)—RBAC+ABAC 통합 최근접이나 **private·전역 요청 경로 미배선**(GT① §C·GT② §2) |
| Effective Role | PARTIAL | `effectiveForUser`(`:393-421`)·member 권한∩팀상한 clamp(`:407-416`)·`roleOf`/`isAdmin`(`TeamPermissions.php:120-136`·`:132`) |
| Scope | PRESENT(국소) | `effectiveScope`·`scopeValuesFor`(`TeamPermissions.php:236-265`·`:272-280`) data_scope 해석(상속·fail-closed) |
| Constraint | PARTIAL | 위임상한 clamp `assignableMap`·`scopeWithinCap`·`clampActions`(`TeamPermissions.php:381-387`·`:356-373`·`:423-429`) |
| Explicit Deny | PARTIAL(국소) | `DENY_SCOPE __deny__` 센티넬·`AND 1=0`(`TeamPermissions.php:234`·`:290`·`:303`)—전 코드베이스 유일·단일 스코프 fail-closed |
| Runtime Context / Risk | PARTIAL(PDP 미소비) | ip/ua 수집(`UserAuth.php:3446-3454`·`:4243-4250`)·risk 정적 컬럼(`:4165`)—PDP 주입 미배선 |
| Policy(선언적 authz) | **ABSENT** | Policy Registry/Version/Bundle grep 0(GT② §2)—코드 if 분기·DB 권한행에 암묵 내장 |
| SoD / JIT / Dynamic / Compliance | 입력(외부 엔진) | Part 3-7 ERRE·3-9 JIT·3-10 SoD 산출을 PDP **입력**으로 평가(ADR §D-6·무중복) |
| Decision Cache / Explain | **ABSENT** | subject/resource/action/context-hash→decision 캐시·Why Permit/Deny 설명기 전무(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력(SPEC §3)**: Subject(User/Service/Session/Device) · Resource(Module/Screen/API/Dataset/…) · Action(Read/Create/Update/Delete/Approve/Execute/…) · Environment(Time/Region/Risk/Auth). 
- **평가 순서**: Decision Pipeline 12단계 고정(SPEC §8) — Request Validation→Context→Attribute→**Effective Role(ERRE 3-7)**→Scope→Policy→SoD→Risk→Compliance→Decision→Audit→Cache.
- **결합 규칙**: 기본 Deny-Overrides(SPEC §10) — 현행 `__deny__`(`TeamPermissions.php:234`)를 전역 deny-overrides로 승격(ADR §D-4).
- **출력 제약**: Deterministic(SPEC §4)·동일 (subject,resource,action,context-hash) → 동일 decision. Evidence는 Evaluation/Rule/Scope/Assignment Trace(SPEC §23)로 SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 확장 기록(ADR §D-5).
- **테넌트 격리**: 모든 결정은 tenant 경계 내(SPEC §30 Tenant Isolation)·`X-Tenant-Id` 주입(`index.php:619`) 기반. 크로스테넌트 결정 금지.
- **승격 방식**: `effectiveForUser`(`:393-421`)를 대체가 아니라 중앙 PDP로 **승격(Extend)**(ADR §D-1).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

authz PDP는 마케팅/ops/finance "policy·decision" 신호와 코드·데이터 공유가 없다(GT② §5). **흡수·개명 금지**: `Catalog.php:1104`(evaluatePolicy 상품 컴플라이언스)·`RuleEngine.php:24`(캠페인 룰)·`Decisioning.php:12`·`:432`(마케팅 의사결정)·`action_request.policy_id`(`Db.php:576`·`routes.php:439-445`=Alerting alert_policies)·`ModelMonitor.php:220-335`(ML drift)·`PlanPolicy` RANK/requirePlan(`UserAuth.php:364`·entitlement·authz와 직교)·`Risk.php`(공급망 fraud). authz policy ≠ 마케팅 policy.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 통합 결정론 PDP = **ABSENT(그린필드)**, proto-PDP `effectiveForUser`(`:393-421`) = PARTIAL·미배선. Policy/Cache/Explain/Combining = grep 0(GT② §2).
- **재활용(Extend, 대체 아님)**: `effectiveForUser`→중앙 PDP 승격·`effectiveScope`·clamp·`__deny__`·`roleOf/isAdmin` 재사용, SecurityAudit Evidence 확장(ADR §D-1·§D-4·§D-5).
- **선행의존**: Part 1~3-11 인증 후 실 구현(BLOCKED_PREREQUISITE)·ERRE(3-7)가 PDP 핵심 입력(ADR §D-6·Consequences). 코드 변경 0 · NOT_CERTIFIED.
