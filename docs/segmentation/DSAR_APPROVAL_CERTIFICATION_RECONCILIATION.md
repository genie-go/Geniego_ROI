# DSAR — Reconciliation (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §24(Reconciliation)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §24 Reconciliation은 서로 다른 두 원천의 상태를 **대조(compare)**해 불일치를 찾아내는 계층이다. 원문 비교 대상: Campaign · Runtime Assignment · Snapshot · Review Result.

§22 Drift Detection이 "시점 간(baseline vs current)" 비교라면, Reconciliation은 "**소스 간(source vs source)**" 비교다 — 예를 들어 Runtime Assignment(실제 실행 중인 권한 배정 상태)와 Snapshot(§26, 인증 시점 기록) 또는 Review Result(§10 Decision 결과)가 서로 어긋나지 않는지 교차 검증한다. "Campaign"이 비교 대상 목록에 포함되어 있으나, 이는 access certification 맥락에서 **캠페인 관련 배정/권한이 실제 실행 상태와 일치하는지**를 뜻하며, 마케팅 캠페인 성과 지표 자체를 재무 정산하는 것이 아니다.

4개 비교쌍은 난이도가 다르다 — Runtime Assignment↔Snapshot·Snapshot↔Review Result 2개는 §26 Snapshot·§9/§10 Review Queue/Decision이라는 명확한 선행 계층에 종속되지만, Campaign↔Runtime Assignment는 "어떤 캠페인 관련 권한을 access review 대상으로 삼을지" 범위 자체가 SPEC 원문에 구체화되어 있지 않아 정책 결정이 추가로 필요하다. 이 비대칭을 §2.2 표에서 항목별로 드러낸다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ② §2 실측표는 §24 Reconciliation을 포함해 SPEC §7~§30 전 계층을 ABSENT로 확정한다. "reconciliation"이라는 용어를 쓰는 실 코드는 존재하나(`PgSettlement.php:295`·`Connectors.php:902`), 두 곳 모두 **금전/성과 지표의 대조**(결제 정산, 광고 성과 ROAS 대조)이며 access certification이 정의하는 "권한 배정 상태 간 대조"와 대상이 근본적으로 다르다. 4개 비교쌍 중 어느 것도 실측 가능한 access-domain 대조 로직이 없다.

### 2.2 하위항목 대조표

| SPEC §24 비교 대상 | 판정 | 실 substrate / 근거(허용목록) |
|---|---|---|
| Campaign(대) Runtime Assignment | ABSENT | 캠페인 관련 배정과 실행중 권한 상태를 대조하는 로직 grep 0. `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign)는 캠페인 실행 자체의 스키마이지 권한 배정 대조가 아님(KEEP_SEPARATE 참고) |
| Runtime Assignment(대) Snapshot | ABSENT | §26 Snapshot 자체가 ABSENT이므로 대조 대상 자체가 없음. 현재 상태 조회원인 `TeamPermissions.php:393`(effectiveForUser)은 있으나 이를 과거 스냅샷과 비교하는 로직 없음 |
| Snapshot(대) Review Result | ABSENT | §9 Review Queue·§10 Decision이 ABSENT이므로 "review 결과"라는 원장 자체가 없음 |
| Review Result(대) 실제 반영 상태 | ABSENT | Decision이 실제 시스템 권한 변경에 반영됐는지 검증하는 로직 grep 0. 수동 회수 동작(`Keys.php:135`·`UserAdmin.php:338`·`:342`·`TeamPermissions.php:517`)은 "변경을 수행"하는 동작이지 "review 결과와 실제 상태가 일치하는지 사후 대조"가 아님 |

### 2.3 KEEP_SEPARATE (해당 시)

- `PgSettlement.php:295`는 **결제 정산(payment settlement) 대조**다. 은행/PG사 거래 원장과 내부 매출 기록을 맞추는 재무 reconciliation이며, 권한 배정과 무관하다. "Reconciliation"이라는 이름만 공유할 뿐 도메인이 완전히 다르므로 Certification Reconciliation 엔진으로 흡수·개명 절대 금지.
- `Connectors.php:902`는 **광고 채널 ROAS/성과 지표 대조**(외부 광고 플랫폼 리포트와 내부 집계 간 차이 검증)다. 마찬가지로 "reconciliation" 용어는 동일하나 대상이 광고 성과이지 access certification의 Runtime Assignment/Snapshot/Review Result가 아니다.
- `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign)는 §24의 "Campaign" 비교축과 이름이 겹치는 실 스키마이지만, 이 자체는 캠페인 실행 데이터이며 "캠페인 관련 권한 배정 대조" 기능이 그 안에 내장되어 있지 않다 — 향후 Reconciliation 구현 시 이 테이블을 **입력원 중 하나**로 참조할 수는 있으나(§4 매핑), 캠페인 실행 로직 자체를 Reconciliation 엔진으로 개명해서는 안 된다.
- 세 근접물(`PgSettlement`·`Connectors`·`AdminGrowth`) 공통 함정: 모두 "두 원장을 대조해 불일치를 찾는다"는 알고리즘 형태는 access certification Reconciliation과 동일하다. 그러나 대조 대상이 금전/성과인지 권한 배정인지가 본질적 구분 기준이며, 형태 유사성만으로 흡수하면 재무·광고 리포팅 로직에 접근권한 데이터가 섞여드는 테넌트 격리 위험까지 발생할 수 있다.

Reconciliation과 §22 Drift Detection의 차이는 실 구현 세션에서 코드 공유 범위를 정할 때 중요하다 — 두 계층 모두 "읽기 전용 비교"라는 형태를 공유하므로 비교 엔진의 하부 유틸리티(예: 두 상태 집합의 diff 연산)는 공유 가능하나, 저장 스키마·트리거 조건·소비처는 SPEC §22와 §24가 별도 절로 구분한 만큼 분리 유지한다.

## 3. Canonical 설계

SPEC §24 원문 기반 신규 설계 계약:

| # | 필드 | 의미 |
|---|---|---|
| 1 | reconciliation_run_id | 대조 실행 식별자 |
| 2 | comparison_pair | (Campaign↔Runtime Assignment) / (Runtime Assignment↔Snapshot) / (Snapshot↔Review Result) 중 하나 |
| 3 | source_a_ref / source_b_ref | 대조 대상 두 소스의 참조 |
| 4 | mismatch_count | 불일치 건수 |
| 5 | mismatch_detail[] | 불일치 항목별 상세 |
| 6 | reconciled_at | 대조 실행 시각 |
| 7 | escalation_ref | 불일치 발견 시 §23 Revalidation 또는 신규 review 트리거 참조 |
| 8 | auto_remediation_flag | 항상 false 고정(자동 시정 금지 원칙의 스키마 강제) |

Reconciliation은 §22 Drift Detection과 마찬가지로 읽기 전용 비교 엔진으로 설계하되, 비교축이 "시점"이 아니라 "소스"라는 점에서 구분된다. 불일치 발견 시 자동 시정을 수행하지 않고 review 큐로 에스컬레이션하는 것을 원칙으로 한다(fail-secure).

mismatch_count가 0을 초과하는 실행 결과는 그 자체로 "review 완료"를 의미하지 않는다 — Reconciliation은 불일치를 **찾아내는** 역할까지만 수행하며, 그 불일치를 판단·해소하는 것은 여전히 §9 Review Queue의 사람 개입 몫이다. 이 경계를 명확히 하지 않으면 "Reconciliation이 자동으로 문제를 해결한다"는 오판이 발생할 수 있다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Runtime Assignment 조회원 | `TeamPermissions.php:393`(effectiveForUser)·`:641`(putMemberPermissions)·`:379`(assignableMap) | 승격(현재 상태 조회원) |
| Campaign 데이터 입력원(참고, 흡수 아님) | `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign) | 신규(대조 로직은 신규, 데이터는 참조만) |
| Snapshot 대조 대상 | 부재(§26 Snapshot 선행 필요) | 신규 |
| Review Result 대조 대상 | 부재(§9·§10 선행 필요) | 신규 |
| 대조 실행/스케줄링 | 부재 | 신규 |
| Campaign 대조 스코프 정책 | 부재(정책 결정 필요) | 신규 |

## 5. 무후퇴 · Extend

Reconciliation 구현 시 재사용할 substrate와 신설할 로직의 경계는 다음 5개 원칙으로 확정한다.

- Golden Rule Wrap(D-1): `effectiveForUser`·`putMemberPermissions`는 그대로 유지하며, Reconciliation은 이들의 조회 결과를 **읽기만 하는** 소비자로 설계한다. `PgSettlement`·`Connectors`의 재무/광고 reconciliation 로직은 전혀 건드리지 않는다.
- KEEP_SEPARATE 유지: `PgSettlement.php:295`(결제 정산)·`Connectors.php:902`(광고 성과 대조)는 이름의 "reconciliation" 유사성에도 불구하고 스키마·테이블·소비처를 access certification과 절대 공유하지 않는다 — 재무/광고 도메인 엔진 확장으로 위장한 흡수 시도는 가짜녹색 최상위 위험.
- 무후퇴: `AdminGrowth.php` 캠페인 실행 로직은 Reconciliation의 입력원으로 참조될 수 있으나, 그 실행 자체(캠페인 발송·승인 흐름)는 변경하지 않는다.
- fail-secure: 불일치 발견 시 자동 시정(auto-remediate)하지 않고 review 큐로 에스컬레이션 — 시스템이 스스로 판단해 배정을 정정하는 것은 §9 Review Queue의 사람 개입 원칙(D-3)을 우회하므로 금지.

본 문서는 SPEC §24 원문·ADR D-1~D-8·Ground-Truth ①②에만 근거하며, 실코드는 직접 열람하지 않았다. 4개 비교쌍 판정은 위 4개 정본의 교차 대조 결과다.

## 6. 완료 게이트

- [ ] SPEC §26 Snapshot 선행 구현 — Runtime Assignment↔Snapshot 대조축의 BLOCKED_PREREQUISITE
- [ ] SPEC §9·§10 Review Queue/Decision 선행 구현 — Snapshot↔Review Result 대조축의 BLOCKED_PREREQUISITE
- [ ] Campaign↔Runtime Assignment 대조 스코프 확정(어떤 캠페인 관련 권한을 대상으로 하는지)
- [ ] `PgSettlement.php`·`Connectors.php` KEEP_SEPARATE 재검증(오흡수 0 확인)
- [ ] 불일치 에스컬레이션 경로(§23 Revalidation 연동) 확정
- [ ] Campaign↔Runtime Assignment 대조가 자동 시정을 수행하지 않는다는 fail-secure 경계 재확인
- [ ] auto_remediation_flag 고정값(false)의 스키마 강제 방식 확정
- [ ] `PgSettlement`·`Connectors`·`AdminGrowth` 3개 근접물 전체 오흡수 0 재검증
- [ ] 코드 0 유지 확인 — 본 편은 설계 명세만

## 7. 반날조 인용 출처

- SPEC §24(Reconciliation 4개 비교 대상) / SPEC §26(Snapshot 선행 의존) / SPEC §9·§10(Review Result 선행 의존) / SPEC §23(불일치 에스컬레이션 연동)
- ADR D-1(Extend-Wrap) · D-3(Review Queue 사람 개입 원칙) · D-6(KEEP_SEPARATE) · D-7(정직 분리)
- Ground-Truth ① §2.B(수동 회수: `Keys.php:135`·`UserAdmin.php:338`·`:342`·`TeamPermissions.php:517`)·§2.D(`TeamPermissions.php:393`·`:641`)
- Ground-Truth ② §2(SPEC §7~§30 실측표, §24 ABSENT 확정)·§4 B-2(`PgSettlement.php:295`·`Connectors.php:902` 재무/광고 reconciliation KEEP_SEPARATE)·§4 B-1(`AdminGrowth.php:1040`~`:1069` 캠페인 KEEP_SEPARATE)
- ABSENT 항목(4개 비교쌍 전부)은 grep 0 실측 — `PgSettlement.php:295`·`Connectors.php:902`(결제/ROAS reconciliation)는 접근 reconciliation이 아니므로 채우기 금지
- auto_remediation_flag를 스키마 레벨에서 false로 고정하는 설계는 fail-secure 원칙(D-3 사람 개입)을 코드가 아닌 계약 레벨에서 강제하려는 의도이며, 실 구현 시 이 고정값을 완화하려는 시도는 별도 승인 세션의 정책 결정을 거쳐야 한다.
