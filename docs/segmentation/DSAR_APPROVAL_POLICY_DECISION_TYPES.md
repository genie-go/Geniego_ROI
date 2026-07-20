# DSAR — PDP/PEP Governance: 결정 유형·결합 알고리즘 (APPROVAL_POLICY_DECISION_TYPES)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

**Decision Types**(SPEC §9): PDP 출력 결정 유형 — Permit · Deny · Challenge · Escalate · Require Approval · Require MFA · Require Re-authentication · Read Only · Time Limited Permit(9종). **Combining Algorithm**(SPEC §10): 복수 정책 결정을 하나로 병합하는 규칙 — Deny Overrides · Permit Overrides · First Applicable · Ordered · Highest Priority · Most Restrictive(6종). **기본값은 Deny Overrides**(SPEC §10 "기본 Deny Overrides"). 파이프라인 10단계 Decision Generation(§8)이 결합 알고리즘을 적용해 최종 결정 유형을 산출한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| **Decision Types(전체 9종 통합)** | **PARTIAL** | 일부 유형만 산발 집행(GT② §2 "Decision Types=PARTIAL") |
| Require MFA | PRESENT | `mfaPolicy`·`mfaRequiredFor`·mfaPolicyConfig(off/admin/all) `UserAuth.php:3745`·`:3761`·`:3779`·`:3752` |
| Challenge | PRESENT | 로그인 MFA 강제·OTP 챌린지 `UserAuth.php:929-964`·`:945`·`:954-964` |
| Read Only | PRESENT | member→읽기전용 `UserAuth.php:1128`·`index.php:78-89` |
| Permit / Deny(통합 결정유형) | PARTIAL | 개별 PEP allow/403만 — 통합 Permit/Deny 결정유형 부재(GT② §2) |
| Escalate / Require Approval / Time Limited Permit / Require Re-auth | ABSENT | 통합 결정유형 부재(GT② §2 "Escalate/Time-limited 통합 결정유형 부재") |
| **Combining=Deny Overrides(전역 병합)** | **ABSENT** | allow/deny 병합·deny-overrides 규칙 부재(GT② §2) |
| Explicit Deny 센티넬(단일 스코프) | PRESENT(국소) | `DENY_SCOPE`(`__deny__`·`AND 1=0`) `TeamPermissions.php:234`·`:290`·`:303` — 단일 스코프 fail-closed용(전 코드베이스 유일·GT① §E) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거·고정순서/테넌트격리)

- **C-1 결정유형 통합**: PDP는 SPEC §9의 9종을 단일 결정유형 열거로 산출. 현행 산발 집행(MFA/Challenge/Read-only)을 **재사용**하되 Permit/Deny/Escalate/Require Approval/Time Limited Permit을 통합에 편입(ADR 2.1 Decision Types 재사용).
- **C-2 기본 Deny Overrides**: Combining 기본값=Deny Overrides(SPEC §10). 어떤 적용 정책이든 하나라도 Deny면 최종 Deny(fail-closed). 현행 `__deny__` 센티넬(`TeamPermissions.php:234`·단일 스코프)을 **전역 deny-overrides 결합규칙으로 승격**(ADR D-4).
- **C-3 결정론**: 동일 (subject, resource, action, context)는 동일 결정유형·결합결과(SPEC §4 Deterministic). 결합 알고리즘 선택(6종)은 정책 번들 단위로 명시.
- **C-4 Read-only/MFA 무후퇴**: 현행 member read-only(`:1128`)·MFA 정책(`:3745`)은 통합 후에도 유지·병행(ADR §4 무후퇴).
- **C-5 테넌트 격리**: 결정유형·결합은 X-Tenant-Id(`index.php:619`) 경계 내에서만 유효.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

결합 알고리즘·결정유형은 **authz**만 대상. 마케팅/승인 결정은 흡수 금지: `RuleEngine.php:24`(캠페인 daypart/pause_channel/frequency)·`Decisioning.php:12`·`:36`·`:432`(마케팅 의사결정)·`Catalog.php:1104`(evaluatePolicy)·`action_request.policy_id`(`Db.php:576`·`:592-594`·`routes.php:439-445`·`:457-463`)=Alerting maker-checker(`Mapping.php:269`). `PlanPolicy` RANK·requirePlan(`UserAuth.php:364`)=상용 entitlement(authz 직교·GT② §5). 이들의 "decision/policy"는 authz Decision Type/Combining 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(Decision Types — MFA/Challenge/Read-only만 PRESENT) / ABSENT(Deny-overrides 전역 Combining·Escalate/Require Approval/Time Limited Permit 통합).**
- **재활용(Extend·흡수 아님)**: Require MFA(`:3745`)·Challenge(`:929-964`)·Read-only(`:1128`) 결정유형 재사용, `__deny__`(`:234`) → 전역 deny-overrides 승격(ADR D-4).
- **선행의존**: Combining/통합 결정유형은 Decision Pipeline(§8)·중앙 PDP(ADR D-1)·Part 1~3-11 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
