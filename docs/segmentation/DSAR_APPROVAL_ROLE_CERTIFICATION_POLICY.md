# DSAR — Role Certification Policy (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role의 **공식 인증(certification/attestation) 정책**을 정의한다. Certification은 권한 있는 인증자(certifier)가 "이 Role의 정의·Permission·범위·위험·배정 인구가 정당하다"고 **서명·attest**하는 무거운 통제 절차다. Review(경량 상시 점검·Part 3-1 Review Policy)의 상위 개념으로, 규제·감사(SOX·ISO 등) 대응의 근거가 되는 **주기적 접근 인증(Access Certification)** 이다.

★ 본 문서는 Certification **정책·계약**만 정의한다. **실 Certification Workflow(캠페인 생성·certifier 큐·서명 수집·기한 강제·증적 봉인)는 후속** 승인세션(BLOCKED_PREREQUISITE).

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_ref` | 대상 Canonical Role(코드+버전) 참조 |
| `certification_required` | 인증 필수 여부(고위험/승인/재무/컴플라이언스 Role은 Mandatory) |
| `certification_frequency` | 인증 주기(③) |
| `last_certified_at` / `next_certification_at` | 최종 인증·다음 인증 예정(파생) |
| `certifier_role_ref` | 인증 수행 권한을 갖는 **Role 참조**(사람 하드코딩 아님·Role로 결속) |
| `business_certification_required` | 비즈니스 정당성 인증 필수 |
| `security_certification_required` | 보안(위험·과대권한) 인증 필수 |
| `compliance_certification_required` | 규제 인증 필수 |
| `permission_equivalence_check` | 인증 시 Role↔Permission 매핑이 정본과 등가인지 검증(drift 차단) |
| `assignment_population_check_ref` | 배정 인구(누가 이 Role을 보유) 재확인 참조(Part 3-3 Assignment) |
| `conflict_sod_review_ref` | 이해상충/직무분리(SoD) 검토 참조 |
| `certification_evidence` | 인증 근거(certifier·서명·판정·스냅샷 digest) append-only·불변 |
| `overdue_behavior` | 인증 기한 초과 시 동작(③) |

## ③ 열거형

- **`certification_frequency`**: `QUARTERLY` · `SEMI_ANNUAL` · `ANNUAL`(규제 기본) · `EVENT_DRIVEN`(중대 권한변경 시) · `NONE`(비-Mandatory Role만).
- **`certifier` 자격**(certifier_role_ref가 가리키는 Role의 요건): `SECURITY_OWNER` 또는 `COMPLIANCE_OWNER` 급 이상 · self-certification 금지(대상 Role 소유자가 자기 Role을 단독 인증 불가·maker≠checker).
- **`overdue_behavior`**: `WARN` · `RESTRICT_NEW_ASSIGNMENT` · `SUSPEND`(재인증까지 행사 차단·fail-closed) · `REVOKE_UNCERTIFIED_ASSIGNMENT`(미인증 배정 회수·최고강도).
  - 고위험/승인/재무/컴플라이언스 Role 기본값 = `SUSPEND` 이상.

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 인증(attestation) 정책 | — | **ABSENT** | 접근 인증 개념 전무(ADR §1 "Review/Certification…순신규") |
| certifier_role_ref | (인접) admin_level master | `UserAdmin.php:43-46`(`isMaster`) · `:50`(`requireMasterAdmin`) | master 게이트는 실재하나 "Role 인증자" 역할 아님 → certifier 결속 substrate 아님 |
| permission_equivalence_check | (재료) acl_permission 매핑 | `TeamPermissions.php:39,152-159`(menu×action) | Permission 매핑 실재하나 등가검증·drift 탐지 로직 ABSENT |
| assignment_population_check | (재료) team_id 소속 | `TeamPermissions.php:562`(app_user.team_id) | 소속은 있으나 "Role 배정 인구" 조회·인증 없음(Assignment 엔티티 ABSENT) |
| conflict_sod_review | — | **ABSENT** | SoD/이해상충 검토 전무 |
| certification_evidence | `auth_audit_log`(변경 로그만) | 참조: GROUND_TRUTH §1.1·§3 Evidence=PARTIAL | 서명·attestation 봉인 아님 |
| certification_frequency/overdue | — | **ABSENT** | 인증 주기/기한 컬럼 부재 |

→ Role Certification은 **순신규**. permission 매핑·admin master 게이트·team_id 소속이 부분 **재료**로 실재하나, 인증 절차·서명·등가검증·SoD·주기는 전무.

## ⑤ 설계원칙

- **Golden Rule**: 인증 시 검증 대상인 Permission 매핑은 기존 `acl_permission`(`TeamPermissions.php:39,152-159`)을 정본 소스로 **재사용**하고, certifier는 신규 사람 저장소가 아니라 **Role Owner(Part 3-1 Owner)** 를 참조. 중복 인증 엔진 신설 금지.
- **maker≠checker(SoD)**: 대상 Role의 소유자·수혜자가 자기 Role을 단독 인증 불가. `certifier_role_ref`는 독립 보안/컴플라이언스 Role.
- **Role≠Permission≠Authority≠JobTitle≠Plan**: Certification은 Role 정당성을 **attest**할 뿐 Permission을 부여하지 않는다. `certifier_role_ref`는 Role 참조이지 plan='admin' god flag(§6.5 위반·후속 정합) 재사용 금지.
- **Fail-closed overdue**: 고위험 Role 미인증은 최소 신규 Assignment 차단, 규제 Role은 SUSPEND. 미인증을 "정상"으로 가짜녹색 표시 금지.
- **Historical Immutability**: `certification_evidence`는 append-only·불변 digest. 감사 시 과거 인증 시점 상태·서명자 재구성 가능.

## ⑥ Gap

- **엔진 전무**: 인증 주기·certifier 큐·등가검증·SoD·overdue·증적 봉인 미구현(코드 0). **실 Certification Workflow는 후속**(명시).
- **BLOCKED_PREREQUISITE (RP-002)**: `permission_equivalence_check`는 선행 Part 2 Permission Engine(Permission Definition/Version) ABSENT에 종속, `assignment_population_check_ref`는 Part 3-3 Assignment 엔티티(ABSENT)에 종속, `conflict_sod_review_ref`는 SoD 모델(ABSENT) 선행. Role Registry 본체 신설 전 인증 대상 정본이 없다.
- **cover: 0** — 설계 명세·NOT_CERTIFIED. 문서 제목 상태 자체가 NOT_CERTIFIED이며, 어떤 Role도 아직 인증 워크플로로 attest되지 않는다.
- **289차 재플래그 금지**: admin master 게이트·team_role 미러는 별건. 인증 미비를 그 코드의 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_REVIEW_POLICY]] · [[DSAR_APPROVAL_ROLE_OWNER]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].
