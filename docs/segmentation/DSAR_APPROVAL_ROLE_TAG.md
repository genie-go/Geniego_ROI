# DSAR — Role Tag (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role에 부착하는 **분류·성격 태그(Tag)** 를 정의한다. Tag는 Role의 위험·재무성·승인성·데이터 민감도·수출통제·행정성·임시/비상 허용·actor 제약·마이그레이션/폐기 대기·검토/인증 요구 등을 **선언적으로 표시**하여 거버넌스 정책(Review 빈도·Certification 필수·Owner 요건·Assignment 제약)을 **자동 유발**하는 보조 신호다.

★**Tag는 보조 정보다. Runtime authz는 Canonical Field로 수행한다.** Tag `HIGH_RISK`가 곧 인가 거부 규칙이 아니라, Certification 필수·강한 overdue 동작·추가 Owner 요구를 **트리거**하는 메타 신호다. Tag를 Runtime authz Identifier로 사용 금지.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_ref` | 대상 Canonical Role(코드+버전) 참조 |
| `tag` | 태그 값(③ 열거형·다중 부착 가능) |
| `assigned_by` | 태그 부착 주체(Owner/Steward 참조) |
| `assigned_at` | 부착 시각 |
| `rationale` | 부착 근거(왜 이 태그인가) |
| `valid_from` / `valid_to` | 태그 유효기간(임시/마이그레이션 태그용) |
| `derived` | 파생 여부(Metadata·위험점수에서 자동 도출된 태그인지 vs 수동 부착) |

## ③ 열거형

**`tag`** (다중 부착 가능):
`HIGH_RISK` · `FINANCIAL` · `APPROVAL` · `SENSITIVE_DATA` · `EXPORT` · `ADMIN` · `TEMPORARY_ALLOWED` · `EMERGENCY_ALLOWED` · `MACHINE_ONLY` · `HUMAN_ONLY` · `MIGRATION_PENDING` · `DEPRECATION_PENDING` · `CERTIFICATION_REQUIRED` · `OWNER_REVIEW_REQUIRED`

거버넌스 유발(예시·Enforcement 대체 아님):
- `HIGH_RISK`/`FINANCIAL`/`APPROVAL`/`SENSITIVE_DATA`/`EXPORT` → Certification 필수·강한 overdue·추가 Owner(Security/Data/Compliance).
- `MACHINE_ONLY`/`HUMAN_ONLY` → Assignment actor eligibility 제약(사람↔기계 배정 차단은 Part 3-3에서 강제).
- `TEMPORARY_ALLOWED`/`EMERGENCY_ALLOWED` → 시간제한·break-glass 경로 필요(실 JIT은 후속).
- `MIGRATION_PENDING`/`DEPRECATION_PENDING` → 신규 Assignment 억제·Replacement(Part 3-1 Replacement) 연계.
- `CERTIFICATION_REQUIRED`/`OWNER_REVIEW_REQUIRED` → Review/Certification 스케줄 강제.

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 태그(분류 라벨) 전반 | — | **ABSENT** | Role 성격 태깅 개념 전무 |
| `ADMIN` 성격 | (인접) plan 'admin' god flag · api_key admin · AdminMenu | `TeamPermissions.php:132`(isAdmin) · `Keys.php:95`(validRoles) · `AdminMenu.php:57` | admin 성격은 실재하나 선언적 Tag가 아니라 인가값 자체(§6.5 위반 god flag 포함) → Tag substrate 아님 |
| `MACHINE_ONLY`/`HUMAN_ONLY` | (재료) api_key role vs team_role | `Keys.php:95`(api_key role) · `TeamPermissions.php:120-131`(team_role) | actor 축 분리는 있으나 Role별 eligibility 태그 없음 |
| `APPROVAL` | — | **ABSENT** | 승인성 태그 없음(Approval Authority 개념 자체 부재) |
| `SENSITIVE_DATA`/`EXPORT`/`FINANCIAL` | — | **ABSENT** | 데이터/수출/재무 위험 태깅 없음 |
| `CERTIFICATION_REQUIRED`/`OWNER_REVIEW_REQUIRED` | — | **ABSENT** | 검토/인증 요구 태그 없음(Review/Certification 자체 ABSENT) |
| `DEPRECATION_PENDING` | (인접) admin_roles/user_roles 폐기 | `routes.php:1670` · `UserAdmin.php:596-599` | 실제 폐기 사례이나 태그 메커니즘 아님·289차 처리완료(재플래그 금지) |

→ Role Tag는 **순신규**. admin 성격·actor 축·폐기 사례가 인접하나 어느 것도 "선언적·다중 부착·거버넌스 유발" Tag 구조가 아니다.

## ⑤ 설계원칙

- **Tag ≠ Runtime authz Identifier**: 인가 판정은 Canonical Role Code로만. Tag는 Certification/Review/Owner/Assignment 제약을 **유발**하는 보조 신호이지 게이트 규칙 자체가 아니다.
- **Golden Rule**: 신규 Tag 저장소를 만들되 `MACHINE_ONLY`/`HUMAN_ONLY`의 actor 판정은 기존 api_key role(`Keys.php:95`) vs team_role(`TeamPermissions.php:120-131`) 축을 **재사용**. 중복 actor 분류 체계 신설 금지.
- **`ADMIN` 태그와 plan god flag 분리**: `ADMIN` 태그는 서술일 뿐, §6.5 위반인 plan='admin' 우회(`TeamPermissions.php:132`·`AuthContext.jsx:720`)를 정당화·재현하지 않는다. Role≠Plan.
- **파생 우선**: `derived=true` 태그는 Metadata(data_domain 등)·위험점수에서 자동 도출. 임의 수동 부착 남발 금지(SSOT 파생).
- **Role≠Permission≠Authority≠JobTitle≠Plan**: `APPROVAL` 태그는 Role이 승인 성격임을 표시할 뿐 Approval Authority(Part 5)를 부여하지 않는다.

## ⑥ Gap

- **엔진 전무**: Tag 저장·다중 부착·파생 도출·거버넌스 유발 전부 미구현(코드 0).
- **BLOCKED_PREREQUISITE (RP-002)**: `role_ref` 결속 대상 Role Registry(ABSENT)·유발 대상 Review/Certification/Assignment(ABSENT) 선행. actor eligibility 강제는 Part 3-3 Assignment 종속.
- **cover: 0** — 설계 명세·NOT_CERTIFIED. 어떤 정책도 아직 Tag를 소비하지 않는다.
- **289차 재플래그 금지**: plan god flag·admin_roles 폐기·admin 인가값은 별건·처리완료. Tag 부재를 그 코드의 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_METADATA]] · [[DSAR_APPROVAL_ROLE_REPLACEMENT]] · [[DSAR_APPROVAL_ROLE_CERTIFICATION_POLICY]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].
