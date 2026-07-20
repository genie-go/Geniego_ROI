# DSAR — Authorization AI Governance: AI 시뮬레이션 (APPROVAL_AI_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_AI_SIMULATION은 인가 변경을 실제 집행 전 what-if로 평가하는 엔티티다. SPEC §27은 5종 시뮬레이션 대상과 4종 예상 효과를 규정한다.

| SPEC §27 시뮬레이션 | 예상 효과(§27) |
|---|---|
| Role Reduction(역할 축소) | Risk Score |
| Policy Merge(정책 병합) | Compliance Score |
| Permission Removal(권한 제거) | Authorization Latency |
| JIT Expansion(JIT 확장) | Operational Cost |
| SoD 강화 | — |

SPEC §32 API `Run Simulation`, §35 성능 `Simulation ≤ 5초`. 시뮬레이션 결과 추천은 §17 XAI(Expected Benefit/Expected Risk)·§19 Human Approval Gateway 경유(자동 집행 아님).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| **authz 인가변경 시뮬레이션(role reduction/policy merge/permission removal/JIT/SoD)** | **ABSENT** | GT② §2 "SoD Recommendation/JIT Optimization = ABSENT(grep 0)"·"AI Simulation(authz) = ABSENT" · ADR §2.2 grep 0 |
| 결정론 baseline(추천 대상 식별) | PARTIAL·proto | GT① §A `AccessReview.php:87-122`(classify=EXPIRED/DORMANT/STALE_UNUSED proto)·`:158`·`:162-163` — Role Reduction 후보 식별 baseline(AI 아님) |
| 수동 위임상한(scope 축소 대상) | PARTIAL·정적 | GT① §A `TeamPermissions.php:356-373`(scopeWithinCap)·`:810-831`(reclampTeamMembers) — 수동·추천/시뮬 아님 |
| 영향 효과 근거원(risk 라벨·compliance readiness) | PARTIAL·정적 | GT① §E `UserAuth.php:4165`(auth_audit_log.risk 정적)·`Compliance.php:53-130`·`:120`(산술 readiness%) — 예측/시뮬 없음 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `simulation_id`, `tenant_id`, `simulation_type`(§27 5종), `target_ref`(role/policy/permission/scope/SoD), `predicted_risk_score`·`predicted_compliance_score`·`predicted_latency`·`predicted_cost`(§27 효과), `confidence`(§18 0~100), `evidence_ref`(§23).
- **상태**: what-if 실행→효과 산출→XAI 근거(§17 Expected Benefit/Risk)→§19 Human Approval 후보. 집행 없음(read-only 예측). ADR §1 "AI는 추천·예측만·집행은 기존 통제"(D-6).
- **제약**: SPEC §33 Tenant Isolation·§35 Simulation ≤ 5초. Role/Permission 삭제·Policy 변경은 SPEC §20 Autonomous 자동수행 **불가**(Human Approval 필수·§19). AccessReview classify(`:87-122`)를 결정론 baseline로 승격(ADR D-2).

## 4. KEEP_SEPARATE (마케팅 drift/simulate 흡수금지)

- 마케팅 시뮬/최적화 흡수 절대 금지: GT② §B-1 `AutoRecommend.php:35-920`(예산배분·UCB bandit `:81`·경험적 베이즈 `:79`·자가학습 prior `:185`)·`Mmm.php:1-23`(믹스모델·adstock·한계ROAS). 광고 예산 what-if는 authz role/permission 시뮬과 별개.
- ★XAI 혼동 함정: GT② §B-3 `Decisioning.php:433-477` "explainability"·`Risk.php:61-66` top_drivers는 마케팅 설명이지 authz 시뮬 효과 설명 아님(ADR D-7). 흡수 금지.
- 데이터소스 분리: authz 시뮬 = acl_permission/auth_audit_log, 마케팅 = `performance_metrics`/`crm_*`(GT② §5).

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: authz 인가변경 시뮬레이션 엔진 = grep 0(ADR §2.2·GT② §2). 코드 변경 0.
- **재활용(흡수 아님·재배선)**: `AccessReview.php:87-122` classify를 Role Reduction 결정론 baseline로 승격(ADR D-2)·`TeamPermissions.php:356-373` 위임상한을 scope 축소 대상으로 참조. 효과 예측·XAI·confidence는 순신규(ADR D-4).
- **선행 의존**: BLOCKED_PREREQUISITE — Part 1~3-14 인증 후 실 구현(ADR §4). RBAC/SoD/JIT/PDP 통제(3-9~3-13)가 시뮬 대상·집행은 기존 통제(ADR D-6).
