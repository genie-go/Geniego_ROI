# DSAR — Certification Registry (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §1(Certification Registry)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §1이 정의하는 Certification Registry는, 조직 내 모든 역할(role)·권한(permission)·스코프(scope) 배정(assignment)을 단일 조회 가능 인덱스로 등록·추적하는 Part 3-8의 기초 계층이다. Role Certification & Access Review(정기 접근 검토·인증)가 "누가 무엇에 왜 접근 가능한가"를 판정하려면, 그 판정 대상이 되는 배정 사실 자체가 먼저 하나의 장소에서 조회 가능해야 한다. Registry는 그 전제조건이다. SPEC §1 하위항목은 다음을 포함한다: (a) Assignment 레코드 등록(subject-role-scope-source), (b) 산재된 배정 소스의 통합 인덱싱, (c) 조회/질의(query) 계약, (d) 변경 이력과의 연계, (e) 소유자(owner)/인증자(certifier) 매핑. 본 문서 없이는 Part 3-8의 나머지 6계층(Campaign/Schedule/Scope/Policy/Rule 등)이 검토할 "대상 목록" 자체를 가질 수 없다 — Registry는 후속 계층 전체의 선행조건이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(순신규 그린필드) / 부분 PARTIAL(대상 데이터는 실재)**

Ground-Truth ①/②의 실측 결론: "Certification Registry"라는 이름의 통합 인덱스 엔티티, 조회 API, 소유자/인증자 매핑 스키마는 grep 0 — 순신규다. 다만 Registry가 인덱싱해야 할 **배정 사실 자체**는 실재하며 4곳에 산재해 있다: api_key 테이블(`Db.php:951`, role/scopes 컬럼 보유), app_user(`UserAuth.php:54`, 사용자-역할 연결), team_role 유효 권한 계산(`TeamPermissions.php:393` effectiveForUser), license_key(`routes.php:2800`, 플랜/기능 라이선스 배정). 이 산재 상태 자체가 Registry 부재의 증거다 — 통합 인덱스가 있었다면 4곳에 흩어져 있지 않았을 것이다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Assignment 레코드 등록 | PARTIAL | 개별 소스별로는 등록됨: `Db.php:951`(api_key role/scope), `UserAuth.php:54`(app_user) — 단, Registry 전용 통합 레코드 스키마는 grep 0 |
| 소스 통합 인덱싱 | ABSENT | 4소스 산재 확인(`Db.php:951`·`UserAuth.php:54`·`TeamPermissions.php:393`·`routes.php:2800`), 통합 인덱스/뷰 grep 0 |
| 조회/질의(query) API | ABSENT | grep 0 — 개별 소스별 단건 조회만 가능, 횡단 질의 계약 부재 |
| 변경 이력 연계 | PARTIAL | 감사 로그 substrate는 실재(`SecurityAudit.php:56` verify, `SecurityAudit.php:63` hash_chain) — Registry와의 명시적 연계(assignment_id 참조 등)는 grep 0 |
| 소유자/인증자(certifier) 매핑 | ABSENT | grep 0 — 배정 승인자를 기록하는 필드/테이블 부재 |
| role 표면(surface) 축소 근거 데이터 | ABSENT | ADR D-8이 지적하는 role 표면 축소를 위한 근거(role별 사용 실적 집계)는 grep 0 |

### 2.3 KEEP_SEPARATE (해당 시)

Registry 자체는 신규 개념이라 직접 오흡수 위험은 낮으나, 이름 유사 근접물과의 경계는 명시한다: 데이터 certification(`DataPlatform.php:281`, `GeniegoKnowledge.php:574` dataTrust)은 "certification"이라는 용어를 공유하지만 데이터 자산의 신뢰도(Trust Score) 관리이지 사람의 권한 배정 인덱스가 아니다. KYC 본인확인(`Dsar.php:335`)도 이름이 유사하나 DSAR(정보주체 권리 요청) 본인확인 절차이지 역할/권한 인증 레지스트리가 아니다.

## 3. Canonical 설계

Registry는 다음 개념 계약으로 설계된다(코드 미구현, 설계 명세 단계):

- **Assignment 엔티티**: `subject`(app_user/team_member/api_key 식별자) × `role`(또는 scope) × `source`(발급 시스템: api_key/app_user/team_role/license_key) × `certifier`(승인자) × `status`(active/pending_review/revoked) × `assigned_at`/`last_reviewed_at`.
- **통합 인덱스 뷰**: 4개 산재 소스를 read-only로 UNION하여 단일 조회면(view)을 구성 — Compliance.php:133의 UNION 뷰 패턴(기존 substrate)을 참조 사례로 삼되, 본 Registry는 별도 신규 뷰다(D-2 참조이지 흡수 아님).
- **조회 계약**: subject 기준/role 기준/source 기준 3방향 질의를 지원해야 한다.
- **인증자 매핑**: 각 Assignment는 최초 승인자와 최근 검토자를 구분해 기록해야 한다(Part 3-8 후속 Campaign/Schedule이 소비할 필드).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Assignment 소스 (api_key) | `Db.php:951` | 승격(읽기 전용 통합 대상) |
| Assignment 소스 (app_user) | `UserAuth.php:54` | 승격(읽기 전용 통합 대상) |
| Assignment 소스 (team_role) | `TeamPermissions.php:393`(effectiveForUser) | 승격(읽기 전용 통합 대상) |
| Assignment 소스 (license_key) | `routes.php:2800` | 승격(읽기 전용 통합 대상) |
| 변경 이력 연계 | `SecurityAudit.php:56`·`:63` | 승격(참조 연계, 흡수 아님) |
| 통합 인덱스 뷰 | 없음 — 신규 | 신규 |
| 조회 API | 없음 — 신규 | 신규 |
| 소유자/인증자 매핑 필드 | 없음 — 신규 | 신규 |

## 5. 무후퇴 · Extend

Golden Rule(Wrap)에 따라 Registry는 4개 기존 배정 소스(api_key/app_user/team_role/license_key)의 스키마·쓰기 경로를 하나도 변경하지 않는다. 통합 인덱스는 읽기 전용 뷰/조회 계층으로만 추가되며, 기존 인증·권한 판정 로직(`TeamPermissions.php:393` effectiveForUser 등 P1~P5에서 이미 재활용 확정된 substrate)은 그대로 단일 판정 경로를 유지한다. SecurityAudit(`SecurityAudit.php:56`)은 참조만 하고 흡수하지 않는다(D-2). 데이터 certification(`DataPlatform.php:281`)·KYC(`Dsar.php:335`) 등 이름 유사 근접물은 KEEP_SEPARATE로 격리한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 3-1~3-7 선행 계층(Role Registry/Hierarchy/Assignment/Scoped/Dynamic/Service·System/ERRE) 실 구현 완결 확인
- [ ] Assignment 엔티티 스키마 확정(코드 0 유지, 설계만)
- [ ] 4소스 통합 인덱스 뷰 설계 검토(읽기 전용, 무후퇴 확인)
- [ ] 조회 API 계약 확정
- [ ] 소유자/인증자 매핑 필드 확정
- [ ] KEEP_SEPARATE 근접물(데이터 certification/KYC) 오흡수 여부 재검증
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득(사용자 명시 승인 전 착수 금지)

## 7. 반날조 인용 출처

- SPEC §1(Certification Registry) / ADR D-2(SecurityAudit 참조·흡수아님) · D-8(role 표면 축소·부수발견)
- Ground-Truth ① §(api_key/app_user/team_role/license_key 산재 확인) · ② §(데이터 certification/KYC KEEP_SEPARATE 근거)
- ABSENT 항목(통합 인덱스/조회 API/소유자매핑)은 grep 0 실측 — 근접물(Compliance.php:133 UNION 뷰, DataPlatform.php:281)로 채우지 않음
