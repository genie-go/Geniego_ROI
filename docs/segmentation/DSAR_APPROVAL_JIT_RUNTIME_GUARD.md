# DSAR — JIT Access Governance: 런타임 가드 (Part 3-9 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §28 Runtime Guard = elevation grant가 **살아있는 매 요청마다** 재검증되어 부적격이면 즉시 차단하는 런타임 집행점(PEP)이다. 차단 대상 7종: **Expired Elevation**(만료), **Invalid Session**(무효 세션), **Missing Approval**(미승인), **Policy Violation**(정책위반), **Scope Escalation**(스코프 상승), **Permission Escalation**(권한 상승), **Re-authentication Failure**(재인증 실패). 성능 요구는 Runtime Validation ≤ 50ms(SPEC §35). 이는 §14 Auto Revocation(비동기 회수)과 상보 — Guard는 회수 이전이라도 동기 차단한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Guard 차단축 | 재활용 substrate (파일:라인) | 상태 |
|---|---|---|
| Expired Elevation | 세션 만료 lazy gate `UserAuth.php:249-284`(`expires_at > ?`)·api_key 만료 401 `index.php:518`(GT①§4-D) — **세션/키축만·권한 grant축 미적용** | PARTIAL |
| Invalid Session | 중앙 인증 미들웨어(index.php)·userByToken 만료배제 `UserAuth.php:304`(GT①A/E) | PARTIAL |
| Missing Approval | approved-only 집행 게이트 `Alerting.php:684-686`(status!=='approved' 차단·GT①§4-B) — **마케팅 action_request용**(KEEP_SEPARATE) | 재활용 |
| Policy Violation | writeGuard 서버강제·guardTeamWrite(ADR §D-7 P1~P5 재활용) — **만료후 elevation 차단 없음** | PARTIAL |
| Scope / Permission Escalation | impersonate 상승 차단 가드 `UserAdmin.php:466-469`(admin 대행 금지=하향 전용)(GT①§4-C) — **elevation 상향 차단 아님** | 오근접 |
| Re-authentication Failure | MFA 우회/강제 `UserAuth.php:945-946`·mfa_policy `UserAuth.php:930`(GT②B-6) — 로그인시점만·런타임 재인증 게이트 없음 | ABSENT |

- **★함정(GT②표 §2)**: FE `SecurityGuard.js`·`ContaminationGuard.js`는 테넌트오염/XSS 방어이지 **만료권한 런타임 차단이 아니다**. "Guard" 명칭 흡수 금지.
- **핵심 공백**: `acl_permission`(`TeamPermissions.php:152`)에 TTL 컬럼이 없어 런타임이 "만료된 elevation"을 판별할 앵커 자체가 부재(ADR §2.3). Guard가 참조할 time-bound grant 원장 미존재.

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

| 규칙 | 계약 내용 |
|---|---|
| G-1 fail-secure | 만료·모호·미승인 grant는 **차단(deny)**이 기본값(ADR §D-3). Unknown≠Allow. |
| G-2 동기 재검증 | 매 요청 `expires_at > now` lazy gate + grant 원장 조회(≤50ms). Auto-Expiry cron(§14)보다 앞서 차단. |
| G-3 상승 무결성 | 요청 scope/permission이 승인 grant 범위를 초과하면(Scope/Permission Escalation) 차단. JIT grant는 승인 스냅샷(§25)에 고정. |
| G-4 재인증 | High-risk grant 사용 시 세션 MFA 유지 검증(SPEC §12 Continuous Validation) 실패→즉시 회수·차단. |
| G-5 재활용 경로 | `Alerting.php:684-686` approved-only 상태게이트 패턴을 elevation PEP로 **재사용**하되 별도 경로. index.php 중앙 RBAC 뒤에 grant 투영 계층 삽입. |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- FE `SecurityGuard.js`/`ContaminationGuard.js`(GT②§2) — XSS·테넌트오염 방어. 권한 런타임 가드 아님.
- `AdAdapters.php:22`(AD_EXECUTION_DISABLED·GT②B-7) — 광고 집행 킬스위치. Runtime Guard 아님.
- impersonate 하향 대행 가드 `UserAdmin.php:466-469`(GT②B-2) — 하향 대행 방지이지 상향 elevation 차단 아님.
- plan 게이팅 `UserAuth.php:364`·`:77`(GT②B-3) — 구독 등급 접근이지 시한부 grant 가드 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**Runtime Guard = ABSENT(elevation 전용) / 재활용 substrate.** 중앙 RBAC 미들웨어·approved-only 게이트(`Alerting.php:684-686`)·세션/키 만료 lazy gate(`UserAuth.php:249-284`·`index.php:518`)·writeGuard(P1~P5)는 재활용 대상이나, **만료후 elevation 차단·상승 무결성·런타임 재인증**은 순신규다. 최대 선행 = `acl_permission` TTL 컬럼(grant 원장 앵커) 부재(ADR §D-1). 코드 변경 0 · 실 구현은 Part 1~3-8 인증 후 RP-track(BLOCKED_PREREQUISITE).
