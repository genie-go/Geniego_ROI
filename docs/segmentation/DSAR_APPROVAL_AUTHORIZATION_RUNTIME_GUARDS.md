# DSAR — Authorization Runtime Guards (06-A-03-02-03-04 Part 1 · §55)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§55 Runtime Guard(차단) 원문 — 런타임에 인가 요청을 차단(Deny)해야 하는 조건:

Registry/Policy/Definition/Version Missing/Inactive · Registry Scope Mismatch · Policy Set Ambiguous · Context Missing/Invalid · Subject Missing/Invalid · Effective Actor Mismatch · Tenant/Legal Entity/Organization Mismatch · Resource Missing · Resource Version Mismatch · Action Missing/Invalid · Authentication Context Invalid · Expired · Explicit/Default Deny · Indeterminate · Challenge/Obligation Incomplete · Constraint Violated · Exception/Override Invalid · Commit Binding Mismatch · Drift · Digest Mismatch · Cache Integrity Failure · Kill Switch · Tamper · Runtime Bypass Attempt.

의미: Runtime Guard는 평가 파이프라인(§42) 각 단계에서 위 조건 중 하나라도 성립하면 **Default Deny(§5.2)·Fail-Closed(§5.13)** 로 고위험 Action을 차단하는 실집행 방어선이다. Static Lint(§54)가 병합 전 예방이라면, Runtime Guard는 실행 시점 차단이다.

## 2. 기존 구현 대조

- **선언적 Runtime Guard 체계(파이프라인 단계별 차단) 부재** — 원문 조건 대부분(Registry/Policy/Definition Missing·Policy Set Ambiguous·Resource Version Mismatch·Commit Binding Mismatch·Drift·Digest Mismatch·Cache Integrity·Kill Switch)은 대응 엔티티 자체가 ABSENT이므로 가드도 **전량 신규**.
- 다만 원문 조건 일부에 대응하는 **현행 fail-closed idiom substrate 실재**:
  - Authentication Context Invalid / Expired: 키조회 예외→401(`index.php:490-493`)·strict no-tenant deny(`index.php:585-587`, opt-in)·인증 실패 401/403 fail-closed(`index.php:553-603`).
  - Tenant Mismatch: tenant 강제주입(`index.php:590-593,600`)·agency 위임 fail-closed(`index.php:74-104`).
  - Default Deny idiom: roleOf 미해결→member(`TeamPermissions.php:120-131,127`)·DENY_SCOPE fail-closed(`TeamPermissions.php:234`)·write 메서드 게이트 기본 차단(`index.php:568-578`).
  - Explicit Deny idiom: DENY_SCOPE(`TeamPermissions.php:234`)·위임 상한 DELEGATION_EXCEEDED(`TeamPermissions.php:615-647`).
  - Tamper/Digest: `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 해시체인 검증 substrate(단 인가 판정엔 미결합).
- **현행 반례(가드가 없어 뚫리는 지점)**: requireFeaturePlan fail-open(`UserAuth.php:64-84` `:68,72,82-84`)·writeGuard UI-only(`writeGuard.js:13,61-90`) → "Engine 오류/Timeout 후 Allow"·"UI-only" 조건에서 Runtime Guard가 없어 차단 실패. §55 "Default Deny"·"Runtime Bypass Attempt" 방어 미비.
- Kill Switch·Commit Binding·Resource Version·Drift·Cache Integrity·Policy Set Ambiguous 대응: **전량 부재**(엔티티 미존재).

## 3. 판정

- Verdict: **ABSENT (전량 신규)** — 파이프라인 단계별 Runtime Guard 체계 전무. 판정 규율대로 §55 가드는 전량 신규.
- cover: **0**. 현행 fail-closed idiom(401/tenant 강제/Default member/DENY_SCOPE)은 인증·테넌트·서열 수준 산발 방어로 KEEP_SEPARATE substrate이며, 선언적 인가 가드 체계 대체 아님.
- 선행 의존: 가드 대상 엔티티(Registry/Policy/Definition/Context/Resource Version/Commit Binding/Drift/Cache/Kill Switch) 전량 ABSENT → **BLOCKED_PREREQUISITE**. 엔티티 신설과 동시 가드 활성.

## 4. 확장/구현 방향 (설계)

- 순신규 Runtime Guard 계층 — Evaluation Pipeline(§42) 각 단계에 가드 삽입: Registry/Scope/Definition/Version Resolution 실패→Deny(§45 Fail-Closed) · Context/Subject/Resource/Action Missing/Invalid→Deny · Tenant/Effective Actor Mismatch→Deny · Explicit/Default Deny→Deny · Indeterminate→Deny(§23 Permit 변환 금지) · Challenge/Obligation Incomplete→Deny · Constraint Violated→재사용 차단 · Commit Binding Mismatch(§39)→Deny · Drift(§48)/Digest Mismatch/Cache Integrity Failure→Deny · Kill Switch(§46) 활성→Deny · Tamper/Runtime Bypass Attempt→Deny + Audit.
- **substrate 승격(Extend·재구현 금지)**: 현행 fail-closed idiom을 Canonical Guard로 흡수 — 401/tenant 강제(`index.php:490-493,590-600`)·Default member(`TeamPermissions.php:120-131`)·DENY_SCOPE(`TeamPermissions.php:234`)·DELEGATION_EXCEEDED(`TeamPermissions.php:615-647`)를 파이프라인 가드의 구현 근거로 재사용. Tamper 가드는 `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 패턴 결합.
- **반례 봉쇄(무후퇴)**: requireFeaturePlan fail-open(`UserAuth.php:64-84`)·writeGuard UI-only(`writeGuard.js`)가 뚫는 지점은 Runtime Guard로 fail-closed 전환 — 단 실 배선은 후속 enforcement Part(Part 1은 방향만).
- **고위험 Fail-Open 절대 금지(§45)**: Approval/Payment/Settlement/Contract/Legal/Compliance/Security/Administrative 도메인은 어떤 가드 조건에서도 Allow 금지. Read-only Low-risk fail-open만 별도 Security Review+Versioned Policy 하에 허용.
- 모든 가드 차단은 Reason(§26)·Audit Event(§36 RUNTIME_BLOCKED)로 기록해 Failure Log 부재(§53) 해소. Part 1은 Runtime Guard Contract·파이프라인 삽입 지점·substrate 승격 매핑 정의만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_STATIC_LINT]] · [[DSAR_APPROVAL_AUTHORIZATION_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_CACHE_FOUNDATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
