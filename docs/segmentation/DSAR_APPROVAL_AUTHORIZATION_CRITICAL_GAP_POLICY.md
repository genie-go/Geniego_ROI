# DSAR — Authorization Critical Gap Policy (06-A-03-02-03-04 Part 1 · §53)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§53 Critical Gap 후보 원문:

Server-side Authorization 없음 · UI Button 숨김만 · Default Allow · Policy/Engine 오류/Timeout 시 Allow · Hardcoded Admin Bypass/User ID Allow · Actor ID Body 신뢰 · Tenant/Resource/Version/Action Binding 없음 · Policy Version 없음 · Snapshot/Evidence/Allow·Deny Reason 없음 · Explicit Deny 무시 · Combining Algorithm 불명확 · Validation 무조건 Commit 재사용 · Expiration 없음 · Cross-Tenant Cache · Cache Key에 Policy/Resource/Subject Version 없음 · Exception 무기한 · Override 일반 Allow 기록 · Break-glass Audit 없음 · Raw Policy 수정가능 · 과거 Decision 수정가능 · Feature Flag 비활성 · Client JWT Claim만 신뢰 · Service/System Actor 무제한 Allow · Policy Ambiguity 임의 Permit · Failure Log 없음 · Result-Ledger 미연결 · Kill Switch 없음 · Role/Permission 중복 · Gateway↔Application 불일치 · Legacy Migration 미검증.

의미: 위 항목들은 인가 구현에서 흔한 치명적 갭 카탈로그다. 본 문서는 각 후보를 현행 코드에 **정직하게 대조**해 실제 위반인지·부분 방어인지·해당없음(긍정)인지 판정한다.

## 2. 기존 구현 대조 (현행 실 위반 vs 긍정)

### 2.1 현행 실 위반 (확정)

- **UI Button 숨김만 / Server-side Authorization 부분부재**: FE `writeGuard.js:13,61-90,73`가 member 쓰기를 UI에서만 차단·**fail-open**·"Phase3b 후속" 자인. 서버측 `requireTeamWrite`(`UserAuth.php:1088-1127`)는 **11개소만** 배선 → 116페이지 mutating 대다수가 UI-only 방어(§5.4 위반). **실 위반**.
- **Policy/Engine 오류 시 Allow (fail-open)**: `requireFeaturePlan`(`UserAuth.php:64-84`)이 plan null→allow·catch→allow·admin bypass 3중 fail-open(`:68,72,82-84`). `subjectScope` catch→null(`TeamPermissions.php:211,224`)은 조건부 fail-open(effectiveScope DENY_SCOPE `:251`로 부분보완). **실 위반(과금·정책엔진 도입 시 fail-closed 전환 필요)**.
- **Policy Version 없음 / Raw Policy 수정가능 / 과거 Decision 수정가능**: 인가규칙=코드 상수 하드코딩(`index.php:554` roleRank·`TeamPermissions.php` 매트릭스), Policy Set/Combining Algorithm 주석만(`UserAuth.php:332-333`), Versioned Policy·Decision Snapshot/Evidence 전무. **실 위반(정책 버전화·판정 불변저장 부재)**.
- **Role/Permission 중복**: isAdmin 4정의(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·`App.jsx:377`)·requireAdmin 3정의(`UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96`)·team_role 3미러(`TeamPermissions.php:120`↔`UserAuth.php:1099`↔`teamRolePolicy.js`)·하드코딩 plan==='admin' 다수 분산(`UserAuth.php:72,104,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458` 등). **실 위반(SSOT 부재·정책 드리프트)**.
- **DORMANT RBAC**: admin_roles/user_roles(`UserAdmin.php:627-641,788-812`) permissions 저장·할당되나 런타임 미소비. **실 위반(죽은 RBAC — 선언과 집행 불일치)**.

### 2.2 부분 방어 (긍정적 substrate 존재)

- **Actor ID Body 신뢰=닫힘(긍정)**: `index.php:590-593,600` 인증키 tenant_id로 X-Tenant-Id 무조건 덮어쓰기(IDOR 원천차단)·auth_tenant/role attach로 요청 본문 actor 신뢰 없음. Alerting 수정으로 canonical actor 확립(GROUND_TRUTH §3 판정 규율). §53 "Actor ID Body 신뢰"=**해당없음/닫힘**.
- **Tenant Binding=강제(긍정)**: `index.php:600` tenant 강제주입·agency 위임 `agency_client_link.status='approved'` 매요청 재검증(`index.php:74-104`)·fail-closed. Cross-Tenant Cache는 캐시 자체 부재(§49)로 위험 없음.
- **Explicit/Default Deny idiom 존재**: roleOf fail-closed(`TeamPermissions.php:120-131,127`)·DENY_SCOPE fail-closed(`TeamPermissions.php:234`)·키조회 예외→401(`index.php:490-493`). 선언적 Deny 정책체는 부재이나 idiom 수준 fail-closed는 실재.
- **Failure Log / Result-Ledger**: `SecurityAudit`(`SecurityAudit.php:48-68`)가 유일 실 append-only 해시체인·verify(`:56-68`)·배선(`UserAuth.php:4046`·`Compliance.php:162`). 단 인가 판정 결과의 ledger 결합은 부재.

### 2.3 해당없음 (중대 긍정)

- **Hardcoded User ID Allow / Email Authorization=부재(확정 긍정)**: admin 판정 전부 DB plan/plans/admin_level 컬럼 기반(`TeamPermissions.php:132`·`UserAdmin.php:65-68` 등). 소스 리터럴 user-id/email authz **전무**. §53 "Hardcoded User ID Allow"·"Email Authorization"=**해당없음**.
- **Client JWT Claim만 신뢰=부재**: api_key scopes 화이트리스트+역할상한(`Keys.php:99-113,198-206`·`UserAuth.php:4204-4290`)·SSO group→role owner 미승격(`EnterpriseAuth.php:70,78-88,476-480`) — 클라이언트 클레임 맹신 아님.

## 3. 판정

- Verdict: **PARTIAL** — Critical Gap Policy(선언적 갭 등록·차단 정책) 자체는 **ABSENT(순신규)**이나, 현행 코드에는 **실 위반 5군**(UI-only·fail-open·버전화 부재·중복·DORMANT)과 **긍정 3군**(Actor ID Body 신뢰 닫힘·하드코딩 email authz 부재·tenant 강제)이 공존.
- cover: **0** (Gap Policy 등록체 전무). 실 위반·긍정은 위 §2 대조로 정직 기술.
- 선행 의존: Gap을 데이터로 등록·차단하려면 Registry/Policy(§7~§13) 필요 → **BLOCKED_PREREQUISITE**.

## 4. 확장/구현 방향 (설계)

- 순신규 Critical Gap Policy — §53 후보 카탈로그를 체크리스트화하고 각 항목을 Static Lint(§54)·Runtime Guard(§55)·Reconciliation(§51)에 연결. 갭 발견 시 심각도·근거 file:line·해소 Part를 등재.
- **후속 enforcement 우선순위(실 위반 기준)**: ① writeGuard UI-only → 서버 requireTeamWrite 전역 배선(현 11개소→mutating 전체) ② requireFeaturePlan fail-open → fail-closed 전환 ③ 하드코딩 plan==='admin' 다수·isAdmin/requireAdmin 중복 → Canonical Policy 단일참조 수렴 ④ admin_roles DORMANT → 소비 확정 또는 정리 ⑤ Policy 버전화·Decision Snapshot/Evidence 신설.
- **긍정 보존(무후퇴)**: Actor ID Body 신뢰 닫힘(`index.php:600`)·tenant 강제주입·하드코딩 email authz 부재는 Canonical 전환 시에도 유지·강화만(후퇴 금지). fail-open 전환 시 오히려 fail-closed로 개선(의도적 강화).
- Gap Policy는 **탐지·등록·차단 방향 설계만**. 실 수정은 승인 세션. Part 1은 Critical Gap Contract·현행 위반/긍정 대조표 정의만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_STATIC_LINT]] · [[DSAR_APPROVAL_AUTHORIZATION_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_AUTHORIZATION_RECONCILIATION_FOUNDATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
