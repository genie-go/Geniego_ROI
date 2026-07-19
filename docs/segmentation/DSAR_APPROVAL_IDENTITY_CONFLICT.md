# DSAR — Identity Conflict (06-A-03-02-03-03 · §48)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §48.

## 1. 원문 전사 (Canonical Contract)

**§48 Identity Conflict** — Actor Resolution 시 신원 결선이 모순되는 정적 충돌 16종(원문 전사):
1. `PRINCIPAL_SUBJECT_MISMATCH` · 2. `MULTIPLE_CANONICAL_SUBJECTS` · 3. `AMBIGUOUS_BINDING` · 4. `TENANT_MISMATCH` · 5. `ACCOUNT_SUBJECT_MISMATCH` · 6. `EMPLOYMENT_MISMATCH` · 7. `ROLE_MISMATCH` · 8. `POSITION_MISMATCH` · 9. `LEGAL_ENTITY_MISMATCH` · 10. `ORGANIZATION_MISMATCH` · 11. `DELEGATION_IDENTITY_MISMATCH` · 12. `IMPERSONATION_IDENTITY_MISMATCH` · 13. `SERVICE_ACCOUNT_AS_HUMAN` · 14. `SYSTEM_ACTOR_AS_HUMAN` · 15. `MIGRATION_BINDING_CONFLICT` · 16. `CUSTOM`.

의미: Identity Conflict는 §16~§18 Actor Resolution Pipeline이 Principal↔Canonical Subject↔Account↔Employment/Role/Position↔Tenant/Legal Entity/Organization↔Delegation/Impersonation를 대조할 때 **동일 시점에 양립불가한 결선**(모순)을 탐지·차단하는 축이다. Drift(§50, 시간에 따른 변화)와 구분: Conflict는 **정적 대조 모순**. Service/System Actor를 Human 승인권으로 결선하는 것(13·14)도 conflict.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Identity Conflict 탐지 축 = 부재** — 16종 conflict 코드·Resolution 대조 로직 전무. 애초에 §16~§18 Actor Resolution Pipeline이 없어 **Principal↔Subject를 대조할 결선 자체가 미형성**.
- **대조 대상 축의 실재/부재**(재사용 substrate):
  - **actor 정본** — `Mapping::actorId`(`Mapping.php:36-53`)는 단일 문자열(`apikey:{id}`/`user:{email}`)만 산출·클라이언트 미신뢰. Principal↔Subject **분리 없음** → `PRINCIPAL_SUBJECT_MISMATCH`를 물을 두 축이 부재.
  - **Person↔Account 분리 = ABSENT**(app_user 단일, `UserAuth.php:229-264`) → `ACCOUNT_SUBJECT_MISMATCH`·`MULTIPLE_CANONICAL_SUBJECTS` 판정 불가.
  - **Tenant 대조 재료 실재** — auth_tenant 위조불가 주입(`index.php:417,437`)·RBAC tenant 강제(`:568-578`·GT 표 `:590-600`). `TENANT_MISMATCH`의 실 방어 재료이나 신원 conflict 축으로 통합 안 됨.
  - **Employment/Position = ABSENT**(team_role만, `TeamPermissions.php:120-136`) → `EMPLOYMENT/ROLE/POSITION_MISMATCH` 판정 대상 미존재.
  - **Delegation/Authority/Assignment = ABSENT**(전용 클래스/테이블 0; `Onsite.php:86` onsite_assignment은 A/B테스트) → `DELEGATION_IDENTITY_MISMATCH` 대상 없음.
  - **Impersonation 실재(위험)** — `UserAdmin.php:472-534`(`:493-497,499,525`) admin→대상 user 실 세션 발급·**Original Principal 미보존** → `IMPERSONATION_IDENTITY_MISMATCH`를 탐지할 Original↔Effective 이중축 부재.
  - **Service Account as Human** — api_key(`Db.php:942-955`·`index.php:483-493`)가 인증주체이나 Human/Service 구분·System Actor 개념 없음 → `SERVICE_ACCOUNT_AS_HUMAN`·`SYSTEM_ACTOR_AS_HUMAN` 탐지 축 부재.
- **X-Act-As-Tenant** — `UserAuth.php:398`(admin+`platform_growth` 단일값·effective tenant만 치환·actor는 admin 유지). Cross-Tenant 신원 결선의 유일한 실 경로이나 conflict 탐지가 아니라 치환.

## 3. 판정 (Verdict)

- Verdict: **ABSENT.** 16종 conflict 탐지 전무. Resolution Pipeline·Principal/Subject 분리·Employment/Position·Delegation 축 부재로 **대조할 두 축이 성립 안 됨**.
- 선행 의존: §48은 §13 Principal Registry·§14 Canonical Subject Binding·§15 Identity Profile·§16~§18 Resolution·선행 §3.1 Canonical Identity에 종속 — 전부 미형성. **다중 BLOCKED_PREREQUISITE.**
- cover: **0.** Tenant 위조불가 주입(`index.php:417,437`)만 `TENANT_MISMATCH`의 부분 재료로 PRESENT-substrate.

## 4. 확장/구현 방향 (설계)

- Identity Conflict는 **파생 축** — §16~§18 Actor Resolution Pipeline이 Principal↔Subject↔Account↔Employment/Role/Position↔Membership↔Delegation/Impersonation를 결선한 뒤라야 16종 대조가 성립. 선행(§13/§14/§15/§3.1) 신설 전 착수 시 BLOCKED_PREREQUISITE.
- **Golden Rule=Extend**: `TENANT_MISMATCH`는 실재 auth_tenant 위조불가 주입(`index.php:417,437`)·RBAC tenant 강제(`:568-578`)를 conflict 축으로 통합; 새 tenant 게이트 발명 금지. `SERVICE_ACCOUNT_AS_HUMAN`은 실재 api_key 인증(`index.php:483-493`)에 Human/Service actor type을 §8에서 부여해 대조.
- **Impersonation conflict**: `UserAdmin.php:472-534`의 Original Principal 미보존을 §5.8·§41 On-behalf-of Chain으로 교정한 뒤 `IMPERSONATION_IDENTITY_MISMATCH`(Effective≠기록된 Original)를 탐지. 대행 승인이 회원 본인 승인과 구별 가능해야 성립.
- **fail-closed·가짜녹색 금지**: conflict 탐지 시 조용히 통과 금지 — §63 Runtime Guard(Ambiguous Binding·Service/System Actor Prohibited)로 Commit 차단하고 §64 Error(`SUBJECT_BINDING_AMBIGUOUS` 등) 반환. 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_EVIDENCE]] · [[DSAR_APPROVAL_AUTHENTICATION_CONFLICT]] · [[DSAR_APPROVAL_IDENTITY_DRIFT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
