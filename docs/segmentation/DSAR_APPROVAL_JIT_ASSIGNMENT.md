# DSAR — JIT Access Governance: 임시 배정 (APPROVAL_JIT_ASSIGNMENT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_ASSIGNMENT`(SPEC §10 Temporary Assignment·Canonical Entity §2)은 승인된 상승 요청에 대해 **시간제한 권한 실체를 생성**하는 엔티티다. 생성 대상(SPEC §10):

| 대상 | 설명 |
|---|---|
| Temporary Role | 임시 역할 |
| Temporary Permission | 임시 권한 |
| Temporary Scope | 임시 범위 |
| Temporary Constraint | 임시 제약 |

**핵심 불변식**: "Standing Assignment로 승격할 수 없다"(SPEC §10) — Zero Standing Privilege(SPEC §0·ADR D-3).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 대상 | 판정 | 재활용/부재 근거(GT 등장 file:line) |
|---|---|---|
| Time-bound Grant Ledger / TTL | **ABSENT** | `acl_permission`에 `expires_at/granted_at/valid_until` **컬럼 부재** `TeamPermissions.php:152`(GT① §F·GT② §2) — 부여 영구 |
| 영속 배정(대비군) | PARTIAL | `putTeamPermissions` 영구배정 `TeamPermissions.php:599`·SSO 매핑 `EnterpriseAuth.php:487`·세션 role 해석 `UserAuth.php:1019` |
| 시한부 grant 발급 **원형** | **재활용(PRESENT)** | impersonation 2h TTL 발급 `UserAdmin.php:472-482`(TTL `:474`·원principal `:478`) |
| revoke semantics | 재활용 | AccessReview `is_active=0` 재사용 `AccessReview.php:210-214`(신규 파괴경로 없음) |
| 즉시/lazy 회수 | PARTIAL | 세션 즉시회수 `UserAdmin.php:344`·lazy purge `UserAuth.php:989` |
| append-only 부여 이력 | 재활용 | AccessReview `:62-80`·증거 `:224-233` |

## 3. 설계 계약 (SPEC 근거·테넌트격리/불변버전)

- **Grant Ledger 신설**: 영속 `acl_permission`(`TeamPermissions.php:152`)을 **파괴하지 않고**, 별도 time-bound grant 원장(`expires_at NOT NULL`)을 신설해 런타임에 합산 투영(ADR D-1). 무기한 grant 거부(TTL 필수).
- **발급 패턴 재사용**: impersonation 2h 발급(`UserAdmin.php:472-482`, 원 principal 보존 `:478`) 패턴을 재사용하되 — impersonation은 **하향 대행**, JIT는 **상향 elevation**으로 분리(ADR D-2·GT② B-2).
- **standing 승격 금지**(SPEC §10): Static Lint(SPEC §29 Permanent Privileged Role·Hardcoded Elevation)이 영구화를 탐지. Runtime Guard(SPEC §28 Permission/Scope Escalation)가 만료·미승인 차단.
- **revoke 재사용**: 회수는 신규 파괴경로 없이 AccessReview `is_active=0`(`:210-214`) 시맨틱 계승. Auto Revocation(SPEC §14 End Time 도달)·Early Revocation(SPEC §15).
- **불변/격리**: 부여·회수는 append-only(AccessReview `:62-80` 선례)·SecurityAudit 체인(`SecurityAudit.php:12-53`). 테넌트 격리(SPEC §33).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | file:line(GT 등장) | 분리 사유 |
|---|---|---|
| impersonation(하향 대행) | `UserAdmin.php:451`·가드 `:466-469`·`routes.php:1675`(등록 `:2712`) | admin→회원 **하향** 대행 — 상향 elevation 아님(발급 패턴만 재활용) |
| act-as tenant | `UserAuth.php:418-420` | `platform_growth` 오버라이드 컨텍스트 전환 — 권한 배정 아님 |
| plan/feature 게이팅 | `UserAuth.php:364`(requirePlan)·`:77`(requireFeaturePlan) | 구독 등급 접근 — 시한부 상승 아님 |
| api_key expires/rotate | `Keys.php:135`·`:141` | 자격증명 수명 — grant TTL 아님 |
| 세션 수명 | `UserAuth.php:304`·`:280`·`:206` | 세션 만료/유휴 — 권한 TTL 아님 |

> **★혼동 경계**: temp role/permission/scope grant = **ABSENT(순신규, GT① §F·GT②)**. impersonation은 시한부 세션 발급 **패턴만** 재활용하며 그 하향 대행 의미를 상향 elevation으로 **개명·흡수 금지**(ADR D-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Time-bound Assignment/Grant Ledger **ABSENT(최대 공백 = `acl_permission` TTL 컬럼 부재 `TeamPermissions.php:152`)**. 재활용 substrate = impersonation 시한부 발급 패턴(`:472-482`)·AccessReview revoke/이력(`:210-214,:62-80`). 성격 = "재활용 기반 신설".
- **선행 의존**: Part 1~3-8 인증 후 RP-track 실 구현(BLOCKED_PREREQUISITE). ERRE(3-7) effective 계산에 grant를 입력원으로 결합(ADR §4).
- **무후퇴**: 영속 RBAC·impersonation·세션/키/구독 만료 유지·병행. Extend-only. **코드 0 · NOT_CERTIFIED**.
