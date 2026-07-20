# DSAR — APPROVAL_EFFECTIVE_CONSTRAINT (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §10)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §10
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL — 분산 constraint substrate 실재, 통합 constraint 모델 부재(Ground-Truth ② #8)
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · Extend-only · KEEP_SEPARATE 오흡수 금지

---

## 1. 목적

SPEC §10 Effective Constraint Calculator가 산출하는 **결과 엔티티** APPROVAL_EFFECTIVE_CONSTRAINT를 정의한다. 다음 constraint 유형을 하나의 통합 모델로 결합한다(SPEC §10 원문): **Time · Device · Region · Network · Session · Amount · API · Dataset · Document · Approval Requirement**.

이 엔티티는 Resolution Pipeline(SPEC §4) 8단계 "Constraint Projection" 산출물이며, 런타임 projection(SPEC §27 "Effective Constraint Set")의 입력이다.

**Ground-Truth 요지**(② #8): constraint는 **PARTIAL** — 분산된 substrate가 실재하나 통합 constraint 모델은 부재하다. amount(`Catalog.php:1036`)·MFA(`UserAuth.php:941`)·api_key expires(`Keys.php:99`)·data_scope 차원제약(`TeamPermissions.php:272`~`:307`)이 각기 다른 파일에 흩어져 있으며, Time/Device/Region/Network를 하나의 constraint set으로 결합·평가하는 계층은 순신규다.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — 분산 constraint)

| SPEC §10 constraint | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| **Amount** | `HIGH_VALUE_KRW`=5,000,000 임계값 → `requiresHighValueApproval` → `approval_type='high_value'` | `Catalog.php:1036` · `:1159` · `:1124` | PARTIAL(도메인 국소) |
| **Session** (MFA/인증수준) | `mfa_policy` off/admin/all 정적 게이트(risk-score 없음) | `UserAuth.php:941`~`:972` | PARTIAL(정적) |
| **API** (api_key 만료) | api_key scope + `expires_at` 검증 | `Keys.php:99` | PARTIAL |
| **Dataset** (data_scope 차원제약) | 차원값→enforcement(`__deny__`→[]/`AND 1=0`) | `TeamPermissions.php:272`~`:307` | PARTIAL |
| **Approval Requirement** | high_value 승인요건 | `Catalog.php:1124` · `:1159` | PARTIAL(도메인 국소) |
| **Time / Device / Region / Network / Document** | 없음 — 통합 constraint vocabulary·평가기 grep 0 | — | **ABSENT** |

**통합 모델 부재**(Ground-Truth ② #8): 위 substrate는 각기 다른 파일·타이밍에 산재하며, 이를 하나의 "Effective Constraint Set"으로 결합·우선순위(runtime constraint > static constraint) 평가하는 계층 없음. `requireTenantSecurityWrite`(`UserAuth.php:1204`)가 "plan 게이트와 직교" 명시 — 의도적 layering이지 통합 constraint 아님(Ground-Truth ① §4).

### 2.2 KEEP_SEPARATE (오흡수 금지)

- `UserAuth.php:941`~`:972`(MFA)는 정적 게이트로 risk-score가 **없다** — Effective Risk(별편, ABSENT)와 혼동 금지(Ground-Truth ② §4).
- `Catalog.php:1036`(HIGH_VALUE_KRW)은 커머스 승인 임계값이며 role constraint vocabulary가 아니다 — amount constraint substrate로만 인용, 커머스 로직 흡수 금지.
- `PriceOpt::simulate`·`AdminGrowth.php:1239`(campaign simulate)·`CustomerAI`(mode:simulated)는 constraint 평가가 아니다(Ground-Truth ② §4).

## 3. Canonical 설계

APPROVAL_EFFECTIVE_CONSTRAINT 엔티티 canonical 필드(SPEC §10):

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective_constraint_id | 산출 결과 식별자 |
| 2 | subject_ref | 대상 주체 |
| 3 | constraint_set{} | 10유형(Time..Approval Requirement) × 제약값 |
| 4 | source_trace[] | 각 제약의 출처 substrate 참조 |
| 5 | precedence_applied | runtime constraint > static constraint 적용 근거 |
| 6 | resolution_version | 불변 버전 바인딩 |

**Constraint 결합 규칙**(SPEC §10·§8 Merge Rule 3항): runtime constraint가 static constraint보다 우선. 분산 substrate(amount/MFA/expires/data_scope)를 통합 constraint set으로 정규화하고, ABSENT 유형(Time/Device/Region/Network/Document)은 순신규 설계.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 본 엔티티 기여 | substrate 승격 대상 |
|---|---|---|
| **8. Constraint Projection** | **통합 constraint set 산출** | 분산 substrate 정규화 |
| 12. Policy Evaluation | Approval Requirement 판정 | `Catalog.php:1159` |
| 10. Risk Projection | (constraint→risk 입력, 별편) | ABSENT |

Runtime Guard(SPEC §28)는 constraint 위반(예: Amount 초과) 차단 시 본 엔티티를 참조.

## 5. 무후퇴 · Extend

- **Extend-only**(ADR D-1·D-4): 분산 constraint substrate(amount/MFA/expires/data_scope)를 파괴하지 않고 통합 Constraint Calculator 입력으로 승격. high_value 승인 게이트·MFA 정적 게이트·api_key 만료는 현행 유지.
- **실재 과신 회피**(ADR D-7): 분산 substrate는 constraint의 **부분 조각**이지 통합 모델이 아니다 — "constraint 엔진이 이미 있다"로 오판 금지.
- **부재 과장 회피**: Time/Device/Region/Network/Document constraint grep 0은 실측 부재.
- **무후퇴**: `requiresHighValueApproval`·MFA 게이트·`requireTenantSecurityWrite` 직교 게이트는 ERRE 완성까지 유지·병행.

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- "Constraint Calculator 구축" — 본 엔티티는 산출물 계약.
- Runtime Guard(SPEC §28)·Error Contract(SPEC §30)의 constraint 위반 입력.
- 실 구현은 선행 foundation 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- `Catalog.php:1036` · `:1124` · `:1159`(Ground-Truth ② #8·§7)
- `UserAuth.php:941`~`:972`(② #8·§4) · `:1204`(① §4) · `Keys.php:99`(② #8) · `TeamPermissions.php:272`~`:307`(② #8)
- KEEP_SEPARATE: `PriceOpt`·`AdminGrowth.php:1239`·`CustomerAI`(Ground-Truth ② §4)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
