# DSAR — Certification Index Strategy (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §35(Index)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §35(Index)는 Certification & Access Review 스키마 위에 구축해야 할 8종 인덱스를 정의한다: Campaign·Reviewer·User·Role·Permission·Decision·Status·Due Date. 이 인덱스들의 존재 이유는 §36(성능 요구사항)의 **Reviewer Queue 생성 ≤30초(100만 Assignment 기준)**·**Review 조회 ≤200ms**를 충족하기 위한 물리적 전제조건이다 — 인덱스 없이 100만 건 배정을 스캔하며 Reviewer별 Queue를 구성하면 §36 SLA는 구조적으로 불가능하다. 본 문서는 8종 인덱스를 현행 스키마 관례와 대조하고, 이들이 지원해야 할 조회 패턴을 명세한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(8종 전부, 순신규 테이블 위 신규 인덱스)**

Ground-Truth ①/②의 실측 결론: Campaign/Review/Decision 테이블 자체가 존재하지 않으므로(grep 0), 그 위에 걸리는 인덱스도 당연히 ABSENT다 — 인덱스는 테이블에 종속된 물리 구조이며 테이블보다 먼저 존재할 수 없다. 다만 Reviewer/User/Role 축의 **조회 대상 데이터**는 4곳에 산재해 실재한다: api_key(`Db.php:951`, role 컬럼 보유)·app_user(`UserAuth.php:54`, team_role 보유)·team_role 유효 권한(`TeamPermissions.php:393` effectiveForUser)·license_key(`routes.php:2800`). 이 산재 자체가 "통합 인덱스 부재"의 증거다 — 만약 통합 인덱스가 있었다면 4곳에 흩어져 있지 않았을 것이다.

### 2.2 하위항목 대조표

| SPEC §35 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Campaign 인덱스 | **ABSENT** | Campaign 테이블 grep 0 |
| Reviewer 인덱스 | **ABSENT(대상 데이터만 PARTIAL)** | Reviewer 전용 테이블 없음. 검토자 후보 데이터는 `TeamPermissions.php:393`(effectiveForUser, manager/owner 판별) 소재 |
| User 인덱스 | **ABSENT(대상 데이터만 PARTIAL)** | Certification 전용 User 인덱스 없음. 원천 데이터는 `UserAuth.php:54`(app_user PK) |
| Role 인덱스 | **ABSENT(대상 데이터만 PARTIAL)** | Certification Role 인덱스 없음. 원천은 api_key `role` 컬럼(`Db.php:951`)·team_role(`TeamPermissions.php:393`) — 3-rank 병렬(plan/api_key/team_role) 자체가 산재 |
| Permission 인덱스 | **ABSENT** | Permission 전용 인덱스 grep 0 |
| Decision 인덱스 | **ABSENT** | Decision 테이블 자체 grep 0 |
| Status 인덱스 | **ABSENT(관례만 참고 가능)** | Certification status 인덱스 없음. 유사 관례는 api_key `is_active`(`Db.php:951`, `index.php:506` WHERE 절 사용) |
| Due Date 인덱스 | **ABSENT(관례만 참고 가능)** | Certification Due Date 인덱스 없음. 유사 관례는 api_key `expires_at`(`index.php:518` WHERE 절 사용) |

### 2.3 KEEP_SEPARATE

- 데이터 certification(`DataPlatform.php:281`)·`GeniegoKnowledge.php:574`(dataTrust) — 데이터 자산 신뢰도 조회용 인덱스는 있을 수 있으나 이는 데이터 품질 도메인이며 사람의 역할·권한 검토 인덱스가 아니다. Certification Index Strategy가 이를 참고 사례로 흡수하지 않는다.

## 3. Canonical 설계 (8 Index)

| # | 인덱스 | 설계 대상 컬럼(안) | 지원 조회 패턴 | 성능 목표(§36 연계) |
|---|---|---|---|---|
| 1 | Campaign | `(tenant_id, status, due_date)` | 활성 캠페인 목록·마감임박 조회 | Campaign 생성 ≤3초 |
| 2 | Reviewer | `(tenant_id, reviewer_user_id, status)` | 특정 검토자의 Pending Queue 조회 | Reviewer Queue 생성 ≤30초(100만 배정) |
| 3 | User | `(tenant_id, subject_user_id)` | 특정 사용자의 배정·검토 이력 조회 | Review 조회 ≤200ms |
| 4 | Role | `(tenant_id, role, campaign_id)` | 특정 role 전체 배정 검토 대상 산출 | Reviewer Queue 생성 ≤30초 |
| 5 | Permission | `(tenant_id, permission_key)` | 고위험 permission 배정 우선 검토 | Review 조회 ≤200ms |
| 6 | Decision | `(review_id, decided_at)` | Decision 이력 시계열 조회(불변 append-only) | Decision 저장 ≤100ms |
| 7 | Status | `(tenant_id, status)` | Pending/InReview/Escalated 상태별 집계 | Analytics 갱신 ≤5분 |
| 8 | Due Date | `(tenant_id, due_date, status)` | SLA 초과 임박 항목 우선순위 조회 | Reviewer Queue 생성 ≤30초 |

**설계 원칙**:
1. **tenant_id 선두 컬럼 필수** — 8개 인덱스 전부 `tenant_id`를 선두 컬럼으로 두어 DATABASE_CONSTRAINT 문서의 Tenant Isolation 제약과 정합시킨다(멀티테넌트 인덱스 스캔 시 타 테넌트 데이터 혼입 차단).
2. **복합 인덱스 우선** — 단일 컬럼 인덱스보다 조회 패턴(Reviewer+Status, Due Date+Status)에 맞춘 복합 인덱스로 §36 SLA(Reviewer Queue ≤30초/100만 건)를 충족한다.
3. **api_key 관례 참고** — Status(#7)·Due Date(#8) 인덱스는 `Db.php:951`(is_active·expires_at 컬럼)·`index.php:506`(`WHERE is_active=1`)·`:518`(expires_at 비교)의 실제 WHERE 절 사용 패턴을 참고해 카디널리티 설계를 정한다(패턴 참고이지 흡수 아님 — Certification 인덱스는 신규 테이블에 신설).

### 3.1 인덱스별 정직 판정 서술

- **Campaign(#1, ABSENT)**: 인덱싱할 테이블 자체가 없다. 마케팅 캠페인(`AdminGrowth.php:1063`류)은 이질 도메인이므로 인덱스 설계 참고 대상에서도 제외한다(KEEP_SEPARATE 원칙 일관 적용).
- **Reviewer(#2, ABSENT · 대상 데이터 PARTIAL)**: "누가 검토자인가"를 판별하는 substrate는 `TeamPermissions.php:393`(effectiveForUser의 owner/manager 판별)에 있으나, 이는 팀 권한 계산기이지 Reviewer 배정 테이블이 아니다. 검토자 후보를 인덱싱하려면 이 함수 결과를 Certification 신규 스키마로 물리화(materialize)해야 한다.
- **User/Role(#3·#4, ABSENT · 대상 데이터 PARTIAL)**: 3-rank(plan·api_key·team_role)가 직교 병렬 산재한다는 ERRE Part 3-7 판정(재플래그 금지)이 여기서도 유효하다 — Role 인덱스가 통합 조회를 지원하려면 3개 원천(`Db.php:951` role 컬럼·`TeamPermissions.php:393` team_role·plan rank)을 조인하는 신규 인덱스 전략이 필요하다.
- **Permission/Decision(#5·#6, ABSENT)**: 완전 그린필드. 특히 Decision 인덱스(`review_id, decided_at`)는 DATABASE_CONSTRAINT 문서의 Immutable Decision 제약과 함께 설계되어야 한다 — append-only 테이블의 시계열 조회 인덱스는 삭제·수정이 없다는 전제로 최적화할 수 있다.
- **Status/Due Date(#7·#8, ABSENT · 관례 참고 가능)**: api_key의 `is_active`(`Db.php:951`, `index.php:506`에서 실제 `WHERE is_active=1` 사용)·`expires_at`(`:518`에서 실제 비교 사용)는 "활성 상태·만료 임박"이라는 유사 개념의 실 운영 인덱스 패턴이다. 다만 이는 api_key 도메인 전용이며 Certification review/campaign 테이블에 자동 적용되지 않는다 — 패턴만 참고하고 신규 인덱스로 설계한다.

## 4. Kernel/substrate 매핑

| SPEC §35 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Reviewer/User/Role 원천 데이터 | `TeamPermissions.php:393`·`UserAuth.php:54`·`Db.php:951` | 조회 대상 참조(인덱스 자체는 신규) |
| Status/Due Date 조회 패턴 참고 | `index.php:506`(is_active)·`:518`(expires_at) | 관례 참고(인덱스 자체는 신규) |
| Campaign/Permission/Decision 인덱스 | 없음 | 신규 |

## 5. 무후퇴 · Extend

Golden Rule(Wrap)에 따라 8종 인덱스는 기존 api_key(`Db.php:951`)·app_user(`UserAuth.php:54`)·team_role(`TeamPermissions.php:393`) 테이블의 스키마·기존 인덱스를 변경하지 않는다. Certification 신규 테이블은 이들을 **읽기 전용으로 참조**(FK 또는 조회 join)하며, 원천 테이블의 쓰기 경로·기존 인덱스 전략은 그대로 유지된다. `index.php:506`·`:518`의 WHERE 절 사용 패턴은 설계 참고일 뿐 해당 미들웨어 코드를 수정하지 않는다.

### 5.1 무후퇴 회귀 시나리오

1. **원천 테이블 인덱스 불변**: Certification 신규 조회가 `Db.php:951`(api_key)·`UserAuth.php:54`(app_user)·`TeamPermissions.php:393`(team_role effectiveForUser)을 참조하더라도, 이들 테이블의 기존 인덱스·쿼리 실행계획은 변경하지 않는다 — Certification 조회는 별도 신규 인덱스로 수행한다.
2. **tenant_id 정합 유지**: 8개 신규 인덱스가 tenant_id를 선두 컬럼으로 두는 설계는 DATABASE_CONSTRAINT 문서(§34 Tenant Isolation)와 반드시 정합해야 하며, 어느 한쪽만 강제되고 다른 쪽이 누락되면 인덱스 설계와 제약 설계 사이 괴리로 인한 크로스테넌트 조회 위험이 생긴다.
3. **KEEP_SEPARATE 인덱스 불흡수**: 데이터 certification(`DataPlatform.php:281`) 도메인의 조회 인덱스가 존재하더라도 이를 "Certification Index Strategy가 이미 일부 구현됨"으로 오판하지 않는다 — 완전히 다른 스키마·다른 목적이다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 1~3-7 선행 인증 완결 확인
- [ ] DATABASE_CONSTRAINT(§34) Tenant Isolation 설계와 8개 인덱스 tenant_id 선두 컬럼 정합 확인
- [ ] 8종 인덱스 각각의 복합 컬럼 순서 확정(코드 0 유지, 설계만)
- [ ] PERFORMANCE_REQUIREMENTS(§36) SLA(Reviewer Queue ≤30초/100만) 충족 여부 EXPLAIN 계획 검토(실 구현 이후)
- [ ] Reviewer/User/Role 3원천(api_key·app_user·team_role) 조인 인덱스 전략 확정
- [ ] Decision 인덱스(§34 Immutable Decision 연계) append-only 시계열 최적화 검토
- [ ] KEEP_SEPARATE(데이터 certification 인덱스) 오흡수 여부 재검증
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득(사용자 명시 승인 전 착수 금지)

### 6.1 성능 연계 참고

인덱스 미비 상태에서 §36 SLA를 시도하면 100만 Assignment 스캔 시 Reviewer Queue 생성이 수 분~수십 분대로 악화될 수 있다(구조적 추정 — 실측 벤치마크는 실 구현 이후). 8종 인덱스는 이 리스크를 상쇄하는 선행 설계이며, 실 구현 세션에서 EXPLAIN ANALYZE로 실측 검증이 필요하다.

## 7. 반날조 인용 출처

- SPEC §35(Index) / ADR D-1(Extend-Wrap) · D-6(KEEP_SEPARATE)
- Ground-Truth ① §E(배정 상태 스키마: `Db.php:951`·`UserAuth.php:54`·`TeamPermissions.php:393`·`routes.php:2800`) · ② §2(#1~#3 ABSENT)
- 인용 파일:라인 — `backend/src/Db.php:951`(api_key). `backend/src/Handlers/UserAuth.php:54`(app_user). `backend/src/Handlers/TeamPermissions.php:393`(effectiveForUser). `backend/src/routes.php:2800`(license_key). `backend/public/index.php:506`(is_active WHERE)·`:518`(expires_at 비교).
- ABSENT 8종(인덱스 자체)은 grep 0 실측(Ground-Truth ② §2) — 원천 데이터 실재를 "Certification 인덱스가 이미 구현됨"으로 과장하지 않음.
- 본 문서는 PERFORMANCE_REQUIREMENTS DSAR(§36)와 짝을 이루며, 인덱스 설계 없이는 §36 SLA가 구조적으로 달성 불가능함을 전제한다.
