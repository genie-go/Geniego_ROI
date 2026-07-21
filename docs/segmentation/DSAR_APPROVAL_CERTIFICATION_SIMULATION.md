# DSAR — Simulation (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §25(Simulation)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §25 Simulation은 가상의 변경(what-if)이 실제 반영되기 전에 그 **영향을 사전 분석**하는 계층이다. 원문 시뮬레이션 대상: Reviewer Change · Campaign Change · Policy Change · Scope Change · Assignment Change. 각 변경에 대한 영향분석 지표: Review Volume · Risk Score · Revocation Count · SLA Impact.

Simulation은 Part 3-8 거버넌스 중 가장 상위 계층으로, §20 Analytics(집계값)·§21 Certification Risk(위험 스코어)·§9 Review Queue(볼륨·SLA)를 **입력**으로 삼아 "만약 이 변경을 적용하면 이 지표들이 어떻게 바뀌는가"를 미리 계산한다. 선행 계층(§9·§20·§21) 전부가 ABSENT이므로 Simulation은 입력 자체가 없는 **가장 종속성이 깊은 ABSENT**다.

Part 3-8 시리즈 6편(Analytics·Risk·Drift Detection·Revalidation·Reconciliation·Simulation) 중 Simulation이 가장 마지막에 배치되는 이유는 이 종속 관계 때문이다 — 나머지 5편이 "현재 상태를 관측·비교·집계"한다면 Simulation은 "그 관측 결과를 재사용해 가상의 미래를 예측"하는 유일한 계층이며, 선행 5편의 산출식이 확정되지 않으면 Simulation의 예측식도 정의할 수 없다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ② §2 실측표는 §25 Simulation을 포함해 SPEC §7~§30 전 계층을 ABSENT로 확정한다. "simulation"이라는 용어를 명시적으로 쓰는 실 코드는 `PriceOpt.php:105`(po_simulations)이며, 이는 **가격 최적화 시뮬레이션**(가격 변경 시 매출/마진 예측)이다. 이름이 정확히 "시뮬레이션"으로 일치하지만 대상이 access certification의 5개 변경축(Reviewer/Campaign/Policy/Scope/Assignment Change)과 전혀 무관하다 — 형태(what-if 예측)조차 회귀분석 기반 가격탄력성 모델이라 access-review의 영향분석(Review Volume·Risk Score·Revocation Count·SLA Impact 카운팅)과 계산 방식도 다르다.

### 2.2 하위항목 대조표

| SPEC §25 시뮬레이션 대상 | 판정 | 실 substrate / 근거(허용목록) |
|---|---|---|
| Reviewer Change | ABSENT | 검토자 재배정이 review 처리량·SLA에 미칠 영향을 미리 계산하는 로직 grep 0(§9 Review Queue 자체 ABSENT) |
| Campaign Change | ABSENT | 캠페인 관련 배정 변경이 access review에 미칠 영향 시뮬레이션 grep 0. `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign)는 캠페인 실행 스키마이지 영향분석 엔진이 아님 |
| Policy Change | ABSENT | 정책 변경 시 영향 대상·볼륨을 미리 계산하는 로직 grep 0 |
| Scope Change | ABSENT | `TeamPermissions.php:356`(scopeWithinCap)은 현재 요청의 scope 적합성을 실시간 검증할 뿐, "scope를 이렇게 바꾸면 몇 명이 영향받는가"를 사전 계산하지 않음 |
| Assignment Change | ABSENT | `TeamPermissions.php:641`(putMemberPermissions)·`:810`(reclampTeamMembers)는 배정을 **실제로 변경/재클램프**하는 즉시 실행 함수이지, 변경 전 영향을 미리 보여주는 dry-run/시뮬레이션 모드가 아님 |
| 영향분석: Review Volume | ABSENT | §20 Analytics(Pending/Completed Reviews) 자체가 ABSENT |
| 영향분석: Risk Score | ABSENT | §21 Certification Risk composite score 자체가 ABSENT |
| 영향분석: Revocation Count | ABSENT | §20 Analytics(Revoked Assignments) 자체가 ABSENT |
| 영향분석: SLA Impact | ABSENT | §20 Analytics(Overdue Reviews) 자체가 ABSENT |

### 2.3 KEEP_SEPARATE (해당 시)

- `PriceOpt.php:105`(po_simulations)는 **가격 시뮬레이션**이다. 상품 가격 변경이 매출·마진·재고 회전에 미치는 영향을 예측하는 가격 최적화 도메인이며, "인증(certification) 시뮬레이션"이 아니다. "Simulation"이라는 이름의 정확한 일치에도 불구하고 대상 도메인(가격 결정 vs 접근권한 검토)이 완전히 다르므로, Certification Simulation 엔진을 `PriceOpt.php`의 확장·개명으로 구현하는 것은 절대 금지 — SPEC §25의 5개 변경축(Reviewer/Campaign/Policy/Scope/Assignment) 중 어느 것도 가격 시뮬레이션과 데이터 모델을 공유하지 않는다.
- `AutoCampaign.php:917`(driftFromSeries)는 §22 Drift Detection 문서에서 다룬 것과 동일하게 성과 시계열 이탈 탐지이며, "변경 전 영향 예측"이 아니라 "이미 발생한 변화의 사후 탐지"라는 점에서 시점상으로도 Simulation(사전 예측)과 반대 방향이다.
- 판정 원칙: "시뮬레이션/예측"이라는 이름·형태가 동일해도 예측 대상(가격 vs 접근권한)과 예측 방향(사전 what-if vs 사후 탐지)이 다르면 별개 도메인이다. `PriceOpt.php`는 대상이 다르고, `AutoCampaign.php`는 방향이 다르므로 둘 다 배제된다.

## 3. Canonical 설계

SPEC §25 원문 기반 신규 설계 계약:

| # | 필드 | 의미 |
|---|---|---|
| 1 | simulation_run_id | 시뮬레이션 실행 식별자 |
| 2 | change_type | Reviewer/Campaign/Policy/Scope/Assignment Change 중 하나 |
| 3 | proposed_change_detail | 가상 변경 내역(dry-run 입력) |
| 4 | projected_review_volume | 예상 Review Volume 변화 |
| 5 | projected_risk_score | 예상 Risk Score 변화(§21 산출식 재사용) |
| 6 | projected_revocation_count | 예상 Revocation Count |
| 7 | projected_sla_impact | 예상 SLA Impact(Overdue 위험) |
| 8 | run_at / requested_by | 실행 시각·요청자 |

Simulation은 **실제 상태를 변경하지 않는 dry-run 전용 계산 엔진**으로 설계한다. §20 Analytics·§21 Certification Risk가 구현된 이후, 동일 산출식을 "현재 상태" 대신 "가상 변경 후 상태"에 적용해 재계산하는 구조를 취한다(자체 산출식 중복 신설 금지 — §20·§21과 로직 단일소스 유지).

requested_by 필드는 감사 추적 목적으로 필수다 — "누가 이 변경을 시뮬레이션했는가"는 그 자체로 access review 활동의 일부이며, SecurityAudit 해시체인(`SecurityAudit.php:56` verify·`:63` hash_chain) 참조 대상으로 향후 편입을 고려한다(D-2, 흡수가 아닌 참조).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Scope Change dry-run 검증 로직 | `TeamPermissions.php:356`(scopeWithinCap)·`:423`(clampActions) — 검증 로직을 dry-run 모드로 재호출 | 승격(검증 로직 재사용, 실제 반영은 하지 않음) |
| Assignment Change dry-run | `TeamPermissions.php:641`(putMemberPermissions) — 실제 쓰기 없이 결과만 미리 계산하는 dry-run 래퍼 신설 | 신규(래퍼), 원 함수는 무변경 |
| Risk Score 영향분석 산출식 | 본 시리즈 §21 Certification Risk composite_risk_score(설계만, 미구현) | 신규(§21 선행 필요) |
| Review Volume/Revocation Count/SLA Impact 산출식 | 본 시리즈 §20 Analytics 지표(설계만, 미구현) | 신규(§20 선행 필요) |
| Campaign/Reviewer/Policy Change 시뮬레이션 | 부재 | 신규 |
| requested_by 감사 추적 | `SecurityAudit.php:56`(verify)·`:63`(hash_chain) — 참조만, 흡수 아님(D-2) | 신규(참조) |

## 5. 무후퇴 · Extend

- Golden Rule Wrap(D-1): `scopeWithinCap`·`clampActions`·`putMemberPermissions`는 dry-run 시뮬레이션에서 **실제 쓰기를 수행하지 않는 별도 경로**로 호출되며, 원 함수의 실제 반영 로직·권한 상한 강제는 전혀 변경하지 않는다.
- 단일소스 원칙(무후퇴+값 단일소스): Simulation의 Risk Score/Review Volume 등 산출식은 §20 Analytics·§21 Certification Risk와 **동일 로직을 재사용**해야 하며, Simulation 전용으로 별도 산출식을 중복 신설하지 않는다 — 두 계층이 따로 계산하면 실제 반영 시 수치가 어긋나는 회귀 위험이 있다.
- `PriceOpt.php`(가격 시뮬레이션)는 KEEP_SEPARATE 유지 — 이름이 완전히 일치해도 도메인이 다르므로 흡수·개명 금지가 가장 강하게 적용되는 케이스임을 명시.
- fail-secure: Simulation 결과가 "영향 없음"으로 나오더라도 이는 **예측치**일 뿐 실제 review를 대체하지 않는다 — Simulation 실행을 근거로 실제 review·승인 절차를 생략하는 것은 금지(D-3 Review Queue 사람 개입 원칙 유지).

본 문서는 SPEC §25 원문·ADR D-1~D-8·Ground-Truth ①②에만 근거하며, 실코드는 직접 열람하지 않았다. 5개 change_type·4개 영향분석 지표 판정은 위 4개 정본의 교차 대조 결과다.

## 6. 완료 게이트

- [ ] §20 Certification Analytics 선행 구현 — Review Volume/Revocation Count/SLA Impact 산출식 원천
- [ ] §21 Certification Risk 선행 구현 — Risk Score 영향분석 산출식 원천
- [ ] 5개 change_type별 dry-run 래퍼 설계 확정(실제 쓰기 미수행 보장)
- [ ] `PriceOpt.php` KEEP_SEPARATE 재검증(오흡수 0 확인 — 이름 완전일치 케이스 특별 주의)
- [ ] Simulation 결과가 실제 review 절차를 생략시키지 않는다는 fail-secure 원칙 재확인
- [ ] requested_by 필드의 SecurityAudit 해시체인 참조 방식 확정(흡수 아님·D-2 재확인)
- [ ] Part 3-8 시리즈 6편(Analytics/Risk/Drift Detection/Revalidation/Reconciliation/Simulation) 간 산출식 단일소스 정합성 최종 재검증
- [ ] 코드 0 유지 확인 — 본 편은 설계 명세만

## 7. 반날조 인용 출처

- SPEC §25(Simulation 5개 변경축·4개 영향분석 지표) / SPEC §20(Review Volume/Revocation Count/SLA Impact 산출식 선행 의존) / SPEC §21(Risk Score 산출식 선행 의존) / SPEC §9(dry-run이 실제 review를 대체 못함 — 상태머신 원칙)
- ADR D-1(Extend-Wrap) · D-3(Review Queue 사람 개입 원칙) · D-5(scopeWithinCap 위임상한 dry-run 재사용 근거) · D-6(KEEP_SEPARATE) · D-7(정직 분리)
- Ground-Truth ① §2.D(위임: `TeamPermissions.php:356`·`:423`·`:641`·`:810`)
- Ground-Truth ② §2(SPEC §7~§30 실측표, §25 ABSENT 확정)·§4 B-2(`PriceOpt.php:105` po_simulations — 이름 완전일치 KEEP_SEPARATE)·§4 B-1(`AdminGrowth.php:1040`~`:1069`·`AutoCampaign.php:917` 형태 유사 KEEP_SEPARATE)
- ABSENT 항목(5개 change_type dry-run·4개 영향분석 지표 전부)은 grep 0 실측 — `PriceOpt.php:105`(가격 시뮬레이션)는 인증 시뮬레이션이 아니므로 채우기 금지
- 본 문서는 Part 3-8 시리즈 6편 중 선행 종속성이 가장 깊은 최상위 계층이며, §20·§21·§9 3개 선행 문서가 확정되기 전까지 실 구현 착수는 불가능하다는 점을 완료 게이트에서 명시적으로 순서화했다.
