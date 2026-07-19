# DSAR — Authorization Static Lint (06-A-03-02-03-04 Part 1 · §54)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§54 Static Lint(차단) 원문 — 정적분석으로 차단할 안티패턴:

`if user.isAdmin` · `role=="ADMIN"` · Hardcoded User ID/Email Authorization · Request Body Actor ID Trust · Controller 임의 Role Check · UI-only/Client-only Authorization · Default Allow · Catch 후 Allow · Timeout 후 Allow · Null Policy 후 Allow · Unversioned Policy/Permission Check · Missing Tenant/Resource ID/Version/Action Code/Evidence/Audit · Mutable Snapshot · Decision Update Repository · Override without Reason · Exception without Expiration · Cross-Tenant Cache Key · Policy/Resource Version 없는 Cache Key · Authorization Bypass Feature Flag · Service/System Actor Human Permission Reuse · 중복 Middleware/Role·Permission Check/Policy Resolver. (AST Rule 가능 시 정적분석으로.)

의미: Static Lint는 위 안티패턴을 CI/정적분석 단계에서 코드 병합 전 차단하는 규칙 집합이다. 런타임 이전에 인가 우회 패턴의 재유입을 막는 예방선이다.

## 2. 기존 구현 대조

- **인가 전용 Static Lint 규칙 부재** — 위 안티패턴을 AST/정적분석으로 차단하는 CI 규칙 전무. (CLAUDE.md 상 CI는 EN 로케일 존재 체크·vite build 위주, 인가 lint 없음.)
- 각 lint 규칙에 대응하는 **현행 위반 실재 여부**(어떤 규칙이 실제로 잡을 게 있는지):
  - `role=="ADMIN"`/`if user.isAdmin` 계열: `plan==='admin'` 하드코딩 다수(`UserAuth.php:72,104,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458`·`Compliance.php:203`·`Pnl.php:522`)·isAdmin 4정의(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·`App.jsx:377`) → **lint 대상 실재**.
  - Catch 후 Allow / Null Policy 후 Allow: `requireFeaturePlan`(`UserAuth.php:64-84` `:68,72,82-84`) plan null→allow·catch→allow → **lint 대상 실재(fail-open)**.
  - UI-only/Client-only Authorization: `writeGuard.js:13,61-90,73` → **lint 대상 실재**.
  - Unversioned Policy/Permission Check: 인가규칙 코드 상수화(`index.php:554`·`TeamPermissions.php:120-136`)·Policy Set 주석만(`UserAuth.php:332-333`) → **lint 대상 실재**.
  - 중복 Middleware/Role Check/Policy Resolver: requireAdmin 3정의(`UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96`)·team_role 3미러(`TeamPermissions.php:120`↔`UserAuth.php:1099`↔`teamRolePolicy.js`) → **lint 대상 실재**.
  - Missing Tenant Binding: Cache Key 무존재이나, 서버 tenant 강제주입(`index.php:600`)은 오히려 **모범** → lint은 신설 코드의 tenant 누락만 차단하면 됨.
  - **Request Body Actor ID Trust**: 현행 **닫힘**(`index.php:590-593,600` 강제주입) → lint은 재유입 예방용(현행 위반 없음·긍정).
  - **Hardcoded User ID/Email Authorization**: 현행 **부재**(전부 DB 컬럼 기반) → lint은 예방용(현행 위반 없음·긍정).
  - Cross-Tenant Cache Key / Policy·Resource Version 없는 Cache Key: 캐시 자체 부재(§49) → 신설 캐시 대비 예방 규칙.
  - Mutable Snapshot / Decision Update Repository / Override without Reason / Exception without Expiration: 대응 엔티티(Snapshot·Decision·Override·Exception) ABSENT → 신설 대비 예방 규칙.

## 3. 판정

- Verdict: **ABSENT (순신규)** — 인가 Static Lint 규칙 전무.
- cover: **0**. 현행에 lint이 잡을 위반은 다수 실재(위 §2)이나 이를 잡는 규칙·CI 배선은 전무.
- 선행 의존: 일부 규칙(Mutable Snapshot·Decision Update·Cross-Tenant Cache Key)은 대응 엔티티(Snapshot/Decision/Cache) 신설 후에야 의미 → **부분 BLOCKED_PREREQUISITE**. 반면 `role=="ADMIN"`·Catch 후 Allow·UI-only·중복 유틸 규칙은 **현행 코드에 즉시 적용 가능**.

## 4. 확장/구현 방향 (설계)

- 순신규 Static Lint 규칙셋(AST/grep 기반 CI 게이트) — §54 원문 안티패턴을 규칙으로 코드화. 규칙별 심각도·예외 허용(allowlist) 관리.
- **즉시 적용 가능 규칙(현행 위반 존재)**: ① 하드코딩 admin 리터럴(`plan==='admin'`) 신규 추가 차단 → Canonical Policy 참조 강제 ② catch/null 후 return true(fail-open) 차단 ③ 신규 mutating 라우트의 서버 인가 누락(UI-only) 차단 ④ 중복 isAdmin/requireAdmin/role 정규화 신설 차단. **기존 위반은 Migration(§52)으로 점진 해소**하되 신규 유입은 lint으로 즉시 봉쇄.
- **예방 규칙(현행 긍정 유지)**: Request Body Actor ID Trust·Hardcoded User ID/Email authz는 현행 부재 상태를 회귀 방지(누가 재도입하면 lint fail). tenant 누락·Cross-Tenant Cache Key는 신설 캐시(§49) 코드에 강제.
- **엔티티 종속 규칙**: Mutable Snapshot·Decision Update Repository·Override without Reason·Exception without Expiration은 Snapshot/Decision/Override/Exception 엔티티 신설과 동시 활성.
- lint은 **차단(fail CI)** 이 목적 — 경고만으로 두면 무력화. 단 기존 코드 대량 위반으로 CI가 즉시 막히지 않도록 baseline allowlist(기존 위반 동결·신규만 차단) 운용. Part 1은 Lint 규칙 카탈로그·적용 범위 정의만(실 CI 배선은 후속).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_AUTHORIZATION_CRITICAL_GAP_POLICY]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
