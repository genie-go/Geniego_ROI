# DSAR — Certification Analytics (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §20(Certification Analytics)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §20 Certification Analytics는 Role Certification & Access Review 거버넌스 전반의 **집계 지표 계층**을 정의한다. 원문 지표 목록: Completed Reviews · Pending Reviews · Overdue Reviews · Revoked Assignments · Privileged Roles Reviewed · Average Review Time · Reviewer Load · Risk Trend.

이 8개 지표는 전부 SPEC §9(Review Queue) · §10(Decision) · §21(Certification Risk)이 생산하는 원장(review record)을 집계 소스로 삼는다. 즉 Analytics는 그 자체로 독립 엔진이 아니라 **Review Queue·Decision·Risk 3계층의 파생 리포팅 레이어**다. Part 3-8이 SPEC §7~§30 전 계층 ABSENT(순신규 그린필드)로 판정된 상태(Ground-Truth ② §1)이므로, 집계 원천이 되는 review record 자체가 존재하지 않는다 — Analytics는 선행계층 부재에 종속되는 파생 ABSENT다.

이 문서가 다루는 범위는 (a) 8개 지표의 정의와 집계 소스 확정, (b) 각 지표가 실제로는 어떤 근접 substrate와 혼동되기 쉬운지 사전 차단, (c) Analytics가 Review Queue·Decision·Risk 3계층 대비 "읽기 전용 파생물"이라는 계층적 위치 확정이다. Analytics 자신이 review 판정·회수 등 쓰기 동작을 수행하는 일은 설계상 원천 배제한다 — 이는 SPEC §9 Review Queue의 상태전이 권한을 침범하지 않기 위한 fail-secure 경계다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①은 감사·증거 인프라(§2.A), 수동 회수(§2.B), 만료·휴면(§2.C), 위임(§2.D), 배정 스키마(§2.E) 5개 substrate 군을 실측하지만, 이 중 "검토 이벤트를 리뷰 단위로 집계"하는 substrate는 하나도 없다(Ground-Truth ① §5 종합 판정). Ground-Truth ②는 SPEC §7~§30 12계층 실측표에서 §20 Analytics를 포함해 전 계층을 ABSENT로 확정한다(② §2). 본 엔티티는 재활용 가능한 부분 substrate조차 없는 **순수 ABSENT**이며, PARTIAL 승격 후보가 아니다.

### 2.2 하위항목 대조표

| SPEC §20 지표 | 판정 | 실 substrate / 근거 |
|---|---|---|
| Completed Reviews | ABSENT | Review Queue(§9) 자체가 ABSENT — 완료 상태를 셀 원장 없음 |
| Pending Reviews | ABSENT | 상동 |
| Overdue Reviews | ABSENT | 기한(due date) 필드·SLA 타이머 부재. 허용목록 내 만료 개념은 `index.php:518`(expires 강제)·`:522`(last_used) 등 **키/세션 만료**이지 review SLA 아님 |
| Revoked Assignments | ABSENT(집계 미존재) — 원자 동작만 PARTIAL | 회수 자체는 `Keys.php:135`(revoke)·`UserAdmin.php:338`(is_active)·`:342`(세션 revoke)·`TeamPermissions.php:517`(팀 status)로 **개별 수동 동작**은 존재하나, 이를 "review 결과로서" 집계하는 카운터 없음 |
| Privileged Roles Reviewed | ABSENT | `TeamPermissions.php:686`·`:722`(member_permissions_set risk=high)는 권한 설정 시점 risk 플래그이지 "review 완료 후 privileged 역할 카운트"가 아님 |
| Average Review Time | ABSENT | 리뷰 시작/종료 타임스탬프 쌍 자체가 없음(grep 0) |
| Reviewer Load | ABSENT | reviewer별 배정 큐 부재. `PM/Assignees.php:14`(reviewer role enum)는 리뷰어 역할 이름만 있는 순수 오탐(Ground-Truth ② §4 B-7) |
| Risk Trend | ABSENT | 시계열 risk score 적재처 부재. `TeamPermissions.php:722`의 risk 플래그는 스냅샷성 단일 값이며 trend 저장 없음 |

### 2.3 KEEP_SEPARATE (해당 시)

- `ModelMonitor.php:42`는 **ML 모델 성능/드리프트 모니터링**(SPEC §21·§22 KEEP_SEPARATE와 동일 근접물)이며, "권한 검토(review)"의 완료/지연/부하를 다루지 않는다 — 이름의 "Monitor"가 유사해 보이나 access certification analytics로 흡수 금지.
- `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign)·`CampaignManager.jsx`는 **마케팅 캠페인 성과지표**(도달·전환·ROAS류)를 집계하는 화면/스키마다. Certification Analytics의 8개 지표(Completed/Pending/Overdue Reviews 등)와 이름이 "Analytics"로 겹치지만, 대상이 "권한 검토 활동"이 아니라 "캠페인 성과"이므로 도메인이 전혀 다르다. 마케팅 analytics는 **성과지표**이지 **검토지표**가 아니다 — 이 구분을 무너뜨리고 캠페인 analytics UI를 certification 대시보드로 재사용/개명하는 것은 가짜녹색 위험이므로 금지.
- `Approvals.jsx:557`는 마케팅/카탈로그 승인 큐 UI(§4 KEEP_SEPARATE B-1)이며 review 집계 화면이 아니다.
- 세 근접물(ModelMonitor·AdminGrowth/CampaignManager·Approvals.jsx) 공통 패턴: "지표를 집계해 화면에 카드/차트로 보여준다"는 **UI 형태**가 유사할 뿐, 집계 대상 원장(모델 성능/캠페인 성과/승인 큐)이 access review record가 아니라는 점에서 전부 배제된다.

## 3. Canonical 설계

SPEC §20 원문 기반 신규 설계 계약(코드 미구현·설계 전용):

| # | 필드 | 의미 |
|---|---|---|
| 1 | analytics_snapshot_id | 집계 스냅샷 식별자 |
| 2 | period_start / period_end | 집계 구간 |
| 3 | completed_reviews | 구간 내 Decision 확정 건수(SPEC §10) |
| 4 | pending_reviews | Review Queue(§9) 대기 상태 건수 |
| 5 | overdue_reviews | SLA 기한 초과 건수(SLA 정의는 D-3 Review Queue 상태머신에 종속) |
| 6 | revoked_assignments | Decision=Revoke 결과 건수 |
| 7 | privileged_roles_reviewed | Certification Risk(§21) Privileged Role 태그가 붙은 대상 중 review 완료 건수 |
| 8 | avg_review_time | 리뷰 시작~Decision 확정 소요시간 평균 |
| 9 | reviewer_load | reviewer별 배정/처리 건수 분포 |
| 10 | risk_trend | 기간별 risk score 이동 추이(§21 산출값의 시계열 적재) |

집계 소스는 전부 §9 Review Queue·§10 Decision·§21 Risk가 생성하는 1차 이벤트이며, Analytics 자신은 신규 원장을 생성하지 않고 **읽기 전용 파생 뷰**로 설계한다(SPEC §26 Snapshot과 별도 계층).

8개 지표 중 시계열 저장이 필요한 것은 Risk Trend뿐이며, 나머지 7개는 구간(period_start~period_end) 단위 스냅샷 집계로 충분하다. 이 구분은 저장 비용·갱신 빈도 설계에 직결되므로 §3 필드 목록에 명시한다. Average Review Time·Reviewer Load는 특히 reviewer 식별자를 키로 하는 분포 통계이므로, 향후 §9 Review Queue 설계 시 reviewer_ref 필드가 반드시 포함되어야 Analytics가 이를 소비할 수 있다 — 이는 §9 선행 설계에 대한 요구사항으로 명시해 둔다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 감사 로그 원천(evidence trail) | `SecurityAudit.php:56`(verify)·`:63`(hash_chain) — review 이벤트를 향후 이 체인에 append 시 tamper-evident 근거로 참조 가능 | 신규(참조만, 흡수 아님 — ADR D-2) |
| 소비측 무결성 검증 패턴 | `AdminGrowth.php:1429`(integrity=verify) — SecurityAudit::verify() 소비 패턴 예시 | 신규(패턴 참조) |
| Revoked Assignments 원자 동작 | `Keys.php:135`·`UserAdmin.php:338`·`:342`·`TeamPermissions.php:517` | 신규(집계 레이어 신설, 동작 자체는 기존 유지) |
| Reviewer Load 배정 스키마 | 부재 — `TeamPermissions.php:722`(member_permissions_set risk=high)는 권한값이지 배정 큐 아님 | 신규 |
| Analytics 갱신 주기(SPEC §35 목표 ≤5분) | 부재 | 신규 |
| Privileged Roles Reviewed 판정 입력 | `TeamPermissions.php:686`(member_permissions_set risk=high) — privileged 태그 판정 원료 | 신규(§21 Certification Risk 선행 확정 후 소비) |

## 5. 무후퇴 · Extend

- Golden Rule Wrap(D-1): Analytics는 Review Queue/Decision/Risk가 완성된 **이후에만** 그 위에 얹는 읽기 전용 레이어로 설계한다. 기존 `SecurityAudit`·`AdminGrowth`·`TeamPermissions`의 어떤 카운터/필드도 대체하지 않는다.
- SecurityAudit 해시체인은 **참조 기반**(D-2)이며 review 이벤트 저장소로 흡수하지 않는다. `menu_audit_log`(`AdminMenu.php:123`)·`auth_audit_log`(`UserAuth.php:4165`)도 동일 원칙 — 각자의 도메인 로그로 유지, Certification Analytics 전용 원장은 별도 신설.
- P1~P5(289차 선행 보안수정)로 확립된 writeGuard·featurePlan fail-secure·admin SSOT는 본 Analytics 설계와 무관하게 그대로 유지되며, 어떤 지표 산출도 이를 우회하지 않는다.
- KEEP_SEPARATE 유지: `ModelMonitor.php`·`AdminGrowth.php`(마케팅 campaign) 계열은 이름 유사성에도 불구하고 개명·흡수 금지 상태를 계속 유지한다.
- 값 단일소스 원칙: Analytics의 8개 지표는 §9·§10·§21이 확정한 원장 값을 **그대로 집계**할 뿐, 별도의 재계산·재정의를 하지 않는다. 예를 들어 Overdue Reviews의 SLA 기준은 §9 Review Queue 상태머신(D-3)이 정의한 값을 그대로 참조하며, Analytics 문서에서 별도의 SLA 기준을 새로 정의하지 않는다 — 두 계층이 각자 다른 기준을 쓰면 지표 간 정합성이 깨진다.

## 6. 완료 게이트

- [ ] SPEC §9 Review Queue·§10 Decision 상태머신 선행 구현·인증 완료 (BLOCKED_PREREQUISITE 핵심 원인)
- [ ] SPEC §21 Certification Risk 스코어 산출 로직 선행 구현
- [ ] Analytics 8개 지표 스키마·집계 쿼리 설계 확정(본 문서 §3)
- [ ] SecurityAudit 해시체인 참조 방식 확정(흡수 아님·D-2 재확인)
- [ ] KEEP_SEPARATE 목록(ModelMonitor·AdminGrowth·CampaignManager) 오흡수 재검증
- [ ] Reviewer Load/Average Review Time 산출에 필요한 reviewer_ref 필드가 §9 Review Queue 설계에 포함되었는지 교차 확인
- [ ] Risk Trend 시계열 저장소와 §21 composite_risk_score 산출 시점 동기화 방식 확정
- [ ] 코드 0 유지 확인 — 본 편은 설계 명세만, 실 구현은 Part 1~3-7 인증 이후 별도 승인 세션

## 7. 반날조 인용 출처

- SPEC §20(Certification Analytics 8개 지표) / SPEC §9·§10·§21(선행 종속 계층) / SPEC §26(Snapshot 별도 계층) / SPEC §35(갱신 주기 목표)
- ADR D-1(Extend-Wrap) · D-2(SecurityAudit 참조·흡수 아님) · D-3(Review Queue 상태머신) · D-6(KEEP_SEPARATE) · D-7(정직 분리)
- Ground-Truth ① §2.A(`SecurityAudit.php:12`·`:56`·`:63`·`AdminGrowth.php:1429`)·§2.B(`Keys.php:135`·`UserAdmin.php:338`·`:342`)·§2.C(`index.php:518`·`:522`)·§5(종합 판정)
- Ground-Truth ② §2(SPEC §7~§30 실측표, §20 ABSENT 확정)·§4 B-2(ModelMonitor)·§4 B-1(마케팅 campaign)·§4 B-7(PM/Assignees.php:14 순수 오탐)
- ABSENT 항목(Completed/Pending/Overdue Reviews·Avg Review Time·Reviewer Load·Risk Trend)은 grep 0 실측 — 근접물(ModelMonitor·AdminGrowth analytics)로 채우기 금지
