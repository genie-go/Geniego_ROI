# DSAR — APPROVAL_EFFECTIVE_DENY (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §11)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §11
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md) (D-4 전역 규칙)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL — 국소 fail-closed 센티넬 실재, 통합 "deny beats allow" 규칙·negative-ACL 부재(Ground-Truth ① §3)
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · **Explicit Deny > Allow(SPEC §11·ADR D-4)** · Extend-only

---

## 1. 목적

SPEC §11 Effective Deny Calculator가 산출하는 **결과 엔티티** APPROVAL_EFFECTIVE_DENY를 정의한다. 지원 deny 유형(SPEC §11 원문): **Explicit Deny · Runtime Deny · Risk Deny · Policy Deny · Environment Deny**. 핵심 불변: **"Explicit Deny는 어떤 Allow보다 우선한다"**(SPEC §11).

이 엔티티는 Resolution Pipeline(SPEC §4) 9단계 "Explicit Deny Projection" 산출물이며, Effective Permission(별편)·Effective Scope(별편) merge 앞단에서 최우선 차감된다. 런타임 projection(SPEC §27 "Effective Deny Set")의 입력이다.

**Ground-Truth 요지**(① §3): explicit deny는 **PARTIAL**. 통합 "deny beats allow" 규칙은 부재하고, 도메인별 fail-closed 센티넬로 국소 구현된다 — scope 차원 `__deny__`(`TeamPermissions.php:234`)와 member 쓰기 전역차단(`guardTeamWrite`)이 그것이다. **행 단위 negative-ACL(explicit deny 레코드) 테이블·로직은 부재** — acl_permission은 allow-only grant 모델이다.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — 국소 fail-closed 센티넬)

| SPEC §11 deny | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| **Explicit Deny** (scope 차원) | `DENY_SCOPE` 센티넬 `__deny__` → `scopeValuesFor`→`[]` → `scopeSql`→`AND 1=0` | `TeamPermissions.php:234` · `:272` · `:286` | PARTIAL(scope 차원 국소) |
| **Explicit Deny** (member 쓰기 전역) | `guardTeamWrite` — member 쓰기만 403, `/auth/*` 예외 | `UserAuth.php:1167` · `index.php:82` | PRESENT(team_role 차원) |
| **Explicit Deny** (fail-closed 산출) | `effectiveScope` — 비-owner 실패→DENY_SCOPE(fail-closed) | `TeamPermissions.php:236` | PARTIAL |
| **Policy Deny** (opt-in) | `GENIE_STRICT_AUTH=1` + 무-tenant → 403(모호성 시 deny 우선, 기본 OFF) | `index.php:604` | PARTIAL(opt-in) |
| **Runtime Deny** | api_key write 게이트 rank 미달→403 | `index.php:587` | PARTIAL(게이트 국소) |
| **Risk Deny / Environment Deny** | 없음 — risk/environment 기반 deny 계층 grep 0 | — | **ABSENT** |

**통합 규칙 부재**(Ground-Truth ① §3): acl_permission은 **allow-only grant 모델**로 행 단위 negative-ACL(explicit deny 레코드)이 없다. deny 우선은 (a) scope 차원 센티넬 `__deny__`, (b) member 쓰기 전역 `guardTeamWrite`로만 국소 존재. "어떤 Allow보다 우선"하는 통합 Deny Calculator는 순신규(ADR D-4 신설 규칙).

### 2.2 KEEP_SEPARATE (오흡수 금지)

- `writeGuard.js:61`(FE `guardWrite`)·`Wms.php:557`(`guardWarehouse`)·`PlanPolicy.php:9`(메뉴 심층방어)는 guard substrate이나(Ground-Truth ② #10) Runtime Guard(별편)와 Deny Calculator를 구분 — deny **산출**과 guard **차단**은 다른 계층.
- `SecurityAudit.php:25`~`:31`(append-only hash chain)은 감사이지 deny snapshot이 아니다(Ground-Truth ② §4). 흡수 금지.

## 3. Canonical 설계

APPROVAL_EFFECTIVE_DENY 엔티티 canonical 필드(SPEC §11):

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective_deny_id | 산출 결과 식별자 |
| 2 | subject_ref | 대상 주체 |
| 3 | deny_set[] | 5유형(Explicit/Runtime/Risk/Policy/Environment) × 대상 resource/scope |
| 4 | precedence | 최우선(어떤 Allow보다 앞섬) 보장 플래그 |
| 5 | source_trace[] | 각 deny의 출처 substrate 참조 |
| 6 | resolution_version | 불변 버전 바인딩 |

**Deny 우선 알고리즘**(SPEC §11·ADR D-4): (1) 5유형 deny 수집 → (2) Effective Permission/Scope merge 이전에 최우선 차감 → (3) narrow scope 우선. 현행 국소 `__deny__`(`:234`) 센티넬을 **전역 Effective Deny Calculator**로 승격하되, negative-ACL 레코드 모델을 신설.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 본 엔티티 기여 | substrate 승격 대상 |
|---|---|---|
| **9. Explicit Deny Projection** | **deny_set 산출·최우선 차감** | `__deny__`(`:234`)·`scopeSql`(`:286`)·`guardTeamWrite`(`:1167`) 승격 |
| 10. Risk Projection | Risk Deny 입력 | ABSENT(별편 EFFECTIVE_RISK) |
| 12. Policy Evaluation | Policy Deny 판정 | `index.php:604`(opt-in) |
| 15. Effective Permission Generation | deny 차감 후 permission 확정 | `effectiveForUser`(`:393`) |

## 5. 무후퇴 · Extend

- **Extend-only + 전역화**(ADR D-4): 현행 국소 `__deny__` 센티넬(`:234`)과 member 쓰기 전역차단(`guardTeamWrite:1167`)을 파괴하지 않고 전역 Effective Deny Calculator로 승격 — Explicit/Runtime/Risk/Policy/Environment Deny가 어떤 Allow보다 우선.
- **실재 과신 회피**(ADR D-7): `guardTeamWrite`는 member 읽기전용 강제이지 scope-escalation 전반 가드가 아니다. `__deny__`는 scope 차원 국소 센티넬이지 통합 deny 모델이 아니다.
- **부재 과장 회피**: negative-ACL 레코드·Risk/Environment Deny grep 0은 실측 부재.
- **무후퇴**: 289차 P1~P5 보안수정(writeGuard 서버강제)은 Deny Projection의 실 substrate로 재활용(재플래그 금지·ADR D-7). 기존 fail-closed 센티넬은 ERRE 완성까지 유지·병행.

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- "Deny Calculator 구축" — 본 엔티티는 산출물 계약.
- Security Test(Authorization Bypass·Permission/Scope Escalation·SPEC §36)의 fail-secure 검증 대상.
- Runtime Guard(SPEC §28)의 최우선 입력 — deny > allow 전역화로 fail-secure 강화(ADR §4).
- 실 구현은 선행 foundation 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- `TeamPermissions.php:234` · `:236` · `:272` · `:286` · `:393`(Ground-Truth ① §2.A·§3)
- `UserAuth.php:1167`(① §2.C·§3) · `index.php:82` · `:587` · `:604`(① §2.B)
- KEEP_SEPARATE: `writeGuard.js:61` · `Wms.php:557` · `PlanPolicy.php:9`(② #10) · `SecurityAudit.php:25`~`:31`(② §4)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
