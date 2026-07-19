# DSAR — Authorization Definition Version (§13)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§13 `APPROVAL_AUTHORIZATION_DEFINITION_VERSION` 필수 필드 (원문 전사):

- `version number` · `previous`
- **`version type`**
- `change summary`
- **`policy set snapshot`** / `scope snapshot` / `contract snapshot` / `context schema snapshot` / `combining snapshot` / `default effect snapshot` / `fail closed snapshot` / `cache snapshot` / `revalidation snapshot` / `exception snapshot` / `override snapshot`
- `effective`
- `created by` / `reviewed by` / `approved by`
- `activated` / `superseded`
- **`immutable digest`**

**VERSION TYPE enum (16종)**: `INITIAL` / `POLICY_CHANGE` / `SCOPE_CHANGE` / `SUBJECT_CONTRACT_CHANGE` / `RESOURCE_CONTRACT_CHANGE` / `ACTION_CONTRACT_CHANGE` / `ENVIRONMENT_CONTRACT_CHANGE` / `COMBINING_ALGORITHM_CHANGE` / `DEFAULT_EFFECT_CHANGE` / `SECURITY_HARDENING` / `CACHE_POLICY_CHANGE` / `REVALIDATION_CHANGE` / `EXCEPTION_POLICY_CHANGE` / `OVERRIDE_POLICY_CHANGE` / `CORRECTION` / `MIGRATION`.

의미: Definition Version은 Definition(§12) 계약의 **불변 스냅샷**이다 — 각 변경마다 policy set·scope·contract·combining·fail-closed를 통째로 snapshot하고 `immutable digest`로 봉인해, 과거 Decision이 **결정 시점의 정책 버전으로 재현**되게 한다(§5.7 과거 Decision 현재 Policy 재해석 금지·§5.8 Immutable Snapshot).

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **정책/정의 버전화는 전무** — GROUND_TRUTH §1 표 전반이 `버전 X`: 중앙 RBAC roleRank(`index.php:554` `강제 O·버전 X·snapshot X`)·admin:keys(`index.php:564-567` `버전 X`)·write 게이트(`index.php:568-578` `버전 X`)·팀 RBAC 서열(`TeamPermissions.php:120-136` `버전 X`)·ABAC data_scope(`TeamPermissions.php:236-322` `버전 X`)·acl_permission(`TeamPermissions.php:39,152-159,325-336` `버전 X`).
- **Versioned Policy = ABSENT**(GROUND_TRUTH §1)·**Authorization Decision/Snapshot/Evidence/Digest = ABSENT**(`판정결과 불변저장/evidence/ledger 결합 부재(audit append만)`).
- `version number`/`version type`/`policy set snapshot`/`immutable digest`/`activated`/`superseded`/`created·reviewed·approved by` → **no hits**. 인가 계약의 버전·스냅샷·불변 다이제스트 전무.
- 유일 유사 버전 자산은 `schema_migrations`(스키마 마이그레이션 등록소)로 인가 Definition Version과 무관 — GROUND_TRUTH 인가 표에 미등재(계상 금지).

## 3. 판정

- **Verdict: ABSENT** (정책 버전화·불변 스냅샷·digest 전무). substrate 없음 — 인가 규칙 전부 `버전 X·snapshot X`.
- **선행 의존**: Version은 §12 Definition·§37 Digest(Hash Chain)·§3.4 Integrity Foundation에 결속 — Definition 선언체·Integrity Digest Envelope 부재로 **BLOCKED_PREREQUISITE**. 실 불변 해시체인은 앞 블록(Decision Integrity) substrate 재사용 대상이나 인가 계약엔 미결속.
- **cover: 0** (인가 정책 버전화 전무 — GROUND_TRUTH 전 표 `버전 X`).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_definition_version` — `version type`(16종)·통째 snapshot(policy set/scope/contract/combining/fail-closed)·`immutable digest`로 각 정책 변경을 봉인. **하드코딩 규칙(`index.php:554`·`TeamPermissions.php` acl_permission)을 Policy 데이터화(§10)한 뒤 그 상태를 Version이 스냅샷** — 규칙을 버전 없이 코드로 두던 현행을 버전화된 정책 이력으로 승격.
- **Mandatory Control**: `immutable digest`로 봉인·`activated`/`superseded`로 시점 유효성 관리(§44 Version Resolution)·Validation↔Commit 사이 Version 변경 탐지(§39 Commit Binding·§5.10). 앞 블록 Decision Integrity의 append-only 해시체인 패턴을 CANONICAL로 재사용(중복 무결성 엔진 신설 금지).
- **실위험**: ① 버전 부재로 과거 인가 Decision을 현재 코드 상수로 재해석(§5.7·§5.8 위반) — 감사·분쟁 시 "당시 규칙" 재현 불가. Definition Version snapshot으로 원천 차단. ② `admin_roles/user_roles` DORMANT(`UserAdmin.php:627-641,788-812`)의 permissions가 버전 없이 mutable 저장 → Version 편입 시 변경 이력·approver 추적 확보. ③ SECURITY_HARDENING/CORRECTION version type으로 정책 보안 강화·오류 정정을 감사가능하게 이력화(현재 코드 커밋만이 유일 이력·정책 단위 추적 불가). 실 배선/수정은 후속 Part.

관련: [[DSAR_APPROVAL_AUTHORIZATION_DEFINITION]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY_SET]] · [[DSAR_APPROVAL_AUTHORIZATION_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
