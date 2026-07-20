# DSAR — JIT Access Governance: 런타임 범위·제약 (APPROVAL_JIT_SCOPE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_SCOPE`(SPEC §18 Runtime Scope + §19 Runtime Constraint·Canonical Entity §2)는 상승 grant가 **어디까지(Scope)·어떻게(Constraint)** 유효한지를 한정하는 엔티티다.

| Runtime Scope (SPEC §18) | Runtime Constraint (SPEC §19) |
|---|---|
| Tenant / Organization / Project | Read Only |
| Dataset / Database / API | Time Limit / Amount Limit |
| Document / Environment | Device / Region / Command Restriction |

Just-Enough-Access(JEA·SPEC §0) 실현체 — 상승은 최소 범위·최소 제약 안에서만 유효.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 항목 | 판정 | 재활용/부재 근거(GT 등장 file:line) |
|---|---|---|
| Runtime Scope 투영(상승 grant) | **ABSENT** | GT② §2 "Session-bound entitlement projection ABSENT" — 세션 권한 스냅샷 투영 없음·ACL 매요청 DB조회 |
| Tenant Scope 격리 | PARTIAL(재활용) | SPEC §33 Tenant Isolation·act-as `UserAuth.php:418-420`(`platform_growth`만·시간제한 없음) |
| Time Limit 제약 | 재활용(세션축) | 세션 만료 게이트 `UserAuth.php:249-284`(`expires_at > ?`)·발급 30일 `:986,:990` |
| Amount Limit 제약 | 근접(KEEP_SEPARATE) | 고액 승인 `Catalog.php:1159`(₩5M `:1036`) — 상품 고액이지 elevation 제약 아님 |
| Device / Region 제약 | ABSENT(권한축) | 상승세션 device/region 제약 grep 0(GT② §2 Guard/Lint ABSENT) |
| Read Only / Command 제약 | ABSENT | 권한 grant 제약 엔진 부재 — `acl_permission` 8동작 영구 `TeamPermissions.php:152` |
| Runtime Guard(만료후 차단) | ABSENT | FE `SecurityGuard.js`는 테넌트오염/XSS — 만료권한 차단 아님(GT② §2) |

## 3. 설계 계약 (SPEC 근거·테넌트격리/불변버전)

- **Scope 한정**: grant는 Tenant→Environment 8축(SPEC §18) 중 승인된 최소 범위에만 유효. `APPROVAL_JIT_ASSIGNMENT`(Temporary Scope)의 실 강제층.
- **Constraint 강제**: Read Only/Time/Amount/Device/Region/Command 6제약(SPEC §19)을 Runtime Guard(SPEC §28 Scope/Permission Escalation)가 매 접근 검증(≤50ms·SPEC §35 Runtime Validation).
- **Time Limit 재활용**: 세션 만료 lazy 게이트(`UserAuth.php:249-284`) 패턴을 grant `expires_at > now`에 재사용(ADR D-3 fail-secure). Auto-Expiry cron 능동 회수(SPEC §14)는 신설(GT② B-9 cron 부재).
- **Tenant 격리 절대**: SPEC §33 Tenant Isolation — Scope는 요청 테넌트를 넘지 못한다. act-as(`UserAuth.php:418-420`)의 `platform_growth` 오버라이드와 **혼용 금지**.
- **불변 기록**: 승인된 Scope/Constraint는 Snapshot(SPEC §25 Granted Scope)·Evidence에 불변 저장·SecurityAudit 체인(`SecurityAudit.php:12-53`).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | file:line(GT 등장) | 분리 사유 |
|---|---|---|
| Catalog 고액 승인(₩5M) | `Catalog.php:1159`·`:1036` | Amount Limit 유사하나 **상품 고액 결재** — elevation 제약 아님 |
| act-as tenant 오버라이드 | `UserAuth.php:418-420` | 성장콘솔 컨텍스트 전환 — 상승 Scope 아님 |
| 세션 수명/유휴 | `UserAuth.php:304`·`:206` | 세션 Time Limit이지 grant Scope 제약 아님 |
| 광고 킬스위치 | `AdAdapters.php:22,:36`·`AutoCampaign.php:447` | "긴급/emergency" 오염어 — 광고 집행 차단·접근거버넌스 무관(GT② B-7) |
| 비즈니스 simulate | `RuleEngine.php`·`Decisioning.php`·`PriceOpt.php`(GT② B-8) | elevation simulation 아님 |

> **★혼동 경계**: elevation Scope/Constraint ≠ 상품 고액 승인(Catalog ₩5M)·마케팅 킬스위치(AdAdapters)·비즈니스 simulate. Tenant 격리·세션 Time Limit **패턴만** 재활용하며 도메인 흡수·개명 금지(ADR D-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Runtime Scope 투영·Constraint 강제·Runtime Guard **ABSENT(순신규, GT② §2)**. 재활용 substrate = 세션 만료 게이트(`UserAuth.php:249-284`)·Tenant 격리(SPEC §33)·SecurityAudit 체인. 성격 = "재활용 기반 신설".
- **최대 공백**: Session-bound entitlement projection 부재(ACL 매요청 DB조회)·Device/Region/Command 제약 grep 0·능동 만료회수 cron 부재(GT② B-9).
- **선행 의존**: Part 1~3-8 인증 후 RP-track 실 구현(BLOCKED_PREREQUISITE). 289차 P1~P5(writeGuard 서버강제)는 Guard 실 substrate로 재활용(ADR D-7).
- **무후퇴**: 세션 수명·act-as·고액 승인·광고 킬스위치 유지·병행. Extend-only. **코드 0 · NOT_CERTIFIED**.
