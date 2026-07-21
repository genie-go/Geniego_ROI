# DSAR — Reviewer Governance: Primary/Secondary Reviewer·Business/Data/App Owner·Security/Compliance Officer·External Auditor (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §6(Reviewer Governance)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §6은 Access Certification/Review 사이클을 실제로 수행하는 **인간 행위자의 역할 체계**를 정의한다. 다루는 하위항목:

- **Primary Reviewer** — 피검토 사용자(subject)의 접근권한을 1차 검토·판정하는 역할. 통상 직속 매니저 또는 리소스 소유자.
- **Secondary Reviewer** — Primary Reviewer 판정에 대한 교차검증·이의제기 대응 역할. 고위험(High/Critical Sensitivity) 리소스에서 필수.
- **Business Owner** — 업무 도메인(예: 재무·CRM·정산)의 최종 접근 승인 책임자.
- **Data Owner** — 특정 데이터 자산(테이블·리포트·PII 집합)의 접근을 승인하는 책임자.
- **App/System Owner** — 특정 애플리케이션/모듈(예: WMS, Alerting)의 접근을 승인하는 책임자.
- **Security Officer** — 보안 관점 리스크 평가·override 권한을 가진 역할.
- **Compliance Officer** — 규제 준수(GDPR/개인정보보호법 등) 관점 검토 권한.
- **External Auditor** — 외부 감사인용 read-only 접근 및 감사 흔적 열람 역할.
- **Segregation of Duties(SoD)** — 리뷰어가 자기 자신의 접근권한을 스스로 승인할 수 없도록 하는 이해상충 방지 규칙.

본 문서는 GeniegoROI 코드베이스에 이 역할 체계가 실제로 존재하는지 실측 대조하고, 존재하지 않는 부분에 대한 순신규 설계 계약을 정의한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①(실 구현 목록)에 "Reviewer/Owner/Officer/Auditor"라는 access-certification 역할 개념에 대응하는 substrate가 전무하다(grep 0). Ground-Truth ②(중복구현 감사)가 확인한 근접 문자열 매칭은 전부 access review와 무관한 타 도메인이며 KEEP_SEPARATE로 확정되어 있다. 즉 Reviewer Governance는 순신규(그린필드) 계층이다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Primary Reviewer 지정·자격요건 | ABSENT | grep 0. 유사 인물배정 개념 없음 |
| Secondary Reviewer(교차검증) | ABSENT | grep 0 |
| Business Owner 승인권한 | ABSENT | grep 0 |
| Data Owner 승인권한 | ABSENT | grep 0. `DataPlatform.php:281`은 데이터 자산 신뢰도(Trust Score) 산출 로직이며 자산 소유자 배정이 아님 — KEEP_SEPARATE 대상 |
| App/System Owner 승인권한 | ABSENT | grep 0 |
| Security Officer(override 권한) | ABSENT | grep 0. `SecurityAudit.php:12`(클래스)·`:56`(verify)는 감사기록 검증기이며 사람 역할이 아님 |
| Compliance Officer | ABSENT | grep 0. `Compliance.php:133`(UNION 뷰)는 조회용 집계이며 역할 배정 체계가 아님 |
| External Auditor(read-only 열람) | ABSENT | grep 0 |
| Segregation of Duties(자기검토 금지) | ABSENT | grep 0. 현 substrate 전반에 "리뷰어≠피검토자" 강제 로직 부재 |
| 역할 계층(Officer override Reviewer) | ABSENT | grep 0 |

### 2.3 KEEP_SEPARATE

- `PM/Assignees.php:14` — PM(프로젝트 관리) 태스크 모듈의 `reviewer` enum 값. 코드리뷰·작업검토 역할이며 access certification reviewer와 이름만 동일한 오탐. 프로젝트 관리 도메인에 남긴다.
- `Reviews.php:174`(`escalateNegatives` 등) — 상품/커머스 고객 리뷰(product review) 도메인. 부정적 상품평 에스컬레이션 로직으로, 접근권한 검토와 무관. 커머스 도메인에 남긴다.

두 근접물 모두 "review/reviewer"라는 영어 단어가 겹칠 뿐, 대상(피검토물)·목적(권한 vs 상품/작업)·행위자 자격이 전혀 다르므로 흡수·개명 금지.

## 3. Canonical 설계

Reviewer Governance는 아래 계약으로 신규 정의한다(코드 미구현, 설계 계약만).

- **역할 테이블**(신규): `role_certification_reviewer_role` — `reviewer_type`(PRIMARY/SECONDARY/BUSINESS_OWNER/DATA_OWNER/APP_OWNER/SECURITY_OFFICER/COMPLIANCE_OFFICER/EXTERNAL_AUDITOR), `assigned_user_id`, `scope_ref`(대상 리소스/도메인), `assigned_at`, `assigned_by`, `expires_at`.
- **자격요건**: Primary Reviewer는 피검토자의 조직상 상위자(관리자) 또는 리소스 소유자여야 하며, 본인이 본인의 검토자가 될 수 없다(SoD 강제, fail-secure).
- **권한 범위**: 각 역할은 자신의 `scope_ref` 밖의 결정에 개입 불가. Officer 역할은 override 시 사유 필수 입력 + 별도 불변 로그(§10 Decision Ledger와 연결, D-4).
- **역할 계층**: External Auditor는 항상 read-only. Security/Compliance Officer는 Primary/Secondary 판정을 override 가능하나 override 자체가 별도 Decision 레코드로 기록되어야 한다(§10과 연결).
- **다중 Owner 충돌**: Business/Data/App Owner가 서로 다른 판정을 내릴 경우 Escalation(§9 Review Queue의 ESCALATED 상태)으로 강제 전이.
- **자격 재검증 주기**: Reviewer/Owner/Officer 지정 자체도 정기 재검증 대상이다(예: 조직개편으로 Business Owner가 더 이상 해당 도메인 소속이 아닌 경우 자동 무효화). 이는 §8 Review Assignment의 Modified 트리거와 동일 계열의 신호를 소비한다.
- **External Auditor 특수 제약**: 읽기 전용이며 Decision(§10)을 내릴 수 없다. 감사 목적의 열람 이력 자체도 SecurityAudit에 별도 이벤트로 남긴다(감사인이 무엇을 열람했는지도 감사 대상).
- **역할 중복 배정 제한**: 동일 인물이 Primary Reviewer와 Secondary Reviewer를 동시에 겸임할 수 없다(SoD 강화). Business/Data/App Owner는 도메인이 다르면 겸임 가능하나 동일 scope_ref 내 겸임은 금지.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Reviewer 신원(계정 자체) | `UserAuth.php:54`(app_user) | 승격 후보 — 신원 테이블은 재사용, 역할 배정 레코드는 신규 |
| Officer 권한 상한 표현 | `TeamPermissions.php:356`(scopeWithinCap)·`:641`(putMemberPermissions) | 승격 후보 — 개념적으로 근접(상한 교집합 계산)하나 "권한 위임"과 "검토 역할 배정"은 별개 개념이므로 로직 패턴만 참고, 데이터 모델은 신규 |
| 결정 불변 기록 | `SecurityAudit.php:12`(클래스)·`:56`(verify)·`:27`(prev_hash)·`:63`(hash_chain) | 참조전용(흡수 아님, D-2) — Reviewer의 Decision은 SecurityAudit에 append 되지만 SecurityAudit 자체가 Reviewer Governance로 대체되지 않음 |
| 만료 강제 | `index.php:518`(expires)·`UserAuth.php:206`(세션 유휴) | 참고 패턴 — 시간 기반 만료 강제 방식(fail-secure)은 재사용 가능한 설계 패턴이나 Reviewer 배정 자체는 신규 |
| 순수 오탐(흡수 금지) | `PM/Assignees.php:14`·`Reviews.php:174` | 신규 아님 — KEEP_SEPARATE 유지 |

## 5. 무후퇴 · Extend

Golden Rule(Extend, not Replace)에 따라:

- `SecurityAudit` 해시체인은 대체하지 않고 Reviewer Decision의 기록처로 **참조**한다(D-2). Reviewer Governance가 자체 감사로그 엔진을 새로 만들지 않는다.
- `TeamPermissions`의 상한 계산 패턴(scopeWithinCap/putMemberPermissions)은 코드 재구현 없이 **개념 참고**만 하고, 실제 Reviewer 배정 테이블/로직은 별도 신설한다 — 두 도메인(권한 위임 vs 검토 역할 배정)을 혼동하여 기존 TeamPermissions 로직을 확장하는 방식은 금지(D-5, 개념 분리).
- `PM/Assignees.php`, `Reviews.php`는 원 도메인(프로젝트관리/커머스)에서 무수정 보존. 이름 충돌을 이유로 리팩터링·개명하지 않는다(가짜녹색 회피).
- P1~P5(289차 후속 보안수정: writeGuard 서버전역·featurePlan fail-secure·admin_roles 폐기·admin SSOT·세션토큰 hash-only)는 무후퇴 유지 대상이며 Reviewer Governance 신설이 이를 훼손하지 않는다.

## 6. 완료 게이트

- [ ] Part 1(Role Inventory)~Part 3-7(ERRE) 선행 계층 CERTIFIED 완료 — 현재 전부 NOT_CERTIFIED (BLOCKED_PREREQUISITE 근본원인)
- [ ] `role_certification_reviewer_role` 스키마 설계 리뷰 승인
- [ ] SoD(자기검토 금지) fail-secure 규칙의 서버측 강제 지점 확정
- [ ] Officer override와 §10 Decision Ledger 연결 계약 확정
- [ ] External Auditor read-only 제약 및 열람 이력 기록 방식 확정
- [ ] 역할 중복 배정 제한(SoD 강화) 규칙 리뷰
- [ ] KEEP_SEPARATE 목록(PM/Assignees.php:14, Reviews.php:174) 재검증 — 재플래그 금지
- [ ] 코드 변경 0 유지 확인 (본 문서는 설계 명세이며 구현 착수 아님)
- [ ] 사용자 명시 승인 없이 구현 착수 금지

## 7. 반날조 인용 출처

- SPEC §6(Reviewer Governance) / ADR D-1(Extend-Wrap) · D-2(SecurityAudit 참조, 흡수 아님) · D-5(Reviewer Delegation 상한, 본 문서에서는 상한 계산 패턴만 참고) · D-6(KEEP_SEPARATE)
- Ground-Truth ① — Reviewer/Owner/Officer/Auditor 역할체계 대응 substrate 없음(실 구현 목록에 부재)
- Ground-Truth ② — `PM/Assignees.php:14`, `Reviews.php:174` KEEP_SEPARATE 확정 목록
- ABSENT 판정 항목(§2.2 전 행)은 grep 0 실측이며, 근접물(DataPlatform.php:281, SecurityAudit.php, Compliance.php:133)로 채워 넣지 않았음을 명시
