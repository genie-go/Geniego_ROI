# CANONICAL DSAR — Authorization Delegation & Impersonation (Delegation·Act-As·Impersonation Session·Blast Radius·Audit·Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)** · 정본 스펙 수령 시 재정합 · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**.
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_MAKER_CHECKER_SOD.md`](CANONICAL_DSAR_AUTHORIZATION_MAKER_CHECKER_SOD.md)(Maker-Checker/SoD) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_MAKER_CHECKER_SOD_DELEGATION_IMPERSONATION.md`](../architecture/ADR_DSAR_REBATE_MAKER_CHECKER_SOD_DELEGATION_IMPERSONATION.md).
> 선행: 5-1(Subject Type IMPERSONATE Action) · 5-2(Escalation Guard) · 5-3(Approval).
> **범위**: 위임·대행만 — Break Glass/JIT=**5-5** · Runtime PDP=5-6 · Audit/Access Review=5-7.

---

## 0. 실측 요약 — ★Impersonation 은 예상보다 잘 설계돼 있다

| 스펙 요구 | 현행 실측(코드 근거) | 분류 |
|---|---|---|
| **Impersonation(관리자 대행 열람)** | ✅ **REAL** — `POST /v423/admin/users/{id}/impersonate`([UserAdmin.php:466](../../backend/src/Handlers/UserAdmin.php)/472 · routes.php:1664) | **VALIDATED_LEGACY(재사용)** |
| **★관리자 가드** | ✅ **REAL** — `$admin = self::requireAdmin($req); if (!$admin) → 403 'Admin access required'`(UserAdmin.php:474-475) | **재사용** |
| **★관리자 대상 대행 차단** | ✅ **REAL** — 대상 user 의 plan/plans 가 `'admin'` 이면 **거부**(:488) = **관리자→관리자 대행 금지**(권한상승 차단) | **재사용(정본)** |
| **★대행 세션 토큰 분리** | ✅ **REAL** — `$token = 'imp_' . bin2hex(random_bytes(24))`(:493) = **접두 `imp_` 로 일반 세션과 구별 가능** | **재사용(정본)** |
| **★시간 제한(Time-bound)** | ✅ **REAL** — `$expires = gmdate(..., time() + 2 * 3600)`(:495) = **2시간 만료** · `user_session(user_id,token,expires_at,created_at)` INSERT(:496-497) | **재사용(정본·5-5 JIT 인접)** |
| **★감사 기록** | ✅ **REAL** — `self::auditLog($admin, "impersonate", "user#{$id} {$user['email']} 회원세션 발급(2h)")`(:499) | **재사용** |
| **★사용자 고지(투명성)** | ✅ **REAL** — `'_impersonated' => true` — **"프론트 대행 열람 배너 표시용"**(:525) | **재사용(정본)** |
| **★Act-As Tenant(플랫폼 성장 콘솔)** | ✅ **REAL·최소 블래스트 반경** — `if ($isAdmin && trim($req->getHeaderLine('X-Act-As-Tenant')) === 'platform_growth')`([UserAuth.php:394](../../backend/src/Handlers/UserAuth.php)) · 주석: **"★보안: 오직 admin 계정 + 오직 'platform_growth' 값만 허용(고객 테넌트 임의 임퍼소네이트 불가 = 블래스트 반경 최소). 헤더 부재 = 정상 자기 테넌트(기본 OFF)"**(:391-393) | **VALIDATED_LEGACY(정본·286차 수정 결과)** |
| **Delegation(권한 위임)** | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 신설** |
| **대행 중 행위 제한(읽기 전용 등)** | ❌ **부재** — 대행 세션이 **일반 세션과 동일 권한** | **NOT_APPLICABLE → §4 신설** |
| **대행 중 승인/집행 차단** | ❌ **부재** | **NOT_APPLICABLE → §4**(SoD 문서 §4 Conflict Matrix 정합) |
| **대행 세션 강제 종료** | ❌ 부재(만료 대기만) | **신설** |
| **대행 대상 동의/통지** | △ 배너 표시(REAL) · **사전 동의·사후 통지 부재** | **부분→신설** |

**★결론(정직)**: **Impersonation 은 이 저장소에서 가장 잘 설계된 보안 기능 중 하나**다 — **관리자 가드 · 관리자 대상 차단 · `imp_` 토큰 분리 · 2시간 만료 · 감사 기록 · 사용자 배너 고지**가 **전부 REAL**. **Act-As 도 286차 사고 후 "오직 admin + 오직 platform_growth 값" 으로 블래스트 반경을 최소화**했다. **부재 = Delegation(권한 위임) · 대행 중 행위 제한 · 대행 중 승인/집행 차단 · 강제 종료 · 사전 동의**.

### ★인접 관찰 (코드변경 0·근거 기록만)
- **[관찰] 286차 사고의 교훈이 코드 주석에 남아 있다** — Act-As 가 **"기본 OFF · 헤더 부재 = 정상 자기 테넌트"**(UserAuth.php:393)로 명시된 것은 **286차 platform_growth 자동ON + localStorage 고착 → X-Act-As-Tenant 헤더 → authedTenant 가 최고관리자 tenant 대신 platform_growth(데이터 0) 반환 → 전 메뉴 빈 화면** 사고의 직접적 산물(메모리 `reference_platform_growth_actas_tenant_hijack`). **★대행 기능의 최대 위험 = "자동 활성화 + 상태 고착"**.
- **[관찰·미확정] 대행 세션으로 승인·집행이 가능하다** — `imp_` 토큰은 `user_session` 에 **일반 세션과 동일하게 저장**(:496)되고, **대행 중 Action 제한이 없다**. → **관리자가 대행 세션으로 회원 대신 승인/집행 가능**(SoD 문서 §4 Conflict Matrix 의 `IMPERSONATE × APPROVE/EXECUTE` = **CRITICAL**). **단 대상이 admin 이면 대행 자체가 차단**(:488)되므로 **블래스트 반경은 일반 회원 범위**. **FP 규약상 PM 재증명 전 P0 단정 금지** · 실 영향 = 회원 대신 결제/발송/설정 변경 가능 여부 · **비파괴 미수정** → **§4 신설 계약으로 해소 권장**.

---

## 1. Canonical Entity (12) — 자율 설계

DELEGATION_POLICY · DELEGATION_GRANT · DELEGATION_CHAIN · IMPERSONATION_POLICY · IMPERSONATION_SESSION · IMPERSONATION_ACTION_RESTRICTION · ACT_AS_POLICY · BLAST_RADIUS_POLICY · SESSION_TERMINATION · SUBJECT_NOTICE · DELEGATION_RECONCILIATION · DELEGATION_AUDIT_EVENT.

## 2. Delegation (§1) · Grant (§2) · Chain (§3) — 부재→신설

- **Policy(§1)**: delegation_policy_id · **delegable_roles**(5-2 Role.`delegable` 필드 연결) · **max_duration · max_chain_depth · require_approval · excluded_actions · excluded_scopes** · evidence. **★모든 Role 이 위임 가능한 것은 아니다** — sensitive/production Role 은 **위임 금지 또는 승인 필수**.
- **Grant(§2)**: delegation_grant_id · **delegator · delegatee · delegated_roles · delegated_scope**(⊆ delegator scope) · **reason · approval_reference · valid_from/to · revoked_at** · evidence. **★§2 위임은 확대가 아니다** — **delegatee 권한 ⊆ delegator 권한**(초과 시 **권한상승**·5-2 Escalation Guard). **시간 제한 필수**(현행 Impersonation 2h 패턴 계승).
- **Chain(§3)**: **재위임 금지 기본**(`max_chain_depth=1`) · 허용 시 depth 상한 · **순환 위임 차단**.
- **★위임 행위의 귀속**: 모든 Decision 에 **`on_behalf_of`**(5-3 §6) 기록 — **"누가 실제로 눌렀는가(delegatee)"와 "누구 권한으로(delegator)"를 둘 다** 보존(감사 필수).

## 3. Impersonation (§4) — 현행 정본 승격 + 제한 신설

- **Policy(§4a)**: impersonation_policy_id · **allowed_impersonator_roles**(현행: admin·REAL) · **prohibited_target_roles**(현행: **admin 대상 차단**·REAL·:488) · **max_duration**(현행: **2h**·REAL·:495) · **token_prefix**(현행: **`imp_`**·REAL·:493) · **require_reason**(부재→신설) · **require_ticket**(부재) · **target_notice**(현행: **배너**·REAL·:525) · **allowed_actions**(부재→**§4b**) · evidence.
- **Session(§4b)**: impersonation_session_id · impersonator · target · **token(imp_ 접두)** · started_at · **expires_at(2h)** · reason · ticket · **terminated_at · termination_reason** · **수행 Action 목록** · evidence. **현행 REAL**: `user_session(user_id, token, expires_at, created_at)` INSERT(:496-497) — **단 대행 전용 메타(impersonator·reason·수행 이력)가 없다** → 신설.
- **★Action Restriction(§4c) — 신설(관찰 반영)**: 대행 세션에서 **금지할 Action 집합**:
  - **APPROVE / EXECUTE 계열 전면 금지**(SoD 문서 §4: `IMPERSONATE × APPROVE/EXECUTE` = **CRITICAL**) — 승인·정산·지급·집행.
  - **ASSIGN_ROLE / MANAGE_POLICY / ROTATE_CREDENTIAL / USE_PROVIDER_CREDENTIAL 금지**.
  - **결제/구독 변경 · 데이터 삭제 · EXPORT 금지 또는 REQUIRE_APPROVAL**.
  - **기본 = 읽기 전용(대행 열람)** — 현행 엔드포인트명도 **"회원세션(관리자 **대행 열람**)"**(UserAdmin.php:466)이므로 **설계 의도와 정합**.
- **Termination(§4d)**: 만료(2h·REAL) + **강제 종료**(부재→신설) + **대상 사용자에 의한 종료** + 사고 시 일괄 종료.

## 4. Act-As (§5) · Blast Radius (§6) — 286차 정본

- **Act-As Policy(§5)**: act_as_policy_id · **allowed_actor_roles**(현행: **admin 만**) · **allowed_target_values**(현행: **`platform_growth` 만**) · **default_off**(현행: **헤더 부재 = 자기 테넌트**) · **no_persistence**(★286차: **localStorage 고착 금지**) · audit · evidence.
- **★현행 정본(UserAuth.php:391-394)**: **"오직 admin 계정 + 오직 'platform_growth' 값만 허용(고객 테넌트 임의 임퍼소네이트 불가 = 블래스트 반경 최소). 헤더 부재 = 정상 자기 테넌트(기본 OFF·기존 동작 무영향)"** — **화이트리스트 1값 + 기본 OFF** 가 정본.
- **★Blast Radius(§6)**: **①대상 화이트리스트**(임의 테넌트 불가) **②기본 OFF**(자동 활성화 금지·**286차 사고 원인**) **③비영속**(localStorage/쿠키 고착 금지·**286차 사고 원인**) **④요청 단위 해석**(세션에 고착 금지) **⑤감사** **⑥고지**.
- **★286차 사고 정합**: 자동ON + 고착 → `authedTenant` 가 platform_growth 반환 → **전 메뉴 빈 화면**. → **"role 별 전 메뉴 공백 = 요청시점 tenant 해석 의심"**(메모리 `reference_platform_growth_actas_tenant_hijack`).

## 5. Notice (§7) · Reconciliation (§8) · Guard/Error (§9)

- **Notice(§7)**: **현행 REAL** — `_impersonated => true` **프론트 대행 열람 배너**(:525). **신설**: 사전 동의(정책별) · **사후 통지**(대행 종료 후 대상에게 알림) · 대행 이력 조회권(대상 본인).
- **Reconciliation(§8, 6)**: 대행 세션 ↔ 감사 로그 · **대행 중 수행 Action ↔ 금지 목록**(§4c) · 만료 세션 ↔ 활성 토큰(`imp_` 접두로 식별 가능) · Delegation Grant ↔ delegator 권한(초과 검사) · Act-As 헤더 ↔ 화이트리스트 · **대행 세션의 승인 행위 ↔ Maker-Checker**(SoD 문서 §9).
- **Guard(§9a, 8)**: IMPERSONATION_NOT_ALLOWED(비 admin) · **IMPERSONATION_TARGET_PROHIBITED**(admin 대상·REAL) · IMPERSONATION_EXPIRED(2h·REAL) · **IMPERSONATED_ACTION_RESTRICTED**(§4c·신설) · **IMPERSONATED_APPROVAL_BLOCKED**(SoD) · DELEGATION_EXCEEDS_DELEGATOR · DELEGATION_CHAIN_TOO_DEEP · **ACT_AS_TARGET_NOT_WHITELISTED**(REAL).
- **Error(§9b, 6)**: `AUTHORIZATION_IMPERSONATION_BLOCKED` · `AUTHORIZATION_IMPERSONATED_ACTION_RESTRICTED` · `AUTHORIZATION_IMPERSONATION_EXPIRED` · `AUTHORIZATION_DELEGATION_OVERREACH` · `AUTHORIZATION_DELEGATION_CHAIN_LIMIT` · `AUTHORIZATION_ACT_AS_NOT_ALLOWED`.

## 6. Impersonation Matrix — 현행

| 통제 | 현행 | 근거 |
|---|---|---|
| 관리자 가드 | ✅ **REAL** — requireAdmin → 403 | UserAdmin.php:474-475 |
| **관리자 대상 차단** | ✅ **REAL** — 대상 plan/plans='admin' 이면 거부 | :488 |
| 토큰 분리 | ✅ **REAL** — `imp_` + random_bytes(24) | :493 |
| **시간 제한** | ✅ **REAL** — **2시간** | :495 |
| 감사 | ✅ **REAL** — auditLog(admin,"impersonate",...) | :499 |
| **사용자 고지** | ✅ **REAL** — `_impersonated` 배너 | :525 |
| **Act-As 화이트리스트** | ✅ **REAL** — **admin + platform_growth 만·기본 OFF** | UserAuth.php:391-394(286차) |
| **대행 중 Action 제한** | **❌ 부재(관찰)** | — |
| **대행 중 승인/집행 차단** | **❌ 부재** | SoD §4 CRITICAL |
| 강제 종료 · 사유/티켓 · 사후 통지 | ❌ 부재 | — |
| **Delegation(권한 위임)** | ❌ **부재(grep 0)** | — |
