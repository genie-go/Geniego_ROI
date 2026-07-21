# DSAR — Drift Detection (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §22(Drift Detection)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §22 Drift Detection은 인증(certification) 완료 시점의 스냅샷과 현재 상태 사이의 **불일치(drift)**를 탐지하는 계층이다. 원문 탐지 대상: Assignment Drift · Role Drift · Scope Drift · Reviewer Drift · Policy Drift.

Drift Detection의 존립 전제는 "certification 시점의 불변 스냅샷"(SPEC §26 Snapshot)이 존재해야 그 이후 변화량을 비교할 수 있다는 것이다. Snapshot 계층 자체가 ABSENT(Ground-Truth ② §2)이므로 Drift Detection도 선행 종속적으로 ABSENT다. 5개 하위항목 각각을 "권한/역할 배정이 인증 시점 대비 얼마나 변했는가"라는 정의에 따라 개별 판정한다.

Drift Detection은 §23 Revalidation과 짝을 이룬다 — Drift Detection이 "변화를 탐지"하면 Revalidation이 "재검토를 트리거"한다. 두 계층을 하나로 합쳐 설계하지 않는 이유는 SPEC 원문이 §22와 §23을 별개 절로 분리했기 때문이며(ADR D-3 상태머신 원칙), 탐지(감지 책임)와 트리거(액션 책임)를 분리해야 각 계층의 실패 지점을 독립적으로 진단할 수 있기 때문이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ② §2 실측표는 SPEC §7~§30 12계층 전체를 ABSENT로 확정하며 §22 Drift Detection도 예외 없이 포함된다. Ground-Truth ①이 실측한 5개 substrate 군(감사·회수·만료·위임·스키마) 중 "과거 스냅샷 대비 현재 상태 비교"를 수행하는 로직은 하나도 없다 — 전부 **현재 상태(live state) 조회 또는 즉시 재계산**이며, 시점 간 비교(diff) 연산이 아니다. 이름이 유사한 "drift"라는 용어를 쓰는 실 코드(`AutoCampaign.php:917`·`ModelMonitor.php:221`·`:244`)는 존재하나, 대상 도메인이 완전히 다르므로 §2.3 KEEP_SEPARATE로 명확히 분리한다.

### 2.2 하위항목 대조표

| SPEC §22 탐지 항목 | 판정 | 실 substrate / 근거(허용목록) |
|---|---|---|
| Assignment Drift(배정 변경) | ABSENT | 배정 변경 이력을 스냅샷과 비교하는 diff 로직 grep 0. `TeamPermissions.php:641`(putMemberPermissions)은 배정을 **변경하는** 함수이지 변경 전/후를 스냅샷과 비교·기록하는 함수가 아님 |
| Role Drift(역할 변경) | ABSENT | 상동. `TeamPermissions.php:393`(effectiveForUser)은 매 요청 시 실효 역할을 **재계산**할 뿐, 과거 인증 시점 역할 집합과 비교하지 않음 |
| Scope Drift(범위 변경) | ABSENT | `TeamPermissions.php:356`(scopeWithinCap)·`:423`(clampActions)은 현재 요청이 상한 내인지 매번 검증하는 제약 로직이며, "인증 시점 scope 대비 현재 scope가 얼마나 벗어났는가"를 계산하지 않음 |
| Reviewer Drift(검토자 변경) | ABSENT | 검토자 배정 개념 자체가 §9 Review Queue와 함께 ABSENT — 비교 대상 없음. `PM/Assignees.php:14`(reviewer role enum)는 이름만 유사한 순수 오탐(Ground-Truth ② §4 B-7) |
| Policy Drift(정책 변경) | ABSENT | 정책 버전 이력·비교 로직 grep 0 |

### 2.3 KEEP_SEPARATE (해당 시)

- `AutoCampaign.php:917`(driftFromSeries)는 **ROAS 등 마케팅 성과 시계열의 통계적 이탈(outlier) 탐지**다. "drift"라는 용어가 SPEC §22와 동일하지만, 비교 대상이 "권한 배정의 인증 시점 스냅샷"이 아니라 "캠페인 성과 지표의 시계열 추세"다. 알고리즘 형태(시계열 비교)만 근접할 뿐 도메인이 전혀 다르므로 흡수·개명 금지.
- `ModelMonitor.php:221`·`:244`는 **ML 모델의 예측 성능 저하(model drift)** 탐지다. 마찬가지로 "무엇이 기준 시점 대비 변했는가"라는 형태적 유사성만 있을 뿐, 대상이 모델 정확도이지 접근권한 배정이 아니다. Certification Assignment/Role/Scope/Reviewer/Policy Drift 5종 중 어느 것도 `ModelMonitor`의 확장으로 구현해서는 안 된다.
- 두 근접물 모두 "drift"라는 이름의 형태적 유사성(시계열/기준값 비교 알고리즘)만 재활용 검토 대상이며, 데이터 소스·저장 스키마·소비처는 절대 공유하지 않는다(가짜녹색 회피).
- KEEP_SEPARATE 판정 시 확인 절차: (1) 대상이 "권한 배정"인가 "그 외 도메인"인가, (2) 비교 기준선이 "인증 시점 스냅샷"인가 "임의 통계 기준값"인가. `AutoCampaign.php:917`·`ModelMonitor.php`는 두 질문 모두에서 access certification과 불일치하므로 이름의 형태적 유사성에도 불구하고 명확히 분리된다.

## 3. Canonical 설계

SPEC §22 원문 기반 신규 설계 계약:

| # | 필드 | 의미 |
|---|---|---|
| 1 | drift_event_id | 탐지 이벤트 식별자 |
| 2 | baseline_snapshot_ref | 비교 기준(SPEC §26 Snapshot) 참조 |
| 3 | current_state_ref | 현재 상태 참조 |
| 4 | drift_type | Assignment/Role/Scope/Reviewer/Policy 중 하나 |
| 5 | delta_detail | 구체적 변경 내역(추가/제거/변경 항목) |
| 6 | detected_at | 탐지 시각 |
| 7 | triggers_revalidation | §23 Revalidation 트리거 여부(D-3 상태머신 연동) |
| 8 | drift_severity | 변화 폭에 따른 심각도 구분(경미/중대) — 산출식은 별도 정책 결정 필요 |

Drift Detection은 Snapshot(§26)을 기준선(baseline)으로, 현재 실효 상태(ERRE 산출물 — Part 3-7 Effective Role 참조)를 비교 대상으로 삼는 **읽기 전용 비교 엔진**으로 설계한다. 탐지 결과는 신규 review 트리거(§23 Revalidation)로 이어진다.

5개 drift_type 중 Assignment·Role·Scope 3종은 §3 필드 목록의 `current_state_ref`가 Part 3-7 ERRE 산출물(APPROVAL_EFFECTIVE_ROLE)을 직접 가리킬 수 있어 상대적으로 설계가 단순하다. 반면 Reviewer·Policy Drift는 비교 대상 자체(검토자 배정 이력, 정책 버전 이력)가 §9·§23과 함께 완전히 순신규이므로, Snapshot 구조 설계 시 이 두 축의 이력 필드를 처음부터 포함해야 한다 — 사후에 끼워넣기 어려운 구조적 요구사항으로 명시한다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Assignment Drift 비교 대상(현재 상태) | `TeamPermissions.php:641`(putMemberPermissions)·`:379` | 승격(현재 상태 조회원, diff 로직은 신규) |
| Role Drift 비교 대상(현재 상태) | `TeamPermissions.php:393`(effectiveForUser) | 승격(현재 상태 조회원, diff 로직은 신규) |
| Scope Drift 비교 대상(현재 상태) | `TeamPermissions.php:356`(scopeWithinCap)·`:423`(clampActions) | 승격(현재 제약 조회원, diff 로직은 신규) |
| baseline snapshot 저장 | 부재(SPEC §26 Snapshot 선행 필요) | 신규 |
| diff 엔진 자체 | 부재 | 신규 |
| Reviewer/Policy Drift | 부재(비교 대상 원장 자체 없음) | 신규 |
| triggers_revalidation 연동 계약 | 부재(§23 Revalidation 상태전이 선행 필요) | 신규 |

## 5. 무후퇴 · Extend

- Golden Rule Wrap(D-1): `effectiveForUser`·`scopeWithinCap`·`putMemberPermissions`는 "현재 상태를 산출/변경하는" 원래 역할을 그대로 유지한다. Drift Detection은 이 함수들의 **호출 결과를 읽어 비교**할 뿐, 함수 자체를 수정하지 않는다.
- P4(289차 manager scope 위임상한 실결함 봉인)로 확립된 `scopeWithinCap`·`clampActions`의 강제 로직은 무후퇴 유지 — Scope Drift 탐지가 이 강제 로직을 우회하거나 대체해서는 안 되며, 오히려 강제가 정상 작동 중임을 재확인하는 보조 신호로만 사용한다.
- `AutoCampaign.php`·`ModelMonitor.php`는 KEEP_SEPARATE 유지 — 두 파일의 drift 알고리즘 "형태"를 설계 참고자료로 검토하는 것은 허용되나(D-6), 코드·스키마·테이블 공유는 금지.
- fail-secure: Snapshot 부재 상태에서 drift 비교가 불가능한 경우 "drift 없음"으로 간주하지 않고 **비교불가(inconclusive) → 강제 재인증 대상**으로 처리하는 것을 설계 원칙으로 명시.
- 이 fail-secure 원칙은 §21 Certification Risk의 미평가(unknown) 처리 원칙과 동일한 패턴이다 — Part 3-8 전 계층에 걸쳐 "판정 불가 시 안전측(review 대상 승격)으로 기운다"는 단일 원칙을 일관 적용한다(무후퇴+값 단일소스 원칙의 설계 차원 적용).

본 문서의 판정 근거는 SPEC 원문·ADR·Ground-Truth ①② 4개 정본에 전적으로 의존하며, 실코드 파일은 별도로 열람하지 않았다. 코드 변경 0·NOT_CERTIFIED 상태를 유지한 채, Part 3-7 ERRE 및 §26 Snapshot 인증 완료 이후에만 실 구현 검토가 가능하다.

## 6. 완료 게이트

- [ ] SPEC §26 Snapshot(baseline) 선행 구현 — Drift Detection의 최우선 BLOCKED_PREREQUISITE
- [ ] Part 3-7 ERRE(Effective Role Resolution Engine) 인증 완료 — 현재 상태 산출원
- [ ] 5개 drift_type별 diff 알고리즘 설계 확정
- [ ] §23 Revalidation 트리거 연동 계약 확정
- [ ] `AutoCampaign.php`·`ModelMonitor.php` KEEP_SEPARATE 재검증(오흡수 0 확인)
- [ ] Reviewer/Policy Drift 비교 대상 이력 스키마가 Snapshot(§26) 최초 설계에 포함되었는지 확인
- [ ] Assignment/Role/Scope Drift의 `current_state_ref`가 Part 3-7 ERRE 산출물과 정합하는지 교차 확인
- [ ] drift_severity 산출식(경미/중대 구분 기준) 정책 확정
- [ ] 코드 0 유지 확인 — 본 편은 설계 명세만

## 7. 반날조 인용 출처

- SPEC §22(Drift Detection 5개 탐지 항목) / SPEC §26(Snapshot — baseline 선행 의존) / SPEC §23(Revalidation 트리거 연동) / SPEC §7(ERRE 현재 상태 참조)
- ADR D-1(Extend-Wrap) · D-5(scopeWithinCap 위임상한 참조) · D-6(KEEP_SEPARATE) · D-7(정직 분리)
- Ground-Truth ① §2.D(위임: `TeamPermissions.php:641`·`:393`·`:379`·`:356`·`:423`)
- Ground-Truth ② §2(SPEC §7~§30 실측표, §22 ABSENT 확정)·§4 B-2(`ModelMonitor.php:221`·`:244`)·§4(`AutoCampaign.php:917` driftFromSeries — 형태 유사 KEEP_SEPARATE)
- ABSENT 항목(baseline 비교·5개 drift_type 전부)은 grep 0 실측 — `AutoCampaign.php:917`·`ModelMonitor.php:221`·`:244`(ML drift)는 권한 drift가 아니므로 채우기 금지
- 본 문서는 5개 drift_type 전부를 ABSENT로 판정했으며, 재활용은 "현재 상태 조회원"(effectiveForUser 등)에 한정된다 — diff 비교 로직 자체를 승격 대상으로 오판하지 않는다.
