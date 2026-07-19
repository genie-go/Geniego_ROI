# DSAR — Role Review Policy (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role의 **주기적 검토(periodic review) 정책**을 정의한다. Review는 Role이 여전히 필요한지, Permission/Scope가 과대(least-privilege 위반)하지 않은지, 소유·의존이 유효한지, 사용되지 않는 좀비 Role인지, 폐기(deprecated) 의존이 남았는지를 **정기적으로 재확인**하는 거버넌스 절차다. Review는 Certification(공식 서명·attestation·Part 3-1 Certification Policy)과 구별되는 **경량 상시 점검**이며, 그 결과가 Certification의 입력이 된다.

Review Policy는 per-Role에 결속하되 Role의 Metadata(위험·도메인)·Tag(CERTIFICATION_REQUIRED/OWNER_REVIEW_REQUIRED)에 따라 빈도·강도를 차등한다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_ref` | 대상 Canonical Role(코드+버전) 참조 |
| `review_required` | 검토 필수 여부(Mandatory Control — 고위험/승인 Role은 비활성화 불가) |
| `review_frequency` | 검토 주기(③ 열거형·기간 표현) |
| `last_review_at` / `next_review_at` | 최종 검토·다음 검토 예정 시각(계산 파생) |
| `next_review_calc` | 다음 검토 산출식(frequency + 최종검토 + 위험가중, 임의 하드코딩 금지·파생) |
| `reviewer_type` | 검토 수행 주체 유형(③) |
| `business_review_required` | 비즈니스 필요성 재확인 필수 |
| `security_review_required` | 보안(위험·과대권한) 재확인 필수 |
| `compliance_review_required` | 규제·컴플라이언스 재확인 필수 |
| `permission_review_required` | Permission 매핑 재확인(least-privilege) 필수 |
| `scope_review_required` | Scope Requirement 재확인 필수 |
| `actor_eligibility_review_required` | 자격 actor 유형(HUMAN/MACHINE) 재확인 필수 |
| `unused_role_threshold` | 무사용 판정 임계(예: N일 무Assignment/무행사) |
| `orphan_detection` | 고아 Role(Owner 부재·Assignment 0·소비 게이트 없음) 탐지 활성 |
| `deprecated_dependency_detection` | 폐기 대상(Permission/하위 Role) 의존 잔존 탐지 활성 |
| `review_evidence` | 검토 근거(검토자·판정·코멘트·스냅샷 digest) append-only |
| `overdue_behavior` | 검토 기한 초과 시 동작(③) |

## ③ 열거형

- **`review_frequency`**: `MONTHLY` · `QUARTERLY` · `SEMI_ANNUAL` · `ANNUAL` · `EVENT_DRIVEN`(권한변경·소유변경 트리거) · `NONE`(비-Mandatory Role만 허용).
- **`reviewer_type`**: `BUSINESS_OWNER` · `SECURITY_OWNER` · `COMPLIANCE_OWNER` · `DATA_OWNER` · `STEWARD` · `DELEGATED_REVIEWER`(위임·이력 보존).
- **`overdue_behavior`**: `WARN`(경고·유지) · `RESTRICT_NEW_ASSIGNMENT`(신규 Assignment 차단·기존 유지) · `SUSPEND`(Role 일시정지·재검토까지 행사 차단·fail-closed) · `ESCALATE`(Owner 에스컬레이션).
  - 고위험/승인/재무 Tag Role의 overdue 기본값 = `RESTRICT_NEW_ASSIGNMENT` 이상(WARN 단독 금지).

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 주기 검토 정책 | — | **ABSENT** | 역할 재검토·재인증 개념 전무(ADR §1 "Review/Certification…순신규") |
| review_frequency / next_review_calc | — | **ABSENT** | 검토 주기/기한 컬럼 부재 |
| unused_role_threshold(무사용 탐지) | — | **ABSENT** | 무사용 Role 탐지 없음(하드코딩 enum·런타임 CRUD 불가, GROUND_TRUTH §3 Lifecycle=ABSENT) |
| orphan_detection | — | **ABSENT** | 고아 Role 탐지 없음(단 admin_roles/user_roles가 실제 고아로 289차 폐기·재플래그 금지) |
| deprecated_dependency_detection | — | **ABSENT** | 폐기 의존 탐지 없음 |
| review_evidence | `auth_audit_log`(변경 로그만) | 참조: GROUND_TRUTH §1.1·§3 Evidence=PARTIAL | 변경 로그일 뿐 검토 attestation 아님 → substrate 부적합 |
| reviewer_type(검토 주체) | (인접) team_role/admin_level | `TeamPermissions.php:120-131` · `UserAdmin.php:43-46` | 위계값일 뿐 "Role 검토자" 역할 아님 |

→ Role Review는 **순신규**. 유일 인접 흔적은 auth_audit_log(변경 로그)뿐이며 검토 판정·기한·근거를 담지 못한다.

## ⑤ 설계원칙

- **Golden Rule**: 신규 Review 저장소를 만들되 `review_evidence`는 기존 `auth_audit_log` 흐름을 **확장·연결**(중복 감사 로그 신설 금지). 검토 주체는 Role Owner(Part 3-1 Owner) 참조로 결속.
- **파생·무하드코딩**: `next_review_calc`는 frequency+최종검토+위험가중에서 **자동 산출**. 임의 날짜 하드코딩 금지(SSOT 파생·§실제값 자동산출 규율).
- **Role≠Permission≠Authority≠JobTitle≠Plan**: `permission_review_required`는 Role에 매핑된 Permission을 검토할 뿐, Review 자체가 Permission을 부여/회수하지 않는다. Review는 거버넌스 신호이지 인가 결정이 아니다.
- **Fail-closed overdue**: 고위험/승인 Role의 검토 기한 초과는 최소 신규 Assignment 차단. "검토 지연=문제없음"으로 가짜녹색 표시 금지.
- **Historical Immutability**: 검토 결과는 append-only + digest 스냅샷. 과거 검토 시점 상태 재구성 가능.

## ⑥ Gap

- **엔진 전무**: 주기 계산·무사용/고아/폐기의존 탐지·overdue 동작·근거 저장 전부 미구현(코드 0).
- **BLOCKED_PREREQUISITE (RP-002)**: Review 대상인 Role Registry/Definition·Permission Mapping·Scope Requirement·Owner가 모두 선행(Part 3-1 본체·Part 2 Permission Engine ABSENT). 검토할 정본 Role이 없으면 Review 정책은 결속할 대상이 없다.
- **cover: 0** — 설계 명세·NOT_CERTIFIED. 어떤 게이트도 Review 상태를 소비하지 않는다.
- **289차 재플래그 금지**: admin_roles/user_roles의 실제 고아·폐기는 이미 289차 판정 완료. 이를 Review 미탐지 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_CERTIFICATION_POLICY]] · [[DSAR_APPROVAL_ROLE_OWNER]] · [[DSAR_APPROVAL_ROLE_TAG]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].
