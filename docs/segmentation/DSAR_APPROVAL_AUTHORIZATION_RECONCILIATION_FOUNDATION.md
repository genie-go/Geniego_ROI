# DSAR — Authorization Reconciliation Foundation (06-A-03-02-03-04 Part 1 · §51)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§51 Reconciliation Foundation 원문 — 대조 축:

- `Registry vs Active Policies`
- `Definition vs Policy Set`
- `Definition Version vs Runtime`
- `Policy Scope vs Tenant/Legal Entity/Org`
- `Decision vs Context Snapshot / Policy Version / Resource Version / Identity/Authentication Snapshot / Ledger Entry`
- `Decision Digest vs Stored`
- `Cache vs Canonical`
- **★`UI Permission Hint vs Server Authorization`**
- `API Gateway vs Application`
- `ERP/Workflow vs Platform`
- `Legacy Role Check vs Canonical`
- `Override vs Incident`
- `Exception vs Approval`

의미: 리컨실리에이션은 선언된 정책(Registry/Definition/Policy)과 런타임에 실제 집행되는 인가·UI 힌트·게이트웨이·레거시 체크·캐시·결정 다이제스트가 **서로 어긋나지 않는지** 정기 대조하는 계층이다. 특히 UI 힌트(버튼 숨김)와 서버 인가의 불일치, 레거시 role 체크와 Canonical 정책의 불일치를 탐지해 드리프트를 조기 차단한다.

## 2. 기존 구현 대조

- **인가 리컨실리에이션 계층 부재** — 선언 정책 vs 런타임 집행 vs UI 힌트 vs 레거시 체크를 대조하는 구조체 전무.
- **★UI Hint vs Server 불일치 = 현행 실 위험**: FE `writeGuard.js:13,61-90,73`은 apiClient 인터셉터로 member 쓰기를 UI에서만 차단하며 **fail-open**이고 "Phase3b 후속" 자인(`writeGuard.js:73`). 서버측 `requireTeamWrite`(`UserAuth.php:1088-1127`)는 **11개소에만** 배선 → 116페이지 mutating 대다수가 member read-only를 UI로만 방어. 즉 UI 힌트와 서버 인가가 **구조적으로 불일치**하나, 이를 탐지·대조하는 리컨실리에이션이 없어 드리프트가 방치된다.
- **Legacy vs Canonical 불일치 소지 = 실재**: 하드코딩 `plan==='admin'` 판정이 다수 분산(`UserAuth.php:72,104,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458`·`Compliance.php:203`·`Pnl.php:522`·`Keys.php:191,206`·`SystemMetrics.php:50`)·isAdmin 정의 4개(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·FE `App.jsx:377`)·requireAdmin 정의 3개(`UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96`)·team_role 정규화 3중 미러(`TeamPermissions.php:120`↔`UserAuth.php:1099`↔FE `teamRolePolicy.js`). Canonical Policy 부재로 이들 미러 간 정합을 대조할 기준선이 없다.
- **admin_roles/user_roles DORMANT**(`UserAdmin.php:627-641,788-812`) — permissions 저장·할당되나 런타임 미소비. "선언된 커스텀롤 vs 실제 집행" 불일치의 전형이나 탐지 장치 없음.
- **Cache vs Canonical** 대조 대상 부재 — 인가 캐시 자체가 없어(§49) 현행엔 대조 항목이 성립하지 않음(긍정: 캐시 드리프트 위험 부재).
- Decision Digest vs Stored 대조 substrate: `SecurityAudit.php:56-68` verify()가 해시체인 무결성 검증의 유일 실 패턴 — Decision Ledger 신설 시 이 verify 패턴을 재사용(Extend). 단 `menu_audit_log.hash_chain`(`AdminMenu.php:123-143,200-218`)은 verify() 0(289차 정정)이므로 대조 근거로 계상 금지.

## 3. 판정

- Verdict: **ABSENT (순신규)** — 리컨실리에이션 계층 전무. 단 대조가 필요한 **실 불일치(UI Hint vs Server·Legacy vs Canonical·DORMANT 롤)는 현행에 실재**하며 방치 중.
- cover: **0**. `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 단일 감사트레일 검증으로 KEEP_SEPARATE, 인가 리컨실리에이션 대체 아님.
- 선행 의존: Registry/Definition/Policy/Policy Version(§7~§13)·Decision/Context Snapshot(§20·§24)·Cache(§49) 전량 ABSENT → 대조 기준선 부재 → **BLOCKED_PREREQUISITE**.

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_AUTHORIZATION_RECONCILIATION`(§6 엔티티) — 13개 대조 축을 배치/정기 잡으로 실행하고 불일치를 Drift(§48)·Audit Event(§36)로 기록.
- **★최우선 대조 = UI Hint vs Server Authorization**: writeGuard가 UI에서 허용/차단하는 액션 목록과 서버측 requireTeamWrite(`UserAuth.php:1088-1127`) 배선 지점을 대조해, "UI는 막는데 서버는 안 막는"(fail-open) 갭을 리포트. 이 대조가 후속 enforcement Part의 서버 배선 우선순위 산출 근거가 된다.
- **Legacy vs Canonical 대조**: 하드코딩 `plan==='admin'` 분산 지점(위 §2 목록)·isAdmin 4정의·requireAdmin 3정의·team_role 3미러를 Canonical Policy로 정형화한 뒤, 각 레거시 체크가 Canonical 판정과 동일 결과를 내는지 대조. 불일치=Migration(§52) 재검토 대상.
- **DORMANT 롤 대조**: admin_roles/user_roles(`UserAdmin.php:627-641`)에 선언된 permissions와 런타임 실제 소비 여부를 대조해 죽은 RBAC를 명시 리포트.
- Decision vs Snapshot/Ledger 대조는 `SecurityAudit.php:56-68` verify 패턴 재사용. Cache vs Canonical은 §49 캐시 신설 후 invalidation version 대조로 실장.
- 리컨실리에이션은 **탐지·리포트만**(자동 수정 금지) — 불일치 해소는 승인 세션에서. Part 1은 Reconciliation Contract·대조 축 정의만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_MIGRATION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_CACHE_FOUNDATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
